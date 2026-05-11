/**
 * Default `/community` landing payload (merged with canister JSON).
 * Text fields split EN/JA; URLs are locale-agnostic.
 */
import { distributeUploadedAssetUrls } from './assetDistribution.js';

/** @returns {Record<string, unknown>} */
export function defaultCommunityPage() {
    return {
        sections: {
            hero: true,
            exclusive: true,
            connect: true,
            network: true,
            sessions: true,
            promo: true,
            join: true,
        },
        hero: {
            imageUrl: '',
            lineEn: 'VIDEO · Studio Visit · Artist · 18 min',
            lineJa: '動画 · スタジオ訪問 · アーティスト · 18分',
            videoUrl: '',
            previewVideoUrl: '',
            fullVideoKey: '',
            fullVideoFileName: '',
            posterUrl: '',
            overlayTitle: '',
            overlayGuests: '',
            overlayDuration: '',
            kickerEn: 'COMMUNITY',
            kickerJa: 'コミュニティ',
            headlineEn: 'Exclusive Content. Meaningful Connection.',
            headlineJa: '独占コンテンツ。意味のあるつながり。',
            bodyEn:
                'Join members for studio visits, conversations, and sessions—online and on the ground.',
            bodyJa:
                'メンバーとして、スタジオ訪問や対話、オンライン／現地のセッションにご参加ください。',
            ctaJoinLabelEn: 'JOIN THE COMMUNITY',
            ctaJoinLabelJa: 'コミュニティに参加',
            ctaWatchLabelEn: 'WATCH NOW',
            ctaWatchLabelJa: '視聴する',
            chapters: [],
            topics: [],
        },
        exclusive: [
            {
                imageUrl: '',
                lineEn: 'VIDEO · Studio Visit · Artist · 18 min',
                lineJa: '動画 · スタジオ訪問 · アーティスト · 18分',
                href: '/journal',
            },
            {
                imageUrl: '',
                lineEn: 'AUDIO · Material Stories · Artist · 24 min',
                lineJa: '音声 · マテリアルの物語 · アーティスト · 24分',
                href: '/journal',
            },
            {
                imageUrl: '',
                lineEn: 'VIDEO · Process · Artist · 15 min',
                lineJa: '動画 · プロセス · アーティスト · 15分',
                href: '/journal',
            },
        ],
        connect: {
            titleEn: 'CONNECT',
            titleJa: 'つながる',
            howItWorksHref: '/context',
            howItWorksLabelEn: 'How it works',
            howItWorksLabelJa: '仕組み',
            browseHref: '/community',
            browseLabelEn: 'BROWSE COMMUNITY',
            browseLabelJa: 'コミュニティを見る',
            bites: [
                {
                    titleEn: 'Find',
                    titleJa: '見つける',
                    bodyEn: 'Discover artists, curators, and spaces aligned with your practice.',
                    bodyJa: '実践に合ったアーティスト、キュレーター、スペースを見つけます。',
                },
                {
                    titleEn: 'Connect',
                    titleJa: 'つながる',
                    bodyEn: 'Reach out through Fusion’s member network.',
                    bodyJa: 'Fusion のメンバーネットワークからご連絡ください。',
                },
                {
                    titleEn: 'Collaborate',
                    titleJa: '協働',
                    bodyEn: 'Build shows, editions, and residencies together.',
                    bodyJa: '展示、エディション、レジデンシーを共に育てます。',
                },
            ],
        },
        networkCards: [],
        sessions: [],
        promo: {
            headlineEn: 'This is your space. Share. Connect. Create what’s next.',
            headlineJa: 'ここはあなたの場所。共有し、つながり、次を創る。',
            sublineEn: 'FUSION COMMUNITY · By invitation only.',
            sublineJa: 'FUSION コミュニティ · 招待制',
        },
    };
}

/**
 * @param {unknown} raw
 * @returns {Record<string, unknown>}
 */
export function normalizeCommunityPage(raw) {
    const base = /** @type {Record<string, unknown>} */ (
        JSON.parse(JSON.stringify(defaultCommunityPage()))
    );
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        normalizeCommunityFeatureItems(base);
        return base;
    }
    const o = /** @type {Record<string, unknown>} */ (raw);
    const merged = deepMergeCommunity(base, o);
    normalizeCommunityFeatureItems(merged);
    return /** @type {Record<string, unknown>} */ (distributeUploadedAssetUrls(merged));
}

/**
 * @param {Record<string, unknown>} bundle
 */
function normalizeCommunityFeatureItems(bundle) {
    const hero = normalizeFeatureItem(bundle.hero, {});
    bundle.hero = hero;
    const rawExclusive = Array.isArray(bundle.exclusive) ? bundle.exclusive : [];
    const fallbackItems = defaultCommunityPage().exclusive;
    bundle.exclusive = rawExclusive.slice(0, 6).map((item, i) =>
        normalizeFeatureItem(item, {
            ...hero,
            ...(fallbackItems[i] && typeof fallbackItems[i] === 'object' ? fallbackItems[i] : {}),
        }),
    );
    while (bundle.exclusive.length < 3) {
        const i = bundle.exclusive.length;
        bundle.exclusive.push(
            normalizeFeatureItem(fallbackItems[i] || {}, {
                ...hero,
                ...(fallbackItems[i] && typeof fallbackItems[i] === 'object' ? fallbackItems[i] : {}),
            }),
        );
    }
}

