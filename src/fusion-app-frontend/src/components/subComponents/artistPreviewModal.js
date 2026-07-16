/**
 * Public artist preview modal — mock-faithful editorial layout.
 * Open via `fusion-open-artist-preview` with `{ artist }` detail.
 */
import { navigate } from '../../router.js';
import { buildArtistPreviewViewModel } from '../../utils/artistPreviewModel.js';
import curvedWindowMaskUrl from '../../assets/fusion-curved-window-mask/fusion-curved-window-mask.svg';

/** Path matching fusion-curved-window-mask.svg (viewBox 0 0 600 540); larger TR radius. */
const CURVED_WINDOW_PATH =
    'M120 0 H340 Q600 0 600 260 V480 Q600 540 540 540 H140 C90 540 45 520 20 485 C-10 440 5 380 25 320 C50 245 55 180 45 115 C35 55 65 10 120 0 Z';

const FADE_MS = 4800;
const CROSSFADE_MS = 1200;
/** Slow zoom while a slide is on screen (Ken Burns). */
const STAGE_ZOOM_MS = 12000;

const PLAY_ICON =
    '<svg class="apm-play-ico" viewBox="0 0 24 24" width="11" height="11" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 5.5v13l11-6.5L8 5.5z"/></svg>';
const PAUSE_ICON =
    '<svg class="apm-play-ico" viewBox="0 0 24 24" width="11" height="11" aria-hidden="true" focusable="false"><path fill="currentColor" d="M7 5h3.5v14H7V5zm6.5 0H17v14h-3.5V5z"/></svg>';
const MUTE_ICON =
    '<svg class="apm-mute-ico" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4 9v6h3l5 4V5L7 9H4zm11.5 3c0-1.77-1-3.29-2.5-4.03v8.05c1.5-.74 2.5-2.26 2.5-4.02z"/></svg>';

/**
 * @param {string} s
 */
function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * @returns {'en' | 'ja'}
 */
function readLocale() {
    try {
        if (typeof window.getLocale === 'function' && window.getLocale() === 'ja') return 'ja';
    } catch (_) {
        /* ignore */
    }
    return 'en';
}

