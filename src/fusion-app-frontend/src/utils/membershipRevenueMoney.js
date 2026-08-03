import { MEMBERSHIP_TIER_META, normalizeMembershipTier } from './membershipPlanChange.js';
import {
    studioEffectiveMembershipStatus,
    studioMembershipProvider,
    studioMembershipStatusIsPaid,
} from './studioMembershipPresentation.js';

/** @typedef {'monthly' | 'quarterly' | 'annual' | 'bimonthly'} MembershipRevenueTier */

/**
 * Local USD formatter — avoid importing programPaymentMoney (heavy DOM import chain in Vitest node).
 * @param {unknown} cents
 * @returns {string}
 */
function formatUsdFromCents(cents) {
    const n = Number(cents ?? 0);
    const safe = Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
    }).format(safe / 100);
}

/** List-price cycle amounts (USD cents). */
export const MEMBERSHIP_TIER_LIST_PRICE_CENTS = Object.freeze({
    monthly: 3000,
    quarterly: 7500,
    annual: 26000,
    bimonthly: 5000,
});

/** Display order for Finance tier cards. */
export const MEMBERSHIP_REVENUE_TIER_ORDER = Object.freeze([
    'monthly',
    'quarterly',
    'annual',
    'bimonthly',
]);

/**
 * @param {string | undefined} interval
 * @param {number | undefined} intervalCount
 * @returns {'monthly' | 'bimonthly' | 'quarterly' | 'annual' | 'other'}
 */
export function cadenceKeyFromInterval(interval, intervalCount) {
    const count = intervalCount || 1;
    if (interval === 'month' && count === 1) return 'monthly';
    if (interval === 'month' && count === 2) return 'bimonthly';
    if (interval === 'month' && count === 3) return 'quarterly';
    if (interval === 'year' && count === 1) return 'annual';
    return 'other';
}

/**
 * Infer a single dominant Stripe cadence when only one tier has cycle gross.
 * @param {unknown} stripeSummary
 * @returns {MembershipRevenueTier | ''}
 */
function dominantStripeCadenceTier(stripeSummary) {
    if (!membershipRevenueSummaryOk(stripeSummary)) return '';
    const cadence =
        stripeSummary.cadence && typeof stripeSummary.cadence === 'object'
            ? /** @type {Record<string, number>} */ (stripeSummary.cadence)
            : {};
    /** @type {Array<[MembershipRevenueTier, number]>} */
    const parts = [
        ['monthly', Number(cadence.monthlyCents || 0)],
        ['bimonthly', Number(cadence.bimonthlyCents || 0)],
        ['quarterly', Number(cadence.quarterlyCents || 0)],
        ['annual', Number(cadence.annualCents || 0)],
    ];
    const positive = parts.filter(([, cents]) => cents > 0);
    if (positive.length === 1) return positive[0][0];
    return '';
}

/**
 * Merge Stripe revenue-summary subscription rows onto canister accounts missing membershipTier.
 * When per-sub rows are absent but Stripe cadence is a single tier (e.g. all legacy bi-monthly),
 * apply that tier to untiered Stripe accounts so Finance Type / MRR cards populate.
 * @param {unknown[]} accounts
 * @param {unknown} stripeSummary
 * @returns {unknown[]}
 */
export function mergeStripeSubscriptionTiersIntoAccounts(accounts, stripeSummary) {
    const list = Array.isArray(accounts) ? accounts : [];
    if (!membershipRevenueSummaryOk(stripeSummary)) return list;

    /** @type {Map<string, string>} */
    const bySubId = new Map();
    /** @type {Map<string, string>} */
    const byPrincipal = new Map();
    const subs = /** @type {{ subscriptions?: unknown }} */ (stripeSummary).subscriptions;
    if (Array.isArray(subs)) {
        for (const raw of subs) {
            if (!raw || typeof raw !== 'object') continue;
            const s = /** @type {Record<string, unknown>} */ (raw);
            const tier = normalizeMembershipTier(String(s.cadence || s.tier || ''));
            if (!tier) continue;
            const subId = String(s.subscriptionId || '').trim();
            const principal = String(s.principal || '').trim();
            if (subId) bySubId.set(subId, tier);
            if (principal) byPrincipal.set(principal, tier);
        }
    }

    const dominant = dominantStripeCadenceTier(stripeSummary);

    return list.map((row) => {
        if (!row || typeof row !== 'object') return row;
        const r = /** @type {Record<string, unknown>} */ (row);
        if (normalizeMembershipTier(String(r.membershipTier || r.tier || ''))) return row;
        const subId = String(r.stripeSubscriptionId || '').trim();
        const principal = String(r.principal || '').trim();
        let tier = (subId && bySubId.get(subId)) || (principal && byPrincipal.get(principal)) || '';
        if (!tier && dominant && studioMembershipProvider(row) === 'stripe') {
            tier = dominant;
        }
        if (!tier) return row;
        return { ...r, membershipTier: tier };
    });
}

