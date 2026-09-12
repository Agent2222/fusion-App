/**
 * Team directory membership: canister admins plus staff / collaborator / account-admin roles.
 * Artists, galleries, curators, collectors, and other directory contacts stay out of Team.
 */

export const STUDIO_TEAM_ACCOUNT_ROLES = Object.freeze(['admin', 'staff', 'collaborator']);

/**
 * @param {unknown} p
 * @returns {string}
 */
export function studioTeamPrincipalKey(p) {
    if (p && typeof p === 'object' && 'toText' in p && typeof p.toText === 'function') {
        return p.toText();
    }
    return String(p ?? '').trim();
}

/**
 * @param {unknown} role — Candid variant key or label
 * @returns {boolean}
 */
export function isStudioTeamAccountRole(role) {
    const k = String(role || '')
        .trim()
        .toLowerCase();
    return k === 'admin' || k === 'staff' || k === 'collaborator';
}

/**
 * @param {unknown} role — Motoko `UserRole` (Candid record) or a string key
 * @returns {string}
 */
export function studioTeamRoleKey(role) {
    if (typeof role === 'string') {
        return String(role).trim().toLowerCase();
    }
    if (!role || typeof role !== 'object') return '';
    return String(Object.keys(/** @type {Record<string, unknown>} */ (role))[0] || '')
        .trim()
        .toLowerCase();
}

/**
 * @param {unknown} pair — `(Principal, AccountContact)` Candid tuple
 * @returns {{ principal: string, firstName: string, lastName: string, email: string } | null}
 */
export function parseStudioTeamContactPair(pair) {
    if (!Array.isArray(pair) && !(pair && typeof pair === 'object')) return null;
    const rec = /** @type {Record<string, unknown>} */ (pair);
    const pr = Array.isArray(pair) ? pair[0] : rec[0] ?? rec['0'];
    const c = Array.isArray(pair) ? pair[1] : rec[1] ?? rec['1'];
    if (!c || typeof c !== 'object') return null;
    const contact = /** @type {Record<string, unknown>} */ (c);
    const principal = studioTeamPrincipalKey(pr);
    if (!principal) return null;
    return {
        principal,
        firstName: String(contact.firstName ?? contact.first_name ?? ''),
        lastName: String(contact.lastName ?? contact.last_name ?? ''),
        email: String(contact.email ?? ''),
    };
}

/**
 * @param {{ isAdmin?: boolean, accountRole?: unknown }} row
 */
export function shouldShowStudioTeamRow(row) {
    return Boolean(row?.isAdmin) || isStudioTeamAccountRole(row?.accountRole);
}

/**
 * Build Team directory rows. Contacts and super-staff never create a row on their own.
 *
 * @param {{
 *   adminPrincipals?: unknown[],
 *   superStaffPrincipals?: unknown[],
 *   accounts?: Array<{ principal?: string, role?: string }>,
 *   contactPairs?: unknown[],
 * }} input
 * @returns {Array<{
 *   principal: string,
 *   isAdmin: boolean,
 *   isSuperStaff: boolean,
 *   acc: { principal?: string, role?: string } | null,
 *   contact: { firstName: string, lastName: string, email: string } | null,
 * }>}
 */
export function collectStudioTeamDirectoryRows(input) {
    const adminPrincipals = Array.isArray(input?.adminPrincipals) ? input.adminPrincipals : [];
    const superStaffPrincipals = Array.isArray(input?.superStaffPrincipals)
        ? input.superStaffPrincipals
        : [];
    const accounts = Array.isArray(input?.accounts) ? input.accounts : [];
    const contactPairs = Array.isArray(input?.contactPairs) ? input.contactPairs : [];

    /** @type {Map<string, { principal: string, isAdmin: boolean, isSuperStaff: boolean, acc: { principal?: string, role?: string } | null, contact: { firstName: string, lastName: string, email: string } | null }>} */
    const rows = new Map();
    const ensure = (k) => {
        const key = String(k || '').trim();
        if (!key) return null;
        if (!rows.has(key)) {
            rows.set(key, {
                principal: key,
                isAdmin: false,
                isSuperStaff: false,
                acc: null,
                contact: null,
            });
        }
        return rows.get(key);
    };

    const adminOrder = new Map();
    adminPrincipals.forEach((p, i) => {
        const k = studioTeamPrincipalKey(p);
        const row = ensure(k);
        if (!row) return;
        row.isAdmin = true;
        adminOrder.set(k, i);
    });

    for (const acc of accounts) {
        if (!isStudioTeamAccountRole(acc?.role)) continue;
        const row = ensure(String(acc?.principal || '').trim());
        if (row) row.acc = acc;
    }

    for (const p of superStaffPrincipals) {
        const existing = rows.get(studioTeamPrincipalKey(p));
        if (existing) existing.isSuperStaff = true;
    }

    for (const pair of contactPairs) {
        const parsed = parseStudioTeamContactPair(pair);
        if (!parsed) continue;
        const existing = rows.get(parsed.principal);
        if (!existing) continue;
        existing.contact = {
            firstName: parsed.firstName,
            lastName: parsed.lastName,
            email: parsed.email,
        };
    }

    const keys = [...rows.keys()]
        .filter((k) => {
            const row = rows.get(k);
            return shouldShowStudioTeamRow({ isAdmin: row?.isAdmin, accountRole: row?.acc?.role });
        })
        .sort((a, b) => {
            const ao = adminOrder.has(a) ? adminOrder.get(a) : 9999;
            const bo = adminOrder.has(b) ? adminOrder.get(b) : 9999;
            if (ao !== bo) return (ao ?? 0) - (bo ?? 0);
            return a.localeCompare(b);
        });

    return keys.map((k) => rows.get(k)).filter(Boolean);
}
