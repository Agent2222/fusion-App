import { describe, it, expect, vi } from 'vitest';
import {
    getArtistCardArtworkUrl,
    getArtistCardProfileUrl,
    isArtistHeroProfileImageApproved,
    resolveArtistPublicCardImageUrl,
    getArtistCardImageUrlForCurrentMode,
} from './artistCardImageMode.js';

const artist = {
    image: 'https://cdn.example/artwork.jpg',
    heroProfileImage: 'https://cdn.example/headshot.jpg',
};

describe('artistCardImageMode approval', () => {
    it('isArtistHeroProfileImageApproved reads boolean field', () => {
        expect(isArtistHeroProfileImageApproved({ heroProfileImageApproved: true })).toBe(true);
        expect(isArtistHeroProfileImageApproved({ heroProfileImageApproved: false })).toBe(false);
        expect(isArtistHeroProfileImageApproved({})).toBe(false);
    });

    it('resolveArtistPublicCardImageUrl uses artwork when not approved', () => {
        expect(resolveArtistPublicCardImageUrl(artist)).toBe(getArtistCardArtworkUrl(artist));
    });

    it('resolveArtistPublicCardImageUrl uses profile when approved', () => {
        expect(
            resolveArtistPublicCardImageUrl({ ...artist, heroProfileImageApproved: true }),
        ).toBe(getArtistCardProfileUrl({ ...artist, heroProfileImageApproved: true }));
    });

    it('approved profile falls back to artwork when headshot URL is empty', () => {
        expect(
            resolveArtistPublicCardImageUrl({
                image: 'https://cdn.example/artwork.jpg',
                heroProfileImage: '',
                heroProfileImageApproved: true,
            }),
        ).toBe('https://cdn.example/artwork.jpg');
    });

    it('getArtistCardImageUrlForCurrentMode respects approval in profile mode', () => {
        const store = new Map();
        vi.stubGlobal('localStorage', {
            getItem: (k) => (store.has(k) ? store.get(k) : null),
            setItem: (k, v) => store.set(k, String(v)),
            removeItem: (k) => store.delete(k),
        });
        try {
            store.set('fusion-artist-card-image-mode', 'profile');
            expect(getArtistCardImageUrlForCurrentMode(artist)).toBe(getArtistCardArtworkUrl(artist));
            expect(
                getArtistCardImageUrlForCurrentMode({ ...artist, heroProfileImageApproved: true }),
            ).toBe(getArtistCardProfileUrl({ ...artist, heroProfileImageApproved: true }));
        } finally {
            vi.unstubAllGlobals();
        }
    });
});
