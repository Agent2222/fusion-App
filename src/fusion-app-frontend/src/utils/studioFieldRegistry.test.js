import { describe, expect, it } from 'vitest';
import { getFieldKind, legacyHeuristicAssetPath, shouldShowUploadButton } from './studioFieldRegistry.js';

describe('studioFieldRegistry', () => {
    it('classifies journals list link as route (P0)', () => {
        expect(getFieldKind('journals-block', 'journals.0.link')).toBe('route');
        expect(shouldShowUploadButton(getFieldKind('journals-block', 'journals.0.link'))).toBe(false);
    });

    it('classifies editions href as route', () => {
        expect(getFieldKind('editions-feed', 'items.0.href')).toBe('route');
    });

    it('classifies editions imageSrc as asset', () => {
        expect(getFieldKind('editions-feed', 'items.0.imageSrc')).toBe('assetUrl');
        expect(shouldShowUploadButton(getFieldKind('editions-feed', 'items.0.imageSrc'))).toBe(true);
    });

    it('classifies gallery access ctaLink as route', () => {
        expect(getFieldKind('gallery-access-cta', 'ctaLink')).toBe('route');
    });

    it('classifies quote attribution as route', () => {
        expect(getFieldKind('quote-row', 'journal.en.attributionHref')).toBe('route');
    });

    it('classifies program hero image vs route', () => {
        expect(getFieldKind('program-hero', 'imageSrc')).toBe('assetUrl');
        expect(getFieldKind('program-hero', 'routeLink')).toBe('route');
    });

    it('classifies audio link as audioUrl', () => {
        expect(getFieldKind('audio', '0.link')).toBe('audioUrl');
    });

    it('legacy heuristic does not flag bare link segment alone', () => {
        expect(legacyHeuristicAssetPath('journals.0.link')).toBe(false);
    });

    it('legacy heuristic flags gallery index strings', () => {
        expect(legacyHeuristicAssetPath('programs.en.0.programPage.offeringCards.0.gallery.0')).toBe(true);
    });

    it('P2: context nested image is asset', () => {
        expect(getFieldKind('context', 'ecosystemPartnersCards.0.image')).toBe('assetUrl');
    });

    it('P2: objects-highlight link is external', () => {
        expect(getFieldKind('objects-highlight', 'objects.0.link')).toBe('externalUrl');
    });

    it('P3: join-network-flow confirmation href is route', () => {
        expect(getFieldKind('join-network-flow', 'apply.confirmation.links.0.href')).toBe('route');
    });

    it('P3: locales pages — link segment stays plainText (no false asset upload)', () => {
        expect(getFieldKind('terms', 'en.link')).toBe('plainText');
        expect(shouldShowUploadButton(getFieldKind('terms', 'en.link'))).toBe(false);
    });

    it('all-programs program card imageSrc matches Content editor kind', () => {
        expect(getFieldKind('all-programs', 'programs.en.0.imageSrc')).toBe('assetUrl');
        expect(getFieldKind('all-programs', 'programs.ja.0.imageSrc')).toBe('assetUrl');
    });
});
