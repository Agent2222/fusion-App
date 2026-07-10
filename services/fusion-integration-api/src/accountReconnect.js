/**
 * Admin account reconnect — lookup paid membership by email, preview, complete migrate + provider sync.
 */
import { Principal } from '@dfinity/principal';
import { getIntegrationActor, pushPayPalSubscriptionToCanister } from './canisterActor.js';
import { isPayPalConfigured } from './payments/paypalClient.js';
import {
    getPayPalSubscription,
    parsePayPalCustomId,
} from './payments/providers/paypalProvider.js';

/**
 * @param {unknown} raw
 * @returns {{ ok: true, fromPrincipal: string, toPrincipal: string, linkedArtistId: string | null, paymentProvider: string | null } | { ok: false, code: string }}
 */
export function decodeAdminReconnectResult(raw) {
    if (!raw || typeof raw !== 'object') {
        return { ok: false, code: 'invalid_response' };
    }
    const o = /** @type {Record<string, unknown>} */ (raw);
    if ('ok' in o && o.ok && typeof o.ok === 'object') {
        const ok = /** @type {Record<string, unknown>} */ (o.ok);
        const linked =
            ok.linkedArtistId && Array.isArray(ok.linkedArtistId) && ok.linkedArtistId.length
                ? String(ok.linkedArtistId[0] ?? '')
                : typeof ok.linkedArtistId === 'string'
                  ? ok.linkedArtistId
                  : null;
        const provider =
            ok.paymentProvider && Array.isArray(ok.paymentProvider) && ok.paymentProvider.length
                ? String(ok.paymentProvider[0] ?? '')
                : typeof ok.paymentProvider === 'string'
                  ? ok.paymentProvider
                  : null;
        return {
            ok: true,
            fromPrincipal: String(ok.fromPrincipal ?? ''),
            toPrincipal: String(ok.toPrincipal ?? ''),
            linkedArtistId: linked,
            paymentProvider: provider,
        };
    }
    const codes = [
        'samePrincipal',
        'noSourceAccount',
        'targetHasAccount',
        'targetLinkedToDifferentArtist',
        'cannotMigratePrivilegedAccount',
    ];
    for (const code of codes) {
        if (code in o) {
            return { ok: false, code };
        }
    }
    return { ok: false, code: 'unknown' };
}

/**
 * @param {unknown} raw
 * @returns {'noAccount' | 'exempt' | 'ok' | 'needsSubscription' | ''}
 */
function decodeMembershipAccess(raw) {
    if (!raw || typeof raw !== 'object') return '';
    const o = /** @type {Record<string, unknown>} */ (raw);
    if ('noAccount' in o) return 'noAccount';
    if ('exempt' in o) return 'exempt';
    if ('ok' in o) return 'ok';
    if ('needsSubscription' in o) return 'needsSubscription';
    return '';
}

/**
 * @param {import('express').Express} app
 * @param {{
 *   requireApiKey: import('express').RequestHandler;
 *   stripe: import('stripe').Stripe | null;
 *   getStripeCustomerAndBestSubscriptionByEmail: (stripe: import('stripe').Stripe, email: string) => Promise<unknown>;
 *   syncStripeSubscriptionByEmailAndPrincipal: (stripe: import('stripe').Stripe, email: string, principal: string) => Promise<{ synced?: boolean; reason?: string; status?: string; subscriptionId?: string }>;
 * }} deps
 */
