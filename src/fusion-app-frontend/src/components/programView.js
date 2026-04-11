import placeholderImg from '../../assets/dev/program_hero-1.jpg';
import { findArtistByEnglishName } from '../utils/artistSlug.js';
import { findProgramPairByPathname, getArtists } from '../utils/database.js';
import {
    PROGRAM_APPLICATION_VIEWPORT_TOP_GAP_PX,
    scrollElementTopToViewportGap,
} from '../utils/scrollAnchorToViewportGap.js';

function facilitiesToSidebarText(facilities) {
    if (!Array.isArray(facilities) || !facilities.length) return '';
    const parts = facilities
        .map((f) => {
            if (typeof f === 'string') return f.trim();
            if (!f || typeof f !== 'object') return '';
            const d = (f.description || '').trim();
            const t = (f.title || '').trim();
            return d || t;
        })
        .filter(Boolean);
    return parts.join(' ');
}

function formatCostText(costs) {
    if (!costs || typeof costs !== 'object') return '';
    const base = (costs.base || '').trim();
    const additional = (costs.additional || '').trim();
    if (base && additional) return `${base} + ${additional}`;
    return base || additional;
}

export function generateProgramViewContent() {
    return `
        <div class="page program-view-page">
            <main id="programViewMain" class="main-cont">
                <div id="programViewMainContent" class="feed-container">
                    <div class="page-content program-view-content">
                        <div class="program-detail-hero">
                            <img id="programDetailImage" src="" alt=""/>
                        </div>
                        <div id="programIntroSection">
                            <div id="programIntroTitle"></div>
                            <div id="programIntroSubLines">
                                <p id="programIntroSubLine1"></p>
                                <p id="programIntroSubLine2"></p>
                            </div>
                            <div id="programIntroCTAs">
                                <div id="programIntroCTA1">Begin Application</div>
                                <div id="programIntroCTA2">
                                    <div class="horizontal-line"><hr></div>
                                    <div id="applicationButton1">Reserve Your Space</div>
                                    <div class="horizontal-line"><hr></div>
                                </div>
                            </div>
                        </div>
                        <div id="keyOfferingsSection">
                            <div id="keyOfferingsTitle"></div>
                            <div id="keyOfferingsGallery"></div>
                            <app-features-row data-area="programs" active="true" ></app-features-row>
                        </div>
                        <app-confirmed-artists-feed id="confirmedArtistsFeed" active="true"></app-confirmed-artists-feed>
                        <app-program-details id="programDetailsSection" active="true"></app-program-details>
                        <app-application-form id="programApplicationSection" active="true"></app-application-form>
                        <div class="shoutHeadline">
                            This is not for every artist.<br><br>It is for those willing to work<br>within unfamiliar environments—<br>alongside others,<br> in close proximity to place and process.
                        </div>
                        <app-join-network id="joinNetworkProgram" data-modal-type="apply" context="programs" active="true" data-margin-top="64px" data-margin-bottom="120px"></app-join-network>
                        <div id="programDetailNotFound" class="program-detail-not-found" hidden>
                            <p>We could not find that program.</p>
                            <p><a href="/programs">Browse programs</a></p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    `;
}

