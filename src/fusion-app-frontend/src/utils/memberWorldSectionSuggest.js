/**
 * Story & World editor: per-section "Suggest copy" for the AI (`worldNew`) column.
 *
 * One call writes ONE section as plain text (no JSON envelope, so short replies stay
 * cheap and a single failed section never blocks the other five). The prompt/parse
 * contract is shared by every section via {@link WORLD_SECTION_SPECS}; Japanese is
 * produced by translating the English result unit-by-unit so array order is preserved.
 */
import { isLlmFailureText, sanitizeLlmTextOutput } from './llmTextSanitize.js';
import { worldTextToParagraphs } from './worldNormalize.js';

/**
 * @typedef {'practice' | 'perspective' | 'vision' | 'constructing' | 'context' | 'quote'} WorldSectionField
 */

/** Section ids, in editor order. */
export const WORLD_SECTION_FIELD_KEYS = /** @type {const} */ ([
    'practice',
    'perspective',
    'vision',
    'constructing',
    'context',
    'quote',
]);

/** Placeholder an array section uses when a slot cannot be supported by the source. */
export const WORLD_SECTION_EMPTY_LINE = 'NONE';

/**
 * @typedef {object} WorldSectionSpec
 * @property {'text' | 'paragraphs' | 'lines'} kind
 * @property {number} count    - fixed item count for `lines` sections
 * @property {number} maxItems - cap for `paragraphs` sections
 * @property {string} label
 * @property {string} rule
 */

/** @type {Record<WorldSectionField, WorldSectionSpec>} */
export const WORLD_SECTION_SPECS = {
    practice: {
        kind: 'text',
        count: 0,
        maxItems: 1,
        label: 'Practice',
        rule: 'One short sentence (a micro-bio under the artist name) describing what the practice explores.',
    },
    perspective: {
        kind: 'paragraphs',
        count: 0,
        maxItems: 2,
        label: 'Perspective',
        rule: 'One or two short paragraphs on how the artist sees the practice in relation to the field.',
    },
    vision: {
        kind: 'lines',
        count: 4,
        maxItems: 4,
        label: 'Vision',
        rule: 'Exactly four short punchy lines (statements or short phrases) for "What they see".',
    },
    constructing: {
        kind: 'paragraphs',
        count: 0,
        maxItems: 2,
        label: 'Constructing',
        rule: 'One or two short paragraphs about how the work is made — materials, process, what is being made now.',
    },
    context: {
        kind: 'lines',
        count: 3,
        maxItems: 3,
        label: 'Context',
        rule: 'Exactly three lines in this fixed order: (1) where they are based, (2) disciplines/media/themes, (3) recent or upcoming exhibitions or projects.',
    },
    quote: {
        kind: 'text',
        count: 0,
        maxItems: 1,
        label: 'Quote',
        rule: 'One memorable line visitors can read at a glance (may be more than one sentence).',
    },
};

/**
 * @param {string} section
 * @returns {WorldSectionSpec | null}
 */
function sectionSpec(section) {
    if (!section || typeof section !== 'string') return null;
    const spec = /** @type {Record<string, WorldSectionSpec>} */ (WORLD_SECTION_SPECS)[section];
    return spec ?? null;
}

/**
 * Prompt for one section. Same evidence + voice rules as the batch writer, but the
 * reply is plain text for a single field instead of a JSON object.
 * @param {string} section
 * @returns {string}
 */
export function buildWorldSectionPrompt(section) {
    const spec = sectionSpec(section);
    if (!spec) throw new Error(`Unknown story section: ${section}`);
    const lines = [
        'You are writing ONE field of a public artist profile for an art platform.',
        '',
        'SOURCE_JSON (separate message) is the ONLY evidence you may use for facts (locations, exhibitions, materials, geography, institutions, dates). Read every field in SOURCE_JSON before writing. Do not invent or guess biographical facts, places, shows, or credentials.',
        '',
        'Voice: write in THIRD PERSON. Refer to the artist by their display name from SOURCE_JSON (prefer "name", else firstName + lastName). Never use first person ("I", "my", "me", "we", "our") unless you are quoting "wordsFromArtist" inside the quote field and preserve it as a quote.',
        '',
        `Write ONLY the "${section}" field. ${spec.rule}`,
        '',
        'Output format (critical): reply with the text only — no JSON, no markdown, no field labels, no surrounding quotation marks, no commentary before or after.',
    ];
    if (spec.kind === 'lines') {
        lines.push(
            `Reply with exactly ${spec.count} lines, one item per line. If SOURCE_JSON cannot support one of the lines, reply with ${WORLD_SECTION_EMPTY_LINE} on that line.`,
        );
    } else if (spec.kind === 'paragraphs') {
        lines.push('Separate paragraphs with a single blank line.');
    } else {
        lines.push('Reply with one line of text and no line breaks.');
    }
    return lines.join('\n');
}

/**
 * Strip fences / leading labels that a chat model sometimes adds around plain text.
 * @param {string} raw
 * @returns {string}
 */
