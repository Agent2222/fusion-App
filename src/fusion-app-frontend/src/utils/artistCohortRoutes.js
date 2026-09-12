/**
 * Artists page cohort filters: program-name chips + shareable `/artists/:slug` routes.
 * Year-only chips stay for historical cohorts that have no program record.
 */
import {
    artistMostRecentProgramId,
    artistProgramIds,
    findArtistForConfirmedListLabel,
    sanitizePublicSlugSegment,
} from './artistSlug.js';
import { normalizeProgramId } from './programAlumniEligibility.js';
import { setArtistCardImageMode } from './artistCardImageMode.js';

/** First residency cohort held outside Kaga; leftover years before this default to Fusion Kaga. */
const FIRST_NON_KAGA_COHORT_YEAR = 2026;

/**
 * @param {unknown} artist
 * @returns {string[]}
 */
function enrolledProgramIds(artist) {
    /** @type {Set<string>} */
    const ids = new Set();
    for (const raw of artistProgramIds(artist)) {
        const id = normalizeProgramId(raw);
        if (id) ids.add(id);
    }
    const mrp = normalizeProgramId(
        artistMostRecentProgramId(artist) ||
            String(
                artist && typeof artist === 'object'
                    ? /** @type {{ mostRecentProgram?: unknown }} */ (artist).mostRecentProgram ?? ''
                    : '',
            ),
    );
    if (mrp) ids.add(mrp);
    return [...ids];
}

/**
 * @param {unknown} artist
 * @returns {number[]}
 */
