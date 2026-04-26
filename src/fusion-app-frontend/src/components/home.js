import { renderHeader } from './shared/header.js';
import { renderFooter } from './shared/footer.js';
import {
    getFeaturedArtists,
    getGalleryAccessCta,
    getJournalsHeroBlock,
    getObjectsHighlight,
    getProgramHero,
    getAllProgramsBlock,
    filterProgramsBlockToPublicListing,
} from '../utils/database.js';

/** Cached home bundle so returning to `/` can paint immediately without NaN/empty flashes. */
let _homeBlocksCache = null;

export function render() {
    return `
        <div class="page home-page">
            ${renderHeader()}
            ${renderFooter()}
            <main id="homeMain" class="main-cont">
                <div id="homeMainContent" class="feed-container">
                    <app-program-hero id="programHero" active="true"></app-program-hero>
                    <app-coming-up id="comingUp" active="true"></app-coming-up>
                    <div class="artist-card-toggle-row"><app-artist-card-image-toggle id="homeArtistCardImageToggle" aria-label="Artist card image mode"></app-artist-card-image-toggle></div>
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

/** Studio → Content saves fire this; refresh blocks that read CMS or legacy site JSON. */
/** @param {Event} ev */
function onFusionContentPagesChanged(ev) {
    const d = /** @type {CustomEvent<{ slug?: string }>} */ (ev).detail;
    const slug = d?.slug;
    if (
        slug &&
        slug !== 'program-hero' &&
        slug !== 'objects-highlight' &&
        slug !== 'gallery-access-cta'
    ) {
        return;
    }
    _homeBlocksCache = null;
    void loadHomeBlocks();
}

async function applyHomeBlocks(
    programHeroData,
    allPrograms,
    featured,
    objectsHl,
    galleryCta,
    journalsBlock
) {
    const programHero = document.getElementById('programHero');
    if (programHero && typeof programHero.setProgram === 'function') {
        programHero.setProgram(programHeroData);
    }

    const comingUp = document.getElementById('comingUp');
    if (comingUp && typeof comingUp.setComingUp === 'function') {
        comingUp.setComingUp(allPrograms);
    }

    const featuredArtist = document.getElementById('featuredArtist');
    if (featuredArtist && typeof featuredArtist.setFeaturedArtist === 'function') {
        featuredArtist.setFeaturedArtist({ artists: featured || [] });
        if (typeof featuredArtist.createArtistCard === 'function') {
            await featuredArtist.createArtistCard((featured || []).length);
        }
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
}

async function loadHomeBlocks() {
    if (_homeBlocksCache) {
        await applyHomeBlocks(..._homeBlocksCache);
    }
    const bundle = await Promise.all([
        getProgramHero(),
        getAllProgramsBlock().then((b) => filterProgramsBlockToPublicListing(b)),
        getFeaturedArtists(),
        getObjectsHighlight(),
        getGalleryAccessCta(),
        getJournalsHeroBlock(),
    ]);
    _homeBlocksCache = bundle;
    await applyHomeBlocks(...bundle);
}

/** @type {((ev: Event) => void) | null} */
let _homeCmsListener = null;
/** @type {((ev: Event) => void) | null} */
let _homeFeaturedMetaListener = null;

export default function initHome() {
    console.log('Home page initialized');

    void loadHomeBlocks();

    if (_homeCmsListener) {
        window.removeEventListener('fusion-content-pages-changed', _homeCmsListener);
    }
    _homeCmsListener = onFusionContentPagesChanged;
    window.addEventListener('fusion-content-pages-changed', _homeCmsListener);

    if (_homeFeaturedMetaListener) {
        window.removeEventListener('fusion-artist-featured-meta-change', _homeFeaturedMetaListener);
    }
    _homeFeaturedMetaListener = () => {
        _homeBlocksCache = null;
        void loadHomeBlocks();
    };
    window.addEventListener('fusion-artist-featured-meta-change', _homeFeaturedMetaListener);

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
