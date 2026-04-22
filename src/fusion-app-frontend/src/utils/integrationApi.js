/**
 * Optional integration API (Stripe PI, Resend, S3 presign).
 * Base URL: VITE_INTEGRATION_API_URL, or Studio override (localStorage).
 */
import { LS_INTEGRATION_API_KEY, LS_INTEGRATION_API_URL } from './studioServicesConfig.js';

/**
 * Map raw API errors (e.g. empty body, "Not found", 404) to calm, actionable copy for the join flow.
 * @param {unknown} raw
 * @param {number} [status]
 * @returns {string}
 */
export function mapIntegrationUserMessage(raw, status) {
    const t = typeof raw === 'string' ? raw.trim() : String(raw || '').trim();
    if (!t || /^not found\.?$/i.test(t) || status === 404) {
        return 'Payment service could not be reached. Check Studio → Services (Integration API URL) and your connection, then try again.';
    }
    return t;
}

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

/** Pay-first: persisted until II link succeeds or a new checkout replaces it (`sessionStorage`). */
export const FUSION_PENDING_MEMBERSHIP_PAYLOAD_KEY = 'fusion-pending-membership-payload';

/**
 * Program application pay-first: debug/support snapshot in `sessionStorage` after card success
 * (`fusionPendingId`, `subscriptionId`, `email`, `programId`). The app does not read this key;
 * recovery if linking fails is via `readPendingPaymentEmailLocal('application')` / Studio sync-by-email.
 */
export const FUSION_PENDING_APPLICATION_SUB_KEY = 'fusion-pending-application-subscription';

/**
 * Pay-first join: billing email mirror in `localStorage` (survives new tabs; same device).
 * Cleared when membership link completes (`clearPendingPaymentEmailLocal('join')`).
 */
export const FUSION_LS_PENDING_PAYMENT_EMAIL_JOIN = 'fusion-pending-payment-email-join';

/** Program application payment email (separate key so join session clears do not wipe it). */
export const FUSION_LS_PENDING_PAYMENT_EMAIL_APPLICATION = 'fusion-pending-payment-email-application';

/**
 * @param {string} principalText
 * @returns {string}
 */
export function billingEmailStorageKeyForPrincipal(principalText) {
    return `fusion-billing-email:${String(principalText || '').trim()}`;
}

/**
 * Last Stripe customer email used in Studio → Users → Manage (per principal).
 * @param {string} principalText
 * @returns {string}
 */
export function studioStripeCheckEmailStorageKey(principalText) {
    return `fusion-studio-stripe-check-email:${String(principalText || '').trim()}`;
}

/**
 * @param {{ email: string, source?: 'join' | 'application', fusionPendingId?: string, subscriptionId?: string, programId?: string }} payload
 */
export function setPendingPaymentEmailLocal(payload) {
    try {
        const email = String(payload.email || '').trim();
        if (!email.includes('@')) return;
        const source = payload.source === 'application' ? 'application' : 'join';
        const key =
            source === 'application'
                ? FUSION_LS_PENDING_PAYMENT_EMAIL_APPLICATION
                : FUSION_LS_PENDING_PAYMENT_EMAIL_JOIN;
        localStorage.setItem(
            key,
            JSON.stringify({
                email,
                source,
                fusionPendingId: payload.fusionPendingId ? String(payload.fusionPendingId) : '',
                subscriptionId: payload.subscriptionId ? String(payload.subscriptionId) : '',
                programId: payload.programId ? String(payload.programId) : '',
                updatedAt: new Date().toISOString(),
            })
        );
    } catch {
        /* quota / private mode */
    }
}

/**
 * @param {'join' | 'application'} [source]
 * @returns {{ email: string, source: 'join' | 'application', fusionPendingId: string, subscriptionId: string, programId: string, updatedAt: string } | null}
 */
