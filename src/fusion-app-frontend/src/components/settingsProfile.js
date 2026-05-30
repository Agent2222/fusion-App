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
  memberTranslateText,
  artistRowFromMyArtistRecord,
  hasUsableWorldLlmSourceInput,
  normalizeProgramVisibility,
  unwrapOpt,
  getApplicationPaymentGlobal,
  getMyProgramPayments,
  setMyProgramPaymentFlightPreference,
} from "../utils/database.js";
import { withSeoImageAlt } from "../utils/mediaAltSeo.js";
import {
  introSlotsFromWorld,
  localeBlock,
  readProfileDraftFromDom,
  readLinksFromContainer,
  safeJsonStringify,
  worldFieldToTextarea,
} from "../utils/memberProfileForm.js";
import { publicSlugFromEnglishFirstLast } from "../utils/artistSlug.js";
import { normalizeLocalesWorldForStorage } from "../utils/worldNormalize.js";
import {
  getPublicWorldSourceFromLocales,
  needsInitialWorldNew,
  worldFieldHasContent,
} from "../utils/worldPublicPick.js";
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
import { studioIconHref } from "../utils/studioIconRegistry.js";
import { formatStudioDate } from "../utils/studioDateFormat.js";
import exploreProgramsIconUrl from "../assets/icons/fusion_dashboard_svg_icons/explore-programs.svg";
import myProgramsIconUrl from "../assets/icons/fusion_dashboard_svg_icons/my-programs.svg";
import paymentsIconUrl from "../assets/icons/fusion_dashboard_svg_icons/payments.svg";
import manualPaymentIconUrl from "../assets/icons/fusion_dashboard_svg_icons/manual-payment.svg";
import paymentPlanIconUrl from "../assets/icons/fusion_dashboard_svg_icons/payment-plan.svg";
import receiptDownloadIconUrl from "../assets/icons/fusion_dashboard_svg_icons/receipt-download.svg";
import warningIconUrl from "../assets/icons/fusion_dashboard_svg_icons/warning.svg";
import flightIconUrl from "../assets/icons/flight-icon.png";

function mpdEscapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function mpdNavIconHtml(iconKey) {
  const icon = studioIconHref(iconKey);
  return `<span class="studio-nav-item__icon" aria-hidden="true">${
    icon
      ? `<img src="${mpdEscapeAttr(icon)}" alt="" />`
      : '<span class="studio-nav-item__icon-fallback">•</span>'
  }</span>`;
}

function mpdInlineIconHtml(iconUrl, className) {
  return `<span class="${mpdEscapeAttr(className)}" style="--mpd-icon-url: url(&quot;${mpdEscapeAttr(iconUrl)}&quot;)" aria-hidden="true"></span>`;
}

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
const PROFILE_EDIT_LOCALE = "en";
const MPD_WORLD_TEXT_FIELDS = /** @type {const} */ ([
  "practice",
  "perspective",
  "vision",
  "constructing",
  "context",
  "quote",
]);
/** @type {'world' | 'newWorld'} */
let mpdStoryWorldDisplaySource = "world";
/** @type {Record<string, unknown> | null} */
let mpdStoryWorldDraft = null;
let mpdStoryWorldNewAvailable = false;
/** @type {'inactive' | 'pending' | 'private' | 'public'} */
let mpdBackendRosterVisibility = "inactive";
/** @type {Array<Record<string, unknown>>} */
let mpdProgramPaymentItems = [];
let mpdSelectedPaymentProgramId = "";
let mpdLastProgramsForPayments = [];

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
      "Clarify the core of your work.",
    hint:
      "Your practice, perspective, vision, and how you are constructing the world  you want to create.",
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

/**
 * Candid optional text can hydrate as either a string (test/local shapes) or
 * `[string]` (generated actor shapes). Treat both as the saved locales JSON.
 * @param {Record<string, unknown> | null | undefined} record
 */
function mpdLocalesJsonFromRecord(record) {
  if (!record || typeof record !== "object") return "";
  const raw = record.locales_json ?? record.localesJson;
  if (typeof raw === "string") return raw;
  const unwrapped = Array.isArray(raw) ? unwrapOpt(raw) : raw;
  return typeof unwrapped === "string" ? unwrapped : "";
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

function getMpdProfileQuoteForSave() {
  if (mpdStoryWorldDisplaySource === "newWorld" && mpdStoryWorldDraft) {
    return String(mpdStoryWorldDraft.quote ?? "").trim();
  }
  return getVal("mpd_w_quote").trim();
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
 * @param {string} key
 * @param {{ hasMedia?: boolean; hasPreview?: boolean }} state
 */
function setMpdMediaSurfaceState(key, state) {
  const surface = document.querySelector(`[data-mpd-media-surface="${key}"]`);
  if (!surface) return;
  const hasPreview = Boolean(state.hasPreview ?? state.hasMedia);
  surface.classList.toggle("has-media", Boolean(state.hasMedia));
  surface.classList.toggle("has-preview", hasPreview);
}

function updateHeroProfileCardCopy() {
  const nameNode = document.getElementById("mpd_hero_profile_card_name");
  const disciplineNode = document.getElementById("mpd_hero_profile_card_discipline");
  const name = [getVal("mpd_first_name"), getVal("mpd_last_name")]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
  const discipline = getVal("mpd_discipline").trim();
  if (nameNode) nameNode.textContent = name || "Artist Name";
  if (disciplineNode) disciplineNode.textContent = discipline || "Discipline";
}

let mpdUploadOverlayCount = 0;

/**
 * @param {string} message
 */
function showMpdUploadOverlay(message) {
  mpdUploadOverlayCount += 1;
  const overlay = document.getElementById("mpd_upload_overlay");
  const label = document.getElementById("mpd_upload_overlay_label");
  if (label) label.textContent = message || "Uploading image...";
  if (!overlay) return;
  overlay.hidden = false;
  overlay.setAttribute("aria-hidden", "false");
}

function hideMpdUploadOverlay() {
  mpdUploadOverlayCount = Math.max(0, mpdUploadOverlayCount - 1);
  if (mpdUploadOverlayCount > 0) return;
  const overlay = document.getElementById("mpd_upload_overlay");
  if (!overlay) return;
  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");
}

/**
 * Preview only: keep stored S3 URLs clean while forcing the browser to fetch
 * an overwritten object whose public URL did not change.
 * @param {string} url
 */
function cacheBustMpdPreviewUrl(url) {
  const raw = String(url || "").trim();
  if (!raw || typeof window === "undefined") return raw;
  try {
    const u = new URL(raw, window.location.origin);
    u.searchParams.set("mpdPreview", String(Date.now()));
    return u.href;
  } catch {
    const sep = raw.includes("?") ? "&" : "?";
    return `${raw}${sep}mpdPreview=${Date.now()}`;
  }
}

/**
 * @param {'idle'|'saving'|'saved'|'error'} state
 * @param {string} [message]
 * @param {{ operation?: string; detail?: string }} [meta]
 */
function dispatchProfileSaveStatus(state, message = "", meta = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("fusion-profile-save-status", {
      detail: {
        state,
        message,
        operation: meta.operation || "",
        detail: meta.detail || "",
      },
    }),
  );
}

/** @param {unknown} value */
function cloneMpdValue(value) {
  try {
    return JSON.parse(JSON.stringify(value ?? null));
  } catch {
    return value;
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} locales
 * @param {'en' | 'ja'} active
 * @param {'world' | 'worldNew'} which
 * @returns {Record<string, unknown>}
 */
function mpdWorldBlockFromLocales(locales, active, which) {
  const b = localeBlock(
    locales && typeof locales === "object" ? locales : {},
    active,
  );
  const raw = b[which];
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? /** @type {Record<string, unknown>} */ (raw)
    : {};
}

/** @param {Record<string, unknown>} world */
function mpdStoryTextBlockFromWorld(world) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of MPD_WORLD_TEXT_FIELDS) out[key] = world[key];
  return out;
}

/** @param {Record<string, unknown>} block */
function mpdStoryTextBlockHasContent(block) {
  return MPD_WORLD_TEXT_FIELDS.some((key) => worldFieldHasContent(block[key]));
}

function readMpdStoryWorldTextDraftFromDom() {
  const draft = readProfileDraftFromDom(getVal);
  const world =
    draft.world && typeof draft.world === "object" && !Array.isArray(draft.world)
      ? /** @type {Record<string, unknown>} */ (draft.world)
      : {};
  return mpdStoryTextBlockFromWorld(world);
}

/** @returns {Record<string, unknown>} */
function readMpdProfileDraftForSave() {
  const draft = readProfileDraftFromDom(getVal);
  if (mpdStoryWorldDisplaySource === "world") {
    mpdStoryWorldDraft = readMpdStoryWorldTextDraftFromDom();
    return draft;
  }
  if (!mpdStoryWorldDraft) return draft;
  const world =
    draft.world && typeof draft.world === "object" && !Array.isArray(draft.world)
      ? /** @type {Record<string, unknown>} */ (draft.world)
      : {};
  return {
    ...draft,
    world: {
      ...world,
      .../** @type {Record<string, unknown>} */ (cloneMpdValue(mpdStoryWorldDraft)),
    },
  };
}

/** @param {Record<string, unknown>} world */
function setMpdStoryFieldsFromWorld(world) {
  setVal("mpd_w_practice", String(world.practice ?? ""));
  setVal("mpd_w_perspective", worldFieldToTextarea(world.perspective));
  setVal("mpd_w_vision", worldFieldToTextarea(world.vision));
  setVal("mpd_w_constructing", worldFieldToTextarea(world.constructing));
  setVal("mpd_w_context", worldFieldToTextarea(world.context));
  setVal("mpd_w_quote", String(world.quote ?? ""));
}

/** @param {boolean} readonly */
function setMpdStoryFieldsReadonly(readonly) {
  const story = document.getElementById("mpd-story");
  if (story) story.classList.toggle("mpd-story--readonly", readonly);
  document.querySelectorAll(".mpd-story-input").forEach((elNode) => {
    if (
      elNode instanceof HTMLInputElement ||
      elNode instanceof HTMLTextAreaElement
    ) {
      elNode.readOnly = readonly;
      elNode.setAttribute("aria-readonly", readonly ? "true" : "false");
    }
  });
  document.querySelectorAll(".mpd-story-edit-btn").forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    btn.disabled = readonly;
    btn.setAttribute("aria-hidden", readonly ? "true" : "false");
  });
}

/**
 * @param {'world' | 'newWorld'} source
 * @param {boolean} newWorldAvailable
 */
function renderPublicWorldSourceToggle(source, newWorldAvailable) {
  const resolved = source === "newWorld" && newWorldAvailable ? "newWorld" : "world";
  const hidden = /** @type {HTMLInputElement | null} */ (
    document.getElementById("mpd_public_world_source")
  );
  if (hidden) hidden.value = resolved;
  const note = document.getElementById("mpd_public_world_source_note");
  if (note) {
    note.textContent = `${resolved === "newWorld" ? "New World" : "World"} will display on your profile.`;
  }
  document.querySelectorAll("[data-mpd-world-source]").forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    const buttonSource = btn.getAttribute("data-mpd-world-source");
    const isNewWorld = buttonSource === "newWorld";
    const active = buttonSource === resolved;
    btn.classList.toggle("is-active", active);
    btn.classList.toggle("is-disabled", isNewWorld && !newWorldAvailable);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
    btn.disabled = Boolean(isNewWorld && !newWorldAvailable);
    if (isNewWorld && !newWorldAvailable) {
      btn.setAttribute("aria-disabled", "true");
      btn.title = "New World will unlock after generated copy is available.";
    } else {
      btn.removeAttribute("aria-disabled");
      btn.removeAttribute("title");
    }
  });
}

/**
 * @param {Record<string, unknown>} locales
 * @param {'en' | 'ja'} active
 * @param {unknown} requested
 * @param {boolean} [captureCurrent]
 */
function applyMpdStoryWorldDisplay(locales, active, requested, captureCurrent = true) {
  if (captureCurrent && mpdStoryWorldDisplaySource === "world") {
    mpdStoryWorldDraft = readMpdStoryWorldTextDraftFromDom();
  }
  const world = mpdWorldBlockFromLocales(locales, active, "world");
  const worldNew = mpdWorldBlockFromLocales(locales, active, "worldNew");
  mpdStoryWorldNewAvailable = mpdStoryTextBlockHasContent(worldNew);
  const source =
    requested === "newWorld" && mpdStoryWorldNewAvailable ? "newWorld" : "world";
  if (source === "newWorld") {
    setMpdStoryFieldsFromWorld(worldNew);
    setMpdStoryFieldsReadonly(true);
  } else {
    setMpdStoryFieldsFromWorld(
      mpdStoryWorldDraft ||
        mpdStoryTextBlockFromWorld(world),
    );
    setMpdStoryFieldsReadonly(false);
  }
  mpdStoryWorldDisplaySource = source;
  renderPublicWorldSourceToggle(source, mpdStoryWorldNewAvailable);
}

/** @param {unknown} raw */
function mpdTextList(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.flatMap((item) => mpdTextList(item));
  if (typeof raw === "object") {
    return Object.values(/** @type {Record<string, unknown>} */ (raw)).flatMap((item) =>
      mpdTextList(item),
    );
  }
  const s = String(raw).trim();
  return s ? [s] : [];
}

/** @param {Record<string, unknown>} block */
function inferProfileDraftLanguage(block) {
  const w = block.world && typeof block.world === "object" ? block.world : {};
  const sample = [
    block.discipline,
    block.bio,
    ...mpdTextList(w),
  ].join("\n");
  if (!sample.trim()) return "en";
  if (/[\u3040-\u30ff\u3400-\u9fff]/.test(sample)) return "ja";
  if (/[A-Za-z]/.test(sample) && !/[^\x00-\x7F]/.test(sample)) return "en";
  return "other";
}

/** @param {Record<string, unknown>} block */
function mpdBlockHasProfileContent(block) {
  return mpdTextList({
    firstName: block.firstName,
    lastName: block.lastName,
    name: block.name,
    discipline: block.discipline,
    bio: block.bio,
    world: block.world,
  }).some(Boolean);
}

/** @param {Record<string, unknown>} locales */
function localesForSingleProfileForm(locales) {
  const en = localeBlock(locales, "en");
  if (mpdBlockHasProfileContent(en)) return locales;
  const ja = localeBlock(locales, "ja");
  if (!mpdBlockHasProfileContent(ja)) return locales;
  return { ...locales, en: cloneMpdValue(ja) };
}

/**
 * @param {unknown} raw
 * @param {'en'|'ja'} targetLocale
 * @param {string} sourceLocaleHint
 */
async function translateMpdTextValue(raw, targetLocale, sourceLocaleHint) {
  if (raw == null) return "";
  if (Array.isArray(raw)) {
    const out = [];
    for (const item of raw) {
      out.push(await translateMpdTextValue(item, targetLocale, sourceLocaleHint));
    }
    return out;
  }
  const text = String(raw ?? "").trim();
  if (!text) return "";
  return (await memberTranslateText(text, targetLocale, sourceLocaleHint)).trim();
}

/**
 * @param {Record<string, unknown>} sourceBlock
 * @param {'en'|'ja'} targetLocale
 * @param {string} sourceLocaleHint
 */
async function translateProfileDraftBlock(sourceBlock, targetLocale, sourceLocaleHint) {
  const out = /** @type {Record<string, unknown>} */ (cloneMpdValue(sourceBlock) || {});
  out.discipline = await translateMpdTextValue(sourceBlock.discipline, targetLocale, sourceLocaleHint);
  out.bio = await translateMpdTextValue(sourceBlock.bio, targetLocale, sourceLocaleHint);
  out.bioLong = "";
  const w0 =
    sourceBlock.world && typeof sourceBlock.world === "object" && !Array.isArray(sourceBlock.world)
      ? /** @type {Record<string, unknown>} */ (sourceBlock.world)
      : {};
  const w = /** @type {Record<string, unknown>} */ (cloneMpdValue(w0) || {});
  w.practice = await translateMpdTextValue(w0.practice, targetLocale, sourceLocaleHint);
  w.perspective = await translateMpdTextValue(w0.perspective, targetLocale, sourceLocaleHint);
  w.vision = await translateMpdTextValue(w0.vision, targetLocale, sourceLocaleHint);
  w.constructing = await translateMpdTextValue(w0.constructing, targetLocale, sourceLocaleHint);
  w.context = await translateMpdTextValue(w0.context, targetLocale, sourceLocaleHint);
  w.quote = await translateMpdTextValue(w0.quote, targetLocale, sourceLocaleHint);
  const gallery = Array.isArray(w0.introGallery)
    ? /** @type {Array<Record<string, unknown>>} */ (cloneMpdValue(w0.introGallery))
    : [];
  w.introGallery = [];
  for (const item of gallery) {
    if (!item || typeof item !== "object") continue;
    w.introGallery.push({
      ...item,
      alt: await translateMpdTextValue(item.alt, targetLocale, sourceLocaleHint),
      caption: await translateMpdTextValue(item.caption, targetLocale, sourceLocaleHint),
    });
  }
  out.world = w;
  return out;
}

/**
 * @param {Record<string, unknown>} prev
 * @param {Record<string, unknown>} draft
 * @param {(id: string) => string | undefined} val
 * @param {{ translate?: boolean }} [options]
 */
