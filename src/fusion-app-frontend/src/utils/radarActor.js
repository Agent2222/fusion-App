/**
 * Fusion Radar actor — siloed canister (not fusion-app-backend).
 * Uses hand IDL (`radar.idl.js`) so Vite builds without `dfx generate fusion-radar`.
 */
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import {
    DEV_MODE,
    IC_CONFIG,
    getHost,
    getNetworkConfig,
    shouldQueryMainnetBackend,
} from '../config.js';
import { idlFactory as radarIdlFactory } from './radar.idl.js';

/** @type {import('@dfinity/agent').ActorSubclass | null} */
let _radarActor = null;
/** @type {string | null} */
let _radarActorPrincipal = null;

/**
 * @returns {string}
 */
export function resolveFusionRadarCanisterId() {
    try {
        const v = String(import.meta.env?.VITE_FUSION_RADAR_CANISTER_ID || '').trim();
        if (v) return v;
    } catch {
        /* ignore */
    }
    try {
        const v = String(import.meta.env?.CANISTER_ID_FUSION_RADAR || '').trim();
        if (v) return v;
    } catch {
        /* ignore */
    }
    try {
        // eslint-disable-next-line no-undef
        if (typeof process !== 'undefined' && process.env?.CANISTER_ID_FUSION_RADAR) {
            return String(process.env.CANISTER_ID_FUSION_RADAR).trim();
        }
    } catch {
        /* ignore */
    }
    return '';
}

/**
 * @param {import('@dfinity/agent').Identity | null | undefined} identity
 */
async function createRadarActorWithIdentity(identity) {
    const canisterId = resolveFusionRadarCanisterId();
    if (!canisterId) {
        throw new Error(
            'fusion-radar canister id missing. Deploy fusion-radar (dfx sets CANISTER_ID_FUSION_RADAR) or set VITE_FUSION_RADAR_CANISTER_ID.',
        );
    }
    const networkConfig =
        shouldQueryMainnetBackend() && !(DEV_MODE && identity)
            ? IC_CONFIG.live
            : getNetworkConfig();
    const agent = new HttpAgent({
        host: networkConfig.host || getHost(),
        identity: identity || undefined,
    });
    if (networkConfig.fetchRootKey) {
        await agent.fetchRootKey().catch(() => {});
    }
    return Actor.createActor(radarIdlFactory, { agent, canisterId });
}

export function clearRadarActorCache() {
    _radarActor = null;
    _radarActorPrincipal = null;
}

/**
 * Authenticated Radar actor when II session exists; else anonymous (bootstrap / health only).
 */
export async function getRadarActor() {
    const { getIdentityIfAuthenticated } = await import('./icAuth.js');
    const identity = await getIdentityIfAuthenticated();
    if (identity) {
        const pid = identity.getPrincipal().toText();
        if (_radarActor && _radarActorPrincipal === pid) return _radarActor;
        const actor = await createRadarActorWithIdentity(identity);
        _radarActor = actor;
        _radarActorPrincipal = pid;
        return actor;
    }
    if (_radarActor && _radarActorPrincipal === 'anonymous') return _radarActor;
    const actor = await createRadarActorWithIdentity(null);
    _radarActor = actor;
    _radarActorPrincipal = 'anonymous';
    return actor;
}

export async function getAuthenticatedRadarActor() {
    const { getIdentityIfAuthenticated } = await import('./icAuth.js');
    const identity = await getIdentityIfAuthenticated();
    if (!identity) return null;
    return getRadarActor();
}

/** Anonymous principal placeholder for JS lead objects before canister assign. */
export function anonymousPrincipal() {
    return Principal.anonymous();
}
