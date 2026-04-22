/**
 * Machine-readable map: each `testData` root key → where it is edited in Fusion Studio.
 * Keep in sync with `testData.js` and `CONTENT_PAGE_REGISTRY` in `database.js` (`primaryStudioSurface` / `studioSurfaces`).
 * @type {readonly { rootKey: string, studioSurface: string, detail?: string }[]}
 */
export const STUDIO_TESTDATA_MANIFEST = [
    { rootKey: 'programHero', studioSurface: 'home', detail: 'slug program-hero' },
    { rootKey: 'applicationProcess', studioSurface: 'content', detail: 'slug application-process' },
    { rootKey: 'termsAndConditions', studioSurface: 'content', detail: 'slug terms' },
    { rootKey: 'privacyPolicy', studioSurface: 'content', detail: 'slug privacy' },
    { rootKey: 'contact', studioSurface: 'content', detail: 'slug contact' },
    { rootKey: 'faq', studioSurface: 'content', detail: 'slug faq' },
    { rootKey: 'allPrograms', studioSurface: 'programs', detail: 'slug all-programs; Programs tab embed' },
    { rootKey: 'info', studioSurface: 'home', detail: 'slug site-info; chapters under Home / Programs / Products / Journal' },
    { rootKey: 'eventRow', studioSurface: 'home', detail: 'slug event-row' },
    { rootKey: 'editions', studioSurface: 'products', detail: 'slug editions-feed; Products tab embed' },
    { rootKey: 'allArtists', studioSurface: 'artists', detail: 'roster; deep locales → future user profile / advanced JSON (test)' },
    { rootKey: 'objectsHighlight', studioSurface: 'home', detail: 'slug objects-highlight' },
    { rootKey: 'galleryAccessCta', studioSurface: 'home', detail: 'slug gallery-access-cta' },
    { rootKey: 'journals', studioSurface: 'journal', detail: 'slug journals-block; Journal tab embed' },
    { rootKey: 'joinNetwork', studioSurface: 'home', detail: 'slug join-network' },
    { rootKey: 'joinNetworkFlow', studioSurface: 'home', detail: 'slug join-network-flow' },
    { rootKey: 'quoteRow', studioSurface: 'home', detail: 'slug quote-row' },
    { rootKey: 'featureCards', studioSurface: 'home', detail: 'slug feature-cards' },
    { rootKey: 'context', studioSurface: 'content', detail: 'slug context' },
    { rootKey: 'events', studioSurface: 'home', detail: 'slug events' },
    { rootKey: 'audio', studioSurface: 'home', detail: 'slug audio' },
];

/** @param {string} key */
export function studioManifestEntryForRootKey(key) {
    return STUDIO_TESTDATA_MANIFEST.find((e) => e.rootKey === key);
}
