/**
 * Sticky expandable filter bar for Artists, Editions, and Gallery Access.
 * Dispatches `fusion-feed-filter` with criteria; pages hydrate roster data via `hydrateFilterData()`.
 */
import { navigate } from '../../router.js';
import { artistEnglishBlock } from '../../utils/artistSlug.js';
import {
    applyProfileCardModeForCohortPath,
    buildArtistCohortFilterOptions,
    matchArtistCohortOption,
    parseArtistsCohortPath,
} from '../../utils/artistCohortRoutes.js';
import {
    ARTIST_LOCATION_OPTIONS,
    DISCIPLINE_OPTIONS,
    EDITION_CATEGORY_OPTIONS,
    artistProfileSlug,
    buildArtistFilterAvailability,
    buildEditionFilterAvailability,
    buildGalleryFilterAvailability,
    disciplineButtonIdToKey,
    locationKeyToLabel,
} from '../../utils/feedFilterApply.js';
import { syncSoundEnvironmentPosition } from '../../utils/soundEnvironmentMount.js';

const SCROLL_DELTA_PX = 4;
const SCROLL_COLLAPSE_IGNORE_AFTER_OPEN_MS = 1200;
const SCROLL_COLLAPSE_GUARD_AFTER_CLICK_MS = 1400;
const SEARCH_DEBOUNCE_MS = 200;

const EVENT_NAME = 'fusion-feed-filter';

/** @type {Record<'artists' | 'editions' | 'gallery-access', string>} */
const SCROLL_ROOT_BY_STATE = {
    artists: 'artistsMainContent',
    editions: 'editionsMainContent',
    'gallery-access': 'galleryAccessMainContent',
};

const EDITION_CAT_ID_TO_KEY = {
    editionCatSeries: 'series',
    editionCatMonograph: 'monograph',
    editionCatPortfolio: 'portfolio',
    editionCatOther: 'other',
};

const EDITION_FORMAT_LABELS = {
    formatPrint: 'Print',
    formatMultiple: 'Multiple',
    formatBook: 'Book',
    formatObject: 'Object',
    formatDigital: 'Digital',
    formatOther: 'Other',
};

const GALLERY_VIEW_LABELS = {
    galleryPreview: 'Preview',
    galleryOpening: 'Opening',
    galleryArchive: 'Archive',
};

/** @param {string} s */
function escHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}

function getArtistLocationModalEl() {
    const el = document.getElementById('artistLocationModal');
    return el instanceof HTMLElement ? el : null;
}

function getGalleryLocationModalEl() {
    const el = document.getElementById('galleryLocationModal');
    return el instanceof HTMLElement ? el : null;
}

function getArtistLedgerModalEl() {
    const el = document.getElementById('artistLedgerModal');
    return el instanceof HTMLElement ? el : null;
}

/** @param {HTMLElement} modal */
function portalModalToBody(modal) {
    if (modal.parentElement !== document.body) {
        document.body.appendChild(modal);
    }
}

/** @param {HTMLElement} modal @param {HTMLElement} host */
function restoreModalToHost(modal, host) {
    if (modal.parentElement === document.body && host.isConnected) {
        host.appendChild(modal);
    }
}

/** @param {'artists' | 'editions' | 'gallery-access'} state */
function scrollFilterPageToTop(state) {
    const scrollRootId = SCROLL_ROOT_BY_STATE[state];
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const main = document.getElementById('mainContent');
    if (main instanceof HTMLElement) main.scrollTop = 0;
    if (scrollRootId) {
        const primary = document.getElementById(scrollRootId);
        if (primary instanceof HTMLElement) primary.scrollTop = 0;
    }
}

/** @param {'artists' | 'editions' | 'gallery-access'} state */
function modalScrollTargets(state) {
    /** @type {(Element | Window)[]} */
    const targets = [window];
    const main = document.getElementById('mainContent');
    if (main) targets.push(main);
    const scrollRootId = SCROLL_ROOT_BY_STATE[state];
    if (scrollRootId) {
        const primary = document.getElementById(scrollRootId);
        if (primary) targets.push(primary);
    }
    return targets;
}

/**
 * @param {string} scrollRootId
 * @param {HTMLElement} [host]
 */
