/**
 * Test JSON vs live canister data.
 *
 * Precedence: `localStorage['fusion-data-source']` (`test` | `live`) wins when set; otherwise
 * `config.testData` / `VITE_USE_TEST_DATA` → `'test'` vs `'live'` (see ../config.js).
 * Live home blocks (`getProgramHero`, etc.) use canister site settings only — no silent testData fallback.
 */
import { config } from '../config.js';
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
    legacyHeroUrl,
    legacyIntroUrl,
    legacyProfileFileStem,
    needsIntroGallerySync,
} from './studioLegacyProfileUrls.js';
import { normalizeLocalesWorldForStorage } from './worldNormalize.js';
import {
    buildTrimmedSourceJsonForLlm,
    generateEnglishWorldWithLlm,
    mergeWorldBlocks,
    parseLocalesFromArtistRow,
    translateWorldEnToJa,
} from './studioArtistWorldLlm.js';
import { sendEmail } from './integrationApi.js';
import { getApplicationStaffNotificationEmails } from './studioServicesConfig.js';

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

const STORAGE_KEY = 'fusion-data-source';

/** Site setting key: JSON for program application “what’s included” global bullets (EN/JA). */
export const SITE_SETTING_APPLICATION_PAYMENT_GLOBAL = 'applicationPaymentGlobal';

/** localStorage keys (Studio test mode overlays). */
const LS_SUBSCRIBERS = 'subscribers';
const LS_APPLICANTS = 'applicants';
/** Per-id artist field overrides (imported, accessCode, locales, …). */
const LS_ARTISTS_OVERLAY = 'artistsOverlay';
const LS_PROGRAMS_BLOCK = 'allProgramsBlock';
const LS_JOURNALS = 'journals';
const LS_EDITIONS = 'editions';
const LS_CONTENT_PREFIX = 'content-';

const LS_STUDIO_PREFIX = 'fusion-studio-';

/** Test-mode overlay for `applicationPaymentGlobal` site JSON (`database.js` getApplicationPaymentGlobal). */
const LS_APPLICATION_PAYMENT_GLOBAL = 'fusion-test-application-payment-global';

/**
 * @returns {{ en: { whatsIncludedBullets: string[] }, ja: { whatsIncludedBullets: string[] } }}
 */
export function defaultApplicationPaymentGlobal() {
    return {
        en: { whatsIncludedBullets: [] },
        ja: { whatsIncludedBullets: [] },
    };
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
        if (!block || typeof block !== 'object' || Array.isArray(block)) continue;
        const bullets = /** @type {Record<string, unknown>} */ (block).whatsIncludedBullets;
        if (!Array.isArray(bullets)) continue;
        base[loc].whatsIncludedBullets = bullets
            .map((x) => String(x ?? '').trim())
            .filter(Boolean);
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
 * @typedef {'home' | 'programs' | 'products' | 'journal' | 'content'} StudioSurface
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
                audioUrl: String(v.audio_url ?? v.audioUrl ?? ''),
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
        image: String(a.image ?? ''),
        heroProfileImage: (() => {
            const o = a.hero_profile_image ?? a.heroProfileImage;
            if (Array.isArray(o)) {
                return String(unwrapOpt(o) ?? '').trim();
            }
            if (o == null || o === undefined) return '';
            return String(o).trim();
        })(),
        quote: String(media?.quote ?? ''),
        audioUrl: String(media?.audioUrl ?? ''),
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
        audioUrl: String(/** @type {Record<string, unknown>} */ (a).audioUrl ?? ''),
        audioTitle: String(/** @type {Record<string, unknown>} */ (a).audioTitle ?? ''),
        imported: Boolean(a.imported),
        accessCode: String(a.accessCode ?? a.access_code ?? ''),
        contactEmail: String(/** @type {Record<string, unknown>} */ (a).contactEmail ?? '').trim(),
        mostRecentProgram: String(a.mostRecentProgram ?? a.most_recent_program ?? ''),
        heroProfileImage: String(/** @type {Record<string, unknown>} */ (a).heroProfileImage ?? a.hero_profile_image ?? '').trim(),
    };
}