/**
 * @param {number} unitAmount
 * @param {string | undefined} interval
 * @param {number | undefined} intervalCount
 * @returns {number}
 */
export function mrrCentsFromPrice(unitAmount, interval, intervalCount) {
    const n = unitAmount;
    const count = intervalCount || 1;
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return 0;
    if (interval === 'month') return Math.round(n / count);
    if (interval === 'year') return Math.round(n / (12 * count));
    return 0;
}

/**
 * Normalized MRR contribution for a known membership tier (list price).
 * @param {string} tier
 * @returns {number}
 */
export function mrrCentsForMembershipTier(tier) {
    const t = normalizeMembershipTier(tier);
    if (t === 'monthly') return MEMBERSHIP_TIER_LIST_PRICE_CENTS.monthly;
    if (t === 'quarterly') return Math.round(MEMBERSHIP_TIER_LIST_PRICE_CENTS.quarterly / 3);
    if (t === 'annual') return Math.round(MEMBERSHIP_TIER_LIST_PRICE_CENTS.annual / 12);
    if (t === 'bimonthly') return Math.round(MEMBERSHIP_TIER_LIST_PRICE_CENTS.bimonthly / 2);
    return 0;
}

/**
 * @param {MembershipRevenueTier} tier
 */
export function membershipTierCadenceHint(tier) {
    const meta = MEMBERSHIP_TIER_META[tier];
    if (tier === 'bimonthly') return meta?.priceLine || '$50 every 2 months';
    return meta?.priceLine || '';
}

/**
 * @param {{ active?: number, trialing?: number, included?: number } | null | undefined} counts
 * @returns {string}
 */
export function membershipRevenueCountsCaption(counts) {
    const active = Number(counts?.active ?? 0);
    const trialing = Number(counts?.trialing ?? 0);
    const included = Number(counts?.included ?? active + trialing);
    if (!included) return 'No active membership subscriptions';
    const parts = [];
    if (active) parts.push(`${active} active`);
    if (trialing) parts.push(`${trialing} trialing`);
    return `${parts.join(' · ')} · ${included} included`;
}

/**
 * @param {unknown} summary
 * @returns {summary is { ok: true, mrrCents: number, cadence: Record<string, number>, counts?: Record<string, number> }}
 */
export function membershipRevenueSummaryOk(summary) {
    return Boolean(
        summary &&
            typeof summary === 'object' &&
            /** @type {{ ok?: unknown }} */ (summary).ok === true &&
            typeof /** @type {{ mrrCents?: unknown }} */ (summary).mrrCents === 'number',
    );
}

/**
 * @param {unknown} row
 * @returns {boolean}
 */
function isPayingMembershipRow(row) {
    const r = row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row) : {};
    if (r.membershipExemptManual) return false;
    return studioMembershipStatusIsPaid(studioEffectiveMembershipStatus(row));
}

/**
 * Build normalized MRR dashboard from canister accounts (+ optional Stripe supplement note).
 * @param {unknown[]} accounts
 * @param {unknown} [stripeSummary]
 */
