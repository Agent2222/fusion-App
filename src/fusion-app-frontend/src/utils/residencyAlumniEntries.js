import {
    artistDisplayName,
    artistGallerySeasonYear,
    artistProgramIds,
    findArtistForConfirmedListLabel,
} from './artistSlug.js';
import { explicitArtistCohortYears } from './feedFilterApply.js';
import {
    normalizeProgramId,
    parseProgramEndDate,
    parseProgramStartDate,
    programIsUpcomingForAlumniTable,
    programQualifiesForAlumniTable,
} from './programAlumniEligibility.js';

/**
 * @param {string} label
 * @returns {string}
 */
export function stripResidencyFromLabel(label) {
    return String(label || '')
        .replace(/\bresidency\b/gi, '')
        .replace(/\s+/g, ' ')
        .replace(/\s·\s*$/, '')
        .trim();
}

/** @type {Set<string>} */
const LOCATION_COUNTRY_TOKENS = new Set([
    'japan',
    'usa',
    'us',
    'united states',
    'uk',
    'united kingdom',
    'canada',
]);

/**
 * @param {string} location
 * @returns {string}
 */
function cityFromLocation(location) {
    const parts = String(location || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0];
    const last = parts[parts.length - 1].toLowerCase();
    if (LOCATION_COUNTRY_TOKENS.has(last)) {
        return parts[0];
    }
    return parts[parts.length - 1];
}

/**
 * @param {string} id
 * @param {string} year
 * @returns {string}
 */
function labelFromProgramId(id, year) {
    const raw = String(id || '').trim();
    const m = raw.match(/^fusion([A-Za-z]+?)(\d{4})?$/i);
    if (!m) return '';
    const place = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
    const y = year || m[2] || '';
    return y ? `Fusion ${place} ${y}` : `Fusion ${place}`;
}

/**
 * @param {Record<string, unknown>} prog
 * @param {Record<string, unknown>} [pp]
 * @returns {string}
 */
export function alumniProgramColumnLabel(prog, pp = {}) {
    const name = String(prog.name ?? prog.programName ?? '').trim();
    if (name) return stripResidencyFromLabel(name);

    const year = String(prog.year ?? '').trim();
    const fromId = labelFromProgramId(String(prog.id ?? ''), year);
    if (fromId) return stripResidencyFromLabel(fromId);

    const city = cityFromLocation(prog.location);
    if (city && year) return `Fusion ${city} ${year}`;
    if (city) return `Fusion ${city}`;

    const loc = String(prog.location ?? '').trim();
    const focus = String(prog.focus ?? '').trim();
    const headline = String(pp.headline ?? '').trim();
    return stripResidencyFromLabel(loc || focus || headline || String(prog.id ?? 'Program'));
}

/**
 * @param {Record<string, unknown>} prog
 * @returns {boolean}
 */
export function isUpcomingResidencyProgram(prog) {
    return programIsUpcomingForAlumniTable(prog);
}

/**
 * @param {Record<string, unknown>} prog
 * @returns {boolean}
 */
export function isPastResidencyProgram(prog) {
    return programQualifiesForAlumniTable(prog);
}

function parseYearFromProgram(rec) {
    const y = Number(rec.year);
    if (Number.isFinite(y) && y > 1900 && y < 2100) return Math.floor(y);
    const fromId = String(rec.id ?? '').match(/\b(19|20)\d{2}\b/);
    if (fromId) return Number(fromId[0]);

    const startDate = String(rec.startDate ?? rec.start ?? '').trim();
    const endDate = String(rec.endDate ?? rec.end ?? '').trim();
    const year = String(rec.year ?? '').trim();
    const end = endDate ? parseProgramEndDate(endDate, startDate, year) : null;
    if (end && !Number.isNaN(end.getTime())) return end.getFullYear();
    const start = startDate ? parseProgramStartDate(startDate, year) : null;
    if (start && !Number.isNaN(start.getTime())) return start.getFullYear();
    return 0;
}

/**
 * @param {string} label
 * @returns {number}
 */