class ArtistPreviewModal extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        /** @type {HTMLDialogElement | null} */
        this._dlg = null;
        /** @type {ReturnType<typeof setInterval> | null} */
        this._fadeTimer = null;
        /** @type {number} */
        this._slide = 0;
        /** @type {string[]} */
        this._images = [];
        /** @type {HTMLElement | null} */
        this._returnFocus = null;
        /** @type {boolean} */
        this._envSuspended = false;
        /** @type {HTMLAudioElement | null} */
        this._previewAudio = null;
        /** @type {boolean} */
        this._seekDragging = false;
        /** @type {(e: Event) => void} */
        this._onOpen = (e) => {
            const detail = /** @type {CustomEvent} */ (e).detail || {};
            const artist = detail.artist;
            if (artist) this.open(artist, detail.returnFocus ?? null);
        };
        this._onLocale = () => {
            if (this._dlg?.open && this._artist) this._renderContent(this._artist);
        };
        /** @type {unknown} */
        this._artist = null;
        /** @type {(e: KeyboardEvent) => void} */
        this._onKeydown = (e) => {
            if (!this._dlg?.open) return;
            if (e.key === 'Escape') {
                e.stopPropagation();
                this.close();
            }
            if (e.key === 'Tab') this._trapFocus(e);
        };
    }

    connectedCallback() {
        this.renderShell();
        window.addEventListener('fusion-open-artist-preview', this._onOpen);
        window.addEventListener('fusion-localechange', this._onLocale);
    }

    disconnectedCallback() {
        window.removeEventListener('fusion-open-artist-preview', this._onOpen);
        window.removeEventListener('fusion-localechange', this._onLocale);
        this._stopFade();
        this._teardownPreviewAudio();
    }

    /**
     * @param {unknown} artist
     * @param {HTMLElement | null} [returnFocus]
     */
    open(artist, returnFocus = null) {
        this._artist = artist;
        this._returnFocus =
            returnFocus instanceof HTMLElement
                ? returnFocus
                : document.activeElement instanceof HTMLElement
                  ? document.activeElement
                  : null;
        this._renderContent(artist);
        const dlg = this._dlg || this.shadowRoot?.querySelector('.apm-dialog');
        if (dlg && typeof dlg.showModal === 'function' && !dlg.open) {
            dlg.showModal();
            document.addEventListener('keydown', this._onKeydown, true);
            requestAnimationFrame(() => {
                const closeBtn = this.shadowRoot?.querySelector('.apm-close');
                if (!(closeBtn instanceof HTMLElement)) return;
                /* Avoid :focus-visible / UA blue ring from programmatic focus on open. */
                closeBtn.focus({ preventScroll: true });
            });
            this._startFade();
        }
    }

    close() {
        this._stopFade();
        this._teardownPreviewAudio();
        const dlg = this._dlg || this.shadowRoot?.querySelector('.apm-dialog');
        if (dlg && typeof dlg.close === 'function' && dlg.open) dlg.close();
        document.removeEventListener('keydown', this._onKeydown, true);
        const focusEl = this._returnFocus;
        this._returnFocus = null;
        requestAnimationFrame(() => focusEl?.focus?.());
    }

    /**
     * @param {KeyboardEvent} e
     */
    _trapFocus(e) {
        const root = this.shadowRoot;
        if (!root) return;
        const focusable = [
            ...root.querySelectorAll(
                'button:not([disabled]), [href], input, audio, [tabindex]:not([tabindex="-1"])',
            ),
        ].filter((el) => el instanceof HTMLElement && !el.hasAttribute('disabled'));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = root.activeElement;
        if (e.shiftKey && active === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
        }
    }

    _stopFade() {
        if (this._fadeTimer) {
            clearInterval(this._fadeTimer);
            this._fadeTimer = null;
        }
    }

    _startFade() {
        this._stopFade();
        if (this._images.length <= 1) return;
        if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }
        this._fadeTimer = setInterval(() => {
            this._slide = (this._slide + 1) % this._images.length;
            this._applySlide();
        }, FADE_MS);
    }

    _applySlide() {
        const stages = this.shadowRoot?.querySelectorAll('.apm-stage-img');
        if (!stages?.length) return;
        stages.forEach((el, i) => {
            el.classList.toggle('is-active', i === this._slide);
        });
    }

    _suspendSoundEnv() {
        if (this._envSuspended) return;
        this._envSuspended = true;
        window.dispatchEvent(new CustomEvent('fusion-preview-audio-suspend'));
    }

    _resumeSoundEnv() {
        if (!this._envSuspended) return;
        this._envSuspended = false;
        window.dispatchEvent(new CustomEvent('fusion-preview-audio-resume'));
    }

    _pauseAudio() {
        const audio = this._previewAudio || this.shadowRoot?.querySelector('audio');
        if (audio instanceof HTMLAudioElement) {
            audio.pause();
        }
    }

    _teardownPreviewAudio() {
        this._pauseAudio();
        this._previewAudio = null;
        this._seekDragging = false;
        this._resumeSoundEnv();
    }

    /**
     * Thin fill track, matching sound-environment range styling.
     * @param {HTMLInputElement | null} input
     */
    _styleSeekRange(input) {
        if (!input || input.type !== 'range') return;
        const min = Number(input.min) || 0;
        const max = Number(input.max) || 100;
        const n = Number(input.value);
        const pct = max > min ? ((n - min) / (max - min)) * 100 : 0;
        input.style.setProperty('--apm-pct', `${Math.min(100, Math.max(0, pct))}%`);
    }

    /**
     * @param {HTMLAudioElement} audio
     * @param {HTMLInputElement | null} seek
     * @param {HTMLElement | null} timeEl
     * @param {HTMLElement | null} durEl
     */
    _syncSeekUi(audio, seek, timeEl, durEl) {
        const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
        const cur = Math.max(0, audio.currentTime || 0);
        if (seek && !this._seekDragging) {
            seek.max = String(dur || 0);
            seek.value = String(Math.min(dur || 0, cur));
            this._styleSeekRange(seek);
        }
        if (timeEl) timeEl.textContent = formatTime(cur);
        if (durEl) durEl.textContent = formatTime(dur);
    }

    /**
     * @param {HTMLAudioElement} audio
     * @param {HTMLButtonElement} playBtn
     * @param {HTMLElement | null} timeEl
     * @param {HTMLElement | null} durEl
     */
    async _playPreviewAudio(audio, playBtn, timeEl, durEl) {
        try {
            this._suspendSoundEnv();
            await audio.play();
            playBtn.innerHTML = PAUSE_ICON;
            playBtn.setAttribute('aria-label', 'Pause');
        } catch {
            playBtn.innerHTML = PLAY_ICON;
            playBtn.setAttribute('aria-label', 'Play');
            this._resumeSoundEnv();
        }
        if (durEl && Number.isFinite(audio.duration) && audio.duration > 0) {
            durEl.textContent = formatTime(audio.duration);
        }
        if (timeEl) timeEl.textContent = formatTime(audio.currentTime || 0);
    }

    /**
     * @param {unknown} artist
     */
    _renderContent(artist) {
        const loc = readLocale();
        const vm = buildArtistPreviewViewModel(artist, loc);
        this._images = vm.images;
        this._slide = 0;
        const en = loc === 'en';
        const cta = en ? 'View full profile' : 'プロフィールを見る';
        const closeLabel = en ? 'Close' : '閉じる';

        const imgsHtml = vm.images.length
            ? vm.images
                  .map(
                      (src, i) =>
                          `<img class="apm-stage-img${i === 0 ? ' is-active' : ''}" src="${esc(src)}" alt="" decoding="async" data-apm-idx="${i}" />`,
                  )
                  .join('')
            : `<div class="apm-stage-empty" aria-hidden="true"></div>`;

        const audioHtml = vm.audio
            ? `
            <div class="apm-player">
                <button type="button" class="apm-play" aria-label="${en ? 'Play' : '再生'}">${PLAY_ICON}</button>
                <div class="apm-meta">
                    <div class="apm-meta-title">${esc(vm.audio.title || (en ? 'Audio' : '音声'))}</div>
                    <div class="apm-meta-artist">${esc(vm.name)}</div>
                </div>
                <div class="apm-seek-wrap">
                    <input
                        type="range"
                        class="apm-seek"
                        id="apmSeek"
                        min="0"
                        max="0"
                        value="0"
                        step="0.01"
                        aria-label="${en ? 'Seek' : 'シーク'}"
                    />
                </div>
                <div class="apm-times" aria-hidden="true">
                    <span class="apm-time" id="apmTime">00:00</span>
                    <span class="apm-time-sep">/</span>
                    <span class="apm-dur" id="apmDur">00:00</span>
                </div>
                <button type="button" class="apm-mute" aria-label="${en ? 'Mute' : 'ミュート'}" title="${en ? 'Mute' : 'ミュート'}">
                    ${MUTE_ICON}
                </button>
                <audio preload="auto" src="${esc(vm.audio.url)}"></audio>
            </div>`
            : '';

        const body = this.shadowRoot?.querySelector('.apm-body');
        if (!body) return;
        body.innerHTML = `
            <button type="button" class="apm-close" aria-label="${esc(closeLabel)}">×</button>
            <div class="apm-layout">
                <div class="apm-copy">
                    <div class="apm-texture" aria-hidden="true"></div>
                    <h2 class="apm-name" id="apmTitle">${esc(vm.name)}</h2>
                    <p class="apm-blurb">${esc(vm.blurb)}</p>
                    <button type="button" class="apm-cta" data-slug="${esc(vm.slug)}">${esc(cta)} <span aria-hidden="true">→</span></button>
                </div>
                <div class="apm-visual">
                    <div class="apm-blob apm-blob--green" aria-hidden="true"></div>
                    <div class="apm-frame">
                        <div class="apm-stage">${imgsHtml}</div>
                        <svg
                            class="apm-frame-stroke"
                            viewBox="0 0 600 540"
                            preserveAspectRatio="none"
                            aria-hidden="true"
                            focusable="false"
                        >
                            <path
                                d="${CURVED_WINDOW_PATH}"
                                fill="none"
                                stroke="#111"
                                stroke-width="2.4"
                                vector-effect="non-scaling-stroke"
                            />
                        </svg>
                    </div>
                </div>
            </div>
            ${audioHtml}
        `;

        body.querySelector('.apm-close')?.addEventListener('click', () => this.close());
        body.querySelector('.apm-cta')?.addEventListener('click', () => {
            const slug = body.querySelector('.apm-cta')?.getAttribute('data-slug') || vm.slug;
            this.close();
            if (slug) navigate(`/profile/${encodeURIComponent(slug)}`);
        });

        this._pauseAudio();
        this._previewAudio = null;
        this._seekDragging = false;
        const audio = body.querySelector('audio');
        const playBtn = body.querySelector('.apm-play');
        const muteBtn = body.querySelector('.apm-mute');
        const timeEl = body.querySelector('#apmTime');
        const durEl = body.querySelector('#apmDur');
        const seekEl = body.querySelector('#apmSeek');
        if (!(audio instanceof HTMLAudioElement)) {
            this._resumeSoundEnv();
        }
        if (audio instanceof HTMLAudioElement && playBtn instanceof HTMLButtonElement) {
            this._previewAudio = audio;
            const seek = seekEl instanceof HTMLInputElement ? seekEl : null;
            const time = timeEl instanceof HTMLElement ? timeEl : null;
            const dur = durEl instanceof HTMLElement ? durEl : null;
            const syncPlayUi = () => {
                const playing = !audio.paused && !audio.ended;
                playBtn.innerHTML = playing ? PAUSE_ICON : PLAY_ICON;
                playBtn.setAttribute('aria-label', playing ? (en ? 'Pause' : '一時停止') : en ? 'Play' : '再生');
            };
            const syncSeek = () => this._syncSeekUi(audio, seek, time, dur);
            playBtn.addEventListener('click', () => {
                if (audio.paused) {
                    void this._playPreviewAudio(audio, playBtn, time, dur);
                } else {
                    audio.pause();
                    syncPlayUi();
                }
            });
            audio.addEventListener('loadedmetadata', syncSeek);
            audio.addEventListener('durationchange', syncSeek);
            audio.addEventListener('timeupdate', syncSeek);
            audio.addEventListener('ended', () => {
                syncPlayUi();
                syncSeek();
                this._resumeSoundEnv();
            });
            audio.addEventListener('pause', () => {
                syncPlayUi();
            });
            if (seek) {
                const onSeekInput = () => {
                    this._seekDragging = true;
                    this._styleSeekRange(seek);
                    if (time) time.textContent = formatTime(Number(seek.value) || 0);
                };
                const onSeekCommit = () => {
                    const next = Number(seek.value) || 0;
                    if (Number.isFinite(next)) audio.currentTime = next;
                    this._seekDragging = false;
                    syncSeek();
                };
                seek.addEventListener('pointerdown', () => {
                    this._seekDragging = true;
                });
                seek.addEventListener('input', onSeekInput);
                seek.addEventListener('change', onSeekCommit);
                seek.addEventListener('pointerup', onSeekCommit);
                seek.addEventListener('keyup', (e) => {
                    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
                        onSeekCommit();
                    }
                });
                this._styleSeekRange(seek);
            }
            if (muteBtn instanceof HTMLButtonElement) {
                muteBtn.addEventListener('click', () => {
                    audio.muted = !audio.muted;
                    muteBtn.classList.toggle('is-muted', audio.muted);
                    muteBtn.setAttribute('aria-label', audio.muted ? (en ? 'Unmute' : 'ミュート解除') : en ? 'Mute' : 'ミュート');
                });
            }
            syncSeek();
            void this._playPreviewAudio(audio, playBtn, time, dur);
        }

        /* If a curated URL 404s, swap in the next slide or a roster/profile fallback. */
        body.querySelectorAll('.apm-stage-img').forEach((imgEl) => {
            if (!(imgEl instanceof HTMLImageElement)) return;
            imgEl.addEventListener('error', () => {
                if (imgEl.dataset.apmFallback === '1') return;
                const idx = Number(imgEl.getAttribute('data-apm-idx') || 0);
                const next = vm.images[idx + 1];
                if (next && next !== imgEl.src) {
                    imgEl.src = next;
                    return;
                }
                imgEl.dataset.apmFallback = '1';
                const a = /** @type {Record<string, unknown>} */ (artist || {});
                const fallback =
                    String(a.image ?? '').trim() ||
                    String(a.heroProfileImage ?? a.hero_profile_image ?? '').trim();
                if (fallback && fallback !== imgEl.getAttribute('src')) {
                    imgEl.src = fallback;
                }
            });
        });
    }

    renderShell() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    font-family: 'momochidori-variable', sans-serif;
                    color: var(--c2, #000);
                }
                .apm-dialog {
                    width: min(800px, 90vw);
                    max-width: 90vw;
                    max-height: min(92vh, 720px);
                    margin: auto;
                    padding: 0;
                    border: none;
                    border-radius: 24px;
                    background: var(--bg, #f7f2ef);
                    color: var(--c2, #000);
                    box-shadow: 0 28px 80px rgba(0, 0, 0, 0.22);
                    overflow: hidden;
                }
                .apm-dialog::backdrop {
                    background: rgba(20, 18, 16, 0.45);
                    -webkit-backdrop-filter: blur(10px);
                    backdrop-filter: blur(10px);
                }
                .apm-body {
                    position: relative;
                    padding: 0;
                    box-sizing: border-box;
                    min-height: 500px;
                }
                .apm-close {
                    position: absolute;
                    top: 0.85rem;
                    left: 0.85rem;
                    z-index: 5;
                    width: 2.1rem;
                    height: 2.1rem;
                    border: 1px solid transparent;
                    background: transparent;
                    font-size: 1.35rem;
                    line-height: 1;
                    cursor: pointer;
                    color: var(--c2, #000);
                    border-radius: 999px;
                    outline: none;
                    -webkit-tap-highlight-color: transparent;
                    -webkit-appearance: none;
                    appearance: none;
                    user-select: none;
                    -webkit-user-select: none;
                }
                .apm-close:hover {
                    background: color-mix(in srgb, var(--c2) 8%, transparent);
                }
                .apm-close:focus,
                .apm-close:focus-visible,
                .apm-close:active {
                    outline: none !important;
                    box-shadow: none;
                    border-color: color-mix(in srgb, var(--c2) 35%, transparent);
                }
                .apm-layout {
                    display: grid;
                    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.25fr);
                    gap: 0;
                    align-items: stretch;
                    min-height: 500px;
                    height: 100%;
                }
                .apm-copy {
                    position: relative;
                    z-index: 1;
                    padding: 2.75rem 1rem 4.35rem 1.55rem;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 0.9rem;
                }
                .apm-texture {
                    position: absolute;
                    inset: 18% -5% 8% -10%;
                    opacity: 0.28;
                    pointer-events: none;
                    background:
                        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='120' viewBox='0 0 160 120'%3E%3Cpath fill='none' stroke='%23999' stroke-width='0.6' d='M0 90c20-18 40-18 60 0s40 18 60 0 40-18 60 0M0 70c20-18 40-18 60 0s40 18 60 0 40-18 60 0M0 50c20-18 40-18 60 0s40 18 60 0 40-18 60 0M0 30c20-18 40-18 60 0s40 18 60 0 40-18 60 0'/%3E%3C/svg%3E")
                        repeat;
                    background-size: 180px 135px;
                    mask-image: linear-gradient(180deg, transparent, #000 25%, #000 80%, transparent);
                    -webkit-mask-image: linear-gradient(180deg, transparent, #000 25%, #000 80%, transparent);
                }
                .apm-name {
                    position: relative;
                    margin: 0;
                    font-size: clamp(1.7rem, 2.8vw, 2.35rem);
                    line-height: 1.05;
                    font-variation-settings: var(--fv-title, "wght" 650);
                    letter-spacing: -0.02em;
                }
                .apm-blurb {
                    position: relative;
                    margin: 0;
                    max-width: 20rem;
                    font-size: clamp(0.88rem, 1.1vw, 1rem);
                    line-height: 1.5;
                    font-variation-settings: "wght" 500;
                    color: color-mix(in srgb, var(--c2) 94%, var(--bg));
                }
                .apm-cta {
                    position: relative;
                    align-self: flex-start;
                    margin-top: 0.25rem;
                    border: none;
                    border-radius: 999px;
                    background: #111;
                    color: #fff;
                    font-family: inherit;
                    font-size: clamp(0.62rem, 0.9vw, 0.72rem);
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    font-variation-settings: var(--fv-nav-active, "wght" 550);
                    padding: 0.7rem 1.15rem;
                    cursor: pointer;
                }
                .apm-cta:hover {
                    opacity: 0.9;
                }
                .apm-visual {
                    position: relative;
                    min-height: 500px;
                    height: 100%;
                    display: flex;
                    align-items: stretch;
                    justify-content: stretch;
                    /* Match mock: leave paper margin above/below; keep near the right edge. */
                    padding: 0.85rem 0.55rem 0.85rem 0;
                    margin: 0;
                    box-sizing: border-box;
                }
                .apm-blob {
                    position: absolute;
                    z-index: 0;
                    pointer-events: none;
                }
                .apm-blob--green {
                    right: 0.15rem;
                    top: 0.15rem;
                    width: 46%;
                    height: 34%;
                    border-radius: 55% 45% 50% 50%;
                    background: color-mix(in srgb, var(--c4, #a2b792) 58%, #e8efe4);
                    opacity: 0.9;
                }
                .apm-defs {
                    position: absolute;
                    width: 0;
                    height: 0;
                    overflow: hidden;
                }
                .apm-frame {
                    position: relative;
                    z-index: 1;
                    flex: 1 1 auto;
                    width: 100%;
                    min-height: 0;
                    height: 100%;
                    background: transparent;
                    overflow: visible;
                }
                .apm-stage {
                    position: absolute;
                    inset: 0;
                    overflow: hidden;
                    -webkit-mask: url("${curvedWindowMaskUrl}") center / 100% 100% no-repeat;
                    mask: url("${curvedWindowMaskUrl}") center / 100% 100% no-repeat;
                    background: transparent;
                }
                .apm-frame-stroke {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 2;
                    pointer-events: none;
                    overflow: visible;
                }
                .apm-stage-img {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    opacity: 0;
                    transform: scale(1);
                    transform-origin: center center;
                    transition: opacity ${CROSSFADE_MS}ms ease;
                }
                .apm-stage-img.is-active {
                    opacity: 1;
                    animation: apmStageZoom ${STAGE_ZOOM_MS}ms ease-out forwards;
                }
                @keyframes apmStageZoom {
                    from { transform: scale(1); }
                    to { transform: scale(1.12); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .apm-stage-img.is-active {
                        animation: none;
                    }
                }
                .apm-stage-empty {
                    position: absolute;
                    inset: 0;
                    background: color-mix(in srgb, var(--c3, #e8e2dc) 70%, var(--bg, #f7f2ef));
                }
                .apm-player {
                    position: absolute;
                    left: 1.1rem;
                    right: 1.1rem;
                    bottom: 1rem;
                    z-index: 6;
                    display: grid;
                    grid-template-columns: auto minmax(4.5rem, 8.5rem) minmax(0, 1fr) auto auto;
                    align-items: center;
                    gap: 0.45rem 0.65rem;
                    padding: 0.55rem 0.75rem 0.55rem 0.65rem;
                    background: var(--bg, #faf3f4);
                    border: 1px solid var(--c2, #000);
                    border-radius: 0;
                    box-shadow: none;
                    box-sizing: border-box;
                    color: var(--c2, #000);
                    font-family: 'momochidori-variable', 'Helvetica Neue', sans-serif;
                    font-variation-settings: 'wght' 500;
                    --apm-track-empty: color-mix(in srgb, var(--c2) 28%, var(--bg) 72%);
                    --apm-track-fill: var(--c2, #000);
                    --apm-pct: 0%;
                }
                .apm-play,
                .apm-mute {
                    border: 0;
                    margin: 0;
                    padding: 0;
                    background: transparent;
                    color: var(--c2, #000);
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    line-height: 0;
                    width: 1.4rem;
                    height: 1.4rem;
                }
                .apm-play:focus-visible,
                .apm-mute:focus-visible {
                    outline: 1px solid var(--c2, #000);
                    outline-offset: 2px;
                }
                .apm-mute.is-muted {
                    opacity: 0.4;
                }
                .apm-play-ico,
                .apm-mute-ico {
                    display: block;
                    flex-shrink: 0;
                }
                .apm-meta {
                    min-width: 0;
                }
                .apm-meta-title {
                    font-size: 0.72rem;
                    font-weight: 700;
                    font-variation-settings: "wght" 700;
                    letter-spacing: 0.02em;
                    line-height: 1.15;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .apm-meta-artist {
                    font-size: 0.62rem;
                    font-weight: 500;
                    font-variation-settings: "wght" 500;
                    opacity: 0.62;
                    line-height: 1.15;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .apm-seek-wrap {
                    display: flex;
                    align-items: center;
                    min-width: 0;
                    width: 100%;
                }
                .apm-seek {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 100%;
                    height: 1.1rem;
                    margin: 0;
                    background: transparent;
                    cursor: pointer;
                }
                .apm-seek:focus { outline: none; }
                .apm-seek:focus-visible {
                    outline: 1px solid var(--c2, #000);
                    outline-offset: 2px;
                }
                .apm-seek::-webkit-slider-runnable-track {
                    height: 1px;
                    background: linear-gradient(
                        to right,
                        var(--apm-track-fill) 0%,
                        var(--apm-track-fill) var(--apm-pct),
                        var(--apm-track-empty) var(--apm-pct),
                        var(--apm-track-empty) 100%
                    );
                }
                .apm-seek::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 10px;
                    height: 10px;
                    margin-top: -4.5px;
                    border-radius: 0;
                    border: 1px solid var(--c2, #000);
                    background: var(--bg, #faf3f4);
                    box-shadow: none;
                }
                .apm-seek::-moz-range-track {
                    height: 1px;
                    background: var(--apm-track-empty);
                    border: none;
                }
                .apm-seek::-moz-range-progress {
                    height: 1px;
                    background: var(--apm-track-fill);
                    border: none;
                }
                .apm-seek::-moz-range-thumb {
                    width: 10px;
                    height: 10px;
                    border-radius: 0;
                    border: 1px solid var(--c2, #000);
                    background: var(--bg, #faf3f4);
                    box-shadow: none;
                }
                .apm-times {
                    display: inline-flex;
                    align-items: baseline;
                    gap: 0.2rem;
                    font-size: 0.62rem;
                    font-variant-numeric: tabular-nums;
                    letter-spacing: 0.02em;
                    white-space: nowrap;
                    min-width: 5.4rem;
                    justify-content: flex-end;
                }
                .apm-time-sep {
                    opacity: 0.45;
                }
                .apm-dur {
                    opacity: 0.55;
                }
                audio { display: none; }
                @media (max-width: 720px) {
                    .apm-dialog {
                        width: min(94vw, 520px);
                        max-height: min(92vh, 760px);
                    }
                    .apm-layout {
                        grid-template-columns: 1fr;
                        min-height: 0;
                    }
                    .apm-copy {
                        padding: 1.25rem 1.25rem 4.5rem;
                        order: 1;
                    }
                    .apm-visual {
                        order: 0;
                        min-height: 280px;
                    }
                    .apm-frame {
                        min-height: 280px;
                    }
                    .apm-body {
                        min-height: 0;
                    }
                    .apm-player {
                        left: 0.75rem;
                        right: 0.75rem;
                        bottom: 0.75rem;
                        grid-template-columns: auto minmax(3rem, 1fr) minmax(3rem, 1.4fr) auto;
                        gap: 0.35rem 0.45rem;
                        padding: 0.45rem 0.55rem;
                    }
                    .apm-mute { display: none; }
                    .apm-times { min-width: 0; }
                }
            </style>
            <dialog class="apm-dialog" aria-labelledby="apmTitle">
                <div class="apm-body"></div>
            </dialog>
        `;
        this._dlg = this.shadowRoot.querySelector('.apm-dialog');
        this._dlg?.addEventListener('click', (e) => {
            if (e.target === this._dlg) this.close();
        });
        this._dlg?.addEventListener('cancel', (e) => {
            e.preventDefault();
            this.close();
        });
    }
}

/**
 * @param {number} sec
 */
function formatTime(sec) {
    const s = Math.max(0, Math.floor(Number(sec) || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

if (!customElements.get('app-artist-preview-modal')) {
    customElements.define('app-artist-preview-modal', ArtistPreviewModal);
}

/** Ensure a single host exists in document.body */
export function ensureArtistPreviewModalHost() {
    if (typeof document === 'undefined') return;
    if (!document.querySelector('app-artist-preview-modal')) {
        document.body.appendChild(document.createElement('app-artist-preview-modal'));
    }
}

export { ArtistPreviewModal };
