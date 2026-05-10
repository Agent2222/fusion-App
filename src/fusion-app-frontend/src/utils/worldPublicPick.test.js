import { describe, it, expect } from 'vitest';
import {
    getPublicWorldSourceFromLocales,
    needsInitialWorldNew,
    pickPublicWorldField,
    PUBLIC_WORLD_SOURCE_DEFAULT,
    worldFieldHasContent,
} from './worldPublicPick.js';

describe('worldFieldHasContent', () => {
    it('treats whitespace-only strings as empty', () => {
        expect(worldFieldHasContent('  ')).toBe(false);
        expect(worldFieldHasContent('x')).toBe(true);
    });

    it('accepts non-empty arrays of strings', () => {
        expect(worldFieldHasContent(['', 'a'])).toBe(true);
        expect(worldFieldHasContent(['', '  '])).toBe(false);
    });
});

describe('getPublicWorldSourceFromLocales', () => {
    it('defaults to newWorld', () => {
        expect(getPublicWorldSourceFromLocales({})).toBe(PUBLIC_WORLD_SOURCE_DEFAULT);
        expect(getPublicWorldSourceFromLocales(null)).toBe(PUBLIC_WORLD_SOURCE_DEFAULT);
    });

    it('reads world when set', () => {
        expect(getPublicWorldSourceFromLocales({ publicWorldSource: 'world' })).toBe('world');
    });
});

describe('pickPublicWorldField', () => {
    const loc = {
        world: { practice: 'A', perspective: '' },
        worldNew: { practice: 'B', perspective: 'PN' },
    };

    it('prefers worldNew when publicWorldSource is newWorld', () => {
        expect(pickPublicWorldField(loc, 'practice', 'newWorld')).toBe('B');
        expect(pickPublicWorldField(loc, 'perspective', 'newWorld')).toBe('PN');
    });

    it('prefers world when publicWorldSource is world', () => {
        expect(pickPublicWorldField(loc, 'practice', 'world')).toBe('A');
    });

    it('falls back when preferred side is empty', () => {
        expect(pickPublicWorldField(loc, 'perspective', 'world')).toBe('PN');
        const loc2 = {
            world: { practice: '' },
            worldNew: { practice: 'B' },
        };
        expect(pickPublicWorldField(loc2, 'practice', 'world')).toBe('B');
    });
});

describe('needsInitialWorldNew', () => {
    it('is true when worldNew is missing or all text fields empty', () => {
        expect(needsInitialWorldNew({ en: {}, ja: {} })).toBe(true);
        expect(
            needsInitialWorldNew({
                en: { worldNew: { practice: '', quote: '' } },
                ja: { worldNew: {} },
            }),
        ).toBe(true);
    });

    it('is false when any locale has content in a text field', () => {
        expect(
            needsInitialWorldNew({
                en: { worldNew: { practice: 'x' } },
                ja: {},
            }),
        ).toBe(false);
    });
});