/**
 * Merge `ArtistRecord` from canister into testData-like artist (adds `locales` from JSON).
 * @param {Record<string, unknown>} rec
 * @param {Map<string, number[]>} [cohortByArtistId]
 * @param {Map<string, string>} [heroByArtistId] — from `listArtistHeroProfileImagePublic` (not on `ArtistCore`)
 */
function artistFromRecord(rec, cohortByArtistId, mediaByArtistId, heroByArtistId) {
    if (!rec || typeof rec !== 'object') return null;
    const prof = rec.profile;
    if (!prof || typeof prof !== 'object') return null;
    const profile = mapCanisterArtistRow(prof, cohortByArtistId, mediaByArtistId);
    const out = { ...profile };
    const id = String(out.id ?? '');
    if (heroByArtistId instanceof Map && id) {
        const h = heroByArtistId.get(id);
        if (h != null && String(h).trim() !== '') {
            out.heroProfileImage = String(h).trim();
        }
    }
    const ljRaw = rec.locales_json ?? rec.localesJson;
    const json = typeof ljRaw === 'string' ? ljRaw : unwrapOpt(ljRaw);
    if (json && typeof json === 'string') {
        try {
            const parsed = JSON.parse(json);
            if (parsed && typeof parsed === 'object') {
                out.locales = parsed;
            }
        } catch {
            /* ignore invalid JSON */
        }
    }
    return out;
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
export async function getArtists() {
    if (getDataSource() === 'test') {
        return getMergedTestArtists().filter((a) => artistRosterInPublicDirectory(a.visibility));
    }
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.listArtistRecordsPublic === 'function') {
            const metaForMerge = await fetchFeaturedMergeMetaLive();
            _lastFeaturedMergeMeta = metaForMerge;
            const [rows, cohortMap, mediaMap, heroMap] = await Promise.all([
                actor.listArtistRecordsPublic(),
                fetchArtistCohortMap(actor),
                fetchArtistMediaMap(actor),
                fetchArtistHeroProfileMap(actor),
            ]);
            if (!Array.isArray(rows)) return [];
            const out = [];
            for (const r of rows) {
                const a = artistFromRecord(r, cohortMap, mediaMap, heroMap);
                if (a) out.push(a);
            }
            await mergeMostRecentProgramsFromCanister(actor, out);
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
    const [rows, mediaMap] = await Promise.all([actor.listArtists(), fetchArtistMediaMap(actor)]);
    if (!Array.isArray(rows)) return [];
    return dedupePublicArtistRows(
        rows.map((r) => mergeArtistFeaturedExtension(mapCanisterArtistRow(r, undefined, mediaMap), metaForMerge))
    );
}

/**
 * Map full canister `ArtistRecord` (Studio) to roster row with `imported` + `accessCode`.
 * @param {Record<string, unknown>} rec
 * @param {Map<string, string>} [heroByArtistId]
 */
function mapStudioArtistFromFullRecord(rec, cohortByArtistId, mediaByArtistId, heroByArtistId) {
    const prof = rec.profile;
    if (!prof || typeof prof !== 'object') {
        return { id: '', slug: '', imported: false, accessCode: '' };
    }
    let base = mapCanisterArtistRow(prof, cohortByArtistId, mediaByArtistId);
    const bid = String(base.id ?? '');
    if (heroByArtistId instanceof Map && bid) {
        const h = heroByArtistId.get(bid);
        if (h != null && String(h).trim() !== '') {
            base = { ...base, heroProfileImage: String(h).trim() };
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
                locales = /** @type {Record<string, unknown>} */ (parsed);
            }
        } catch {
            /* ignore invalid JSON */
        }
    }
    return {
        ...base,
        imported: Boolean(rec.imported),
        accessCode: String(rec.access_code ?? rec.accessCode ?? ''),
        ...(locales ? { locales } : {}),
    };
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
            const [rows, cohortMap, mediaMap, heroMap] = await Promise.all([
                actor.listArtistRecordsForStudio(),
                fetchArtistCohortMap(actor),
                fetchArtistMediaMap(actor),
                fetchArtistHeroProfileMap(actor),
            ]);
            if (!Array.isArray(rows)) return [];
            const mapped = rows.map((r) =>
                mergeArtistFeaturedExtension(
                    mapStudioArtistFromFullRecord(r, cohortMap, mediaMap, heroMap),
                    metaForMerge
                )
            );
            await mergeMostRecentProgramsFromCanister(actor, mapped);
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
        const all = await getArtists();
        const found = all.find((a) => String(a?.slug || '').toLowerCase() === s.toLowerCase());
        return found
            ? mergeArtistFeaturedExtension(normalizeArtistDefaults({ ...found }), readArtistFeaturedMeta())
            : null;
    }
    const fromCanister = await getArtistBySlug(s);
    if (!fromCanister) return null;
    const tr = tableRow && typeof tableRow === 'object' ? tableRow : {};
    const meta = await fetchFeaturedMergeMetaLive();
    return mergeArtistFeaturedExtension(
        normalizeArtistDefaults({
            ...fromCanister,
            imported: Boolean(tr.imported ?? fromCanister.imported),
            accessCode: String(tr.accessCode ?? fromCanister.accessCode ?? ''),
            contactEmail: String(
                tr.contactEmail ?? tr.contact_email ?? fromCanister.contactEmail ?? '',
            ).trim(),
        }),
        meta
    );
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
 * Clears **all** roster artists’ profile hero `image`, then sets each to the legacy HTTPS URL:
 * `https://fusionart-bucket.s3.us-east-2.amazonaws.com/uploads/legacyProfiles/<stem>-hero.jpg`
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
 * Fill empty EN intro gallery (and mirror EN→JA) with legacy S3 URLs (Studio → Sync Gallery).
 * @returns {Promise<number>} number of artists updated
 */
