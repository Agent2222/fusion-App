/**
 * Join FUSION — band + multi-stage modal (`data-modal-type`: membership | access | apply).
 * Copy: `testData.joinNetworkFlow`; legacy `context` maps to modal type. See plan: join network modal flow.
 *
 * Vertical spacing (host margins), any CSS length (e.g. `48px`, `3rem`):
 * - `data-margin-top`, `data-margin-bottom` (preferred)
 * - Legacy: `topp` / `topP`, `bottomp` / `bottomP` (same values, fallback if data-* omitted)
 */
import { DEV_MODE, getHost } from '../../config.js';
import { getContentBundleForStudio, subscribeDataSource } from '../../utils/database.js';
import { navigate } from '../../router.js';
import {
    normalizeEarlyAccessCategory,
    prefetchFusionBackendActor,
    submitEarlyAccessToCanister,
} from '../../utils/earlyAccessSubscribe.js';
import { createSubscription, getIntegrationBaseUrl, sendEmail } from '../../utils/integrationApi.js';
import { getStripePublishableKeyResolved } from '../../utils/studioServicesConfig.js';

/**
 * Set by `fusion-open-join-network` with `detail.logoutIfDismissedWithoutAccount` (post–II login with no account).
 * Consumed on next `_openModal` so header “Register” does not trigger logout on dismiss.
 */
let _pendingLogoutIfDismissedWithoutAccount = false;

/**
 * @param {string | undefined} raw
 * @returns {number} amount in cents
 */
function parseMoneyToCents(raw) {
    const t = String(raw || '').replace(/[^\d.]/g, '');
    const n = parseFloat(t);
    if (!Number.isFinite(n) || n <= 0) return 5000;
    return Math.round(n * 100);
}

/** @typedef {'membership'|'access'|'apply'} ModalType */
/** @typedef {'entry'|'value'|'payment'|'confirmation'} FlowStage */

const CONTEXT_TO_MODAL = /** @type {Record<string, ModalType>} */ ({
    home: 'membership',
    artists: 'access',
    profile: 'access',
    editions: 'access',
    'gallery-access': 'access',
    journal: 'membership',
    community: 'membership',
    context: 'membership',
    programs: 'apply',
});

const STAGES = /** @type {FlowStage[]} */ (['entry', 'value', 'payment', 'confirmation']);

/**
 * @param {Record<string, unknown> | null} flow
 * @param {ModalType} modalType
 * @param {FlowStage} stage
 * @param {'en'|'ja'} loc
 */
function getFlowSlice(flow, modalType, stage, loc) {
    if (!flow || typeof flow !== 'object') return null;
    const f = /** @type {Record<string, unknown>} */ (flow)[modalType];
    if (!f || typeof f !== 'object') return null;
    const block = /** @type {Record<string, unknown>} */ (f)[stage];
    if (!block || typeof block !== 'object') return null;
    return /** @type {Record<string, unknown>} */ (block)[loc] || block.en || null;
}

/**
 * @param {HTMLElement} host
 * @returns {ModalType}
 */
function resolveModalType(host) {
    const raw =
        host.getAttribute('modal-type') ||
        host.getAttribute('data-modal-type') ||
        host.getAttribute('Modal-Type') ||
        '';
    const t = String(raw).trim().toLowerCase();
    if (t === 'membership' || t === 'access' || t === 'apply') return t;
    const ctx = (host.getAttribute('context') || 'home').trim();
    return CONTEXT_TO_MODAL[ctx] || 'membership';
}

