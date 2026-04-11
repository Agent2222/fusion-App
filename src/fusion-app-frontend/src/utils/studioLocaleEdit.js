/**
 * Studio locale editors: show blank when empty (not "{}"); accept JSON or plain text.
 */

/**
 * @param {unknown} value
 * @returns {string} Pretty JSON, or "" when empty object/array/null/undefined
 */
export function localeValueToEditorText(value) {
    if (value === undefined || value === null) return '';
    if (typeof value === 'object') {
        if (Array.isArray(value)) {
            if (value.length === 0) return '';
        } else if (Object.keys(value).length === 0) {
            return '';
        }
    }
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

function plainTextToObjectLocale(t, kind) {
    const firstLine = t.split('\n')[0]?.trim() || t;
    switch (kind) {
        case 'program':
            return { focus: firstLine, description: t };
        case 'edition':
            return { title: firstLine, alt: firstLine, description: t };
        case 'journal':
            return {
                title: firstLine,
                description: t,
                cta: 'Read Entry',
                imageAlt: firstLine,
            };
        default:
            return { title: firstLine, description: t };
    }
}

/**
 * Object locales (program card, edition copy, journal body). JSON object if valid; otherwise plain text is mapped by kind.
 * @param {string} raw
 * @param {'program' | 'edition' | 'journal' | 'generic'} kind
 * @returns {Record<string, unknown>}
 */
export function editorTextToObjectLocale(raw, kind = 'generic') {
    const t = String(raw ?? '').trim();
    if (!t) return {};
    try {
        const v = JSON.parse(t);
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
            return v;
        }
        return plainTextToObjectLocale(t, kind);
    } catch {
        return plainTextToObjectLocale(t, kind);
    }
}

/**
 * CMS `en` / `ja` blobs: may be arrays (terms/faq), objects (`info`), etc.
 * Valid JSON is preserved. Plain text → `[{ title: '', description: text }]`.
 * Empty field → `[]` (re-paste JSON for object-only pages like `info`).
 * @param {string} raw
 * @returns {unknown}
 */
export function editorTextToContentLocale(raw) {
    const t = String(raw ?? '').trim();
    if (!t) return [];
    try {
        return JSON.parse(t);
    } catch {
        return [{ title: '', description: t }];
    }
}

/**
 * Whole-document JSON for Studio Content `full` mode (arrays, nested join flows, etc.).
 * @param {string} raw
 * @returns {unknown}
 */
export function parseFullContentJson(raw) {
    const t = String(raw ?? '').trim();
    if (!t) throw new Error('JSON is empty.');
    return JSON.parse(t);
}

/**
 * For translate / export: get a string suitable to send to a translation API.
 * @param {string} raw
 */
export function localeEditorToTranslatableString(raw) {
    const t = String(raw ?? '').trim();
    if (!t) return '';
    try {
        return JSON.stringify(JSON.parse(t));
    } catch {
        return t;
    }
}
