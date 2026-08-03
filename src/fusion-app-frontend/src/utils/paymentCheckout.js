/**
 * PayPal Advanced Checkout adapter (Card Fields + Buttons + embedded subscriptions).
 */

import '../styles/paypalCardFields.css';

/** @type {Promise<void> | null} */
let _sdkOrderLoadPromise = null;

/** @type {Promise<void> | null} */
let _sdkSubLoadPromise = null;

const PAYPAL_SUB_NS = 'paypalSubscription';

/**
 * PayPal Buttons `style` — only official SDK values are allowed.
 * Prefer black + rect to match Fusion CTAs (`--c2` / sharp edges) instead of default gold/blue.
 * @see https://developer.paypal.com/studio/checkout/advanced/integrate
 * @see https://developer.paypal.com/sdk/js/reference/#style
 *
 * @param {'paypal' | 'checkout' | 'pay' | 'buynow' | 'subscribe'} [label]
 */
function paypalButtonStyle(label = 'paypal') {
    return {
        layout: 'vertical',
        color: 'black',
        shape: 'rect',
        label,
        height: 44,
        tagline: false,
    };
}

/** Hosted Card Fields input styles (iframe — only PayPal-supported properties; no CSS vars / custom fonts). */
const PAYPAL_CARD_FIELD_STYLES = {
    input: {
        'font-size': '16px',
        'font-family': "'Helvetica Neue', Helvetica, Arial, sans-serif",
        'font-weight': '400',
        'letter-spacing': '0.02em',
        'line-height': '1.35',
        color: '#000000',
        padding: '0.55rem 0.65rem',
    },
    '::placeholder': {
        color: 'rgba(0, 0, 0, 0.38)',
    },
    ':focus': {
        color: '#000000',
    },
    '.invalid': {
        color: '#c12525',
    },
};

/**
 * @param {string} clientId
 * @param {'sandbox' | 'live'} [mode]
 */
export function loadPayPalSdk(clientId, mode = 'sandbox') {
    if (typeof window === 'undefined') return Promise.resolve();
    if (window.paypal?.Buttons && window.paypal?.CardFields) return Promise.resolve();
    if (_sdkOrderLoadPromise) return _sdkOrderLoadPromise;
    _sdkOrderLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const sdkMode = mode === 'live' ? '' : '&buyer-country=US';
        script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&components=buttons,card-fields&currency=USD${sdkMode}`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => {
            _sdkOrderLoadPromise = null;
            reject(new Error('PayPal SDK failed to load'));
        };
        document.head.appendChild(script);
    });
    return _sdkOrderLoadPromise;
}

/**
 * Subscription-intent SDK (separate namespace so it can coexist with one-time capture SDK).
 *
 * @param {string} clientId
 * @param {'sandbox' | 'live'} [mode]
 */
export function loadPayPalSubscriptionSdk(clientId, mode = 'sandbox') {
    if (typeof window === 'undefined') return Promise.resolve();
    const existing = window[PAYPAL_SUB_NS];
    if (existing?.Buttons) return Promise.resolve();
    if (_sdkSubLoadPromise) return _sdkSubLoadPromise;
    _sdkSubLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.setAttribute('data-namespace', PAYPAL_SUB_NS);
        const sdkMode = mode === 'live' ? '' : '&buyer-country=US';
        script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&components=buttons&vault=true&intent=subscription&currency=USD${sdkMode}`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => {
            _sdkSubLoadPromise = null;
            reject(new Error('PayPal subscription SDK failed to load'));
        };
        document.head.appendChild(script);
    });
    return _sdkSubLoadPromise;
}

/**
 * @returns {typeof window.paypal | undefined}
 */
function getPayPalSubscriptionApi() {
    return window[PAYPAL_SUB_NS];
}

/**
 * @typedef {{
 *   usesCardFields: boolean,
 *   submit: () => Promise<void>,
 *   destroy: () => void,
 * }} PayPalAdvancedCheckoutController
 */

