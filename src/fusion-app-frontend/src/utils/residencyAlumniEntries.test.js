import { describe, expect, it } from 'vitest';
import {
    alumniProgramColumnLabel,
    artistQualifiesForCohortAlumniAssignment,
    buildAlumniProgramGroups,
    buildResidencyAlumniEntries,
    defaultLegacyCohortLabel,
    isPastResidencyProgram,
    isUpcomingResidencyProgram,
    resolveCohortYearAlumniProgram,
    splitAlumniNamesEvenly,
    stripResidencyFromLabel,
} from './residencyAlumniEntries.js';

describe('residencyAlumniEntries', () => {
    it('strips residency from labels', () => {
        expect(stripResidencyFromLabel('Japan Artist Residency')).toBe('Japan Artist');
        expect(stripResidencyFromLabel('Fusion Residency · 2019')).toBe('Fusion · 2019');
    });

    it('builds Fusion Tokyo 2026 from program id', () => {
        expect(
            alumniProgramColumnLabel({
                id: 'fusionTokyo2026',
                year: '2026',
                location: 'Nihonbashi, Tokyo',
                focus: 'Japan Artist Residency',
            }),
        ).toBe('Fusion Tokyo 2026');
    });

    it('treats future start dates as upcoming', () => {
        const upcoming = {
            id: 'fusionKaga',
            year: '2026',
            startDate: 'October 10',
            studioStatus: 'open',
            location: 'Kaga, Ishikawa, Japan',
        };
        expect(isUpcomingResidencyProgram(upcoming)).toBe(true);
        expect(isPastResidencyProgram(upcoming)).toBe(false);
    });

    it('includes legacy cohort alumni when no past program card exists', () => {
        const programs = [
            {
                id: 'fusionKaga',
                year: '2026',
                startDate: 'October 10',
                studioStatus: 'open',
                location: 'Kaga, Ishikawa, Japan',
            },
        ];
        const artists = [
            {
                id: 'a1',
                slug: 'yazmine-graham',
                locales: { en: { name: 'Yazmine Graham' } },
                filter: { connection: 'alumni', cohortYears: [2019] },
            },
        ];
        const rows = buildResidencyAlumniEntries(programs, artists);
        expect(rows).toEqual([
            {
                program: 'Fusion Kaga 2019',
                name: 'Yazmine Graham',
                slug: 'yazmine-graham',
            },
        ]);
    });

    it('does not assign hash-derived cohort years to the alumni table', () => {
        const programs = [
            {
                id: 'fusionKaga',
                year: '2026',
                startDate: 'October 10',
                studioStatus: 'open',
                location: 'Kaga, Ishikawa, Japan',
            },
        ];
        const artists = [
            {
                id: 'legacy-a-004',
                slug: 'platform-member',
                locales: { en: { name: 'Platform Member' } },
                filter: { connection: 'artist', disciplineKey: 'painting', locationKey: 'us' },
            },
        ];
        expect(buildResidencyAlumniEntries(programs, artists)).toEqual([]);
    });

    it('does not assign legacy cohort years without a residency signal', () => {
        expect(
            artistQualifiesForCohortAlumniAssignment(
                {
                    filter: { connection: 'artist', cohortYears: [2019] },
                    locales: { en: { programs: [] } },
                },
                2019,
            ),
        ).toBe(false);
        expect(
            artistQualifiesForCohortAlumniAssignment(
                {
                    filter: { connection: 'artist', cohortYears: [2019] },
                    galleryFilter: { season: 2019 },
                    locales: { en: { programs: [] } },
                },
                2019,
            ),
        ).toBe(true);
    });

    it('includes completed Fusion Tokyo 2026 alumni and skips upcoming programs', () => {
        const programs = [
            {
                id: 'fusionTokyo2026',
                year: '2026',
                startDate: 'January 11',
                endDate: '31',
                studioStatus: 'open',
                location: 'Nihonbashi, Tokyo',
                programPage: { confirmedArtists: ['Akari Koizumi'] },
            },
            {
                id: 'fusionKaga',
                year: '2026',
                startDate: 'October 10',
                endDate: '15',
                studioStatus: 'open',
                location: 'Kaga, Ishikawa, Japan',
                programPage: { confirmedArtists: ['Upcoming Artist'] },
            },
        ];
        const artists = [
            {
                id: 'a1',
                slug: 'akari-koizumi',
                locales: { en: { name: 'Akari Koizumi' } },
            },
        ];
        const rows = buildResidencyAlumniEntries(programs, artists);
        expect(rows).toEqual([
            {
                program: 'Fusion Tokyo 2026',
                name: 'Akari Koizumi',
                slug: 'akari-koizumi',
            },
        ]);
    });

    it('maps Tokyo2026 enrollment id to fusionTokyo2026 program card', () => {
        const programs = [
            {
                id: 'fusionTokyo2026',
                year: '2026',
                startDate: 'January 11',
                endDate: '31',
                studioStatus: 'open',
                location: 'Nihonbashi, Tokyo',
                programPage: { confirmedArtists: [] },
            },
            {
                id: 'fusionKaga',
                year: '2026',
                startDate: 'October 10',
                endDate: '15',
                studioStatus: 'open',
                location: 'Kaga, Ishikawa, Japan',
            },
        ];
        const artists = [
            {
                id: 'a1',
                slug: 'kamauu',
                locales: { en: { name: 'KAMAUU', programs: ['Tokyo2026'] } },
            },
        ];
        const rows = buildResidencyAlumniEntries(programs, artists);
        expect(rows).toEqual([
            {
                program: 'Fusion Tokyo 2026',
                name: 'KAMAUU',
                slug: 'kamauu',
            },
        ]);
    });

    it('maps artists to a past program by enrollment id', () => {
        const programs = [
            {
                id: 'fusionKaga2026Early',
                year: '2026',
                startDate: 'March 1',
                endDate: '31',
                studioStatus: 'completed',
                location: 'Kaga, Ishikawa, Japan',
                programPage: { confirmedArtists: [] },
            },
            {
                id: 'fusionKaga',
                year: '2026',
                startDate: 'October 10',
                endDate: '15',
                studioStatus: 'open',
                location: 'Kaga, Ishikawa, Japan',
                programPage: { confirmedArtists: ['Upcoming Artist'] },
            },
        ];
        const artists = [
            {
                id: 'a1',
                slug: 'kamauu',
                locales: { en: { name: 'KAMAUU', programs: ['fusionKaga2026Early'] } },
                filter: { connection: 'artist', cohortYears: [2026] },
            },
        ];
        const rows = buildResidencyAlumniEntries(programs, artists, 'fusionKaga');
        expect(rows).toEqual([
            {
                program: 'Fusion Kaga 2026',
                name: 'KAMAUU',
                slug: 'kamauu',
            },
        ]);
    });

    it('assigns 2026 cohort alumni to Tokyo when only Kaga is upcoming', () => {
        const programs = [
            {
                id: 'fusionKaga',
                year: '2026',
                startDate: 'October 10',
                endDate: '15',
                studioStatus: 'open',
                location: 'Kaga, Ishikawa, Japan',
                programPage: { confirmedArtists: ['KAMAUU'] },
            },
        ];
        const artists = [
            {
                id: 'a1',
                slug: 'past-tokyo-artist',
                locales: { en: { name: 'Past Tokyo Artist', programs: [] } },
                filter: { connection: 'artist', cohortYears: [2026] },
            },
        ];
        const rows = buildResidencyAlumniEntries(programs, artists, 'fusionKaga');
        expect(rows).toEqual([
            {
                program: 'Fusion Tokyo 2026',
                name: 'Past Tokyo Artist',
                slug: 'past-tokyo-artist',
            },
        ]);
    });

    it('excludes artists on the upcoming program confirmed roster', () => {
        const programs = [
            {
                id: 'fusionKaga',
                year: '2026',
                startDate: 'October 10',
                endDate: '15',
                studioStatus: 'open',
                location: 'Kaga, Ishikawa, Japan',
                programPage: {
                    confirmedArtists: ['Zack Foster', 'KAMAUU'],
                },
            },
        ];
        const artists = [
            {
                id: 'a1',
                slug: 'zack-foster',
                locales: { en: { name: 'Zack Foster', programs: [] } },
                filter: { connection: 'artist', cohortYears: [2026] },
            },
            {
                id: 'a2',
                slug: 'kamauu',
                mostRecentProgram: 'fusionKaga',
                locales: { en: { name: 'KAMAUU', programs: ['Kaga 2026'] } },
                filter: { connection: 'artist', cohortYears: [2026] },
            },
        ];
        expect(buildResidencyAlumniEntries(programs, artists, 'fusionKaga')).toEqual([]);
    });

    it('skips upcoming Kaga cohort artists with 2026 cohort year', () => {
        const programs = [
            {
                id: 'fusionKaga',
                year: '2026',
                startDate: 'October 10',
                endDate: '15',
                studioStatus: 'open',
                location: 'Kaga, Ishikawa, Japan',
            },
        ];
        const artists = [
            {
                id: 'a1',
                slug: 'kamauu',
                locales: { en: { name: 'KAMAUU', programs: ['fusionKaga'] } },
                filter: { connection: 'artist', cohortYears: [2026] },
            },
        ];
        expect(buildResidencyAlumniEntries(programs, artists, 'fusionKaga')).toEqual([]);
    });

    it('defaults legacy cohort years before Tokyo to Fusion Kaga', () => {
        expect(defaultLegacyCohortLabel('2017', new Set(), '')).toEqual({
            key: 'fusionKaga2017',
            label: 'Fusion Kaga 2017',
            sortYear: 2017,
        });
    });

    it('disambiguates 2026 cohort using Tokyo card when present', () => {
        const programs = [
            {
                id: 'fusionTokyo2026',
                year: '2026',
                startDate: 'January 11',
                endDate: '31',
                studioStatus: 'open',
                location: 'Nihonbashi, Tokyo',
            },
            {
                id: 'fusionKaga',
                year: '2026',
                startDate: 'October 10',
                endDate: '15',
                studioStatus: 'open',
                location: 'Kaga, Ishikawa, Japan',
            },
        ];
        const resolved = resolveCohortYearAlumniProgram(
            {
                filter: { cohortYears: [2026] },
                locales: { en: { programs: [] } },
            },
            2026,
            programs,
            new Set(['fusionKaga']),
            'fusionKaga',
        );
        expect(resolved).toEqual({
            include: true,
            key: 'fusionTokyo2026',
            label: 'Fusion Tokyo 2026',
            sortYear: 2026,
        });
    });
});