function setupFilterSystemAndScrollCollapse(scrollRootId, host) {
    const root = host instanceof HTMLElement ? host : document;
    const filterSystem = root.querySelector('#filterSystem');
    const filterToggle = root.querySelector('#filterToggle');
    if (!filterSystem || !filterToggle) return;

    const lastScrollTopById = {};
    let ignoreScrollCollapseUntil = 0;
    let guardScrollCollapseUntil = 0;

    const scrollPairs = () => {
        /** @type {[string, Element | Window][]} */
        const pairs = [];
        const main = document.getElementById('mainContent');
        if (main) pairs.push(['mainContent', main]);
        const primary = document.getElementById(scrollRootId);
        if (primary && primary !== main) pairs.push([scrollRootId, primary]);
        return pairs.length ? pairs : [['window', window]];
    };

    const readScrollTop = (el) =>
        el === window ? window.pageYOffset || document.documentElement.scrollTop : el.scrollTop;

    const syncScrollBaselines = () => {
        for (const [id, el] of scrollPairs()) {
            lastScrollTopById[id] = readScrollTop(el);
        }
    };

    const beginIgnoreScrollCollapseAfterOpen = () => {
        const now = performance.now();
        ignoreScrollCollapseUntil = now + SCROLL_COLLAPSE_IGNORE_AFTER_OPEN_MS;
        guardScrollCollapseUntil = now + SCROLL_COLLAPSE_GUARD_AFTER_CLICK_MS;
        syncScrollBaselines();
    };

    const setFilterExpanded = (open) => {
        filterSystem.classList.toggle('active', open);
        filterToggle.classList.toggle('active', open);
        if (open) beginIgnoreScrollCollapseAfterOpen();
        window.dispatchEvent(new CustomEvent('fusion-filter-expanded-changed'));
    };

    const collapseFilterIfActive = () => {
        if (performance.now() < guardScrollCollapseUntil) return;
        if (!filterSystem.classList.contains('active')) return;
        setFilterExpanded(false);
    };

    filterToggle.addEventListener('click', () => {
        const open = !filterSystem.classList.contains('active');
        if (open) setFilterExpanded(true);
        else {
            guardScrollCollapseUntil = 0;
            setFilterExpanded(false);
        }
    });

    const handleScroll = (el, id) => {
        const st = readScrollTop(el);
        const now = performance.now();
        if (now < ignoreScrollCollapseUntil || now < guardScrollCollapseUntil) {
            lastScrollTopById[id] = st;
            return;
        }
        if (st <= 0) {
            lastScrollTopById[id] = 0;
            return;
        }
        const prev = lastScrollTopById[id];
        if (prev === undefined) {
            lastScrollTopById[id] = st;
            return;
        }
        const delta = st - prev;
        lastScrollTopById[id] = st;
        if (Math.abs(delta) < SCROLL_DELTA_PX) return;
        if (delta > 0) collapseFilterIfActive();
    };

    for (const [id, el] of scrollPairs()) {
        if (id === 'window') {
            window.addEventListener('scroll', () => handleScroll(window, 'window'), { passive: true });
        } else {
            el.addEventListener('scroll', () => handleScroll(el, id), { passive: true });
        }
    }

    syncScrollBaselines();
    if (filterSystem.classList.contains('active')) beginIgnoreScrollCollapseAfterOpen();
}

/** @param {string[]} keys */
function locationModalOptionsHtml(keys) {
    const allowed = new Set(keys.length ? keys : ARTIST_LOCATION_OPTIONS.map((o) => o.key));
    allowed.add('all');
    return ARTIST_LOCATION_OPTIONS.filter((o) => allowed.has(o.key))
        .map(
            (o) =>
                `<button type="button" class="feed-filter-modal__option${o.key === 'all' ? ' feed-filter-modal__option--all' : ''}" data-location-key="${o.key}">${escHtml(o.label)}</button>`
        )
        .join('');
}

/** @param {string} id @param {string} label @param {boolean} [active] */
function chipButton(id, label, active = false) {
    return `<div class="filterButton${active ? ' active' : ''}" id="${escHtml(id)}">${escHtml(label)}</div>`;
}

/**
 * @param {string} id
 * @param {string} label
 * @param {string} href
 * @param {boolean} [active]
 */
function chipLink(id, label, href, active = false) {
    return `<a class="filterButton${active ? ' active' : ''}" id="${escHtml(id)}" href="${escHtml(href)}">${escHtml(label)}</a>`;
}

