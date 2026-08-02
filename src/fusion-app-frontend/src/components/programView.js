import placeholderImg from "../assets/dev/program_hero-1.jpg";
import { findArtistForConfirmedListLabel } from "../utils/artistSlug.js";
import {
  findProgramPairByPathname,
  getAllProgramsBlock,
  getApplicationPaymentGlobal,
  getArtists,
  getContentBundleForStudio,
  getCurrentProgramSeason,
  getMyArtistRecord,
} from "../utils/database.js";
import { buildResidencyAlumniEntries } from "../utils/residencyAlumniEntries.js";
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
import {
  countCalendarMonthsFromNowToDeadline,
  resolveProgramApplicationDeadlineDate,
} from "../utils/programDeadlineParse.js";
import { withSeoImageAlt, withSeoVideoLabel } from "../utils/mediaAltSeo.js";
import { buildProgramRunSidebarDateLines } from "../utils/programSidebarRunDates.js";
import { programHeroLoaderHtml } from "../utils/programHeroLoader.js";

/**
 * Cohort slot counts are canonical on the English program card. For Japanese,
 * `mergeLocaleDeep(en, ja)` can replace EN numbers with JA (both are non-empty),
 * so do not read `availableSlots` / `totalSlots` from the merged `current`.
 * Mirrors `en.totalSlots ?? programPage.totalSlots` in `programRowReservedState`.
 * @param {unknown} enCard
 * @returns {{ availableSlots: number | null, totalSlots: number | null }}
 */
function slotsFromEnglishProgramCard(enCard) {
  if (!enCard || typeof enCard !== "object") {
    return { availableSlots: null, totalSlots: null };
  }
  const en = /** @type {Record<string, unknown>} */ (enCard);
  const pp =
    en.programPage != null && typeof en.programPage === "object"
      ? /** @type {Record<string, unknown>} */ (en.programPage)
      : null;
  const totalRaw = en.totalSlots ?? pp?.totalSlots;
  const availRaw = en.availableSlots ?? pp?.availableSlots;
  const n = (v) =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  return {
    availableSlots: n(availRaw),
    totalSlots: n(totalRaw),
  };
}

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

/** Fullscreen lightbox default when Studio omits `programPage.lightboxHeroSrc`. */
const PROGRAM_VIEW_HERO_LIGHTBOX_DEFAULT =
  "https://fusionart-bucket.s3.us-east-2.amazonaws.com/uploads/platform-assets/Fusion.mp4";

/**
 * Resolved per program in {@link applyProgramToDom} — overlay reads this when opening.
 * @type {string}
 */
let programViewResolvedLightboxSrc = PROGRAM_VIEW_HERO_LIGHTBOX_DEFAULT;

/** Label for program hero / lightbox video (set in applyProgramToDom). */
let programViewHeroVideoLabel = "Program hero";

/** @type {HTMLElement | null} */
let programHeroVideoOverlayEl = null;
let programHeroOverlayEscapeInstalled = false;

function ensureProgramHeroVideoOverlay() {
  if (programHeroVideoOverlayEl && document.body.contains(programHeroVideoOverlayEl)) {
    return programHeroVideoOverlayEl;
  }
  const existing = document.getElementById("programHeroVideoOverlay");
  if (existing instanceof HTMLElement) {
    programHeroVideoOverlayEl = existing;
    return programHeroVideoOverlayEl;
  }

  const root = document.createElement("div");
  root.id = "programHeroVideoOverlay";
  root.className = "program-hero-video-overlay";
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", withSeoVideoLabel("Program video"));

  root.innerHTML = `
    <div class="program-hero-video-overlay__backdrop" tabindex="-1" aria-hidden="true"></div>
    <div class="program-hero-video-overlay__panel">
      <button type="button" class="program-hero-video-overlay__close" aria-label="Close video">×</button>
      <video
        class="program-hero-video-overlay__video"
        controls
        playsinline
        preload="metadata"
        src="${PROGRAM_VIEW_HERO_LIGHTBOX_DEFAULT}"
      ></video>
    </div>
  `;

  const backdrop = root.querySelector(".program-hero-video-overlay__backdrop");
  const closeBtn = root.querySelector(".program-hero-video-overlay__close");
  backdrop?.addEventListener("click", () => closeProgramHeroVideoOverlay());
  closeBtn?.addEventListener("click", () => closeProgramHeroVideoOverlay());

  document.body.appendChild(root);
  programHeroVideoOverlayEl = root;

  if (!programHeroOverlayEscapeInstalled) {
    programHeroOverlayEscapeInstalled = true;
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const el = document.getElementById("programHeroVideoOverlay");
      if (!el || el.hidden) return;
      closeProgramHeroVideoOverlay();
    });
  }

  return root;
}

