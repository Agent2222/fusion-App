/**
 * Stable URL segment for an artist, derived from canonical English name.
 * @param {string} name
 * @returns {string}
 */
export function artistSlugFromName(name) {
    return String(name).trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * URL segment for member profile: lowercase [a-z0-9-], max 128 chars.
 * @param {string} raw
 * @returns {string}
 */
export function sanitizePublicSlugSegment(raw) {
    return String(raw ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 128);
}

/**
 * Preferred public slug from English first + last name (empty if both empty).
 * @param {string} [firstName]
 * @param {string} [lastName]
 */
export function publicSlugFromEnglishFirstLast(firstName, lastName) {
    const fn = String(firstName ?? '').trim();
    const ln = String(lastName ?? '').trim();
    if (!fn && !ln) return '';
    const combined = [fn, ln].filter(Boolean).join(' ');
    return sanitizePublicSlugSegment(artistSlugFromName(combined));
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

/**
 * Resolve a program “confirmed artist” list entry (name, slug-like token, or disambiguated slug) to a roster row.
 * @param {string} label
 * @param {Array<object>} artists
 * @returns {object | null}
 */
export function findArtistForConfirmedListLabel(label, artists) {
    if (!label || !Array.isArray(artists)) return null;
    const trimmed = String(label).trim();
    if (!trimmed) return null;

    const byName = findArtistByEnglishName(trimmed, artists);
    if (byName) return byName;

    const bySlug = findArtistBySlug(trimmed, artists);
    if (bySlug) return bySlug;

    const want = trimmed.toLowerCase();
    for (const a of artists) {
        if (!a || typeof a !== 'object') continue;
        const s = String(/** @type {Record<string, unknown>} */ (a).slug ?? '')
            .trim()
            .toLowerCase();
        if (!s) continue;
        if (s === want || s.startsWith(`${want}-`)) return a;
    }

    for (const a of artists) {
        if (!a || typeof a !== 'object') continue;
        const dn = String(artistDisplayName(a, 'en') ?? '')
            .trim()
            .toLowerCase();
        if (dn && dn === want) return a;
    }

    for (const a of artists) {
        const e = artistEnglishBlock(a);
        if (!e || typeof e !== 'object') continue;
        const fn = String(/** @type {Record<string, unknown>} */ (e).firstName ?? '').trim();
        const ln = String(/** @type {Record<string, unknown>} */ (e).lastName ?? '').trim();
        const joined = [fn, ln].filter(Boolean).join(' ').trim().toLowerCase();
        if (joined && joined === want) return a;
    }

    return null;
}

/**
 * Canonical program IDs are stored on the English locale block (`locales.en.programs`).
 * @param {object | null | undefined} artist
 * @returns {string[]}
 */
export function artistProgramIds(artist) {
    const en = artistEnglishBlock(artist);
    const rawEn = en && typeof en === 'object' ? /** @type {{ programs?: unknown }} */ (en).programs : null;
    if (Array.isArray(rawEn) && rawEn.length) {
        return rawEn.map((x) => String(x ?? '').trim()).filter(Boolean);
    }
    const ja =
        artist && typeof artist === 'object' && artist.locales && typeof artist.locales === 'object'
            ? /** @type {{ ja?: unknown }} */ (artist.locales).ja
            : null;
    const rawJa = ja && typeof ja === 'object' ? /** @type {{ programs?: unknown }} */ (ja).programs : null;
    if (!Array.isArray(rawJa)) return [];
    return rawJa.map((x) => String(x ?? '').trim()).filter(Boolean);
}

/**
 * Most recent program = last entry in `programs` (append-only ordering).
 * @param {object | null | undefined} artist
 * @returns {string}
 */
export function artistMostRecentProgramId(artist) {
    const ids = artistProgramIds(artist);
    return ids.length ? ids[ids.length - 1] : '';
}

/**
 * Best-effort year from a program slug (e.g. `fusion-residency-2025` → `2025`).
 * @param {string} programId
 * @returns {string}
 */
export function yearFromProgramSlug(programId) {
    const m = String(programId || '').match(/(19|20)\d{2}/);
    return m ? m[0] : '';
}

/**
 * Roster `galleryFilter.season` (calendar year for gallery access / cohort season).
 * @param {object | null | undefined} artist
 * @returns {number}
 */
export function artistGallerySeasonYear(artist) {
    if (!artist || typeof artist !== 'object') return 0;
    const g = /** @type {{ galleryFilter?: unknown }} */ (artist).galleryFilter;
    if (!g || typeof g !== 'object') return 0;
    const n = Number(/** @type {{ season?: unknown }} */ (g).season ?? 0);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Year label for cards / banners: program slug (most recent), else gallery season, else filter cohort year.
 * @param {object | null | undefined} artist
 * @returns {string}
 */
export function artistResidencyCardYear(artist) {
    const fromProg = yearFromProgramSlug(artistMostRecentProgramId(artist));
    if (fromProg) return fromProg;
    const sy = artistGallerySeasonYear(artist);
    if (sy) return String(sy);
    const f = artist && typeof artist === 'object' ? /** @type {{ filter?: unknown }} */ (artist).filter : null;
    const cy = primaryCohortYearFromFilter(f);
    if (cy > 0) return String(cy);
    return '';
}

/**
 * Whether the card/badge year label matches the site's current program season.
 * Compares 4-digit years (e.g. badge "2026" vs season `fusionKaga2026` or `2026`), then full `mostRecentProgram` vs `currentSeason` string.
 *
 * @param {string} badgeYearLabel — e.g. "2026"
 * @param {string} currentSeasonStr — value from `getCurrentProgramSeason()` (database.js)
 * @param {unknown} [mostRecentProgram] — roster `mostRecentProgram`
 * @returns {boolean}
 */
export function residencyBadgeMatchesCurrentSeason(
    badgeYearLabel,
    currentSeasonStr,
    mostRecentProgram,
) {
    const by = String(badgeYearLabel || '').trim();
    const cy = String(currentSeasonStr || '').trim();
    if (!cy) return false;
    if (by) {
        const seasonYear =
            yearFromProgramSlug(cy) ||
            (() => {
                const m = cy.match(/\b(19|20)\d{2}\b/);
                return m ? m[0] : '';
            })();
        if (seasonYear && by === seasonYear) return true;
    }
    const mrp = String(mostRecentProgram ?? '').trim().toLowerCase();
    const cur = cy.toLowerCase();
    return Boolean(mrp && cur && mrp === cur);
}

/**
 * Whether the artist should show residency UI (programs list and/or season/cohort on roster).
 * @param {object | null | undefined} artist
 */
export function artistHasResidencySignal(artist) {
    if (artistProgramIds(artist).length > 0) return true;
    if (artistGallerySeasonYear(artist) > 0) return true;
    const f = artist?.filter;
    return primaryCohortYearFromFilter(f) > 0;
}

/**
 * @param {unknown} f — roster `filter`
 * @returns {number}
 */
function primaryCohortYearFromFilter(f) {
    if (!f || typeof f !== 'object') return 0;
    const o = /** @type {Record<string, unknown>} */ (f);
    const arr = o.cohortYears ?? o.cohort_years;
    if (Array.isArray(arr) && arr.length) {
        const nums = arr.map((x) => Math.floor(Number(x))).filter((n) => Number.isFinite(n) && n > 0);
        if (nums.length) return Math.max(...nums);
    }
    const cy = Number(o.cohortYear ?? o.cohort_year ?? 0);
    return Number.isFinite(cy) && cy > 0 ? Math.floor(cy) : 0;
}
