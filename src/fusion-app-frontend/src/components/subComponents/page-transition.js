/**
 * Full-viewport veil using `--bg`; fade in before route swap, fade out after (see router `handleRoute`).
 */
const FADE_MS = 500;

class PageTransitionComponent extends HTMLElement {
    constructor() {
        super();
        const root = this.attachShadow({ mode: 'open' });
        root.innerHTML = `
            <style>
                :host {
                    position: fixed;
                    inset: 0;
                    z-index: 1;
                    pointer-events: none;
                }
                :host([data-blocking="true"]) {
                    pointer-events: auto;
                }
                .veil {
                    width: 100%;
                    height: 100%;
                    background-color: var(--bg);
                    opacity: 0;
                    transition: opacity ${FADE_MS}ms ease-in-out;
                }
                .veil.is-on {
                    opacity: 1;
                }
            </style>
            <div class="veil" part="veil"></div>
        `;
        this._veil = root.querySelector('.veil');
    }

    /**
     * Fade in to solid `--bg` (blocks interaction while opaque).
     * @returns {Promise<void>}
     */
    cover() {
        const veil = this._veil;
        if (!veil) return Promise.resolve();

        return new Promise((resolve) => {
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                resolve();
            };

            const onEnd = (e) => {
                if (e.propertyName !== 'opacity') return;
                veil.removeEventListener('transitionend', onEnd);
                finish();
            };
            veil.addEventListener('transitionend', onEnd);

            this.setAttribute('data-blocking', 'true');
            requestAnimationFrame(() => {
                veil.classList.add('is-on');
            });

            window.setTimeout(finish, FADE_MS + 80);
        });
    }

    /**
     * Fade out veil to transparent.
     * @returns {Promise<void>}
     */
    reveal() {
        const veil = this._veil;
        if (!veil) return Promise.resolve();

        return new Promise((resolve) => {
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                this.removeAttribute('data-blocking');
                resolve();
            };

            const onEnd = (e) => {
                if (e.propertyName !== 'opacity') return;
                veil.removeEventListener('transitionend', onEnd);
                finish();
            };
            veil.addEventListener('transitionend', onEnd);

            veil.classList.remove('is-on');

            window.setTimeout(finish, FADE_MS + 80);
        });
    }
}

customElements.define('app-page-transition', PageTransitionComponent);

export { PageTransitionComponent };
