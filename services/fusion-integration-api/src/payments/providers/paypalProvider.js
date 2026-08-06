import { randomUUID } from 'node:crypto';
import { paypalRequest } from '../paypalClient.js';

/**
 * @param {unknown} value
 * @param {number} [max]
 */
export function safePayPalMetaValue(value, max = 500) {
    return String(value ?? '').trim().slice(0, max);
}

/**
 * @param {unknown} value
 * @param {string} fieldName
 */
export function centsFromBody(value, fieldName) {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n) || n < 50) {
        throw new Error(`${fieldName} must be at least 50 cents`);
    }
    return Math.round(n);
}

/**
 * @param {Record<string, string>} base
 * @param {Record<string, string>} extra
 */
function mergeCustomId(base, extra) {
    const merged = { ...base, ...extra };
    return JSON.stringify(merged).slice(0, 127);
}

/**
 * PayPal subscription custom_id — prioritize principal / pending id over email (email is on subscriber).
 * @param {Record<string, string>} customData
 */
export function subscriptionCustomId(customData) {
    /** @type {Record<string, string>} */
    const essential = {};
    if (customData.principal) {
        essential.principal = safePayPalMetaValue(customData.principal, 63);
    }
    if (customData.fusion_pending_id) {
        essential.fusion_pending_id = safePayPalMetaValue(customData.fusion_pending_id, 36);
    }
    const tierRaw = String(customData.tier || '')
        .trim()
        .toLowerCase();
    if (
        tierRaw === 'monthly' ||
        tierRaw === 'quarterly' ||
        tierRaw === 'annual' ||
        tierRaw === 'bimonthly'
    ) {
        essential.tier = tierRaw;
    }
    const planIdRaw = String(customData.plan_id || customData.planId || '').trim();
    if (planIdRaw) {
        essential.plan_id = safePayPalMetaValue(planIdRaw, 40);
    }
    for (const [k, v] of Object.entries(customData)) {
        if (
            k === 'principal' ||
            k === 'fusion_pending_id' ||
            k === 'pending_email' ||
            k === 'tier' ||
            k === 'plan_id' ||
            k === 'planId'
        ) {
            continue;
        }
        if (typeof k !== 'string' || !k.length) continue;
        essential[k.slice(0, 24)] = safePayPalMetaValue(v, 40);
    }
    let json = JSON.stringify(essential);
    if (json.length <= 127) return json;
    delete essential.pending_email;
    json = JSON.stringify(essential);
    if (json.length <= 127) return json;
    const minimal = {};
    if (essential.principal) minimal.principal = essential.principal;
    if (essential.fusion_pending_id) minimal.fusion_pending_id = essential.fusion_pending_id;
    if (essential.tier) minimal.tier = essential.tier;
    json = JSON.stringify(minimal);
    if (json.length <= 127 && essential.plan_id) {
        const withPlan = { ...minimal, plan_id: essential.plan_id };
        const j2 = JSON.stringify(withPlan);
        if (j2.length <= 127) return j2;
    }
    return json.slice(0, 127);
}

/**
 * @param {object} body
 * @param {number} amountCents
 */
export function programPaymentCustomId(body, amountCents) {
    const paymentType = safePayPalMetaValue(body?.paymentType, 80);
    return mergeCustomId(
        {
            principal: safePayPalMetaValue(body?.principal, 500),
            programId: safePayPalMetaValue(body?.programId, 120),
            applicationId: safePayPalMetaValue(body?.applicationId, 240),
            paymentType,
            amountCents: String(amountCents),
            totalDueCents: safePayPalMetaValue(body?.totalDueCents, 20),
            depositAmountCents: safePayPalMetaValue(body?.depositAmountCents, 20),
            ownFlight: safePayPalMetaValue(body?.ownFlight, 10),
            flightCreditCents: safePayPalMetaValue(body?.flightCreditCents, 20),
            applicantEmail: safePayPalMetaValue(body?.applicantEmail, 320),
            applicantName: safePayPalMetaValue(body?.applicantName, 160),
            purpose: safePayPalMetaValue(body?.purpose, 80),
        },
        {},
    );
}