export function buildMembershipRevenueDashboardModel(accounts, stripeSummary = null) {
    const list = Array.isArray(accounts) ? accounts : [];

    /** @type {Record<MembershipRevenueTier, { count: number, mrrCents: number, listPriceCents: number, cadenceHint: string, label: string }>} */
    const tiers = {
        monthly: {
            count: 0,
            mrrCents: 0,
            listPriceCents: MEMBERSHIP_TIER_LIST_PRICE_CENTS.monthly,
            cadenceHint: membershipTierCadenceHint('monthly'),
            label: 'Monthly',
        },
        quarterly: {
            count: 0,
            mrrCents: 0,
            listPriceCents: MEMBERSHIP_TIER_LIST_PRICE_CENTS.quarterly,
            cadenceHint: membershipTierCadenceHint('quarterly'),
            label: 'Quarterly',
        },
        annual: {
            count: 0,
            mrrCents: 0,
            listPriceCents: MEMBERSHIP_TIER_LIST_PRICE_CENTS.annual,
            cadenceHint: membershipTierCadenceHint('annual'),
            label: 'Annual',
        },
        bimonthly: {
            count: 0,
            mrrCents: 0,
            listPriceCents: MEMBERSHIP_TIER_LIST_PRICE_CENTS.bimonthly,
            cadenceHint: membershipTierCadenceHint('bimonthly'),
            label: 'Legacy bi-monthly',
        },
    };

    let payingMembers = 0;
    let activeCount = 0;
    let trialingCount = 0;
    let untieredPaying = 0;
    let paypalCount = 0;
    let stripeCount = 0;
    let unknownProviderCount = 0;

    for (const row of list) {
        if (!isPayingMembershipRow(row)) continue;
        payingMembers += 1;
        const r = /** @type {Record<string, unknown>} */ (row);
        const status = String(studioEffectiveMembershipStatus(row) || '').toLowerCase();
        if (status === 'trialing') trialingCount += 1;
        else activeCount += 1;

        const provider = studioMembershipProvider(row);
        if (provider === 'paypal') paypalCount += 1;
        else if (provider === 'stripe') stripeCount += 1;
        else unknownProviderCount += 1;

        const tier = normalizeMembershipTier(String(r.membershipTier || r.tier || ''));
        if (!tier) {
            untieredPaying += 1;
            continue;
        }
        const per = mrrCentsForMembershipTier(tier);
        tiers[tier].count += 1;
        tiers[tier].mrrCents += per;
    }

    // When canister tiers are empty but Stripe cadence totals exist, fill cards from cycle gross ÷ list price.
    if (untieredPaying > 0 && membershipRevenueSummaryOk(stripeSummary)) {
        const cadence =
            stripeSummary.cadence && typeof stripeSummary.cadence === 'object'
                ? /** @type {Record<string, number>} */ (stripeSummary.cadence)
                : {};
        /** @type {Partial<Record<MembershipRevenueTier, number>>} */
        const estimated = {
            monthly: Math.round(Number(cadence.monthlyCents || 0) / MEMBERSHIP_TIER_LIST_PRICE_CENTS.monthly),
            bimonthly: Math.round(
                Number(cadence.bimonthlyCents || 0) / MEMBERSHIP_TIER_LIST_PRICE_CENTS.bimonthly,
            ),
            quarterly: Math.round(
                Number(cadence.quarterlyCents || 0) / MEMBERSHIP_TIER_LIST_PRICE_CENTS.quarterly,
            ),
            annual: Math.round(Number(cadence.annualCents || 0) / MEMBERSHIP_TIER_LIST_PRICE_CENTS.annual),
        };
        const otherCents = Number(cadence.otherCents || 0);
        if (!(estimated.quarterly > 0) && otherCents >= MEMBERSHIP_TIER_LIST_PRICE_CENTS.quarterly) {
            estimated.quarterly = Math.round(otherCents / MEMBERSHIP_TIER_LIST_PRICE_CENTS.quarterly);
        }
        let assigned = 0;
        for (const key of MEMBERSHIP_REVENUE_TIER_ORDER) {
            if (tiers[key].count > 0) continue;
            let n = Number(estimated[key] || 0);
            if (n <= 0) continue;
            n = Math.min(n, untieredPaying - assigned);
            if (n <= 0) continue;
            tiers[key].count += n;
            tiers[key].mrrCents += n * mrrCentsForMembershipTier(key);
            assigned += n;
        }
        untieredPaying = Math.max(0, untieredPaying - assigned);
    }

    let mrrCents = 0;
    for (const key of MEMBERSHIP_REVENUE_TIER_ORDER) {
        mrrCents += tiers[key].mrrCents;
    }

    let stripeNote = '';
    if (membershipRevenueSummaryOk(stripeSummary)) {
        const stripeMrr = Number(stripeSummary.mrrCents) || 0;
        const stripeIncluded = Number(stripeSummary.counts?.included ?? 0);
        if (stripeMrr > 0 && Math.abs(stripeMrr - mrrCents) >= 100) {
            stripeNote = `Stripe-linked MRR (legacy API): ${formatUsdFromCents(stripeMrr)}${
                stripeIncluded ? ` · ${stripeIncluded} Stripe subs` : ''
            }. Canister-normalized figure above includes PayPal.`;
        }
    }

    return {
        ok: true,
        source: 'canister',
        mrrCents,
        arrCents: mrrCents * 12,
        payingMembers,
        activeCount,
        trialingCount,
        untieredPaying,
        providers: {
            paypal: paypalCount,
            stripe: stripeCount,
            unknown: unknownProviderCount,
        },
        tiers,
        stripeNote,
        explainer:
            'MRR normalizes quarterly, annual, and legacy bi-monthly to a monthly equivalent using list prices.',
    };
}

