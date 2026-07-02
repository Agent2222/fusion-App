import { describe, it, expect, vi } from 'vitest';

vi.mock('../config.js', () => ({
    getPublicSiteOrigin: () => 'https://fusionart.world',
}));

import { buildArtistProfileSeo } from './artistProfileSeo.js';

describe('artistProfileSeo', () => {
    it('prefers locale seo.title and seo.description', () => {
        const out = buildArtistProfileSeo({
            loc: {
                seo: {
                    title: 'Custom SEO title',
                    description: 'Custom SEO description for search.',
                },
                discipline: 'Painting',
            },
            displayName: 'Jane Doe',
            slug: 'jane-doe',
        });
        expect(out.title).toBe('Custom SEO title');
        expect(out.description).toBe('Custom SEO description for search.');
    });

    it('default title includes discipline and Japan Artist Residency', () => {
        const out = buildArtistProfileSeo({
            loc: { discipline: 'Ceramics' },
            displayName: 'Jane Doe',
            slug: 'jane-doe',
        });
        expect(out.title).toContain('Jane Doe');
        expect(out.title).toContain('Ceramics');
        expect(out.title.toLowerCase()).toContain('japan artist residency');
    });

    it('default description includes residency keywords and clips to 158 chars', () => {
        const longPractice = `${'A'.repeat(120)} extended practice narrative.`;
        const out = buildArtistProfileSeo({
            loc: { discipline: 'Painting', location: { city: 'Tokyo' } },
            displayName: 'Jane Doe',
            slug: 'jane-doe',
            practiceStr: longPractice,
        });
        expect(out.description.length).toBeLessThanOrEqual(158);
        const short = buildArtistProfileSeo({
            loc: { discipline: 'Painting' },
            displayName: 'Jane Doe',
            slug: 'jane-doe',
            practiceStr: 'Works with light.',
        });
        expect(short.description.toLowerCase()).toContain('japan artist residency');
    });

    it('personJsonLd includes name, url, and optional fields', () => {
        const out = buildArtistProfileSeo({
            loc: { discipline: 'Sculpture' },
            displayName: 'Jane Doe',
            slug: 'jane-doe',
            heroImageUrl: 'https://cdn.example.com/hero.jpg',
            practiceStr: 'Works with stone.',
        });
        expect(out.personJsonLd.name).toBe('Jane Doe');
        expect(out.personJsonLd.url).toBe('https://fusionart.world/profile/jane-doe');
        expect(out.personJsonLd.image).toBe('https://cdn.example.com/hero.jpg');
        expect(out.personJsonLd.jobTitle).toBe('Sculpture');
    });
});
