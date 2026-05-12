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
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
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
const resendBroadcastSegmentId = (process.env.RESEND_BROADCAST_SEGMENT_ID || '').trim();
/** Optional absolute URL to replace the default site logo in HTML (staff can also paste full URLs in the Studio modal). */
const fusionSignatureLogoUrl = (process.env.FUSION_SIGNATURE_LOGO_URL || '').trim();
const RESEND_API_BASE = 'https://api.resend.com';
const MAX_RESEND_JSON_BYTES = 120_000;
const BATCH_CHUNK = 100;
const BATCH_CHUNK_DELAY_MS = 500;

/**
 * @param {string} [html]
 */
function maybeApplyFusionLogoUrl(html) {
    if (typeof html !== 'string' || !fusionSignatureLogoUrl) {
        return html;
    }
    return html.replace(
        /https?:\/\/[^"'\s>]*\/email\/(?:Fusion-Logo-Sig-1|Fusion-X-logo-02)\.png/gi,
        fusionSignatureLogoUrl,
    );
}

/**
 * @param {string} path
 * @param {{ method?: string, body?: unknown }} [init]
 */
async function resendRestJson(path, init = {}) {
    if (!resendApiKey) {
        return { ok: false, status: 503, json: { error: 'Resend not configured' } };
    }
    const method = init.method || 'GET';
    const body = init.body;
    const r = await fetch(`${RESEND_API_BASE}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${resendApiKey}`,
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
        return {
            ok: false,
            status: r.status,
            json: { error: typeof j.message === 'string' ? j.message : r.statusText },
        };
    }
    return { ok: true, status: r.status, json: j };
}

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
const fusionMediaPublicPrefix = (process.env.S3_FUSION_MEDIA_PUBLIC_PREFIX || 'fusionMedia/uploads/')
    .replace(/^\/+/, '')
    .replace(/\/?$/, '/');
const privateVideoPrefix = (process.env.S3_PRIVATE_VIDEO_PREFIX || 'fusionMedia/private-video/')
    .replace(/^\/+/, '')
    .replace(/\/?$/, '/');
const privateVideoSignedUrlTtlSec = Math.max(
    60,
    Math.min(3600, Number(process.env.S3_PRIVATE_VIDEO_SIGNED_URL_TTL_SEC || 900)),
);

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

/**
 * @param {unknown} value
 * @param {number} [max]
 */
function safePathPart(value, max = 96) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._/-]+/g, '-')
        .replace(/\/+/g, '/')
        .replace(/^\/+|\/+$/g, '')
        .replace(/-+/g, '-')
        .slice(0, max);
}

/**
 * @param {unknown} fileName
 */
function safePrivateVideoFileName(fileName) {
    const raw = String(fileName ?? '').trim() || 'video.mp4';
    const clean = raw.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-');
    return clean.slice(0, 120) || 'video.mp4';
}

/**
 * @param {unknown} key
 */
function normalizePrivateVideoKey(key) {
    const k = String(key ?? '').trim().replace(/^\/+/, '');
    return k.startsWith(privateVideoPrefix) ? k : '';
}

/**
 * @param {string} principalText
 */
async function hasActiveStripeMembershipForPrincipal(principalText) {
    if (!stripe) return false;
    try {
        Principal.fromText(String(principalText || '').trim());
    } catch {
        return false;
    }
    const picked = await getStripeCustomerAndBestSubscription(stripe, String(principalText).trim());
    if (!picked.ok) return false;
    return picked.subscription.status === 'active' || picked.subscription.status === 'trialing';
}

/**
 * @param {string} principalText
 */
async function hasPrivateMediaAccessForPrincipal(principalText) {
    let p;
    try {
        p = Principal.fromText(String(principalText || '').trim());
    } catch {
        return false;
    }
    const actor = await getIntegrationActor();
    if (actor && typeof actor.integrationGetMembershipAccessForPrincipal === 'function') {
        const access = await actor.integrationGetMembershipAccessForPrincipal(p);
        if (access && typeof access === 'object') {
            if ('ok' in access || 'exempt' in access) return true;
            if ('needsSubscription' in access || 'noAccount' in access) return false;
        }
    }
    return hasActiveStripeMembershipForPrincipal(principalText);
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

function centsFromBody(value, fieldName) {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n) || n < 50) {
        throw new Error(`${fieldName} must be at least 50 cents`);
    }
    return Math.round(n);
}

