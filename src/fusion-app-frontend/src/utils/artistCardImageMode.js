import { resolveArtistCardImageUrl } from './artistCardPlaceholder.js';

/** @typedef {'artwork' | 'profile'} ArtistCardImageMode */

export const ARTIST_CARD_IMAGE_MODE_LS = 'fusion-artist-card-image-mode';
export const ARTIST_CARD_IMAGE_MODE_EVENT = 'fusion-artist-card-image-mode';

/**
 * Primary card image: roster “artwork” / hero URL.
 * @param {unknown} artist
 * @returns {string}
 */
export function getArtistCardArtworkUrl(artist) {
    if (!artist || typeof artist !== 'object') return '';
    return String(/** @type {{ image?: unknown }} */ (artist).image ?? '').trim();
}

/**
 * @param {unknown} artist
 * @returns {boolean}
 */
export function isArtistHeroProfileImageApproved(artist) {
    if (!artist || typeof artist !== 'object') return false;
    const o = /** @type {Record<string, unknown>} */ (artist);
    return Boolean(o.heroProfileImageApproved ?? o.hero_profile_image_approved);
}

/**
 * Profile/headshot URL for “Profile” mode.
 * @param {unknown} artist
 * @param {{ fallbackToArtwork?: boolean }} [opts]
 * @returns {string}
 */
export function getArtistCardProfileUrl(artist, opts = {}) {
    if (!artist || typeof artist !== 'object') {
        return '';
    }
    const fallbackToArtwork = opts.fallbackToArtwork !== false;
    const o = /** @type {Record<string, unknown>} */ (artist);
    const p = String(o.heroProfileImage ?? o.hero_profile_image ?? '').trim();
    if (p) return p;
    return fallbackToArtwork ? getArtistCardArtworkUrl(artist) : '';
}

/**
 * Public card image honoring staff profile-image approval.
 * Approved: profile URL (falls back to artwork when headshot URL is empty).
 * Not approved: artwork URL.
 * @param {unknown} artist
 * @returns {string}
 */
export function resolveArtistPublicCardImageUrl(artist) {
    if (!isArtistHeroProfileImageApproved(artist)) {
        return getArtistCardArtworkUrl(artist);
    }
    return getArtistCardProfileUrl(artist);
}

/**
 * @returns {ArtistCardImageMode}
 */
export function getArtistCardImageMode() {
    try {
        const v = localStorage.getItem(ARTIST_CARD_IMAGE_MODE_LS);
        if (v === 'profile' || v === 'artwork') return v;
    } catch {
        /* ignore */
    }
    return 'artwork';
}

/**
 * URL to pass to {@link import('./artistCardPlaceholder.js').applyArtistCardImage} for the current toggle mode.
 * @param {unknown} artist
 * @returns {string}
 */
export function getArtistCardImageUrlForCurrentMode(artist) {
    if (getArtistCardImageMode() === 'profile') {
        return resolveArtistPublicCardImageUrl(artist);
    }
    return getArtistCardArtworkUrl(artist);
}

/**
 * Resolved URL with placeholder fallback (for direct `img.src` when not using `applyArtistCardImage`).
 * @param {unknown} artist
 * @returns {string}
 */
export function resolveArtistCardImageUrlForCurrentMode(artist) {
    return resolveArtistCardImageUrl(getArtistCardImageUrlForCurrentMode(artist));
}

/**
 * @param {ArtistCardImageMode} mode
 */
export function setArtistCardImageMode(mode) {
    const m = mode === 'profile' ? 'profile' : 'artwork';
    try {
        localStorage.setItem(ARTIST_CARD_IMAGE_MODE_LS, m);
    } catch {
        /* ignore */
    }
    try {
        window.dispatchEvent(new CustomEvent(ARTIST_CARD_IMAGE_MODE_EVENT, { detail: { mode: m } }));
    } catch {
        /* ignore */
    }
}
