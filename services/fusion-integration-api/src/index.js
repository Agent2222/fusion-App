/**
 * Fusion integration API — Stripe Payment Intents, Resend, S3 presigned uploads.
 * Env: see README in this package.
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express from 'express';
import Stripe from 'stripe';
import { Principal } from '@dfinity/principal';
import { Resend } from 'resend';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getIntegrationActor, pushSubscriptionToCanister } from './canisterActor.js';

const PORT = Number(process.env.PORT || 8787);
/** If "1" / "true", only allow DEFAULT + CORS_ORIGINS. Otherwise reflect any Origin (browser CORS always OK; POST still needs API key when set). */
const CORS_STRICT = ['1', 'true', 'yes'].includes(
    String(process.env.CORS_STRICT || '').toLowerCase(),
);
const DEFAULT_CORS_ORIGINS = [
    'https://fusionart.world',
    'https://www.fusionart.world',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
];
const corsOriginsFromEnv = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
const corsAllowList = [...new Set([...DEFAULT_CORS_ORIGINS, ...corsOriginsFromEnv])];
const apiKey = process.env.INTEGRATION_API_KEY || '';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
const fusionBackendCanisterId = process.env.FUSION_BACKEND_CANISTER_ID || '';
const integrationIdentityConfigured = Boolean(
    fusionBackendCanisterId &&
        (process.env.INTEGRATION_IC_IDENTITY_PEM?.trim() ||
            process.env.INTEGRATION_IC_IDENTITY_JSON?.trim()),
);

const stripeSecret = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

const resendApiKey = process.env.RESEND_API_KEY || '';
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const resendFrom = process.env.RESEND_FROM || '';

const awsRegion = process.env.AWS_REGION || process.env.S3_REGION || '';
const s3Bucket = process.env.S3_BUCKET || '';
const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
const awsSessionToken = process.env.AWS_SESSION_TOKEN || '';
const s3PublicBase =
    process.env.S3_PUBLIC_BASE_URL ||
    (s3Bucket && awsRegion
        ? `https://${s3Bucket}.s3.${awsRegion}.amazonaws.com`
        : '');
const s3Prefix = (process.env.S3_KEY_PREFIX || 'uploads/').replace(/^\/+/, '');

/** On Render and most PaaS hosts there is no instance role — set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY. Locally, omit them to use ~/.aws or env profile. */
let s3Client = null;
if (awsRegion && s3Bucket) {
    /** @type {import('@aws-sdk/client-s3').S3ClientConfig} */
    const s3Config = { region: awsRegion };
    if (awsAccessKeyId && awsSecretAccessKey) {
        s3Config.credentials = {
            accessKeyId: awsAccessKeyId,
            secretAccessKey: awsSecretAccessKey,
            ...(awsSessionToken ? { sessionToken: awsSessionToken } : {}),
        };
    }
    s3Client = new S3Client(s3Config);
}

const app = express();
app.set('trust proxy', 1);
app.use(
    cors({
        origin: (origin, cb) => {
            if (!CORS_STRICT) {
                cb(null, true);
                return;
            }
            if (!origin || corsAllowList.includes(origin)) {
                cb(null, true);
            } else {
                cb(new Error('Not allowed by CORS'));
            }
        },
    })
);

/**
 * Stripe webhooks need the raw body for signature verification — must run before `express.json`.
 */
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        if (!stripe || !stripeWebhookSecret) {
            return res.status(503).json({ error: 'Stripe webhook not configured' });
        }
        const sig = req.headers['stripe-signature'];
        if (!sig || typeof sig !== 'string') {
            return res.status(400).json({ error: 'Missing stripe-signature' });
        }
        let event;
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('[stripe webhook] verify failed:', msg);
            return res.status(400).json({ error: `Webhook: ${msg}` });
        }
        try {
            await handleStripeWebhookEvent(event);
        } catch (e) {
            console.error('[stripe webhook] handler', e);
            return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
        }
        return res.json({ received: true });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return res.status(500).json({ error: msg });
    }
});

app.use(express.json({ limit: '512kb' }));

/**
 * @param {import('stripe').Stripe.Event} event
 */
/**
 * Only push when subscription has a valid IC principal (skip pay-first / pending link rows).
 * @param {import('stripe').Stripe.Subscription} sub
 * @param {string} [customerId]
 */
