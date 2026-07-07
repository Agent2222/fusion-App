/**
 * Payment config — active provider from Studio (PayPal default); legacy members may use Stripe.
 */
import { getIntegrationBaseUrl } from './integrationApi.js';
import {
    getActivePaymentProviderSetting,
    getPayPalClientIdResolved,
    getStripeMode,
} from './studioServicesConfig.js';

/** @type {{ provider: string, paypalClientId: string, mode: string, configured?: boolean, planBimonthly?: string, planAnnual?: string } | null} */
let _cached = null;

/**
 * @returns {Promise<{ provider: 'paypal'|'stripe', paypalClientId: string, mode: string, configured: boolean, planBimonthly: string, planAnnual: string }>}
 */
export async function fetchPaymentConfig() {
    const activeProvider = getActivePaymentProviderSetting();
    const base = getIntegrationBaseUrl();
    if (base) {
        try {
            const res = await fetch(`${base}/payments/config`, { method: 'GET' });
            if (res.ok) {
                const data = await res.json();
                _cached = {
                    provider: activeProvider,
                    paypalClientId: String(data.paypalClientId || getPayPalClientIdResolved()),
                    mode: String(data.mode || (getStripeMode() === 'live' ? 'live' : 'sandbox')),
                    configured: Boolean(data.configured ?? data.paypalClientId),
                    planBimonthly: String(data.planBimonthly || ''),
                    planAnnual: String(data.planAnnual || ''),
                };
                return /** @type {typeof _cached} */ (_cached);
            }
        } catch {
            /* fall through */
        }
    }
    _cached = {
        provider: activeProvider,
        paypalClientId: getPayPalClientIdResolved(),
        mode: getStripeMode() === 'live' ? 'live' : 'sandbox',
        configured: Boolean(getPayPalClientIdResolved()),
        planBimonthly: '',
        planAnnual: '',
    };
    return /** @type {typeof _cached} */ (_cached);
}

/** @returns {'paypal'|'stripe'} */
export function getActiveProvider() {
    return getActivePaymentProviderSetting();
}

/**
 * True when Studio Test/Live disagrees with integration server PayPal mode.
 *
 * @param {{ mode?: string } | null | undefined} serverConfig
 * @returns {boolean}
 */
export function paymentModeMismatch(serverConfig) {
    if (!serverConfig?.mode) return false;
    const studioLive = getStripeMode() === 'live';
    const serverLive = String(serverConfig.mode).toLowerCase() === 'live';
    return studioLive !== serverLive;
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
