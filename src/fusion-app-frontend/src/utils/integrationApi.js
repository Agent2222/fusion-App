/**
 * Optional integration API (Stripe PI, Resend, S3 presign).
 * Base URL: VITE_INTEGRATION_API_URL, or Studio override (localStorage).
 */
import { LS_INTEGRATION_API_KEY, LS_INTEGRATION_API_URL } from './studioServicesConfig.js';

/**
 * @returns {Record<string, string>}
 */
function integrationHeadersJson() {
    const h = { 'Content-Type': 'application/json' };
    try {
        const token = localStorage.getItem(LS_INTEGRATION_API_KEY)?.trim();
        if (token) h.Authorization = `Bearer ${token}`;
    } catch {
        /* ignore */
    }
    const env =
        typeof import.meta !== 'undefined' && import.meta.env?.VITE_INTEGRATION_API_KEY;
    if (typeof env === 'string' && env.trim() && !h.Authorization) {
        h.Authorization = `Bearer ${env.trim()}`;
    }
    return h;
}

/**
 * @returns {string}
 */
export function getIntegrationBaseUrl() {
    try {
        const o = localStorage.getItem(LS_INTEGRATION_API_URL)?.trim();
        if (o && (o.startsWith('http') || o.startsWith('/'))) {
            return o.replace(/\/$/, '');
        }
    } catch {
        /* ignore */
    }
    const env =
        typeof import.meta !== 'undefined' && import.meta.env?.VITE_INTEGRATION_API_URL;
    if (typeof env === 'string' && env.trim()) {
        return env.trim().replace(/\/$/, '');
    }
    return '';
}

/**
 * @returns {Promise<{ ok: boolean, stripe?: string, resend?: string, s3?: string }>}
 */
export async function fetchIntegrationHealth() {
    const base = getIntegrationBaseUrl();
    if (!base) {
        throw new Error('Integration API URL not configured (Studio Services or VITE_INTEGRATION_API_URL).');
    }
    const res = await fetch(`${base}/health`, { method: 'GET' });
    if (!res.ok) {
        throw new Error(`Health check HTTP ${res.status}`);
    }
    return res.json();
}

/** Set while pay-first join awaits Internet Identity after Stripe (`icAuth.runPostLoginPipeline` guard). */
export const FUSION_PENDING_MEMBERSHIP_LINK_KEY = 'fusion-pending-membership-link';

/**
 * Create a Stripe Subscription (bi-monthly Price) and return the first invoice PaymentIntent client secret.
 * Omit `principal` for **pay-first** checkout: response includes `fusionPendingId` until the user links II.
 * @param {{ principal?: string, email: string, metadata?: Record<string, string> }} opts
 * @returns {Promise<{ clientSecret: string, subscriptionId: string, customerId: string, fusionPendingId?: string }>}
 */
export async function createSubscription(opts) {
    const principal = opts?.principal;
    const email = opts?.email;
    const metadata = opts?.metadata && typeof opts.metadata === 'object' ? opts.metadata : {};
    if (typeof email !== 'string' || !email.includes('@')) {
        throw new Error('valid email required');
    }
    const base = getIntegrationBaseUrl();
    if (!base) {
        throw new Error('Integration API URL not configured.');
    }
    /** @type {Record<string, string>} */
    const body = {
        email: email.trim(),
        metadata,
    };
    if (typeof principal === 'string' && principal.trim()) {
        body.principal = principal.trim();
    }
    const res = await fetch(`${base}/stripe/create-subscription`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Create subscription HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data.clientSecret) {
        throw new Error('Invalid subscription response');
    }
    return data;
}

/**
 * Attach IC principal to a pay-first Stripe subscription after Internet Identity sign-in.
 * @param {{ fusionPendingId: string, email: string, principal: string, subscriptionId?: string }} opts
 */
export async function linkSubscriptionToPrincipal(opts) {
    const fusionPendingId = opts?.fusionPendingId;
    const email = opts?.email;
    const principal = opts?.principal;
    const subscriptionId = opts?.subscriptionId;
    if (typeof fusionPendingId !== 'string' || !fusionPendingId.trim()) {
        throw new Error('fusionPendingId required');
    }
    if (typeof email !== 'string' || !email.includes('@')) {
        throw new Error('valid email required');
    }
    if (typeof principal !== 'string' || !principal.trim()) {
        throw new Error('principal required');
    }
    const base = getIntegrationBaseUrl();
    if (!base) {
        throw new Error('Integration API URL not configured.');
    }
    /** @type {Record<string, string>} */
    const body = {
        fusionPendingId: fusionPendingId.trim(),
        email: email.trim(),
        principal: principal.trim(),
    };
    if (typeof subscriptionId === 'string' && subscriptionId.trim()) {
        body.subscriptionId = subscriptionId.trim();
    }
    const res = await fetch(`${base}/stripe/link-subscription-to-principal`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Link subscription HTTP ${res.status}`);
    }
    return res.json();
}

/**
 * Ask the integration API to load this principal’s Stripe subscription and update the canister.
 * No-ops when integration URL is missing; logs warnings on failure (safe after login).
 * @param {string} principalText
 * @returns {Promise<{ synced?: boolean, reason?: string, status?: string } | undefined>}
 */
export async function syncSubscriptionFromStripe(principalText) {
    if (typeof principalText !== 'string' || !principalText.trim()) {
        return undefined;
    }
    const base = getIntegrationBaseUrl();
    if (!base) {
        return undefined;
    }
    try {
        const res = await fetch(`${base}/stripe/sync-subscription`, {
            method: 'POST',
            headers: integrationHeadersJson(),
            body: JSON.stringify({ principal: principalText.trim() }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const detail = typeof err.error === 'string' ? err.error : `HTTP ${res.status}`;
            console.warn('[Fusion] sync-subscription:', detail);
            return undefined;
        }
        return await res.json();
    } catch (e) {
        console.warn('[Fusion] sync-subscription failed:', e);
        return undefined;
    }
}

/**
 * @param {number} amountCents
 * @param {string} [currency]
 * @param {Record<string, string>} [metadata]
 */
export async function createPaymentIntent(amountCents, currency = 'usd', metadata = {}) {
    const base = getIntegrationBaseUrl();
    if (!base) {
        throw new Error('Integration API URL not configured.');
    }
    const res = await fetch(`${base}/stripe/create-payment-intent`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify({
            amount: amountCents,
            currency,
            metadata,
        }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Payment intent HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data.clientSecret) {
        throw new Error('Invalid payment intent response');
    }
    return data;
}

/**
 * @param {{ to: string, subject: string, html?: string, text?: string, replyTo?: string, from?: string }} opts
 */
export async function sendEmail(opts) {
    const base = getIntegrationBaseUrl();
    if (!base) {
        throw new Error('Integration API URL not configured.');
    }
    const res = await fetch(`${base}/email/send`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify(opts),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = typeof err.error === 'string' ? err.error : '';
        throw new Error(
            detail || `Email failed (HTTP ${res.status}). Check Integration API RESEND_* env and Resend dashboard.`,
        );
    }
    return res.json();
}

/**
 * @param {string} key
 * @param {string} contentType
 */
export async function presignUpload(key, contentType) {
    const base = getIntegrationBaseUrl();
    if (!base) {
        throw new Error('Integration API URL not configured.');
    }
    const res = await fetch(`${base}/storage/presign`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify({ key, contentType }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Presign HTTP ${res.status}`);
    }
    return res.json();
}
