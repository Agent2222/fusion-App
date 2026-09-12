import { describe, expect, it } from 'vitest';
import {
    applyProfileCardModeForCohortPath,
    artistMatchesCohortOption,
    buildArtistCohortFilterOptions,
    matchArtistCohortOption,
    parseArtistsCohortPath,
    programFilterBrandLabel,
    programFilterLabel,
    programFilterSlug,
} from './artistCohortRoutes.js';
import { ARTIST_CARD_IMAGE_MODE_LS, getArtistCardImageMode } from './artistCardImageMode.js';
import { applyArtistFilters } from './feedFilterApply.js';

const kaga = {
    id: 'fusionKaga',
    year: '2026',
    location: 'Kaga, Ishikawa, Japan',
    visibility: 'public',
    routeLink: '/program/kaga-ishikawa',
    programPage: { confirmedArtists: ['KAMAUU'] },
};

const nihonbashi = {
    id: 'fusionNihonbashi',
    year: '2026',
    location: 'Nihonbashi, Tokyo',
    visibility: 'public',
    routeLink: '/program/nihonbashi-tokyo',
};

describe('programFilterSlug', () => {
    it('uses the public program route segment plus year', () => {
        expect(programFilterSlug(kaga)).toBe('kaga-ishikawa-2026');
        expect(programFilterSlug(nihonbashi)).toBe('nihonbashi-tokyo-2026');
    });
});

describe('programFilterBrandLabel', () => {
    it('names programs from their id, not a shared year', () => {
        expect(programFilterBrandLabel(kaga)).toBe('Kaga');
        expect(programFilterBrandLabel(nihonbashi)).toBe('Nihonbashi');
    });
});

describe('programFilterLabel', () => {
    it('keeps program names distinct when two programs share a year', () => {
        expect(programFilterLabel(kaga, [kaga, nihonbashi])).toBe('Kaga 2026');
        expect(programFilterLabel(nihonbashi, [kaga, nihonbashi])).toBe('Nihonbashi 2026');
    });
});

describe('buildArtistCohortFilterOptions', () => {
    it('emits program chips instead of a hardcoded 2026 year chip', () => {
        const options = buildArtistCohortFilterOptions({
            programs: [kaga, nihonbashi],
            artists: [
                { filter: { cohortYears: [2026] }, locales: { en: { programs: ['fusionKaga'] } } },
                { filter: { cohortYears: [2019] }, locales: { en: { name: 'Legacy' } } },
            ],
        });
        expect(options.map((o) => o.slug)).toEqual(['kaga-ishikawa-2026', 'nihonbashi-tokyo-2026', '2019']);
        expect(options.some((o) => o.kind === 'year' && o.slug === '2026')).toBe(false);
        expect(options[0].href).toBe('/artists/kaga-ishikawa-2026');
        expect(options[2].label).toBe('Kaga 2019');
    });
});

describe('parseArtistsCohortPath', () => {
    it('reads a cohort slug from /artists/:slug', () => {
        expect(parseArtistsCohortPath('/artists')).toBe(null);
        expect(parseArtistsCohortPath('/artists/kaga-ishikawa-2026')).toEqual({
            slug: 'kaga-ishikawa-2026',
        });
        expect(parseArtistsCohortPath('/artists/2019/')).toEqual({ slug: '2019' });
    });
});

describe('applyProfileCardModeForCohortPath', () => {
    it('switches to profile on a cohort route and leaves /artists alone', () => {
        const store = new Map([[ARTIST_CARD_IMAGE_MODE_LS, 'artwork']]);
        const prev = globalThis.localStorage;
        globalThis.localStorage = {
            getItem: (k) => (store.has(k) ? store.get(k) : null),
            setItem: (k, v) => store.set(k, String(v)),
            removeItem: (k) => store.delete(k),
        };
        try {
            expect(applyProfileCardModeForCohortPath('/artists')).toBe(false);
            expect(getArtistCardImageMode()).toBe('artwork');
            expect(applyProfileCardModeForCohortPath('/artists/kaga-ishikawa-2026')).toBe(true);
            expect(getArtistCardImageMode()).toBe('profile');
        } finally {
            globalThis.localStorage = prev;
        }
    });
});

describe('applyArtistFilters program cohort', () => {
    it('filters the roster to one 2026 program instead of every 2026 artist', () => {
        const options = buildArtistCohortFilterOptions({ programs: [kaga, nihonbashi], artists: [] });
        const artists = [
            { locales: { en: { name: 'KAMAUU', programs: ['fusionKaga'] } } },
            { locales: { en: { name: 'Tokyo Artist', programs: ['fusionNihonbashi'] } } },
        ];
        const filtered = applyArtistFilters(artists, {
            connectionId: 'programConnection-kaga-ishikawa-2026',
            locationKey: 'all',
            cohortOptions: options,
        });
        expect(filtered.map((a) => a.locales.en.name)).toEqual(['KAMAUU']);
    });
});

describe('artistMatchesCohortOption', () => {
    it('matches enrolled or confirmed artists to a program option', () => {
        const options = buildArtistCohortFilterOptions({ programs: [kaga, nihonbashi], artists: [] });
        const kagaOpt = matchArtistCohortOption(options, '/artists/kaga-ishikawa-2026');
        expect(
            artistMatchesCohortOption(
                { locales: { en: { name: 'KAMAUU', programs: ['fusionKaga'] } } },
                kagaOpt,
            ),
        ).toBe(true);
        expect(
            artistMatchesCohortOption(
                { locales: { en: { name: 'Other', programs: ['fusionNihonbashi'] } } },
                kagaOpt,
            ),
        ).toBe(false);
    });
});