/**
 * @param {(value: string) => string} escapeHtml
 * @returns {string}
 */
export function formatMembershipRevenueUnavailableHtml(escapeHtml) {
    return `
        <section class="member-profile-dashboard__card studio-finance-revenue-stat-card">
            <div class="mpd-payments-section-head">
                <h3>Membership revenue</h3>
                <span class="studio-muted">Normalized MRR</span>
            </div>
            <p class="studio-muted" style="margin:0">Revenue data is unavailable. Load membership accounts and try refreshing.</p>
        </section>`;
}

/**
 * @param {ReturnType<typeof buildMembershipRevenueDashboardModel> | null | undefined} model
 * @param {(value: string) => string} escapeHtml
 * @param {{ compact?: boolean }} [opts]
 * @returns {string}
 */
export function formatMembershipRevenueDashboardHtml(model, escapeHtml, opts = {}) {
    if (!model || model.ok !== true) {
        return formatMembershipRevenueUnavailableHtml(escapeHtml);
    }

    const paying = Number(model.payingMembers) || 0;
    const mrr = Number(model.mrrCents) || 0;
    const arr = Number(model.arrCents) || mrr * 12;
    const trialing = Number(model.trialingCount) || 0;
    const untiered = Number(model.untieredPaying) || 0;
    const providers = model.providers || { paypal: 0, stripe: 0, unknown: 0 };

    const subParts = [`${paying} paying member${paying === 1 ? '' : 's'}`];
    if (trialing) subParts.push(`${trialing} trialing`);
    if (untiered) subParts.push(`${untiered} missing tier`);
    const subline = `${subParts.join(' · ')} · ARR ${formatUsdFromCents(arr)}`;

    const providerBits = [];
    if (providers.paypal) providerBits.push(`${providers.paypal} PayPal`);
    if (providers.stripe) providerBits.push(`${providers.stripe} Stripe`);
    if (providers.unknown) providerBits.push(`${providers.unknown} unknown`);
    const providerLine = providerBits.length
        ? providerBits.join(' · ')
        : 'No paying members yet';

    /** @param {MembershipRevenueTier} tierKey */
    const tierCard = (tierKey) => {
        const t = model.tiers[tierKey];
        const count = Number(t?.count) || 0;
        const tierMrr = Number(t?.mrrCents) || 0;
        const cadence =
            tierKey === 'bimonthly'
                ? 'Legacy · billed every 2 months · $50'
                : t?.cadenceHint || '';
        return `
        <article class="studio-finance-mrr-tier-card${count ? '' : ' is-empty'}" data-mrr-tier="${escapeHtml(tierKey)}">
            <header class="studio-finance-mrr-tier-card__head">
                <h4>${escapeHtml(t?.label || tierKey)}</h4>
                <span class="studio-finance-mrr-tier-card__count">${escapeHtml(String(count))} sub${count === 1 ? '' : 's'}</span>
            </header>
            <p class="studio-finance-mrr-tier-card__mrr">${escapeHtml(formatUsdFromCents(tierMrr))}</p>
            <p class="studio-finance-mrr-tier-card__hint">MRR contribution</p>
            <p class="studio-finance-mrr-tier-card__cadence">${escapeHtml(cadence)}</p>
        </article>`;
    };

    const tierGrid = MEMBERSHIP_REVENUE_TIER_ORDER.map((k) => tierCard(k)).join('');

    if (opts.compact) {
        return `
            <div class="studio-finance-mrr-compact">
                <div class="studio-finance-mrr-hero studio-finance-mrr-hero--compact">
                    <span class="studio-finance-mrr-hero__label">Normalized MRR</span>
                    <strong class="studio-finance-mrr-hero__value">${escapeHtml(formatUsdFromCents(mrr))}</strong>
                    <span class="studio-finance-mrr-hero__sub">${escapeHtml(subline)}</span>
                </div>
                <div class="studio-finance-mrr-tier-grid studio-finance-mrr-tier-grid--compact">
                    ${tierGrid}
                </div>
            </div>`;
    }

    const stripeNoteHtml = model.stripeNote
        ? `<p class="studio-finance-mrr-stripe-note studio-muted">${escapeHtml(model.stripeNote)}</p>`
        : '';

    return `
        <section class="member-profile-dashboard__card studio-finance-revenue-stat-card studio-finance-mrr-dashboard">
            <div class="mpd-payments-section-head">
                <h3>Membership revenue</h3>
                <span class="studio-muted">Normalized MRR · all providers</span>
            </div>
            <div class="studio-finance-mrr-hero">
                <span class="studio-finance-mrr-hero__label">Normalized MRR</span>
                <strong class="studio-finance-mrr-hero__value">${escapeHtml(formatUsdFromCents(mrr))}</strong>
                <span class="studio-finance-mrr-hero__sub">${escapeHtml(subline)}</span>
                <p class="studio-finance-mrr-hero__explainer">${escapeHtml(model.explainer)}</p>
            </div>
            <div class="studio-finance-mrr-tier-grid" role="group" aria-label="Membership tiers">
                ${tierGrid}
            </div>
            <div class="studio-finance-mrr-providers">
                <span class="studio-finance-mrr-providers__label">Provider mix</span>
                <strong>${escapeHtml(providerLine)}</strong>
            </div>
            ${stripeNoteHtml}
        </section>`;
}