function stripReplyNoise(raw) {
    let t = String(raw ?? '').trim();
    if (t.startsWith('```')) {
        t = t.replace(/^```[a-zA-Z0-9]*\s*/m, '');
        const idx = t.lastIndexOf('```');
        if (idx !== -1) t = t.slice(0, idx);
    }
    t = t.replace(
        /^(?:#{1,6}\s*)?(?:practice|perspective|vision|constructing|context|quote)\s*:\s*/i,
        '',
    );
    return t.trim();
}

/**
 * Remove one layer of surrounding quotes (LLMs like to quote a quote field).
 * @param {string} s
 * @returns {string}
 */
function stripOuterQuotes(s) {
    const t = String(s ?? '').trim();
    if (t.length < 2) return t;
    /** @type {[string, string][]} */
    const pairs = [
        ['"', '"'],
        ['“', '”'],
        ['「', '」'],
        ["'", "'"],
    ];
    for (const [open, close] of pairs) {
        if (t.startsWith(open) && t.endsWith(close)) return t.slice(1, -1).trim();
    }
    return t;
}

/**
 * @param {string} s
 * @returns {boolean}
 */
function isNoneLine(s) {
    return /^(?:none|n\/a|—|-)$/i.test(
        String(s ?? '')
            .trim()
            .replace(/[.。]$/, ''),
    );
}

/**
 * Parse a plain-text reply for one section.
 * @param {string} section
 * @param {unknown} raw
 * @returns {string | string[]}
 */
export function parseWorldSectionReply(section, raw) {
    const spec = sectionSpec(section);
    if (!spec) throw new Error(`Unknown story section: ${section}`);
    const cleaned = stripReplyNoise(raw);
    if (!cleaned) throw new Error('The AI returned an empty suggestion.');
    if (isLlmFailureText(cleaned)) {
        throw new Error('The AI could not write this section yet.');
    }

    if (spec.kind === 'text') {
        const oneLine = cleaned.replace(/\s*\n+\s*/g, ' ').trim();
        const text = sanitizeLlmTextOutput(stripOuterQuotes(oneLine));
        if (!text) throw new Error('The AI returned an empty suggestion.');
        return text;
    }

    if (spec.kind === 'paragraphs') {
        const chunks = cleaned
            .split(/\n\s*\n+/)
            .map((chunk) => chunk.replace(/\s*\n+\s*/g, ' ').trim())
            .filter(Boolean)
            .map((chunk) => sanitizeLlmTextOutput(stripOuterQuotes(chunk)))
            .filter(Boolean);
        const paragraphs = worldTextToParagraphs(chunks).slice(0, spec.maxItems);
        if (!paragraphs.length) throw new Error('The AI returned an empty suggestion.');
        return paragraphs;
    }

    /** @type {string[]} */
    const items = [];
    for (const line of cleaned.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const bullet = trimmed.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim();
        if (!bullet) continue;
        if (isNoneLine(bullet)) {
            items.push('');
            continue;
        }
        items.push(sanitizeLlmTextOutput(stripOuterQuotes(bullet)));
    }
    if (!items.length) throw new Error('The AI returned an empty suggestion.');
    /** @type {string[]} */
    const out = [];
    for (let i = 0; i < spec.count; i++) out.push(items[i] ?? '');
    if (!out.some(Boolean)) throw new Error('The AI returned an empty suggestion.');
    return out;
}

/**
 * Translate one section value to the requested locale, unit by unit.
 * @param {string | string[]} value
 * @param {(text: string) => Promise<string>} translate
 * @returns {Promise<string | string[]>}
 */
export async function translateWorldSectionValue(value, translate) {
    if (typeof translate !== 'function') {
        throw new Error('Translation is not available right now.');
    }
    if (Array.isArray(value)) {
        /** @type {string[]} */
        const out = [];
        for (const item of value) {
            const unit = String(item ?? '').trim();
            out.push(unit ? sanitizeLlmTextOutput(await translate(unit)) : '');
        }
        return out;
    }
    const text = String(value ?? '').trim();
    return text ? sanitizeLlmTextOutput(await translate(text)) : '';
}

/**
 * Generate (and optionally translate) one Story & World section.
 * @param {string} section
 * @param {{
 *   sourceJson?: string,
 *   locale?: 'en' | 'ja',
 *   reinterpret?: (prompt: string, source: string, localeTag: string) => Promise<string>,
 *   translate?: (text: string) => Promise<string>,
 * }} [options]
 * @returns {Promise<string | string[]>}
 */
export async function suggestWorldSectionValue(section, options = {}) {
    const spec = sectionSpec(section);
    if (!spec) throw new Error(`Unknown story section: ${section}`);
    const { reinterpret, translate } = options;
    if (typeof reinterpret !== 'function') {
        throw new Error('AI suggestions are not available right now.');
    }
    const sourceJson = String(options.sourceJson ?? '').trim();
    if (!sourceJson) {
        throw new Error(
            'Add a bio, discipline, or location first — the AI needs material to work from.',
        );
    }
    const raw = await reinterpret(buildWorldSectionPrompt(section), sourceJson, 'en');
    const value = parseWorldSectionReply(section, raw);
    if (options.locale === 'ja') return translateWorldSectionValue(value, translate);
    return value;
}
