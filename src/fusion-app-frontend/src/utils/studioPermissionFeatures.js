/**
 * Studio permission matrix rows — ids must match Motoko `studioFeatureKeys` in `main.mo`
 * and sidebar section ids (`STUDIO_NAV` + `dashboard`).
 * The Permissions UI only sends rows returned by `adminGetStudioPermissionDefaults`, so older
 * canisters without newer keys (e.g. `sound`) do not receive unknown keys on save.
 */
export const STUDIO_PERMISSION_FEATURE_ROWS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'home', label: 'Home' },
    { id: 'subscribers', label: 'Subscribers' },
    { id: 'applicants', label: 'Applicants' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'finance', label: 'Finance', group: 'finance' },
    { id: 'financePrograms', label: 'Finance — Programs', group: 'finance' },
    { id: 'financeUsers', label: 'Finance — Users (membership)', group: 'finance' },
    { id: 'financeProducts', label: 'Finance — Products', group: 'finance' },
    { id: 'financePromotions', label: 'Finance — Promotions', group: 'finance' },
    { id: 'travel', label: 'Travel' },
    // Roster + Send blast: Studio gates blast on canEdit for this id (no extra Motoko key).
    { id: 'artists', label: 'Artists' },
    { id: 'programs', label: 'Programs' },
    { id: 'products', label: 'Products' },
    { id: 'gallery-access', label: 'Gallery Access' },
    { id: 'journal', label: 'Journal' },
    { id: 'sound', label: 'Sound' },
    { id: 'community', label: 'Community' },
    { id: 'content', label: 'Content' },
    { id: 'email', label: 'Email' },
    { id: 'ai', label: 'Ai' },
    { id: 'galleries', label: 'Galleries' },
    { id: 'collectors', label: 'Collectors' },
    { id: 'curators', label: 'Curators' },
    { id: 'users', label: 'Users' },
    { id: 'services', label: 'Services' },
    { id: 'settings', label: 'Settings' },
    { id: 'team', label: 'Team' },
];

/** Role tabs stored on the canister (Staff implemented in v1). */
export const STUDIO_PERMISSION_ROLE_TABS = [
    { id: 'staff', label: 'Staff' },
    { id: 'collaborator', label: 'Collaborator' },
    { id: 'curator', label: 'Curator' },
    { id: 'collector', label: 'Collector' },
    { id: 'artist', label: 'Artist' },
    { id: 'gallery', label: 'Gallery' },
];
