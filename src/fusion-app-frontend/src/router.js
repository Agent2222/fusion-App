import { DEV_MODE } from './config.js';
import { applyDocumentSeo } from './utils/documentSeo.js';
import {
    FUSION_PROGRAM_APPLICATION_LEAVE_CONFIRM,
    fusionNavPathnameOnly,
    isFusionProgramApplicationUnsaved,
} from './utils/programApplicationGuard.js';
import { getGateStateForPath, renderGatedHomeInnerHtml, renderGatedPageHtml } from './utils/pageGate.js';

import { renderHeader } from './components/shared/header.js';
import { renderFooter } from './components/shared/footer.js';

import LightLogo from './assets/Fusion-X-logo-03.png';
import DarkLogo from './assets/Fusion-X-logo-02.png';
import DarkSymbolLogo from './assets/Fusion-X-SymbolLogo.png';
import LightSymbolLogo from './assets/Fusion-X-SymbolLogo-2.png';

let headerAndFooterActive = false;

/** @param {string} path */
function robotsForPath(path) {
    if (path === '/studio') return 'noindex, nofollow';
    if (path === '/join-fusion') return 'noindex, nofollow';
    if (path.startsWith('/settings') || path === '/sign-in' || path === '/register') {
        return 'noindex, nofollow';
    }
    return '';
}

/**
 * Profile, settings, and dynamic detail routes set SEO in their own init (documentSeo).
 * @param {string} path
 */
function shouldDeferSeoToPage(path) {
    if (path === '/join-fusion') return true;
    if (path.startsWith('/profile')) return true;
    if (path.startsWith('/settings')) return true;
    const isEditionDetail =
        path.startsWith('/editions/') && path.slice('/editions/'.length).split('/').filter(Boolean)[0];
    const isProgramDetail =
        (path.startsWith('/program/') && path.slice('/program/'.length).split('/').filter(Boolean)[0]) ||
        (path.startsWith('/programs/') &&
            path.slice('/programs/'.length).split('/').filter(Boolean)[0]);
    const isJournalEntryDetail =
        path.startsWith('/journal/entry/') &&
        path.slice('/journal/entry/'.length).split('/').filter(Boolean)[0];
    const isEventDetail =
        path.startsWith('/event/') && path.slice('/event/'.length).split('/').filter(Boolean)[0];
    return Boolean(
        isEditionDetail || isProgramDetail || isJournalEntryDetail || isEventDetail,
    );
}

/**
 * @param {string} path
 * @param {{ title: string, description?: string }} route
 */
function applyRouterSeo(path, route) {
    if (shouldDeferSeoToPage(path)) return;
    let robots = robotsForPath(path);
    if (route.contentGenerator === 'generateNotFoundContent') {
        robots = 'noindex, nofollow';
    }
    applyDocumentSeo({
        title: route.title,
        description: route.description || '',
        path,
        robots: robots || undefined,
        homeOrganizationJsonLd: path === '/',
    });
}