async function applyProgramToDom(programPair) {
    const locale = typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
    const current = locale === 'ja' ? programPair.ja : programPair.en;
    const programPage = {
        ...(programPair.en?.programPage || {}),
        ...(current?.programPage || {}),
    };

    const image = document.getElementById('programDetailImage');
    const introTitle = document.getElementById('programIntroTitle');
    const introSubLine1 = document.getElementById('programIntroSubLine1');
    const introSubLine2 = document.getElementById('programIntroSubLine2');
    const introCTAs = document.getElementById('programIntroCTAs');
    const keyOfferingsTitle = document.getElementById('keyOfferingsTitle');
    const keyOfferingsGallery = document.getElementById('keyOfferingsGallery');
    const confirmedArtistsFeed = document.getElementById('confirmedArtistsFeed');
    const programDetailsSection = document.getElementById('programDetailsSection');

    const titleText = current?.location || programPage?.headline || '';
    const summaryText = current?.briefDescription || programPage?.description || '';
    const subheadlineText = programPage?.subheadline || '';
    const descriptionText = programPage?.description || '';
    const offerings = Array.isArray(programPage?.offeringCards) ? programPage.offeringCards : [];
    const artists = Array.isArray(programPage?.confirmedArtists) ? programPage.confirmedArtists : [];
    const details = programPage?.programDetails || {};
    const keyDates = Array.isArray(details?.keyDates) ? details.keyDates : [];

    if (image) {
        image.src = current?.imageSrc || '';
        image.alt = current?.imageAlt || titleText || 'Program';
    }
    if (introTitle) introTitle.textContent = programPage?.headline || titleText;
    if (introSubLine1) introSubLine1.textContent = subheadlineText || summaryText;
    if (introSubLine2) introSubLine2.textContent = descriptionText;

    if (confirmedArtistsFeed && typeof confirmedArtistsFeed.setConfirmedArtistsFeed === 'function') {
        const headline = programPage?.confirmedHeadline || '';
        const pool = (await getArtists()) || [];
        const resolved = artists.map((name) => {
            const label = typeof name === 'string' ? name : name?.name || '';
            const found = label ? findArtistByEnglishName(label, pool) : null;
            if (found) return found;
            return {
                image: placeholderImg,
                locales: {
                    en: { name: label || 'Artist', discipline: '' },
                    ja: { name: label || 'Artist', discipline: '' },
                },
            };
        });
        const availableSlots = typeof current?.availableSlots === 'number' ? current.availableSlots : null;
        const totalSlots = typeof current?.totalSlots === 'number' ? current.totalSlots : null;
        confirmedArtistsFeed.setConfirmedArtistsFeed({
            headline,
            availableSlots,
            totalSlots,
            artists: resolved,
        });
    }

    if (keyOfferingsTitle) {
        keyOfferingsTitle.textContent = programPage?.offeringHeadline || '';
    }

    // if (keyOfferingsGallery) {
    //     keyOfferingsGallery.innerHTML = offerings.map((offering) => `<img src="${offering.gallery[0]}" alt="${offering.title}">`).join('');
    //     keyOfferingsGallery.innerHTML = offerings.map((offering) => `<img src="${offering.gallery[0]}" alt="${offering.title}">`).join('');
    //     keyOfferingsGallery.innerHTML = offerings.map((offering) => `<img src="${offering.gallery[0]}" alt="${offering.title}">`).join('');
    // }

    if (
        programDetailsSection &&
        typeof programDetailsSection.setProgramDetails === 'function'
    ) {
        programDetailsSection.setProgramDetails({
            headline: programPage?.detailsHeadline || '',
            keyDates,
            location: (current?.location || '').trim(),
            facilitiesText: facilitiesToSidebarText(details?.facilities),
            costText: formatCostText(details?.costs),
            additionalInfo: programPage?.additionalInfo || null,
        });
    }

    document.title = `${titleText || 'Program'} · Fusion`;
}

export default function initProgramView() {
    const pathname = window.location.pathname;
    const notFound = document.getElementById('programDetailNotFound');

    const show = (el, on) => {
        if (!el) return;
        if (on) el.removeAttribute('hidden');
        else el.setAttribute('hidden', '');
    };

    void (async () => {
        const pair = await findProgramPairByPathname(pathname);
        if (!pair) {
            show(notFound, true);
            document.title = 'Program not found · Fusion';
            return;
        }

        show(notFound, false);
        await applyProgramToDom(pair);

        const scrollToApplication = () => {
            const section = document.getElementById('programApplicationSection');
            scrollElementTopToViewportGap(section, PROGRAM_APPLICATION_VIEWPORT_TOP_GAP_PX);
        };

        const introCta1 = document.getElementById('programIntroCTA1');
        if (introCta1) {
            introCta1.addEventListener('click', scrollToApplication);
        }
    })();
}
