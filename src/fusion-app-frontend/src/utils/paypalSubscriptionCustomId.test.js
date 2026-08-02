import { describe, it, expect } from 'vitest';
import { buildPayPalSubscriptionCustomId } from './paymentCheckout.js';

describe('buildPayPalSubscriptionCustomId', () => {
    it('keeps principal, pending id, and tier under 127 chars', () => {
        const id = buildPayPalSubscriptionCustomId({
            fusion_pending_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
            tier: 'quarterly',
        });
        expect(id.length).toBeLessThanOrEqual(127);
        const parsed = JSON.parse(id);
        expect(parsed.fusion_pending_id).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
        expect(parsed.tier).toBe('quarterly');
        expect(parsed.pending_email).toBeUndefined();
    });

    it('supports monthly and annual tiers', () => {
        expect(JSON.parse(buildPayPalSubscriptionCustomId({ tier: 'monthly' })).tier).toBe(
            'monthly',
        );
        expect(JSON.parse(buildPayPalSubscriptionCustomId({ tier: 'annual' })).tier).toBe(
            'annual',
        );
    });

    it('ignores oversized name fields (not included)', () => {
        const id = buildPayPalSubscriptionCustomId({
            fusion_pending_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
            tier: 'annual',
            first_name: 'VeryLongNameThatWouldBreakPayPalCustomIdLimit',
            last_name: 'AnotherVeryLongSurname',
            full_name: 'Would Truncate JSON',
            category: 'artist',
        });
        const parsed = JSON.parse(id);
        expect(parsed.first_name).toBeUndefined();
        expect(parsed.tier).toBe('annual');
        expect(id.length).toBeLessThanOrEqual(127);
    });
});
