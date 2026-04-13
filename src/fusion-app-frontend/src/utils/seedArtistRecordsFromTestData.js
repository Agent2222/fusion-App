/**
 * Map seed `testData.allArtists.artists[]` rows to canister `ArtistRecord` payloads for `bulkUpsertArtists`.
 */
import { normalizeArtistImportRow } from './studioBatchImport.js';
import { normalizeLocalesWorldForStorage } from './worldNormalize.js';

/**
 * @param {unknown[]} artists
 * @param {Set<string>} [existingCodes]
 * @param {{ forceImported?: boolean }} [opts] — default `forceImported: true` (Studio seed / migration)
 * @returns {{ profile: object, localesJson: string | null, notesEncrypted: null, imported: boolean, accessCode: string }[]}
 */
export function buildArtistRecordsFromSeedArtists(artists, existingCodes = new Set(), opts = {}) {
    const forceImported = opts.forceImported !== false;
    const pool = new Set(existingCodes);
    if (!Array.isArray(artists)) return [];
    return artists.map((raw) => {
        const row = raw && typeof raw === 'object' ? { ...raw } : {};
        if (row.locales && typeof row.locales === 'object') {
            row.locales = normalizeLocalesWorldForStorage(
                /** @type {Record<string, unknown>} */ (JSON.parse(JSON.stringify(row.locales)))
            );
        }
        return normalizeArtistImportRow(row, pool, { forceImported });
    });
}
