/**
 * Public /links page records stored as site-setting JSON (`publicLinksJson`).
 */

import { artistDisplayName, artistEnglishBlock, artistSlugFromName } from './artistSlug.js';

export const PUBLIC_LINKS_SETTING_KEY = 'publicLinksJson';

/** @typedef {'button' | 'card'} PublicLinkDisplay */
/** @typedef {'c1' | 'c2' | 'c3' | 'c4' | 'c5' | 'bg'} PublicLinkColorToken */
/** @typedef {'' | 'url' | 'artist' | 'journal' | 'video'} PublicLinkSourceType */
/** @typedef {1 | 2} PublicLinkCardSpan */
/** @typedef {'outline' | 'solid'} PublicLinkCtaStyle */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   href: string,
 *   sortOrder: number,
 *   enabled: boolean,
 *   display: PublicLinkDisplay,
 *   colorToken: PublicLinkColorToken,
 *   imageUrl: string,
 *   sourceType: PublicLinkSourceType,
 *   sourceId: string,
 *   cardSpan: PublicLinkCardSpan,
 *   cardRows: PublicLinkCardSpan,
 *   eyebrow: string,
 *   subtext: string,
 *   ctaLabel: string,
 *   ctaStyle: PublicLinkCtaStyle,
 *   meta: string,
 * }} PublicLink
 */

export const PUBLIC_LINK_COLOR_TOKENS = Object.freeze(['c1', 'c2', 'c3', 'c4', 'c5', 'bg']);

export const PUBLIC_LINK_SOURCE_TYPES = Object.freeze(['url', 'artist', 'journal', 'video']);

export const PUBLIC_LINK_CARD_SPANS = Object.freeze([1, 2]);

/** Preset chips for Studio — common Fusion paths (labels omit “Fusion”). */
export const PUBLIC_LINK_PRESETS = Object.freeze([
    { label: 'Artists', href: '/artists' },
    { label: 'Programs', href: '/programs' },
    { label: 'Join Network', href: '/join-network' },
    { label: 'Gallery Access', href: '/gallery-access' },
    { label: 'Community', href: '/community' },
]);

/**
 * @returns {string}
 */
