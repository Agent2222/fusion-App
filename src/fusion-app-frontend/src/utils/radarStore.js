/**
 * Reactive Radar client store.
 */
import {
    deleteRadarLead,
    getRadarStats,
    listRadarLeads,
    listRadarOutreach,
    listRadarRelationships,
    listRadarSources,
    upsertRadarLead,
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

export async function loadRadarWorkspace() {
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

export async function saveRadarLead(lead) {
    const saved = await upsertRadarLead(lead);
    const idx = leads.findIndex((x) => x.id === saved.id);
    if (idx >= 0) leads[idx] = saved;
    else leads = [...leads, saved];
    notify();
    return saved;
}

export async function removeRadarLead(id) {
    await deleteRadarLead(id);
    leads = leads.filter((l) => l.id !== id);
    notify();
}

export async function refreshRadarStats() {
    return getRadarStats();
}