async function pushSubscriptionToCanisterIfLinked(sub, customerId) {
    const p = sub.metadata?.principal;
    if (!p || typeof p !== 'string' || !p.trim()) {
        return;
    }
    try {
        Principal.fromText(p.trim());
    } catch {
        return;
    }
    await pushSubscriptionToCanister(sub, customerId);
}

/**
 * @param {import('stripe').Stripe.Event} event
 */
async function handleStripeWebhookEvent(event) {
    switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
            const sub = /** @type {import('stripe').Stripe.Subscription} */ (event.data.object);
            await pushSubscriptionToCanisterIfLinked(sub);
            break;
        }
        case 'invoice.paid':
        case 'invoice.payment_failed': {
            const inv = /** @type {import('stripe').Stripe.Invoice} */ (event.data.object);
            const subId = inv.subscription;
            if (typeof subId === 'string' && stripe) {
                const sub = await stripe.subscriptions.retrieve(subId);
                await pushSubscriptionToCanisterIfLinked(sub);
            }
            break;
        }
        default:
            break;
    }
}

function requireApiKey(req, res, next) {
    if (!apiKey) return next();
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : '';
    if (token !== apiKey) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    return next();
}

app.get('/health', (_req, res) => {
    res.json({
        ok: true,
        stripe: stripeSecret ? 'configured' : 'missing',
        stripeWebhook: stripeWebhookSecret ? 'configured' : 'optional',
        stripePrice: process.env.STRIPE_PRICE_ID ? 'configured' : 'missing',
        stripeAnnualPrice: process.env.STRIPE_ANNUAL_PRICE_ID ? 'configured' : 'missing',
        fusionCanister: integrationIdentityConfigured ? 'configured' : 'missing',
        resend: resendApiKey ? 'configured' : 'missing',
        s3: s3Client && s3Bucket ? 'configured' : 'missing',
        /** Hint for Render etc.: set IAM keys when not using a local AWS profile. */
        s3AwsEnvKeys: Boolean(awsAccessKeyId && awsSecretAccessKey),
    });
});

/** Confirms traffic hits this app (helps distinguish Render routing vs Node). */
app.get('/', (_req, res) => {
    res.type('text/plain').send('fusion-integration-api ok — use GET /health');
});

app.post('/stripe/create-payment-intent', requireApiKey, async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Stripe not configured' });
        }
        const amount = req.body?.amount;
        const currency = (req.body?.currency || 'usd').toLowerCase();
        if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 50) {
            return res.status(400).json({ error: 'Invalid amount (min 50 cents)' });
        }
        const rawMeta = req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};
        /** @type {Record<string, string>} */
        const metadata = {};
        for (const [k, v] of Object.entries(rawMeta)) {
            if (typeof k !== 'string' || !k.length) continue;
            metadata[k.slice(0, 40)] =
                typeof v === 'string' ? v.slice(0, 500) : String(v ?? '').slice(0, 500);
        }
        const pi = await stripe.paymentIntents.create({
            amount: Math.round(amount),
            currency,
            automatic_payment_methods: { enabled: true },
            metadata,
        });
        return res.json({ clientSecret: pi.client_secret });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return res.status(500).json({ error: msg });
    }
});

/**
 * Merge request metadata into Stripe metadata object (string values only).
 * @param {Record<string, unknown>} rawMeta
 * @param {Record<string, string>} base
 */
function mergeStripeMetadata(rawMeta, base) {
    /** @type {Record<string, string>} */
    const metadata = { ...base };
    for (const [k, v] of Object.entries(rawMeta)) {
        if (typeof k !== 'string' || !k.length) continue;
        metadata[k.slice(0, 40)] =
            typeof v === 'string' ? v.slice(0, 500) : String(v ?? '').slice(0, 500);
    }
    return metadata;
}

