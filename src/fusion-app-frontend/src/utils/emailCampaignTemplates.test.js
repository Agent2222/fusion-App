import { describe, it, expect } from 'vitest';
import {
    DRAW_GOAL_NOT_REACHED_TEMPLATE_ID,
    EMAIL_CAMPAIGN_TEMPLATES,
    getEmailTemplateById,
    interpolateRosterBlastTemplate,
    renderRadarTemplateHtml,
    ROSTER_OPEN_CALL_TEMPLATE_ID,
    templateRequiresTrialAccessPlaceholders,
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
        expect(getEmailTemplateById('tpl_onboarding')?.contentSourceTypes).toContain('website');
    });

    it('onboarding template CTAs to join-network', () => {
        const tpl = getEmailTemplateById('tpl_onboarding');
        expect(tpl?.bodyHtml).toContain('/join-network');
        expect(tpl?.templateGroup).toBe('campaigns');
    });

    it('features group includes audio recording template', () => {
        const tpl = getEmailTemplateById('tpl_audio_recording');
        expect(tpl?.templateGroup).toBe('features');
        expect(tpl?.bodyHtml).toContain('/settings/profile');
        expect(tpl?.bodyHtml.toLowerCase()).toMatch(/rough/);
        expect(tpl?.bodyHtml.toLowerCase()).toMatch(/voice/);
    });

    it('draw goal not reached uses General layout and trial placeholders', () => {
        const tpl = getEmailTemplateById(DRAW_GOAL_NOT_REACHED_TEMPLATE_ID);
        expect(tpl?.templateGroup).toBe('campaigns');
        expect(tpl?.requiresTrialAccessPlaceholders).toBe(true);
        expect(tpl?.bodyHtml).toContain('{{TRIAL_ACCESS_CODE}}');
        expect(tpl?.bodyHtml).toContain('{{TRIAL_JOIN_URL}}');
        expect(tpl?.bodyHtml.toLowerCase()).toMatch(/application credit/);
        expect(tpl?.bodyHtml.toLowerCase()).toMatch(/3-month/);
        expect(isFusionEmailLayout(tpl?.bodyHtml || '')).toBe(true);
        expect(templateRequiresTrialAccessPlaceholders(DRAW_GOAL_NOT_REACHED_TEMPLATE_ID, '')).toBe(true);
        expect(templateRequiresTrialAccessPlaceholders('', '<p>{{TRIAL_ACCESS_CODE}}</p>')).toBe(true);
        expect(templateRequiresTrialAccessPlaceholders('tpl_general', '<p>hello</p>')).toBe(false);
    });

    it('roster blast template keeps placeholders inside branded shell', () => {
        const tpl = EMAIL_CAMPAIGN_TEMPLATES[ROSTER_OPEN_CALL_TEMPLATE_ID];
        expect(tpl.bodyHtml).toContain('{{ARTIST_FIRST_NAME}}');
        expect(tpl.bodyHtml).toContain('{{ACCESS_CODE}}');
        expect(isFusionEmailLayout(tpl.bodyHtml)).toBe(true);
    });

    it('meet the artists template binds a program and links to the cohort page', () => {
        const tpl = getEmailTemplateById('tpl_program_artists');
        expect(tpl?.templateGroup).toBe('updates');
        expect(tpl?.contentSourceTypes).toContain('program');
        expect(isFusionEmailLayout(tpl?.bodyHtml || '')).toBe(true);
        expect(tpl?.bodyHtml).toMatch(/Meet The/i);
        expect(tpl?.bodyHtml).toContain('MEET THE ARTISTS');
        expect(tpl?.bodyHtml).toContain('/artists/');
        expect(tpl?.bodyHtml).not.toMatch(/link in bio/i);
        expect(tpl?.bodyHtml.toLowerCase()).toMatch(/interdisciplinary/);
        expect(tpl?.notes?.toLowerCase()).toMatch(/program/);
    });

    it('program calendar template binds a program source and uses the Kaga hero', () => {
        const tpl = getEmailTemplateById('tpl_program_calendar');
        expect(tpl?.templateGroup).toBe('updates');
        expect(tpl?.contentSourceTypes).toContain('program');
        expect(isFusionEmailLayout(tpl?.bodyHtml || '')).toBe(true);
        expect(tpl?.bodyHtml).toContain('/settings/profile');
        expect(tpl?.bodyHtml).toContain('VIEW CALENDAR');
        expect(tpl?.bodyHtml).not.toContain('OPEN SCHEDULE');
        expect(tpl?.bodyHtml).not.toContain('DOWNLOAD CALENDAR');
        expect(tpl?.bodyHtml).toContain('Week 1');
        expect(tpl?.bodyHtml).toContain('Week 2');
        expect(tpl?.bodyHtml).toContain('<hr');
        expect(tpl?.bodyHtml).toContain('<ul');
        expect(tpl?.bodyHtml).toContain('Calendar');
        expect(tpl?.bodyHtml).toContain('c34ec160-kaga_2.jpg');
        expect(tpl?.bodyHtml).not.toMatch(/your program<br>calendar/i);
        expect(tpl?.bodyHtml.toLowerCase()).toMatch(/special experience/);
    });

    it('program comms template uses communications pill and two-step QRs', () => {
        const tpl = getEmailTemplateById('tpl_program_comms_line');
        expect(tpl?.templateGroup).toBe('updates');
        expect(isFusionEmailLayout(tpl?.bodyHtml || '')).toBe(true);
        expect(tpl?.bodyHtml).toContain('COMMUNICATIONS');
        expect(tpl?.bodyHtml).toContain('Official Chat Rooms');
        expect(tpl?.bodyHtml).toContain('Step 1 — Download');
        expect(tpl?.bodyHtml).toContain('Step 2 — Join both rooms');
        expect(tpl?.bodyHtml).toContain('Travel preparation');
        expect(tpl?.bodyHtml).toContain('Suica');
        expect(tpl?.bodyHtml).toContain('Add to wallet');
        expect(tpl?.bodyHtml).not.toContain('#a2b792');
        expect(tpl?.bodyHtml).not.toMatch(/you are confirmed/i);
        expect(tpl?.defaultSubject).toMatch(/Official Chat Rooms/i);
    });

    it('follow up flight template reminds arrival time and lists travel prep', () => {
        const tpl = getEmailTemplateById('tpl_flight_followup');
        expect(tpl?.templateGroup).toBe('updates');
        expect(tpl?.contentSourceTypes).toContain('program');
        expect(isFusionEmailLayout(tpl?.bodyHtml || '')).toBe(true);
        expect(tpl?.bodyHtml).toContain('FLIGHT FOLLOW-UP');
        expect(tpl?.bodyHtml).toContain('ADD ARRIVAL TIME');
        expect(tpl?.bodyHtml).toContain('/settings/profile#travel');
        expect(tpl?.bodyHtml).toContain('Travel preparation');
        expect(tpl?.bodyHtml).toContain('Suica');
        expect(tpl?.bodyHtml).toContain('Add to wallet');
        expect(tpl?.bodyHtml).not.toContain('Confirmation number');
        expect(tpl?.bodyHtml).not.toContain('#a2b792');
        expect(tpl?.defaultSubject).toMatch(/arrival date and time/i);
    });

    it('legacy tpl_artist_feature resolves to featured artist', () => {
        const legacy = getEmailTemplateById('tpl_artist_feature');
        const featured = getEmailTemplateById('tpl_featured_artist');
        expect(legacy?.contentSourceTypes).toEqual(featured?.contentSourceTypes);
    });

    it('Radar artist invite exists and interpolates join URL plus code', () => {
        const tpl = getEmailTemplateById('tpl_radar_artists');
        expect(tpl?.id).toBe('tpl_radar_artists');
        expect(tpl?.bodyHtml).toContain('{{DISCOUNT_CODE}}');
        expect(tpl?.bodyHtml).toContain('{{JOIN_URL}}');
        expect(tpl?.bodyHtml).toMatch(/JOIN FUSION/i);
        const html = renderRadarTemplateHtml({
            templateId: 'tpl_radar_artists',
            code: 'RADAR-A7K2',
            durationMonths: 3,
        });
        expect(html).toContain('RADAR-A7K2');
        expect(html).toContain('50% off first 3 months');
        expect(html).toContain('/join-network?ref=RADAR-A7K2');
        expect(html).not.toContain('{{DISCOUNT_CODE}}');
        expect(html).not.toContain('{{JOIN_URL}}');
        expect(isFusionEmailLayout(html)).toBe(true);
    });
});