class JoinNetworkComponent extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        this._onLocaleChange = () => {
            this._fillBandCopy();
            this._fillDialogCopy();
        };
        /** @type {(e: Event) => void} */
        this._onFusionAuthChange = () => {
            void this._syncBandOpenButtonAuth();
        };
        this._joinNetworkSubmitting = false;
        /** Opened after sign-in with no account — close without completing join logs out of II. */
        this._logoutIfDismissedWithoutJoin = false;
        /** Set when signup reaches confirmation (saved to canister). */
        this._joinFlowCompleted = false;
        /** `full` join vs `resubscribe` (payment + confirm only). */
        this._joinMode = 'full';
        /** When true, `afterJoinSaved` skips early-access + register (already done before Stripe). */
        this._preStripeCanisterSyncDone = false;
        /** @type {FlowStage} */
        this._stage = 'entry';
        /** @type {ModalType} */
        this._modalType = 'membership';
        this._formFullName = '';
        this._formEmail = '';
        /** @type {string} */
        this._lastFocused = null;
        /** @type {import('@stripe/stripe-js').Stripe | null} */
        this._stripe = null;
        /** @type {import('@stripe/stripe-js').StripeElements | null} */
        this._stripeElements = null;
        /** @type {import('@stripe/stripe-js').StripeElement | null} */
        this._stripePaymentElement = null;
        /** Set only after Payment Element fires `ready` — required before `confirmPayment`. */
        this._stripePaymentReady = false;
        /** Bumps when leaving payment or starting a new prepare; invalidates in-flight async work. */
        this._stripePrepareGen = 0;
        /** PaymentIntent amount (cents) from CMS copy — display/order card only. */
        this._paymentAmountCents = 5000;
        /** Fingerprint for reusing the same Stripe Elements session (subscription). */
        this._stripePrepareKey = '';
        /** @type {Record<string, unknown> | null} */
        this._joinNetworkFlow = null;
        /** @type {Record<string, unknown> | null} */
        this._joinNetworkBlock = null;
        /** @type {(() => void) | null} */
        this._unsubData = null;
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
        return [
            'active',
            'context',
            'data-margin-top',
            'data-margin-bottom',
            'topp',
            'topP',
            'bottomp',
            'bottomP',
            'modal-type',
            'data-modal-type',
            'stage',
            'data-header-bridge',
        ];
    }

    _getTopMarginValue() {
        return (
            this.getAttribute('data-margin-top') ||
            this.getAttribute('topp') ||
            this.getAttribute('topP') ||
            ''
        ).trim();
    }

    _getBottomMarginValue() {
        return (
            this.getAttribute('data-margin-bottom') ||
            this.getAttribute('bottomp') ||
            this.getAttribute('bottomP') ||
            ''
        ).trim();
    }

    /** Apply vertical margin on the host (`<app-join-network>`) for spacing within the page. */
    _applyHostMargins() {
        const top = this._getTopMarginValue();
        const bottom = this._getBottomMarginValue();
        this.style.marginTop = top || '';
        this.style.marginBottom = bottom || '';
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if (
            prop === 'data-margin-top' ||
            prop === 'data-margin-bottom' ||
            prop === 'topp' ||
            prop === 'topP' ||
            prop === 'bottomp' ||
            prop === 'bottomP'
        ) {
            if (oldVal === newVal) return;
            this._applyHostMargins();
            return;
        }
        if (
            prop === 'active' ||
            prop === 'context' ||
            prop === 'modal-type' ||
            prop === 'data-modal-type'
        ) {
            if (oldVal === newVal) return;
            this._modalType = resolveModalType(this);
            this._fillBandCopy();
            this._fillDialogCopy();
        }
    }

    connectedCallback() {
        window.addEventListener('fusion-localechange', this._onLocaleChange);
        window.addEventListener('fusion-auth-change', this._onFusionAuthChange);
        this._modalType = resolveModalType(this);
        const dbg = (this.getAttribute('stage') || '').trim().toLowerCase();
        if (STAGES.includes(/** @type {FlowStage} */ (dbg))) {
            this._stage = /** @type {FlowStage} */ (dbg);
        }
        this.render();
        if (this._unsubData) this._unsubData();
        this._unsubData = subscribeDataSource(() => void this._reloadJoinCopy());
        void this._reloadJoinCopy();
    }

    disconnectedCallback() {
        window.removeEventListener('fusion-localechange', this._onLocaleChange);
        window.removeEventListener('fusion-auth-change', this._onFusionAuthChange);
        if (this._unsubData) {
            this._unsubData();
            this._unsubData = null;
        }
        this._teardownStripePayment();
        this.querySelector('[data-jn-stripe-mount]')?.remove();
        const dlg = this.shadowRoot?.querySelector('.jn-dialog');
        if (dlg && typeof dlg.close === 'function' && dlg.open) dlg.close();
    }

    /**
     * Stripe.js Elements must mount in the **light DOM** — iframes cannot communicate across a
     * ShadowRoot boundary (see Stripe / stripe-js issues). The slot projects this node into the dialog.
     * @returns {HTMLDivElement}
     */
    _getStripeMountLightEl() {
        let el = this.querySelector('[data-jn-stripe-mount]');
        if (!el) {
            el = document.createElement('div');
            el.setAttribute('data-jn-stripe-mount', '');
            el.setAttribute('slot', 'jn-stripe-mount');
            el.className = 'jn-stripe-mount';
            this.appendChild(el);
        }
        return /** @type {HTMLDivElement} */ (el);
    }

    _getLocale() {
        return typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
    }

    async _reloadJoinCopy() {
        const [flow, block] = await Promise.all([
            getContentBundleForStudio('join-network-flow'),
            getContentBundleForStudio('join-network'),
        ]);
        this._joinNetworkFlow = flow && typeof flow === 'object' ? /** @type {Record<string, unknown>} */ (flow) : null;
        this._joinNetworkBlock = block && typeof block === 'object' ? /** @type {Record<string, unknown>} */ (block) : null;
        this._fillBandCopy();
        this._fillDialogCopy();
        void this._syncBandOpenButtonAuth();
    }

    _getBandFallbackCopy() {
        const key = this.getAttribute('context') || 'home';
        const block = this._joinNetworkBlock;
        const slice = block && block[key] ? block[key] : block?.home;
        const loc = this._getLocale();
        const row = slice ? slice[loc] || slice.en : null;
        return {
            title: row?.title || '',
            description: row?.description || '',
        };
    }

    /**
     * Page gate: band title = `comingSoonMessage`, description = `comingSoonCopy` from `config.pageStatus` (may include HTML).
     */
    _applyGateBandFromHostAttrs() {
        const titleEnc = this.getAttribute('data-gate-title-enc');
        const descEnc = this.getAttribute('data-gate-desc-enc');
        const titleEl = this.shadowRoot?.querySelector('#bandTitle');
        const descEl = this.shadowRoot?.querySelector('#bandDescription');
        const openBtn = this.shadowRoot?.querySelector('#bandOpenBtn');
        try {
            if (titleEl && titleEnc != null && titleEnc !== '') {
                titleEl.textContent = decodeURIComponent(titleEnc);
            }
            if (descEl && descEnc != null && descEnc !== '') {
                descEl.innerHTML = decodeURIComponent(descEnc);
            }
        } catch {
            if (titleEl && titleEnc != null) titleEl.textContent = titleEnc;
            if (descEl && descEnc != null) descEl.textContent = descEnc;
        }
        if (openBtn) openBtn.textContent = 'Join FUSION';
    }

    /** @returns {boolean} */
    _isGateBand() {
        return this.hasAttribute('data-gate-band');
    }

    async _syncBandOpenButtonAuth() {
        if (!this.hasAttribute('data-hide-band-open-when-authenticated')) return;
        const openBtn = this.shadowRoot?.querySelector('#bandOpenBtn');
        if (!openBtn) return;
        try {
            const { getAuthSnapshot } = await import('../../utils/icAuth.js');
            const { authenticated } = await getAuthSnapshot();
            openBtn.hidden = authenticated;
            openBtn.style.display = authenticated ? 'none' : '';
        } catch {
            openBtn.hidden = false;
            openBtn.style.display = '';
        }
    }

    _fillBandCopy() {
        this._modalType = resolveModalType(this);
        const titleEl = this.shadowRoot?.querySelector('#bandTitle');
        const descEl = this.shadowRoot?.querySelector('#bandDescription');
        const openBtn = this.shadowRoot?.querySelector('#bandOpenBtn');

        if (this._isGateBand()) {
            this._applyGateBandFromHostAttrs();
            void this._syncBandOpenButtonAuth();
            return;
        }

        const loc = this._getLocale();
        const flowRoot = this._joinNetworkFlow?.[this._modalType];
        const band = flowRoot && typeof flowRoot === 'object' ? /** @type {Record<string, unknown>} */ (flowRoot).band : null;
        const flowBand =
            band && typeof band === 'object'
                ? /** @type {Record<string, unknown>} */ (band)[loc] || band.en
                : null;
        if (flowBand) {
            if (titleEl) titleEl.textContent = flowBand.title || '';
            if (descEl) descEl.textContent = flowBand.description || '';
            if (openBtn) openBtn.textContent = flowBand.openLabel || 'Open';
        } else {
            const fb = this._getBandFallbackCopy();
            if (titleEl) titleEl.textContent = fb.title;
            if (descEl) descEl.textContent = fb.description;
            if (openBtn) openBtn.textContent = 'Join FUSION';
        }
    }

    _fillDialogCopy() {
        this._modalType = resolveModalType(this);
        const loc = this._getLocale();
        const mt = this._modalType;

        const flow = this._joinNetworkFlow;
        const entry = getFlowSlice(flow, mt, 'entry', loc);
        const value = getFlowSlice(flow, mt, 'value', loc);
        const payment = getFlowSlice(flow, mt, 'payment', loc);
        const conf = getFlowSlice(flow, mt, 'confirmation', loc);

        const set = (sel, text) => {
            const n = this.shadowRoot?.querySelector(sel);
            if (n) n.textContent = text ?? '';
        };

        if (entry) {
            set('#jnEntryTitle', entry.dialogTitle);
            set('#jnEntrySubtitle', entry.subtitle);
            set('#jnRenewHint', entry.renewHint);
            set('#jnEntryFooter', entry.footerDisclaimer);
            const inpName = this.shadowRoot?.querySelector('#jnFullName');
            const inpEmail = this.shadowRoot?.querySelector('#jnEmail');
            if (inpName) inpName.placeholder = entry.namePlaceholder || '';
            if (inpEmail) inpEmail.placeholder = entry.emailPlaceholder || '';
            set('#jnRoleLabel', entry.roleLabel);
            const ec = this.shadowRoot?.querySelector('#jnEntryContinue');
            if (ec) ec.textContent = entry.continueLabel || 'Continue';
        }

        if (value) {
            set('#jnValueTitle', value.title);
            set('#jnValueLead', value.lead);
            set('#jnPriceAmount', value.price);
            set('#jnPeriodLabel', value.periodLabel);
            set('#jnIncludesTitle', value.includesTitle);
            set('#jnRenewLine', value.renewLine);
            set('#jnValueDisclaimer', value.disclaimer);
            const vc = this.shadowRoot?.querySelector('#jnValueContinue');
            if (vc) vc.textContent = value.continueLabel || 'Continue';
            const ul = this.shadowRoot?.querySelector('#jnIncludesList');
            if (ul && Array.isArray(value.includes)) {
                ul.innerHTML = value.includes
                    .map((line) => `<li>${String(line)}</li>`)
                    .join('');
            }
        }

        if (payment) {
            this._paymentAmountCents = parseMoneyToCents(payment.amount);
            set('#jnPayTitle', payment.title);
            set('#jnPaySubtitle', payment.subtitle);
            set('#jnOrderBrand', payment.orderLabel);
            set('#jnLine3m', payment.line3Months);
            set('#jnLineRenew', payment.lineRenew);
            set('#jnOrderTotal', payment.amount);
            set('#jnTotalLabel', payment.totalLabel);
            set('#jnPayComplete', payment.completeLabel);
            set('#jnPayFooter', payment.footerNote);
            const devSkip = this.shadowRoot?.querySelector('#jnPayDevSkip');
            if (devSkip && payment.devCompleteLabel) {
                devSkip.textContent = payment.devCompleteLabel;
            }
        }

        if (conf) {
            set('#jnConfTitle', conf.title);
            set('#jnWelcomeTitle', conf.welcomeTitle);
            set('#jnWelcomeBody', conf.welcomeBody);
            const pc = this.shadowRoot?.querySelector('#jnPrimaryCta');
            if (pc) pc.textContent = conf.primaryCta || '';
            set('#jnSecondaryLine', conf.secondaryLine);
            const wrap = this.shadowRoot?.querySelector('#jnConfLinks');
            if (wrap && Array.isArray(conf.links)) {
                wrap.innerHTML = conf.links
                    .map(
                        (l) =>
                            `<a href="${l.href}" class="jn-link" data-href="${l.href}">${l.label}</a>`
                    )
                    .join('');
            }
        }

        this._showStage(this._stage);
    }

    /**
     * @param {FlowStage} stage
     */
    _showStage(stage) {
        const prev = this._stage;
        this._stage = stage;
        const root = this.shadowRoot;
        if (!root) return;
        if (prev === 'payment' && stage !== 'payment') {
            this._stripePrepareGen += 1;
            this._teardownStripePayment();
        }
        STAGES.forEach((s) => {
            const panel = root.querySelector(`[data-jn-panel="${s}"]`);
            if (panel) panel.hidden = s !== stage;
        });
        if (stage === 'payment') {
            const payEmailWrap = root.querySelector('#jnPayEmailWrap');
            if (payEmailWrap) {
                payEmailWrap.hidden = this._joinMode !== 'resubscribe';
            }
            const payBack = root.querySelector('#jnPayBack');
            if (payBack) {
                payBack.hidden = this._joinMode === 'resubscribe';
            }
            // `_fillDialogCopy` ends with `_showStage(this._stage)` (e.g. on locale change). Re-running
            // prepare would tear down and create a second Subscription clientSecret — only init when needed.
            const stillOnPayment = prev === 'payment';
            const nextKey = this._computeStripePrepareKeySync();
            const canReuseStripe =
                stillOnPayment && this._stripePaymentReady && this._stripePrepareKey === nextKey;
            if (!canReuseStripe) {
                void this._prepareStripePayment();
            }
        }
    }

    _computeStripePrepareKeySync() {
        const email = this._getEmailForSubscription();
        return `${this._joinMode}|${this._modalType}|${email}`;
    }

    /** Email for Stripe customer + metadata (entry field or resubscribe-only `#jnPayEmail`). */
    _getEmailForSubscription() {
        const root = this.shadowRoot;
        return (
            root?.querySelector('#jnPayEmail')?.value ||
            root?.querySelector('#jnEmail')?.value ||
            this._formEmail ||
            ''
        ).trim();
    }

    /**
     * Full join: early-access + `registerOrUpdateAccount` before creating a subscription.
     * Resubscribe: requires II only.
     */
    async _ensureAccountBeforeStripe() {
        const { getIdentityIfAuthenticated } = await import('../../utils/icAuth.js');
        const identity = await getIdentityIfAuthenticated();
        if (!identity) {
            throw new Error('Sign in with Internet Identity to continue.');
        }
        if (this._joinMode === 'resubscribe') {
            this._preStripeCanisterSyncDone = true;
            return;
        }
        const email = this._getEmailForSubscription();
        const cat = this._getSelectedCategoryNormalized();
        const fullName = (this.shadowRoot?.querySelector('#jnFullName')?.value || this._formFullName || '').trim();
        if (!email.includes('@') || !cat) {
            throw new Error('Complete name, email, and role on step 1 first.');
        }
        await submitEarlyAccessToCanister(email, cat, fullName, this._modalType);
        const { getAuthenticatedFusionBackendActor } = await import('../../utils/earlyAccessSubscribe.js');
        const { categoryToUserRole } = await import('../../utils/authHeader.js');
        const actor = await getAuthenticatedFusionBackendActor();
        if (actor && typeof actor.registerOrUpdateAccount === 'function') {
            await actor.registerOrUpdateAccount(categoryToUserRole(cat));
        }
        this._preStripeCanisterSyncDone = true;
    }

    _teardownStripePayment() {
        this._stripePaymentReady = false;
        this._stripePrepareKey = '';
        try {
            this._stripePaymentElement?.unmount();
        } catch {
            /* ignore */
        }
        this._stripePaymentElement = null;
        this._stripeElements = null;
        this._stripe = null;
        const mount = this.querySelector('[data-jn-stripe-mount]');
        if (mount) mount.innerHTML = '';
    }

    /**
     * Registers `ready` / `loaderror` listeners and returns a Promise.
     * Call `paymentElement.mount(...)` **after** this (same tick), so listeners exist before mount —
     * otherwise `ready` can fire before handlers attach and the UI hangs on “Loading payment form…”.
     * @param {import('@stripe/stripe-js').StripeElement} paymentElement
     */
    _whenPaymentElementReady(paymentElement) {
        return new Promise((resolve, reject) => {
            let settled = false;
            const ms = 90000;
            const t = window.setTimeout(() => {
                if (settled) return;
                settled = true;
                reject(new Error('Payment form timed out. Check your connection and try again.'));
            }, ms);
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
                    'Payment form failed to load. Check the browser console and Stripe Dashboard.';
                finish(() => reject(new Error(msg)));
            });
        });
    }

    async _prepareStripePayment() {
        const myGen = ++this._stripePrepareGen;
        const root = this.shadowRoot;
        if (!root) return;
        this._teardownStripePayment();
        const hint = root.querySelector('#jnPayStripeHint');
        const devSkip = root.querySelector('#jnPayDevSkip');
        const payBtn = root.querySelector('#jnPayComplete');
        if (payBtn) payBtn.disabled = true;
        if (hint) hint.textContent = 'Preparing payment…';
        if (devSkip) devSkip.style.display = 'none';

        const pk = getStripePublishableKeyResolved();
        const base = getIntegrationBaseUrl();
        if (!pk || !base) {
            if (hint) {
                hint.textContent = !base
                    ? 'Configure Integration API URL in Studio → Services (or VITE_INTEGRATION_API_URL).'
                    : 'Configure Stripe publishable key in Studio → Services (or VITE_STRIPE_PUBLISHABLE_KEY).';
            }
            if (devSkip) devSkip.style.display = DEV_MODE ? 'block' : 'none';
            if (payBtn) payBtn.disabled = !DEV_MODE;
            return;
        }

        try {
            const cat = this._getSelectedCategoryNormalized();
            if (hint) hint.textContent = 'Connecting to payment service…';

            await this._ensureAccountBeforeStripe();
            const { getIdentityIfAuthenticated } = await import('../../utils/icAuth.js');
            const identity = await getIdentityIfAuthenticated();
            if (!identity) throw new Error('Sign in with Internet Identity first.');
            const principal = identity.getPrincipal().toText();
            const emailForSub = this._getEmailForSubscription();
            if (!emailForSub.includes('@')) {
                throw new Error(
                    this._joinMode === 'resubscribe'
                        ? 'Enter the email for your membership billing.'
                        : 'Enter a valid email on step 1.',
                );
            }

            // Load Stripe.js and create Subscription (first invoice PaymentIntent) in parallel.
            const [{ loadStripe }, { clientSecret }] = await Promise.all([
                import('@stripe/stripe-js'),
                createSubscription({
                    principal,
                    email: emailForSub,
                    metadata: {
                        category: cat || '',
                        intent: this._modalType,
                    },
                }),
            ]);
            if (myGen !== this._stripePrepareGen || this._stage !== 'payment') return;

            if (hint) hint.textContent = 'Loading secure card form…';
            const stripe = await loadStripe(pk);
            if (!stripe) throw new Error('Stripe failed to load');
            if (myGen !== this._stripePrepareGen || this._stage !== 'payment') return;

            const elements = stripe.elements({
                clientSecret,
                appearance: { theme: 'stripe' },
            });
            const paymentElement = elements.create('payment');
            const mountEl = this._getStripeMountLightEl();

            // Let the payment panel paint (not `display:none`) before mounting — Stripe requires a visible mount.
            await new Promise((r) => requestAnimationFrame(r));
            await new Promise((r) => requestAnimationFrame(r));
            if (myGen !== this._stripePrepareGen || this._stage !== 'payment') return;

            // Listeners first, then mount — avoids missing a fast `ready` event.
            const readyPromise = this._whenPaymentElementReady(paymentElement);
            paymentElement.mount(mountEl);
            this._stripe = stripe;
            this._stripeElements = elements;
            this._stripePaymentElement = paymentElement;

            await readyPromise;
            if (myGen !== this._stripePrepareGen || this._stage !== 'payment') {
                this._teardownStripePayment();
                return;
            }

            this._stripePaymentReady = true;
            this._stripePrepareKey = this._computeStripePrepareKeySync();
            if (hint) hint.textContent = '';
            if (payBtn) payBtn.disabled = false;
        } catch (e) {
            if (myGen !== this._stripePrepareGen) return;
            this._teardownStripePayment();
            if (DEV_MODE) console.error('[JoinNetwork] Stripe init', e);
            if (hint) {
                hint.textContent =
                    e instanceof Error ? e.message : 'Could not start payment. Try Studio → Services.';
            }
            if (devSkip) devSkip.style.display = DEV_MODE ? 'block' : 'none';
            if (payBtn) payBtn.disabled = !DEV_MODE;
        }
    }

    _getSelectedCategoryNormalized() {
        const active = this.shadowRoot?.querySelector('#jnRoleRow .categoryButton.active');
        const raw = (active?.textContent || '').trim();
        return normalizeEarlyAccessCategory(raw);
    }

    render() {
        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    /* Inherit theme tokens from light DOM */
                    --jn-c2: var(--c2, #000000);
                    --jn-c3: var(--c3, #ffffff);
                    --jn-c5: var(--c5, #d9ceb8);
                    --jn-bg: var(--bg, #faf3f4);
                    --jn-c1: var(--c1, #c12525);
                    --jn-c4: var(--c4, #a2b792);
                }
                .join-network-host {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding-bottom: 4rem;
                    box-sizing: border-box;
                }
                .join-network-band {
                    width: 100%;
                    max-width: 42rem;
                    text-align: center;
                    padding: 1.5rem 1rem 0;
                }
                #bandTitle {
                    font-size: clamp(1.75rem, 2.5vw, 2.75rem);
                    font-variation-settings: var(--fv-headline-wide);
                    color: var(--jn-c2);
                    margin: 0;
                    letter-spacing: 0.02em;
                }
                #bandDescription {
                    font-size: clamp(1rem, 1.4vw, 1.25rem);
                    font-variation-settings: var(--fv-body);
                    margin: 1rem 0 1.5rem;
                    line-height: 1.5;
                    color: var(--jn-c2);
                    opacity: 0.9;
                }
                /* Primary CTA: align with header register rect — sharp corners, c5 fill, opacity hover */
                #bandOpenBtn,
                .jn-btn-primary {
                    box-sizing: border-box;
                    min-height: 2.75rem;
                    padding: 0.5rem 1.5rem;
                    width: 100%;
                    max-width: 100%;
                    font-family: inherit;
                    font-size: clamp(0.88rem, 1.05vw, 1rem);
                    font-variation-settings: var(--fv-nav-active);
                    letter-spacing: 0.06em;
                    text-transform: none;
                    cursor: pointer;
                    -webkit-appearance: none;
                    appearance: none;
                    border: 1.5px solid var(--jn-c2);
                    border-radius: 0;
                    background-color: var(--jn-c5);
                    color: var(--jn-c2);
                    transition: opacity 0.2s ease;
                }
                #bandOpenBtn { width: auto; max-width: 22rem; }
                #bandOpenBtn:hover,
                .jn-btn-primary:hover:not(:disabled) {
                    opacity: 0.88;
                }
                #bandOpenBtn:focus-visible,
                .jn-btn-primary:focus-visible,
                .categoryButton:focus-visible,
                .jn-close:focus-visible,
                .jn-btn-back:focus-visible,
                .jn-link:focus-visible {
                    outline: 2px solid var(--jn-c2);
                    outline-offset: 2px;
                }
                .jn-btn-primary { margin-top: 0.75rem; }
                .jn-btn-primary:disabled {
                    opacity: 0.45;
                    cursor: not-allowed;
                }
                .jn-dialog {
                    --jn-pad: 1.35rem;
                    max-width: min(520px, 96vw);
                    width: 100%;
                    border: 1px solid color-mix(in srgb, var(--jn-c2) 18%, transparent);
                    border-radius: 0;
                    padding: 0;
                    background: var(--jn-bg);
                    color: var(--jn-c2);
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12);
                }
                .jn-dialog::backdrop {
                    /* Neutral scrim + blur so the modal reads clearly in light and dark themes */
                    background: rgba(248, 248, 248, 0.4);
                    -webkit-backdrop-filter: blur(20px) saturate(1.15);
                    backdrop-filter: blur(10px) saturate(1.15);
                }
                .jn-dialog-inner {
                    position: relative;
                    padding: var(--jn-pad);
                    max-height: min(90vh, 880px);
                    overflow-y: auto;
                    box-sizing: border-box;
                }
                .jn-texture {
                    position: absolute;
                    inset: 0;
                    border-radius: 0;
                    pointer-events: none;
                    opacity: 0.35;
                    background:
                        radial-gradient(ellipse 80% 60% at 15% 10%, color-mix(in srgb, var(--jn-c5) 50%, transparent), transparent 55%),
                        radial-gradient(ellipse 70% 50% at 90% 0%, color-mix(in srgb, var(--jn-c4) 35%, transparent), transparent 50%),
                        radial-gradient(ellipse 60% 45% at 50% 100%, color-mix(in srgb, var(--jn-c5) 40%, transparent), transparent 50%);
                }
                .jn-close {
                    position: absolute;
                    top: 0.65rem;
                    right: 0.65rem;
                    z-index: 2;
                    width: 2.5rem;
                    height: 2.5rem;
                    border: 1px solid transparent;
                    background: transparent;
                    font-size: 1.5rem;
                    line-height: 1;
                    cursor: pointer;
                    color: var(--jn-c2);
                    border-radius: 0;
                    font-variation-settings: var(--fv-body);
                }
                .jn-close:hover {
                    background: color-mix(in srgb, var(--jn-c2) 6%, transparent);
                }
                .jn-panel { position: relative; z-index: 1; }
                .jn-panel[hidden] { display: none !important; }
                .jn-panel-head {
                    text-align: center;
                    margin-bottom: 1rem;
                }
                .jn-panel-head h2 {
                    margin: 0;
                    font-size: clamp(1.2rem, 2.4vw, 1.55rem);
                    font-variation-settings: var(--fv-title);
                    color: var(--jn-c2);
                }
                .jn-panel-head p {
                    margin: 0.35rem 0 0;
                    font-size: clamp(0.88rem, 1.15vw, 1rem);
                    font-variation-settings: var(--fv-body);
                    color: color-mix(in srgb, var(--jn-c2) 92%, var(--jn-bg));
                    line-height: 1.45;
                }
                .jn-field { width: 100%; margin-bottom: 0.75rem; }
                .jn-field input,
                .jn-pay-fields input {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 0.65rem 0.75rem;
                    border: 1px solid color-mix(in srgb, var(--jn-c2) 28%, transparent);
                    border-radius: 0;
                    font-family: inherit;
                    font-size: 1rem;
                    font-variation-settings: var(--fv-label);
                    background: var(--jn-c3);
                    color: var(--jn-c2);
                }
                .jn-field input::placeholder,
                .jn-pay-fields input::placeholder {
                    color: color-mix(in srgb, var(--jn-c2) 45%, transparent);
                }
                .jn-role-label {
                    font-size: 0.88rem;
                    margin: 0.75rem 0 0.35rem;
                    font-variation-settings: var(--fv-label-strong);
                    color: var(--jn-c2);
                }
                #jnRoleRow {
                    display: flex;
                    flex-wrap: wrap;
                    column-gap: 0.8rem;
                    row-gap: 0.4rem;
                    justify-content: center;
                    margin-bottom: 0.75rem;
                }
                /* Match app-feed-filter filterButton: outline chip, sharp corners, opacity hover */
                .categoryButton {
                    width: 20%;
                    box-sizing: border-box;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    min-height: 40px;
                    padding: 0.4em 0.55em;
                    font-size: clamp(0.72rem, 0.9vw, 0.9rem);
                    font-variation-settings: var(--fv-subtitle);
                    line-height: 1.2;
                    cursor: pointer;
                    border: 1px solid var(--jn-c2);
                    border-radius: 0;
                    background: transparent;
                    color: var(--jn-c2);
                    transition: opacity 0.2s ease, background-color 0.2s ease, color 0.2s ease;
                }
                .categoryButton:hover:not(.active) {
                    opacity: 0.88;
                }
                .categoryButton.active {
                    background-color: var(--jn-c2);
                    color: var(--jn-c3);
                    opacity: 1;
                }
                #jnRenewHint,
                #jnEntryFooter {
                    font-size: clamp(0.82rem, 1vw, 0.9rem);
                    font-variation-settings: var(--fv-caption);
                    text-align: center;
                    margin: 0.5rem 0 0;
                    color: color-mix(in srgb, var(--jn-c2) 88%, var(--jn-bg));
                    line-height: 1.45;
                }
                .jn-btn-back {
                    display: block;
                    width: 100%;
                    margin-top: 0.65rem;
                    background: none;
                    border: none;
                    text-decoration: underline;
                    text-underline-offset: 0.15em;
                    cursor: pointer;
                    font-size: 0.88rem;
                    font-variation-settings: var(--fv-label);
                    color: var(--jn-c2);
                    font-family: inherit;
                }
                .jn-value-price {
                    text-align: center;
                    margin: 1rem 0;
                }
                #jnPriceAmount {
                    font-size: clamp(2rem, 4vw, 2.75rem);
                    font-variation-settings: var(--fv-headline);
                    color: var(--jn-c2);
                }
                #jnPeriodLabel {
                    display: block;
                    font-size: 1rem;
                    font-variation-settings: var(--fv-subtitle);
                    margin-top: 0.25rem;
                    color: var(--jn-c2);
                }
                #jnIncludesTitle {
                    font-size: 0.92rem;
                    font-variation-settings: var(--fv-label-strong);
                    margin: 0.5rem 0 0.25rem;
                    color: var(--jn-c2);
                }
                #jnIncludesList {
                    text-align: left;
                    padding-left: 1.25rem;
                    margin: 0.5rem 0 0.75rem;
                    font-size: 0.9rem;
                    font-variation-settings: var(--fv-body-wide);
                    line-height: 1.5;
                    color: var(--jn-c2);
                }
                #jnValueDisclaimer,
                #jnRenewLine {
                    font-size: clamp(0.82rem, 1vw, 0.9rem);
                    font-variation-settings: var(--fv-caption);
                    text-align: center;
                    color: color-mix(in srgb, var(--jn-c2) 88%, var(--jn-bg));
                    line-height: 1.5;
                }
                .jn-order-brand {
                    font-weight: 700;
                    font-size: 1.05rem;
                    font-variation-settings: var(--fv-title);
                    margin-bottom: 0.5rem;
                    letter-spacing: 0.04em;
                    text-transform: none;
                    color: var(--jn-c2);
                }
                .jn-order-card {
                    background: var(--jn-c3);
                    border-radius: 0;
                    padding: 1rem;
                    margin: 0.75rem 0;
                    border: 1px solid color-mix(in srgb, var(--jn-c2) 12%, transparent);
                }
                .jn-order-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.9rem;
                    font-variation-settings: var(--fv-body);
                    margin: 0.35rem 0;
                    color: var(--jn-c2);
                }
                .jn-order-total {
                    font-variation-settings: var(--fv-label-strong);
                    margin-top: 0.5rem;
                    padding-top: 0.5rem;
                    border-top: 1px solid color-mix(in srgb, var(--jn-c2) 15%, transparent);
                }
                /* Default if ever used in shadow (we mount in light DOM via slot). */
                .jn-stripe-mount {
                    min-height: 88px;
                    margin: 0.65rem 0;
                }
                ::slotted(.jn-stripe-mount) {
                    min-height: 88px;
                    margin: 0.65rem 0;
                    display: block;
                    box-sizing: border-box;
                }
                #jnPayFooter {
                    font-size: clamp(0.8rem, 1vw, 0.88rem);
                    font-variation-settings: var(--fv-caption);
                    text-align: center;
                    margin-top: 0.75rem;
                    color: color-mix(in srgb, var(--jn-c2) 88%, var(--jn-bg));
                    line-height: 1.5;
                }
                .jn-conf-check {
                    width: 4rem;
                    height: 4rem;
                    margin: 0.5rem auto 1rem;
                    border-radius: 50%;
                    background: color-mix(in srgb, var(--jn-c4) 35%, transparent);
                    border: 1px solid color-mix(in srgb, var(--jn-c4) 55%, transparent);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.75rem;
                    color: var(--jn-c2);
                }
                #jnConfLinks {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.65rem 1rem;
                    justify-content: center;
                    margin-top: 1rem;
                    padding-top: 1rem;
                    border-top: 1px solid color-mix(in srgb, var(--jn-c2) 12%, transparent);
                }
                .jn-link {
                    font-size: 0.82rem;
                    font-variation-settings: var(--fv-label);
                    color: var(--jn-c2);
                    text-decoration: underline;
                    text-underline-offset: 0.2em;
                    cursor: pointer;
                }
                .jn-link:hover {
                    opacity: 0.8;
                }
                #jnSecondaryLine {
                    text-align: center;
                    font-size: clamp(0.82rem, 1vw, 0.9rem);
                    margin-top: 0.75rem;
                    color: color-mix(in srgb, var(--jn-c2) 88%, var(--jn-bg));
                    font-variation-settings: var(--fv-caption);
                    line-height: 1.45;
                }
                /* Stripe status line — neutral (not error red like .jn-live) */
                #jnPayStripeHint {
                    font-size: clamp(0.82rem, 1vw, 0.9rem);
                    text-align: center;
                    margin: 0.25rem 0 0.5rem;
                    color: color-mix(in srgb, var(--jn-c2) 88%, var(--jn-bg));
                    font-variation-settings: var(--fv-caption);
                    line-height: 1.45;
                    min-height: 1.25em;
                }
                .jn-live {
                    font-size: 0.8rem;
                    text-align: center;
                    color: var(--jn-c1);
                    margin-top: 0.5rem;
                    min-height: 1.25em;
                    font-variation-settings: var(--fv-label);
                }
                @media (max-width: 768px) {
                    .join-network-host {
                        width: 100%;
                        padding-left: 10%;
                        padding-right: 10%;
                        box-sizing: border-box;
                        margin-left: auto;
                        margin-right: auto;
                    }

                    #bandTitle {
                        font-size: clamp(2rem, 3vw, 4rem);
                    }

                    #bandDescription {
                        font-variation-settings: var(--fv-label-strong);
                    }

                    #bandOpenBtn {
                        width: 80%;
                        max-width: 22rem;
                        margin-left: auto;
                        margin-right: auto;
                        min-height: 3.5rem;
                        padding-top: 0.65em;
                        padding-bottom: 0.65em;
                        font-size: clamp(1.2rem, 2vw, 3rem);
                    }
                }

                @media (max-width: 520px) {
                    #bandOpenBtn {
                        width: 80%;
                        max-width: none;
                        margin-left: auto;
                        margin-right: auto;
                    }
                    #jnConfLinks {
                        flex-direction: column;
                        align-items: stretch;
                    }
                }
            </style>
            <div class="join-network-host">
                <div class="join-network-band">
                    <h2 id="bandTitle"></h2>
                    <p id="bandDescription"></p>
                    <button type="button" id="bandOpenBtn">Join FUSION</button>
                    </div>
                <dialog class="jn-dialog" aria-labelledby="jnDialogTitle">
                    <div class="jn-texture" aria-hidden="true"></div>
                    <div class="jn-dialog-inner">
                        <button type="button" class="jn-close" aria-label="Close">×</button>
                        <p id="jnDialogTitle" class="jn-visually-hidden">Join FUSION</p>

                        <div class="jn-panel" data-jn-panel="entry">
                            <div class="jn-panel-head">
                                <h2 id="jnEntryTitle"></h2>
                                <p id="jnEntrySubtitle"></p>
                        </div>
                            <div class="jn-field">
                                <input type="text" id="jnFullName" name="jn-full-name" autocomplete="name" placeholder="Full Name" />
                    </div>
                            <div class="jn-field">
                                <input type="email" id="jnEmail" name="jn-email" autocomplete="email" placeholder="Email" />
                    </div>
                            <p class="jn-role-label" id="jnRoleLabel">I am:</p>
                            <div id="jnRoleRow">
                                <button type="button" class="categoryButton active" data-role="Artist">Artist</button>
                                <button type="button" class="categoryButton" data-role="Gallery">Gallery</button>
                                <button type="button" class="categoryButton" data-role="Curator">Curator</button>
                                <button type="button" class="categoryButton" data-role="Collector">Collector</button>
                </div>
                            <p id="jnRenewHint"></p>
                            <button type="button" class="jn-btn-primary" id="jnEntryContinue">Continue</button>
                            <p id="jnEntryFooter"></p>
                            <p id="jnEntryErr" class="jn-live" aria-live="polite"></p>
                        </div>

                        <div class="jn-panel" data-jn-panel="value" hidden>
                            <div class="jn-panel-head">
                                <h2 id="jnValueTitle"></h2>
                                <p id="jnValueLead"></p>
                            </div>
                            <div class="jn-value-price">
                                <span id="jnPriceAmount"></span>
                                <span id="jnPeriodLabel"></span>
                            </div>
                            <div id="jnIncludesTitle"></div>
                            <ul id="jnIncludesList"></ul>
                            <p id="jnRenewLine"></p>
                            <p id="jnValueDisclaimer"></p>
                            <button type="button" class="jn-btn-primary" id="jnValueContinue">Continue</button>
                            <button type="button" class="jn-btn-back" id="jnValueBack">Back</button>
                        </div>

                        <div class="jn-panel" data-jn-panel="payment" hidden>
                            <div class="jn-panel-head">
                                <h2 id="jnPayTitle"></h2>
                                <p id="jnPaySubtitle"></p>
                            </div>
                            <div class="jn-field" id="jnPayEmailWrap" hidden>
                                <label for="jnPayEmail">Email for billing</label>
                                <input type="email" id="jnPayEmail" name="jn-pay-email" autocomplete="email" placeholder="you@example.com" />
                            </div>
                            <div class="jn-order-card">
                                <div class="jn-order-brand" id="jnOrderBrand"></div>
                                <div class="jn-order-row"><span id="jnLine3m"></span><span>$50.00</span></div>
                                <div class="jn-order-row"><span id="jnLineRenew"></span><span>$50.00</span></div>
                                <div class="jn-order-row jn-order-total"><span id="jnTotalLabel"></span><span id="jnOrderTotal"></span></div>
                    </div>
                            <!-- Stripe Payment Element must live in light DOM; projected here via slot -->
                            <slot name="jn-stripe-mount"></slot>
                            <p id="jnPayStripeHint"></p>
                            <button type="button" class="jn-btn-primary" id="jnPayComplete"></button>
                            <button type="button" class="jn-btn-back" id="jnPayDevSkip" style="display:none;margin-top:0.5rem">Skip payment (dev)</button>
                            <p id="jnPayFooter"></p>
                            <p id="jnPayErr" class="jn-live" aria-live="polite"></p>
                            <button type="button" class="jn-btn-back" id="jnPayBack">Back</button>
                        </div>

                        <div class="jn-panel" data-jn-panel="confirmation" hidden>
                            <div class="jn-panel-head">
                                <h2 id="jnConfTitle"></h2>
                            </div>
                            <div class="jn-conf-check" aria-hidden="true">✓</div>
                            <div class="jn-panel-head">
                                <h2 id="jnWelcomeTitle"></h2>
                                <p id="jnWelcomeBody"></p>
                            </div>
                            <button type="button" class="jn-btn-primary" id="jnPrimaryCta"></button>
                            <p id="jnSecondaryLine"></p>
                            <div id="jnConfLinks"></div>
                    </div>
                    </div>
                </dialog>
            </div>
        `;

        const styleEl = this.shadow.querySelector('style');
        if (styleEl) {
            let extra = `
                .jn-visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
            `;
            if (this.hasAttribute('data-header-bridge')) {
                extra += `
                :host([data-header-bridge]) .join-network-band { display: none !important; }
                :host([data-header-bridge]) .join-network-host { padding: 0; margin: 0; min-height: 0; }
                `;
            }
            styleEl.textContent += extra;
        }

        this._fillBandCopy();
        this._fillDialogCopy();
        this._applyHostMargins();
        this._wire();
    }

    /**
     * Open the join flow dialog (same as the band “Open” button). Used by header Register and
     * `window` event `fusion-open-join-network`.
     * @param {{ mode?: 'resubscribe' } | undefined} [detail]
     */
    openModal(detail) {
        this._openModal(detail);
    }

    /** @param {{ mode?: 'resubscribe' } | undefined} [detail] */
    _openModal(detail) {
        const root = this.shadowRoot;
        if (!root) return;
        const dlg = root.querySelector('.jn-dialog');
        const openBtn = root.querySelector('#bandOpenBtn');
        this._modalType = resolveModalType(this);
        this._preStripeCanisterSyncDone = false;
        if (detail && detail.mode === 'resubscribe') {
            this._joinMode = 'resubscribe';
            this._stage = 'payment';
            this._logoutIfDismissedWithoutJoin = false;
        } else {
            this._joinMode = 'full';
            this._stage = 'entry';
            const dbg = (this.getAttribute('stage') || '').trim().toLowerCase();
            if (STAGES.includes(/** @type {FlowStage} */ (dbg))) {
                this._stage = /** @type {FlowStage} */ (dbg);
            }
            this._logoutIfDismissedWithoutJoin = _pendingLogoutIfDismissedWithoutAccount;
            _pendingLogoutIfDismissedWithoutAccount = false;
        }
        this._fillDialogCopy();
        this._joinFlowCompleted = false;
        const name = root.querySelector('#jnFullName');
        const email = root.querySelector('#jnEmail');
        if (name) name.value = this._formFullName;
        if (email) email.value = this._formEmail;
        this._lastFocused = document.activeElement;
        if (dlg && typeof dlg.showModal === 'function') {
            dlg.showModal();
            // Same backend actor as loadscreen `#csCTAForm` — warm connection early (before payment).
            prefetchFusionBackendActor();
            requestAnimationFrame(() => {
                const focusEl = root.querySelector('#jnFullName') || openBtn;
                focusEl?.focus?.();
            });
        }
    }

    _wire() {
        const root = this.shadowRoot;
        if (!root) return;
        const dlg = root.querySelector('.jn-dialog');
        const openBtn = root.querySelector('#bandOpenBtn');
        const closeBtn = root.querySelector('.jn-close');

        openBtn?.addEventListener('click', () => {
            this._openModal();
        });

        closeBtn?.addEventListener('click', () => {
            if (dlg && typeof dlg.close === 'function') dlg.close();
        });

        dlg?.addEventListener('close', () => {
            this._teardownStripePayment();
            const shouldLogoutIi =
                this._logoutIfDismissedWithoutJoin && !this._joinFlowCompleted;
            this._logoutIfDismissedWithoutJoin = false;
            this._joinFlowCompleted = false;
            if (shouldLogoutIi) {
                void import('../../utils/icAuth.js').then((m) => m.logoutInternetIdentity());
            }
            if (this._lastFocused && typeof this._lastFocused.focus === 'function') {
                try {
                    this._lastFocused.focus();
                } catch (_) {
                    /* ignore */
                }
            }
        });

        const roleRow = root.querySelector('#jnRoleRow');
        roleRow?.addEventListener('click', (e) => {
            const btn = e.target.closest('.categoryButton');
            if (!btn || !roleRow.contains(btn)) return;
            roleRow.querySelectorAll('.categoryButton').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
        });

        root.querySelector('#jnEntryContinue')?.addEventListener('click', () => {
            const err = root.querySelector('#jnEntryErr');
            if (err) err.textContent = '';
            const name = (root.querySelector('#jnFullName')?.value || '').trim();
            const email = (root.querySelector('#jnEmail')?.value || '').trim();
            const cat = this._getSelectedCategoryNormalized();
            if (!cat) {
                if (err) err.textContent = 'Please select a role first.';
                return;
            }
            if (!name) {
                if (err) err.textContent = 'Please enter your name.';
                return;
            }
            if (!email || !email.includes('@')) {
                if (err) err.textContent = 'Please enter a valid email.';
                return;
            }
            this._formFullName = name;
            this._formEmail = email;
            prefetchFusionBackendActor();
            this._showStage('value');
        });

        root.querySelector('#jnValueContinue')?.addEventListener('click', () => {
            prefetchFusionBackendActor();
            this._showStage('payment');
        });
        root.querySelector('#jnValueBack')?.addEventListener('click', () => {
            this._showStage('entry');
        });

        root.querySelector('#jnPayBack')?.addEventListener('click', () => {
            this._showStage('value');
        });

        const afterJoinSaved = async () => {
            const email = this._getEmailForSubscription() || this._formEmail.trim();
            const cat = this._getSelectedCategoryNormalized();
            const fullName = (this.shadowRoot?.querySelector('#jnFullName')?.value || this._formFullName || '').trim();
            if (!this._preStripeCanisterSyncDone) {
                try {
                    await submitEarlyAccessToCanister(email, cat, fullName, this._modalType);
                } catch (err) {
                    if (DEV_MODE) {
                        console.error('[JoinNetwork] Early access save failed', err);
                        console.error('[JoinNetwork] IC host:', getHost());
                    }
                    const errEl = root.querySelector('#jnPayErr');
                    if (errEl) errEl.textContent = 'Could not save your signup. Please try again.';
                    throw err;
                }
                try {
                    const { getIdentityIfAuthenticated } = await import('../../utils/icAuth.js');
                    const identity = await getIdentityIfAuthenticated();
                    if (identity) {
                        const { getAuthenticatedFusionBackendActor } = await import(
                            '../../utils/earlyAccessSubscribe.js'
                        );
                        const { categoryToUserRole } = await import('../../utils/authHeader.js');
                        const actor = await getAuthenticatedFusionBackendActor();
                        if (actor && typeof actor.registerOrUpdateAccount === 'function') {
                            await actor.registerOrUpdateAccount(categoryToUserRole(cat));
                        }
                    }
                } catch (regErr) {
                    if (DEV_MODE) console.warn('[JoinNetwork] registerOrUpdateAccount', regErr);
                }
            }
            this._preStripeCanisterSyncDone = false;
            if (email.includes('@')) {
                try {
                    await sendEmail({
                        to: email,
                        subject: 'Welcome to FUSION',
                        text: 'Thank you — your FUSION signup was received.',
                    });
                } catch (e) {
                    const msg = e instanceof Error ? e.message : String(e);
                    console.warn('[JoinNetwork] confirmation email failed (signup still saved):', msg);
                }
            }
            this._joinFlowCompleted = true;
            this._showStage('confirmation');
        };

        const completePayment = async () => {
            const errEl = root.querySelector('#jnPayErr');
            if (errEl) errEl.textContent = '';
            const email = this._formEmail.trim();
            const cat = this._getSelectedCategoryNormalized();
            if (!email || !cat) {
                if (errEl) errEl.textContent = 'Missing email or role. Go back to step 1.';
                return;
            }
            if (this._joinNetworkSubmitting) return;

            if (this._stripe && this._stripeElements) {
                if (!this._stripePaymentReady) {
                    if (errEl) {
                        errEl.textContent =
                            'Payment form is still loading. Wait until the card fields appear, then try again.';
                    }
                    return;
                }
                this._joinNetworkSubmitting = true;
                try {
                    const { error } = await this._stripe.confirmPayment({
                        elements: this._stripeElements,
                        confirmParams: {
                            return_url: window.location.href,
                        },
                        redirect: 'if_required',
                    });
                    if (error) {
                        if (errEl) errEl.textContent = error.message || 'Payment failed.';
                        return;
                    }
                    await afterJoinSaved();
                } catch (e) {
                    if (DEV_MODE) console.error('[JoinNetwork] confirmPayment', e);
                    if (errEl) {
                        errEl.textContent =
                            e instanceof Error ? e.message : 'Payment could not be completed.';
                    }
                } finally {
                    this._joinNetworkSubmitting = false;
                }
                return;
            }

            if (errEl) {
                errEl.textContent =
                    'Payment form is not ready. Configure Services or use dev skip if available.';
            }
        };

        root.querySelector('#jnPayComplete')?.addEventListener('click', completePayment);

        root.querySelector('#jnPayDevSkip')?.addEventListener('click', async () => {
            if (!DEV_MODE) return;
            const errEl = root.querySelector('#jnPayErr');
            if (errEl) errEl.textContent = '';
            const email = this._formEmail.trim();
            const cat = this._getSelectedCategoryNormalized();
            if (this._joinMode !== 'resubscribe' && (!email || !cat)) {
                if (errEl) errEl.textContent = 'Missing email or role. Go back to step 1.';
                return;
            }
            if (this._joinNetworkSubmitting) return;
            this._joinNetworkSubmitting = true;
            try {
                if (this._joinMode === 'resubscribe') {
                    this._preStripeCanisterSyncDone = true;
                }
                await afterJoinSaved();
            } catch (e) {
                if (DEV_MODE) console.error('[JoinNetwork]', e);
                if (errEl) errEl.textContent = 'Could not save. Please try again.';
            } finally {
                this._joinNetworkSubmitting = false;
            }
        });

        root.querySelector('#jnPrimaryCta')?.addEventListener('click', () => {
            this._joinFlowCompleted = true;
            navigate('/register');
            if (dlg && typeof dlg.close === 'function') dlg.close();
        });

        root.querySelector('#jnConfLinks')?.addEventListener('click', (e) => {
            const a = e.target.closest('a[data-href]');
            if (!a) return;
            e.preventDefault();
            const href = a.getAttribute('data-href') || a.getAttribute('href');
            if (href) {
                this._joinFlowCompleted = true;
                navigate(href);
            }
            if (dlg && typeof dlg.close === 'function') dlg.close();
        });
    }
}

customElements.define('app-join-network', JoinNetworkComponent);

/** Header “Register” and other shell controls: open the membership modal without navigating. */
window.addEventListener('fusion-open-join-network', (ev) => {
    const d = ev && typeof ev === 'object' && 'detail' in ev ? /** @type {CustomEvent} */ (ev).detail : null;
    const detail =
        d && typeof d === 'object'
            ? /** @type {{ logoutIfDismissedWithoutAccount?: boolean, mode?: string }} */ (d)
            : null;
    _pendingLogoutIfDismissedWithoutAccount = Boolean(
        detail && detail.logoutIfDismissedWithoutAccount && detail.mode !== 'resubscribe'
    );
    const openOpts = detail?.mode === 'resubscribe' ? { mode: 'resubscribe' } : undefined;
    const bridge = document.getElementById('joinNetworkHeaderBridge');
    if (bridge && typeof bridge.openModal === 'function') {
        bridge.openModal(openOpts);
        return;
    }
    const fallback = document.querySelector('app-join-network');
    if (fallback && typeof fallback.openModal === 'function') {
        fallback.openModal(openOpts);
        return;
    }
    _pendingLogoutIfDismissedWithoutAccount = false;
});

export { JoinNetworkComponent };
