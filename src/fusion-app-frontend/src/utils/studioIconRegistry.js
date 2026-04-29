/**
 * Semantic icon keys for Studio shell and Artist management redesign.
 * Add matching files under `src/assets/icons/` using `ic-<key>.svg`.
 *
 * Example: `src/assets/icons/ic-nav-artists.svg` -> key `nav-artists`
 */
export const ICON_KEYS = {
    groups: ['group-overview', 'group-content', 'group-accounts', 'group-operations', 'group-admin'],
    nav: [
        'nav-home',
        'nav-subscribers',
        'nav-applicants',
        'nav-programs',
        'nav-products',
        'nav-journal',
        'nav-sound',
        'nav-community',
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

