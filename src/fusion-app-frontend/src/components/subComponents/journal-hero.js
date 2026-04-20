import { navigate } from '../../router.js';
import { mergeLocaleDeep, firstNonEmptyString } from '../../utils/localeFallback.js';
import { escapeHtml, previewPlainText } from '../../utils/textPreview.js';

// Placeholder — structure, content, and styles TBD
class JournalHeroComponent extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        this.data = null;
        this._slideCount = 0;
        this._activeIndex = 0;
        this._scrollRaf = null;
        /** @type {null | (() => void)} */
        this._teardownPagination = null;
    }

    get active() {
        return this.getAttribute('active') || false;
    }

    set active(val) {
        const next = val === true || val === 'true' ? 'true' : 'false';
        if (this.getAttribute('active') === next) return;
        this.setAttribute('active', next);
    }

    setJournalHero(data) {
        this.data = data;
        this.render();
    }

    getJournalHero() {
        return this.data;
    }

    static get observedAttributes() {
        return ['active'];
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if (prop === 'active') {
            if (oldVal === newVal) return;
            this.render();
        }
    }

    createJournals() {
        if (!this.data?.journals?.length) return;

        const journals = this.data.journals;
        const count = Math.min(3, journals.length);
        const contentEl = this.shadowRoot.querySelector('.content');
        const dotContainer = this.shadowRoot.querySelector('.journal-pagination-dot-container');
        if (!contentEl || !dotContainer) return;

        if (typeof this._teardownPagination === 'function') {
            this._teardownPagination();
            this._teardownPagination = null;
        }

        contentEl.innerHTML = '';
        dotContainer.innerHTML = '';

        this._slideCount = count;
        this._activeIndex = 0;

        const loc = typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';

        for (let i = 0; i < count; i++) {
            const row = journals[i];
            const en = row.en && typeof row.en === 'object' ? row.en : {};
            const ja = row.ja && typeof row.ja === 'object' ? row.ja : {};
            const slice =
                loc === 'ja'
                    ? /** @type {Record<string, unknown>} */ (mergeLocaleDeep(en, ja))
                    : /** @type {Record<string, unknown>} */ (en);
            const journalImage = firstNonEmptyString(row.imageSrc, ja?.imageSrc, en?.imageSrc);
            const journalTitle = slice.title ?? '';
            const journalDescription = previewPlainText(slice.description ?? '', 250);
            const journalLink = row.link || '#';

            const journalCard = document.createElement('div');
            journalCard.classList.add('journal-card');
            journalCard.setAttribute('data-slide-index', String(i));
            journalCard.innerHTML = `
                <div class="left-content">
                    <div class="left-content-container">
                        <div class="left-content-allEntriesLink">
                            <div class="left-content-allEntriesLink-text">
                                <a href="/journal">All Entries</a>
                            </div>
                        </div>
                        <div class="left-content-title">${escapeHtml(journalTitle)}</div>
                        <div class="left-content-description">${escapeHtml(journalDescription)}</div>
                        <div class="programCTA">
                            <a class="ctaButton" href="${escapeHtml(journalLink)}">Read Entry</a>
                        </div>
                    </div>
                </div>
                <div class="right-content">
                    <img class="journal-card-image" src="${escapeHtml(journalImage)}" alt="${escapeHtml(slice.imageAlt ?? journalTitle)}">
                </div>
            `;

            contentEl.appendChild(journalCard);
        }

        for (let i = 0; i < count; i++) {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'journal-pagination-dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('aria-label', `Journal entry ${i + 1} of ${count}`);
            dot.setAttribute('aria-current', i === 0 ? 'true' : 'false');
            dot.addEventListener('click', () => this._goToSlide(i));
            dotContainer.appendChild(dot);
        }

        this._bindPagination(contentEl);
    }

    _setActiveDot(index) {
        const dots = this.shadowRoot.querySelectorAll('.journal-pagination-dot');
        this._activeIndex = Math.max(0, Math.min(index, dots.length - 1));
        dots.forEach((d, i) => {
            const on = i === this._activeIndex;
            d.classList.toggle('active', on);
            d.setAttribute('aria-current', on ? 'true' : 'false');
        });
    }

    _syncDotsFromScroll(contentEl) {
        if (!contentEl || !this._slideCount) return;
        const w = contentEl.clientWidth;
        if (!w) return;
        let index = Math.round(contentEl.scrollLeft / w);
        index = Math.max(0, Math.min(this._slideCount - 1, index));
        this._setActiveDot(index);
    }

    _goToSlide(index) {
        const contentEl = this.shadowRoot.querySelector('.content');
        if (!contentEl || index < 0 || index >= this._slideCount) return;
        const w = contentEl.clientWidth;
        contentEl.scrollTo({ left: index * w, behavior: 'smooth' });
        this._setActiveDot(index);
    }

    _bindPagination(contentEl) {
        const onScroll = () => {
            if (this._scrollRaf) cancelAnimationFrame(this._scrollRaf);
            this._scrollRaf = requestAnimationFrame(() => {
                this._scrollRaf = null;
                this._syncDotsFromScroll(contentEl);
            });
        };

        const onScrollEnd = () => {
            this._syncDotsFromScroll(contentEl);
        };

        const onResize = () => {
            if (!this._slideCount) return;
            const w = contentEl.clientWidth;
            if (!w) return;
            const i = Math.max(0, Math.min(this._slideCount - 1, this._activeIndex));
            contentEl.scrollLeft = i * w;
        };

        contentEl.addEventListener('scroll', onScroll, { passive: true });
        contentEl.addEventListener('scrollend', onScrollEnd);
        window.addEventListener('resize', onResize);

        this._teardownPagination = () => {
            contentEl.removeEventListener('scroll', onScroll);
            contentEl.removeEventListener('scrollend', onScrollEnd);
            window.removeEventListener('resize', onResize);
            if (this._scrollRaf) {
                cancelAnimationFrame(this._scrollRaf);
                this._scrollRaf = null;
            }
        };
    }

    connectedCallback() {
        this.render();
        if (!this._journalNavBound) {
            this._journalNavBound = true;
            this.shadow.addEventListener('click', (e) => {
                const a = e.target.closest?.('a[href^="/"]');
                if (!a) return;
                e.preventDefault();
                navigate(a.getAttribute('href'));
            });
        }
    }

    disconnectedCallback() {
        if (typeof this._teardownPagination === 'function') {
            this._teardownPagination();
            this._teardownPagination = null;
        }
    }

    render() {
        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                }

                .journal-hero {
                    width: 100%;
                    height: calc(100vh - 150px);
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 8% 84% 8%;
                    padding-top: 50px;
                    padding-bottom: 100px;
                    overflow: hidden;
                    justify-items: center;
                    align-items: center;
                }

                .header {
                    width: 98%;
                    height: 100%;
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 1fr;
                    font-size: 1.4rem;
                    font-variation-settings: var(--fv-display);
                    padding-left: 2%;
                    user-select: none;
                }

                .content {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: row;
                    flex-wrap: nowrap;
                    align-items: stretch;
                    overflow-x: auto;
                    overflow-y: hidden;
                    scroll-snap-type: x mandatory;
                    scroll-behavior: smooth;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: thin;
                    scrollbar-color: var(--c2) transparent;
                }

                .content::-webkit-scrollbar {
                    height: 4px;
                }

                .content::-webkit-scrollbar-track {
                    background: transparent;
                    height: 4px;
                }

                .content::-webkit-scrollbar-thumb {
                    height: 4px;
                    background-color: var(--c2);
                    border-radius: 4px;
                }

                .left-content {
                    width: 95%;
                    height: 100%;
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 1fr;
                    justify-content: center;
                    align-items: center;
                    padding-left: 5%;
                }   

                .right-content {
                    width: 100%;
                    height: 100%;
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 1fr;
                    justify-content: center;
                    align-items: center;
                }

                .journal-card {
                    flex: 0 0 100%;
                    min-width: 100%;
                    width: 100%;
                    height: 100%;
                    box-sizing: border-box;
                    display: grid;
                    grid-template-columns: 40% 60%;
                    grid-template-rows: 1fr;
                    overflow: hidden;
                    scroll-snap-align: start;
                    scroll-snap-stop: always;
                }

                .right-content img,
                img.journal-card-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                }

                #journal-paginationDots {
                    width: 100%;
                    height: 100%;
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 1fr;
                }

                .journal-pagination-dot-container {
                    width: 100%;
                    display: flex;
                    flex-direction: row;
                    gap: 10px;
                    justify-content: center;
                    align-items: center;
                }
                
                .journal-pagination-dot {
                    width: 15px;
                    height: 15px;
                    padding: 0;
                    border: none;
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 1fr;
                    justify-content: center;
                    align-items: center;
                    border-radius: 50%;
                    background-color: var(--c2);
                    opacity: 0.3;
                    transition: all 0.3s ease;
                    cursor: pointer;
                }

                .journal-pagination-dot:hover {
                    opacity: 0.55;
                }

                .journal-pagination-dot.active {
                    opacity: 0.8;
                }

                .left-content-allEntriesLink {
                    width: 190px;
                    height: 25px;
                    display: flex;
                    justify-content: start;
                    align-items: center;
                    color: var(--c3);
                    font-size: 1.2rem;
                    font-variation-settings: var(--fv-hero);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    border-bottom: 1px solid var(--c2);
                    padding-right: 20px;
                }

                .left-content-allEntriesLink-text {
                    width: 100px;
                    height: 100%;
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 1fr;
                    justify-content: center;
                    align-items: center;
                    padding-left: 5%;
                    padding-right: 20px;
                    background-color: var(--c2);
                }

                .left-content-allEntriesLink a {
                    text-decoration: none;
                    color: var(--c3);
                    font-variation-settings: var(--fv-label-strong);
                    font-size: clamp(0.7rem, 0.7vw, 0.9rem);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    padding-left: 5%;
                }

                .left-content-allEntriesLink a:hover {
                    text-decoration: underline;
                    font-variation-settings: var(--fv-hero);
                }

                .left-content-title {
                    width: 100%;
                    height: 100%;
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 1fr;
                    font-size: clamp(2rem, 4vw, 5rem);
                    font-variation-settings: var(--fv-headline-wide);
                    letter-spacing: 0.02em;
                    color: var(--c2);
                    text-align: start;
                }

                .left-content-description {
                    width: 80%;
                    height: 100%;
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 1fr;
                    font-size: clamp(1rem, 1.2vw, 1.5rem);
                    font-variation-settings: var(--fv-emphasis);
                    letter-spacing: 0.02em;
                    line-height: 1.2;
                    color: var(--c2);
                    text-align: start;
                }

                /* Link button 1 — matches program-hero CTA (see .cursor/rules/styles.mdc) */
                .programCTA {
                    width: 55%;
                    height: 100%;
                    align-items: end;
                    align-self: end;
                    justify-content: end;
                    margin-top: 1%;
                    border-bottom: 1px solid var(--c2);
                    margin-left: 40%;
                    margin-top: 4%;
                    transition: all 0.3s ease;
                    margin-right: 5%;
                }

                .ctaButton {
                    width: 200px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: end;
                    justify-self: end;
                    background-color: var(--c3);
                    color: var(--c2);
                    line-height: 1.3;
                    padding-right: 5%;
                    margin-top: 4%;
                    font-size: 1.2rem;
                    font-variation-settings: var(--fv-hero);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-sizing: border-box;
                }

                a.ctaButton {
                    text-decoration: none;
                }

                .ctaButton:hover {
                    background-color: var(--c5);
                }

                .programCTA:has(.ctaButton:hover) {
                    width: 75%;
                    margin-left: 20%;
                }

                @media (max-width: 1024px) {
                    .journal-hero {
                        height: auto;
                        min-height: min(92vh, 56rem);
                        padding-bottom: 5rem;
                    }

                    .journal-card {
                        grid-template-columns: 1fr;
                        grid-template-rows: minmax(0, 42vh) minmax(0, 1fr);
                    }

                    .journal-card .right-content {
                        grid-row: 1;
                    }

                    .journal-card .left-content {
                        grid-row: 2;
                    }

                    .left-content-description {
                        width: 95%;
                    }

                    .programCTA {
                        width: min(92%, 24rem);
                        margin-left: auto;
                        margin-right: auto;
                        justify-content: center;
                    }

                    .programCTA:has(.ctaButton:hover) {
                        width: min(92%, 24rem);
                        margin-left: auto;
                        margin-right: auto;
                    }

                    .ctaButton {
                        width: min(100%, 280px);
                    }
                }

                @media (max-width: 768px) {
                    .journal-hero {
                        padding-top: 2rem;
                    }

                    .header {
                        font-size: 1.2rem;
                        height: auto;
                    }

                    .ctaButton {
                        width: min(100%, 180px);
                    }

                    .programCTA {
                        margin-top: 15%;
                    }
                }
            </style>
            <div class="journal-hero">
                <div class="header">Journal</div>
                <div class="content"></div>
                <div id="journal-paginationDots">
                    <div class="journal-pagination-dot-container"></div>
                </div>
            </div>
        `;
    }
}

customElements.define('app-journal-hero', JournalHeroComponent);

export { JournalHeroComponent };
