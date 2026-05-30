import { ARTIST_CARD_PLACEHOLDER_SRC } from './artistCardPlaceholder.js';

/** @type {Map<string, boolean>} */
const probeCache = new Map();

/**
 * @param {unknown} src
 */
export function isArtistCardPlaceholderSrc(src) {
    const s = String(src ?? '').trim();
    if (!s) return false;
    return s === ARTIST_CARD_PLACEHOLDER_SRC || s.endsWith('/artist-card-placeholder.png');
}

/**
 * @param {unknown} url
 */
export function isUsableImageUrl(url) {
    const s = String(url ?? '').trim();
    if (!s) return false;
    if (isArtistCardPlaceholderSrc(s)) return false;
    return true;
}

/**
 * @param {string} src
 * @param {{ timeoutMs?: number }} [opts]
 * @returns {Promise<boolean>}
 */
function probeImageSrcUncached(src, opts = {}) {
    const timeoutMs = opts.timeoutMs ?? 8000;
    return new Promise((resolve) => {
        if (typeof Image === 'undefined') {
            resolve(false);
            return;
        }
        const img = new Image();
        let settled = false;
        const finish = (ok) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(ok);
        };
        const timer = setTimeout(() => finish(false), timeoutMs);
        img.onload = () => finish(img.naturalWidth > 0);
        img.onerror = () => finish(false);
        img.src = src;
    });
}

/**
 * @param {string} src
 * @param {{ timeoutMs?: number, bypassCache?: boolean }} [opts]
 * @returns {Promise<boolean>}
 */
export async function probeImageSrc(src, opts = {}) {
    const s = String(src ?? '').trim();
    if (!isUsableImageUrl(s)) return false;
    if (!opts.bypassCache && probeCache.has(s)) {
        return probeCache.get(s) === true;
    }
    const ok = await probeImageSrcUncached(s, opts);
    probeCache.set(s, ok);
    return ok;
}

/** Clear cached probe results (tests). */
export function clearImageProbeCache() {
    probeCache.clear();
}