async function buildSmartProfileLocales(prev, draft, val, options = {}) {
  const out = /** @type {Record<string, unknown>} */ (
    cloneMpdValue(prev && typeof prev === "object" ? prev : { en: {}, ja: {} }) || {}
  );
  /** @param {'en' | 'ja'} code */
  const preserveWorldNew = (code) => {
    const prevBlock = localeBlock(prev, code);
    const nextBlock = localeBlock(out, code);
    const prevWorldNew = prevBlock.worldNew;
    if (
      nextBlock &&
      typeof nextBlock === "object" &&
      prevWorldNew &&
      typeof prevWorldNew === "object" &&
      !Array.isArray(prevWorldNew)
    ) {
      nextBlock.worldNew = cloneMpdValue(prevWorldNew);
      out[code] = nextBlock;
    }
  };
  if (options.translate === false) {
    out.en = cloneMpdValue(draft);
    out.ja = cloneMpdValue(draft);
  } else {
    const source = inferProfileDraftLanguage(draft);
    if (source === "ja") {
      out.ja = cloneMpdValue(draft);
      out.en = await translateProfileDraftBlock(draft, "en", "ja");
    } else if (source === "en") {
      out.en = cloneMpdValue(draft);
      out.ja = await translateProfileDraftBlock(draft, "ja", "en");
    } else {
      out.en = await translateProfileDraftBlock(draft, "en", "auto");
      out.ja = await translateProfileDraftBlock(draft, "ja", "auto");
    }
  }
  preserveWorldNew("en");
  preserveWorldNew("ja");
  const srcPick = val("mpd_public_world_source");
  if (srcPick === "world" || srcPick === "newWorld") {
    out.publicWorldSource = srcPick;
  }
  return normalizeLocalesWorldForStorage(out);
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
  updateHeroProfileCardCopy();
  setVal("mpd_bio", String(b.bio ?? b.bioLong ?? ""));
  setMpdStatusToggle(b.status);
  const loc =
    b.location && typeof b.location === "object" && !Array.isArray(b.location)
      ? b.location
      : {};
  setVal("mpd_loc_city", String(loc.city ?? ""));
  setVal("mpd_loc_state", String(loc.state ?? ""));
  setVal("mpd_loc_country", String(loc.country ?? ""));
  setVal("mpd_loc_display", String(loc.display ?? ""));
  mpdStoryWorldDraft = mpdStoryTextBlockFromWorld(w);
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
    setMpdMediaSurfaceState(`intro-${i}`, {
      hasMedia: Boolean(s.src),
      hasPreview: Boolean(s.src),
    });
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
  applyMpdStoryWorldDisplay(
    locales,
    active,
    getPublicWorldSourceFromLocales(locales),
    false,
  );
  syncMpdAudioSectionVisibility(locales);
}

/**
 * Hide audio bite controls when Studio set `locales_json.audioDisplayForArtist` to false.
 * @param {Record<string, unknown>} locales
 */
function syncMpdAudioSectionVisibility(locales) {
  const wrap = document.getElementById("mpd_audio_section");
  if (!wrap) return;
  const root = locales && typeof locales === "object" ? locales : {};
  const show = root.audioDisplayForArtist !== false;
  wrap.hidden = !show;
  wrap.setAttribute("aria-hidden", show ? "false" : "true");
  wrap.classList.toggle("mpd-audio-section--hidden", !show);
  wrap.querySelectorAll("input, textarea").forEach((el) => {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.disabled = !show;
    }
  });
  const audioLab = document.querySelector('label[for="mpd_audio_file"]');
  if (audioLab instanceof HTMLLabelElement) {
    if (!show) {
      audioLab.setAttribute("aria-disabled", "true");
      audioLab.style.pointerEvents = "none";
      audioLab.style.opacity = "0.45";
    } else {
      audioLab.removeAttribute("aria-disabled");
      audioLab.style.pointerEvents = "";
      audioLab.style.opacity = "";
    }
  }
}

/**
 * @param {unknown} value
 */
