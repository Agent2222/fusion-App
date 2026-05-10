/**
 * Default `/community` landing payload (merged with canister JSON).
 * Text fields split EN/JA; URLs are locale-agnostic.
 */
import { distributeUploadedAssetUrls } from './assetDistribution.js';

/** @returns {Record<string, unknown>} */
export function defaultCommunityPage() {
    return {
        hero: {
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
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
    const o = /** @type {Record<string, unknown>} */ (raw);
    return /** @type {Record<string, unknown>} */ (distributeUploadedAssetUrls(deepMergeCommunity(base, o)));
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

