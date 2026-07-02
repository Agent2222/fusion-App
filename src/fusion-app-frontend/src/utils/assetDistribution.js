export const CLOUDFRONT_ASSET_ORIGIN = 'https://cdn.fusionart.world';

/**
 * @param {unknown} url
 * @returns {string}
 */
function uploadedPathFromUrl(url) {
    const raw = String(url ?? '').trim();
    if (!raw) return '';
    const pathFromRaw = (value) => {
        const fusionMediaIndex = value.indexOf('/fusionMedia/uploads/');
        if (fusionMediaIndex >= 0) return value.slice(fusionMediaIndex);
        const uploadsIndex = value.indexOf('/uploads/');
        return uploadsIndex < 0 ? '' : value.slice(uploadsIndex);
    };
    if (/^https?:\/\//i.test(raw)) {
        const parsed = new URL(raw);
        const path = pathFromRaw(parsed.pathname);
        return path ? `${path}${parsed.search}${parsed.hash}` : '';
    }
    return pathFromRaw(raw);
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
 * @param {string} s
 */
function looksLikeHtmlOrRichText(s) {
    const t = String(s).trim();
    if (!t) return false;
    if (/<[a-z][\s\S]*>/i.test(t)) return true;
    if (/&lt;[a-z]/i.test(t)) return true;
    if (/%3C[a-z]/i.test(t)) return true;
    if (/^https?:\/\//i.test(t) && /" alt=|%22|%3E/i.test(t)) return true;
    return false;
}

/**
 * Rewrite upload URLs inside HTML attributes only (never treat the whole string as a URL).
 * @param {string} html
 */
export function rewriteUploadedUrlsInHtml(html) {
    const s = String(html ?? '');
    if (!s) return s;
    return s.replace(
        /((?:src|href)\s*=\s*["'])([^"']+)(["'])/gi,
        (match, prefix, url, suffix) => {
            if (!/\/uploads\//i.test(url)) return match;
            const next = toCloudFrontAssetUrl(url);
            return next && next !== url ? `${prefix}${next}${suffix}` : match;
        }
    );
}

/**
 * @param {unknown} value
 * @returns {unknown}
 */
export function distributeUploadedAssetUrls(value) {
    if (typeof value === 'string') {
        if (looksLikeHtmlOrRichText(value)) return rewriteUploadedUrlsInHtml(value);
        return toCloudFrontAssetUrl(value);
    }
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
