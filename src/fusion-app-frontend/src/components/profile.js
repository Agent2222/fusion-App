import {
  artistGallerySeasonYear,
  artistLocaleBlock,
  artistProgramIds,
  artistResidencyCardYear,
  yearFromProgramSlug,
} from "../utils/artistSlug.js";
import { getAllProgramsBlock, getArtistBySlug } from "../utils/database.js";
import {
  filterProgramIdsForAlumniBanner,
  programQualifiesForAlumniBanner,
  resolveProgramCardFromBlock,
} from "../utils/programAlumniEligibility.js";
import { applyDocumentSeo } from "../utils/documentSeo.js";
import { buildArtistProfileSeo } from "../utils/artistProfileSeo.js";
import { SEO_MEDIA_DEFAULT, withSeoImageAlt } from "../utils/mediaAltSeo.js";
import { worldTextParts } from "../utils/worldNormalize.js";
import {
  getPublicWorldSourceFromLocales,
  pickPublicWorldField,
} from "../utils/worldPublicPick.js";
import posthog from "posthog-js";
import { introSlotsFromWorld } from "../utils/memberProfileForm.js";
import { probeImageSrc } from "../utils/imageProbe.js";

/**
 * @param {HTMLElement | null} container
 * @param {unknown} links
 */
function populateArtistLinks(container, links) {
  if (!container) return;
  container.replaceChildren();
  if (!Array.isArray(links) || links.length === 0) {
    container.setAttribute("hidden", "");
    return;
  }
  let count = 0;
  for (const item of links) {
    if (!item || typeof item !== "object" || !item.url) continue;
    const a = document.createElement("a");
    a.href = String(item.url);
    a.className = "profile-artist-link";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent =
      item.label != null && item.label !== ""
        ? String(item.label)
        : String(item.type || item.url);
    container.appendChild(a);
    count += 1;
  }
  if (count === 0) container.setAttribute("hidden", "");
  else container.removeAttribute("hidden");
}

/**
 * @param {HTMLElement | null} container
 * @param {unknown} introGallery
 * @param {string} [displayName]
 */
async function populateIntroGallery(container, introGallery, displayName = "") {
  if (!container) return;
  container.replaceChildren();
  container.classList.remove("profile-images-container--empty");

  const slots = introSlotsFromWorld({ introGallery });
  const results = await Promise.all(
    slots.map(async (slot, slotIndex) => {
      const src = String(slot.src ?? "").trim();
      if (!src) return null;
      const ok = await probeImageSrc(src);
      if (!ok) return null;

      const figure = document.createElement("figure");
      figure.className = `profile-intro-gallery-item profile-intro-gallery-item--slot-${slotIndex}`;
      const wrap = document.createElement("div");
      wrap.className = "profile-intro-gallery-img-wrap";
      const img = document.createElement("img");
      img.src = src;
      const slotAlt = String(slot.alt ?? "").trim();
      const primaryAlt =
        slotAlt || (displayName.trim() ? `${displayName.trim()} artwork` : "");
      img.alt = withSeoImageAlt(primaryAlt);
      img.loading = "eager";
      img.decoding = "async";
      wrap.appendChild(img);
      figure.appendChild(wrap);
      return { slotIndex, figure };
    }),
  );

  const valid = results
    .filter((x) => x != null)
    .sort((a, b) => a.slotIndex - b.slotIndex);
  for (const { figure } of valid) {
    container.appendChild(figure);
  }

  if (valid.length === 0) {
    container.setAttribute("hidden", "");
    container.classList.add("profile-images-container--empty");
  } else {
    container.removeAttribute("hidden");
  }
}

function wireProfileGalleryAccess() {
  const modal = document.getElementById("profileGalleryAccessModal");
  if (modal?.dataset.galleryAccessWired === "1") return;
  if (modal) modal.dataset.galleryAccessWired = "1";
  const scrim = modal?.querySelector(".profile-gallery-access-modal__scrim");
  const closeBtn = modal?.querySelector(".profile-gallery-access-modal__close");
  const openModal = () => {
    if (!modal) return;
    document.body.appendChild(modal);
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
  };
  const closeModal = () => {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
  };
  scrim?.addEventListener("click", closeModal);
  closeBtn?.addEventListener("click", closeModal);
  const onKey = (e) => {
    if (e.key === "Escape" && modal && !modal.hidden) closeModal();
  };
  window.addEventListener("keydown", onKey);

  document
    .querySelectorAll(".profile-page .galleryAccessButton")
    .forEach((btn) => {
      btn.setAttribute("role", "button");
      if (!btn.hasAttribute("tabindex")) btn.setAttribute("tabindex", "0");
      btn.addEventListener("click", async () => {
        try {
          const { getAuthSnapshot } = await import("../utils/icAuth.js");
          const snap = await getAuthSnapshot();
          if (snap.authenticated) {
            posthog.capture("gallery_access_modal_opened");
            openModal();
          } else {
            document.getElementById("joinNetworkProfile")?.openModal?.();
          }
        } catch {
          document.getElementById("joinNetworkProfile")?.openModal?.();
        }
      });
      btn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          btn.click();
        }
      });
    });
}

