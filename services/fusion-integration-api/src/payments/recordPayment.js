/**
 * Verify PayPal capture and write to Motoko canister (mirrors Stripe recordVerifiedProgramPayment).
 */
import { Principal } from '@dfinity/principal';
import { getIntegrationActor } from '../canisterActor.js';
import {
    deletePendingPayPalMetadata,
    getPendingPayPalMetadata,
} from './pendingPaymentStore.js';
import { parsePayPalCustomId, safePayPalMetaValue } from './providers/paypalProvider.js';

/**
 * @param {object} order PayPal order after capture (COMPLETED)
 * @param {{ sendProgramPaymentConfirmationEmails?: (d: object) => Promise<void>; markProgramPaymentEmailsSent?: (id: string) => Promise<void>; cancelPlatformSubscriptionImmediately?: (principal: string) => Promise<void>; addConfirmedArtistToProgram?: (actor: unknown, principal: string, programId: string, createdAt: string) => Promise<{ ok: boolean; reason?: string }> }} deps
 * @param {Record<string, string>} [metaOverride]
 */
export async function recordVerifiedPayPalOrder(order, deps = {}, metaOverride = {}) {
    const actor = await getIntegrationActor();
    if (!actor) {
        throw new Error('Canister integration not configured');
    }
    const pu = (order.purchase_units || [])[0];
    if (!pu) {
        throw new Error('PayPal order missing purchase_units');
    }
    const capture = (pu.payments?.captures || [])[0];
    if (!capture || capture.status !== 'COMPLETED') {
        throw new Error(`PayPal capture not completed: ${capture?.status || 'missing'}`);
    }
    const metaRef = safePayPalMetaValue(pu.custom_id, 127);
    let meta = metaRef ? await getPendingPayPalMetadata(metaRef) : {};
    if (!meta.principal && !meta.programId && metaRef) {
        meta = parsePayPalCustomId(metaRef);
    }
    if (metaOverride && typeof metaOverride === 'object') {
        meta = { ...meta, ...metaOverride };
    }
    const principalText = safePayPalMetaValue(meta.principal);
    const programId = safePayPalMetaValue(meta.programId, 120);
    const applicationId = safePayPalMetaValue(meta.applicationId, 240);
    const paymentType = safePayPalMetaValue(meta.paymentType, 80);
    const captureId = safePayPalMetaValue(capture.id, 120);
    const orderId = safePayPalMetaValue(order.id, 120);

    // Confirm vs webhook race: the first path records + deletes pending meta; the second
    // must not fail the applicant UX (or PayPal retries) when the ledger already has the order.
    if (!principalText || !programId || !applicationId || !paymentType) {
        if (orderId && typeof actor.integrationHasProgramPayment === 'function') {
            try {
                const already = await actor.integrationHasProgramPayment(orderId);
                if (already) {
                    return {
                        receiptUrl: '',
                        chargeId: captureId,
                        amountCents: 0,
                        paymentType: '',
                        programId: '',
                        alreadyRecorded: true,
                    };
                }
            } catch (e) {
                console.warn('[paypal] integrationHasProgramPayment failed:', e);
            }
        }
        throw new Error('PayPal order missing program payment metadata');
    }
    Principal.fromText(principalText);
    const receiptUrl =
        (capture.links || []).find((l) => l.rel === 'self')?.href ||
        (order.links || []).find((l) => l.rel === 'self')?.href ||
        '';
    const createdAt = capture.create_time || order.create_time || new Date().toISOString();
    const amountCents = Math.max(
        0,
        Math.round(Number.parseFloat(String(capture.amount?.value || pu.amount?.value || '0')) * 100),
    );
    const totalDueCents = Math.max(0, Math.round(Number(meta.totalDueCents || 0)));
    const depositAmountCents = Math.max(0, Math.round(Number(meta.depositAmountCents || 0)));
    const ownFlight = String(meta.ownFlight || '').toLowerCase() === 'true';
    const flightCreditCents = Math.max(0, Math.round(Number(meta.flightCreditCents || 0)));
    const applicantEmail = safePayPalMetaValue(meta.applicantEmail, 320);
    const applicantName = safePayPalMetaValue(meta.applicantName || 'Unknown', 160);
    const firstName =
        applicantName && applicantName !== 'Unknown' ? applicantName.split(/\s+/).filter(Boolean)[0] : '';
    const emailsAlreadySent = String(meta.programPaymentEmailsSent || '').toLowerCase() === 'true';
    const row = {
        id: orderId,
        principal: Principal.fromText(principalText),
        programId,
        applicationId,
        paymentType,
        amountCents: BigInt(amountCents),
        currency: 'usd',
        stripePaymentIntentId: '',
        stripeChargeId: '',
        stripeReceiptUrl: '',
        status: 'succeeded',
        createdAt,
        dueAt: [],
        feeCents: 0n,
        staffNote: '',
        paymentProvider: 'paypal',
        externalPaymentId: orderId,
        externalChargeId: captureId,
        externalReceiptUrl: receiptUrl,
    };
    await actor.integrationRecordProgramPayment(
        row,
        BigInt(totalDueCents),
        BigInt(depositAmountCents),
        0n,
        ownFlight,
        BigInt(flightCreditCents),
    );
    if (metaRef) {
        await deletePendingPayPalMetadata(metaRef);
    }
    if (paymentType === 'deposit' || paymentType === 'full_payment') {
        await actor.integrationMarkProgramDepositAccepted(
            Principal.fromText(principalText),
            programId,
            applicationId,
            paymentType === 'full_payment' ? 'paid_full' : 'paid',
            createdAt,
        );
        if (deps.addConfirmedArtistToProgram) {
            try {
                const confirmed = await deps.addConfirmedArtistToProgram(
                    actor,
                    principalText,
                    programId,
                    createdAt,
                );
                if (!confirmed.ok) {
                    console.warn('[paypal] program confirmed artist update skipped:', confirmed.reason);
                }
            } catch (e) {
                console.warn('[paypal] program confirmed artist update failed:', e);
            }
        }
        if (deps.cancelPlatformSubscriptionImmediately) {
            await deps.cancelPlatformSubscriptionImmediately(principalText);
        }
        if (!emailsAlreadySent && deps.sendProgramPaymentConfirmationEmails) {
            try {
                await deps.sendProgramPaymentConfirmationEmails({
                    applicantEmail,
                    applicantName,
                    firstName,
                    programId,
                    applicationId,
                    paymentType,
                    amountCents,
                    totalPaidCents: amountCents,
                    totalDueCents,
                    ownFlight,
                    flightCreditCents,
                    receiptUrl,
                    paymentIntentId: orderId,
                    chargeId: captureId,
                });
                if (deps.markProgramPaymentEmailsSent) {
                    await deps.markProgramPaymentEmailsSent(orderId);
                }
            } catch (e) {
                console.warn('[paypal] program payment confirmation emails failed:', e);
            }
        }
    }
    if (paymentType === 'plan_installment' && meta.planId) {
        const plan = {
            id: safePayPalMetaValue(meta.planId, 120),
            principal: Principal.fromText(principalText),
            programId,
            applicationId,
            stripeSubscriptionId: '',
            stripeScheduleId: '',
            paypalSubscriptionId: meta.paypalSubscriptionId
                ? [safePayPalMetaValue(meta.paypalSubscriptionId, 120)]
                : [],
            paymentProvider: 'paypal',
            installmentCount: BigInt(Math.max(0, Math.round(Number(meta.installmentCount || 0)))),
            installmentAmountCents: BigInt(Math.max(0, Math.round(Number(meta.installmentAmountCents || 0)))),
            currency: 'usd',
            status: 'active',
            startAt: safePayPalMetaValue(meta.planStartAt) || createdAt,
            endAt: safePayPalMetaValue(meta.planEndAt) || '',
            createdAt,
            updatedAt: createdAt,
        };
        if (!plan.paypalSubscriptionId?.length && meta.paypalSubscriptionId) {
            plan.paypalSubscriptionId = [safePayPalMetaValue(meta.paypalSubscriptionId, 120)];
        }
        await actor.integrationActivateProgramPaymentPlan(
            plan,
            BigInt(totalDueCents),
            BigInt(depositAmountCents),
        );
    }
    return { receiptUrl, chargeId: captureId, amountCents, paymentType, programId };
}

/**
 * @param {object} subscription PayPal subscription object
 */
export async function pushPayPalSubscriptionToCanister(subscription) {
    const { pushPayPalSubscriptionToCanister: push } = await import('../canisterActor.js');
    return push(subscription);
}
