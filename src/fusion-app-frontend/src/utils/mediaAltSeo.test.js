import { describe, it, expect } from 'vitest';
import {
    SEO_MEDIA_DEFAULT,
    SEO_MEDIA_SUFFIX,
    withSeoImageAlt,
    withSeoVideoLabel,
} from './mediaAltSeo.js';

describe('mediaAltSeo', () => {
    it('empty primary uses default with Japan artist residency', () => {
        expect(withSeoImageAlt('')).toBe(SEO_MEDIA_DEFAULT);
        expect(SEO_MEDIA_DEFAULT.toLowerCase()).toContain('japan artist residency');
    });

    it('non-empty primary appends suffix once', () => {
        const out = withSeoImageAlt('Jane Doe');
        expect(out).toBe(`Jane Doe${SEO_MEDIA_SUFFIX}`);
        expect(withSeoImageAlt(out)).toBe(out);
    });

    it('withSeoVideoLabel mirrors image alt rules', () => {
        expect(withSeoVideoLabel('Community chapter')).toBe(
            withSeoImageAlt('Community chapter'),
        );
    });
});