export function readPendingPaymentEmailLocal(source) {
    const keys =
        source === 'application'
            ? [FUSION_LS_PENDING_PAYMENT_EMAIL_APPLICATION]
            : source === 'join'
              ? [FUSION_LS_PENDING_PAYMENT_EMAIL_JOIN]
              : [FUSION_LS_PENDING_PAYMENT_EMAIL_JOIN, FUSION_LS_PENDING_PAYMENT_EMAIL_APPLICATION];
    for (const key of keys) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            const o = JSON.parse(raw);
            if (!o || typeof o.email !== 'string' || !o.email.includes('@')) continue;
            return {
                email: o.email.trim(),
                source: o.source === 'application' ? 'application' : 'join',
                fusionPendingId: typeof o.fusionPendingId === 'string' ? o.fusionPendingId : '',
                subscriptionId: typeof o.subscriptionId === 'string' ? o.subscriptionId : '',
                programId: typeof o.programId === 'string' ? o.programId : '',
                updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : '',
            };
        } catch {
            /* next */
        }
    }
    return null;
}

/**
 * @param {'join' | 'application' | 'all'} which
 */
export function clearPendingPaymentEmailLocal(which) {
    try {
        if (which === 'application') {
            localStorage.removeItem(FUSION_LS_PENDING_PAYMENT_EMAIL_APPLICATION);
        } else if (which === 'join') {
            localStorage.removeItem(FUSION_LS_PENDING_PAYMENT_EMAIL_JOIN);
        } else {
            localStorage.removeItem(FUSION_LS_PENDING_PAYMENT_EMAIL_JOIN);
            localStorage.removeItem(FUSION_LS_PENDING_PAYMENT_EMAIL_APPLICATION);
        }
    } catch {
        /* ignore */
    }
}

/**
 * Billing email used at Stripe checkout for this Internet Identity principal (client hint; same browser).
 * @param {string} principalText
 * @param {string} email
 */
export function setStoredBillingEmailForPrincipal(principalText, email) {
    const p = String(principalText || '').trim();
    const em = String(email || '').trim();
    if (!p || !em.includes('@')) return;
    try {
        localStorage.setItem(billingEmailStorageKeyForPrincipal(p), em);
    } catch {
        /* ignore */
    }
}

/**
 * @param {string} principalText
 * @returns {string}
 */
export function getStoredBillingEmailForPrincipal(principalText) {
    try {
        const v = localStorage.getItem(billingEmailStorageKeyForPrincipal(principalText));
        return typeof v === 'string' && v.includes('@') ? v.trim() : '';
    } catch {
        return '';
    }
}

/**
 * Persist pay-first link ids so refresh before Internet Identity does not strand the user.
 *
 * @param {{ fusionPendingId: string, email: string, subscriptionId?: string | null, paymentCompleted?: boolean }} p
 */
export function savePendingMembershipPayload(p) {
    try {
        const o = {
            fusionPendingId: String(p.fusionPendingId || '').trim(),
            email: String(p.email || '').trim(),
            subscriptionId: p.subscriptionId ? String(p.subscriptionId).trim() : '',
            paymentCompleted: Boolean(p.paymentCompleted),
        };
        if (!o.fusionPendingId) return;
        sessionStorage.setItem(FUSION_PENDING_MEMBERSHIP_PAYLOAD_KEY, JSON.stringify(o));
        if (o.email.includes('@')) {
            setPendingPaymentEmailLocal({
                email: o.email,
                source: 'join',
                fusionPendingId: o.fusionPendingId,
                subscriptionId: o.subscriptionId || '',
            });
        }
    } catch {
        /* quota / private mode */
    }
}

/** @returns {{ fusionPendingId: string, email: string, subscriptionId: string | null, paymentCompleted: boolean } | null} */
export function readPendingMembershipPayload() {
    try {
        const raw = sessionStorage.getItem(FUSION_PENDING_MEMBERSHIP_PAYLOAD_KEY);
        if (!raw) return null;
        const o = JSON.parse(raw);
        if (!o || typeof o.fusionPendingId !== 'string' || !o.fusionPendingId.trim()) return null;
        return {
            fusionPendingId: o.fusionPendingId.trim(),
            email: typeof o.email === 'string' ? o.email : '',
            subscriptionId: o.subscriptionId ? String(o.subscriptionId).trim() : null,
            paymentCompleted: Boolean(o.paymentCompleted),
        };
    } catch {
        return null;
    }
}

