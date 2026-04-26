/**
 * Internet Identity session via @dfinity/auth-client.
 * Dispatches `fusion-auth-change` with `{ identity, principal, authenticated }`.
 */
import { AuthClient, ERROR_USER_INTERRUPT } from '@dfinity/auth-client';
import {
    DEV_MODE,
    getInternetIdentityDerivationOrigin,
    getInternetIdentityUrl,
    shouldLogFusionIcAuthErrors,
} from '../config.js';
import { FUSION_PENDING_MEMBERSHIP_LINK_KEY } from './integrationApi.js';
import { getProfileSetupDraft } from './profileSetupDraft.js';
import { clearAdminPerspective } from './adminPerspective.js';
import { accountIsStudioTeamRole } from './authHeader.js';
import posthog from 'posthog-js';

function linkedArtistIdFromAccount(acc) {
    if (!acc || typeof acc !== 'object') return '';
    const raw = acc.linkedArtistId ?? acc.linked_artist_id;
    if (Array.isArray(raw)) return raw.length ? String(raw[0] ?? '').trim() : '';
    return raw != null ? String(raw).trim() : '';
}

/** @returns {string} */
function requireInternetIdentityUrl() {
    const url = getInternetIdentityUrl();
    if (DEV_MODE && !url) {
        throw new Error(
            '[Fusion] Local Internet Identity: set VITE_II_CANISTER_ID to your local **internet_identity_frontend** id from .dfx/local/canister_ids.json (dfx 0.30+ split), then rebuild (npm run build).'
        );
    }
    return url;
}

async function clearAuthActorCaches() {
    const { clearAuthenticatedFusionBackendActorCache } = await import('./earlyAccessSubscribe.js');
    clearAuthenticatedFusionBackendActorCache();
}

/** @type {Promise<AuthClient> | null} */
let _authClientPromise = null;
/** @type {string} */
let _identityProviderUsed = '';

/**
 * Single AuthClient (idle delegation disabled — avoid surprise full-page reloads).
 * Recreates the client if `getInternetIdentityUrl()` changes (e.g. env / hot reload).
 * @returns {Promise<AuthClient>}
 */
export async function getAuthClientSingleton() {
    const identityProvider = requireInternetIdentityUrl();
    if (_authClientPromise && _identityProviderUsed !== identityProvider) {
        _authClientPromise = null;
    }
    if (!_authClientPromise) {
        _identityProviderUsed = identityProvider;
        _authClientPromise = AuthClient.create({
            idleOptions: { disableIdle: true },
            identityProvider,
        });
    }
    return _authClientPromise;
}

/**
 * @returns {Promise<{ identity: import('@dfinity/agent').Identity, principal: import('@dfinity/principal').Principal, authenticated: boolean }>}
 */
export async function getAuthSnapshot() {
    const client = await getAuthClientSingleton();
    const authenticated = await client.isAuthenticated();
    const identity = client.getIdentity();
    const principal = identity.getPrincipal();
    return { identity, principal, authenticated };
}

export async function dispatchFusionAuthChange() {
    const detail = await getAuthSnapshot();
    window.dispatchEvent(new CustomEvent('fusion-auth-change', { detail }));
}

/**
 * @returns {Promise<import('@dfinity/agent').Identity | null>}
 */
export async function getIdentityIfAuthenticated() {
    const client = await getAuthClientSingleton();
    if (!(await client.isAuthenticated())) return null;
    return client.getIdentity();
}

export async function initIcAuth() {
    await getAuthClientSingleton();
    await dispatchFusionAuthChange();
}

/** One week (nanoseconds), for delegation TTL. */
const TTL_7D_NS = BigInt(7 * 24 * 60 * 60) * BigInt(1_000_000_000);

/**
 * `AuthClient.login()` opens the II window and returns immediately — it does **not** await success.
 * We must use `onSuccess` / `onError` or the app would dispatch `fusion-auth-change` while still anonymous.
 */
export async function loginInternetIdentity() {
    await clearAuthActorCaches();
    const client = await getAuthClientSingleton();
    const identityProvider = getInternetIdentityUrl();

    const derivationOrigin = getInternetIdentityDerivationOrigin();
    await new Promise((resolve, reject) => {
        /** @type {import('@dfinity/auth-client').AuthClientLoginOptions} */
        const loginOpts = {
            identityProvider,
            maxTimeToLive: TTL_7D_NS,
            onSuccess: () => resolve(undefined),
            onError: (err) => {
                if (err === ERROR_USER_INTERRUPT) {
                    reject(ERROR_USER_INTERRUPT);
                    return;
                }
                reject(err instanceof Error ? err : new Error(String(err ?? 'Internet Identity login failed')));
            },
        };
        if (derivationOrigin) {
            loginOpts.derivationOrigin = derivationOrigin;
        }
        client.login(loginOpts);
    });

    const snapAfterLogin = await getAuthSnapshot();
    if (snapAfterLogin.authenticated) {
        console.log('[Fusion] Logged in — principal:', snapAfterLogin.principal.toText());
        const principalText = snapAfterLogin.principal.toText();
        posthog.identify(principalText);
        posthog.capture('sign_in_succeeded', { auth_method: 'internet_identity' });
    }
    await dispatchFusionAuthChange();
    await runPostLoginPipeline();
}

