import { describe, expect, it } from 'vitest';
import { emptyLead, filterLeads } from './radarModel.js';
import {
    buildRadarOutreachTestEmail,
    isRadarOutreachReadyToSend,
    wrapRadarOutreachHtml,
} from './radarOutreachReady.js';

describe('isRadarOutreachReadyToSend', () => {
    const lead = emptyLead({ id: '1', name: 'Maya', publicEmail: 'maya@example.com' });

    it('requires approved status, email, subject, and body', () => {
        expect(
            isRadarOutreachReadyToSend(
                { status: 'approved', subject: 'Hi', bodyHtml: 'Body' },
                lead,
            ),
        ).toBe(true);
        expect(
            isRadarOutreachReadyToSend(
                { status: 'drafted', subject: 'Hi', bodyHtml: 'Body' },
                lead,
            ),
        ).toBe(false);
        expect(
            isRadarOutreachReadyToSend(
                { status: 'approved', subject: 'Hi', bodyHtml: 'Body' },
                emptyLead({ publicEmail: '' }),
            ),
        ).toBe(false);
        expect(
            isRadarOutreachReadyToSend({ status: 'approved', subject: '', bodyHtml: 'Body' }, lead),
        ).toBe(false);
        expect(
            isRadarOutreachReadyToSend({ status: 'sent', subject: 'Hi', bodyHtml: 'Body' }, lead),
        ).toBe(false);
    });

    it('filterLeads can require a sheet red flag', () => {
        const flagged = emptyLead({
            name: 'Maya',
            payloadJson: JSON.stringify({ sheet: { redFlags: 'No English bio' } }),
        });
        const clean = emptyLead({ name: 'Rin', payloadJson: '{}' });
        expect(filterLeads([flagged, clean], { hasRedFlag: true })).toEqual([flagged]);
    });

    it('wraps plain outreach bodies in the Fusion email layout', () => {
        const html = wrapRadarOutreachHtml('Hello\nthere');
        expect(html).toContain('Hello<br/>there');
        expect(html).toContain('Fusion Art World');
        expect(wrapRadarOutreachHtml(html)).toBe(html);
    });

    it('does not flatten Fusion layout HTML to line breaks', () => {
        const branded = wrapRadarOutreachHtml('<p>Hello</p>');
        expect(branded).toContain('Fusion Art World');
        expect(wrapRadarOutreachHtml(branded)).toBe(branded);
        expect(branded).toContain('Hello');
        expect(branded).not.toContain('Hello<br/>');
    });
});

describe('buildRadarOutreachTestEmail', () => {
    it('sends a tagged copy to info@fusionart.world without requiring a lead address', () => {
        const payload = buildRadarOutreachTestEmail({
            subject: 'Join Fusion',
            body: '<p>Use {{DISCOUNT_CODE}} at {{JOIN_URL}}</p>',
            durationMonths: 2,
        });
        expect(payload.to).toBe('info@fusionart.world');
        expect(payload.subject).toBe('[TEST] Join Fusion');
        expect(payload.code).toBe('TEST-PREVIEW');
        expect(payload.html).toContain('TEST-PREVIEW');
        expect(payload.html).toContain('join-network?ref=TEST-PREVIEW');
        expect(payload.html).toContain('Fusion Art World');
    });

    it('keeps an existing [TEST] prefix and interpolates a real campaign code', () => {
        const payload = buildRadarOutreachTestEmail({
            subject: '[TEST] Already tagged',
            body: 'Code {{DISCOUNT_CODE}}',
            code: 'RADAR-KAGA26',
        });
        expect(payload.subject).toBe('[TEST] Already tagged');
        expect(payload.html).toContain('RADAR-KAGA26');
        expect(payload.html).not.toContain('TEST-PREVIEW');
    });

    it('requires subject and body', () => {
        expect(() => buildRadarOutreachTestEmail({ subject: '', body: 'Hi' })).toThrow(/Subject/);
        expect(() => buildRadarOutreachTestEmail({ subject: 'Hi', body: '' })).toThrow(/Body/);
    });
});
