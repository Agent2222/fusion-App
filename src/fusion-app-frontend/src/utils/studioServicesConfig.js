/**
 * Studio Services panel — localStorage for integration URL + Stripe publishable keys (test/live).
 * Secret keys are never persisted; use buildServerEnvSnippet only for copy-to-clipboard.
 */

export const LS_INTEGRATION_API_URL = 'fusion-studio-integration-api-url';
/** Optional Bearer token when integration API has INTEGRATION_API_KEY set */
export const LS_INTEGRATION_API_KEY = 'fusion-studio-integration-api-bearer';
export const LS_STRIPE_MODE = 'fusion-studio-stripe-mode';
export const LS_STRIPE_PK_TEST = 'fusion-studio-stripe-pk-test';
export const LS_STRIPE_PK_LIVE = 'fusion-studio-stripe-pk-live';
export const LS_PAYPAL_CLIENT_ID_TEST = 'fusion-studio-paypal-client-id-test';
export const LS_PAYPAL_CLIENT_ID_LIVE = 'fusion-studio-paypal-client-id-live';
/** Active checkout provider for new payments: 'paypal' | 'stripe' */
export const LS_PAYMENT_PROVIDER = 'fusion-studio-payment-provider';
export const LS_RESEND_TEST_TO = 'fusion-studio-resend-test-to';
/** Optional Resend From override for Studio test email (must be allowed in Resend) */
export const LS_RESEND_FROM_OVERRIDE = 'fusion-studio-resend-from-override';
/** Comma/newline-separated admin recipients for new application notifications (merged with {@link DEFAULT_APPLICATION_STAFF_EMAIL}). */
export const LS_APPLICATION_ADMIN_EMAILS = 'fusion-studio-application-admin-emails';

/** Always receives new-application notifications in addition to {@link getApplicationAdminEmails} entries. */
export const DEFAULT_APPLICATION_STAFF_EMAIL = 'info@fusionart.world';
export const LS_S3_REGION = 'fusion-studio-s3-region-note';
export const LS_S3_BUCKET = 'fusion-studio-s3-bucket-note';
export const LS_S3_PUBLIC_BASE = 'fusion-studio-s3-public-base-note';

/**
 * @returns {string[]}
 */
export function getApplicationAdminEmails() {
    try {
        const raw = localStorage.getItem(LS_APPLICATION_ADMIN_EMAILS) || '';
        return String(raw)
            .split(/[\n,]+/)
            .map((s) => s.trim())
            .filter((s) => s.includes('@'));
    } catch {
        return [];
    }
}

/**
 * Staff inboxes for new program applications: primary {@link DEFAULT_APPLICATION_STAFF_EMAIL} plus Studio list, deduped (case-insensitive).
 * @returns {string[]}
 */
export function getApplicationStaffNotificationEmails() {
    /** @type {string[]} */
    const out = [];
    const seen = new Set();
    const push = (addr) => {
        const a = String(addr || '').trim();
        if (!a.includes('@')) return;
        const k = a.toLowerCase();
        if (seen.has(k)) return;
        seen.add(k);
        out.push(a);
    };
    push(DEFAULT_APPLICATION_STAFF_EMAIL);
    for (const e of getApplicationAdminEmails()) {
        push(e);
    }
    return out;
}

/** @returns {'test'|'live'} */
export function getStripeMode() {
    try {
        const v = localStorage.getItem(LS_STRIPE_MODE);
        return v === 'live' ? 'live' : 'test';
    } catch {
        return 'test';
    }
}

/** @param {'test'|'live'} mode */
export function setStripeMode(mode) {
    try {
        localStorage.setItem(LS_STRIPE_MODE, mode === 'live' ? 'live' : 'test');
    } catch {
        /* ignore */
    }
}

/** @returns {'paypal'|'stripe'} */
export function getActivePaymentProviderSetting() {
    try {
        const v = localStorage.getItem(LS_PAYMENT_PROVIDER);
        return v === 'stripe' ? 'stripe' : 'paypal';
    } catch {
        return 'paypal';
    }
}

