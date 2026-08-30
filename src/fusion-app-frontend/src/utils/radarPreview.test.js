import { describe, expect, it } from 'vitest';
import {
    RADAR_PREVIEW_TABS,
    parseRadarPreviewQuery,
} from './radarPreview.js';
import {
    RADAR_PREVIEW_LEAD_IDS,
    buildRadarPreviewLeads,
    buildRadarPreviewWorkspace,
    emptyRadarPreviewWorkspace,
} from './radarPreviewFixtures.js';
import { RADAR_PIPELINE_STATUSES, filterLeads } from './radarModel.js';

describe('parseRadarPreviewQuery', () => {
    it('requires radarPreview=1', () => {
        expect(parseRadarPreviewQuery('tab=discover').flagged).toBe(false);
        expect(parseRadarPreviewQuery('radarPreview=1').flagged).toBe(true);
        expect(parseRadarPreviewQuery('?radarPreview=1&tab=leads').tab).toBe('leads');
    });

    it('accepts known tabs only', () => {
        for (const tab of RADAR_PREVIEW_TABS) {
            expect(parseRadarPreviewQuery(`radarPreview=1&tab=${tab}`).tab).toBe(tab);
        }
        expect(parseRadarPreviewQuery('radarPreview=1&tab=finance').tab).toBe('');
    });

    it('reads empty and lead flags', () => {
        const q = parseRadarPreviewQuery(
            'radarPreview=1&radarEmpty=1&radarLead=rl-maya',
        );
        expect(q.empty).toBe(true);
        expect(q.leadId).toBe('rl-maya');
    });
});

describe('radar preview fixtures', () => {
    it('covers named scored leads plus later pipeline statuses for the Later column', () => {
        const leads = buildRadarPreviewLeads();
        expect(leads.length).toBeGreaterThanOrEqual(8);
        expect(leads.some((l) => l.id === RADAR_PREVIEW_LEAD_IDS.maya && l.aiScore >= 80)).toBe(
            true,
        );
        const statuses = new Set(leads.map((l) => l.status));
        for (const hidden of ['replied', 'connected', 'rejected', 'archived']) {
            expect(statuses.has(hidden)).toBe(true);
        }
        const boardStatuses = new Set(RADAR_PIPELINE_STATUSES);
        expect(leads.some((l) => !boardStatuses.has(l.status))).toBe(true);
    });

    it('leaves researching empty so Discover can show an empty column', () => {
        const leads = buildRadarPreviewLeads();
        expect(leads.filter((l) => l.status === 'researching')).toHaveLength(0);
        expect(leads.filter((l) => l.status === 'discovered').length).toBeGreaterThan(0);
    });

    it('includes outreach, sources, and relationships for the other tabs', () => {
        const ws = buildRadarPreviewWorkspace();
        expect(ws.sources.length).toBeGreaterThan(0);
        expect(ws.sources.some((s) => s.enabled === false)).toBe(true);
        expect(ws.outreach.some((o) => o.status === 'drafted')).toBe(true);
        expect(ws.outreach.some((o) => o.status === 'sent')).toBe(true);
        expect(ws.relationships.length).toBeGreaterThan(0);
        expect(filterLeads(ws.leads, { q: 'kaga' }).some((l) => l.id === RADAR_PREVIEW_LEAD_IDS.maya)).toBe(
            true,
        );
    });

    it('empty workspace has no rows', () => {
        const empty = emptyRadarPreviewWorkspace();
        expect(empty.leads).toEqual([]);
        expect(empty.sources).toEqual([]);
        expect(empty.outreach).toEqual([]);
        expect(empty.relationships).toEqual([]);
    });
});