function explicitCohortYears(artist) {
    const f = artist && typeof artist === 'object' ? /** @type {{ filter?: unknown }} */ (artist).filter : null;
    if (!f || typeof f !== 'object') return [];
    const o = /** @type {Record<string, unknown>} */ (f);
    let raw = o.cohort_years ?? o.cohortYears;
    if (Array.isArray(raw) && raw.length === 1 && Array.isArray(raw[0])) raw = raw[0];
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
 * @param {unknown} v
 * @returns {boolean}
 */
function isListedProgram(v) {
    const s = String(v ?? '').trim().toLowerCase();
    return s !== 'none' && s !== 'private';
}

/**
 * @param {string} [pathname]
 * @returns {string}
 */
export function normalizeArtistsPathname(pathname = '') {
    let p = String(pathname || '').split('?')[0].split('#')[0];
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p || '/';
}

/**
 * @param {string} [pathname]
 * @returns {boolean}
 */
export function isArtistsRoute(pathname = '') {
    const p = normalizeArtistsPathname(pathname);
    return p === '/artists' || p.startsWith('/artists/');
}

/**
 * @param {unknown} program
 * @returns {string}
 */
export function programFilterBrandLabel(program) {
    const rec = program && typeof program === 'object' ? /** @type {Record<string, unknown>} */ (program) : {};
    const id = String(rec.id ?? '').trim();
    const key = normalizeProgramId(id).toLowerCase();
    if (key.includes('kaga')) return 'Kaga';
    if (key.includes('tokyo')) return 'Tokyo';

    const rest = String(normalizeProgramId(id) || id).replace(/^fusion/i, '');
    const spaced = rest
        .replace(/([a-z\d])([A-Z])/g, '$1 $2')
        .replace(/(\d{4})$/g, '')
        .replace(/[-_]+/g, ' ')
        .trim();
    if (spaced) {
        return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
    }

    const location = String(rec.location ?? '').split(',')[0].trim();
    if (location) return location;
    return id || 'Program';
}

/**
 * @param {unknown} program
 * @returns {string}
 */
export function programFilterSlug(program) {
    const rec = program && typeof program === 'object' ? /** @type {Record<string, unknown>} */ (program) : {};
    const route = String(rec.routeLink ?? rec.route_link ?? '').trim();
    const fromRoute = route
        .replace(/^\/programs\//, '')
        .replace(/^\/program\//, '')
        .split('/')
        .filter(Boolean)[0];
    const routeSlug = sanitizePublicSlugSegment(fromRoute || '');
    const id = String(rec.id ?? '').trim();
    const kebab = id.replace(/([a-z\d])([A-Z])/g, '$1-$2').replace(/_/g, '-');
    const base = routeSlug || sanitizePublicSlugSegment(kebab);
    const year = String(rec.year ?? '').trim();
    if (year && base && !base.endsWith(year)) {
        return sanitizePublicSlugSegment(`${base}-${year}`);
    }
    return base;
}

/**
 * @param {unknown} program
 * @param {unknown[]} [allPrograms]
 * @returns {string}
 */
export function programFilterLabel(program, allPrograms = []) {
    const rec = program && typeof program === 'object' ? /** @type {Record<string, unknown>} */ (program) : {};
    const brand = programFilterBrandLabel(rec);
    const year = String(rec.year ?? '').trim();
    const id = normalizeProgramId(String(rec.id ?? ''));

    const peers = (Array.isArray(allPrograms) ? allPrograms : []).filter((p) => {
        if (!p || typeof p !== 'object') return false;
        const other = /** @type {Record<string, unknown>} */ (p);
        return programFilterBrandLabel(other) === brand;
    });

    if (peers.length > 1 && year) return `${brand} ${year}`;
    if (year && peers.length <= 1) {
        const years = new Set(
            (Array.isArray(allPrograms) ? allPrograms : []).map((p) =>
                String(/** @type {Record<string, unknown>} */ (p)?.year ?? '').trim(),
            ),
        );
        if (years.size > 1) return `${brand} ${year}`;
    }

    const sameYearBrand = peers.filter(
        (p) => String(/** @type {Record<string, unknown>} */ (p).year ?? '').trim() === year,
    );
    if (sameYearBrand.length > 1 && year) {
        return `${brand} ${year}`;
    }

    if (year && id) return `${brand} ${year}`;
    return brand;
}

/**
 * @param {unknown[]} [programs]
 * @returns {object[]}
 */
export function publicProgramsForArtistFilter(programs = []) {
    return (Array.isArray(programs) ? programs : []).filter((p) => {
        if (!p || typeof p !== 'object') return false;
        const rec = /** @type {Record<string, unknown>} */ (p);
        if (!String(rec.id ?? '').trim()) return false;
        return isListedProgram(rec.visibility);
    });
}

/**
 * @typedef {{
 *   kind: 'program' | 'year',
 *   id: string,
 *   slug: string,
 *   label: string,
 *   href: string,
 *   chipId: string,
 *   year?: string,
 *   program?: object,
 * }} ArtistCohortFilterOption
 */

/**
 * @param {{ programs?: unknown[], artists?: unknown[] }} [opts]
 * @returns {ArtistCohortFilterOption[]}
 */
export function buildArtistCohortFilterOptions(opts = {}) {
    const programs = publicProgramsForArtistFilter(opts.programs);
    const artists = Array.isArray(opts.artists) ? opts.artists : [];
    /** @type {ArtistCohortFilterOption[]} */
    const options = [];
    /** @type {Set<string>} */
    const slugs = new Set();
    /** @type {Set<string>} */
    const yearsCoveredByProgram = new Set();

    for (const program of programs) {
        const rec = /** @type {Record<string, unknown>} */ (program);
        let slug = programFilterSlug(rec);
        if (!slug) continue;
        if (slugs.has(slug)) {
            const year = String(rec.year ?? '').trim();
            const withYear = year ? sanitizePublicSlugSegment(`${slug}-${year}`) : '';
            slug = withYear && !slugs.has(withYear) ? withYear : sanitizePublicSlugSegment(`${slug}-${rec.id}`);
        }
        if (!slug || slugs.has(slug)) continue;
        slugs.add(slug);
        const year = String(rec.year ?? '').trim();
        if (year) yearsCoveredByProgram.add(year);
        options.push({
            kind: 'program',
            id: normalizeProgramId(String(rec.id ?? '')),
            slug,
            label: programFilterLabel(rec, programs),
            href: `/artists/${slug}`,
            chipId: `programConnection-${slug}`,
            year,
            program,
        });
    }

    /** @type {Set<number>} */
    const leftoverYears = new Set();
    for (const artist of artists) {
        for (const y of explicitCohortYears(artist)) leftoverYears.add(y);
    }
    for (const year of [...leftoverYears].sort((a, b) => a - b)) {
        const yearStr = String(year);
        if (yearsCoveredByProgram.has(yearStr)) continue;
        const slug = yearStr;
        if (slugs.has(slug)) continue;
        slugs.add(slug);
        const label =
            year < FIRST_NON_KAGA_COHORT_YEAR ? `Kaga ${yearStr}` : yearStr;
        options.push({
            kind: 'year',
            id: yearStr,
            slug,
            label,
            href: `/artists/${slug}`,
            chipId: `${yearStr}CohortConnection`,
            year: yearStr,
        });
    }

    return options;
}

/**
 * @param {string} [pathname]
 * @returns {{ slug: string } | null}
 */
export function parseArtistsCohortPath(pathname = '') {
    const p = normalizeArtistsPathname(pathname);
    if (p === '/artists') return null;
    if (!p.startsWith('/artists/')) return null;
    const slug = sanitizePublicSlugSegment(p.slice('/artists/'.length).split('/').filter(Boolean)[0] || '');
    return slug ? { slug } : null;
}

/**
 * Cohort routes (`/artists/:slug`) show profile/headshot cards instead of artwork.
 * @param {string} [pathname]
 * @returns {boolean} true when a cohort path forced profile mode
 */
export function applyProfileCardModeForCohortPath(pathname = '') {
    if (!parseArtistsCohortPath(pathname)) return false;
    setArtistCardImageMode('profile');
    return true;
}

/**
 * @param {ArtistCohortFilterOption[]} options
 * @param {string} [pathname]
 * @returns {ArtistCohortFilterOption | null}
 */
export function matchArtistCohortOption(options, pathname = '') {
    const parsed = parseArtistsCohortPath(pathname);
    if (!parsed) return null;
    return (options || []).find((o) => o.slug === parsed.slug) || null;
}

/**
 * @param {unknown} artist
 * @param {unknown} program
 * @returns {boolean}
 */
export function artistMatchesProgram(artist, program) {
    if (!artist || !program || typeof program !== 'object') return false;
    const rec = /** @type {Record<string, unknown>} */ (program);
    const pid = normalizeProgramId(String(rec.id ?? ''));
    if (!pid) return false;

    const enrolled = enrolledProgramIds(artist);
    if (enrolled.includes(pid)) return true;

    const pp =
        rec.programPage && typeof rec.programPage === 'object'
            ? /** @type {Record<string, unknown>} */ (rec.programPage)
            : {};
    const confirmed = Array.isArray(pp.confirmedArtists) ? pp.confirmedArtists : [];
    for (const entry of confirmed) {
        const label = typeof entry === 'string' ? entry.trim() : String(entry?.name ?? '').trim();
        if (!label) continue;
        if (findArtistForConfirmedListLabel(label, [artist])) return true;
    }
    return false;
}

/**
 * @param {unknown} artist
 * @param {ArtistCohortFilterOption | null | undefined} option
 * @returns {boolean}
 */
export function artistMatchesCohortOption(artist, option) {
    if (!option) return true;
    if (option.kind === 'program') {
        return artistMatchesProgram(artist, option.program);
    }
    const year = Number(option.year || option.id);
    if (!Number.isFinite(year)) return false;
    return explicitCohortYears(artist).includes(year);
}

/**
 * @param {string} [connectionId]
 * @param {ArtistCohortFilterOption[]} [options]
 * @returns {ArtistCohortFilterOption | null}
 */
export function cohortOptionFromConnectionId(connectionId = '', options = []) {
    const id = String(connectionId || '');
    if (id.startsWith('programConnection-')) {
        const slug = id.slice('programConnection-'.length);
        return options.find((o) => o.kind === 'program' && o.slug === slug) || null;
    }
    const yearMatch = /^(\d{4})CohortConnection$/.exec(id);
    if (yearMatch) {
        return (
            options.find((o) => o.kind === 'year' && o.slug === yearMatch[1]) || {
                kind: 'year',
                id: yearMatch[1],
                slug: yearMatch[1],
                label: yearMatch[1],
                href: `/artists/${yearMatch[1]}`,
                chipId: id,
                year: yearMatch[1],
            }
        );
    }
    return null;
}
