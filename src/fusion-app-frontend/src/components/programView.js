import placeholderImg from "../assets/dev/program_hero-1.jpg";
import { findArtistByEnglishName } from "../utils/artistSlug.js";
import {
  findProgramPairByPathname,
  getApplicationPaymentGlobal,
  getArtists,
  getMyArtistRecord,
  getPrograms,
} from "../utils/database.js";
import { getAuthSnapshot } from "../utils/icAuth.js";
import posthog from "posthog-js";
import {
  programApplicationCtaLabelForAuth,
  programApplicationReviewLabel,
  programKeyDetailsLabel,
} from "../utils/programApplicationCta.js";
import {
  PROGRAM_APPLICATION_VIEWPORT_TOP_GAP_PX,
  revealProgramApplicationOrOpenJoin,
  scrollElementTopToViewportGap,
} from "../utils/scrollAnchorToViewportGap.js";
import { mergeLocaleDeep } from "../utils/localeFallback.js";
import { getPublicSiteOrigin } from "../config.js";
import { applyDocumentSeo } from "../utils/documentSeo.js";
import { buildProgramApplicationFormContext } from "../utils/programApplicationFormContext.js";
import { withSeoImageAlt, withSeoVideoLabel } from "../utils/mediaAltSeo.js";

function toTrimmedList(values) {
  if (!Array.isArray(values)) return [];
  return values
    .map((f) => {
      if (typeof f === "string") return f.trim();
      return "";
    })
    .filter(Boolean);
}

function facilitiesToSidebarList(facilities, facilityList) {
  const fromList = toTrimmedList(facilityList);
  if (fromList.length) return fromList;
  if (!Array.isArray(facilities) || !facilities.length) return [];
  return facilities
    .map((f) => {
      if (typeof f === "string") return f.trim();
      if (!f || typeof f !== "object") return "";
      const d = (f.description || "").trim();
      const t = (f.title || "").trim();
      return d || t;
    })
    .filter(Boolean);
}

function locationsToSidebarList(cardLocation, detailsLocations) {
  const fromDetails = toTrimmedList(detailsLocations);
  if (fromDetails.length) return fromDetails;
  const single = String(cardLocation || "").trim();
  return single ? [single] : [];
}

function formatCostText(costs) {
  if (!costs || typeof costs !== "object") return "";
  const base = (costs.base || "").trim();
  const additional = (costs.additional || "").trim();
  if (base && additional) return `${base} + ${additional}`;
  return base || additional;
}

/**
 * @param {string} url
 * @returns {boolean}
 */
