/**
 * Test JSON vs live canister data.
 *
 * Precedence: `localStorage['fusion-data-source']` (`test` | `live`) wins when set; otherwise
 * `config.testData` / `VITE_USE_TEST_DATA` → `'test'` vs `'live'` (see ../config.js).
 * Live home blocks (`getProgramHero`, etc.) use canister site settings only — no silent testData fallback.
 */
import { config } from '../config.js';
import { testData } from '../testData.js';
import { mergeArtistFeaturedExtension, resolveFeaturedArtistsForPublic } from './artistFeaturedExtension.js';
import { getFusionBackendActor } from './earlyAccessSubscribe.js';
import { getStudioAuthenticatedActor } from './studioAuth.js';
import {
    artistRecordToTestOverlayShape,
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
    needsHeroSync,
    needsIntroGallerySync,
} from './studioLegacyProfileUrls.js';
import { normalizeLocalesWorldForStorage } from './worldNormalize.js';

const STORAGE_KEY = 'fusion-data-source';

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

/**
 * CMS pages: slug for canister + testData root key.
 * `editorMode`: `locales` = top-level EN/JA in Studio (merge with siblings like `order`, `routeLink`);
 * `full` = entire JSON blob (nested keys, arrays, join flows), including `info`, `allPrograms`, `editions`, `journals`, `programHero`.
 * Entity tabs (Programs, Products, Journal, Artists) own overlapping data — see docs/STUDIO_TESTDATA_MATRIX.md.
 * @type {readonly { key: string, slug: string, testKey: keyof typeof testData | string, label: string, editorMode?: 'locales' | 'full' }[]}
 */
export const CONTENT_PAGE_REGISTRY = [
    { key: 'terms', slug: 'terms', testKey: 'termsAndConditions', label: 'Terms & Conditions', editorMode: 'locales' },
    { key: 'privacy', slug: 'privacy', testKey: 'privacyPolicy', label: 'Privacy Policy', editorMode: 'locales' },
    { key: 'contact', slug: 'contact', testKey: 'contact', label: 'Contact', editorMode: 'locales' },
    { key: 'faq', slug: 'faq', testKey: 'faq', label: 'FAQ', editorMode: 'locales' },
    {
        key: 'applicationProcess',
        slug: 'application-process',
        testKey: 'applicationProcess',
        label: 'Application process',
        editorMode: 'locales',
    },
    { key: 'context', slug: 'context', testKey: 'context', label: 'Context page', editorMode: 'locales' },
    {
        key: 'siteInfo',
        slug: 'site-info',
        testKey: 'info',
        label: 'Site info blocks (home, programs, editions, journal)',
        editorMode: 'full',
    },
    {
        key: 'allProgramsBlock',
        slug: 'all-programs',
        testKey: 'allPrograms',
        label: 'Programs block (order + program cards)',
        editorMode: 'full',
    },
    {
        key: 'editionsFeed',
        slug: 'editions-feed',
        testKey: 'editions',
        label: 'Editions grid (items)',
        editorMode: 'full',
    },
    {
        key: 'journalsBlock',
        slug: 'journals-block',
        testKey: 'journals',
        label: 'Journal — home list (order + entries)',
        editorMode: 'full',
    },
    { key: 'programHero', slug: 'program-hero', testKey: 'programHero', label: 'Home — program hero', editorMode: 'full' },
    {
        key: 'galleryAccessCta',
        slug: 'gallery-access-cta',
        testKey: 'galleryAccessCta',
        label: 'Home — gallery access CTA',
        editorMode: 'locales',
    },
    { key: 'eventRow', slug: 'event-row', testKey: 'eventRow', label: 'Event row (by context)', editorMode: 'full' },
    { key: 'objectsHighlight', slug: 'objects-highlight', testKey: 'objectsHighlight', label: 'Objects highlight', editorMode: 'full' },
    { key: 'joinNetwork', slug: 'join-network', testKey: 'joinNetwork', label: 'Join network blocks', editorMode: 'full' },
    {
        key: 'joinNetworkFlow',
        slug: 'join-network-flow',
        testKey: 'joinNetworkFlow',
        label: 'Join network modal flows',
        editorMode: 'full',
    },
    { key: 'quoteRow', slug: 'quote-row', testKey: 'quoteRow', label: 'Quote row (by context)', editorMode: 'full' },
    { key: 'featureCards', slug: 'feature-cards', testKey: 'featureCards', label: 'Feature cards (by area)', editorMode: 'full' },
    { key: 'events', slug: 'events', testKey: 'events', label: 'Events list', editorMode: 'full' },
    { key: 'audio', slug: 'audio', testKey: 'audio', label: 'Audio tracks', editorMode: 'full' },
];

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
 * Map canister `Artist` into frontend roster shape (aligned with testData artists).
 * @param {Record<string, unknown>} a
 */
