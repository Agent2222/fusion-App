import { navigate } from '../../router.js';
import { buildAlumniProgramGroups } from '../../utils/residencyAlumniEntries.js';

/**
 * @param {string} s
 * @returns {string}
 */
function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * @param {Array<{ name: string, slug: string }>} names
 * @returns {string}
 */
function renderNameList(names) {
    return `<ul class="rat-names">
        ${names
            .map((n) => {
                const href = n.slug ? `/profile/${encodeURIComponent(n.slug)}` : '';
                return href
                    ? `<li><a class="rat-name" href="${escapeHtml(href)}">${escapeHtml(n.name)}</a></li>`
                    : `<li><span class="rat-name rat-name--no-link">${escapeHtml(n.name)}</span></li>`;
            })
            .join('')}
    </ul>`;
}

class ResidencyAlumniTable extends HTMLElement {
    constructor() {
        super();
        this._shadow = this.attachShadow({ mode: 'open' });
        /** @type {Array<{ program: string, name: string, slug: string }>} */
        this._entries = [];
        /** @type {(e: Event) => void} */
        this._onShadowClick = (e) => {
            const a = /** @type {Element | null} */ (e.target)?.closest?.('a[href^="/"]');
            if (!a) return;
            e.preventDefault();
            navigate(a.getAttribute('href'));
        };
    }

    /**
     * @param {Array<{ program: string, name: string, slug: string }>} entries
     */
    setAlumni(entries) {
        this._entries = Array.isArray(entries) ? entries : [];
        this._render();
    }

    connectedCallback() {
        this._shadow.addEventListener('click', this._onShadowClick);
        this._render();
    }

    disconnectedCallback() {
        this._shadow.removeEventListener('click', this._onShadowClick);
    }

    _render() {
        const groups = buildAlumniProgramGroups(this._entries);
        if (!groups.length) {
            this._shadow.innerHTML = '';
            this.hidden = true;
            return;
        }
        this.hidden = false;

        const programsHtml = groups
            .map(
                (group) => `
                <section class="rat-program">
                    <h3 class="rat-program-head">${escapeHtml(group.label)}</h3>
                    <div class="rat-name-columns">
                        ${group.columns.map((names) => renderNameList(names)).join('')}
                    </div>
                </section>`,
            )
            .join('');

        this._shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    box-sizing: border-box;
                }
                :host([hidden]) { display: none !important; }

                .rat-wrap {
                    width: 100%;
                    max-width: min(100%, 72rem);
                    margin: 0 auto;
                    padding: clamp(2.5rem, 6vw, 4.5rem) clamp(1rem, 4vw, 2.5rem)
                        clamp(4rem, 10vw, 8rem);
                    box-sizing: border-box;
                }

                .rat-title-row {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: clamp(0.75rem, 2vw, 1.25rem);
                    margin: 0 0 clamp(2rem, 4vw, 3rem);
                }

                .rat-title-line {
                    flex: 1 1 0;
                    max-width: 6rem;
                    height: 1px;
                    background-color: var(--c2);
                    opacity: 0.35;
                }

                .rat-title {
                    margin: 0;
                    flex: 0 1 auto;
                    font-family: 'momochidori-variable', sans-serif;
                    font-variation-settings: var(--fv-emphasis);
                    font-size: clamp(0.95rem, 1.25vw, 1.35rem);
                    letter-spacing: 0.06em;
                    color: var(--c2);
                    text-align: center;
                    line-height: 1.25;
                }

                .rat-programs {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: clamp(1.75rem, 3vw, 2.75rem);
                    align-items: start;
                }

                .rat-program {
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    gap: 0.85rem;
                    min-width: 0;
                }

                .rat-program-head {
                    margin: 0;
                    width: 100%;
                    max-width: none;
                    padding: 0 0.15rem 0.45rem;
                    font-family: 'momochidori-variable', sans-serif;
                    font-variation-settings: var(--fv-caption);
                    font-size: clamp(0.58rem, 0.75vw, 0.68rem);
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    text-align: center;
                    color: var(--c2);
                    opacity: 0.85;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
                    line-height: 1.35;
                }

                .rat-name-columns {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: clamp(1rem, 2vw, 1.5rem);
                    width: 100%;
                    max-width: none;
                }

                .rat-name-columns:has(> :nth-child(2)) {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }

                .rat-names {
                    list-style: none;
                    margin: 0;
                    padding: 0;
                    min-width: 0;
                }

                .rat-names li {
                    margin: 0 0 0.35rem;
                }

                .rat-name {
                    display: block;
                    font-family: 'momochidori-variable', sans-serif;
                    font-variation-settings: var(--fv-nav-active);
                    font-size: clamp(0.62rem, 0.9vw, 0.75rem);
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                    text-decoration: none;
                    color: var(--c2);
                    line-height: 1.45;
                    cursor: pointer;
                    transition: opacity 0.15s ease;
                }

                a.rat-name:hover {
                    text-decoration: underline;
                }

                .rat-name--no-link {
                    cursor: default;
                    opacity: 0.65;
                }

                @media (max-width: 900px) {
                    .rat-programs {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                }

                @media (max-width: 768px) {
                    .rat-wrap {
                        padding-top: clamp(2rem, 5vw, 3rem);
                        padding-bottom: clamp(3rem, 8vw, 5rem);
                    }

                    .rat-title-line {
                        max-width: 3.5rem;
                    }
                }

                @media (max-width: 560px) {
                    .rat-programs {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
            <div class="rat-wrap">
                <div class="rat-title-row">
                    <span class="rat-title-line" aria-hidden="true"></span>
                    <h2 class="rat-title">Fusion Residency Alumni</h2>
                    <span class="rat-title-line" aria-hidden="true"></span>
                </div>
                <div class="rat-programs">
                    ${programsHtml}
                </div>
            </div>
        `;
    }
}

customElements.define('app-residency-alumni-table', ResidencyAlumniTable);
export { ResidencyAlumniTable };
