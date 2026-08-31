/**
 * Test JSON vs live canister data.
 *
 * Precedence: `localStorage['fusion-data-source']` (`test` | `live`) wins when set; otherwise
 * `config.testData` / `VITE_USE_TEST_DATA` → `'test'` vs `'live'` (see ../config.js).
 * Live home blocks (`getProgramHero`, etc.) use canister site settings only — no silent testData fallback.
 */
import {
    config,
    FUSION_DATA_SOURCE_STORAGE_KEY,
    getPublicSiteOrigin,
} from '../config.js';
import { testData } from '../testData.js';
import {
    applyFeaturedFlagsFromStudioSave,
    artistFeaturedMetaFromCanister,
    mergeArtistFeaturedExtension,
    readArtistFeaturedMeta,
    resolveFeaturedArtistsForPublic,
    setFeaturableForArtist,
    setManualFeaturedForArtist,
    setRandomFeaturedMode,
} from './artistFeaturedExtension.js';
import { getFusionBackendActor } from './earlyAccessSubscribe.js';
import { getStudioAuthenticatedActor } from './studioAuth.js';
import { mergeStudioPermissionMap, parseStudioPermissionMatrixTuples } from './studioPermissionFeatures.js';
import { getApplicantManualDepositSubmitted, getApplicantSponsorshipMode } from './studioPlainForms.js';
import {
    artistRecordToTestOverlayShape,
    cohortNatPairsForCanisterBulk,
    collectAccessCodesFromArtists,
    extractArrayFromBatchJson,
    normalizeArtistImportRow,
    normalizeProgramImportRow,
    toMotokoArtistRecord,
} from './studioBatchImport.js';
import {
    hasFirebaseIntroGalleryUrl,
    legacyHeroUrl,
    legacyIntroUrl,
    legacyProfileFileStem,
    needsIntroGallerySync,
} from './studioLegacyProfileUrls.js';
import { normalizeLocalesWorldForStorage } from './worldNormalize.js';
import { sanitizeLlmTextOutput } from './llmTextSanitize.js';
import {
    applyGeneratedWorldBlocksToLocales,
    buildTrimmedSourceJsonForLlm,
    generateEnglishAndJapaneseWorldFromSourceJson,
    hasUsableWorldLlmSourceInput,
    parseLocalesFromArtistRow,
    translateWorldEnToJa,
} from './studioArtistWorldLlm.js';
import { sendEmail } from './integrationApi.js';
import { getApplicationStaffNotificationEmails } from './studioServicesConfig.js';
import { distributeUploadedAssetUrls, toCloudFrontAssetUrl } from './assetDistribution.js';
import { filterPublishedJournalEntries, resolveHomeJournalCarouselEntries, sortJournalEntriesNewestFirst } from './journalPublicVisibility.js';
import {
    clampScheduleAvailability,
    formatScheduleCanisterError,
    normalizeScheduleImportance,
    normalizeScheduleRsvpIds,
    parseCanisterJsonText,
} from './scheduleModel.js';
import {
    MAX_ARTIST_AUDIO_ENTRIES,
    addArtistAudioEntry,
    emptyArtistAudioCollection,
    normalizeArtistAudioCollection,
    removeArtistAudioEntry,
    replaceArtistAudioEntry,
    setArtistAudioHighlight,
} from './artistAudioCollection.js';

export { hasUsableWorldLlmSourceInput };

/**
 * Roster `ArtistCore.visibility` values (on-chain, lowercase).
 * @type {Readonly<['inactive', 'pending', 'private', 'public']>}
 */
export const ARTIST_ROSTER_VISIBILITIES = Object.freeze(
    /** @type {const} */ (['inactive', 'pending', 'private', 'public'])
);

/**
 * @param {unknown} raw
 * @returns {'inactive' | 'pending' | 'private' | 'public'}
 */
export function normalizeArtistRosterVisibility(raw) {
    const s = String(raw ?? '')
        .trim()
        .toLowerCase();
    if (s === 'inactive' || s === 'pending' || s === 'private' || s === 'public') {
        return s;
    }
    return 'public';
}

/**
 * @param {unknown} vis
 * @returns {boolean} True if the artist should appear on public marketing feeds and directory.
 */
export function artistRosterInPublicDirectory(vis) {
    return normalizeArtistRosterVisibility(vis) === 'public';
}

const STORAGE_KEY = FUSION_DATA_SOURCE_STORAGE_KEY;

/** Site setting key: JSON for program application “what’s included” global bullets (EN/JA). */
export const SITE_SETTING_APPLICATION_PAYMENT_GLOBAL = 'applicationPaymentGlobal';

/** Site setting key: JSON for public platform update banner (enabled + EN/JA messages). */
export const SITE_SETTING_PLATFORM_UPDATE_BANNER = 'platformUpdateBanner';

/** localStorage keys (Studio test mode overlays). */
const LS_SUBSCRIBERS = 'subscribers';
const LS_APPLICANTS = 'applicants';
const LS_APPLICANT_EMAIL_OUTREACH = 'fusion-studio-applicant-email-outreach';
/** Per-id artist field overrides (imported, accessCode, locales, …). */
const LS_ARTISTS_OVERLAY = 'artistsOverlay';
/** Test-mode Program Draw past recipients by artist id. */
const LS_DRAW_RECIPIENTS = 'artistDrawRecipients';
const LS_PROGRAMS_BLOCK = 'allProgramsBlock';
const LS_JOURNALS = 'journals';
const LS_EDITIONS = 'editions';
const LS_CONTENT_PREFIX = 'content-';

const LS_STUDIO_PREFIX = 'fusion-studio-';

/** Test-mode overlay for `applicationPaymentGlobal` site JSON (`database.js` getApplicationPaymentGlobal). */
const LS_APPLICATION_PAYMENT_GLOBAL = 'fusion-test-application-payment-global';

/** Test-mode overlay for `platformUpdateBanner` site JSON. */
const LS_PLATFORM_UPDATE_BANNER = 'fusion-test-platform-update-banner';

/**
 * @returns {{ enabled: boolean, messageEn: string, messageJa: string }}
 */
export function defaultPlatformUpdateBanner() {
    return {
        enabled: false,
        messageEn: "We're updating the platform — please check back soon.",
        messageJa: 'プラットフォームを更新中です。しばらくしてから再度ご確認ください。',
    };
}

/**
 * @param {unknown} raw
 * @returns {{ enabled: boolean, messageEn: string, messageJa: string }}
 */
export function parsePlatformUpdateBannerJson(raw) {
    const base = defaultPlatformUpdateBanner();
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return base;
    const o = /** @type {Record<string, unknown>} */ (raw);
    if (typeof o.enabled === 'boolean') base.enabled = o.enabled;
    else if (o.enabled != null) base.enabled = String(o.enabled).trim().toLowerCase() === 'true';
    const en = String(o.messageEn ?? o.message_en ?? '').trim();
    const ja = String(o.messageJa ?? o.message_ja ?? '').trim();
    if (en) base.messageEn = en;
    if (ja) base.messageJa = ja;
    return base;
}

/**
 * Public platform update banner (site setting `platformUpdateBanner`).
 * Live: `getSiteSetting`; test: localStorage overlay or `testData.platformUpdateBanner`.
 * @returns {Promise<{ enabled: boolean, messageEn: string, messageJa: string }>}
 */
export async function getPlatformUpdateBanner() {
    if (getDataSource() === 'test') {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const v = window.localStorage.getItem(LS_PLATFORM_UPDATE_BANNER);
                if (v != null && String(v).trim() !== '') {
                    try {
                        return parsePlatformUpdateBannerJson(JSON.parse(String(v)));
                    } catch {
                        /* fall through */
                    }
                }
            }
        } catch {
            /* ignore */
        }
        const td = /** @type {unknown} */ (testData.platformUpdateBanner);
        if (td != null && typeof td === 'object') {
            try {
                return parsePlatformUpdateBannerJson(td);
            } catch {
                /* ignore */
            }
        }
        return defaultPlatformUpdateBanner();
    }
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.getSiteSetting !== 'function') return defaultPlatformUpdateBanner();
        const opt = await actor.getSiteSetting(SITE_SETTING_PLATFORM_UPDATE_BANNER);
        const raw = unwrapOpt(opt);
        if (raw == null || String(raw).trim() === '') return defaultPlatformUpdateBanner();
        try {
            return parsePlatformUpdateBannerJson(JSON.parse(String(raw)));
        } catch {
            return defaultPlatformUpdateBanner();
        }
    } catch {
        return defaultPlatformUpdateBanner();
    }
}

/**
 * Persist platform update banner (admin). Uses `setSiteSetting('platformUpdateBanner', json)`.
 * @param {{ enabled?: boolean, messageEn?: string, messageJa?: string }} value
 * @returns {Promise<void>}
 */
export async function setPlatformUpdateBanner(value) {
    const normalized = parsePlatformUpdateBannerJson(value);
    const json = JSON.stringify(normalized);
    if (getDataSource() === 'test') {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(LS_PLATFORM_UPDATE_BANNER, json);
            }
        } catch {
            /* ignore */
        }
        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent('fusion-platform-update-banner-change', { detail: normalized }),
            );
        }
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.setSiteSetting !== 'function') {
        throw new Error('setSiteSetting unavailable — deploy backend and run dfx generate.');
    }
    await actor.setSiteSetting(SITE_SETTING_PLATFORM_UPDATE_BANNER, json);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(
            new CustomEvent('fusion-platform-update-banner-change', { detail: normalized }),
        );
    }
}

/**
 * @type {readonly string[]}
 */
const APPLICATION_PAYMENT_GLOBAL_CHROME_KEYS = [
    'securePaymentLine',
    'choosePaymentHeading',
    'choosePaymentSubtext',
    'paymentPlaceholderExtended',
    'paymentPlaceholderTitle',
    'paymentPlaceholderSub',
    'footerThankYou',
    'footerQuestionsPrefix',
    'footerContactUs',
];

/**
 * @returns {{ en: Record<string, unknown>, ja: Record<string, unknown> }}
 */
export function defaultApplicationPaymentGlobal() {
    return {
        en: { whatsIncludedBullets: [] },
        ja: { whatsIncludedBullets: [] },
    };
}

/**
 * @param {unknown} block
 * @param {Record<string, unknown>} target
 */
function mergeApplicationPaymentGlobalLocaleBlock(block, target) {
    if (!block || typeof block !== 'object' || Array.isArray(block)) return;
    const o = /** @type {Record<string, unknown>} */ (block);
    const bullets = o.whatsIncludedBullets;
    if (Array.isArray(bullets)) {
        target.whatsIncludedBullets = bullets.map((x) => String(x ?? '').trim()).filter(Boolean);
    }
    for (const key of APPLICATION_PAYMENT_GLOBAL_CHROME_KEYS) {
        const v = String(o[key] ?? '').trim();
        if (v) target[key] = v;
    }
}

/**
 * @param {unknown} raw
 * @returns {{ en: { whatsIncludedBullets: string[] }, ja: { whatsIncludedBullets: string[] } }}
 */
export function parseApplicationPaymentGlobalJson(raw) {
    const base = defaultApplicationPaymentGlobal();
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return base;
    const o = /** @type {Record<string, unknown>} */ (raw);
    for (const loc of /** @type {const} */ (['en', 'ja'])) {
        const block = o[loc];
        mergeApplicationPaymentGlobalLocaleBlock(block, base[loc]);
    }
    return base;
}

/**
 * Global “what’s included” bullets for the program application form (site setting `applicationPaymentGlobal`).
 * Live: `getSiteSetting`; test: `localStorage` overlay or `testData.applicationPaymentGlobal`.
 * @returns {Promise<{ en: { whatsIncludedBullets: string[] }, ja: { whatsIncludedBullets: string[] } }>}
 */
export async function getApplicationPaymentGlobal() {
    if (getDataSource() === 'test') {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const v = window.localStorage.getItem(LS_APPLICATION_PAYMENT_GLOBAL);
                if (v != null && String(v).trim() !== '') {
                    try {
                        return parseApplicationPaymentGlobalJson(JSON.parse(String(v)));
                    } catch {
                        /* fall through */
                    }
                }
            }
        } catch {
            /* ignore */
        }
        const td = /** @type {unknown} */ (testData.applicationPaymentGlobal);
        if (td != null && typeof td === 'object') {
            try {
                return parseApplicationPaymentGlobalJson(td);
            } catch {
                /* ignore */
            }
        }
        return defaultApplicationPaymentGlobal();
    }
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.getSiteSetting !== 'function') return defaultApplicationPaymentGlobal();
        const opt = await actor.getSiteSetting(SITE_SETTING_APPLICATION_PAYMENT_GLOBAL);
        const raw = unwrapOpt(opt);
        if (raw == null || String(raw).trim() === '') return defaultApplicationPaymentGlobal();
        try {
            return parseApplicationPaymentGlobalJson(JSON.parse(String(raw)));
        } catch {
            return defaultApplicationPaymentGlobal();
        }
    } catch {
        return defaultApplicationPaymentGlobal();
    }
}

/**
 * Persist global application payment copy (admin). Uses `setSiteSetting('applicationPaymentGlobal', json)`.
 * Test mode writes `localStorage` only.
 * @param {{ en: { whatsIncludedBullets: string[] }, ja: { whatsIncludedBullets: string[] } }} value
 * @returns {Promise<void>}
 */
export async function setApplicationPaymentGlobal(value) {
    const normalized = parseApplicationPaymentGlobalJson(value);
    const json = JSON.stringify(normalized);
    if (getDataSource() === 'test') {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(LS_APPLICATION_PAYMENT_GLOBAL, json);
            }
        } catch {
            /* ignore */
        }
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fusion-data-source-change', { detail: { source: 'test' } }));
        }
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.setSiteSetting !== 'function') {
        throw new Error('setSiteSetting unavailable — deploy backend and run dfx generate.');
    }
    await actor.setSiteSetting(SITE_SETTING_APPLICATION_PAYMENT_GLOBAL, json);
}

/**
 * Where this slug is primarily edited in Fusion Studio (Content tab lists only `content`).
 * @typedef {'home' | 'programs' | 'products' | 'journal' | 'content' | 'user-studio' | 'join-network'} StudioSurface
 */

/**
 * CMS pages: slug for canister + testData root key.
 * `editorMode`: `locales` = top-level EN/JA in Studio (merge with siblings like `order`, `routeLink`);
 * `full` = entire JSON blob (nested keys, arrays, join flows), including `info`, `allPrograms`, `editions`, `journals`, `programHero`.
 * `primaryStudioSurface`: drives the slim Content tab; entity/Home tabs embed the same slug UIs.
 * `studioSurfaces`: all surfaces that may open an editor for this slug (e.g. site-info chapters).
 * Entity tabs — see docs/STUDIO_TESTDATA_MATRIX.md.
 * @type {readonly { key: string, slug: string, testKey: keyof typeof testData | string, label: string, editorMode?: 'locales' | 'full', primaryStudioSurface: StudioSurface, studioSurfaces: StudioSurface[] }[]}
 */
export const CONTENT_PAGE_REGISTRY = [
    {
        key: 'terms',
        slug: 'terms',
        testKey: 'termsAndConditions',
        label: 'Terms & Conditions',
        editorMode: 'locales',
        primaryStudioSurface: 'content',
        studioSurfaces: ['content'],
    },
    {
        key: 'privacy',
        slug: 'privacy',
        testKey: 'privacyPolicy',
        label: 'Privacy Policy',
        editorMode: 'locales',
        primaryStudioSurface: 'content',
        studioSurfaces: ['content'],
    },
    {
        key: 'contact',
        slug: 'contact',
        testKey: 'contact',
        label: 'Contact',
        editorMode: 'locales',
        primaryStudioSurface: 'content',
        studioSurfaces: ['content'],
    },
    {
        key: 'faq',
        slug: 'faq',
        testKey: 'faq',
        label: 'FAQ',
        editorMode: 'locales',
        primaryStudioSurface: 'content',
        studioSurfaces: ['content'],
    },
    {
        key: 'applicationProcess',
        slug: 'application-process',
        testKey: 'applicationProcess',
        label: 'Application process',
        editorMode: 'locales',
        primaryStudioSurface: 'content',
        studioSurfaces: ['content'],
    },
    {
        key: 'context',
        slug: 'context',
        testKey: 'context',
        label: 'Context page',
        editorMode: 'locales',
        primaryStudioSurface: 'content',
        studioSurfaces: ['content'],
    },
    {
        key: 'siteInfo',
        slug: 'site-info',
        testKey: 'info',
        label: 'Site info blocks (home, programs, editions, journal)',
        editorMode: 'full',
        primaryStudioSurface: 'home',
        studioSurfaces: ['home', 'programs', 'products', 'journal'],
    },
    {
        key: 'allProgramsBlock',
        slug: 'all-programs',
        testKey: 'allPrograms',
        label: 'Programs block (order + program cards)',
        editorMode: 'full',
        primaryStudioSurface: 'programs',
        studioSurfaces: ['programs'],
    },
    {
        key: 'editionsFeed',
        slug: 'editions-feed',
        testKey: 'editions',
        label: 'Editions grid (items)',
        editorMode: 'full',
        primaryStudioSurface: 'products',
        studioSurfaces: ['products'],
    },
    {
        key: 'journalsBlock',
        slug: 'journals-block',
        testKey: 'journals',
        label: 'Journal — home list (order + entries)',
        editorMode: 'full',
        primaryStudioSurface: 'journal',
        studioSurfaces: ['journal'],
    },
    {
        key: 'programHero',
        slug: 'program-hero',
        testKey: 'programHero',
        label: 'Home — program hero',
        editorMode: 'full',
        primaryStudioSurface: 'home',
        studioSurfaces: ['home'],
    },
    {
        key: 'galleryAccessCta',
        slug: 'gallery-access-cta',
        testKey: 'galleryAccessCta',
        label: 'Home — gallery access CTA',
        editorMode: 'locales',
        primaryStudioSurface: 'home',
        studioSurfaces: ['home'],
    },
    {
        key: 'eventRow',
        slug: 'event-row',
        testKey: 'eventRow',
        label: 'Event row (by context)',
        editorMode: 'full',
        primaryStudioSurface: 'home',
        studioSurfaces: ['home'],
    },
    {
        key: 'objectsHighlight',
        slug: 'objects-highlight',
        testKey: 'objectsHighlight',
        label: 'Objects highlight',
        editorMode: 'full',
        primaryStudioSurface: 'home',
        studioSurfaces: ['home'],
    },
    {
        key: 'joinNetwork',
        slug: 'join-network',
        testKey: 'joinNetwork',
        label: 'Join network blocks',
        editorMode: 'full',
        primaryStudioSurface: 'home',
        studioSurfaces: ['home'],
    },
    {
        key: 'joinNetworkFlow',
        slug: 'join-network-flow',
        testKey: 'joinNetworkFlow',
        label: 'Join network modal flows',
        editorMode: 'full',
        primaryStudioSurface: 'home',
        studioSurfaces: ['home'],
    },
    {
        key: 'quoteRow',
        slug: 'quote-row',
        testKey: 'quoteRow',
        label: 'Quote row (by context)',
        editorMode: 'full',
        primaryStudioSurface: 'home',
        studioSurfaces: ['home'],
    },
    {
        key: 'featureCards',
        slug: 'feature-cards',
        testKey: 'featureCards',
        label: 'Feature cards (by area)',
        editorMode: 'full',
        primaryStudioSurface: 'home',
        studioSurfaces: ['home'],
    },
    {
        key: 'events',
        slug: 'events',
        testKey: 'events',
        label: 'Events list',
        editorMode: 'full',
        primaryStudioSurface: 'home',
        studioSurfaces: ['home'],
    },
    {
        key: 'audio',
        slug: 'audio',
        testKey: 'audio',
        label: 'Audio tracks',
        editorMode: 'full',
        primaryStudioSurface: 'home',
        studioSurfaces: ['home'],
    },
    {
        key: 'artistsPage',
        slug: 'artists-page',
        testKey: 'artistsPage',
        label: 'Artists page — shout headline',
        editorMode: 'locales',
        primaryStudioSurface: 'content',
        studioSurfaces: ['content'],
    },
    {
        key: 'userStudio',
        slug: 'user-studio',
        testKey: 'userStudio',
        label: 'User Studio — quotes, blindspots, guidance',
        editorMode: 'full',
        primaryStudioSurface: 'user-studio',
        studioSurfaces: ['user-studio'],
    },
    {
        key: 'joinNetworkPage',
        slug: 'join-network-page',
        testKey: 'joinNetworkPage',
        label: 'Join Network page (/join-network)',
        editorMode: 'locales',
        primaryStudioSurface: 'join-network',
        studioSurfaces: ['join-network'],
    },
    {
        key: 'programDraw',
        slug: 'program-draw',
        testKey: 'programDraw',
        label: 'Program Draw (display + About)',
        editorMode: 'locales',
        primaryStudioSurface: 'content',
        studioSurfaces: ['content'],
    },
];

/**
 * @param {StudioSurface} surface
 * @returns {typeof CONTENT_PAGE_REGISTRY[number][]}
 */
export function getRegistryEntriesForSurface(surface) {
    return CONTENT_PAGE_REGISTRY.filter((e) => e.studioSurfaces.includes(surface));
}

/**
 * @param {unknown} block
 * @param {(typeof CONTENT_PAGE_REGISTRY)[number]} entry
 * @returns {{ slug: string, title: string, snippet: string, label: string, editorMode: 'locales' | 'full' }}
 */
function contentSummaryFromBlock(block, entry) {
    const label = entry.label || entry.slug;
    const editorMode = entry.editorMode || 'locales';
    if (block == null) {
        return { slug: entry.slug, title: label, snippet: '', label, editorMode };
    }
    if (editorMode === 'full') {
        let snippet = '';
        try {
            snippet = JSON.stringify(block).slice(0, 120);
        } catch {
            snippet = '';
        }
        return { slug: entry.slug, title: label, snippet, label, editorMode };
    }
    const en = /** @type {Record<string, unknown> | unknown[] | undefined} */ (block?.en);
    /** @type {Record<string, unknown> | null} */
    let first = null;
    if (Array.isArray(en)) first = en[0] && typeof en[0] === 'object' ? /** @type {Record<string, unknown>} */ (en[0]) : null;
    else if (en && typeof en === 'object' && !Array.isArray(en)) first = /** @type {Record<string, unknown>} */ (en);
    const title =
        (first && (first.title ?? first.headline ?? first.ctaHeadText ?? first.headText)) || label;
    const desc =
        (first && (first.description ?? first.subText ?? first.ctaSubText)) || '';
    return {
        slug: entry.slug,
        title: String(title),
        snippet: String(desc).slice(0, 120),
        label,
        editorMode,
    };
}

/**
 * @param {string} key short key without fusion-studio- prefix
 * @param {unknown} fallback
 */
function readStudioLs(key, fallback = null) {
    if (typeof window === 'undefined') return fallback;
    try {
        const raw = window.localStorage.getItem(LS_STUDIO_PREFIX + key);
        if (raw == null) return fallback;
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

/**
 * @param {string} key
 * @param {unknown} val
 */
function writeStudioLs(key, val) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(LS_STUDIO_PREFIX + key, JSON.stringify(val));
    } catch {
        /* quota */
    }
}

function deepClone(o) {
    if (o === null || typeof o !== 'object') return o;
    try {
        return JSON.parse(JSON.stringify(o));
    } catch {
        return o;
    }
}

/** Mock applicants when data source is test (Studio Applicants tab). */
const MOCK_APPLICANTS_TEST = [
    {
        id: 'app_demo_1',
        programId: 'fusionKaga',
        email: 'demo.applicant@example.com',
        fullName: 'Demo Applicant',
        status: 'pending',
        createdAt: '2026-01-15T12:00:00.000Z',
        note: 'Sample row — use Live canister for persisted applications.',
    },
    {
        id: 'app_demo_2',
        programId: 'fusionKaga',
        email: 'review@example.com',
        fullName: 'Review Sample',
        status: 'reviewing',
        createdAt: '2026-02-01T09:30:00.000Z',
        note: '',
    },
];

/** @typedef {'test' | 'live'} DataSource */

function defaultDataSourceFromConfig() {
    try {
        if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_TEST_DATA === 'true') {
            return 'test';
        }
    } catch {
        /* ignore */
    }
    return config.testData ? 'test' : 'live';
}

function shouldUseCommunityTestData() {
    return config.testData === true;
}

export function getCommunityDataMode() {
    return shouldUseCommunityTestData() ? 'test' : 'live';
}

/**
 * @returns {DataSource}
 */
export function getDataSource() {
    if (typeof window === 'undefined') return defaultDataSourceFromConfig();
    try {
        const v = window.localStorage.getItem(STORAGE_KEY);
        if (v === 'live' || v === 'test') return v;
    } catch {
        /* ignore */
    }
    return defaultDataSourceFromConfig();
}

/**
 * Subscribe to test/live switches (`setDataSource` or loadscreen). Returns unsubscribe.
 * @param {(source: DataSource) => void} callback
 * @returns {() => void}
 */
export function subscribeDataSource(callback) {
    if (typeof window === 'undefined') return () => {};
    const fn = (e) => {
        const src =
            e && typeof e === 'object' && 'detail' in e && e.detail && typeof e.detail === 'object'
                ? e.detail.source
                : undefined;
        callback(src === 'live' || src === 'test' ? src : getDataSource());
    };
    window.addEventListener('fusion-data-source-change', fn);
    return () => window.removeEventListener('fusion-data-source-change', fn);
}

/**
 * @param {DataSource} source
 */
export function setDataSource(source) {
    if (source !== 'test' && source !== 'live') return;
    try {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_KEY, source);
        }
    } catch {
        /* ignore */
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(
            new CustomEvent('fusion-data-source-change', { detail: { source } })
        );
    }
}

/**
 * Motoko optional → JS value (IDL uses [] | [x]).
 * @template T
 * @param {[] | [T]} opt
 * @returns {T | undefined}
 */
export function unwrapOpt(opt) {
    if (!opt || !Array.isArray(opt) || opt.length === 0) return undefined;
    return opt[0];
}

/**
 * Candid `?Record` is `[] | [record]`; if bindings ever return a plain object, accept it.
 * @template T
 * @param {unknown} val
 * @returns {T | null}
 */
function unwrapCandidOptionalRecord(val) {
    if (val == null) return null;
    if (Array.isArray(val)) {
        if (val.length === 0) return null;
        return /** @type {T} */ (val[0] ?? null);
    }
    if (typeof val === 'object') return /** @type {T} */ (val);
    return null;
}

/**
 * @param {import('@dfinity/agent').ActorSubclass} actor
 * @returns {Promise<Map<string, number[]>>}
 */
async function fetchArtistCohortMap(actor) {
    const m = new Map();
    if (!actor || typeof actor.listArtistFilterCohortYearsPublic !== 'function') {
        return m;
    }
    try {
        const rows = await actor.listArtistFilterCohortYearsPublic();
        if (!Array.isArray(rows)) return m;
        for (const row of rows) {
            if (!Array.isArray(row) || row.length < 2) continue;
            const id = String(row[0] ?? '');
            const ys = row[1];
            if (!id || !Array.isArray(ys)) continue;
            m.set(
                id,
                ys
                    .map((x) => (typeof x === 'bigint' ? Number(x) : Number(x)))
                    .filter((n) => Number.isFinite(n) && n > 0)
                    .map((n) => Math.floor(n))
            );
        }
    } catch {
        /* older canister */
    }
    return m;
}

/**
 * @param {import('@dfinity/agent').ActorSubclass} actor
 * @returns {Promise<Map<string, { quote: string, audioUrl: string, audioTitle: string }>>}
 */
async function fetchArtistMediaMap(actor) {
    const m = new Map();
    if (!actor || typeof actor.listArtistMedia !== 'function') return m;
    try {
        const rows = await actor.listArtistMedia();
        if (!Array.isArray(rows)) return m;
        for (const row of rows) {
            if (!Array.isArray(row) || row.length < 2) continue;
            const id = String(row[0] ?? '');
            const v = row[1];
            if (!id || !v || typeof v !== 'object') continue;
            m.set(id, {
                quote: String(v.quote ?? ''),
                audioUrl: toCloudFrontAssetUrl(v.audio_url ?? v.audioUrl),
                audioTitle: String(v.audio_title ?? v.audioTitle ?? ''),
            });
        }
    } catch {
        /* older canister */
    }
    return m;
}

/**
 * @param {import('@dfinity/agent').ActorSubclass} actor
 * @returns {Promise<Map<string, string>>}
 */
async function fetchArtistHeroProfileMap(actor) {
    const m = new Map();
    if (!actor || typeof actor.listArtistHeroProfileImagePublic !== 'function') return m;
    try {
        const rows = await actor.listArtistHeroProfileImagePublic();
        if (!Array.isArray(rows)) return m;
        for (const row of rows) {
            if (!Array.isArray(row) || row.length < 2) continue;
            const id = String(row[0] ?? '');
            if (!id) continue;
            m.set(id, String(row[1] ?? ''));
        }
    } catch {
        /* older canister */
    }
    return m;
}

/** Studio session cache so bulk/single approve reflects in UI before refetch. */
const studioHeroProfileApprovedKnown = new Set();
/** Session-known audio approvals after Studio saves (before public list refreshes). */
const studioAudioApprovedKnown = new Set();
/** Session-known full-site audio approvals after Studio saves. */
const studioAudioFullSiteApprovedKnown = new Set();

/**
 * @param {string} id
 * @param {boolean} approved
 */
function noteStudioHeroProfileApproved(id, approved) {
    const sid = String(id || '').trim();
    if (!sid) return;
    if (approved) studioHeroProfileApprovedKnown.add(sid);
    else studioHeroProfileApprovedKnown.delete(sid);
}

/**
 * @param {string} id
 * @param {boolean} approved
 */
function noteStudioAudioApproved(id, approved) {
    const sid = String(id || '').trim();
    if (!sid) return;
    if (approved) studioAudioApprovedKnown.add(sid);
    else {
        studioAudioApprovedKnown.delete(sid);
        studioAudioFullSiteApprovedKnown.delete(sid);
    }
}

/**
 * @param {string} id
 * @param {boolean} approved
 */
function noteStudioAudioFullSiteApproved(id, approved) {
    const sid = String(id || '').trim();
    if (!sid) return;
    if (approved) {
        studioAudioFullSiteApprovedKnown.add(sid);
        studioAudioApprovedKnown.add(sid);
    } else {
        studioAudioFullSiteApprovedKnown.delete(sid);
    }
}

/**
 * @param {Map<string, boolean>} m
 */
function mergeStudioHeroProfileApprovedKnown(m) {
    for (const id of studioHeroProfileApprovedKnown) {
        m.set(id, true);
    }
    return m;
}

function mergeStudioAudioApprovedKnown(m) {
    for (const id of studioAudioApprovedKnown) {
        m.set(id, true);
    }
    return m;
}

function mergeStudioAudioFullSiteApprovedKnown(m) {
    for (const id of studioAudioFullSiteApprovedKnown) {
        m.set(id, true);
    }
    return m;
}

/**
 * @param {import('@dfinity/agent').ActorSubclass} actor
 * @returns {Promise<Map<string, boolean>>}
 */
async function fetchArtistHeroProfileApprovedMap(actor) {
    const m = new Map();
    if (!actor) return mergeStudioHeroProfileApprovedKnown(m);
    try {
        if (typeof actor.listArtistHeroProfileImageApprovedPublic === 'function') {
            const ids = await actor.listArtistHeroProfileImageApprovedPublic();
            if (Array.isArray(ids)) {
                for (const id of ids) {
                    const sid = String(id ?? '').trim();
                    if (sid) m.set(sid, true);
                }
            }
            return mergeStudioHeroProfileApprovedKnown(m);
        }
    } catch {
        /* older canister */
    }
    try {
        if (typeof actor.listArtists === 'function') {
            const rows = await actor.listArtists();
            if (Array.isArray(rows)) {
                for (const r of rows) {
                    const id = String(r?.id ?? '').trim();
                    if (!id) continue;
                    if (Boolean(r?.heroProfileImageApproved ?? r?.hero_profile_image_approved)) {
                        m.set(id, true);
                    }
                }
            }
        }
    } catch {
        /* ignore */
    }
    return mergeStudioHeroProfileApprovedKnown(m);
}

/**
 * @param {object} base
 * @param {string} id
 * @param {Map<string, boolean> | undefined} approvedByArtistId
 */
function mergeHeroProfileImageApproved(base, id, approvedByArtistId) {
    if (!id) return base;
    const fromBase = Boolean(
        /** @type {Record<string, unknown>} */ (base).heroProfileImageApproved ??
            /** @type {Record<string, unknown>} */ (base).hero_profile_image_approved,
    );
    if (approvedByArtistId instanceof Map && approvedByArtistId.size > 0) {
        return { ...base, heroProfileImageApproved: approvedByArtistId.has(id) };
    }
    if (studioHeroProfileApprovedKnown.has(id)) {
        return { ...base, heroProfileImageApproved: true };
    }
    return { ...base, heroProfileImageApproved: fromBase };
}

/**
 * @param {object} base
 * @param {string} id
 * @param {Map<string, boolean> | undefined} audioApprovedByArtistId
 */
function mergeAudioApproved(base, id, audioApprovedByArtistId) {
    if (!id) return base;
    const fromBase = Boolean(
        /** @type {Record<string, unknown>} */ (base).audioApproved ??
            /** @type {Record<string, unknown>} */ (base).audio_approved,
    );
    if (audioApprovedByArtistId instanceof Map) {
        return { ...base, audioApproved: audioApprovedByArtistId.has(id) };
    }
    if (studioAudioApprovedKnown.has(id)) {
        return { ...base, audioApproved: true };
    }
    return { ...base, audioApproved: fromBase };
}

/**
 * @param {object} base
 * @param {string} id
 * @param {Map<string, boolean> | undefined} audioFullSiteApprovedByArtistId
 */
function mergeAudioFullSiteApproved(base, id, audioFullSiteApprovedByArtistId) {
    if (!id) return base;
    const fromBase = Boolean(
        /** @type {Record<string, unknown>} */ (base).audioApprovedFullSite ??
            /** @type {Record<string, unknown>} */ (base).audio_approved_full_site,
    );
    if (audioFullSiteApprovedByArtistId instanceof Map) {
        return { ...base, audioApprovedFullSite: audioFullSiteApprovedByArtistId.has(id) };
    }
    if (studioAudioFullSiteApprovedKnown.has(id)) {
        return { ...base, audioApprovedFullSite: true };
    }
    return { ...base, audioApprovedFullSite: fromBase };
}

/**
 * @param {import('@dfinity/agent').ActorSubclass} actor
 * @returns {Promise<Map<string, boolean>>}
 */
async function fetchArtistAudioApprovedMap(actor) {
    const m = new Map();
    if (!actor) return mergeStudioAudioApprovedKnown(m);
    try {
        if (typeof actor.listArtistAudioApprovedPublic === 'function') {
            const ids = await actor.listArtistAudioApprovedPublic();
            if (Array.isArray(ids)) {
                for (const id of ids) {
                    const sid = String(id ?? '').trim();
                    if (sid) m.set(sid, true);
                }
            }
            return mergeStudioAudioApprovedKnown(m);
        }
    } catch {
        /* older canister — treat as none approved until generate+deploy */
    }
    return mergeStudioAudioApprovedKnown(m);
}

/**
 * @param {import('@dfinity/agent').ActorSubclass} actor
 * @returns {Promise<Map<string, boolean>>}
 */
async function fetchArtistAudioFullSiteApprovedMap(actor) {
    const m = new Map();
    if (!actor) return mergeStudioAudioFullSiteApprovedKnown(m);
    try {
        if (typeof actor.listArtistAudioFullSiteApprovedPublic === 'function') {
            const ids = await actor.listArtistAudioFullSiteApprovedPublic();
            if (Array.isArray(ids)) {
                for (const id of ids) {
                    const sid = String(id ?? '').trim();
                    if (sid) m.set(sid, true);
                }
            }
            return mergeStudioAudioFullSiteApprovedKnown(m);
        }
    } catch {
        /* older canister — fall back to profile approvals until generate+deploy */
        try {
            if (typeof actor.listArtistAudioApprovedPublic === 'function') {
                const ids = await actor.listArtistAudioApprovedPublic();
                if (Array.isArray(ids)) {
                    for (const id of ids) {
                        const sid = String(id ?? '').trim();
                        if (sid) m.set(sid, true);
                    }
                }
            }
        } catch {
            /* ignore */
        }
    }
    return mergeStudioAudioFullSiteApprovedKnown(m);
}

/**
 * Map canister `Artist` into frontend roster shape (aligned with testData artists).
 * @param {Record<string, unknown>} a
 * @param {Map<string, number[]>} [cohortByArtistId] — from `listArtistFilterCohortYearsPublic` when reading `ArtistRecord` profiles
 */
function mapCanisterArtistRow(a, cohortByArtistId, mediaByArtistId) {
    const id = String(a.id ?? '');
    const filterRaw = unwrapOpt(a.filter);
    const galleryRaw = unwrapOpt(a.gallery_filter ?? a.galleryFilter);
    const media = mediaByArtistId instanceof Map ? mediaByArtistId.get(id) : null;
    return {
        id,
        slug: String(a.slug ?? ''),
        image: toCloudFrontAssetUrl(a.image),
        heroProfileImage: (() => {
            const o = a.hero_profile_image ?? a.heroProfileImage;
            if (Array.isArray(o)) {
                return toCloudFrontAssetUrl(unwrapOpt(o));
            }
            if (o == null || o === undefined) return '';
            return toCloudFrontAssetUrl(o);
        })(),
        heroProfileImageApproved: Boolean(a.hero_profile_image_approved ?? a.heroProfileImageApproved),
        quote: String(media?.quote ?? ''),
        audioUrl: toCloudFrontAssetUrl(media?.audioUrl),
        audioTitle: String(media?.audioTitle ?? ''),
        featuredOrder: Number(a.featured_order ?? a.featuredOrder ?? 0),
        visibility: String(a.visibility ?? ''),
        updatedAt: String(a.updated_at ?? a.updatedAt ?? ''),
        contactEmail: String(a.contact_email ?? a.contactEmail ?? '').trim(),
        mostRecentProgram: String(a.most_recent_program ?? a.mostRecentProgram ?? ''),
        filter: filterRaw
            ? (() => {
                  const raw = /** @type {Record<string, unknown>} */ (filterRaw);
                  /** @type {number[]} */
                  let cohortYears = [];
                  if (cohortByArtistId && cohortByArtistId.has(id)) {
                      cohortYears = cohortByArtistId.get(id) ?? [];
                  } else {
                      let arr = raw.cohort_years ?? raw.cohortYears;
                      if (Array.isArray(arr) && arr.length === 1 && Array.isArray(arr[0])) {
                          arr = arr[0];
                      }
                      if (Array.isArray(arr)) {
                          cohortYears = arr
                              .map((x) => (typeof x === 'bigint' ? Number(x) : Number(x)))
                              .filter((n) => Number.isFinite(n) && n > 0)
                              .map((n) => Math.floor(n));
                      }
                      const legacy = Number(raw.cohort_year ?? raw.cohortYear ?? 0);
                      if (cohortYears.length === 0 && Number.isFinite(legacy) && legacy > 0) {
                          cohortYears = [Math.floor(legacy)];
                      }
                  }
                  const cySingle = Math.max(
                      0,
                      Math.floor(Number(raw.cohort_year ?? raw.cohortYear ?? 0))
                  );
                  return {
                      connection: String(raw.connection ?? ''),
                      cohortYear: cohortYears.length > 0 ? cohortYears[0] : cySingle,
                      cohortYears,
                      disciplineKey: String(raw.discipline_key ?? raw.disciplineKey ?? ''),
                      locationKey: String(raw.location_key ?? raw.locationKey ?? ''),
                  };
              })()
            : undefined,
        galleryFilter: galleryRaw
            ? {
                  accessType: String(galleryRaw.access_type ?? galleryRaw.accessType ?? ''),
                  season: Number(galleryRaw.season ?? 0),
                  view: String(galleryRaw.view ?? ''),
              }
            : undefined,
    };
}

/**
 * @param {object} a
 */
function normalizeArtistDefaults(a) {
    if (!a || typeof a !== 'object') return a;
    return {
        ...a,
        quote: String(/** @type {Record<string, unknown>} */ (a).quote ?? ''),
        audioUrl: toCloudFrontAssetUrl(/** @type {Record<string, unknown>} */ (a).audioUrl),
        audioTitle: String(/** @type {Record<string, unknown>} */ (a).audioTitle ?? ''),
        imported: Boolean(a.imported),
        accessCode: String(a.accessCode ?? a.access_code ?? ''),
        contactEmail: String(/** @type {Record<string, unknown>} */ (a).contactEmail ?? '').trim(),
        mostRecentProgram: String(a.mostRecentProgram ?? a.most_recent_program ?? ''),
        heroProfileImage: toCloudFrontAssetUrl(
            /** @type {Record<string, unknown>} */ (a).heroProfileImage ??
                /** @type {Record<string, unknown>} */ (a).hero_profile_image,
        ),
        heroProfileImageApproved: Boolean(
            /** @type {Record<string, unknown>} */ (a).heroProfileImageApproved ??
                /** @type {Record<string, unknown>} */ (a).hero_profile_image_approved,
        ),
        audioApproved: Boolean(
            /** @type {Record<string, unknown>} */ (a).audioApproved ??
                /** @type {Record<string, unknown>} */ (a).audio_approved,
        ),
        audioApprovedFullSite: Boolean(
            /** @type {Record<string, unknown>} */ (a).audioApprovedFullSite ??
                /** @type {Record<string, unknown>} */ (a).audio_approved_full_site,
        ),
    };
}

/**
 * Merge `ArtistRecord` from canister into testData-like artist (adds `locales` from JSON).
 * @param {Record<string, unknown>} rec
 * @param {Map<string, number[]>} [cohortByArtistId]
 * @param {Map<string, string>} [heroByArtistId]
 * @param {Map<string, boolean>} [approvedByArtistId]
 * @param {Map<string, boolean>} [audioApprovedByArtistId]
 * @param {Map<string, boolean>} [audioFullSiteApprovedByArtistId]
 */
function artistFromRecord(
    rec,
    cohortByArtistId,
    mediaByArtistId,
    heroByArtistId,
    approvedByArtistId,
    audioApprovedByArtistId,
    audioFullSiteApprovedByArtistId,
) {
    if (!rec || typeof rec !== 'object') return null;
    const prof = rec.profile;
    if (!prof || typeof prof !== 'object') return null;
    const profile = mapCanisterArtistRow(prof, cohortByArtistId, mediaByArtistId);
    const out = { ...profile };
    const id = String(out.id ?? '');
    if (heroByArtistId instanceof Map && id) {
        const h = heroByArtistId.get(id);
        if (h != null && String(h).trim() !== '') {
            out.heroProfileImage = toCloudFrontAssetUrl(h);
        }
    }
    const ljRaw = rec.locales_json ?? rec.localesJson;
    const json = typeof ljRaw === 'string' ? ljRaw : unwrapOpt(ljRaw);
    if (json && typeof json === 'string') {
        try {
            const parsed = JSON.parse(json);
            if (parsed && typeof parsed === 'object') {
                out.locales = distributeUploadedAssetUrls(parsed);
            }
        } catch {
            /* ignore invalid JSON */
        }
    }
    return mergeAudioFullSiteApproved(
        mergeAudioApproved(
            mergeHeroProfileImageApproved(out, id, approvedByArtistId),
            id,
            audioApprovedByArtistId,
        ),
        id,
        audioFullSiteApprovedByArtistId,
    );
}

/**
 * Merge `listArtistMostRecentPrograms` into roster rows (live canister).
 * @param {import('@dfinity/agent').ActorSubclass | null} actor
 * @param {object[]} artists
 */
async function mergeMostRecentProgramsFromCanister(actor, artists) {
    if (!actor || typeof actor.listArtistMostRecentPrograms !== 'function' || !Array.isArray(artists)) {
        return;
    }
    try {
        const tuples = await actor.listArtistMostRecentPrograms();
        if (!Array.isArray(tuples)) return;
        const map = new Map(tuples);
        for (const a of artists) {
            if (!a || typeof a !== 'object' || a.id == null) continue;
            const v = map.get(String(a.id));
            if (v != null && String(v).trim() !== '') {
                a.mostRecentProgram = String(v);
            }
        }
    } catch {
        /* older canister */
    }
}

/**
 * Site “current season” program key — compared to `artist.mostRecentProgram` for residency badge styling.
 * @returns {Promise<string>}
 */
export async function getCurrentProgramSeason() {
    if (getDataSource() === 'test') {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const v = window.localStorage.getItem('fusion-test-current-program-season');
                if (v != null && String(v).trim() !== '') return String(v).trim();
            }
        } catch {
            /* ignore */
        }
        return String(testData.currentProgramSeason ?? '').trim();
    }
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.getSiteSetting !== 'function') return '';
        const opt = await actor.getSiteSetting('currentProgramSeason');
        const raw = unwrapOpt(opt);
        return raw != null ? String(raw).trim() : '';
    } catch {
        return '';
    }
}

/**
 * Staff: persist current program season key (Studio Programs toolbar).
 * @param {string} value
 * @returns {Promise<void>}
 */
export async function setCurrentProgramSeason(value) {
    if (getDataSource() === 'test') {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem('fusion-test-current-program-season', String(value ?? ''));
            }
        } catch {
            /* ignore */
        }
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fusion-data-source-change', { detail: { source: 'test' } }));
        }
        return;
    }
    const { getStudioAuthenticatedActor } = await import('./studioAuth.js');
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.setCurrentProgramSeason !== 'function') {
        throw new Error('setCurrentProgramSeason unavailable — deploy backend and run dfx generate.');
    }
    await actor.setCurrentProgramSeason(String(value ?? ''));
}

/**
 * Staff: set an artist’s canonical most-recent program key (Motoko map).
 * @param {string} artistId
 * @param {string} programKey
 * @returns {Promise<void>}
 */
export async function setArtistMostRecentProgram(artistId, programKey) {
    if (getDataSource() === 'test') {
        const id = String(artistId || '').trim();
        if (!id) throw new Error('Missing artist id');
        const all = await getArtists();
        const row = all.find((x) => x && String(x.id) === id);
        if (!row) throw new Error('Artist not found');
        const next = { ...row, mostRecentProgram: String(programKey ?? '') };
        const overlay = readStudioLs(LS_ARTISTS_OVERLAY) || {};
        overlay[id] = normalizeArtistDefaults(next);
        writeStudioLs(LS_ARTISTS_OVERLAY, overlay);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fusion-data-source-change', { detail: { source: 'test' } }));
        }
        return;
    }
    const { getStudioAuthenticatedActor } = await import('./studioAuth.js');
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.setArtistMostRecentProgram !== 'function') {
        throw new Error('setArtistMostRecentProgram unavailable — deploy backend and run dfx generate.');
    }
    await actor.setArtistMostRecentProgram(String(artistId || ''), String(programKey ?? ''));
}

/**
 * Stable dedupe for public roster rows (duplicate canister rows or empty-id collisions).
 * @param {object[]} rows
 * @returns {object[]}
 */
function dedupePublicArtistRows(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return rows || [];
    const seen = new Set();
    const out = [];
    for (const a of rows) {
        if (!a || typeof a !== 'object') continue;
        const idRaw = a.id != null ? String(a.id).trim() : '';
        const slugRaw =
            a.slug != null && String(a.slug).trim() !== ''
                ? String(a.slug).trim().toLowerCase()
                : '';
        const key = idRaw ? `id:${idRaw}` : slugRaw ? `slug:${slugRaw}` : JSON.stringify(a);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(a);
    }
    return out;
}

/** @type {import('./artistFeaturedExtension.js').ArtistFeaturedMeta | null} */
let _lastFeaturedMergeMeta = null;

/**
 * Meta used for the last {@link getArtists} / {@link getArtistsForStudio} merge (live canister or localStorage).
 * @returns {import('./artistFeaturedExtension.js').ArtistFeaturedMeta}
 */
export function getLastFeaturedMergeMetaForPublic() {
    return _lastFeaturedMergeMeta ?? readArtistFeaturedMeta();
}

async function fetchFeaturedMergeMetaLive() {
    let meta = readArtistFeaturedMeta();
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.getArtistFeaturedGalleryPublic === 'function') {
            const g = await actor.getArtistFeaturedGalleryPublic();
            meta = artistFeaturedMetaFromCanister(
                /** @type {Record<string, unknown> | null | undefined} */ (
                    g && typeof g === 'object' ? g : null
                )
            );
        }
    } catch {
        /* older canister or network */
    }
    return meta;
}

function dispatchFeaturedMetaChanged() {
    if (typeof window === 'undefined') return;
    try {
        window.dispatchEvent(new CustomEvent('fusion-artist-featured-meta-change'));
    } catch {
        /* ignore */
    }
}

function natToNumber(n) {
    if (typeof n === 'bigint') return Number(n);
    return Number(n);
}

/**
 * Live: persist featured / featurable flags to the canister (staff). Falls back to localStorage if methods are missing.
 * Test: delegates to {@link applyFeaturedFlagsFromStudioSave}.
 * @param {string} id
 * @param {{ featured: boolean, featurable: boolean }} flags
 * @returns {Promise<number>} Motoko `featuredOrder` slot (0 = not manual featured)
 */
export async function applyFeaturedFlagsFromStudioSaveLive(id, flags) {
    const sid = String(id || '').trim();
    if (!sid) return 0;
    if (getDataSource() === 'test') {
        return applyFeaturedFlagsFromStudioSave(sid, flags);
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.staffSetArtistFeaturedFeaturable !== 'function') {
        return applyFeaturedFlagsFromStudioSave(sid, flags);
    }
    await actor.staffSetArtistFeaturedFeaturable(sid, Boolean(flags.featurable));
    const orderNat = await actor.staffSetManualFeaturedForArtist(sid, Boolean(flags.featured));
    dispatchFeaturedMetaChanged();
    return natToNumber(orderNat);
}

/**
 * @typedef {{ artistId: string, cycle: number, programId: string, awardLabel: string, storyVideoUrl: string, updatedAt: string }} ArtistDrawRecipientRow
 */

/**
 * @returns {Record<string, ArtistDrawRecipientRow>}
 */
function readDrawRecipientsLs() {
    const raw = readStudioLs(LS_DRAW_RECIPIENTS);
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? /** @type {Record<string, ArtistDrawRecipientRow>} */ (raw) : {};
}

/**
 * @param {unknown} row
 * @returns {ArtistDrawRecipientRow | null}
 */
function mapDrawRecipientRow(row) {
    if (!row || typeof row !== 'object') return null;
    const r = /** @type {Record<string, unknown>} */ (row);
    const artistId = String(r.artistId ?? r.artist_id ?? '').trim();
    if (!artistId) return null;
    const cycleRaw = Number(r.cycle);
    return {
        artistId,
        cycle: Number.isFinite(cycleRaw) && cycleRaw > 0 ? Math.floor(cycleRaw) : 1,
        programId: String(r.programId ?? r.program_id ?? '').trim(),
        awardLabel: String(r.awardLabel ?? r.award_label ?? '').trim(),
        storyVideoUrl: String(r.storyVideoUrl ?? r.story_video_url ?? '').trim(),
        updatedAt: String(r.updatedAt ?? r.updated_at ?? ''),
    };
}

/**
 * @returns {Promise<Map<string, string>>}
 */
async function listArtistDrawStoryVideosPublicMap() {
    /** @type {Map<string, string>} */
    const map = new Map();
    if (getDataSource() === 'test') {
        for (const row of Object.values(readDrawRecipientsLs())) {
            const id = String(row?.artistId || '').trim();
            const url = String(row?.storyVideoUrl || '').trim();
            if (id && url) map.set(id, url);
        }
        return map;
    }
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.listArtistDrawStoryVideosPublic !== 'function') {
            for (const row of Object.values(readDrawRecipientsLs())) {
                const id = String(row?.artistId || '').trim();
                const url = String(row?.storyVideoUrl || '').trim();
                if (id && url) map.set(id, url);
            }
            return map;
        }
        const rows = await actor.listArtistDrawStoryVideosPublic();
        if (!Array.isArray(rows)) return map;
        for (const entry of rows) {
            if (!Array.isArray(entry) || entry.length < 2) continue;
            const id = String(entry[0] || '').trim();
            const url = String(entry[1] || '').trim();
            if (id && url) map.set(id, url);
        }
    } catch {
        /* empty */
    }
    return map;
}

/**
 * Live/staff: set or clear Program Draw past-recipient flag for a roster artist.
 * Test: localStorage overlay.
 * @param {string} id
 * @param {{ enabled: boolean, cycle?: number, programId?: string, awardLabel?: string, storyVideoUrl?: string }} flags
 */
export async function applyDrawRecipientFromStudioSaveLive(id, flags) {
    const sid = String(id || '').trim();
    if (!sid) return;
    const enabled = Boolean(flags?.enabled);
    const cycle = Math.max(1, Math.floor(Number(flags?.cycle) || 1));
    const programId = String(flags?.programId ?? '').trim();
    const awardLabel = String(flags?.awardLabel ?? '').trim();
    const storyVideoUrl = String(flags?.storyVideoUrl ?? '').trim();

    if (getDataSource() === 'test') {
        const map = readDrawRecipientsLs();
        if (enabled) {
            map[sid] = {
                artistId: sid,
                cycle,
                programId,
                awardLabel,
                storyVideoUrl,
                updatedAt: new Date().toISOString(),
            };
        } else {
            delete map[sid];
        }
        writeStudioLs(LS_DRAW_RECIPIENTS, map);
        return;
    }

    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.staffSetArtistDrawRecipient !== 'function') {
        const map = readDrawRecipientsLs();
        if (enabled) {
            map[sid] = {
                artistId: sid,
                cycle,
                programId,
                awardLabel,
                storyVideoUrl,
                updatedAt: new Date().toISOString(),
            };
        } else {
            delete map[sid];
        }
        writeStudioLs(LS_DRAW_RECIPIENTS, map);
        return;
    }
    await actor.staffSetArtistDrawRecipient(
        sid,
        enabled,
        BigInt(cycle),
        programId,
        awardLabel,
        storyVideoUrl,
    );
}

/**
 * Studio Manage: load draw-recipient sidecar for one artist.
 * @param {string} id
 * @returns {Promise<ArtistDrawRecipientRow | null>}
 */
export async function getArtistDrawRecipientStudio(id) {
    const sid = String(id || '').trim();
    if (!sid) return null;
    if (getDataSource() === 'test') {
        return mapDrawRecipientRow(readDrawRecipientsLs()[sid]);
    }
    try {
        const actor = await getStudioAuthenticatedActor();
        if (typeof actor.getArtistDrawRecipient !== 'function') {
            return mapDrawRecipientRow(readDrawRecipientsLs()[sid]);
        }
        const row = await actor.getArtistDrawRecipient(sid);
        if (row == null) return null;
        const unwrapped = Array.isArray(row) ? row[0] : row;
        const mapped = mapDrawRecipientRow(unwrapped);
        if (!mapped) return null;
        if (typeof actor.getArtistDrawStoryVideo === 'function') {
            try {
                const video = await actor.getArtistDrawStoryVideo(sid);
                mapped.storyVideoUrl = String(video || '').trim();
            } catch {
                /* keep empty */
            }
        }
        return mapped;
    } catch {
        return mapDrawRecipientRow(readDrawRecipientsLs()[sid]);
    }
}

/**
 * Public: all Program Draw past recipients (cycle desc from canister).
 * @returns {Promise<ArtistDrawRecipientRow[]>}
 */
export async function listArtistDrawRecipientsPublic() {
    if (getDataSource() === 'test') {
        return Object.values(readDrawRecipientsLs())
            .map(mapDrawRecipientRow)
            .filter(Boolean)
            .sort((a, b) => b.cycle - a.cycle || String(b.updatedAt).localeCompare(String(a.updatedAt)));
    }
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.listArtistDrawRecipientsPublic !== 'function') {
            return Object.values(readDrawRecipientsLs())
                .map(mapDrawRecipientRow)
                .filter(Boolean);
        }
        const [rows, videoMap] = await Promise.all([
            actor.listArtistDrawRecipientsPublic(),
            listArtistDrawStoryVideosPublicMap(),
        ]);
        if (!Array.isArray(rows)) return [];
        return rows
            .map((row) => {
                const mapped = mapDrawRecipientRow(row);
                if (!mapped) return null;
                const fromMap = videoMap.get(mapped.artistId);
                if (fromMap) mapped.storyVideoUrl = fromMap;
                return mapped;
            })
            .filter(Boolean);
    } catch {
        return [];
    }
}

/**
 * Flag roster rows that appear in the public Program Draw past-recipients list.
 * @param {object[]} artists
 * @returns {Promise<object[]>}
 */
async function mergeDrawRecipientFlagsOntoArtists(artists) {
    if (!Array.isArray(artists) || !artists.length) return artists || [];
    try {
        const rows = await listArtistDrawRecipientsPublic();
        /** @type {Set<string>} */
        const ids = new Set();
        for (const row of rows || []) {
            const id = String(row?.artistId || '').trim();
            if (id) ids.add(id);
        }
        if (!ids.size) {
            return artists.map((a) =>
                a && typeof a === 'object' ? { ...a, drawRecipient: Boolean(a.drawRecipient) } : a,
            );
        }
        return artists.map((a) => {
            if (!a || typeof a !== 'object') return a;
            const id = String(/** @type {Record<string, unknown>} */ (a).id || '').trim();
            return { ...a, drawRecipient: ids.has(id) || Boolean(a.drawRecipient) };
        });
    } catch {
        return artists;
    }
}

/**
 * Live: persist profile-image approval (staff). Test: writes to artists overlay.
 * @param {string} id
 * @param {boolean} approved
 */
export async function applyHeroProfileImageApprovedFromStudioSaveLive(id, approved) {
    const sid = String(id || '').trim();
    if (!sid) return;
    if (getDataSource() === 'test') {
        const overlay = readStudioLs(LS_ARTISTS_OVERLAY) || {};
        const base = overlay[sid] && typeof overlay[sid] === 'object' ? overlay[sid] : {};
        overlay[sid] = normalizeArtistDefaults({
            ...base,
            heroProfileImageApproved: Boolean(approved),
        });
        writeStudioLs(LS_ARTISTS_OVERLAY, overlay);
        noteStudioHeroProfileApproved(sid, Boolean(approved));
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.staffSetHeroProfileImageApproved !== 'function') {
        noteStudioHeroProfileApproved(sid, Boolean(approved));
        return;
    }
    await actor.staffSetHeroProfileImageApproved(sid, Boolean(approved));
    noteStudioHeroProfileApproved(sid, Boolean(approved));
}

/**
 * Live: persist audio approval (staff). Test: writes to artists overlay.
 * @param {string} id
 * @param {boolean} approved
 */
export async function applyArtistAudioApprovedFromStudioSaveLive(id, approved) {
    const sid = String(id || '').trim();
    if (!sid) return;
    if (getDataSource() === 'test') {
        const overlay = readStudioLs(LS_ARTISTS_OVERLAY) || {};
        const base = overlay[sid] && typeof overlay[sid] === 'object' ? overlay[sid] : {};
        overlay[sid] = normalizeArtistDefaults({
            ...base,
            audioApproved: Boolean(approved),
            ...(approved ? {} : { audioApprovedFullSite: false }),
        });
        writeStudioLs(LS_ARTISTS_OVERLAY, overlay);
        noteStudioAudioApproved(sid, Boolean(approved));
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.staffSetArtistAudioApproved !== 'function') {
        noteStudioAudioApproved(sid, Boolean(approved));
        return;
    }
    await actor.staffSetArtistAudioApproved(sid, Boolean(approved));
    noteStudioAudioApproved(sid, Boolean(approved));
    if (!approved) noteStudioAudioFullSiteApproved(sid, false);
}

/**
 * Live: persist full-site audio approval (staff). Test: writes to artists overlay.
 * @param {string} id
 * @param {boolean} approved
 */
export async function applyArtistAudioFullSiteApprovedFromStudioSaveLive(id, approved) {
    const sid = String(id || '').trim();
    if (!sid) return;
    if (getDataSource() === 'test') {
        const overlay = readStudioLs(LS_ARTISTS_OVERLAY) || {};
        const base = overlay[sid] && typeof overlay[sid] === 'object' ? overlay[sid] : {};
        overlay[sid] = normalizeArtistDefaults({
            ...base,
            audioApprovedFullSite: Boolean(approved),
            ...(approved ? { audioApproved: true } : {}),
        });
        writeStudioLs(LS_ARTISTS_OVERLAY, overlay);
        noteStudioAudioFullSiteApproved(sid, Boolean(approved));
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.staffSetArtistAudioFullSiteApproved !== 'function') {
        noteStudioAudioFullSiteApproved(sid, Boolean(approved));
        return;
    }
    await actor.staffSetArtistAudioFullSiteApproved(sid, Boolean(approved));
    noteStudioAudioFullSiteApproved(sid, Boolean(approved));
}

/**
 * Staff: approve profile headshots for every roster artist.
 * @returns {Promise<number>}
 */
export async function approveAllHeroProfileImagesStudio() {
    const artists = await getArtistsForStudio();
    if (getDataSource() === 'test') {
        const overlay = readStudioLs(LS_ARTISTS_OVERLAY) || {};
        let n = 0;
        for (const a of artists) {
            const id = String(a?.id ?? '').trim();
            if (!id) continue;
            const base = overlay[id] && typeof overlay[id] === 'object' ? overlay[id] : a;
            overlay[id] = normalizeArtistDefaults({
                ...base,
                heroProfileImageApproved: true,
            });
            n += 1;
        }
        writeStudioLs(LS_ARTISTS_OVERLAY, overlay);
        for (const a of artists) {
            noteStudioHeroProfileApproved(String(a?.id ?? ''), true);
        }
        return n;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.staffApproveAllHeroProfileImages === 'function') {
        const n = natToNumber(await actor.staffApproveAllHeroProfileImages());
        for (const a of artists) {
            noteStudioHeroProfileApproved(String(a?.id ?? ''), true);
        }
        return n;
    }
    if (typeof actor.staffSetHeroProfileImageApproved !== 'function') {
        throw new Error(
            'staffApproveAllHeroProfileImages missing — deploy backend and run dfx generate.',
        );
    }
    let n = 0;
    for (const a of artists) {
        const id = String(a?.id ?? '').trim();
        if (!id) continue;
        await actor.staffSetHeroProfileImageApproved(id, true);
        n += 1;
    }
    for (const a of artists) {
        noteStudioHeroProfileApproved(String(a?.id ?? ''), true);
    }
    return n;
}

/**
 * @param {string} id
 * @param {boolean} wantFeatured
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function setManualFeaturedForArtistStudio(id, wantFeatured) {
    const sid = String(id || '').trim();
    if (!sid) return { ok: false, reason: 'Missing id' };
    if (getDataSource() === 'test') {
        return setManualFeaturedForArtist(sid, wantFeatured);
    }
    try {
        const actor = await getStudioAuthenticatedActor();
        if (typeof actor.staffSetManualFeaturedForArtist !== 'function') {
            return setManualFeaturedForArtist(sid, wantFeatured);
        }
        await actor.staffSetManualFeaturedForArtist(sid, wantFeatured);
        dispatchFeaturedMetaChanged();
        return { ok: true };
    } catch (e) {
        return { ok: false, reason: e instanceof Error ? e.message : String(e) };
    }
}

/**
 * @param {string} id
 * @param {boolean} value
 * @returns {Promise<void>}
 */
export async function setFeaturableForArtistStudio(id, value) {
    const sid = String(id || '').trim();
    if (!sid) return;
    if (getDataSource() === 'test') {
        setFeaturableForArtist(sid, value);
        return;
    }
    try {
        const actor = await getStudioAuthenticatedActor();
        if (typeof actor.staffSetArtistFeaturedFeaturable !== 'function') {
            setFeaturableForArtist(sid, value);
            return;
        }
        await actor.staffSetArtistFeaturedFeaturable(sid, Boolean(value));
        dispatchFeaturedMetaChanged();
    } catch {
        setFeaturableForArtist(sid, value);
    }
}

/**
 * @param {boolean} on
 * @returns {Promise<void>}
 */
export async function setRandomFeaturedModeStudio(on) {
    if (getDataSource() === 'test') {
        setRandomFeaturedMode(on);
        return;
    }
    try {
        const actor = await getStudioAuthenticatedActor();
        if (typeof actor.staffSetArtistFeaturedRandomMode !== 'function') {
            setRandomFeaturedMode(on);
            return;
        }
        await actor.staffSetArtistFeaturedRandomMode(on);
        dispatchFeaturedMetaChanged();
    } catch {
        setRandomFeaturedMode(on);
    }
}

/**
 * Test data + overlay merge (full roster, including private — use for Studio).
 * @returns {object[]}
 */
function getMergedTestArtists() {
    const base = (testData.allArtists?.artists || []).map((x) => normalizeArtistDefaults(x));
    const overlay = readStudioLs(LS_ARTISTS_OVERLAY) || {};
    const merged = base.map((a) => {
        const o = overlay[a.id];
        return o ? normalizeArtistDefaults({ ...a, ...o }) : a;
    });
    const baseIds = new Set(base.map((a) => a.id));
    for (const [id, v] of Object.entries(overlay)) {
        if (!baseIds.has(id) && v && typeof v === 'object') {
            merged.push(normalizeArtistDefaults(v));
        }
    }
    _lastFeaturedMergeMeta = readArtistFeaturedMeta();
    return dedupePublicArtistRows(merged.map((a) => mergeArtistFeaturedExtension(a, _lastFeaturedMergeMeta)));
}

/**
 * @returns {Promise<object[]>}
 */
async function getLivePublicArtists() {
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.listArtistRecordsPublic === 'function') {
            const metaForMerge = await fetchFeaturedMergeMetaLive();
            _lastFeaturedMergeMeta = metaForMerge;
            const [rows, cohortMap, mediaMap, heroMap, approvedMap, audioApprovedMap, audioFullSiteMap] =
                await Promise.all([
                    actor.listArtistRecordsPublic(),
                    fetchArtistCohortMap(actor),
                    fetchArtistMediaMap(actor),
                    fetchArtistHeroProfileMap(actor),
                    fetchArtistHeroProfileApprovedMap(actor),
                    fetchArtistAudioApprovedMap(actor),
                    fetchArtistAudioFullSiteApprovedMap(actor),
                ]);
            if (!Array.isArray(rows)) return [];
            const out = [];
            for (const r of rows) {
                const a = artistFromRecord(
                    r,
                    cohortMap,
                    mediaMap,
                    heroMap,
                    approvedMap,
                    audioApprovedMap,
                    audioFullSiteMap,
                );
                if (a) out.push(a);
            }
            await mergeMostRecentProgramsFromCanister(actor, out);
            await enrichArtistsWithAudioCollectionsAndApprovals(actor, out);
            return dedupePublicArtistRows(out.map((a) => mergeArtistFeaturedExtension(a, metaForMerge)));
        }
    } catch {
        /* older canister: fall back to profile-only list */
    }
    const actor = await getFusionBackendActor();
    if (typeof actor.listArtists !== 'function') {
        return [];
    }
    const metaForMerge = await fetchFeaturedMergeMetaLive();
    _lastFeaturedMergeMeta = metaForMerge;
    const [rows, mediaMap, audioApprovedMap, audioFullSiteMap] = await Promise.all([
        actor.listArtists(),
        fetchArtistMediaMap(actor),
        fetchArtistAudioApprovedMap(actor),
        fetchArtistAudioFullSiteApprovedMap(actor),
    ]);
    if (!Array.isArray(rows)) return [];
    const mapped = rows.map((r) => {
        const row = mapCanisterArtistRow(r, undefined, mediaMap);
        const id = String(row.id ?? '');
        return mergeAudioFullSiteApproved(
            mergeAudioApproved(row, id, audioApprovedMap),
            id,
            audioFullSiteMap,
        );
    });
    await enrichArtistsWithAudioCollectionsAndApprovals(actor, mapped);
    return dedupePublicArtistRows(
        mapped.map((a) => mergeArtistFeaturedExtension(a, metaForMerge)),
    );
}

/**
 * @returns {Promise<object[]>}
 */
export async function getArtists() {
    if (getDataSource() === 'test') {
        const merged = getMergedTestArtists().filter((a) =>
            artistRosterInPublicDirectory(a.visibility),
        );
        return mergeDrawRecipientFlagsOntoArtists(merged);
    }
    const live = await getLivePublicArtists();
    return mergeDrawRecipientFlagsOntoArtists(live);
}

/**
 * Community should follow config.testData only, ignoring localStorage/Vite data-source overrides.
 * @returns {Promise<object[]>}
 */
export async function getCommunityArtistsPublic() {
    if (shouldUseCommunityTestData()) {
        return getMergedTestArtists().filter((a) => artistRosterInPublicDirectory(a.visibility));
    }
    return getLivePublicArtists();
}

/**
 * Map full canister `ArtistRecord` (Studio) to roster row with `imported` + `accessCode`.
 * @param {Record<string, unknown>} rec
 * @param {Map<string, string>} [heroByArtistId]
 * @param {Map<string, boolean>} [approvedByArtistId]
 */
function mapStudioArtistFromFullRecord(
    rec,
    cohortByArtistId,
    mediaByArtistId,
    heroByArtistId,
    approvedByArtistId,
    audioApprovedByArtistId,
    audioFullSiteApprovedByArtistId,
) {
    const prof = rec.profile;
    if (!prof || typeof prof !== 'object') {
        return { id: '', slug: '', imported: false, accessCode: '' };
    }
    let base = mapCanisterArtistRow(prof, cohortByArtistId, mediaByArtistId);
    const bid = String(base.id ?? '');
    if (heroByArtistId instanceof Map && bid) {
        const h = heroByArtistId.get(bid);
        if (h != null && String(h).trim() !== '') {
            base = { ...base, heroProfileImage: toCloudFrontAssetUrl(h) };
        }
    }
    /** @type {Record<string, unknown> | undefined} */
    let locales;
    const ljRaw = rec.locales_json ?? rec.localesJson;
    const json = typeof ljRaw === 'string' ? ljRaw : unwrapOpt(ljRaw);
    if (json && typeof json === 'string') {
        try {
            const parsed = JSON.parse(json);
            if (parsed && typeof parsed === 'object') {
                locales = /** @type {Record<string, unknown>} */ (distributeUploadedAssetUrls(parsed));
            }
        } catch {
            /* ignore invalid JSON */
        }
    }
    return mergeAudioFullSiteApproved(
        mergeAudioApproved(
            mergeHeroProfileImageApproved(
                {
                    ...base,
                    imported: Boolean(rec.imported),
                    accessCode: String(rec.access_code ?? rec.accessCode ?? ''),
                    ...(locales ? { locales } : {}),
                },
                bid,
                approvedByArtistId,
            ),
            bid,
            audioApprovedByArtistId,
        ),
        bid,
        audioFullSiteApprovedByArtistId,
    );
}

/**
 * Artists for Studio UI: includes `imported` and `accessCode` when live (staff-only canister method).
 * @returns {Promise<object[]>}
 */
export async function getArtistsForStudio() {
    if (getDataSource() === 'test') {
        return getMergedTestArtists();
    }
    try {
        const actor = await getStudioAuthenticatedActor();
        if (typeof actor.listArtistRecordsForStudio === 'function') {
            const metaForMerge = await fetchFeaturedMergeMetaLive();
            _lastFeaturedMergeMeta = metaForMerge;
            const [rows, cohortMap, mediaMap, heroMap, approvedMap, audioApprovedMap, audioFullSiteMap] =
                await Promise.all([
                    actor.listArtistRecordsForStudio(),
                    fetchArtistCohortMap(actor),
                    fetchArtistMediaMap(actor),
                    fetchArtistHeroProfileMap(actor),
                    fetchArtistHeroProfileApprovedMap(actor),
                    fetchArtistAudioApprovedMap(actor),
                    fetchArtistAudioFullSiteApprovedMap(actor),
                ]);
            if (!Array.isArray(rows)) return [];
            const mapped = rows.map((r) =>
                mergeArtistFeaturedExtension(
                    mapStudioArtistFromFullRecord(
                        r,
                        cohortMap,
                        mediaMap,
                        heroMap,
                        approvedMap,
                        audioApprovedMap,
                        audioFullSiteMap,
                    ),
                    metaForMerge,
                ),
            );
            await mergeMostRecentProgramsFromCanister(actor, mapped);
            await enrichArtistsWithAudioCollectionsAndApprovals(actor, mapped);
            return mapped;
        }
    } catch {
        /* fallback */
    }
    return getArtists();
}

/**
 * Full artist object for Studio Manage (merged locales + roster fields).
 * Live: loads via {@link getArtistBySlug} and merges `imported` / `accessCode` from the table row.
 * Test: uses merged {@link getArtists} overlay row by slug.
 *
 * @param {string} slug
 * @param {object | null} [tableRow] — roster row from Studio (optional `imported`, `accessCode`)
 * @returns {Promise<object | null>}
 */
export async function loadArtistForStudioEdit(slug, tableRow = null) {
    const s = String(slug || '').trim();
    if (!s) return null;
    if (getDataSource() === 'test') {
        const all = await getArtistsForStudio();
        const found = all.find((a) => String(a?.slug || '').toLowerCase() === s.toLowerCase());
        if (!found) return null;
        const base = mergeArtistFeaturedExtension(normalizeArtistDefaults({ ...found }), readArtistFeaturedMeta());
        const draw = await getArtistDrawRecipientStudio(String(base.id || ''));
        return {
            ...base,
            drawRecipient: Boolean(draw),
            drawRecipientCycle: draw?.cycle ?? 1,
            drawRecipientProgramId: draw?.programId ?? '',
            drawRecipientAwardLabel: draw?.awardLabel ?? '',
            drawRecipientStoryVideoUrl: draw?.storyVideoUrl ?? '',
        };
    }
    const tr = tableRow && typeof tableRow === 'object' ? tableRow : {};
    const fromCanister = await getArtistBySlug(s);
    if (!fromCanister) return null;
    const meta = await fetchFeaturedMergeMetaLive();
    const base = mergeArtistFeaturedExtension(
        normalizeArtistDefaults({
            ...fromCanister,
            imported: Boolean(tr.imported ?? fromCanister.imported),
            accessCode: String(tr.accessCode ?? fromCanister.accessCode ?? ''),
            contactEmail: String(
                tr.contactEmail ?? tr.contact_email ?? fromCanister.contactEmail ?? '',
            ).trim(),
            heroProfileImageApproved: Boolean(
                tr.heroProfileImageApproved ?? fromCanister.heroProfileImageApproved,
            ),
        }),
        meta
    );
    const draw = await getArtistDrawRecipientStudio(String(base.id || ''));
    return {
        ...base,
        drawRecipient: Boolean(draw),
        drawRecipientCycle: draw?.cycle ?? 1,
        drawRecipientProgramId: draw?.programId ?? '',
        drawRecipientAwardLabel: draw?.awardLabel ?? '',
        drawRecipientStoryVideoUrl: draw?.storyVideoUrl ?? '',
    };
}

/**
 * @param {unknown} parsed — JSON root (array or `{ artists: [...] }`)
 * @returns {Promise<number>} count imported
 */
export async function batchImportArtistsFromJson(parsed) {
    const items = extractArrayFromBatchJson(parsed, 'artists');
    const existing = await getArtistsForStudio();
    const pool = collectAccessCodesFromArtists(existing);
    const records = items.map((raw) => normalizeArtistImportRow(raw, pool, { forceImported: true }));
    return bulkUpsertArtistsStudio(records);
}

/**
 * @param {{ profile: object, localesJson: string | null, notesEncrypted: null }[]} records
 * @returns {Promise<number>}
 */
/**
 * Temporary migration helper (remove when legacy S3 sync is retired — see docs/delete-later.md).
 * Clears **all** roster artists’ profile hero `image`, then sets each to the legacy CDN URL:
 * `https://cdn.fusionart.world/uploads/legacyProfiles/<stem>-hero.jpg`
 * (`<stem>` from {@link legacyProfileFileStem}).
 *
 * Studio: **Sync Profile Images** (`panels.js` / `#studio-artists-sync-hero`).
 *
 * @returns {Promise<number>} number of artists that received the legacy hero URL (second phase)
 */
export async function syncStudioArtistsLegacyHeroImages() {
    const rows = await getArtistsForStudio();
    const pool = collectAccessCodesFromArtists(rows);
    /** @param {object} row @param {string} image */
    const toUpsert = (row, image) => {
        const localesRaw = row.locales && typeof row.locales === 'object' ? row.locales : { en: {}, ja: {} };
        const locales = /** @type {Record<string, unknown>} */ (JSON.parse(JSON.stringify(localesRaw)));
        if (!locales.en || typeof locales.en !== 'object') locales.en = {};
        if (!locales.ja || typeof locales.ja !== 'object') locales.ja = {};
        return normalizeArtistImportRow(
            {
                id: row.id,
                slug: row.slug,
                image,
                heroProfileImage: String(/** @type {Record<string, unknown>} */ (row).heroProfileImage ?? row.hero_profile_image ?? ''),
                featuredOrder: row.featuredOrder,
                visibility: row.visibility,
                updatedAt: new Date().toISOString(),
                filter: row.filter,
                galleryFilter: row.galleryFilter,
                locales,
                imported: row.imported,
                accessCode: row.accessCode,
            },
            pool,
            { forceImported: false }
        );
    };

    /** @type {object[]} */
    const clears = [];
    /** @type {object[]} */
    const sets = [];
    for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        clears.push(toUpsert(row, ''));
        const stem = legacyProfileFileStem(row);
        sets.push(toUpsert(row, legacyHeroUrl(stem)));
    }
    if (!clears.length) {
        return 0;
    }
    await bulkUpsertArtistsStudio(clears);
    await bulkUpsertArtistsStudio(sets);
    return sets.length;
}

/**
 * @param {object} row
 * @param {Set<string>} pool
 */
function buildArtistRowWithLegacyIntroGallery(row, pool) {
    const stem = legacyProfileFileStem(row);
    const makeSlots = () =>
        [0, 1, 2].map((i) => ({
            src: legacyIntroUrl(stem, i),
            alt: '',
            caption: '',
        }));
    const localesRaw = row.locales && typeof row.locales === 'object' ? row.locales : { en: {}, ja: {} };
    const locales = /** @type {Record<string, unknown>} */ (JSON.parse(JSON.stringify(localesRaw)));
    if (!locales.en || typeof locales.en !== 'object') locales.en = {};
    if (!locales.ja || typeof locales.ja !== 'object') locales.ja = {};
    for (const code of ['en', 'ja']) {
        const block = /** @type {Record<string, unknown>} */ (locales)[code];
        const b =
            block && typeof block === 'object' && !Array.isArray(block)
                ? { ...block }
                : /** @type {Record<string, unknown>} */ ({});
        const w =
            b.world && typeof b.world === 'object' && !Array.isArray(b.world)
                ? { .../** @type {Record<string, unknown>} */ (b.world) }
                : {};
        w.introGallery = makeSlots();
        b.world = w;
        locales[code] = b;
    }
    const normalized = normalizeLocalesWorldForStorage(locales);
    return normalizeArtistImportRow(
        {
            id: row.id,
            slug: row.slug,
            image: row.image,
            heroProfileImage: String(/** @type {Record<string, unknown>} */ (row).heroProfileImage ?? row.hero_profile_image ?? ''),
            featuredOrder: row.featuredOrder,
            visibility: row.visibility,
            updatedAt: new Date().toISOString(),
            contactEmail: row.contactEmail,
            filter: row.filter,
            galleryFilter: row.galleryFilter,
            locales: normalized,
            imported: row.imported,
            accessCode: row.accessCode,
        },
        pool,
        { forceImported: false }
    );
}

/**
 * @param {(locales: Record<string, unknown> | null | undefined) => boolean} matchLocales
 * @returns {Promise<number>}
 */
async function applyLegacyIntroGalleryToMatchingRows(matchLocales) {
    const rows = await getArtistsForStudio();
    const pool = collectAccessCodesFromArtists(rows);
    /** @type {object[]} */
    const updates = [];
    for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        if (!matchLocales(row.locales)) continue;
        updates.push(buildArtistRowWithLegacyIntroGallery(row, pool));
    }
    if (!updates.length) {
        return 0;
    }
    await bulkUpsertArtistsStudio(updates);
    return updates.length;
}

/**
 * Fill empty EN intro gallery (and mirror EN→JA) with legacy CDN URLs (Studio → Sync Gallery).
 * @returns {Promise<number>} number of artists updated
 */
export async function syncStudioArtistsLegacyIntroGalleries() {
    return applyLegacyIntroGalleryToMatchingRows(needsIntroGallerySync);
}

/**
 * One-off: replace EN+JA intro gallery when any EN slot uses dead Firebase Storage URLs.
 * @returns {Promise<number>} number of artists updated
 */
export async function migrateStudioArtistsFirebaseIntroGalleries() {
    return applyLegacyIntroGalleryToMatchingRows(hasFirebaseIntroGalleryUrl);
}

export async function bulkUpsertArtistsStudio(records) {
    if (!Array.isArray(records) || !records.length) return 0;
    if (getDataSource() === 'test') {
        const overlay = readStudioLs(LS_ARTISTS_OVERLAY) || {};
        for (const rec of records) {
            overlay[rec.profile.id] = artistRecordToTestOverlayShape(rec);
        }
        writeStudioLs(LS_ARTISTS_OVERLAY, overlay);
        return records.length;
    }
    const actor = await getStudioAuthenticatedActor();
    const motoko = records.map(toMotokoArtistRecord);
    const heroUrls = records.map((rec) => {
        const p = rec?.profile && typeof rec.profile === 'object' ? rec.profile : rec;
        return String(/** @type {Record<string, unknown>} */ (p).heroProfileImage ?? p.hero_profile_image ?? '').trim();
    });
    if (typeof actor.bulkUpsertArtists === 'function') {
        await actor.bulkUpsertArtists(motoko, heroUrls);
    } else {
        if (typeof actor.upsertArtist !== 'function') {
            throw new Error('upsertArtist missing — run dfx generate fusion-app-backend.');
        }
        for (let i = 0; i < motoko.length; i += 1) {
            await actor.upsertArtist(motoko[i], heroUrls[i] ?? '');
        }
    }
    if (typeof actor.bulkPutArtistFilterCohortYears === 'function') {
        const pairs = cohortNatPairsForCanisterBulk(records);
        if (pairs.length) {
            await actor.bulkPutArtistFilterCohortYears(pairs);
        }
    }
    return records.length;
}

/**
 * Test mode only: write a full artist object into the `artistsOverlay` localStorage map (emergency advanced edit).
 * Live data must use batch import or canister APIs — not this helper.
 *
 * @param {string} artistId
 * @param {string} jsonStr
 */
export function saveArtistTestOverlayJson(artistId, jsonStr) {
    if (getDataSource() !== 'test') {
        throw new Error(
            'Advanced artist JSON applies in test mode only. Use batch import or account tooling for live data.'
        );
    }
    let parsed;
    try {
        parsed = JSON.parse(jsonStr);
    } catch (e) {
        throw new Error(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('JSON must be a single artist object.');
    }
    if (String(/** @type {Record<string, unknown>} */ (parsed).id ?? '') !== String(artistId)) {
        throw new Error(`Artist id in JSON must match this row (${artistId}).`);
    }
    const overlay = readStudioLs(LS_ARTISTS_OVERLAY) || {};
    overlay[artistId] = parsed;
    writeStudioLs(LS_ARTISTS_OVERLAY, overlay);
}

/**
 * @param {unknown} parsed — JSON root (array or `{ programs }`)
 * @returns {Promise<number>}
 */
export async function batchImportProgramsFromJson(parsed) {
    const items = extractArrayFromBatchJson(parsed, 'programs');
    const rows = items.map((raw) => normalizeProgramImportRow(raw));
    return bulkUpsertProgramsStudio(rows);
}

/**
 * @param {object[]} records — ProgramRecord-like
 * @returns {Promise<number>}
 */
export async function bulkUpsertProgramsStudio(records) {
    if (!Array.isArray(records) || !records.length) return 0;
    if (getDataSource() === 'test') {
        for (const r of records) {
            await upsertProgramStudio(r);
        }
        return records.length;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.bulkUpsertPrograms === 'function') {
        await actor.bulkUpsertPrograms(records);
    } else {
        if (typeof actor.upsertProgram !== 'function') {
            throw new Error('upsertProgram missing — run dfx generate fusion-app-backend.');
        }
        for (const r of records) {
            await actor.upsertProgram(r);
        }
    }
    return records.length;
}

/**
 * Full artist row for profile (testData shape when possible).
 * @param {string} slug
 * @returns {Promise<object | null>}
 */
export async function getArtistBySlug(slug) {
    if (!slug) return null;
    if (getDataSource() === 'test') {
        const artists = testData.allArtists?.artists || [];
        const want = String(slug).trim().toLowerCase();
        const meta = readArtistFeaturedMeta();
        for (const a of artists) {
            if (a?.slug && String(a.slug).trim().toLowerCase() === want) {
                return mergeArtistFeaturedExtension(a, meta);
            }
        }
        return null;
    }
    const meta = await fetchFeaturedMergeMetaLive();
    _lastFeaturedMergeMeta = meta;
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.getArtistRecordBySlug === 'function') {
            const recOpt = await actor.getArtistRecordBySlug(slug);
            const rec = unwrapOpt(recOpt);
            if (rec) {
                const [cohortMap, mediaMap, heroMap, approvedMap, audioApprovedMap, audioFullSiteMap] =
                    await Promise.all([
                        fetchArtistCohortMap(actor),
                        fetchArtistMediaMap(actor),
                        fetchArtistHeroProfileMap(actor),
                        fetchArtistHeroProfileApprovedMap(actor),
                        fetchArtistAudioApprovedMap(actor),
                        fetchArtistAudioFullSiteApprovedMap(actor),
                    ]);
                const merged = artistFromRecord(
                    rec,
                    cohortMap,
                    mediaMap,
                    heroMap,
                    approvedMap,
                    audioApprovedMap,
                    audioFullSiteMap,
                );
                if (merged) {
                    if (typeof actor.getArtistBySlug === 'function') {
                        const profOpt = await actor.getArtistBySlug(slug);
                        const p = unwrapOpt(profOpt);
                        if (p && typeof p === 'object') {
                            const po = /** @type {Record<string, unknown>} */ (p);
                            merged.mostRecentProgram = String(
                                po.most_recent_program ?? po.mostRecentProgram ?? merged.mostRecentProgram ?? '',
                            );
                            if (po.heroProfileImageApproved != null || po.hero_profile_image_approved != null) {
                                merged.heroProfileImageApproved = Boolean(
                                    po.heroProfileImageApproved ?? po.hero_profile_image_approved,
                                );
                            }
                        }
                    }
                    await enrichArtistsWithAudioCollectionsAndApprovals(actor, [merged]);
                    return mergeArtistFeaturedExtension(merged, meta);
                }
            }
        }
        if (typeof actor.getArtistBySlug === 'function') {
            const profOpt = await actor.getArtistBySlug(slug);
            const p = unwrapOpt(profOpt);
            if (p) {
                const [approvedMap, audioApprovedMap, audioFullSiteMap, mediaMap] = await Promise.all([
                    fetchArtistHeroProfileApprovedMap(actor),
                    fetchArtistAudioApprovedMap(actor),
                    fetchArtistAudioFullSiteApprovedMap(actor),
                    fetchArtistMediaMap(actor),
                ]);
                const row = mapCanisterArtistRow(p, undefined, mediaMap);
                const withApproval = mergeAudioFullSiteApproved(
                    mergeAudioApproved(
                        mergeHeroProfileImageApproved(row, String(row.id ?? ''), approvedMap),
                        String(row.id ?? ''),
                        audioApprovedMap,
                    ),
                    String(row.id ?? ''),
                    audioFullSiteMap,
                );
                await enrichArtistsWithAudioCollectionsAndApprovals(actor, [withApproval]);
                return mergeArtistFeaturedExtension(withApproval, meta);
            }
        }
    } catch {
        /* actor / network */
    }
    return null;
}

const LS_PROFILE_SETTINGS_ARTIST = 'fusion-profile-settings-artist-id';

/**
 * Test mode: which roster id the profile settings editor loads (`localStorage`).
 * @returns {string | null}
 */
export function getProfileSettingsDevArtistId() {
    if (typeof window === 'undefined') return null;
    try {
        return window.localStorage.getItem(LS_PROFILE_SETTINGS_ARTIST);
    } catch {
        return null;
    }
}

/**
 * @param {string | null} id
 */
export function setProfileSettingsDevArtistId(id) {
    if (typeof window === 'undefined') return;
    try {
        if (id) window.localStorage.setItem(LS_PROFILE_SETTINGS_ARTIST, id);
        else window.localStorage.removeItem(LS_PROFILE_SETTINGS_ARTIST);
    } catch {
        /* quota */
    }
}

/**
 * Build a canister-shaped record from a test overlay / roster artist (settings UI in test mode).
 * @param {object} a
 */
function fakeArtistRecordFromTestArtist(a) {
    const p = normalizeArtistDefaults(a);
    const apps = readStudioLs('artistApplications');
    let appliedJson = null;
    if (apps && typeof apps === 'object' && apps[p.id] && typeof apps[p.id] === 'object') {
        try {
            appliedJson = JSON.stringify(apps[p.id]);
        } catch {
            appliedJson = null;
        }
    }
    return {
        profile: {
            id: p.id,
            slug: p.slug,
            image: toCloudFrontAssetUrl(p.image),
            featuredOrder: Math.max(0, Math.floor(Number(p.featuredOrder ?? 0))),
            visibility: String(p.visibility ?? 'public'),
            updatedAt: String(p.updatedAt ?? ''),
            contactEmail: String(p.contactEmail ?? '').trim(),
            filter: p.filter ? [p.filter] : [],
            galleryFilter: p.galleryFilter ? [p.galleryFilter] : [],
        },
            localesJson:
                p.locales && typeof p.locales === 'object'
                    ? JSON.stringify(distributeUploadedAssetUrls(p.locales))
                    : null,
        notesEncrypted: [],
        imported: Boolean(p.imported),
        accessCode: String(p.accessCode ?? ''),
        appliedJson,
    };
}

/**
 * Human-readable program title for notification emails (matches Studio program list heuristics).
 * @param {object | null | undefined} p program row from {@link getPrograms} or mapped record
 * @returns {string}
 */
export function getProgramDisplayNameFromRow(p) {
    if (!p || typeof p !== 'object') return '';
    const o = /** @type {Record<string, unknown>} */ (p);
    const id = String(o.id ?? '');
    if (o.enCard && typeof o.enCard === 'object') {
        const en = /** @type {Record<string, unknown>} */ (o.enCard);
        const pp =
            en.programPage && typeof en.programPage === 'object'
                ? /** @type {Record<string, unknown>} */ (en.programPage)
                : {};
        const t = String(pp.headline || en.headline || en.location || en.focus || id).trim();
        if (t) return t;
    }
    try {
        const lj = String(o.localesJson ?? '');
        if (lj) {
            const parsed = JSON.parse(lj);
            const en = parsed.en && typeof parsed.en === 'object' ? parsed.en : {};
            const pp = en.programPage && typeof en.programPage === 'object' ? en.programPage : {};
            const t = String(pp.headline || en.headline || en.location || en.focus || id).trim();
            if (t) return t;
        }
    } catch {
        /* ignore */
    }
    const rootPp =
        o.programPage && typeof o.programPage === 'object'
            ? /** @type {Record<string, unknown>} */ (o.programPage)
            : {};
    const t2 = String(
        rootPp.headline || o.headline || o.location || o.focus || id,
    ).trim();
    if (t2) return t2;
    if (id) {
        return id
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return 'Program';
}

/**
 * @param {string} programId
 * @returns {Promise<string>}
 */
export async function getProgramDisplayNameForNotification(programId) {
    const pid = String(programId || '').trim();
    if (!pid) return 'Program';
    const list = await getPrograms();
    const row = list.find((x) => x && String(/** @type {Record<string, unknown>} */ (x).id ?? '') === pid);
    if (row) {
        const n = getProgramDisplayNameFromRow(row);
        if (n) return n;
    }
    return pid
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Staff email for new program applications (Integration API + Resend).
 * @param {{ programName: string, payloadFields: Record<string, string>, submittedAt?: string, applicantsUrl?: string }} opts
 * @returns {{ subject: string, text: string }}
 */
export function buildNewApplicantStaffNotificationEmail(opts) {
    const programName = String(opts.programName || 'Program').trim() || 'Program';
    const payloadFields = opts.payloadFields || {};
    const applicantName =
        `${String(payloadFields.firstName || '').trim()} ${String(payloadFields.lastName || '').trim()}`.trim() ||
        '—';
    const websiteRaw = String(payloadFields.website || '').trim();
    const website = websiteRaw || '—';
    const submittedAt = String(opts.submittedAt || new Date().toISOString());
    const base = getPublicSiteOrigin().replace(/\/$/, '');
    const applicantsUrl = (opts.applicantsUrl || `${base}/studio#applicants`).replace(/\/$/, '');
    const subject = `New Fusion ${programName} Applicant`;
    const text = [
        `A new application was submitted for ${programName}.`,
        '',
        `Applicant: ${applicantName}`,
        `Website: ${website}`,
        `Submitted: ${submittedAt}`,
        '',
        `Review applicants in Studio: ${applicantsUrl}`,
    ].join('\n');
    return { subject, text };
}

/**
 * Staff email for new Program Draw / Award entries (Integration API + Resend).
 * @param {{
 *   programName: string,
 *   payloadFields: Record<string, string>,
 *   enteredAt?: string,
 *   paidEntry?: boolean,
 *   applicantsUrl?: string,
 * }} opts
 * @returns {{ subject: string, text: string }}
 */
export function buildNewDrawEntrantStaffNotificationEmail(opts) {
    const programName = String(opts.programName || 'Program').trim() || 'Program';
    const payloadFields = opts.payloadFields || {};
    const entrantName =
        `${String(payloadFields.firstName || '').trim()} ${String(payloadFields.lastName || '').trim()}`.trim() ||
        '—';
    const email = String(payloadFields.email || '').trim() || '—';
    const websiteRaw = String(payloadFields.website || '').trim();
    const website = websiteRaw || '—';
    const enteredAt = String(opts.enteredAt || new Date().toISOString());
    const entryPath = opts.paidEntry ? 'Paid ($50)' : 'Award credit';
    const base = getPublicSiteOrigin().replace(/\/$/, '');
    const applicantsUrl = (opts.applicantsUrl || `${base}/studio#applicants`).replace(/\/$/, '');
    const subject = `New Fusion ${programName} Program Draw Entry`;
    const text = [
        `A new Program Draw entry was submitted for ${programName}.`,
        '',
        `Entrant: ${entrantName}`,
        `Email: ${email}`,
        `Website: ${website}`,
        `Path: ${entryPath}`,
        `Entered: ${enteredAt}`,
        '',
        `Review Program Award entries in Studio → Applicants (Award mode): ${applicantsUrl}`,
    ].join('\n');
    return { subject, text };
}

/**
 * @param {string} programId
 * @param {Record<string, string>} payloadFields
 * @param {{ enteredAt?: string, paidEntry?: boolean }} [meta]
 */
async function notifyProgramDrawEnteredByEmail(programId, payloadFields, meta = {}) {
    const pid = String(programId || '').trim();
    if (!pid) return;
    const staffRecipients = getApplicationStaffNotificationEmails();
    if (!staffRecipients.length) return;
    const programName = await getProgramDisplayNameForNotification(pid);
    const { subject, text } = buildNewDrawEntrantStaffNotificationEmail({
        programName,
        payloadFields,
        enteredAt: meta.enteredAt,
        paidEntry: Boolean(meta.paidEntry),
    });
    await Promise.allSettled(
        staffRecipients.map((to) =>
            sendEmail({
                to,
                subject,
                text,
            }),
        ),
    );
}

/**
 * @param {string} programId
 * @param {Record<string, string>} payloadFields
 * @param {string} submittedAt
 */
async function notifyProgramApplicationSubmittedByEmail(programId, payloadFields, submittedAt) {
    const pid = String(programId || '').trim();
    const applicantName = `${String(payloadFields.firstName || '').trim()} ${String(payloadFields.lastName || '').trim()}`
        .trim();
    const applicantEmail = String(payloadFields.email || '').trim();
    const staffRecipients = getApplicationStaffNotificationEmails();
    const programName = await getProgramDisplayNameForNotification(pid);
    const { subject: staffSubject, text: staffText } = buildNewApplicantStaffNotificationEmail({
        programName,
        payloadFields,
        submittedAt,
    });
    const tasks = [];
    if (applicantEmail) {
        tasks.push(
            sendEmail({
                to: applicantEmail,
                subject: `We received your application (${pid})`,
                text: [
                    'Thank you — your program application was received.',
                    '',
                    `Program: ${pid}`,
                    applicantName ? `Name: ${applicantName}` : null,
                    `Submitted: ${submittedAt}`,
                    '',
                    'You can track progress in your profile dashboard when signed in.',
                ]
                    .filter(Boolean)
                    .join('\n'),
            })
        );
    }
    for (const to of staffRecipients) {
        tasks.push(
            sendEmail({
                to,
                subject: staffSubject,
                text: staffText,
            })
        );
    }
    await Promise.allSettled(tasks);
}

/** Preflight failure codes for {@link submitProgramApplication} (UI maps to copy). */
export const PROGRAM_APPLICATION_ERROR_CODE = {
    NO_ACCOUNT: 'no_account',
    NO_LINKED_ARTIST: 'no_linked_artist',
};

/**
 * Fail fast with clear codes before the canister traps (e.g. admin II with no `UserAccount`).
 * @param {import('@dfinity/agent').ActorSubclass} actor
 */
async function assertProgramApplicationPreflight(actor) {
    if (typeof actor.getAccountForCaller !== 'function') return;
    const raw = await actor.getAccountForCaller();
    const acc = Array.isArray(raw) ? (raw.length ? raw[0] : null) : raw;
    if (!acc || typeof acc !== 'object') {
        const e = /** @type {Error & { code?: string }} */ (new Error(PROGRAM_APPLICATION_ERROR_CODE.NO_ACCOUNT));
        e.code = PROGRAM_APPLICATION_ERROR_CODE.NO_ACCOUNT;
        throw e;
    }
    const lidRaw = acc.linkedArtistId ?? acc.linked_artist_id;
    let linkedId = '';
    if (lidRaw != null) {
        if (Array.isArray(lidRaw)) linkedId = lidRaw.length ? String(lidRaw[0]).trim() : '';
        else linkedId = String(lidRaw).trim();
    }
    if (!linkedId) {
        const e = /** @type {Error & { code?: string }} */ (new Error(PROGRAM_APPLICATION_ERROR_CODE.NO_LINKED_ARTIST));
        e.code = PROGRAM_APPLICATION_ERROR_CODE.NO_LINKED_ARTIST;
        throw e;
    }
}

/**
 * Persist program application for the linked artist (test: localStorage; live: canister).
 * @param {string} programId
 * @param {Record<string, string>} payloadFields — form fields (strings)
 * @returns {Promise<void>}
 */
export async function submitProgramApplication(programId, payloadFields) {
    const pid = String(programId || '').trim();
    if (!pid) throw new Error('programId required');
    const submittedAt = new Date().toISOString();
    const payloadJson = JSON.stringify(payloadFields);
    // Ensure inactive skeleton exists for application-only (and member) submitters.
    const ens = await ensureMyLinkedArtistProfileForApplication();
    if (ens === 'noAccount') {
        const e = /** @type {Error & { code?: string }} */ (new Error(PROGRAM_APPLICATION_ERROR_CODE.NO_ACCOUNT));
        e.code = PROGRAM_APPLICATION_ERROR_CODE.NO_ACCOUNT;
        throw e;
    }
    if (ens !== 'ok' && ens !== 'alreadyLinked') {
        const e = /** @type {Error & { code?: string }} */ (new Error(PROGRAM_APPLICATION_ERROR_CODE.NO_LINKED_ARTIST));
        e.code = PROGRAM_APPLICATION_ERROR_CODE.NO_LINKED_ARTIST;
        throw e;
    }
    if (getDataSource() === 'test') {
        const id = getProfileSettingsDevArtistId();
        if (!id) {
            throw new Error('Select which artist to apply as in Profile settings (test mode).');
        }
        const all = readStudioLs('artistApplications') || {};
        const next = { ...all };
        const perArtist = { ...(next[id] && typeof next[id] === 'object' ? next[id] : {}) };
        perArtist[pid] = { submittedAt, payload: { ...payloadFields } };
        next[id] = perArtist;
        writeStudioLs('artistApplications', next);
        const curApps = readStudioLs(LS_APPLICANTS);
        const list = Array.isArray(curApps) ? [...curApps] : [];
        const appId = `${id}|${pid}`;
        const row = {
            id: appId,
            programId: pid,
            email: String(payloadFields.email || ''),
            fullName: `${String(payloadFields.firstName || '').trim()} ${String(payloadFields.lastName || '').trim()}`
                .trim(),
            status: 'pending',
            createdAt: submittedAt,
            payloadJson,
        };
        const idx = list.findIndex((x) => String(x?.id || '') === appId);
        if (idx >= 0) list[idx] = row;
        else list.push(row);
        writeStudioLs(LS_APPLICANTS, list);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fusion-data-source-change', { detail: { source: 'test' } }));
        }
        await notifyProgramApplicationSubmittedByEmail(pid, payloadFields, submittedAt);
        return;
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.submitProgramApplication !== 'function') {
        throw new Error('submitProgramApplication unavailable — sign in and run dfx generate fusion-app-backend.');
    }
    await assertProgramApplicationPreflight(actor);
    await actor.submitProgramApplication(pid, payloadJson, submittedAt);
    await notifyProgramApplicationSubmittedByEmail(pid, payloadFields, submittedAt);
}

/**
 * Verify the current session can persist a program application before charging payment.
 * Throws `PROGRAM_APPLICATION_ERROR_CODE` variants when blocked.
 * @returns {Promise<void>}
 */
export async function assertProgramApplicationSubmissionReady() {
    const ens = await ensureMyLinkedArtistProfileForApplication();
    if (ens === 'noAccount') {
        const e = /** @type {Error & { code?: string }} */ (new Error(PROGRAM_APPLICATION_ERROR_CODE.NO_ACCOUNT));
        e.code = PROGRAM_APPLICATION_ERROR_CODE.NO_ACCOUNT;
        throw e;
    }
    if (ens !== 'ok' && ens !== 'alreadyLinked') {
        const e = /** @type {Error & { code?: string }} */ (new Error(PROGRAM_APPLICATION_ERROR_CODE.NO_LINKED_ARTIST));
        e.code = PROGRAM_APPLICATION_ERROR_CODE.NO_LINKED_ARTIST;
        throw e;
    }
    if (getDataSource() === 'test') {
        return;
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor) {
        const e = /** @type {Error & { code?: string }} */ (new Error(PROGRAM_APPLICATION_ERROR_CODE.NO_ACCOUNT));
        e.code = PROGRAM_APPLICATION_ERROR_CODE.NO_ACCOUNT;
        throw e;
    }
    await assertProgramApplicationPreflight(actor);
}

/**
 * Billing gate: mirrors Motoko `MembershipAccessResult`.
 * @returns {Promise<'noAccount' | 'exempt' | 'ok' | 'needsSubscription'>}
 */
export async function getMembershipAccessForCaller() {
    if (getDataSource() === 'test') {
        return 'exempt';
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor) {
        return 'noAccount';
    }
    if (typeof actor.getMembershipAccessForCaller !== 'function') {
        return 'ok';
    }
    const r = await actor.getMembershipAccessForCaller();
    if (r && typeof r === 'object') {
        if ('noAccount' in r) return 'noAccount';
        if ('exempt' in r) return 'exempt';
        if ('ok' in r) return 'ok';
        if ('needsSubscription' in r) return 'needsSubscription';
    }
    return 'ok';
}

/**
 * Application fee due for the signed-in caller (runs quarterly credit accrual server-side).
 * @param {string} [programId]
 * @returns {Promise<{ dueCents: number, reason: string, membershipTier: string, appCreditBalance: number }>}
 */
export async function applicationFeeDueForCaller(programId = '') {
    const { APPLICATION_FEE_GUEST_CENTS, calendarQuarterKey } = await import(
        './applicationFeePolicy.js'
    );
    const quarterKey = calendarQuarterKey();
    if (getDataSource() === 'test') {
        return {
            dueCents: 0,
            reason: 'exempt',
            membershipTier: 'annual',
            appCreditBalance: 0,
        };
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.applicationFeeDueForCaller !== 'function') {
        return {
            dueCents: APPLICATION_FEE_GUEST_CENTS,
            reason: 'application_only',
            membershipTier: '',
            appCreditBalance: 0,
        };
    }
    try {
        const r = await actor.applicationFeeDueForCaller(
            String(programId || ''),
            quarterKey,
        );
        return {
            dueCents: Number(r?.dueCents ?? APPLICATION_FEE_GUEST_CENTS) || 0,
            reason: String(r?.reason || ''),
            membershipTier: String(r?.membershipTier || ''),
            appCreditBalance: Number(r?.appCreditBalance ?? 0) || 0,
        };
    } catch {
        return {
            dueCents: APPLICATION_FEE_GUEST_CENTS,
            reason: 'application_only',
            membershipTier: '',
            appCreditBalance: 0,
        };
    }
}

/** @returns {Promise<string>} */
export async function getMembershipTierForCaller() {
    if (getDataSource() === 'test') return 'annual';
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.getMembershipTierForCaller !== 'function') return '';
    try {
        return String((await actor.getMembershipTierForCaller()) || '');
    } catch {
        return '';
    }
}

/** @returns {Promise<number>} */
export async function getQuarterlyAppCreditBalanceForCaller() {
    if (getDataSource() === 'test') return 0;
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.getQuarterlyAppCreditBalanceForCaller !== 'function') return 0;
    try {
        return Number(await actor.getQuarterlyAppCreditBalanceForCaller()) || 0;
    } catch {
        return 0;
    }
}

/**
 * Accrue-then-return application credits (preferred for Explore / forms).
 * @returns {Promise<{ balance: number, membershipTier: string, lastAccruedKey: string, nextAccrualHint: string }>}
 */
export async function getApplicationCreditsForCaller() {
    const { calendarQuarterKey } = await import('./applicationFeePolicy.js');
    const quarterKey = calendarQuarterKey();
    if (getDataSource() === 'test') {
        return {
            balance: 4,
            membershipTier: 'annual',
            lastAccruedKey: String(new Date().getUTCFullYear()),
            nextAccrualHint: '',
        };
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.getApplicationCreditsForCaller !== 'function') {
        const bal = await getQuarterlyAppCreditBalanceForCaller();
        return { balance: bal, membershipTier: '', lastAccruedKey: '', nextAccrualHint: '' };
    }
    try {
        const r = await actor.getApplicationCreditsForCaller(quarterKey);
        return {
            balance: Number(r?.balance ?? 0) || 0,
            membershipTier: String(r?.membershipTier || ''),
            lastAccruedKey: String(r?.lastAccruedKey || ''),
            nextAccrualHint: String(r?.nextAccrualHint || ''),
        };
    } catch {
        return { balance: 0, membershipTier: '', lastAccruedKey: '', nextAccrualHint: '' };
    }
}

/**
 * @returns {Promise<{ balance: number, membershipTier: string, lastGrantedKey: string, nextGrantHint: string }>}
 */
export async function getAwardCreditsForCaller() {
    const { calendarQuarterKey } = await import('./applicationFeePolicy.js');
    const quarterKey = calendarQuarterKey();
    if (getDataSource() === 'test') {
        // Default 0 — credits are earned via quarterly/annual accrual only (not seeded).
        return {
            balance: 0,
            membershipTier: '',
            lastGrantedKey: '',
            nextGrantHint: '',
        };
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.getAwardCreditsForCaller !== 'function') {
        return { balance: 0, membershipTier: '', lastGrantedKey: '', nextGrantHint: '' };
    }
    try {
        const r = await actor.getAwardCreditsForCaller(quarterKey);
        return {
            balance: Number(r?.balance ?? 0) || 0,
            membershipTier: String(r?.membershipTier || ''),
            lastGrantedKey: String(r?.lastGrantedKey || ''),
            nextGrantHint: String(r?.nextGrantHint || ''),
        };
    } catch {
        return { balance: 0, membershipTier: '', lastGrantedKey: '', nextGrantHint: '' };
    }
}

/** @param {string} programId */
export async function getMyProgramPath(programId) {
    const id = String(programId || '').trim();
    if (!id) return '';
    if (getDataSource() === 'test') return '';
    try {
        const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
        const actor = await getAuthenticatedFusionBackendActor();
        if (!actor || typeof actor.getMyProgramPath !== 'function') return '';
        return String((await actor.getMyProgramPath(id)) || '');
    } catch {
        return '';
    }
}

/**
 * @param {string} programId
 * @param {{ paypalOrderId?: string, paidEntryReceipt?: boolean, payload?: Record<string, unknown> | string }} [opts]
 */
export async function enterProgramAward(programId, opts = {}) {
    const id = String(programId || '').trim();
    if (!id) throw new Error('programId required');
    const { calendarQuarterKey } = await import('./applicationFeePolicy.js');
    /** @type {Record<string, string>} */
    let payloadFields = {};
    if (opts.payload && typeof opts.payload === 'object' && !Array.isArray(opts.payload)) {
        payloadFields = /** @type {Record<string, string>} */ (opts.payload);
    } else if (typeof opts.payload === 'string') {
        try {
            const parsed = JSON.parse(opts.payload);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                payloadFields = /** @type {Record<string, string>} */ (parsed);
            }
        } catch {
            /* ignore */
        }
    }
    const payloadJson =
        typeof opts.payload === 'string'
            ? opts.payload
            : JSON.stringify(payloadFields);
    const paypalOrderId = String(opts.paypalOrderId || '').trim();
    // Legacy: paidEntryReceipt true without order id is no longer accepted on-canister.
    if (opts.paidEntryReceipt === true && !paypalOrderId) {
        throw new Error('Paid Program Award entry requires a PayPal order id.');
    }
    if (getDataSource() === 'test') {
        const entry = {
            id: `test|${id}`,
            programId: id,
            principalText: 'test',
            status: 'entered',
            enteredAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            paidEntry: Boolean(paypalOrderId),
            payloadJson,
        };
        try {
            await notifyProgramDrawEnteredByEmail(id, payloadFields, {
                enteredAt: entry.enteredAt,
                paidEntry: entry.paidEntry,
            });
        } catch {
            /* staff email is best-effort */
        }
        return entry;
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.enterProgramAward !== 'function') {
        throw new Error('enterProgramAward missing — deploy backend and run dfx generate.');
    }
    const entry = await actor.enterProgramAward(id, paypalOrderId, calendarQuarterKey(), payloadJson);
    try {
        const paidEntry =
            entry && typeof entry === 'object'
                ? Boolean(/** @type {{ paidEntry?: boolean }} */ (entry).paidEntry)
                : Boolean(paypalOrderId);
        const enteredAt =
            entry && typeof entry === 'object'
                ? String(/** @type {{ enteredAt?: string }} */ (entry).enteredAt || '')
                : '';
        await notifyProgramDrawEnteredByEmail(id, payloadFields, {
            enteredAt: enteredAt || new Date().toISOString(),
            paidEntry,
        });
    } catch {
        /* staff email is best-effort — do not fail the enter */
    }
    return entry;
}

/** @param {string} programId */
export async function exitProgramAward(programId) {
    const id = String(programId || '').trim();
    if (!id) throw new Error('programId required');
    if (getDataSource() === 'test') return;
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.exitProgramAward !== 'function') {
        throw new Error('exitProgramAward missing — deploy backend and run dfx generate.');
    }
    await actor.exitProgramAward(id);
}

/**
 * Withdraw a formal application for a program (no application-credit refund).
 * Clears the application path so the member may enter the Program Draw.
 * @param {string} programId
 */
export async function withdrawMyProgramApplication(programId) {
    const id = String(programId || '').trim();
    if (!id) throw new Error('programId required');
    if (getDataSource() === 'test') {
        const artistId = getProfileSettingsDevArtistId();
        if (!artistId) return;
        const curApps = readStudioLs(LS_APPLICANTS);
        const list = Array.isArray(curApps) ? [...curApps] : [];
        const appId = `${artistId}|${id}`;
        const idx = list.findIndex((x) => String(x?.id || '') === appId);
        if (idx >= 0) {
            list[idx] = { ...list[idx], status: 'withdrawn' };
            writeStudioLs(LS_APPLICANTS, list);
        }
        const all = readStudioLs('artistApplications') || {};
        const next = { ...all };
        const perArtist = { ...(next[artistId] && typeof next[artistId] === 'object' ? next[artistId] : {}) };
        if (perArtist[id] && typeof perArtist[id] === 'object') {
            perArtist[id] = { ...perArtist[id], status: 'withdrawn', applicationStatus: 'withdrawn' };
            next[artistId] = perArtist;
            writeStudioLs('artistApplications', next);
        }
        try {
            const applicant =
                idx >= 0
                    ? list[idx]
                    : { id: appId, programId: id, email: '', fullName: '', status: 'withdrawn' };
            const { resolveArtistForApplicant, removeApplicantFromProgramConfirmedList } =
                await import('./studioArtistPrograms.js');
            const artists = await getArtists();
            const artist = resolveArtistForApplicant(applicant, artists);
            await removeApplicantFromProgramConfirmedList(applicant, artist);
        } catch (err) {
            console.warn('[withdraw] remove confirmed artist:', err);
        }
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fusion-data-source-change', { detail: { source: 'test' } }));
        }
        return;
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.withdrawMyProgramApplication !== 'function') {
        throw new Error('withdrawMyProgramApplication missing — deploy backend and run dfx generate.');
    }
    await actor.withdrawMyProgramApplication(id);
}

/** @param {string} programId */
export async function getMyProgramAwardEntry(programId) {
    const id = String(programId || '').trim();
    if (!id) return null;
    if (getDataSource() === 'test') return null;
    try {
        const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
        const actor = await getAuthenticatedFusionBackendActor();
        if (!actor || typeof actor.getMyProgramAwardEntry !== 'function') return null;
        return unwrapOpt(await actor.getMyProgramAwardEntry(id));
    } catch {
        return null;
    }
}

/**
 * Authenticated: all Program Award / Draw entries for the caller.
 * @returns {Promise<object[]>}
 */
export async function listMyProgramAwardEntries() {
    if (getDataSource() === 'test') return [];
    try {
        const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
        const actor = await getAuthenticatedFusionBackendActor();
        if (!actor || typeof actor.listMyProgramAwardEntries !== 'function') return [];
        const rows = await actor.listMyProgramAwardEntries();
        return Array.isArray(rows) ? rows : [];
    } catch {
        return [];
    }
}

/** @type {Map<string, { at: number, row: { active: boolean, totalSlots: number, enteredCount: number, cycle: number } | null }>} */
const _drawProgressCache = new Map();
const DRAW_PROGRESS_CACHE_MS = 8000;
/** Cap hung IC calls so display preload cannot stall on progress. */
const DRAW_PROGRESS_TIMEOUT_MS = 2500;

/**
 * Clear progress TTL cache after enter/exit so the public bar updates immediately.
 * @param {string} [programId] — when omitted, clears all program ids
 */
export function invalidateProgramDrawProgressCache(programId) {
    const id = String(programId || '').trim();
    if (!id) {
        _drawProgressCache.clear();
        return;
    }
    _drawProgressCache.delete(id);
}

/**
 * Public draw progress (entered count + slot cap). Degrades if bindings lag.
 * Does not chain a second config fetch — callers already have config when needed.
 * @param {string} programId
 * @returns {Promise<{ active: boolean, totalSlots: number, enteredCount: number, cycle: number } | null>}
 */
export async function getProgramDrawProgressPublic(programId) {
    const id = String(programId || '').trim();
    if (!id) return null;
    const cached = _drawProgressCache.get(id);
    if (cached && Date.now() - cached.at < DRAW_PROGRESS_CACHE_MS) {
        return cached.row;
    }
    if (getDataSource() === 'test') {
        const cfg = await getProgramDrawConfigPublic(id);
        const row = {
            active: cfg ? Boolean(cfg.active) : false,
            totalSlots: Number(cfg?.totalSlots) > 0 ? Math.floor(Number(cfg.totalSlots)) : 100,
            enteredCount: 0,
            cycle: 1,
        };
        _drawProgressCache.set(id, { at: Date.now(), row });
        return row;
    }
    try {
        const actor = await getFusionBackendActor();
        if (!actor || typeof actor.getProgramDrawProgressPublic !== 'function') {
            // Bindings lag / old canister — skip; display uses config for active/total.
            _drawProgressCache.set(id, { at: Date.now(), row: null });
            return null;
        }
        const row = await Promise.race([
            actor.getProgramDrawProgressPublic(id).then((raw) => {
                if (!raw || typeof raw !== 'object') return null;
                const totalSlots = Number(raw.totalSlots ?? raw.total_slots ?? 100);
                const enteredCount = Number(raw.enteredCount ?? raw.entered_count ?? 0);
                const cycle = Number(raw.cycle ?? 1);
                return {
                    active: Boolean(raw.active),
                    totalSlots:
                        Number.isFinite(totalSlots) && totalSlots > 0 ? Math.floor(totalSlots) : 100,
                    enteredCount:
                        Number.isFinite(enteredCount) && enteredCount >= 0
                            ? Math.floor(enteredCount)
                            : 0,
                    cycle: Number.isFinite(cycle) && cycle > 0 ? Math.floor(cycle) : 1,
                };
            }),
            new Promise((resolve) => {
                setTimeout(() => resolve(null), DRAW_PROGRESS_TIMEOUT_MS);
            }),
        ]);
        _drawProgressCache.set(id, { at: Date.now(), row });
        return row;
    } catch {
        _drawProgressCache.set(id, { at: Date.now(), row: null });
        return null;
    }
}

/**
 * @param {string} programId
 * @returns {Promise<{ entry: object, payloadJson: string } | null>}
 */
export async function getMyProgramAwardEntryDetailed(programId) {
    const id = String(programId || '').trim();
    if (!id) return null;
    if (getDataSource() === 'test') return null;
    try {
        const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
        const actor = await getAuthenticatedFusionBackendActor();
        if (!actor) return null;
        if (typeof actor.getMyProgramAwardEntryDetailed === 'function') {
            const pair = unwrapOpt(await actor.getMyProgramAwardEntryDetailed(id));
            if (!pair) return null;
            if (Array.isArray(pair) && pair.length >= 2) {
                return { entry: pair[0], payloadJson: String(pair[1] || '') };
            }
            if (pair && typeof pair === 'object') {
                const o = /** @type {Record<string, unknown>} */ (pair);
                return {
                    entry: o.entry || o[0],
                    payloadJson: String(o.payloadJson ?? o[1] ?? ''),
                };
            }
            return null;
        }
        const entry = await getMyProgramAwardEntry(id);
        if (!entry) return null;
        return { entry, payloadJson: '' };
    } catch {
        return null;
    }
}

/** @param {string} programId */
export async function listProgramAwardEntriesStudio(programId) {
    const id = String(programId || '').trim();
    if (!id) return [];
    if (getDataSource() === 'test') return [];
    try {
        const actor = await getStudioAuthenticatedActor();
        if (!actor) return [];
        if (typeof actor.listProgramAwardEntriesDetailed === 'function') {
            const rows = await actor.listProgramAwardEntriesDetailed(id);
            if (!Array.isArray(rows)) return [];
            return rows.map((row) => {
                if (Array.isArray(row) && row.length >= 2) {
                    const entry = row[0] && typeof row[0] === 'object' ? row[0] : {};
                    return { ...entry, payloadJson: String(row[1] || '') };
                }
                if (row && typeof row === 'object') {
                    const o = /** @type {Record<string, unknown>} */ (row);
                    return {
                        ...(o.entry && typeof o.entry === 'object' ? o.entry : o),
                        payloadJson: String(o.payloadJson ?? ''),
                    };
                }
                return row;
            });
        }
        if (typeof actor.listProgramAwardEntries !== 'function') return [];
        const rows = await actor.listProgramAwardEntries(id);
        return Array.isArray(rows) ? rows.map((e) => ({ ...e, payloadJson: '' })) : [];
    } catch {
        return [];
    }
}

/**
 * Staff: manually add a Program Award / Draw pool entry.
 * Principal is optional (staff-attested recovery when II/account never linked).
 * PayPal order id still requires a principal for ledger attestation.
 * @param {string} programId
 * @param {{
 *   principal?: string,
 *   firstName: string,
 *   lastName: string,
 *   email: string,
 *   website?: string,
 *   bioStatement?: string,
 *   paypalOrderId?: string,
 * }} opts
 */
export async function staffEnterProgramAwardManualStudio(programId, opts = {}) {
    const id = String(programId || '').trim();
    const principalText = String(opts.principal || '').trim();
    if (!id) throw new Error('programId required');
    const firstName = String(opts.firstName || '').trim();
    const lastName = String(opts.lastName || '').trim();
    const email = String(opts.email || '').trim();
    if (!firstName || !lastName || !email) {
        throw new Error('First name, last name, and email are required');
    }
    const paypalOrderId = String(opts.paypalOrderId || '').trim();
    if (paypalOrderId && !principalText) {
        throw new Error('Member principal is required when attaching a PayPal order id.');
    }
    const payloadJson = JSON.stringify({
        firstName,
        lastName,
        email,
        website: String(opts.website || '').trim(),
        bioStatement: String(opts.bioStatement || '').trim(),
        staffManualEntry: true,
    });
    if (getDataSource() === 'test') {
        const entryId = principalText
            ? `${principalText}|${id}`
            : `staffaward:${email.toLowerCase()}|${id}`;
        return {
            id: entryId,
            programId: id,
            principalText,
            status: 'entered',
            enteredAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            paidEntry: true,
            payloadJson,
        };
    }
    const { calendarQuarterKey } = await import('./applicationFeePolicy.js');
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffEnterProgramAwardManual !== 'function') {
        throw new Error(
            'staffEnterProgramAwardManual missing — deploy backend and run dfx generate.',
        );
    }
    return actor.staffEnterProgramAwardManual(
        id,
        principalText,
        payloadJson,
        paypalOrderId,
        calendarQuarterKey(),
    );
}

/**
 * Public masked draw applicant names ("F. Lastname").
 * @param {string} programId
 * @returns {Promise<string[]>}
 */
export async function listProgramAwardApplicantNamesPublic(programId) {
    const id = String(programId || '').trim();
    if (!id) return [];
    if (getDataSource() === 'test') return [];
    try {
        const { getFusionBackendActor } = await import('./earlyAccessSubscribe.js');
        const actor = await getFusionBackendActor();
        if (!actor || typeof actor.listProgramAwardApplicantNamesPublic !== 'function') {
            return [];
        }
        const rows = await actor.listProgramAwardApplicantNamesPublic(id);
        return Array.isArray(rows) ? rows.map((n) => String(n || '').trim()).filter(Boolean) : [];
    } catch {
        return [];
    }
}

/**
 * @param {string} artistId
 * @returns {Promise<string>}
 */
export async function adminFindPrincipalForArtistStudio(artistId) {
    const id = String(artistId || '').trim();
    if (!id) return '';
    if (getDataSource() === 'test') return '';
    try {
        const actor = await getStudioAuthenticatedActor();
        if (!actor || typeof actor.adminFindPrincipalForArtist !== 'function') return '';
        const opt = await actor.adminFindPrincipalForArtist(id);
        const p = unwrapOpt(opt);
        return p != null ? String(p.toText ? p.toText() : p) : '';
    } catch {
        return '';
    }
}

/**
 * @param {string} principalText
 * @returns {Promise<{ balance: number, membershipTier: string, lastAccruedKey: string }>}
 */
export async function adminGetApplicationCreditsStudio(principalText) {
    const p = String(principalText || '').trim();
    if (!p) return { balance: 0, membershipTier: '', lastAccruedKey: '' };
    if (getDataSource() === 'test') {
        return { balance: 2, membershipTier: 'quarterly', lastAccruedKey: '2026-Q2' };
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminGetApplicationCredits !== 'function') {
        return { balance: 0, membershipTier: '', lastAccruedKey: '' };
    }
    const { Principal } = await import('@dfinity/principal');
    const r = await actor.adminGetApplicationCredits(Principal.fromText(p));
    return {
        balance: Number(r?.balance ?? 0) || 0,
        membershipTier: String(r?.membershipTier || ''),
        lastAccruedKey: String(r?.lastAccruedKey || ''),
    };
}

/**
 * @param {string} principalText
 */
export async function adminGetAwardCreditsStudio(principalText) {
    const p = String(principalText || '').trim();
    if (!p) return { balance: 0, membershipTier: '', lastGrantedKey: '' };
    if (getDataSource() === 'test') {
        return { balance: 1, membershipTier: 'quarterly', lastGrantedKey: '2026-Q2' };
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminGetAwardCredits !== 'function') {
        return { balance: 0, membershipTier: '', lastGrantedKey: '' };
    }
    const { Principal } = await import('@dfinity/principal');
    const r = await actor.adminGetAwardCredits(Principal.fromText(p));
    return {
        balance: Number(r?.balance ?? 0) || 0,
        membershipTier: String(r?.membershipTier || ''),
        lastGrantedKey: String(r?.lastGrantedKey || ''),
    };
}

/**
 * @param {string} principalText
 * @param {{ credit?: number, debit?: number, note?: string }} adj
 */
export async function adminAdjustApplicationCreditsStudio(principalText, adj) {
    const p = String(principalText || '').trim();
    if (!p) throw new Error('principal required');
    const credit = Math.max(0, Math.floor(Number(adj?.credit) || 0));
    const debit = Math.max(0, Math.floor(Number(adj?.debit) || 0));
    const note = String(adj?.note || 'studio_adjust').slice(0, 200);
    if (getDataSource() === 'test') return Math.max(0, credit - debit);
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminAdjustApplicationCredits !== 'function') {
        throw new Error('adminAdjustApplicationCredits missing — deploy backend and run dfx generate.');
    }
    const { Principal } = await import('@dfinity/principal');
    return Number(await actor.adminAdjustApplicationCredits(Principal.fromText(p), credit, debit, note));
}

/**
 * @param {string} principalText
 * @param {{ credit?: number, debit?: number, note?: string }} adj
 */
export async function adminAdjustAwardCreditsStudio(principalText, adj) {
    const p = String(principalText || '').trim();
    if (!p) throw new Error('principal required');
    const credit = Math.max(0, Math.floor(Number(adj?.credit) || 0));
    const debit = Math.max(0, Math.floor(Number(adj?.debit) || 0));
    const note = String(adj?.note || 'studio_adjust').slice(0, 200);
    if (getDataSource() === 'test') return Math.max(0, credit - debit);
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminAdjustAwardCredits !== 'function') {
        throw new Error('adminAdjustAwardCredits missing — deploy backend and run dfx generate.');
    }
    const { Principal } = await import('@dfinity/principal');
    return Number(await actor.adminAdjustAwardCredits(Principal.fromText(p), credit, debit, note));
}

/**
 * Admin one-shot: zero all Program Award entry balances (keeps last-granted keys).
 * @returns {Promise<number>} number of principals that had a positive balance
 */
export async function adminClearAllAwardEntryBalancesStudio() {
    if (getDataSource() === 'test') return 0;
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminClearAllAwardEntryBalances !== 'function') {
        throw new Error(
            'adminClearAllAwardEntryBalances missing — deploy backend and run dfx generate.',
        );
    }
    return Number(await actor.adminClearAllAwardEntryBalances());
}

/**
 * Caller account (role, linked artist id, membership fields). Test mode returns a stub.
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function getAccountForCaller() {
    if (getDataSource() === 'test') {
        const lid = getProfileSettingsDevArtistId();
        return {
            role: { artist: null },
            status: { active: null },
            linkedArtistId: lid ? [lid] : [],
            updatedAt: new Date().toISOString(),
        };
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.getAccountForCaller !== 'function') return null;
    const raw = await actor.getAccountForCaller();
    const acc = Array.isArray(raw) ? (raw.length ? raw[0] : null) : raw;
    return acc && typeof acc === 'object' ? /** @type {Record<string, unknown>} */ (acc) : null;
}

/**
 * Program payment state for the logged-in member dashboard.
 * @returns {Promise<{ approvedPrograms: Array<Record<string, unknown>>, summaries: Array<Record<string, unknown>>, ledger: Array<Record<string, unknown>>, plans: Array<Record<string, unknown>> }>}
 */
export async function getMyProgramPayments() {
    if (getDataSource() === 'test') {
        return {
            approvedPrograms: [
                {
                    applicationId: `${getProfileSettingsDevArtistId() || 'demo'}|fusionKaga`,
                    programId: 'fusionKaga',
                    status: 'accepted',
                    email: 'demo.applicant@example.com',
                    fullName: 'Demo Applicant',
                    createdAt: '2026-01-15T12:00:00.000Z',
                },
            ],
            summaries: [],
            ledger: [],
            plans: [],
        };
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.getMyProgramPaymentsJson !== 'function') {
        return { approvedPrograms: [], summaries: [], ledger: [], plans: [] };
    }
    const raw = await actor.getMyProgramPaymentsJson();
    try {
        const parsed = JSON.parse(String(raw || '{}'));
        return {
            approvedPrograms: Array.isArray(parsed.approvedPrograms) ? parsed.approvedPrograms : [],
            summaries: Array.isArray(parsed.summaries) ? parsed.summaries : [],
            ledger: Array.isArray(parsed.ledger) ? parsed.ledger : [],
            plans: Array.isArray(parsed.plans) ? parsed.plans : [],
        };
    } catch {
        return { approvedPrograms: [], summaries: [], ledger: [], plans: [] };
    }
}

/**
 * Persist the applicant's travel pricing choice for a program payment.
 * @param {{ programId: string, applicationId?: string, ownFlight: boolean }} opts
 * @returns {Promise<void>}
 */
export async function setMyProgramPaymentFlightPreference(opts) {
    if (getDataSource() === 'test') return;
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.setMyProgramPaymentFlightPreference !== 'function') {
        throw new Error('Program flight preference API is not available. Regenerate declarations after backend deploy.');
    }
    await actor.setMyProgramPaymentFlightPreference(
        String(opts.programId || '').trim(),
        String(opts.applicationId || '').trim(),
        Boolean(opts.ownFlight),
        new Date().toISOString()
    );
}

/**
 * Studio Finance: set Own Flight pricing credit for an applicant (staff; unlocked after payments).
 * @param {{ applicantId: string, ownFlight: boolean }} opts
 * @returns {Promise<void>}
 */
export async function staffSetProgramPaymentFlightPreferenceStudio(opts) {
    const applicantId = String(opts?.applicantId || '').trim();
    const ownFlight = opts?.ownFlight === true;
    if (!applicantId) throw new Error('applicantId required');
    if (getDataSource() === 'test') {
        const stored = readStudioLs(LS_STAFF_FINANCE_PAYMENTS) || {
            summaries: [],
            ledger: [],
            plans: [],
        };
        stored.summaries = Array.isArray(stored.summaries) ? stored.summaries : [];
        let summary = stored.summaries.find((s) => String(s?.applicationId || '') === applicantId);
        if (!summary) {
            summary = {
                key: `test|${applicantId}`,
                applicationId: applicantId,
                programId: '',
                depositStatus: 'due',
                totalDueCents: 0,
                depositAmountCents: 100000,
                totalPaidCents: 0,
                outstandingCents: 0,
                refundedCents: 0,
                ownFlight: false,
            };
            stored.summaries.push(summary);
        }
        summary.ownFlight = ownFlight;
        summary.flightCreditCents = ownFlight ? 80000 : 0;
        writeStudioLs(LS_STAFF_FINANCE_PAYMENTS, stored);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffSetProgramPaymentFlightPreference !== 'function') {
        throw new Error(
            'Staff flight preference API is not available. Deploy backend and run dfx generate.',
        );
    }
    await actor.staffSetProgramPaymentFlightPreference(
        applicantId,
        ownFlight,
        new Date().toISOString(),
    );
}

/**
 * Create a minimal linked roster row when membership allows (`#ok` / `#exempt`). Idempotent.
 * Test mode: creates a local overlay artist and selects it when none is selected.
 * @returns {Promise<'ok' | 'alreadyLinked' | 'needsSubscription' | 'noAccount'>}
 */
/**
 * Decode `registerWithJoinAccessCode` variant from the generated actor.
 * @param {unknown} raw
 * @returns {'ok' | 'invalidCode' | 'wrongRole' | 'artistAlreadyLinked' | 'accountExists' | 'inviteInactive' | 'unknown'}
 */
export function interpretRegisterWithJoinAccessCodeResult(raw) {
    if (!raw || typeof raw !== 'object') return 'unknown';
    const o = /** @type {Record<string, unknown>} */ (raw);
    if ('ok' in o) return 'ok';
    if ('invalidCode' in o) return 'invalidCode';
    if ('wrongRole' in o) return 'wrongRole';
    if ('artistAlreadyLinked' in o) return 'artistAlreadyLinked';
    if ('accountExists' in o) return 'accountExists';
    if ('inviteInactive' in o) return 'inviteInactive';
    return 'unknown';
}

/**
 * Admin: create a single-use 8-digit join invite (`adminCreateJoinInviteCode`).
 * @param {Record<string, null>} role — e.g. `{ artist: null }`, `{ gallery: null }`
 * @returns {Promise<string>} eight-digit code
 */
export async function adminCreateJoinInviteCodeStudio(role) {
    if (getDataSource() === 'test') {
        let s = '';
        for (let i = 0; i < 8; i += 1) s += String(Math.floor(Math.random() * 10));
        return s;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.adminCreateJoinInviteCode !== 'function') {
        throw new Error('adminCreateJoinInviteCode unavailable — run dfx generate fusion-app-backend from the project root.');
    }
    return String(await actor.adminCreateJoinInviteCode(role));
}

/**
 * Backward-compatible alias used by Studio Applicants panel.
 * Generates an artist access invite that can be used to skip payment gating.
 * @returns {Promise<string>}
 */
export async function adminCreateProgramApplicationAccessCodeStudio() {
    return await adminCreateJoinInviteCodeStudio({ artist: null });
}

/**
 * Admin: create a single-use trial join invite code with role + month duration.
 * @param {Record<string, null>} role
 * @param {number} [trialMonths]
 * @returns {Promise<string>}
 */
export async function adminCreateTrialJoinInviteCodeStudio(role, trialMonths = 2) {
    if (getDataSource() === 'test') {
        let s = '';
        for (let i = 0; i < 8; i += 1) s += String(Math.floor(Math.random() * 10));
        return s;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.adminCreateTrialJoinInviteCode !== 'function') {
        throw new Error(
            'adminCreateTrialJoinInviteCode unavailable — run dfx generate fusion-app-backend from the project root.'
        );
    }
    const months = Number.isFinite(trialMonths) ? Math.max(1, Math.round(trialMonths)) : 2;
    return String(await actor.adminCreateTrialJoinInviteCode(role, months));
}

/**
 * Admin: all join invite rows (including redeemed). Filter by `active` for pending codes.
 * @returns {Promise<Array<[string, { role: Record<string, null>, active: boolean, createdAt: string }]>>}
 */
export async function adminListJoinInvitesStudio() {
    if (getDataSource() === 'test') {
        return [];
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminListJoinInvites !== 'function') {
        return [];
    }
    return await actor.adminListJoinInvites();
}

/**
 * Authenticated caller: redeem join invite or artist roster access code.
 * @param {Record<string, null>} role
 * @param {string} codeRaw
 * @returns {Promise<ReturnType<typeof interpretRegisterWithJoinAccessCodeResult>>}
 */
/**
 * @param {Record<string, null>} role
 * @param {string} codeRaw
 * @param {string} [firstName]
 * @param {string} [lastName]
 * @param {string} [email]
 * @returns {Promise<ReturnType<typeof interpretRegisterWithJoinAccessCodeResult>>}
 */
export async function registerWithJoinAccessCodeForCaller(role, codeRaw, firstName, lastName, email) {
    const code = String(codeRaw || '').replace(/\D/g, '');
    if (getDataSource() === 'test') {
        return code.length === 8 ? 'ok' : 'invalidCode';
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.registerWithJoinAccessCode !== 'function') {
        throw new Error('registerWithJoinAccessCode unavailable — sign in and run dfx generate fusion-app-backend.');
    }
    const fn = /** @type {(r: unknown, c: string, a: string, b: string, d: string) => Promise<unknown>} */ (
        actor.registerWithJoinAccessCode
    );
    const raw = await fn(role, code, String(firstName || ''), String(lastName || ''), String(email || ''));
    return interpretRegisterWithJoinAccessCodeResult(raw);
}

// ——— Promo / Invite / Partner Code wrappers ———

const LS_PROMO_CODES = 'fusion_test_promo_codes';
const LS_PROMO_REDEMPTIONS = 'fusion_test_promo_redemptions';

/**
 * Decode a Candid `ValidatePromoCodeResult` variant into a plain object.
 * @param {unknown} raw
 * @returns {{ valid: true, code: string, codeType: string, discountType: { type: string, value: number }, discountDurationMonths: number, displayText: string } | { valid: false, reason: string }}
 */
function interpretValidatePromoCodeResult(raw) {
    if (!raw || typeof raw !== 'object') return { valid: false, reason: 'unknown' };
    const o = /** @type {Record<string, unknown>} */ (raw);
    if ('invalidCode' in o) return { valid: false, reason: 'invalidCode' };
    if ('expired' in o) return { valid: false, reason: 'expired' };
    if ('maxRedemptionsReached' in o) return { valid: false, reason: 'maxRedemptionsReached' };
    if ('inactive' in o) return { valid: false, reason: 'inactive' };
    if ('ok' in o) {
        const pc = /** @type {Record<string, unknown>} */ (o.ok);
        const code = String(pc.code || '');
        const codeType = pc.codeType && typeof pc.codeType === 'object'
            ? Object.keys(pc.codeType)[0] || 'promo'
            : 'promo';
        const dt = /** @type {Record<string, unknown>} */ (pc.discountType || {});
        let discountType = { type: 'percentOff', value: 0 };
        if ('percentOff' in dt) discountType = { type: 'percentOff', value: Number(dt.percentOff) };
        else if ('fixedCentsOff' in dt) discountType = { type: 'fixedCentsOff', value: Number(dt.fixedCentsOff) };
        else if ('freeMonths' in dt) discountType = { type: 'freeMonths', value: Number(dt.freeMonths) };

        const months = Number(pc.discountDurationMonths || 1);
        let displayText = '';
        if (discountType.type === 'percentOff') {
            displayText = `${discountType.value}% off${months === 1 ? ' first month' : ` first ${months} months`}`;
        } else if (discountType.type === 'fixedCentsOff') {
            const dollars = (discountType.value / 100).toFixed(2);
            displayText = `$${dollars} off${months === 1 ? ' first month' : ` first ${months} months`}`;
        } else if (discountType.type === 'freeMonths') {
            displayText = `${discountType.value} month${discountType.value > 1 ? 's' : ''} free`;
        }
        return { valid: true, code, codeType, discountType, discountDurationMonths: months, displayText };
    }
    return { valid: false, reason: 'unknown' };
}

/**
 * Decode a Candid `RedeemPromoCodeResult` variant.
 * @param {unknown} raw
 * @returns {string}
 */
function interpretRedeemPromoCodeResult(raw) {
    if (!raw || typeof raw !== 'object') return 'unknown';
    const o = /** @type {Record<string, unknown>} */ (raw);
    if ('ok' in o) return 'ok';
    if ('invalidCode' in o) return 'invalidCode';
    if ('expired' in o) return 'expired';
    if ('maxRedemptionsReached' in o) return 'maxRedemptionsReached';
    if ('inactive' in o) return 'inactive';
    if ('alreadyRedeemed' in o) return 'alreadyRedeemed';
    return 'unknown';
}

/**
 * Staff/admin: create a promo, invite, or partner code.
 * @param {{ code: string, codeType: Record<string, null>, discountType: Record<string, number>, discountDurationMonths: number, maxRedemptions?: number | null, expiresAt?: string | null, partnerLabel?: string | null, campaignTag?: string | null }} opts
 * @returns {Promise<string>}
 */
export async function adminCreatePromoCodeStudio(opts) {
    if (getDataSource() === 'test') {
        const code = String(opts.code || '').trim().toUpperCase();
        const codes = JSON.parse(localStorage.getItem(LS_PROMO_CODES) || '[]');
        codes.push({ ...opts, code, active: true, currentRedemptions: 0, createdAt: new Date().toISOString() });
        localStorage.setItem(LS_PROMO_CODES, JSON.stringify(codes));
        return code;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.adminCreatePromoCode !== 'function') {
        throw new Error('adminCreatePromoCode unavailable — run dfx generate fusion-app-backend from the project root.');
    }
    return String(await actor.adminCreatePromoCode(
        opts.code,
        opts.codeType,
        opts.discountType,
        opts.discountDurationMonths,
        opts.maxRedemptions != null ? [opts.maxRedemptions] : [],
        opts.expiresAt != null ? [opts.expiresAt] : [],
        opts.partnerLabel != null ? [opts.partnerLabel] : [],
        opts.campaignTag != null ? [opts.campaignTag] : [],
    ));
}

/**
 * Validate a promo code for checkout — public query, no auth required.
 * @param {string} code
 * @returns {Promise<ReturnType<typeof interpretValidatePromoCodeResult>>}
 */
export async function validatePromoCodeForCheckout(code) {
    const norm = String(code || '').trim().toUpperCase();
    if (getDataSource() === 'test') {
        const codes = JSON.parse(localStorage.getItem(LS_PROMO_CODES) || '[]');
        const match = codes.find((c) => c.code === norm && c.active);
        if (!match) return { valid: false, reason: 'invalidCode' };
        return interpretValidatePromoCodeResult({ ok: match });
    }
    const actor = await getFusionBackendActor();
    if (typeof actor.validatePromoCode !== 'function') {
        return { valid: false, reason: 'unavailable' };
    }
    const raw = await actor.validatePromoCode(norm);
    return interpretValidatePromoCodeResult(raw);
}

/**
 * Authenticated caller: redeem a promo code after payment.
 * @param {string} code
 * @param {string | null} subscriptionId
 * @param {string} discountApplied
 * @returns {Promise<string>}
 */
export async function redeemPromoCodeForCaller(code, subscriptionId, discountApplied) {
    const norm = String(code || '').trim().toUpperCase();
    if (getDataSource() === 'test') {
        const redemptions = JSON.parse(localStorage.getItem(LS_PROMO_REDEMPTIONS) || '[]');
        redemptions.push({ code: norm, subscriptionId, discountApplied, redeemedAt: new Date().toISOString() });
        localStorage.setItem(LS_PROMO_REDEMPTIONS, JSON.stringify(redemptions));
        return 'ok';
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.redeemPromoCode !== 'function') {
        throw new Error('redeemPromoCode unavailable — sign in and run dfx generate fusion-app-backend.');
    }
    const raw = await actor.redeemPromoCode(
        norm,
        subscriptionId != null ? [subscriptionId] : [],
        String(discountApplied || ''),
    );
    return interpretRedeemPromoCodeResult(raw);
}

/**
 * Staff/admin: list all promo codes with redemption counts.
 * @returns {Promise<Array<object>>}
 */
export async function staffListPromoCodesStudio() {
    if (getDataSource() === 'test') {
        return JSON.parse(localStorage.getItem(LS_PROMO_CODES) || '[]');
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffListPromoCodesJson !== 'function') {
        return [];
    }
    try {
        const raw = await actor.staffListPromoCodesJson();
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/**
 * Staff/admin: activate or retire a promo code.
 * @param {string} code
 * @param {boolean} active
 * @returns {Promise<boolean>}
 */
export async function staffSetPromoCodeActiveStudio(code, active) {
    const norm = String(code || '').trim().toUpperCase();
    if (!norm) return false;
    if (getDataSource() === 'test') {
        const codes = JSON.parse(localStorage.getItem(LS_PROMO_CODES) || '[]');
        const idx = codes.findIndex((c) => String(c?.code || '').toUpperCase() === norm);
        if (idx < 0) return false;
        codes[idx] = { ...codes[idx], active: Boolean(active) };
        localStorage.setItem(LS_PROMO_CODES, JSON.stringify(codes));
        return true;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffSetPromoCodeActive !== 'function') {
        throw new Error('staffSetPromoCodeActive unavailable — run dfx generate fusion-app-backend from the project root.');
    }
    return Boolean(await actor.staffSetPromoCodeActive(norm, Boolean(active)));
}

// ——— Member invite code wrappers ———

const LS_MEMBER_INVITES = 'fusion_test_member_invites';
const LS_INVITE_LINEAGE = 'fusion_test_invite_lineage';

/**
 * Generate a new FUSN-XXXX invite code for the authenticated member.
 * @param {number} [durationMonths=1]
 * @returns {Promise<string>}
 */
export async function generateMyInviteCodeForCaller(durationMonths = 1) {
    const dur = Math.max(1, Math.min(3, Math.round(durationMonths) || 1));
    if (getDataSource() === 'test') {
        const codes = JSON.parse(localStorage.getItem(LS_MEMBER_INVITES) || '[]');
        const active = codes.filter((c) => c.active);
        if (active.length >= 3) throw new Error('Maximum 3 active invite codes allowed');
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        let suffix = '';
        for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
        const code = `FUSN-${suffix}`;
        codes.push({
            code,
            codeType: 'invite',
            active: true,
            currentRedemptions: 0,
            discountDurationMonths: dur,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 90 * 86400000).toISOString(),
        });
        localStorage.setItem(LS_MEMBER_INVITES, JSON.stringify(codes));
        return code;
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.generateMyInviteCode !== 'function') {
        throw new Error('generateMyInviteCode unavailable — sign in and run dfx generate fusion-app-backend.');
    }
    return String(await actor.generateMyInviteCode(dur));
}

/**
 * Get all invite codes for the authenticated member (active + inactive).
 * @returns {Promise<Array<object>>}
 */
export async function getMyInviteCodesForCaller() {
    if (getDataSource() === 'test') {
        return JSON.parse(localStorage.getItem(LS_MEMBER_INVITES) || '[]');
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.getMyInviteCodes !== 'function') return [];
    try {
        const raw = await actor.getMyInviteCodes();
        return Array.isArray(raw) ? raw : [];
    } catch { return []; }
}

/**
 * Deactivate one of the caller's invite codes.
 * @param {string} code
 * @returns {Promise<boolean>}
 */
export async function deactivateMyInviteCodeForCaller(code) {
    const norm = String(code || '').trim().toUpperCase();
    if (getDataSource() === 'test') {
        const codes = JSON.parse(localStorage.getItem(LS_MEMBER_INVITES) || '[]');
        const idx = codes.findIndex((c) => c.code === norm);
        if (idx < 0) return false;
        codes[idx].active = false;
        localStorage.setItem(LS_MEMBER_INVITES, JSON.stringify(codes));
        return true;
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.deactivateMyInviteCode !== 'function') return false;
    return Boolean(await actor.deactivateMyInviteCode(norm));
}

/**
 * Lightweight invite count summary for the credits strip.
 * @returns {Promise<{ active: number, maxAllowed: number, totalRedeemed: number }>}
 */
export async function getMyInviteCountSummaryForCaller() {
    if (getDataSource() === 'test') {
        const codes = JSON.parse(localStorage.getItem(LS_MEMBER_INVITES) || '[]');
        return {
            active: codes.filter((c) => c.active).length,
            maxAllowed: 3,
            totalRedeemed: codes.reduce((sum, c) => sum + (c.currentRedemptions || 0), 0),
        };
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.getMyInviteCountSummary !== 'function') {
        return { active: 0, maxAllowed: 3, totalRedeemed: 0 };
    }
    try {
        const raw = await actor.getMyInviteCountSummary();
        return {
            active: Number(raw?.active ?? 0),
            maxAllowed: Number(raw?.maxAllowed ?? 3),
            totalRedeemed: Number(raw?.totalRedeemed ?? 0),
        };
    } catch {
        return { active: 0, maxAllowed: 3, totalRedeemed: 0 };
    }
}

/**
 * Get the caller's available broadcast credits (referral rewards).
 * @returns {Promise<number>}
 */
export async function getMyBroadcastCreditsForCaller() {
    if (getDataSource() === 'test') return 0;
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.getMyBroadcastCredits !== 'function') return 0;
    try { return Number(await actor.getMyBroadcastCredits()); }
    catch { return 0; }
}

/**
 * Redeem one broadcast credit for a channel feature.
 * @param {'featuredArtist'|'newsletterBlast'|'socialPost'} channel
 * @returns {Promise<boolean>}
 */
export async function redeemBroadcastCreditForCaller(channel) {
    const channelVariant = { [channel]: null };
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.redeemBroadcastCredit !== 'function') return false;
    try { return await actor.redeemBroadcastCredit(channelVariant); }
    catch { return false; }
}

/**
 * Staff: list all non-zero broadcast credit balances.
 * @returns {Promise<Array<[string, number]>>}
 */
export async function staffListBroadcastCreditsStudio() {
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.staffListBroadcastCredits !== 'function') return [];
    try {
        const rows = await actor.staffListBroadcastCredits();
        return rows.map(([p, n]) => [p.toText(), Number(n)]);
    } catch { return []; }
}

/**
 * Staff: set exact broadcast credit balance for a single principal.
 * @param {string} principalText
 * @param {number} balance
 * @returns {Promise<boolean>}
 */
export async function staffSetBroadcastCreditsForStudio(principalText, balance) {
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const { Principal } = await import('@dfinity/principal');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.staffSetBroadcastCredits !== 'function') return false;
    try { return await actor.staffSetBroadcastCredits(Principal.fromText(principalText), BigInt(balance)); }
    catch { return false; }
}

/**
 * Staff: batch set broadcast credit balances.
 * @param {Array<[string, number]>} entries - [[principalText, balance], ...]
 * @returns {Promise<number>}
 */
export async function staffBatchSetBroadcastCreditsForStudio(entries) {
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const { Principal } = await import('@dfinity/principal');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.staffBatchSetBroadcastCredits !== 'function') return 0;
    const mapped = entries.map(([p, b]) => [Principal.fromText(p), BigInt(b)]);
    try { return Number(await actor.staffBatchSetBroadcastCredits(mapped)); }
    catch { return 0; }
}

/**
 * Staff: list all broadcast credit redemptions.
 * @returns {Promise<Array<object>>}
 */
export async function staffListBroadcastRedemptionsStudio() {
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.staffListBroadcastRedemptions !== 'function') return [];
    try { return await actor.staffListBroadcastRedemptions(); }
    catch { return []; }
}

/**
 * Staff: mark a broadcast redemption as fulfilled.
 * @param {string} redemptionId
 * @returns {Promise<boolean>}
 */
export async function staffFulfillBroadcastRedemptionForStudio(redemptionId) {
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.staffFulfillBroadcastRedemption !== 'function') return false;
    try { return await actor.staffFulfillBroadcastRedemption(String(redemptionId)); }
    catch { return false; }
}

/**
 * Get the caller's invite lineage — who invited them.
 * @returns {Promise<object | null>}
 */
export async function getMyInviteLineageForCaller() {
    if (getDataSource() === 'test') {
        const lineage = JSON.parse(localStorage.getItem(LS_INVITE_LINEAGE) || '[]');
        return lineage[0] || null;
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.getMyInviteLineage !== 'function') return null;
    try {
        const raw = await actor.getMyInviteLineage();
        if (Array.isArray(raw) && raw.length > 0) return raw[0];
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
        return null;
    } catch { return null; }
}

/**
 * Batch lookup invite lineage for multiple principals.
 * @param {Array<import('@dfinity/principal').Principal>} principals
 * @returns {Promise<Map<string, object | null>>}
 */
export async function getInviteLineageBatchForCallers(principals) {
    const result = new Map();
    if (!Array.isArray(principals) || principals.length === 0) return result;
    if (getDataSource() === 'test') return result;
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.getInviteLineageBatch !== 'function') return result;
    try {
        const raw = await actor.getInviteLineageBatch(principals.slice(0, 100));
        if (Array.isArray(raw)) {
            for (const entry of raw) {
                if (Array.isArray(entry) && entry.length >= 2) {
                    const principalStr = entry[0]?.toText?.() || String(entry[0]);
                    const lineage = Array.isArray(entry[1]) && entry[1].length > 0 ? entry[1][0] : null;
                    result.set(principalStr, lineage);
                }
            }
        }
    } catch { /* batch lookup failed */ }
    return result;
}

/**
 * Staff: list all invite lineage records.
 * @returns {Promise<Array<object>>}
 */
export async function staffListInviteLineageStudio() {
    if (getDataSource() === 'test') return [];
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffListInviteLineage !== 'function') return [];
    try {
        const raw = await actor.staffListInviteLineage();
        return Array.isArray(raw) ? raw : [];
    } catch { return []; }
}

/**
 * @returns {Promise<import('@dfinity/principal').Principal[]>}
 */
export async function listAdminsForStudio() {
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.listAdmins !== 'function') {
        throw new Error('listAdmins unavailable — run dfx generate fusion-app-backend from the project root.');
    }
    return await actor.listAdmins();
}

/**
 * @returns {Promise<Array<[import('@dfinity/principal').Principal, { firstName: string, lastName: string, email: string }]>>}
 */
export async function adminListAccountContactsForStudio() {
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminListAccountContacts !== 'function') {
        throw new Error('adminListAccountContacts unavailable — run dfx generate fusion-app-backend from the project root.');
    }
    return await actor.adminListAccountContacts();
}

/**
 * @param {string} principalText
 * @param {{ firstName: string, lastName: string, email: string }} contact
 */
export async function adminSetAccountContactForStudio(principalText, contact) {
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminSetAccountContact !== 'function') {
        throw new Error('adminSetAccountContact unavailable — run dfx generate fusion-app-backend from the project root.');
    }
    const { Principal } = await import('@dfinity/principal');
    await actor.adminSetAccountContact(Principal.fromText(String(principalText || '').trim()), {
        firstName: String(contact.firstName || ''),
        lastName: String(contact.lastName || ''),
        email: String(contact.email || ''),
    });
}

/**
 * Save the signed-in user's own display contact. Returns false on older generated declarations.
 * @param {{ firstName: string, lastName: string, email: string }} contact
 * @returns {Promise<boolean>}
 */
export async function setMyAccountContactForCaller(contact) {
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.setMyAccountContact !== 'function') return false;
    await actor.setMyAccountContact({
        firstName: String(contact.firstName || ''),
        lastName: String(contact.lastName || ''),
        email: String(contact.email || ''),
    });
    return true;
}

/**
 * Signed-in user's directory contact (name + email). Null when unset or on older declarations.
 * @returns {Promise<{ firstName: string, lastName: string, email: string } | null>}
 */
export async function getMyAccountContactForCaller() {
    if (getDataSource() === 'test') {
        const { getProfileSetupDraft } = await import('./profileSetupDraft.js');
        const draft = getProfileSetupDraft();
        const email = String(draft.email || '').trim();
        if (!email.includes('@')) return null;
        const parts = String(draft.fullName || '').trim().split(/\s+/).filter(Boolean);
        return {
            firstName: parts[0] || '',
            lastName: parts.slice(1).join(' '),
            email,
        };
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.getMyAccountContactForCaller !== 'function') return null;
    const raw = await actor.getMyAccountContactForCaller();
    const row = Array.isArray(raw) ? (raw.length ? raw[0] : null) : raw;
    if (!row || typeof row !== 'object') return null;
    const o = /** @type {Record<string, unknown>} */ (row);
    const email = String(o.email ?? '').trim();
    if (!email.includes('@')) return null;
    return {
        firstName: String(o.firstName ?? o.first_name ?? '').trim(),
        lastName: String(o.lastName ?? o.last_name ?? '').trim(),
        email,
    };
}

/**
 * Push join-flow email/name from session draft or billing storage onto the canister account
 * contact before linking an artist profile (so roster `contactEmail` can inherit it).
 * @returns {Promise<boolean>}
 */
export async function syncMyAccountContactFromJoinContextIfNeeded() {
    const { getProfileSetupDraft } = await import('./profileSetupDraft.js');
    const draft = getProfileSetupDraft();
    let email = String(draft.email || '').trim();
    let firstName = String(draft.firstName || '').trim();
    let lastName = String(draft.lastName || '').trim();

    if (!email.includes('@')) {
        try {
            const { getAuthSnapshot } = await import('./icAuth.js');
            const snap = await getAuthSnapshot();
            if (snap.authenticated) {
                const { getStoredBillingEmailForPrincipal } = await import('./integrationApi.js');
                email = String(getStoredBillingEmailForPrincipal(snap.principal.toText()) || '').trim();
            }
        } catch {
            /* ignore */
        }
    }

    if (!email.includes('@')) return false;

    if (!firstName) {
        const fullName = String(draft.fullName || '').trim();
        if (fullName) {
            const parts = fullName.split(/\s+/).filter(Boolean);
            firstName = parts[0] || '';
            if (!lastName) lastName = parts.slice(1).join(' ');
        }
    }

    try {
        return await setMyAccountContactForCaller({ firstName, lastName, email });
    } catch {
        return false;
    }
}

/**
 * @param {unknown} raw
 * @returns {'ok' | 'alreadyLinked' | 'needsSubscription' | 'noAccount'}
 */
function interpretEnsureLinkedProfileResult(raw) {
    if (raw && typeof raw === 'object') {
        if ('ok' in raw) return 'ok';
        if ('alreadyLinked' in raw) return 'alreadyLinked';
        if ('needsSubscription' in raw) return 'needsSubscription';
        if ('noAccount' in raw) return 'noAccount';
    }
    return 'ok';
}

async function ensureLinkedArtistProfileTestMode() {
    let id = getProfileSettingsDevArtistId();
    if (id) {
        const artists = await getArtists();
        if (artists.some((x) => x.id === id)) return 'alreadyLinked';
    }
    const ts = new Date().toISOString();
    const nid = `mpd-local-${
        typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : String(Date.now())
    }`;
    const { getProfileSetupDraft } = await import('./profileSetupDraft.js');
    const contactEmail = String(getProfileSetupDraft().email || '').trim();
    const minimal = normalizeArtistDefaults({
        id: nid,
        slug: nid,
        image: '',
        featuredOrder: 999_999,
        visibility: 'inactive',
        updatedAt: ts,
        locales: { en: {}, ja: {} },
        imported: false,
        accessCode: '',
        contactEmail,
    });
    const overlay = readStudioLs(LS_ARTISTS_OVERLAY) || {};
    overlay[nid] = minimal;
    writeStudioLs(LS_ARTISTS_OVERLAY, overlay);
    setProfileSettingsDevArtistId(nid);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fusion-data-source-change', { detail: { source: 'test' } }));
    }
    return 'ok';
}

export async function ensureMyLinkedArtistProfile() {
    if (getDataSource() === 'test') {
        return ensureLinkedArtistProfileTestMode();
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor) return 'noAccount';
    if (typeof actor.ensureMyLinkedArtistProfile !== 'function') {
        return 'alreadyLinked';
    }
    await syncMyAccountContactFromJoinContextIfNeeded();
    const raw = await actor.ensureMyLinkedArtistProfile();
    return interpretEnsureLinkedProfileResult(raw);
}

/**
 * Link an inactive artist skeleton for program application (allows needsSubscription).
 * After Motoko deploy, run `dfx generate fusion-app-backend` so the actor method exists.
 * @returns {Promise<'ok' | 'alreadyLinked' | 'needsSubscription' | 'noAccount'>}
 */
export async function ensureMyLinkedArtistProfileForApplication() {
    if (getDataSource() === 'test') {
        return ensureLinkedArtistProfileTestMode();
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor) return 'noAccount';
    await syncMyAccountContactFromJoinContextIfNeeded();
    if (typeof actor.ensureMyLinkedArtistProfileForApplication === 'function') {
        const raw = await actor.ensureMyLinkedArtistProfileForApplication();
        return interpretEnsureLinkedProfileResult(raw);
    }
    // Fallback before bindings refresh: try membership-gated ensure, then soft-fail.
    if (typeof actor.ensureMyLinkedArtistProfile === 'function') {
        const raw = await actor.ensureMyLinkedArtistProfile();
        const r = interpretEnsureLinkedProfileResult(raw);
        if (r === 'ok' || r === 'alreadyLinked') return r;
    }
    return 'needsSubscription';
}

/**
 * Authenticated artist: full `ArtistRecord` when linked, or test-mode row selected by {@link getProfileSettingsDevArtistId}.
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function getMyArtistRecord() {
    if (getDataSource() === 'test') {
        const id = getProfileSettingsDevArtistId();
        if (!id) return null;
        const artists = await getArtists();
        const a = artists.find((x) => x.id === id);
        if (!a) return null;
        return fakeArtistRecordFromTestArtist(a);
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.getMyArtistRecord !== 'function') return null;
    const opt = await actor.getMyArtistRecord();
    const rec = unwrapOpt(opt);
    if (!rec || typeof rec !== 'object') return null;
    let recWithMedia = rec;
    if (typeof actor.getMyArtistMedia === 'function') {
        try {
            const mediaOpt = await actor.getMyArtistMedia();
            const media = unwrapOpt(mediaOpt);
            if (media && typeof media === 'object') {
                const p = rec.profile && typeof rec.profile === 'object' ? rec.profile : {};
                recWithMedia = {
                    ...rec,
                    profile: {
                        ...p,
                        quote: String(media.quote ?? ''),
                        audioUrl: toCloudFrontAssetUrl(media.audio_url ?? media.audioUrl),
                        audioTitle: String(media.audio_title ?? media.audioTitle ?? ''),
                    },
                };
            }
        } catch {
            /* older wasm */
        }
    }
    if (recWithMedia.profile && typeof actor.listArtistHeroProfileImagePublic === 'function') {
        try {
            const tuples = await actor.listArtistHeroProfileImagePublic();
            if (Array.isArray(tuples)) {
                const m = new Map();
                for (const row of tuples) {
                    if (Array.isArray(row) && row.length >= 2) {
                        m.set(String(row[0] ?? ''), String(row[1] ?? ''));
                    }
                }
                const p0 = recWithMedia.profile;
                if (p0 && typeof p0 === 'object') {
                    const p = /** @type {Record<string, unknown>} */ (p0);
                    const id = String(p.id ?? '');
                    const h = m.get(id);
                    if (h && String(h).trim()) {
                        recWithMedia = { ...recWithMedia, profile: { ...p, heroProfileImage: toCloudFrontAssetUrl(h) } };
                    }
                }
            }
        } catch {
            /* older canister */
        }
    }
    if (recWithMedia.profile && typeof actor.listArtistAudioApprovedPublic === 'function') {
        try {
            const ids = await actor.listArtistAudioApprovedPublic();
            const approved = new Set(
                (Array.isArray(ids) ? ids : []).map((id) => String(id ?? '').trim()).filter(Boolean),
            );
            let fullSite = new Set();
            try {
                if (typeof actor.listArtistAudioFullSiteApprovedPublic === 'function') {
                    const fsIds = await actor.listArtistAudioFullSiteApprovedPublic();
                    fullSite = new Set(
                        (Array.isArray(fsIds) ? fsIds : [])
                            .map((id) => String(id ?? '').trim())
                            .filter(Boolean),
                    );
                } else {
                    fullSite = approved;
                }
            } catch {
                fullSite = approved;
            }
            const p0 = recWithMedia.profile;
            if (p0 && typeof p0 === 'object') {
                const p = /** @type {Record<string, unknown>} */ (p0);
                const id = String(p.id ?? '');
                recWithMedia = {
                    ...recWithMedia,
                    profile: {
                        ...p,
                        audioApproved: approved.has(id),
                        audioApprovedFullSite: fullSite.has(id),
                    },
                };
            }
        } catch {
            /* older canister */
        }
    }
    /** Applications live in a separate canister map; merge for the same shape as test mode. */
    if (typeof actor.getMyArtistApplicationsJson === 'function') {
        try {
            const appsOpt = await actor.getMyArtistApplicationsJson();
            const aj = unwrapOpt(appsOpt);
            if (aj != null && String(aj).length > 0) {
                return { ...recWithMedia, appliedJson: aj };
            }
        } catch {
            /* older wasm without getMyArtistApplicationsJson */
        }
    }
    return recWithMedia;
}

/**
 * Replace locales JSON for the caller's linked artist (or test overlay).
 * @param {string} localesJson
 * @param {string} [updatedAt] ISO timestamp; defaults to now
 * @returns {Promise<void>}
 */
export async function updateMyArtistLocalesJson(localesJson, updatedAt) {
    const ts = updatedAt || new Date().toISOString();
    if (getDataSource() === 'test') {
        const id = getProfileSettingsDevArtistId();
        if (!id) {
            throw new Error('Select which artist profile to edit (test mode).');
        }
        let parsed;
        try {
            parsed = JSON.parse(localesJson);
        } catch (e) {
            throw new Error(`Invalid locales JSON: ${e instanceof Error ? e.message : String(e)}`);
        }
        if (!parsed || typeof parsed !== 'object') {
            throw new Error('locales JSON must be an object');
        }
        const artists = await getArtists();
        const base = artists.find((x) => x.id === id);
        if (!base) throw new Error('Artist not found');
        const merged = normalizeArtistDefaults({ ...base, locales: parsed, updatedAt: ts });
        const overlay = readStudioLs(LS_ARTISTS_OVERLAY) || {};
        overlay[id] = merged;
        writeStudioLs(LS_ARTISTS_OVERLAY, overlay);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fusion-data-source-change', { detail: { source: 'test' } }));
        }
        return;
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.updateMyArtistLocalesJson !== 'function') {
        throw new Error('updateMyArtistLocalesJson unavailable — sign in and run dfx generate fusion-app-backend.');
    }
    await actor.updateMyArtistLocalesJson(localesJson, ts);
}

/**
 * Update hero image URL (`profile.image`) for the caller's linked artist.
 * @param {string} imageUrl
 * @param {string} [updatedAt] ISO timestamp
 * @returns {Promise<void>}
 */
export async function updateMyArtistProfilePatch(imageUrl, updatedAt) {
    const ts = updatedAt || new Date().toISOString();
    const url = toCloudFrontAssetUrl(imageUrl);
    if (getDataSource() === 'test') {
        const id = getProfileSettingsDevArtistId();
        if (!id) {
            throw new Error('Select which artist profile to edit (test mode).');
        }
        const artists = await getArtists();
        const base = artists.find((x) => x.id === id);
        if (!base) throw new Error('Artist not found');
        const merged = normalizeArtistDefaults({ ...base, image: url, updatedAt: ts });
        const overlay = readStudioLs(LS_ARTISTS_OVERLAY) || {};
        overlay[id] = merged;
        writeStudioLs(LS_ARTISTS_OVERLAY, overlay);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fusion-data-source-change', { detail: { source: 'test' } }));
        }
        return;
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.updateMyArtistProfilePatch !== 'function') {
        throw new Error('updateMyArtistProfilePatch unavailable — sign in and run dfx generate fusion-app-backend.');
    }
    await actor.updateMyArtistProfilePatch(url, ts);
}

/**
 * Update `profile.heroProfileImage` (card “Profile” image URL) for the caller's linked artist.
 * @param {string} heroProfileImageUrl
 * @param {string} [updatedAt] ISO timestamp
 * @returns {Promise<void>}
 */
export async function updateMyArtistHeroProfileImagePatch(heroProfileImageUrl, updatedAt) {
    const ts = updatedAt || new Date().toISOString();
    const url = toCloudFrontAssetUrl(heroProfileImageUrl);
    if (getDataSource() === 'test') {
        const id = getProfileSettingsDevArtistId();
        if (!id) {
            throw new Error('Select which artist profile to edit (test mode).');
        }
        const artists = await getArtists();
        const base = artists.find((x) => x.id === id);
        if (!base) throw new Error('Artist not found');
        const merged = normalizeArtistDefaults({ ...base, heroProfileImage: url, updatedAt: ts });
        const overlay = readStudioLs(LS_ARTISTS_OVERLAY) || {};
        overlay[id] = merged;
        writeStudioLs(LS_ARTISTS_OVERLAY, overlay);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fusion-data-source-change', { detail: { source: 'test' } }));
        }
        return;
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.updateMyArtistHeroProfileImagePatch !== 'function') {
        throw new Error('updateMyArtistHeroProfileImagePatch unavailable — sign in and run dfx generate fusion-app-backend.');
    }
    await actor.updateMyArtistHeroProfileImagePatch(url, ts);
}

/**
 * Update shared quote/audio profile fields for caller's linked artist.
 * @param {{ quote?: string, audioUrl?: string, audioTitle?: string }} patch
 * @param {string} [updatedAt]
 */
export async function updateMyArtistQuoteAudioPatch(patch, updatedAt) {
    const ts = updatedAt || new Date().toISOString();
    const quote = String(patch?.quote ?? '');
    const audioUrl = toCloudFrontAssetUrl(patch?.audioUrl);
    const audioTitle = String(patch?.audioTitle ?? '');
    if (getDataSource() === 'test') {
        const id = getProfileSettingsDevArtistId();
        if (!id) throw new Error('Select which artist profile to edit (test mode).');
        const artists = await getArtists();
        const base = artists.find((x) => x.id === id);
        if (!base) throw new Error('Artist not found');
        const merged = normalizeArtistDefaults({ ...base, quote, audioUrl, audioTitle, updatedAt: ts });
        const overlay = readStudioLs(LS_ARTISTS_OVERLAY) || {};
        overlay[id] = merged;
        writeStudioLs(LS_ARTISTS_OVERLAY, overlay);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fusion-data-source-change', { detail: { source: 'test' } }));
        }
        return;
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.updateMyArtistQuoteAudioPatch !== 'function') {
        throw new Error('updateMyArtistQuoteAudioPatch unavailable — sign in and run dfx generate fusion-app-backend.');
    }
    await actor.updateMyArtistQuoteAudioPatch(quote, audioUrl, audioTitle, ts);
}

// ── Multi-bite audio collection ──

/**
 * @returns {Promise<{
 *   entries: { url: string, title: string, addedAt: string }[],
 *   highlightUrl: string,
 *   approvedUrls: string[],
 *   fullSiteApprovedUrls: string[],
 * } | null>}
 */
export async function getMyArtistAudioCollection() {
    if (getDataSource() === 'test') {
        const id = getProfileSettingsDevArtistId();
        const raw = readStudioLs('audioCollection_' + id);
        if (raw && typeof raw === 'object') {
            return normalizeArtistAudioCollection(raw);
        }
        return emptyArtistAudioCollection();
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.getMyArtistAudioCollection !== 'function') return null;
    const opt = await actor.getMyArtistAudioCollection();
    const rec = unwrapOpt(opt);
    if (!rec) return { entries: [], highlightUrl: '', approvedUrls: [], fullSiteApprovedUrls: [] };
    const approvedUrls = Array.isArray(rec.approvedUrls ?? rec.approved_urls)
        ? (rec.approvedUrls ?? rec.approved_urls).map((u) => String(u))
        : [];
    const fullSiteApprovedUrls = Array.isArray(
        rec.fullSiteApprovedUrls ?? rec.full_site_approved_urls,
    )
        ? (rec.fullSiteApprovedUrls ?? rec.full_site_approved_urls).map((u) => String(u))
        : approvedUrls;
    return {
        entries: Array.isArray(rec.entries)
            ? rec.entries.map((e) => ({
                  url: String(e.url ?? ''),
                  title: String(e.title ?? ''),
                  addedAt: String(e.addedAt ?? e.added_at ?? ''),
              }))
            : [],
        highlightUrl: String(rec.highlightUrl ?? rec.highlight_url ?? ''),
        approvedUrls,
        fullSiteApprovedUrls,
    };
}

/** @param {string} url @param {string} title */
export async function addMyArtistAudioEntry(url, title) {
    const ts = new Date().toISOString();
    if (getDataSource() === 'test') {
        const id = getProfileSettingsDevArtistId();
        if (!id) throw new Error('Select which artist profile to edit (test mode).');
        const col = normalizeArtistAudioCollection(readStudioLs('audioCollection_' + id));
        writeStudioLs('audioCollection_' + id, addArtistAudioEntry(col, url, title, ts));
        return;
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    await actor.addMyArtistAudioEntry(url, title, ts);
}

/** @param {string} url */
export async function removeMyArtistAudioEntry(url) {
    if (getDataSource() === 'test') {
        const id = getProfileSettingsDevArtistId();
        if (!id) throw new Error('Select which artist profile to edit (test mode).');
        const col = normalizeArtistAudioCollection(readStudioLs('audioCollection_' + id));
        writeStudioLs('audioCollection_' + id, removeArtistAudioEntry(col, url));
        return;
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    await actor.removeMyArtistAudioEntry(url);
}

/**
 * Replace a saved bite with a newly uploaded URL (keeps list position in test mode).
 * Live canister: add then remove, or remove then add when already at the 5-bite cap.
 * @param {string} oldUrl
 * @param {string} newUrl
 * @param {string} title
 */
export async function replaceMyArtistAudioEntry(oldUrl, newUrl, title) {
    const ts = new Date().toISOString();
    const from = String(oldUrl ?? '').trim();
    const to = String(newUrl ?? '').trim();
    if (getDataSource() === 'test') {
        const id = getProfileSettingsDevArtistId();
        if (!id) throw new Error('Select which artist profile to edit (test mode).');
        const col = normalizeArtistAudioCollection(readStudioLs('audioCollection_' + id));
        writeStudioLs('audioCollection_' + id, replaceArtistAudioEntry(col, from, to, title, ts));
        return;
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (from && from === to) {
        await actor.removeMyArtistAudioEntry(from);
        await actor.addMyArtistAudioEntry(to, title, ts);
        return;
    }
    const collection = await getMyArtistAudioCollection();
    const count = collection?.entries?.length ?? 0;
    if (count >= MAX_ARTIST_AUDIO_ENTRIES) {
        await actor.removeMyArtistAudioEntry(from);
        await actor.addMyArtistAudioEntry(to, title, ts);
        return;
    }
    await actor.addMyArtistAudioEntry(to, title, ts);
    await actor.removeMyArtistAudioEntry(from);
}

/** @param {string} url */
export async function setMyArtistHighlightAudio(url) {
    if (getDataSource() === 'test') {
        const id = getProfileSettingsDevArtistId();
        if (!id) throw new Error('Select which artist profile to edit (test mode).');
        const col = normalizeArtistAudioCollection(readStudioLs('audioCollection_' + id));
        writeStudioLs('audioCollection_' + id, setArtistAudioHighlight(col, url));
        return;
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    await actor.setMyArtistHighlightAudio(url);
}

/**
 * Staff: fetch per-artist approved audio URL lists (profile tier).
 * @returns {Promise<Map<string, string[]>>}
 */
export async function fetchArtistAudioApprovedUrlsMap() {
    const m = new Map();
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.listArtistAudioApprovedUrls !== 'function') return m;
        const rows = await actor.listArtistAudioApprovedUrls();
        if (!Array.isArray(rows)) return m;
        for (const row of rows) {
            if (!Array.isArray(row) || row.length < 2) continue;
            m.set(String(row[0] ?? ''), (row[1] || []).map((u) => String(u)));
        }
    } catch { /* older canister */ }
    return m;
}

/**
 * Per-artist full-site approved audio URL lists.
 * @returns {Promise<Map<string, string[]>>}
 */
export async function fetchArtistAudioFullSiteApprovedUrlsMap() {
    const m = new Map();
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.listArtistAudioFullSiteApprovedUrls !== 'function') {
            // Until bindings regenerate: treat profile-approved URLs as full-site.
            return fetchArtistAudioApprovedUrlsMap();
        }
        const rows = await actor.listArtistAudioFullSiteApprovedUrls();
        if (!Array.isArray(rows)) return m;
        for (const row of rows) {
            if (!Array.isArray(row) || row.length < 2) continue;
            m.set(String(row[0] ?? ''), (row[1] || []).map((u) => String(u)));
        }
    } catch {
        try {
            return await fetchArtistAudioApprovedUrlsMap();
        } catch {
            /* older canister */
        }
    }
    return m;
}

/**
 * Attach audio collection entries + profile/full-site approved URL lists onto artist rows.
 * @param {import('@dfinity/agent').ActorSubclass | null} actor
 * @param {object[]} artists
 */
async function enrichArtistsWithAudioCollectionsAndApprovals(actor, artists) {
    if (!actor || !Array.isArray(artists) || !artists.length) return;
    try {
        const [collectionsMap, approvedUrlsMap, fullSiteUrlsMap, highlightsMap] = await Promise.all([
            fetchArtistAudioCollectionsMap(),
            fetchArtistAudioApprovedUrlsMap(),
            fetchArtistAudioFullSiteApprovedUrlsMap(),
            (async () => {
                const m = new Map();
                try {
                    if (typeof actor.listArtistAudioHighlights !== 'function') return m;
                    const rows = await actor.listArtistAudioHighlights();
                    if (!Array.isArray(rows)) return m;
                    for (const row of rows) {
                        if (!Array.isArray(row) || row.length < 2) continue;
                        m.set(String(row[0] ?? ''), String(row[1] ?? ''));
                    }
                } catch {
                    /* older canister */
                }
                return m;
            })(),
        ]);
        for (const a of artists) {
            if (!a || typeof a !== 'object') continue;
            const id = String(/** @type {Record<string, unknown>} */ (a).id ?? '');
            if (!id) continue;
            const entries = collectionsMap.get(id);
            if (Array.isArray(entries) && entries.length) {
                /** @type {Record<string, unknown>} */ (a).audioEntries = entries;
            }
            const hl = highlightsMap.get(id);
            if (hl) /** @type {Record<string, unknown>} */ (a).highlightAudioUrl = hl;
            const approved = approvedUrlsMap.get(id);
            if (Array.isArray(approved)) {
                /** @type {Record<string, unknown>} */ (a).approvedAudioUrls = approved;
            }
            const fullSite = fullSiteUrlsMap.get(id);
            if (Array.isArray(fullSite)) {
                /** @type {Record<string, unknown>} */ (a).fullSiteApprovedAudioUrls = fullSite;
            }
        }
    } catch {
        /* best-effort enrichment */
    }
}

/**
 * Staff: fetch per-artist audio collections.
 * @returns {Promise<Map<string, { url: string, title: string, addedAt: string }[]>>}
 */
export async function fetchArtistAudioCollectionsMap() {
    const m = new Map();
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.listArtistAudioCollections !== 'function') return m;
        const rows = await actor.listArtistAudioCollections();
        if (!Array.isArray(rows)) return m;
        for (const row of rows) {
            if (!Array.isArray(row) || row.length < 2) continue;
            const entries = (row[1] || []).map((e) => ({
                url: String(e.url ?? ''),
                title: String(e.title ?? ''),
                addedAt: String(e.addedAt ?? e.added_at ?? ''),
            }));
            m.set(String(row[0] ?? ''), entries);
        }
    } catch { /* older canister */ }
    return m;
}

/**
 * Staff: toggle per-entry profile-tier audio approval.
 * @param {string} artistId
 * @param {string} url
 * @param {boolean} approved
 */
export async function applyArtistAudioEntryApprovedFromStudioSaveLive(artistId, url, approved) {
    if (getDataSource() === 'test') {
        noteStudioAudioApproved(artistId, approved);
        if (!approved) noteStudioAudioFullSiteApproved(artistId, false);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    await actor.staffSetArtistAudioEntryApproved(artistId, url, approved);
    noteStudioAudioApproved(artistId, approved);
    if (!approved) noteStudioAudioFullSiteApproved(artistId, false);
}

/**
 * Staff: toggle per-entry full-site audio approval.
 * @param {string} artistId
 * @param {string} url
 * @param {boolean} approved
 */
export async function applyArtistAudioEntryFullSiteApprovedFromStudioSaveLive(artistId, url, approved) {
    if (getDataSource() === 'test') {
        noteStudioAudioFullSiteApproved(artistId, approved);
        if (approved) noteStudioAudioApproved(artistId, true);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.staffSetArtistAudioEntryFullSiteApproved !== 'function') {
        noteStudioAudioFullSiteApproved(artistId, approved);
        if (approved) noteStudioAudioApproved(artistId, true);
        return;
    }
    await actor.staffSetArtistAudioEntryFullSiteApproved(artistId, url, approved);
    noteStudioAudioFullSiteApproved(artistId, approved);
    if (approved) noteStudioAudioApproved(artistId, true);
}

// ── Asset Review Notes ─────────────────────────────────────────

/**
 * Staff: set hero profile image approval + review note.
 * @param {string} artistId
 * @param {boolean} approved
 * @param {string} reason
 * @param {string} imageUrl
 */
export async function staffSetHeroProfileImageReviewNote(artistId, approved, reason, imageUrl) {
    if (getDataSource() === 'test') return;
    const actor = await getStudioAuthenticatedActor();
    await actor.staffSetHeroProfileImageReviewNote(artistId, approved, reason ?? '', imageUrl ?? '');
}

/**
 * Staff: set audio entry approval + review note (profile tier only; legacy).
 * @param {string} artistId
 * @param {string} url
 * @param {boolean} approved
 * @param {string} reason
 * @param {string} imageUrl
 */
export async function staffSetAudioEntryReviewNote(artistId, url, approved, reason, imageUrl) {
    if (getDataSource() === 'test') return;
    const actor = await getStudioAuthenticatedActor();
    await actor.staffSetAudioEntryReviewNote(artistId, url, approved, reason ?? '', imageUrl ?? '');
}

/**
 * Staff: set audio entry review note with profile + full-site approval scopes.
 * @param {string} artistId
 * @param {string} url
 * @param {boolean} profileApproved
 * @param {boolean} fullSiteApproved
 * @param {string} reason
 * @param {string} imageUrl
 */
export async function staffSetAudioEntryReviewNoteWithScopes(
    artistId,
    url,
    profileApproved,
    fullSiteApproved,
    reason,
    imageUrl,
) {
    if (getDataSource() === 'test') {
        noteStudioAudioApproved(artistId, profileApproved);
        noteStudioAudioFullSiteApproved(artistId, fullSiteApproved && profileApproved);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.staffSetAudioEntryReviewNoteWithScopes === 'function') {
        await actor.staffSetAudioEntryReviewNoteWithScopes(
            artistId,
            url,
            Boolean(profileApproved),
            Boolean(fullSiteApproved),
            reason ?? '',
            imageUrl ?? '',
        );
        noteStudioAudioApproved(artistId, Boolean(profileApproved));
        noteStudioAudioFullSiteApproved(artistId, Boolean(fullSiteApproved && profileApproved));
        return;
    }
    // Older canister: profile note + optional full-site entry toggle.
    await actor.staffSetAudioEntryReviewNote(
        artistId,
        url,
        Boolean(profileApproved),
        reason ?? '',
        imageUrl ?? '',
    );
    if (typeof actor.staffSetArtistAudioEntryFullSiteApproved === 'function') {
        await actor.staffSetArtistAudioEntryFullSiteApproved(
            artistId,
            url,
            Boolean(fullSiteApproved && profileApproved),
        );
    }
    noteStudioAudioApproved(artistId, Boolean(profileApproved));
    noteStudioAudioFullSiteApproved(artistId, Boolean(fullSiteApproved && profileApproved));
}

/**
 * Fetch hero profile image review notes for all artists.
 * @returns {Promise<Map<string, {reason:string, imageUrl:string, reviewedAt:string, approved:boolean}>>}
 */
export async function fetchHeroProfileImageReviewNotesMap() {
    const m = new Map();
    try {
        if (getDataSource() === 'test') return m;
        const actor = await getStudioAuthenticatedActor();
        const rows = await actor.listHeroProfileImageReviewNotes();
        for (const [k, v] of rows) {
            m.set(k, { reason: v.reason, imageUrl: v.imageUrl, reviewedAt: v.reviewedAt, approved: v.approved });
        }
    } catch (e) {
        console.warn('fetchHeroProfileImageReviewNotesMap failed:', e);
    }
    return m;
}

/**
 * Fetch audio entry review notes for all artists.
 * @returns {Promise<Map<string, {reason:string, imageUrl:string, reviewedAt:string, approved:boolean}>>}
 */
export async function fetchAudioEntryReviewNotesMap() {
    const m = new Map();
    try {
        if (getDataSource() === 'test') return m;
        const actor = await getStudioAuthenticatedActor();
        const rows = await actor.listAudioEntryReviewNotes();
        for (const [k, v] of rows) {
            m.set(k, { reason: v.reason, imageUrl: v.imageUrl, reviewedAt: v.reviewedAt, approved: v.approved });
        }
    } catch (e) {
        console.warn('fetchAudioEntryReviewNotesMap failed:', e);
    }
    return m;
}

/**
 * Member: get review notes for own assets (hero image + audio entries).
 * @returns {Promise<{heroProfileImage: ?object, audioEntries: Array<[string, object]>}>}
 */
export async function getMyAssetReviewNotes() {
    try {
        if (getDataSource() === 'test') return { heroProfileImage: null, audioEntries: [] };
        const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
        const actor = await getAuthenticatedFusionBackendActor();
        const result = await actor.getMyAssetReviewNotes();
        return {
            heroProfileImage: result.heroProfileImage?.[0] ?? null,
            audioEntries: (result.audioEntries ?? []).map(([k, v]) => [k, {
                reason: v.reason, imageUrl: v.imageUrl, reviewedAt: v.reviewedAt, approved: v.approved
            }])
        };
    } catch (e) {
        console.warn('getMyAssetReviewNotes failed:', e);
        return { heroProfileImage: null, audioEntries: [] };
    }
}

/**
 * Set roster `ArtistCore.visibility` for the caller's linked artist: `inactive` | `pending` | `private` | `public`.
 * @param {string} visibility
 * @param {string} [updatedAt] ISO timestamp
 * @returns {Promise<void>}
 */
export async function updateMyArtistVisibility(visibility, updatedAt) {
    const vis = String(visibility ?? '')
        .trim()
        .toLowerCase();
    if (!['inactive', 'pending', 'private', 'public'].includes(vis)) {
        throw new Error('Visibility must be inactive, pending, private, or public.');
    }
    const ts = updatedAt || new Date().toISOString();
    if (getDataSource() === 'test') {
        const id = getProfileSettingsDevArtistId();
        if (!id) {
            throw new Error('Select which artist profile to edit (test mode).');
        }
        const artists = await getArtistsForStudio();
        const base = artists.find((x) => x.id === id);
        if (!base) throw new Error('Artist not found');
        const currentVis = normalizeArtistRosterVisibility(base.visibility);
        const nextVis = vis === 'public' && currentVis !== 'public' ? 'pending' : vis;
        const merged = normalizeArtistDefaults({ ...base, visibility: nextVis, updatedAt: ts });
        const overlay = readStudioLs(LS_ARTISTS_OVERLAY) || {};
        overlay[id] = merged;
        writeStudioLs(LS_ARTISTS_OVERLAY, overlay);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fusion-data-source-change', { detail: { source: 'test' } }));
        }
        return;
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.updateMyArtistVisibility !== 'function') {
        throw new Error('updateMyArtistVisibility unavailable — sign in and run dfx generate fusion-app-backend.');
    }
    await actor.updateMyArtistVisibility(vis, ts);
}

/**
 * @param {string} preferred
 * @param {string} ownId
 * @param {object[]} artists
 */
function uniqueMemberSlug(preferred, ownId, artists) {
    const taken = (slug) =>
        artists.some(
            (a) =>
                a &&
                a.id !== ownId &&
                String(a.slug || '')
                    .trim()
                    .toLowerCase() === String(slug).trim().toLowerCase()
        );
    if (!taken(preferred)) return preferred;
    let n = 2;
    while (n < 200) {
        const c = `${preferred}-${n}`;
        if (!taken(c)) return c;
        n += 1;
    }
    return preferred;
}

/**
 * Set public profile URL slug for the caller's linked artist (member path).
 * @param {string} preferredSlug — normalized [a-z0-9-]+
 * @returns {Promise<string>} final slug applied
 */
export async function updateMyArtistPublicSlug(preferredSlug) {
    const raw = String(preferredSlug ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 128);
    if (!raw) {
        throw new Error('Slug is empty after normalization.');
    }
    if (getDataSource() === 'test') {
        const id = getProfileSettingsDevArtistId();
        if (!id) {
            throw new Error('Select which artist profile to edit (test mode).');
        }
        const artists = await getArtists();
        const base = artists.find((x) => x.id === id);
        if (!base) throw new Error('Artist not found');
        const unique = uniqueMemberSlug(raw, id, artists);
        if (String(base.slug || '') === unique) return unique;
        const merged = normalizeArtistDefaults({
            ...base,
            slug: unique,
            updatedAt: new Date().toISOString(),
        });
        const overlay = readStudioLs(LS_ARTISTS_OVERLAY) || {};
        overlay[id] = merged;
        writeStudioLs(LS_ARTISTS_OVERLAY, overlay);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fusion-data-source-change', { detail: { source: 'test' } }));
        }
        return unique;
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.updateMyArtistPublicSlug !== 'function') {
        throw new Error('updateMyArtistPublicSlug unavailable — deploy backend and run dfx generate fusion-app-backend.');
    }
    const out = await actor.updateMyArtistPublicSlug(raw);
    return typeof out === 'string' ? out : String(out ?? raw);
}

/**
 * Staff/admin: delete roster row; unlinks linked member accounts to pending (canister).
 * @param {string} artistId
 * @returns {Promise<boolean>}
 */
export async function deleteArtistByIdStudio(artistId) {
    const id = String(artistId || '').trim();
    if (!id) throw new Error('Artist id required');
    if (getDataSource() === 'test') {
        const overlay = readStudioLs(LS_ARTISTS_OVERLAY) || {};
        if (overlay[id]) {
            delete overlay[id];
            writeStudioLs(LS_ARTISTS_OVERLAY, overlay);
        }
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fusion-data-source-change', { detail: { source: 'test' } }));
        }
        return true;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.deleteArtistById !== 'function') {
        throw new Error('deleteArtistById unavailable — sign in as staff and run dfx generate fusion-app-backend.');
    }
    return actor.deleteArtistById(id);
}

/**
 * @param {object} r
 * @returns {object}
 */
function normalizeSubscriberRow(r) {
    if (!r || typeof r !== 'object') return r;
    return {
        ...r,
        audiences: Array.isArray(/** @type {Record<string, unknown>} */ (r).audiences)
            ? /** @type {string[]} */ (/** @type {Record<string, unknown>} */ (r).audiences)
            : [],
    };
}

/**
 * Admin-only when live; empty in test mode.
 * @returns {Promise<object[]>}
 */
export async function getSubscribers() {
    if (getDataSource() === 'test') {
        const rows = readStudioLs(LS_SUBSCRIBERS);
        const list = Array.isArray(rows) ? rows : [];
        return list.map((r) => normalizeSubscriberRow(r));
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.getSubscribers !== 'function') {
        throw new Error('getSubscribers missing — run dfx generate fusion-app-backend after backend changes.');
    }
    const rows = await actor.getSubscribers();
    return Array.isArray(rows) ? rows.map((r) => normalizeSubscriberRow(r)) : [];
}

/** Test overlay: email campaigns (`EmailCampaignRecord`-like plain objects). */
const LS_EMAIL_CAMPAIGNS = `${LS_STUDIO_PREFIX}email-campaigns`;
/** Test overlay: Studio Email → Records outbound log. */
const LS_EMAIL_OUTBOUND = `${LS_STUDIO_PREFIX}email-outbound-records`;
/** Test overlay: Resend segment name/id slots (max 5) for Services tab. */
const LS_RESEND_SEGMENTS = `${LS_STUDIO_PREFIX}resend-segments`;

/**
 * After changing `fusion-app-backend` Candid API (e.g. email campaigns), refresh JS bindings:
 * `dfx generate fusion-app-backend` from the repo root, or `npm run build` in the frontend when `prebuild` runs generate.
 */

/**
 * @returns {object[]}
 */
function readTestEmailCampaigns() {
    const raw = readStudioLs(LS_EMAIL_CAMPAIGNS);
    return Array.isArray(raw) ? raw : [];
}

/**
 * @param {object[]} rows
 */
function writeTestEmailCampaigns(rows) {
    writeStudioLs(LS_EMAIL_CAMPAIGNS, rows);
}

/**
 * @returns {object[]}
 */
function readTestEmailOutboundRecords() {
    const raw = readStudioLs(LS_EMAIL_OUTBOUND);
    return Array.isArray(raw) ? raw : [];
}

/**
 * @param {object[]} rows
 */
function writeTestEmailOutboundRecords(rows) {
    writeStudioLs(LS_EMAIL_OUTBOUND, rows);
}

/**
 * Staff/admin with Email feature edit — subscriber rows for category counts and batch sends.
 * @returns {Promise<object[]>}
 */
export async function getSubscribersForEmailStudio() {
    if (getDataSource() === 'test') {
        return getSubscribers();
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.getSubscribersForEmailStudio !== 'function') {
        throw new Error(
            'getSubscribersForEmailStudio missing — run dfx generate fusion-app-backend after backend changes.',
        );
    }
    const rows = await actor.getSubscribersForEmailStudio();
    return Array.isArray(rows) ? rows.map((r) => normalizeSubscriberRow(r)) : [];
}

/**
 * Resend named segment slots (max 5) for Studio Services + Email SYNC.
 * @returns {Promise<Array<{ name: string, segmentId: string }>>}
 */
export async function getResendSegmentConfigFromCanister() {
    if (getDataSource() === 'test') {
        const raw = readStudioLs(LS_RESEND_SEGMENTS);
        if (raw && Array.isArray(raw.slots)) return raw.slots;
        return [];
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.getResendSegmentConfigForStudio !== 'function') {
        throw new Error('getResendSegmentConfigForStudio missing — run dfx generate fusion-app-backend.');
    }
    const out = await actor.getResendSegmentConfigForStudio();
    return Array.isArray(out) ? out : [];
}

/**
 * @param {Array<{ name: string, segmentId: string }>} slots
 */
export async function setResendSegmentConfigOnCanister(slots) {
    const list = Array.isArray(slots) ? slots.slice(0, 5) : [];
    if (getDataSource() === 'test') {
        writeStudioLs(LS_RESEND_SEGMENTS, { slots: list });
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.setResendSegmentConfigForStudio !== 'function') {
        throw new Error('setResendSegmentConfigForStudio missing — run dfx generate fusion-app-backend.');
    }
    await actor.setResendSegmentConfigForStudio(
        list.map((s) => ({ name: String(s?.name ?? ''), segmentId: String(s?.segmentId ?? '') })),
    );
}

/**
 * @param {string} email
 * @param {string[]} audiences Resend segment UUIDs (replaces list)
 */
export async function setSubscriberAudiencesForStudio(email, audiences) {
    const em = String(email || '').trim();
    if (!em) throw new Error('email required');
    const aud = Array.isArray(audiences) ? audiences : [];
    if (getDataSource() === 'test') {
        const cur = readStudioLs(LS_SUBSCRIBERS) || [];
        const list = Array.isArray(cur) ? [...cur] : [];
        const i = list.findIndex((r) => String(r.email).toLowerCase() === em.toLowerCase());
        if (i < 0) throw new Error('subscriber not found');
        const prev = list[i];
        list[i] = { ...prev, email: em, audiences: aud };
        writeStudioLs(LS_SUBSCRIBERS, list);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.setSubscriberAudiencesByEmailForStudio !== 'function') {
        throw new Error('setSubscriberAudiencesByEmailForStudio missing — run dfx generate fusion-app-backend.');
    }
    await actor.setSubscriberAudiencesByEmailForStudio(em, aud);
}

/**
 * @param {string} email
 * @param {string} segmentId
 */
export async function appendSubscriberResendAudienceForStudio(email, segmentId) {
    const em = String(email || '').trim();
    const seg = String(segmentId || '').trim();
    if (!em || !seg) return;
    if (getDataSource() === 'test') {
        const cur = readStudioLs(LS_SUBSCRIBERS) || [];
        const list = Array.isArray(cur) ? [...cur] : [];
        const i = list.findIndex((r) => String(r.email).toLowerCase() === em.toLowerCase());
        if (i < 0) return;
        const prev = normalizeSubscriberRow(list[i]);
        if (prev.audiences.includes(seg)) return;
        list[i] = { ...prev, audiences: [...prev.audiences, seg] };
        writeStudioLs(LS_SUBSCRIBERS, list);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.appendSubscriberResendAudienceForStudio !== 'function') {
        throw new Error('appendSubscriberResendAudienceForStudio missing — run dfx generate fusion-app-backend.');
    }
    await actor.appendSubscriberResendAudienceForStudio(em, seg);
}

/**
 * @returns {Promise<object[]>}
 */
export async function listEmailCampaigns() {
    if (getDataSource() === 'test') {
        const rows = readTestEmailCampaigns();
        return [...rows].sort((a, b) =>
            String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')),
        );
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.listEmailCampaigns !== 'function') {
        throw new Error(
            'listEmailCampaigns missing — run dfx generate fusion-app-backend after backend changes.',
        );
    }
    const rows = await actor.listEmailCampaigns();
    return Array.isArray(rows) ? rows : [];
}

/**
 * @param {string} id
 * @returns {Promise<object | null>}
 */
export async function getEmailCampaign(id) {
    const sid = String(id || '').trim();
    if (!sid) return null;
    if (getDataSource() === 'test') {
        return readTestEmailCampaigns().find((r) => String(r?.id || '') === sid) || null;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.getEmailCampaign !== 'function') {
        throw new Error(
            'getEmailCampaign missing — run dfx generate fusion-app-backend after backend changes.',
        );
    }
    const raw = await actor.getEmailCampaign(sid);
    return unwrapCandidOptionalRecord(raw);
}

/**
 * @param {object} rec — `EmailCampaignRecord` (Candid) shape; empty `id` creates a new row.
 * @returns {Promise<string>} saved id
 */
export async function upsertEmailCampaign(rec) {
    if (getDataSource() === 'test') {
        const rows = readTestEmailCampaigns();
        const idIn = String(rec?.id || '').trim();
        const now = new Date().toISOString();
        if (!idIn) {
            const newId = `ec-test-${Date.now()}`;
            const { Principal } = await import('@dfinity/principal');
            const toSave = {
                ...rec,
                id: newId,
                createdBy: rec?.createdBy ?? Principal.anonymous(),
                createdAt: rec?.createdAt && String(rec.createdAt).trim() ? rec.createdAt : now,
                updatedAt: now,
            };
            rows.push(toSave);
            writeTestEmailCampaigns(rows);
            return newId;
        }
        const idx = rows.findIndex((r) => String(r?.id || '') === idIn);
        if (idx < 0) throw new Error('Email campaign not found');
        const toSave = { ...rows[idx], ...rec, id: idIn, updatedAt: now };
        rows[idx] = toSave;
        writeTestEmailCampaigns(rows);
        return idIn;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.upsertEmailCampaign !== 'function') {
        throw new Error(
            'upsertEmailCampaign missing — run dfx generate fusion-app-backend after backend changes.',
        );
    }
    return actor.upsertEmailCampaign(rec);
}

/**
 * @param {string} id
 * @param {string} resendBroadcastId
 * @param {string | null | undefined} lastError
 * @returns {Promise<void>}
 */
export async function markEmailCampaignSent(id, resendBroadcastId, lastError) {
    const sid = String(id || '').trim();
    if (!sid) throw new Error('Campaign id required');
    if (getDataSource() === 'test') {
        const rows = readTestEmailCampaigns();
        const idx = rows.findIndex((r) => String(r?.id || '') === sid);
        if (idx < 0) throw new Error('Email campaign not found');
        const now = new Date().toISOString();
        rows[idx] = {
            ...rows[idx],
            status: { sent: null },
            resendBroadcastId: [String(resendBroadcastId || 'batch')],
            lastError:
                lastError != null && String(lastError).trim() ? [String(lastError).trim()] : [],
            sentAt: [now],
            updatedAt: now,
        };
        writeTestEmailCampaigns(rows);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.markEmailCampaignSent !== 'function') {
        throw new Error(
            'markEmailCampaignSent missing — run dfx generate fusion-app-backend after backend changes.',
        );
    }
    const errOpt =
        lastError != null && String(lastError).trim() ? [String(lastError).trim()] : [];
    return actor.markEmailCampaignSent(sid, String(resendBroadcastId || ''), errOpt);
}

/**
 * @param {string} id
 * @returns {Promise<string>} new id
 */
export async function duplicateEmailCampaign(id) {
    const sid = String(id || '').trim();
    if (!sid) throw new Error('Campaign id required');
    if (getDataSource() === 'test') {
        const rows = readTestEmailCampaigns();
        const src = rows.find((r) => String(r?.id || '') === sid);
        if (!src) throw new Error('Email campaign not found');
        const { Principal } = await import('@dfinity/principal');
        const newId = `ec-test-${Date.now()}`;
        const now = new Date().toISOString();
        const copy = {
            ...src,
            id: newId,
            status: { draft: null },
            createdAt: now,
            updatedAt: now,
            sentAt: [],
            resendBroadcastId: [],
            lastError: [],
            createdBy: Principal.anonymous(),
        };
        rows.push(copy);
        writeTestEmailCampaigns(rows);
        return newId;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.duplicateEmailCampaign !== 'function') {
        throw new Error(
            'duplicateEmailCampaign missing — run dfx generate fusion-app-backend after backend changes.',
        );
    }
    return actor.duplicateEmailCampaign(sid);
}

/**
 * Admin-only on-chain; may fail for non-admins.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteEmailCampaign(id) {
    const sid = String(id || '').trim();
    if (!sid) throw new Error('Campaign id required');
    if (getDataSource() === 'test') {
        const rows = readTestEmailCampaigns().filter((r) => String(r?.id || '') !== sid);
        writeTestEmailCampaigns(rows);
        return true;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.deleteEmailCampaign !== 'function') {
        throw new Error(
            'deleteEmailCampaign missing — run dfx generate fusion-app-backend after backend changes.',
        );
    }
    return actor.deleteEmailCampaign(sid);
}

/**
 * @param {'single' | 'batch' | 'category' | 'all'} kind
 * @returns {{ single: null } | { batch: null } | { category: null } | { all: null }}
 */
function emailOutboundKindToCandid(kind) {
    const k = String(kind || '').trim().toLowerCase();
    if (k === 'batch') return { batch: null };
    if (k === 'category') return { category: null };
    if (k === 'all') return { all: null };
    return { single: null };
}

/**
 * @param {unknown} kind
 * @returns {'single' | 'batch' | 'category' | 'all'}
 */
export function emailOutboundKindKey(kind) {
    if (kind && typeof kind === 'object') {
        if ('batch' in kind) return 'batch';
        if ('category' in kind) return 'category';
        if ('all' in kind) return 'all';
        if ('single' in kind) return 'single';
    }
    const s = String(kind || '').trim().toLowerCase();
    if (s === 'batch' || s === 'category' || s === 'all' || s === 'single') return s;
    return 'single';
}

/**
 * @param {{
 *   kind: 'single' | 'batch' | 'category' | 'all',
 *   subject: string,
 *   htmlBody?: string,
 *   toSummary?: string,
 *   recipientCount?: number,
 *   ccEmails?: string,
 *   campaignId?: string | null,
 * }} opts
 * @returns {Promise<string>} record id
 */
export async function appendEmailOutboundRecord(opts) {
    const subject = String(opts?.subject || '').trim();
    if (!subject) throw new Error('Subject required');
    const htmlBody = String(opts?.htmlBody || '');
    const toSummary = String(opts?.toSummary || '').trim();
    const recipientCount = Math.max(0, Math.round(Number(opts?.recipientCount) || 0));
    const ccEmails = String(opts?.ccEmails || '').trim();
    const campaignId = String(opts?.campaignId || '').trim();
    const kind = emailOutboundKindKey(opts?.kind);

    if (getDataSource() === 'test') {
        const rows = readTestEmailOutboundRecords();
        const id = `eo-test-${Date.now()}`;
        const { Principal } = await import('@dfinity/principal');
        rows.push({
            id,
            kind: emailOutboundKindToCandid(kind),
            subject,
            htmlBody,
            toSummary,
            recipientCount,
            ccEmails,
            campaignId: campaignId ? [campaignId] : [],
            sentAt: new Date().toISOString(),
            createdBy: Principal.anonymous(),
        });
        writeTestEmailOutboundRecords(rows);
        return id;
    }

    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.appendEmailOutboundRecord !== 'function') {
        throw new Error(
            'appendEmailOutboundRecord missing — deploy backend and run dfx generate fusion-app-backend.',
        );
    }
    return actor.appendEmailOutboundRecord(
        emailOutboundKindToCandid(kind),
        subject,
        htmlBody,
        toSummary,
        BigInt(recipientCount),
        ccEmails,
        campaignId ? [campaignId] : [],
    );
}

/**
 * @returns {Promise<object[]>}
 */
export async function listEmailOutboundRecords() {
    if (getDataSource() === 'test') {
        const rows = readTestEmailOutboundRecords();
        return [...rows].sort((a, b) =>
            String(b.sentAt || '').localeCompare(String(a.sentAt || '')),
        );
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.listEmailOutboundRecords !== 'function') {
        throw new Error(
            'listEmailOutboundRecords missing — deploy backend and run dfx generate fusion-app-backend.',
        );
    }
    const rows = await actor.listEmailOutboundRecords();
    return Array.isArray(rows) ? rows : [];
}

/**
 * @param {string} id
 * @returns {Promise<object | null>}
 */
export async function getEmailOutboundRecord(id) {
    const sid = String(id || '').trim();
    if (!sid) return null;
    if (getDataSource() === 'test') {
        return readTestEmailOutboundRecords().find((r) => String(r?.id || '') === sid) || null;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.getEmailOutboundRecord !== 'function') {
        throw new Error(
            'getEmailOutboundRecord missing — deploy backend and run dfx generate fusion-app-backend.',
        );
    }
    const raw = await actor.getEmailOutboundRecord(sid);
    return unwrapCandidOptionalRecord(raw);
}

/**
 * Programs as flat list for Studio (en card merged with id/route).
 * @returns {Promise<object[]>}
 */
export async function getPrograms() {
    if (getDataSource() === 'test') {
        const block = readStudioLs(LS_PROGRAMS_BLOCK);
        const en = block?.programs?.en?.length
            ? block.programs.en
            : testData.allPrograms?.programs?.en || [];
        return en.map((p) => ({ ...p, _source: 'test' }));
    }
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.listPrograms !== 'function') return [];
        const rows = await actor.listPrograms();
        if (!Array.isArray(rows)) return [];
        return rows.map(mapProgramRecordToJs);
    } catch {
        return [];
    }
}

/**
 * Normalize visibility: `public` | `private` | `none`; empty/unknown → `public` (legacy rows).
 * @param {unknown} v
 * @returns {'public' | 'private' | 'none'}
 */
export function normalizeProgramVisibility(v) {
    const s = String(v ?? '')
        .trim()
        .toLowerCase();
    if (s === 'private' || s === 'none') return s;
    return 'public';
}

/**
 * @param {string} pathname
 */
function normalizeProgramPath(pathname) {
    if (!pathname) return '';
    if (pathname.startsWith('/programs/')) {
        return `/program/${pathname.slice('/programs/'.length)}`;
    }
    return pathname;
}

/**
 * @param {string} pathname
 * @returns {{ access: 'public' | 'private', canonical: string } | null}
 */
function parseProgramViewPath(pathname) {
    const raw = String(pathname || '').split('?')[0];
    if (raw.startsWith('/program/private/')) {
        const slug = raw.slice('/program/private/'.length).split('/').filter(Boolean)[0];
        if (!slug) return null;
        return { access: 'private', canonical: `/program/${decodeURIComponent(slug)}` };
    }
    if (raw.startsWith('/programs/private/')) {
        const slug = raw.slice('/programs/private/'.length).split('/').filter(Boolean)[0];
        if (!slug) return null;
        return { access: 'private', canonical: `/program/${decodeURIComponent(slug)}` };
    }
    const canonical = normalizeProgramPath(raw);
    if (!canonical.startsWith('/program/')) return null;
    if (canonical.startsWith('/program/private/')) {
        const slug = canonical.slice('/program/private/'.length).split('/').filter(Boolean)[0];
        return slug
            ? { access: 'private', canonical: `/program/${decodeURIComponent(slug)}` }
            : null;
    }
    return { access: 'public', canonical };
}

/**
 * Programs index / home “coming up”: only `public` programs.
 * @param {object} block from `getAllProgramsBlock()`
 * @returns {object}
 */
export function filterProgramsBlockToPublicListing(block) {
    const en = block?.programs?.en || [];
    const ja = block?.programs?.ja || [];
    const enOut = [];
    const jaOut = [];
    for (let i = 0; i < en.length; i++) {
        if (normalizeProgramVisibility(en[i]?.visibility) !== 'public') continue;
        enOut.push(en[i]);
        jaOut.push(ja[i] || en[i]);
    }
    return {
        ...block,
        programs: { en: enOut, ja: jaOut },
    };
}

/**
 * Match `/program/...`, `/programs/...`, or `/program/private/...` against program list (test or live).
 * Public URLs resolve only when visibility is `public`; private URLs only when `private`.
 * @param {string} pathname
 * @returns {Promise<{ en: object, ja: object } | null>}
 */
export async function findProgramPairByPathname(pathname) {
    const parsed = parseProgramViewPath(pathname);
    if (!parsed) return null;
    const block = await getAllProgramsBlock();
    const enList = block.programs?.en || [];
    const jaList = block.programs?.ja || [];
    const idx = enList.findIndex((p) => p?.routeLink === parsed.canonical);
    if (idx < 0) return null;
    const vis = normalizeProgramVisibility(enList[idx]?.visibility);
    if (parsed.access === 'private') {
        if (vis !== 'private') return null;
    } else if (vis !== 'public') {
        return null;
    }
    return {
        en: enList[idx],
        ja: jaList[idx] || enList[idx],
    };
}

/**
 * Shape compatible with `app-coming-up` / `testData.allPrograms`.
 * @returns {Promise<object>}
 */
export async function getAllProgramsBlock() {
    if (getDataSource() === 'test') {
        const block = readStudioLs(LS_PROGRAMS_BLOCK);
        if (block && block.programs) return /** @type {object} */ (distributeUploadedAssetUrls(block));
        return /** @type {object} */ (
            distributeUploadedAssetUrls(testData.allPrograms || { order: 2, programs: { en: [], ja: [] } })
        );
    }
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.listPrograms !== 'function') {
            return { order: 2, programs: { en: [], ja: [] } };
        }
        const rows = await actor.listPrograms();
        if (!Array.isArray(rows) || rows.length === 0) {
            return { order: 2, programs: { en: [], ja: [] } };
        }
        const en = [];
        const ja = [];
        for (const r of rows) {
            const o = mapProgramRecordToJs(r);
            const vis = o.visibility ?? 'public';
            const dep = o.depositAmountDisplay != null ? String(o.depositAmountDisplay) : '';
            if (o.enCard) {
                en.push({
                    ...o.enCard,
                    visibility: vis,
                    studioStatus: o.studioStatus,
                    depositAmountDisplay: dep,
                });
            }
            if (o.jaCard) {
                ja.push({
                    ...o.jaCard,
                    visibility: vis,
                    studioStatus: o.studioStatus,
                    depositAmountDisplay: dep,
                });
            }
        }
        return /** @type {object} */ (distributeUploadedAssetUrls({ order: 2, programs: { en, ja } }));
    } catch {
        return { order: 2, programs: { en: [], ja: [] } };
    }
}

/**
 * @param {Record<string, unknown>} r
 */
function mapProgramRecordToJs(r) {
    const id = String(r.id ?? '');
    const routeLink = String(r.route_link ?? r.routeLink ?? '');
    const localesJson = String(r.locales_json ?? r.localesJson ?? '{}');
    let parsed = {};
    try {
        parsed = distributeUploadedAssetUrls(JSON.parse(localesJson));
    } catch {
        parsed = {};
    }
    const enCard = parsed.en ? { ...parsed.en, id, routeLink } : { id, routeLink, focus: id };
    const jaCard = parsed.ja ? { ...parsed.ja, id, routeLink } : null;
    const depositAmountDisplay = String(
        r.deposit_amount_display ?? r.depositAmountDisplay ?? '',
    );
    return {
        id,
        routeLink,
        featuredOrder: Number(r.featured_order ?? r.featuredOrder ?? 0),
        visibility: String(r.visibility ?? ''),
        studioStatus: String(r.studio_status ?? r.studioStatus ?? ''),
        updatedAt: String(r.updated_at ?? r.updatedAt ?? ''),
        depositAmountDisplay,
        enCard,
        jaCard,
        localesJson,
        _raw: r,
    };
}

/**
 * @returns {Promise<object[]>}
 */
export async function getJournalEntries() {
    if (getDataSource() === 'test') {
        const ls = readStudioLs(LS_JOURNALS);
        if (Array.isArray(ls) && ls.length) return /** @type {object[]} */ (distributeUploadedAssetUrls(ls));
        return /** @type {object[]} */ (distributeUploadedAssetUrls(testData.journals?.journals || []));
    }
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.listJournalEntries !== 'function') return [];
        const rows = await actor.listJournalEntries();
        if (!Array.isArray(rows)) return [];
        return /** @type {object[]} */ (distributeUploadedAssetUrls(rows.map(mapJournalRecordToJs)));
    } catch {
        return [];
    }
}

/**
 * Map a canister `JournalLayoutRow` to a plain JS object (sortOrder + featured from Motoko).
 * @param {Record<string, unknown>} r
 * @param {number} [idx]
 */
export function mapJournalLayoutRowFromCanister(r, idx = 0) {
    const so = r.sortOrder ?? r.sort_order;
    const sortOrder = so != null && so !== undefined ? Math.max(0, Math.floor(Number(so))) : idx;
    return {
        rowType: String(r.rowType ?? r.row_type ?? ''),
        refId: unwrapOpt(r.refId ?? r.ref_id)?.toString?.() ?? undefined,
        selectionMode: unwrapOpt(r.selectionMode ?? r.selection_mode)?.toString?.() ?? undefined,
        artistId: unwrapOpt(r.artistId ?? r.artist_id)?.toString?.() ?? undefined,
        sortOrder,
        featured: Boolean(r.featured),
    };
}

/**
 * Ordered `/journal` composition rows from canister.
 * @returns {Promise<Array<{ rowType: string, refId?: string, selectionMode?: string, artistId?: string, sortOrder: number, featured: boolean }>>}
 */
export async function getJournalLayoutPublic() {
    if (getDataSource() === 'test') {
        const ls = readStudioLs('fusion-journal-layout');
        if (Array.isArray(ls) && ls.length) {
            return ls.map((row, i) => ({
                rowType: String(row?.rowType || ''),
                refId: row?.refId,
                selectionMode: row?.selectionMode,
                artistId: row?.artistId,
                sortOrder: Math.max(0, Math.floor(Number(row?.sortOrder ?? i))),
                featured: Boolean(row?.featured),
            }));
        }
        return [
            { rowType: 'event', refId: '1', sortOrder: 0, featured: false },
            { rowType: 'journal-entry', refId: '0', sortOrder: 1, featured: false },
            { rowType: 'quote', selectionMode: 'random', sortOrder: 2, featured: false },
            { rowType: 'journal-entry', refId: '1', sortOrder: 3, featured: false },
            { rowType: 'event', refId: '2', sortOrder: 4, featured: false },
            { rowType: 'journal-entry', refId: '2', sortOrder: 5, featured: false },
            { rowType: 'audio', selectionMode: 'random', sortOrder: 6, featured: false },
        ];
    }
    try {
        const actor = await getFusionBackendActor();
        if (!actor || typeof actor.getJournalLayout !== 'function') return [];
        const rows = await actor.getJournalLayout();
        if (!Array.isArray(rows)) return [];
        return rows.map((r, i) => mapJournalLayoutRowFromCanister(/** @type {Record<string, unknown>} */ (r), i));
    } catch {
        return [];
    }
}

/**
 * Studio/admin: get persisted journal layout rows.
 * @returns {Promise<Array<{ rowType: string, refId?: string, selectionMode?: string, artistId?: string }>>}
 */
export async function adminGetJournalLayoutStudio() {
    if (getDataSource() === 'test') {
        const ls = readStudioLs('fusion-journal-layout');
        if (Array.isArray(ls)) return ls;
        return getJournalLayoutPublic();
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminGetJournalLayout !== 'function') {
        return [];
    }
    const rows = await actor.adminGetJournalLayout();
    if (!Array.isArray(rows)) return [];
    return rows.map((r, i) => mapJournalLayoutRowFromCanister(/** @type {Record<string, unknown>} */ (r), i));
}

/**
 * Studio/admin: persist ordered journal layout rows.
 * @param {Array<{ rowType: string, refId?: string, selectionMode?: string, artistId?: string, sortOrder?: number, featured?: boolean }>} rows
 */
export async function adminSetJournalLayoutStudio(rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    if (getDataSource() === 'test') {
        writeStudioLs('fusion-journal-layout', safeRows);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminSetJournalLayout !== 'function') {
        throw new Error('adminSetJournalLayout unavailable — run dfx generate fusion-app-backend from the project root.');
    }
    await actor.adminSetJournalLayout(
        safeRows.map((r) => {
            const sortOrder = Math.max(0, Math.floor(Number(r.sortOrder ?? 0)));
            return {
                rowType: String(r.rowType || ''),
                refId: r.refId ? [String(r.refId)] : [],
                selectionMode: r.selectionMode ? [String(r.selectionMode)] : [],
                artistId: r.artistId ? [String(r.artistId)] : [],
                sortOrder,
                featured: Boolean(r.featured),
            };
        })
    );
}

const LS_SOUND_ENV = 'fusion-sound-environment';
const LS_COMMUNITY_PAGE = 'fusion-community-page-json';
const LS_COMMUNITY_VIDEOS = 'fusion-community-videos';
const LS_COMMUNITY_FEATURED = 'fusion-community-featured-videos';

/** @returns {Record<string, unknown>} */
function defaultSoundEnvironmentJs() {
    return {
        categoryLabel: 'Nature',
        atmosphereAudioUrl: '',
        voiceSelectionMode: 'random',
        voiceArtistId: undefined,
        manualVoiceAudioUrl: '',
        minIntervalSec: 45,
        maxIntervalSec: 120,
        atmosphereVolumePercent: 60,
        voicesVolumePercent: 40,
        learnMoreJournalEntryId: undefined,
        enabled: false,
    };
}

/**
 * @param {Record<string, unknown>} c
 */
function mapSoundEnvironmentFromCanister(c) {
    const base = defaultSoundEnvironmentJs();
    if (!c || typeof c !== 'object') return base;
    return {
        categoryLabel: String(c.categoryLabel ?? c.category_label ?? base.categoryLabel),
        atmosphereAudioUrl: String(c.atmosphereAudioUrl ?? c.atmosphere_audio_url ?? ''),
        voiceSelectionMode: String(
            c.voiceSelectionMode ?? c.voice_selection_mode ?? 'random',
        ),
        voiceArtistId: unwrapOpt(c.voiceArtistId ?? c.voice_artist_id)?.toString?.() ?? undefined,
        manualVoiceAudioUrl: String(c.manualVoiceAudioUrl ?? c.manual_voice_audio_url ?? ''),
        minIntervalSec: Math.max(0, Math.floor(Number(c.minIntervalSec ?? c.min_interval_sec ?? 45))),
        maxIntervalSec: Math.max(0, Math.floor(Number(c.maxIntervalSec ?? c.max_interval_sec ?? 120))),
        atmosphereVolumePercent: Math.min(
            100,
            Math.max(0, Math.floor(Number(c.atmosphereVolumePercent ?? c.atmosphere_volume_percent ?? 60))),
        ),
        voicesVolumePercent: Math.min(
            100,
            Math.max(0, Math.floor(Number(c.voicesVolumePercent ?? c.voices_volume_percent ?? 40))),
        ),
        learnMoreJournalEntryId:
            unwrapOpt(c.learnMoreJournalEntryId ?? c.learn_more_journal_entry_id)?.toString?.() ?? undefined,
        enabled: Boolean(c.enabled),
    };
}

/**
 * Public: header sound environment config.
 * @returns {Promise<Record<string, unknown>>}
 */
export async function getSoundEnvironmentPublic() {
    if (getDataSource() === 'test') {
        const ls = readStudioLs(LS_SOUND_ENV);
        if (ls && typeof ls === 'object' && !Array.isArray(ls)) {
            return { ...defaultSoundEnvironmentJs(), ...ls };
        }
        return defaultSoundEnvironmentJs();
    }
    try {
        const actor = await getFusionBackendActor();
        if (!actor || typeof actor.getSoundEnvironment !== 'function') {
            return defaultSoundEnvironmentJs();
        }
        const c = await actor.getSoundEnvironment();
        return mapSoundEnvironmentFromCanister(/** @type {Record<string, unknown>} */ (c));
    } catch {
        return defaultSoundEnvironmentJs();
    }
}

/**
 * @returns {Promise<Record<string, unknown>>}
 */
export async function adminGetSoundEnvironmentStudio() {
    if (getDataSource() === 'test') {
        return getSoundEnvironmentPublic();
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminGetSoundEnvironment !== 'function') {
        return defaultSoundEnvironmentJs();
    }
    const c = await actor.adminGetSoundEnvironment();
    return mapSoundEnvironmentFromCanister(/** @type {Record<string, unknown>} */ (c));
}

/**
 * @param {Record<string, unknown>} config
 */
export async function adminSetSoundEnvironmentStudio(config) {
    const c = { ...defaultSoundEnvironmentJs(), ...config };
    if (getDataSource() === 'test') {
        writeStudioLs(LS_SOUND_ENV, c);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminSetSoundEnvironment !== 'function') {
        throw new Error('adminSetSoundEnvironment unavailable — run dfx generate fusion-app-backend from the project root.');
    }
    await actor.adminSetSoundEnvironment({
        categoryLabel: String(c.categoryLabel || ''),
        atmosphereAudioUrl: String(c.atmosphereAudioUrl || ''),
        voiceSelectionMode: String(c.voiceSelectionMode || 'random'),
        voiceArtistId: c.voiceArtistId ? [String(c.voiceArtistId)] : [],
        manualVoiceAudioUrl: String(c.manualVoiceAudioUrl || ''),
        minIntervalSec: Math.max(0, Math.floor(Number(c.minIntervalSec ?? 0))),
        maxIntervalSec: Math.max(0, Math.floor(Number(c.maxIntervalSec ?? 0))),
        atmosphereVolumePercent: Math.min(100, Math.max(0, Math.floor(Number(c.atmosphereVolumePercent ?? 0)))),
        voicesVolumePercent: Math.min(100, Math.max(0, Math.floor(Number(c.voicesVolumePercent ?? 0)))),
        learnMoreJournalEntryId: c.learnMoreJournalEntryId ? [String(c.learnMoreJournalEntryId)] : [],
        enabled: Boolean(c.enabled),
    });
}

/** @typedef {ReturnType<typeof import('./communityPageDefaults.js').defaultCommunityPage>} CommunityPageShape */

/** @returns {Promise<Record<string, unknown>>} */
export async function getCommunityPagePublic() {
    const { normalizeCommunityPage } = await import('./communityPageDefaults.js');
    if (shouldUseCommunityTestData()) {
        const raw = readStudioLs(LS_COMMUNITY_PAGE);
        if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
            return normalizeCommunityPage(raw);
        }
        return normalizeCommunityPage({});
    }
    try {
        const actor = await getFusionBackendActor();
        if (!actor || typeof actor.getCommunityPagePublic !== 'function') {
            const { normalizeCommunityPage: norm } = await import('./communityPageDefaults.js');
            return norm({});
        }
        const t = await actor.getCommunityPagePublic();
        const text = typeof t === 'string' ? t : String(t ?? '');
        if (!text.trim()) {
            const { normalizeCommunityPage: norm } = await import('./communityPageDefaults.js');
            return norm({});
        }
        try {
            const j = JSON.parse(text);
            return normalizeCommunityPage(j);
        } catch {
            const { normalizeCommunityPage: norm } = await import('./communityPageDefaults.js');
            return norm({});
        }
    } catch {
        const { normalizeCommunityPage: norm } = await import('./communityPageDefaults.js');
        return norm({});
    }
}

/** @returns {Promise<Record<string, unknown>>} */
export async function adminGetCommunityPageStudio() {
    const { normalizeCommunityPage } = await import('./communityPageDefaults.js');
    if (shouldUseCommunityTestData()) {
        return getCommunityPagePublic();
    }
    let adminReadError = null;
    try {
        const actor = await getStudioAuthenticatedActor();
        if (actor && typeof actor.adminGetCommunityPage === 'function') {
            const t = await actor.adminGetCommunityPage();
            const text = typeof t === 'string' ? t : String(t ?? '');
            if (text.trim()) {
                try {
                    return normalizeCommunityPage(JSON.parse(text));
                } catch {
                    return normalizeCommunityPage({});
                }
            }
        }
    } catch (e) {
        adminReadError = e;
    }
    if (adminReadError) {
        throw adminReadError;
    }
    return getCommunityPagePublic();
}

/**
 * @param {Record<string, unknown>} bundle
 */
export async function adminSetCommunityPageStudio(bundle) {
    const { normalizeCommunityPage } = await import('./communityPageDefaults.js');
    const normalized = normalizeCommunityPage(bundle && typeof bundle === 'object' ? bundle : {});
    const text = JSON.stringify(normalized);
    if (shouldUseCommunityTestData()) {
        writeStudioLs(LS_COMMUNITY_PAGE, normalized);
        return { mode: 'test', bytes: text.length };
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminSetCommunityPage !== 'function') {
        throw new Error('adminSetCommunityPage unavailable — run dfx generate fusion-app-backend from the project root.');
    }
    await actor.adminSetCommunityPage(text);
    return { mode: 'live', bytes: text.length };
}

// ===== Community videos (`/videos` library) =====

/**
 * @param {unknown} row
 */
function mapCommunityVideoFromActor(row) {
    if (!row || typeof row !== 'object') return null;
    const r = /** @type {Record<string, unknown>} */ (row);
    return {
        id: String(r.id ?? ''),
        slug: String(r.slug ?? ''),
        visible: r.visible !== false,
        publishedAt: String(r.publishedAt ?? ''),
        sortOrder: Number(r.sortOrder ?? 0),
        updatedAt: String(r.updatedAt ?? ''),
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

/** @returns {Promise<object[]>} */
async function readCommunityVideosTestStore() {
    const cur = readStudioLs(LS_COMMUNITY_VIDEOS);
    return Array.isArray(cur) ? cur : [];
}

/** @param {object[]} list */
function writeCommunityVideosTestStore(list) {
    writeStudioLs(LS_COMMUNITY_VIDEOS, list);
}

/** @returns {Promise<{ featuredVideoIds: string[], heroVideoId: string | null, updatedAt: string }>} */
async function readCommunityFeaturedTestStore() {
    const cur = readStudioLs(LS_COMMUNITY_FEATURED);
    if (cur && typeof cur === 'object' && !Array.isArray(cur)) {
        const o = /** @type {Record<string, unknown>} */ (cur);
        return {
            featuredVideoIds: Array.isArray(o.featuredVideoIds) ? o.featuredVideoIds.map(String) : [],
            heroVideoId: o.heroVideoId != null && o.heroVideoId !== '' ? String(o.heroVideoId) : null,
            updatedAt: String(o.updatedAt ?? ''),
        };
    }
    return { featuredVideoIds: [], heroVideoId: null, updatedAt: '' };
}

/** @param {{ featuredVideoIds: string[], heroVideoId: string | null, updatedAt: string }} cfg */
function writeCommunityFeaturedTestStore(cfg) {
    writeStudioLs(LS_COMMUNITY_FEATURED, cfg);
}

/**
 * @param {{ limit?: number, offset?: number, visibleOnly?: boolean }} [opts]
 * @returns {Promise<object[]>}
 */
export async function listCommunityVideosPublic(opts = {}) {
    const limit = Math.max(1, Math.min(500, Math.floor(Number(opts.limit) || 500)));
    const offset = Math.max(0, Math.floor(Number(opts.offset) || 0));
    const { normalizeCommunityVideoRecord } = await import('./videoPageModel.js');
    if (shouldUseCommunityTestData()) {
        let rows = await readCommunityVideosTestStore();
        if (opts.visibleOnly !== false) rows = rows.filter((r) => r?.visible !== false);
        return rows.slice(offset, offset + limit).map((r) => normalizeCommunityVideoRecord(r));
    }
    try {
        const actor = await getFusionBackendActor();
        if (!actor || typeof actor.listCommunityVideosPublic !== 'function') return [];
        const rows = await actor.listCommunityVideosPublic(BigInt(offset), BigInt(limit));
        return (Array.isArray(rows) ? rows : [])
            .map(mapCommunityVideoFromActor)
            .filter(Boolean)
            .map((r) => normalizeCommunityVideoRecord(r));
    } catch {
        return [];
    }
}

/** @returns {Promise<{ featuredVideoIds: string[], heroVideoId: string | null, updatedAt: string }>} */
export async function getCommunityFeaturedVideosPublic() {
    if (shouldUseCommunityTestData()) {
        return readCommunityFeaturedTestStore();
    }
    try {
        const actor = await getFusionBackendActor();
        if (!actor || typeof actor.getCommunityFeaturedVideosPublic !== 'function') {
            return { featuredVideoIds: [], heroVideoId: null, updatedAt: '' };
        }
        const cfg = await actor.getCommunityFeaturedVideosPublic();
        let heroVideoId = null;
        const heroOpt = cfg?.heroVideoId;
        if (Array.isArray(heroOpt) && heroOpt.length) heroVideoId = String(heroOpt[0]);
        return {
            featuredVideoIds: Array.isArray(cfg?.featuredVideoIds) ? cfg.featuredVideoIds.map(String) : [],
            heroVideoId,
            updatedAt: String(cfg?.updatedAt ?? ''),
        };
    } catch {
        return { featuredVideoIds: [], heroVideoId: null, updatedAt: '' };
    }
}

/** @returns {Promise<object[]>} */
export async function listCommunityVideosStudio() {
    const { normalizeCommunityVideoRecord } = await import('./videoPageModel.js');
    if (shouldUseCommunityTestData()) {
        return (await readCommunityVideosTestStore()).map((r) => normalizeCommunityVideoRecord(r));
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.listCommunityVideos !== 'function') {
        throw new Error('listCommunityVideos unavailable — run dfx generate fusion-app-backend.');
    }
    const rows = await actor.listCommunityVideos();
    return (Array.isArray(rows) ? rows : [])
        .map(mapCommunityVideoFromActor)
        .filter(Boolean)
        .map((r) => normalizeCommunityVideoRecord(r));
}

/**
 * @param {string} videoId
 */
export async function getCommunityVideoStudio(videoId) {
    const id = String(videoId ?? '').trim();
    if (!id) return null;
    const { normalizeCommunityVideoRecord } = await import('./videoPageModel.js');
    if (shouldUseCommunityTestData()) {
        const row = (await readCommunityVideosTestStore()).find((v) => String(v?.id) === id);
        return row ? normalizeCommunityVideoRecord(row) : null;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.getCommunityVideo !== 'function') return null;
    const opt = await actor.getCommunityVideo(id);
    const row = Array.isArray(opt) && opt.length ? opt[0] : opt && typeof opt === 'object' ? opt : null;
    return row ? normalizeCommunityVideoRecord(mapCommunityVideoFromActor(row)) : null;
}

/**
 * @param {Record<string, unknown>} rec
 */
export async function upsertCommunityVideoStudio(rec) {
    const { communityVideoRecordToCandid, normalizeCommunityVideoRecord } = await import('./videoPageModel.js');
    const normalized = normalizeCommunityVideoRecord(rec);
    normalized.updatedAt = new Date().toISOString();
    if (shouldUseCommunityTestData()) {
        const list = await readCommunityVideosTestStore();
        const ix = list.findIndex((v) => String(v?.id) === String(normalized.id));
        if (ix >= 0) list[ix] = normalized;
        else list.push(normalized);
        writeCommunityVideosTestStore(list);
        return normalized;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.upsertCommunityVideo !== 'function') {
        throw new Error('upsertCommunityVideo unavailable — run dfx generate fusion-app-backend.');
    }
    await actor.upsertCommunityVideo(communityVideoRecordToCandid(normalized));
    return normalized;
}

/**
 * @param {string} videoId
 */
export async function deleteCommunityVideoStudio(videoId) {
    const id = String(videoId ?? '').trim();
    if (!id) return false;
    if (shouldUseCommunityTestData()) {
        const list = (await readCommunityVideosTestStore()).filter((v) => String(v?.id) !== id);
        writeCommunityVideosTestStore(list);
        const cfg = await readCommunityFeaturedTestStore();
        writeCommunityFeaturedTestStore({
            ...cfg,
            featuredVideoIds: cfg.featuredVideoIds.filter((x) => x !== id),
            heroVideoId: cfg.heroVideoId === id ? null : cfg.heroVideoId,
        });
        return true;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.deleteCommunityVideo !== 'function') return false;
    return actor.deleteCommunityVideo(id);
}

/** @returns {Promise<{ featuredVideoIds: string[], heroVideoId: string | null, updatedAt: string }>} */
export async function getCommunityFeaturedVideosStudio() {
    if (shouldUseCommunityTestData()) {
        return readCommunityFeaturedTestStore();
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminGetCommunityFeaturedVideos !== 'function') {
        return getCommunityFeaturedVideosPublic();
    }
    const cfg = await actor.adminGetCommunityFeaturedVideos();
    let heroVideoId = null;
    const heroOpt = cfg?.heroVideoId;
    if (Array.isArray(heroOpt) && heroOpt.length) heroVideoId = String(heroOpt[0]);
    return {
        featuredVideoIds: Array.isArray(cfg?.featuredVideoIds) ? cfg.featuredVideoIds.map(String) : [],
        heroVideoId,
        updatedAt: String(cfg?.updatedAt ?? ''),
    };
}

/**
 * @param {{ featuredVideoIds: string[], heroVideoId: string | null }} cfg
 */
export async function setCommunityFeaturedVideosStudio(cfg) {
    const payload = {
        featuredVideoIds: (Array.isArray(cfg.featuredVideoIds) ? cfg.featuredVideoIds : []).slice(0, 6).map(String),
        heroVideoId: cfg.heroVideoId ? String(cfg.heroVideoId) : null,
        updatedAt: new Date().toISOString(),
    };
    if (shouldUseCommunityTestData()) {
        writeCommunityFeaturedTestStore(payload);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminSetCommunityFeaturedVideos !== 'function') {
        throw new Error('adminSetCommunityFeaturedVideos unavailable — run dfx generate fusion-app-backend.');
    }
    await actor.adminSetCommunityFeaturedVideos({
        featuredVideoIds: payload.featuredVideoIds,
        heroVideoId: payload.heroVideoId ? [payload.heroVideoId] : [],
        updatedAt: payload.updatedAt,
    });
}

/** Import legacy exclusive[] when library empty. */
export async function migrateLegacyCommunityVideosIfEmpty() {
    const existing = await listCommunityVideosStudio().catch(() => []);
    if (existing.length) return { migrated: 0, skipped: true };
    const page = await getCommunityPagePublic();
    const exclusive = Array.isArray(page?.exclusive) ? page.exclusive : [];
    const { legacyExclusiveItemToVideoRecord } = await import('./videoPageModel.js');
    const featuredIds = [];
    let heroId = null;
    for (let i = 0; i < exclusive.length; i++) {
        const item = exclusive[i];
        if (!item || typeof item !== 'object' || item.visible === false) continue;
        const rec = legacyExclusiveItemToVideoRecord(item, i);
        await upsertCommunityVideoStudio(rec);
        featuredIds.push(String(rec.id));
        if (item.isHero === true) heroId = String(rec.id);
    }
    if (featuredIds.length) {
        await setCommunityFeaturedVideosStudio({
            featuredVideoIds: featuredIds.slice(0, 6),
            heroVideoId: heroId || featuredIds[0] || null,
        });
    }
    return { migrated: featuredIds.length, skipped: false };
}

/** @returns {Promise<{ allVideos: object[], featuredItems: object[], catalogItems: object[], heroItem: Record<string, unknown>, heroIndex: number, featuredRecords: object[], featuredVideoIds: string[] }>} */
export async function getCommunityLandingVideosBundle() {
    const { partitionVideosForPage } = await import('./videoPageModel.js');
    await migrateLegacyCommunityVideosIfEmpty().catch(() => {});
    const [allVideos, featuredCfg] = await Promise.all([
        listCommunityVideosPublic({ limit: 500, offset: 0, visibleOnly: false }),
        getCommunityFeaturedVideosPublic(),
    ]);
    const visibleVideos = allVideos.filter((v) => v.visible !== false);
    const partition = partitionVideosForPage(visibleVideos, featuredCfg);
    return {
        allVideos: visibleVideos,
        featuredRecords: partition.featuredRecords,
        featuredItems: partition.recentItems,
        catalogItems: partition.catalogItems,
        featuredVideoIds: partition.featuredIds,
        heroItem: partition.heroItem,
        heroIndex: partition.heroIndex,
    };
}

/**
 * Studio/admin: set shared artist quote/audio metadata.
 * @param {string} artistId
 * @param {{ quote?: string, audioUrl?: string, audioTitle?: string }} media
 */
export async function adminSetArtistMediaForStudio(artistId, media) {
    const id = String(artistId || '').trim();
    if (!id) return;
    const quote = String(media?.quote ?? '');
    const audioUrl = toCloudFrontAssetUrl(media?.audioUrl);
    const audioTitle = String(media?.audioTitle ?? '');
    const ts = new Date().toISOString();
    if (getDataSource() === 'test') {
        const artists = await getArtistsForStudio();
        const base = artists.find((x) => String(x?.id ?? '') === id);
        if (!base) return;
        const overlay = readStudioLs(LS_ARTISTS_OVERLAY) || {};
        overlay[id] = normalizeArtistDefaults({ ...base, quote, audioUrl, audioTitle, updatedAt: ts });
        writeStudioLs(LS_ARTISTS_OVERLAY, overlay);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminSetArtistMediaForStudio !== 'function') {
        throw new Error('adminSetArtistMediaForStudio unavailable — run dfx generate fusion-app-backend from the project root.');
    }
    await actor.adminSetArtistMediaForStudio(id, quote, audioUrl, audioTitle, ts);
}

/**
 * @param {Record<string, unknown>} r
 */
function mapJournalRecordToJs(r) {
    const rawId = r.id;
    const id =
        typeof rawId === 'number'
            ? rawId
            : typeof rawId === 'string' && /^\d+$/.test(rawId)
              ? Number(rawId)
              : rawId ?? '';
    const link = String(r.link ?? '');
    let parsed = {};
    try {
        parsed = distributeUploadedAssetUrls(JSON.parse(String(r.locales_json ?? r.localesJson ?? '{}')));
    } catch {
        parsed = {};
    }
    return {
        id,
        imageSrc: r.image_key ?? r.imageKey ?? '',
        link,
        entryStatus: String(r.entry_status ?? r.entryStatus ?? ''),
        en: parsed.en || {},
        ja: parsed.ja || {},
        localesJson: String(r.locales_json ?? r.localesJson ?? '{}'),
        updatedAt: String(r.updated_at ?? r.updatedAt ?? ''),
    };
}

/**
 * @returns {Promise<object[]>}
 */
/**
 * @param {Record<string, unknown>} item
 */
function normalizeTestEditionItem(item) {
    if (!item || typeof item !== 'object') return item;
    const href = String(item.href ?? '');
    const id =
        String(item.id ?? '') || (href ? href.split('/').filter(Boolean).pop() || '' : '') || '';
    const localesJson =
        typeof item.localesJson === 'string' && item.localesJson
            ? item.localesJson
            : JSON.stringify({
                  imageSrc: item.imageSrc,
                  en: item.en,
                  ja: item.ja,
              });
    return {
        ...item,
        id,
        href: href || item.href,
        productStatus: item.productStatus ?? 'active',
        localesJson,
    };
}

export async function getEditions() {
    if (getDataSource() === 'test') {
        const ls = readStudioLs(LS_EDITIONS);
        const raw = Array.isArray(ls) && ls.length ? ls : testData.editions?.items || [];
        return /** @type {object[]} */ (distributeUploadedAssetUrls(raw.map(normalizeTestEditionItem)));
    }
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.listEditions !== 'function') return [];
        const rows = await actor.listEditions();
        if (!Array.isArray(rows)) return [];
        return /** @type {object[]} */ (distributeUploadedAssetUrls(rows.map(mapEditionRecordToJs)));
    } catch {
        return [];
    }
}

/**
 * @param {Record<string, unknown>} r
 */
function mapEditionRecordToJs(r) {
    let parsed = {};
    try {
        parsed = distributeUploadedAssetUrls(JSON.parse(String(r.locales_json ?? r.localesJson ?? '{}')));
    } catch {
        parsed = {};
    }
    const href = String(r.href ?? '');
    let id = String(r.id ?? '');
    if (!id && href) {
        const seg = href.split('/').filter(Boolean).pop();
        id = seg || href;
    }
    return {
        href,
        imageSrc: parsed.imageSrc ?? '',
        en: parsed.en || {},
        ja: parsed.ja || {},
        id,
        productStatus: String(r.product_status ?? r.productStatus ?? ''),
        localesJson: String(r.locales_json ?? r.localesJson ?? '{}'),
        updatedAt: String(r.updated_at ?? r.updatedAt ?? ''),
    };
}

/**
 * When the home CMS block `objects-highlight` has no `objects` array, fill the grid from
 * **Products → Editions** (`listEditions`) so the same records as `/editions` can appear on `/`.
 * Shape matches `testData.objectsHighlight.objects` / `app-objects-highlight` (per-locale title as `name`, `image`, `link`).
 * @param {unknown[]} editions
 * @returns {Record<string, unknown>[]}
 */
function mapEditionsToObjectsHighlightObjects(editions) {
    if (!Array.isArray(editions)) return [];
    /** @type {Record<string, unknown>[]} */
    const out = [];
    for (const raw of editions) {
        if (!raw || typeof raw !== 'object') continue;
        const ed = /** @type {Record<string, unknown>} */ (raw);
        const status = String(ed.productStatus ?? 'active');
        if (status === 'draft') continue;
        const imageSrc = String(ed.imageSrc ?? '');
        const href = String(ed.href ?? '');
        if (!imageSrc) continue;
        const en = /** @type {Record<string, unknown>} */ (
            ed.en && typeof ed.en === 'object' && !Array.isArray(ed.en) ? ed.en : {}
        );
        const ja = /** @type {Record<string, unknown>} */ (
            ed.ja && typeof ed.ja === 'object' && !Array.isArray(ed.ja) ? ed.ja : {}
        );
        out.push({
            image: imageSrc,
            link: href,
            en: {
                name: String(en.title ?? ''),
                alt: String(en.alt ?? ''),
                credit: '',
                description: '',
                copy: '',
            },
            ja: {
                name: String(ja.title ?? ''),
                alt: String(ja.alt ?? ''),
                credit: '',
                description: '',
                copy: '',
            },
        });
        if (out.length >= 4) break;
    }
    return out;
}

function dispatchHomeObjectsHighlightRefresh() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent('fusion-content-pages-changed', { detail: { slug: 'objects-highlight' } })
    );
}

/**
 * Summaries for Studio Content tab (registry drives rows; mirrors testData when no canister row).
 * @param {{ forContentTab?: boolean }} [options] When `forContentTab` is true (default), only entries with `primaryStudioSurface === 'content'`.
 * @returns {Promise<{ slug: string, title: string, snippet: string, label: string, editorMode: 'locales' | 'full' }[]>}
 */
export async function getContentSummary(options = {}) {
    const forContentTab = options.forContentTab !== false;
    const registrySlice = forContentTab
        ? CONTENT_PAGE_REGISTRY.filter((e) => e.primaryStudioSurface === 'content')
        : CONTENT_PAGE_REGISTRY;

    const fromRegistry = (blockGetter) =>
        registrySlice.map((entry) => {
            const block = blockGetter(entry);
            return contentSummaryFromBlock(block, entry);
        });

    if (getDataSource() === 'test') {
        return fromRegistry((entry) => testData[entry.testKey]);
    }
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.listContentPages !== 'function') {
            return fromRegistry((entry) => testData[entry.testKey]);
        }
        const rows = await actor.listContentPages();
        const rowBySlug = new Map();
        if (Array.isArray(rows)) {
            for (const row of rows) {
                const slug = String(row.slug ?? '');
                if (slug) rowBySlug.set(slug, row);
            }
        }
        return registrySlice.map((entry) => {
            const row = rowBySlug.get(entry.slug);
            if (!row) {
                const block = testData[entry.testKey];
                const base = contentSummaryFromBlock(block, entry);
                return { ...base, snippet: base.snippet || '(not on canister — edit to create)' };
            }
            let title = entry.label || entry.slug;
            let snippet = '';
            try {
                const j = JSON.parse(String(row.locales_json ?? row.localesJson ?? '{}'));
                const summ = contentSummaryFromBlock(j, entry);
                title = summ.title;
                snippet = summ.snippet;
            } catch {
                /* ignore */
            }
            return {
                slug: entry.slug,
                title,
                snippet,
                label: entry.label || entry.slug,
                editorMode: entry.editorMode || 'locales',
            };
        });
    } catch {
        return fromRegistry((entry) => testData[entry.testKey]);
    }
}

/**
 * Summaries for a Studio surface tab (e.g. Home) — previews for every registry entry that includes `surface`.
 * @param {StudioSurface} surface
 * @returns {Promise<{ slug: string, title: string, snippet: string, label: string, editorMode: 'locales' | 'full' }[]>}
 */
export async function getContentSummaryForSurface(surface) {
    const allowed = new Set(getRegistryEntriesForSurface(surface).map((e) => e.slug));
    const full = await getContentSummary({ forContentTab: false });
    return full.filter((s) => allowed.has(s.slug));
}

/**
 * @param {unknown} raw
 * @returns {{ sentAt: string, subject: string, templateId: string, templateName: string }[]}
 */
export function parseApplicantEmailOutreachJson(raw) {
    if (typeof raw !== 'string' || !raw.trim()) return [];
    try {
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return [];
        return arr
            .filter((x) => x && typeof x === 'object')
            .map((x) => ({
                sentAt: String(x.sentAt ?? x.sent_at ?? ''),
                subject: String(x.subject ?? ''),
                templateId: String(x.templateId ?? x.template_id ?? ''),
                templateName: String(x.templateName ?? x.template_name ?? ''),
            }))
            .filter((x) => x.sentAt || x.subject || x.templateName);
    } catch {
        return [];
    }
}

/**
 * @returns {Record<string, { sentAt: string, subject: string, templateId: string, templateName: string }[]>}
 */
function readTestApplicantEmailOutreachMap() {
    const raw = readStudioLs(LS_APPLICANT_EMAIL_OUTREACH);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return /** @type {Record<string, object[]>} */ (raw);
}

/**
 * @param {Record<string, unknown>} map
 */
function writeTestApplicantEmailOutreachMap(map) {
    writeStudioLs(LS_APPLICANT_EMAIL_OUTREACH, map);
}

/**
 * @param {unknown} row
 * @returns {{ id: string, json: string } | null}
 */
function parseApplicantEmailOutreachStablePair(row) {
    if (Array.isArray(row) && row.length >= 2) {
        return {
            id: String(row[0] ?? '').trim(),
            json: String(row[1] ?? '[]'),
        };
    }
    if (row && typeof row === 'object') {
        const o = /** @type {Record<string, unknown>} */ (row);
        const id = String(o[0] ?? o['0'] ?? o._0_ ?? o.applicantId ?? o.applicant_id ?? '').trim();
        const json = String(o[1] ?? o['1'] ?? o._1_ ?? o.json ?? o.email_outreach_json ?? '[]');
        if (id) return { id, json };
    }
    return null;
}

/**
 * @returns {Promise<boolean>}
 */
export async function applicantEmailOutreachApiAvailable() {
    if (getDataSource() === 'test') return true;
    try {
        const actor = await getStudioAuthenticatedActor();
        return typeof actor.listApplicantEmailOutreach === 'function';
    } catch {
        return false;
    }
}

/**
 * @param {string} applicantId
 * @returns {Promise<{ sentAt: string, subject: string, templateId: string, templateName: string }[]>}
 */
export async function getApplicantEmailOutreachForStudio(applicantId) {
    const id = String(applicantId || '').trim();
    if (!id) return [];
    const map = await listApplicantEmailOutreachStudio();
    return map[id] || [];
}

/**
 * @returns {Promise<Record<string, { sentAt: string, subject: string, templateId: string, templateName: string }[]>>}
 */
export async function listApplicantEmailOutreachStudio() {
    if (getDataSource() === 'test') {
        const map = readTestApplicantEmailOutreachMap();
        /** @type {Record<string, ReturnType<typeof parseApplicantEmailOutreachJson>>} */
        const out = {};
        for (const [id, entries] of Object.entries(map)) {
            out[id] = Array.isArray(entries)
                ? entries.map((x) => ({
                      sentAt: String(x?.sentAt ?? ''),
                      subject: String(x?.subject ?? ''),
                      templateId: String(x?.templateId ?? ''),
                      templateName: String(x?.templateName ?? ''),
                  }))
                : [];
        }
        return out;
    }
    try {
        const actor = await getStudioAuthenticatedActor();
        if (typeof actor.listApplicantEmailOutreach !== 'function') return {};
        const rows = await actor.listApplicantEmailOutreach();
        if (!Array.isArray(rows)) return {};
        /** @type {Record<string, ReturnType<typeof parseApplicantEmailOutreachJson>>} */
        const out = {};
        for (const row of rows) {
            const pair = parseApplicantEmailOutreachStablePair(row);
            if (pair?.id) out[pair.id] = parseApplicantEmailOutreachJson(pair.json);
        }
        return out;
    } catch {
        return {};
    }
}

/**
 * @param {string} applicantId
 * @param {{ subject: string, templateId?: string, templateName?: string }} entry
 */
export async function appendApplicantEmailOutreachStudio(applicantId, entry) {
    const id = String(applicantId || '').trim();
    if (!id) throw new Error('applicant id required');
    const subject = String(entry?.subject ?? '').trim();
    const templateId = String(entry?.templateId ?? '').trim();
    const templateName = String(entry?.templateName ?? 'Manual').trim() || 'Manual';
    if (!subject) throw new Error('subject required');
    if (getDataSource() === 'test') {
        const map = readTestApplicantEmailOutreachMap();
        const prev = Array.isArray(map[id]) ? [...map[id]] : [];
        prev.push({
            sentAt: new Date().toISOString(),
            subject,
            templateId,
            templateName,
        });
        map[id] = prev;
        writeTestApplicantEmailOutreachMap(map);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.appendApplicantEmailOutreach !== 'function') {
        throw new Error('appendApplicantEmailOutreach missing — run dfx generate fusion-app-backend.');
    }
    await actor.appendApplicantEmailOutreach(id, subject, templateId, templateName);
}

/**
 * @param {string} applicantId
 */
export async function clearApplicantEmailOutreachStudio(applicantId) {
    const id = String(applicantId || '').trim();
    if (!id) throw new Error('applicant id required');
    if (getDataSource() === 'test') {
        const map = readTestApplicantEmailOutreachMap();
        delete map[id];
        writeTestApplicantEmailOutreachMap(map);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.clearApplicantEmailOutreach !== 'function') {
        throw new Error('clearApplicantEmailOutreach missing — run dfx generate fusion-app-backend.');
    }
    await actor.clearApplicantEmailOutreach(id);
}

/**
 * @returns {Promise<object[]>}
 */
export async function getApplicants() {
    if (getDataSource() === 'test') {
        const ls = readStudioLs(LS_APPLICANTS);
        const outreachMap = await listApplicantEmailOutreachStudio();
        if (Array.isArray(ls) && ls.length) {
            return ls.map((a) => ({
                ...a,
                emailOutreach: outreachMap[String(a.id || '')] || [],
            }));
        }
        return MOCK_APPLICANTS_TEST.map((a) => ({
            ...a,
            emailOutreach: outreachMap[String(a.id || '')] || [],
        }));
    }
    try {
        const actor = await getStudioAuthenticatedActor();
        if (typeof actor.listApplicants !== 'function') return [];
        const [rows, outreachMap] = await Promise.all([
            actor.listApplicants(),
            listApplicantEmailOutreachStudio(),
        ]);
        if (!Array.isArray(rows)) return [];
        return rows.map((r) => {
            const row = mapApplicantToJs(r);
            row.emailOutreach = outreachMap[row.id] || [];
            return row;
        });
    } catch {
        return [];
    }
}

/**
 * @param {Record<string, unknown>} r
 */
function mapApplicantToJs(r) {
    const statusRaw = r.status;
    let status = 'pending';
    if (statusRaw && typeof statusRaw === 'object') {
        const k = Object.keys(statusRaw)[0];
        if (k) status = k;
    }
    return {
        id: String(r.id ?? ''),
        programId: String(r.program_id ?? r.programId ?? ''),
        email: String(r.email ?? ''),
        fullName: String(r.full_name ?? r.fullName ?? ''),
        status,
        createdAt: String(r.created_at ?? r.createdAt ?? ''),
        payloadJson: String(r.payload_json ?? r.payloadJson ?? '{}'),
    };
}

/**
 * Dashboard aggregate counts for Studio.
 * @returns {Promise<object>}
 */
export async function getDashboardMetrics() {
    const src = getDataSource();
    const artists = testData.allArtists?.artists || [];
    const programsEn = testData.allPrograms?.programs?.en || [];
    const journals = testData.journals?.journals || [];
    const editions = testData.editions?.items || [];

    if (src === 'test') {
        const subs = readStudioLs(LS_SUBSCRIBERS);
        const apps = readStudioLs(LS_APPLICANTS);
        const subCount = Array.isArray(subs) ? subs.length : 0;
        const appCount =
            Array.isArray(apps) && apps.length ? apps.length : MOCK_APPLICANTS_TEST.length;
        return {
            dataSource: 'test',
            subscriberCount: subCount,
            artistCount: artists.length,
            programCount: programsEn.length,
            journalCount: filterPublishedJournalEntries(journals).length,
            editionCount: editions.length,
            applicantCount: appCount,
        };
    }

    let subscriberCount = 0;
    try {
        const actor = await getStudioAuthenticatedActor();
        if (typeof actor.getSubscribers === 'function') {
            const s = await actor.getSubscribers();
            subscriberCount = Array.isArray(s) ? s.length : 0;
        }
    } catch {
        /* not admin */
    }

    let artistCount = 0;
    let programCount = 0;
    let journalCount = 0;
    let editionCount = 0;
    let applicantCount = 0;
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.listArtists === 'function') {
            const a = await actor.listArtists();
            artistCount = Array.isArray(a) ? a.length : 0;
        }
        if (typeof actor.listPrograms === 'function') {
            const p = await actor.listPrograms();
            programCount = Array.isArray(p) ? p.length : 0;
        }
        if (typeof actor.listJournalEntries === 'function') {
            const j = await actor.listJournalEntries();
            journalCount = filterPublishedJournalEntries(Array.isArray(j) ? j : []).length;
        }
        if (typeof actor.listEditions === 'function') {
            const e = await actor.listEditions();
            editionCount = Array.isArray(e) ? e.length : 0;
        }
    } catch {
        /* ignore */
    }
    try {
        const actor = await getStudioAuthenticatedActor();
        if (typeof actor.listApplicants === 'function') {
            const ap = await actor.listApplicants();
            applicantCount = Array.isArray(ap) ? ap.length : 0;
        }
    } catch {
        /* ignore */
    }

    return {
        dataSource: 'live',
        subscriberCount,
        artistCount,
        programCount,
        journalCount,
        editionCount,
        applicantCount,
    };
}

/**
 * Live: Studio **Content** tab (`upsertContentPage` / `slug`) wins; else legacy `getSiteSetting` JSON.
 * @param {string} slug CMS slug (e.g. `program-hero`)
 * @param {string} siteKey Legacy site settings key (e.g. `programHeroJson`)
 * @returns {Promise<Record<string, unknown>>}
 */
async function getLiveCmsJsonOrSiteSetting(slug, siteKey) {
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.getContentPage === 'function') {
            const opt = await actor.getContentPage(slug);
            const rec = unwrapOpt(opt);
            if (rec) {
                const lj = String(rec.locales_json ?? rec.localesJson ?? '{}');
                try {
                    const j = JSON.parse(lj);
                    if (j && typeof j === 'object' && !Array.isArray(j) && Object.keys(j).length > 0) {
                        return /** @type {Record<string, unknown>} */ (distributeUploadedAssetUrls(j));
                    }
                } catch {
                    /* ignore */
                }
            }
        }
    } catch {
        /* ignore */
    }
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.getSiteSetting === 'function') {
            const opt = await actor.getSiteSetting(siteKey);
            const t = unwrapOpt(opt);
            if (t && typeof t === 'string') {
                try {
                    return /** @type {Record<string, unknown>} */ (distributeUploadedAssetUrls(JSON.parse(t)));
                } catch {
                    return {};
                }
            }
        }
    } catch {
        /* ignore */
    }
    return {};
}

/**
 * Home: program hero block (`testData.programHero` shape in test mode).
 * Live: CMS slug `program-hero` (Studio → Content → Home — program hero), else legacy `programHeroJson`.
 * @returns {Promise<object>}
 */
export async function getProgramHero() {
    if (getDataSource() === 'test') {
        return /** @type {object} */ (distributeUploadedAssetUrls(testData.programHero || {}));
    }
    return getLiveCmsJsonOrSiteSetting('program-hero', 'programHeroJson');
}

/**
 * `testData.journals` wrapper for journal hero on home.
 * @returns {Promise<object>}
 */
const LS_HOME_JOURNAL_CAROUSEL = 'fusion-home-journal-carousel';

/** @returns {Promise<{ entryIds: string[], updatedAt: string }>} */
export async function getHomeJournalCarouselPublic() {
    if (getDataSource() === 'test') {
        const cur = readStudioLs(LS_HOME_JOURNAL_CAROUSEL);
        if (cur && typeof cur === 'object' && !Array.isArray(cur)) {
            const o = /** @type {Record<string, unknown>} */ (cur);
            return {
                entryIds: Array.isArray(o.entryIds) ? o.entryIds.map(String).filter(Boolean) : [],
                updatedAt: String(o.updatedAt ?? ''),
            };
        }
        return { entryIds: [], updatedAt: '' };
    }
    try {
        const actor = await getFusionBackendActor();
        if (!actor || typeof actor.getHomeJournalCarouselPublic !== 'function') {
            return { entryIds: [], updatedAt: '' };
        }
        const cfg = await actor.getHomeJournalCarouselPublic();
        return {
            entryIds: Array.isArray(cfg?.entryIds) ? cfg.entryIds.map(String).filter(Boolean) : [],
            updatedAt: String(cfg?.updatedAt ?? ''),
        };
    } catch {
        return { entryIds: [], updatedAt: '' };
    }
}

/** @returns {Promise<{ entryIds: string[], updatedAt: string }>} */
export async function getHomeJournalCarouselStudio() {
    if (getDataSource() === 'test') {
        return getHomeJournalCarouselPublic();
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminGetHomeJournalCarousel !== 'function') {
        return getHomeJournalCarouselPublic();
    }
    const cfg = await actor.adminGetHomeJournalCarousel();
    return {
        entryIds: Array.isArray(cfg?.entryIds) ? cfg.entryIds.map(String).filter(Boolean) : [],
        updatedAt: String(cfg?.updatedAt ?? ''),
    };
}

/**
 * @param {{ entryIds: string[] }} cfg
 */
export async function setHomeJournalCarouselStudio(cfg) {
    const entryIds = (Array.isArray(cfg?.entryIds) ? cfg.entryIds : [])
        .map((id) => String(id ?? '').trim())
        .filter(Boolean)
        .slice(0, 3);
    const payload = { entryIds, updatedAt: new Date().toISOString() };
    if (getDataSource() === 'test') {
        writeStudioLs(LS_HOME_JOURNAL_CAROUSEL, payload);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fusion-home-journal-carousel-changed'));
        }
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminSetHomeJournalCarousel !== 'function') {
        throw new Error('adminSetHomeJournalCarousel unavailable — run dfx generate fusion-app-backend.');
    }
    await actor.adminSetHomeJournalCarousel(payload);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fusion-home-journal-carousel-changed'));
    }
}

export async function getJournalsHeroBlock() {
    const carouselCfg = await getHomeJournalCarouselPublic();
    if (getDataSource() === 'test') {
        const block = /** @type {object} */ (distributeUploadedAssetUrls(testData.journals || { journals: [] }));
        const published = filterPublishedJournalEntries(
            Array.isArray(block.journals) ? block.journals : []
        );
        const manual = resolveHomeJournalCarouselEntries(carouselCfg.entryIds, published);
        const journals = (
            manual.length ? manual : sortJournalEntriesNewestFirst(published)
        ).slice(0, 3);
        return { ...block, journals };
    }
    const published = filterPublishedJournalEntries(await getJournalEntries());
    const manual = resolveHomeJournalCarouselEntries(carouselCfg.entryIds, published);
    const journals = (manual.length ? manual : sortJournalEntriesNewestFirst(published)).slice(0, 3);
    return { order: 6, journals };
}

/**
 * Live: CMS `objects-highlight`, else legacy `objectsHighlightJson`.
 * If CMS JSON has no `objects` (or empty), **falls back to up to four non-draft editions** from
 * `listEditions` (same source as `/editions`) so Products → Editions can drive the home grid without
 * duplicating data under Content → Objects highlight.
 * @returns {Promise<object>}
 */
export async function getObjectsHighlight() {
    if (getDataSource() === 'test') {
        const o = testData.objectsHighlight || {};
        return /** @type {object} */ (
            distributeUploadedAssetUrls({ ...o, objects: Array.isArray(o.objects) ? o.objects : [] })
        );
    }
    const raw = await getLiveCmsJsonOrSiteSetting('objects-highlight', 'objectsHighlightJson');
    const base =
        raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : /** @type {Record<string, unknown>} */ ({});
    let objects = Array.isArray(base.objects) ? base.objects : [];
    if (objects.length === 0) {
        try {
            const editions = await getEditions();
            objects = mapEditionsToObjectsHighlightObjects(editions);
        } catch {
            objects = [];
        }
    }
    return /** @type {object} */ (distributeUploadedAssetUrls({ ...base, objects }));
}

/**
 * Live: CMS `gallery-access-cta`, else legacy `galleryAccessCtaJson`.
 * @returns {Promise<object>}
 */
export async function getGalleryAccessCta() {
    if (getDataSource() === 'test') {
        return /** @type {object} */ (distributeUploadedAssetUrls(testData.galleryAccessCta || {}));
    }
    const raw = await getLiveCmsJsonOrSiteSetting('gallery-access-cta', 'galleryAccessCtaJson');
    return raw && typeof raw === 'object' && !Array.isArray(raw)
        ? raw
        : /** @type {Record<string, unknown>} */ ({});
}

/**
 * Featured artist slice for home / artists (matches `testData.featuredArtist`).
 * @returns {Promise<object[]>}
 */
export async function getFeaturedArtists() {
    const all = await getArtists();
    return resolveFeaturedArtistsForPublic(all, getLastFeaturedMergeMetaForPublic());
}

/**
 * CSV export for subscribers (Studio Email tab). Live + admin only returns rows.
 * @returns {Promise<string>}
 */
export async function getSubscribersCsv() {
    const rows = await getSubscribers();
    if (!rows.length) return 'email,category,fullName,intent,timestamp,resendSegmentIds\n';
    const header = 'email,category,fullName,intent,timestamp,resendSegmentIds';
    const lines = rows.map((r) => {
        const aud = Array.isArray(r.audiences) && r.audiences.length ? r.audiences.join(';') : '';
        return [r.email, r.category, r.fullName ?? '', r.intent ?? '', r.timestamp, aud]
            .map((c) => `"${String(c).replace(/"/g, '""')}"`)
            .join(',');
    });
    return `${header}\n${lines.join('\n')}`;
}

/**
 * Motoko `ApplicantStatus` variant for IDL encode.
 * @param {string} status
 * @returns {Record<string, null>}
 */
export function applicantStatusToVariant(status) {
    const s = String(status || 'pending');
    const allowed = [
        'pending',
        'reviewing',
        'postInterviewReview',
        'needsInfo',
        'accepted',
        'rejected',
        'pulledOut',
        'withdrawn',
    ];
    const k = allowed.includes(s) ? s : 'pending';
    return { [k]: null };
}

/**
 * @param {string} slugOrKey
 */
function contentRegistryEntry(slugOrKey) {
    const s = String(slugOrKey || '').trim();
    return CONTENT_PAGE_REGISTRY.find((e) => e.slug === s || e.key === s);
}

/**
 * Empty CMS shape when live storage has no usable row (public site — no bundled sample).
 * @param {(typeof CONTENT_PAGE_REGISTRY)[number] | undefined} entry
 */
function emptyLiveContentBundle(entry) {
    if (!entry) return { en: [], ja: [] };
    const mode = entry.editorMode || 'locales';
    if (mode === 'full') {
        if (entry.testKey === 'events' || entry.testKey === 'audio') return [];
        return {};
    }
    if (
        entry.testKey === 'context' ||
        entry.testKey === 'artistsPage' ||
        entry.testKey === 'joinNetworkPage' ||
        entry.testKey === 'programDraw'
    ) {
        return { en: {}, ja: {} };
    }
    return { en: [], ja: [] };
}

/**
 * CMS bundle for Studio editor or public components.
 * In **live** mode, public callers (`forStudio: false`) never fall back to bundled `testData`
 * when the canister has no row — they get an empty shape so the site does not show fixture copy.
 * Studio (`forStudio: true`) still loads bundled sample for editing; use `returnMeta` to flag that state.
 *
 * @param {string} slugOrKey registry slug or key (e.g. `terms`, `applicationProcess`)
 * @param {{ forStudio?: boolean, returnMeta?: boolean }} [options]
 * @returns {Promise<unknown> | Promise<{ bundle: unknown, isLivePlaceholder: boolean }>}
 */
export async function getContentBundleForStudio(slugOrKey, options = {}) {
    const { forStudio = false, returnMeta = false } = options;
    const entry = contentRegistryEntry(slugOrKey);
    const slug =
        entry?.slug ||
        String(slugOrKey || '')
            .replace(/^\/+/, '')
            .split('/')[0] ||
        'terms';
    const testKey = entry?.testKey || 'termsAndConditions';
    const hasBundledSample = Object.prototype.hasOwnProperty.call(testData, testKey);

    /** @param {unknown} bundle @param {boolean} isLivePlaceholder */
    const wrap = (bundle, isLivePlaceholder) => {
        const distributed = distributeUploadedAssetUrls(bundle);
        if (returnMeta) {
            return { bundle: distributed, isLivePlaceholder };
        }
        return distributed;
    };

    /** Live: no canister row or unusable JSON — public gets empty; Studio gets sample when available. */
    const liveFallback = () => {
        const bundle = forStudio
            ? hasBundledSample
                ? deepClone(testData[testKey])
                : emptyLiveContentBundle(entry)
            : emptyLiveContentBundle(entry);
        const isLivePlaceholder = Boolean(forStudio && hasBundledSample);
        return wrap(bundle, isLivePlaceholder);
    };

    if (getDataSource() === 'test') {
        const stored = readStudioLs(LS_CONTENT_PREFIX + slug);
        if (stored && typeof stored.localesJson === 'string') {
            try {
                const j = JSON.parse(stored.localesJson);
                if (j && typeof j === 'object') return wrap(j, false);
            } catch {
                /* ignore */
            }
        }
        if (stored && (stored.en || stored.ja)) {
            return wrap({ en: stored.en, ja: stored.ja }, false);
        }
        const root = testData[testKey];
        const bundle = root ? deepClone(root) : emptyLiveContentBundle(entry);
        return wrap(bundle, false);
    }
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.getContentPage !== 'function') {
            return liveFallback();
        }
        const opt = await actor.getContentPage(slug);
        const rec = unwrapOpt(opt);
        if (!rec) {
            return liveFallback();
        }
        const lj = String(rec.locales_json ?? rec.localesJson ?? '{}');
        try {
            const j = JSON.parse(lj);
            if (j && typeof j === 'object') return wrap(j, false);
        } catch {
            /* ignore */
        }
    } catch {
        /* ignore */
    }
    return liveFallback();
}

/**
 * Events list for `/event/:id` and `app-event-row` (CMS `events` / `testData.events`).
 * @returns {Promise<Array>}
 */
export async function getEventsList() {
    const raw = await getContentBundleForStudio('events', { forStudio: false });
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object' && Array.isArray(/** @type {Record<string, unknown>} */ (raw).events)) {
        return /** @type {Record<string, unknown>} */ (raw).events;
    }
    return [];
}

/**
 * Staff/admin: translate English to Japanese via backend LLM (mops `llm`).
 * @param {string} englishText
 * @returns {Promise<string>}
 */
export async function studioTranslateEnToJa(englishText) {
    if (getDataSource() === 'test') {
        throw new Error('Studio translation requires Live data source (IC LLM runs on the backend canister).');
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.studioTranslateEnToJa !== 'function') {
        throw new Error('studioTranslateEnToJa missing — run dfx generate fusion-app-backend.');
    }
    const raw = await actor.studioTranslateEnToJa(englishText);
    return sanitizeLlmTextOutput(raw);
}

/**
 * Staff/admin: rewrite source text using a prompt (e.g. “New World” reinterpretation).
 * @param {string} prompt
 * @param {string} sourceText
 * @param {string} localeTag e.g. en or ja
 * @returns {Promise<string>}
 */
export async function studioReinterpretWithPrompt(prompt, sourceText, localeTag) {
    if (getDataSource() === 'test') {
        throw new Error('Studio LLM requires Live data source (IC LLM runs on the backend canister).');
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.studioReinterpretWithPrompt !== 'function') {
        throw new Error('studioReinterpretWithPrompt missing — run dfx generate fusion-app-backend.');
    }
    return actor.studioReinterpretWithPrompt(prompt, sourceText, localeTag);
}

/**
 * Linked member: translate English to Japanese via backend LLM (same model as Studio).
 * @param {string} englishText
 * @returns {Promise<string>}
 */
export async function memberTranslateEnToJa(englishText) {
    if (getDataSource() === 'test') {
        throw new Error('Member world LLM requires Live data source (IC LLM runs on the backend canister).');
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.memberTranslateEnToJa !== 'function') {
        throw new Error('memberTranslateEnToJa missing — run dfx generate fusion-app-backend.');
    }
    return actor.memberTranslateEnToJa(englishText);
}

/**
 * Linked member: translate text to a requested public profile locale.
 * Falls back through older member LLM helpers so current generated bindings do
 * not block the frontend before the new Candid method is regenerated/deployed.
 *
 * @param {string} sourceText
 * @param {'en'|'ja'} targetLocale
 * @param {string} [sourceLocaleHint]
 * @returns {Promise<string>}
 */
export async function memberTranslateText(sourceText, targetLocale, sourceLocaleHint = 'auto') {
    const text = String(sourceText ?? '').trim();
    if (!text) return '';
    const target = targetLocale === 'ja' ? 'ja' : 'en';
    const source = String(sourceLocaleHint || 'auto').slice(0, 32) || 'auto';
    if (getDataSource() === 'test') {
        return text;
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    /** @type {string} */
    let raw = '';
    if (actor && typeof actor.memberTranslateText === 'function') {
        raw = await actor.memberTranslateText(text, target, source);
    } else if (target === 'ja' && source === 'en' && actor && typeof actor.memberTranslateEnToJa === 'function') {
        raw = await actor.memberTranslateEnToJa(text);
    } else if (actor && typeof actor.memberReinterpretWithPrompt === 'function') {
        const targetLabel = target === 'ja' ? 'Japanese' : 'English';
        const sourceLabel = source === 'auto' ? 'the detected source language' : source;
        const prompt = `Translate from ${sourceLabel} to ${targetLabel}. Preserve names, URLs, line breaks, and meaning. Output only the translated text with no commentary.`;
        raw = await actor.memberReinterpretWithPrompt(prompt, text, target);
    } else {
        throw new Error('memberTranslateText missing — deploy backend and run dfx generate fusion-app-backend.');
    }
    return sanitizeLlmTextOutput(raw);
}

/**
 * Linked member: rewrite source text using a prompt (same behavior as `studioReinterpretWithPrompt`).
 * @param {string} prompt
 * @param {string} sourceText
 * @param {string} localeTag
 * @returns {Promise<string>}
 */
export async function memberReinterpretWithPrompt(prompt, sourceText, localeTag) {
    if (getDataSource() === 'test') {
        throw new Error('Member world LLM requires Live data source (IC LLM runs on the backend canister).');
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.memberReinterpretWithPrompt !== 'function') {
        throw new Error('memberReinterpretWithPrompt missing — run dfx generate fusion-app-backend.');
    }
    return actor.memberReinterpretWithPrompt(prompt, sourceText, localeTag);
}

/**
 * Merge generated EN/JA world blocks into locales (shared by Studio batch and member dashboard).
 * @param {object} artistRow — Studio row or {@link artistRowFromMyArtistRecord} shape (`locales`, `slug`, …)
 * @param {'fillEmpty' | 'overwrite'} mergeMode
 * @param {(prompt: string, source: string, localeTag: string) => Promise<string>} reinterpretFn
 * @param {(s: string) => Promise<string>} translateEnToJa
 * @returns {Promise<Record<string, unknown>>}
 */
export async function buildMergedLocalesWithGeneratedWorld(
    artistRow,
    mergeMode,
    reinterpretFn,
    translateEnToJa,
) {
    let locales = parseLocalesFromArtistRow(artistRow);
    locales = normalizeLocalesWorldForStorage(locales);
    if (!hasUsableWorldLlmSourceInput(artistRow)) {
        return locales;
    }
    const sourceJson = buildTrimmedSourceJsonForLlm(artistRow);
    const blocks = await generateEnglishAndJapaneseWorldFromSourceJson(
        sourceJson,
        reinterpretFn,
        translateEnToJa,
    );
    return applyGeneratedWorldBlocksToLocales(locales, blocks.en, blocks.ja, mergeMode, {
        mergeWorldNew: true,
        mergeWorld: false,
    });
}

/**
 * Build a Studio-compatible artist row from `getMyArtistRecord()` for LLM source + locale merge.
 * @param {Record<string, unknown> | null | undefined} rec
 * @returns {object | null}
 */
export function artistRowFromMyArtistRecord(rec) {
    if (!rec || typeof rec !== 'object') return null;
    const prof = rec.profile && typeof rec.profile === 'object' ? /** @type {Record<string, unknown>} */ (rec.profile) : {};
    const ljRaw = rec.locales_json ?? rec.localesJson;
    const ljText = Array.isArray(ljRaw) ? unwrapOpt(ljRaw) : ljRaw;
    /** @type {Record<string, unknown>} */
    let locales = { en: {}, ja: {} };
    if (typeof ljText === 'string' && ljText.trim()) {
        try {
            const p = JSON.parse(ljText);
            if (p && typeof p === 'object' && !Array.isArray(p)) {
                locales = /** @type {Record<string, unknown>} */ (distributeUploadedAssetUrls(p));
            }
        } catch {
            /* keep default */
        }
    }
    return {
        id: String(rec.id ?? ''),
        slug: String(prof.slug ?? ''),
        image: toCloudFrontAssetUrl(prof.image),
        heroProfileImage: (() => {
            const o = prof.heroProfileImage ?? prof.hero_profile_image;
            if (Array.isArray(o)) {
                return toCloudFrontAssetUrl(unwrapOpt(o));
            }
            if (o == null || o === undefined) return '';
            return toCloudFrontAssetUrl(o);
        })(),
        featuredOrder: Number(rec.featured_order ?? rec.featuredOrder ?? 0),
        visibility: String(prof.visibility ?? rec.visibility ?? 'public'),
        filter: rec.filter,
        galleryFilter: rec.gallery_filter ?? rec.galleryFilter,
        imported: rec.imported,
        accessCode: rec.access_code ?? rec.accessCode,
        locales,
    };
}

/**
 * Generate Kamauu-style `locales.*.worldNew` via LLM from English bio/discipline/story, translate to JA, upsert canister.
 * @param {object} artistRow — row from {@link getArtistsForStudio} (includes `locales`, roster fields)
 * @param {'fillEmpty' | 'overwrite'} [mergeMode]
 * @returns {Promise<void>}
 */
export async function generateAndUpsertArtistWorldFromBio(artistRow, mergeMode = 'fillEmpty') {
    if (getDataSource() === 'test') {
        throw new Error('Artist world LLM requires live data source.');
    }
    const locales = await buildMergedLocalesWithGeneratedWorld(
        artistRow,
        mergeMode,
        studioReinterpretWithPrompt,
        studioTranslateEnToJa,
    );
    const pool = collectAccessCodesFromArtists([artistRow]);
    const rec = normalizeArtistImportRow(
        {
            id: artistRow.id,
            slug: artistRow.slug,
            image: toCloudFrontAssetUrl(artistRow.image),
            heroProfileImage: toCloudFrontAssetUrl(
                /** @type {Record<string, unknown>} */ (artistRow).heroProfileImage,
            ),
            featuredOrder: artistRow.featuredOrder ?? 0,
            visibility: String(artistRow.visibility ?? 'public'),
            updatedAt: new Date().toISOString(),
            filter: artistRow.filter,
            galleryFilter: artistRow.galleryFilter,
            locales,
            imported: artistRow.imported,
            accessCode: artistRow.accessCode,
        },
        pool,
        { forceImported: false }
    );
    await bulkUpsertArtistsStudio([rec]);
}

/**
 * Member: merge generated copy into `locales.*.worldNew` (same as Studio batch), persisted with {@link updateMyArtistLocalesJson}.
 * @param {object} artistRowLike — from {@link artistRowFromMyArtistRecord}
 * @param {'fillEmpty' | 'overwrite'} [mergeMode]
 * @returns {Promise<void>}
 */
export async function generateAndUpdateMyArtistWorldFromBio(artistRowLike, mergeMode = 'fillEmpty') {
    if (getDataSource() === 'test') {
        throw new Error('Artist world LLM requires live data source.');
    }
    const locales = await buildMergedLocalesWithGeneratedWorld(
        artistRowLike,
        mergeMode,
        memberReinterpretWithPrompt,
        memberTranslateEnToJa,
    );
    const ts = new Date().toISOString();
    await updateMyArtistLocalesJson(JSON.stringify(locales), ts);
}

/**
 * Community Studio should follow config.testData only, matching Community public reads/saves.
 * @returns {Promise<object[]>}
 */
export async function getCommunityArtistsForStudio() {
    if (shouldUseCommunityTestData()) {
        return getMergedTestArtists();
    }
    try {
        const actor = await getStudioAuthenticatedActor();
        if (actor && typeof actor.listArtistRecordsForStudio === 'function') {
            const metaForMerge = await fetchFeaturedMergeMetaLive();
            _lastFeaturedMergeMeta = metaForMerge;
            const [rows, cohortMap, mediaMap, heroMap, approvedMap, audioApprovedMap, audioFullSiteMap] =
                await Promise.all([
                    actor.listArtistRecordsForStudio(),
                    fetchArtistCohortMap(actor),
                    fetchArtistMediaMap(actor),
                    fetchArtistHeroProfileMap(actor),
                    fetchArtistHeroProfileApprovedMap(actor),
                    fetchArtistAudioApprovedMap(actor),
                    fetchArtistAudioFullSiteApprovedMap(actor),
                ]);
            if (Array.isArray(rows)) {
                const mapped = rows
                    .map((r) =>
                        mergeArtistFeaturedExtension(
                            mapStudioArtistFromFullRecord(
                                r,
                                cohortMap,
                                mediaMap,
                                heroMap,
                                approvedMap,
                                audioApprovedMap,
                                audioFullSiteMap,
                            ),
                            metaForMerge,
                        ),
                    )
                    .filter((a) => String(a?.id ?? '').trim() !== '');
                await mergeMostRecentProgramsFromCanister(actor, mapped);
                await enrichArtistsWithAudioCollectionsAndApprovals(actor, mapped);
                return mapped;
            }
        }
    } catch {
        /* fall back to public artists */
    }
    return getLivePublicArtists();
}

/**
 * @param {string} slug
 * @param {unknown} bundle Full document (string patches applied in Studio — replaces stored bundle).
 */
export async function upsertContentPageStudio(slug, bundle) {
    const entry = contentRegistryEntry(slug);
    const canonicalSlug = entry?.slug || slug;
    const localesJson = JSON.stringify(bundle);
    const updatedAt = new Date().toISOString();
    if (getDataSource() === 'test') {
        writeStudioLs(LS_CONTENT_PREFIX + canonicalSlug, { localesJson, updatedAt });
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(
                new CustomEvent('fusion-content-pages-changed', { detail: { slug: canonicalSlug } })
            );
        }
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.upsertContentPage !== 'function') {
        throw new Error('upsertContentPage missing — run dfx generate fusion-app-backend.');
    }
    await actor.upsertContentPage({
        slug: canonicalSlug,
        updatedAt,
        localesJson,
    });
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(
            new CustomEvent('fusion-content-pages-changed', { detail: { slug: canonicalSlug } })
        );
    }
}

/**
 * @param {object} row
 */
export async function upsertSubscriberRow(row) {
    const email = String(row.email || '').trim();
    if (!email) throw new Error('email required');
    const category = String(row.category ?? '');
    const timestamp = String(row.timestamp || new Date().toISOString());
    const fullName = String(row.fullName ?? '');
    const intent = String(row.intent ?? '');
    if (getDataSource() === 'test') {
        const cur = readStudioLs(LS_SUBSCRIBERS) || [];
        const list = Array.isArray(cur) ? [...cur] : [];
        const i = list.findIndex((r) => String(r.email).toLowerCase() === email.toLowerCase());
        const prev = i >= 0 ? list[i] : null;
        const aud = Array.isArray(row.audiences)
            ? row.audiences
            : prev && Array.isArray(prev.audiences)
              ? prev.audiences
              : [];
        const rec = { email, category, fullName, intent, timestamp, audiences: aud };
        if (i >= 0) list[i] = rec;
        else list.push(rec);
        writeStudioLs(LS_SUBSCRIBERS, list);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.upsertSubscriber !== 'function') {
        throw new Error('upsertSubscriber missing — run dfx generate fusion-app-backend.');
    }
    await actor.upsertSubscriber(email, category, timestamp, fullName, intent);
}

/**
 * @param {string} email
 */
export async function deleteSubscriberRow(email) {
    const em = String(email || '').trim();
    if (!em) return false;
    if (getDataSource() === 'test') {
        const cur = readStudioLs(LS_SUBSCRIBERS) || [];
        const list = Array.isArray(cur)
            ? cur.filter((r) => String(r.email).toLowerCase() !== em.toLowerCase())
            : [];
        writeStudioLs(LS_SUBSCRIBERS, list);
        return true;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.deleteSubscriberByEmail !== 'function') return false;
    return actor.deleteSubscriberByEmail(em);
}

/**
 * @param {Array<{ email: string, category?: string, fullName?: string, intent?: string, timestamp?: string }>} rows
 * @returns {Promise<number>}
 */
export async function bulkUpsertSubscribersStudio(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return 0;
    if (getDataSource() === 'test') {
        const cur = readStudioLs(LS_SUBSCRIBERS) || [];
        const byEmail = new Map();
        for (const r of Array.isArray(cur) ? cur : []) {
            byEmail.set(String(r.email).toLowerCase(), r);
        }
        let n = 0;
        for (const row of rows) {
            const email = String(row.email || '').trim();
            if (!email) continue;
            byEmail.set(email.toLowerCase(), {
                email,
                category: String(row.category ?? ''),
                fullName: String(row.fullName ?? ''),
                intent: String(row.intent ?? ''),
                timestamp: String(row.timestamp || new Date().toISOString()),
                audiences: Array.isArray(row.audiences) ? row.audiences : [],
            });
            n += 1;
        }
        writeStudioLs(LS_SUBSCRIBERS, Array.from(byEmail.values()));
        return n;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.bulkUpsertSubscribers === 'function') {
        const motokoRows = rows
            .filter((r) => String(r.email || '').trim())
            .map((r) => ({
                email: String(r.email).trim(),
                category: String(r.category ?? ''),
                timestamp: String(r.timestamp || new Date().toISOString()),
                fullName: String(r.fullName ?? ''),
                intent: String(r.intent ?? ''),
                audiences: Array.isArray(r.audiences) ? r.audiences : [],
            }));
        return Number(await actor.bulkUpsertSubscribers(motokoRows));
    }
    let n = 0;
    for (const row of rows) {
        if (!String(row.email || '').trim()) continue;
        await upsertSubscriberRow(row);
        n += 1;
    }
    return n;
}

/**
 * Persist full `allPrograms` block in test mode (optional helper).
 * @param {object} block
 */
export function saveTestProgramsBlock(block) {
    if (getDataSource() !== 'test') return;
    writeStudioLs(LS_PROGRAMS_BLOCK, block);
}

/**
 * @param {object} p program row / ProgramRecord-like
 */
export async function upsertProgramStudio(p) {
    const id = String(p.id || '').trim();
    if (!id) throw new Error('program id required');
    const routeLink = String(p.routeLink || '');
    const featuredOrder = Math.max(0, Math.floor(Number(p.featuredOrder ?? 0)));
    const visibility = String(p.visibility ?? '');
    const studioStatus = String(p.studioStatus ?? 'open');
    const updatedAt = String(p.updatedAt || new Date().toISOString());
    const depositAmountDisplay = String(p.depositAmountDisplay ?? '');
    let localesJson = String(p.localesJson || '');
    if (!localesJson || localesJson === '{}') {
        const en = p.enCard || p.en || {};
        const ja = p.jaCard || p.ja || {};
        localesJson = JSON.stringify({ en, ja });
    }
    if (getDataSource() === 'test') {
        const block =
            readStudioLs(LS_PROGRAMS_BLOCK) || deepClone(testData.allPrograms) || {
                order: 2,
                programs: { en: [], ja: [] },
            };
        const enList = [...(block.programs?.en || [])];
        const jaList = [...(block.programs?.ja || [])];
        let parsedEn = {};
        let parsedJa = null;
        try {
            const parsed = JSON.parse(localesJson);
            parsedEn = parsed.en || {};
            parsedJa = parsed.ja || null;
        } catch {
            parsedEn = {};
        }
        const enCard = { ...parsedEn, id, routeLink, studioStatus, visibility, depositAmountDisplay };
        const jaCard =
            parsedJa && typeof parsedJa === 'object'
                ? { ...parsedJa, id, routeLink, visibility, depositAmountDisplay }
                : null;
        const ei = enList.findIndex((x) => x.id === id);
        if (ei >= 0) enList[ei] = enCard;
        else enList.push(enCard);
        if (jaCard) {
            const ji = jaList.findIndex((x) => x.id === id);
            if (ji >= 0) jaList[ji] = jaCard;
            else jaList.push(jaCard);
        }
        block.programs = { en: enList, ja: jaList };
        writeStudioLs(LS_PROGRAMS_BLOCK, block);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.upsertProgram !== 'function') {
        throw new Error('upsertProgram missing — run dfx generate fusion-app-backend.');
    }
    await actor.upsertProgram({
        id,
        routeLink,
        featuredOrder,
        visibility,
        studioStatus,
        updatedAt,
        depositAmountDisplay,
        localesJson,
    });
}

const LS_PROGRAM_DRAW_CONFIG = 'fusion.studio.programDrawConfig.v1';

/**
 * @typedef {{
 *   programId: string,
 *   active: boolean,
 *   totalSlots: number,
 *   updatedAt: string,
 * }} ProgramDrawConfigRow
 */

/**
 * @param {unknown} raw
 * @returns {ProgramDrawConfigRow | null}
 */
function mapProgramDrawConfig(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const r = /** @type {Record<string, unknown>} */ (raw);
    const programId = String(r.programId ?? r.program_id ?? '').trim();
    if (!programId) return null;
    const totalRaw = Number(r.totalSlots ?? r.total_slots ?? 100);
    const totalSlots = Number.isFinite(totalRaw) && totalRaw > 0 ? Math.floor(totalRaw) : 100;
    return {
        programId,
        active: Boolean(r.active),
        totalSlots,
        updatedAt: String(r.updatedAt ?? r.updated_at ?? ''),
    };
}

/**
 * @param {string} programId
 * @returns {Promise<ProgramDrawConfigRow | null>}
 */
export async function getProgramDrawConfigStudio(programId) {
    const id = String(programId || '').trim();
    if (!id) return null;
    if (getDataSource() === 'test') {
        try {
            const map = readStudioLs(LS_PROGRAM_DRAW_CONFIG) || {};
            return mapProgramDrawConfig(map[id] || null);
        } catch {
            return null;
        }
    }
    try {
        const actor = await getStudioAuthenticatedActor();
        if (!actor || typeof actor.getProgramDrawConfig !== 'function') return null;
        const opt = await actor.getProgramDrawConfig(id);
        return mapProgramDrawConfig(unwrapOpt(opt));
    } catch {
        return null;
    }
}

/** @type {Map<string, { at: number, row: ReturnType<typeof mapProgramDrawConfig> }>} */
const _drawConfigPublicCache = new Map();
const DRAW_CONFIG_PUBLIC_CACHE_MS = 10000;

/** Public (anonymous) read of program award/draw config. */
export async function getProgramDrawConfigPublic(programId) {
    const id = String(programId || '').trim();
    if (!id) return null;
    const hit = _drawConfigPublicCache.get(id);
    if (hit && Date.now() - hit.at < DRAW_CONFIG_PUBLIC_CACHE_MS) {
        return hit.row;
    }
    if (getDataSource() === 'test') {
        const row = await getProgramDrawConfigStudio(id);
        _drawConfigPublicCache.set(id, { at: Date.now(), row });
        return row;
    }
    try {
        const actor = await getFusionBackendActor();
        if (!actor || typeof actor.getProgramDrawConfig !== 'function') return null;
        const opt = await actor.getProgramDrawConfig(id);
        const row = mapProgramDrawConfig(unwrapOpt(opt));
        _drawConfigPublicCache.set(id, { at: Date.now(), row });
        return row;
    } catch {
        return null;
    }
}

/**
 * @returns {Promise<Map<string, ProgramDrawConfigRow>>}
 */
export async function listProgramDrawConfigsStudio() {
    /** @type {Map<string, ProgramDrawConfigRow>} */
    const out = new Map();
    if (getDataSource() === 'test') {
        const map = readStudioLs(LS_PROGRAM_DRAW_CONFIG) || {};
        if (map && typeof map === 'object') {
            for (const [k, v] of Object.entries(map)) {
                const row = mapProgramDrawConfig({ ...v, programId: k });
                if (row) out.set(row.programId, row);
            }
        }
        return out;
    }
    try {
        const actor = await getStudioAuthenticatedActor();
        if (!actor || typeof actor.listProgramDrawConfigs !== 'function') return out;
        const rows = await actor.listProgramDrawConfigs();
        if (!Array.isArray(rows)) return out;
        for (const pair of rows) {
            const id =
                pair?.[0] != null
                    ? String(pair[0])
                    : '';
            const row = mapProgramDrawConfig(pair?.[1] ? { ...pair[1], programId: id || pair[1].programId } : null);
            if (row) out.set(row.programId, row);
        }
    } catch {
        /* older canister */
    }
    return out;
}

/**
 * @param {{ programId: string, active?: boolean, totalSlots?: number }} cfg
 */
export async function upsertProgramDrawConfigStudio(cfg) {
    const programId = String(cfg?.programId || '').trim();
    if (!programId) throw new Error('programId required');
    const totalRaw = Number(cfg?.totalSlots);
    const totalSlots =
        Number.isFinite(totalRaw) && totalRaw > 0 ? Math.floor(totalRaw) : 100;
    const updatedAt = new Date().toISOString();
    const row = {
        programId,
        active: Boolean(cfg?.active),
        totalSlots,
        updatedAt,
    };
    if (getDataSource() === 'test') {
        const map = readStudioLs(LS_PROGRAM_DRAW_CONFIG) || {};
        map[programId] = row;
        writeStudioLs(LS_PROGRAM_DRAW_CONFIG, map);
        return row;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.upsertProgramDrawConfig !== 'function') {
        throw new Error(
            'upsertProgramDrawConfig missing — deploy fusion-app-backend and run dfx generate.',
        );
    }
    await actor.upsertProgramDrawConfig(row);
    return row;
}

/**
 * @param {string} programId
 */
export async function deleteProgramStudio(programId) {
    const id = String(programId || '').trim();
    if (!id) return false;
    if (getDataSource() === 'test') {
        const block = readStudioLs(LS_PROGRAMS_BLOCK);
        if (!block?.programs) return false;
        block.programs.en = (block.programs.en || []).filter((x) => x.id !== id);
        block.programs.ja = (block.programs.ja || []).filter((x) => x.id !== id);
        writeStudioLs(LS_PROGRAMS_BLOCK, block);
        try {
            const map = readStudioLs(LS_PROGRAM_DRAW_CONFIG) || {};
            if (map && typeof map === 'object' && id in map) {
                delete map[id];
                writeStudioLs(LS_PROGRAM_DRAW_CONFIG, map);
            }
        } catch {
            /* ignore */
        }
        return true;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.deleteProgram !== 'function') return false;
    return actor.deleteProgram(id);
}

/**
 * @param {string} programId
 * @returns {Promise<object | null>}
 */
export async function getProgramRecordForStudio(programId) {
    const id = String(programId || '').trim();
    if (!id) return null;
    if (getDataSource() === 'test') {
        const list = await getPrograms();
        const row = list.find((p) => p.id === id);
        return row || null;
    }
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.getProgram !== 'function') return null;
        const opt = await actor.getProgram(id);
        const r = unwrapOpt(opt);
        return r ? mapProgramRecordToJs(r) : null;
    } catch {
        return null;
    }
}

/**
 * @param {string} entryId
 * @returns {Promise<object | null>}
 */
export async function getJournalEntryForStudio(entryId) {
    const id = String(entryId ?? '').trim();
    if (!id) return null;
    if (getDataSource() === 'test') {
        const list = await getJournalEntries();
        return list.find((j) => String(j.id) === id) || null;
    }
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.getJournalEntry !== 'function') return null;
        const opt = await actor.getJournalEntry(id);
        const r = unwrapOpt(opt);
        return r ? mapJournalRecordToJs(r) : null;
    } catch {
        return null;
    }
}

/**
 * @param {object} j
 */
export async function upsertJournalStudio(j) {
    const id = String(j.id ?? '').trim();
    if (!id) throw new Error('journal id required');
    const link = String(j.link ?? '');
    const imageKey = String(j.imageSrc ?? j.imageKey ?? '');
    const entryStatus = String(j.entryStatus ?? 'draft');
    const updatedAt = String(j.updatedAt || new Date().toISOString());
    let localesJson = String(j.localesJson || '');
    if (!localesJson || localesJson === '{}') {
        localesJson = JSON.stringify({ en: j.en || {}, ja: j.ja || {} });
    }
    if (getDataSource() === 'test') {
        const seed = testData.journals?.journals || [];
        const cur = readStudioLs(LS_JOURNALS);
        const base = Array.isArray(cur) && cur.length ? [...cur] : [...seed];
        const list = base;
        let en = j.en || {};
        let ja = j.ja || {};
        try {
            const parsed = JSON.parse(localesJson);
            en = parsed.en || en;
            ja = parsed.ja || ja;
        } catch {
            /* keep */
        }
        const row = {
            id,
            link,
            imageSrc: imageKey,
            entryStatus,
            en,
            ja,
            updatedAt,
            localesJson,
        };
        const ix = list.findIndex((x) => String(x.id) === id);
        if (ix >= 0) list[ix] = row;
        else list.push(row);
        writeStudioLs(LS_JOURNALS, list);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.upsertJournalEntry !== 'function') {
        throw new Error('upsertJournalEntry missing — run dfx generate fusion-app-backend.');
    }
    await actor.upsertJournalEntry({
        id,
        link,
        imageKey,
        entryStatus,
        updatedAt,
        localesJson,
    });
}

/**
 * @param {string} entryId
 */
export async function deleteJournalStudio(entryId) {
    const id = String(entryId ?? '').trim();
    if (!id) return false;
    if (getDataSource() === 'test') {
        const seed = testData.journals?.journals || [];
        const cur = readStudioLs(LS_JOURNALS);
        const base = Array.isArray(cur) && cur.length ? [...cur] : [...seed];
        writeStudioLs(
            LS_JOURNALS,
            base.filter((x) => String(x.id) !== id)
        );
        return true;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.deleteJournalEntry !== 'function') return false;
    return actor.deleteJournalEntry(id);
}

/**
 * @param {object} e
 */
export async function upsertEditionStudio(e) {
    const id = String(e.id || '').trim();
    if (!id) throw new Error('edition id required');
    const href = String(e.href || '');
    const productStatus = String(e.productStatus ?? 'active');
    const updatedAt = String(e.updatedAt || new Date().toISOString());
    let localesJson = String(e.localesJson || '');
    if (!localesJson || localesJson === '{}') {
        localesJson = JSON.stringify({
            imageSrc: e.imageSrc,
            en: e.en || {},
            ja: e.ja || {},
        });
    }
    if (getDataSource() === 'test') {
        const seed = testData.editions?.items || [];
        const cur = readStudioLs(LS_EDITIONS);
        const base = Array.isArray(cur) && cur.length ? [...cur] : [...seed];
        let imageSrc = e.imageSrc || '';
        let en = e.en || {};
        let ja = e.ja || {};
        try {
            const parsed = JSON.parse(localesJson);
            imageSrc = parsed.imageSrc || imageSrc;
            en = parsed.en || en;
            ja = parsed.ja || ja;
        } catch {
            /* keep */
        }
        const row = {
            id,
            href,
            productStatus,
            imageSrc,
            en,
            ja,
            updatedAt,
            localesJson,
        };
        const ix = base.findIndex((x) => x.id === id);
        if (ix >= 0) base[ix] = row;
        else base.push(row);
        writeStudioLs(LS_EDITIONS, base);
        dispatchHomeObjectsHighlightRefresh();
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.upsertEdition !== 'function') {
        throw new Error('upsertEdition missing — run dfx generate fusion-app-backend.');
    }
    await actor.upsertEdition({
        id,
        href,
        productStatus,
        updatedAt,
        localesJson,
    });
    dispatchHomeObjectsHighlightRefresh();
}

/**
 * @param {string} editionId
 */
export async function deleteEditionStudio(editionId) {
    const id = String(editionId || '').trim();
    if (!id) return false;
    if (getDataSource() === 'test') {
        const seed = testData.editions?.items || [];
        const cur = readStudioLs(LS_EDITIONS);
        const base = Array.isArray(cur) && cur.length ? [...cur] : [...seed];
        writeStudioLs(
            LS_EDITIONS,
            base.filter((x) => x.id !== id)
        );
        dispatchHomeObjectsHighlightRefresh();
        return true;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.deleteEdition !== 'function') return false;
    const ok = await actor.deleteEdition(id);
    if (ok) dispatchHomeObjectsHighlightRefresh();
    return ok;
}

/**
 * @param {object} rec
 */
export async function upsertApplicantStudio(rec) {
    const id = String(rec.id || '').trim();
    if (!id) throw new Error('applicant id required');
    const programId = String(rec.programId || '');
    const email = String(rec.email || '');
    const fullName = String(rec.fullName || '');
    const status = String(rec.status || 'pending');
    const createdAt = String(rec.createdAt || new Date().toISOString());
    const payloadJson = String(rec.payloadJson ?? '{}');
    if (getDataSource() === 'test') {
        let cur = readStudioLs(LS_APPLICANTS);
        const base =
            Array.isArray(cur) && cur.length
                ? [...cur]
                : MOCK_APPLICANTS_TEST.map((a) => ({
                      ...a,
                      payloadJson: '{}',
                  }));
        const ix = base.findIndex((a) => a.id === id);
        const row = { id, programId, email, fullName, status, createdAt, payloadJson };
        if (ix >= 0) base[ix] = { ...base[ix], ...row };
        else base.push(row);
        writeStudioLs(LS_APPLICANTS, base);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.upsertApplicant !== 'function') {
        throw new Error('upsertApplicant missing — run dfx generate fusion-app-backend.');
    }
    await actor.upsertApplicant({
        id,
        programId,
        email,
        fullName,
        status: applicantStatusToVariant(status),
        createdAt,
        payloadJson,
    });
}

/**
 * @param {string} applicantId
 */
export async function deleteApplicantStudio(applicantId) {
    const id = String(applicantId || '').trim();
    if (!id) return false;
    if (getDataSource() === 'test') {
        let cur = readStudioLs(LS_APPLICANTS);
        if (!Array.isArray(cur) || cur.length === 0) {
            cur = MOCK_APPLICANTS_TEST.map((a) => ({
                ...a,
                payloadJson: '{}',
            }));
        }
        writeStudioLs(
            LS_APPLICANTS,
            cur.filter((a) => a.id !== id)
        );
        return true;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.deleteApplicant !== 'function') return false;
    return actor.deleteApplicant(id);
}

/**
 * Staff/admin helper for read-only applicant timeline slot-secured display.
 * @param {string} applicantId
 * @param {string} programId
 * @param {string} [payloadJson]
 */
export async function getApplicantSlotSecuredStudio(applicantId, programId, payloadJson = '') {
    const id = String(applicantId || '').trim();
    const pid = String(programId || '').trim();
    if (!id || !pid) return false;
    if (getApplicantSponsorshipMode(payloadJson) === 'full') return true;
    if (getDataSource() === 'test') {
        return getApplicantManualDepositSubmitted(payloadJson);
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.staffIsApplicantSlotSecured !== 'function') {
        return getApplicantManualDepositSubmitted(payloadJson);
    }
    return Boolean(await actor.staffIsApplicantSlotSecured(id, pid));
}

/**
 * After staff marks manual deposit on an applicant, sync linked member payment summary when possible.
 * Motoko also sets membership exempt when a principal can be resolved.
 * @param {string} applicantId
 */
export async function syncApplicantManualDepositStudio(applicantId) {
    const id = String(applicantId || '').trim();
    if (!id || getDataSource() === 'test') return;
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.staffSyncManualDepositPaymentSummary !== 'function') return;
    await actor.staffSyncManualDepositPaymentSummary(id, new Date().toISOString());
}

/**
 * Resolve member principal for an applicant (linked artist, email contact, or payment summary).
 * @param {{ id?: string, email?: string, programId?: string }} applicant
 * @param {{
 *   accounts?: Array<{ principal?: string, linkedArtistId?: string }>,
 *   contactsByPrincipal?: Map<string, { email?: string }>,
 *   financeSummaries?: Array<{ applicationId?: string, principal?: string }>,
 * }} [ctx]
 * @returns {Promise<string>}
 */
export async function resolvePrincipalForApplicantStudio(applicant, ctx = {}) {
    const appId = String(applicant?.id || '').trim();
    const email = String(applicant?.email || '')
        .trim()
        .toLowerCase();
    const artistId = appId.includes('|') ? appId.split('|')[0] : '';

    let accounts = Array.isArray(ctx.accounts) ? ctx.accounts : null;
    let contactsByPrincipal = ctx.contactsByPrincipal instanceof Map ? ctx.contactsByPrincipal : null;
    let financeSummaries = Array.isArray(ctx.financeSummaries) ? ctx.financeSummaries : null;

    if (!accounts) {
        try {
            accounts = await getAccountsForStudio();
        } catch {
            accounts = [];
        }
    }
    if (!contactsByPrincipal) {
        contactsByPrincipal = new Map();
        try {
            const rows = await adminListAccountContactsForStudio();
            for (const row of Array.isArray(rows) ? rows : []) {
                const p =
                    row?.[0] && typeof row[0]?.toText === 'function'
                        ? row[0].toText()
                        : String(row?.[0] || '').trim();
                const contact = row?.[1] && typeof row[1] === 'object' ? row[1] : {};
                if (p) {
                    contactsByPrincipal.set(p, {
                        email: String(contact.email || '').trim(),
                        firstName: String(contact.firstName || '').trim(),
                        lastName: String(contact.lastName || '').trim(),
                    });
                }
            }
        } catch {
            /* contacts optional */
        }
    }
    if (!financeSummaries) {
        try {
            const finance = await getStaffProgramPaymentsFinanceStudio();
            financeSummaries = Array.isArray(finance?.summaries) ? finance.summaries : [];
        } catch {
            financeSummaries = [];
        }
    }

    if (appId) {
        for (const s of financeSummaries) {
            if (String(s?.applicationId || '') === appId && s?.principal) {
                return String(s.principal).trim();
            }
        }
    }
    if (artistId) {
        for (const acc of accounts) {
            if (String(acc?.linkedArtistId || '').trim() === artistId && acc?.principal) {
                return String(acc.principal).trim();
            }
        }
    }
    if (email) {
        for (const [principal, contact] of contactsByPrincipal.entries()) {
            if (String(contact?.email || '').trim().toLowerCase() === email) {
                return String(principal).trim();
            }
        }
    }
    return '';
}

/**
 * Staff: set membershipExemptManual for a principal (Applicants feature).
 * @param {string} principalText
 * @param {boolean} exempt
 */
export async function staffSetMembershipExemptManualStudio(principalText, exempt = true) {
    const p = String(principalText || '').trim();
    if (!p) throw new Error('principal required');
    if (getDataSource() === 'test') return;
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffSetMembershipExemptManual !== 'function') {
        throw new Error(
            'staffSetMembershipExemptManual missing — deploy backend and run dfx generate.',
        );
    }
    const { Principal } = await import('@dfinity/principal');
    await actor.staffSetMembershipExemptManual(Principal.fromText(p), Boolean(exempt));
}

/**
 * After manual deposit: ensure Motoko summary/exempt, then cancel platform Stripe/PayPal membership.
 * @param {{ id?: string, email?: string, programId?: string }} applicant
 * @returns {Promise<{ principal: string, canceled?: object, skipped?: string }>}
 */
export async function applyConfirmedApplicantMembershipSideEffectsStudio(applicant) {
    const id = String(applicant?.id || '').trim();
    if (id) {
        await syncApplicantManualDepositStudio(id);
    }
    const principal = await resolvePrincipalForApplicantStudio(applicant);
    if (!principal) {
        return { principal: '', skipped: 'no_principal' };
    }
    // Exempt must land before Stripe/PayPal cancel sync, or Motoko may force the linked
    // roster profile to `inactive` when it records the canceled subscription.
    await staffSetMembershipExemptManualStudio(principal, true);
    const { cancelPlatformSubscriptionForProgramConfirm } = await import('./integrationApi.js');
    const canceled = await cancelPlatformSubscriptionForProgramConfirm(principal);
    return { principal, canceled };
}

/**
 * After staff changes applicant category, sync linked member payment summary when possible.
 * @param {string} applicantId
 */
export async function syncApplicantCategoryPaymentStudio(applicantId) {
    const id = String(applicantId || '').trim();
    if (!id || getDataSource() === 'test') return;
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.staffSyncApplicantCategoryPaymentSummary !== 'function') return;
    await actor.staffSyncApplicantCategoryPaymentSummary(id, new Date().toISOString());
}

const LS_STAFF_FINANCE_PAYMENTS = 'staffFinancePayments';

/**
 * Staff Finance Programs: all payment summaries, ledger rows, and plans.
 * @returns {Promise<{ summaries: object[], ledger: object[], plans: object[] }>}
 */
export async function getStaffProgramPaymentsFinanceStudio() {
    if (getDataSource() === 'test') {
        const stored = readStudioLs(LS_STAFF_FINANCE_PAYMENTS);
        if (stored && typeof stored === 'object') {
            return {
                summaries: Array.isArray(stored.summaries) ? stored.summaries : [],
                ledger: Array.isArray(stored.ledger) ? stored.ledger : [],
                plans: Array.isArray(stored.plans) ? stored.plans : [],
            };
        }
        return { summaries: [], ledger: [], plans: [] };
    }
    try {
        const actor = await getStudioAuthenticatedActor();
        if (typeof actor.staffGetProgramPaymentsFinanceJson !== 'function') {
            return { summaries: [], ledger: [], plans: [] };
        }
        const raw = await actor.staffGetProgramPaymentsFinanceJson();
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return {
            summaries: Array.isArray(parsed?.summaries) ? parsed.summaries : [],
            ledger: Array.isArray(parsed?.ledger) ? parsed.ledger : [],
            plans: Array.isArray(parsed?.plans) ? parsed.plans : [],
        };
    } catch {
        return { summaries: [], ledger: [], plans: [] };
    }
}

/**
 * @param {{ applicantId: string, programId: string, amountCents: number, feeCents: number, staffNote?: string, entryKind?: 'fee' | 'travel' }} opts
 */
export async function recordStaffManualProgramLedgerStudio(opts) {
    const applicantId = String(opts.applicantId || '').trim();
    const programId = String(opts.programId || '').trim();
    const amountCents = Math.max(0, Math.round(Number(opts.amountCents) || 0));
    const feeCents = Math.max(0, Math.round(Number(opts.feeCents) || 0));
    const staffNote = String(opts.staffNote || '').trim();
    const entryKind = opts.entryKind === 'travel' ? 'travel' : 'fee';
    const recordedAt = new Date().toISOString();
    if (!applicantId || !programId || (amountCents === 0 && feeCents === 0)) {
        throw new Error('Applicant, program, and amount or fee required');
    }
    if (getDataSource() === 'test') {
        const stored = readStudioLs(LS_STAFF_FINANCE_PAYMENTS) || {
            summaries: [],
            ledger: [],
            plans: [],
        };
        const rowIdPrefix =
            amountCents > 0 ? 'staff-manual-' : entryKind === 'travel' ? 'staff-travel-' : 'staff-manual-';
        const rowId = `${rowIdPrefix}${applicantId}-${recordedAt}`;
        const paymentType =
            amountCents > 0 ? 'staff_manual' : entryKind === 'travel' ? 'staff_travel' : 'staff_fee';
        stored.ledger = Array.isArray(stored.ledger) ? stored.ledger : [];
        stored.summaries = Array.isArray(stored.summaries) ? stored.summaries : [];
        stored.ledger.push({
            id: rowId,
            principal: 'test-principal',
            programId,
            applicationId: applicantId,
            paymentType,
            amountCents,
            feeCents,
            currency: 'usd',
            stripePaymentIntentId: '',
            stripeChargeId: '',
            stripeReceiptUrl: '',
            status: 'succeeded',
            createdAt: recordedAt,
            staffNote,
        });
        let summary = stored.summaries.find((s) => s.applicationId === applicantId);
        if (!summary) {
            summary = {
                key: `${programId}|test`,
                applicationId: applicantId,
                programId,
                depositStatus: amountCents > 0 ? 'paid' : 'due',
                totalDueCents: 500000,
                depositAmountCents: 100000,
                totalPaidCents: 0,
                outstandingCents: 500000,
                refundedCents: 0,
                ownFlight: false,
            };
            stored.summaries.push(summary);
        }
        summary.totalPaidCents = Math.max(0, Number(summary.totalPaidCents || 0) + amountCents);
        summary.outstandingCents = Math.max(
            0,
            Number(summary.totalDueCents || 500000) - summary.totalPaidCents,
        );
        if (amountCents > 0) summary.depositStatus = 'paid';
        writeStudioLs(LS_STAFF_FINANCE_PAYMENTS, stored);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.staffRecordManualProgramLedgerEntry !== 'function') {
        throw new Error('staffRecordManualProgramLedgerEntry missing — run dfx generate');
    }
    await actor.staffRecordManualProgramLedgerEntry(
        applicantId,
        programId,
        BigInt(amountCents),
        BigInt(feeCents),
        staffNote,
        recordedAt,
        entryKind,
    );
}

/**
 * Edit or soft-void a staff ledger payment row.
 * @param {{ paymentId: string, amountCents: number, feeCents: number, staffNote?: string, status?: 'succeeded' | 'voided' }} opts
 */
export async function updateStaffManualProgramLedgerStudio(opts) {
    const paymentId = String(opts.paymentId || '').trim();
    const amountCents = Math.max(0, Math.round(Number(opts.amountCents) || 0));
    const feeCents = Math.max(0, Math.round(Number(opts.feeCents) || 0));
    const staffNote = String(opts.staffNote || '').trim();
    const status = opts.status === 'voided' ? 'voided' : 'succeeded';
    if (!paymentId) throw new Error('paymentId required');
    if (status === 'succeeded' && amountCents === 0 && feeCents === 0) {
        throw new Error('amount or fee required');
    }
    if (getDataSource() === 'test') {
        const stored = readStudioLs(LS_STAFF_FINANCE_PAYMENTS) || {
            summaries: [],
            ledger: [],
            plans: [],
        };
        stored.ledger = Array.isArray(stored.ledger) ? stored.ledger : [];
        const row = stored.ledger.find((r) => String(r?.id || '') === paymentId);
        if (!row) throw new Error('Ledger row not found');
        if (String(row.paymentProvider || 'staff') !== 'staff' && String(row.paymentType || '') !== 'staff_manual') {
            throw new Error('Only staff ledger rows can be edited');
        }
        row.amountCents = amountCents;
        row.feeCents = feeCents;
        row.staffNote = staffNote || row.staffNote || '';
        row.status = status;
        writeStudioLs(LS_STAFF_FINANCE_PAYMENTS, stored);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.staffUpdateManualProgramLedgerEntry !== 'function') {
        throw new Error('staffUpdateManualProgramLedgerEntry missing — run dfx generate');
    }
    await actor.staffUpdateManualProgramLedgerEntry(
        paymentId,
        BigInt(amountCents),
        BigInt(feeCents),
        staffNote,
        status,
    );
}

/**
 * Batch-patch feeCents on existing program payment ledger rows (integration-caller).
 * @param {[string, number][]} patches Array of [paymentId, feeCents] tuples
 * @returns {Promise<number>} count of patched rows
 */
export async function integrationBatchPatchProgramPaymentFeesStudio(patches) {
    if (!Array.isArray(patches) || patches.length === 0) return 0;
    if (getDataSource() === 'test') {
        const stored = readStudioLs(LS_STAFF_FINANCE_PAYMENTS) || {
            summaries: [],
            ledger: [],
            plans: [],
        };
        stored.ledger = Array.isArray(stored.ledger) ? stored.ledger : [];
        let count = 0;
        for (const [paymentId, feeCents] of patches) {
            const row = stored.ledger.find((r) => String(r?.id || '') === paymentId);
            if (row) {
                row.feeCents = feeCents;
                count++;
            }
        }
        writeStudioLs(LS_STAFF_FINANCE_PAYMENTS, stored);
        return count;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.integrationBatchPatchProgramPaymentFees !== 'function') {
        throw new Error('integrationBatchPatchProgramPaymentFees missing — run dfx generate');
    }
    const result = await actor.integrationBatchPatchProgramPaymentFees(
        patches.map(([id, feeCents]) => [id, BigInt(feeCents)]),
    );
    return Number(result);
}

const LS_STAFF_FINANCE_PROMOTIONS = 'staffFinancePromotions';

/**
 * @returns {Promise<object[]>}
 */
export async function listFinancePromotionsStudio() {
    if (getDataSource() === 'test') {
        const stored = readStudioLs(LS_STAFF_FINANCE_PROMOTIONS);
        return Array.isArray(stored) ? stored.filter((p) => p && p.status !== 'archived') : [];
    }
    try {
        const actor = await getStudioAuthenticatedActor();
        if (typeof actor.staffListPromotionsJson !== 'function') return [];
        const raw = await actor.staffListPromotionsJson();
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/**
 * @param {{ id?: string, name: string, company?: string, startIso?: string, endIso?: string, target: 'platform' | 'program', programId?: string, costCents: number }} opts
 * @returns {Promise<string>} promotion id
 */
export async function upsertFinancePromotionStudio(opts) {
    const name = String(opts.name || '').trim();
    const company = String(opts.company || '').trim();
    const startIso = String(opts.startIso || '').trim();
    const endIso = String(opts.endIso || '').trim();
    const target = opts.target === 'program' ? 'program' : 'platform';
    const programId = String(opts.programId || '').trim();
    const costCents = Math.max(0, Math.round(Number(opts.costCents) || 0));
    const id = String(opts.id || '').trim();
    if (!name) throw new Error('Promotion name required');
    if (target === 'program' && !programId) throw new Error('Program required');
    if (getDataSource() === 'test') {
        const list = Array.isArray(readStudioLs(LS_STAFF_FINANCE_PROMOTIONS))
            ? readStudioLs(LS_STAFF_FINANCE_PROMOTIONS)
            : [];
        const now = new Date().toISOString();
        const rowId = id || `promo-test-${Date.now()}`;
        const idx = list.findIndex((p) => String(p?.id || '') === rowId);
        const row = {
            id: rowId,
            name,
            company,
            startIso,
            endIso,
            target,
            programId: target === 'program' ? programId : '',
            costCents,
            status: 'active',
            createdAt: idx >= 0 ? list[idx].createdAt || now : now,
            updatedAt: now,
            createdBy: 'test',
        };
        if (idx >= 0) list[idx] = row;
        else list.push(row);
        writeStudioLs(LS_STAFF_FINANCE_PROMOTIONS, list);
        return rowId;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.staffUpsertPromotion !== 'function') {
        throw new Error('staffUpsertPromotion missing — run dfx generate');
    }
    const newId = await actor.staffUpsertPromotion(
        id,
        name,
        company,
        startIso,
        endIso,
        target,
        programId,
        BigInt(costCents),
    );
    return String(newId || '');
}

/**
 * @param {string} promotionId
 */
export async function archiveFinancePromotionStudio(promotionId) {
    const id = String(promotionId || '').trim();
    if (!id) throw new Error('id required');
    if (getDataSource() === 'test') {
        const list = Array.isArray(readStudioLs(LS_STAFF_FINANCE_PROMOTIONS))
            ? readStudioLs(LS_STAFF_FINANCE_PROMOTIONS)
            : [];
        const row = list.find((p) => String(p?.id || '') === id);
        if (!row) throw new Error('Promotion not found');
        row.status = 'archived';
        row.updatedAt = new Date().toISOString();
        writeStudioLs(LS_STAFF_FINANCE_PROMOTIONS, list);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.staffArchivePromotion !== 'function') {
        throw new Error('staffArchivePromotion missing — run dfx generate');
    }
    await actor.staffArchivePromotion(id);
}

const LS_STAFF_PROGRAM_TEAM = 'staffProgramTeamMembers';

/**
 * @param {object} member
 */
function recomputeTeamMemberDisbursementTotalsLocal(member) {
    const owed = (Array.isArray(member.owedEntries) ? member.owedEntries : []).filter(
        (e) => e && String(e.status || 'active') !== 'voided',
    );
    const paid = (Array.isArray(member.paidEntries) ? member.paidEntries : []).filter(
        (e) => e && String(e.status || 'active') !== 'voided',
    );
    member.owedEntries = owed;
    member.paidEntries = paid;
    member.amountOwedCents = owed.reduce(
        (sum, e) => sum + Math.max(0, Math.round(Number(e.amountCents) || 0)),
        0,
    );
    member.amountPaidCents = paid.reduce(
        (sum, e) => sum + Math.max(0, Math.round(Number(e.amountCents) || 0)),
        0,
    );
}

/**
 * @param {object} member
 */
function migrateLegacyTeamDisbursementsLocal(member) {
    if (!member || typeof member !== 'object') return;
    if (!Array.isArray(member.owedEntries)) member.owedEntries = [];
    if (!Array.isArray(member.paidEntries)) member.paidEntries = [];
    const now = new Date().toISOString();
    const activeOwed = member.owedEntries.filter((e) => e && String(e.status || 'active') !== 'voided');
    const activePaid = member.paidEntries.filter((e) => e && String(e.status || 'active') !== 'voided');
    const owedCached = Math.max(0, Math.round(Number(member.amountOwedCents) || 0));
    const paidCached = Math.max(0, Math.round(Number(member.amountPaidCents) || 0));
    if (owedCached > 0 && activeOwed.length === 0) {
        member.owedEntries.push({
            id: `owed-${member.id}-legacy`,
            teamMemberId: member.id,
            programId: member.programId,
            name: 'Prior balance',
            description: 'Migrated from previous amount owed',
            dateIso: '',
            amountCents: owedCached,
            createdAt: now,
            updatedAt: now,
            createdBy: 'test',
            status: 'active',
        });
    }
    if (paidCached > 0 && activePaid.length === 0) {
        member.paidEntries.push({
            id: `paid-${member.id}-legacy`,
            teamMemberId: member.id,
            programId: member.programId,
            name: 'Prior balance',
            description: 'Migrated from previous amount paid',
            dateIso: '',
            amountCents: paidCached,
            paymentService: 'other',
            createdAt: now,
            updatedAt: now,
            createdBy: 'test',
            status: 'active',
        });
    }
    recomputeTeamMemberDisbursementTotalsLocal(member);
}

/**
 * @param {string} programId
 * @returns {Promise<object[]>}
 */
export async function listProgramTeamStudio(programId) {
    const pid = String(programId || '').trim();
    if (!pid) return [];
    if (getDataSource() === 'test') {
        const stored = readStudioLs(LS_STAFF_PROGRAM_TEAM);
        let list = Array.isArray(stored) ? stored : [];
        const activeAdmins = list.filter(
            (m) =>
                m &&
                m.programId === pid &&
                m.status !== 'removed' &&
                String(m.kind || '') === 'admin',
        );
        if (activeAdmins.length > 1) {
            const now = new Date().toISOString();
            list = list.map((m) => {
                if (
                    m &&
                    m.programId === pid &&
                    m.status !== 'removed' &&
                    String(m.kind || '') === 'admin'
                ) {
                    return { ...m, status: 'removed', updatedAt: now };
                }
                return m;
            });
        }
        for (const m of list) {
            if (m && m.programId === pid && m.status !== 'removed') {
                migrateLegacyTeamDisbursementsLocal(m);
            }
        }
        writeStudioLs(LS_STAFF_PROGRAM_TEAM, list);
        return list
            .filter((m) => m && m.programId === pid && m.status !== 'removed')
            .map((m) => ({
                ...m,
                owedEntries: Array.isArray(m.owedEntries) ? m.owedEntries : [],
                paidEntries: Array.isArray(m.paidEntries) ? m.paidEntries : [],
            }));
    }
    try {
        const actor = await getStudioAuthenticatedActor();
        if (typeof actor.staffListProgramTeamJson !== 'function') return [];
        const raw = await actor.staffListProgramTeamJson(pid);
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/**
 * @param {string} programId
 * @param {string} principalText
 * @param {{ kind?: string }} [opts] — test-mode kind hint (`admin` | `staff` | `collaborator`)
 * @returns {Promise<string>} team member id
 */
export async function addProgramTeamMemberStudio(programId, principalText, opts = {}) {
    const pid = String(programId || '').trim();
    const pt = String(principalText || '').trim();
    if (!pid || !pt) throw new Error('programId and principal required');
    if (getDataSource() === 'test') {
        const list = Array.isArray(readStudioLs(LS_STAFF_PROGRAM_TEAM))
            ? readStudioLs(LS_STAFF_PROGRAM_TEAM)
            : [];
        const rowId = `team-${pid}-${pt}`;
        const now = new Date().toISOString();
        const idx = list.findIndex((m) => String(m?.id || '') === rowId);
        const kindHint = String(opts?.kind || '').toLowerCase();
        const kind =
            kindHint === 'admin' || kindHint === 'collaborator' || kindHint === 'staff'
                ? kindHint
                : 'staff';
        if (
            kind === 'admin' &&
            list.some(
                (m) =>
                    m &&
                    m.programId === pid &&
                    m.status !== 'removed' &&
                    String(m.kind || '') === 'admin' &&
                    String(m.principalText || '') !== pt,
            )
        ) {
            throw new Error('Only one admin can be on a program team');
        }
        const row = {
            id: rowId,
            programId: pid,
            principalText: pt,
            kind,
            ticketsCents: 0,
            localTravelCents: 0,
            partner1Cents: 0,
            partner2Cents: 0,
            partner3Cents: 0,
            amountOwedCents: 0,
            amountPaidCents: 0,
            payoutPercent: 0,
            owedEntries: idx >= 0 && Array.isArray(list[idx].owedEntries) ? list[idx].owedEntries : [],
            paidEntries: idx >= 0 && Array.isArray(list[idx].paidEntries) ? list[idx].paidEntries : [],
            createdAt: idx >= 0 ? list[idx].createdAt || now : now,
            updatedAt: now,
            createdBy: 'test',
            status: 'active',
        };
        if (idx >= 0) list[idx] = { ...list[idx], ...row, status: 'active' };
        else list.push(row);
        writeStudioLs(LS_STAFF_PROGRAM_TEAM, list);
        return rowId;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.staffAddProgramTeamMember !== 'function') {
        throw new Error('staffAddProgramTeamMember missing — run dfx generate');
    }
    return String(await actor.staffAddProgramTeamMember(pid, pt));
}

/**
 * @param {{ teamMemberId: string, ticketsCents?: number, localTravelCents?: number, partner1Cents?: number, partner2Cents?: number, partner3Cents?: number }} opts
 */
export async function updateProgramTeamMemberExpensesStudio(opts) {
    const id = String(opts.teamMemberId || '').trim();
    if (!id) throw new Error('teamMemberId required');
    const ticketsCents = Math.max(0, Math.round(Number(opts.ticketsCents) || 0));
    const localTravelCents = Math.max(0, Math.round(Number(opts.localTravelCents) || 0));
    const partner1Cents = Math.max(0, Math.round(Number(opts.partner1Cents) || 0));
    const partner2Cents = Math.max(0, Math.round(Number(opts.partner2Cents) || 0));
    const partner3Cents = Math.max(0, Math.round(Number(opts.partner3Cents) || 0));
    if (getDataSource() === 'test') {
        const list = Array.isArray(readStudioLs(LS_STAFF_PROGRAM_TEAM))
            ? readStudioLs(LS_STAFF_PROGRAM_TEAM)
            : [];
        const row = list.find((m) => String(m?.id || '') === id);
        if (!row) throw new Error('Team member not found');
        Object.assign(row, {
            ticketsCents,
            localTravelCents,
            partner1Cents,
            partner2Cents,
            partner3Cents,
            updatedAt: new Date().toISOString(),
        });
        writeStudioLs(LS_STAFF_PROGRAM_TEAM, list);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.staffUpdateProgramTeamMemberExpenses !== 'function') {
        throw new Error('staffUpdateProgramTeamMemberExpenses missing — run dfx generate');
    }
    await actor.staffUpdateProgramTeamMemberExpenses(
        id,
        BigInt(ticketsCents),
        BigInt(localTravelCents),
        BigInt(partner1Cents),
        BigInt(partner2Cents),
        BigInt(partner3Cents),
    );
}

/**
 * Compatibility scalar setter (prefer upsert owed/paid entry APIs).
 * @param {{ teamMemberId: string, amountOwedCents: number, amountPaidCents: number }} opts
 */
export async function updateProgramTeamMemberDisbursementStudio(opts) {
    const id = String(opts.teamMemberId || '').trim();
    if (!id) throw new Error('teamMemberId required');
    const amountOwedCents = Math.max(0, Math.round(Number(opts.amountOwedCents) || 0));
    const amountPaidCents = Math.max(0, Math.round(Number(opts.amountPaidCents) || 0));
    if (getDataSource() === 'test') {
        const list = Array.isArray(readStudioLs(LS_STAFF_PROGRAM_TEAM))
            ? readStudioLs(LS_STAFF_PROGRAM_TEAM)
            : [];
        const row = list.find((m) => String(m?.id || '') === id);
        if (!row) throw new Error('Team member not found');
        if (!Array.isArray(row.owedEntries)) row.owedEntries = [];
        if (!Array.isArray(row.paidEntries)) row.paidEntries = [];
        const now = new Date().toISOString();
        row.owedEntries = amountOwedCents
            ? [
                  {
                      id: `owed-${id}-compat`,
                      teamMemberId: id,
                      programId: row.programId,
                      name: 'Adjusted total',
                      description: 'Set via compatibility disbursement API',
                      dateIso: '',
                      amountCents: amountOwedCents,
                      createdAt: now,
                      updatedAt: now,
                      createdBy: 'test',
                      status: 'active',
                  },
              ]
            : [];
        row.paidEntries = amountPaidCents
            ? [
                  {
                      id: `paid-${id}-compat`,
                      teamMemberId: id,
                      programId: row.programId,
                      name: 'Adjusted total',
                      description: 'Set via compatibility disbursement API',
                      dateIso: '',
                      amountCents: amountPaidCents,
                      paymentService: 'other',
                      createdAt: now,
                      updatedAt: now,
                      createdBy: 'test',
                      status: 'active',
                  },
              ]
            : [];
        recomputeTeamMemberDisbursementTotalsLocal(row);
        row.updatedAt = now;
        writeStudioLs(LS_STAFF_PROGRAM_TEAM, list);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.staffUpdateProgramTeamMemberDisbursement !== 'function') {
        throw new Error('staffUpdateProgramTeamMemberDisbursement missing — run dfx generate');
    }
    await actor.staffUpdateProgramTeamMemberDisbursement(
        id,
        BigInt(amountOwedCents),
        BigInt(amountPaidCents),
    );
}

/**
 * @param {{ teamMemberId: string, entryId?: string, name: string, description?: string, dateIso?: string, amountCents: number }} opts
 * @returns {Promise<string>} entry id
 */
export async function upsertProgramTeamOwedEntryStudio(opts) {
    const teamMemberId = String(opts.teamMemberId || '').trim();
    if (!teamMemberId) throw new Error('teamMemberId required');
    const name = String(opts.name || '').trim();
    if (!name) throw new Error('name required');
    const description = String(opts.description || '').trim();
    const dateIso = String(opts.dateIso || '').trim();
    const amountCents = Math.max(0, Math.round(Number(opts.amountCents) || 0));
    const entryId = String(opts.entryId || '').trim();
    if (getDataSource() === 'test') {
        const list = Array.isArray(readStudioLs(LS_STAFF_PROGRAM_TEAM))
            ? readStudioLs(LS_STAFF_PROGRAM_TEAM)
            : [];
        const row = list.find((m) => String(m?.id || '') === teamMemberId);
        if (!row || row.status === 'removed') throw new Error('Team member not found');
        if (!Array.isArray(row.owedEntries)) row.owedEntries = [];
        const now = new Date().toISOString();
        const id = entryId || `owed-${teamMemberId}-${Date.now()}`;
        const idx = row.owedEntries.findIndex((e) => String(e?.id || '') === id);
        const next = {
            id,
            teamMemberId,
            programId: row.programId,
            name,
            description,
            dateIso,
            amountCents,
            createdAt: idx >= 0 ? row.owedEntries[idx].createdAt || now : now,
            updatedAt: now,
            createdBy: 'test',
            status: 'active',
        };
        if (idx >= 0) row.owedEntries[idx] = next;
        else row.owedEntries.push(next);
        recomputeTeamMemberDisbursementTotalsLocal(row);
        row.updatedAt = now;
        writeStudioLs(LS_STAFF_PROGRAM_TEAM, list);
        return id;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.staffUpsertProgramTeamOwedEntry !== 'function') {
        throw new Error('staffUpsertProgramTeamOwedEntry missing — run dfx generate');
    }
    return String(
        await actor.staffUpsertProgramTeamOwedEntry(
            teamMemberId,
            entryId,
            name,
            description,
            dateIso,
            BigInt(amountCents),
        ),
    );
}

/**
 * @param {string} entryId
 */
export async function voidProgramTeamOwedEntryStudio(entryId) {
    const id = String(entryId || '').trim();
    if (!id) throw new Error('entryId required');
    if (getDataSource() === 'test') {
        const list = Array.isArray(readStudioLs(LS_STAFF_PROGRAM_TEAM))
            ? readStudioLs(LS_STAFF_PROGRAM_TEAM)
            : [];
        for (const row of list) {
            if (!row || !Array.isArray(row.owedEntries)) continue;
            const entry = row.owedEntries.find((e) => String(e?.id || '') === id);
            if (!entry) continue;
            entry.status = 'voided';
            entry.updatedAt = new Date().toISOString();
            recomputeTeamMemberDisbursementTotalsLocal(row);
            row.updatedAt = entry.updatedAt;
            writeStudioLs(LS_STAFF_PROGRAM_TEAM, list);
            return;
        }
        throw new Error('Owed entry not found');
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.staffVoidProgramTeamOwedEntry !== 'function') {
        throw new Error('staffVoidProgramTeamOwedEntry missing — run dfx generate');
    }
    await actor.staffVoidProgramTeamOwedEntry(id);
}

/**
 * @param {{ teamMemberId: string, entryId?: string, name: string, description?: string, dateIso?: string, amountCents: number, paymentService?: string, fundedBy?: 'admin' | 'program' | string }} opts
 * @returns {Promise<string>} entry id
 */
export async function upsertProgramTeamPaidEntryStudio(opts) {
    const teamMemberId = String(opts.teamMemberId || '').trim();
    if (!teamMemberId) throw new Error('teamMemberId required');
    const name = String(opts.name || '').trim();
    if (!name) throw new Error('name required');
    const description = String(opts.description || '').trim();
    const dateIso = String(opts.dateIso || '').trim();
    const amountCents = Math.max(0, Math.round(Number(opts.amountCents) || 0));
    const entryId = String(opts.entryId || '').trim();
    const serviceRaw = String(opts.paymentService || 'other').toLowerCase().trim();
    const paymentService = ['stripe', 'paypal', 'wire', 'cash', 'other'].includes(serviceRaw)
        ? serviceRaw
        : 'other';
    const fundedBy =
        String(opts.fundedBy || '').toLowerCase().trim() === 'program' ? 'program' : 'admin';
    if (getDataSource() === 'test') {
        const list = Array.isArray(readStudioLs(LS_STAFF_PROGRAM_TEAM))
            ? readStudioLs(LS_STAFF_PROGRAM_TEAM)
            : [];
        const row = list.find((m) => String(m?.id || '') === teamMemberId);
        if (!row || row.status === 'removed') throw new Error('Team member not found');
        if (!Array.isArray(row.paidEntries)) row.paidEntries = [];
        const now = new Date().toISOString();
        const id = entryId || `paid-${teamMemberId}-${Date.now()}`;
        const idx = row.paidEntries.findIndex((e) => String(e?.id || '') === id);
        const next = {
            id,
            teamMemberId,
            programId: row.programId,
            name,
            description,
            dateIso,
            amountCents,
            paymentService,
            fundedBy,
            createdAt: idx >= 0 ? row.paidEntries[idx].createdAt || now : now,
            updatedAt: now,
            createdBy: 'test',
            status: 'active',
        };
        if (idx >= 0) row.paidEntries[idx] = next;
        else row.paidEntries.push(next);
        recomputeTeamMemberDisbursementTotalsLocal(row);
        row.updatedAt = now;
        writeStudioLs(LS_STAFF_PROGRAM_TEAM, list);
        return id;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.staffUpsertProgramTeamPaidEntry !== 'function') {
        throw new Error('staffUpsertProgramTeamPaidEntry missing — run dfx generate');
    }
    return String(
        await actor.staffUpsertProgramTeamPaidEntry(
            teamMemberId,
            entryId,
            name,
            description,
            dateIso,
            BigInt(amountCents),
            paymentService,
            fundedBy,
        ),
    );
}

/**
 * @param {string} entryId
 */
export async function voidProgramTeamPaidEntryStudio(entryId) {
    const id = String(entryId || '').trim();
    if (!id) throw new Error('entryId required');
    if (getDataSource() === 'test') {
        const list = Array.isArray(readStudioLs(LS_STAFF_PROGRAM_TEAM))
            ? readStudioLs(LS_STAFF_PROGRAM_TEAM)
            : [];
        for (const row of list) {
            if (!row || !Array.isArray(row.paidEntries)) continue;
            const entry = row.paidEntries.find((e) => String(e?.id || '') === id);
            if (!entry) continue;
            entry.status = 'voided';
            entry.updatedAt = new Date().toISOString();
            recomputeTeamMemberDisbursementTotalsLocal(row);
            row.updatedAt = entry.updatedAt;
            writeStudioLs(LS_STAFF_PROGRAM_TEAM, list);
            return;
        }
        throw new Error('Paid entry not found');
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.staffVoidProgramTeamPaidEntry !== 'function') {
        throw new Error('staffVoidProgramTeamPaidEntry missing — run dfx generate');
    }
    await actor.staffVoidProgramTeamPaidEntry(id);
}

/**
 * @param {{ teamMemberId: string, payoutPercent: number }} opts
 */
export async function updateProgramTeamMemberPayoutPercentStudio(opts) {
    const id = String(opts.teamMemberId || '').trim();
    if (!id) throw new Error('teamMemberId required');
    const payoutPercent = Math.max(0, Math.min(100, Math.round(Number(opts.payoutPercent) || 0)));
    if (getDataSource() === 'test') {
        const list = Array.isArray(readStudioLs(LS_STAFF_PROGRAM_TEAM))
            ? readStudioLs(LS_STAFF_PROGRAM_TEAM)
            : [];
        const row = list.find((m) => String(m?.id || '') === id);
        if (!row) throw new Error('Team member not found');
        row.payoutPercent = payoutPercent;
        row.updatedAt = new Date().toISOString();
        writeStudioLs(LS_STAFF_PROGRAM_TEAM, list);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.staffUpdateProgramTeamMemberPayoutPercent !== 'function') {
        throw new Error('staffUpdateProgramTeamMemberPayoutPercent missing — run dfx generate');
    }
    await actor.staffUpdateProgramTeamMemberPayoutPercent(id, BigInt(payoutPercent));
}

/**
 * @param {string} teamMemberId
 */
export async function removeProgramTeamMemberStudio(teamMemberId) {
    const id = String(teamMemberId || '').trim();
    if (!id) throw new Error('teamMemberId required');
    if (getDataSource() === 'test') {
        const list = Array.isArray(readStudioLs(LS_STAFF_PROGRAM_TEAM))
            ? readStudioLs(LS_STAFF_PROGRAM_TEAM)
            : [];
        const row = list.find((m) => String(m?.id || '') === id);
        if (!row) throw new Error('Team member not found');
        row.status = 'removed';
        row.updatedAt = new Date().toISOString();
        writeStudioLs(LS_STAFF_PROGRAM_TEAM, list);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.staffRemoveProgramTeamMember !== 'function') {
        throw new Error('staffRemoveProgramTeamMember missing — run dfx generate');
    }
    await actor.staffRemoveProgramTeamMember(id);
}

/**
 * Re-link an existing ledger row (e.g. an orphaned PayPal payment) to a specific
 * applicant so it appears on their finance + member payment views.
 * @param {{ rowId: string, applicantId: string, programId: string }} opts
 */
export async function reassignProgramLedgerEntryStudio(opts) {
    const rowId = String(opts.rowId || '').trim();
    const applicantId = String(opts.applicantId || '').trim();
    const programId = String(opts.programId || '').trim();
    if (!rowId || !applicantId || !programId) {
        throw new Error('rowId, applicantId, and programId required');
    }
    if (getDataSource() === 'test') {
        const stored = readStudioLs(LS_STAFF_FINANCE_PAYMENTS) || {
            summaries: [],
            ledger: [],
            plans: [],
        };
        stored.ledger = Array.isArray(stored.ledger) ? stored.ledger : [];
        const row = stored.ledger.find((r) => String(r?.id || '') === rowId);
        if (!row) throw new Error('Ledger row not found');
        row.applicationId = applicantId;
        row.programId = programId;
        row.principal = 'test-principal';
        writeStudioLs(LS_STAFF_FINANCE_PAYMENTS, stored);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.staffReassignProgramLedgerEntry !== 'function') {
        throw new Error('staffReassignProgramLedgerEntry missing — run dfx generate');
    }
    await actor.staffReassignProgramLedgerEntry(rowId, applicantId, programId);
}

/**
 * `vec (Principal, UserAccount)` from the IDL may arrive as a JS Array or as a
 * single array-like object; each pair may be a 2-array or `{ 0, 1 }`.
 * @param {unknown} raw
 * @returns {unknown[]}
 */
function normalizeListAccountRows(raw) {
    if (raw == null) return [];
    if (typeof raw === 'string') {
        try {
            return normalizeListAccountRows(JSON.parse(raw));
        } catch {
            return [];
        }
    }
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'object') {
        const o = /** @type {Record<string, unknown>} */ (raw);
        const keys = Object.keys(o)
            .filter((k) => /^\d+$/.test(k))
            .sort((a, b) => Number(a) - Number(b));
        if (keys.length > 0) {
            return keys.map((k) => o[k]);
        }
    }
    return [];
}

/**
 * @param {unknown} pair
 * @returns {{ principal: unknown, acc: unknown } | null}
 */
function parsePrincipalAccountPair(pair) {
    if (pair == null) return null;
    if (Array.isArray(pair) && pair.length >= 2) {
        return { principal: pair[0], acc: pair[1] };
    }
    if (typeof pair === 'object') {
        const o = /** @type {Record<string, unknown>} */ (pair);
        if ('0' in o && '1' in o) {
            return { principal: o['0'], acc: o['1'] };
        }
        if (0 in o && 1 in o) {
            return { principal: o[0], acc: o[1] };
        }
    }
    return null;
}

/**
 * @param {unknown} raw
 * @returns {string}
 */
function normalizeAccountDateText(raw) {
    const text = String(raw ?? '').trim();
    if (!text || /^1970-01-01T00:00:00(?:\.000)?Z$/i.test(text)) return '';
    if (/^-?\d+$/.test(text)) {
        try {
            const n = BigInt(text);
            const abs = n < 0n ? -n : n;
            let ms;
            if (abs > 100_000_000_000_000_000n) {
                ms = Number(n / 1_000_000n);
            } else if (abs > 100_000_000_000_000n) {
                ms = Number(n / 1_000n);
            } else if (abs > 100_000_000_000n) {
                ms = Number(n);
            } else {
                ms = Number(n * 1_000n);
            }
            const d = new Date(ms);
            if (Number.isNaN(d.getTime()) || d.getUTCFullYear() <= 1971) return '';
            return d.toISOString();
        } catch {
            return '';
        }
    }
    const d = new Date(text);
    if (Number.isNaN(d.getTime()) || d.getUTCFullYear() <= 1971) return '';
    return d.toISOString();
}

/**
 * @typedef {{
 *   principal: string,
 *   role: string,
 *   status: string,
 *   linkedArtistId?: string,
 *   linkedOrgId?: string,
 *   updatedAt: string,
 *   stripeSubscriptionStatus?: string,
 *   stripeCurrentPeriodEnd?: string,
 *   stripeCustomerId?: string,
 *   stripeSubscriptionId?: string,
 *   paypalSubscriptionId?: string,
 *   paypalSubscriptionStatus?: string,
 *   paymentProvider?: string,
 *   membershipTier?: string,
 *   membershipPlanId?: string,
 *   membershipExemptManual?: boolean,
 *   trialStartedAtSec?: string,
 *   trialEndsAtSec?: string,
 *   rawAccount?: Record<string, unknown>,
 * }} StudioAccountRow
 */

/**
 * @returns {Promise<StudioAccountRow[]>}
 */
export async function getAccountsForStudio() {
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.listAccounts !== 'function') return [];
    /** @type {Map<string, { startedAtSec: number, endsAtSec: number }>} */
    const trialByPrincipal = new Map();
    if (typeof actor.adminListTrialMembershipWindows === 'function') {
        try {
            const rows = await actor.adminListTrialMembershipWindows();
            if (Array.isArray(rows)) {
                for (const row of rows) {
                    const p = row?.[0];
                    const w = row?.[1];
                    const pStr =
                        p && typeof p === 'object' && 'toText' in p && typeof p.toText === 'function'
                            ? p.toText()
                            : String(p ?? '');
                    const startedAtSec = Number(w?.startedAtSec ?? w?.started_at_sec ?? 0);
                    const endsAtSec = Number(w?.endsAtSec ?? w?.ends_at_sec ?? 0);
                    if (!pStr || !Number.isFinite(endsAtSec) || endsAtSec <= 0) continue;
                    trialByPrincipal.set(pStr, {
                        startedAtSec: Number.isFinite(startedAtSec) && startedAtSec > 0 ? startedAtSec : 0,
                        endsAtSec,
                    });
                }
            }
        } catch {
            /* older canister */
        }
    }
    /** @type {Map<string, string>} */
    const tierByPrincipal = new Map();
    if (typeof actor.adminListMembershipTiers === 'function') {
        try {
            const tierRows = await actor.adminListMembershipTiers();
            if (Array.isArray(tierRows)) {
                for (const row of tierRows) {
                    const p = row?.[0];
                    const tier = row?.[1];
                    const pStr =
                        p && typeof p === 'object' && 'toText' in p && typeof p.toText === 'function'
                            ? p.toText()
                            : String(p ?? '');
                    const t = String(tier ?? '').trim().toLowerCase();
                    if (pStr && t) tierByPrincipal.set(pStr, t);
                }
            }
        } catch {
            /* older canister — run dfx generate after deploy */
        }
    }
    /** @type {Map<string, string>} */
    const planIdByPrincipal = new Map();
    if (typeof actor.adminListMembershipPlanIds === 'function') {
        try {
            const planRows = await actor.adminListMembershipPlanIds();
            if (Array.isArray(planRows)) {
                for (const row of planRows) {
                    const p = row?.[0];
                    const planId = row?.[1];
                    const pStr =
                        p && typeof p === 'object' && 'toText' in p && typeof p.toText === 'function'
                            ? p.toText()
                            : String(p ?? '');
                    const id = String(planId ?? '').trim();
                    if (pStr && id) planIdByPrincipal.set(pStr, id);
                }
            }
        } catch {
            /* older canister */
        }
    }
    const raw = await actor.listAccounts();
    const rows = normalizeListAccountRows(raw);
    /** @type {StudioAccountRow[]} */
    const out = [];
    for (const pair of rows) {
        const parsed = parsePrincipalAccountPair(pair);
        if (!parsed) continue;
        const { principal, acc } = parsed;
        const pStr =
            principal && typeof principal === 'object' && 'toText' in principal && typeof principal.toText === 'function'
                ? principal.toText()
                : String(principal ?? '');
        if (!acc || typeof acc !== 'object') {
            out.push({
                principal: pStr,
                role: '',
                status: '',
                linkedArtistId: undefined,
                linkedOrgId: undefined,
                updatedAt: '',
                rawAccount: undefined,
            });
            continue;
        }
        const a = /** @type {Record<string, unknown>} */ (acc);
        out.push({
            principal: pStr,
            role: a.role && typeof a.role === 'object' ? Object.keys(a.role)[0] : '',
            status: a.status && typeof a.status === 'object' ? Object.keys(a.status)[0] : '',
            linkedArtistId: unwrapOpt(a.linkedArtistId ?? a.linked_artist_id),
            linkedOrgId: unwrapOpt(a.linkedOrgId ?? a.linked_org_id),
            updatedAt: normalizeAccountDateText(a.updated_at ?? a.updatedAt ?? ''),
            stripeSubscriptionStatus: unwrapOpt(a.stripeSubscriptionStatus ?? a.stripe_subscription_status),
            stripeCurrentPeriodEnd: unwrapOpt(a.stripeCurrentPeriodEnd ?? a.stripe_current_period_end),
            stripeCustomerId: unwrapOpt(a.stripeCustomerId ?? a.stripe_customer_id),
            stripeSubscriptionId: unwrapOpt(a.stripeSubscriptionId ?? a.stripe_subscription_id),
            paypalSubscriptionId: unwrapOpt(a.paypalSubscriptionId ?? a.paypal_subscription_id),
            paypalSubscriptionStatus: unwrapOpt(
                a.paypalSubscriptionStatus ?? a.paypal_subscription_status,
            ),
            paymentProvider: unwrapOpt(a.paymentProvider ?? a.payment_provider),
            membershipTier: tierByPrincipal.get(pStr) || '',
            membershipPlanId: planIdByPrincipal.get(pStr) || '',
            membershipExemptManual: Boolean(a.membershipExemptManual ?? a.membership_exempt_manual),
            trialStartedAtSec: trialByPrincipal.get(pStr)?.startedAtSec
                ? String(trialByPrincipal.get(pStr)?.startedAtSec)
                : undefined,
            trialEndsAtSec: trialByPrincipal.get(pStr)?.endsAtSec
                ? String(trialByPrincipal.get(pStr)?.endsAtSec)
                : undefined,
            rawAccount: a,
        });
    }
    return out;
}

/**
 * Admin: replace a user account row (caller must be canister admin).
 * @param {string} principalText
 * @param {Record<string, unknown>} userAccount — full `UserAccount` shape from `listAccounts`, with edits applied
 */
export async function adminUpsertUserAccountStudio(principalText, userAccount) {
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminUpsertUserAccount !== 'function') {
        throw new Error('adminUpsertUserAccount unavailable — run dfx generate fusion-app-backend');
    }
    const { Principal } = await import('@dfinity/principal');
    await actor.adminUpsertUserAccount(Principal.fromText(String(principalText || '').trim()), userAccount);
}

/**
 * Admin: move member account + membership + artist link to a new Internet Identity principal.
 * @param {string} fromPrincipalText
 * @param {string} toPrincipalText
 * @returns {Promise<{ ok: true, fromPrincipal: string, toPrincipal: string, linkedArtistId: string | null, paymentProvider: string | null } | { ok: false, code: string }>}
 */
export async function adminReconnectMemberPrincipalStudio(fromPrincipalText, toPrincipalText) {
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminReconnectMemberPrincipal !== 'function') {
        throw new Error('adminReconnectMemberPrincipal unavailable — run dfx generate fusion-app-backend');
    }
    const { Principal } = await import('@dfinity/principal');
    const fromP = Principal.fromText(String(fromPrincipalText || '').trim());
    const toP = Principal.fromText(String(toPrincipalText || '').trim());
    const raw = await actor.adminReconnectMemberPrincipal(fromP, toP);
    if (raw && typeof raw === 'object') {
        const o = /** @type {Record<string, unknown>} */ (raw);
        if ('ok' in o && o.ok && typeof o.ok === 'object') {
            const ok = /** @type {Record<string, unknown>} */ (o.ok);
            const linked = candidOptUnwrap(ok.linkedArtistId);
            const provider = candidOptUnwrap(ok.paymentProvider);
            return {
                ok: true,
                fromPrincipal: String(ok.fromPrincipal ?? ''),
                toPrincipal: String(ok.toPrincipal ?? ''),
                linkedArtistId: linked != null ? String(linked) : null,
                paymentProvider: provider != null ? String(provider) : null,
            };
        }
        const codes = [
            'samePrincipal',
            'noSourceAccount',
            'targetHasAccount',
            'targetLinkedToDifferentArtist',
            'cannotMigratePrivilegedAccount',
        ];
        for (const code of codes) {
            if (code in o) {
                return { ok: false, code };
            }
        }
    }
    return { ok: false, code: 'unknown' };
}

/**
 * Admin: generate single-use 8-digit account recovery code (7-day expiry).
 * @param {string} fromPrincipalText
 * @returns {Promise<{ code: string, expiresAtSec: number }>}
 */
export async function adminGenerateAccountRecoveryCodeStudio(fromPrincipalText) {
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminGenerateAccountRecoveryCode !== 'function') {
        throw new Error(
            'adminGenerateAccountRecoveryCode unavailable — deploy backend and run dfx generate fusion-app-backend.',
        );
    }
    const { Principal } = await import('@dfinity/principal');
    const fromP = Principal.fromText(String(fromPrincipalText || '').trim());
    const raw = await actor.adminGenerateAccountRecoveryCode(fromP);
    if (raw && typeof raw === 'object') {
        const o = /** @type {Record<string, unknown>} */ (raw);
        if ('ok' in o && o.ok && typeof o.ok === 'object') {
            const ok = /** @type {Record<string, unknown>} */ (o.ok);
            return {
                code: String(ok.code ?? ''),
                expiresAtSec: Number(ok.expiresAtSec ?? 0),
            };
        }
        const codes = ['noSourceAccount', 'cannotGenerateForPrivilegedAccount', 'allocationFailed'];
        for (const code of codes) {
            if (code in o) {
                const labels = {
                    noSourceAccount: 'No account row for this principal.',
                    cannotGenerateForPrivilegedAccount: 'Cannot generate recovery code for admin accounts.',
                    allocationFailed: 'Could not allocate a unique recovery code. Try again.',
                };
                throw new Error(labels[/** @type {keyof typeof labels} */ (code)] || code);
            }
        }
    }
    throw new Error('Unexpected response from adminGenerateAccountRecoveryCode.');
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, fromPrincipal: string, toPrincipal: string, linkedArtistId: string | null, paymentProvider: string | null } | { ok: false, code: string }}
 */
export function interpretRedeemAccountRecoveryCodeResult(raw) {
    if (raw && typeof raw === 'object') {
        const o = /** @type {Record<string, unknown>} */ (raw);
        if ('ok' in o && o.ok && typeof o.ok === 'object') {
            const ok = /** @type {Record<string, unknown>} */ (o.ok);
            const linked = candidOptUnwrap(ok.linkedArtistId);
            const provider = candidOptUnwrap(ok.paymentProvider);
            return {
                ok: true,
                fromPrincipal: String(ok.fromPrincipal ?? ''),
                toPrincipal: String(ok.toPrincipal ?? ''),
                linkedArtistId: linked != null ? String(linked) : null,
                paymentProvider: provider != null ? String(provider) : null,
            };
        }
        const codes = [
            'invalidCode',
            'expiredCode',
            'alreadyUsed',
            'callerHasAccount',
            'samePrincipal',
            'noSourceAccount',
            'targetHasAccount',
            'cannotMigratePrivilegedAccount',
        ];
        for (const code of codes) {
            if (code in o) {
                return { ok: false, code };
            }
        }
    }
    return { ok: false, code: 'unknown' };
}

/** @param {string} code */
export function memberFacingAccountRecoveryError(code) {
    const map = {
        invalidCode: 'That recovery code is not valid. Check the code and try again.',
        expiredCode: 'This recovery code has expired. Contact support for a new code.',
        alreadyUsed: 'This recovery code has already been used.',
        callerHasAccount: 'This login already has a member account.',
        samePrincipal: 'This recovery code cannot be used with this login.',
        noSourceAccount: 'The account for this recovery code no longer exists. Contact support.',
        targetHasAccount: 'This login already has a member account.',
        cannotMigratePrivilegedAccount: 'This recovery code cannot be used for this account type.',
        unknown: 'Account recovery failed. Try again or contact support.',
    };
    return map[/** @type {keyof typeof map} */ (code)] || map.unknown;
}

/**
 * Redeem admin-issued account recovery code for the signed-in Internet Identity.
 * @param {string} codeRaw
 */
export async function redeemAccountRecoveryCodeForCaller(codeRaw) {
    const code = String(codeRaw || '').replace(/\D/g, '');
    if (getDataSource() === 'test') {
        if (code.length !== 8) {
            return { ok: false, code: 'invalidCode' };
        }
        return {
            ok: true,
            fromPrincipal: 'test-from',
            toPrincipal: 'test-to',
            linkedArtistId: null,
            paymentProvider: null,
        };
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.redeemAccountRecoveryCode !== 'function') {
        throw new Error(
            'redeemAccountRecoveryCode unavailable — deploy backend and run dfx generate fusion-app-backend.',
        );
    }
    const raw = await actor.redeemAccountRecoveryCode(code);
    return interpretRedeemAccountRecoveryCodeResult(raw);
}

/**
 * @param {unknown} opt
 * @returns {unknown}
 */
function candidOptUnwrap(opt) {
    if (opt == null) return null;
    if (Array.isArray(opt)) {
        if (opt.length === 0) return null;
        return opt[0];
    }
    return opt;
}

/**
 * @param {unknown} tuples
 * @returns {Map<string, { visible: boolean, canEdit: boolean }>}
 */
function studioPermissionTuplesToMap(tuples) {
    return parseStudioPermissionMatrixTuples(tuples);
}

/**
 * @returns {Promise<Map<string, { visible: boolean, canEdit: boolean }> | null>}
 */
export async function getStudioPermissionsMatrixForCaller() {
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.getStudioPermissionsForCaller !== 'function') return null;
    const raw = await actor.getStudioPermissionsForCaller();
    const inner = candidOptUnwrap(raw);
    if (inner == null) return null;
    return mergeStudioPermissionMap(studioPermissionTuplesToMap(inner));
}

export async function isCallerAdminStudio() {
    try {
        const actor = await getStudioAuthenticatedActor();
        if (!actor || typeof actor.isCallerAdmin !== 'function') return false;
        return Boolean(await actor.isCallerAdmin());
    } catch {
        return false;
    }
}

export async function isCallerSuperStaffStudio() {
    try {
        const actor = await getStudioAuthenticatedActor();
        if (!actor || typeof actor.isCallerSuperStaff !== 'function') return false;
        return Boolean(await actor.isCallerSuperStaff());
    } catch {
        return false;
    }
}

/**
 * @returns {Promise<{ isAdmin: boolean, isSuperStaff: boolean, permissionsNavAllowed: boolean, teamNavAllowed: boolean, effectiveMatrix: Map<string, { visible: boolean, canEdit: boolean }> | null }>}
 */
export async function refreshStudioShellAccessState() {
    const [isAdmin, isSuperStaff, effectiveMatrix] = await Promise.all([
        isCallerAdminStudio(),
        isCallerSuperStaffStudio(),
        getStudioPermissionsMatrixForCaller(),
    ]);
    return {
        isAdmin,
        isSuperStaff,
        permissionsNavAllowed: isAdmin || isSuperStaff,
        teamNavAllowed: isAdmin,
        effectiveMatrix,
    };
}

/**
 * @param {string} category
 * @returns {Promise<Array<[string, { visible: boolean, canEdit: boolean }]>>}
 */
export async function adminGetStudioPermissionDefaultsStudio(category) {
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminGetStudioPermissionDefaults !== 'function') {
        throw new Error('adminGetStudioPermissionDefaults missing — run dfx generate fusion-app-backend from the project root.');
    }
    const raw = await actor.adminGetStudioPermissionDefaults(String(category || '').trim());
    if (!Array.isArray(raw)) return [];
    return /** @type {Array<[string, { visible: boolean, canEdit: boolean }]>} */ (raw);
}

/**
 * @returns {Promise<string[]>}
 */
export async function listStudioPermissionFeatureKeysStudio() {
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.listStudioPermissionFeatureKeys !== 'function') {
        return [];
    }
    const raw = await actor.listStudioPermissionFeatureKeys();
    if (!Array.isArray(raw)) return [];
    return raw.map((k) => String(k));
}

/**
 * @param {string[]} keys
 * @returns {Promise<string[]>}
 */
export async function adminAddStudioPermissionFeatureKeysStudio(keys) {
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminAddStudioPermissionFeatureKeys !== 'function') {
        throw new Error(
            'adminAddStudioPermissionFeatureKeys missing — deploy fusion-app-backend and run dfx generate fusion-app-backend.',
        );
    }
    const raw = await actor.adminAddStudioPermissionFeatureKeys(
        (Array.isArray(keys) ? keys : []).map((k) => String(k).trim()).filter(Boolean),
    );
    if (!Array.isArray(raw)) return [];
    return raw.map((k) => String(k));
}

/**
 * @returns {Promise<string[]>}
 */
export async function adminMergeDefaultStudioPermissionFeatureKeysStudio() {
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminMergeDefaultStudioPermissionFeatureKeys !== 'function') {
        throw new Error(
            'adminMergeDefaultStudioPermissionFeatureKeys missing — deploy fusion-app-backend and run dfx generate fusion-app-backend.',
        );
    }
    const raw = await actor.adminMergeDefaultStudioPermissionFeatureKeys();
    if (!Array.isArray(raw)) return [];
    return raw.map((k) => String(k));
}

/**
 * @param {string} category
 * @param {Array<[string, { visible: boolean, canEdit: boolean }]>} matrix
 */
export async function adminSetStudioPermissionDefaultsStudio(category, matrix) {
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminSetStudioPermissionDefaults !== 'function') {
        throw new Error('adminSetStudioPermissionDefaults missing — run dfx generate fusion-app-backend from the project root.');
    }
    await actor.adminSetStudioPermissionDefaults(String(category || '').trim(), matrix);
}

/**
 * @param {string} principalText
 * @returns {Promise<Array<[string, { visible: boolean, canEdit: boolean }]> | null>}
 */
export async function adminGetStudioPermissionOverrideStudio(principalText) {
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminGetStudioPermissionOverride !== 'function') {
        throw new Error('adminGetStudioPermissionOverride missing — run dfx generate fusion-app-backend from the project root.');
    }
    const { Principal } = await import('@dfinity/principal');
    const raw = await actor.adminGetStudioPermissionOverride(Principal.fromText(String(principalText || '').trim()));
    const inner = candidOptUnwrap(raw);
    if (inner == null) return null;
    return Array.isArray(inner) ? /** @type {Array<[string, { visible: boolean, canEdit: boolean }]>} */ (inner) : null;
}

/**
 * @param {string} principalText
 * @param {Array<[string, { visible: boolean, canEdit: boolean }]>} matrix
 */
export async function adminSetStudioPermissionOverrideStudio(principalText, matrix) {
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminSetStudioPermissionOverride !== 'function') {
        throw new Error('adminSetStudioPermissionOverride missing — run dfx generate fusion-app-backend from the project root.');
    }
    const { Principal } = await import('@dfinity/principal');
    await actor.adminSetStudioPermissionOverride(Principal.fromText(String(principalText || '').trim()), matrix);
}

/**
 * @param {string} principalText
 */
export async function adminClearStudioPermissionOverrideStudio(principalText) {
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminClearStudioPermissionOverride !== 'function') {
        throw new Error('adminClearStudioPermissionOverride missing — run dfx generate fusion-app-backend from the project root.');
    }
    const { Principal } = await import('@dfinity/principal');
    await actor.adminClearStudioPermissionOverride(Principal.fromText(String(principalText || '').trim()));
}

/**
 * @returns {Promise<import('@dfinity/principal').Principal[]>}
 */
export async function adminListSuperStaffStudio() {
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminListSuperStaff !== 'function') {
        throw new Error('adminListSuperStaff missing — run dfx generate fusion-app-backend from the project root.');
    }
    return await actor.adminListSuperStaff();
}

/**
 * @param {string} principalText
 */
export async function adminAddSuperStaffStudio(principalText) {
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminAddSuperStaff !== 'function') {
        throw new Error('adminAddSuperStaff missing — run dfx generate fusion-app-backend from the project root.');
    }
    const { Principal } = await import('@dfinity/principal');
    await actor.adminAddSuperStaff(Principal.fromText(String(principalText || '').trim()));
}

/**
 * @param {string} principalText
 */
export async function adminRemoveSuperStaffStudio(principalText) {
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.adminRemoveSuperStaff !== 'function') {
        throw new Error('adminRemoveSuperStaff missing — run dfx generate fusion-app-backend from the project root.');
    }
    const { Principal } = await import('@dfinity/principal');
    await actor.adminRemoveSuperStaff(Principal.fromText(String(principalText || '').trim()));
}

const LS_STAFF_SCHEDULE_EVENTS = 'staffScheduleEvents';

/**
 * Normalize a schedule event row from canister JSON or local storage.
 * @param {any} raw
 * @returns {object | null}
 */
function normalizeScheduleEventRow(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = String(raw.id || '').trim();
    if (!id) return null;
    const assignedStaff = Array.isArray(raw.assignedStaff)
        ? raw.assignedStaff
              .map((s) => ({
                  id: String(s?.id || '').trim(),
                  name: String(s?.name || '').trim(),
                  initials: String(s?.initials || '').trim(),
              }))
              .filter((s) => s.id && s.name)
        : [];
    const participantIds = Array.isArray(raw.participantIds)
        ? raw.participantIds.map((x) => String(x || '').trim()).filter(Boolean)
        : [];
    const activity = Array.isArray(raw.activity)
        ? raw.activity
              .map((a) => ({
                  id: String(a?.id || '').trim(),
                  at: String(a?.at || '').trim(),
                  text: String(a?.text || '').trim(),
              }))
              .filter((a) => a.id && a.at && a.text)
        : [];
    const reminderRaw = raw.reminderMinutes;
    const reminderMinutes =
        reminderRaw === null || reminderRaw === undefined || reminderRaw === ''
            ? null
            : Math.max(0, Math.round(Number(reminderRaw) || 0)) || null;
    return {
        id,
        title: String(raw.title || '').trim(),
        date: String(raw.date || '').trim(),
        startTime: String(raw.startTime || '09:00').trim(),
        endTime: String(raw.endTime || '10:00').trim(),
        allDay: Boolean(raw.allDay),
        timezone: String(raw.timezone || 'New York · EDT').trim(),
        programId: String(raw.programId || '').trim(),
        programName: String(raw.programName || '').trim(),
        team: String(raw.team || '').trim(),
        locationId: String(raw.locationId || '').trim(),
        locationName: String(raw.locationName || '').trim(),
        assignedStaff,
        participantIds,
        participantCount: Math.max(0, Math.round(Number(raw.participantCount) || 0)),
        notes: String(raw.notes || ''),
        reminderMinutes,
        reminderSentAt: String(raw.reminderSentAt || '').trim() || '',
        status: String(raw.status || 'confirmed').trim(),
        color: String(raw.color || 'sage').trim(),
        relationKind: String(raw.relationKind || 'program').trim() || 'program',
        relationProgramId: String(raw.relationProgramId || raw.programId || '').trim(),
        eventKind: String(raw.eventKind || 'standard').trim() || 'standard',
        imageUrl: String(raw.imageUrl || '').trim(),
        publicOnSite: Boolean(raw.publicOnSite),
        importance: normalizeScheduleImportance(raw.importance),
        acceptRsvp: Boolean(raw.acceptRsvp),
        availability: clampScheduleAvailability(raw.availability, Boolean(raw.acceptRsvp)),
        rsvpIds: normalizeScheduleRsvpIds(raw.rsvpIds),
        rsvpCount:
            Math.max(0, Math.round(Number(raw.rsvpCount) || 0)) ||
            normalizeScheduleRsvpIds(raw.rsvpIds).length,
        myRsvp: Boolean(raw.myRsvp),
        conflicts: Array.isArray(raw.conflicts) ? raw.conflicts : [],
        createdAt: String(raw.createdAt || ''),
        updatedAt: String(raw.updatedAt || ''),
        version: Math.max(1, Math.round(Number(raw.version) || 1)),
        createdBy: String(raw.createdBy || ''),
        activity,
    };
}

/**
 * @returns {Promise<object[]>}
 */
export async function listScheduleEventsStudio() {
    if (getDataSource() === 'test') {
        const stored = readStudioLs(LS_STAFF_SCHEDULE_EVENTS);
        return Array.isArray(stored)
            ? stored.map(normalizeScheduleEventRow).filter(Boolean)
            : [];
    }
    try {
        const actor = await getStudioAuthenticatedActor();
        if (!actor || typeof actor.staffListScheduleEventsJson !== 'function') {
            throw new Error(
                'Schedule list is unavailable. Redeploy the frontend after generating canister bindings.',
            );
        }
        const raw = await actor.staffListScheduleEventsJson();
        const parsed = parseCanisterJsonText(raw);
        if (!Array.isArray(parsed)) {
            throw new Error('Schedule list returned unexpected data.');
        }
        return parsed.map(normalizeScheduleEventRow).filter(Boolean);
    } catch (err) {
        throw new Error(formatScheduleCanisterError(err));
    }
}

/**
 * @param {string} id
 * @returns {Promise<object | null>}
 */
export async function getScheduleEventStudio(id) {
    const eventId = String(id || '').trim();
    if (!eventId) return null;
    if (getDataSource() === 'test') {
        const list = await listScheduleEventsStudio();
        return list.find((e) => e.id === eventId) || null;
    }
    try {
        const actor = await getStudioAuthenticatedActor();
        if (!actor || typeof actor.staffGetScheduleEventJson !== 'function') {
            throw new Error('staffGetScheduleEventJson missing — run dfx generate');
        }
        const raw = await actor.staffGetScheduleEventJson(eventId);
        const parsed = parseCanisterJsonText(raw);
        return normalizeScheduleEventRow(parsed);
    } catch (err) {
        const msg = String(err?.message || err || '');
        if (/not found/i.test(msg)) return null;
        throw err;
    }
}

/**
 * @param {object} opts
 * @returns {Promise<string>} event id
 */
export async function upsertScheduleEventStudio(opts) {
    const title = String(opts?.title || '').trim();
    const date = String(opts?.date || '').trim();
    const startTime = String(opts?.startTime || '09:00').trim();
    const endTime = String(opts?.endTime || '10:00').trim();
    const allDay = Boolean(opts?.allDay);
    const timezone = String(opts?.timezone || 'New York · EDT').trim();
    const programId = String(opts?.programId || '').trim();
    const programName = String(opts?.programName || '').trim();
    const team = String(opts?.team || '').trim();
    const locationId = String(opts?.locationId || '').trim();
    const locationName = String(opts?.locationName || '').trim();
    const notes = String(opts?.notes || '');
    const status = String(opts?.status || 'confirmed').trim();
    const color = String(opts?.color || 'sage').trim();
    const relationKind = String(opts?.relationKind || 'program').trim() || 'program';
    const relationProgramId = String(
        opts?.relationProgramId || (relationKind === 'program' ? opts?.programId : '') || '',
    ).trim();
    const eventKind = String(opts?.eventKind || 'standard').trim() || 'standard';
    const imageUrl = String(opts?.imageUrl || '').trim();
    const publicOnSite = Boolean(opts?.publicOnSite);
    const importance = normalizeScheduleImportance(opts?.importance);
    const acceptRsvp = Boolean(opts?.acceptRsvp);
    const availability = clampScheduleAvailability(opts?.availability, acceptRsvp);
    const id = String(opts?.id || '').trim();
    const expectedVersion = Math.max(0, Math.round(Number(opts?.expectedVersion) || 0));
    const participantCount = Math.max(0, Math.round(Number(opts?.participantCount) || 0));
    const reminderMinutes =
        opts?.reminderMinutes === null || opts?.reminderMinutes === undefined || opts?.reminderMinutes === ''
            ? 0
            : Math.max(0, Math.round(Number(opts.reminderMinutes) || 0));
    const assignedStaff = Array.isArray(opts?.assignedStaff)
        ? opts.assignedStaff.map((s) => ({
              id: String(s?.id || '').trim(),
              name: String(s?.name || '').trim(),
              initials: String(s?.initials || '').trim() || '??',
          }))
        : [];
    const participantIds = Array.isArray(opts?.participantIds)
        ? opts.participantIds.map((x) => String(x || '').trim()).filter(Boolean)
        : [];
    if (!title) throw new Error('Title required');
    if (!date) throw new Error('Date required');
    if (!programId) throw new Error('Program required');
    if (!locationId) throw new Error('Location required');
    if (!timezone) throw new Error('Timezone required');
    if (!relationKind) throw new Error('Relation required');
    if (relationKind === 'program' && !relationProgramId) throw new Error('Relation program required');

    if (getDataSource() === 'test') {
        const list = await listScheduleEventsStudio();
        const now = new Date().toISOString();
        if (id) {
            const idx = list.findIndex((e) => e.id === id);
            if (idx < 0) throw new Error('Event not found');
            const prev = list[idx];
            if (Number(prev.version) !== expectedVersion) {
                throw new Error('version conflict');
            }
            const next = {
                ...prev,
                title,
                date,
                startTime,
                endTime,
                allDay,
                timezone,
                programId,
                programName,
                team,
                locationId,
                locationName,
                assignedStaff,
                participantIds,
                participantCount,
                notes,
                reminderMinutes: reminderMinutes || null,
                status,
                color,
                relationKind,
                relationProgramId: relationKind === 'program' ? relationProgramId || programId : '',
                eventKind,
                imageUrl,
                publicOnSite,
                importance,
                acceptRsvp,
                availability,
                rsvpIds: normalizeScheduleRsvpIds(prev.rsvpIds),
                rsvpCount: normalizeScheduleRsvpIds(prev.rsvpIds).length,
                myRsvp: Boolean(prev.myRsvp),
                updatedAt: now,
                version: Number(prev.version) + 1,
                activity: [
                    { id: `act-${now}`, at: now, text: 'Event updated' },
                    ...(Array.isArray(prev.activity) ? prev.activity : []),
                ],
            };
            list[idx] = next;
            writeStudioLs(LS_STAFF_SCHEDULE_EVENTS, list);
            return id;
        }
        const newId = `evt-test-${Date.now().toString(36)}`;
        list.push({
            id: newId,
            title,
            date,
            startTime,
            endTime,
            allDay,
            timezone,
            programId,
            programName,
            team,
            locationId,
            locationName,
            assignedStaff,
            participantIds,
            participantCount,
            notes,
            reminderMinutes: reminderMinutes || null,
            status,
            color,
            relationKind,
            relationProgramId: relationKind === 'program' ? relationProgramId || programId : '',
            eventKind,
            imageUrl,
            publicOnSite,
            importance,
            acceptRsvp,
            availability,
            rsvpIds: [],
            rsvpCount: 0,
            myRsvp: false,
            conflicts: [],
            createdAt: now,
            updatedAt: now,
            version: 1,
            createdBy: 'test',
            activity: [{ id: `act-${now}`, at: now, text: 'Event created' }],
        });
        writeStudioLs(LS_STAFF_SCHEDULE_EVENTS, list);
        return newId;
    }

    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffUpsertScheduleEvent !== 'function') {
        throw new Error('staffUpsertScheduleEvent missing — run dfx generate fusion-app-backend from the project root.');
    }
    // Motoko signature includes imageUrl + publicOnSite — regenerate bindings after backend deploy:
    // `dfx generate fusion-app-backend` (or frontend `prebuild`).
    try {
        return String(
            await actor.staffUpsertScheduleEvent(
                id,
                BigInt(expectedVersion),
                title,
                date,
                startTime,
                endTime,
                allDay,
                timezone,
                programId,
                programName,
                team,
                locationId,
                locationName,
                assignedStaff,
                participantIds,
                BigInt(participantCount),
                notes,
                BigInt(reminderMinutes),
                status,
                color,
                relationKind,
                relationKind === 'program' ? relationProgramId || programId : '',
                eventKind,
                imageUrl,
                publicOnSite,
                importance,
                acceptRsvp,
                BigInt(availability),
            ),
        );
    } catch (err) {
        throw new Error(formatScheduleCanisterError(err));
    }
}

/**
 * @param {string} id
 */
export async function deleteScheduleEventStudio(id) {
    const eventId = String(id || '').trim();
    if (!eventId) throw new Error('id required');
    if (getDataSource() === 'test') {
        const list = (await listScheduleEventsStudio()).filter((e) => e.id !== eventId);
        writeStudioLs(LS_STAFF_SCHEDULE_EVENTS, list);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffDeleteScheduleEvent !== 'function') {
        throw new Error('staffDeleteScheduleEvent missing — run dfx generate fusion-app-backend from the project root.');
    }
    try {
        await actor.staffDeleteScheduleEvent(eventId);
    } catch (err) {
        throw new Error(formatScheduleCanisterError(err));
    }
}

/**
 * @param {string} id
 * @returns {Promise<string>} new event id
 */
export async function duplicateScheduleEventStudio(id) {
    const eventId = String(id || '').trim();
    if (!eventId) throw new Error('id required');
    if (getDataSource() === 'test') {
        const src = await getScheduleEventStudio(eventId);
        if (!src) throw new Error('Event not found');
        return upsertScheduleEventStudio({
            ...src,
            id: '',
            expectedVersion: 0,
            title: `${src.title} (copy)`,
            status: 'draft',
            // Copy flier; do not auto-publish the duplicate.
            imageUrl: String(src.imageUrl || '').trim(),
            publicOnSite: false,
            rsvpIds: [],
            rsvpCount: 0,
            myRsvp: false,
        });
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffDuplicateScheduleEvent !== 'function') {
        throw new Error(
            'staffDuplicateScheduleEvent missing — run dfx generate fusion-app-backend from the project root.',
        );
    }
    return String(await actor.staffDuplicateScheduleEvent(eventId));
}

/**
 * Retired: demo calendar seeding is disabled. Always returns 0.
 * @returns {Promise<number>}
 */
export async function seedScheduleDemoIfEmptyStudio() {
    return 0;
}

const LS_STAFF_SCHEDULE_LOCATIONS = 'staffScheduleLocations';

/**
 * @param {any} raw
 * @returns {{ id: string, name: string } | null}
 */
function normalizeScheduleLocationRow(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = String(raw.id || '').trim();
    const name = String(raw.name || '').trim();
    if (!id || !name) return null;
    if (String(raw.status || 'active') === 'archived') return null;
    return { id, name };
}

/**
 * @returns {Promise<{ id: string, name: string }[]>}
 */
export async function listScheduleLocationsStudio() {
    if (getDataSource() === 'test') {
        const stored = readStudioLs(LS_STAFF_SCHEDULE_LOCATIONS);
        if (Array.isArray(stored) && stored.length) {
            return stored.map(normalizeScheduleLocationRow).filter(Boolean);
        }
        return [];
    }
    try {
        const actor = await getStudioAuthenticatedActor();
        if (!actor || typeof actor.staffListScheduleLocationsJson !== 'function') {
            throw new Error(
                'Schedule locations are unavailable. Redeploy the frontend after generating canister bindings.',
            );
        }
        const raw = await actor.staffListScheduleLocationsJson();
        const parsed = parseCanisterJsonText(raw);
        if (!Array.isArray(parsed)) {
            throw new Error('Schedule locations returned unexpected data.');
        }
        return parsed.map(normalizeScheduleLocationRow).filter(Boolean);
    } catch (err) {
        throw new Error(formatScheduleCanisterError(err));
    }
}

/**
 * Authenticated member location catalog (no staff gate).
 * @returns {Promise<{ id: string, name: string }[]>}
 */
export async function listScheduleLocationsMember() {
    if (getDataSource() === 'test') {
        return listScheduleLocationsStudio();
    }
    try {
        const actor = await getStudioAuthenticatedActor();
        if (!actor || typeof actor.memberListScheduleLocationsJson !== 'function') {
            // Until dfx generate: fall back to staff list when the caller is staff.
            return listScheduleLocationsStudio();
        }
        const raw = await actor.memberListScheduleLocationsJson();
        const parsed = parseCanisterJsonText(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map(normalizeScheduleLocationRow).filter(Boolean);
    } catch {
        return [];
    }
}

/**
 * @param {{ id?: string, name: string }} opts
 * @returns {Promise<string>}
 */
export async function upsertScheduleLocationStudio(opts) {
    const name = String(opts?.name || '').trim();
    const id = String(opts?.id || '').trim();
    if (!name) throw new Error('Location name required');
    if (getDataSource() === 'test') {
        const list = await listScheduleLocationsStudio();
        if (id) {
            const idx = list.findIndex((l) => l.id === id);
            if (idx < 0) throw new Error('Location not found');
            list[idx] = { id, name };
            writeStudioLs(LS_STAFF_SCHEDULE_LOCATIONS, list);
            return id;
        }
        const newId = `loc-test-${Date.now().toString(36)}`;
        list.push({ id: newId, name });
        writeStudioLs(LS_STAFF_SCHEDULE_LOCATIONS, list);
        return newId;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffUpsertScheduleLocation !== 'function') {
        throw new Error(
            'staffUpsertScheduleLocation missing — run dfx generate fusion-app-backend from the project root.',
        );
    }
    return String(await actor.staffUpsertScheduleLocation(id, name));
}

/**
 * @param {string} id
 */
export async function deleteScheduleLocationStudio(id) {
    const locationId = String(id || '').trim();
    if (!locationId) throw new Error('id required');
    if (getDataSource() === 'test') {
        const list = (await listScheduleLocationsStudio()).filter((l) => l.id !== locationId);
        writeStudioLs(LS_STAFF_SCHEDULE_LOCATIONS, list);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffDeleteScheduleLocation !== 'function') {
        throw new Error(
            'staffDeleteScheduleLocation missing — run dfx generate fusion-app-backend from the project root.',
        );
    }
    await actor.staffDeleteScheduleLocation(locationId);
}

/**
 * Retired: dummy location seeding disabled. Always returns 0.
 * @returns {Promise<number>}
 */
export async function seedScheduleLocationsIfEmptyStudio() {
    return 0;
}

/**
 * @param {string} id
 * @param {string} [recipientSummary]
 * @returns {Promise<string>} reminderSentAt timestamp text
 */
export async function markScheduleReminderSentStudio(id, recipientSummary = '') {
    const eventId = String(id || '').trim();
    if (!eventId) throw new Error('id required');
    if (getDataSource() === 'test') {
        const list = await listScheduleEventsStudio();
        const idx = list.findIndex((e) => e.id === eventId);
        if (idx < 0) throw new Error('Event not found');
        const now = new Date().toISOString();
        list[idx] = {
            ...list[idx],
            reminderSentAt: now,
            activity: [
                {
                    id: `act-rem-${now}`,
                    at: now,
                    text: recipientSummary
                        ? `Reminder email sent (${recipientSummary})`
                        : 'Reminder email sent',
                },
                ...(Array.isArray(list[idx].activity) ? list[idx].activity : []),
            ],
        };
        writeStudioLs(LS_STAFF_SCHEDULE_EVENTS, list);
        return now;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffMarkScheduleReminderSent !== 'function') {
        throw new Error(
            'staffMarkScheduleReminderSent missing — run dfx generate fusion-app-backend from the project root.',
        );
    }
    return String(await actor.staffMarkScheduleReminderSent(eventId, String(recipientSummary || '')));
}

const LS_PROGRAM_SCHEDULE_LIVE = 'programScheduleLiveMap';

/**
 * @param {string} programId
 * @returns {Promise<boolean>}
 */
export async function getProgramScheduleLiveStudio(programId) {
    const pid = String(programId || '').trim();
    if (!pid) return false;
    if (getDataSource() === 'test') {
        const map = readStudioLs(LS_PROGRAM_SCHEDULE_LIVE) || {};
        return Boolean(map[pid]);
    }
    try {
        const actor = await getStudioAuthenticatedActor();
        if (!actor || typeof actor.getProgramScheduleLive !== 'function') return false;
        return Boolean(await actor.getProgramScheduleLive(pid));
    } catch {
        return false;
    }
}

/**
 * @returns {Promise<Record<string, boolean>>}
 */
export async function listProgramScheduleLiveStudio() {
    if (getDataSource() === 'test') {
        const map = readStudioLs(LS_PROGRAM_SCHEDULE_LIVE) || {};
        return map && typeof map === 'object' ? { ...map } : {};
    }
    try {
        const actor = await getStudioAuthenticatedActor();
        if (!actor || typeof actor.listProgramScheduleLiveJson !== 'function') return {};
        const raw = await actor.listProgramScheduleLiveJson();
        const parsed = parseCanisterJsonText(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

/**
 * @param {string} programId
 * @param {boolean} live
 */
export async function setProgramScheduleLiveStudio(programId, live) {
    const pid = String(programId || '').trim();
    if (!pid) throw new Error('programId required');
    if (getDataSource() === 'test') {
        const map = { ...(readStudioLs(LS_PROGRAM_SCHEDULE_LIVE) || {}) };
        map[pid] = Boolean(live);
        writeStudioLs(LS_PROGRAM_SCHEDULE_LIVE, map);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffSetProgramScheduleLive !== 'function') {
        throw new Error(
            'staffSetProgramScheduleLive missing — run dfx generate fusion-app-backend from the project root.',
        );
    }
    await actor.staffSetProgramScheduleLive(pid, Boolean(live));
}

/**
 * @param {string} id
 * @param {string} status
 * @returns {Promise<string>}
 */
export async function setScheduleEventStatusStudio(id, status) {
    const eventId = String(id || '').trim();
    const next = String(status || '').trim();
    if (!eventId) throw new Error('id required');
    if (!next) throw new Error('status required');
    if (getDataSource() === 'test') {
        const list = await listScheduleEventsStudio();
        const idx = list.findIndex((e) => e.id === eventId);
        if (idx < 0) throw new Error('Event not found');
        const now = new Date().toISOString();
        list[idx] = {
            ...list[idx],
            status: next,
            updatedAt: now,
            version: Number(list[idx].version || 1) + 1,
            activity: [
                { id: `act-${now}`, at: now, text: `Status set to ${next}` },
                ...(Array.isArray(list[idx].activity) ? list[idx].activity : []),
            ],
        };
        writeStudioLs(LS_STAFF_SCHEDULE_EVENTS, list);
        return eventId;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffSetScheduleEventStatus !== 'function') {
        throw new Error(
            'staffSetScheduleEventStatus missing — run dfx generate fusion-app-backend from the project root.',
        );
    }
    return String(await actor.staffSetScheduleEventStatus(eventId, next));
}

/**
 * Member calendar events (slot-secured + schedule-live programs).
 * @returns {Promise<object[]>}
 */
export async function listMyScheduleEvents() {
    if (getDataSource() === 'test') {
        const liveMap = await listProgramScheduleLiveStudio();
        const payments = await getMyProgramPayments().catch(() => ({
            approvedPrograms: [],
            summaries: [],
            ledger: [],
            plans: [],
        }));
        const secured = new Set();
        for (const summary of payments.summaries || []) {
            const st = String(summary.depositStatus || '');
            if (st === 'paid' || st === 'paid_full' || st === 'waived') {
                secured.add(String(summary.programId || ''));
            }
        }
        for (const ap of payments.approvedPrograms || []) {
            if (ap.manualDepositSubmitted) secured.add(String(ap.programId || ''));
        }
        const all = await listScheduleEventsStudio();
        const caller = 'test';
        return all
            .filter((e) => {
                if (String(e.relationKind || 'program') !== 'program') return false;
                const pid = String(e.relationProgramId || e.programId || '');
                if (!pid || !secured.has(pid) || !liveMap[pid]) return false;
                if (e.status === 'confirmed') return true;
                if (e.status === 'awaiting_confirmation' && String(e.createdBy || '') === caller) return true;
                return false;
            })
            .map((e) => {
                const rsvpIds = normalizeScheduleRsvpIds(e.rsvpIds);
                return {
                    ...e,
                    rsvpIds,
                    rsvpCount: rsvpIds.length,
                    myRsvp: rsvpIds.includes(caller),
                };
            });
    }
    try {
        const actor = await getStudioAuthenticatedActor();
        if (!actor || typeof actor.listMyScheduleEventsJson !== 'function') {
            throw new Error(
                'listMyScheduleEventsJson missing — run dfx generate fusion-app-backend from the project root.',
            );
        }
        const raw = await actor.listMyScheduleEventsJson();
        const parsed = parseCanisterJsonText(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map(normalizeScheduleEventRow).filter(Boolean);
    } catch (err) {
        throw err;
    }
}

/**
 * Member RSVP / cancel RSVP for a program calendar event.
 * @param {string} eventId
 * @param {boolean} attending
 * @returns {Promise<object>}
 */
export async function memberRsvpScheduleEvent(eventId, attending) {
    const id = String(eventId || '').trim();
    if (!id) throw new Error('id required');
    if (getDataSource() === 'test') {
        const list = await listScheduleEventsStudio();
        const idx = list.findIndex((e) => e.id === id);
        if (idx < 0) throw new Error('Event not found');
        const prev = list[idx];
        if (prev.status !== 'confirmed') throw new Error('Event is not open for RSVP');
        if (!prev.acceptRsvp) throw new Error('Event does not accept RSVP');
        const identity = 'test';
        const current = normalizeScheduleRsvpIds(prev.rsvpIds);
        const already = current.includes(identity);
        let nextIds = current;
        if (attending) {
            if (!already) {
                const cap = clampScheduleAvailability(prev.availability, true);
                if (current.length >= cap) throw new Error('Event is full');
                nextIds = [...current, identity];
            }
        } else {
            nextIds = current.filter((x) => x !== identity);
        }
        const now = new Date().toISOString();
        const next = {
            ...prev,
            rsvpIds: nextIds,
            rsvpCount: nextIds.length,
            myRsvp: nextIds.includes(identity),
            updatedAt: now,
            version: Number(prev.version || 1) + 1,
            activity: [
                { id: `act-${now}`, at: now, text: attending ? 'RSVP added' : 'RSVP cancelled' },
                ...(Array.isArray(prev.activity) ? prev.activity : []),
            ],
        };
        list[idx] = next;
        writeStudioLs(LS_STAFF_SCHEDULE_EVENTS, list);
        return next;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.memberRsvpScheduleEvent !== 'function') {
        throw new Error(
            'memberRsvpScheduleEvent missing — run dfx generate fusion-app-backend from the project root.',
        );
    }
    const raw = await actor.memberRsvpScheduleEvent(id, Boolean(attending));
    const parsed = parseCanisterJsonText(raw);
    const row = normalizeScheduleEventRow(parsed);
    if (!row) throw new Error('Invalid RSVP response');
    return row;
}

/**
 * @param {object} opts
 * @returns {Promise<string>}
 */
export async function memberCreateProgramEvent(opts) {
    const programId = String(opts?.programId || '').trim();
    const eventKind = String(opts?.eventKind || '').trim();
    const title = String(opts?.title || '').trim();
    const date = String(opts?.date || '').trim();
    const startTime = String(opts?.startTime || '09:00').trim();
    const endTime = String(opts?.endTime || '10:00').trim();
    const allDay = Boolean(opts?.allDay);
    const timezone = String(opts?.timezone || 'America/New_York').trim();
    const locationId = String(opts?.locationId || '').trim();
    const locationName = String(opts?.locationName || '').trim();
    const notes = String(opts?.notes || '');
    const assignedStaff = (Array.isArray(opts?.assignedStaff) ? opts.assignedStaff : [])
        .map((s) => ({
            id: String(s?.id || '').trim(),
            name: String(s?.name || '').trim(),
            initials: String(s?.initials || '').trim() || '?',
        }))
        .filter((s) => s.id && s.name)
        .slice(0, 12);
    if (!programId) throw new Error('Program required');
    if (eventKind !== 'workshop' && eventKind !== 'adventure') {
        throw new Error('eventKind must be workshop or adventure');
    }
    if (!title) throw new Error('Title required');
    if (!date) throw new Error('Date required');
    if (!locationId) throw new Error('Location required');

    if (getDataSource() === 'test') {
        const now = new Date().toISOString();
        const list = await listScheduleEventsStudio();
        const newId = `evt-member-${Date.now().toString(36)}`;
        list.push({
            id: newId,
            title,
            date,
            startTime,
            endTime,
            allDay,
            timezone,
            programId,
            programName: String(opts?.programName || ''),
            team: '',
            locationId,
            locationName,
            assignedStaff,
            participantIds: [],
            participantCount: 0,
            notes,
            reminderMinutes: null,
            status: 'awaiting_confirmation',
            color: 'sage',
            relationKind: 'program',
            relationProgramId: programId,
            eventKind,
            conflicts: [],
            createdAt: now,
            updatedAt: now,
            version: 1,
            createdBy: 'test',
            activity: [{ id: `act-${now}`, at: now, text: `Member submitted ${eventKind}` }],
        });
        writeStudioLs(LS_STAFF_SCHEDULE_EVENTS, list);
        return newId;
    }

    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.memberCreateProgramEvent !== 'function') {
        throw new Error(
            'memberCreateProgramEvent missing — run dfx generate fusion-app-backend from the project root.',
        );
    }
    return String(
        await actor.memberCreateProgramEvent(
            programId,
            eventKind,
            title,
            date,
            startTime,
            endTime,
            allDay,
            timezone,
            locationId,
            locationName,
            notes,
            assignedStaff,
        ),
    );
}

// ===== Studio Travel (flight bookings + prep links) =====

const LS_TRAVEL_BOOKINGS = 'studioTravelBookings';
const LS_TRAVEL_PREP_LINKS = 'studioTravelPrepLinks';

/**
 * @param {object} booking
 * @returns {Promise<void>}
 */
export async function staffUpsertApplicantFlightBooking(booking) {
    const id = String(booking?.applicantId || '').trim();
    if (!id) throw new Error('applicantId required');
    if (getDataSource() === 'test') {
        const all = readStudioLs(LS_TRAVEL_BOOKINGS) || {};
        all[id] = { ...booking, applicantId: id, updatedAt: new Date().toISOString() };
        writeStudioLs(LS_TRAVEL_BOOKINGS, all);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffUpsertApplicantFlightBooking !== 'function') {
        throw new Error('staffUpsertApplicantFlightBooking missing — run dfx generate after backend deploy.');
    }
    await actor.staffUpsertApplicantFlightBooking({
        applicantId: id,
        programId: String(booking.programId || ''),
        airline: String(booking.airline || ''),
        airlineWebsite: String(booking.airlineWebsite || ''),
        confirmationNumber: String(booking.confirmationNumber || ''),
        flightCostCents: Math.max(0, Math.round(Number(booking.flightCostCents) || 0)),
        ownFlight: Boolean(booking.ownFlight),
        estArrivalDate: String(booking.estArrivalDate || ''),
        estArrivalTime: String(booking.estArrivalTime || ''),
        updatedAt: new Date().toISOString(),
        updatedBy: '',
    });
}

/**
 * @param {string} programId
 * @returns {Promise<Array>}
 */
export async function staffListFlightBookingsForProgram(programId) {
    if (getDataSource() === 'test') {
        const all = readStudioLs(LS_TRAVEL_BOOKINGS) || {};
        return Object.values(all).filter((b) => String(b?.programId || '') === programId);
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffListApplicantFlightBookings !== 'function') {
        throw new Error('staffListApplicantFlightBookings missing — run dfx generate after backend deploy.');
    }
    const rows = await actor.staffListApplicantFlightBookings(programId);
    return (Array.isArray(rows) ? rows : []).map(mapFlightBookingToJs);
}

/**
 * @param {string} applicantId
 * @returns {Promise<object|null>}
 */
export async function staffGetApplicantFlightBooking(applicantId) {
    if (getDataSource() === 'test') {
        const all = readStudioLs(LS_TRAVEL_BOOKINGS) || {};
        return all[applicantId] || null;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffGetApplicantFlightBooking !== 'function') {
        throw new Error('staffGetApplicantFlightBooking missing — run dfx generate after backend deploy.');
    }
    const opt = await actor.staffGetApplicantFlightBooking(applicantId);
    if (!opt || (Array.isArray(opt) && opt.length === 0)) return null;
    const raw = Array.isArray(opt) ? opt[0] : opt;
    return mapFlightBookingToJs(raw);
}

/**
 * @param {string} programId
 * @param {string} applicationId
 * @returns {Promise<object|null>}
 */
export async function getMyFlightBooking(programId, applicationId) {
    if (getDataSource() === 'test') {
        const all = readStudioLs(LS_TRAVEL_BOOKINGS) || {};
        return all[applicationId] || null;
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.getMyFlightBooking !== 'function') return null;
    const opt = await actor.getMyFlightBooking(programId, applicationId);
    if (!opt || (Array.isArray(opt) && opt.length === 0)) return null;
    const raw = Array.isArray(opt) ? opt[0] : opt;
    return mapFlightBookingToJs(raw);
}

/**
 * @param {string} programId
 * @param {string} applicationId
 * @param {string} estDate
 * @param {string} estTime
 * @returns {Promise<void>}
 */
export async function setMyEstimatedArrival(programId, applicationId, estDate, estTime) {
    if (getDataSource() === 'test') {
        const all = readStudioLs(LS_TRAVEL_BOOKINGS) || {};
        const existing = all[applicationId] || { applicantId: applicationId, programId };
        existing.estArrivalDate = estDate;
        existing.estArrivalTime = estTime;
        existing.updatedAt = new Date().toISOString();
        all[applicationId] = existing;
        writeStudioLs(LS_TRAVEL_BOOKINGS, all);
        return;
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.setMyEstimatedArrival !== 'function') {
        throw new Error('setMyEstimatedArrival missing — run dfx generate after backend deploy.');
    }
    await actor.setMyEstimatedArrival(programId, applicationId, estDate, estTime);
}

/**
 * @param {string} programId
 * @param {Array} links
 * @returns {Promise<void>}
 */
export async function staffUpsertTravelPrepLinks(programId, links) {
    if (getDataSource() === 'test') {
        const all = readStudioLs(LS_TRAVEL_PREP_LINKS) || {};
        all[programId] = Array.isArray(links)
            ? links.map((l) => ({ ...l, programId, updatedAt: new Date().toISOString() }))
            : [];
        writeStudioLs(LS_TRAVEL_PREP_LINKS, all);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffUpsertTravelPrepLinks !== 'function') {
        throw new Error('staffUpsertTravelPrepLinks missing — run dfx generate after backend deploy.');
    }
    const mapped = (Array.isArray(links) ? links : []).map((l) => ({
        id: String(l.id || ''),
        programId: String(programId),
        title: String(l.title || ''),
        url: String(l.url || ''),
        description: String(l.description || ''),
        imageUrl: String(l.imageUrl || ''),
        sortOrder: Math.max(0, Math.round(Number(l.sortOrder) || 0)),
        updatedAt: new Date().toISOString(),
    }));
    await actor.staffUpsertTravelPrepLinks(programId, mapped);
}

/**
 * @param {string} programId
 * @returns {Promise<Array>}
 */
export async function listTravelPrepLinks(programId) {
    if (getDataSource() === 'test') {
        const all = readStudioLs(LS_TRAVEL_PREP_LINKS) || {};
        return all[programId] || [];
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.listTravelPrepLinks !== 'function') return [];
    const rows = await actor.listTravelPrepLinks(programId);
    return Array.isArray(rows) ? rows.map(mapTravelPrepLinkToJs) : [];
}

/**
 * @param {string} programId
 * @param {string} linkId
 * @returns {Promise<void>}
 */
export async function staffDeleteTravelPrepLink(programId, linkId) {
    if (getDataSource() === 'test') {
        const all = readStudioLs(LS_TRAVEL_PREP_LINKS) || {};
        if (Array.isArray(all[programId])) {
            all[programId] = all[programId].filter((l) => l.id !== linkId);
            writeStudioLs(LS_TRAVEL_PREP_LINKS, all);
        }
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffDeleteTravelPrepLink !== 'function') {
        throw new Error('staffDeleteTravelPrepLink missing — run dfx generate after backend deploy.');
    }
    await actor.staffDeleteTravelPrepLink(programId, linkId);
}

function mapFlightBookingToJs(raw) {
    return {
        applicantId: String(raw.applicantId ?? ''),
        programId: String(raw.programId ?? ''),
        airline: String(raw.airline ?? ''),
        airlineWebsite: String(raw.airlineWebsite ?? ''),
        confirmationNumber: String(raw.confirmationNumber ?? ''),
        flightCostCents: Number(raw.flightCostCents ?? 0),
        ownFlight: Boolean(raw.ownFlight),
        estArrivalDate: String(raw.estArrivalDate ?? ''),
        estArrivalTime: String(raw.estArrivalTime ?? ''),
        updatedAt: String(raw.updatedAt ?? ''),
        updatedBy: String(raw.updatedBy ?? ''),
    };
}

function mapTravelPrepLinkToJs(raw) {
    return {
        id: String(raw.id ?? ''),
        programId: String(raw.programId ?? ''),
        title: String(raw.title ?? ''),
        url: String(raw.url ?? ''),
        description: String(raw.description ?? ''),
        imageUrl: String(raw.imageUrl ?? ''),
        sortOrder: Number(raw.sortOrder ?? 0),
        updatedAt: String(raw.updatedAt ?? ''),
    };
}

/**
 * Unique image URLs already saved on travel prep links (any program).
 * @returns {Promise<string[]>}
 */
export async function staffListTravelPrepImages() {
    if (getDataSource() === 'test') {
        const all = readStudioLs(LS_TRAVEL_PREP_LINKS) || {};
        const seen = new Set();
        const out = [];
        for (const rows of Object.values(all)) {
            if (!Array.isArray(rows)) continue;
            for (const l of rows) {
                const url = String(l?.imageUrl || '').trim();
                if (!url || seen.has(url)) continue;
                seen.add(url);
                out.push(url);
            }
        }
        return out;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffListTravelPrepImages !== 'function') {
        return [];
    }
    const rows = await actor.staffListTravelPrepImages();
    return Array.isArray(rows) ? rows.map((u) => String(u || '').trim()).filter(Boolean) : [];
}

const LS_PROGRAM_COMMS = 'studioProgramCommsConfig';

function mapInviteSentPairs(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((entry) => {
            if (Array.isArray(entry) && entry.length >= 2) {
                return [String(entry[0] || ''), String(entry[1] || '')];
            }
            if (entry && typeof entry === 'object') {
                const o = /** @type {Record<string, unknown>} */ (entry);
                return [String(o[0] ?? o['0'] ?? ''), String(o[1] ?? o['1'] ?? '')];
            }
            return ['', ''];
        })
        .filter(([id]) => id);
}

function mapProgramCommsConfigToJs(raw) {
    const row = raw && typeof raw === 'object' ? raw : {};
    const leftoverGroupName = String(row.groupGeneralName ?? row.groupName ?? '');
    const leftoverGroupInvite = String(row.groupGeneralInviteUrl ?? row.groupInviteUrl ?? '');
    const leftoverGroupQr = String(row.groupGeneralQrUrl ?? row.groupQrUrl ?? '');
    return {
        programId: String(row.programId ?? ''),
        provider: String(row.provider ?? 'line') || 'line',
        oaName: String(row.oaName ?? ''),
        basicId: String(row.basicId ?? ''),
        channelId: String(row.channelId ?? ''),
        iosStoreUrl: String(row.iosStoreUrl ?? ''),
        androidStoreUrl: String(row.androidStoreUrl ?? ''),
        iosThumbUrl: String(row.iosThumbUrl ?? ''),
        androidThumbUrl: String(row.androidThumbUrl ?? ''),
        iosQrUrl: String(row.iosQrUrl ?? ''),
        androidQrUrl: String(row.androidQrUrl ?? ''),
        groupGeneralName: leftoverGroupName,
        groupGeneralInviteUrl: leftoverGroupInvite,
        groupGeneralQrUrl: leftoverGroupQr,
        groupAnnounceName: String(row.groupAnnounceName ?? ''),
        groupAnnounceInviteUrl: String(row.groupAnnounceInviteUrl ?? ''),
        groupAnnounceQrUrl: String(row.groupAnnounceQrUrl ?? ''),
        inviteSentAtByApplicant: mapInviteSentPairs(row.inviteSentAtByApplicant),
        memberActive: Boolean(row.memberActive),
        inviteMessage: String(row.inviteMessage ?? ''),
        providerThumbUrl: String(row.providerThumbUrl ?? ''),
        updatedAt: String(row.updatedAt ?? ''),
    };
}

function mapProgramCommsMemberRoomToJs(raw) {
    const row = raw && typeof raw === 'object' ? raw : {};
    return {
        programId: String(row.programId ?? ''),
        provider: String(row.provider ?? 'line') || 'line',
        inviteMessage: String(row.inviteMessage ?? ''),
        providerThumbUrl: String(row.providerThumbUrl ?? ''),
        iosStoreUrl: String(row.iosStoreUrl ?? ''),
        androidStoreUrl: String(row.androidStoreUrl ?? ''),
        iosThumbUrl: String(row.iosThumbUrl ?? ''),
        androidThumbUrl: String(row.androidThumbUrl ?? ''),
        iosQrUrl: String(row.iosQrUrl ?? ''),
        androidQrUrl: String(row.androidQrUrl ?? ''),
        groupGeneralName: String(row.groupGeneralName ?? row.groupName ?? ''),
        groupGeneralInviteUrl: String(row.groupGeneralInviteUrl ?? row.groupInviteUrl ?? ''),
        groupGeneralQrUrl: String(row.groupGeneralQrUrl ?? row.groupQrUrl ?? ''),
        groupAnnounceName: String(row.groupAnnounceName ?? ''),
        groupAnnounceInviteUrl: String(row.groupAnnounceInviteUrl ?? ''),
        groupAnnounceQrUrl: String(row.groupAnnounceQrUrl ?? ''),
    };
}

function testCommsSlotSecuredProgramIds(payments) {
    const secured = new Set();
    for (const approval of payments?.approvedPrograms || []) {
        if (approval?.manualDepositSubmitted === true) {
            const id = String(approval.programId || '').trim();
            if (id) secured.add(id);
        }
    }
    for (const summary of payments?.summaries || []) {
        const status = String(summary?.depositStatus || '');
        if (status === 'paid' || status === 'paid_full' || status === 'waived') {
            const id = String(summary.programId || '').trim();
            if (id) secured.add(id);
        }
    }
    return secured;
}

/**
 * @param {string} programId
 * @returns {Promise<object | null>}
 */
export async function staffGetProgramCommsConfig(programId) {
    const pid = String(programId || '').trim();
    if (!pid) return null;
    if (getDataSource() === 'test') {
        const all = readStudioLs(LS_PROGRAM_COMMS) || {};
        return all[pid] ? mapProgramCommsConfigToJs(all[pid]) : null;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffGetProgramCommsConfig !== 'function') {
        throw new Error('staffGetProgramCommsConfig missing — run dfx generate after backend deploy.');
    }
    const raw = await actor.staffGetProgramCommsConfig(pid);
    const rec = unwrapCandidOptionalRecord(raw);
    return rec ? mapProgramCommsConfigToJs(rec) : null;
}

/**
 * @param {object} rec
 * @returns {Promise<void>}
 */
export async function staffUpsertProgramCommsConfig(rec) {
    const programId = String(rec?.programId || '').trim();
    if (!programId) throw new Error('programId required');
    const mapped = mapProgramCommsConfigToJs({ ...rec, programId });
    mapped.updatedAt = new Date().toISOString();
    if (getDataSource() === 'test') {
        const all = readStudioLs(LS_PROGRAM_COMMS) || {};
        const prior = all[programId] ? mapProgramCommsConfigToJs(all[programId]) : null;
        if (prior && (!mapped.inviteSentAtByApplicant || !mapped.inviteSentAtByApplicant.length)) {
            mapped.inviteSentAtByApplicant = prior.inviteSentAtByApplicant;
        }
        all[programId] = mapped;
        writeStudioLs(LS_PROGRAM_COMMS, all);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffUpsertProgramCommsConfig !== 'function') {
        throw new Error('staffUpsertProgramCommsConfig missing — run dfx generate after backend deploy.');
    }
    await actor.staffUpsertProgramCommsConfig({
        ...mapped,
        memberActive: Boolean(mapped.memberActive),
        inviteSentAtByApplicant: mapped.inviteSentAtByApplicant,
    });
}

/**
 * @param {string} programId
 * @param {string[]} applicantIds
 * @returns {Promise<void>}
 */
export async function staffRecordProgramCommsInvites(programId, applicantIds) {
    const pid = String(programId || '').trim();
    const ids = (Array.isArray(applicantIds) ? applicantIds : []).map((id) => String(id || '').trim()).filter(Boolean);
    if (!pid || !ids.length) return;
    if (getDataSource() === 'test') {
        const all = readStudioLs(LS_PROGRAM_COMMS) || {};
        const existing = all[pid] ? mapProgramCommsConfigToJs(all[pid]) : null;
        if (!existing) throw new Error('Comms config not found');
        const now = new Date().toISOString();
        const map = new Map(existing.inviteSentAtByApplicant);
        for (const id of ids) map.set(id, now);
        existing.inviteSentAtByApplicant = [...map.entries()];
        existing.updatedAt = now;
        all[pid] = existing;
        writeStudioLs(LS_PROGRAM_COMMS, all);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffRecordProgramCommsInvites !== 'function') {
        throw new Error('staffRecordProgramCommsInvites missing — run dfx generate after backend deploy.');
    }
    await actor.staffRecordProgramCommsInvites(pid, ids);
}

/**
 * Confirmed-member rooms for Settings → Communications (activated + slot secured).
 * @returns {Promise<object[]>}
 */
export async function listMyProgramCommsRooms() {
    if (getDataSource() === 'test') {
        const { filterMemberCommsRooms } = await import('./programCommsInvite.js');
        const all = readStudioLs(LS_PROGRAM_COMMS) || {};
        const payments = await getMyProgramPayments().catch(() => null);
        return filterMemberCommsRooms(Object.values(all), testCommsSlotSecuredProgramIds(payments));
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.listMyProgramCommsRooms !== 'function') {
        return [];
    }
    const rows = await actor.listMyProgramCommsRooms();
    return Array.isArray(rows) ? rows.map(mapProgramCommsMemberRoomToJs) : [];
}

const LS_PROGRAM_COMMS_LINE_SEEN = 'studioProgramCommsLineSeen';
const LS_PROGRAM_COMMS_LINE_BINDING = 'studioProgramCommsLineBinding';

function mapProgramCommsLineSeenToJs(raw) {
    const row = raw && typeof raw === 'object' ? raw : {};
    return {
        groupId: String(row.groupId ?? ''),
        groupName: String(row.groupName ?? ''),
        lastSeenAt: String(row.lastSeenAt ?? ''),
    };
}

function mapProgramCommsLineBindingToJs(raw, programId = '') {
    const row = raw && typeof raw === 'object' ? raw : {};
    return {
        programId: String(row.programId ?? programId ?? ''),
        groupGeneralId: String(row.groupGeneralId ?? ''),
        groupAnnounceId: String(row.groupAnnounceId ?? ''),
    };
}

function emptyProgramCommsLineBinding(programId = '') {
    return { programId: String(programId || ''), groupGeneralId: '', groupAnnounceId: '' };
}

/**
 * @returns {Promise<object[]>}
 */
export async function staffListSeenLineGroups() {
    if (getDataSource() === 'test') {
        const rows = readStudioLs(LS_PROGRAM_COMMS_LINE_SEEN) || [];
        return (Array.isArray(rows) ? rows : []).map(mapProgramCommsLineSeenToJs).filter((r) => r.groupId);
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffListSeenLineGroups !== 'function') {
        throw new Error('staffListSeenLineGroups missing — run dfx generate after backend deploy.');
    }
    const rows = await actor.staffListSeenLineGroups();
    return Array.isArray(rows) ? rows.map(mapProgramCommsLineSeenToJs) : [];
}

/**
 * @param {string} programId
 * @returns {Promise<object>}
 */
export async function staffGetProgramCommsLineBinding(programId) {
    const pid = String(programId || '').trim();
    if (!pid) return emptyProgramCommsLineBinding('');
    if (getDataSource() === 'test') {
        const all = readStudioLs(LS_PROGRAM_COMMS_LINE_BINDING) || {};
        return all[pid] ? mapProgramCommsLineBindingToJs(all[pid], pid) : emptyProgramCommsLineBinding(pid);
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffGetProgramCommsLineBinding !== 'function') {
        throw new Error('staffGetProgramCommsLineBinding missing — run dfx generate after backend deploy.');
    }
    const raw = await actor.staffGetProgramCommsLineBinding(pid);
    return mapProgramCommsLineBindingToJs(raw, pid);
}

/**
 * @param {string} programId
 * @param {'general' | 'announce'} room
 * @param {string} groupId
 */
export async function staffSetProgramCommsLineRoom(programId, room, groupId) {
    const pid = String(programId || '').trim();
    const key = String(room || '').trim();
    const gid = String(groupId || '').trim();
    if (!pid) throw new Error('programId required');
    if (key !== 'general' && key !== 'announce') throw new Error('room must be general or announce');
    if (getDataSource() === 'test') {
        const all = readStudioLs(LS_PROGRAM_COMMS_LINE_BINDING) || {};
        const next = { ...emptyProgramCommsLineBinding(pid), ...(all[pid] || {}) };
        if (gid) {
            for (const [otherId, row] of Object.entries(all)) {
                const mapped = mapProgramCommsLineBindingToJs(row, otherId);
                if (mapped.groupGeneralId === gid) mapped.groupGeneralId = '';
                if (mapped.groupAnnounceId === gid) mapped.groupAnnounceId = '';
                all[otherId] = mapped;
            }
        }
        const current = mapProgramCommsLineBindingToJs(all[pid] || next, pid);
        if (key === 'general') current.groupGeneralId = gid;
        else current.groupAnnounceId = gid;
        all[pid] = current;
        writeStudioLs(LS_PROGRAM_COMMS_LINE_BINDING, all);
        return;
    }
    const actor = await getStudioAuthenticatedActor();
    if (!actor || typeof actor.staffSetProgramCommsLineRoom !== 'function') {
        throw new Error('staffSetProgramCommsLineRoom missing — run dfx generate after backend deploy.');
    }
    await actor.staffSetProgramCommsLineRoom(pid, key, gid);
}
