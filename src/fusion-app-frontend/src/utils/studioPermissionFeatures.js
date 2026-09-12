/**
 * Studio permission matrix rows — ids must match Motoko `studioFeatureKeys` in `main.mo`
 * and sidebar section ids (`STUDIO_NAV` + `dashboard`).
 * `group` labels match sidebar groups so Content / Moderation / Operations can be managed together.
 */
export const STUDIO_PERMISSION_FEATURE_ROWS = [
    { id: 'dashboard', label: 'Dashboard', group: 'overview' },
    { id: 'home', label: 'Home', group: 'overview' },
    { id: 'subscribers', label: 'Subscribers', group: 'overview' },
    { id: 'applicants', label: 'Applicants', group: 'management' },
    { id: 'schedule', label: 'Schedule', group: 'management' },
    { id: 'travel', label: 'Travel', group: 'management' },
    { id: 'comms', label: 'Comms', group: 'management' },
    { id: 'radar', label: 'Radar', group: 'management' },
    { id: 'finance', label: 'Finance', group: 'finance' },
    { id: 'financePrograms', label: 'Finance — Programs', group: 'finance' },
    { id: 'financeUsers', label: 'Finance — Users (membership)', group: 'finance' },
    { id: 'financeProducts', label: 'Finance — Products', group: 'finance' },
    { id: 'financePromotions', label: 'Finance — Promotions', group: 'finance' },
    { id: 'programs', label: 'Programs', group: 'content' },
    { id: 'products', label: 'Products', group: 'content' },
    { id: 'journal', label: 'Journal', group: 'content' },
    { id: 'sound', label: 'Sound', group: 'content' },
    { id: 'community', label: 'Community', group: 'content' },
    { id: 'videos', label: 'Videos', group: 'content' },
    { id: 'content', label: 'Content', group: 'content' },
    { id: 'user-studio', label: 'User Studio', group: 'content' },
    { id: 'email', label: 'Email', group: 'content' },
    { id: 'ai', label: 'Assistance', group: 'content' },
    { id: 'pending-approval', label: 'Status', group: 'moderation' },
    { id: 'profile-images', label: 'Profile Images', group: 'moderation' },
    { id: 'audio-files', label: 'Audio Files', group: 'moderation' },
    { id: 'broadcasts', label: 'Broadcasts', group: 'moderation' },
    { id: 'artists', label: 'Artists', group: 'accounts' },
    { id: 'curators', label: 'Curators', group: 'accounts' },
    { id: 'collectors', label: 'Collectors', group: 'accounts' },
    { id: 'galleries', label: 'Galleries', group: 'accounts' },
    { id: 'gallery-access', label: 'Gallery Access', group: 'operations' },
    { id: 'join-network', label: 'Join Network', group: 'operations' },
    { id: 'users', label: 'Users', group: 'operations' },
    { id: 'services', label: 'Services', group: 'operations' },
    { id: 'scheduled-tasks', label: 'Scheduled Tasks', group: 'operations' },
    { id: 'links', label: 'Links', group: 'operations' },
    { id: 'settings', label: 'Settings', group: 'operations' },
    { id: 'team', label: 'Team', group: 'admin' },
];

/** @type {Record<string, string>} */
export const STUDIO_PERMISSION_GROUP_LABELS = {
    overview: 'Overview',
    management: 'Management',
    finance: 'Finance (parent + category scopes)',
    content: 'Content',
    moderation: 'Moderation',
    accounts: 'Accounts',
    operations: 'Operations',
    admin: 'Admin',
};

/**
 * @param {string} group
 * @returns {string}
 */
export function studioPermissionGroupLabel(group) {
    const key = String(group || '').trim();
    return STUDIO_PERMISSION_GROUP_LABELS[key] || key;
}

const DEFAULT_STUDIO_FEATURE_ACCESS = { visible: true, canEdit: true };

