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
        for (let i=0; i<4; i++) {
            const objectName = this.data.objects[i][window.getLocale()].name;
            const objectImage = this.data.objects[i].image;
            const objectAlt = this.data.objects[i][window.getLocale()].alt;
            const objectCredit = this.data.objects[i][window.getLocale()].credit;
            const objectDescription = this.data.objects[i][window.getLocale()].description;
            const objectCopy = this.data.objects[i][window.getLocale()].copy;
            const objectLink = this.data.objects[i][window.getLocale()].link;

            let objectCard = document.createElement('div');
            objectCard.classList.add('object-card');
            objectCard.innerHTML = `
                <div class="object-card-image" id="object-card-${objectName}">
                    <img src="${objectImage}" alt="${objectAlt}">
                </div>
            `;

            switch (i) {
                case 0:
                    this.shadowRoot.querySelector('.sect1').appendChild(objectCard);
                    break;
                case 1:
                    this.shadowRoot.querySelector('.sect2').appendChild(objectCard);
                    break;
                case 2:
                    this.shadowRoot.querySelector('.sect2').appendChild(objectCard);
                    break;
                case 3:
                    this.shadowRoot.querySelector('.sect3').appendChild(objectCard);
                    break;
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

                    .content {
                        grid-template-columns: 1fr;
                        width: 90%;
                        margin-left: 5%;
                        margin-right: 5%;
                        min-height: 50vh;
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
