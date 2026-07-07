/**
 * PayPal Advanced Checkout adapter (Buttons + embedded subscriptions).
 */

/** @type {Promise<void> | null} */
let _sdkOrderLoadPromise = null;

/** @type {Promise<void> | null} */
let _sdkSubLoadPromise = null;

const PAYPAL_SUB_NS = 'paypalSubscription';

/**
 * @param {string} clientId
 * @param {'sandbox' | 'live'} [mode]
 */
export function loadPayPalSdk(clientId, mode = 'sandbox') {
    if (typeof window === 'undefined') return Promise.resolve();
    if (window.paypal?.Buttons) return Promise.resolve();
    if (_sdkOrderLoadPromise) return _sdkOrderLoadPromise;
    _sdkOrderLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const sdkMode = mode === 'live' ? '' : '&buyer-country=US';
        script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&components=buttons,card-fields&currency=USD${sdkMode}`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('PayPal SDK failed to load'));
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
        script.onerror = () => reject(new Error('PayPal subscription SDK failed to load'));
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
 * @param {HTMLElement} mountEl
 * @param {{ clientId: string, mode?: string, amountCents: number, metadata?: Record<string, string>, createOrder: (body: object) => Promise<{ orderId: string }>, onApproved: (orderId: string) => Promise<void>, onError?: (err: unknown) => void }} opts
 */
export async function mountPayPalOneTimeCheckout(mountEl, opts) {
    const mode = opts.mode === 'live' ? 'live' : 'sandbox';
    await loadPayPalSdk(opts.clientId, mode);
    mountEl.textContent = '';
    const container = document.createElement('div');
    mountEl.appendChild(container);
    let createdOrderId = '';
    await window.paypal
        .Buttons({
            style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' },
            createOrder: async () => {
                const res = await opts.createOrder({
                    amountCents: opts.amountCents,
                    metadata: opts.metadata || {},
                });
                createdOrderId = res.orderId;
                return res.orderId;
            },
            onApprove: async (data) => {
                await opts.onApproved(data.orderID || createdOrderId);
            },
            onError: (err) => opts.onError?.(err),
        })
        .render(container);
}