// Route configuration object
const routes = {
    '/': {
        loader: () => import('./components/home.js'),
        title: 'Fusion — Japan artist residencies & art platform',
        description:
            'Fusion connects artists with curated Japan artist residency programs, editions, and editorial context. A premium art platform for place-based practice.',
        contentGenerator: 'generateHomeContent',
        isFullPage: true // Home page renders full page structure
    },
    '/artists': {
        loader: () => import('./components/artists.js'),
        title: 'Artists on Fusion — curated network',
        description:
            'Discover artists working through Fusion’s Japan-based programs and progressive art platform.',
        contentGenerator: 'generateArtistsContent',
        isFullPage: false // Artists page renders full page structure
    },
    '/programs': {
        loader: () => import('./components/programs.js'),
        title: 'Japan artist residency programs · Fusion',
        description:
            'Curated artist residencies and programs across Japan — explore Fusion’s place-based opportunities.',
        contentGenerator: 'generateProgramsContent',
    },
    '/program-view': {
        loader: () => import('./components/programView.js'),
        title: 'Program · Fusion',
        description:
            'Artist residency program details, schedule, and application information on Fusion.',
        contentGenerator: 'generateProgramViewContent',
        isFullPage: false,
    },
    '/gallery-access': {
        loader: () => import('./components/gallery-access.js'),
        title: 'Gallery access · Fusion',
        description:
            'Curated gallery access and artist introductions through Fusion’s network.',
        contentGenerator: 'generateGalleryAccessContent'
    },
    '/editions': {
        loader: () => import('./components/editions.js'),
        title: 'Editions & objects · Fusion',
        description:
            'Prints, objects, and works released through Fusion artists and partners.',
        contentGenerator: 'generateEditionsContent',
    },
    '/journal': {
        loader: () => import('./components/journal.js'),
        title: 'Journal — editorial & field notes · Fusion',
        description:
            'Editorial writing, documentation, and perspectives from Fusion’s art platform.',
        contentGenerator: 'generateJournalContent',
        isFullPage: false,
    },
    '/community': {
        loader: () => import('./components/navPages.js'),
        title: 'Community · Fusion',
        description: 'Fusion’s artist community and membership programs.',
        contentGenerator: 'generateCommunityContent'
    },
    '/context': {
        loader: () => import('./components/context.js'),
        title: 'Context — mission & ecosystem · Fusion',
        description:
            'Why Fusion exists: mission, ecosystem, and Japan artist residency focus for our art platform.',
        contentGenerator: 'generateContextContent',
        isFullPage: false,
    },
    '/sign-in': {
        loader: () => import('./components/navPages.js'),
        title: 'Sign in · Fusion',
        description: 'Sign in to your Fusion member account.',
        contentGenerator: 'generateSignInContent'
    },
    '/register': {
        loader: () => import('./components/settingsProfile.js'),
        title: 'Account · Fusion',
        description: 'Create or manage your Fusion member profile and account.',
        contentGenerator: 'generateSettingsProfileContent',
    },
    '/contact': {
        loader: () => import('./components/contact.js'),
        title: 'Contact Fusion',
        description: 'Contact the Fusion team — partnerships, programs, and general inquiries.',
        contentGenerator: 'generateContactContent',
    },
    '/join-fusion': {
        loader: () => import('./components/joinFusion.js'),
        title: 'Join Fusion team',
        description: 'Onboard to Fusion with a staff or collaborator invite code.',
        contentGenerator: 'generateJoinFusionContent',
    },
    '/profile': {
        loader: () => import('./components/profile.js'),
        title: 'Artist profile · Fusion',
        description: 'Artist profiles on Fusion’s Japan artist residency and programs platform.',
        contentGenerator: 'generateProfileContent',
    },
    '/edition-view': {
        loader: () => import('./components/editionView.js'),
        title: 'Edition · Fusion',
        description: 'Edition details, images, and release information on Fusion.',
        contentGenerator: 'generateEditionViewContent',
    },
    '/journal-entry-view': {
        loader: () => import('./components/journalEntry.js'),
        title: 'Journal entry · Fusion',
        description: 'Journal editorial entry on Fusion’s art platform.',
        contentGenerator: 'generateJournalEntryContent',
    },
    '/event-view': {
        loader: () => import('./components/event.js'),
        title: 'Event · Fusion',
        description: 'Events, talks, and gatherings on Fusion.',
        contentGenerator: 'generateEventContent',
    },
    '/studio': {
        loader: () => import('./components/studio.js'),
        title: 'Fusion Studio',
        description: 'Content and program administration for Fusion (members only).',
        isFullPage: true,
        /** Skip auto-injected public header/footer — studio is a separate shell. */
        noChrome: true,
    },
    '/settings/profile': {
        loader: () => import('./components/settingsProfile.js'),
        title: 'Profile settings · Fusion',
        description: 'Edit your public artist profile and account settings on Fusion.',
        contentGenerator: 'generateSettingsProfileContent',
    },
    '/404': {
        loader: () => import('./components/notFound.js'),
        title: 'Page not found · Fusion',
        description: 'The page you are looking for is not available on Fusion.',
        contentGenerator: 'generateNotFoundContent'
    }
};

