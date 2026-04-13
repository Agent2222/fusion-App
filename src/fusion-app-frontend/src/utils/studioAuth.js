/**
 * Studio IC actor: prefers Internet Identity session when present; otherwise falls back to
 * the anonymous actor (local `bootstrapAdminIfEmpty` / legacy flows).
 * See `STUDIO_AUTH.md`.
 */
import { getAuthenticatedFusionBackendActor, getFusionBackendActor } from './earlyAccessSubscribe.js';

/**
 * @returns {Promise<import('@dfinity/agent').ActorSubclass>}
 */
export async function getStudioAuthenticatedActor() {
    const auth = await getAuthenticatedFusionBackendActor();
    if (auth) return auth;
    return getFusionBackendActor();
}
