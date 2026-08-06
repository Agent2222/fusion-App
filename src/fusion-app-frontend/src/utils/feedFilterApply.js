/**
 * Filter logic for `app-feed-filter`: aligns with button ids in `feed-filter.js`
 * and optional `filter` / `galleryFilter` objects on testData; otherwise derives
 * stable values from artist id + English locale fields.
 */
import { artistEnglishBlock, artistSlugFromName, publicSlugFromEnglishFirstLast } from './artistSlug.js';

/** @param {string} id */
function stableHash(id) {
    let h = 0;
    const s = String(id || '');
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}

const COHORT_YEARS = [2017, 2018, 2019, 2024, 2025, 2026];

export const DISCIPLINE_OPTIONS = [
    { key: 'sculpture', label: 'Sculpture' },
    { key: 'painting', label: 'Painting' },
    { key: 'installation', label: 'Installation' },
    { key: 'performance', label: 'Performance' },
    { key: 'video', label: 'Film/Video' },
    { key: 'performanceArt', label: 'Performance Art' },
    { key: 'sound', label: 'Sound' },
    { key: 'illustration', label: 'Illustration' },
    { key: 'photography', label: 'Photography' },
    { key: 'mixedMedia', label: 'Mixed Media' },
    { key: 'interdisciplinary', label: 'Interdisciplinary' },
];

/** @param {string} key */
export function normalizeDisciplineKey(key) {
    const k = String(key || '').trim();
    if (k === 'other') return 'interdisciplinary';
    return k;
}

/** @param {string} key */
export function disciplineKeyToLabel(key) {
    const k = normalizeDisciplineKey(key);
    return DISCIPLINE_OPTIONS.find((o) => o.key === k)?.label || 'Interdisciplinary';
}

/** @param {string} labelOrKey */
export function disciplineLabelToKey(labelOrKey) {
    const s = String(labelOrKey || '').trim();
    if (!s) return '';
    const normalized = normalizeDisciplineKey(s);
    const byKey = DISCIPLINE_OPTIONS.find((o) => o.key === normalized);
    if (byKey) return byKey.key;
    const byLabel = DISCIPLINE_OPTIONS.find((o) => o.label.toLowerCase() === s.toLowerCase());
    if (byLabel) return byLabel.key;
    return disciplineStringToKey(s);
}

/**
 * @param {object} artist
 * @returns {string}
 */
export function artistProfileSlug(artist) {
    if (!artist || typeof artist !== 'object') return '';
    const slug = artist.slug != null ? String(artist.slug).trim() : '';
    if (slug) return slug;
    const en = artistEnglishBlock(artist);
    const fromParts = publicSlugFromEnglishFirstLast(en?.firstName, en?.lastName);
    if (fromParts) return fromParts;
    return artistSlugFromName(en?.name || '');
}

/**
 * @param {object} artist
 * @param {string} query
 * @returns {boolean}
 */
function artistMatchesNameQuery(artist, query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return true;
    const en = artistEnglishBlock(artist);
    const name = String(en?.name || '').toLowerCase();
    const slug = artistProfileSlug(artist).toLowerCase();
    return name.includes(q) || slug.includes(q);
}

/**
 * @param {unknown} artist
 * @returns {boolean}
 */
export function artistIsDrawRecipient(artist) {
    if (!artist || typeof artist !== 'object') return false;
    const o = /** @type {Record<string, unknown>} */ (artist);
    return Boolean(o.drawRecipient ?? o.draw_recipient);
}

/**
 * @param {object[]} artists
 * @returns {{ locationKeys: string[], disciplineKeys: string[], connectionIds: string[], cohortYears: number[] }}
 */
export function buildArtistFilterAvailability(artists) {
    /** @type {Set<string>} */
    const locationKeys = new Set();
    /** @type {Set<string>} */
    const disciplineKeys = new Set();
    /** @type {Set<string>} */
    const connectionIds = new Set();
    /** @type {Set<number>} */
    const cohortYears = new Set();
    let hasDrawRecipients = false;

    for (const a of artists || []) {
        const m = deriveArtistFilterRow(a);
        if (m.locationKey) locationKeys.add(m.locationKey);
        if (m.disciplineKey) disciplineKeys.add(m.disciplineKey);
        connectionIds.add(m.connection === 'alumni' ? 'alumniConnection' : 'userConnection');
        for (const y of m.cohortYears) cohortYears.add(y);
        if (artistIsDrawRecipient(a)) hasDrawRecipients = true;
    }
    if (hasDrawRecipients) connectionIds.add('drawRecipientsConnection');

    return {
        locationKeys: [...locationKeys].sort(),
        disciplineKeys: [...disciplineKeys].sort(),
        connectionIds: [...connectionIds],
        cohortYears: [...cohortYears].sort((a, b) => a - b),
    };
}