function templateArtistsSkeleton() {
    return `
        <div id="filterSystem" class="feed-filter-system active">
            <div id="filterToggle" class="active">
                <span class="feed-filter-toggle-label">Filter Artists</span>
            </div>
            <div id="filterContent">
                <div id="leftFilter" class="filterBlock">
                    <p class="filterColumnHeader">By Location</p>
                    <div id="locationFilter" class="filterLocationActions">
                        <button type="button" class="feed-filter-action-btn feed-filter-action-btn--primary" id="artistLocationsBtn">All Locations</button>
                        <button type="button" class="feed-filter-action-btn" id="artistLedgerBtn">Artists Ledger</button>
                    </div>
                </div>
                <div id="middleFilter" class="filterBlock centerFilterBlock">
                    <p class="filterColumnHeader">By Cohort</p>
                    <div id="connectionFilter" class="filterButtonBlock" data-filter-group="connection"></div>
                </div>
                <div id="rightFilter" class="filterBlock">
                    <p class="filterColumnHeader">By Discipline</p>
                    <div id="disciplineFilter" class="filterButtonBlock filterButtonBlock--multi" data-multi="true" data-all-id="allDiscipline"></div>
                </div>
            </div>
            <div id="filterSearchRow">
                <label class="filterSearchLabel" for="filterSearchInput">Find artist by name</label>
                <input type="search" id="filterSearchInput" class="filterSearchInput" autocomplete="off" placeholder="Search roster…" />
            </div>
        </div>
        <div id="artistLocationModal" class="feed-filter-modal" hidden role="dialog" aria-modal="true" aria-labelledby="artistLocationModalTitle">
            <div class="feed-filter-modal__backdrop" id="artistLocationModalBackdrop"></div>
            <div class="feed-filter-modal__dialog">
                <h2 class="feed-filter-modal__title" id="artistLocationModalTitle">Locations</h2>
                <p class="feed-filter-modal__hint">Choose a region to filter the roster.</p>
                <div class="feed-filter-modal__list" id="artistLocationModalList"></div>
                <button type="button" class="feed-filter-modal__done" id="artistLocationModalClose">Done</button>
            </div>
        </div>
        <div id="artistLedgerModal" class="feed-filter-modal feed-filter-ledger-modal" hidden role="dialog" aria-modal="true" aria-labelledby="artistLedgerModalTitle">
            <div class="feed-filter-modal__backdrop" id="artistLedgerModalBackdrop"></div>
            <div class="feed-filter-modal__dialog feed-filter-modal__dialog--wide">
                <h2 class="feed-filter-modal__title" id="artistLedgerModalTitle">Artists Ledger</h2>
                <p class="feed-filter-modal__hint">Select an artist to open their profile.</p>
                <div class="feed-filter-ledger-columns" id="artistLedgerList"></div>
                <button type="button" class="feed-filter-modal__done" id="artistLedgerModalClose">Done</button>
            </div>
        </div>
    `;
}

function templateEditionsSkeleton() {
    return `
        <div id="filterSystem" class="feed-filter-system">
            <div id="filterToggle">
                <span class="feed-filter-toggle-label">Filter Editions</span>
            </div>
            <div id="filterContent">
                <div id="leftFilter" class="filterBlock">
                    <p class="filterColumnHeader">By Category</p>
                    <div id="editionCategoryFilter" class="filterButtonBlock filterButtonBlock--multi filterButtonBlock--compact" data-multi="true" data-all-id="allEditionCategories"></div>
                </div>
                <div id="middleFilter" class="filterBlock centerFilterBlock">
                    <p class="filterColumnHeader">By Year</p>
                    <div id="connectionFilter" class="filterButtonBlock" data-filter-group="editionYear"></div>
                </div>
                <div id="rightFilter" class="filterBlock">
                    <p class="filterColumnHeader">By Format</p>
                    <div id="disciplineFilter" class="filterButtonBlock" data-filter-group="editionFormat"></div>
                </div>
            </div>
            <div id="filterSearchRow">
                <label class="filterSearchLabel" for="filterSearchInput">Find edition by title</label>
                <input type="search" id="filterSearchInput" class="filterSearchInput" autocomplete="off" placeholder="Search editions…" />
            </div>
        </div>
    `;
}

function templateGalleryAccessSkeleton() {
    return `
        <div id="filterSystem" class="feed-filter-system">
            <div id="filterToggle">
                <span class="feed-filter-toggle-label">Filter Gallery Access</span>
            </div>
            <div id="filterContent">
                <div id="leftFilter" class="filterBlock">
                    <p class="filterColumnHeader">By Location</p>
                    <div id="galleryLocationWrap" class="filterLocationActions">
                        <button type="button" class="feed-filter-action-btn feed-filter-action-btn--primary" id="galleryLocationsBtn">All Locations</button>
                    </div>
                </div>
                <div id="middleFilter" class="filterBlock centerFilterBlock">
                    <p class="filterColumnHeader">By Season</p>
                    <div id="connectionFilter" class="filterButtonBlock" data-filter-group="gallerySeason"></div>
                </div>
                <div id="rightFilter" class="filterBlock">
                    <p class="filterColumnHeader">By View</p>
                    <div id="disciplineFilter" class="filterButtonBlock" data-filter-group="galleryView"></div>
                </div>
            </div>
            <div id="filterSearchRow">
                <label class="filterSearchLabel" for="filterSearchInput">Find artist by name</label>
                <input type="search" id="filterSearchInput" class="filterSearchInput" autocomplete="off" placeholder="Search roster…" />
            </div>
        </div>
        <div id="galleryLocationModal" class="feed-filter-modal" hidden role="dialog" aria-modal="true" aria-labelledby="galleryLocationModalTitle">
            <div class="feed-filter-modal__backdrop" id="galleryLocationModalBackdrop"></div>
            <div class="feed-filter-modal__dialog">
                <h2 class="feed-filter-modal__title" id="galleryLocationModalTitle">Locations</h2>
                <p class="feed-filter-modal__hint">Choose a region to filter gallery access.</p>
                <div class="feed-filter-modal__list" id="galleryLocationModalList"></div>
                <button type="button" class="feed-filter-modal__done" id="galleryLocationModalClose">Done</button>
            </div>
        </div>
    `;
}

