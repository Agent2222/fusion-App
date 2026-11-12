import { describe, it, expect } from 'vitest';
import {
    buildWorldSectionPrompt,
    parseWorldSectionReply,
    suggestWorldSectionValue,
    translateWorldSectionValue,
    WORLD_SECTION_FIELD_KEYS,
    WORLD_SECTION_SPECS,
} from './memberWorldSectionSuggest.js';

const LLM_GARBAGE = "I don't see any source text provided for translation.";

describe('buildWorldSectionPrompt', () => {
    it('names the section and asks for plain text, not JSON', () => {
        const prompt = buildWorldSectionPrompt('practice');
        expect(prompt).toContain('"practice"');
        expect(prompt.match(/no JSON/i)).toBeTruthy();
        expect(prompt).toContain('THIRD PERSON');
    });

    it('asks for an exact line count on array sections', () => {
        expect(buildWorldSectionPrompt('vision')).toContain('exactly 4 lines');
        expect(buildWorldSectionPrompt('context')).toContain('exactly 3 lines');
        expect(buildWorldSectionPrompt('context')).toContain('NONE');
    });

    it('asks for blank-line separated paragraphs on paragraph sections', () => {
        expect(buildWorldSectionPrompt('perspective')).toContain('single blank line');
        expect(buildWorldSectionPrompt('constructing')).toContain('single blank line');
    });

    it('covers every editor section and rejects unknown ones', () => {
        for (const field of WORLD_SECTION_FIELD_KEYS) {
            expect(buildWorldSectionPrompt(field).length).toBeGreaterThan(200);
        }
        expect(() => buildWorldSectionPrompt('nope')).toThrow(/Unknown story section/);
    });
});

describe('parseWorldSectionReply', () => {
    it('unwraps fenced and labelled scalar replies', () => {
        expect(parseWorldSectionReply('practice', '```\nPractice: Works in clay.\n```')).toBe(
            'Works in clay.',
        );
        expect(parseWorldSectionReply('quote', '"A single quiet line"')).toBe('A single quiet line');
        expect(parseWorldSectionReply('quote', '“引用”')).toBe('引用');
    });

    it('collapses multi-line scalar replies to one line', () => {
        expect(parseWorldSectionReply('practice', 'Line one\nline two')).toBe('Line one line two');
    });

    it('splits paragraphs on blank lines and caps the count', () => {
        const value = parseWorldSectionReply(
            'perspective',
            'First thought.\n\nSecond thought.\n\nThird thought.',
        );
        expect(value).toEqual(['First thought.', 'Second thought.']);
    });

    it('keeps NONE slots as empty strings so context order is stable', () => {
        expect(
            parseWorldSectionReply('context', 'Based in Santiago\nCeramics, installation\nNONE'),
        ).toEqual(['Based in Santiago', 'Ceramics, installation', '']);
    });

    it('pads short vision replies to four lines and strips bullets', () => {
        expect(parseWorldSectionReply('vision', '- Slow\n- Material\n')).toEqual([
            'Slow',
            'Material',
            '',
            '',
        ]);
    });

    it('rejects empty and LLM-failure replies', () => {
        expect(() => parseWorldSectionReply('practice', '   ')).toThrow(/empty suggestion/);
        expect(() => parseWorldSectionReply('practice', LLM_GARBAGE)).toThrow(
            /could not write this section/,
        );
        expect(() => parseWorldSectionReply('vision', 'NONE\nNONE\nNONE\nNONE')).toThrow(
            /empty suggestion/,
        );
    });
});

describe('translateWorldSectionValue', () => {
    it('translates each array unit and preserves empty slots', async () => {
        const translate = async (s) => `JA:${s}`;
        await expect(
            translateWorldSectionValue(['Based in Santiago', ''], translate),
        ).resolves.toEqual(['JA:Based in Santiago', '']);
    });

    it('translates scalars and needs a translate function', async () => {
        await expect(
            translateWorldSectionValue('Works', async (s) => s.toUpperCase()),
        ).resolves.toBe('WORKS');
        await expect(translateWorldSectionValue('Works', undefined)).rejects.toThrow(
            /Translation is not available/,
        );
    });
});

describe('suggestWorldSectionValue', () => {
    it('calls the LLM with the section prompt and parses the reply', async () => {
        const calls = [];
        const value = await suggestWorldSectionValue('practice', {
            sourceJson: '{"name":"Ada"}',
            reinterpret: async (prompt, source, tag) => {
                calls.push({ prompt, source, tag });
                return 'Works in clay.';
            },
        });
        expect(value).toBe('Works in clay.');
        expect(calls).toHaveLength(1);
        expect(calls[0].source).toBe('{"name":"Ada"}');
        expect(calls[0].tag).toBe('en');
        expect(calls[0].prompt).toContain('"practice"');
    });

    it('translates to Japanese when asked', async () => {
        const value = await suggestWorldSectionValue('vision', {
            sourceJson: '{}',
            locale: 'ja',
            reinterpret: async () => 'One\nTwo\nThree\nFour',
            translate: async (s) => `JA ${s}`,
        });
        expect(value).toEqual(['JA One', 'JA Two', 'JA Three', 'JA Four']);
    });

    it('needs source material and a reinterpret function', async () => {
        await expect(
            suggestWorldSectionValue('practice', {
                sourceJson: '  ',
                reinterpret: async () => 'x',
            }),
        ).rejects.toThrow(/Add a bio, discipline, or location first/);
        await expect(suggestWorldSectionValue('practice', { sourceJson: '{}' })).rejects.toThrow(
            /not available right now/,
        );
        await expect(suggestWorldSectionValue('nope', { sourceJson: '{}' })).rejects.toThrow(
            /Unknown story section/,
        );
    });
});

describe('WORLD_SECTION_SPECS', () => {
    it('describes every editor section', () => {
        for (const field of WORLD_SECTION_FIELD_KEYS) {
            const spec = WORLD_SECTION_SPECS[field];
            expect(spec.label).toBeTruthy();
            expect(['text', 'paragraphs', 'lines']).toContain(spec.kind);
        }
    });
});
