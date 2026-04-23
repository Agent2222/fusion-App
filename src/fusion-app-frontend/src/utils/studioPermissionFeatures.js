/**
 * Studio permission matrix rows — ids must match Motoko `studioFeatureKeys` in `main.mo`
 * and sidebar section ids (`STUDIO_NAV` + `dashboard`).
 */
export const STUDIO_PERMISSION_FEATURE_ROWS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'home', label: 'Home' },
    { id: 'subscribers', label: 'Subscribers' },
    { id: 'applicants', label: 'Applicants' },
    { id: 'artists', label: 'Artists' },
    { id: 'programs', label: 'Programs' },
    { id: 'products', label: 'Products' },
    { id: 'gallery-access', label: 'Gallery Access' },
    { id: 'journal', label: 'Journal' },
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
