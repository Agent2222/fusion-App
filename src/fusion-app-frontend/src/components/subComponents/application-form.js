/**
 * Program application: single-page form (contact, portfolio, application fee + Stripe).
 */

import {
    assertProgramApplicationSubmissionReady,
    applicationFeeDueForCaller,
    defaultApplicationPaymentGlobal,
    ensureMyLinkedArtistProfile,
    ensureMyLinkedArtistProfileForApplication,
    getMembershipAccessForCaller,
    getMyArtistRecord,
    PROGRAM_APPLICATION_ERROR_CODE,
    submitProgramApplication,
} from '../../utils/database.js';
import { getAuthSnapshot } from '../../utils/icAuth.js';
import {
    APPLICATION_FEE_GUEST_CENTS,
    APPLICATION_FEE_MEMBER_CENTS,
} from '../../utils/applicationFeePolicy.js';
import { emptyApplicationPaymentOptions } from '../../utils/programApplicationFormContext.js';
import { MEMBERSHIP_TIER_META, planIdForTier } from '../../utils/membershipPlanChange.js';
import {
    clearPendingPaymentEmailLocal,
    confirmPayPalOneTimePayment,
    createPayPalOneTimePayment,
    createPaymentIntent,
    createSubscription,
    FUSION_PENDING_APPLICATION_SUB_KEY,
    getIntegrationBaseUrl,
    getStoredBillingEmailForPrincipal,
    linkPayPalSubscriptionToPrincipal,
    linkSubscriptionToPrincipal,
    mapIntegrationUserMessage,
    readPendingPaymentEmailLocal,
    setPendingPaymentEmailLocal,
    setStoredBillingEmailForPrincipal,
    syncPayPalSubscription,
    syncSubscriptionFromStripe,
    syncSubscriptionFromStripeByEmail,
} from '../../utils/integrationApi.js';
import {
    mountPayPalAdvancedOneTimeCheckout,
    mountPayPalSubscriptionButtons,
} from '../../utils/paymentCheckout.js';
import {
    fetchPaymentConfig,
    getActiveProvider,
    paymentModeMismatch,
} from '../../utils/paymentProvider.js';
import { isLooseEmail } from '../../utils/programFormContact.js';
import {
    clearProgramApplicationDraft,
    getProgramApplicationDraft,
    saveProgramApplicationDraft,
} from '../../utils/programApplicationDraft.js';
import { getProfileSetupDraft } from '../../utils/profileSetupDraft.js';
import {
    PROGRAM_APPLICATION_VIEWPORT_TOP_GAP_PX,
    scrollElementTopToViewportGap,
} from '../../utils/scrollAnchorToViewportGap.js';
import {
    getPayPalClientIdResolved,
    getStripePublishableKeyResolved,
} from '../../utils/studioServicesConfig.js';
import posthog from 'posthog-js';
import { metaTrack } from '../../utils/metaPixel.js';
import { syncPosthogConversionPerson } from '../../utils/posthogConversionIdentity.js';
import paymentCardIcon from '../../assets/icons/fusion_svg_icons_b2/payment-card.svg';
import popularCrownIcon from '../../assets/icons/fusion_svg_icons_b2/popular-crown.svg';
import annualDiamondIcon from '../../assets/icons/fusion_svg_icons_b2/annual-diamond.svg';
import benefitCheckIcon from '../../assets/icons/fusion_svg_icons_b2/benefit-check.svg';
import calendarSlotsIcon from '../../assets/icons/fusion_svg_icons_b2/calendar-slots.svg';
import secureLockIcon from '../../assets/icons/fusion_svg_icons_b2/secure-lock.svg';

/** @type {Record<string, string>} */
const APP_FEE_ICONS = {
    paymentCard: paymentCardIcon,
    popularCrown: popularCrownIcon,
    annualDiamond: annualDiamondIcon,
    benefitCheck: benefitCheckIcon,
    calendarSlots: calendarSlotsIcon,
    secureLock: secureLockIcon,
};

/**
 * @param {string} iconUrl
 * @param {string} [extraClass]
 * @returns {string}
 */
function appFeeIconHtml(iconUrl, extraClass = '') {
    const cls = ['app-fee-icon', extraClass].filter(Boolean).join(' ');
    const url = String(iconUrl || '').replace(/"/g, '');
    return `<span class="${cls}" style="--app-fee-icon-url: url(&quot;${url}&quot;)" aria-hidden="true"></span>`;
}

const DEFAULT_PROGRAM_FORM_CTX = {
    applicationFeeLine: '',
    depositAmountDisplay: '',
    applicationDeadlineDisplay: '',
    whatsIncludedBody: '',
    feeNoticeItalic: '',
    selectionProcessOverride: '',
    detailsSectionId: 'programDetailsSection',
    /** @type {number | null} */
    applicationFeeAmountCents: null,
    applicationPaymentOptions: emptyApplicationPaymentOptions(),
    /** @type {number | null} */
    availableSlots: null,
    /** @type {number | null} */
    totalSlots: null,
};

/**
 * @param {string} raw
 * @returns {string}
 */
function normalizeWebsiteForPayload(raw) {
    const s = String(raw ?? '').trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith('//')) return `https:${s}`;
    return `https://${s}`;
}

/**
 * @param {unknown} links
 * @returns {string}
 */
function pickWebsiteFromProfileLinks(links) {
    if (!Array.isArray(links)) return '';
    const lower = (s) => String(s ?? '').toLowerCase();
    const preferred = links.find(
        (l) => l && typeof l === 'object' && lower(/** @type {{ type?: unknown }} */ (l).type) === 'website' && String(/** @type {{ url?: unknown }} */ (l).url ?? '').trim()
    );
    const row = preferred || links.find((l) => l && typeof l === 'object' && String(/** @type {{ url?: unknown }} */ (l).url ?? '').trim());
    return row && typeof row === 'object' ? String(/** @type {{ url?: unknown }} */ (row).url ?? '').trim() : '';
}