function openProgramHeroVideoOverlay() {
  const root = ensureProgramHeroVideoOverlay();
  const video = /** @type {HTMLVideoElement | null} */ (
    root.querySelector(".program-hero-video-overlay__video")
  );
  const url =
    (typeof programViewResolvedLightboxSrc === "string" &&
      programViewResolvedLightboxSrc.trim()) ||
    PROGRAM_VIEW_HERO_LIGHTBOX_DEFAULT;
  if (video) {
    video.src = url;
    video.load();
    video.muted = false;
    const vLabel = withSeoVideoLabel(programViewHeroVideoLabel);
    root.setAttribute("aria-label", vLabel);
    video.setAttribute("aria-label", vLabel);
    video.setAttribute("title", vLabel);
  }
  root.hidden = false;
  document.body.style.overflow = "hidden";
  if (video) {
    try {
      video.currentTime = 0;
    } catch {
      /* ignore */
    }
    void video.play().catch(() => {});
  }
  const closeBtn = root.querySelector(".program-hero-video-overlay__close");
  if (closeBtn instanceof HTMLElement) {
    closeBtn.focus();
  }
}

function closeProgramHeroVideoOverlay() {
  const root =
    programHeroVideoOverlayEl ||
    document.getElementById("programHeroVideoOverlay");
  if (!root) return;
  const video = /** @type {HTMLVideoElement | null} */ (
    root.querySelector(".program-hero-video-overlay__video")
  );
  if (video) {
    video.pause();
  }
  root.hidden = true;
  document.body.style.overflow = "";
}

function stripProgramHeroLightboxAttrs(container) {
  container.classList.remove("program-detail-hero-media--has-video");
  container.removeAttribute("role");
  container.removeAttribute("tabindex");
  container.removeAttribute("aria-label");
}

/**
 * Hero strip is clickable only when it shows a video (not a still-only image).
 * @param {HTMLElement} container `#programDetailHeroMedia`
 */
function wireProgramHeroVideoLightbox(container) {
  container.classList.add("program-detail-hero-media--has-video");
  container.setAttribute("role", "button");
  container.setAttribute("tabindex", "0");
  container.setAttribute(
    "aria-label",
    "Play full program video with sound",
  );

  const onActivate = (e) => {
    if (e instanceof MouseEvent && e.button !== 0) return;
    e.preventDefault();
    openProgramHeroVideoOverlay();
  };

  container.addEventListener("click", onActivate);
  container.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openProgramHeroVideoOverlay();
    }
  });
}

/**
 * @param {HTMLElement | null} container
 * @param {string} url Hero media URL (image or video).
 * @param {string} alt Accessible name for video / image.
 * @param {string} [posterStillUrl] When `url` is a video: still image (e.g. program card `imageSrc`) shown until the video fades in; falls back to bundled placeholder.
 */
