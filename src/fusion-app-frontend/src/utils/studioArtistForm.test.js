import { describe, it, expect } from 'vitest';
import { renderArtistManageModalHtml } from './studioArtistForm.js';
import { normalizeArtistImportRow } from './studioBatchImport.js';

/** Minimal HTML escape for test strings (matches studio panels intent). */
function escHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

describe('studioArtistForm', () => {
    it('renderArtistManageModalHtml includes tab UI and readonly slug', () => {
        const html = renderArtistManageModalHtml(
            escHtml,
            {
                id: 'a1',
                slug: 'test-artist',
                image: '',
                locales: { en: { name: 'En' }, ja: { name: 'Ja' } },
            },
            { isTest: true }
        );
        expect(html).toContain('data-studio-tabs="artist-manage"');
        expect(html).toContain('id="studio-art-panel-roster"');
        expect(html).toContain('name="art-slug"');
        expect(html).toContain('readonly');
        expect(html).toContain('id="studio-art-panel-advanced"');
        expect(html).toContain('id="studio-art-panel-new-world"');
        expect(html).toContain('id="studio-art-audio-display-for-artist"');
        expect(html).toContain('Translate to New World');
        expect(html).toContain('id="studio-art-new-world-from-base"');
        expect(html).toContain('New World from base');
        expect(html).toContain('name="art-contact-email"');
        expect(html).toContain('name="art-visibility"');
        expect(html).toContain('value="public"');
        expect(html).toContain('id="studio-art-access-code"');
        expect(html).toContain('name="art-accessCode"');
        expect(html).toContain('id="studio-art-public-world-source"');
        expect(html).toContain('data-studio-world-source="newWorld"');
        expect(html).toContain('id="studio-art-hero-profile-image-approved"');
        expect(html).toContain('Profile image approved');
        expect(html).toContain('data-art-kind="discipline-select"');
        expect(html).toContain('value="sound"');
        expect(html).toContain('Film/Video');
    });

    it('renderArtistManageModalHtml maps stored discipline label to select option', () => {
        const html = renderArtistManageModalHtml(
            escHtml,
            {
                id: 'a2',
                slug: 'sound-artist',
                image: '',
                locales: {
                    en: { name: 'En', discipline: 'Sound' },
                    ja: { name: 'Ja', discipline: 'Sound' },
                },
            },
            { isTest: true },
        );
        expect(html).toContain('value="sound" selected');
    });

    it('renderArtistManageModalHtml clears invalid LLM discipline text from select', () => {
        const html = renderArtistManageModalHtml(
            escHtml,
            {
                id: 'a3',
                slug: 'bad-discipline',
                image: '',
                locales: {
                    en: {
                        name: 'En',
                        discipline: "I don't see any source text provided for translation.",
                    },
                    ja: { name: 'Ja' },
                },
            },
            { isTest: true },
        );
        expect(html).not.toContain("I don't see any source text");
        expect(html).toContain('— Select discipline —');
    });

    it('normalizeArtistImportRow accepts flat collect-shaped payload', () => {
        const pool = new Set(['87654321']);
        const raw = {
            id: 'id1',
            slug: 'slug1',
            image: 'https://example.com/h.jpg',
            featuredOrder: 2,
            visibility: 'public',
            updatedAt: '2026-01-15T00:00:00.000Z',
            filter: {
                connection: 'artist',
                cohortYears: [2025],
                disciplineKey: 'sound',
                locationKey: 'us',
            },
            galleryFilter: {
                accessType: 'opening',
                season: 2025,
                view: 'opening',
            },
            locales: {
                en: { name: 'N', world: { practice: 'p' } },
                ja: { name: 'ん' },
            },
            imported: false,
            accessCode: '87654321',
        };
        const rec = normalizeArtistImportRow(raw, pool, { forceImported: false });
        expect(rec.profile.slug).toBe('slug1');
        expect(rec.localesJson).toContain('"name":"N"');
        expect(rec.accessCode).toBe('87654321');
    });
});