/** @param {'paypal'|'stripe'} provider */
export function setActivePaymentProvider(provider) {
    try {
        localStorage.setItem(
            LS_PAYMENT_PROVIDER,
            provider === 'stripe' ? 'stripe' : 'paypal',
        );
    } catch {
        /* ignore */
    }
}

/**
 * Resolved publishable key: Studio override for mode, else Vite env.
 * @returns {string}
 */
export function getStripePublishableKeyResolved() {
    const mode = getStripeMode();
    try {
        const test = localStorage.getItem(LS_STRIPE_PK_TEST)?.trim() || '';
        const live = localStorage.getItem(LS_STRIPE_PK_LIVE)?.trim() || '';
        const pick = mode === 'live' ? live || test : test || live;
        if (pick) return pick;
    } catch {
        /* ignore */
    }
    const env =
        typeof import.meta !== 'undefined' && import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY;
    return typeof env === 'string' ? env.trim() : '';
}

/**
 * Resolved PayPal client id: Studio override for mode, else Vite env.
 * @returns {string}
 */
export function getPayPalClientIdResolved() {
    const mode = getStripeMode();
    try {
        const test = localStorage.getItem(LS_PAYPAL_CLIENT_ID_TEST)?.trim() || '';
        const live = localStorage.getItem(LS_PAYPAL_CLIENT_ID_LIVE)?.trim() || '';
        const pick = mode === 'live' ? live || test : test || live;
        if (pick) return pick;
    } catch {
        /* ignore */
    }
    const env =
        typeof import.meta !== 'undefined' && import.meta.env?.VITE_PAYPAL_CLIENT_ID;
    return typeof env === 'string' ? env.trim() : '';
}

/**
 * Build a `.env` fragment for the integration server (secrets are not stored).
 * @param {string} skTest
 * @param {string} skLive
 * @param {{ resend?: string, awsRegion?: string, s3Bucket?: string, s3Public?: string }} [extra]
 */
export function buildServerEnvSnippet(skTest, skLive, extra = {}) {
    const lines = ['# Paste into services/fusion-integration-api/.env', ''];
    const t = String(skTest || '').trim();
    const l = String(skLive || '').trim();
    if (t) lines.push('# Test mode', `STRIPE_SECRET_KEY=${t}`, '');
    if (l) lines.push('# Live mode (use only in production deploy)', `STRIPE_SECRET_KEY=${l}`, '');
    if (!t && !l) {
        lines.push('# STRIPE_SECRET_KEY=sk_test_...');
    }
    const re = String(extra.resend || '').trim();
    if (re) lines.push('RESEND_API_KEY=' + re, '');
    else lines.push('# RESEND_API_KEY=re_...', '');
    lines.push(
        '# STRIPE_PRICE_ID=price_...',
        '# STRIPE_WEBHOOK_SECRET=whsec_...',
        '# PAYPAL_CLIENT_ID=...',
        '# PAYPAL_CLIENT_SECRET=...',
        '# PAYPAL_MODE=sandbox',
        '# PAYPAL_PLAN_BIMONTHLY_ID=...',
        '# PAYPAL_PLAN_ANNUAL_ID=...',
        '# PAYPAL_PLAN_INSTALLMENT_ID=...',
        '# FUSION_BACKEND_CANISTER_ID=...',
        '# INTEGRATION_IC_IDENTITY_PEM=  # paste full PEM from: dfx identity export <name>',
        '# (optional legacy) INTEGRATION_IC_IDENTITY_JSON=["hex","hex"]',
        '# IC_HOST=http://127.0.0.1:4943',
        '# RESEND_FROM="Fusion <onboarding@resend.dev>"',
        String(extra.awsRegion || '').trim()
            ? `AWS_REGION=${String(extra.awsRegion).trim()}`
            : '# AWS_REGION=us-east-1',
        String(extra.s3Bucket || '').trim()
            ? `S3_BUCKET=${String(extra.s3Bucket).trim()}`
            : '# S3_BUCKET=your-bucket',
        String(extra.s3Public || '').trim()
            ? `S3_PUBLIC_BASE_URL=${String(extra.s3Public).trim()}`
            : '# S3_PUBLIC_BASE_URL=https://...',
        '# CORS_ORIGINS=http://localhost:3000,https://your-domain.ic0.app'
    );
    return lines.join('\n');
}
