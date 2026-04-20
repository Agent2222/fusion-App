/**
 * Sticky expandable filter bar for Artists, Editions, and Gallery Access.
 * Use `state="artists" | "editions" | "gallery-access"`; scroll-collapse targets the matching scroll root.
 * Dispatches `fusion-feed-filter` with criteria; pages apply filters to feeds (see `utils/feedFilterApply.js`).
 */
import { ARTIST_LOCATION_OPTIONS, disciplineButtonIdToKey } from '../../utils/feedFilterApply.js';

const SCROLL_DELTA_PX = 4;
const SCROLL_COLLAPSE_IGNORE_AFTER_OPEN_MS = 550;

const EVENT_NAME = 'fusion-feed-filter';

const EDITION_CAT_ID_TO_KEY = {
    editionCatSeries: 'series',
    editionCatMonograph: 'monograph',
    editionCatPortfolio: 'portfolio',
    editionCatOther: 'other',
};

function setupFilterSystemAndScrollCollapse(scrollRootId) {
    const filterSystem = document.getElementById('filterSystem');
    const filterToggle = document.getElementById('filterToggle');
    if (!filterSystem || !filterToggle) return;

    const lastScrollTopById = {};
    let ignoreScrollCollapseUntil = 0;

    const scrollPairs = () =>
        [
            [scrollRootId, document.getElementById(scrollRootId)],
            ['mainContent', document.getElementById('mainContent')],
            ['window', window],
        ].filter(([, node]) => node);

    const readScrollTop = (el) =>
        el === window ? window.pageYOffset || document.documentElement.scrollTop : el.scrollTop;

    const syncScrollBaselines = () => {
        for (const [id, el] of scrollPairs()) {
            lastScrollTopById[id] = readScrollTop(el);
        }
    };

    const beginIgnoreScrollCollapseAfterOpen = () => {
        ignoreScrollCollapseUntil = performance.now() + SCROLL_COLLAPSE_IGNORE_AFTER_OPEN_MS;
        syncScrollBaselines();
    };

    const collapseFilterIfActive = () => {
        if (!filterSystem.classList.contains('active')) return;
        filterSystem.classList.remove('active');
        setTimeout(() => filterToggle.classList.remove('active'), 300);
    };

    filterToggle.addEventListener('click', () => {
        filterSystem.classList.toggle('active');
        if (filterSystem.classList.contains('active')) {
            filterToggle.classList.add('active');
            beginIgnoreScrollCollapseAfterOpen();
        } else {
            setTimeout(() => filterToggle.classList.remove('active'), 300);
        }
    });

    const handleScroll = (el, id) => {
        const st = readScrollTop(el);
        const now = performance.now();

        if (now < ignoreScrollCollapseUntil) {
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
        if (delta > 0) {
            collapseFilterIfActive();
        }
    };

    for (const [id, el] of scrollPairs()) {
        if (id === 'window') {
            window.addEventListener('scroll', () => handleScroll(window, 'window'), { passive: true });
        } else {
            el.addEventListener('scroll', () => handleScroll(el, id), { passive: true });
        }
    }

    syncScrollBaselines();

    if (filterSystem.classList.contains('active')) {
        beginIgnoreScrollCollapseAfterOpen();
    }
}

function locationModalOptionsHtml() {
    const allBtn = `<button type="button" class="feed-filter-modal__option feed-filter-modal__option--all" data-location-key="all">All Locations</button>`;
    const rest = ARTIST_LOCATION_OPTIONS.filter((o) => o.key !== 'all')
        .map(
            (o) =>
                `<button type="button" class="feed-filter-modal__option" data-location-key="${o.key}">${o.label}</button>`
        )
        .join('');
    return allBtn + rest;
}

function templateArtists() {
    return `
        <div id="filterSystem" class="main-cont active">
            <div id="filterToggle" class="active">Filter Artists</div>
            <div id="filterContent">
                <div id="leftFilter" class="filterBlock">
                    <div id="locationFilter">
                        <div class="filterLocationTextBlock" role="button" tabindex="0" aria-expanded="false" aria-haspopup="dialog" id="artistLocationTrigger">
                            <div class="filterLocationText" id="artistLocationLabel">All Locations</div>
                            <div class="filterArrow" id="artistLocationArrow">></div>
                        </div>
                    </div>
                </div>
                <div id="middleFilter" class="filterBlock centerFilterBlock">
                    <div id="connectionFilter" class="filterButtonBlock" data-filter-group="connection">
                        <div class="filterButton active" id="allConnection" data-filter-group="connection">All</div>
                        <div class="filterButton" id="alumniConnection" data-filter-group="connection">Alumni</div>
                        <div class="filterButton" id="userConnection" data-filter-group="connection">Artists</div>
                        <div class="filterButton" id="2017CohortConnection" data-filter-group="connection">2017</div>
                        <div class="filterButton" id="2018CohortConnection" data-filter-group="connection">2018</div>
                        <div class="filterButton" id="2019CohortConnection" data-filter-group="connection">2019</div>
                        <div class="filterButton" id="2024CohortConnection" data-filter-group="connection">2024</div>
                        <div class="filterButton" id="2025CohortConnection" data-filter-group="connection">2025</div>
                        <div class="filterButton" id="2026CohortConnection" data-filter-group="connection">2026</div>
                    </div>
                </div>
                <div id="rightFilter" class="filterBlock">
                    <div id="disciplineFilter" class="filterButtonBlock filterButtonBlock--multi" data-multi="true" data-all-id="allDiscipline">
                        <div class="filterButton active" id="allDiscipline">All</div>
                        <div class="filterButton" id="sculptureDiscipline">Sculpture</div>
                        <div class="filterButton" id="paintingDiscipline">Painting</div>
                        <div class="filterButton" id="installationDiscipline">Installation</div>
                        <div class="filterButton" id="performanceDiscipline">Performance</div>
                        <div class="filterButton" id="videoDiscipline">Film/Video</div>
                        <div class="filterButton" id="performanceArtDiscipline">Performance Art</div>
                        <div class="filterButton" id="soundDiscipline">Sound</div>
                        <div class="filterButton" id="illustrationDiscipline">Illustration</div>
                        <div class="filterButton" id="photographyDiscipline">Photography</div>
                        <div class="filterButton" id="mixedMediaDiscipline">Mixed Media</div>
                        <div class="filterButton" id="otherDiscipline">Other</div>
                    </div>
                </div>
            </div>
        </div>
        <div id="artistLocationModal" class="feed-filter-modal" hidden role="dialog" aria-modal="true" aria-labelledby="artistLocationModalTitle">
            <div class="feed-filter-modal__backdrop" id="artistLocationModalBackdrop"></div>
            <div class="feed-filter-modal__dialog">
                <h2 class="feed-filter-modal__title" id="artistLocationModalTitle">Locations</h2>
                <p class="feed-filter-modal__hint">Choose a region to filter the roster.</p>
                <div class="feed-filter-modal__list">${locationModalOptionsHtml()}</div>
                <button type="button" class="feed-filter-modal__done" id="artistLocationModalClose">Done</button>
            </div>
        </div>
    `;
}

function templateEditions() {
    return `
        <div id="filterSystem" class="main-cont">
            <div id="filterToggle">Filter Editions</div>
            <div id="filterContent">
                <div id="leftFilter" class="filterBlock">
                    <div id="editionCategoryFilter" class="filterButtonBlock filterButtonBlock--multi filterButtonBlock--compact" data-multi="true" data-all-id="allEditionCategories">
                        <div class="filterButton active" id="allEditionCategories">All</div>
                        <div class="filterButton" id="editionCatSeries">Series</div>
                        <div class="filterButton" id="editionCatMonograph">Monograph</div>
                        <div class="filterButton" id="editionCatPortfolio">Portfolio</div>
                        <div class="filterButton" id="editionCatOther">Other</div>
                    </div>
                </div>
                <div id="middleFilter" class="filterBlock centerFilterBlock">
                    <div id="connectionFilter" class="filterButtonBlock" data-filter-group="editionYear">
                        <div class="filterButton active" id="allEditionYears" data-filter-group="editionYear">All</div>
                        <div class="filterButton" id="edition2024" data-filter-group="editionYear">2024</div>
                        <div class="filterButton" id="edition2025" data-filter-group="editionYear">2025</div>
                        <div class="filterButton" id="edition2026" data-filter-group="editionYear">2026</div>
                        <div class="filterButton" id="editionArchive" data-filter-group="editionYear">Archive</div>
                    </div>
                </div>
                <div id="rightFilter" class="filterBlock">
                    <div id="disciplineFilter" class="filterButtonBlock" data-filter-group="editionFormat">
                        <div class="filterButton active" id="allEditionFormats" data-filter-group="editionFormat">All</div>
                        <div class="filterButton" id="formatPrint" data-filter-group="editionFormat">Print</div>
                        <div class="filterButton" id="formatMultiple" data-filter-group="editionFormat">Multiple</div>
                        <div class="filterButton" id="formatBook" data-filter-group="editionFormat">Book</div>
                        <div class="filterButton" id="formatObject" data-filter-group="editionFormat">Object</div>
                        <div class="filterButton" id="formatDigital" data-filter-group="editionFormat">Digital</div>
                        <div class="filterButton" id="formatOther" data-filter-group="editionFormat">Other</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function templateGalleryAccess() {
    return `
        <div id="filterSystem" class="main-cont">
            <div id="filterToggle">Filter Gallery Access</div>
            <div id="filterContent">
                <div id="leftFilter" class="filterBlock">
                    <div id="galleryLocationWrap">
                        <div class="filterLocationTextBlock" role="button" tabindex="0" aria-expanded="false" aria-haspopup="dialog" id="galleryLocationTrigger">
                            <div class="filterLocationText" id="galleryLocationLabel">All Locations</div>
                            <div class="filterArrow" id="galleryLocationArrow">></div>
                        </div>
                    </div>
                </div>
                <div id="middleFilter" class="filterBlock centerFilterBlock">
                    <div id="connectionFilter" class="filterButtonBlock" data-filter-group="gallerySeason">
                        <div class="filterButton active" id="allGallerySeason" data-filter-group="gallerySeason">All</div>
                        <div class="filterButton" id="gallerySeason2024" data-filter-group="gallerySeason">2024</div>
                        <div class="filterButton" id="gallerySeason2025" data-filter-group="gallerySeason">2025</div>
                        <div class="filterButton" id="gallerySeason2026" data-filter-group="gallerySeason">2026</div>
                    </div>
                </div>
                <div id="rightFilter" class="filterBlock">
                    <div id="disciplineFilter" class="filterButtonBlock" data-filter-group="galleryView">
                        <div class="filterButton active" id="allGalleryView" data-filter-group="galleryView">All</div>
                        <div class="filterButton" id="galleryPreview" data-filter-group="galleryView">Preview</div>
                        <div class="filterButton" id="galleryOpening" data-filter-group="galleryView">Opening</div>
                        <div class="filterButton" id="galleryArchive" data-filter-group="galleryView">Archive</div>
                    </div>
                </div>
            </div>
        </div>
        <div id="galleryLocationModal" class="feed-filter-modal" hidden role="dialog" aria-modal="true" aria-labelledby="galleryLocationModalTitle">
            <div class="feed-filter-modal__backdrop" id="galleryLocationModalBackdrop"></div>
            <div class="feed-filter-modal__dialog">
                <h2 class="feed-filter-modal__title" id="galleryLocationModalTitle">Locations</h2>
                <p class="feed-filter-modal__hint">Choose a region to filter gallery access.</p>
                <div class="feed-filter-modal__list">${locationModalOptionsHtml()}</div>
                <button type="button" class="feed-filter-modal__done" id="galleryLocationModalClose">Done</button>
            </div>
        </div>
    `;
}

/**
 * @param {HTMLElement} block
 * @param {string} allId
 */
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

    const closeLocationModal = () => {
        const modal = host.querySelector('#artistLocationModal');
        const arrow = host.querySelector('#artistLocationArrow');
        const trig = host.querySelector('#artistLocationTrigger');
        if (modal) modal.hidden = true;
        if (arrow) arrow.classList.remove('active');
        if (trig) {
            trig.setAttribute('aria-expanded', 'false');
        }
        document.body.style.overflow = '';
    };

    const closeGalleryLocationModal = () => {
        const modal = host.querySelector('#galleryLocationModal');
        const arrow = host.querySelector('#galleryLocationArrow');
        const trig = host.querySelector('#galleryLocationTrigger');
        if (modal) modal.hidden = true;
        if (arrow) arrow.classList.remove('active');
        if (trig) trig.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    };

    const openLocationModal = () => {
        const modal = host.querySelector('#artistLocationModal');
        const arrow = host.querySelector('#artistLocationArrow');
        const trig = host.querySelector('#artistLocationTrigger');
        if (!modal) return;
        closeDropdownsOnly();
        closeGalleryLocationModal();
        modal.hidden = false;
        if (arrow) arrow.classList.add('active');
        if (trig) trig.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    };

    const openGalleryLocationModal = () => {
        const modal = host.querySelector('#galleryLocationModal');
        const arrow = host.querySelector('#galleryLocationArrow');
        const trig = host.querySelector('#galleryLocationTrigger');
        if (!modal) return;
        closeDropdownsOnly();
        closeLocationModal();
        modal.hidden = false;
        if (arrow) arrow.classList.add('active');
        if (trig) trig.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    };

    /** @param {string} key */
    const setLocationFromKey = (key) => {
        const k = key || 'all';
        host._artistLocationKey = k;
        const label =
            ARTIST_LOCATION_OPTIONS.find((o) => o.key === k)?.label || 'All Locations';
        const lbl = host.querySelector('#artistLocationLabel');
        if (lbl) lbl.textContent = label;
        closeLocationModal();
        pushDispatch();
    };

    /** @param {string} key */
    const setGalleryLocationFromKey = (key) => {
        const k = key || 'all';
        host._galleryLocationKey = k;
        const label =
            ARTIST_LOCATION_OPTIONS.find((o) => o.key === k)?.label || 'All Locations';
        const lbl = host.querySelector('#galleryLocationLabel');
        if (lbl) lbl.textContent = label;
        closeGalleryLocationModal();
        pushDispatch();
    };

    const onDocKeydown = (ev) => {
        if (ev.key === 'Escape') {
            const am = host.querySelector('#artistLocationModal');
            const gm = host.querySelector('#galleryLocationModal');
            if (am && !am.hidden) {
                ev.preventDefault();
                closeLocationModal();
            } else if (gm && !gm.hidden) {
                ev.preventDefault();
                closeGalleryLocationModal();
            }
        }
    };
    document.addEventListener('keydown', onDocKeydown);

    host.addEventListener('click', (e) => {
        const modalBackdrop = e.target.closest('#artistLocationModalBackdrop');
        const modalClose = e.target.closest('#artistLocationModalClose');
        if (modalBackdrop || modalClose) {
            e.preventDefault();
            closeLocationModal();
            return;
        }

        const galleryBackdrop = e.target.closest('#galleryLocationModalBackdrop');
        const galleryClose = e.target.closest('#galleryLocationModalClose');
        if (galleryBackdrop || galleryClose) {
            e.preventDefault();
            closeGalleryLocationModal();
            return;
        }

        const locOpt = e.target.closest('.feed-filter-modal__option');
        if (locOpt && host.contains(locOpt)) {
            e.preventDefault();
            const key = locOpt.getAttribute('data-location-key') || 'all';
            if (locOpt.closest('#galleryLocationModal')) {
                setGalleryLocationFromKey(key);
            } else {
                setLocationFromKey(key);
            }
            return;
        }

        const btn = e.target.closest('.filterButton');
        if (btn && host.contains(btn)) {
            e.stopPropagation();
            closeDropdownsOnly();
            const block = btn.closest('.filterButtonBlock');
            if (block?.dataset.multi === 'true') {
                const allId = block.dataset.allId || 'allDiscipline';
                applyMultiSelect(block, btn, allId);
            } else if (block) {
                block.querySelectorAll('.filterButton').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
            }
            pushDispatch();
            return;
        }

        const trig = e.target.closest('#artistLocationTrigger');
        if (trig && host.contains(trig)) {
            e.preventDefault();
            e.stopPropagation();
            const modal = host.querySelector('#artistLocationModal');
            const open = modal && modal.hidden;
            if (open) openLocationModal();
            else closeLocationModal();
            return;
        }

        const gltrig = e.target.closest('#galleryLocationTrigger');
        if (gltrig && host.contains(gltrig)) {
            e.preventDefault();
            e.stopPropagation();
            const modal = host.querySelector('#galleryLocationModal');
            const open = modal && modal.hidden;
            if (open) openGalleryLocationModal();
            else closeGalleryLocationModal();
            return;
        }
    });

    document.addEventListener('click', (ev) => {
        if (!host.contains(ev.target)) {
            closeDropdownsOnly();
            const modal = host.querySelector('#artistLocationModal');
            if (modal && !modal.hidden) closeLocationModal();
            const gmodal = host.querySelector('#galleryLocationModal');
            if (gmodal && !gmodal.hidden) closeGalleryLocationModal();
        }
    });

    function collectDisciplineKeys() {
        const block = host.querySelector('#disciplineFilter');
        if (!block) return [];
        const allId = block.dataset.allId || 'allDiscipline';
        const allBtn = host.querySelector(`#${CSS.escape(allId)}`);
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
            const conn =
                host.querySelector('#connectionFilter .filterButton.active')?.id || 'allConnection';
            const loc = host._artistLocationKey ?? 'all';
            dispatch({
                connectionId: conn,
                disciplineKeys: collectDisciplineKeys(),
                locationKey: loc,
            });
        } else if (state === 'editions') {
            const year =
                host.querySelector('#connectionFilter .filterButton.active')?.id || 'allEditionYears';
            const fmt =
                host.querySelector('#disciplineFilter .filterButton.active')?.id || 'allEditionFormats';
            dispatch({
                yearId: year,
                formatId: fmt,
                categoryKeys: collectEditionCategoryKeys(),
            });
        } else {
            const season =
                host.querySelector('#connectionFilter .filterButton.active')?.id || 'allGallerySeason';
            const view =
                host.querySelector('#disciplineFilter .filterButton.active')?.id || 'allGalleryView';
            const loc = host._galleryLocationKey ?? 'all';
            dispatch({
                locationKey: loc,
                seasonId: season,
                viewId: view,
            });
        }
    }

    host._pushFeedFilter = pushDispatch;
    host._cleanupFeedFilter = () => {
        document.removeEventListener('keydown', onDocKeydown);
    };
}

