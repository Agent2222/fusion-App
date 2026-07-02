/**
 * Studio batch / member tools: generate Kamauu-style `locales.*.worldNew` from bio/discipline
 * (plus English Story & World when present) via IC LLM (`studioReinterpretWithPrompt` + `studioTranslateEnToJa`).
 */

import {
    normalizeLocalesWorldForStorage,
    normalizeWorldBlockForStorage,
    worldTextToParagraphs,
} from './worldNormalize.js';
import { sanitizeLlmTextOutput } from './llmTextSanitize.js';
import { textareaToWorldArray, worldFieldToTextarea } from './memberProfileForm.js';
import { worldFieldHasContent } from './worldPublicPick.js';
import { STUDIO_WORLD_TO_NEW_PATHS } from './studioArtistForm.js';

/** Max artists per batch run (Select all + staging cap). */
export const STUDIO_WORLD_BATCH_MAX = 25;

/** Trim source JSON so prompt+source stays under backend STUDIO_LLM_MAX_CHARS (~12k). */
export const LLM_SOURCE_MAX_CHARS = 7000;

/** Default style prompt when Translate to New World prompt field is empty (optional extra only). */
export const DEFAULT_STUDIO_WORLD_STYLE_PROMPT =
    'Rewrite in a concise, polished Kamauu-style voice suitable for a public art profile. Preserve meaning and facts.';

/**
 * Same JSON instruction as batch “Generate New World from bio”, with optional extra style guidance.
 * @param {string} [extraStylePrompt]
 */
export function buildWorldLlmInstruction(extraStylePrompt = '') {
    const extra = String(extraStylePrompt ?? '').trim();
    if (!extra) return JSON_INSTRUCTION;
    return `${JSON_INSTRUCTION}\n\nAdditional style guidance (apply without breaking JSON shape or field rules above): ${extra}`;
}

/**
 * @typedef {'fillEmpty' | 'overwrite'} WorldMergeMode
 */

const JSON_INSTRUCTION = `You are writing public artist profile copy for an art platform. Output ONLY valid JSON, no markdown fences, no commentary before or after.

SOURCE_JSON (separate message) is the ONLY evidence you may use for facts (locations, exhibitions, materials, geography, institutions, dates). Read every field in SOURCE_JSON before writing. Do not invent or guess biographical facts, places, shows, or credentials. If SOURCE_JSON does not support a fact, omit it from that field (use "" for that slot).

Voice: Write entirely in THIRD PERSON. Refer to the artist by their display name from SOURCE_JSON (prefer "name", else firstName + lastName). Never use first person ("I", "my", "me", "we", "our") unless you are directly quoting text from "wordsFromArtist" inside "quote" and you preserve it as a quote.

The JSON must have exactly these keys: "practice", "perspective", "vision", "constructing", "context", "quote".

Field rules (Kamauu-style):
- "practice": one short sentence, micro-bio under the artist name (what their practice explores), third person, grounded in SOURCE_JSON only.
- "perspective": one or two short paragraphs (use \\n\\n between paragraphs if needed, or a JSON array of paragraph strings). Third person. Derive only from SOURCE_JSON.
- "vision": array of exactly 4 short punchy lines for "What they see" (statements or short phrases), third person, grounded in SOURCE_JSON.
- "constructing": one or two short paragraphs about how they make work; third person; grounded in SOURCE_JSON.
- "context": array of exactly 3 strings in FIXED order: (1) where they are based / work from — ONLY if location (or equivalent) appears in SOURCE_JSON, else ""; (2) disciplines, media, themes — use discipline, bio, portfolio, notes, etc. from SOURCE_JSON; if nothing supports a line, ""; (3) recent/upcoming exhibitions or projects — ONLY if events, programs, notes, currentWork, or similar in SOURCE_JSON support it, else "". Never fabricate venues, cities, or shows.
- "quote": one block (can be multiple sentences). Prefer paraphrasing SOURCE_JSON in third person. If wordsFromArtist.body is present, you may adapt it into third person or use a short attributed quote; otherwise write from SOURCE_JSON in third person. No surrounding quotation marks in the JSON string.

JSON formatting (critical): Use standard JSON. Every string value must stay on ONE line inside the JSON — use \\n for line breaks inside text, never raw newline characters inside a string. Escape internal double quotes as \\". No trailing commas.`;

const JSON_RETRY_SUFFIX = `

The previous reply was not valid JSON or failed validation. Reply again with ONE single line of minified JSON (no pretty-printing, no raw line breaks inside strings). Keys: "practice","perspective","vision","constructing","context","quote". Remember: third person, SOURCE_JSON only for facts, use "" for any context slot you cannot support, escape quotes, no trailing commas.`;

/**
 * @param {unknown} v
 */
function isEmptyWorldField(v) {
    if (v == null || v === '') return true;
    if (Array.isArray(v)) return !v.some((x) => String(x).trim());
    return String(v).trim() === '';
}

/**
 * @param {Record<string, unknown> | null | undefined} existing
 * @param {Record<string, unknown>} generated
 * @param {WorldMergeMode} mode
 * @returns {Record<string, unknown>}
 */