export function clearPendingMembershipPayload() {
    try {
        sessionStorage.removeItem(FUSION_PENDING_MEMBERSHIP_PAYLOAD_KEY);
    } catch {
        /* ignore */
    }
}

/** Call after card payment succeeds, before the link-account stage. */
export function markPendingMembershipPaymentCompleted() {
    const cur = readPendingMembershipPayload();
    if (!cur) return;
    savePendingMembershipPayload({ ...cur, paymentCompleted: true });
}

/**
 * Create a Stripe Subscription (bi-monthly Price) and return the first invoice PaymentIntent client secret.
 * Omit `principal` for **pay-first** checkout: response includes `fusionPendingId` until the user links II.
 * @param {{ principal?: string, email: string, metadata?: Record<string, string>, payFirst?: boolean, subscriptionTier?: 'bimonthly' | 'annual' }} opts
 * @returns {Promise<{ clientSecret: string, subscriptionId: string, customerId: string, fusionPendingId?: string }>}
 */
export async function createSubscription(opts) {
    const principal = opts?.principal;
    const payFirst = opts?.payFirst === true;
    const email = opts?.email;
    const metadata = opts?.metadata && typeof opts.metadata === 'object' ? opts.metadata : {};
    if (typeof email !== 'string' || !email.includes('@')) {
        throw new Error('valid email required');
    }
    const base = getIntegrationBaseUrl();
    if (!base) {
        throw new Error('Integration API URL not configured.');
    }
    /** @type {Record<string, string | boolean | Record<string, string>>} */
    const body = {
        email: email.trim(),
        metadata,
    };
    const tier = opts?.subscriptionTier;
    if (tier === 'annual' || tier === 'bimonthly') {
        body.subscriptionTier = tier;
    }
    if (payFirst) {
        body.payFirst = true;
    } else if (typeof principal === 'string' && principal.trim()) {
        body.principal = principal.trim();
    }
    const res = await fetch(`${base}/stripe/create-subscription`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = typeof err.error === 'string' ? err.error : '';
        if (msg === 'principal required' || /principal required/i.test(msg)) {
            throw new Error(
                'Payment service is an older build: redeploy fusion-integration-api (pay-first needs POST /stripe/create-subscription without principal). Check VITE_INTEGRATION_API_URL / Studio → Services points at the updated server.'
            );
        }
        throw new Error(mapIntegrationUserMessage(msg || `Create subscription HTTP ${res.status}`, res.status));
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
        const raw = typeof err.error === 'string' ? err.error : '';
        throw new Error(mapIntegrationUserMessage(raw || `Link subscription HTTP ${res.status}`, res.status));
    }
    return res.json();
}

/**
 * Ask the integration API to load this principal’s Stripe subscription and update the canister.
 * No-ops when integration URL is missing; logs warnings on failure (safe after login).
 * @param {string} principalText
 * @returns {Promise<{ synced?: boolean; reason?: string; status?: string } | undefined>}
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
            return { synced: false, reason: detail };
        }
        return await res.json();
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('[Fusion] sync-subscription failed:', e);
        return { synced: false, reason: msg };
    }
}

/**
 * Push subscription for the Stripe customer at `email` to the canister with `metadata.principal`.
 * Use when the customer was found by email but not by `metadata['principal']`.
 * @param {string} email
 * @param {string} principalText
 * @returns {Promise<{ synced?: boolean; reason?: string; status?: string } | undefined>}
 */