/**
 * @param {{ amountCents: number; description?: string; customId?: string; metadata?: Record<string, string> }} opts
 */
export async function createPayPalOrder(opts) {
    const amountCents = opts.amountCents;
    const customId =
        opts.customId ||
        (opts.metadata ? mergeCustomId(opts.metadata, {}) : undefined);
    const order = await paypalRequest('/v2/checkout/orders', {
        method: 'POST',
        body: {
            intent: 'CAPTURE',
            purchase_units: [
                {
                    amount: {
                        currency_code: 'USD',
                        value: (amountCents / 100).toFixed(2),
                    },
                    description: safePayPalMetaValue(opts.description || 'Fusion payment', 127),
                    custom_id: customId,
                },
            ],
            application_context: {
                shipping_preference: 'NO_SHIPPING',
                user_action: 'PAY_NOW',
            },
        },
    });
    return order;
}

/**
 * @param {string} orderId
 */
export async function capturePayPalOrder(orderId) {
    return paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
        method: 'POST',
        body: {},
    });
}

/**
 * @param {string} orderId
 */
export async function getPayPalOrder(orderId) {
    return paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
        method: 'GET',
    });
}

/**
 * @param {string} captureId
 */
export async function getPayPalCapture(captureId) {
    return paypalRequest(`/v2/payments/captures/${encodeURIComponent(captureId)}`, {
        method: 'GET',
    });
}

/**
 * Resolve a completed PayPal order for repair/backfill.
 * Accepts order id directly, or a capture/transaction id (looks up related order).
 * @param {{ orderId?: string, captureId?: string, transactionId?: string }} refs
 */
export async function resolvePayPalOrderForRepair(refs = {}) {
    const orderRef = safePayPalMetaValue(refs.orderId, 120);
    const captureRef = safePayPalMetaValue(refs.captureId || refs.transactionId, 120);
    const tryOrder = async (id) => {
        const order = await getPayPalOrder(id);
        return { order, resolvedFrom: 'orderId', orderId: order.id };
    };
    const tryCapture = async (id) => {
        const capture = await getPayPalCapture(id);
        const relatedOrderId = safePayPalMetaValue(
            capture?.supplementary_data?.related_ids?.order_id,
            120,
        );
        if (!relatedOrderId) {
            throw new Error(`PayPal capture ${id} has no related order_id`);
        }
        const order = await getPayPalOrder(relatedOrderId);
        return { order, resolvedFrom: 'captureId', orderId: order.id, captureId: id };
    };

    if (orderRef) {
        try {
            return await tryOrder(orderRef);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (/404/.test(msg)) {
                return tryCapture(orderRef);
            }
            throw e;
        }
    }
    if (captureRef) {
        return tryCapture(captureRef);
    }
    throw new Error('orderId or captureId required');
}

/**
 * @param {string} subscriptionId
 */
