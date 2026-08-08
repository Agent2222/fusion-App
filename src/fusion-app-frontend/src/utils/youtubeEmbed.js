/**
 * Normalize a YouTube watch URL, youtu.be link, embed URL, or iframe HTML
 * into a safe youtube.com/embed/… src for public iframes.
 */

/**
 * @param {string} s
 * @returns {string}
 */
function decodeBasicHtmlEntities(s) {
    return String(s || '')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/gi, '&');
}

/**
 * @param {string} input
 * @returns {string} embed src URL or ''
 */
export function normalizeYoutubeEmbedSrc(input) {
    const raw = decodeBasicHtmlEntities(String(input || '').trim());
    if (!raw) return '';

    let candidate = raw;
    const iframeSrc =
        raw.match(/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i) ||
        raw.match(/<iframe\b[^>]*\bsrc\s*=\s*([^\s>]+)/i);
    if (iframeSrc?.[1]) {
        candidate = iframeSrc[1].trim();
    }

    // Bare video id
    if (/^[\w-]{11}$/.test(candidate)) {
        return `https://www.youtube.com/embed/${candidate}`;
    }

    try {
        const u = new URL(candidate, 'https://www.youtube.com');
        const host = u.hostname.replace(/^www\./, '').toLowerCase();
        let id = '';
        if (host === 'youtu.be') {
            id = u.pathname.replace(/^\//, '').split('/')[0] || '';
        } else if (
            host === 'youtube.com' ||
            host === 'youtube-nocookie.com' ||
            host === 'm.youtube.com'
        ) {
            if (u.pathname.startsWith('/embed/')) {
                id = u.pathname.slice('/embed/'.length).split('/')[0] || '';
            } else if (u.searchParams.get('v')) {
                id = u.searchParams.get('v') || '';
            } else {
                const shorts = u.pathname.match(/^\/shorts\/([^/?#]+)/);
                if (shorts?.[1]) id = shorts[1];
                const live = u.pathname.match(/^\/live\/([^/?#]+)/);
                if (!id && live?.[1]) id = live[1];
            }
        }
        if (!id || !/^[\w-]{6,}$/.test(id)) return '';
        return `https://www.youtube.com/embed/${id}`;
    } catch {
        return '';
    }
}

/**
 * True when input looks like a YouTube URL or iframe (for Studio validation hints).
 * @param {string} input
 */
export function looksLikeYoutubeInput(input) {
    const s = decodeBasicHtmlEntities(String(input || '').trim());
    if (!s) return true;
    return /youtube\.com|youtu\.be|youtube-nocookie\.com|<iframe/i.test(s);
}
