import { describe, expect, it } from 'vitest';
import {
    legacyHeroUrl,
    legacyProfileFileStem,
    needsHeroSync,
    needsIntroGallerySync,
} from './studioLegacyProfileUrls.js';

describe('studioLegacyProfileUrls', () => {
    it('legacyProfileFileStem from two-word name', () => {
        expect(
            legacyProfileFileStem({
                slug: 'x',
                locales: { en: { name: 'Hannah Webb' } },
            })
        ).toBe('hannah-webb');
    });

    it('legacyProfileFileStem single word repeats', () => {
        expect(
            legacyProfileFileStem({
                slug: 'kamauu',
                locales: { en: { name: 'KAMAUU' } },
            })
        ).toBe('kamauu-kamauu');
    });

    it('legacyProfileFileStem falls back to slug', () => {
        expect(legacyProfileFileStem({ slug: 'hiyori-kanazawa', locales: {} })).toBe('hiyori-kanazawa');
    });

    it('legacyHeroUrl', () => {
        expect(legacyHeroUrl('a-b')).toContain('legacyProfiles/a-b-hero.jpg');
    });

    it('needsHeroSync', () => {
        expect(needsHeroSync({ image: '' })).toBe(true);
        expect(needsHeroSync({ image: 'https://x/y.jpg' })).toBe(false);
    });

    it('needsIntroGallerySync', () => {
        expect(needsIntroGallerySync(undefined)).toBe(true);
        expect(needsIntroGallerySync({ en: { world: { introGallery: [] } } })).toBe(true);
        expect(
            needsIntroGallerySync({
                en: { world: { introGallery: [{ src: 'https://a' }] } },
            })
        ).toBe(false);
    });
});
