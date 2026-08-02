import { describe, it, expect } from 'vitest';
import {
    getChangePlanOptions,
    membershipTierFromPlanId,
    normalizeMembershipTier,
    planIdForTier,
    startPlanChange,
} from './membershipPlanChange.js';

describe('normalizeMembershipTier', () => {
    it('maps aliases', () => {
        expect(normalizeMembershipTier('bi_monthly')).toBe('bimonthly');
        expect(normalizeMembershipTier('Monthly')).toBe('monthly');
        expect(normalizeMembershipTier('nope')).toBe('');
    });
});

describe('getChangePlanOptions', () => {
    it('legacy bi-monthly upgrades only', () => {
        expect(getChangePlanOptions('bimonthly').map((o) => o.tier)).toEqual([
            'monthly',
            'quarterly',
            'annual',
        ]);
    });

    it('monthly upgrades to quarterly/annual', () => {
        expect(getChangePlanOptions('monthly')).toEqual([
            { tier: 'quarterly', kind: 'upgrade' },
            { tier: 'annual', kind: 'upgrade' },
        ]);
    });

    it('quarterly can go annual or monthly', () => {
        expect(getChangePlanOptions('quarterly')).toEqual([
            { tier: 'annual', kind: 'upgrade' },
            { tier: 'monthly', kind: 'downgrade' },
        ]);
    });

    it('annual downgrades only', () => {
        expect(getChangePlanOptions('annual')).toEqual([
            { tier: 'quarterly', kind: 'downgrade' },
            { tier: 'monthly', kind: 'downgrade' },
        ]);
    });
});

describe('plan id helpers', () => {
    const config = {
        planMonthly: 'P-MONTH',
        planQuarterly: 'P-QTR',
        planAnnual: 'P-YEAR',
        planBimonthlyLegacy: 'P-LEGACY',
    };

    it('resolves tier from plan id', () => {
        expect(membershipTierFromPlanId('P-QTR', config)).toBe('quarterly');
        expect(membershipTierFromPlanId('P-LEGACY', config)).toBe('bimonthly');
        expect(planIdForTier('annual', config)).toBe('P-YEAR');
        expect(planIdForTier('bimonthly', config)).toBe('');
    });
});

describe('startPlanChange', () => {
    it('Stripe returns coming-soon message', async () => {
        const r = await startPlanChange({
            provider: 'stripe',
            principal: 'aaaaa-aa',
            targetTier: 'annual',
        });
        expect(r.message).toMatch(/coming soon/i);
    });

    it('PayPal calls revise and returns approveUrl', async () => {
        const r = await startPlanChange({
            provider: 'paypal',
            principal: 'aaaaa-aa',
            targetTier: 'quarterly',
            subscriptionId: 'I-SUB',
            revisePayPal: async () => ({ approveUrl: 'https://paypal.example/approve' }),
        });
        expect(r.approveUrl).toBe('https://paypal.example/approve');
        expect(r.pending).toBe(true);
    });
});
