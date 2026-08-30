/**
 * Reactive Radar client store.
 */
import { emptyLead } from './radarModel.js';
import {
    deleteRadarLead,
    getRadarStats,
    listRadarLeads,
    listRadarOutreach,
    listRadarRelationships,
    listRadarSources,
    upsertRadarLead,
    upsertRadarOutreach,
    upsertRadarSource,
} from './radarApi.js';

/** @type {import('./radarModel.js').emptyLead extends Function ? ReturnType<import('./radarModel.js').emptyLead>[] : any[]} */
let leads = [];
/** @type {any[]} */
let sources = [];
/** @type {any[]} */
let outreach = [];
/** @type {any[]} */
let relationships = [];
/** @type {'idle'|'loading'|'ready'|'error'} */
let loadState = 'idle';
let loadError = '';
/** When true, skip canister writes (DEV Radar preview / Playwright). */
let previewMode = false;

/** @type {Set<() => void>} */
const listeners = new Set();

function notify() {
    for (const fn of listeners) {
        try {
            fn();
        } catch {
            /* ignore */
        }
    }
}

/**
 * @param {() => void} fn
 */
export function subscribeRadar(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function notifyRadar() {
    notify();
}

export function getRadarLoadState() {
    return { loadState, loadError };
}

export function getRadarLeadsCached() {
    return leads;
}

export function getRadarSourcesCached() {
    return sources;
}

export function getRadarOutreachCached() {
    return outreach;
}

export function getRadarRelationshipsCached() {
    return relationships;
}

export function isRadarPreviewStore() {
    return previewMode;
}

/**
 * Inject a known workspace (DEV preview). Does not call fusion-radar.
 * @param {{ leads?: any[], sources?: any[], outreach?: any[], relationships?: any[] }} payload
 * @param {{ preview?: boolean }} [opts]
 */
export function hydrateRadarWorkspace(payload, opts = {}) {
    leads = Array.isArray(payload?.leads) ? payload.leads.map((x) => emptyLead(x)) : [];
    sources = Array.isArray(payload?.sources) ? payload.sources : [];
    outreach = Array.isArray(payload?.outreach) ? payload.outreach : [];
    relationships = Array.isArray(payload?.relationships) ? payload.relationships : [];
    loadState = 'ready';
    loadError = '';
    previewMode = opts.preview !== false;
    notify();
    return { leads, sources, outreach, relationships };
}

export async function loadRadarWorkspace() {
    if (previewMode) {
        loadState = 'ready';
        loadError = '';
        notify();
        return { leads, sources, outreach, relationships };
    }
    loadState = 'loading';
    loadError = '';
    notify();
    try {
        const [l, s, o, r] = await Promise.all([
            listRadarLeads(),
            listRadarSources(),
            listRadarOutreach(''),
            listRadarRelationships(''),
        ]);
        leads = l;
        sources = s;
        outreach = o;
        relationships = r;
        loadState = 'ready';
        notify();
        return { leads, sources, outreach, relationships };
    } catch (err) {
        loadState = 'error';
        loadError = err instanceof Error ? err.message : String(err);
        notify();
        throw err;
    }
}

/**
 * @param {ReturnType<typeof emptyLead>} lead
 * @param {{ silent?: boolean }} [opts]
 */
export async function saveRadarLead(lead, opts = {}) {
    const silent = Boolean(opts.silent);
    if (previewMode) {
        const now = '2026-08-26T12:00:00.000Z';
        const saved = emptyLead({
            ...lead,
            id: String(lead?.id || `preview-${leads.length + 1}`),
            updatedAt: now,
            createdAt: String(lead?.createdAt || now),
        });
        const idx = leads.findIndex((x) => x.id === saved.id);
        if (idx >= 0) leads[idx] = saved;
        else leads = [...leads, saved];
        if (!silent) notify();
        return saved;
    }
    const saved = await upsertRadarLead(lead);
    const idx = leads.findIndex((x) => x.id === saved.id);
    if (idx >= 0) leads[idx] = saved;
    else leads = [...leads, saved];
    if (!silent) notify();
    return saved;
}

/**
 * @param {Record<string, unknown>} src
 * @param {{ silent?: boolean }} [opts]
 */
export async function saveRadarSource(src, opts = {}) {
    const silent = Boolean(opts.silent);
    if (previewMode) {
        const saved = {
            id: String(src?.id || `preview-src-${sources.length + 1}`),
            sourceType: String(src?.sourceType || 'manualList'),
            label: String(src?.label || ''),
            url: String(src?.url || ''),
            query: String(src?.query || ''),
            regionKey: String(src?.regionKey || ''),
            enabled: src?.enabled !== false,
            lastRunAt: String(src?.lastRunAt || ''),
            runIntervalHours: Number(src?.runIntervalHours) || 24,
            createdAt: String(src?.createdAt || '2026-08-26T12:00:00.000Z'),
        };
        const idx = sources.findIndex((x) => x.id === saved.id);
        if (idx >= 0) sources[idx] = saved;
        else sources = [...sources, saved];
        if (!silent) notify();
        return saved;
    }
    const saved = await upsertRadarSource(src);
    const idx = sources.findIndex((x) => x.id === saved.id);
    if (idx >= 0) sources[idx] = saved;
    else sources = [...sources, saved];
    if (!silent) notify();
    return saved;
}

/**
 * @param {Record<string, unknown>} rec
 * @param {{ silent?: boolean }} [opts]
 */
export async function saveRadarOutreach(rec, opts = {}) {
    const silent = Boolean(opts.silent);
    if (previewMode) {
        const saved = {
            id: String(rec?.id || `preview-ro-${outreach.length + 1}`),
            leadId: String(rec?.leadId || ''),
            subject: String(rec?.subject || ''),
            bodyHtml: String(rec?.bodyHtml || ''),
            triggerEvent: String(rec?.triggerEvent || ''),
            templateId: String(rec?.templateId || ''),
            status: String(rec?.status || 'drafted'),
            draftedAt: String(rec?.draftedAt || '2026-08-26T12:00:00.000Z'),
            sentAt: String(rec?.sentAt || ''),
            repliedAt: String(rec?.repliedAt || ''),
        };
        const idx = outreach.findIndex((x) => x.id === saved.id);
        if (idx >= 0) outreach[idx] = saved;
        else outreach = [...outreach, saved];
        if (!silent) notify();
        return saved;
    }
    const saved = await upsertRadarOutreach(rec);
    const idx = outreach.findIndex((x) => x.id === saved.id);
    if (idx >= 0) outreach[idx] = saved;
    else outreach = [...outreach, saved];
    if (!silent) notify();
    return saved;
}

export async function removeRadarLead(id) {
    if (previewMode) {
        leads = leads.filter((l) => l.id !== id);
        notify();
        return;
    }
    await deleteRadarLead(id);
    leads = leads.filter((l) => l.id !== id);
    notify();
}

export async function refreshRadarStats() {
    return getRadarStats();
}
