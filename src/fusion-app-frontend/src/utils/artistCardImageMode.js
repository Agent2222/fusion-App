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
 * Profile/headshot URL for “Profile” mode; falls back to artwork URL when unset.
 * @param {unknown} artist
 * @returns {string}
 */
export function getArtistCardProfileUrl(artist) {
    if (!artist || typeof artist !== 'object') {
        return '';
    }
    const o = /** @type {Record<string, unknown>} */ (artist);
    const p = String(o.heroProfileImage ?? o.hero_profile_image ?? '').trim();
    const art = getArtistCardArtworkUrl(artist);
    return p || art;
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
    return getArtistCardImageMode() === 'profile'
        ? getArtistCardProfileUrl(artist)
        : getArtistCardArtworkUrl(artist);
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
