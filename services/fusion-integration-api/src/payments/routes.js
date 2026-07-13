/**
 * PayPal payment routes — all new money movement.
 */
import { randomUUID } from 'node:crypto';
import { Principal } from '@dfinity/principal';
import {
    getPayPalClientId,
    getPayPalMode,
    isPayPalConfigured,
} from './paypalClient.js';
import {
    cancelPayPalSubscriptionAtPeriodEnd,
    capturePayPalOrder,
    centsFromBody,
    createPayPalOrder,
    createPayPalSubscription,
    getPayPalOrder,
    getPayPalSubscription,
    parsePayPalCustomId,
    safePayPalMetaValue,
    subscriptionCustomId,
} from './providers/paypalProvider.js';
import {
    buildPendingPayPalProgramMetadata,
    putPendingPayPalMetadata,
} from './pendingPaymentStore.js';
import { recordVerifiedPayPalOrder, pushPayPalSubscriptionToCanister } from './recordPayment.js';

/** Re-enable when PayPal supports per-user installment plan creation. */
const PROGRAM_PAYMENT_PLAN_START_ENABLED = false;

/**
 * @param {import('express').Express} app
 * @param {{ requireApiKey: import('express').RequestHandler; programPaymentDeps?: object }} opts
 */
export function registerPaymentRoutes(app, opts) {
    const { requireApiKey, programPaymentDeps = {} } = opts;

    app.get('/payments/config', (_req, res) => {
        res.json({
            provider: 'paypal',
            paypalClientId: getPayPalClientId(),
            mode: getPayPalMode(),
            configured: isPayPalConfigured(),
            planBimonthly: process.env.PAYPAL_PLAN_BIMONTHLY_ID || '',
            planAnnual: process.env.PAYPAL_PLAN_ANNUAL_ID || '',
        });
    });

    app.post('/payments/one-time', requireApiKey, async (req, res) => {
        try {
            if (!isPayPalConfigured()) {
                return res.status(503).json({ error: 'PayPal not configured' });
            }
            const amountCents = centsFromBody(req.body?.amountCents ?? req.body?.amount, 'amountCents');
            const rawMeta =
                req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};
            /** @type {Record<string, string>} */
            const metadata = {};
            for (const [k, v] of Object.entries({ ...rawMeta, ...req.body })) {
                if (typeof k !== 'string' || !k.length) continue;
                if (['amountCents', 'amount', 'metadata'].includes(k)) continue;
                metadata[k.slice(0, 40)] =
                    typeof v === 'string' ? v.slice(0, 500) : String(v ?? '').slice(0, 500);
            }
            const pendingMeta = buildPendingPayPalProgramMetadata(
                { ...req.body, ...metadata },
                amountCents,
            );
            const ref = randomUUID();
            await putPendingPayPalMetadata(ref, pendingMeta);
            const order = await createPayPalOrder({
                amountCents,
                description: safePayPalMetaValue(
                    req.body?.description || metadata.purpose || 'Fusion payment',
                    127,
                ),
                customId: ref,
            });
            return res.json({ orderId: order.id, provider: 'paypal' });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return res.status(500).json({ error: msg });
        }
    });

    app.post('/payments/one-time/confirm', requireApiKey, async (req, res) => {
        try {
            if (!isPayPalConfigured()) {
                return res.status(503).json({ error: 'PayPal not configured' });
            }
            const orderId = safePayPalMetaValue(req.body?.orderId, 120);
            if (!orderId) {
                return res.status(400).json({ error: 'orderId required' });
            }
            let order = await getPayPalOrder(orderId);
            if (order.status === 'APPROVED') {
                order = await capturePayPalOrder(orderId);
            }
            if (order.status !== 'COMPLETED') {
                return res.status(409).json({ error: `Order not completed: ${order.status}` });
            }
            const recorded = await recordVerifiedPayPalOrder(order, programPaymentDeps);
            return res.json({ ok: true, orderId, ...recorded });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return res.status(500).json({ error: msg });
        }
    });

    app.post('/payments/paypal/repair', requireApiKey, async (req, res) => {
        try {
            if (!isPayPalConfigured()) {
                return res.status(503).json({ error: 'PayPal not configured' });
            }
            const orderId = safePayPalMetaValue(req.body?.orderId, 120);
            if (!orderId) {
                return res.status(400).json({ error: 'orderId required' });
            }
            const principal = safePayPalMetaValue(req.body?.principal, 500);
            const programId = safePayPalMetaValue(req.body?.programId, 120);
            const applicationId = safePayPalMetaValue(req.body?.applicationId, 240);
            const paymentType = safePayPalMetaValue(req.body?.paymentType, 80);
            if (!principal) return res.status(400).json({ error: 'principal required' });
            if (!programId) return res.status(400).json({ error: 'programId required' });
            if (!applicationId) return res.status(400).json({ error: 'applicationId required' });
            if (!paymentType) return res.status(400).json({ error: 'paymentType required' });
            Principal.fromText(principal);
            const ownFlight =
                req.body?.ownFlight === true ||
                String(req.body?.ownFlight || '').toLowerCase() === 'true';
            const metaOverride = {
                principal,
                programId,
                applicationId,
                paymentType,
                totalDueCents: String(Math.max(0, Math.round(Number(req.body?.totalDueCents || 0)))),
                depositAmountCents: String(
                    Math.max(0, Math.round(Number(req.body?.depositAmountCents || 0))),
                ),
                ownFlight: ownFlight ? 'true' : 'false',
                flightCreditCents: String(
                    Math.max(0, Math.round(Number(req.body?.flightCreditCents || 0))),
                ),
                applicantEmail: safePayPalMetaValue(req.body?.applicantEmail || req.body?.email, 320),
                applicantName: safePayPalMetaValue(req.body?.applicantName || req.body?.fullName, 160),
            };
            const order = await getPayPalOrder(orderId);
            if (order.status !== 'COMPLETED') {
                return res.status(409).json({ error: `Order not completed: ${order.status}` });
            }
            const recorded = await recordVerifiedPayPalOrder(order, programPaymentDeps, metaOverride);
            return res.json({ ok: true, orderId, repaired: true, ...recorded });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return res.status(500).json({ error: msg });
        }
    });

    app.post('/payments/subscription', requireApiKey, async (req, res) => {
        try {
            if (!isPayPalConfigured()) {
                return res.status(503).json({ error: 'PayPal not configured' });
            }
            const result = await createPayPalSubscription(req.body);
            if (!result.payFirstPending && result.principal) {
                try {
                    await pushPayPalSubscriptionToCanister(result.subscription);
                } catch (e) {
                    console.warn('[paypal] create-subscription canister sync:', e);
                }
            }
            return res.json({
                provider: 'paypal',
                subscriptionId: result.subscriptionId,
                approveUrl: result.approveUrl,
                fusionPendingId: result.fusionPendingId,
            });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return res.status(500).json({ error: msg });
        }
    });

    app.post('/payments/subscription/link', requireApiKey, async (req, res) => {
        try {
            if (!isPayPalConfigured()) {
                return res.status(503).json({ error: 'PayPal not configured' });
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
            Principal.fromText(trimmedPrincipal);
            const emailNorm = email.trim().toLowerCase();
            const pendingTrim = fusionPendingId.trim();
            const subId =
                typeof subscriptionIdHint === 'string' && subscriptionIdHint.trim()
                    ? subscriptionIdHint.trim()
                    : '';
            if (!subId) {
                return res.status(400).json({ error: 'subscriptionId required for PayPal link' });
            }
            const sub = await getPayPalSubscription(subId);
            const meta = parsePayPalCustomId(sub.custom_id || '');
            if (meta.fusion_pending_id !== pendingTrim) {
                return res.status(400).json({ error: 'pending id does not match subscription' });
            }
            const subEmail = (sub.subscriber?.email_address || '').toLowerCase();
            if (subEmail && subEmail !== emailNorm) {
                return res.status(403).json({ error: 'email does not match pending checkout' });
            }
            const okStates = ['ACTIVE', 'APPROVED'];
            if (!okStates.includes(String(sub.status || '').toUpperCase())) {
                return res.status(409).json({
                    error: `Subscription not in a linkable state: ${sub.status}`,
                });
            }
            const linkedSub = {
                ...sub,
                custom_id: subscriptionCustomId({
                    ...meta,
                    principal: trimmedPrincipal.slice(0, 63),
                    fusion_pending_id: '',
                }),
            };
            await pushPayPalSubscriptionToCanister(linkedSub);
            return res.json({
                ok: true,
                subscriptionId: sub.id,
                status: sub.status,
            });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return res.status(500).json({ error: msg });
        }
    });

    app.post('/payments/subscription/sync', requireApiKey, async (req, res) => {
        try {
            if (!isPayPalConfigured()) {
                return res.status(503).json({ error: 'PayPal not configured' });
            }
            const principalText = safePayPalMetaValue(req.body?.principal, 500);
            const subscriptionId = safePayPalMetaValue(req.body?.subscriptionId, 120);
            if (!principalText) {
                return res.status(400).json({ error: 'principal required' });
            }
            Principal.fromText(principalText);
            if (!subscriptionId) {
                return res.status(400).json({ error: 'subscriptionId required' });
            }
            const sub = await getPayPalSubscription(subscriptionId);
            const meta = parsePayPalCustomId(sub.custom_id || '');
            if (meta.principal && meta.principal !== principalText) {
                return res.status(403).json({ error: 'subscription principal mismatch' });
            }
            const linked = {
                ...sub,
                custom_id: subscriptionCustomId({ ...meta, principal: principalText }),
            };
            await pushPayPalSubscriptionToCanister(linked);
            return res.json({ ok: true, status: sub.status, subscriptionId: sub.id });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return res.status(500).json({ error: msg });
        }
    });

    app.post('/payments/subscription/cancel', requireApiKey, async (req, res) => {
        try {
            if (!isPayPalConfigured()) {
                return res.status(503).json({ error: 'PayPal not configured' });
            }
            const subscriptionId = safePayPalMetaValue(req.body?.subscriptionId, 120);
            if (!subscriptionId) {
                return res.status(400).json({ error: 'subscriptionId required' });
            }
            await cancelPayPalSubscriptionAtPeriodEnd(subscriptionId);
            const sub = await getPayPalSubscription(subscriptionId);
            await pushPayPalSubscriptionToCanister(sub);
            return res.json({ ok: true, subscriptionId, status: sub.status });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return res.status(500).json({ error: msg });
        }
    });

    app.post('/payments/plan', requireApiKey, async (req, res) => {
        try {
            if (!PROGRAM_PAYMENT_PLAN_START_ENABLED) {
                return res.status(503).json({
                    error: 'Program payment plans are temporarily unavailable for PayPal checkouts',
                });
            }
            if (!isPayPalConfigured()) {
                return res.status(503).json({ error: 'PayPal not configured' });
            }
            const planId = process.env.PAYPAL_PLAN_INSTALLMENT_ID || process.env.PAYPAL_PLAN_BIMONTHLY_ID || '';
            if (!planId) {
                return res.status(503).json({ error: 'PAYPAL_PLAN_INSTALLMENT_ID not configured' });
            }
            const principal = safePayPalMetaValue(req.body?.principal, 500);
            const email = req.body?.email;
            if (!principal) return res.status(400).json({ error: 'principal required' });
            if (typeof email !== 'string' || !email.includes('@')) {
                return res.status(400).json({ error: 'valid email required' });
            }
            Principal.fromText(principal);
            const customData = {
                principal,
                programId: safePayPalMetaValue(req.body?.programId, 120),
                applicationId: safePayPalMetaValue(req.body?.applicationId, 240),
                paymentType: 'plan_installment',
                planId: safePayPalMetaValue(req.body?.planId, 120),
                installmentCount: safePayPalMetaValue(req.body?.installmentCount, 10),
                installmentAmountCents: safePayPalMetaValue(req.body?.installmentAmountCents, 20),
                totalDueCents: safePayPalMetaValue(req.body?.totalDueCents, 20),
                depositAmountCents: safePayPalMetaValue(req.body?.depositAmountCents, 20),
                planStartAt: safePayPalMetaValue(req.body?.planStartAt, 40),
                planEndAt: safePayPalMetaValue(req.body?.planEndAt, 40),
            };
            const { paypalRequest } = await import('./paypalClient.js');
            const sub = await paypalRequest('/v1/billing/subscriptions', {
                method: 'POST',
                body: {
                    plan_id: planId,
                    custom_id: subscriptionCustomId(customData),
                    subscriber: { email_address: email.trim() },
                    application_context: {
                        shipping_preference: 'NO_SHIPPING',
                        user_action: 'SUBSCRIBE_NOW',
                    },
                },
            });
            const approveLink = (sub.links || []).find((l) => l.rel === 'approve');
            return res.json({
                provider: 'paypal',
                subscriptionId: sub.id,
                approveUrl: approveLink?.href || '',
                planId: customData.planId,
            });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return res.status(500).json({ error: msg });
        }
    });

    app.post('/payments/plan/cancel', requireApiKey, async (req, res) => {
        try {
            if (!isPayPalConfigured()) {
                return res.status(503).json({ error: 'PayPal not configured' });
            }
            const subscriptionId = safePayPalMetaValue(req.body?.subscriptionId, 120);
            const planId = safePayPalMetaValue(req.body?.planId, 120);
            if (!subscriptionId) {
                return res.status(400).json({ error: 'subscriptionId required' });
            }
            await cancelPayPalSubscriptionAtPeriodEnd(subscriptionId);
            const actor = await import('../canisterActor.js').then((m) => m.getIntegrationActor());
            if (actor && planId) {
                const now = new Date().toISOString();
                await actor.integrationCancelProgramPaymentPlan(planId, 'cancelled', now);
            }
            return res.json({ ok: true, subscriptionId });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return res.status(500).json({ error: msg });
        }
    });

    app.post('/payments/receipts', requireApiKey, async (req, res) => {
        try {
            if (!isPayPalConfigured()) {
                return res.status(503).json({ error: 'PayPal not configured' });
            }
            const ids = Array.isArray(req.body?.orderIds) ? req.body.orderIds : [];
            const limited = ids.slice(0, 50).map((id) => safePayPalMetaValue(id, 120)).filter(Boolean);
            const receipts = {};
            for (const orderId of limited) {
                try {
                    const order = await getPayPalOrder(orderId);
                    const pu = (order.purchase_units || [])[0];
                    const capture = (pu?.payments?.captures || [])[0];
                    receipts[orderId] = {
                        receiptUrl:
                            (capture?.links || []).find((l) => l.rel === 'self')?.href || '',
                        status: order.status,
                    };
                } catch {
                    receipts[orderId] = { receiptUrl: '', status: 'unknown' };
                }
            }
            return res.json({ receipts });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return res.status(500).json({ error: msg });
        }
    });
}
