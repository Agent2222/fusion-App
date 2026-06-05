/**
 * Human labels + stage metadata for Studio join-network-flow editor.
 */

/** @typedef {'membership' | 'access' | 'apply'} JnfFlowId */
/** @typedef {'band' | 'entry' | 'value' | 'payment' | 'linkAccount' | 'linkAccountExempt' | 'confirmation'} JnfStageId */

/** @type {{ id: JnfFlowId, label: string, hint: string, pages: string }[]} */
export const JNF_FLOWS = [
    {
        id: 'membership',
        label: 'Membership',
        hint: 'Join / membership flow',
        pages: 'Home, Journal, Community, Context',
    },
    {
        id: 'access',
        label: 'Access',
        hint: 'Gallery & collection access',
        pages: 'Artists, Gallery Access, Editions, Profile',
    },
    {
        id: 'apply',
        label: 'Apply',
        hint: 'Application funnels',
        pages: 'Programs (when enabled)',
    },
];

/** @type {{ id: JnfStageId, label: string, shortLabel: string, surface: 'page' | 'modal', step?: string, fork?: boolean, callout: (pages: string) => string }[]} */
export const JNF_STAGES = [
    {
        id: 'band',
        label: 'Page band',
        shortLabel: 'Band',
        surface: 'page',
        step: '1',
        callout: (pages) =>
            `Teaser block on ${pages}. Visitors click the band button to open the modal.`,
    },
    {
        id: 'entry',
        label: 'Step 1 — Identity',
        shortLabel: 'Entry',
        surface: 'modal',
        step: '2',
        callout: () => 'First modal screen: name, email, role, optional access code.',
    },
    {
        id: 'value',
        label: 'Step 2 — Plans',
        shortLabel: 'Plans',
        surface: 'modal',
        step: '3',
        callout: () => 'Plan picker, pricing cards, and what’s included accordion.',
    },
    {
        id: 'payment',
        label: 'Step 3 — Payment',
        shortLabel: 'Payment',
        surface: 'modal',
        step: '4',
        callout: () => 'Stripe payment summary and card form labels.',
    },
    {
        id: 'linkAccount',
        label: 'Link account',
        shortLabel: 'Link',
        surface: 'modal',
        step: '5a',
        fork: true,
        callout: () => 'After successful payment — Internet Identity linking.',
    },
    {
        id: 'linkAccountExempt',
        label: 'Link (access code)',
        shortLabel: 'Code path',
        surface: 'modal',
        step: '5b',
        fork: true,
        callout: () => 'Access-code path — skips payment; II sign-in to complete.',
    },
    {
        id: 'confirmation',
        label: 'Confirmation',
        shortLabel: 'Done',
        surface: 'modal',
        step: '6',
        callout: () => 'Success screen with welcome copy and navigation links.',
    },
];

/**
 * @typedef {{ key: string, label: string, help?: string, multiline?: boolean }} JnfFieldDef
 */