export function registerAccountReconnectRoutes(app, deps) {
    const {
        requireApiKey,
        stripe,
        getStripeCustomerAndBestSubscriptionByEmail,
        syncStripeSubscriptionByEmailAndPrincipal,
    } = deps;

    app.post('/account/lookup-by-email', requireApiKey, async (req, res) => {
        try {
            const email = String(req.body?.email ?? '').trim();
            if (!email.includes('@')) {
                return res.status(400).json({ error: 'valid email required' });
            }
            /** @type {Record<string, unknown>} */
            const out = { email, stripe: null, paypal: null };
            if (stripe) {
                const picked = await getStripeCustomerAndBestSubscriptionByEmail(stripe, email);
                if (picked && typeof picked === 'object' && /** @type {{ ok?: boolean }} */ (picked).ok) {
                    const p = /** @type {{ customer: { id: string }; subscription: { id: string; status: string; metadata?: Record<string, string> }; membershipActive: boolean }} */ (
                        picked
                    );
                    const principalHint = String(p.subscription?.metadata?.principal ?? '').trim();
                    out.stripe = {
                        membershipActive: p.membershipActive,
                        customerId: p.customer.id,
                        subscriptionId: p.subscription.id,
                        subscriptionStatus: p.subscription.status,
                        principalHint: principalHint || null,
                    };
                } else if (picked && typeof picked === 'object') {
                    out.stripe = {
                        membershipActive: false,
                        reason: /** @type {{ reason?: string; error?: string }} */ (picked).reason ||
                            /** @type {{ error?: string }} */ (picked).error ||
                            'not_found',
                    };
                }
            } else {
                out.stripe = { configured: false };
            }
            if (isPayPalConfigured()) {
                out.paypal = {
                    configured: true,
                    note: 'Provide paypalSubscriptionId from the canister row or PayPal dashboard for sync after reconnect.',
                };
                const subId = String(req.body?.paypalSubscriptionId ?? '').trim();
                if (subId) {
                    try {
                        const sub = await getPayPalSubscription(subId);
                        const meta = parsePayPalCustomId(sub.custom_id || '');
                        out.paypal = {
                            configured: true,
                            subscriptionId: sub.id,
                            status: sub.status,
                            principalHint: meta.principal || null,
                            subscriberEmail: sub.subscriber?.email_address || null,
                        };
                    } catch (e) {
                        out.paypal = {
                            configured: true,
                            error: e instanceof Error ? e.message : String(e),
                        };
                    }
                }
            } else {
                out.paypal = { configured: false };
            }
            return res.json(out);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return res.status(500).json({ error: msg });
        }
    });

    app.post('/account/reconnect/preview', requireApiKey, async (req, res) => {
        try {
            const email = String(req.body?.email ?? '').trim();
            const fromPrincipal = String(req.body?.fromPrincipal ?? '').trim();
            const toPrincipal = String(req.body?.toPrincipal ?? '').trim();
            if (!fromPrincipal || !toPrincipal) {
                return res.status(400).json({ error: 'fromPrincipal and toPrincipal required' });
            }
            Principal.fromText(fromPrincipal);
            Principal.fromText(toPrincipal);
            const actor = await getIntegrationActor();
            let fromAccess = '';
            let toAccess = '';
            if (actor?.integrationGetMembershipAccessForPrincipal) {
                fromAccess = decodeMembershipAccess(
                    await actor.integrationGetMembershipAccessForPrincipal(Principal.fromText(fromPrincipal)),
                );
                toAccess = decodeMembershipAccess(
                    await actor.integrationGetMembershipAccessForPrincipal(Principal.fromText(toPrincipal)),
                );
            }
            /** @type {string[]} */
            const warnings = [];
            if (fromPrincipal === toPrincipal) {
                warnings.push('fromPrincipal and toPrincipal are identical.');
            }
            if (toAccess && toAccess !== 'noAccount') {
                warnings.push('Target principal already has a canister account row.');
            }
            if (fromAccess === 'noAccount') {
                warnings.push('Source principal has no canister account row.');
            }
            let stripeSummary = null;
            if (email.includes('@') && stripe) {
                const picked = await getStripeCustomerAndBestSubscriptionByEmail(stripe, email);
                if (picked && typeof picked === 'object' && /** @type {{ ok?: boolean }} */ (picked).ok) {
                    const p = /** @type {{ membershipActive: boolean; subscription: { id: string; status: string; metadata?: Record<string, string> } }} */ (
                        picked
                    );
                    stripeSummary = {
                        membershipActive: p.membershipActive,
                        subscriptionId: p.subscription.id,
                        subscriptionStatus: p.subscription.status,
                        principalHint: p.subscription.metadata?.principal || null,
                    };
                    if (
                        p.subscription.metadata?.principal &&
                        p.subscription.metadata.principal !== fromPrincipal &&
                        p.subscription.metadata.principal !== toPrincipal
                    ) {
                        warnings.push(
                            `Stripe metadata.principal (${p.subscription.metadata.principal}) differs from both from/to principals.`,
                        );
                    }
                }
            }
            const canProceed =
                fromPrincipal !== toPrincipal &&
                fromAccess !== 'noAccount' &&
                (toAccess === 'noAccount' || toAccess === '');
            return res.json({
                email: email || null,
                fromPrincipal,
                toPrincipal,
                fromAccess: fromAccess || null,
                toAccess: toAccess || null,
                stripe: stripeSummary,
                warnings,
                canProceed,
            });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return res.status(400).json({ error: msg });
        }
    });

    app.post('/account/reconnect/complete', requireApiKey, async (req, res) => {
        try {
            const fromPrincipal = String(req.body?.fromPrincipal ?? '').trim();
            const toPrincipal = String(req.body?.toPrincipal ?? '').trim();
            const email = String(req.body?.email ?? '').trim();
            const paypalSubscriptionId = String(req.body?.paypalSubscriptionId ?? '').trim();
            if (!fromPrincipal || !toPrincipal) {
                return res.status(400).json({ error: 'fromPrincipal and toPrincipal required' });
            }
            Principal.fromText(fromPrincipal);
            Principal.fromText(toPrincipal);
            const actor = await getIntegrationActor();
            if (!actor?.integrationReconnectMemberPrincipal) {
                return res.status(503).json({
                    error: 'Canister integrationReconnectMemberPrincipal unavailable — deploy backend + refresh integration IDL.',
                });
            }
            const raw = await actor.integrationReconnectMemberPrincipal(
                Principal.fromText(fromPrincipal),
                Principal.fromText(toPrincipal),
            );
            const migrated = decodeAdminReconnectResult(raw);
            if (!migrated.ok) {
                return res.status(409).json({ ok: false, code: migrated.code });
            }
            /** @type {Record<string, unknown>} */
            const sync = { stripe: null, paypal: null };
            if (email.includes('@') && stripe) {
                sync.stripe = await syncStripeSubscriptionByEmailAndPrincipal(
                    stripe,
                    email,
                    toPrincipal,
                );
            }
            if (paypalSubscriptionId && isPayPalConfigured()) {
                try {
                    const sub = await getPayPalSubscription(paypalSubscriptionId);
                    const meta = parsePayPalCustomId(sub.custom_id || '');
                    const linked = {
                        ...sub,
                        custom_id: JSON.stringify({ ...meta, principal: toPrincipal }).slice(0, 127),
                    };
                    await pushPayPalSubscriptionToCanister(linked);
                    sync.paypal = { synced: true, subscriptionId: sub.id, status: sub.status };
                } catch (e) {
                    sync.paypal = {
                        synced: false,
                        error: e instanceof Error ? e.message : String(e),
                    };
                }
            }
            return res.json({ ok: true, migrated, sync });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return res.status(500).json({ error: msg });
        }
    });
}
