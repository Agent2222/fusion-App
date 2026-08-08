/**
 * Past recipient story modal — matches Program Draw reference layout
 * (left copy + award badge + profile CTA, right YouTube embed).
 */

import includedGiftIcon from '../../assets/icons/fusion_svg_icons_b2/included-gift.svg';
import { normalizeYoutubeEmbedSrc } from '../../utils/youtubeEmbed.js';
import { navigate } from '../../router.js';

/**
 * @typedef {{
 *   cycle?: number,
 *   name?: string,
 *   discipline?: string,
 *   residencyDate?: string,
 *   slug?: string,
 *   storyVideoUrl?: string,
 *   programLabel?: string,
 * }} PastRecipientModalPayload
 */

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function loc() {
    return typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
}

/**
 * @param {PastRecipientModalPayload} data
 */
function copyFor(data) {
    const program = String(data.programLabel || 'FUSION').trim() || 'FUSION';
    const cycle = Math.max(1, Math.floor(Number(data.cycle) || 1));
    if (loc() === 'ja') {
        return {
            eyebrow: `過去の受賞者 · ラウンド #${cycle}`,
            awardTitle: 'FUSION ARTIST SUPPORT DRAW',
            awardBody: `${program} アーティスト・レジデンシーの完全スポンサー枠受賞者です。`,
            watchLabel: '受賞者ストーリーを見る',
            profileCta: 'アーティストプロフィールを見る →',
            noVideo: 'ストーリー動画はまだ公開されていません。',
            close: '閉じる',
        };
    }
    return {
        eyebrow: `Past Recipient · Round #${cycle}`,
        awardTitle: 'FUSION ARTIST SUPPORT DRAW',
        awardBody: `Recipient of a fully sponsored placement in the ${program} Artist Residency.`,
        watchLabel: 'Watch recipient story',
        profileCta: 'View artist profile →',
        noVideo: 'Story video coming soon.',
        close: 'Close',
    };
}

/**
 * Ensure a single recipient modal exists on document.body.
 * @returns {ProgramDrawRecipientModal}
 */
export function ensureProgramDrawRecipientModal() {
    const existing = document.querySelector('app-program-draw-recipient-modal');
    if (existing instanceof ProgramDrawRecipientModal) return existing;
    const el = document.createElement('app-program-draw-recipient-modal');
    document.body.appendChild(el);
    return el;
}

/**
 * @param {PastRecipientModalPayload} data
 */
export function openProgramDrawRecipientModal(data) {
    const modal = ensureProgramDrawRecipientModal();
    if (typeof modal.open === 'function') modal.open(data);
    return modal;
}

