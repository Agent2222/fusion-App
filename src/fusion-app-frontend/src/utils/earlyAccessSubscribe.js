/**
 * Shared Fusion backend actor + early-access subscribe (same flow as loadscreen `#csCTAForm` / `#csCTASubscribe`).
 */
import {
    DEV_MODE,
    IC_CONFIG,
    createICActor,
    createAuthenticatedICActor,
    getHost,
    resolveFusionBackendCanisterId,
    shouldQueryMainnetBackend,
} from '../config.js';

let _resolvedActor = null;
let _actorPromise = null;
let _decl = null;

/** @type {import('@dfinity/agent').ActorSubclass | null} */
let _authenticatedActor = null;
/** @type {string | null} */
let _authenticatedActorPrincipalText = null;

export function clearFusionBackendActorCache() {
    _resolvedActor = null;
    _actorPromise = null;
}

export function clearAuthenticatedFusionBackendActorCache() {
    _authenticatedActor = null;
    _authenticatedActorPrincipalText = null;
}

/**
 * Backend actor using Internet Identity when a session exists; otherwise `null`.
 * @returns {Promise<import('@dfinity/agent').ActorSubclass | null>}
 */
export async function getAuthenticatedFusionBackendActor() {
    const { getIdentityIfAuthenticated } = await import('./icAuth.js');
    const identity = await getIdentityIfAuthenticated();
    if (!identity) return null;
    const pid = identity.getPrincipal().toText();
    if (_authenticatedActor && _authenticatedActorPrincipalText === pid) {
        return _authenticatedActor;
    }
    try {
        if (!_decl) {
            _decl = await import('declarations/fusion-app-backend');
        }
        if (!_decl?.canisterId || !_decl?.idlFactory) return null;
        const actor = await createAuthenticatedICActor(
            _decl.idlFactory,
            _decl.canisterId,
            identity,
        );
        _authenticatedActor = actor;
        _authenticatedActorPrincipalText = pid;
        return actor;
    } catch (err) {
        if (DEV_MODE) console.warn('[IC] getAuthenticatedFusionBackendActor', err);
        return null;
    }
}

/**
 * Start resolving the backend actor in the background (same singleton as coming-soon submit).
 * Call when the join dialog opens so `fetchRootKey` / agent setup runs earlier — mirrors having
 * interacted with the loadscreen first. Safe to call repeatedly; errors are swallowed.
 */
export function prefetchFusionBackendActor() {
    void getFusionBackendActor().catch((err) => {
        if (DEV_MODE) console.warn('[EarlyAccess] prefetchFusionBackendActor', err);
    });
}

export async function getFusionBackendActor() {
    if (_resolvedActor) return _resolvedActor;
    if (!_actorPromise) {
        _actorPromise = (async () => {
            try {
                if (!_decl) {
                    _decl = await import('declarations/fusion-app-backend');
                }
                if (_decl?.canisterId && _decl?.idlFactory) {
                    if (DEV_MODE) {
                        console.log(
                            '[EarlyAccess] backend canisterId (resolved):',
                            resolveFusionBackendCanisterId(_decl.canisterId, {
                                authenticated: false,
                            }),
                        );
                        console.log(
                            '[EarlyAccess] IC host:',
                            shouldQueryMainnetBackend()
                                ? IC_CONFIG.live.host
                                : getHost(),
                        );
                    }
                    return await createICActor(_decl.idlFactory, _decl.canisterId);
                }
            } catch (err) {
                if (DEV_MODE) {
                    console.error('Failed to create backend actor via createICActor()', err);
                }
            }
            if (!_decl?.fusion_app_backend) {
                throw new Error(
                    '[EarlyAccess] Backend actor not available (missing canisterId/idlFactory or fusion_app_backend export).'
                );
            }
            return _decl.fusion_app_backend;
        })();
    }
    _resolvedActor = await _actorPromise;
    return _resolvedActor;
}

/** Match loadscreen: `Gallery` selector maps to backend category `Gallery Access`. */
export function normalizeEarlyAccessCategory(raw) {
    const t = (raw || '').trim();
    if (t === 'Gallery') return 'Gallery Access';
    return t;
}

/**
 * Exact canister write used by loadscreen `#csCTAForm` (`getBackendActor` + `upsertSubscriber`).
 * Join network and other flows should call this (or {@link upsertEarlyAccessSubscriber}) so behavior stays in sync.
 *
 * @param {string} email
 * @param {string} category
 * @param {string} [fullName]
 * @param {string} [intent]
 */
export async function submitEarlyAccessToCanister(email, category, fullName = '', intent = '') {
    const actor = await getFusionBackendActor();
    const timestamp = new Date().toISOString();
    return actor.upsertSubscriber(email, category, timestamp, fullName, intent);
}

/**
 * @param {string} email
 * @param {string} category
 * @param {{ fullName?: string, intent?: string }} [opts]
 */
export async function upsertEarlyAccessSubscriber(email, category, opts = {}) {
    const fullName = typeof opts.fullName === 'string' ? opts.fullName : '';
    const intent = typeof opts.intent === 'string' ? opts.intent : '';
    return submitEarlyAccessToCanister(email, category, fullName, intent);
}

if (typeof window !== 'undefined') {
    window.addEventListener('fusion-data-source-change', () => {
        clearFusionBackendActorCache();
        clearAuthenticatedFusionBackendActorCache();
    });
}
