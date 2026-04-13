/**
 * Fusion integration API — Stripe Payment Intents, Resend, S3 presigned uploads.
 * Env: see README in this package.
 */
import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import Stripe from 'stripe';
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
async function handleStripeWebhookEvent(event) {
    switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
            const sub = /** @type {import('stripe').Stripe.Subscription} */ (event.data.object);
            await pushSubscriptionToCanister(sub);
            break;
        }
        case 'invoice.paid':
        case 'invoice.payment_failed': {
            const inv = /** @type {import('stripe').Stripe.Invoice} */ (event.data.object);
            const subId = inv.subscription;
            if (typeof subId === 'string' && stripe) {
                const sub = await stripe.subscriptions.retrieve(subId);
                await pushSubscriptionToCanister(sub);
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

/** Bi-monthly (or any) recurring Price from Stripe Dashboard — `price_…` */
app.post('/stripe/create-subscription', requireApiKey, async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Stripe not configured' });
        }
        const priceId = process.env.STRIPE_PRICE_ID || '';
        if (!priceId) {
            return res.status(503).json({ error: 'STRIPE_PRICE_ID not configured' });
        }
        const principal = req.body?.principal;
        const email = req.body?.email;
        if (typeof principal !== 'string' || !principal.trim()) {
            return res.status(400).json({ error: 'principal required' });
        }
        if (typeof email !== 'string' || !email.includes('@')) {
            return res.status(400).json({ error: 'valid email required' });
        }
        const rawMeta = req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};
        /** @type {Record<string, string>} */
        const metadata = { principal: principal.trim().slice(0, 500) };
        for (const [k, v] of Object.entries(rawMeta)) {
            if (typeof k !== 'string' || !k.length) continue;
            metadata[k.slice(0, 40)] =
                typeof v === 'string' ? v.slice(0, 500) : String(v ?? '').slice(0, 500);
        }

        const existing = await stripe.customers.list({ email: email.trim(), limit: 1 });
        let customer;
        if (existing.data.length > 0) {
            customer = existing.data[0];
            if (!customer.metadata?.principal) {
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

        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
            metadata: { principal: metadata.principal },
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

        try {
            await pushSubscriptionToCanister(subscription, customer.id);
        } catch (e) {
            console.warn('[stripe] create-subscription canister sync (webhook may follow):', e);
        }

        return res.json({
            clientSecret,
            subscriptionId: subscription.id,
            customerId: customer.id,
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
 * Find customer by `metadata.principal`, pick the best subscription (active/trialing first), push to canister.
 * @param {import('stripe').Stripe} stripeClient
 * @param {string} principalText
 */
async function syncStripeSubscriptionForPrincipal(stripeClient, principalText) {
    const trimmed = principalText.trim();
    if (!trimmed) {
        return { synced: false, reason: 'invalid_principal' };
    }
    const escaped = escapeStripeMetadataQueryValue(trimmed);
    const search = await stripeClient.customers.search({
        query: `metadata['principal']:'${escaped}'`,
        limit: 1,
    });
    if (!search.data.length) {
        return { synced: false, reason: 'no_stripe_customer' };
    }
    const customer = search.data[0];
    const subs = await stripeClient.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 100,
    });
    if (!subs.data.length) {
        return { synced: false, reason: 'no_subscription', customerId: customer.id };
    }
    /** @param {import('stripe').Stripe.Subscription} s */
    const rank = (s) => {
        if (s.status === 'active' || s.status === 'trialing') return 0;
        if (s.status === 'past_due') return 1;
        if (s.status === 'unpaid') return 2;
        return 3;
    };
    const sorted = [...subs.data].sort((a, b) => {
        const d = rank(a) - rank(b);
        if (d !== 0) return d;
        return b.created - a.created;
    });
    const best = sorted[0];
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
