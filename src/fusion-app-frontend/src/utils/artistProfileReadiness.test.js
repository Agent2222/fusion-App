import { describe, expect, it } from 'vitest';
import { ARTIST_CARD_PLACEHOLDER_SRC } from './artistCardPlaceholder.js';
import { getArtistProfileReadiness } from './artistProfileReadiness.js';

const fullWorld = {
    practice: 'Line practice',
    perspective: ['One paragraph'],
    vision: ['Vision text'],
    constructing: ['Building text'],
    context: ['Context text'],
    quote: 'A quote',
};

const threeIntros = {
    introGallery: [{ src: 'https://cdn/a.jpg' }, { src: 'https://cdn/b.jpg' }, { src: 'https://cdn/c.jpg' }],
};

describe('artistProfileReadiness', () => {
    it('green when hero, 3 intros, and world story copy exist (world block)', () => {
        const readiness = getArtistProfileReadiness({
            image: 'https://cdn/hero.jpg',
            locales: {
                en: {
                    world: { ...fullWorld, ...threeIntros },
                },
            },
        });
        expect(readiness.status).toBe('ready');
    });

    it('green when hero, 3 intros, and worldNew copy exist without world text', () => {
        const readiness = getArtistProfileReadiness({
            heroProfileImage: 'https://cdn/headshot.jpg',
            locales: {
                en: {
                    world: threeIntros,
                    worldNew: fullWorld,
                    publicWorldSource: 'newWorld',
                },
            },
        });
        expect(readiness.status).toBe('ready');
    });

    it('yellow when images complete but world story fields missing', () => {
        const readiness = getArtistProfileReadiness({
            image: 'https://cdn/hero.jpg',
            locales: {
                en: {
                    world: threeIntros,
                },
            },
        });
        expect(readiness.status).toBe('partial');
        expect(readiness.missing.some((m) => m.startsWith('world.'))).toBe(true);
    });

    it('yellow when world copy complete but intro slots missing', () => {
        const readiness = getArtistProfileReadiness({
            image: 'https://cdn/hero.jpg',
            locales: {
                en: {
                    world: {
                        ...fullWorld,
                        introGallery: [{ src: 'https://cdn/a.jpg' }],
                    },
                },
            },
        });
        expect(readiness.status).toBe('partial');
        expect(readiness.missing).toContain('intro slot 2');
        expect(readiness.missing).toContain('intro slot 3');
    });

    it('treats artist card placeholder as missing hero', () => {
        const readiness = getArtistProfileReadiness({
            image: ARTIST_CARD_PLACEHOLDER_SRC,
            locales: {
                en: {
                    world: { ...fullWorld, ...threeIntros },
                },
            },
        });
        expect(readiness.status).toBe('partial');
        expect(readiness.missing).toContain('banner/headshot hero');
    });

    it('downgrades to partial when probed images fail to load', () => {
        const row = {
            image: 'https://cdn/hero.jpg',
            locales: {
                en: {
                    world: { ...fullWorld, ...threeIntros },
                },
            },
        };
        const readiness = getArtistProfileReadiness(row, {
            heroOk: false,
            introSlotsOk: [false, false, false],
        });
        expect(readiness.status).toBe('partial');
        expect(readiness.missing).toContain('banner/headshot hero (image failed to load)');
        expect(readiness.missing).toContain('intro slot 1 (image failed to load)');
    });
});
