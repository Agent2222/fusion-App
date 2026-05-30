import { introSlotsFromWorld, localeBlock } from './memberProfileForm.js';
import { isUsableImageUrl, probeImageSrc } from './imageProbe.js';
import {
    getPublicWorldSourceFromLocales,
    pickPublicWorldField,
    worldFieldHasContent,
} from './worldPublicPick.js';

/** @typedef {'ready' | 'partial' | 'blocked'} ArtistReadinessStatus */

/** @typedef {{ heroOk: boolean, introSlotsOk: [boolean, boolean, boolean] }} ArtistImageProbeResult */

/** @type {readonly string[]} */
export const ARTIST_WORLD_STORY_KEYS = [
    'practice',
    'perspective',
    'vision',
    'constructing',
    'context',
    'quote',
];

/** @deprecated use ARTIST_WORLD_STORY_KEYS */
export const ARTIST_WORLD_NEW_REQUIRED_KEYS = ARTIST_WORLD_STORY_KEYS;

/**
 * @param {unknown} row
 * @returns {boolean}
 */
export function artistHasHeroImage(row) {
    const r = row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row) : {};
    const banner = String(r.image ?? '').trim();
    const headshot = String(r.heroProfileImage ?? r.hero_profile_image ?? '').trim();
    return isUsableImageUrl(banner) || isUsableImageUrl(headshot);
}

/**
 * @param {unknown} locales
 * @returns {boolean}
 */
export function artistHasAllIntroImages(locales) {
    const en = localeBlock(
        locales && typeof locales === 'object' ? /** @type {Record<string, unknown>} */ (locales) : {},
        'en',
    );
    const world = en.world && typeof en.world === 'object' && !Array.isArray(en.world) ? en.world : {};
    const slots = introSlotsFromWorld(world);
    return slots.every((slot) => isUsableImageUrl(slot.src));
}

/**
 * True when the row has at least one non-placeholder image URL worth probing.
 * @param {unknown} row
 */
export function artistRowHasProbeableImages(row) {
    if (artistHasHeroImage(row)) return true;
    const r = row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row) : {};
    const en = localeBlock(
        r.locales && typeof r.locales === 'object' ? /** @type {Record<string, unknown>} */ (r.locales) : {},
        'en',
    );
    const world = en.world && typeof en.world === 'object' && !Array.isArray(en.world) ? en.world : {};
    return introSlotsFromWorld(world).some((slot) => isUsableImageUrl(slot.src));
}

/**
 * True when English Story & World text is complete for public display (world or worldNew).
 * @param {unknown} locales
 * @returns {boolean}
 */
export function artistHasWorldStoryCopy(locales) {
    const localesObj =
        locales && typeof locales === 'object' ? /** @type {Record<string, unknown>} */ (locales) : {};
    const publicWorldSource = getPublicWorldSourceFromLocales(localesObj);
    const en = localeBlock(localesObj, 'en');
    return ARTIST_WORLD_STORY_KEYS.every((key) =>
        worldFieldHasContent(pickPublicWorldField(en, key, publicWorldSource)),
    );
}

/** @deprecated use artistHasWorldStoryCopy */
export function artistHasFullEnWorldNewCopy(locales) {
    return artistHasWorldStoryCopy(locales);
}

/**
 * @param {unknown} row
 * @returns {Promise<ArtistImageProbeResult>}
 */
export async function probeArtistProfileImages(row) {
    const r = row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row) : {};
    const banner = String(r.image ?? '').trim();
    const headshot = String(r.heroProfileImage ?? r.hero_profile_image ?? '').trim();
    const heroCandidates = [banner, headshot].filter(isUsableImageUrl);
    let heroOk = false;
    if (heroCandidates.length > 0) {
        const heroResults = await Promise.all(heroCandidates.map((url) => probeImageSrc(url)));
        heroOk = heroResults.some(Boolean);
    }

    const locales = r.locales;
    const en = localeBlock(
        locales && typeof locales === 'object' ? /** @type {Record<string, unknown>} */ (locales) : {},
        'en',
    );
    const world = en.world && typeof en.world === 'object' && !Array.isArray(en.world) ? en.world : {};
    const slots = introSlotsFromWorld(world);
    const introSlotsOk = await Promise.all(
        slots.map(async (slot) => {
            const src = String(slot.src ?? '').trim();
            if (!isUsableImageUrl(src)) return false;
            return probeImageSrc(src);
        }),
    );

    return {
        heroOk,
        introSlotsOk: /** @type {[boolean, boolean, boolean]} */ (introSlotsOk),
    };
}