describe('splitAlumniNamesEvenly', () => {
    it('splits odd counts with the extra name in the first column', () => {
        const names = Array.from({ length: 11 }, (_, i) => ({
            name: `Artist ${i + 1}`,
            slug: `artist-${i + 1}`,
        }));
        const columns = splitAlumniNamesEvenly(names);
        expect(columns).toHaveLength(2);
        expect(columns[0]).toHaveLength(6);
        expect(columns[1]).toHaveLength(5);
    });
});

describe('buildAlumniProgramGroups', () => {
    it('keeps one program headline and splits names evenly across two columns', () => {
        const entries = Array.from({ length: 16 }, (_, i) => ({
            program: 'Fusion Tokyo 2026',
            name: `Artist ${String(i + 1).padStart(2, '0')}`,
            slug: `artist-${i + 1}`,
        }));
        const groups = buildAlumniProgramGroups(entries);
        expect(groups).toHaveLength(1);
        expect(groups[0].label).toBe('Fusion Tokyo 2026');
        expect(groups[0].columns).toHaveLength(2);
        expect(groups[0].columns[0]).toHaveLength(8);
        expect(groups[0].columns[1]).toHaveLength(8);
    });

    it('uses a single column for one artist', () => {
        const groups = buildAlumniProgramGroups([
            { program: 'Fusion Tokyo 2026', name: 'Solo Artist', slug: 'solo' },
        ]);
        expect(groups[0].columns).toHaveLength(1);
        expect(groups[0].columns[0]).toHaveLength(1);
    });

    it('sorts program groups newest first', () => {
        const entries = [
            { program: 'Fusion Kaga 2017', name: 'Old Artist', slug: 'old' },
            { program: 'Fusion Tokyo 2026', name: 'New Artist', slug: 'new' },
            { program: 'Fusion Kaga 2019', name: 'Mid Artist', slug: 'mid' },
        ];
        const groups = buildAlumniProgramGroups(entries);
        expect(groups.map((g) => g.label)).toEqual([
            'Fusion Tokyo 2026',
            'Fusion Kaga 2019',
            'Fusion Kaga 2017',
        ]);
    });
});
