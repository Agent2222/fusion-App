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

/** Mainnet fusion-radar — keep in sync with repo-root `canister_ids.json`. */
export const MAINNET_FUSION_RADAR_CANISTER_ID = 'yp25q-maaaa-aaaab-agz4a-cai';

/** @type {import('@dfinity/agent').ActorSubclass | null} */
let _radarActor = null;
/** @type {string | null} */
let _radarActorPrincipal = null;

/**
 * @param {unknown} v
 * @returns {string}
 */
function trimEnv(v) {
    if (typeof v !== 'string') return '';
    return v.trim();
}

/**
 * Resolve fusion-radar canister id (mirrors {@link import('../config.js').resolveFusionBackendCanisterId}).
 *
 * - Optional **`VITE_FUSION_RADAR_CANISTER_ID`** wins (staging / custom).
 * - **Authenticated + `DEV_MODE`:** local id from Vite / `.dfx/local`.
 * - **Mainnet data preference:** {@link MAINNET_FUSION_RADAR_CANISTER_ID}.
 * - **`DEV_MODE`:** local id, else mainnet fallback.
 *
 * @param {{ authenticated?: boolean }} [options]
 * @returns {string}
 */
export function resolveFusionRadarCanisterId(options = {}) {
    try {
        const override = trimEnv(import.meta.env?.VITE_FUSION_RADAR_CANISTER_ID);
        if (override) return override;
    } catch {
        /* ignore */
    }

    const authenticated = options.authenticated === true;
    // Local id only from Vite local merge / .dfx — do not use CANISTER_ID_FUSION_RADAR from
    // root .env (often mainnet after `dfx deploy --network ic`).
    const localId = trimEnv(import.meta.env?.VITE_FUSION_RADAR_LOCAL_CANISTER_ID);
    const mainnetId =
        trimEnv(import.meta.env?.VITE_FUSION_RADAR_MAINNET_CANISTER_ID) ||
        MAINNET_FUSION_RADAR_CANISTER_ID;

    if (authenticated && DEV_MODE) {
        return localId;
    }
    if (shouldQueryMainnetBackend()) {
        return mainnetId;
    }
    if (DEV_MODE) {
        return localId || mainnetId;
    }
    return mainnetId;
}

/**
 * @param {import('@dfinity/agent').Identity | null | undefined} identity
 */
async function createRadarActorWithIdentity(identity) {
    const canisterId = resolveFusionRadarCanisterId({
        authenticated: Boolean(identity),
    });
    if (!canisterId) {
        throw new Error(
            DEV_MODE && identity
                ? 'fusion-radar local canister id missing. Run `dfx deploy fusion-radar`, restart Vite (loads `.dfx/local`), or set VITE_FUSION_RADAR_LOCAL_CANISTER_ID.'
                : 'fusion-radar canister id missing. Deploy fusion-radar, restart Vite, or set VITE_FUSION_RADAR_CANISTER_ID.',
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
