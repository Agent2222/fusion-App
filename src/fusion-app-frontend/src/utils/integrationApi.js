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
        throw new Error(err.error || `Email HTTP ${res.status}`);
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