function mapCanisterArtistRow(a) {
    const filterRaw = unwrapOpt(a.filter);
    const galleryRaw = unwrapOpt(a.gallery_filter ?? a.galleryFilter);
    return {
        id: String(a.id ?? ''),
        slug: String(a.slug ?? ''),
        image: String(a.image ?? ''),
        featuredOrder: Number(a.featured_order ?? a.featuredOrder ?? 0),
        visibility: String(a.visibility ?? ''),
        updatedAt: String(a.updated_at ?? a.updatedAt ?? ''),
        filter: filterRaw
            ? {
                  connection: String(filterRaw.connection ?? ''),
                  cohortYear: Number(filterRaw.cohort_year ?? filterRaw.cohortYear ?? 0),
                  disciplineKey: String(filterRaw.discipline_key ?? filterRaw.disciplineKey ?? ''),
                  locationKey: String(filterRaw.location_key ?? filterRaw.locationKey ?? ''),
              }
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
        imported: Boolean(a.imported),
        accessCode: String(a.accessCode ?? a.access_code ?? ''),
    };
}

/**
 * Merge `ArtistRecord` from canister into testData-like artist (adds `locales` from JSON).
 * @param {Record<string, unknown>} rec
 */
function artistFromRecord(rec) {
    if (!rec || typeof rec !== 'object') return null;
    const prof = rec.profile;
    if (!prof || typeof prof !== 'object') return null;
    const profile = mapCanisterArtistRow(prof);
    const out = { ...profile };
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
 * @returns {Promise<object[]>}
 */
export async function getArtists() {
    if (getDataSource() === 'test') {
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
        return merged.map((a) => mergeArtistFeaturedExtension(a));
    }
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.listArtistRecordsPublic === 'function') {
            const rows = await actor.listArtistRecordsPublic();
            if (!Array.isArray(rows)) return [];
            const out = [];
            for (const r of rows) {
                const a = artistFromRecord(r);
                if (a) out.push(mergeArtistFeaturedExtension(a));
            }
            return out;
        }
    } catch {
        /* older canister: fall back to profile-only list */
    }
    const actor = await getFusionBackendActor();
    if (typeof actor.listArtists !== 'function') {
        return [];
    }
    const rows = await actor.listArtists();
    if (!Array.isArray(rows)) return [];
    return rows.map((r) => mergeArtistFeaturedExtension(mapCanisterArtistRow(r)));
}

/**
 * Map full canister `ArtistRecord` (Studio) to roster row with `imported` + `accessCode`.
 * @param {Record<string, unknown>} rec
 */
