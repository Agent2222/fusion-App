/**
 * Studio → Finance: overview dashboard + domain tabs (Programs, Users, Products, Promotions).
 */
import '../../styles/memberProfileDashboard.css';
import '../../styles/studioFinanceDashboard.css';
import {
    adminListAccountContactsForStudio,
    getAccountsForStudio,
    getApplicants,
    getProgramDisplayNameFromRow,
    getPrograms,
    getStaffProgramPaymentsFinanceStudio,
    recordStaffManualProgramLedgerStudio,
    upsertApplicantStudio,
} from '../../utils/database.js';
import { firstNonEmptyString } from '../../utils/localeFallback.js';
import {
    buildProgramPaymentIndex,
    buildStudioProgramFinanceRows,
    computeFinancePanelTotals,
    computeProgramExpectedRevenueCents,
    formatUsdFromCents,
    isLedgerPaymentRow,
    isLedgerRowSucceeded,
    ledgerRowSource,
    ledgerRowTypeLabel,
    PROGRAM_VETERAN_DISCOUNT_CENTS,
} from '../../utils/programPaymentMoney.js';
import {
    countMembershipMetrics,
    formatSubscriptionPeriodEnd,
    studioMembershipBadgeHtml,
    studioMembershipFilterMatch,
    studioMembershipStatusLabel,
    studioStripeDashboardCustomerUrl,
} from '../../utils/studioMembershipPresentation.js';
import {
    applicantCategoryPillHtml,
    getApplicantCategory,
    getApplicantFlightCostCents,
    getApplicantIsTester,
    getApplicantLocalTravelCostCents,
    getApplicantManualDepositSubmitted,
    mergeApplicantStaffFields,
    parseApplicantPayload,
    shortPrincipalDisplay,
} from '../../utils/studioPlainForms.js';
import {
    studioFeatureAccess,
    studioFinanceCategoryAccess,
    studioFinanceVisibleCategories,
} from '../../utils/studioShellState.js';
import { studioIconHref } from '../../utils/studioIconRegistry.js';
import { getStripePublishableKeyResolved } from '../../utils/studioServicesConfig.js';
import { fetchMembershipRevenueSummary } from '../../utils/integrationApi.js';
import { formatMembershipRevenueStatHtml } from '../../utils/membershipRevenueMoney.js';
import { openStudioModal } from '../../utils/studioModal.js';
import { openApplicantEmailModal } from './applicantEmailModal.js';

const CHIP_STORAGE_KEY = 'studio-finance-overview-chips-v1';
const PROGRAM_SELECT_STORAGE_KEY = 'studio-finance-selected-program-v1';

/**
 * @param {string} payloadJson
 * @param {Partial<{ internalNotes: string, manualDepositSubmitted: boolean, applicantCategory: string, isTester: boolean, flightCostCents: number, localTravelCostCents: number }>} overrides
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
    if (d.tab === 'overview') return studioFeatureAccess('finance').visible;
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
                        <div id="studio-finance-program-revenue-stat" class="studio-finance-program-revenue-stat" aria-live="polite"></div>
                        <div class="studio-finance-program-cards-rail studio-finance-program-cards-rail--unified" id="studio-finance-program-cards-unified" role="list" aria-label="Programs"></div>
                        <div id="studio-finance-program-table-wrap" class="studio-finance-program-table-wrap" aria-live="polite"></div>
                    </div>
                </div>
                <div class="mpd-program-tab-panel" id="studio-finance-panel-users" role="tabpanel" aria-labelledby="studio-finance-tab-users" data-finance-panel="users" hidden>
                    <div id="studio-finance-users-revenue-stat" aria-live="polite"></div>
                    <div id="studio-finance-users-summary"></div>
                    <section class="member-profile-dashboard__card" style="margin-top:0.75rem">
                        <div class="mpd-payments-section-head">
                            <h3>Membership accounts</h3>
                            <span class="studio-muted">Join / Fusion subscription on canister</span>
                        </div>
                        <div class="studio-finance-filter-bar">
                            <label class="studio-field">
                                <span>Membership</span>
                                <select id="studio-finance-users-membership" class="studio-select">
                                    <option value="">All</option>
                                    <option value="active">Active</option>
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
                                        <th>Renews</th>
                                        <th>Stripe</th>
                                        <th>Principal</th>
                                    </tr>
                                </thead>
                                <tbody id="studio-finance-users-tbody"><tr><td colspan="7">Loading…</td></tr></tbody>
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
                    ${placeholderPanelHtml(
                        'Promotions',
                        'Advertising and promotional spend tracking is planned for a later release.',
                        ['Campaign budgets and spend', 'Attribution to programs or products', 'Coupon / promo code redemption (optional)'],
                    )}
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
 */