export async function syncStudioArtistsLegacyIntroGalleries() {
    const rows = await getArtistsForStudio();
    const pool = collectAccessCodesFromArtists(rows);
    /** @type {object[]} */
    const updates = [];
    for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        if (!needsIntroGallerySync(row.locales)) continue;
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
        updates.push(
            normalizeArtistImportRow(
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
            )
        );
    }
    if (!updates.length) {
        return 0;
    }
    await bulkUpsertArtistsStudio(updates);
    return updates.length;
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
                const [cohortMap, mediaMap, heroMap] = await Promise.all([
                    fetchArtistCohortMap(actor),
                    fetchArtistMediaMap(actor),
                    fetchArtistHeroProfileMap(actor),
                ]);
                const merged = artistFromRecord(rec, cohortMap, mediaMap, heroMap);
                if (merged) {
                    if (typeof actor.getArtistBySlug === 'function') {
                        const profOpt = await actor.getArtistBySlug(slug);
                        const p = unwrapOpt(profOpt);
                        if (p && typeof p === 'object') {
                            const po = /** @type {Record<string, unknown>} */ (p);
                            merged.mostRecentProgram = String(
                                po.most_recent_program ?? po.mostRecentProgram ?? merged.mostRecentProgram ?? '',
                            );
                        }
                    }
                    return mergeArtistFeaturedExtension(merged, meta);
                }
            }
        }
        if (typeof actor.getArtistBySlug === 'function') {
            const profOpt = await actor.getArtistBySlug(slug);
            const p = unwrapOpt(profOpt);
            if (p) return mergeArtistFeaturedExtension(mapCanisterArtistRow(p), meta);
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
            image: String(p.image ?? ''),
            featuredOrder: Math.max(0, Math.floor(Number(p.featuredOrder ?? 0))),
            visibility: String(p.visibility ?? 'public'),
            updatedAt: String(p.updatedAt ?? ''),
            contactEmail: String(p.contactEmail ?? '').trim(),
            filter: p.filter ? [p.filter] : [],
            galleryFilter: p.galleryFilter ? [p.galleryFilter] : [],
        },
        localesJson: p.locales && typeof p.locales === 'object' ? JSON.stringify(p.locales) : null,
        notesEncrypted: [],
        imported: Boolean(p.imported),
        accessCode: String(p.accessCode ?? ''),
        appliedJson,
    };
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
    const staffSummary = [
        `Program ID: ${pid}`,
        applicantName ? `Applicant: ${applicantName}` : null,
        applicantEmail ? `Email: ${applicantEmail}` : null,
        `Submitted at: ${submittedAt}`,
    ]
        .filter(Boolean)
        .join('\n');
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
                subject: `New program application (${pid})`,
                text: staffSummary,
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

