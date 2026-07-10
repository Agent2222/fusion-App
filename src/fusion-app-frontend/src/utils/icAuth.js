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
import {
    identifyPosthogAfterInternetIdentityLogin,
    identifyPosthogOnSessionRestore,
} from './posthogConversionIdentity.js';

function currentAuthDebugConfig(identityProvider, derivationOrigin) {
    return {
        pageOrigin: typeof window !== 'undefined' ? window.location.origin : '',
        identityProvider,
        derivationOrigin: derivationOrigin || null,
    };
}

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
let _authClientConfigKey = '';

/**
 * Single AuthClient (idle delegation disabled — avoid surprise full-page reloads).
 * Recreates the client if `getInternetIdentityUrl()` changes (e.g. env / hot reload).
 * @returns {Promise<AuthClient>}
 */
export async function getAuthClientSingleton() {
    const identityProvider = requireInternetIdentityUrl();
    const derivationOrigin = getInternetIdentityDerivationOrigin();
    const configKey = `${identityProvider}|${derivationOrigin || ''}`;
    if (_authClientPromise && _authClientConfigKey !== configKey) {
        _authClientPromise = null;
    }
    if (!_authClientPromise) {
        _authClientConfigKey = configKey;
        const loginOptions = { identityProvider };
        if (derivationOrigin) {
            loginOptions.derivationOrigin = derivationOrigin;
        }
        if (shouldLogFusionIcAuthErrors()) {
            const debugConfig = currentAuthDebugConfig(identityProvider, derivationOrigin);
            if (typeof window !== 'undefined') {
                window.__fusionIiConfig = debugConfig;
            }
            console.info('[Fusion] Internet Identity config', debugConfig);
        }
        _authClientPromise = AuthClient.create({
            idleOptions: { disableIdle: true },
            loginOptions,
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
    const snap = await getAuthSnapshot();
    if (snap.authenticated) {
        identifyPosthogOnSessionRestore(snap.principal.toText());
    }
    await dispatchFusionAuthChange();
}

/** One week (nanoseconds), for delegation TTL. */
const TTL_7D_NS = BigInt(7 * 24 * 60 * 60) * BigInt(1_000_000_000);

/**
 * `AuthClient.login()` opens the II window and returns immediately — it does **not** await success.
 * We must use `onSuccess` / `onError` or the app would dispatch `fusion-auth-change` while still anonymous.
 * @param {{ source?: 'sign-in' | 'join-link' }} [opts]
 */
export async function loginInternetIdentity(opts = {}) {
    const source = opts?.source === 'join-link' ? 'join-link' : 'sign-in';
    await clearAuthActorCaches();
    const client = await getAuthClientSingleton();
    const identityProvider = getInternetIdentityUrl();

    const derivationOrigin = getInternetIdentityDerivationOrigin();
    if (shouldLogFusionIcAuthErrors()) {
        const debugConfig = currentAuthDebugConfig(identityProvider, derivationOrigin);
        if (typeof window !== 'undefined') {
            window.__fusionIiConfig = debugConfig;
        }
        console.info('[Fusion] Internet Identity login attempt', debugConfig);
    }
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
        identifyPosthogAfterInternetIdentityLogin(principalText);
        posthog.capture('sign_in_succeeded', { auth_method: 'internet_identity' });
    }
    try {
        if (typeof window !== 'undefined' && typeof window.focus === 'function') {
            window.focus();
        }
    } catch {
        /* ignore */
    }
    await dispatchFusionAuthChange();
    await runPostLoginPipeline({ source });
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
 * After a fresh II login: sync account/subscription state. Only auto-opens join when the user
 * is mid pay-first link (`join-link` or active pending-link session) — never on ordinary sign-in.
 *
 * @param {{ source?: 'sign-in' | 'join-link' }} [opts]
 */
export async function runPostLoginPipeline(opts = {}) {
    const source = opts?.source === 'join-link' ? 'join-link' : 'sign-in';
    let joinLinkInProgress = false;
    try {
        joinLinkInProgress = sessionStorage.getItem(FUSION_PENDING_MEMBERSHIP_LINK_KEY) === '1';
    } catch {
        /* ignore */
    }
    if (joinLinkInProgress) {
        try {
            const { readPendingMembershipPayload } = await import('./integrationApi.js');
            const pending = readPendingMembershipPayload();
            if (!pending?.fusionPendingId) {
                sessionStorage.removeItem(FUSION_PENDING_MEMBERSHIP_LINK_KEY);
                joinLinkInProgress = false;
            }
        } catch {
            joinLinkInProgress = false;
        }
    }
    if (joinLinkInProgress && source === 'join-link') {
        return;
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
        if (source === 'join-link') {
            try {
                const { readPendingMembershipPayload } = await import('./integrationApi.js');
                const pending = readPendingMembershipPayload();
                if (pending?.paymentCompleted && pending.fusionPendingId) {
                    window.dispatchEvent(
                        new CustomEvent('fusion-open-join-network', {
                            detail: { resumePendingLink: true },
                        })
                    );
                }
            } catch {
                /* ignore */
            }
        }
        return;
    }

    try {
        const { clearJoinPendingMembershipStorage } = await import('./integrationApi.js');
        clearJoinPendingMembershipStorage();
    } catch {
        /* ignore */
    }

    if (accountIsStudioTeamRole(/** @type {Record<string, unknown>} */ (acc))) {
        return;
    }

    /** Push subscription status to the canister (PayPal primary; Stripe legacy), then create minimal linked artist when membership allows. */
    try {
        const { principal } = await getAuthSnapshot();
        const pText = principal.toText();
        const {
            syncSubscriptionFromStripe,
            syncSubscriptionFromStripeByEmail,
            syncPayPalSubscription,
            getStoredBillingEmailForPrincipal,
            readPendingPaymentEmailLocal,
        } = await import('./integrationApi.js');
        let paypalSubId = '';
        try {
            if (typeof actor.getAccountForCaller === 'function') {
                const rawAcc = await actor.getAccountForCaller();
                const row = Array.isArray(rawAcc) ? (rawAcc.length ? rawAcc[0] : null) : rawAcc;
                paypalSubId = String(row?.paypalSubscriptionId || '').trim();
            }
        } catch {
            /* ignore */
        }
        if (paypalSubId) {
            await syncPayPalSubscription({ principal: pText, subscriptionId: paypalSubId });
        } else {
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
            const billingEmail = getStoredBillingEmailForPrincipal(pText);
            const pendingJoin = readPendingPaymentEmailLocal('join');
            const syncEmail = billingEmail || pendingJoin?.email || '';
            if (syncEmail.includes('@')) {
                await syncSubscriptionFromStripeByEmail(syncEmail, pText);
            }
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
            let gate = await getMembershipAccessForCaller();
            if (gate === 'needsSubscription') {
                const { principal } = await getAuthSnapshot();
                const pr = principal.toText();
                const {
                    syncSubscriptionFromStripe,
                    syncSubscriptionFromStripeByEmail,
                    syncPayPalSubscription,
                    getStoredBillingEmailForPrincipal,
                    readPendingPaymentEmailLocal,
                } = await import('./integrationApi.js');
                let paypalSubId = '';
                try {
                    const rawAcc = await actor.getAccountForCaller();
                    const row = Array.isArray(rawAcc) ? (rawAcc.length ? rawAcc[0] : null) : rawAcc;
                    paypalSubId = String(row?.paypalSubscriptionId || '').trim();
                } catch {
                    /* ignore */
                }
                if (paypalSubId) {
                    await syncPayPalSubscription({ principal: pr, subscriptionId: paypalSubId });
                } else {
                    await syncSubscriptionFromStripe(pr);
                    const billingEmail = getStoredBillingEmailForPrincipal(pr);
                    const pendingJoin = readPendingPaymentEmailLocal('join');
                    const syncEmail = billingEmail || pendingJoin?.email || '';
                    if (syncEmail.includes('@')) {
                        await syncSubscriptionFromStripeByEmail(syncEmail, pr);
                    }
                }
                gate = await getMembershipAccessForCaller();
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
        let gate = await getMembershipAccessForCaller();
        if (gate === 'needsSubscription') {
            try {
                const { principal } = await getAuthSnapshot();
                const pr = principal.toText();
                const {
                    syncSubscriptionFromStripe,
                    syncSubscriptionFromStripeByEmail,
                    getStoredBillingEmailForPrincipal,
                    readPendingPaymentEmailLocal,
                } = await import('./integrationApi.js');
                await syncSubscriptionFromStripe(pr);
                const billingEmail = getStoredBillingEmailForPrincipal(pr);
                const pendingJoin = readPendingPaymentEmailLocal('join');
                const syncEmail = billingEmail || pendingJoin?.email || '';
                if (syncEmail.includes('@')) {
                    await syncSubscriptionFromStripeByEmail(syncEmail, pr);
                }
                gate = await getMembershipAccessForCaller();
            } catch {
                /* ignore */
            }
        }
    } catch (_) {
        /* ignore */
    }
}