function profileSlugFromPathname() {
  const path = window.location.pathname;
  if (!path.startsWith("/profile/")) return null;
  const seg = path.slice("/profile/".length).split("/")[0];
  if (!seg) return null;
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}

function statusLabel(status) {
  switch (status) {
    case "studio":
      return "In studio";
    case "prep":
      return "Preparing for exhibition";
    case "showing":
      return "Show in progress";
    case "available":
      return "Available for commissions";
    default:
      return status || "";
  }
}

/**
 * First name for profile placeholder copy (Perspective, What they see, etc.).
 * @param {Record<string, unknown> | null | undefined} loc
 * @param {string} displayName
 */
function profileFirstNameForPlaceholders(loc, displayName) {
  const fn = String(loc?.firstName ?? "").trim();
  if (fn) return fn;
  const name = String(displayName ?? "").trim();
  if (name) {
    const first = name.split(/\s+/)[0];
    if (first) return first;
  }
  return "This artist";
}

/**
 * @param {string} firstName
 */
function artistProfileWorldPlaceholders(firstName) {
  const x = firstName;
  return {
    practice: `What one line could describe ${x}'s practice?`,
    perspective: `What has shaped ${x}'s way of seeing, and what continues to move them to create?`,
    vision: [
      `What quietly draws ${x} in?`,
      "What stays with them over time?",
      `What begins to reveal itself to ${x}?`,
      `What shifts the way ${x} sees the world?`,
    ],
    constructing: `How does ${x} bring their ideas into form, and what unfolds through their process of making?`,
    context: [
      `Where is ${x} based, and what ground do they work from?`,
      `What disciplines, media, or themes do they work across?`,
      `What recent or upcoming exhibitions or projects belong in their story?`,
    ],
    quote: `What words might ${x} offer that reflect how they see, feel, and move through their work?`,
  };
}

export function generateProfileContent() {
  return `
        <div class="page profile-page">
            <main id="profileMain" class="main-cont">
                <div id="profileMainContent" class="feed-container">
                    <div class="page-content profile-content">
                        <app-veteran-banner id="profileVeteranBanner" class="profile-veteran-banner"></app-veteran-banner>
                        <div id="artistProfileLoading" class="artist-profile-loading" role="status" aria-live="polite">
                            <div class="artist-profile-loading__spinner" aria-hidden="true"></div>
                            <p>Loading artist profile...</p>
                        </div>
                        <article class="artist-profile" id="artistProfile" hidden>
                            <div class="artist-profile-hero">
                                <img id="artistProfileImage" src="" alt="${SEO_MEDIA_DEFAULT}"/>
                            </div>
                            <div class="artist-profile-body">
                                <div id="leftColumn">
                                    <h1 id="artistProfileName" class="artist-profile-name"></h1>
                                    <p id="artistProfilePractice" class="artist-profile-practice"></p>
                                    <p id="artistProfilePerspectiveHeading" class="artist-profile-heading"></p>
                                    <div id="artistProfilePerspective" class="artist-profile-perspective"></div>
                                </div>
                                <div id="rightColumn">
                                    <div class="galleryAccessButton">Gallery Access</div>
                                </div>
                            </div>
                        </article>
                        <div id="profile-sight-words">
                            <p id="profileSightWordsHeading" class="artist-profile-heading">What they see</p>
                            <div id="sight-words-container"></div>
                        </div>
                        <div id="profile-constructing-words">
                            <p id="profileConstructingWordsHeading" class="artist-profile-heading">How they construct</p>
                            <div id="constructing-words-container" class="artist-profile-constructing"></div>
                        </div>
                        <div id="artistProfileNotFound" class="profile-not-found" hidden>
                            <p>We could not find that artist profile.</p>
                            <p><a href="/artists">Browse artists</a></p>
                        </div>
                        <div id="profileImagesContainer" class="profile-images-container"></div>
                        <div id="profileGalleryAccessButtonContainer" class="profile-gallery-access-button-container">
                            <div class="galleryAccessButton">Gallery Access</div>
                        </div>
                        <div id="profileContextContainer" class="profile-context-container">
                            <div id="profileContextHeading" class="artist-profile-heading">Context</div>
                            <div id="profileContextContent" class="artist-profile-context"></div>
                        </div>
                        <div id="profileQuoteContainer" class="profile-quote-container">
                            <p id="profileQuote" class="artist-profile-quote"></p>
                        </div>
                        <nav id="profileArtistLinks" class="profile-artist-links" aria-label="Artist links" hidden></nav>
                        <div id="artistProfileIndex" class="profile-index-hint" hidden></div>
                        <app-join-network id="joinNetworkProfile" data-modal-type="access" context="profile" active="true" data-margin-top="100px" data-margin-bottom="96px"></app-join-network>
                    </div> 
                </div>
                <div
                    id="profileGalleryAccessModal"
                    class="profile-gallery-access-modal"
                    hidden
                    aria-hidden="true"
                >
                    <div class="profile-gallery-access-modal__scrim" aria-hidden="true"></div>
                    <div
                        class="profile-gallery-access-modal__panel"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="profileGalleryAccessModalTitle"
                    >
                        <h2 id="profileGalleryAccessModalTitle" class="profile-gallery-access-modal__title">
                            Coming Soon
                        </h2>
                        <p class="profile-gallery-access-modal__body">
                            This is not for every gallery. It is for those willing to step outside familiar
                            systems, to engage with artists, context, and process in new ways.
                        </p>
                        <button type="button" class="profile-gallery-access-modal__close">Close</button>
                    </div>
                </div>
            </main>
        </div>
    `;
}