/**
 * Legacy Stripe-summary formatter — prefer {@link formatMembershipRevenueDashboardHtml}.
 * @param {Record<string, unknown>} summary
 * @param {(value: string) => string} escapeHtml
 * @param {{ compact?: boolean }} [opts]
 * @returns {string}
 */
export function formatMembershipRevenueStatHtml(summary, escapeHtml, opts = {}) {
    if (!membershipRevenueSummaryOk(summary)) {
        return formatMembershipRevenueUnavailableHtml(escapeHtml);
    }

    const cadence =
        summary.cadence && typeof summary.cadence === 'object'
            ? /** @type {Record<string, number>} */ (summary.cadence)
            : {};
    const monthlyCents = Number(cadence.monthlyCents ?? 0);
    const bimonthlyCents = Number(cadence.bimonthlyCents ?? 0);
    const annualCents = Number(cadence.annualCents ?? 0);
    const otherCents = Number(cadence.otherCents ?? 0);
    const mrrCents = Number(summary.mrrCents ?? 0);
    const counts =
        summary.counts && typeof summary.counts === 'object'
            ? /** @type {{ active?: number, trialing?: number, included?: number }} */ (summary.counts)
            : {};
    const caption = membershipRevenueCountsCaption(counts);

    /** @param {string} label @param {number} cents @param {string} hint */
    const card = (label, cents, hint) => `
        <div class="mpd-payments-overview-card">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(formatUsdFromCents(cents))}</strong>
            <small>${escapeHtml(hint)}</small>
        </div>`;

    const cards = [
        card('Monthly equivalent (MRR)', mrrCents, caption),
        card('Bi-monthly billing', bimonthlyCents, 'Per 2-month cycle total'),
        card('Monthly billing', monthlyCents, 'Per 1-month cycle total'),
        card('Annual billing', annualCents, 'Per year cycle total'),
    ];
    if (otherCents > 0) {
        cards.push(card('Other cadence', otherCents, 'Non-standard billing intervals'));
    }

    if (opts.compact) {
        const compactCards = [
            card('MRR', mrrCents, caption),
            card('Bi-monthly', bimonthlyCents, 'Per cycle'),
        ];
        if (annualCents > 0) compactCards.push(card('Annual', annualCents, 'Per cycle'));
        return `
            <div class="mpd-payments-overview-grid studio-finance-revenue-stat-grid">
                ${compactCards.join('')}
            </div>`;
    }

    return `
        <section class="member-profile-dashboard__card studio-finance-revenue-stat-card">
            <div class="mpd-payments-section-head">
                <h3>Membership revenue</h3>
                <span class="studio-muted">Active and trialing Stripe subscriptions</span>
            </div>
            <div class="mpd-payments-overview-grid studio-finance-revenue-stat-grid">
                ${cards.join('')}
            </div>
        </section>`;
}
