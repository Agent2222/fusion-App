import { shouldLogFusionIcAuthErrors } from '../../config.js';
import { navigate, activateDeactivate } from '../../router.js';
// Header Custom Element Component
import gsap from 'gsap';
import SymbolLogo from '../../assets/Fusion-X-SymbolLogo.png';
import HeaderWideLogo from '../../assets/Fusion-X-logo-02.png';
import { withSeoImageAlt } from '../../utils/mediaAltSeo.js';
import {
    getAdminPerspective,
    getPerspectiveButtonShortLabel,
    getPerspectiveAriaLabel,
    cycleAdminPerspective,
    buildEffectiveAccountForPerspective,
} from '../../utils/adminPerspective.js';
import {
    ensureSoundEnvironmentPositionListeners,
    syncSoundEnvironmentPosition,
} from '../../utils/soundEnvironmentMount.js';
import './newsletterSubscribe.js';

const MENU_IDLE_MS = 2000;
const SCROLL_DELTA_PX = 4;
/** Match `footer.js` bottom threshold — hide floating logo when footer zone is active. */
const BOTTOM_ZONE_PX = 0;
const LOCALE_STORAGE_KEY = 'fusion-locale';
/** Drawer + bar layout; below loadscreen (~1000) and above page chrome. */
const MOBILE_NAV_MAX_PX = 1024;