export async function getPayPalSubscription(subscriptionId) {
    return paypalRequest(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`, {
        method: 'GET',
    });
}

/**
 * New checkout tiers. Legacy bi-monthly is detection-only (not creatable here).
 * Prefers PAYPAL_SUBSCRIPTION_* env; falls back to PAYPAL_PLAN_ANNUAL_ID for annual.
 * @param {string} tier
 * @returns {string}
 */
export function paypalPlanIdForTier(tier) {
    const t = String(tier || '')
        .trim()
        .toLowerCase();
    if (t === 'monthly_application') {
        return process.env.PAYPAL_SUBSCRIPTION_MONTHLY_APPLICATION_ID || '';
    }
    if (t === 'monthly') {
        return process.env.PAYPAL_SUBSCRIPTION_MONTHLY_ID || '';
    }
    if (t === 'quarterly') {
        return process.env.PAYPAL_SUBSCRIPTION_QUARTERLY_ID || '';
    }
    if (t === 'annual') {
        return (
            process.env.PAYPAL_SUBSCRIPTION_ANNUAL_ID ||
            process.env.PAYPAL_PLAN_ANNUAL_ID ||
            ''
        );
    }
    return '';
}

/**
 * @param {string} planId
 * @returns {'monthly' | 'quarterly' | 'annual' | 'bimonthly' | ''}
 */
export function membershipTierFromPayPalPlanId(planId) {
    const id = String(planId || '').trim();
    if (!id) return '';
    if (id === String(process.env.PAYPAL_SUBSCRIPTION_MONTHLY_ID || '').trim()) return 'monthly';
    if (id === String(process.env.PAYPAL_SUBSCRIPTION_MONTHLY_APPLICATION_ID || '').trim()) {
        return 'monthly';
    }
    if (id === String(process.env.PAYPAL_SUBSCRIPTION_QUARTERLY_ID || '').trim()) return 'quarterly';
    if (
        id === String(process.env.PAYPAL_SUBSCRIPTION_ANNUAL_ID || '').trim() ||
        id === String(process.env.PAYPAL_PLAN_ANNUAL_ID || '').trim()
    ) {
        return 'annual';
    }
    if (id === String(process.env.PAYPAL_PLAN_BIMONTHLY_ID || '').trim()) return 'bimonthly';
    return '';
}

/**
 * @param {'monthly' | 'quarterly' | 'annual' | 'bimonthly' | string} tier
 */
export function membershipPlanDisplay(tier) {
    const t = String(tier || '').toLowerCase();
    if (t === 'bimonthly') {
        return { planLabel: 'Bi-monthly (legacy)', planPriceLine: '$50 every 2 months' };
    }
    if (t === 'monthly') {
        return { planLabel: 'Monthly membership', planPriceLine: '$30 per month' };
    }
    if (t === 'quarterly') {
        return { planLabel: 'Quarterly membership', planPriceLine: '$75 per quarter' };
    }
    if (t === 'annual') {
        return { planLabel: 'Annual membership', planPriceLine: '$260 per year' };
    }
    return { planLabel: 'Membership', planPriceLine: '' };
}

/**
 * @param {object} reqBody
 */
export async function createPayPalSubscription(reqBody) {
    const tierRaw = reqBody?.subscriptionTier;
    let tier = typeof tierRaw === 'string' ? tierRaw.trim().toLowerCase() : '';
    // Migrate legacy default: new checkouts default to monthly
    if (!tier || tier === 'bimonthly' || tier === 'bi_monthly') tier = 'monthly';
    if (
        tier !== 'monthly' &&
        tier !== 'monthly_application' &&
        tier !== 'quarterly' &&
        tier !== 'annual'
    ) {
        throw new Error(
            'Invalid subscriptionTier (use monthly, monthly_application, quarterly, or annual)',
        );
    }
    const planId = paypalPlanIdForTier(tier);
    if (!planId) {
        const envName =
            tier === 'annual'
                ? 'PAYPAL_SUBSCRIPTION_ANNUAL_ID'
                : tier === 'quarterly'
                  ? 'PAYPAL_SUBSCRIPTION_QUARTERLY_ID'
                  : tier === 'monthly_application'
                    ? 'PAYPAL_SUBSCRIPTION_MONTHLY_APPLICATION_ID'
                    : 'PAYPAL_SUBSCRIPTION_MONTHLY_ID';
        throw new Error(`${envName} not configured`);
    }
    /** Motoko / billing summary tier (application add-on still stores as monthly). */
    const membershipTier = tier === 'monthly_application' ? 'monthly' : tier;
    const principalRaw = reqBody?.principal;
    const principal =
        typeof principalRaw === 'string' && principalRaw.trim() ? principalRaw.trim().slice(0, 500) : '';
    const payFirstFlag =
        reqBody?.payFirst === true ||
        reqBody?.payFirst === 'true' ||
        String(reqBody?.payFirst || '').toLowerCase() === 'true';
    const email = reqBody?.email;
    if (typeof email !== 'string' || !email.includes('@')) {
        throw new Error('valid email required');
    }
    const payFirstPending = payFirstFlag || !principal;
    const fusionPendingId = payFirstPending ? randomUUID() : '';
    const rawMeta =
        reqBody?.metadata && typeof reqBody.metadata === 'object' ? reqBody.metadata : {};
    /** @type {Record<string, string>} */
    const customData = {
        pending_email: email.trim().slice(0, 500),
        tier: membershipTier.slice(0, 16),
        // Short plan id for fallback when PayPal resource omits plan_id on early fetch.
        plan_id: planId.slice(0, 40),
    };
    if (payFirstPending) {
        customData.fusion_pending_id = fusionPendingId;
    } else {
        customData.principal = principal;
    }
    for (const [k, v] of Object.entries(rawMeta)) {
        if (typeof k === 'string' && k.length) {
            customData[k.slice(0, 40)] =
                typeof v === 'string' ? v.slice(0, 500) : String(v ?? '').slice(0, 500);
        }
    }
    const sub = await paypalRequest('/v1/billing/subscriptions', {
        method: 'POST',
        body: {
            plan_id: planId,
            custom_id: subscriptionCustomId(customData),
            subscriber: {
                email_address: email.trim(),
            },
            application_context: {
                shipping_preference: 'NO_SHIPPING',
                user_action: 'SUBSCRIBE_NOW',
            },
        },
    });
    const approveLink = (sub.links || []).find((l) => l.rel === 'approve');
    return {
        subscription: sub,
        subscriptionId: sub.id,
        approveUrl: approveLink?.href || '',
        fusionPendingId: payFirstPending ? fusionPendingId : undefined,
        payFirstPending,
        principal,
        customData,
    };
}

/**
 * Cancel a PayPal billing subscription (stops future billing).
 * @param {string} subscriptionId
 * @param {string} [reason]
 */
export async function cancelPayPalSubscription(
    subscriptionId,
    reason = 'Program deposit confirmed — membership complimentary',
) {
    return paypalRequest(
        `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
        {
            method: 'POST',
            body: { reason: String(reason || 'Subscription cancelled').slice(0, 128) },
        },
    );
}

