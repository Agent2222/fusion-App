import { describe, it, expect } from 'vitest';
import {
    DRAW_ENTRY_FEE_CENTS,
    DRAW_SLOT_GOAL_DEFAULT,
    buildApplicantDrawDetailModel,
    isProgramDrawGoalReached,
    parseProgramDrawClosed,
    keepProgramDrawClosed,
    resolveDrawClosedFlag,
    resolveProgramDrawLiveState,
} from './applicantsDrawModel.js';

describe('buildApplicantDrawDetailModel', () => {
    it('defaults to 100-slot goal and revenue from paid entries only', () => {
        const m = buildApplicantDrawDetailModel({
            programId: 'p1',
            programTitle: 'Kaga',
            claimedSlots: 50,
            paidEntryCount: 12,
            drawActive: true,
        });
        expect(m.totalSlots).toBe(DRAW_SLOT_GOAL_DEFAULT);
        expect(m.claimedSlots).toBe(50);
        expect(m.availableSlots).toBe(50);
        expect(m.progressPct).toBe(50);
        expect(m.paidEntryCount).toBe(12);
        expect(m.revenueCents).toBe(12 * DRAW_ENTRY_FEE_CENTS);
        expect(m.drawActive).toBe(true);
    });

    it('does not treat credit-claimed slots as revenue', () => {
        const m = buildApplicantDrawDetailModel({
            programId: 'p1',
            claimedSlots: 40,
            paidEntryCount: 0,
            totalSlots: 100,
        });
        expect(m.claimedSlots).toBe(40);
        expect(m.availableSlots).toBe(60);
        expect(m.revenueCents).toBe(0);
    });

    it('clamps claimed to total and computes 100% progress', () => {
        const m = buildApplicantDrawDetailModel({
            programId: 'p1',
            claimedSlots: 200,
            paidEntryCount: 5,
            totalSlots: 100,
        });
        expect(m.claimedSlots).toBe(100);
        expect(m.availableSlots).toBe(0);
        expect(m.progressPct).toBe(100);
        expect(m.revenueCents).toBe(5 * DRAW_ENTRY_FEE_CENTS);
    });
});

describe('isProgramDrawGoalReached', () => {
    it('is false just below the slot boundary', () => {
        expect(isProgramDrawGoalReached(99, 100)).toBe(false);
        expect(isProgramDrawGoalReached(0, 100)).toBe(false);
    });

    it('is true at and above the slot boundary', () => {
        expect(isProgramDrawGoalReached(100, 100)).toBe(true);
        expect(isProgramDrawGoalReached(101, 100)).toBe(true);
    });

    it('treats empty or invalid slots as the 100 default', () => {
        expect(isProgramDrawGoalReached(100, '')).toBe(true);
        expect(isProgramDrawGoalReached(99, 'x')).toBe(false);
        expect(isProgramDrawGoalReached(100, undefined)).toBe(true);
    });
});

describe('parseProgramDrawClosed', () => {
    it('reads closed from a localesJson string', () => {
        expect(parseProgramDrawClosed(JSON.stringify({ en: {}, ja: {}, draw: { closed: true } }))).toBe(
            true,
        );
        expect(parseProgramDrawClosed(JSON.stringify({ en: {}, ja: {}, draw: { closed: false } }))).toBe(
            false,
        );
        expect(parseProgramDrawClosed('{"en":{}}')).toBe(false);
    });

    it('reads closed from a program row with localesJson', () => {
        expect(
            parseProgramDrawClosed({
                localesJson: JSON.stringify({ finance: {}, draw: { closed: true } }),
            }),
        ).toBe(true);
        expect(parseProgramDrawClosed({ localesJson: '{}' })).toBe(false);
    });

    it('reads closed from a parsed locales object', () => {
        expect(parseProgramDrawClosed({ draw: { closed: true } })).toBe(true);
        expect(parseProgramDrawClosed({ draw: {} })).toBe(false);
    });

    it('still finds closed on localesJson when the card has an empty draw object', () => {
        expect(
            parseProgramDrawClosed({
                draw: {},
                localesJson: JSON.stringify({ draw: { closed: true } }),
            }),
        ).toBe(true);
    });
});

describe('resolveDrawClosedFlag', () => {
    it('treats a closed program row as closed even when the attribute is false', () => {
        const row = { localesJson: JSON.stringify({ draw: { closed: true } }) };
        expect(resolveDrawClosedFlag('false', row)).toBe(true);
        expect(resolveDrawClosedFlag('', row)).toBe(true);
        expect(resolveDrawClosedFlag('true', { localesJson: '{}' })).toBe(true);
        expect(resolveDrawClosedFlag('false', { localesJson: '{}' })).toBe(false);
    });
});

describe('resolveProgramDrawLiveState', () => {
    it('prefers closed over inactive and open', () => {
        expect(resolveProgramDrawLiveState({ closed: true, active: true })).toBe('closed');
        expect(resolveProgramDrawLiveState({ closed: true, active: false })).toBe('closed');
    });

    it('returns inactive when not closed and award is off', () => {
        expect(resolveProgramDrawLiveState({ closed: false, active: false })).toBe('inactive');
    });

    it('returns open when not closed and award is on or unspecified', () => {
        expect(resolveProgramDrawLiveState({ closed: false, active: true })).toBe('open');
        expect(resolveProgramDrawLiveState({})).toBe('open');
    });
});

describe('keepProgramDrawClosed', () => {
    it('does not let a false enrich pack wipe a parsed closed flag', () => {
        expect(keepProgramDrawClosed(true, false)).toBe(true);
        expect(keepProgramDrawClosed(true, true)).toBe(true);
        expect(keepProgramDrawClosed(false, true)).toBe(true);
        expect(keepProgramDrawClosed(false, false)).toBe(false);
    });
});