/** @param {HTMLElement} block @param {HTMLElement} btn @param {string} allId */
function applyMultiSelect(block, btn, allId) {
    if (!block || !btn) return;
    const allBtn = block.querySelector(`#${CSS.escape(allId)}`);
    if (btn.id === allId) {
        block.querySelectorAll('.filterButton').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        return;
    }
    if (allBtn) allBtn.classList.remove('active');
    btn.classList.toggle('active');
    const anyOther = [...block.querySelectorAll('.filterButton')].some(
        (b) => b.id !== allId && b.classList.contains('active')
    );
    if (!anyOther && allBtn) {
        block.querySelectorAll('.filterButton').forEach((b) => b.classList.remove('active'));
        allBtn.classList.add('active');
    }
}

/**
 * @param {HTMLElement} host
 * @param {'artists' | 'editions' | 'gallery-access'} state
 */
function wireFilterLogic(host, state) {
    /** @type {string} */
    let searchQuery = '';
    /** @type {ReturnType<typeof setTimeout> | null} */
    let searchDebounce = null;

    const dispatch = (criteria) => {
        window.dispatchEvent(
            new CustomEvent(EVENT_NAME, {
                bubbles: true,
                composed: true,
                detail: { state, criteria },
            })
        );
    };

    const closeDropdownsOnly = () => {
        host.querySelectorAll('.filterDropdownPanel').forEach((p) => {
            p.hidden = true;
        });
    };

    const updateArtistLocationsBtn = () => {
        const btn = host.querySelector('#artistLocationsBtn');
        const k = host._artistLocationKey ?? 'all';
        if (btn) btn.textContent = locationKeyToLabel(k);
    };

    const updateGalleryLocationsBtn = () => {
        const btn = host.querySelector('#galleryLocationsBtn');
        const k = host._galleryLocationKey ?? 'all';
        if (btn) btn.textContent = locationKeyToLabel(k);
    };

    /** @param {HTMLElement | null} block @param {string} allId */
    const activateOnlyChip = (block, allId) => {
        if (!(block instanceof HTMLElement)) return;
        block.querySelectorAll('.filterButton').forEach((b) => {
            b.classList.toggle('active', b.id === allId);
        });
    };

    const resetFilterChipsToAll = () => {
        if (state === 'artists') {
            host._artistLocationKey = 'all';
            updateArtistLocationsBtn();
            if (!parseArtistsCohortPath(window.location.pathname)) {
                activateOnlyChip(host.querySelector('#connectionFilter'), 'allConnection');
            }
            activateOnlyChip(host.querySelector('#disciplineFilter'), 'allDiscipline');
        } else if (state === 'editions') {
            activateOnlyChip(host.querySelector('#editionCategoryFilter'), 'allEditionCategories');
            activateOnlyChip(host.querySelector('#connectionFilter'), 'allEditionYears');
            activateOnlyChip(host.querySelector('#disciplineFilter'), 'allEditionFormats');
        } else {
            host._galleryLocationKey = 'all';
            updateGalleryLocationsBtn();
            activateOnlyChip(host.querySelector('#connectionFilter'), 'allGallerySeason');
            activateOnlyChip(host.querySelector('#disciplineFilter'), 'allGalleryView');
        }
    };

    const closeLocationModal = () => {
        const modal = getArtistLocationModalEl();
        if (modal) {
            modal.hidden = true;
            restoreModalToHost(modal, host);
        }
        document.body.style.overflow = '';
    };

    const closeGalleryLocationModal = () => {
        const modal = getGalleryLocationModalEl();
        if (modal) {
            modal.hidden = true;
            restoreModalToHost(modal, host);
        }
        document.body.style.overflow = '';
    };

    const closeLedgerModal = () => {
        const modal = getArtistLedgerModalEl();
        if (modal) {
            modal.hidden = true;
            restoreModalToHost(modal, host);
        }
        document.body.style.overflow = '';
    };

    const closeAllModals = () => {
        closeLocationModal();
        closeGalleryLocationModal();
        closeLedgerModal();
    };

    /** @type {Map<string, number>} */
    const modalScrollTopByKey = new Map();
    let modalScrollCloseGuardUntil = 0;

    const readScrollTopForModal = (el) =>
        el === window ? window.pageYOffset || document.documentElement.scrollTop : /** @type {HTMLElement} */ (el).scrollTop;

    const resetModalScrollBaselines = () => {
        modalScrollTopByKey.clear();
        for (const el of modalScrollTargets(state)) {
            const key = el === window ? 'window' : /** @type {HTMLElement} */ (el).id || 'el';
            modalScrollTopByKey.set(key, readScrollTopForModal(el));
        }
    };

    const isAnyModalOpen = () => {
        const am = getArtistLocationModalEl();
        const gm = getGalleryLocationModalEl();
        const lm = getArtistLedgerModalEl();
        return (
            (am && !am.hidden) ||
            (gm && !gm.hidden) ||
            (lm && !lm.hidden)
        );
    };

    const closeModalsOnScroll = (el) => {
        if (performance.now() < modalScrollCloseGuardUntil) return;
        if (!isAnyModalOpen()) return;

        const key = el === window ? 'window' : /** @type {HTMLElement} */ (el).id || 'el';
        const st = readScrollTopForModal(el);
        const prev = modalScrollTopByKey.get(key);
        modalScrollTopByKey.set(key, st);
        if (prev === undefined) return;
        if (Math.abs(st - prev) < SCROLL_DELTA_PX) return;
        closeAllModals();
    };

    /** @type {{ el: Element | Window, handler: () => void }[]} */
    const modalScrollHandlers = modalScrollTargets(state).map((el) => {
        const handler = () => closeModalsOnScroll(el);
        if (el === window) window.addEventListener('scroll', handler, { passive: true });
        else /** @type {Element} */ (el).addEventListener('scroll', handler, { passive: true });
        return { el, handler };
    });

    const openModalCommon = () => {
        scrollFilterPageToTop(state);
        modalScrollCloseGuardUntil = performance.now() + 450;
        document.body.style.overflow = 'hidden';
        resetModalScrollBaselines();
    };

    const openLocationModal = () => {
        const modal = getArtistLocationModalEl();
        if (!modal) return;
        closeDropdownsOnly();
        closeGalleryLocationModal();
        closeLedgerModal();
        openModalCommon();
        portalModalToBody(modal);
        modal.hidden = false;
    };

    const openGalleryLocationModal = () => {
        const modal = getGalleryLocationModalEl();
        if (!modal) return;
        closeDropdownsOnly();
        closeLocationModal();
        closeLedgerModal();
        openModalCommon();
        portalModalToBody(modal);
        modal.hidden = false;
    };

    const openLedgerModal = () => {
        const modal = getArtistLedgerModalEl();
        if (!modal) return;
        closeDropdownsOnly();
        closeLocationModal();
        closeGalleryLocationModal();
        openModalCommon();
        portalModalToBody(modal);
        modal.hidden = false;
    };

    /** @param {string} key */
    const setLocationFromKey = (key) => {
        host._artistLocationKey = key || 'all';
        updateArtistLocationsBtn();
        closeLocationModal();
        pushDispatch();
    };

    /** @param {string} key */
    const setGalleryLocationFromKey = (key) => {
        host._galleryLocationKey = key || 'all';
        updateGalleryLocationsBtn();
        closeGalleryLocationModal();
        pushDispatch();
    };

    const onDocKeydown = (ev) => {
        if (ev.key !== 'Escape') return;
        if (isAnyModalOpen()) {
            ev.preventDefault();
            closeAllModals();
        }
    };
    document.addEventListener('keydown', onDocKeydown);

    const onDocumentClick = (e) => {
        const target = e.target;
        if (!(target instanceof Element)) return;

        if (target.closest('#artistLocationModalBackdrop') || target.closest('#artistLocationModalClose')) {
            e.preventDefault();
            closeLocationModal();
            return;
        }
        if (target.closest('#galleryLocationModalBackdrop') || target.closest('#galleryLocationModalClose')) {
            e.preventDefault();
            closeGalleryLocationModal();
            return;
        }
        if (target.closest('#artistLedgerModalBackdrop') || target.closest('#artistLedgerModalClose')) {
            e.preventDefault();
            closeLedgerModal();
            return;
        }

        const locOpt = target.closest('.feed-filter-modal__option');
        if (locOpt) {
            e.preventDefault();
            const key = locOpt.getAttribute('data-location-key') || 'all';
            if (locOpt.closest('#galleryLocationModal')) setGalleryLocationFromKey(key);
            else if (locOpt.closest('#artistLocationModal')) setLocationFromKey(key);
            return;
        }

        const ledgerLink = target.closest('.feed-filter-ledger-name');
        if (ledgerLink instanceof HTMLAnchorElement) {
            e.preventDefault();
            const href = ledgerLink.getAttribute('href') || '/profile';
            closeLedgerModal();
            navigate(href);
            return;
        }

        if (isAnyModalOpen()) {
            const am = getArtistLocationModalEl();
            const gm = getGalleryLocationModalEl();
            const lm = getArtistLedgerModalEl();
            if (
                (am && !am.hidden && am.contains(target)) ||
                (gm && !gm.hidden && gm.contains(target)) ||
                (lm && !lm.hidden && lm.contains(target))
            ) {
                return;
            }
        }

        if (!host.contains(target)) {
            closeDropdownsOnly();
            closeAllModals();
        }
    };
    document.addEventListener('click', onDocumentClick);

    host.addEventListener('click', (e) => {
        const btn = e.target.closest('.filterButton');
        if (btn && host.contains(btn)) {
            e.stopPropagation();
            closeDropdownsOnly();
            const href = btn instanceof HTMLAnchorElement ? btn.getAttribute('href') || '' : '';
            if (href.startsWith('/artists')) {
                e.preventDefault();
                applyProfileCardModeForCohortPath(href.split('?')[0] || href);
                const nextUrl = href;
                const curUrl = `${window.location.pathname || '/'}${window.location.search || ''}`;
                if (nextUrl !== curUrl) {
                    navigate(href);
                    return;
                }
            }
            const block = btn.closest('.filterButtonBlock');
            if (block?.dataset.multi === 'true') {
                applyMultiSelect(block, btn, block.dataset.allId || 'allDiscipline');
            } else if (block) {
                block.querySelectorAll('.filterButton').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
            }
            pushDispatch();
            return;
        }

        if (e.target.closest('#artistLocationsBtn')) {
            e.preventDefault();
            openLocationModal();
            return;
        }
        if (e.target.closest('#artistLedgerBtn')) {
            e.preventDefault();
            openLedgerModal();
            return;
        }
        if (e.target.closest('#galleryLocationsBtn')) {
            e.preventDefault();
            openGalleryLocationModal();
            return;
        }
    });

    const searchInput = host.querySelector('#filterSearchInput');
    if (searchInput instanceof HTMLInputElement) {
        searchInput.addEventListener('input', () => {
            if (searchDebounce) clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => {
                const next = searchInput.value.trim();
                if (next) resetFilterChipsToAll();
                searchQuery = next;
                pushDispatch();
            }, SEARCH_DEBOUNCE_MS);
        });
    }

    function collectDisciplineKeys() {
        const block = host.querySelector('#disciplineFilter');
        if (!block) return [];
        const allId = block.dataset.allId || 'allDiscipline';
        const allBtn = block.querySelector(`#${CSS.escape(allId)}`);
        if (allBtn?.classList.contains('active')) return [];
        const keys = [];
        block.querySelectorAll('.filterButton.active').forEach((b) => {
            if (b.id === allId) return;
            keys.push(disciplineButtonIdToKey(b.id));
        });
        return keys;
    }

    function collectEditionCategoryKeys() {
        const block = host.querySelector('#editionCategoryFilter');
        if (!block) return [];
        const allBtn = host.querySelector('#allEditionCategories');
        if (allBtn?.classList.contains('active')) return [];
        const keys = [];
        block.querySelectorAll('.filterButton.active').forEach((b) => {
            if (b.id === 'allEditionCategories') return;
            const k = EDITION_CAT_ID_TO_KEY[b.id];
            if (k) keys.push(k);
        });
        return keys;
    }

    function pushDispatch() {
        if (state === 'artists') {
            dispatch({
                connectionId:
                    host.querySelector('#connectionFilter .filterButton.active')?.id || 'allConnection',
                disciplineKeys: collectDisciplineKeys(),
                locationKey: host._artistLocationKey ?? 'all',
                nameQuery: searchQuery,
                cohortOptions: host._cohortOptions || [],
            });
        } else if (state === 'editions') {
            dispatch({
                yearId:
                    host.querySelector('#connectionFilter .filterButton.active')?.id || 'allEditionYears',
                formatId:
                    host.querySelector('#disciplineFilter .filterButton.active')?.id || 'allEditionFormats',
                categoryKeys: collectEditionCategoryKeys(),
                titleQuery: searchQuery,
            });
        } else {
            dispatch({
                locationKey: host._galleryLocationKey ?? 'all',
                seasonId:
                    host.querySelector('#connectionFilter .filterButton.active')?.id || 'allGallerySeason',
                viewId:
                    host.querySelector('#disciplineFilter .filterButton.active')?.id || 'allGalleryView',
                nameQuery: searchQuery,
            });
        }
    }

    host._pushFeedFilter = pushDispatch;
    host._cleanupFeedFilter = () => {
        document.removeEventListener('keydown', onDocKeydown);
        document.removeEventListener('click', onDocumentClick);
        if (searchDebounce) clearTimeout(searchDebounce);
        for (const { el, handler } of modalScrollHandlers) {
            if (el === window) window.removeEventListener('scroll', handler);
            else /** @type {Element} */ (el).removeEventListener('scroll', handler);
        }
    };

    updateArtistLocationsBtn();
    updateGalleryLocationsBtn();
}

