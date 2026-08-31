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
export function integrationHeadersJson() {
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
 * Resend config from server: default `from` and optional broadcast `segmentId` (see `RESEND_BROADCAST_SEGMENT_ID`).
 * @returns {Promise<{ from: string | null, segmentId: string | null }>}
 */
export async function fetchResendMeta() {
    const base = getIntegrationBaseUrl();
    if (!base) {
        throw new Error('Integration API URL not configured.');
    }
    const res = await fetch(`${base}/resend/sender`, { method: 'GET', headers: integrationHeadersJson() });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = typeof err.error === 'string' ? err.error : `HTTP ${res.status}`;
        throw new Error(msg);
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

/** True while pay-first join is waiting for Internet Identity link (same tab / explicit resume). */
export function hasActiveJoinMembershipLinkSession() {
    try {
        return sessionStorage.getItem(FUSION_PENDING_MEMBERSHIP_LINK_KEY) === '1';
    } catch {
        return false;
    }
}

/** Clear pay-first join recovery keys (session + localStorage mirror). */
export function clearJoinPendingMembershipStorage() {
    clearPendingMembershipPayload();
    clearPendingPaymentEmailLocal('join');
    try {
        sessionStorage.removeItem(FUSION_PENDING_MEMBERSHIP_LINK_KEY);
    } catch {
        /* ignore */
    }
}

/** @returns {{ fusionPendingId: string, email: string, subscriptionId: string | null, paymentCompleted: boolean } | null} */
export function readPendingMembershipPayload() {
    try {
        const raw = sessionStorage.getItem(FUSION_PENDING_MEMBERSHIP_PAYLOAD_KEY);
        if (raw) {
            const o = JSON.parse(raw);
            if (o && typeof o.fusionPendingId === 'string' && o.fusionPendingId.trim()) {
                return {
                    fusionPendingId: o.fusionPendingId.trim(),
                    email: typeof o.email === 'string' ? o.email : '',
                    subscriptionId: o.subscriptionId ? String(o.subscriptionId).trim() : null,
                    paymentCompleted: Boolean(o.paymentCompleted),
                };
            }
        }
    } catch {
        /* fall through to localStorage */
    }
    // localStorage alone can linger after abandoned flows — require an active link session.
    if (!hasActiveJoinMembershipLinkSession()) return null;
    const ls = readPendingPaymentEmailLocal('join');
    if (!ls?.fusionPendingId) return null;
    return {
        fusionPendingId: ls.fusionPendingId.trim(),
        email: ls.email,
        subscriptionId: ls.subscriptionId ? String(ls.subscriptionId).trim() : null,
        paymentCompleted: true,
    };
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
    let cur = readPendingMembershipPayload();
    if (!cur) {
        const ls = readPendingPaymentEmailLocal('join');
        if (ls?.fusionPendingId) {
            cur = {
                fusionPendingId: ls.fusionPendingId.trim(),
                email: ls.email,
                subscriptionId: ls.subscriptionId ? String(ls.subscriptionId).trim() : null,
                paymentCompleted: true,
            };
        }
    }
    if (!cur) return;
    savePendingMembershipPayload({ ...cur, paymentCompleted: true });
}

/**
 * Create a Stripe Subscription (bi-monthly Price) and return the first invoice PaymentIntent client secret.
 * Omit `principal` for **pay-first** checkout: response includes `fusionPendingId` until the user links II.
 * @param {{ principal?: string, email: string, metadata?: Record<string, string>, payFirst?: boolean, subscriptionTier?: 'monthly' | 'quarterly' | 'annual' | 'bimonthly' }} opts
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
    if (tier === 'annual' || tier === 'quarterly' || tier === 'monthly' || tier === 'bimonthly') {
        body.subscriptionTier = tier;
    }
    if (payFirst) {
        body.payFirst = true;
    } else if (typeof principal === 'string' && principal.trim()) {
        body.principal = principal.trim();
    }
    const promoCode = typeof opts?.promoCode === 'string' ? opts.promoCode.trim() : '';
    if (promoCode) {
        body.promoCode = promoCode;
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
 * After canister account recovery / reconnect, refresh Stripe + PayPal to the new principal.
 * @param {{ principal: string, email?: string, paypalSubscriptionId?: string }} opts
 */
export async function syncMembershipAfterAccountRecovery(opts) {
    const pr = String(opts?.principal ?? '').trim();
    const em = String(opts?.email ?? '').trim();
    const paypalId = String(opts?.paypalSubscriptionId ?? '').trim();
    /** @type {{ stripe: unknown, paypal: unknown }} */
    const out = { stripe: null, paypal: null };
    if (em.includes('@')) {
        out.stripe = await syncSubscriptionFromStripeByEmail(em, pr);
    } else if (pr) {
        out.stripe = await syncSubscriptionFromStripe(pr);
    }
    if (paypalId && pr) {
        try {
            out.paypal = await syncPayPalSubscription({ principal: pr, subscriptionId: paypalId });
        } catch (e) {
            out.paypal = {
                synced: false,
                error: e instanceof Error ? e.message : String(e),
            };
        }
    }
    return out;
}

/**
 * Studio admin: lookup paid membership hints by checkout email.
 * @param {string} email
 * @param {string} [paypalSubscriptionId]
 */
export async function accountLookupByEmailForStudio(email, paypalSubscriptionId = '') {
    const em = String(email ?? '').trim();
    if (!em.includes('@')) {
        throw new Error('valid email required');
    }
    const base = getIntegrationBaseUrl();
    if (!base) {
        throw new Error('Integration API URL not configured.');
    }
    /** @type {Record<string, string>} */
    const body = { email: em };
    const ppSub = String(paypalSubscriptionId ?? '').trim();
    if (ppSub) body.paypalSubscriptionId = ppSub;
    const res = await fetch(`${base}/account/lookup-by-email`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : `HTTP ${res.status}`);
    }
    return data;
}

/**
 * Studio admin: preview reconnecting member account to a new II principal.
 * @param {{ email?: string, fromPrincipal: string, toPrincipal: string }} opts
 */
export async function accountReconnectPreviewForStudio(opts) {
    const base = getIntegrationBaseUrl();
    if (!base) {
        throw new Error('Integration API URL not configured.');
    }
    const res = await fetch(`${base}/account/reconnect/preview`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify({
            email: String(opts?.email ?? '').trim(),
            fromPrincipal: String(opts?.fromPrincipal ?? '').trim(),
            toPrincipal: String(opts?.toPrincipal ?? '').trim(),
        }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : `HTTP ${res.status}`);
    }
    return data;
}

/**
 * Studio admin: migrate member row + refresh Stripe/PayPal subscription on new principal.
 * @param {{ fromPrincipal: string, toPrincipal: string, email?: string, paypalSubscriptionId?: string }} opts
 */
export async function accountReconnectCompleteForStudio(opts) {
    const base = getIntegrationBaseUrl();
    if (!base) {
        throw new Error('Integration API URL not configured.');
    }
    const res = await fetch(`${base}/account/reconnect/complete`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify({
            fromPrincipal: String(opts?.fromPrincipal ?? '').trim(),
            toPrincipal: String(opts?.toPrincipal ?? '').trim(),
            email: String(opts?.email ?? '').trim(),
            paypalSubscriptionId: String(opts?.paypalSubscriptionId ?? '').trim(),
        }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const code = typeof data.code === 'string' ? data.code : '';
        const err = typeof data.error === 'string' ? data.error : `HTTP ${res.status}`;
        throw new Error(code ? `${code}: ${err}` : err);
    }
    return data;
}

/**
 * Studio / admin: fetch safe Stripe customer contact fields for account rows matched by metadata.principal.
 * @param {string[]} principals
 * @returns {Promise<{ ok?: boolean, contacts?: Array<{ principal: string, email?: string, fullName?: string, firstName?: string, lastName?: string, customerId?: string }>, failures?: Array<{ principal: string, reason: string }> }>}
 */
export async function fetchStripeAccountContactsForPrincipals(principals) {
    const list = Array.isArray(principals)
        ? [...new Set(principals.map((p) => String(p || '').trim()).filter(Boolean))]
        : [];
    if (!list.length) return { ok: true, contacts: [], failures: [] };
    const base = getIntegrationBaseUrl();
    if (!base) {
        return { ok: false, contacts: [], failures: list.map((principal) => ({ principal, reason: 'no_integration_url' })) };
    }
    const res = await fetch(`${base}/stripe/account-contacts-by-principal`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify({ principals: list }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = typeof err.error === 'string' ? err.error : `HTTP ${res.status}`;
        throw new Error(detail);
    }
    return await res.json();
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
 * @param {{ subscriptionId?: string, provider?: string }} [opts]
 * @returns {Promise<Record<string, unknown>>}
 */
export async function fetchMemberBillingSummary(principalText, opts = {}) {
    if (typeof principalText !== 'string' || !principalText.trim()) {
        return { ok: false, reason: 'invalid_principal' };
    }
    const base = getIntegrationBaseUrl();
    if (!base) {
        return { ok: false, reason: 'no_integration_url' };
    }
    const subscriptionId = String(opts.subscriptionId || '').trim();
    const providerHint = String(opts.provider || '').toLowerCase();
    const preferPayPal = providerHint === 'paypal' || Boolean(subscriptionId);

    if (preferPayPal && subscriptionId) {
        try {
            const res = await fetch(`${base}/payments/member-billing-summary`, {
                method: 'POST',
                headers: integrationHeadersJson(),
                body: JSON.stringify({
                    principal: principalText.trim(),
                    subscriptionId,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data && data.ok) return data;
            if (providerHint === 'paypal') {
                return {
                    ok: false,
                    reason:
                        typeof data.reason === 'string'
                            ? data.reason
                            : typeof data.error === 'string'
                              ? data.error
                              : `HTTP ${res.status}`,
                };
            }
        } catch (e) {
            if (providerHint === 'paypal') {
                return { ok: false, reason: e instanceof Error ? e.message : String(e) };
            }
        }
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
 * PayPal subscription revise (plan change). Buyer must approve via returned URL.
 * @param {{ principal: string, targetTier: 'monthly'|'quarterly'|'annual', subscriptionId?: string, returnUrl?: string, cancelUrl?: string }} body
 * @returns {Promise<{ approveUrl: string, targetTier?: string, planId?: string }>}
 */
export async function revisePayPalSubscription(body) {
    const principal = String(body?.principal || '').trim();
    const targetTier = String(body?.targetTier || '').trim().toLowerCase();
    const subscriptionId = String(body?.subscriptionId || '').trim();
    const returnUrl = String(body?.returnUrl || '').trim();
    const cancelUrl = String(body?.cancelUrl || '').trim();
    if (!principal) throw new Error('principal required');
    if (!['monthly', 'quarterly', 'annual'].includes(targetTier)) {
        throw new Error('targetTier must be monthly, quarterly, or annual');
    }
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const res = await fetch(`${base}/payments/subscription/revise`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify({
            principal,
            targetTier,
            ...(subscriptionId ? { subscriptionId } : {}),
            ...(returnUrl ? { returnUrl } : {}),
            ...(cancelUrl ? { cancelUrl } : {}),
        }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const raw = typeof data.error === 'string' ? data.error : `Revise HTTP ${res.status}`;
        throw new Error(mapIntegrationUserMessage(raw, res.status));
    }
    if (!data.approveUrl) throw new Error('PayPal revise did not return an approve URL');
    return data;
}

/**
 * Studio Finance: aggregate active/trialing membership subscription revenue from Stripe.
 * @returns {Promise<Record<string, unknown>>}
 */
export async function fetchMembershipRevenueSummary() {
    const base = getIntegrationBaseUrl();
    if (!base) {
        return { ok: false, reason: 'no_integration_url' };
    }
    try {
        const res = await fetch(`${base}/stripe/membership-revenue-summary`, {
            method: 'POST',
            headers: integrationHeadersJson(),
            body: JSON.stringify({}),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const raw = typeof data.error === 'string' ? data.error : `HTTP ${res.status}`;
            return { ok: false, reason: raw };
        }
        return data;
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

function programPaymentBody(opts = {}) {
    return {
        principal: String(opts.principal || '').trim(),
        programId: String(opts.programId || '').trim(),
        applicationId: String(opts.applicationId || '').trim(),
        email: String(opts.email || '').trim(),
        applicantName: String(opts.applicantName || opts.fullName || '').trim(),
        amountCents: Math.round(Number(opts.amountCents || 0)),
        totalDueCents: Math.round(Number(opts.totalDueCents || 0)),
        depositAmountCents: Math.round(Number(opts.depositAmountCents || 0)),
        ownFlight: opts.ownFlight === true,
        flightCreditCents: Math.round(Number(opts.flightCreditCents || 0)),
    };
}

/**
 * @param {{ principal: string, programId: string, applicationId: string, paymentType: 'deposit' | 'full_payment' | 'manual', amountCents: number, totalDueCents: number, depositAmountCents: number, email?: string, applicantName?: string, ownFlight?: boolean, flightCreditCents?: number }} opts
 * @returns {Promise<{ clientSecret: string, paymentIntentId: string }>}
 */
export async function createProgramPaymentIntent(opts) {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const res = await fetch(`${base}/stripe/program-payment-intent`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify({
            ...programPaymentBody(opts),
            paymentType: opts.paymentType,
        }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const raw = typeof err.error === 'string' ? err.error : '';
        throw new Error(mapIntegrationUserMessage(raw || `Program payment HTTP ${res.status}`, res.status));
    }
    const data = await res.json();
    if (!data.clientSecret || !data.paymentIntentId) {
        throw new Error('Invalid program payment response');
    }
    return data;
}

/**
 * @param {string} paymentIntentId
 */
export async function confirmProgramPaymentRecorded(paymentIntentId) {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const res = await fetch(`${base}/stripe/program-payment-confirmed`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify({ paymentIntentId: String(paymentIntentId || '').trim() }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const raw = typeof err.error === 'string' ? err.error : '';
        throw new Error(mapIntegrationUserMessage(raw || `Program payment confirm HTTP ${res.status}`, res.status));
    }
    return res.json();
}

/**
 * @param {{ principal: string, email?: string, programId: string, applicationId: string, installmentCount: number, installmentAmountCents: number, totalDueCents: number, depositAmountCents: number, ownFlight?: boolean, flightCreditCents?: number, planStartAt?: string, planEndAt?: string }} opts
 * @returns {Promise<{ clientSecret: string, paymentIntentId: string, subscriptionId: string, planId: string }>}
 */
export async function createProgramPaymentPlan(opts) {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const res = await fetch(`${base}/stripe/program-payment-plan`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify({
            ...programPaymentBody({
                ...opts,
                amountCents: opts.installmentAmountCents,
            }),
            email: String(opts.email || '').trim(),
            installmentCount: Math.round(Number(opts.installmentCount || 0)),
            installmentAmountCents: Math.round(Number(opts.installmentAmountCents || 0)),
            planStartAt: String(opts.planStartAt || '').trim(),
            planEndAt: String(opts.planEndAt || '').trim(),
        }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const raw = typeof err.error === 'string' ? err.error : '';
        throw new Error(mapIntegrationUserMessage(raw || `Payment plan HTTP ${res.status}`, res.status));
    }
    const data = await res.json();
    if (!data.clientSecret || !data.paymentIntentId || !data.subscriptionId || !data.planId) {
        throw new Error('Invalid payment plan response');
    }
    return data;
}

/**
 * @param {{ planId: string, subscriptionId?: string }} opts
 */
export async function cancelProgramPaymentPlan(opts) {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const res = await fetch(`${base}/stripe/program-payment-plan-cancel`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify({
            planId: String(opts?.planId || '').trim(),
            subscriptionId: String(opts?.subscriptionId || '').trim(),
        }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const raw = typeof err.error === 'string' ? err.error : '';
        throw new Error(mapIntegrationUserMessage(raw || `Cancel payment plan HTTP ${res.status}`, res.status));
    }
    return res.json();
}

/**
 * @param {string[]} paymentIntentIds
 * @returns {Promise<{ ok?: boolean, receipts?: Array<{ paymentIntentId: string, receiptUrl: string, chargeId: string }> }>}
 */
export async function fetchProgramPaymentReceipts(paymentIntentIds) {
    const ids = Array.isArray(paymentIntentIds) ? paymentIntentIds.map((x) => String(x || '').trim()).filter(Boolean) : [];
    const base = getIntegrationBaseUrl();
    if (!base || !ids.length) return { ok: false, receipts: [] };
    const res = await fetch(`${base}/stripe/program-payment-receipts`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify({ paymentIntentIds: ids }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const raw = typeof err.error === 'string' ? err.error : '';
        throw new Error(mapIntegrationUserMessage(raw || `Payment receipts HTTP ${res.status}`, res.status));
    }
    return res.json();
}

// ——— PayPal (primary — all new checkouts) ———

/**
 * @returns {Promise<{ provider: string, paypalClientId: string, mode: string, configured?: boolean }>}
 */
export async function fetchPaymentConfig() {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const res = await fetch(`${base}/payments/config`, { method: 'GET' });
    if (!res.ok) throw new Error(`Payment config HTTP ${res.status}`);
    return res.json();
}

/**
 * @param {object} body
 * @returns {Promise<{ orderId: string, provider?: string }>}
 */
export async function createPayPalOneTimePayment(body) {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const res = await fetch(`${base}/payments/one-time`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(mapIntegrationUserMessage(err.error || `PayPal one-time HTTP ${res.status}`, res.status));
    }
    return res.json();
}

/**
 * @param {string} orderId
 * @param {{
 *   principal?: string,
 *   programId?: string,
 *   applicationId?: string,
 *   paymentType?: string,
 *   payloadJson?: string,
 *   payload?: Record<string, unknown>,
 * }} [opts] Optional meta for guest pay-first (Program Draw) confirm after II login.
 */
export async function confirmPayPalOneTimePayment(orderId, opts = {}) {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const payloadJson =
        typeof opts.payloadJson === 'string'
            ? opts.payloadJson
            : opts.payload && typeof opts.payload === 'object'
              ? JSON.stringify(opts.payload)
              : undefined;
    const res = await fetch(`${base}/payments/one-time/confirm`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify({
            orderId,
            ...(opts.principal ? { principal: opts.principal } : {}),
            ...(opts.programId ? { programId: opts.programId } : {}),
            ...(opts.applicationId ? { applicationId: opts.applicationId } : {}),
            ...(opts.paymentType ? { paymentType: opts.paymentType } : {}),
            ...(payloadJson ? { payloadJson } : {}),
        }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(mapIntegrationUserMessage(err.error || `PayPal confirm HTTP ${res.status}`, res.status));
    }
    return res.json();
}

/**
 * Staff/ops: re-import a completed PayPal program payment onto the Motoko ledger.
 * Does not sync Stripe membership subscriptions.
 * @param {{
 *   orderId?: string,
 *   captureId?: string,
 *   transactionId?: string,
 *   principal: string,
 *   programId: string,
 *   applicationId: string,
 *   paymentType: string,
 *   totalDueCents?: number,
 *   depositAmountCents?: number,
 *   ownFlight?: boolean,
 *   flightCreditCents?: number,
 *   applicantEmail?: string,
 *   email?: string,
 *   applicantName?: string,
 *   fullName?: string,
 *   payloadJson?: string,
 *   payload?: Record<string, unknown>,
 *   currentQuarterKey?: string,
 * }} body
 */
export async function repairPayPalProgramPayment(body) {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const payloadJson =
        typeof body.payloadJson === 'string'
            ? body.payloadJson
            : body.payload && typeof body.payload === 'object'
              ? JSON.stringify(body.payload)
              : undefined;
    const res = await fetch(`${base}/payments/paypal/repair`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify({
            ...body,
            ...(payloadJson ? { payloadJson } : {}),
        }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
            mapIntegrationUserMessage(err.error || `PayPal repair HTTP ${res.status}`, res.status),
        );
    }
    return res.json();
}

/**
 * Validate a promo / invite / partner code via the Integration API.
 * @param {string} code
 * @returns {Promise<{ valid: boolean, reason?: string, code?: string, codeType?: string, discountType?: { type: string, value: number }, discountDurationMonths?: number, displayText?: string, discountedPlanIds?: Record<string, string> }>}
 */
export async function validatePromoCode(code) {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const res = await fetch(`${base}/payments/validate-promo-code`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify({ code: (code || '').trim() }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { valid: false, reason: err.reason || `HTTP ${res.status}` };
    }
    return res.json();
}

/**
 * @param {{ principal?: string, email: string, metadata?: Record<string, string>, payFirst?: boolean, subscriptionTier?: 'monthly' | 'monthly_application' | 'quarterly' | 'annual' | 'bimonthly', promoCode?: string }} opts
 */
export async function createPayPalSubscription(opts) {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const body = {
        email: opts.email.trim(),
        metadata: opts.metadata || {},
        payFirst: opts.payFirst === true,
        subscriptionTier: opts.subscriptionTier,
        principal: opts.principal,
    };
    const promoCode = typeof opts?.promoCode === 'string' ? opts.promoCode.trim() : '';
    if (promoCode) {
        body.promoCode = promoCode;
    }
    const res = await fetch(`${base}/payments/subscription`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(mapIntegrationUserMessage(err.error || `PayPal subscription HTTP ${res.status}`, res.status));
    }
    return res.json();
}

/**
 * @param {{ fusionPendingId: string, email: string, principal: string, subscriptionId: string }} opts
 */
export async function linkPayPalSubscriptionToPrincipal(opts) {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const res = await fetch(`${base}/payments/subscription/link`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify(opts),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(mapIntegrationUserMessage(err.error || `PayPal link HTTP ${res.status}`, res.status));
    }
    return res.json();
}

/**
 * @param {{ principal: string, subscriptionId: string }} opts
 */
export async function syncPayPalSubscription(opts) {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const res = await fetch(`${base}/payments/subscription/sync`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify(opts),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(mapIntegrationUserMessage(err.error || `PayPal sync HTTP ${res.status}`, res.status));
    }
    return res.json();
}

/**
 * Studio Live PayPal check (no canister write).
 * @param {string} subscriptionId
 * @returns {Promise<{
 *   ok?: boolean,
 *   membershipActive?: boolean,
 *   status?: string,
 *   subscriptionId?: string,
 *   planId?: string,
 *   tier?: string,
 *   subscriberEmail?: string | null,
 *   error?: string,
 *   reason?: string,
 * }>}
 */
export async function fetchPayPalSubscriptionStatus(subscriptionId) {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const sid = String(subscriptionId || '').trim();
    if (!sid) throw new Error('PayPal subscription id required.');
    const res = await fetch(`${base}/payments/subscription/status`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify({ subscriptionId: sid }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(
            mapIntegrationUserMessage(
                data.error || data.reason || `PayPal status HTTP ${res.status}`,
                res.status,
            ),
        );
    }
    return data;
}

/**
 * @param {string} subscriptionId
 */
export async function cancelPayPalSubscriptionAtPeriodEnd(subscriptionId) {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const res = await fetch(`${base}/payments/subscription/cancel`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify({ subscriptionId }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(mapIntegrationUserMessage(err.error || `PayPal cancel HTTP ${res.status}`, res.status));
    }
    return res.json();
}

/**
 * Cancel Stripe + PayPal platform membership after program deposit / confirm.
 * @param {string} principalText
 * @returns {Promise<{ ok: boolean, stripe?: object, paypal?: object }>}
 */
export async function cancelPlatformSubscriptionForProgramConfirm(principalText) {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const principal = String(principalText || '').trim();
    if (!principal) throw new Error('principal required');
    const res = await fetch(`${base}/payments/subscription/cancel-for-program`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify({ principal }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
            mapIntegrationUserMessage(
                err.error || `Cancel-for-program HTTP ${res.status}`,
                res.status,
            ),
        );
    }
    return res.json();
}

/**
 * @param {object} body
 */
export async function createPayPalProgramPaymentPlan(body) {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const res = await fetch(`${base}/payments/plan`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(mapIntegrationUserMessage(err.error || `PayPal plan HTTP ${res.status}`, res.status));
    }
    return res.json();
}

/**
 * @param {{ subscriptionId: string, planId?: string }} opts
 */
export async function cancelPayPalProgramPaymentPlan(opts) {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const res = await fetch(`${base}/payments/plan/cancel`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify(opts),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(mapIntegrationUserMessage(err.error || `PayPal plan cancel HTTP ${res.status}`, res.status));
    }
    return res.json();
}

/**
 * @param {string[]} orderIds
 */
export async function fetchPayPalPaymentReceipts(orderIds) {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const res = await fetch(`${base}/payments/receipts`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify({ orderIds }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(mapIntegrationUserMessage(err.error || `PayPal receipts HTTP ${res.status}`, res.status));
    }
    return res.json();
}

/**
 * @param {{ to: string, subject: string, html?: string, text?: string, replyTo?: string, from?: string, cc?: string | string[], attachments?: Array<{ filename?: string, content?: string, contentType?: string }> }} opts
 */
/**
 * Push text to a program LINE room bound in Studio Comms.
 * @param {{ programId: string, room: 'general' | 'announce', text: string }} opts
 */
export async function sendLineGroupMessage(opts) {
    const base = getIntegrationBaseUrl();
    if (!base) {
        throw new Error('Integration API URL not configured.');
    }
    const res = await fetch(`${base}/line/push`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify({
            programId: String(opts?.programId || '').trim(),
            room: String(opts?.room || '').trim(),
            text: String(opts?.text || ''),
        }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
            typeof err.error === 'string' && err.error
                ? err.error
                : `LINE push failed (HTTP ${res.status}).`,
        );
    }
    return res.json();
}

/**
 * @param {{ to: string, subject: string, html?: string, text?: string, replyTo?: string, from?: string, cc?: string | string[], attachments?: Array<{ filename?: string, content?: string, contentType?: string }> }} opts
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
 * @param {Array<{ to: string, subject: string, html?: string, text?: string }>} messages
 * @param {{ from?: string, replyTo?: string, cc?: string | string[], attachments?: Array<{ filename?: string, content?: string, contentType?: string }> }} [opts]
 * @returns {Promise<{ ok?: boolean, okCount?: number, failCount?: number, results?: unknown, cc?: string[] }>}
 */
export async function sendEmailBatch(messages, opts = {}) {
    const base = getIntegrationBaseUrl();
    if (!base) {
        throw new Error('Integration API URL not configured.');
    }
    const res = await fetch(`${base}/email/batch`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify({
            messages,
            ...(opts.from ? { from: opts.from } : {}),
            ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
            ...(opts.cc != null ? { cc: opts.cc } : {}),
            ...(opts.attachments != null ? { attachments: opts.attachments } : {}),
        }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = typeof err.error === 'string' ? err.error : '';
        throw new Error(
            detail || `Email batch failed (HTTP ${res.status}). Check Integration API and Resend.`,
        );
    }
    return res.json();
}

/**
 * @returns {Promise<unknown>}
 */
export async function resendListTemplates() {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const res = await fetch(`${base}/resend/templates`, { method: 'GET', headers: integrationHeadersJson() });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : `HTTP ${res.status}`);
    }
    return res.json();
}

/**
 * @param {Record<string, unknown>} body
 */
export async function resendCreateTemplate(body) {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const res = await fetch(`${base}/resend/templates`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : `HTTP ${res.status}`);
    }
    return res.json();
}

/**
 * @param {Record<string, unknown>} body
 */
export async function resendCreateSegment(body) {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const res = await fetch(`${base}/resend/segments`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : `HTTP ${res.status}`);
    }
    return res.json();
}

/**
 * @param {Record<string, unknown>} body
 */
export async function resendAddContact(body) {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const res = await fetch(`${base}/resend/contacts`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : `HTTP ${res.status}`);
    }
    return res.json();
}

/**
 * @param {Record<string, unknown>} body
 */
export async function resendAddContactToSegment(body) {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const res = await fetch(`${base}/resend/contacts/segment`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : `HTTP ${res.status}`);
    }
    return res.json();
}

/**
 * @param {Record<string, unknown>} body — segmentId, subject, html, name, from?, text?, send?
 * @returns {Promise<Record<string, unknown>>}
 */
export async function resendCreateBroadcast(body) {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const res = await fetch(`${base}/resend/broadcasts`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : `HTTP ${res.status}`);
    }
    return res.json();
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} [body]
 */
export async function resendSendBroadcast(id, body = {}) {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const res = await fetch(
        `${base}/resend/broadcasts/${encodeURIComponent(String(id).trim())}/send`,
        {
            method: 'POST',
            headers: integrationHeadersJson(),
            body: JSON.stringify(body),
        },
    );
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : `HTTP ${res.status}`);
    }
    return res.json();
}

/**
 * @param {string} key
 * @param {string} contentType
 * @param {{ rootPrefix?: string }} [options]
 */
export async function presignUpload(key, contentType, options = {}) {
    const base = getIntegrationBaseUrl();
    if (!base) {
        throw new Error('Integration API URL not configured.');
    }
    const res = await fetch(`${base}/storage/presign`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify({ key, contentType, rootPrefix: options.rootPrefix }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Presign HTTP ${res.status}`);
    }
    return res.json();
}

/**
 * @param {{ contentId?: string, fileName: string, contentType: string }} opts
 * @returns {Promise<{ putUrl: string, key: string, fileName: string, expiresIn: number }>}
 */
export async function presignPrivateVideoUpload(opts) {
    const base = getIntegrationBaseUrl();
    if (!base) {
        throw new Error('Integration API URL not configured.');
    }
    const res = await fetch(`${base}/storage/private-video/presign-upload`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify(opts),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Private video presign HTTP ${res.status}`);
    }
    return res.json();
}

/**
 * @param {{ key: string, principal: string }} opts
 * @returns {Promise<{ url: string, expiresAt: string }>}
 */
export async function signPrivateVideoPlayback(opts) {
    const base = getIntegrationBaseUrl();
    if (!base) {
        throw new Error('Integration API URL not configured.');
    }
    const res = await fetch(`${base}/storage/private-video/sign-playback`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify(opts),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Private video playback HTTP ${res.status}`);
    }
    return res.json();
}

export const MULTIPART_THRESHOLD_BYTES = 100 * 1024 * 1024;

async function integrationPost(path, body) {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured.');
    const res = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: integrationHeadersJson(),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

export function initPublicMultipartUpload(body) {
    return integrationPost('/storage/multipart/init', body);
}

export function presignPublicMultipartPart(body) {
    return integrationPost('/storage/multipart/presign-part', body);
}

export function completePublicMultipartUpload(body) {
    return integrationPost('/storage/multipart/complete', body);
}

export function abortPublicMultipartUpload(body) {
    return integrationPost('/storage/multipart/abort', body);
}

export function initPrivateVideoMultipartUpload(body) {
    return integrationPost('/storage/private-video/multipart/init', body);
}

export function presignPrivateVideoMultipartPart(body) {
    return integrationPost('/storage/private-video/multipart/presign-part', body);
}

export function completePrivateVideoMultipartUpload(body) {
    return integrationPost('/storage/private-video/multipart/complete', body);
}

export function abortPrivateVideoMultipartUpload(body) {
    return integrationPost('/storage/private-video/multipart/abort', body);
}

/**
 * Fetch actual PayPal transaction fees for a batch of ledger rows.
 * @param {{ id: string, paymentProvider: string, externalPaymentId: string, externalChargeId: string }[]} ledgerRows
 */
export function syncPayPalProgramFees(ledgerRows) {
    return integrationPost('/payments/sync-program-fees', { ledgerRows });
}

/**
 * Fetch actual Stripe transaction fees for a batch of ledger rows.
 * @param {{ id: string, externalPaymentId: string }[]} ledgerRows
 */
export function syncStripeProgramFees(ledgerRows) {
    return integrationPost('/stripe/sync-program-fees', { ledgerRows });
}
