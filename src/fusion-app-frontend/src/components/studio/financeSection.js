/**
 * Studio → Finance: overview dashboard + domain tabs (Programs, Users, Products, Promotions).
 */
import '../../styles/memberProfileDashboard.css';
import '../../styles/studioFinanceDashboard.css';
import {
    adminListAccountContactsForStudio,
    addProgramTeamMemberStudio,
    archiveFinancePromotionStudio,
    getAccountsForStudio,
    getApplicants,
    getProgramDisplayNameFromRow,
    getPrograms,
    getStaffProgramPaymentsFinanceStudio,
    listAdminsForStudio,
    listFinancePromotionsStudio,
    listProgramTeamStudio,
    reassignProgramLedgerEntryStudio,
    recordStaffManualProgramLedgerStudio,
    removeProgramTeamMemberStudio,
    updateProgramTeamMemberExpensesStudio,
    updateProgramTeamMemberPayoutPercentStudio,
    upsertProgramTeamOwedEntryStudio,
    upsertProgramTeamPaidEntryStudio,
    voidProgramTeamOwedEntryStudio,
    voidProgramTeamPaidEntryStudio,
    staffSetProgramPaymentFlightPreferenceStudio,
    updateStaffManualProgramLedgerStudio,
    upsertApplicantStudio,
    upsertFinancePromotionStudio,
} from '../../utils/database.js';
import {
    fetchMembershipRevenueSummary,
    repairPayPalProgramPayment,
    syncPayPalSubscription,
    syncSubscriptionFromStripe,
    syncSubscriptionFromStripeByEmail,
} from '../../utils/integrationApi.js';
import {
    applicantCategoryPillHtml,
    applicantDisplayNamesFromPayload,
    getApplicantCategory,
    getApplicantFlightCostCents,
    getApplicantIsTester,
    getApplicantLocalTravelCostCents,
    getApplicantManualDepositSubmitted,
    getApplicantSpecialProgramTotalCents,
    getApplicantSponsorshipMode,
    getApplicantSponsoredCreditCents,
    getApplicantSponsoredPercent,
    getApplicantSponsoredCreditInputMode,
    mergeApplicantStaffFields,
    parseApplicantPayload,
    shortPrincipalDisplay,
} from '../../utils/studioPlainForms.js';
import { firstNonEmptyString } from '../../utils/localeFallback.js';
import { parseProgramEndDate } from '../../utils/programAlumniEligibility.js';
import {
    buildProgramPaymentIndex,
    buildStudioProgramFinanceRows,
    computeFinancePanelTotals,
    computeProgramExpectedRevenueCents,
    computeProgramCollectedPaymentsCents,
    activeTeamMemberOwedEntries,
    activeTeamMemberPaidEntries,
    computeAdminFundedStaffPaidCents,
    computeAdminNetProgramPayoutCents,
    computeProgramProfitCents,
    computeProjectedPayoutCents,
    computeStaffOutstandingOwedCents,
    listStaffPaidDisbursementEntries,
    paidEntryFundedBy,
    formatUsdFromCents,
    isApplicantSlotSecured,
    isLedgerPaymentRow,
    isLedgerRowSucceeded,
    ledgerRowSource,
    ledgerRowTypeLabel,
    PROGRAM_VETERAN_DISCOUNT_CENTS,
    programPromotionExpenseCents,
    programPromotionsForProgram,
    sumTeamMemberOwedCents,
    sumTeamMemberPaidCents,
    teamMemberDisbursementRemainingCents,
    teamMemberDisbursementRemainingWithProgramCents,
    teamMemberOutstandingOwedCents,
    teamMemberExpenseSubtotalCents,
} from '../../utils/programPaymentMoney.js';
import {
    countMembershipMetrics,
    formatSubscriptionPeriodEnd,
    studioMembershipBadgeHtml,
    studioMembershipCellLabel,
    studioMembershipFilterMatch,
    studioMembershipTierShortLabel,
    studioStripeDashboardCustomerUrl,
} from '../../utils/studioMembershipPresentation.js';
import {
    studioFeatureAccess,
    studioFinanceCategoryAccess,
    studioFinanceVisibleCategories,
} from '../../utils/studioShellState.js';
import { studioIconHref } from '../../utils/studioIconRegistry.js';
import { getStripePublishableKeyResolved } from '../../utils/studioServicesConfig.js';
import {
    buildMembershipRevenueDashboardModel,
    formatMembershipRevenueDashboardHtml,
    mergeStripeSubscriptionTiersIntoAccounts,
} from '../../utils/membershipRevenueMoney.js';
import { openStudioModal } from '../../utils/studioModal.js';
import { openApplicantEmailModal } from './applicantEmailModal.js';

const CHIP_STORAGE_KEY = 'studio-finance-overview-chips-v1';
const PROGRAM_SELECT_STORAGE_KEY = 'studio-finance-selected-program-v1';

/**
 * @param {string} payloadJson
 * @param {Partial<Record<string, unknown>>} overrides
 */
function staffFieldsFromPayload(payloadJson, overrides = {}) {
    const { internalNotes } = parseApplicantPayload(payloadJson);
    return {
        internalNotes: internalNotes || '',
        manualDepositSubmitted: getApplicantManualDepositSubmitted(payloadJson),
        applicantCategory: getApplicantCategory(payloadJson),
        isTester: getApplicantIsTester(payloadJson),
        flightCostCents: getApplicantFlightCostCents(payloadJson),
        localTravelCostCents: getApplicantLocalTravelCostCents(payloadJson),
        specialProgramTotalCents: getApplicantSpecialProgramTotalCents(payloadJson) || null,
        sponsorshipMode: getApplicantSponsorshipMode(payloadJson),
        sponsoredCreditCents: getApplicantSponsoredCreditCents(payloadJson),
        sponsoredPercent: getApplicantSponsoredPercent(payloadJson),
        sponsoredCreditInputMode: getApplicantSponsoredCreditInputMode(payloadJson),
        ...overrides,
    };
}

/** @type {{ id: string, label: string, tab: string, chip: string, icon: string, modifier: string }[]} */
const FINANCE_DOMAINS = [
    {
        id: 'overview',
        label: 'Overview',
        tab: 'overview',
        chip: '',
        icon: 'group-overview',
        modifier: 'overview',
    },
    {
        id: 'programs',
        label: 'Programs',
        tab: 'programs',
        chip: 'programs',
        icon: 'nav-programs',
        modifier: 'programs',
        category: 'Programs',
    },
    {
        id: 'users',
        label: 'Users',
        tab: 'users',
        chip: 'users',
        icon: 'nav-subscribers',
        modifier: 'users',
        category: 'Users',
    },
    {
        id: 'products',
        label: 'Products',
        tab: 'products',
        chip: 'products',
        icon: 'nav-products',
        modifier: 'products',
        category: 'Products',
    },
    {
        id: 'promotions',
        label: 'Promotions',
        tab: 'promotions',
        chip: 'promotions',
        icon: 'nav-email',
        modifier: 'promotions',
        category: 'Promotions',
    },
    {
        id: 'diagnostics',
        label: 'Diagnostics',
        tab: 'diagnostics',
        chip: '',
        icon: 'nav-programs',
        modifier: 'diagnostics',
    },
];

/**
 * @param {string} s
 */
function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * @param {unknown} bundle
 * @returns {{ summaries: object[], ledger: object[], plans: object[] }}
 */
function normalizeFinanceBundle(bundle) {
    const b = bundle && typeof bundle === 'object' ? bundle : {};
    return {
        summaries: Array.isArray(b.summaries) ? b.summaries : [],
        ledger: Array.isArray(b.ledger) ? b.ledger : [],
        plans: Array.isArray(b.plans) ? b.plans : [],
    };
}

/**
 * @param {string} iconKey
 */
function financeTabIconStyle(iconKey) {
    const href = studioIconHref(iconKey);
    return href ? ` style="--mpd-icon-url: url('${escapeHtml(href)}')"` : '';
}

/**
 * @param {{ id: string, label: string, tab: string, modifier: string, icon: string, category?: string }} d
 */
function domainTabVisible(d) {
    if (d.tab === 'overview' || d.tab === 'diagnostics') {
        return studioFeatureAccess('finance').visible;
    }
    if (!d.category) return false;
    return studioFinanceCategoryAccess(d.category).visible;
}

export function renderFinance() {
    const tabs = FINANCE_DOMAINS.filter(domainTabVisible)
        .map((d) => {
            const iconAttr = financeTabIconStyle(d.icon);
            const active = d.tab === 'overview' ? ' is-active' : '';
            return `<button type="button" class="mpd-program-tab mpd-program-tab--${d.modifier}${active}" role="tab" id="studio-finance-tab-${d.id}" aria-selected="${d.tab === 'overview' ? 'true' : 'false'}" tabindex="${d.tab === 'overview' ? '0' : '-1'}" aria-controls="studio-finance-panel-${d.id}" data-finance-tab="${escapeHtml(d.tab)}">
                <span class="mpd-program-tab__icon"${iconAttr} aria-hidden="true"></span>
                <span>${escapeHtml(d.label)}</span>
            </button>`;
        })
        .join('');

    const chipDomains = FINANCE_DOMAINS.filter((d) => d.chip && domainTabVisible(d));
    const chips = chipDomains
        .map(
            (d) =>
                `<button type="button" class="mpd-payments-pill is-active" data-finance-chip="${escapeHtml(d.chip)}" aria-pressed="true">${escapeHtml(d.label)}</button>`,
        )
        .join('');

    return `
        <div class="studio-section-stack studio-category-page studio-finance-page">
            <div class="studio-finance-intro">
                <h2 class="studio-finance-intro__title">Finance</h2>
                <p class="studio-muted studio-finance-intro__hint">Revenue and payment health across programs, membership, products, and promotions. Use Overview for a cross-category summary; open a tab for detail.</p>
            </div>
            <p id="studio-finance-status" class="member-profile-dashboard__status-line" role="status" aria-live="polite"></p>
            <div id="studio-finance-loading" class="mpd-initial-loading" role="status" aria-live="polite">
                <div class="mpd-initial-loading__spinner" aria-hidden="true"></div>
                <p>Loading finance data…</p>
            </div>
            <div id="studio-finance-empty" class="studio-banner studio-banner--warn" hidden>No finance category permissions are enabled for your role. Ask an admin to grant Finance sub-keys under Permissions.</div>
            <div id="studio-finance-workspace" hidden>
                <div class="studio-finance-domain-tabs">
                    <div class="mpd-program-tabs" role="tablist" aria-label="Finance sections">${tabs}</div>
                </div>
                <div class="mpd-program-tab-panel" id="studio-finance-panel-overview" role="tabpanel" aria-labelledby="studio-finance-tab-overview" data-finance-panel="overview">
                    <section class="member-profile-dashboard__card studio-finance-overview-card">
                        <h2>Overview</h2>
                        <p class="studio-muted">Summary metrics for categories you include below. This does not change your permissions.</p>
                        ${
                            chips
                                ? `<div class="studio-finance-chip-field">
                            <span>Include in overview</span>
                            <div class="mpd-payments-pill-rail" role="group" aria-label="Include in overview">${chips}</div>
                            <p id="studio-finance-chip-hint" class="studio-muted mpd-field-hint" hidden>At least one category must stay included.</p>
                        </div>
                        <div id="studio-finance-overview-sections" aria-live="polite"></div>`
                                : '<p class="studio-muted">No category scopes available for overview toggles.</p>'
                        }
                    </section>
                </div>
                <div class="mpd-program-tab-panel" id="studio-finance-panel-programs" role="tabpanel" aria-labelledby="studio-finance-tab-programs" data-finance-panel="programs" hidden>
                    <div class="studio-finance-programs-panel">
                        <div class="mpd-payments-section-head" style="margin-bottom:0.75rem">
                            <div id="studio-finance-program-revenue-stat" class="studio-finance-program-revenue-stat" aria-live="polite"></div>
                            <div class="studio-finance-programs-actions" style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center">
                                <button type="button" class="studio-btn-ghost" id="studio-finance-programs-refresh">Refresh payments</button>
                                <button type="button" class="studio-btn-ghost" id="studio-finance-programs-sync">Sync payments</button>
                            </div>
                        </div>
                        <p class="studio-muted mpd-field-hint" id="studio-finance-programs-refresh-status" role="status"></p>
                        <p class="studio-muted mpd-field-hint">Sync payments re-imports a completed PayPal program payment by order or capture ID. It does not pull Stripe membership subscriptions.</p>
                        <div class="studio-finance-program-cards-rail studio-finance-program-cards-rail--unified" id="studio-finance-program-cards-unified" role="list" aria-label="Programs"></div>
                        <div id="studio-finance-program-table-wrap" class="studio-finance-program-table-wrap" aria-live="polite"></div>
                        <div id="studio-finance-program-promotions-wrap" class="studio-finance-program-promotions-wrap" aria-live="polite"></div>
                        <div id="studio-finance-disbursements-wrap" class="studio-finance-disbursements-wrap" aria-live="polite"></div>
                    </div>
                </div>
                <div class="mpd-program-tab-panel" id="studio-finance-panel-users" role="tabpanel" aria-labelledby="studio-finance-tab-users" data-finance-panel="users" hidden>
                    <div id="studio-finance-users-revenue-stat" aria-live="polite"></div>
                    <div id="studio-finance-users-summary"></div>
                    <section class="member-profile-dashboard__card" style="margin-top:0.75rem">
                        <div class="mpd-payments-section-head">
                            <h3>Membership accounts</h3>
                            <button type="button" class="studio-btn-ghost" id="studio-finance-users-refresh">Refresh memberships</button>
                        </div>
                        <p class="studio-muted mpd-field-hint" id="studio-finance-users-refresh-status" role="status"></p>
                        <div class="studio-finance-filter-bar">
                            <label class="studio-field">
                                <span>Membership</span>
                                <select id="studio-finance-users-membership" class="studio-select">
                                    <option value="">All</option>
                                    <option value="active" selected>Active</option>
                                    <option value="trialing">Trialing</option>
                                    <option value="past_due">Past due</option>
                                    <option value="canceled">Canceled</option>
                                    <option value="exempt">Exempt (manual)</option>
                                    <option value="none">No subscription</option>
                                </select>
                            </label>
                            <label class="studio-field studio-field--grow">
                                <span>Search</span>
                                <input type="search" id="studio-finance-users-search" class="studio-input" placeholder="Name or email…" autocomplete="off" />
                            </label>
                        </div>
                        <div class="studio-table-wrap studio-table-wrap--sticky-head">
                            <table class="studio-table studio-table--dense">
                                <thead>
                                    <tr>
                                        <th>Status</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Membership</th>
                                        <th>Type</th>
                                        <th>Renews</th>
                                        <th>Provider</th>
                                        <th>Principal</th>
                                    </tr>
                                </thead>
                                <tbody id="studio-finance-users-tbody"><tr><td colspan="8">Loading…</td></tr></tbody>
                            </table>
                        </div>
                    </section>
                </div>
                <div class="mpd-program-tab-panel" id="studio-finance-panel-products" role="tabpanel" aria-labelledby="studio-finance-tab-products" data-finance-panel="products" hidden>
                    ${placeholderPanelHtml(
                        'Products',
                        'Edition and object sales reporting will appear when checkout is wired to Stripe.',
                        ['Revenue by edition / product', 'Refunds and partial payments', 'Links to public edition catalog IDs'],
                    )}
                </div>
                <div class="mpd-program-tab-panel" id="studio-finance-panel-promotions" role="tabpanel" aria-labelledby="studio-finance-tab-promotions" data-finance-panel="promotions" hidden>
                    <div id="studio-finance-promotions-overview" class="mpd-payments-overview-grid" style="margin-bottom:1rem"></div>
                    <section class="member-profile-dashboard__card">
                        <div class="mpd-payments-section-head">
                            <h2>Promotions</h2>
                            <button type="button" class="studio-btn-primary" id="studio-finance-promo-add">Add promotion</button>
                        </div>
                        <p class="studio-muted">Track advertising and partnership spend by program or platform-wide.</p>
                        <div class="studio-table-wrap studio-table-wrap--sticky-head">
                            <table class="studio-table studio-table--dense">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Company</th>
                                        <th>Dates</th>
                                        <th>Target</th>
                                        <th>Cost</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody id="studio-finance-promotions-tbody"><tr><td colspan="6">Loading…</td></tr></tbody>
                            </table>
                        </div>
                    </section>
                </div>
                <div class="mpd-program-tab-panel" id="studio-finance-panel-diagnostics" role="tabpanel" aria-labelledby="studio-finance-tab-diagnostics" data-finance-panel="diagnostics" hidden>
                    <section class="member-profile-dashboard__card">
                        <div class="mpd-payments-section-head">
                            <h2>Payment diagnostics</h2>
                            <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
                                <button type="button" class="studio-btn-ghost" id="studio-finance-diagnostics-refresh">Refresh</button>
                                <button type="button" class="studio-btn-ghost" id="studio-finance-diagnostics-sync">Sync payments</button>
                            </div>
                        </div>
                        <p class="studio-muted">Temporary tool. Cross-checks every recorded ledger payment (Stripe, PayPal, staff) against applicant records so you can see why a payment may not appear in the Programs table. A payment only shows in Programs when it matches an applicant on an <strong>active/open/full</strong> program and that applicant is <strong>slot-secured</strong>. If a ledger row exists but the applicant is missing, use <strong>Assign…</strong> to attach it. Use <strong>Sync payments</strong> to re-import a completed PayPal capture that never landed on the canister.</p>
                        <div id="studio-finance-diagnostics-body" aria-live="polite"></div>
                    </section>
                </div>
            </div>
        </div>
    `;
}

/**
 * @param {string} title
 * @param {string} lead
 * @param {string[]} bullets
 */
function placeholderPanelHtml(title, lead, bullets) {
    const lis = bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('');
    return `
        <section class="member-profile-dashboard__card">
            <h2>${escapeHtml(title)}</h2>
            <p class="studio-muted">${escapeHtml(lead)}</p>
            <div class="studio-finance-coming-soon">
                <h4>Coming soon</h4>
                <ul class="studio-muted" style="margin:0;padding-left:1.1rem;line-height:1.5">${lis}</ul>
            </div>
        </section>
    `;
}

/**
 * @param {string} studioStatus
 * @returns {{ section: 'active' | 'past' | 'upcoming', badge: string, badgeKey: string }}
 */
function financeLifecycleFromStudioStatus(studioStatus) {
    const s = String(studioStatus || '').trim();
    if (s === 'completed') {
        return { section: 'past', badge: 'Completed', badgeKey: 'completed' };
    }
    if (s === 'comingUp') {
        return { section: 'upcoming', badge: 'Upcoming', badgeKey: 'upcoming' };
    }
    if (s === 'active' || s === 'open' || s === 'full') {
        return { section: 'active', badge: 'Active', badgeKey: 'active' };
    }
    return { section: 'upcoming', badge: 'Upcoming', badgeKey: 'upcoming' };
}

/**
 * True when studio status is completed or program end date is today/past.
 * @param {object | null | undefined} programRow
 */