/** Bi-monthly (or any) recurring Price from Stripe Dashboard — `price_…` */
app.post('/stripe/create-subscription', requireApiKey, async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Stripe not configured' });
        }
        const tierRaw = req.body?.subscriptionTier;
        let tier = typeof tierRaw === 'string' ? tierRaw.trim().toLowerCase() : '';
        if (!tier) tier = 'bimonthly';
        if (tier !== 'bimonthly' && tier !== 'annual') {
            return res.status(400).json({ error: 'Invalid subscriptionTier (use bimonthly or annual)' });
        }
        const priceId =
            tier === 'annual'
                ? process.env.STRIPE_ANNUAL_PRICE_ID || ''
                : process.env.STRIPE_PRICE_ID || '';
        if (!priceId) {
            return res.status(503).json({
                error:
                    tier === 'annual'
                        ? 'STRIPE_ANNUAL_PRICE_ID not configured'
                        : 'STRIPE_PRICE_ID not configured',
            });
        }
        const principalRaw = req.body?.principal;
        const principal =
            typeof principalRaw === 'string' && principalRaw.trim() ? principalRaw.trim().slice(0, 500) : '';
        const payFirstFlag =
            req.body?.payFirst === true ||
            req.body?.payFirst === 'true' ||
            String(req.body?.payFirst || '').toLowerCase() === 'true';
        const email = req.body?.email;
        if (typeof email !== 'string' || !email.includes('@')) {
            return res.status(400).json({ error: 'valid email required' });
        }
        const rawMeta = req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};

        /** Pay-first checkout: explicit flag and/or no principal (resubscribe sends principal only). */
        const payFirstPending = payFirstFlag || !principal;
        const fusionPendingId = payFirstPending ? randomUUID() : '';

        /** @type {Record<string, string>} */
        let metadata;
        if (payFirstPending) {
            metadata = mergeStripeMetadata(rawMeta, {
                fusion_pending_id: fusionPendingId,
                pending_email: email.trim().slice(0, 500),
            });
        } else {
            metadata = mergeStripeMetadata(rawMeta, { principal });
        }

        const existing = await stripe.customers.list({ email: email.trim(), limit: 1 });
        let customer;
        if (existing.data.length > 0) {
            customer = existing.data[0];
            if (payFirstPending) {
                customer = await stripe.customers.update(customer.id, {
                    metadata: { ...customer.metadata, ...metadata },
                });
            } else if (!customer.metadata?.principal) {
                customer = await stripe.customers.update(customer.id, {
                    metadata: { ...customer.metadata, principal: metadata.principal },
                });
            }
        } else {
            customer = await stripe.customers.create({
                email: email.trim(),
                metadata,
            });
        }

        const subMeta = payFirstPending
            ? { fusion_pending_id: fusionPendingId }
            : { principal: metadata.principal };
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
            metadata: mergeStripeMetadata(rawMeta, subMeta),
        });

        const invoice = subscription.latest_invoice;
        let clientSecret = null;
        if (invoice && typeof invoice === 'object' && invoice.payment_intent) {
            const pi = invoice.payment_intent;
            if (typeof pi === 'object' && pi && pi.client_secret) {
                clientSecret = pi.client_secret;
            }
        }
        if (!clientSecret) {
            return res.status(500).json({ error: 'No client_secret on subscription invoice' });
        }

        if (!payFirstPending) {
            try {
                await pushSubscriptionToCanister(subscription, customer.id);
            } catch (e) {
                console.warn('[stripe] create-subscription canister sync (webhook may follow):', e);
            }
        }

        /** @type {Record<string, string>} */
        const out = {
            clientSecret,
            subscriptionId: subscription.id,
            customerId: customer.id,
        };
        if (payFirstPending) {
            out.fusionPendingId = fusionPendingId;
        }
        return res.json(out);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return res.status(500).json({ error: msg });
    }
});

/**
 * After pay-first checkout: attach IC principal to Stripe + canister.
 * Body: { fusionPendingId, email, principal, subscriptionId? } — prefer subscriptionId when available (no Customer Search).
 */