class HeaderComponent extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        this._headerEl = null;
        /** @type {HTMLElement | null} */
        this._logoHeaderEl = null;
        this._scrollHidden = false;
        this._lastScrollTopById = {};
        this._idleTimer = null;
        this._onScrollBound = null;
        this._onRouteChangeBound = null;
        /** @type {(() => void) | null} */
        this._onRouteChangeForNavBound = null;
        /** @type {HTMLElement[]} */
        this._scrollTargetsAttached = [];
        this._hoverOverMenu = false;
        this._onPointerEnterBound = null;
        this._onPointerLeaveBound = null;
        /** Latest scrollTop from the scroll container that fired (see `_handleScrollEvent`). */
        this.scrollPositionTracker = 0;
        this._mobileMenuOpen = false;
        /** @type {HTMLElement | null} */
        this._menuToggle = null;
        /** @type {HTMLElement | null} */
        this._navCluster = null;
        /** @type {HTMLElement | null} */
        this._drawerBackdrop = null;
        /** @type {(() => void) | null} */
        this._onEscapeBound = null;
        /** @type {(() => void) | null} */
        this._onResizeMqBound = null;
        /** @type {MediaQueryList | null} */
        this._mobileNavMql = null;
        /**
         * @type {{ kind: 'guest' } | { kind: 'admin' } | { kind: 'staff' } | { kind: 'needsRegistration' } | { kind: 'member', profileHref: string, pending: boolean, needsProfileCompletion?: boolean }}
         */
        this._authUi = { kind: 'guest' };
        /** True when the canister reports `isCallerAdmin` (used to show perspective toggle). */
        this._realIsAdmin = false;
        /** @type {(() => void) | null} */
        this._onFusionAuthBound = null;
        /** @type {(() => void) | null} */
        this._onFusionPerspectiveBound = null;
        /** @type {((e: Event) => void) | null} */
        this._onProfileSetupPromptBound = null;
        /** @type {(() => void) | null} */
        this._onRosterVisBound = null;
        /** @type {(() => void) | null} */
        this._onPlatformUpdateBannerBound = null;
        /** @type {(() => void) | null} */
        this._onLocaleChangeForBannerBound = null;
        /** @type {(() => void) | null} */
        this._unsubDataSource = null;
        this._profileSetupPrompt = {
            open: false,
            mode: 'setup',
            fullName: '',
            email: '',
        };
    }

    /**
     * True when `el` is within BOTTOM_ZONE_PX of its scroll bottom (same idea as footer reveal).
     * @param {HTMLElement} el
     */
    _isNearBottom(el) {
        const { scrollTop, scrollHeight, clientHeight } = el;
        const maxScrollTop = scrollHeight - clientHeight;
        if (maxScrollTop <= 0 || scrollTop <= 0) return false;
        const remaining = scrollHeight - scrollTop - clientHeight;
        return remaining <= BOTTOM_ZONE_PX;
    }

    /** If any bound main scroll area is in the bottom zone, floating logo should stay hidden. */
    _anyScrollTargetNearBottom() {
        for (const el of this._scrollTargetsAttached) {
            if (el && this._isNearBottom(el)) return true;
        }
        return false;
    }

    /** Keep `#logoHeader` off when the footer zone is active so they never overlap. */
    _syncLogoHeaderIfBottomZone() {
        if (!this._logoHeaderEl || this.getAttribute('active') !== 'true') return;
        if (this._anyScrollTargetNearBottom()) {
            gsap.to(this._logoHeaderEl, {
                opacity: 0,
                pointerEvents: 'none',
                duration: 0.2,
                ease: 'power2.out',
                overwrite: 'auto',
            });
        }
    }

    /**
     * Hint which bar asset is LCP: wordmark (desktop) vs symbol (≤1024px). Deprioritize the hidden
     * bar image and the scroll-reveal float mark.
     */
    _applyPrimaryLogoFetchPriority() {
        const root = this.shadow;
        if (!root) return;
        const wide = root.querySelector('#headerLogo');
        const barSymbol = root.querySelector('#headerLogoSymbol');
        const floatSymbol = root.querySelector('#headerSymbolLogo');
        const desktop = window.matchMedia(`(min-width: ${MOBILE_NAV_MAX_PX + 1}px)`).matches;
        if (desktop) {
            wide?.setAttribute('fetchpriority', 'high');
            barSymbol?.setAttribute('fetchpriority', 'low');
        } else {
            barSymbol?.setAttribute('fetchpriority', 'high');
            wide?.setAttribute('fetchpriority', 'low');
        }
        floatSymbol?.setAttribute('fetchpriority', 'low');
    }

    get active() {
        return this.getAttribute('active') || false;
    }

    set active(val) {
        this.setAttribute('active', val);
    }

    static get observedAttributes() {
        return ['active'];
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if (prop === 'active') {
            if (newVal === 'true') {
                this.showHeader();
                this._scrollHidden = false;
                this._lastScrollTopById = {};
                this.attachScrollHideBehavior();
                this.resetIdleHideTimer();
            } else {
                this.detachScrollHideBehavior();
                this.clearIdleHideTimer();
                this.hideHeader();
            }
        }
    }

    showHeader() {
        const el = this._headerEl || this.shadow.querySelector('.header-surface');
        gsap.to(el, {
            opacity: 1,
            duration: 0.5,
            y: 0,
            ease: 'power2.inOut',
            overwrite: 'auto',
        });
        if (this._logoHeaderEl) {
            gsap.set(this._logoHeaderEl, { opacity: 0, pointerEvents: 'none' });
        }
    }

    hideHeader() {
        const el = this._headerEl || this.shadow.querySelector('.header-surface');
        gsap.to(el, {
            opacity: 0,
            duration: 0.5,
            y: '100%',
            ease: 'power2.inOut',
            overwrite: 'auto',
        });
        if (this._logoHeaderEl) {
            gsap.set(this._logoHeaderEl, { opacity: 0, pointerEvents: 'none' });
        }
    }

    /** Hide menu bar (scroll up or idle); slides up. */
    hideMenuBarScroll() {
        if (this._mobileMenuOpen) return;
        if (!this._headerEl || this._scrollHidden) return;
        if (this._allScrollTargetsAtTop()) return;
        this._scrollHidden = true;
        this._hoverOverMenu = false;
        gsap.to(this._headerEl, {
            y: '-100%',
            opacity: 0,
            duration: 0.35,
            ease: 'power2.inOut',
            pointerEvents: 'none',
            overwrite: 'auto',
        });
        if (this._logoHeaderEl && !this._anyScrollTargetNearBottom()) {
            gsap.to(this._logoHeaderEl, {
                delay: 0.35,
                opacity: 1,
                pointerEvents: 'auto',
                duration: 0.35,
                ease: 'power2.inOut',
                overwrite: 'auto',
            });
        } else if (this._logoHeaderEl) {
            gsap.set(this._logoHeaderEl, { opacity: 0, pointerEvents: 'none' });
        }
        this._syncHeaderScrollDataset();
    }

    /** Show menu bar (scroll down); only used when header is active. */
    showMenuBarScroll() {
        if (!this._headerEl || !this._scrollHidden) return;
        if (this.getAttribute('active') !== 'true') return;
        this._scrollHidden = false;
        gsap.to(this._headerEl, {
            y: 0,
            opacity: 1,
            duration: 0.35,
            ease: 'power2.inOut',
            pointerEvents: 'auto',
            overwrite: 'auto',
        });
        if (this._logoHeaderEl) {
            gsap.to(this._logoHeaderEl, {
                delay: 0.15,
                opacity: 0,
                pointerEvents: 'none',
                duration: 0.35,
                ease: 'power2.inOut',
                overwrite: 'auto',
            });
        }
        this._syncHeaderScrollDataset();
    }

    /** Sticky feed-filter `top` + stacking follow header hide/show (see index.css). */
    _syncHeaderScrollDataset() {
        const root = document.documentElement;
        if (this.getAttribute('active') !== 'true') {
            delete root.dataset.fusionHeaderScroll;
            syncSoundEnvironmentPosition();
            return;
        }
        if (this._allScrollTargetsAtTop()) {
            root.dataset.fusionHeaderScroll = 'top';
            syncSoundEnvironmentPosition();
            return;
        }
        root.dataset.fusionHeaderScroll = this._scrollHidden ? 'hidden' : 'visible';
        syncSoundEnvironmentPosition();
    }

    clearIdleHideTimer() {
        if (this._idleTimer) {
            clearTimeout(this._idleTimer);
            this._idleTimer = null;
        }
    }

    /** True when every bound scroll container is at its top (scrollTop ≤ 0). */
    _allScrollTargetsAtTop() {
        if (!this._scrollTargetsAttached || this._scrollTargetsAttached.length === 0) {
            return false;
        }
        for (const el of this._scrollTargetsAttached) {
            if (el.scrollTop > 0) return false;
        }
        return true;
    }

    resetIdleHideTimer() {
        this.clearIdleHideTimer();
        if (this.getAttribute('active') !== 'true') return;
        if (this._mobileMenuOpen) return;
        if (this._hoverOverMenu) return;
        if (this._allScrollTargetsAtTop()) return;
        this._idleTimer = setTimeout(() => {
            if (this._allScrollTargetsAtTop()) return;
            this.hideMenuBarScroll();
        }, MENU_IDLE_MS);
    }

    _handleScrollEvent(el) {
        if (this.getAttribute('active') !== 'true') return;
        if (this._mobileMenuOpen) return;
        const id = el.id;
        const st = el.scrollTop;
        this.scrollPositionTracker = st;

        try {
            /* At top of scroll: keep menu visible; no hide/show or idle countdown */
            if (st <= 0) {
                this._lastScrollTopById[id] = 0;
                this.showMenuBarScroll();
                this.clearIdleHideTimer();
                this._syncHeaderScrollDataset();
                return;
            }
            const prev = this._lastScrollTopById[id];
            if (prev === undefined) {
                this._lastScrollTopById[id] = st;
                this.resetIdleHideTimer();
                return;
            }
            const delta = st - prev;
            this._lastScrollTopById[id] = st;
            if (Math.abs(delta) < SCROLL_DELTA_PX) {
                this.resetIdleHideTimer();
                return;
            }
            /* Scroll down → hide bar; scroll up → show bar */
            if (delta > 0) {
                this.hideMenuBarScroll();
            } else {
                this.showMenuBarScroll();
            }
            this.resetIdleHideTimer();
        } finally {
            this._syncLogoHeaderIfBottomZone();
        }
    }

    /**
     * After SPA navigation, scroll-hide may have left the bar with GSAP `pointer-events: none`.
     * New DOM does not emit a scroll event at scrollTop 0, so restore the interactive menu bar when the header is active.
     */
    _resetMenuBarAfterRouteChange() {
        if (this.getAttribute('active') !== 'true') return;
        this._scrollHidden = false;
        this.clearIdleHideTimer();
        if (this._headerEl) {
            gsap.set(this._headerEl, { y: 0, opacity: 1, pointerEvents: 'auto' });
        }
        if (this._logoHeaderEl) {
            gsap.set(this._logoHeaderEl, { opacity: 0, pointerEvents: 'none' });
        }
        requestAnimationFrame(() => {
            this._syncLogoHeaderIfBottomZone();
            this.resetIdleHideTimer();
            this._syncHeaderScrollDataset();
        });
    }

    attachScrollHideBehavior() {
        this.detachScrollHideBehavior();
        this._onScrollBound = (e) => this._handleScrollEvent(e.currentTarget);
        this._onRouteChangeBound = () => {
            this._lastScrollTopById = {};
            this.scrollPositionTracker = 0;
            this.bindScrollTargets();
            this._resetMenuBarAfterRouteChange();
        };
        window.addEventListener('routeChange', this._onRouteChangeBound);
        this.bindScrollTargets();
        this._syncHeaderScrollDataset();
    }

    bindScrollTargets() {
        if (this._onScrollBound) {
            for (const el of this._scrollTargetsAttached) {
                el.removeEventListener('scroll', this._onScrollBound);
            }
        }
        this._scrollTargetsAttached = [];
        const targets = [
            document.getElementById('homeMainContent'),
            document.getElementById('mainContent'),
            document.getElementById('artistsMainContent'),
            document.getElementById('programsMainContent'),
            document.getElementById('editionsMainContent'),
            document.getElementById('galleryAccessMainContent'),
            document.getElementById('journalMainContent'),
            document.getElementById('videosMainContent'),
            document.getElementById('programViewMainContent'),
            document.getElementById('profileMainContent'),
            document.getElementById('settingsMainContent'),
            document.getElementById('contextMainContent'),
            document.getElementById('eventMainContent'),
            document.getElementById('journalEntryMainContent'),
            document.getElementById('editionViewMainContent'),
        ].filter(Boolean);
        for (const el of targets) {
            el.addEventListener('scroll', this._onScrollBound, { passive: true });
            this._scrollTargetsAttached.push(el);
        }
    }

    detachScrollHideBehavior() {
        if (this._onRouteChangeBound) {
            window.removeEventListener('routeChange', this._onRouteChangeBound);
            this._onRouteChangeBound = null;
        }
        if (this._onScrollBound) {
            for (const el of this._scrollTargetsAttached) {
                el.removeEventListener('scroll', this._onScrollBound);
            }
        }
        this._scrollTargetsAttached = [];
        this._onScrollBound = null;
        this.clearIdleHideTimer();
    }

    attachIdleHoverGuards() {
        this.detachIdleHoverGuards();
        this._onPointerEnterBound = () => {
            if (this.getAttribute('active') !== 'true') return;
            this._hoverOverMenu = true;
            this.clearIdleHideTimer();
        };
        this._onPointerLeaveBound = () => {
            this._hoverOverMenu = false;
            if (this.getAttribute('active') !== 'true') return;
            this.resetIdleHideTimer();
        };
        if (this._headerEl) {
            this._headerEl.addEventListener('pointerenter', this._onPointerEnterBound);
            this._headerEl.addEventListener('pointerleave', this._onPointerLeaveBound);
        }
    }

    detachIdleHoverGuards() {
        if (this._headerEl && this._onPointerEnterBound) {
            this._headerEl.removeEventListener('pointerenter', this._onPointerEnterBound);
            this._headerEl.removeEventListener('pointerleave', this._onPointerLeaveBound);
        }
        this._onPointerEnterBound = null;
        this._onPointerLeaveBound = null;
        this._hoverOverMenu = false;
    }

    connectedCallback() {
        this.render();
        this._headerEl = this.shadow.querySelector('.header-surface');
        this._logoHeaderEl = this.shadow.querySelector('#logoHeader');
        this._menuToggle = this.shadow.querySelector('#headerMenuToggle');
        this._navCluster = this.shadow.querySelector('#headerNavCluster');
        this._drawerBackdrop = this.shadow.querySelector('#headerDrawerBackdrop');
        /* Do not snapshot --bg onto the host: inline --bg would override html[data-theme]
        updates on client navigation. Shadow content uses inherited --bg from the document. */
        this._applyPrimaryLogoFetchPriority();
        this.attachEventListeners();
        this.attachMobileNavListeners();
        this.attachIdleHoverGuards();
        this.setLocale(this.getLocale(), { silent: true });
        this._onFusionAuthBound = () => {
            void this._refreshHeaderAuthState();
        };
        window.addEventListener('fusion-auth-change', this._onFusionAuthBound);
        this._onFusionPerspectiveBound = () => {
            void this._refreshHeaderAuthState();
        };
        window.addEventListener('fusion-admin-perspective-change', this._onFusionPerspectiveBound);
        this._onProfileSetupPromptBound = (ev) => {
            const detail =
                ev && typeof ev === 'object' && 'detail' in ev
                    ? /** @type {CustomEvent<{ fullName?: string, email?: string }>} */ (ev).detail
                    : null;
            this._openProfileSetupPrompt(detail);
        };
        window.addEventListener('fusion-open-profile-setup', this._onProfileSetupPromptBound);
        this._onRosterVisBound = () => {
            void this._syncRosterVisibilityBanner();
        };
        window.addEventListener('fusion-roster-visibility-updated', this._onRosterVisBound);
        this._onPlatformUpdateBannerBound = () => {
            void this._syncPlatformUpdateBanner();
        };
        window.addEventListener('fusion-platform-update-banner-change', this._onPlatformUpdateBannerBound);
        this._onLocaleChangeForBannerBound = () => {
            void this._syncPlatformUpdateBanner();
        };
        window.addEventListener('fusion-localechange', this._onLocaleChangeForBannerBound);
        import('../../utils/database.js').then(({ subscribeDataSource }) => {
            if (this._unsubDataSource) this._unsubDataSource();
            this._unsubDataSource = subscribeDataSource(() => {
                void this._syncPlatformUpdateBanner();
            });
        });
        void this._syncPlatformUpdateBanner();
        void this._refreshHeaderAuthState();
        this._onRouteChangeForNavBound = () => {
            this._syncActiveNavLink();
            this._syncSoundEnvironmentPosition();
            void this._syncPlatformUpdateBanner();
            this.closeMobileMenu();
        };
        window.addEventListener('routeChange', this._onRouteChangeForNavBound);
        ensureSoundEnvironmentPositionListeners();
        this._syncActiveNavLink();
        this._syncSoundEnvironmentPosition();
        if (this.getAttribute('active') === 'true') {
            this.attachScrollHideBehavior();
            this.resetIdleHideTimer();
        }
    }

    disconnectedCallback() {
        this.detachMobileNavListeners();
        this.detachIdleHoverGuards();
        this.detachScrollHideBehavior();
        if (this._onRouteChangeForNavBound) {
            window.removeEventListener('routeChange', this._onRouteChangeForNavBound);
            this._onRouteChangeForNavBound = null;
        }
        if (this._onFusionAuthBound) {
            window.removeEventListener('fusion-auth-change', this._onFusionAuthBound);
            this._onFusionAuthBound = null;
        }
        if (this._onFusionPerspectiveBound) {
            window.removeEventListener('fusion-admin-perspective-change', this._onFusionPerspectiveBound);
            this._onFusionPerspectiveBound = null;
        }
        if (this._onProfileSetupPromptBound) {
            window.removeEventListener('fusion-open-profile-setup', this._onProfileSetupPromptBound);
            this._onProfileSetupPromptBound = null;
        }
        if (this._onRosterVisBound) {
            window.removeEventListener('fusion-roster-visibility-updated', this._onRosterVisBound);
            this._onRosterVisBound = null;
        }
        if (this._onPlatformUpdateBannerBound) {
            window.removeEventListener('fusion-platform-update-banner-change', this._onPlatformUpdateBannerBound);
            this._onPlatformUpdateBannerBound = null;
        }
        if (this._onLocaleChangeForBannerBound) {
            window.removeEventListener('fusion-localechange', this._onLocaleChangeForBannerBound);
            this._onLocaleChangeForBannerBound = null;
        }
        if (this._unsubDataSource) {
            this._unsubDataSource();
            this._unsubDataSource = null;
        }
    }

    /**
     * @param {string} pathname
     * @param {string} href
     */
    _isNavHrefActive(pathname, href) {
        if (!href) return false;
        if (pathname === href) return true;
        if (href !== '/' && pathname.startsWith(`${href}/`)) return true;
        if (href === '/artists' && pathname.startsWith('/profile')) return true;
        return false;
    }

    _syncActiveNavLink() {
        const root = this.shadowRoot;
        if (!root) return;
        const pathname = window.location.pathname || '/';
        root.querySelectorAll('a.headerNavLink').forEach((a) => {
            const href = a.getAttribute('href') || '';
            const active = this._isNavHrefActive(pathname, href);
            a.classList.toggle('headerNavLink--active', active);
            if (active) a.setAttribute('aria-current', 'page');
            else a.removeAttribute('aria-current');
        });
    }

    _syncSoundEnvironmentPosition() {
        syncSoundEnvironmentPosition(window.location.pathname || '/');
    }

    _fillAuthPair() {
        const root = this.shadowRoot;
        const slot = root?.querySelector('#headerAuthPair');
        if (!slot) return;
        const en = this.getLocale() === 'en';
        const ui = this._authUi && typeof this._authUi === 'object' ? this._authUi : { kind: 'guest' };
        const esc = (s) =>
            String(s)
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/</g, '&lt;');

        const perspectiveHtml = this._realIsAdmin
            ? `<button type="button" class="headerRectBtn headerRectBtn--perspective" data-action="cycle-perspective" aria-label="${esc(
                  getPerspectiveAriaLabel(getAdminPerspective(), en)
              )}">${esc(getPerspectiveButtonShortLabel(getAdminPerspective(), en))}</button>`
            : '';

        if (ui.kind === 'guest') {
            slot.innerHTML = `
                        <button type="button" class="headerRectBtn" data-action="sign-in">${en ? 'SIGN-IN' : 'サインイン'}</button>
                        <button type="button" class="headerRectBtn headerRectBtn--register" data-action="register">${en ? 'JOIN' : '参加'}</button>`;
            return;
        }
        if (ui.kind === 'admin' || ui.kind === 'staff') {
            slot.innerHTML = `
                        <button type="button" class="headerRectBtn" data-action="sign-out">${en ? 'SIGN OUT' : 'サインアウト'}</button>
                        ${perspectiveHtml}
                        <button type="button" class="headerRectBtn headerRectBtn--register" data-href="/studio">${en ? 'STUDIO' : 'スタジオ'}</button>`;
            return;
        }
        if (ui.kind === 'needsRegistration') {
            slot.innerHTML = `
                        <button type="button" class="headerRectBtn" data-action="sign-out">${en ? 'SIGN OUT' : 'サインアウト'}</button>
                        <button type="button" class="headerRectBtn headerRectBtn--register" data-action="register">${en ? 'JOIN' : '参加'}</button>`;
            return;
        }
        if (ui.kind === 'member') {
            const profLabel = ui.pending
                ? en
                    ? 'STUDIO (PENDING)'
                    : 'スタジオ（審査中）'
                : en
                  ? 'STUDIO'
                  : 'スタジオ';
            const href = esc(ui.profileHref || '/register');
            const completeProfileLabel = en ? 'FUSION STUDIO' : 'FUSION スタジオ';
            slot.innerHTML = `
                        <button type="button" class="headerRectBtn" data-action="sign-out">${en ? 'SIGN OUT' : 'サインアウト'}</button>
                        ${perspectiveHtml}
                        <button type="button" class="headerRectBtn headerRectBtn--register" data-href="${href}">${profLabel}</button>
                        ${
                            ui.needsProfileCompletion
                                ? `<button type="button" class="headerRectBtn headerRectBtn--complete-profile" data-action="complete-profile">${completeProfileLabel}</button>`
                                : ''
                        }`;
        }
        this._renderProfileSetupPrompt();
    }

    _openProfileSetupPrompt(detail = null) {
        const d = detail && typeof detail === 'object' ? detail : {};
        const fullName = String(d.fullName ?? '').trim();
        const email = String(d.email ?? '').trim();
        this._profileSetupPrompt = { open: true, mode: 'setup', fullName, email };
        this._renderProfileSetupPrompt();
    }

    _openCompleteProfileInfoPrompt() {
        this._profileSetupPrompt = {
            open: true,
            mode: 'completeProfileInfo',
            fullName: '',
            email: '',
        };
        this._renderProfileSetupPrompt();
    }

    _closeProfileSetupPrompt() {
        this._profileSetupPrompt.open = false;
        this._renderProfileSetupPrompt();
    }

    async _handleCompleteProfileCta() {
        this._closeProfileSetupPrompt();
        try {
            const db = await import('../../utils/database.js');
            const gate = await db.getMembershipAccessForCaller();
            if (gate === 'noAccount' || gate === 'needsSubscription') {
                window.dispatchEvent(
                    new CustomEvent('fusion-open-join-network', {
                        detail: { mode: 'resubscribe' },
                    })
                );
                return;
            }
            await db.ensureMyLinkedArtistProfile();
            const { maybeSeedLocalesFromProfileSetupDraftIfEmpty } = await import(
                '../../utils/profileSetupSeedLocales.js'
            );
            await maybeSeedLocalesFromProfileSetupDraftIfEmpty();
        } catch {
            /* ignore and continue to settings */
        }
        activateDeactivate('/settings/profile');
        navigate('/settings/profile');
    }

    _renderProfileSetupPrompt() {
        const root = this.shadowRoot;
        const host = root?.querySelector('#headerProfileSetupPrompt');
        if (!host) return;
        if (!this._profileSetupPrompt.open) {
            host.hidden = true;
            host.innerHTML = '';
            return;
        }
        const en = this.getLocale() === 'en';
        const name = this._profileSetupPrompt.fullName || (en ? 'this account' : 'このアカウント');
        const email = this._profileSetupPrompt.email;
        const detail = email ? `${name} (${email})` : name;
        host.hidden = false;
        if (this._profileSetupPrompt.mode === 'completeProfileInfo') {
            host.innerHTML = `
                <div class="header-profile-setup-modal header-profile-setup-modal--top-right" role="dialog" aria-modal="true" aria-label="${
                    en ? 'Complete profile' : 'プロフィールを完成'
                }">
                    <p class="header-profile-setup-title">${en ? 'Complete your profile' : 'プロフィールを完成'}</p>
                    <p class="header-profile-setup-copy">${
                        en
                            ? 'Your account needs to be linked to a member profile before you can edit Settings.'
                            : '設定を編集するには、アカウントをメンバープロフィールに紐づける必要があります。'
                    }</p>
                    <div class="header-profile-setup-actions">
                        <button type="button" class="headerRectBtn" data-action="close-profile-setup">${
                            en ? 'Close' : '閉じる'
                        }</button>
                        <button type="button" class="headerRectBtn headerRectBtn--register" data-action="confirm-complete-profile">${
                            en ? 'Continue' : '続ける'
                        }</button>
                    </div>
                </div>
            `;
            return;
        }
        host.innerHTML = `
            <div class="header-profile-setup-overlay" data-action="close-profile-setup"></div>
            <div class="header-profile-setup-modal" role="dialog" aria-modal="true" aria-label="${
                en ? 'Profile setup' : 'プロフィール設定'
            }">
                <p class="header-profile-setup-title">${en ? 'Set up your profile' : 'プロフィールを設定'}</p>
                <p class="header-profile-setup-copy">${
                    en
                        ? `Do you want to setup your profile with ${detail}?`
                        : `${detail} でプロフィールを設定しますか？`
                }</p>
                <div class="header-profile-setup-actions">
                    <button type="button" class="headerRectBtn" data-action="close-profile-setup">${
                        en ? 'Not now' : 'あとで'
                    }</button>
                    <button type="button" class="headerRectBtn headerRectBtn--register" data-action="confirm-profile-setup">${
                        en ? 'Set up profile' : 'プロフィール設定'
                    }</button>
                </div>
            </div>
        `;
    }

    async _refreshHeaderAuthState() {
        try {
            this._realIsAdmin = false;
            const { getAuthSnapshot } = await import('../../utils/icAuth.js');
            const snap = await getAuthSnapshot();
            if (!snap.authenticated) {
                this._authUi = { kind: 'guest' };
                this._fillAuthPair();
                return;
            }
            const { getAuthenticatedFusionBackendActor } = await import('../../utils/earlyAccessSubscribe.js');
            const actor = await getAuthenticatedFusionBackendActor();
            if (!actor) {
                this._authUi = { kind: 'guest' };
                this._fillAuthPair();
                return;
            }
            let isAdmin = false;
            try {
                if (typeof actor.isCallerAdmin === 'function') {
                    isAdmin = await actor.isCallerAdmin();
                }
            } catch (e) {
                if (shouldLogFusionIcAuthErrors()) {
                    console.warn('[Fusion] isCallerAdmin failed (header)', e);
                }
            }
            if (isAdmin) {
                this._realIsAdmin = true;
                let acc = null;
                try {
                    if (typeof actor.getAccountForCaller === 'function') {
                        const raw = await actor.getAccountForCaller();
                        acc = Array.isArray(raw) ? (raw.length ? raw[0] : null) : raw;
                    }
                } catch (e) {
                    if (shouldLogFusionIcAuthErrors()) {
                        console.warn('[Fusion] getAccountForCaller failed (header, admin path)', e);
                    }
                }
                const perspective = getAdminPerspective();
                const effectiveAcc = buildEffectiveAccountForPerspective(
                    acc && typeof acc === 'object' ? acc : null,
                    perspective
                );
                if (perspective === 'admin' || perspective === 'staff') {
                    this._authUi = { kind: perspective === 'staff' ? 'staff' : 'admin' };
                } else {
                    const { resolveProfilePathForAccount } = await import('../../utils/authHeader.js');
                    const profileHref = await resolveProfilePathForAccount(effectiveAcc);
                    const st = acc && typeof acc === 'object' ? acc.status : null;
                    const pending = Boolean(st && typeof st === 'object' && 'pending' in st);
                    const linkedRaw = acc && typeof acc === 'object' ? acc.linkedArtistId ?? acc.linked_artist_id : undefined;
                    const linkedId = Array.isArray(linkedRaw)
                        ? linkedRaw.length
                            ? String(linkedRaw[0] ?? '').trim()
                            : ''
                        : linkedRaw != null
                          ? String(linkedRaw).trim()
                          : '';
                    this._authUi = {
                        kind: 'member',
                        profileHref,
                        pending,
                        needsProfileCompletion: !linkedId,
                    };
                }
                this._fillAuthPair();
                return;
            }
            let acc = null;
            try {
                if (typeof actor.getAccountForCaller === 'function') {
                    const raw = await actor.getAccountForCaller();
                    acc = Array.isArray(raw) ? (raw.length ? raw[0] : null) : raw;
                }
            } catch (e) {
                if (shouldLogFusionIcAuthErrors()) {
                    console.warn('[Fusion] getAccountForCaller failed (header)', e);
                }
            }
            if (acc == null) {
                this._authUi = { kind: 'needsRegistration' };
                this._fillAuthPair();
                return;
            }
            const role = acc.role;
            if (role && typeof role === 'object') {
                if ('admin' in role) {
                    this._authUi = { kind: 'admin' };
                    this._fillAuthPair();
                    return;
                }
                if ('staff' in role) {
                    this._authUi = { kind: 'staff' };
                    this._fillAuthPair();
                    return;
                }
                if ('collaborator' in role) {
                    this._authUi = { kind: 'staff' };
                    this._fillAuthPair();
                    return;
                }
            }
            const st = acc.status;
            const pending = Boolean(st && typeof st === 'object' && 'pending' in st);
            const linkedRaw = acc.linkedArtistId ?? acc.linked_artist_id;
            const linkedId = Array.isArray(linkedRaw)
                ? linkedRaw.length
                    ? String(linkedRaw[0] ?? '').trim()
                    : ''
                : linkedRaw != null
                  ? String(linkedRaw).trim()
                  : '';
            const { resolveProfilePathForAccount } = await import('../../utils/authHeader.js');
            const profileHref = await resolveProfilePathForAccount(acc);
            this._authUi = { kind: 'member', profileHref, pending, needsProfileCompletion: !linkedId };
            this._fillAuthPair();
        } catch (e) {
            if (shouldLogFusionIcAuthErrors()) {
                console.warn('[Fusion] _refreshHeaderAuthState failed', e);
            }
            this._authUi = { kind: 'guest' };
            this._fillAuthPair();
        } finally {
            void this._syncRosterVisibilityBanner();
        }
    }

    /**
     * Slim banner: linked artist visibility is not public (member accounts).
     * Inactive is only alarming when membership is lost (`needsSubscription`). Entitled members
     * (`ok` / `exempt`) often still have draft `inactive` skeletons or cancel-forced inactive —
     * do not show the red inactive banner for them.
     */
    async _syncRosterVisibilityBanner() {
        const host = this.shadowRoot && this.shadowRoot.querySelector('#headerRosterVisBanner');
        if (!(host instanceof HTMLElement)) {
            return;
        }
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/settings')) {
            host.hidden = true;
            host.innerHTML = '';
            return;
        }
        const ui = this._authUi;
        if (!ui || ui.kind !== 'member' || ui.needsProfileCompletion) {
            host.hidden = true;
            host.innerHTML = '';
            return;
        }
        try {
            const {
                getMyArtistRecord,
                getMembershipAccessForCaller,
                normalizeArtistRosterVisibility,
            } = await import('../../utils/database.js');
            const [rec, membershipGate] = await Promise.all([
                getMyArtistRecord(),
                getMembershipAccessForCaller(),
            ]);
            const p = rec && rec.profile;
            if (!p || typeof p !== 'object') {
                host.hidden = true;
                host.innerHTML = '';
                return;
            }
            const vis = normalizeArtistRosterVisibility(/** @type {Record<string, unknown>} */(p).visibility);
            if (vis === 'public') {
                host.hidden = true;
                host.innerHTML = '';
                return;
            }
            const entitled = membershipGate === 'ok' || membershipGate === 'exempt';
            if (vis === 'inactive' && entitled) {
                host.hidden = true;
                host.innerHTML = '';
                return;
            }
            const en = this.getLocale() === 'en';
            if (vis === 'inactive') {
                host.innerHTML = `<div class="header-roster-vis-inner" role="status">
                    <span class="header-roster-vis-text">${en ? 'Your profile is currently inactive.' : 'プロファイルは非アクティブです。'}</span>
                    <button type="button" class="header-roster-vis-cta" data-action="roster-publish">${en ? 'Publish profile' : 'プロファイルを公開'}</button>
                </div>`;
            } else if (vis === 'pending') {
                host.innerHTML = `<div class="header-roster-vis-inner" role="status">
                    <span class="header-roster-vis-text">${en ? 'Your profile is under review.' : 'プロファイルは審査中です。'}</span>
                </div>`;
            } else {
                host.innerHTML = `<div class="header-roster-vis-inner" role="status">
                    <span class="header-roster-vis-text">${en ? 'Your profile is private.' : 'プロファイルは非公開です。'}</span>
                    <button type="button" class="header-roster-vis-cta" data-action="roster-public">${en ? 'Make public' : '公開にする'}</button>
                </div>`;
            }
            host.hidden = false;
        } catch {
            host.hidden = true;
            host.innerHTML = '';
        }
    }

    /**
     * Site-wide platform update notice (admin site setting). Hidden on /studio routes.
     */
    async _syncPlatformUpdateBanner() {
        const host = this.shadowRoot && this.shadowRoot.querySelector('#headerPlatformUpdateBanner');
        if (!(host instanceof HTMLElement)) {
            return;
        }
        const path = typeof window !== 'undefined' ? window.location.pathname || '' : '';
        if (path.startsWith('/studio')) {
            host.hidden = true;
            host.innerHTML = '';
            return;
        }
        try {
            const { getPlatformUpdateBanner } = await import('../../utils/database.js');
            const cfg = await getPlatformUpdateBanner();
            if (!cfg.enabled) {
                host.hidden = true;
                host.innerHTML = '';
                return;
            }
            const en = this.getLocale() === 'en';
            const text = en ? cfg.messageEn : cfg.messageJa;
            const fallback = en ? cfg.messageJa : cfg.messageEn;
            const message = String(text || fallback || '').trim();
            if (!message) {
                host.hidden = true;
                host.innerHTML = '';
                return;
            }
            const esc = (s) =>
                String(s)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
            host.innerHTML = `<div class="header-platform-update-inner" role="status"><span class="header-platform-update-text">${esc(message)}</span></div>`;
            host.hidden = false;
        } catch {
            host.hidden = true;
            host.innerHTML = '';
        }
    }

    _isMobileNavViewport() {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
        return window.matchMedia(`(max-width: ${MOBILE_NAV_MAX_PX}px)`).matches;
    }

    openMobileMenu() {
        if (!this._isMobileNavViewport()) return;
        const root = this.shadowRoot;
        if (!root || !this._navCluster || !this._menuToggle) return;
        this._mobileMenuOpen = true;
        this.setAttribute('data-mobile-nav-open', '');
        this._navCluster.classList.add('header-nav-cluster--open');
        if (this._drawerBackdrop) {
            this._drawerBackdrop.classList.add('header-drawer-backdrop--open');
            this._drawerBackdrop.setAttribute('aria-hidden', 'false');
        }
        this._menuToggle.setAttribute('aria-expanded', 'true');
        const en = this.getLocale() === 'en';
        this._menuToggle.setAttribute('aria-label', en ? 'Close menu' : 'メニューを閉じる');
        this._menuToggle.classList.add('header-menu-toggle--open');
        document.documentElement.style.overflow = 'hidden';
        if (this._headerEl) {
            gsap.set(this._headerEl, { y: 0, opacity: 1, pointerEvents: 'auto' });
        }
        this._scrollHidden = false;
        this.clearIdleHideTimer();
        const firstLink = root.querySelector('a.headerNavLink');
        if (firstLink && typeof firstLink.focus === 'function') {
            requestAnimationFrame(() => firstLink.focus());
        }
        queueMicrotask(() => syncSoundEnvironmentPosition());

        let logo = this.shadowRoot.querySelector("#Logo");
        this.shadowRoot.querySelector("header").style.paddingTop = "8.5%";
        this.shadowRoot.querySelector("header").style.paddingLeft = "7%";
    }

    closeMobileMenu() {
        if (!this._mobileMenuOpen) return;
        const root = this.shadowRoot;
        this._mobileMenuOpen = false;
        this.removeAttribute('data-mobile-nav-open');
        if (this._navCluster) this._navCluster.classList.remove('header-nav-cluster--open');
        if (this._drawerBackdrop) {
            this._drawerBackdrop.classList.remove('header-drawer-backdrop--open');
            this._drawerBackdrop.setAttribute('aria-hidden', 'true');
        }
        if (this._menuToggle) {
            this._menuToggle.setAttribute('aria-expanded', 'false');
            const en = this.getLocale() === 'en';
            this._menuToggle.setAttribute('aria-label', en ? 'Open menu' : 'メニューを開く');
            this._menuToggle.classList.remove('header-menu-toggle--open');
        }
        document.documentElement.style.overflow = '';
        if (this._menuToggle && typeof this._menuToggle.focus === 'function') {
            requestAnimationFrame(() => this._menuToggle.focus());
        }
        if (this.getAttribute('active') === 'true') {
            this.resetIdleHideTimer();
        }

        this.shadowRoot.querySelector("header").style.paddingTop = "0";
        this.shadowRoot.querySelector("header").style.paddingLeft = "2%";
    }

    toggleMobileMenu() {
        if (this._mobileMenuOpen) this.closeMobileMenu();
        else this.openMobileMenu();
    }

    attachMobileNavListeners() {
        this.detachMobileNavListeners();
        this._onEscapeBound = (e) => {
            if (e.key !== 'Escape') return;
            if (!this._mobileMenuOpen) return;
            e.preventDefault();
            this.closeMobileMenu();
        };
        document.addEventListener('keydown', this._onEscapeBound, true);
        this._mobileNavMql = window.matchMedia(`(max-width: ${MOBILE_NAV_MAX_PX}px)`);
        this._onResizeMqBound = () => {
            if (!this._mobileNavMql.matches) this.closeMobileMenu();
        };
        if (this._mobileNavMql.addEventListener) {
            this._mobileNavMql.addEventListener('change', this._onResizeMqBound);
        } else {
            this._mobileNavMql.addListener(this._onResizeMqBound);
        }
    }

    detachMobileNavListeners() {
        if (this._onEscapeBound) {
            document.removeEventListener('keydown', this._onEscapeBound, true);
            this._onEscapeBound = null;
        }
        if (this._mobileNavMql && this._onResizeMqBound) {
            if (this._mobileNavMql.removeEventListener) {
                this._mobileNavMql.removeEventListener('change', this._onResizeMqBound);
            } else {
                this._mobileNavMql.removeListener(this._onResizeMqBound);
            }
        }
        this._mobileNavMql = null;
        this._onResizeMqBound = null;
    }

    /** @returns {'en' | 'ja'} */
    getLocale() {
        try {
            const v = localStorage.getItem(LOCALE_STORAGE_KEY);
            if (v === 'ja' || v === 'en') return v;
        } catch (_) {
            /* ignore */
        }
        return 'en';
    }

    /**
     * @param {'en' | 'ja'} locale
     * @param {{ silent?: boolean }} [opts]
     */
    setLocale(locale, opts = {}) {
        const next = locale === 'ja' ? 'ja' : 'en';
        const silent = opts.silent === true;
        try {
            localStorage.setItem(LOCALE_STORAGE_KEY, next);
        } catch (_) {
            /* ignore */
        }
        document.documentElement.lang = next === 'ja' ? 'ja' : 'en';
        document.documentElement.setAttribute('data-locale', next);
        if (typeof window.setLocale === 'function') {
            window.setLocale(next);
        }
        const btn = this.shadowRoot && this.shadowRoot.querySelector('#headerLangBtn');
        if (btn) {
            btn.textContent = next === 'ja' ? 'JP' : 'EN';
            btn.setAttribute(
                'aria-label',
                next === 'ja'
                    ? 'Language: Japanese. Click to switch to English.'
                    : 'Language: English. Click to switch to Japanese.'
            );
        }
        const menuToggle = this.shadowRoot && this.shadowRoot.querySelector('#headerMenuToggle');
        if (menuToggle) {
            const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
            menuToggle.setAttribute(
                'aria-label',
                expanded
                    ? next === 'ja'
                        ? 'メニューを閉じる'
                        : 'Close menu'
                    : next === 'ja'
                      ? 'メニューを開く'
                      : 'Open menu'
            );
        }
        this._updateLocalizedNavTexts();
        if (!silent) {
            window.dispatchEvent(
                new CustomEvent('fusion-localechange', { detail: { locale: next } })
            );
        }
    }

    /** Refresh nav + CTA copy after locale change (shadow render uses initial window.getLocale only once). */
    _updateLocalizedNavTexts() {
        const root = this.shadowRoot;
        if (!root) return;
        const en = this.getLocale() === 'en';
        const navLabels = {
            '/artists': en ? 'Artists' : 'アーティスト',
            '/programs': en ? 'Programs' : 'プログラム',
            '/gallery-access': en ? 'Gallery Access' : 'ギャラリーアクセス',
            '/editions': en ? 'Editions' : 'エディション',
            '/community': en ? 'Community' : 'コミュニティ',
            '/videos': en ? 'Videos' : '動画',
            '/journal': en ? 'Journal' : 'ジャーナル',
            '/context': en ? 'Context' : 'コンテキスト',
        };
        root.querySelectorAll('a.headerNavLink').forEach((a) => {
            const href = a.getAttribute('href');
            if (href && navLabels[href] != null) a.textContent = navLabels[href];
        });
        this._fillAuthPair();
        this._syncActiveNavLink();
    }

    attachEventListeners() {
        const root = this.shadowRoot;

        root.addEventListener('click', (e) => {
            const rosterCta = e.target.closest('.header-roster-vis-cta');
            if (rosterCta) {
                e.preventDefault();
                const action = rosterCta.getAttribute('data-action');
                if (action === 'roster-publish') {
                    this.closeMobileMenu();
                    activateDeactivate('/settings/profile');
                    navigate('/settings/profile');
                    return;
                }
                if (action === 'roster-public') {
                    void import('../../utils/database.js').then(async (m) => {
                        try {
                            await m.updateMyArtistVisibility('public', new Date().toISOString());
                            await this._syncRosterVisibilityBanner();
                        } catch {
                            /* ignore */
                        }
                    });
                    return;
                }
            }
            if (e.target.closest('#headerMenuToggle')) {
                e.preventDefault();
                this.toggleMobileMenu();
                return;
            }
            if (e.target.closest('#headerDrawerBackdrop.header-drawer-backdrop--open')) {
                e.preventDefault();
                this.closeMobileMenu();
                return;
            }

            const profileSetupOverlay = e.target.closest('.header-profile-setup-overlay');
            if (profileSetupOverlay) {
                e.preventDefault();
                this._closeProfileSetupPrompt();
                return;
            }

            const langBtn = e.target.closest('.headerLangBtn');
            if (langBtn) {
                e.preventDefault();
                const cur = this.getLocale();
                this.setLocale(cur === 'en' ? 'ja' : 'en');
                return;
            }

            const rectBtn = e.target.closest('.headerRectBtn');
            if (rectBtn) {
                e.preventDefault();
                const action = rectBtn.getAttribute('data-action');
                if (action === 'cycle-perspective') {
                    this.closeMobileMenu();
                    cycleAdminPerspective();
                    return;
                }
                if (action === 'sign-in') {
                    this.closeMobileMenu();
                    window.dispatchEvent(new CustomEvent('fusion-open-sign-in'));
                    return;
                }
                if (action === 'sign-out') {
                    this.closeMobileMenu();
                    void import('../../utils/icAuth.js').then((m) => m.logoutInternetIdentity());
                    return;
                }
                if (action === 'complete-profile') {
                    this.closeMobileMenu();
                    this._openCompleteProfileInfoPrompt();
                    return;
                }
                if (action === 'close-profile-setup') {
                    this._closeProfileSetupPrompt();
                    return;
                }
                if (action === 'confirm-profile-setup') {
                    this._closeProfileSetupPrompt();
                    void import('../../utils/database.js').then(async (m) => {
                        try {
                            await m.ensureMyLinkedArtistProfile();
                            const { maybeSeedLocalesFromProfileSetupDraftIfEmpty } =
                                await import('../../utils/profileSetupSeedLocales.js');
                            await maybeSeedLocalesFromProfileSetupDraftIfEmpty();
                        } catch {
                            /* ignore */
                        }
                        activateDeactivate('/settings/profile');
                        navigate('/settings/profile');
                    });
                    return;
                }
                if (action === 'confirm-complete-profile') {
                    this.closeMobileMenu();
                    void this._handleCompleteProfileCta();
                    return;
                }
                const href = rectBtn.getAttribute('data-href');
                if (action === 'register' || href === '/register') {
                    this.closeMobileMenu();
                    activateDeactivate('/join-network');
                    navigate('/join-network');
                    return;
                }
                if (href) {
                    this.closeMobileMenu();
                    activateDeactivate(href);
                    navigate(href);
                }
                return;
            }

            const navLink = e.target.closest('a.headerNavLink');
            if (navLink) {
                e.preventDefault();
                const href = navLink.getAttribute('href');
                this.closeMobileMenu();
                activateDeactivate(href);
                navigate(href);
            }
        });

        root.querySelector('#logo').addEventListener('click', (e) => {
            e.preventDefault();
            this.closeMobileMenu();
            activateDeactivate('/');
            navigate('/');
        });

        root.querySelector('#logoHeader')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.closeMobileMenu();
            activateDeactivate('/');
            navigate('/');
        });
    }

    render() {
        const en = this.getLocale() === 'en';
        this.shadow.innerHTML = `
            <style>
            :host {
                display: block;
                position: relative;
                /* Let the logo paint outside the 50px header strip */
                overflow: visible;
                /* --bg, --c* inherit from document (html data-theme); do not override here */
            }

                .header-surface {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    /* Above in-page stickies (e.g. #filterSystem z-index:10) so sound env / nav stay clickable. */
                    z-index: 30;
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    align-items: stretch;
                    will-change: transform, opacity;
                    user-select: none;
                    opacity: 0;
                    pointer-events: none;
                }
                
                header {
                    box-sizing: border-box;
                    max-height: 150px;
                    width: 100%;
                    padding-left: 2%;
                    padding-right: 2%;
                    padding-top: 0;
                    padding-bottom: 0;
                    overflow: visible;
                    display: grid;
                    /* Logo (wide asset) | nav (flex) | CTAs — middle column absorbs shrink */
                    grid-template-columns:
                    minmax(14rem, min(42vw, 40rem))
                    minmax(0, 1fr)
                    minmax(9.25rem, max-content);
                    grid-template-rows: 1fr;
                    align-items: center;
                    justify-content: stretch;
                    column-gap: clamp(0.5rem, 2vw, 1.25rem);
                    font-family: 'momochidori-variable', sans-serif;
                    font-variation-settings: var(--fv-nav);
                    position: relative;
                    z-index: 1;
                    background-color: var(--bg);
                    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.07);
                    border-bottom: 1px solid var(--c2, #000);
                    pointer-events: auto;
                }

                .header-sound-row {
                    display: flex;
                    flex-direction: row;
                    flex-wrap: wrap;
                    align-items: flex-start;
                    justify-content: space-between;
                    width: 100%;
                    box-sizing: border-box;
                    gap: 0.5rem 1rem;
                    pointer-events: none;
                }

                .header-utility-stack {
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    gap: 0.42rem;
                    width: min(17rem, calc(100% - 2rem));
                    margin-top: 15px;
                    margin-left: auto;
                    margin-right: clamp(0.5rem, 2vw, 1.25rem);
                    box-sizing: border-box;
                    pointer-events: none;
                }

                .header-utility-stack > * {
                    pointer-events: auto;
                }

                a {
                    text-decoration: none;
                    color: var(--c2, #000);
                }

                #logo {
                    height: 100%;
                    width: 100%;
                    min-width: 0;
                    display: flex;
                    align-items: center;
                    justify-content: start;
                    cursor: pointer;
                    overflow: visible;
                }

                #logo .header-logo-wide {
                    width: auto;
                    max-width: min(40rem, 100%);
                    height: auto;
                    max-height: none;
                    object-fit: contain;
                    transform: translateX(-5%);
                    display: block;
                    flex-shrink: 0;
                }

                #logo .header-logo-symbol {
                    display: none;
                    width: auto;
                    max-width: min(7.1rem, 100%);
                    max-height: none;
                    height: auto;
                    object-fit: contain;
                    transform: none;
                    flex-shrink: 0;
                }

                #headerNavCluster {
                    display: contents;
                }

                .header-newsletter-slot {
                    display: none;
                }

                #headerMenuToggle {
                    display: none;
                    box-sizing: border-box;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 0.35rem;
                    width: 2.5rem;
                    height: 2.5rem;
                    min-width: 2.5rem;
                    min-height: 2.5rem;
                    padding: 0;
                    margin: 0;
                    border: 1.5px solid var(--c2, #000);
                    background: transparent;
                    color: var(--c2, #000);
                    cursor: pointer;
                    -webkit-appearance: none;
                    appearance: none;
                    flex-shrink: 0;
                    z-index: 1;
                }

                .header-menu-toggle__bar {
                    display: block;
                    width: 1.125rem;
                    height: 2px;
                    background: var(--c2, #000);
                    border-radius: 1px;
                    transition: transform 0.2s ease, opacity 0.2s ease;
                }

                .header-menu-toggle--open .header-menu-toggle__bar:nth-child(1) {
                    transform: translateY(7px) rotate(45deg);
                }

                .header-menu-toggle--open .header-menu-toggle__bar:nth-child(2) {
                    opacity: 0;
                }

                .header-menu-toggle--open .header-menu-toggle__bar:nth-child(3) {
                    transform: translateY(-7px) rotate(-45deg);
                }

                #headerDrawerBackdrop {
                    display: none;
                }

                /* Narrow hit box (logo width only); opacity + pointer-events driven by GSAP when bar hides */
                .floating-logo-header {
                    box-sizing: border-box;
                    max-height: 150px;
                    width: max-content;
                    max-width: 100%;
                    padding-top: 0;
                    padding-bottom: 0;
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 1fr;
                    align-items: center;
                    justify-content: start;
                    overflow: visible;
                    z-index: 10;
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: auto;
                    opacity: 0;
                    pointer-events: none;
                }

                .floating-logo-header #logoHeaderInner {
                    width: 100%;
                    height: 100%;
                    min-width: 0;
                    display: flex;
                    align-items: center;
                    justify-content: start;
                    overflow: visible;
                    cursor: pointer;
                    pointer-events: inherit;
                }

                .floating-logo-header img {
                    width: auto;
                    max-width: min(7.1rem, 100%);
                    max-height: none;
                    height: auto;
                    object-fit: contain;
                    display: block;
                    flex-shrink: 0;
                }
                    
                #headerCtas {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem 0.75rem;
                    margin-left: auto;
                    justify-content: flex-end;
                    align-items: center;
                }

                .header-auth-pair {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem 0.75rem;
                    align-items: center;
                }

                #headerNavLinks {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.75rem 1.25rem;
                    align-items: end;
                    justify-content: flex-start;
                    font-size: clamp(0.75rem, 1.1vw, 1rem);
                }

                a.headerNavLink {
                    white-space: nowrap;
                    cursor: pointer;
                }

                a.headerNavLink:hover {
                    text-decoration: underline;
                }

                a.headerNavLink.headerNavLink--active {
                    font-variation-settings: var(--fv-nav-active);
                    text-decoration: underline;
                    text-underline-offset: 0.12em;
                }

                a.headerNavLink.headerNavLink--active:hover {
                    text-decoration: underline;
                }

                .headerRectBtn {
                    box-sizing: border-box;
                    font-family: inherit;
                    font-variation-settings: var(--fv-nav-active);
                    font-size: clamp(0.65rem, 0.95vw, 0.8rem);
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    border: 1.5px solid var(--c2, #000);
                    background: transparent;
                    color: var(--c2, #000);
                    padding: 0.45rem 0.85rem;
                    min-height: 2.25rem;
                    cursor: pointer;
                    -webkit-appearance: none;
                    appearance: none;
                }

                .headerRectBtn--register {
                    background-color: var(--c5, #c9c9c9);
                    color: var(--c2, #000);
                }

                .headerRectBtn--perspective {
                    padding: 0.45rem 0.5rem;
                    min-width: 2.6rem;
                    font-size: clamp(0.58rem, 0.85vw, 0.7rem);
                }

                .headerRectBtn--complete-profile {
                    background: var(--c3);
                }

                :host-context(html[data-theme="dark"]) .headerRectBtn--register {
                    color: #000000;
                }

                .header-profile-setup-host[hidden] {
                    display: none !important;
                }

                .header-profile-setup-host {
                    position: fixed;
                    inset: 0;
                    width: 100vw;
                    height: 100vh;
                    height: 100dvh;
                    z-index: 400;
                    pointer-events: auto;
                }

                .header-profile-setup-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.28);
                    cursor: pointer;
                }

                .header-profile-setup-modal {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: min(92vw, 460px);
                    background: var(--bg);
                    border: 1px solid var(--c2);
                    box-sizing: border-box;
                    padding: 1rem;
                    z-index: 1;
                    pointer-events: auto;
                }

                .header-profile-setup-modal--top-right {
                    top: 10rem;
                    right: 2rem;
                    left: auto;
                    transform: none;
                    width: min(92vw, 420px);
                }

                .header-profile-setup-title {
                    margin: 0 0 0.5rem;
                    color: var(--c2);
                    font-size: clamp(1rem, 1.15vw, 1.1rem);
                    font-variation-settings: var(--fv-title);
                }

                .header-profile-setup-copy {
                    margin: 0;
                    color: var(--c2);
                    font-size: clamp(0.8rem, 0.95vw, 0.92rem);
                    line-height: 1.35;
                }

                .header-profile-setup-actions {
                    margin-top: 0.9rem;
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.55rem;
                    flex-wrap: wrap;
                }

                .headerRectBtn:hover {
                    opacity: 0.88;
                }

                .headerLangBtn {
                    box-sizing: border-box;
                    width: 2.25rem;
                    height: 2.25rem;
                    min-width: 2.25rem;
                    min-height: 2.25rem;
                    padding: 0;
                    margin: 0;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-family: inherit;
                    font-variation-settings: var(--fv-nav-active);
                    font-size: clamp(0.6rem, 0.85vw, 0.75rem);
                    letter-spacing: 0.02em;
                    border: 1.5px solid var(--c2, #000);
                    background: transparent;
                    color: var(--c2, #000);
                    cursor: pointer;
                    -webkit-appearance: none;
                    appearance: none;
                    flex-shrink: 0;
                }

                .headerLangBtn:hover {
                    opacity: 0.88;
                }

                .headerLangBtn:focus,
                .headerLangBtn:focus-visible {
                    outline: 1px solid var(--c2, #000);
                    outline-offset: 2px;
                }

                #headerSymbolLogo {
                    pointer-events: auto;
                }

                #headerRosterVisBanner {
                    box-sizing: border-box;
                    width: 100%;
                    position: relative;
                    z-index: 35;
                    margin: 0;
                    padding: 0.48rem 0.65rem 0.5rem;
                    background: var(--c1, #c12525);
                    border: 1px solid var(--c1, #c12525);
                    color: var(--bg, #faf3f4);
                    font-family: 'momochidori-variable', sans-serif;
                    font-size: clamp(0.64rem, 0.74vw, 0.76rem);
                    line-height: 1.25;
                    font-variation-settings: 'wght' 560;
                    pointer-events: auto;
                }

                #headerPlatformUpdateBanner {
                    box-sizing: border-box;
                    width: 100%;
                    position: relative;
                    z-index: 34;
                    margin: 0;
                    padding: 0.48rem 0.75rem 0.5rem;
                    background: var(--c1, #c12525);
                    border: 1px solid var(--c1, #c12525);
                    color: var(--bg, #faf3f4);
                    font-family: 'momochidori-variable', sans-serif;
                    font-size: clamp(0.64rem, 0.74vw, 0.76rem);
                    line-height: 1.3;
                    font-variation-settings: 'wght' 560;
                    pointer-events: auto;
                    animation: headerPlatformUpdatePulse 3s ease-in-out infinite;
                }

                @keyframes headerPlatformUpdatePulse {
                    0%, 100% {
                        background: var(--c1, #c12525);
                        filter: brightness(1);
                    }
                    50% {
                        background: color-mix(in srgb, var(--c1, #c12525) 88%, var(--bg, #faf3f4) 12%);
                        filter: brightness(1.06);
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    #headerPlatformUpdateBanner {
                        animation: none;
                    }
                }

                #headerPlatformUpdateBanner[hidden],
                #headerRosterVisBanner[hidden] {
                    display: none !important;
                }

                .header-platform-update-inner {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    margin: 0;
                }

                .header-platform-update-text {
                    flex: 1 1 auto;
                    min-width: 0;
                    max-width: 52rem;
                }

                .header-roster-vis-inner {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.45rem;
                    margin: 0;
                }

                .header-roster-vis-text {
                    flex: 1 1 auto;
                    min-width: 0;
                }

                .header-roster-vis-cta {
                    flex: 0 0 auto;
                    padding: 0.16rem 0.42rem;
                    font: inherit;
                    font-size: 0.66rem;
                    font-variation-settings: var(--fv-nav-active);
                    border: 1px solid var(--bg, #faf3f4);
                    background: transparent;
                    color: var(--bg, #faf3f4);
                    cursor: pointer;
                }

                .header-roster-vis-cta:hover {
                    opacity: 0.86;
                }

                @media (max-width: ${MOBILE_NAV_MAX_PX}px) {
                    :host([data-mobile-nav-open]) header {
                        z-index: 165;
                    }

                    :host([data-mobile-nav-open]) #logoHeader {
                        opacity: 0 !important;
                    }

                    /* Open drawer: show full wordmark in the bar */
                    :host([data-mobile-nav-open]) #logo .header-logo-wide {
                        display: block !important;
                    }

                    :host([data-mobile-nav-open]) #logo .header-logo-symbol {
                        display: none !important;
                    }

                    :host([data-mobile-nav-open]) #headerNavLinks {
                        font-size: clamp(1.8rem, 2vw, 1.35rem);
                    }

                    header {
                        display: flex;
                        flex-direction: row;
                        flex-wrap: nowrap;
                        align-items: center;
                        justify-content: space-between;
                        column-gap: 0.75rem;
                        padding-right: 7%;
                    }

                    #logo {
                        flex: 1 1 auto;
                        min-width: 0;
                    }

                    #logo .header-logo-wide {
                        display: none;
                    }

                    #logo .header-logo-symbol {
                        display: block;
                    }

                    #headerMenuToggle {
                        display: inline-flex !important;
                        width: 4rem;
                        height: 4rem;
                        min-width: 4rem;
                        min-height: 4rem;
                    }

                    #headerMenuToggle.header-menu-toggle--open .header-menu-toggle__bar:nth-child(1) {
                        transform: translateY(13px) rotate(45deg);
                    }

                    #headerMenuToggle.header-menu-toggle--open .header-menu-toggle__bar:nth-child(3) {
                        transform: translateY(-13px) rotate(-45deg);
                    }

                    #headerNavCluster {
                        display: flex;
                        flex-direction: column;
                        position: fixed;
                        top: 0;
                        right: 0;
                        bottom: 0;
                        height: 82.5vh;
                        min-height: 100%;
                        width: min(100%, 23.5rem);
                        max-width: 100vw;
                        z-index: -1;
                        background-color: var(--bg);
                        box-shadow: -4px 0 20px rgba(0, 0, 0, 0.08);
                        padding: clamp(8rem, 12vw, 5rem) 2.25rem 1.5rem;
                        gap: 1.25rem;
                        overflow-y: auto;
                        -webkit-overflow-scrolling: touch;
                        transform: translateX(100%);
                        transition: transform 0.3s ease;
                        pointer-events: none;
                        visibility: hidden;
                    }

                    #headerNavCluster.header-nav-cluster--open {
                        transform: translateX(0);
                        pointer-events: auto;
                        visibility: visible;
                    }

                    #headerNavLinks {
                        flex-direction: column;
                        flex-wrap: nowrap;
                        align-items: end;
                        gap: 1rem;
                        margin-right: 0;
                        font-size: clamp(0.95rem, 3.5vw, 1.125rem);
                    }

                    a.headerNavLink {
                        white-space: normal;
                        padding: 0.25rem 0;
                    }

                    #headerCtas {
                        margin-top: 5%;
                        margin-left: 0;
                        width: 100%;
                        display: grid;
                        grid-template-columns: minmax(0, 75%) minmax(0, 25%);
                        grid-template-rows: auto;
                        align-items: center;
                        column-gap: 0.5rem;
                        row-gap: 0;
                    }

                    .header-newsletter-slot {
                        display: block;
                        width: 100%;
                        margin-top: 0.25rem;
                        padding-top: 1rem;
                        border-top: 1px solid color-mix(in srgb, var(--c2) 18%, transparent);
                        box-sizing: border-box;
                    }

                    #headerCtas #headerAuthPair {
                        grid-column: 1;
                        min-width: 0;
                        width: 100%;
                        padding-bottom: 0;
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .header-sound-env-slot {
                        width: 100%;
                        margin-top: auto;
                        padding-top: 1.25rem;
                        border-top: 1px solid color-mix(in srgb, var(--c2) 18%, transparent);
                    }

                    .header-sound-env-slot:empty {
                        display: none;
                    }

                    .header-sound-env-slot .fusion-sound-env-host {
                        position: static;
                        top: auto;
                        left: auto;
                        right: auto;
                        width: 100%;
                        max-width: 100%;
                        z-index: auto;
                    }

                    #headerCtas #headerLangBtn {
                        grid-column: 2;
                        justify-self: end;
                        align-self: center;
                        width: min(100%, 3.75rem);
                        height: 3.75rem;
                        min-width: 2.75rem;
                        min-height: 3.75rem;
                        font-size: clamp(0.78rem, 3.2vw, 0.95rem);
                        font-variation-settings: var(--fv-nav-active);
                        border-width: 2px;
                        box-shadow: 0 1px 0 rgba(0, 0, 0, 0.06);
                    }

                    #headerCtas .header-auth-pair {
                        width: 100%;
                        flex-direction: column;
                        align-items: stretch;
                    }

                    #headerCtas .headerRectBtn {
                        width: 100%;
                        padding: 0.9rem 0.95rem;
                        text-align: center;
                        font-size: clamp(0.85rem, 0.95vw, 0.8rem);
                    }

                    .headerRectBtn--complete-profile {
                        position: static;
                        width: 100%;
                        top: auto;
                        right: auto;
                    }

                    .header-profile-setup-modal--top-right {
                        top: 1rem;
                        right: 1rem;
                        width: min(92vw, 360px);
                    }

                    #headerRosterVisBanner {
                        width: 100%;
                    }

                    #headerPlatformUpdateBanner {
                        width: 100%;
                    }

                    .header-utility-stack {
                        width: calc(100% - 2rem);
                        margin-left: 1rem;
                        margin-right: 1rem;
                    }

                    .header-roster-vis-inner {
                        flex-wrap: wrap;
                    }

                    #headerDrawerBackdrop {
                        display: block;
                        position: fixed;
                        inset: 0;
                        z-index: 159;
                        background: rgba(0, 0, 0, 0.35);
                        opacity: 0;
                        pointer-events: none;
                        visibility: hidden;
                        transition: opacity 0.25s ease, visibility 0.25s;
                    }

                    #headerDrawerBackdrop.header-drawer-backdrop--open {
                        opacity: 1;
                        pointer-events: auto;
                        visibility: visible;
                    }
                }
            </style>
            <div class="header-surface">
            <header>
                <div id="logo">
                    <img id="headerLogo" class="header-logo-wide" src="${HeaderWideLogo}" alt="${withSeoImageAlt('Fusion logo')}">
                    <img id="headerLogoSymbol" class="header-logo-symbol" src="${SymbolLogo}" alt="${withSeoImageAlt('Fusion logo')}">
                </div>
                <button type="button" id="headerMenuToggle" class="header-menu-toggle" aria-expanded="false" aria-controls="headerNavCluster" aria-label="${en ? 'Open menu' : 'メニューを開く'}">
                    <span class="header-menu-toggle__bar" aria-hidden="true"></span>
                    <span class="header-menu-toggle__bar" aria-hidden="true"></span>
                    <span class="header-menu-toggle__bar" aria-hidden="true"></span>
                </button>
                <div id="headerNavCluster">
                    <nav id="headerNavLinks" aria-label="Primary">
                        <a class="headerNavLink" href="/artists">${en ? 'Artists' : 'アーティスト'}</a>
                        <a class="headerNavLink" href="/programs">${en ? 'Programs' : 'プログラム'}</a>
                        <a class="headerNavLink" href="/gallery-access">${en ? 'Gallery Access' : 'ギャラリーアクセス'}</a>
                        <a class="headerNavLink" href="/editions">${en ? 'Editions' : 'エディション'}</a>
                        <a class="headerNavLink" href="/community">${en ? 'Community' : 'コミュニティ'}</a>
                        <a class="headerNavLink" href="/videos">${en ? 'Videos' : '動画'}</a>
                        <a class="headerNavLink" href="/journal">${en ? 'Journal' : 'ジャーナル'}</a>
                        <a class="headerNavLink" href="/context">${en ? 'Context' : 'コンテキスト'}</a>
                    </nav>
                    <div id="headerCtas">
                        <div id="headerAuthPair" class="header-auth-pair"></div>
                        <button type="button" id="headerLangBtn" class="headerLangBtn" aria-label="Language: English. Click to switch to Japanese.">${en ? 'EN' : 'JP'}</button>
                    </div>
                    <app-newsletter-subscribe variant="drawer" class="header-newsletter-slot"></app-newsletter-subscribe>
                    <div id="headerSoundEnvSlot" class="header-sound-env-slot" aria-label="${en ? 'Sound environment' : 'サウンド環境'}"></div>
                </div>
            </header>
            <div class="header-sound-row">
                <div class="header-utility-stack" aria-live="polite">
                    <div id="headerPlatformUpdateBanner" class="header-platform-update-banner" hidden></div>
                    <div id="headerRosterVisBanner" class="header-roster-vis-banner" hidden></div>
                </div>
            </div>
            <div id="headerDrawerBackdrop" class="header-drawer-backdrop" aria-hidden="true"></div>
            </div>
            <div id="logoHeader" class="floating-logo-header">
                <div id="logoHeaderInner">
                    <img id="headerSymbolLogo" src="${SymbolLogo}" alt="${withSeoImageAlt('Fusion logo')}" loading="lazy">
                </div>
            </div>
            <!-- Outside .header-surface: that node is GSAP-transformed / opacity-hidden on scroll,
                 which would otherwise trap this "fixed" overlay to the header strip only. -->
            <div id="headerProfileSetupPrompt" class="header-profile-setup-host" hidden></div>
        `;
    }
}

customElements.define('app-header', HeaderComponent);

export { HeaderComponent };

// Legacy function export for backward compatibility with existing code
export function renderHeader(active = false) {
    return `<app-header id="header" active="${active}"></app-header>`;
}

export function initHeader() {
    // Component initializes automatically via connectedCallback
    // This function kept for backward compatibility
}
