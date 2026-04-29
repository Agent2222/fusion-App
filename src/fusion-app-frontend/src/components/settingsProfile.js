import "../styles/studio.css";
import "../styles/memberProfileDashboard.css";
import posthog from "posthog-js";
import {
  getMyArtistRecord,
  updateMyArtistLocalesJson,
  updateMyArtistProfilePatch,
  updateMyArtistHeroProfileImagePatch,
  updateMyArtistQuoteAudioPatch,
  getProfileSettingsDevArtistId,
  setProfileSettingsDevArtistId,
  getArtists,
  getDataSource,
  ensureMyLinkedArtistProfile,
  getAccountForCaller,
  updateMyArtistPublicSlug,
  updateMyArtistVisibility,
  normalizeArtistRosterVisibility,
  getPrograms,
  generateAndUpdateMyArtistWorldFromBio,
  artistRowFromMyArtistRecord,
  normalizeProgramVisibility,
  unwrapOpt,
  getApplicationPaymentGlobal,
} from "../utils/database.js";
import { withSeoImageAlt } from "../utils/mediaAltSeo.js";
import {
  copyIntroGalleryEnToJa,
  introSlotsFromWorld,
  localeBlock,
  readLinksFromContainer,
  readLocalesFromDom,
  safeJsonStringify,
  syncIntroGalleryToAllLocales,
  worldFieldToTextarea,
} from "../utils/memberProfileForm.js";
import { publicSlugFromEnglishFirstLast } from "../utils/artistSlug.js";
import { normalizeLocalesWorldForStorage } from "../utils/worldNormalize.js";
import { getAuthSnapshot } from "../utils/icAuth.js";
import { DEV_MODE } from "../config.js";
import { uploadBlobToS3 } from "../utils/studioS3Upload.js";
import { getProfileSetupDraft } from "../utils/profileSetupDraft.js";
import { navigate } from "../router.js";
import { applyDocumentSeo } from "../utils/documentSeo.js";
import {
  getEffectiveAccountForSettingsUi,
  getAdminPerspective,
  isRealAdminCaller,
} from "../utils/adminPerspective.js";
import { firstNonEmptyString } from "../utils/localeFallback.js";

function applySettingsProfileDocumentSeo(dashTitle) {
  applyDocumentSeo({
    title: `${dashTitle} · Fusion`,
    description:
      "Edit your Fusion member profile and account settings. Sign in with Internet Identity.",
    path: typeof window !== "undefined" ? window.location.pathname : "/settings/profile",
    robots: "noindex, nofollow",
  });
}

/** Default residency program path for Apply CTA (matched against `getPrograms()` rows). */
const MPD_APPLY_PROGRAM_PATH = "/program/kaga-ishikawa";

/** Max upload size per image (hero + intro slots). */
export const MPD_MAX_IMAGE_BYTES = 1 * 1024 * 1024;

const MPD_IMAGE_LIMIT_NOTICE =
  "Each image must be 1 MB or smaller. Use JPEG or WebP for best results.";

/**
 * Panel-specific shout (HTML allowed) and plain hint for `#settingsProfileHint`.
 * Overview keeps the default marketing lines; other sections align copy to the task.
 */
const MPD_PANEL_CHROME = {
  overview: {
    shoutHtml:
      "Your work exists in context.<br />This is where it begins.",
    hint:
      "Shape how you appear on the public site. Save each section as you go.",
  },
  location: {
    shoutHtml: "Where you are in your practice.",
    hint:
      "Set your studio status and location so visitors and partners see the right context.",
  },
  story: {
    shoutHtml:
      "We're building new interactions between artists and patrons—your story is the bridge.",
    hint:
      "An extended gallery profile page is coming soon. Craft your narrative here first.",
  },
  links: {
    shoutHtml: "Your presence beyond Fusion.",
    hint:
      "Link to your site, socials, and portfolios so people can follow your work everywhere.",
  },
  programs: {
    shoutHtml: "Programs and opportunities.",
    hint:
      "Track applications and explore public programs that match your practice.",
  },
  membership: {
    shoutHtml: "Your membership keeps your practice visible.",
    hint:
      "View billing, update payment, or manage your subscription. We are here if you need help.",
  },
  dev: {
    shoutHtml: "Developer tools.",
    hint: "Raw locales JSON for debugging. Use with care.",
  },
};

/**
 * @param {Record<string, unknown> | null | undefined} acc
 * @param {...string} keys
 */
function mpdAccountStringField(acc, ...keys) {
  if (!acc || typeof acc !== "object") return "";
  const o = /** @type {Record<string, unknown>} */ (acc);
  for (const k of keys) {
    const v = o[k];
    if (v == null) continue;
    if (Array.isArray(v)) {
      const u = unwrapOpt(/** @type {[]} */ (v));
      if (u != null) return String(u).trim();
    } else if (typeof v === "string") {
      return v.trim();
    }
  }
  return "";
}

/** @param {string} st */
function mpdMembershipStatusLabel(st) {
  const s = String(st || "").toLowerCase();
  if (!s) return "No subscription";
  const map = {
    active: "Active",
    trialing: "Trialing",
    past_due: "Past due",
    canceled: "Canceled",
    unpaid: "Unpaid",
    incomplete: "Incomplete",
    incomplete_expired: "Incomplete (expired)",
    paused: "Paused",
  };
  return map[s] || String(st);
}

/** @param {string} [iso] */
function mpdFormatLongDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "long",
    }).format(d);
  } catch {
    return iso.slice(0, 10);
  }
}

/** @param {string} [iso] */
function mpdRelativeDaysFromIso(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1) return `In ${diff} days`;
  if (diff === -1) return "Yesterday";
  return `${Math.abs(diff)} days ago`;
}

/**
 * @param {File} f
 */
function assertMpdImageSizeOk(f) {
  if (f.size > MPD_MAX_IMAGE_BYTES) {
    const kb = Math.round(f.size / 1024);
    throw new Error(
      `Image is too large (${kb} KB). ${MPD_IMAGE_LIMIT_NOTICE}`,
    );
  }
}

/**
 * @param {string} id
 */
function el(id) {
  return /** @type {HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLImageElement | null} */ (
    document.getElementById(id)
  );
}

/**
 * @param {unknown} acc
 */
function dashboardTitleFromAccount(acc) {
  if (!acc || typeof acc !== "object") return "User Profile";
  const r = /** @type {Record<string, unknown>} */ (acc).role;
  if (r && typeof r === "object") {
    if ("user" in r) return "User Profile";
    if ("artist" in r) return "Artist Dashboard";
    if ("gallery" in r) return "Gallery Dashboard";
    if ("curator" in r) return "Curator Dashboard";
    if ("collector" in r) return "Collector Dashboard";
    if ("staff" in r) return "Staff Dashboard";
    if ("admin" in r) return "Admin Dashboard";
  }
  return "User Profile";
}

/**
 * @param {unknown} acc
 */
function sidebarRoleLabel(acc) {
  if (!acc || typeof acc !== "object") return "Member";
  const r = /** @type {Record<string, unknown>} */ (acc).role;
  if (r && typeof r === "object") {
    if ("user" in r) return "User";
    if ("artist" in r) return "Artist";
    if ("gallery" in r) return "Gallery";
    if ("curator" in r) return "Curator";
    if ("collector" in r) return "Collector";
    if ("staff" in r) return "Staff";
    if ("admin" in r) return "Admin";
  }
  return "Member";
}

/**
 * @param {string} id
 */
function getVal(id) {
  const n = el(id);
  if (!n || !("value" in n)) return "";
  return String(n.value ?? "");
}

/**
 * @param {string} id
 * @param {string} v
 */
function setVal(id, v) {
  const n = el(id);
  if (n && "value" in n) n.value = v;
}

/**
 * @param {boolean} visible
 */
function setHeroSpinnerVisible(visible) {
  const sp = document.getElementById("mpd_hero_spinner");
  if (!sp) return;
  sp.hidden = !visible;
  sp.setAttribute("aria-hidden", visible ? "false" : "true");
}

/**
 * @param {boolean} visible
 */
function setHeroProfileSpinnerVisible(visible) {
  const sp = document.getElementById("mpd_hero_profile_spinner");
  if (!sp) return;
  sp.hidden = !visible;
  sp.setAttribute("aria-hidden", visible ? "false" : "true");
}

/**
 * @param {number} i
 * @param {boolean} visible
 */
function setIntroSpinnerVisible(i, visible) {
  const sp = document.getElementById(`mpd_intro_${i}_spinner`);
  if (!sp) return;
  sp.hidden = !visible;
  sp.setAttribute("aria-hidden", visible ? "false" : "true");
}

/**
 * @param {Record<string, unknown>} locales
 * @param {'en' | 'ja'} active
 */
function fillFormFromLocales(locales, active) {
  const b = localeBlock(locales, active);
  const w =
    b.world && typeof b.world === "object" && !Array.isArray(b.world)
      ? b.world
      : {};
  const fnRaw = String(b.firstName ?? "").trim();
  const lnRaw = String(b.lastName ?? "").trim();
  if (fnRaw || lnRaw) {
    setVal("mpd_first_name", fnRaw);
    setVal("mpd_last_name", lnRaw);
  } else {
    const full = String(b.name ?? "").trim();
    const parts = full.split(/\s+/).filter(Boolean);
    setVal("mpd_first_name", parts[0] ?? "");
    setVal("mpd_last_name", parts.length > 1 ? parts.slice(1).join(" ") : "");
  }
  setVal("mpd_discipline", String(b.discipline ?? ""));
  setVal("mpd_bio", String(b.bio ?? ""));
  setVal("mpd_bioLong", String(b.bioLong ?? ""));
  const st = String(b.status ?? "");
  const sel = /** @type {HTMLSelectElement | null} */ (
    document.getElementById("mpd_status")
  );
  if (sel)
    sel.value = ["studio", "prep", "showing", "available"].includes(st)
      ? st
      : "studio";
  const loc =
    b.location && typeof b.location === "object" && !Array.isArray(b.location)
      ? b.location
      : {};
  setVal("mpd_loc_city", String(loc.city ?? ""));
  setVal("mpd_loc_state", String(loc.state ?? ""));
  setVal("mpd_loc_country", String(loc.country ?? ""));
  setVal("mpd_loc_display", String(loc.display ?? ""));
  setVal("mpd_w_practice", String(w.practice ?? ""));
  setVal("mpd_w_perspective", worldFieldToTextarea(w.perspective));
  setVal("mpd_w_vision", worldFieldToTextarea(w.vision));
  setVal("mpd_w_constructing", worldFieldToTextarea(w.constructing));
  setVal("mpd_w_context", worldFieldToTextarea(w.context));
  setVal("mpd_w_quote", String(w.quote ?? ""));
  const slots = introSlotsFromWorld(w);
  for (let i = 0; i < 3; i++) {
    const s = slots[i] || { src: "", alt: "", caption: "" };
    setVal(`mpd_intro_${i}_src`, s.src);
    setVal(`mpd_intro_${i}_alt`, s.alt);
    setVal(`mpd_intro_${i}_caption`, s.caption);
    const im = /** @type {HTMLImageElement | null} */ (
      document.getElementById(`mpd_intro_${i}_thumb`)
    );
    if (!im) continue;
    if (s.src) {
      setIntroSpinnerVisible(i, true);
      im.style.display = "none";
      im.onload = () => {
        setIntroSpinnerVisible(i, false);
        im.style.display = "block";
        im.onload = null;
        im.onerror = null;
      };
      im.onerror = () => {
        setIntroSpinnerVisible(i, false);
        im.onload = null;
        im.onerror = null;
      };
      im.src = s.src;
      if (im.complete && im.naturalHeight > 0) {
        setIntroSpinnerVisible(i, false);
        im.style.display = "block";
        im.onload = null;
        im.onerror = null;
      }
    } else {
      setIntroSpinnerVisible(i, false);
      im.removeAttribute("src");
      im.style.display = "none";
    }
  }
  const devTa = /** @type {HTMLTextAreaElement | null} */ (
    document.getElementById("mpd_dev_json")
  );
  if (devTa && DEV_MODE) devTa.value = safeJsonStringify(locales);
  renderLinkRows(Array.isArray(b.links) ? b.links : []);
}

/**
 * Merge fields from the most recently submitted program application into empty locale blocks
 * (in-memory until the user saves).
 *
 * @param {Record<string, unknown>} localesState
 * @param {unknown} appliedRaw
 */
