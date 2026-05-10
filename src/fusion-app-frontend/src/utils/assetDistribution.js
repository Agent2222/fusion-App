export const CLOUDFRONT_ASSET_ORIGIN = 'https://cdn.fusionart.world';

/**
 * @param {unknown} url
 * @returns {string}
 */
function uploadedPathFromUrl(url) {
    const raw = String(url ?? '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) {
        const parsed = new URL(raw);
        const uploadsIndex = parsed.pathname.indexOf('/uploads/');
        if (uploadsIndex < 0) return '';
        return `${parsed.pathname.slice(uploadsIndex)}${parsed.search}${parsed.hash}`;
    }
    const uploadsIndex = raw.indexOf('/uploads/');
    return uploadsIndex < 0 ? '' : raw.slice(uploadsIndex);
}

/**
 * @param {unknown} url
 * @returns {string}
 */
export function toCloudFrontAssetUrl(url) {
    const raw = String(url ?? '').trim();
    if (!raw) return '';
    const path = uploadedPathFromUrl(raw);
    if (!path) return raw;
    return `${CLOUDFRONT_ASSET_ORIGIN}${path}`;
}

/**
 * @param {unknown} url
 * @returns {string[]}
 */
export function assetUrlCandidates(url) {
    const original = String(url ?? '').trim();
    if (!original) return [];
    const cloudfront = toCloudFrontAssetUrl(original);
    if (!cloudfront || cloudfront === original) return [original];
    return [cloudfront, original];
}

/**
 * @param {unknown} url
 * @returns {boolean}
 */
export function isUploadedAssetUrl(url) {
    return Boolean(uploadedPathFromUrl(url));
}

/**
 * @param {unknown} value
 * @returns {unknown}
 */
export function distributeUploadedAssetUrls(value) {
    if (typeof value === 'string') return toCloudFrontAssetUrl(value);
    if (Array.isArray(value)) return value.map((item) => distributeUploadedAssetUrls(item));
    if (value && typeof value === 'object') {
        /** @type {Record<string, unknown>} */
        const out = {};
        for (const [key, item] of Object.entries(/** @type {Record<string, unknown>} */ (value))) {
            out[key] = distributeUploadedAssetUrls(item);
        }
        return out;
    }
    return value;
}
