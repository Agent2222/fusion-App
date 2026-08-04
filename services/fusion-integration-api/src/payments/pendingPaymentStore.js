/**
 * Persist PayPal program-payment metadata in object storage (S3/R2).
 * PayPal custom_id is limited to 127 chars — store full metadata keyed by opaque ref.
 */
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Principal } from '@dfinity/principal';
import { getActiveStorage } from '../storageBackends.js';
import { safePayPalMetaValue } from './providers/paypalProvider.js';

const KEY_PREFIX = 'payments/paypal-pending/';

/**
 * @param {string} ref
 */
function objectKey(ref) {
    const safe = String(ref || '')
        .trim()
        .replace(/[^a-zA-Z0-9-]/g, '');
    if (!safe) {
        throw new Error('Invalid pending payment reference');
    }
    return `${KEY_PREFIX}${safe}.json`;
}

/**
 * @param {object} body
 * @param {number} amountCents
 */
export function buildPendingPayPalProgramMetadata(body, amountCents) {
    const principal = safePayPalMetaValue(body?.principal, 500);
    const programId = safePayPalMetaValue(body?.programId, 120);
    const applicationId = safePayPalMetaValue(body?.applicationId, 240);
    const purpose = safePayPalMetaValue(body?.purpose, 80);
    let paymentType = safePayPalMetaValue(body?.paymentType, 80);
    // Program Draw $50: guests may create the order before Internet Identity / Fusion account.
    const awardEntry =
        paymentType === 'program_award_entry' ||
        purpose === 'program_award_entry' ||
        applicationId.startsWith('award:');
    if (awardEntry && !paymentType) {
        paymentType = 'program_award_entry';
    }
    if (!awardEntry) {
        if (!principal) throw new Error('principal required');
        Principal.fromText(principal);
    } else if (principal) {
        Principal.fromText(principal);
    }
    if (!programId) throw new Error('programId required');
    if (!applicationId) throw new Error('applicationId required');
    if (!paymentType) throw new Error('paymentType required');
    const ownFlight =
        body?.ownFlight === true || String(body?.ownFlight || '').toLowerCase() === 'true';
    const flightCreditCents = Math.max(0, Math.round(Number(body?.flightCreditCents || 0)));
    return {
        principal,
        programId,
        applicationId,
        paymentType,
        amountCents: String(amountCents),
        totalDueCents: String(Math.max(0, Math.round(Number(body?.totalDueCents || 0)))),
        depositAmountCents: String(Math.max(0, Math.round(Number(body?.depositAmountCents || 0)))),
        ownFlight: ownFlight ? 'true' : 'false',
        flightCreditCents: String(flightCreditCents),
        applicantEmail: safePayPalMetaValue(body?.email || body?.applicantEmail, 320),
        applicantName: safePayPalMetaValue(body?.applicantName || body?.fullName, 160),
        purpose,
        planId: safePayPalMetaValue(body?.planId, 120),
        installmentCount: safePayPalMetaValue(body?.installmentCount, 10),
        installmentAmountCents: safePayPalMetaValue(body?.installmentAmountCents, 20),
        planStartAt: safePayPalMetaValue(body?.planStartAt, 40),
        planEndAt: safePayPalMetaValue(body?.planEndAt, 40),
        paypalSubscriptionId: safePayPalMetaValue(body?.paypalSubscriptionId, 120),
        /** Draw-form contact payload for webhook/repair enter after capture. */
        payloadJson: (() => {
            const raw =
                typeof body?.payloadJson === 'string'
                    ? body.payloadJson
                    : body?.payload && typeof body.payload === 'object'
                      ? JSON.stringify(body.payload)
                      : '';
            return safePayPalMetaValue(raw, 100_000);
        })(),
        source: 'program_payments_tab',
    };
}

/**
 * @param {string} ref
 * @param {Record<string, string>} metaObj
 */
export async function putPendingPayPalMetadata(ref, metaObj) {
    const storage = getActiveStorage();
    if (!storage) {
        throw new Error('Object storage not configured for pending PayPal metadata');
    }
    const key = objectKey(ref);
    await storage.client.send(
        new PutObjectCommand({
            Bucket: storage.bucket,
            Key: key,
            ContentType: 'application/json',
            Body: JSON.stringify(metaObj),
        }),
    );
    return { key };
}

/**
 * @param {import('@aws-sdk/client-s3').S3Client} client
 * @param {string} bucket
 * @param {string} key
 */
async function readObjectBody(client, bucket, key) {
    const out = await client.send(
        new GetObjectCommand({
            Bucket: bucket,
            Key: key,
        }),
    );
    const body = out.Body;
    if (!body) return '';
    if (typeof body.transformToString === 'function') {
        return body.transformToString();
    }
    const chunks = [];
    for await (const chunk of body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8');
}

/**
 * @param {string} ref
 * @returns {Promise<Record<string, string>>}
 */
export async function getPendingPayPalMetadata(ref) {
    const storage = getActiveStorage();
    if (!storage) return {};
    const key = objectKey(ref);
    try {
        const text = await readObjectBody(storage.client, storage.bucket, key);
        if (!text) return {};
        const parsed = JSON.parse(text);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        const code = e && typeof e === 'object' ? e.name || e.Code : '';
        if (code === 'NoSuchKey' || code === 'NotFound') {
            return {};
        }
        console.warn('[paypal] pending metadata read failed:', e);
        return {};
    }
}

/**
 * Merge fields into existing pending PayPal metadata (S3/R2).
 * @param {string} ref
 * @param {Record<string, string>} patch
 * @returns {Promise<Record<string, string>>}
 */
export async function patchPendingPayPalMetadata(ref, patch) {
    const safeRef = String(ref || '').trim();
    if (!safeRef) throw new Error('Invalid pending payment reference');
    const prev = await getPendingPayPalMetadata(safeRef);
    const next = {
        ...(prev && typeof prev === 'object' ? prev : {}),
        ...(patch && typeof patch === 'object' ? patch : {}),
    };
    await putPendingPayPalMetadata(safeRef, next);
    return next;
}

/**
 * @param {string} ref
 */
export async function deletePendingPayPalMetadata(ref) {
    const storage = getActiveStorage();
    if (!storage) return;
    const key = objectKey(ref);
    try {
        await storage.client.send(
            new DeleteObjectCommand({
                Bucket: storage.bucket,
                Key: key,
            }),
        );
    } catch (e) {
        console.warn('[paypal] pending metadata cleanup failed:', e);
    }
}