function safeStripeMetaValue(value, max = 500) {
    return String(value ?? '').trim().slice(0, max);
}

function programPaymentMetadata(body, paymentType, amountCents) {
    const principal = safeStripeMetaValue(body?.principal);
    const programId = safeStripeMetaValue(body?.programId, 120);
    const applicationId = safeStripeMetaValue(body?.applicationId, 240);
    if (!principal) throw new Error('principal required');
    Principal.fromText(principal);
    if (!programId) throw new Error('programId required');
    if (!applicationId) throw new Error('applicationId required');
    return {
        principal,
        programId,
        applicationId,
        paymentType,
        amountCents: String(amountCents),
        totalDueCents: String(Math.max(0, Math.round(Number(body?.totalDueCents || 0)))),
        depositAmountCents: String(Math.max(0, Math.round(Number(body?.depositAmountCents || 0)))),
        source: 'program_payments_tab',
    };
}

async function cancelPlatformSubscriptionImmediately(principalText) {
    if (!stripe) return { ok: false, reason: 'stripe_not_configured' };
    const picked = await getStripeCustomerAndBestSubscription(stripe, principalText);
    if (!picked.ok) return { ok: false, reason: picked.reason };
    const { customer, subscription } = picked;
    if (subscription.status === 'canceled') {
        return { ok: true, subscriptionId: subscription.id, status: subscription.status };
    }
    const canceled = await stripe.subscriptions.cancel(subscription.id, { prorate: false });
    try {
        await pushSubscriptionToCanister(canceled, customer.id);
    } catch (e) {
        console.warn('[stripe] immediate program-payment cancel canister sync:', e);
    }
    return { ok: true, subscriptionId: canceled.id, status: canceled.status };
}

async function recordVerifiedProgramPayment(paymentIntent) {
    const actor = await getIntegrationActor();
    if (!actor) {
        throw new Error('Canister integration not configured');
    }
    const meta = paymentIntent.metadata || {};
    const principalText = safeStripeMetaValue(meta.principal);
    const programId = safeStripeMetaValue(meta.programId, 120);
    const applicationId = safeStripeMetaValue(meta.applicationId, 240);
    const paymentType = safeStripeMetaValue(meta.paymentType, 80);
    Principal.fromText(principalText);
    if (!programId || !applicationId || !paymentType) {
        throw new Error('PaymentIntent missing program payment metadata');
    }
    const charge =
        paymentIntent.latest_charge && typeof paymentIntent.latest_charge === 'object'
            ? paymentIntent.latest_charge
            : null;
    const chargeId = charge?.id || (typeof paymentIntent.latest_charge === 'string' ? paymentIntent.latest_charge : '');
    const receiptUrl = charge?.receipt_url || '';
    const createdAt =
        typeof paymentIntent.created === 'number'
            ? new Date(paymentIntent.created * 1000).toISOString()
            : new Date().toISOString();
    const amountCents = Math.max(0, Math.round(Number(paymentIntent.amount_received || paymentIntent.amount || 0)));
    const totalDueCents = Math.max(0, Math.round(Number(meta.totalDueCents || 0)));
    const depositAmountCents = Math.max(0, Math.round(Number(meta.depositAmountCents || 0)));
    const row = {
        id: paymentIntent.id,
        principal: Principal.fromText(principalText),
        programId,
        applicationId,
        paymentType,
        amountCents: BigInt(amountCents),
        currency: safeStripeMetaValue(paymentIntent.currency || 'usd', 20).toLowerCase(),
        stripePaymentIntentId: paymentIntent.id,
        stripeChargeId: chargeId,
        stripeReceiptUrl: receiptUrl,
        status: paymentIntent.status === 'succeeded' ? 'succeeded' : safeStripeMetaValue(paymentIntent.status, 40),
        createdAt,
        dueAt: [],
    };
    await actor.integrationRecordProgramPayment(
        row,
        BigInt(totalDueCents),
        BigInt(depositAmountCents),
        0n,
    );
    if (paymentType === 'deposit' || paymentType === 'full_payment') {
        await actor.integrationMarkProgramDepositAccepted(
            Principal.fromText(principalText),
            programId,
            applicationId,
            paymentType === 'full_payment' ? 'paid_full' : 'paid',
            createdAt,
        );
        await cancelPlatformSubscriptionImmediately(principalText);
    }
    if (paymentType === 'plan_installment') {
        const planId = safeStripeMetaValue(meta.planId, 120);
        if (planId) {
            const plan = {
                id: planId,
                principal: Principal.fromText(principalText),
                programId,
                applicationId,
                stripeSubscriptionId: safeStripeMetaValue(meta.stripeSubscriptionId, 120),
                stripeScheduleId: safeStripeMetaValue(meta.stripeScheduleId, 120),
                installmentCount: BigInt(Math.max(0, Math.round(Number(meta.installmentCount || 0)))),
                installmentAmountCents: BigInt(Math.max(0, Math.round(Number(meta.installmentAmountCents || 0)))),
                currency: safeStripeMetaValue(paymentIntent.currency || 'usd', 20).toLowerCase(),
                status: 'active',
                startAt: safeStripeMetaValue(meta.planStartAt) || createdAt,
                endAt: safeStripeMetaValue(meta.planEndAt) || '',
                createdAt,
                updatedAt: createdAt,
            };
            await actor.integrationActivateProgramPaymentPlan(plan, BigInt(totalDueCents), BigInt(depositAmountCents));
        }
    }
    return { receiptUrl, chargeId, amountCents, paymentType, programId };
}

