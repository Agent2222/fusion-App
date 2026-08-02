/**
 * Merge program applicationPaymentOptions with join-network-flow plan cards.
 * Empty program fields inherit from Join Network when useGlobal is true.
 */

/** @typedef {{ title: string, displayPrice: string, subtext: string, subtext2: string, includedBullets: string[] }} PaymentOptionSlice */

/**
 * @param {unknown} raw
 * @returns {PaymentOptionSlice}
 */
export function emptyPaymentOptionSlice(raw = null) {
    const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? /** @type {Record<string, unknown>} */ (raw) : {};
    const bullets = o.includedBullets ?? o.includes;
    return {
        title: String(o.title ?? '').trim(),
        displayPrice: String(o.displayPrice ?? '').trim(),
        subtext: String(o.subtext ?? '').trim(),
        subtext2: String(o.subtext2 ?? o.every ?? '').trim(),
        includedBullets: Array.isArray(bullets)
            ? bullets.map((x) => String(x ?? '').trim()).filter(Boolean)
            : [],
    };
}

/**
 * Map join-network value.planMonthly|Quarterly|Annual → payment option slice.
 * @param {unknown} planCard
 * @returns {PaymentOptionSlice}
 */
export function joinPlanCardToPaymentOption(planCard) {
    const o =
        planCard && typeof planCard === 'object' && !Array.isArray(planCard)
            ? /** @type {Record<string, unknown>} */ (planCard)
            : {};
    const bullets = o.includedBullets ?? o.includes;
    return {
        title: String(o.title ?? '').trim(),
        displayPrice: String(o.displayPrice ?? '').trim(),
        subtext: String(o.subtext ?? '').trim(),
        subtext2: String(o.subtext2 ?? o.every ?? '').trim(),
        includedBullets: Array.isArray(bullets)
            ? bullets.map((x) => String(x ?? '').trim()).filter(Boolean)
            : [],
    };
}

/**
 * @param {PaymentOptionSlice} base
 * @param {PaymentOptionSlice} fill
 * @returns {PaymentOptionSlice}
 */
function fillEmptyFields(base, fill) {
    return {
        title: base.title || fill.title,
        displayPrice: base.displayPrice || fill.displayPrice,
        subtext: base.subtext || fill.subtext,
        subtext2: base.subtext2 || fill.subtext2,
        includedBullets:
            base.includedBullets.length > 0 ? base.includedBullets : [...fill.includedBullets],
    };
}

/** Application-form monthly add-on defaults (PayPal MONTHLY_APPLICATION plan). */
export const MONTHLY_APPLICATION_DEFAULTS_EN = Object.freeze({
    title: 'Monthly + application',
    displayPrice: '$30',
    subtext: 'Application fee included on first charge',
    subtext2: 'Then $30 every month',
    includedBullets: ['This application included', 'Ongoing platform membership'],
});

export const MONTHLY_APPLICATION_DEFAULTS_JA = Object.freeze({
    title: '月額＋応募',
    displayPrice: '$30',
    subtext: '初回請求に応募料込み',
    subtext2: 'その後は月額 $30',
    includedBullets: ['この応募を含む', '継続的なプラットフォーム会員'],
});

/**
 * Extract plan cards from join-network-flow bundle for a locale.
 * @param {unknown} joinFlowBundle
 * @param {'en'|'ja'} locale
 * @param {string} [flowKey='membership']
 * @returns {{ monthly: PaymentOptionSlice, quarterly: PaymentOptionSlice, annual: PaymentOptionSlice }}
 */
export function joinNetworkPlansFromBundle(joinFlowBundle, locale = 'en', flowKey = 'membership') {
    const root =
        joinFlowBundle && typeof joinFlowBundle === 'object'
            ? /** @type {Record<string, unknown>} */ (joinFlowBundle)
            : {};
    const flow =
        root[flowKey] && typeof root[flowKey] === 'object'
            ? /** @type {Record<string, unknown>} */ (root[flowKey])
            : root.membership && typeof root.membership === 'object'
              ? /** @type {Record<string, unknown>} */ (root.membership)
              : {};
    const value =
        flow.value && typeof flow.value === 'object'
            ? /** @type {Record<string, unknown>} */ (flow.value)
            : {};
    const loc =
        value[locale] && typeof value[locale] === 'object'
            ? /** @type {Record<string, unknown>} */ (value[locale])
            : value.en && typeof value.en === 'object'
              ? /** @type {Record<string, unknown>} */ (value.en)
              : {};
    const monthlyRaw = loc.planMonthly || loc.planBimonthly || null;
    return {
        monthly: joinPlanCardToPaymentOption(monthlyRaw),
        quarterly: joinPlanCardToPaymentOption(loc.planQuarterly),
        annual: joinPlanCardToPaymentOption(loc.planAnnual),
    };
}

/**
 * @param {{
 *   programOptions: Record<string, PaymentOptionSlice | undefined>,
 *   joinPlans?: { monthly?: PaymentOptionSlice, quarterly?: PaymentOptionSlice, annual?: PaymentOptionSlice } | null,
 *   useGlobal?: boolean,
 *   locale?: 'en'|'ja',
 * }} args
 * @returns {Record<'one_time'|'monthly'|'quarterly'|'annual', PaymentOptionSlice>}
 */
export function resolveApplicationPaymentOptions(args) {
    const useGlobal = args.useGlobal !== false;
    const locale = args.locale === 'ja' ? 'ja' : 'en';
    const prog = args.programOptions || {};
    const join = args.joinPlans || {};
    const monthlyAppDefaults =
        locale === 'ja' ? MONTHLY_APPLICATION_DEFAULTS_JA : MONTHLY_APPLICATION_DEFAULTS_EN;

    const one_time = emptyPaymentOptionSlice(prog.one_time);

    const progMonthly = emptyPaymentOptionSlice(prog.monthly || prog.bimonthly);
    let monthly = { ...progMonthly };
    let quarterly = emptyPaymentOptionSlice(prog.quarterly);
    let annual = emptyPaymentOptionSlice(prog.annual);

    if (useGlobal) {
        const joinMonthly = emptyPaymentOptionSlice(join.monthly);
        // Monthly on apply is the add-on plan: inherit price/bullets from Join, not membership-only title/subtext.
        if (!monthly.displayPrice) monthly.displayPrice = joinMonthly.displayPrice;
        if (!monthly.includedBullets.length) {
            monthly.includedBullets = [...joinMonthly.includedBullets];
        }
        quarterly = fillEmptyFields(quarterly, emptyPaymentOptionSlice(join.quarterly));
        annual = fillEmptyFields(annual, emptyPaymentOptionSlice(join.annual));
    }

    // Application monthly add-on copy for any fields still empty.
    monthly = fillEmptyFields(monthly, emptyPaymentOptionSlice(monthlyAppDefaults));

    return { one_time, monthly, quarterly, annual };
}

/**
 * @param {unknown} af
 * @returns {boolean}
 */
export function readUseGlobalPaymentOptionDetails(af) {
    if (!af || typeof af !== 'object') return true;
    const v = /** @type {Record<string, unknown>} */ (af).useGlobalPaymentOptionDetails;
    if (v === false || v === 'false' || v === 0) return false;
    return true;
}
