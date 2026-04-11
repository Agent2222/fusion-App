/**
 * Studio IC actor for authenticated (eventually Internet Identity) calls.
 * Today reuses the same anonymous actor as `getFusionBackendActor` so local
 * `bootstrapAdminIfEmpty` continues to work.
 *
 * Production: add `@dfinity/auth-client`, sign in with II, and pass the
 * identity to `Actor.createActor`. See repo root `STUDIO_AUTH.md`.
 */
import { getFusionBackendActor } from './earlyAccessSubscribe.js';

/**
 * @returns {Promise<import('@dfinity/agent').ActorSubclass>}
 */
export async function getStudioAuthenticatedActor() {
    return getFusionBackendActor();
}
