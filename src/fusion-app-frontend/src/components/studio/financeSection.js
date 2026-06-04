/**
 * Studio → Finance: overview dashboard + domain tabs (Programs, Users, Products, Promotions).
 */
import '../../styles/memberProfileDashboard.css';
import '../../styles/studioFinanceDashboard.css';
import {
    adminListAccountContactsForStudio,
    getAccountsForStudio,
} from '../../utils/database.js';
import {
    countMembershipMetrics,
    formatSubscriptionPeriodEnd,
    studioMembershipBadgeHtml,
    studioMembershipFilterMatch,
    studioMembershipStatusLabel,
    studioStripeDashboardCustomerUrl,
} from '../../utils/studioMembershipPresentation.js';
import { shortPrincipalDisplay } from '../../utils/studioPlainForms.js';
import {
    studioFeatureAccess,
    studioFinanceCategoryAccess,
    studioFinanceVisibleCategories,
} from '../../utils/studioShellState.js';
import { studioIconHref } from '../../utils/studioIconRegistry.js';
import { getStripePublishableKeyResolved } from '../../utils/studioServicesConfig.js';

const CHIP_STORAGE_KEY = 'studio-finance-overview-chips-v1';

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
                <div class="mpd-program-tabs" role="tablist" aria-label="Finance sections">${tabs}</div>
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
                    ${placeholderPanelHtml(
                        'Programs',
                        'Program deposits, payment plans, and residency balances will mirror the member Payments experience.',
                        [
                            'Outstanding balances and ledger history per accepted applicant',
                            'Staff views tied to program ID and application reference',
                            'Stripe PaymentIntent and plan status from the canister',
                        ],
                    )}
                </div>
                <div class="mpd-program-tab-panel" id="studio-finance-panel-users" role="tabpanel" aria-labelledby="studio-finance-tab-users" data-finance-panel="users" hidden>
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
 * @param {HTMLElement} mainEl
 */
export async function initFinance(mainEl) {
    const statusEl = mainEl.querySelector('#studio-finance-status');
    const loadingEl = mainEl.querySelector('#studio-finance-loading');
    const emptyEl = mainEl.querySelector('#studio-finance-empty');
    const workspaceEl = mainEl.querySelector('#studio-finance-workspace');
    const overviewSections = mainEl.querySelector('#studio-finance-overview-sections');
    const usersSummary = mainEl.querySelector('#studio-finance-users-summary');
    const usersTbody = mainEl.querySelector('#studio-finance-users-tbody');
    const membershipFilter = mainEl.querySelector('#studio-finance-users-membership');
    const usersSearch = mainEl.querySelector('#studio-finance-users-search');
    const chipHint = mainEl.querySelector('#studio-finance-chip-hint');

    const setStatus = (msg) => {
        if (statusEl) statusEl.textContent = msg || '';
    };

    const visibleDomains = FINANCE_DOMAINS.filter(domainTabVisible);
    const visibleCategories = studioFinanceVisibleCategories();
    const categoryTabs = visibleDomains.filter((d) => d.tab !== 'overview');

    if (!studioFeatureAccess('finance').visible) {
        if (loadingEl) loadingEl.hidden = true;
        if (emptyEl) emptyEl.hidden = false;
        if (workspaceEl) workspaceEl.hidden = true;
        return;
    }

    if (loadingEl) loadingEl.hidden = false;
    if (emptyEl) emptyEl.hidden = true;
    if (workspaceEl) workspaceEl.hidden = true;

    /** @type {Awaited<ReturnType<typeof getAccountsForStudio>>} */
    let allAccounts = [];
    /** @type {Map<string, { firstName: string, lastName: string, fullName: string, email: string }>} */
    let contactByPrincipal = new Map();

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
        setStatus('');
    } catch (e) {
        setStatus(e instanceof Error ? e.message : String(e));
        allAccounts = [];
    }

    if (loadingEl) loadingEl.hidden = true;
    if (workspaceEl) workspaceEl.hidden = false;

    syncChipButtons();
    renderOverview();
    renderUsersSummary();
    renderUsersTable();
    setFinanceTab(defaultTab());

    if (!visibleCategories.length) {
        setStatus('Finance is open but no category scopes are enabled for your role.');
    }
}
