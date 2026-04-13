import { describe, it, expect } from 'vitest';
import { normalizeLocalesWorldForStorage } from './worldNormalize.js';
import { buildArtistRecordsFromSeedArtists } from './seedArtistRecordsFromTestData.js';

const minimalArtist = {
    id: 'a1',
    slug: 'test-slug',
    image: 'https://example.com/img.jpg',
    featuredOrder: 1,
    visibility: 'public',
    updatedAt: '2026-01-01T00:00:00.000Z',
    filter: {
        connection: 'artist',
        cohortYear: 2025,
        disciplineKey: 'sound',
        locationKey: 'us',
    },
    galleryFilter: {
        accessType: 'opening',
        season: 2025,
        view: 'opening',
    },
    locales: {
        en: {
            name: 'T',
            world: { perspective: 'one line', vision: ['a', 'b'], constructing: 'x', context: ['c'] },
        },
        ja: {
            name: 'T',
            world: { perspective: ['x'], context: 'y', practice: 'p' },
        },
    },
};

describe('seedArtistRecordsFromTestData', () => {
    it('normalizes world text fields and preserves en/ja round-trip through localesJson', () => {
        const loc = normalizeLocalesWorldForStorage(
            /** @type {Record<string, unknown>} */ (JSON.parse(JSON.stringify(minimalArtist.locales)))
        );
        expect(loc.en.world.perspective).toEqual(['one line']);
        expect(loc.en.world.vision).toEqual(['a', 'b']);
        expect(loc.en.world.constructing).toEqual(['x']);
        expect(loc.ja.world.context).toEqual(['y']);

        const records = buildArtistRecordsFromSeedArtists([minimalArtist]);
        expect(records).toHaveLength(1);
        expect(records[0].profile.slug).toBe('test-slug');
        const round = JSON.parse(/** @type {string} */ (records[0].localesJson));
        expect(round.en.world.perspective).toEqual(['one line']);
        expect(round.ja.world.perspective).toEqual(['x']);
    });
});
