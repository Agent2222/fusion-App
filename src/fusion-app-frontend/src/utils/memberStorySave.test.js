import { describe, it, expect } from 'vitest';
import { applyStorySaveToLocales, worldNewBlockHasContent } from './memberStorySave.js';

const LLM_GARBAGE = "I don't see any source text provided for translation.";

describe('worldNewBlockHasContent', () => {
    it('accepts strings and non-empty arrays', () => {
        expect(worldNewBlockHasContent({ practice: 'Works in clay' })).toBe(true);
        expect(worldNewBlockHasContent({ vision: ['One', 'Two'] })).toBe(true);
        expect(worldNewBlockHasContent({ perspective: ['', ''] })).toBe(false);
        expect(worldNewBlockHasContent({ quote: '   ' })).toBe(false);
        expect(worldNewBlockHasContent({})).toBe(false);
        expect(worldNewBlockHasContent(null)).toBe(false);
    });
});

describe('applyStorySaveToLocales', () => {
    const prev = {
        en: { bio: 'EN bio', world: { practice: 'own en' }, worldNew: { practice: 'AI en' } },
        ja: { bio: 'JA bio', world: { practice: 'own ja' }, worldNew: { practice: 'AI ja' } },
        publicWorldSource: 'newWorld',
    };

    it('writes the AI column for the language being edited', () => {
        const out = JSON.parse(JSON.stringify(prev));
        applyStorySaveToLocales(out, prev, {
            active: 'en',
            story: { worldNew: { practice: 'Edited AI en', quote: 'Line' } },
        });
        expect(out.en.worldNew).toEqual({ practice: 'Edited AI en', quote: 'Line' });
    });

    it('keeps the other language AI copy untouched', () => {
        const out = JSON.parse(JSON.stringify(prev));
        applyStorySaveToLocales(out, prev, {
            active: 'en',
            story: { worldNew: { practice: 'Edited AI en' } },
        });
        expect(out.ja.worldNew).toEqual({ practice: 'AI ja' });
    });

    it('writes JA when JA is the active language', () => {
        const out = JSON.parse(JSON.stringify(prev));
        applyStorySaveToLocales(out, prev, {
            active: 'ja',
            story: { worldNew: { practice: '編集した AI' } },
        });
        expect(out.ja.worldNew).toEqual({ practice: '編集した AI' });
        expect(out.en.worldNew).toEqual({ practice: 'AI en' });
    });

    it('drops worldNew for the active language when the AI column is cleared', () => {
        const out = JSON.parse(JSON.stringify(prev));
        applyStorySaveToLocales(out, prev, {
            active: 'en',
            story: { worldNew: { practice: '', quote: '', vision: [] } },
        });
        expect(out.en.worldNew).toBeUndefined();
        expect(out.ja.worldNew).toEqual({ practice: 'AI ja' });
    });

    it('never copies AI copy into world and never drops world', () => {
        const out = JSON.parse(JSON.stringify(prev));
        applyStorySaveToLocales(out, prev, {
            active: 'en',
            story: { worldNew: { practice: 'Edited AI en' } },
        });
        expect(out.en.world).toEqual({ practice: 'own en' });
        expect(out.ja.world).toEqual({ practice: 'own ja' });
    });

    it('stores the per-section publish choice once', () => {
        const out = JSON.parse(JSON.stringify(prev));
        applyStorySaveToLocales(out, prev, {
            active: 'en',
            story: {
                worldNew: { practice: 'AI' },
                worldSourceByField: { practice: 'world', vision: 'newWorld', bogus: 'world' },
            },
        });
        expect(out.worldSourceByField).toEqual({ practice: 'world', vision: 'newWorld' });
        expect(out.en.worldSourceByField).toBeUndefined();
    });

    it('leaves the stored choice alone when the editor sends none', () => {
        const withPicks = {
            ...JSON.parse(JSON.stringify(prev)),
            worldSourceByField: { practice: 'world' },
        };
        const out = JSON.parse(JSON.stringify(withPicks));
        applyStorySaveToLocales(out, withPicks, { active: 'en', story: {} });
        expect(out.worldSourceByField).toEqual({ practice: 'world' });
    });

    it('leaves legacy publicWorldSource as-is', () => {
        const out = JSON.parse(JSON.stringify(prev));
        applyStorySaveToLocales(out, prev, {
            active: 'en',
            story: { worldNew: { practice: 'AI' }, worldSourceByField: { practice: 'newWorld' } },
        });
        expect(out.publicWorldSource).toBe('newWorld');
    });

    it('is safe for missing story options', () => {
        const out = JSON.parse(JSON.stringify(prev));
        expect(applyStorySaveToLocales(out, prev)).toBe(out);
        expect(out.en.worldNew).toEqual({ practice: 'AI en' });
    });

    it('handles locales without blocks', () => {
        const out = {};
        applyStorySaveToLocales(out, null, {
            active: 'en',
            story: { worldNew: { practice: LLM_GARBAGE } },
        });
        expect(out.en.worldNew).toBeUndefined();
        expect(out.ja).toEqual({});
    });
});
