/**
 * Client-only admin "view as" perspective (sessionStorage). Does not change the canister.
 */

/** @typedef {'admin'|'staff'|'user'|'artist'|'collector'|'gallery'|'curator'} AdminPerspectiveRole */

export const ADMIN_PERSPECTIVE_STORAGE_KEY = 'fusionAdminPerspective';

/** @type {readonly AdminPerspectiveRole[]} */
export const ADMIN_PERSPECTIVE_ROLES = Object.freeze([
    'admin',
    'staff',
    'user',
    'artist',
    'collector',
    'gallery',
    'curator',
]);

/**
 * @param {unknown} v
 * @returns {v is AdminPerspectiveRole}
 */
function isAdminPerspectiveRole(v) {
    return typeof v === 'string' && ADMIN_PERSPECTIVE_ROLES.includes(/** @type {AdminPerspectiveRole} */ (v));
}

/**
 * @returns {AdminPerspectiveRole}
 */
export function getAdminPerspective() {
    try {
        const raw = sessionStorage.getItem(ADMIN_PERSPECTIVE_STORAGE_KEY);
        if (isAdminPerspectiveRole(raw)) return raw;
    } catch {
        /* ignore */
    }
    return 'admin';
}

/**
 * @param {AdminPerspectiveRole} role
 */
export function setAdminPerspective(role) {
    if (!isAdminPerspectiveRole(role)) return;
    try {
        sessionStorage.setItem(ADMIN_PERSPECTIVE_STORAGE_KEY, role);
    } catch {
        /* ignore */
    }
    window.dispatchEvent(
        new CustomEvent('fusion-admin-perspective-change', {
            detail: { perspective: role },
        })
    );
}

export function clearAdminPerspective() {
    try {
        sessionStorage.removeItem(ADMIN_PERSPECTIVE_STORAGE_KEY);
    } catch {
        /* ignore */
    }
}

/**
 * @returns {AdminPerspectiveRole}
 */
export function cycleAdminPerspective() {
    const cur = getAdminPerspective();
    const i = ADMIN_PERSPECTIVE_ROLES.indexOf(cur);
    const next = ADMIN_PERSPECTIVE_ROLES[(i >= 0 ? i + 1 : 0) % ADMIN_PERSPECTIVE_ROLES.length];
    setAdminPerspective(next);
    return next;
}

/**
 * @param {AdminPerspectiveRole} perspective
 * @returns {Record<string, null>}
 */
function perspectiveToRoleRecord(perspective) {
    switch (perspective) {
        case 'admin':
            return { admin: null };
        case 'staff':
            return { staff: null };
        case 'user':
            return { user: null };
        case 'artist':
            return { artist: null };
        case 'collector':
            return { collector: null };
        case 'gallery':
            return { gallery: null };
        case 'curator':
            return { curator: null };
        default:
            return { admin: null };
    }
}

/**
 * Minimal account-shaped object when the admin has no `UserAccount` row.
 * @returns {Record<string, unknown>}
 */
function minimalAccountShell() {
    return {
        role: { user: null },
        status: { active: null },
        linkedArtistId: [],
        linkedOrgId: [],
        updatedAt: '',
        stripeCustomerId: [],
        stripeSubscriptionId: [],
        stripeSubscriptionStatus: [],
        stripeCurrentPeriodEnd: [],
        membershipExemptManual: false,
    };
}

/**
 * @param {Record<string, unknown> | null | undefined} realAccount
 * @param {AdminPerspectiveRole} perspective
 * @returns {Record<string, unknown>}
 */
export function buildEffectiveAccountForPerspective(realAccount, perspective) {
    const base =
        realAccount && typeof realAccount === 'object'
            ? /** @type {Record<string, unknown>} */ ({ ...realAccount })
            : minimalAccountShell();
    base.role = perspectiveToRoleRecord(perspective);
    return base;
}

/**
 * @param {AdminPerspectiveRole} perspective
 * @param {boolean} en
 * @returns {string} Short label for the header toggle
 */
export function getPerspectiveButtonShortLabel(perspective, en) {
    if (en) {
        const m = {
            admin: 'ADM',
            staff: 'STF',
            user: 'USR',
            artist: 'ART',
            collector: 'COL',
            gallery: 'GAL',
            curator: 'CUR',
        };
        return m[perspective] ?? 'ADM';
    }
    const mJa = {
        admin: '管',
        staff: '職',
        user: '用',
        artist: '芸',
        collector: '収',
        gallery: '画',
        curator: '庫',
    };
    return mJa[perspective] ?? '管';
}

/**
 * @param {AdminPerspectiveRole} perspective
 * @param {boolean} en
 * @returns {string}
 */
export function getPerspectiveAriaLabel(perspective, en) {
    const namesEn = {
        admin: 'Admin',
        staff: 'Staff',
        user: 'User',
        artist: 'Artist',
        collector: 'Collector',
        gallery: 'Gallery',
        curator: 'Curator',
    };
    const namesJa = {
        admin: '管理者',
        staff: 'スタッフ',
        user: 'ユーザー',
        artist: 'アーティスト',
        collector: 'コレクター',
        gallery: 'ギャラリー',
        curator: 'キュレーター',
    };
    const n = en ? namesEn[perspective] : namesJa[perspective];
    return en
        ? `View site as ${n}. Click to switch perspective.`
        : `サイトを${n}として表示。クリックで切り替え。`;
}

/**
 * @returns {Promise<boolean>}
 */
export async function isRealAdminCaller() {
    try {
        const { getAuthenticatedFusionBackendActor } = await import('./earlyAccessSubscribe.js');
        const actor = await getAuthenticatedFusionBackendActor();
        if (!actor || typeof actor.isCallerAdmin !== 'function') return false;
        return await actor.isCallerAdmin();
    } catch {
        return false;
    }
}

/**
 * When the caller is a real admin, merge synthetic role for settings/dashboard labels.
 * @param {Record<string, unknown> | null | undefined} rawAccount
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function getEffectiveAccountForSettingsUi(rawAccount) {
    if (!(await isRealAdminCaller())) {
        return rawAccount && typeof rawAccount === 'object' ? rawAccount : null;
    }
    return buildEffectiveAccountForPerspective(rawAccount, getAdminPerspective());
}
