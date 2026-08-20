import { describe, it, expect } from 'vitest';
import { canonicalProgramSeoPath } from './canonicalProgramSeoPath.js';

describe('canonicalProgramSeoPath', () => {
    it('maps /programs/{slug} to /program/{slug}', () => {
        expect(canonicalProgramSeoPath('/programs/kaga-ishikawa')).toBe('/program/kaga-ishikawa');
    });

    it('keeps /program/{slug}', () => {
        expect(canonicalProgramSeoPath('/program/kaga-ishikawa')).toBe('/program/kaga-ishikawa');
    });

    it('normalizes private program paths under /program/private/', () => {
        expect(canonicalProgramSeoPath('/programs/private/secret')).toBe('/program/private/secret');
        expect(canonicalProgramSeoPath('/program/private/secret')).toBe('/program/private/secret');
    });

    it('returns empty for non-program paths', () => {
        expect(canonicalProgramSeoPath('/programs')).toBe('');
        expect(canonicalProgramSeoPath('/artists')).toBe('');
    });
});