export function parseRecencyYearFromAlumniLabel(label) {
    const matches = String(label || '').match(/\b(19|20)\d{2}\b/g);
    if (!matches?.length) return 0;
    return Math.max(...matches.map((y) => Number(y)).filter((n) => Number.isFinite(n)));
}

/**
 * @param {Record<string, unknown>} prog
 * @returns {boolean}
 */
export function isAlumniTableProgram(prog) {
    return !programIsUpcomingForAlumniTable(prog);
}

/**
 * @param {object} artist
 * @returns {string[]}
 */
export function collectArtistProgramIds(artist) {
    /** @type {Set<string>} */
    const ids = new Set();
    for (const raw of artistProgramIds(artist)) {
        const id = normalizeProgramId(raw);
        if (id) ids.add(id);
    }
    const mrp = normalizeProgramId(
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
 * @param {object} artist
 * @param {string[]} programIds — normalized program ids
 * @returns {boolean}
 */
export function artistEnrolledInProgramIds(artist, programIds) {
    const enrolled = collectArtistProgramIds(artist);
    return programIds.some((id) => enrolled.includes(id));
}

/**
 * @param {object} artist
 * @param {object[]} programs
 * @param {Set<string>} upcomingIds
 * @returns {boolean}
 */
export function isArtistOnUpcomingConfirmedRoster(artist, programs, upcomingIds) {
    for (const prog of programs) {
        const rec = /** @type {Record<string, unknown>} */ (prog);
        const id = normalizeProgramId(String(rec.id ?? ''));
        if (!id || !upcomingIds.has(id)) continue;
        const pp =
            rec.programPage && typeof rec.programPage === 'object'
                ? /** @type {Record<string, unknown>} */ (rec.programPage)
                : {};
        const confirmed = Array.isArray(pp.confirmedArtists) ? pp.confirmedArtists : [];
        for (const entry of confirmed) {
            const label =
                typeof entry === 'string' ? entry.trim() : String(entry?.name ?? '').trim();
            if (!label) continue;
            if (findArtistForConfirmedListLabel(label, [artist])) return true;
        }
    }
    return false;
}

/**
 * Whether the artist belongs to a program run that has not started yet.
 * @param {object} artist
 * @param {object[]} programs
 * @param {Set<string>} upcomingIds
 * @param {string} [currentProgramSeason]
 * @returns {boolean}
 */
export function isArtistInUpcomingCohort(
    artist,
    programs,
    upcomingIds,
    currentProgramSeason = '',
) {
    const enrolled = collectArtistProgramIds(artist);
    if (enrolled.some((id) => upcomingIds.has(id))) return true;

    const season = normalizeProgramId(currentProgramSeason);
    if (season && upcomingIds.has(season) && enrolled.includes(season)) return true;

    return isArtistOnUpcomingConfirmedRoster(artist, programs, upcomingIds);
}

/** First residency cohort held outside Kaga; all prior years default to Fusion Kaga. */
export const FIRST_NON_KAGA_COHORT_YEAR = 2026;

/**
 * Whether an artist may be placed via cohort-year fallback (not confirmed/enrollment paths).
 * @param {object} artist
 * @param {number} year
 * @returns {boolean}
 */
export function artistQualifiesForCohortAlumniAssignment(artist, year) {
    const yearNum = Math.floor(Number(year));
    if (!Number.isFinite(yearNum) || yearNum <= 0) return false;

    if (artistProgramIds(artist).length > 0) return true;

    const f = artist?.filter;
    if (
        f &&
        typeof f === 'object' &&
        String(/** @type {{ connection?: unknown }} */ (f).connection ?? '')
            .trim()
            .toLowerCase() === 'alumni'
    ) {
        return true;
    }

    if (artistGallerySeasonYear(artist) === yearNum) return true;

    if (yearNum >= FIRST_NON_KAGA_COHORT_YEAR) return true;

    return false;
}

/**
 * @param {string} yearStr
 * @returns {{ key: string, label: string, sortYear: number }}
 */
export function legacyKagaCohortLabel(yearStr) {
    return {
        key: `fusionKaga${yearStr}`,
        label: `Fusion Kaga ${yearStr}`,
        sortYear: Number(yearStr),
    };
}

/**
 * @param {string} yearStr
 * @returns {{ key: string, label: string, sortYear: number }}
 */
export function legacyTokyoCohortLabel(yearStr) {
    return {
        key: `fusionTokyo${yearStr}`,
        label: `Fusion Tokyo ${yearStr}`,
        sortYear: Number(yearStr),
    };
}

/**
 * @param {string} yearStr
 * @param {Set<string>} upcomingIds
 * @param {string} [currentProgramSeason]
 * @returns {{ key: string, label: string, sortYear: number }}
 */
export function defaultLegacyCohortLabel(yearStr, upcomingIds, currentProgramSeason = '') {
    const yearNum = Number(yearStr);
    const season = normalizeProgramId(currentProgramSeason);
    if (
        yearNum >= FIRST_NON_KAGA_COHORT_YEAR &&
        upcomingIds.has('fusionKaga') &&
        (season === 'fusionKaga' || upcomingIds.has('fusionKaga'))
    ) {
        return legacyTokyoCohortLabel(yearStr);
    }
    return legacyKagaCohortLabel(yearStr);
}

/**
 * @param {object[]} programs
 * @param {string} yearStr
 * @param {Set<string>} upcomingIds
 * @returns {object[]}
 */
export function nonUpcomingProgramsForYear(programs, yearStr, upcomingIds) {
    return programs.filter((p) => {
        if (String(/** @type {Record<string, unknown>} */ (p)?.year ?? '').trim() !== yearStr) {
            return false;
        }
        return !upcomingIds.has(
            normalizeProgramId(String(/** @type {Record<string, unknown>} */ (p)?.id ?? '')),
        );
    });
}

/**
 * @param {object[]} programList
 * @returns {object | null}
 */
function pickEarliestStartedProgram(programList) {
    let best = null;
    let bestTime = Infinity;
    for (const prog of programList) {
        const rec = /** @type {Record<string, unknown>} */ (prog);
        const startDate = String(rec.startDate ?? rec.start ?? '').trim();
        const year = String(rec.year ?? '').trim();
        const start = startDate ? parseProgramStartDate(startDate, year) : null;
        const time = start && !Number.isNaN(start.getTime()) ? start.getTime() : Infinity;
        if (time < bestTime) {
            bestTime = time;
            best = prog;
        }
    }
    return best ?? programList[0] ?? null;
}

/**
 * @param {string} yearStr
 * @param {object[]} upcomingThisYear
 * @param {string} currentProgramSeason
 * @param {object[]} allPrograms
 * @returns {{ key: string, label: string, sortYear: number }}
 */
function inferCompletedCohortProgram(yearStr, upcomingThisYear, currentProgramSeason, allPrograms) {
    const upcomingIds = new Set(
        upcomingThisYear.map((p) =>
            normalizeProgramId(String(/** @type {Record<string, unknown>} */ (p)?.id ?? '')),
        ),
    );
    const nonUpcoming = nonUpcomingProgramsForYear(allPrograms, yearStr, upcomingIds);
    if (nonUpcoming.length === 1) {
        const rec = /** @type {Record<string, unknown>} */ (nonUpcoming[0]);
        const pp =
            rec.programPage && typeof rec.programPage === 'object'
                ? /** @type {Record<string, unknown>} */ (rec.programPage)
                : {};
        return {
            key: normalizeProgramId(String(rec.id ?? '')),
            label: alumniProgramColumnLabel(rec, pp),
            sortYear: parseYearFromProgram(rec) || Number(yearStr),
        };
    }
    if (nonUpcoming.length > 1) {
        const rec = /** @type {Record<string, unknown>} */ (pickEarliestStartedProgram(nonUpcoming));
        const pp =
            rec.programPage && typeof rec.programPage === 'object'
                ? /** @type {Record<string, unknown>} */ (rec.programPage)
                : {};
        return {
            key: normalizeProgramId(String(rec.id ?? '')),
            label: alumniProgramColumnLabel(rec, pp),
            sortYear: parseYearFromProgram(rec) || Number(yearStr),
        };
    }

    const seasonId = normalizeProgramId(currentProgramSeason);
    const upcomingId = upcomingThisYear.length
        ? normalizeProgramId(String(/** @type {Record<string, unknown>} */ (upcomingThisYear[0]).id ?? ''))
        : seasonId;
    if (
        Number(yearStr) >= FIRST_NON_KAGA_COHORT_YEAR &&
        (upcomingId === 'fusionKaga' || seasonId === 'fusionKaga')
    ) {
        return legacyTokyoCohortLabel(yearStr);
    }

    return legacyKagaCohortLabel(yearStr);
}

/**
 * Resolve which alumni column a cohort year maps to, using upcoming/current programs as a filter.
 * @param {object} artist
 * @param {string | number} year
 * @param {object[]} programs
 * @param {Set<string>} upcomingIds
 * @param {string} [currentProgramSeason]
 * @returns {{ include: boolean, key?: string, label?: string, sortYear?: number }}
 */
export function resolveCohortYearAlumniProgram(
    artist,
    year,
    programs,
    upcomingIds,
    currentProgramSeason = '',
) {
    const yearStr = String(year).trim();
    if (!yearStr) return { include: false };

    const yearPrograms = programs.filter(
        (p) => String(/** @type {Record<string, unknown>} */ (p)?.year ?? '').trim() === yearStr,
    );
    const upcomingThisYear = yearPrograms.filter((p) =>
        upcomingIds.has(normalizeProgramId(String(/** @type {Record<string, unknown>} */ (p)?.id ?? ''))),
    );

    if (upcomingThisYear.length > 0) {
        if (isArtistInUpcomingCohort(artist, programs, upcomingIds, currentProgramSeason)) {
            return { include: false };
        }

        const upcomingNormIds = upcomingThisYear.map((p) =>
            normalizeProgramId(String(/** @type {Record<string, unknown>} */ (p)?.id ?? '')),
        );
        if (artistEnrolledInProgramIds(artist, upcomingNormIds)) {
            return { include: false };
        }

        const nonUpcoming = nonUpcomingProgramsForYear(programs, yearStr, upcomingIds);
        if (nonUpcoming.length === 1) {
            const rec = /** @type {Record<string, unknown>} */ (nonUpcoming[0]);
            const pp =
                rec.programPage && typeof rec.programPage === 'object'
                    ? /** @type {Record<string, unknown>} */ (rec.programPage)
                    : {};
            return {
                include: true,
                key: normalizeProgramId(String(rec.id ?? '')),
                label: alumniProgramColumnLabel(rec, pp),
                sortYear: parseYearFromProgram(rec) || Number(yearStr),
            };
        }
        if (nonUpcoming.length > 1) {
            const rec = /** @type {Record<string, unknown>} */ (
                pickEarliestStartedProgram(nonUpcoming)
            );
            const pp =
                rec.programPage && typeof rec.programPage === 'object'
                    ? /** @type {Record<string, unknown>} */ (rec.programPage)
                    : {};
            return {
                include: true,
                key: normalizeProgramId(String(rec.id ?? '')),
                label: alumniProgramColumnLabel(rec, pp),
                sortYear: parseYearFromProgram(rec) || Number(yearStr),
            };
        }

        const inferred = inferCompletedCohortProgram(
            yearStr,
            upcomingThisYear,
            currentProgramSeason,
            programs,
        );
        return { include: true, ...inferred };
    }

    const pastThisYear = yearPrograms.filter((p) => isPastResidencyProgram(p));
    if (pastThisYear.length === 1) {
        const rec = /** @type {Record<string, unknown>} */ (pastThisYear[0]);
        const pp =
            rec.programPage && typeof rec.programPage === 'object'
                ? /** @type {Record<string, unknown>} */ (rec.programPage)
                : {};
        return {
            include: true,
            key: normalizeProgramId(String(rec.id ?? '')),
            label: alumniProgramColumnLabel(rec, pp),
            sortYear: parseYearFromProgram(rec) || Number(yearStr),
        };
    }

    if (pastThisYear.length === 0 && yearPrograms.length === 0) {
        return {
            include: true,
            ...defaultLegacyCohortLabel(yearStr, upcomingIds, currentProgramSeason),
        };
    }

    return { include: false };
}

/**
 * @param {object[]} enPrograms
 * @param {object[]} artistPool
 * @param {string} [currentProgramSeason]
 * @returns {Array<{ program: string, name: string, slug: string }>}
 */
export function buildResidencyAlumniEntries(enPrograms, artistPool, currentProgramSeason = '') {
    const programs = Array.isArray(enPrograms)
        ? enPrograms.filter((p) => p && typeof p === 'object')
        : [];
    const pool = Array.isArray(artistPool) ? artistPool : [];

    const tablePrograms = programs.filter((p) => isAlumniTableProgram(p));
    const upcomingIds = new Set(
        programs
            .filter((p) => isUpcomingResidencyProgram(p))
            .map((p) => normalizeProgramId(String(/** @type {Record<string, unknown>} */ (p).id ?? '')))
            .filter(Boolean),
    );

    /** @type {Map<string, { label: string, sortYear: number, artists: Map<string, { name: string, slug: string }> }>} */
    const columns = new Map();
    /** @type {string[]} */
    const columnOrder = [];

    /**
     * @param {string} key
     * @param {string} label
     * @param {number} [sortYear]
     */
    const ensureColumn = (key, label, sortYear = 0) => {
        if (!columns.has(key)) {
            columns.set(key, {
                label,
                sortYear: sortYear || parseRecencyYearFromAlumniLabel(label),
                artists: new Map(),
            });
            columnOrder.push(key);
            return;
        }
        const col = columns.get(key);
        const nextYear = sortYear || parseRecencyYearFromAlumniLabel(label);
        if (nextYear > (col?.sortYear ?? 0)) {
            col.sortYear = nextYear;
        }
    };

    /**
     * @param {string} key
     * @param {string} label
     * @param {string} name
     * @param {string} slug
     * @param {number} [sortYear]
     */
    const addArtist = (key, label, name, slug, sortYear = 0) => {
        const trimmedName = String(name || '').trim();
        if (!trimmedName) return;
        ensureColumn(key, label, sortYear);
        const dedupe = String(slug || '').trim() || trimmedName.toLowerCase();
        columns.get(key).artists.set(dedupe, {
            name: trimmedName,
            slug: String(slug || '').trim(),
        });
    };

    for (const prog of tablePrograms) {
        const rec = /** @type {Record<string, unknown>} */ (prog);
        const id = normalizeProgramId(String(rec.id ?? '').trim());
        if (!id) continue;
        const pp =
            rec.programPage && typeof rec.programPage === 'object'
                ? /** @type {Record<string, unknown>} */ (rec.programPage)
                : {};
        ensureColumn(id, alumniProgramColumnLabel(rec, pp), parseYearFromProgram(rec));
    }

    for (const prog of tablePrograms) {
        const rec = /** @type {Record<string, unknown>} */ (prog);
        const id = normalizeProgramId(String(rec.id ?? '').trim());
        if (!id) continue;
        const pp =
            rec.programPage && typeof rec.programPage === 'object'
                ? /** @type {Record<string, unknown>} */ (rec.programPage)
                : {};
        const programLabel = alumniProgramColumnLabel(rec, pp);
        const confirmed = Array.isArray(pp.confirmedArtists) ? pp.confirmedArtists : [];
        for (const entry of confirmed) {
            const label =
                typeof entry === 'string' ? entry.trim() : String(entry?.name ?? '').trim();
            if (!label) continue;
            const found = findArtistForConfirmedListLabel(label, pool);
            addArtist(id, programLabel, label, found?.slug ? String(found.slug) : '');
        }
    }

    for (const artist of pool) {
        const name = artistDisplayName(artist, 'en');
        const slug = String(artist?.slug ?? '').trim();
        if (!name) continue;
        for (const rawPid of artistProgramIds(artist)) {
            const pid = normalizeProgramId(rawPid);
            if (upcomingIds.has(pid)) continue;
            const prog = tablePrograms.find(
                (p) => normalizeProgramId(String(p?.id ?? '')) === pid,
            );
            if (!prog) continue;
            const rec = /** @type {Record<string, unknown>} */ (prog);
            const pp =
                rec.programPage && typeof rec.programPage === 'object'
                    ? /** @type {Record<string, unknown>} */ (rec.programPage)
                    : {};
            addArtist(pid, alumniProgramColumnLabel(rec, pp), name, slug);
        }
    }

    /** @type {Set<string>} */
    const placed = new Set();
    for (const col of columns.values()) {
        for (const k of col.artists.keys()) placed.add(k);
    }

    for (const artist of pool) {
        const name = artistDisplayName(artist, 'en');
        const slug = String(artist?.slug ?? '').trim();
        const dedupe = slug || String(name || '').trim().toLowerCase();
        if (!name || placed.has(dedupe)) continue;

        if (isArtistInUpcomingCohort(artist, programs, upcomingIds, currentProgramSeason)) {
            continue;
        }

        const enrolled = collectArtistProgramIds(artist);
        if (enrolled.length > 0 && enrolled.every((id) => upcomingIds.has(id))) continue;

        const cohortYears = explicitArtistCohortYears(artist);
        for (const year of cohortYears) {
            if (!artistQualifiesForCohortAlumniAssignment(artist, year)) continue;
            const resolved = resolveCohortYearAlumniProgram(
                artist,
                year,
                programs,
                upcomingIds,
                currentProgramSeason,
            );
            if (!resolved.include || !resolved.key || !resolved.label) continue;
            addArtist(resolved.key, resolved.label, name, slug, resolved.sortYear ?? 0);
            placed.add(dedupe);
            break;
        }
    }

    columnOrder.sort((a, b) => {
        const ya = columns.get(a)?.sortYear ?? 0;
        const yb = columns.get(b)?.sortYear ?? 0;
        if (yb !== ya) return yb - ya;
        return (columns.get(a)?.label ?? '').localeCompare(columns.get(b)?.label ?? '', undefined, {
            sensitivity: 'base',
        });
    });

    /** @type {Array<{ program: string, name: string, slug: string }>} */
    const result = [];
    for (const key of columnOrder) {
        const col = columns.get(key);
        if (!col || col.artists.size === 0) continue;
        for (const { name, slug } of col.artists.values()) {
            result.push({ program: col.label, name, slug });
        }
    }

    return result;
}

/**
 * Split alumni names into up to two columns with counts as even as possible
 * (first column gets the extra name when count is odd).
 * @param {Array<{ name: string, slug: string }>} names
 * @param {number} [columnCount=2]
 * @returns {Array<Array<{ name: string, slug: string }>>}
 */
export function splitAlumniNamesEvenly(names, columnCount = 2) {
    const list = Array.isArray(names) ? names : [];
    if (!list.length) return [[]];
    const cols = Math.max(1, Math.min(columnCount, list.length));
    if (cols === 1) return [list];

    const splitAt = Math.ceil(list.length / cols);
    /** @type {Array<Array<{ name: string, slug: string }>>} */
    const columns = [];
    for (let i = 0; i < cols; i++) {
        columns.push(list.slice(i * splitAt, (i + 1) * splitAt));
    }
    return columns;
}

/**
 * @param {Array<{ program: string, name: string, slug: string }>} entries
 * @returns {Array<{ label: string, columns: Array<Array<{ name: string, slug: string }>> }>}
 */
export function buildAlumniProgramGroups(entries) {
    /** @type {Map<string, Array<{ name: string, slug: string }>>} */
    const byProgram = new Map();
    /** @type {string[]} */
    const order = [];
    for (const e of entries) {
        const key = String(e.program || '').trim();
        if (!key) continue;
        if (!byProgram.has(key)) {
            byProgram.set(key, []);
            order.push(key);
        }
        byProgram.get(key).push({ name: e.name, slug: e.slug });
    }

    return order
        .map((label) => {
            const names = byProgram.get(label) || [];
            names.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
            return {
                label,
                sortYear: parseRecencyYearFromAlumniLabel(label),
                columns: splitAlumniNamesEvenly(names),
            };
        })
        .sort((a, b) => {
            if (b.sortYear !== a.sortYear) return b.sortYear - a.sortYear;
            return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
        })
        .map(({ label, columns }) => ({ label, columns }));
}