/**
 * @param {unknown} row
 * @param {ArtistImageProbeResult | null | undefined} [probes]
 * @returns {{ status: ArtistReadinessStatus, hasHero: boolean, hasAllIntro: boolean, hasCopy: boolean, missing: string[] }}
 */
export function getArtistProfileReadiness(row, probes = undefined) {
    const r = row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row) : {};
    const locales = r.locales;
    const probeData = probes && typeof probes === 'object' ? probes : null;
    const hasHeroSync = artistHasHeroImage(r);
    const hasAllIntroSync = artistHasAllIntroImages(locales);
    const hasHero = probeData ? probeData.heroOk : hasHeroSync;
    const hasAllIntro = probeData ? probeData.introSlotsOk.every(Boolean) : hasAllIntroSync;
    const hasImages = hasHero && hasAllIntro;
    const hasCopy = artistHasWorldStoryCopy(locales);

    const banner = String(r.image ?? '').trim();
    const headshot = String(r.heroProfileImage ?? r.hero_profile_image ?? '').trim();
    const hadHeroCandidate = isUsableImageUrl(banner) || isUsableImageUrl(headshot);

    /** @type {string[]} */
    const missing = [];
    if (!hasHero) {
        missing.push(
            probeData && hadHeroCandidate
                ? 'banner/headshot hero (image failed to load)'
                : 'banner/headshot hero',
        );
    }
    if (!hasAllIntro) {
        const en = localeBlock(
            locales && typeof locales === 'object' ? /** @type {Record<string, unknown>} */ (locales) : {},
            'en',
        );
        const world = en.world && typeof en.world === 'object' && !Array.isArray(en.world) ? en.world : {};
        introSlotsFromWorld(world).forEach((slot, i) => {
            const src = String(slot.src ?? '').trim();
            const probedOk = probeData?.introSlotsOk?.[i];
            if (probedOk) return;
            if (probeData && isUsableImageUrl(src)) {
                missing.push(`intro slot ${i + 1} (image failed to load)`);
            } else {
                missing.push(`intro slot ${i + 1}`);
            }
        });
    }
    if (!hasCopy) {
        const localesObj =
            locales && typeof locales === 'object' ? /** @type {Record<string, unknown>} */ (locales) : {};
        const publicWorldSource = getPublicWorldSourceFromLocales(localesObj);
        const en = localeBlock(localesObj, 'en');
        for (const key of ARTIST_WORLD_STORY_KEYS) {
            if (!worldFieldHasContent(pickPublicWorldField(en, key, publicWorldSource))) {
                missing.push(`world.${key}`);
            }
        }
    }

    /** @type {ArtistReadinessStatus} */
    let status = 'partial';
    if (hasImages && hasCopy) status = 'ready';
    else if (!hasImages && !hasCopy) status = 'blocked';

    return { status, hasHero, hasAllIntro, hasCopy, missing };
}

/**
 * @param {unknown} row
 * @returns {Promise<ReturnType<typeof getArtistProfileReadiness>>}
 */
export async function getArtistProfileReadinessAsync(row) {
    const probes = await probeArtistProfileImages(row);
    return getArtistProfileReadiness(row, probes);
}

/**
 * @param {ArtistReadinessStatus} status
 * @returns {string}
 */
export function artistReadinessDotClass(status) {
    if (status === 'ready') return 'studio-user-sub-dot--ok';
    if (status === 'blocked') return 'studio-user-sub-dot--err';
    return 'studio-user-sub-dot--warn';
}

/**
 * @param {{ status: ArtistReadinessStatus, missing?: string[] }} readiness
 * @returns {string}
 */
export function artistReadinessTitle(readiness) {
    if (readiness.status === 'ready') return 'Ready';
    const gaps = Array.isArray(readiness.missing) ? readiness.missing.filter(Boolean) : [];
    if (!gaps.length) {
        return readiness.status === 'blocked'
            ? 'Missing images and Story & World copy'
            : 'Profile not ready';
    }
    return `Missing: ${gaps.join(', ')}`;
}

/**
 * @param {HTMLElement | null | undefined} dot
 * @param {ReturnType<typeof getArtistProfileReadiness>} readiness
 */
export function applyArtistReadinessDot(dot, readiness) {
    if (!(dot instanceof HTMLElement)) return;
    dot.className = `studio-user-sub-dot studio-artist-ready-dot ${artistReadinessDotClass(readiness.status)}`;
    const title = artistReadinessTitle(readiness);
    dot.title = title;
    dot.setAttribute('aria-label', title);
}
