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
    getPayPalCapture,
    getPayPalOrder,
    getPayPalSubscription,
    membershipPlanDisplay,
    membershipTierFromPayPalPlanId,
    parsePayPalCustomId,
    resolvePayPalOrderForRepair,
    revisePayPalSubscription,
    safePayPalMetaValue,
    subscriptionCustomId,
} from './providers/paypalProvider.js';
import {
    buildPendingPayPalProgramMetadata,
    getPendingPayPalMetadata,
    patchPendingPayPalMetadata,
    putPendingPayPalMetadata,
} from './pendingPaymentStore.js';
import { recordVerifiedPayPalOrder, pushPayPalSubscriptionToCanister } from './recordPayment.js';
import { maybeSendProgramAwardPaymentConfirmationAfterCapture } from './programAwardEmail.js';
import { getIntegrationActor } from '../canisterActor.js';

/** Re-enable when PayPal supports per-user installment plan creation. */
const PROGRAM_PAYMENT_PLAN_START_ENABLED = false;

/**
 * @param {import('express').Express} app
 * @param {{
 *   requireApiKey: import('express').RequestHandler;
 *   programPaymentDeps?: object;
 *   cancelPlatformSubscriptionImmediately?: (principal: string) => Promise<unknown>;
 *   maybeSendProgramAwardPaymentConfirmationAfterCapture?: typeof maybeSendProgramAwardPaymentConfirmationAfterCapture;
 * }} opts
 */