/**
 * @param {string} subscriptionId
 * @deprecated Prefer cancelPayPalSubscription — PayPal /cancel stops future billing immediately.
 */
export async function cancelPayPalSubscriptionAtPeriodEnd(subscriptionId) {
    return cancelPayPalSubscription(subscriptionId, 'Member requested cancellation at period end');
}

/**
 * Revise subscription to a new plan (buyer must approve via returned approve URL).
 * @param {string} subscriptionId
 * @param {string} targetTier monthly | quarterly | annual
 * @param {{ returnUrl?: string, cancelUrl?: string }} [opts]
 */
export async function revisePayPalSubscription(subscriptionId, targetTier, opts = {}) {
    const tier = String(targetTier || '')
        .trim()
        .toLowerCase();
    if (tier !== 'monthly' && tier !== 'quarterly' && tier !== 'annual') {
        throw new Error('Invalid targetTier (use monthly, quarterly, or annual)');
    }
    const planId = paypalPlanIdForTier(tier);
    if (!planId) {
        throw new Error(`PayPal plan not configured for tier: ${tier}`);
    }
    /** @type {Record<string, unknown>} */
    const body = { plan_id: planId };
    const returnUrl = typeof opts.returnUrl === 'string' ? opts.returnUrl.trim() : '';
    const cancelUrl = typeof opts.cancelUrl === 'string' ? opts.cancelUrl.trim() : '';
    if (returnUrl || cancelUrl) {
        body.application_context = {
            ...(returnUrl ? { return_url: returnUrl } : {}),
            ...(cancelUrl ? { cancel_url: cancelUrl } : {}),
        };
    }
    const revised = await paypalRequest(
        `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/revise`,
        {
            method: 'POST',
            body,
        },
    );
    const approveLink = (revised.links || []).find((l) => l.rel === 'approve');
    return {
        subscription: revised,
        approveUrl: approveLink?.href || '',
        planId,
        targetTier: tier,
    };
}

/**
 * Parse custom_id JSON from PayPal resource.
 * @param {string} customId
 */
export function parsePayPalCustomId(customId) {
    if (!customId) return {};
    try {
        const parsed = JSON.parse(customId);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return { raw: customId };
    }
}