/**
 * @param {object[]} items
 * @returns {{ categoryKeys: string[], yearIds: string[], formatIds: string[] }}
 */
export function buildEditionFilterAvailability(items) {
    /** @type {Set<string>} */
    const categoryKeys = new Set();
    /** @type {Set<string>} */
    const yearIds = new Set();
    /** @type {Set<string>} */
    const formatIds = new Set();

    const formatToId = {
        print: 'formatPrint',
        multiple: 'formatMultiple',
        book: 'formatBook',
        object: 'formatObject',
        digital: 'formatDigital',
        other: 'formatOther',
    };

    for (const item of items || []) {
        const m = deriveEditionFilterRow(item);
        if (m.category) categoryKeys.add(m.category);
        if (m.year === 'archive') yearIds.add('editionArchive');
        else if (typeof m.year === 'number') yearIds.add(`edition${m.year}`);
        const fid = formatToId[m.format];
        if (fid) formatIds.add(fid);
    }

    return {
        categoryKeys: [...categoryKeys].sort(),
        yearIds: [...yearIds].sort(),
        formatIds: [...formatIds].sort(),
    };
}

/**
 * @param {object[]} artists
 * @returns {{ locationKeys: string[], seasonIds: string[], viewIds: string[] }}
 */
export function buildGalleryFilterAvailability(artists) {
    /** @type {Set<string>} */
    const locationKeys = new Set();
    /** @type {Set<string>} */
    const seasonIds = new Set();
    /** @type {Set<string>} */
    const viewIds = new Set();

    const viewToId = {
        preview: 'galleryPreview',
        opening: 'galleryOpening',
        archive: 'galleryArchive',
    };

    for (const a of artists || []) {
        const m = deriveGalleryAccessRow(a);
        if (m.locationKey) locationKeys.add(m.locationKey);
        seasonIds.add(`gallery${m.season}`);
        const vid = viewToId[m.view];
        if (vid) viewIds.add(vid);
    }

    return {
        locationKeys: [...locationKeys].sort(),
        seasonIds: [...seasonIds].sort(),
        viewIds: [...viewIds].sort(),
    };
}

/**
 * @param {string} key
 * @returns {string}
 */
export function locationKeyToLabel(key) {
    return ARTIST_LOCATION_OPTIONS.find((o) => o.key === key)?.label || key;
}

/**
 * Map English discipline line to filter slug (matches *Discipline button ids without suffix).
 * @param {string | undefined} d
 * @returns {string}
 */
export function disciplineStringToKey(d) {
    const s = String(d || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/\s+/g, ' ')
        .trim();
    if (!s) return 'interdisciplinary';
    if (s.includes('sculpt')) return 'sculpture';
    if (s.includes('paint')) return 'painting';
    if (s.includes('install')) return 'installation';
    if (s.includes('performance') && s.includes('art')) return 'performanceArt';
    if (s.includes('perform')) return 'performance';
    if (s.includes('film') || s.includes('video')) return 'video';
    if (s.includes('sound') || s.includes('サウンド')) return 'sound';
    if (s.includes('illustrat')) return 'illustration';
    if (s.includes('photo') || s.includes('写真')) return 'photography';
    if (s.includes('mixed') || s.includes('複合')) return 'mixedMedia';
    if (s.includes('interdisciplin')) return 'interdisciplinary';
    return 'interdisciplinary';
}

/**
 * @param {string} buttonId e.g. `sculptureDiscipline`
 * @returns {string} e.g. `sculpture`
 */
export function disciplineButtonIdToKey(buttonId) {
    const id = String(buttonId || '');
    if (id === 'allDiscipline') return 'all';
    return normalizeDisciplineKey(id.replace(/Discipline$/, ''));
}

/**
 * Cohort years stored on the artist roster — never hash-derived placeholders.
 * @param {unknown} f
 * @returns {number[]}
 */
export function explicitCohortYearsFromFilter(f) {
    return cohortYearsFromFilterObject(f);
}

/**
 * @param {object} artist
 * @returns {number[]}
 */
export function explicitArtistCohortYears(artist) {
    if (artist?.filter && typeof artist.filter === 'object') {
        return explicitCohortYearsFromFilter(artist.filter);
    }
    return [];
}

/**
 * @param {unknown} f
 * @returns {number[]}
 */
function cohortYearsFromFilterObject(f) {
    if (!f || typeof f !== 'object') return [];
    const o = /** @type {Record<string, unknown>} */ (f);
    let raw = o.cohort_years ?? o.cohortYears;
    /** Unwrap Motoko `?[Nat]` when Candid encodes `Some` as a single-element wrapper */
    if (Array.isArray(raw) && raw.length === 1 && Array.isArray(raw[0])) {
        raw = raw[0];
    }
    if (Array.isArray(raw)) {
        return raw
            .map((x) => Math.floor(Number(x)))
            .filter((n) => Number.isFinite(n) && n > 1900 && n < 2100);
    }
    const legacy = Number(o.cohort_year ?? o.cohortYear ?? 0);
    if (Number.isFinite(legacy) && legacy > 0) return [Math.floor(legacy)];
    return [];
}