export function registerPaymentRoutes(app, opts) {
    const {
        requireApiKey,
        programPaymentDeps = {},
        cancelPlatformSubscriptionImmediately,
        maybeSendProgramAwardPaymentConfirmationAfterCapture:
            sendAwardPaymentEmail = maybeSendProgramAwardPaymentConfirmationAfterCapture,
    } = opts;

    app.get('/payments/config', (_req, res) => {
        res.json({
            provider: 'paypal',
            paypalClientId: getPayPalClientId(),
            mode: getPayPalMode(),
            configured: isPayPalConfigured(),
            planMonthly: process.env.PAYPAL_SUBSCRIPTION_MONTHLY_ID || '',
            planMonthlyApplication:
                process.env.PAYPAL_SUBSCRIPTION_MONTHLY_APPLICATION_ID || '',
            planQuarterly: process.env.PAYPAL_SUBSCRIPTION_QUARTERLY_ID || '',
            planAnnual:
                process.env.PAYPAL_SUBSCRIPTION_ANNUAL_ID ||
                process.env.PAYPAL_PLAN_ANNUAL_ID ||
                '',
            planBimonthlyLegacy: process.env.PAYPAL_PLAN_BIMONTHLY_ID || '',
            /** @deprecated use planBimonthlyLegacy / planMonthly */
            planBimonthly: process.env.PAYPAL_PLAN_BIMONTHLY_ID || '',
            discountPlans: {
                monthly50off1mo: process.env.PAYPAL_PLAN_MONTHLY_50OFF_1MO_ID || '',
                monthly50off2mo: process.env.PAYPAL_PLAN_MONTHLY_50OFF_2MO_ID || '',
                monthly50off3mo: process.env.PAYPAL_PLAN_MONTHLY_50OFF_3MO_ID || '',
            },
        });
    });

    // ——— Promo code validation ———

    /**
     * Decode Candid PromoDiscountType variant → plain object.
     */
    function decodeDiscountType(dt) {
        if (!dt || typeof dt !== 'object') return { type: 'unknown', value: 0 };
        if ('percentOff' in dt) return { type: 'percentOff', value: Number(dt.percentOff) };
        if ('fixedCentsOff' in dt) return { type: 'fixedCentsOff', value: Number(dt.fixedCentsOff) };
        if ('freeMonths' in dt) return { type: 'freeMonths', value: Number(dt.freeMonths) };
        return { type: 'unknown', value: 0 };
    }

    function buildDiscountDisplayText(promo) {
        const dt = decodeDiscountType(promo.discountType);
        const months = Number(promo.discountDurationMonths || 1);
        const span = months === 1 ? 'first month' : `first ${months} months`;
        if (dt.type === 'percentOff') return `${dt.value}% off ${span}`;
        if (dt.type === 'fixedCentsOff') return `$${(dt.value / 100).toFixed(2)} off ${span}`;
        if (dt.type === 'freeMonths') return `${dt.value} month${dt.value > 1 ? 's' : ''} free`;
        return 'Discount applied';
    }

    /**
     * Resolve the PayPal plan ID when a promo code discount applies.
     *
     * Env vars for discounted monthly plans (50% off):
     *   PAYPAL_PLAN_MONTHLY_50OFF_1MO_ID  — first month 50% off
     *   PAYPAL_PLAN_MONTHLY_50OFF_2MO_ID  — first 2 months 50% off
     *   PAYPAL_PLAN_MONTHLY_50OFF_3MO_ID  — first 3 months 50% off
     *
     * Falls back to standard plan if no discounted plan is configured.
     */
    function resolveDiscountedPayPalPlanId(tier, discountType, durationMonths) {
        const dt = decodeDiscountType(discountType);
        const dur = Number(durationMonths) || 1;

        if (tier === 'monthly' && dt.type === 'percentOff') {
            const key = `PAYPAL_PLAN_MONTHLY_${dt.value}OFF_${dur}MO_ID`;
            const id = process.env[key] || '';
            if (id) return id;
        }

        const genericKey = `PAYPAL_PLAN_${tier.toUpperCase()}_${dt.type === 'percentOff' ? dt.value + 'OFF' : 'DISCOUNT'}_${dur}MO_ID`;
        const genericId = process.env[genericKey] || '';
        if (genericId) return genericId;

        const fallbacks = {
            monthly: process.env.PAYPAL_SUBSCRIPTION_MONTHLY_ID || '',
            quarterly: process.env.PAYPAL_SUBSCRIPTION_QUARTERLY_ID || '',
            annual: process.env.PAYPAL_SUBSCRIPTION_ANNUAL_ID || process.env.PAYPAL_PLAN_ANNUAL_ID || '',
        };
        return fallbacks[tier] || '';
    }

    app.post('/payments/validate-promo-code', requireApiKey, async (req, res) => {
        try {
            const code = (req.body?.code || '').trim().toUpperCase();
            if (!code) {
                return res.status(400).json({ valid: false, reason: 'missing code' });
            }
            const actor = await getIntegrationActor();
            if (!actor || typeof actor.validatePromoCode !== 'function') {
                return res.status(503).json({ valid: false, reason: 'canister unavailable' });
            }
            const result = await actor.validatePromoCode(code);
            if (result && typeof result === 'object' && 'ok' in result) {
                const promo = result.ok;
                const dt = decodeDiscountType(promo.discountType);
                return res.json({
                    valid: true,
                    code: String(promo.code || ''),
                    codeType: promo.codeType && typeof promo.codeType === 'object'
                        ? Object.keys(promo.codeType)[0] || 'promo'
                        : 'promo',
                    discountType: dt,
                    discountDurationMonths: Number(promo.discountDurationMonths || 1),
                    displayText: buildDiscountDisplayText(promo),
                    discountedPlanIds: {
                        monthly: resolveDiscountedPayPalPlanId('monthly', promo.discountType, promo.discountDurationMonths),
                        quarterly: resolveDiscountedPayPalPlanId('quarterly', promo.discountType, promo.discountDurationMonths),
                        annual: resolveDiscountedPayPalPlanId('annual', promo.discountType, promo.discountDurationMonths),
                    },
                });
            }
            const reason = result && typeof result === 'object'
                ? Object.keys(result)[0] || 'unknown'
                : 'unknown';
            return res.json({ valid: false, reason });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error('[promo] validate-promo-code error:', msg);
            return res.status(500).json({ valid: false, reason: 'server error' });
        }
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
                if (['amountCents', 'amount', 'metadata', 'payloadJson', 'payload'].includes(k)) continue;
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
            /** @type {Record<string, string>} */
            const metaOverride = {};
            const principal = safePayPalMetaValue(req.body?.principal, 500);
            const programId = safePayPalMetaValue(req.body?.programId, 120);
            const applicationId = safePayPalMetaValue(req.body?.applicationId, 240);
            const paymentType = safePayPalMetaValue(req.body?.paymentType, 80);
            const payloadJsonRaw =
                typeof req.body?.payloadJson === 'string'
                    ? req.body.payloadJson
                    : req.body?.payload && typeof req.body.payload === 'object'
                      ? JSON.stringify(req.body.payload)
                      : '';
            if (principal) {
                Principal.fromText(principal);
                metaOverride.principal = principal;
            }
            if (programId) metaOverride.programId = programId;
            if (applicationId) metaOverride.applicationId = applicationId;
            if (paymentType) metaOverride.paymentType = paymentType;
            if (payloadJsonRaw) {
                metaOverride.payloadJson = safePayPalMetaValue(payloadJsonRaw, 100_000);
            }

            const pu = (order.purchase_units || [])[0] || {};
            const metaRef = safePayPalMetaValue(pu.custom_id, 127);
            const pending = metaRef ? await getPendingPayPalMetadata(metaRef) : {};
            const merged = { ...pending, ...metaOverride };
            const principalText = safePayPalMetaValue(merged.principal, 500);
            let paymentTypeFinal = safePayPalMetaValue(merged.paymentType, 80);
            const applicationIdFinal = safePayPalMetaValue(merged.applicationId, 240);
            const purposeFinal = safePayPalMetaValue(merged.purpose, 80);
            const awardEntry =
                paymentTypeFinal === 'program_award_entry' ||
                purposeFinal === 'program_award_entry' ||
                applicationIdFinal.startsWith('award:');
            if (awardEntry && !paymentTypeFinal) {
                paymentTypeFinal = 'program_award_entry';
                metaOverride.paymentType = paymentTypeFinal;
            }

            const capture = (pu.payments?.captures || [])[0] || {};
            const captureId = safePayPalMetaValue(capture.id, 120);
            const amountCents = Math.max(
                0,
                Math.round(
                    Number.parseFloat(String(capture.amount?.value || pu.amount?.value || '0')) * 100,
                ),
            );
            const mergedForEmail = {
                ...merged,
                paymentType: paymentTypeFinal || merged.paymentType,
                captured: 'true',
                captureId,
                capturedAt: merged.capturedAt || new Date().toISOString(),
            };

            /** @type {{ awardPaymentEmailSent: boolean }} */
            let awardEmail = { awardPaymentEmailSent: false };
            if (awardEntry && typeof sendAwardPaymentEmail === 'function') {
                awardEmail = await sendAwardPaymentEmail({
                    metaRef,
                    merged: mergedForEmail,
                    orderId,
                    amountCents: amountCents || Number(merged.amountCents) || 5000,
                    captureId,
                    awaitingAccountLink: !principalText,
                    patchPending: patchPendingPayPalMetadata,
                    ...(programPaymentDeps.awardEmailDeps || {}),
                });
                if (awardEmail.awardPaymentEmailSent) {
                    mergedForEmail.awardPaymentEmailSent = 'true';
                    mergedForEmail.awardPaymentEmailSentAt = new Date().toISOString();
                }
            }

            // Guest Program Draw: capture now; attach principal + ledger on a later confirm.
            if (awardEntry && !principalText) {
                if (metaRef) {
                    await patchPendingPayPalMetadata(metaRef, {
                        ...mergedForEmail,
                        paymentType: paymentTypeFinal,
                        captured: 'true',
                        captureId,
                        capturedAt: mergedForEmail.capturedAt,
                    });
                }
                return res.json({
                    ok: true,
                    orderId,
                    captured: true,
                    awaitingPrincipal: true,
                    chargeId: captureId,
                    awardPaymentEmailSent: Boolean(awardEmail.awardPaymentEmailSent),
                });
            }

            const recorded = await recordVerifiedPayPalOrder(
                order,
                programPaymentDeps,
                metaOverride,
            );
            return res.json({
                ok: true,
                orderId,
                captured: true,
                awaitingPrincipal: false,
                awardPaymentEmailSent: Boolean(awardEmail.awardPaymentEmailSent),
                ...recorded,
            });
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
            const captureId = safePayPalMetaValue(
                req.body?.captureId || req.body?.transactionId,
                120,
            );
            if (!orderId && !captureId) {
                return res.status(400).json({ error: 'orderId or captureId required' });
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
            const payloadJsonRaw =
                typeof req.body?.payloadJson === 'string'
                    ? req.body.payloadJson
                    : req.body?.payload && typeof req.body.payload === 'object'
                      ? JSON.stringify(req.body.payload)
                      : '';
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
                payloadJson: safePayPalMetaValue(payloadJsonRaw, 100_000),
                currentQuarterKey: safePayPalMetaValue(req.body?.currentQuarterKey, 20),
            };
            const resolved = await resolvePayPalOrderForRepair({
                orderId,
                captureId,
                transactionId: captureId,
            });
            const order = resolved.order;
            if (order.status !== 'COMPLETED') {
                return res.status(409).json({ error: `Order not completed: ${order.status}` });
            }
            const puRepair = (order.purchase_units || [])[0] || {};
            const metaRefRepair = safePayPalMetaValue(puRepair.custom_id, 127);
            const pendingRepair = metaRefRepair ? await getPendingPayPalMetadata(metaRefRepair) : {};
            const mergedRepair = { ...pendingRepair, ...metaOverride };
            const awardRepair =
                paymentType === 'program_award_entry' ||
                safePayPalMetaValue(mergedRepair.purpose, 80) === 'program_award_entry' ||
                applicationId.startsWith('award:');
            /** @type {{ awardPaymentEmailSent: boolean }} */
            let awardEmailRepair = { awardPaymentEmailSent: false };
            if (awardRepair && typeof sendAwardPaymentEmail === 'function') {
                const captureRepair = (puRepair.payments?.captures || [])[0] || {};
                const amountRepair = Math.max(
                    0,
                    Math.round(
                        Number.parseFloat(
                            String(captureRepair.amount?.value || puRepair.amount?.value || '0'),
                        ) * 100,
                    ),
                );
                awardEmailRepair = await sendAwardPaymentEmail({
                    metaRef: metaRefRepair,
                    merged: {
                        ...mergedRepair,
                        paymentType,
                        captured: 'true',
                        captureId: safePayPalMetaValue(
                            resolved.captureId || captureId || captureRepair.id,
                            120,
                        ),
                        capturedAt: mergedRepair.capturedAt || new Date().toISOString(),
                    },
                    orderId: resolved.orderId,
                    amountCents: amountRepair || Number(mergedRepair.amountCents) || 5000,
                    captureId: safePayPalMetaValue(resolved.captureId || captureId, 120),
                    awaitingAccountLink: false,
                    patchPending: patchPendingPayPalMetadata,
                    ...(programPaymentDeps.awardEmailDeps || {}),
                });
            }
            const recorded = await recordVerifiedPayPalOrder(order, programPaymentDeps, metaOverride);
            return res.json({
                ok: true,
                orderId: resolved.orderId,
                resolvedFrom: resolved.resolvedFrom,
                captureId: resolved.captureId || captureId || '',
                repaired: true,
                awardPaymentEmailSent: Boolean(awardEmailRepair.awardPaymentEmailSent),
                ...recorded,
            });
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

            // Resolve discounted plan ID if a promo code is provided
            const promoCodeRaw = typeof req.body?.promoCode === 'string' ? req.body.promoCode.trim().toUpperCase() : '';
            let discountedPlanId = '';
            if (promoCodeRaw) {
                try {
                    const actor = await getIntegrationActor();
                    if (actor && typeof actor.validatePromoCode === 'function') {
                        const pcResult = await actor.validatePromoCode(promoCodeRaw);
                        if (pcResult && typeof pcResult === 'object' && 'ok' in pcResult) {
                            const pc = pcResult.ok;
                            const tierRaw = req.body?.subscriptionTier;
                            let tier = typeof tierRaw === 'string' ? tierRaw.trim().toLowerCase() : 'monthly';
                            if (!tier || tier === 'bimonthly') tier = 'monthly';
                            discountedPlanId = resolveDiscountedPayPalPlanId(tier, pc.discountType, pc.discountDurationMonths);
                        }
                    }
                } catch (e) {
                    console.warn('[paypal] promo code plan resolution failed:', e instanceof Error ? e.message : e);
                }
            }

            const body = discountedPlanId
                ? { ...req.body, overridePlanId: discountedPlanId, promoCode: promoCodeRaw }
                : req.body;
            const result = await createPayPalSubscription(body);
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
            // Soft-fail canister sync (same as Stripe link) so II join can finish
            // even if Motoko is briefly unavailable; client can call /sync later.
            try {
                await pushPayPalSubscriptionToCanister(linkedSub);
            } catch (e) {
                console.warn(
                    '[paypal] link-subscription canister sync (client may retry sync):',
                    e instanceof Error ? e.message : e,
                );
            }
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
            const planId = String(sub.plan_id || '').trim();
            const tier =
                membershipTierFromPayPalPlanId(planId) ||
                (typeof meta.tier === 'string' ? meta.tier.trim().toLowerCase() : '');
            const linked = {
                ...sub,
                custom_id: subscriptionCustomId({
                    ...meta,
                    principal: principalText,
                    ...(tier ? { tier } : {}),
                }),
            };
            await pushPayPalSubscriptionToCanister(linked);
            return res.json({
                ok: true,
                status: sub.status,
                subscriptionId: sub.id,
                planId,
                tier: tier || '',
            });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return res.status(500).json({ error: msg });
        }
    });

    /**
     * Studio Live PayPal check — no canister write.
     * Body: { subscriptionId } → status + inferred tier (monthly/quarterly/annual).
     */
    app.post('/payments/subscription/status', requireApiKey, async (req, res) => {
        try {
            if (!isPayPalConfigured()) {
                return res.status(503).json({ error: 'PayPal not configured' });
            }
            const subscriptionId = safePayPalMetaValue(req.body?.subscriptionId, 120);
            if (!subscriptionId) {
                return res.status(400).json({ error: 'subscriptionId required' });
            }
            const sub = await getPayPalSubscription(subscriptionId);
            const meta = parsePayPalCustomId(sub.custom_id || '');
            const planId = String(sub.plan_id || '').trim();
            const tierFromPlan = membershipTierFromPayPalPlanId(planId);
            const tierFromMeta =
                typeof meta.tier === 'string' ? meta.tier.trim().toLowerCase() : '';
            const tier = tierFromPlan || tierFromMeta || '';
            const status = String(sub.status || '');
            const membershipActive = ['ACTIVE', 'APPROVED'].includes(status.toUpperCase());
            return res.json({
                ok: true,
                membershipActive,
                status,
                subscriptionId: sub.id,
                planId,
                tier,
                subscriberEmail: sub.subscriber?.email_address || null,
                nextBillingTime: sub.billing_info?.next_billing_time || null,
                customIdMeta: {
                    principal: typeof meta.principal === 'string' ? meta.principal : null,
                    fusion_pending_id:
                        typeof meta.fusion_pending_id === 'string'
                            ? meta.fusion_pending_id
                            : null,
                    tier: tierFromMeta || null,
                },
            });
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

    /**
     * Studio / ops: cancel Stripe + PayPal platform membership for a program-confirmed member.
     * Body: { principal }
     */
    app.post('/payments/subscription/cancel-for-program', requireApiKey, async (req, res) => {
        try {
            const principalText = safePayPalMetaValue(req.body?.principal, 500);
            if (!principalText) {
                return res.status(400).json({ error: 'principal required' });
            }
            Principal.fromText(principalText);
            if (typeof cancelPlatformSubscriptionImmediately !== 'function') {
                return res.status(503).json({ error: 'Cancel helper not configured' });
            }
            const result = await cancelPlatformSubscriptionImmediately(principalText);
            return res.json({ ok: Boolean(result?.ok), principal: principalText, ...result });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return res.status(500).json({ error: msg });
        }
    });

    app.post('/payments/subscription/revise', requireApiKey, async (req, res) => {
        try {
            if (!isPayPalConfigured()) {
                return res.status(503).json({ error: 'PayPal not configured' });
            }
            const principalText = safePayPalMetaValue(req.body?.principal, 500);
            const subscriptionId = safePayPalMetaValue(req.body?.subscriptionId, 120);
            const targetTier = safePayPalMetaValue(req.body?.targetTier, 24).toLowerCase();
            if (!principalText) {
                return res.status(400).json({ error: 'principal required' });
            }
            Principal.fromText(principalText);
            if (!subscriptionId) {
                return res.status(400).json({ error: 'subscriptionId required' });
            }
            if (!['monthly', 'quarterly', 'annual'].includes(targetTier)) {
                return res.status(400).json({
                    error: 'targetTier must be monthly, quarterly, or annual',
                });
            }
            const sub = await getPayPalSubscription(subscriptionId);
            const meta = parsePayPalCustomId(sub.custom_id || '');
            if (meta.principal && meta.principal !== principalText) {
                return res.status(403).json({ error: 'subscription principal mismatch' });
            }
            const returnUrl = safePayPalMetaValue(req.body?.returnUrl, 500);
            const cancelUrl = safePayPalMetaValue(req.body?.cancelUrl, 500);
            const revised = await revisePayPalSubscription(subscriptionId, targetTier, {
                returnUrl: returnUrl || undefined,
                cancelUrl: cancelUrl || undefined,
            });
            if (!revised.approveUrl) {
                return res.status(502).json({
                    error: 'PayPal revise did not return an approve URL',
                });
            }
            return res.json({
                ok: true,
                approveUrl: revised.approveUrl,
                targetTier: revised.targetTier,
                planId: revised.planId,
                subscriptionId,
            });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            const status = /PAYMENT_IN_PROGRESS/i.test(msg) ? 409 : 500;
            return res.status(status).json({ error: msg });
        }
    });

    app.post('/payments/member-billing-summary', requireApiKey, async (req, res) => {
        try {
            if (!isPayPalConfigured()) {
                return res.status(503).json({ ok: false, reason: 'PayPal not configured' });
            }
            const principalText = safePayPalMetaValue(req.body?.principal, 500);
            const subscriptionId = safePayPalMetaValue(req.body?.subscriptionId, 120);
            if (!principalText) {
                return res.status(400).json({ ok: false, reason: 'principal required' });
            }
            Principal.fromText(principalText);
            if (!subscriptionId) {
                return res.json({ ok: false, reason: 'no_subscription' });
            }
            const sub = await getPayPalSubscription(subscriptionId);
            const meta = parsePayPalCustomId(sub.custom_id || '');
            if (meta.principal && meta.principal !== principalText) {
                return res.status(403).json({ ok: false, reason: 'subscription principal mismatch' });
            }
            const planId = String(sub.plan_id || '').trim();
            const tierFromMeta = String(meta.tier || '').toLowerCase();
            const membershipTier =
                membershipTierFromPayPalPlanId(planId) ||
                (['monthly', 'quarterly', 'annual', 'bimonthly'].includes(tierFromMeta)
                    ? tierFromMeta
                    : '');
            const display = membershipPlanDisplay(membershipTier);
            const status = String(sub.status || '').toLowerCase();
            const nextBilling =
                sub.billing_info?.next_billing_time ||
                sub.billing_info?.final_payment_time ||
                '';
            return res.json({
                ok: true,
                provider: 'paypal',
                subscriptionId: sub.id,
                status,
                cancelAtPeriodEnd: Boolean(sub.status === 'CANCELLED' || sub.status === 'SUSPENDED'),
                currentPeriodEnd: typeof nextBilling === 'string' ? nextBilling : '',
                planId,
                membershipTier,
                planLabel: display.planLabel,
                planPriceLine: display.planPriceLine,
                paymentMethod: null,
            });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return res.status(500).json({ ok: false, reason: msg });
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

    /**
     * Fetch actual transaction fees from PayPal / Stripe for a batch of ledger rows.
     * Body: { ledgerRows: [{ id, paymentProvider, externalPaymentId, externalChargeId }] }
     * Returns: { results: [{ id, feeCents, provider, error? }] }
     */
    app.post('/payments/sync-program-fees', requireApiKey, async (req, res) => {
        try {
            const rows = Array.isArray(req.body?.ledgerRows) ? req.body.ledgerRows.slice(0, 100) : [];
            const results = [];
            for (const row of rows) {
                const id = safePayPalMetaValue(row?.id, 120);
                const provider = String(row?.paymentProvider || '').toLowerCase();
                const externalPaymentId = safePayPalMetaValue(row?.externalPaymentId, 120);
                const externalChargeId = safePayPalMetaValue(row?.externalChargeId, 120);
                if (!id) continue;
                try {
                    if (provider === 'paypal') {
                        if (!externalChargeId) {
                            results.push({ id, feeCents: 0, provider, error: 'no captureId' });
                            continue;
                        }
                        const capture = await getPayPalCapture(externalChargeId);
                        const breakdown = capture?.seller_receivable_breakdown;
                        const feeValue = breakdown?.paypal_fee?.value;
                        const feeCents = feeValue
                            ? Math.round(parseFloat(feeValue) * 100)
                            : 0;
                        results.push({ id, feeCents, provider });
                    } else if (provider === 'stripe') {
                        if (!externalPaymentId) {
                            results.push({ id, feeCents: 0, provider, error: 'no paymentIntentId' });
                            continue;
                        }
                        results.push({ id, feeCents: 0, provider, error: 'stripe_deferred' });
                    } else {
                        results.push({ id, feeCents: 0, provider, error: 'unknown provider' });
                    }
                } catch (e) {
                    const msg = e instanceof Error ? e.message : String(e);
                    results.push({ id, feeCents: 0, provider, error: msg });
                }
            }
            return res.json({ ok: true, results });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return res.status(500).json({ error: msg });
        }
    });
}
