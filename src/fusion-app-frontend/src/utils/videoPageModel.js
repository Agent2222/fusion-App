/**
 * Community video library — map canister records ↔ hero/grid feature items.
 */
import { featureItemWithoutFlags } from './communityPageDefaults.js';
import { sanitizePublicSlugSegment } from './artistSlug.js';

/** @typedef {Record<string, unknown>} CommunityVideoRecord */

/**
 * @param {unknown} headline
 * @returns {string}
 */
export function normalizeVideoSlug(headline) {
    const raw = String(headline ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return sanitizePublicSlugSegment(raw || 'video');
}

/**
 * @param {unknown} raw
 * @returns {Record<string, unknown>}
 */
export function parseVideoLocales(raw) {
    if (typeof raw === 'string' && raw.trim()) {
        try {
            const j = JSON.parse(raw);
            if (j && typeof j === 'object' && !Array.isArray(j)) return /** @type {Record<string, unknown>} */ (j);
        } catch {
            /* ignore */
        }
    }
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        return /** @type {Record<string, unknown>} */ (raw);
    }
    return {};
}

/**
 * @param {Record<string, unknown>} locales
 * @returns {string}
 */
export function stringifyVideoLocales(locales) {
    return JSON.stringify(locales && typeof locales === 'object' ? locales : {});
}

/**
 * @param {unknown} raw
 * @returns {unknown[]}
 */
function parseJsonArray(raw) {
    if (typeof raw === 'string' && raw.trim()) {
        try {
            const j = JSON.parse(raw);
            return Array.isArray(j) ? j : [];
        } catch {
            return [];
        }
    }
    return Array.isArray(raw) ? raw : [];
}

/**
 * @param {unknown} raw
 * @returns {CommunityVideoRecord}
 */
export function normalizeCommunityVideoRecord(raw) {
    const r = raw && typeof raw === 'object' && !Array.isArray(raw)
        ? /** @type {Record<string, unknown>} */ (raw)
        : {};
    const locales = parseVideoLocales(r.localesJson ?? r.locales);
    const text = (k, fb = '') => String(locales[k] ?? r[k] ?? fb).trim();
    const id = String(r.id ?? '').trim() || `vid_${Date.now()}`;
    const headlineEn = text('headlineEn');
    const slug = String(r.slug ?? '').trim() || normalizeVideoSlug(headlineEn || id);
    const imageUrl = String(r.imageUrl ?? '').trim() || String(r.posterUrl ?? '').trim();
    const posterUrl = String(r.posterUrl ?? '').trim() || imageUrl;
    const previewChapters = parseJsonArray(r.previewChaptersJson ?? r.previewChapters);
    const previewTopics = parseJsonArray(r.previewTopicsJson ?? r.previewTopics);
    const fullChapters = parseJsonArray(r.fullChaptersJson ?? r.fullChapters);
    const fullTopics = parseJsonArray(r.fullTopicsJson ?? r.fullTopics);

    return {
        id,
        slug,
        visible: r.visible !== false,
        publishedAt: String(r.publishedAt ?? r.updatedAt ?? new Date().toISOString()),
        sortOrder: Number.isFinite(Number(r.sortOrder)) ? Math.max(0, Math.floor(Number(r.sortOrder))) : 0,
        updatedAt: String(r.updatedAt ?? new Date().toISOString()),
        previewVideoUrl: String(r.previewVideoUrl ?? '').trim(),
        fullVideoKey: String(r.fullVideoKey ?? '').trim(),
        fullVideoFileName: String(r.fullVideoFileName ?? '').trim(),
        posterUrl,
        imageUrl,
        legacyVideoUrl: String(r.legacyVideoUrl ?? r.videoUrl ?? '').trim(),
        overlayTitle: String(r.overlayTitle ?? '').trim(),
        overlayGuests: String(r.overlayGuests ?? '').trim(),
        overlayDuration: String(r.overlayDuration ?? '').trim(),
        localesJson: stringifyVideoLocales({
            lineEn: text('lineEn'),
            lineJa: text('lineJa', text('lineEn')),
            kickerEn: text('kickerEn'),
            kickerJa: text('kickerJa', text('kickerEn')),
            headlineEn,
            headlineJa: text('headlineJa', headlineEn),
            bodyEn: text('bodyEn'),
            bodyJa: text('bodyJa', text('bodyEn')),
            ctaJoinLabelEn: text('ctaJoinLabelEn', 'JOIN THE COMMUNITY'),
            ctaJoinLabelJa: text('ctaJoinLabelJa', text('ctaJoinLabelEn', 'JOIN THE COMMUNITY')),
            ctaWatchLabelEn: text('ctaWatchLabelEn', 'WATCH NOW'),
            ctaWatchLabelJa: text('ctaWatchLabelJa', text('ctaWatchLabelEn', 'WATCH NOW')),
        }),
        previewChaptersJson: JSON.stringify(previewChapters),
        previewTopicsJson: JSON.stringify(previewTopics),
        fullChaptersJson: JSON.stringify(fullChapters),
        fullTopicsJson: JSON.stringify(fullTopics),
        previewChapters,
        previewTopics,
        fullChapters,
        fullTopics,
    };
}

