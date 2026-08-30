/**
 * Unique travel-prep image URLs for the Studio picker.
 */

/**
 * @param {Array<{ imageUrl?: string, title?: string }>} links
 * @param {string[]} [library]
 * @returns {Array<{ url: string, label: string }>}
 */
export function collectTravelPrepImageOptions(links = [], library = []) {
    const seen = new Set();
    const out = [];
    const add = (url, label) => {
        const u = String(url || '').trim();
        if (!u || seen.has(u)) return;
        seen.add(u);
        out.push({ url: u, label: String(label || 'Travel prep').trim() || 'Travel prep' });
    };
    for (const l of Array.isArray(links) ? links : []) {
        add(l?.imageUrl, l?.title);
    }
    for (const url of Array.isArray(library) ? library : []) {
        add(url, 'Travel prep');
    }
    return out;
}