app.post('/stripe/program-payment-intent', requireApiKey, async (req, res) => {
    try {
        if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
        const paymentType = safeStripeMetaValue(req.body?.paymentType, 80);
        if (!['deposit', 'full_payment', 'manual'].includes(paymentType)) {
            return res.status(400).json({ error: 'Invalid paymentType' });
        }
        const amountCents = centsFromBody(req.body?.amountCents, 'amountCents');
        const metadata = programPaymentMetadata(req.body, paymentType, amountCents);
        const pi = await stripe.paymentIntents.create({
            amount: amountCents,
            currency: 'usd',
            automatic_payment_methods: { enabled: true },
            metadata,
        });
        return res.json({ clientSecret: pi.client_secret, paymentIntentId: pi.id });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return res.status(500).json({ error: msg });
    }
});

app.post('/stripe/program-payment-confirmed', requireApiKey, async (req, res) => {
    try {
        if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
        const paymentIntentId = safeStripeMetaValue(req.body?.paymentIntentId, 120);
        if (!paymentIntentId.startsWith('pi_')) {
            return res.status(400).json({ error: 'paymentIntentId required' });
        }
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ['latest_charge'],
        });
        if (pi.status !== 'succeeded') {
            return res.status(409).json({ error: `PaymentIntent not succeeded: ${pi.status}` });
        }
        const recorded = await recordVerifiedProgramPayment(pi);
        return res.json({ ok: true, paymentIntentId: pi.id, ...recorded });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return res.status(500).json({ error: msg });
    }
});

async function getOrCreateProgramPaymentCustomer(principalText, email) {
    const escaped = escapeStripeMetadataQueryValue(principalText);
    const search = await stripe.customers.search({
        query: `metadata['principal']:'${escaped}'`,
        limit: 1,
    });
    if (search.data.length) return search.data[0];
    const emailText = safeStripeMetaValue(email, 320);
    if (!emailText.includes('@')) {
        throw new Error('valid email required for payment plan customer');
    }
    const existing = await stripe.customers.list({ email: emailText, limit: 1 });
    if (existing.data.length) {
        return stripe.customers.update(existing.data[0].id, {
            metadata: { ...existing.data[0].metadata, principal: principalText },
        });
    }
    return stripe.customers.create({
        email: emailText,
        metadata: { principal: principalText },
    });
}