/**
 * @param {CommunityVideoRecord} rec
 * @returns {Record<string, unknown>}
 */
export function communityVideoRecordToCandid(rec) {
    const r = normalizeCommunityVideoRecord(rec);
    return {
        id: String(r.id),
        slug: String(r.slug),
        visible: Boolean(r.visible),
        publishedAt: String(r.publishedAt),
        sortOrder: BigInt(Math.max(0, Math.floor(Number(r.sortOrder) || 0))),
        updatedAt: String(r.updatedAt),
        previewVideoUrl: String(r.previewVideoUrl ?? ''),
        fullVideoKey: String(r.fullVideoKey ?? ''),
        fullVideoFileName: String(r.fullVideoFileName ?? ''),
        posterUrl: String(r.posterUrl ?? ''),
        imageUrl: String(r.imageUrl ?? ''),
        legacyVideoUrl: String(r.legacyVideoUrl ?? ''),
        overlayTitle: String(r.overlayTitle ?? ''),
        overlayGuests: String(r.overlayGuests ?? ''),
        overlayDuration: String(r.overlayDuration ?? ''),
        localesJson: String(r.localesJson ?? '{}'),
        previewChaptersJson: String(r.previewChaptersJson ?? '[]'),
        previewTopicsJson: String(r.previewTopicsJson ?? '[]'),
        fullChaptersJson: String(r.fullChaptersJson ?? '[]'),
        fullTopicsJson: String(r.fullTopicsJson ?? '[]'),
    };
}

/**
 * @param {CommunityVideoRecord} rec
 * @returns {Record<string, unknown>}
 */
export function communityVideoRecordToFeatureItem(rec) {
    const r = normalizeCommunityVideoRecord(rec);
    const locales = parseVideoLocales(r.localesJson);
    const item = {
        ...locales,
        imageUrl: r.imageUrl,
        posterUrl: r.posterUrl,
        previewVideoUrl: r.previewVideoUrl,
        fullVideoKey: r.fullVideoKey,
        fullVideoFileName: r.fullVideoFileName,
        videoUrl: r.legacyVideoUrl,
        overlayTitle: r.overlayTitle,
        overlayGuests: r.overlayGuests,
        overlayDuration: r.overlayDuration,
        previewChapters: r.previewChapters,
        previewTopics: r.previewTopics,
        fullChapters: r.fullChapters,
        fullTopics: r.fullTopics,
        chapters: r.previewChapters,
        topics: r.previewTopics,
        videoId: r.id,
        slug: r.slug,
    };
    return featureItemWithoutFlags(item);
}

/**
 * @param {CommunityVideoRecord} rec
 */
export function videoMediaStatus(rec) {
    const r = normalizeCommunityVideoRecord(rec);
    return {
        hasPreview: Boolean(String(r.previewVideoUrl ?? '').trim() || String(r.legacyVideoUrl ?? '').trim()),
        hasFull: Boolean(String(r.fullVideoKey ?? '').trim()),
        hasPoster: Boolean(String(r.posterUrl ?? r.imageUrl ?? '').trim()),
    };
}

/**
 * @param {CommunityVideoRecord[]} allVideos
 * @param {{ featuredVideoIds?: string[], heroVideoId?: string | null }} featuredConfig
 * @returns {CommunityVideoRecord[]}
 */
export function resolveFeaturedVideos(allVideos, featuredConfig = {}) {
    const list = Array.isArray(allVideos) ? allVideos.map(normalizeCommunityVideoRecord) : [];
    const visible = list.filter((v) => v.visible !== false);
    const ids = Array.isArray(featuredConfig.featuredVideoIds)
        ? featuredConfig.featuredVideoIds.map(String).filter(Boolean)
        : [];
    if (ids.length) {
        const byId = new Map(visible.map((v) => [String(v.id), v]));
        return ids.map((id) => byId.get(id)).filter(Boolean).slice(0, 6);
    }
    return [...visible]
        .sort((a, b) => {
            const sa = Number(a.sortOrder) || 0;
            const sb = Number(b.sortOrder) || 0;
            if (sa !== sb) return sa - sb;
            return String(b.publishedAt).localeCompare(String(a.publishedAt));
        })
        .slice(0, 6);
}