function isFinanceProgramEnded(programRow) {
    if (!programRow || typeof programRow !== 'object') return false;
    if (String(programRow.studioStatus || '').trim() === 'completed') return true;
    const card =
        (programRow.enCard && typeof programRow.enCard === 'object' ? programRow.enCard : null) ||
        (programRow.jaCard && typeof programRow.jaCard === 'object' ? programRow.jaCard : null) ||
        {};
    const endDate = String(card.endDate ?? card.end ?? card.programEnd ?? '').trim();
    const startDate = String(card.startDate ?? card.start ?? '').trim();
    const year = String(card.year ?? '').trim();
    if (!endDate) return false;
    const end = parseProgramEndDate(endDate, startDate, year);
    if (!end || Number.isNaN(end.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return end.getTime() <= today.getTime();
}

/**
 * @param {string} raw
 * @returns {number}
 */
function parseUsdInputToCents(raw) {
    const s = String(raw || '').trim().replace(/[^0-9.]/g, '');
    if (!s) return 0;
    return Math.max(0, Math.round(Number(s) * 100));
}

/**
 * @param {object} programRow
 * @param {object[] | undefined} applicantsForProgram
 * @param {ReturnType<typeof buildProgramPaymentIndex>} paymentIndex
 */
function computeExpectedRevenue(programRow, applicantsForProgram, paymentIndex) {
    return computeProgramExpectedRevenueCents(programRow, applicantsForProgram, paymentIndex);
}

/**
 * @param {object} programRow
 * @param {object[] | undefined} applicantsForProgram
 * @param {ReturnType<typeof buildProgramPaymentIndex>} paymentIndex
 * @param {object[] | undefined} [teamMembers]
 * @param {object[] | undefined} [promotions]
 */
function buildFinanceProgramCardModel(
    programRow,
    applicantsForProgram,
    paymentIndex,
    teamMembers,
    promotions,
) {
    const lifecycle = financeLifecycleFromStudioStatus(programRow.studioStatus);
    const revenue = computeExpectedRevenue(programRow, applicantsForProgram, paymentIndex);
    const collected = computeProgramCollectedPaymentsCents(
        programRow,
        applicantsForProgram,
        paymentIndex,
    );
    const programId = String(programRow.id || '');
    const promotionExpenseCents = programPromotionExpenseCents(promotions, programId);
    const profitCents = computeProgramProfitCents(
        programRow,
        applicantsForProgram,
        paymentIndex,
        teamMembers,
        promotions,
    );
    return {
        id: programId,
        title: getProgramDisplayNameFromRow(programRow),
        imageSrc: firstNonEmptyString(
            programRow.jaCard?.imageSrc,
            programRow.enCard?.imageSrc,
        ),
        ...lifecycle,
        ...revenue,
        ...collected,
        promotionExpenseCents,
        profitCents,
    };
}

/**
 * @param {object} a
 * @param {object} b
 */
function sortFinanceProgramRows(a, b) {
    const yearA = Number(
        (a.enCard && typeof a.enCard === 'object' ? a.enCard.year : undefined) ?? 0,
    );
    const yearB = Number(
        (b.enCard && typeof b.enCard === 'object' ? b.enCard.year : undefined) ?? 0,
    );
    if (yearB !== yearA) return yearB - yearA;
    return String(a.id || '').localeCompare(String(b.id || ''));
}

/**
 * @param {ReturnType<typeof buildFinanceProgramCardModel>} item
 * @param {boolean} selected
 */
function financeProgramCardHtml(item, selected) {
    const claimed = Number(item.slotsClaimed ?? item.filledSlots ?? 0);
    let slotLine = 'No deposit-paid slots claimed yet';
    if (claimed > 0) {
        const parts = [
            `${claimed} slot${claimed === 1 ? '' : 's'} claimed (deposit paid)`,
        ];
        if (item.veteranSlotCount > 0) {
            parts.push(
                `${item.veteranSlotCount} veteran (−${formatUsdFromCents(PROGRAM_VETERAN_DISCOUNT_CENTS)} ea)`,
            );
        }
        if (item.avgPerSlotCents > 0) {
            parts.push(`avg ${formatUsdFromCents(item.avgPerSlotCents)}/slot`);
        }
        slotLine = parts.join(' · ');
    }
    const media = item.imageSrc
        ? `<img class="studio-finance-program-card__img" src="${escapeHtml(item.imageSrc)}" alt="" loading="lazy" />`
        : `<div class="studio-finance-program-card__placeholder" aria-hidden="true">Fusion</div>`;
    return `<button type="button" class="studio-finance-program-card${selected ? ' is-selected' : ''}" role="listitem" data-finance-program-id="${escapeHtml(item.id)}" aria-pressed="${selected ? 'true' : 'false'}">
        <div class="studio-finance-program-card__media">${media}</div>
        <div class="studio-finance-program-card__body">
            <div class="studio-finance-program-card__head">
                <h4 class="studio-finance-program-card__title">${escapeHtml(item.title)}</h4>
                <span class="studio-finance-program-card__status studio-finance-program-card__status--${escapeHtml(item.badgeKey)}">${escapeHtml(item.badge)}</span>
            </div>
            <div class="studio-finance-program-card__metrics">
                <p class="studio-finance-program-card__revenue"><span>Expected revenue</span><strong>${escapeHtml(formatUsdFromCents(item.expectedCents))}</strong></p>
                <p class="studio-finance-program-card__revenue"><span>Total payments</span><strong>${escapeHtml(formatUsdFromCents(item.totalPaymentsCents))}</strong></p>
                <p class="studio-finance-program-card__revenue"><span>Remaining</span><strong>${escapeHtml(formatUsdFromCents(item.remainingBalanceCents))}</strong></p>
                <p class="studio-finance-program-card__revenue"><span>Promotions</span><strong>${escapeHtml(formatUsdFromCents(item.promotionExpenseCents))}</strong></p>
                <p class="studio-finance-program-card__revenue"><span>Total profit</span><strong>${escapeHtml(formatUsdFromCents(item.profitCents))}</strong></p>
            </div>
            <p class="studio-finance-program-card__slots">${escapeHtml(slotLine)}</p>
        </div>
    </button>`;
}

/**
 * @param {ReturnType<typeof buildStudioProgramFinanceRows>[number]} row
 */
function financeProgramTableRowHtml(row) {
    const priceBadges = [];
    if (normalizeCentsSafe(row.specialProgramTotalCents) > 0) {
        priceBadges.push('<span class="studio-status-pill studio-status-pill--category-veteran-plus">Special</span>');
    }
    if (row.sponsorshipMode === 'full') {
        priceBadges.push('<span class="studio-status-pill studio-status-pill--category-sponsored">Sponsored (full)</span>');
    } else if (row.sponsorshipMode === 'partial') {
        const creditLabel =
            row.sponsoredPercent != null
                ? `−${Number(row.sponsoredPercent)}%`
                : `−${formatUsdFromCents(row.sponsoredCreditCents || 0)}`;
        priceBadges.push(
            `<span class="studio-status-pill studio-status-pill--category-partial">Partial (${escapeHtml(creditLabel)})</span>`,
        );
    }
    const categoryCell = `${applicantCategoryPillHtml(row.category, escapeHtml)} ${priceBadges.join(' ')} <span class="studio-finance-price-amount">${escapeHtml(formatUsdFromCents(row.priceCategoryCents))}</span>`;
    const depositWaived =
        Boolean(row.depositWaived) ||
        row.sponsorshipMode === 'full' ||
        row.category === 'sponsored' ||
        row.category === 'extSponsored' ||
        String(row.summary?.depositStatus || '') === 'waived';
    const depositCell = depositWaived
        ? '<span class="mpd-payments-pill mpd-payments-pill--muted">Waived</span>'
        : row.depositPaid
          ? `<span class="mpd-payments-pill mpd-payments-pill--paid">Paid</span> <span class="studio-finance-price-amount">${escapeHtml(formatUsdFromCents(row.depositAmountCents))}</span>`
          : '<span class="studio-muted">—</span>';
    const planCell = row.planActive
        ? '<span class="mpd-payments-pill mpd-payments-pill--active">Active</span>'
        : '<span class="studio-muted">—</span>';
    const planPriceCell =
        row.planPriceCents > 0 ? formatUsdFromCents(row.planPriceCents) : '—';
    const ticketsLabel = row.ownFlight
        ? `<span class="mpd-payments-pill mpd-payments-pill--muted">Own Flight</span>`
        : '';
    const moneyBtn = (mode, cents, extraHtml = '') =>
        `<button type="button" class="studio-finance-money-btn" data-finance-ledger-open="1" data-applicant-id="${escapeHtml(row.applicantId)}" data-finance-ledger-mode="${mode}">${escapeHtml(formatUsdFromCents(cents))}</button>${extraHtml}`;
    return `<tr data-finance-applicant-id="${escapeHtml(row.applicantId)}">
        <td class="studio-finance-sticky-col studio-finance-sticky-col--first">${escapeHtml(row.firstName || '—')}</td>
        <td class="studio-finance-sticky-col studio-finance-sticky-col--second">${escapeHtml(row.lastName || '—')}</td>
        <td>${escapeHtml(row.discipline || '—')}</td>
        <td class="studio-finance-price-category">${categoryCell}</td>
        <td class="studio-finance-price-category">${depositCell}</td>
        <td>${planCell}</td>
        <td>${escapeHtml(planPriceCell)}</td>
        <td>${moneyBtn('payments', row.totalPaymentsCents)}</td>
        <td>${moneyBtn('fees', row.paymentFeesCents)}</td>
        <td class="studio-finance-tickets-cell">${moneyBtn('tickets', row.ticketsCents, ticketsLabel ? ` ${ticketsLabel}` : '')}</td>
        <td>${moneyBtn('travel', row.localTravelCents)}</td>
        <td>${escapeHtml(formatUsdFromCents(row.partner1Cents))}</td>
        <td>${escapeHtml(formatUsdFromCents(row.partner2Cents))}</td>
        <td>${escapeHtml(formatUsdFromCents(row.partner3Cents))}</td>
        <td>${escapeHtml(formatUsdFromCents(row.subtotalCents))}</td>
        <td>${escapeHtml(formatUsdFromCents(row.remainingBalanceCents))}</td>
        <td>${escapeHtml(formatUsdFromCents(row.profitCents))}</td>
        <td><span class="studio-muted">—</span></td>
        <td><button type="button" class="studio-btn-ghost studio-finance-email-btn" data-finance-email-applicant="${escapeHtml(row.applicantId)}">Email</button></td>
    </tr>`;
}

/**
 * @param {object} member
 * @param {{ firstName?: string, lastName?: string, email?: string } | null} contact
 * @param {number} programProfitCents
 * @param {boolean} canEdit
 */
function financeTeamTableRowHtml(member, contact, programProfitCents, canEdit) {
    const id = String(member.id || '');
    const kind = String(member.kind || 'staff');
    const kindLabel = kind === 'admin' ? 'Admin' : kind === 'collaborator' ? 'Collaborator' : 'Staff';
    const first =
        String(contact?.firstName || '').trim() ||
        shortPrincipalDisplay(String(member.principalText || ''));
    const last = String(contact?.lastName || '').trim() || '—';
    const tickets = normalizeCentsSafe(member.ticketsCents);
    const travel = normalizeCentsSafe(member.localTravelCents);
    const p1 = normalizeCentsSafe(member.partner1Cents);
    const p2 = normalizeCentsSafe(member.partner2Cents);
    const p3 = normalizeCentsSafe(member.partner3Cents);
    const subtotal = teamMemberExpenseSubtotalCents(member);
    const pct = Math.max(0, Math.min(100, Number(member.payoutPercent) || 0));
    const projected = computeProjectedPayoutCents(programProfitCents, pct);
    const expenseBtn = (field, cents) =>
        canEdit
            ? `<button type="button" class="studio-finance-money-btn" data-finance-team-expense="1" data-team-member-id="${escapeHtml(id)}" data-expense-field="${field}">${escapeHtml(formatUsdFromCents(cents))}</button>`
            : escapeHtml(formatUsdFromCents(cents));
    const payoutBtn = canEdit
        ? `<button type="button" class="studio-finance-money-btn" data-finance-team-payout-pct="1" data-team-member-id="${escapeHtml(id)}" title="Edit payout %">${escapeHtml(formatUsdFromCents(projected))} <span class="studio-muted">(${pct}%)</span></button>`
        : `${escapeHtml(formatUsdFromCents(projected))} <span class="studio-muted">(${pct}%)</span>`;
    return `<tr class="studio-finance-team-row" data-finance-team-member-id="${escapeHtml(id)}">
        <td class="studio-finance-sticky-col studio-finance-sticky-col--first">${escapeHtml(first)}</td>
        <td class="studio-finance-sticky-col studio-finance-sticky-col--second">${escapeHtml(last)}</td>
        <td><span class="studio-muted">Team</span></td>
        <td><span class="studio-status-pill studio-status-pill--category-sponsored">${escapeHtml(kindLabel)}</span></td>
        <td><span class="studio-muted">—</span></td>
        <td><span class="studio-muted">—</span></td>
        <td><span class="studio-muted">—</span></td>
        <td><span class="studio-muted">—</span></td>
        <td><span class="studio-muted">—</span></td>
        <td>${expenseBtn('ticketsCents', tickets)}</td>
        <td>${expenseBtn('localTravelCents', travel)}</td>
        <td>${expenseBtn('partner1Cents', p1)}</td>
        <td>${expenseBtn('partner2Cents', p2)}</td>
        <td>${expenseBtn('partner3Cents', p3)}</td>
        <td>${escapeHtml(formatUsdFromCents(subtotal))}</td>
        <td><span class="studio-muted">—</span></td>
        <td>${escapeHtml(formatUsdFromCents(-subtotal))}</td>
        <td>${payoutBtn}</td>
        <td><span class="studio-muted">—</span></td>
    </tr>`;
}

function normalizeCentsSafe(value) {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

/** @type {const} */
const FINANCE_TABLE_COL_COUNT = 19;

/**
 * @param {ReturnType<typeof buildStudioProgramFinanceRows>} rows
 * @param {string | null} selectedProgramId
 * @param {Map<string, ReturnType<typeof buildFinanceProgramCardModel>>} programCardById
 * @param {object[]} [teamMembers]
 * @param {Map<string, { firstName: string, lastName: string, fullName: string, email: string }>} [contactByPrincipal]
 * @param {number} [programProfitCents]
 * @param {boolean} [canEdit]
 */
function financeProgramTableHtml(
    rows,
    selectedProgramId,
    programCardById,
    teamMembers = [],
    contactByPrincipal = new Map(),
    programProfitCents = 0,
    canEdit = false,
) {
    let filterLabel = 'All active programs — slot-secured applicants';
    if (selectedProgramId) {
        const card = programCardById.get(selectedProgramId);
        filterLabel = card
            ? `Filtered: ${card.title}`
            : 'Filtered to one program';
    }
    const applicantBody =
        rows.length > 0
            ? rows.map((row) => financeProgramTableRowHtml(row)).join('')
            : '';
    const teamBody =
        selectedProgramId && Array.isArray(teamMembers) && teamMembers.length
            ? teamMembers
                  .filter((m) => m && String(m.status || 'active') !== 'removed')
                  .map((m) =>
                      financeTeamTableRowHtml(
                          m,
                          contactByPrincipal.get(String(m.principalText || '')) || null,
                          programProfitCents,
                          canEdit,
                      ),
                  )
                  .join('')
            : '';
    const body =
        applicantBody || teamBody
            ? `${applicantBody}${teamBody}`
            : `<tr><td colspan="${FINANCE_TABLE_COL_COUNT}">${
                  selectedProgramId
                      ? 'No slot-secured applicants or team members for this program.'
                      : 'No slot-secured applicants on active programs. Select a program to manage team.'
              }</td></tr>`;
    return `
        <section class="member-profile-dashboard__card studio-finance-program-table-section">
            <div class="mpd-payments-section-head">
                <h3>Program finance</h3>
                <span class="studio-muted">${escapeHtml(filterLabel)}</span>
            </div>
            <div class="studio-table-wrap studio-table-wrap--sticky-head studio-finance-program-table-scroll">
                <table class="studio-table studio-table--dense studio-finance-program-table">
                    <thead>
                        <tr>
                            <th class="studio-finance-sticky-col studio-finance-sticky-col--first">First</th>
                            <th class="studio-finance-sticky-col studio-finance-sticky-col--second">Last</th>
                            <th>Discipline</th>
                            <th>Price category</th>
                            <th>Deposit</th>
                            <th>Plan</th>
                            <th>Plan price</th>
                            <th>Total payments</th>
                            <th>Payment fees</th>
                            <th>Tickets</th>
                            <th>Local travel</th>
                            <th>Partner 1</th>
                            <th>Partner 2</th>
                            <th>Partner 3</th>
                            <th>Subtotal</th>
                            <th>Remaining</th>
                            <th>Profit</th>
                            <th>Projected payout</th>
                            <th>Email</th>
                        </tr>
                    </thead>
                    <tbody>${body}</tbody>
                </table>
            </div>
        </section>
    `;
}

/**
 * @param {object[]} promotions
 * @param {string | null} selectedProgramId
 * @param {boolean} canEditPromotions
 */
function financeProgramPromotionsHtml(promotions, selectedProgramId, canEditPromotions) {
    if (!selectedProgramId) {
        return `
          <section class="member-profile-dashboard__card studio-finance-program-promotions-section">
            <div class="mpd-payments-section-head">
              <h3>Program promotions</h3>
            </div>
            <p class="studio-muted">Select a program to see linked promotions.</p>
          </section>`;
    }
    const rows = programPromotionsForProgram(promotions, selectedProgramId);
    const totalCents = programPromotionExpenseCents(promotions, selectedProgramId);
    const body =
        rows.length > 0
            ? rows
                  .map((p) => {
                      const dates = [
                          String(p.startIso || '').slice(0, 10),
                          String(p.endIso || '').slice(0, 10),
                      ]
                          .filter(Boolean)
                          .join(' → ');
                      const actions = canEditPromotions
                          ? `<button type="button" class="studio-btn-ghost" data-finance-promo-edit="${escapeHtml(String(p.id || ''))}">Edit</button>
                             <button type="button" class="studio-btn-ghost" data-finance-promo-archive="${escapeHtml(String(p.id || ''))}">Archive</button>`
                          : '<span class="studio-muted">—</span>';
                      return `<tr>
                        <td>${escapeHtml(String(p.name || '—'))}</td>
                        <td>${escapeHtml(String(p.company || '—'))}</td>
                        <td>${escapeHtml(dates || '—')}</td>
                        <td>${escapeHtml(formatUsdFromCents(p.costCents))}</td>
                        <td>${actions}</td>
                      </tr>`;
                  })
                  .join('')
            : '<tr><td colspan="5">No promotions linked to this program.</td></tr>';
    return `
      <section class="member-profile-dashboard__card studio-finance-program-promotions-section">
        <div class="mpd-payments-section-head">
          <h3>Program promotions</h3>
          <span class="studio-muted">Expense total ${escapeHtml(formatUsdFromCents(totalCents))}</span>
        </div>
        <p class="studio-muted mpd-field-hint">Promotion costs for this program are deducted from Total profit on the overview card.</p>
        <div class="studio-table-wrap studio-table-wrap--sticky-head">
          <table class="studio-table studio-table--dense">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Dates</th>
                <th>Cost</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${body}</tbody>
          </table>
        </div>
      </section>`;
}

/**
 * @param {object[]} teamMembers
 * @param {string | null} selectedProgramId
 * @param {Map<string, { firstName: string, lastName: string, fullName: string, email: string }>} contactByPrincipal
 * @param {boolean} canEdit
 */
/**
 * @param {object[]} teamMembers
 * @param {string | null} selectedProgramId
 * @param {Map<string, { firstName: string, lastName: string, fullName: string, email: string }>} contactByPrincipal
 * @param {boolean} canEdit
 * @param {{ programProfitCents?: number, programEnded?: boolean, includeProgramByMemberId?: Map<string, boolean> }} [opts]
 */
function financeDisbursementsHtml(
    teamMembers,
    selectedProgramId,
    contactByPrincipal,
    canEdit,
    opts = {},
) {
    if (!selectedProgramId) {
        return `
          <section class="member-profile-dashboard__card studio-finance-disbursements-section">
            <div class="mpd-payments-section-head">
              <h3>Disbursements</h3>
            </div>
            <p class="studio-muted">Select a program to manage team disbursements.</p>
          </section>`;
    }
    const members = (Array.isArray(teamMembers) ? teamMembers : []).filter(
        (m) => m && String(m.status || 'active') !== 'removed',
    );
    const programProfitCents = Number(opts.programProfitCents) || 0;
    const programEnded = Boolean(opts.programEnded);
    const includeMap = opts.includeProgramByMemberId instanceof Map ? opts.includeProgramByMemberId : new Map();
    const payoutPillClass = programEnded
        ? 'studio-finance-disb-payout-pill studio-finance-disb-payout-pill--complete'
        : 'studio-finance-disb-payout-pill studio-finance-disb-payout-pill--active';
    const addBtn = canEdit
        ? '<button type="button" class="studio-btn-primary" id="studio-finance-team-add">Add team member</button>'
        : '';
    const rows =
        members.length > 0
            ? members
                  .map((m) => {
                      const id = String(m.id || '');
                      const contact = contactByPrincipal.get(String(m.principalText || '')) || null;
                      const fullName =
                          contact?.fullName ||
                          [contact?.firstName, contact?.lastName].filter(Boolean).join(' ').trim();
                      const principalShort = shortPrincipalDisplay(String(m.principalText || ''));
                      const personCell = fullName
                          ? `<span class="studio-finance-disb-person-name">${escapeHtml(fullName)}</span>${
                                contact?.email
                                    ? `<span class="studio-muted studio-finance-disb-person-meta">${escapeHtml(contact.email)}</span>`
                                    : ''
                            }`
                          : `<span class="studio-finance-disb-person-name">${escapeHtml(principalShort)}</span><span class="studio-muted studio-finance-disb-person-meta">Add name in Users → Manage</span>`;
                      const kind = String(m.kind || 'staff');
                      const kindLabel =
                          kind === 'admin'
                              ? 'Admin'
                              : kind === 'collaborator'
                                ? 'Collaborator'
                                : 'Staff';
                      const expenses = teamMemberExpenseSubtotalCents(m);
                      const owed = teamMemberOutstandingOwedCents(m);
                      const paid = sumTeamMemberPaidCents(m);
                      const pct = Math.max(0, Math.min(100, Number(m.payoutPercent) || 0));
                      const isAdmin = kind === 'admin';
                      const grossPayout = computeProjectedPayoutCents(programProfitCents, pct);
                      const programPayout = isAdmin
                          ? computeAdminNetProgramPayoutCents(m, programProfitCents, members)
                          : grossPayout;
                      const staffPaidDeduction = isAdmin
                          ? computeAdminFundedStaffPaidCents(members)
                          : 0;
                      const includeProgram = includeMap.has(id)
                          ? Boolean(includeMap.get(id))
                          : programEnded;
                      const remaining = teamMemberDisbursementRemainingWithProgramCents(m, {
                          includeProgramPayout: includeProgram,
                          programPayoutCents: programPayout,
                      });
                      const owedBtn = canEdit
                          ? `<button type="button" class="studio-finance-money-btn" data-finance-team-disbursement="owed" data-team-member-id="${escapeHtml(id)}">${escapeHtml(formatUsdFromCents(owed))}</button>`
                          : escapeHtml(formatUsdFromCents(owed));
                      const paidBtn = canEdit
                          ? `<button type="button" class="studio-finance-money-btn" data-finance-team-disbursement="paid" data-team-member-id="${escapeHtml(id)}">${escapeHtml(formatUsdFromCents(paid))}</button>`
                          : escapeHtml(formatUsdFromCents(paid));
                      const removeBtn = canEdit
                          ? `<button type="button" class="studio-btn-ghost" data-finance-team-remove="${escapeHtml(id)}">Remove</button>`
                          : '<span class="studio-muted">—</span>';
                      const payoutTitle = isAdmin
                          ? `${pct}% of program profit (${formatUsdFromCents(grossPayout)}) minus ${formatUsdFromCents(staffPaidDeduction)} admin-funded paid to staff`
                          : `${pct}% of program profit`;
                      const payoutPill = isAdmin
                          ? `<button type="button" class="${payoutPillClass} studio-finance-disb-payout-pill--btn" data-finance-admin-payout="${escapeHtml(id)}" title="${escapeHtml(payoutTitle)}">${escapeHtml(formatUsdFromCents(programPayout))} <span class="studio-finance-disb-payout-pct">(${pct}%)</span></button>`
                          : `<span class="${payoutPillClass}" title="${escapeHtml(payoutTitle)}">${escapeHtml(formatUsdFromCents(programPayout))} <span class="studio-finance-disb-payout-pct">(${pct}%)</span></span>`;
                      const includeCb = `<label class="studio-finance-disb-include">
                        <input type="checkbox" data-finance-include-program="${escapeHtml(id)}" ${includeProgram ? 'checked' : ''} ${canEdit ? '' : 'disabled'} />
                        <span class="studio-sr-only">Include program payout</span>
                      </label>`;
                      return `<tr>
                        <td class="studio-finance-disb-person">${personCell}</td>
                        <td>${escapeHtml(kindLabel)}</td>
                        <td>${escapeHtml(formatUsdFromCents(expenses))}</td>
                        <td>${owedBtn}</td>
                        <td>${paidBtn}</td>
                        <td>${payoutPill}</td>
                        <td>${includeCb}</td>
                        <td>${escapeHtml(formatUsdFromCents(remaining))}</td>
                        <td>${removeBtn}</td>
                      </tr>`;
                  })
                  .join('')
            : '<tr><td colspan="9">No team members yet. Use Add team member to assign staff, collaborators, or one admin.</td></tr>';
    return `
      <section class="member-profile-dashboard__card studio-finance-disbursements-section">
        <div class="mpd-payments-section-head">
          <h3>Disbursements</h3>
          ${addBtn}
        </div>
        <p class="studio-muted mpd-field-hint">Owed and paid are line-item ledgers. Amount owed shows the balance after admin-funded payments (program-funded pays do not reduce it). Admin Program Payout is reduced by admin-funded pays and outstanding owed. Check Include Program to add payout into Remaining.</p>
        <div class="studio-table-wrap studio-table-wrap--sticky-head">
          <table class="studio-table studio-table--dense">
            <thead>
              <tr>
                <th>Person</th>
                <th>Role</th>
                <th>Expenses</th>
                <th>Amount owed</th>
                <th>Amount paid</th>
                <th class="studio-finance-disb-payout-th">
                  <span>Program Payout</span>
                  <button type="button" class="studio-finance-disb-info-btn" data-finance-payout-info="1" aria-label="About Program Payout" title="About Program Payout">i</button>
                </th>
                <th>Include Program</th>
                <th>Remaining</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div class="studio-finance-disb-info-popover" id="studio-finance-disb-payout-info" hidden role="dialog" aria-label="Program Payout info">
          <p>Program Payout is an estimate of this person’s share of current program profit (from their payout %). While the program is active, expenses and payments can change, so this amount may go up or down. For the admin, admin-funded paid disbursements and outstanding amounts owed to other staff come out of this payout; payments marked as from the program reduce Total profit instead. Check “Include Program” to add the net estimate into Remaining.</p>
          <button type="button" class="studio-btn-ghost studio-btn-tiny" data-finance-payout-info-close="1">Close</button>
        </div>
      </section>`;
}

/**
 * @param {ReturnType<typeof buildStudioProgramFinanceRows>} rows
 * @param {string | null} selectedProgramId
 * @param {Map<string, ReturnType<typeof buildFinanceProgramCardModel>>} programCardById
 */
function financeProgramRevenueStatHtml(rows, selectedProgramId, programCardById) {
    const { currentRevenueCents, rowCount } = computeFinancePanelTotals(rows);
    let caption = 'All active programs';
    if (selectedProgramId) {
        const card = programCardById.get(selectedProgramId);
        caption = card ? card.title : 'Selected program';
    }
    return `
        <section class="member-profile-dashboard__card studio-finance-revenue-stat-card">
            <div class="mpd-payments-overview-grid studio-finance-revenue-stat-grid">
                <div class="mpd-payments-overview-card">
                    <span>Current revenue</span>
                    <strong>${escapeHtml(formatUsdFromCents(currentRevenueCents))}</strong>
                    <small>${escapeHtml(caption)} · ${rowCount} slot${rowCount === 1 ? '' : 's'}</small>
                </div>
            </div>
        </section>`;
}

/**
 * @param {HTMLElement} mainEl
 */
export async function initFinance(mainEl) {
    const statusEl = mainEl.querySelector('#studio-finance-status');
    const loadingEl = mainEl.querySelector('#studio-finance-loading');
    const emptyEl = mainEl.querySelector('#studio-finance-empty');
    const workspaceEl = mainEl.querySelector('#studio-finance-workspace');
    const overviewSections = mainEl.querySelector('#studio-finance-overview-sections');
    const usersSummary = mainEl.querySelector('#studio-finance-users-summary');
    const usersRevenueStat = mainEl.querySelector('#studio-finance-users-revenue-stat');
    const usersTbody = mainEl.querySelector('#studio-finance-users-tbody');
    const membershipFilter = mainEl.querySelector('#studio-finance-users-membership');
    const usersSearch = mainEl.querySelector('#studio-finance-users-search');
    const chipHint = mainEl.querySelector('#studio-finance-chip-hint');
    const programRevenueStat = mainEl.querySelector('#studio-finance-program-revenue-stat');
    const programCardsUnified = mainEl.querySelector('#studio-finance-program-cards-unified');
    const programTableWrap = mainEl.querySelector('#studio-finance-program-table-wrap');
    const programPromotionsWrap = mainEl.querySelector('#studio-finance-program-promotions-wrap');
    const disbursementsWrap = mainEl.querySelector('#studio-finance-disbursements-wrap');
    const diagnosticsBody = mainEl.querySelector('#studio-finance-diagnostics-body');
    const diagnosticsRefreshBtn = mainEl.querySelector('#studio-finance-diagnostics-refresh');

    const setStatus = (msg) => {
        if (statusEl) statusEl.textContent = msg || '';
    };

    /** @param {boolean} visible */
    const setLoadingVisible = (visible) => {
        if (!loadingEl) return;
        loadingEl.hidden = !visible;
        loadingEl.setAttribute('aria-hidden', visible ? 'false' : 'true');
    };

    const visibleDomains = FINANCE_DOMAINS.filter(domainTabVisible);
    const visibleCategories = studioFinanceVisibleCategories();
    const categoryTabs = visibleDomains.filter(
        (d) => d.tab !== 'overview' && d.tab !== 'diagnostics',
    );

    if (!studioFeatureAccess('finance').visible) {
        setLoadingVisible(false);
        if (emptyEl) emptyEl.hidden = false;
        if (workspaceEl) workspaceEl.hidden = true;
        return;
    }

    setLoadingVisible(true);
    if (emptyEl) emptyEl.hidden = true;
    if (workspaceEl) workspaceEl.hidden = true;

    /** @type {Awaited<ReturnType<typeof getAccountsForStudio>>} */
    let allAccounts = [];
    /** @type {object[]} */
    let allPrograms = [];
    /** @type {object[]} */
    let allApplicants = [];
    /** @type {Map<string, object[]>} */
    let applicantsByProgramId = new Map();
    /** @type {Map<string, ReturnType<typeof buildFinanceProgramCardModel>>} */
    let programCardById = new Map();
    /** @type {string | null} */
    let selectedProgramId = null;
    /** @type {ReturnType<typeof buildProgramPaymentIndex>} */
    let paymentIndex = buildProgramPaymentIndex({});
    /** @type {{ summaries: object[], ledger: object[], plans: object[] }} */
    let financeBundle = { summaries: [], ledger: [], plans: [] };
    /** @type {Map<string, ReturnType<typeof buildStudioProgramFinanceRows>[number]>} */
    let financeRowByApplicantId = new Map();
    /** @type {Map<string, object>} */
    let applicantById = new Map();
    const programsCanEdit = studioFinanceCategoryAccess('Programs').canEdit;
    const promotionsCanEdit = studioFinanceCategoryAccess('Promotions').canEdit;
    /** @type {Map<string, { firstName: string, lastName: string, fullName: string, email: string }>} */
    let contactByPrincipal = new Map();
    /** @type {unknown} */
    let membershipRevenueStripe = { ok: false };
    /** @type {ReturnType<typeof buildMembershipRevenueDashboardModel> | null} */
    let membershipRevenueModel = null;

    const rebuildMembershipRevenueModel = () => {
        allAccounts = mergeStripeSubscriptionTiersIntoAccounts(
            allAccounts,
            membershipRevenueStripe,
        );
        membershipRevenueModel = buildMembershipRevenueDashboardModel(
            allAccounts,
            membershipRevenueStripe,
        );
    };
    /** @type {object[]} */
    let financePromotions = [];
    /** @type {Map<string, object[]>} */
    let teamMembersByProgramId = new Map();
    /** Session UI: teamMemberId → include program payout in Remaining */
    /** @type {Map<string, boolean>} */
    let includeProgramPayoutByMemberId = new Map();

    const loadChipState = () => {
        const defaults = FINANCE_DOMAINS.filter((d) => d.chip && domainTabVisible(d)).map((d) => d.chip);
        try {
            const raw = sessionStorage.getItem(CHIP_STORAGE_KEY);
            if (!raw) return new Set(defaults);
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return new Set(defaults);
            const allowed = new Set(defaults);
            const picked = parsed.filter((x) => allowed.has(String(x)));
            return picked.length ? new Set(picked) : new Set(defaults);
        } catch {
            return new Set(defaults);
        }
    };

    /** @type {Set<string>} */
    let enabledChips = loadChipState();

    const saveChipState = () => {
        try {
            sessionStorage.setItem(CHIP_STORAGE_KEY, JSON.stringify([...enabledChips]));
        } catch {
            /* ignore */
        }
    };

    const syncChipButtons = () => {
        mainEl.querySelectorAll('[data-finance-chip]').forEach((btn) => {
            const chip = btn.getAttribute('data-finance-chip') || '';
            const on = enabledChips.has(chip);
            btn.classList.toggle('is-active', on);
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    };

    /**
     * @param {string} tab
     */
    const setFinanceTab = (tab) => {
        const safe = String(tab || 'overview');
        mainEl.querySelectorAll('[data-finance-tab]').forEach((btn) => {
            const isActive = btn.getAttribute('data-finance-tab') === safe;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
            btn.setAttribute('tabindex', isActive ? '0' : '-1');
        });
        mainEl.querySelectorAll('[data-finance-panel]').forEach((panel) => {
            const show = panel.getAttribute('data-finance-panel') === safe;
            if (show) panel.removeAttribute('hidden');
            else panel.setAttribute('hidden', '');
        });
    };

    const defaultTab = () => {
        if (categoryTabs.length === 1) return categoryTabs[0].tab;
        return 'overview';
    };

    const metricCard = (label, value, caption) => `
        <div class="mpd-payments-overview-card">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(String(value))}</strong>
            <small>${escapeHtml(caption)}</small>
        </div>
    `;

    const comingSoonBlock = (title, blurb) => `
        <div class="studio-finance-category-block" data-finance-category-block="${escapeHtml(title)}">
            <h3>${escapeHtml(title)}</h3>
            <p class="studio-muted">${escapeHtml(blurb)}</p>
            <div class="studio-finance-coming-soon">
                <h4>Coming soon</h4>
                <p class="studio-muted" style="margin:0">Reporting for this category is not available yet.</p>
            </div>
        </div>
    `;

    const renderOverview = () => {
        if (!overviewSections) return;
        const parts = [];
        const m = countMembershipMetrics(allAccounts);

        if (enabledChips.has('programs') && studioFinanceCategoryAccess('Programs').visible) {
            let expectedTotal = 0;
            let claimedTotal = 0;
            for (const card of programCardById.values()) {
                if (card.section !== 'active') continue;
                expectedTotal += Number(card.expectedCents || 0);
                claimedTotal += Number(card.slotsClaimed ?? card.filledSlots ?? 0);
            }
            parts.push(`
                <div class="studio-finance-category-block" data-finance-category-block="Programs">
                    <h3>Programs — deposit-paid</h3>
                    <p class="studio-muted">Expected revenue from applicants who have paid a deposit (not reserved names).</p>
                    <div class="mpd-payments-overview-grid">
                        ${metricCard('Expected revenue', formatUsdFromCents(expectedTotal), `${claimedTotal} slots claimed`)}
                    </div>
                </div>
            `);
        }
        if (enabledChips.has('users') && studioFinanceCategoryAccess('Users').visible) {
            const paying = membershipRevenueModel?.payingMembers ?? m.active;
            parts.push(`
                <div class="studio-finance-category-block" data-finance-category-block="Users">
                    <h3>Users — membership</h3>
                    <p class="studio-muted">Normalized MRR from canister memberships (PayPal + Stripe). ${escapeHtml(String(paying))} paying.</p>
                    ${formatMembershipRevenueDashboardHtml(membershipRevenueModel, escapeHtml, { compact: true })}
                    <div class="mpd-payments-overview-grid">
                        ${metricCard('Active', m.active, 'Active or trialing (canister)')}
                        ${metricCard('Past due', m.pastDue, 'Needs billing attention')}
                        ${metricCard('Exempt', m.exempt, 'Manual complimentary')}
                        ${metricCard('No subscription', m.none, 'No subscription')}
                    </div>
                </div>
            `);
        }
        if (enabledChips.has('products') && studioFinanceCategoryAccess('Products').visible) {
            parts.push(comingSoonBlock('Products', 'Edition checkout and object sales.'));
        }
        if (enabledChips.has('promotions') && studioFinanceCategoryAccess('Promotions').visible) {
            const overall = financePromotions.reduce(
                (sum, p) => sum + Math.max(0, Math.round(Number(p.costCents) || 0)),
                0,
            );
            /** @type {Map<string, number>} */
            const byProgram = new Map();
            for (const p of financePromotions) {
                if (String(p.target || '') !== 'program') continue;
                const pid = String(p.programId || '').trim();
                if (!pid) continue;
                byProgram.set(pid, (byProgram.get(pid) || 0) + Math.max(0, Math.round(Number(p.costCents) || 0)));
            }
            const programCards = [...byProgram.entries()]
                .map(([pid, cents]) => {
                    const title = programCardById.get(pid)?.title || pid;
                    return metricCard(title, formatUsdFromCents(cents), 'Program promotions');
                })
                .join('');
            parts.push(`
                <div class="studio-finance-category-block" data-finance-category-block="Promotions">
                    <h3>Promotions</h3>
                    <p class="studio-muted">Campaign spend. Platform-wide costs count in overall only.</p>
                    <div class="mpd-payments-overview-grid">
                        ${metricCard('Overall promotion cost', formatUsdFromCents(overall), `${financePromotions.length} active`)}
                        ${programCards}
                    </div>
                </div>
            `);
        }

        overviewSections.innerHTML =
            parts.length > 0
                ? parts.join('')
                : '<p class="studio-muted">Turn on at least one category above to see overview metrics.</p>';
    };

    const renderUsersRevenueStat = () => {
        if (!usersRevenueStat) return;
        rebuildMembershipRevenueModel();
        usersRevenueStat.innerHTML = formatMembershipRevenueDashboardHtml(
            membershipRevenueModel,
            escapeHtml,
        );
    };

    const renderUsersSummary = () => {
        if (!usersSummary) return;
        const m = countMembershipMetrics(allAccounts);
        const paying = membershipRevenueModel?.payingMembers ?? m.active;
        usersSummary.innerHTML = `
            <section class="member-profile-dashboard__card">
                <div class="mpd-payments-section-head">
                    <h3>Membership summary</h3>
                    <span class="studio-muted">${m.total} accounts · ${paying} paying (MRR universe)</span>
                </div>
                <div class="mpd-payments-overview-grid">
                    ${metricCard('Active', m.active, 'Active or trialing (same as MRR paying)')}
                    ${metricCard('Past due', m.pastDue, 'Needs billing attention')}
                    ${metricCard('Exempt', m.exempt, 'Manual complimentary — excluded from MRR')}
                    ${metricCard('No subscription', m.none, 'No subscription')}
                </div>
            </section>
        `;
    };

    const renderUsersTable = () => {
        if (!usersTbody) return;
        const wantMembership =
            membershipFilter instanceof HTMLSelectElement ? membershipFilter.value : '';
        const q = (usersSearch instanceof HTMLInputElement ? usersSearch.value : '').trim().toLowerCase();
        const pk = getStripePublishableKeyResolved();

        const rows = allAccounts.filter((r) => {
            if (!studioMembershipFilterMatch(r, wantMembership)) return false;
            if (!q) return true;
            const contact = contactByPrincipal.get(String(r.principal || '')) || null;
            const hay = `${contact?.fullName || ''} ${contact?.email || ''} ${r.principal || ''}`.toLowerCase();
            return hay.includes(q);
        });

        if (!rows.length) {
            usersTbody.innerHTML = `<tr><td colspan="8">${allAccounts.length ? 'No accounts match filters.' : 'No accounts on this canister yet.'}</td></tr>`;
            return;
        }

        usersTbody.innerHTML = rows
            .map((r) => {
                const contact = contactByPrincipal.get(String(r.principal || '')) || null;
                const name = contact?.fullName || [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') || '—';
                const email = contact?.email || '—';
                const renews = formatSubscriptionPeriodEnd(
                    r.stripeCurrentPeriodEnd || r.paypalCurrentPeriodEnd || '',
                );
                const custId = String(r.stripeCustomerId || '').trim();
                const subId = String(r.stripeSubscriptionId || '').trim();
                const paypalId = String(r.paypalSubscriptionId || '').trim();
                const provider = String(r.paymentProvider || '').toLowerCase();
                const custUrl = studioStripeDashboardCustomerUrl(custId, pk);
                let providerCell = '<span class="studio-muted">—</span>';
                if (provider === 'paypal' || paypalId) {
                    providerCell = `<span title="${escapeHtml(paypalId)}">PayPal${paypalId ? ` · ${escapeHtml(paypalId.slice(0, 12))}…` : ''}</span>`;
                } else if (custUrl) {
                    providerCell = `<a class="mpd-membership-text-link" href="${escapeHtml(custUrl)}" target="_blank" rel="noopener noreferrer">Stripe</a>${subId ? ` · <span class="studio-muted" title="${escapeHtml(subId)}">Sub</span>` : ''}`;
                } else if (custId || subId) {
                    providerCell = 'Stripe';
                }
                const membershipLabel = studioMembershipCellLabel(r);
                const tierRaw = studioMembershipTierShortLabel(
                    String(r.membershipTier || r.tier || ''),
                );
                const typeLabel =
                    tierRaw === 'Annual' ? 'Annually' : tierRaw || '—';
                return `<tr>
                    <td>${studioMembershipBadgeHtml(r, escapeHtml)}</td>
                    <td>${escapeHtml(name)}</td>
                    <td>${escapeHtml(email)}</td>
                    <td>${escapeHtml(membershipLabel)}</td>
                    <td>${escapeHtml(typeLabel)}</td>
                    <td><span class="studio-muted" title="${escapeHtml(r.stripeCurrentPeriodEnd || r.paypalCurrentPeriodEnd || '')}">${escapeHtml(renews)}</span></td>
                    <td>${providerCell}</td>
                    <td><span class="studio-identity-short" title="${escapeHtml(r.principal)}">${escapeHtml(shortPrincipalDisplay(r.principal))}</span></td>
                </tr>`;
            })
            .join('');
    };

    const loadSelectedProgramId = () => {
        try {
            const raw = sessionStorage.getItem(PROGRAM_SELECT_STORAGE_KEY);
            return raw && String(raw).trim() ? String(raw).trim() : null;
        } catch {
            return null;
        }
    };

    const saveSelectedProgramId = (id) => {
        try {
            if (id) sessionStorage.setItem(PROGRAM_SELECT_STORAGE_KEY, id);
            else sessionStorage.removeItem(PROGRAM_SELECT_STORAGE_KEY);
        } catch {
            /* ignore */
        }
    };

    const syncProgramCardSelection = () => {
        mainEl.querySelectorAll('[data-finance-program-id]').forEach((btn) => {
            const id = btn.getAttribute('data-finance-program-id') || '';
            const on = id === selectedProgramId;
            btn.classList.toggle('is-selected', on);
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    };

    const getFilteredFinanceRows = () =>
        buildStudioProgramFinanceRows(allApplicants, allPrograms, paymentIndex, {
            filterProgramId: selectedProgramId,
            activeOnly: !selectedProgramId,
        });

    const selectedTeamMembers = () =>
        selectedProgramId ? teamMembersByProgramId.get(selectedProgramId) || [] : [];

    const selectedProgramProfitCents = () => {
        if (!selectedProgramId) return 0;
        const programRow = allPrograms.find((p) => String(p.id || '') === selectedProgramId) || null;
        const applicants = applicantsByProgramId.get(selectedProgramId) || [];
        return computeProgramProfitCents(
            programRow,
            applicants,
            paymentIndex,
            selectedTeamMembers(),
            financePromotions,
        );
    };

    const loadAllProgramTeams = async () => {
        const ids = allPrograms.map((p) => String(p?.id || '').trim()).filter(Boolean);
        const results = await Promise.all(
            ids.map(async (id) => {
                try {
                    const members = await listProgramTeamStudio(id);
                    return /** @type {const} */ ([id, Array.isArray(members) ? members : []]);
                } catch {
                    return /** @type {const} */ ([id, []]);
                }
            }),
        );
        teamMembersByProgramId = new Map(results);
    };

    const refreshSelectedProgramTeam = async () => {
        if (!selectedProgramId) return;
        try {
            const members = await listProgramTeamStudio(selectedProgramId);
            teamMembersByProgramId.set(
                selectedProgramId,
                Array.isArray(members) ? members : [],
            );
        } catch {
            /* keep prior */
        }
    };

    const renderProgramRevenueStat = () => {
        if (!programRevenueStat) return;
        const rows = getFilteredFinanceRows();
        programRevenueStat.innerHTML = financeProgramRevenueStatHtml(
            rows,
            selectedProgramId,
            programCardById,
        );
    };

    const selectedProgramRow = () =>
        selectedProgramId
            ? allPrograms.find((p) => String(p.id || '') === selectedProgramId) || null
            : null;

    const ensureIncludeProgramDefaults = () => {
        const programEnded = isFinanceProgramEnded(selectedProgramRow());
        for (const m of selectedTeamMembers()) {
            const id = String(m?.id || '');
            if (!id || includeProgramPayoutByMemberId.has(id)) continue;
            includeProgramPayoutByMemberId.set(id, programEnded);
        }
    };

    const renderDisbursements = () => {
        if (!disbursementsWrap) return;
        ensureIncludeProgramDefaults();
        disbursementsWrap.innerHTML = financeDisbursementsHtml(
            selectedTeamMembers(),
            selectedProgramId,
            contactByPrincipal,
            programsCanEdit,
            {
                programProfitCents: selectedProgramProfitCents(),
                programEnded: isFinanceProgramEnded(selectedProgramRow()),
                includeProgramByMemberId: includeProgramPayoutByMemberId,
            },
        );
    };

    const renderProgramPromotions = () => {
        if (!programPromotionsWrap) return;
        programPromotionsWrap.innerHTML = financeProgramPromotionsHtml(
            financePromotions,
            selectedProgramId,
            promotionsCanEdit,
        );
    };

    const renderProgramTable = () => {
        if (!programTableWrap) return;
        const rows = getFilteredFinanceRows();
        financeRowByApplicantId = new Map(rows.map((row) => [row.applicantId, row]));
        programTableWrap.innerHTML = financeProgramTableHtml(
            rows,
            selectedProgramId,
            programCardById,
            selectedTeamMembers(),
            contactByPrincipal,
            selectedProgramProfitCents(),
            programsCanEdit,
        );
        renderProgramRevenueStat();
        renderProgramPromotions();
        renderDisbursements();
    };

    const renderDiagnostics = () => {
        if (!diagnosticsBody) return;
        /** @type {Map<string, object>} */
        const programById = new Map();
        for (const p of allPrograms) {
            programById.set(String(p?.id || '').trim(), p);
        }

        const ledger = financeBundle.ledger;
        const summaries = financeBundle.summaries;
        const succeeded = ledger.filter((r) => isLedgerRowSucceeded(r));

        const counts = `
            <div class="mpd-payments-overview-grid" style="margin-bottom:0.9rem">
                ${metricCard('Ledger rows', ledger.length, `${succeeded.length} succeeded`)}
                ${metricCard('Summaries', summaries.length, 'Payment summaries')}
                ${metricCard('Applicants', allApplicants.length, `${applicantById.size} with id`)}
                ${metricCard('Programs', allPrograms.length, 'Loaded programs')}
            </div>`;

        const rowsHtml = ledger.length
            ? ledger
                  .map((row) => {
                      const appId = String(row?.applicationId || '').trim();
                      const applicant = appId ? applicantById.get(appId) : null;
                      const programId = String(
                          applicant?.programId || row?.programId || '',
                      ).trim();
                      const program = programId ? programById.get(programId) : null;
                      const studioStatus = String(program?.studioStatus || '');
                      const programActive =
                          studioStatus === 'active' ||
                          studioStatus === 'open' ||
                          studioStatus === 'full';
                      const isTester = applicant
                          ? getApplicantIsTester(String(applicant.payloadJson || ''))
                          : false;
                      const slotSecured = applicant
                          ? isApplicantSlotSecured(applicant, paymentIndex)
                          : false;
                      const succeededRow = isLedgerRowSucceeded(row);
                      const source = ledgerRowSource(row);

                      /** @type {string[]} */
                      const reasons = [];
                      if (!succeededRow) reasons.push('status not succeeded/paid');
                      if (!applicant) reasons.push('no matching applicant id');
                      if (applicant && !program) reasons.push('program not found');
                      if (applicant && program && !programActive) {
                          reasons.push(`program status "${studioStatus || '—'}" not active`);
                      }
                      if (isTester) reasons.push('applicant flagged as tester');
                      if (applicant && !slotSecured) reasons.push('applicant not slot-secured');
                      const wouldShow = reasons.length === 0;

                      const statusPill = wouldShow
                          ? '<span class="mpd-payments-pill mpd-payments-pill--paid">Shows</span>'
                          : `<span class="mpd-payments-pill mpd-payments-pill--muted" title="${escapeHtml(reasons.join('; '))}">Hidden</span>`;
                      const rowId = String(row?.id || '');
                      const assignBtn = programsCanEdit && rowId
                          ? `<button type="button" class="studio-btn-ghost" data-finance-assign-row="${escapeHtml(rowId)}">Assign…</button>`
                          : '<span class="studio-muted">—</span>';
                      return `<tr>
                        <td>${escapeHtml(source)}</td>
                        <td>${escapeHtml(String(row?.paymentType || '—'))}</td>
                        <td>${escapeHtml(String(row?.status || '—'))}</td>
                        <td>${escapeHtml(formatUsdFromCents(row?.amountCents))}</td>
                        <td><code>${escapeHtml(appId || '—')}</code></td>
                        <td>${escapeHtml(programId || '—')}${program ? '' : ' <span class="studio-muted">(no program)</span>'}</td>
                        <td>${applicant ? 'Yes' : '<span class="studio-muted">No</span>'}</td>
                        <td>${statusPill}${wouldShow ? '' : `<div class="studio-muted" style="font-size:0.8em;margin-top:2px">${escapeHtml(reasons.join('; '))}</div>`}</td>
                        <td>${assignBtn}</td>
                      </tr>`;
                  })
                  .join('')
            : '<tr><td colspan="9">No ledger rows recorded on the canister.</td></tr>';

        const rawJson = escapeHtml(JSON.stringify(financeBundle, null, 2));

        diagnosticsBody.innerHTML = `
            ${counts}
            <div class="studio-table-wrap studio-table-wrap--sticky-head">
                <table class="studio-table studio-table--dense">
                    <thead>
                        <tr>
                            <th>Source</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Amount</th>
                            <th>Application ID</th>
                            <th>Program</th>
                            <th>Applicant?</th>
                            <th>In Programs table?</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
            <details style="margin-top:1rem">
                <summary class="studio-muted" style="cursor:pointer">Raw finance bundle JSON</summary>
                <pre style="max-height:360px;overflow:auto;background:rgba(0,0,0,0.25);padding:0.75rem;border-radius:8px;font-size:0.78rem;white-space:pre-wrap;word-break:break-word">${rawJson}</pre>
            </details>
        `;
    };

    const renderPromotions = () => {
        const overviewEl = mainEl.querySelector('#studio-finance-promotions-overview');
        const tbody = mainEl.querySelector('#studio-finance-promotions-tbody');
        const overall = financePromotions.reduce(
            (sum, p) => sum + Math.max(0, Math.round(Number(p.costCents) || 0)),
            0,
        );
        /** @type {Map<string, number>} */
        const byProgram = new Map();
        for (const p of financePromotions) {
            if (String(p.target || '') !== 'program') continue;
            const pid = String(p.programId || '').trim();
            if (!pid) continue;
            byProgram.set(pid, (byProgram.get(pid) || 0) + Math.max(0, Math.round(Number(p.costCents) || 0)));
        }
        if (overviewEl) {
            const cards = [
                metricCard('Overall', formatUsdFromCents(overall), `${financePromotions.length} promotions`),
                ...[...byProgram.entries()].map(([pid, cents]) =>
                    metricCard(
                        programCardById.get(pid)?.title || pid,
                        formatUsdFromCents(cents),
                        'Program total',
                    ),
                ),
            ];
            overviewEl.innerHTML = cards.join('');
        }
        if (!tbody) return;
        if (!financePromotions.length) {
            tbody.innerHTML = '<tr><td colspan="6">No promotions yet. Click Add promotion.</td></tr>';
            return;
        }
        tbody.innerHTML = financePromotions
            .map((p) => {
                const target =
                    String(p.target || '') === 'program'
                        ? programCardById.get(String(p.programId || ''))?.title ||
                          String(p.programId || 'Program')
                        : 'Platform';
                const dates = [String(p.startIso || '').slice(0, 10), String(p.endIso || '').slice(0, 10)]
                    .filter(Boolean)
                    .join(' → ');
                const actions = promotionsCanEdit
                    ? `<button type="button" class="studio-btn-ghost" data-finance-promo-edit="${escapeHtml(String(p.id || ''))}">Edit</button>
                       <button type="button" class="studio-btn-ghost" data-finance-promo-archive="${escapeHtml(String(p.id || ''))}">Archive</button>`
                    : '—';
                return `<tr>
                    <td>${escapeHtml(String(p.name || ''))}</td>
                    <td>${escapeHtml(String(p.company || '—'))}</td>
                    <td>${escapeHtml(dates || '—')}</td>
                    <td>${escapeHtml(target)}</td>
                    <td>${escapeHtml(formatUsdFromCents(p.costCents))}</td>
                    <td>${actions}</td>
                </tr>`;
            })
            .join('');
    };

    /**
     * @param {object | null} [existing]
     */
    const openPromotionModal = (existing = null) => {
        const programOptions = allPrograms
            .map((p) => {
                const id = String(p.id || '');
                const sel = existing && String(existing.programId || '') === id ? 'selected' : '';
                return `<option value="${escapeHtml(id)}" ${sel}>${escapeHtml(getProgramDisplayNameFromRow(p))}</option>`;
            })
            .join('');
        const target = existing ? String(existing.target || 'platform') : 'platform';
        const body = `
          <form class="studio-modal-form" id="studio-finance-promo-form">
            <label class="studio-field"><span>Promotion name</span>
              <input class="studio-input" id="studio-finance-promo-name" required value="${escapeHtml(String(existing?.name || ''))}" />
            </label>
            <label class="studio-field"><span>Company</span>
              <input class="studio-input" id="studio-finance-promo-company" value="${escapeHtml(String(existing?.company || ''))}" />
            </label>
            <div class="studio-modal-fields-row">
              <label class="studio-field"><span>Start date</span>
                <input class="studio-input" type="date" id="studio-finance-promo-start" value="${escapeHtml(String(existing?.startIso || '').slice(0, 10))}" />
              </label>
              <label class="studio-field"><span>End date</span>
                <input class="studio-input" type="date" id="studio-finance-promo-end" value="${escapeHtml(String(existing?.endIso || '').slice(0, 10))}" />
              </label>
            </div>
            <label class="studio-field"><span>Target</span>
              <select class="studio-select" id="studio-finance-promo-target">
                <option value="platform" ${target === 'platform' ? 'selected' : ''}>Platform-wide</option>
                <option value="program" ${target === 'program' ? 'selected' : ''}>Specific program</option>
              </select>
            </label>
            <label class="studio-field" id="studio-finance-promo-program-wrap" ${target === 'program' ? '' : 'hidden'}><span>Program</span>
              <select class="studio-select" id="studio-finance-promo-program">${programOptions}</select>
            </label>
            <label class="studio-field"><span>Cost (USD)</span>
              <input class="studio-input" id="studio-finance-promo-cost" inputmode="decimal" required value="${escapeHtml(existing ? (Number(existing.costCents || 0) / 100).toFixed(2) : '')}" />
            </label>
            <div class="studio-modal-actions">
              <button type="submit" class="studio-btn-primary">Save promotion</button>
              <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Cancel</button>
            </div>
            <p class="studio-muted" id="studio-finance-promo-status" role="status"></p>
          </form>`;
        const { close, root } = openStudioModal(body, {
            title: existing ? 'Edit promotion' : 'Add promotion',
            wide: true,
        });
        const targetSel = root.querySelector('#studio-finance-promo-target');
        const programWrap = root.querySelector('#studio-finance-promo-program-wrap');
        targetSel?.addEventListener('change', () => {
            if (programWrap instanceof HTMLElement) {
                programWrap.hidden = !(
                    targetSel instanceof HTMLSelectElement && targetSel.value === 'program'
                );
            }
        });
        root.querySelector('#studio-finance-promo-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const statusEl = root.querySelector('#studio-finance-promo-status');
            const name =
                /** @type {HTMLInputElement|null} */ (root.querySelector('#studio-finance-promo-name'))
                    ?.value.trim() || '';
            const company =
                /** @type {HTMLInputElement|null} */ (root.querySelector('#studio-finance-promo-company'))
                    ?.value.trim() || '';
            const startIso =
                /** @type {HTMLInputElement|null} */ (root.querySelector('#studio-finance-promo-start'))
                    ?.value || '';
            const endIso =
                /** @type {HTMLInputElement|null} */ (root.querySelector('#studio-finance-promo-end'))
                    ?.value || '';
            const t =
                /** @type {HTMLSelectElement|null} */ (root.querySelector('#studio-finance-promo-target'))
                    ?.value || 'platform';
            const programId =
                /** @type {HTMLSelectElement|null} */ (root.querySelector('#studio-finance-promo-program'))
                    ?.value || '';
            const costCents = parseUsdInputToCents(
                /** @type {HTMLInputElement|null} */ (root.querySelector('#studio-finance-promo-cost'))
                    ?.value || '',
            );
            if (endIso && startIso && endIso < startIso) {
                if (statusEl) statusEl.textContent = 'End date must be on or after start date.';
                return;
            }
            if (t === 'program' && !programId) {
                if (statusEl) statusEl.textContent = 'Select a program.';
                return;
            }
            if (statusEl) statusEl.textContent = 'Saving…';
            try {
                await upsertFinancePromotionStudio({
                    id: existing ? String(existing.id || '') : '',
                    name,
                    company,
                    startIso,
                    endIso,
                    target: t === 'program' ? 'program' : 'platform',
                    programId,
                    costCents,
                });
                financePromotions = await listFinancePromotionsStudio();
                renderPromotions();
                renderProgramCards();
                renderOverview();
                close();
            } catch (err) {
                if (statusEl) statusEl.textContent = err instanceof Error ? err.message : String(err);
            }
        });
    };

    const reloadAllFinanceData = async () => {
        const [applicants, bundle, promos] = await Promise.all([
            getApplicants(),
            getStaffProgramPaymentsFinanceStudio(),
            listFinancePromotionsStudio().catch(() => []),
        ]);
        allApplicants = Array.isArray(applicants) ? applicants : [];
        financeBundle = normalizeFinanceBundle(bundle);
        paymentIndex = buildProgramPaymentIndex(bundle);
        financePromotions = Array.isArray(promos) ? promos : [];
        applicantsByProgramId = new Map();
        applicantById = new Map();
        for (const applicant of allApplicants) {
            const id = String(applicant?.id || '').trim();
            if (id) applicantById.set(id, applicant);
            const programId = String(applicant?.programId || '').trim();
            if (!programId) continue;
            if (!applicantsByProgramId.has(programId)) {
                applicantsByProgramId.set(programId, []);
            }
            applicantsByProgramId.get(programId).push(applicant);
        }
        await loadAllProgramTeams();
        renderProgramCards();
        renderDiagnostics();
        renderPromotions();
        renderOverview();
    };

    const reloadFinancePayments = async () => {
        const bundle = await getStaffProgramPaymentsFinanceStudio();
        financeBundle = normalizeFinanceBundle(bundle);
        paymentIndex = buildProgramPaymentIndex(bundle);
        await loadAllProgramTeams();
        renderProgramCards();
        renderDiagnostics();
        renderOverview();
    };

    const reloadApplicantsAndFinance = async () => {
        await reloadAllFinanceData();
    };

    /**
     * @param {string} applicantId
     * @param {'payments' | 'fees' | 'travel' | 'tickets'} mode
     */
    const openFinanceLedgerModal = (applicantId, mode) => {
        const row = financeRowByApplicantId.get(applicantId);
        if (!row) return;
        const applicant = applicantById.get(applicantId);
        const titleByMode = {
            payments: `Total payments — ${row.firstName} ${row.lastName}`.trim(),
            fees: `Payment fees — ${row.firstName} ${row.lastName}`.trim(),
            travel: `Local travel — ${row.firstName} ${row.lastName}`.trim(),
            tickets: `Tickets — ${row.firstName} ${row.lastName}`.trim(),
        };
        const title = titleByMode[mode] || 'Finance detail';

        if (mode === 'tickets') {
            const flightUsd = (row.ticketsCents / 100).toFixed(2);
            const ownFlightChecked = row.ownFlight ? 'checked' : '';
            const ownFlightDisabled = programsCanEdit ? '' : 'disabled';
            const amountDisabled = programsCanEdit ? '' : 'disabled';
            const editForm = `<form class="studio-finance-ledger-add" id="studio-finance-tickets-form">
                    <h4 class="studio-subheading">Flight / ticket cost</h4>
                    <label class="studio-field studio-field--inline-check">
                        <input type="checkbox" class="studio-checkbox" id="studio-finance-tickets-own-flight" ${ownFlightChecked} ${ownFlightDisabled} />
                        <span>Own flight ($800 credit)</span>
                    </label>
                    <p class="studio-muted mpd-field-hint">Same preference as Settings → Payments and Applicants → Own flight. Changing it updates the $800 price credit for everyone.</p>
                    <label class="studio-field"><span>Amount (USD)</span>
                        <input type="text" class="studio-input" id="studio-finance-tickets-amount" inputmode="decimal" placeholder="0.00" value="${escapeHtml(flightUsd === '0.00' ? '' : flightUsd)}" ${amountDisabled} />
                    </label>
                    <div class="studio-modal-actions">
                        ${
                            programsCanEdit
                                ? '<button type="submit" class="studio-btn-primary">Save</button>'
                                : ''
                        }
                        <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Close</button>
                    </div>
                    <p class="studio-muted mpd-field-hint" id="studio-finance-ledger-status" role="status"></p>
                </form>`;
            const inner = `<div class="studio-finance-ledger-modal">${editForm}</div>`;
            const { close, root } = openStudioModal(inner, { title, wide: true });
            const form = root.querySelector('#studio-finance-tickets-form');
            if (!(form instanceof HTMLFormElement) || !applicant || !programsCanEdit) return;
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const statusEl = root.querySelector('#studio-finance-ledger-status');
                const amountInput = root.querySelector('#studio-finance-tickets-amount');
                const ownFlightInput = root.querySelector('#studio-finance-tickets-own-flight');
                const flightCostCents = parseUsdInputToCents(
                    amountInput instanceof HTMLInputElement ? amountInput.value : '',
                );
                const nextOwnFlight =
                    ownFlightInput instanceof HTMLInputElement ? ownFlightInput.checked : false;
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
                if (statusEl) statusEl.textContent = 'Saving…';
                try {
                    const payloadJson = mergeApplicantStaffFields(
                        staffFieldsFromPayload(row.payloadJson, { flightCostCents }),
                        row.payloadJson,
                    );
                    await upsertApplicantStudio({ ...applicant, payloadJson });
                    // Always persist — do not skip when row.ownFlight is stale/false.
                    await staffSetProgramPaymentFlightPreferenceStudio({
                        applicantId: row.applicantId,
                        ownFlight: nextOwnFlight,
                    });
                    close();
                    await reloadApplicantsAndFinance();
                } catch (err) {
                    if (statusEl) {
                        statusEl.textContent = err instanceof Error ? err.message : String(err);
                    }
                    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
                }
            });
            return;
        }

        const isPayments = mode === 'payments';
        const isTravel = mode === 'travel';
        const ledgerRows = isPayments
            ? row.ledger.filter((entry) => {
                  if (isLedgerPaymentRow(entry)) return true;
                  return (
                      ledgerRowSource(entry) === 'staff' &&
                      String(entry?.status || '').toLowerCase() === 'voided'
                  );
              })
            : isTravel
              ? row.ledger.filter(
                    (entry) =>
                        isLedgerRowSucceeded(entry) &&
                        String(entry?.paymentType || '') === 'staff_travel',
                )
              : row.ledger.filter(
                    (entry) =>
                        isLedgerRowSucceeded(entry) &&
                        Number(entry.feeCents || 0) > 0 &&
                        String(entry?.paymentType || '') !== 'staff_travel',
                );
        const ledgerTable =
            ledgerRows.length > 0
                ? ledgerRows
                      .map((entry) => {
                          const src = ledgerRowSource(entry);
                          const voided = String(entry?.status || '').toLowerCase() === 'voided';
                          const badge =
                              src === 'staff'
                                  ? `<span class="studio-finance-ledger-badge studio-finance-ledger-badge--staff">${voided ? 'Staff · voided' : 'Staff'}</span>`
                                  : src === 'paypal'
                                    ? '<span class="studio-finance-ledger-badge studio-finance-ledger-badge--paypal">PayPal</span>'
                                    : '<span class="studio-finance-ledger-badge studio-finance-ledger-badge--stripe">Stripe</span>';
                          const date = String(entry.createdAt || '').slice(0, 10) || '—';
                          const note = String(entry.staffNote || '').trim();
                          const amountCell = isPayments
                              ? formatUsdFromCents(entry.amountCents)
                              : formatUsdFromCents(entry.feeCents);
                          const canEditStaff =
                              programsCanEdit &&
                              isPayments &&
                              src === 'staff' &&
                              !voided;
                          const actions = canEditStaff
                              ? `<button type="button" class="studio-btn-ghost" data-finance-ledger-edit="${escapeHtml(String(entry.id || ''))}">Edit</button>
                                 <button type="button" class="studio-btn-ghost" data-finance-ledger-void="${escapeHtml(String(entry.id || ''))}">Void</button>`
                              : '—';
                          return `<tr class="${voided ? 'studio-muted' : ''}">
                            <td>${badge}</td>
                            <td>${escapeHtml(ledgerRowTypeLabel(entry))}</td>
                            <td>${escapeHtml(amountCell)}</td>
                            <td>${escapeHtml(date)}</td>
                            <td>${note ? escapeHtml(note) : '—'}</td>
                            <td>${actions}</td>
                          </tr>`;
                      })
                      .join('')
                : `<tr><td colspan="6">${isPayments ? 'No payment rows yet.' : isTravel ? 'No travel fee rows yet.' : 'No fee rows yet.'}</td></tr>`;
        const amountHeader = isPayments ? 'Amount' : 'Fee';
        let addForm = '';
        if (programsCanEdit) {
            if (isPayments) {
                addForm = `<form class="studio-finance-ledger-add" id="studio-finance-ledger-add-form">
                    <h4 class="studio-subheading" id="studio-finance-ledger-form-title">Add manual payment</h4>
                    <p class="studio-muted mpd-field-hint">PayPal payments appear after capture. Use Refresh payments or Diagnostics → Assign if a payment is missing.</p>
                    <input type="hidden" id="studio-finance-ledger-edit-id" value="" />
                    <div class="studio-modal-fields-row">
                        <label class="studio-field"><span>Amount (USD)</span>
                            <input type="text" class="studio-input" id="studio-finance-ledger-amount" inputmode="decimal" placeholder="0.00" required />
                        </label>
                        <label class="studio-field"><span>Fee (USD, optional)</span>
                            <input type="text" class="studio-input" id="studio-finance-ledger-fee" inputmode="decimal" placeholder="0.00" />
                        </label>
                    </div>
                    <label class="studio-field studio-field--full"><span>Note (optional)</span>
                        <input type="text" class="studio-input" id="studio-finance-ledger-note" placeholder="Wire transfer ref…" />
                    </label>
                    <div class="studio-modal-actions">
                        <button type="submit" class="studio-btn-primary" id="studio-finance-ledger-submit">Save payment</button>
                        <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Close</button>
                    </div>
                    <p class="studio-muted mpd-field-hint" id="studio-finance-ledger-status" role="status"></p>
                </form>`;
            } else if (isTravel) {
                const travelUsd = (row.localTravelPayloadCents / 100).toFixed(2);
                addForm = `<form class="studio-finance-ledger-add" id="studio-finance-ledger-add-form">
                    <h4 class="studio-subheading">Planned local travel (payload)</h4>
                    <label class="studio-field"><span>Planned amount (USD)</span>
                        <input type="text" class="studio-input" id="studio-finance-travel-planned" inputmode="decimal" placeholder="0.00" value="${escapeHtml(travelUsd === '0.00' ? '' : travelUsd)}" />
                    </label>
                    <h4 class="studio-subheading">Add travel fee (ledger)</h4>
                    <div class="studio-modal-fields-row">
                        <label class="studio-field"><span>Travel fee (USD)</span>
                            <input type="text" class="studio-input" id="studio-finance-ledger-fee" inputmode="decimal" placeholder="0.00" />
                        </label>
                    </div>
                    <label class="studio-field studio-field--full"><span>Note (optional)</span>
                        <input type="text" class="studio-input" id="studio-finance-ledger-note" placeholder="Taxi, transit pass…" />
                    </label>
                    <div class="studio-modal-actions">
                        <button type="submit" class="studio-btn-primary">Save</button>
                        <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Close</button>
                    </div>
                    <p class="studio-muted mpd-field-hint" id="studio-finance-ledger-status" role="status"></p>
                </form>`;
            } else {
                addForm = `<form class="studio-finance-ledger-add" id="studio-finance-ledger-add-form">
                    <h4 class="studio-subheading">Add manual fee</h4>
                    <div class="studio-modal-fields-row">
                        <label class="studio-field"><span>Fee (USD)</span>
                            <input type="text" class="studio-input" id="studio-finance-ledger-fee" inputmode="decimal" placeholder="0.00" required />
                        </label>
                    </div>
                    <label class="studio-field studio-field--full"><span>Note (optional)</span>
                        <input type="text" class="studio-input" id="studio-finance-ledger-note" placeholder="Processing fee…" />
                    </label>
                    <div class="studio-modal-actions">
                        <button type="submit" class="studio-btn-primary">Save fee</button>
                        <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Close</button>
                    </div>
                    <p class="studio-muted mpd-field-hint" id="studio-finance-ledger-status" role="status"></p>
                </form>`;
            }
        }
        const inner = `
            <div class="studio-finance-ledger-modal">
                <div class="studio-table-wrap">
                    <table class="studio-table studio-table--dense">
                        <thead>
                            <tr>
                                <th>Source</th>
                                <th>Type</th>
                                <th>${escapeHtml(amountHeader)}</th>
                                <th>Date</th>
                                <th>Note</th>
                                ${isPayments ? '<th>Actions</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>${ledgerTable}</tbody>
                    </table>
                </div>
                ${addForm}
            </div>`;
        const { close, root } = openStudioModal(inner, { title, wide: true });
        const form = root.querySelector('#studio-finance-ledger-add-form');
        if (!(form instanceof HTMLFormElement)) return;

        const fillEditForm = (entry) => {
            const editId = root.querySelector('#studio-finance-ledger-edit-id');
            const amountInput = root.querySelector('#studio-finance-ledger-amount');
            const feeInput = root.querySelector('#studio-finance-ledger-fee');
            const noteInput = root.querySelector('#studio-finance-ledger-note');
            const titleEl = root.querySelector('#studio-finance-ledger-form-title');
            const submitBtn = root.querySelector('#studio-finance-ledger-submit');
            if (editId instanceof HTMLInputElement) editId.value = String(entry.id || '');
            if (amountInput instanceof HTMLInputElement) {
                amountInput.value = (Number(entry.amountCents || 0) / 100).toFixed(2);
            }
            if (feeInput instanceof HTMLInputElement) {
                const fee = Number(entry.feeCents || 0);
                feeInput.value = fee > 0 ? (fee / 100).toFixed(2) : '';
            }
            if (noteInput instanceof HTMLInputElement) {
                noteInput.value = String(entry.staffNote || '').replace(/\s*\[edited\]\s*$/i, '');
            }
            if (titleEl) titleEl.textContent = 'Edit manual payment';
            if (submitBtn) submitBtn.textContent = 'Update payment';
        };

        root.addEventListener('click', async (ev) => {
            const editBtn =
                ev.target instanceof Element ? ev.target.closest('[data-finance-ledger-edit]') : null;
            if (editBtn) {
                const id = editBtn.getAttribute('data-finance-ledger-edit');
                const entry = row.ledger.find((e) => String(e?.id || '') === id);
                if (entry) fillEditForm(entry);
                return;
            }
            const voidBtn =
                ev.target instanceof Element ? ev.target.closest('[data-finance-ledger-void]') : null;
            if (voidBtn && programsCanEdit) {
                const id = voidBtn.getAttribute('data-finance-ledger-void');
                if (!id || !confirm('Void this staff payment? It will no longer count toward totals.')) {
                    return;
                }
                const entry = row.ledger.find((e) => String(e?.id || '') === id);
                try {
                    await updateStaffManualProgramLedgerStudio({
                        paymentId: id,
                        amountCents: Number(entry?.amountCents || 0),
                        feeCents: Number(entry?.feeCents || 0),
                        staffNote: String(entry?.staffNote || ''),
                        status: 'voided',
                    });
                    close();
                    await reloadFinancePayments();
                } catch (err) {
                    alert(err instanceof Error ? err.message : String(err));
                }
            }
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const statusEl = root.querySelector('#studio-finance-ledger-status');
            const noteInput = root.querySelector('#studio-finance-ledger-note');
            const staffNote =
                noteInput instanceof HTMLInputElement ? noteInput.value.trim() : '';
            let amountCents = 0;
            let feeCents = 0;
            if (isPayments) {
                const amountInput = root.querySelector('#studio-finance-ledger-amount');
                const feeInput = root.querySelector('#studio-finance-ledger-fee');
                const editIdInput = root.querySelector('#studio-finance-ledger-edit-id');
                const editId =
                    editIdInput instanceof HTMLInputElement ? editIdInput.value.trim() : '';
                amountCents = parseUsdInputToCents(
                    amountInput instanceof HTMLInputElement ? amountInput.value : '',
                );
                feeCents = parseUsdInputToCents(
                    feeInput instanceof HTMLInputElement ? feeInput.value : '',
                );
                if (amountCents <= 0) {
                    if (statusEl) statusEl.textContent = 'Enter a payment amount.';
                    return;
                }
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
                if (statusEl) statusEl.textContent = 'Saving…';
                try {
                    if (editId) {
                        await updateStaffManualProgramLedgerStudio({
                            paymentId: editId,
                            amountCents,
                            feeCents,
                            staffNote,
                            status: 'succeeded',
                        });
                    } else {
                        await recordStaffManualProgramLedgerStudio({
                            applicantId,
                            programId: row.programId,
                            amountCents,
                            feeCents,
                            staffNote,
                        });
                    }
                    close();
                    await reloadFinancePayments();
                } catch (err) {
                    if (statusEl) {
                        statusEl.textContent = err instanceof Error ? err.message : String(err);
                    }
                    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
                }
                return;
            } else if (isTravel) {
                const plannedInput = root.querySelector('#studio-finance-travel-planned');
                const feeInput = root.querySelector('#studio-finance-ledger-fee');
                const localTravelCostCents = parseUsdInputToCents(
                    plannedInput instanceof HTMLInputElement ? plannedInput.value : '',
                );
                feeCents = parseUsdInputToCents(
                    feeInput instanceof HTMLInputElement ? feeInput.value : '',
                );
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
                if (statusEl) statusEl.textContent = 'Saving…';
                try {
                    let saved = false;
                    if (applicant) {
                        const payloadJson = mergeApplicantStaffFields(
                            staffFieldsFromPayload(row.payloadJson, { localTravelCostCents }),
                            row.payloadJson,
                        );
                        await upsertApplicantStudio({ ...applicant, payloadJson });
                        saved = true;
                    }
                    if (feeCents > 0) {
                        await recordStaffManualProgramLedgerStudio({
                            applicantId: row.applicantId,
                            programId: row.programId,
                            amountCents: 0,
                            feeCents,
                            staffNote,
                            entryKind: 'travel',
                        });
                        saved = true;
                    }
                    if (!saved) {
                        if (statusEl) statusEl.textContent = 'Enter a travel fee or planned amount.';
                        if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
                        return;
                    }
                    close();
                    await reloadAllFinanceData();
                } catch (err) {
                    if (statusEl) {
                        statusEl.textContent = err instanceof Error ? err.message : String(err);
                    }
                    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
                }
                return;
            } else {
                const feeInput = root.querySelector('#studio-finance-ledger-fee');
                feeCents = parseUsdInputToCents(
                    feeInput instanceof HTMLInputElement ? feeInput.value : '',
                );
                if (feeCents <= 0) {
                    if (statusEl) statusEl.textContent = 'Enter a fee amount.';
                    return;
                }
            }
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
            if (statusEl) statusEl.textContent = 'Saving…';
            try {
                await recordStaffManualProgramLedgerStudio({
                    applicantId: row.applicantId,
                    programId: row.programId,
                    amountCents,
                    feeCents,
                    staffNote,
                    entryKind: isTravel ? 'travel' : 'fee',
                });
                close();
                await reloadAllFinanceData();
            } catch (err) {
                if (statusEl) {
                    statusEl.textContent = err instanceof Error ? err.message : String(err);
                }
                if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
            }
        });
    };

    /**
     * Re-import a completed PayPal program payment (order/capture id) onto the Motoko ledger.
     * @param {{ applicantId?: string }} [opts]
     */
    const openSyncPaymentsModal = (opts = {}) => {
        /** @type {Map<string, object>} */
        const programById = new Map();
        for (const p of allPrograms) programById.set(String(p?.id || '').trim(), p);

        const options = [...allApplicants]
            .map((applicant) => {
                const id = String(applicant?.id || '').trim();
                const programId = String(applicant?.programId || '').trim();
                const names = applicantDisplayNamesFromPayload(
                    String(applicant?.payloadJson || ''),
                    String(applicant?.fullName || ''),
                );
                const program = programById.get(programId) || null;
                const programLabel = program
                    ? getProgramDisplayNameFromRow(program)
                    : programId || '—';
                const name = `${names.firstName} ${names.lastName}`.trim() || id;
                const email = String(applicant?.email || '').trim();
                return {
                    id,
                    programId,
                    email,
                    label: `${name}${email ? ` · ${email}` : ''} — ${programLabel}`,
                };
            })
            .filter((o) => o.id)
            .sort((a, b) => a.label.localeCompare(b.label));

        const preselect = String(opts.applicantId || '').trim();
        const optionsHtml = options
            .map(
                (o) =>
                    `<option value="${escapeHtml(o.id)}" data-program-id="${escapeHtml(o.programId)}" data-email="${escapeHtml(o.email)}" ${o.id === preselect ? 'selected' : ''}>${escapeHtml(o.label)}</option>`,
            )
            .join('');

        const resolvePrincipalForApplicant = (applicantId) => {
            const appId = String(applicantId || '').trim();
            if (!appId) return '';
            const summary = (financeBundle.summaries || []).find(
                (s) => String(s?.applicationId || '') === appId,
            );
            if (summary?.principal) return String(summary.principal).trim();
            const ledgerHit = (financeBundle.ledger || []).find(
                (r) => String(r?.applicationId || '') === appId && r?.principal,
            );
            if (ledgerHit?.principal) return String(ledgerHit.principal).trim();
            const applicant = applicantById.get(appId);
            const email = String(applicant?.email || '')
                .trim()
                .toLowerCase();
            if (email) {
                for (const [principal, contact] of contactByPrincipal.entries()) {
                    if (String(contact?.email || '').trim().toLowerCase() === email) {
                        return String(principal).trim();
                    }
                }
                for (const acc of allAccounts) {
                    const p = String(acc?.principal || '').trim();
                    const contact = contactByPrincipal.get(p);
                    if (String(contact?.email || '').trim().toLowerCase() === email) return p;
                }
            }
            return '';
        };

        const inner = `
            <div class="studio-finance-ledger-modal">
                <p class="studio-muted">Re-import a <strong>completed</strong> PayPal program payment by order or capture ID. This writes the Motoko ledger/summary so the payment can appear in Finance and Applicants. Does <strong>not</strong> sync Stripe membership subscriptions.</p>
                <form id="studio-finance-sync-form">
                    <label class="studio-field studio-field--full"><span>Applicant</span>
                        <select class="studio-select" id="studio-finance-sync-applicant" required>
                            <option value="" disabled ${preselect ? '' : 'selected'}>Select an applicant…</option>
                            ${optionsHtml}
                        </select>
                    </label>
                    <label class="studio-field studio-field--full"><span>Member principal</span>
                        <input type="text" class="studio-input" id="studio-finance-sync-principal" required placeholder="aaaaa-…" autocomplete="off" />
                    </label>
                    <label class="studio-field"><span>Payment type</span>
                        <select class="studio-select" id="studio-finance-sync-type">
                            <option value="deposit">Deposit</option>
                            <option value="full_payment">Full payment</option>
                            <option value="manual" selected>Manual</option>
                            <option value="program_award_entry">Program Award entry ($50)</option>
                        </select>
                    </label>
                    <label class="studio-field studio-field--full"><span>PayPal order ID</span>
                        <input type="text" class="studio-input" id="studio-finance-sync-order" placeholder="Optional if capture ID is set" autocomplete="off" />
                    </label>
                    <label class="studio-field studio-field--full"><span>PayPal capture / transaction ID</span>
                        <input type="text" class="studio-input" id="studio-finance-sync-capture" placeholder="Optional if order ID is set" autocomplete="off" />
                    </label>
                    <div class="studio-modal-actions">
                        <button type="submit" class="studio-btn-primary">Sync payment</button>
                        <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Cancel</button>
                    </div>
                    <p class="studio-muted mpd-field-hint" id="studio-finance-sync-status" role="status"></p>
                </form>
            </div>`;
        const { close, root } = openStudioModal(inner, {
            title: 'Sync PayPal payment',
            wide: true,
        });
        const form = root.querySelector('#studio-finance-sync-form');
        const applicantSelect = root.querySelector('#studio-finance-sync-applicant');
        const principalInput = root.querySelector('#studio-finance-sync-principal');
        const fillPrincipal = () => {
            if (!(applicantSelect instanceof HTMLSelectElement)) return;
            if (!(principalInput instanceof HTMLInputElement)) return;
            const resolved = resolvePrincipalForApplicant(applicantSelect.value);
            if (resolved) principalInput.value = resolved;
        };
        applicantSelect?.addEventListener('change', fillPrincipal);
        fillPrincipal();
        if (!(form instanceof HTMLFormElement)) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const statusEl = root.querySelector('#studio-finance-sync-status');
            const select = /** @type {HTMLSelectElement | null} */ (applicantSelect);
            const applicantId = select?.value || '';
            const selectedOption = select?.selectedOptions?.[0] || null;
            const programId = selectedOption?.getAttribute('data-program-id') || '';
            const email = selectedOption?.getAttribute('data-email') || '';
            const principal =
                principalInput instanceof HTMLInputElement
                    ? principalInput.value.trim()
                    : '';
            const paymentType = String(
                /** @type {HTMLSelectElement | null} */ (
                    root.querySelector('#studio-finance-sync-type')
                )?.value || 'manual',
            );
            const orderId = String(
                /** @type {HTMLInputElement | null} */ (
                    root.querySelector('#studio-finance-sync-order')
                )?.value || '',
            ).trim();
            const captureId = String(
                /** @type {HTMLInputElement | null} */ (
                    root.querySelector('#studio-finance-sync-capture')
                )?.value || '',
            ).trim();
            if (!applicantId || !programId) {
                if (statusEl) statusEl.textContent = 'Select an applicant.';
                return;
            }
            if (!principal) {
                if (statusEl) statusEl.textContent = 'Member principal is required.';
                return;
            }
            if (!orderId && !captureId) {
                if (statusEl) statusEl.textContent = 'Enter a PayPal order ID and/or capture ID.';
                return;
            }
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
            if (statusEl) statusEl.textContent = 'Syncing from PayPal…';
            try {
                const summary = (financeBundle.summaries || []).find(
                    (s) => String(s?.applicationId || '') === applicantId,
                );
                const names = applicantDisplayNamesFromPayload(
                    String(applicantById.get(applicantId)?.payloadJson || ''),
                    String(applicantById.get(applicantId)?.fullName || ''),
                );
                await repairPayPalProgramPayment({
                    orderId: orderId || undefined,
                    captureId: captureId || undefined,
                    principal,
                    programId,
                    applicationId: applicantId,
                    paymentType,
                    totalDueCents: Number(summary?.totalDueCents || 0),
                    depositAmountCents: Number(summary?.depositAmountCents || 100000),
                    applicantEmail: email || undefined,
                    applicantName: `${names.firstName} ${names.lastName}`.trim() || undefined,
                });
                if (statusEl) statusEl.textContent = 'Synced. Reloading finance…';
                close();
                await reloadFinancePayments();
                const refreshStatus = mainEl.querySelector('#studio-finance-programs-refresh-status');
                if (refreshStatus) {
                    refreshStatus.textContent = 'PayPal payment synced onto the ledger.';
                }
            } catch (err) {
                if (statusEl) {
                    statusEl.textContent = err instanceof Error ? err.message : String(err);
                }
                if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
            }
        });
    };

    /**
     * @param {string} rowId
     */
    const openAssignLedgerModal = (rowId) => {
        const ledgerRow = financeBundle.ledger.find((r) => String(r?.id || '') === rowId);
        if (!ledgerRow) return;
        /** @type {Map<string, object>} */
        const programById = new Map();
        for (const p of allPrograms) programById.set(String(p?.id || '').trim(), p);

        const options = [...allApplicants]
            .map((applicant) => {
                const id = String(applicant?.id || '').trim();
                const programId = String(applicant?.programId || '').trim();
                const names = applicantDisplayNamesFromPayload(
                    String(applicant?.payloadJson || ''),
                    String(applicant?.fullName || ''),
                );
                const program = programById.get(programId) || null;
                const programLabel = program
                    ? getProgramDisplayNameFromRow(program)
                    : programId || '—';
                const name = `${names.firstName} ${names.lastName}`.trim() || id;
                return { id, programId, label: `${name} — ${programLabel}` };
            })
            .filter((o) => o.id)
            .sort((a, b) => a.label.localeCompare(b.label));

        const optionsHtml = options
            .map(
                (o) =>
                    `<option value="${escapeHtml(o.id)}" data-program-id="${escapeHtml(o.programId)}">${escapeHtml(o.label)}</option>`,
            )
            .join('');

        const amount = escapeHtml(formatUsdFromCents(ledgerRow.amountCents));
        const provider = escapeHtml(ledgerRowSource(ledgerRow));
        const inner = `
            <div class="studio-finance-ledger-modal">
                <p class="studio-muted">Re-link this ${provider} payment (<strong>${amount}</strong>, type <code>${escapeHtml(String(ledgerRow.paymentType || ''))}</code>) to an applicant. This updates the payment's applicant, program, and member account so it appears on their finance row and their member payments page.</p>
                <form id="studio-finance-assign-form">
                    <label class="studio-field studio-field--full"><span>Applicant</span>
                        <select class="studio-select" id="studio-finance-assign-applicant" required>
                            <option value="" disabled selected>Select an applicant…</option>
                            ${optionsHtml}
                        </select>
                    </label>
                    <div class="studio-modal-actions">
                        <button type="submit" class="studio-btn-primary">Assign payment</button>
                        <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Cancel</button>
                    </div>
                    <p class="studio-muted mpd-field-hint" id="studio-finance-assign-status" role="status"></p>
                </form>
            </div>`;
        const { close, root } = openStudioModal(inner, {
            title: 'Assign payment to applicant',
            wide: true,
        });
        const form = root.querySelector('#studio-finance-assign-form');
        if (!(form instanceof HTMLFormElement)) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const statusEl = root.querySelector('#studio-finance-assign-status');
            const select = root.querySelector('#studio-finance-assign-applicant');
            const applicantId = select instanceof HTMLSelectElement ? select.value : '';
            const selectedOption =
                select instanceof HTMLSelectElement ? select.selectedOptions[0] : null;
            const programId = selectedOption?.getAttribute('data-program-id') || '';
            if (!applicantId || !programId) {
                if (statusEl) statusEl.textContent = 'Select an applicant.';
                return;
            }
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
            if (statusEl) statusEl.textContent = 'Assigning…';
            try {
                await reassignProgramLedgerEntryStudio({ rowId, applicantId, programId });
                close();
                await reloadAllFinanceData();
            } catch (err) {
                if (statusEl) {
                    statusEl.textContent = err instanceof Error ? err.message : String(err);
                }
                if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
            }
        });
    };

    const toggleProgramFilter = async (programId) => {
        const id = String(programId || '').trim();
        if (!id || !programCardById.has(id)) return;
        if (selectedProgramId === id) {
            selectedProgramId = null;
            saveSelectedProgramId(null);
        } else {
            selectedProgramId = id;
            saveSelectedProgramId(id);
            await refreshSelectedProgramTeam();
        }
        syncProgramCardSelection();
        renderProgramCards();
        renderProgramTable();
    };

    const openTeamExpenseModal = (teamMemberId, field) => {
        const members = selectedTeamMembers();
        const member = members.find((m) => String(m.id || '') === teamMemberId);
        if (!member) return;
        const labels = {
            ticketsCents: 'Tickets (USD)',
            localTravelCents: 'Local travel (USD)',
            partner1Cents: 'Partner 1 (USD)',
            partner2Cents: 'Partner 2 (USD)',
            partner3Cents: 'Partner 3 (USD)',
        };
        const label = labels[field] || field;
        const current = Number(member[field] || 0) / 100;
        const body = `
          <form class="studio-modal-form" id="studio-finance-team-expense-form">
            <label class="studio-field"><span>${escapeHtml(label)}</span>
              <input class="studio-input" id="studio-finance-team-expense-amount" inputmode="decimal" value="${escapeHtml(current ? current.toFixed(2) : '')}" />
            </label>
            <div class="studio-modal-actions">
              <button type="submit" class="studio-btn-primary">Save</button>
              <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Cancel</button>
            </div>
            <p class="studio-muted" id="studio-finance-team-expense-status" role="status"></p>
          </form>`;
        const { close, root } = openStudioModal(body, { title: 'Team expense' });
        root.querySelector('#studio-finance-team-expense-form')?.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const statusEl = root.querySelector('#studio-finance-team-expense-status');
            const cents = parseUsdInputToCents(
                /** @type {HTMLInputElement|null} */ (root.querySelector('#studio-finance-team-expense-amount'))
                    ?.value || '',
            );
            if (statusEl) statusEl.textContent = 'Saving…';
            try {
                await updateProgramTeamMemberExpensesStudio({
                    teamMemberId,
                    ticketsCents: field === 'ticketsCents' ? cents : Number(member.ticketsCents || 0),
                    localTravelCents:
                        field === 'localTravelCents' ? cents : Number(member.localTravelCents || 0),
                    partner1Cents: field === 'partner1Cents' ? cents : Number(member.partner1Cents || 0),
                    partner2Cents: field === 'partner2Cents' ? cents : Number(member.partner2Cents || 0),
                    partner3Cents: field === 'partner3Cents' ? cents : Number(member.partner3Cents || 0),
                });
                await refreshSelectedProgramTeam();
                renderProgramCards();
                renderProgramTable();
                close();
            } catch (err) {
                if (statusEl) statusEl.textContent = err instanceof Error ? err.message : String(err);
            }
        });
    };

    const openTeamPayoutPercentModal = (teamMemberId) => {
        const member = selectedTeamMembers().find((m) => String(m.id || '') === teamMemberId);
        if (!member) return;
        const pct = Math.max(0, Math.min(100, Number(member.payoutPercent) || 0));
        const profit = selectedProgramProfitCents();
        const body = `
          <form class="studio-modal-form" id="studio-finance-team-pct-form">
            <p class="studio-muted">Program profit: ${escapeHtml(formatUsdFromCents(profit))}. Projected payout = profit × percent.</p>
            <label class="studio-field"><span>Payout percent (0–100)</span>
              <input class="studio-input" type="number" min="0" max="100" step="1" id="studio-finance-team-pct" value="${escapeHtml(String(pct))}" />
            </label>
            <div class="studio-modal-actions">
              <button type="submit" class="studio-btn-primary">Save</button>
              <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Cancel</button>
            </div>
            <p class="studio-muted" id="studio-finance-team-pct-status" role="status"></p>
          </form>`;
        const { close, root } = openStudioModal(body, { title: 'Projected payout %' });
        root.querySelector('#studio-finance-team-pct-form')?.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const statusEl = root.querySelector('#studio-finance-team-pct-status');
            const value = Number(
                /** @type {HTMLInputElement|null} */ (root.querySelector('#studio-finance-team-pct'))
                    ?.value || 0,
            );
            if (statusEl) statusEl.textContent = 'Saving…';
            try {
                await updateProgramTeamMemberPayoutPercentStudio({
                    teamMemberId,
                    payoutPercent: value,
                });
                await refreshSelectedProgramTeam();
                renderProgramTable();
                close();
            } catch (err) {
                if (statusEl) statusEl.textContent = err instanceof Error ? err.message : String(err);
            }
        });
    };

    const teamMemberDisplayName = (member) => {
        const contact = contactByPrincipal.get(String(member?.principalText || '')) || null;
        return (
            contact?.fullName ||
            [contact?.firstName, contact?.lastName].filter(Boolean).join(' ').trim() ||
            shortPrincipalDisplay(String(member?.principalText || ''))
        );
    };

    const openAdminProgramPayoutModal = (teamMemberId) => {
        const members = selectedTeamMembers();
        const admin = members.find((m) => String(m.id || '') === teamMemberId);
        if (!admin || String(admin.kind || '') !== 'admin') return;
        const profit = selectedProgramProfitCents();
        const pct = Math.max(0, Math.min(100, Number(admin.payoutPercent) || 0));
        const gross = computeProjectedPayoutCents(profit, pct);
        const staffPaid = computeAdminFundedStaffPaidCents(members);
        const staffOutstanding = computeStaffOutstandingOwedCents(members);
        const net = computeAdminNetProgramPayoutCents(admin, profit, members);
        const paidRows = listStaffPaidDisbursementEntries(members, 'admin');
        const paidTable =
            paidRows.length > 0
                ? paidRows
                      .map(({ member, entry }) => {
                          const person = teamMemberDisplayName(member);
                          return `<tr>
                            <td>${escapeHtml(person)}</td>
                            <td>${escapeHtml(String(entry.name || '—'))}</td>
                            <td>${escapeHtml(String(entry.description || '—'))}</td>
                            <td>${escapeHtml(String(entry.dateIso || '').slice(0, 10) || '—')}</td>
                            <td>${escapeHtml(String(entry.paymentService || 'other'))}</td>
                            <td>${escapeHtml(formatUsdFromCents(entry.amountCents))}</td>
                          </tr>`;
                      })
                      .join('')
                : '<tr><td colspan="6">No admin-funded paid disbursements to other staff yet.</td></tr>';
        const owedRows = members
            .filter((m) => m && String(m.status || 'active') !== 'removed' && String(m.kind || '') !== 'admin')
            .map((m) => {
                const owedLedger = sumTeamMemberOwedCents(m);
                const outstanding = teamMemberOutstandingOwedCents(m);
                const paid = sumTeamMemberPaidCents(m);
                const rem = teamMemberDisbursementRemainingCents(m);
                if (owedLedger <= 0 && rem <= 0) return '';
                return `<tr>
                  <td>${escapeHtml(teamMemberDisplayName(m))}</td>
                  <td>${escapeHtml(formatUsdFromCents(outstanding))}</td>
                  <td>${escapeHtml(formatUsdFromCents(paid))}</td>
                  <td>${escapeHtml(formatUsdFromCents(rem))}</td>
                </tr>`;
            })
            .filter(Boolean)
            .join('');
        const owedTable = owedRows
            ? owedRows
            : '<tr><td colspan="4">No outstanding or owed amounts to other staff.</td></tr>';
        const body = `
          <div class="studio-finance-admin-payout-modal">
            <p><strong>${escapeHtml(teamMemberDisplayName(admin))}</strong> · Admin</p>
            <p class="studio-muted mpd-field-hint">Admin-funded paid disbursements and outstanding amounts owed to other staff come out of the admin Program Payout. Payments marked as from the program reduce Total profit instead.</p>
            <dl class="studio-user-manage-dl">
              <dt>Program profit</dt><dd>${escapeHtml(formatUsdFromCents(profit))}</dd>
              <dt>Gross payout (${pct}%)</dt><dd>${escapeHtml(formatUsdFromCents(gross))}</dd>
              <dt>Admin-funded paid to staff</dt><dd>−${escapeHtml(formatUsdFromCents(staffPaid))}</dd>
              <dt>Outstanding owed to staff</dt><dd>−${escapeHtml(formatUsdFromCents(staffOutstanding))}</dd>
              <dt>Net Program Payout</dt><dd><strong>${escapeHtml(formatUsdFromCents(net))}</strong></dd>
            </dl>
            <h4 class="studio-subheading">Admin-funded paid to other staff</h4>
            <div class="studio-table-wrap">
              <table class="studio-table studio-table--dense">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Service</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>${paidTable}</tbody>
              </table>
            </div>
            <h4 class="studio-subheading">Amounts owed to other staff</h4>
            <div class="studio-table-wrap">
              <table class="studio-table studio-table--dense">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Owed</th>
                    <th>Paid</th>
                    <th>Remaining</th>
                  </tr>
                </thead>
                <tbody>${owedTable}</tbody>
              </table>
            </div>
            <div class="studio-modal-actions">
              <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Close</button>
            </div>
          </div>`;
        openStudioModal(body, { title: 'Admin Program Payout', wide: true });
    };

    const openTeamDisbursementModal = (teamMemberId, which) => {
        const isOwed = which === 'owed';
        /** @type {string | null} */
        let editingEntryId = null;

        const paint = () => {
            const member = selectedTeamMembers().find((m) => String(m.id || '') === teamMemberId);
            if (!member) return;
            const kind = String(member.kind || 'staff');
            const kindLabel =
                kind === 'admin' ? 'Admin' : kind === 'collaborator' ? 'Collaborator' : 'Staff';
            const personName = teamMemberDisplayName(member);
            const pct = Math.max(0, Math.min(100, Number(member.payoutPercent) || 0));
            const profit = selectedProgramProfitCents();
            const projected = computeProjectedPayoutCents(profit, pct);
            const entries = isOwed
                ? activeTeamMemberOwedEntries(member)
                : activeTeamMemberPaidEntries(member);
            const total = isOwed ? sumTeamMemberOwedCents(member) : sumTeamMemberPaidCents(member);
            const editing = editingEntryId
                ? entries.find((e) => String(e.id || '') === editingEntryId)
                : null;
            const serviceOpts = ['stripe', 'paypal', 'wire', 'cash', 'other']
                .map((s) => {
                    const sel =
                        String(editing?.paymentService || 'other').toLowerCase() === s
                            ? 'selected'
                            : '';
                    return `<option value="${s}" ${sel}>${s}</option>`;
                })
                .join('');
            const paidColspan = 7;
            const rowsHtml = entries.length
                ? entries
                      .map((e) => {
                          const eid = String(e.id || '');
                          const svc = isOwed
                              ? ''
                              : `<td>${escapeHtml(String(e.paymentService || 'other'))}</td>`;
                          const funded =
                              isOwed
                                  ? ''
                                  : `<td>${escapeHtml(
                                        paidEntryFundedBy(e) === 'program' ? 'Program' : 'Admin',
                                    )}</td>`;
                          return `<tr>
                            <td>${escapeHtml(String(e.name || '—'))}</td>
                            <td>${escapeHtml(String(e.description || '—'))}</td>
                            <td>${escapeHtml(String(e.dateIso || '').slice(0, 10) || '—')}</td>
                            ${svc}
                            ${funded}
                            <td>${escapeHtml(formatUsdFromCents(e.amountCents))}</td>
                            <td>
                              <button type="button" class="studio-btn-ghost" data-disb-edit="${escapeHtml(eid)}">Edit</button>
                              <button type="button" class="studio-btn-ghost" data-disb-void="${escapeHtml(eid)}">Void</button>
                            </td>
                          </tr>`;
                      })
                      .join('')
                : `<tr><td colspan="${isOwed ? 5 : paidColspan}">No ${isOwed ? 'owed' : 'paid'} entries yet.</td></tr>`;
            const projectedBlock = isOwed
                ? `<p class="studio-muted mpd-field-hint">Projected payout: <strong>${escapeHtml(formatUsdFromCents(projected))}</strong> (${pct}% of program profit ${escapeHtml(formatUsdFromCents(profit))}). Guidance only — does not write owed lines.</p>`
                : `<p class="studio-muted mpd-field-hint">Check “Payment from program” for prorated or program-funded pays (reduces Total profit). Leave unchecked for admin-funded pays (reduces admin Program Payout).</p>`;
            const serviceField = isOwed
                ? ''
                : `<label class="studio-field"><span>Payment service</span>
                    <select class="studio-select" id="studio-finance-disb-service">${serviceOpts}</select>
                  </label>`;
            const fundedByChecked =
                editing && paidEntryFundedBy(editing) === 'program' ? 'checked' : '';
            const fundedByField = isOwed
                ? ''
                : `<label class="studio-field studio-field--inline-check">
                    <input type="checkbox" class="studio-checkbox" id="studio-finance-disb-funded-program" ${fundedByChecked} />
                    <span>Payment from program</span>
                  </label>`;
            const amountVal =
                editing && Number(editing.amountCents)
                    ? (Number(editing.amountCents) / 100).toFixed(2)
                    : '';
            bodyRoot.innerHTML = `
              <div class="studio-finance-disb-ledger-modal">
                <p><strong>${escapeHtml(personName)}</strong> · ${escapeHtml(kindLabel)}</p>
                ${projectedBlock}
                <div class="studio-table-wrap">
                  <table class="studio-table studio-table--dense">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Date</th>
                        ${isOwed ? '' : '<th>Service</th>'}
                        ${isOwed ? '' : '<th>Funded by</th>'}
                        <th>Amount</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                  </table>
                </div>
                <p class="studio-muted">Total ${isOwed ? 'owed' : 'paid'}: <strong>${escapeHtml(formatUsdFromCents(total))}</strong></p>
                <form class="studio-modal-form" id="studio-finance-disb-entry-form">
                  <h4 class="studio-subheading">${editing ? 'Edit entry' : 'Add entry'}</h4>
                  <label class="studio-field"><span>Name</span>
                    <input class="studio-input" id="studio-finance-disb-name" required value="${escapeHtml(String(editing?.name || ''))}" />
                  </label>
                  <label class="studio-field"><span>Description</span>
                    <input class="studio-input" id="studio-finance-disb-desc" value="${escapeHtml(String(editing?.description || ''))}" />
                  </label>
                  <label class="studio-field"><span>Date</span>
                    <input class="studio-input" type="date" id="studio-finance-disb-date" value="${escapeHtml(String(editing?.dateIso || '').slice(0, 10))}" />
                  </label>
                  ${serviceField}
                  <label class="studio-field"><span>Amount (USD)</span>
                    <input class="studio-input" id="studio-finance-disb-amount" inputmode="decimal" required value="${escapeHtml(amountVal)}" />
                  </label>
                  ${fundedByField}
                  <div class="studio-modal-actions">
                    <button type="submit" class="studio-btn-primary">${editing ? 'Update entry' : 'Add entry'}</button>
                    ${
                        editing
                            ? '<button type="button" class="studio-btn-ghost" id="studio-finance-disb-cancel-edit">Cancel edit</button>'
                            : ''
                    }
                    <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Close</button>
                  </div>
                  <p class="studio-muted" id="studio-finance-disb-status" role="status"></p>
                </form>
              </div>`;

            bodyRoot
                .querySelector('#studio-finance-disb-entry-form')
                ?.addEventListener('submit', async (ev) => {
                    ev.preventDefault();
                    const statusEl = bodyRoot.querySelector('#studio-finance-disb-status');
                    const name =
                        /** @type {HTMLInputElement|null} */ (
                            bodyRoot.querySelector('#studio-finance-disb-name')
                        )?.value?.trim() || '';
                    const description =
                        /** @type {HTMLInputElement|null} */ (
                            bodyRoot.querySelector('#studio-finance-disb-desc')
                        )?.value?.trim() || '';
                    const dateIso =
                        /** @type {HTMLInputElement|null} */ (
                            bodyRoot.querySelector('#studio-finance-disb-date')
                        )?.value?.trim() || '';
                    const amountCents = parseUsdInputToCents(
                        /** @type {HTMLInputElement|null} */ (
                            bodyRoot.querySelector('#studio-finance-disb-amount')
                        )?.value || '',
                    );
                    const paymentService =
                        /** @type {HTMLSelectElement|null} */ (
                            bodyRoot.querySelector('#studio-finance-disb-service')
                        )?.value || 'other';
                    const fundedBy =
                        /** @type {HTMLInputElement|null} */ (
                            bodyRoot.querySelector('#studio-finance-disb-funded-program')
                        )?.checked
                            ? 'program'
                            : 'admin';
                    if (!name) {
                        if (statusEl) statusEl.textContent = 'Name is required.';
                        return;
                    }
                    if (statusEl) statusEl.textContent = 'Saving…';
                    try {
                        if (isOwed) {
                            await upsertProgramTeamOwedEntryStudio({
                                teamMemberId,
                                entryId: editingEntryId || '',
                                name,
                                description,
                                dateIso,
                                amountCents,
                            });
                        } else {
                            await upsertProgramTeamPaidEntryStudio({
                                teamMemberId,
                                entryId: editingEntryId || '',
                                name,
                                description,
                                dateIso,
                                amountCents,
                                paymentService,
                                fundedBy,
                            });
                        }
                        editingEntryId = null;
                        await refreshSelectedProgramTeam();
                        renderProgramCards();
                        paint();
                    } catch (err) {
                        if (statusEl) {
                            statusEl.textContent =
                                err instanceof Error ? err.message : String(err);
                        }
                    }
                });

            bodyRoot
                .querySelector('#studio-finance-disb-cancel-edit')
                ?.addEventListener('click', () => {
                    editingEntryId = null;
                    paint();
                });

            bodyRoot.querySelectorAll('[data-disb-edit]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    editingEntryId = btn.getAttribute('data-disb-edit');
                    paint();
                });
            });

            bodyRoot.querySelectorAll('[data-disb-void]').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const eid = btn.getAttribute('data-disb-void');
                    if (!eid || !window.confirm('Void this entry?')) return;
                    const statusEl = bodyRoot.querySelector('#studio-finance-disb-status');
                    if (statusEl) statusEl.textContent = 'Voiding…';
                    try {
                        if (isOwed) await voidProgramTeamOwedEntryStudio(eid);
                        else await voidProgramTeamPaidEntryStudio(eid);
                        if (editingEntryId === eid) editingEntryId = null;
                        await refreshSelectedProgramTeam();
                        renderProgramCards();
                        paint();
                    } catch (err) {
                        if (statusEl) {
                            statusEl.textContent =
                                err instanceof Error ? err.message : String(err);
                        }
                    }
                });
            });
        };

        const { root } = openStudioModal('<div id="studio-finance-disb-body"></div>', {
            title: isOwed ? 'Amount owed' : 'Amount paid',
            wide: true,
        });
        const bodyRoot = root.querySelector('#studio-finance-disb-body');
        if (!(bodyRoot instanceof HTMLElement)) return;
        paint();
    };

    const openAddTeamMemberModal = async () => {
        if (!selectedProgramId || !programsCanEdit) return;
        const currentTeam = selectedTeamMembers();
        const assigned = new Set(currentTeam.map((m) => String(m.principalText || '')));
        const hasAdmin = currentTeam.some((m) => String(m.kind || '') === 'admin');
        /** @type {{ principal: string, label: string, kind: string }[]} */
        const options = [];
        const roleOf = (acc) => {
            const roleObj = acc?.role;
            if (roleObj && typeof roleObj === 'object') {
                return String(Object.keys(roleObj)[0] || '').toLowerCase();
            }
            return String(roleObj || '').toLowerCase();
        };
        for (const acc of allAccounts) {
            const principal = String(acc?.principal || '').trim();
            if (!principal || assigned.has(principal)) continue;
            const role = roleOf(acc);
            if (!['staff', 'collaborator', 'admin'].includes(role)) continue;
            if (role === 'admin' && hasAdmin) continue;
            const contact = contactByPrincipal.get(principal);
            const name =
                contact?.fullName ||
                [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') ||
                shortPrincipalDisplay(principal);
            options.push({
                principal,
                label: `${name} · ${role}${contact?.email ? ` · ${contact.email}` : ''}`,
                kind: role,
            });
        }
        if (!hasAdmin) {
            try {
                const admins = await listAdminsForStudio();
                for (const a of Array.isArray(admins) ? admins : []) {
                    const principal =
                        a && typeof a === 'object' && typeof a.toText === 'function'
                            ? a.toText()
                            : String(a || '');
                    if (!principal || assigned.has(principal)) continue;
                    if (options.some((o) => o.principal === principal)) continue;
                    const contact = contactByPrincipal.get(principal);
                    const name =
                        contact?.fullName ||
                        [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') ||
                        shortPrincipalDisplay(principal);
                    options.push({
                        principal,
                        label: `${name} · admin`,
                        kind: 'admin',
                    });
                }
            } catch {
                /* optional */
            }
        }
        if (!options.length) {
            window.alert(
                hasAdmin
                    ? 'No additional staff or collaborators available to add.'
                    : 'No staff, collaborators, or admins available to add.',
            );
            return;
        }
        const optsHtml = options
            .map(
                (o) =>
                    `<option value="${escapeHtml(o.principal)}" data-kind="${escapeHtml(o.kind)}">${escapeHtml(o.label)}</option>`,
            )
            .join('');
        const body = `
          <form class="studio-modal-form" id="studio-finance-team-add-form">
            <label class="studio-field"><span>Staff, collaborator, or one admin</span>
              <select class="studio-select" id="studio-finance-team-add-principal" required>${optsHtml}</select>
            </label>
            <p class="studio-muted mpd-field-hint">At most one admin per program. Staff and collaborators can be added freely.</p>
            <div class="studio-modal-actions">
              <button type="submit" class="studio-btn-primary">Add to program</button>
              <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Cancel</button>
            </div>
            <p class="studio-muted" id="studio-finance-team-add-status" role="status"></p>
          </form>`;
        const { close, root } = openStudioModal(body, { title: 'Add team member' });
        root.querySelector('#studio-finance-team-add-form')?.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const statusEl = root.querySelector('#studio-finance-team-add-status');
            const selectEl = /** @type {HTMLSelectElement|null} */ (
                root.querySelector('#studio-finance-team-add-principal')
            );
            const principal = selectEl?.value || '';
            const selectedOpt = selectEl?.selectedOptions?.[0];
            const kind = selectedOpt?.getAttribute('data-kind') || '';
            if (statusEl) statusEl.textContent = 'Saving…';
            try {
                await addProgramTeamMemberStudio(selectedProgramId, principal, { kind });
                await refreshSelectedProgramTeam();
                renderProgramCards();
                renderProgramTable();
                close();
            } catch (err) {
                if (statusEl) statusEl.textContent = err instanceof Error ? err.message : String(err);
            }
        });
    };

    const renderProgramCards = () => {
        /** @type {Record<'active' | 'past' | 'upcoming', ReturnType<typeof buildFinanceProgramCardModel>[]>} */
        const buckets = { active: [], past: [], upcoming: [] };

        programCardById = new Map();
        const sortedPrograms = [...allPrograms].sort(sortFinanceProgramRows);
        for (const row of sortedPrograms) {
            const applicants = applicantsByProgramId.get(String(row.id || '')) || [];
            const team = teamMembersByProgramId.get(String(row.id || '')) || [];
            const model = buildFinanceProgramCardModel(
                row,
                applicants,
                paymentIndex,
                team,
                financePromotions,
            );
            programCardById.set(model.id, model);
            buckets[model.section].push(model);
        }

        if (programCardsUnified) {
            const parts = [];
            const sectionLabels = /** @type {const} */ (['active', 'past', 'upcoming']);
            const sectionTitles = { active: 'Active', past: 'Past', upcoming: 'Upcoming' };
            let anyCards = false;
            for (const key of sectionLabels) {
                const items = buckets[key];
                if (!items.length) continue;
                anyCards = true;
                parts.push(
                    `<span class="studio-finance-program-cards-divider" aria-hidden="true">${escapeHtml(sectionTitles[key])}</span>`,
                );
                parts.push(
                    ...items.map((item) =>
                        financeProgramCardHtml(item, item.id === selectedProgramId),
                    ),
                );
            }
            programCardsUnified.innerHTML = anyCards
                ? parts.join('')
                : '<p class="studio-muted studio-finance-program-section__empty">No programs yet.</p>';
        }

        if (selectedProgramId && !programCardById.has(selectedProgramId)) {
            selectedProgramId = null;
            saveSelectedProgramId(null);
        }

        syncProgramCardSelection();
        renderProgramTable();
    };

    mainEl.addEventListener('click', (e) => {
        const assignBtn =
            e.target instanceof Element ? e.target.closest('[data-finance-assign-row]') : null;
        if (assignBtn) {
            const rowId = assignBtn.getAttribute('data-finance-assign-row');
            if (rowId) openAssignLedgerModal(rowId);
            return;
        }
        const emailBtn =
            e.target instanceof Element ? e.target.closest('[data-finance-email-applicant]') : null;
        if (emailBtn) {
            const applicantId = emailBtn.getAttribute('data-finance-email-applicant');
            const applicant = applicantId ? applicantById.get(applicantId) : null;
            if (applicant) {
                const financeRow = applicantId ? financeRowByApplicantId.get(applicantId) : null;
                const remainingCents = Number(financeRow?.remainingBalanceCents ?? 0);
                void openApplicantEmailModal(applicant, {
                    onSent: () => reloadAllFinanceData(),
                    financeContext: financeRow || undefined,
                    preferTemplateId:
                        remainingCents > 0 ? 'tpl-applicant-remaining-balance' : undefined,
                });
            }
            return;
        }
        const ledgerBtn =
            e.target instanceof Element ? e.target.closest('[data-finance-ledger-open]') : null;
        if (ledgerBtn) {
            const applicantId = ledgerBtn.getAttribute('data-applicant-id');
            const mode = ledgerBtn.getAttribute('data-finance-ledger-mode');
            if (
                applicantId &&
                (mode === 'payments' ||
                    mode === 'fees' ||
                    mode === 'travel' ||
                    mode === 'tickets')
            ) {
                openFinanceLedgerModal(applicantId, mode);
            }
            return;
        }
        const teamExpenseBtn =
            e.target instanceof Element ? e.target.closest('[data-finance-team-expense]') : null;
        if (teamExpenseBtn && programsCanEdit) {
            const teamMemberId = teamExpenseBtn.getAttribute('data-team-member-id');
            const field = teamExpenseBtn.getAttribute('data-expense-field');
            if (
                teamMemberId &&
                field &&
                [
                    'ticketsCents',
                    'localTravelCents',
                    'partner1Cents',
                    'partner2Cents',
                    'partner3Cents',
                ].includes(field)
            ) {
                openTeamExpenseModal(teamMemberId, field);
            }
            return;
        }
        const teamPctBtn =
            e.target instanceof Element ? e.target.closest('[data-finance-team-payout-pct]') : null;
        if (teamPctBtn && programsCanEdit) {
            const teamMemberId = teamPctBtn.getAttribute('data-team-member-id');
            if (teamMemberId) openTeamPayoutPercentModal(teamMemberId);
            return;
        }
        const adminPayoutBtn =
            e.target instanceof Element ? e.target.closest('[data-finance-admin-payout]') : null;
        if (adminPayoutBtn) {
            const teamMemberId = adminPayoutBtn.getAttribute('data-finance-admin-payout');
            if (teamMemberId) openAdminProgramPayoutModal(teamMemberId);
            return;
        }
        const teamDisbBtn =
            e.target instanceof Element ? e.target.closest('[data-finance-team-disbursement]') : null;
        if (teamDisbBtn && programsCanEdit) {
            const teamMemberId = teamDisbBtn.getAttribute('data-team-member-id');
            const which = teamDisbBtn.getAttribute('data-finance-team-disbursement');
            if (teamMemberId && (which === 'owed' || which === 'paid')) {
                openTeamDisbursementModal(teamMemberId, which);
            }
            return;
        }
        const teamRemoveBtn =
            e.target instanceof Element ? e.target.closest('[data-finance-team-remove]') : null;
        if (teamRemoveBtn && programsCanEdit) {
            const teamMemberId = teamRemoveBtn.getAttribute('data-finance-team-remove');
            if (teamMemberId && window.confirm('Remove this team member from the program?')) {
                void (async () => {
                    try {
                        await removeProgramTeamMemberStudio(teamMemberId);
                        await refreshSelectedProgramTeam();
                        renderProgramCards();
                        renderProgramTable();
                    } catch (err) {
                        window.alert(err instanceof Error ? err.message : String(err));
                    }
                })();
            }
            return;
        }
        if (
            e.target instanceof Element &&
            e.target.closest('#studio-finance-team-add') &&
            programsCanEdit
        ) {
            void openAddTeamMemberModal();
            return;
        }
        const payoutInfoClose =
            e.target instanceof Element
                ? e.target.closest('[data-finance-payout-info-close]')
                : null;
        if (payoutInfoClose) {
            const pop = mainEl.querySelector('#studio-finance-disb-payout-info');
            if (pop instanceof HTMLElement) pop.hidden = true;
            return;
        }
        const payoutInfoBtn =
            e.target instanceof Element ? e.target.closest('[data-finance-payout-info]') : null;
        if (payoutInfoBtn) {
            const pop = mainEl.querySelector('#studio-finance-disb-payout-info');
            if (pop instanceof HTMLElement) pop.hidden = !pop.hidden;
            return;
        }
        const btn = e.target instanceof Element ? e.target.closest('[data-finance-program-id]') : null;
        if (!btn) return;
        const id = btn.getAttribute('data-finance-program-id');
        if (id) void toggleProgramFilter(id);
    });

    disbursementsWrap?.addEventListener('change', (e) => {
        const t = e.target;
        if (!(t instanceof HTMLInputElement) || t.type !== 'checkbox') return;
        const memberId = t.getAttribute('data-finance-include-program');
        if (!memberId || !programsCanEdit) return;
        includeProgramPayoutByMemberId.set(memberId, t.checked);
        renderDisbursements();
    });

    disbursementsWrap?.addEventListener('mouseover', (e) => {
        const btn =
            e.target instanceof Element ? e.target.closest('[data-finance-payout-info]') : null;
        if (!btn || !disbursementsWrap.contains(btn)) return;
        const pop = disbursementsWrap.querySelector('#studio-finance-disb-payout-info');
        if (pop instanceof HTMLElement) pop.hidden = false;
    });

    mainEl.querySelectorAll('[data-finance-tab]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-finance-tab');
            if (tab) setFinanceTab(tab);
        });
    });

    mainEl.querySelectorAll('[data-finance-chip]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const chip = btn.getAttribute('data-finance-chip');
            if (!chip) return;
            if (enabledChips.has(chip) && enabledChips.size <= 1) {
                if (chipHint) chipHint.hidden = false;
                return;
            }
            if (chipHint) chipHint.hidden = true;
            if (enabledChips.has(chip)) enabledChips.delete(chip);
            else enabledChips.add(chip);
            saveChipState();
            syncChipButtons();
            renderOverview();
        });
    });

    membershipFilter?.addEventListener('change', renderUsersTable);
    usersSearch?.addEventListener('input', renderUsersTable);

    const programsRefreshBtn = mainEl.querySelector('#studio-finance-programs-refresh');
    const programsRefreshStatus = mainEl.querySelector('#studio-finance-programs-refresh-status');
    programsRefreshBtn?.addEventListener('click', async () => {
        if (programsRefreshBtn instanceof HTMLButtonElement) programsRefreshBtn.disabled = true;
        if (programsRefreshStatus) programsRefreshStatus.textContent = 'Refreshing payments…';
        try {
            await reloadFinancePayments();
            if (programsRefreshStatus) {
                programsRefreshStatus.textContent = 'Payments refreshed.';
            }
        } catch (err) {
            if (programsRefreshStatus) {
                programsRefreshStatus.textContent =
                    err instanceof Error ? err.message : String(err);
            }
        } finally {
            if (programsRefreshBtn instanceof HTMLButtonElement) programsRefreshBtn.disabled = false;
        }
    });
    mainEl.querySelector('#studio-finance-programs-sync')?.addEventListener('click', () => {
        openSyncPaymentsModal();
    });
    mainEl.querySelector('#studio-finance-diagnostics-sync')?.addEventListener('click', () => {
        openSyncPaymentsModal();
    });

    const usersRefreshBtn = mainEl.querySelector('#studio-finance-users-refresh');
    const usersRefreshStatus = mainEl.querySelector('#studio-finance-users-refresh-status');
    usersRefreshBtn?.addEventListener('click', async () => {
        if (usersRefreshBtn instanceof HTMLButtonElement) usersRefreshBtn.disabled = true;
        const total = allAccounts.length;
        let done = 0;
        let errors = 0;
        if (usersRefreshStatus) {
            usersRefreshStatus.textContent = total
                ? `Syncing 0/${total}…`
                : 'No accounts to sync.';
        }
        try {
            for (const account of allAccounts) {
                const principal = String(account?.principal || '').trim();
                const paypalId = String(account?.paypalSubscriptionId || '').trim();
                const contact = contactByPrincipal.get(principal);
                const email = String(contact?.email || '').trim();
                try {
                    if (paypalId && principal) {
                        await syncPayPalSubscription({
                            principal,
                            subscriptionId: paypalId,
                        });
                    } else if (email.includes('@') && principal) {
                        await syncSubscriptionFromStripeByEmail(email, principal);
                    } else if (principal) {
                        await syncSubscriptionFromStripe(principal);
                    }
                } catch {
                    errors += 1;
                }
                done += 1;
                if (usersRefreshStatus) {
                    usersRefreshStatus.textContent = `Synced ${done}/${total}${errors ? ` · ${errors} failed` : ''}…`;
                }
            }
            allAccounts = await getAccountsForStudio();
            try {
                membershipRevenueStripe = await fetchMembershipRevenueSummary();
            } catch {
                membershipRevenueStripe = { ok: false };
            }
            rebuildMembershipRevenueModel();
            renderUsersRevenueStat();
            renderUsersSummary();
            renderUsersTable();
            renderOverview();
            if (usersRefreshStatus) {
                usersRefreshStatus.textContent = total
                    ? `Synced ${done}/${total}${errors ? ` · ${errors} failed` : ''}.`
                    : 'No accounts to sync.';
            }
        } catch (err) {
            if (usersRefreshStatus) {
                usersRefreshStatus.textContent =
                    err instanceof Error ? err.message : String(err);
            }
        } finally {
            if (usersRefreshBtn instanceof HTMLButtonElement) usersRefreshBtn.disabled = false;
        }
    });

    const promoAddBtn = mainEl.querySelector('#studio-finance-promo-add');
    if (promoAddBtn instanceof HTMLButtonElement) {
        promoAddBtn.hidden = !promotionsCanEdit;
        promoAddBtn.addEventListener('click', () => openPromotionModal(null));
    }
    const handleFinancePromoActionClick = async (e) => {
        const t = e.target;
        if (!(t instanceof Element)) return;
        const editBtn = t.closest('[data-finance-promo-edit]');
        if (editBtn) {
            const editId = editBtn.getAttribute('data-finance-promo-edit');
            const existing = financePromotions.find((p) => String(p.id || '') === editId);
            if (existing) openPromotionModal(existing);
            return;
        }
        const archiveBtn = t.closest('[data-finance-promo-archive]');
        if (!archiveBtn) return;
        const archiveId = archiveBtn.getAttribute('data-finance-promo-archive');
        if (!archiveId) return;
        if (!window.confirm('Archive this promotion?')) return;
        try {
            await archiveFinancePromotionStudio(archiveId);
            financePromotions = await listFinancePromotionsStudio();
            renderPromotions();
            renderProgramCards();
            renderOverview();
        } catch (err) {
            window.alert(err instanceof Error ? err.message : String(err));
        }
    };
    mainEl
        .querySelector('#studio-finance-promotions-tbody')
        ?.addEventListener('click', handleFinancePromoActionClick);
    programPromotionsWrap?.addEventListener('click', handleFinancePromoActionClick);

    diagnosticsRefreshBtn?.addEventListener('click', async () => {
        if (diagnosticsRefreshBtn instanceof HTMLButtonElement) {
            diagnosticsRefreshBtn.disabled = true;
        }
        if (diagnosticsBody) {
            diagnosticsBody.innerHTML = '<p class="studio-muted">Refreshing…</p>';
        }
        try {
            await reloadAllFinanceData();
        } catch (err) {
            if (diagnosticsBody) {
                diagnosticsBody.innerHTML = `<p class="studio-banner studio-banner--warn">${escapeHtml(err instanceof Error ? err.message : String(err))}</p>`;
            }
        } finally {
            if (diagnosticsRefreshBtn instanceof HTMLButtonElement) {
                diagnosticsRefreshBtn.disabled = false;
            }
        }
    });

    const programsVisible = studioFinanceCategoryAccess('Programs').visible;
    const usersVisible = studioFinanceCategoryAccess('Users').visible;
    /** @type {string[]} */
    const loadWarnings = [];

    if (usersVisible) {
        try {
            allAccounts = await getAccountsForStudio();
            const contacts = await adminListAccountContactsForStudio().catch(() => []);
            contactByPrincipal = new Map(
                (Array.isArray(contacts) ? contacts : []).map((row) => {
                    const p =
                        row && row[0] && typeof row[0] === 'object' && typeof row[0].toText === 'function'
                            ? row[0].toText()
                            : String(row?.[0] || '');
                    const c = row?.[1] || {};
                    const firstName = String(c.firstName || '').trim();
                    const lastName = String(c.lastName || '').trim();
                    const email = String(c.email || '').trim();
                    const fullName = String(`${firstName} ${lastName}`).trim();
                    return [p, { firstName, lastName, fullName, email }];
                }),
            );
            try {
                membershipRevenueStripe = await fetchMembershipRevenueSummary();
                if (
                    membershipRevenueStripe &&
                    typeof membershipRevenueStripe === 'object' &&
                    /** @type {{ ok?: unknown }} */ (membershipRevenueStripe).ok !== true
                ) {
                    const reason =
                        typeof /** @type {{ reason?: unknown }} */ (membershipRevenueStripe).reason ===
                        'string'
                            ? String(/** @type {{ reason: string }} */ (membershipRevenueStripe).reason)
                            : typeof /** @type {{ error?: unknown }} */ (membershipRevenueStripe)
                                    .error === 'string'
                              ? String(/** @type {{ error: string }} */ (membershipRevenueStripe).error)
                              : '';
                    if (reason) {
                        loadWarnings.push(`Stripe MRR supplement: ${reason}`);
                    }
                }
            } catch (revenueErr) {
                membershipRevenueStripe = { ok: false };
                /* Canister-normalized MRR still works without Stripe summary */
            }
            rebuildMembershipRevenueModel();
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            allAccounts = [];
            contactByPrincipal = new Map();
            loadWarnings.push(
                /Unauthorized|admin only|not visible/i.test(msg)
                    ? 'Membership accounts could not be loaded. Enable Finance — Users (view) for this role, then refresh. If permissions are already set, redeploy fusion-app-backend so listAccounts respects staff access.'
                    : msg,
            );
        }
    }

    if (programsVisible) {
        try {
            const [programs, applicants, paymentsBundle, promos] = await Promise.all([
                getPrograms(),
                getApplicants(),
                getStaffProgramPaymentsFinanceStudio(),
                listFinancePromotionsStudio().catch(() => []),
            ]);
            allPrograms = Array.isArray(programs) ? programs : [];
            allApplicants = Array.isArray(applicants) ? applicants : [];
            financeBundle = normalizeFinanceBundle(paymentsBundle);
            paymentIndex = buildProgramPaymentIndex(paymentsBundle);
            financePromotions = Array.isArray(promos) ? promos : [];
            applicantsByProgramId = new Map();
            applicantById = new Map();
            for (const applicant of allApplicants) {
                const id = String(applicant?.id || '').trim();
                if (id) applicantById.set(id, applicant);
                const programId = String(applicant?.programId || '').trim();
                if (!programId) continue;
                if (!applicantsByProgramId.has(programId)) {
                    applicantsByProgramId.set(programId, []);
                }
                applicantsByProgramId.get(programId).push(applicant);
            }
            selectedProgramId = loadSelectedProgramId();
            await loadAllProgramTeams();
            if (!usersVisible) {
                try {
                    const contacts = await adminListAccountContactsForStudio().catch(() => []);
                    contactByPrincipal = new Map(
                        (Array.isArray(contacts) ? contacts : []).map((row) => {
                            const p =
                                row &&
                                row[0] &&
                                typeof row[0] === 'object' &&
                                typeof row[0].toText === 'function'
                                    ? row[0].toText()
                                    : String(row?.[0] || '');
                            const c = row?.[1] || {};
                            const firstName = String(c.firstName || '').trim();
                            const lastName = String(c.lastName || '').trim();
                            const email = String(c.email || '').trim();
                            const fullName = String(`${firstName} ${lastName}`).trim();
                            return [p, { firstName, lastName, fullName, email }];
                        }),
                    );
                } catch {
                    /* optional for team labels */
                }
                try {
                    allAccounts = await getAccountsForStudio().catch(() => []);
                } catch {
                    allAccounts = [];
                }
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            allPrograms = [];
            allApplicants = [];
            applicantsByProgramId = new Map();
            loadWarnings.push(msg);
        }
    } else if (studioFinanceCategoryAccess('Promotions').visible) {
        try {
            financePromotions = await listFinancePromotionsStudio();
        } catch {
            financePromotions = [];
        }
    }

    setStatus(loadWarnings.length ? loadWarnings.join(' ') : '');

    setLoadingVisible(false);
    if (workspaceEl) workspaceEl.hidden = false;

    syncChipButtons();
    renderOverview();
    renderUsersRevenueStat();
    renderUsersSummary();
    renderUsersTable();
    if (studioFinanceCategoryAccess('Programs').visible) {
        renderProgramCards();
    } else {
        if (programTableWrap) programTableWrap.innerHTML = '';
        if (programPromotionsWrap) programPromotionsWrap.innerHTML = '';
        if (disbursementsWrap) disbursementsWrap.innerHTML = '';
    }
    renderPromotions();
    renderDiagnostics();
    setFinanceTab(defaultTab());

    if (!visibleCategories.length) {
        setStatus('Finance is open but no category scopes are enabled for your role.');
    }
}