/** Paths like `/profile/:slug` share the profile module; exact map keys only match `/profile`. */
/** `/editions/:slug` (not `/editions`) loads `editionView`. */
function matchContentRoute(path) {
    if (path === '/settings' || path.startsWith('/settings/')) {
        return routes['/settings/profile'];
    }
    if (path === '/profile' || path.startsWith('/profile/')) {
        return routes['/profile'];
    }
    if (path.startsWith('/program/')) {
        const seg = path.slice('/program/'.length).split('/').filter(Boolean)[0];
        if (seg) {
            return routes['/program-view'];
        }
    }
    if (path.startsWith('/programs/')) {
        const seg = path.slice('/programs/'.length).split('/').filter(Boolean)[0];
        if (seg) {
            return routes['/program-view'];
        }
    }
    if (path.startsWith('/editions/')) {
        const seg = path.slice('/editions/'.length).split('/').filter(Boolean)[0];
        if (seg) {
            return routes['/edition-view'];
        }
    }
    if (path.startsWith('/journal/entry/')) {
        const seg = path.slice('/journal/entry/'.length).split('/').filter(Boolean)[0];
        if (seg) {
            return routes['/journal-entry-view'];
        }
    }
    if (path.startsWith('/event/')) {
        const seg = path.slice('/event/'.length).split('/').filter(Boolean)[0];
        if (seg) {
            return routes['/event-view'];
        }
    }
    return routes[path] || null;
}

/**
 * True when `path` is a program detail URL with a non-empty first segment (same idea as `matchContentRoute` for program-view).
 * @param {string} path
 */
function isProgramViewPath(path) {
    return Boolean(
        (path.startsWith('/program/') && path.slice('/program/'.length).split('/').filter(Boolean)[0]) ||
            (path.startsWith('/programs/') && path.slice('/programs/'.length).split('/').filter(Boolean)[0]),
    );
}

// Router class
class Router {
    constructor() {
        this.routes = routes;
        this.currentRoute = null;
        this.init();
        this.viewedLandingPage = false;
        /** Skip transition veil on the first `handleRoute` (initial load). */
        this._hasHandledRouteOnce = false;
    }

    init() {
        // Avoid the browser fighting our own scroll resets on SPA navigations.
        if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }

        // Handle browser back/forward (history already updated — do not pushState here).
        window.addEventListener('popstate', () => {
            this.handleRoute();
        });

        // Handle initial route
        this.handleRoute();

