import { describe, it, expect } from 'vitest';
import {
    studioEffectiveMembershipStatus,
    studioMembershipCellLabel,
    studioMembershipDotClass,
    studioMembershipFilterMatch,
    studioMembershipStatusIsPaid,
    studioMembershipStatusLabel,
} from './studioMembershipPresentation.js';

describe('studio membership PayPal parity', () => {
    it('treats APPROVED and ACTIVE as paid', () => {
        expect(studioMembershipStatusIsPaid('ACTIVE')).toBe(true);
        expect(studioMembershipStatusIsPaid('APPROVED')).toBe(true);
        expect(studioMembershipStatusIsPaid('approved')).toBe(true);
        expect(studioMembershipStatusIsPaid('canceled')).toBe(false);
        expect(studioMembershipStatusLabel('APPROVED')).toBe('Active');
    });

    it('prefers PayPal status when paypal id present', () => {
        expect(
            studioEffectiveMembershipStatus({
                paypalSubscriptionId: 'I-ABC',
                paypalSubscriptionStatus: 'ACTIVE',
                stripeSubscriptionStatus: '',
                paymentProvider: 'paypal',
            }),
        ).toBe('ACTIVE');
    });

    it('shows status · tier for quarterly/annual/monthly', () => {
        expect(
            studioMembershipCellLabel({
                paypalSubscriptionId: 'I-1',
                paypalSubscriptionStatus: 'ACTIVE',
                paymentProvider: 'paypal',
                membershipTier: 'quarterly',
            }),
        ).toBe('Active · Quarterly');
        expect(
            studioMembershipCellLabel({
                paypalSubscriptionStatus: 'ACTIVE',
                membershipTier: 'annual',
            }),
        ).toBe('Active · Annual');
        expect(
            studioMembershipCellLabel({
                paypalSubscriptionStatus: 'APPROVED',
                membershipTier: 'monthly',
            }),
        ).toBe('Active · Monthly');
    });

    it('green-dot and active filter include approved', () => {
        const row = {
            paypalSubscriptionId: 'I-1',
            paypalSubscriptionStatus: 'APPROVED',
            paymentProvider: 'paypal',
            membershipTier: 'monthly',
        };
        expect(studioMembershipDotClass(row)).toBe('studio-user-sub-dot--ok');
        expect(studioMembershipFilterMatch(row, 'active')).toBe(true);
        expect(studioMembershipFilterMatch(row, 'none')).toBe(false);
    });

    it('empty PayPal+Stripe still No subscription', () => {
        expect(studioMembershipCellLabel({})).toBe('No subscription');
        expect(studioMembershipFilterMatch({}, 'none')).toBe(true);
    });
});
