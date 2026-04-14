import placeholderImg from '../assets/dev/program_hero-1.jpg';
import { findArtistByEnglishName } from '../utils/artistSlug.js';
import { findProgramPairByPathname, getArtists, getMyArtistRecord, getPrograms } from '../utils/database.js';
import { getAuthSnapshot } from '../utils/icAuth.js';
import {
    programApplicationCtaLabelForAuth,
    programApplicationReviewLabel,
    programKeyDetailsLabel,
} from '../utils/programApplicationCta.js';
import {
    PROGRAM_APPLICATION_VIEWPORT_TOP_GAP_PX,
    revealProgramApplicationOrOpenJoin,
    scrollElementTopToViewportGap,
} from '../utils/scrollAnchorToViewportGap.js';

function toTrimmedList(values) {
    if (!Array.isArray(values)) return [];
    return values
        .map((f) => {
            if (typeof f === 'string') return f.trim();
            return '';
        })
        .filter(Boolean);
}

function facilitiesToSidebarList(facilities, facilityList) {
    const fromList = toTrimmedList(facilityList);
    if (fromList.length) return fromList;
    if (!Array.isArray(facilities) || !facilities.length) return [];
    return facilities
        .map((f) => {
            if (typeof f === 'string') return f.trim();
            if (!f || typeof f !== 'object') return '';
            const d = (f.description || '').trim();
            const t = (f.title || '').trim();
            return d || t;
        })
        .filter(Boolean);
}

function locationsToSidebarList(cardLocation, detailsLocations) {
    const fromDetails = toTrimmedList(detailsLocations);
    if (fromDetails.length) return fromDetails;
    const single = String(cardLocation || '').trim();
    return single ? [single] : [];
}

function formatCostText(costs) {
    if (!costs || typeof costs !== 'object') return '';
    const base = (costs.base || '').trim();
    const additional = (costs.additional || '').trim();
    if (base && additional) return `${base} + ${additional}`;
    return base || additional;
}

/**
 * @param {string} url
 * @returns {boolean}
 */