function buildFinanceProgramCardModel(programRow, applicantsForProgram, paymentIndex) {
    const lifecycle = financeLifecycleFromStudioStatus(programRow.studioStatus);
    const revenue = computeExpectedRevenue(programRow, applicantsForProgram, paymentIndex);
    return {
        id: String(programRow.id || ''),
        title: getProgramDisplayNameFromRow(programRow),
        imageSrc: firstNonEmptyString(
            programRow.jaCard?.imageSrc,
            programRow.enCard?.imageSrc,
        ),
        ...lifecycle,
        ...revenue,
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
    let slotLine = 'No confirmed slots yet';
    if (item.filledSlots > 0) {
        const parts = [`${item.filledSlots} slot${item.filledSlots === 1 ? '' : 's'}`];
        if (item.veteranSlotCount > 0) {
            parts.push(
                `${item.veteranSlotCount} veteran (−${formatUsdFromCents(PROGRAM_VETERAN_DISCOUNT_CENTS)} ea)`,
            );
        }
        if (item.avgPerSlotCents > 0) {
            parts.push(`avg ${formatUsdFromCents(item.avgPerSlotCents)}/slot`);
        } else {
            parts.push('category-adjusted');
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
            <p class="studio-finance-program-card__revenue"><span>Expected revenue</span><strong>${escapeHtml(formatUsdFromCents(item.expectedCents))}</strong></p>
            <p class="studio-finance-program-card__slots">${escapeHtml(slotLine)}</p>
        </div>
    </button>`;
}

/**
 * @param {ReturnType<typeof buildStudioProgramFinanceRows>[number]} row
 */
function financeProgramTableRowHtml(row) {
    const categoryCell = `${applicantCategoryPillHtml(row.category, escapeHtml)} <span class="studio-finance-price-amount">${escapeHtml(formatUsdFromCents(row.priceCategoryCents))}</span>`;
    const depositCell = row.depositPaid
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
        <td><button type="button" class="studio-btn-ghost studio-finance-email-btn" data-finance-email-applicant="${escapeHtml(row.applicantId)}">Email</button></td>
    </tr>`;
}

/** @type {const} */
const FINANCE_TABLE_COL_COUNT = 18;

/**
 * @param {ReturnType<typeof buildStudioProgramFinanceRows>} rows
 * @param {string | null} selectedProgramId
 * @param {Map<string, ReturnType<typeof buildFinanceProgramCardModel>>} programCardById
 */
function financeProgramTableHtml(rows, selectedProgramId, programCardById) {
    let filterLabel = 'All active programs — slot-secured applicants';
    if (selectedProgramId) {
        const card = programCardById.get(selectedProgramId);
        filterLabel = card
            ? `Filtered: ${card.title}`
            : 'Filtered to one program';
    }
    const body =
        rows.length > 0
            ? rows.map((row) => financeProgramTableRowHtml(row)).join('')
            : `<tr><td colspan="${FINANCE_TABLE_COL_COUNT}">${selectedProgramId ? 'No slot-secured applicants for this program.' : 'No slot-secured applicants on active programs.'}</td></tr>`;
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
    const categoryTabs = visibleDomains.filter((d) => d.tab !== 'overview');

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
    /** @type {Map<string, ReturnType<typeof buildStudioProgramFinanceRows>[number]>} */
    let financeRowByApplicantId = new Map();
    /** @type {Map<string, object>} */
    let applicantById = new Map();
    const programsCanEdit = studioFinanceCategoryAccess('Programs').canEdit;
    /** @type {Map<string, { firstName: string, lastName: string, fullName: string, email: string }>} */
    let contactByPrincipal = new Map();
    /** @type {Record<string, unknown>} */
    let membershipRevenue = { ok: false };

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
            parts.push(comingSoonBlock('Programs', 'Residency deposits, plans, and balances (staff list API pending).'));
        }
        if (enabledChips.has('users') && studioFinanceCategoryAccess('Users').visible) {
            parts.push(`
                <div class="studio-finance-category-block" data-finance-category-block="Users">
                    <h3>Users — membership</h3>
                    <p class="studio-muted">Fusion / Join subscription status on the canister.</p>
                    ${formatMembershipRevenueStatHtml(membershipRevenue, escapeHtml, { compact: true })}
                    <div class="mpd-payments-overview-grid">
                        ${metricCard('Active', m.active, 'Active or trialing')}
                        ${metricCard('Past due', m.pastDue, 'Needs billing attention')}
                        ${metricCard('Exempt', m.exempt, 'Manual complimentary')}
                        ${metricCard('No subscription', m.none, 'No Stripe status')}
                    </div>
                </div>
            `);
        }
        if (enabledChips.has('products') && studioFinanceCategoryAccess('Products').visible) {
            parts.push(comingSoonBlock('Products', 'Edition checkout and object sales.'));
        }
        if (enabledChips.has('promotions') && studioFinanceCategoryAccess('Promotions').visible) {
            parts.push(comingSoonBlock('Promotions', 'Advertising and promotional campaigns.'));
        }

        overviewSections.innerHTML =
            parts.length > 0
                ? parts.join('')
                : '<p class="studio-muted">Turn on at least one category above to see overview metrics.</p>';
    };

    const renderUsersRevenueStat = () => {
        if (!usersRevenueStat) return;
        usersRevenueStat.innerHTML = formatMembershipRevenueStatHtml(membershipRevenue, escapeHtml);
    };

    const renderUsersSummary = () => {
        if (!usersSummary) return;
        const m = countMembershipMetrics(allAccounts);
        usersSummary.innerHTML = `
            <section class="member-profile-dashboard__card">
                <div class="mpd-payments-section-head">
                    <h3>Membership summary</h3>
                    <span class="studio-muted">${m.total} accounts on canister</span>
                </div>
                <div class="mpd-payments-overview-grid">
                    ${metricCard('Active', m.active, 'Active or trialing')}
                    ${metricCard('Past due', m.pastDue, 'Needs billing attention')}
                    ${metricCard('Exempt', m.exempt, 'Manual complimentary')}
                    ${metricCard('No subscription', m.none, 'No Stripe status')}
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
            usersTbody.innerHTML = `<tr><td colspan="7">${allAccounts.length ? 'No accounts match filters.' : 'No accounts on this canister yet.'}</td></tr>`;
            return;
        }

        usersTbody.innerHTML = rows
            .map((r) => {
                const contact = contactByPrincipal.get(String(r.principal || '')) || null;
                const name = contact?.fullName || [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') || '—';
                const email = contact?.email || '—';
                const renews = formatSubscriptionPeriodEnd(r.stripeCurrentPeriodEnd);
                const custId = String(r.stripeCustomerId || '').trim();
                const subId = String(r.stripeSubscriptionId || '').trim();
                const custUrl = studioStripeDashboardCustomerUrl(custId, pk);
                const stripeCell = custUrl
                    ? `<a class="mpd-membership-text-link" href="${escapeHtml(custUrl)}" target="_blank" rel="noopener noreferrer">Customer</a>${subId ? ` · <span class="studio-muted" title="${escapeHtml(subId)}">Sub</span>` : ''}`
                    : '<span class="studio-muted">—</span>';
                const membershipLabel = r.membershipExemptManual
                    ? 'Exempt (manual)'
                    : studioMembershipStatusLabel(r.stripeSubscriptionStatus);
                return `<tr>
                    <td>${studioMembershipBadgeHtml(r, escapeHtml)}</td>
                    <td>${escapeHtml(name)}</td>
                    <td>${escapeHtml(email)}</td>
                    <td>${escapeHtml(membershipLabel)}</td>
                    <td><span class="studio-muted" title="${escapeHtml(r.stripeCurrentPeriodEnd || '')}">${escapeHtml(renews)}</span></td>
                    <td>${stripeCell}</td>
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
            activeOnly: true,
        });

    const renderProgramRevenueStat = () => {
        if (!programRevenueStat) return;
        const rows = getFilteredFinanceRows();
        programRevenueStat.innerHTML = financeProgramRevenueStatHtml(
            rows,
            selectedProgramId,
            programCardById,
        );
    };

    const renderProgramTable = () => {
        if (!programTableWrap) return;
        const rows = getFilteredFinanceRows();
        financeRowByApplicantId = new Map(rows.map((row) => [row.applicantId, row]));
        programTableWrap.innerHTML = financeProgramTableHtml(rows, selectedProgramId, programCardById);
        renderProgramRevenueStat();
    };

    const reloadAllFinanceData = async () => {
        const [applicants, bundle] = await Promise.all([
            getApplicants(),
            getStaffProgramPaymentsFinanceStudio(),
        ]);
        allApplicants = Array.isArray(applicants) ? applicants : [];
        paymentIndex = buildProgramPaymentIndex(bundle);
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
        renderProgramCards();
    };

    const reloadFinancePayments = async () => {
        const bundle = await getStaffProgramPaymentsFinanceStudio();
        paymentIndex = buildProgramPaymentIndex(bundle);
        renderProgramCards();
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
            const ownFlightNote = row.ownFlight
                ? '<p class="studio-muted mpd-field-hint">Applicant selected Own Flight (pricing credit applied in Price category).</p>'
                : '';
            const editForm = programsCanEdit
                ? `<form class="studio-finance-ledger-add" id="studio-finance-tickets-form">
                    <h4 class="studio-subheading">Flight / ticket cost</h4>
                    <label class="studio-field"><span>Amount (USD)</span>
                        <input type="text" class="studio-input" id="studio-finance-tickets-amount" inputmode="decimal" placeholder="0.00" value="${escapeHtml(flightUsd === '0.00' ? '' : flightUsd)}" />
                    </label>
                    <div class="studio-modal-actions">
                        <button type="submit" class="studio-btn-primary">Save ticket cost</button>
                        <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Close</button>
                    </div>
                    <p class="studio-muted mpd-field-hint" id="studio-finance-ledger-status" role="status"></p>
                </form>`
                : '';
            const inner = `<div class="studio-finance-ledger-modal">${ownFlightNote}${editForm || '<p class="studio-muted">View only.</p>'}</div>`;
            const { close, root } = openStudioModal(inner, { title, wide: true });
            const form = root.querySelector('#studio-finance-tickets-form');
            if (!(form instanceof HTMLFormElement) || !applicant) return;
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const statusEl = root.querySelector('#studio-finance-ledger-status');
                const amountInput = root.querySelector('#studio-finance-tickets-amount');
                const flightCostCents = parseUsdInputToCents(
                    amountInput instanceof HTMLInputElement ? amountInput.value : '',
                );
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
                if (statusEl) statusEl.textContent = 'Saving…';
                try {
                    const payloadJson = mergeApplicantStaffFields(
                        staffFieldsFromPayload(row.payloadJson, { flightCostCents }),
                        row.payloadJson,
                    );
                    await upsertApplicantStudio({ ...applicant, payloadJson });
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
            ? row.ledger.filter((entry) => isLedgerPaymentRow(entry))
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
                          const badge =
                              src === 'staff'
                                  ? '<span class="studio-finance-ledger-badge studio-finance-ledger-badge--staff">Staff</span>'
                                  : src === 'paypal'
                                    ? '<span class="studio-finance-ledger-badge studio-finance-ledger-badge--paypal">PayPal</span>'
                                    : '<span class="studio-finance-ledger-badge studio-finance-ledger-badge--stripe">Stripe</span>';
                          const date = String(entry.createdAt || '').slice(0, 10) || '—';
                          const note = String(entry.staffNote || '').trim();
                          const amountCell = isPayments
                              ? formatUsdFromCents(entry.amountCents)
                              : formatUsdFromCents(entry.feeCents);
                          return `<tr>
                            <td>${badge}</td>
                            <td>${escapeHtml(ledgerRowTypeLabel(entry))}</td>
                            <td>${escapeHtml(amountCell)}</td>
                            <td>${escapeHtml(date)}</td>
                            <td>${note ? escapeHtml(note) : '—'}</td>
                          </tr>`;
                      })
                      .join('')
                : `<tr><td colspan="5">${isPayments ? 'No payment rows yet.' : isTravel ? 'No travel fee rows yet.' : 'No fee rows yet.'}</td></tr>`;
        const amountHeader = isPayments ? 'Amount' : 'Fee';
        let addForm = '';
        if (programsCanEdit) {
            if (isPayments) {
                addForm = `<form class="studio-finance-ledger-add" id="studio-finance-ledger-add-form">
                    <h4 class="studio-subheading">Add manual payment</h4>
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
                        <button type="submit" class="studio-btn-primary">Save payment</button>
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

    const toggleProgramFilter = (programId) => {
        const id = String(programId || '').trim();
        if (!id || !programCardById.has(id)) return;
        if (selectedProgramId === id) {
            selectedProgramId = null;
            saveSelectedProgramId(null);
        } else {
            selectedProgramId = id;
            saveSelectedProgramId(id);
        }
        syncProgramCardSelection();
        renderProgramTable();
    };

    const renderProgramCards = () => {
        /** @type {Record<'active' | 'past' | 'upcoming', ReturnType<typeof buildFinanceProgramCardModel>[]>} */
        const buckets = { active: [], past: [], upcoming: [] };

        programCardById = new Map();
        const sortedPrograms = [...allPrograms].sort(sortFinanceProgramRows);
        for (const row of sortedPrograms) {
            const applicants = applicantsByProgramId.get(String(row.id || '')) || [];
            const model = buildFinanceProgramCardModel(row, applicants, paymentIndex);
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
        const emailBtn =
            e.target instanceof Element ? e.target.closest('[data-finance-email-applicant]') : null;
        if (emailBtn) {
            const applicantId = emailBtn.getAttribute('data-finance-email-applicant');
            const applicant = applicantId ? applicantById.get(applicantId) : null;
            if (applicant) {
                void openApplicantEmailModal(applicant, { onSent: () => reloadAllFinanceData() });
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
        const btn = e.target instanceof Element ? e.target.closest('[data-finance-program-id]') : null;
        if (!btn) return;
        const id = btn.getAttribute('data-finance-program-id');
        if (id) toggleProgramFilter(id);
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
                membershipRevenue = await fetchMembershipRevenueSummary();
                if (!membershipRevenue.ok) {
                    const reason =
                        typeof membershipRevenue.reason === 'string'
                            ? membershipRevenue.reason
                            : typeof membershipRevenue.error === 'string'
                              ? membershipRevenue.error
                              : 'Membership revenue unavailable';
                    loadWarnings.push(reason);
                }
            } catch (revenueErr) {
                membershipRevenue = { ok: false };
                loadWarnings.push(
                    revenueErr instanceof Error ? revenueErr.message : String(revenueErr),
                );
            }
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
            const [programs, applicants, paymentsBundle] = await Promise.all([
                getPrograms(),
                getApplicants(),
                getStaffProgramPaymentsFinanceStudio(),
            ]);
            allPrograms = Array.isArray(programs) ? programs : [];
            allApplicants = Array.isArray(applicants) ? applicants : [];
            paymentIndex = buildProgramPaymentIndex(paymentsBundle);
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
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            allPrograms = [];
            allApplicants = [];
            applicantsByProgramId = new Map();
            loadWarnings.push(msg);
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
    } else if (programTableWrap) {
        programTableWrap.innerHTML = '';
    }
    setFinanceTab(defaultTab());

    if (!visibleCategories.length) {
        setStatus('Finance is open but no category scopes are enabled for your role.');
    }
}
