/**
 * Staff-curated featured artists + random pool — stored in localStorage (not Motoko `stable` maps).
 * Merged onto artist rows via {@link mergeArtistFeaturedExtension} to avoid schema upgrades.
 */

export const MAX_MANUAL_FEATURED = 8;

const STORAGE_KEY = 'fusionArtistFeaturedMeta';

/**
 * @typedef {{
 *   randomFeatured: boolean,
 *   manualFeaturedIds: string[],
 *   featurableById: Record<string, boolean>,
 * }} ArtistFeaturedMeta
 */

/** @returns {ArtistFeaturedMeta} */
export function defaultArtistFeaturedMeta() {
    return {
        randomFeatured: false,
        manualFeaturedIds: [],
        featurableById: {},
    };
}

/** @returns {ArtistFeaturedMeta} */
export function readArtistFeaturedMeta() {
    if (typeof window === 'undefined' || !window.localStorage) {
        return defaultArtistFeaturedMeta();
    }
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultArtistFeaturedMeta();
        const p = JSON.parse(raw);
        if (!p || typeof p !== 'object') return defaultArtistFeaturedMeta();
        const manualFeaturedIds = Array.isArray(p.manualFeaturedIds)
            ? p.manualFeaturedIds.map((x) => String(x)).filter(Boolean).slice(0, MAX_MANUAL_FEATURED)
            : [];
        const featurableById =
            p.featurableById && typeof p.featurableById === 'object' && !Array.isArray(p.featurableById)
                ? /** @type {Record<string, boolean>} */ ({ ...p.featurableById })
                : {};
        return {
            randomFeatured: p.randomFeatured === true,
            manualFeaturedIds,
            featurableById,
        };
    } catch {
        return defaultArtistFeaturedMeta();
    }
}

/** @param {ArtistFeaturedMeta} meta */
export function writeArtistFeaturedMeta(meta) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                randomFeatured: meta.randomFeatured === true,
                manualFeaturedIds: meta.manualFeaturedIds.slice(0, MAX_MANUAL_FEATURED),
                featurableById: meta.featurableById || {},
            })
        );
        window.dispatchEvent(new CustomEvent('fusion-artist-featured-meta-change'));
    } catch {
        /* ignore quota */
    }
}

/**
 * @param {object | null | undefined} artist
 * @returns {object}
 */
export function mergeArtistFeaturedExtension(artist) {
    if (!artist || typeof artist !== 'object') return {};
    const id = String(/** @type {{ id?: unknown }} */ (artist).id ?? '');
    const meta = readArtistFeaturedMeta();
    const featured = meta.manualFeaturedIds.includes(id);
    const featurable = Boolean(meta.featurableById[id]);
    return { ...artist, featured, featurable };
}

/**
 * @param {string} id
 * @param {boolean} wantFeatured
 * @returns {{ ok: boolean, reason?: string }}
 */
export function setManualFeaturedForArtist(id, wantFeatured) {
    const sid = String(id || '').trim();
    if (!sid) return { ok: false, reason: 'Missing id' };
    const meta = readArtistFeaturedMeta();
    let ids = [...meta.manualFeaturedIds];
    const idx = ids.indexOf(sid);
    if (wantFeatured) {
        if (idx !== -1) {
            writeArtistFeaturedMeta({ ...meta, manualFeaturedIds: ids });
            return { ok: true };
        }
        if (ids.length >= MAX_MANUAL_FEATURED) {
            return { ok: false, reason: `At most ${MAX_MANUAL_FEATURED} artists can be featured.` };
        }
        ids.push(sid);
    } else if (idx !== -1) {
        ids.splice(idx, 1);
    }
    writeArtistFeaturedMeta({ ...meta, manualFeaturedIds: ids });
    return { ok: true };
}

/**
 * @param {string} id
 * @param {boolean} value
 */
export function setFeaturableForArtist(id, value) {
    const sid = String(id || '').trim();
    if (!sid) return;
    const meta = readArtistFeaturedMeta();
    const featurableById = { ...meta.featurableById };
    if (value) featurableById[sid] = true;
    else delete featurableById[sid];
    writeArtistFeaturedMeta({ ...meta, featurableById });
}

/**
 * @param {boolean} on
 */
export function setRandomFeaturedMode(on) {
    const meta = readArtistFeaturedMeta();
    writeArtistFeaturedMeta({ ...meta, randomFeatured: on });
}

/**
 * Updates meta from Manage modal checkboxes and returns Motoko `featuredOrder` (0 = not in manual list).
 * @param {string} id
 * @param {{ featured: boolean, featurable: boolean }} flags
 * @returns {number}
 */
export function applyFeaturedFlagsFromStudioSave(id, flags) {
    const sid = String(id || '').trim();
    if (!sid) return 0;
    setFeaturableForArtist(sid, flags.featurable);
    const r = setManualFeaturedForArtist(sid, flags.featured);
    if (!r.ok) {
        throw new Error(r.reason || 'Could not update featured');
    }
    const meta = readArtistFeaturedMeta();
    const pos = meta.manualFeaturedIds.indexOf(sid);
    return pos >= 0 ? pos + 1 : 0;
}

/**
 * Fisher–Yates shuffle (copy).
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
function shuffleInPlace(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Featured strip for home / artists page (max 8).
 * @param {object[]} allArtists — rows already passed through {@link mergeArtistFeaturedExtension}
 * @returns {object[]}
 */
export function resolveFeaturedArtistsForPublic(allArtists) {
    if (!Array.isArray(allArtists) || !allArtists.length) return [];
    const meta = readArtistFeaturedMeta();
    if (meta.randomFeatured) {
        const pool = allArtists.filter((a) => Boolean(/** @type {{ featurable?: boolean }} */ (a).featurable));
        return shuffleInPlace(pool).slice(0, MAX_MANUAL_FEATURED);
    }
    const ids = meta.manualFeaturedIds.slice(0, MAX_MANUAL_FEATURED);
    return ids
        .map((id) => allArtists.find((a) => String(/** @type {{ id?: unknown }} */ (a).id) === id))
        .filter(Boolean);
}
