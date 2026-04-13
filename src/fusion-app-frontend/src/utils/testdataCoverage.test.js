import { describe, it, expect } from 'vitest';
import { testData } from '../testData.js';
import { CONTENT_PAGE_REGISTRY } from './database.js';
import { enumerateJsonPaths } from './testdataCoverageWalk.js';

/** Roots owned by Content tab + `upsertContentPage`. */
const REGISTRY_ROOTS = [...new Set(CONTENT_PAGE_REGISTRY.map((e) => e.testKey))];

/** Roots edited outside Content (entity tabs) + derived slices. */
const ENTITY_TAB_ROOTS = ['allArtists', 'featuredArtist'];

const ALLOWED_ROOTS = new Set([...REGISTRY_ROOTS, ...ENTITY_TAB_ROOTS]);

describe('Studio testData coverage registry', () => {
    it('CONTENT_PAGE_REGISTRY covers every planned CMS root except entity tabs', () => {
        const mustHave = [
            'programHero',
            'applicationProcess',
            'termsAndConditions',
            'privacyPolicy',
            'contact',
            'faq',
            'context',
            'info',
            'allPrograms',
            'editions',
            'journals',
            'eventRow',
            'objectsHighlight',
            'galleryAccessCta',
            'joinNetwork',
            'joinNetworkFlow',
            'quoteRow',
            'featureCards',
            'events',
            'audio',
        ];
        for (const k of mustHave) {
            expect(REGISTRY_ROOTS, `registry missing testKey: ${k}`).toContain(k);
        }
    });

    it('every enumerated path in testData starts under an allowed root', () => {
        const paths = enumerateJsonPaths(testData);
        expect(paths.length).toBeGreaterThan(50);
        for (const { path } of paths) {
            const root = path.split('.')[0];
            expect(
                ALLOWED_ROOTS.has(root),
                `no Studio mapping for root "${root}" (path ${path})`
            ).toBe(true);
        }
    });
});
