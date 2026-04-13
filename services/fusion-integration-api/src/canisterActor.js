/**
 * Signed integration identity → fusion-app-backend `integrationRecordStripeSubscription`.
 */
import { createPrivateKey } from 'node:crypto';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { Principal } from '@dfinity/principal';
import { idlFactory } from './fusion_backend.idl.js';

/** @type {Awaited<ReturnType<typeof Actor.createActor>> | null} */
let _actor = null;

/**
 * `dfx identity export` prints PEM — use `INTEGRATION_IC_IDENTITY_PEM` (or paste PEM into this helper).
 * JSON array `["hex","hex"]` from older flows uses `INTEGRATION_IC_IDENTITY_JSON`.
 * @param {string} pem
 */
function ed25519IdentityFromPem(pem) {
    const key = createPrivateKey({ key: pem.trim(), format: 'pem' });
    const jwk = key.export({ format: 'jwk' });
    if (!jwk || typeof jwk !== 'object' || jwk.crv !== 'Ed25519' || typeof jwk.d !== 'string') {
        throw new Error('PEM must be an Ed25519 private key (dfx identity export)');
    }
    const secret = Buffer.from(jwk.d, 'base64url');
    if (secret.length !== 32) {
        throw new Error('Invalid Ed25519 secret length');
    }
    return Ed25519KeyIdentity.fromSecretKey(new Uint8Array(secret));
}

/**
 * @returns {import('@dfinity/identity').Ed25519KeyIdentity}
 */
function loadIntegrationIdentity() {
    const pem = process.env.INTEGRATION_IC_IDENTITY_PEM || '';
    const json = process.env.INTEGRATION_IC_IDENTITY_JSON || '';
    if (pem.trim()) {
        return ed25519IdentityFromPem(pem);
    }
    if (json.trim().startsWith('[')) {
        const arr = JSON.parse(json);
        return Ed25519KeyIdentity.fromParsedJson(arr);
    }
    if (json.includes('BEGIN')) {
        return ed25519IdentityFromPem(json);
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
    await actor.integrationRecordStripeSubscription(
        p,
        cid ? [cid] : [],
        [subscription.id],
        [subscription.status],
    );
}
