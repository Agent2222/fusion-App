import { describe, it, expect } from 'vitest';
import { findArtistForConfirmedListLabel } from './artistSlug.js';

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
