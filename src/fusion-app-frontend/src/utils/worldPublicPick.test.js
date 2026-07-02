import { describe, it, expect } from 'vitest';
import { worldTextToParagraphs } from './worldNormalize.js';
import {
    getPublicWorldSourceFromLocales,
    localesHaveUsableWorldNew,
    needsInitialWorldNew,
    pickPublicWorldField,
    PUBLIC_WORLD_SOURCE_DEFAULT,
    worldFieldHasContent,
} from './worldPublicPick.js';

const LLM_GARBAGE = "I don't see any source text provided for translation.";

describe('worldFieldHasContent', () => {
    it('treats whitespace-only strings as empty', () => {
        expect(worldFieldHasContent('  ')).toBe(false);
        expect(worldFieldHasContent('x')).toBe(true);
    });

    it('rejects LLM failure strings', () => {
        expect(worldFieldHasContent(LLM_GARBAGE)).toBe(false);
        expect(worldFieldHasContent(['', LLM_GARBAGE])).toBe(false);
        expect(worldFieldHasContent(['', 'Valid line'])).toBe(true);
    });

    it('accepts non-empty arrays of strings', () => {
        expect(worldFieldHasContent(['', 'a'])).toBe(true);
        expect(worldFieldHasContent(['', '  '])).toBe(false);
    });
});

describe('getPublicWorldSourceFromLocales', () => {
    it('defaults to newWorld when no worldNew content', () => {
        expect(getPublicWorldSourceFromLocales({})).toBe(PUBLIC_WORLD_SOURCE_DEFAULT);
        expect(getPublicWorldSourceFromLocales(null)).toBe(PUBLIC_WORLD_SOURCE_DEFAULT);
        expect(PUBLIC_WORLD_SOURCE_DEFAULT).toBe('newWorld');
    });

    it('defaults to newWorld when worldNew has content and preference unset', () => {
        expect(
            getPublicWorldSourceFromLocales({
                en: { worldNew: { practice: 'Generated bio' } },
            }),
        ).toBe('newWorld');
    });

    it('honors explicit world when set', () => {
        expect(
            getPublicWorldSourceFromLocales({
                publicWorldSource: 'world',
                en: { worldNew: { practice: 'Generated bio' } },
            }),
        ).toBe('world');
    });

    it('honors explicit newWorld when set', () => {
        expect(getPublicWorldSourceFromLocales({ publicWorldSource: 'newWorld' })).toBe('newWorld');
    });
});

describe('localesHaveUsableWorldNew', () => {
    it('is true when any locale has usable worldNew text', () => {
        expect(localesHaveUsableWorldNew({ en: { worldNew: { quote: 'Q' } } })).toBe(true);
        expect(localesHaveUsableWorldNew({ en: { worldNew: { quote: LLM_GARBAGE } } })).toBe(false);
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

    it('prefers worldNew by default when both blocks have content', () => {
        expect(pickPublicWorldField(loc, 'practice')).toBe('B');
    });

    it('falls back from polluted world to worldNew', () => {
        const polluted = {
            world: { context: [LLM_GARBAGE, 'Chile (Registered in ).'] },
            worldNew: { context: ['Based in Santiago', 'Ceramics', 'Upcoming residency'] },
        };
        expect(pickPublicWorldField(polluted, 'context', 'world')).toEqual([
            'Based in Santiago',
            'Ceramics',
            'Upcoming residency',
        ]);
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

describe('worldTextToParagraphs', () => {
    it('filters LLM garbage lines from arrays', () => {
        expect(worldTextToParagraphs([LLM_GARBAGE, 'Real context line'])).toEqual(['Real context line']);
    });

    it('returns empty for garbage scalar', () => {
        expect(worldTextToParagraphs(LLM_GARBAGE)).toEqual([]);
    });
});
