import { describe, it, expect } from 'vitest';
import { interpolateRosterBlastTemplate } from './emailCampaignTemplates.js';

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