/** @param {object[]} artists */
function renderArtistFilterChips(host, artists) {
    const avail = buildArtistFilterAvailability(artists);
    const programs = Array.isArray(host._rosterPrograms) ? host._rosterPrograms : [];
    const cohortOptions = buildArtistCohortFilterOptions({ programs, artists });
    host._cohortOptions = cohortOptions;
    const selected = matchArtistCohortOption(cohortOptions, window.location.pathname);

    const conn = host.querySelector('#connectionFilter');
    if (conn) {
        /** @type {string[]} */
        const chips = [chipLink('allConnection', 'All', '/artists', !selected)];
        if (avail.connectionIds.includes('alumniConnection')) {
            chips.push(chipLink('alumniConnection', 'Alumni', '/artists?connection=alumni'));
        }
        if (avail.connectionIds.includes('userConnection')) {
            chips.push(chipLink('userConnection', 'Artists', '/artists?connection=artists'));
        }
        if (avail.connectionIds.includes('drawRecipientsConnection')) {
            chips.push(chipLink('drawRecipientsConnection', 'Draw Recipients', '/artists?connection=drawRecipients'));
        }
        for (const opt of cohortOptions) {
            chips.push(chipLink(opt.chipId, opt.label, opt.href, selected?.slug === opt.slug));
        }
        conn.innerHTML = chips.join('');
    }

    const disc = host.querySelector('#disciplineFilter');
    if (disc) {
        const chips = [chipButton('allDiscipline', 'All', true)];
        for (const opt of DISCIPLINE_OPTIONS) {
            if (avail.disciplineKeys.includes(opt.key)) {
                chips.push(chipButton(`${opt.key}Discipline`, opt.label));
            }
        }
        disc.innerHTML = chips.join('');
    }

    const list = host.querySelector('#artistLocationModalList');
    if (list) list.innerHTML = locationModalOptionsHtml(avail.locationKeys);

    const ledger = host.querySelector('#artistLedgerList');
    if (ledger) {
        const sorted = [...(artists || [])].sort((a, b) => {
            const na = String(artistEnglishBlock(a)?.name || '');
            const nb = String(artistEnglishBlock(b)?.name || '');
            return na.localeCompare(nb, undefined, { sensitivity: 'base' });
        });
        ledger.innerHTML = sorted
            .map((a) => {
                const name = String(artistEnglishBlock(a)?.name || 'Artist');
                const slug = artistProfileSlug(a);
                if (!slug) return '';
                return `<a class="feed-filter-ledger-name" href="/profile/${encodeURIComponent(slug)}">${escHtml(name)}</a>`;
            })
            .filter(Boolean)
            .join('');
    }
}

