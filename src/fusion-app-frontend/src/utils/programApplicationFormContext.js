/**
 * Build copy for the one-page program application form from `programPage` locale JSON.
 * @see programPage.applicationForm in Studio (Programs → Manage).
 */

/** @typedef {{ title: string, displayPrice: string, subtext: string, subtext2: string, includedBullets: string[] }} ApplicationPaymentOptionSlice */

const PLAN_KEYS = /** @type {const} */ (['one_time', 'monthly', 'quarterly', 'annual', 'bimonthly']);

/**
 * @param {unknown} raw
 * @returns {ApplicationPaymentOptionSlice}
 */
function parseOnePaymentOption(raw) {
    const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? /** @type {Record<string, unknown>} */ (raw) : {};
    const bullets = o.includedBullets;
    return {
        title: String(o.title ?? '').trim(),
        displayPrice: String(o.displayPrice ?? '').trim(),
        subtext: String(o.subtext ?? '').trim(),
        subtext2: String(o.subtext2 ?? '').trim(),
        includedBullets: Array.isArray(bullets)
            ? bullets.map((x) => String(x ?? '').trim()).filter(Boolean)
            : [],
    };
}

/**
 * @returns {Record<'one_time' | 'monthly' | 'quarterly' | 'annual' | 'bimonthly', ApplicationPaymentOptionSlice>}
 */
export function emptyApplicationPaymentOptions() {
    return {
        one_time: parseOnePaymentOption(null),
        monthly: parseOnePaymentOption(null),
        quarterly: parseOnePaymentOption(null),
        annual: parseOnePaymentOption(null),
        bimonthly: parseOnePaymentOption(null),
    };
}

/**
 * @param {unknown} keyDates
 * @returns {string}
 */
export function findApplicationDeadlineDateFromKeyDates(keyDates) {
    if (!Array.isArray(keyDates)) return '';
    for (const row of keyDates) {
        if (!row || typeof row !== 'object') continue;
        if (String(/** @type {Record<string, unknown>} */ (row).sectionTitle ?? '').trim()) continue;
        const desc = String(/** @type {Record<string, unknown>} */ (row).description ?? '').trim();
        if (/application\s+deadline/i.test(desc)) {
            return String(/** @type {Record<string, unknown>} */ (row).date ?? '').trim();
        }
    }
    return '';
}

/**
 * @param {Record<string, unknown> | null | undefined} programPage
 * @param {{ programYear?: string, availableSlots?: number | null, totalSlots?: number | null }} [opts]
 * @returns {{
 *   applicationFeeLine: string,
 *   depositAmountDisplay: string,
 *   applicationDeadlineDisplay: string,
 *   whatsIncludedBody: string,
 *   feeNoticeItalic: string,
 *   selectionProcessOverride: string,
 *   detailsSectionId: string,
 *   applicationFeeAmountCents: number | null,
 *   applicationPaymentOptions: Record<'one_time' | 'monthly' | 'quarterly' | 'annual' | 'bimonthly', ApplicationPaymentOptionSlice>,
 *   availableSlots: number | null,
 *   totalSlots: number | null,
 * }}
 */
function parseApplicationFeeAmountCents(raw) {
    if (raw == null) return null;
    const n = typeof raw === 'number' ? raw : parseInt(String(raw).trim(), 10);
    if (!Number.isFinite(n) || n < 50) return null;
    return Math.round(n);
}

export function buildProgramApplicationFormContext(programPage, opts = {}) {
    const pp = programPage && typeof programPage === 'object' ? programPage : {};
    const af =
        pp.applicationForm && typeof pp.applicationForm === 'object'
            ? /** @type {Record<string, unknown>} */ (pp.applicationForm)
            : {};
    const details =
        pp.programDetails && typeof pp.programDetails === 'object'
            ? /** @type {Record<string, unknown>} */ (pp.programDetails)
            : {};
    const costs = details.costs && typeof details.costs === 'object' ? /** @type {Record<string, unknown>} */ (details.costs) : {};
    const keyDates = Array.isArray(details.keyDates) ? details.keyDates : [];
    const addl =
        pp.additionalInfo && typeof pp.additionalInfo === 'object'
            ? /** @type {Record<string, unknown>} */ (pp.additionalInfo)
            : {};

    const year = String(opts.programYear ?? '').trim();

    let deadline = String(af.applicationDeadlineDisplay ?? '').trim();
    if (!deadline) {
        deadline = findApplicationDeadlineDateFromKeyDates(keyDates);
        if (deadline && year && !deadline.includes(year)) {
            deadline = `${deadline}, ${year}`;
        }
    }

    const deposit = String(af.depositAmountDisplay ?? '').trim();
    const applicationFeeAmountCents = parseApplicationFeeAmountCents(af.applicationFeeAmountCents);

    const apoRoot = pp.applicationPaymentOptions && typeof pp.applicationPaymentOptions === 'object' ? pp.applicationPaymentOptions : {};
    /** @type {Record<'one_time' | 'monthly' | 'quarterly' | 'annual' | 'bimonthly', ApplicationPaymentOptionSlice>} */
    const applicationPaymentOptions = emptyApplicationPaymentOptions();
    for (const k of PLAN_KEYS) {
        applicationPaymentOptions[k] = parseOnePaymentOption(/** @type {Record<string, unknown>} */ (apoRoot)[k]);
    }

    const as =
        typeof opts?.availableSlots === 'number' && Number.isFinite(opts.availableSlots) ? opts.availableSlots : null;
    const ts =
        typeof opts?.totalSlots === 'number' && Number.isFinite(opts.totalSlots) ? opts.totalSlots : null;

    return {
        applicationFeeLine: String(costs.applicationFee ?? '').trim(),
        depositAmountDisplay: deposit,
        applicationDeadlineDisplay: deadline,
        whatsIncludedBody: String(addl.applicationFee ?? '').trim(),
        feeNoticeItalic: String(af.feeNoticeItalic ?? '').trim(),
        selectionProcessOverride: String(af.selectionProcessOverride ?? '').trim(),
        detailsSectionId: 'programDetailsSection',
        applicationFeeAmountCents,
        applicationPaymentOptions,
        availableSlots: as,
        totalSlots: ts,
    };
}
