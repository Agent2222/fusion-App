/** Default private-video object key prefix (matches Integration API `S3_PRIVATE_VIDEO_PREFIX`). */
export const PRIVATE_VIDEO_KEY_PREFIX = 'fusionMedia/private-video/';

/**
 * Strip CDN / S3 URL wrappers to an object key path.
 * @param {unknown} raw
 * @returns {string}
 */
function pathFromMediaReference(raw) {
    const text = String(raw ?? '').trim();
    if (!text) return '';
    if (/^https?:\/\//i.test(text)) {
        try {
            const pathname = new URL(text).pathname.replace(/^\/+/, '');
            return pathname.split('/').map(decodeURIComponent).join('/');
        } catch {
            return '';
        }
    }
    return text.replace(/^\/+/, '');
}

/**
 * Normalize Studio/canister value to a private-video storage key, or '' if invalid.
 * Accepts object keys or full CDN/S3 URLs pointing at `fusionMedia/private-video/…`.
 * Production keys are often flat, e.g. `fusionMedia/private-video/Rodolfo-Full.mp4`.
 * Studio uploads may use a nested key under the same prefix; both formats are valid.
 * @param {unknown} raw
 * @param {string} [prefix]
 * @returns {string}
 */
export function normalizePrivateVideoStorageKey(raw, prefix = PRIVATE_VIDEO_KEY_PREFIX) {
    const normalizedPrefix = String(prefix || PRIVATE_VIDEO_KEY_PREFIX).replace(/^\/+/, '');
    const withSlash = normalizedPrefix.endsWith('/') ? normalizedPrefix : `${normalizedPrefix}/`;
    const path = pathFromMediaReference(raw);
    if (!path) return '';
    if (path.startsWith(withSlash)) return path;
    const idx = path.indexOf(`/${withSlash}`);
    if (idx >= 0) return path.slice(idx + 1);
    if (path.startsWith(normalizedPrefix.replace(/\/$/, ''))) return path;
    return '';
}
