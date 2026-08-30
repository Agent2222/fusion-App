import { describe, expect, it } from 'vitest';
import { emptyLead } from './radarModel.js';
import {
    ARTIST_LEADS_SHEET_COLUMNS,
    artistLeadsTemplateCsv,
    classifyArtistLeadsCsv,
    findArtistLeadsSheetSource,
    findMatchingLead,
    getLeadSheetExtras,
    isSheetNewer,
    leadsToArtistSheetCsv,
    mapSheetStatus,
    mergeRadarLeadFromSheet,
    normalizeEmail,
    normalizeInstagram,
    sheetRowToLead,
} from './radarLeadImport.js';

describe('artist leads sheet map', () => {
    it('maps sheet columns and status synonyms', () => {
        expect(mapSheetStatus('new').status).toBe('discovered');
        expect(mapSheetStatus('pass').status).toBe('rejected');
        expect(mapSheetStatus('weird-custom').status).toBe('discovered');
        expect(mapSheetStatus('weird-custom').rawStatus).toBe('weird-custom');
        expect(normalizeInstagram('@Maya.Fujita')).toBe('maya.fujita');
        expect(normalizeInstagram('https://instagram.com/Maya.Fujita/')).toBe('maya.fujita');
        expect(normalizeEmail('  A@B.COM ')).toBe('a@b.com');

        const parsed = sheetRowToLead({
            name: 'Maya Fujita',
            email: 'maya@example.com',
            instagram: '@maya.fujita',
            website: 'https://maya.example',
            medium: 'Painting',
            location: 'Tokyo, Japan',
            fit_score: '86',
            status: 'new',
            discount_code: 'KAGA26',
            why_fit: 'Kaga residency fit',
            source_url: 'https://sheet.example/maya',
            public_contact: '',
            red_flags: 'No English bio',
            date_added: '2026-04-12',
            notes: 'From roster',
        });
        expect(parsed.ok).toBe(true);
        expect(parsed.lead?.status).toBe('discovered');
        expect(parsed.lead?.discipline).toBe('Painting');
        expect(parsed.lead?.regionKey).toBe('tokyo');
        expect(parsed.lead?.aiScore).toBe(86);
        expect(getLeadSheetExtras(parsed.lead).discountCode).toBe('KAGA26');
        expect(getLeadSheetExtras(parsed.lead).redFlags).toBe('No English bio');
    });

    it('rejects rows without name or a contact handle', () => {
        expect(sheetRowToLead({ name: '', email: 'a@b.com' }).ok).toBe(false);
        expect(sheetRowToLead({ name: 'X' }).ok).toBe(false);
        expect(sheetRowToLead({ name: 'X', website: 'https://x.example' }).ok).toBe(true);
        expect(sheetRowToLead({ name: 'X', public_contact: 'x@y.com' }).ok).toBe(true);
        expect(sheetRowToLead({ name: 'X', public_contact: 'x@y.com' }).lead?.publicEmail).toBe('x@y.com');
    });

    it('merges empty fields and overwrites score/status only when the sheet is newer', () => {
        const existing = emptyLead({
            id: 'rl-1',
            name: 'Maya',
            publicEmail: 'maya@example.com',
            status: 'qualified',
            aiScore: 70,
            fusionFit: '',
            updatedAt: '2026-08-01T00:00:00.000Z',
            payloadJson: JSON.stringify({ lastScore: { totalScore: 70 }, feedback: [{ action: 'accept' }] }),
        });
        const incoming = sheetRowToLead({
            name: 'Maya Fujita',
            email: 'maya@example.com',
            why_fit: 'Kaga',
            fit_score: '90',
            status: 'contacted',
            discount_code: 'KAGA26',
            date_added: '2026-03-01',
        }).lead;
        const older = mergeRadarLeadFromSheet(existing, incoming, { sheetNewer: false });
        expect(older.status).toBe('qualified');
        expect(older.aiScore).toBe(70);
        expect(older.fusionFit).toBe('Kaga');
        expect(getLeadSheetExtras(older).discountCode).toBe('KAGA26');
        expect(JSON.parse(older.payloadJson).lastScore.totalScore).toBe(70);

        const newer = mergeRadarLeadFromSheet(existing, incoming, { sheetNewer: true });
        expect(newer.status).toBe('contacted');
        expect(newer.aiScore).toBe(90);
        expect(isSheetNewer('2026-01-01', '2026-06-01')).toBe(true);
        expect(isSheetNewer('2026-08-01', '2026-03-01')).toBe(false);
    });

    it('matches by email then instagram and classifies csv', () => {
        const a = emptyLead({ id: '1', publicEmail: 'maya@example.com', name: 'Maya' });
        const b = emptyLead({ id: '2', instagram: 'rin.t', name: 'Rin' });
        expect(findMatchingLead([a, b], emptyLead({ publicEmail: 'MAYA@example.com' }))?.id).toBe('1');
        expect(findMatchingLead([a, b], emptyLead({ instagram: '@rin.t' }))?.id).toBe('2');

        const csv = `${ARTIST_LEADS_SHEET_COLUMNS.join(',')}
Maya Fujita,maya@example.com,@maya,https://m.example,Painting,"Tokyo, Japan",86,new,KAGA26,Fit,https://src,maya@example.com,flag,2026-04-12,note
,nobody@x.com,,,,,,,,,,,,,
Rin Takahashi,,@rin.t,,Ceramics,"Kanazawa, Japan",79,qualified,,Craft,,,,2026-04-12,
`;
        const classified = classifyArtistLeadsCsv(csv, [a]);
        expect(classified.toMerge).toHaveLength(1);
        expect(classified.toCreate).toHaveLength(1);
        expect(classified.invalid.some((x) => x.reasons.includes('missing name'))).toBe(true);
        expect(classified.toCreate[0].lead.name).toBe('Rin Takahashi');
    });

    it('round-trips template headers and export columns', () => {
        const tpl = artistLeadsTemplateCsv().trim();
        expect(tpl).toBe(ARTIST_LEADS_SHEET_COLUMNS.join(','));
        const lead = sheetRowToLead({
            name: 'Maya Fujita',
            email: 'maya@example.com',
            discount_code: 'KAGA26',
            red_flags: 'bio',
            medium: 'Painting',
        }).lead;
        const csv = leadsToArtistSheetCsv([lead]);
        const header = csv.split('\n')[0];
        expect(header).toBe(ARTIST_LEADS_SHEET_COLUMNS.join(','));
        expect(csv).toContain('KAGA26');
        expect(csv).toContain('Painting');
    });

    it('finds the artist leads sheet source by label', () => {
        expect(findArtistLeadsSheetSource([{ id: '1', label: 'Artist leads sheet' }])?.id).toBe('1');
        expect(findArtistLeadsSheetSource([{ id: '2', label: 'Other' }])).toBeNull();
    });
});
