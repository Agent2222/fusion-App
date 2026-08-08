import { describe, it, expect } from 'vitest';
import { normalizeYoutubeEmbedSrc, looksLikeYoutubeInput } from './youtubeEmbed.js';

describe('youtubeEmbed', () => {
    it('normalizes watch URLs', () => {
        expect(normalizeYoutubeEmbedSrc('https://www.youtube.com/watch?v=eYVQDNmJcU0')).toBe(
            'https://www.youtube.com/embed/eYVQDNmJcU0',
        );
    });

    it('extracts src from iframe HTML', () => {
        const html =
            '<iframe width="560" height="315" src="https://www.youtube.com/embed/eYVQDNmJcU0?si=rS9_R2NhrqbrgMg_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';
        expect(normalizeYoutubeEmbedSrc(html)).toBe(
            'https://www.youtube.com/embed/eYVQDNmJcU0',
        );
    });

    it('handles HTML-escaped iframe markup', () => {
        const escaped =
            '&lt;iframe src="https://www.youtube.com/embed/eYVQDNmJcU0?si=abc"&gt;&lt;/iframe&gt;';
        expect(normalizeYoutubeEmbedSrc(escaped)).toBe(
            'https://www.youtube.com/embed/eYVQDNmJcU0',
        );
    });

    it('rejects non-youtube URLs', () => {
        expect(normalizeYoutubeEmbedSrc('https://example.com/video')).toBe('');
    });

    it('looksLikeYoutubeInput', () => {
        expect(looksLikeYoutubeInput('')).toBe(true);
        expect(looksLikeYoutubeInput('https://youtu.be/abc')).toBe(true);
        expect(looksLikeYoutubeInput('not a video')).toBe(false);
    });
});
