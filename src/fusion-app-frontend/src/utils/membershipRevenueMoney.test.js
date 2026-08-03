import { describe, it, expect } from 'vitest';
import {
    buildMembershipRevenueDashboardModel,
    cadenceKeyFromInterval,
    formatMembershipRevenueDashboardHtml,
    formatMembershipRevenueStatHtml,
    membershipRevenueCountsCaption,
    membershipRevenueSummaryOk,
    mergeStripeSubscriptionTiersIntoAccounts,
    mrrCentsForMembershipTier,
    mrrCentsFromPrice,
} from './membershipRevenueMoney.js';

const esc = (s) => s;

/** @param {Partial<{ membershipTier: string, paymentProvider: string, paypalSubscriptionStatus: string, stripeSubscriptionStatus: string, membershipExemptManual: boolean }>} overrides */
function account(overrides = {}) {
    return {
        membershipTier: 'monthly',
        paymentProvider: 'paypal',
        paypalSubscriptionStatus: 'ACTIVE',
        stripeSubscriptionStatus: '',
        membershipExemptManual: false,
        ...overrides,
    };
}

describe('membershipRevenueMoney', () => {
    it('cadenceKeyFromInterval classifies billing intervals', () => {
        expect(cadenceKeyFromInterval('month', 1)).toBe('monthly');
        expect(cadenceKeyFromInterval('month', 2)).toBe('bimonthly');
        expect(cadenceKeyFromInterval('month', 3)).toBe('quarterly');
        expect(cadenceKeyFromInterval('year', 1)).toBe('annual');
        expect(cadenceKeyFromInterval('week', 1)).toBe('other');
    });

    it('mergeStripeSubscriptionTiersIntoAccounts fills missing tiers from Stripe rows', () => {
        const merged = mergeStripeSubscriptionTiersIntoAccounts(
            [
                account({
                    membershipTier: '',
                    paymentProvider: 'stripe',
                    paypalSubscriptionStatus: '',
                    stripeSubscriptionStatus: 'active',
                    principal: 'aaaaa-aa',
                    stripeSubscriptionId: 'sub_1',
                }),
            ],
            {
                ok: true,
                mrrCents: 2500,
                subscriptions: [
                    { subscriptionId: 'sub_1', principal: 'aaaaa-aa', cadence: 'bimonthly' },
                ],
            },
        );
        expect(merged[0].membershipTier).toBe('bimonthly');
    });

    it('mergeStripeSubscriptionTiersIntoAccounts applies dominant Stripe cadence to untiered Stripe rows', () => {
        const merged = mergeStripeSubscriptionTiersIntoAccounts(
            [
                account({
                    membershipTier: '',
                    paymentProvider: 'stripe',
                    paypalSubscriptionStatus: '',
                    stripeSubscriptionStatus: 'active',
                }),
            ],
            {
                ok: true,
                mrrCents: 2500,
                cadence: { monthlyCents: 0, bimonthlyCents: 5000, annualCents: 0, otherCents: 0 },
            },
        );
        expect(merged[0].membershipTier).toBe('bimonthly');
    });

    it('buildMembershipRevenueDashboardModel falls back to Stripe cadence when tiers missing', () => {
        const model = buildMembershipRevenueDashboardModel(
            [
                account({
                    membershipTier: '',
                    paymentProvider: 'stripe',
                    paypalSubscriptionStatus: '',
                    stripeSubscriptionStatus: 'active',
                }),
                account({
                    membershipTier: '',
                    paymentProvider: 'stripe',
                    paypalSubscriptionStatus: '',
                    stripeSubscriptionStatus: 'active',
                }),
            ],
            {
                ok: true,
                mrrCents: 5000,
                cadence: { monthlyCents: 0, bimonthlyCents: 10000, annualCents: 0, otherCents: 0 },
                counts: { active: 2, trialing: 0, included: 2 },
            },
        );
        expect(model.tiers.bimonthly.count).toBe(2);
        expect(model.mrrCents).toBe(5000);
        expect(model.untieredPaying).toBe(0);
    });

    it('mrrCentsFromPrice normalizes monthly and annual amounts', () => {
        expect(mrrCentsFromPrice(5000, 'month', 2)).toBe(2500);
        expect(mrrCentsFromPrice(5000, 'month', 1)).toBe(5000);
        expect(mrrCentsFromPrice(26000, 'year', 1)).toBe(2167);
        expect(mrrCentsFromPrice(-1, 'month', 1)).toBe(0);
    });

    it('mrrCentsForMembershipTier uses list-price monthly equivalents', () => {
        expect(mrrCentsForMembershipTier('monthly')).toBe(3000);
        expect(mrrCentsForMembershipTier('quarterly')).toBe(2500);
        expect(mrrCentsForMembershipTier('annual')).toBe(2167);
        expect(mrrCentsForMembershipTier('bimonthly')).toBe(2500);
        expect(mrrCentsForMembershipTier('')).toBe(0);
    });

    it('membershipRevenueCountsCaption formats subscriber counts', () => {
        expect(membershipRevenueCountsCaption({ active: 8, trialing: 2, included: 10 })).toBe(
            '8 active · 2 trialing · 10 included',
        );
        expect(membershipRevenueCountsCaption({})).toBe('No active membership subscriptions');
    });

    it('membershipRevenueSummaryOk validates summary shape', () => {
        expect(membershipRevenueSummaryOk({ ok: true, mrrCents: 100 })).toBe(true);
        expect(membershipRevenueSummaryOk({ ok: false })).toBe(false);
        expect(membershipRevenueSummaryOk(null)).toBe(false);
    });

    it('buildMembershipRevenueDashboardModel mixes tiers into normalized MRR', () => {
        const model = buildMembershipRevenueDashboardModel([
            account({ membershipTier: 'monthly', paymentProvider: 'paypal' }),
            account({ membershipTier: 'monthly', paymentProvider: 'paypal' }),
            account({ membershipTier: 'monthly', paymentProvider: 'stripe', paypalSubscriptionStatus: '', stripeSubscriptionStatus: 'active' }),
            account({ membershipTier: 'quarterly', paymentProvider: 'paypal' }),
            account({ membershipTier: 'quarterly', paymentProvider: 'paypal' }),
            account({ membershipTier: 'annual', paymentProvider: 'paypal' }),
            account({ membershipTier: 'bimonthly', paymentProvider: 'stripe', paypalSubscriptionStatus: '', stripeSubscriptionStatus: 'active' }),
            account({ membershipTier: 'bimonthly', paymentProvider: 'paypal' }),
        ]);

        expect(model.payingMembers).toBe(8);
        expect(model.tiers.monthly.count).toBe(3);
        expect(model.tiers.quarterly.count).toBe(2);
        expect(model.tiers.annual.count).toBe(1);
        expect(model.tiers.bimonthly.count).toBe(2);
        // 3×30 + 2×25 + 1×21.67 + 2×25 = 90 + 50 + 21.67 + 50 = 211.67
        expect(model.mrrCents).toBe(3 * 3000 + 2 * 2500 + 2167 + 2 * 2500);
        expect(model.arrCents).toBe(model.mrrCents * 12);
        expect(model.providers.paypal).toBe(6);
        expect(model.providers.stripe).toBe(2);
    });

    it('buildMembershipRevenueDashboardModel excludes exempt and inactive', () => {
        const model = buildMembershipRevenueDashboardModel([
            account({ membershipTier: 'monthly' }),
            account({ membershipTier: 'annual', membershipExemptManual: true }),
            account({
                membershipTier: 'quarterly',
                paypalSubscriptionStatus: 'CANCELLED',
                paymentProvider: 'paypal',
            }),
            account({
                membershipTier: 'monthly',
                paymentProvider: '',
                paypalSubscriptionStatus: '',
                stripeSubscriptionStatus: '',
            }),
        ]);
        expect(model.payingMembers).toBe(1);
        expect(model.mrrCents).toBe(3000);
        expect(model.tiers.annual.count).toBe(0);
        expect(model.tiers.quarterly.count).toBe(0);
    });

    it('formatMembershipRevenueDashboardHtml renders hero and tier cards', () => {
        const model = buildMembershipRevenueDashboardModel([
            account({ membershipTier: 'monthly' }),
            account({ membershipTier: 'quarterly' }),
            account({ membershipTier: 'bimonthly' }),
        ]);
        const html = formatMembershipRevenueDashboardHtml(model, esc);
        expect(html).toContain('Normalized MRR');
        expect(html).toContain('Quarterly');
        expect(html).toContain('Legacy bi-monthly');
        expect(html).toContain('Provider mix');
        expect(html).toContain('MRR contribution');
    });

    it('formatMembershipRevenueStatHtml renders MRR and cadence cards', () => {
        const html = formatMembershipRevenueStatHtml(
            {
                ok: true,
                mrrCents: 2500,
                cadence: { monthlyCents: 0, bimonthlyCents: 5000, annualCents: 26000, otherCents: 0 },
                counts: { active: 1, trialing: 0, included: 1 },
            },
            esc,
        );
        expect(html).toContain('Monthly equivalent (MRR)');
        expect(html).toContain('$25.00');
        expect(html).toContain('Bi-monthly billing');
        expect(html).toContain('$50.00');
        expect(html).toContain('$260.00');
    });
});
