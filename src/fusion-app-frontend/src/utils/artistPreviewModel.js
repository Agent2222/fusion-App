/**
 * Resolve artist preview modal / Studio Preview tab view data from existing artist fields.
 * Curation lives in locales.{en|ja}.preview — no Motoko changes.
 */
import { artistDisplayName, artistEnglishBlock, artistLocaleBlock, artistSlugFromName } from './artistSlug.js';
import {
    getArtistCardArtworkUrl,
    getArtistCardProfileUrl,
    isArtistHeroProfileImageApproved,
    resolveArtistPublicCardImageUrl,
    artistHasPublicPlayableAudio,
} from './artistCardImageMode.js';
import { introSlotsFromWorld } from './memberProfileForm.js';
import {
    getPublicWorldSourceFromLocales,
    pickPublicWorldField,
} from './worldPublicPick.js';

/** @typedef {'intro:0' | 'intro:1' | 'intro:2' | 'heroProfile'} PreviewImageKey */

export const PREVIEW_IMAGE_KEYS = /** @type {const} */ ([
    'intro:0',
    'intro:1',
    'intro:2',
    'heroProfile',
]);

const BLURB_MAX = 200;

/**
 * @param {unknown} artist
 * @returns {Record<string, unknown>}
 */
function localesOf(artist) {
    if (!artist || typeof artist !== 'object') return {};
    const loc = /** @type {Record<string, unknown>} */ (artist).locales;
    return loc && typeof loc === 'object' && !Array.isArray(loc)
        ? /** @type {Record<string, unknown>} */ (loc)
        : {};
}

/**
 * @param {unknown} artist
 * @param {string} [locale]
 * @returns {Record<string, unknown>}
 */
export function getArtistPreviewConfig(artist, locale = 'en') {
    const locales = localesOf(artist);
    const primary = locale === 'ja' ? 'ja' : 'en';
    const secondary = primary === 'ja' ? 'en' : 'ja';
    const a =
        locales[primary] && typeof locales[primary] === 'object'
            ? /** @type {Record<string, unknown>} */ (locales[primary]).preview
            : null;
    const b =
        locales[secondary] && typeof locales[secondary] === 'object'
            ? /** @type {Record<string, unknown>} */ (locales[secondary]).preview
            : null;
    const fromA = a && typeof a === 'object' && !Array.isArray(a) ? /** @type {Record<string, unknown>} */ (a) : {};
    const fromB = b && typeof b === 'object' && !Array.isArray(b) ? /** @type {Record<string, unknown>} */ (b) : {};
    return { ...fromB, ...fromA };
}

/**
 * Sentence-aware trim with ellipsis.
 * @param {string} text
 * @param {number} [max]
 */
export function shortenPreviewText(text, max = BLURB_MAX) {
    const raw = String(text ?? '').replace(/\s+/g, ' ').trim();
    if (!raw) return '';
    if (raw.length <= max) return raw;
    const slice = raw.slice(0, max);
    const lastStop = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('。'), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
    if (lastStop >= Math.floor(max * 0.45)) {
        return slice.slice(0, lastStop + 1).trim();
    }
    const lastSpace = slice.lastIndexOf(' ');
    const cut = lastSpace > Math.floor(max * 0.5) ? slice.slice(0, lastSpace) : slice;
    return `${cut.trim()}…`;
}

/**
 * Auto blurb: public practice → bio, then shortened.
 * @param {unknown} artist
 * @param {string} [locale]
 */
