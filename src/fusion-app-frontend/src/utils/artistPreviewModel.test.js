import { describe, it, expect } from 'vitest';
import {
    shortenPreviewText,
    shortPreviewBlurb,
    resolvePreviewBlurb,
    defaultPreviewImageKeys,
    resolvePreviewImageKeys,
    resolvePreviewImageUrls,
    resolvePreviewAudio,
    buildArtistPreviewViewModel,
    normalizePreviewConfigForSave,
} from './artistPreviewModel.js';

const baseArtist = {
    id: 'a1',
    slug: 'rodolfo-rueda',
    audioUrl: 'https://cdn.example/voice.mp3',
    audioTitle: 'Submerged Memory',
    audioApproved: true,
    heroProfileImage: 'https://cdn.example/headshot.jpg',
    heroProfileImageApproved: true,
    locales: {
        publicWorldSource: 'world',
        en: {
            name: 'Rodolfo Rueda',
            bio: 'A longer biography that should only be used when practice is empty and may need shortening for the preview card surface on the platform.',
            world: {
                practice:
                    'Rodolfo Rueda is a Peruvian multidisciplinary artist whose work thrives on the unconventional and the unexpected. He continues to expand his practice across media.',
                introGallery: [
                    { src: 'https://cdn.example/g0.jpg' },
                    { src: 'https://cdn.example/g1.jpg' },
                    { src: '' },
                ],
            },
        },
        ja: {
            name: 'ロドルフォ',
            world: {
                practice: 'ペルーの多分野アーティスト。',
            },
        },
    },
};

describe('artistPreviewModel', () => {
    it('shortenPreviewText clamps long copy', () => {
        const long = 'A'.repeat(250);
        expect(shortenPreviewText(long).length).toBeLessThanOrEqual(201);
        expect(shortenPreviewText(long).endsWith('…')).toBe(true);
    });

    it('shortPreviewBlurb prefers practice over bio', () => {
        const blurb = shortPreviewBlurb(baseArtist, 'en');
        expect(blurb).toContain('Peruvian');
        expect(blurb.length).toBeLessThanOrEqual(200);
    });

    it('resolvePreviewBlurb uses curated override', () => {
        const artist = {
            ...baseArtist,
            locales: {
                ...baseArtist.locales,
                en: {
                    ...baseArtist.locales.en,
                    preview: { blurb: 'Custom preview line.', imageKeys: [], showAudio: true },
                },
            },
        };
        expect(resolvePreviewBlurb(artist, 'en')).toBe('Custom preview line.');
    });

    it('defaultPreviewImageKeys includes filled intro + approved hero', () => {
        expect(defaultPreviewImageKeys(baseArtist)).toEqual([
            'intro:0',
            'intro:1',
            'heroProfile',
        ]);
    });

    it('resolvePreviewImageKeys respects curated order', () => {
        const artist = {
            ...baseArtist,
            locales: {
                ...baseArtist.locales,
                en: {
                    ...baseArtist.locales.en,
                    preview: {
                        blurb: '',
                        imageKeys: ['heroProfile', 'intro:1'],
                        showAudio: true,
                    },
                },
            },
        };
        expect(resolvePreviewImageKeys(artist)).toEqual(['heroProfile', 'intro:1']);
        expect(resolvePreviewImageUrls(artist)).toEqual([
            'https://cdn.example/headshot.jpg',
            'https://cdn.example/g1.jpg',
        ]);
    });

    it('resolvePreviewAudio respects showAudio false', () => {
        expect(resolvePreviewAudio(baseArtist)?.url).toContain('voice.mp3');
        const off = {
            ...baseArtist,
            locales: {
                ...baseArtist.locales,
                en: {
                    ...baseArtist.locales.en,
                    preview: { blurb: '', imageKeys: [], showAudio: false },
                },
            },
        };
        expect(resolvePreviewAudio(off)).toBeNull();
    });

    it('buildArtistPreviewViewModel returns slug and name', () => {
        const vm = buildArtistPreviewViewModel(baseArtist, 'en');
        expect(vm.name).toBe('Rodolfo Rueda');
        expect(vm.slug).toBe('rodolfo-rueda');
        expect(vm.images.length).toBeGreaterThan(0);
        expect(vm.audio?.title).toBe('Submerged Memory');
    });

    it('resolvePreviewImageUrls falls back to roster artwork when gallery empty', () => {
        const legacy = {
            id: 'legacy',
            slug: 'legacy-artist',
            image: 'https://cdn.example/artwork.jpg',
            heroProfileImage: 'https://cdn.example/old-headshot.jpg',
            heroProfileImageApproved: false,
            locales: { en: { name: 'Legacy', world: { introGallery: [] } } },
        };
        expect(resolvePreviewImageUrls(legacy)).toEqual([
            'https://cdn.example/artwork.jpg',
            'https://cdn.example/old-headshot.jpg',
        ]);
    });

    it('normalizePreviewConfigForSave mirrors shared fields', () => {
        const n = normalizePreviewConfigForSave({
            blurbEn: 'Hello',
            blurbJa: 'こんにちは',
            imageKeys: ['intro:0', 'bad', 'heroProfile'],
            showAudio: false,
        });
        expect(n.en.blurb).toBe('Hello');
        expect(n.ja.blurb).toBe('こんにちは');
        expect(n.en.imageKeys).toEqual(['intro:0', 'heroProfile']);
        expect(n.en.showAudio).toBe(false);
        expect(n.ja.showAudio).toBe(false);
    });
});
