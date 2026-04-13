import { getJournalEntries, subscribeDataSource } from '../utils/database.js';

/**
 * @returns {number | null}
 */
function journalEntryIdFromPathname() {
    const path = window.location.pathname;
    if (!path.startsWith('/journal/entry/')) return null;
    const seg = path.slice('/journal/entry/'.length).split('/').filter(Boolean)[0];
    if (!seg) return null;
    const id = parseInt(seg, 10);
    return Number.isFinite(id) ? id : null;
}

/**
 * @param {number} id
 * @param {Array<{ id: number }>} list
 */
function findJournalById(id, list) {
    if (!Array.isArray(list)) return null;
    return list.find((j) => Number(j?.id) === id) ?? null;
}

export function generateJournalEntryContent() {
    return `
        <div class="page journal-entry-page">
            <main id="journalEntryMain" class="main-cont">
                <div id="journalEntryMainContent" class="feed-container">
                    <div class="page-content journal-entry-content">
                        <nav class="journal-entry-back" aria-label="Journal">
                            <a href="/journal" class="journal-entry-back-link">← Journal</a>
                        </nav>
                        <article class="journal-entry-detail" id="journalEntryDetail" hidden>
                            <div class="journal-entry-hero">
                                <img id="journalEntryImage" src="" alt="" width="960" height="540" />
                            </div>
                            <div class="journal-entry-body">
                                <h1 id="journalEntryTitle" class="journal-entry-title"></h1>
                                <div id="journalEntryDescription" class="journal-entry-description"></div>
                            </div>
                        </article>
                        <div id="journalEntryNotFound" class="journal-entry-not-found" hidden>
                            <p>We could not find that journal entry.</p>
                            <p><a href="/journal">Back to journal</a></p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    `;
}

function applyJournalEntry(entry) {
    const locale = typeof window.getLocale === 'function' ? window.getLocale() : 'en';
    const loc = entry[locale === 'ja' ? 'ja' : 'en'] || entry.en;
    const title = loc?.title || '';
    const description = loc?.description ?? '';
    const imageAlt = loc?.imageAlt ?? title;

    const img = document.getElementById('journalEntryImage');
    const titleEl = document.getElementById('journalEntryTitle');
    const descEl = document.getElementById('journalEntryDescription');

    if (img) {
        img.src = entry.imageSrc || '';
        img.alt = imageAlt;
    }
    if (titleEl) titleEl.textContent = title;
    if (descEl) {
        descEl.textContent = description;
    }
    document.title = `${title || 'Journal'} · Fusion`;
}

/** @type {(() => void) | null} */
let _unsubJournalEntry = null;

export default function initJournalEntry() {
    if (_unsubJournalEntry) {
        _unsubJournalEntry();
        _unsubJournalEntry = null;
    }

    const id = journalEntryIdFromPathname();

    const run = async () => {
        const list = await getJournalEntries();
        const entry = id != null ? findJournalById(id, list) : null;

        const article = document.getElementById('journalEntryDetail');
        const notFound = document.getElementById('journalEntryNotFound');

        const show = (el, on) => {
            if (!el) return;
            if (on) el.removeAttribute('hidden');
            else el.setAttribute('hidden', '');
        };

        if (id == null || !entry) {
            show(article, false);
            show(notFound, true);
            document.title = 'Journal entry not found · Fusion';
            return;
        }

        show(article, true);
        show(notFound, false);
        applyJournalEntry(entry);
    };

    void run();
    _unsubJournalEntry = subscribeDataSource(() => {
        void run();
    });
}