/** Present in current Motoko `studioFeatureKeys`; missing from older deployed wasm. */
const CANISTER_PERMISSION_SENTINEL_KEYS = ['schedule', 'finance', 'videos', 'join-network', 'links'];

/**
 * Older IC builds may still answer `listStudioPermissionFeatureKeys` with a short legacy list
 * (e.g. has `applicants` but not `schedule` / `finance`). Treat as stale — do not grey out UI rows.
 *
 * @param {string[]} keys
 */
export function isStaleCanisterPermissionKeyList(keys) {
    if (!Array.isArray(keys) || keys.length < STUDIO_PERMISSION_FEATURE_ROWS.length - 6) {
        return true;
    }
    const set = new Set(keys);
    return CANISTER_PERMISSION_SENTINEL_KEYS.some((k) => !set.has(k));
}

/**
 * Parse canister permission matrix tuples (array or `{ 0, 1 }` object pairs).
 *
 * @param {unknown} tuples
 * @returns {Map<string, { visible: boolean, canEdit: boolean }>}
 */
export function parseStudioPermissionMatrixTuples(tuples) {
    const map = new Map();
    if (!Array.isArray(tuples)) return map;
    for (const row of tuples) {
        let k = '';
        let v = null;
        if (Array.isArray(row) && row.length >= 2) {
            k = String(row[0] ?? '');
            v = row[1];
        } else if (row && typeof row === 'object') {
            const o = /** @type {Record<string, unknown>} */ (row);
            k = String(o[0] ?? o['0'] ?? o._0_ ?? '');
            v = o[1] ?? o['1'] ?? o._1_;
        }
        if (!k || !v || typeof v !== 'object') continue;
        const access = /** @type {Record<string, unknown>} */ (v);
        map.set(k, {
            visible: Boolean(access.visible ?? access.Visible),
            canEdit: Boolean(access.canEdit ?? access.can_edit ?? access.CanEdit),
        });
    }
    return map;
}

/**
 * @param {Map<string, { visible: boolean, canEdit: boolean }>} a
 * @param {Map<string, { visible: boolean, canEdit: boolean }>} b
 */
export function studioPermissionMapsEqual(a, b) {
    for (const row of STUDIO_PERMISSION_FEATURE_ROWS) {
        const av = a.get(row.id) ?? DEFAULT_STUDIO_FEATURE_ACCESS;
        const bv = b.get(row.id) ?? DEFAULT_STUDIO_FEATURE_ACCESS;
        if (av.visible !== bv.visible || av.canEdit !== bv.canEdit) return false;
    }
    return true;
}

/**
 * Ensure every known feature row exists in the map (canister + optional role defaults for overrides).
 *
 * @param {Map<string, { visible: boolean, canEdit: boolean }>} canisterMap
 * @param {Map<string, { visible: boolean, canEdit: boolean }> | null | undefined} [roleDefaultMap]
 * @returns {Map<string, { visible: boolean, canEdit: boolean }>}
 */
export function mergeStudioPermissionMap(canisterMap, roleDefaultMap = null) {
    const out = new Map();
    for (const row of STUDIO_PERMISSION_FEATURE_ROWS) {
        if (canisterMap.has(row.id)) {
            out.set(row.id, canisterMap.get(row.id));
        } else if (roleDefaultMap?.has(row.id)) {
            out.set(row.id, roleDefaultMap.get(row.id));
        } else {
            out.set(row.id, { ...DEFAULT_STUDIO_FEATURE_ACCESS });
        }
    }
    return out;
}

/** Role tabs stored on the canister (Staff implemented in v1). */
export const STUDIO_PERMISSION_ROLE_TABS = [
    { id: 'staff', label: 'Staff' },
    { id: 'collaborator', label: 'Collaborator' },
    { id: 'curator', label: 'Curator' },
    { id: 'collector', label: 'Collector' },
    { id: 'artist', label: 'Artist' },
    { id: 'gallery', label: 'Gallery' },
];
