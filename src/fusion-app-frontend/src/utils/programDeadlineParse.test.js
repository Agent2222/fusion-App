import { describe, it, expect } from 'vitest';
import {
    countCalendarMonthsFromNowToDeadline,
    formatMonthlyFromRemainingAndMonths,
    parseLooseCurrencyToNumber,
    resolveProgramApplicationDeadlineDate,
    splitTextLinesForBullets,
} from './programDeadlineParse.js';

describe('splitTextLinesForBullets', () => {
    it('splits and trims', () => {
        expect(splitTextLinesForBullets('a\n\nb\nc')).toEqual(['a', 'b', 'c']);
    });
    it('returns [] for empty', () => {
        expect(splitTextLinesForBullets('  \n  ')).toEqual([]);
    });
});

describe('parseLooseCurrencyToNumber', () => {
    it('parses $ and JPY', () => {
        expect(parseLooseCurrencyToNumber('$1,000.50')?.amount).toBeCloseTo(1000.5, 2);
        expect(parseLooseCurrencyToNumber('¥200,000')?.amount).toBe(200000);
        expect(parseLooseCurrencyToNumber('10,000円')?.defaultCurrency).toBe('JPY');
    });
    it('returns null for junk', () => {
        expect(parseLooseCurrencyToNumber('n/a')).toBeNull();
    });
});

describe('countCalendarMonthsFromNowToDeadline', () => {
    it('returns 0 when deadline not after now', () => {
        const n = new Date(2020, 0, 10);
        const d = new Date(2020, 0, 5);
        expect(countCalendarMonthsFromNowToDeadline(n, d)).toBe(0);
    });
    it('gives at least 1 for short horizons', () => {
        const n = new Date(2026, 0, 10, 12, 0, 0);
        const d = new Date(2026, 0, 20, 12, 0, 0);
        expect(countCalendarMonthsFromNowToDeadline(n, d)).toBe(1);
    });
    it('counts calendar months for longer spans', () => {
        const n = new Date(2026, 0, 1, 0, 0, 0);
        const d = new Date(2026, 3, 1, 0, 0, 0);
        expect(countCalendarMonthsFromNowToDeadline(n, d)).toBe(3);
    });
});

describe('formatMonthlyFromRemainingAndMonths', () => {
    it('formats or returns dash', () => {
        expect(formatMonthlyFromRemainingAndMonths('¥300,000', 3)).toMatch(/100/);
        expect(formatMonthlyFromRemainingAndMonths('nope', 3)).toBe('—');
    });
});

describe('resolveProgramApplicationDeadlineDate', () => {
    it('reads applicationDeadlineIso first', () => {
        const d = resolveProgramApplicationDeadlineDate(
            { applicationForm: { applicationDeadlineIso: '2027-12-15' } },
            '',
        );
        expect(d).toBeInstanceOf(Date);
        expect(d?.getUTCFullYear()).toBe(2027);
    });
});
