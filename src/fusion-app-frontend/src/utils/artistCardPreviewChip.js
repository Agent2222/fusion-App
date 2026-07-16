/**
 * Shared Preview chip for public artist cards.
 * Chip opens the preview modal; card body still navigates to the full profile.
 */
import sparkleSolidUrl from '../assets/icons/fusion_preview_icons/sparkle-solid.svg';
import { artistDisplayName } from './artistSlug.js';
import { ensureArtistPreviewModalHost } from '../components/subComponents/artistPreviewModal.js';

/**
 * CSS injected into feed shadow roots (append once).
 */
export const ARTIST_CARD_PREVIEW_CHIP_CSS = `
.artist-card-preview-chip {
    position: absolute;
    right: 0.55rem;
    bottom: 0.55rem;
    z-index: 4;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    width: 2.25rem;
    min-width: 2.25rem;
    max-width: 2.25rem;
    height: 2.25rem;
    min-height: 2.25rem;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.48);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
    color: #fff;
    cursor: pointer;
    overflow: hidden;
    box-sizing: border-box;
    transition:
        width 0.2s ease,
        min-width 0.2s ease,
        max-width 0.2s ease,
        padding 0.2s ease,
        gap 0.2s ease,
        background 0.2s ease;
    font-family: 'momochidori-variable', sans-serif;
    line-height: 1;
    -webkit-appearance: none;
    appearance: none;
}
.artist-card:hover .artist-card-preview-chip,
.artist-card-preview-chip:focus-visible {
    width: auto;
    min-width: 6.75rem;
    max-width: none;
    padding: 0 0.85rem 0 0.65rem;
    gap: 0.4rem;
    background: rgba(0, 0, 0, 0.62);
    outline: none;
}
.artist-card-preview-chip:focus-visible {
    box-shadow: 0 0 0 2px #fff, 0 0 0 4px rgba(0, 0, 0, 0.55);
}
/* Override .artist-card-image img { width/height: 100% } from feeds */
.artist-card-image .artist-card-preview-chip__icon,
.artist-card-preview-chip__icon {
    width: 0.95rem !important;
    height: 0.95rem !important;
    max-width: 0.95rem !important;
    max-height: 0.95rem !important;
    flex: 0 0 0.95rem;
    display: block;
    object-fit: contain;
    object-position: center;
    transform: none !important;
    filter: brightness(0) invert(1);
    pointer-events: none;
}
.artist-card-preview-chip__label {
    flex: 0 1 auto;
    color: #fff;
    font-size: 0.62rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-variation-settings: var(--fv-nav-active, "wght" 550);
    white-space: nowrap;
    max-width: 0;
    opacity: 0;
    overflow: hidden;
    transition: max-width 0.2s ease, opacity 0.18s ease;
}
.artist-card:hover .artist-card-preview-chip__label,
.artist-card-preview-chip:focus-visible .artist-card-preview-chip__label {
    max-width: 6rem;
    opacity: 1;
}
@media (max-width: 640px), (hover: none) {
    .artist-card-preview-chip {
        width: auto;
        min-width: 6.75rem;
        max-width: none;
        padding: 0 0.85rem 0 0.65rem;
        gap: 0.4rem;
    }
    .artist-card-preview-chip__label {
        max-width: 6rem;
        opacity: 1;
    }
}
`;

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

/**
 * @param {string} s
 */
function escAttr(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}

/**
 * Attach preview chip. Chip stops propagation so card-body navigate still works.
 * @param {HTMLElement} cardEl
 * @param {unknown} artist
 */
export function enhanceArtistCardForPreview(cardEl, artist) {
    if (!(cardEl instanceof HTMLElement) || !artist) return;
    ensureArtistPreviewModalHost();

    const imageWrap = cardEl.querySelector('.artist-card-image');
    if (!(imageWrap instanceof HTMLElement)) return;
    if (getComputedStyle(imageWrap).position === 'static') {
        imageWrap.style.position = 'relative';
    }

    let chip = imageWrap.querySelector('.artist-card-preview-chip');
    if (!(chip instanceof HTMLButtonElement)) {
        chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'artist-card-preview-chip';
        imageWrap.appendChild(chip);
    }

    const loc = readLocale();
    const name = artistDisplayName(artist, loc);
    const label = loc === 'ja' ? 'プレビュー' : 'Preview';
    chip.setAttribute('aria-label', loc === 'ja' ? `${name}をプレビュー` : `Preview ${name}`);
    chip.innerHTML = `
        <img class="artist-card-preview-chip__icon" src="${escAttr(sparkleSolidUrl)}" alt="" width="16" height="16" />
        <span class="artist-card-preview-chip__label">${escAttr(label)}</span>
    `;

    const open = (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(
            new CustomEvent('fusion-open-artist-preview', {
                detail: { artist, returnFocus: chip },
            }),
        );
    };
    chip.onclick = open;
    chip.onpointerdown = (e) => e.stopPropagation();
}

/**
 * @deprecated Chip no longer blocks card navigation; kept for call-site compatibility.
 * @param {MouseEvent} e
 * @param {() => void} [legacyNavigate]
 */
export function artistCardClickMaybeNavigate(e, legacyNavigate) {
    if (typeof legacyNavigate === 'function') legacyNavigate();
}
