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
    for (const [k, v] of Object.entries(customData)) {
        if (k === 'principal' || k === 'fusion_pending_id' || k === 'pending_email') continue;
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
    return JSON.stringify(minimal).slice(0, 127);
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
 * @param {string} subscriptionId
 */
export async function getPayPalSubscription(subscriptionId) {
    return paypalRequest(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`, {
        method: 'GET',
    });
}

/**
 * @param {object} reqBody
 */
export async function createPayPalSubscription(reqBody) {
    const tierRaw = reqBody?.subscriptionTier;
    let tier = typeof tierRaw === 'string' ? tierRaw.trim().toLowerCase() : '';
    if (!tier) tier = 'bimonthly';
    if (tier !== 'bimonthly' && tier !== 'annual') {
        throw new Error('Invalid subscriptionTier (use bimonthly or annual)');
    }
    const planId =
        tier === 'annual'
            ? process.env.PAYPAL_PLAN_ANNUAL_ID || ''
            : process.env.PAYPAL_PLAN_BIMONTHLY_ID || '';
    if (!planId) {
        throw new Error(
            tier === 'annual'
                ? 'PAYPAL_PLAN_ANNUAL_ID not configured'
                : 'PAYPAL_PLAN_BIMONTHLY_ID not configured',
        );
    }
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
    const customData = { pending_email: email.trim().slice(0, 500) };
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
 * @param {string} subscriptionId
 */
export async function cancelPayPalSubscriptionAtPeriodEnd(subscriptionId) {
    return paypalRequest(
        `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
        {
            method: 'POST',
            body: { reason: 'Member requested cancellation at period end' },
        },
    );
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