/**
 * @param {HTMLElement} mountEl
 * @param {{ clientId: string, mode?: string, orderId: string, onApproved: (orderId: string) => Promise<void>, onError?: (err: unknown) => void }} opts
 */
export async function mountPayPalOrderButtons(mountEl, opts) {
    const mode = opts.mode === 'live' ? 'live' : 'sandbox';
    await loadPayPalSdk(opts.clientId, mode);
    mountEl.textContent = '';
    const container = document.createElement('div');
    mountEl.appendChild(container);
    await window.paypal
        .Buttons({
            style: paypalButtonStyle('paypal'),
            createOrder: () => opts.orderId,
            onApprove: async (data) => {
                await opts.onApproved(data.orderID || opts.orderId);
            },
            onError: (err) => {
                opts.onError?.(err);
            },
        })
        .render(container);
}

/**
 * Embedded one-time checkout: Card Fields (primary) + PayPal wallet button (fallback).
 *
 * @param {HTMLElement} mountEl
 * @param {{
 *   clientId: string,
 *   mode?: string,
 *   amountCents: number,
 *   metadata?: Record<string, string>,
 *   createOrder: (body: { amountCents: number, metadata?: Record<string, string> }) => Promise<{ orderId: string }>,
 *   onApproved: (orderId: string) => Promise<void>,
 *   onError?: (err: unknown) => void,
 *   showPayNowButton?: boolean,
 *   payNowLabel?: string,
 *   onPayNowClick?: (submit: () => Promise<void>) => void | Promise<void>,
 * }} opts
 * @returns {Promise<PayPalAdvancedCheckoutController>}
 */
