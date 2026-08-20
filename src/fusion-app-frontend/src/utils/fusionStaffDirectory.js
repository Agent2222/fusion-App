/**
 * Fusion ops staff for Schedule assignment (Starr, Zoia, Akari).
 * Prefers Team directory contacts when names match; otherwise uses the known triad.
 */
import { initialsFromName } from './scheduleModel.js';
import {
    adminListAccountContactsForStudio,
    adminListSuperStaffStudio,
    getAccountsForStudio,
    listAdminsForStudio,
} from './database.js';

/**
 * @typedef {{ id: string, name: string, initials: string, email?: string }} FusionScheduleStaff
 */

/** Canonical Fusion schedule assignees (ids stable for event persistence). */
export const FUSION_SCHEDULE_STAFF = Object.freeze([
    { id: 'staff-starr', name: 'Starr Oge', initials: 'SO', email: '' },
    { id: 'staff-zoia', name: 'Zoia Amadi', initials: 'ZA', email: '' },
    { id: 'staff-akari', name: 'Akari Koizumi', initials: 'AK', email: '' },
]);

/**
 * @param {string} fullName
 * @returns {'starr' | 'zoia' | 'akari' | null}
 */
function matchFusionStaffKey(fullName) {
    const n = String(fullName || '')
        .trim()
        .toLowerCase();
    if (!n) return null;
    if (n.includes('starr')) return 'starr';
    if (n.includes('zoia')) return 'zoia';
    if (n.includes('akari')) return 'akari';
    return null;
}

/**
 * @param {unknown} p
 */
function principalKey(p) {
    if (p && typeof p === 'object' && 'toText' in p && typeof /** @type {any} */ (p).toText === 'function') {
        return /** @type {{ toText: () => string }} */ (p).toText();
    }
    return String(p ?? '');
}

/**
 * Load Starr / Zoia / Akari for Schedule assignment (with Team directory emails when available).
 * @returns {Promise<FusionScheduleStaff[]>}
 */
export async function listFusionScheduleStaff() {
    /** @type {Map<string, FusionScheduleStaff>} */
    const byKey = new Map(
        FUSION_SCHEDULE_STAFF.map((s) => {
            const key = matchFusionStaffKey(s.name) || s.id;
            return [key, { ...s }];
        }),
    );

    try {
        const [admins, supers, accounts, contactPairs] = await Promise.all([
            listAdminsForStudio().catch(() => []),
            adminListSuperStaffStudio().catch(() => []),
            getAccountsForStudio().catch(() => []),
            adminListAccountContactsForStudio().catch(() => []),
        ]);

        /** @type {Set<string>} */
        const staffPrincipals = new Set();
        for (const p of admins || []) staffPrincipals.add(principalKey(p));
        for (const p of supers || []) staffPrincipals.add(principalKey(p));
        for (const row of accounts || []) {
            const role = String(row?.role || '').toLowerCase();
            if (role === 'staff' || role === 'admin' || role === 'collaborator') {
                staffPrincipals.add(String(row.principal || ''));
            }
        }

        for (const pair of contactPairs || []) {
            if (!pair) continue;
            const pr = Array.isArray(pair) ? pair[0] : /** @type {any} */ (pair)[0];
            const c = Array.isArray(pair) ? pair[1] : /** @type {any} */ (pair)[1];
            if (!c || typeof c !== 'object') continue;
            const pk = principalKey(pr);
            if (staffPrincipals.size && !staffPrincipals.has(pk)) continue;
            const fullName = [c.firstName ?? c.first_name, c.lastName ?? c.last_name]
                .map((x) => String(x || '').trim())
                .filter(Boolean)
                .join(' ');
            const key = matchFusionStaffKey(fullName);
            if (!key) continue;
            const base = byKey.get(key) || FUSION_SCHEDULE_STAFF.find((s) => matchFusionStaffKey(s.name) === key);
            if (!base) continue;
            const email = String(c.email || '')
                .trim()
                .toLowerCase();
            byKey.set(key, {
                id: base.id,
                name: fullName || base.name,
                initials: initialsFromName(fullName || base.name),
                email: email.includes('@') ? email : base.email || '',
            });
        }
    } catch {
        /* keep canonical triad */
    }

    const order = ['starr', 'zoia', 'akari'];
    return order.map((k) => byKey.get(k)).filter(Boolean);
}
