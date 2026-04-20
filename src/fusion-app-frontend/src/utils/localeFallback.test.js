import { describe, expect, it } from 'vitest';
import { firstNonEmptyString, isEmptyLocaleValue, mergeLocaleDeep } from './localeFallback.js';

describe('localeFallback', () => {
    it('isEmptyLocaleValue', () => {
        expect(isEmptyLocaleValue(null)).toBe(true);
        expect(isEmptyLocaleValue(undefined)).toBe(true);
        expect(isEmptyLocaleValue('')).toBe(true);
        expect(isEmptyLocaleValue('  ')).toBe(true);
        expect(isEmptyLocaleValue([])).toBe(true);
        expect(isEmptyLocaleValue({})).toBe(true);
        expect(isEmptyLocaleValue(0)).toBe(false);
        expect(isEmptyLocaleValue(false)).toBe(false);
        expect(isEmptyLocaleValue('a')).toBe(false);
    });

    it('mergeLocaleDeep fills empty JA from EN strings', () => {
        const en = { title: 'Hello', body: 'World' };
        const ja = { title: 'こんにちは', body: '' };
        const out = /** @type {Record<string, string>} */ (mergeLocaleDeep(en, ja));
        expect(out.title).toBe('こんにちは');
        expect(out.body).toBe('World');
    });

    it('mergeLocaleDeep merges nested objects and arrays by index', () => {
        const en = {
            a: { x: 1, y: 2 },
            list: [{ t: 'one' }, { t: 'two' }],
        };
        const ja = {
            a: { y: '' },
            list: [{ t: '' }, { t: 'に' }],
        };
        const out = /** @type {any} */ (mergeLocaleDeep(en, ja));
        expect(out.a.x).toBe(1);
        expect(out.a.y).toBe(2);
        expect(out.list[0].t).toBe('one');
        expect(out.list[1].t).toBe('に');
    });

    it('firstNonEmptyString', () => {
        expect(firstNonEmptyString('', '  ', 'ok')).toBe('ok');
        expect(firstNonEmptyString(undefined, null, '')).toBe('');
    });
});
