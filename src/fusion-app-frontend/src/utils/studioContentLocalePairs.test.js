import { describe, expect, it } from 'vitest';
import { groupLocaleContentRows, localePairKey, pathLocaleSide } from './studioContentLocalePairs.js';

describe('studioContentLocalePairs', () => {
    it('localePairKey handles root en/ja', () => {
        expect(localePairKey('en.headline')).toBe('@:headline');
        expect(localePairKey('ja.headline')).toBe('@:headline');
    });

    it('localePairKey handles nested membership.band.en.title', () => {
        expect(localePairKey('membership.band.en.title')).toBe('membership.band.@:title');
        expect(localePairKey('membership.band.ja.title')).toBe('membership.band.@:title');
    });

    it('pathLocaleSide', () => {
        expect(pathLocaleSide('en.x')).toBe('en');
        expect(pathLocaleSide('ja.x')).toBe('ja');
        expect(pathLocaleSide('foo.en.bar')).toBe('en');
        expect(pathLocaleSide('foo.ja.bar')).toBe('ja');
        expect(pathLocaleSide('nolocale')).toBe(null);
    });

    it('groupLocaleContentRows pairs en/ja with same rest path', () => {
        const rows = [
            { path: 'en.a', label: 'E', value: '1' },
            { path: 'ja.a', label: 'J', value: '2' },
            { path: 'solo', label: 'S', value: 'x' },
        ];
        const g = groupLocaleContentRows(rows);
        expect(g).toHaveLength(2);
        expect(g[0].type).toBe('pair');
        if (g[0].type === 'pair') {
            expect(g[0].en.path).toBe('en.a');
            expect(g[0].ja.path).toBe('ja.a');
        }
        expect(g[1].type).toBe('single');
    });
});
