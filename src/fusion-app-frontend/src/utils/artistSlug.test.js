import { describe, it, expect } from 'vitest';
import { artistDisplayDiscipline, findArtistForConfirmedListLabel } from './artistSlug.js';

describe('findArtistForConfirmedListLabel', () => {
    const pool = [
        {
            id: 'a1',
            slug: 'zac-foster-ud85ekqw',
            image: 'x',
            locales: { en: { name: 'Zac Foster', discipline: 'Paint' } },
        },
        {
            id: 'a2',
            slug: 'jane-doe',
            image: 'y',
            locales: { en: { name: 'Jane Doe', discipline: 'Sculpture' } },
        },
    ];

    it('matches English name', () => {
        const r = findArtistForConfirmedListLabel('Zac Foster', pool);
        expect(r?.id).toBe('a1');
    });

    it('matches exact slug', () => {
        const r = findArtistForConfirmedListLabel('jane-doe', pool);
        expect(r?.id).toBe('a2');
    });

    it('matches slug prefix for disambiguated slugs', () => {
        const r = findArtistForConfirmedListLabel('zac-foster', pool);
        expect(r?.id).toBe('a1');
    });
});

describe('artistDisplayDiscipline', () => {
    it('uses discipline when set', () => {
        const a = {
            locales: {
                en: { discipline: 'Video', world: { practice: 'W' }, worldNew: { practice: 'N' } },
            },
        };
        expect(artistDisplayDiscipline(a, 'en')).toBe('Video');
    });

    it('prefers worldNew practice when publicWorldSource is newWorld', () => {
        const a = {
            locales: {
                publicWorldSource: 'newWorld',
                en: {
                    world: { practice: 'W' },
                    worldNew: { practice: 'N' },
                },
            },
        };
        expect(artistDisplayDiscipline(a, 'en')).toBe('N');
    });

    it('prefers world practice when publicWorldSource is world', () => {
        const a = {
            locales: {
                publicWorldSource: 'world',
                en: {
                    world: { practice: 'W' },
                    worldNew: { practice: 'N' },
                },
            },
        };
        expect(artistDisplayDiscipline(a, 'en')).toBe('W');
    });
});
