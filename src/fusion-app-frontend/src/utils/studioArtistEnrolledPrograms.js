/**
 * Artist roster program tags (locales.en.programs + mostRecentProgram).
 */
import { artistMostRecentProgramId, artistProgramIds } from './artistSlug.js';
import { normalizeProgramId } from './programAlumniEligibility.js';

/**
 * @param {object | null | undefined} artist
 * @returns {string[]}
 */
export function listArtistEnrolledProgramIds(artist) {
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
 * Drop a program id from the artist locales + mostRecentProgram (in memory).
 * @param {object} artist
 * @param {string} programId
 * @returns {{ locales: Record<string, unknown>, mostRecentProgram: string, nextIds: string[] }}
 */
export function removeEnrolledProgramFromArtist(artist, programId) {
    const want = normalizeProgramId(programId);
    const nextIds = listArtistEnrolledProgramIds(artist).filter((id) => normalizeProgramId(id) !== want);
    const locales = JSON.parse(
        JSON.stringify(
            artist && typeof artist === 'object' && artist.locales && typeof artist.locales === 'object'
                ? artist.locales
                : { en: {}, ja: {} },
        ),
    );
    if (!locales.en || typeof locales.en !== 'object') locales.en = {};
    if (!locales.ja || typeof locales.ja !== 'object') locales.ja = {};
    locales.en.programs = nextIds;
    locales.ja.programs = nextIds;
    const mostRecentProgram = nextIds.length ? nextIds[nextIds.length - 1] : '';
    return { locales, mostRecentProgram, nextIds };
}
