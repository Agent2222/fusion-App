/** Routes where sound aligns below the sticky feed-filter bar (right side). */
export const FILTER_SOUND_ROUTES = ['/artists', '/gallery-access', '/editions'];

/** Match `header.js` mobile drawer breakpoint. */
export const MOBILE_SOUND_NAV_MAX_PX = 1024;

/** Closed filter toggle band — matches `#filterSystem` default height in index.css. */
const FILTER_COLLAPSED_HEIGHT_PX = 70;

/** Expanded filter panel fallback when not yet measured. */
const FILTER_EXPANDED_HEIGHT_PX = 380;

/** @type {boolean} */
let listenersAttached = false;

/** @type {number | null} */
let rafId = null;

/**
 * @param {string} pathname
 * @returns {string}
 */
function normalizePath(pathname) {
    let p = String(pathname || '/').split('?')[0].split('#')[0];
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p || '/';
}

/**
 * @param {string} pathname
 * @returns {boolean}
 */
export function isFilterSoundRoute(pathname) {
    const p = normalizePath(pathname);
    if (FILTER_SOUND_ROUTES.includes(p)) return true;
    return p.startsWith('/artists/');
}

/**
 * Program detail URLs: right-aligned like filter routes, without filter-bar top offset.
 *
 * @param {string} pathname
 * @returns {boolean}
 */
export function isProgramViewSoundRoute(pathname) {
    const p = normalizePath(pathname);
    if (p === '/program-view') return true;
    const after = p.startsWith('/program/')
        ? p.slice('/program/'.length)
        : p.startsWith('/programs/')
          ? p.slice('/programs/'.length)
          : '';
    return Boolean(after.split('/').filter(Boolean)[0]);
}

/**
 * @returns {number}
 */
function getHeaderChromeFallbackPx() {
    const raw = getComputedStyle(document.documentElement)
        .getPropertyValue('--fusion-header-chrome-height')
        .trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 145;
}

/**
 * @returns {boolean}
 */
function isHeaderScrollHidden() {
    return document.documentElement.dataset.fusionHeaderScroll === 'hidden';
}

/**
 * Layout height of the header chrome (ignores GSAP translateY on `.header-surface`).
 * Live getBoundingClientRect() is wrong mid scroll-hide/show animation.
 *
 * @returns {number}
 */
function getHeaderChromeLayoutPx() {
    const header = document.getElementById('header');
    const surface = header?.shadowRoot?.querySelector('.header-surface');
    if (surface instanceof HTMLElement) {
        const h = surface.offsetHeight;
        if (Number.isFinite(h) && h > 0) return h;
    }
    return getHeaderChromeFallbackPx();
}

/**
 * Visible header chrome height from the viewport top (0 when scrolled away).
 * Uses `data-fusion-header-scroll` as source of truth so sound stays aligned
 * with the feed-filter sticky offset while the bar animates in/out.
 *
 * @returns {number}
 */
function getHeaderOffsetPx() {
    if (isHeaderScrollHidden()) return 0;
    return getHeaderChromeLayoutPx();
}

/**
 * Sticky filter block height: 70px collapsed, 300px expanded.
 *
 * @returns {number}
 */
function getFilterSystemHeightPx() {
    const filterSystem = document.getElementById('filterSystem');
    if (!(filterSystem instanceof HTMLElement)) {
        return FILTER_COLLAPSED_HEIGHT_PX;
    }

    const measured = filterSystem.getBoundingClientRect().height;
    if (Number.isFinite(measured) && measured > 0) {
        return measured;
    }

    const computed = parseFloat(getComputedStyle(filterSystem).height);
    if (Number.isFinite(computed) && computed > 0) {
        return computed;
    }

    if (filterSystem.classList.contains('active')) {
        return FILTER_EXPANDED_HEIGHT_PX;
    }

    return FILTER_COLLAPSED_HEIGHT_PX;
}

/**
 * @returns {HTMLElement | null}
 */
function getSoundHost() {
    const host = document.getElementById('fusionSoundEnvHost');
    return host instanceof HTMLElement ? host : null;
}

/**
 * Ensure `#fusionSoundEnvHost` lives on `body` (never nested in header/filter).
 *
 * @param {HTMLElement} host
 */
function ensureHostOnBody(host) {
    if (host.parentElement !== document.body) {
        document.body.appendChild(host);
    }
}

/**
 * @returns {boolean}
 */
function isMobileSoundLayout() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(`(max-width: ${MOBILE_SOUND_NAV_MAX_PX}px)`).matches;
}

/**
 * @returns {HTMLElement | null}
 */
function getMobileSoundSlot() {
    const header = document.getElementById('header');
    const slot = header?.shadowRoot?.querySelector('#headerSoundEnvSlot');
    return slot instanceof HTMLElement ? slot : null;
}

/**
 * Desktop: fixed host on `body`. Mobile: host inside header drawer slot.
 *
 * @param {HTMLElement} host
 */