export async function mountPayPalAdvancedOneTimeCheckout(mountEl, opts) {
    const mode = opts.mode === 'live' ? 'live' : 'sandbox';
    await loadPayPalSdk(opts.clientId, mode);
    const paypal = window.paypal;
    if (!paypal?.Buttons) {
        throw new Error('PayPal SDK not available');
    }

    let destroyed = false;
    let createdOrderId = '';
    /** @type {{ submit: () => Promise<void>, isEligible?: () => boolean } | null} */
    let cardFields = null;
    /** @type {HTMLElement | null} */
    let payNowBtn = null;

    const createOrderId = async () => {
        const res = await opts.createOrder({
            amountCents: opts.amountCents,
            metadata: opts.metadata || {},
        });
        createdOrderId = res.orderId;
        return res.orderId;
    };

    const handleApprove = async (data) => {
        const orderId = data?.orderID || createdOrderId;
        if (!orderId) {
            throw new Error('PayPal order ID missing after approval');
        }
        await opts.onApproved(orderId);
    };

    mountEl.textContent = '';
    const root = document.createElement('div');
    root.className = 'paypal-advanced-checkout';
    mountEl.appendChild(root);

    const cardSection = document.createElement('div');
    cardSection.className = 'paypal-card-fields-section';
    root.appendChild(cardSection);

    /**
     * @param {string} labelText
     * @param {string} hostClassExtra
     */
    const makeLabeledHost = (labelText, hostClassExtra = '') => {
        const wrap = document.createElement('label');
        wrap.className = 'paypal-card-field';
        if (hostClassExtra) wrap.classList.add(hostClassExtra);
        const label = document.createElement('span');
        label.className = 'paypal-card-field__label';
        label.textContent = labelText;
        const host = document.createElement('div');
        host.className = 'paypal-card-field-host';
        host.id = `paypal-card-${Math.random().toString(36).slice(2, 9)}`;
        wrap.appendChild(label);
        wrap.appendChild(host);
        return { wrap, host };
    };

    const nameField = makeLabeledHost('Name on card');
    cardSection.appendChild(nameField.wrap);

    const numberField = makeLabeledHost('Card number');
    cardSection.appendChild(numberField.wrap);

    const grid = document.createElement('div');
    grid.className = 'paypal-card-fields-grid';
    cardSection.appendChild(grid);

    const expiryField = makeLabeledHost('Expiry');
    grid.appendChild(expiryField.wrap);

    const cvvField = makeLabeledHost('CVV');
    grid.appendChild(cvvField.wrap);

    if (opts.showPayNowButton) {
        payNowBtn = document.createElement('button');
        payNowBtn.type = 'button';
        payNowBtn.className = 'paypal-card-pay-now';
        payNowBtn.textContent = opts.payNowLabel || 'Pay now';
        cardSection.appendChild(payNowBtn);
    }

    const divider = document.createElement('div');
    divider.className = 'paypal-pay-divider';
    divider.textContent = 'or pay with PayPal';
    divider.hidden = true;
    root.appendChild(divider);

    const walletSection = document.createElement('div');
    walletSection.className = 'paypal-wallet-section';
    root.appendChild(walletSection);

    cardFields = paypal.CardFields({
        style: PAYPAL_CARD_FIELD_STYLES,
        createOrder: createOrderId,
        onApprove: handleApprove,
        onError: (err) => opts.onError?.(err),
    });

    let usesCardFields = false;
    if (cardFields.isEligible()) {
        usesCardFields = true;
        divider.hidden = false;
        await Promise.all([
            cardFields.NameField({ placeholder: 'Name on card' }).render(`#${nameField.host.id}`),
            cardFields.NumberField({ placeholder: 'Card number' }).render(`#${numberField.host.id}`),
            cardFields.ExpiryField({ placeholder: 'MM / YY' }).render(`#${expiryField.host.id}`),
            cardFields.CVVField({ placeholder: 'CVV' }).render(`#${cvvField.host.id}`),
        ]);
    } else {
        cardSection.hidden = true;
        if (payNowBtn) payNowBtn.hidden = true;
    }

    await paypal
        .Buttons({
            style: paypalButtonStyle(usesCardFields ? 'paypal' : 'pay'),
            createOrder: createOrderId,
            onApprove: handleApprove,
            onError: (err) => opts.onError?.(err),
        })
        .render(walletSection);

    const submitCard = async () => {
        if (destroyed) return;
        if (!usesCardFields || !cardFields) {
            throw new Error('Card payment is not available. Use PayPal below.');
        }
        await cardFields.submit();
    };

    if (payNowBtn) {
        payNowBtn.addEventListener('click', async () => {
            if (destroyed) return;
            payNowBtn.disabled = true;
            try {
                if (opts.onPayNowClick) {
                    await opts.onPayNowClick(submitCard);
                } else {
                    await submitCard();
                }
            } catch (err) {
                opts.onError?.(err);
            } finally {
                if (!destroyed && payNowBtn) payNowBtn.disabled = false;
            }
        });
    }

    return {
        usesCardFields,
        submit: submitCard,
        destroy: () => {
            destroyed = true;
            cardFields = null;
            mountEl.textContent = '';
        },
    };
}

/**
 * PayPal subscription custom_id (127 char limit). Prefer principal / pending id / tier;
 * do not pack email or names (email is on subscriber).
 * Mirrors server `subscriptionCustomId` in paypalProvider.js.
 *
 * @param {Record<string, string | undefined | null>} [customData]
 */
