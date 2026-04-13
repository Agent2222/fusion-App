import { navigate } from '../../router.js';

// Placeholder — structure, content, and styles TBD
class ComingUpComponent extends HTMLElement {
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

    setComingUp(data) {
        this.data = data;
        this.render();
    }

    getComingUp() {
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

    createCards() {
        for (let i=0; i<3; i++) {
            const location = this.data.programs[window.getLocale()][i].location;
            const startDate = this.data.programs[window.getLocale()][i].startDate;
            const endDate = this.data.programs[window.getLocale()][i].endDate;
            const year = this.data.programs[window.getLocale()][i].year;
            const imageSrc = this.data.programs[window.getLocale()][i].imageSrc;
            const imageAlt = this.data.programs[window.getLocale()][i].imageAlt;
            const focus = this.data.programs[window.getLocale()][i].focus;
            const routeLink = this.data.programs[window.getLocale()][i].routeLink;

            let card = document.createElement('div');
            card.classList.add('program-card');
            card.addEventListener('click', () => {
                navigate(routeLink);
            });
            card.innerHTML = `
                <div class="program-card-image">
                    <div class="programFocus">${focus}</div>
                    <img src="${imageSrc}" alt="${imageAlt}">
                </div>
                <div class="program-card-content">
                    <div class="program-card-title">${location}</div>
                    <div class="programDates">
                        <div class="program-card-description">${startDate} - ${endDate}</div>
                        <div class="program-card-year">${year}</div>
                    </div>
                </div>
            `;
            
            this.shadowRoot.querySelector('.content').appendChild(card);
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

                .coming-up {
                    width: 100%;
                    height: calc(84vh - 100px);
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 8% 92%;
                    overflow: hidden;
                    padding-top: 60px;
                    padding-bottom: 0px;
                }

                .header {
                    width: 100%;
                    height: 100%;
                    font-size: 1.4rem;
                    font-variation-settings: var(--fv-display);
                    padding-left: 2%;
                    user-select: none;
                }

                .content {
                    width: 100%;
                    height: 100%;
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    grid-template-rows: 1fr;
                }

                .program-card {
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 60% 40%;
                    position: relative;
                    cursor: pointer;
                    transition: all 0.5s ease;
                }

                .program-card:hover > .program-card-content > .program-card-title {
                    text-decoration: underline;
                    transform: scale(1.05);
                }

                .program-card:hover > .program-card-image > img {
                    animation: scaleImage 15s ease forwards;
                }

                @keyframes scaleImage {
                    from {
                        transform: scale(1);
                    }
                    to {
                        transform: scale(1.2);
                    }
                }

                .program-card-image {
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    user-select: none;
                }
                
                .program-card-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: all 0.5s ease;
                }
                
                .program-card-content {
                    width: 95%;
                    height: 100%;
                    overflow: hidden;
                    padding-left: 5%;
                    display: flex;
                    flex-direction: column;
                    align-items: start;
                    justify-content: start;
                }
                
                .programFocus {
                    width: 40%;
                    height: 33px;
                    font-size: 1rem;
                    font-variation-settings: var(--fv-body-wide);
                    letter-spacing: 0.08em;
                    color: var(--c3);
                    background-color: var(--c2);
                    padding-left: 4%;
                    display: flex;
                    align-items: center;
                    justify-content: start;
                    position: absolute;
                    top: 4%;
                    right: 0;
                    z-index: 5;
                    user-select: none;
                }

                .program-card-title {
                    font-size: clamp(2rem, 2.2vw, 2.6rem);
                    font-variation-settings: var(--fv-emphasis);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                    margin-top: 2%;
                    user-select: auto;
                    transition: all 0.5s ease;
                }

                .programDates {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: start;
                    justify-content: start;
                }

                .program-card-description {
                    font-size: 1.4rem;
                    font-variation-settings: var(--fv-label-strong);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                    line-height: 1.2;
                }

                .program-card-year {
                    font-size: 1.4rem;
                    font-variation-settings: var(--fv-label-strong);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                    line-height: 1.2;
                }

                @media (max-width: 1024px) {
                    .coming-up {
                        height: auto;
                        min-height: 50vh;
                        grid-template-rows: auto 1fr;
                        padding-top: 2rem;
                    }

                    .content {
                        grid-template-columns: 1fr 1fr;
                    }
                }

                @media (max-width: 768px) {
                    .content {
                        grid-template-columns: 1fr;
                    }

                    .coming-up {
                        padding-top: 1.25rem;
                    }
                }

                @media (max-width: 480px) {
                    .header {
                        font-size: 1.15rem;
                    }
                }

                @media (max-width: 768px) {
                    .header {
                        margin-bottom: 6%;
                    }

                    .programFocus {
                        width: 60%;
                        top: 0;
                    }
                }
            </style>
            <div class="coming-up">
                 <div class="header">Current & Upcoming</div>
                 <div class="content threeColumn"></div>
            </div>
        `;
    }
}

customElements.define('app-coming-up', ComingUpComponent);

export { ComingUpComponent };