function setMpdStatusToggle(value) {
  const raw = String(value ?? "").trim();
  const status = ["studio", "prep", "showing", "available"].includes(raw)
    ? raw
    : "studio";
  const hidden = /** @type {HTMLInputElement | null} */ (
    document.getElementById("mpd_status")
  );
  if (hidden) hidden.value = status;
  document.querySelectorAll("[data-mpd-status]").forEach((btn) => {
    const active = btn.getAttribute("data-mpd-status") === status;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

/**
 * @param {unknown} value
 */
function setMpdVisibilityToggle(value) {
  const visibility = normalizeArtistRosterVisibility(value);
  const uiVisibility = visibility === "pending" ? "public" : visibility;
  const hidden = /** @type {HTMLInputElement | null} */ (
    document.getElementById("mpd_profile_visibility")
  );
  if (hidden) hidden.value = uiVisibility;
  document.querySelectorAll("[data-mpd-visibility]").forEach((btn) => {
    const active = btn.getAttribute("data-mpd-visibility") === uiVisibility;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
  const reviewNotice = document.getElementById("mpd_profile_visibility_review_notice");
  if (reviewNotice) {
    const showReviewNotice = visibility === "pending";
    reviewNotice.hidden = !showReviewNotice;
    reviewNotice.setAttribute("aria-hidden", showReviewNotice ? "false" : "true");
  }
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
    row.className = "mpd-link-row studio-form-grid mpd-editorial-grid mpd-editorial-grid--links";
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
                <input type="text" class="studio-input mpd-link-label" placeholder="Portfolio, Instagram, gallery..." value="" />
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

/** @param {unknown} value */
function mpdText(value) {
  return String(value ?? "").trim();
}

/**
 * @param {string} tab
 */
function setMpdProgramsTab(tab) {
  const root = document.getElementById("mpd-programs");
  if (!root) return;
  const target = ["explore", "my-programs", "payments"].includes(tab)
    ? tab
    : "explore";
  const targetTab = root.querySelector(`[data-mpd-program-tab="${target}"]`);
  const safeTarget =
    target === "payments" &&
    targetTab &&
    (targetTab.hasAttribute("hidden") || targetTab.getAttribute("aria-hidden") === "true")
      ? "my-programs"
      : target;
  root.querySelectorAll("[data-mpd-program-tab]").forEach((el) => {
    const isActive = el.getAttribute("data-mpd-program-tab") === safeTarget;
    el.classList.toggle("is-active", isActive);
    el.setAttribute("aria-selected", isActive ? "true" : "false");
    el.setAttribute("tabindex", isActive ? "0" : "-1");
  });
  root.querySelectorAll("[data-mpd-program-panel]").forEach((el) => {
    const isActive = el.getAttribute("data-mpd-program-panel") === safeTarget;
    if (isActive) el.removeAttribute("hidden");
    else el.setAttribute("hidden", "");
  });
}

function applyMpdPublicProgramFilters() {
  const root = document.getElementById("mpd_public_programs_discovery");
  if (!root) return;
  const search = /** @type {HTMLInputElement | null} */ (
    root.querySelector("#mpd_public_programs_search")
  );
  const filter = /** @type {HTMLSelectElement | null} */ (
    root.querySelector("#mpd_public_programs_filter")
  );
  const q = String(search?.value ?? "").trim().toLowerCase();
  const selected = String(filter?.value ?? "all").trim();
  const cards = Array.from(root.querySelectorAll(".mpd-public-program-card"));
  let visibleCount = 0;
  for (const card of cards) {
    const hay = String(card.getAttribute("data-search") ?? "").toLowerCase();
    const status = String(card.getAttribute("data-status") ?? "");
    const category = String(card.getAttribute("data-category") ?? "");
    const matchesSearch = !q || hay.includes(q);
    const matchesFilter =
      selected === "all" ||
      (selected === "open" && status === "open") ||
      (selected === "not-open" && status !== "open") ||
      (selected.startsWith("category:") && category === selected.slice(9));
    const visible = matchesSearch && matchesFilter;
    card.toggleAttribute("hidden", !visible);
    if (visible) visibleCount += 1;
  }
  const noResults = document.getElementById("mpd_public_programs_no_results");
  if (noResults) {
    noResults.hidden = cards.length === 0 || visibleCount > 0;
  }
}

function applyMpdMyProgramsFilters() {
  const root = document.getElementById("mpd-program-panel-my-programs");
  if (!root) return;
  const active =
    root.querySelector(".mpd-my-program-filter.is-active")?.getAttribute(
      "data-mpd-my-program-filter",
    ) || "all";
  const cards = Array.from(root.querySelectorAll(".mpd-my-program-card"));
  let visibleCount = 0;
  for (const card of cards) {
    const status = String(card.getAttribute("data-status-key") || "submitted");
    const visible = active === "all" || status === active;
    card.toggleAttribute("hidden", !visible);
    if (visible) visibleCount += 1;
  }
  const noResults = document.getElementById("mpd_my_programs_no_results");
  if (noResults) {
    noResults.hidden = cards.length === 0 || visibleCount > 0;
  }
}

/** @param {Element} chip */
function setMpdMyProgramsFilter(chip) {
  const root = document.getElementById("mpd-program-panel-my-programs");
  if (!root || !root.contains(chip)) return;
  root.querySelectorAll("[data-mpd-my-program-filter]").forEach((el) => {
    const active = el === chip;
    el.classList.toggle("is-active", active);
    el.setAttribute("aria-pressed", active ? "true" : "false");
  });
  applyMpdMyProgramsFilters();
}

/** @param {string} programId */
function openMpdApplicationDetailsModal(programId) {
  const card = Array.from(document.querySelectorAll(".mpd-my-program-card")).find(
    (el) => el.getAttribute("data-program-id") === programId,
  );
  if (!card) return;
  const title = card.querySelector("h4")?.textContent || "Application";
  const payloadTemplate = /** @type {HTMLTemplateElement | null} */ (
    Array.from(card.querySelectorAll("template[data-mpd-application-payload]")).find(
      (el) => el.getAttribute("data-mpd-application-payload") === programId,
    ) || null
  );
  const payloadHtml =
    payloadTemplate?.innerHTML ||
    '<p class="studio-muted">No application payload details are available.</p>';
  const modal = document.createElement("div");
  modal.className =
    "settings-profile-page profile-gallery-access-modal mpd-application-details-modal";
  modal.setAttribute("aria-hidden", "false");
  modal.innerHTML = `
    <div class="profile-gallery-access-modal__scrim" aria-hidden="true"></div>
    <div class="profile-gallery-access-modal__panel mpd-application-details-modal__panel" role="dialog" aria-modal="true" aria-labelledby="mpdApplicationDetailsTitle">
      <h2 id="mpdApplicationDetailsTitle" class="profile-gallery-access-modal__title">${escapeHtmlMpd(title)}</h2>
      <div class="mpd-application-details-modal__body">
        ${payloadHtml}
      </div>
      <button type="button" class="profile-gallery-access-modal__close">Close</button>
    </div>
  `;
  const close = () => {
    modal.remove();
    window.removeEventListener("keydown", onKeydown);
  };
  function onKeydown(e) {
    if (e.key === "Escape") close();
  }
  modal.querySelector(".profile-gallery-access-modal__scrim")?.addEventListener("click", close);
  modal.querySelector(".profile-gallery-access-modal__close")?.addEventListener("click", close);
  window.addEventListener("keydown", onKeydown);
  document.body.appendChild(modal);
  const closeBtn = modal.querySelector(".profile-gallery-access-modal__close");
  if (closeBtn instanceof HTMLElement) closeBtn.focus();
}

/** @param {unknown} value */
function mpdObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? /** @type {Record<string, unknown>} */ (value)
    : {};
}

/** @param {unknown} value */
function mpdArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * @param {unknown} raw
 * @returns {{ key: string, label: string }}
 */
function normalizeMpdApplicationStatus(raw) {
  const s = mpdText(raw).toLowerCase().replace(/[\s_-]+/g, "-");
  if (["reviewing", "review", "in-review", "initial-review"].includes(s)) {
    return { key: "initial-review", label: "Initial review" };
  }
  if (["postinterviewreview", "post-interview-review", "under-review", "final-review"].includes(s)) {
    return { key: "post-interview-review", label: "Post interview review" };
  }
  if (["invited", "invite", "accepted", "approved", "payment-required", "deposit-due"].includes(s)) {
    return { key: "invited", label: "Invited" };
  }
  if (["not-selected", "rejected", "declined", "not-accepted"].includes(s)) {
    return { key: "not-selected", label: "Not selected" };
  }
  if (["pulledout", "pulled-out", "pulled_out", "rescinded"].includes(s)) {
    return { key: "rescinded", label: "Rescinded" };
  }
  if (["withdrawn", "withdrew", "cancelled", "canceled"].includes(s)) {
    return { key: "withdrawn", label: "Withdrawn" };
  }
  return { key: "submitted", label: "Submitted" };
}

/**
 * @param {Record<string, unknown>} program
 * @param {string} programId
 * @param {Record<string, unknown>} entry
 */
function normalizeMpdMyProgramCard(program, programId, entry) {
  const en = mpdObject(program.enCard);
  const ja = mpdObject(program.jaCard);
  const payload = mpdObject(entry.payload);
  const status = normalizeMpdApplicationStatus(
    entry.status ?? entry.applicationStatus ?? entry.decision,
  );
  const focus = firstNonEmptyString(en.focus, en.headline);
  const location = firstNonEmptyString(en.location, en.place);
  const title =
    location ||
    firstNonEmptyString(en.title, focus, programId) ||
    "Program";
  const openTo = firstNonEmptyString(
    en.openTo,
    en.audience,
    en.eligibility,
    en.discipline,
    en.medium,
  );
  const startDate = firstNonEmptyString(en.startDate, en.start);
  const endDate = firstNonEmptyString(en.endDate, en.deadline);
  const deadline = firstNonEmptyString(
    en.deadline,
    en.applicationDeadline,
    en.deadlineDate,
    en.applyBy,
    startDate && endDate ? `${startDate} - ${endDate}` : startDate || endDate,
    en.year,
  );
  const imageSrc = firstNonEmptyString(ja.imageSrc, en.imageSrc, program.image);
  const imageAlt = firstNonEmptyString(en.imageAlt, title);
  const category = firstNonEmptyString(en.category, en.type, focus, "Program");
  let route = "/programs";
  if (program.routeLink) {
    const rawRoute = String(program.routeLink);
    route = rawRoute.startsWith("/") ? rawRoute : `/${rawRoute}`;
  }
  const submittedAt = firstNonEmptyString(
    entry.submittedAt,
    entry.submitted_at,
    entry.createdAt,
  );
  const paymentRequired = Boolean(
    entry.paymentRequired ||
      entry.payment_required ||
      ["accepted", "approved", "payment-required", "deposit-due"].includes(
        mpdText(entry.status ?? entry.decision).toLowerCase().replace(/[\s_-]+/g, "-"),
      ),
  );
  const teamNote = firstNonEmptyString(
    entry.teamNote,
    entry.teamNotes,
    entry.programNote,
    entry.note,
  );
  return {
    programId,
    title,
    location,
    focus,
    openTo,
    deadline,
    imageSrc,
    imageAlt,
    category,
    route,
    submittedAt,
    payload,
    status,
    paymentRequired,
    slotSecured: Boolean(entry.slotSecured),
    teamNote,
    rawEntry: entry,
  };
}

/** @param {ReturnType<typeof normalizeMpdMyProgramCard>} item */
function mpdMyProgramTimeline(item) {
  const status = item.status.key;
  const progress =
    status === "rescinded"
      ? { completeThrough: 1, activeStep: 0 }
      : status === "initial-review"
      ? { completeThrough: 2, activeStep: 3 }
      : status === "post-interview-review"
        ? { completeThrough: 3, activeStep: 4 }
      : status === "invited" || status === "not-selected" || status === "withdrawn"
        ? { completeThrough: 4, activeStep: 5 }
        : { completeThrough: item.submittedAt ? 1 : 0, activeStep: 0 };
  const slotSecured = Boolean(item.slotSecured);
  return ["Submitted", "Initial review", "Post interview review", "Decision", "Slot secured"].map(
    (label, index) => {
      const step = index + 1;
      const state =
        step === 5 && slotSecured
          ? "complete"
          : step <= progress.completeThrough
          ? "complete"
          : step === progress.activeStep
            ? "active"
            : "pending";
      const date = step === 1 ? formatStudioDate(item.submittedAt) : "";
      return { label, state, date: date === "—" ? "" : date };
    },
  );
}

/** @param {Record<string, unknown>} payload */
function mpdApplicationMaterialRows(payload) {
  const hasText = (...keys) => keys.some((k) => mpdText(payload[k]));
  const hasPortfolio =
    hasText("portfolio", "portfolioUrl", "portfolioLink", "website", "websiteUrl") ||
    mpdArray(payload.files).length > 0;
  return [
    {
      label: "Personal statement",
      submitted: hasText("statement", "personalStatement", "artistStatement", "bio"),
    },
    { label: "Artist profile", submitted: true },
    { label: "Portfolio", submitted: hasPortfolio },
    { label: "Travel documents", submitted: hasText("travelDocuments", "travelDocument", "passport", "passportUrl") },
  ];
}

/** @param {ReturnType<typeof normalizeMpdMyProgramCard>} item */
function mpdTeamNoteForApplication(item) {
  if (item.teamNote) return item.teamNote;
  if (item.paymentRequired) {
    return "You have been invited to continue. Payment details will appear here when the next step opens.";
  }
  switch (item.status.key) {
    case "initial-review":
      return "Thank you for your application. Our team is completing the initial review.";
    case "post-interview-review":
      return "Thank you for your application. Our team is currently reviewing submissions. You will be notified when a decision is ready.";
    case "invited":
      return "Your application has moved forward. Watch this space for next steps from the program team.";
    case "not-selected":
      return "Thank you for applying. This application was not selected for the current cycle.";
    case "withdrawn":
      return "This application has been withdrawn. No further action is needed.";
    case "rescinded":
      return "This application has been rescinded. Contact the program team if you have questions.";
    default:
      return "Your application has been received and is queued for review.";
  }
}

/** @param {Record<string, unknown>} payload */
function mpdPayloadSummaryHtml(payload) {
  const rows = Object.entries(payload)
    .filter(([, value]) => {
      if (value == null) return false;
      if (typeof value === "string") return Boolean(value.trim());
      if (Array.isArray(value)) return value.length > 0;
      return typeof value === "number" || typeof value === "boolean";
    })
    .slice(0, 16);
  if (!rows.length) return '<p class="studio-muted">No application payload details are available.</p>';
  return `<dl class="mpd-application-payload-list">${rows
    .map(([key, value]) => {
      const label = key
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (m) => m.toUpperCase());
      const text = Array.isArray(value) ? value.join(", ") : String(value);
      return `<dt>${escapeHtmlMpd(label)}</dt><dd>${escapeHtmlMpd(text)}</dd>`;
    })
    .join("")}</dl>`;
}

/** @param {ReturnType<typeof normalizeMpdMyProgramCard>} item */
function renderMpdMyProgramCard(item) {
  const timeline = mpdMyProgramTimeline(item);
  const materials = mpdApplicationMaterialRows(item.payload);
  const dateLabel = item.submittedAt ? `Submitted: ${formatStudioDate(item.submittedAt)}` : "";
  return `
    <article class="mpd-my-program-card mpd-my-program-card--${escapeHtmlMpd(item.status.key)}" data-status-key="${escapeHtmlMpd(item.status.key)}" data-program-id="${escapeHtmlMpd(item.programId)}">
      <div class="mpd-my-program-card__summary">
        <div class="mpd-my-program-card__media">
          ${
            item.imageSrc
              ? `<img src="${escapeHtmlMpd(item.imageSrc)}" alt="${escapeHtmlMpd(withSeoImageAlt(item.imageAlt || item.title))}" loading="lazy" />`
              : `<div class="mpd-my-program-card__placeholder">Fusion</div>`
          }
        </div>
        <div class="mpd-my-program-card__meta">
          <div class="mpd-my-program-card__title-row">
            <div>
              <h4>${escapeHtmlMpd(item.title)}</h4>
              ${item.category ? `<p class="mpd-my-program-card__category">${escapeHtmlMpd(item.category)}</p>` : ""}
            </div>
            <div class="mpd-my-program-card__status-wrap">
              <span class="mpd-my-program-status mpd-my-program-status--${escapeHtmlMpd(item.status.key)}">${escapeHtmlMpd(item.status.label)}</span>
              ${dateLabel ? `<span class="mpd-my-program-card__date">${escapeHtmlMpd(dateLabel)}</span>` : ""}
            </div>
          </div>
          <div class="mpd-my-program-card__facts">
            ${item.focus ? `<p><strong>Program:</strong> ${escapeHtmlMpd(item.focus)}</p>` : ""}
            ${item.openTo ? `<p><strong>Open to:</strong> ${escapeHtmlMpd(item.openTo)}</p>` : ""}
            ${item.deadline ? `<p><strong>Dates:</strong> ${escapeHtmlMpd(item.deadline)}</p>` : ""}
          </div>
        </div>
      </div>
      ${
        item.paymentRequired
          ? `<div class="mpd-my-program-payment-callout"><strong>Payment required</strong><span>Visit the Payments tab to submit your deposit or full payment and secure your slot.</span><button type="button" class="mpd-my-program-action" data-mpd-program-tab="payments">View payments</button></div>`
          : ""
      }
      <ol class="mpd-my-program-timeline" aria-label="Application progress for ${escapeHtmlMpd(item.title)}">
        ${timeline
          .map(
            (step) => `
              <li class="mpd-my-program-timeline__step is-${escapeHtmlMpd(step.state)}">
                <span class="mpd-my-program-timeline__dot" aria-hidden="true"></span>
                <span class="mpd-my-program-timeline__label">${escapeHtmlMpd(step.label)}</span>
                ${step.date ? `<span class="mpd-my-program-timeline__date">${escapeHtmlMpd(step.date)}</span>` : ""}
              </li>
            `,
          )
          .join("")}
      </ol>
      <div class="mpd-my-program-card__details">
        <section>
          <h5>Application materials</h5>
          <ul class="mpd-my-program-materials">
            ${materials
              .map(
                (row) => `
                  <li class="${row.submitted ? "is-submitted" : "is-pending"}">
                    <span aria-hidden="true">${row.submitted ? "✓" : "○"}</span>
                    <span>${escapeHtmlMpd(row.label)}</span>
                    <em>${row.submitted ? "Submitted" : "Pending"}</em>
                  </li>
                `,
              )
              .join("")}
          </ul>
        </section>
        <section>
          <h5>Notes from the program</h5>
          <p>${escapeHtmlMpd(mpdTeamNoteForApplication(item))}</p>
        </section>
        <section>
          <h5>Actions</h5>
          <div class="mpd-my-program-actions">
            <button type="button" class="mpd-my-program-action" data-mpd-application-action="view" data-program-id="${escapeHtmlMpd(item.programId)}">View application</button>
            <button type="button" class="mpd-my-program-action" data-mpd-application-action="update" data-program-id="${escapeHtmlMpd(item.programId)}">Update materials</button>
            <button type="button" class="mpd-my-program-action mpd-my-program-action--danger" data-mpd-application-action="withdraw" data-program-id="${escapeHtmlMpd(item.programId)}">Withdraw application</button>
          </div>
        </section>
      </div>
      <template data-mpd-application-payload="${escapeHtmlMpd(item.programId)}">${mpdPayloadSummaryHtml(item.payload)}</template>
    </article>
  `;
}

function mpdCents(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function mpdUsd(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(mpdCents(cents) / 100);
}

function mpdParseUsdCents(value) {
  const raw = String(value ?? "").replace(/,/g, "");
  const m = raw.match(/\$?\s*(\d+(?:\.\d{1,2})?)\s*(?:USD)?/i);
  if (!m) return 0;
  return Math.round(Number(m[1]) * 100);
}

const MPD_PROGRAM_BASE_TOTAL_CENTS = 500000;
const MPD_PROGRAM_OWN_FLIGHT_CREDIT_CENTS = 80000;
const MPD_PROGRAM_DEFAULT_DEPOSIT_CENTS = 100000;

function mpdDateMonthsUntil(startText) {
  const d = new Date(String(startText || ""));
  if (Number.isNaN(d.getTime())) return 0;
  const now = new Date();
  return Math.max(0, (d.getUTCFullYear() - now.getUTCFullYear()) * 12 + (d.getUTCMonth() - now.getUTCMonth()));
}

function mpdPaymentSummaryFor(programId, payments) {
  return (payments.summaries || []).find((x) => String(x.programId || "") === String(programId)) || null;
}

function mpdPaymentPlanFor(id, payments) {
  if (!id) return null;
  return (payments.plans || []).find((x) => String(x.id || "") === String(id)) || null;
}

function mpdSlotSecuredProgramIds(payments) {
  const secured = new Set();
  for (const summary of payments?.summaries || []) {
    const status = String(summary?.depositStatus || "");
    if (status === "paid" || status === "paid_full") {
      const programId = String(summary?.programId || "");
      if (programId) secured.add(programId);
    }
  }
  for (const row of payments?.ledger || []) {
    const type = String(row?.paymentType || "");
    const status = String(row?.status || "").toLowerCase();
    if ((type === "deposit" || type === "full_payment") && (status === "succeeded" || status === "paid")) {
      const programId = String(row?.programId || "");
      if (programId) secured.add(programId);
    }
  }
  return secured;
}

function normalizeMpdProgramPaymentViewModels(programs, payments) {
  const approved = Array.isArray(payments.approvedPrograms) ? payments.approvedPrograms : [];
  return approved
    .map((approval) => {
      const programId = String(approval.programId || "").trim();
      if (!programId) return null;
      const program = programs.find((x) => String(x.id || "") === programId) || { id: programId, enCard: { focus: programId } };
      const en = mpdObject(program.enCard || program);
      const ja = mpdObject(program.jaCard || {});
      const location = firstNonEmptyString(en.location, en.place);
      const focus = firstNonEmptyString(en.focus, en.headline, en.title);
      const title = firstNonEmptyString(location, focus, programId);
      const imageSrc = firstNonEmptyString(ja.imageSrc, en.imageSrc, program.image);
      const imageAlt = firstNonEmptyString(en.imageAlt, focus, title);
      const startText = firstNonEmptyString(en.startDate, en.start, en.programStart, en.programPage?.startDate);
      const depositDisplay = firstNonEmptyString(program.depositAmountDisplay, en.depositAmountDisplay, en.programPage?.applicationForm?.depositAmountDisplay);
      const depositCents = mpdParseUsdCents(depositDisplay) || MPD_PROGRAM_DEFAULT_DEPOSIT_CENTS;
      const summary = mpdPaymentSummaryFor(programId, payments);
      const ownFlight = summary?.ownFlight === true || String(summary?.ownFlight || "").toLowerCase() === "true";
      const baseTotalDueCents = MPD_PROGRAM_BASE_TOTAL_CENTS;
      const flightCreditCents = ownFlight ? MPD_PROGRAM_OWN_FLIGHT_CREDIT_CENTS : 0;
      const totalDueCents = ownFlight
        ? Math.max(0, baseTotalDueCents - flightCreditCents)
        : baseTotalDueCents;
      const totalPaidCents = mpdCents(summary?.totalPaidCents);
      const outstandingCents = summary ? mpdCents(summary.outstandingCents) : Math.max(0, totalDueCents - totalPaidCents);
      const activePlan = mpdPaymentPlanFor(summary?.activePlanId, payments);
      const ledger = (payments.ledger || [])
        .filter((x) => String(x.programId || "") === programId)
        .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      const hasConfirmedSlotPayment = ledger.some((row) => {
        const type = String(row.paymentType || "");
        const status = String(row.status || "").toLowerCase();
        return (type === "deposit" || type === "full_payment") && (status === "succeeded" || status === "paid");
      });
      const paymentStarted = totalPaidCents > 0 || ledger.length > 0 || Boolean(activePlan);
      const depositPaid = ["paid", "paid_full"].includes(String(summary?.depositStatus || "")) || hasConfirmedSlotPayment;
      return {
        programId,
        applicationId: String(approval.applicationId || ""),
        title,
        location,
        focus,
        imageSrc,
        imageAlt,
        startText,
        email: String(approval.email || ""),
        fullName: String(approval.fullName || ""),
        depositCents,
        baseTotalDueCents,
        ownFlight,
        flightCreditCents,
        totalDueCents,
        totalPaidCents,
        outstandingCents,
        refundedCents: mpdCents(summary?.refundedCents),
        depositPaid,
        paidInFull: outstandingCents <= 0 && totalDueCents > 0,
        activePlan,
        paymentStarted,
        ledger,
        summary,
      };
    })
    .filter(Boolean);
}

function renderMpdProgramPaymentPills(items) {
  return `
    <div class="mpd-payments-pill-rail" role="tablist" aria-label="Approved program payments">
      ${items
        .map((item) => {
          const active = item.programId === mpdSelectedPaymentProgramId;
          const cue = item.paidInFull ? "Paid" : item.activePlan ? "Plan active" : item.depositPaid ? "Balance due" : "Deposit due";
          return `<button type="button" class="mpd-payments-pill ${active ? "is-active" : ""}" data-mpd-payment-program="${escapeHtmlMpd(item.programId)}" aria-selected="${active ? "true" : "false"}">
            <strong>${escapeHtmlMpd(item.title)}</strong>
            <span>${escapeHtmlMpd(cue)}</span>
          </button>`;
        })
        .join("")}
    </div>
  `;
}

function renderMpdPaymentHistory(item) {
  if (!item.ledger.length) {
    return `<div class="mpd-payments-empty"><h4>No payment history yet.</h4><p class="studio-muted">Receipts will appear here after your first program payment.</p></div>`;
  }
  return `
    <div class="mpd-payments-history-list">
      ${item.ledger
        .map((row) => {
          const receipt = String(row.stripeReceiptUrl || "");
          return `<div class="mpd-payments-history-row">
            <span>${escapeHtmlMpd(formatStudioDate(row.createdAt) || "—")}</span>
            <strong>${escapeHtmlMpd(String(row.paymentType || "payment").replace(/_/g, " "))}</strong>
            <span>${mpdUsd(row.amountCents)}</span>
            <span class="mpd-payment-status">${escapeHtmlMpd(row.status || "recorded")}</span>
            ${receipt ? `<a href="${mpdEscapeAttr(receipt)}" target="_blank" rel="noopener">Receipt</a>` : `<span class="studio-muted">Receipt pending</span>`}
          </div>`;
        })
        .join("")}
    </div>
  `;
}

function renderMpdFlightChoiceSection(item) {
  if (!item) return "";
  const locked = Boolean(item.paymentStarted);
  const option = (ownFlight) => {
    const selected = item.ownFlight === ownFlight;
    const title = ownFlight ? "Yes, I’ll get my own flight" : "No, I need flight support";
    const badge = ownFlight ? "$800 credit" : "No credit applied";
    const copy = ownFlight
      ? "Applied to your total residency price."
      : "We’ll follow up with flight options and support.";
    return `<button type="button" class="mpd-flight-option ${selected ? "is-selected" : ""}" data-mpd-flight-choice="${ownFlight ? "own" : "support"}" aria-pressed="${selected ? "true" : "false"}" ${locked ? "disabled" : ""}>
      <span class="mpd-flight-option__icon" aria-hidden="true"><img src="${mpdEscapeAttr(flightIconUrl)}" alt="" /></span>
      <span class="mpd-flight-option__copy">
        <strong>${escapeHtmlMpd(title)}</strong>
        <small>${escapeHtmlMpd(copy)}</small>
      </span>
      <span class="mpd-flight-option__badge">${escapeHtmlMpd(badge)}</span>
    </button>`;
  };
  return `<section class="mpd-flight-choice-card ${locked ? "is-locked" : ""}" aria-label="Flight pricing choice">
    <div class="mpd-flight-choice-card__head">
      <div class="mpd-flight-choice-card__icon" aria-hidden="true"><img src="${mpdEscapeAttr(flightIconUrl)}" alt="" /></div>
      <div>
        <p class="mpd-payments-eyebrow">Travel support</p>
        <h3>Will you be getting your own flight?</h3>
        <p class="studio-muted">This helps us tailor the information and support we provide.</p>
      </div>
    </div>
    <div class="mpd-flight-options">
      ${option(true)}
      ${option(false)}
    </div>
    <div class="mpd-flight-choice-card__note">
      <strong>${item.ownFlight ? "Flight credit applied" : "No flight credit applied"}</strong>
      <span>${item.ownFlight ? "The $800 credit will be applied to your balance once you confirm your program slot." : "Total residency price remains $5,000 when Fusion provides flight support."}</span>
      ${locked ? `<em>Flight choice is locked after payment activity starts.</em>` : ""}
    </div>
  </section>`;
}

function renderMpdPaymentsWorkspace() {
  const root = document.getElementById("mpd_program_payments_workspace");
  const tab = document.getElementById("mpd-program-tab-payments");
  if (!root || !tab) return;
  const items = mpdProgramPaymentItems;
  const hasItems = items.length > 0;
  tab.toggleAttribute("hidden", !hasItems);
  tab.setAttribute("aria-hidden", hasItems ? "false" : "true");
  if (!hasItems) {
    root.innerHTML = `<div class="mpd-program-placeholder"><h3>Payments</h3><p class="studio-muted">Program payments appear after you are approved for a program.</p></div>`;
    if (tab.classList.contains("is-active")) setMpdProgramsTab("my-programs");
    return;
  }
  if (!mpdSelectedPaymentProgramId || !items.some((x) => x.programId === mpdSelectedPaymentProgramId)) {
    mpdSelectedPaymentProgramId = items.find((x) => !x.depositPaid || x.outstandingCents > 0)?.programId || items[0].programId;
  }
  const item = items.find((x) => x.programId === mpdSelectedPaymentProgramId) || items[0];
  const canCharge = item.depositCents > 0 && item.totalDueCents > 0;
  const planButton = item.activePlan
    ? `<button type="button" class="studio-btn-primary" data-mpd-payment-action="cancel-plan">Cancel plan</button>`
    : `<button type="button" class="studio-btn-primary" data-mpd-payment-action="start-plan" ${item.outstandingCents <= 0 ? "disabled" : ""}>Start payment plan</button>`;
  const prePaymentHtml = !item.depositPaid
    ? `<div class="mpd-payment-choice-grid">
        <article class="mpd-payment-choice-program">
          <div class="mpd-payment-choice-program__media">
            ${
              item.imageSrc
                ? `<img src="${mpdEscapeAttr(item.imageSrc)}" alt="${mpdEscapeAttr(withSeoImageAlt(item.imageAlt || item.title))}" loading="lazy" />`
                : `<div class="mpd-payment-choice-program__placeholder">Fusion</div>`
            }
          </div>
          <div class="mpd-payment-choice-program__copy">
            <p class="mpd-payments-eyebrow">Confirm your program slot</p>
            <h3>${escapeHtmlMpd(item.title)}</h3>
            <p class="studio-muted">${escapeHtmlMpd(item.focus || "Choose how you would like to pay.")}</p>
          </div>
        </article>
        <div class="mpd-payment-choice-stack">
          <article class="mpd-payment-choice mpd-payment-choice--deposit">
            <h4>Deposit</h4>
            <span class="mpd-payment-choice__amount">${mpdUsd(item.depositCents)}</span>
            <p class="studio-muted">Secure your accepted program slot today. Remaining balance can be paid later.</p>
            <button type="button" class="studio-btn-primary" data-mpd-payment-action="deposit" ${canCharge ? "" : "disabled"}>Pay deposit</button>
          </article>
          <article class="mpd-payment-choice mpd-payment-choice--full mpd-payment-choice--recommended">
            <span class="mpd-payment-recommended">Recommended</span>
            <h4>${item.ownFlight ? "Total residency price (after flight credit)" : "Full payment"}</h4>
            <span class="mpd-payment-choice__amount">${mpdUsd(item.totalDueCents)}</span>
            <p class="studio-muted">Complete your program payment now. No payment plan needed.</p>
            <button type="button" class="studio-btn-primary" data-mpd-payment-action="full" ${canCharge ? "" : "disabled"}>Pay in full</button>
          </article>
        </div>
      </div>`
    : "";
  const postPaymentHtml = item.depositPaid
    ? `<div class="mpd-payments-action-grid">
        <article class="mpd-payments-action-card mpd-payments-action-card--manual">
          ${mpdInlineIconHtml(manualPaymentIconUrl, "mpd-payments-action-card__icon mpd-payments-action-card__icon--manual")}
          <div class="mpd-payments-action-card__copy">
            <h4>Make a manual payment</h4>
            <p class="studio-muted">Pay any amount toward your outstanding balance.</p>
          </div>
          <button type="button" class="studio-btn-primary" data-mpd-payment-action="manual" ${item.outstandingCents <= 0 ? "disabled" : ""}>Make a payment</button>
        </article>
        <article class="mpd-payments-action-card mpd-payments-action-card--plan">
          ${mpdInlineIconHtml(paymentPlanIconUrl, "mpd-payments-action-card__icon mpd-payments-action-card__icon--plan")}
          <div class="mpd-payments-action-card__copy">
            <h4>${item.activePlan ? "Payment plan active" : "Start a payment plan"}</h4>
            <p class="studio-muted">${item.activePlan ? "Cancel future installments if your plans change." : "Split the remaining balance into equal monthly payments."}</p>
          </div>
          ${planButton}
        </article>
      </div>
      <div class="mpd-payments-overview-grid">
        <div class="mpd-payments-overview-card mpd-payments-overview-card--paid">
          ${mpdInlineIconHtml(paymentsIconUrl, "mpd-payments-overview-card__icon")}
          <span>Total residency price</span>
          <strong>${mpdUsd(item.totalDueCents)}</strong>
          <small>${item.ownFlight ? "After flight credit" : "Flight support included"}</small>
        </div>
        <div class="mpd-payments-overview-card mpd-payments-overview-card--outstanding">
          ${mpdInlineIconHtml(warningIconUrl, "mpd-payments-overview-card__icon")}
          <span>Flight credit</span>
          <strong>${item.flightCreditCents ? `-${mpdUsd(item.flightCreditCents)}` : "$0.00"}</strong>
          <small>${item.ownFlight ? "Own-flight discount" : "No credit selected"}</small>
        </div>
        <div class="mpd-payments-overview-card mpd-payments-overview-card--upcoming">
          ${mpdInlineIconHtml(paymentPlanIconUrl, "mpd-payments-overview-card__icon")}
          <span>Total paid</span>
          <strong>${mpdUsd(item.totalPaidCents)}</strong>
          <small>Across ${item.ledger.length} payments</small>
        </div>
        <div class="mpd-payments-overview-card mpd-payments-overview-card--refunded">
          ${mpdInlineIconHtml(receiptDownloadIconUrl, "mpd-payments-overview-card__icon")}
          <span>Remaining balance</span>
          <strong>${mpdUsd(item.outstandingCents)}</strong>
          <small>${item.outstandingCents > 0 ? "Balance remaining" : "Paid in full"}</small>
        </div>
      </div>
      <div class="mpd-payments-detail-grid">
        <section class="mpd-payments-panel">
          <div class="mpd-payments-section-head"><h4>Payment history</h4><span class="studio-muted">Receipts and status</span></div>
          ${renderMpdPaymentHistory(item)}
        </section>
        <section class="mpd-payments-panel">
          <div class="mpd-payments-section-head"><h4>Upcoming payments</h4><span class="studio-muted">${item.activePlan ? "Plan scheduled" : "No active plan"}</span></div>
          ${
            item.activePlan
              ? `<div class="mpd-upcoming-payment-card"><strong>${escapeHtmlMpd(item.title)}</strong><span>${mpdUsd(item.activePlan.installmentAmountCents)} monthly</span><small>${escapeHtmlMpd(item.activePlan.installmentCount || "")} installments · ${escapeHtmlMpd(item.activePlan.status || "active")}</small></div>`
              : `<div class="mpd-payments-empty"><h4>No upcoming payments.</h4><p class="studio-muted">Start a payment plan to schedule installments.</p></div>`
          }
        </section>
      </div>`
    : "";
  root.innerHTML = `
    <div class="mpd-payments-shell">
      ${renderMpdProgramPaymentPills(items)}
      ${renderMpdFlightChoiceSection(item)}
      ${prePaymentHtml}
      ${postPaymentHtml}
    </div>
  `;
}

async function hydrateProgramPaymentsPanel(programs) {
  mpdLastProgramsForPayments = Array.isArray(programs) ? programs : [];
  let payments;
  try {
    payments = await getMyProgramPayments();
  } catch {
    payments = { approvedPrograms: [], summaries: [], ledger: [], plans: [] };
  }
  mpdProgramPaymentItems = normalizeMpdProgramPaymentViewModels(mpdLastProgramsForPayments, payments);
  renderMpdPaymentsWorkspace();
}

function mpdCurrentPaymentItem() {
  return mpdProgramPaymentItems.find((x) => x.programId === mpdSelectedPaymentProgramId) || mpdProgramPaymentItems[0] || null;
}

function applyMpdFlightChoiceToItem(item, ownFlight) {
  if (!item) return;
  item.ownFlight = Boolean(ownFlight);
  item.flightCreditCents = item.ownFlight ? MPD_PROGRAM_OWN_FLIGHT_CREDIT_CENTS : 0;
  item.totalDueCents = item.ownFlight
    ? Math.max(0, item.baseTotalDueCents - item.flightCreditCents)
    : item.baseTotalDueCents;
  item.outstandingCents = Math.max(0, item.totalDueCents - mpdCents(item.totalPaidCents));
  item.paidInFull = item.outstandingCents <= 0 && item.totalDueCents > 0;
}

async function updateMpdFlightChoice(choice) {
  const item = mpdCurrentPaymentItem();
  if (!item || item.paymentStarted) return;
  const ownFlight = choice === "own";
  if (item.ownFlight === ownFlight) return;
  const previous = {
    ownFlight: item.ownFlight,
    flightCreditCents: item.flightCreditCents,
    totalDueCents: item.totalDueCents,
    outstandingCents: item.outstandingCents,
    paidInFull: item.paidInFull,
  };
  applyMpdFlightChoiceToItem(item, ownFlight);
  renderMpdPaymentsWorkspace();
  try {
    await setMyProgramPaymentFlightPreference({
      programId: item.programId,
      applicationId: item.applicationId,
      ownFlight,
    });
  } catch (e) {
    Object.assign(item, previous);
    renderMpdPaymentsWorkspace();
    window.alert(e instanceof Error ? e.message : String(e));
  }
}

function closeMpdPaymentModal() {
  document.getElementById("mpdProgramPaymentModal")?.remove();
  try {
    document.body.style.overflow = "";
  } catch {
    /* ignore */
  }
}

function openMpdPaymentModalShell(title, bodyHtml) {
  closeMpdPaymentModal();
  const wrap = document.createElement("div");
  wrap.id = "mpdProgramPaymentModal";
  wrap.className = "settings-profile-page profile-gallery-access-modal mpd-program-payment-modal";
  wrap.innerHTML = `
    <div class="profile-gallery-access-modal__scrim" data-mpd-payment-close aria-hidden="true"></div>
    <div class="profile-gallery-access-modal__panel mpd-program-payment-modal__panel" role="dialog" aria-modal="true" aria-labelledby="mpdProgramPaymentModalTitle">
      <button type="button" class="profile-gallery-access-modal__close" data-mpd-payment-close aria-label="Close payment modal">×</button>
      <h2 id="mpdProgramPaymentModalTitle" class="profile-gallery-access-modal__title">${escapeHtmlMpd(title)}</h2>
      ${bodyHtml}
    </div>
  `;
  document.body.appendChild(wrap);
  document.body.style.overflow = "hidden";
  wrap.addEventListener("click", (e) => {
    const close = e.target && /** @type {Element} */ (e.target).closest?.("[data-mpd-payment-close]");
    if (close) closeMpdPaymentModal();
  });
  return wrap;
}

function mpdPaymentLoadingHtml(text = "Loading payment") {
  return `<div class="mpd-payment-loading" role="status" aria-live="polite">
    <span class="mpd-payment-loading__spinner" aria-hidden="true"></span>
    <span class="mpd-payment-loading__text">${escapeHtmlMpd(text)}</span>
  </div>`;
}

async function openMpdStripePaymentModal(item, paymentType, amountCents) {
  if (!item || amountCents <= 0) return;
  const snap = await getAuthSnapshot();
  if (!snap.authenticated) {
    window.alert("Sign in to make a program payment.");
    return;
  }
  const title =
    paymentType === "deposit"
      ? "Pay program deposit"
      : paymentType === "full_payment"
        ? "Pay in full"
        : "Make a manual payment";
  const modal = openMpdPaymentModalShell(
    title,
    `<div class="mpd-program-payment-modal__body">
      <p class="studio-muted">${escapeHtmlMpd(item.title)} · ${mpdUsd(amountCents)}</p>
      <div id="mpdProgramStripeMount" class="mpd-program-stripe-mount">${mpdPaymentLoadingHtml()}</div>
      <p id="mpdProgramPaymentError" class="mpd-membership-inline-error" hidden></p>
      <div class="mpd-program-payment-modal__actions">
        <button type="button" class="studio-btn-primary" id="mpdProgramPaymentSubmit" disabled>Pay ${mpdUsd(amountCents)}</button>
      </div>
    </div>`,
  );
  const errEl = modal.querySelector("#mpdProgramPaymentError");
  const submit = /** @type {HTMLButtonElement | null} */ (modal.querySelector("#mpdProgramPaymentSubmit"));
  const mount = modal.querySelector("#mpdProgramStripeMount");
  try {
    const [{ loadStripe }, svc, cfg] = await Promise.all([
      import("@stripe/stripe-js"),
      import("../utils/integrationApi.js"),
      import("../utils/studioServicesConfig.js"),
    ]);
    const pk = cfg.getStripePublishableKeyResolved();
    if (!pk) throw new Error("Configure Stripe publishable key in Studio → Services.");
    const intent = await svc.createProgramPaymentIntent({
      principal: snap.principal.toText(),
      programId: item.programId,
      applicationId: item.applicationId,
      email: item.email,
      applicantName: item.fullName,
      paymentType,
      amountCents,
      totalDueCents: item.totalDueCents,
      depositAmountCents: item.depositCents,
      ownFlight: item.ownFlight,
      flightCreditCents: item.flightCreditCents,
    });
    const stripe = await loadStripe(pk);
    if (!stripe) throw new Error("Stripe failed to load.");
    const elements = stripe.elements({ clientSecret: intent.clientSecret, appearance: { theme: "stripe" } });
    const paymentElement = elements.create("payment");
    if (mount) {
      mount.textContent = "";
      paymentElement.mount(mount);
    }
    if (submit) submit.disabled = false;
    submit?.addEventListener("click", async () => {
      if (submit) {
        submit.disabled = true;
        submit.textContent = "Processing…";
      }
      try {
        const result = await stripe.confirmPayment({
          elements,
          redirect: "if_required",
          confirmParams: { return_url: window.location.href },
        });
        if (result.error) throw new Error(result.error.message || "Payment failed.");
        await svc.confirmProgramPaymentRecorded(intent.paymentIntentId);
        closeMpdPaymentModal();
        await hydrateProgramPaymentsPanel(mpdLastProgramsForPayments);
      } catch (e) {
        if (errEl instanceof HTMLElement) {
          errEl.hidden = false;
          errEl.textContent = e instanceof Error ? e.message : String(e);
        }
        if (submit) {
          submit.disabled = false;
          submit.textContent = `Pay ${mpdUsd(amountCents)}`;
        }
      }
    });
  } catch (e) {
    if (errEl instanceof HTMLElement) {
      errEl.hidden = false;
      errEl.textContent = e instanceof Error ? e.message : String(e);
    }
  }
}

function openMpdManualPaymentModal(item) {
  if (!item) return;
  const modal = openMpdPaymentModalShell(
    "Make a manual payment",
    `<div class="mpd-program-payment-modal__body">
      <p class="studio-muted">${escapeHtmlMpd(item.title)} · outstanding ${mpdUsd(item.outstandingCents)}</p>
      <div class="mpd-manual-payment-options" role="radiogroup" aria-label="Manual payment amount">
        <label class="mpd-payment-radio-option"><input type="radio" name="mpdManualPaymentMode" value="custom" checked /> <span>Custom amount</span></label>
        <label class="mpd-payment-radio-option"><input type="radio" name="mpdManualPaymentMode" value="remaining" /> <span>Pay remaining balance</span></label>
      </div>
      <label class="studio-field">
        <span>Amount (USD)</span>
        <input type="number" min="1" step="0.01" id="mpdManualPaymentAmount" class="studio-input" value="${Math.max(1, Math.min(item.outstandingCents, item.depositCents || item.outstandingCents) / 100).toFixed(2)}" />
      </label>
      <div class="mpd-program-payment-modal__actions">
        <button type="button" class="studio-btn-primary" id="mpdManualPaymentContinue">Continue to payment</button>
      </div>
    </div>`,
  );
  const amount = /** @type {HTMLInputElement | null} */ (modal.querySelector("#mpdManualPaymentAmount"));
  modal.querySelectorAll('input[name="mpdManualPaymentMode"]').forEach((el) => {
    el.addEventListener("change", () => {
      const mode = String((modal.querySelector('input[name="mpdManualPaymentMode"]:checked') || {}).value || "custom");
      if (amount) {
        amount.value = mode === "remaining" ? (item.outstandingCents / 100).toFixed(2) : amount.value;
        amount.readOnly = mode === "remaining";
      }
    });
  });
  modal.querySelector("#mpdManualPaymentContinue")?.addEventListener("click", () => {
    const cents = Math.min(item.outstandingCents, Math.round(Number(amount?.value || 0) * 100));
    if (cents < 50) {
      window.alert("Enter at least $0.50.");
      return;
    }
    closeMpdPaymentModal();
    void openMpdStripePaymentModal(item, "manual", cents);
  });
}

function mpdPaymentPlanOptions(item) {
  const months = mpdDateMonthsUntil(item.startText);
  const max = Math.max(0, months);
  const options = [];
  for (let count = max; count >= 2; count -= 1) {
    options.push({
      count,
      amountCents: Math.ceil(item.outstandingCents / count),
    });
  }
  if (!options.length && item.outstandingCents >= 100) {
    options.push({ count: 2, amountCents: Math.ceil(item.outstandingCents / 2) });
  }
  return options.slice(0, 4);
}

function openMpdPaymentPlanModal(item) {
  if (!item) return;
  const options = mpdPaymentPlanOptions(item);
  const modal = openMpdPaymentModalShell(
    "Start a payment plan",
    `<div class="mpd-program-payment-modal__body">
      <p class="studio-muted">${escapeHtmlMpd(item.title)} · remaining ${mpdUsd(item.outstandingCents)}</p>
      ${
        options.length
          ? `<div class="mpd-plan-options">${options
              .map(
                (opt, i) => `<label class="mpd-plan-option mpd-payment-radio-option">
                  <input type="radio" name="mpdPlanOption" value="${i}" ${i === 0 ? "checked" : ""} />
                  <span><strong>${opt.count} monthly payments</strong><small>${mpdUsd(opt.amountCents)} per month</small></span>
                </label>`,
              )
              .join("")}</div>`
          : `<div class="mpd-payments-empty"><h4>Payment plan unavailable.</h4><p class="studio-muted">Use manual payment for this balance.</p></div>`
      }
      <p id="mpdPlanError" class="mpd-membership-inline-error" hidden></p>
      <div id="mpdPlanStripeMount" class="mpd-program-stripe-mount" hidden></div>
      <div class="mpd-program-payment-modal__actions">
        <button type="button" class="studio-btn-primary" id="mpdPlanContinue" ${options.length ? "" : "disabled"}>Start selected plan</button>
      </div>
    </div>`,
  );
  const errEl = modal.querySelector("#mpdPlanError");
  const mount = /** @type {HTMLElement | null} */ (modal.querySelector("#mpdPlanStripeMount"));
  const btn = /** @type {HTMLButtonElement | null} */ (modal.querySelector("#mpdPlanContinue"));
  btn?.addEventListener("click", async () => {
    const snap = await getAuthSnapshot();
    if (!snap.authenticated) {
      window.alert("Sign in to start a payment plan.");
      return;
    }
    const selected = Number((modal.querySelector('input[name="mpdPlanOption"]:checked') || {}).value || 0);
    const opt = options[selected];
    if (!opt) return;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Creating plan…";
    }
    if (mount) {
      mount.hidden = false;
      mount.innerHTML = mpdPaymentLoadingHtml("Loading payment plan");
    }
    try {
      const [{ loadStripe }, svc, cfg] = await Promise.all([
        import("@stripe/stripe-js"),
        import("../utils/integrationApi.js"),
        import("../utils/studioServicesConfig.js"),
      ]);
      const pk = cfg.getStripePublishableKeyResolved();
      if (!pk) throw new Error("Configure Stripe publishable key in Studio → Services.");
      const plan = await svc.createProgramPaymentPlan({
        principal: snap.principal.toText(),
        email: item.email,
        programId: item.programId,
        applicationId: item.applicationId,
        installmentCount: opt.count,
        installmentAmountCents: opt.amountCents,
        totalDueCents: item.totalDueCents,
        depositAmountCents: item.depositCents,
        ownFlight: item.ownFlight,
        flightCreditCents: item.flightCreditCents,
        planStartAt: new Date().toISOString(),
        planEndAt: item.startText || "",
      });
      const stripe = await loadStripe(pk);
      if (!stripe) throw new Error("Stripe failed to load.");
      const elements = stripe.elements({ clientSecret: plan.clientSecret, appearance: { theme: "stripe" } });
      const paymentElement = elements.create("payment");
      if (mount) {
        mount.hidden = false;
        mount.textContent = "";
        paymentElement.mount(mount);
      }
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Confirm first payment";
      }
      btn?.addEventListener(
        "click",
        async () => {
          if (btn) {
            btn.disabled = true;
            btn.textContent = "Processing…";
          }
          const result = await stripe.confirmPayment({
            elements,
            redirect: "if_required",
            confirmParams: { return_url: window.location.href },
          });
          if (result.error) throw new Error(result.error.message || "Payment failed.");
          await svc.confirmProgramPaymentRecorded(plan.paymentIntentId);
          closeMpdPaymentModal();
          await hydrateProgramPaymentsPanel(mpdLastProgramsForPayments);
        },
        { once: true },
      );
    } catch (e) {
      if (errEl instanceof HTMLElement) {
        errEl.hidden = false;
        errEl.textContent = e instanceof Error ? e.message : String(e);
      }
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Start selected plan";
      }
    }
  }, { once: true });
}

async function cancelMpdProgramPaymentPlan(item) {
  if (!item?.activePlan) return;
  if (!window.confirm("Cancel this payment plan? Future scheduled installments will stop.")) return;
  try {
    const { cancelProgramPaymentPlan } = await import("../utils/integrationApi.js");
    await cancelProgramPaymentPlan({
      planId: String(item.activePlan.id || ""),
      subscriptionId: String(item.activePlan.stripeSubscriptionId || ""),
    });
    await hydrateProgramPaymentsPanel(mpdLastProgramsForPayments);
  } catch (e) {
    window.alert(e instanceof Error ? e.message : String(e));
  }
}

/** @param {unknown} value */
function detailIsObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
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

function openMpdSaveChoiceModal() {
  const modal = document.getElementById("mpdSaveChoiceModal");
  if (!modal) return;
  document.body.appendChild(modal);
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
}

function closeMpdSaveChoiceModal() {
  const modal = document.getElementById("mpdSaveChoiceModal");
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
}

function wireMpdSaveChoiceModal() {
  const modal = document.getElementById("mpdSaveChoiceModal");
  if (!modal || modal.dataset.mpdSaveChoiceModalWired === "1") return;
  modal.dataset.mpdSaveChoiceModalWired = "1";
  const scrim = modal.querySelector(".profile-gallery-access-modal__scrim");
  const cancelBtn = modal.querySelector("#mpdSaveChoiceCancel");
  const justSaveBtn = modal.querySelector("#mpdSaveChoiceJustSave");
  const translateBtn = modal.querySelector("#mpdSaveChoiceTranslate");
  const cancel = () => {
    closeMpdSaveChoiceModal();
    window.dispatchEvent(
      new CustomEvent("fusion-settings-profile-save-choice", {
        detail: { action: "cancel" },
      }),
    );
  };
  scrim?.addEventListener("click", cancel);
  cancelBtn?.addEventListener("click", cancel);
  justSaveBtn?.addEventListener("click", () => {
    closeMpdSaveChoiceModal();
    window.dispatchEvent(
      new CustomEvent("fusion-settings-profile-save-choice", {
        detail: { action: "save", translate: false },
      }),
    );
  });
  translateBtn?.addEventListener("click", () => {
    closeMpdSaveChoiceModal();
    window.dispatchEvent(
      new CustomEvent("fusion-settings-profile-save-choice", {
        detail: { action: "save", translate: true },
      }),
    );
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && !modal.hidden) cancel();
  });
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
  const applicationIds = Object.keys(applied).filter(Boolean);
  const countBadge = document.getElementById("mpd_my_programs_count");
  if (countBadge) {
    countBadge.textContent = String(applicationIds.length);
    countBadge.toggleAttribute("hidden", applicationIds.length === 0);
    countBadge.setAttribute("aria-label", `${applicationIds.length} applications`);
  }
  if (applicationIds.length === 0) {
    container.innerHTML = `
      <div class="mpd-programs-empty-state mpd-my-program-empty">
        <h4>No applications yet.</h4>
        <p class="studio-muted">When you apply to a Fusion program, your status and next steps will appear here.</p>
      </div>
    `;
    await hydrateProgramPaymentsPanel(programs);
    return;
  }
  let paymentState = { approvedPrograms: [], summaries: [], ledger: [], plans: [] };
  try {
    paymentState = await getMyProgramPayments();
  } catch {
    /* keep empty payment state */
  }
  const slotSecuredProgramIds = mpdSlotSecuredProgramIds(paymentState);
  const cards = applicationIds
    .map((pid) => {
      const pr =
        programs.find((x) => String(x.id) === String(pid)) ||
        ({ id: pid, enCard: { focus: pid } });
      return normalizeMpdMyProgramCard(
        /** @type {Record<string, unknown>} */ (pr),
        pid,
        { ...mpdObject(applied[pid]), slotSecured: slotSecuredProgramIds.has(String(pid)) },
      );
    })
    .sort((a, b) => String(b.submittedAt || "").localeCompare(String(a.submittedAt || "")));
  container.innerHTML = `
    <div class="mpd-my-program-cards">
      ${cards.map(renderMpdMyProgramCard).join("")}
    </div>
    <div id="mpd_my_programs_no_results" class="mpd-programs-empty-state mpd-my-program-empty" hidden>
      <h4>No applications match this filter.</h4>
      <p class="studio-muted">Choose another status to see more applications.</p>
    </div>
  `;
  for (const chip of document.querySelectorAll("[data-mpd-my-program-filter]")) {
    const key = chip.getAttribute("data-mpd-my-program-filter") || "all";
    const count =
      key === "all" ? cards.length : cards.filter((card) => card.status.key === key).length;
    const countEl = chip.querySelector(".mpd-my-program-filter__count");
    if (countEl) countEl.textContent = String(count);
  }
  applyMpdMyProgramsFilters();
  await hydrateProgramPaymentsPanel(programs);
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
    container.innerHTML = `
      <div class="mpd-programs-empty-state">
        <h4>No public programs are listed yet.</h4>
        <p class="studio-muted">When Fusion publishes new public opportunities, they will appear here.</p>
      </div>
    `;
    return;
  }
  const grid = document.createElement("div");
  grid.className = "mpd-public-programs-grid";
  /** @type {Set<string>} */
  const categoryOptions = new Set();
  for (const pr of publicProgs) {
    const en = pr?.enCard && typeof pr.enCard === "object" ? pr.enCard : {};
    const ja =
      pr?.jaCard && typeof pr.jaCard === "object" ? pr.jaCard : {};
    const focus = mpdText(en.focus ?? en.headline);
    const location = mpdText(en.location) || mpdText(en.headline);
    const title =
      location ||
      focus ||
      mpdText(en.headline) ||
      mpdText(pr.id);
    const startDate = mpdText(en.startDate);
    const endDate = mpdText(en.endDate);
    const year = mpdText(en.year);
    const openTo = firstNonEmptyString(
      en.openTo,
      en.audience,
      en.eligibility,
      en.discipline,
      en.medium,
    );
    const deadline = firstNonEmptyString(
      en.deadline,
      en.applicationDeadline,
      en.deadlineDate,
      en.applyBy,
      startDate && endDate ? `${startDate} - ${endDate}` : startDate || endDate,
      year,
    );
    const category = firstNonEmptyString(en.category, en.type, focus);
    const categoryKey = category.toLowerCase().replace(/\s+/g, "-");
    if (category) categoryOptions.add(category);
    const studioStatus = mpdText(pr?.studioStatus).toLowerCase();
    const imageSrc = firstNonEmptyString(
      /** @type {Record<string, unknown>} */ (ja).imageSrc,
      /** @type {Record<string, unknown>} */ (en).imageSrc,
    );
    const imageAlt = mpdText(en.imageAlt ?? en.focus ?? title) || title;
    let route = "/programs";
    if (pr?.routeLink) {
      const rl = String(pr.routeLink);
      route = rl.startsWith("/") ? rl : `/${rl}`;
    }
    const card = document.createElement("article");
    card.className = "mpd-public-program-card mpd-public-program-card--rich";
    card.dataset.status = studioStatus || "unknown";
    card.dataset.category = categoryKey;
    card.dataset.search = [
      title,
      focus,
      location,
      openTo,
      deadline,
      category,
      pr?.id,
      route,
      studioStatus,
    ]
      .filter(Boolean)
      .join(" ");

    const link = document.createElement("a");
    link.className = "mpd-public-program-card__link-rich";
    link.href = route;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    const imgWrap = document.createElement("div");
    imgWrap.className = "mpd-public-program-card__image-wrap";
    const foc = document.createElement("div");
    foc.className = "mpd-public-program-card__focus";
    foc.textContent = category || focus || "Program";
    imgWrap.appendChild(foc);
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
    tEl.textContent = title || location;
    body.appendChild(tEl);

    const meta = document.createElement("div");
    meta.className = "mpd-public-program-card__meta";
    const addMetaRow = (label, value) => {
      const text = mpdText(value);
      if (!text) return;
      const row = document.createElement("p");
      row.className = "mpd-public-program-card__meta-row";
      row.innerHTML = `<strong>${escapeHtmlMpd(label)}:</strong> ${escapeHtmlMpd(text)}`;
      meta.appendChild(row);
    };
    addMetaRow("Program", focus);
    addMetaRow("Open to", openTo);
    addMetaRow("Deadline", deadline);
    if (meta.childElementCount) {
      body.appendChild(meta);
    }

    const cta = document.createElement("span");
    cta.className = "mpd-public-program-card__cta";
    cta.textContent = "View details ->";
    body.appendChild(cta);
    link.appendChild(body);

    card.appendChild(link);
    grid.appendChild(card);
  }
  const filter = /** @type {HTMLSelectElement | null} */ (
    document.getElementById("mpd_public_programs_filter")
  );
  if (filter) {
    const current = filter.value || "all";
    const categoryHtml = Array.from(categoryOptions)
      .sort((a, b) => a.localeCompare(b))
      .map((label) => {
        const value = `category:${label.toLowerCase().replace(/\s+/g, "-")}`;
        return `<option value="${escapeHtmlMpd(value)}">${escapeHtmlMpd(label)}</option>`;
      })
      .join("");
    filter.innerHTML = `
      <option value="all">All programs</option>
      <option value="open">Open now</option>
      <option value="not-open">Not open yet</option>
      ${categoryHtml}
    `;
    filter.value = Array.from(filter.options).some((opt) => opt.value === current)
      ? current
      : "all";
  }
  container.appendChild(grid);
  const noResults = document.createElement("div");
  noResults.id = "mpd_public_programs_no_results";
  noResults.className = "mpd-programs-empty-state";
  noResults.hidden = true;
  noResults.innerHTML = `
    <h4>No programs match your search.</h4>
    <p class="studio-muted">Try a different keyword or clear the filter to see all public programs.</p>
  `;
  container.appendChild(noResults);
  applyMpdPublicProgramFilters();
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
  const storyCardFooter = `<div class="member-profile-dashboard__card-footer"><button type="button" class="mpd-section-save mpd-section-save--primary" id="mpd_story_save">Save</button></div>`;
  const introSlotsHtml = [0, 1, 2]
    .map((i) => {
      const suggestedRatio = ["5:4", "1:1", "16:9"][i] || "5:4";
      return `
                        <div class="member-profile-dashboard__intro-slot member-profile-dashboard__intro-slot--${String(
                          i + 1,
                        )}">
                            <div class="member-profile-dashboard__intro-preview-col">
                                <input type="hidden" id="mpd_intro_${i}_src" />
                                <input type="hidden" id="mpd_intro_${i}_alt" />
                                <input type="hidden" id="mpd_intro_${i}_caption" />
                                <input type="file" id="mpd_intro_${i}_file" class="mpd-file-input-hidden" accept="image/*" data-intro-slot="${String(
                                  i,
                                )}" />
                                <div class="member-profile-dashboard__intro-preview-wrap mpd-media-upload-surface" data-mpd-media-surface="intro-${i}">
                                    <label for="mpd_intro_${i}_file" class="mpd-media-upload-label" aria-label="Upload introductory work image ${String(
                                      i + 1,
                                    )}">
                                        <div class="mpd-media-spinner" id="mpd_intro_${i}_spinner" hidden aria-hidden="true"></div>
                                        <img id="mpd_intro_${i}_thumb" class="member-profile-dashboard__intro-thumb" alt="${withSeoImageAlt('Profile intro artwork preview')}" style="display:none" />
                                        <span class="mpd-media-placeholder" aria-hidden="true">Image ${String(i + 1)}</span>
                                        <span class="mpd-media-overlay" aria-hidden="true">
                                            <span class="mpd-media-overlay__empty">Upload</span>
                                            <span class="mpd-media-overlay__filled">Replace</span>
                                            <small class="mpd-media-overlay__ratio">Suggested ${suggestedRatio}</small>
                                        </span>
                                    </label>
                                    <button type="button" class="mpd-media-delete" data-mpd-media-delete="intro-${i}">Delete</button>
                                </div>
                            </div>
                        </div>`;
    })
    .join("");
  const devNavBtn = DEV_MODE
    ? `<button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="dev">${mpdNavIconHtml(
        "artist-system-info",
      )}<span class="studio-nav-item__label">Developer</span></button>`
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
  const storyEditIcon = studioIconHref("assist-refine");
  const storyEditIconHtml = storyEditIcon
    ? `<img src="${mpdEscapeAttr(storyEditIcon)}" alt="" />`
    : '<span aria-hidden="true">✎</span>';

  return `
        <div class="page settings-profile-page">
            <app-profile-save-status id="settingsProfileFloatingSaveStatus" hidden aria-hidden="true"></app-profile-save-status>
            <div id="mpd_upload_overlay" class="mpd-upload-overlay" hidden aria-hidden="true">
                <div class="mpd-upload-overlay__panel" role="status" aria-live="polite">
                    <div class="mpd-upload-overlay__spinner" aria-hidden="true"></div>
                    <p id="mpd_upload_overlay_label">Uploading image...</p>
                </div>
            </div>
            <main id="settingsMain" class="main-cont">
                <div id="settingsMainContent" class="feed-container">
        <div class="studio-app settings-profile-studio" id="mpd_root">
            <div class="studio-nav-backdrop" id="settingsProfileNavBackdrop" hidden aria-hidden="true"></div>
            <aside class="studio-sidebar" id="settingsProfileSidebar" aria-label="Profile navigation">
                <button type="button" class="studio-wordmark studio-wordmark-btn" id="settingsProfileWordmark" aria-label="Fusion home">Fusion</button>
                <p class="settings-profile-slug-line" id="mpd_sidebar_slug">—</p>
                <nav class="studio-nav" id="settingsProfileNav" aria-label="Profile sections">
                    <button type="button" class="studio-nav-item mpd-nav-btn is-active" data-mpd-panel="overview">${mpdNavIconHtml(
                      "artist-overview",
                    )}<span class="studio-nav-item__label">Overview</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="location">${mpdNavIconHtml(
                      "nav-status",
                    )}<span class="studio-nav-item__label">Status</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="story">${mpdNavIconHtml(
                      "assist-context",
                    )}<span class="studio-nav-item__label">Story &amp; world</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="programs">${mpdNavIconHtml(
                      "nav-programs",
                    )}<span class="studio-nav-item__label">Programs</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="membership">${mpdNavIconHtml(
                      "nav-subscribers",
                    )}<span class="studio-nav-item__label">Membership</span></button>
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
                        <button type="button" class="studio-btn-primary studio-nav-contact__send" id="settingsProfileNavContactSend" style="justify-content: end;">
                            Send
                        </button>
                        <p id="settingsProfileNavContactStatus" class="studio-nav-contact__status" role="status"></p>
                    </div>
                    <div class="mpd-sidebar-cta-row" aria-label="Profile quick actions">
                        <a class="program-intro-cta mpd-program-intro-cta mpd-sidebar-cta" id="mpd_view_profile" href="#" target="_blank" rel="noopener noreferrer">View public profile</a>
                        <button type="button" class="program-intro-cta mpd-program-intro-cta mpd-sidebar-cta" id="mpd_apply_residency" data-program-path="${MPD_APPLY_PROGRAM_PATH}" data-apply-open="true">Apply to Residency</button>
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
                </header>
                <div class="studio-main settings-profile-main" id="settingsProfileScrollMain">
                <p id="settingsProfileStatus" class="member-profile-dashboard__status-line" role="status"></p>
                <div id="settingsProfileInitialLoading" class="mpd-initial-loading" role="status" aria-live="polite">
                    <div class="mpd-initial-loading__spinner" aria-hidden="true"></div>
                    <p>Loading profile settings...</p>
                </div>
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
                    <div class="mpd-panels">
                        <div class="mpd-panel" id="mpd-panel-overview" data-mpd-panel="overview">
                            <section class="member-profile-dashboard__card" id="mpd-overview">
                                <h2>Overview</h2>
                                <div class="studio-field studio-field--full mpd-visibility-field mpd-visibility-source">
                                    <span>Artist profile visibility</span>
                                    <input type="hidden" id="mpd_profile_visibility" value="inactive" />
                                    <div class="mpd-visibility-toggle" role="group" aria-label="Artist profile visibility" aria-describedby="mpd_profile_visibility_hint">
                                        <button type="button" class="mpd-visibility-toggle__btn is-active" data-mpd-visibility="inactive" aria-pressed="true">Inactive</button>
                                        <button type="button" class="mpd-visibility-toggle__btn" data-mpd-visibility="private" aria-pressed="false">Private</button>
                                        <button type="button" class="mpd-visibility-toggle__btn" data-mpd-visibility="public" aria-pressed="false">Public</button>
                                    </div>
                                    <span id="mpd_profile_visibility_review_notice" class="mpd-visibility-review-notice" hidden>Submitted for review</span>
                                    <span id="mpd_profile_visibility_hint" class="mpd-field-hint">Choose <strong>Public</strong> to submit your profile for staff review. Approved public profiles stay public until changed to <strong>Private</strong> or <strong>Inactive</strong>.</span>
                                </div>
                                <p id="mpd_datasource_pill" class="member-profile-dashboard__pill" style="display:none;margin-top:0.75rem"></p>

                                <h2 class="mpd-identity-h2">Identity &amp; presence</h2>
                                <p class="studio-muted">Name, discipline, bios, and media — save when you are ready.</p>
                                <h3 class="mpd-identity-subhead">Name &amp; discipline</h3>
                                <div class="studio-form-grid mpd-editorial-grid">
                                    <label class="studio-field"><span>First name</span>
                                        <input type="text" id="mpd_first_name" class="studio-input" autocomplete="given-name" placeholder="First name" />
                                    </label>
                                    <label class="studio-field"><span>Last name</span>
                                        <input type="text" id="mpd_last_name" class="studio-input" autocomplete="family-name" placeholder="Last name" />
                                    </label>
                                    <label class="studio-field studio-field--full"><span>Discipline</span>
                                        <input type="text" id="mpd_discipline" class="studio-input" placeholder="Painting, sound, installation..." />
                                    </label>
                                </div>

                                <div class="studio-form-grid mpd-editorial-grid">
                                    <label class="studio-field studio-field--full"><span>Bio</span>
                                        <textarea id="mpd_bio" class="studio-textarea" rows="5" placeholder="Tell the story behind your work..."></textarea>
                                    </label>
                                </div>

                                <h3 class="mpd-identity-subhead">Digital Footprint</h3>
                                <p class="studio-muted">Website, social, and other links that shape how people find you beyond this site.</p>
                                <div id="mpd-links"></div>
                                <button type="button" class="studio-btn-ghost" id="mpd_links_add">Add link</button>

                                <div class="mpd-hero-media-row">
                                    <div class="mpd-hero-media-row__main">
                                        <h3 class="studio-subheading mpd-media-subhead">Main Artwork</h3>
                                        <p class="studio-muted mpd-media-helper">
                                          Use a high-quality image of your work. A <strong>5:4</strong> aspect ratio
                                          is preferred. Max <strong>1 MB</strong> per file.
                                        </p>
                                        <input type="hidden" id="mpd_hero_url" value="" />
                                        <input type="file" id="mpd_hero_file" class="mpd-file-input-hidden" accept="image/*" />
                                        <div class="member-profile-dashboard__hero-preview-wrap mpd-media-upload-surface mpd-media-upload-surface--hero" data-mpd-media-surface="hero">
                                            <label for="mpd_hero_file" class="mpd-media-upload-label" aria-label="Upload main artwork">
                                                <div class="mpd-media-spinner" id="mpd_hero_spinner" hidden aria-hidden="true"></div>
                                                <img id="mpd_hero_preview" class="member-profile-dashboard__hero-preview" alt="${withSeoImageAlt('Profile hero image preview')}" />
                                                <span class="mpd-media-placeholder" aria-hidden="true">Main Artwork</span>
                                                <span class="mpd-media-overlay" aria-hidden="true">
                                                    <span class="mpd-media-overlay__empty">Upload</span>
                                                    <span class="mpd-media-overlay__filled">Replace</span>
                                                </span>
                                            </label>
                                            <button type="button" class="mpd-media-delete" data-mpd-media-delete="hero">Delete</button>
                                        </div>
                                    </div>

                                    <div class="mpd-hero-media-row__profile">
                                        <h3 class="studio-subheading mpd-media-subhead">Profile Card</h3>
                                        <p class="studio-muted mpd-media-helper">
                                          Optional portrait for your profile cards. Falls back to the main artwork when empty.
                                          Max <strong>1 MB</strong> per file.
                                        </p>
                                        <input type="hidden" id="mpd_hero_profile_url" value="" />
                                        <input type="file" id="mpd_hero_profile_file" class="mpd-file-input-hidden" accept="image/*" />
                                        <div class="mpd-profile-card-upload mpd-media-upload-surface" data-mpd-media-surface="heroProfile">
                                            <label for="mpd_hero_profile_file" class="mpd-profile-card-upload__label mpd-media-upload-label" aria-label="Upload profile card image">
                                                <div class="mpd-profile-card-upload__image">
                                                    <div class="mpd-media-spinner" id="mpd_hero_profile_spinner" hidden aria-hidden="true"></div>
                                                    <img id="mpd_hero_profile_preview" class="member-profile-dashboard__hero-preview" alt="${withSeoImageAlt('Profile headshot preview')}" />
                                                    <span class="mpd-media-placeholder" aria-hidden="true">Profile Card</span>
                                                    <span class="mpd-media-overlay" aria-hidden="true">
                                                        <span class="mpd-media-overlay__empty">Upload</span>
                                                        <span class="mpd-media-overlay__filled">Replace</span>
                                                    </span>
                                                </div>
                                                <div class="mpd-profile-card-upload__body" aria-hidden="true">
                                                    <span id="mpd_hero_profile_card_name" class="mpd-profile-card-upload__name">Artist Name</span>
                                                    <span id="mpd_hero_profile_card_discipline" class="mpd-profile-card-upload__discipline">Discipline</span>
                                                </div>
                                            </label>
                                            <button type="button" class="mpd-media-delete" data-mpd-media-delete="heroProfile">Delete</button>
                                        </div>
                                    </div>
                                </div>

                                <h3 class="studio-subheading mpd-media-subhead">Introductory Work</h3>
                                <div class="member-profile-dashboard__intro-grid">
                                    ${introSlotsHtml}
                                </div>
                                <div id="mpd_audio_section" class="mpd-audio-section">
                                <h3 class="studio-subheading mpd-media-subhead">Audio bite</h3>
                                <p class="studio-muted mpd-media-helper">Upload a short audio bite for journal audio rows.</p>
                                <input type="hidden" id="mpd_audio_url" value="" />
                                <input type="file" id="mpd_audio_file" class="mpd-file-input-hidden" accept="audio/*" />
                                <label for="mpd_audio_file" class="mpd-upload-btn">Upload audio bite</label>
                                <label class="studio-field studio-field--full"><span>Audio title</span>
                                    <input type="text" id="mpd_audio_title" class="studio-input" />
                                </label>
                                </div>
                                ${cardFooter}
                            </section>
                        </div>

                        <div class="mpd-panel" id="mpd-panel-location" data-mpd-panel="location" hidden>
                            <section class="member-profile-dashboard__card" id="mpd-location">
                                <h2>Status</h2>
                                <p class="studio-muted">Status and location for the selected language.</p>
                                <div class="studio-form-grid mpd-editorial-grid mpd-editorial-grid--status">
                                    <div class="studio-field studio-field--full mpd-status-source">
                                        <span>Status</span>
                                        <input type="hidden" id="mpd_status" value="studio" />
                                        <div class="mpd-status-toggle" role="group" aria-label="Artist status">
                                            <button type="button" class="mpd-status-toggle__btn is-active" data-mpd-status="studio" aria-pressed="true">In studio</button>
                                            <button type="button" class="mpd-status-toggle__btn" data-mpd-status="prep" aria-pressed="false">Preparing for exhibition</button>
                                            <button type="button" class="mpd-status-toggle__btn" data-mpd-status="showing" aria-pressed="false">Show in progress</button>
                                            <button type="button" class="mpd-status-toggle__btn" data-mpd-status="available" aria-pressed="false">Available for commissions</button>
                                        </div>
                                    </div>
                                    <label class="studio-field"><span>City</span>
                                        <input type="text" id="mpd_loc_city" class="studio-input" placeholder="City" />
                                    </label>
                                    <label class="studio-field"><span>State / region</span>
                                        <input type="text" id="mpd_loc_state" class="studio-input" placeholder="State or region" />
                                    </label>
                                    <label class="studio-field"><span>Country</span>
                                        <input type="text" id="mpd_loc_country" class="studio-input" placeholder="Country" />
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
                                <div class="mpd-story-public-source">
                                    <input type="hidden" id="mpd_public_world_source" value="world" />
                                    <div class="mpd-world-source-toggle" role="group" aria-label="Show on my public profile">
                                        <button type="button" class="mpd-world-source-toggle__btn is-active" data-mpd-world-source="world" aria-pressed="true">World</button>
                                        <button type="button" class="mpd-world-source-toggle__btn" data-mpd-world-source="newWorld" aria-pressed="false" disabled aria-disabled="true">New World</button>
                                    </div>
                                    <p class="mpd-world-source-note" id="mpd_public_world_source_note">World will display on your profile.</p>
                                </div>
                                <h2>Story &amp; World</h2>
                                <div class="mpd-story-dual-grid">
                                    <div class="mpd-story-field-dual">
                                        <div class="mpd-story-field-meta">
                                            <span class="mpd-story-field-label">Practice</span>
                                            <span class="mpd-field-hint">Tell us more about the work you are currently pursuing.</span>
                                        </div>
                                        <textarea id="mpd_w_practice" class="studio-textarea mpd-story-input" rows="2" placeholder="Describe what you are working on..."></textarea>
                                        <button type="button" class="mpd-story-edit-btn" data-mpd-edit-target="mpd_w_practice" aria-label="Edit practice">${storyEditIconHtml}</button>
                                    </div>
                                    <div class="mpd-story-field-dual">
                                        <div class="mpd-story-field-meta">
                                            <span class="mpd-story-field-label">Perspective</span>
                                            <span class="mpd-field-hint">How you see your practice in relation to the field — use a blank line between paragraphs.</span>
                                        </div>
                                        <textarea id="mpd_w_perspective" class="studio-textarea mpd-story-input" rows="3" placeholder="Share your point of view...&#10;&#10;Add another thought here..."></textarea>
                                        <button type="button" class="mpd-story-edit-btn" data-mpd-edit-target="mpd_w_perspective" aria-label="Edit perspective">${storyEditIconHtml}</button>
                                    </div>
                                    <div class="mpd-story-field-dual">
                                        <div class="mpd-story-field-meta">
                                            <span class="mpd-story-field-label">Vision</span>
                                            <span class="mpd-field-hint">Where you want the work to go — aims, horizons, and what you are building toward.</span>
                                        </div>
                                        <textarea id="mpd_w_vision" class="studio-textarea mpd-story-input" rows="3" placeholder="Where do you want the work to go?"></textarea>
                                        <button type="button" class="mpd-story-edit-btn" data-mpd-edit-target="mpd_w_vision" aria-label="Edit vision">${storyEditIconHtml}</button>
                                    </div>
                                    <div class="mpd-story-field-dual">
                                        <div class="mpd-story-field-meta">
                                            <span class="mpd-story-field-label">Constructing</span>
                                            <span class="mpd-field-hint">Materials, process, and what you are actively making right now.</span>
                                        </div>
                                        <textarea id="mpd_w_constructing" class="studio-textarea mpd-story-input" rows="2" placeholder="Materials, process, current experiments..."></textarea>
                                        <button type="button" class="mpd-story-edit-btn" data-mpd-edit-target="mpd_w_constructing" aria-label="Edit constructing">${storyEditIconHtml}</button>
                                    </div>
                                    <div class="mpd-story-field-dual">
                                        <div class="mpd-story-field-meta">
                                            <span class="mpd-story-field-label">Context</span>
                                            <span class="mpd-field-hint">Place, community, or history that situates the work.</span>
                                        </div>
                                        <textarea id="mpd_w_context" class="studio-textarea mpd-story-input" rows="2" placeholder="Place, community, history, or influences..."></textarea>
                                        <button type="button" class="mpd-story-edit-btn" data-mpd-edit-target="mpd_w_context" aria-label="Edit context">${storyEditIconHtml}</button>
                                    </div>
                                    <div class="mpd-story-field-dual">
                                        <div class="mpd-story-field-meta">
                                            <span class="mpd-story-field-label">Quote</span>
                                            <span class="mpd-field-hint">A single line visitors can read at a glance — optional, but memorable when it lands.</span>
                                        </div>
                                        <input type="text" id="mpd_w_quote" class="studio-input mpd-story-input" placeholder="A short line visitors can remember..." />
                                        <button type="button" class="mpd-story-edit-btn" data-mpd-edit-target="mpd_w_quote" aria-label="Edit quote">${storyEditIconHtml}</button>
                                    </div>
                                </div>
                                ${storyCardFooter}
                            </section>
                        </div>

                        <div class="mpd-panel" id="mpd-panel-programs" data-mpd-panel="programs" hidden>
                            <section class="member-profile-dashboard__card mpd-programs-shell" id="mpd-programs">
                                <div class="mpd-program-tabs" role="tablist" aria-label="Programs sections">
                                    <button type="button" class="mpd-program-tab mpd-program-tab--explore is-active" id="mpd-program-tab-explore" role="tab" aria-selected="true" tabindex="0" aria-controls="mpd-program-panel-explore" data-mpd-program-tab="explore">
                                        ${mpdInlineIconHtml(exploreProgramsIconUrl, "mpd-program-tab__icon")}
                                        <span>Explore programs</span>
                                    </button>
                                    <button type="button" class="mpd-program-tab mpd-program-tab--my-programs" id="mpd-program-tab-my-programs" role="tab" aria-selected="false" tabindex="-1" aria-controls="mpd-program-panel-my-programs" data-mpd-program-tab="my-programs">
                                        ${mpdInlineIconHtml(myProgramsIconUrl, "mpd-program-tab__icon")}
                                        <span>My programs</span>
                                        <span class="mpd-program-tab__count" id="mpd_my_programs_count" hidden>0</span>
                                    </button>
                                    <button type="button" class="mpd-program-tab mpd-program-tab--payments" id="mpd-program-tab-payments" role="tab" aria-selected="false" tabindex="-1" aria-controls="mpd-program-panel-payments" data-mpd-program-tab="payments">
                                        ${mpdInlineIconHtml(paymentsIconUrl, "mpd-program-tab__icon")}
                                        <span>Payments</span>
                                    </button>
                                </div>

                                <div class="mpd-program-tab-panel" id="mpd-program-panel-explore" role="tabpanel" aria-labelledby="mpd-program-tab-explore" data-mpd-program-panel="explore">
                                    <div class="mpd-public-programs-discovery" id="mpd_public_programs_discovery">
                                        <div class="mpd-public-programs-toolbar">
                                            <div>
                                                <h3 class="mpd-public-programs-discovery__h">Explore programs</h3>
                                                <p class="studio-muted">
                                                    Browse all public Fusion programs — each link opens in a new tab.
                                                </p>
                                            </div>
                                            <div class="mpd-public-programs-controls" aria-label="Explore programs filters">
                                                <label class="mpd-public-programs-search">
                                                    <span class="sr-only">Search programs</span>
                                                    <input type="search" id="mpd_public_programs_search" class="studio-input" placeholder="Search programs..." autocomplete="off" />
                                                </label>
                                                <label class="mpd-public-programs-filter">
                                                    <span class="sr-only">Filter programs</span>
                                                    <select id="mpd_public_programs_filter" class="studio-input" aria-label="Filter programs">
                                                        <option value="all">All programs</option>
                                                        <option value="open">Open now</option>
                                                        <option value="not-open">Not open yet</option>
                                                    </select>
                                                </label>
                                            </div>
                                        </div>
                                        <div id="mpd_public_programs_all" class="mpd-public-programs-list" aria-live="polite"></div>
                                    </div>
                                </div>

                                <div class="mpd-program-tab-panel" id="mpd-program-panel-my-programs" role="tabpanel" aria-labelledby="mpd-program-tab-my-programs" data-mpd-program-panel="my-programs" hidden>
                                    <div class="mpd-my-programs-head">
                                        <div>
                                            <h3>My programs</h3>
                                            <p class="studio-muted">View and manage your applications.</p>
                                        </div>
                                    </div>
                                    <div class="mpd-my-program-filters" role="group" aria-label="Filter my programs by application status">
                                        <button type="button" class="mpd-my-program-filter is-active" data-mpd-my-program-filter="all" aria-pressed="true">All <span class="mpd-my-program-filter__count">0</span></button>
                                        <button type="button" class="mpd-my-program-filter" data-mpd-my-program-filter="submitted" aria-pressed="false">Submitted <span class="mpd-my-program-filter__count">0</span></button>
                                        <button type="button" class="mpd-my-program-filter" data-mpd-my-program-filter="initial-review" aria-pressed="false">Initial review <span class="mpd-my-program-filter__count">0</span></button>
                                        <button type="button" class="mpd-my-program-filter" data-mpd-my-program-filter="post-interview-review" aria-pressed="false">Post interview review <span class="mpd-my-program-filter__count">0</span></button>
                                        <button type="button" class="mpd-my-program-filter" data-mpd-my-program-filter="invited" aria-pressed="false">Invited <span class="mpd-my-program-filter__count">0</span></button>
                                        <button type="button" class="mpd-my-program-filter" data-mpd-my-program-filter="not-selected" aria-pressed="false">Not selected <span class="mpd-my-program-filter__count">0</span></button>
                                        <button type="button" class="mpd-my-program-filter" data-mpd-my-program-filter="withdrawn" aria-pressed="false">Withdrawn <span class="mpd-my-program-filter__count">0</span></button>
                                    </div>
                                    <div id="mpd_programs_list" class="mpd-programs-list" aria-live="polite"></div>
                                </div>

                                <div class="mpd-program-tab-panel" id="mpd-program-panel-payments" role="tabpanel" aria-labelledby="mpd-program-tab-payments" data-mpd-program-panel="payments" hidden>
                                    <div id="mpd_program_payments_workspace" aria-live="polite">
                                        <div class="mpd-program-placeholder">
                                            <h3>Payments</h3>
                                            <p class="studio-muted">Program payments appear after you are approved for a program.</p>
                                        </div>
                                    </div>
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
                    id="mpdSaveChoiceModal"
                    class="profile-gallery-access-modal mpd-save-choice-modal"
                    hidden
                    aria-hidden="true"
                >
                    <div class="profile-gallery-access-modal__scrim" aria-hidden="true"></div>
                    <div
                        class="profile-gallery-access-modal__panel mpd-save-choice-modal__panel"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="mpdSaveChoiceTitle"
                    >
                        <h2 id="mpdSaveChoiceTitle" class="profile-gallery-access-modal__title">Save profile</h2>
                        <div class="mpd-save-choice-modal__body">
                            <p>
                                Choose how you want to save this update. Translation creates English and Japanese profile copy
                                during save, so it may take a little longer.
                            </p>
                            <p>
                                Just save is faster and copies the visible text into both profile languages without translation.
                            </p>
                        </div>
                        <div class="mpd-save-choice-modal__actions">
                            <button type="button" class="studio-btn-primary" id="mpdSaveChoiceTranslate">
                                Translate and save
                            </button>
                            <button type="button" class="mpd-membership-cancel-outline" id="mpdSaveChoiceJustSave">
                                Just save
                            </button>
                            <button type="button" class="profile-gallery-access-modal__close" id="mpdSaveChoiceCancel">
                                Cancel
                            </button>
                        </div>
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
/** @type {((event: Event) => void) | null} */
let _mpdSaveChoiceHandler = null;

export default function initSettingsProfile() {
  document.querySelectorAll("#mpdResidencyComingSoonModal").forEach((m) => {
    const sm = document.getElementById("settingsMain");
    if (sm && !sm.contains(m)) m.remove();
  });
  document.querySelectorAll("#mpdMembershipCancelModal").forEach((m) => {
    const sm = document.getElementById("settingsMain");
    if (sm && !sm.contains(m)) m.remove();
  });
  document.querySelectorAll("#mpdSaveChoiceModal").forEach((m) => {
    const sm = document.getElementById("settingsMain");
    if (sm && !sm.contains(m)) m.remove();
  });
  wireMpdResidencyComingSoonModal();
  wireMpdSaveChoiceModal();
  wireMpdMembershipCancelModal();

  /** @type {'en'|'ja'} Internal canonical form locale; public locales are generated on save. */
  const activeLocale = PROFILE_EDIT_LOCALE;
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
  let profileSaveInFlight = false;
  let mediaUploadRevision = 0;
  let baselineMediaUploadRevision = 0;

  const statusEl = document.getElementById("settingsProfileStatus");
  const formWrap = document.getElementById("settingsProfileFormWrap");
  const initialLoadingEl = document.getElementById("settingsProfileInitialLoading");

  const setStatus = (t) => {
    if (statusEl) statusEl.textContent = t || "";
  };

  const setInitialProfileLoading = (visible) => {
    if (!initialLoadingEl) return;
    initialLoadingEl.hidden = !visible;
    initialLoadingEl.setAttribute("aria-hidden", visible ? "false" : "true");
  };

  /** @type {Map<string, { operation: string; detail: string; pendingMessage: string }>} */
  const activeMpdOperations = new Map();

  const syncMpdPendingControls = () => {
    const busy = activeMpdOperations.size > 0;
    document.querySelectorAll(".mpd-section-save").forEach((el) => {
      if (!(el instanceof HTMLButtonElement)) return;
      if (busy) {
        el.setAttribute("aria-busy", "true");
        el.disabled = true;
      } else {
        el.removeAttribute("aria-busy");
        el.disabled = false;
      }
    });
  };

  const firstActiveMpdOperation = () =>
    activeMpdOperations.values().next().value || null;

  const reportActiveMpdOperation = () => {
    const active = firstActiveMpdOperation();
    if (!active) return false;
    const msg =
      active.pendingMessage ||
      `Still ${String(active.detail || "working").toLowerCase()}...`;
    setStatus(msg);
    dispatchProfileSaveStatus("saving", msg, {
      operation: active.operation,
      detail: active.detail,
    });
    return true;
  };

  /**
   * @param {string} key
   * @param {{ operation: string; detail: string; message?: string; pendingMessage?: string }} config
   */
  const beginMpdOperation = (key, config) => {
    if (activeMpdOperations.get(key) || reportActiveMpdOperation()) return false;
    const op = {
      operation: config.operation,
      detail: config.detail,
      pendingMessage:
        config.pendingMessage ||
        `Still ${String(config.detail || "working").toLowerCase()}...`,
    };
    activeMpdOperations.set(key, op);
    syncMpdPendingControls();
    const msg = config.message || config.detail || config.operation || "Working";
    setStatus(msg);
    dispatchProfileSaveStatus("saving", msg, {
      operation: op.operation,
      detail: op.detail,
    });
    return true;
  };

  /**
   * @param {string} key
   * @param {'idle'|'saved'|'error'} state
   * @param {string} [message]
   */
  const finishMpdOperation = (key, state = "idle", message = "") => {
    const op = activeMpdOperations.get(key);
    activeMpdOperations.delete(key);
    syncMpdPendingControls();
    if (state === "idle") {
      if (!activeMpdOperations.size && message) setStatus(message);
      return;
    }
    const msg =
      message ||
      (state === "saved"
        ? `${op?.operation || "Profile"} saved`
        : `${op?.operation || "Operation"} failed`);
    setStatus(msg);
    dispatchProfileSaveStatus(state, msg, {
      operation: op?.operation || "",
      detail: op?.detail || "",
    });
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
    heroImageUrl = "";
    heroProfileImageUrl = "";
    profileAudioUrl = "";
    profileSlug = "";
    currentArtistId = "";
    mpdBackendRosterVisibility = "inactive";
    fillFormFromLocales(
      /** @type {Record<string, unknown>} */ (localesState),
      activeLocale,
    );
    setMpdVisibilityToggle("inactive");
    setVal("mpd_hero_url", "");
    setVal("mpd_hero_profile_url", "");
    setVal("mpd_audio_url", "");
    setVal("mpd_audio_title", "");
    updateHeroPreview();
    updateHeroProfilePreview();
    refreshBaseline();
    setInitialProfileLoading(false);
    if (formWrap) formWrap.removeAttribute("hidden");
  };

  /**
   * After-save: fill empty New World only when nothing is there yet (live IC).
   * @param {Record<string, unknown>} mergedSaved
   * @returns {Promise<boolean>} false when generation failed after the profile itself saved.
   */
  const runMemberWorldGenerationAfterSave = async (mergedSaved) => {
    if (getDataSource() === "test") {
      setStatus("Saved.");
      return true;
    }
    if (!needsInitialWorldNew(mergedSaved)) {
      setStatus("Saved.");
      return true;
    }
    try {
      const rec = await getMyArtistRecord();
      const row = artistRowFromMyArtistRecord(rec);
      if (!row) throw new Error("Could not load profile for world generation.");
      if (!hasUsableWorldLlmSourceInput(row)) {
        setStatus("Saved.");
        return true;
      }
      if (
        !beginMpdOperation("new-world-generation", {
          operation: "New World",
          detail: "Generating New World",
          message: "Generating New World…",
          pendingMessage: "Still generating New World...",
        })
      ) {
        return false;
      }
      await generateAndUpdateMyArtistWorldFromBio(row, "fillEmpty");
      const fresh = await getMyArtistRecord();
      if (!fresh) throw new Error("Could not reload profile after world generation.");
      const json = mpdLocalesJsonFromRecord(fresh);
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
      finishMpdOperation("new-world-generation", "idle", "New World generated.");
      setStatus("Saved.");
      return true;
    } catch (e) {
      console.error("New World generation failed after profile save.", e);
      const friendly =
        "Couldn’t generate New World. Your profile was saved with World. Please try saving again.";
      if (localesState && typeof localesState === "object") {
        /** @type {Record<string, unknown>} */ (localesState).publicWorldSource = "world";
      }
      applyMpdStoryWorldDisplay(
        /** @type {Record<string, unknown>} */ (localesState || mergedSaved),
        activeLocale,
        "world",
      );
      finishMpdOperation("new-world-generation", "error", friendly);
      return false;
    } finally {
      if (activeMpdOperations.has("new-world-generation")) {
        finishMpdOperation("new-world-generation", "idle");
      }
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
    const keys = ["overview", "location", "story", "programs", "membership"];
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
      "mpd-links": "overview",
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
    const draft = readMpdProfileDraftForSave();
    const cur = snapshotState(
      { draft },
      activeLocale,
      getVal("mpd_hero_url").trim(),
      normalizeArtistRosterVisibility(getVal("mpd_profile_visibility").trim() || "public"),
      {
        profileQuote: getMpdProfileQuoteForSave(),
        audioUrl: getVal("mpd_audio_url").trim(),
        audioTitle: getVal("mpd_audio_title").trim(),
        heroProfileUrl: getVal("mpd_hero_profile_url").trim(),
      },
    );
    return cur !== baselineSnapshot || mediaUploadRevision !== baselineMediaUploadRevision;
  };

  const shouldSkipProfileReload = () => {
    if (!localesState) return false;
    if (profileSaveInFlight) return true;
    const wrapVisible = formWrap && !formWrap.hasAttribute("hidden");
    return Boolean(wrapVisible && isDirty());
  };

  const refreshBaseline = () => {
    if (!localesState) return;
    const draft = readMpdProfileDraftForSave();
    heroImageUrl = getVal("mpd_hero_url").trim();
    heroProfileImageUrl = getVal("mpd_hero_profile_url").trim();
    const vis = normalizeArtistRosterVisibility(
      getVal("mpd_profile_visibility").trim() || "public",
    );
    baselineSnapshot = snapshotState({ draft }, activeLocale, heroImageUrl, vis, {
      profileQuote: getMpdProfileQuoteForSave(),
      audioUrl: getVal("mpd_audio_url").trim(),
      audioTitle: getVal("mpd_audio_title").trim(),
      heroProfileUrl: heroProfileImageUrl,
    });
    baselineMediaUploadRevision = mediaUploadRevision;
  };

  const setStoryPanelAsyncBusy = (busy) => {
    document.querySelectorAll(".mpd-section-save").forEach((el) => {
      if (!(el instanceof HTMLButtonElement)) return;
      if (busy) {
        el.setAttribute("aria-busy", "true");
        el.disabled = true;
      } else {
        if (activeMpdOperations.size > 0) return;
        el.removeAttribute("aria-busy");
        el.disabled = false;
      }
    });
  };

  const flashMpdStorySaveOk = () => {
    const s = document.getElementById("mpd_story_save");
    if (!s) return;
    s.classList.add("mp--async-ok");
    window.setTimeout(() => {
      s.classList.remove("mp--async-ok");
    }, 1400);
  };

  /** @type {Element | undefined} */
  let pendingProfileSaveButton;

  /**
   * @param {Element | undefined} [fromBtn]
   */
  const requestProfileSave = (fromBtn) => {
    if (adminPreviewBypassEnabled) {
      setStatus(
        "Admin preview bypass is active. This mode is view/edit preview only and cannot save to a linked profile.",
      );
      return;
    }
    if (!localesState) return;
    if (reportActiveMpdOperation()) return;
    pendingProfileSaveButton = fromBtn;
    openMpdSaveChoiceModal();
  };

  /**
   * @param {Element | undefined} [fromBtn]
   * @param {{ translate?: boolean }} [options]
   */
  const saveProfileFromDom = async (fromBtn, options = {}) => {
    if (adminPreviewBypassEnabled) {
      setStatus(
        "Admin preview bypass is active. This mode is view/edit preview only and cannot save to a linked profile.",
      );
      return;
    }
    if (!localesState) return;
    const isStorySave =
      fromBtn instanceof HTMLElement && fromBtn.id === "mpd_story_save";
    const translate = options.translate !== false;
    if (
      !beginMpdOperation("profile-save", {
        operation: "Profile",
        detail: translate ? "Translating profile copy" : "Saving without translation",
        message: translate ? "Saving profile with translation…" : "Saving profile without translation…",
        pendingMessage: "Still saving profile...",
      })
    ) {
      return;
    }
    /** @type {boolean} */
    let willAutoGen = false;
    profileSaveInFlight = true;
    if (isStorySave) setStoryPanelAsyncBusy(true);
    try {
      const recBeforeSave = await getMyArtistRecord();
      const pBefore = recBeforeSave?.profile;
      const priorVis =
        pBefore && typeof pBefore === "object"
          ? normalizeArtistRosterVisibility(/** @type {Record<string, unknown>} */(pBefore).visibility)
          : mpdBackendRosterVisibility;
      const draft = readMpdProfileDraftForSave();
      localesState = await buildSmartProfileLocales(
        /** @type {Record<string, unknown>} */ (localesState),
        draft,
        getVal,
        { translate },
      );
      const merged = normalizeLocalesWorldForStorage(
        /** @type {Record<string, unknown>} */ (localesState),
      );
      localesState = merged;
      const ts = new Date().toISOString();
      const heroUrl = getVal("mpd_hero_url").trim();
      const heroProfileUrl = getVal("mpd_hero_profile_url").trim();
      const profileQuote = getMpdProfileQuoteForSave();
      const audioUrl = getVal("mpd_audio_url").trim();
      const audioTitle = getVal("mpd_audio_title").trim();
      const optionalSaveWarnings = [];
      await updateMyArtistLocalesJson(JSON.stringify(merged), ts);
      await updateMyArtistProfilePatch(heroUrl, ts);
      try {
        await updateMyArtistHeroProfileImagePatch(heroProfileUrl, ts);
      } catch (mediaErr) {
        optionalSaveWarnings.push(
          `Profile image metadata was not saved: ${mediaErr instanceof Error ? mediaErr.message : String(mediaErr)}`,
        );
      }
      try {
        await updateMyArtistQuoteAudioPatch(
          { quote: profileQuote, audioUrl, audioTitle },
          ts,
        );
      } catch (mediaErr) {
        optionalSaveWarnings.push(
          `Quote/audio metadata was not saved: ${mediaErr instanceof Error ? mediaErr.message : String(mediaErr)}`,
        );
      }
      const visPicked = normalizeArtistRosterVisibility(
        getVal("mpd_profile_visibility").trim() || "public",
      );
      const vis = visPicked === "public" && priorVis !== "public" ? "pending" : visPicked;
      await updateMyArtistVisibility(vis, ts);
      mpdBackendRosterVisibility = vis;
      setMpdVisibilityToggle(vis);
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
          const slugMessage = `${slugErr instanceof Error ? slugErr.message : String(slugErr)} (Other changes were saved.)`;
          finishMpdOperation("profile-save", "error", slugMessage);
        }
      }
      willAutoGen =
        getDataSource() !== "test" &&
        !slugSaveFailed &&
        needsInitialWorldNew(merged);
      if (willAutoGen && !isStorySave) setStoryPanelAsyncBusy(true);
      refreshBaseline();
      if (!slugSaveFailed) {
        posthog.capture("profile_settings_saved");
        finishMpdOperation("profile-save", "idle", "Profile saved.");
        const worldGenerationOk = await runMemberWorldGenerationAfterSave(merged);
        if (optionalSaveWarnings.length && (!statusEl || statusEl.textContent === "Saved.")) {
          setStatus(`Saved. ${optionalSaveWarnings.join(" ")}`);
        }
        if (worldGenerationOk) {
          dispatchProfileSaveStatus("saved", "Profile saved", {
            operation: "Profile",
            detail: "All changes saved",
          });
          if (isStorySave) flashMpdStorySaveOk();
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      finishMpdOperation("profile-save", "error", message);
    } finally {
      profileSaveInFlight = false;
      if (activeMpdOperations.has("profile-save")) {
        finishMpdOperation("profile-save", "idle");
      }
      if (isStorySave || willAutoGen) setStoryPanelAsyncBusy(false);
    }
  };

  const updateHeroPreview = (forceFresh = false) => {
    const u = getVal("mpd_hero_url").trim();
    const heroPrev = /** @type {HTMLImageElement | null} */ (
      document.getElementById("mpd_hero_preview")
    );
    if (!heroPrev) return;
    setMpdMediaSurfaceState("hero", {
      hasMedia: Boolean(u),
      hasPreview: Boolean(u),
    });
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
    heroPrev.src = forceFresh ? cacheBustMpdPreviewUrl(u) : u;
    if (heroPrev.complete && heroPrev.naturalHeight > 0) {
      setHeroSpinnerVisible(false);
      heroPrev.style.display = "block";
      heroPrev.onload = null;
      heroPrev.onerror = null;
    }
  };

  const updateHeroProfilePreview = (forceFresh = false) => {
    const u = getVal("mpd_hero_profile_url").trim();
    const fallbackUrl = getVal("mpd_hero_url").trim();
    const displayUrl = u || fallbackUrl;
    const prev = /** @type {HTMLImageElement | null} */ (
      document.getElementById("mpd_hero_profile_preview")
    );
    updateHeroProfileCardCopy();
    if (!prev) return;
    setMpdMediaSurfaceState("heroProfile", {
      hasMedia: Boolean(u),
      hasPreview: Boolean(displayUrl),
    });
    if (!displayUrl) {
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
    prev.src = forceFresh ? cacheBustMpdPreviewUrl(displayUrl) : displayUrl;
    if (prev.complete && prev.naturalHeight > 0) {
      setHeroProfileSpinnerVisible(false);
      prev.style.display = "block";
      prev.onload = null;
      prev.onerror = null;
    }
  };

  /** @param {string} key */
  const clearMpdMediaSlot = (key) => {
    if (key === "hero") {
      setVal("mpd_hero_url", "");
      heroImageUrl = "";
      mediaUploadRevision += 1;
      updateHeroPreview();
      updateHeroProfilePreview();
      setStatus("Hero image removed. Save to apply this change.");
      return;
    }
    if (key === "heroProfile") {
      setVal("mpd_hero_profile_url", "");
      heroProfileImageUrl = "";
      mediaUploadRevision += 1;
      updateHeroProfilePreview();
      setStatus("Profile image removed. Save to apply this change.");
      return;
    }
    const introMatch = /^intro-(\d+)$/.exec(key);
    if (introMatch) {
      const i = Number(introMatch[1]);
      if (!Number.isInteger(i) || i < 0 || i > 2) return;
      setVal(`mpd_intro_${i}_src`, "");
      setVal(`mpd_intro_${i}_alt`, "");
      setVal(`mpd_intro_${i}_caption`, "");
      mediaUploadRevision += 1;
      setIntroSpinnerVisible(i, false);
      setMpdMediaSurfaceState(`intro-${i}`, { hasMedia: false, hasPreview: false });
      const thumb = /** @type {HTMLImageElement | null} */ (
        document.getElementById(`mpd_intro_${i}_thumb`)
      );
      if (thumb) {
        thumb.removeAttribute("src");
        thumb.style.display = "none";
        thumb.onload = null;
        thumb.onerror = null;
      }
      setStatus("Introductory work removed. Save to apply this change.");
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
      const programTab =
        e.target &&
        /** @type {Element} */ (e.target).closest?.("[data-mpd-program-tab]");
      if (programTab && rootEl.contains(programTab)) {
        e.preventDefault();
        if (programTab.hasAttribute("hidden") || programTab.getAttribute("aria-hidden") === "true") return;
        setMpdProgramsTab(programTab.getAttribute("data-mpd-program-tab") || "explore");
        return;
      }
      const paymentProgram =
        e.target &&
        /** @type {Element} */ (e.target).closest?.("[data-mpd-payment-program]");
      if (paymentProgram && rootEl.contains(paymentProgram)) {
        e.preventDefault();
        mpdSelectedPaymentProgramId = paymentProgram.getAttribute("data-mpd-payment-program") || "";
        renderMpdPaymentsWorkspace();
        return;
      }
      const flightChoice =
        e.target &&
        /** @type {Element} */ (e.target).closest?.("[data-mpd-flight-choice]");
      if (flightChoice && rootEl.contains(flightChoice)) {
        e.preventDefault();
        if (flightChoice.hasAttribute("disabled")) return;
        void updateMpdFlightChoice(flightChoice.getAttribute("data-mpd-flight-choice") || "support");
        return;
      }
      const paymentAction =
        e.target &&
        /** @type {Element} */ (e.target).closest?.("[data-mpd-payment-action]");
      if (paymentAction && rootEl.contains(paymentAction)) {
        e.preventDefault();
        const item = mpdCurrentPaymentItem();
        if (!item) return;
        const action = paymentAction.getAttribute("data-mpd-payment-action") || "";
        if (action === "deposit") {
          void openMpdStripePaymentModal(item, "deposit", item.depositCents);
        } else if (action === "full") {
          void openMpdStripePaymentModal(item, "full_payment", item.totalDueCents);
        } else if (action === "manual") {
          openMpdManualPaymentModal(item);
        } else if (action === "start-plan") {
          openMpdPaymentPlanModal(item);
        } else if (action === "cancel-plan") {
          void cancelMpdProgramPaymentPlan(item);
        }
        return;
      }
      const myProgramFilter =
        e.target &&
        /** @type {Element} */ (e.target).closest?.("[data-mpd-my-program-filter]");
      if (myProgramFilter && rootEl.contains(myProgramFilter)) {
        e.preventDefault();
        setMpdMyProgramsFilter(myProgramFilter);
        return;
      }
      const applicationAction =
        e.target &&
        /** @type {Element} */ (e.target).closest?.("[data-mpd-application-action]");
      if (applicationAction && rootEl.contains(applicationAction)) {
        e.preventDefault();
        const action = applicationAction.getAttribute("data-mpd-application-action") || "";
        const programId = applicationAction.getAttribute("data-program-id") || "";
        if (action === "view") {
          openMpdApplicationDetailsModal(programId);
        } else if (action === "update") {
          window.alert("Material updates are coming soon. For now, contact the Fusion team if your application needs changes.");
        } else if (action === "withdraw") {
          window.alert("Application withdrawal is coming soon. Contact the Fusion team if you need to withdraw before this action is available.");
        }
        return;
      }
      const saveBtn =
        e.target &&
        /** @type {Element} */ (e.target).closest?.(".mpd-section-save");
      if (saveBtn && rootEl.contains(saveBtn)) {
        e.preventDefault();
        requestProfileSave(saveBtn);
        return;
      }
      const mediaDeleteBtn =
        e.target &&
        /** @type {Element} */ (e.target).closest?.("[data-mpd-media-delete]");
      if (mediaDeleteBtn && rootEl.contains(mediaDeleteBtn)) {
        e.preventDefault();
        e.stopPropagation();
        clearMpdMediaSlot(mediaDeleteBtn.getAttribute("data-mpd-media-delete") || "");
        return;
      }
      const storyEditBtn =
        e.target &&
        /** @type {Element} */ (e.target).closest?.("[data-mpd-edit-target]");
      if (storyEditBtn && rootEl.contains(storyEditBtn)) {
        e.preventDefault();
        const targetId = storyEditBtn.getAttribute("data-mpd-edit-target") || "";
        const input = document.getElementById(targetId);
        if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
          input.focus();
          const end = input.value.length;
          input.setSelectionRange(end, end);
        }
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
      const worldSourceBtn =
        e.target &&
        /** @type {Element} */ (e.target).closest?.("[data-mpd-world-source]");
      if (worldSourceBtn && rootEl.contains(worldSourceBtn)) {
        e.preventDefault();
        if (!localesState) return;
        applyMpdStoryWorldDisplay(
          /** @type {Record<string, unknown>} */ (localesState),
          activeLocale,
          worldSourceBtn.getAttribute("data-mpd-world-source"),
        );
        return;
      }
      const statusBtn =
        e.target && /** @type {Element} */ (e.target).closest?.("[data-mpd-status]");
      if (statusBtn && rootEl.contains(statusBtn)) {
        e.preventDefault();
        setMpdStatusToggle(statusBtn.getAttribute("data-mpd-status"));
        return;
      }
      const visibilityBtn =
        e.target && /** @type {Element} */ (e.target).closest?.("[data-mpd-visibility]");
      if (visibilityBtn && rootEl.contains(visibilityBtn)) {
        e.preventDefault();
        setMpdVisibilityToggle(visibilityBtn.getAttribute("data-mpd-visibility"));
        return;
      }
      if (t && "id" in t && t.id === "mpd_links_add") {
        const cur = readLinksFromContainer("#mpd-links");
        cur.push({ type: "website", url: "", label: "" });
        renderLinkRows(cur);
      }
    });
    rootEl.addEventListener("keydown", (e) => {
      const tab =
        e.target &&
        /** @type {Element} */ (e.target).closest?.("[data-mpd-program-tab]");
      if (!tab || !rootEl.contains(tab)) return;
      const key = e.key;
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;
      const tabs = Array.from(rootEl.querySelectorAll("[data-mpd-program-tab]")).filter(
        (el) => !el.hasAttribute("hidden") && el.getAttribute("aria-hidden") !== "true",
      );
      const currentIndex = tabs.indexOf(tab);
      if (currentIndex < 0) return;
      e.preventDefault();
      let nextIndex = currentIndex;
      if (key === "Home") nextIndex = 0;
      else if (key === "End") nextIndex = tabs.length - 1;
      else if (key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
      else if (key === "ArrowLeft")
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      const next = tabs[nextIndex];
      if (!(next instanceof HTMLElement)) return;
      setMpdProgramsTab(next.getAttribute("data-mpd-program-tab") || "explore");
      next.focus();
    });
    rootEl.addEventListener("input", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement)) return;
      if (t.id === "mpd_public_programs_search") {
        applyMpdPublicProgramFilters();
      }
    });
    rootEl.addEventListener("change", async (e) => {
      const t = e.target;
      if (t instanceof HTMLSelectElement && t.id === "mpd_public_programs_filter") {
        applyMpdPublicProgramFilters();
        return;
      }
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
        if (
          !beginMpdOperation("hero-upload", {
            operation: "Main artwork",
            detail: "Uploading main artwork",
            message: "Uploading main artwork…",
            pendingMessage: "Still uploading main artwork...",
          })
        ) {
          t.value = "";
          return;
        }
        setHeroSpinnerVisible(true);
        showMpdUploadOverlay("Uploading main artwork...");
        try {
          const url = await uploadBlobToS3(f, null, {
            area: "account/profile",
            entityType: "artist",
            entityId: currentArtistId || profileSlug || "me",
            fieldKey: "hero",
          });
          setVal("mpd_hero_url", url);
          heroImageUrl = url;
          mediaUploadRevision += 1;
          updateHeroPreview(true);
          updateHeroProfilePreview(true);
          finishMpdOperation(
            "hero-upload",
            "saved",
            "Main artwork uploaded. Save to apply this change.",
          );
        } catch (err) {
          setHeroSpinnerVisible(false);
          finishMpdOperation(
            "hero-upload",
            "error",
            err instanceof Error ? err.message : String(err),
          );
        } finally {
          if (activeMpdOperations.has("hero-upload")) {
            finishMpdOperation("hero-upload", "idle");
          }
          hideMpdUploadOverlay();
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
        if (
          !beginMpdOperation("hero-profile-upload", {
            operation: "Profile card",
            detail: "Uploading profile card",
            message: "Uploading profile card…",
            pendingMessage: "Still uploading profile card...",
          })
        ) {
          t.value = "";
          return;
        }
        setHeroProfileSpinnerVisible(true);
        showMpdUploadOverlay("Uploading profile card...");
        try {
          const url = await uploadBlobToS3(f, null, {
            area: "account/profile",
            entityType: "artist",
            entityId: currentArtistId || profileSlug || "me",
            fieldKey: "heroProfile",
          });
          setVal("mpd_hero_profile_url", url);
          heroProfileImageUrl = url;
          mediaUploadRevision += 1;
          updateHeroProfilePreview(true);
          finishMpdOperation(
            "hero-profile-upload",
            "saved",
            "Profile card uploaded. Save to apply this change.",
          );
        } catch (err) {
          setHeroProfileSpinnerVisible(false);
          finishMpdOperation(
            "hero-profile-upload",
            "error",
            err instanceof Error ? err.message : String(err),
          );
        } finally {
          if (activeMpdOperations.has("hero-profile-upload")) {
            finishMpdOperation("hero-profile-upload", "idle");
          }
          hideMpdUploadOverlay();
        }
        t.value = "";
        return;
      }
      if (t.id === "mpd_audio_file" && t.files?.[0]) {
        const f = t.files[0];
        if (
          !beginMpdOperation("audio-upload", {
            operation: "Audio bite",
            detail: "Uploading audio bite",
            message: "Uploading audio bite…",
            pendingMessage: "Still uploading audio bite...",
          })
        ) {
          t.value = "";
          return;
        }
        try {
          const url = await uploadBlobToS3(f, null, {
            area: "account/profile",
            entityType: "artist",
            entityId: currentArtistId || profileSlug || "me",
            fieldKey: "audio",
          });
          setVal("mpd_audio_url", url);
          profileAudioUrl = url;
          finishMpdOperation(
            "audio-upload",
            "saved",
            "Audio bite uploaded. Save to apply this change.",
          );
        } catch (err) {
          finishMpdOperation(
            "audio-upload",
            "error",
            err instanceof Error ? err.message : String(err),
          );
        } finally {
          if (activeMpdOperations.has("audio-upload")) {
            finishMpdOperation("audio-upload", "idle");
          }
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
        const introKey = `intro-upload-${i}`;
        const introLabel = `Introductory work ${i + 1}`;
        if (
          !beginMpdOperation(introKey, {
            operation: introLabel,
            detail: `Uploading ${introLabel.toLowerCase()}`,
            message: `Uploading ${introLabel.toLowerCase()}…`,
            pendingMessage: `Still uploading ${introLabel.toLowerCase()}...`,
          })
        ) {
          t.value = "";
          return;
        }
        setIntroSpinnerVisible(i, true);
        showMpdUploadOverlay(`Uploading ${introLabel.toLowerCase()}...`);
        try {
          const url = await uploadBlobToS3(f, null, {
            area: "account/profile",
            entityType: "artist",
            entityId: currentArtistId || profileSlug || "me",
            fieldKey: `intro-${i}`,
          });
          setVal(`mpd_intro_${i}_src`, url);
          mediaUploadRevision += 1;
          const th = /** @type {HTMLImageElement | null} */ (
            document.getElementById(`mpd_intro_${i}_thumb`)
          );
          if (th) {
            setMpdMediaSurfaceState(`intro-${i}`, {
              hasMedia: true,
              hasPreview: true,
            });
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
            th.src = cacheBustMpdPreviewUrl(url);
            if (th.complete && th.naturalHeight > 0) {
              setIntroSpinnerVisible(i, false);
              th.style.display = "block";
              th.onload = null;
              th.onerror = null;
            }
          } else {
            setIntroSpinnerVisible(i, false);
          }
          finishMpdOperation(
            introKey,
            "saved",
            `${introLabel} uploaded. Save to apply this change.`,
          );
        } catch (err) {
          setIntroSpinnerVisible(i, false);
          finishMpdOperation(
            introKey,
            "error",
            err instanceof Error ? err.message : String(err),
          );
        } finally {
          if (activeMpdOperations.has(introKey)) {
            finishMpdOperation(introKey, "idle");
          }
          hideMpdUploadOverlay();
        }
        t.value = "";
      }
    });
    rootEl.addEventListener("input", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) return;
      if (
        t.classList.contains("mpd-story-input") &&
        mpdStoryWorldDisplaySource === "world"
      ) {
        mpdStoryWorldDraft = readMpdStoryWorldTextDraftFromDom();
      }
      if (!(t instanceof HTMLInputElement)) return;
      if (
        t.id === "mpd_first_name" ||
        t.id === "mpd_last_name" ||
        t.id === "mpd_discipline"
      ) {
        updateHeroProfileCardCopy();
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

  /**
   * @param {{ force?: boolean }} [opts]
   */
  const load = async (opts = {}) => {
    if (opts.force !== true && shouldSkipProfileReload()) {
      return;
    }
    setStatus("");
    setInitialProfileLoading(true);
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
        void load({ force: true });
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
      setInitialProfileLoading(false);
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
        setInitialProfileLoading(false);
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
          setInitialProfileLoading(false);
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
          setInitialProfileLoading(false);
          return;
        }
        if (formWrap) formWrap.setAttribute("hidden", "");
        setInitialProfileLoading(false);
        applySettingsProfileDocumentSeo(dashTitle);
        return;
      }
      if (hint) {
        hint.textContent =
          "Your profile could not be loaded. Try refreshing the page. If you just subscribed, wait a moment and try again, or sign out and back in.";
      }
      if (formWrap) formWrap.setAttribute("hidden", "");
      setInitialProfileLoading(false);
      applySettingsProfileDocumentSeo(dashTitle);
      return;
    }

    const prof =
      rec.profile && typeof rec.profile === "object" ? rec.profile : {};
    const p = /** @type {Record<string, unknown>} */ (prof);
    profileSlug = String(p.slug ?? "");
    const json = mpdLocalesJsonFromRecord(rec);
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
    updateHeroPreview();
    updateHeroProfilePreview();

    mpdBackendRosterVisibility = normalizeArtistRosterVisibility(p.visibility);
    setMpdVisibilityToggle(mpdBackendRosterVisibility);

    const vu = document.getElementById("mpd_view_profile");
    if (vu && vu instanceof HTMLAnchorElement)
      vu.href = `/profile/${encodeURIComponent(profileSlug)}`;

    const side = document.getElementById("mpd_sidebar_slug");
    if (side) side.textContent = profileSlug ? `/${profileSlug}` : "—";

    setInitialProfileLoading(false);
    if (formWrap) formWrap.removeAttribute("hidden");

    const pill = document.getElementById("mpd_datasource_pill");
    if (pill && isTest) {
      pill.style.display = "";
      pill.textContent = "Data: test JSON (localStorage overlays)";
    } else if (pill) {
      pill.style.display = "none";
    }

    fillFormFromLocales(
      localesForSingleProfileForm(
        /** @type {Record<string, unknown>} */ (localesState),
      ),
      activeLocale,
    );
    if (!String(mpdStoryWorldDraft?.quote ?? "").trim()) {
      mpdStoryWorldDraft = {
        ...(mpdStoryWorldDraft || {}),
        quote: String(p.quote ?? ""),
      };
      if (mpdStoryWorldDisplaySource === "world") {
        setVal("mpd_w_quote", String(p.quote ?? ""));
      }
    }

    refreshBaseline();

    void hydrateProgramsPanel(
      rec,
      /** @type {Record<string, unknown>} */ (localesState),
      activeLocale,
    );
    setMpdProgramsTab("explore");
    void hydratePublicProgramDiscoveryCards();
    void syncResidencyApplyCta();

    showMpdPanel(panelKeyFromHash());

    applySettingsProfileDocumentSeo(dashTitle);
  };

  window.addEventListener("hashchange", () => {
    showMpdPanel(panelKeyFromHash());
  });

  document
    .getElementById("settingsProfileFinishMembership")
    ?.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("fusion-open-join-network", { detail: {} }));
    });
  if (_mpdSaveChoiceHandler) {
    window.removeEventListener("fusion-settings-profile-save-choice", _mpdSaveChoiceHandler);
  }
  _mpdSaveChoiceHandler = (event) => {
    const detail =
      event instanceof CustomEvent && detailIsObject(event.detail)
        ? event.detail
        : {};
    const action = String(detail.action || "");
    const fromBtn = pendingProfileSaveButton;
    pendingProfileSaveButton = undefined;
    if (action !== "save") return;
    if (!fromBtn) return;
    void saveProfileFromDom(fromBtn, { translate: detail.translate !== false });
  };
  window.addEventListener("fusion-settings-profile-save-choice", _mpdSaveChoiceHandler);
  document
    .getElementById("settingsProfileSyncSubscription")
    ?.addEventListener("click", async () => {
      const snap = await getAuthSnapshot();
      if (!snap.authenticated) return;
      if (
        !beginMpdOperation("membership-sync", {
          operation: "Membership",
          detail: "Refreshing subscription",
          message: "Refreshing subscription status…",
          pendingMessage: "Still refreshing subscription status...",
        })
      ) {
        return;
      }
      try {
        const { syncSubscriptionFromStripe } = await import("../utils/integrationApi.js");
        await syncSubscriptionFromStripe(snap.principal.toText());
        await ensureMyLinkedArtistProfile();
        posthog.capture("membership_subscription_sync_succeeded", {
          context: "settings_profile",
        });
        finishMpdOperation("membership-sync", "saved", "Subscription refreshed. Loading profile…");
      } catch (e) {
        finishMpdOperation(
          "membership-sync",
          "error",
          e instanceof Error ? e.message : String(e),
        );
        return;
      } finally {
        if (activeMpdOperations.has("membership-sync")) {
          finishMpdOperation("membership-sync", "idle");
        }
      }
      void load({ force: true });
    });
  document
    .getElementById("settingsProfileAdminBypass")
    ?.addEventListener("click", () => {
      adminPreviewBypassEnabled = true;
      setStatus("Admin preview bypass enabled. Loading fields…");
      void load({ force: true });
    });

  const openMpdBillingPortal = async () => {
    const snap = await getAuthSnapshot();
    if (!snap.authenticated) return;
    if (
      !beginMpdOperation("billing-portal", {
        operation: "Billing",
        detail: "Opening billing portal",
        message: "Opening billing portal…",
        pendingMessage: "Still opening billing portal...",
      })
    ) {
      return;
    }
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
      finishMpdOperation("billing-portal", "saved", "Opening billing portal…");
      window.location.assign(url);
    } catch (e) {
      finishMpdOperation(
        "billing-portal",
        "error",
        e instanceof Error ? e.message : String(e),
      );
    } finally {
      if (activeMpdOperations.has("billing-portal")) {
        finishMpdOperation("billing-portal", "idle");
      }
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
    if (
      !beginMpdOperation("membership-cancel", {
        operation: "Membership",
        detail: "Scheduling cancellation",
        message: "Scheduling cancellation…",
        pendingMessage: "Still scheduling cancellation...",
      })
    ) {
      return;
    }
    try {
      const { cancelSubscriptionAtPeriodEnd, syncSubscriptionFromStripe } =
        await import("../utils/integrationApi.js");
      await cancelSubscriptionAtPeriodEnd(snap.principal.toText());
      await syncSubscriptionFromStripe(snap.principal.toText());
      posthog.capture("membership_cancel_scheduled", {
        context: "settings_profile",
      });
      await hydrateMembershipPanel();
      finishMpdOperation(
        "membership-cancel",
        "saved",
        "Cancellation scheduled for the end of your billing period.",
      );
    } catch (e) {
      finishMpdOperation(
        "membership-cancel",
        "error",
        e instanceof Error ? e.message : String(e),
      );
    } finally {
      if (activeMpdOperations.has("membership-cancel")) {
        finishMpdOperation("membership-cancel", "idle");
      }
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

  void load({ force: true });
  window.addEventListener("fusion-auth-change", () => void load());
  window.addEventListener("fusion-admin-perspective-change", () => void load());
  window.addEventListener("fusion-data-source-change", () => void load());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void load();
  });
}
