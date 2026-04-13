// Placeholder — structure, content, and styles TBD
class ObjectsHighlightComponent extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        this.data = null;
    }

    get active() {
        return this.getAttribute('active') || false;
    }

    set active(val) {
        const next = val === true || val === 'true' ? 'true' : 'false';
        if (this.getAttribute('active') === next) return;
        this.setAttribute('active', next);
    }

    setObjectsHighlight(data) {
        this.data = data;
        this.render();
    }

    getObjectsHighlight() {
        return this.data;
    }

    static get observedAttributes() {
        return ['active'];
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if (prop === 'active') {
            if (oldVal === newVal) return;
            this.render();
        }
    }

    createObjects() {
        const root = this.shadowRoot;
        if (!root || !this.data) return;
        const objects = Array.isArray(this.data.objects) ? this.data.objects : [];
        const count = Math.min(4, objects.length);
        if (count === 0) return;

        const loc =
            typeof window !== 'undefined' && typeof window.getLocale === 'function'
                ? window.getLocale()
                : 'en';
        const localeSlice = (row) => {
            if (!row || typeof row !== 'object') return {};
            return row[loc] || row.en || row.ja || {};
        };

        const targets = [
            () => root.querySelector('.sect1'),
            () => root.querySelector('.sect2-content1'),
            () => root.querySelector('.sect2-content2'),
            () => root.querySelector('.sect3'),
        ];

        for (let i = 0; i < count; i++) {
            const row = objects[i];
            const slice = localeSlice(row);
            const objectImage = row.image;
            const objectAlt = slice.alt ?? '';
            const objectLink = slice.link ?? row.link ?? '';

            if (objectImage == null || objectImage === '') continue;

            const objectCard = document.createElement('div');
            objectCard.classList.add('object-card');
            objectCard.innerHTML = `
                <div class="object-card-image" id="object-card-${i}">
                    <img src="${objectImage}" alt="${objectAlt}">
                </div>
            `;

            const parent = targets[i]();
            if (parent) parent.appendChild(objectCard);

            if (objectLink) {
                objectCard.addEventListener('click', () => {
                    window.location.href = objectLink;
                });
            }
        }
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                }

                .objects-highlight {
                    width: 100%;
                    height: calc(100vh - 120px);
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 10% 90%;
                    padding-bottom: 120px;
                }
                
                .header {
                    width: 98%;
                    height: 100%;
                    font-size: 1.4rem;
                    font-variation-settings: var(--fv-display);
                    padding-left: 2%;
                    user-select: none;
                }
                
                .content {
                    width: 80%;
                    height: 100%;
                    min-height: 0;
                    display: grid;
                    margin-left: 10%;
                    margin-right: 10%;
                    grid-template-columns: 33.33% 33.33% 33.33%;
                    grid-template-rows: 1fr;
                    overflow: hidden;
                }
                
                .object-card {
                    width: 100%;
                    height: 100%;
                    min-width: 0;
                    min-height: 0;
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 1fr;
                    cursor: pointer;
                    transition: all 0.5s ease;
                }

                .object-card:hover > .object-card-image > img {
                    transform: scale(1.05);
                }
                
                .object-card-image {
                    width: 100%;
                    min-width: 0;
                    min-height: 0;
                    height: 100%;
                    overflow: hidden;
                    position: relative;
                }
                
                .object-card-image img {
                    display: block;
                    width: 100%;
                    height: 100%;
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: cover;
                    transition: all 0.5s ease;
                }

                .sect1 {
                    width: 100%;
                    height: 100%;
                    min-height: 0;
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 1fr;
                }

                .sect2 {
                    width: 100%;
                    height: 100%;
                    min-height: 0;
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 1fr 1fr;
                }
                
                .sect3 {
                    width: 100%;
                    height: 100%;
                    min-height: 0;
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 1fr;
                }

                @media (max-width: 1024px) {
                    .content {
                        grid-template-columns: 1fr 1fr;
                        width: 92%;
                        margin-left: 4%;
                        margin-right: 4%;
                    }
                }

                @media (max-width: 768px) {
                    .objects-highlight {
                        height: auto;
                        min-height: 0;
                        padding-bottom: 4rem;
                        grid-template-rows: auto 1fr;
                    }

                    .header {
                        margin-bottom: 5%;
                    }

                    .content {
                        width: 100%;
                        margin-left: 0;
                        margin-right: 0;
                        min-height: 0;
                        grid-template-columns: 1fr 1fr;
                        grid-template-rows: auto;
                        align-items: stretch;
                    }

                    .sect1 {
                        grid-column: 1 / 3;
                    }

                    .sect2 {
                        grid-column: 1 / 3;
                        grid-template-columns: 1fr 1fr;
                        grid-template-rows: 1fr;
                    }

                    .sect3 {
                        grid-column: 1 / 3;
                    }
                }
            </style>
            <div class="objects-highlight">
                <div class="header">Objects Highlights</div>
                <div class="content">
                    <div class="sect1"></div>
                    <div class="sect2">
                        <div class="sect2-content1"></div>
                        <div class="sect2-content2"></div>
                    </div>  
                    <div class="sect3"></div>
                </div>
            </div>
        `;
    }
}

customElements.define('app-objects-highlight', ObjectsHighlightComponent);

export { ObjectsHighlightComponent };