export async function ensureMyLinkedArtistProfile() {
    if (getDataSource() === 'test') {
        let id = getProfileSettingsDevArtistId();
        if (id) {
            const artists = await getArtists();
            if (artists.some((x) => x.id === id)) return 'alreadyLinked';
        }
        const ts = new Date().toISOString();
        const nid = `mpd-local-${
            typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : String(Date.now())
        }`;
        const minimal = normalizeArtistDefaults({
            id: nid,
            slug: nid,
            image: '',
            featuredOrder: 999_999,
            visibility: 'public',
            updatedAt: ts,
            locales: { en: {}, ja: {} },
            imported: false,
            accessCode: '',
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
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor) return 'noAccount';
    if (typeof actor.ensureMyLinkedArtistProfile !== 'function') {
        return 'alreadyLinked';
    }
    const raw = await actor.ensureMyLinkedArtistProfile();
    if (raw && typeof raw === 'object') {
        if ('ok' in raw) return 'ok';
        if ('alreadyLinked' in raw) return 'alreadyLinked';
        if ('needsSubscription' in raw) return 'needsSubscription';
        if ('noAccount' in raw) return 'noAccount';
    }
    return 'ok';
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
                        audioUrl: String(media.audio_url ?? media.audioUrl ?? ''),
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
                        recWithMedia = { ...recWithMedia, profile: { ...p, heroProfileImage: String(h).trim() } };
                    }
                }
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
    const url = String(imageUrl ?? '');
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
    const url = String(heroProfileImageUrl ?? '');
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
    const audioUrl = String(patch?.audioUrl ?? '');
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
        const merged = normalizeArtistDefaults({ ...base, visibility: vis, updatedAt: ts });
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
 * Admin-only when live; empty in test mode.
 * @returns {Promise<object[]>}
 */
export async function getSubscribers() {
    if (getDataSource() === 'test') {
        const rows = readStudioLs(LS_SUBSCRIBERS);
        return Array.isArray(rows) ? rows : [];
    }
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.getSubscribers !== 'function') {
        throw new Error('getSubscribers missing — run dfx generate fusion-app-backend after backend changes.');
    }
    const rows = await actor.getSubscribers();
    return Array.isArray(rows) ? rows : [];
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
        if (block && block.programs) return block;
        return testData.allPrograms || { order: 2, programs: { en: [], ja: [] } };
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
        return { order: 2, programs: { en, ja } };
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
        parsed = JSON.parse(localesJson);
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
        if (Array.isArray(ls) && ls.length) return ls;
        return testData.journals?.journals || [];
    }
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.listJournalEntries !== 'function') return [];
        const rows = await actor.listJournalEntries();
        if (!Array.isArray(rows)) return [];
        return rows.map(mapJournalRecordToJs);
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

/**
 * Studio/admin: set shared artist quote/audio metadata.
 * @param {string} artistId
 * @param {{ quote?: string, audioUrl?: string, audioTitle?: string }} media
 */