function mergeLatestApplicationPayloadIntoLocales(localesState, appliedRaw) {
  if (!localesState || typeof localesState !== "object") return;
  /** @type {Record<string, unknown>} */
  let applied = {};
  try {
    if (appliedRaw)
      applied =
        typeof appliedRaw === "string" ? JSON.parse(appliedRaw) : appliedRaw;
    if (!applied || typeof applied !== "object") applied = {};
  } catch {
    return;
  }

  /** @type {Record<string, unknown> | null} */
  let best = null;
  let bestTs = -Infinity;
  for (const [, entry] of Object.entries(applied)) {
    if (!entry || typeof entry !== "object") continue;
    const er = /** @type {Record<string, unknown>} */ (entry);
    const p = er.payload;
    if (!p || typeof p !== "object") continue;
    const sub = er.submittedAt ?? er.submitted_at;
    let ts = -Infinity;
    if (typeof sub === "number" && Number.isFinite(sub)) ts = sub;
    else if (typeof sub === "string") {
      const d = Date.parse(sub);
      if (!Number.isNaN(d)) ts = d;
    }
    if (ts >= bestTs) {
      bestTs = ts;
      best = er;
    }
  }
  if (!best || !best.payload || typeof best.payload !== "object") {
    for (const [, entry] of Object.entries(applied)) {
      if (
        entry &&
        typeof entry === "object" &&
        /** @type {Record<string, unknown>} */ (entry).payload &&
        typeof /** @type {Record<string, unknown>} */ (entry).payload ===
          "object"
      ) {
        best = /** @type {Record<string, unknown>} */ (entry);
        break;
      }
    }
  }
  if (!best || !best.payload || typeof best.payload !== "object") return;
  const payload = /** @type {Record<string, unknown>} */ (best.payload);

  for (const code of /** @type {const} */ (["en", "ja"])) {
    if (
      !localesState[code] ||
      typeof localesState[code] !== "object" ||
      Array.isArray(localesState[code])
    ) {
      /** @type {Record<string, unknown>} */ (localesState)[code] = {};
    }
    const block = /** @type {Record<string, unknown>} */ (
      localesState[code]
    );

    const fn = String(block.firstName ?? "").trim();
    const ln = String(block.lastName ?? "").trim();
    if (!fn && payload.firstName != null)
      block.firstName = String(payload.firstName).trim();
    if (!ln && payload.lastName != null)
      block.lastName = String(payload.lastName).trim();
    const nameWas = String(block.name ?? "").trim();
    if (!nameWas) {
      const nf = String(block.firstName ?? "").trim();
      const nl = String(block.lastName ?? "").trim();
      if (nf || nl) block.name = `${nf} ${nl}`.trim();
    }

    /** @type {Record<string, unknown>} */
    let loc =
      block.location &&
      typeof block.location === "object" &&
      !Array.isArray(block.location)
        ? { .../** @type {Record<string, unknown>} */ (block.location) }
        : {};
    const mergeLoc = (key, val) => {
      if (val == null) return;
      const s = String(val).trim();
      if (!s) return;
      if (!String(loc[key] ?? "").trim()) loc[key] = s;
    };
    mergeLoc("country", payload.country);
    mergeLoc("state", payload.stateProvince);
    mergeLoc("city", payload.city);
    if (Object.keys(loc).length) block.location = loc;

    if (!String(block.discipline ?? "").trim() && payload.discipline != null)
      block.discipline = String(payload.discipline).trim();

    if (!String(block.bio ?? "").trim() && payload.bioStatement != null)
      block.bio = String(payload.bioStatement).trim();

    const web = payload.website != null ? String(payload.website).trim() : "";
    if (web) {
      const links = Array.isArray(block.links) ? [...block.links] : [];
      const hasUrl = links.some(
        (x) =>
          x &&
          typeof x === "object" &&
          String(/** @type {{ url?: unknown }} */ (x).url ?? "").trim(),
      );
      if (!hasUrl) {
        links.push({ type: "website", url: web, label: web });
        block.links = links;
      }
    }
  }
}

/**
 * @param {unknown[]} links
 */
function renderLinkRows(links) {
  const root = document.getElementById("mpd-links");
  if (!root) return;
  const rows =
    Array.isArray(links) && links.length
      ? links
      : [{ type: "website", url: "", label: "" }];
  root.replaceChildren();
  for (let idx = 0; idx < rows.length; idx++) {
    const item = rows[idx] && typeof rows[idx] === "object" ? rows[idx] : {};
    const row = document.createElement("div");
    row.className = "mpd-link-row studio-form-grid";
    row.innerHTML = `
            <label class="studio-field"><span>Type</span>
                <select class="studio-input mpd-link-type">
                    <option value="website">website</option>
                    <option value="instagram">instagram</option>
                    <option value="other">other</option>
                </select>
            </label>
            <label class="studio-field"><span>URL</span>
                <input type="url" class="studio-input mpd-link-url" placeholder="https://" value="" />
            </label>
            <label class="studio-field studio-field--full"><span>Label</span>
                <input type="text" class="studio-input mpd-link-label" value="" />
            </label>
        `;
    const typeSel = row.querySelector(".mpd-link-type");
    const urlIn = row.querySelector(".mpd-link-url");
    const labelIn = row.querySelector(".mpd-link-label");
    if (typeSel && "value" in typeSel)
      typeSel.value = String(item.type ?? "website");
    if (urlIn && "value" in urlIn) urlIn.value = String(item.url ?? "");
    if (labelIn && "value" in labelIn) labelIn.value = String(item.label ?? "");
    root.appendChild(row);
  }
}

function escapeHtmlMpd(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function openMpdResidencyComingSoonModal() {
  const modal = document.getElementById("mpdResidencyComingSoonModal");
  if (!modal) return;
  document.body.appendChild(modal);
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
}

function closeMpdResidencyComingSoonModal() {
  const modal = document.getElementById("mpdResidencyComingSoonModal");
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
}

function openMpdMembershipCancelModal() {
  const modal = document.getElementById("mpdMembershipCancelModal");
  if (!modal) return;
  document.body.appendChild(modal);
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
}

function closeMpdMembershipCancelModal() {
  const modal = document.getElementById("mpdMembershipCancelModal");
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
}

function wireMpdMembershipCancelModal() {
  const modal = document.getElementById("mpdMembershipCancelModal");
  if (!modal || modal.dataset.mpdMembershipModalWired === "1") return;
  modal.dataset.mpdMembershipModalWired = "1";
  const scrim = modal.querySelector(".profile-gallery-access-modal__scrim");
  scrim?.addEventListener("click", closeMpdMembershipCancelModal);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && !modal.hidden)
      closeMpdMembershipCancelModal();
  });
}

function wireMpdResidencyComingSoonModal() {
  const modal = document.getElementById("mpdResidencyComingSoonModal");
  if (!modal || modal.dataset.mpdResidencyModalWired === "1") return;
  modal.dataset.mpdResidencyModalWired = "1";
  const scrim = modal.querySelector(".profile-gallery-access-modal__scrim");
  const closeBtn = modal.querySelector(".profile-gallery-access-modal__close");
  scrim?.addEventListener("click", closeMpdResidencyComingSoonModal);
  closeBtn?.addEventListener("click", closeMpdResidencyComingSoonModal);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && !modal.hidden)
      closeMpdResidencyComingSoonModal();
  });
}

/**
 * @param {Record<string, unknown>} rec
 * @param {Record<string, unknown>} locales
 * @param {'en'|'ja'} active
 */
async function hydrateProgramsPanel(rec, locales, active) {
  const container = document.getElementById("mpd_programs_list");
  if (!container) return;
  const b = localeBlock(locales, active);
  const programIds = Array.isArray(b.programs) ? b.programs.map(String) : [];
  /** @type {Record<string, unknown>} */
  let applied = {};
  try {
    const raw = rec.applied_json ?? rec.appliedJson;
    if (raw) applied = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!applied || typeof applied !== "object") applied = {};
  } catch {
    applied = {};
  }
  /** @type {object[]} */
  let programs = [];
  try {
    programs = await getPrograms();
  } catch {
    programs = [];
  }
  container.replaceChildren();
  const idSet = new Set([...programIds, ...Object.keys(applied)]);
  if (idSet.size === 0) {
    const p = document.createElement("p");
    p.className = "studio-muted mpd-programs-empty";
    p.textContent =
      "No program associations yet. When you apply to a residency, your application status will appear here.";
    container.appendChild(p);
    return;
  }
  for (const pid of idSet) {
    const pr = programs.find((x) => String(x.id) === String(pid));
    const en = pr?.enCard && typeof pr.enCard === "object" ? pr.enCard : {};
    const title =
      String(en.focus ?? en.headline ?? en.location ?? "").trim() ||
      String(pid);
    let route = MPD_APPLY_PROGRAM_PATH;
    if (pr?.routeLink) {
      const rl = String(pr.routeLink);
      route = rl.startsWith("/") ? rl : `/${rl}`;
    }
    const entry = applied[pid];
    let statusText = "Not applied";
    let detail = "";
    if (entry && typeof entry === "object") {
      const er = /** @type {Record<string, unknown>} */ (entry);
      const st = String(er.status ?? "").toLowerCase();
      if (st === "reviewing" || st === "review" || st === "in_review") {
        statusText = "In review";
      } else {
        statusText = "Submitted";
      }
      const sub = er.submittedAt ?? er.submitted_at;
      if (sub) detail = `Submitted: ${String(sub)}`;
    }
    const applicationsOpen = pr
      ? String(pr.studioStatus ?? "").toLowerCase() === "open"
      : true;
    const card = document.createElement("article");
    card.className = "mpd-program-card";
    const ctaClosedCls = applicationsOpen
      ? "program-intro-cta mpd-program-intro-cta mpd-program-card__link"
      : "program-intro-cta mpd-program-intro-cta mpd-program-card__link mpd-residency-cta--closed";
    const ctaLabel = applicationsOpen ? "View program" : "Coming soon";
    card.innerHTML = `
      <div class="mpd-program-card__head">
        <h3 class="mpd-program-card__title">${escapeHtmlMpd(title)}</h3>
        <span class="mpd-program-card__badge">${escapeHtmlMpd(statusText)}</span>
      </div>
      ${detail ? `<p class="mpd-program-card__detail studio-muted">${escapeHtmlMpd(detail)}</p>` : ""}
      <button type="button" class="${ctaClosedCls}" data-mpd-program-route="${escapeHtmlMpd(route)}" data-mpd-program-applications-open="${applicationsOpen ? "true" : "false"}">${escapeHtmlMpd(ctaLabel)}</button>
    `;
    const go = card.querySelector("button.mpd-program-card__link");
    if (go) {
      go.addEventListener("click", (ev) => {
        if (go.getAttribute("data-mpd-program-applications-open") === "false") {
          ev.preventDefault();
          openMpdResidencyComingSoonModal();
          return;
        }
        const r =
          go.getAttribute("data-mpd-program-route") || MPD_APPLY_PROGRAM_PATH;
        navigate(r);
      });
    }
    container.appendChild(card);
  }
}

/**
 * All public programs as discovery cards (opens in new tab).
 */
async function hydratePublicProgramDiscoveryCards() {
  const container = document.getElementById("mpd_public_programs_all");
  if (!container) return;
  /** @type {object[]} */
  let programs = [];
  try {
    programs = await getPrograms();
  } catch {
    programs = [];
  }
  const publicProgs = programs.filter(
    (p) => normalizeProgramVisibility(p.visibility) === "public",
  );
  container.replaceChildren();
  if (publicProgs.length === 0) {
    const p = document.createElement("p");
    p.className = "studio-muted mpd-programs-empty";
    p.textContent = "No public programs are listed yet.";
    container.appendChild(p);
    return;
  }
  const grid = document.createElement("div");
  grid.className = "mpd-public-programs-grid";
  for (const pr of publicProgs) {
    const en = pr?.enCard && typeof pr.enCard === "object" ? pr.enCard : {};
    const ja =
      pr?.jaCard && typeof pr.jaCard === "object" ? pr.jaCard : {};
    const focus = String(en.focus ?? en.headline ?? "").trim();
    const location =
      typeof en.location === "string"
        ? en.location.trim()
        : String(en.location ?? "").trim() ||
          String(en.headline ?? "").trim();
    const title =
      focus ||
      location ||
      String(en.headline ?? "").trim() ||
      String(pr.id ?? "");
    const startDate = String(en.startDate ?? "").trim();
    const endDate = String(en.endDate ?? "").trim();
    const year = String(en.year ?? "").trim();
    const imageSrc = firstNonEmptyString(
      /** @type {Record<string, unknown>} */ (ja).imageSrc,
      /** @type {Record<string, unknown>} */ (en).imageSrc,
    );
    const imageAlt = String(en.imageAlt ?? en.focus ?? title).trim() || title;
    let route = "/programs";
    if (pr?.routeLink) {
      const rl = String(pr.routeLink);
      route = rl.startsWith("/") ? rl : `/${rl}`;
    }
    const card = document.createElement("article");
    card.className = "mpd-public-program-card mpd-public-program-card--rich";

    const link = document.createElement("a");
    link.className = "mpd-public-program-card__link-rich";
    link.href = route;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    const imgWrap = document.createElement("div");
    imgWrap.className = "mpd-public-program-card__image-wrap";
    if (focus) {
      const foc = document.createElement("div");
      foc.className = "mpd-public-program-card__focus";
      foc.textContent = focus;
      imgWrap.appendChild(foc);
    }
    if (imageSrc) {
      const img = document.createElement("img");
      img.className = "mpd-public-program-card__img";
      img.src = String(imageSrc);
      img.alt = withSeoImageAlt(imageAlt);
      img.loading = "lazy";
      imgWrap.appendChild(img);
    } else {
      const ph = document.createElement("div");
      ph.className = "mpd-public-program-card__placeholder";
      ph.textContent = "Fusion";
      imgWrap.appendChild(ph);
    }
    link.appendChild(imgWrap);

    const body = document.createElement("div");
    body.className = "mpd-public-program-card__body";
    const tEl = document.createElement("div");
    tEl.className = "mpd-public-program-card__title";
    tEl.textContent = location || title;
    body.appendChild(tEl);
    const dates = document.createElement("div");
    dates.className = "mpd-public-program-card__dates";
    if (startDate || endDate) {
      const range = document.createElement("span");
      range.className = "mpd-public-program-card__range";
      range.textContent =
        startDate && endDate
          ? `${startDate} – ${endDate}`
          : startDate || endDate;
      dates.appendChild(range);
    }
    if (year) {
      const y = document.createElement("span");
      y.className = "mpd-public-program-card__year";
      y.textContent = year;
      dates.appendChild(y);
    }
    if (dates.childElementCount) body.appendChild(dates);
    link.appendChild(body);

    card.appendChild(link);
    grid.appendChild(card);
  }
  container.appendChild(grid);
}

