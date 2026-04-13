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
 * Card / feed title: localized name, else a readable title from `slug`.
 * @param {object | null | undefined} artist
 * @param {string} [locale]
 */
export function artistDisplayName(artist, locale) {
    const loc = artistLocaleBlock(artist, locale ?? 'en');
    const n = loc?.name;
    if (n != null && String(n).trim()) return String(n).trim();
    const slug = artist && typeof artist === 'object' ? String(artist.slug || '').trim() : '';
    if (!slug) return '';
    return slug
        .split('-')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

/**
 * Short line under name: `discipline` or `world.practice` when present in locale JSON.
 * @param {object | null | undefined} artist
 * @param {string} [locale]
 */
export function artistDisplayDiscipline(artist, locale) {
    const loc = artistLocaleBlock(artist, locale ?? 'en');
    if (!loc || typeof loc !== 'object') return '';
    if (loc.discipline != null && String(loc.discipline).trim()) return String(loc.discipline).trim();
    const w = loc.world;
    if (w && typeof w === 'object' && w.practice != null && String(w.practice).trim()) {
        return String(w.practice).trim();
    }
    return '';
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
