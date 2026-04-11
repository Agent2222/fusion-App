/**
 * Shared Fusion backend actor + early-access subscribe (same flow as loadscreen `#csCTAForm` / `#csCTASubscribe`).
 */
import { DEV_MODE, createICActor, getHost } from '../config.js';

let _resolvedActor = null;
let _actorPromise = null;
let _decl = null;

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
                        console.log('[EarlyAccess] backend canisterId:', _decl.canisterId);
                        console.log('[EarlyAccess] IC host:', getHost());
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
 * @param {string} email
 * @param {string} category
 * @param {{ fullName?: string, intent?: string }} [opts]
 */
export async function upsertEarlyAccessSubscriber(email, category, opts = {}) {
    const actor = await getFusionBackendActor();
    const timestamp = new Date().toISOString();
    const fullName = typeof opts.fullName === 'string' ? opts.fullName : '';
    const intent = typeof opts.intent === 'string' ? opts.intent : '';
    return actor.upsertSubscriber(email, category, timestamp, fullName, intent);
}