/** @param {object[]} items */
function renderEditionFilterChips(host, items) {
    const avail = buildEditionFilterAvailability(items);

    const cat = host.querySelector('#editionCategoryFilter');
    if (cat) {
        const chips = [chipButton('allEditionCategories', 'All', true)];
        for (const opt of EDITION_CATEGORY_OPTIONS) {
            if (opt.key === 'all') continue;
            if (avail.categoryKeys.includes(opt.key)) {
                const id =
                    opt.key === 'series'
                        ? 'editionCatSeries'
                        : opt.key === 'monograph'
                          ? 'editionCatMonograph'
                          : opt.key === 'portfolio'
                            ? 'editionCatPortfolio'
                            : 'editionCatOther';
                chips.push(chipButton(id, opt.label));
            }
        }
        cat.innerHTML = chips.join('');
    }

    const year = host.querySelector('#connectionFilter');
    if (year) {
        const chips = [chipButton('allEditionYears', 'All', true)];
        for (const id of avail.yearIds) {
            if (id === 'editionArchive') chips.push(chipButton(id, 'Archive'));
            else {
                const y = String(id).replace(/\D/g, '');
                if (y) chips.push(chipButton(id, y));
            }
        }
        year.innerHTML = chips.join('');
    }

    const fmt = host.querySelector('#disciplineFilter');
    if (fmt) {
        const chips = [chipButton('allEditionFormats', 'All', true)];
        for (const id of avail.formatIds) {
            chips.push(chipButton(id, EDITION_FORMAT_LABELS[id] || id));
        }
        fmt.innerHTML = chips.join('');
    }
}