/** @type {Record<JnfStageId, { cards: { title: string, help?: string, fields?: JnfFieldDef[], legacy?: boolean }[] }>} */
export const JNF_STAGE_LAYOUT = {
    band: {
        cards: [
            {
                title: 'Page teaser',
                help: 'Shown outside the modal on pages listed for this flow.',
                fields: [
                    { key: 'title', label: 'Band headline' },
                    { key: 'description', label: 'Band description', multiline: true },
                    { key: 'openLabel', label: 'Open button label' },
                ],
            },
        ],
    },
    entry: {
        cards: [
            {
                title: 'Headlines',
                fields: [
                    { key: 'dialogTitle', label: 'Modal headline' },
                    { key: 'subtitle', label: 'Subtitle', multiline: true },
                ],
            },
            {
                title: 'Form labels',
                fields: [
                    { key: 'firstNamePlaceholder', label: 'First name placeholder' },
                    { key: 'lastNamePlaceholder', label: 'Last name placeholder' },
                    { key: 'emailPlaceholder', label: 'Email placeholder' },
                    { key: 'accessCodeLabel', label: 'Access code label' },
                    { key: 'accessCodePlaceholder', label: 'Access code placeholder' },
                    { key: 'roleLabel', label: 'Role group label' },
                ],
            },
            {
                title: 'Actions & legal',
                fields: [
                    { key: 'continueLabel', label: 'Continue button' },
                    { key: 'renewHint', label: 'Renew hint' },
                    { key: 'footerDisclaimer', label: 'Footer disclaimer', multiline: true },
                ],
            },
        ],
    },
    value: {
        cards: [
            {
                title: 'Step copy',
                fields: [
                    { key: 'title', label: 'Step title' },
                    { key: 'lead', label: 'Lead paragraph', multiline: true },
                    { key: 'planGroupLabel', label: 'Plan group label' },
                    { key: 'includesTitle', label: 'Includes section title' },
                    { key: 'continueLabel', label: 'Continue button' },
                    { key: 'backLabel', label: 'Back button' },
                ],
            },
        ],
    },
    payment: {
        cards: [
            {
                title: 'Payment screen copy',
                fields: [
                    { key: 'title', label: 'Step title' },
                    { key: 'subtitle', label: 'Subtitle', multiline: true },
                    { key: 'orderLabel', label: 'Order label' },
                    { key: 'finalPaymentPrice', label: 'Price display' },
                    { key: 'finalPaymentStatement', label: 'Price statement' },
                    { key: 'line3Months', label: 'Access line' },
                    { key: 'lineRenew', label: 'Renew line' },
                    { key: 'amount', label: 'Amount (Stripe)' },
                    { key: 'planKey', label: 'Default plan key', help: 'Use bi_monthly or annual' },
                    { key: 'totalLabel', label: 'Total label' },
                    { key: 'cardNumberLabel', label: 'Card number label' },
                    { key: 'expiryLabel', label: 'Expiry label' },
                    { key: 'cvcLabel', label: 'CVC label' },
                    { key: 'rememberCard', label: 'Remember card label' },
                    { key: 'expressOr', label: 'Express checkout “or”' },
                    { key: 'completeLabel', label: 'Complete button' },
                    { key: 'processingLabel', label: 'Processing label' },
                    { key: 'footerNote', label: 'Footer note 1' },
                    { key: 'footerNote2', label: 'Footer note 2' },
                    { key: 'devCompleteLabel', label: 'Demo complete label' },
                    { key: 'backLabel', label: 'Back button' },
                ],
            },
        ],
    },
    linkAccount: {
        cards: [
            {
                title: 'After payment — Internet Identity',
                fields: [
                    { key: 'paymentSuccessLine', label: 'Payment success line' },
                    { key: 'iiExplainer', label: 'II explainer', multiline: true },
                    { key: 'linkKicker', label: 'Kicker line' },
                    { key: 'title', label: 'Headline' },
                    { key: 'lead', label: 'Lead', multiline: true },
                    { key: 'help', label: 'Help text', multiline: true },
                    { key: 'signInLabel', label: 'Sign-in button' },
                ],
            },
        ],
    },
    linkAccountExempt: {
        cards: [
            {
                title: 'Access-code path — Internet Identity',
                help: 'Shown when user completes registration with an access code (no payment).',
                fields: [
                    { key: 'paymentSuccessLine', label: 'Payment success line' },
                    { key: 'iiExplainer', label: 'II explainer', multiline: true },
                    { key: 'linkKicker', label: 'Kicker line' },
                    { key: 'title', label: 'Headline' },
                    { key: 'lead', label: 'Lead', multiline: true },
                    { key: 'help', label: 'Help text', multiline: true },
                    { key: 'signInLabel', label: 'Sign-in button' },
                ],
            },
        ],
    },
    confirmation: {
        cards: [
            {
                title: 'Welcome screen',
                fields: [
                    { key: 'title', label: 'Screen title' },
                    { key: 'welcomeTitle', label: 'Welcome headline' },
                    { key: 'welcomeBody', label: 'Welcome body', multiline: true },
                    { key: 'primaryCta', label: 'Primary CTA' },
                    { key: 'applyResidencyLabel', label: 'Apply residency label' },
                    { key: 'secondaryLine', label: 'Secondary line', multiline: true },
                ],
            },
        ],
    },
};

/** @type {JnfFieldDef[]} */
export const JNF_PLAN_BIMONTHLY_FIELDS = [
    { key: 'title', label: 'Plan title' },
    { key: 'displayPrice', label: 'Display price' },
    { key: 'every', label: 'Billing frequency' },
    { key: 'subtext', label: 'Subtext line 1' },
    { key: 'subtext2', label: 'Subtext line 2' },
];

/** @type {JnfFieldDef[]} */
export const JNF_PLAN_ANNUAL_FIELDS = [
    { key: 'title', label: 'Plan title' },
    { key: 'displayPrice', label: 'Display price' },
    { key: 'discount', label: 'Discount badge' },
    { key: 'subtext', label: 'Subtext line 1' },
    { key: 'subtext2', label: 'Subtext line 2' },
];

/** @type {JnfFieldDef[]} */
export const JNF_PAYMENT_TIER_FIELDS = [
    { key: 'finalPaymentPrice', label: 'Price display' },
    { key: 'finalPaymentStatement', label: 'Price statement' },
    { key: 'amount', label: 'Amount' },
    { key: 'planKey', label: 'Plan key', help: 'bi_monthly or annual' },
    { key: 'footerNote', label: 'Footer note 1' },
    { key: 'footerNote2', label: 'Footer note 2' },
];

/** @type {JnfFieldDef[]} */
export const JNF_VALUE_LEGACY_FIELDS = [
    { key: 'price', label: 'Legacy price' },
    { key: 'periodLabel', label: 'Legacy period label' },
    { key: 'renewLine', label: 'Renew line' },
    { key: 'evolvingLine', label: 'Evolving line', multiline: true },
    { key: 'disclaimer', label: 'Disclaimer' },
    { key: 'disclaimerFee', label: 'Disclaimer fee line' },
];

/**
 * @param {JnfFlowId} flowId
 * @param {unknown} bundle
 * @returns {JnfStageId[]}
 */
export function stagesForFlow(flowId, bundle) {
    const flow = bundle && typeof bundle === 'object' ? /** @type {Record<string, unknown>} */ (bundle)[flowId] : null;
    if (!flow || typeof flow !== 'object') return JNF_STAGES.map((s) => s.id);
    return JNF_STAGES.filter((s) => s.id in /** @type {object} */ (flow)).map((s) => s.id);
}
