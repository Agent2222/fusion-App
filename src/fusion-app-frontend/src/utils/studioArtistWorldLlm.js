/**
 * Studio batch: generate Kamauu-style `locales.*.world` from bio/discipline via IC LLM
 * (`studioReinterpretWithPrompt` + `studioTranslateEnToJa`).
 */

import {
    normalizeWorldBlockForStorage,
    worldTextToParagraphs,
} from './worldNormalize.js';

/** Max artists per batch run (Select all + staging cap). */
export const STUDIO_WORLD_BATCH_MAX = 25;

/** Trim source JSON so prompt+source stays under backend STUDIO_LLM_MAX_CHARS (~12k). */
export const LLM_SOURCE_MAX_CHARS = 7000;

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
    const msg = errors[0] ? errors[0].message : 'Invalid JSON';
    throw new Error(`Could not parse LLM JSON: ${msg}`);
}

/**
 * @param {Record<string, unknown>} w
 */
export function validateWorldShape(w) {
    const need = ['practice', 'perspective', 'vision', 'constructing', 'context', 'quote'];
    for (const k of need) {
        if (!(k in w)) throw new Error(`Missing key: ${k}`);
    }
    if (typeof w.practice !== 'string') {
        throw new Error('practice must be a string');
    }
    const vis = w.vision;
    if (!Array.isArray(vis) || vis.length !== 4) {
        throw new Error('vision must be an array of exactly 4 strings');
    }
    for (let i = 0; i < 4; i++) {
        if (typeof vis[i] !== 'string') {
            throw new Error(`vision[${i}] must be a string`);
        }
    }
    const ctx = w.context;
    if (!Array.isArray(ctx) || ctx.length !== 3) {
        throw new Error('context must be an array of exactly 3 strings');
    }
    for (let i = 0; i < 3; i++) {
        if (typeof ctx[i] !== 'string') {
            throw new Error(`context[${i}] must be a string`);
        }
    }
    if (typeof w.quote !== 'string') {
        throw new Error('quote must be a string');
    }
    const pers = w.perspective;
    if (typeof pers !== 'string' && !(Array.isArray(pers) && pers.every((x) => typeof x === 'string'))) {
        throw new Error('perspective must be a string or array of strings');
    }
    const cons = w.constructing;
    if (typeof cons !== 'string' && !(Array.isArray(cons) && cons.every((x) => typeof x === 'string'))) {
        throw new Error('constructing must be a string or array of strings');
    }
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
export function buildSourcePayloadFromEnLocale(loc) {
    if (!loc || typeof loc !== 'object') return {};
    const o = /** @type {Record<string, unknown>} */ (loc);
    const locLine = compactLocationFromLocale(loc);
    const bio = String(o.bio ?? '').trim();
    const bioLong = String(o.bioLong ?? '').trim();
    const programs = Array.isArray(o.programs)
        ? o.programs.map((x) => String(x).trim()).filter(Boolean)
        : [];
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
    };
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
 * @returns {Promise<Record<string, unknown>>}
 */
export async function generateEnglishWorldWithLlm(reinterpret, sourceJson) {
    /** @type {string | undefined} */
    let firstErr;
    try {
        const raw = await reinterpret(JSON_INSTRUCTION, sourceJson, 'en');
        const parsed = parseWorldJsonResponse(raw);
        validateWorldShape(parsed);
        return normalizeWorldBlockForStorage(parsed);
    } catch (e) {
        firstErr = e instanceof Error ? e.message : String(e);
    }
    const retryPrompt = `${JSON_INSTRUCTION}${JSON_RETRY_SUFFIX}\n\nParse/validation error was: ${firstErr}`;
    const raw2 = await reinterpret(retryPrompt, sourceJson, 'en');
    const parsed2 = parseWorldJsonResponse(raw2);
    validateWorldShape(parsed2);
    return normalizeWorldBlockForStorage(parsed2);
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

    const pr = String(w.practice ?? '').trim();
    out.practice = pr ? (await translateEnToJa(pr)).trim() : '';

    const persParts = worldTextToParagraphs(w.perspective);
    const persJa = [];
    for (const line of persParts) {
        if (line.trim()) persJa.push((await translateEnToJa(line)).trim());
    }
    out.perspective = persJa.length <= 1 ? persJa[0] ?? '' : persJa;

    const vis = Array.isArray(w.vision) ? w.vision : [];
    const visJa = [];
    for (let i = 0; i < 4; i++) {
        const line = String(vis[i] ?? '').trim();
        visJa.push(line ? (await translateEnToJa(line)).trim() : '');
    }
    out.vision = visJa;

    const conParts = worldTextToParagraphs(w.constructing);
    const conJa = [];
    for (const line of conParts) {
        if (line.trim()) conJa.push((await translateEnToJa(line)).trim());
    }
    out.constructing = conJa.length <= 1 ? conJa[0] ?? '' : conJa;

    const ctx = Array.isArray(w.context) ? w.context : [];
    const ctxJa = [];
    for (let i = 0; i < 3; i++) {
        const line = String(ctx[i] ?? '').trim();
        ctxJa.push(line ? (await translateEnToJa(line)).trim() : '');
    }
    out.context = ctxJa;

    const qu = String(w.quote ?? '').trim();
    out.quote = qu ? (await translateEnToJa(qu)).trim() : '';

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
 * Apply merged world to locales and return updated locales object.
 * @param {Record<string, unknown>} locales
 * @param {'en' | 'ja'} code
 * @param {Record<string, unknown>} worldBlock
 * @param {WorldMergeMode} mode
 */
export function applyWorldToLocales(locales, code, worldBlock, mode) {
    const next = JSON.parse(JSON.stringify(locales || { en: {}, ja: {} }));
    if (!next[code] || typeof next[code] !== 'object') next[code] = {};
    const block = /** @type {Record<string, unknown>} */ (next[code]);
    const prevWorld =
        block.world && typeof block.world === 'object' && !Array.isArray(block.world)
            ? /** @type {Record<string, unknown>} */ (block.world)
            : {};
    block.world = mergeWorldBlocks(prevWorld, worldBlock, mode);
    next[code] = block;
    return next;
}
