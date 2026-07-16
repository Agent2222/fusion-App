/**
 * Audio row — custom control bar (no native `<audio controls>`), so no ⋮ menu / playback-speed UI.
 * Source: CMS `audio` list + `data-audio-id`.
 */
import { getContentBundleForStudio, subscribeDataSource } from '../../utils/database.js';
import { isJournalListingPage } from '../../utils/journalListingPage.js';
import {
    FEED_ROW_PENDING_WRAPPER_STYLES,
    PH_LOADER_BASE_STYLES,
    feedRowLoaderHtml,
} from '../../utils/programHeroLoader.js';

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

class AudioRowComponent extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        /** @type {(() => void) | null} */
        this._teardown = null;
        /** @type {Array<unknown> | null} */
        this._audioList = null;
        /** @type {(() => void) | null} */
        this._unsubData = null;
        /** True while CMS `audio` bundle loads (skipped when `data-audio-src` provides URL). */
        this._audioListPending = false;
        /** Multi-source pagination state */
        this._pageIdx = 0;
        /** @type {{ url: string, title: string }[] | null} */
        this._sources = null;
    }

    _needsAudioList() {
        if (this._sources && this._sources.length > 0) return false;
        return !String(this.getAttribute('data-audio-src') || '').trim();
    }

    static get observedAttributes() {
        return ['active', 'data-audio-id', 'data-audio-src', 'data-audio-title', 'data-audio-sources'];
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if (oldVal === newVal) return;
        if (prop === 'data-audio-sources') {
            this._parseSources();
            this._pageIdx = 0;
        }
        this.render();
    }

    _parseSources() {
        const raw = this.getAttribute('data-audio-sources');
        if (!raw) { this._sources = null; return; }
        try {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr) && arr.length > 0) {
                this._sources = arr.map((e) => ({
                    url: String(e?.url ?? ''),
                    title: String(e?.title ?? 'Audio'),
                })).filter((e) => e.url);
            } else {
                this._sources = null;
            }
        } catch { this._sources = null; }
    }

    connectedCallback() {
        this._parseSources();
        if (this._unsubData) this._unsubData();
        this._unsubData = subscribeDataSource(() => {
            if (this._needsAudioList()) {
                this._audioListPending = true;
                this.render();
            }
            void this._loadAudioList();
        });
        this._audioListPending = this._needsAudioList();
        this.render();
        void this._loadAudioList();
    }

    disconnectedCallback() {
        if (this._teardown) {
            this._teardown();
            this._teardown = null;
        }
        if (this._unsubData) {
            this._unsubData();
            this._unsubData = null;
        }
    }

    async _loadAudioList() {
        if (!this._needsAudioList()) {
            this._audioListPending = false;
            this._audioList = null;
            this.render();
            return;
        }
        try {
            const raw = await getContentBundleForStudio('audio');
            this._audioList = Array.isArray(raw) ? raw : null;
        } catch {
            this._audioList = null;
        } finally {
            this._audioListPending = false;
            this.render();
        }
    }

    _renderLoading() {
        this.style.display = '';
        this.shadow.innerHTML = `
            <style>
                :host { display: block; }
                ${PH_LOADER_BASE_STYLES}
                ${FEED_ROW_PENDING_WRAPPER_STYLES}
            </style>
            ${feedRowLoaderHtml({ ariaLabel: 'Loading audio' })}
        `;
    }

    _getAudioId() {
        const raw = this.getAttribute('data-audio-id');
        return raw == null || String(raw).trim() === '' ? null : String(raw).trim();
    }

    _resolveEntry() {
        if (this._sources && this._sources.length > 0) {
            const idx = Math.max(0, Math.min(this._pageIdx, this._sources.length - 1));
            const s = this._sources[idx];
            return { id: 'multi-' + idx, link: s.url, title: s.title || 'Audio' };
        }
        const srcOverride = String(this.getAttribute('data-audio-src') || '').trim();
        if (srcOverride) {
            return {
                id: this.getAttribute('data-audio-id') || 'artist-audio',
                link: srcOverride,
                title: String(this.getAttribute('data-audio-title') || 'Artist audio').trim(),
            };
        }
        const id = this._getAudioId();
        const list = this._audioList;
        if (id == null || !Array.isArray(list)) return null;
        return list.find((a) => String(/** @type {Record<string, unknown>} */ (a).id) === id) ?? null;
    }

    _wireCustomPlayer(audio) {
        if (this._teardown) {
            this._teardown();
            this._teardown = null;
        }

        const btn = this.shadowRoot.querySelector('.player-play');
        const seek = this.shadowRoot.querySelector('.player-seek');
        const curEl = this.shadowRoot.querySelector('.player-time-cur');
        const durEl = this.shadowRoot.querySelector('.player-time-dur');
        if (!audio || !btn || !seek || !curEl || !durEl) return;

        const syncSeekMax = () => {
            const d = audio.duration;
            if (Number.isFinite(d) && d > 0) {
                seek.max = String(d);
                seek.step = '0.1';
            }
        };

        const onTime = () => {
            curEl.textContent = formatTime(audio.currentTime);
            durEl.textContent = formatTime(audio.duration);
            syncSeekMax();
            if (Number.isFinite(audio.duration) && audio.duration > 0) {
                seek.value = String(audio.currentTime);
            }
        };

        const onMeta = () => {
            syncSeekMax();
            durEl.textContent = formatTime(audio.duration);
            onTime();
        };

        const onPlay = () => {
            btn.textContent = '⏸';
            btn.setAttribute('aria-label', 'Pause');
        };
        const onPause = () => {
            btn.textContent = '▶';
            btn.setAttribute('aria-label', 'Play');
        };

        audio.addEventListener('loadedmetadata', onMeta);
        audio.addEventListener('durationchange', onMeta);
        audio.addEventListener('timeupdate', onTime);
        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);
        audio.addEventListener('ended', onPause);

        btn.addEventListener('click', () => {
            if (audio.paused) {
                audio.play().catch(() => {});
            } else {
                audio.pause();
            }
        });

        seek.addEventListener('input', () => {
            const v = parseFloat(seek.value);
            if (Number.isFinite(v)) audio.currentTime = v;
        });

        this._teardown = () => {
            audio.removeEventListener('loadedmetadata', onMeta);
            audio.removeEventListener('durationchange', onMeta);
            audio.removeEventListener('timeupdate', onTime);
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
            audio.removeEventListener('ended', onPause);
        };

        onMeta();
    }

    render() {
        if (this._teardown) {
            this._teardown();
            this._teardown = null;
        }

        if (this._needsAudioList() && this._audioListPending) {
            this._renderLoading();
            return;
        }

        const entry = this._resolveEntry();
        const src = entry?.link ? String(entry.link).trim() : '';
        const label = entry?.title ? String(entry.title) : 'Audio';

        if (!entry || !src) {
            if (isJournalListingPage()) {
                this.style.display = 'none';
                this.shadow.innerHTML = `<style>:host { display: none !important; }</style>`;
                return;
            }
            const id = this._getAudioId();
            const msg =
                id != null ? `No audio entry for id “${escapeHtml(id)}”.` : 'Missing or invalid audio source.';
            this.shadow.innerHTML = `
                <style>:host { display: block; color: var(--c2); padding: 1rem; opacity: 0.85; }</style>
                <div part="empty">${msg}</div>
            `;
            return;
        }
        this.style.display = '';

        this.shadow.innerHTML = `
            <style>
                :host { display: block; }

                .audio-row {
                    width: 100%;
                    max-width: 42rem;
                    box-sizing: border-box;
                    padding: 1rem 0 1.5rem;
                    margin: 10% auto;
                }

                :host([data-layout="profile"]) .audio-row {
                    margin: 0 auto;
                    padding: 0.5rem 0;
                    max-width: 36rem;
                }

                .audio-row-inner {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    border: 1px solid var(--c2);
                    border-radius: 4px;
                    background: var(--bg);
                }

                /* Hidden media element — playback only; UI is custom below */
                .media-audio {
                    position: absolute;
                    width: 1px;
                    height: 1px;
                    padding: 0;
                    margin: -1px;
                    overflow: hidden;
                    clip: rect(0, 0, 0, 0);
                    white-space: nowrap;
                    border: 0;
                }

                .audio-label {
                    font-size: clamp(0.7rem, 1vw, 0.85rem);
                    font-variation-settings: var(--fv-label-strong);
                    color: var(--c2);
                    opacity: 0.85;
                    margin-bottom: 0.65rem;
                }

                .player-controls {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .player-row {
                    display: flex;
                    align-items: center;
                    gap: 0.65rem;
                    width: 100%;
                }

                .player-play {
                    flex: 0 0 auto;
                    width: 2.25rem;
                    height: 2.25rem;
                    border: 1px solid var(--c2);
                    border-radius: 50%;
                    background: var(--c3);
                    color: var(--c2);
                    font-size: 0.85rem;
                    line-height: 1;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0;
                    transition: background 0.2s ease;
                }

                .player-play:hover {
                    background: var(--c5);
                }

                .player-seek {
                    flex: 1 1 auto;
                    min-width: 0;
                    height: 0.35rem;
                    accent-color: var(--c2);
                    cursor: pointer;
                }

                .player-time {
                    font-size: clamp(0.65rem, 0.9vw, 0.8rem);
                    font-variation-settings: var(--fv-label);
                    color: var(--c2);
                    opacity: 0.9;
                    user-select: none;
                    text-align: right;
                    align-self: flex-end;
                }

                @media (max-width: 768px) {
                    .audio-row {
                        margin: 6% auto;
                        max-width: 100%;
                        padding: 0.75rem 0.75rem 1.25rem;
                    }
                }

                @media (max-width: 480px) {
                    .player-row {
                        flex-wrap: wrap;
                    }

                    .player-seek {
                        min-width: 120px;
                    }
                }

                .audio-row-pagination {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    margin-top: 0.5rem;
                }

                .audio-row-page-btn {
                    width: 1.75rem;
                    height: 1.75rem;
                    border: 1px solid var(--c2);
                    border-radius: 50%;
                    background: transparent;
                    color: var(--c2);
                    font-size: 0.85rem;
                    line-height: 1;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0;
                    transition: background 0.2s ease;
                }

                .audio-row-page-btn:hover { background: var(--c5); }
                .audio-row-page-btn:disabled { opacity: 0.3; cursor: default; }

                .audio-row-page-info {
                    font-size: clamp(0.65rem, 0.9vw, 0.8rem);
                    font-variation-settings: var(--fv-label);
                    color: var(--c2);
                    opacity: 0.85;
                    user-select: none;
                }
            </style>
            <div class="audio-row" part="audio-row">
                <div class="audio-row-inner">
                    <div class="audio-label">${escapeHtml(label)}</div>
                    <audio class="media-audio" preload="metadata" playsinline tabindex="-1"></audio>
                    <div class="player-controls">
                        <div class="player-row">
                            <button type="button" class="player-play" aria-label="Play">▶</button>
                            <input type="range" class="player-seek" min="0" max="100" value="0" step="any" aria-label="Seek" />
                        </div>
                        <div class="player-time">
                            <span class="player-time-cur">0:00</span>
                            &nbsp;/&nbsp;
                            <span class="player-time-dur">0:00</span>
                        </div>
                    </div>
                    ${this._sources && this._sources.length > 1 ? `
                    <div class="audio-row-pagination">
                        <button type="button" class="audio-row-page-btn" data-page-dir="prev" aria-label="Previous"${this._pageIdx <= 0 ? ' disabled' : ''}>\u2039</button>
                        <span class="audio-row-page-info">${this._pageIdx + 1} / ${this._sources.length}</span>
                        <button type="button" class="audio-row-page-btn" data-page-dir="next" aria-label="Next"${this._pageIdx >= this._sources.length - 1 ? ' disabled' : ''}>\u203A</button>
                    </div>` : ''}
                </div>
            </div>
        `;

        const audioEl = this.shadowRoot.querySelector('audio.media-audio');
        if (audioEl) {
            audioEl.src = src;
            this._wireCustomPlayer(audioEl);
        }

        if (this._sources && this._sources.length > 1) {
            this.shadowRoot.querySelectorAll('[data-page-dir]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const dir = btn.getAttribute('data-page-dir');
                    if (dir === 'prev' && this._pageIdx > 0) {
                        this._pageIdx--;
                    } else if (dir === 'next' && this._pageIdx < this._sources.length - 1) {
                        this._pageIdx++;
                    }
                    this.render();
                });
            });
        }
    }
}

customElements.define('app-audio-row', AudioRowComponent);

export { AudioRowComponent };