export async function adminSetArtistMediaForStudio(artistId, media) {
    const id = String(artistId || '').trim();
    if (!id) return;
    const quote = String(media?.quote ?? '');
    const audioUrl = String(media?.audioUrl ?? '');
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
        parsed = JSON.parse(String(r.locales_json ?? r.localesJson ?? '{}'));
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
        return raw.map(normalizeTestEditionItem);
    }
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.listEditions !== 'function') return [];
        const rows = await actor.listEditions();
        if (!Array.isArray(rows)) return [];
        return rows.map(mapEditionRecordToJs);
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
        parsed = JSON.parse(String(r.locales_json ?? r.localesJson ?? '{}'));
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
 * @returns {Promise<object[]>}
 */
export async function getApplicants() {
    if (getDataSource() === 'test') {
        const ls = readStudioLs(LS_APPLICANTS);
        if (Array.isArray(ls) && ls.length) {
            return ls.map((a) => ({ ...a }));
        }
        return MOCK_APPLICANTS_TEST.map((a) => ({ ...a }));
    }
    try {
        const actor = await getStudioAuthenticatedActor();
        if (typeof actor.listApplicants !== 'function') return [];
        const rows = await actor.listApplicants();
        if (!Array.isArray(rows)) return [];
        return rows.map(mapApplicantToJs);
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
            journalCount: journals.length,
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
            journalCount = Array.isArray(j) ? j.length : 0;
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
                        return /** @type {Record<string, unknown>} */ (j);
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
                    return /** @type {Record<string, unknown>} */ (JSON.parse(t));
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
        return testData.programHero || {};
    }
    return getLiveCmsJsonOrSiteSetting('program-hero', 'programHeroJson');
}

/**
 * `testData.journals` wrapper for journal hero on home.
 * @returns {Promise<object>}
 */
export async function getJournalsHeroBlock() {
    if (getDataSource() === 'test') {
        return testData.journals || { journals: [] };
    }
    const entries = await getJournalEntries();
    return { order: 6, journals: entries };
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
        return { ...o, objects: Array.isArray(o.objects) ? o.objects : [] };
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
    return { ...base, objects };
}

/**
 * Live: CMS `gallery-access-cta`, else legacy `galleryAccessCtaJson`.
 * @returns {Promise<object>}
 */
