/**
 * Program detail: up to 10 images, 5:4 frame on all breakpoints.
 * Hold duration comes from `programPage.fadeGalleryDurationSec` (passed via setImages).
 * Transitions: fade to site background (--bg), then fade in the next image.
 * Click advances to next slide and restarts the hold + progress bar.
 */

import {
    PH_LOADER_BASE_STYLES,
    PROGRAM_FADE_PENDING_WRAPPER_STYLES,
    programHeroLoaderHtml,
} from '../../utils/programHeroLoader.js';
import { SEO_MEDIA_DEFAULT, withSeoImageAlt } from '../../utils/mediaAltSeo.js';

const FADE_MS = 450;
const MAX_IMAGES = 10;
const DEFAULT_DURATION_SEC = 3;

/**
 * @param {HTMLImageElement} el
 * @param {number} ms
 * @returns {Promise<void>}
 */
function waitTransitionEnd(el, ms) {
    return new Promise((resolve) => {
        const done = () => resolve();
        const to = window.setTimeout(done, ms + 100);
        el.addEventListener(
            'transitionend',
            () => {
                window.clearTimeout(to);
                done();
            },
            { once: true },
        );
    });
}

/**
 * @param {HTMLImageElement} img
 * @param {string} url
 * @returns {Promise<void>}
 */
function assignImageWhenLoaded(img, url) {
    return new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => {
            img.src = url;
            resolve();
        };
        i.onerror = () => reject(new Error('image load failed'));
        i.src = url;
    });
}

/**
 * @param {unknown} sec
 * @returns {number}
 */
function clampDurationSec(sec) {
    const n = typeof sec === 'number' ? sec : Number(sec);
    if (!Number.isFinite(n) || n <= 0) return DEFAULT_DURATION_SEC;
    return Math.min(120, Math.max(0.5, n));
}

/**
 * @param {string} s
 * @returns {string}
 */