class ApplicationFormComponent extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        /** @type {Record<string, string | number | null | object>} */
        this._programFormContext = { ...DEFAULT_PROGRAM_FORM_CTX };
        /** Global EN/JA bullets from site settings (`applicationPaymentGlobal`). */
        this._applicationPaymentGlobal = defaultApplicationPaymentGlobal();
        /** @type {'one_time' | 'monthly' | 'quarterly' | 'annual' | 'member_fee' | null} */
        this._paymentPlan = null;
        /** Expand “Explore memberships” panel. */
        this._membershipsExpanded = false;
        /** After subscription checkout: monthly still needs member application fee. */
        this._checkoutPhase = /** @type {'subscription' | 'application_fee' | null} */ (null);
        /** @type {{ dueCents: number, reason: string, membershipTier: string, appCreditBalance: number } | null} */
        this._memberApplicationFee = null;
        /** User edited the form after load — drives SPA `data-unsaved` + `beforeunload`. */
        this._dirty = false;
        this._beforeUnloadHooked = false;
        /** @type {((e: BeforeUnloadEvent) => void) | null} */
        this._boundBeforeUnload = null;
        /** @type {import('@stripe/stripe-js').Stripe | null} */
        this._stripe = null;
        /** @type {import('@stripe/stripe-js').StripeElements | null} */
        this._stripeElements = null;
        /** @type {import('@stripe/stripe-js').StripeElement | null} */
        this._stripePaymentElement = null;
        this._stripePaymentReady = false;
        this._stripePrepareGen = 0;
        /** Fingerprint for reusing the same Stripe Elements session (subscription checkout). */
        this._stripePrepareKey = '';
        /** @type {string | null} */
        this._fusionPendingId = null;
        /** @type {string | null} */
        this._fusionSubscriptionId = null;
        /** PayPal one-time order id after card or wallet approval. */
        this._paypalOrderId = '';
        /** @type {{ usesCardFields: boolean, submit: () => Promise<void>, destroy: () => void } | null} */
        this._paypalCheckoutController = null;
        /** @type {AbortController | null} */
        this._wireAbort = null;
        /** User has a stored application for this `data-program-id` — hide fee UI; submit without Stripe. */
        this._alreadyApplied = false;
        /** Active member with $0 application fee due — skip payment UI. */
        this._membershipFeeWaived = false;
        /** Member owes member application fee only ($35) — no re-subscribe. */
        this._memberFeeOnly = false;
        /** Last `getMembershipAccessForCaller` result for analytics. */
        this._membershipGate = 'unknown';
        /** After `program_application_started` is sent (on application reveal), avoid sending again. */
        this._hasCapturedProgramApplicationStarted = false;
    }

    get active() {
        return this.getAttribute('active') || false;
    }

    set active(val) {
        const next = val === true || val === 'true' ? 'true' : 'false';
        if (this.getAttribute('active') === next) return;
        this.setAttribute('active', next);
    }

    static get observedAttributes() {
        return ['active', 'data-program-id'];
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if ((prop === 'active' || prop === 'data-program-id') && oldVal !== newVal) {
            this.render();
            this._afterRender();
        }
    }

    /**
     * @param {Record<string, string | number | null | undefined | object>} ctx
     */
    setProgramFormContext(ctx) {
        this._programFormContext = { ...DEFAULT_PROGRAM_FORM_CTX, ...this._programFormContext, ...ctx };
        if (this.shadowRoot) this._hydrateProgramContextInDom();
    }

    /**
     * @param {{ en?: { whatsIncludedBullets?: string[] }, ja?: { whatsIncludedBullets?: string[] } } | null | undefined} obj
     */
    setApplicationPaymentGlobalContext(obj) {
        const base = defaultApplicationPaymentGlobal();
        if (obj && typeof obj === 'object') {
            for (const loc of ['en', 'ja']) {
                const b = obj[loc];
                if (!b || typeof b !== 'object' || Array.isArray(b)) continue;
                const row = /** @type {Record<string, unknown>} */ (b);
                if (Array.isArray(row.whatsIncludedBullets)) {
                    base[loc].whatsIncludedBullets = row.whatsIncludedBullets
                        .map((x) => String(x ?? '').trim())
                        .filter(Boolean);
                }
                for (const key of [
                    'securePaymentLine',
                    'choosePaymentHeading',
                    'choosePaymentSubtext',
                    'paymentPlaceholderExtended',
                    'paymentPlaceholderTitle',
                    'paymentPlaceholderSub',
                    'footerThankYou',
                    'footerQuestionsPrefix',
                    'footerContactUs',
                ]) {
                    const v = String(row[key] ?? '').trim();
                    if (v) base[loc][key] = v;
                }
            }
        }
        this._applicationPaymentGlobal = base;
    }

    _hydrateProgramContextInDom() {
        const root = this.shadowRoot;
        if (!root) return;
        const L = this._labels();
        const ctx = this._programFormContext;

        const introEl = root.querySelector('#app-selection-intro');
        if (introEl) {
            const override = String(ctx.selectionProcessOverride ?? '').trim();
            if (override) {
                introEl.innerHTML = override;
                introEl.style.whiteSpace = '';
            } else {
                const dep = String(ctx.depositAmountDisplay ?? '').trim() || '—';
                const dl = String(ctx.applicationDeadlineDisplay ?? '').trim() || '—';
                introEl.innerHTML = this._selectionProcessTemplateHtml(L, dep, dl);
            }
        }

        this._hydratePaymentPlanCards();
        this._syncCohortSlotsInDom(root);
        this._syncPaymentCheckoutVisibility();
    }

    /**
     * Same numbers as the confirmed-artists strip + program details sidebar when `availableSlots` / `totalSlots` are set.
     * @param {ShadowRoot} root
     */
    _syncCohortSlotsInDom(root) {
        const L = this._labels();
        const ctx = this._programFormContext;
        const av = ctx?.availableSlots;
        const tot = ctx?.totalSlots;
        const show =
            typeof av === 'number' &&
            Number.isFinite(av) &&
            typeof tot === 'number' &&
            Number.isFinite(tot);
        const top = root.querySelector('#app-cohort-slots-top');
        const pay = root.querySelector('#app-cohort-slots-payment');
        const a = show ? String(Math.max(0, Math.floor(av))) : '';
        const b = show ? String(Math.max(0, Math.floor(tot))) : '';
        const tpl = String(L.slotsRemainingValue || '').trim();
        const html = show ? tpl.replace(/\{\{a\}\}/g, a).replace(/\{\{b\}\}/g, b) : '';
        const countTpl = String(L.slotsCountValue || '{{a}} of {{b}}');
        const countText = show ? countTpl.replace(/\{\{a\}\}/g, a).replace(/\{\{b\}\}/g, b) : '';
        const slotsLabel = String(L.slotsRemainingLabel || 'Slots remaining');
        for (const el of [top, pay]) {
            if (!el) continue;
            if (!show || !html) {
                el.setAttribute('hidden', '');
                el.innerHTML = '';
            } else if (el.id === 'app-cohort-slots-payment') {
                el.removeAttribute('hidden');
                el.innerHTML =
                    `<span class="app-fee-meta-icon-box">${appFeeIconHtml(APP_FEE_ICONS.calendarSlots, 'app-fee-icon app-fee-icon--sm')}</span>` +
                    `<span class="app-fee-meta-slots-lines">` +
                    `<span class="app-fee-meta-slots-count">${countText}</span>` +
                    `<span class="app-fee-meta-slots-label">${slotsLabel}</span>` +
                    `</span>`;
            } else {
                el.removeAttribute('hidden');
                el.innerHTML = html;
            }
        }
    }

    /**
     * Payment mounts when a concrete plan is selected.
     * "Pay and submit" is for one-time / member fee only; membership plans use the
     * subscription widget, then reveal "Submit application" after approval.
     */
    _syncPaymentCheckoutVisibility() {
        const root = this.shadowRoot;
        if (!root) return;
        const plan = this._paymentPlan;
        const isMembershipPlan =
            plan === 'monthly' || plan === 'quarterly' || plan === 'annual';
        const showCheckout =
            plan === 'one_time' || isMembershipPlan || plan === 'member_fee';
        const showPaySubmit =
            plan === 'one_time' ||
            plan === 'member_fee' ||
            (isMembershipPlan && !!this._fusionSubscriptionId);
        for (const id of ['app-payment-placeholder', 'app-payment-hint-wrap']) {
            const el = root.querySelector(`#${id}`);
            if (el instanceof HTMLElement) {
                el.hidden = !showCheckout;
            }
        }
        const payBtn = root.querySelector('#app-pay-submit');
        if (payBtn instanceof HTMLElement) {
            payBtn.hidden = !showPaySubmit;
        }
        const slotWrap = root.querySelector('.app-payment-slot-wrap');
        if (slotWrap instanceof HTMLElement) {
            slotWrap.hidden = !showCheckout;
        }
        if (!showCheckout) {
            this._teardownStripePayment();
        }
    }

    /**
     * @returns {'en' | 'ja'}
     */
    _formLocale() {
        return typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
    }

    /**
     * @returns {Record<string, unknown>}
     */
    _paymentGlobalLocaleBlock() {
        const locale = this._formLocale();
        return (
            this._applicationPaymentGlobal[locale] ||
            this._applicationPaymentGlobal.en ||
            defaultApplicationPaymentGlobal().en
        );
    }

    /**
     * @param {Record<string, unknown>} base
     * @returns {Record<string, unknown>}
     */
    _mergePaymentChromeLabels(base) {
        const g = this._paymentGlobalLocaleBlock();
        for (const key of [
            'securePaymentLine',
            'choosePaymentHeading',
            'choosePaymentSubtext',
            'paymentPlaceholderExtended',
            'paymentPlaceholderTitle',
            'paymentPlaceholderSub',
            'footerThankYou',
            'footerQuestionsPrefix',
            'footerContactUs',
        ]) {
            const v = String(g[key] ?? '').trim();
            if (v) base[key] = v;
        }
        return base;
    }

    /**
     * @param {string} text
     * @returns {string}
     */
    _bulletItemHtml(text) {
        return `${appFeeIconHtml(APP_FEE_ICONS.benefitCheck, 'app-fee-icon app-fee-icon--check')}<span>${String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')}</span>`;
    }

    /**
     * @param {Element | null} ul
     * @param {string[]} items
     * @param {{ pickPlan?: boolean, emptyText?: string, pickPlanClass?: string, emptyClass?: string }} [opts]
     */
    _fillBulletList(ul, items, opts = {}) {
        if (!ul) return;
        ul.innerHTML = '';
        const filtered = items.map((s) => String(s ?? '').trim()).filter(Boolean);
        if (filtered.length === 0 && opts.pickPlan) {
            const li = document.createElement('li');
            li.className = opts.pickPlanClass || 'app-whats-included-empty app-whats-included-pickplan';
            li.textContent = opts.emptyText || '';
            ul.appendChild(li);
            return;
        }
        if (filtered.length === 0 && opts.emptyText) {
            const li = document.createElement('li');
            li.className = opts.emptyClass || 'app-whats-included-empty';
            li.textContent = opts.emptyText;
            ul.appendChild(li);
            return;
        }
        for (const text of filtered) {
            const li = document.createElement('li');
            li.innerHTML = this._bulletItemHtml(text);
            ul.appendChild(li);
        }
    }

    /**
     * @param {number | null | undefined} cents
     * @returns {string}
     */
    _formatUsdFromCents(cents) {
        if (typeof cents !== 'number' || !Number.isFinite(cents) || cents < 0) return '—';
        try {
            return new Intl.NumberFormat(
                typeof navigator !== 'undefined' ? navigator.language : 'en-US',
                { style: 'currency', currency: 'USD' }
            ).format(cents / 100);
        } catch {
            return `$${(cents / 100).toFixed(2)}`;
        }
    }

    /**
     * @returns {number | null}
     */
    _guestApplicationFeeCents() {
        const centsRaw = this._programFormContext.applicationFeeAmountCents;
        if (typeof centsRaw === 'number' && Number.isFinite(centsRaw) && centsRaw >= 50) {
            return Math.round(centsRaw);
        }
        return APPLICATION_FEE_GUEST_CENTS;
    }

    /**
     * One-time cents for the current checkout step.
     * @returns {number | null}
     */
    _oneTimeCheckoutCents() {
        if (this._memberFeeOnly || this._paymentPlan === 'member_fee') {
            return APPLICATION_FEE_MEMBER_CENTS;
        }
        if (this._paymentPlan === 'one_time') {
            return this._guestApplicationFeeCents();
        }
        return null;
    }

    /**
     * Guest one-time and member $35 fee need a one-time PayPal mount.
     * Monthly application uses the bundled subscription plan (no second charge).
     * @returns {boolean}
     */
    _planNeedsOneTimeCheckout() {
        return this._oneTimeCheckoutCents() != null;
    }

    /**
     * Membership plans (and waived member) can submit after subscription with no second charge.
     * @returns {boolean}
     */
    _planSubmitWithoutOneTime() {
        if (this._membershipFeeWaived) return true;
        if (
            this._paymentPlan === 'monthly' ||
            this._paymentPlan === 'quarterly' ||
            this._paymentPlan === 'annual'
        ) {
            return !!this._fusionSubscriptionId;
        }
        return false;
    }

    /**
     * Fallback bullet when a plan has no includedBullets (CMS subtext lines render separately).
     * @param {'monthly' | 'quarterly' | 'annual'} tier
     * @returns {string}
     */
    _membershipEntitlementCopy(tier) {
        const L = this._labels();
        if (tier === 'monthly') return L.planMonthlyEntitlement;
        if (tier === 'quarterly') return L.planQuarterlyEntitlement;
        return L.planAnnualEntitlement;
    }

    /**
     * @param {Element | null} el
     * @param {string} text
     */
    _setPlanSubLine(el, text) {
        if (!(el instanceof HTMLElement)) return;
        const t = String(text ?? '').trim();
        el.textContent = t;
        el.hidden = !t;
    }

    _hydratePaymentPlanCards() {
        const root = this.shadowRoot;
        if (!root) return;
        const L = this._labels();
        const apo = this._programFormContext.applicationPaymentOptions;
        const o =
            apo && typeof apo === 'object'
                ? apo
                : /** @type {Record<string, { title?: string, displayPrice?: string, subtext?: string, subtext2?: string, includedBullets?: string[] }>} */ ({});
        const guestCents = this._guestApplicationFeeCents();

        const primaryBtn = root.querySelector('[data-app-payment-plan="one_time"]');
        const primaryTitle = root.querySelector('#app-plan-one-time-title');
        const primaryPrice = root.querySelector('#app-plan-one-time-price');
        const primarySub = root.querySelector('#app-plan-one-time-sub');
        const primarySub2 = root.querySelector('#app-plan-one-time-sub2');
        const one = o.one_time || {};
        const dispOne = String(one.displayPrice ?? '').trim();
        const oneSub = String(one.subtext ?? '').trim();
        const oneSub2 = String(one.subtext2 ?? '').trim();
        if (primaryTitle) {
            const priceStr = dispOne || this._formatUsdFromCents(guestCents);
            const titleBase = String(one.title ?? '').trim() || L.planOneTimeTitle;
            primaryTitle.textContent = titleBase.includes('{{price}}')
                ? titleBase.replace('{{price}}', priceStr)
                : `${titleBase} – ${priceStr}`;
        }
        if (primaryPrice) {
            primaryPrice.textContent = dispOne || this._formatUsdFromCents(guestCents);
        }
        if (primarySub) {
            primarySub.textContent = oneSub || L.planOneTimeSub;
        }
        this._setPlanSubLine(primarySub2, oneSub2);
        if (primaryBtn instanceof HTMLElement) {
            const unavailable = guestCents == null;
            primaryBtn.toggleAttribute('disabled', unavailable);
            primaryBtn.classList.toggle('is-unavailable', unavailable);
            primaryBtn.title = unavailable ? L.oneTimePlanUnavailable : '';
        }

        const productCard = root.querySelector('#app-fee-product-card');
        const productPrice = root.querySelector('#app-fee-product-price');
        const productTitle = root.querySelector('#app-fee-product-title');
        if (productCard instanceof HTMLElement) {
            productCard.hidden = !!this._memberFeeOnly;
        }
        if (productPrice) {
            productPrice.textContent =
                dispOne || this._formatUsdFromCents(guestCents) || '$50';
        }
        if (productTitle) {
            const titleRaw = String(one.title ?? '').trim();
            productTitle.textContent = titleRaw
                ? titleRaw.replace(/\{\{price\}\}/g, '').replace(/[–—-]\s*$/, '').trim() ||
                  L.productCardTitle
                : L.productCardTitle || 'Residency application';
        }

        const exploreToggle = root.querySelector('#app-explore-memberships-toggle');
        if (exploreToggle instanceof HTMLElement) {
            exploreToggle.textContent = this._membershipsExpanded
                ? L.exploreMembershipsCollapse
                : L.exploreMembershipsExpand;
            exploreToggle.setAttribute('aria-expanded', this._membershipsExpanded ? 'true' : 'false');
            exploreToggle.hidden = !!this._memberFeeOnly;
        }

        const membershipPanel = root.querySelector('#app-membership-plans-panel');
        if (membershipPanel instanceof HTMLElement) {
            membershipPanel.hidden = !this._membershipsExpanded || !!this._memberFeeOnly;
        }

        /** @type {Array<'monthly' | 'quarterly' | 'annual'>} */
        const tiers = ['monthly', 'quarterly', 'annual'];
        for (const tier of tiers) {
            const legacy = tier === 'monthly' ? o.bimonthly : null;
            const slice = o[tier] || legacy || {};
            const meta = MEMBERSHIP_TIER_META[tier] || {};
            const titleEl = root.querySelector(`#app-plan-${tier}-title`);
            const priceEl = root.querySelector(`#app-plan-${tier}-price`);
            const everyEl = root.querySelector(`#app-plan-${tier}-every`);
            const sub2El = root.querySelector(`#app-plan-${tier}-sub2`);
            const bulletsEl = root.querySelector(`#app-plan-${tier}-bullets`);
            const defaultEvery =
                tier === 'monthly'
                    ? L.planMonthlyEvery
                    : tier === 'quarterly'
                      ? L.planQuarterlyEvery
                      : L.planAnnualEvery;
            const sub1 = String(slice.subtext ?? '').trim();
            const sub2 = String(slice.subtext2 ?? '').trim();
            if (titleEl) {
                titleEl.textContent = String(slice.title ?? '').trim() || meta.label || tier;
            }
            if (priceEl) {
                priceEl.textContent =
                    String(slice.displayPrice ?? '').trim() ||
                    (meta.priceLine ? meta.priceLine.replace(/ per .+$/, '') : '—');
            }
            // Studio "Subtext line 1" → under-price line; "Subtext line 2" → second caption.
            const everyText = sub1 || sub2 || defaultEvery;
            if (everyEl) {
                everyEl.textContent = everyText;
            }
            this._setPlanSubLine(sub2El, sub1 && sub2 && sub2 !== sub1 ? sub2 : '');
            const entitlement = this._membershipEntitlementCopy(tier);
            const bulletItems =
                Array.isArray(slice.includedBullets) && slice.includedBullets.length
                    ? slice.includedBullets
                    : [entitlement];
            this._fillBulletList(bulletsEl, bulletItems);
        }

        const memberFeeBanner = root.querySelector('#app-member-fee-only-banner');
        if (memberFeeBanner instanceof HTMLElement) {
            if (this._memberFeeOnly) {
                memberFeeBanner.removeAttribute('hidden');
                memberFeeBanner.textContent = L.memberFeeOnlyBanner.replace(
                    '{{fee}}',
                    this._formatUsdFromCents(APPLICATION_FEE_MEMBER_CENTS),
                );
            } else {
                memberFeeBanner.setAttribute('hidden', '');
            }
        }

        const memberCreditEl = root.querySelector('#app-member-credit-note');
        if (memberCreditEl instanceof HTMLElement) {
            // Credit-first path uses #app-credit-callout; keep this note for award-path block only.
            if (this._awardPathBlocked) {
                memberCreditEl.removeAttribute('hidden');
                memberCreditEl.textContent = L.awardPathBlocked || '';
            } else {
                memberCreditEl.setAttribute('hidden', '');
            }
        }

        this._syncCreditCalloutUi(L);
    }

    /**
     * Primary credit callout next to free submit (reason === 'credit' only).
     * @param {Record<string, string>} [labels]
     */
    _syncCreditCalloutUi(labels) {
        const root = this.shadowRoot;
        if (!root) return;
        const L = labels || this._labels();
        const callout = root.querySelector('#app-credit-callout');
        const bodyEl = root.querySelector('#app-credit-callout-body');
        const reason = String(this._memberApplicationFee?.reason || '');
        const bal = Number(this._memberApplicationFee?.appCreditBalance);
        const show =
            this._membershipFeeWaived &&
            !this._alreadyApplied &&
            !this._awardPathBlocked &&
            reason === 'credit' &&
            Number.isFinite(bal) &&
            bal >= 1;
        if (callout instanceof HTMLElement) {
            callout.toggleAttribute('hidden', !show);
        }
        if (show && bodyEl instanceof HTMLElement) {
            bodyEl.textContent = String(L.creditCalloutBody || L.memberQuarterlyCreditNote || '').replace(
                '{{count}}',
                String(bal),
            );
        }
    }

    /**
     * @param {Record<string, string>} L
     * @param {string} deposit
     * @param {string} deadline
     */
    _selectionProcessTemplateHtml(L, deposit, deadline) {
        const esc = (s) =>
            String(s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        const href = `#${this._programFormContext.detailsSectionId || 'programDetailsSection'}`;
        return `
<p class="app-selection-process-heading">${esc(L.selectionProcessTitle)}</p>
<p>${esc(L.selectionReview)}</p>
<p>${esc(L.selectionEmail)}</p>
<p>${esc(L.selectionFinal)}</p>
<p>${esc(String(L.selectionDepositLine || '').replace(/\{\{deposit\}\}/g, String(deposit)).replace(/\{\{deadline\}\}/g, String(deadline)))}</p>
<p>${esc(L.selectionSeeFaq)} <a href="${href}" class="app-inline-details-link">${esc(L.faqDetailsLinkText)}</a>.</p>
`.trim();
    }

    _labels() {
        const locale = typeof window.getLocale === 'function' ? window.getLocale() : 'en';
        if (locale === 'ja') {
            const jaLabels = {
                title: '応募フォーム',
                contactSectionTitle: '連絡先と所在地',
                portfolioSectionTitle: 'ポートフォリオ',
                applicationFeeHeading: '応募料',
                selectionProcessTitle: '選考プロセス',
                selectionReview:
                    '応募書類を拝見し、選考委員会が候補者を検討します。ポートフォリオ、経歴、レジデンシーへの適合を総合的に見ます。',
                selectionEmail:
                    '書類選考を通過した候補者には、メールで面談のご案内をお送りします。',
                selectionFinal:
                    '最終選考の結果は、メールでご連絡します。定員に達するまで複数回の募集を行う場合があります。',
                selectionDepositLine:
                    '参加が確定した場合、{{deposit}} のデポジットを {{deadline}} までにお支払いいただきます。',
                selectionSeeFaq: '日程や料金の詳細は',
                faqDetailsLinkText: 'FAQ とプログラム詳細',
                viewProgramDetails: 'プログラム詳細を見る',
                defaultFeeNoticeItalic:
                    '応募料は返金できません。選考の結果にかかわらず、Fusion プラットフォームのメンバーシップ特典が適用されます。',
                whatsIncludedEmpty: '（このプログラム用の説明がまだありません）',
                whatsIncludedSummary: '応募料に含まれるもの',
                whatsIncludedGlobalHeading: 'すべての応募に共通',
                whatsIncludedPlanHeading: 'この支払いオプションで含まれるもの',
                whatsIncludedPickPlan: 'プラン固有の内容を表示するには、上で支払い方法を選んでください。',
                whatsIncludedGlobalEmpty: '（まだグローバル項目がありません。Studio の Services → Subscription で設定できます。）',
                paymentFeeLead:
                    '下から支払い方法を選び、安全なフォームにカード情報を入力して応募を完了してください。',
                paymentPlanGroupLabel: '応募料の支払い方法',
                paymentPlaceholderNoSelection: '上のいずれかのオプションを選ぶと、カード入力フォームが表示されます。',
                choosePaymentHeading: '応募を完了する',
                choosePaymentSubtext: '一回限りの応募料を支払って続行してください。',
                productCardTitle: 'レジデンシー応募',
                productCardBadge: '一回払い',
                productCardBullets: [
                    '応募の審査・処理',
                    'このプログラムへの1回の提出',
                    '継続課金なし',
                    'メンバーシップ不要',
                ],
                includedFeatureLabels: [
                    '応募処理',
                    '提出レビュー',
                    'プログラム検討',
                    '応募サポート',
                ],
                securePaymentLine: '安全な決済 • 暗号化で保護',
                paymentPlaceholderTitle: '上のいずれかのオプションを選ぶと、安全なカード入力フォームが表示されます。',
                paymentPlaceholderSub: 'お支払い情報はここで安全に収集されます。',
                paymentPlaceholderExtended:
                    '上のいずれかのオプションを選ぶと、安全なカード入力フォームがここに表示されます。',
                footerThankYou:
                    'アーティストを支え、思慮深いグローバルなクリエイティブコミュニティづくりにご協力いただきありがとうございます。',
                footerQuestionsPrefix: 'ご不明点は',
                footerContactUs: 'お問い合わせ',
                suggestedBadge: 'おすすめ',
                planOneTimeTitle: 'レジデンシー応募 – {{price}}',
                planOneTimeSub: '応募のみ',
                exploreMembershipsExpand: 'メンバーシップを見る',
                exploreMembershipsCollapse: 'メンバーシップを閉じる',
                planMonthlyTitle: '月額＋応募',
                planMonthlyPriceLine: '$30',
                planMonthlyEvery: '月額',
                planMonthlyEntitlement: '初回請求に応募料込み、その後は月額 $30',
                planQuarterlyTitle: '四半期メンバーシップ',
                planQuarterlyPriceLine: '$75',
                planQuarterlyEvery: '四半期ごと',
                planQuarterlyEntitlement:
                    '四半期ごとに +1 積み上げ応募クレジット。残高 ≥ 1 なら無料、それ以外は $35',
                planAnnualTitle: '年間メンバーシップ',
                planAnnualPriceLine: '$260',
                planAnnualEvery: '年額',
                planAnnualEntitlement: '有効期間中は応募料込み',
                memberFeeOnlyBanner:
                    'メンバーシップは有効です。下記で {{fee}} の応募料をお支払いのうえ送信してください。',
                memberQuarterlyCreditNote: '今四半期の応募クレジット: {{count}}',
                monthlySubThenFeeHint:
                    'サブスクリプションが承認されました。送信して応募を完了してください。',
                subscriptionThenSubmitHint:
                    'サブスクリプションが承認されました。送信して応募を完了してください。',
                oneTimePlanUnavailable:
                    '一回払いの金額がプログラムに設定されていません。Studio で「Application fee amount (cents)」を設定してください。',
                selectPaymentPlanFirst: '支払いオプションを選んでください。',
                paymentStillLoading: '決済フォームの準備中です。しばらくお待ちください。',
                payAndSubmitApplication: '支払って応募を送信',
                paymentSupportPrefix: 'ご不明点は ',
                paymentSupportSuffix: ' までお問い合わせください。',
                emailRequiredForPayment: '決済の前に、有効なメールアドレスをフォーム上部に入力してください。',
                lead1: '連絡先と所在地を入力してください。',
                lead2:
                    '正解よりも、あなたの視点や文脈を知りたいと考えています。率直にご記入のうえ、下の応募料でお支払い・送信を完了してください。',
                lead2MemberFeeWaived:
                    'Fusion メンバーのため、応募料は含まれています。内容を入力して、下のボタンから応募を送信してください。',
                lead2UsingCredit:
                    '応募クレジットで送信します。内容を確認して、下のボタンから応募してください。',
                memberFeeWaivedBanner:
                    'Fusion メンバーシップに応募料が含まれます。カードでのお支払いは不要です。',
                creditCalloutEyebrow: '応募クレジット',
                creditCalloutTitle: '応募クレジットを1回使用します',
                creditCalloutBody:
                    'この送信で応募クレジットを1回使います（送信前の残高: {{count}}）。お支払いは不要です。',
                submitApplicationOnly: '応募を送信',
                lead2AlreadyApplied:
                    '応募内容を更新して保存できます。追加の応募料はかかりません。',
                firstName: '名（ファーストネーム）',
                lastName: '姓（ラストネーム）',
                email: 'メールアドレス',
                country: '国',
                stateProvince: '州 / 省 / 都道府県（任意）',
                city: '市区町村',
                step0FillRequired: '名・姓・メール・国・市区町村を入力してください。',
                step0InvalidEmail: '有効なメールアドレスを入力してください。',
                validationTitle: '入力が必要です',
                validationBody: '続ける前に、次の必須項目を入力してください：',
                validationContinue: '続ける',
                website: 'あなたの世界をどこで体験できますか？',
                websiteByline: '（ウェブサイト、ポートフォリオ、作品を置いている場所 — リンク可）',
                discipline: 'いま、実践をどう定義していますか？',
                disciplineByline: '（分野や、やり方の呼び方 — カテゴリに当てはまらなくても構いません）',
                /** Suggestions only — free text is always allowed (`<datalist>`). */
                disciplineDatalistOptions: [
                    '絵画',
                    'ドローイング',
                    '版画',
                    '彫刻',
                    'インスタレーション',
                    '写真',
                    '映像 / フィルム',
                    '音楽 / サウンド',
                    'パフォーマンス',
                    'ダンス',
                    'テキスタイル / ファッション',
                    'デザイン',
                    'デジタル / メディアアート',
                    '文学',
                    '建築',
                    '研究型の実践',
                    '複合メディア',
                    'その他（自由記述）',
                ],
                slotsRemainingValue: '残り <strong>{{a}}</strong> / 全 <strong>{{b}}</strong> 枠',
                slotsCountValue: '{{a}} / {{b}}',
                slotsRemainingLabel: '残り枠',
                bioStatement: 'アーティストとして、ひとりの人として、あなたについて教えてください。',
                bioStatementByline: '（短い経歴でも、もっと個人的なことでも — 正直に書ける方）',
                exploration: 'いま探求・問いかけ・変化の途中にあることは何ですか？',
                explorationByline: '（制作や生活で、いま前に引っ張られているもの）',
                residencyGoals: 'このレジデンシーに参加したら、内面でも外面でも、何を持ち帰りたいですか？',
                residencyGoalsByline: '（作品、視点の変化、つながり、言葉にしにくいものでも）',
                submitError: '送信に失敗しました。もう一度お試しください。',
                submitNoAccount:
                    'このサインインには Fusion メンバーアカウントがありません。',
                submitNoLinkedArtist:
                    'アカウントにアーティストプロフィールが紐づいていません。',
                accountGateNoAccountTitle: '応募にはメンバーアカウントが必要です',
                accountGateNoAccountBody:
                    'いまの Internet Identity は、まだ Fusion のメンバーアカウントとつながっていません。そのため応募を送れません。',
                accountGateNoAccountSolution:
                    'このサインインで参加（Join）登録を完了するか、登録時に使った Internet Identity でサインインし直してから、もう一度お試しください。',
                accountGateNoLinkedTitle: 'アーティストプロフィール未連携',
                accountGateNoLinkedBody:
                    'Fusion アカウントはありますが、アーティストプロフィールがまだ紐づいていません。',
                accountGateNoLinkedSolution:
                    'Fusion チームにロスター連携をご依頼いただくか、すでに紐づいている Internet Identity でサインインしてください。',
                accountGateContactLead: 'ご不明点は',
                accountGateContactCta: 'info@fusionart.world',
                accountGateJoinCta: '参加する',
                accountGateClose: '閉じる',
                submitSuccess: '応募を受け付けました。',
                submitting: '送信中…',
                submitReceivedTitle: '応募を受け付けました。',
                submitReceivedBody: 'プロフィールダッシュボードで進捗を確認できます。',
                alreadyApplied: 'このプログラムには既に応募済みです。下のボタンで内容を更新して保存できます（追加の応募料はありません）。',
                saveApplicationUpdates: '応募内容を保存',
                payAndSubmit: '支払って送信',
                paymentPreparing: '決済フォームを準備しています…',
                paymentLoadingForm: 'カード入力フォームを読み込み中…',
                paymentConfigureServices: 'Studio → Services で Integration API と Stripe の公開鍵を設定してください。',
                paymentFailed: 'お支払いを完了できませんでした。もう一度お試しください。',
                payFirstSessionExpired:
                    'お支払い中にサインインの有効期限が切れた可能性があります。Internet Identity で再度サインインしてから「支払って送信」をもう一度試すか、サポートへご連絡ください。',
                required: '必須',
                feeInfoTrigger: '応募料に含まれるもの',
                feeInfoP1:
                    '応募料は、レジデンシー応募の処理と審査に充てられます。ゲストとして応募するか、Fusion メンバーシップに加入してプラットフォームを継続利用できます。',
                feeInfoP2:
                    '月額メンバーは応募ごとに $35。四半期メンバーは四半期ごとに 1 クレジット（繰越可）。年間メンバーは有効期間中、応募料が含まれます。',
                feeInfoP3:
                    'お支払いと応募送信後、プロフィールのダッシュボードからいつでもメンバーシップを管理できます。',
            };
            return /** @type {Record<string, unknown>} */ (this._mergePaymentChromeLabels(/** @type {Record<string, unknown>} */ (jaLabels)));
        }
        const enLabels = {
            title: 'Application Form',
            contactSectionTitle: 'Contact & location',
            portfolioSectionTitle: 'Portfolio',
            applicationFeeHeading: 'Application fee',
            selectionProcessTitle: 'Selection process',
            selectionReview:
                'We review applications and shortlist candidates based on your materials, background, and fit for the residency.',
            selectionEmail: 'If you advance past the document review, we will email you to schedule an interview.',
            selectionFinal:
                'Final decisions are communicated by email. We may run more than one round of applications until the cohort is filled.',
            selectionDepositLine:
                'If you are offered a place, a deposit of {{deposit}} is due to secure your slot, with final payment due by {{deadline}}.',
            selectionSeeFaq: 'For dates and costs, see',
            faqDetailsLinkText: 'FAQ and program details',
            viewProgramDetails: 'View program details',
            defaultFeeNoticeItalic:
                'The application fee is non-refundable. Regardless of selection outcome, your Fusion platform membership benefits apply as described.',
            whatsIncludedEmpty: '(No program-specific description yet.)',
            whatsIncludedSummary: "What's included in the application fee",
            whatsIncludedGlobalHeading: 'Included with every application',
            whatsIncludedPlanHeading: 'Included with this payment option',
            whatsIncludedPickPlan: 'Select a payment option above to see plan-specific items.',
            whatsIncludedGlobalEmpty: '(No global items yet — configure under Studio → Services → Subscription.)',
            paymentFeeLead:
                'Choose a payment option below, then enter your card in the secure form and submit to complete your application.',
            paymentPlanGroupLabel: 'Application fee payment options',
            paymentPlaceholderNoSelection: 'Select an option above to load the secure card form.',
            choosePaymentHeading: 'Complete your application',
            choosePaymentSubtext: 'Submit the one-time application fee to continue.',
            productCardTitle: 'Residency application',
            productCardBadge: 'One-time payment',
            productCardBullets: [
                'Application review and processing',
                'One submission to this program',
                'No recurring payment',
                'No membership required',
            ],
            includedFeatureLabels: [
                'Application processing',
                'Submission review',
                'Program consideration',
                'Application support',
            ],
            securePaymentLine: 'Secure payment • Encrypted & safe',
            paymentPlaceholderTitle: 'Select an option above to load the secure card form.',
            paymentPlaceholderSub: "We'll securely collect your payment details here.",
            paymentPlaceholderExtended:
                "Select an option above to load the secure card form. We'll securely collect your payment details here.",
            footerThankYou:
                'Thank you for supporting artists and helping us build a thoughtful, global creative community.',
            footerQuestionsPrefix: 'Questions?',
            footerContactUs: 'Contact us',
                suggestedBadge: 'Recommended',
                planOneTimeTitle: 'Residency application – {{price}}',
                planOneTimeSub: 'Application only',
                exploreMembershipsExpand: 'Explore memberships',
                exploreMembershipsCollapse: 'Hide membership options',
                planMonthlyTitle: 'Monthly + application',
                planMonthlyPriceLine: '$30',
                planMonthlyEvery: 'per month',
                planMonthlyEntitlement: 'Application fee included on first charge; then $30/mo',
                planQuarterlyTitle: 'Quarterly membership',
                planQuarterlyPriceLine: '$75',
                planQuarterlyEvery: 'per quarter',
                planQuarterlyEntitlement:
                    '+1 stackable application credit per quarter; free if balance ≥ 1 else $35',
                planAnnualTitle: 'Annual membership',
                planAnnualPriceLine: '$260',
                planAnnualEvery: 'per year',
                planAnnualEntitlement:
                    '4 stackable application credits per year; free if balance ≥ 1 else $35',
                memberFeeOnlyBanner:
                    'No application credits left. Pay the {{fee}} member application fee below to submit, or wait for your next credit.',
                memberQuarterlyCreditNote:
                    'This submit uses 1 application credit ({{count}} available before submit).',
                awardPathBlocked:
                    'You are entered in the Program Award for this program. Exit the award before submitting a formal application.',
                monthlySubThenFeeHint:
                    'Subscription approved. Click submit to finish your application.',
                subscriptionThenSubmitHint: 'Subscription approved. Click submit to finish your application.',
            oneTimePlanUnavailable:
                'One-time payment amount is not set for this program. Add Application fee amount (cents) in Studio.',
            selectPaymentPlanFirst: 'Please select a payment option.',
            paymentStillLoading: 'Payment form is still loading. Please wait.',
            payAndSubmitApplication: 'Pay and submit application',
            paymentSupportPrefix: 'Questions? Email ',
            paymentSupportSuffix: '.',
            emailRequiredForPayment: 'Enter a valid email address in the form above before paying.',
            lead1: 'Enter your name, email, and location.',
            lead2:
                'We’re less interested in perfect answers, more in perspective. Share what feels true to you, then pay the application fee and submit below.',
            lead2MemberFeeWaived:
                'As a Fusion member, your application fee is included. Complete your answers and submit below.',
            lead2UsingCredit:
                'You’re submitting with an application credit. Finish your answers and submit below — no payment required.',
            memberFeeWaivedBanner:
                'Your Fusion membership includes the program application fee—no card payment required.',
            creditCalloutEyebrow: 'Application credit',
            creditCalloutTitle: 'You’re using 1 application credit',
            creditCalloutBody:
                'This submit uses 1 application credit ({{count}} available before submit). No payment is required.',
            submitApplicationOnly: 'Submit application',
            lead2AlreadyApplied:
                'You can update your answers below and save. No additional application fee.',
            firstName: 'First name',
            lastName: 'Last name',
            email: 'Email',
            country: 'Country',
            stateProvince: 'State / province / region (optional)',
            city: 'City',
            step0FillRequired:
                'Please fill in first name, last name, email, country, and city before paying or submitting.',
            step0InvalidEmail: 'Please enter a valid email address.',
            validationTitle: 'A few details needed',
            validationBody: 'Please complete these required fields before continuing:',
            validationContinue: 'Continue',
            website: 'Where can we experience your world?',
            websiteByline: '(Website, portfolio, or any place your work lives — links welcome)',
            discipline: 'How do you define your practice right now?',
            disciplineByline: '(Your discipline, or however you choose to describe what you do — it doesn’t have to fit a category)',
            /** Suggestions only — free text is always allowed (`<datalist>`). */
            disciplineDatalistOptions: [
                'Painting',
                'Drawing',
                'Printmaking',
                'Sculpture',
                'Installation',
                'Photography',
                'Film / video',
                'Sound / music',
                'Performance',
                'Dance',
                'Textile / fashion',
                'Design',
                'Digital / media art',
                'Writing',
                'Architecture',
                'Research-based practice',
                'Mixed media',
                'Other (describe in your own words)',
            ],
            slotsRemainingValue: '<strong>{{a}}</strong> of <strong>{{b}}</strong> slots remaining',
            slotsCountValue: '{{a}} of {{b}}',
            slotsRemainingLabel: 'Slots remaining',
            bioStatement: 'Tell us about yourself, as an artist and as a person.',
            bioStatementByline: '(A short bio, or something more personal — whichever feels more honest to you)',
            exploration: 'What are you currently exploring, questioning, or becoming?',
            explorationByline: '(What’s pulling you forward in your work or life right now)',
            residencyGoals:
                'If you joined this residency, what would you want to leave with — internally or externally?',
            residencyGoalsByline: '(This could be a body of work, a shift in perspective, a connection, or something intangible)',
            submitError: 'Could not submit. Please try again.',
            submitNoAccount: 'This sign-in is not linked to a Fusion member account.',
            submitNoLinkedArtist: 'Your account is not linked to an artist profile.',
            accountGateNoAccountTitle: 'A Fusion account is needed to apply',
            accountGateNoAccountBody:
                'You’re signed in, but this Internet Identity isn’t connected to a Fusion member account yet — so we can’t send your application.',
            accountGateNoAccountSolution:
                'Finish joining with this sign-in, or sign in with the Internet Identity you used to register. Then try again.',
            accountGateNoLinkedTitle: 'Artist profile not linked',
            accountGateNoLinkedBody:
                'You have a Fusion account, but it isn’t linked to an artist profile yet.',
            accountGateNoLinkedSolution:
                'Ask the Fusion team to link your roster row, or sign in with the identity that’s already linked. Then try again.',
            accountGateContactLead: 'Need help?',
            accountGateContactCta: 'info@fusionart.world',
            accountGateJoinCta: 'Join Fusion',
            accountGateClose: 'Close',
            submitSuccess: 'Your application was received.',
            submitting: 'Submitting...',
            submitReceivedTitle: 'Your application was received.',
            submitReceivedBody: 'You can track your progress in your profile dashboard.',
            alreadyApplied:
                'You already applied to this program. Update your answers below and save—no additional application fee.',
            saveApplicationUpdates: 'Save application updates',
            payAndSubmit: 'Pay and submit',
            paymentPreparing: 'Preparing payment…',
            paymentLoadingForm: 'Loading card form…',
            paymentConfigureServices:
                'Configure Integration API URL and Stripe publishable key under Studio → Services.',
            paymentFailed: 'Payment could not be completed. Please try again.',
            payFirstSessionExpired:
                'Your sign-in session may have expired during payment. Sign in again with Internet Identity, then retry Pay and submit, or contact support.',
            required: 'required',
            feeInfoTrigger: "What's included in the application fee?",
                feeInfoP1:
                    'The application fee covers processing and review of your residency application. You can apply as a guest or join Fusion with a membership for ongoing platform access.',
                feeInfoP2:
                    'Members on Monthly pay a $35 application fee per submission. Quarterly members earn one stackable application credit each quarter. Annual members receive 4 stackable application credits per year. Program Award entries are separate and cannot be combined with a formal application for the same program.',
                feeInfoP3:
                    'After payment completes and your application is sent, manage your membership anytime from your profile dashboard.',
        };
        return /** @type {Record<string, unknown>} */ (this._mergePaymentChromeLabels(/** @type {Record<string, unknown>} */ (enLabels)));
    }

    /**
     * Analytics locale (no PII).
     * @returns {'en' | 'ja'}
     */
    _analyticsLocale() {
        return typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
    }

    /**
     * Shared PostHog props for program application + payment funnels (no PII).
     * @returns {Record<string, string | number | boolean>}
     */
    _posthogApplicationBaseProps() {
        const programId = this.getAttribute('data-program-id') || '';
        const centsRaw = this._programFormContext.applicationFeeAmountCents;
        const guestCents = this._guestApplicationFeeCents();
        const oneTimeOk = guestCents != null;
        return {
            program_id: programId,
            locale: this._analyticsLocale(),
            one_time_payment_available: oneTimeOk,
            bimonthly_plan_offered: false,
            monthly_plan_offered: true,
            quarterly_plan_offered: true,
            annual_plan_offered: true,
            fee_waived: !!this._membershipFeeWaived,
            member_fee_only: !!this._memberFeeOnly,
            membership_gate: String(this._membershipGate || 'unknown'),
            ...(oneTimeOk ? { application_fee_amount_cents: guestCents } : {}),
            ...(this._memberApplicationFee
                ? { member_fee_due_cents: this._memberApplicationFee.dueCents }
                : {}),
        };
    }

    /**
     * Soft validation for contact fields — avoids native `required` / strict `type=url` friction.
     * @returns {string | null} Error message, or null if OK.
     */
    /**
     * @returns {{ missing: { id: string, label: string }[], invalidEmail: boolean }}
     */
    _getStep0Missing() {
        const L = this._labels();
        const root = this.shadowRoot;
        const get = (id) => String(root?.querySelector(`#${id}`)?.value ?? '').trim();
        const fields = [
            { id: 'app-first-name', label: L.firstName },
            { id: 'app-last-name', label: L.lastName },
            { id: 'app-email', label: L.email },
            { id: 'app-country', label: L.country },
            { id: 'app-city', label: L.city },
        ];
        const missing = fields.filter((f) => !get(f.id));
        const invalidEmail =
            !missing.some((f) => f.id === 'app-email') && !isLooseEmail(get('app-email'));
        return { missing, invalidEmail };
    }

    /**
     * Validate the required step-0 fields; on failure, show a popup and return false.
     * @returns {boolean}
     */
    _ensureStep0OrPrompt() {
        const result = this._getStep0Missing();
        if (result.missing.length || result.invalidEmail) {
            this._showStep0ValidationPopup(result);
            return false;
        }
        this._setFormStatusMessage('', 'neutral');
        return true;
    }

    /**
     * @param {string} id
     */
    _highlightStep0Field(id) {
        const el = this.shadowRoot?.querySelector(`#${id}`);
        if (!(el instanceof HTMLElement)) return;
        el.classList.add('app-field--invalid');
        const clear = () => {
            el.classList.remove('app-field--invalid');
            el.removeEventListener('input', clear);
            el.removeEventListener('change', clear);
        };
        el.addEventListener('input', clear);
        el.addEventListener('change', clear);
    }

    /**
     * @param {{ missing: { id: string, label: string }[], invalidEmail: boolean }} result
     */
    _showStep0ValidationPopup(result) {
        const root = this.shadowRoot;
        if (!root) return;
        const L = this._labels();
        root.querySelector('.app-validation-overlay')?.remove();

        const targets = result.missing.map((f) => f.id);
        if (result.invalidEmail && !targets.includes('app-email')) targets.push('app-email');
        const firstId = targets[0] || '';

        try {
            posthog.capture('program_application_validation_popup_shown', {
                ...this._posthogApplicationBaseProps(),
                payment_plan: this._paymentPlan || 'none',
                missing_fields: result.missing.map((f) => f.id),
                missing_field_count: result.missing.length,
                invalid_email: result.invalidEmail,
            });
        } catch {
            /* ignore */
        }

        const overlay = document.createElement('div');
        overlay.className = 'app-validation-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'app-validation-title');

        const modal = document.createElement('div');
        modal.className = 'app-validation-modal';

        const title = document.createElement('h3');
        title.className = 'app-validation-title';
        title.id = 'app-validation-title';
        title.textContent = L.validationTitle;
        modal.appendChild(title);

        const text = document.createElement('p');
        text.className = 'app-validation-text';
        text.textContent = result.invalidEmail && result.missing.length === 0
            ? L.step0InvalidEmail
            : L.validationBody;
        modal.appendChild(text);

        if (result.missing.length) {
            const list = document.createElement('ul');
            list.className = 'app-validation-list';
            for (const f of result.missing) {
                const li = document.createElement('li');
                li.textContent = f.label;
                list.appendChild(li);
            }
            modal.appendChild(list);
        }

        const actions = document.createElement('div');
        actions.className = 'app-validation-actions';
        const continueBtn = document.createElement('button');
        continueBtn.type = 'button';
        continueBtn.className = 'app-btn app-btn--primary';
        continueBtn.textContent = L.validationContinue;
        actions.appendChild(continueBtn);
        modal.appendChild(actions);

        overlay.appendChild(modal);
        root.appendChild(overlay);

        const close = () => overlay.remove();
        const proceed = () => {
            close();
            targets.forEach((id) => this._highlightStep0Field(id));
            const target = firstId ? root.querySelector(`#${firstId}`) : null;
            if (target instanceof HTMLElement) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                try {
                    target.focus({ preventScroll: true });
                } catch {
                    target.focus();
                }
            }
        };

        continueBtn.addEventListener('click', proceed);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') close();
        });
        continueBtn.focus();
    }

    /**
     * @param {string} text
     * @param {'error' | 'neutral'} kind
     */
    _setFormStatusMessage(text, kind) {
        const statusEl = this.shadowRoot?.querySelector('#app-form-status');
        if (!statusEl) return;
        statusEl.textContent = text;
        statusEl.classList.toggle('is-error', kind === 'error');
        statusEl.classList.remove('is-success');
    }

    /**
     * Branded floating notice when submit is blocked by missing account / artist link.
     * @param {'no_account' | 'no_linked_artist'} kind
     */
    _showAccountGateNotice(kind) {
        const root = this.shadowRoot;
        if (!root) return;
        root.querySelector('.app-account-gate-overlay')?.remove();
        const L = this._labels();
        const isNoAccount = kind !== 'no_linked_artist';
        const title = isNoAccount ? L.accountGateNoAccountTitle : L.accountGateNoLinkedTitle;
        const body = isNoAccount ? L.accountGateNoAccountBody : L.accountGateNoLinkedBody;
        const solution = isNoAccount
            ? L.accountGateNoAccountSolution
            : L.accountGateNoLinkedSolution;

        const overlay = document.createElement('div');
        overlay.className = 'app-account-gate-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'app-account-gate-title');

        const card = document.createElement('div');
        card.className = 'app-account-gate-card';
        card.innerHTML = `
            <p class="app-account-gate-eyebrow">Fusion</p>
            <h3 class="app-account-gate-title" id="app-account-gate-title"></h3>
            <p class="app-account-gate-body"></p>
            <p class="app-account-gate-solution"></p>
            <p class="app-account-gate-contact">
                <span class="app-account-gate-contact-lead"></span>
                <a class="app-account-gate-mail" href="mailto:info@fusionart.world"></a>
            </p>
            <div class="app-account-gate-actions">
                <a class="app-btn app-btn--primary app-account-gate-join" href="/join-network"></a>
                <button type="button" class="app-btn app-btn--ghost app-account-gate-close"></button>
            </div>
        `;
        const titleEl = card.querySelector('.app-account-gate-title');
        const bodyEl = card.querySelector('.app-account-gate-body');
        const solutionEl = card.querySelector('.app-account-gate-solution');
        const leadEl = card.querySelector('.app-account-gate-contact-lead');
        const mailEl = card.querySelector('.app-account-gate-mail');
        const joinEl = card.querySelector('.app-account-gate-join');
        const closeBtn = card.querySelector('.app-account-gate-close');
        if (titleEl) titleEl.textContent = title;
        if (bodyEl) bodyEl.textContent = body;
        if (solutionEl) solutionEl.textContent = solution;
        if (leadEl) leadEl.textContent = `${L.accountGateContactLead} `;
        if (mailEl) mailEl.textContent = L.accountGateContactCta;
        if (joinEl) joinEl.textContent = L.accountGateJoinCta;
        if (closeBtn) closeBtn.textContent = L.accountGateClose;

        overlay.appendChild(card);
        root.appendChild(overlay);

        const close = () => overlay.remove();
        closeBtn?.addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') close();
        });
        joinEl?.addEventListener('click', (e) => {
            e.preventDefault();
            close();
            void import('../../router.js')
                .then(({ navigate }) => {
                    navigate('/join-network');
                })
                .catch(() => {
                    window.location.assign('/join-network');
                });
        });
        if (closeBtn instanceof HTMLElement) closeBtn.focus();
    }

    /**
     * @param {unknown} err
     * @returns {boolean} true when a gate notice was shown
     */
    _handleAccountGateError(err) {
        const code =
            err && typeof err === 'object' && 'code' in err
                ? String(/** @type {{ code?: unknown }} */ (err).code ?? '')
                : '';
        const L = this._labels();
        if (code === PROGRAM_APPLICATION_ERROR_CODE.NO_ACCOUNT) {
            this._setFormStatusMessage(L.submitNoAccount, 'error');
            this._showAccountGateNotice('no_account');
            return true;
        }
        if (code === PROGRAM_APPLICATION_ERROR_CODE.NO_LINKED_ARTIST) {
            this._setFormStatusMessage(L.submitNoLinkedArtist, 'error');
            this._showAccountGateNotice('no_linked_artist');
            return true;
        }
        return false;
    }

    _touchDirty() {
        if (this.getAttribute('active') !== 'true') return;
        const wrap = document.getElementById('programApplicationWrap');
        if (!wrap || wrap.hasAttribute('hidden')) return;
        if (this._dirty) return;
        this._dirty = true;
        this.setAttribute('data-unsaved', 'true');
        if (this._beforeUnloadHooked) return;
        this._beforeUnloadHooked = true;
        this._boundBeforeUnload = (e) => {
            if (!this._dirty) return;
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', this._boundBeforeUnload);
    }

    _clearDirtyState() {
        this._dirty = false;
        this.removeAttribute('data-unsaved');
        if (this._boundBeforeUnload) {
            window.removeEventListener('beforeunload', this._boundBeforeUnload);
            this._boundBeforeUnload = null;
            this._beforeUnloadHooked = false;
        }
    }

    /**
     * Light-DOM node for Stripe (Payment Element cannot mount in closed shadow roots reliably).
     * @returns {HTMLElement}
     */
    _ensureStripeSlotEl() {
        let el = this.querySelector('[slot="app-stripe-mount"]');
        if (!el) {
            el = document.createElement('div');
            el.slot = 'app-stripe-mount';
            el.className = 'app-application-stripe-mount';
            this.appendChild(el);
        }
        return el;
    }

    _teardownStripePayment() {
        this._stripePrepareGen += 1;
        this._stripePaymentReady = false;
        this._stripePrepareKey = '';
        this._fusionPendingId = null;
        this._fusionSubscriptionId = null;
        this._paypalOrderId = '';
        try {
            this._paypalCheckoutController?.destroy();
        } catch {
            /* ignore */
        }
        this._paypalCheckoutController = null;
        const mount = this.querySelector('[slot="app-stripe-mount"]');
        if (mount) mount.textContent = '';
        try {
            this._stripePaymentElement?.unmount();
        } catch {
            /* ignore */
        }
        this._stripePaymentElement = null;
        this._stripeElements = null;
        this._stripe = null;
        const ph = this.shadowRoot?.querySelector('#app-payment-placeholder');
        if (ph instanceof HTMLElement) ph.hidden = false;
    }

    _computeStripePrepareKey() {
        const root = this.shadowRoot;
        const email = String(root?.querySelector('#app-email')?.value ?? '').trim();
        const programId = this.getAttribute('data-program-id') || '';
        const plan = this._paymentPlan || '';
        return `${email}|${programId}|${plan}`;
    }

    /**
     * @param {import('@stripe/stripe-js').StripeElement} paymentElement
     * @returns {Promise<void>}
     */
    _whenPaymentElementReady(paymentElement) {
        return new Promise((resolve, reject) => {
            let settled = false;
            const t = window.setTimeout(() => {
                if (!settled) {
                    settled = true;
                    resolve();
                }
            }, 12000);
            const finish = (fn) => {
                if (settled) return;
                settled = true;
                window.clearTimeout(t);
                fn();
            };
            paymentElement.on('ready', () => finish(() => resolve()));
            paymentElement.on('loaderror', (event) => {
                const msg =
                    event?.error?.message ||
                    event?.message ||
                    'Payment form failed to load.';
                finish(() => reject(new Error(msg)));
            });
        });
    }

    async _prepareStripePayment() {
        if (this._alreadyApplied || this._membershipFeeWaived) return;
        const provider = getActiveProvider();
        if (provider === 'stripe') {
            await this._prepareStripeElementsPayment();
        } else {
            await this._preparePayPalEmbeddedPayment();
        }
    }

    /**
     * Application-form monthly uses the bundled monthly+application PayPal plan.
     * @param {'monthly' | 'quarterly' | 'annual'} tier
     * @returns {string}
     */
    _subscriptionTierForPaymentPlan(tier) {
        if (tier === 'monthly') return 'monthly_application';
        return tier;
    }

    /**
     * @param {'monthly' | 'quarterly' | 'annual' | 'monthly_application'} tier
     * @returns {string}
     */
    _subscriptionPaymentPlanMeta(tier) {
        if (tier === 'annual') return 'subscription_annual';
        if (tier === 'quarterly') return 'subscription_quarterly';
        if (tier === 'monthly_application') return 'subscription_monthly_application';
        return 'subscription_monthly';
    }

    /**
     * After PayPal subscription approval — membership plans submit with no second charge.
     * @returns {Promise<void>}
     */
    async _onSubscriptionCheckoutApproved() {
        const root = this.shadowRoot;
        const L = this._labels();
        this._stripePaymentReady = true;
        this._syncPaymentPlanUi();
        this._syncPaymentHintChrome(root, { busy: false, text: L.subscriptionThenSubmitHint });
        const payBtn = root?.querySelector('#app-pay-submit');
        if (payBtn instanceof HTMLElement) payBtn.disabled = false;
        const ph = root?.querySelector('#app-payment-placeholder');
        if (ph instanceof HTMLElement) ph.hidden = true;
    }

    async _preparePayPalEmbeddedPayment() {
        if (this._alreadyApplied || this._membershipFeeWaived) return;
        const prepareKey = this._computeStripePrepareKey();
        if (
            this._stripePaymentReady &&
            !this._stripe &&
            this._stripePrepareKey === prepareKey
        ) {
            return;
        }
        // Teardown bumps _stripePrepareGen, so capture the generation AFTER it —
        // otherwise every myGen check below would bail and leave "Preparing payment…" stuck.
        this._teardownStripePayment();
        const myGen = ++this._stripePrepareGen;
        this._fusionPendingId = null;
        this._fusionSubscriptionId = null;
        this._paypalOrderId = '';

        const root = this.shadowRoot;
        const L = this._labels();
        const payBtn = root?.querySelector('#app-pay-submit');

        const setHint = (text, busy) => {
            this._syncPaymentHintChrome(root, { busy, text });
        };

        if (!this._paymentPlan) {
            setHint('', false);
            if (payBtn) payBtn.disabled = true;
            return;
        }

        const email = String(root?.querySelector('#app-email')?.value ?? '').trim();
        if (!email.includes('@')) {
            setHint(L.emailRequiredForPayment, false);
            if (payBtn) payBtn.disabled = true;
            return;
        }

        const programId = this.getAttribute('data-program-id') || '';
        const clientId = getPayPalClientIdResolved();
        const base = getIntegrationBaseUrl();
        if (!clientId || !base) {
            setHint(L.paymentConfigureServices, false);
            if (payBtn) payBtn.disabled = true;
            return;
        }

        if (payBtn) payBtn.disabled = true;
        setHint(L.paymentPreparing, true);

        try {
            const mountEl = this._ensureStripeSlotEl();
            await new Promise((r) => requestAnimationFrame(r));
            if (myGen !== this._stripePrepareGen) return;

            if (this._planNeedsOneTimeCheckout()) {
                const amountCents = this._oneTimeCheckoutCents();
                if (amountCents == null) {
                    setHint(L.oneTimePlanUnavailable, false);
                    if (payBtn) payBtn.disabled = true;
                    return;
                }
                const oneTimeConfig = await fetchPaymentConfig();
                if (myGen !== this._stripePrepareGen) return;
                const paymentPlanTag =
                    this._memberFeeOnly || this._paymentPlan === 'member_fee'
                        ? 'member_fee'
                        : 'one_time';
                this._paypalCheckoutController = await mountPayPalAdvancedOneTimeCheckout(mountEl, {
                    clientId,
                    mode: oneTimeConfig.mode === 'live' ? 'live' : 'sandbox',
                    amountCents,
                    metadata: {
                        programId,
                        purpose: 'program_application',
                        payment_plan: paymentPlanTag,
                    },
                    createOrder: async (body) =>
                        createPayPalOneTimePayment({
                            amountCents: body.amountCents,
                            metadata: body.metadata,
                        }),
                    onApproved: async (oid) => {
                        this._paypalOrderId = oid;
                    },
                    onError: (err) => {
                        console.warn('[application-form] PayPal order error', err);
                        setHint(
                            err instanceof Error ? err.message : 'PayPal checkout failed.',
                            false,
                        );
                    },
                });
                if (this._paypalCheckoutController.usesCardFields) {
                    setHint('Enter your card details below, then click Pay & submit application.', false);
                }
            } else if (
                this._paymentPlan === 'monthly' ||
                this._paymentPlan === 'quarterly' ||
                this._paymentPlan === 'annual'
            ) {
                const payConfig = await fetchPaymentConfig();
                if (myGen !== this._stripePrepareGen) return;
                const tier = this._subscriptionTierForPaymentPlan(this._paymentPlan);
                const planId = planIdForTier(tier, payConfig);
                if (!planId) {
                    const envHint =
                        tier === 'monthly_application'
                            ? 'PAYPAL_SUBSCRIPTION_MONTHLY_APPLICATION_ID'
                            : `PayPal ${tier} plan`;
                    throw new Error(`${envHint} not configured on integration server.`);
                }
                if (paymentModeMismatch(payConfig)) {
                    setHint(
                        'Warning: Studio environment does not match server PayPal mode.',
                        true,
                    );
                }
                const fusionPendingId = crypto.randomUUID();
                this._fusionPendingId = fusionPendingId;
                this._checkoutPhase = 'subscription';
                setPendingPaymentEmailLocal({
                    email,
                    source: 'application',
                    fusionPendingId,
                    subscriptionId: '',
                    programId,
                });
                /** @type {Record<string, string>} */
                const customData = {
                    fusion_pending_id: fusionPendingId,
                    pending_email: email,
                    programId,
                    purpose: 'program_application',
                    payment_plan: this._subscriptionPaymentPlanMeta(tier),
                };
                const sdkMode = payConfig.mode === 'live' ? 'live' : 'sandbox';
                await mountPayPalSubscriptionButtons(mountEl, {
                    clientId,
                    mode: sdkMode,
                    planId,
                    email,
                    customData,
                    onApprove: async (subscriptionId) => {
                        if (myGen !== this._stripePrepareGen) return;
                        this._fusionSubscriptionId = subscriptionId;
                        setPendingPaymentEmailLocal({
                            email,
                            source: 'application',
                            fusionPendingId: this._fusionPendingId || '',
                            subscriptionId,
                            programId,
                        });
                        await this._onSubscriptionCheckoutApproved();
                    },
                    onError: (err) => {
                        console.warn('[application-form] PayPal subscription error', err);
                        setHint(
                            err instanceof Error ? err.message : 'PayPal checkout failed.',
                            false,
                        );
                    },
                });
            } else {
                setHint(L.selectPaymentPlanFirst, false);
                if (payBtn) payBtn.disabled = true;
                return;
            }

            if (myGen !== this._stripePrepareGen) return;
            this._stripePaymentReady = this._planNeedsOneTimeCheckout();
            this._stripePrepareKey = prepareKey;
            if (this._planSubmitWithoutOneTime() && this._fusionSubscriptionId) {
                this._stripePaymentReady = true;
            }
            setHint('', false);
            if (payBtn) {
                const subWaiting =
                    (this._paymentPlan === 'monthly' ||
                        this._paymentPlan === 'quarterly' ||
                        this._paymentPlan === 'annual') &&
                    !this._fusionSubscriptionId &&
                    !this._planNeedsOneTimeCheckout();
                payBtn.disabled =
                    subWaiting ||
                    (this._planNeedsOneTimeCheckout() && !this._paypalCheckoutController);
            }
            const ph = root?.querySelector('#app-payment-placeholder');
            if (ph instanceof HTMLElement) ph.hidden = true;
            try {
                posthog.capture('program_application_payment_elements_ready', {
                    ...this._posthogApplicationBaseProps(),
                    payment_plan: this._paymentPlan || 'unknown',
                    payment_provider: 'paypal',
                    ads_conversion: 'AddPaymentInfo',
                });
                const pidReady = String(this.getAttribute('data-program-id') || '').trim();
                metaTrack('AddPaymentInfo', {
                    content_name: 'program_application_card_form',
                    payment_plan: this._paymentPlan || undefined,
                    ...(pidReady ? { content_ids: [pidReady] } : {}),
                });
            } catch {
                /* ignore */
            }
        } catch (e) {
            if (myGen !== this._stripePrepareGen) return;
            this._teardownStripePayment();
            const raw = e instanceof Error ? e.message : String(e);
            setHint(mapIntegrationUserMessage(raw, 0), false);
            if (payBtn) payBtn.disabled = true;
            try {
                posthog.capture('program_application_payment_prepare_failed', {
                    ...this._posthogApplicationBaseProps(),
                    payment_plan: this._paymentPlan || 'unknown',
                    failure_stage: 'paypal_elements',
                });
            } catch {
                /* ignore */
            }
        }
    }

    async _prepareStripeElementsPayment() {
        if (this._alreadyApplied || this._membershipFeeWaived) return;
        const prepareKey = this._computeStripePrepareKey();
        if (
            this._stripePaymentReady &&
            this._stripe &&
            this._stripeElements &&
            this._stripePrepareKey === prepareKey
        ) {
            return;
        }
        const myGen = ++this._stripePrepareGen;
        try {
            this._stripePaymentElement?.unmount();
        } catch {
            /* ignore */
        }
        this._stripePaymentElement = null;
        this._stripeElements = null;
        this._stripe = null;
        this._stripePaymentReady = false;
        this._fusionPendingId = null;
        this._fusionSubscriptionId = null;

        const root = this.shadowRoot;
        const L = this._labels();
        const payBtn = root?.querySelector('#app-pay-submit');

        const setHint = (text, busy) => {
            this._syncPaymentHintChrome(root, { busy, text });
        };

        if (!this._paymentPlan) {
            setHint('', false);
            if (payBtn) payBtn.disabled = true;
            return;
        }

        const email = String(root?.querySelector('#app-email')?.value ?? '').trim();
        if (!email.includes('@')) {
            setHint(L.emailRequiredForPayment, false);
            if (payBtn) payBtn.disabled = true;
            return;
        }

        const programId = this.getAttribute('data-program-id') || '';
        const pk = getStripePublishableKeyResolved();
        const base = getIntegrationBaseUrl();
        if (!pk || !base) {
            setHint(L.paymentConfigureServices, false);
            if (payBtn) payBtn.disabled = true;
            return;
        }

        let clientSecret = '';
        if (this._planNeedsOneTimeCheckout()) {
            const amountCents = this._oneTimeCheckoutCents();
            if (amountCents == null) {
                setHint(L.oneTimePlanUnavailable, false);
                if (payBtn) payBtn.disabled = true;
                return;
            }
            if (payBtn) payBtn.disabled = true;
            setHint(L.paymentPreparing, true);
            if (myGen !== this._stripePrepareGen) return;
            try {
                const paymentPlanTag =
                    this._memberFeeOnly || this._paymentPlan === 'member_fee'
                        ? 'member_fee'
                        : 'one_time';
                const piRes = await createPaymentIntent(amountCents, 'usd', {
                    programId,
                    purpose: 'program_application',
                    payment_plan: paymentPlanTag,
                });
                if (myGen !== this._stripePrepareGen) return;
                clientSecret = piRes.clientSecret;
            } catch (e) {
                if (myGen !== this._stripePrepareGen) return;
                this._teardownStripePayment();
                const raw = e instanceof Error ? e.message : String(e);
                setHint(mapIntegrationUserMessage(raw, 0), false);
                if (payBtn) payBtn.disabled = true;
                return;
            }
        } else if (
            this._paymentPlan === 'monthly' ||
            this._paymentPlan === 'quarterly' ||
            this._paymentPlan === 'annual'
        ) {
            if (payBtn) payBtn.disabled = true;
            setHint(L.paymentPreparing, true);
            if (myGen !== this._stripePrepareGen) return;
            try {
                const tier = this._subscriptionTierForPaymentPlan(this._paymentPlan);
                const stripeTier =
                    tier === 'monthly_application' ? 'monthly' : /** @type {'monthly'|'quarterly'|'annual'} */ (tier);
                const subRes = await createSubscription({
                    email,
                    payFirst: true,
                    subscriptionTier: stripeTier,
                    metadata: {
                        programId,
                        purpose: 'program_application',
                        payment_plan: this._subscriptionPaymentPlanMeta(tier),
                    },
                });
                if (myGen !== this._stripePrepareGen) return;
                clientSecret = subRes.clientSecret;
                this._fusionPendingId = subRes.fusionPendingId || null;
                this._fusionSubscriptionId = subRes.subscriptionId || null;
                this._checkoutPhase = 'subscription';
                setPendingPaymentEmailLocal({
                    email,
                    source: 'application',
                    fusionPendingId: this._fusionPendingId || '',
                    subscriptionId: this._fusionSubscriptionId || '',
                    programId,
                });
            } catch (e) {
                if (myGen !== this._stripePrepareGen) return;
                this._teardownStripePayment();
                const raw = e instanceof Error ? e.message : String(e);
                setHint(mapIntegrationUserMessage(raw, 0), false);
                if (payBtn) payBtn.disabled = true;
                return;
            }
        } else {
            setHint(L.selectPaymentPlanFirst, false);
            if (payBtn) payBtn.disabled = true;
            return;
        }

        setHint(L.paymentLoadingForm, true);
        if (myGen !== this._stripePrepareGen) return;
        try {
            const { loadStripe } = await import('@stripe/stripe-js');
            const stripe = await loadStripe(pk);
            if (!stripe) throw new Error('Stripe failed to load');
            if (myGen !== this._stripePrepareGen) return;

            const elements = stripe.elements({
                clientSecret,
                appearance: { theme: 'stripe' },
            });
            const paymentElement = elements.create('payment');
            const mountEl = this._ensureStripeSlotEl();
            await new Promise((r) => requestAnimationFrame(r));
            if (myGen !== this._stripePrepareGen) return;

            const readyPromise = this._whenPaymentElementReady(paymentElement);
            paymentElement.mount(mountEl);
            this._stripe = stripe;
            this._stripeElements = elements;
            this._stripePaymentElement = paymentElement;

            await readyPromise;
            if (myGen !== this._stripePrepareGen) {
                this._teardownStripePayment();
                return;
            }

            this._stripePaymentReady = true;
            this._stripePrepareKey = prepareKey;
            setHint('', false);
            if (payBtn) payBtn.disabled = false;
            const ph = root?.querySelector('#app-payment-placeholder');
            if (ph instanceof HTMLElement) ph.hidden = true;
            try {
                posthog.capture('program_application_payment_elements_ready', {
                    ...this._posthogApplicationBaseProps(),
                    payment_plan: this._paymentPlan || 'unknown',
                    payment_provider: 'stripe',
                    ads_conversion: 'AddPaymentInfo',
                });
            } catch {
                /* ignore */
            }
        } catch (e) {
            if (myGen !== this._stripePrepareGen) return;
            this._teardownStripePayment();
            const raw = e instanceof Error ? e.message : String(e);
            setHint(mapIntegrationUserMessage(raw, 0), false);
            if (payBtn) payBtn.disabled = true;
        }
    }

    async _confirmPayAndSubmit() {
        const L = this._labels();
        const root = this.shadowRoot;
        const statusEl = root?.querySelector('#app-form-status');
        try {
            await assertProgramApplicationSubmissionReady();
        } catch (preErr) {
            if (this._handleAccountGateError(preErr)) return;
            if (statusEl) {
                statusEl.textContent = L.submitError;
                statusEl.classList.add('is-error');
            }
            return;
        }
        if (!this._paymentPlan) {
            if (statusEl) {
                statusEl.textContent = L.selectPaymentPlanFirst;
                statusEl.classList.add('is-error');
            }
            return;
        }
        if (!this._stripePaymentReady) {
            if (statusEl) {
                statusEl.textContent = L.paymentStillLoading;
                statusEl.classList.add('is-error');
            }
            return;
        }
        const provider = getActiveProvider();
        if (provider === 'paypal' && !this._planNeedsOneTimeCheckout()) {
            if (
                (this._paymentPlan === 'monthly' ||
                    this._paymentPlan === 'quarterly' ||
                    this._paymentPlan === 'annual') &&
                !this._fusionSubscriptionId
            ) {
                if (statusEl) {
                    statusEl.textContent = 'Approve your subscription with PayPal below, then try again.';
                    statusEl.classList.add('is-error');
                }
                return;
            }
        } else if (
            provider === 'paypal' &&
            this._planNeedsOneTimeCheckout() &&
            !this._paypalOrderId &&
            !this._paypalCheckoutController?.usesCardFields
        ) {
            if (statusEl) {
                statusEl.textContent = 'Complete payment with PayPal below, then try again.';
                statusEl.classList.add('is-error');
            }
            return;
        } else if (provider === 'paypal' && this._paymentPlan !== 'one_time' && this._paymentPlan !== 'member_fee' && !this._fusionSubscriptionId && !this._planNeedsOneTimeCheckout()) {
            if (statusEl) {
                statusEl.textContent = 'Approve your subscription with PayPal below, then try again.';
                statusEl.classList.add('is-error');
            }
            return;
        }
        if (provider === 'stripe' && (!this._stripe || !this._stripeElements)) {
            if (statusEl) {
                statusEl.textContent = L.paymentStillLoading;
                statusEl.classList.add('is-error');
            }
            return;
        }
        this._setPaySubmittingState(true, L.paymentPreparing);
        if (statusEl) {
            statusEl.textContent = '';
            statusEl.classList.remove('is-error', 'is-success');
        }
        try {
            if (provider === 'stripe' && this._stripe && this._stripeElements) {
                const { error } = await this._stripe.confirmPayment({
                    elements: this._stripeElements,
                    confirmParams: {
                        return_url: typeof window !== 'undefined' ? window.location.href : '',
                    },
                    redirect: 'if_required',
                });
                if (error) {
                    const wrapped = new Error(error.message || L.paymentFailed);
                    /** @type {{ stripeError?: import('@stripe/stripe-js').StripeError }} */
                    const w = /** @type {any} */ (wrapped);
                    w.stripeError = error;
                    throw wrapped;
                }
                if (
                    this._paymentPlan === 'monthly' &&
                    this._checkoutPhase !== 'application_fee'
                ) {
                    await this._onSubscriptionCheckoutApproved();
                    this._setPaySubmittingState(false, '');
                    return;
                }
            } else if (provider === 'paypal' && this._planNeedsOneTimeCheckout()) {
                if (!this._paypalOrderId) {
                    if (this._paypalCheckoutController?.usesCardFields) {
                        await this._paypalCheckoutController.submit();
                    } else {
                        throw new Error('Complete payment with PayPal below, then try again.');
                    }
                }
                if (this._paypalOrderId) {
                    await confirmPayPalOneTimePayment(this._paypalOrderId);
                }
            } else if (this._fusionSubscriptionId) {
                const snap = await getAuthSnapshot();
                if (snap.authenticated) {
                    await syncPayPalSubscription({
                        principal: snap.principal.toText(),
                        subscriptionId: this._fusionSubscriptionId,
                    });
                }
            }
            const email = String(root?.querySelector('#app-email')?.value ?? '').trim();
            const firstName = String(root?.querySelector('#app-first-name')?.value ?? '').trim();
            const lastName = String(root?.querySelector('#app-last-name')?.value ?? '').trim();
            const programId = this.getAttribute('data-program-id') || '';
            try {
                const feeCents = this._oneTimeCheckoutCents();
                const payVal =
                    this._planNeedsOneTimeCheckout() &&
                    typeof feeCents === 'number' &&
                    Number.isFinite(feeCents) &&
                    feeCents >= 50
                        ? feeCents / 100
                        : undefined;
                syncPosthogConversionPerson({
                    email,
                    firstName,
                    lastName,
                });
                posthog.capture('program_application_payment_completed', {
                    ...this._posthogApplicationBaseProps(),
                    payment_plan: this._paymentPlan || 'unknown',
                    ...(typeof payVal === 'number' ? { value: payVal, currency: 'USD' } : {}),
                    ads_conversion: 'Purchase',
                });
                const purchaseParams = {
                    currency: 'USD',
                    content_name: 'program_application_fee',
                };
                if (typeof payVal === 'number') purchaseParams.value = payVal;
                const pidTrim = String(programId || '').trim();
                if (pidTrim) purchaseParams.content_ids = [pidTrim];
                metaTrack('Purchase', purchaseParams);
            } catch {
                /* ignore */
            }

            if (this._fusionPendingId && email.includes('@')) {
                const snap = await getAuthSnapshot();
                if (!snap.authenticated) {
                    this._setPaySubmittingState(false, '');
                    if (statusEl) {
                        statusEl.textContent = L.payFirstSessionExpired;
                        statusEl.classList.add('is-error');
                    }
                    return;
                }
                const principal = snap.principal.toText();
                try {
                    await (provider === 'paypal'
                        ? linkPayPalSubscriptionToPrincipal({
                              fusionPendingId: this._fusionPendingId,
                              email,
                              principal,
                              subscriptionId: this._fusionSubscriptionId || undefined,
                          })
                        : linkSubscriptionToPrincipal({
                              fusionPendingId: this._fusionPendingId,
                              email,
                              principal,
                              subscriptionId: this._fusionSubscriptionId || undefined,
                          }));
                } catch (linkErr) {
                    const raw = linkErr instanceof Error ? linkErr.message : String(linkErr);
                    const line = mapIntegrationUserMessage(raw, 0);
                    try {
                        posthog.capture('program_application_link_failed', {
                            ...this._posthogApplicationBaseProps(),
                            payment_plan: this._paymentPlan || 'unknown',
                        });
                    } catch {
                        /* ignore */
                    }
                    this._setPaySubmittingState(false, '');
                    if (statusEl) {
                        statusEl.textContent = line;
                        statusEl.classList.add('is-error');
                    }
                    return;
                }
                try {
                    if (this._fusionPendingId || this._fusionSubscriptionId) {
                        sessionStorage.setItem(
                            FUSION_PENDING_APPLICATION_SUB_KEY,
                            JSON.stringify({
                                fusionPendingId: this._fusionPendingId,
                                subscriptionId: this._fusionSubscriptionId,
                                email,
                                programId,
                            })
                        );
                    }
                    setPendingPaymentEmailLocal({
                        email,
                        source: 'application',
                        fusionPendingId: this._fusionPendingId || '',
                        subscriptionId: this._fusionSubscriptionId || '',
                        programId,
                    });
                } catch {
                    /* ignore */
                }
            } else {
                try {
                    if (
                        (this._fusionPendingId || this._fusionSubscriptionId) &&
                        email.includes('@')
                    ) {
                        sessionStorage.setItem(
                            FUSION_PENDING_APPLICATION_SUB_KEY,
                            JSON.stringify({
                                fusionPendingId: this._fusionPendingId,
                                subscriptionId: this._fusionSubscriptionId,
                                email,
                                programId,
                            })
                        );
                    }
                    if (email.includes('@')) {
                        setPendingPaymentEmailLocal({
                            email,
                            source: 'application',
                            fusionPendingId: this._fusionPendingId || '',
                            subscriptionId: this._fusionSubscriptionId || '',
                            programId,
                        });
                    }
                } catch {
                    /* ignore */
                }
            }

            await this._submitApplication();
        } catch (err) {
            const stripeErr =
                err &&
                typeof err === 'object' &&
                'stripeError' in err &&
                /** @type {{ stripeError?: import('@stripe/stripe-js').StripeError }} */ (err).stripeError
                    ? /** @type {{ stripeError?: import('@stripe/stripe-js').StripeError }} */ (err).stripeError
                    : null;
            try {
                posthog.capture('program_application_payment_failed', {
                    ...this._posthogApplicationBaseProps(),
                    payment_plan: this._paymentPlan || 'unknown',
                    failure_stage: 'stripe_confirm',
                    ...(stripeErr && typeof stripeErr === 'object'
                        ? {
                              ...(stripeErr.type ? { stripe_error_type: String(stripeErr.type) } : {}),
                              ...(stripeErr.code ? { stripe_error_code: String(stripeErr.code) } : {}),
                              ...(stripeErr.decline_code ? { stripe_decline_code: String(stripeErr.decline_code) } : {}),
                          }
                        : { error_kind: 'exception' }),
                });
            } catch {
                /* ignore */
            }
            const line = err instanceof Error ? err.message : L.paymentFailed;
            if (statusEl) {
                statusEl.textContent = line;
                statusEl.classList.add('is-error');
            }
        } finally {
            this._setPaySubmittingState(false, '');
        }
    }

    /**
     * Payment fee row: spinner + copy + notice styling (Stripe prepare + pay submit).
     * @param {ShadowRoot | null | undefined} root
     * @param {{ busy?: boolean, text?: string }} opts — `text` omitted leaves copy unchanged
     */
    _syncPaymentHintChrome(root, opts) {
        const busy = !!opts?.busy;
        const text = opts?.text;
        const hint = root?.querySelector('#app-payment-hint');
        const wrap = root?.querySelector('#app-payment-hint-wrap');
        const loadingEl = root?.querySelector('#app-payment-loading');
        if (hint) {
            if (text !== undefined) hint.textContent = text;
            hint.classList.toggle('is-busy', busy);
        }
        if (wrap instanceof HTMLElement) {
            wrap.classList.toggle('is-busy', busy);
            wrap.setAttribute('aria-busy', busy ? 'true' : 'false');
        }
        if (loadingEl instanceof HTMLElement) {
            if (busy) {
                loadingEl.removeAttribute('hidden');
                loadingEl.setAttribute('aria-hidden', 'false');
            } else {
                loadingEl.setAttribute('hidden', '');
                loadingEl.setAttribute('aria-hidden', 'true');
            }
        }
    }

    _setPaySubmittingState(on, text) {
        const root = this.shadowRoot;
        const payBtn = root?.querySelector('#app-pay-submit');
        if (payBtn) {
            payBtn.disabled = on;
            payBtn.classList.toggle('is-loading', on);
        }
        this._syncPaymentHintChrome(root, { busy: on, text });
    }

    _wireControls() {
        const root = this.shadowRoot;
        if (!root) return;

        if (this._wireAbort) this._wireAbort.abort();
        this._wireAbort = new AbortController();
        const { signal } = this._wireAbort;

        const form = root.querySelector('#app-application-form-fields');
        form?.addEventListener(
            'submit',
            (e) => {
                e.preventDefault();
            },
            { signal }
        );

        root.querySelector('#app-pay-submit')?.addEventListener(
            'click',
            () => {
                void this._onPaySubmitClick();
            },
            { signal }
        );
        root.addEventListener(
            'click',
            (e) => {
                const t = e.target;
                if (!(t instanceof Element)) return;
                const a = t.closest('.app-inline-details-link');
                if (!a || !root.contains(a)) return;
                e.preventDefault();
                const id = this._programFormContext.detailsSectionId || 'programDetailsSection';
                document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            },
            { signal }
        );

        root.querySelector('#app-view-program-details')?.addEventListener(
            'click',
            () => {
                const id = this._programFormContext.detailsSectionId || 'programDetailsSection';
                scrollElementTopToViewportGap(
                    document.getElementById(id),
                    PROGRAM_APPLICATION_VIEWPORT_TOP_GAP_PX
                );
            },
            { signal }
        );

        root.addEventListener(
            'click',
            (e) => {
                const t = e.target;
                if (!(t instanceof Element)) return;
                if (this._alreadyApplied || this._membershipFeeWaived) return;
                const exploreBtn = t.closest('#app-explore-memberships-toggle');
                if (exploreBtn && root.contains(exploreBtn)) {
                    this._membershipsExpanded = !this._membershipsExpanded;
                    if (this._membershipsExpanded) {
                        this._paymentPlan = null;
                        this._checkoutPhase = null;
                        this._teardownStripePayment();
                    }
                    this._hydratePaymentPlanCards();
                    this._syncPaymentPlanUi();
                    return;
                }
                const btn = t.closest('[data-app-payment-plan]');
                if (!btn || !root.contains(btn)) return;
                if (btn.hasAttribute('disabled')) return;
                const plan = btn.getAttribute('data-app-payment-plan');
                if (
                    plan === 'one_time' ||
                    plan === 'monthly' ||
                    plan === 'quarterly' ||
                    plan === 'annual' ||
                    plan === 'member_fee'
                ) {
                    this._onPaymentPlanSelected(/** @type {'one_time' | 'monthly' | 'quarterly' | 'annual' | 'member_fee'} */ (plan));
                }
            },
            { signal }
        );

        form?.addEventListener('input', () => this._touchDirty(), { passive: true, signal });
        form?.addEventListener('change', () => this._touchDirty(), { passive: true, signal });
        // Persist draft when leaving a field (click-away / tab-out).
        form?.addEventListener(
            'focusout',
            (e) => {
                const t = e.target;
                if (
                    !(t instanceof HTMLInputElement) &&
                    !(t instanceof HTMLTextAreaElement) &&
                    !(t instanceof HTMLSelectElement)
                ) {
                    return;
                }
                this._saveApplicationDraftFromForm();
            },
            { signal }
        );

        root.querySelector('#app-submit-updates')?.addEventListener(
            'click',
            () => {
                void this._onSubmitUpdatesClick();
            },
            { signal }
        );

        root.querySelector('#app-submit-free')?.addEventListener(
            'click',
            () => {
                void this._onSubmitFreeClick();
            },
            { signal }
        );

        window.addEventListener(
            'fusion-localechange',
            () => {
                this._hydrateProgramContextInDom();
            },
            { signal }
        );

        window.addEventListener(
            'fusion-auth-change',
            () => {
                void this._hydrateMembershipAndPrefill();
            },
            { signal }
        );
    }

    async _onPaySubmitClick() {
        if (!this._ensureStep0OrPrompt()) return;
        await this._confirmPayAndSubmit();
    }

    /**
     * Sync payment vs. member-waiver vs. already-applied sections (mutually exclusive).
     */
    _syncApplicationFeeUi() {
        const root = this.shadowRoot;
        if (!root) return;
        const L = this._labels();
        const pay = root.querySelector('#app-payment-section');
        const updatesWrap = root.querySelector('#app-submit-updates-wrap');
        const freeWrap = root.querySelector('#app-submit-free-wrap');
        const banner = root.querySelector('#app-membership-fee-waived-banner');
        const lead = root.querySelector('#app-portfolio-lead');
        const ctaStack = root.querySelector('#app-payment-cta-stack');

        if (this._alreadyApplied) {
            if (pay instanceof HTMLElement) pay.setAttribute('hidden', '');
            if (updatesWrap instanceof HTMLElement) updatesWrap.removeAttribute('hidden');
            if (freeWrap instanceof HTMLElement) freeWrap.setAttribute('hidden', '');
            if (banner instanceof HTMLElement) banner.setAttribute('hidden', '');
            if (lead) lead.textContent = L.lead2AlreadyApplied;
            this._teardownStripePayment();
            return;
        }
        if (this._awardPathBlocked) {
            if (pay instanceof HTMLElement) pay.setAttribute('hidden', '');
            if (updatesWrap instanceof HTMLElement) updatesWrap.setAttribute('hidden', '');
            if (freeWrap instanceof HTMLElement) freeWrap.setAttribute('hidden', '');
            if (banner instanceof HTMLElement) {
                banner.removeAttribute('hidden');
                banner.textContent = L.awardPathBlocked || '';
            }
            if (lead) lead.textContent = L.awardPathBlocked || L.lead2;
            this._teardownStripePayment();
            return;
        }
        if (this._membershipFeeWaived) {
            const reason = String(this._memberApplicationFee?.reason || '');
            const usingCredit = reason === 'credit';
            if (pay instanceof HTMLElement) pay.setAttribute('hidden', '');
            if (updatesWrap instanceof HTMLElement) updatesWrap.setAttribute('hidden', '');
            if (freeWrap instanceof HTMLElement) freeWrap.removeAttribute('hidden');
            if (banner instanceof HTMLElement) {
                // Soft membership banner only for exempt / temp waive — not credit path.
                banner.toggleAttribute('hidden', usingCredit);
            }
            if (lead) {
                lead.textContent = usingCredit
                    ? L.lead2UsingCredit || L.lead2MemberFeeWaived
                    : L.lead2MemberFeeWaived;
            }
            this._hydratePaymentPlanCards();
            this._syncCreditCalloutUi(L);
            this._teardownStripePayment();
            return;
        }
        if (pay instanceof HTMLElement) pay.removeAttribute('hidden');
        if (updatesWrap instanceof HTMLElement) updatesWrap.setAttribute('hidden', '');
        if (freeWrap instanceof HTMLElement) freeWrap.setAttribute('hidden', '');
        if (banner instanceof HTMLElement) banner.setAttribute('hidden', '');
        if (lead) lead.textContent = L.lead2;
        if (ctaStack instanceof HTMLElement) {
            ctaStack.toggleAttribute('hidden', !!this._memberFeeOnly);
        }
        this._hydratePaymentPlanCards();
    }

    /**
     * @param {boolean} on
     */
    _applyAlreadyAppliedUi(on) {
        this._alreadyApplied = !!on;
        this._syncApplicationFeeUi();
    }

    async _hydrateMembershipAndPrefill() {
        this._membershipFeeWaived = false;
        this._memberFeeOnly = false;
        this._memberApplicationFee = null;
        this._membershipGate = 'unknown';
        this._awardPathBlocked = false;
        try {
            const snap = await getAuthSnapshot();
            if (!snap.authenticated) {
                this._membershipGate = 'noAccount';
            } else {
                let gate = await getMembershipAccessForCaller();
                if (gate === 'needsSubscription') {
                    const pr = snap.principal.toText();
                    try {
                        await syncSubscriptionFromStripe(pr);
                        const billingEmail = getStoredBillingEmailForPrincipal(pr);
                        const pendingJoin = readPendingPaymentEmailLocal('join');
                        const syncEmail =
                            billingEmail ||
                            pendingJoin?.email ||
                            String(this.shadowRoot?.querySelector('#app-email')?.value ?? '').trim();
                        if (syncEmail.includes('@')) {
                            await syncSubscriptionFromStripeByEmail(syncEmail, pr);
                        }
                        gate = await getMembershipAccessForCaller();
                    } catch {
                        /* keep needsSubscription */
                    }
                }
                this._membershipGate = gate;
                if (gate === 'ok' || gate === 'exempt') {
                    const ens = await ensureMyLinkedArtistProfileForApplication();
                    if (ens === 'ok' || ens === 'alreadyLinked') {
                        const programId = this.getAttribute('data-program-id') || '';
                        try {
                            const { getMyProgramPath } = await import('../../utils/database.js');
                            const path = await getMyProgramPath(programId);
                            if (path === 'award') {
                                this._awardPathBlocked = true;
                            }
                        } catch {
                            /* ignore */
                        }
                        this._memberApplicationFee = await applicationFeeDueForCaller(programId);
                        const due = Number(this._memberApplicationFee?.dueCents);
                        const reason = String(this._memberApplicationFee?.reason || '');
                        if (this._awardPathBlocked) {
                            this._membershipFeeWaived = false;
                            this._memberFeeOnly = false;
                        } else if (due === 0 || reason === 'membership_temp' || reason === 'credit' || reason === 'exempt') {
                            this._membershipFeeWaived = true;
                            this._memberFeeOnly = false;
                            this._paymentPlan = null;
                        } else if (due === APPLICATION_FEE_MEMBER_CENTS) {
                            this._memberFeeOnly = true;
                            this._paymentPlan = 'member_fee';
                            this._checkoutPhase = null;
                            this._syncPaymentPlanUi();
                        }
                    }
                }
            }
        } catch {
            this._membershipFeeWaived = false;
            this._memberFeeOnly = false;
            this._memberApplicationFee = null;
            this._awardPathBlocked = false;
        }
        this._syncApplicationFeeUi();
        await this._prefillFromArtist();
        if (this.shadowRoot) this._hydrateProgramContextInDom();
        if (this._memberFeeOnly && this._paymentPlan === 'member_fee') {
            void this._prepareStripePayment();
        }
    }

    /**
     * Call when the program application block is actually shown (after CTA / Begin, not on mount).
     * Sends `program_application_started` once per in-DOM form instance; see `revealProgramApplicationOrOpenJoin`.
     */
    notifyApplicationFunnelRevealed() {
        if (this._hasCapturedProgramApplicationStarted) return;
        this._hasCapturedProgramApplicationStarted = true;
        try {
            posthog.capture('program_application_started', {
                ...this._posthogApplicationBaseProps(),
            });
        } catch {
            /* ignore */
        }
    }

    async _onSubmitUpdatesClick() {
        if (!this._alreadyApplied) return;
        if (!this._ensureStep0OrPrompt()) return;
        await this._submitApplication();
    }

    async _onSubmitFreeClick() {
        if (!this._membershipFeeWaived || this._alreadyApplied) return;
        if (!this._ensureStep0OrPrompt()) return;
        await this._submitApplication();
    }

    /**
     * @param {'one_time' | 'monthly' | 'quarterly' | 'annual' | 'member_fee'} plan
     */
    _onPaymentPlanSelected(plan) {
        if (this._alreadyApplied || this._membershipFeeWaived) return;
        if (plan === 'one_time' && this._guestApplicationFeeCents() == null) return;
        if (!this._ensureStep0OrPrompt()) return;
        this._paymentPlan = plan;
        this._checkoutPhase = null;
        this._membershipsExpanded = plan !== 'one_time' && plan !== 'member_fee';
        this._syncPaymentPlanUi();
        this._teardownStripePayment();
        this._saveApplicationDraftFromForm();
        try {
            posthog.capture('program_application_payment_plan_selected', {
                ...this._posthogApplicationBaseProps(),
                payment_plan: plan,
                funnel_step: 'payment_option_clicked',
                ads_conversion: 'InitiateCheckout',
            });
            const pid = String(this.getAttribute('data-program-id') || '').trim();
            metaTrack('InitiateCheckout', {
                content_name: 'program_application',
                payment_plan: plan,
                ...(pid ? { content_ids: [pid] } : {}),
            });
        } catch {
            /* ignore */
        }
        void this._prepareStripePayment();
    }

    _syncPaymentPlanUi() {
        const root = this.shadowRoot;
        if (!root) return;
        const plan = this._paymentPlan;
        root.querySelectorAll('[data-app-payment-plan]').forEach((el) => {
            if (!(el instanceof HTMLElement)) return;
            const p = el.getAttribute('data-app-payment-plan');
            const sel = p === plan;
            el.classList.toggle('is-selected', sel);
            el.setAttribute('aria-checked', sel ? 'true' : 'false');
        });
        const payBtn = root.querySelector('#app-pay-submit');
        if (payBtn instanceof HTMLElement) {
            const L = this._labels();
            if (this._planSubmitWithoutOneTime() && this._fusionSubscriptionId) {
                payBtn.textContent = L.submitApplicationOnly;
            } else {
                payBtn.textContent = L.payAndSubmitApplication;
            }
        }
        this._hydratePaymentPlanCards();
        this._syncPaymentCheckoutVisibility();
    }

    /**
     * @returns {Record<string, string>}
     */
    _collectPayload() {
        const root = this.shadowRoot;
        const get = (id) => root?.querySelector(`#${id}`)?.value ?? '';
        const websiteRaw = String(get('app-website')).trim();
        return {
            firstName: String(get('app-first-name')).trim(),
            lastName: String(get('app-last-name')).trim(),
            email: String(get('app-email')).trim(),
            country: String(get('app-country')).trim(),
            stateProvince: String(get('app-state')).trim(),
            city: String(get('app-city')).trim(),
            website: normalizeWebsiteForPayload(websiteRaw),
            discipline: String(get('app-discipline')).trim(),
            bioStatement: String(get('app-bio')).trim(),
            exploration: String(get('app-exploration')).trim(),
            residencyGoals: String(get('app-goals')).trim(),
        };
    }

    _saveApplicationDraftFromForm() {
        const programId = this.getAttribute('data-program-id') || '';
        if (!programId || this._alreadyApplied) return;
        const payload = this._collectPayload();
        // Keep the typed website string in the draft (not only normalized).
        const websiteRaw = String(
            this.shadowRoot?.querySelector('#app-website')?.value ?? ''
        ).trim();
        saveProgramApplicationDraft(programId, {
            ...payload,
            website: websiteRaw || payload.website,
            paymentPlan: this._paymentPlan,
        });
    }

    /**
     * Restore local draft after profile prefill. Server "already applied" payload wins.
     */
    _restoreApplicationDraft() {
        const root = this.shadowRoot;
        if (!root || this._alreadyApplied) return;
        const programId = this.getAttribute('data-program-id') || '';
        if (!programId) return;
        const draft = getProgramApplicationDraft(programId);
        if (!draft) return;

        /** @param {string} id @param {string | undefined} v */
        const setVal = (id, v) => {
            if (v == null || !String(v).trim()) return;
            const el = root.querySelector(`#${id}`);
            if (el && 'value' in el) el.value = String(v);
        };

        setVal('app-first-name', draft.firstName);
        setVal('app-last-name', draft.lastName);
        setVal('app-email', draft.email);
        setVal('app-country', draft.country);
        setVal('app-state', draft.stateProvince);
        setVal('app-city', draft.city);
        setVal('app-website', draft.website);
        setVal('app-discipline', draft.discipline);
        setVal('app-bio', draft.bioStatement);
        setVal('app-exploration', draft.exploration);
        setVal('app-goals', draft.residencyGoals);

        if (
            draft.paymentPlan === 'one_time' ||
            draft.paymentPlan === 'monthly' ||
            draft.paymentPlan === 'quarterly' ||
            draft.paymentPlan === 'annual' ||
            draft.paymentPlan === 'member_fee'
        ) {
            if (!(this._alreadyApplied || this._membershipFeeWaived)) {
                this._paymentPlan = draft.paymentPlan;
                this._membershipsExpanded =
                    draft.paymentPlan !== 'one_time' && draft.paymentPlan !== 'member_fee';
                this._syncPaymentPlanUi();
                void this._prepareStripePayment();
            }
        }
    }

    async _submitApplication() {
        const root = this.shadowRoot;
        const statusEl = root?.querySelector('#app-form-status');
        const programId = this.getAttribute('data-program-id') || '';
        const L = this._labels();
        if (!programId) {
            if (statusEl) {
                statusEl.textContent = 'Missing program id.';
                statusEl.classList.add('is-error');
            }
            return;
        }
        if (!this._ensureStep0OrPrompt()) return;
        if (statusEl) {
            statusEl.textContent = '';
            statusEl.classList.remove('is-error', 'is-success');
        }
        const payload = this._collectPayload();
        this._setSubmittingState(true, L.submitting);
        try {
            const ens = await ensureMyLinkedArtistProfileForApplication();
            if (ens === 'noAccount') {
                throw Object.assign(new Error(PROGRAM_APPLICATION_ERROR_CODE.NO_ACCOUNT), {
                    code: PROGRAM_APPLICATION_ERROR_CODE.NO_ACCOUNT,
                });
            }
            if (ens !== 'ok' && ens !== 'alreadyLinked') {
                throw Object.assign(new Error(PROGRAM_APPLICATION_ERROR_CODE.NO_LINKED_ARTIST), {
                    code: PROGRAM_APPLICATION_ERROR_CODE.NO_LINKED_ARTIST,
                });
            }
            await submitProgramApplication(programId, payload);
            syncPosthogConversionPerson({
                email: payload.email,
                firstName: payload.firstName,
                lastName: payload.lastName,
            });
            posthog.capture('program_application_submitted', {
                ...this._posthogApplicationBaseProps(),
                ...(this._paymentPlan ? { payment_plan: this._paymentPlan } : {}),
                ads_conversion: 'SubmitApplication',
            });
            {
                const pid = String(programId || '').trim();
                if (pid) {
                    metaTrack('SubmitApplication', { content_ids: [pid] });
                } else {
                    metaTrack('SubmitApplication');
                }
            }
            try {
                const snap = await getAuthSnapshot();
                const em = String(payload.email || '').trim();
                if (snap.authenticated && em.includes('@')) {
                    setStoredBillingEmailForPrincipal(snap.principal.toText(), em);
                }
                clearPendingPaymentEmailLocal('application');
            } catch {
                /* ignore */
            }
            if (statusEl) statusEl.classList.add('is-success');
            this._clearDirtyState();
            clearProgramApplicationDraft(programId);
            this._showSubmitSuccess(programId);
        } catch (err) {
            const code = err && typeof err === 'object' && 'code' in err ? String(/** @type {{ code?: unknown }} */ (err).code) : '';
            const raw = err instanceof Error ? err.message : String(err);
            const blob = `${raw} ${err && typeof err === 'object' && 'message' in err ? String(/** @type {{ message?: unknown }} */ (err).message) : ''}`;
            let gateErr = err;
            if (!code && /No account for caller/i.test(blob)) {
                gateErr = Object.assign(new Error(PROGRAM_APPLICATION_ERROR_CODE.NO_ACCOUNT), {
                    code: PROGRAM_APPLICATION_ERROR_CODE.NO_ACCOUNT,
                });
            } else if (!code && /No linked artist on account/i.test(blob)) {
                gateErr = Object.assign(new Error(PROGRAM_APPLICATION_ERROR_CODE.NO_LINKED_ARTIST), {
                    code: PROGRAM_APPLICATION_ERROR_CODE.NO_LINKED_ARTIST,
                });
            }
            const gated = this._handleAccountGateError(gateErr);
            let line = L.submitError;
            if (!gated) {
                if (
                    raw &&
                    raw.length < 280 &&
                    !/Request ID:|Reject code:|ic0\.trap|Canister called/i.test(raw)
                ) {
                    line = raw;
                }
                if (statusEl) {
                    statusEl.textContent = line;
                    statusEl.classList.add('is-error');
                }
            }
            posthog.capture('program_application_failed', {
                ...this._posthogApplicationBaseProps(),
                error_code: code || 'unknown',
                ...(this._paymentPlan ? { payment_plan: this._paymentPlan } : {}),
            });
            if (typeof console !== 'undefined' && console.error) {
                console.error('[ApplicationForm]', err);
            }
        } finally {
            this._setSubmittingState(false, '');
        }
    }

    _setSubmittingState(on, text) {
        const root = this.shadowRoot;
        const form = root?.querySelector('#app-application-form-fields');
        const statusEl = root?.querySelector('#app-form-status');
        const submitBtn = root?.querySelector('.app-btn[type="submit"]');
        if (form) {
            form.classList.toggle('is-submitting', on);
            form.querySelectorAll('input, textarea, select, button').forEach((el) => {
                if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || el instanceof HTMLButtonElement) {
                    el.disabled = on;
                }
            });
        }
        if (submitBtn) submitBtn.classList.toggle('is-loading', on);
        if (statusEl) {
            statusEl.classList.remove('is-error');
            statusEl.textContent = on ? text : statusEl.textContent;
        }
    }

    _showSubmitSuccess(programId) {
        const root = this.shadowRoot;
        if (!root) return;
        const L = this._labels();
        const popup = root.querySelector('#app-submit-success');
        const title = root.querySelector('#app-submit-success-title');
        const body = root.querySelector('#app-submit-success-body');
        if (title) title.textContent = L.submitReceivedTitle;
        if (body) body.textContent = L.submitReceivedBody;
        popup?.removeAttribute('hidden');
        root.querySelector('#app-form-main')?.setAttribute('hidden', '');
        const statusEl = root.querySelector('#app-form-status');
        if (statusEl) {
            statusEl.classList.remove('is-error');
            statusEl.classList.add('is-success');
            statusEl.textContent = '';
        }
        window.dispatchEvent(
            new CustomEvent('fusion-program-application-submitted', {
                detail: { programId, status: 'reviewing' },
            })
        );
    }

    async _prefillFromArtist() {
        const root = this.shadowRoot;
        if (!root) return;
        this._alreadyApplied = false;

        const programId = this.getAttribute('data-program-id') || '';
        let rec;
        try {
            rec = await getMyArtistRecord();
        } catch {
            this._restoreApplicationDraft();
            this._syncApplicationFeeUi();
            return;
        }
        if (!rec) {
            this._restoreApplicationDraft();
            this._syncApplicationFeeUi();
            return;
        }

        const locale = typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
        let locales = {};
        try {
            const lj = rec.locales_json ?? rec.localesJson;
            const raw = typeof lj === 'string' ? lj : '';
            locales = raw ? JSON.parse(raw) : {};
        } catch {
            locales = {};
        }
        const block = locales[locale] || locales.en || {};
        const name = String(block.name || '').trim();
        const parts = name.split(/\s+/).filter(Boolean);
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';
        const loc = block.location && typeof block.location === 'object' ? block.location : {};
        const country = String(loc.country || '').trim();
        const stateProvince = String(loc.state || loc.region || '').trim();
        const city = String(loc.city || '').trim();

        const setVal = (id, v) => {
            const el = root.querySelector(`#${id}`);
            if (el && 'value' in el) el.value = v;
        };

        if (firstName) setVal('app-first-name', firstName);
        if (lastName) setVal('app-last-name', lastName);
        if (country) setVal('app-country', country);
        if (stateProvince) setVal('app-state', stateProvince);
        if (city) setVal('app-city', city);
        if (block.discipline) setVal('app-discipline', String(block.discipline));

        const draft = getProfileSetupDraft();
        const nameParts = String(draft.fullName || '').trim().split(/\s+/).filter(Boolean);
        const draftFirst = nameParts[0] || '';
        const draftLast = nameParts.slice(1).join(' ');
        const setIfEmpty = (id, v) => {
            if (!v) return;
            const el = root.querySelector(`#${id}`);
            if (!el || !('value' in el)) return;
            if (String(el.value || '').trim()) return;
            el.value = v;
        };
        setIfEmpty('app-first-name', draftFirst);
        setIfEmpty('app-last-name', draftLast);
        setIfEmpty('app-email', String(draft.email || '').trim());

        const webFromLinks = pickWebsiteFromProfileLinks(block.links);
        const bioFromProfile =
            String(block.bio || '').trim() || String(block.bioLong || '').trim();
        setIfEmpty('app-website', webFromLinks);
        setIfEmpty('app-bio', bioFromProfile);

        const appliedRaw = rec.applied_json ?? rec.appliedJson;
        if (programId && appliedRaw) {
            try {
                const applied = typeof appliedRaw === 'string' ? JSON.parse(appliedRaw) : appliedRaw;
                const entry = applied[programId];
                const p = entry && typeof entry === 'object' ? entry.payload : null;
                if (p && typeof p === 'object') {
                    if (p.firstName != null) setVal('app-first-name', String(p.firstName));
                    if (p.lastName != null) setVal('app-last-name', String(p.lastName));
                    if (p.email != null) setVal('app-email', String(p.email));
                    if (p.country != null) setVal('app-country', String(p.country));
                    if (p.stateProvince != null) setVal('app-state', String(p.stateProvince));
                    if (p.city != null) setVal('app-city', String(p.city));
                    if (p.website != null) setVal('app-website', String(p.website));
                    if (p.discipline != null) setVal('app-discipline', String(p.discipline));
                    if (p.bioStatement != null) setVal('app-bio', String(p.bioStatement));
                    if (p.exploration != null) setVal('app-exploration', String(p.exploration));
                    if (p.residencyGoals != null) setVal('app-goals', String(p.residencyGoals));
                }
                const L = this._labels();
                const statusEl = root.querySelector('#app-form-status');
                if (entry && typeof entry === 'object' && statusEl) {
                    statusEl.textContent = L.alreadyApplied;
                    statusEl.classList.remove('is-error');
                    statusEl.classList.add('is-success');
                    this._alreadyApplied = true;
                    clearProgramApplicationDraft(programId);
                    this._syncApplicationFeeUi();
                    window.dispatchEvent(
                        new CustomEvent('fusion-program-application-submitted', {
                            detail: { programId, status: 'reviewing' },
                        })
                    );
                }
            } catch {
                /* ignore */
            }
        }
        this._restoreApplicationDraft();
        this._syncApplicationFeeUi();
    }

    _afterRender() {
        this._wireControls();
        void this._hydrateMembershipAndPrefill();
    }

    disconnectedCallback() {
        this._clearDirtyState();
        if (this._wireAbort) {
            this._wireAbort.abort();
            this._wireAbort = null;
        }
        this._teardownStripePayment();
    }

    connectedCallback() {
        this.render();
        this._afterRender();
    }

    render() {
        this._paymentPlan = null;
        this._membershipsExpanded = false;
        this._checkoutPhase = null;
        this._memberApplicationFee = null;
        this._alreadyApplied = false;
        this._membershipFeeWaived = false;
        this._memberFeeOnly = false;
        this._membershipGate = 'unknown';
        this._hasCapturedProgramApplicationStarted = false;
        this._teardownStripePayment();
        const L = this._labels();
        const I = APP_FEE_ICONS;
        const escAttr = (s) =>
            String(s)
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/</g, '&lt;');
        const escHtml = (s) =>
            String(s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        const productBullets = Array.isArray(L.productCardBullets) ? L.productCardBullets : [];
        const productBulletsHtml = productBullets
            .map(
                (t) =>
                    `<li>${appFeeIconHtml(I.benefitCheck, 'app-fee-icon app-fee-icon--check')}<span>${escHtml(t)}</span></li>`,
            )
            .join('');
        const disciplineOpts = Array.isArray(L.disciplineDatalistOptions) ? L.disciplineDatalistOptions : [];
        const disciplineDatalistHtml = disciplineOpts
            .map((v) => `<option value="${escAttr(v)}"></option>`)
            .join('');
        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    box-sizing: border-box;
                    padding: clamp(2rem, 5vw, 3.5rem) 0 clamp(3rem, 8vw, 5rem);
                }

                :host([hidden]) {
                    display: none !important;
                }

                .application-form-root {
                    width: 100%;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 clamp(1rem, 4vw, 2rem);
                    box-sizing: border-box;
                }

                .app-form-title {
                    margin: 0 0 clamp(1.25rem, 3vw, 2rem);
                    text-align: center;
                    font-size: clamp(1.25rem, 2.5vw, 1.75rem);
                    font-variation-settings: var(--fv-headline-wide);
                    color: var(--c2);
                    letter-spacing: 0.04em;
                }

                #app-form-main[hidden] {
                    display: none !important;
                }

                .app-cohort-slots {
                    max-width: 820px;
                    margin: 0 auto clamp(0.75rem, 2vw, 1.1rem);
                    padding: 0;
                    box-sizing: border-box;
                    text-align: center;
                    font-size: clamp(0.88rem, 1.05vw, 0.98rem);
                    font-variation-settings: var(--fv-body-wide);
                    color: var(--c2);
                    line-height: 1.45;
                    letter-spacing: 0.02em;
                }

                .app-cohort-slots strong {
                    font-weight: 600;
                }

                .app-cohort-slots[hidden] {
                    display: none !important;
                }

                .app-cohort-slots--payment {
                    text-align: left;
                    margin: 0 0 0.85rem;
                }

                .app-selection-intro {
                    max-width: 820px;
                    margin: 0 auto clamp(1.5rem, 4vw, 2.25rem);
                    padding: clamp(1rem, 2.5vw, 1.5rem);
                    box-sizing: border-box;
                    border: 1px solid var(--c2);
                    background: var(--c3);
                    font-size: clamp(0.88rem, 1.1vw, 0.98rem);
                    font-variation-settings: var(--fv-body-wide);
                    color: var(--c2);
                    line-height: 1.55;
                }

                .app-selection-intro .app-selection-process-heading {
                    margin: 0 0 0.65rem;
                    font-size: clamp(1rem, 1.35vw, 1.2rem);
                    font-variation-settings: var(--fv-title);
                    letter-spacing: 0.02em;
                }

                .app-selection-intro p {
                    margin: 0 0 0.5rem;
                }

                .app-selection-intro a.app-inline-details-link {
                    color: inherit;
                    text-decoration: underline;
                    text-underline-offset: 0.12em;
                }

                .app-view-details-row {
                    max-width: 820px;
                    margin: 0 auto clamp(1.5rem, 4vw, 2.25rem);
                    display: flex;
                    justify-content: center;
                }

                .app-form-card {
                    max-width: 820px;
                    margin: 0 auto;
                    padding: clamp(1.25rem, 3vw, 2rem);
                    box-sizing: border-box;
                    background: var(--c3);
                    border: 1px solid var(--c2);
                    touch-action: manipulation;
                }

                .app-form-card--spaced {
                    margin-top: clamp(1.25rem, 3vw, 2rem);
                }

                .app-form-card--payment {
                    margin-top: clamp(1.25rem, 3vw, 2rem);
                    padding: clamp(1.5rem, 3.5vw, 2.35rem);
                }

                .app-fee-icon {
                    display: inline-block;
                    flex-shrink: 0;
                    width: 1.35rem;
                    height: 1.35rem;
                    background: currentColor;
                    color: inherit;
                    mask: var(--app-fee-icon-url) center / contain no-repeat;
                    -webkit-mask: var(--app-fee-icon-url) center / contain no-repeat;
                }

                .app-fee-icon--sm {
                    width: 1.1rem;
                    height: 1.1rem;
                }

                .app-fee-icon--check {
                    width: 0.95rem;
                    height: 0.95rem;
                    margin-top: 0.12rem;
                }

                .app-fee-icon--plan {
                    width: 1.65rem;
                    height: 1.65rem;
                }

                .app-fee-icon--gift {
                    width: 2rem;
                    height: 2rem;
                }

                .app-fee-header {
                    text-align: left;
                    margin: 0 0 clamp(1.4rem, 3vw, 2rem);
                }

                .app-fee-title {
                    margin: 0 0 0.5rem;
                    font-size: clamp(1rem, 1.35vw, 1.2rem);
                    font-variation-settings: var(--fv-headline-wide);
                    color: var(--c2);
                    letter-spacing: 0.04em;
                    line-height: 1.15;
                }

                .app-fee-price {
                    margin: 0 0 0.85rem;
                    font-size: clamp(1.15rem, 1.5vw, 1.45rem);
                    font-variation-settings: var(--fv-emphasis);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                }

                .app-fee-intro-wrap {
                    margin: 0;
                }

                .app-fee-intro {
                    margin: 0 0 0.85rem;
                    max-width: none;
                    font-size: clamp(0.88rem, 1.1vw, 0.98rem);
                    font-variation-settings: var(--fv-body-wide);
                    line-height: 1.5;
                    color: var(--c2);
                    opacity: 0.9;
                }

                .app-fee-intro-wrap .app-fee-intro:last-child {
                    margin-bottom: 0;
                }

                .app-fee-meta-row {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    margin: 0 0 clamp(1.6rem, 3.5vw, 2.35rem);
                    padding: 0.9rem 0;
                    border-top: 1px solid rgba(0, 0, 0, 0.12);
                    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
                }

                .app-fee-meta-row:not(:has(.app-fee-meta-slots:not([hidden]))) {
                    display: none;
                }

                .app-fee-meta-slots {
                    display: flex;
                    align-items: center;
                    gap: 0.65rem;
                    min-width: 0;
                    font-size: clamp(0.72rem, 0.9vw, 0.82rem);
                    font-variation-settings: var(--fv-caption);
                    color: var(--c2);
                    letter-spacing: 0.03em;
                    line-height: 1.3;
                }

                .app-fee-meta-slots[hidden] {
                    display: none !important;
                }

                .app-fee-meta-icon-box {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    width: 2.1rem;
                    height: 2.1rem;
                    border-radius: 8px;
                    background: rgba(0, 0, 0, 0.05);
                    color: var(--c2);
                }

                .app-fee-meta-slots-lines {
                    display: flex;
                    flex-direction: column;
                    gap: 0.1rem;
                    min-width: 0;
                }

                .app-fee-meta-slots-count {
                    font-size: clamp(0.85rem, 1.05vw, 0.98rem);
                    font-variation-settings: var(--fv-body-wide);
                    font-weight: 600;
                    letter-spacing: 0.01em;
                }

                .app-fee-meta-slots-label {
                    font-size: clamp(0.62rem, 0.75vw, 0.7rem);
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    opacity: 0.82;
                }

                .app-fee-choose {
                    text-align: center;
                    margin: 0 0 clamp(1rem, 2vw, 1.25rem);
                }

                .app-fee-choose-title {
                    margin: 0 0 0.35rem;
                    font-size: clamp(1.05rem, 1.4vw, 1.25rem);
                    font-variation-settings: var(--fv-title);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                }

                .app-fee-choose-sub {
                    margin: 0 auto;
                    max-width: 34rem;
                    font-size: clamp(0.88rem, 1.1vw, 0.98rem);
                    font-variation-settings: var(--fv-body-wide);
                    color: var(--c2);
                    line-height: 1.5;
                    opacity: 0.9;
                }

                .app-fee-product-card {
                    display: grid;
                    grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
                    gap: clamp(1rem, 2.2vw, 1.75rem);
                    align-items: center;
                    margin: 0 0 clamp(1rem, 2vw, 1.25rem);
                    padding: clamp(1.1rem, 2vw, 1.45rem) clamp(1.15rem, 2.2vw, 1.6rem);
                    border: 1px solid rgba(0, 0, 0, 0.12);
                    border-radius: 10px;
                    background: color-mix(in srgb, var(--c3) 92%, #f3f3f3);
                    box-sizing: border-box;
                }

                .app-fee-product-card__main {
                    display: flex;
                    align-items: center;
                    gap: 0.9rem;
                    min-width: 0;
                }

                .app-fee-product-card__icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 3.25rem;
                    height: 3.25rem;
                    flex-shrink: 0;
                    border-radius: 50%;
                    background: rgba(0, 0, 0, 0.06);
                }

                .app-fee-product-card__copy {
                    min-width: 0;
                }

                .app-fee-product-card__title {
                    margin: 0 0 0.15rem;
                    font-size: clamp(1rem, 1.25vw, 1.12rem);
                    font-variation-settings: var(--fv-title);
                    font-weight: 700;
                    color: var(--c2);
                }

                .app-fee-product-card__price {
                    margin: 0 0 0.45rem;
                    font-size: clamp(1.35rem, 1.8vw, 1.65rem);
                    font-variation-settings: var(--fv-emphasis);
                    font-weight: 700;
                    color: var(--c2);
                    line-height: 1.1;
                }

                .app-fee-product-card__badge {
                    display: inline-block;
                    padding: 0.28rem 0.65rem;
                    border-radius: 999px;
                    background: rgba(0, 0, 0, 0.07);
                    color: var(--c2);
                    font-size: clamp(0.62rem, 0.75vw, 0.7rem);
                    font-variation-settings: var(--fv-label-strong);
                    font-weight: 700;
                    letter-spacing: 0.07em;
                    text-transform: uppercase;
                }

                .app-fee-product-card__list {
                    list-style: none;
                    margin: 0;
                    padding: 0;
                }

                .app-fee-product-card__list li {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.45rem;
                    margin: 0 0 0.4rem;
                    font-size: clamp(0.82rem, 0.98vw, 0.92rem);
                    font-variation-settings: var(--fv-body-wide);
                    line-height: 1.4;
                    color: var(--c2);
                }

                .app-fee-product-card__list li:last-child {
                    margin-bottom: 0;
                }

                .app-fee-product-card[hidden] {
                    display: none !important;
                }

                .app-payment-fee-lead {
                    display: none;
                }

                .app-payment-plan-grid {
                    display: none;
                }

                .app-payment-cta-stack {
                    display: flex;
                    flex-direction: column;
                    gap: clamp(1rem, 2vw, 1.35rem);
                    margin: 0 0 clamp(1.25rem, 2.5vw, 1.75rem);
                }

                .app-payment-cta-stack[hidden] {
                    display: none !important;
                }

                .app-payment-cta-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: clamp(0.75rem, 1.6vw, 1rem);
                    width: 100%;
                }

                .app-payment-cta {
                    display: inline-flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 0.2rem;
                    width: 100%;
                    min-height: 3.6rem;
                    margin: 0;
                    padding: clamp(0.95rem, 1.8vw, 1.15rem) clamp(0.85rem, 1.6vw, 1.25rem);
                    box-sizing: border-box;
                    border: 1.5px solid var(--c2);
                    border-radius: 6px;
                    background: var(--c3);
                    color: var(--c2);
                    text-align: center;
                    cursor: pointer;
                    font-family: inherit;
                    transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
                }

                .app-payment-cta:hover:not([disabled]) {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
                }

                .app-payment-cta.is-selected {
                    box-shadow: 0 0 0 2px color-mix(in srgb, var(--c4) 55%, transparent);
                }

                .app-payment-cta[disabled],
                .app-payment-cta.is-unavailable {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }

                .app-payment-cta--primary {
                    background: var(--c2);
                    color: var(--c3);
                    border-color: var(--c2);
                    font-size: clamp(0.78rem, 0.95vw, 0.9rem);
                    font-variation-settings: var(--fv-label-strong);
                    font-weight: 700;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                }

                .app-payment-cta--primary:hover:not([disabled]) {
                    background: color-mix(in srgb, var(--c2) 88%, #000);
                    border-color: color-mix(in srgb, var(--c2) 88%, #000);
                }

                .app-payment-cta--primary.is-selected {
                    background: var(--c2);
                    color: var(--c3);
                    border-color: var(--c4);
                }

                .app-payment-cta--secondary {
                    background: var(--c3);
                    color: var(--c2);
                    border-color: var(--c2);
                    font-size: clamp(0.78rem, 0.95vw, 0.9rem);
                    font-variation-settings: var(--fv-label-strong);
                    font-weight: 700;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                }

                .app-payment-cta--secondary:hover:not([disabled]) {
                    background: color-mix(in srgb, var(--c2) 4%, var(--c3));
                }

                .app-payment-cta--secondary[aria-expanded='true'] {
                    background: color-mix(in srgb, var(--c2) 6%, var(--c3));
                    border-color: var(--c4);
                }

                .app-payment-cta-title {
                    display: block;
                    line-height: 1.25;
                }

                .app-payment-cta-sub {
                    display: none;
                }

                .app-member-fee-only-banner,
                .app-member-credit-note {
                    margin: 0 0 1rem;
                    font-size: clamp(0.88rem, 1.05vw, 0.96rem);
                    font-variation-settings: var(--fv-body-wide);
                    line-height: 1.5;
                    color: var(--c2);
                }

                .app-member-fee-only-banner[hidden],
                .app-member-credit-note[hidden] {
                    display: none !important;
                }

                .app-credit-callout {
                    margin: 0 0 1.15rem;
                    padding: 1rem 1.1rem;
                    border: 1px solid color-mix(in srgb, #3f7e5a 35%, transparent);
                    border-radius: 8px;
                    background: color-mix(in srgb, #3f7e5a 10%, #fff);
                }

                .app-credit-callout[hidden] {
                    display: none !important;
                }

                .app-credit-callout__eyebrow {
                    margin: 0 0 0.35rem;
                    font-size: 0.72rem;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    color: #3f7e5a;
                    font-weight: 650;
                    font-variation-settings: var(--fv-label);
                }

                .app-credit-callout__title {
                    margin: 0 0 0.4rem;
                    font-size: 1.15rem;
                    line-height: 1.3;
                    font-weight: 700;
                    color: var(--c2);
                    font-variation-settings: var(--fv-emphasis);
                }

                .app-credit-callout__body {
                    margin: 0;
                    font-size: 0.92rem;
                    line-height: 1.45;
                    color: color-mix(in srgb, var(--c2) 78%, transparent);
                    font-variation-settings: var(--fv-body-wide);
                }

                .app-membership-plans-panel {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: clamp(0.85rem, 1.8vw, 1.25rem);
                    align-items: stretch;
                    width: 100%;
                    padding-top: 0.85rem;
                    animation: appMembershipPanelIn 0.28s ease;
                }

                .app-membership-plans-panel > .app-payment-plan-wrap {
                    min-height: 100%;
                }

                .app-membership-plans-panel .app-payment-plan-wrap--suggested .app-payment-membership-card {
                    border-color: var(--c4);
                    min-height: 100%;
                }

                .app-membership-plans-panel[hidden] {
                    display: none !important;
                }

                @keyframes appMembershipPanelIn {
                    from {
                        opacity: 0;
                        transform: translateY(0.35rem);
                    }
                    to {
                        opacity: 1;
                        transform: none;
                    }
                }

                .app-payment-membership-card {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    width: 100%;
                    min-height: 100%;
                    margin: 0;
                    padding: clamp(1.35rem, 2.2vw, 1.75rem) clamp(0.85rem, 1.4vw, 1.15rem) clamp(1.1rem, 1.8vw, 1.4rem);
                    box-sizing: border-box;
                    border: 1px solid rgba(0, 0, 0, 0.16);
                    border-radius: 8px;
                    background: var(--c3);
                    color: var(--c2);
                    text-align: center;
                    cursor: pointer;
                    font-family: inherit;
                    transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
                }

                .app-payment-membership-card:hover:not([disabled]) {
                    border-color: var(--c4);
                    transform: translateY(-2px);
                    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
                }

                .app-payment-membership-card.is-selected {
                    border: 2px solid var(--c4);
                    background: color-mix(in srgb, var(--c4) 12%, var(--c3));
                    box-shadow: 0 0 0 1px color-mix(in srgb, var(--c4) 40%, transparent);
                }

                .app-payment-membership-card .app-payment-plan-radio {
                    position: absolute;
                    top: 0.75rem;
                    left: 0.75rem;
                }

                .app-payment-membership-card.is-selected .app-payment-plan-radio {
                    border-color: var(--c4);
                    box-shadow: inset 0 0 0 3px var(--c3);
                    background: var(--c4);
                }

                .app-payment-membership-card .app-payment-plan-icon-wrap {
                    margin-left: auto;
                    margin-right: auto;
                }

                .app-payment-membership-card.is-selected .app-payment-plan-icon-wrap {
                    background: color-mix(in srgb, var(--c4) 32%, transparent);
                }

                .app-payment-membership-card-body {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.35rem;
                    min-width: 0;
                    width: 100%;
                    padding-top: 0.15rem;
                }

                .app-payment-membership-head {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.2rem;
                    width: 100%;
                }

                .app-payment-membership-title {
                    font-size: clamp(0.86rem, 1.02vw, 0.98rem);
                    font-variation-settings: var(--fv-body-wide);
                    font-weight: 600;
                    line-height: 1.35;
                    max-width: 12.5rem;
                    min-height: 2.6em;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .app-payment-membership-price {
                    font-size: clamp(1.15rem, 1.5vw, 1.4rem);
                    font-variation-settings: var(--fv-emphasis);
                    line-height: 1.2;
                }

                .app-payment-membership-every,
                .app-payment-membership-sub2 {
                    font-size: clamp(0.74rem, 0.9vw, 0.84rem);
                    font-variation-settings: var(--fv-caption);
                    opacity: 0.9;
                    display: block;
                    max-width: 14rem;
                    margin-inline: auto;
                    line-height: 1.35;
                }

                .app-payment-membership-sub2 {
                    margin-top: 0.2rem;
                    opacity: 0.82;
                }

                .app-payment-membership-sub2[hidden] {
                    display: none !important;
                }

                .app-payment-cta-sub2 {
                    display: block;
                    margin-top: 0.2rem;
                    font-size: clamp(0.72rem, 0.88vw, 0.8rem);
                    font-variation-settings: var(--fv-caption);
                    opacity: 0.85;
                    line-height: 1.35;
                }

                .app-payment-cta-sub2[hidden] {
                    display: none !important;
                }

                .app-payment-membership-card .app-payment-plan-bullets {
                    text-align: left;
                }

                @media (max-width: 900px) {
                    .app-fee-meta-row {
                        flex-direction: column;
                        align-items: center;
                    }

                    .app-fee-product-card {
                        grid-template-columns: 1fr;
                    }

                    .app-whats-included-features {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }

                    .app-fee-footer {
                        flex-direction: column;
                        align-items: center !important;
                        gap: 1rem !important;
                    }
                }

                @media (max-width: 720px) {
                    .app-payment-cta-row {
                        grid-template-columns: 1fr;
                    }

                    .app-membership-plans-panel {
                        grid-template-columns: 1fr;
                    }

                    .app-whats-included-features {
                        grid-template-columns: 1fr 1fr;
                    }
                }

                @media (min-width: 721px) and (max-width: 1100px) {
                    .app-membership-plans-panel {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                        gap: 0.7rem;
                    }

                    .app-payment-membership-title {
                        font-size: 0.82rem;
                        min-height: 2.8em;
                    }

                    .app-payment-cta {
                        min-height: 3.35rem;
                        padding-inline: 0.7rem;
                        font-size: 0.72rem;
                    }
                }

                .app-payment-plan-wrap {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    min-height: 100%;
                }

                .app-payment-plan-wrap--suggested {
                    padding-top: 0.75rem;
                }

                .app-payment-plan-suggested-badge {
                    position: absolute;
                    top: 0;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 1;
                    padding: 0.24rem 0.7rem;
                    border-radius: 999px;
                    font-size: clamp(0.62rem, 0.72vw, 0.7rem);
                    font-variation-settings: var(--fv-label-strong);
                    font-weight: 700;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    background: var(--c4);
                    color: var(--c2);
                    white-space: nowrap;
                }

                .app-payment-plan-card {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    width: 100%;
                    min-height: 100%;
                    margin: 0;
                    padding: clamp(1.35rem, 2.2vw, 1.75rem) clamp(0.9rem, 1.5vw, 1.25rem) clamp(1.15rem, 2vw, 1.5rem);
                    box-sizing: border-box;
                    border: 1px solid rgba(0, 0, 0, 0.16);
                    border-radius: 8px;
                    background: var(--c3);
                    color: var(--c2);
                    text-align: center;
                    cursor: pointer;
                    font-family: inherit;
                    transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
                }

                .app-payment-plan-card:hover:not([disabled]) {
                    border-color: var(--c4);
                }

                .app-payment-plan-card.is-selected {
                    border: 2px solid var(--c4);
                    background: color-mix(in srgb, var(--c4) 14%, var(--c3));
                    box-shadow: 0 0 0 1px color-mix(in srgb, var(--c4) 40%, transparent);
                }

                .app-payment-plan-wrap--suggested .app-payment-plan-card {
                    border-color: var(--c4);
                }

                .app-payment-plan-card[disabled],
                .app-payment-plan-card.is-unavailable {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .app-payment-plan-radio {
                    position: absolute;
                    top: 0.75rem;
                    left: 0.75rem;
                    width: 16px;
                    height: 16px;
                    border: 2px solid var(--c2);
                    border-radius: 50%;
                    box-sizing: border-box;
                    background: var(--c3);
                }

                .app-payment-plan-card.is-selected .app-payment-plan-radio {
                    border-color: var(--c4);
                    box-shadow: inset 0 0 0 3px var(--c3);
                    background: var(--c4);
                }

                .app-payment-plan-card-body {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.4rem;
                    min-width: 0;
                    padding-top: 0.15rem;
                }

                .app-payment-plan-icon-wrap {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 3rem;
                    height: 3rem;
                    margin: 0.1rem 0 0.55rem;
                    border-radius: 50%;
                    background: rgba(0, 0, 0, 0.05);
                    color: var(--c2);
                }

                .app-payment-plan-wrap--suggested .app-payment-plan-icon-wrap,
                .app-payment-plan-card.is-selected .app-payment-plan-icon-wrap {
                    background: color-mix(in srgb, var(--c4) 32%, transparent);
                }

                .app-payment-plan-title {
                    font-size: clamp(0.86rem, 1.02vw, 0.98rem);
                    font-variation-settings: var(--fv-body-wide);
                    font-weight: 600;
                    line-height: 1.35;
                    color: var(--c2);
                    max-width: 12rem;
                    min-height: 2.6em;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .app-payment-plan-price-row {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: baseline;
                    justify-content: center;
                    gap: 0.3rem 0.45rem;
                }

                .app-payment-plan-price {
                    font-size: clamp(1.15rem, 1.5vw, 1.45rem);
                    font-variation-settings: var(--fv-emphasis);
                    color: var(--c2);
                }

                .app-payment-plan-every,
                .app-payment-plan-discount {
                    font-size: clamp(0.74rem, 0.9vw, 0.84rem);
                    font-variation-settings: var(--fv-caption);
                    opacity: 0.92;
                }

                .app-payment-plan-discount {
                    color: color-mix(in srgb, var(--c4), var(--c2) 45%);
                    font-weight: 700;
                    opacity: 1;
                }

                .app-payment-plan-sub {
                    display: none;
                }

                .app-payment-plan-bullets {
                    list-style: none;
                    margin: clamp(0.75rem, 1.5vw, 1.05rem) 0 0;
                    padding: clamp(0.75rem, 1.5vw, 1.05rem) 0 0;
                    width: 100%;
                    text-align: left;
                    border-top: 1px solid rgba(0, 0, 0, 0.1);
                }

                .app-payment-plan-bullets:empty {
                    border-top: 0;
                    padding-top: 0;
                    margin-top: 0;
                }

                .app-payment-plan-bullets li {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.5rem;
                    margin: 0 0 0.5rem;
                    font-size: clamp(0.76rem, 0.92vw, 0.84rem);
                    font-variation-settings: var(--fv-body-wide);
                    line-height: 1.45;
                    color: var(--c2);
                    opacity: 1;
                }

                .app-payment-plan-bullets li:last-child {
                    margin-bottom: 0;
                }

                .app-whats-included-panel {
                    display: grid;
                    grid-template-columns: auto 1fr;
                    gap: clamp(1rem, 2vw, 1.5rem);
                    align-items: start;
                    margin: 0 0 clamp(1.5rem, 3vw, 2rem);
                    padding: clamp(1.15rem, 2.2vw, 1.6rem);
                    border: 1px solid color-mix(in srgb, var(--c4) 45%, transparent);
                    border-radius: 8px;
                    background: color-mix(in srgb, var(--c4) 12%, transparent);
                }

                .app-whats-included-panel__icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: clamp(3.25rem, 5vw, 4rem);
                    height: clamp(3.25rem, 5vw, 4rem);
                    border-radius: 50%;
                    background: var(--c4);
                    color: var(--c2);
                }

                .app-whats-included-panel__content {
                    min-width: 0;
                }

                .app-whats-included-features {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: clamp(0.65rem, 1.5vw, 1.1rem);
                    margin-top: 0.35rem;
                }

                .app-whats-included-feature {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.45rem;
                    text-align: center;
                }

                .app-whats-included-feature__icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 2.35rem;
                    height: 2.35rem;
                    border-radius: 50%;
                    background: color-mix(in srgb, var(--c4) 28%, transparent);
                }

                .app-fee-icon--feature {
                    width: 1.15rem;
                    height: 1.15rem;
                }

                .app-whats-included-feature__label {
                    font-size: clamp(0.72rem, 0.9vw, 0.84rem);
                    font-variation-settings: var(--fv-body-wide);
                    font-weight: 600;
                    line-height: 1.3;
                    color: var(--c2);
                }

                .app-whats-included-panel__cols {
                    display: none;
                }

                .app-whats-included-panel__divider {
                    width: 1px;
                    align-self: stretch;
                    min-height: 2.5rem;
                    background: rgba(0, 0, 0, 0.12);
                }

                .app-whats-included-panel__title {
                    margin: 0 0 0.65rem;
                    font-size: clamp(1rem, 1.35vw, 1.2rem);
                    font-variation-settings: var(--fv-title);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                }

                .app-whats-included-subhead {
                    margin: 0 0 0.4rem;
                    font-size: clamp(0.78rem, 0.95vw, 0.88rem);
                    font-variation-settings: var(--fv-body-wide);
                    font-weight: 600;
                    letter-spacing: 0.01em;
                    color: var(--c2);
                    opacity: 1;
                }

                .app-whats-included-panel ul {
                    list-style: none;
                    margin: 0;
                    padding: 0;
                }

                .app-whats-included-panel ul li {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.5rem;
                    margin: 0 0 0.4rem;
                    font-size: clamp(0.78rem, 0.92vw, 0.88rem);
                    font-variation-settings: var(--fv-body-wide);
                    line-height: 1.45;
                    color: var(--c2);
                    opacity: 1;
                }

                .app-whats-included-empty {
                    list-style: none;
                    margin-left: 0;
                    padding-left: 0;
                    opacity: 0.82;
                }

                .app-whats-included-pickplan {
                    color: var(--c2);
                    font-weight: 700;
                    opacity: 1;
                }

                .app-fee-footer {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 1.25rem;
                    margin-top: clamp(1.25rem, 2.5vw, 1.65rem);
                    padding-top: 1rem;
                    border-top: 1px solid rgba(0, 0, 0, 0.1);
                }

                .app-fee-footer-right {
                    text-align: center;
                    font-size: clamp(0.72rem, 0.88vw, 0.82rem);
                    font-variation-settings: var(--fv-caption);
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                    color: var(--c2);
                }

                .app-fee-footer-right a {
                    color: inherit;
                    text-decoration: underline;
                    text-underline-offset: 0.14em;
                    margin-left: 0.35rem;
                }

                .app-step-heading {
                    margin: 0 0 0.5rem;
                    font-size: clamp(1rem, 1.35vw, 1.2rem);
                    font-variation-settings: var(--fv-title);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                }

                .app-step-lead {
                    margin: 0 0 1.25rem;
                    font-size: clamp(0.88rem, 1.1vw, 0.98rem);
                    font-variation-settings: var(--fv-body-wide);
                    color: var(--c2);
                    line-height: 1.5;
                    opacity: 0.92;
                }

                .app-field {
                    margin-bottom: 1rem;
                }

                .app-field label {
                    display: block;
                    margin-bottom: 0.25rem;
                    font-size: clamp(0.8rem, 1vw, 0.9rem);
                    font-variation-settings: var(--fv-label);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                }

                /* Implicit label: tap-to-focus works reliably in shadow DOM (discipline + datalist). */
                .app-field-label-wrap {
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    cursor: text;
                    margin: 0;
                }

                .app-field-label-wrap .app-field-label-text {
                    display: block;
                    margin-bottom: 0.25rem;
                    font-size: clamp(0.8rem, 1vw, 0.9rem);
                    font-variation-settings: var(--fv-label);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                }

                .app-field-byline {
                    margin: 0 0 0.5rem;
                    font-size: clamp(0.62rem, 0.72vw, 0.74rem);
                    font-variation-settings: var(--fv-caption);
                    color: var(--c2);
                    line-height: 1.4;
                    letter-spacing: 0.01em;
                    opacity: 0.78;
                }

                .app-field input,
                .app-field select,
                .app-field textarea {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 0.55rem 0.65rem;
                    border: 1px solid rgba(0, 0, 0, 0.2);
                    background: var(--c3);
                    color: var(--c2);
                    font-family: inherit;
                    font-size: clamp(0.88rem, 1.1vw, 1rem);
                    font-variation-settings: var(--fv-body);
                    touch-action: manipulation;
                }

                .app-field textarea {
                    min-height: 120px;
                    resize: vertical;
                }

                .app-field--card-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0.75rem;
                }

                @media (max-width: 480px) {
                    .app-field--card-row {
                        grid-template-columns: 1fr;
                    }
                }

                .app-application-fee-line {
                    display: none;
                }

                .app-whats-included-details {
                    display: none !important;
                }

                .app-payment-placeholder {
                    margin: 0.75rem 0 1rem;
                    padding: clamp(1.5rem, 3vw, 2.1rem) 1.1rem;
                    border: 1px dashed rgba(0, 0, 0, 0.28);
                    border-radius: 6px;
                    text-align: center;
                    color: var(--c2);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.4rem;
                }

                .app-payment-placeholder-head {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.55rem;
                }

                .app-payment-placeholder-title {
                    margin: 0;
                    font-size: clamp(0.86rem, 1.05vw, 0.98rem);
                    font-variation-settings: var(--fv-body-wide);
                    font-weight: 600;
                    color: var(--c2);
                    line-height: 1.4;
                }

                .app-payment-placeholder-sub {
                    margin: 0;
                    font-size: clamp(0.78rem, 0.95vw, 0.88rem);
                    font-variation-settings: var(--fv-caption);
                    color: var(--c2);
                    line-height: 1.45;
                    opacity: 0.72;
                    max-width: 28rem;
                }
                .app-field input.app-field--invalid,
                .app-field select.app-field--invalid,
                .app-field textarea.app-field--invalid {
                    border-color: #8b2942;
                    box-shadow: 0 0 0 2px rgba(139, 41, 66, 0.18);
                    background: rgba(139, 41, 66, 0.04);
                }

                .app-validation-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 2147483000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1.25rem;
                    background: rgba(0, 0, 0, 0.5);
                    animation: app-validation-fade 0.15s ease;
                }

                @keyframes app-validation-fade {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .app-account-gate-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 2147483000;
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    padding: clamp(1rem, 4vw, 2.5rem);
                    background: rgba(15, 23, 42, 0.28);
                    animation: app-validation-fade 0.18s ease;
                }

                .app-account-gate-card {
                    width: min(22.5rem, 100%);
                    box-sizing: border-box;
                    padding: 1.35rem 1.35rem 1.2rem;
                    border: 1px solid rgba(250, 243, 244, 0.22);
                    background: var(--c2, #0f172a);
                    color: var(--c3, #faf3f4);
                    box-shadow: 0 22px 60px rgba(15, 23, 42, 0.35);
                    font-family: inherit;
                }

                .app-account-gate-eyebrow {
                    margin: 0 0 0.55rem;
                    font-size: 0.68rem;
                    letter-spacing: 0.14em;
                    text-transform: uppercase;
                    font-variation-settings: var(--fv-label);
                    opacity: 0.72;
                }

                .app-account-gate-title {
                    margin: 0 0 0.55rem;
                    font-size: clamp(1.05rem, 1.5vw, 1.22rem);
                    line-height: 1.25;
                    font-variation-settings: var(--fv-title);
                }

                .app-account-gate-body,
                .app-account-gate-solution {
                    margin: 0 0 0.65rem;
                    font-size: clamp(0.84rem, 1vw, 0.92rem);
                    line-height: 1.45;
                    font-variation-settings: var(--fv-body);
                    opacity: 0.92;
                }

                .app-account-gate-solution {
                    opacity: 0.78;
                }

                .app-account-gate-contact {
                    margin: 0 0 1.15rem;
                    font-size: 0.8rem;
                    line-height: 1.4;
                    font-variation-settings: var(--fv-label);
                }

                .app-account-gate-mail {
                    color: var(--c3, #faf3f4);
                    text-decoration: underline;
                    text-underline-offset: 0.14em;
                }

                .app-account-gate-mail:hover {
                    opacity: 0.88;
                }

                .app-account-gate-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.55rem;
                    justify-content: flex-end;
                }

                .app-account-gate-card .app-btn--primary {
                    background: var(--c3, #faf3f4);
                    color: var(--c2, #0f172a);
                    border-color: var(--c3, #faf3f4);
                }

                .app-account-gate-card .app-btn--primary:hover {
                    background: transparent;
                    color: var(--c3, #faf3f4);
                }

                .app-account-gate-card .app-btn--ghost {
                    color: var(--c3, #faf3f4);
                    border-color: rgba(250, 243, 244, 0.45);
                }

                .app-account-gate-card .app-btn--ghost:hover {
                    background: rgba(250, 243, 244, 0.08);
                }

                @media (max-width: 720px) {
                    .app-account-gate-overlay {
                        justify-content: center;
                        align-items: flex-end;
                        padding: 0.85rem;
                    }
                }

                .app-validation-modal {
                    width: min(420px, 100%);
                    box-sizing: border-box;
                    background: var(--c3);
                    color: var(--c2);
                    border: 1px solid rgba(0, 0, 0, 0.15);
                    padding: 1.5rem 1.4rem 1.25rem;
                    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
                }

                .app-validation-title {
                    margin: 0 0 0.5rem;
                    font-size: clamp(1.02rem, 1.4vw, 1.18rem);
                    font-variation-settings: var(--fv-body-wide);
                    letter-spacing: 0.01em;
                }

                .app-validation-text {
                    margin: 0 0 0.65rem;
                    font-size: clamp(0.86rem, 1vw, 0.95rem);
                    font-variation-settings: var(--fv-body);
                    line-height: 1.5;
                    opacity: 0.9;
                }

                .app-validation-list {
                    margin: 0 0 1.1rem;
                    padding-left: 1.2rem;
                    font-size: clamp(0.86rem, 1vw, 0.95rem);
                    font-variation-settings: var(--fv-body-wide);
                    line-height: 1.6;
                }

                .app-validation-list li {
                    font-weight: 600;
                }

                .app-validation-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.6rem;
                }

                .app-payment-placeholder[hidden] {
                    display: none !important;
                }

                .app-form-actions {
                    display: flex;
                    justify-content: center;
                    gap: 0.75rem;
                    margin-top: 1.25rem;
                    flex-wrap: wrap;
                }

                .app-btn {
                    min-width: 120px;
                    padding: 0.55rem 1.25rem;
                    border: 1px solid var(--c2);
                    cursor: pointer;
                    font-family: inherit;
                    font-size: clamp(0.9rem, 1.05vw, 1rem);
                    font-variation-settings: var(--fv-cta);
                    letter-spacing: 0.03em;
                    transition: background 0.2s ease, color 0.2s ease;
                }

                .app-btn--primary {
                    background: var(--c5);
                    color: var(--c2);
                }

                .app-btn--primary:hover {
                    background: var(--c2);
                    color: var(--c3);
                }

                .app-btn--ghost {
                    background: transparent;
                    color: var(--c2);
                }

                .app-btn--ghost:hover {
                    background: rgba(0, 0, 0, 0.05);
                }

                @keyframes app-submit-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.45; }
                }

                #app-application-form-fields.is-submitting {
                    opacity: 0.8;
                    pointer-events: none;
                }

                .app-btn.is-loading {
                    animation: app-submit-pulse 0.85s ease-in-out infinite;
                }

                .app-form-status {
                    margin-top: 1rem;
                    font-size: clamp(0.85rem, 1vw, 0.95rem);
                    font-variation-settings: var(--fv-body-wide);
                    color: var(--c2);
                    min-height: 1.25em;
                }

                .app-form-status.is-error {
                    color: #8b2942;
                }

                .app-form-status.is-success {
                    opacity: 0.9;
                }

                .app-submit-success {
                    max-width: 760px;
                    margin: 0.5rem auto 0;
                    border: 1px solid var(--c2);
                    background: var(--c3);
                    padding: clamp(1rem, 2vw, 1.35rem);
                    text-align: center;
                }

                .app-submit-success h3 {
                    margin: 0;
                    color: var(--c2);
                    font-size: clamp(1rem, 1.2vw, 1.15rem);
                    font-variation-settings: var(--fv-title);
                }

                .app-submit-success p {
                    margin: 0.45rem 0 0;
                    color: var(--c2);
                    font-size: clamp(0.86rem, 1vw, 0.95rem);
                    line-height: 1.4;
                }

                .app-payment-hint-wrap {
                    display: flex;
                    align-items: center;
                    gap: 0.65rem;
                    margin: 0.5rem 0;
                    min-height: 1.5em;
                    border-radius: 4px;
                    transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
                }

                .app-payment-hint-wrap.is-busy {
                    margin: 0.85rem 0 1.1rem;
                    padding: 0.95rem 1.1rem;
                    border: 1px solid var(--c2);
                    background: linear-gradient(180deg, rgba(0, 0, 0, 0.045) 0%, rgba(0, 0, 0, 0.02) 100%);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.07);
                    gap: 0.85rem;
                    min-height: 3.1rem;
                    align-items: center;
                }

                #app-payment-loading {
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                #app-payment-loading[hidden] {
                    display: none !important;
                }

                .app-payment-spinner {
                    display: block;
                    width: 26px;
                    height: 26px;
                    box-sizing: border-box;
                    border: 2px solid rgba(0, 0, 0, 0.14);
                    border-top-color: var(--c4, var(--c2));
                    border-right-color: rgba(0, 0, 0, 0.1);
                    border-radius: 50%;
                    animation: app-payment-spin 0.72s linear infinite;
                }

                @keyframes app-payment-spin {
                    to {
                        transform: rotate(360deg);
                    }
                }

                #app-payment-hint {
                    margin: 0;
                    flex: 1;
                    font-size: clamp(0.82rem, 1vw, 0.92rem);
                    font-variation-settings: var(--fv-caption);
                    color: var(--c2);
                    min-height: 1.5em;
                    line-height: 1.45;
                }

                #app-payment-hint.is-busy {
                    font-size: clamp(0.92rem, 1.15vw, 1.05rem);
                    font-variation-settings: var(--fv-body-wide);
                    font-weight: 600;
                    letter-spacing: 0.02em;
                    opacity: 1;
                }

                .app-payment-slot-wrap {
                    margin: 0.25rem 0 0.75rem;
                    min-height: 100px;
                    width: 100%;
                }

                ::slotted(.app-application-stripe-mount) {
                    display: block;
                    width: 100%;
                    min-height: 100px;
                }

                ::slotted(.app-application-stripe-mount) .paypal-advanced-checkout {
                    width: 100%;
                }

                .app-payment-support {
                    margin: 1rem 0 0;
                    font-size: clamp(0.82rem, 1vw, 0.92rem);
                    font-variation-settings: var(--fv-body-wide);
                    text-align: center;
                    color: var(--c2);
                    line-height: 1.45;
                    opacity: 0.9;
                }

                .app-payment-mail {
                    color: inherit;
                    text-underline-offset: 0.12em;
                }

                #app-payment-section[hidden] {
                    display: none !important;
                }

                #app-submit-updates-wrap[hidden] {
                    display: none !important;
                }
            </style>
            <div class="application-form-root">
                <h2 class="app-form-title">${L.title}</h2>
                <div id="app-form-main">
                    <p id="app-cohort-slots-top" class="app-cohort-slots" hidden></p>
                    <div id="app-selection-intro" class="app-selection-intro"></div>
                    <div class="app-view-details-row">
                        <button type="button" class="app-btn app-btn--ghost" id="app-view-program-details">${L.viewProgramDetails}</button>
                    </div>
                    <form id="app-application-form-fields" novalidate>
                        <div class="app-form-card">
                            <h3 class="app-step-heading">${L.contactSectionTitle}</h3>
                            <p class="app-step-lead">${L.lead1}</p>
                            <div class="app-field app-field--card-row">
                                <div>
                                    <label for="app-first-name">${L.firstName} <span aria-hidden="true">*</span></label>
                                    <input id="app-first-name" name="firstName" type="text" autocomplete="given-name" />
                                </div>
                                <div>
                                    <label for="app-last-name">${L.lastName} <span aria-hidden="true">*</span></label>
                                    <input id="app-last-name" name="lastName" type="text" autocomplete="family-name" />
                                </div>
                            </div>
                            <div class="app-field">
                                <label for="app-email">${L.email} <span aria-hidden="true">*</span></label>
                                <input id="app-email" name="email" type="text" inputmode="email" autocomplete="email" />
                            </div>
                            <div class="app-field">
                                <label for="app-country">${L.country} <span aria-hidden="true">*</span></label>
                                <input id="app-country" name="country" type="text" autocomplete="country-name" />
                            </div>
                            <div class="app-field">
                                <label for="app-state">${L.stateProvince}</label>
                                <input id="app-state" name="stateProvince" type="text" autocomplete="address-level1" />
                            </div>
                            <div class="app-field">
                                <label for="app-city">${L.city} <span aria-hidden="true">*</span></label>
                                <input id="app-city" name="city" type="text" autocomplete="address-level2" />
                            </div>
                        </div>

                        <div class="app-form-card app-form-card--spaced">
                            <h3 class="app-step-heading">${L.portfolioSectionTitle}</h3>
                            <p class="app-step-lead" id="app-portfolio-lead">${L.lead2}</p>
                            <div class="app-field">
                                <label for="app-website">${L.website}</label>
                                <p class="app-field-byline" id="app-website-byline">${L.websiteByline}</p>
                                <input id="app-website" name="website" type="text" inputmode="url" autocomplete="url" placeholder="https://" aria-describedby="app-website-byline" />
                            </div>
                            <div class="app-field app-field--discipline">
                                <label class="app-field-label-wrap">
                                    <span class="app-field-label-text">${L.discipline}</span>
                                    <span class="app-field-byline" id="app-discipline-byline">${L.disciplineByline}</span>
                                    <input id="app-discipline" name="discipline" type="text" autocomplete="off" list="app-discipline-datalist" aria-describedby="app-discipline-byline" />
                                </label>
                                <datalist id="app-discipline-datalist">${disciplineDatalistHtml}</datalist>
                            </div>
                            <div class="app-field">
                                <label for="app-bio">${L.bioStatement}</label>
                                <p class="app-field-byline" id="app-bio-byline">${L.bioStatementByline}</p>
                                <textarea id="app-bio" name="bioStatement" rows="5" aria-describedby="app-bio-byline"></textarea>
                            </div>
                            <div class="app-field">
                                <label for="app-exploration">${L.exploration}</label>
                                <p class="app-field-byline" id="app-exploration-byline">${L.explorationByline}</p>
                                <textarea id="app-exploration" name="exploration" rows="4" aria-describedby="app-exploration-byline"></textarea>
                            </div>
                            <div class="app-field">
                                <label for="app-goals">${L.residencyGoals}</label>
                                <p class="app-field-byline" id="app-goals-byline">${L.residencyGoalsByline}</p>
                                <textarea id="app-goals" name="residencyGoals" rows="4" aria-describedby="app-goals-byline"></textarea>
                            </div>
                        </div>

                        <div id="app-submit-updates-wrap" class="app-form-card app-form-card--spaced" hidden>
                            <div class="app-form-actions">
                                <button type="button" class="app-btn app-btn--primary" id="app-submit-updates">${L.saveApplicationUpdates}</button>
                            </div>
                        </div>

                        <div id="app-membership-fee-waived-banner" class="app-selection-intro" hidden>
                            <p>${L.memberFeeWaivedBanner}</p>
                            <p id="app-member-credit-note" class="app-member-credit-note" hidden></p>
                        </div>
                        <div id="app-submit-free-wrap" class="app-form-card app-form-card--spaced" hidden>
                            <div id="app-credit-callout" class="app-credit-callout" hidden role="status">
                                <p class="app-credit-callout__eyebrow">${escHtml(L.creditCalloutEyebrow || 'Application credit')}</p>
                                <p class="app-credit-callout__title">${escHtml(L.creditCalloutTitle || "You're using 1 application credit")}</p>
                                <p class="app-credit-callout__body" id="app-credit-callout-body"></p>
                            </div>
                            <div class="app-form-actions">
                                <button type="button" class="app-btn app-btn--primary" id="app-submit-free">${L.submitApplicationOnly}</button>
                            </div>
                        </div>

                        <div id="app-payment-section" class="app-form-card app-form-card--payment">
                            <div class="app-fee-choose">
                                <h4 class="app-fee-choose-title">${escHtml(L.choosePaymentHeading || L.applicationFeeHeading)}</h4>
                            </div>

                            <div class="app-fee-meta-row">
                                <div id="app-cohort-slots-payment" class="app-fee-meta-slots" hidden></div>
                            </div>

                            <p id="app-member-fee-only-banner" class="app-member-fee-only-banner" hidden></p>

                            <div class="app-fee-product-card" id="app-fee-product-card">
                                <div class="app-fee-product-card__main">
                                    <span class="app-fee-product-card__icon">${appFeeIconHtml(I.paymentCard, 'app-fee-icon app-fee-icon--plan')}</span>
                                    <div class="app-fee-product-card__copy">
                                        <p class="app-fee-product-card__title" id="app-fee-product-title">${escHtml(L.productCardTitle || 'Residency application')}</p>
                                        <p class="app-fee-product-card__price" id="app-fee-product-price">$50</p>
                                        <span class="app-fee-product-card__badge" id="app-fee-product-badge">${escHtml(L.productCardBadge || 'One-time payment')}</span>
                                    </div>
                                </div>
                                <ul class="app-fee-product-card__list" id="app-fee-product-bullets">${productBulletsHtml}</ul>
                            </div>

                            <div id="app-payment-cta-stack" class="app-payment-cta-stack" role="radiogroup" aria-label="${escAttr(L.paymentPlanGroupLabel)}">
                                <div class="app-payment-cta-row">
                                    <button type="button" class="app-payment-cta app-payment-cta--primary" role="radio" aria-checked="false" data-app-payment-plan="one_time" id="app-plan-one-time">
                                        <span class="app-payment-cta-title" id="app-plan-one-time-title">${escHtml(L.planOneTimeTitle.replace('{{price}}', '$50'))}</span>
                                        <span class="app-payment-cta-sub" id="app-plan-one-time-sub">${escHtml(L.planOneTimeSub)}</span>
                                        <span class="app-payment-cta-sub2" id="app-plan-one-time-sub2" hidden></span>
                                        <span class="app-payment-cta-price" id="app-plan-one-time-price" hidden></span>
                                    </button>
                                    <button type="button" class="app-payment-cta app-payment-cta--secondary" id="app-explore-memberships-toggle" aria-expanded="false">
                                        ${escHtml(L.exploreMembershipsExpand)}
                                    </button>
                                </div>
                                <div id="app-membership-plans-panel" class="app-membership-plans-panel" hidden>
                                    <button type="button" class="app-payment-membership-card" role="radio" aria-checked="false" data-app-payment-plan="monthly" id="app-plan-monthly">
                                        <span class="app-payment-plan-radio" aria-hidden="true"></span>
                                        <span class="app-payment-plan-icon-wrap">${appFeeIconHtml(I.paymentCard, 'app-fee-icon app-fee-icon--plan')}</span>
                                        <span class="app-payment-membership-card-body">
                                            <span class="app-payment-membership-head">
                                                <span class="app-payment-membership-title" id="app-plan-monthly-title">${escHtml(L.planMonthlyTitle)}</span>
                                                <span class="app-payment-membership-price" id="app-plan-monthly-price">${escHtml(L.planMonthlyPriceLine)}</span>
                                                <span class="app-payment-membership-every" id="app-plan-monthly-every">${escHtml(L.planMonthlyEvery)}</span>
                                                <span class="app-payment-membership-sub2" id="app-plan-monthly-sub2" hidden></span>
                                            </span>
                                            <ul class="app-payment-plan-bullets" id="app-plan-monthly-bullets"></ul>
                                        </span>
                                    </button>
                                    <div class="app-payment-plan-wrap app-payment-plan-wrap--suggested">
                                        <span class="app-payment-plan-suggested-badge" id="app-plan-quarterly-badge">${escHtml(L.suggestedBadge || 'Recommended')}</span>
                                        <button type="button" class="app-payment-membership-card" role="radio" aria-checked="false" data-app-payment-plan="quarterly" id="app-plan-quarterly">
                                            <span class="app-payment-plan-radio" aria-hidden="true"></span>
                                            <span class="app-payment-plan-icon-wrap">${appFeeIconHtml(I.popularCrown, 'app-fee-icon app-fee-icon--plan')}</span>
                                            <span class="app-payment-membership-card-body">
                                                <span class="app-payment-membership-head">
                                                    <span class="app-payment-membership-title" id="app-plan-quarterly-title">${escHtml(L.planQuarterlyTitle)}</span>
                                                    <span class="app-payment-membership-price" id="app-plan-quarterly-price">${escHtml(L.planQuarterlyPriceLine)}</span>
                                                    <span class="app-payment-membership-every" id="app-plan-quarterly-every">${escHtml(L.planQuarterlyEvery)}</span>
                                                    <span class="app-payment-membership-sub2" id="app-plan-quarterly-sub2" hidden></span>
                                                </span>
                                                <ul class="app-payment-plan-bullets" id="app-plan-quarterly-bullets"></ul>
                                            </span>
                                        </button>
                                    </div>
                                    <button type="button" class="app-payment-membership-card" role="radio" aria-checked="false" data-app-payment-plan="annual" id="app-plan-annual">
                                        <span class="app-payment-plan-radio" aria-hidden="true"></span>
                                        <span class="app-payment-plan-icon-wrap">${appFeeIconHtml(I.annualDiamond, 'app-fee-icon app-fee-icon--plan')}</span>
                                        <span class="app-payment-membership-card-body">
                                            <span class="app-payment-membership-head">
                                                <span class="app-payment-membership-title" id="app-plan-annual-title">${escHtml(L.planAnnualTitle)}</span>
                                                <span class="app-payment-membership-price" id="app-plan-annual-price">${escHtml(L.planAnnualPriceLine)}</span>
                                                <span class="app-payment-membership-every" id="app-plan-annual-every">${escHtml(L.planAnnualEvery)}</span>
                                                <span class="app-payment-membership-sub2" id="app-plan-annual-sub2" hidden></span>
                                            </span>
                                            <ul class="app-payment-plan-bullets" id="app-plan-annual-bullets"></ul>
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <div id="app-payment-placeholder" class="app-payment-placeholder" hidden>
                                <div class="app-payment-placeholder-head">
                                    ${appFeeIconHtml(I.secureLock, 'app-fee-icon app-fee-icon--sm')}
                                    <p class="app-payment-placeholder-title">${escHtml(L.paymentPlaceholderTitle || L.paymentPlaceholderNoSelection)}</p>
                                </div>
                                <p class="app-payment-placeholder-sub">${escHtml(L.paymentPlaceholderSub || '')}</p>
                            </div>
                            <div class="app-payment-slot-wrap" hidden>
                                <slot name="app-stripe-mount"></slot>
                            </div>
                            <div id="app-payment-hint-wrap" class="app-payment-hint-wrap" aria-busy="false" hidden>
                                <div id="app-payment-loading" class="app-payment-loading" hidden aria-hidden="true">
                                    <span class="app-payment-spinner" role="presentation"></span>
                                </div>
                                <p id="app-payment-hint" aria-live="polite"></p>
                            </div>
                            <div class="app-form-actions">
                                <button type="button" class="app-btn app-btn--primary" id="app-pay-submit" disabled hidden>${escHtml(L.payAndSubmitApplication)}</button>
                            </div>

                            <footer class="app-fee-footer">
                                <div class="app-fee-footer-right">
                                    <span>${escHtml(L.footerQuestionsPrefix || L.paymentSupportPrefix)}</span>
                                    <a href="mailto:info@fusionart.world">${escHtml(L.footerContactUs || 'info@fusionart.world')}</a>
                                </div>
                            </footer>
                        </div>
                    </form>
                </div>

                <p id="app-form-status" class="app-form-status" role="status" aria-live="polite"></p>

                <div id="app-submit-success" class="app-submit-success" hidden>
                    <h3 id="app-submit-success-title"></h3>
                    <p id="app-submit-success-body"></p>
                </div>
            </div>
        `;
    }

}

customElements.define('app-application-form', ApplicationFormComponent);

export { ApplicationFormComponent };
