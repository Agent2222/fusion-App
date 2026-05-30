/**
 * Predictable CDN URLs for legacy profile hero + intro gallery (Studio sync buttons).
 * @see docs/delete-later.md — remove with temporary Studio sync + `syncStudioArtistsLegacyHeroImages`.
 */

import { CLOUDFRONT_ASSET_ORIGIN } from './assetDistribution.js';

export const LEGACY_PROFILE_BASE = `${CLOUDFRONT_ASSET_ORIGIN}/uploads/legacyProfiles/`;

/**
 * @param {string} s
 */
function sanitizeStemPart(s) {
    const t = String(s ?? '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
    return t || 'unknown';
}

/**
 * @param {string} slug
 */
function stemFromSlug(slug) {
    return sanitizeStemPart(String(slug || '').replace(/\s+/g, '-'));
}

/**
 * File stem for legacyProfiles/<stem>-hero.jpg etc.
 * @param {{ slug?: string, locales?: Record<string, unknown> }} row
 */
export function legacyProfileFileStem(row) {
    const r = row && typeof row === 'object' ? row : {};
    const slug = String(r.slug ?? '').trim();
    const locales = r.locales && typeof r.locales === 'object' ? r.locales : {};
    const en = /** @type {Record<string, unknown>} */ (locales).en;
    const enObj = en && typeof en === 'object' && !Array.isArray(en) ? en : {};
    const name = String(enObj.name ?? '').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        const first = parts[0];
        const last = parts[parts.length - 1];
        return `${sanitizeStemPart(first)}-${sanitizeStemPart(last)}`;
    }
    if (parts.length === 1) {
        const w = sanitizeStemPart(parts[0]);
        return `${w}-${w}`;
    }
    if (slug) {
        return stemFromSlug(slug);
    }
    return 'unknown';
}

/**
 * @param {string} stem
 */
export function legacyHeroUrl(stem) {
    return `${LEGACY_PROFILE_BASE}${stem}-hero.jpg`;
}

/**
 * @param {string} stem
 * @param {number} index 0..2
 */
export function legacyIntroUrl(stem, index) {
    return `${LEGACY_PROFILE_BASE}${stem}-intro-${index}.jpg`;
}

/**
 * @param {{ image?: string }} row
 */
export function needsHeroSync(row) {
    return !String(row?.image ?? '').trim();
}

/**
 * @param {Record<string, unknown> | null | undefined} locales
 * @param {number} slotIndex
 */
function introGallerySlotSrc(locales, slotIndex) {
    const L = locales && typeof locales === 'object' ? locales : {};
    const en = /** @type {Record<string, unknown>} */ (L).en;
    const enObj = en && typeof en === 'object' && !Array.isArray(en) ? en : {};
    const world = enObj.world;
    const w = world && typeof world === 'object' && !Array.isArray(world) ? world : {};
    const raw = w.introGallery;
    const arr = Array.isArray(raw) ? raw : [];
    const item = arr[slotIndex];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
        return String(/** @type {Record<string, unknown>} */ (item).src ?? '').trim();
    }
    if (typeof item === 'string') {
        return item.trim();
    }
    return '';
}

/**
 * @param {string} url
 */
export function isFirebaseStorageUrl(url) {
    const s = String(url ?? '').trim();
    if (!s) return false;
    try {
        return new URL(s).hostname === 'firebasestorage.googleapis.com';
    } catch {
        return s.includes('firebasestorage.googleapis.com');
    }
}

/**
 * True when any EN intro gallery slot (0–2) uses Firebase Storage.
 * @param {Record<string, unknown> | null | undefined} locales
 */
export function hasFirebaseIntroGalleryUrl(locales) {
    for (let i = 0; i < 3; i++) {
        if (isFirebaseStorageUrl(introGallerySlotSrc(locales, i))) {
            return true;
        }
    }
    return false;
}

/**
 * True when EN world.introGallery has no non-empty src in slots 0–2.
 * @param {Record<string, unknown> | null | undefined} locales
 */
export function needsIntroGallerySync(locales) {
    for (let i = 0; i < 3; i++) {
        if (introGallerySlotSrc(locales, i)) {
            return false;
        }
    }
    return true;
}