async function syncResidencyApplyCta() {
  const btn = document.getElementById("mpd_apply_residency");
  if (!btn) return;
  /** @type {object[]} */
  let programs = [];
  try {
    programs = await getPrograms();
  } catch {
    programs = [];
  }
  const tail = MPD_APPLY_PROGRAM_PATH.split("/").filter(Boolean).pop() || "";
  const target =
    programs.find((p) =>
      String(p.routeLink || "")
        .toLowerCase()
        .includes("kaga"),
    ) ||
    programs.find(
      (p) =>
        String(p.routeLink || "")
          .split("/")
          .filter(Boolean)
          .pop() === tail,
    ) ||
    null;
  let route = MPD_APPLY_PROGRAM_PATH;
  if (target?.routeLink) {
    const rl = String(target.routeLink);
    route = rl.startsWith("/") ? rl : `/${rl}`;
  }
  btn.dataset.programPath = route;
  let accepting = true;
  if (target) {
    const st = String(target.studioStatus ?? "").toLowerCase();
    accepting = st === "open";
  }
  btn.dataset.applyOpen = accepting ? "true" : "false";
  btn.textContent = accepting ? "Apply to Residency" : "Coming soon";
  btn.classList.toggle("mpd-residency-cta--closed", !accepting);
}

export function generateSettingsProfileContent() {
  const cardFooter = `<div class="member-profile-dashboard__card-footer"><button type="button" class="mpd-section-save mpd-section-save--primary">Save</button></div>`;
  const introSlotsHtml = [0, 1, 2]
    .map(
      (i) => `
                        <div class="member-profile-dashboard__intro-slot">
                            <div class="member-profile-dashboard__intro-preview-col">
                                <div class="member-profile-dashboard__intro-preview-wrap">
                                    <div class="mpd-media-spinner" id="mpd_intro_${i}_spinner" hidden aria-hidden="true"></div>
                                    <img id="mpd_intro_${i}_thumb" class="member-profile-dashboard__intro-thumb" alt="${withSeoImageAlt('Profile intro artwork preview')}" style="display:none" />
                                </div>
                                <input type="hidden" id="mpd_intro_${i}_src" />
                                <input type="hidden" id="mpd_intro_${i}_alt" />
                                <input type="hidden" id="mpd_intro_${i}_caption" />
                                <input type="file" id="mpd_intro_${i}_file" class="mpd-file-input-hidden" accept="image/*" data-intro-slot="${String(
                                  i,
                                )}" />
                                <label for="mpd_intro_${i}_file" class="mpd-upload-btn">Upload image</label>
                            </div>
                        </div>`,
    )
    .join("");
  const devNavBtn = DEV_MODE
    ? `<button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="dev">Developer</button>`
    : "";
  const devPanel = DEV_MODE
    ? `<div class="mpd-panel" id="mpd-panel-dev" data-mpd-panel="dev" hidden>
                    <section class="member-profile-dashboard__card">
                        <details id="mpd-dev">
                            <summary style="cursor:pointer;font-variation-settings:var(--fv-subtitle)">Developer — raw locales JSON</summary>
                            <textarea id="mpd_dev_json" class="studio-textarea studio-textarea-mono" rows="14" readonly spellcheck="false" style="margin-top:0.75rem;width:100%"></textarea>
                        </details>
                        ${cardFooter}
                    </section>
                </div>`
    : "";

  return `
        <div class="page settings-profile-page">
            <main id="settingsMain" class="main-cont">
                <div id="settingsMainContent" class="feed-container">
        <div class="studio-app settings-profile-studio" id="mpd_root">
            <div class="studio-nav-backdrop" id="settingsProfileNavBackdrop" hidden aria-hidden="true"></div>
            <aside class="studio-sidebar" id="settingsProfileSidebar" aria-label="Profile navigation">
                <button type="button" class="studio-wordmark studio-wordmark-btn" id="settingsProfileWordmark" aria-label="Fusion home">Fusion</button>
                <p class="settings-profile-slug-line" id="mpd_sidebar_slug">—</p>
                <nav class="studio-nav" id="settingsProfileNav" aria-label="Profile sections">
                    <button type="button" class="studio-nav-item mpd-nav-btn is-active" data-mpd-panel="overview">Overview</button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="location">Status</button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="story">Story &amp; world</button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="links">Digital Footprint</button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="programs">Programs</button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="membership">Membership</button>
                    ${devNavBtn}
                    <div class="studio-nav-contact mpd-sidebar-contact" id="settingsProfileNavContact">
                        <p class="studio-nav-contact__headline">
                            Questions or issues? Message the Fusion team—we usually reply within a few business days.
                        </p>
                        <textarea
                            id="settingsProfileNavContactMessage"
                            class="studio-nav-contact__input"
                            rows="4"
                            placeholder="Your message"
                            aria-label="Message to Fusion"
                        ></textarea>
                        <button type="button" class="studio-btn-primary studio-nav-contact__send" id="settingsProfileNavContactSend">
                            Send
                        </button>
                        <p id="settingsProfileNavContactStatus" class="studio-nav-contact__status" role="status"></p>
                    </div>
                </nav>
                <div class="studio-sidebar-footer">
                    <div class="studio-avatar" id="settingsProfileAvatar" aria-hidden="true">U</div>
                    <div class="studio-user-meta">
                        <span id="settingsProfileSidebarRole">Member</span>
                        <span id="settingsProfileSidebarSub">Profile</span>
                    </div>
                </div>
            </aside>
            <div class="studio-workspace">
                <header class="studio-topbar">
                    <button type="button" class="studio-menu-btn" id="settingsProfileMenuBtn" aria-label="Open navigation menu" aria-expanded="false" aria-controls="settingsProfileNav">
                        <span class="studio-menu-btn__bars" aria-hidden="true"></span>
                    </button>
                    <h1 id="settingsProfileHeading">User Profile</h1>
                    <div class="studio-topbar-actions">
                        <button type="button" class="studio-topbar-account-btn" id="settingsProfileBackBtn">Return to Fusion</button>
                    </div>
                </header>
                <div class="studio-main settings-profile-main" id="settingsProfileScrollMain">
                <p id="settingsProfileStatus" class="member-profile-dashboard__status-line" role="status"></p>
                <div class="mpd-settings-shout shoutHeadline" id="settingsProfileShout">
                    Your work exists in context.<br />This is where it begins.
                </div>
                <p id="settingsProfileHint" class="studio-muted mpd-settings-hint"></p>
                <div id="settingsProfileMembershipActions" class="mpd-membership-actions" style="display:none" hidden>
                    <button type="button" class="studio-btn-primary" id="settingsProfileFinishMembership">Finish membership setup</button>
                    <button type="button" class="studio-btn-ghost" id="settingsProfileSyncSubscription">Refresh subscription status</button>
                    <button type="button" class="studio-btn-ghost" id="settingsProfileAdminBypass" style="display:none" hidden>Admin preview bypass</button>
                </div>
                <div id="settingsTestPicker" class="studio-field studio-field--full" style="display:none">
                    <span>Test mode</span>
                    <select id="settingsTestArtistSelect" class="studio-input"></select>
                </div>
                <div id="settingsProfileFormWrap" hidden>
                    <div class="member-profile-dashboard__locale-bar">
                        <span class="studio-toolbar-label">Editing language</span>
                        <button type="button" class="mpd-locale-tab is-active" data-locale="en">English</button>
                        <button type="button" class="mpd-locale-tab" data-locale="ja">日本語</button>
                        <button type="button" class="studio-btn-ghost" id="mpd_copy_intro_ja" title="Copy intro images from English">Copy intro from EN → JA</button>
                    </div>

                    <div class="mpd-panels">
                        <div class="mpd-panel" id="mpd-panel-overview" data-mpd-panel="overview">
                            <section class="member-profile-dashboard__card" id="mpd-overview">
                                <h2>Overview</h2>
                                <p class="studio-muted">Quick actions and how you present on the public site for the selected language.</p>
                                <div class="mpd-overview-cta-row">
                                    <a class="program-intro-cta mpd-program-intro-cta" id="mpd_view_profile" href="#" target="_blank" rel="noopener noreferrer">View public profile</a>
                                    <button type="button" class="program-intro-cta mpd-program-intro-cta" id="mpd_apply_residency" data-program-path="${MPD_APPLY_PROGRAM_PATH}" data-apply-open="true">Apply to Residency</button>
                                </div>
                                <label class="studio-field studio-field--full mpd-visibility-field">
                                    <span>Artist profile visibility</span>
                                    <select id="mpd_profile_visibility" class="studio-input" aria-describedby="mpd_profile_visibility_hint">
                                        <option value="inactive">Inactive — profile not yet submitted for review</option>
                                        <option value="pending">Pending — under review (you will be notified when public)</option>
                                        <option value="private">Private — unlisted (direct link still works)</option>
                                        <option value="public">Public — listed on artist feeds and directory</option>
                                    </select>
                                    <span id="mpd_profile_visibility_hint" class="mpd-field-hint">Only <strong>public</strong> appears on the public artist directory. When your roster state is <strong>inactive</strong>, saving your profile will move it to <strong>pending</strong> for staff review.</span>
                                </label>
                                <p id="mpd_datasource_pill" class="member-profile-dashboard__pill" style="display:none;margin-top:0.75rem"></p>

                                <h2 class="mpd-identity-h2">Identity &amp; presence</h2>
                                <p class="studio-muted">Name, discipline, bios, and media — save when you are ready.</p>
                                <h3 class="mpd-identity-subhead">Name &amp; discipline</h3>
                                <div class="studio-form-grid">
                                    <label class="studio-field"><span>First name</span>
                                        <input type="text" id="mpd_first_name" class="studio-input" autocomplete="given-name" />
                                    </label>
                                    <label class="studio-field"><span>Last name</span>
                                        <input type="text" id="mpd_last_name" class="studio-input" autocomplete="family-name" />
                                    </label>
                                    <label class="studio-field studio-field--full"><span>Discipline</span>
                                        <input type="text" id="mpd_discipline" class="studio-input" />
                                    </label>
                                </div>

                                <h3 class="mpd-identity-subhead">About</h3>
                                <div class="studio-form-grid">
                                    <label class="studio-field studio-field--full"><span>Short bio</span>
                                        <textarea id="mpd_bio" class="studio-textarea" rows="3"></textarea>
                                    </label>
                                    <label class="studio-field studio-field--full"><span>Long bio</span>
                                        <textarea id="mpd_bioLong" class="studio-textarea" rows="5"></textarea>
                                    </label>
                                    <label class="studio-field studio-field--full"><span>Profile quote (shared)</span>
                                        <textarea id="mpd_profile_quote" class="studio-textarea" rows="2"></textarea>
                                    </label>
                                </div>

                                <h3 class="studio-subheading mpd-media-subhead">Hero image</h3>
                                <p class="studio-muted mpd-media-helper">
                                  Use a high-quality image of your work. A <strong>4:5</strong> aspect ratio
                                  (portrait) is preferred. Max <strong>1 MB</strong> per file.
                                </p>
                                <div class="member-profile-dashboard__hero-preview-wrap">
                                    <div class="mpd-media-spinner" id="mpd_hero_spinner" hidden aria-hidden="true"></div>
                                    <img id="mpd_hero_preview" class="member-profile-dashboard__hero-preview" alt="${withSeoImageAlt('Profile hero image preview')}" />
                                </div>
                                <input type="hidden" id="mpd_hero_url" value="" />
                                <input type="file" id="mpd_hero_file" class="mpd-file-input-hidden" accept="image/*" />
                                <label for="mpd_hero_file" class="mpd-upload-btn">Upload hero image</label>

                                <h3 class="studio-subheading mpd-media-subhead">Hero profile image (card toggle)</h3>
                                <p class="studio-muted mpd-media-helper">
                                  Optional headshot or portrait for the <strong>Profile</strong> view on home, artists, and program cards.
                                  Falls back to the hero image when empty. Max <strong>1 MB</strong> per file.
                                </p>
                                <div class="member-profile-dashboard__hero-preview-wrap">
                                    <div class="mpd-media-spinner" id="mpd_hero_profile_spinner" hidden aria-hidden="true"></div>
                                    <img id="mpd_hero_profile_preview" class="member-profile-dashboard__hero-preview" alt="${withSeoImageAlt('Profile headshot preview')}" />
                                </div>
                                <input type="hidden" id="mpd_hero_profile_url" value="" />
                                <input type="file" id="mpd_hero_profile_file" class="mpd-file-input-hidden" accept="image/*" />
                                <label for="mpd_hero_profile_file" class="mpd-upload-btn">Upload profile image</label>

                                <h3 class="studio-subheading mpd-media-subhead">Audio bite</h3>
                                <p class="studio-muted mpd-media-helper">Upload a short audio bite for journal audio rows.</p>
                                <input type="hidden" id="mpd_audio_url" value="" />
                                <input type="file" id="mpd_audio_file" class="mpd-file-input-hidden" accept="audio/*" />
                                <label for="mpd_audio_file" class="mpd-upload-btn">Upload audio bite</label>
                                <label class="studio-field studio-field--full"><span>Audio title</span>
                                    <input type="text" id="mpd_audio_title" class="studio-input" />
                                </label>

                                <h3 class="studio-subheading mpd-media-subhead">Intro artwork (max 3)</h3>
                                <p class="studio-muted mpd-media-helper">
                                  Supporting images for your profile; same <strong>4:5</strong> ratio works well.
                                  Max <strong>1 MB</strong> each.
                                </p>
                                ${introSlotsHtml}
                                ${cardFooter}
                            </section>
                        </div>

                        <div class="mpd-panel" id="mpd-panel-location" data-mpd-panel="location" hidden>
                            <section class="member-profile-dashboard__card" id="mpd-location">
                                <h2>Status</h2>
                                <p class="studio-muted">Status and location for the selected language.</p>
                                <div class="studio-form-grid">
                                    <label class="studio-field studio-field--full"><span>Status</span>
                                        <select id="mpd_status" class="studio-input">
                                            <option value="studio">In studio</option>
                                            <option value="prep">Preparing for exhibition</option>
                                            <option value="showing">Show in progress</option>
                                            <option value="available">Available for commissions</option>
                                        </select>
                                    </label>
                                    <label class="studio-field"><span>City</span>
                                        <input type="text" id="mpd_loc_city" class="studio-input" />
                                    </label>
                                    <label class="studio-field"><span>State / region</span>
                                        <input type="text" id="mpd_loc_state" class="studio-input" />
                                    </label>
                                    <label class="studio-field"><span>Country</span>
                                        <input type="text" id="mpd_loc_country" class="studio-input" />
                                    </label>
                                    <label class="studio-field studio-field--full"><span>Display location (override)</span>
                                        <input type="text" id="mpd_loc_display" class="studio-input" placeholder="Optional single line for feeds" />
                                    </label>
                                </div>
                                ${cardFooter}
                            </section>
                        </div>

                        <div class="mpd-panel" id="mpd-panel-story" data-mpd-panel="story" hidden>
                            <section class="member-profile-dashboard__card" id="mpd-story">
                                <h2>Story &amp; world</h2>
                                <p class="studio-muted">Separate paragraphs with a blank line where noted. Text is stored in a consistent format for the site.</p>
                                <div class="mpd-story-world-toolbar">
                                    <button type="button" class="studio-btn-primary" id="mpd_gen_world_btn">
                                        Generate from profile info
                                    </button>
                                    <label class="mpd-story-world-overwrite-label">
                                        <input type="checkbox" id="mpd_gen_world_overwrite" />
                                        Replace existing world fields
                                    </label>
                                </div>
                                <div class="studio-form-grid">
                                    <label class="studio-field studio-field--full"><span>Practice</span>
                                        <textarea id="mpd_w_practice" class="studio-textarea" rows="3"></textarea>
                                        <span class="mpd-field-hint">Tell us more about the work you are currently pursuing.</span>
                                    </label>
                                    <label class="studio-field studio-field--full"><span>Perspective</span>
                                        <textarea id="mpd_w_perspective" class="studio-textarea" rows="4" placeholder="Paragraph one&#10;&#10;Paragraph two"></textarea>
                                        <span class="mpd-field-hint">How you see your practice in relation to the field — use a blank line between paragraphs.</span>
                                    </label>
                                    <label class="studio-field studio-field--full"><span>Vision</span>
                                        <textarea id="mpd_w_vision" class="studio-textarea" rows="4"></textarea>
                                        <span class="mpd-field-hint">Where you want the work to go — aims, horizons, and what you are building toward.</span>
                                    </label>
                                    <label class="studio-field studio-field--full"><span>Constructing</span>
                                        <textarea id="mpd_w_constructing" class="studio-textarea" rows="3"></textarea>
                                        <span class="mpd-field-hint">Materials, process, and what you are actively making right now.</span>
                                    </label>
                                    <label class="studio-field studio-field--full"><span>Context</span>
                                        <textarea id="mpd_w_context" class="studio-textarea" rows="3"></textarea>
                                        <span class="mpd-field-hint">Place, community, or history that situates the work.</span>
                                    </label>
                                    <label class="studio-field studio-field--full"><span>Quote</span>
                                        <input type="text" id="mpd_w_quote" class="studio-input" />
                                        <span class="mpd-field-hint">A single line visitors can read at a glance — optional, but memorable when it lands.</span>
                                    </label>
                                </div>
                                ${cardFooter}
                            </section>
                        </div>

                        <div class="mpd-panel" id="mpd-panel-links" data-mpd-panel="links" hidden>
                            <section class="member-profile-dashboard__card" id="mpd-links-card">
                                <h2>Digital Footprint</h2>
                                <p class="studio-muted">Website, social, and other links that shape how people find you beyond this site.</p>
                                <div id="mpd-links"></div>
                                <button type="button" class="studio-btn-ghost" id="mpd_links_add">Add link</button>
                                ${cardFooter}
                            </section>
                        </div>

                        <div class="mpd-panel" id="mpd-panel-programs" data-mpd-panel="programs" hidden>
                            <section class="member-profile-dashboard__card" id="mpd-programs">
                                <h2>Programs</h2>
                                <p class="studio-muted">Programs you are associated with and your application status.</p>
                                <div id="mpd_programs_list" class="mpd-programs-list" aria-live="polite"></div>
                                <div class="mpd-public-programs-discovery" id="mpd_public_programs_discovery">
                                    <h3 class="mpd-public-programs-discovery__h">Explore programs</h3>
                                    <p class="studio-muted">
                                        Browse all public Fusion programs — each link opens in a new tab.
                                    </p>
                                    <div id="mpd_public_programs_all" class="mpd-public-programs-list" aria-live="polite"></div>
                                </div>
                            </section>
                        </div>

                        <div class="mpd-panel" id="mpd-panel-membership" data-mpd-panel="membership" hidden>
                            <section class="member-profile-dashboard__card mpd-membership-card" id="mpd-membership-section">
                                <h2>Membership</h2>
                                <p class="studio-muted">
                                    Manage your subscription, view billing details, and update your membership.
                                </p>
                                <p id="mpd_membership_error" class="mpd-membership-inline-error" role="alert" hidden></p>
                                <p id="mpd_membership_scheduled_cancel" class="mpd-membership-scheduled-cancel" role="status" hidden></p>

                                <div class="mpd-membership-status-card" id="mpd_membership_status_grid">
                                    <div class="mpd-membership-status-col mpd-membership-status-col--badge">
                                        <div class="mpd-membership-badge" id="mpd_membership_badge">
                                            <span class="mpd-membership-badge__icon" aria-hidden="true"></span>
                                            <span class="mpd-membership-badge__text">
                                                <strong id="mpd_membership_badge_label">—</strong>
                                                <span class="studio-muted" id="mpd_membership_badge_line">—</span>
                                            </span>
                                        </div>
                                    </div>
                                    <div class="mpd-membership-status-col">
                                        <span class="mpd-membership-k">Plan</span>
                                        <strong id="mpd_membership_plan_name">—</strong>
                                        <span class="studio-muted" id="mpd_membership_plan_price">—</span>
                                    </div>
                                    <div class="mpd-membership-status-col">
                                        <span class="mpd-membership-k">Next renewal</span>
                                        <strong id="mpd_membership_renewal_date">—</strong>
                                        <span class="studio-muted" id="mpd_membership_renewal_relative"></span>
                                    </div>
                                    <div class="mpd-membership-status-col">
                                        <span class="mpd-membership-k">Payment method</span>
                                        <span class="mpd-membership-pm-line">
                                            <span id="mpd_membership_pm_brand" class="mpd-membership-pm-brand"></span>
                                            <span id="mpd_membership_pm_last4">—</span>
                                        </span>
                                        <button type="button" class="mpd-membership-text-link" id="mpd_membership_pm_update">
                                            Update
                                        </button>
                                    </div>
                                </div>

                                <div class="mpd-membership-included" id="mpd_membership_included_wrap">
                                    <h3 class="mpd-membership-subh">What&apos;s included</h3>
                                    <ul class="mpd-membership-checklist" id="mpd_membership_included_list"></ul>
                                </div>

                                <div class="mpd-membership-manage-grid">
                                    <div class="mpd-membership-actions-card">
                                        <button type="button" class="mpd-membership-action-row" id="mpd_membership_row_billing">
                                            <span class="mpd-membership-action-row__icon" aria-hidden="true"></span>
                                            <span class="mpd-membership-action-row__main">
                                                <strong>Billing history</strong>
                                                <span class="studio-muted">View your past payments and invoices.</span>
                                            </span>
                                            <span class="mpd-membership-action-row__chev" aria-hidden="true"></span>
                                        </button>
                                        <button type="button" class="mpd-membership-action-row" id="mpd_membership_row_payment">
                                            <span class="mpd-membership-action-row__icon mpd-membership-action-row__icon--card" aria-hidden="true"></span>
                                            <span class="mpd-membership-action-row__main">
                                                <strong>Update payment method</strong>
                                                <span class="studio-muted">Change the card used for your subscription.</span>
                                            </span>
                                            <span class="mpd-membership-action-row__chev" aria-hidden="true"></span>
                                        </button>
                                    </div>
                                    <div class="mpd-membership-cancel-card" id="mpd_membership_cancel_wrap">
                                        <h3 class="mpd-membership-subh">Cancel membership</h3>
                                        <p class="studio-muted">
                                            Cancel your membership. You&apos;ll continue to have access until the end of your
                                            current billing period.
                                        </p>
                                        <button type="button" class="mpd-membership-cancel-outline" id="mpd_membership_cancel_btn">
                                            Cancel membership
                                        </button>
                                    </div>
                                </div>

                                <p id="mpd_membership_exempt_note" class="mpd-membership-exempt-note" role="status" hidden></p>
                                <p class="mpd-membership-footer-hint studio-muted">
                                    Need help? Contact the Fusion team and we&apos;ll get back to you within a few business
                                    days.
                                </p>
                            </section>
                        </div>

                        ${devPanel}
                    </div>
                </div>
                </div>
            </div>
        </div>
                </div>
                <div
                    id="mpdResidencyComingSoonModal"
                    class="profile-gallery-access-modal mpd-residency-coming-soon-modal"
                    hidden
                    aria-hidden="true"
                >
                    <div class="profile-gallery-access-modal__scrim" aria-hidden="true"></div>
                    <div
                        class="profile-gallery-access-modal__panel"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="mpdResidencyComingSoonTitle"
                    >
                        <h2 id="mpdResidencyComingSoonTitle" class="profile-gallery-access-modal__title">Coming soon</h2>
                        <p class="profile-gallery-access-modal__body">
                            Applications are not open for this program yet. As part of the Fusion network, you will be
                            notified as soon as applications open — watch your email and this space.
                        </p>
                        <button type="button" class="profile-gallery-access-modal__close">Close</button>
                    </div>
                </div>
                <div
                    id="mpdMembershipCancelModal"
                    class="profile-gallery-access-modal mpd-membership-cancel-modal"
                    hidden
                    aria-hidden="true"
                >
                    <div class="profile-gallery-access-modal__scrim" aria-hidden="true"></div>
                    <div
                        class="profile-gallery-access-modal__panel mpd-membership-cancel-modal__panel"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="mpdMembershipCancelTitle"
                    >
                        <h2 id="mpdMembershipCancelTitle" class="profile-gallery-access-modal__title">
                            Before you cancel
                        </h2>
                        <div class="mpd-membership-cancel-modal__body">
                            <p>
                                Great things happen through consistency and commitment — we hope you&apos;ll stay and keep
                                shaping your presence here.
                            </p>
                            <p>
                                We designed this platform for artists to shape for impact: your profile, programs, and
                                story deserve a steady home.
                            </p>
                            <p>
                                If you cancel, your profile will be kept for another <strong>15 days</strong> so you can
                                return without starting from zero — we&apos;d love to welcome you back.
                            </p>
                        </div>
                        <div class="mpd-membership-cancel-modal__actions">
                            <button type="button" class="studio-btn-primary" id="mpdMembershipCancelStay">
                                Stay subscribed
                            </button>
                            <button type="button" class="mpd-membership-cancel-outline" id="mpdMembershipCancelContinue">
                                Continue to cancel
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    `;
}