/** @param {object[]} artists */
function renderGalleryFilterChips(host, artists) {
    const avail = buildGalleryFilterAvailability(artists);

    const list = host.querySelector('#galleryLocationModalList');
    if (list) list.innerHTML = locationModalOptionsHtml(avail.locationKeys);

    const season = host.querySelector('#connectionFilter');
    if (season) {
        const chips = [chipButton('allGallerySeason', 'All', true)];
        for (const id of avail.seasonIds) {
            const y = String(id).replace(/\D/g, '');
            if (y) chips.push(chipButton(id, y));
        }
        season.innerHTML = chips.join('');
    }

    const view = host.querySelector('#disciplineFilter');
    if (view) {
        const chips = [chipButton('allGalleryView', 'All', true)];
        for (const id of avail.viewIds) {
            chips.push(chipButton(id, GALLERY_VIEW_LABELS[id] || id));
        }
        view.innerHTML = chips.join('');
    }
}

class FeedFilterComponent extends HTMLElement {
    constructor() {
        super();
        this._wired = false;
        this._artistLocationKey = 'all';
        this._galleryLocationKey = 'all';
        /** @type {object[] | null} */
        this._rosterArtists = null;
        /** @type {object[] | null} */
        this._rosterPrograms = null;
        /** @type {object[]} */
        this._cohortOptions = [];
        /** @type {object[] | null} */
        this._rosterEditions = null;
    }

