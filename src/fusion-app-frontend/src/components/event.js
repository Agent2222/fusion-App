import { getPublicSiteOrigin } from '../config.js';
import { getEventsList, subscribeDataSource } from '../utils/database.js';
import { applyDocumentSeo } from '../utils/documentSeo.js';
import { firstNonEmptyString, mergeLocaleDeep } from '../utils/localeFallback.js';

/**
 * @returns {number | null}
 */
function eventIdFromPathname() {
    const path = window.location.pathname;
    if (!path.startsWith('/event/')) return null;
    const seg = path.slice('/event/'.length).split('/').filter(Boolean)[0];
    if (!seg) return null;
    const id = parseInt(seg, 10);
    return Number.isFinite(id) ? id : null;
}

function findEventById(id, list) {
    if (id == null || !Array.isArray(list)) return null;
    return list.find((e) => Number(e?.id) === id) ?? null;
}

export function generateEventContent() {
    return `
        <div class="page event-detail-page">
            <main id="eventMain" class="main-cont">
                <div id="eventMainContent" class="feed-container">
                    <div class="page-content event-detail-content">
                        <nav class="event-detail-back" aria-label="Event">
                            <a href="/journal" class="event-detail-back-link">← Journal</a>
                        </nav>
                        <article class="event-detail" id="eventDetail" hidden>
                            <div class="event-detail-hero">
                                <img id="eventDetailImage" src="" alt="" width="960" height="540" />
                            </div>
                            <div class="event-detail-body">
                                <p id="eventDetailCategory" class="event-detail-category"></p>
                                <h1 id="eventDetailTitle" class="event-detail-title"></h1>
                                <div class="event-detail-meta">
                                    <p id="eventDetailDate" class="event-detail-meta-line"></p>
                                    <p id="eventDetailTime" class="event-detail-meta-line"></p>
                                    <p id="eventDetailLocation" class="event-detail-meta-line"></p>
                                    <p id="eventDetailAddress" class="event-detail-meta-line"></p>
                                </div>
                                <p id="eventDetailDescription" class="event-detail-description"></p>
                            </div>
                            <p id="eventDetailPastNote" class="event-detail-past-note" hidden>This event has passed.</p>
                            <section id="eventRsvpSection" class="event-rsvp" hidden aria-labelledby="eventRsvpHeading">
                                <h2 id="eventRsvpHeading" class="event-rsvp-heading">RSVP</h2>
                                <form id="eventRsvpForm" class="event-rsvp-form">
                                    <div class="event-rsvp-field">
                                        <label for="eventRsvpName">Name</label>
                                        <input type="text" id="eventRsvpName" name="name" required autocomplete="name" />
                                    </div>
                                    <div class="event-rsvp-field">
                                        <label for="eventRsvpEmail">Email</label>
                                        <input type="email" id="eventRsvpEmail" name="email" required autocomplete="email" />
                                    </div>
                                    <button type="submit" class="event-rsvp-submit">Submit RSVP</button>
                                </form>
                                <p id="eventRsvpThanks" class="event-rsvp-thanks" hidden>Thank you — we will confirm by email.</p>
                            </section>
                        </article>
                        <div id="eventDetailNotFound" class="event-detail-not-found" hidden>
                            <p>We could not find that event.</p>
                            <p><a href="/journal">Back to journal</a></p>
                        </div>
                        <section id="eventOtherSection" class="event-other-section" hidden aria-labelledby="eventOtherHeading">
                            <h2 id="eventOtherHeading" class="event-other-heading">More events</h2>
                            <div id="eventOtherRows" class="event-other-rows"></div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    `;
}