export default function initProfile() {
  document.querySelectorAll("#profileGalleryAccessModal").forEach((m) => {
    const pm = document.getElementById("profileMain");
    if (pm && !pm.contains(m)) m.remove();
  });

  const slug = profileSlugFromPathname();
  wireProfileGalleryAccess();

  const article = document.getElementById("artistProfile");
  const notFound = document.getElementById("artistProfileNotFound");
  const indexHint = document.getElementById("artistProfileIndex");
  const imagesContainer = document.getElementById("profileImagesContainer");
  const loadingEl = document.getElementById("artistProfileLoading");

  const show = (el, on) => {
    if (!el) return;
    if (on) el.removeAttribute("hidden");
    else el.setAttribute("hidden", "");
  };

  const contextContentEl = document.getElementById("profileContextContent");
  const contextHeadingEl = document.getElementById("profileContextHeading");
  const artistLinksEl = document.getElementById("profileArtistLinks");
  const veteranBannerEl = document.getElementById("profileVeteranBanner");
  const loadedContentEls = [
    document.getElementById("profile-sight-words"),
    document.getElementById("profile-constructing-words"),
    document.getElementById("profileImagesContainer"),
    document.getElementById("profileGalleryAccessButtonContainer"),
    document.getElementById("profileContextContainer"),
    document.getElementById("profileQuoteContainer"),
    artistLinksEl,
    veteranBannerEl,
  ];

  const setProfileLoading = (loading) => {
    show(loadingEl, loading);
    for (const el of loadedContentEls) show(el, !loading);
    show(article, false);
    show(notFound, false);
    show(indexHint, false);
  };

  if (!slug) {
    setProfileLoading(false);
    if (contextContentEl) contextContentEl.replaceChildren();
    populateArtistLinks(artistLinksEl, null);
    if (veteranBannerEl) {
      veteranBannerEl.setAttribute("hidden", "");
      veteranBannerEl.removeAttribute("data-program-id");
      veteranBannerEl.removeAttribute("data-program-ids");
      veteranBannerEl.removeAttribute("data-residency-year");
    }
    void populateIntroGallery(imagesContainer, null);
    show(article, false);
    show(notFound, false);
    show(indexHint, true);
    applyDocumentSeo({
      title: "Artists · Fusion",
      description:
        "Browse artists on Fusion’s Japan artist residency programs and progressive art platform.",
      path: "/profile",
    });
    return;
  }

  const applyArtist = async (artist) => {
    setProfileLoading(false);
    if (!artist) {
      for (const el of loadedContentEls) show(el, false);
      if (contextContentEl) contextContentEl.replaceChildren();
      populateArtistLinks(artistLinksEl, null);
      if (veteranBannerEl) {
        veteranBannerEl.setAttribute("hidden", "");
        veteranBannerEl.removeAttribute("data-program-id");
        veteranBannerEl.removeAttribute("data-program-ids");
        veteranBannerEl.removeAttribute("data-residency-year");
      }
      void populateIntroGallery(imagesContainer, null);
      show(article, false);
      show(notFound, true);
      show(indexHint, false);
      applyDocumentSeo({
        title: "Artist not found · Fusion",
        description: "This artist profile is not available on Fusion.",
        path: `/profile/${encodeURIComponent(slug)}`,
        robots: "noindex, nofollow",
      });
      return;
    }

    show(article, true);
    show(notFound, false);
    show(indexHint, false);

    const locale =
      typeof window.getLocale === "function" ? window.getLocale() : "en";
    let loc = artistLocaleBlock(artist, locale);
    if (!loc && artist && typeof artist === "object") {
      const fallbackName = String(artist.slug || "")
        .split("-")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      loc = {
        name: fallbackName,
        world: {},
      };
    }
    if (!loc) {
      if (contextContentEl) contextContentEl.replaceChildren();
      populateArtistLinks(artistLinksEl, null);
      show(article, false);
      show(notFound, true);
      applyDocumentSeo({
        title: "Artist not found · Fusion",
        description: "This artist profile is not available on Fusion.",
        path: `/profile/${encodeURIComponent(slug)}`,
        robots: "noindex, nofollow",
      });
      return;
    }

    const displayName = (() => {
      const n = String(loc.name ?? "").trim();
      if (n) return n;
      const fn = String(loc.firstName ?? "").trim();
      const ln = String(loc.lastName ?? "").trim();
      return [fn, ln].filter(Boolean).join(" ");
    })();

    const localesRoot =
      artist &&
      typeof artist === "object" &&
      artist.locales &&
      typeof artist.locales === "object"
        ? /** @type {Record<string, unknown>} */ (artist.locales)
        : {};
    const publicWorldSource = getPublicWorldSourceFromLocales(localesRoot);
    /** @param {string} key */
    const pickWorld = (key) =>
      pickPublicWorldField(
        /** @type {Record<string, unknown>} */ (loc),
        key,
        publicWorldSource,
      );

    const firstName = profileFirstNameForPlaceholders(loc, displayName);
    const worldPh = artistProfileWorldPlaceholders(firstName);

    const img = document.getElementById("artistProfileImage");
    const nameEl = document.getElementById("artistProfileName");
    const practiceEl = document.getElementById("artistProfilePractice");
    const perspectiveEl = document.getElementById("artistProfilePerspective");
    const perspectiveHeadingEl = document.getElementById(
      "artistProfilePerspectiveHeading",
    );
    if (img) {
      img.src = artist.image || "";
      img.alt = withSeoImageAlt(displayName);
    }
    if (nameEl) nameEl.textContent = displayName || "";
    const practiceRaw = pickWorld("practice");
    const practiceStr =
      practiceRaw != null ? String(practiceRaw).trim() : "";
    if (practiceEl) {
      practiceEl.textContent = practiceStr || worldPh.practice;
    }
    if (perspectiveEl) {
      perspectiveEl.replaceChildren();
      const perspectiveParts = worldTextParts(pickWorld("perspective"));
      const texts = perspectiveParts.length
        ? perspectiveParts
        : [worldPh.perspective];
      for (const text of texts) {
        const p = document.createElement("p");
        p.textContent = text;
        perspectiveEl.appendChild(p);
      }
    }
    if (perspectiveHeadingEl) perspectiveHeadingEl.textContent = "Perspective";
    if (contextHeadingEl)
      contextHeadingEl.textContent = locale === "ja" ? "文脈" : "Context";
    if (contextContentEl) {
      contextContentEl.replaceChildren();
      const contextParts = worldTextParts(pickWorld("context"));
      const ctxTexts = contextParts.length ? contextParts : worldPh.context;
      for (const text of ctxTexts) {
        const p = document.createElement("p");
        p.textContent = text;
        contextContentEl.appendChild(p);
      }
    }
    const profileSeo = buildArtistProfileSeo({
      loc: /** @type {Record<string, unknown>} */ (loc),
      displayName,
      slug,
      heroImageUrl: artist.image,
      practiceStr,
    });
    applyDocumentSeo({
      title: profileSeo.title,
      description: profileSeo.description,
      path: profileSeo.canonicalPath,
      imageUrl: profileSeo.ogImageUrl,
      breadcrumbItems: [
        { name: "Home", path: "/" },
        { name: "Artists", path: "/artists" },
        { name: displayName || "Artist", path: profileSeo.canonicalPath },
      ],
      personJsonLd: profileSeo.personJsonLd,
    });
    posthog.capture("artist_profile_viewed", { artist_slug: slug });

    const sightWordsContainerEl = document.getElementById(
      "sight-words-container",
    );
    if (sightWordsContainerEl) {
      sightWordsContainerEl.replaceChildren();
      const visionParts = worldTextParts(pickWorld("vision"));
      const visionLines = visionParts.length ? visionParts : worldPh.vision;
      const narrowSight =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(max-width: 768px)").matches;
      for (const text of visionLines) {
        if (!text) continue;
        const p = document.createElement("p");
        p.className = "profile-sight-word-line";
        p.textContent = text;
        const alignRight = Math.random() < 0.5;
        const padPct =
          (narrowSight ? 2 : 5) + Math.random() * (narrowSight ? 12 : 28);
        const fontRem =
          (narrowSight ? 1.05 : 1.2) +
          Math.random() * (narrowSight ? 1.35 : 2.5);
        p.style.fontSize = `${fontRem}rem`;
        if (alignRight) {
          p.style.textAlign = "right";
          p.style.paddingRight = `${padPct}%`;
          p.style.paddingLeft = "0";
        } else {
          p.style.textAlign = "left";
          p.style.paddingLeft = `${padPct}%`;
          p.style.paddingRight = "0";
        }
        sightWordsContainerEl.appendChild(p);
      }
    }

    const constructingWordsContainerEl = document.getElementById(
      "constructing-words-container",
    );
    if (constructingWordsContainerEl) {
      constructingWordsContainerEl.replaceChildren();
      const constructingParts = worldTextParts(pickWorld("constructing"));
      const conTexts = constructingParts.length
        ? constructingParts
        : [worldPh.constructing];
      for (const text of conTexts) {
        const p = document.createElement("p");
        p.textContent = text;
        constructingWordsContainerEl.appendChild(p);
      }
    }

    const quoteContainerEl = document.getElementById("profileQuoteContainer");
    if (quoteContainerEl) {
      quoteContainerEl.replaceChildren();
      const quoteRaw = pickWorld("quote");
      const quote = String(quoteRaw ?? "").trim();
      const p = document.createElement("p");
      p.id = "profileQuote";
      p.className = "artist-profile-quote";
      p.textContent = quote ? `"${quote}"` : worldPh.quote;
      quoteContainerEl.appendChild(p);
    }

    populateArtistLinks(artistLinksEl, loc.links);
    void populateIntroGallery(
      imagesContainer,
      /** @type {unknown} */ (pickWorld("introGallery")),
      displayName,
    );

    const programsBlock = await getAllProgramsBlock();
    const enrolledProgramIds = artistProgramIds(artist);
    const programIdsForBanner = filterProgramIdsForAlumniBanner(
      enrolledProgramIds,
      programsBlock,
    );
    let residencyCardYear = "";
    if (programIdsForBanner.length) {
      residencyCardYear =
        yearFromProgramSlug(programIdsForBanner[programIdsForBanner.length - 1]) ||
        "";
    }
    if (!residencyCardYear) {
      const onlyUpcomingEnrollment =
        enrolledProgramIds.length > 0 &&
        programIdsForBanner.length === 0 &&
        enrolledProgramIds.every((id) => {
          const card = resolveProgramCardFromBlock(id, programsBlock)?.program;
          return card && !programQualifiesForAlumniBanner(card);
        });
      if (!onlyUpcomingEnrollment) {
        const sy = artistGallerySeasonYear(artist);
        if (sy) residencyCardYear = String(sy);
        else if (!enrolledProgramIds.length) {
          residencyCardYear = artistResidencyCardYear(artist);
        }
      }
    }
    if (veteranBannerEl) {
      if (programIdsForBanner.length) {
        veteranBannerEl.setAttribute(
          "data-program-ids",
          JSON.stringify(programIdsForBanner),
        );
      } else {
        veteranBannerEl.removeAttribute("data-program-ids");
      }
      veteranBannerEl.removeAttribute("data-program-id");
      if (residencyCardYear) {
        veteranBannerEl.setAttribute("data-residency-year", residencyCardYear);
      } else {
        veteranBannerEl.removeAttribute("data-residency-year");
      }
      if (programIdsForBanner.length || residencyCardYear) {
        veteranBannerEl.removeAttribute("hidden");
      } else {
        veteranBannerEl.setAttribute("hidden", "");
      }
    }
  };

  const run = async () => {
    setProfileLoading(true);
    try {
      const artist = await getArtistBySlug(slug);
      await applyArtist(artist);
    } catch {
      applyArtist(null);
    }
  };

  void run();
  window.addEventListener("fusion-data-source-change", () => void run());
}
