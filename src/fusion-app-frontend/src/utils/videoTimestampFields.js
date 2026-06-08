/**
 * Studio video editor — artist (people) and idea timestamp rows.
 */

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function timestampToInput(sec) {
    const n = Math.max(0, Math.floor(Number(sec) || 0));
    const m = Math.floor(n / 60);
    const s = n % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

export function timestampFromInput(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return 0;
    if (/^\d+(\.\d+)?$/.test(raw)) return Math.max(0, Math.floor(Number(raw)));
    const parts = raw.split(':').map((part) => Number(part));
    if (parts.some((part) => !Number.isFinite(part))) return 0;
    if (parts.length === 2) return Math.max(0, Math.floor(parts[0] * 60 + parts[1]));
    if (parts.length === 3) return Math.max(0, Math.floor(parts[0] * 3600 + parts[1] * 60 + parts[2]));
    return 0;
}

/**
 * @param {Record<string, unknown>} artist
 */
function artistLabel(artist) {
    const locales = artist?.locales && typeof artist.locales === 'object' ? artist.locales : {};
    const en = /** @type {Record<string, unknown>} */ (locales).en;
    const local = en && typeof en === 'object' ? en : {};
    return String(local.name ?? artist?.name ?? artist?.slug ?? artist?.id ?? 'Artist');
}

/**
 * @param {Array<Record<string, unknown>>} artists
 * @param {unknown} selectedId
 */
function renderArtistOptions(artists, selectedId) {
    const selected = String(selectedId ?? '');
    const sorted = [...(Array.isArray(artists) ? artists : [])].sort((a, b) =>
        artistLabel(a).localeCompare(artistLabel(b), undefined, { sensitivity: 'base' }),
    );
    return `
        <option value="">Select artist</option>
        ${sorted
            .map((artist) => {
                const id = String(artist?.id ?? '');
                return `<option value="${esc(id)}" ${id === selected ? 'selected' : ''}>${esc(artistLabel(artist))}</option>`;
            })
            .join('')}
    `;
}

/**
 * @param {string} featureKey
 * @param {unknown[]} chapters
 * @param {Array<Record<string, unknown>>} artists
 * @param {string} [title]
 * @param {string} [hint]
 */
export function renderChapterRowsHtml(
    featureKey,
    chapters,
    artists,
    title = 'Artist timestamps',
    hint = 'Each row links a video timestamp to an artist in the roster.',
) {
    const rows = (Array.isArray(chapters) ? chapters : [])
        .map((raw, i) => {
            const c = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
            return `
            <div class="studio-form-grid studio-video-ts__chapter-row" data-chapter-row="${esc(featureKey)}">
                <label class="studio-field">
                    <span>Artist</span>
                    <select class="studio-select sv-ts-chapter-artist">
                        ${renderArtistOptions(artists, c.artistId)}
                    </select>
                </label>
                <label class="studio-field">
                    <span>Timestamp</span>
                    <input type="text" class="studio-input sv-ts-chapter-time" value="${esc(timestampToInput(c.timestampSec))}" placeholder="1:12" />
                </label>
                <div class="studio-field">
                    <span>&nbsp;</span>
                    <button type="button" class="studio-btn-ghost sv-ts-chapter-del" data-feature="${esc(featureKey)}" data-chapter-index="${i}">Remove</button>
                </div>
            </div>`;
        })
        .join('');
    return `
        <div class="studio-video-ts__section">
            <h4 class="studio-subheading">${esc(title)}</h4>
            <p class="studio-muted">${esc(hint)}</p>
            ${rows || '<p class="studio-muted">No timestamps yet.</p>'}
            <button type="button" class="studio-btn-ghost sv-ts-chapter-add" data-feature="${esc(featureKey)}">Add timestamp</button>
        </div>`;
}

/**
 * @param {string} featureKey
 * @param {unknown[]} topics
 * @param {string} [title]
 * @param {string} [hint]
 */
export function renderTopicRowsHtml(
    featureKey,
    topics,
    title = 'Idea timestamps',
    hint = 'Each row adds a localized topic or quote timestamp.',
) {
    const rows = (Array.isArray(topics) ? topics : [])
        .map((raw, i) => {
            const t = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
            return `
            <div class="studio-field-group studio-video-ts__topic-card" data-topic-row="${esc(featureKey)}">
                <div class="studio-form-grid">
                    <label class="studio-field">
                        <span>Timestamp</span>
                        <input type="text" class="studio-input sv-ts-topic-time" value="${esc(timestampToInput(t.timestampSec))}" placeholder="1:12" />
                    </label>
                    <label class="studio-field">
                        <span>Title EN</span>
                        <input type="text" class="studio-input sv-ts-topic-title-en" value="${esc(String(t.titleEn ?? ''))}" />
                    </label>
                    <label class="studio-field">
                        <span>Title JA</span>
                        <input type="text" class="studio-input sv-ts-topic-title-ja" value="${esc(String(t.titleJa ?? ''))}" />
                    </label>
                </div>
                <label class="studio-field">
                    <span>Quote/description EN</span>
                    <textarea class="studio-input sv-ts-topic-quote-en" rows="2">${esc(String(t.quoteEn ?? ''))}</textarea>
                </label>
                <label class="studio-field">
                    <span>Quote/description JA</span>
                    <textarea class="studio-input sv-ts-topic-quote-ja" rows="2">${esc(String(t.quoteJa ?? ''))}</textarea>
                </label>
                <button type="button" class="studio-btn-ghost sv-ts-topic-del" data-feature="${esc(featureKey)}" data-topic-index="${i}">Remove topic</button>
            </div>`;
        })
        .join('');
    return `
        <div class="studio-video-ts__section">
            <h4 class="studio-subheading">${esc(title)}</h4>
            <p class="studio-muted">${esc(hint)}</p>
            ${rows || '<p class="studio-muted">No idea timestamps yet.</p>'}
            <button type="button" class="studio-btn-ghost sv-ts-topic-add" data-feature="${esc(featureKey)}">Add idea timestamp</button>
        </div>`;
}

/**
 * @param {{ previewChapters?: unknown[], previewTopics?: unknown[], fullChapters?: unknown[], fullTopics?: unknown[] }} state
 * @param {Array<Record<string, unknown>>} artists
 */
export function renderVideoTimestampEditorHtml(state, artists) {
    const previewChapters = Array.isArray(state.previewChapters) ? state.previewChapters : [];
    const previewTopics = Array.isArray(state.previewTopics) ? state.previewTopics : [];
    const fullChapters = Array.isArray(state.fullChapters) ? state.fullChapters : [];
    const fullTopics = Array.isArray(state.fullTopics) ? state.fullTopics : [];
    return `
        <div class="studio-video-ts studio-community__timestamp-shell">
            <details class="studio-community__timestamp-group studio-video-ts__group" open>
                <summary>
                    <span>Preview video timestamps</span>
                    <small>Shown to non-members and teaser viewers.</small>
                </summary>
                <div class="studio-community__timestamp-grid studio-video-ts__grid">
                    ${renderChapterRowsHtml('preview', previewChapters, artists, 'People', 'Artist moments for the public preview.')}
                    ${renderTopicRowsHtml('preview', previewTopics, 'Ideas', 'Topic or quote timestamps for the public preview.')}
                </div>
            </details>
            <details class="studio-community__timestamp-group studio-video-ts__group">
                <summary>
                    <span>Full video timestamps</span>
                    <small>Shown after the members-only full video unlocks.</small>
                </summary>
                <div class="studio-community__timestamp-grid studio-video-ts__grid">
                    ${renderChapterRowsHtml('full', fullChapters, artists, 'People', 'Artist moments for the full members-only video.')}
                    ${renderTopicRowsHtml('full', fullTopics, 'Ideas', 'Topic or quote timestamps for the full members-only video.')}
                </div>
            </details>
        </div>`;
}

/**
 * @param {ParentNode} root
 * @param {string} featureKey
 */
export function collectChaptersFromPanel(root, featureKey) {
    const rows = root.querySelectorAll(`[data-chapter-row="${featureKey}"]`);
    return Array.from(rows)
        .map((row) => {
            const artistId = String(row.querySelector('.sv-ts-chapter-artist')?.value ?? '').trim();
            const timestampSec = timestampFromInput(row.querySelector('.sv-ts-chapter-time')?.value ?? '');
            return artistId ? { artistId, timestampSec } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.timestampSec - b.timestampSec);
}

/**
 * @param {ParentNode} root
 * @param {string} featureKey
 */
export function collectTopicsFromPanel(root, featureKey) {
    const rows = root.querySelectorAll(`[data-topic-row="${featureKey}"]`);
    return Array.from(rows)
        .map((row) => {
            const titleEn = String(row.querySelector('.sv-ts-topic-title-en')?.value ?? '').trim();
            const titleJa = String(row.querySelector('.sv-ts-topic-title-ja')?.value ?? '').trim();
            const quoteEn = String(row.querySelector('.sv-ts-topic-quote-en')?.value ?? '').trim();
            const quoteJa = String(row.querySelector('.sv-ts-topic-quote-ja')?.value ?? '').trim();
            const timestampSec = timestampFromInput(row.querySelector('.sv-ts-topic-time')?.value ?? '');
            return titleEn || titleJa || quoteEn || quoteJa
                ? { timestampSec, titleEn, titleJa, quoteEn, quoteJa }
                : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.timestampSec - b.timestampSec);
}

/**
 * @param {HTMLElement} root
 * @param {Array<Record<string, unknown>>} artists
 * @param {() => {
 *   previewChapters: unknown[],
 *   previewTopics: unknown[],
 *   fullChapters: unknown[],
 *   fullTopics: unknown[],
 * }} readStateFromDom
 * @param {(state: ReturnType<readStateFromDom>) => void} writeState
 * @param {() => void} refresh
 */
export function bindVideoTimestampEditor(root, artists, readStateFromDom, writeState, refresh) {
    const syncFromDom = () => writeState(readStateFromDom());

    root.querySelectorAll('.sv-ts-chapter-add').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const featureKey = btn.getAttribute('data-feature') || '';
            const state = readStateFromDom();
            const prop = featureKey === 'full' ? 'fullChapters' : 'previewChapters';
            const chapters = [...(Array.isArray(state[prop]) ? state[prop] : []), { artistId: '', timestampSec: 0 }];
            writeState({ ...state, [prop]: chapters });
            refresh();
        });
    });

    root.querySelectorAll('.sv-ts-chapter-del').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const featureKey = btn.getAttribute('data-feature') || '';
            const chapterIndex = Number(btn.getAttribute('data-chapter-index') ?? -1);
            const state = readStateFromDom();
            const prop = featureKey === 'full' ? 'fullChapters' : 'previewChapters';
            const chapters = [...(Array.isArray(state[prop]) ? state[prop] : [])];
            if (chapterIndex >= 0) chapters.splice(chapterIndex, 1);
            writeState({ ...state, [prop]: chapters });
            refresh();
        });
    });

    root.querySelectorAll('.sv-ts-topic-add').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const featureKey = btn.getAttribute('data-feature') || '';
            const state = readStateFromDom();
            const prop = featureKey === 'full' ? 'fullTopics' : 'previewTopics';
            const topics = [
                ...(Array.isArray(state[prop]) ? state[prop] : []),
                { timestampSec: 0, titleEn: '', titleJa: '', quoteEn: '', quoteJa: '' },
            ];
            writeState({ ...state, [prop]: topics });
            refresh();
        });
    });

    root.querySelectorAll('.sv-ts-topic-del').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const featureKey = btn.getAttribute('data-feature') || '';
            const topicIndex = Number(btn.getAttribute('data-topic-index') ?? -1);
            const state = readStateFromDom();
            const prop = featureKey === 'full' ? 'fullTopics' : 'previewTopics';
            const topics = [...(Array.isArray(state[prop]) ? state[prop] : [])];
            if (topicIndex >= 0) topics.splice(topicIndex, 1);
            writeState({ ...state, [prop]: topics });
            refresh();
        });
    });

    root.querySelectorAll('.studio-video-ts__group').forEach((details) => {
        if (!(details instanceof HTMLDetailsElement)) return;
        details.addEventListener('toggle', syncFromDom);
    });
}