/**
 * @param {object} artist
 * @returns {{ connection: 'alumni'|'artist', cohortYears: number[], disciplineKey: string, locationKey: string }}
 */
export function deriveArtistFilterRow(artist) {
    if (artist?.filter && typeof artist.filter === 'object') {
        const f = artist.filter;
        let cohortYears = cohortYearsFromFilterObject(f);
        if (cohortYears.length === 0) {
            cohortYears = [COHORT_YEARS[stableHash(artist.id) % COHORT_YEARS.length]];
        }
        return {
            connection: f.connection === 'alumni' ? 'alumni' : 'artist',
            cohortYears,
            disciplineKey: normalizeDisciplineKey(
                f.disciplineKey || disciplineStringToKey(artistEnglishBlock(artist)?.discipline)
            ),
            locationKey: f.locationKey || 'other',
        };
    }
    const h = stableHash(artist?.id || '');
    const cohortYears = [COHORT_YEARS[h % COHORT_YEARS.length]];
    const connection = h % 5 === 0 ? 'alumni' : 'artist';
    const en = artistEnglishBlock(artist);
    const disciplineKey = normalizeDisciplineKey(disciplineStringToKey(en?.discipline));
    const country = String(en?.location?.country || '').toLowerCase();
    let locationKey = 'other';
    if (country.includes('united states') || country === 'us') locationKey = 'us';
    else if (country.includes('japan')) locationKey = 'japan';
    else if (country.includes('united kingdom') || country === 'uk') locationKey = 'uk';
    else if (country.includes('canada')) locationKey = 'canada';
    else if (
        country.includes('belgium') ||
        country.includes('france') ||
        country.includes('germany') ||
        country.includes('netherlands')
    ) {
        locationKey = 'europe';
    }
    return { connection, cohortYears, disciplineKey, locationKey };
}

/**
 * @param {object[]} artists
 * @param {{ connectionId: string, disciplineKeys?: string[], disciplineId?: string, locationKey: string, nameQuery?: string }} c
 */
export function applyArtistFilters(artists, c) {
    if (!Array.isArray(artists)) return [];
    const connectionId = c.connectionId || 'allConnection';
    const locationKey = c.locationKey || 'all';
    const nameQuery = c.nameQuery || '';

    /** @type {string[]} */
    let disciplineKeys = Array.isArray(c.disciplineKeys) ? c.disciplineKeys.filter(Boolean) : [];
    if (disciplineKeys.length === 0 && c.disciplineId && c.disciplineId !== 'allDiscipline') {
        const one = disciplineButtonIdToKey(c.disciplineId);
        if (one && one !== 'all') disciplineKeys = [one];
    }

    return artists.filter((a) => {
        if (!artistMatchesNameQuery(a, nameQuery)) return false;

        const m = deriveArtistFilterRow(a);
        if (locationKey !== 'all' && m.locationKey !== locationKey) return false;

        if (disciplineKeys.length > 0) {
            const normalized = disciplineKeys.map(normalizeDisciplineKey);
            if (!normalized.includes(m.disciplineKey)) return false;
        }

        if (connectionId !== 'allConnection') {
            if (connectionId === 'drawRecipientsConnection') {
                return artistIsDrawRecipient(a);
            }
            if (connectionId === 'alumniConnection' && m.connection !== 'alumni') return false;
            if (connectionId === 'userConnection' && m.connection !== 'artist') return false;
            const cm = /^(\d{4})CohortConnection$/.exec(connectionId);
            if (cm) {
                const y = Number(cm[1]);
                if (!m.cohortYears.includes(y)) return false;
            }
        }
        return true;
    });
}

/**
 * Gallery access row: **location** matches artists (`deriveArtistFilterRow`); season/view from `galleryFilter` or status.
 * @param {object} artist
 */
export function deriveGalleryAccessRow(artist) {
    const { locationKey } = deriveArtistFilterRow(artist);

    if (artist?.galleryFilter && typeof artist.galleryFilter === 'object') {
        const g = artist.galleryFilter;
        return {
            locationKey,
            season: typeof g.season === 'number' ? g.season : 2025,
            view: ['preview', 'opening', 'archive'].includes(g.view) ? g.view : 'preview',
        };
    }
    const h = stableHash(artist?.id || '');
    const seasons = [2024, 2025, 2026];
    const season = seasons[h % 3];
    const en = artistEnglishBlock(artist);
    const st = en?.status;
    let view = 'preview';
    if (st === 'studio') view = 'opening';
    else if (st === 'showing') view = 'archive';
    else if (st === 'prep') view = 'preview';
    return { locationKey, season, view };
}

