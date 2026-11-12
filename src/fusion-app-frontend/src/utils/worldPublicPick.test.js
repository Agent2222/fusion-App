import { describe, it, expect } from 'vitest';
import { worldTextToParagraphs } from './worldNormalize.js';
import {
    getPublicWorldSourceFromLocales,
    getWorldSourceForField,
    localesHaveUsableWorldNew,
    normalizeWorldSourceByField,
    pickPublicWorldField,
    PUBLIC_WORLD_SOURCE_DEFAULT,
    WORLD_SECTION_KEYS,
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

describe('pickPublicWorldField with a per-section source', () => {
    const loc = {
        world: { practice: 'A', perspective: 'P-world' },
        worldNew: { practice: 'B', perspective: 'P-ai' },
    };

    it('lets the per-section choice win over the global source', () => {
        expect(pickPublicWorldField(loc, 'practice', 'newWorld', 'world')).toBe('A');
        expect(pickPublicWorldField(loc, 'practice', 'world', 'newWorld')).toBe('B');
    });

    it('falls back to the global source when the section choice is unknown', () => {
        expect(pickPublicWorldField(loc, 'practice', 'world', null)).toBe('A');
        expect(pickPublicWorldField(loc, 'practice', 'world', 'bogus')).toBe('A');
    });
});

describe('getWorldSourceForField', () => {
    const locales = {
        publicWorldSource: 'newWorld',
        worldSourceByField: { practice: 'world', quote: 'newWorld' },
    };

    it('uses the stored per-section choice', () => {
        expect(getWorldSourceForField(locales, 'practice', 'newWorld')).toBe('world');
        expect(getWorldSourceForField(locales, 'quote', 'world')).toBe('newWorld');
    });

    it('falls back to the global source for sections without a choice', () => {
        expect(getWorldSourceForField(locales, 'vision', 'world')).toBe('world');
        expect(getWorldSourceForField(locales, 'vision', 'newWorld')).toBe('newWorld');
    });

    it('defaults to New World and is safe for missing locales', () => {
        expect(getWorldSourceForField({}, 'practice')).toBe(PUBLIC_WORLD_SOURCE_DEFAULT);
        expect(getWorldSourceForField(null, 'practice', 'world')).toBe('world');
        expect(getWorldSourceForField({ worldSourceByField: 'nope' }, 'practice')).toBe(
            PUBLIC_WORLD_SOURCE_DEFAULT,
        );
    });
});

describe('normalizeWorldSourceByField', () => {
    it('keeps known keys with valid values only', () => {
        expect(
            normalizeWorldSourceByField({
                practice: 'world',
                perspective: 'newWorld',
                vision: 'bogus',
                unknown: 'world',
            }),
        ).toEqual({ practice: 'world', perspective: 'newWorld' });
        expect(normalizeWorldSourceByField(null)).toEqual({});
        expect(WORLD_SECTION_KEYS).toHaveLength(6);
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
