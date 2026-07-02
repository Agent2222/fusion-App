import { describe, it, expect } from 'vitest';
import {
    cadenceKeyFromInterval,
    formatMembershipRevenueStatHtml,
    membershipRevenueCountsCaption,
    membershipRevenueSummaryOk,
    mrrCentsFromPrice,
} from './membershipRevenueMoney.js';

const esc = (s) => s;

describe('membershipRevenueMoney', () => {
    it('cadenceKeyFromInterval classifies billing intervals', () => {
        expect(cadenceKeyFromInterval('month', 1)).toBe('monthly');
        expect(cadenceKeyFromInterval('month', 2)).toBe('bimonthly');
        expect(cadenceKeyFromInterval('year', 1)).toBe('annual');
        expect(cadenceKeyFromInterval('week', 1)).toBe('other');
    });

    it('mrrCentsFromPrice normalizes monthly and annual amounts', () => {
        expect(mrrCentsFromPrice(5000, 'month', 2)).toBe(2500);
        expect(mrrCentsFromPrice(5000, 'month', 1)).toBe(5000);
        expect(mrrCentsFromPrice(26000, 'year', 1)).toBe(2167);
        expect(mrrCentsFromPrice(-1, 'month', 1)).toBe(0);
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