export async function logoutInternetIdentity() {
    clearAdminPerspective();
    await clearAuthActorCaches();
    const client = await getAuthClientSingleton();
    await client.logout();
    posthog.capture('signed_out', { auth_method: 'internet_identity' });
    posthog.reset();
    await dispatchFusionAuthChange();
}

/**
 * After a fresh II login: if not admin and no `UserAccount`, open join/register modal.
 */
export async function runPostLoginPipeline() {
    try {
        if (sessionStorage.getItem(FUSION_PENDING_MEMBERSHIP_LINK_KEY) === '1') {
            return;
        }
    } catch {
        /* ignore */
    }
    const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    if (!actor) return;
    let isAdmin = false;
    try {
        if (typeof actor.isCallerAdmin === 'function') {
            isAdmin = await actor.isCallerAdmin();
        }
    } catch (e) {
        if (shouldLogFusionIcAuthErrors()) {
            console.warn('[Fusion] isCallerAdmin failed (post-login pipeline)', e);
        }
    }
    if (isAdmin) return;
    let acc = null;
    try {
        if (typeof actor.getAccountForCaller === 'function') {
            const raw = await actor.getAccountForCaller();
            acc = Array.isArray(raw) ? (raw.length ? raw[0] : null) : raw;
        }
    } catch (e) {
        if (shouldLogFusionIcAuthErrors()) {
            console.warn('[Fusion] getAccountForCaller failed (post-login pipeline, join check)', e);
        }
    }
    if (acc == null) {
        window.dispatchEvent(
            new CustomEvent('fusion-open-join-network', {
                detail: { logoutIfDismissedWithoutAccount: true },
            })
        );
        return;
    }

    if (accountIsStudioTeamRole(/** @type {Record<string, unknown>} */ (acc))) {
        return;
    }

    /** Push Stripe subscription status to the canister, then create minimal linked artist when membership allows (pay-first recovery). */
    try {
        const { principal } = await getAuthSnapshot();
        const pText = principal.toText();
        const { syncSubscriptionFromStripe } = await import('./integrationApi.js');
        const syncResult = await syncSubscriptionFromStripe(pText);
        if (
            DEV_MODE &&
            syncResult &&
            syncResult.synced === false &&
            typeof syncResult.reason === 'string' &&
            syncResult.reason
        ) {
            console.warn('[Fusion] post-login sync-subscription:', syncResult.reason);
        }
        const { ensureMyLinkedArtistProfile } = await import('./database.js');
        await ensureMyLinkedArtistProfile();
        const { maybeSeedLocalesFromProfileSetupDraftIfEmpty } = await import(
            './profileSetupSeedLocales.js'
        );
        await maybeSeedLocalesFromProfileSetupDraftIfEmpty();
    } catch (_) {
        /* integration / canister optional */
    }

    try {
        if (typeof actor.getAccountForCaller === 'function') {
            const raw = await actor.getAccountForCaller();
            acc = Array.isArray(raw) ? (raw.length ? raw[0] : null) : raw;
        }
    } catch (e) {
        if (shouldLogFusionIcAuthErrors()) {
            console.warn('[Fusion] getAccountForCaller failed (post-login pipeline, linked artist)', e);
        }
    }

    let linkedArtistId = linkedArtistIdFromAccount(acc);
    if (!linkedArtistId) {
        try {
            const { getMembershipAccessForCaller } = await import('./database.js');
            const gate = await getMembershipAccessForCaller();
            if (gate === 'needsSubscription') {
                window.dispatchEvent(
                    new CustomEvent('fusion-open-join-network', {
                        detail: { mode: 'resubscribe' },
                    })
                );
                return;
            }
        } catch (_) {
            /* ignore */
        }
        const draft = getProfileSetupDraft();
        posthog.capture('profile_setup_opened', { trigger: 'post_login_no_linked_artist' });
        window.dispatchEvent(
            new CustomEvent('fusion-open-profile-setup', {
                detail: {
                    fullName: draft.fullName,
                    email: draft.email,
                },
            })
        );
        return;
    }

    try {
        const { getMembershipAccessForCaller } = await import('./database.js');
        const gate = await getMembershipAccessForCaller();
        if (gate === 'needsSubscription') {
            window.dispatchEvent(
                new CustomEvent('fusion-open-join-network', {
                    detail: { mode: 'resubscribe' },
                })
            );
        }
    } catch (_) {
        /* ignore */
    }
}
