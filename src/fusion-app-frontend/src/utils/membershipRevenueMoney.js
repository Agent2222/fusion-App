import { formatUsdFromCents } from './programPaymentMoney.js';

/**
 * @param {string | undefined} interval
 * @param {number | undefined} intervalCount
 * @returns {'monthly' | 'bimonthly' | 'annual' | 'other'}
 */
export function cadenceKeyFromInterval(interval, intervalCount) {
    const count = intervalCount || 1;
    if (interval === 'month' && count === 1) return 'monthly';
    if (interval === 'month' && count === 2) return 'bimonthly';
    if (interval === 'year' && count === 1) return 'annual';
    return 'other';
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
 * @param {unknown} summary
 * @param {(value: string) => string} escapeHtml
 * @returns {string}
 */
export function formatMembershipRevenueUnavailableHtml(escapeHtml) {
    return `
        <section class="member-profile-dashboard__card studio-finance-revenue-stat-card">
            <div class="mpd-payments-section-head">
                <h3>Membership revenue</h3>
                <span class="studio-muted">Stripe subscription totals</span>
            </div>
            <p class="studio-muted" style="margin:0">Revenue data is unavailable. Check integration API configuration and try refreshing.</p>
        </section>`;
}

/**
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