export function buildPayPalSubscriptionCustomId(customData) {
    const src = customData && typeof customData === 'object' ? customData : {};
    /** @type {Record<string, string>} */
    const essential = {};
    const principal = String(src.principal || '').trim();
    const pending = String(src.fusion_pending_id || '').trim();
    const tier = String(src.tier || '')
        .trim()
        .toLowerCase();
    const planId = String(src.plan_id || src.planId || '').trim();
    if (principal) essential.principal = principal.slice(0, 63);
    if (pending) essential.fusion_pending_id = pending.slice(0, 36);
    if (
        tier === 'monthly' ||
        tier === 'quarterly' ||
        tier === 'annual' ||
        tier === 'bimonthly'
    ) {
        essential.tier = tier;
    }
    if (planId) essential.plan_id = planId.slice(0, 40);
    let json = JSON.stringify(essential);
    if (json.length <= 127) return json;
    /** @type {Record<string, string>} */
    const withPlan = { ...essential };
    delete withPlan.pending_email;
    json = JSON.stringify(withPlan);
    if (json.length <= 127) return json;
    /** @type {Record<string, string>} */
    const minimal = {};
    if (essential.principal) minimal.principal = essential.principal;
    if (essential.fusion_pending_id) minimal.fusion_pending_id = essential.fusion_pending_id;
    if (essential.tier) minimal.tier = essential.tier;
    json = JSON.stringify(minimal);
    if (json.length <= 127 && essential.plan_id) {
        const withPlanId = { ...minimal, plan_id: essential.plan_id };
        const j2 = JSON.stringify(withPlanId);
        if (j2.length <= 127) return j2;
    }
    return json.length <= 127 ? json : json.slice(0, 127);
}

/**
 * Embedded PayPal subscription buttons (popup approval — no full-page redirect).
 *
 * @param {HTMLElement} mountEl
 * @param {{ clientId: string, mode?: string, planId: string, email: string, customData?: Record<string, string>, onApprove: (subscriptionId: string) => Promise<void>, onError?: (err: unknown) => void, onCancel?: () => void }} opts
 */
export async function mountPayPalSubscriptionButtons(mountEl, opts) {
    const mode = opts.mode === 'live' ? 'live' : 'sandbox';
    await loadPayPalSubscriptionSdk(opts.clientId, mode);
    const paypal = getPayPalSubscriptionApi();
    if (!paypal?.Buttons) {
        throw new Error('PayPal subscription SDK not available');
    }
    mountEl.textContent = '';
    const container = document.createElement('div');
    mountEl.appendChild(container);
    const customId = buildPayPalSubscriptionCustomId(opts.customData || {});
    await paypal
        .Buttons({
            style: paypalButtonStyle('subscribe'),
            createSubscription: (_data, actions) =>
                actions.subscription.create({
                    plan_id: opts.planId,
                    custom_id: customId,
                    subscriber: {
                        email_address: opts.email,
                    },
                }),
            onApprove: async (data) => {
                const subscriptionId = data.subscriptionID;
                if (!subscriptionId) {
                    throw new Error('PayPal subscription ID missing after approval');
                }
                await opts.onApprove(subscriptionId);
            },
            onError: (err) => opts.onError?.(err),
            onCancel: () => opts.onCancel?.(),
        })
        .render(container);
}

/**
 * @deprecated Redirect flow — use mountPayPalSubscriptionButtons instead.
 * @param {HTMLElement} mountEl
 * @param {{ approveUrl: string, label?: string }} opts
 */
export function mountPayPalSubscriptionApproval(mountEl, opts) {
    mountEl.textContent = '';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'studio-btn-primary paypal-subscription-approve-btn';
    btn.textContent = opts.label || 'Continue with PayPal';
    btn.addEventListener('click', () => {
        window.location.href = opts.approveUrl;
    });
    mountEl.appendChild(btn);
}

/**
 * @deprecated Use mountPayPalAdvancedOneTimeCheckout for embedded card fields.
 * @param {HTMLElement} mountEl
 * @param {{ clientId: string, mode?: string, amountCents: number, metadata?: Record<string, string>, createOrder: (body: object) => Promise<{ orderId: string }>, onApproved: (orderId: string) => Promise<void>, onError?: (err: unknown) => void }} opts
 */
export async function mountPayPalOneTimeCheckout(mountEl, opts) {
    await mountPayPalAdvancedOneTimeCheckout(mountEl, opts);
}
