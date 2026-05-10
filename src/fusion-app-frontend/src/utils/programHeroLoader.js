/**
 * Shared “program hero” loading spinner (matches home `app-program-hero` `renderLoading`).
 * Use in shadow roots or with scoped wrapper CSS.
 */

/**
 * @param {string} s
 * @returns {string}
 */
function escapeHtmlAttr(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}

/** Core: circle SVG + `.ph-loader` + `phLoaderSpin` + reduced motion. */
export const PH_LOADER_BASE_STYLES = `
                .ph-loader {
                    width: 72px;
                    height: 72px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: transparent;
                }
                .ph-loader svg {
                    display: block;
                    animation: phLoaderSpin 0.75s linear infinite;
                }
                .ph-loader circle {
                    fill: none;
                    stroke: #000000;
                    stroke-width: 1;
                }
                @keyframes phLoaderSpin {
                    to {
                        transform: rotate(360deg);
                    }
                }
                @media (prefers-reduced-motion: reduce) {
                    .ph-loader svg {
                        animation: none;
                    }
                }
`;

/**
 * Home program hero wrapper (large min-height) — was inline in `program-hero.js` `renderLoading`.
 */
export const PROGRAM_HERO_HOME_WRAPPER_STYLES = `
                .program-hero-loader {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    min-height: calc(100vh - 350px);
                    padding-top: 80px;
                    padding-bottom: 120px;
                    box-sizing: border-box;
                }
                @media (max-width: 1024px) {
                    .program-hero-loader {
                        min-height: min(70vh, 720px);
                        padding-top: clamp(2rem, 6vw, 4rem);
                        padding-bottom: clamp(2rem, 8vw, 5rem);
                    }
                }
`;

/**
 * @param {{ wrapperClass?: string, ariaLabel?: string }} [opts]
 * @returns {string}
 */
export function programHeroLoaderHtml(opts = {}) {
    const wrapperClass = opts.wrapperClass || 'program-hero-loader';
    const ariaLabel = escapeHtmlAttr(opts.ariaLabel != null ? opts.ariaLabel : 'Loading');
    return `
            <div class="${wrapperClass}" role="status" aria-live="polite" aria-label="${ariaLabel}">
                <div class="ph-loader">
                    <svg width="72" height="72" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="10.5" stroke-linecap="round" stroke-dasharray="18 48" />
                    </svg>
                </div>
            </div>
        `;
}

/** Program view `app-program-fade-gallery` — approx. 5:4 frame while data pending. */
export const PROGRAM_FADE_PENDING_WRAPPER_STYLES = `
                .program-fade-pending-loader {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    max-width: 100%;
                    aspect-ratio: 5 / 4;
                    min-height: 200px;
                    margin: 0 0 1.75rem 0;
                    box-sizing: border-box;
                    background: var(--bg, #f5f5f0);
                    border-radius: 2px;
                }
                :host {
                    display: block;
                    width: 100%;
                    margin: 0 0 1.75rem 0;
                    box-sizing: border-box;
                }
                :host([hidden]) {
                    display: none !important;
                }
`;

/** Program view `app-program-strip-gallery` — block area while data pending. */
export const PROGRAM_STRIP_PENDING_WRAPPER_STYLES = `
                .program-strip-pending-loader {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    min-height: min(56vw, 420px);
                    max-width: 100%;
                    margin: 0 0 1.75rem 0;
                    box-sizing: border-box;
                    background: var(--bg, #f5f5f0);
                    border-radius: 2px;
                }
                @media (min-width: 769px) {
                    .program-strip-pending-loader {
                        min-height: 320px;
                    }
                }
                :host {
                    display: block;
                    width: 100%;
                    margin: 0 0 1.75rem 0;
                    box-sizing: border-box;
                }
                :host([hidden]) {
                    display: none !important;
                }
`;

/** `app-program-details` while `setProgramDetails` not yet called. */
export const PROGRAM_DETAILS_PENDING_WRAPPER_STYLES = `
                .program-details-pending-loader {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    min-height: 280px;
                    box-sizing: border-box;
                    padding: 2.5rem 0 3rem;
                }
                :host {
                    display: block;
                    width: 100%;
                    box-sizing: border-box;
                }
`;

/** `app-journal-row` / `app-audio-row` while CMS / journal list is loading. */
export const FEED_ROW_PENDING_WRAPPER_STYLES = `
                .feed-row-pending-loader {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    min-height: clamp(12rem, 36vh, 30rem);
                    box-sizing: border-box;
                    padding: 2rem 1rem 2.5rem;
                }
                :host {
                    display: block;
                    width: 100%;
                    box-sizing: border-box;
                }
`;

/**
 * Spinner shell for journal/audio row shadow roots (same SVG as program hero).
 * @param {{ ariaLabel?: string }} [opts]
 * @returns {string}
 */
export function feedRowLoaderHtml(opts = {}) {
    return programHeroLoaderHtml({
        wrapperClass: 'feed-row-pending-loader',
        ariaLabel: opts.ariaLabel != null ? opts.ariaLabel : 'Loading',
    });
}

/** `app-confirmed-artists-feed` while `setConfirmedArtistsFeed` not yet called. */
export const CONFIRMED_ARTISTS_PENDING_WRAPPER_STYLES = `
                .confirmed-artists-pending-loader {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    min-height: 220px;
                    box-sizing: border-box;
                    padding: 3rem 0 4rem;
                }
                :host {
                    display: block;
                    width: 100%;
                    box-sizing: border-box;
                }
`;

/** Program view `app-program-offering-cards` — band while data pending. */
export const PROGRAM_OFFERING_PENDING_WRAPPER_STYLES = `
                .program-offering-pending-loader {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    min-height: 200px;
                    box-sizing: border-box;
                    border-top: 1px solid var(--c2, #000);
                    border-bottom: 1px solid var(--c2, #000);
                }
                :host {
                    display: block;
                    width: 100%;
                }
                :host([hidden]) {
                    display: none !important;
                }
`;
