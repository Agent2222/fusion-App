// Event row: `data-event-id` selects an item from CMS events list; copy from `en` / `ja` on that item.
import { getEventsList, subscribeDataSource } from '../../utils/database.js';
import { isJournalListingPage } from '../../utils/journalListingPage.js';
import { mergeLocaleDeep } from '../../utils/localeFallback.js';
import { navigate } from '../../router.js';
import { withSeoImageAlt } from '../../utils/mediaAltSeo.js';

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

class EventRowComponent extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        /** @type {Array<unknown> | null} */
        this._eventsList = null;
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

    static get observedAttributes() {
        return ['active', 'context', 'data-event-id'];
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if (prop === 'active' || prop === 'context' || prop === 'data-event-id') {
            if (oldVal === newVal) return;
            this.render();
        }
    }

    connectedCallback() {
        window.addEventListener('fusion-localechange', this._onLocaleChange);
        if (this._unsubData) this._unsubData();
        this._unsubData = subscribeDataSource(() => void this._loadEvents());
        void this._loadEvents();
        if (!this._eventNavBound) {
            this._eventNavBound = true;
            this.shadow.addEventListener('click', (e) => {
                const row = e.target.closest?.('.event-row:not(.event-row--empty)');
                if (!row) return;
                const id = this._getEventId();
                if (id) navigate(`/event/${encodeURIComponent(id)}`);
            });
            this.shadow.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                const row = e.target.closest?.('.event-row:not(.event-row--empty)');
                if (!row) return;
                e.preventDefault();
                const id = this._getEventId();
                if (id) navigate(`/event/${encodeURIComponent(id)}`);
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

    async _loadEvents() {
        this._eventsList = await getEventsList();
        this.render();
    }

    _getEventId() {
        const raw = this.getAttribute('data-event-id');
        return raw == null || raw === '' ? null : String(raw).trim();
    }

    /** @returns {{ event: object, loc: object } | null} */
    _resolveEventData() {
        const id = this._getEventId();
        const list = this._eventsList;
        if (id == null || !Array.isArray(list)) return null;
        const event = list.find((e) => String(e.id) === id);
        if (!event) return null;
        const locale = typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
        const enE = event.en && typeof event.en === 'object' ? event.en : {};
        const jaE = event.ja && typeof event.ja === 'object' ? event.ja : {};
        const loc =
            locale === 'ja'
                ? /** @type {Record<string, unknown>} */ (mergeLocaleDeep(enE, jaE))
                : /** @type {Record<string, unknown>} */ (enE);
        if (!loc) return null;
        return { event, loc };
    }

    /**
     * Journal listing page only: show rows for upcoming (or unset status) events; hide missing/past.
     * @param {{ event: object, loc: object } | null} resolved
     */
    _isAvailableJournalEvent(resolved) {
        if (!resolved) return false;
        const st = resolved.event && typeof resolved.event === 'object' ? resolved.event.status : undefined;
        if (st == null || st === '') return true;
        return String(st) === 'upcoming';
    }

    render() {
        const resolved = this._resolveEventData();
        const isJournal = (this.getAttribute('context') || '') === 'journal';
        if (isJournal && isJournalListingPage() && !this._isAvailableJournalEvent(resolved)) {
            this.style.display = 'none';
            this.shadow.innerHTML = `<style>:host { display: none !important; }</style>`;
            return;
        }
        this.style.display = '';

        const loc = resolved?.loc;
        const imageSrc = resolved?.event?.image ?? '';
        const category = loc?.category ?? '';
        const title = loc?.title ?? '';
        const date = loc?.date ?? '';
        const time = loc?.time ?? '';
        const location = loc?.location ?? '';
        const address = loc?.address ?? '';
        const description = loc?.description ?? '';
        const cta = loc?.cta ?? 'REVIEW';

        const notFound = !resolved;

        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                }

                .event-row {
                    width: 100%;
                    height: clamp(7.5rem, 25vh, 20rem);
                    min-height: 0;
                    display: grid;
                    grid-template-columns: 15% 24% 18% 28% 15%;
                    grid-template-rows: minmax(0, 1fr);
                    align-items: stretch;
                    justify-items: stretch;
                    box-sizing: border-box;
                    overflow: hidden;
                    border-top: 1px solid var(--c2);
                    border-bottom: 1px solid var(--c2);
                    background-color: var(--bg);
                    cursor: ${notFound ? 'default' : 'pointer'};
                    transition: all 0.3s ease;
                    margin-bottom: 1rem;
                }

                .event-row--empty {
                    grid-template-columns: 1fr;
                    align-items: center;
                    justify-items: center;
                    padding: 1rem;
                    font-size: clamp(0.85rem, 1.2vw, 1rem);
                    color: var(--c2);
                    opacity: 0.85;
                }

                .event-row:not(.event-row--empty):hover {
                    transform: scale(1.05);
                    z-index: 100;
                    transition: all 0.3s ease;
                }

                .event-row:not(.event-row--empty):hover .event-row-cta {
                    text-decoration: underline;
                }

                .event-row > * {
                    min-width: 0;
                    min-height: 0;
                    overflow: hidden;
                }

                .event-row-category {
                    color: var(--c2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 0 0.35rem;
                    font-size: clamp(0.8rem, 1.6vw, 1.8rem);
                    font-variation-settings: var(--fv-emphasis);
                }

                .event-row-image {
                    position: relative;
                    background: var(--c3);
                }

                .event-row-image img {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .event-row-details {
                    display: flex;
                    flex-direction: column;
                    align-items: start;
                    justify-content: center;
                    gap: 0.15em;
                    font-size: 1.2rem;
                    font-weight: 600;
                    color: var(--c2);
                    font-variation-settings: var(--fv-body-wide);
                    padding: 0.35rem 6% 0.35rem 15%;
                    overflow: auto;
                    -webkit-overflow-scrolling: touch;
                    user-select: none;
                }

                .event-row-description {
                    font-size: clamp(0.65rem, 1.1vw, 1.4rem);
                    font-variation-settings: var(--fv-label-strong);
                    color: var(--c2);
                    line-height: 1.25;
                    padding: 0.35rem 0.5rem;
                    display: -webkit-box;
                    -webkit-box-orient: vertical;
                    -webkit-line-clamp: 4;
                    line-clamp: 4;
                    justify-self: start;
                    align-self: center;
                }
                
                .event-row-cta {
                    font-size: clamp(0.75rem, 1.7vw, 2rem);
                    font-variation-settings: var(--fv-emphasis);
                    color: var(--c2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 0 0.35rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .event-row-cta:hover {
                    transform: scale(1.05);
                    transition: all 0.3s ease;
                }

                .eventDate {
                    font-size: clamp(0.8rem, 1.5vw, 1.8rem);
                    font-weight: 600;
                    color: var(--c2);
                    line-height: 1.2;
                }
                
                .eventTime {
                    font-size: clamp(0.8rem, 1.5vw, 1.8rem);
                    font-weight: 600;
                    color: var(--c2);
                    line-height: 1.2;
                }

                .eventLocation {
                    font-size: clamp(0.8rem, 1.6vw, 1.9rem);
                    font-weight: 600;
                    color: var(--c2);
                    line-height: 1.2;
                }

                .eventAddress {
                    font-size: clamp(0.8rem, 1vw, 1.3rem);
                    font-weight: 600;
                    color: var(--c2);
                    line-height: 1.2;
                }

                @media (max-width: 768px) {
                    .event-row:not(.event-row--empty) {
                        height: auto;
                        min-height: 0;
                        grid-template-columns: 1fr;
                        grid-template-rows: auto;
                    }

                    .event-row:not(.event-row--empty):hover {
                        transform: none;
                    }

                    .event-row-image {
                        min-height: 10rem;
                        height: min(42vw, 16rem);
                    }

                    .event-row-details {
                        padding: 0.5rem 0.75rem;
                    }

                    .event-row-description {
                        -webkit-line-clamp: 6;
                        line-clamp: 6;
                    }
                }

                @media (max-width: 480px) {
                    .event-row-category {
                        font-size: clamp(0.75rem, 3.5vw, 1.25rem);
                    }
                }
            </style>
            ${
                notFound
                    ? `<div class="event-row event-row--empty" part="event-row">
                    ${this._getEventId() == null ? 'Missing data-event-id' : `No event for id “${escapeHtml(this._getEventId())}”`}
                </div>`
                    : `<div class="event-row" part="event-row" role="button" tabindex="0" aria-label="${escapeHtml(title)}">
                <div class="event-row-category">${escapeHtml(category)}</div>
                <div class="event-row-image">
                    <img src="${imageSrc}" alt="${escapeHtml(withSeoImageAlt(title))}">
                </div>
                <div class="event-row-details">
                    <div class="eventDate">${escapeHtml(date)}</div>
                    <div class="eventTime">${escapeHtml(time)}</div>
                    <div class="eventLocation">${escapeHtml(location)}</div>
                    <div class="eventAddress">${escapeHtml(address)}</div>
                </div>
                <div class="event-row-description">${escapeHtml(description)}</div>
                <div class="event-row-cta">${escapeHtml(cta)}</div>
            </div>`
            }
        `;
    }
}

customElements.define('app-event-row', EventRowComponent);

export { EventRowComponent };
