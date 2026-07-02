import { sanitizePublicSlugSegment } from './artistSlug.js';

/** @typedef {'en' | 'ja'} JournalLocale */

export const JOURNAL_LLM_COMBINED_MAX = 12000;

const TONE_OPTIONS = [
    'Elevated',
    'Warm and direct',
    'Professional and warm',
    'Short and direct',
    'Formal',
];

/**
 * @param {unknown} tone
 */
export function normalizeJournalAssistTone(tone) {
    const t = String(tone ?? '').trim();
    return TONE_OPTIONS.includes(t) ? t : 'Elevated';
}

/**
 * @param {string} tone
 * @param {string} sourceText
 */
export function buildJournalQuickDraftPrompt(tone, sourceText) {
    const t = normalizeJournalAssistTone(tone);
    const seed = String(sourceText ?? '').trim();
    const base = `Write a journal editorial entry for Fusion's art platform and Japan artist residency network. Tone: ${t}. Output plain text only — no HTML, no markdown, no code fences. Use line breaks between paragraphs.`;
    return seed
        ? `${base} Expand or refine the following notes into a full entry:\n\n${seed}`
        : `${base} Write a complete entry with a compelling opening and thoughtful close.`;
}

export function buildJournalRefinePrompt() {
    return 'Rewrite the following journal entry text for clarity and publication. Keep the author voice warm and art-community oriented. Output plain text only — no HTML, no markdown.';
}

/**
 * @param {'expand' | 'shorten'} mode
 */
export function buildJournalTransformPrompt(mode) {
    return mode === 'expand'
        ? 'Expand the following journal text: add useful detail and depth, keep a warm editorial voice. Return only the expanded plain text, no JSON.'
        : 'Shorten the following journal text: remove filler, keep meaning and voice. Return only the shortened plain text, no JSON.';
}

export function buildJournalExpandPrompt() {
    return buildJournalTransformPrompt('expand');
}

export function buildJournalShortenPrompt() {
    return buildJournalTransformPrompt('shorten');
}

/**
 * @param {JournalLocale} locale
 */
export function journalAssistLocaleTag(locale) {
    return locale === 'ja' ? 'ja' : 'en';
}

/**
 * Public URL path for a journal entry from title (preferred) or internal id.
 * @param {string} titleEn
 * @param {string} entryId
 */
export function buildJournalEntryPublicLink(titleEn, entryId) {
    const slug = sanitizePublicSlugSegment(titleEn);
    if (slug) return `/journal/entry/${slug}`;
    const id = String(entryId ?? '').trim();
    return id ? `/journal/entry/${encodeURIComponent(id)}` : '';
}

/**
 * @param {string} link
 * @param {string} titleEn
 * @param {string} entryId
 */
export function resolveJournalEntryLink(link, titleEn, entryId) {
    const trimmed = String(link ?? '').trim();
    if (trimmed) return trimmed;
    return buildJournalEntryPublicLink(titleEn, entryId);
}

/**
 * @param {Record<string, unknown>} prevEn
 * @param {Record<string, unknown>} prevJa
 * @param {{ titleEn: string, titleJa: string, bodyEn: string, bodyJa: string }} plain
 */
export function collectJournalLocalesPayload(prevEn, prevJa, plain) {
    return {
        en: { ...prevEn, title: plain.titleEn, description: plain.bodyEn },
        ja: { ...prevJa, title: plain.titleJa, description: plain.bodyJa },
    };
}

/**
 * @param {string} initialJson
 * @param {{ id: string, link: string, imageSrc: string, entryStatus: string, titleEn: string, titleJa: string, bodyEn: string, bodyJa: string }} cur
 */
export function journalEntryFormSnapshotJson(cur) {
    return JSON.stringify({
        id: String(cur.id ?? ''),
        link: String(cur.link ?? ''),
        imageSrc: String(cur.imageSrc ?? ''),
        entryStatus: String(cur.entryStatus ?? 'draft'),
        titleEn: String(cur.titleEn ?? ''),
        titleJa: String(cur.titleJa ?? ''),
        bodyEn: String(cur.bodyEn ?? ''),
        bodyJa: String(cur.bodyJa ?? ''),
    });
}

export { TONE_OPTIONS as JOURNAL_ASSIST_TONE_OPTIONS };