export async function getGalleryAccessCta() {
    if (getDataSource() === 'test') {
        return testData.galleryAccessCta || {};
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
    if (!rows.length) return 'email,category,fullName,intent,timestamp\n';
    const header = 'email,category,fullName,intent,timestamp';
    const lines = rows.map((r) =>
        [r.email, r.category, r.fullName ?? '', r.intent ?? '', r.timestamp]
            .map((c) => `"${String(c).replace(/"/g, '""')}"`)
            .join(',')
    );
    return `${header}\n${lines.join('\n')}`;
}

/**
 * Motoko `ApplicantStatus` variant for IDL encode.
 * @param {string} status
 * @returns {Record<string, null>}
 */
export function applicantStatusToVariant(status) {
    const s = String(status || 'pending');
    const allowed = ['pending', 'reviewing', 'needsInfo', 'accepted', 'rejected'];
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
    if (entry.testKey === 'context' || entry.testKey === 'artistsPage') {
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
        if (returnMeta) {
            return { bundle, isLivePlaceholder };
        }
        return bundle;
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
    return actor.studioTranslateEnToJa(englishText);
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
    const sourceJson = buildTrimmedSourceJsonForLlm(artistRow);
    const worldGen = await generateEnglishWorldWithLlm(reinterpretFn, sourceJson);
    let locales = parseLocalesFromArtistRow(artistRow);
    locales = normalizeLocalesWorldForStorage(locales);
    const prevEn =
        locales.en &&
        typeof locales.en === 'object' &&
        locales.en.world &&
        typeof locales.en.world === 'object' &&
        !Array.isArray(locales.en.world)
            ? /** @type {Record<string, unknown>} */ (locales.en.world)
            : {};
    const prevJa =
        locales.ja &&
        typeof locales.ja === 'object' &&
        locales.ja.world &&
        typeof locales.ja.world === 'object' &&
        !Array.isArray(locales.ja.world)
            ? /** @type {Record<string, unknown>} */ (locales.ja.world)
            : {};
    const enWorld = mergeWorldBlocks(prevEn, worldGen, mergeMode);
    const wJa = await translateWorldEnToJa(translateEnToJa, enWorld);
    const jaWorld = mergeWorldBlocks(prevJa, wJa, mergeMode);
    if (!locales.en || typeof locales.en !== 'object') locales.en = {};
    if (!locales.ja || typeof locales.ja !== 'object') locales.ja = {};
    locales.en = { ...locales.en, world: enWorld };
    locales.ja = { ...locales.ja, world: jaWorld };
    return normalizeLocalesWorldForStorage(locales);
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
    /** @type {Record<string, unknown>} */
    let locales = { en: {}, ja: {} };
    if (typeof ljRaw === 'string' && ljRaw.trim()) {
        try {
            const p = JSON.parse(ljRaw);
            if (p && typeof p === 'object' && !Array.isArray(p)) locales = /** @type {Record<string, unknown>} */ (p);
        } catch {
            /* keep default */
        }
    }
    return {
        id: String(rec.id ?? ''),
        slug: String(prof.slug ?? ''),
        image: String(prof.image ?? ''),
        heroProfileImage: (() => {
            const o = prof.heroProfileImage ?? prof.hero_profile_image;
            if (Array.isArray(o)) {
                return String(unwrapOpt(o) ?? '').trim();
            }
            if (o == null || o === undefined) return '';
            return String(o).trim();
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
 * Generate Kamauu-style `world` via LLM from English locale bio/discipline, translate to JA, upsert canister.
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
            image: String(artistRow.image ?? ''),
            heroProfileImage: String(/** @type {Record<string, unknown>} */ (artistRow).heroProfileImage ?? '').trim(),
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
 * Member: same world merge as Studio batch, persisted with {@link updateMyArtistLocalesJson}.
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
        const rec = { email, category, fullName, intent, timestamp };
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
 * @typedef {{
 *   principal: string,
 *   role: string,
 *   status: string,
 *   linkedArtistId?: string,
 *   linkedOrgId?: string,
 *   updatedAt: string,
 *   stripeSubscriptionStatus?: string,
 *   stripeCurrentPeriodEnd?: string,
 *   membershipExemptManual?: boolean,
 *   rawAccount?: Record<string, unknown>,
 * }} StudioAccountRow
 */

/**
 * @returns {Promise<StudioAccountRow[]>}
 */
export async function getAccountsForStudio() {
    const actor = await getStudioAuthenticatedActor();
    if (typeof actor.listAccounts !== 'function') return [];
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
            updatedAt: String(a.updated_at ?? a.updatedAt ?? ''),
            stripeSubscriptionStatus: unwrapOpt(a.stripeSubscriptionStatus ?? a.stripe_subscription_status),
            stripeCurrentPeriodEnd: unwrapOpt(a.stripeCurrentPeriodEnd ?? a.stripe_current_period_end),
            membershipExemptManual: Boolean(a.membershipExemptManual ?? a.membership_exempt_manual),
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
    const map = new Map();
    if (!Array.isArray(tuples)) return map;
    for (const row of tuples) {
        if (!Array.isArray(row) || row.length < 2) continue;
        const k = String(row[0]);
        const v = row[1];
        if (!v || typeof v !== 'object') continue;
        const o = /** @type {Record<string, unknown>} */ (v);
        map.set(k, {
            visible: Boolean(o.visible ?? o.Visible),
            canEdit: Boolean(o.canEdit ?? o.can_edit ?? o.CanEdit),
        });
    }
    return map;
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
    return studioPermissionTuplesToMap(inner);
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
