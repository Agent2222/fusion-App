import { journalBodyPlainText } from './journalBodyHtml.js';

/**
 * @param {unknown} s
 * @returns {string}
 */
export function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Plain-text preview for card copy: strip HTML, collapse whitespace, truncate.
 * @param {unknown} raw
 * @param {number} [maxLen]
 * @returns {string}
 */
export function previewPlainText(raw, maxLen = 250) {
    const s = String(raw ?? '').trim();
    if (!s) return '';
    const looksHtml =
        /<[a-z][\s\S]*>/i.test(s) ||
        /&lt;[a-z]/i.test(s) ||
        (/^https?:\/\//i.test(s) && /" alt=|%22|%3E/i.test(s));
    let stripped = looksHtml ? journalBodyPlainText(s) : s.replace(/\s+/g, ' ').trim();
    if (!stripped) return '';
    if (stripped.length <= maxLen) return stripped;
    return `${stripped.slice(0, maxLen).trim()}...`;
}