app.post('/stripe/program-payment-plan', requireApiKey, async (req, res) => {
    try {
        if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
        const installmentCount = Math.round(Number(req.body?.installmentCount || 0));
        if (!Number.isFinite(installmentCount) || installmentCount < 2) {
            return res.status(400).json({ error: 'installmentCount must be at least 2' });
        }
        const installmentAmountCents = centsFromBody(req.body?.installmentAmountCents, 'installmentAmountCents');
        const principal = safeStripeMetaValue(req.body?.principal);
        Principal.fromText(principal);
        const customer = await getOrCreateProgramPaymentCustomer(principal, req.body?.email);
        const planId = `plan_${randomUUID()}`;
        const planStartAt = safeStripeMetaValue(req.body?.planStartAt, 80) || new Date().toISOString();
        const planEndAt = safeStripeMetaValue(req.body?.planEndAt, 80);
        const baseMeta = programPaymentMetadata(req.body, 'plan_installment', installmentAmountCents);
        const metadata = {
            ...baseMeta,
            planId,
            installmentCount: String(installmentCount),
            installmentAmountCents: String(installmentAmountCents),
            planStartAt,
            planEndAt,
        };
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [
                {
                    price_data: {
                        currency: 'usd',
                        unit_amount: installmentAmountCents,
                        recurring: { interval: 'month' },
                        product_data: {
                            name: `Fusion program payment plan: ${metadata.programId}`,
                        },
                    },
                },
            ],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            metadata,
            expand: ['latest_invoice.payment_intent'],
        });
        const invoice = subscription.latest_invoice;
        const pi =
            invoice && typeof invoice === 'object' && invoice.payment_intent && typeof invoice.payment_intent === 'object'
                ? invoice.payment_intent
                : null;
        if (!pi?.client_secret) {
            return res.status(500).json({ error: 'No client_secret on payment plan invoice' });
        }
        await stripe.paymentIntents.update(pi.id, {
            metadata: {
                ...metadata,
                stripeSubscriptionId: subscription.id,
                stripeScheduleId: '',
            },
        });
        return res.json({
            clientSecret: pi.client_secret,
            paymentIntentId: pi.id,
            subscriptionId: subscription.id,
            planId,
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return res.status(500).json({ error: msg });
    }
});

app.post('/stripe/program-payment-plan-cancel', requireApiKey, async (req, res) => {
    try {
        if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
        const planId = safeStripeMetaValue(req.body?.planId, 120);
        const subscriptionId = safeStripeMetaValue(req.body?.subscriptionId, 120);
        if (!planId) return res.status(400).json({ error: 'planId required' });
        if (subscriptionId && subscriptionId.startsWith('sub_')) {
            await stripe.subscriptions.cancel(subscriptionId, { prorate: false });
        }
        const actor = await getIntegrationActor();
        if (!actor) return res.status(503).json({ error: 'Canister integration not configured' });
        const updatedAt = new Date().toISOString();
        await actor.integrationCancelProgramPaymentPlan(planId, 'cancelled', updatedAt);
        return res.json({ ok: true, planId, subscriptionId, status: 'cancelled' });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return res.status(500).json({ error: msg });
    }
});

