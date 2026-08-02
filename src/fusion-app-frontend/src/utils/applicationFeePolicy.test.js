import { describe, it, expect } from 'vitest';
import {
    APPLICATION_FEE_GUEST_CENTS,
    APPLICATION_FEE_MEMBER_CENTS,
    calendarQuarterKey,
    quarterKeyToIndex,
    quarterIndexToKey,
    accrueQuarterlyCreditsState,
    computeApplicationFeeDue,
} from './applicationFeePolicy.js';

describe('calendar quarter helpers', () => {
    it('formats YYYY-Qn', () => {
        expect(calendarQuarterKey(new Date(Date.UTC(2026, 0, 15)))).toBe('2026-Q1');
        expect(calendarQuarterKey(new Date(Date.UTC(2026, 6, 1)))).toBe('2026-Q3');
    });

    it('round-trips quarter index keys', () => {
        expect(quarterIndexToKey(quarterKeyToIndex('2026-Q2'))).toBe('2026-Q2');
        expect(quarterKeyToIndex('bad')).toBeNull();
    });
});

describe('accrueQuarterlyCreditsState', () => {
    it('grants +1 on first subscribe (empty lastAccrued)', () => {
        const r = accrueQuarterlyCreditsState({
            balance: 0,
            lastAccrued: '',
            currentKey: '2026-Q2',
            tier: 'quarterly',
            membershipActive: true,
        });
        expect(r.balance).toBe(1);
        expect(r.lastAccrued).toBe('2026-Q2');
        expect(r.granted).toBe(1);
    });

    it('stacks catch-up for missed quarters', () => {
        const r = accrueQuarterlyCreditsState({
            balance: 1,
            lastAccrued: '2026-Q1',
            currentKey: '2026-Q3',
            tier: 'quarterly',
            membershipActive: true,
        });
        expect(r.granted).toBe(2);
        expect(r.balance).toBe(3);
        expect(r.lastAccrued).toBe('2026-Q3');
    });

    it('does not accrue when inactive or non-quarterly', () => {
        expect(
            accrueQuarterlyCreditsState({
                balance: 2,
                lastAccrued: '2026-Q1',
                currentKey: '2026-Q3',
                tier: 'monthly',
                membershipActive: true,
            }).granted,
        ).toBe(0);
        expect(
            accrueQuarterlyCreditsState({
                balance: 2,
                lastAccrued: '2026-Q1',
                currentKey: '2026-Q3',
                tier: 'quarterly',
                membershipActive: false,
            }).granted,
        ).toBe(0);
    });
});

describe('computeApplicationFeeDue', () => {
    it('guest / no membership → $50', () => {
        const r = computeApplicationFeeDue({ membershipAccess: 'needsSubscription', tier: '' });
        expect(r.dueCents).toBe(APPLICATION_FEE_GUEST_CENTS);
        expect(r.reason).toBe('application_only');
    });

    it('monthly → $35 (credits ignored)', () => {
        const r = computeApplicationFeeDue({
            membershipAccess: 'ok',
            tier: 'monthly',
            appCreditBalance: 5,
            lastAccrued: '2026-Q1',
            currentQuarterKey: '2026-Q2',
        });
        expect(r.dueCents).toBe(APPLICATION_FEE_MEMBER_CENTS);
        expect(r.reason).toBe('member_fee');
    });

    it('legacy bimonthly → $35', () => {
        const r = computeApplicationFeeDue({
            membershipAccess: 'ok',
            tier: 'bimonthly',
            currentQuarterKey: '2026-Q2',
        });
        expect(r.dueCents).toBe(APPLICATION_FEE_MEMBER_CENTS);
    });

    it('annual → $0', () => {
        const r = computeApplicationFeeDue({
            membershipAccess: 'ok',
            tier: 'annual',
            currentQuarterKey: '2026-Q2',
        });
        expect(r.dueCents).toBe(0);
        expect(r.reason).toBe('annual');
    });

    it('quarterly with credit → $0; after consume next due is $35 when balance 0', () => {
        const withCredit = computeApplicationFeeDue({
            membershipAccess: 'ok',
            tier: 'quarterly',
            appCreditBalance: 0,
            lastAccrued: '',
            currentQuarterKey: '2026-Q2',
        });
        expect(withCredit.dueCents).toBe(0);
        expect(withCredit.reason).toBe('credit');
        expect(withCredit.appCreditBalance).toBe(1);

        const afterSpend = computeApplicationFeeDue({
            membershipAccess: 'ok',
            tier: 'quarterly',
            appCreditBalance: 0,
            lastAccrued: '2026-Q2',
            currentQuarterKey: '2026-Q2',
        });
        expect(afterSpend.dueCents).toBe(APPLICATION_FEE_MEMBER_CENTS);
        expect(afterSpend.reason).toBe('member_fee');
    });

    it('quarterly skip a quarter stacks credits', () => {
        const r = computeApplicationFeeDue({
            membershipAccess: 'ok',
            tier: 'quarterly',
            appCreditBalance: 1,
            lastAccrued: '2026-Q1',
            currentQuarterKey: '2026-Q3',
        });
        expect(r.appCreditBalance).toBe(3);
        expect(r.dueCents).toBe(0);
        expect(r.reason).toBe('credit');
    });

    it('exempt → $0', () => {
        expect(
            computeApplicationFeeDue({ membershipAccess: 'exempt', tier: 'monthly' }).dueCents,
        ).toBe(0);
    });
});
