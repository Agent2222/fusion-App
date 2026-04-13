/**
 * Audio row — custom control bar (no native `<audio controls>`), so no ⋮ menu / playback-speed UI.
 * Source: CMS `audio` list + `data-audio-id`.
 */
import { getContentBundleForStudio, subscribeDataSource } from '../../utils/database.js';

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
    }

    static get observedAttributes() {
        return ['active', 'data-audio-id'];
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if (prop === 'active' || prop === 'data-audio-id') {
            if (oldVal === newVal) return;
            this.render();
        }
    }

    connectedCallback() {
        if (this._unsubData) this._unsubData();
        this._unsubData = subscribeDataSource(() => void this._loadAudioList());
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
        const raw = await getContentBundleForStudio('audio');
        this._audioList = Array.isArray(raw) ? raw : null;
        this.render();
    }

    _getAudioId() {
        const raw = this.getAttribute('data-audio-id');
        return raw == null || String(raw).trim() === '' ? null : String(raw).trim();
    }

    _resolveEntry() {
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

        const entry = this._resolveEntry();
        const src = entry?.link ? String(entry.link).trim() : '';
        const label = entry?.title ? String(entry.title) : 'Audio';

        if (!entry || !src) {
            const id = this._getAudioId();
            const msg =
                id != null ? `No audio entry for id “${escapeHtml(id)}”.` : 'Missing or invalid audio source.';
            this.shadow.innerHTML = `
                <style>:host { display: block; color: var(--c2); padding: 1rem; opacity: 0.85; }</style>
                <div part="empty">${msg}</div>
            `;
            return;
        }

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
                </div>
            </div>
        `;

        const audioEl = this.shadowRoot.querySelector('audio.media-audio');
        if (audioEl) {
            audioEl.src = src;
            this._wireCustomPlayer(audioEl);
        }
    }
}

customElements.define('app-audio-row', AudioRowComponent);

export { AudioRowComponent };
