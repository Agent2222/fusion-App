/**
 * Payment config — PayPal is the sole provider for new checkouts.
 */
import { getIntegrationBaseUrl } from './integrationApi.js';
import { getPayPalClientIdResolved, getStripeMode } from './studioServicesConfig.js';

/** @type {{ provider: string, paypalClientId: string, mode: string, configured?: boolean } | null} */
let _cached = null;

/**
 * @returns {Promise<{ provider: 'paypal', paypalClientId: string, mode: string, configured: boolean }>}
 */
export async function fetchPaymentConfig() {
    const base = getIntegrationBaseUrl();
    if (base) {
        try {
            const res = await fetch(`${base}/payments/config`, { method: 'GET' });
            if (res.ok) {
                const data = await res.json();
                _cached = {
                    provider: 'paypal',
                    paypalClientId: String(data.paypalClientId || getPayPalClientIdResolved()),
                    mode: String(data.mode || getStripeMode() === 'live' ? 'live' : 'sandbox'),
                    configured: Boolean(data.configured ?? data.paypalClientId),
                };
                return /** @type {typeof _cached} */ (_cached);
            }
        } catch {
            /* fall through */
        }
    }
    _cached = {
        provider: 'paypal',
        paypalClientId: getPayPalClientIdResolved(),
        mode: getStripeMode() === 'live' ? 'live' : 'sandbox',
        configured: Boolean(getPayPalClientIdResolved()),
    };
    return /** @type {typeof _cached} */ (_cached);
}

/** @returns {'paypal'} */
export function getActiveProvider() {
    return 'paypal';
}

/**
 * Program residency installment plans (variable month count / amount) are not offered
 * over PayPal until dynamic plan creation is implemented.
 *
 * @returns {boolean}
 */
export function canStartProgramPaymentPlan() {
    return false;
}

/**
 * @param {unknown} membership
 * @returns {'stripe' | 'paypal'}
 */
export function membershipPaymentProvider(membership) {
    const p = String(membership?.paymentProvider || '').toLowerCase();
    if (p === 'paypal') return 'paypal';
    if (membership?.paypalSubscriptionId) return 'paypal';
    return 'stripe';
}
