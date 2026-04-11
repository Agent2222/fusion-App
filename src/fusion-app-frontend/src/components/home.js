import { renderHeader } from './shared/header.js';
import { renderFooter } from './shared/footer.js';
import {
    getFeaturedArtists,
    getGalleryAccessCta,
    getJournalsHeroBlock,
    getObjectsHighlight,
    getProgramHero,
    getAllProgramsBlock,
} from '../utils/database.js';

export function render() {
    return `
        <div class="page home-page">
            ${renderHeader()}
            ${renderFooter()}
            <main id="homeMain" class="main-cont">
                <div id="homeMainContent" class="feed-container">
                    <app-program-hero id="programHero" active="true"></app-program-hero>
                    <app-coming-up id="comingUp" active="true"></app-coming-up>
                    <app-featured-artist id="featuredArtist" active="true"></app-featured-artist>
                    <app-objects-highlight id="objectsHighlight" active="true"></app-objects-highlight>
                    <app-gallery-access-cta id="galleryAccessCta" active="true"></app-gallery-access-cta>
                    <app-journal-hero id="journalHero" active="true"></app-journal-hero>
                    <app-join-network id="joinNetwork" data-modal-type="membership" context="home" active="true" data-margin-bottom="200px"></app-join-network>
                </div>
            </main>
        </div>
    `;
}

export default function initHome() {
    console.log('Home page initialized');

    void (async () => {
        const [programHeroData, allPrograms, featured, objectsHl, galleryCta, journalsBlock] =
            await Promise.all([
                getProgramHero(),
                getAllProgramsBlock(),
                getFeaturedArtists(),
                getObjectsHighlight(),
                getGalleryAccessCta(),
                getJournalsHeroBlock(),
            ]);

        const programHero = document.getElementById('programHero');
        if (programHero && typeof programHero.setProgram === 'function') {
            programHero.setProgram(programHeroData);
        }

        const comingUp = document.getElementById('comingUp');
        if (comingUp && typeof comingUp.setComingUp === 'function') {
            comingUp.setComingUp(allPrograms);
            comingUp.createCards();
        }

        const featuredArtist = document.getElementById('featuredArtist');
        if (featuredArtist && typeof featuredArtist.setFeaturedArtist === 'function') {
            featuredArtist.setFeaturedArtist({ artists: featured || [] });
            featuredArtist.createArtistCard((featured || []).length);
            featuredArtist.showAllArtistsButton();
        }

        const objectsHighlight = document.getElementById('objectsHighlight');
        if (objectsHighlight && typeof objectsHighlight.setObjectsHighlight === 'function') {
            objectsHighlight.setObjectsHighlight(objectsHl);
            objectsHighlight.createObjects();
        }

        const galleryAccessCta = document.getElementById('galleryAccessCta');
        if (galleryAccessCta && typeof galleryAccessCta.setGalleryAccessCta === 'function') {
            galleryAccessCta.setGalleryAccessCta(galleryCta);
            galleryAccessCta.createCTA();
        }

        const journalHero = document.getElementById('journalHero');
        if (journalHero && typeof journalHero.setJournalHero === 'function') {
            journalHero.setJournalHero(journalsBlock);
            journalHero.createJournals();
        }
    })();

    const homeButton = document.getElementById('homeButton');
    if (homeButton) {
        homeButton.addEventListener('click', () => {
            console.log('Home button clicked');
        });
    }
}

export function generateHomeContent() {
    console.log('Home content generated');
}
