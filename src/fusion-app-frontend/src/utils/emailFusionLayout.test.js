import { describe, it, expect } from 'vitest';
import {
    FUSION_EMAIL_LAYOUT_MARKER,
    FUSION_EMAIL_STYLES,
    defaultProgramUpdateLayoutSlots,
    emailHeroImageBlock,
    emailHeroMediaBlock,
    emailInlineImageBlock,
    escapeHtmlForEmailLayout,
    extractFusionEmailSlots,
    fusionEmailLayout,
    fusionEmailParagraph,
    isFusionEmailLayout,
    normalizeFusionEmailBodyHtml,
    renderFusionEmailFromSlots,
} from './emailFusionLayout.js';

describe('emailFusionLayout', () => {
    it('includes layout marker and branded tokens', () => {
        const html = fusionEmailLayout({
            eyebrow: 'Program Update',
            pillLabel: 'RESIDENCY',
            headlineHtml: 'Test<br>Headline',
            bodyHtml: '<p>Body</p>',
            cta: { label: 'APPLY', href: 'https://www.fusionart.world' },
        });
        expect(html).toContain(FUSION_EMAIL_LAYOUT_MARKER);
        expect(html).toContain('#faf3f4');
        expect(html).toContain('#c12525');
        expect(html).toContain('momochidori-variable');
        expect(html).toContain('Fusion Team');
    });

    it('detects fusion layout marker', () => {
        const html = fusionEmailLayout({ eyebrow: 'Test' });
        expect(isFusionEmailLayout(html)).toBe(true);
        expect(isFusionEmailLayout('<div>plain</div>')).toBe(false);
    });

    it('escapes eyebrow text', () => {
        const html = fusionEmailLayout({ eyebrow: '<script>' });
        expect(html).toContain('&lt;script&gt;');
        expect(html).not.toContain('<script>');
    });

    it('omits hero block when URL empty', () => {
        const html = fusionEmailLayout({ heroImageUrl: '' });
        expect(html).not.toContain('max-width:552px');
    });

    it('renders hero and inline image helpers', () => {
        const hero = emailHeroImageBlock('https://cdn.example/hero.jpg', 'Hero alt');
        expect(hero).toContain('552');
        expect(hero).toContain('Hero alt');

        const inline = emailInlineImageBlock('https://cdn.example/x.jpg', 'A & B');
        expect(inline).toContain('max-width:100%');
        expect(inline).toContain('A &amp; B');
    });

    it('renderFusionEmailFromSlots delegates to fusionEmailLayout', () => {
        const html = renderFusionEmailFromSlots({ eyebrow: 'Journal', pillLabel: 'JOURNAL' });
        expect(isFusionEmailLayout(html)).toBe(true);
        expect(html).toContain('Journal');
    });

    it('escapeHtmlForEmailLayout handles quotes', () => {
        expect(escapeHtmlForEmailLayout('"test"')).toBe('&quot;test&quot;');
    });

    it('fusionEmailParagraph uses canonical body styles', () => {
        const lead = fusionEmailParagraph('Lead copy', 'lead');
        expect(lead).toContain(FUSION_EMAIL_STYLES.bodyLead);
        const last = fusionEmailParagraph('Final copy', 'last');
        expect(last).toContain(FUSION_EMAIL_STYLES.bodyLast);
    });

    it('normalizeFusionEmailBodyHtml rewrites paragraph styles', () => {
        const out = normalizeFusionEmailBodyHtml(
            '<p style="color:#333">First</p><p>Second</p><p>Third</p>',
        );
        expect(out).toContain(FUSION_EMAIL_STYLES.bodyLead);
        expect(out).toContain(FUSION_EMAIL_STYLES.body);
        expect(out).toContain(FUSION_EMAIL_STYLES.bodyLast);
        expect(out).not.toContain('#333');
    });

    it('emailHeroImageBlock never emits img for mp4', () => {
        const html = emailHeroImageBlock('https://cdn.example/hero.mp4', 'Hero video');
        expect(html).toContain('<video');
        expect(html).not.toContain('<img');
    });

    it('emailHeroMediaBlock uses poster for video heroes', () => {
        const html = emailHeroMediaBlock(
            'https://cdn.example/hero.mp4',
            'Program hero',
            'https://cdn.example/poster.jpg',
        );
        expect(html).toContain('poster="https://cdn.example/poster.jpg"');
        expect(html).toContain('<video');
    });

    it('extractFusionEmailSlots round-trips branded layout fields', () => {
        const html = renderFusionEmailFromSlots(defaultProgramUpdateLayoutSlots());
        const slots = extractFusionEmailSlots(html);
        expect(slots).not.toBeNull();
        expect(slots?.eyebrow).toBe('Program Update');
        expect(slots?.headlineHtml).toContain('Kaga City');
        expect(slots?.heroImageUrl).toContain('program_hero-1.jpg');
        expect(slots?.cta?.label).toContain('APPLY');
        expect(slots?.bodyHtml).toContain(FUSION_EMAIL_STYLES.bodyLead);
        expect(html).toContain(FUSION_EMAIL_LAYOUT_MARKER);
    });

    it('renders a secondary CTA and round-trips it', () => {
        const html = fusionEmailLayout({
            eyebrow: 'Schedule',
            pillLabel: 'PROGRAM CALENDAR',
            headlineHtml: 'Your program<br>calendar',
            bodyHtml: fusionEmailParagraph('Body copy', 'lead'),
            cta: { label: 'OPEN SCHEDULE', href: 'https://www.fusionart.world/settings/profile#calendar' },
            ctaSecondary: {
                label: 'DOWNLOAD CALENDAR',
                href: 'https://www.fusionart.world/settings/profile#calendar-download',
            },
        });
        expect(html).toContain('OPEN SCHEDULE');
        expect(html).toContain('DOWNLOAD CALENDAR');
        expect(html).toContain('#calendar-download');
        expect(html).toContain('#a2b792');
        const slots = extractFusionEmailSlots(html);
        expect(slots?.cta?.label).toBe('OPEN SCHEDULE');
        expect(slots?.ctaSecondary?.label).toBe('DOWNLOAD CALENDAR');
        expect(slots?.ctaSecondary?.href).toContain('#calendar-download');
    });
});
