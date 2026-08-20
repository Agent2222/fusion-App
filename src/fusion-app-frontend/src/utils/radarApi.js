/**
 * Fusion Radar API — localStorage in test mode; fusion-radar canister in live mode.
 */
import { Principal } from '@dfinity/principal';
import { getDataSource } from './database.js';
import { getRadarActor, anonymousPrincipal } from './radarActor.js';
import {
    emptyLead,
    leadToCandid,
    mapLeadFromCandid,
    toVariant,
    variantKey,
} from './radarModel.js';

const LS_LEADS = 'fusion-radar-leads-v1';
const LS_RELS = 'fusion-radar-rels-v1';
const LS_OUTREACH = 'fusion-radar-outreach-v1';
const LS_SOURCES = 'fusion-radar-sources-v1';
const LS_TRIGGERS = 'fusion-radar-triggers-v1';

function isTest() {
    try {
        return getDataSource() === 'test';
    } catch {
        return true;
    }
}

/**
 * @param {string} key
 * @param {unknown} fallback
 */
function lsGet(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

/**
 * @param {string} key
 * @param {unknown} val
 */
function lsSet(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
}

function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function listRadarLeads() {
    if (isTest()) {
        return (lsGet(LS_LEADS, []) || []).map((x) => emptyLead(x));
    }
    const actor = await getRadarActor();
    const rows = await actor.staffListRadarLeads();
    return (Array.isArray(rows) ? rows : []).map(mapLeadFromCandid);
}

export async function getRadarLead(id) {
    const all = await listRadarLeads();
    return all.find((l) => l.id === id) || null;
}

export async function upsertRadarLead(lead) {
    const base = emptyLead(lead);
    if (isTest()) {
        const all = (lsGet(LS_LEADS, []) || []).map((x) => emptyLead(x));
        if (!base.id) base.id = uid('rl');
        base.updatedAt = new Date().toISOString();
        if (!base.createdAt) base.createdAt = base.updatedAt;
        const idx = all.findIndex((l) => l.id === base.id);
        if (idx >= 0) all[idx] = base;
        else all.push(base);
        lsSet(LS_LEADS, all);
        return base;
    }
    const actor = await getRadarActor();
    const principal = anonymousPrincipal();
    try {
        const { getIdentityIfAuthenticated } = await import('./icAuth.js');
        const id = await getIdentityIfAuthenticated();
        if (id) {
            // use caller principal from identity when available
        }
    } catch {
        /* keep anonymous */
    }
    const saved = await actor.staffUpsertRadarLead(leadToCandid(base, principal));
    return mapLeadFromCandid(saved);
}

export async function deleteRadarLead(id) {
    if (isTest()) {
        const all = (lsGet(LS_LEADS, []) || []).filter((l) => String(l.id) !== String(id));
        lsSet(LS_LEADS, all);
        return true;
    }
    const actor = await getRadarActor();
    return Boolean(await actor.staffDeleteRadarLead(String(id)));
}

export async function bulkUpsertRadarLeads(leads) {
    let n = 0;
    for (const lead of leads || []) {
        await upsertRadarLead(lead);
        n += 1;
    }
    return n;
}

export async function listRadarRelationships(leadId = '') {
    if (isTest()) {
        const all = lsGet(LS_RELS, []) || [];
        if (!leadId) return all;
        return all.filter((r) => r.fromLeadId === leadId || r.toLeadId === leadId);
    }
    const actor = await getRadarActor();
    const rows = await actor.staffListRadarRelationships(String(leadId || ''));
    return (Array.isArray(rows) ? rows : []).map((r) => ({
        id: String(r.id || ''),
        fromLeadId: String(r.fromLeadId || ''),
        toLeadId: String(r.toLeadId || ''),
        kind: variantKey(r.kind),
        label: String(r.edgeLabel || r.label || ''),
        evidence: String(r.evidence || ''),
        createdAt: String(r.createdAt || ''),
    }));
}

export async function upsertRadarRelationship(rel) {
    const row = {
        id: String(rel.id || ''),
        fromLeadId: String(rel.fromLeadId || ''),
        toLeadId: String(rel.toLeadId || ''),
        kind: String(rel.kind || 'collaboratesWith'),
        label: String(rel.label || ''),
        evidence: String(rel.evidence || ''),
        createdAt: String(rel.createdAt || ''),
    };
    if (isTest()) {
        const all = lsGet(LS_RELS, []) || [];
        if (!row.id) {
            row.id = uid('rr');
            row.createdAt = new Date().toISOString();
        }
        const idx = all.findIndex((x) => x.id === row.id);
        if (idx >= 0) all[idx] = row;
        else all.push(row);
        lsSet(LS_RELS, all);
        return row;
    }
    const actor = await getRadarActor();
    const saved = await actor.staffUpsertRadarRelationship({
        id: row.id,
        fromLeadId: row.fromLeadId,
        toLeadId: row.toLeadId,
        kind: toVariant(row.kind),
        edgeLabel: row.label,
        evidence: row.evidence,
        createdAt: row.createdAt,
    });
    return {
        id: String(saved.id),
        fromLeadId: String(saved.fromLeadId),
        toLeadId: String(saved.toLeadId),
        kind: variantKey(saved.kind),
        label: String(saved.edgeLabel || ''),
        evidence: String(saved.evidence || ''),
        createdAt: String(saved.createdAt || ''),
    };
}

export async function deleteRadarRelationship(id) {
    if (isTest()) {
        lsSet(
            LS_RELS,
            (lsGet(LS_RELS, []) || []).filter((r) => r.id !== id),
        );
        return true;
    }
    const actor = await getRadarActor();
    return Boolean(await actor.staffDeleteRadarRelationship(String(id)));
}

export async function listRadarOutreach(leadId = '') {
    if (isTest()) {
        const all = lsGet(LS_OUTREACH, []) || [];
        if (!leadId) return all;
        return all.filter((o) => o.leadId === leadId);
    }
    const actor = await getRadarActor();
    const rows = await actor.staffListRadarOutreach(String(leadId || ''));
    return (Array.isArray(rows) ? rows : []).map((o) => ({
        id: String(o.id || ''),
        leadId: String(o.leadId || ''),
        subject: String(o.subject || ''),
        bodyHtml: String(o.bodyHtml || ''),
        triggerEvent: String(o.triggerEvent || ''),
        templateId: String(o.templateId || ''),
        status: variantKey(o.status) || 'drafted',
        draftedAt: String(o.draftedAt || ''),
        sentAt: String(o.sentAt || ''),
        repliedAt: String(o.repliedAt || ''),
    }));
}

export async function upsertRadarOutreach(rec) {
    const row = {
        id: String(rec.id || ''),
        leadId: String(rec.leadId || ''),
        subject: String(rec.subject || ''),
        bodyHtml: String(rec.bodyHtml || ''),
        triggerEvent: String(rec.triggerEvent || ''),
        templateId: String(rec.templateId || ''),
        status: String(rec.status || 'drafted'),
        draftedAt: String(rec.draftedAt || ''),
        sentAt: String(rec.sentAt || ''),
        repliedAt: String(rec.repliedAt || ''),
    };
    if (isTest()) {
        const all = lsGet(LS_OUTREACH, []) || [];
        if (!row.id) {
            row.id = uid('ro');
            row.draftedAt = new Date().toISOString();
        }
        const idx = all.findIndex((x) => x.id === row.id);
        if (idx >= 0) all[idx] = row;
        else all.push(row);
        lsSet(LS_OUTREACH, all);
        return row;
    }
    const actor = await getRadarActor();
    const saved = await actor.staffUpsertRadarOutreach({
        id: row.id,
        leadId: row.leadId,
        subject: row.subject,
        bodyHtml: row.bodyHtml,
        triggerEvent: row.triggerEvent,
        templateId: row.templateId,
        status: toVariant(row.status),
        draftedAt: row.draftedAt,
        approvedBy: [],
        sentAt: row.sentAt,
        repliedAt: row.repliedAt,
    });
    return {
        id: String(saved.id),
        leadId: String(saved.leadId),
        subject: String(saved.subject),
        bodyHtml: String(saved.bodyHtml),
        triggerEvent: String(saved.triggerEvent),
        templateId: String(saved.templateId),
        status: variantKey(saved.status),
        draftedAt: String(saved.draftedAt),
        sentAt: String(saved.sentAt),
        repliedAt: String(saved.repliedAt),
    };
}

export async function listRadarSources() {
    if (isTest()) {
        return lsGet(LS_SOURCES, []) || [];
    }
    const actor = await getRadarActor();
    const rows = await actor.staffListRadarSources();
    return (Array.isArray(rows) ? rows : []).map((s) => ({
        id: String(s.id || ''),
        sourceType: variantKey(s.sourceType),
        label: String(s.sourceLabel || s.label || ''),
        url: String(s.url || ''),
        query: String(s.searchQuery || s.query || ''),
        regionKey: String(s.regionKey || ''),
        enabled: Boolean(s.enabled),
        lastRunAt: String(s.lastRunAt || ''),
        runIntervalHours: Number(s.runIntervalHours) || 24,
        createdAt: String(s.createdAt || ''),
    }));
}

export async function upsertRadarSource(src) {
    const row = {
        id: String(src.id || ''),
        sourceType: String(src.sourceType || 'manualList'),
        label: String(src.label || ''),
        url: String(src.url || ''),
        query: String(src.query || ''),
        regionKey: String(src.regionKey || ''),
        enabled: src.enabled !== false,
        lastRunAt: String(src.lastRunAt || ''),
        runIntervalHours: Number(src.runIntervalHours) || 24,
        createdAt: String(src.createdAt || ''),
    };
    if (isTest()) {
        const all = lsGet(LS_SOURCES, []) || [];
        if (!row.id) {
            row.id = uid('rs');
            row.createdAt = new Date().toISOString();
        }
        const idx = all.findIndex((x) => x.id === row.id);
        if (idx >= 0) all[idx] = row;
        else all.push(row);
        lsSet(LS_SOURCES, all);
        return row;
    }
    const actor = await getRadarActor();
    const saved = await actor.staffUpsertRadarSource({
        id: row.id,
        sourceType: toVariant(row.sourceType),
        sourceLabel: row.label,
        url: row.url,
        searchQuery: row.query,
        regionKey: row.regionKey,
        enabled: row.enabled,
        lastRunAt: row.lastRunAt,
        runIntervalHours: BigInt(row.runIntervalHours),
        createdAt: row.createdAt,
    });
    return {
        id: String(saved.id),
        sourceType: variantKey(saved.sourceType),
        label: String(saved.sourceLabel || ''),
        url: String(saved.url),
        query: String(saved.searchQuery || ''),
        regionKey: String(saved.regionKey),
        enabled: Boolean(saved.enabled),
        lastRunAt: String(saved.lastRunAt),
        runIntervalHours: Number(saved.runIntervalHours),
        createdAt: String(saved.createdAt),
    };
}

export async function deleteRadarSource(id) {
    if (isTest()) {
        lsSet(
            LS_SOURCES,
            (lsGet(LS_SOURCES, []) || []).filter((s) => s.id !== id),
        );
        return true;
    }
    const actor = await getRadarActor();
    return Boolean(await actor.staffDeleteRadarSource(String(id)));
}

export async function scoreRadarLeadOnCanister(leadId, fusionContext = '') {
    if (isTest()) {
        return JSON.stringify({
            dimensions: [
                { name: 'Alignment', score: 80, reasoning: 'Test mode heuristic' },
                { name: 'Japan relevance', score: 70, reasoning: 'Test mode' },
                { name: 'Career stage', score: 75, reasoning: 'Test mode' },
                { name: 'Activity', score: 72, reasoning: 'Test mode' },
                { name: 'Relationship value', score: 78, reasoning: 'Test mode' },
                { name: 'Reachability', score: 65, reasoning: 'Test mode' },
            ],
            totalScore: 74,
            rationale:
                'Test-mode score for development. Strong conceptual fit for Fusion programs rooted in Japan.',
            recommendedOpportunity: 'Kaga residency conversation',
            concern: 'Verify public contact path before outreach.',
            bestOpeningTopic: 'Recent exhibition or material practice',
            supportingSources: [],
        });
    }
    const actor = await getRadarActor();
    return String(await actor.staffScoreRadarLead(String(leadId), String(fusionContext || '')));
}

export async function draftRadarOutreachOnCanister(leadId, triggerContext = '') {
    if (isTest()) {
        return JSON.stringify({
            subject: 'A note from Fusion — programs rooted in Japan',
            body: 'I came across your recent work and wanted to reach out personally about Fusion’s curated art network and residencies rooted in Japan.',
            recommendedSendTiming: 'Within the next week',
        });
    }
    const actor = await getRadarActor();
    return String(await actor.staffDraftRadarOutreach(String(leadId), String(triggerContext || '')));
}

export async function enrichRadarFromText(sourceText) {
    if (isTest()) {
        return JSON.stringify({
            name: 'Example Lead',
            leadType: 'artist',
            location: 'Brooklyn',
            discipline: 'Installation',
            careerStage: 'emerging',
            website: '',
            publicEmail: '',
            instagram: '',
            representation: '',
            recentActivity: 'Recent exhibition',
            japanConnection: '',
            discoveryReason: 'Manual enrich (test)',
            fusionFit: 'Residency candidate',
        });
    }
    const actor = await getRadarActor();
    return String(await actor.staffEnrichFromText(String(sourceText || '')));
}

export async function getRadarStats() {
    const leads = await listRadarLeads();
    const outreach = await listRadarOutreach('');
    const sum = leads.reduce((a, l) => a + (Number(l.aiScore) || 0), 0);
    return {
        totalLeads: leads.length,
        avgScore: leads.length ? Math.round(sum / leads.length) : 0,
        outreachDrafted: outreach.filter((o) => o.status === 'drafted' || o.status === 'approved')
            .length,
        outreachSent: outreach.filter((o) => o.status === 'sent' || o.status === 'replied').length,
        outreachReplied: outreach.filter((o) => o.status === 'replied').length,
        leads,
        outreach,
    };
}

export function getRadarTriggerConfig() {
    return lsGet(LS_TRIGGERS, {
        enabled: ['manual', 'new_exhibition', 'japan_program'],
        autoDraft: true,
    });
}

export function setRadarTriggerConfig(cfg) {
    lsSet(LS_TRIGGERS, cfg);
}

export async function bootstrapRadarAdmin() {
    if (isTest()) return false;
    const actor = await getRadarActor();
    if (typeof actor.bootstrapAdminIfEmpty !== 'function') return false;
    return Boolean(await actor.bootstrapAdminIfEmpty());
}

// silence unused Principal import warning if tree-shaken differently
void Principal;
