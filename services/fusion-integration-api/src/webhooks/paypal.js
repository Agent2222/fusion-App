/**
 * PayPal webhook event handler.
 */
import { getPayPalOrder, parsePayPalCustomId } from '../payments/providers/paypalProvider.js';
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
        const orderId = resource.supplementary_data?.related_ids?.order_id;
        if (orderId) {
            const order = await getPayPalOrder(orderId);
            if (order.status === 'COMPLETED') {
                await recordVerifiedPayPalOrder(order, programPaymentDeps);
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
