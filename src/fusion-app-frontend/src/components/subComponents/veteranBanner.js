// Two-column banner (half event-row height): program image + residency copy.
import { testData } from '../../testData.js';

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Artist `programs[]` may use slugs that differ from `allPrograms.programs.en[].id`. */
const PROGRAM_ID_ALIASES = {
    'fusion-residency-2025': 'fusionKaga',
};

/**
 * @param {string} programId
 * @returns {{ program: object, loc: object } | null}
 */
function resolveProgram(programId) {
    if (programId == null || programId === '') return null;
    const id = PROGRAM_ID_ALIASES[programId] || programId;
    const locale = typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
    const list = testData.allPrograms?.programs?.[locale] ?? testData.allPrograms?.programs?.en;
    if (!Array.isArray(list)) return null;
    const program = list.find((p) => p && String(p.id) === String(id));
    if (!program) return null;
    return { program, loc: program };
}

class VeteranBannerComponent extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        this._onLocaleChange = () => this.render();
    }

    static get observedAttributes() {
        return ['data-program-id'];
    }

    attributeChangedCallback() {
        this.render();
    }

    connectedCallback() {
        window.addEventListener('fusion-localechange', this._onLocaleChange);
        this.render();
    }

    disconnectedCallback() {
        window.removeEventListener('fusion-localechange', this._onLocaleChange);
    }

    _getProgramId() {
        const raw = this.getAttribute('data-program-id');
        return raw == null || raw === '' ? null : String(raw).trim();
    }

    render() {
        const programId = this._getProgramId();
        const resolved = programId ? resolveProgram(programId) : null;
        const imageSrc = resolved?.program?.imageSrc ?? '';
        const title = resolved
            ? resolved.loc?.programPage?.headline ?? resolved.loc?.focus ?? resolved.loc?.id ?? ''
            : programId
              ? String(programId).replace(/-/g, ' ')
              : '';

        const locale = typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
        const lead =
            locale === 'ja'
                ? '現在、FUSION レジデンシーに参加中 — '
                : 'Currently part of FUSION Residency — ';

        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                }

                :host([hidden]) {
                    display: none;
                }

                .veteran-banner {
                    width: 100%;
                    height: 12rem;
                    min-height: 0;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    grid-template-rows: minmax(0, 1fr);
                    align-items: stretch;
                    justify-items: stretch;
                    box-sizing: border-box;
                    overflow: hidden;
                    border-top: 1px solid var(--c2);
                    border-bottom: 1px solid var(--c2);
                    background-color: var(--bg);
                }

                .veteran-banner > * {
                    min-width: 0;
                    min-height: 0;
                    overflow: hidden;
                }

                .veteran-banner__text {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    text-align: right;
                    padding-right: 3rem;
                    font-size: clamp(0.75rem, 1.6vw, 1.35rem);
                    font-variation-settings: var(--fv-emphasis);
                    letter-spacing: 0.04em;
                    color: var(--c2);
                    line-height: 1.35;
                }

                .veteran-banner__badge {
                    width: 100%;
                    height: 100%;
                    text-align: center;
                    display: flex;
                    align-items: center;
                    justify-content: start;
                    padding-left: 2rem;
                    color: var(--c2);
                    color: var(--c3);
                }

                #fusionBadge {
                    width: 150px;
                    height: 150px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    font-size: clamp(0.75rem, 1.4vw, 1.15rem);
                    font-variation-settings: var(--fv-subtitle);
                    color: var(--c3);
                    border-radius: 50%;
                    background-color: var(--c1);
                    padding: 0;
                    margin: 0;
                    line-height: 1;
                }
                    
                #fusionBadge p {
                    margin: 0;
                    padding: 0;
                    line-height: 1.3;
                }

                #fusionBadgeTitle {
                    font-size: clamp(1.25rem, 1.2vw, 1.5rem);
                    font-variation-settings: var(--fv-headline-wide);
                    letter-spacing: 0.1em;
                }

                #programYear {
                    font-size: clamp(0.75rem, 1.4vw, 1.15rem);
                    font-variation-settings: var(--fv-subtitle);
                    color: var(--c3);
                    padding: 0;
                    margin: 0;
                    line-height: 1;
                }

                @media (max-width: 768px) {
                    .veteran-banner {
                        grid-template-columns: 1fr;
                        height: auto;
                        min-height: 0;
                    }

                    .veteran-banner__badge {
                        padding: 1rem 1rem 0;
                        justify-content: center;
                    }

                    .veteran-banner__text {
                        justify-content: center;
                        text-align: center;
                        padding: 1rem 1.25rem 1.5rem;
                    }

                    #fusionBadge {
                        width: min(120px, 28vw);
                        height: min(120px, 28vw);
                    }
                }

                @media (max-width: 480px) {
                    .veteran-banner__text {
                        font-size: clamp(0.75rem, 3.5vw, 1.1rem);
                        padding-left: 1rem;
                        padding-right: 1rem;
                    }
                }
            </style>
            <div class="veteran-banner" part="veteran-banner">
                <div class="veteran-banner__badge">
                    <div id="fusionBadge">
                        <p id="fusionBadgeTitle">FUSION</p>
                        <p>${title} <span id="programYear"></span></p>
                    </div>
                </div>
                <div class="veteran-banner__text">
                    ${escapeHtml(lead)}<strong>${escapeHtml(title)}</strong>
                </div>
            </div>
        `;
    }
}

customElements.define('app-veteran-banner', VeteranBannerComponent);

export { VeteranBannerComponent };
