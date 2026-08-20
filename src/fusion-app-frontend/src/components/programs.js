import { renderHeader } from './shared/header.js';
import { renderFooter } from './shared/footer.js';

import {
    filterProgramsBlockToPublicListing,
    getAllProgramsBlock,
    subscribeDataSource,
} from '../utils/database.js';
import { firstNonEmptyString } from '../utils/localeFallback.js';

function toProgramBlockData(enCard, jaCard) {
    return {
        imageSrc: firstNonEmptyString(jaCard?.imageSrc, enCard?.imageSrc),
        routeLink: enCard.routeLink,
        en: {
            focus: enCard.focus || '',
            imageAlt: enCard.focus || enCard.imageAlt || 'Program',
            location: enCard.location,
            season: `${enCard.startDate} - ${enCard.endDate}`,
            year: enCard.year,
            briefDescription: enCard.briefDescription || '',
            totalSlots: enCard.totalSlots || 0,
            availableSlots: enCard.availableSlots || 0,
            cta: 'Learn More',
        },
        ja: {
            focus: jaCard.focus || '',
            imageAlt: jaCard.focus || jaCard.imageAlt || 'プログラム',
            location: jaCard.location,
            season: `${jaCard.startDate} - ${jaCard.endDate}`,
            year: jaCard.year,
            briefDescription: jaCard.briefDescription || '',
            totalSlots: jaCard.totalSlots || 0,
            availableSlots: jaCard.availableSlots || 0,
            cta: '詳細を見る',
        },
    };
}

export function render() {
    return `
        <div class="page programs-page">
            <main id="programsMain" class="main-cont">
                <div id="programsMainContent" class="feed-container">
                    <header class="programs-page-intro">
                        <h1 class="programs-page-intro__title">Japan artist residency programs</h1>
                        <p class="programs-page-intro__lead">
                            Fusion hosts curated Japan artist residency programs for practicing artists —
                            place-based residencies across Japan with studio time, exchange, and a clear path to apply.
                            Start with the
                            <a href="/program/kaga-ishikawa">Kaga, Ishikawa Japan artist residency</a>,
                            or browse the programs below.
                            Residencies are part of Fusion’s
                            <a href="/join-network">curated art network</a>
                            for artists, galleries, curators, and collectors —
                            <a href="/join-network">join the network</a>
                            when you are ready for membership.
                        </p>
                    </header>
                    <div id="programsBlocks"></div>
                </div>
            </main>
        </div>
    `;
}

/** @type {(() => void) | null} */
let _unsubPrograms = null;

export default function initPrograms() {
    console.log('Programs page initialized');

    if (_unsubPrograms) {
        _unsubPrograms();
        _unsubPrograms = null;
    }

    const mount = async () => {
        const blocksHost = document.getElementById('programsBlocks');
        if (!blocksHost) return;
        blocksHost.innerHTML = '';
        const block = filterProgramsBlockToPublicListing(await getAllProgramsBlock());
        const enCards = block?.programs?.en || [];
        const jaCards = block?.programs?.ja || [];
        for (let i = 0; i < enCards.length; i++) {
            const enCard = enCards[i];
            const jaCard = jaCards[i] || enCard;
            const el = document.createElement('app-program-block');
            el.setAttribute('active', 'true');
            el.setAttribute('layout', i % 2 === 0 ? 'left' : 'right');
            if (typeof el.setProgramBlock === 'function') {
                el.setProgramBlock(toProgramBlockData(enCard, jaCard));
            }
            blocksHost.appendChild(el);
        }
    };

    void mount();
    _unsubPrograms = subscribeDataSource(() => {
        void mount();
    });
}

export function generateProgramsContent() {
    console.log('Programs content generated');
    return render();
}