/**
 * @param {Record<string, unknown>} locales
 * @param {'en'|'ja'} active
 * @param {string} heroUrl
 * @param {string} visibility
 * @param {{ profileQuote?: string, audioUrl?: string, audioTitle?: string, heroProfileUrl?: string }} [profileMedia]
 */
function snapshotState(locales, active, heroUrl, visibility, profileMedia = {}) {
  return JSON.stringify({
    locales,
    active,
    hero: heroUrl,
    heroProfile: String(profileMedia.heroProfileUrl ?? ""),
    visibility,
    profileQuote: String(profileMedia.profileQuote ?? ""),
    audioUrl: String(profileMedia.audioUrl ?? ""),
    audioTitle: String(profileMedia.audioTitle ?? ""),
  });
}

/** @type {((e: BeforeUnloadEvent) => void) | null} */
let _mpdBeforeUnloadHandler = null;

export default function initSettingsProfile() {
  document.querySelectorAll("#mpdResidencyComingSoonModal").forEach((m) => {
    const sm = document.getElementById("settingsMain");
    if (sm && !sm.contains(m)) m.remove();
  });
  document.querySelectorAll("#mpdMembershipCancelModal").forEach((m) => {
    const sm = document.getElementById("settingsMain");
    if (sm && !sm.contains(m)) m.remove();
  });
  wireMpdResidencyComingSoonModal();
  wireMpdMembershipCancelModal();

  /** @type {'en'|'ja'} */
  let activeLocale = "en";
  /** @type {Record<string, unknown> | null} */
  let localesState = null;
  let heroImageUrl = "";
  let heroProfileImageUrl = "";
  let profileAudioUrl = "";
  let adminPreviewBypassEnabled = false;
  /** @type {string} */
  let baselineSnapshot = "";
  /** @type {string} */
  let profileSlug = "";
  /** @type {string} */
  let currentArtistId = "";

  const statusEl = document.getElementById("settingsProfileStatus");
  const formWrap = document.getElementById("settingsProfileFormWrap");

  const setStatus = (t) => {
    if (statusEl) statusEl.textContent = t || "";
  };

  const setAdminBypassVisible = (visible) => {
    const btn = document.getElementById("settingsProfileAdminBypass");
    if (!btn) return;
    if (visible) {
      btn.style.display = "";
      btn.removeAttribute("hidden");
    } else {
      btn.style.display = "none";
      btn.setAttribute("hidden", "");
    }
  };

  const bootstrapAdminPreviewForm = () => {
    localesState = { en: {}, ja: {} };
    activeLocale = "en";
    heroImageUrl = "";
    heroProfileImageUrl = "";
    profileAudioUrl = "";
    profileSlug = "";
    currentArtistId = "";
    fillFormFromLocales(
      /** @type {Record<string, unknown>} */ (localesState),
      activeLocale,
    );
    setVal("mpd_profile_visibility", "inactive");
    setVal("mpd_hero_url", "");
    setVal("mpd_hero_profile_url", "");
    setVal("mpd_audio_url", "");
    setVal("mpd_audio_title", "");
    refreshBaseline();
    if (formWrap) formWrap.removeAttribute("hidden");
  };

  let worldGenRunning = false;

  /**
   * After-save: fill empty world fields only (live IC).
   */
  const runMemberWorldGenerationAfterSave = async () => {
    if (getDataSource() === "test") {
      setStatus("Saved.");
      return;
    }
    setStatus("Generating story & world…");
    try {
      const rec = await getMyArtistRecord();
      const row = artistRowFromMyArtistRecord(rec);
      if (!row) throw new Error("Could not load profile for world generation.");
      await generateAndUpdateMyArtistWorldFromBio(row, "fillEmpty");
      const fresh = await getMyArtistRecord();
      if (!fresh) throw new Error("Could not reload profile after world generation.");
      const ljRaw = fresh.locales_json ?? fresh.localesJson;
      const json = typeof ljRaw === "string" ? ljRaw : "";
      try {
        localesState = json ? JSON.parse(json) : { en: {}, ja: {} };
      } catch {
        localesState = { en: {}, ja: {} };
      }
      if (!localesState || typeof localesState !== "object")
        localesState = { en: {}, ja: {} };
      fillFormFromLocales(
        /** @type {Record<string, unknown>} */ (localesState),
        activeLocale,
      );
      refreshBaseline();
      setStatus("Saved.");
    } catch (e) {
      setStatus(
        e instanceof Error ? e.message : String(e),
      );
    }
  };

  /**
   * Story panel: manual generate (optional overwrite).
   */
  const runMemberWorldFromToolbar = async () => {
    if (getDataSource() === "test") {
      setStatus(
        "World generation needs Live data (IC backend LLM). Switch data source or use a deployed build.",
      );
      return;
    }
    if (worldGenRunning) return;
    const btn = document.getElementById("mpd_gen_world_btn");
    const ov = /** @type {HTMLInputElement | null} */ (
      document.getElementById("mpd_gen_world_overwrite")
    );
    worldGenRunning = true;
    if (btn) btn.disabled = true;
    setStatus("Generating story & world…");
    try {
      const rec = await getMyArtistRecord();
      const row = artistRowFromMyArtistRecord(rec);
      if (!row) throw new Error("Could not load profile for world generation.");
      const mode = ov?.checked ? "overwrite" : "fillEmpty";
      await generateAndUpdateMyArtistWorldFromBio(row, mode);
      const fresh = await getMyArtistRecord();
      if (!fresh) throw new Error("Could not reload profile after world generation.");
      const ljRaw = fresh.locales_json ?? fresh.localesJson;
      const json = typeof ljRaw === "string" ? ljRaw : "";
      try {
        localesState = json ? JSON.parse(json) : { en: {}, ja: {} };
      } catch {
        localesState = { en: {}, ja: {} };
      }
      if (!localesState || typeof localesState !== "object")
        localesState = { en: {}, ja: {} };
      fillFormFromLocales(
        /** @type {Record<string, unknown>} */ (localesState),
        activeLocale,
      );
      refreshBaseline();
      setStatus("Story & world updated.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      worldGenRunning = false;
      if (btn) btn.disabled = false;
    }
  };

  const closeSettingsProfileMobileNav = () => {
    const spr = document.getElementById("mpd_root");
    if (!spr || typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 768px)").matches) return;
    spr.dataset.navOpen = "false";
    const bd = document.getElementById("settingsProfileNavBackdrop");
    if (bd) {
      bd.hidden = true;
      bd.setAttribute("aria-hidden", "true");
    }
    const menuBtn = document.getElementById("settingsProfileMenuBtn");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
    try {
      document.body.style.overflow = "";
    } catch {
      /* ignore */
    }
  };

  /**
   * Membership panel: Stripe summary + canister account fields.
   */
  const hydrateMembershipPanel = async () => {
    const errEl = document.getElementById("mpd_membership_error");
    const schedEl = document.getElementById("mpd_membership_scheduled_cancel");
    const exemptNote = document.getElementById("mpd_membership_exempt_note");
    const includedList = document.getElementById("mpd_membership_included_list");
    const cancelWrap = document.getElementById("mpd_membership_cancel_wrap");
    const rowBilling = document.getElementById("mpd_membership_row_billing");
    const rowPayment = document.getElementById("mpd_membership_row_payment");
    const pmUpdate = document.getElementById("mpd_membership_pm_update");
    const badge = document.getElementById("mpd_membership_badge");
    const badgeLabel = document.getElementById("mpd_membership_badge_label");
    const badgeLine = document.getElementById("mpd_membership_badge_line");
    const planName = document.getElementById("mpd_membership_plan_name");
    const planPrice = document.getElementById("mpd_membership_plan_price");
    const renewalDate = document.getElementById("mpd_membership_renewal_date");
    const renewalRel = document.getElementById("mpd_membership_renewal_relative");
    const pmBrand = document.getElementById("mpd_membership_pm_brand");
    const pmLast4 = document.getElementById("mpd_membership_pm_last4");
    const cancelBtn = document.getElementById("mpd_membership_cancel_btn");

    const setBadgeVariant = (variant) => {
      if (!badge) return;
      badge.className = "mpd-membership-badge";
      if (variant === "ok") badge.classList.add("mpd-membership-badge--ok");
      else if (variant === "warn") badge.classList.add("mpd-membership-badge--warn");
      else badge.classList.add("mpd-membership-badge--muted");
    };

    /** @type {string[]} */
    const bullets = [
      "Application submission",
      "Profile on the public site",
      "Member benefits and updates",
    ];
    try {
      const g = await getApplicationPaymentGlobal();
      const en = g?.en?.whatsIncludedBullets;
      if (Array.isArray(en) && en[0] && String(en[0]).trim())
        bullets[0] = String(en[0]).trim();
    } catch {
      /* ignore */
    }
    if (includedList) {
      includedList.replaceChildren();
      for (const b of bullets) {
        const li = document.createElement("li");
        li.className = "mpd-membership-checklist__item";
        li.textContent = b;
        includedList.appendChild(li);
      }
    }

    if (errEl) {
      errEl.hidden = true;
      errEl.textContent = "";
    }
    if (schedEl) {
      schedEl.hidden = true;
      schedEl.textContent = "";
    }

    if (getDataSource() === "test") {
      if (exemptNote) exemptNote.hidden = true;
      if (cancelWrap) cancelWrap.style.display = "";
      if (rowBilling) rowBilling.style.display = "";
      if (rowPayment) rowPayment.style.display = "";
      if (pmUpdate) pmUpdate.style.display = "";
      setBadgeVariant("ok");
      if (badgeLabel) badgeLabel.textContent = "Active";
      if (badgeLine)
        badgeLine.textContent =
          "Your membership is active and in good standing. (Test mode — sample data.)";
      if (planName) planName.textContent = "Application + Subscription";
      if (planPrice) planPrice.textContent = "$50 every 2 months";
      if (renewalDate) renewalDate.textContent = "July 12, 2025";
      if (renewalRel) renewalRel.textContent = "In 28 days";
      if (pmBrand) pmBrand.textContent = "VISA";
      if (pmLast4) pmLast4.textContent = "•••• 4242";
      if (cancelBtn) cancelBtn.disabled = false;
      return;
    }

    const snap = await getAuthSnapshot();
    if (!snap.authenticated) return;

    const acc = await getAccountForCaller();
    const accObj =
      acc && typeof acc === "object"
        ? /** @type {Record<string, unknown>} */ (acc)
        : null;
    const exempt = Boolean(
      accObj?.membershipExemptManual ?? accObj?.membership_exempt_manual,
    );

    if (rowBilling) rowBilling.style.display = "";
    if (rowPayment) rowPayment.style.display = "";
    if (pmUpdate) pmUpdate.style.display = "";
    if (cancelWrap) cancelWrap.style.display = "";
    if (exemptNote) exemptNote.hidden = true;

    if (exempt) {
      if (exemptNote) {
        exemptNote.hidden = false;
        exemptNote.textContent =
          "Your membership is complimentary. Stripe billing and self-service cancellation are not required.";
      }
      if (cancelWrap) cancelWrap.style.display = "none";
      if (rowBilling) rowBilling.style.display = "none";
      if (rowPayment) rowPayment.style.display = "none";
      if (pmUpdate) pmUpdate.style.display = "none";
      setBadgeVariant("ok");
      if (badgeLabel) badgeLabel.textContent = "Active";
      if (badgeLine)
        badgeLine.textContent = "Your membership is active (complimentary).";
      if (planName) planName.textContent = "Fusion member";
      if (planPrice) planPrice.textContent = "—";
      const pe = mpdAccountStringField(
        accObj,
        "stripeCurrentPeriodEnd",
        "stripe_current_period_end",
      );
      if (renewalDate)
        renewalDate.textContent = pe ? mpdFormatLongDate(pe) : "—";
      if (renewalRel) renewalRel.textContent = pe ? mpdRelativeDaysFromIso(pe) : "";
      if (pmBrand) pmBrand.textContent = "";
      if (pmLast4) pmLast4.textContent = "—";
      return;
    }

    const principal = snap.principal.toText();
    const stripeStatus = mpdAccountStringField(
      accObj,
      "stripeSubscriptionStatus",
      "stripe_subscription_status",
    );
    const periodCanister = mpdAccountStringField(
      accObj,
      "stripeCurrentPeriodEnd",
      "stripe_current_period_end",
    );

    const integrationApi = await import("../utils/integrationApi.js");
    const summary = await integrationApi.fetchMemberBillingSummary(principal);

    /** @type {Record<string, unknown>} */
    const s = summary && typeof summary === "object" ? summary : {};
    const ok = Boolean(s.ok);
    const statusRaw = ok && s.status != null ? String(s.status) : stripeStatus;
    const periodEnd =
      ok && typeof s.currentPeriodEnd === "string" && s.currentPeriodEnd.trim()
        ? String(s.currentPeriodEnd).trim()
        : periodCanister;
    const cancelAtEnd = ok && Boolean(s.cancelAtPeriodEnd);
    const planL =
      ok && typeof s.planLabel === "string" && s.planLabel.trim()
        ? String(s.planLabel).trim()
        : "Application + Subscription";
    const planP =
      ok && typeof s.planPriceLine === "string" && s.planPriceLine.trim()
        ? String(s.planPriceLine).trim()
        : "—";
    /** @type {{ brand?: string, last4?: string } | null} */
    let pm = null;
    if (ok && s.paymentMethod && typeof s.paymentMethod === "object") {
      pm = /** @type {{ brand?: string, last4?: string }} */ (s.paymentMethod);
    }

    if (!ok && s.reason && String(s.reason) !== "no_integration_url") {
      if (errEl) {
        errEl.hidden = false;
        errEl.textContent =
          "Billing details could not be loaded from the payment service. Showing your Fusion account status; use Refresh subscription status or check Studio → Services.";
      }
    }

    const st = String(statusRaw || "").toLowerCase();
    if (badgeLabel) badgeLabel.textContent = mpdMembershipStatusLabel(statusRaw);

    let lineCopy = "Your membership status could not be determined.";
    if (st === "active" || st === "trialing") {
      lineCopy = "Your membership is active and in good standing.";
      setBadgeVariant("ok");
    } else if (st === "past_due" || st === "unpaid") {
      lineCopy =
        "Payment needs attention — update your card or billing in the portal to stay active.";
      setBadgeVariant("warn");
    } else if (st === "canceled" || st === "cancelled") {
      lineCopy = "This subscription is no longer active.";
      setBadgeVariant("muted");
    } else if (!st) {
      lineCopy =
        "No Stripe subscription is linked yet. If you recently paid, use Refresh subscription status or complete Join.";
      setBadgeVariant("muted");
    } else {
      setBadgeVariant("muted");
    }
    if (badgeLine) badgeLine.textContent = lineCopy;

    if (planName) planName.textContent = planL;
    if (planPrice) planPrice.textContent = planP;

    if (renewalDate)
      renewalDate.textContent = periodEnd ? mpdFormatLongDate(periodEnd) : "—";
    if (renewalRel)
      renewalRel.textContent = periodEnd ? mpdRelativeDaysFromIso(periodEnd) : "";

    if (pmBrand) {
      const br = pm?.brand ? String(pm.brand).toUpperCase() : "";
      pmBrand.textContent = br;
    }
    if (pmLast4) {
      const l4 = pm?.last4 ? String(pm.last4) : "";
      pmLast4.textContent = l4 ? `•••• ${l4}` : "—";
    }

    if (schedEl && cancelAtEnd && periodEnd) {
      schedEl.hidden = false;
      schedEl.textContent = `Cancellation scheduled — access continues until ${mpdFormatLongDate(periodEnd)}.`;
    }

    if (cancelBtn) {
      const hasSub =
        Boolean(st) ||
        (ok && typeof s.subscriptionId === "string" && s.subscriptionId.trim());
      const dis =
        cancelAtEnd ||
        st === "canceled" ||
        st === "cancelled" ||
        !hasSub;
      cancelBtn.disabled = Boolean(dis);
    }
  };

  const validMpdPanels = () => {
    /** @type {string[]} */
    const keys = ["overview", "location", "story", "links", "programs", "membership"];
    if (DEV_MODE) keys.push("dev");
    return keys;
  };

  /**
   * @param {string} key
   */
  const applyMpdPanelChrome = (panelKey) => {
    const shoutEl = document.getElementById("settingsProfileShout");
    const hintEl = document.getElementById("settingsProfileHint");
    const allowed = new Set(validMpdPanels());
    const k = allowed.has(panelKey) ? panelKey : "overview";
    const c = MPD_PANEL_CHROME[k] ?? MPD_PANEL_CHROME.overview;
    if (shoutEl) shoutEl.innerHTML = c.shoutHtml;
    if (hintEl) hintEl.textContent = c.hint;
  };

  const showMpdPanel = (key) => {
    const allowed = new Set(validMpdPanels());
    const k = allowed.has(key) ? key : "overview";
    document.querySelectorAll("#mpd_root .mpd-panel").forEach((p) => {
      const id = p.getAttribute("data-mpd-panel");
      if (!id) return;
      p.hidden = id !== k;
    });
    document.querySelectorAll("#mpd_root .mpd-nav-btn").forEach((b) => {
      const id = b.getAttribute("data-mpd-panel");
      if (id) b.classList.toggle("is-active", id === k);
    });
    applyMpdPanelChrome(k);
    closeSettingsProfileMobileNav();
    if (k === "membership") void hydrateMembershipPanel();
    try {
      if (
        typeof history !== "undefined" &&
        history.replaceState &&
        typeof window !== "undefined"
      ) {
        const path = window.location.pathname + window.location.search;
        history.replaceState(null, "", `${path}#${k}`);
      }
    } catch (_) {
      /* ignore */
    }
  };

  const panelKeyFromHash = () => {
    let h = (
      typeof window !== "undefined" && window.location.hash
        ? window.location.hash
        : "#overview"
    )
      .replace(/^#/, "")
      .toLowerCase();
    /** @type {Record<string, string>} */
    const legacy = {
      "mpd-overview": "overview",
      "mpd-media": "overview",
      "mpd-basics": "location",
      "mpd-story": "story",
      "mpd-links": "links",
      "mpd-seo": "overview",
      "mpd-programs": "programs",
      "mpd-membership": "membership",
      "mpd-dev": "dev",
    };
    h = legacy[h] || h;
    const allowed = new Set(validMpdPanels());
    return allowed.has(h) ? h : "overview";
  };

  const isDirty = () => {
    if (!localesState) return false;
    const merged = readLocalesFromDom(localesState, activeLocale, getVal);
    const cur = snapshotState(
      merged,
      activeLocale,
      getVal("mpd_hero_url").trim(),
      normalizeArtistRosterVisibility(getVal("mpd_profile_visibility").trim() || "public"),
      {
        profileQuote: getVal("mpd_profile_quote").trim(),
        audioUrl: getVal("mpd_audio_url").trim(),
        audioTitle: getVal("mpd_audio_title").trim(),
        heroProfileUrl: getVal("mpd_hero_profile_url").trim(),
      },
    );
    return cur !== baselineSnapshot;
  };

  const refreshBaseline = () => {
    if (!localesState) return;
    const merged = readLocalesFromDom(localesState, activeLocale, getVal);
    heroImageUrl = getVal("mpd_hero_url").trim();
    heroProfileImageUrl = getVal("mpd_hero_profile_url").trim();
    const vis = normalizeArtistRosterVisibility(
      getVal("mpd_profile_visibility").trim() || "public",
    );
    baselineSnapshot = snapshotState(merged, activeLocale, heroImageUrl, vis, {
      profileQuote: getVal("mpd_profile_quote").trim(),
      audioUrl: getVal("mpd_audio_url").trim(),
      audioTitle: getVal("mpd_audio_title").trim(),
      heroProfileUrl: heroProfileImageUrl,
    });
  };

  const saveProfileFromDom = async () => {
    if (adminPreviewBypassEnabled) {
      setStatus(
        "Admin preview bypass is active. This mode is view/edit preview only and cannot save to a linked profile.",
      );
      return;
    }
    if (!localesState) return;
    setStatus("Saving…");
    try {
      const recBeforeSave = await getMyArtistRecord();
      const pBefore = recBeforeSave?.profile;
      const priorVis =
        pBefore && typeof pBefore === "object"
          ? normalizeArtistRosterVisibility(/** @type {Record<string, unknown>} */(pBefore).visibility)
          : "inactive";
      localesState = readLocalesFromDom(
        /** @type {Record<string, unknown>} */ (localesState),
        activeLocale,
        getVal,
      );
      localesState = syncIntroGalleryToAllLocales(
        /** @type {Record<string, unknown>} */ (localesState),
        activeLocale,
      );
      const merged = normalizeLocalesWorldForStorage(
        /** @type {Record<string, unknown>} */ (localesState),
      );
      localesState = merged;
      const ts = new Date().toISOString();
      const heroUrl = getVal("mpd_hero_url").trim();
      const heroProfileUrl = getVal("mpd_hero_profile_url").trim();
      const profileQuote = getVal("mpd_profile_quote").trim();
      const audioUrl = getVal("mpd_audio_url").trim();
      const audioTitle = getVal("mpd_audio_title").trim();
      await updateMyArtistLocalesJson(JSON.stringify(merged), ts);
      await updateMyArtistProfilePatch(heroUrl, ts);
      await updateMyArtistHeroProfileImagePatch(heroProfileUrl, ts);
      await updateMyArtistQuoteAudioPatch(
        { quote: profileQuote, audioUrl, audioTitle },
        ts,
      );
      const visPicked = normalizeArtistRosterVisibility(
        getVal("mpd_profile_visibility").trim() || "public",
      );
      const vis = priorVis === "inactive" ? "pending" : visPicked;
      await updateMyArtistVisibility(vis, ts);
      if (vis !== visPicked && visPicked === "inactive") {
        setVal("mpd_profile_visibility", "pending");
      } else {
        setVal("mpd_profile_visibility", vis);
      }
      try {
        window.dispatchEvent(
          new CustomEvent("fusion-roster-visibility-updated", { detail: { visibility: vis } }),
        );
      } catch {
        /* ignore */
      }
      heroImageUrl = heroUrl;
      heroProfileImageUrl = heroProfileUrl;
      profileAudioUrl = audioUrl;
      const en = merged.en && typeof merged.en === "object" ? merged.en : {};
      const prefSlug = publicSlugFromEnglishFirstLast(
        String(en.firstName ?? ""),
        String(en.lastName ?? ""),
      );
      let slugSaveFailed = false;
      if (prefSlug) {
        try {
          const finalSlug = await updateMyArtistPublicSlug(prefSlug);
          profileSlug = finalSlug;
          const vu = document.getElementById("mpd_view_profile");
          if (vu && vu instanceof HTMLAnchorElement) {
            vu.href = `/profile/${encodeURIComponent(finalSlug)}`;
          }
          const side = document.getElementById("mpd_sidebar_slug");
          if (side) side.textContent = finalSlug ? `/${finalSlug}` : "—";
        } catch (slugErr) {
          slugSaveFailed = true;
          setStatus(
            `${slugErr instanceof Error ? slugErr.message : String(slugErr)} (Other changes were saved.)`,
          );
        }
      }
      refreshBaseline();
      if (!slugSaveFailed) {
        posthog.capture("profile_settings_saved");
        await runMemberWorldGenerationAfterSave();
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  };

  const updateHeroPreview = () => {
    const u = getVal("mpd_hero_url").trim();
    const heroPrev = /** @type {HTMLImageElement | null} */ (
      document.getElementById("mpd_hero_preview")
    );
    if (!heroPrev) return;
    if (!u) {
      setHeroSpinnerVisible(false);
      heroPrev.removeAttribute("src");
      heroPrev.style.display = "none";
      return;
    }
    setHeroSpinnerVisible(true);
    heroPrev.style.display = "none";
    heroPrev.onload = () => {
      setHeroSpinnerVisible(false);
      heroPrev.style.display = "block";
      heroPrev.onload = null;
      heroPrev.onerror = null;
    };
    heroPrev.onerror = () => {
      setHeroSpinnerVisible(false);
      heroPrev.onload = null;
      heroPrev.onerror = null;
    };
    heroPrev.src = u;
    if (heroPrev.complete && heroPrev.naturalHeight > 0) {
      setHeroSpinnerVisible(false);
      heroPrev.style.display = "block";
      heroPrev.onload = null;
      heroPrev.onerror = null;
    }
  };

  const updateHeroProfilePreview = () => {
    const u = getVal("mpd_hero_profile_url").trim();
    const prev = /** @type {HTMLImageElement | null} */ (
      document.getElementById("mpd_hero_profile_preview")
    );
    if (!prev) return;
    if (!u) {
      setHeroProfileSpinnerVisible(false);
      prev.removeAttribute("src");
      prev.style.display = "none";
      return;
    }
    setHeroProfileSpinnerVisible(true);
    prev.style.display = "none";
    prev.onload = () => {
      setHeroProfileSpinnerVisible(false);
      prev.style.display = "block";
      prev.onload = null;
      prev.onerror = null;
    };
    prev.onerror = () => {
      setHeroProfileSpinnerVisible(false);
      prev.onload = null;
      prev.onerror = null;
    };
    prev.src = u;
    if (prev.complete && prev.naturalHeight > 0) {
      setHeroProfileSpinnerVisible(false);
      prev.style.display = "block";
      prev.onload = null;
      prev.onerror = null;
    }
  };

  const rootEl = document.getElementById("mpd_root");
  if (rootEl && !rootEl.dataset.mpdDelegated) {
    rootEl.dataset.mpdDelegated = "1";
    rootEl.addEventListener("click", (e) => {
      const navBtn =
        e.target && /** @type {Element} */ (e.target).closest?.(".mpd-nav-btn");
      if (navBtn && rootEl.contains(navBtn)) {
        e.preventDefault();
        const k = navBtn.getAttribute("data-mpd-panel");
        if (k) showMpdPanel(k);
        return;
      }
      const saveBtn =
        e.target &&
        /** @type {Element} */ (e.target).closest?.(".mpd-section-save");
      if (saveBtn && rootEl.contains(saveBtn)) {
        e.preventDefault();
        void saveProfileFromDom();
        return;
      }
      const genWorldBtn = /** @type {Element | null} */ (
        e.target && /** @type {Element} */ (e.target).closest?.("#mpd_gen_world_btn")
      );
      if (genWorldBtn && rootEl.contains(genWorldBtn)) {
        e.preventDefault();
        void runMemberWorldFromToolbar();
        return;
      }
      const t = e.target;
      if (t && "id" in t && t.id === "mpd_apply_residency") {
        e.preventDefault();
        const btn = /** @type {HTMLButtonElement} */ (t);
        if (btn.dataset.applyOpen === "false") {
          openMpdResidencyComingSoonModal();
          return;
        }
        const path = btn.dataset.programPath || MPD_APPLY_PROGRAM_PATH;
        navigate(path.startsWith("/") ? path : `/${path}`);
        return;
      }
      if (t && "id" in t && t.id === "mpd_links_add") {
        const cur = readLinksFromContainer("#mpd-links");
        cur.push({ type: "website", url: "", label: "" });
        renderLinkRows(cur);
      }
    });
    rootEl.addEventListener("change", async (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement)) return;
      if (t.id === "mpd_hero_file" && t.files?.[0]) {
        const f = t.files[0];
        try {
          assertMpdImageSizeOk(f);
        } catch (err) {
          setStatus(err instanceof Error ? err.message : String(err));
          t.value = "";
          return;
        }
        setHeroSpinnerVisible(true);
        try {
          setStatus("Uploading hero…");
          const url = await uploadBlobToS3(f, null, {
            area: "account/profile",
            entityType: "artist",
            entityId: currentArtistId || profileSlug || "me",
            fieldKey: "hero",
          });
          setVal("mpd_hero_url", url);
          heroImageUrl = url;
          updateHeroPreview();
          setStatus("");
        } catch (err) {
          setHeroSpinnerVisible(false);
          setStatus(err instanceof Error ? err.message : String(err));
        }
        t.value = "";
        return;
      }
      if (t.id === "mpd_hero_profile_file" && t.files?.[0]) {
        const f = t.files[0];
        try {
          assertMpdImageSizeOk(f);
        } catch (err) {
          setStatus(err instanceof Error ? err.message : String(err));
          t.value = "";
          return;
        }
        setHeroProfileSpinnerVisible(true);
        try {
          setStatus("Uploading profile image…");
          const url = await uploadBlobToS3(f, null, {
            area: "account/profile",
            entityType: "artist",
            entityId: currentArtistId || profileSlug || "me",
            fieldKey: "heroProfile",
          });
          setVal("mpd_hero_profile_url", url);
          heroProfileImageUrl = url;
          updateHeroProfilePreview();
          setStatus("");
        } catch (err) {
          setHeroProfileSpinnerVisible(false);
          setStatus(err instanceof Error ? err.message : String(err));
        }
        t.value = "";
        return;
      }
      if (t.id === "mpd_audio_file" && t.files?.[0]) {
        const f = t.files[0];
        try {
          setStatus("Uploading audio…");
          const url = await uploadBlobToS3(f, null, {
            area: "account/profile",
            entityType: "artist",
            entityId: currentArtistId || profileSlug || "me",
            fieldKey: "audio",
          });
          setVal("mpd_audio_url", url);
          profileAudioUrl = url;
          setStatus("");
        } catch (err) {
          setStatus(err instanceof Error ? err.message : String(err));
        }
        t.value = "";
        return;
      }
      const slot = t.getAttribute("data-intro-slot");
      if (slot != null && t.files?.[0]) {
        const i = Number(slot);
        const f = t.files[0];
        try {
          assertMpdImageSizeOk(f);
        } catch (err) {
          setStatus(err instanceof Error ? err.message : String(err));
          t.value = "";
          return;
        }
        setIntroSpinnerVisible(i, true);
        try {
          setStatus("Uploading…");
          const url = await uploadBlobToS3(f, null, {
            area: "account/profile",
            entityType: "artist",
            entityId: currentArtistId || profileSlug || "me",
            fieldKey: `intro-${i}`,
          });
          setVal(`mpd_intro_${i}_src`, url);
          const th = /** @type {HTMLImageElement | null} */ (
            document.getElementById(`mpd_intro_${i}_thumb`)
          );
          if (th) {
            th.style.display = "none";
            th.onload = () => {
              setIntroSpinnerVisible(i, false);
              th.style.display = "block";
              th.onload = null;
              th.onerror = null;
            };
            th.onerror = () => {
              setIntroSpinnerVisible(i, false);
              th.onload = null;
              th.onerror = null;
            };
            th.src = url;
            if (th.complete && th.naturalHeight > 0) {
              setIntroSpinnerVisible(i, false);
              th.style.display = "block";
              th.onload = null;
              th.onerror = null;
            }
          } else {
            setIntroSpinnerVisible(i, false);
          }
          setStatus("");
        } catch (err) {
          setIntroSpinnerVisible(i, false);
          setStatus(err instanceof Error ? err.message : String(err));
        }
        t.value = "";
      }
    });
  }

  const sprRoot = document.getElementById("mpd_root");
  if (sprRoot && !sprRoot.dataset.settingsStudioUi) {
    sprRoot.dataset.settingsStudioUi = "1";
    const NAV_DRAWER_MQ = "(max-width: 768px)";
    const mq =
      typeof window.matchMedia === "function"
        ? window.matchMedia(NAV_DRAWER_MQ)
        : null;
    const setNavOpen = (open) => {
      sprRoot.dataset.navOpen = open ? "true" : "false";
      const backdrop = document.getElementById("settingsProfileNavBackdrop");
      if (backdrop) {
        backdrop.hidden = !open;
        backdrop.setAttribute("aria-hidden", open ? "false" : "true");
      }
      const menuBtn = document.getElementById("settingsProfileMenuBtn");
      if (menuBtn) {
        menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      }
      if (open && mq?.matches) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    };
    document
      .getElementById("settingsProfileMenuBtn")
      ?.addEventListener("click", () => {
        const open = sprRoot.dataset.navOpen !== "true";
        setNavOpen(open);
      });
    document
      .getElementById("settingsProfileNavBackdrop")
      ?.addEventListener("click", () => setNavOpen(false));
    mq?.addEventListener("change", (e) => {
      if (!e.matches) setNavOpen(false);
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && sprRoot.dataset.navOpen === "true")
        setNavOpen(false);
    });
    document
      .getElementById("settingsProfileWordmark")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        navigate("/");
      });
    document
      .getElementById("settingsProfileBackBtn")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.assign("/");
      });
  }

  const contactRoot = document.getElementById("settingsProfileNavContact");
  if (contactRoot && contactRoot.dataset.mpdContactWired !== "1") {
    contactRoot.dataset.mpdContactWired = "1";
    document
      .getElementById("settingsProfileNavContactSend")
      ?.addEventListener("click", async () => {
        const msgEl = document.getElementById(
          "settingsProfileNavContactMessage",
        );
        const statusEl = document.getElementById(
          "settingsProfileNavContactStatus",
        );
        const text = String(msgEl?.value || "").trim();
        if (!text) {
          if (statusEl) statusEl.textContent = "Enter a message.";
          return;
        }
        if (statusEl) statusEl.textContent = "Sending…";
        try {
          const { sendEmail } = await import("../utils/integrationApi.js");
          const { DEFAULT_APPLICATION_STAFF_EMAIL } =
            await import("../utils/studioServicesConfig.js");
          const snap = await getAuthSnapshot();
          const fn = getVal("mpd_first_name").trim();
          const ln = getVal("mpd_last_name").trim();
          let displayName = [fn, ln].filter(Boolean).join(" ").trim();
          if (!displayName && localesState) {
            const en = localeBlock(
              /** @type {Record<string, unknown>} */ (localesState),
              "en",
            );
            displayName = String(en.name ?? "").trim();
          }
          let emailLine = "n/a";
          try {
            const acc = await getAccountForCaller();
            if (acc && typeof acc === "object") {
              const raw =
                /** @type {Record<string, unknown>} */ (acc).email ??
                /** @type {Record<string, unknown>} */ (acc).emailAddress;
              if (raw != null && String(raw).trim())
                emailLine = String(raw).trim();
            }
          } catch {
            /* ignore */
          }
          if (emailLine === "n/a") {
            const draft = getProfileSetupDraft();
            if (draft.email && String(draft.email).trim())
              emailLine = String(draft.email).trim();
          }
          const principalText =
            snap.authenticated && snap.principal
              ? snap.principal.toText()
              : "n/a";
          const tail =
            principalText.length > 6
              ? principalText.slice(-6)
              : principalText;
          const origin =
            typeof window !== "undefined" ? window.location.origin : "";
          const slug = profileSlug || "";
          const profileUrl =
            slug && origin ? `${origin}/profile/${encodeURIComponent(slug)}` : "n/a";
          const header = [
            `Name: ${displayName || "n/a"}`,
            `Email: ${emailLine}`,
            `Principal: ${principalText}`,
            `Profile: ${profileUrl}`,
            "",
          ].join("\n");
          const subjName = displayName
            ? displayName.slice(0, 48)
            : `…${tail}`;
          await sendEmail({
            to: DEFAULT_APPLICATION_STAFF_EMAIL,
            subject: `[Fusion Profile settings] Message — ${subjName}`,
            text: `${header}${text}`,
          });
          if (statusEl)
            statusEl.textContent = "Sent. We will get back to you soon.";
          if (msgEl) msgEl.value = "";
        } catch (e) {
          if (statusEl)
            statusEl.textContent = e instanceof Error ? e.message : String(e);
        }
      });
  }

  const load = async () => {
    setStatus("");
    const membershipActionsEl = document.getElementById(
      "settingsProfileMembershipActions",
    );
    setAdminBypassVisible(false);
    if (membershipActionsEl) {
      membershipActionsEl.style.display = "none";
      membershipActionsEl.setAttribute("hidden", "");
    }

    const snap = await getAuthSnapshot();
    const isTest = getDataSource() === "test";

    const testPicker = document.getElementById("settingsTestPicker");
    const testSelect = /** @type {HTMLSelectElement | null} */ (
      document.getElementById("settingsTestArtistSelect")
    );
    if (isTest && testPicker && testSelect) {
      testPicker.style.display = "";
      testSelect.replaceChildren();
      const opt0 = document.createElement("option");
      opt0.value = "";
      opt0.textContent = "— Select artist —";
      testSelect.appendChild(opt0);
      const artists = await getArtists();
      for (const a of artists) {
        const o = document.createElement("option");
        o.value = String(a.id);
        o.textContent = `${a.locales?.en?.name || a.slug || a.id} (${a.slug})`;
        testSelect.appendChild(o);
      }
      const cur = getProfileSettingsDevArtistId();
      if (cur) testSelect.value = cur;
      testSelect.onchange = () => {
        setProfileSettingsDevArtistId(testSelect.value || null);
        void load();
      };
    } else if (testPicker) {
      testPicker.style.display = "none";
    }

    const acc = await getAccountForCaller();
    const accForUi = await getEffectiveAccountForSettingsUi(acc);
    const dashTitle = dashboardTitleFromAccount(accForUi);
    const headingEl = document.getElementById("settingsProfileHeading");
    const sideRoleEl = document.getElementById("settingsProfileSidebarRole");
    const avatarEl = document.getElementById("settingsProfileAvatar");
    if (headingEl) headingEl.textContent = dashTitle;
    if (sideRoleEl) sideRoleEl.textContent = sidebarRoleLabel(accForUi);
    if (avatarEl) {
      const lab = sidebarRoleLabel(accForUi);
      avatarEl.textContent = lab ? lab.charAt(0).toUpperCase() : "U";
    }

    const hint = document.getElementById("settingsProfileHint");
    if (!isTest && !snap.authenticated) {
      if (hint)
        hint.textContent =
          "Sign in with Internet Identity to edit your profile.";
      if (formWrap) formWrap.setAttribute("hidden", "");
      applySettingsProfileDocumentSeo(dashTitle);
      return;
    }

    if (isTest && !getProfileSettingsDevArtistId()) {
      setStatus("Creating a local profile for this session…");
      await ensureMyLinkedArtistProfile();
      setStatus("");
    }

    let adminViewingMemberPerspective = false;
    let adminPerspectiveGateResult = "";
    if (!isTest && snap.authenticated) {
      const perspective = getAdminPerspective();
      const memberPerspective =
        perspective !== "admin" && perspective !== "staff";
      if (memberPerspective) {
        // Perspective switching is an admin tool; trust selected member perspective for preview gating.
        adminViewingMemberPerspective = true;
      } else {
        const adminCaller = await isRealAdminCaller();
        adminViewingMemberPerspective = adminCaller && memberPerspective;
      }
    }

    if (!isTest && snap.authenticated && !adminViewingMemberPerspective) {
      const ens = await ensureMyLinkedArtistProfile();
      if (ens === "noAccount" && !acc) {
        if (hint) {
          hint.textContent =
            "No member account found. You are signed in, so complete your profile setup, then return to this page.";
        }
        if (formWrap) formWrap.setAttribute("hidden", "");
        applySettingsProfileDocumentSeo(dashTitle);
        return;
      }
      if (ens === "needsSubscription") {
        const recSub = await getMyArtistRecord();
        if (!recSub) {
          if (hint) {
            hint.textContent =
              "Your account does not show an active membership yet. If you already paid, finish linking your payment to this Internet Identity login (Join), or refresh status from Stripe.";
          }
          if (membershipActionsEl) {
            membershipActionsEl.style.display = "flex";
            membershipActionsEl.removeAttribute("hidden");
          }
          if (formWrap) formWrap.setAttribute("hidden", "");
          applySettingsProfileDocumentSeo(dashTitle);
          return;
        }
      }
    }

    let rec = await getMyArtistRecord();
    if (!rec && adminViewingMemberPerspective && !isTest) {
      try {
        adminPerspectiveGateResult = await ensureMyLinkedArtistProfile();
      } catch {
        adminPerspectiveGateResult = "";
      }
      rec = await getMyArtistRecord();
    }
    if (!rec) {
      if (adminViewingMemberPerspective) {
        if (hint) {
          hint.textContent =
            "Admin perspective preview could not find a linked artist profile. Use Admin preview bypass to load editable fields for perspective testing.";
        }
        if (membershipActionsEl) {
          membershipActionsEl.style.display = "flex";
          membershipActionsEl.removeAttribute("hidden");
        }
        setAdminBypassVisible(
          adminPerspectiveGateResult === "needsSubscription" ||
            adminPerspectiveGateResult === "noAccount" ||
            adminPerspectiveGateResult === "",
        );
        if (adminPreviewBypassEnabled) {
          bootstrapAdminPreviewForm();
          setStatus(
            "Admin preview bypass active. Fields are loaded without account/membership gating.",
          );
          applySettingsProfileDocumentSeo(dashTitle);
          return;
        }
        if (formWrap) formWrap.setAttribute("hidden", "");
        applySettingsProfileDocumentSeo(dashTitle);
        return;
      }
      if (hint) {
        hint.textContent =
          "Your profile could not be loaded. Try refreshing the page. If you just subscribed, wait a moment and try again, or sign out and back in.";
      }
      if (formWrap) formWrap.setAttribute("hidden", "");
      applySettingsProfileDocumentSeo(dashTitle);
      return;
    }

    const prof =
      rec.profile && typeof rec.profile === "object" ? rec.profile : {};
    const p = /** @type {Record<string, unknown>} */ (prof);
    profileSlug = String(p.slug ?? "");
    const ljRaw = rec.locales_json ?? rec.localesJson;
    const json = typeof ljRaw === "string" ? ljRaw : "";
    try {
      localesState = json ? JSON.parse(json) : { en: {}, ja: {} };
    } catch {
      localesState = { en: {}, ja: {} };
    }
    if (!localesState || typeof localesState !== "object")
      localesState = { en: {}, ja: {} };
    const draft = getProfileSetupDraft();
    if (draft.fullName || draft.email) {
      const nameParts = String(draft.fullName || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      const draftFirst = nameParts[0] || "";
      const draftLast = nameParts.slice(1).join(" ");
      for (const code of ["en", "ja"]) {
        const block = localeBlock(
          /** @type {Record<string, unknown>} */ (localesState),
          code,
        );
        const firstName = String(block.firstName ?? "").trim();
        const lastName = String(block.lastName ?? "").trim();
        if (!firstName && draftFirst) block.firstName = draftFirst;
        if (!lastName && draftLast) block.lastName = draftLast;
        const displayName = String(block.name ?? "").trim();
        if (!displayName && (block.firstName || block.lastName)) {
          block.name =
            `${String(block.firstName || "").trim()} ${String(block.lastName || "").trim()}`.trim();
        }
        /** @type {Record<string, unknown>} */ (localesState)[code] = block;
      }
    }

    mergeLatestApplicationPayloadIntoLocales(
      /** @type {Record<string, unknown>} */ (localesState),
      rec.applied_json ?? rec.appliedJson,
    );

    heroImageUrl = String(p.image ?? "");
    {
      const rawHero = /** @type {Record<string, unknown>} */ (p).heroProfileImage ?? p.hero_profile_image;
      heroProfileImageUrl = (() => {
        if (Array.isArray(rawHero)) {
          return String(unwrapOpt(rawHero) ?? "").trim();
        }
        return String(rawHero ?? "").trim();
      })();
    }
    currentArtistId = String(p.id ?? "");
    profileAudioUrl = String(p.audioUrl ?? "");
    setVal("mpd_hero_url", heroImageUrl);
    setVal("mpd_hero_profile_url", heroProfileImageUrl);
    setVal("mpd_audio_url", profileAudioUrl);
    setVal("mpd_audio_title", String(p.audioTitle ?? ""));
    setVal("mpd_profile_quote", String(p.quote ?? ""));
    updateHeroPreview();
    updateHeroProfilePreview();

    setVal("mpd_profile_visibility", normalizeArtistRosterVisibility(p.visibility));

    const vu = document.getElementById("mpd_view_profile");
    if (vu && vu instanceof HTMLAnchorElement)
      vu.href = `/profile/${encodeURIComponent(profileSlug)}`;

    const side = document.getElementById("mpd_sidebar_slug");
    if (side) side.textContent = profileSlug ? `/${profileSlug}` : "—";

    if (formWrap) formWrap.removeAttribute("hidden");

    const pill = document.getElementById("mpd_datasource_pill");
    if (pill && isTest) {
      pill.style.display = "";
      pill.textContent = "Data: test JSON (localStorage overlays)";
    } else if (pill) {
      pill.style.display = "none";
    }

    document.querySelectorAll(".mpd-locale-tab").forEach((btn) => {
      btn.classList.toggle(
        "is-active",
        btn.getAttribute("data-locale") === activeLocale,
      );
    });
    fillFormFromLocales(
      /** @type {Record<string, unknown>} */ (localesState),
      activeLocale,
    );

    refreshBaseline();

    void hydrateProgramsPanel(
      rec,
      /** @type {Record<string, unknown>} */ (localesState),
      activeLocale,
    );
    void hydratePublicProgramDiscoveryCards();
    void syncResidencyApplyCta();

    showMpdPanel(panelKeyFromHash());

    applySettingsProfileDocumentSeo(dashTitle);
  };

  document.querySelectorAll(".mpd-locale-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!localesState) return;
      const next = /** @type {'en'|'ja'} */ (
        btn.getAttribute("data-locale") === "ja" ? "ja" : "en"
      );
      localesState = readLocalesFromDom(
        /** @type {Record<string, unknown>} */ (localesState),
        activeLocale,
        getVal,
      );
      activeLocale = next;
      document.querySelectorAll(".mpd-locale-tab").forEach((b) => {
        b.classList.toggle(
          "is-active",
          b.getAttribute("data-locale") === activeLocale,
        );
      });
      fillFormFromLocales(
        /** @type {Record<string, unknown>} */ (localesState),
        activeLocale,
      );
      void (async () => {
        const r = await getMyArtistRecord();
        if (r && localesState)
          await hydrateProgramsPanel(r, localesState, activeLocale);
        await hydratePublicProgramDiscoveryCards();
        await syncResidencyApplyCta();
      })();
    });
  });

  document
    .getElementById("mpd_copy_intro_ja")
    ?.addEventListener("click", () => {
      if (!localesState) return;
      localesState = readLocalesFromDom(
        /** @type {Record<string, unknown>} */ (localesState),
        activeLocale,
        getVal,
      );
      localesState = /** @type {Record<string, unknown>} */ (
        copyIntroGalleryEnToJa(localesState)
      );
      fillFormFromLocales(
        /** @type {Record<string, unknown>} */ (localesState),
        activeLocale,
      );
      void (async () => {
        const r = await getMyArtistRecord();
        if (r && localesState)
          await hydrateProgramsPanel(r, localesState, activeLocale);
        await hydratePublicProgramDiscoveryCards();
        await syncResidencyApplyCta();
      })();
      setStatus("Intro images copied from English to Japanese.");
    });

  window.addEventListener("hashchange", () => {
    showMpdPanel(panelKeyFromHash());
  });

  document
    .getElementById("settingsProfileFinishMembership")
    ?.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("fusion-open-join-network", { detail: {} }));
    });
  document
    .getElementById("settingsProfileSyncSubscription")
    ?.addEventListener("click", async () => {
      const snap = await getAuthSnapshot();
      if (!snap.authenticated) return;
      setStatus("Refreshing subscription status…");
      try {
        const { syncSubscriptionFromStripe } = await import("../utils/integrationApi.js");
        await syncSubscriptionFromStripe(snap.principal.toText());
        await ensureMyLinkedArtistProfile();
        posthog.capture("membership_subscription_sync_succeeded", {
          context: "settings_profile",
        });
        setStatus("Done. Loading profile…");
      } catch (e) {
        setStatus(e instanceof Error ? e.message : String(e));
        return;
      }
      void load();
    });
  document
    .getElementById("settingsProfileAdminBypass")
    ?.addEventListener("click", () => {
      adminPreviewBypassEnabled = true;
      setStatus("Admin preview bypass enabled. Loading fields…");
      void load();
    });

  const openMpdBillingPortal = async () => {
    const snap = await getAuthSnapshot();
    if (!snap.authenticated) return;
    setStatus("Opening billing portal…");
    try {
      const { createBillingPortalSession } = await import("../utils/integrationApi.js");
      const href =
        typeof window !== "undefined" && window.location?.href
          ? window.location.href
          : "https://fusionart.world/settings/profile";
      const { url } = await createBillingPortalSession(snap.principal.toText(), href);
      posthog.capture("membership_billing_portal_opened", {
        context: "settings_profile",
      });
      window.location.assign(url);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  };

  document.getElementById("mpd_membership_row_billing")?.addEventListener("click", () => {
    void openMpdBillingPortal();
  });
  document.getElementById("mpd_membership_row_payment")?.addEventListener("click", () => {
    void openMpdBillingPortal();
  });
  document.getElementById("mpd_membership_pm_update")?.addEventListener("click", () => {
    void openMpdBillingPortal();
  });
  document.getElementById("mpd_membership_cancel_btn")?.addEventListener("click", () => {
    openMpdMembershipCancelModal();
  });
  document.getElementById("mpdMembershipCancelStay")?.addEventListener("click", () => {
    closeMpdMembershipCancelModal();
  });
  document.getElementById("mpdMembershipCancelContinue")?.addEventListener("click", async () => {
    const snap = await getAuthSnapshot();
    if (!snap.authenticated) return;
    closeMpdMembershipCancelModal();
    setStatus("Scheduling cancellation…");
    try {
      const { cancelSubscriptionAtPeriodEnd, syncSubscriptionFromStripe } =
        await import("../utils/integrationApi.js");
      await cancelSubscriptionAtPeriodEnd(snap.principal.toText());
      await syncSubscriptionFromStripe(snap.principal.toText());
      posthog.capture("membership_cancel_scheduled", {
        context: "settings_profile",
      });
      setStatus("Cancellation scheduled for the end of your billing period.");
      await hydrateMembershipPanel();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  });

  const onBeforeUnload = (e) => {
    if (isDirty()) {
      e.preventDefault();
      e.returnValue = "";
    }
  };
  if (_mpdBeforeUnloadHandler) {
    window.removeEventListener("beforeunload", _mpdBeforeUnloadHandler);
  }
  _mpdBeforeUnloadHandler = onBeforeUnload;
  window.addEventListener("beforeunload", onBeforeUnload);

  void load();
  window.addEventListener("fusion-auth-change", () => void load());
  window.addEventListener("fusion-admin-perspective-change", () => void load());
  window.addEventListener("fusion-data-source-change", () => void load());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void load();
  });
}