/**
 * @param {unknown} item
 */
export function featureItemVideoId(item) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return '';
    const o = /** @type {Record<string, unknown>} */ (item);
    return String(o.videoId ?? o.id ?? '').trim();
}

/**
 * Split visible library videos into Recent (featured) vs catalog (non-featured) lists.
 *
 * @param {CommunityVideoRecord[]} allVideos
 * @param {{ featuredVideoIds?: string[], heroVideoId?: string | null }} featuredConfig
 */
export function partitionVideosForPage(allVideos, featuredConfig = {}) {
    const visible = (Array.isArray(allVideos) ? allVideos : [])
        .map(normalizeCommunityVideoRecord)
        .filter((v) => v.visible !== false);
    const featuredRecords = resolveFeaturedVideos(visible, featuredConfig);
    const featuredIds = new Set(featuredRecords.map((r) => String(r.id)).filter(Boolean));
    const allItems = visible.map((r) => communityVideoRecordToFeatureItem(r));
    const recentItems = featuredRecords.map((r) => communityVideoRecordToFeatureItem(r));
    const catalogItems = allItems.filter((it) => {
        const id = featureItemVideoId(it);
        return id && !featuredIds.has(id);
    });
    const heroPool = featuredRecords.length ? featuredRecords : visible.slice(0, 6);
    const { item: heroItem, index: heroIndex } = resolveHeroVideo(heroPool, featuredConfig.heroVideoId);
    return {
        allItems,
        recentItems,
        catalogItems,
        featuredRecords,
        featuredIds: [...featuredIds],
        heroItem,
        heroIndex,
    };
}

/**
 * @param {CommunityVideoRecord[]} featuredList
 * @param {string | null | undefined} heroVideoId
 */
export function resolveHeroVideo(featuredList, heroVideoId) {
    const list = Array.isArray(featuredList) ? featuredList : [];
    const want = String(heroVideoId ?? '').trim();
    let index = want ? list.findIndex((v) => String(v.id) === want) : -1;
    if (index < 0 && list.length) index = 0;
    const item = index >= 0 ? communityVideoRecordToFeatureItem(list[index]) : {};
    return { item, index };
}

/**
 * @param {Record<string, unknown>} exclusiveItem
 * @param {number} index
 * @returns {CommunityVideoRecord}
 */
export function legacyExclusiveItemToVideoRecord(exclusiveItem, index = 0) {
    const item = exclusiveItem && typeof exclusiveItem === 'object' ? exclusiveItem : {};
    const locales = {
        lineEn: String(item.lineEn ?? ''),
        lineJa: String(item.lineJa ?? ''),
        kickerEn: String(item.kickerEn ?? ''),
        kickerJa: String(item.kickerJa ?? ''),
        headlineEn: String(item.headlineEn ?? ''),
        headlineJa: String(item.headlineJa ?? ''),
        bodyEn: String(item.bodyEn ?? ''),
        bodyJa: String(item.bodyJa ?? ''),
        ctaJoinLabelEn: String(item.ctaJoinLabelEn ?? ''),
        ctaJoinLabelJa: String(item.ctaJoinLabelJa ?? ''),
        ctaWatchLabelEn: String(item.ctaWatchLabelEn ?? ''),
        ctaWatchLabelJa: String(item.ctaWatchLabelJa ?? ''),
    };
    const headlineEn = locales.headlineEn || `Community video ${index + 1}`;
    return normalizeCommunityVideoRecord({
        id: `legacy-exclusive-${index + 1}`,
        slug: normalizeVideoSlug(headlineEn),
        visible: item.visible !== false,
        publishedAt: new Date().toISOString(),
        sortOrder: index,
        updatedAt: new Date().toISOString(),
        previewVideoUrl: item.previewVideoUrl,
        fullVideoKey: item.fullVideoKey,
        fullVideoFileName: item.fullVideoFileName,
        posterUrl: item.posterUrl,
        imageUrl: item.imageUrl,
        legacyVideoUrl: item.videoUrl,
        overlayTitle: item.overlayTitle,
        overlayGuests: item.overlayGuests,
        overlayDuration: item.overlayDuration,
        localesJson: stringifyVideoLocales(locales),
        previewChaptersJson: JSON.stringify(item.previewChapters ?? item.chapters ?? []),
        previewTopicsJson: JSON.stringify(item.previewTopics ?? item.topics ?? []),
        fullChaptersJson: JSON.stringify(item.fullChapters ?? []),
        fullTopicsJson: JSON.stringify(item.fullTopics ?? []),
    });
}