/**
 * @param {object[]} artists
 * @param {{ locationKey: string, seasonId: string, viewId: string, nameQuery?: string }} c
 */
export function applyGalleryAccessFilters(artists, c) {
    if (!Array.isArray(artists)) return [];
    const locationKey = c.locationKey || 'all';
    const seasonId = c.seasonId || 'allGallerySeason';
    const viewId = c.viewId || 'allGalleryView';
    const nameQuery = c.nameQuery || '';

    return artists.filter((a) => {
        if (!artistMatchesNameQuery(a, nameQuery)) return false;

        const m = deriveGalleryAccessRow(a);
        if (locationKey !== 'all' && m.locationKey !== locationKey) return false;
        if (seasonId !== 'allGallerySeason') {
            const y = Number(String(seasonId).replace(/\D/g, ''));
            if (Number.isFinite(y) && m.season !== y) return false;
        }
        if (viewId !== 'allGalleryView') {
            if (viewId === 'galleryPreview' && m.view !== 'preview') return false;
            if (viewId === 'galleryOpening' && m.view !== 'opening') return false;
            if (viewId === 'galleryArchive' && m.view !== 'archive') return false;
        }
        return true;
    });
}

/**
 * Edition item: uses `filter.year`, `filter.format`, `filter.category` when present.
 * @param {object} item
 */
export function deriveEditionFilterRow(item) {
    const f = item?.filter && typeof item.filter === 'object' ? item.filter : {};
    const h = stableHash(item?.href || item?.en?.title || '');
    const yearBucket = [2024, 2025, 2026, 'archive'];
    const formats = ['print', 'multiple', 'book', 'object', 'digital', 'other'];
    const categories = ['series', 'monograph', 'portfolio', 'other'];
    let year;
    if (f.year === 'archive') year = 'archive';
    else if (typeof f.year === 'number') year = f.year;
    else year = yearBucket[h % yearBucket.length];
    return {
        year,
        format: formats.includes(f.format) ? f.format : formats[h % formats.length],
        category: categories.includes(f.category) ? f.category : categories[h % categories.length],
    };
}

/**
 * @param {object[]} items
 * @param {{ yearId: string, formatId: string, categoryKeys?: string[], categoryKey?: string, titleQuery?: string }} c
 */
export function applyEditionFilters(items, c) {
    if (!Array.isArray(items)) return [];
    const yearId = c.yearId || 'allEditionYears';
    const formatId = c.formatId || 'allEditionFormats';
    const titleQuery = String(c.titleQuery || '').trim().toLowerCase();

    /** @type {string[]} */
    let categoryKeys = Array.isArray(c.categoryKeys) ? c.categoryKeys.filter(Boolean) : [];
    if (categoryKeys.length === 0 && c.categoryKey && c.categoryKey !== 'all') {
        categoryKeys = [c.categoryKey];
    }

    return items.filter((item) => {
        if (titleQuery) {
            const title = String(item?.en?.title || item?.title || '').toLowerCase();
            if (!title.includes(titleQuery)) return false;
        }

        const m = deriveEditionFilterRow(item);
        if (categoryKeys.length > 0) {
            if (!categoryKeys.includes(m.category)) return false;
        }

        if (yearId !== 'allEditionYears') {
            if (yearId === 'editionArchive') {
                if (m.year !== 'archive') return false;
            } else {
                const y = Number(String(yearId).replace(/\D/g, ''));
                if (Number.isFinite(y) && m.year !== y) return false;
            }
        }

        if (formatId !== 'allEditionFormats') {
            const map = {
                formatPrint: 'print',
                formatMultiple: 'multiple',
                formatBook: 'book',
                formatObject: 'object',
                formatDigital: 'digital',
                formatOther: 'other',
            };
            const want = map[formatId];
            if (want && m.format !== want) return false;
        }
        return true;
    });
}

export const ARTIST_LOCATION_OPTIONS = [
    { key: 'all', label: 'All Locations' },
    { key: 'us', label: 'United States' },
    { key: 'japan', label: 'Japan' },
    { key: 'uk', label: 'United Kingdom' },
    { key: 'canada', label: 'Canada' },
    { key: 'europe', label: 'Europe' },
    { key: 'other', label: 'Other' },
];

export const EDITION_CATEGORY_OPTIONS = [
    { key: 'all', label: 'All Categories' },
    { key: 'series', label: 'Series' },
    { key: 'monograph', label: 'Monograph' },
    { key: 'portfolio', label: 'Portfolio' },
    { key: 'other', label: 'Other' },
];

