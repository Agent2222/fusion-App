import { describe, it, expect } from 'vitest';
import {
    EMAIL_CAMPAIGN_TEMPLATES,
    getEmailTemplateById,
    interpolateRosterBlastTemplate,
    ROSTER_OPEN_CALL_TEMPLATE_ID,
} from './emailCampaignTemplates.js';
import { isFusionEmailLayout } from './emailFusionLayout.js';

describe('interpolateRosterBlastTemplate', () => {
    it('replaces tokens with HTML-escaped values', () => {
        const html = '<p>{{ARTIST_NAME}}</p><code>{{ACCESS_CODE}}</code>';
        const out = interpolateRosterBlastTemplate(html, {
            artistName: 'A & B',
            accessCode: '12345678',
        });
        expect(out).toContain('A &amp; B');
        expect(out).toContain('12345678');
        expect(out).not.toContain('{{ARTIST_NAME}}');
        expect(out).not.toContain('{{ACCESS_CODE}}');
    });


    it('supports first-name token derived from artistName', () => {
        const out = interpolateRosterBlastTemplate('<span>{{ARTIST_FIRST_NAME}}</span>', {
            artistName: 'Jane Doe',
            accessCode: '',
        });
        expect(out).toContain('Jane');
        expect(out).not.toContain('{{ARTIST_FIRST_NAME}}');
    });

    it('keeps full display name for configured artist exceptions', () => {
        const outA = interpolateRosterBlastTemplate('<span>{{ARTIST_FIRST_NAME}}</span>', {
            artistName: 'el JNGL',
            accessCode: '',
        });
        const outB = interpolateRosterBlastTemplate('<span>{{ARTIST_FIRST_NAME}}</span>', {
            artistName: 'Lady Pluuto',
            accessCode: '',
        });
        expect(outA).toContain('el JNGL');
        expect(outB).toContain('Lady Pluuto');
    });

    it('escapes angle brackets in names', () => {
        const out = interpolateRosterBlastTemplate('<span>{{ARTIST_NAME}}</span>', {
            artistName: '<script>',
            accessCode: '',
        });
        expect(out).toContain('&lt;script&gt;');
    });
});

describe('EMAIL_CAMPAIGN_TEMPLATES', () => {
    it('all built-in templates use fusion branded layout', () => {
        for (const tpl of Object.values(EMAIL_CAMPAIGN_TEMPLATES)) {
            expect(isFusionEmailLayout(tpl.bodyHtml), tpl.id).toBe(true);
        }
    });

    it('data-aware templates declare content source types', () => {
        expect(getEmailTemplateById('tpl_featured_artist')?.contentSourceTypes).toContain('artist');
        expect(getEmailTemplateById('tpl_journal_entry')?.contentSourceTypes).toContain('journal');
        expect(getEmailTemplateById('tpl_program_update')?.contentSourceTypes).toContain('program');
    });

    it('roster blast template keeps placeholders inside branded shell', () => {
        const tpl = EMAIL_CAMPAIGN_TEMPLATES[ROSTER_OPEN_CALL_TEMPLATE_ID];
        expect(tpl.bodyHtml).toContain('{{ARTIST_FIRST_NAME}}');
        expect(tpl.bodyHtml).toContain('{{ACCESS_CODE}}');
        expect(isFusionEmailLayout(tpl.bodyHtml)).toBe(true);
    });

    it('legacy tpl_artist_feature resolves to featured artist', () => {
        const legacy = getEmailTemplateById('tpl_artist_feature');
        const featured = getEmailTemplateById('tpl_featured_artist');
        expect(legacy?.contentSourceTypes).toEqual(featured?.contentSourceTypes);
    });
});