app.post('/stripe/link-subscription-to-principal', requireApiKey, async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Stripe not configured' });
        }
        const fusionPendingId = req.body?.fusionPendingId;
        const email = req.body?.email;
        const principalText = req.body?.principal;
        const subscriptionIdHint = req.body?.subscriptionId;
        if (typeof fusionPendingId !== 'string' || !fusionPendingId.trim()) {
            return res.status(400).json({ error: 'fusionPendingId required' });
        }
        if (typeof email !== 'string' || !email.includes('@')) {
            return res.status(400).json({ error: 'valid email required' });
        }
        if (typeof principalText !== 'string' || !principalText.trim()) {
            return res.status(400).json({ error: 'principal required' });
        }
        const trimmedPrincipal = principalText.trim();
        try {
            Principal.fromText(trimmedPrincipal);
        } catch {
            return res.status(400).json({ error: 'invalid principal' });
        }

        const emailNorm = email.trim().toLowerCase();
        const pendingTrim = fusionPendingId.trim();

        /** @type {import('stripe').Stripe.Subscription} */
        let best;
        /** @type {import('stripe').Stripe.Customer} */
        let customer;

        if (typeof subscriptionIdHint === 'string' && subscriptionIdHint.trim()) {
            const sub = await stripe.subscriptions.retrieve(subscriptionIdHint.trim());
            if (sub.metadata?.fusion_pending_id !== pendingTrim) {
                return res.status(400).json({ error: 'pending id does not match subscription' });
            }
            const cid =
                typeof sub.customer === 'string' ? sub.customer : sub.customer?.id || '';
            if (!cid) {
                return res.status(400).json({ error: 'subscription has no customer' });
            }
            const cust = await stripe.customers.retrieve(cid);
            customer = /** @type {import('stripe').Stripe.Customer} */ (cust);
            if (customer.deleted || (customer.email || '').toLowerCase() !== emailNorm) {
                return res.status(403).json({ error: 'email does not match pending checkout' });
            }
            best = sub;
        } else {
            const escaped = escapeStripeMetadataQueryValue(pendingTrim);
            const search = await stripe.customers.search({
                query: `metadata['fusion_pending_id']:'${escaped}'`,
                limit: 5,
            });
            customer = search.data.find((c) => (c.email || '').toLowerCase() === emailNorm);
            if (!customer && search.data.length === 1) {
                customer = search.data[0];
            }
            if (!customer) {
                return res.status(404).json({ error: 'No pending subscription found for this id' });
            }
            if ((customer.email || '').toLowerCase() !== emailNorm) {
                return res.status(403).json({ error: 'email does not match pending checkout' });
            }

            const subs = await stripe.subscriptions.list({
                customer: customer.id,
                status: 'all',
                limit: 100,
            });
            const pending = subs.data.filter((s) => s.metadata?.fusion_pending_id === pendingTrim);
            if (!pending.length) {
                return res.status(404).json({ error: 'Subscription not found for pending id' });
            }
            /** @param {import('stripe').Stripe.Subscription} s */
            const rank = (s) => {
                if (s.status === 'active' || s.status === 'trialing') return 0;
                if (s.status === 'past_due') return 1;
                if (s.status === 'incomplete') return 2;
                return 3;
            };
            const sorted = [...pending].sort((a, b) => rank(a) - rank(b));
            best = sorted[0];
        }

        const okStates = ['active', 'trialing', 'past_due'];
        if (!okStates.includes(best.status)) {
            return res.status(409).json({
                error: `Subscription not in a linkable state: ${best.status}`,
            });
        }

        const newSubMeta = {
            ...best.metadata,
            principal: trimmedPrincipal.slice(0, 500),
            fusion_pending_id: '',
        };
        await stripe.subscriptions.update(best.id, { metadata: newSubMeta });

        const newCustMeta = {
            ...customer.metadata,
            principal: trimmedPrincipal.slice(0, 500),
            fusion_pending_id: '',
        };
        await stripe.customers.update(customer.id, { metadata: newCustMeta });

        const updated = await stripe.subscriptions.retrieve(best.id);
        try {
            await pushSubscriptionToCanister(updated, customer.id);
        } catch (e) {
            console.warn('[stripe] link-subscription canister sync:', e);
        }

        return res.json({
            ok: true,
            subscriptionId: updated.id,
            customerId: customer.id,
            status: updated.status,
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return res.status(500).json({ error: msg });
    }
});

/**
 * Stripe Customer Search — escape single quotes and backslashes in metadata values.
 * @param {string} s
 */
function escapeStripeMetadataQueryValue(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** @param {import('stripe').Stripe.Subscription} s */
function rankStripeSubscription(s) {
    if (s.status === 'active' || s.status === 'trialing') return 0;
    if (s.status === 'past_due') return 1;
    if (s.status === 'unpaid') return 2;
    return 3;
}

/**
 * Find Stripe customer + single “best” subscription for this IC principal (same ranking as sync).
 * @param {import('stripe').Stripe} stripeClient
 * @param {string} principalText
 * @returns {Promise<
 *   | { ok: true; customer: import('stripe').Stripe.Customer; subscription: import('stripe').Stripe.Subscription }
 *   | { ok: false; reason: string; customerId?: string }
 * >}
 */
async function getStripeCustomerAndBestSubscription(stripeClient, principalText) {
    const trimmed = principalText.trim();
    if (!trimmed) {
        return { ok: false, reason: 'invalid_principal' };
    }
    const escaped = escapeStripeMetadataQueryValue(trimmed);
    const search = await stripeClient.customers.search({
        query: `metadata['principal']:'${escaped}'`,
        limit: 1,
    });
    if (!search.data.length) {
        return { ok: false, reason: 'no_stripe_customer' };
    }
    const customer = search.data[0];
    const subs = await stripeClient.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 100,
    });
    if (!subs.data.length) {
        return { ok: false, reason: 'no_subscription', customerId: customer.id };
    }
    const sorted = [...subs.data].sort((a, b) => {
        const d = rankStripeSubscription(a) - rankStripeSubscription(b);
        if (d !== 0) return d;
        return b.created - a.created;
    });
    const best = sorted[0];
    return { ok: true, customer, subscription: best };
}

