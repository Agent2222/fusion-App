/**
 * Header CTA helpers: map `UserAccount` from the canister to profile routes.
 */
import { getArtists } from './database.js';

/**
 * Account has on-chain `UserRole` that uses Studio (no public artist profile required).
 * @param {unknown} account
 * @returns {boolean}
 */
export function accountIsStudioTeamRole(account) {
    if (!account || typeof account !== 'object') return false;
    const role = /** @type {Record<string, unknown>} */ (account).role;
    if (!role || typeof role !== 'object') return false;
    return 'admin' in role || 'staff' in role || 'collaborator' in role;
}

/**
 * Map early-access / join category label to Motoko `UserRole` (Candid record variants).
 * @param {string} cat
 * @returns {Record<string, null>}
 */
export function categoryToUserRole(cat) {
    const s = String(cat || '').toLowerCase();
    if (s.includes('staff')) return { staff: null };
    if (s.includes('collaborator')) return { collaborator: null };
    if (s.includes('artist')) return { artist: null };
    if (s.includes('gallery')) return { gallery: null };
    if (s.includes('curator')) return { curator: null };
    if (s.includes('collector')) return { collector: null };
    return { artist: null };
}

/**
 * @param {unknown} opt — Motoko optional (array or value)
 * @returns {unknown}
 */
export function unwrapOpt(opt) {
    if (opt == null) return null;
    if (Array.isArray(opt)) return opt.length ? opt[0] : null;
    return opt;
}

/**
 * @param {Record<string, unknown> | null | undefined} account
 * @returns {Promise<string>}
 */
export async function resolveProfilePathForAccount(account) {
    if (!account || typeof account !== 'object') return '/settings/profile';
    const role = /** @type {Record<string, unknown>} */ (account.role);
    if (role && typeof role === 'object') {
        if ('admin' in role || 'staff' in role || 'collaborator' in role) return '/studio';
    }
    const linked = unwrapOpt(account.linkedArtistId ?? account.linked_artist_id);
    const linkedId = linked != null ? String(linked) : '';
    if (linkedId && role && typeof role === 'object' && 'artist' in role) {
        try {
            const artists = await getArtists();
            const row = artists.find((a) => a && String(a.id) === linkedId);
            if (row?.slug) return `/profile/${encodeURIComponent(String(row.slug))}`;
        } catch (_) {
            /* fallback */
        }
    }
    return '/settings/profile';
}
