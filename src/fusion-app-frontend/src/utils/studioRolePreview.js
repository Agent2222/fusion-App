/**
 * Admin-only Studio shell preview: view nav and edit chrome as Staff or Collaborator
 * without changing the signed-in account. Persists for the browser tab.
 */

export const STUDIO_ROLE_PREVIEW_STORAGE_KEY = 'fusion.studio.rolePreview';

/** @type {readonly ['admin', 'staff', 'collaborator']} */
export const STUDIO_ROLE_PREVIEW_IDS = Object.freeze(['admin', 'staff', 'collaborator']);

/**
 * @param {unknown} value
 * @returns {'admin' | 'staff' | 'collaborator'}
 */
export function normalizeStudioRolePreview(value) {
    const id = String(value || '')
        .trim()
        .toLowerCase();
    if (id === 'staff' || id === 'collaborator') return id;
    return 'admin';
}

function defaultStorage() {
    try {
        if (typeof sessionStorage !== 'undefined') return sessionStorage;
    } catch {
        /* private mode / SSR */
    }
    return null;
}

/**
 * @param {{ getItem?: (k: string) => string | null, setItem?: (k: string, v: string) => void, removeItem?: (k: string) => void } | null} [storage]
 * @returns {'admin' | 'staff' | 'collaborator'}
 */
export function getStudioRolePreview(storage = defaultStorage()) {
    try {
        return normalizeStudioRolePreview(storage?.getItem?.(STUDIO_ROLE_PREVIEW_STORAGE_KEY));
    } catch {
        return 'admin';
    }
}

/**
 * @param {unknown} role
 * @param {{ getItem?: (k: string) => string | null, setItem?: (k: string, v: string) => void, removeItem?: (k: string) => void } | null} [storage]
 * @returns {'admin' | 'staff' | 'collaborator'}
 */
export function setStudioRolePreview(role, storage = defaultStorage()) {
    const next = normalizeStudioRolePreview(role);
    try {
        if (!storage) return next;
        if (next === 'admin') storage.removeItem?.(STUDIO_ROLE_PREVIEW_STORAGE_KEY);
        else storage.setItem?.(STUDIO_ROLE_PREVIEW_STORAGE_KEY, next);
    } catch {
        /* ignore quota / private mode */
    }
    return next;
}

/**
 * @param {unknown} role
 */
export function studioRolePreviewLabel(role) {
    switch (normalizeStudioRolePreview(role)) {
        case 'staff':
            return 'Staff';
        case 'collaborator':
            return 'Collaborator';
        default:
            return 'Admin';
    }
}

/**
 * @param {unknown} role
 */
export function studioRolePreviewInitial(role) {
    return studioRolePreviewLabel(role).charAt(0);
}

/**
 * @param {unknown} role
 */
export function isStudioRolePreviewActive(role) {
    return normalizeStudioRolePreview(role) !== 'admin';
}

/**
 * Overlay an admin's real shell with a role permission matrix so nav and Save chrome
 * match that role. Non-admins always keep their real gate. Previewing Admin is a no-op.
 *
 * @param {{
 *   isAdmin?: boolean,
 *   isSuperStaff?: boolean,
 *   permissionsNavAllowed?: boolean,
 *   teamNavAllowed?: boolean,
 *   effectiveMatrix?: Map<string, { visible: boolean, canEdit: boolean }> | null,
 * }} realGate
 * @param {unknown} previewRole
 * @param {Map<string, { visible: boolean, canEdit: boolean }> | null | undefined} roleMatrix
 */
export function applyStudioRolePreviewToGate(realGate, previewRole, roleMatrix) {
    const isAdmin = Boolean(realGate?.isAdmin);
    const role = normalizeStudioRolePreview(previewRole);
    const base = {
        isAdmin,
        isSuperStaff: Boolean(realGate?.isSuperStaff),
        permissionsNavAllowed: Boolean(realGate?.permissionsNavAllowed),
        teamNavAllowed: Boolean(realGate?.teamNavAllowed),
        effectiveMatrix: realGate?.effectiveMatrix ?? null,
        previewRole: isAdmin ? 'admin' : '',
    };
    if (!isAdmin || role === 'admin' || !roleMatrix) {
        return base;
    }
    return {
        ...base,
        permissionsNavAllowed: false,
        teamNavAllowed: false,
        effectiveMatrix: roleMatrix,
        previewRole: role,
    };
}

/**
 * @param {unknown} selectedRole
 */
export function studioRolePreviewMenuItems(selectedRole) {
    const selected = normalizeStudioRolePreview(selectedRole);
    return STUDIO_ROLE_PREVIEW_IDS.map((id) => ({
        id,
        label: studioRolePreviewLabel(id),
        selected: id === selected,
    }));
}
