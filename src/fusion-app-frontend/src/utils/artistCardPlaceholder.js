/**
 * Served from Vite `public/` — used when roster `image` is missing or fails to load.
 */
export const ARTIST_CARD_PLACEHOLDER_SRC = '/artist-card-placeholder.png';

/**
 * @param {unknown} imageUrl
 * @returns {string}
 */
export function resolveArtistCardImageUrl(imageUrl) {
    const u = String(imageUrl ?? '').trim();
    return u || ARTIST_CARD_PLACEHOLDER_SRC;
}

function isPlaceholderSrc(src) {
    const s = String(src ?? '');
    return s === ARTIST_CARD_PLACEHOLDER_SRC || s.endsWith('/artist-card-placeholder.png');
}

/**
 * Set roster image on a card `<img>`: empty/invalid URL → placeholder; `error` → placeholder once.
 * Adds `artist-card-img--placeholder` for CSS (`object-fit: contain` vs cover).
 *
 * @param {HTMLImageElement | null} img
 * @param {unknown} imageUrl
 */
export function applyArtistCardImage(img, imageUrl) {
    if (!(img instanceof HTMLImageElement)) return;
    img.classList.add('artist-card-img');
    const src = resolveArtistCardImageUrl(imageUrl);
    img.src = src;
    img.classList.toggle('artist-card-img--placeholder', isPlaceholderSrc(src));
    img.addEventListener(
        'error',
        () => {
            if (img.dataset.placeholderApplied === '1') return;
            img.dataset.placeholderApplied = '1';
            img.src = ARTIST_CARD_PLACEHOLDER_SRC;
            img.classList.add('artist-card-img--placeholder');
        },
        { once: true }
    );
}
