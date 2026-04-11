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

const PORT = Number(process.env.PORT || 8787);
/** Always allow these (plus anything in CORS_ORIGINS). Custom domain + local Studio. */
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

const stripeSecret = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

const resendApiKey = process.env.RESEND_API_KEY || '';
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const resendFrom = process.env.RESEND_FROM || '';

const awsRegion = process.env.AWS_REGION || process.env.S3_REGION || '';
const s3Bucket = process.env.S3_BUCKET || '';
const s3PublicBase =
    process.env.S3_PUBLIC_BASE_URL ||
    (s3Bucket && awsRegion
        ? `https://${s3Bucket}.s3.${awsRegion}.amazonaws.com`
        : '');
const s3Prefix = (process.env.S3_KEY_PREFIX || 'studio/').replace(/^\/+/, '');

let s3Client = null;
if (awsRegion && s3Bucket) {
    s3Client = new S3Client({ region: awsRegion });
}

const app = express();
app.set('trust proxy', 1);
app.use(
    cors({
        origin:
            corsOriginsFromEnv.length === 0
                ? true
                : (origin, cb) => {
                      if (!origin || corsAllowList.includes(origin)) {
                          cb(null, true);
                      } else {
                          cb(new Error('Not allowed by CORS'));
                      }
                  },
    })
);
app.use(express.json({ limit: '512kb' }));

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
        resend: resendApiKey ? 'configured' : 'missing',
        s3: s3Client && s3Bucket ? 'configured' : 'missing',
    });
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
        if (!key.startsWith(s3Prefix) && !key.startsWith('studio/')) {
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
        return res.status(500).json({ error: msg });
    }
});

app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
    console.log(`fusion-integration-api listening on ${PORT}`);
});