    static get observedAttributes() {
        return ['state'];
    }

    disconnectedCallback() {
        document.body.style.overflow = '';
        for (const id of ['artistLocationModal', 'galleryLocationModal', 'artistLedgerModal']) {
            const modal = document.getElementById(id);
            if (modal) modal.remove();
        }
        if (typeof this._cleanupFeedFilter === 'function') {
            this._cleanupFeedFilter();
            this._cleanupFeedFilter = null;
        }
    }

    /**
     * @param {{ state?: string, artists?: object[], editions?: object[], programs?: object[] }} detail
     */
    hydrateFilterData(detail) {
        const state = (detail?.state || this.getAttribute('state') || 'artists').trim();
        if (state === 'artists' && Array.isArray(detail?.artists)) {
            this._rosterArtists = detail.artists;
            if (Array.isArray(detail?.programs)) this._rosterPrograms = detail.programs;
            renderArtistFilterChips(this, detail.artists);
            try {
                const params = new URLSearchParams(window.location.search || '');
                const connection = String(params.get('connection') || '').trim();
                const connectionChipId =
                    connection === 'drawRecipients'
                        ? 'drawRecipientsConnection'
                        : connection === 'alumni'
                          ? 'alumniConnection'
                          : connection === 'artists'
                            ? 'userConnection'
                            : '';
                if (connectionChipId && !parseArtistsCohortPath(window.location.pathname)) {
                    const conn = this.querySelector('#connectionFilter');
                    const chip = conn?.querySelector(`#${CSS.escape(connectionChipId)}`);
                    if (chip instanceof HTMLElement) {
                        conn?.querySelectorAll('.filterButton').forEach((b) => {
                            b.classList.toggle('active', b.id === connectionChipId);
                        });
                    }
                }
            } catch {
                /* ignore */
            }
        } else if (state === 'editions' && Array.isArray(detail?.editions)) {
            this._rosterEditions = detail.editions;
            renderEditionFilterChips(this, detail.editions);
        } else if (state === 'gallery-access' && Array.isArray(detail?.artists)) {
            this._rosterArtists = detail.artists;
            renderGalleryFilterChips(this, detail.artists);
        }
        if (typeof this._pushFeedFilter === 'function') {
            this._pushFeedFilter();
        }
        queueMicrotask(() => syncSoundEnvironmentPosition(window.location.pathname));
    }

    connectedCallback() {
        if (this._wired) return;
        this._wired = true;

        const raw = (this.getAttribute('state') || 'artists').trim();
        let template;
        let scrollRootId;
        /** @type {'artists' | 'editions' | 'gallery-access'} */
        let filterState;
        if (raw === 'editions') {
            template = templateEditionsSkeleton();
            scrollRootId = 'editionsMainContent';
            filterState = 'editions';
        } else if (raw === 'gallery-access') {
            template = templateGalleryAccessSkeleton();
            scrollRootId = 'galleryAccessMainContent';
            filterState = 'gallery-access';
        } else {
            template = templateArtistsSkeleton();
            scrollRootId = 'artistsMainContent';
            filterState = 'artists';
        }
        this.innerHTML = template;

        wireFilterLogic(this, filterState);
        queueMicrotask(() => {
            setupFilterSystemAndScrollCollapse(scrollRootId, this);
            syncSoundEnvironmentPosition(window.location.pathname);
        });
    }
}

customElements.define('app-feed-filter', FeedFilterComponent);

export { FeedFilterComponent };
