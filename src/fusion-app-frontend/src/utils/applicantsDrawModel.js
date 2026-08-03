/** Stub Program Draw metrics until canister fields ship. */

export const APPLICANTS_DRAW_ACTIVE_STORAGE_KEY = 'studio-applicants-draw-active-v1';

export const DRAW_SLOT_GOAL_DEFAULT = 100;
/** Stub entry fee per claimed draw slot ($50). */
export const DRAW_ENTRY_FEE_CENTS = 5000;

/**
 * @returns {Record<string, boolean>}
 */
export function loadDrawActiveByProgramId() {
    try {
        const raw = sessionStorage.getItem(APPLICANTS_DRAW_ACTIVE_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return {};
        /** @type {Record<string, boolean>} */
        const out = {};
        for (const [k, v] of Object.entries(parsed)) {
            if (k) out[k] = Boolean(v);
        }
        return out;
    } catch {
        return {};
    }
}

/**
 * @param {Record<string, boolean>} map
 */
export function saveDrawActiveByProgramId(map) {
    try {
        sessionStorage.setItem(APPLICANTS_DRAW_ACTIVE_STORAGE_KEY, JSON.stringify(map || {}));
    } catch {
        /* ignore */
    }
}

/**
 * @param {{
 *   programId: string,
 *   programTitle: string,
 *   claimedSlots?: number,
 *   totalSlots?: number,
 *   entryFeeCents?: number,
 *   drawActive?: boolean,
 * }} args
 */
export function buildApplicantDrawDetailModel(args) {
    const programId = String(args?.programId || '').trim();
    const programTitle = String(args?.programTitle || '').trim() || programId || 'Program';
    const totalSlots = Math.max(
        1,
        Number.isFinite(Number(args?.totalSlots))
            ? Math.floor(Number(args.totalSlots))
            : DRAW_SLOT_GOAL_DEFAULT,
    );
    const claimedRaw = Number(args?.claimedSlots);
    const claimedSlots = Math.max(
        0,
        Math.min(totalSlots, Number.isFinite(claimedRaw) ? Math.floor(claimedRaw) : 0),
    );
    const availableSlots = Math.max(0, totalSlots - claimedSlots);
    const entryFeeCents =
        Number.isFinite(Number(args?.entryFeeCents)) && Number(args.entryFeeCents) >= 0
            ? Math.floor(Number(args.entryFeeCents))
            : DRAW_ENTRY_FEE_CENTS;
    const revenueCents = claimedSlots * entryFeeCents;
    const progressPct = Math.min(100, Math.round((claimedSlots / totalSlots) * 100));
    return {
        programId,
        programTitle,
        drawActive: Boolean(args?.drawActive),
        availableSlots,
        totalSlots,
        claimedSlots,
        entryFeeCents,
        revenueCents,
        progressPct,
    };
}
