/**
 * True when the SPA is showing the main Journal feed (`/journal`).
 * Used by row components to hide placeholders when CMS data is missing.
 */
export function isJournalListingPage() {
    if (typeof window === 'undefined') return false;
    const p = window.location.pathname.replace(/\/$/, '') || '/';
    return p === '/journal';
}
