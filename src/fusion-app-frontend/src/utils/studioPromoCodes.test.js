import { describe, expect, it, vi } from 'vitest';
import {
    campaignSendBlockedReason,
    clampPromoDurationMonths,
    interpolateRadarDiscountHtml,
    isRadarPromoCode,
    joinUrlForPromoCode,
    remainingPromoQuantity,
    promoDurationLabel,
    normalizeStudioPromoCode,
    resolveRadarOutreachInviteCode,
} from './studioPromoCodes.js';

describe('studioPromoCodes', () => {
    it('clamps duration to 1, 2, or 3 months', () => {
        expect(clampPromoDurationMonths(0)).toBe(1);
        expect(clampPromoDurationMonths(1)).toBe(1);
        expect(clampPromoDurationMonths(2)).toBe(2);
        expect(clampPromoDurationMonths(9)).toBe(3);
    });

    it('labels the three 50% checkout offers', () => {
        expect(promoDurationLabel(1)).toBe('50% off first month');
        expect(promoDurationLabel(2)).toBe('50% off first 2 months');
        expect(promoDurationLabel(3)).toBe('50% off first 3 months');
    });

    it('builds a join-network checkout URL with the code', () => {
        const url = joinUrlForPromoCode('radar-kaga26');
        expect(url).toMatch(/\/join-network\?ref=RADAR-KAGA26$/);
        expect(joinUrlForPromoCode('{{DISCOUNT_CODE}}')).toMatch(/\/join-network$/);
    });

    it('interpolates discount placeholders', () => {
        const html = interpolateRadarDiscountHtml(
            '<p>{{DISCOUNT_CODE}}</p><p>{{DISCOUNT_LABEL}}</p><a href="{{JOIN_URL}}">Join</a>',
            { code: 'RADAR-A7K2', durationMonths: 2, joinUrl: 'https://fusionart.world/join-network?ref=RADAR-A7K2' },
        );
        expect(html).toContain('RADAR-A7K2');
        expect(html).toContain('50% off first 2 months');
        expect(html).toContain('join-network?ref=RADAR-A7K2');
        expect(html).not.toContain('{{DISCOUNT_CODE}}');
        expect(html).not.toContain('{{JOIN_URL}}');
    });

    it('keeps code and join URL placeholders until a real code is supplied', () => {
        const html = interpolateRadarDiscountHtml(
            '<p>{{DISCOUNT_CODE}}</p><a href="{{JOIN_URL}}">Join</a>',
            { durationMonths: 1 },
        );
        expect(html).toContain('{{DISCOUNT_CODE}}');
        expect(html).toContain('{{JOIN_URL}}');
    });

    it('computes remaining quantity and blocks over-capacity batch sends', () => {
        const pc = normalizeStudioPromoCode({
            code: 'RADAR-KAGA26',
            campaignTag: 'radar-batch',
            maxRedemptions: 40,
            currentRedemptions: 3,
            active: true,
            discountDurationMonths: 2,
        });
        expect(remainingPromoQuantity(pc)).toBe(37);
        expect(isRadarPromoCode(pc)).toBe(true);
        expect(campaignSendBlockedReason(pc, 10)).toBe('');
        expect(campaignSendBlockedReason(pc, 40)).toMatch(/remaining/);
        expect(campaignSendBlockedReason(null, 2)).toMatch(/campaign promo code/);
        expect(remainingPromoQuantity({ maxRedemptions: null, currentRedemptions: 0 })).toBe(
            Number.POSITIVE_INFINITY,
        );
    });

    it('reuses an existing invite code when codeMode is reuse', async () => {
        const create = vi.fn();
        const resolved = await resolveRadarOutreachInviteCode(
            { existingCode: 'RADAR-ABCD', codeMode: 'reuse', durationMonths: 2 },
            { create },
        );
        expect(resolved).toEqual({ code: 'RADAR-ABCD', minted: false });
        expect(create).not.toHaveBeenCalled();
    });

    it('mints a single-use RADAR code when reuse is not available', async () => {
        const create = vi.fn(async (opts) => ({
            code: opts.code,
            maxRedemptions: opts.maxRedemptions,
            campaignTag: opts.campaignTag,
            discountDurationMonths: opts.durationMonths,
        }));
        const resolved = await resolveRadarOutreachInviteCode(
            { existingCode: '', codeMode: 'mint', durationMonths: 3 },
            { create },
        );
        expect(resolved.minted).toBe(true);
        expect(resolved.code).toMatch(/^RADAR-[A-Z2-9]{4}$/);
        expect(create).toHaveBeenCalledTimes(1);
        expect(create.mock.calls[0][0]).toMatchObject({
            maxRedemptions: 1,
            campaignTag: 'radar-individual',
            durationMonths: 3,
        });
    });
});