/**
 * Customer by email + best subscription (same ranking as principal lookup).
 * @param {import('stripe').Stripe} stripeClient
 * @param {string} email
 * @returns {Promise<
 *   | { ok: true; customer: import('stripe').Stripe.Customer; subscription: import('stripe').Stripe.Subscription; membershipActive: boolean }
 *   | { ok: false; error?: string; reason?: string; customerId?: string }
 * >}
 */
async function getStripeCustomerAndBestSubscriptionByEmail(stripeClient, email) {
    const trimmed = String(email ?? '').trim();
    if (!trimmed.includes('@')) {
        return { ok: false, error: 'valid email required' };
    }
    const list = await stripeClient.customers.list({ email: trimmed, limit: 1 });
    if (!list.data.length) {
        return { ok: false, reason: 'no_customer' };
    }
    const customer = list.data[0];
    const subs = await stripeClient.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 100,
    });
    if (!subs.data.length) {
        return { ok: false, reason: 'no_subscription', customerId: customer.id };
    }
    const sorted = [...subs.data].sort((a, b) => {
        const d = rankStripeSubscription(a) - rankStripeSubscription(b);
        if (d !== 0) return d;
        return b.created - a.created;
    });
    const best = sorted[0];
    const membershipActive = best.status === 'active' || best.status === 'trialing';
    return { ok: true, customer, subscription: best, membershipActive };
}

/**
 * Live Stripe subscription status for a customer email (Studio admin lookup).
 * @param {import('stripe').Stripe} stripeClient
 * @param {string} email
 * @returns {Promise<
 *   | { ok: true; membershipActive: boolean; reason?: string; customerId?: string; subscriptionId?: string; subscriptionStatus: string | null; cancelAtPeriodEnd?: boolean }
 *   | { ok: false; error: string }
 * >}
 */
async function getStripeSubscriptionStatusByEmail(stripeClient, email) {
    const picked = await getStripeCustomerAndBestSubscriptionByEmail(stripeClient, email);
    if (!picked.ok) {
        if (picked.error) {
            return { ok: false, error: picked.error };
        }
        if (picked.reason === 'no_customer') {
            return {
                ok: true,
                membershipActive: false,
                reason: 'no_customer',
                subscriptionStatus: null,
            };
        }
        if (picked.reason === 'no_subscription') {
            return {
                ok: true,
                membershipActive: false,
                reason: 'no_subscription',
                customerId: picked.customerId,
                subscriptionStatus: null,
            };
        }
        return {
            ok: true,
            membershipActive: false,
            reason: picked.reason || 'unknown',
            subscriptionStatus: null,
        };
    }
    const { customer, subscription: best, membershipActive } = picked;
    return {
        ok: true,
        membershipActive,
        customerId: customer.id,
        subscriptionId: best.id,
        subscriptionStatus: best.status,
        cancelAtPeriodEnd: Boolean(best.cancel_at_period_end),
    };
}

/**
 * Push best subscription for Stripe customer (found by email) to the canister with `metadata.principal`.
 * @param {import('stripe').Stripe} stripeClient
 * @param {string} email
 * @param {string} principalText
 */
