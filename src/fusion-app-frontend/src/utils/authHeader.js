/**
 * Header CTA helpers: map `UserAccount` from the canister to account routes.
 */

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
    // Header "PROFILE" is the member dashboard, not the public artist profile.
    return '/settings/profile';
}
