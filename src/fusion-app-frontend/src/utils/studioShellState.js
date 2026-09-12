/**
 * Studio shell: effective permission matrix + who may see the Permissions nav item.
 * Set by `studio.js` after auth; read by section inits for Save / nav visibility.
 */

/** @type {Map<string, { visible: boolean, canEdit: boolean }> | null} */
let effectiveMatrix = null;

/** Admin or super staff — only these see `#permissions` and the Permissions sidebar entry. */
let permissionsNavAllowed = false;

/** Canister admin only — `#team` Team directory (separate from Permissions visibility). */
let teamNavAllowed = false;

/** Real canister admin (not a role preview). */
let isAdmin = false;

/** Admin role preview: `admin` | `staff` | `collaborator` | `` when the caller is not an admin. */
let previewRole = '';

/**
 * @param {{
 *   effectiveMatrix: Map<string, { visible: boolean, canEdit: boolean }> | null,
 *   permissionsNavAllowed: boolean,
 *   teamNavAllowed?: boolean,
 *   isAdmin?: boolean,
 *   previewRole?: string,
 * }} gate
 */
export function setStudioShellGate(gate) {
    effectiveMatrix = gate.effectiveMatrix;
    permissionsNavAllowed = Boolean(gate.permissionsNavAllowed);
    teamNavAllowed = Boolean(gate.teamNavAllowed);
    isAdmin = Boolean(gate.isAdmin);
    previewRole = String(gate.previewRole || '');
}

export function getStudioShellGate() {
    return { effectiveMatrix, permissionsNavAllowed, teamNavAllowed, isAdmin, previewRole };
}

/**
 * @param {string} featureId
 * @returns {{ visible: boolean, canEdit: boolean }}
 */
export function studioFeatureAccess(featureId) {
    if (effectiveMatrix == null) {
        return { visible: true, canEdit: true };
    }
    return effectiveMatrix.get(featureId) ?? { visible: true, canEdit: true };
}

/** @type {Record<string, string>} */
const FINANCE_CATEGORY_FEATURE_IDS = {
    Programs: 'financePrograms',
    Users: 'financeUsers',
    Products: 'financeProducts',
    Promotions: 'financePromotions',
    Invites: 'financeInvites',
};

/** Finance domain tabs / overview chips (requires parent `finance` visible). */
export const STUDIO_FINANCE_CATEGORIES = ['Programs', 'Users', 'Products', 'Promotions', 'Invites'];

/**
 * @param {'Programs' | 'Users' | 'Products' | 'Promotions'} subKey
 * @returns {{ visible: boolean, canEdit: boolean }}
 */
export function studioFinanceCategoryAccess(subKey) {
    const parent = studioFeatureAccess('finance');
    if (!parent.visible) return { visible: false, canEdit: false };
    const featureId = FINANCE_CATEGORY_FEATURE_IDS[subKey] || `finance${subKey}`;
    return studioFeatureAccess(featureId);
}

/** @returns {('Programs' | 'Users' | 'Products' | 'Promotions')[]} */
export function studioFinanceVisibleCategories() {
    return STUDIO_FINANCE_CATEGORIES.filter((k) => studioFinanceCategoryAccess(k).visible);
}

/**
 * @param {string} sectionId
 */
export function isStudioSectionNavAllowed(sectionId) {
    const id = String(sectionId || '').trim().toLowerCase();
    if (id === 'dashboard') return true;
    if (id === 'permissions') return permissionsNavAllowed;
    if (id === 'team') return teamNavAllowed;
    return studioFeatureAccess(id).visible;
}