function mapStudioArtistFromFullRecord(rec) {
    const prof = rec.profile;
    if (!prof || typeof prof !== 'object') {
        return { id: '', slug: '', imported: false, accessCode: '' };
    }
    const base = mapCanisterArtistRow(prof);
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
        return getArtists();
    }
    try {
        const actor = await getStudioAuthenticatedActor();
        if (typeof actor.listArtistRecordsForStudio === 'function') {
            const rows = await actor.listArtistRecordsForStudio();
            if (!Array.isArray(rows)) return [];
            return rows.map((r) => mergeArtistFeaturedExtension(mapStudioArtistFromFullRecord(r)));
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
        return found ? mergeArtistFeaturedExtension(normalizeArtistDefaults({ ...found })) : null;
    }
    const fromCanister = await getArtistBySlug(s);
    if (!fromCanister) return null;
    const tr = tableRow && typeof tableRow === 'object' ? tableRow : {};
    return mergeArtistFeaturedExtension(
        normalizeArtistDefaults({
            ...fromCanister,
            imported: Boolean(tr.imported ?? fromCanister.imported),
            accessCode: String(tr.accessCode ?? fromCanister.accessCode ?? ''),
        })
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
 * Set missing hero `image` to legacy S3 URL pattern (Studio Artists → Sync Profile Images).
 * @returns {Promise<number>} number of artists updated
 */
export async function syncStudioArtistsLegacyHeroImages() {
    const rows = await getArtistsForStudio();
    const pool = collectAccessCodesFromArtists(rows);
    /** @type {object[]} */
    const updates = [];
    for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        if (!needsHeroSync(row)) continue;
        const stem = legacyProfileFileStem(row);
        const heroUrl = legacyHeroUrl(stem);
        const localesRaw = row.locales && typeof row.locales === 'object' ? row.locales : { en: {}, ja: {} };
        const locales = /** @type {Record<string, unknown>} */ (JSON.parse(JSON.stringify(localesRaw)));
        if (!locales.en || typeof locales.en !== 'object') locales.en = {};
        if (!locales.ja || typeof locales.ja !== 'object') locales.ja = {};
        updates.push(
            normalizeArtistImportRow(
                {
                    id: row.id,
                    slug: row.slug,
                    image: heroUrl,
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
            )
        );
    }
    if (!updates.length) {
        return 0;
    }
    await bulkUpsertArtistsStudio(updates);
    return updates.length;
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
                    featuredOrder: row.featuredOrder,
                    visibility: row.visibility,
                    updatedAt: new Date().toISOString(),
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
    if (typeof actor.bulkUpsertArtists === 'function') {
        await actor.bulkUpsertArtists(motoko);
    } else {
        if (typeof actor.upsertArtist !== 'function') {
            throw new Error('upsertArtist missing — run dfx generate fusion-app-backend.');
        }
        for (const r of motoko) {
            await actor.upsertArtist(r);
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
        for (const a of artists) {
            if (a?.slug && String(a.slug).trim().toLowerCase() === want) {
                return mergeArtistFeaturedExtension(a);
            }
        }
        return null;
    }
    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.getArtistRecordBySlug === 'function') {
            const recOpt = await actor.getArtistRecordBySlug(slug);
            const rec = unwrapOpt(recOpt);
            if (rec) {
                const merged = artistFromRecord(rec);
                if (merged) return mergeArtistFeaturedExtension(merged);
            }
        }
        if (typeof actor.getArtistBySlug === 'function') {
            const profOpt = await actor.getArtistBySlug(slug);
            const p = unwrapOpt(profOpt);
            if (p) return mergeArtistFeaturedExtension(mapCanisterArtistRow(p));
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
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fusion-data-source-change', { detail: { source: 'test' } }));
        }
        return;
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor || typeof actor.submitProgramApplication !== 'function') {
        throw new Error('submitProgramApplication unavailable — sign in and run dfx generate fusion-app-backend.');
    }
    await assertProgramApplicationPreflight(actor);
    await actor.submitProgramApplication(pid, payloadJson, submittedAt);
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
    if (!actor || typeof actor.getMembershipAccessForCaller !== 'function') {
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
    /** Applications live in a separate canister map; merge for the same shape as test mode. */
    if (typeof actor.getMyArtistApplicationsJson === 'function') {
        try {
            const appsOpt = await actor.getMyArtistApplicationsJson();
            const aj = unwrapOpt(appsOpt);
            if (aj != null && String(aj).length > 0) {
                return { ...rec, appliedJson: aj };
            }
        } catch {
            /* older wasm without getMyArtistApplicationsJson */
        }
    }
    return rec;
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
 * Match `/program/...` or `/programs/...` against program list (test or live).
 * @param {string} pathname
 * @returns {Promise<{ en: object, ja: object } | null>}
 */
export async function findProgramPairByPathname(pathname) {
    const canonical = normalizeProgramPath(pathname);
    const block = await getAllProgramsBlock();
    const enList = block.programs?.en || [];
    const jaList = block.programs?.ja || [];
    const idx = enList.findIndex((p) => p?.routeLink === canonical);
    if (idx >= 0) {
        return {
            en: enList[idx],
            ja: jaList[idx] || enList[idx],
        };
    }
    return null;
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
            if (o.enCard) en.push(o.enCard);
            if (o.jaCard) ja.push(o.jaCard);
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
    return {
        id,
        routeLink,
        featuredOrder: Number(r.featured_order ?? r.featuredOrder ?? 0),
        visibility: String(r.visibility ?? ''),
        studioStatus: String(r.studio_status ?? r.studioStatus ?? ''),
        updatedAt: String(r.updated_at ?? r.updatedAt ?? ''),
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
 * @returns {Promise<{ slug: string, title: string, snippet: string, label: string, editorMode: 'locales' | 'full' }[]>}
 */
export async function getContentSummary() {
    const fromRegistry = (blockGetter) =>
        CONTENT_PAGE_REGISTRY.map((entry) => {
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
        return CONTENT_PAGE_REGISTRY.map((entry) => {
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
    return resolveFeaturedArtistsForPublic(all);
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
    if (entry.testKey === 'context') {
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
        const enCard = { ...parsedEn, id, routeLink, studioStatus };
        const jaCard =
            parsedJa && typeof parsedJa === 'object'
                ? { ...parsedJa, id, routeLink }
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
 * @typedef {{ principal: string, role: string, status: string, linkedArtistId?: string, linkedOrgId?: string, updatedAt: string, stripeSubscriptionStatus?: string, membershipExemptManual?: boolean }} StudioAccountRow
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
            membershipExemptManual: Boolean(a.membershipExemptManual ?? a.membership_exempt_manual),
        });
    }
    return out;
}