function applyEventToDom(ev) {
    const locale = typeof window.getLocale === 'function' ? window.getLocale() : 'en';
    const enE = ev.en && typeof ev.en === 'object' ? ev.en : {};
    const jaE = ev.ja && typeof ev.ja === 'object' ? ev.ja : {};
    const loc =
        locale === 'ja'
            ? /** @type {Record<string, unknown>} */ (mergeLocaleDeep(enE, jaE))
            : /** @type {Record<string, unknown>} */ (enE);
    const title = loc?.title ?? '';
    const category = loc?.category ?? '';
    const date = loc?.date ?? '';
    const time = loc?.time ?? '';
    const location = loc?.location ?? '';
    const address = loc?.address ?? '';
    const description = loc?.description ?? '';

    const imgEl = document.getElementById('eventDetailImage');
    const catEl = document.getElementById('eventDetailCategory');
    const titleEl = document.getElementById('eventDetailTitle');
    const dateEl = document.getElementById('eventDetailDate');
    const timeEl = document.getElementById('eventDetailTime');
    const locEl = document.getElementById('eventDetailLocation');
    const addrEl = document.getElementById('eventDetailAddress');
    const descEl = document.getElementById('eventDetailDescription');
    const pastNote = document.getElementById('eventDetailPastNote');
    const rsvpSection = document.getElementById('eventRsvpSection');

    if (imgEl) {
        imgEl.src = firstNonEmptyString(ev.image, jaE?.image, enE?.image);
        imgEl.alt = title;
    }
    if (catEl) catEl.textContent = category;
    if (titleEl) titleEl.textContent = title;
    if (dateEl) dateEl.textContent = date;
    if (timeEl) timeEl.textContent = time;
    if (locEl) locEl.textContent = location;
    if (addrEl) addrEl.textContent = address;
    if (descEl) descEl.textContent = description;

    const upcoming = ev.status === 'upcoming';
    if (pastNote) pastNote.hidden = upcoming;
    if (rsvpSection) {
        rsvpSection.hidden = !upcoming;
        const thanks = document.getElementById('eventRsvpThanks');
        const form = document.getElementById('eventRsvpForm');
        if (upcoming && thanks && form) {
            thanks.hidden = true;
            form.hidden = false;
            form.reset();
        }
    }

    const pageTitle = `${title || "Event"} · Fusion`;
    document.title = pageTitle;
    const pagePath = window.location.pathname;
    const descText =
        String(description || "").trim() ||
        `${String(title || "Event")} — event on Fusion’s art platform.`;
    let imageSrcForOg = firstNonEmptyString(ev.image, jaE?.image, enE?.image);
    if (imageSrcForOg && !/^https?:\/\//i.test(imageSrcForOg)) {
        const origin = getPublicSiteOrigin();
        imageSrcForOg = `${origin}${imageSrcForOg.startsWith("/") ? imageSrcForOg : `/${imageSrcForOg}`}`;
    }
    applyDocumentSeo({
        title: pageTitle,
        description: descText,
        path: pagePath,
        ogType: "article",
        imageUrl: imageSrcForOg || undefined,
        breadcrumbItems: [
            { name: "Home", path: "/" },
            { name: "Journal", path: "/journal" },
            { name: String(title || "Event").slice(0, 96), path: pagePath },
        ],
    });
}

function mountOtherEventRows(currentId, list) {
    const section = document.getElementById('eventOtherSection');
    const host = document.getElementById('eventOtherRows');
    if (!section || !host) return;

    const others = list.filter((e) => Number(e?.id) !== currentId);
    host.innerHTML = '';

    if (others.length === 0) {
        section.hidden = true;
        return;
    }

    section.hidden = false;
    for (const e of others) {
        const row = document.createElement('app-event-row');
        row.setAttribute('context', 'journal');
        row.setAttribute('data-event-id', String(e.id));
        row.setAttribute('active', 'true');
        host.appendChild(row);
    }
}

/** @type {(() => void) | null} */
let _unsubEvent = null;
/** @type {((e: Event) => void) | null} */
let _eventRsvpSubmit = null;

export default function initEvent() {
    if (_unsubEvent) {
        _unsubEvent();
        _unsubEvent = null;
    }

    const id = eventIdFromPathname();

    const run = async () => {
        const formBefore = document.getElementById('eventRsvpForm');
        if (formBefore && _eventRsvpSubmit) {
            formBefore.removeEventListener('submit', _eventRsvpSubmit);
            _eventRsvpSubmit = null;
        }

        const list = await getEventsList();
        const ev = id != null ? findEventById(id, list) : null;

        const article = document.getElementById('eventDetail');
        const notFound = document.getElementById('eventDetailNotFound');

        const show = (el, on) => {
            if (!el) return;
            if (on) el.removeAttribute('hidden');
            else el.setAttribute('hidden', '');
        };

        if (id == null || !ev) {
            show(article, false);
            show(notFound, true);
            const otherSec = document.getElementById('eventOtherSection');
            if (otherSec) otherSec.hidden = true;
            applyDocumentSeo({
                title: "Event not found · Fusion",
                description: "This event is not available on Fusion.",
                path: window.location.pathname,
                robots: "noindex, nofollow",
            });
            return;
        }

        show(article, true);
        show(notFound, false);
        applyEventToDom(ev);
        mountOtherEventRows(id, list);

        const form = document.getElementById('eventRsvpForm');
        if (form && ev.status === 'upcoming') {
            _eventRsvpSubmit = (e) => {
                e.preventDefault();
                const thanks = document.getElementById('eventRsvpThanks');
                const f = document.getElementById('eventRsvpForm');
                if (thanks) thanks.hidden = false;
                if (f) f.hidden = true;
            };
            form.addEventListener('submit', _eventRsvpSubmit);
        }
    };

    void run();
    _unsubEvent = subscribeDataSource(() => {
        void run();
    });
}
