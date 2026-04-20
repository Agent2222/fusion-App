// Two-column banner (half event-row height): Fusion badge + residency copy.
import { getAllProgramsBlock, getCurrentProgramSeason, subscribeDataSource } from '../../utils/database.js';
import { mergeLocaleDeep } from '../../utils/localeFallback.js';
import { yearFromProgramSlug } from '../../utils/artistSlug.js';

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
 * @param {Record<string, unknown> | null} block
 * @returns {{ program: object, loc: object } | null}
 */
function resolveProgram(programId, block) {
    if (programId == null || programId === '') return null;
    const id = PROGRAM_ID_ALIASES[programId] || programId;
    const locale = typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
    const programs = block?.programs;
    const enList =
        programs && typeof programs === 'object'
            ? /** @type {Record<string, unknown>} */ (programs).en
            : null;
    const jaList =
        programs && typeof programs === 'object'
            ? /** @type {Record<string, unknown>} */ (programs).ja
            : null;
    if (!Array.isArray(enList)) return null;
    const idx = enList.findIndex((p) => p && String(p.id) === String(id));
    if (idx < 0) return null;
    const enCard = enList[idx];
    const jaCard = Array.isArray(jaList) && jaList[idx] && typeof jaList[idx] === 'object' ? jaList[idx] : {};
    const program =
        locale === 'ja'
            ? /** @type {Record<string, unknown>} */ (mergeLocaleDeep(enCard, jaCard))
            : /** @type {Record<string, unknown>} */ (enCard);
    return { program, loc: program };
}

/**
 * @param {{ program?: Record<string, unknown>, loc?: Record<string, unknown> } | null} resolved
 * @param {string | null} programId
 */
function displayYearForProgram(resolved, programId) {
    const raw = resolved?.program?.year ?? resolved?.loc?.year;
    if (raw != null && String(raw).trim()) return String(raw).trim();
    return programId ? yearFromProgramSlug(programId) : '';
}

/**
 * @param {{ program?: Record<string, unknown>, loc?: Record<string, unknown> } | null} resolved
 * @param {string | null} programId
 */
function displayFocusForProgram(resolved, programId) {
    if (!resolved) {
        return programId ? String(programId).replace(/-/g, ' ') : '';
    }
    const focus = String(resolved.loc?.focus ?? resolved.program?.focus ?? '').trim();
    const headline = String(
        resolved.loc?.programPage && typeof resolved.loc.programPage === 'object'
            ? /** @type {{ headline?: unknown }} */ (resolved.loc.programPage).headline
            : ''
    ).trim();
    return focus || headline || String(resolved.loc?.id ?? programId ?? '').replace(/-/g, ' ');
}

class VeteranBannerComponent extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        /** @type {Record<string, unknown> | null} */
        this._programsBlock = null;
        /** Site `currentProgramSeason` — compare 4-digit year to badge label for background color. */
        this._currentSeason = '';
        /** @type {(() => void) | null} */
        this._unsubData = null;
        this._onLocaleChange = () => this.render();
    }

    static get observedAttributes() {
        return ['data-program-id', 'data-residency-year'];
    }

    attributeChangedCallback() {
        this.render();
    }

    connectedCallback() {
        window.addEventListener('fusion-localechange', this._onLocaleChange);
        if (this._unsubData) this._unsubData();
        this._unsubData = subscribeDataSource(() => void this._loadPrograms());
        void this._loadPrograms();
    }

    disconnectedCallback() {
        window.removeEventListener('fusion-localechange', this._onLocaleChange);
        if (this._unsubData) {
            this._unsubData();
            this._unsubData = null;
        }
    }

    async _loadPrograms() {
        this._programsBlock = await getAllProgramsBlock();
        try {
            this._currentSeason = (await getCurrentProgramSeason()).trim();
        } catch {
            this._currentSeason = '';
        }
        this.render();
    }

    _getProgramId() {
        const raw = this.getAttribute('data-program-id');
        return raw == null || raw === '' ? null : String(raw).trim();
    }

    render() {
        const programId = this._getProgramId();
        const residencyYearAttr = (this.getAttribute('data-residency-year') || '').trim();
        const resolved = programId ? resolveProgram(programId, this._programsBlock) : null;

        const locale = typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';

        /** @type {string} */
        let focusText = '';
        /** @type {string} */
        let yearStr = '';
        if (programId) {
            focusText = displayFocusForProgram(resolved, programId);
            yearStr = displayYearForProgram(resolved, programId) || residencyYearAttr;
        } else if (residencyYearAttr) {
            focusText =
                locale === 'ja' ? 'ジャパン・アーティスト・レジデンシー' : 'Japan Artist Residency';
            yearStr = residencyYearAttr;
        }

        const emphasis = [focusText, yearStr].filter(Boolean).join(' ');
        const yearBadgeHtml = yearStr
            ? ` <span id="programYear">${escapeHtml(yearStr)}</span>`
            : '';

        let fusionBadgePastClass = '';
        const cs = String(this._currentSeason || '').trim();
        if (cs && yearStr) {
            const seasonYear =
                yearFromProgramSlug(cs) ||
                (() => {
                    const m = cs.match(/\b(19|20)\d{2}\b/);
                    return m ? m[0] : '';
                })();
            const y = String(yearStr).trim();
            if (!seasonYear || y !== seasonYear) {
                fusionBadgePastClass = 'fusion-badge--past-season';
            }
        }

        const lead =
            locale === 'ja'
                ? 'プログラム卒業生 — '
                : 'Program Alumni — ';

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

                #fusionBadge.fusion-badge--past-season {
                    background-color: var(--c1);
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

                .fusion-badge-line2 {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: center;
                    gap: 0.25rem 0.35rem;
                    max-width: 100%;
                    padding: 0 0.2rem;
                    box-sizing: border-box;
                }

                #programBadgeFocus {
                    font-size: clamp(0.65rem, 1.1vw, 0.95rem);
                    font-variation-settings: var(--fv-subtitle);
                    line-height: 1.25;
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
                    <div id="fusionBadge" class="${fusionBadgePastClass}">
                        <p id="fusionBadgeTitle">FUSION</p>
                        <p class="fusion-badge-line2"><span id="programBadgeFocus">${escapeHtml(focusText)}</span>${yearBadgeHtml}</p>
                    </div>
                </div>
                <div class="veteran-banner__text">
                    ${escapeHtml(lead)}<strong>${escapeHtml(emphasis)}</strong>
                </div>
            </div>
        `;
    }
}

customElements.define('app-veteran-banner', VeteranBannerComponent);

export { VeteranBannerComponent };