function setProgramHeroMedia(container, url, alt, posterStillUrl) {
  if (!container) return;
  stripProgramHeroLightboxAttrs(container);
  const u = String(url || "").trim();
  container.classList.remove("program-detail-hero-media--pending");
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
    v.setAttribute("webkit-playsinline", "");
    v.setAttribute("muted", "");
    v.setAttribute("poster", poster);
    v.preload = "auto";
    v.playsInline = true;
    v.defaultMuted = true;
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
    for (const ev of ["loadeddata", "loadedmetadata", "canplay"]) {
      v.addEventListener(ev, fadeIn, { once: true });
    }
    if (v.readyState >= 2) {
      fadeIn();
    }
    window.setTimeout(() => fadeIn(), 2800);

    container.appendChild(posterImg);
    container.appendChild(v);
    v.load();
    void v.play().catch(() => {});
    wireProgramHeroVideoLightbox(container);
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
                            <div id="programDetailHeroMedia" class="program-detail-hero-media program-detail-hero-media--pending">
                            ${programHeroLoaderHtml({ wrapperClass: "program-view-hero-pending", ariaLabel: "Loading" })}
                            </div>
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
                            <app-program-offering-cards id="programOfferingCardsRow" active="true"></app-program-offering-cards>
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
                        <app-residency-alumni-table id="programAlumniTable" hidden></app-residency-alumni-table>
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
  const lightboxHeroRaw = programPage.lightboxHeroSrc;
  programViewResolvedLightboxSrc =
    typeof lightboxHeroRaw === "string" && lightboxHeroRaw.trim()
      ? lightboxHeroRaw.trim()
      : PROGRAM_VIEW_HERO_LIGHTBOX_DEFAULT;
  const recordDeposit = String(
    /** @type {Record<string, unknown>} */ (current)?.depositAmountDisplay ?? "",
  ).trim();
  const programPageForForm = (() => {
    const baseAf =
      programPage.applicationForm != null &&
      typeof programPage.applicationForm === "object"
        ? { .../** @type {Record<string, unknown>} */ (programPage.applicationForm) }
        : {};
    if (recordDeposit) {
      baseAf.depositAmountDisplay = recordDeposit;
    }
    return { ...programPage, applicationForm: baseAf };
  })();

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
  programViewHeroVideoLabel = String(
    programPage?.headline || heroAlt || titleText || "Program hero",
  ).trim();
  const stillForVideo = String(current?.imageSrc || "").trim();
  setProgramHeroMedia(hero, heroUrl, heroAlt, stillForVideo);

  if (introTitle) introTitle.textContent = programPage?.headline || titleText;
  if (introSubLine1) introSubLine1.textContent = subheadlineText || summaryText;
  if (introSubLine2) introSubLine2.textContent = descriptionText;

  const programId = current?.id != null ? String(current.id) : "";
  let applicationsOpen = true;
  if (programId) {
    // `studioStatus` is already on cards from the same `listPrograms` data as
    // `findProgramPairByPathname` — do not call `getPrograms()` again (avoids a second canister round-trip).
    const statusFromCard = String(
      current?.studioStatus ??
        programPair.en?.studioStatus ??
        programPair.ja?.studioStatus ??
        "",
    ).trim();
    if (statusFromCard) {
      applicationsOpen = statusFromCard.toLowerCase() === "open";
    } else if (current && "acceptingApplications" in current) {
      applicationsOpen = Boolean(current.acceptingApplications);
    }
  }

  const { availableSlots, totalSlots } = slotsFromEnglishProgramCard(
    programPair.en,
  );

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
    const locale =
      typeof window.getLocale === "function" && window.getLocale() === "ja"
        ? "ja"
        : "en";
    let joinNetworkFlowBundle = null;
    try {
      joinNetworkFlowBundle = await getContentBundleForStudio("join-network-flow", {
        forStudio: false,
      });
    } catch {
      joinNetworkFlowBundle = null;
    }
    /** @type {{ setProgramFormContext: (c: object) => void }} */ (formEl).setProgramFormContext(
      buildProgramApplicationFormContext(programPageForForm, {
        programYear: current?.year != null ? String(current.year) : "",
        availableSlots,
        totalSlots,
        joinNetworkFlowBundle,
        locale,
      }),
    );
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
    const applicationForm =
      programPage?.applicationForm != null &&
      typeof programPage.applicationForm === "object"
        ? /** @type {Record<string, unknown>} */ (programPage.applicationForm)
        : {};
    const depositFromForm = String(
      applicationForm.depositAmountDisplay ?? "",
    ).trim();
    const depositLine = recordDeposit || depositFromForm;
    const remainingExplicit = String(
      /** @type {Record<string, unknown>} */ (costs).remainingBalance ?? "",
    ).trim();
    const remainingBalanceLine =
      remainingExplicit || formatCostText(details?.costs) || "";
    const japanResidencyNotice = String(
      /** @type {Record<string, unknown>} */ (costs).japanResidencyDiscountNotice ??
        "",
    ).trim();
    const programYear = current?.year != null ? String(current.year) : "";
    const deadlineDate = resolveProgramApplicationDeadlineDate(
      /** @type {Record<string, unknown>} */ (programPage),
      programYear,
    );
    const now = new Date();
    const maxPlanMonths = deadlineDate
      ? countCalendarMonthsFromNowToDeadline(now, deadlineDate)
      : 0;
    const totalProgramFeeLine = String(
      /** @type {Record<string, unknown>} */ (costs).base ?? "",
    ).trim();
    const useStructuredCost = Boolean(
      totalProgramFeeLine ||
        applicationFeeLine ||
        depositLine ||
        remainingBalanceLine ||
        (typeof window.getLocale === "function" &&
          window.getLocale() === "ja" &&
          japanResidencyNotice) ||
        maxPlanMonths > 1,
    );
    const localeForSidebar =
      typeof window.getLocale === "function" ? window.getLocale() : "en";
    const sidebarRunDates = buildProgramRunSidebarDateLines(
      /** @type {Record<string, unknown>} */ (current),
      localeForSidebar,
    );

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
      totalProgramFeeLine,
      applicationFeeLine,
      useStructuredCost,
      depositLine,
      remainingBalanceLine,
      maxPlanMonths,
      japanResidencyNotice,
      availableSlots,
      totalSlots,
      residences,
      included,
      notIncluded,
      platform,
      additionalInfo: programPage?.additionalInfo || null,
      sidebarRunDates,
    });
  }

  const [globalPay, artistPool] = await Promise.all([
    getApplicationPaymentGlobal(),
    getArtists(),
  ]);

  try {
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
    const pool = artistPool || [];
    const resolved = artists.map((name) => {
      const label = typeof name === "string" ? name : name?.name || "";
      const found = label ? findArtistForConfirmedListLabel(label, pool) : null;
      if (found) return found;
      return {
        image: "",
        slug: "",
        __confirmedPlaceholder: true,
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

  const alumniTable = document.getElementById("programAlumniTable");
  if (alumniTable && typeof alumniTable.setAlumni === "function") {
    try {
      const allBlock = await getAllProgramsBlock();
      const enPrograms = allBlock?.programs?.en || [];
      const currentSeason = await getCurrentProgramSeason();
      alumniTable.setAlumni(
        buildResidencyAlumniEntries(enPrograms, artistPool || [], currentSeason),
      );
    } catch {
      alumniTable.hidden = true;
    }
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
