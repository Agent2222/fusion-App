/** Routes where sound aligns below the sticky feed-filter bar (right side). */
export const FILTER_SOUND_ROUTES = ['/artists', '/gallery-access', '/editions'];

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
    return FILTER_SOUND_ROUTES.includes(normalizePath(pathname));
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
 * Visible header chrome height from the viewport top (0 when scrolled away).
 *
 * @returns {number}
 */
function getHeaderOffsetPx() {
    if (isHeaderScrollHidden()) return 0;

    const header = document.getElementById('header');
    const surface = header?.shadowRoot?.querySelector('.header-surface');
    if (surface instanceof HTMLElement) {
        const rect = surface.getBoundingClientRect();
        if (rect.bottom <= 0) return 0;
        return Math.max(0, rect.bottom);
    }

    return getHeaderChromeFallbackPx();
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
 * Filter routes: fixed below header chrome + full filter system (closed or open).
 *
 * @returns {number}
 */
function computeFilterPlacementTopPx() {
    return getHeaderOffsetPx() + getFilterSystemHeightPx();
}

/**
 * @param {'filter' | 'default'} placement
 * @returns {number}
 */
function computeTopPx(placement) {
    if (placement === 'filter') {
        return computeFilterPlacementTopPx();
    }

    const header = document.getElementById('header');
    const nav = header?.shadowRoot?.querySelector('header');
    if (nav instanceof HTMLElement) {
        const rect = nav.getBoundingClientRect();
        if (rect.height > 0) {
            return rect.bottom + 15;
        }
    }

    if (isHeaderScrollHidden()) {
        return 0;
    }

    return getHeaderChromeFallbackPx() - 80;
}

/**
 * @param {string} [pathname]
 */
export function syncSoundEnvironmentPosition(pathname) {
    const host = getSoundHost();
    if (!host) return;

    ensureHostOnBody(host);

    const path = normalizePath(pathname ?? window.location?.pathname ?? '/');
    const placement = isFilterSoundRoute(path) ? 'filter' : 'default';

    delete document.documentElement.dataset.fusionSoundMount;
    document.documentElement.dataset.fusionSoundPlacement = placement;

    const top = computeTopPx(placement);
    document.documentElement.style.setProperty('--fusion-sound-env-top', `${top}px`);

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