export function createPublicLinkId() {
    return `pl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Allow only same-origin paths (`/…`) and `https://…` URLs.
 * @param {unknown} raw
 * @returns {string}
 */
export function sanitizePublicLinkHref(raw) {
    const href = String(raw ?? '').trim();
    if (!href) return '';
    if (/[\u0000-\u001f\u007f]/.test(href) || href.includes('\\')) return '';
    if (href.startsWith('/')) {
        if (href.startsWith('//')) return '';
        if (href.includes('://')) return '';
        return href;
    }
    try {
        const url = new URL(href);
        if (url.protocol !== 'https:') return '';
        return url.href;
    } catch {
        return '';
    }
}

/**
 * @param {unknown} raw
 * @returns {boolean}
 */
export function isPublicLinkHrefAllowed(raw) {
    return Boolean(sanitizePublicLinkHref(raw));
}

/**
 * Platform stills only (`https://…`).
 * @param {unknown} raw
 * @returns {string}
 */
export function sanitizePublicLinkImageUrl(raw) {
    const href = String(raw ?? '').trim();
    if (!href) return '';
    if (/[\u0000-\u001f\u007f]/.test(href) || href.includes('\\')) return '';
    try {
        const url = new URL(href);
        if (url.protocol !== 'https:') return '';
        return url.href;
    } catch {
        return '';
    }
}

/**
 * @param {unknown} raw
 * @returns {PublicLinkColorToken}
 */
export function normalizePublicLinkColorToken(raw) {
    const key = String(raw ?? '').trim().toLowerCase().replace(/^--/, '');
    return PUBLIC_LINK_COLOR_TOKENS.includes(/** @type {PublicLinkColorToken} */ (key))
        ? /** @type {PublicLinkColorToken} */ (key)
        : 'c5';
}

/**
 * @param {unknown} raw
 * @returns {PublicLinkDisplay}
 */
export function normalizePublicLinkDisplay(raw) {
    return String(raw ?? '').trim().toLowerCase() === 'card' ? 'card' : 'button';
}

/**
 * @param {unknown} raw
 * @returns {PublicLinkSourceType}
 */
export function normalizePublicLinkSourceType(raw) {
    const key = String(raw ?? '').trim().toLowerCase();
    if (key === 'artist' || key === 'journal' || key === 'video') return key;
    return 'url';
}

/**
 * Cards occupy 1 column / 1 row by default, or 2 of either.
 * @param {unknown} raw
 * @returns {PublicLinkCardSpan}
 */
export function normalizePublicLinkCardSpan(raw) {
    const n = Number(raw);
    return n === 2 ? 2 : 1;
}

/**
 * @param {unknown} raw
 * @returns {PublicLinkCardSpan}
 */
export function normalizePublicLinkCardRows(raw) {
    return normalizePublicLinkCardSpan(raw);
}

/**
 * @param {unknown} raw
 * @param {number} [max]
 * @returns {string}
 */
export function sanitizePublicLinkPlainText(raw, max = 160) {
    const text = String(raw ?? '')
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (!text) return '';
    return text.slice(0, Math.max(1, Number(max) || 160));
}

/**
 * @param {unknown} raw
 * @returns {PublicLinkCtaStyle}
 */
export function normalizePublicLinkCtaStyle(raw) {
    return String(raw ?? '').trim().toLowerCase() === 'solid' ? 'solid' : 'outline';
}

/**
 * Card CTA — default Explore, with a trailing arrow when missing.
 * @param {unknown} raw
 * @returns {string}
 */
export function formatPublicLinkCtaLabel(raw) {
    const text = sanitizePublicLinkPlainText(raw, 32) || 'Explore';
    return /[→>]$/.test(text) ? text.replace(/>$/, '→') : `${text} →`;
}

/**
 * @param {unknown} type
 * @returns {string}
 */
export function defaultPublicLinkEyebrowFromSource(type) {
    const kind = normalizePublicLinkSourceType(type);
    if (kind === 'artist') return 'Artist';
    if (kind === 'journal') return 'Journal';
    if (kind === 'video') return 'Video';
    return '';
}

/**
 * White label on brand red / ink; black on sand, sage, paper, and surface.
 * @param {unknown} token
 * @returns {'#ffffff' | '#000000'}
 */
export function contrastInkForColorToken(token) {
    const key = normalizePublicLinkColorToken(token);
    return key === 'c1' || key === 'c2' ? '#ffffff' : '#000000';
}

/**
 * @param {unknown} token
 * @returns {string}
 */
export function publicLinkColorCssVar(token) {
    return `var(--${normalizePublicLinkColorToken(token)})`;
}

/**
 * Card only when a https image is present; stale cards render as buttons.
 * @param {Partial<PublicLink> | null | undefined} link
 * @returns {PublicLinkDisplay}
 */
export function effectivePublicLinkDisplay(link) {
    if (!link || normalizePublicLinkDisplay(link.display) !== 'card') return 'button';
    return sanitizePublicLinkImageUrl(link.imageUrl) ? 'card' : 'button';
}

/**
 * @param {unknown} type
 * @param {object | null | undefined} row
 * @returns {string}
 */
export function resolvePublicLinkHrefFromSource(type, row) {
    const kind = normalizePublicLinkSourceType(type);
    if (kind === 'journal') {
        const id = String(row?.id ?? '').trim();
        return id ? `/journal/entry/${encodeURIComponent(id)}` : '/journal';
    }
    if (kind === 'video') return '/videos';
    if (kind === 'artist') {
        const rec = row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row) : {};
        const slug = String(rec.slug ?? '').trim();
        if (slug) return `/profile/${encodeURIComponent(slug)}`;
        const name =
            artistDisplayName(rec, 'en') || String(artistEnglishBlock(rec)?.name ?? '').trim();
        const derived = artistSlugFromName(name);
        return derived ? `/profile/${encodeURIComponent(derived)}` : '/artists';
    }
    return '';
}

/**
 * @param {unknown} type
 * @param {object | null | undefined} row
 * @returns {string}
 */
export function resolvePublicLinkLabelFromSource(type, row) {
    const kind = normalizePublicLinkSourceType(type);
    const rec = row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row) : {};
    if (kind === 'artist') {
        return artistDisplayName(rec, 'en') || String(rec.slug ?? 'Artist').trim();
    }
    if (kind === 'journal') {
        const en = rec.en && typeof rec.en === 'object' ? /** @type {Record<string, unknown>} */ (rec.en) : {};
        return String(en.title ?? `Entry ${rec.id ?? ''}`).trim();
    }
    if (kind === 'video') {
        return String(rec.overlayTitle ?? rec.slug ?? rec.id ?? 'Video').trim();
    }
    return '';
}

/**
 * Still image from a destination template, when present.
 * @param {unknown} type
 * @param {object | null | undefined} row
 * @returns {string}
 */
