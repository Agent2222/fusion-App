import { renderHeader } from './shared/header.js';
import { renderFooter } from './shared/footer.js';

import { testData } from '../testData.js';

function toProgramBlockData(enCard, jaCard) {
    return {
        imageSrc: enCard.imageSrc,
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
                    <div id="programsBlocks"></div>
                </div>
            </main>
        </div>
    `;
}

export default function initPrograms() {
    console.log('Programs page initialized');

    const blocksHost = document.getElementById('programsBlocks');
    if (blocksHost) {
        blocksHost.innerHTML = '';
        const enCards = testData.allPrograms?.programs?.en || [];
        const jaCards = testData.allPrograms?.programs?.ja || [];
        for (let i = 0; i < enCards.length; i++) {
            const enCard = enCards[i];
            const jaCard = jaCards[i] || enCard;
            const block = document.createElement('app-program-block');
            block.setAttribute('active', 'true');
            block.setAttribute('layout', i % 2 === 0 ? 'left' : 'right');
            if (typeof block.setProgramBlock === 'function') {
                block.setProgramBlock(toProgramBlockData(enCard, jaCard));
            }
            blocksHost.appendChild(block);
        }
    }
}

export function generateProgramsContent() {
    console.log('Programs content generated');
    return render();
}