function escAttr(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

class ProgramFadeGalleryElement extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        /** @type {string[]} */
        this._urls = [];
        /** @type {string} */
        this._altBase = '';
        /** @type {number} */
        this._durationSec = DEFAULT_DURATION_SEC;
        this._runId = 0;
        /** @type {number} */
        this._idx = 0;
        /** @type {ReturnType<typeof setTimeout> | null} */
        this._holdTimer = null;
        /** @type {HTMLImageElement | null} */
        this._img = null;
        /** @type {HTMLElement | null} */
        this._progressFill = null;
        /** @type {HTMLElement | null} */
        this._progressTrack = null;
        /** @type {HTMLElement | null} */
        this._wrap = null;
        /** @type {HTMLElement | null} */
        this._thumbs = null;
        this._busy = false;
        this._reducedMotion = false;
        /** `setImages` from program view has not run yet — show shared loader, not “empty”. */
        this._settled = false;
        /** @type {(e: Event) => void} */
        this._onWrapClick = (e) => {
            e.preventDefault();
            this._onUserAdvance();
        };
        /** @type {(e: KeyboardEvent) => void} */
        this._onWrapKey = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this._onUserAdvance();
            }
        };
        /** @type {(e: Event) => void} */
        this._onThumbClick = (e) => {
            const t = e.target;
            if (!(t instanceof Element)) return;
            const btn = t.closest('.pfade-thumb');
            if (!btn || !this._thumbs || !this._thumbs.contains(btn)) return;
            e.preventDefault();
            e.stopPropagation();
            const idx = Number(btn.getAttribute('data-idx'));
            if (Number.isFinite(idx)) this._onUserSelectThumb(idx);
        };
    }

    /**
     * @param {unknown[]} urls
     * @param {{ durationSec?: unknown, altBase?: unknown }} [opts]
     */
    setImages(urls, opts = {}) {
        this._settled = true;
        this._urls = Array.isArray(urls)
            ? urls.map((u) => String(u ?? '').trim()).filter(Boolean).slice(0, MAX_IMAGES)
            : [];
        this._durationSec = clampDurationSec(opts?.durationSec);
        this._altBase = String(opts?.altBase ?? '').trim();
        this._render();
    }

    /**
     * @param {number} slideIndex
     * @returns {string}
     */
    _altForSlide(slideIndex) {
        const base = this._altBase || 'Program';
        return withSeoImageAlt(`${base} gallery slide ${slideIndex + 1}`);
    }

    /**
     * Small overlay strip of clickable thumbnails (only when there is more than one image).
     * @returns {string}
     */
    _thumbsHtml() {
        if (this._urls.length < 2) return '';
        const items = this._urls
            .map(
                (u, i) =>
                    `<button type="button" class="pfade-thumb" data-idx="${i}" aria-label="Go to image ${i + 1}"><img src="${escAttr(u)}" alt="" loading="lazy" decoding="async" /></button>`,
            )
            .join('');
        return `<div class="pfade-thumbs" part="thumbs" role="tablist" aria-label="Gallery thumbnails">${items}</div>`;
    }

    _updateActiveThumb() {
        if (!this._thumbs) return;
        const btns = this._thumbs.querySelectorAll('.pfade-thumb');
        btns.forEach((b, i) => {
            const active = i === this._idx;
            b.classList.toggle('is-active', active);
            b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
    }

    /**
     * @param {number} idx
     */
    _onUserSelectThumb(idx) {
        if (this._busy || !this._urls.length) return;
        const target = ((Math.floor(idx) % this._urls.length) + this._urls.length) % this._urls.length;
        if (target === this._idx) return;
        this._clearHoldTimer();
        this._resetProgressBar();
        void this._goToSlide(target);
    }

    /**
     * Fade to a specific slide, then restart hold timer + progress.
     * @param {number} targetIdx
     */
    async _goToSlide(targetIdx) {
        const img = this._img;
        if (!img || this._busy || this._urls.length < 2) return;
        const target = ((Math.floor(targetIdx) % this._urls.length) + this._urls.length) % this._urls.length;
        if (target === this._idx) return;
        const runId = this._runId;
        this._busy = true;
        this._clearHoldTimer();
        this._resetProgressBar();
        try {
            img.style.opacity = '0';
            await waitTransitionEnd(img, FADE_MS);
            if (!this.isConnected || this._runId !== runId) return;

            this._idx = target;
            try {
                await assignImageWhenLoaded(img, this._urls[this._idx]);
                img.alt = this._altForSlide(this._idx);
            } catch {
                /* keep previous frame on load failure */
            }
            if (!this.isConnected || this._runId !== runId) return;

            this._updateActiveThumb();
            requestAnimationFrame(() => {
                img.style.opacity = '1';
            });
            await waitTransitionEnd(img, FADE_MS);
        } finally {
            this._busy = false;
        }
        if (!this.isConnected || this._runId !== runId || this._reducedMotion) return;
        this._startHold();
    }

    connectedCallback() {
        if (!this._settled) {
            this._renderPending();
        } else if (this._urls.length) {
            this._render();
        }
    }

    _renderPending() {
        this.removeAttribute('hidden');
        this.shadowRoot.innerHTML = `
            <style>
                ${PH_LOADER_BASE_STYLES}
                ${PROGRAM_FADE_PENDING_WRAPPER_STYLES}
            </style>
            ${programHeroLoaderHtml({ wrapperClass: 'program-fade-pending-loader', ariaLabel: 'Loading gallery' })}
        `;
        this._img = null;
        this._progressFill = null;
        this._progressTrack = null;
        this._wrap = null;
        this._thumbs = null;
    }

    disconnectedCallback() {
        this._runId += 1;
        this._clearHoldTimer();
    }

    _getHoldMs() {
        return Math.round(this._durationSec * 1000);
    }

    _clearHoldTimer() {
        if (this._holdTimer != null) {
            window.clearTimeout(this._holdTimer);
            this._holdTimer = null;
        }
    }

    _resetProgressBar() {
        const fill = this._progressFill;
        if (!fill) return;
        fill.style.transition = 'none';
        fill.style.width = '0%';
    }

    _startProgressBar() {
        const fill = this._progressFill;
        if (!fill || this._reducedMotion) return;
        const ms = this._getHoldMs();
        fill.getBoundingClientRect();
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                fill.style.transition = `width ${ms}ms linear`;
                fill.style.width = '100%';
            });
        });
    }

    _startHold() {
        this._clearHoldTimer();
        this._resetProgressBar();
        if (!this._reducedMotion) {
            this._startProgressBar();
        }
        const ms = this._getHoldMs();
        this._holdTimer = window.setTimeout(() => {
            this._holdTimer = null;
            this._onHoldComplete();
        }, ms);
    }

    _onHoldComplete() {
        if (this._urls.length <= 1) {
            this._startHold();
            return;
        }
        void this._advanceSlide();
    }

    _onUserAdvance() {
        if (this._busy || !this._urls.length) return;
        this._clearHoldTimer();
        this._resetProgressBar();
        if (this._urls.length <= 1) {
            this._startHold();
            return;
        }
        void this._advanceSlide();
    }

    /**
     * Fade to next slide (wraps), then restart hold timer + progress.
     */
    async _advanceSlide() {
        const img = this._img;
        if (!img || this._busy || this._urls.length < 2) return;
        const runId = this._runId;
        this._busy = true;
        this._clearHoldTimer();
        this._resetProgressBar();
        try {
            img.style.opacity = '0';
            await waitTransitionEnd(img, FADE_MS);
            if (!this.isConnected || this._runId !== runId) return;

            this._idx = (this._idx + 1) % this._urls.length;
            let attempts = 0;
            while (attempts < this._urls.length) {
                try {
                    await assignImageWhenLoaded(img, this._urls[this._idx]);
                    img.alt = this._altForSlide(this._idx);
                    break;
                } catch {
                    this._idx = (this._idx + 1) % this._urls.length;
                    attempts += 1;
                }
            }
            if (!this.isConnected || this._runId !== runId) return;

            this._updateActiveThumb();
            requestAnimationFrame(() => {
                img.style.opacity = '1';
            });
            await waitTransitionEnd(img, FADE_MS);
        } finally {
            this._busy = false;
        }
        if (!this.isConnected || this._runId !== runId || this._reducedMotion) return;
        this._startHold();
    }

    _render() {
        this._runId += 1;
        const runId = this._runId;
        this._clearHoldTimer();
        this._busy = false;
        this._idx = 0;

        if (!this._settled) {
            this._renderPending();
            return;
        }

        if (!this._urls.length) {
            this.setAttribute('hidden', '');
            this.shadowRoot.innerHTML = '';
            this._img = null;
            this._progressFill = null;
            this._progressTrack = null;
            this._wrap = null;
            this._thumbs = null;
            return;
        }

        this.removeAttribute('hidden');

        this._reducedMotion =
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    margin: 0 0 1.75rem 0;
                    box-sizing: border-box;
                    container-type: inline-size;
                }
                :host([hidden]) {
                    display: none !important;
                }
                .pfade-wrap {
                    position: relative;
                    width: 100%;
                    max-width: 100%;
                    aspect-ratio: 5 / 4;
                    height: auto;
                    margin-inline: auto;
                    background: var(--bg, #f5f5f0);
                    overflow: hidden;
                    border-radius: 2px;
                    cursor: pointer;
                }
                .pfade-wrap:focus {
                    outline: 2px solid var(--c2, currentColor);
                    outline-offset: 2px;
                }
                .pfade-wrap:focus:not(:focus-visible) {
                    outline: none;
                }
                @media (max-width: 768px) {
                    .pfade-wrap {
                        aspect-ratio: 5 / 4;
                    }
                }
                @media (prefers-reduced-motion: reduce) {
                    .pfade-img {
                        transition: none !important;
                    }
                }
                .pfade-img {
                    display: block;
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    opacity: 0;
                    transition: opacity ${FADE_MS}ms ease;
                }
                .pfade-thumbs {
                    position: absolute;
                    left: 50%;
                    bottom: 24px;
                    transform: translateX(-50%);
                    z-index: 3;
                    display: flex;
                    gap: 5px;
                    max-width: calc(100% - 24px);
                    padding: 4px 5px;
                    border-radius: 4px;
                    background: rgba(0, 0, 0, 0.14);
                    backdrop-filter: blur(2px);
                    -webkit-backdrop-filter: blur(2px);
                    overflow-x: auto;
                    scrollbar-width: none;
                    opacity: 0.72;
                    transition: opacity 0.25s ease;
                }
                .pfade-thumbs::-webkit-scrollbar {
                    display: none;
                }
                .pfade-wrap:hover .pfade-thumbs,
                .pfade-wrap:focus-within .pfade-thumbs {
                    opacity: 1;
                }
                .pfade-thumb {
                    flex: 0 0 auto;
                    width: 38px;
                    height: 30px;
                    padding: 0;
                    border: 1px solid rgba(255, 255, 255, 0.55);
                    border-radius: 2px;
                    overflow: hidden;
                    background: none;
                    cursor: pointer;
                    opacity: 0.6;
                    transition: opacity 0.2s ease, border-color 0.2s ease;
                }
                .pfade-thumb img {
                    display: block;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    pointer-events: none;
                }
                .pfade-thumb:hover {
                    opacity: 0.9;
                }
                .pfade-thumb.is-active {
                    opacity: 1;
                    border-color: #fff;
                }
                .pfade-thumb:focus-visible {
                    outline: 2px solid #fff;
                    outline-offset: 1px;
                }
                @media (max-width: 520px) {
                    .pfade-thumbs {
                        bottom: 20px;
                        gap: 4px;
                    }
                    .pfade-thumb {
                        width: 30px;
                        height: 24px;
                    }
                }
                .pfade-progress-track {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 10px;
                    background: var(--c5, #ccc);
                    z-index: 2;
                    pointer-events: none;
                }
                .pfade-progress-fill {
                    height: 100%;
                    width: 0%;
                    background: #fff;
                }
                .pfade-progress-track[hidden] {
                    display: none !important;
                }
            </style>
            <div class="pfade-wrap" part="frame" role="button" tabindex="0" aria-label="Advance gallery image">
                <img class="pfade-img" alt="${SEO_MEDIA_DEFAULT}" decoding="async" loading="eager" />
                ${this._thumbsHtml()}
                <div class="pfade-progress-track" part="progress-track">
                    <div class="pfade-progress-fill" part="progress-fill"></div>
                </div>
            </div>
        `;

        this._wrap = this.shadowRoot.querySelector('.pfade-wrap');
        this._img = this.shadowRoot.querySelector('.pfade-img');
        this._progressTrack = this.shadowRoot.querySelector('.pfade-progress-track');
        this._progressFill = this.shadowRoot.querySelector('.pfade-progress-fill');
        this._thumbs = this.shadowRoot.querySelector('.pfade-thumbs');

        const img = this._img;
        if (!(img instanceof HTMLImageElement) || !this._wrap) return;

        if (this._progressTrack) {
            this._progressTrack.hidden = this._reducedMotion;
        }

        this._wrap.addEventListener('click', this._onWrapClick);
        this._wrap.addEventListener('keydown', this._onWrapKey);
        if (this._thumbs) {
            this._thumbs.addEventListener('click', this._onThumbClick);
        }
        this._updateActiveThumb();

        void assignImageWhenLoaded(img, this._urls[0])
            .then(() => {
                if (this._runId !== runId || !this.isConnected) return;
                img.alt = this._altForSlide(0);
                this._updateActiveThumb();
                requestAnimationFrame(() => {
                    img.style.opacity = '1';
                });
                if (this._reducedMotion) return;
                this._startHold();
            })
            .catch(() => {
                if (this._runId !== runId || !this.isConnected) return;
                this.setAttribute('hidden', '');
                this.shadowRoot.innerHTML = '';
            });
    }
}

customElements.define('app-program-fade-gallery', ProgramFadeGalleryElement);

export { ProgramFadeGalleryElement };
