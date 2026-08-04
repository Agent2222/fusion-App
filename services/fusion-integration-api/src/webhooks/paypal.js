/**
 * PayPal webhook event handler.
 */
import {
    getPayPalOrder,
    parsePayPalCustomId,
    resolvePayPalOrderForRepair,
    safePayPalMetaValue,
} from '../payments/providers/paypalProvider.js';
import {
    getPendingPayPalMetadata,
    patchPendingPayPalMetadata,
} from '../payments/pendingPaymentStore.js';
import { recordVerifiedPayPalOrder } from '../payments/recordPayment.js';
import { pushPayPalSubscriptionToCanister } from '../canisterActor.js';

/**
 * @param {object} event
 * @param {object} [programPaymentDeps]
 */
export async function handlePayPalWebhookEvent(event, programPaymentDeps = {}) {
    const eventType = String(event.event_type || '');
    const resource = event.resource || {};
    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
        let orderId = resource.supplementary_data?.related_ids?.order_id;
        if (!orderId && resource.id) {
            try {
                const resolved = await resolvePayPalOrderForRepair({ captureId: resource.id });
                orderId = resolved.orderId;
            } catch (e) {
                console.warn(
                    '[paypal webhook] CAPTURE.COMPLETED could not resolve order from capture',
                    resource.id,
                    e instanceof Error ? e.message : e,
                );
            }
        }
        if (!orderId) {
            console.warn(
                '[paypal webhook] CAPTURE.COMPLETED missing related order_id',
                resource.id || '(no capture id)',
            );
        } else {
            try {
                const order = await getPayPalOrder(orderId);
                if (order.status === 'COMPLETED') {
                    const pu = (order.purchase_units || [])[0] || {};
                    const metaRef = safePayPalMetaValue(pu.custom_id, 127);
                    const pending = metaRef ? await getPendingPayPalMetadata(metaRef) : {};
                    const principalText = safePayPalMetaValue(pending.principal, 500);
                    const paymentType = safePayPalMetaValue(pending.paymentType, 80);
                    const applicationId = safePayPalMetaValue(pending.applicationId, 240);
                    const purpose = safePayPalMetaValue(pending.purpose, 80);
                    const awardEntry =
                        paymentType === 'program_award_entry' ||
                        purpose === 'program_award_entry' ||
                        applicationId.startsWith('award:');
                    // Guest draw: capture may land before II — keep pending for FE confirm+principal.
                    if (awardEntry && !principalText) {
                        if (metaRef) {
                            const capture = (pu.payments?.captures || [])[0] || {};
                            await patchPendingPayPalMetadata(metaRef, {
                                ...pending,
                                paymentType: paymentType || 'program_award_entry',
                                captured: 'true',
                                captureId: safePayPalMetaValue(capture.id || resource.id, 120),
                                capturedAt: new Date().toISOString(),
                            });
                        }
                        console.warn(
                            '[paypal webhook] award entry capture awaiting principal — skip ledger',
                            orderId,
                        );
                    } else {
                        await recordVerifiedPayPalOrder(order, programPaymentDeps);
                    }
                } else {
                    console.warn(
                        '[paypal webhook] CAPTURE.COMPLETED order not COMPLETED yet',
                        orderId,
                        order.status,
                    );
                }
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                // Confirm path may have already recorded + deleted pending S3 meta.
                if (/already recorded|missing program payment metadata/i.test(msg)) {
                    console.warn('[paypal webhook] capture ignored (likely already recorded):', orderId, msg);
                } else {
                    throw e;
                }
            }
        }
    }
    if (
        eventType === 'BILLING.SUBSCRIPTION.ACTIVATED' ||
        eventType === 'BILLING.SUBSCRIPTION.UPDATED' ||
        eventType === 'BILLING.SUBSCRIPTION.CANCELLED' ||
        eventType === 'BILLING.SUBSCRIPTION.SUSPENDED'
    ) {
        const meta = parsePayPalCustomId(resource.custom_id || '');
        if (meta.principal) {
            await pushPayPalSubscriptionToCanister(resource);
        }
    }
}
