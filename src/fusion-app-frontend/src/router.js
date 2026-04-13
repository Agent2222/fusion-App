import { DEV_MODE } from './config.js';
import { getGateStateForPath, renderGatedHomeInnerHtml, renderGatedPageHtml } from './utils/pageGate.js';

import { renderHeader } from './components/shared/header.js';
import { renderFooter } from './components/shared/footer.js';

import LightLogo from './assets/Fusion-X-logo-03.png';
import DarkLogo from './assets/Fusion-X-logo-02.png';
import DarkSymbolLogo from './assets/Fusion-X-SymbolLogo.png';
import LightSymbolLogo from './assets/Fusion-X-SymbolLogo-2.png';

let headerAndFooterActive = false;

// Route configuration object
const routes = {
    '/': {
        loader: () => import('./components/home.js'),
        title: 'Home',
        description: 'Welcome to our app',
        contentGenerator: 'generateHomeContent',
        isFullPage: true // Home page renders full page structure
    },
    '/artists': {
        loader: () => import('./components/artists.js'),
        title: 'Artists',
        description: 'Artists',
        contentGenerator: 'generateArtistsContent',
        isFullPage: false // Artists page renders full page structure
    },
    '/programs': {
        loader: () => import('./components/programs.js'),
        title: 'Programs',
        description: 'Programs',
        contentGenerator: 'generateProgramsContent',
    },
    '/program-view': {
        loader: () => import('./components/programView.js'),
        title: 'Program',
        description: 'Program detail',
        contentGenerator: 'generateProgramViewContent',
        isFullPage: false,
    },
    '/gallery-access': {
        loader: () => import('./components/gallery-access.js'),
        title: 'Gallery Access',
        description: 'Gallery Access',
        contentGenerator: 'generateGalleryAccessContent'
    },
    '/editions': {
        loader: () => import('./components/editions.js'),
        title: 'Editions',
        description: 'Editions',
        contentGenerator: 'generateEditionsContent',
    },
    '/journal': {
        loader: () => import('./components/journal.js'),
        title: 'Journal',
        description: 'Journal',
        contentGenerator: 'generateJournalContent',
        isFullPage: false,
    },
    '/community': {
        loader: () => import('./components/navPages.js'),
        title: 'Community',
        description: 'Community',
        contentGenerator: 'generateCommunityContent'
    },
    '/context': {
        loader: () => import('./components/context.js'),
        title: 'Context',
        description: 'Fusion in context',
        contentGenerator: 'generateContextContent',
        isFullPage: false,
    },
    '/sign-in': {
        loader: () => import('./components/navPages.js'),
        title: 'Sign in',
        description: 'Sign in',
        contentGenerator: 'generateSignInContent'
    },
    '/register': {
        loader: () => import('./components/navPages.js'),
        title: 'Register',
        description: 'Register',
        contentGenerator: 'generateRegisterContent'
    },
    '/contact': {
        loader: () => import('./components/contact.js'),
        title: 'Contact',
        description: 'Get in touch with us',
        contentGenerator: 'generateContactContent',
    },
    '/profile': {
        loader: () => import('./components/profile.js'),
        title: 'Artist profile',
        description: 'Artist profile',
        contentGenerator: 'generateProfileContent',
    },
    '/edition-view': {
        loader: () => import('./components/editionView.js'),
        title: 'Edition',
        description: 'Edition detail',
        contentGenerator: 'generateEditionViewContent',
    },
    '/journal-entry-view': {
        loader: () => import('./components/journalEntry.js'),
        title: 'Journal',
        description: 'Journal entry',
        contentGenerator: 'generateJournalEntryContent',
    },
    '/event-view': {
        loader: () => import('./components/event.js'),
        title: 'Event',
        description: 'Event detail',
        contentGenerator: 'generateEventContent',
    },
    '/studio': {
        loader: () => import('./components/studio.js'),
        title: 'Fusion Studio',
        description: 'Admin dashboard',
        isFullPage: true,
        /** Skip auto-injected public header/footer — studio is a separate shell. */
        noChrome: true,
    },
    '/settings/profile': {
        loader: () => import('./components/settingsProfile.js'),
        title: 'Profile settings',
        description: 'Edit public profile copy',
        contentGenerator: 'generateSettingsProfileContent',
    },
    '/404': {
        loader: () => import('./components/notFound.js'),
        title: 'Page Not Found',
        description: 'The page you are looking for does not exist',
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
            return;
        }
        document.documentElement.removeAttribute('data-studio');
        document.documentElement.setAttribute(
            'data-theme',
            path === '/gallery-access' ? 'dark' : 'light'
        );
    }

    /**
     * `app-loadscreen` is `position:fixed; z-index:1000` and sits above `#app`. Opening `/studio`
     * (e.g. debug “Open Studio”) before “click to enter” would leave the loadscreen covering the
     * dashboard — hide it for this route only (do not re-show when navigating away).
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
        const path = window.location.pathname;
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
                    // Keep section titles for gated routes (same as normal routes).
                    document.title = route.title;
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
                document.title = route.title;
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
                document.title = this.routes['/404'].title;
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