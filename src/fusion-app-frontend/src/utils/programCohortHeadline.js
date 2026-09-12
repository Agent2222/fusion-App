/**
 * Derive the public cohort headline (e.g. "Fusion Kaga - Fall 2026 Cohort").
 */

const MONTH_INDEX = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11,
};

/**
 * @param {string} [startDate]
 * @returns {'' | 'Spring' | 'Fall'}
 */
export function seasonFromProgramStartDate(startDate = '') {
    const monthMatch = String(startDate || '').match(
        /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i,
    );
    const monthName = monthMatch?.[1]?.toLowerCase() || '';
    const monthIndex = MONTH_INDEX[monthName];
    if (!Number.isFinite(monthIndex)) return '';
    if (monthIndex >= 8) return 'Fall';
    if (monthIndex <= 3) return 'Spring';
    return '';
}

/**
 * @param {string} [text]
 */
export function stripArtistResidencyFromProgramTitle(text = '') {
    return String(text || '')
        .replace(/\s*[-–—]\s*Artist Residency\s*$/i, '')
        .replace(/\s+Artist Residency\s*$/i, '')
        .trim();
}

/**
 * @param {string} [programId]
 * @param {string} [headlineFallback]
 * @returns {string}
 */
export function programCohortBrandLabel(programId = '', headlineFallback = '') {
    const key = String(programId || '').trim().toLowerCase();
    if (key.includes('kaga')) return 'Fusion Kaga';
    if (key.includes('tokyo')) return 'Fusion Tokyo';

    const stripped = stripArtistResidencyFromProgramTitle(headlineFallback);
    if (stripped) return stripped;

    return String(headlineFallback || '').trim();
}

/**
 * Remove a trailing " - Fall 2026" (or Spring) fragment so we do not duplicate season/year.
 * @param {string} brand
 * @param {string} seasonYear
 */
function stripTrailingSeasonYear(brand, seasonYear) {
    if (!brand || !seasonYear) return brand;
    const escaped = seasonYear.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return String(brand)
        .replace(new RegExp(`\\s*[-–—]\\s*${escaped}\\s*$`, 'i'), '')
        .trim();
}

/**
 * @param {{
 *   programId?: string,
 *   year?: string | number,
 *   startDate?: string,
 *   headlineFallback?: string,
 *   confirmedHeadlineFallback?: string,
 * }} [opts]
 * @returns {string}
 */
export function programCohortHeadline(opts = {}) {
    const yearStr = String(opts.year ?? '').trim();
    const season = seasonFromProgramStartDate(opts.startDate);
    const headlineFallback = String(opts.headlineFallback || '').trim();
    const confirmedFallback = String(opts.confirmedHeadlineFallback || '').trim();

    let brand = programCohortBrandLabel(opts.programId, headlineFallback);
    brand = stripArtistResidencyFromProgramTitle(brand);

    const seasonYear =
        season && yearStr ? `${season} ${yearStr}` : yearStr || '';

    if (brand && seasonYear) {
        brand = stripTrailingSeasonYear(brand, seasonYear);
        return `${brand} - ${seasonYear} Cohort`;
    }
    if (brand) return `${brand} Cohort`;
    return confirmedFallback;
}
