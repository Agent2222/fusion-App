/**
 * Artists page shout: Studio edits plain text; public view preserves line breaks.
 * Legacy CMS rows may still use `shoutHtml` — convert for editing and display.
 */

/**
 * @param {string} html
 * @returns {string}
 */
export function shoutHtmlToPlain(html) {
    if (!html || typeof html !== 'string') return '';
    let s = html;
    s = s.replace(/<br\s*\/?>/gi, '\n');
    s = s.replace(/<\/p>/gi, '\n');
    s = s.replace(/<\/div>/gi, '\n');
    s = s.replace(/<[^>]+>/g, '');
    const ta = document.createElement('textarea');
    ta.innerHTML = s;
    return ta.value.replace(/\r\n/g, '\n').trim();
}

/**
 * @param {Record<string, unknown>} localeSlice
 * @returns {string}
 */
export function shoutPlainFromLocaleSlice(localeSlice) {
    if (!localeSlice || typeof localeSlice !== 'object') return '';
    if (typeof localeSlice.shoutText === 'string') {
        return String(localeSlice.shoutText).replace(/\r\n/g, '\n');
    }
    return shoutHtmlToPlain(String(localeSlice.shoutHtml ?? ''));
}
