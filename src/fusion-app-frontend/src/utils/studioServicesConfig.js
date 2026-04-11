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
export const LS_RESEND_TEST_TO = 'fusion-studio-resend-test-to';
/** Optional Resend From override for Studio test email (must be allowed in Resend) */
export const LS_RESEND_FROM_OVERRIDE = 'fusion-studio-resend-from-override';
export const LS_S3_REGION = 'fusion-studio-s3-region-note';
export const LS_S3_BUCKET = 'fusion-studio-s3-bucket-note';
export const LS_S3_PUBLIC_BASE = 'fusion-studio-s3-public-base-note';

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
