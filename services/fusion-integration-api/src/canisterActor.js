/**
 * Signed integration identity → fusion-app-backend `integrationRecordStripeSubscription`.
 */
import { createPrivateKey } from 'node:crypto';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { Principal } from '@dfinity/principal';
import { idlFactory } from './fusion_backend.idl.js';

/** @type {Awaited<ReturnType<typeof Actor.createActor>> | null} */
let _actor = null;

/**
 * `dfx identity export` PEM — Ed25519 or secp256k1 (current dfx defaults).
 * JSON array uses `INTEGRATION_IC_IDENTITY_JSON` (Ed25519 `fromParsedJson` only).
 * @param {string} pem
 * @returns {import('@dfinity/agent').SignIdentity}
 */
function integrationIdentityFromPem(pem) {
    const trimmed = pem.trim();
    const key = createPrivateKey({ key: trimmed, format: 'pem' });
    const jwk = key.export({ format: 'jwk' });
    if (!jwk || typeof jwk !== 'object') {
        throw new Error('Invalid PEM private key');
    }
    if (jwk.crv === 'Ed25519' && typeof jwk.d === 'string') {
        const secret = Buffer.from(jwk.d, 'base64url');
        if (secret.length !== 32) {
            throw new Error('Invalid Ed25519 secret length');
        }
        return Ed25519KeyIdentity.fromSecretKey(new Uint8Array(secret));
    }
    if (jwk.crv === 'secp256k1') {
        return Secp256k1KeyIdentity.fromPem(trimmed);
    }
    const crv = /** @type {{ crv?: string }} */ (jwk).crv;
    throw new Error(
        `Unsupported PEM key curve: ${crv ?? 'unknown'} (supported: Ed25519, secp256k1 from dfx identity export)`,
    );
}

/**
 * @returns {import('@dfinity/agent').SignIdentity}
 */
function loadIntegrationIdentity() {
    const pem = process.env.INTEGRATION_IC_IDENTITY_PEM || '';
    const json = process.env.INTEGRATION_IC_IDENTITY_JSON || '';
    if (pem.trim()) {
        return integrationIdentityFromPem(pem);
    }
    if (json.trim().startsWith('[')) {
        const arr = JSON.parse(json);
        return Ed25519KeyIdentity.fromParsedJson(arr);
    }
    if (json.includes('BEGIN')) {
        return integrationIdentityFromPem(json);
    }
    throw new Error('Set INTEGRATION_IC_IDENTITY_PEM or INTEGRATION_IC_IDENTITY_JSON');
}

/**
 * @returns {Promise<import('@dfinity/agent').ActorSubclass | null>}
 */
export async function getIntegrationActor() {
    if (_actor) return _actor;
    const canisterId = process.env.FUSION_BACKEND_CANISTER_ID || '';
    const host = process.env.IC_HOST || 'http://127.0.0.1:4943';
    const hasSecret =
        Boolean(process.env.INTEGRATION_IC_IDENTITY_PEM?.trim()) ||
        Boolean(process.env.INTEGRATION_IC_IDENTITY_JSON?.trim());
    if (!canisterId || !hasSecret) {
        return null;
    }
    let identity;
    try {
        identity = loadIntegrationIdentity();
    } catch (e) {
        console.error('[canister] Integration identity invalid:', e);
        return null;
    }
    const agent = new HttpAgent({ host, identity });
    try {
        if (host.includes('127.0.0.1') || host.includes('localhost')) {
            await agent.fetchRootKey();
        }
    } catch (e) {
        console.warn('[canister] fetchRootKey failed:', e);
    }
    _actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: Principal.fromText(canisterId),
    });
    return _actor;
}

/**
 * @param {import('stripe').Stripe.Subscription} subscription
 * @param {string} [customerId]
 */
export async function pushSubscriptionToCanister(subscription, customerId) {
    const actor = await getIntegrationActor();
    if (!actor) {
        console.warn(
            '[canister] Integration actor not configured — set FUSION_BACKEND_CANISTER_ID + INTEGRATION_IC_IDENTITY_PEM (or JSON)',
        );
        return;
    }
    const principalText = subscription.metadata?.principal;
    if (!principalText || typeof principalText !== 'string') {
        console.warn('[canister] Subscription missing metadata.principal');
        return;
    }
    let p;
    try {
        p = Principal.fromText(principalText.trim());
    } catch (e) {
        console.warn('[canister] Invalid principal in metadata:', principalText);
        return;
    }
    const cid =
        customerId ||
        (typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id || '');
    const cpe = subscription.current_period_end;
    const periodEndIso =
        typeof cpe === 'number' && Number.isFinite(cpe)
            ? new Date(cpe * 1000).toISOString()
            : '';
    await actor.integrationRecordStripeSubscription(
        p,
        cid ? [cid] : [],
        [subscription.id],
        [subscription.status],
        periodEndIso ? [periodEndIso] : [],
    );
}