export function mergeWorldBlocks(existing, generated, mode) {
    const gen = normalizeWorldBlockForStorage(
        generated && typeof generated === 'object' ? generated : {},
    );
    if (mode === 'overwrite') {
        const ex = existing && typeof existing === 'object' ? { ...existing } : {};
        /** @type {Record<string, unknown>} */
        const out = { ...ex };
        for (const key of Object.keys(gen)) {
            if (!isEmptyWorldField(gen[key])) {
                out[key] = gen[key];
            }
        }
        return normalizeWorldBlockForStorage(out);
    }
    const ex = existing && typeof existing === 'object' ? { ...existing } : {};
    const out = { ...ex };
    for (const key of Object.keys(gen)) {
        if (isEmptyWorldField(out[key])) {
            out[key] = gen[key];
        }
    }
    return normalizeWorldBlockForStorage(out);
}

/**
 * @param {string} raw
 * @returns {string}
 */
export function stripLlmJsonFence(raw) {
    let t = String(raw ?? '').trim();
    if (t.startsWith('```')) {
        t = t.replace(/^```[a-zA-Z0-9]*\s*/m, '');
        const idx = t.lastIndexOf('```');
        if (idx !== -1) t = t.slice(0, idx);
    }
    return t.trim();
}

/**
 * Remove trailing commas before `}` or `]` (common LLM mistake).
 * @param {string} s
 */
export function stripTrailingCommasFromJson(s) {
    let out = s;
    let prev = '';
    while (out !== prev) {
        prev = out;
        out = out.replace(/,(\s*[}\]])/g, '$1');
    }
    return out;
}

/**
 * @param {string} s
 */
function normalizeSmartQuotesAndBom(s) {
    return String(s)
        .replace(/^\uFEFF/, '')
        .replace(/[\u201c\u201d\u201e\u201f]/g, '"')
        .replace(/[\u2018\u2019]/g, "'");
}

/**
 * Best-effort: first `{` through last `}` (works when the model adds prose around JSON).
 * @param {string} s
 */
function extractJsonObjectLoose(s) {
    const a = s.indexOf('{');
    const b = s.lastIndexOf('}');
    if (a === -1 || b === -1 || b <= a) return s;
    return s.slice(a, b + 1);
}

/**
 * Escape raw line breaks inside JSON string literals (common LLM mistake).
 * @param {string} input
 */
export function fixRawNewlinesInJsonStrings(input) {
    let out = '';
    let inString = false;
    let escape = false;
    const s = String(input ?? '');
    for (let i = 0; i < s.length; i += 1) {
        const c = s[i];
        if (escape) {
            out += c;
            escape = false;
            continue;
        }
        if (c === '\\' && inString) {
            out += c;
            escape = true;
            continue;
        }
        if (c === '"') {
            inString = !inString;
            out += c;
            continue;
        }
        if (inString && c === '\r') {
            if (s[i + 1] === '\n') i += 1;
            out += '\\n';
            continue;
        }
        if (inString && c === '\n') {
            out += '\\n';
            continue;
        }
        out += c;
    }
    return out;
}

/**
 * Normalize LLM world JSON to the Kamauu storage shape before validation.
 * @param {unknown} w
 * @returns {Record<string, unknown>}
 */
