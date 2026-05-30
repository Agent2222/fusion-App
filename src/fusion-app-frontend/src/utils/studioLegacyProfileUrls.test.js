import { describe, expect, it } from 'vitest';
import {
    hasFirebaseIntroGalleryUrl,
    isFirebaseStorageUrl,
    legacyHeroUrl,
    legacyIntroUrl,
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
        expect(legacyHeroUrl('a-b')).toBe(
            'https://cdn.fusionart.world/uploads/legacyProfiles/a-b-hero.jpg',
        );
    });

    it('legacyIntroUrl', () => {
        expect(legacyIntroUrl('a-b', 0)).toBe(
            'https://cdn.fusionart.world/uploads/legacyProfiles/a-b-intro-0.jpg',
        );
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

    it('isFirebaseStorageUrl', () => {
        expect(isFirebaseStorageUrl('')).toBe(false);
        expect(isFirebaseStorageUrl('https://cdn.fusionart.world/x.jpg')).toBe(false);
        expect(
            isFirebaseStorageUrl(
                'https://firebasestorage.googleapis.com/v0/b/fusion-intl.appspot.com/o/x.jpg?alt=media',
            ),
        ).toBe(true);
    });

    it('hasFirebaseIntroGalleryUrl', () => {
        const firebaseSrc =
            'https://firebasestorage.googleapis.com/v0/b/fusion-intl.appspot.com/o/artist-content%2Fx%2Fgallery-0.jpg?alt=media';
        expect(hasFirebaseIntroGalleryUrl(undefined)).toBe(false);
        expect(hasFirebaseIntroGalleryUrl({ en: { world: { introGallery: [] } } })).toBe(false);
        expect(
            hasFirebaseIntroGalleryUrl({
                en: { world: { introGallery: [{ src: firebaseSrc }, { src: '' }, { src: '' }] } },
            }),
        ).toBe(true);
        expect(
            hasFirebaseIntroGalleryUrl({
                en: { world: { introGallery: [{ src: 'https://cdn.fusionart.world/x.jpg' }] } },
            }),
        ).toBe(false);
    });
});