class ProgramDrawRecipientModal extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        /** @type {(() => void) | null} */
        this._onKey = null;
        /** @type {string} */
        this._profileHref = '';
    }

    connectedCallback() {
        if (!this.shadowRoot?.innerHTML) {
            this.shadowRoot.innerHTML = `<style>${this._styles()}</style><div class="pdrm" hidden></div>`;
        }
    }

    disconnectedCallback() {
        this._unbindKey();
    }

    /**
     * @param {PastRecipientModalPayload} data
     */
    open(data) {
        if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
        const L = copyFor(data || {});
        const name = String(data?.name || '').trim() || 'Artist';
        const discipline = String(data?.discipline || '').trim();
        const residency = String(data?.residencyDate || '').trim();
        const metaParts = [discipline, residency].filter(Boolean);
        const metaLine = metaParts.join(' / ');
        const slug = String(data?.slug || '').trim();
        this._profileHref = slug ? `/profile/${encodeURIComponent(slug)}` : '';
        const embedSrc = normalizeYoutubeEmbedSrc(String(data?.storyVideoUrl || ''));
        const videoTitle = `${name} · ${String(data?.programLabel || 'FUSION').trim()} Artist Residency`;

        const giftUrl = String(includedGiftIcon || '').replace(/"/g, '');
        const videoHtml = embedSrc
            ? `<div class="pdrm__video">
                <iframe
                  class="pdrm__iframe"
                  src="${escapeHtml(embedSrc)}"
                  title="${escapeHtml(videoTitle)}"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerpolicy="strict-origin-when-cross-origin"
                  allowfullscreen
                ></iframe>
              </div>`
            : `<div class="pdrm__video pdrm__video--empty" role="status">${escapeHtml(L.noVideo)}</div>`;

        this.shadowRoot.innerHTML = `
      <style>${this._styles()}</style>
      <div class="pdrm" role="presentation">
        <div class="pdrm__backdrop" data-pdrm-close tabindex="-1"></div>
        <div class="pdrm__panel${embedSrc ? ' pdrm__panel--has-video' : ''}" role="dialog" aria-modal="true" aria-labelledby="pdrm-title">
          <button type="button" class="pdrm__close" data-pdrm-close aria-label="${escapeHtml(L.close)}">
            <span aria-hidden="true">×</span>
          </button>
          <div class="pdrm__grid">
            <div class="pdrm__copy">
              <p class="pdrm__eyebrow">${escapeHtml(L.eyebrow)}</p>
              <h2 class="pdrm__name" id="pdrm-title">${escapeHtml(name)}</h2>
              ${metaLine ? `<p class="pdrm__meta">${escapeHtml(metaLine)}</p>` : ''}
              <p class="pdrm__desc">${escapeHtml(L.awardBody)}</p>
              <hr class="pdrm__rule" />
              <div class="pdrm__award">
                <span class="pdrm__award-icon" style="--pdrm-icon: url(&quot;${giftUrl}&quot;)" aria-hidden="true"></span>
                <div class="pdrm__award-copy">
                  <p class="pdrm__award-title">${escapeHtml(L.awardTitle)}</p>
                  <p class="pdrm__award-body">${escapeHtml(L.awardBody)}</p>
                </div>
              </div>
              <div class="pdrm__cta">
                <p class="pdrm__watch-label">${escapeHtml(L.watchLabel)}</p>
                ${
                    this._profileHref
                        ? `<button type="button" class="pdrm__profile" data-pdrm-profile>${escapeHtml(L.profileCta)}</button>`
                        : ''
                }
              </div>
            </div>
            <div class="pdrm__media">
              ${videoHtml}
            </div>
          </div>
        </div>
      </div>
    `;

        this.shadowRoot.querySelectorAll('[data-pdrm-close]').forEach((el) => {
            el.addEventListener('click', () => this.close());
        });
        this.shadowRoot.querySelector('[data-pdrm-profile]')?.addEventListener('click', () => {
            const href = this._profileHref;
            this.close();
            if (href) navigate(href);
        });

        this._unbindKey();
        this._onKey = (e) => {
            if (e.key === 'Escape') this.close();
        };
        document.addEventListener('keydown', this._onKey);
        document.body.style.overflow = 'hidden';

        const closeBtn = this.shadowRoot.querySelector('.pdrm__close');
        if (closeBtn instanceof HTMLElement) {
            queueMicrotask(() => closeBtn.focus());
        }
    }

    close() {
        this._unbindKey();
        document.body.style.overflow = '';
        if (this.shadowRoot) {
            this.shadowRoot.innerHTML = `<style>${this._styles()}</style><div class="pdrm" hidden></div>`;
        }
    }

    _unbindKey() {
        if (this._onKey) {
            document.removeEventListener('keydown', this._onKey);
            this._onKey = null;
        }
    }

    _styles() {
        return `
      :host { display: contents; }
      .pdrm[hidden] { display: none !important; }
      .pdrm {
        position: fixed;
        inset: 0;
        z-index: 12000;
        display: grid;
        place-items: center;
        padding: clamp(0.75rem, 3vw, 1.75rem);
        box-sizing: border-box;
      }
      .pdrm__backdrop {
        position: absolute;
        inset: 0;
        background: rgba(18, 16, 14, 0.52);
        backdrop-filter: blur(3px);
        -webkit-backdrop-filter: blur(3px);
        border: 0;
        cursor: pointer;
      }
      .pdrm__panel {
        position: relative;
        z-index: 1;
        width: min(1160px, 100%);
        max-height: min(94vh, 860px);
        overflow: hidden;
        background: var(--bg, #f8f4f0);
        border-radius: 16px;
        box-shadow: 0 28px 70px rgba(0, 0, 0, 0.32);
        color: var(--c2, #111);
        font-family: 'momochidori-variable', sans-serif;
        font-variation-settings: var(--fv-body, 'wght' 400, 'wdth' 110);
        -webkit-font-smoothing: antialiased;
      }
      .pdrm__close {
        position: absolute;
        top: 1.15rem;
        left: 1.15rem;
        z-index: 3;
        width: 2.35rem;
        height: 2.35rem;
        border-radius: 999px;
        border: 1px solid color-mix(in srgb, var(--c2, #111) 18%, transparent);
        background: color-mix(in srgb, #fff 82%, var(--bg, #f8f4f0));
        color: var(--c2, #111);
        font-size: 1.45rem;
        line-height: 1;
        font-weight: 500;
        cursor: pointer;
        display: grid;
        place-items: center;
        padding: 0;
      }
      .pdrm__close:hover,
      .pdrm__close:focus-visible {
        background: #fff;
        outline: none;
      }
      .pdrm__grid {
        display: grid;
        grid-template-columns: minmax(280px, 0.9fr) minmax(360px, 1.5fr);
        gap: 0;
        align-items: stretch;
        min-height: min(78vh, 640px);
        box-sizing: border-box;
      }
      .pdrm__copy {
        display: flex;
        flex-direction: column;
        min-width: 0;
        padding: clamp(3.1rem, 5.5vw, 3.85rem) clamp(1.65rem, 3.4vw, 2.6rem) clamp(2rem, 3.5vw, 2.65rem);
        box-sizing: border-box;
      }
      .pdrm__eyebrow {
        margin: 0 0 1rem;
        font-size: 0.72rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: color-mix(in srgb, var(--c2, #111) 62%, transparent);
        font-variation-settings: var(--fv-label-strong, 'wght' 600, 'wdth' 110);
        font-weight: 600;
      }
      .pdrm__name {
        margin: 0 0 0.65rem;
        font-size: clamp(2.15rem, 3.8vw, 2.9rem);
        line-height: 1.02;
        letter-spacing: -0.02em;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-display, 'wght' 900, 'wdth' 100);
        font-weight: 900;
      }
      .pdrm__meta {
        margin: 0 0 1.15rem;
        font-size: 1.02rem;
        line-height: 1.4;
        color: color-mix(in srgb, var(--c2, #111) 88%, transparent);
        font-variation-settings: var(--fv-body, 'wght' 400, 'wdth' 110);
        font-weight: 400;
      }
      .pdrm__desc {
        margin: 0 0 1.35rem;
        font-size: 0.98rem;
        line-height: 1.55;
        color: color-mix(in srgb, var(--c2, #111) 82%, transparent);
        max-width: 32ch;
        font-variation-settings: var(--fv-body, 'wght' 400, 'wdth' 110);
        font-weight: 400;
      }
      .pdrm__rule {
        border: 0;
        border-top: 1px solid color-mix(in srgb, var(--c2, #111) 16%, transparent);
        margin: 0 0 1.35rem;
        width: 100%;
      }
      .pdrm__award {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.8rem;
        align-items: start;
        margin: 0 0 1.85rem;
      }
      .pdrm__award-icon {
        width: 1.35rem;
        height: 1.35rem;
        margin-top: 0.15rem;
        background: var(--c2, #111);
        -webkit-mask: var(--pdrm-icon) center / contain no-repeat;
        mask: var(--pdrm-icon) center / contain no-repeat;
      }
      .pdrm__award-title {
        margin: 0 0 0.4rem;
        font-size: 0.7rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-label-strong, 'wght' 600, 'wdth' 110);
        font-weight: 700;
      }
      .pdrm__award-body {
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.5;
        color: color-mix(in srgb, var(--c2, #111) 78%, transparent);
        font-variation-settings: var(--fv-body, 'wght' 400, 'wdth' 110);
        font-weight: 400;
      }
      .pdrm__cta {
        margin-top: auto;
        padding-top: 1.1rem;
      }
      .pdrm__watch-label {
        margin: 0 0 0.65rem;
        font-size: 0.7rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-label-strong, 'wght' 600, 'wdth' 110);
        font-weight: 700;
      }
      .pdrm__profile {
        display: inline-flex;
        align-items: center;
        border: 0;
        border-radius: 2px;
        background: var(--c2, #111);
        color: #fff;
        font-family: inherit;
        font-size: 0.88rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        padding: 0.85rem 1.2rem;
        cursor: pointer;
        font-variation-settings: var(--fv-cta, 'wght' 900, 'wdth' 110);
        font-weight: 800;
      }
      .pdrm__profile:hover { background: #000; }
      .pdrm__media {
        min-width: 0;
        display: flex;
        align-items: stretch;
        padding: 1.5rem 1.5rem 1.5rem 0.5rem;
        box-sizing: border-box;
      }
      .pdrm__panel--has-video .pdrm__media {
        padding: 1.45rem 1.45rem 1.45rem 0.4rem;
      }
      .pdrm__video {
        width: 100%;
        height: 100%;
        min-height: 340px;
        aspect-ratio: 16 / 9;
        border-radius: 12px;
        overflow: hidden;
        background: #111;
        align-self: center;
        box-shadow: 0 10px 32px rgba(0, 0, 0, 0.14);
      }
      .pdrm__video--empty {
        display: grid;
        place-items: center;
        color: var(--bg, #f8f4f0);
        font-size: 0.95rem;
        text-align: center;
        padding: 1.5rem;
        background: color-mix(in srgb, var(--c2, #111) 86%, #444);
        font-variation-settings: var(--fv-body, 'wght' 400, 'wdth' 110);
      }
      .pdrm__iframe {
        display: block;
        width: 100%;
        height: 100%;
        border: 0;
      }
      @media (max-width: 820px) {
        .pdrm__panel { overflow: auto; max-height: min(94vh, 960px); }
        .pdrm__grid {
          grid-template-columns: 1fr;
          min-height: 0;
        }
        .pdrm__media {
          order: -1;
          padding: 3.4rem 1.25rem 0.5rem;
        }
        .pdrm__copy {
          padding-top: 1.35rem;
          padding-bottom: 2rem;
        }
        .pdrm__desc { max-width: none; }
        .pdrm__cta { margin-top: 0.85rem; }
        .pdrm__video {
          min-height: 0;
          height: auto;
        }
      }
    `;
    }
}

customElements.define('app-program-draw-recipient-modal', ProgramDrawRecipientModal);

export { ProgramDrawRecipientModal };