export function isVideoUrl(url) {
    const u = String(url || '').split(/[?#]/)[0].toLowerCase();
    return /\.(mp4|webm|ogg)$/i.test(u);
}

/**
 * @param {HTMLElement | null} container
 * @param {string} url
 * @param {string} alt
 */
function setProgramHeroMedia(container, url, alt) {
    if (!container) return;
    const u = String(url || '').trim();
    container.replaceChildren();
    if (!u) return;

    if (isVideoUrl(u)) {
        const v = document.createElement('video');
        v.setAttribute('src', u);
        v.setAttribute('playsinline', '');
        v.muted = true;
        v.autoplay = true;
        v.loop = true;
        v.setAttribute('aria-label', alt || 'Program');
        container.appendChild(v);
        return;
    }
    const img = document.createElement('img');
    img.src = u;
    img.alt = alt || '';
    container.appendChild(img);
}

/** Rebound per route render; previous listeners are aborted. */
let programCtaWireAbort = null;

function hasAppliedForProgram(record, programId) {
    if (!record || !programId) return false;
    const raw = record.applied_json ?? record.appliedJson;
    if (!raw) return false;
    try {
        const j = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Boolean(j && typeof j === 'object' && j[programId]);
    } catch {
        return false;
    }
}

/**
 * @param {string} programId
 * @param {boolean} [applicationsOpen] When false (e.g. studioStatus `comingUp`), hide apply CTAs and form — no “Begin application”.
 */
function wireProgramApplicationSection(programId, applicationsOpen = true) {
    const wrap = document.getElementById('programApplicationWrap');
    const formEl = document.getElementById('programApplicationSection');
    if (formEl && programId) {
        formEl.setAttribute('data-program-id', programId);
    }

    if (programCtaWireAbort) {
        programCtaWireAbort.abort();
    }
    programCtaWireAbort = new AbortController();
    const signal = programCtaWireAbort.signal;

    const introCta1 = document.getElementById('programIntroCTA1');
    const appBtn1 = document.getElementById('applicationButton1');

    const scrollToProgramDetailsSection = () => {
        const el = document.getElementById('programDetailsSection');
        if (!el) return;
        scrollElementTopToViewportGap(el, PROGRAM_APPLICATION_VIEWPORT_TOP_GAP_PX);
    };

    const bindKeyboardButton = (el, onActivate) => {
        if (!el) return;
        el.addEventListener(
            'keydown',
            (ev) => {
                if (ev.key !== 'Enter' && ev.key !== ' ') return;
                ev.preventDefault();
                onActivate();
            },
            { signal }
        );
    };

    if (!applicationsOpen) {
        if (introCta1) {
            introCta1.removeAttribute('hidden');
            introCta1.classList.remove('program-application-cta--review');
            introCta1.classList.add('program-intro-cta--closed-soon');
            introCta1.textContent = 'Coming soon';
            introCta1.setAttribute('aria-hidden', 'false');
            introCta1.setAttribute('aria-disabled', 'true');
            introCta1.removeAttribute('role');
            introCta1.removeAttribute('tabindex');
        }
        const introCtAs = document.getElementById('programIntroCTAs');
        introCtAs?.classList.add('program-intro-ctas--apply-closed');
        if (wrap) {
            wrap.setAttribute('hidden', '');
            wrap.setAttribute('inert', '');
        }
        if (formEl) formEl.setAttribute('active', 'false');
        appBtn1?.addEventListener('click', scrollToProgramDetailsSection, { signal });
        if (appBtn1) appBtn1.textContent = programKeyDetailsLabel();
        bindKeyboardButton(appBtn1, scrollToProgramDetailsSection);
        return;
    }

    document.getElementById('programIntroCTAs')?.classList.remove('program-intro-ctas--apply-closed');
    if (introCta1) {
        introCta1.classList.remove('program-intro-cta--closed-soon');
        introCta1.removeAttribute('aria-disabled');
        introCta1.setAttribute('role', 'button');
        introCta1.setAttribute('tabindex', '0');
    }

    const onPrimaryCta = () => void revealProgramApplicationOrOpenJoin();

    introCta1?.addEventListener('click', onPrimaryCta, { signal });
    appBtn1?.addEventListener('click', scrollToProgramDetailsSection, { signal });
    bindKeyboardButton(introCta1, onPrimaryCta);
    bindKeyboardButton(appBtn1, scrollToProgramDetailsSection);

    const refreshAuthUi = async () => {
        const snap = await getAuthSnapshot();
        let alreadyApplied = false;
        if (snap.authenticated) {
            try {
                const rec = await getMyArtistRecord();
                alreadyApplied = hasAppliedForProgram(rec, programId);
            } catch {
                alreadyApplied = false;
            }
        }
        if (introCta1) {
            introCta1.textContent = alreadyApplied
                ? programApplicationReviewLabel()
                : programApplicationCtaLabelForAuth(snap.authenticated);
            introCta1.classList.toggle('program-application-cta--review', alreadyApplied);
        }
        if (appBtn1) appBtn1.textContent = programKeyDetailsLabel();
        if (!snap.authenticated) {
            if (wrap) {
                wrap.setAttribute('hidden', '');
                wrap.setAttribute('inert', '');
            }
            if (formEl) formEl.setAttribute('active', 'false');
        }
    };

    void refreshAuthUi();
    window.addEventListener('fusion-auth-change', () => void refreshAuthUi(), { signal });
    window.addEventListener('fusion-localechange', () => void refreshAuthUi(), { signal });
    window.addEventListener(
        'fusion-program-application-submitted',
        () => void refreshAuthUi(),
        { signal }
    );
}

export function generateProgramViewContent() {
    return `
        <div class="page program-view-page">
            <main id="programViewMain" class="main-cont">
                <div id="programViewMainContent" class="feed-container">
                    <div class="page-content program-view-content">
                        <div class="program-detail-hero">
                            <div id="programDetailHeroMedia" class="program-detail-hero-media"></div>
                        </div>
                        <div id="programIntroSection">
                            <div id="programIntroTitle"></div>
                            <div id="programIntroSubLines">
                                <p id="programIntroSubLine1"></p>
                                <p id="programIntroSubLine2"></p>
                            </div>
                            <div id="programIntroCTAs">
                                <div id="programIntroCTA1" class="program-intro-cta" role="button" tabindex="0">Sign up & apply</div>
                                <div id="programIntroCTA2">
                                    <div class="horizontal-line"><hr></div>
                                    <div id="applicationButton1" class="program-intro-cta" role="button" tabindex="0">Key Details</div>
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
                        <div id="programApplicationWrap" class="program-application-wrap" hidden inert>
                            <app-application-form id="programApplicationSection" active="false" data-program-id=""></app-application-form>
                        </div>
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

    const hero = document.getElementById('programDetailHeroMedia');
    const introTitle = document.getElementById('programIntroTitle');
    const introSubLine1 = document.getElementById('programIntroSubLine1');
    const introSubLine2 = document.getElementById('programIntroSubLine2');
    const keyOfferingsTitle = document.getElementById('keyOfferingsTitle');
    const confirmedArtistsFeed = document.getElementById('confirmedArtistsFeed');
    const programDetailsSection = document.getElementById('programDetailsSection');

    const titleText = current?.location || programPage?.headline || '';
    const summaryText = current?.briefDescription || programPage?.description || '';
    const subheadlineText = programPage?.subheadline || '';
    const descriptionText = programPage?.description || '';
    const artists = Array.isArray(programPage?.confirmedArtists) ? programPage.confirmedArtists : [];
    const details = programPage?.programDetails || {};
    const keyDates = Array.isArray(details?.keyDates) ? details.keyDates : [];

    const heroUrl = current?.heroMediaSrc || current?.imageSrc || '';
    const heroAlt = current?.imageAlt || titleText || 'Program';
    setProgramHeroMedia(hero, heroUrl, heroAlt);

    if (introTitle) introTitle.textContent = programPage?.headline || titleText;
    if (introSubLine1) introSubLine1.textContent = subheadlineText || summaryText;
    if (introSubLine2) introSubLine2.textContent = descriptionText;

    const programId = current?.id != null ? String(current.id) : '';
    let applicationsOpen = true;
    if (programId) {
        try {
            const rows = await getPrograms();
            const row = rows.find(
                (p) => String(p.id) === programId || p.id === current?.id || String(p.id) === String(current?.id)
            );
            const statusFromRow = row ? String(row.studioStatus ?? '').trim() : '';
            const statusFromCard = String(
                current?.studioStatus ??
                    programPair.en?.studioStatus ??
                    programPair.ja?.studioStatus ??
                    ''
            ).trim();
            const effectiveStatus = statusFromRow || statusFromCard;
            if (effectiveStatus) {
                applicationsOpen = effectiveStatus.toLowerCase() === 'open';
            } else if (current && 'acceptingApplications' in current) {
                applicationsOpen = Boolean(current.acceptingApplications);
            }
        } catch {
            applicationsOpen = true;
        }
    }
    const formEl = document.getElementById('programApplicationSection');
    if (formEl && programId) {
        formEl.setAttribute('data-program-id', programId);
    }

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

    if (
        programDetailsSection &&
        typeof programDetailsSection.setProgramDetails === 'function'
    ) {
        programDetailsSection.setProgramDetails({
            programId,
            applicationsOpen,
            headline: programPage?.detailsHeadline || '',
            keyDates,
            locations: locationsToSidebarList(current?.location, details?.locations),
            facilities: facilitiesToSidebarList(details?.facilities, details?.facilityList),
            costText: formatCostText(details?.costs),
            additionalInfo: programPage?.additionalInfo || null,
        });
    }

    document.title = `${titleText || 'Program'} · Fusion`;

    if (programId) {
        wireProgramApplicationSection(programId, applicationsOpen);
    }
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
    })();
}
