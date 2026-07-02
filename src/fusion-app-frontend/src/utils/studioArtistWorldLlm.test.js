import { describe, it, expect } from 'vitest';
import {
    buildSourceJsonFromManageFormWorld,
    buildWorldLlmInstruction,
    coerceParsedWorldShape,
    fixRawNewlinesInJsonStrings,
    parseWorldJsonResponse,
    validateWorldShape,
} from './studioArtistWorldLlm.js';

describe('buildWorldLlmInstruction', () => {
    it('returns base JSON instruction when no extra prompt', () => {
        const instruction = buildWorldLlmInstruction('');
        expect(instruction).toContain('"practice"');
        expect(instruction).toContain('Kamauu-style');
        expect(instruction).toContain('SOURCE_JSON');
    });

    it('appends optional style guidance', () => {
        const instruction = buildWorldLlmInstruction('More poetic');
        expect(instruction).toContain('Additional style guidance');
        expect(instruction).toContain('More poetic');
    });
});

describe('buildSourceJsonFromManageFormWorld', () => {
    it('includes storyWorldFromArtist from World tab fields', () => {
        const json = buildSourceJsonFromManageFormWorld({
            name: 'Ada Lovelace',
            discipline: 'Sound',
            world: {
                practice: 'Explores resonance',
                perspective: ['Line one'],
                vision: ['a', 'b', 'c', 'd'],
                constructing: 'Building slowly',
                context: ['Tokyo', 'Sound art', ''],
                quote: 'A quote',
            },
        });
        const parsed = JSON.parse(json);
        expect(parsed.name).toBe('Ada Lovelace');
        expect(parsed.storyWorldFromArtist.practice).toBe('Explores resonance');
        expect(parsed.storyWorldFromArtist.context).toContain('Tokyo');
    });
});

describe('batch world JSON shape', () => {
    it('accepts minified Kamauu-style JSON', () => {
        const raw = JSON.stringify({
            practice: 'Micro bio line.',
            perspective: ['Para one', 'Para two'],
            vision: ['One', 'Two', 'Three', 'Four'],
            constructing: 'How they work.',
            context: ['Based in Tokyo', 'Sound and video', ''],
            quote: 'Quote block.',
        });
        const parsed = parseWorldJsonResponse(raw);
        expect(() => validateWorldShape(parsed)).not.toThrow();
    });

    it('coerces vision string into four lines', () => {
        const coerced = coerceParsedWorldShape({
            practice: 'Bio',
            perspective: 'One paragraph',
            vision: 'Line one\nLine two\nLine three',
            constructing: 'Making',
            context: 'Tokyo\nSound\nShows',
            quote: 'Quote',
        });
        expect(coerced.vision).toEqual(['Line one', 'Line two', 'Line three', '']);
        expect(coerced.context).toEqual(['Tokyo', 'Sound', 'Shows']);
        expect(() => validateWorldShape(coerced)).not.toThrow();
    });

    it('repairs raw newlines inside JSON strings', () => {
        const broken = '{"practice":"Hello","perspective":"Para one\nPara two","vision":["A","B","C","D"],"constructing":"Make","context":["X","Y",""],"quote":"Q"}';
        const fixed = fixRawNewlinesInJsonStrings(broken);
        expect(() => JSON.parse(fixed)).not.toThrow();
        const parsed = parseWorldJsonResponse(broken);
        expect(() => validateWorldShape(parsed)).not.toThrow();
    });
});