export function resolvePublicLinkImageFromSource(type, row) {
    const kind = normalizePublicLinkSourceType(type);
    const rec = row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row) : {};
    if (kind === 'artist') {
        return sanitizePublicLinkImageUrl(rec.heroProfileImage ?? rec.image ?? rec.thumb);
    }
    if (kind === 'journal') {
        const en = rec.en && typeof rec.en === 'object' ? /** @type {Record<string, unknown>} */ (rec.en) : {};
        return sanitizePublicLinkImageUrl(rec.imageSrc ?? en.imageSrc ?? rec.thumb);
    }
    if (kind === 'video') {
        return sanitizePublicLinkImageUrl(rec.posterUrl ?? rec.imageUrl ?? rec.thumb);
    }
    return '';
}

/**
 * @param {unknown} type
 * @param {object | null | undefined} row
 * @returns {string}
 */
export function resolvePublicLinkSubtextFromSource(type, row) {
    const kind = normalizePublicLinkSourceType(type);
    const rec = row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row) : {};
    if (kind === 'artist') {
        const en = artistEnglishBlock(rec) || {};
        return sanitizePublicLinkPlainText(en.medium ?? rec.medium ?? en.tagline ?? rec.tagline, 140);
    }
    if (kind === 'journal') {
        const en = rec.en && typeof rec.en === 'object' ? /** @type {Record<string, unknown>} */ (rec.en) : {};
        return sanitizePublicLinkPlainText(en.excerpt ?? en.subtitle ?? en.dek ?? rec.excerpt, 140);
    }
    if (kind === 'video') {
        return sanitizePublicLinkPlainText(rec.overlaySubtitle ?? rec.subtitle ?? rec.description, 140);
    }
    return '';
}

/**
 * @param {unknown} type
 * @param {string} id
 * @param {{ artists?: object[], journals?: object[], videos?: object[] }} [caches]
 * @returns {object | null}
 */
export function findPublicLinkSourceRow(type, id, caches = {}) {
    const key = String(id || '').trim();
    if (!key) return null;
    const kind = normalizePublicLinkSourceType(type);
    const list =
        kind === 'artist'
            ? caches.artists
            : kind === 'journal'
              ? caches.journals
              : kind === 'video'
                ? caches.videos
                : [];
    if (!Array.isArray(list)) return null;
    return (
        list.find((row) => {
            const rec = row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row) : {};
            return String(rec.id ?? '') === key || String(rec.slug ?? '') === key;
        }) || null
    );
}

/**
 * @param {unknown} raw
 * @returns {PublicLink | null}
 */
export function normalizePublicLink(raw) {
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const rec = /** @type {Record<string, unknown>} */ (raw);
    const label = String(rec.label ?? rec.name ?? rec.text ?? '').trim();
    const href = sanitizePublicLinkHref(rec.href ?? rec.url ?? rec.path ?? '');
    if (!label || !href) return null;
    const idRaw = String(rec.id ?? '').trim();
    const sortRaw = rec.sortOrder ?? rec.sort_order ?? rec.order;
    const sortOrder = Number.isFinite(Number(sortRaw)) ? Number(sortRaw) : 0;
    let enabled = true;
    if (typeof rec.enabled === 'boolean') enabled = rec.enabled;
    else if (rec.enabled != null) enabled = String(rec.enabled).trim().toLowerCase() === 'true';
    const display = normalizePublicLinkDisplay(rec.display);
    const imageUrl = sanitizePublicLinkImageUrl(rec.imageUrl ?? rec.image_url ?? rec.image);
    const sourceType = normalizePublicLinkSourceType(rec.sourceType ?? rec.source_type);
    const sourceId = String(rec.sourceId ?? rec.source_id ?? '').trim();
    return {
        id: idRaw || createPublicLinkId(),
        label,
        href,
        sortOrder,
        enabled,
        display,
        colorToken: normalizePublicLinkColorToken(rec.colorToken ?? rec.color_token ?? rec.color),
        imageUrl,
        sourceType,
        sourceId,
        cardSpan: normalizePublicLinkCardSpan(rec.cardSpan ?? rec.card_span ?? rec.columns),
        cardRows: normalizePublicLinkCardRows(rec.cardRows ?? rec.card_rows ?? rec.rows),
        eyebrow: sanitizePublicLinkPlainText(rec.eyebrow ?? rec.kicker ?? rec.category, 48),
        subtext: sanitizePublicLinkPlainText(rec.subtext ?? rec.subtitle ?? rec.description, 160),
        ctaLabel: sanitizePublicLinkPlainText(rec.ctaLabel ?? rec.cta ?? rec.buttonLabel, 32),
        ctaStyle: normalizePublicLinkCtaStyle(rec.ctaStyle ?? rec.cta_style),
        meta: sanitizePublicLinkPlainText(rec.meta ?? rec.corner ?? rec.location, 48),
    };
}

