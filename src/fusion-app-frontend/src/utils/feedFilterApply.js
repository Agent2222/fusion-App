/**
 * Filter logic for `app-feed-filter`: aligns with button ids in `feed-filter.js`
 * and optional `filter` / `galleryFilter` objects on testData; otherwise derives
 * stable values from artist id + English locale fields.
 */
import { artistEnglishBlock } from './artistSlug.js';

/** @param {string} id */
function stableHash(id) {
    let h = 0;
    const s = String(id || '');
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}

const COHORT_YEARS = [2017, 2018, 2019, 2024, 2025, 2026];

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
    if (!s) return 'other';
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
    return 'other';
}

/**
 * @param {string} buttonId e.g. `sculptureDiscipline`
 * @returns {string} e.g. `sculpture`
 */
export function disciplineButtonIdToKey(buttonId) {
    const id = String(buttonId || '');
    if (id === 'allDiscipline') return 'all';
    return id.replace(/Discipline$/, '');
}

/**
 * @param {object} artist
 * @returns {{ connection: 'alumni'|'artist', cohortYear: number, disciplineKey: string, locationKey: string }}
 */
export function deriveArtistFilterRow(artist) {
    if (artist?.filter && typeof artist.filter === 'object') {
        const f = artist.filter;
        return {
            connection: f.connection === 'alumni' ? 'alumni' : 'artist',
            cohortYear: typeof f.cohortYear === 'number' ? f.cohortYear : COHORT_YEARS[stableHash(artist.id) % COHORT_YEARS.length],
            disciplineKey: f.disciplineKey || disciplineStringToKey(artistEnglishBlock(artist)?.discipline),
            locationKey: f.locationKey || 'other',
        };
    }
    const h = stableHash(artist?.id || '');
    const cohortYear = COHORT_YEARS[h % COHORT_YEARS.length];
    const connection = h % 5 === 0 ? 'alumni' : 'artist';
    const en = artistEnglishBlock(artist);
    const disciplineKey = disciplineStringToKey(en?.discipline);
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
    return { connection, cohortYear, disciplineKey, locationKey };
}

/**
 * @param {object[]} artists
 * @param {{ connectionId: string, disciplineKeys?: string[], disciplineId?: string, locationKey: string }} c
 */
export function applyArtistFilters(artists, c) {
    if (!Array.isArray(artists)) return [];
    const connectionId = c.connectionId || 'allConnection';
    const locationKey = c.locationKey || 'all';

    /** @type {string[]} */
    let disciplineKeys = Array.isArray(c.disciplineKeys) ? c.disciplineKeys.filter(Boolean) : [];
    if (disciplineKeys.length === 0 && c.disciplineId && c.disciplineId !== 'allDiscipline') {
        const one = disciplineButtonIdToKey(c.disciplineId);
        if (one && one !== 'all') disciplineKeys = [one];
    }

    return artists.filter((a) => {
        const m = deriveArtistFilterRow(a);
        if (locationKey !== 'all' && m.locationKey !== locationKey) return false;

        if (disciplineKeys.length > 0) {
            if (!disciplineKeys.includes(m.disciplineKey)) return false;
        }

        if (connectionId !== 'allConnection') {
            if (connectionId === 'alumniConnection' && m.connection !== 'alumni') return false;
            if (connectionId === 'userConnection' && m.connection !== 'artist') return false;
            const cm = /^(\d{4})CohortConnection$/.exec(connectionId);
            if (cm) {
                const y = Number(cm[1]);
                if (m.cohortYear !== y) return false;
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
 * @param {{ locationKey: string, seasonId: string, viewId: string }} c
 */
export function applyGalleryAccessFilters(artists, c) {
    if (!Array.isArray(artists)) return [];
    const locationKey = c.locationKey || 'all';
    const seasonId = c.seasonId || 'allGallerySeason';
    const viewId = c.viewId || 'allGalleryView';

    return artists.filter((a) => {
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
 * @param {{ yearId: string, formatId: string, categoryKeys?: string[], categoryKey?: string }} c
 */
export function applyEditionFilters(items, c) {
    if (!Array.isArray(items)) return [];
    const yearId = c.yearId || 'allEditionYears';
    const formatId = c.formatId || 'allEditionFormats';

    /** @type {string[]} */
    let categoryKeys = Array.isArray(c.categoryKeys) ? c.categoryKeys.filter(Boolean) : [];
    if (categoryKeys.length === 0 && c.categoryKey && c.categoryKey !== 'all') {
        categoryKeys = [c.categoryKey];
    }

    return items.filter((item) => {
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

