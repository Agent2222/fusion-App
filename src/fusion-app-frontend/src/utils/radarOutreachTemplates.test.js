import { describe, expect, it, vi } from 'vitest';
import { renderRadarTemplateHtml } from './emailCampaignTemplates.js';
import {
    applyRadarHeroToHtml,
    builtinRadarTemplateDraft,
    loadRadarTemplateDraft,
    pickRadarTemplateOverride,
    radarDefaultCampaignId,
    radarDefaultCampaignMarker,
    radarTemplateOverrideToCampaign,
    saveRadarTemplateDraft,
} from './radarOutreachTemplates.js';

describe('radarOutreachTemplates', () => {
    it('swaps the Fusion hero and keeps discount placeholders', () => {
        const html = renderRadarTemplateHtml({ templateId: 'tpl_radar_artists' });
        expect(html).toContain('{{DISCOUNT_CODE}}');
        expect(html).toContain('{{JOIN_URL}}');
        const next = applyRadarHeroToHtml(html, {
            url: 'https://cdn.example/hero-from-site.jpg',
            alt: 'Program hero',
        });
        expect(next).toContain('https://cdn.example/hero-from-site.jpg');
        expect(next).toContain('{{DISCOUNT_CODE}}');
        expect(next).toContain('{{JOIN_URL}}');
        expect(next).not.toContain('TEST-PREVIEW');
    });

    it('picks a saved override by stable id, marker, or title', () => {
        const rows = [
            { id: 'ec-other', internalNotes: '', templateId: ['tpl_radar_artists'], title: ['Other'] },
            {
                id: 'ec-saved',
                internalNotes: radarDefaultCampaignMarker('tpl_radar_artists'),
                templateId: ['tpl_radar_artists'],
                title: ['Radar default — tpl_radar_artists'],
                htmlBody: '<p>Saved</p>',
            },
        ];
        expect(pickRadarTemplateOverride(rows, 'tpl_radar_artists')?.id).toBe('ec-saved');
        expect(
            pickRadarTemplateOverride(
                [{ id: radarDefaultCampaignId('tpl_radar_gallery_intro'), htmlBody: '<p>X</p>' }],
                'tpl_radar_gallery_intro',
            )?.id,
        ).toBe(radarDefaultCampaignId('tpl_radar_gallery_intro'));
    });

    it('loads a saved override through the injectable fetch', async () => {
        const builtin = builtinRadarTemplateDraft('tpl_radar_artists', 1);
        const fetchOverride = vi.fn(async () => ({
            subject: 'Custom Radar subject',
            htmlBody: builtin.htmlBody.replace('You belong', 'You are invited'),
        }));
        const draft = await loadRadarTemplateDraft('tpl_radar_artists', 1, { fetchOverride });
        expect(draft.source).toBe('saved');
        expect(draft.subject).toBe('Custom Radar subject');
        expect(draft.htmlBody).toContain('You are invited');
        expect(draft.htmlBody).toContain('{{DISCOUNT_CODE}}');
    });

    it('falls back to the builtin when no override exists', async () => {
        const draft = await loadRadarTemplateDraft('tpl_radar_artists', 1, {
            fetchOverride: async () => null,
        });
        expect(draft.source).toBe('builtin');
        expect(draft.subject).toMatch(/invitation to Fusion/i);
        expect(draft.htmlBody).toContain('{{DISCOUNT_CODE}}');
    });

    it('saves an override campaign with empty id on first write', async () => {
        const builtin = builtinRadarTemplateDraft('tpl_radar_artists', 1);
        const upsert = vi.fn(async (rec) => rec.id || 'ec-test-1');
        const id = await saveRadarTemplateDraft(
            {
                templateId: 'tpl_radar_artists',
                subject: 'Staff default',
                htmlBody: builtin.htmlBody,
            },
            { fetchOverride: async () => null, upsert },
        );
        expect(id).toBe('ec-test-1');
        expect(upsert).toHaveBeenCalledTimes(1);
        const rec = upsert.mock.calls[0][0];
        expect(rec.id).toBe('');
        expect(rec.subject).toBe('Staff default');
        expect(rec.internalNotes).toBe(radarDefaultCampaignMarker('tpl_radar_artists'));
        expect(rec.templateId).toEqual(['tpl_radar_artists']);
        expect(rec.htmlBody).toContain('{{DISCOUNT_CODE}}');
    });

    it('updates the existing campaign id on later saves', async () => {
        const existing = {
            id: 'ec-radar-1',
            createdAt: '2026-01-01T00:00:00.000Z',
            createdBy: { toText: () => 'aaaaa-aa' },
        };
        const upsert = vi.fn(async (rec) => rec.id);
        await saveRadarTemplateDraft(
            { templateId: 'tpl_radar_artists', subject: 'Updated', htmlBody: '<p>{{DISCOUNT_CODE}}</p>' },
            { fetchOverride: async () => existing, upsert },
        );
        const rec = upsert.mock.calls[0][0];
        expect(rec.id).toBe('ec-radar-1');
        expect(radarTemplateOverrideToCampaign({ templateId: 'tpl_radar_artists' }, existing).id).toBe(
            'ec-radar-1',
        );
    });
});