export function shortPreviewBlurb(artist, locale = 'en') {
    const locales = localesOf(artist);
    const loc = artistLocaleBlock(artist, locale) || {};
    const source = getPublicWorldSourceFromLocales(locales);
    const practice = pickPublicWorldField(
        /** @type {Record<string, unknown>} */ (loc),
        'practice',
        source,
    );
    const practiceText = String(practice ?? '').trim();
    if (practiceText) return shortenPreviewText(practiceText);
    const bio = String(/** @type {Record<string, unknown>} */ (loc).bio ?? '').trim();
    if (bio) return shortenPreviewText(bio);
    const en = artistEnglishBlock(artist) || {};
    const enPractice = pickPublicWorldField(
        /** @type {Record<string, unknown>} */ (en),
        'practice',
        source,
    );
    if (String(enPractice ?? '').trim()) return shortenPreviewText(String(enPractice));
    return shortenPreviewText(String(/** @type {Record<string, unknown>} */ (en).bio ?? ''));
}

/**
 * Curated blurb if set, else auto short blurb.
 * @param {unknown} artist
 * @param {string} [locale]
 */
export function resolvePreviewBlurb(artist, locale = 'en') {
    const cfg = getArtistPreviewConfig(artist, locale);
    const curated = String(cfg.blurb ?? '').trim();
    if (curated) return curated;
    return shortPreviewBlurb(artist, locale);
}

/**
 * Default ordered keys from available intro slots + approved hero profile.
 * @param {unknown} artist
 * @returns {PreviewImageKey[]}
 */
export function defaultPreviewImageKeys(artist) {
    /** @type {PreviewImageKey[]} */
    const keys = [];
    const locales = localesOf(artist);
    const en =
        locales.en && typeof locales.en === 'object'
            ? /** @type {Record<string, unknown>} */ (locales.en)
            : {};
    const source = getPublicWorldSourceFromLocales(locales);
    const gallery = pickPublicWorldField(en, 'introGallery', source);
    const worldForSlots =
        Array.isArray(gallery) || (gallery && typeof gallery === 'object')
            ? { introGallery: gallery }
            : (() => {
                  const w = en.world && typeof en.world === 'object' ? en.world : {};
                  return w;
              })();
    const slots = introSlotsFromWorld(worldForSlots);
    for (let i = 0; i < 3; i++) {
        if (String(slots[i]?.src ?? '').trim()) {
            keys.push(/** @type {PreviewImageKey} */ (`intro:${i}`));
        }
    }
    const hero = String(
        /** @type {Record<string, unknown>} */ (artist || {}).heroProfileImage ??
            /** @type {Record<string, unknown>} */ (artist || {}).hero_profile_image ??
            '',
    ).trim();
    if (hero && isArtistHeroProfileImageApproved(artist)) {
        keys.push('heroProfile');
    }
    return keys;
}

/**
 * @param {unknown} artist
 * @returns {PreviewImageKey[]}
 */
export function resolvePreviewImageKeys(artist) {
    const cfg = getArtistPreviewConfig(artist, 'en');
    const raw = Array.isArray(cfg.imageKeys) ? cfg.imageKeys : [];
    /** @type {PreviewImageKey[]} */
    const parsed = [];
    for (const k of raw) {
        const key = String(k ?? '').trim();
        if (PREVIEW_IMAGE_KEYS.includes(/** @type {PreviewImageKey} */ (key))) {
            parsed.push(/** @type {PreviewImageKey} */ (key));
        }
    }
    if (parsed.length) return parsed;
    return defaultPreviewImageKeys(artist);
}

/**
 * @param {unknown} artist
 * @param {PreviewImageKey} key
 * @returns {string}
 */
export function previewImageUrlForKey(artist, key) {
    if (key === 'heroProfile') {
        if (!isArtistHeroProfileImageApproved(artist)) return '';
        return String(
            /** @type {Record<string, unknown>} */ (artist || {}).heroProfileImage ??
                /** @type {Record<string, unknown>} */ (artist || {}).hero_profile_image ??
                '',
        ).trim();
    }
    const m = /^intro:([0-2])$/.exec(key);
    if (!m) return '';
    const idx = Number(m[1]);
    const locales = localesOf(artist);
    const en =
        locales.en && typeof locales.en === 'object'
            ? /** @type {Record<string, unknown>} */ (locales.en)
            : {};
    const source = getPublicWorldSourceFromLocales(locales);
    const gallery = pickPublicWorldField(en, 'introGallery', source);
    const worldForSlots = { introGallery: gallery };
    const slots = introSlotsFromWorld(worldForSlots);
    return String(slots[idx]?.src ?? '').trim();
}