/**
 * @param {unknown} raw
 * @returns {PublicLink[]}
 */
export function normalizePublicLinks(raw) {
    let list = raw;
    if (typeof raw === 'string') {
        try {
            list = JSON.parse(raw);
        } catch {
            return [];
        }
    }
    if (!Array.isArray(list)) return [];
    /** @type {PublicLink[]} */
    const out = [];
    const seen = new Set();
    for (const item of list) {
        const link = normalizePublicLink(item);
        if (!link) continue;
        if (seen.has(link.id)) continue;
        seen.add(link.id);
        out.push(link);
    }
    return out;
}

/**
 * @param {unknown} raw
 * @returns {PublicLink[]}
 */
export function sortPublicLinks(raw) {
    const list = Array.isArray(raw) ? raw.filter((x) => x && typeof x === 'object') : normalizePublicLinks(raw);
    return [...list].sort((a, b) => {
        const ao = Number(/** @type {PublicLink} */ (a).sortOrder) || 0;
        const bo = Number(/** @type {PublicLink} */ (b).sortOrder) || 0;
        if (ao !== bo) return ao - bo;
        const al = String(/** @type {PublicLink} */ (a).label || '');
        const bl = String(/** @type {PublicLink} */ (b).label || '');
        const byLabel = al.localeCompare(bl, undefined, { sensitivity: 'base' });
        if (byLabel !== 0) return byLabel;
        return String(/** @type {PublicLink} */ (a).id || '').localeCompare(
            String(/** @type {PublicLink} */ (b).id || ''),
        );
    });
}

/**
 * Enabled links only, in public display order.
 * @param {unknown} raw
 * @returns {PublicLink[]}
 */
export function enabledPublicLinks(raw) {
    return sortPublicLinks(normalizePublicLinks(raw)).filter((link) => link.enabled);
}

/**
 * Reindex sortOrder 0..n-1 after a swap.
 * @param {PublicLink[]} links
 * @param {string} id
 * @param {-1 | 1} direction
 * @returns {PublicLink[]}
 */
export function movePublicLink(links, id, direction) {
    const sorted = sortPublicLinks(normalizePublicLinks(links));
    const i = sorted.findIndex((l) => l.id === id);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= sorted.length) return sorted;
    const next = [...sorted];
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
    return next.map((link, index) => ({ ...link, sortOrder: index }));
}

/**
 * @param {PublicLink[]} links
 * @param {PublicLink} next
 * @returns {PublicLink[]}
 */
export function upsertPublicLink(links, next) {
    const item = normalizePublicLink(next);
    if (!item) return sortPublicLinks(normalizePublicLinks(links));
    const current = normalizePublicLinks(links);
    const i = current.findIndex((l) => l.id === item.id);
    if (i < 0) current.push(item);
    else current[i] = item;
    return sortPublicLinks(current);
}

/**
 * @param {PublicLink[]} links
 * @param {string} id
 * @returns {PublicLink[]}
 */
export function removePublicLink(links, id) {
    const key = String(id || '').trim();
    return sortPublicLinks(normalizePublicLinks(links).filter((l) => l.id !== key));
}

/**
 * @param {Partial<PublicLink>} [seed]
 * @returns {PublicLink}
 */
export function emptyPublicLink(seed = {}) {
    const href = sanitizePublicLinkHref(seed.href || '') || '';
    return {
        id: String(seed.id || '').trim() || createPublicLinkId(),
        label: String(seed.label || '').trim(),
        href,
        sortOrder: Number.isFinite(Number(seed.sortOrder)) ? Number(seed.sortOrder) : 0,
        enabled: seed.enabled !== false,
        display: normalizePublicLinkDisplay(seed.display),
        colorToken: normalizePublicLinkColorToken(seed.colorToken),
        imageUrl: sanitizePublicLinkImageUrl(seed.imageUrl || ''),
        sourceType: normalizePublicLinkSourceType(seed.sourceType),
        sourceId: String(seed.sourceId || '').trim(),
        cardSpan: normalizePublicLinkCardSpan(seed.cardSpan),
        cardRows: normalizePublicLinkCardRows(seed.cardRows),
        eyebrow: sanitizePublicLinkPlainText(seed.eyebrow, 48),
        subtext: sanitizePublicLinkPlainText(seed.subtext, 160),
        ctaLabel: sanitizePublicLinkPlainText(seed.ctaLabel, 32),
        ctaStyle: normalizePublicLinkCtaStyle(seed.ctaStyle),
        meta: sanitizePublicLinkPlainText(seed.meta, 48),
    };
}