async function syncStripeSubscriptionByEmailAndPrincipal(stripeClient, email, principalText) {
    const picked = await getStripeCustomerAndBestSubscriptionByEmail(stripeClient, email);
    if (!picked.ok) {
        return { synced: false, reason: picked.reason || picked.error || 'unknown' };
    }
    const trimmed = String(principalText ?? '').trim();
    if (!trimmed) {
        return { synced: false, reason: 'invalid_principal' };
    }
    const { customer, subscription: best } = picked;
    const meta =
        best.metadata && typeof best.metadata === 'object'
            ? /** @type {Record<string, string>} */ ({ ...best.metadata })
            : {};
    meta.principal = trimmed;
    const subForPush = {
        id: best.id,
        status: best.status,
        customer: customer.id,
        metadata: meta,
    };
    await pushSubscriptionToCanister(subForPush, customer.id);
    return {
        synced: true,
        status: best.status,
        subscriptionId: best.id,
        customerId: customer.id,
    };
}

/**
 * @param {import('stripe').Stripe.Price} price
 * @returns {string}
 */
function formatStripePriceLine(price) {
    if (!price || !price.recurring) return '';
    const n = price.unit_amount;
    if (typeof n !== 'number' || !Number.isFinite(n)) return '';
    const major = n / 100;
    const cur = String(price.currency || 'usd').toUpperCase();
    const sym = cur === 'USD' ? '$' : `${cur} `;
    const interval = price.recurring.interval;
    const count = price.recurring.interval_count || 1;
    let cadence = '';
    if (interval === 'month') {
        cadence = count === 1 ? 'every month' : `every ${count} months`;
    } else if (interval === 'year') {
        cadence = count === 1 ? 'every year' : `every ${count} years`;
    } else if (interval === 'week') {
        cadence = count === 1 ? 'every week' : `every ${count} weeks`;
    } else {
        cadence = `per ${interval}`;
    }
    const shown = major % 1 === 0 ? String(Math.round(major)) : major.toFixed(2);
    return `${sym}${shown} ${cadence}`;
}

/**
 * @param {import('stripe').Stripe.Subscription} sub
 * @returns {string}
 */
function planLabelFromSubscription(sub) {
    const items = sub.items?.data;
    if (!items || !items.length) return 'Subscription';
    const first = items[0];
    const price = first.price;
    if (!price) return 'Subscription';
    const nick = typeof price.nickname === 'string' ? price.nickname.trim() : '';
    if (nick) return nick;
    const prod = price.product;
    if (prod && typeof prod === 'object' && 'name' in prod && typeof prod.name === 'string' && prod.name.trim()) {
        return prod.name.trim();
    }
    return 'Subscription';
}

/**
 * Find customer by `metadata.principal`, pick the best subscription (active/trialing first), push to canister.
 * @param {import('stripe').Stripe} stripeClient
 * @param {string} principalText
 */
async function syncStripeSubscriptionForPrincipal(stripeClient, principalText) {
    const trimmed = principalText.trim();
    const picked = await getStripeCustomerAndBestSubscription(stripeClient, principalText);
    if (!picked.ok) {
        return {
            synced: false,
            reason: picked.reason,
            ...(picked.customerId ? { customerId: picked.customerId } : {}),
        };
    }
    const { customer, subscription: best } = picked;
    const meta =
        best.metadata && typeof best.metadata === 'object'
            ? /** @type {Record<string, string>} */ ({ ...best.metadata })
            : {};
    meta.principal = trimmed;
    const subForPush = {
        id: best.id,
        status: best.status,
        customer: customer.id,
        metadata: meta,
    };
    await pushSubscriptionToCanister(subForPush, customer.id);
    return {
        synced: true,
        status: best.status,
        subscriptionId: best.id,
        customerId: customer.id,
    };
}

/** Pull latest Stripe subscription for this principal and upsert the backend (works alongside webhooks). */
app.post('/stripe/sync-subscription', requireApiKey, async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Stripe not configured' });
        }
        const principal = req.body?.principal;
        if (typeof principal !== 'string' || !principal.trim()) {
            return res.status(400).json({ error: 'principal required' });
        }
        const actor = await getIntegrationActor();
        if (!actor) {
            return res.status(503).json({ error: 'Canister integration not configured' });
        }
        const result = await syncStripeSubscriptionForPrincipal(stripe, principal);
        return res.json(result);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return res.status(500).json({ error: msg });
    }
});

