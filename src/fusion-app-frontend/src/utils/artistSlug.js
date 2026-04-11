/**
 * Stable URL segment for an artist, derived from canonical English name.
 * @param {string} name
 * @returns {string}
 */
export function artistSlugFromName(name) {
    return String(name).trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * English copy block (canonical name for slug derivation).
 * Supports legacy `{ en }` or `{ locales: { en } }`.
 * @param {object | null | undefined} artist
 * @returns {object | null}
 */
export function artistEnglishBlock(artist) {
    if (!artist || typeof artist !== 'object') return null;
    return artist.locales?.en ?? artist.en ?? null;
}

/**
 * Localized copy for UI (name, discipline, world, etc.).
 * @param {object | null | undefined} artist
 * @param {string} [locale]
 * @returns {object | null}
 */
export function artistLocaleBlock(artist, locale) {
    if (!artist || typeof artist !== 'object') return null;
    const loc = locale === 'ja' ? 'ja' : 'en';
    return artist.locales?.[loc] ?? artist[loc] ?? artistEnglishBlock(artist);
}

/**
 * @param {string} slug — path segment (lowercase hyphenated)
 * @param {Array<object>} artists
 * @returns {object | null}
 */
export function findArtistBySlug(slug, artists) {
    if (!slug || !Array.isArray(artists)) return null;
    const want = String(slug).trim().toLowerCase();
    for (const a of artists) {
        if (a?.slug && String(a.slug).trim().toLowerCase() === want) return a;
        const en = artistEnglishBlock(a);
        if (!en?.name) continue;
        if (artistSlugFromName(en.name) === want) return a;
    }
    return null;
}

/**
 * Match by canonical English display name (case-insensitive).
 * @param {string} name
 * @param {Array<object>} artists
 * @returns {object | null}
 */
export function findArtistByEnglishName(name, artists) {
    if (!name || !Array.isArray(artists)) return null;
    const want = String(name).trim().toLowerCase();
    for (const a of artists) {
        const en = artistEnglishBlock(a);
        if (en?.name && String(en.name).trim().toLowerCase() === want) return a;
    }
    return null;
}
