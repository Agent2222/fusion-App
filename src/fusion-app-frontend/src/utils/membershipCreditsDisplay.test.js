import { describe, expect, it } from 'vitest';
import { buildMembershipCreditsStripModel } from './membershipCreditsDisplay.js';

describe('buildMembershipCreditsStripModel', () => {
    it('shows numeric app + award balances for quarterly', () => {
        const m = buildMembershipCreditsStripModel({
            tier: 'quarterly',
            appCreditBalance: 2,
            awardEntryBalance: 1,
            now: new Date(Date.UTC(2026, 3, 15)),
        });
        expect(m?.visible).toBe(true);
        expect(m?.applicationCreditsLabel).toBe('2');
        expect(m?.awardEntriesLabel).toBe('1');
        expect(m?.nextCreditsHint).toMatch(/renews each quarter/i);
    });

    it('shows numeric annual balances (not Included)', () => {
        const m = buildMembershipCreditsStripModel({
            tier: 'annual',
            appCreditBalance: 4,
            awardEntryBalance: 4,
        });
        expect(m?.applicationCreditsLabel).toBe('4');
        expect(m?.awardEntriesLabel).toBe('4');
        expect(m?.nextCreditsHint).toMatch(/renews each year/i);
    });

    it('can show monthly strip with zeros', () => {
        const m = buildMembershipCreditsStripModel({
            tier: 'monthly',
            appCreditBalance: 0,
            awardEntryBalance: 0,
            showForMonthly: true,
        });
        expect(m?.visible).toBe(true);
        expect(m?.applicationCreditsLabel).toBe('0');
    });

    it('shows exempt strip with app credit floor and purchase-friendly award hint', () => {
        const m = buildMembershipCreditsStripModel({
            tier: '',
            access: 'exempt',
            appCreditBalance: 0,
            awardEntryBalance: 0,
        });
        expect(m?.visible).toBe(true);
        expect(m?.applicationCreditsLabel).toBe('1');
        expect(m?.awardEntriesLabel).toBe('0');
        expect(m?.nextCreditsLabel).toBe('Included');
        expect(m?.nextCreditsHint).toMatch(/purchase available/i);
        expect(m?.nextCreditsHint).toMatch(/no included Program Award/i);
    });

    it('preserves purchased award balance for exempt', () => {
        const m = buildMembershipCreditsStripModel({
            access: 'exempt',
            appCreditBalance: 1,
            awardEntryBalance: 2,
        });
        expect(m?.awardEntriesLabel).toBe('2');
        expect(m?.applicationCreditsLabel).toBe('1');
    });
});
