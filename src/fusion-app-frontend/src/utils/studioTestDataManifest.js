/**
 * Machine-readable map: each `testData` root key → where it is edited in Fusion Studio.
 * Keep in sync with `testData.js` and `CONTENT_PAGE_REGISTRY` in `database.js`.
 * @type {readonly { rootKey: string, studioSurface: string, detail?: string }[]}
 */
export const STUDIO_TESTDATA_MANIFEST = [
    { rootKey: 'programHero', studioSurface: 'content', detail: 'slug program-hero' },
    { rootKey: 'applicationProcess', studioSurface: 'content', detail: 'slug application-process' },
    { rootKey: 'termsAndConditions', studioSurface: 'content', detail: 'slug terms' },
    { rootKey: 'privacyPolicy', studioSurface: 'content', detail: 'slug privacy' },
    { rootKey: 'contact', studioSurface: 'content', detail: 'slug contact' },
    { rootKey: 'faq', studioSurface: 'content', detail: 'slug faq' },
    { rootKey: 'allPrograms', studioSurface: 'content+programs', detail: 'Content all-programs + Programs tab' },
    { rootKey: 'info', studioSurface: 'content', detail: 'slug site-info' },
    { rootKey: 'eventRow', studioSurface: 'content', detail: 'slug event-row' },
    { rootKey: 'editions', studioSurface: 'content+products', detail: 'Content editions-feed + Products tab' },
    { rootKey: 'allArtists', studioSurface: 'artists', detail: 'roster; deep locales → future user profile / advanced JSON (test)' },
    { rootKey: 'objectsHighlight', studioSurface: 'content', detail: 'slug objects-highlight' },
    { rootKey: 'galleryAccessCta', studioSurface: 'content', detail: 'slug gallery-access-cta' },
    { rootKey: 'journals', studioSurface: 'content+journal', detail: 'Content journals-block + Journal tab' },
    { rootKey: 'joinNetwork', studioSurface: 'content', detail: 'slug join-network' },
    { rootKey: 'joinNetworkFlow', studioSurface: 'content', detail: 'slug join-network-flow' },
    { rootKey: 'quoteRow', studioSurface: 'content', detail: 'slug quote-row' },
    { rootKey: 'featureCards', studioSurface: 'content', detail: 'slug feature-cards' },
    { rootKey: 'context', studioSurface: 'content', detail: 'slug context' },
    { rootKey: 'events', studioSurface: 'content', detail: 'slug events' },
    { rootKey: 'audio', studioSurface: 'content', detail: 'slug audio' },
];

/** @param {string} key */
export function studioManifestEntryForRootKey(key) {
    return STUDIO_TESTDATA_MANIFEST.find((e) => e.rootKey === key);
}
