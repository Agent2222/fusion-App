import { describe, it, expect } from 'vitest';
import { distributeUploadedAssetUrls, rewriteUploadedUrlsInHtml } from './assetDistribution.js';

describe('assetDistribution', () => {
    it('rewriteUploadedUrlsInHtml rewrites src inside HTML only', () => {
        const html =
            '<p><img src="https://example.com/uploads/studio/journal/x.jpg" alt=""></p><p>Hello</p>';
        const out = rewriteUploadedUrlsInHtml(html);
        expect(out).toContain('https://cdn.fusionart.world/uploads/studio/journal/x.jpg');
        expect(out).toContain('<p>Hello</p>');
        expect(out).toContain('<p><img');
    });

    it('distributeUploadedAssetUrls does not mangle journal body HTML', () => {
        const locales = {
            en: {
                description:
                    '<p><img src="https://example.com/uploads/studio/journal/j_1/body.jpg" alt=""></p><p>Perhaps one of the</p>',
            },
        };
        const out = /** @type {{ en: { description: string } }} */ (distributeUploadedAssetUrls(locales));
        expect(out.en.description).toContain('<p><img src="https://cdn.fusionart.world/uploads/');
        expect(out.en.description).toContain('Perhaps one of the');
        expect(out.en.description).not.toMatch(/^https:\/\/cdn/);
    });

    it('distributeUploadedAssetUrls still rewrites bare asset URLs', () => {
        expect(distributeUploadedAssetUrls('https://example.com/uploads/foo.jpg')).toBe(
            'https://cdn.fusionart.world/uploads/foo.jpg'
        );
    });
});
