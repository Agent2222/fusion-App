import { describe, it, expect } from 'vitest';
import {
    DRAW_ENTRY_FEE_CENTS,
    DRAW_SLOT_GOAL_DEFAULT,
    buildApplicantDrawDetailModel,
} from './applicantsDrawModel.js';

describe('buildApplicantDrawDetailModel', () => {
    it('defaults to 100-slot goal and $50 entry revenue', () => {
        const m = buildApplicantDrawDetailModel({
            programId: 'p1',
            programTitle: 'Kaga',
            claimedSlots: 50,
            drawActive: true,
        });
        expect(m.totalSlots).toBe(DRAW_SLOT_GOAL_DEFAULT);
        expect(m.claimedSlots).toBe(50);
        expect(m.availableSlots).toBe(50);
        expect(m.progressPct).toBe(50);
        expect(m.revenueCents).toBe(50 * DRAW_ENTRY_FEE_CENTS);
        expect(m.drawActive).toBe(true);
    });

    it('clamps claimed to total and computes 100% progress', () => {
        const m = buildApplicantDrawDetailModel({
            programId: 'p1',
            claimedSlots: 200,
            totalSlots: 100,
        });
        expect(m.claimedSlots).toBe(100);
        expect(m.availableSlots).toBe(0);
        expect(m.progressPct).toBe(100);
    });
});
