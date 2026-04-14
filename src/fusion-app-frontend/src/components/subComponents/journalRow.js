/**
 * Single journal entry — same card layout as `journal-hero.js` without horizontal scroll or dots.
 * Select via `data-journal-id` or `data-journal-index`, or call `setJournalRow(entry)`.
 */
import { getJournalEntries, subscribeDataSource } from '../../utils/database.js';
import { isJournalListingPage } from '../../utils/journalListingPage.js';
import { navigate } from '../../router.js';
import { escapeHtml, previewPlainText } from '../../utils/textPreview.js';

class JournalRowComponent extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        /** @type {object | null} Override entry */
        this._entryOverride = null;
        /** @type {Array<unknown> | null} */
        this._journalsList = null;
        /** @type {(() => void) | null} */
        this._unsubData = null;
        this._onLocaleChange = () => this.render();
    }

    get active() {
        return this.getAttribute('active') || false;
    }

    set active(val) {
        const next = val === true || val === 'true' ? 'true' : 'false';
        if (this.getAttribute('active') === next) return;
        this.setAttribute('active', next);
    }

    /**
     * @param {object | null} entry — full journal object, or null to use attributes + testData
     */
    setJournalRow(entry) {
        this._entryOverride = entry && typeof entry === 'object' ? entry : null;
        this.render();
    }

    static get observedAttributes() {
        return ['active', 'data-journal-id', 'data-journal-index'];
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if (prop === 'active' || prop === 'data-journal-id' || prop === 'data-journal-index') {
            if (oldVal === newVal) return;
            this.render();
        }
    }

    connectedCallback() {
        window.addEventListener('fusion-localechange', this._onLocaleChange);
        if (this._unsubData) this._unsubData();
        this._unsubData = subscribeDataSource(() => void this._loadJournals());
        void this._loadJournals();
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
        window.removeEventListener('fusion-localechange', this._onLocaleChange);
        if (this._unsubData) {
            this._unsubData();
            this._unsubData = null;
        }
    }

    async _loadJournals() {
        this._journalsList = await getJournalEntries();
        this.render();
    }

    _getJournalId() {
        const raw = this.getAttribute('data-journal-id');
        return raw == null || String(raw).trim() === '' ? null : String(raw).trim();
    }

    _getIndex() {
        const raw = this.getAttribute('data-journal-index');
        if (raw == null || raw === '') return 0;
        const n = parseInt(String(raw).trim(), 10);
        return Number.isFinite(n) && n >= 0 ? n : 0;
    }

    _resolveEntry() {
        if (this._entryOverride) return this._entryOverride;
        const list = this._journalsList;
        if (!Array.isArray(list) || list.length === 0) return null;

        const id = this._getJournalId();
        if (id != null) {
            const found = list.find((j) => String(j.id) === id);
            return found ?? null;
        }

        const idx = this._getIndex();
        return list[idx] ?? null;
    }

    render() {
        const entry = this._resolveEntry();
        const locale = typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';

        if (!entry) {
            if (isJournalListingPage()) {
                this.style.display = 'none';
                this.shadow.innerHTML = `<style>:host { display: none !important; }</style>`;
                return;
            }
            const id = this._getJournalId();
            const hint =
                id != null
                    ? `No journal for id “${escapeHtml(id)}”.`
                    : 'No journal entry for this index.';
            this.shadow.innerHTML = `
                <style>:host { display: block; color: var(--c2); padding: 1rem; opacity: 0.85; }</style>
                <div part="empty">${hint}</div>
            `;
            return;
        }
        this.style.display = '';

        const loc = entry[locale] || entry.en;
        const journalImage = entry.imageSrc;
        const journalLink = entry.link || '#';
        const journalTitle = loc?.title ?? '';
        const journalDescription = previewPlainText(loc?.description ?? '', 250);
        const ctaLabel = loc?.cta ?? 'Read Entry';
        const imageAlt = loc?.imageAlt ?? journalTitle;

        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                }

                .journal-row {
                    width: 100%;
                    min-height: clamp(20rem, 55vh, 40rem);
                    box-sizing: border-box;
                    padding: 1rem 0 2rem;
                }

                .journal-card {
                    width: 100%;
                    height: 100%;
                    min-height: clamp(18rem, 50vh, 36rem);
                    box-sizing: border-box;
                    display: grid;
                    grid-template-columns: 40% 60%;
                    grid-template-rows: 1fr;
                    overflow: hidden;
                    align-items: stretch;
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

                .left-content-container {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    justify-content: center;
                    gap: 0.75rem;
                }

                .right-content {
                    width: 100%;
                    height: 100%;
                    min-height: 0;
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 1fr;
                    justify-content: center;
                    align-items: center;
                }

                .right-content img,
                img.journal-card-image {
                    width: 100%;
                    height: 100%;
                    min-height: 0;
                    object-fit: cover;
                    display: block;
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
                    font-size: clamp(1.5rem, 3.5vw, 4rem);
                    font-variation-settings: var(--fv-headline-wide);
                    letter-spacing: 0.02em;
                    color: var(--c2);
                    text-align: start;
                }

                .left-content-description {
                    width: 90%;
                    font-size: clamp(1.04rem, 1.2vw, 1.45rem);
                    font-variation-settings: var(--fv-emphasis);
                    letter-spacing: 0.02em;
                    line-height: 1.35;
                    color: var(--c2);
                    text-align: start;
                }

                .programCTA {
                    width: 55%;
                    align-items: end;
                    align-self: end;
                    justify-content: end;
                    margin-top: 4%;
                    border-bottom: 1px solid var(--c2);
                    margin-left: 40%;
                    margin-right: 5%;
                    transition: all 0.3s ease;
                }

                .ctaButton {
                    width: 200px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: end;
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

                @media (max-width: 768px) {
                    .journal-card {
                        grid-template-columns: 1fr;
                        grid-template-rows: auto auto;
                        min-height: unset;
                    }
                    .left-content {
                        margin-top: 5%;
                    }
                    .left-content-description {
                        font-size: clamp(1.04rem, 1.2vw, 1.45rem);
                    }
                    .right-content {
                        order: -1;
                        min-height: 40vh;
                    }
                    .programCTA {
                        width: 100%;
                        margin-left: 0;
                    }
                    .programCTA:has(.ctaButton:hover) {
                        width: 100%;
                        margin-left: 0;
                    }
                }
            </style>
            <div class="journal-row" part="journal-row">
                <div class="journal-card">
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
                                <a class="ctaButton" href="${escapeHtml(journalLink)}">${escapeHtml(ctaLabel)}</a>
                            </div>
                        </div>
                    </div>
                    <div class="right-content">
                        <img class="journal-card-image" src="${journalImage}" alt="${escapeHtml(imageAlt)}">
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('app-journal-row', JournalRowComponent);

export { JournalRowComponent };
