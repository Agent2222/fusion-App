/**
 * PayPal Advanced Checkout adapter (Buttons + optional approval redirect).
 */

/** @type {Promise<void> | null} */
let _sdkLoadPromise = null;

/**
 * @param {string} clientId
 * @param {'sandbox' | 'live'} [mode]
 */
export function loadPayPalSdk(clientId, mode = 'sandbox') {
    if (typeof window === 'undefined') return Promise.resolve();
    if (window.paypal?.Buttons) return Promise.resolve();
    if (_sdkLoadPromise) return _sdkLoadPromise;
    _sdkLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const sdkMode = mode === 'live' ? '' : '&buyer-country=US';
        script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&components=buttons,card-fields&currency=USD${sdkMode}`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('PayPal SDK failed to load'));
        document.head.appendChild(script);
    });
    return _sdkLoadPromise;
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