/** Studio: push subscription found by customer email to canister (sets metadata.principal). */
app.post('/stripe/sync-subscription-by-email', requireApiKey, async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Stripe not configured' });
        }
        const email = req.body?.email;
        const principal = req.body?.principal;
        if (typeof email !== 'string' || !email.trim().includes('@')) {
            return res.status(400).json({ error: 'valid email required' });
        }
        if (typeof principal !== 'string' || !principal.trim()) {
            return res.status(400).json({ error: 'principal required' });
        }
        const actor = await getIntegrationActor();
        if (!actor) {
            return res.status(503).json({ error: 'Canister integration not configured' });
        }
        const result = await syncStripeSubscriptionByEmailAndPrincipal(stripe, email, principal);
        return res.json(result);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return res.status(500).json({ error: msg });
    }
});

/** Studio: live Stripe subscription health by customer email (not IC principal). */
app.post('/stripe/subscription-status-by-email', requireApiKey, async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Stripe not configured' });
        }
        const email = req.body?.email;
        if (typeof email !== 'string' || !email.trim().includes('@')) {
            return res.status(400).json({ error: 'valid email required' });
        }
        const result = await getStripeSubscriptionStatusByEmail(stripe, email);
        if (!result.ok) {
            return res.status(400).json({ error: result.error });
        }
        return res.json(result);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return res.status(500).json({ error: msg });
    }
});

/** Stripe Customer Portal — billing history, payment method, cancel (configure portal in Stripe Dashboard). */
app.post('/stripe/billing-portal-session', requireApiKey, async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Stripe not configured' });
        }
        const principal = req.body?.principal;
        const returnUrl = req.body?.returnUrl;
        if (typeof principal !== 'string' || !principal.trim()) {
            return res.status(400).json({ error: 'principal required' });
        }
        if (typeof returnUrl !== 'string' || !returnUrl.startsWith('http')) {
            return res.status(400).json({ error: 'returnUrl required (absolute https URL)' });
        }
        const trimmed = principal.trim();
        const escaped = escapeStripeMetadataQueryValue(trimmed);
        const search = await stripe.customers.search({
            query: `metadata['principal']:'${escaped}'`,
            limit: 1,
        });
        if (!search.data.length) {
            return res.status(404).json({ error: 'no_stripe_customer' });
        }
        const customer = search.data[0];
        const session = await stripe.billingPortal.sessions.create({
            customer: customer.id,
            return_url: returnUrl.trim(),
        });
        return res.json({ url: session.url });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return res.status(500).json({ error: msg });
    }
});

/** Masked card + plan copy for member dashboard (expand subscription items). */
app.post('/stripe/member-billing-summary', requireApiKey, async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Stripe not configured' });
        }
        const principal = req.body?.principal;
        if (typeof principal !== 'string' || !principal.trim()) {
            return res.status(400).json({ error: 'principal required' });
        }
        const picked = await getStripeCustomerAndBestSubscription(stripe, principal);
        if (!picked.ok) {
            return res.json({
                ok: false,
                reason: picked.reason,
                ...(picked.customerId ? { customerId: picked.customerId } : {}),
            });
        }
        const { customer, subscription: best } = picked;
        const full = await stripe.subscriptions.retrieve(best.id, {
            expand: ['default_payment_method', 'items.data.price.product'],
        });
        let brand = '';
        let last4 = '';
        let pm = full.default_payment_method;
        if (typeof pm === 'string' && pm) {
            try {
                pm = await stripe.paymentMethods.retrieve(pm);
            } catch {
                pm = null;
            }
        }
        if (pm && typeof pm === 'object' && 'card' in pm && pm.card) {
            const c = /** @type {{ brand?: string, last4?: string }} */ (pm.card);
            brand = typeof c.brand === 'string' ? c.brand : '';
            last4 = typeof c.last4 === 'string' ? c.last4 : '';
        }
        const firstItem = full.items?.data?.[0];
        const price = firstItem?.price;
        const planLabel = planLabelFromSubscription(full);
        const planPriceLine = price ? formatStripePriceLine(price) : '';
        const cpe = full.current_period_end;
        const currentPeriodEnd =
            typeof cpe === 'number' && Number.isFinite(cpe) ? new Date(cpe * 1000).toISOString() : '';
        return res.json({
            ok: true,
            customerId: customer.id,
            subscriptionId: full.id,
            status: full.status,
            cancelAtPeriodEnd: Boolean(full.cancel_at_period_end),
            currentPeriodEnd,
            planLabel,
            planPriceLine,
            paymentMethod:
                brand || last4
                    ? {
                          brand,
                          last4,
                      }
                    : null,
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return res.status(500).json({ error: msg });
    }
});

