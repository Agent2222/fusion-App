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
 * Plain-text preview for card copy: strip simple HTML tags, collapse whitespace, truncate.
 * @param {unknown} raw
 * @param {number} [maxLen]
 * @returns {string}
 */
export function previewPlainText(raw, maxLen = 250) {
    const s = String(raw ?? '');
    const stripped = s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (stripped.length <= maxLen) return stripped;
    return `${stripped.slice(0, maxLen).trim()}...`;
}