export function coerceParsedWorldShape(w) {
    const base = w && typeof w === 'object' && !Array.isArray(w) ? /** @type {Record<string, unknown>} */ (w) : {};
    /** @type {Record<string, unknown>} */
    const out = { ...base };
    out.practice = String(out.practice ?? '').trim();
    out.quote = String(out.quote ?? '').trim();
    out.perspective = worldTextToParagraphs(out.perspective);
    out.constructing = worldTextToParagraphs(out.constructing);
    out.vision = coerceVisionToFourLines(out.vision);
    out.context = coerceContextToThreeLines(out.context);
    return out;
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
function splitLooseLines(raw) {
    const parts = worldTextToParagraphs(raw);
    if (parts.length !== 1) return parts;
    const one = parts[0];
    if (/\n/.test(one)) {
        return one
            .split(/\n+/)
            .map((line) => line.replace(/^[\s•\-–—*]+/, '').trim())
            .filter(Boolean);
    }
    if (/[•|]/.test(one)) {
        return one
            .split(/[•|]/)
            .map((line) => line.trim())
            .filter(Boolean);
    }
    return parts;
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
function coerceVisionToFourLines(raw) {
    let lines = splitLooseLines(raw);
    while (lines.length < 4) lines.push('');
    return lines.slice(0, 4).map((line) => String(line ?? '').trim());
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
function coerceContextToThreeLines(raw) {
    let lines = splitLooseLines(raw);
    while (lines.length < 3) lines.push('');
    return lines.slice(0, 3).map((line) => String(line ?? '').trim());
}

/**
 * @param {string} raw
 * @returns {Record<string, unknown>}
 */
export function parseAndCoerceWorldJsonResponse(raw) {
    const parsed = parseWorldJsonResponse(raw);
    return coerceParsedWorldShape(parsed);
}

const WORLD_JSON_KEYS = ['practice', 'perspective', 'vision', 'constructing', 'context', 'quote'];

/**
 * @param {string} s
 */
function quoteBareJsonKeys(s) {
    return String(s).replace(
        /([{,]\s*)(practice|perspective|vision|constructing|context|quote)(\s*:)/g,
        '$1"$2"$3',
    );
}

/**
 * Last-resort parse for LLM output that has the right fields but slightly invalid
 * JSON, usually from unquoted keys or a stray unescaped quote in prose.
 * @param {string} raw
 * @returns {Record<string, unknown> | null}
 */
function parseKnownWorldFieldsLoose(raw) {
    const s = extractJsonObjectLoose(raw);
    /** @type {Array<{ key: string; index: number; valueStart: number }>} */
    const hits = [];
    for (const key of WORLD_JSON_KEYS) {
        const re = new RegExp(`["']?${key}["']?\\s*:`, 'i');
        const m = re.exec(s);
        if (m && m.index >= 0) hits.push({ key, index: m.index, valueStart: m.index + m[0].length });
    }
    if (hits.length < 2) return null;
    hits.sort((a, b) => a.index - b.index);
    /** @type {Record<string, unknown>} */
    const out = {};
    for (let i = 0; i < hits.length; i += 1) {
        const cur = hits[i];
        const next = hits[i + 1];
        const end = next ? next.index : s.lastIndexOf('}') >= 0 ? s.lastIndexOf('}') : s.length;
        const rawValue = s
            .slice(cur.valueStart, end)
            .trim()
            .replace(/,\s*$/, '')
            .trim();
        out[cur.key] = parseLooseWorldValue(rawValue);
    }
    for (const key of WORLD_JSON_KEYS) {
        if (!Object.prototype.hasOwnProperty.call(out, key)) {
            out[key] = key === 'vision' || key === 'context' ? [] : '';
        }
    }
    return out;
}

/**
 * @param {string} rawValue
 * @returns {unknown}
 */
function parseLooseWorldValue(rawValue) {
    const v = stripTrailingCommasFromJson(rawValue.trim());
    if (!v) return '';
    for (const cand of [v, quoteBareJsonKeys(v)]) {
        try {
            return JSON.parse(cand);
        } catch {
            /* try looser handling below */
        }
    }
    if (v.startsWith('[')) {
        /** @type {string[]} */
        const strings = [];
        const re = /"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'/g;
        let m;
        while ((m = re.exec(v))) {
            strings.push(unescapeLooseJsonString(m[1] ?? m[2] ?? ''));
        }
        if (strings.length) return strings;
        return v
            .replace(/^\[/, '')
            .replace(/\]$/, '')
            .split(',')
            .map((item) => item.trim().replace(/^["']|["']$/g, ''))
            .filter(Boolean);
    }
    return unescapeLooseJsonString(v.replace(/^["']|["']$/g, ''));
}

/**
 * @param {string} s
 */
function unescapeLooseJsonString(s) {
    return String(s)
        .replace(/\\"/g, '"')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .trim();
}

/**
 * @param {string} raw
 * @returns {Record<string, unknown>}
 */
export function parseWorldJsonResponse(raw) {
    const s0 = normalizeSmartQuotesAndBom(stripLlmJsonFence(raw));
    const candidates = [s0, extractJsonObjectLoose(s0)];
    const variants = [];
    for (const c of candidates) {
        if (!c) continue;
        variants.push(c);
        variants.push(stripTrailingCommasFromJson(c));
        variants.push(quoteBareJsonKeys(c));
        variants.push(stripTrailingCommasFromJson(quoteBareJsonKeys(c)));
        variants.push(fixRawNewlinesInJsonStrings(c));
        variants.push(stripTrailingCommasFromJson(fixRawNewlinesInJsonStrings(c)));
        variants.push(stripTrailingCommasFromJson(quoteBareJsonKeys(fixRawNewlinesInJsonStrings(c))));
    }
    /** @type {Error[]} */
    const errors = [];
    for (const cand of variants) {
        try {
            const p = JSON.parse(cand);
            if (!p || typeof p !== 'object' || Array.isArray(p)) {
                throw new Error('LLM output is not a JSON object');
            }
            return /** @type {Record<string, unknown>} */ (p);
        } catch (e) {
            errors.push(e instanceof Error ? e : new Error(String(e)));
        }
    }
    for (const cand of variants) {
        const loose = parseKnownWorldFieldsLoose(cand);
        if (loose) return loose;
    }
    const msg = errors[0] ? errors[0].message : 'Invalid JSON';
    throw new Error(`Could not parse LLM JSON: ${msg}`);
}

/**
 * @param {Record<string, unknown>} w
 */
export function validateWorldShape(w) {
    const c = coerceParsedWorldShape(w);
    const need = ['practice', 'perspective', 'vision', 'constructing', 'context', 'quote'];
    for (const k of need) {
        if (!(k in c)) throw new Error(`Missing key: ${k}`);
    }
    if (typeof c.practice !== 'string') {
        throw new Error('practice must be a string');
    }
    const vis = c.vision;
    if (!Array.isArray(vis) || vis.length !== 4) {
        throw new Error('vision must be an array of exactly 4 strings');
    }
    for (let i = 0; i < 4; i++) {
        if (typeof vis[i] !== 'string') {
            throw new Error(`vision[${i}] must be a string`);
        }
    }
    const ctx = c.context;
    if (!Array.isArray(ctx) || ctx.length !== 3) {
        throw new Error('context must be an array of exactly 3 strings');
    }
    for (let i = 0; i < 3; i++) {
        if (typeof ctx[i] !== 'string') {
            throw new Error(`context[${i}] must be a string`);
        }
    }
    if (typeof c.quote !== 'string') {
        throw new Error('quote must be a string');
    }
    const pers = c.perspective;
    if (!Array.isArray(pers) || !pers.every((x) => typeof x === 'string')) {
        throw new Error('perspective must be an array of strings');
    }
    const cons = c.constructing;
    if (!Array.isArray(cons) || !cons.every((x) => typeof x === 'string')) {
        throw new Error('constructing must be an array of strings');
    }
}

/**
 * Parse, coerce, validate, and normalize LLM world JSON.
 * @param {string} raw
 */
function finalizeWorldLlmJson(raw) {
    const coerced = coerceParsedWorldShape(parseWorldJsonResponse(raw));
    validateWorldShape(coerced);
    return normalizeWorldBlockForStorage(coerced);
}

/**
 * @param {unknown} v
 */
function compactWordsFromArtist(v) {
    if (v == null || v === '') return '';
    if (typeof v === 'string') return v.trim();
    if (typeof v === 'object' && !Array.isArray(v)) {
        const o = /** @type {Record<string, unknown>} */ (v);
        const body = o.body != null ? String(o.body).trim() : '';
        const attr = o.attribution != null ? String(o.attribution).trim() : '';
        if (body && attr) return `${body} (${attr})`;
        return body || attr;
    }
    return '';
}

/**
 * @param {unknown} loc
 */
function compactLocationFromLocale(loc) {
    if (!loc || typeof loc !== 'object') return '';
    const l = /** @type {Record<string, unknown>} */ (loc).location;
    if (l == null || l === '') return '';
    if (typeof l === 'string') return l.trim();
    if (typeof l === 'object' && !Array.isArray(l)) {
        const o = /** @type {Record<string, unknown>} */ (l);
        if (o.display != null && String(o.display).trim()) return String(o.display).trim();
        const parts = [o.city, o.state, o.country]
            .map((x) => (x != null ? String(x).trim() : ''))
            .filter(Boolean);
        return parts.join(', ');
    }
    return '';
}

/**
 * @param {unknown} events
 */
function compactEventsForSource(events) {
    if (!events || typeof events !== 'object') return [];
    const o = /** @type {Record<string, unknown>} */ (events);
    /** @type {string[]} */
    const out = [];
    for (const slot of ['upcoming', 'past']) {
        const e = o[slot];
        if (e && typeof e === 'object' && !Array.isArray(e)) {
            const t = /** @type {Record<string, unknown>} */ (e).title;
            if (t != null && String(t).trim()) out.push(String(t).trim());
        }
    }
    return out;
}

/**
 * @param {unknown} mp
 */
function compactMasterPortfolioForSource(mp) {
    if (!Array.isArray(mp)) return [];
    /** @type {string[]} */
    const out = [];
    for (const item of mp) {
        if (!item || typeof item !== 'object') continue;
        const o = /** @type {Record<string, unknown>} */ (item);
        const bits = [o.title, o.medium, o.year]
            .map((x) => (x != null ? String(x).trim() : ''))
            .filter(Boolean);
        if (bits.length) out.push(bits.join(' — '));
    }
    return out.slice(0, 24);
}

/**
 * @param {unknown} notes
 */
function compactNotesForSource(notes) {
    if (!notes || typeof notes !== 'object') return [];
    const n = /** @type {Record<string, unknown>} */ (notes);
    /** @type {string[]} */
    const chunks = [];
    for (const key of ['curators', 'artists', 'galleries']) {
        const arr = n[key];
        if (!Array.isArray(arr)) continue;
        for (const entry of arr) {
            if (!entry || typeof entry !== 'object') continue;
            const body = /** @type {Record<string, unknown>} */ (entry).body;
            if (body != null && String(body).trim()) chunks.push(String(body).trim());
        }
    }
    return chunks.slice(0, 12);
}

/**
 * @param {unknown} cw
 */
function compactCurrentWorkForSource(cw) {
    if (!Array.isArray(cw)) return [];
    /** @type {string[]} */
    const out = [];
    for (const item of cw) {
        if (!item || typeof item !== 'object') continue;
        const o = /** @type {Record<string, unknown>} */ (item);
        const title = o.title != null ? String(o.title).trim() : '';
        const summary = o.summary != null ? String(o.summary).trim() : '';
        if (title || summary) out.push([title, summary].filter(Boolean).join(': '));
    }
    return out.slice(0, 8);
}

/**
 * @param {Record<string, unknown>} loc
 * @returns {Record<string, unknown>}
 */
const STORY_WORLD_FIELD_CAP = 900;

/**
 * @param {string} s
 * @param {number} max
 */
function capField(s, max) {
    const t = String(s ?? '').trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max - 1)}…`;
}

/**
 * English Story & World (`locales.en.world`) for LLM context — trimmed per field.
 * @param {Record<string, unknown>} loc
 */
function compactStoryWorldFromEnLocale(loc) {
    const w0 = loc.world && typeof loc.world === 'object' && !Array.isArray(loc.world) ? loc.world : {};
    const w = /** @type {Record<string, unknown>} */ (w0);
    /** @type {Record<string, unknown>} */
    const story = {};
    const practice = capField(String(w.practice ?? ''), STORY_WORLD_FIELD_CAP);
    if (practice) story.practice = practice;
    const perspective = capField(worldFieldToTextarea(w.perspective), STORY_WORLD_FIELD_CAP);
    if (perspective) story.perspective = perspective;
    const vision = capField(worldFieldToTextarea(w.vision), STORY_WORLD_FIELD_CAP);
    if (vision) story.vision = vision;
    const constructing = capField(worldFieldToTextarea(w.constructing), STORY_WORLD_FIELD_CAP);
    if (constructing) story.constructing = constructing;
    const context = capField(worldFieldToTextarea(w.context), STORY_WORLD_FIELD_CAP);
    if (context) story.context = context;
    const quote = capField(String(w.quote ?? ''), STORY_WORLD_FIELD_CAP);
    if (quote) story.quote = quote;
    return story;
}

/**
 * Identity tab only — no Story & World, programs, events, or portfolio context.
 * @param {Record<string, unknown>} loc
 * @param {string} [profileQuote]
 */
export function buildIdentitySourcePayloadFromEnLocale(loc, profileQuote = '') {
    if (!loc || typeof loc !== 'object') return {};
    const o = /** @type {Record<string, unknown>} */ (loc);
    const locLine = compactLocationFromLocale(loc);
    const bio = String(o.bio ?? '').trim();
    const bioLong = String(o.bioLong ?? '').trim();
    const quote = String(profileQuote ?? '').trim();
    const wordsFromArtist = compactWordsFromArtist(o.wordsFromArtist ?? o.words_from_artist);
    return {
        name: String(o.name ?? '').trim(),
        firstName: String(o.firstName ?? '').trim(),
        lastName: String(o.lastName ?? '').trim(),
        discipline: String(o.discipline ?? '').trim(),
        status: String(o.status ?? '').trim(),
        bio,
        bioLong: bioLong && bioLong !== bio ? bioLong : '',
        location: locLine,
        wordsFromArtist: wordsFromArtist || quote,
        ...(quote && !wordsFromArtist ? { profileQuote: quote } : {}),
    };
}

export function buildSourcePayloadFromEnLocale(loc) {
    if (!loc || typeof loc !== 'object') return {};
    const o = /** @type {Record<string, unknown>} */ (loc);
    const locLine = compactLocationFromLocale(loc);
    const bio = String(o.bio ?? '').trim();
    const bioLong = String(o.bioLong ?? '').trim();
    const programs = Array.isArray(o.programs)
        ? o.programs.map((x) => String(x).trim()).filter(Boolean)
        : [];
    const storyWorldFromArtist = compactStoryWorldFromEnLocale(o);
    return {
        name: String(o.name ?? '').trim(),
        firstName: String(o.firstName ?? '').trim(),
        lastName: String(o.lastName ?? '').trim(),
        discipline: String(o.discipline ?? '').trim(),
        status: String(o.status ?? '').trim(),
        bio,
        bioLong: bioLong && bioLong !== bio ? bioLong : '',
        location: locLine,
        wordsFromArtist: compactWordsFromArtist(o.wordsFromArtist ?? o.words_from_artist),
        programs,
        events: compactEventsForSource(o.events),
        masterPortfolio: compactMasterPortfolioForSource(o.masterPortfolio),
        currentWork: compactCurrentWorkForSource(o.currentWork),
        notes: compactNotesForSource(o.notes),
        ...(Object.keys(storyWorldFromArtist).length
            ? { storyWorldFromArtist }
            : {}),
    };
}

/**
 * True only when there is real artist/context material worth sending to the LLM.
 * Name, slug, status, and directory filters are not enough to "convert" into New World copy.
 * @param {object} artistRow
 */
export function hasUsableWorldLlmSourceInput(artistRow) {
    const loc =
        artistRow?.locales && typeof artistRow.locales === 'object'
            ? /** @type {Record<string, unknown>} */ (artistRow.locales).en
            : null;
    const source = buildSourcePayloadFromEnLocale(
        loc && typeof loc === 'object' ? /** @type {Record<string, unknown>} */ (loc) : {},
    );
    const textKeys = ['discipline', 'bio', 'bioLong', 'location', 'wordsFromArtist'];
    if (textKeys.some((key) => String(source[key] ?? '').trim())) return true;
    for (const key of ['programs', 'events', 'masterPortfolio', 'currentWork', 'notes']) {
        const arr = source[key];
        if (Array.isArray(arr) && arr.some((x) => String(x ?? '').trim())) return true;
    }
    const story =
        source.storyWorldFromArtist &&
        typeof source.storyWorldFromArtist === 'object' &&
        !Array.isArray(source.storyWorldFromArtist)
            ? /** @type {Record<string, unknown>} */ (source.storyWorldFromArtist)
            : {};
    return Object.values(story).some((value) => String(value ?? '').trim());
}

/**
 * True when Identity tab fields have enough material for LLM generation.
 * @param {object} artistRow
 */
export function hasUsableIdentityLlmSourceInput(artistRow) {
    const loc =
        artistRow?.locales && typeof artistRow.locales === 'object'
            ? /** @type {Record<string, unknown>} */ (artistRow.locales).en
            : null;
    const quote = String(artistRow?.quote ?? '').trim();
    const source = buildIdentitySourcePayloadFromEnLocale(
        loc && typeof loc === 'object' ? /** @type {Record<string, unknown>} */ (loc) : {},
        quote,
    );
    return ['discipline', 'bio', 'bioLong', 'location', 'wordsFromArtist'].some((key) =>
        String(source[key] ?? '').trim(),
    );
}

/**
 * @param {object} artistRow
 * @returns {string}
 */
export function buildTrimmedIdentityJsonForLlm(artistRow) {
    const loc =
        artistRow?.locales && typeof artistRow.locales === 'object'
            ? /** @type {Record<string, unknown>} */ (artistRow.locales).en
            : null;
    const quote = String(artistRow?.quote ?? '').trim();
    const base = buildIdentitySourcePayloadFromEnLocale(
        loc && typeof loc === 'object' ? /** @type {Record<string, unknown>} */ (loc) : {},
        quote,
    );
    const payload = {
        ...base,
        slug: String(artistRow?.slug ?? '').trim(),
    };
    let s = JSON.stringify(payload);
    if (s.length > LLM_SOURCE_MAX_CHARS) {
        const head = s.slice(0, LLM_SOURCE_MAX_CHARS - 40);
        s = `${head}…[truncated:${payload.slug || 'artist'}]`;
    }
    return s;
}

/**
 * @param {object} artistRow — row from getArtistsForStudio (has locales)
 * @returns {string}
 */
export function buildTrimmedSourceJsonForLlm(artistRow) {
    const loc =
        artistRow?.locales && typeof artistRow.locales === 'object'
            ? /** @type {Record<string, unknown>} */ (artistRow.locales).en
            : null;
    const base = buildSourcePayloadFromEnLocale(
        loc && typeof loc === 'object' ? /** @type {Record<string, unknown>} */ (loc) : {},
    );
    const payload = {
        ...base,
        slug: String(artistRow?.slug ?? '').trim(),
        filter:
            artistRow && typeof artistRow === 'object' && artistRow.filter != null
                ? String(artistRow.filter).trim()
                : '',
        galleryFilter:
            artistRow && typeof artistRow === 'object' && artistRow.galleryFilter != null
                ? String(artistRow.galleryFilter).trim()
                : '',
    };
    let s = JSON.stringify(payload);
    if (s.length > LLM_SOURCE_MAX_CHARS) {
        const head = s.slice(0, LLM_SOURCE_MAX_CHARS - 40);
        s = `${head}…[truncated:${payload.slug || 'artist'}]`;
    }
    return s;
}

/**
 * @param {(prompt: string, source: string, localeTag: string) => Promise<string>} reinterpret
 * @param {string} sourceJson
 * @param {string} [instruction]
 * @returns {Promise<Record<string, unknown>>}
 */
export async function generateEnglishWorldWithLlm(reinterpret, sourceJson, instruction = JSON_INSTRUCTION) {
    /** @type {string | undefined} */
    let firstErr;
    try {
        const raw = await reinterpret(instruction, sourceJson, 'en');
        return finalizeWorldLlmJson(raw);
    } catch (e) {
        firstErr = e instanceof Error ? e.message : String(e);
    }
    const retryPrompt = `${instruction}${JSON_RETRY_SUFFIX}\n\nParse/validation error was: ${firstErr}`;
    const raw2 = await reinterpret(retryPrompt, sourceJson, 'en');
    return finalizeWorldLlmJson(raw2);
}

/**
 * @param {(s: string) => Promise<string>} translateEnToJa
 * @param {Record<string, unknown>} worldEn
 * @returns {Promise<Record<string, unknown>>}
 */
export async function translateWorldEnToJa(translateEnToJa, worldEn) {
    const w = worldEn && typeof worldEn === 'object' ? worldEn : {};
    /** @type {Record<string, unknown>} */
    const out = {};

    /**
     * @param {string} line
     * @returns {Promise<string>}
     */
    const tr = async (line) => sanitizeLlmTextOutput(await translateEnToJa(line));

    const pr = String(w.practice ?? '').trim();
    out.practice = pr ? await tr(pr) : '';

    const persParts = worldTextToParagraphs(w.perspective);
    const persJa = [];
    for (const line of persParts) {
        if (line.trim()) persJa.push(await tr(line));
    }
    out.perspective = persJa.length <= 1 ? persJa[0] ?? '' : persJa;

    const vis = Array.isArray(w.vision) ? w.vision : [];
    const visJa = [];
    for (let i = 0; i < 4; i++) {
        const line = String(vis[i] ?? '').trim();
        visJa.push(line ? await tr(line) : '');
    }
    out.vision = visJa;

    const conParts = worldTextToParagraphs(w.constructing);
    const conJa = [];
    for (const line of conParts) {
        if (line.trim()) conJa.push(await tr(line));
    }
    out.constructing = conJa.length <= 1 ? conJa[0] ?? '' : conJa;

    const ctx = Array.isArray(w.context) ? w.context : [];
    const ctxJa = [];
    for (let i = 0; i < 3; i++) {
        const line = String(ctx[i] ?? '').trim();
        ctxJa.push(line ? await tr(line) : '');
    }
    out.context = ctxJa;

    const qu = String(w.quote ?? '').trim();
    out.quote = qu ? await tr(qu) : '';

    return normalizeWorldBlockForStorage(out);
}

/**
 * Parse `locales` from a Studio artist row or record-like object.
 * @param {object} artistRow
 * @returns {Record<string, unknown>}
 */
export function parseLocalesFromArtistRow(artistRow) {
    const raw = artistRow?.locales;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        try {
            return JSON.parse(JSON.stringify(raw));
        } catch {
            return { en: {}, ja: {} };
        }
    }
    return { en: {}, ja: {} };
}

/**
 * Apply merged world block to locales under `world` or `worldNew`.
 * @param {Record<string, unknown>} locales
 * @param {'en' | 'ja'} code
 * @param {'world' | 'worldNew'} blockKey
 * @param {Record<string, unknown>} worldBlock
 * @param {WorldMergeMode} mode
 */
export function applyWorldBlockToLocales(locales, code, blockKey, worldBlock, mode) {
    const next = JSON.parse(JSON.stringify(locales || { en: {}, ja: {} }));
    if (!next[code] || typeof next[code] !== 'object') next[code] = {};
    const block = /** @type {Record<string, unknown>} */ (next[code]);
    const prev =
        block[blockKey] && typeof block[blockKey] === 'object' && !Array.isArray(block[blockKey])
            ? /** @type {Record<string, unknown>} */ (block[blockKey])
            : {};
    block[blockKey] = mergeWorldBlocks(prev, worldBlock, mode);
    next[code] = block;
    return next;
}

/**
 * Apply merged world to locales and return updated locales object.
 * @param {Record<string, unknown>} locales
 * @param {'en' | 'ja'} code
 * @param {Record<string, unknown>} worldBlock
 * @param {WorldMergeMode} mode
 */
export function applyWorldToLocales(locales, code, worldBlock, mode) {
    return applyWorldBlockToLocales(locales, code, 'world', worldBlock, mode);
}

/**
 * @param {string} sourceJson
 * @param {(prompt: string, source: string, localeTag: string) => Promise<string>} reinterpretFn
 * @param {(s: string) => Promise<string>} translateEnToJa
 * @param {string} [instruction]
 */
export async function generateEnglishAndJapaneseWorldFromSourceJson(
    sourceJson,
    reinterpretFn,
    translateEnToJa,
    instruction = JSON_INSTRUCTION,
) {
    const en = await generateEnglishWorldWithLlm(reinterpretFn, sourceJson, instruction);
    const ja = await translateWorldEnToJa(translateEnToJa, en);
    return { en, ja };
}

/**
 * @param {Record<string, unknown>} locales
 * @param {Record<string, unknown>} enBlock
 * @param {Record<string, unknown>} jaBlock
 * @param {WorldMergeMode} mergeMode
 * @param {{ mergeWorldNew?: boolean; mergeWorld?: boolean }} [opts]
 */
export function applyGeneratedWorldBlocksToLocales(
    locales,
    enBlock,
    jaBlock,
    mergeMode,
    opts = {},
) {
    const mergeWorldNew = opts.mergeWorldNew !== false;
    const mergeWorld = opts.mergeWorld === true;
    let next = JSON.parse(JSON.stringify(locales || { en: {}, ja: {} }));
    if (mergeWorldNew) {
        next = applyWorldBlockToLocales(next, 'en', 'worldNew', enBlock, mergeMode);
        next = applyWorldBlockToLocales(next, 'ja', 'worldNew', jaBlock, mergeMode);
    }
    if (mergeWorld) {
        next = applyWorldBlockToLocales(next, 'en', 'world', enBlock, mergeMode);
        next = applyWorldBlockToLocales(next, 'ja', 'world', jaBlock, mergeMode);
    }
    if (worldFieldHasContent(enBlock.practice) || worldFieldHasContent(enBlock.context)) {
        next.publicWorldSource = 'newWorld';
    }
    return normalizeLocalesWorldForStorage(next);
}

/**
 * Generate Kamauu-style copy from Identity fields; fill empty `worldNew` and `world`.
 * @param {object} artistRow
 * @param {WorldMergeMode} mergeMode
 * @param {(prompt: string, source: string, localeTag: string) => Promise<string>} reinterpretFn
 * @param {(s: string) => Promise<string>} translateEnToJa
 */
export async function buildMergedLocalesWithGeneratedWorldFromIdentity(
    artistRow,
    mergeMode,
    reinterpretFn,
    translateEnToJa,
) {
    let locales = parseLocalesFromArtistRow(artistRow);
    locales = normalizeLocalesWorldForStorage(locales);
    if (!hasUsableIdentityLlmSourceInput(artistRow)) {
        return locales;
    }
    const sourceJson = buildTrimmedIdentityJsonForLlm(artistRow);
    const blocks = await generateEnglishAndJapaneseWorldFromSourceJson(
        sourceJson,
        reinterpretFn,
        translateEnToJa,
    );
    return applyGeneratedWorldBlocksToLocales(locales, blocks.en, blocks.ja, mergeMode, {
        mergeWorldNew: true,
        mergeWorld: true,
    });
}

/**
 * Read English locale block from the Studio manage form (Identity + World tabs).
 * @param {ParentNode} root
 * @returns {Record<string, unknown>}
 */
export function readEnLocaleFromManageForm(root) {
    /**
     * @param {string} path
     */
    const readField = (path) => {
        const el = root.querySelector(`[data-art-locale="en"][data-art-path="${path}"]`);
        if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return '';
        return String(el.value ?? '');
    };
    /**
     * @param {string} path
     */
    const readParas = (path) => textareaToWorldArray(readField(path));
    return {
        name: readField('name'),
        firstName: readField('firstName'),
        lastName: readField('lastName'),
        discipline: readField('discipline'),
        status: readField('status'),
        bio: readField('bio'),
        bioLong: readField('bioLong'),
        location: {
            city: readField('location.city'),
            state: readField('location.state'),
            country: readField('location.country'),
            display: readField('location.display'),
        },
        world: {
            practice: readField('world.practice'),
            perspective: readParas('world.perspective'),
            vision: readParas('world.vision'),
            constructing: readParas('world.constructing'),
            context: readParas('world.context'),
            quote: readField('world.quote'),
        },
    };
}

/**
 * Build trimmed SOURCE_JSON for Translate to New World (same shape as batch bio job).
 * @param {Record<string, unknown>} enLoc
 * @returns {string}
 */
export function buildSourceJsonFromManageFormWorld(enLoc) {
    const base = buildSourcePayloadFromEnLocale(enLoc);
    let s = JSON.stringify(base);
    if (s.length > LLM_SOURCE_MAX_CHARS) {
        s = `${s.slice(0, LLM_SOURCE_MAX_CHARS - 40)}…[truncated:translate-world]`;
    }
    return s;
}

/**
 * True when the manage form World tab has any English copy to send to the LLM.
 * @param {ParentNode} root
 */
export function manageFormHasWorldSourceForLlm(root) {
    const enLoc = readEnLocaleFromManageForm(root);
    const story = compactStoryWorldFromEnLocale(enLoc);
    return Object.values(story).some((value) => String(value ?? '').trim());
}

/**
 * @param {Record<string, unknown>} block
 */
function countPopulatedWorldTextFields(block) {
    let n = 0;
    for (const key of ['practice', 'perspective', 'vision', 'constructing', 'context', 'quote']) {
        if (worldFieldHasContent(block[key])) n += 1;
    }
    return n;
}

/**
 * Write generated EN/JA worldNew blocks into the manage form.
 * @param {ParentNode} root
 * @param {Record<string, unknown>} enBlock
 * @param {Record<string, unknown>} jaBlock
 */
export function patchManageFormWorldNewFields(root, enBlock, jaBlock) {
    for (const loc of /** @type {const} */ (['en', 'ja'])) {
        const block = loc === 'en' ? enBlock : jaBlock;
        for (const { path } of STUDIO_WORLD_TO_NEW_PATHS) {
            const targetPath = path.replace(/^world\./, 'worldNew.');
            const fieldKey = targetPath.split('.').pop() || '';
            const el = root.querySelector(
                `[data-art-locale="${loc}"][data-art-path="${targetPath}"]`,
            );
            if (!(el instanceof HTMLTextAreaElement)) continue;
            const kind = el.getAttribute('data-art-kind') || '';
            const raw = block[fieldKey];
            el.value =
                kind === 'world-paras' ? worldFieldToTextarea(raw) : String(raw ?? '');
        }
    }
}

/**
 * Reinterpret English World tab fields into Kamauu-style New World (same pipeline as batch).
 * @param {ParentNode} root
 * @param {{ prompt: string; reinterpret: (prompt: string, source: string, localeTag: string) => Promise<string>; translateEnToJa: (s: string) => Promise<string> }} opts
 * @returns {Promise<number>} count of populated worldNew text fields
 */
export async function translateManageFormWorldToNewWorld(root, opts) {
    if (!manageFormHasWorldSourceForLlm(root)) return 0;

    const enLoc = readEnLocaleFromManageForm(root);
    const sourceJson = buildSourceJsonFromManageFormWorld(enLoc);
    const instruction = buildWorldLlmInstruction(opts.prompt);

    const { en, ja } = await generateEnglishAndJapaneseWorldFromSourceJson(
        sourceJson,
        opts.reinterpret,
        opts.translateEnToJa,
        instruction,
    );

    patchManageFormWorldNewFields(root, en, ja);
    return countPopulatedWorldTextFields(en);
}
