/**
 * Consistent image alt / video labels for public SEO (Japan artist residency).
 * Empty primary → full default; non-empty → primary + suffix (deduped if already present).
 */

/** @type {string} */
export const SEO_MEDIA_SUFFIX = ' · Fusion · Japan artist residency';

/** Fallback when there is no primary description (aligned with index.html vocabulary). */
export const SEO_MEDIA_DEFAULT = 'Fusion — Japan artist residency';

const SUFFIX_LOWER = SEO_MEDIA_SUFFIX.trim().toLowerCase();

/**
 * @param {unknown} primary
 * @returns {string}
 */
function trimPrimary(primary) {
    if (primary === undefined || primary === null) return '';
    const s = String(primary).replace(/\s+/g, ' ').trim();
    return s;
}

/**
 * @param {string} s
 * @returns {boolean}
 */
function alreadyHasSuffix(s) {
    const t = s.trim().toLowerCase();
    return t.endsWith(SUFFIX_LOWER);
}

/**
 * Image `alt` text: default when empty; otherwise primary + SEO suffix (no duplicate suffix).
 * @param {unknown} primary
 * @returns {string}
 */
export function withSeoImageAlt(primary) {
    const p = trimPrimary(primary);
    if (!p) return SEO_MEDIA_DEFAULT;
    if (alreadyHasSuffix(p)) return p;
    return `${p}${SEO_MEDIA_SUFFIX}`;
}

/**
 * `<video>` has no `alt`; use `aria-label` and `title` with the same rules as {@link withSeoImageAlt}.
 * @param {unknown} primary
 * @returns {string}
 */
export function withSeoVideoLabel(primary) {
    return withSeoImageAlt(primary);
}
