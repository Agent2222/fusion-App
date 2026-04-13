/**
 * Journal page — `app-join-network` uses `testData.joinNetworkFlow` via `data-modal-type="membership"`
 * and `context="journal"` (see `joinNetwork.js`). Spacing: `data-margin-top` / `data-margin-bottom`.
 */
export function render() {
    return `
        <div class="page journal-page">
            <main id="journalMain" class="main-cont">
                <div id="journalMainContent" class="feed-container">
                    <div class="page-content nav-page-content journal-content">
                        <app-event-row context="journal" active="true" data-event-id="1"></app-event-row>
                        <app-journal-row id="journalRow0" active="true" data-journal-index="0"></app-journal-row>
                        <app-quote-row context="journal" active="true"></app-quote-row>
                        <app-journal-row id="journalRow1" active="true" data-journal-index="1"></app-journal-row>
                        <app-event-row context="journal" active="true" data-event-id="2"></app-event-row>
                        <app-journal-row id="journalRow2" active="true" data-journal-index="2"></app-journal-row>
                        <app-audio-row active="true" data-audio-id="1"></app-audio-row>
                        <app-join-network id="joinNetworkJournal" data-modal-type="membership" context="journal" active="true" data-margin-top="80px" data-margin-bottom="80px"></app-join-network>
                    </div>
                </div>
            </main>
        </div>
    `;
}

export default function initJournal() {}

export function generateJournalContent() {
    return render();
}