/**
 * Roster artwork / profile headshot when curated/intro gallery yield nothing.
 * @param {unknown} artist
 * @param {string[]} urls
 */
function appendFallbackPreviewUrls(artist, urls) {
    const candidates = [
        getArtistCardArtworkUrl(artist),
        getArtistCardProfileUrl(artist, { fallbackToArtwork: false }),
        resolveArtistPublicCardImageUrl(artist),
        String(/** @type {Record<string, unknown>} */ (artist || {}).heroProfileImage ?? '').trim(),
        String(/** @type {Record<string, unknown>} */ (artist || {}).hero_profile_image ?? '').trim(),
        String(/** @type {Record<string, unknown>} */ (artist || {}).image ?? '').trim(),
    ];
    for (const c of candidates) {
        const url = String(c ?? '').trim();
        if (url && !urls.includes(url)) urls.push(url);
    }
}

/**
 * @param {unknown} artist
 * @returns {string[]}
 */
export function resolvePreviewImageUrls(artist) {
    const keys = resolvePreviewImageKeys(artist);
    /** @type {string[]} */
    const urls = [];
    for (const key of keys) {
        const url = previewImageUrlForKey(artist, key);
        if (url && !urls.includes(url)) urls.push(url);
    }
    if (!urls.length) appendFallbackPreviewUrls(artist, urls);
    return urls;
}

/**
 * @param {unknown} artist
 * @returns {{ url: string, title: string } | null}
 */
export function resolvePreviewAudio(artist) {
    const cfg = getArtistPreviewConfig(artist, 'en');
    if (cfg.showAudio === false) return null;
    if (!artistHasPublicPlayableAudio(artist)) return null;
    const url = String(/** @type {Record<string, unknown>} */ (artist || {}).audioUrl ?? '').trim();
    if (!url) return null;
    const title = String(/** @type {Record<string, unknown>} */ (artist || {}).audioTitle ?? '').trim();
    return { url, title };
}

/**
 * @param {unknown} artist
 * @param {string} [locale]
 */
export function buildArtistPreviewViewModel(artist, locale = 'en') {
    const loc = locale === 'ja' ? 'ja' : 'en';
    const name = artistDisplayName(artist, loc);
    const en = artistEnglishBlock(artist);
    const slug =
        String(/** @type {Record<string, unknown>} */ (artist || {}).slug ?? '').trim() ||
        artistSlugFromName(String(en?.name ?? name));
    const blurb = resolvePreviewBlurb(artist, loc);
    const images = resolvePreviewImageUrls(artist);
    const audio = resolvePreviewAudio(artist);
    return {
        id: String(/** @type {Record<string, unknown>} */ (artist || {}).id ?? ''),
        name,
        slug,
        blurb,
        images,
        audio,
        artist,
    };
}

/**
 * Normalize preview payload for Studio save (shared fields mirrored EN/JA).
 * @param {{ blurbEn?: string, blurbJa?: string, imageKeys?: string[], showAudio?: boolean }} raw
 */
export function normalizePreviewConfigForSave(raw) {
    const imageKeys = (Array.isArray(raw.imageKeys) ? raw.imageKeys : [])
        .map((k) => String(k ?? '').trim())
        .filter((k) => PREVIEW_IMAGE_KEYS.includes(/** @type {PreviewImageKey} */ (k)));
    const showAudio = raw.showAudio !== false;
    return {
        en: {
            blurb: String(raw.blurbEn ?? '').trim(),
            imageKeys,
            showAudio,
        },
        ja: {
            blurb: String(raw.blurbJa ?? '').trim(),
            imageKeys,
            showAudio,
        },
    };
}