app.post('/stripe/program-payment-receipts', requireApiKey, async (req, res) => {
    try {
        if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
        const ids = Array.isArray(req.body?.paymentIntentIds)
            ? req.body.paymentIntentIds.map((x) => safeStripeMetaValue(x, 120)).filter((x) => x.startsWith('pi_'))
            : [];
        const receipts = [];
        for (const id of ids.slice(0, 50)) {
            const pi = await stripe.paymentIntents.retrieve(id, { expand: ['latest_charge'] });
            const charge = pi.latest_charge && typeof pi.latest_charge === 'object' ? pi.latest_charge : null;
            receipts.push({
                paymentIntentId: id,
                receiptUrl: charge?.receipt_url || '',
                chargeId: charge?.id || '',
            });
        }
        return res.json({ ok: true, receipts });
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

/**
 * @param {unknown} value
 * @param {number} [max]
 */
function safeContactText(value, max = 500) {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/**
 * @param {string} fullName
 */
function splitContactName(fullName) {
    const clean = safeContactText(fullName);
    if (!clean) return { firstName: '', lastName: '' };
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return { firstName: clean, lastName: '' };
    return {
        firstName: parts.slice(0, -1).join(' '),
        lastName: parts[parts.length - 1],
    };
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

/** Studio: safe contact backfill for Users rows, matched by Stripe metadata.principal. */
app.post('/stripe/account-contacts-by-principal', requireApiKey, async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Stripe not configured' });
        }
        const raw = Array.isArray(req.body?.principals) ? req.body.principals : [];
        const principals = [...new Set(raw.map((p) => String(p || '').trim()).filter(Boolean))].slice(0, 250);
        /** @type {Array<Record<string, string | boolean>>} */
        const contacts = [];
        /** @type {Array<Record<string, string>>} */
        const failures = [];
        for (const principal of principals) {
            try {
                Principal.fromText(principal);
            } catch {
                failures.push({ principal, reason: 'invalid_principal' });
                continue;
            }
            try {
                let picked = await getStripeCustomerAndBestSubscription(stripe, principal);
                if (
                    !picked.ok &&
                    picked.reason === 'no_stripe_customer' &&
                    stripe.subscriptions &&
                    typeof stripe.subscriptions.search === 'function'
                ) {
                    const escaped = escapeStripeMetadataQueryValue(principal);
                    const subSearch = await stripe.subscriptions.search({
                        query: `metadata['principal']:'${escaped}'`,
                        limit: 10,
                    });
                    if (subSearch.data.length) {
                        const sorted = [...subSearch.data].sort((a, b) => {
                            const d = rankStripeSubscription(a) - rankStripeSubscription(b);
                            if (d !== 0) return d;
                            return b.created - a.created;
                        });
                        const subscription = sorted[0];
                        const customerId = typeof subscription.customer === 'string'
                            ? subscription.customer
                            : subscription.customer?.id || '';
                        if (customerId) {
                            const customerRaw = await stripe.customers.retrieve(customerId);
                            if (!customerRaw.deleted) {
                                picked = { ok: true, customer: customerRaw, subscription };
                            }
                        }
                    }
                }
                if (!picked.ok) {
                    failures.push({ principal, reason: picked.reason || 'not_found' });
                    continue;
                }
                const { customer, subscription } = picked;
                const customerMeta = customer.metadata && typeof customer.metadata === 'object' ? customer.metadata : {};
                const subMeta = subscription.metadata && typeof subscription.metadata === 'object' ? subscription.metadata : {};
                const email = safeContactText(customer.email);
                const fullName = safeContactText(
                    customer.name ||
                        customerMeta.full_name ||
                        customerMeta.fullName ||
                        subMeta.full_name ||
                        subMeta.fullName,
                );
                const firstFromMeta = safeContactText(customerMeta.first_name || customerMeta.firstName || subMeta.first_name || subMeta.firstName);
                const lastFromMeta = safeContactText(customerMeta.last_name || customerMeta.lastName || subMeta.last_name || subMeta.lastName);
                const split = splitContactName(fullName);
                contacts.push({
                    principal,
                    email,
                    fullName,
                    firstName: firstFromMeta || split.firstName,
                    lastName: lastFromMeta || split.lastName,
                    customerId: customer.id,
                });
            } catch (e) {
                failures.push({ principal, reason: e instanceof Error ? e.message : String(e) });
            }
        }
        return res.json({ ok: true, contacts, failures });
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
            payload.html = maybeApplyFusionLogoUrl(html);
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

/** Transactional batch (Resend batch send, ≤100 per request; chunks with small delay). */
app.post('/email/batch', requireApiKey, async (req, res) => {
    try {
        if (!resend) {
            return res.status(503).json({ error: 'Resend not configured' });
        }
        const messages = req.body?.messages;
        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'messages must be a non-empty array' });
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
        const replyTo =
            typeof req.body?.replyTo === 'string' && req.body.replyTo.includes('@')
                ? req.body.replyTo.trim()
                : undefined;

        /** @type {Array<{ to: string, subject: string, html?: string, text?: string }>} */
        const normalized = [];
        for (const m of messages) {
            if (!m || typeof m !== 'object') {
                return res.status(400).json({ error: 'Invalid message entry' });
            }
            const to = typeof m.to === 'string' ? m.to.trim() : '';
            const subject = typeof m.subject === 'string' ? m.subject.trim() : '';
            if (!to.includes('@')) {
                return res.status(400).json({ error: 'Each message needs valid to' });
            }
            if (!subject) {
                return res.status(400).json({ error: 'Each message needs subject' });
            }
            const html = typeof m.html === 'string' && m.html.length ? maybeApplyFusionLogoUrl(m.html) : undefined;
            const text = typeof m.text === 'string' && m.text.length ? m.text : undefined;
            if (!html && !text) {
                return res.status(400).json({ error: 'Each message needs html or text' });
            }
            normalized.push({ to, subject: subject.slice(0, 998), html, text });
        }

        const strLen = JSON.stringify(normalized).length;
        if (strLen > 900_000) {
            return res.status(413).json({ error: 'Batch payload too large' });
        }

        /** @type {Array<{ to: string, ok: boolean, id?: string, error?: string }>} */
        const results = [];
        let okCount = 0;
        let failCount = 0;

        for (let i = 0; i < normalized.length; i += BATCH_CHUNK) {
            const chunk = normalized.slice(i, i + BATCH_CHUNK);
            const payloads = chunk.map((m) => {
                const p = {
                    from: fromAddr,
                    to: [m.to],
                    subject: m.subject,
                };
                if (m.html) p.html = m.html;
                else if (m.text) p.text = m.text;
                if (replyTo) p.reply_to = replyTo;
                return p;
            });

            if (resend.batch && typeof resend.batch.send === 'function') {
                const { data, error } = await resend.batch.send(/** @type {unknown} */ (payloads));
                if (error) {
                    for (const m of chunk) {
                        results.push({ to: m.to, ok: false, error: error.message || 'Resend batch error' });
                        failCount += 1;
                    }
                } else {
                    const dataArr = Array.isArray(data) ? data : data != null ? [data] : [];
                    chunk.forEach((m, j) => {
                        const one = dataArr[j];
                        const id = one && typeof one === 'object' && 'id' in one ? String(/** @type {any} */ (one).id) : undefined;
                        if (id) {
                            results.push({ to: m.to, ok: true, id });
                            okCount += 1;
                        } else {
                            results.push({ to: m.to, ok: true });
                            okCount += 1;
                        }
                    });
                }
            } else {
                for (let j = 0; j < chunk.length; j++) {
                    const m = chunk[j];
                    const p = { ...payloads[j] };
                    const { data, error } = await resend.emails.send(p);
                    if (error) {
                        results.push({ to: m.to, ok: false, error: error.message || 'Resend error' });
                        failCount += 1;
                    } else {
                        results.push({ to: m.to, ok: true, id: data?.id });
                        okCount += 1;
                    }
                }
            }

            if (i + BATCH_CHUNK < normalized.length) {
                await new Promise((r) => {
                    setTimeout(r, BATCH_CHUNK_DELAY_MS);
                });
            }
        }

        return res.json({ ok: true, okCount, failCount, results });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return res.status(500).json({ error: msg });
    }
});

/** @param {import('express').Request} req @param {import('express').Response} res @param {unknown} body */
function guardResendJsonBody(req, res, body) {
    try {
        const s = JSON.stringify(body ?? {});
        if (s.length > MAX_RESEND_JSON_BYTES) {
            res.status(413).json({ error: 'Body too large' });
            return false;
        }
    } catch {
        res.status(400).json({ error: 'Invalid JSON body' });
        return false;
    }
    return true;
}

app.get('/resend/sender', requireApiKey, (_req, res) => {
    return res.json({
        from: resendFrom || null,
        segmentId: resendBroadcastSegmentId || null,
    });
});

app.get('/resend/templates', requireApiKey, async (_req, res) => {
    const out = await resendRestJson('/templates', { method: 'GET' });
    if (!out.ok) return res.status(out.status).json(out.json);
    return res.json(out.json);
});

app.post('/resend/templates', requireApiKey, async (req, res) => {
    if (!guardResendJsonBody(req, res, req.body)) return;
    const out = await resendRestJson('/templates', { method: 'POST', body: req.body });
    if (!out.ok) return res.status(out.status).json(out.json);
    return res.json(out.json);
});

app.get('/resend/templates/:id', requireApiKey, async (req, res) => {
    const id = encodeURIComponent(req.params.id);
    const out = await resendRestJson(`/templates/${id}`, { method: 'GET' });
    if (!out.ok) return res.status(out.status).json(out.json);
    return res.json(out.json);
});

app.get('/resend/segments', requireApiKey, async (_req, res) => {
    const out = await resendRestJson('/segments', { method: 'GET' });
    if (!out.ok) return res.status(out.status).json(out.json);
    return res.json(out.json);
});

app.post('/resend/segments', requireApiKey, async (req, res) => {
    if (!guardResendJsonBody(req, res, req.body)) return;
    const out = await resendRestJson('/segments', { method: 'POST', body: req.body });
    if (!out.ok) return res.status(out.status).json(out.json);
    return res.json(out.json);
});

app.post('/resend/contacts', requireApiKey, async (req, res) => {
    if (!guardResendJsonBody(req, res, req.body)) return;
    const out = await resendRestJson('/contacts', { method: 'POST', body: req.body });
    if (!out.ok) return res.status(out.status).json(out.json);
    return res.json(out.json);
});

app.post('/resend/contacts/segment', requireApiKey, async (req, res) => {
    if (!guardResendJsonBody(req, res, req.body)) return;
    const segmentId = req.body?.segmentId ?? req.body?.segment_id;
    if (!segmentId) {
        return res.status(400).json({ error: 'segmentId or segment_id required' });
    }
    const out = await resendRestJson(
        `/segments/${encodeURIComponent(String(segmentId))}/contacts`,
        { method: 'POST', body: req.body },
    );
    if (!out.ok) return res.status(out.status).json(out.json);
    return res.json(out.json);
});

app.post('/resend/broadcasts', requireApiKey, async (req, res) => {
    try {
        if (!resend) {
            return res.status(503).json({ error: 'Resend not configured' });
        }
        const b = req.body;
        if (!b || typeof b !== 'object') {
            return res.status(400).json({ error: 'JSON body required' });
        }
        if (!guardResendJsonBody(req, res, b)) return;
        {
            const fromOverride = typeof b.from === 'string' ? b.from.trim() : '';
            const fromAddr = (fromOverride && fromOverride.includes('@') ? fromOverride : resendFrom) || resendFrom;
            if (!fromAddr) {
                return res.status(503).json({ error: 'Set RESEND_FROM on server or pass from' });
            }
            const segmentId = String(
                b.segmentId ?? b.segment_id ?? b.audienceId ?? b.audience_id ?? '',
            ).trim();
            if (!segmentId) {
                return res.status(400).json({ error: 'segmentId (or audienceId) required' });
            }
            const subject = String(b.subject ?? '').trim();
            if (!subject) {
                return res.status(400).json({ error: 'subject required' });
            }
            const html = typeof b.html === 'string' ? maybeApplyFusionLogoUrl(b.html) : String(b.html ?? '');
            if (!html) {
                return res.status(400).json({ error: 'html required' });
            }
            const text = typeof b.text === 'string' ? b.text : undefined;
            const name = typeof b.name === 'string' ? b.name : undefined;
            const sendNow = b.send === true;
            /**
             * `resend` npm v4 `broadcasts.create` only serializes `audienceId` → `audience_id` and
             * drops `segmentId`, so the API returns "Missing segment_id or audience_id". It also
             * omits `send` / `scheduled_at` on the wire. POST the REST body directly.
             * @type {Record<string, unknown>}
             */
            const broadcastBody = {
                segment_id: segmentId,
                from: fromAddr,
                subject: subject.slice(0, 998),
                html,
            };
            if (name) broadcastBody.name = name.slice(0, 200);
            if (text) broadcastBody.text = text;
            if (sendNow) broadcastBody.send = true;
            if (b.scheduledAt) broadcastBody.scheduled_at = String(b.scheduledAt);
            const out = await resendRestJson('/broadcasts', { method: 'POST', body: broadcastBody });
            if (!out.ok) {
                const errMsg =
                    typeof out.json?.error === 'string' ? out.json.error : 'Resend broadcast error';
                const status = out.status >= 400 && out.status < 600 ? out.status : 502;
                return res.status(status).json({ error: errMsg });
            }
            const created = out.json && typeof out.json === 'object' ? out.json : {};
            return res.json({ ok: true, id: created.id, data: created });
        }
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return res.status(500).json({ error: msg });
    }
});

app.post('/resend/broadcasts/:id/send', requireApiKey, async (req, res) => {
    try {
        if (!resend?.broadcasts?.send) {
            return res.status(501).json({ error: 'Resend SDK has no broadcasts.send' });
        }
        const id = String(req.params.id || '').trim();
        if (!id) {
            return res.status(400).json({ error: 'id required' });
        }
        const { data, error } = await resend.broadcasts.send(id, req.body && typeof req.body === 'object' ? req.body : {});
        if (error) {
            return res.status(502).json({ error: error.message || 'Resend send error' });
        }
        return res.json({ ok: true, data });
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
        const rootPrefix = String(req.body?.rootPrefix || '').replace(/^\/+/, '').replace(/\/?$/, '/');
        const requestedPrefix = rootPrefix === fusionMediaPublicPrefix ? fusionMediaPublicPrefix : s3Prefix;
        if (!key.startsWith(requestedPrefix)) {
            key = `${requestedPrefix}${key}`;
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

app.post('/storage/private-video/presign-upload', requireApiKey, async (req, res) => {
    try {
        if (!s3Client || !s3Bucket) {
            return res.status(503).json({ error: 'S3 not configured' });
        }
        const contentType = req.body?.contentType;
        if (
            typeof contentType !== 'string' ||
            (!/^video\//i.test(contentType) && contentType !== 'application/octet-stream')
        ) {
            return res.status(400).json({ error: 'Invalid contentType (video/* required)' });
        }
        const contentId = safePathPart(req.body?.contentId || 'community-hero', 80) || 'community-hero';
        const fileName = safePrivateVideoFileName(req.body?.fileName);
        const key = `${privateVideoPrefix}${contentId}/${randomUUID()}-${fileName}`;
        const command = new PutObjectCommand({
            Bucket: s3Bucket,
            Key: key,
            ContentType: contentType,
        });
        const putUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return res.json({ putUrl, key, fileName, expiresIn: 3600 });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/credentials|Could not load credentials/i.test(msg)) {
            return res.status(503).json({ error: 'AWS credentials not available for private video upload.' });
        }
        return res.status(500).json({ error: msg });
    }
});

app.post('/storage/private-video/sign-playback', requireApiKey, async (req, res) => {
    try {
        if (!s3Client || !s3Bucket) {
            return res.status(503).json({ error: 'S3 not configured' });
        }
        const key = normalizePrivateVideoKey(req.body?.key);
        if (!key) {
            return res.status(400).json({ error: 'Invalid private video key' });
        }
        const principal = String(req.body?.principal ?? '').trim();
        const allowed = await hasPrivateMediaAccessForPrincipal(principal);
        if (!allowed) {
            return res.status(403).json({ error: 'Membership required' });
        }
        const command = new GetObjectCommand({
            Bucket: s3Bucket,
            Key: key,
        });
        const url = await getSignedUrl(s3Client, command, { expiresIn: privateVideoSignedUrlTtlSec });
        return res.json({
            url,
            expiresAt: new Date(Date.now() + privateVideoSignedUrlTtlSec * 1000).toISOString(),
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/credentials|Could not load credentials/i.test(msg)) {
            return res.status(503).json({ error: 'AWS credentials not available for private video playback.' });
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