export function isVideoUrl(url) {
  const u = String(url || "")
    .split(/[?#]/)[0]
    .toLowerCase();
  return /\.(mp4|webm|ogg)$/i.test(u);
}

/**
 * @param {HTMLElement | null} container
 * @param {string} url Hero media URL (image or video).
 * @param {string} alt Accessible name for video / image.
 * @param {string} [posterStillUrl] When `url` is a video: still image (e.g. program card `imageSrc`) shown until the video fades in; falls back to bundled placeholder.
 */
function setProgramHeroMedia(container, url, alt, posterStillUrl) {
  if (!container) return;
  const u = String(url || "").trim();
  container.replaceChildren();
  if (!u) return;

  if (isVideoUrl(u)) {
    const still = String(posterStillUrl || "").trim();
    const poster = still && !isVideoUrl(still) ? still : placeholderImg;

    const posterImg = document.createElement("img");
    posterImg.className = "program-detail-hero-poster";
    posterImg.src = poster;
    posterImg.alt = withSeoImageAlt(alt || "Program hero");
    posterImg.decoding = "async";
    posterImg.setAttribute("fetchpriority", "high");

    const v = document.createElement("video");
    v.className = "program-detail-hero-video";
    v.setAttribute("src", u);
    v.setAttribute("playsinline", "");
    v.setAttribute("poster", poster);
    v.preload = "auto";
    v.muted = true;
    v.autoplay = true;
    v.loop = true;
    const vLabel = withSeoVideoLabel(alt || "Program hero");
    v.setAttribute("aria-label", vLabel);
    v.setAttribute("title", vLabel);
    v.style.opacity = "0";
    v.style.transition = "opacity 0.65s ease";

    let fadedIn = false;
    const fadeIn = () => {
      if (fadedIn) return;
      fadedIn = true;
      requestAnimationFrame(() => {
        v.style.opacity = "1";
      });
    };
    v.addEventListener("loadeddata", fadeIn, { once: true });
    if (v.readyState >= 2) {
      fadeIn();
    }

    container.appendChild(posterImg);
    container.appendChild(v);
    return;
  }
  const img = document.createElement("img");
  img.src = u;
  img.alt = withSeoImageAlt(alt);
  container.appendChild(img);
}

/** Rebound per route render; previous listeners are aborted. */
let programCtaWireAbort = null;

function hasAppliedForProgram(record, programId) {
  if (!record || !programId) return false;
  const raw = record.applied_json ?? record.appliedJson;
  if (!raw) return false;
  try {
    const j = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Boolean(j && typeof j === "object" && j[programId]);
  } catch {
    return false;
  }
}

/**
 * @param {string} programId
 * @param {boolean} [applicationsOpen] When false (e.g. studioStatus `comingUp`), hide apply CTAs and form — no “Begin application”.
 */
function wireProgramApplicationSection(programId, applicationsOpen = true) {
  const wrap = document.getElementById("programApplicationWrap");
  const formEl = document.getElementById("programApplicationSection");
  if (formEl && programId) {
    formEl.setAttribute("data-program-id", programId);
  }

  if (programCtaWireAbort) {
    programCtaWireAbort.abort();
  }
  programCtaWireAbort = new AbortController();
  const signal = programCtaWireAbort.signal;

  const introCta1 = document.getElementById("programIntroCTA1");
  const introCta3 = document.getElementById("programIntroCTA3");
  const appBtn1 = document.getElementById("applicationButton1");
  /** Primary “apply” CTAs — same behavior and lifecycle. */
  const primaryApplyCtAs = [introCta1, introCta3].filter(
    /** @returns {el is HTMLElement} */
    (el) => el instanceof HTMLElement,
  );

  const scrollToProgramDetailsSection = () => {
    const el = document.getElementById("programDetailsSection");
    if (!el) return;
    scrollElementTopToViewportGap(el, PROGRAM_APPLICATION_VIEWPORT_TOP_GAP_PX);
  };

  const bindKeyboardButton = (el, onActivate) => {
    if (!el) return;
    el.addEventListener(
      "keydown",
      (ev) => {
        if (ev.key !== "Enter" && ev.key !== " ") return;
        ev.preventDefault();
        onActivate();
      },
      { signal },
    );
  };

  if (!applicationsOpen) {
    for (const el of primaryApplyCtAs) {
      el.removeAttribute("hidden");
      el.classList.remove("program-application-cta--review");
      el.classList.add("program-intro-cta--closed-soon");
      el.textContent = "Coming soon";
      el.setAttribute("aria-hidden", "false");
      el.setAttribute("aria-disabled", "true");
      el.removeAttribute("role");
      el.removeAttribute("tabindex");
    }
    const introCtAs = document.getElementById("programIntroCTAs");
    introCtAs?.classList.add("program-intro-ctas--apply-closed");
    if (wrap) {
      wrap.setAttribute("hidden", "");
      wrap.setAttribute("inert", "");
    }
    if (formEl) formEl.setAttribute("active", "false");
    appBtn1?.addEventListener("click", scrollToProgramDetailsSection, {
      signal,
    });
    if (appBtn1) appBtn1.textContent = programKeyDetailsLabel();
    bindKeyboardButton(appBtn1, scrollToProgramDetailsSection);
    return;
  }

  document
    .getElementById("programIntroCTAs")
    ?.classList.remove("program-intro-ctas--apply-closed");
  for (const el of primaryApplyCtAs) {
    el.classList.remove("program-intro-cta--closed-soon");
    el.removeAttribute("aria-disabled");
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
  }

  /** Drop stale `inert` when applications reopen (e.g. after visiting a closed program in the same SPA session). */
  if (wrap) {
    wrap.removeAttribute("inert");
  }

  const onPrimaryCta = () => {
    const locale =
      typeof window.getLocale === "function" && window.getLocale() === "ja"
        ? "ja"
        : "en";
    posthog.capture("program_apply_cta_clicked", { program_id: programId, locale });
    void revealProgramApplicationOrOpenJoin();
  };

  for (const el of primaryApplyCtAs) {
    el.addEventListener("click", onPrimaryCta, { signal });
    bindKeyboardButton(el, onPrimaryCta);
  }
  appBtn1?.addEventListener("click", scrollToProgramDetailsSection, { signal });
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
    for (const el of primaryApplyCtAs) {
      el.textContent = alreadyApplied
        ? programApplicationReviewLabel()
        : programApplicationCtaLabelForAuth(true);
      el.classList.toggle("program-application-cta--review", alreadyApplied);
    }
    if (appBtn1) appBtn1.textContent = programKeyDetailsLabel();
  };

  void refreshAuthUi();
  window.addEventListener("fusion-auth-change", () => void refreshAuthUi(), {
    signal,
  });
  window.addEventListener("fusion-localechange", () => void refreshAuthUi(), {
    signal,
  });
  window.addEventListener(
    "fusion-program-application-submitted",
    () => void refreshAuthUi(),
    { signal },
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
                            <app-program-offering-cards id="programOfferingCardsRow" active="true" hidden></app-program-offering-cards>
                        </div>
                        <app-program-fade-gallery id="programFadeGallery"></app-program-fade-gallery>
                        <app-program-details id="programDetailsSection" active="true"></app-program-details>
                        <div id="programApplicationWrap" class="program-application-wrap" hidden inert>
                            <app-application-form id="programApplicationSection" active="false" data-program-id=""></app-application-form>
                        </div>
                        <app-confirmed-artists-feed id="confirmedArtistsFeed" active="true"></app-confirmed-artists-feed>
                        <app-program-strip-gallery id="programStripGallery"></app-program-strip-gallery>
                        <div class="shoutHeadline">
                            This is not for every artist.<br><br>It is for those willing to work<br>within unfamiliar environments,<br>alongside others,<br> in close proximity to place and process.
                        </div>
                        <div id="programIntroCTA3" class="program-intro-cta program-close-cta" role="button" tabindex="0" style="justify-self: center; margin-bottom: 15rem;">Sign up & apply</div>
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
  const locale =
    typeof window.getLocale === "function" && window.getLocale() === "ja"
      ? "ja"
      : "en";
  const current =
    locale === "ja"
      ? /** @type {Record<string, unknown>} */ (
          mergeLocaleDeep(programPair.en, programPair.ja)
        )
      : programPair.en;
  const programPage =
    current?.programPage && typeof current.programPage === "object"
      ? /** @type {Record<string, unknown>} */ (current.programPage)
      : {};

  const hero = document.getElementById("programDetailHeroMedia");
  const introTitle = document.getElementById("programIntroTitle");
  const introSubLine1 = document.getElementById("programIntroSubLine1");
  const introSubLine2 = document.getElementById("programIntroSubLine2");
  const keyOfferingsTitle = document.getElementById("keyOfferingsTitle");
  const confirmedArtistsFeed = document.getElementById("confirmedArtistsFeed");
  const programDetailsSection = document.getElementById(
    "programDetailsSection",
  );

  const titleText = current?.location || programPage?.headline || "";
  const summaryText =
    current?.briefDescription || programPage?.description || "";
  const subheadlineText = programPage?.subheadline || "";
  const descriptionText = programPage?.description || "";
  const artists = Array.isArray(programPage?.confirmedArtists)
    ? programPage.confirmedArtists
    : [];
  const details = programPage?.programDetails || {};
  const keyDates = Array.isArray(details?.keyDates) ? details.keyDates : [];
  const residences = Array.isArray(details?.residences)
    ? details.residences
    : [];
  const included = Array.isArray(details?.included) ? details.included : [];
  const notIncluded = Array.isArray(details?.notIncluded)
    ? details.notIncluded
    : [];
  const platform =
    details?.platform != null && typeof details.platform === "string"
      ? details.platform
      : "";

  const heroUrl = current?.heroMediaSrc || current?.imageSrc || "";
  const heroAlt = current?.imageAlt || titleText || "Program";
  const stillForVideo = String(current?.imageSrc || "").trim();
  setProgramHeroMedia(hero, heroUrl, heroAlt, stillForVideo);

  if (introTitle) introTitle.textContent = programPage?.headline || titleText;
  if (introSubLine1) introSubLine1.textContent = subheadlineText || summaryText;
  if (introSubLine2) introSubLine2.textContent = descriptionText;

  const programId = current?.id != null ? String(current.id) : "";
  let applicationsOpen = true;
  if (programId) {
    try {
      const rows = await getPrograms();
      const row = rows.find(
        (p) =>
          String(p.id) === programId ||
          p.id === current?.id ||
          String(p.id) === String(current?.id),
      );
      const statusFromRow = row ? String(row.studioStatus ?? "").trim() : "";
      const statusFromCard = String(
        current?.studioStatus ??
          programPair.en?.studioStatus ??
          programPair.ja?.studioStatus ??
          "",
      ).trim();
      const effectiveStatus = statusFromRow || statusFromCard;
      if (effectiveStatus) {
        applicationsOpen = effectiveStatus.toLowerCase() === "open";
      } else if (current && "acceptingApplications" in current) {
        applicationsOpen = Boolean(current.acceptingApplications);
      }
    } catch {
      applicationsOpen = true;
    }
  }

  const availableSlots =
    typeof current?.availableSlots === "number" ? current.availableSlots : null;
  const totalSlots =
    typeof current?.totalSlots === "number" ? current.totalSlots : null;

  const formEl = document.getElementById("programApplicationSection");
  if (formEl && programId) {
    formEl.setAttribute("data-program-id", programId);
  }
  if (
    formEl &&
    "setProgramFormContext" in formEl &&
    typeof /** @type {{ setProgramFormContext?: (c: object) => void }} */ (formEl)
      .setProgramFormContext === "function"
  ) {
    /** @type {{ setProgramFormContext: (c: object) => void }} */ (formEl).setProgramFormContext(
      buildProgramApplicationFormContext(programPage, {
        programYear: current?.year != null ? String(current.year) : "",
        availableSlots,
        totalSlots,
      }),
    );
  }

  try {
    const globalPay = await getApplicationPaymentGlobal();
    if (
      formEl &&
      "setApplicationPaymentGlobalContext" in formEl &&
      typeof /** @type {{ setApplicationPaymentGlobalContext?: (c: object) => void }} */ (formEl)
        .setApplicationPaymentGlobalContext === "function"
    ) {
      /** @type {{ setApplicationPaymentGlobalContext: (c: object) => void }} */ (
        formEl
      ).setApplicationPaymentGlobalContext(globalPay);
    }
  } catch {
    /* ignore */
  }

  if (
    confirmedArtistsFeed &&
    typeof confirmedArtistsFeed.setConfirmedArtistsFeed === "function"
  ) {
    const headline = programPage?.confirmedHeadline || "";
    const pool = (await getArtists()) || [];
    const resolved = artists.map((name) => {
      const label = typeof name === "string" ? name : name?.name || "";
      const found = label ? findArtistByEnglishName(label, pool) : null;
      if (found) return found;
      return {
        image: placeholderImg,
        locales: {
          en: { name: label || "Artist", discipline: "" },
          ja: { name: label || "Artist", discipline: "" },
        },
      };
    });
    confirmedArtistsFeed.setConfirmedArtistsFeed({
      headline,
      availableSlots,
      totalSlots,
      artists: resolved,
    });
  }

  if (keyOfferingsTitle) {
    keyOfferingsTitle.textContent = programPage?.offeringHeadline || "";
  }

  const rawOfferingCards = programPage?.offeringCards;
  const offeringCardsList = Array.isArray(rawOfferingCards) ? rawOfferingCards : [];
  const normalizedOffering = offeringCardsList
    .slice(0, 3)
    .map((c) => {
      if (!c || typeof c !== "object") return { title: "", description: "" };
      return {
        title: String(/** @type {{ title?: unknown }} */ (c).title ?? "").trim(),
        description: String(
          /** @type {{ description?: unknown }} */ (c).description ?? "",
        ).trim(),
      };
    })
    .filter((c) => c.title || c.description);

  const programOfferingEl = document.getElementById("programOfferingCardsRow");
  if (
    programOfferingEl &&
    typeof programOfferingEl.setOfferingCards === "function"
  ) {
    programOfferingEl.setOfferingCards(normalizedOffering);
    programOfferingEl.hidden = normalizedOffering.length === 0;
  }

  const fadeGalleryEl = document.getElementById("programFadeGallery");
  const rawFade = programPage?.fadeGalleryImages;
  const fadeUrls = Array.isArray(rawFade)
    ? rawFade
        .map((u) => String(u ?? "").trim())
        .filter(Boolean)
        .slice(0, 10)
    : [];
  const fadeDur = Number(programPage?.fadeGalleryDurationSec);
  const fadeDurationSec =
    Number.isFinite(fadeDur) && fadeDur > 0 ? fadeDur : 3;
  const galleryAltBase = String(
    programPage?.headline || titleText || "Program",
  ).trim();
  if (
    fadeGalleryEl &&
    typeof fadeGalleryEl.setImages === "function"
  ) {
    fadeGalleryEl.setImages(fadeUrls, {
      durationSec: fadeDurationSec,
      altBase: galleryAltBase,
    });
  }

  const stripGalleryEl = document.getElementById("programStripGallery");
  const rawStrip = programPage?.stripGalleryImages;
  const stripUrls = Array.isArray(rawStrip)
    ? rawStrip
        .map((u) => String(u ?? "").trim())
        .filter(Boolean)
        .slice(0, 20)
    : [];
  if (
    stripGalleryEl &&
    typeof stripGalleryEl.setImages === "function"
  ) {
    stripGalleryEl.setImages(stripUrls, { altBase: galleryAltBase });
  }

  if (
    programDetailsSection &&
    typeof programDetailsSection.setProgramDetails === "function"
  ) {
    const costs = details?.costs != null && typeof details.costs === "object" ? details.costs : {};
    const applicationFeeLine =
      typeof costs.applicationFee === "string" ? costs.applicationFee.trim() : "";

    programDetailsSection.setProgramDetails({
      programId,
      applicationsOpen,
      headline: programPage?.detailsHeadline || "",
      keyDates,
      locations: locationsToSidebarList(current?.location, details?.locations),
      facilities: facilitiesToSidebarList(
        details?.facilities,
        details?.facilityList,
      ),
      costText: formatCostText(details?.costs),
      applicationFeeLine,
      availableSlots,
      totalSlots,
      residences,
      included,
      notIncluded,
      platform,
      additionalInfo: programPage?.additionalInfo || null,
    });
  }

  const pageTitle = `${titleText || "Program"} · Fusion`;
  document.title = pageTitle;

  const pagePath =
    typeof window !== "undefined" ? window.location.pathname : "/programs";
  const metaDesc =
    String(summaryText || descriptionText || subheadlineText || "").trim() ||
    "Japan artist residency program on Fusion — schedule, details, and how to apply.";
  let heroImageForOg = String(heroUrl || "").trim();
  if (isVideoUrl(heroImageForOg)) {
    heroImageForOg = String(stillForVideo || "").trim();
  }
  if (heroImageForOg && !/^https?:\/\//i.test(heroImageForOg)) {
    const origin = getPublicSiteOrigin();
    heroImageForOg = `${origin}${heroImageForOg.startsWith("/") ? heroImageForOg : `/${heroImageForOg}`}`;
  }
  const crumbName = String(programPage?.headline || titleText || "Program").slice(
    0,
    96,
  );
  applyDocumentSeo({
    title: pageTitle,
    description: metaDesc,
    path: pagePath,
    ogType: "article",
    imageUrl: heroImageForOg || undefined,
    breadcrumbItems: [
      { name: "Home", path: "/" },
      { name: "Programs", path: "/programs" },
      { name: crumbName, path: pagePath },
    ],
  });

  if (programId) {
    wireProgramApplicationSection(programId, applicationsOpen);
  }
}

export default function initProgramView() {
  const pathname = window.location.pathname;
  const notFound = document.getElementById("programDetailNotFound");

  const show = (el, on) => {
    if (!el) return;
    if (on) el.removeAttribute("hidden");
    else el.setAttribute("hidden", "");
  };

  void (async () => {
    const pair = await findProgramPairByPathname(pathname);
    if (!pair) {
      show(notFound, true);
      applyDocumentSeo({
        title: "Program not found · Fusion",
        description: "This program is not available or may have moved. Browse Japan artist residency programs on Fusion.",
        path: pathname,
        robots: "noindex, nofollow",
      });
      return;
    }

    show(notFound, false);
    await applyProgramToDom(pair);
  })();
}