        // Add click event listeners to navigation links
        this.setupNavigation();
    }

    applyThemeForPath(path) {
        if (path === '/studio') {
            document.documentElement.setAttribute('data-theme', 'light');
            document.documentElement.setAttribute('data-studio', 'true');
            document.documentElement.removeAttribute('data-fusion-page');
            return;
        }
        document.documentElement.removeAttribute('data-studio');
        document.documentElement.setAttribute(
            'data-theme',
            path === '/gallery-access' ? 'dark' : 'light'
        );
        /* Header layout: sound env control aligns right on artist profile (see app-header). */
        if (path === '/profile' || path.startsWith('/profile/')) {
            document.documentElement.setAttribute('data-fusion-page', 'profile');
        } else {
            document.documentElement.removeAttribute('data-fusion-page');
        }
        /* Artwork/Profile card toggle: home + artists only (program pages use profile-first images on confirmed strip). */
        if (path === '/' || path === '/artists') {
            document.documentElement.setAttribute('data-fusion-artist-card-toggle', 'on');
        } else {
            document.documentElement.removeAttribute('data-fusion-artist-card-toggle');
        }
    }

    /**
     * `app-loadscreen` is `position:fixed; z-index:1000` and sits above `#app`. Opening `/studio`
     * (e.g. debug “Open Studio”) before “click to enter” would leave the loadscreen covering the
     * dashboard — hide it for this route only (do not re-show when navigating away).
     * Program “click to enter” is deferred to `applyProgramViewAutoEnterIfNeeded` after
     * header/footer exist in `#app` (see `loadscreen.js` `performEnterSite`).
     */
    syncLoadscreenForPath(path) {
        const ls = document.querySelector('app-loadscreen');
        if (!ls) return;
        // Debug shortcuts (Studio, Profile settings) can run before “click to enter” — hide the veil.
        if (path === '/studio' || path.startsWith('/settings')) {
            ls.visible = false;
            ls.style.zIndex = '';
        }
    }

    /**
     * After route HTML is in place, same as a tap on the loadscreen: `performEnterSite` on program deep links
     * so the veil recedes and #header / #footer get `active` (not before `handleRoute` injects chrome — an early
     * call can set `_userHasEnteredSite` with no header and block a second enter).
     * @param {string} path
     */
    applyProgramViewAutoEnterIfNeeded(path) {
        if (typeof document === 'undefined' || !isProgramViewPath(path)) return;
        const run = () => {
            const ls = document.querySelector('app-loadscreen');
            if (ls && typeof ls.performEnterSite === 'function') {
                ls.performEnterSite();
            }
        };
        if (customElements.get('app-loadscreen')) {
            run();
        } else {
            void customElements.whenDefined('app-loadscreen').then(run);
        }
    }

    /**
     * Header is injected later in `handleRoute` (and is absent on first paint). Only touch the shadow
     * DOM when `#header` exists, and run this again after the route DOM is ready.
     */
    syncHeaderLogosForPath(path) {
        const header = document.getElementById('header');
        const footer = document.getElementById('footer');
        const root = header?.shadowRoot;
        const footerRoot = footer?.shadowRoot;
        if (!root) return;

        const headerLogo = root.getElementById('headerLogo');
        const headerLogoSymbol = root.getElementById('headerLogoSymbol');
        const headerSymbolLogo = root.getElementById('headerSymbolLogo');
        const footerLogo = footerRoot.getElementById('footerSymbolLogo');
        if (path === '/gallery-access') {
            if (headerLogo) headerLogo.src = LightLogo;
            if (headerLogoSymbol) headerLogoSymbol.src = LightSymbolLogo;
            if (headerSymbolLogo) headerSymbolLogo.src = LightSymbolLogo;
            if (footerLogo) footerLogo.src = LightSymbolLogo;
        } else {
            if (headerLogo) headerLogo.src = DarkLogo;
            if (headerLogoSymbol) headerLogoSymbol.src = DarkSymbolLogo;
            if (headerSymbolLogo) headerSymbolLogo.src = DarkSymbolLogo;
            if (footerLogo) footerLogo.src = DarkSymbolLogo;
        }
    }

    async handleRoute() {
        let path = window.location.pathname;
        if (path.length > 1 && path.endsWith('/')) {
            path = path.slice(0, -1);
            window.history.replaceState(
                {},
                '',
                path + window.location.search + window.location.hash,
            );
        }
        const route = matchContentRoute(path) || this.routes['/404'];
        if (path !== '/studio' && typeof document !== 'undefined') {
            document.body.style.overflow = '';
        }
        this.applyThemeForPath(path);
        this.syncLoadscreenForPath(path);

        const ptEl =
            typeof document !== 'undefined' ? document.querySelector('app-page-transition') : null;
        let didCover = false;

        try {
            if (this._hasHandledRouteOnce && ptEl && typeof ptEl.cover === 'function') {
                await ptEl.cover();
                didCover = true;
            }

            const gate = getGateStateForPath(path);
            const usePageGate =
                gate.gated === true && gate.copy && gate.pageKey && !route.noChrome;

            if (usePageGate) {
                if (path === '/' && route.isFullPage) {
                    const headerWasActive = document.getElementById('header')?.getAttribute('active') === 'true';
                    const footerWasActive = document.getElementById('footer')?.getAttribute('active') === 'true';

                    const html = `
                        <div class="page home-page">
                            ${renderHeader()}
                            ${renderFooter()}
                            <main id="homeMain" class="main-cont">
                                <div id="homeMainContent" class="feed-container">
                                    ${renderGatedHomeInnerHtml(gate.copy, path, gate.pageKey)}
                                </div>
                            </main>
                        </div>
                    `;
                    const appElement = document.getElementById('app') || document.getElementById('root');
                    if (appElement) {
                        appElement.innerHTML = html;
                    }

                    const hasHeader = !!document.getElementById('header');
                    const hasFooter = !!document.getElementById('footer');
                    if (
                        headerAndFooterActive === false &&
                        (!hasHeader || !hasFooter) &&
                        !route.noChrome
                    ) {
                        const headerHtml = renderHeader();
                        const footerHtml = renderFooter();
                        const parser = new DOMParser();
                        const footerElement = parser.parseFromString(footerHtml, 'text/html').body.firstChild;
                        const headerElement = parser.parseFromString(headerHtml, 'text/html').body.firstChild;
                        if (!hasHeader) appElement.appendChild(headerElement);
                        if (!hasFooter) appElement.appendChild(footerElement);
                        headerAndFooterActive = true;
                    } else if (hasHeader && hasFooter) {
                        headerAndFooterActive = true;
                    }

                    this.viewedLandingPage = true;

                    if (headerWasActive) {
                        document.getElementById('header')?.setAttribute('active', 'true');
                    }
                    if (footerWasActive) {
                        document.getElementById('footer')?.setAttribute('active', 'true');
                    }
                } else {
                    this.ensurePersistentStructure();

                    let appElement2 = document.getElementById('app');
                    const hasHeader = !!document.getElementById('header');
                    const hasFooter = !!document.getElementById('footer');
                    if (headerAndFooterActive === false && (!hasHeader || !hasFooter)) {
                        const headerHtml = renderHeader();
                        const footerHtml = renderFooter();
                        const parser = new DOMParser();
                        const footerElement = parser.parseFromString(footerHtml, 'text/html').body.firstChild;
                        const headerElement = parser.parseFromString(headerHtml, 'text/html').body.firstChild;
                        if (!hasHeader) appElement2.appendChild(headerElement);
                        if (!hasFooter) appElement2.appendChild(footerElement);
                        headerAndFooterActive = true;
                    } else if (hasHeader && hasFooter) {
                        headerAndFooterActive = true;
                    }

                    let mainContent = document.getElementById('mainContent');
                    if (!mainContent) {
                        const appElement = document.getElementById('app') || document.getElementById('root');
                        const main = document.createElement('main');
                        main.id = 'mainContent';
                        appElement.appendChild(main);
                        mainContent = main;
                    }

                    const headerWasActiveInjected = document.getElementById('header')?.getAttribute('active') === 'true';
                    const footerWasActiveInjected = document.getElementById('footer')?.getAttribute('active') === 'true';

                    mainContent.innerHTML = renderGatedPageHtml(path, gate.copy, gate.pageKey);

                    if (headerWasActiveInjected) {
                        document.getElementById('header')?.setAttribute('active', 'true');
                    }
                    if (footerWasActiveInjected) {
                        document.getElementById('footer')?.setAttribute('active', 'true');
                    }
                }

                this.activateDeactivate(path);
                this.scrollRouteContainersToTop();

                const isEditionDetail =
                    path.startsWith('/editions/') && path.slice('/editions/'.length).split('/').filter(Boolean)[0];
                const isProgramDetail =
                    (path.startsWith('/program/') && path.slice('/program/'.length).split('/').filter(Boolean)[0]) ||
                    (path.startsWith('/programs/') &&
                        path.slice('/programs/'.length).split('/').filter(Boolean)[0]);
                const isJournalEntryDetail =
                    path.startsWith('/journal/entry/') &&
                    path.slice('/journal/entry/'.length).split('/').filter(Boolean)[0];
                const isEventDetail =
                    path.startsWith('/event/') && path.slice('/event/'.length).split('/').filter(Boolean)[0];
                if (
                    !path.startsWith('/profile') &&
                    !path.startsWith('/settings') &&
                    !isProgramDetail &&
                    !isEditionDetail &&
                    !isJournalEntryDetail &&
                    !isEventDetail
                ) {
                    applyRouterSeo(path, route);
                }

                this.onRouteChange(path, route);
                this.syncHeaderLogosForPath(path);
            } else {
            // Load component module (static loader so bundlers can include it)
            const componentModule = await route.loader();
            
            // Handle full page routes (like home)
            // Always replace the full page so we don't accumulate multiple headers/footers.
            if (route.isFullPage) {
                const renderFunction = componentModule.render;

                // Preserve the user's "entered app" state: if header/footer were active before we replaced #app,
                // keep the new instances active as well.
                const headerWasActive = document.getElementById('header')?.getAttribute('active') === 'true';
                const footerWasActive = document.getElementById('footer')?.getAttribute('active') === 'true';
                
                if (!renderFunction || typeof renderFunction !== 'function') {
                    throw new Error(`No render function found for route ${path}`);
                }
                
                // Generate full page HTML
                const html = renderFunction();
                
                // Update page content
                const appElement = document.getElementById('app') || document.getElementById('root');
                if (appElement) {
                    appElement.innerHTML = html;
                }
                
                const hasHeader = !!document.getElementById('header');
                const hasFooter = !!document.getElementById('footer');
                if (
                    headerAndFooterActive === false &&
                    (!hasHeader || !hasFooter) &&
                    !route.noChrome
                ) {
                    const headerHtml = renderHeader();
                    const footerHtml = renderFooter();
                    const parser = new DOMParser();
                    const footerElement = parser.parseFromString(footerHtml, 'text/html').body.firstChild;
                    const headerElement = parser.parseFromString(headerHtml, 'text/html').body.firstChild;
                    if (!hasHeader) appElement.appendChild(headerElement);
                    if (!hasFooter) appElement.appendChild(footerElement);
                    headerAndFooterActive = true;
                } else if (hasHeader && hasFooter) {
                    headerAndFooterActive = true;
                }

                this.viewedLandingPage = true;

                const initPage = componentModule.default;
                if (typeof initPage === 'function') {
                    initPage();
                }

                if (headerWasActive) {
                    document.getElementById('header')?.setAttribute('active', 'true');
                }
                if (footerWasActive) {
                    document.getElementById('footer')?.setAttribute('active', 'true');
                }
                
            } else {
                // Handle content injection routes (reuse module loaded above)
                const contentGeneratorName = route.contentGenerator || 'generateContent';
                const contentGenerator = componentModule[contentGeneratorName] || componentModule.generateContent;
                
                if (!contentGenerator || typeof contentGenerator !== 'function') {
                    throw new Error(`No content generator function found for route ${path}`);
                }
                
                // Ensure persistent DOM structure exists
                this.ensurePersistentStructure();
                
                let appElement2 = document.getElementById('app');
                const hasHeader = !!document.getElementById('header');
                const hasFooter = !!document.getElementById('footer');
                if (headerAndFooterActive === false && (!hasHeader || !hasFooter)) {
                    const headerHtml = renderHeader();
                    const footerHtml = renderFooter();
                    const parser = new DOMParser();
                    const footerElement = parser.parseFromString(footerHtml, 'text/html').body.firstChild;
                    const headerElement = parser.parseFromString(headerHtml, 'text/html').body.firstChild;
                    if (!hasHeader) appElement2.appendChild(headerElement);
                    if (!hasFooter) appElement2.appendChild(footerElement);
                    headerAndFooterActive = true;
                } else if (hasHeader && hasFooter) {
                    headerAndFooterActive = true;
                }

                // Generate content HTML
                const contentHtml = contentGenerator();
                
                // Get or create main content container
                let mainContent = document.getElementById('mainContent');
                if (!mainContent) {
                    // Create main structure if it doesn't exist
                    const appElement = document.getElementById('app') || document.getElementById('root');
                    const main = document.createElement('main');
                    main.id = 'mainContent';
                    appElement.appendChild(main);
                    mainContent = main;
                }

                /* Capture before innerHTML: replacing mainContent removes any header/footer inside it,
                   so reading "active" after injection sees new nodes without the previous state. */
                const headerWasActiveInjected = document.getElementById('header')?.getAttribute('active') === 'true';
                const footerWasActiveInjected = document.getElementById('footer')?.getAttribute('active') === 'true';

                mainContent.innerHTML = contentHtml;

                const initPage = componentModule.default;
                if (typeof initPage === 'function') {
                    initPage();
                }

                if (headerWasActiveInjected) {
                    document.getElementById('header')?.setAttribute('active', 'true');
                }
                if (footerWasActiveInjected) {
                    document.getElementById('footer')?.setAttribute('active', 'true');
                }
            }

            // Apply active-section classes after the DOM update.
            this.activateDeactivate(path);

            this.scrollRouteContainersToTop();

            // Profile / edition / journal entry titles are set in init from content data
            const isEditionDetail =
                path.startsWith('/editions/') && path.slice('/editions/'.length).split('/').filter(Boolean)[0];
            const isProgramDetail =
                (path.startsWith('/program/') && path.slice('/program/'.length).split('/').filter(Boolean)[0]) ||
                (path.startsWith('/programs/') &&
                    path.slice('/programs/'.length).split('/').filter(Boolean)[0]);
            const isJournalEntryDetail =
                path.startsWith('/journal/entry/') &&
                path.slice('/journal/entry/'.length).split('/').filter(Boolean)[0];
            const isEventDetail =
                path.startsWith('/event/') && path.slice('/event/'.length).split('/').filter(Boolean)[0];
            if (
                !path.startsWith('/profile') &&
                !path.startsWith('/settings') &&
                !isProgramDetail &&
                !isEditionDetail &&
                !isJournalEntryDetail &&
                !isEventDetail
            ) {
                applyRouterSeo(path, route);
            }

            // Trigger route change event
            this.onRouteChange(path, route);

            this.syncHeaderLogosForPath(path);
            }
        } catch (error) {
            console.error('Error loading route:', error);
            this.applyThemeForPath('/404');
            // Load 404 page on error
            try {
                const notFoundModule = await this.routes['/404'].loader();
                const contentGenerator = notFoundModule.generateNotFoundContent || notFoundModule.generateContent;
                
                if (contentGenerator) {
                    this.ensurePersistentStructure();
                } else {
                    // Fallback to full page render
                    const html = notFoundModule.renderNotFound();
                    const appElement = document.getElementById('app') || document.getElementById('root');
                    if (appElement) {
                        appElement.innerHTML = html;
                    }
                }
                applyDocumentSeo({
                    title: this.routes['/404'].title,
                    description: this.routes['/404'].description || '',
                    path: window.location.pathname,
                    robots: 'noindex, nofollow',
                });
            } catch (err) {
                console.error('Error loading 404 page:', err);
            }
            this.syncHeaderLogosForPath('/404');
            this.scrollRouteContainersToTop();
        } finally {
            // Keep in sync with the address bar (initial load, navigate(), popstate, locale refresh).
            if (typeof window !== 'undefined') {
                this.currentRoute = window.location.pathname;
            }
            if (didCover && ptEl && typeof ptEl.reveal === 'function') {
                await ptEl.reveal();
            }
            this.applyProgramViewAutoEnterIfNeeded(path);
            this._hasHandledRouteOnce = true;
        }
    }

    /**
     * After navigation, clear scroll on the primary shells so the previous route’s position does not linger.
     * Home’s feed scrolls on `#homeMainContent` (see index.css); `#homeMain` is reset for consistency.
     */
    scrollRouteContainersToTop() {
        const mainContent = document.getElementById('mainContent');
        if (mainContent) mainContent.scrollTop = 0;
        const homeMain = document.getElementById('homeMain');
        if (homeMain) homeMain.scrollTop = 0;
        const homeMainContent = document.getElementById('homeMainContent');
        if (homeMainContent) homeMainContent.scrollTop = 0;
        const studioMain = document.getElementById('studioMainContent');
        if (studioMain) studioMain.scrollTop = 0;
    }

    ensurePersistentStructure() {
        const appElement = document.getElementById('app') || document.getElementById('root');
        const mainContent = appElement.querySelector('#mainContent');
        
        // Only create mainContent if it doesn't exist, without clearing existing content
        if (!mainContent) {
            const main = document.createElement('main');
            main.id = 'mainContent';
            appElement.appendChild(main);
        }
    }

    setupNavigation() {
        document.addEventListener('click', (e) => {
            const a = e.target?.closest?.('a[href^="/"]');
            if (!a) return;
            if (a.target === '_blank' || a.getAttribute('download') != null) return;
            if (e.defaultPrevented) return;
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const href = a.getAttribute('href');
            if (!href || href.startsWith('//')) return;
            e.preventDefault();
            this.navigate(href);
        });
    }

    /**
     * Client-side navigation: one history entry per transition. `handleRoute` never calls
     * pushState so back/forward (popstate) stays aligned with the rendered view.
     */
    navigate(path) {
        const nextPath = fusionNavPathnameOnly(path);
        const curPath = fusionNavPathnameOnly(window.location.pathname);
        if (nextPath !== curPath && isFusionProgramApplicationUnsaved()) {
            if (!window.confirm(FUSION_PROGRAM_APPLICATION_LEAVE_CONFIRM)) {
                return;
            }
        }
        window.history.pushState({}, '', path);
        // activateDeactivate runs inside handleRoute after DOM updates; don’t run it here
        // or we toggle classes on the wrong (previous) page’s nodes.
        this.handleRoute();
    }

    onRouteChange(path, route) {
        // Custom event for route changes
        const event = new CustomEvent('routeChange', {
            detail: { path, route }
        });
        window.dispatchEvent(event);
    }

    activateDeactivate(path) {
        if (DEV_MODE) console.log('Testing path switch:', path);

        const homeContent = document.getElementById('homeMainContent');
        const artistsContent = document.getElementById('artistsMainContent');
        const programsContent = document.getElementById('programsMainContent');
        const editionsContent = document.getElementById('editionsMainContent');
        const contextContent = document.getElementById('contextMainContent');
        // Full-page / injected feed roots that use `.active` for visibility (see index.css).
        const feedSections = [
            homeContent,
            artistsContent,
            programsContent,
            editionsContent,
            contextContent,
        ].filter(Boolean);

        const deactivateAllFeedSections = () => {
            for (const el of feedSections) {
                el.classList.remove('active');
            }
        };

        // The app uses a loadscreen "enter" click to activate content.
        // Before the user enters, keep all main sections hidden even if the route is loaded.
        const isHeaderActive =
            document.getElementById('header')?.getAttribute('active') === 'true';
        const isFooterActive =
            document.getElementById('footer')?.getAttribute('active') === 'true';
        const enteredApp = isHeaderActive || isFooterActive;

        if (!enteredApp) {
            deactivateAllFeedSections();
            return;
        }

        // Only one feed section should be `.active` at a time (e.g. home vs artists vs programs).
        deactivateAllFeedSections();

        switch (path) {
            case '/':
                homeContent?.classList.add('active');
                break;
            case '/artists':
                artistsContent?.classList.add('active');
                break;
            case '/programs':
                programsContent?.classList.add('active');
                break;
            case '/editions':
                editionsContent?.classList.add('active');
                break;
            case '/context':
                contextContent?.classList.add('active');
                break;
            default:
                break;
        }
    }
}

// Export router instance
export const router = new Router();

// Export navigation function
export const navigate = (path) => router.navigate(path);

export const activateDeactivate = (path) => router.activateDeactivate(path);