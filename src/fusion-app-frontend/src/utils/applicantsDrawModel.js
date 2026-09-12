/** Studio Applicants → Program Award metrics (slots + paid revenue). */

export const APPLICANTS_DRAW_ACTIVE_STORAGE_KEY = 'studio-applicants-draw-active-v1';

export const DRAW_SLOT_GOAL_DEFAULT = 100;
/** One-time Program Draw entry fee ($50). */
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
 *   paidEntryCount?: number,
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
    const paidRaw = Number(args?.paidEntryCount);
    const paidEntryCount = Math.max(
        0,
        Number.isFinite(paidRaw) ? Math.floor(paidRaw) : 0,
    );
    // Revenue is paid $50 entries only — award-credit occupies a slot but is not revenue.
    const revenueCents = paidEntryCount * entryFeeCents;
    const progressPct = Math.min(100, Math.round((claimedSlots / totalSlots) * 100));
    return {
        programId,
        programTitle,
        drawActive: Boolean(args?.drawActive),
        availableSlots,
        totalSlots,
        claimedSlots,
        paidEntryCount,
        entryFeeCents,
        revenueCents,
        progressPct,
    };
}

/**
 * True when claimed entries meet or exceed Total award slots.
 * Empty / invalid slots use the 100-slot default.
 * @param {unknown} enteredCount
 * @param {unknown} totalSlots
 * @returns {boolean}
 */
export function isProgramDrawGoalReached(enteredCount, totalSlots) {
    const slotsRaw = Number(totalSlots);
    const slots =
        Number.isFinite(slotsRaw) && slotsRaw > 0 ? Math.floor(slotsRaw) : DRAW_SLOT_GOAL_DEFAULT;
    const enteredRaw = Number(enteredCount);
    const entered = Number.isFinite(enteredRaw) && enteredRaw > 0 ? Math.floor(enteredRaw) : 0;
    return entered >= slots;
}

/**
 * Staff “End program” flag stored on `localesJson.draw.closed`.
 * Accepts a JSON string, a parsed locales object, or a program row with `localesJson`.
 * @param {unknown} localesJsonOrRow
 * @returns {boolean}
 */
export function parseProgramDrawClosed(localesJsonOrRow) {
    /** @type {object[]} */
    const draws = [];
    /**
     * @param {unknown} draw
     */
    const consider = (draw) => {
        if (draw && typeof draw === 'object' && !Array.isArray(draw)) draws.push(draw);
    };
    /**
     * @param {unknown} parsed
     */
    const fromParsed = (parsed) => {
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            consider(/** @type {Record<string, unknown>} */ (parsed).draw);
        }
    };

    if (localesJsonOrRow && typeof localesJsonOrRow === 'object' && !Array.isArray(localesJsonOrRow)) {
        const rec = /** @type {Record<string, unknown>} */ (localesJsonOrRow);
        consider(rec.draw);
        if (typeof rec.localesJson === 'string') {
            try {
                fromParsed(JSON.parse(rec.localesJson));
            } catch {
                /* ignore */
            }
        } else {
            fromParsed(rec.localesJson);
        }
    } else if (typeof localesJsonOrRow === 'string') {
        try {
            fromParsed(JSON.parse(localesJsonOrRow));
        } catch {
            /* ignore */
        }
    }
    return draws.some((d) => Boolean(/** @type {Record<string, unknown>} */ (d).closed));
}

/**
 * `data-draw-closed="false"` from the EN card must not hide a closed flag on the program row.
 * @param {unknown} attr
 * @param {unknown} [programRow]
 */
export function resolveDrawClosedFlag(attr, programRow) {
    return String(attr || '') === 'true' || parseProgramDrawClosed(programRow);
}

/**
 * Public live-draw surface. Closed wins even when Program Award is still active.
 * @param {{ closed?: boolean, active?: boolean } | null | undefined} opts
 * @returns {'closed' | 'inactive' | 'open'}
 */
export function resolveProgramDrawLiveState(opts) {
    if (opts?.closed) return 'closed';
    if (opts?.active === false) return 'inactive';
    return 'open';
}

/**
 * Progress/recipient enrichment packs default `drawClosed: false`.
 * Never let that default downgrade a closed flag already parsed from the program row.
 * @param {boolean} current
 * @param {boolean} incoming
 */
export function keepProgramDrawClosed(current, incoming) {
    return Boolean(current) || Boolean(incoming);
}
