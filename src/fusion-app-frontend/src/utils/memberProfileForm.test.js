import { describe, it, expect } from 'vitest';
import { introSlotsFromWorld, introSlotsToGallery } from './memberProfileForm.js';

describe('introSlotsToGallery / introSlotsFromWorld', () => {
    it('preserves empty middle slots so later images do not shift left', () => {
        const gallery = introSlotsToGallery([
            { src: 'https://cdn/a.jpg', alt: 'A' },
            { src: '', alt: '', caption: '' },
            { src: 'https://cdn/c.jpg', caption: 'C' },
        ]);
        expect(gallery).toEqual([
            { src: 'https://cdn/a.jpg', alt: 'A' },
            null,
            { src: 'https://cdn/c.jpg', caption: 'C' },
        ]);
        const slots = introSlotsFromWorld({ introGallery: gallery });
        expect(slots[0].src).toBe('https://cdn/a.jpg');
        expect(slots[1].src).toBe('');
        expect(slots[2].src).toBe('https://cdn/c.jpg');
        expect(slots[2].caption).toBe('C');
    });

    it('round-trips a full three-slot gallery', () => {
        const slots = [
            { src: 'https://cdn/a.jpg', alt: '', caption: '' },
            { src: 'https://cdn/b.jpg', alt: 'b', caption: '' },
            { src: 'https://cdn/c.jpg', alt: '', caption: 'c' },
        ];
        expect(introSlotsFromWorld({ introGallery: introSlotsToGallery(slots) })).toEqual([
            { src: 'https://cdn/a.jpg', alt: '', caption: '' },
            { src: 'https://cdn/b.jpg', alt: 'b', caption: '' },
            { src: 'https://cdn/c.jpg', alt: '', caption: 'c' },
        ]);
    });
});