function syncSoundEnvironmentMobileHost(host) {
    const mobile = isMobileSoundLayout();
    const slot = getMobileSoundSlot();
    const sound = document.getElementById('siteSoundEnv');

    if (mobile && slot) {
        if (host.parentElement !== slot) {
            slot.appendChild(host);
        }
        host.classList.add('fusion-sound-env-host--mobile-menu');
        document.documentElement.dataset.fusionSoundMobileMenu = 'true';
        if (sound instanceof HTMLElement) {
            sound.dataset.mobileMenu = 'true';
        }
        return;
    }

    ensureHostOnBody(host);
    host.classList.remove('fusion-sound-env-host--mobile-menu');
    delete document.documentElement.dataset.fusionSoundMobileMenu;
    if (sound instanceof HTMLElement) {
        delete sound.dataset.mobileMenu;
    }
}

/**
 * Filter routes: fixed below header chrome + full filter system (closed or open).
 *
 * @returns {number}
 */
function computeFilterPlacementTopPx() {
    return getHeaderOffsetPx() + getFilterSystemHeightPx();
}

/** Gap below the header chrome on default (non-filter) placement. */
const DEFAULT_SOUND_GAP_PX = 15;

/**
 * @param {'filter' | 'right' | 'default'} placement
 * @returns {number}
 */
function computeTopPx(placement) {
    if (placement === 'filter') {
        return computeFilterPlacementTopPx();
    }

    // Match filter-route behavior: pin under chrome when header is shown
    // (`top` / `visible`), including scroll-up mid-page — not live transformed rect.
    if (isHeaderScrollHidden()) {
        return DEFAULT_SOUND_GAP_PX;
    }

    return getHeaderOffsetPx() + DEFAULT_SOUND_GAP_PX;
}

/**
 * @param {string} pathname
 * @returns {'filter' | 'right' | 'default'}
 */
function getSoundPlacement(pathname) {
    if (isFilterSoundRoute(pathname)) return 'filter';
    if (isProgramViewSoundRoute(pathname)) return 'right';
    return 'default';
}

/**
 * @param {string} [pathname]
 */
export function syncSoundEnvironmentPosition(pathname) {
    const host = getSoundHost();
    if (!host) return;

    syncSoundEnvironmentMobileHost(host);

    const path = normalizePath(pathname ?? window.location?.pathname ?? '/');
    const placement = getSoundPlacement(path);

    delete document.documentElement.dataset.fusionSoundMount;
    document.documentElement.dataset.fusionSoundPlacement = placement;

    if (document.documentElement.dataset.fusionSoundMobileMenu === 'true') {
        document.documentElement.style.removeProperty('--fusion-sound-env-top');
    } else {
        const top = computeTopPx(placement);
        document.documentElement.style.setProperty('--fusion-sound-env-top', `${top}px`);
    }

    const sound = document.getElementById('siteSoundEnv');
    if (sound instanceof HTMLElement) {
        sound.dataset.placement = placement;
        delete sound.dataset.mount;
    }

    document.getElementById('fusionSoundEnvDefaultAnchor')?.remove();
}

function schedulePositionSync() {
    if (rafId != null) return;
    rafId = requestAnimationFrame(() => {
        rafId = null;
        syncSoundEnvironmentPosition();
    });
}

/**
 * Wire one-time listeners for route, resize, header scroll, and filter changes.
 */
export function ensureSoundEnvironmentPositionListeners() {
    if (listenersAttached) return;
    listenersAttached = true;

    window.addEventListener('routeChange', () => schedulePositionSync());
    window.addEventListener('resize', () => schedulePositionSync(), { passive: true });
    window.addEventListener('fusion-filter-expanded-changed', () => schedulePositionSync());

    document.addEventListener(
        'transitionend',
        (e) => {
            if (e.target instanceof HTMLElement && e.target.id === 'filterSystem') {
                schedulePositionSync();
            }
        },
        true
    );

    const root = document.documentElement;
    const htmlObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.type === 'attributes' && m.attributeName === 'data-fusion-header-scroll') {
                schedulePositionSync();
                return;
            }
        }
    });
    htmlObserver.observe(root, { attributes: true, attributeFilter: ['data-fusion-header-scroll'] });

    const filterObserver = new MutationObserver(() => schedulePositionSync());
    const watchFilterSystem = () => {
        const filterSystem = document.getElementById('filterSystem');
        if (filterSystem instanceof HTMLElement) {
            filterObserver.disconnect();
            filterObserver.observe(filterSystem, { attributes: true, attributeFilter: ['class'] });
        }
    };
    watchFilterSystem();
    window.addEventListener('routeChange', () => {
        queueMicrotask(watchFilterSystem);
    });

    ensureSoundEnvironmentPositionListeners._htmlObserver = htmlObserver;
    ensureSoundEnvironmentPositionListeners._filterObserver = filterObserver;
}

/** @deprecated Use syncSoundEnvironmentPosition */
export function syncSoundEnvironmentMount(pathname) {
    ensureSoundEnvironmentPositionListeners();
    syncSoundEnvironmentPosition(pathname);
}
