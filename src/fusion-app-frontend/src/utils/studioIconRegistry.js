/**
 * Semantic icon keys for Studio shell and Artist management redesign.
 * Add matching files under `src/assets/icons/` using `ic-<key>.svg`.
 *
 * Example: `src/assets/icons/ic-nav-artists.svg` -> key `nav-artists`
 */
export const ICON_KEYS = {
    groups: ['group-overview', 'group-content', 'group-accounts', 'group-operations', 'group-admin', 'group-moderation'],
    nav: [
        'nav-home',
        'nav-subscribers',
        'nav-applicants',
        'nav-programs',
        'nav-products',
        'nav-journal',
        'nav-sound',
        'nav-community',
        'nav-videos',
        'nav-content',
        'nav-email',
        'nav-ai',
        'nav-artists',
        'nav-pending-approval',
        'nav-curators',
        'nav-collectors',
        'nav-galleries',
        'nav-gallery-access',
        'nav-users',
        'nav-services',
        'nav-settings',
        'nav-team',
        'nav-permissions',
        'nav-scheduled-tasks',
        'nav-user-studio',
        'nav-profile-images',
        'nav-broadcasts',
    ],
    artistManage: [
        'artist-identity',
        'artist-visibility',
        'artist-profile-link',
        'artist-overview',
        'artist-quick-actions',
        'artist-system-info',
        'artist-delete',
        'artist-save',
        'artist-cancel',
    ],
    email: [
        'email-header-history',
        'email-field-audience',
        'email-compose',
        'email-send',
        'email-sticky-saved',
        'email-error',
    ],
};

/** Sidebar section id → existing icon when `ic-nav-{id}.svg` is absent. */
export const STUDIO_NAV_ICON_ALIASES = {
    schedule: 'nav-status',
    finance: 'nav-services',
    travel: 'nav-programs',
    comms: 'nav-email',
    radar: 'nav-ai',
    'join-network': 'nav-gallery-access',
    'audio-files': 'nav-sound',
};

/** Sidebar group label (lowercase) → existing group icon. */
export const STUDIO_GROUP_ICON_ALIASES = {
    management: 'group-operations',
};

const iconModules = import.meta.glob('../assets/icons/ic-*.svg', {
    eager: true,
    import: 'default',
});
const warnedMissing = new Set();

/**
 * @param {string} key semantic key (e.g. `nav-artists`)
 * @returns {string}
 */
export function studioIconHref(key) {
    const safe = String(key || '').trim().toLowerCase();
    if (!safe) return '';
    const path = `../assets/icons/ic-${safe}.svg`;
    const mod = iconModules[path];
    if (typeof mod === 'string') return mod;
    if (
        typeof window !== 'undefined' &&
        /localhost|127\.0\.0\.1/.test(window.location.hostname) &&
        !warnedMissing.has(safe)
    ) {
        warnedMissing.add(safe);
        console.warn(`[studio icons] missing asset for key "${safe}" (expected ${path})`);
    }
    return '';
}

/**
 * @param {string} sectionId Studio nav item id (e.g. `finance`, `schedule`)
 * @returns {string}
 */
export function studioNavIconHref(sectionId) {
    const id = String(sectionId || '').trim().toLowerCase();
    const alias = STUDIO_NAV_ICON_ALIASES[id];
    return studioIconHref(alias || `nav-${id}`);
}

/**
 * @param {string} groupLabel e.g. `Management`
 * @returns {string}
 */
export function studioGroupIconHref(groupLabel) {
    const groupKey = String(groupLabel || '').trim().toLowerCase();
    const alias = STUDIO_GROUP_ICON_ALIASES[groupKey];
    return studioIconHref(alias || `group-${groupKey}`);
}

