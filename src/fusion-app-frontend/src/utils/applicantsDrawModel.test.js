import { describe, it, expect } from 'vitest';
import {
    DRAW_ENTRY_FEE_CENTS,
    DRAW_SLOT_GOAL_DEFAULT,
    buildApplicantDrawDetailModel,
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