class FeedFilterComponent extends HTMLElement {
    constructor() {
        super();
        this._wired = false;
        this._artistLocationKey = 'all';
        this._galleryLocationKey = 'all';
    }

    static get observedAttributes() {
        return ['state'];
    }

    disconnectedCallback() {
        document.body.style.overflow = '';
        const modal = this.querySelector('#artistLocationModal');
        if (modal) modal.hidden = true;
        const arrow = this.querySelector('#artistLocationArrow');
        if (arrow) arrow.classList.remove('active');
        const gmodal = this.querySelector('#galleryLocationModal');
        if (gmodal) gmodal.hidden = true;
        const garrow = this.querySelector('#galleryLocationArrow');
        if (garrow) garrow.classList.remove('active');
        if (typeof this._cleanupFeedFilter === 'function') {
            this._cleanupFeedFilter();
            this._cleanupFeedFilter = null;
        }
    }

    connectedCallback() {
        if (this._wired) return;
        this._wired = true;

        const raw = (this.getAttribute('state') || 'artists').trim();
        let template;
        /** @type {string} */
        let scrollRootId;
        /** @type {'artists' | 'editions' | 'gallery-access'} */
        let filterState;
        if (raw === 'editions') {
            template = templateEditions();
            scrollRootId = 'editionsMainContent';
            filterState = 'editions';
        } else if (raw === 'gallery-access') {
            template = templateGalleryAccess();
            scrollRootId = 'galleryAccessMainContent';
            filterState = 'gallery-access';
        } else {
            template = templateArtists();
            scrollRootId = 'artistsMainContent';
            filterState = 'artists';
        }
        this.innerHTML = template;

        wireFilterLogic(this, filterState);
        queueMicrotask(() => setupFilterSystemAndScrollCollapse(scrollRootId));
    }
}

customElements.define('app-feed-filter', FeedFilterComponent);

export { FeedFilterComponent };
