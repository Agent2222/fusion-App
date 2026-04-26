/**
 * Journal page — `app-join-network` uses `testData.joinNetworkFlow` via `data-modal-type="membership"`
 * and `context="journal"` (see `joinNetwork.js`). Spacing: `data-margin-top` / `data-margin-bottom`.
 */
import { getArtists, getEventsList, getJournalEntries, getJournalLayoutPublic } from '../utils/database.js';

function escAttr(v) {
    return String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export function render() {
    return `
        <div class="page journal-page">
            <main id="journalMain" class="main-cont">
                <div id="journalMainContent" class="feed-container">
                    <div class="page-content nav-page-content journal-content">
                        <div id="journalDynamicRows"></div>
                        <app-join-network id="joinNetworkJournal" data-modal-type="membership" context="journal" active="true" data-margin-top="80px" data-margin-bottom="80px"></app-join-network>
                    </div>
                </div>
            </main>
        </div>
    `;
}

function resolveJournalEntryAttr(refId, entries) {
    const asStr = String(refId ?? '').trim();
    if (!asStr) return null;
    const byId = entries.find((j) => String(j?.id ?? '') === asStr);
    if (byId) return { kind: 'id', value: asStr };
    if (/^\d+$/.test(asStr)) return { kind: 'index', value: asStr };
    return null;
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
function sortJournalLayoutRows(rows) {
    const arr = Array.isArray(rows) ? rows : [];
    const withIdx = arr.map((r, i) => ({ r, i }));
    withIdx.sort((a, b) => {
        const fa = a.r?.featured ? 0 : 1;
        const fb = b.r?.featured ? 0 : 1;
        if (fa !== fb) return fa - fb;
        const oa = Math.floor(Number(a.r?.sortOrder ?? a.i));
        const ob = Math.floor(Number(b.r?.sortOrder ?? b.i));
        if (oa !== ob) return oa - ob;
        return a.i - b.i;
    });
    return withIdx.map((x) => x.r);
}

function pickArtistForRow(row, artists, type) {
    const mode = String(row?.selectionMode || '').toLowerCase();
    const key = type === 'audio' ? 'audioUrl' : 'quote';
    const pool = artists.filter((a) => String(a?.[key] ?? '').trim());
    if (!pool.length) return null;
    if (mode === 'manual' && row?.artistId) {
        const m = pool.find((a) => String(a?.id ?? '') === String(row.artistId));
        if (m) return m;
    }
    return pool[Math.floor(Math.random() * pool.length)] || null;
}

export default async function initJournal() {
    const mount = document.getElementById('journalDynamicRows');
    if (!mount) return;
    try {
        const [layout, entries, events, artists] = await Promise.all([
            getJournalLayoutPublic(),
            getJournalEntries(),
            getEventsList(),
            getArtists(),
        ]);
        const safeLayout = sortJournalLayoutRows(Array.isArray(layout) ? layout : []);
        const eventIds = new Set((Array.isArray(events) ? events : []).map((e) => String(e?.id ?? '')));
        let journalRowIdx = 0;
        const html = [];
        for (const row of safeLayout) {
            const type = String(row?.rowType || '').trim().toLowerCase();
            if (type === 'event') {
                const id = String(row?.refId ?? '').trim();
                if (!id || !eventIds.has(id)) continue;
                html.push(
                    `<app-event-row context="journal" active="true" data-event-id="${escAttr(id)}"></app-event-row>`,
                );
            } else if (type === 'journal-entry') {
                const ref = resolveJournalEntryAttr(row?.refId, entries);
                if (!ref) continue;
                if (ref.kind === 'index') {
                    html.push(
                        `<app-journal-row id="journalRow${journalRowIdx++}" active="true" data-journal-index="${escAttr(ref.value)}"></app-journal-row>`,
                    );
                } else {
                    html.push(
                        `<app-journal-row id="journalRow${journalRowIdx++}" active="true" data-journal-id="${escAttr(ref.value)}"></app-journal-row>`,
                    );
                }
            } else if (type === 'quote') {
                const artist = pickArtistForRow(row, Array.isArray(artists) ? artists : [], 'quote');
                if (!artist) continue;
                const quote = String(artist.quote ?? '').trim();
                if (!quote) continue;
                const name =
                    String(artist?.locales?.en?.name ?? '').trim() ||
                    String(artist?.slug ?? '').trim() ||
                    'Artist';
                const href = String(artist?.slug ? `/profile/${artist.slug}` : '/artists');
                html.push(
                    `<app-quote-row context="journal" active="true" data-quote-text="${escAttr(quote)}" data-quote-attribution="${escAttr(name)}" data-quote-href="${escAttr(href)}"></app-quote-row>`,
                );
            } else if (type === 'audio') {
                const artist = pickArtistForRow(row, Array.isArray(artists) ? artists : [], 'audio');
                if (!artist) continue;
                const src = String(artist.audioUrl ?? '').trim();
                if (!src) continue;
                const title =
                    String(artist.audioTitle ?? '').trim() ||
                    String(artist?.locales?.en?.name ?? '').trim() ||
                    'Artist audio';
                html.push(
                    `<app-audio-row active="true" data-audio-src="${escAttr(src)}" data-audio-title="${escAttr(title)}"></app-audio-row>`,
                );
            }
        }
        mount.innerHTML = html.join('');
    } catch {
        mount.innerHTML = '';
    }
}

export function generateJournalContent() {
    return render();
}
