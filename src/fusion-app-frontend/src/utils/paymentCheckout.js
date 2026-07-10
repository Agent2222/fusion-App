/**
 * PayPal Advanced Checkout adapter (Card Fields + Buttons + embedded subscriptions).
 */

import '../styles/paypalCardFields.css';

/** @type {Promise<void> | null} */
let _sdkOrderLoadPromise = null;

/** @type {Promise<void> | null} */
let _sdkSubLoadPromise = null;

const PAYPAL_SUB_NS = 'paypalSubscription';

/** @type {Record<string, string>} */
const PAYPAL_CARD_FIELD_STYLES = {
    body: { padding: '12px 10px' },
    input: {
        'font-size': '16px',
        'font-family': 'inherit',
        color: '#111111',
    },
    '.invalid': { color: '#b00020' },
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
            style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
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

    const nameHost = document.createElement('div');
    nameHost.className = 'paypal-card-field-host';
    nameHost.id = `paypal-card-name-${Math.random().toString(36).slice(2, 9)}`;
    cardSection.appendChild(nameHost);

    const numberHost = document.createElement('div');
    numberHost.className = 'paypal-card-field-host';
    numberHost.id = `paypal-card-number-${Math.random().toString(36).slice(2, 9)}`;
    cardSection.appendChild(numberHost);

    const grid = document.createElement('div');
    grid.className = 'paypal-card-fields-grid';
    cardSection.appendChild(grid);

    const expiryHost = document.createElement('div');
    expiryHost.className = 'paypal-card-field-host';
    expiryHost.id = `paypal-card-expiry-${Math.random().toString(36).slice(2, 9)}`;
    grid.appendChild(expiryHost);

    const cvvHost = document.createElement('div');
    cvvHost.className = 'paypal-card-field-host';
    cvvHost.id = `paypal-card-cvv-${Math.random().toString(36).slice(2, 9)}`;
    grid.appendChild(cvvHost);

    const divider = document.createElement('div');
    divider.className = 'paypal-pay-divider';
    divider.textContent = 'or pay with PayPal';
    divider.hidden = true;
    root.appendChild(divider);

    const walletSection = document.createElement('div');
    walletSection.className = 'paypal-wallet-section';
    root.appendChild(walletSection);

    if (opts.showPayNowButton) {
        payNowBtn = document.createElement('button');
        payNowBtn.type = 'button';
        payNowBtn.className = 'paypal-card-pay-now';
        payNowBtn.textContent = opts.payNowLabel || 'Pay now';
        root.appendChild(payNowBtn);
    }

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
            cardFields.NameField().render(`#${nameHost.id}`),
            cardFields.NumberField().render(`#${numberHost.id}`),
            cardFields.ExpiryField().render(`#${expiryHost.id}`),
            cardFields.CVVField().render(`#${cvvHost.id}`),
        ]);
    } else {
        cardSection.hidden = true;
        if (payNowBtn) payNowBtn.hidden = true;
    }

    await paypal
        .Buttons({
            style: { layout: 'vertical', color: 'gold', shape: 'rect', label: usesCardFields ? 'paypal' : 'pay' },
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
    const customId = JSON.stringify(opts.customData || {}).slice(0, 127);
    await paypal
        .Buttons({
            style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'subscribe' },
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