/**
 * @param {unknown} raw
 * @param {Record<string, unknown>} fallback
 * @returns {Record<string, unknown>}
 */
function normalizeFeatureItem(raw, fallback) {
    const item = raw && typeof raw === 'object' && !Array.isArray(raw)
        ? /** @type {Record<string, unknown>} */ (raw)
        : {};
    const text = (key, fb = '') => String(item[key] ?? fallback[key] ?? fb);
    const imageUrl = text('imageUrl', text('posterUrl'));
    const posterUrl = text('posterUrl', imageUrl);
    return {
        imageUrl,
        lineEn: text('lineEn'),
        lineJa: text('lineJa', text('lineEn')),
        href: text('href', '#'),
        videoUrl: text('videoUrl'),
        previewVideoUrl: text('previewVideoUrl'),
        fullVideoKey: text('fullVideoKey'),
        fullVideoFileName: text('fullVideoFileName'),
        posterUrl,
        overlayTitle: text('overlayTitle'),
        overlayGuests: text('overlayGuests'),
        overlayDuration: text('overlayDuration'),
        kickerEn: text('kickerEn'),
        kickerJa: text('kickerJa', text('kickerEn')),
        headlineEn: text('headlineEn'),
        headlineJa: text('headlineJa', text('headlineEn')),
        bodyEn: text('bodyEn'),
        bodyJa: text('bodyJa', text('bodyEn')),
        ctaJoinLabelEn: text('ctaJoinLabelEn', 'JOIN THE COMMUNITY'),
        ctaJoinLabelJa: text('ctaJoinLabelJa', text('ctaJoinLabelEn', 'JOIN THE COMMUNITY')),
        ctaWatchLabelEn: text('ctaWatchLabelEn', 'WATCH NOW'),
        ctaWatchLabelJa: text('ctaWatchLabelJa', text('ctaWatchLabelEn', 'WATCH NOW')),
        chapters: normalizeChapters(item.chapters ?? fallback.chapters),
        topics: normalizeTopics(item.topics ?? fallback.topics),
    };
}

/**
 * @param {unknown} raw
 * @returns {Array<{ artistId: string, timestampSec: number }>}
 */
function normalizeChapters(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((chapter) => {
            const c = chapter && typeof chapter === 'object' ? /** @type {Record<string, unknown>} */ (chapter) : {};
            const artistId = String(c.artistId ?? c.artist_id ?? '').trim();
            const timestampSec = toTimestampSec(c.timestampSec ?? c.timeSec ?? c.timestamp ?? c.time);
            return artistId && timestampSec >= 0 ? { artistId, timestampSec } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.timestampSec - b.timestampSec);
}

/**
 * @param {unknown} raw
 * @returns {Array<{ timestampSec: number, titleEn: string, titleJa: string, quoteEn: string, quoteJa: string }>}
 */
function normalizeTopics(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((topic) => {
            const t = topic && typeof topic === 'object' ? /** @type {Record<string, unknown>} */ (topic) : {};
            const timestampSec = toTimestampSec(t.timestampSec ?? t.timeSec ?? t.timestamp ?? t.time);
            const titleEn = String(t.titleEn ?? t.title ?? '').trim();
            const titleJa = String(t.titleJa ?? t.titleEn ?? t.title ?? '').trim();
            const quoteEn = String(t.quoteEn ?? t.quote ?? t.bodyEn ?? '').trim();
            const quoteJa = String(t.quoteJa ?? t.quoteEn ?? t.quote ?? t.bodyJa ?? '').trim();
            return titleEn || titleJa || quoteEn || quoteJa
                ? { timestampSec, titleEn, titleJa, quoteEn, quoteJa }
                : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.timestampSec - b.timestampSec);
}

/**
 * @param {unknown} raw
 */
function toTimestampSec(raw) {
    if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, Math.floor(raw));
    const text = String(raw ?? '').trim();
    if (!text) return 0;
    if (/^\d+(\.\d+)?$/.test(text)) return Math.max(0, Math.floor(Number(text)));
    const parts = text.split(':').map((part) => Number(part));
    if (parts.some((part) => !Number.isFinite(part))) return 0;
    if (parts.length === 2) return Math.max(0, Math.floor(parts[0] * 60 + parts[1]));
    if (parts.length === 3) return Math.max(0, Math.floor(parts[0] * 3600 + parts[1] * 60 + parts[2]));
    return 0;
}

/**
 * @param {Record<string, unknown>} base
 * @param {Record<string, unknown>} patch
 */
function deepMergeCommunity(base, patch) {
    for (const k of Object.keys(patch)) {
        const pv = patch[k];
        const bv = base[k];
        if (
            pv &&
            typeof pv === 'object' &&
            !Array.isArray(pv) &&
            bv &&
            typeof bv === 'object' &&
            !Array.isArray(bv)
        ) {
            deepMergeCommunity(/** @type {Record<string, unknown>} */ (bv), /** @type {Record<string, unknown>} */ (pv));
        } else {
            base[k] = pv;
        }
    }
    return base;
}