export async function syncSubscriptionFromStripeByEmail(email, principalText) {
    const em = String(email ?? '').trim();
    const pr = String(principalText ?? '').trim();
    if (!em.includes('@') || !pr) {
        return undefined;
    }
    const base = getIntegrationBaseUrl();
    if (!base) {
        return undefined;
    }
    try {
        const res = await fetch(`${base}/stripe/sync-subscription-by-email`, {
            method: 'POST',
            headers: integrationHeadersJson(),
            body: JSON.stringify({ email: em, principal: pr }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const detail = typeof err.error === 'string' ? err.error : `HTTP ${res.status}`;
            console.warn('[Fusion] sync-subscription-by-email:', detail);
            return { synced: false, reason: detail };
        }
        return await res.json();
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('[Fusion] sync-subscription-by-email failed:', e);
        return { synced: false, reason: msg };
    }
}

/**
 * Studio / admin: live Stripe subscription status for an email (integration API; API key).
 * @param {string} email
 * @returns {Promise<
 *   | { ok: true; membershipActive: boolean; reason?: string; customerId?: string; subscriptionId?: string; subscriptionStatus: string | null; cancelAtPeriodEnd?: boolean }
 *   | { ok: false; error?: string; reason?: string }
 * >}
 */
export async function fetchStripeSubscriptionStatusByEmail(email) {
    const trimmed = String(email ?? '').trim();
    if (!trimmed.includes('@')) {
        return { ok: false, reason: 'invalid_email' };
    }
    const base = getIntegrationBaseUrl();
    if (!base) {
        return { ok: false, reason: 'no_integration_url' };
    }
    try {
        const res = await fetch(`${base}/stripe/subscription-status-by-email`, {
            method: 'POST',
            headers: integrationHeadersJson(),
            body: JSON.stringify({ email: trimmed }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const raw = typeof data.error === 'string' ? data.error : `HTTP ${res.status}`;
            return { ok: false, error: raw };
        }
        return data;
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
}

/**
 * @param {string} principalText
 * @param {string} returnUrl Absolute URL (e.g. window.location.href)
 * @returns {Promise<{ url: string }>}
 */
export async function createBillingPortalSession(principalText, returnUrl) {
    if (typeof principalText !== 'string' || !principalText.trim()) {
        throw new Error('principal required');
    }
    if (typeof returnUrl !== 'string' || !returnUrl.startsWith('http')) {
        throw new Error('return URL required');
    }
    const base = getIntegrationBaseUrl();
    if (!base) {
        throw new Error('Integration API URL not configured.');
    }
    const res = await fetch(`${base}/stripe/billing-portal-session`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify({ principal: principalText.trim(), returnUrl: returnUrl.trim() }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const raw = typeof err.error === 'string' ? err.error : '';
        throw new Error(mapIntegrationUserMessage(raw || `Billing portal HTTP ${res.status}`, res.status));
    }
    const data = await res.json();
    if (!data.url) throw new Error('Invalid billing portal response');
    return data;
}

/**
 * @param {string} principalText
 * @returns {Promise<Record<string, unknown>>}
 */
export async function fetchMemberBillingSummary(principalText) {
    if (typeof principalText !== 'string' || !principalText.trim()) {
        return { ok: false, reason: 'invalid_principal' };
    }
    const base = getIntegrationBaseUrl();
    if (!base) {
        return { ok: false, reason: 'no_integration_url' };
    }
    try {
        const res = await fetch(`${base}/stripe/member-billing-summary`, {
            method: 'POST',
            headers: integrationHeadersJson(),
            body: JSON.stringify({ principal: principalText.trim() }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const raw = typeof err.error === 'string' ? err.error : `HTTP ${res.status}`;
            return { ok: false, reason: raw };
        }
        return await res.json();
    } catch (e) {
        return { ok: false, reason: e instanceof Error ? e.message : String(e) };
    }
}

/**
 * @param {string} principalText
 * @returns {Promise<{ ok: boolean, cancelAtPeriodEnd?: boolean, subscriptionId?: string }>}
 */
export async function cancelSubscriptionAtPeriodEnd(principalText) {
    if (typeof principalText !== 'string' || !principalText.trim()) {
        throw new Error('principal required');
    }
    const base = getIntegrationBaseUrl();
    if (!base) {
        throw new Error('Integration API URL not configured.');
    }
    const res = await fetch(`${base}/stripe/cancel-subscription-at-period-end`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify({ principal: principalText.trim() }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const raw = typeof err.error === 'string' ? err.error : '';
        throw new Error(mapIntegrationUserMessage(raw || `Cancel subscription HTTP ${res.status}`, res.status));
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
        const raw = typeof err.error === 'string' ? err.error : '';
        throw new Error(mapIntegrationUserMessage(raw || `Payment intent HTTP ${res.status}`, res.status));
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
