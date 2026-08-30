import { describe, expect, it } from 'vitest';
import { collectTravelPrepImageOptions } from './travelPrepImages.js';

describe('collectTravelPrepImageOptions', () => {
    it('dedupes link images and the shared library', () => {
        const opts = collectTravelPrepImageOptions(
            [
                { imageUrl: 'https://cdn.example/a.jpg', title: 'JR Pass' },
                { imageUrl: 'https://cdn.example/a.jpg', title: 'Duplicate' },
                { imageUrl: '', title: 'No image' },
            ],
            ['https://cdn.example/a.jpg', 'https://cdn.example/b.jpg'],
        );
        expect(opts).toEqual([
            { url: 'https://cdn.example/a.jpg', label: 'JR Pass' },
            { url: 'https://cdn.example/b.jpg', label: 'Travel prep' },
        ]);
    });
});
