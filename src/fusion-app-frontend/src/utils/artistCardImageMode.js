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
 * Staff-approved audio bite for public play surfaces.
 * @param {unknown} artist
 * @returns {boolean}
 */
export function isArtistAudioApproved(artist) {
    if (!artist || typeof artist !== 'object') return false;
    const o = /** @type {Record<string, unknown>} */ (artist);
    return Boolean(o.audioApproved ?? o.audio_approved);
}

/**
 * True if the artist has at least one approved audio URL available for public playback.
 * Checks the multi-bite `approvedAudioUrls` array first, then falls back to the
 * legacy single `audioUrl` + `audioApproved` flag for backward compat.
 * @param {unknown} artist
 * @returns {boolean}
 */
export function artistHasPublicPlayableAudio(artist) {
    if (!artist || typeof artist !== 'object') return false;
    const o = /** @type {Record<string, unknown>} */ (artist);
    const approvedUrls = Array.isArray(o.approvedAudioUrls) ? o.approvedAudioUrls : [];
    if (approvedUrls.length > 0) return true;
    return Boolean(String(o.audioUrl ?? '').trim() && isArtistAudioApproved(artist));
}

/**
 * Returns all approved audio entries for public playback (multi-bite).
 * Falls back to single audioUrl if no collection data is available.
 * @param {unknown} artist
 * @returns {{ url: string, title: string }[]}
 */
export function getApprovedAudioEntries(artist) {
    if (!artist || typeof artist !== 'object') return [];
    const o = /** @type {Record<string, unknown>} */ (artist);
    const entries = Array.isArray(o.audioEntries) ? o.audioEntries : [];
    const approvedUrls = Array.isArray(o.approvedAudioUrls) ? o.approvedAudioUrls : [];
    const highlightUrl = String(o.highlightAudioUrl ?? '');
    const approvedSet = new Set(approvedUrls.map(String));
    if (entries.length > 0 && approvedSet.size > 0) {
        const approved = entries
            .filter((e) => approvedSet.has(String(e?.url ?? '')))
            .map((e) => ({ url: String(e.url ?? ''), title: String(e.title ?? '') }));
        if (highlightUrl) {
            const hlIdx = approved.findIndex((e) => e.url === highlightUrl);
            if (hlIdx > 0) {
                const [hl] = approved.splice(hlIdx, 1);
                approved.unshift(hl);
            }
        }
        return approved;
    }
    if (String(o.audioUrl ?? '').trim() && isArtistAudioApproved(artist)) {
        return [{ url: String(o.audioUrl), title: String(o.audioTitle ?? 'Artist audio') }];
    }
    return [];
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