/** Cancel at end of current period; syncs canister via pushSubscriptionToCanister. */
app.post('/stripe/cancel-subscription-at-period-end', requireApiKey, async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Stripe not configured' });
        }
        const principal = req.body?.principal;
        if (typeof principal !== 'string' || !principal.trim()) {
            return res.status(400).json({ error: 'principal required' });
        }
        const actor = await getIntegrationActor();
        if (!actor) {
            return res.status(503).json({ error: 'Canister integration not configured' });
        }
        const picked = await getStripeCustomerAndBestSubscription(stripe, principal);
        if (!picked.ok) {
            return res.status(400).json({ error: picked.reason, customerId: picked.customerId });
        }
        const { customer, subscription: best } = picked;
        if (best.status === 'canceled') {
            return res.status(400).json({ error: 'subscription_already_canceled' });
        }
        const updated = await stripe.subscriptions.update(best.id, { cancel_at_period_end: true });
        try {
            await pushSubscriptionToCanister(updated, customer.id);
        } catch (e) {
            console.warn('[stripe] cancel-at-period-end canister sync:', e);
        }
        return res.json({ ok: true, cancelAtPeriodEnd: true, subscriptionId: updated.id });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return res.status(500).json({ error: msg });
    }
});

app.post('/email/send', requireApiKey, async (req, res) => {
    try {
        if (!resend) {
            return res.status(503).json({ error: 'Resend not configured' });
        }
        const to = req.body?.to;
        const subject = req.body?.subject;
        const html = req.body?.html;
        const text = req.body?.text;
        if (!to || typeof to !== 'string' || !to.includes('@')) {
            return res.status(400).json({ error: 'Invalid to' });
        }
        if (!subject || typeof subject !== 'string') {
            return res.status(400).json({ error: 'Invalid subject' });
        }
        const fromOverride =
            typeof req.body?.from === 'string' ? req.body.from.trim().slice(0, 998) : '';
        if (fromOverride && !fromOverride.includes('@')) {
            return res.status(400).json({ error: 'Invalid from' });
        }
        const fromAddr = fromOverride || resendFrom;
        if (!fromAddr) {
            return res.status(503).json({ error: 'Set RESEND_FROM on server or pass from in body' });
        }
        const payload = {
            from: fromAddr,
            to: [to.trim()],
            subject: subject.slice(0, 998),
        };
        if (typeof html === 'string' && html.length) {
            payload.html = html;
        } else if (typeof text === 'string' && text.length) {
            payload.text = text;
        } else {
            return res.status(400).json({ error: 'Provide html or text' });
        }
        if (typeof req.body?.replyTo === 'string' && req.body.replyTo.includes('@')) {
            payload.reply_to = req.body.replyTo.trim();
        }
        const { data, error } = await resend.emails.send(payload);
        if (error) {
            console.error('[email/send] Resend rejected:', error);
            return res.status(502).json({ error: error.message || 'Resend error' });
        }
        return res.json({ ok: true, id: data?.id });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return res.status(500).json({ error: msg });
    }
});

app.post('/storage/presign', requireApiKey, async (req, res) => {
    try {
        if (!s3Client || !s3Bucket) {
            return res.status(503).json({ error: 'S3 not configured' });
        }
        let key = req.body?.key;
        const contentType = req.body?.contentType;
        if (typeof key !== 'string' || !key.length) {
            return res.status(400).json({ error: 'Invalid key' });
        }
        key = key.replace(/^\/+/, '');
        if (!key.startsWith(s3Prefix)) {
            key = `${s3Prefix}${key}`;
        }
        if (typeof contentType !== 'string' || !contentType.length) {
            return res.status(400).json({ error: 'Invalid contentType' });
        }
        const command = new PutObjectCommand({
            Bucket: s3Bucket,
            Key: key,
            ContentType: contentType,
        });
        const putUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        const base = s3PublicBase.replace(/\/$/, '');
        const publicUrl = `${base}/${key.split('/').map((seg) => encodeURIComponent(seg)).join('/')}`;
        return res.json({ putUrl, publicUrl });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/credentials|Could not load credentials/i.test(msg)) {
            return res.status(503).json({
                error:
                    'AWS credentials not available. On Render (and similar), set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY for an IAM user with s3:PutObject on this bucket. Locally you can use ~/.aws/credentials instead.',
            });
        }
        return res.status(500).json({ error: msg });
    }
});

app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
    console.log(`fusion-integration-api listening on ${PORT}`);
});
