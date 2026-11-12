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
  getMembershipAccessForCaller,
  getAccountForCaller,
  getMyAccountContactForCaller,
  setMyAccountContactForCaller,
  updateMyArtistPublicSlug,
  updateMyArtistVisibility,
  normalizeArtistRosterVisibility,
  getPrograms,
  memberTranslateText,
  memberTranslateEnToJa,
  memberReinterpretWithPrompt,
  artistRowFromMyArtistRecord,
  hasUsableWorldLlmSourceInput,
  normalizeProgramVisibility,
  unwrapOpt,
  getMyProgramPayments,
  setMyProgramPaymentFlightPreference,
  redeemAccountRecoveryCodeForCaller,
  memberFacingAccountRecoveryError,
  getContentBundleForStudio,
  getMyArtistAudioCollection,
  addMyArtistAudioEntry,
  removeMyArtistAudioEntry,
  replaceMyArtistAudioEntry,
  setMyArtistHighlightAudio,
  getMyAssetReviewNotes,
  getMembershipTierForCaller,
  getQuarterlyAppCreditBalanceForCaller,
  getApplicationCreditsForCaller,
  getAwardCreditsForCaller,
  withdrawMyProgramApplication,
  listMyProgramAwardEntries,
  getMyFlightBooking,
  setMyEstimatedArrival,
  listTravelPrepLinks,
  listMyProgramCommsRooms,
  getProgramDisplayNameFromRow,
} from "../utils/database.js";
import {
  resolveInviteMessage,
  resolveProviderThumbUrl,
} from "../utils/programCommsInvite.js";
import { withSeoImageAlt } from "../utils/mediaAltSeo.js";
import {
  cacheBustMpdPreviewUrl,
  failMpdImagePreview,
  revokeMpdLocalPreview,
  setMpdMediaSurfaceState,
  showMpdLocalImagePreview as showMpdLocalImagePreviewCore,
} from "../utils/mpdLocalImagePreview.js";
import {
  clearMpdPendingAudioPreview,
  showMpdPendingAudioPreview,
} from "../utils/mpdAudioPreview.js";
import {
  pendingAudioSaveError,
  titleFromAudioFileName,
  uniqueAudioUploadFieldKey,
  validateAudioFile,
} from "../utils/artistAudioCollection.js";
import {
  introSlotsFromWorld,
  localeBlock,
  readProfileDraftFromDom,
  readLinksFromContainer,
  safeJsonStringify,
  textareaToWorldArray,
  worldFieldToTextarea,
} from "../utils/memberProfileForm.js";
import { publicSlugFromEnglishFirstLast } from "../utils/artistSlug.js";
import {
  DISCIPLINE_OPTIONS,
  disciplineLabelToKey,
} from "../utils/feedFilterApply.js";
import { normalizeLocalesWorldForStorage } from "../utils/worldNormalize.js";
import {
  normalizeWorldSourceByField,
  worldFieldHasContent,
} from "../utils/worldPublicPick.js";
import { buildTrimmedSourceJsonForLlm } from "../utils/studioArtistWorldLlm.js";
import { suggestWorldSectionValue } from "../utils/memberWorldSectionSuggest.js";
import { applyStorySaveToLocales } from "../utils/memberStorySave.js";
import { getAuthSnapshot } from "../utils/icAuth.js";
import { DEV_MODE } from "../config.js";
import { uploadBlobToS3 } from "../utils/studioS3Upload.js";
import { openMpdAudioCaptureModal } from "./subComponents/audioCaptureModal.js";
import {
  isArtistAudioApproved,
  isArtistAudioFullSiteApproved,
} from "../utils/artistCardImageMode.js";
import {
  prepareImageFileForUpload,
} from "../utils/imageUploadPrep.js";
import { getProfileSetupDraft } from "../utils/profileSetupDraft.js";
import { navigate } from "../router.js";
import { applyDocumentSeo } from "../utils/documentSeo.js";
import {
  getEffectiveAccountForSettingsUi,
  getAdminPerspective,
  isRealAdminCaller,
} from "../utils/adminPerspective.js";
import { firstNonEmptyString } from "../utils/localeFallback.js";
import {
  formatUsdFromCents,
  parseUsdDisplayToCents,
  applicantCategoryDiscountCents,
  computeMemberProgramTotalDueCents,
  computeApplicantEffectiveTotalDueCents,
  resolveMemberProgramTotalDueCents,
  resolveMemberChargeableDepositCents,
  PROGRAM_OWN_FLIGHT_CREDIT_CENTS,
  PROGRAM_RESIDENCY_BASE_TOTAL_CENTS,
  resolveProgramDepositCents,
  isMemberProgramDepositPaid,
  countPaymentPlanMonthsUntilStart,
} from "../utils/programPaymentMoney.js";
import { canStartProgramPaymentPlan } from "../utils/paymentProvider.js";
import { normalizeApplicantCategory } from "../utils/studioPlainForms.js";
import {
  applicationsIncludeTester,
  canShowApplicationOnlyDisplayToggle,
  countApplicationsFromRecord,
  readApplicationOnlyDisplayPref,
  shouldUseApplicantLightGate,
  shouldUseApplicantStudioMode,
  writeApplicationOnlyDisplayPref,
} from "../utils/applicantStudioMode.js";
import {
  applicantJoinUnlockHtml,
  buildApplicantJoinUnlockModel,
  wireApplicantJoinUnlock,
} from "../utils/applicantStudioJoinUnlock.js";
import { parseProgramDrawClosed } from "../utils/applicantsDrawModel.js";
import { trialAccessCodeFromSearch } from "../utils/trialAccessCode.js";
import { studioIconHref } from "../utils/studioIconRegistry.js";
import { syncMembershipAfterAccountRecovery } from "../utils/integrationApi.js";
import {
  MEMBERSHIP_TIER_META,
  getChangePlanOptions,
  normalizeMembershipTier,
  startPlanChange,
  membershipTierFromPlanId,
} from "../utils/membershipPlanChange.js";
import { buildMembershipCreditsStripModel } from "../utils/membershipCreditsDisplay.js";
import { formatStudioDate } from "../utils/studioDateFormat.js";
import exploreProgramsIconUrl from "../assets/icons/fusion_dashboard_svg_icons/explore-programs.svg";
import myProgramsIconUrl from "../assets/icons/fusion_dashboard_svg_icons/my-programs.svg";
import paymentsIconUrl from "../assets/icons/fusion_dashboard_svg_icons/payments.svg";
import {
  mountMemberProgramCalendar,
  resolveMemberCalendarGate,
} from "./subComponents/memberProgramCalendar.js";
import manualPaymentIconUrl from "../assets/icons/fusion_dashboard_svg_icons/manual-payment.svg";
import paymentPlanIconUrl from "../assets/icons/fusion_dashboard_svg_icons/payment-plan.svg";
import receiptDownloadIconUrl from "../assets/icons/fusion_dashboard_svg_icons/receipt-download.svg";
import warningIconUrl from "../assets/icons/fusion_dashboard_svg_icons/warning.svg";
import flightIconUrl from "../assets/icons/flight-icon.png";
import studioSecIdentityImg from "../assets/static-images/identity.jpg";
import studioSecWorkImg from "../assets/static-images/work.jpg";
import studioSecExhibitionsImg from "../assets/static-images/exhibitions-programs.jpg";
import studioSecMediaImg from "../assets/static-images/media-library.jpg";
import studioSecJournalImg from "../assets/static-images/journal.jpg";
import studioSecPreviewImg from "../assets/static-images/profile-preview.jpg";

function mpdDisciplineSelectHtml() {
  const opts = [
    `<option value="">Select discipline…</option>`,
    ...DISCIPLINE_OPTIONS.map(
      (o) =>
        `<option value="${mpdEscapeAttr(o.key)}">${mpdEscapeAttr(o.label)}</option>`
    ),
  ];
  return `<select id="mpd_discipline" class="studio-input" aria-label="Discipline">${opts.join("")}</select>`;
}

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

const MPD_I18N = {
  "studio-overview": { en: "Studio Overview", ja: "スタジオ概要" },
  "identity": { en: "Presence", ja: "プレゼンス" },
  "work": { en: "Work", ja: "作品" },
  "programs": { en: "Programs", ja: "プログラム" },
  "media": { en: "Media", ja: "メディア" },
  "journal": { en: "Journal", ja: "ジャーナル" },
  "preview": { en: "Profile", ja: "プロフィール" },
  "settings": { en: "Settings", ja: "設定" },
  "your-studio": { en: "Studio", ja: "スタジオ" },
  "completion": { en: "PROFILE COMPLETION", ja: "プロフィール完成度" },
  "blindspots": { en: "BLINDSPOTS", ja: "ブラインドスポット" },
  "studio-sections": { en: "STUDIO SECTIONS", ja: "スタジオセクション" },
  "publish-settings": { en: "PUBLISH SETTINGS", ja: "公開設定" },
  "save-changes": { en: "SAVE CHANGES", ja: "変更を保存" },
  "improve": { en: "IMPROVE", ja: "改善" },
  "edit-section": { en: "EDIT SECTION", ja: "セクションを編集" },
  "manage": { en: "MANAGE", ja: "管理" },
  "view-profile": { en: "VIEW FULL PROFILE", ja: "プロフィールを見る" },
  "view-public-profile": { en: "VIEW PUBLIC PROFILE", ja: "公開プロフィールを見る" },
  "apply-residency": { en: "APPLY TO RESIDENCY", ja: "レジデンシーに応募" },
  "coming-soon": { en: "Coming soon", ja: "近日公開" },
  "incomplete": { en: "Profile Incomplete", ja: "プロフィール未完成" },
  "complete": { en: "Profile Complete", ja: "プロフィール完成" },
};
function mpdLabel(key) {
  const entry = MPD_I18N[key];
  if (!entry) return key;
  const lang = document.documentElement.lang || "en";
  return lang === "ja" && entry.ja ? entry.ja : entry.en;
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
/** Story & World sections whose AI suggestion is currently generating. */
const mpdStorySuggestBusy = new Set();
/** Profile context for module-level upload helpers (synced from initSettingsProfile.load). */
let mpdCurrentArtistId = "";
let mpdProfileSlug = "";
/** @type {(msg: string) => void} */
let mpdWriteStatus = () => {};
/** @type {Map<string, string>} */
const mpdLocalPreviewObjectUrls = new Map();
/** @type {'inactive' | 'pending' | 'private' | 'public'} */
let mpdBackendRosterVisibility = "inactive";
/** @type {Array<Record<string, unknown>>} */
let mpdProgramPaymentItems = [];
let mpdSelectedPaymentProgramId = "";
let mpdLastProgramsForPayments = [];
/** @type {{ id: string, name: string }[]} */
let mpdCalendarEligiblePrograms = [];

/**
 * Panel-specific shout (HTML allowed) and plain hint for `#settingsProfileHint`.
 * Overview keeps the default marketing lines; other sections align copy to the task.
 */
const MPD_PANEL_CHROME = {
  "studio-overview": {
    shoutHtml:
      "Your creative space.<br />Shape your presence.",
    hint:
      "Track your  development, explore sections, and publish when you are ready.",
  },
  overview: {
    shoutHtml:
      "Your creative space.<br />Shape your presence.",
    hint:
      "Track your development, explore sections, and publish when you are ready.",
  },
  identity: {
    shoutHtml:
      "Define who you are.",
    hint:
      "Name, discipline, bio, status, location, and the story behind your work — save each section as you go.",
  },
  work: {
    shoutHtml: "Your portfolio.",
    hint:
      "Manage works, projects, and the pieces that define your practice.",
  },
  media: {
    shoutHtml: "Your visual library.",
    hint:
      "Main artwork, profile card, intro gallery, and audio — all in one place.",
  },
  journal: {
    shoutHtml: "Your creative journal.",
    hint:
      "Notes, reflections, and entries from your practice.",
  },
  preview: {
    shoutHtml: "See how others see you.",
    hint:
      "Preview your public profile as visitors will experience it.",
  },
  settings: {
    shoutHtml: "Account &amp; membership.",
    hint:
      "Membership status, account recovery, and linked account information.",
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
      "Your practice, perspective, vision, and how you are constructing the world you want to create.",
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
  "join-unlock": {
    shoutHtml: "Unlock your studio.",
    hint:
      "Become a FUSION member to open your full profile and exclusive platform access. You can still track applications under Programs.",
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
 * @returns {Promise<File>}
 */
async function mpdPrepareImageFile(f) {
  const { file, heicWarning } = await prepareImageFileForUpload(f, MPD_MAX_IMAGE_BYTES);
  if (heicWarning) {
    mpdNotifyStatus(
      "HEIC photo accepted — if preview fails, export as JPEG or WebP and upload again.",
    );
  }
  return file;
}

/** @param {boolean} enabled */
function setMpdMediaUploadsEnabled(enabled) {
  document.querySelectorAll(".mpd-file-input-hidden").forEach((inp) => {
    if (inp instanceof HTMLInputElement && inp.accept?.includes("image")) {
      inp.disabled = !enabled;
    }
  });
  document.querySelectorAll(".mpd-media-upload-label").forEach((lab) => {
    if (!(lab instanceof HTMLElement)) return;
    lab.classList.toggle("is-disabled", !enabled);
    lab.style.pointerEvents = enabled ? "" : "none";
    lab.style.opacity = enabled ? "" : "0.45";
    if (!enabled) {
      lab.setAttribute("aria-disabled", "true");
      lab.title = "Loading profile…";
    } else {
      lab.removeAttribute("aria-disabled");
      lab.removeAttribute("title");
    }
  });
}

/**
 * @param {string} msg
 */
function mpdNotifyStatus(msg) {
  mpdWriteStatus(msg || "");
  if (!msg) return;
  const statusLine = document.getElementById("settingsProfileStatus");
  if (statusLine) {
    statusLine.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

/**
 * @param {HTMLInputElement} t
 * @returns {boolean}
 */
function mpdImageUploadReady(t) {
  if (mpdCurrentArtistId || mpdProfileSlug || getDataSource() === "test") return true;
  mpdNotifyStatus(
    "Profile still loading — wait a moment, then try your upload again.",
  );
  t.value = "";
  return false;
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
  if (!acc || typeof acc !== "object") return "Studio";
  const r = /** @type {Record<string, unknown>} */ (acc).role;
  if (r && typeof r === "object") {
    if ("user" in r) return "Studio";
    if ("artist" in r) return "Studio";
    if ("gallery" in r) return "Studio";
    if ("curator" in r) return "Studio";
    if ("collector" in r) return "Studio";
    if ("staff" in r) return "Studio";
    if ("admin" in r) return "Studio";
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
 * Profile-level quote (hero quote) always comes from the artist's own words column.
 * @returns {string}
 */
function getMpdProfileQuoteForSave() {
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
function setMpdMediaSurfaceStateOnPage(key, state) {
  setMpdMediaSurfaceState(document, key, state);
}

/** @param {string} key */
function mpdRevokeLocalPreview(key) {
  revokeMpdLocalPreview(mpdLocalPreviewObjectUrls, key);
}

/**
 * Show immediate thumbnail from a selected file before S3 upload completes.
 * @param {string} key hero | heroProfile | intro-0..2
 * @param {File} file
 */
function showMpdLocalImagePreview(key, file) {
  showMpdLocalImagePreviewCore(document, mpdLocalPreviewObjectUrls, key, file);
  if (key === "hero") setHeroSpinnerVisible(false);
  else if (key === "heroProfile") setHeroProfileSpinnerVisible(false);
  else {
    const introMatch = /^intro-(\d+)$/.exec(key);
    if (introMatch) setIntroSpinnerVisible(Number(introMatch[1]), false);
  }
}

/**
 * @param {string} key intro-0..2
 * @param {string} remoteUrl
 */
function mpdFinishIntroRemotePreview(key, remoteUrl) {
  mpdRevokeLocalPreview(key);
  const introMatch = /^intro-(\d+)$/.exec(key);
  if (!introMatch) return;
  const i = Number(introMatch[1]);
  setMpdMediaSurfaceStateOnPage(key, { hasMedia: true, hasPreview: true });
  const th = /** @type {HTMLImageElement | null} */ (
    document.getElementById(`mpd_intro_${i}_thumb`)
  );
  if (!th) return;
  th.style.display = "none";
  th.onload = () => {
    setIntroSpinnerVisible(i, false);
    th.style.display = "block";
    th.onload = null;
    th.onerror = null;
  };
  th.onerror = () => {
    setIntroSpinnerVisible(i, false);
    setMpdMediaSurfaceStateOnPage(key, { hasMedia: true, hasPreview: false });
    mpdNotifyStatus("Preview could not load. Save and refresh, or try another image.");
    th.onload = null;
    th.onerror = null;
  };
  th.src = cacheBustMpdPreviewUrl(remoteUrl);
  if (th.complete && th.naturalHeight > 0) {
    setIntroSpinnerVisible(i, false);
    th.style.display = "block";
    th.onload = null;
    th.onerror = null;
  }
}

/**
 * @param {string} key
 */
function mpdFailImagePreview(key) {
  failMpdImagePreview(document, mpdLocalPreviewObjectUrls, key);
  if (key === "hero") setHeroSpinnerVisible(false);
  else if (key === "heroProfile") setHeroProfileSpinnerVisible(false);
  else {
    const introMatch = /^intro-(\d+)$/.exec(key);
    if (introMatch) setIntroSpinnerVisible(Number(introMatch[1]), false);
  }
}

function updateHeroProfileCardCopy() {
  const nameNode = document.getElementById("mpd_hero_profile_card_name");
  const disciplineNode = document.getElementById("mpd_hero_profile_card_discipline");
  const name = [getVal("mpd_first_name"), getVal("mpd_last_name")]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
  const disciplineEl = document.getElementById("mpd_discipline");
  let discipline = "";
  if (disciplineEl instanceof HTMLSelectElement) {
    discipline =
      disciplineEl.selectedIndex > 0
        ? disciplineEl.options[disciplineEl.selectedIndex].text
        : "";
  } else {
    discipline = getVal("mpd_discipline").trim();
  }
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

/** @param {unknown} err */
function formatMemberProfileSaveError(err) {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const blob = `${raw} ${err && typeof err === "object" && "message" in err ? String(/** @type {{ message?: unknown }} */ (err).message) : ""}`;
  if (/No linked artist on account/i.test(blob)) {
    return "Your account is not linked to a profile yet. Refresh this page, or contact Fusion if the problem continues.";
  }
  if (/Linked artist not found/i.test(blob)) {
    return "Your linked profile record could not be found. Refresh this page, or contact Fusion for help.";
  }
  if (/No account for caller/i.test(blob)) {
    return "You're signed in, but this Internet Identity isn't linked to a Fusion member account. Contact support with your checkout email if you paid with a different login.";
  }
  if (/Active membership required/i.test(blob)) {
    return "Translation requires an active membership. Choose Just save to update your profile without translation, or renew membership first.";
  }
  if (/Text too long for Studio LLM/i.test(blob)) {
    return "Some text is too long to translate automatically. Choose Just save, or shorten your bio and story sections.";
  }
  if (/Image URL too long|Profile image URL too long/i.test(blob)) {
    return "An image URL is too long to save. Try re-uploading the image, or use a shorter hosted URL.";
  }
  if (/Audio URL too long/i.test(blob)) {
    return "The audio URL is too long to save. Try re-uploading the file.";
  }
  if (/Anonymous caller/i.test(blob)) {
    return "Your session expired. Sign in again, then retry saving.";
  }
  if (
    raw &&
    raw.length < 280 &&
    !/Request ID:|Reject code:|ic0\.trap|Canister called/i.test(raw)
  ) {
    return raw;
  }
  return "Profile could not be saved. Try Just save without translation, refresh the page, or contact Fusion if this keeps happening.";
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

/**
 * Read the Story & World form. The artist's own column keeps the historical
 * `mpd_w_*` ids, so this is still the canonical single-locale draft for saves.
 * @returns {Record<string, unknown>}
 */
function readMpdProfileDraftForSave() {
  return readProfileDraftFromDom(getVal);
}

/**
 * Read the AI (`worldNew`) column. Both columns are editable in the restyled editor.
 * @returns {Record<string, unknown>}
 */
function readMpdStoryWorldNewFromDom() {
  return {
    practice: getVal("mpd_wn_practice"),
    perspective: textareaToWorldArray(getVal("mpd_wn_perspective")),
    vision: textareaToWorldArray(getVal("mpd_wn_vision")),
    constructing: textareaToWorldArray(getVal("mpd_wn_constructing")),
    context: textareaToWorldArray(getVal("mpd_wn_context")),
    quote: getVal("mpd_wn_quote"),
  };
}

/**
 * Which column is published, per section.
 * @returns {Record<string, 'world' | 'newWorld'>}
 */
function readMpdStoryWorldSourceFromDom() {
  /** @type {Record<string, 'world' | 'newWorld'>} */
  const out = {};
  for (const field of MPD_WORLD_TEXT_FIELDS) {
    const checked = document.querySelector(`input[name="mpd_pick_${field}"]:checked`);
    out[field] =
      checked instanceof HTMLInputElement && checked.value === "world" ? "world" : "newWorld";
  }
  return out;
}

/**
 * Story state that lives outside the single-locale draft.
 * @returns {{ worldNew: Record<string, unknown>, worldSourceByField: Record<string, 'world' | 'newWorld'> }}
 */
function readMpdStorySaveExtras() {
  return {
    worldNew: readMpdStoryWorldNewFromDom(),
    worldSourceByField: readMpdStoryWorldSourceFromDom(),
  };
}

/** @param {string} field */
function mpdStorySectionLabel(field) {
  const labels = {
    practice: "Practice",
    perspective: "Perspective",
    vision: "Vision",
    constructing: "Constructing",
    context: "Context",
    quote: "Quote",
  };
  return labels[field] || field;
}

/**
 * Artist row shaped for the LLM, with whatever is currently typed in the form
 * layered over the stored English locale (unsaved bio/discipline edits count).
 * @param {Record<string, unknown> | null | undefined} artistRow
 * @returns {Record<string, unknown>}
 */
function mpdStoryLlmRow(artistRow) {
  const row = artistRow && typeof artistRow === "object" ? artistRow : {};
  const locales =
    row.locales && typeof row.locales === "object"
      ? /** @type {Record<string, unknown>} */ (row.locales)
      : { en: {}, ja: {} };
  const en = localeBlock(locales, "en");
  const draft = readProfileDraftFromDom(getVal);
  const draftWorld =
    draft.world && typeof draft.world === "object" && !Array.isArray(draft.world)
      ? /** @type {Record<string, unknown>} */ (draft.world)
      : {};
  const enWorld =
    en.world && typeof en.world === "object" && !Array.isArray(en.world)
      ? /** @type {Record<string, unknown>} */ (en.world)
      : {};
  return {
    ...row,
    locales: {
      ...locales,
      en: {
        ...en,
        firstName: draft.firstName,
        lastName: draft.lastName,
        name: draft.name,
        discipline: draft.discipline,
        bio: draft.bio,
        status: draft.status,
        location: draft.location,
        world: { ...enWorld, ...draftWorld },
      },
    },
  };
}

/**
 * @param {unknown} err
 * @returns {string}
 */
function formatMpdStorySuggestError(err) {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  if (/Live data source|requires Live data/i.test(raw)) {
    return "AI suggestions need Live data. Connect the live backend to generate copy.";
  }
  if (
    /empty suggestion|could not write this section|source text|not available right now/i.test(raw)
  ) {
    return "Couldn’t write that section yet. Add a little more detail to your bio, then try again.";
  }
  if (raw && raw.length < 200) return raw;
  return "Couldn’t generate this section. Check your connection and try again.";
}

/**
 * @param {Record<string, unknown>} world
 * @param {'w' | 'wn'} [prefix]
 */
function setMpdStoryFieldsFromWorld(world, prefix = "w") {
  const p = prefix === "wn" ? "mpd_wn_" : "mpd_w_";
  setVal(`${p}practice`, String(world.practice ?? ""));
  setVal(`${p}perspective`, worldFieldToTextarea(world.perspective));
  setVal(`${p}vision`, worldFieldToTextarea(world.vision));
  setVal(`${p}constructing`, worldFieldToTextarea(world.constructing));
  setVal(`${p}context`, worldFieldToTextarea(world.context));
  setVal(`${p}quote`, String(world.quote ?? ""));
}

/**
 * Tick one section's publish column (radio) without firing DOM events.
 * @param {string} field
 * @param {'world' | 'newWorld'} source
 */
function setMpdStoryPick(field, source) {
  const pick = source === "world" ? "world" : "newWorld";
  document.querySelectorAll(`input[name="mpd_pick_${field}"]`).forEach((node) => {
    if (node instanceof HTMLInputElement) node.checked = node.value === pick;
  });
}

/**
 * Paint the per-section publish choice: green outline on the chosen column, the
 * row note, and the card summary line.
 */
function syncMpdStoryPickUi() {
  const picks = readMpdStoryWorldSourceFromDom();
  for (const field of MPD_WORLD_TEXT_FIELDS) {
    const row = document.querySelector(`[data-mpd-story-field="${field}"]`);
    if (!(row instanceof HTMLElement)) continue;
    const picked = picks[field] === "world" ? "world" : "newWorld";
    row.setAttribute("data-mpd-story-picked", picked);
    const ownEmpty = !getVal(`mpd_w_${field}`).trim();
    const aiEmpty = !getVal(`mpd_wn_${field}`).trim();
    row.querySelectorAll("[data-mpd-story-column]").forEach((col) => {
      if (!(col instanceof HTMLElement)) return;
      const column = col.getAttribute("data-mpd-story-column");
      const isPicked = column === picked;
      const isEmpty = column === "world" ? ownEmpty : aiEmpty;
      col.classList.toggle("is-picked", isPicked);
      col.classList.toggle("is-empty", isEmpty);
      const radio = col.querySelector('input[type="radio"]');
      if (radio instanceof HTMLInputElement) radio.checked = isPicked;
    });
    const note = row.querySelector("[data-mpd-story-pick-note]");
    if (note) {
      const pickedEmpty = picked === "world" ? ownEmpty : aiEmpty;
      const columnName = picked === "world" ? "your words" : "the AI version";
      note.textContent = pickedEmpty
        ? `Publishing ${columnName} — this column is empty, so visitors see the other one.`
        : `Publishing ${columnName}.`;
    }
    const suggestBtn = row.querySelector("[data-mpd-suggest-field]");
    if (suggestBtn instanceof HTMLButtonElement) {
      const busy = mpdStorySuggestBusy.has(field);
      suggestBtn.setAttribute("aria-busy", busy ? "true" : "false");
      suggestBtn.disabled = busy;
      row.classList.toggle("is-generating", busy);
    }
  }
  syncMpdStoryPickSummary(picks);
}

/** @param {Record<string, string>} [picks] */
function syncMpdStoryPickSummary(picks) {
  const el = document.getElementById("mpd_story_pick_summary");
  if (!el) return;
  const map = picks || readMpdStoryWorldSourceFromDom();
  const aiCount = MPD_WORLD_TEXT_FIELDS.filter((f) => map[f] === "newWorld").length;
  const aiWritten = MPD_WORLD_TEXT_FIELDS.filter((f) => getVal(`mpd_wn_${f}`).trim()).length;
  if (aiCount === 0) {
    el.textContent = "Your profile shows your own words in every story section.";
    return;
  }
  el.textContent = `Your profile shows the AI version in ${String(aiCount)} of ${String(
    MPD_WORLD_TEXT_FIELDS.length,
  )} sections (${String(aiWritten)} written).`;
}

/**
 * Fill both Story columns for the active language and restore the publish choice.
 * Sections without an explicit choice default to the column that actually has copy
 * (matching what the public profile falls back to).
 * @param {Record<string, unknown>} locales
 * @param {'en' | 'ja'} active
 */
function fillMpdStoryColumns(locales, active) {
  const world = mpdWorldBlockFromLocales(locales, active, "world");
  const worldNew = mpdWorldBlockFromLocales(locales, active, "worldNew");
  setMpdStoryFieldsFromWorld(world, "w");
  setMpdStoryFieldsFromWorld(worldNew, "wn");
  const explicit =
    locales && typeof locales === "object"
      ? normalizeWorldSourceByField(
          /** @type {Record<string, unknown>} */ (locales).worldSourceByField,
        )
      : {};
  for (const field of MPD_WORLD_TEXT_FIELDS) {
    const stored = explicit[field];
    const byContent = worldFieldHasContent(worldNew[field]) ? "newWorld" : "world";
    setMpdStoryPick(field, stored === "world" || stored === "newWorld" ? stored : byContent);
  }
  syncMpdStoryPickUi();
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
    return Promise.all(
      raw.map((item) => translateMpdTextValue(item, targetLocale, sourceLocaleHint)),
    );
  }
  const text = String(raw ?? "").trim();
  if (!text) return "";
  return (await memberTranslateText(text, targetLocale, sourceLocaleHint)).trim();
}

/**
 * Normalize a field value to a stable string for comparison.
 * Arrays and objects are JSON-serialized; primitives are trimmed strings.
 * @param {unknown} v
 * @returns {string}
 */
function mpdFieldFingerprint(v) {
  if (v == null) return "";
  if (Array.isArray(v)) return JSON.stringify(v);
  if (typeof v === "object") return JSON.stringify(v);
  return String(v).trim();
}

/**
 * @param {Record<string, unknown>} sourceBlock
 * @param {'en'|'ja'} targetLocale
 * @param {string} sourceLocaleHint
 * @param {Record<string, unknown>} [prevSourceBlock] — the source block from the previous save
 * @param {Record<string, unknown>} [prevTranslatedBlock] — existing translation for `targetLocale`
 */
async function translateProfileDraftBlock(
  sourceBlock,
  targetLocale,
  sourceLocaleHint,
  prevSourceBlock,
  prevTranslatedBlock,
) {
  const out = /** @type {Record<string, unknown>} */ (cloneMpdValue(sourceBlock) || {});
  const hasPrev = prevSourceBlock && typeof prevSourceBlock === "object"
    && prevTranslatedBlock && typeof prevTranslatedBlock === "object";

  /**
   * @param {string} key
   * @param {unknown} current
   * @returns {Promise<unknown>}
   */
  const translateIfChanged = (key, current) => {
    if (
      hasPrev &&
      mpdFieldFingerprint(current) === mpdFieldFingerprint(prevSourceBlock[key]) &&
      prevTranslatedBlock[key] != null
    ) {
      return Promise.resolve(cloneMpdValue(prevTranslatedBlock[key]));
    }
    return translateMpdTextValue(current, targetLocale, sourceLocaleHint);
  };

  const [discipline, bio] = await Promise.all([
    translateIfChanged("discipline", sourceBlock.discipline),
    translateIfChanged("bio", sourceBlock.bio),
  ]);
  out.discipline = discipline;
  out.bio = bio;
  out.bioLong = "";

  const w0 =
    sourceBlock.world && typeof sourceBlock.world === "object" && !Array.isArray(sourceBlock.world)
      ? /** @type {Record<string, unknown>} */ (sourceBlock.world)
      : {};
  const w = /** @type {Record<string, unknown>} */ (cloneMpdValue(w0) || {});

  const prevW0 = hasPrev && prevSourceBlock.world && typeof prevSourceBlock.world === "object"
    ? /** @type {Record<string, unknown>} */ (prevSourceBlock.world)
    : undefined;
  const prevTransW = hasPrev && prevTranslatedBlock.world && typeof prevTranslatedBlock.world === "object"
    ? /** @type {Record<string, unknown>} */ (prevTranslatedBlock.world)
    : undefined;

  /**
   * @param {string} key
   * @param {unknown} current
   * @returns {Promise<unknown>}
   */
  const translateWorldField = (key, current) => {
    if (
      prevW0 && prevTransW &&
      mpdFieldFingerprint(current) === mpdFieldFingerprint(prevW0[key]) &&
      prevTransW[key] != null
    ) {
      return Promise.resolve(cloneMpdValue(prevTransW[key]));
    }
    return translateMpdTextValue(current, targetLocale, sourceLocaleHint);
  };

  const worldResults = await Promise.all([
    translateWorldField("practice", w0.practice),
    translateWorldField("perspective", w0.perspective),
    translateWorldField("vision", w0.vision),
    translateWorldField("constructing", w0.constructing),
    translateWorldField("context", w0.context),
    translateWorldField("quote", w0.quote),
  ]);
  [w.practice, w.perspective, w.vision, w.constructing, w.context, w.quote] = worldResults;

  const gallery = Array.isArray(w0.introGallery)
    ? /** @type {Array<Record<string, unknown>>} */ (cloneMpdValue(w0.introGallery))
    : [];
  const prevGallery = prevW0 && Array.isArray(prevW0.introGallery)
    ? /** @type {Array<Record<string, unknown>>} */ (prevW0.introGallery) : [];
  const prevTransGallery = prevTransW && Array.isArray(prevTransW.introGallery)
    ? /** @type {Array<Record<string, unknown>>} */ (prevTransW.introGallery) : [];

  const galleryItems = await Promise.all(
    gallery.filter((item) => item && typeof item === "object").map(async (item, idx) => {
      const prevItem = prevGallery[idx];
      const prevTransItem = prevTransGallery[idx];
      const hasPrevItem = prevItem && typeof prevItem === "object"
        && prevTransItem && typeof prevTransItem === "object";
      const [alt, caption] = await Promise.all([
        hasPrevItem && mpdFieldFingerprint(item.alt) === mpdFieldFingerprint(prevItem.alt) && prevTransItem.alt != null
          ? Promise.resolve(cloneMpdValue(prevTransItem.alt))
          : translateMpdTextValue(item.alt, targetLocale, sourceLocaleHint),
        hasPrevItem && mpdFieldFingerprint(item.caption) === mpdFieldFingerprint(prevItem.caption) && prevTransItem.caption != null
          ? Promise.resolve(cloneMpdValue(prevTransItem.caption))
          : translateMpdTextValue(item.caption, targetLocale, sourceLocaleHint),
      ]);
      return { ...item, alt, caption };
    }),
  );
  w.introGallery = galleryItems;
  out.world = w;
  return out;
}

/**
 * @param {Record<string, unknown>} prev
 * @param {Record<string, unknown>} draft
 * @param {(id: string) => string | undefined} val
 * @param {{ translate?: boolean, active?: 'en' | 'ja', story?: { worldNew?: Record<string, unknown>, worldSourceByField?: Record<string, unknown> } }} [options]
 */
async function buildSmartProfileLocales(prev, draft, val, options = {}) {
  const out = /** @type {Record<string, unknown>} */ (
    cloneMpdValue(prev && typeof prev === "object" ? prev : { en: {}, ja: {} }) || {}
  );
  if (options.translate === false) {
    out.en = cloneMpdValue(draft);
    out.ja = cloneMpdValue(draft);
  } else {
    try {
      const source = inferProfileDraftLanguage(draft);
      const prevEn = localeBlock(prev, "en");
      const prevJa = localeBlock(prev, "ja");
      if (source === "ja") {
        out.ja = cloneMpdValue(draft);
        out.en = await translateProfileDraftBlock(draft, "en", "ja", prevJa, prevEn);
      } else if (source === "en") {
        out.en = cloneMpdValue(draft);
        out.ja = await translateProfileDraftBlock(draft, "ja", "en", prevEn, prevJa);
      } else {
        const [en, ja] = await Promise.all([
          translateProfileDraftBlock(draft, "en", "auto", prevEn, prevEn),
          translateProfileDraftBlock(draft, "ja", "auto", prevEn, prevJa),
        ]);
        out.en = en;
        out.ja = ja;
      }
    } catch (translateErr) {
      const hint = formatMemberProfileSaveError(translateErr);
      throw new Error(
        hint.includes("Just save") ? hint : `${hint} Try Just save without translation.`,
      );
    }
  }
  applyStorySaveToLocales(out, prev, options);
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
  setVal("mpd_discipline", disciplineLabelToKey(String(b.discipline ?? "")));
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
    setMpdMediaSurfaceStateOnPage(`intro-${i}`, {
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
      // Deterministic S3 keys reuse the same public URL on replace — bust cache.
      im.src = cacheBustMpdPreviewUrl(s.src);
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
  fillMpdStoryColumns(locales, active);
  syncMpdAudioSectionVisibility(locales);
}

/**
 * Audio section is always visible in the member's own Studio dashboard.
 * The `audioDisplayForArtist` flag in locales controls the staff-managed
 * artist form, not the member-facing media library.
 */
function syncMpdAudioSectionVisibility(_locales) {
  const wrap = document.getElementById("mpd_audio_section");
  if (!wrap) return;
  wrap.hidden = false;
  wrap.setAttribute("aria-hidden", "false");
  wrap.classList.remove("mpd-audio-section--hidden");
  wrap.querySelectorAll("input, textarea").forEach((el) => {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.disabled = false;
    }
  });
  const audioLab = document.querySelector('label[for="mpd_audio_file"]');
  if (audioLab instanceof HTMLLabelElement) {
      audioLab.removeAttribute("aria-disabled");
      audioLab.style.pointerEvents = "";
      audioLab.style.opacity = "";
    }
  const recordBtn = document.getElementById("mpd_audio_record_open");
  if (recordBtn instanceof HTMLButtonElement) {
    recordBtn.disabled = false;
    recordBtn.style.opacity = "";
  }
}

const MPD_AUDIO_INSPIRATION_DEFAULT =
  '\u201CWords mean more than what is set down on paper. It takes the human voice to infuse them with deeper meaning.\u201D \u2014 Maya Angelou';

async function loadMpdAudioInspirationText() {
  const el = document.getElementById("mpd_audio_inspiration");
  if (!el) return;
  try {
    const bundle = await getContentBundleForStudio("user-studio");
    const text = bundle?.audioInspirationText;
    if (text && typeof text === "object") {
      const locale = document.documentElement.lang?.startsWith("ja") ? "ja" : "en";
      const resolved = String(text[locale] || text.en || "").trim();
      if (resolved) { el.textContent = resolved; return; }
    }
  } catch { /* fall through to default */ }
  el.textContent = MPD_AUDIO_INSPIRATION_DEFAULT;
}

// ── Asset review banner helpers ──

/** @type {{ heroProfileImage: object|null, audioEntries: [string, object][] }} */
let mpdAssetReviewNotes = { heroProfileImage: null, audioEntries: [] };

function mpdReviewBannerHtml(note) {
  if (!note) return '';
  let variant = 'pending';
  let label = 'Pending review';
  if (note.approved) {
    variant = 'approved';
    label = 'Approved';
  } else if (note.reason) {
    variant = 'rejected';
    label = 'Changes requested';
  }
  const infoBtn = (note.reason || note.imageUrl)
    ? ` <button type="button" class="mpd-asset-review-banner__info-btn" data-action="review-info">More info</button>`
    : '';
  return `<div class="mpd-asset-review-banner mpd-asset-review-banner--${variant}">
    <span class="mpd-asset-review-banner__text">${label}</span>${infoBtn}
  </div>`;
}

function openMpdReviewNotePopup(note) {
  if (!note) return;
  let statusClass = 'pending';
  let statusLabel = 'Pending review';
  if (note.approved) { statusClass = 'approved'; statusLabel = 'Approved'; }
  else if (note.reason) { statusClass = 'rejected'; statusLabel = 'Changes requested'; }

  const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const reasonHtml = note.reason ? `<p class="mpd-review-note-modal__reason">${esc(note.reason)}</p>` : '';
  const imageHtml = note.imageUrl ? `<img class="mpd-review-note-modal__image" src="${esc(note.imageUrl)}" alt="Reference" />` : '';
  const dateHtml = note.reviewedAt ? `<p class="mpd-review-note-modal__date">Reviewed: ${new Date(Number(note.reviewedAt) / 1e6 || note.reviewedAt).toLocaleDateString()}</p>` : '';

  const overlay = document.createElement('div');
  overlay.className = 'mpd-review-note-modal';
  overlay.innerHTML = `
    <div class="mpd-review-note-modal__scrim" data-close></div>
    <div class="mpd-review-note-modal__panel">
      <button class="mpd-review-note-modal__x" data-close>&times;</button>
      <h3>Review Note</h3>
      <div class="mpd-review-note-modal__status ${statusClass}">${statusLabel}</div>
      ${reasonHtml}
      ${imageHtml}
      ${dateHtml}
    </div>
  `;
  const closeModal = () => overlay.remove();
  overlay.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeModal));
  document.body.appendChild(overlay);
}

async function loadMpdAssetReviewNotes() {
  try {
    mpdAssetReviewNotes = await getMyAssetReviewNotes();
  } catch (e) {
    console.warn('Failed to load asset review notes', e);
    mpdAssetReviewNotes = { heroProfileImage: null, audioEntries: [] };
  }
  renderMpdHeroProfileReviewBanner();
}

function renderMpdHeroProfileReviewBanner() {
  const container = document.getElementById('mpd_hero_profile_review_banner');
  if (!container) return;
  container.innerHTML = mpdReviewBannerHtml(mpdAssetReviewNotes.heroProfileImage);
  container.querySelectorAll('[data-action="review-info"]').forEach((btn) => {
    btn.addEventListener('click', () => openMpdReviewNotePopup(mpdAssetReviewNotes.heroProfileImage));
  });
}

/** Saved audio bites currently listed in Media Library (max 5). */
let mpdAudioEntryCount = 0;

/**
 * Render the audio collection list with playback, delete, highlight, and replace controls.
 * @param {{ entries: { url: string, title: string, addedAt: string }[], highlightUrl: string, approvedUrls: string[] } | null} collection
 */
function renderMpdAudioCollection(collection) {
  const container = document.getElementById("mpd_audio_collection");
  const countEl = document.getElementById("mpd_audio_count");
  const actionsEl = document.getElementById("mpd_audio_actions");
  if (!container) return;
  const entries = collection?.entries ?? [];
  mpdAudioEntryCount = entries.length;
  const highlightUrl = collection?.highlightUrl ?? "";
  const approvedSet = new Set(collection?.approvedUrls ?? []);
  const fullSiteSet = new Set(collection?.fullSiteApprovedUrls ?? []);

  if (countEl) {
    countEl.hidden = entries.length === 0;
    countEl.textContent = `${entries.length} / 5 audio bites`;
  }
  if (actionsEl) {
    actionsEl.hidden = entries.length >= 5;
  }

  if (entries.length === 0) {
    container.innerHTML = "";
    return;
  }
  const escHtml = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  container.innerHTML = entries
    .map((e) => {
      const isHighlight = e.url === highlightUrl;
      const isFullSite = fullSiteSet.has(e.url);
      const isProfile = approvedSet.has(e.url) || isFullSite;
      const hlClass = isHighlight ? " is-highlight" : "";
      let statusText = "pending";
      let statusClass = "is-pending";
      if (isFullSite) {
        statusText = "full site";
        statusClass = "is-approved";
      } else if (isProfile) {
        statusText = "profile";
        statusClass = "is-approved";
      }
      const audioNote = mpdAssetReviewNotes.audioEntries.find(([k]) => k.endsWith('|' + e.url));
      const audioBanner = audioNote ? mpdReviewBannerHtml(audioNote[1]) : '';
      return `<div class="mpd-audio-entry${hlClass}" data-audio-url="${escHtml(e.url)}" data-audio-title="${escHtml(e.title)}">
        ${audioBanner}
        <app-audio-row active="true" data-audio-src="${escHtml(e.url)}" data-audio-title="${escHtml(e.title)}" data-layout="profile"></app-audio-row>
        <div class="mpd-audio-entry-controls">
          <button type="button" class="mpd-audio-highlight-btn${isHighlight ? " active" : ""}" title="${isHighlight ? "Currently highlighted" : "Set as highlight"}" data-action="highlight">★</button>
          <span class="mpd-audio-entry-status ${statusClass}">${statusText}</span>
          <button type="button" class="mpd-audio-replace-btn" data-action="replace">Replace</button>
          <button type="button" class="mpd-audio-delete-btn" title="Delete" data-action="delete">&times;</button>
        </div>
      </div>`;
    })
    .join("");
}

async function loadMpdAudioCollection() {
  try {
    const collection = await getMyArtistAudioCollection();
    renderMpdAudioCollection(collection);
  } catch (err) {
    console.error("Failed to load audio collection", err);
    renderMpdAudioCollection(null);
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
  const overviewSel = /** @type {HTMLSelectElement | null} */ (document.getElementById("mpd_overview_visibility"));
  if (overviewSel) overviewSel.value = uiVisibility;
  const overviewReview = document.getElementById("mpd_overview_visibility_review");
  if (overviewReview) {
    overviewReview.hidden = visibility !== "pending";
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

/**
 * @param {string} text
 * @param {HTMLElement | null | undefined} feedbackEl
 */
async function copySettingsProfileUserId(text, feedbackEl) {
  try {
    await navigator.clipboard.writeText(text);
    if (feedbackEl instanceof HTMLElement) {
      feedbackEl.classList.add("is-copied");
      feedbackEl.setAttribute("aria-label", "Copied");
      window.setTimeout(() => {
        feedbackEl.classList.remove("is-copied");
        feedbackEl.setAttribute("aria-label", "Copy User ID");
      }, 2000);
    }
    return true;
  } catch {
    if (feedbackEl instanceof HTMLElement) {
      feedbackEl.classList.add("is-copy-failed");
      window.setTimeout(() => {
        feedbackEl.classList.remove("is-copy-failed");
      }, 2000);
    }
    return false;
  }
}

/**
 * @param {HTMLElement | null} valueEl
 * @param {HTMLButtonElement | null} copyBtn
 * @param {string} text
 */
function wireSettingsProfileUserIdCopy(valueEl, copyBtn, text) {
  const runCopy = () => {
    void copySettingsProfileUserId(text, copyBtn || valueEl);
  };
  if (copyBtn instanceof HTMLButtonElement) {
    copyBtn.onclick = runCopy;
  }
  if (valueEl instanceof HTMLElement) {
    valueEl.onclick = runCopy;
    valueEl.onkeydown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        runCopy();
      }
    };
  }
}

/** @typedef {'sidebar' | 'main' | 'none'} SettingsProfileUserIdPlacement */

/**
 * Show User ID in one place only: sidebar (normal profile) or main (no-account notice).
 * @param {{ authenticated?: boolean; principal?: import('@dfinity/principal').Principal }} snap
 * @param {SettingsProfileUserIdPlacement} placement
 */
function updateSettingsProfileUserId(snap, placement = "sidebar") {
  /** @type {Record<SettingsProfileUserIdPlacement, { wrapId: string; valueId: string; copyId: string } | null>} */
  const slots = {
    sidebar: {
      wrapId: "settingsProfileUserIdWrap",
      valueId: "settingsProfileUserId",
      copyId: "settingsProfileCopyUserId",
    },
    main: {
      wrapId: "settingsProfileMainUserIdWrap",
      valueId: "settingsProfileMainUserId",
      copyId: "settingsProfileMainUserIdCopy",
    },
    none: null,
  };
  const text =
    snap.authenticated && snap.principal ? snap.principal.toText() : "";

  for (const slot of /** @type {const} */ (["sidebar", "main"])) {
    const ids = slots[slot];
    const wrap = document.getElementById(ids.wrapId);
    const valueEl = document.getElementById(ids.valueId);
    const copyBtn = document.getElementById(ids.copyId);
    if (!(wrap instanceof HTMLElement) || !(valueEl instanceof HTMLElement)) {
      continue;
    }
    const show = Boolean(text) && placement === slot;
    wrap.hidden = !show;
    valueEl.textContent = show ? text : "—";
    valueEl.title = show ? "Click to copy User ID" : "";
    if (show) {
      valueEl.setAttribute("aria-label", "User ID, click to copy");
    } else {
      valueEl.removeAttribute("aria-label");
    }
    if (show) {
      wireSettingsProfileUserIdCopy(
        valueEl,
        copyBtn instanceof HTMLButtonElement ? copyBtn : null,
        text,
      );
    }
  }
}

/**
 * Member-facing recovery copy when signed in but no canister account row exists.
 * @param {HTMLElement | null} hintEl
 */
function renderNoAccountRecoveryHint(hintEl) {
  if (!hintEl) return;
  hintEl.textContent =
    "No member account found. You're signed in, but this Internet Identity isn't linked to a Fusion member account.";
}

/** @param {unknown} value */
function mpdText(value) {
  return String(value ?? "").trim();
}

/**
 * @param {Element | null} el
 */
function mpdProgramTabIsAvailable(el) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.classList.contains("mpd-program-tab--force-hidden")) return false;
  if (el.hasAttribute("hidden")) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  return true;
}

/**
 * @param {string} hash
 */
function mpdProgramsCalendarHash(hash) {
  const h = String(hash || "").replace(/^#/, "").toLowerCase();
  return (
    h === "calendar" ||
    h === "programs-calendar" ||
    h === "calendar-download" ||
    h === "programs-calendar-download"
  );
}

/**
 * @param {string} hash
 */
function mpdProgramsCalendarDownloadHash(hash) {
  const h = String(hash || "").replace(/^#/, "").toLowerCase();
  return h === "calendar-download" || h === "programs-calendar-download";
}

/**
 * @param {string} tab
 */
function setMpdProgramsTab(tab) {
  const root = document.getElementById("mpd-programs");
  if (!root) return;
  const target = ["explore", "my-programs", "payments", "calendar", "travel", "communications"].includes(tab)
    ? tab
    : "explore";
  const targetTab = root.querySelector(`[data-mpd-program-tab="${target}"]`);
  const safeTarget =
    (target === "payments" || target === "calendar" || target === "travel" || target === "communications") &&
    !mpdProgramTabIsAvailable(targetTab)
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
  if (safeTarget === "explore") {
    void hydrateExploreProgramCredits();
  }
  if (safeTarget === "calendar") {
    const calRoot = document.getElementById("mpd_program_calendar_workspace");
    if (calRoot instanceof HTMLElement) {
      void mountMemberProgramCalendar(calRoot, {
        eligiblePrograms: mpdCalendarEligiblePrograms,
        canCreate: true,
      });
    }
  }
}

/**
 * Paint one credits strip from a resolved membership credits model.
 * @param {HTMLElement} strip
 * @param {ReturnType<typeof buildMembershipCreditsStripModel>} model
 */
function paintMembershipCreditsStrip(strip, model) {
  if (!(strip instanceof HTMLElement)) return;
  if (!model) {
    strip.hidden = true;
    return;
  }
  strip.hidden = false;
  const appEl =
    strip.querySelector("[data-mpd-credits-app]") ||
    (strip.id === "mpd_program_credits"
      ? document.getElementById("mpd_app_credits_value")
      : null);
  const drawEl =
    strip.querySelector("[data-mpd-credits-draw]") ||
    (strip.id === "mpd_program_credits"
      ? document.getElementById("mpd_draw_credits_value")
      : null);
  const nextEl =
    strip.querySelector("[data-mpd-credits-next]") ||
    (strip.id === "mpd_program_credits"
      ? document.getElementById("mpd_credits_next_date")
      : null);
  const hintEl =
    strip.querySelector("[data-mpd-credits-next-hint]") ||
    (strip.id === "mpd_program_credits"
      ? document.getElementById("mpd_credits_next_hint")
      : null);
  const drawLabel = strip.querySelector("[data-mpd-credits-draw-label]");
  if (drawLabel instanceof HTMLElement) {
    drawLabel.textContent = "Program Award entries";
  }
  if (appEl) appEl.textContent = model.applicationCreditsLabel;
  if (drawEl) drawEl.textContent = model.awardEntriesLabel ?? model.drawCreditsLabel;
  if (nextEl) nextEl.textContent = model.nextCreditsLabel;
  if (hintEl) hintEl.textContent = model.nextCreditsHint;
}

/** Paint the invite count into the 4th card of a credits strip. */
function paintInviteCountOnStrip(strip, summary) {
  if (!(strip instanceof HTMLElement)) return;
  const valEl = strip.querySelector("[data-mpd-credits-invites]");
  const hintEl = strip.querySelector("[data-mpd-credits-invites-hint]");
  if (!summary) {
    if (valEl) valEl.textContent = "—";
    return;
  }
  const active = Number(summary.active ?? 0);
  const max = Number(summary.maxAllowed ?? 3);
  if (valEl) valEl.textContent = `${active}/${max}`;
  if (hintEl) hintEl.textContent = "invites available";
}

/** Paint broadcast credit balance into the broadcast column of a credits strip. */
function paintBroadcastCreditsOnStrip(strip, balance) {
  if (!(strip instanceof HTMLElement)) return;
  const valEl = strip.querySelector("[data-mpd-credits-broadcast]");
  const hintEl = strip.querySelector("[data-mpd-credits-broadcast-hint]");
  const redeemBtn = strip.querySelector("[data-mpd-broadcast-redeem]");
  if (valEl) valEl.textContent = String(balance);
  if (hintEl) hintEl.textContent = balance === 1 ? "credit available" : "credits available";
  if (redeemBtn) redeemBtn.hidden = balance < 1;
}

const BROADCAST_CHANNELS = [
  { key: "socialPost", label: "Social", icon: "\u2728", desc: "Amplified through the FUSION Instagram social channel.", cta: "CLAIM SOCIAL" },
  { key: "newsletterBlast", label: "Newsletter", icon: "\u2709", desc: "Featured across the full FUSION newsletter audience.", cta: "CLAIM NEWSLETTER" },
  { key: "featuredArtist", label: "Featured", icon: "\u2606", desc: "Shown in the Featured section across FUSION.", cta: "CLAIM FEATURED" },
];

/** Open the 3-card broadcast credits modal. */
async function openBroadcastClaimModal() {
  const { openStudioModal } = await import("../utils/studioModal.js");
  const cardsHtml = BROADCAST_CHANNELS.map((ch) => `
    <div class="mpd-broadcast-modal__card">
      <div class="mpd-broadcast-modal__card-icon">${ch.icon}</div>
      <h3 class="mpd-broadcast-modal__card-title">${ch.label}</h3>
      <p class="mpd-broadcast-modal__card-desc">${ch.desc}</p>
      <p class="mpd-broadcast-modal__card-cost">1 broadcast credit</p>
      <button type="button" class="mpd-broadcast-modal__card-cta" data-bc-claim="${ch.key}">${ch.cta} \u2192</button>
    </div>
  `).join("");
  const html = `
    <div class="mpd-broadcast-modal">
      <p class="mpd-broadcast-modal__eyebrow">BROADCAST CREDITS</p>
      <h2 class="mpd-broadcast-modal__heading">Choose where to be seen.</h2>
      <p class="mpd-broadcast-modal__subhead">Use 1 credit to claim one FUSION broadcast opportunity.</p>
      <div class="mpd-broadcast-modal__cards">${cardsHtml}</div>
      <p class="mpd-broadcast-modal__footer">Claims are reviewed by the FUSION team before scheduling.</p>
    </div>
  `;
  const { close, root } = openStudioModal(html, { title: "" });
  root.querySelectorAll("[data-bc-claim]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const channelKey = btn.getAttribute("data-bc-claim");
      const channelInfo = BROADCAST_CHANNELS.find((c) => c.key === channelKey);
      if (!channelKey || !channelInfo) return;
      const { openStudioConfirmDialog } = await import("../utils/studioModal.js");
      const confirmed = await openStudioConfirmDialog({
        title: "Confirm broadcast claim",
        paragraphs: [
          `You are about to use 1 broadcast credit for: ${channelInfo.label}.`,
          "The FUSION team will review your claim and schedule your broadcast. You will receive a confirmation email shortly.",
        ],
        confirmLabel: "Claim broadcast",
      });
      if (!confirmed) return;
      const { redeemBroadcastCreditForCaller } = await import("../utils/database.js");
      const ok = await redeemBroadcastCreditForCaller(channelKey);
      close();
      if (ok) {
        void sendBroadcastClaimConfirmationEmail(channelInfo.label);
        const { openStudioNoticeDialog } = await import("../utils/studioModal.js");
        await openStudioNoticeDialog({
          title: "Broadcast claimed",
          paragraphs: [
            `Your ${channelInfo.label} broadcast has been queued.`,
            "The FUSION team will review your claim and notify you when your broadcast is live.",
          ],
        });
        void hydrateExploreProgramCredits();
      }
    });
  });
}

/** Send the member a branded confirmation email after claiming a broadcast. */
async function sendBroadcastClaimConfirmationEmail(channelLabel) {
  try {
    const acc = await getAccountForCaller();
    const email = String(acc?.contactEmail || acc?.contact_email || "").trim();
    if (!email || !email.includes("@")) return;
    const { renderFusionEmailFromSlots, fusionEmailParagraph } = await import("../utils/emailFusionLayout.js");
    const { sendEmail } = await import("../utils/integrationApi.js");
    const bodyHtml = [
      fusionEmailParagraph(`Your <strong>${channelLabel}</strong> broadcast credit has been claimed and is now queued for review.`, "lead"),
      fusionEmailParagraph("The FUSION team will schedule your broadcast and you\u2019ll receive a notification when it goes live."),
      fusionEmailParagraph("Thank you for being part of the FUSION network.", "last"),
    ].join("\n");
    const html = renderFusionEmailFromSlots({
      eyebrow: "Broadcast Credits",
      headlineHtml: "Your broadcast<br>is queued.",
      bodyHtml,
      cta: { label: "VIEW YOUR STUDIO", href: "https://fusionart.world/settings" },
      footnote: "If you have questions, reply to this email or contact the Fusion team.",
    });
    await sendEmail({ to: email, subject: `Your FUSION broadcast is queued \u2014 ${channelLabel}`, html });
  } catch { /* email send failure is non-blocking */ }
}

/** Wire broadcast info tooltip and redeem modal across all strips. */
function wireBroadcastInfoAndRedeem() {
  document.querySelectorAll("[data-mpd-broadcast-info]").forEach((btn) => {
    if (btn._bcWired) return;
    btn._bcWired = true;
    let tooltip = null;
    const show = () => {
      if (tooltip) return;
      tooltip = document.createElement("div");
      tooltip.className = "mpd-broadcast-info-tooltip";
      tooltip.textContent = "Broadcast credits let you choose to be featured on a Fusion channel \u2014 as a Featured Artist, in a Newsletter Blast, or in a Social Post. Earn credits by inviting new members.";
      btn.style.position = "relative";
      btn.appendChild(tooltip);
    };
    const hide = () => {
      if (tooltip) { tooltip.remove(); tooltip = null; }
    };
    btn.addEventListener("mouseenter", show);
    btn.addEventListener("mouseleave", hide);
    btn.addEventListener("click", (e) => { e.stopPropagation(); tooltip ? hide() : show(); });
  });

  document.querySelectorAll("[data-mpd-broadcast-redeem]").forEach((btn) => {
    if (btn._bcRedeemWired) return;
    btn._bcRedeemWired = true;
    btn.addEventListener("click", () => { void openBroadcastClaimModal(); });
  });
}

/**
 * Application + Program Award credits (Studio Overview + Explore programs).
 */
async function hydrateExploreProgramCredits() {
  const strips = Array.from(
    document.querySelectorAll("[data-mpd-credits-strip], #mpd_program_credits, #mpd_overview_credits"),
  ).filter((el, i, arr) => el instanceof HTMLElement && arr.indexOf(el) === i);
  if (!strips.length) return;

  /** @type {string} */
  let access = "";
  try {
    access = String(await getMembershipAccessForCaller() || "").trim();
  } catch {
    access = "";
  }

  let tier = "";
  try {
    tier = normalizeMembershipTier(await getMembershipTierForCaller());
  } catch {
    tier = "";
  }
  if (!tier && mpdMembershipBillingContext?.tier) {
    tier = normalizeMembershipTier(mpdMembershipBillingContext.tier);
  }

  let appCreditBalance = 0;
  let awardEntryBalance = 0;
  /** @type {string} */
  let nextAccrualHint = "";
  try {
    const [appInfo, awardInfo] = await Promise.all([
      getApplicationCreditsForCaller(),
      getAwardCreditsForCaller(),
    ]);
    appCreditBalance = Number(appInfo?.balance) || 0;
    awardEntryBalance = Number(awardInfo?.balance) || 0;
    nextAccrualHint = String(appInfo?.nextAccrualHint || awardInfo?.nextGrantHint || "").trim();
    if (!tier && appInfo?.membershipTier) {
      tier = normalizeMembershipTier(appInfo.membershipTier);
    }
  } catch {
    if (tier === "quarterly" || tier === "annual") {
      try {
        appCreditBalance = await getQuarterlyAppCreditBalanceForCaller();
      } catch {
        appCreditBalance = 0;
      }
    }
  }

  /** @type {string} */
  let periodEndIso = "";
  if (tier === "annual" && access !== "exempt") {
    try {
      const snap = await getAuthSnapshot();
      if (snap.authenticated) {
        const principal = snap.principal.toText();
        const acc = await getAccountForCaller();
        const accObj = acc && typeof acc === "object" ? acc : {};
        const paypalSubId = String(
          accObj.paypalSubscriptionId || accObj.paypal_subscription_id || "",
        ).trim();
        const stripeSubId = String(
          accObj.stripeSubscriptionId || accObj.stripe_subscription_id || "",
        ).trim();
        const provider = paypalSubId ? "paypal" : stripeSubId ? "stripe" : "";
        const subscriptionId = paypalSubId || stripeSubId;
        if (provider && subscriptionId) {
          const { fetchMemberBillingSummary } = await import("../utils/integrationApi.js");
          const summary = await fetchMemberBillingSummary(principal, {
            subscriptionId,
            provider,
          });
          if (
            summary &&
            typeof summary === "object" &&
            summary.ok &&
            typeof summary.currentPeriodEnd === "string"
          ) {
            periodEndIso = String(summary.currentPeriodEnd).trim();
          }
        }
      }
    } catch {
      periodEndIso = "";
    }
  }

  const model = buildMembershipCreditsStripModel({
    tier,
    access,
    appCreditBalance,
    awardEntryBalance,
    periodEndIso,
    nextAccrualHint,
    showForMonthly: tier === "monthly",
  });
  let inviteSummary = null;
  let broadcastBalance = 0;
  try {
    const { getMyInviteCountSummaryForCaller, getMyBroadcastCreditsForCaller } = await import("../utils/database.js");
    const [inv, bc] = await Promise.all([
      getMyInviteCountSummaryForCaller(),
      getMyBroadcastCreditsForCaller(),
    ]);
    inviteSummary = inv;
    broadcastBalance = bc;
  } catch { /* invite/broadcast count unavailable */ }

  for (const strip of strips) {
    paintMembershipCreditsStrip(/** @type {HTMLElement} */ (strip), model);
    paintInviteCountOnStrip(/** @type {HTMLElement} */ (strip), inviteSummary);
    paintBroadcastCreditsOnStrip(/** @type {HTMLElement} */ (strip), broadcastBalance);
  }

  wireBroadcastInfoAndRedeem();
  wireInvitePanelButtons();
  void checkAndShowReferralPrompts();
}

// ——— Invite management panel ———

const INVITE_SHARE_BASE = "https://fusionart.world/join-network?ref=";

function getInviteCodeStatus(pc) {
  if (pc.currentRedemptions > 0) return "redeemed";
  if (!pc.active) {
    if (pc.expiresAt) {
      const now = typeof pc.expiresAt === "string" && pc.expiresAt.length > 13
        ? Date.now() * 1_000_000
        : Date.now();
      if (Number(pc.expiresAt) < now) return "expired";
    }
    return "inactive";
  }
  return "active";
}

function buildInviteRowHtml(pc) {
  const status = getInviteCodeStatus(pc);
  const code = String(pc.code || "");
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  const isActive = status === "active";
  return `
    <div class="mpd-invite-code-row" data-invite-code="${code}">
      <span class="mpd-invite-code">${code}</span>
      <span class="mpd-invite-status mpd-invite-status--${status}">${statusLabel}</span>
      <div class="mpd-invite-actions">
        ${isActive ? `
          <button type="button" class="mpd-invite-copy-btn" data-copy-code="${code}">Copy code</button>
          <button type="button" class="mpd-invite-copy-btn" data-copy-link="${code}">Copy link</button>
          <button type="button" class="mpd-invite-deactivate-btn" data-deactivate-code="${code}" title="Deactivate">&times;</button>
        ` : ""}
      </div>
    </div>`;
}

async function renderInvitePanel() {
  const panel = document.getElementById("mpd_invite_panel");
  if (!panel) return;

  const { getMyInviteCodesForCaller, getMyInviteCountSummaryForCaller } = await import("../utils/database.js");
  let codes = [];
  let summary = { active: 0, maxAllowed: 3, totalRedeemed: 0 };
  try {
    [codes, summary] = await Promise.all([
      getMyInviteCodesForCaller(),
      getMyInviteCountSummaryForCaller(),
    ]);
  } catch { /* fallback to empty */ }

  const activeCount = Number(summary.active ?? 0);
  const maxAllowed = Number(summary.maxAllowed ?? 3);
  const canGenerate = activeCount < maxAllowed;

  const sorted = [...codes].sort((a, b) => {
    const sa = getInviteCodeStatus(a) === "active" ? 0 : 1;
    const sb = getInviteCodeStatus(b) === "active" ? 0 : 1;
    return sa - sb;
  });

  panel.innerHTML = `
    <div class="mpd-invite-panel__header">
      <span class="mpd-invite-panel__title">Your invite codes</span>
      <button type="button" class="mpd-invite-generate-btn" id="mpd_invite_generate_btn"
        ${canGenerate ? "" : "disabled"}
      >+ Generate new</button>
    </div>
    <div id="mpd_invite_codes_list">
      ${sorted.length === 0
        ? '<p style="font-size:0.75rem;color:rgba(15,23,42,0.5);margin:0.5rem 0">No invite codes yet. Generate one to share with a peer.</p>'
        : sorted.map(buildInviteRowHtml).join("")}
    </div>
    <div class="mpd-invite-panel__footer">
      Share your invite link to give a peer 50% off their first month. You earn a broadcast credit when they renew \u2014 choose to be featured as an artist, in a newsletter, or on social media.
    </div>
  `;

  const genBtn = document.getElementById("mpd_invite_generate_btn");
  if (genBtn) {
    genBtn.addEventListener("click", async () => {
      genBtn.disabled = true;
      genBtn.textContent = "Generating...";
      try {
        const { generateMyInviteCodeForCaller } = await import("../utils/database.js");
        await generateMyInviteCodeForCaller(1);
        await renderInvitePanel();
        await refreshInviteCountOnStrips();
      } catch (err) {
        genBtn.textContent = String(err?.message || "Error");
        setTimeout(() => { genBtn.textContent = "+ Generate new"; genBtn.disabled = false; }, 2500);
      }
    });
  }

  panel.addEventListener("click", async (e) => {
    const target = /** @type {HTMLElement} */ (e.target);

    const copyCode = target.dataset?.copyCode;
    if (copyCode) {
      try {
        await navigator.clipboard.writeText(copyCode);
        target.textContent = "Copied!";
        setTimeout(() => { target.textContent = "Copy code"; }, 1500);
      } catch {}
      return;
    }

    const copyLink = target.dataset?.copyLink;
    if (copyLink) {
      try {
        await navigator.clipboard.writeText(INVITE_SHARE_BASE + copyLink);
        target.textContent = "Copied!";
        setTimeout(() => { target.textContent = "Copy link"; }, 1500);
      } catch {}
      return;
    }

    const deactivateCode = target.dataset?.deactivateCode;
    if (deactivateCode) {
      target.disabled = true;
      try {
        const { deactivateMyInviteCodeForCaller } = await import("../utils/database.js");
        await deactivateMyInviteCodeForCaller(deactivateCode);
        await renderInvitePanel();
        await refreshInviteCountOnStrips();
      } catch {
        target.disabled = false;
      }
    }
  });
}

async function refreshInviteCountOnStrips() {
  const strips = Array.from(
    document.querySelectorAll("[data-mpd-credits-strip], #mpd_program_credits, #mpd_overview_credits"),
  ).filter((el, i, arr) => el instanceof HTMLElement && arr.indexOf(el) === i);
  if (!strips.length) return;
  try {
    const { getMyInviteCountSummaryForCaller } = await import("../utils/database.js");
    const summary = await getMyInviteCountSummaryForCaller();
    for (const strip of strips) {
      paintInviteCountOnStrip(/** @type {HTMLElement} */ (strip), summary);
    }
  } catch { /* silent */ }
}

function wireInvitePanelButtons() {
  const inviteBtns = document.querySelectorAll("[data-mpd-invite-member]");
  for (const btn of inviteBtns) {
    btn.addEventListener("click", async () => {
      const panel = document.getElementById("mpd_invite_panel");
      if (!panel) return;
      if (panel.hidden) {
        panel.hidden = false;
        await renderInvitePanel();
      } else {
        panel.hidden = true;
      }
    });
  }
}

// ——— Referral prompt cards (milestones) ———

const REFERRAL_PROMPT_LS_PREFIX = "fusion_referral_prompt_dismissed_";

function isReferralPromptDismissed(key) {
  return localStorage.getItem(REFERRAL_PROMPT_LS_PREFIX + key) === "1";
}

function dismissReferralPrompt(key) {
  localStorage.setItem(REFERRAL_PROMPT_LS_PREFIX + key, "1");
}

function buildReferralPromptCard(key, message) {
  return `
    <div class="mpd-referral-prompt-card" data-referral-prompt="${key}">
      <p class="mpd-referral-prompt-card__text">${message}</p>
      <div class="mpd-referral-prompt-card__actions">
        <button type="button" class="mpd-referral-prompt-card__cta" data-referral-open-invites>Share your invite</button>
        <button type="button" class="mpd-referral-prompt-card__dismiss" data-referral-dismiss="${key}">Dismiss</button>
      </div>
    </div>`;
}

async function checkAndShowReferralPrompts() {
  const container = document.getElementById("mpd_referral_prompts");
  if (!container) return;

  const prompts = [];
  const isExempt = mpdMembershipGate === "exempt";
  const rewardSuffix = "You earn a broadcast credit when they renew \u2014 use it to get featured on Fusion.";

  // 1. Profile 100% complete
  if (!isReferralPromptDismissed("profile-complete")) {
    const fill = document.getElementById("mpd_completion_fill");
    if (fill && fill.style.width === "100%") {
      prompts.push(buildReferralPromptCard(
        "profile-complete",
        `Your profile is 100% complete! Know an artist who should be here? Share your invite — they get 50% off their first month. ${rewardSuffix}`,
      ));
    }
  }

  // 2. 30-day membership — use first-login timestamp stored in localStorage
  if (!isReferralPromptDismissed("30-day-member")) {
    const firstLogin = localStorage.getItem("fusion_first_login_ts");
    if (firstLogin) {
      const ts = Number(firstLogin);
      if (!Number.isNaN(ts) && Date.now() - ts > 30 * 86400000) {
        prompts.push(buildReferralPromptCard(
          "30-day-member",
          `You've been a member for 30+ days. Invite a peer to Fusion — they get 50% off their first month. ${rewardSuffix}`,
        ));
      }
    } else if (mpdMembershipBillingContext?.tier) {
      localStorage.setItem("fusion_first_login_ts", String(Date.now()));
    }
  }

  // 3. Post-application — checked via sessionStorage flag set on submission
  if (!isReferralPromptDismissed("post-application")) {
    const submitted = sessionStorage.getItem("fusion_app_submitted_recently");
    if (submitted === "1") {
      prompts.push(buildReferralPromptCard(
        "post-application",
        "Application submitted! While you wait, share your invite with a peer who should be on Fusion.",
      ));
      sessionStorage.removeItem("fusion_app_submitted_recently");
    }
  }

  if (!prompts.length) {
    container.hidden = true;
    return;
  }

  container.hidden = false;
  container.innerHTML = prompts.join("");

  container.addEventListener("click", (e) => {
    const target = /** @type {HTMLElement} */ (e.target);

    if (target.hasAttribute("data-referral-open-invites")) {
      const panel = document.getElementById("mpd_invite_panel");
      if (panel) {
        panel.hidden = false;
        void renderInvitePanel();
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    const dismissKey = target.dataset?.referralDismiss;
    if (dismissKey) {
      dismissReferralPrompt(dismissKey);
      const card = target.closest("[data-referral-prompt]");
      if (card) card.remove();
      const remaining = container.querySelectorAll("[data-referral-prompt]");
      if (!remaining.length) container.hidden = true;
    }
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
  /** @type {Map<string, boolean>} */
  const formalVisibleByPid = new Map();
  let visibleCount = 0;
  for (const card of cards) {
    const status = String(card.getAttribute("data-status-key") || "submitted");
    const visible = active === "all" || status === active;
    card.toggleAttribute("hidden", !visible);
    if (visible) visibleCount += 1;
    const pid = String(card.getAttribute("data-program-id") || "");
    if (pid) formalVisibleByPid.set(pid, visible);
  }
  root.querySelectorAll(".mpd-draw-status-wrap").forEach((wrap) => {
    if (!(wrap instanceof HTMLElement)) return;
    const forPid = String(wrap.getAttribute("data-mpd-draw-for") || "");
    if (forPid && formalVisibleByPid.has(forPid)) {
      wrap.toggleAttribute("hidden", !formalVisibleByPid.get(forPid));
      return;
    }
    // Orphan / fixture draw cards: show only on "all"
    const show = active === "all";
    wrap.toggleAttribute("hidden", !show);
    if (show) visibleCount += 1;
  });
  const noResults = document.getElementById("mpd_my_programs_no_results");
  if (noResults) {
    const emptyList =
      cards.length === 0 && root.querySelectorAll(".mpd-draw-status-wrap").length === 0;
    noResults.hidden = emptyList || visibleCount > 0;
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
            ${
              item.status?.key === "withdrawn"
                ? ""
                : `<button type="button" class="mpd-my-program-action mpd-my-program-action--danger" data-mpd-application-action="withdraw" data-program-id="${escapeHtmlMpd(item.programId)}">Withdraw application</button>`
            }
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

const mpdUsd = formatUsdFromCents;
const mpdParseUsdCents = parseUsdDisplayToCents;
const MPD_PROGRAM_BASE_TOTAL_CENTS = PROGRAM_RESIDENCY_BASE_TOTAL_CENTS;
const MPD_PROGRAM_OWN_FLIGHT_CREDIT_CENTS = PROGRAM_OWN_FLIGHT_CREDIT_CENTS;

function mpdPaymentSummaryFor(programId, payments) {
  return (payments.summaries || []).find((x) => String(x.programId || "") === String(programId)) || null;
}

function mpdPaymentPlanFor(id, payments) {
  if (!id) return null;
  return (payments.plans || []).find((x) => String(x.id || "") === String(id)) || null;
}

function mpdSlotSecuredProgramIds(payments) {
  const secured = new Set();
  const approved = Array.isArray(payments?.approvedPrograms) ? payments.approvedPrograms : [];
  for (const approval of approved) {
    if (approval?.manualDepositSubmitted === true) {
      const programId = String(approval?.programId || "");
      if (programId) secured.add(programId);
    }
  }
  for (const summary of payments?.summaries || []) {
    const programId = String(summary?.programId || "");
    const approval = approved.find((x) => String(x.programId || "") === programId);
    const ledger = (payments?.ledger || []).filter((x) => String(x.programId || "") === programId);
    const depositCents = mpdCents(summary?.depositAmountCents);
    if (isMemberProgramDepositPaid(approval, summary, ledger, depositCents)) {
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
      const programYear = firstNonEmptyString(en.year, en.programYear, en.programPage?.year);
      const programDepositCents = resolveProgramDepositCents(program);
      const summary = mpdPaymentSummaryFor(programId, payments);
      const applicantCategory = normalizeApplicantCategory(
        approval.applicantCategory ?? summary?.applicantCategory,
      );
      const ownFlight =
        summary?.ownFlight === true ||
        String(summary?.ownFlight || "").toLowerCase() === "true" ||
        approval?.ownFlight === true ||
        String(approval?.ownFlight || "").toLowerCase() === "true";
      const sponsorshipMode = String(
        approval.sponsorshipMode || summary?.sponsorshipMode || "none",
      ).toLowerCase();
      const specialProgramTotalCents = mpdCents(
        approval.specialProgramTotalCents ?? summary?.specialProgramTotalCents,
      );
      let sponsoredCreditCents = mpdCents(
        approval.sponsoredCreditCents ?? summary?.sponsoredCreditCents,
      );
      const sponsoredCreditCentsRaw = sponsoredCreditCents;
      const sponsoredPercent = Math.max(
        0,
        Math.min(100, Math.round(Number(approval.sponsoredPercent ?? summary?.sponsoredPercent ?? 0))),
      );
      const categoryDiscountCents = applicantCategoryDiscountCents(applicantCategory);
      const baseTotalDueCents = computeMemberProgramTotalDueCents({
        category: applicantCategory,
        ownFlight: false,
      });
      const flightCreditCents = ownFlight ? MPD_PROGRAM_OWN_FLIGHT_CREDIT_CENTS : 0;
      if (sponsorshipMode === "partial" && sponsoredPercent > 0 && sponsoredCreditCents <= 0) {
        const listOrSpecial =
          specialProgramTotalCents > 0
            ? specialProgramTotalCents
            : computeMemberProgramTotalDueCents({ category: applicantCategory, ownFlight });
        sponsoredCreditCents = Math.round((listOrSpecial * sponsoredPercent) / 100);
      }
      const totalDueCents = resolveMemberProgramTotalDueCents({
        summaryTotalDueCents: summary ? summary.totalDueCents : null,
        approvalTotalDueCents: approval.totalDueCents,
        category: applicantCategory,
        ownFlight,
        specialProgramTotalCents,
        sponsorshipMode,
        sponsoredCreditCents: sponsoredCreditCentsRaw,
        sponsoredPercent,
      });
      const depositCents = resolveMemberChargeableDepositCents(programDepositCents, totalDueCents);
      const totalPaidCents = mpdCents(summary?.totalPaidCents);
      const outstandingCents = summary
        ? mpdCents(summary.outstandingCents)
        : Math.max(0, totalDueCents - totalPaidCents);
      const activePlan = mpdPaymentPlanFor(summary?.activePlanId, payments);
      const ledger = (payments.ledger || [])
        .filter((x) => String(x.programId || "") === programId)
        .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      const depositPaid = isMemberProgramDepositPaid(approval, summary, ledger, depositCents);
      const paymentStarted = totalPaidCents > 0 || ledger.length > 0 || Boolean(activePlan) || depositPaid;
      return {
        programId,
        applicationId: String(approval.applicationId || ""),
        title,
        location,
        focus,
        imageSrc,
        imageAlt,
        startText,
        programYear,
        email: String(approval.email || ""),
        fullName: String(approval.fullName || ""),
        programDepositCents,
        depositCents,
        applicantCategory,
        categoryDiscountCents,
        baseTotalDueCents,
        ownFlight,
        flightCreditCents,
        sponsorshipMode,
        specialProgramTotalCents,
        sponsoredCreditCents,
        sponsoredCreditCentsRaw,
        sponsoredPercent,
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
    const title = ownFlight ? "I'll book my own flight" : "Fusion will book my flight";
    const badge = ownFlight ? "$800 credit" : "Included in price";
    const copy = ownFlight
      ? "$800 credit toward your residency balance."
      : "Round-trip flight booked by Fusion—no separate flight fee.";
    return `<button type="button" class="mpd-flight-option ${selected ? "is-selected" : ""}${locked && !selected ? " is-muted" : ""}" data-mpd-flight-choice="${ownFlight ? "own" : "support"}" aria-pressed="${selected ? "true" : "false"}" ${locked ? "disabled" : ""}>
      <span class="mpd-flight-option__icon" aria-hidden="true"><img src="${mpdEscapeAttr(flightIconUrl)}" alt="" /></span>
      <span class="mpd-flight-option__copy">
        <strong>${escapeHtmlMpd(title)}</strong>
        <small>${escapeHtmlMpd(copy)}</small>
      </span>
      <span class="mpd-flight-option__badge">${escapeHtmlMpd(badge)}</span>
    </button>`;
  };
  const noteStrong = item.ownFlight
    ? locked
      ? "Own flight selected"
      : "Flight credit applied"
    : "Fusion flight booking included";
  const noteSpan = item.ownFlight
    ? locked
      ? "Own flight selected — $800 credit applied to your residency price."
      : "The $800 credit is applied to your total residency price once you confirm your program slot."
    : `Your residency price of ${mpdUsd(item.baseTotalDueCents)} includes Fusion booking your round-trip flight. There is no additional flight charge beyond this amount.`;
  return `<section class="mpd-flight-choice-card ${locked ? "is-locked" : ""} ${item.ownFlight ? "is-own-flight" : "is-fusion-flight"}" aria-label="Flight booking choice">
    <div class="mpd-flight-choice-card__head">
      <div class="mpd-flight-choice-card__icon" aria-hidden="true"><img src="${mpdEscapeAttr(flightIconUrl)}" alt="" /></div>
      <div>
        <p class="mpd-payments-eyebrow">Flight booking</p>
        <h3>Who will book your flight?</h3>
        <p class="studio-muted">Fusion can book your round-trip flight as part of your residency. If you book your own flight, you receive an $800 credit toward your program balance.</p>
      </div>
    </div>
    <div class="mpd-flight-options">
      ${option(true)}
      ${option(false)}
    </div>
    <div class="mpd-flight-choice-card__note">
      <strong>${escapeHtmlMpd(noteStrong)}</strong>
      <span>${escapeHtmlMpd(noteSpan)}</span>
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
  const planStartEnabled = canStartProgramPaymentPlan();
  const showPlanCard = Boolean(item.activePlan) || planStartEnabled;
  const planButton = item.activePlan
    ? `<button type="button" class="studio-btn-primary" data-mpd-payment-action="cancel-plan">Cancel plan</button>`
    : planStartEnabled
      ? `<button type="button" class="studio-btn-primary" data-mpd-payment-action="start-plan" ${item.outstandingCents <= 0 ? "disabled" : ""}>Start payment plan</button>`
      : "";
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
    ? `<div class="mpd-payments-action-grid${showPlanCard ? "" : " mpd-payments-action-grid--single"}">
        <article class="mpd-payments-action-card mpd-payments-action-card--manual">
          ${mpdInlineIconHtml(manualPaymentIconUrl, "mpd-payments-action-card__icon mpd-payments-action-card__icon--manual")}
          <div class="mpd-payments-action-card__copy">
            <h4>Make a manual payment</h4>
            <p class="studio-muted">Pay any amount toward your outstanding balance.</p>
          </div>
          <button type="button" class="studio-btn-primary" data-mpd-payment-action="manual" ${item.outstandingCents <= 0 ? "disabled" : ""}>Make a payment</button>
        </article>
        ${
          showPlanCard
            ? `<article class="mpd-payments-action-card mpd-payments-action-card--plan">
          ${mpdInlineIconHtml(paymentPlanIconUrl, "mpd-payments-action-card__icon mpd-payments-action-card__icon--plan")}
          <div class="mpd-payments-action-card__copy">
            <h4>${item.activePlan ? "Payment plan active" : "Start a payment plan"}</h4>
            <p class="studio-muted">${item.activePlan ? "Cancel future installments if your plans change." : "Split the remaining balance into equal monthly payments."}</p>
          </div>
          ${planButton}
        </article>`
            : ""
        }
      </div>
      <div class="mpd-payments-overview-grid">
        <div class="mpd-payments-overview-card mpd-payments-overview-card--paid">
          ${mpdInlineIconHtml(paymentsIconUrl, "mpd-payments-overview-card__icon")}
          <span>Total residency price</span>
          <strong>${mpdUsd(item.totalDueCents)}</strong>
          <small>${item.ownFlight ? "After $800 own-flight credit" : "Includes Fusion flight booking"}</small>
        </div>
        ${
          item.categoryDiscountCents
            ? `<div class="mpd-payments-overview-card mpd-payments-overview-card--outstanding">
          ${mpdInlineIconHtml(paymentsIconUrl, "mpd-payments-overview-card__icon")}
          <span>Veteran discount</span>
          <strong>-${mpdUsd(item.categoryDiscountCents)}</strong>
          <small>Returning artist pricing</small>
        </div>`
            : ""
        }
        <div class="mpd-payments-overview-card mpd-payments-overview-card--outstanding">
          ${mpdInlineIconHtml(warningIconUrl, "mpd-payments-overview-card__icon")}
          <span>Flight credit</span>
          <strong>${item.flightCreditCents ? `-${mpdUsd(item.flightCreditCents)}` : "$0.00"}</strong>
          <small>${item.ownFlight ? "Own-flight discount" : "Fusion books your flight"}</small>
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
              : `<div class="mpd-payments-empty"><h4>No upcoming payments.</h4><p class="studio-muted">${planStartEnabled ? "Start a payment plan to schedule installments." : "Use manual payments to pay toward your balance."}</p></div>`
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
  await hydrateProgramCalendarPanel(payments);
  await hydrateProgramTravelPanel(payments);
  await hydrateProgramCommsPanel();
}

/**
 * @param {object} [payments]
 */
async function hydrateProgramCalendarPanel(payments) {
  const tab = document.getElementById("mpd-program-tab-calendar");
  const root = document.getElementById("mpd_program_calendar_workspace");
  if (!tab || !root) return;
  let pay = payments;
  if (!pay) {
    try {
      pay = await getMyProgramPayments();
    } catch {
      pay = { approvedPrograms: [], summaries: [], ledger: [], plans: [] };
    }
  }
  const gate = await resolveMemberCalendarGate(pay, mpdSlotSecuredProgramIds);
  mpdCalendarEligiblePrograms = gate.eligible;
  const forceHidden = tab.classList.contains("mpd-program-tab--force-hidden");
  const showTab = gate.showTab && !forceHidden;
  tab.toggleAttribute("hidden", !showTab);
  tab.setAttribute("aria-hidden", showTab ? "false" : "true");
  if (!showTab) {
    root.innerHTML = `<div class="mpd-program-placeholder"><h3>Calendar</h3><p class="studio-muted">Your program calendar appears when a slot-secured program has its schedule live.</p></div>`;
    if (tab.classList.contains("is-active")) setMpdProgramsTab("my-programs");
    return;
  }
  const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "").toLowerCase() : "";
  const autoDownload = mpdProgramsCalendarDownloadHash(hash);
  await mountMemberProgramCalendar(root, {
    eligiblePrograms: gate.eligible,
    canCreate: true,
    autoDownloadIcs: autoDownload,
  });
  if (mpdProgramsCalendarHash(hash)) {
    setMpdProgramsTab("calendar");
  }
  if (autoDownload && typeof history !== "undefined" && history.replaceState && typeof window !== "undefined") {
    try {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}#calendar`);
    } catch {
      /* ignore */
    }
  }
}

async function hydrateProgramTravelPanel(payments) {
  const tab = document.getElementById("mpd-program-tab-travel");
  const root = document.getElementById("mpd_program_travel_workspace");
  if (!tab || !root) return;

  let pay = payments;
  if (!pay) {
    try {
      pay = await getMyProgramPayments();
    } catch {
      pay = { approvedPrograms: [], summaries: [], ledger: [], plans: [] };
    }
  }

  const securedIds = mpdSlotSecuredProgramIds(pay);
  if (securedIds.size === 0) {
    tab.toggleAttribute("hidden", true);
    tab.setAttribute("aria-hidden", "true");
    return;
  }

  tab.toggleAttribute("hidden", false);
  tab.setAttribute("aria-hidden", "false");

  const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "").toLowerCase() : "";
  if (hash === "travel" || hash === "programs-travel") {
    setMpdProgramsTab("travel");
  }

  const programs = mpdLastProgramsForPayments || [];
  const securedPrograms = programs.filter((p) => securedIds.has(String(p.id || "")));

  const parts = [];
  for (const program of securedPrograms) {
    const programId = String(program.id || "");
    const programTitle = program.enCard?.focus || program.jaCard?.focus || programId;

    const approved = (pay.approvedPrograms || []).find(
      (a) => String(a.programId || "") === programId
    );
    const applicationId = String(approved?.applicationId || approved?.applicantId || "");

    let booking = null;
    try {
      booking = await getMyFlightBooking(programId, applicationId);
    } catch { /* expected if no booking */ }

    let prepLinks = [];
    try {
      prepLinks = await listTravelPrepLinks(programId);
    } catch { /* expected if none configured */ }

    const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const flightCard = booking && (booking.airline || booking.confirmationNumber)
      ? `<div class="mpd-travel-flight-card">
            <h4>Flight Details</h4>
            <div class="mpd-travel-flight-card__grid">
              <div class="mpd-travel-flight-card__item"><span>Airline</span><strong>${esc(booking.airline || "—")}</strong></div>
              <div class="mpd-travel-flight-card__item"><span>Confirmation #</span><strong>${esc(booking.confirmationNumber || "—")}</strong></div>
            </div>
            ${booking.airlineWebsite
              ? `<button type="button" class="mpd-travel-view-flight-btn" data-mpd-travel-view-url="${esc(booking.airlineWebsite)}" data-mpd-travel-copy="${esc(booking.confirmationNumber)}">View Flight</button>`
              : ""}
          </div>`
      : `<div class="mpd-travel-flight-card mpd-travel-flight-card--empty"><p class="studio-muted">Your flight details will appear here once booked.</p></div>`;

    const arrivalDate = booking?.estArrivalDate || "";
    const arrivalTime = booking?.estArrivalTime || "";
    const arrivalForm = `<div class="mpd-travel-arrival-form" data-mpd-travel-arrival-program="${esc(programId)}" data-mpd-travel-arrival-app="${esc(applicationId)}">
        <h4>Estimated Arrival</h4>
        <div class="mpd-travel-arrival-form__inputs">
          <label class="studio-field"><span>Date</span><input type="date" class="studio-input" value="${esc(arrivalDate)}" data-mpd-travel-arrival-date /></label>
          <label class="studio-field"><span>Time</span><input type="time" class="studio-input" value="${esc(arrivalTime)}" data-mpd-travel-arrival-time /></label>
          <button type="button" class="studio-btn-primary mpd-travel-arrival-save" data-mpd-travel-arrival-save>Save</button>
        </div>
      </div>`;

    const prepLinksHtml = prepLinks.length
      ? `<div class="mpd-travel-prep-links"><h4>Travel Preparation</h4><div class="mpd-travel-prep-links__grid">${prepLinks.map((l) =>
          `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" class="mpd-travel-prep-link-card">
              ${l.imageUrl ? `<img class="mpd-travel-prep-link-card__img" src="${esc(l.imageUrl)}" alt="" />` : ""}
              <strong>${esc(l.title)}</strong>
              <span>${esc(l.description)}</span>
              <span class="mpd-travel-prep-link-card__arrow">→</span>
            </a>`
        ).join("")}</div></div>`
      : "";

    parts.push(`
      <div class="mpd-travel-program-block" data-mpd-travel-program="${esc(programId)}">
        <h3 class="mpd-travel-program-title">${esc(programTitle)}</h3>
        ${flightCard}
        ${arrivalForm}
        ${prepLinksHtml}
      </div>
    `);
  }

  root.innerHTML = parts.join("");

  root.addEventListener("click", async (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;

    const viewBtn = t.closest("[data-mpd-travel-view-url]");
    if (viewBtn) {
      const confirmation = viewBtn.getAttribute("data-mpd-travel-copy") || "";
      if (confirmation) {
        try { await navigator.clipboard.writeText(confirmation); } catch {}
      }
      const url = viewBtn.getAttribute("data-mpd-travel-view-url") || "";
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    const saveBtn = t.closest("[data-mpd-travel-arrival-save]");
    if (saveBtn) {
      const form = saveBtn.closest("[data-mpd-travel-arrival-program]");
      if (!form) return;
      const pid = form.getAttribute("data-mpd-travel-arrival-program") || "";
      const aid = form.getAttribute("data-mpd-travel-arrival-app") || "";
      const dateInput = form.querySelector("[data-mpd-travel-arrival-date]");
      const timeInput = form.querySelector("[data-mpd-travel-arrival-time]");
      const date = dateInput instanceof HTMLInputElement ? dateInput.value : "";
      const time = timeInput instanceof HTMLInputElement ? timeInput.value : "";
      try {
        await setMyEstimatedArrival(pid, aid, date, time);
        saveBtn.textContent = "Saved!";
        setTimeout(() => { saveBtn.textContent = "Save"; }, 1500);
      } catch (err) {
        alert("Failed to save arrival: " + (err?.message || err));
      }
    }
  });
}

async function hydrateProgramCommsPanel() {
  const tab = document.getElementById("mpd-program-tab-communications");
  const root = document.getElementById("mpd_program_comms_workspace");
  if (!tab || !root) return;

  let rooms = [];
  try {
    rooms = await listMyProgramCommsRooms();
  } catch {
    rooms = [];
  }
  if (!Array.isArray(rooms)) rooms = [];

  const forceHidden = tab.classList.contains("mpd-program-tab--force-hidden");
  const showTab = rooms.length > 0 && !forceHidden;
  tab.toggleAttribute("hidden", !showTab);
  tab.setAttribute("aria-hidden", showTab ? "false" : "true");
  if (!showTab) {
    root.innerHTML = `<div class="mpd-program-placeholder"><h3>Communications</h3><p class="studio-muted">Official chat rooms and app downloads appear here when Fusion publishes communications for a program you are confirmed on.</p></div>`;
    if (tab.classList.contains("is-active")) setMpdProgramsTab("my-programs");
    return;
  }

  const programs = mpdLastProgramsForPayments || [];
  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const storeSlot = (opts) => {
    const label = String(opts.label || "");
    const qr = String(opts.qr || "").trim();
    const href = String(opts.href || "").trim();
    const thumb = String(opts.thumb || "").trim();
    return `<div class="mpd-comms-room__slot">
      ${thumb ? `<img class="mpd-comms-room__store-thumb" src="${esc(thumb)}" alt="" />` : ""}
      ${qr ? `<img class="mpd-comms-room__qr" src="${esc(qr)}" alt="${esc(label)} download QR" />` : ""}
      <p class="mpd-comms-room__slot-label">${esc(label)}</p>
      ${
        href
          ? `<a class="studio-btn-ghost mpd-comms-room__join" href="${esc(href)}" target="_blank" rel="noopener noreferrer">Open ${esc(label)}</a>`
          : ""
      }
    </div>`;
  };
  const roomSlot = (opts) => {
    const name = String(opts.name || "").trim() || opts.fallback;
    const qr = String(opts.qr || "").trim();
    const href = String(opts.href || "").trim();
    return `<div class="mpd-comms-room__slot">
      ${qr ? `<img class="mpd-comms-room__qr" src="${esc(qr)}" alt="Scan to join ${esc(name)}" />` : ""}
      <p class="mpd-comms-room__slot-label">${esc(name)}</p>
      ${
        href
          ? `<a class="studio-btn-primary mpd-comms-room__join" href="${esc(href)}" target="_blank" rel="noopener noreferrer">Open ${esc(name)}</a>`
          : ""
      }
    </div>`;
  };

  root.innerHTML = rooms
    .map((room) => {
      const program = programs.find((p) => String(p.id || "") === String(room.programId || "")) || null;
      const title = program
        ? getProgramDisplayNameFromRow(program)
        : String(room.groupGeneralName || room.programId || "Program");
      const message = resolveInviteMessage(room);
      const thumb = resolveProviderThumbUrl({ ...room, provider: room.provider || "line" });
      return `<article class="mpd-comms-room" data-mpd-comms-program="${esc(room.programId)}">
        <header class="mpd-comms-room__head">
          ${thumb ? `<img class="mpd-comms-room__provider" src="${esc(thumb)}" alt="" />` : ""}
          <div>
            <h3 class="mpd-comms-room__title">${esc(title)}</h3>
            <p class="mpd-comms-room__group">Official chat rooms</p>
          </div>
        </header>
        <p class="mpd-comms-room__invite">${esc(message)}</p>
        <section class="mpd-comms-room__section">
          <h4 class="mpd-comms-room__section-title">Download the app</h4>
          <div class="mpd-comms-room__pair">
            ${storeSlot({ label: "iOS", qr: room.iosQrUrl, href: room.iosStoreUrl, thumb: room.iosThumbUrl })}
            ${storeSlot({ label: "Android", qr: room.androidQrUrl, href: room.androidStoreUrl, thumb: room.androidThumbUrl })}
          </div>
        </section>
        <section class="mpd-comms-room__section">
          <h4 class="mpd-comms-room__section-title">Join both rooms</h4>
          <div class="mpd-comms-room__pair">
            ${roomSlot({
              name: room.groupGeneralName,
              fallback: "General",
              qr: room.groupGeneralQrUrl,
              href: room.groupGeneralInviteUrl,
            })}
            ${roomSlot({
              name: room.groupAnnounceName,
              fallback: "Announcements",
              qr: room.groupAnnounceQrUrl,
              href: room.groupAnnounceInviteUrl,
            })}
          </div>
        </section>
      </article>`;
    })
    .join("");

  const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "").toLowerCase() : "";
  if (hash === "communications" || hash === "programs-communications") {
    setMpdProgramsTab("communications");
  }
}

function mpdCurrentPaymentItem() {
  return mpdProgramPaymentItems.find((x) => x.programId === mpdSelectedPaymentProgramId) || mpdProgramPaymentItems[0] || null;
}

function applyMpdFlightChoiceToItem(item, ownFlight) {
  if (!item) return;
  item.ownFlight = Boolean(ownFlight);
  item.flightCreditCents = item.ownFlight ? MPD_PROGRAM_OWN_FLIGHT_CREDIT_CENTS : 0;
  const sponsoredPercent = Math.max(0, Math.min(100, Math.round(Number(item.sponsoredPercent || 0))));
  const sponsorshipMode = String(item.sponsorshipMode || "none").toLowerCase();
  const specialProgramTotalCents = mpdCents(item.specialProgramTotalCents);
  let sponsoredCreditCents = mpdCents(item.sponsoredCreditCentsRaw);
  if (sponsorshipMode === "partial" && sponsoredCreditCents <= 0 && sponsoredPercent > 0) {
    const listOrSpecial =
      specialProgramTotalCents > 0
        ? specialProgramTotalCents
        : computeMemberProgramTotalDueCents({
            category: item.applicantCategory || "general",
            ownFlight: item.ownFlight,
          });
    sponsoredCreditCents = Math.round((listOrSpecial * sponsoredPercent) / 100);
  }
  item.sponsoredCreditCents = sponsoredCreditCents;
  item.totalDueCents = computeApplicantEffectiveTotalDueCents({
    category: item.applicantCategory || "general",
    ownFlight: item.ownFlight,
    specialProgramTotalCents,
    sponsorshipMode,
    sponsoredCreditCents,
  });
  const programDepositCents = mpdCents(item.programDepositCents) || 100000;
  item.depositCents = resolveMemberChargeableDepositCents(programDepositCents, item.totalDueCents);
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
    </div>`,
  );
  const errEl = modal.querySelector("#mpdProgramPaymentError");
  const mount = modal.querySelector("#mpdProgramStripeMount");
  try {
    const [svc, cfg, checkout, payProvider] = await Promise.all([
      import("../utils/integrationApi.js"),
      import("../utils/studioServicesConfig.js"),
      import("../utils/paymentCheckout.js"),
      import("../utils/paymentProvider.js"),
    ]);
    const clientId = cfg.getPayPalClientIdResolved();
    if (!clientId) throw new Error("Configure PayPal client ID in Studio → Services.");
    const payConfig = await payProvider.fetchPaymentConfig();
    const principal = snap.principal.toText();
    const showError = (e) => {
      if (errEl instanceof HTMLElement) {
        errEl.hidden = false;
        errEl.textContent = e instanceof Error ? e.message : String(e);
      }
    };
    const finishPayment = async (orderId) => {
      const oid = String(orderId || "").trim();
      if (!oid) throw new Error("Missing PayPal order id.");
      const paidBefore = item.totalPaidCents;
      const depositBefore = item.depositPaid;
      try {
        await svc.confirmPayPalOneTimePayment(oid, {
          principal,
          programId: item.programId,
          applicationId: item.applicationId,
          paymentType,
        });
      } catch (e) {
        showError(e);
        return;
      }
      closeMpdPaymentModal();
      await hydrateProgramPaymentsPanel(mpdLastProgramsForPayments);
      // Re-check after hydrate: surface a clear failure if canister never recorded the payment.
      try {
        const payments = await getMyProgramPayments();
        const summary = mpdPaymentSummaryFor(item.programId, payments);
        const ledger = (payments.ledger || []).filter(
          (x) => String(x.programId || "") === item.programId,
        );
        const paidAfter = mpdCents(summary?.totalPaidCents);
        const depositAfter = isMemberProgramDepositPaid(
          { applicationId: item.applicationId, manualDepositSubmitted: false },
          summary,
          ledger,
          item.depositCents,
        );
        const orderOnLedger = ledger.some(
          (row) =>
            String(row.id || row.externalPaymentId || "") === oid &&
            (String(row.status || "") === "succeeded" || String(row.status || "") === "paid"),
        );
        if (
          !orderOnLedger &&
          paidAfter <= paidBefore &&
          (paymentType === "deposit" || paymentType === "full_payment"
            ? !depositAfter && !depositBefore
            : true)
        ) {
          window.alert(
            "Payment may have completed in PayPal but is not yet reflected here. Refresh this page, or contact Fusion with your PayPal order id: " +
              oid,
          );
        }
      } catch {
        /* hydrate already ran; avoid blocking UX on secondary check */
      }
    };
    if (mount) {
      mount.textContent = "";
      await checkout.mountPayPalAdvancedOneTimeCheckout(mount, {
        clientId,
        mode: payConfig.mode === "live" ? "live" : "sandbox",
        amountCents,
        metadata: {
          programId: item.programId,
          purpose: paymentType,
        },
        createOrder: async () =>
          svc.createPayPalOneTimePayment({
            principal,
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
          }),
        onApproved: finishPayment,
        onError: showError,
        showPayNowButton: true,
        payNowLabel: "Pay now",
        onPayNowClick: async (submit) => {
          await submit();
        },
      });
    }
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
  const months = countPaymentPlanMonthsUntilStart(item.startText, item.programYear);
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
  if (!canStartProgramPaymentPlan()) {
    window.alert("Payment plans are temporarily unavailable. Use Make a manual payment toward your balance.");
    return;
  }
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
      const [svc, cfg, checkout] = await Promise.all([
        import("../utils/integrationApi.js"),
        import("../utils/studioServicesConfig.js"),
        import("../utils/paymentCheckout.js"),
      ]);
      const clientId = cfg.getPayPalClientIdResolved();
      if (!clientId) throw new Error("Configure PayPal client ID in Studio → Services.");
      const planId = `plan-${item.programId}-${Date.now()}`;
      const plan = await svc.createPayPalProgramPaymentPlan({
        principal: snap.principal.toText(),
        email: item.email,
        programId: item.programId,
        applicationId: item.applicationId,
        planId,
        installmentCount: opt.count,
        installmentAmountCents: opt.amountCents,
        totalDueCents: item.totalDueCents,
        depositAmountCents: item.depositCents,
        planStartAt: new Date().toISOString(),
        planEndAt: item.startText || "",
      });
      if (mount && plan.approveUrl) {
        mount.hidden = false;
        mount.textContent = "";
        checkout.mountPayPalSubscriptionApproval(mount, {
          approveUrl: plan.approveUrl,
          label: "Approve payment plan in PayPal",
        });
      }
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Close after approving in PayPal";
      }
      btn?.addEventListener(
        "click",
        async () => {
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
    const svc = await import("../utils/integrationApi.js");
    const provider = String(item.activePlan.paymentProvider || "stripe").toLowerCase();
    const paypalSubId = String(item.activePlan.paypalSubscriptionId || "").trim();
    if (provider === "paypal" || paypalSubId) {
      await svc.cancelPayPalProgramPaymentPlan({
        planId: String(item.activePlan.id || ""),
        subscriptionId: paypalSubId,
      });
    } else {
      await svc.cancelProgramPaymentPlan({
        planId: String(item.activePlan.id || ""),
        subscriptionId: String(item.activePlan.stripeSubscriptionId || ""),
      });
    }
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

function openMpdMembershipChangePlanModal() {
  const modal = document.getElementById("mpdMembershipChangePlanModal");
  if (!modal) return;
  document.body.appendChild(modal);
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
}

function closeMpdMembershipChangePlanModal() {
  const modal = document.getElementById("mpdMembershipChangePlanModal");
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
}

/**
 * @param {string} currentTier
 */
function renderMpdMembershipChangePlanOptions(currentTier) {
  const container = document.getElementById("mpdMembershipChangePlanOptions");
  const errEl = document.getElementById("mpdMembershipChangePlanError");
  const confirmBtn = document.getElementById("mpdMembershipChangePlanConfirm");
  if (errEl) {
    errEl.hidden = true;
    errEl.textContent = "";
  }
  if (!container) return;
  container.replaceChildren();
  const cur = normalizeMembershipTier(currentTier);
  mpdMembershipSelectedChangeTier = "";

  /** @param {string} tier @param {boolean} disabled @param {boolean} checked @param {string} [kindLabel] */
  const addOption = (tier, disabled, checked, kindLabel = "") => {
    const t = normalizeMembershipTier(tier);
    if (!t || !MEMBERSHIP_TIER_META[t]) return;
    const meta = MEMBERSHIP_TIER_META[t];
    const id = `mpdMembershipChangePlan_${t}`;
    const label = document.createElement("label");
    label.className = "mpd-membership-change-plan-option";
    if (disabled) label.classList.add("mpd-membership-change-plan-option--current");
    label.setAttribute("for", id);
    label.innerHTML = `
      <input type="radio" name="mpdMembershipChangePlanTier" id="${id}" value="${mpdEscapeAttr(t)}"${
        disabled ? " disabled" : ""
      }${checked ? " checked" : ""} />
      <span class="mpd-membership-change-plan-option__main">
        <strong>${mpdEscapeAttr(meta.label)}${disabled ? " (current)" : ""}</strong>
        <span class="studio-muted">${mpdEscapeAttr(meta.priceLine)} — ${mpdEscapeAttr(meta.entitlement)}</span>
      </span>
      ${kindLabel ? `<span class="mpd-membership-change-plan-option__kind">${mpdEscapeAttr(kindLabel)}</span>` : ""}
    `;
    container.appendChild(label);
    const input = label.querySelector("input");
    input?.addEventListener("change", () => {
      if (input instanceof HTMLInputElement && input.checked && !input.disabled) {
        mpdMembershipSelectedChangeTier = t;
      }
    });
    if (checked && !disabled) mpdMembershipSelectedChangeTier = t;
  };

  if (cur) addOption(cur, true, true);
  let firstSelectable = true;
  for (const opt of getChangePlanOptions(cur)) {
    const kind =
      opt.kind === "upgrade" ? "Upgrade" : opt.kind === "downgrade" ? "Downgrade" : "";
    addOption(opt.tier, false, firstSelectable, kind);
    if (firstSelectable) firstSelectable = false;
  }

  if (confirmBtn) {
    const provider = String(mpdMembershipBillingContext?.provider || "").toLowerCase();
    confirmBtn.textContent =
      provider === "paypal" ? "Continue with PayPal" : "Continue";
  }
}

function wireMpdMembershipChangePlanModal() {
  const modal = document.getElementById("mpdMembershipChangePlanModal");
  if (!modal || modal.dataset.mpdChangePlanModalWired === "1") return;
  modal.dataset.mpdChangePlanModalWired = "1";
  const scrim = modal.querySelector(".profile-gallery-access-modal__scrim");
  const cancelBtn = modal.querySelector("#mpdMembershipChangePlanCancel");
  scrim?.addEventListener("click", closeMpdMembershipChangePlanModal);
  cancelBtn?.addEventListener("click", closeMpdMembershipChangePlanModal);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && !modal.hidden) closeMpdMembershipChangePlanModal();
  });
}

/** @type {'noAccount' | 'exempt' | 'ok' | 'needsSubscription' | ''} */
let mpdMembershipGate = "";
/** Cached account contact email for settings sidebar messages. */
let mpdKnownContactEmail = "";
/** @type {{ tier: string, subscriptionId: string, provider: string } | null} */
let mpdMembershipBillingContext = null;
/** @type {string} */
let mpdMembershipSelectedChangeTier = "";
/** @type {string} */
let mpdMembershipTestTier = "monthly";

/**
 * @param {string} tier
 * @param {number} [creditBalance]
 * @returns {string[]}
 */
function mpdMembershipIncludedBullets(tier, creditBalance = 0) {
  const t = normalizeMembershipTier(tier);
  /** @type {string[]} */
  const bullets = ["Profile on the public site", "Member benefits and updates"];
  if (t === "monthly") {
    bullets.unshift("Application fee $35 per submission");
    bullets.push("Program Award entries $50 each when a cycle is active");
  } else if (t === "quarterly") {
    bullets.unshift("One application credit per quarter; unused credits roll over");
    bullets.push("One Program Award entry per quarter (max one per program)");
    if (creditBalance > 0) {
      bullets.push(
        `${creditBalance} application credit${creditBalance === 1 ? "" : "s"} available now`,
      );
    }
  } else if (t === "annual") {
    bullets.unshift("4 stackable application credits per year");
    bullets.push("4 Program Award entries per year");
    if (creditBalance > 0) {
      bullets.push(
        `${creditBalance} application credit${creditBalance === 1 ? "" : "s"} available now`,
      );
    }
  } else if (t === "bimonthly") {
    bullets.unshift("Legacy bi-monthly billing");
    bullets.push("New plans are Monthly, Quarterly, or Annual");
  } else {
    bullets.unshift("Application submission");
  }
  return bullets;
}

/**
 * @param {string} tier
 * @returns {{ label: string, priceLine: string, legacyNote: string }}
 */
function mpdMembershipPlanCopy(tier) {
  const t = normalizeMembershipTier(tier);
  const meta = t && MEMBERSHIP_TIER_META[t] ? MEMBERSHIP_TIER_META[t] : null;
  return {
    label: meta?.label || "Membership",
    priceLine: meta?.priceLine || "—",
    legacyNote:
      t === "bimonthly" ? "New plans are Monthly, Quarterly, or Annual." : "",
  };
}

/** @param {'membershipPlanUpdated' | 'membershipPlanChangeCancelled'} [flag] */
function mpdSettingsMembershipReturnUrl(flag = "membershipPlanUpdated") {
  if (typeof window === "undefined") return "";
  const path = window.location.pathname || "/settings/profile";
  return `${window.location.origin}${path}?${flag}=1#membership`;
}

function mpdClearMembershipQueryFlags() {
  try {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("membershipPlanUpdated");
    url.searchParams.delete("membershipPlanChangeCancelled");
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    /* ignore */
  }
}

/**
 * @param {HTMLElement | null} listEl
 * @param {string} tier
 * @param {number} [creditBalance]
 */
function mpdRenderMembershipIncludedList(listEl, tier, creditBalance = 0) {
  if (!listEl) return;
  listEl.replaceChildren();
  for (const b of mpdMembershipIncludedBullets(tier, creditBalance)) {
    const li = document.createElement("li");
    li.className = "mpd-membership-checklist__item";
    li.textContent = b;
    listEl.appendChild(li);
  }
}

/**
 * @param {string} raw
 * @returns {boolean}
 */
function mpdLooksLikeEmail(raw) {
  const v = String(raw || "").trim();
  return v.includes("@") && v.length >= 5;
}

/**
 * Resolve the best email for settings contact messages.
 * @returns {Promise<string>}
 */
async function resolveSettingsProfileContactEmail() {
  if (mpdKnownContactEmail && mpdLooksLikeEmail(mpdKnownContactEmail)) {
    return mpdKnownContactEmail.trim();
  }
  try {
    const contact = await getMyAccountContactForCaller();
    const fromAccount = String(contact?.email || "").trim();
    if (mpdLooksLikeEmail(fromAccount)) {
      mpdKnownContactEmail = fromAccount;
      return fromAccount;
    }
  } catch {
    /* ignore */
  }
  try {
    const snap = await getAuthSnapshot();
    if (snap.authenticated) {
      const { getStoredBillingEmailForPrincipal } = await import(
        "../utils/integrationApi.js"
      );
      const billing = String(
        getStoredBillingEmailForPrincipal(snap.principal.toText()) || "",
      ).trim();
      if (mpdLooksLikeEmail(billing)) {
        mpdKnownContactEmail = billing;
        return billing;
      }
    }
  } catch {
    /* ignore */
  }
  const draft = getProfileSetupDraft();
  const fromDraft = String(draft.email || "").trim();
  if (mpdLooksLikeEmail(fromDraft)) {
    mpdKnownContactEmail = fromDraft;
    return fromDraft;
  }
  return "";
}

/**
 * Show email field in sidebar contact when we do not have a stored contact email.
 * @param {string} [knownEmail]
 */
function updateSettingsProfileContactEmailField(knownEmail = mpdKnownContactEmail) {
  const wrap = document.getElementById("settingsProfileNavContactEmailWrap");
  const input = document.getElementById("settingsProfileNavContactEmail");
  if (!wrap || !(input instanceof HTMLInputElement)) return;
  const hasEmail = mpdLooksLikeEmail(knownEmail);
  wrap.hidden = hasEmail;
  if (hasEmail) {
    input.value = knownEmail.trim();
    input.removeAttribute("required");
  } else {
    if (!input.value.trim()) input.value = "";
    input.setAttribute("required", "required");
  }
}

/**
 * Modal-level save progress. Keeps the choice sheet open with a spinner so the
 * picked action always shows a loading animation (translate can take a while).
 * @param {boolean} busy
 * @param {string} [label]
 * @param {'translate' | 'just-save' | ''} [choice]
 */
function setMpdSaveChoiceBusy(busy, label = "", choice = "") {
  const modal = document.getElementById("mpdSaveChoiceModal");
  if (!modal) return;
  modal.classList.toggle("is-busy", busy);
  modal.setAttribute("aria-busy", busy ? "true" : "false");
  const progress = modal.querySelector("#mpdSaveChoiceProgress");
  const progressLabel = modal.querySelector("#mpdSaveChoiceProgressLabel");
  if (progressLabel) progressLabel.textContent = label || "Saving your profile…";
  if (progress) progress.toggleAttribute("hidden", !busy);
  const translationBlocked = mpdMembershipGate === "needsSubscription";
  modal.querySelectorAll(".mpd-save-choice-modal__actions button").forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    const isTranslate = btn.id === "mpdSaveChoiceTranslate";
    const isJustSave = btn.id === "mpdSaveChoiceJustSave";
    const isChosen =
      (choice === "translate" && isTranslate) || (choice === "just-save" && isJustSave);
    btn.disabled = busy || (isTranslate && translationBlocked);
    if (busy && isChosen) btn.setAttribute("aria-busy", "true");
    else btn.removeAttribute("aria-busy");
  });
}

function openMpdSaveChoiceModal() {
  const modal = document.getElementById("mpdSaveChoiceModal");
  if (!modal) return;
  document.body.appendChild(modal);
  setMpdSaveChoiceBusy(false);
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  const translateBtn = /** @type {HTMLButtonElement | null} */ (
    modal.querySelector("#mpdSaveChoiceTranslate")
  );
  const translateNote = modal.querySelector("#mpdSaveChoiceTranslateNote");
  const translationBlocked = mpdMembershipGate === "needsSubscription";
  if (translateBtn) {
    translateBtn.disabled = translationBlocked;
    translateBtn.setAttribute("aria-disabled", translationBlocked ? "true" : "false");
  }
  if (translateNote) {
    translateNote.textContent = translationBlocked
      ? "Translation needs an active membership. Use Just save to update your profile without translation."
      : "";
    translateNote.toggleAttribute("hidden", !translationBlocked);
  }
}

function closeMpdSaveChoiceModal() {
  const modal = document.getElementById("mpdSaveChoiceModal");
  if (!modal) return;
  setMpdSaveChoiceBusy(false);
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
}

/** Keeps the save-choice progress label in sync with the active operation. */
let _mpdSaveChoiceStatusWired = false;

function wireMpdSaveChoiceModal() {
  const modal = document.getElementById("mpdSaveChoiceModal");
  if (!modal || modal.dataset.mpdSaveChoiceModalWired === "1") return;
  modal.dataset.mpdSaveChoiceModalWired = "1";
  const scrim = modal.querySelector(".profile-gallery-access-modal__scrim");
  const cancelBtn = modal.querySelector("#mpdSaveChoiceCancel");
  const justSaveBtn = modal.querySelector("#mpdSaveChoiceJustSave");
  const translateBtn = modal.querySelector("#mpdSaveChoiceTranslate");
  const cancel = () => {
    const current = document.getElementById("mpdSaveChoiceModal");
    if (current?.classList.contains("is-busy")) return;
    closeMpdSaveChoiceModal();
    window.dispatchEvent(
      new CustomEvent("fusion-settings-profile-save-choice", {
        detail: { action: "cancel" },
      }),
    );
  };
  /** @param {boolean} translate */
  const choose = (translate) => {
    if (modal.classList.contains("is-busy")) return;
    setMpdSaveChoiceBusy(
      true,
      translate ? "Translating & saving your profile…" : "Saving your profile…",
      translate ? "translate" : "just-save",
    );
    window.dispatchEvent(
      new CustomEvent("fusion-settings-profile-save-choice", {
        detail: { action: "save", translate },
      }),
    );
  };
  scrim?.addEventListener("click", cancel);
  cancelBtn?.addEventListener("click", cancel);
  justSaveBtn?.addEventListener("click", () => choose(false));
  translateBtn?.addEventListener("click", () => choose(true));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && !modal.hidden) cancel();
  });
  if (!_mpdSaveChoiceStatusWired) {
    _mpdSaveChoiceStatusWired = true;
    window.addEventListener("fusion-profile-save-status", (event) => {
      const current = document.getElementById("mpdSaveChoiceModal");
      if (!current || current.hidden || !current.classList.contains("is-busy")) return;
      const detail =
        event instanceof CustomEvent && detailIsObject(event.detail) ? event.detail : {};
      if (String(detail.state || "") !== "saving") return;
      const progressLabel = current.querySelector("#mpdSaveChoiceProgressLabel");
      const message = String(detail.message || "").trim();
      if (progressLabel && message) progressLabel.textContent = message;
    });
  }
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
 * @param {string} pid
 * @param {object[]} programs
 * @param {{ forceClosed?: boolean }} [opts]
 */
function mpdDrawStatusWrapHtml(pid, programs, opts = {}) {
  const row = Array.isArray(programs)
    ? programs.find((x) => String(x?.id) === String(pid))
    : null;
  const closed = Boolean(opts.forceClosed) || parseProgramDrawClosed(row);
  return `<div class="mpd-draw-status-wrap" data-mpd-draw-for="${escapeHtmlMpd(pid)}">
          <app-program-draw-status data-program-id="${escapeHtmlMpd(pid)}" data-fixture="false" data-draw-closed="${closed ? "true" : "false"}"></app-program-draw-status>
        </div>`;
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

  /** @type {object[]} */
  let enteredDraws = [];
  try {
    const rows = await listMyProgramAwardEntries();
    enteredDraws = (Array.isArray(rows) ? rows : []).filter(
      (e) => String(/** @type {Record<string, unknown>} */ (e)?.status || "") === "entered",
    );
  } catch {
    enteredDraws = [];
  }

  const drawProgramIds = new Set(
    enteredDraws.map((e) => String(e?.programId || "").trim()).filter(Boolean),
  );
  const myProgramsTotal = new Set([...applicationIds.map(String), ...drawProgramIds]).size;
  const countBadge = document.getElementById("mpd_my_programs_count");
  if (countBadge) {
    countBadge.textContent = String(myProgramsTotal);
    countBadge.toggleAttribute("hidden", myProgramsTotal === 0);
    countBadge.setAttribute(
      "aria-label",
      `${myProgramsTotal} program${myProgramsTotal === 1 ? "" : "s"}`,
    );
  }

  const showTesterFixture =
    applicationsIncludeTester(rec.applied_json ?? rec.appliedJson) ||
    readApplicationOnlyDisplayPref();

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

  /** @type {{ type: 'formal'|'draw', html: string, programId?: string }[]} */
  const blocks = [];
  /** @type {Set<string>} */
  const drawIdsPlaced = new Set();

  for (const card of cards) {
    const pid = String(card.programId || "");
    blocks.push({ type: "formal", html: renderMpdMyProgramCard(card), programId: pid });
    const draw = enteredDraws.find((e) => String(e?.programId || "") === pid);
    if (draw) {
      drawIdsPlaced.add(pid);
      blocks.push({
        type: "draw",
        programId: pid,
        html: mpdDrawStatusWrapHtml(pid, programs, { forceClosed: showTesterFixture }),
      });
    }
  }
  for (const entry of enteredDraws) {
    const pid = String(entry?.programId || "").trim();
    if (!pid || drawIdsPlaced.has(pid)) continue;
    drawIdsPlaced.add(pid);
    blocks.push({
      type: "draw",
      programId: pid,
      html: mpdDrawStatusWrapHtml(pid, programs, { forceClosed: showTesterFixture }),
    });
  }
  if (showTesterFixture && !blocks.some((b) => b.type === "draw")) {
    blocks.push({
      type: "draw",
      programId: "fixture",
      html: `<div class="mpd-draw-status-wrap mpd-draw-status-wrap--fixture" data-mpd-draw-fixture="true">
        <app-program-draw-status data-fixture="true" data-program-id="fixture" data-draw-closed="true"></app-program-draw-status>
      </div>`,
    });
  }

  if (blocks.length === 0) {
    container.innerHTML = `
      <div class="mpd-programs-empty-state mpd-my-program-empty">
        <h4>No applications yet.</h4>
        <p class="studio-muted">When you apply to a Fusion program, your status and next steps will appear here.</p>
      </div>
    `;
    await hydrateProgramPaymentsPanel(programs);
    return;
  }

  container.innerHTML = `
    <div class="mpd-my-program-cards">
      ${blocks.map((b) => b.html).join("")}
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

  container.querySelectorAll("app-program-draw-status").forEach((el) => {
    el.addEventListener("fusion-draw-status-exited", () => {
      void hydrateProgramsPanel(rec, locales, active);
    });
  });

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
    void hydrateExploreProgramCredits();
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
  void hydrateExploreProgramCredits();
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
                                        <span class="mpd-media-placeholder mpd-media-placeholder--detailed" aria-hidden="true">
                                            <strong>Add Image</strong>
                                            <small>${suggestedRatio} ratio &middot; JPG &middot; Max 1 MB</small>
                                        </span>
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
  /**
   * Two-column Story & World sections: the artist's words (`mpd_w_*`, historical ids
   * used by the profile draft) and the AI version (`mpd_wn_*`), plus one publish radio
   * per column and the per-section "suggest copy" button in the gutter.
   */
  const storySections = [
    {
      field: "practice",
      label: "Practice",
      hint: "Tell us more about the work you are currently pursuing.",
      placeholder: "Describe what you are working on...",
      rows: 3,
    },
    {
      field: "perspective",
      label: "Perspective",
      hint: "How you see your practice in relation to the field.",
      placeholder: "Share your point of view...&#10;&#10;Add another thought here...",
      rows: 3,
    },
    {
      field: "vision",
      label: "Vision",
      hint: "Where you want the work to go — aims, horizons, and what you are building toward.",
      placeholder: "Where do you want the work to go?",
      rows: 3,
    },
    {
      field: "constructing",
      label: "Constructing",
      hint: "Materials, process, and what you are actively making right now.",
      placeholder: "Materials, process, current experiments...",
      rows: 2,
    },
    {
      field: "context",
      label: "Context",
      hint: "Place, community, or history that situates the work.",
      placeholder: "Place, community, history, or influences...",
      rows: 2,
    },
    {
      field: "quote",
      label: "Quote",
      hint: "A single line visitors can read at a glance.",
      placeholder: "A short line visitors can remember...",
      rows: 1,
    },
  ];
  const storyRowsHtml = storySections
    .map((section) => {
      const ownId = `mpd_w_${section.field}`;
      const aiId = `mpd_wn_${section.field}`;
      const ownControl =
        section.field === "quote"
          ? `<input type="text" id="${ownId}" class="studio-input mpd-story-input" placeholder="${section.placeholder}" />`
          : `<textarea id="${ownId}" class="studio-textarea mpd-story-input" rows="${String(section.rows)}" placeholder="${section.placeholder}"></textarea>`;
      const aiControl =
        section.field === "quote"
          ? `<input type="text" id="${aiId}" class="studio-input mpd-story-input mpd-story-input--ai" placeholder="No AI version yet — press ✦" />`
          : `<textarea id="${aiId}" class="studio-textarea mpd-story-input mpd-story-input--ai" rows="${String(section.rows)}" placeholder="No AI version yet — press ✦"></textarea>`;
      return `
                                    <div class="mpd-story-row" data-mpd-story-field="${section.field}">
                                        <div class="mpd-story-row__head">
                                            <span class="mpd-story-field-label">${section.label}</span>
                                            <span class="mpd-field-hint">${section.hint}</span>
                                        </div>
                                        <div class="mpd-story-row__cols">
                                            <div class="mpd-story-col mpd-story-col--own" data-mpd-story-column="world">
                                                <div class="mpd-story-col__head">
                                                    <label class="mpd-story-pick">
                                                        <input type="radio" class="mpd-story-pick__input" name="mpd_pick_${section.field}" value="world" aria-label="Publish your own ${section.label} copy" />
                                                        <span class="mpd-story-pick__dot" aria-hidden="true"></span>
                                                        <span class="mpd-story-col__label">Your words</span>
                                                    </label>
                                                    <button type="button" class="mpd-story-edit-btn" data-mpd-edit-target="${ownId}" aria-label="Edit your ${section.label} copy">${storyEditIconHtml}</button>
                                                </div>
                                                ${ownControl}
                                            </div>
                                            <div class="mpd-story-gutter">
                                                <button type="button" class="mpd-story-suggest" data-mpd-suggest-field="${section.field}" data-mpd-tip="Write an AI version of ${section.label} from your bio, discipline and location. Nothing goes public until you pick the AI column." aria-label="Write an AI version of ${section.label}" aria-busy="false">
                                                    <span class="mpd-story-suggest__icon" aria-hidden="true">✦</span>
                                                    <span class="mpd-story-suggest__spinner" aria-hidden="true"></span>
                                                </button>
                                            </div>
                                            <div class="mpd-story-col mpd-story-col--ai" data-mpd-story-column="newWorld">
                                                <div class="mpd-story-col__head">
                                                    <label class="mpd-story-pick">
                                                        <input type="radio" class="mpd-story-pick__input" name="mpd_pick_${section.field}" value="newWorld" aria-label="Publish the AI ${section.label} copy" checked />
                                                        <span class="mpd-story-pick__dot" aria-hidden="true"></span>
                                                        <span class="mpd-story-col__label">AI version</span>
                                                    </label>
                                                    <button type="button" class="mpd-story-edit-btn" data-mpd-edit-target="${aiId}" aria-label="Edit the AI ${section.label} copy">${storyEditIconHtml}</button>
                                                </div>
                                                ${aiControl}
                                                <div class="mpd-story-col__loader" data-mpd-story-loader="${section.field}" hidden aria-hidden="true">
                                                    <span class="mpd-story-col__spin" aria-hidden="true"></span>
                                                    <span>Writing suggestion…</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p class="mpd-story-row__note" data-mpd-story-pick-note role="status" aria-live="polite"></p>
                                    </div>`;
    })
    .join("");

  const userIdCopyIcon = studioIconHref("assist-copy");
  const mpdUserIdCopyIconHtml = userIdCopyIcon
    ? `<img src="${mpdEscapeAttr(userIdCopyIcon)}" alt="" class="mpd-user-id__copy-icon" />`
    : '<span class="mpd-user-id__copy-icon-fallback" aria-hidden="true">⧉</span>';

  /**
   * @param {'sidebar' | 'main'} slot
   */
  const mpdUserIdBlockHtml = (slot) => {
    const ids =
      slot === "sidebar"
        ? {
            wrap: "settingsProfileUserIdWrap",
            value: "settingsProfileUserId",
            copy: "settingsProfileCopyUserId",
          }
        : {
            wrap: "settingsProfileMainUserIdWrap",
            value: "settingsProfileMainUserId",
            copy: "settingsProfileMainUserIdCopy",
          };
    return `<div class="mpd-user-id mpd-user-id--${slot}" id="${ids.wrap}" hidden>
                    <span class="mpd-user-id__label">User ID</span>
                    <div class="mpd-user-id__row">
                        <code class="mpd-user-id__value" id="${ids.value}" tabindex="0" role="button" title="Click to copy User ID">—</code>
                        <button type="button" class="mpd-user-id__copy-btn" id="${ids.copy}" aria-label="Copy User ID">${mpdUserIdCopyIconHtml}</button>
                    </div>
                </div>`;
  };

  return `
        <div class="page settings-profile-page">
            <app-join-network
                id="joinNetworkHeaderBridge"
                data-modal-type="membership"
                data-header-bridge="true"
                context="settings-profile"
                active="true"
            ></app-join-network>
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
                <nav class="studio-nav" id="settingsProfileNav" aria-label="Profile sections">
                    <button type="button" class="studio-nav-item mpd-nav-btn is-active" data-mpd-panel="studio-overview">${mpdNavIconHtml(
                      "artist-overview",
                    )}<span class="studio-nav-item__label" data-mpd-i18n="studio-overview">${mpdLabel("studio-overview")}</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="identity">${mpdNavIconHtml(
                      "artist-identity",
                    )}<span class="studio-nav-item__label" data-mpd-i18n="identity">${mpdLabel("identity")}</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="work">${mpdNavIconHtml(
                      "nav-products",
                    )}<span class="studio-nav-item__label" data-mpd-i18n="work">${mpdLabel("work")}</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="programs">${mpdNavIconHtml(
                      "nav-programs",
                    )}<span class="studio-nav-item__label" data-mpd-i18n="programs">${mpdLabel("programs")}</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="media">${mpdNavIconHtml(
                      "nav-content",
                    )}<span class="studio-nav-item__label" data-mpd-i18n="media">${mpdLabel("media")}</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="journal">${mpdNavIconHtml(
                      "nav-journal",
                    )}<span class="studio-nav-item__label" data-mpd-i18n="journal">${mpdLabel("journal")}</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="settings">${mpdNavIconHtml(
                      "nav-settings",
                    )}<span class="studio-nav-item__label" data-mpd-i18n="settings">${mpdLabel("settings")}</span></button>
                    ${devNavBtn}
                    <div class="mpd-sidebar-cta-row" aria-label="Profile quick actions">
                        <a class="program-intro-cta mpd-program-intro-cta mpd-sidebar-cta" id="mpd_view_profile" href="#" target="_blank" rel="noopener noreferrer">View public profile &rarr;</a>
                        <button type="button" class="program-intro-cta mpd-program-intro-cta mpd-sidebar-cta" id="mpd_apply_residency" data-program-path="${MPD_APPLY_PROGRAM_PATH}" data-apply-open="true">Apply to Residency &rarr;</button>
                        <button type="button" class="program-intro-cta mpd-program-intro-cta mpd-sidebar-cta mpd-sidebar-cta--become-member" id="mpd_become_member" hidden>Become a member</button>
                    </div>
                    <div class="mpd-application-only-toggle" id="mpdApplicationOnlyToggleWrap" hidden>
                        <label class="mpd-application-only-toggle__label">
                            <input type="checkbox" id="mpdApplicationOnlyToggle" />
                            <span>Application only display</span>
                        </label>
                    </div>
                    <div class="studio-nav-contact mpd-sidebar-contact" id="settingsProfileNavContact">
                        <p class="studio-nav-contact__headline">
                            Questions or issues? Message the Fusion team—we usually reply within a few business days.
                        </p>
                        <label id="settingsProfileNavContactEmailWrap" class="studio-nav-contact__email-wrap" hidden>
                            <span class="studio-nav-contact__email-label">Your email (so we can reply)</span>
                            <input
                                type="email"
                                id="settingsProfileNavContactEmail"
                                class="studio-nav-contact__input studio-nav-contact__input--email"
                                placeholder="you@example.com"
                                autocomplete="email"
                            />
                        </label>
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
                </nav>
                ${mpdUserIdBlockHtml("sidebar")}
            </aside>
            <div class="studio-workspace">
                <header class="studio-topbar">
                    <button type="button" class="studio-menu-btn" id="settingsProfileMenuBtn" aria-label="Open navigation menu" aria-expanded="false" aria-controls="settingsProfileNav">
                        <span class="studio-menu-btn__bars" aria-hidden="true"></span>
                    </button>
                    <h1 id="settingsProfileHeading" data-mpd-i18n="your-studio">Studio</h1>
                </header>
                <div class="studio-main settings-profile-main" id="settingsProfileScrollMain">
                <p id="settingsProfileStatus" class="member-profile-dashboard__status-line" role="status"></p>
                <div id="settingsProfileInitialLoading" class="mpd-initial-loading" role="status" aria-live="polite">
                    <div class="mpd-initial-loading__spinner" aria-hidden="true"></div>
                    <p>Loading profile settings...</p>
                </div>
                <div class="mpd-settings-shout shoutHeadline" id="settingsProfileShout">
                    Your creative space.<br />Shape your presence.
                </div>
                <p id="settingsProfileHint" class="studio-muted mpd-settings-hint"></p>
                ${mpdUserIdBlockHtml("main")}
                <div id="settingsProfileAccountRecovery" class="mpd-account-recovery" hidden>
                    <p class="mpd-account-recovery__lead">If you already paid or completed setup with a different login, contact Fusion support with your checkout email and User ID above to receive a recovery code.</p>
                    <button type="button" class="mpd-account-recovery__toggle" id="settingsProfileRecoverToggle">Enter recovery code</button>
                    <div id="settingsProfileRecoverPanel" class="mpd-account-recovery__panel" hidden>
                        <p class="mpd-account-recovery__notice">Enter the 8-digit recovery code Fusion support sent you.</p>
                        <div class="mpd-account-recovery__row">
                            <label class="studio-sr-only" for="settingsProfileRecoveryCode">Recovery code</label>
                            <input type="text" id="settingsProfileRecoveryCode" class="studio-input mpd-account-recovery__input" inputmode="numeric" maxlength="8" pattern="[0-9]*" autocomplete="one-time-code" placeholder="8-digit code" />
                            <button type="button" class="studio-btn-primary" id="settingsProfileRecoverySubmit">Recover</button>
                        </div>
                        <p id="settingsProfileRecoveryStatus" class="mpd-account-recovery__status studio-muted" role="status"></p>
                    </div>
                </div>
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
                        <!-- ═══ STUDIO OVERVIEW ═══ -->
                        <div class="mpd-panel mpd-panel--studio-overview" id="mpd-panel-studio-overview" data-mpd-panel="studio-overview">
                          <div class="mpd-overview-layout">
                            <div class="mpd-overview-middle">
                                <p id="mpd_datasource_pill" class="member-profile-dashboard__pill" style="display:none;margin-top:0;margin-bottom:0.75rem"></p>

                                <div class="mpd-completion-card" id="mpd_completion_card">
                                    <div class="mpd-completion-card__head">
                                        <span class="mpd-completion-label">PROFILE COMPLETION</span>
                                        <span class="mpd-completion-pill" id="mpd_completion_pill">Profile Incomplete</span>
                                    </div>
                                    <div class="mpd-completion-bar-row">
                                        <div class="mpd-completion-bar">
                                            <div class="mpd-completion-bar__fill" id="mpd_completion_fill" style="width:0%"></div>
                                        </div>
                                        <span class="mpd-completion-pct" id="mpd_completion_pct">0% complete</span>
                                    </div>
                                    <div class="mpd-completion-steps" id="mpd_completion_steps">
                                        <div class="mpd-completion-step" data-step="identity">
                                            <span class="mpd-completion-step__marker">1</span>
                                            <span class="mpd-completion-step__label">Presence</span>
                                            <span class="mpd-completion-step__status">Not started</span>
                                        </div>
                                        <div class="mpd-completion-step" data-step="work">
                                            <span class="mpd-completion-step__marker">2</span>
                                            <span class="mpd-completion-step__label">Work</span>
                                            <span class="mpd-completion-step__status">Not started</span>
                                        </div>
                                        <div class="mpd-completion-step" data-step="programs">
                                            <span class="mpd-completion-step__marker">3</span>
                                            <span class="mpd-completion-step__label">Programs</span>
                                            <span class="mpd-completion-step__status">Not started</span>
                                        </div>
                                        <div class="mpd-completion-step" data-step="media">
                                            <span class="mpd-completion-step__marker">4</span>
                                            <span class="mpd-completion-step__label">Media</span>
                                            <span class="mpd-completion-step__status">Not started</span>
                                        </div>
                                        <div class="mpd-completion-step" data-step="preview">
                                            <span class="mpd-completion-step__marker">5</span>
                                            <span class="mpd-completion-step__label">Profile</span>
                                            <span class="mpd-completion-step__status">Not started</span>
                                        </div>
                                    </div>
                                </div>

                                <div
                                  class="mpd-program-credits mpd-program-credits--overview"
                                  id="mpd_overview_credits"
                                  data-mpd-credits-strip
                                  hidden
                                  aria-live="polite"
                                >
                                    <div class="mpd-program-credits__item">
                                        <span class="mpd-program-credits__icon mpd-program-credits__icon--app" aria-hidden="true"></span>
                                        <div class="mpd-program-credits__copy">
                                            <span class="mpd-program-credits__label">Application credits</span>
                                            <strong class="mpd-program-credits__value" data-mpd-credits-app>—</strong>
                                        </div>
                                    </div>
                                    <div class="mpd-program-credits__item">
                                        <span class="mpd-program-credits__icon mpd-program-credits__icon--draw" aria-hidden="true"></span>
                                        <div class="mpd-program-credits__copy">
                                            <span class="mpd-program-credits__label" data-mpd-credits-draw-label>Program Award entries</span>
                                            <strong class="mpd-program-credits__value" data-mpd-credits-draw>—</strong>
                                        </div>
                                    </div>
                                    <div class="mpd-program-credits__item mpd-program-credits__item--broadcast">
                                        <span class="mpd-program-credits__icon mpd-program-credits__icon--broadcast" aria-hidden="true"></span>
                                        <div class="mpd-program-credits__copy">
                                            <span class="mpd-program-credits__label">Broadcast credits <button type="button" class="mpd-program-credits__info" data-mpd-broadcast-info aria-label="What are broadcast credits?">i</button></span>
                                            <strong class="mpd-program-credits__value" data-mpd-credits-broadcast>—</strong>
                                            <span class="mpd-program-credits__hint" data-mpd-credits-broadcast-hint></span>
                                            <button type="button" class="mpd-program-credits__redeem-btn" data-mpd-broadcast-redeem hidden>VIEW OPTIONS &#8594;</button>
                                        </div>
                                    </div>
                                    <div class="mpd-program-credits__item mpd-program-credits__item--invites">
                                        <span class="mpd-program-credits__icon mpd-program-credits__icon--invites" aria-hidden="true"></span>
                                        <div class="mpd-program-credits__copy">
                                            <span class="mpd-program-credits__label">Member invites</span>
                                            <strong class="mpd-program-credits__value" data-mpd-credits-invites>—</strong>
                                            <span class="mpd-program-credits__hint" data-mpd-credits-invites-hint>invites available</span>
                                            <button type="button" class="mpd-program-credits__invite-btn" data-mpd-invite-member>Invite member &#8594;</button>
                                        </div>
                                    </div>
                                    <div class="mpd-program-credits__footer-row" data-mpd-credits-footer>
                                        <span class="mpd-program-credits__icon mpd-program-credits__icon--next" aria-hidden="true"></span>
                                        <span class="mpd-program-credits__label">Next credits</span>
                                        <strong class="mpd-program-credits__value" data-mpd-credits-next>—</strong>
                                        <span class="mpd-program-credits__hint" data-mpd-credits-next-hint></span>
                                    </div>
                                </div>

                                <div id="mpd_invite_panel" class="mpd-invite-panel" hidden></div>

                                <div id="mpd_referral_prompts" class="mpd-referral-prompts" hidden></div>

                                <div class="mpd-blindspots" id="mpd_blindspots">
                                    <span class="mpd-section-label">BLINDSPOTS</span>
                                    <div class="mpd-blindspots-grid" id="mpd_blindspots_grid"></div>
                                </div>

                                <div class="mpd-studio-sections">
                                    <span class="mpd-section-label">STUDIO SECTIONS</span>
                                    <div class="mpd-sections-grid">
                                        <div class="mpd-section-card mpd-nav-btn" data-mpd-panel="identity">
                                            <div class="mpd-section-card__text">
                                                ${mpdNavIconHtml("artist-identity")}
                                                <strong>Identity &amp; Presence</strong>
                                                <p>Name, bio, status, and the story behind your work.</p>
                                                <span class="mpd-section-card__link">EDIT SECTION &rarr;</span>
                                            </div>
                                            <div class="mpd-section-card__img"><img src="${studioSecIdentityImg}" alt="" loading="lazy" /></div>
                                        </div>
                                        <div class="mpd-section-card mpd-nav-btn" data-mpd-panel="work">
                                            <div class="mpd-section-card__text">
                                                ${mpdNavIconHtml("nav-products")}
                                                <strong>Work &amp; Projects</strong>
                                                <p>Portfolio, projects, and the pieces that define your practice.</p>
                                                <span class="mpd-section-card__link">MANAGE &rarr;</span>
                                            </div>
                                            <div class="mpd-section-card__img"><img src="${studioSecWorkImg}" alt="" loading="lazy" /></div>
                                        </div>
                                        <div class="mpd-section-card mpd-nav-btn" data-mpd-panel="programs">
                                            <div class="mpd-section-card__text">
                                                ${mpdNavIconHtml("nav-programs")}
                                                <strong>Exhibitions &amp; Programs</strong>
                                                <p>Explore, apply, and manage your program participation.</p>
                                                <span class="mpd-section-card__link">MANAGE &rarr;</span>
                                            </div>
                                            <div class="mpd-section-card__img"><img src="${studioSecExhibitionsImg}" alt="" loading="lazy" /></div>
                                        </div>
                                        <div class="mpd-section-card mpd-nav-btn" data-mpd-panel="media">
                                            <div class="mpd-section-card__text">
                                                ${mpdNavIconHtml("nav-content")}
                                                <strong>Media Library</strong>
                                                <p>Main artwork, profile card, intro gallery, and audio.</p>
                                                <span class="mpd-section-card__link">EDIT SECTION &rarr;</span>
                                            </div>
                                            <div class="mpd-section-card__img"><img src="${studioSecMediaImg}" alt="" loading="lazy" /></div>
                                        </div>
                                        <div class="mpd-section-card mpd-nav-btn" data-mpd-panel="journal">
                                            <div class="mpd-section-card__text">
                                                ${mpdNavIconHtml("nav-journal")}
                                                <strong>Journal / Notes</strong>
                                                <p>Creative journal entries, reflections, and notes.</p>
                                                <span class="mpd-section-card__link">MANAGE &rarr;</span>
                                            </div>
                                            <div class="mpd-section-card__img"><img src="${studioSecJournalImg}" alt="" loading="lazy" /></div>
                                        </div>
                                        <a class="mpd-section-card mpd-section-card--link" id="mpd_overview_profile_card" href="#" target="_blank" rel="noopener noreferrer">
                                            <div class="mpd-section-card__text">
                                                ${mpdNavIconHtml("artist-profile-link")}
                                                <strong>Profile</strong>
                                                <p>See how visitors experience your public profile.</p>
                                                <span class="mpd-section-card__link">VIEW PROFILE &rarr;</span>
                                            </div>
                                            <div class="mpd-section-card__img"><img src="${studioSecPreviewImg}" alt="" loading="lazy" /></div>
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <aside class="mpd-overview-right">
                                <div class="mpd-publish-card">
                                    <span class="mpd-section-label">PUBLISH SETTINGS</span>
                                    <label class="mpd-publish-select-wrap">
                                        <span class="mpd-publish-select-label">Visibility</span>
                                        <select id="mpd_overview_visibility" class="mpd-publish-select studio-input" aria-label="Profile visibility">
                                            <option value="inactive">Inactive</option>
                                            <option value="private">Private</option>
                                            <option value="public">Public</option>
                                    </select>
                                </label>
                                    <span id="mpd_overview_visibility_review" class="mpd-visibility-review-notice" hidden>Submitted for review</span>
                                    <button type="button" class="mpd-publish-save" id="mpd_overview_publish_save">PUBLISH PROFILE</button>
                                </div>

                                <div class="mpd-preview-card" id="mpd_overview_preview">
                                    <div class="mpd-preview-card__image" id="mpd_overview_preview_img"></div>
                                    <div class="mpd-preview-card__body">
                                        <strong id="mpd_overview_preview_name">—</strong>
                                        <span class="mpd-preview-card__role" id="mpd_overview_preview_discipline">—</span>
                                        <span class="mpd-preview-card__location" id="mpd_overview_preview_location">—</span>
                                    </div>
                                    <a class="mpd-preview-card__link" id="mpd_overview_view_profile" href="#" target="_blank" rel="noopener noreferrer">VIEW FULL PROFILE &rarr;</a>
                                </div>

                                <div class="mpd-quote-card" id="mpd_quote_card">
                                    <blockquote class="mpd-quote-card__text" id="mpd_quote_text">
                                        <em>Every artist was first an amateur.</em>
                                        <span>Clarity attracts connection. Shape your presence with intention.</span>
                                    </blockquote>
                                    <span class="mpd-quote-card__attr">&mdash; FUSION</span>
                                </div>
                            </aside>
                          </div>
                        </div>

                        <!-- ═══ IDENTITY & PRESENCE (merged overview fields + location + story) ═══ -->
                        <div class="mpd-panel" id="mpd-panel-identity" data-mpd-panel="identity" hidden>
                            <div class="mpd-identity-tabs" role="tablist" aria-label="Identity sections">
                                <button type="button" class="mpd-identity-tab is-active" data-mpd-identity-tab="basics" role="tab" aria-selected="true">Basics</button>
                                <button type="button" class="mpd-identity-tab" data-mpd-identity-tab="status" role="tab" aria-selected="false">Status</button>
                                <button type="button" class="mpd-identity-tab" data-mpd-identity-tab="story" role="tab" aria-selected="false">Story</button>
                            </div>

                            <div class="mpd-identity-tab-panel" id="mpd-identity-panel-basics" data-mpd-identity-panel="basics">
                                <section class="member-profile-dashboard__card" id="mpd-overview">
                                    <h2>Identity &amp; Presence</h2>
                                    <p class="studio-muted">Name, discipline, bios, and links — save when you are ready.</p>
                                    <div class="studio-field studio-field--full mpd-visibility-field mpd-visibility-source">
                                        <span>Artist profile visibility</span>
                                        <input type="hidden" id="mpd_profile_visibility" value="inactive" />
                                        <div class="mpd-visibility-toggle" role="group" aria-label="Artist profile visibility" aria-describedby="mpd_profile_visibility_hint">
                                            <button type="button" class="mpd-visibility-toggle__btn is-active" data-mpd-visibility="inactive" aria-pressed="true">Inactive</button>
                                            <button type="button" class="mpd-visibility-toggle__btn" data-mpd-visibility="private" aria-pressed="false">Private</button>
                                            <button type="button" class="mpd-visibility-toggle__btn" data-mpd-visibility="public" aria-pressed="false">Public</button>
                                        </div>
                                        <span id="mpd_profile_visibility_review_notice" class="mpd-visibility-review-notice" hidden>Submitted for review</span>
                                        <span id="mpd_profile_visibility_hint" class="mpd-field-hint">Choose <strong>Public</strong> to submit your profile for staff review.</span>
                                    </div>

                                <h3 class="mpd-identity-subhead">Name &amp; discipline</h3>
                                    <div class="studio-form-grid mpd-editorial-grid">
                                    <label class="studio-field"><span>First name</span>
                                            <input type="text" id="mpd_first_name" class="studio-input" autocomplete="given-name" placeholder="First name" />
                                    </label>
                                    <label class="studio-field"><span>Last name</span>
                                            <input type="text" id="mpd_last_name" class="studio-input" autocomplete="family-name" placeholder="Last name" />
                                    </label>
                                    <label class="studio-field studio-field--full"><span>Discipline</span>
                                            ${mpdDisciplineSelectHtml()}
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
                                ${cardFooter}
                            </section>
                        </div>

                            <div class="mpd-identity-tab-panel" id="mpd-identity-panel-status" data-mpd-identity-panel="status" hidden>
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

                            <div class="mpd-identity-tab-panel" id="mpd-identity-panel-story" data-mpd-identity-panel="story" hidden>
                            <section class="member-profile-dashboard__card mpd-story-card" id="mpd-story">
                                    <h2>Story &amp; World</h2>
                                    <p class="studio-muted mpd-story-intro">Write your own version, generate an AI version, then pick the column visitors should see. Green marks what is live on your profile — you can mix sections.</p>
                                    <div class="mpd-story-columns-head" aria-hidden="true">
                                        <span>Your words</span>
                                        <span class="mpd-story-columns-head__mid">✦</span>
                                        <span>AI version</span>
                                    </div>
                                    <p class="mpd-story-pick-summary" id="mpd_story_pick_summary" role="status" aria-live="polite"></p>
                                    <div class="mpd-story-rows">
                                        ${storyRowsHtml}
                                </div>
                                ${storyCardFooter}
                            </section>
                            </div>
                        </div>

                        <!-- ═══ WORK & PROJECTS (shell) ═══ -->
                        <div class="mpd-panel" id="mpd-panel-work" data-mpd-panel="work" hidden>
                            <section class="member-profile-dashboard__card">
                                <h2>Work &amp; Projects</h2>
                                <p class="studio-muted">Manage your portfolio, projects, and the pieces that define your practice.</p>
                                <div class="mpd-coming-soon">
                                    <p>This section is coming soon. In the meantime, your uploaded media is managed in the <button type="button" class="mpd-inline-link mpd-nav-btn" data-mpd-panel="media">Media Library</button>.</p>
                                </div>
                            </section>
                        </div>

                        <!-- ═══ JOIN FUSION UNLOCK (applicant / locked nav) ═══ -->
                        <div class="mpd-panel mpd-panel--join-unlock" id="mpd-panel-join-unlock" data-mpd-panel="join-unlock" hidden>
                            <div id="mpdJoinUnlockMount" class="mpd-join-unlock-mount" aria-live="polite"></div>
                        </div>

                        <!-- ═══ EXHIBITIONS & PROGRAMS ═══ -->
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
                                    <button type="button" class="mpd-program-tab mpd-program-tab--calendar" id="mpd-program-tab-calendar" role="tab" aria-selected="false" tabindex="-1" aria-controls="mpd-program-panel-calendar" data-mpd-program-tab="calendar" hidden aria-hidden="true">
                                        <span class="mpd-program-tab__icon" aria-hidden="true">▣</span>
                                        <span>Calendar</span>
                                    </button>
                                    <button type="button" class="mpd-program-tab mpd-program-tab--travel" id="mpd-program-tab-travel" role="tab" aria-selected="false" tabindex="-1" aria-controls="mpd-program-panel-travel" data-mpd-program-tab="travel" hidden aria-hidden="true">
                                        <span class="mpd-program-tab__icon" aria-hidden="true">✈</span>
                                        <span>Travel</span>
                                    </button>
                                    <button type="button" class="mpd-program-tab mpd-program-tab--communications" id="mpd-program-tab-communications" role="tab" aria-selected="false" tabindex="-1" aria-controls="mpd-program-panel-communications" data-mpd-program-tab="communications" hidden aria-hidden="true">
                                        <span class="mpd-program-tab__icon" aria-hidden="true">💬</span>
                                        <span>Communications</span>
                                    </button>
                                </div>

                                <div class="mpd-program-tab-panel" id="mpd-program-panel-explore" role="tabpanel" aria-labelledby="mpd-program-tab-explore" data-mpd-program-panel="explore">
                                <div class="mpd-public-programs-discovery" id="mpd_public_programs_discovery">
                                        <div class="mpd-program-credits" id="mpd_program_credits" data-mpd-credits-strip hidden aria-live="polite">
                                            <div class="mpd-program-credits__item">
                                                <span class="mpd-program-credits__icon mpd-program-credits__icon--app" aria-hidden="true"></span>
                                                <div class="mpd-program-credits__copy">
                                                    <span class="mpd-program-credits__label">Application credits</span>
                                                    <strong class="mpd-program-credits__value" id="mpd_app_credits_value" data-mpd-credits-app>—</strong>
                                                </div>
                                            </div>
                                            <div class="mpd-program-credits__item">
                                                <span class="mpd-program-credits__icon mpd-program-credits__icon--draw" aria-hidden="true"></span>
                                                <div class="mpd-program-credits__copy">
                                                    <span class="mpd-program-credits__label" data-mpd-credits-draw-label>Program Award entries</span>
                                                    <strong class="mpd-program-credits__value" id="mpd_draw_credits_value" data-mpd-credits-draw>—</strong>
                                                </div>
                                            </div>
                                            <div class="mpd-program-credits__item mpd-program-credits__item--broadcast">
                                                <span class="mpd-program-credits__icon mpd-program-credits__icon--broadcast" aria-hidden="true"></span>
                                                <div class="mpd-program-credits__copy">
                                                    <span class="mpd-program-credits__label">Broadcast credits <button type="button" class="mpd-program-credits__info" data-mpd-broadcast-info aria-label="What are broadcast credits?">i</button></span>
                                                    <strong class="mpd-program-credits__value" data-mpd-credits-broadcast>—</strong>
                                                    <span class="mpd-program-credits__hint" data-mpd-credits-broadcast-hint></span>
                                                    <button type="button" class="mpd-program-credits__redeem-btn" data-mpd-broadcast-redeem hidden>VIEW OPTIONS &#8594;</button>
                                                </div>
                                            </div>
                                            <div class="mpd-program-credits__item mpd-program-credits__item--invites">
                                                <span class="mpd-program-credits__icon mpd-program-credits__icon--invites" aria-hidden="true"></span>
                                                <div class="mpd-program-credits__copy">
                                                    <span class="mpd-program-credits__label">Member invites</span>
                                                    <strong class="mpd-program-credits__value" data-mpd-credits-invites>—</strong>
                                                    <span class="mpd-program-credits__hint" data-mpd-credits-invites-hint>invites available</span>
                                                    <button type="button" class="mpd-program-credits__invite-btn" data-mpd-invite-member>Invite member &#8594;</button>
                                                </div>
                                            </div>
                                            <div class="mpd-program-credits__footer-row" data-mpd-credits-footer>
                                                <span class="mpd-program-credits__icon mpd-program-credits__icon--next" aria-hidden="true"></span>
                                                <span class="mpd-program-credits__label">Next credits</span>
                                                <strong class="mpd-program-credits__value" id="mpd_credits_next_date" data-mpd-credits-next>—</strong>
                                                <span class="mpd-program-credits__hint" id="mpd_credits_next_hint" data-mpd-credits-next-hint></span>
                                            </div>
                                        </div>
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

                                <div class="mpd-program-tab-panel" id="mpd-program-panel-calendar" role="tabpanel" aria-labelledby="mpd-program-tab-calendar" data-mpd-program-panel="calendar" hidden>
                                    <div id="mpd_program_calendar_workspace" class="mpd-program-calendar-workspace" aria-live="polite">
                                        <div class="mpd-program-placeholder">
                                            <h3>Calendar</h3>
                                            <p class="studio-muted">Your program calendar appears when a slot-secured program has its schedule live.</p>
                                        </div>
                                    </div>
                                </div>

                                <div class="mpd-program-tab-panel" id="mpd-program-panel-travel" role="tabpanel" aria-labelledby="mpd-program-tab-travel" data-mpd-program-panel="travel" hidden>
                                    <div id="mpd_program_travel_workspace" aria-live="polite">
                                        <div class="mpd-program-placeholder">
                                            <h3>Travel</h3>
                                            <p class="studio-muted">Flight details and travel preparation will appear here once your slot is confirmed.</p>
                                        </div>
                                    </div>
                                </div>

                                <div class="mpd-program-tab-panel" id="mpd-program-panel-communications" role="tabpanel" aria-labelledby="mpd-program-tab-communications" data-mpd-program-panel="communications" hidden>
                                    <div id="mpd_program_comms_workspace" aria-live="polite">
                                        <div class="mpd-program-placeholder">
                                            <h3>Communications</h3>
                                            <p class="studio-muted">Program chat rooms appear here when Fusion publishes a LINE invite for a program you are confirmed on.</p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <!-- ═══ MEDIA LIBRARY ═══ -->
                        <div class="mpd-panel" id="mpd-panel-media" data-mpd-panel="media" hidden>
                            <section class="member-profile-dashboard__card" id="mpd-media-library">
                                <h2>Media Library</h2>
                                <p class="studio-muted">Main artwork, profile card, intro gallery, and audio — all in one place.</p>

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
                                                <span class="mpd-media-placeholder mpd-media-placeholder--detailed" aria-hidden="true">
                                                    <strong>Add Artwork</strong>
                                                    <small>5:4 ratio &middot; ~1200 &times; 960px<br/>JPG or JPEG &middot; Max 1 MB</small>
                                                </span>
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
                                                    <span class="mpd-media-placeholder mpd-media-placeholder--detailed" aria-hidden="true">
                                                        <strong>Add Portrait</strong>
                                                        <small>3:4 ratio &middot; ~600 &times; 800px<br/>JPG or JPEG &middot; Max 1 MB</small>
                                                    </span>
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
                                <blockquote class="mpd-audio-inspiration" id="mpd_audio_inspiration">\u201CWords mean more than what is set down on paper. It takes the human voice to infuse them with deeper meaning.\u201D \u2014 Maya Angelou</blockquote>
                                <p class="studio-muted mpd-media-helper">Choose a file or record up to 3 minutes with your microphone. Preview the clip, then save it to your collection. You can delete a selection before saving, or replace a saved bite. A title is required. Staff may approve clips for your public profile and/or for full-site play (sound environment and other site audio rows).</p>
                                <p class="studio-muted mpd-media-helper mpd-audio-eligibility-notice">Audio without background noise or music may be eligible to play throughout the site after staff approval. Other audio stays on your public profile page only.</p>
                                <input type="hidden" id="mpd_audio_url" value="" />
                                <input type="file" id="mpd_audio_file" class="mpd-file-input-hidden" accept="audio/*" />
                                <div class="mpd-audio-actions" id="mpd_audio_actions">
                                    <label for="mpd_audio_file" class="mpd-upload-btn" id="mpd_audio_file_label">Choose audio file</label>
                                    <button type="button" class="mpd-upload-btn mpd-audio-record-btn" id="mpd_audio_record_open">Record audio</button>
                                </div>
                                <label class="studio-field studio-field--full"><span>Audio title <span class="mpd-required-mark" aria-hidden="true">*</span></span>
                                    <input type="text" id="mpd_audio_title" class="studio-input" maxlength="120" placeholder="Required before save or record" />
                                </label>
                                <div id="mpd_audio_pending" class="mpd-audio-pending" hidden>
                                    <p class="mpd-audio-pending__kicker">Preview before saving</p>
                                    <p id="mpd_audio_pending_name" class="mpd-audio-pending__name"></p>
                                    <audio id="mpd_audio_pending_player" class="mpd-audio-pending__player" controls hidden></audio>
                                    <p id="mpd_audio_pending_replace_hint" class="studio-muted mpd-audio-pending__hint" hidden></p>
                                    <div class="mpd-audio-pending__actions">
                                        <button type="button" class="mpd-upload-btn" id="mpd_audio_pending_save">Save to collection</button>
                                        <button type="button" class="mpd-upload-btn mpd-audio-record-btn" id="mpd_audio_pending_replace">Replace file</button>
                                        <button type="button" class="mpd-audio-pending-discard" id="mpd_audio_pending_discard">Delete selection</button>
                                    </div>
                                </div>
                                <p id="mpd_audio_approval_status" class="mpd-audio-approval-status" hidden></p>
                                <div id="mpd_audio_collection" class="mpd-audio-collection"></div>
                                <p class="studio-muted mpd-audio-count" id="mpd_audio_count" hidden></p>
                                </div>
                                ${cardFooter}
                            </section>
                        </div>

                        <!-- ═══ JOURNAL / NOTES (shell) ═══ -->
                        <div class="mpd-panel" id="mpd-panel-journal" data-mpd-panel="journal" hidden>
                            <section class="member-profile-dashboard__card">
                                <h2>Journal / Notes</h2>
                                <p class="studio-muted">Creative journal entries, reflections, and notes from your practice.</p>
                                <div class="mpd-coming-soon">
                                    <p>This section is coming soon. Your journal entries will appear here once the feature is available.</p>
                                </div>
                            </section>
                        </div>

                        <!-- ═══ PROFILE PREVIEW (shell) ═══ -->
                        <div class="mpd-panel" id="mpd-panel-preview" data-mpd-panel="preview" hidden>
                            <section class="member-profile-dashboard__card">
                                <h2>Profile Preview</h2>
                                <p class="studio-muted">See how visitors experience your public profile.</p>
                                <div class="mpd-coming-soon">
                                    <p>A live preview of your public profile will appear here. For now, you can <a id="mpd_preview_public_link" href="#" target="_blank" rel="noopener noreferrer">view your public profile</a> directly.</p>
                                </div>
                            </section>
                        </div>

                        <!-- ═══ SETTINGS (membership + account) ═══ -->
                        <div class="mpd-panel" id="mpd-panel-settings" data-mpd-panel="settings" hidden>
                            <section class="member-profile-dashboard__card mpd-membership-card" id="mpd-membership-section">
                                <h2>Membership</h2>
                                <p class="studio-muted">
                                    Manage your subscription, view billing details, and update your membership.
                                </p>
                                <p id="mpd_membership_error" class="mpd-membership-inline-error" role="alert" hidden></p>
                                <p id="mpd_membership_plan_updated" class="mpd-membership-plan-updated" role="status" hidden></p>
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
                                        <span class="studio-muted mpd-membership-legacy-note" id="mpd_membership_plan_legacy_note" hidden></span>
                                        <span class="studio-muted" id="mpd_membership_credit_balance" hidden></span>
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
                                    <div class="mpd-membership-manage-card" id="mpd_membership_manage_wrap">
                                        <h3 class="mpd-membership-subh">Manage membership</h3>
                                        <p class="studio-muted">
                                            Plan changes take effect on your next billing cycle. If you cancel, access
                                            continues until the end of your current period.
                                        </p>
                                        <button
                                            type="button"
                                            class="mpd-membership-action-row mpd-membership-action-row--plan"
                                            id="mpd_membership_change_plan_btn"
                                        >
                                            <span class="mpd-membership-action-row__icon mpd-membership-action-row__icon--plan" aria-hidden="true"></span>
                                            <span class="mpd-membership-action-row__main">
                                                <strong>Change plan</strong>
                                                <span class="studio-muted">Switch to Monthly, Quarterly, or Annual.</span>
                                            </span>
                                            <span class="mpd-membership-action-row__chev" aria-hidden="true"></span>
                                        </button>
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
                        <p id="mpdSaveChoiceTranslateNote" class="mpd-save-choice-modal__note" hidden></p>
                        <p id="mpdSaveChoiceProgress" class="mpd-save-choice-modal__progress" role="status" aria-live="polite" hidden>
                            <span class="mpd-save-choice-modal__spinner" aria-hidden="true"></span>
                            <span id="mpdSaveChoiceProgressLabel">Saving your profile…</span>
                        </p>
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
                <div
                    id="mpdMembershipChangePlanModal"
                    class="profile-gallery-access-modal mpd-membership-change-plan-modal"
                    hidden
                    aria-hidden="true"
                >
                    <div class="profile-gallery-access-modal__scrim" aria-hidden="true"></div>
                    <div
                        class="profile-gallery-access-modal__panel mpd-membership-change-plan-modal__panel"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="mpdMembershipChangePlanTitle"
                    >
                        <h2 id="mpdMembershipChangePlanTitle" class="profile-gallery-access-modal__title">
                            Change plan
                        </h2>
                        <p class="studio-muted mpd-membership-change-plan-modal__lead">
                            Changes take effect on your next billing cycle.
                        </p>
                        <p id="mpdMembershipChangePlanError" class="mpd-membership-inline-error" role="alert" hidden></p>
                        <div
                            id="mpdMembershipChangePlanOptions"
                            class="mpd-membership-change-plan-options"
                            role="radiogroup"
                            aria-labelledby="mpdMembershipChangePlanTitle"
                        ></div>
                        <div class="mpd-membership-change-plan-modal__actions">
                            <button type="button" class="studio-btn-primary" id="mpdMembershipChangePlanConfirm">
                                Continue
                            </button>
                            <button
                                type="button"
                                class="profile-gallery-access-modal__close"
                                id="mpdMembershipChangePlanCancel"
                            >
                                Cancel
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
  document.querySelectorAll("#mpdMembershipChangePlanModal").forEach((m) => {
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
  wireMpdMembershipChangePlanModal();

  window.addEventListener("fusion-localechange", () => {
    document.querySelectorAll("[data-mpd-i18n]").forEach((el) => {
      const key = el.getAttribute("data-mpd-i18n");
      if (key) el.textContent = mpdLabel(key);
    });
    const heading = document.getElementById("settingsProfileHeading");
    if (heading) heading.textContent = mpdLabel("your-studio");
  });

  /** @type {'en'|'ja'} Internal canonical form locale; public locales are generated on save. */
  const activeLocale = PROFILE_EDIT_LOCALE;
  /** @type {Record<string, unknown> | null} */
  let localesState = null;
  let heroImageUrl = "";
  let heroProfileImageUrl = "";
  let heroImageCleared = false;
  let heroProfileImageCleared = false;
  let profileAudioUrl = "";
  const mpdPendingAudioStore = new Map();
  /** @type {File | null} */
  let mpdPendingAudioFile = null;
  let mpdPendingReplaceUrl = "";
  let mpdPendingReplaceTitle = "";
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
  /** Restricted Applicant Studio chrome (locked nav + My programs + Join unlock). */
  let applicantStudioActive = false;
  /** needsSubscription with zero applications and zero entered draws — Join unlock primary. */
  let applicantLightGateActive = false;
  let applicationOnlyDisplayPref = readApplicationOnlyDisplayPref();
  /** @type {(() => void) | null} */
  let joinUnlockCleanup = null;
  let joinUnlockLoaded = false;

  const statusEl = document.getElementById("settingsProfileStatus");
  const formWrap = document.getElementById("settingsProfileFormWrap");
  const initialLoadingEl = document.getElementById("settingsProfileInitialLoading");
  const recoveryWrap = document.getElementById("settingsProfileAccountRecovery");
  const recoverToggle = document.getElementById("settingsProfileRecoverToggle");
  const recoverPanel = document.getElementById("settingsProfileRecoverPanel");
  const recoveryCodeInput = /** @type {HTMLInputElement | null} */ (
    document.getElementById("settingsProfileRecoveryCode")
  );
  const recoverySubmit = document.getElementById("settingsProfileRecoverySubmit");
  const recoveryStatusEl = document.getElementById("settingsProfileRecoveryStatus");
  let accountRecoveryHandlersWired = false;

  /** @param {boolean} show */
  const setAccountRecoveryVisible = (show) => {
    if (recoveryWrap instanceof HTMLElement) {
      recoveryWrap.hidden = !show;
    }
    if (!show) {
      if (recoverPanel instanceof HTMLElement) recoverPanel.hidden = true;
      if (recoveryStatusEl) recoveryStatusEl.textContent = "";
      if (recoveryCodeInput) recoveryCodeInput.value = "";
    }
  };

  const wireAccountRecoveryHandlers = () => {
    if (accountRecoveryHandlersWired) return;
    accountRecoveryHandlersWired = true;
    recoverToggle?.addEventListener("click", () => {
      if (!(recoverPanel instanceof HTMLElement)) return;
      recoverPanel.hidden = !recoverPanel.hidden;
    });
    recoverySubmit?.addEventListener("click", async () => {
      const code = recoveryCodeInput?.value?.trim() ?? "";
      if (code.replace(/\D/g, "").length !== 8) {
        if (recoveryStatusEl) {
          recoveryStatusEl.textContent = "Enter the 8-digit recovery code from support.";
        }
        return;
      }
      if (recoverySubmit instanceof HTMLButtonElement) {
        recoverySubmit.disabled = true;
        recoverySubmit.textContent = "Recovering…";
      }
      if (recoveryStatusEl) recoveryStatusEl.textContent = "";
      try {
        const result = await redeemAccountRecoveryCodeForCaller(code);
        if (!result.ok) {
          if (recoveryStatusEl) {
            recoveryStatusEl.textContent = memberFacingAccountRecoveryError(result.code);
          }
          return;
        }
        const snapAfter = await getAuthSnapshot();
        const accAfter = await getAccountForCaller();
        const contactAfter = await getMyAccountContactForCaller();
        const email =
          contactAfter && typeof contactAfter === "object" && "email" in contactAfter
            ? String(/** @type {{ email?: unknown }} */ (contactAfter).email ?? "").trim()
            : "";
        const paypalSubId = String(accAfter?.paypalSubscriptionId || "").trim();
        const principalText =
          snapAfter.authenticated && snapAfter.principal
            ? snapAfter.principal.toText()
            : result.toPrincipal;
        try {
          await syncMembershipAfterAccountRecovery({
            principal: principalText,
            email,
            paypalSubscriptionId: paypalSubId,
          });
        } catch {
          if (recoveryStatusEl) {
            recoveryStatusEl.textContent =
              "Account linked. Refreshing subscription had an issue — use Membership → Refresh subscription status if needed. Loading profile…";
          }
        }
        if (recoveryStatusEl && !recoveryStatusEl.textContent) {
          recoveryStatusEl.textContent = "Account recovered. Loading profile…";
        }
        void load({ force: true });
      } catch (e) {
        if (recoveryStatusEl) {
          recoveryStatusEl.textContent = e instanceof Error ? e.message : String(e);
        }
      } finally {
        if (recoverySubmit instanceof HTMLButtonElement) {
          recoverySubmit.disabled = false;
          recoverySubmit.textContent = "Recover";
        }
      }
    });
  };

  const setStatus = (t) => {
    if (statusEl) statusEl.textContent = t || "";
  };
  mpdWriteStatus = setStatus;

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
   * @param {{ allowConcurrent?: boolean }} [opts]
   */
  const beginMpdOperation = (key, config, opts = {}) => {
    if (activeMpdOperations.get(key)) return false;
    const profileSaveOnly =
      key === "new-world-generation" &&
      activeMpdOperations.size === 1 &&
      activeMpdOperations.has("profile-save");
    const allowConcurrent = opts.allowConcurrent === true || profileSaveOnly;
    if (!allowConcurrent && reportActiveMpdOperation()) return false;
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

  const syncMpdAudioPendingChooser = () => {
    const section = document.getElementById("mpd_audio_section");
    section?.classList.toggle("is-pending-audio", Boolean(mpdPendingAudioFile));
  };

  const clearPendingMpdAudio = () => {
    clearMpdPendingAudioPreview(document, mpdPendingAudioStore);
    mpdPendingAudioFile = null;
    mpdPendingReplaceUrl = "";
    mpdPendingReplaceTitle = "";
    const input = /** @type {HTMLInputElement | null} */ (
      document.getElementById("mpd_audio_file")
    );
    if (input) input.value = "";
    syncMpdAudioPendingChooser();
  };

  /**
   * @param {File} file
   * @param {{ replaceUrl?: string, replaceTitle?: string }} [opts]
   */
  const showPendingMpdAudio = (file, opts = {}) => {
    if (opts.replaceUrl != null) mpdPendingReplaceUrl = String(opts.replaceUrl || "");
    if (opts.replaceTitle != null) mpdPendingReplaceTitle = String(opts.replaceTitle || "");
    mpdPendingAudioFile = file;
    showMpdPendingAudioPreview(document, mpdPendingAudioStore, file, {
      replaceTitle: mpdPendingReplaceTitle,
    });
    const titleEl = /** @type {HTMLInputElement | null} */ (
      document.getElementById("mpd_audio_title")
    );
    if (titleEl && !titleEl.value.trim()) {
      const fromName = titleFromAudioFileName(file.name);
      if (fromName) titleEl.value = fromName;
    }
    syncMpdAudioPendingChooser();
  };

  const openMpdAudioFilePicker = () => {
    document.getElementById("mpd_audio_file")?.click();
  };

  const markAudioPendingApproval = () => {
    const badge = document.getElementById("mpd_audio_approval_status");
    if (!badge) return;
    badge.hidden = false;
    badge.textContent = "Pending staff approval";
    badge.classList.add("is-pending");
    badge.classList.remove("is-approved");
  };

  const savePendingMpdAudio = async () => {
    const file = mpdPendingAudioFile;
    const replaceUrl = mpdPendingReplaceUrl;
    const audioTitle = getVal("mpd_audio_title").trim();
    const saveError = pendingAudioSaveError({
      file,
      title: audioTitle,
      entryCount: mpdAudioEntryCount,
      replaceUrl,
    });
    if (saveError) {
      mpdNotifyStatus(saveError);
      if (/title/i.test(saveError)) document.getElementById("mpd_audio_title")?.focus();
      return;
    }
    if (!file) return;
    if (
      !beginMpdOperation("audio-upload", {
        operation: "Audio bite",
        detail: replaceUrl ? "Replacing audio bite" : "Uploading audio bite",
        message: replaceUrl ? "Replacing audio bite…" : "Uploading audio bite…",
        pendingMessage: replaceUrl
          ? "Still replacing audio bite..."
          : "Still uploading audio bite...",
      })
    ) {
      return;
    }
    showMpdUploadOverlay(replaceUrl ? "Replacing audio bite..." : "Uploading audio bite...");
    try {
      const url = await uploadBlobToS3(file, null, {
        area: "account/profile",
        entityType: "artist",
        entityId: currentArtistId || profileSlug || "me",
        fieldKey: uniqueAudioUploadFieldKey(),
        timeoutMs: 120000,
      });
      setVal("mpd_audio_url", url);
      profileAudioUrl = url;
      mediaUploadRevision += 1;
      if (replaceUrl) {
        await replaceMyArtistAudioEntry(replaceUrl, url, audioTitle);
      } else {
        await addMyArtistAudioEntry(url, audioTitle);
      }
      setVal("mpd_audio_title", "");
      clearPendingMpdAudio();
      markAudioPendingApproval();
      await loadMpdAudioCollection();
      finishMpdOperation(
        "audio-upload",
        "saved",
        replaceUrl
          ? "Audio bite replaced in your collection."
          : "Audio bite saved to your collection.",
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
      hideMpdUploadOverlay();
    }
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
    mpdCurrentArtistId = "";
    mpdProfileSlug = "admin-preview";
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
    setMpdMediaUploadsEnabled(true);
    if (formWrap) formWrap.removeAttribute("hidden");
  };

  /**
   * Per-section AI suggestion for the Story & World "AI version" column.
   * Uses the stored profile plus whatever is currently typed (unsaved bio edits count),
   * writes only the one section, and pre-selects the AI column for that row.
   * @param {string} field
   */
  const runMpdStorySuggest = async (field) => {
    if (!MPD_WORLD_TEXT_FIELDS.includes(/** @type {any} */ (field))) return;
    if (!localesState) return;
    if (mpdStorySuggestBusy.has(field)) return;
    if (getDataSource() === "test") {
      setStatus("AI suggestions need Live data. Connect the live backend to generate copy.");
      return;
    }
    const loader = document.querySelector(`[data-mpd-story-loader="${field}"]`);
    const label = mpdStorySectionLabel(field);
    mpdStorySuggestBusy.add(field);
    if (loader instanceof HTMLElement) {
      loader.hidden = false;
      loader.setAttribute("aria-hidden", "false");
    }
    syncMpdStoryPickUi();
    setStatus(`Writing an AI version of ${label}…`);
    try {
      const rec = await getMyArtistRecord();
      const row = mpdStoryLlmRow(artistRowFromMyArtistRecord(rec));
      if (!hasUsableWorldLlmSourceInput(row)) {
        throw new Error(
          "Add a bio, discipline, or location first — the AI needs something to work from.",
        );
      }
      const value = await suggestWorldSectionValue(field, {
        sourceJson: buildTrimmedSourceJsonForLlm(row),
        locale: activeLocale,
        reinterpret: memberReinterpretWithPrompt,
        translate: memberTranslateEnToJa,
      });
      setVal(`mpd_wn_${field}`, worldFieldToTextarea(value));
      setMpdStoryPick(field, "newWorld");
      syncMpdStoryPickUi();
      setStatus(`AI suggestion ready for ${label}. Edit it, or switch back to your words.`);
    } catch (err) {
      console.error("Story section suggestion failed.", err);
      setStatus(formatMpdStorySuggestError(err));
    } finally {
      mpdStorySuggestBusy.delete(field);
      const freshLoader = document.querySelector(`[data-mpd-story-loader="${field}"]`);
      if (freshLoader instanceof HTMLElement) {
        freshLoader.hidden = true;
        freshLoader.setAttribute("aria-hidden", "true");
      }
      syncMpdStoryPickUi();
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
   * Membership panel: billing summary + canister account fields.
   */
  const hydrateMembershipPanel = async () => {
    const errEl = document.getElementById("mpd_membership_error");
    const planUpdatedEl = document.getElementById("mpd_membership_plan_updated");
    const schedEl = document.getElementById("mpd_membership_scheduled_cancel");
    const exemptNote = document.getElementById("mpd_membership_exempt_note");
    const includedList = document.getElementById("mpd_membership_included_list");
    const manageWrap = document.getElementById("mpd_membership_manage_wrap");
    const rowBilling = document.getElementById("mpd_membership_row_billing");
    const rowPayment = document.getElementById("mpd_membership_row_payment");
    const pmUpdate = document.getElementById("mpd_membership_pm_update");
    const badge = document.getElementById("mpd_membership_badge");
    const badgeLabel = document.getElementById("mpd_membership_badge_label");
    const badgeLine = document.getElementById("mpd_membership_badge_line");
    const planName = document.getElementById("mpd_membership_plan_name");
    const planPrice = document.getElementById("mpd_membership_plan_price");
    const planLegacyNote = document.getElementById("mpd_membership_plan_legacy_note");
    const creditBalanceEl = document.getElementById("mpd_membership_credit_balance");
    const renewalDate = document.getElementById("mpd_membership_renewal_date");
    const renewalRel = document.getElementById("mpd_membership_renewal_relative");
    const pmBrand = document.getElementById("mpd_membership_pm_brand");
    const pmLast4 = document.getElementById("mpd_membership_pm_last4");
    const cancelBtn = document.getElementById("mpd_membership_cancel_btn");
    const changePlanBtn = document.getElementById("mpd_membership_change_plan_btn");

    let pendingPlanUpdated = false;
    try {
      const sp = new URLSearchParams(
        typeof window !== "undefined" ? window.location.search : "",
      );
      pendingPlanUpdated = sp.get("membershipPlanUpdated") === "1";
      if (sp.get("membershipPlanChangeCancelled") === "1") {
        mpdClearMembershipQueryFlags();
      }
    } catch {
      /* ignore */
    }

    const setBadgeVariant = (variant) => {
      if (!badge) return;
      badge.className = "mpd-membership-badge";
      if (variant === "ok") badge.classList.add("mpd-membership-badge--ok");
      else if (variant === "warn") badge.classList.add("mpd-membership-badge--warn");
      else badge.classList.add("mpd-membership-badge--muted");
    };

    const setManageControls = (canManage, disableChange = false, disableCancel = false) => {
      if (changePlanBtn instanceof HTMLButtonElement) {
        changePlanBtn.disabled = !canManage || disableChange;
      }
      if (cancelBtn instanceof HTMLButtonElement) {
        cancelBtn.disabled = !canManage || disableCancel;
      }
    };

    if (errEl) {
      errEl.hidden = true;
      errEl.textContent = "";
    }
    if (planUpdatedEl) {
      planUpdatedEl.hidden = true;
      planUpdatedEl.textContent = "";
    }
    if (schedEl) {
      schedEl.hidden = true;
      schedEl.textContent = "";
    }
    if (planLegacyNote) {
      planLegacyNote.hidden = true;
      planLegacyNote.textContent = "";
    }
    if (creditBalanceEl) {
      creditBalanceEl.hidden = true;
      creditBalanceEl.textContent = "";
    }

    if (getDataSource() === "test") {
      mpdMembershipBillingContext = {
        tier: mpdMembershipTestTier,
        subscriptionId: "test-subscription",
        provider: "test",
      };
      const copy = mpdMembershipPlanCopy(mpdMembershipTestTier);
      if (exemptNote) exemptNote.hidden = true;
      if (manageWrap) manageWrap.style.display = "";
      if (rowBilling) rowBilling.style.display = "";
      if (rowPayment) rowPayment.style.display = "";
      if (pmUpdate) pmUpdate.style.display = "";
      setBadgeVariant("ok");
      if (badgeLabel) badgeLabel.textContent = "Active";
      if (badgeLine)
        badgeLine.textContent =
          "Your membership is active and in good standing. (Test mode — sample data.)";
      if (planName) planName.textContent = copy.label;
      if (planPrice) planPrice.textContent = copy.priceLine;
      if (planLegacyNote && copy.legacyNote) {
        planLegacyNote.hidden = false;
        planLegacyNote.textContent = copy.legacyNote;
      }
      mpdRenderMembershipIncludedList(includedList, mpdMembershipTestTier, 0);
      if (renewalDate) renewalDate.textContent = "August 12, 2026";
      if (renewalRel) renewalRel.textContent = "In 28 days";
      if (pmBrand) pmBrand.textContent = "VISA";
      if (pmLast4) pmLast4.textContent = "•••• 4242";
      setManageControls(true);
      if (pendingPlanUpdated && planUpdatedEl) {
        planUpdatedEl.hidden = false;
        planUpdatedEl.textContent =
          "Plan update approved. Your new rate applies on your next renewal (August 12, 2026).";
        mpdClearMembershipQueryFlags();
      }
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
    if (manageWrap) manageWrap.style.display = "";
    if (exemptNote) exemptNote.hidden = true;

    if (exempt) {
      mpdMembershipBillingContext = null;
      if (exemptNote) {
        exemptNote.hidden = false;
        exemptNote.textContent =
          "Your membership is complimentary. Stripe billing and self-service cancellation are not required.";
      }
      if (manageWrap) manageWrap.style.display = "none";
      if (rowBilling) rowBilling.style.display = "none";
      if (rowPayment) rowPayment.style.display = "none";
      if (pmUpdate) pmUpdate.style.display = "none";
      setBadgeVariant("ok");
      if (badgeLabel) badgeLabel.textContent = "Active";
      if (badgeLine)
        badgeLine.textContent = "Your membership is active (complimentary).";
      if (planName) planName.textContent = "Fusion member";
      if (planPrice) planPrice.textContent = "—";
      mpdRenderMembershipIncludedList(includedList, "annual", 0);
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
    const paypalSubId = String(accObj?.paypalSubscriptionId || accObj?.paypal_subscription_id || "").trim();
    const paymentProvider = String(
      accObj?.paymentProvider || accObj?.payment_provider || "",
    ).toLowerCase();
    const provider =
      paypalSubId || paymentProvider === "paypal"
        ? "paypal"
        : paymentProvider === "stripe"
          ? "stripe"
          : paymentProvider || "stripe";
    const stripeSubId = mpdAccountStringField(
      accObj,
      "stripeSubscriptionId",
      "stripe_subscription_id",
    );
    const subscriptionId = paypalSubId || stripeSubId;
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
    const { fetchMemberBillingSummary, syncPayPalSubscription, getIntegrationBaseUrl } =
      integrationApi;
    const summary = await fetchMemberBillingSummary(principal, {
      subscriptionId,
      provider,
    });

    /** @type {Record<string, unknown>} */
    const s = summary && typeof summary === "object" ? summary : {};
    const ok = Boolean(s.ok);
    const statusRaw = ok && s.status != null ? String(s.status) : stripeStatus;
    const periodEnd =
      ok && typeof s.currentPeriodEnd === "string" && s.currentPeriodEnd.trim()
        ? String(s.currentPeriodEnd).trim()
        : periodCanister;
    const cancelAtEnd = ok && Boolean(s.cancelAtPeriodEnd);
    /** @type {{ brand?: string, last4?: string } | null} */
    let pm = null;
    if (ok && s.paymentMethod && typeof s.paymentMethod === "object") {
      pm = /** @type {{ brand?: string, last4?: string }} */ (s.paymentMethod);
    }

    let resolvedTier = normalizeMembershipTier(
      ok && typeof s.membershipTier === "string" ? String(s.membershipTier) : "",
    );
    if (!resolvedTier) {
      resolvedTier = normalizeMembershipTier(await getMembershipTierForCaller());
    }
    if (!resolvedTier && ok && typeof s.planId === "string" && s.planId.trim()) {
      try {
        const cfgRes = await fetch(`${getIntegrationBaseUrl()}/payments/config`);
        const cfg = cfgRes.ok ? await cfgRes.json().catch(() => ({})) : {};
        resolvedTier = membershipTierFromPlanId(String(s.planId), cfg);
      } catch {
        /* ignore */
      }
    }
    if (!resolvedTier && ok) {
      const planL = typeof s.planLabel === "string" ? s.planLabel.toLowerCase() : "";
      if (planL.includes("bi-monthly") || planL.includes("bimonthly")) {
        resolvedTier = "bimonthly";
      } else if (planL.includes("quarterly")) resolvedTier = "quarterly";
      else if (planL.includes("annual")) resolvedTier = "annual";
      else if (planL.includes("monthly")) resolvedTier = "monthly";
    }

    const tierCopy = resolvedTier ? mpdMembershipPlanCopy(resolvedTier) : null;
    const planL =
      tierCopy?.label ||
      (ok && typeof s.planLabel === "string" && s.planLabel.trim()
        ? String(s.planLabel).trim()
        : "Membership");
    const planP =
      tierCopy?.priceLine ||
      (ok && typeof s.planPriceLine === "string" && s.planPriceLine.trim()
        ? String(s.planPriceLine).trim()
        : "—");

    mpdMembershipBillingContext = {
      tier: resolvedTier || "",
      subscriptionId:
        ok && typeof s.subscriptionId === "string" && s.subscriptionId.trim()
          ? String(s.subscriptionId).trim()
          : subscriptionId,
      provider:
        ok && typeof s.provider === "string" && s.provider.trim()
          ? String(s.provider).toLowerCase()
          : provider,
    };

    let creditBalance = 0;
    if (resolvedTier === "quarterly" || resolvedTier === "annual") {
      try {
        const appCredits = await getApplicationCreditsForCaller();
        creditBalance = Number(appCredits?.balance) || 0;
      } catch {
        try {
          creditBalance = await getQuarterlyAppCreditBalanceForCaller();
        } catch {
          creditBalance = 0;
        }
      }
    }
    mpdRenderMembershipIncludedList(includedList, resolvedTier || "monthly", creditBalance);

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
        "No subscription is linked yet. If you recently paid, use Refresh subscription status or complete Join.";
      setBadgeVariant("muted");
    } else {
      setBadgeVariant("muted");
    }
    if (badgeLine) badgeLine.textContent = lineCopy;

    if (planName) planName.textContent = planL;
    if (planPrice) planPrice.textContent = planP;
    if (planLegacyNote && tierCopy?.legacyNote) {
      planLegacyNote.hidden = false;
      planLegacyNote.textContent = tierCopy.legacyNote;
    }
    if (creditBalanceEl && creditBalance > 0) {
      creditBalanceEl.hidden = false;
      creditBalanceEl.textContent = `${creditBalance} application credit${
        creditBalance === 1 ? "" : "s"
      } available`;
    }

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

      const hasSub =
        Boolean(st) ||
      Boolean(subscriptionId) ||
        (ok && typeof s.subscriptionId === "string" && s.subscriptionId.trim());
    const activeish = st === "active" || st === "trialing";
    const disableCancel =
      cancelAtEnd || st === "canceled" || st === "cancelled" || !hasSub;
    const disableChange = disableCancel || !activeish;
    setManageControls(hasSub, disableChange, disableCancel);

    if (pendingPlanUpdated) {
      if (planUpdatedEl) {
        planUpdatedEl.hidden = false;
        planUpdatedEl.textContent = `Plan update approved. Your new rate applies on your next renewal${
          periodEnd ? ` (${mpdFormatLongDate(periodEnd)})` : ""
        }.`;
      }
      mpdClearMembershipQueryFlags();
      if (mpdMembershipBillingContext.provider === "paypal" && mpdMembershipBillingContext.subscriptionId) {
        try {
          await syncPayPalSubscription({
            principal,
            subscriptionId: mpdMembershipBillingContext.subscriptionId,
          });
        } catch {
          /* panel still shows success copy */
        }
      }
    }
  };

  const validMpdPanels = () => {
    /** @type {string[]} */
    const keys = ["studio-overview", "identity", "work", "programs", "media", "journal", "preview", "settings", "join-unlock"];
    if (DEV_MODE) keys.push("dev");
    return keys;
  };

  const LOCKED_APPLICANT_PANELS = new Set([
    "studio-overview",
    "identity",
    "work",
    "media",
    "journal",
    "preview",
    "settings",
    "dev",
  ]);

  /**
   * @param {string} key
   */
  const applyMpdPanelChrome = (panelKey) => {
    const shoutEl = document.getElementById("settingsProfileShout");
    const hintEl = document.getElementById("settingsProfileHint");
    const root = document.getElementById("mpd_root");
    const allowed = new Set(validMpdPanels());
    const k = allowed.has(panelKey) ? panelKey : "studio-overview";
    const c = MPD_PANEL_CHROME[k] ?? MPD_PANEL_CHROME["studio-overview"];
    if (shoutEl) shoutEl.innerHTML = c.shoutHtml;
    if (hintEl) hintEl.textContent = c.hint;
    const joinUnlockFocus =
      k === "join-unlock" && (applicantStudioActive || applicantLightGateActive);
    root?.classList.toggle("mpd-root--join-unlock-focus", joinUnlockFocus);
  };

  const ensureJoinUnlockMounted = async () => {
    const mount = document.getElementById("mpdJoinUnlockMount");
    if (!(mount instanceof HTMLElement)) return;
    if (joinUnlockCleanup) {
      joinUnlockCleanup();
      joinUnlockCleanup = null;
    }
    const loc =
      typeof window.getLocale === "function" && window.getLocale() === "ja" ? "ja" : "en";
    let pageBundle = null;
    let flowBundle = null;
    try {
      pageBundle = await getContentBundleForStudio("join-network-page", { forStudio: false });
    } catch {
      pageBundle = null;
    }
    try {
      flowBundle = await getContentBundleForStudio("join-network-flow", { forStudio: false });
    } catch {
      flowBundle = null;
    }
    const model = buildApplicantJoinUnlockModel(pageBundle, flowBundle, loc);
    mount.innerHTML = applicantJoinUnlockHtml(model);
    joinUnlockCleanup = wireApplicantJoinUnlock(mount, {
      defaultTier: "quarterly",
      locale: loc,
      getBillingEmail: () => {
        const fromKnown = String(mpdKnownContactEmail || "").trim();
        if (fromKnown.includes("@")) return fromKnown;
        const input = document.getElementById("settingsProfileNavContactEmail");
        if (input instanceof HTMLInputElement) {
          const v = String(input.value || "").trim();
          if (v.includes("@")) return v;
        }
        return "";
      },
    });
    joinUnlockLoaded = true;
  };

  /**
   * @param {{
   *   applicantMode: boolean,
   *   lightGate: boolean,
   *   showTesterToggle: boolean,
   * }} opts
   */
  const applyApplicantStudioChrome = (opts) => {
    applicantStudioActive = !!opts.applicantMode;
    applicantLightGateActive = !!opts.lightGate;
    const root = document.getElementById("mpd_root");
    root?.classList.toggle("mpd-root--applicant-studio", applicantStudioActive || applicantLightGateActive);

    const viewProfile = document.getElementById("mpd_view_profile");
    const applyResidency = document.getElementById("mpd_apply_residency");
    const becomeMember = document.getElementById("mpd_become_member");
    const restricted = applicantStudioActive || applicantLightGateActive;
    if (viewProfile instanceof HTMLElement) viewProfile.hidden = restricted;
    if (applyResidency instanceof HTMLElement) applyResidency.hidden = restricted;
    if (becomeMember instanceof HTMLElement) becomeMember.hidden = !restricted;

    document.querySelectorAll("#settingsProfileNav .mpd-nav-btn[data-mpd-panel]").forEach((btn) => {
      if (!(btn instanceof HTMLElement)) return;
      const panel = btn.getAttribute("data-mpd-panel") || "";
      const locked = restricted && panel !== "programs" && LOCKED_APPLICANT_PANELS.has(panel);
      btn.classList.toggle("mpd-nav-btn--locked", locked);
      btn.toggleAttribute("aria-disabled", locked);
      if (locked) btn.setAttribute("title", "Become a member to unlock");
      else btn.removeAttribute("title");
    });

    const exploreTab = document.getElementById("mpd-program-tab-explore");
    const paymentsTab = document.getElementById("mpd-program-tab-payments");
    const calendarTab = document.getElementById("mpd-program-tab-calendar");
    const myTab = document.getElementById("mpd-program-tab-my-programs");
    if (exploreTab instanceof HTMLElement) exploreTab.hidden = applicantStudioActive || applicantLightGateActive;
    if (paymentsTab instanceof HTMLElement) paymentsTab.hidden = applicantStudioActive || applicantLightGateActive;
    // Calendar visibility is owned by hydrateProgramCalendarPanel (slot-secured + schedule live).
    // Do not force-hide it for applicant/tester modes — that left the tab visible-but-dead via CSS.
    if (calendarTab instanceof HTMLElement) {
      calendarTab.classList.remove("mpd-program-tab--force-hidden");
    }
    if (myTab instanceof HTMLElement) myTab.hidden = applicantLightGateActive && !applicantStudioActive;

    const toggleWrap = document.getElementById("mpdApplicationOnlyToggleWrap");
    const toggleInput = /** @type {HTMLInputElement | null} */ (
      document.getElementById("mpdApplicationOnlyToggle")
    );
    if (toggleWrap instanceof HTMLElement) {
      toggleWrap.hidden = !opts.showTesterToggle;
    }
    if (toggleInput) {
      toggleInput.checked = applicationOnlyDisplayPref;
    }

    const membershipActionsEl = document.getElementById("settingsProfileMembershipActions");
    if (restricted && membershipActionsEl) {
      membershipActionsEl.style.display = "none";
      membershipActionsEl.setAttribute("hidden", "");
    }
  };

  const showMpdPanel = (key) => {
    let requested = key;
    if (
      (applicantStudioActive || applicantLightGateActive) &&
      requested !== "programs" &&
      requested !== "join-unlock"
    ) {
      requested = "join-unlock";
    }
    if (applicantLightGateActive && requested === "programs") {
      requested = "join-unlock";
    }
    const allowed = new Set(validMpdPanels());
    const k = allowed.has(requested) ? requested : "studio-overview";
    document.querySelectorAll("#mpd_root .mpd-panel").forEach((p) => {
      const id = p.getAttribute("data-mpd-panel");
      if (!id) return;
      p.hidden = id !== k;
    });
    document.querySelectorAll("#mpd_root .mpd-nav-btn").forEach((b) => {
      const id = b.getAttribute("data-mpd-panel");
      if (!id) return;
      if ((applicantStudioActive || applicantLightGateActive) && id === "programs" && k === "programs") {
        b.classList.toggle("is-active", true);
      } else if ((applicantStudioActive || applicantLightGateActive) && k === "join-unlock") {
        b.classList.toggle("is-active", id === "programs" ? false : false);
        if (LOCKED_APPLICANT_PANELS.has(id)) b.classList.remove("is-active");
      } else {
        b.classList.toggle("is-active", id === k);
      }
    });
    applyMpdPanelChrome(k);
    closeSettingsProfileMobileNav();
    if (k === "join-unlock") void ensureJoinUnlockMounted();
    if (k === "programs" && applicantStudioActive) setMpdProgramsTab("my-programs");
    requestAnimationFrame(() => {
      const footer = document.getElementById("footer");
      if (footer) {
        footer.setAttribute("active", "true");
        const footerComp = /** @type {any} */ (footer);
        if (footerComp?.bindScrollTargets) footerComp.bindScrollTargets();
        if (footerComp?.syncFooterVisibilityFromScroll) footerComp.syncFooterVisibilityFromScroll();
        setTimeout(() => {
          if (footerComp?.syncFooterVisibilityFromScroll) footerComp.syncFooterVisibilityFromScroll();
        }, 300);
      }
    });
    if (k === "settings" && !applicantStudioActive && !applicantLightGateActive) {
      void hydrateMembershipPanel();
    }
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
        : "#studio-overview"
    )
      .replace(/^#/, "")
      .toLowerCase();
    /** @type {Record<string, string>} */
    const legacy = {
      "overview": "studio-overview",
      "mpd-overview": "studio-overview",
      "mpd-media": "media",
      "mpd-basics": "identity",
      "location": "identity",
      "mpd-story": "identity",
      "story": "identity",
      "mpd-links": "identity",
      "mpd-seo": "studio-overview",
      "mpd-programs": "programs",
      travel: "programs",
      "programs-travel": "programs",
      calendar: "programs",
      "programs-calendar": "programs",
      "calendar-download": "programs",
      "programs-calendar-download": "programs",
      "mpd-membership": "settings",
      "membership": "settings",
      "mpd-dev": "dev",
    };
    h = legacy[h] || h;
    const allowed = new Set(validMpdPanels());
    return allowed.has(h) ? h : "studio-overview";
  };

  const isDirty = () => {
    if (!localesState) return false;
    const draft = readMpdProfileDraftForSave();
    const cur = snapshotState(
      { draft, story: readMpdStorySaveExtras() },
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
    baselineSnapshot = snapshotState(
      { draft, story: readMpdStorySaveExtras() },
      activeLocale,
      heroImageUrl,
      vis,
      {
        profileQuote: getMpdProfileQuoteForSave(),
        audioUrl: getVal("mpd_audio_url").trim(),
        audioTitle: getVal("mpd_audio_title").trim(),
        heroProfileUrl: heroProfileImageUrl,
      },
    );
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
    if (mpdStorySuggestBusy.size > 0) {
      setStatus("Wait for the AI suggestion to finish, then save.");
      return;
    }
    pendingProfileSaveButton = fromBtn;
    openMpdSaveChoiceModal();
  };

  /**
   * @param {Element | undefined} [fromBtn]
   * @param {{ translate?: boolean, onCoreSaved?: () => void }} [options]
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
        message: translate ? "Saving & translating in background…" : "Saving in background…",
        pendingMessage: "Still saving profile...",
      })
    ) {
      return;
    }

    const draft = readMpdProfileDraftForSave();
    const capturedLocales = /** @type {Record<string, unknown>} */ (
      cloneMpdValue(localesState)
    );
    const capturedHeroUrl = getVal("mpd_hero_url").trim();
    const capturedHeroProfileUrl = getVal("mpd_hero_profile_url").trim();
    const capturedProfileQuote = getMpdProfileQuoteForSave();
    const capturedAudioUrl = getVal("mpd_audio_url").trim();
    const capturedAudioTitle = getVal("mpd_audio_title").trim();
    const capturedVisPicked = normalizeArtistRosterVisibility(
      getVal("mpd_profile_visibility").trim() || "public",
    );
    const capturedHeroCleared = heroImageCleared;
    const capturedHeroProfileCleared = heroProfileImageCleared;
    const capturedStory = readMpdStorySaveExtras();

    profileSaveInFlight = true;
    if (isStorySave) setStoryPanelAsyncBusy(true);

    const runPersist = async () => {
      /** @type {boolean} */
      let profileSaveFinished = false;
    try {
        if (getDataSource() !== "test") {
          await ensureMyLinkedArtistProfile();
        }
      const recBeforeSave = await getMyArtistRecord();
        if (!recBeforeSave) {
          throw new Error(
            "Your profile could not be loaded for saving. Refresh this page and try again.",
          );
        }
      const pBefore = recBeforeSave?.profile;
      const priorVis =
        pBefore && typeof pBefore === "object"
          ? normalizeArtistRosterVisibility(/** @type {Record<string, unknown>} */(pBefore).visibility)
            : mpdBackendRosterVisibility;

        localesState = await buildSmartProfileLocales(
          capturedLocales,
          draft,
          () => undefined,
          { translate, active: activeLocale, story: capturedStory },
      );
      const merged = normalizeLocalesWorldForStorage(
        /** @type {Record<string, unknown>} */ (localesState),
      );
      localesState = merged;
      const ts = new Date().toISOString();

        const optionalSaveWarnings = [];

        const persistTasks = [
          updateMyArtistLocalesJson(JSON.stringify(merged), ts),
        ];

        if (capturedHeroUrl || capturedHeroCleared) {
          persistTasks.push(updateMyArtistProfilePatch(capturedHeroUrl, ts));
        }
        if (capturedHeroProfileUrl || capturedHeroProfileCleared) {
          persistTasks.push(
            updateMyArtistHeroProfileImagePatch(capturedHeroProfileUrl, ts).catch((mediaErr) => {
              optionalSaveWarnings.push(
                `Profile image metadata was not saved: ${mediaErr instanceof Error ? mediaErr.message : String(mediaErr)}`,
              );
            }),
          );
        }
        persistTasks.push(
          updateMyArtistQuoteAudioPatch(
            { quote: capturedProfileQuote, audioUrl: capturedAudioUrl, audioTitle: capturedAudioTitle },
            ts,
          ).catch((mediaErr) => {
            optionalSaveWarnings.push(
              `Quote/audio metadata was not saved: ${mediaErr instanceof Error ? mediaErr.message : String(mediaErr)}`,
            );
          }),
        );

        const vis = capturedVisPicked === "public" && priorVis !== "public" ? "pending" : capturedVisPicked;
        persistTasks.push(updateMyArtistVisibility(vis, ts));

        await Promise.all(persistTasks);

        mpdBackendRosterVisibility = vis;
        setMpdVisibilityToggle(vis);
      try {
        window.dispatchEvent(
          new CustomEvent("fusion-roster-visibility-updated", { detail: { visibility: vis } }),
        );
      } catch {
        /* ignore */
      }
        heroImageUrl = capturedHeroUrl;
        heroProfileImageUrl = capturedHeroProfileUrl;
        heroImageCleared = false;
        heroProfileImageCleared = false;
        profileAudioUrl = capturedAudioUrl;
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
            const slugHref = `/profile/${encodeURIComponent(finalSlug)}`;
            if (vu && vu instanceof HTMLAnchorElement) vu.href = slugHref;
            const opc = document.getElementById("mpd_overview_profile_card");
            if (opc && opc instanceof HTMLAnchorElement) opc.href = slugHref;
        } catch (slugErr) {
          slugSaveFailed = true;
            const slugMessage = `${formatMemberProfileSaveError(slugErr)} (Other changes were saved.)`;
            finishMpdOperation("profile-save", "error", slugMessage);
            profileSaveFinished = true;
        }
      }
        fillFormFromLocales(
          /** @type {Record<string, unknown>} */ (localesState),
          activeLocale,
        );
      refreshBaseline();

      /* Profile copy is persisted — let the save sheet close before any
         optional work (media metadata warnings) surfaces. */
    try {
      options.onCoreSaved?.();
    } catch {
      /* ignore */
    }

      if (!slugSaveFailed) {
        posthog.capture("profile_settings_saved");
          if (optionalSaveWarnings.length) {
            const warnText = optionalSaveWarnings.join(" ");
            const warnMessage = `Profile saved, but some media did not persist: ${warnText}`;
            setStatus(warnMessage);
            finishMpdOperation("profile-save", "saved", warnMessage);
          } else {
            finishMpdOperation("profile-save", "saved", "Profile saved.");
          }
          profileSaveFinished = true;
            dispatchProfileSaveStatus("saved", "Profile saved", {
              operation: "Profile",
              detail: "All changes saved",
            });
        if (isStorySave) flashMpdStorySaveOk();
      }
    } catch (e) {
        finishMpdOperation("profile-save", "error", formatMemberProfileSaveError(e));
        profileSaveFinished = true;
    } finally {
        profileSaveInFlight = false;
        if (!profileSaveFinished && activeMpdOperations.has("profile-save")) {
          finishMpdOperation("profile-save", "error", "Profile save did not complete. Try again.");
        }
      if (isStorySave) setStoryPanelAsyncBusy(false);
    }
  };

    return runPersist();
  };

  const updateHeroPreview = (forceFresh = false) => {
    const u = getVal("mpd_hero_url").trim();
    const heroPrev = /** @type {HTMLImageElement | null} */ (
      document.getElementById("mpd_hero_preview")
    );
    if (!heroPrev) return;
    setMpdMediaSurfaceStateOnPage("hero", {
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
      setMpdMediaSurfaceStateOnPage("hero", {
        hasMedia: Boolean(getVal("mpd_hero_url").trim()),
        hasPreview: false,
      });
      mpdNotifyStatus("Preview could not load. Save and refresh, or try another image.");
      heroPrev.removeAttribute("src");
      heroPrev.style.display = "none";
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
    setMpdMediaSurfaceStateOnPage("heroProfile", {
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
      setMpdMediaSurfaceStateOnPage("heroProfile", {
        hasMedia: Boolean(getVal("mpd_hero_profile_url").trim()),
        hasPreview: false,
      });
      mpdNotifyStatus("Preview could not load. Save and refresh, or try another image.");
      prev.removeAttribute("src");
      prev.style.display = "none";
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
      heroImageCleared = true;
      mediaUploadRevision += 1;
      updateHeroPreview();
      updateHeroProfilePreview();
      setStatus("Hero image removed. Save to apply this change.");
      return;
    }
    if (key === "heroProfile") {
      setVal("mpd_hero_profile_url", "");
      heroProfileImageUrl = "";
      heroProfileImageCleared = true;
      mediaUploadRevision += 1;
      updateHeroProfilePreview();
      setStatus("Profile image removed. Save to apply this change.");
      return;
    }
    const introMatch = /^intro-(\d+)$/.exec(key);
    if (introMatch) {
      const i = Number(introMatch[1]);
      if (!Number.isInteger(i) || i < 0 || i > 2) return;
      mpdRevokeLocalPreview(`intro-${i}`);
      setVal(`mpd_intro_${i}_src`, "");
      setVal(`mpd_intro_${i}_alt`, "");
      setVal(`mpd_intro_${i}_caption`, "");
      mediaUploadRevision += 1;
      setIntroSpinnerVisible(i, false);
      setMpdMediaSurfaceStateOnPage(`intro-${i}`, { hasMedia: false, hasPreview: false });
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

  const FUSION_QUOTES = [
    { quote: "Every artist was first an amateur.", note: "Clarity attracts connection. Shape your presence with intention." },
    { quote: "Art is not what you see, but what you make others see.", note: "Your profile is the bridge between your practice and the world." },
    { quote: "The earth has music for those who listen.", note: "Let your creative voice resonate through every detail." },
    { quote: "Creativity takes courage.", note: "Share your work boldly — your perspective matters." },
    { quote: "To create is to bring something into being.", note: "Every section you complete brings your studio closer to life." },
  ];

  const syncOverviewPreview = () => {
    const nameEl = document.getElementById("mpd_overview_preview_name");
    const discEl = document.getElementById("mpd_overview_preview_discipline");
    const locEl = document.getElementById("mpd_overview_preview_location");
    const imgEl = document.getElementById("mpd_overview_preview_img");
    const linkEl = document.getElementById("mpd_overview_view_profile");
    const firstName = getVal("mpd_first_name").trim();
    const lastName = getVal("mpd_last_name").trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || "—";
    if (nameEl) nameEl.textContent = fullName;
    const discSel = /** @type {HTMLSelectElement | null} */ (document.getElementById("mpd_discipline"));
    if (discEl && discSel) discEl.textContent = discSel.options[discSel.selectedIndex]?.text || "—";
    const city = getVal("mpd_loc_city").trim();
    const country = getVal("mpd_loc_country").trim();
    const loc = [city, country].filter(Boolean).join(", ") || "—";
    if (locEl) locEl.textContent = loc;
    const heroUrl = getVal("mpd_hero_profile_url").trim() || getVal("mpd_hero_url").trim();
    if (imgEl) {
      if (heroUrl) {
        imgEl.innerHTML = `<img src="${mpdEscapeAttr(heroUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;" />`;
      } else {
        imgEl.innerHTML = `<span style="display:grid;place-items:center;width:100%;height:100%;color:rgba(15,23,42,0.3);font-size:0.8rem;text-transform:uppercase">No image</span>`;
      }
    }
    const profileLink = document.getElementById("mpd_view_profile");
    if (linkEl && profileLink) linkEl.setAttribute("href", profileLink.getAttribute("href") || "#");
    const previewPanelLink = document.getElementById("mpd_preview_public_link");
    if (previewPanelLink && profileLink) previewPanelLink.setAttribute("href", profileLink.getAttribute("href") || "#");
  };

  const syncMpdVisibilityUi = (vis) => {
    document.querySelectorAll("[data-mpd-visibility]").forEach((b) => {
      const v = b.getAttribute("data-mpd-visibility");
      b.classList.toggle("is-active", v === vis);
      b.setAttribute("aria-pressed", v === vis ? "true" : "false");
    });
    setVal("mpd_profile_visibility", vis);
    const overviewSel = /** @type {HTMLSelectElement | null} */ (document.getElementById("mpd_overview_visibility"));
    if (overviewSel) overviewSel.value = vis;
    const reviewNotice = document.getElementById("mpd_profile_visibility_review_notice");
    const overviewReview = document.getElementById("mpd_overview_visibility_review");
    const isPending = mpdBackendRosterVisibility === "pending";
    if (reviewNotice) reviewNotice.hidden = !isPending;
    if (overviewReview) overviewReview.hidden = !isPending;
  };

  const computeCompletion = () => {
    const steps = {
      identity: false,
      work: false,
      programs: false,
      media: false,
      preview: false,
    };
    const firstName = getVal("mpd_first_name").trim();
    const lastName = getVal("mpd_last_name").trim();
    const bio = getVal("mpd_bio").trim();
    const disc = getVal("mpd_discipline").trim();
    steps.identity = Boolean(firstName && lastName && bio && disc);
    const heroUrl = getVal("mpd_hero_url").trim();
    steps.work = Boolean(heroUrl);
    steps.programs = true;
    const profileImg = getVal("mpd_hero_profile_url").trim() || getVal("mpd_hero_url").trim();
    steps.media = Boolean(profileImg);
    steps.preview = Boolean(firstName && heroUrl);
    return steps;
  };

  const syncCompletionTrack = () => {
    const steps = computeCompletion();
    const order = ["identity", "work", "programs", "media", "preview"];
    const total = order.length;
    const done = order.filter((k) => steps[k]).length;
    const pct = Math.round((done / total) * 100);
    const fill = document.getElementById("mpd_completion_fill");
    if (fill) fill.style.width = `${pct}%`;
    const pctEl = document.getElementById("mpd_completion_pct");
    if (pctEl) pctEl.textContent = `${pct}% complete`;
    const pill = document.getElementById("mpd_completion_pill");
    if (pill) {
      const remaining = total - done;
      pill.textContent =
        pct >= 100
          ? "Profile Complete"
          : remaining === 1
            ? "1 section to complete"
            : `${remaining} sections to complete`;
      pill.classList.toggle("mpd-completion-pill--complete", pct >= 100);
    }
    let foundInProgress = false;
    order.forEach((key, idx) => {
      const el = document.querySelector(`.mpd-completion-step[data-step="${key}"]`);
      if (!el) return;
      const complete = Boolean(steps[key]);
      const inProgress = !complete && !foundInProgress;
      if (inProgress) foundInProgress = true;
      el.classList.toggle("is-complete", complete);
      el.classList.toggle("is-active", inProgress);
      el.classList.toggle("is-pending", !complete && !inProgress);
      const marker = el.querySelector(".mpd-completion-step__marker");
      if (marker) marker.textContent = complete ? "✓" : String(idx + 1);
      const status = el.querySelector(".mpd-completion-step__status");
      if (status) {
        status.textContent = complete
          ? "Complete"
          : inProgress
            ? "In progress"
            : "Not started";
      }
    });
  };

  const syncBlindspots = () => {
    const grid = document.getElementById("mpd_blindspots_grid");
    if (!grid) return;
    const suggestions = [];
    if (!getVal("mpd_hero_url").trim()) suggestions.push({ title: "Add main artwork", panel: "media", icon: warningIconUrl });
    if (!getVal("mpd_hero_profile_url").trim()) suggestions.push({ title: "Add profile image", panel: "media", icon: warningIconUrl });
    if (!getVal("mpd_bio").trim()) suggestions.push({ title: "Write your bio", panel: "identity", icon: warningIconUrl });
    if (!getVal("mpd_loc_city").trim()) suggestions.push({ title: "Set location", panel: "identity", tab: "status", icon: warningIconUrl });
    if (!getVal("mpd_audio_url").trim()) suggestions.push({ title: "Add audio bite", panel: "media", icon: warningIconUrl });
    const shown = suggestions.slice(0, 5);
    if (!shown.length) {
      grid.innerHTML = `<p class="studio-muted" style="grid-column:1/-1;text-align:center;padding:1rem 0">Looking good — no blindspots detected.</p>`;
      return;
    }
    grid.innerHTML = shown.map((s) => `
      <div class="mpd-blindspot-card mpd-nav-btn" data-mpd-panel="${mpdEscapeAttr(s.panel)}"${s.tab ? ` data-mpd-identity-tab-target="${mpdEscapeAttr(s.tab)}"` : ""}>
        <img src="${mpdEscapeAttr(s.icon)}" alt="" class="mpd-blindspot-card__icon" />
        <strong class="mpd-blindspot-card__title">${mpdEscapeAttr(s.title)}</strong>
        <span class="mpd-blindspot-card__link">IMPROVE &rarr;</span>
      </div>
    `).join("");
  };

  const rotateQuote = () => {
    const idx = Math.floor(Math.random() * FUSION_QUOTES.length);
    const q = FUSION_QUOTES[idx];
    const el = document.getElementById("mpd_quote_text");
    if (el) {
      el.innerHTML = `<em>${mpdEscapeAttr(q.quote)}</em><span>${mpdEscapeAttr(q.note)}</span>`;
    }
  };

  const syncStudioOverview = () => {
    syncOverviewPreview();
    syncCompletionTrack();
    syncBlindspots();
    rotateQuote();
    void hydrateExploreProgramCredits();
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
        if (k) {
          if (isDirty() && !confirm("You have unsaved changes. Continue without saving?")) return;
          showMpdPanel(k);
        }
        return;
      }
      const identityTab =
        e.target && /** @type {Element} */ (e.target).closest?.("[data-mpd-identity-tab]");
      if (identityTab && rootEl.contains(identityTab)) {
        e.preventDefault();
        const tabKey = identityTab.getAttribute("data-mpd-identity-tab") || "basics";
        document.querySelectorAll("#mpd_root .mpd-identity-tab").forEach((t) => {
          const tk = t.getAttribute("data-mpd-identity-tab");
          t.classList.toggle("is-active", tk === tabKey);
          t.setAttribute("aria-selected", tk === tabKey ? "true" : "false");
        });
        document.querySelectorAll("#mpd_root .mpd-identity-tab-panel").forEach((p) => {
          const pk = p.getAttribute("data-mpd-identity-panel");
          p.hidden = pk !== tabKey;
        });
        return;
      }
      const overviewPublishSave = e.target && /** @type {Element} */ (e.target).closest?.("#mpd_overview_publish_save");
      if (overviewPublishSave && rootEl.contains(overviewPublishSave)) {
        e.preventDefault();
        const sel = /** @type {HTMLSelectElement | null} */ (document.getElementById("mpd_overview_visibility"));
        if (sel) {
          const newVis = sel.value;
          void import("../utils/database.js").then(async (db) => {
            try {
              await db.updateMyArtistVisibility(newVis, new Date().toISOString());
              mpdBackendRosterVisibility = /** @type {any} */ (newVis);
              setStatus("Visibility updated.");
              syncMpdVisibilityUi(newVis);
            } catch (err) {
              setStatus("Failed to update visibility.");
            }
          });
        }
        return;
      }
      const audioChooseLabel =
        e.target && /** @type {Element} */ (e.target).closest?.("#mpd_audio_file_label");
      if (audioChooseLabel && rootEl.contains(audioChooseLabel)) {
        mpdPendingReplaceUrl = "";
        mpdPendingReplaceTitle = "";
      }
      const pendingSaveBtn =
        e.target && /** @type {Element} */ (e.target).closest?.("#mpd_audio_pending_save");
      if (pendingSaveBtn && rootEl.contains(pendingSaveBtn)) {
        e.preventDefault();
        void savePendingMpdAudio();
        return;
      }
      const pendingReplaceBtn =
        e.target && /** @type {Element} */ (e.target).closest?.("#mpd_audio_pending_replace");
      if (pendingReplaceBtn && rootEl.contains(pendingReplaceBtn)) {
        e.preventDefault();
        openMpdAudioFilePicker();
        return;
      }
      const pendingDiscardBtn =
        e.target && /** @type {Element} */ (e.target).closest?.("#mpd_audio_pending_discard");
      if (pendingDiscardBtn && rootEl.contains(pendingDiscardBtn)) {
        e.preventDefault();
        clearPendingMpdAudio();
        mpdNotifyStatus("Selection deleted. Choose another file or record.");
        return;
      }
      const audioEntryBtn =
        e.target && /** @type {Element} */ (e.target).closest?.("[data-action]");
      if (audioEntryBtn) {
        const entryEl = audioEntryBtn.closest(".mpd-audio-entry");
        const audioUrl = entryEl?.getAttribute("data-audio-url");
        const action = audioEntryBtn.getAttribute("data-action");
        if (audioUrl && action === "delete") {
          e.preventDefault();
          audioEntryBtn.disabled = true;
          removeMyArtistAudioEntry(audioUrl)
            .then(() => loadMpdAudioCollection())
            .catch((err) => {
              setStatus(`Delete failed: ${err instanceof Error ? err.message : String(err)}`);
              audioEntryBtn.disabled = false;
            });
          return;
        }
        if (audioUrl && action === "replace") {
          e.preventDefault();
          mpdPendingReplaceUrl = audioUrl;
          mpdPendingReplaceTitle = entryEl?.getAttribute("data-audio-title") || "";
          const titleField = /** @type {HTMLInputElement | null} */ (
            document.getElementById("mpd_audio_title")
          );
          if (titleField && mpdPendingReplaceTitle && !titleField.value.trim()) {
            titleField.value = mpdPendingReplaceTitle;
          }
          mpdNotifyStatus(
            "Choose a new audio file to preview, then save to replace this bite.",
          );
          openMpdAudioFilePicker();
          return;
        }
        if (audioUrl && action === "highlight") {
          e.preventDefault();
          audioEntryBtn.disabled = true;
          setMyArtistHighlightAudio(audioUrl)
            .then(() => loadMpdAudioCollection())
            .catch((err) => {
              setStatus(`Highlight failed: ${err instanceof Error ? err.message : String(err)}`);
              audioEntryBtn.disabled = false;
            });
          return;
        }
        if (action === "review-info") {
          e.preventDefault();
          const noteUrl = entryEl?.getAttribute("data-audio-url") ?? '';
          const match = mpdAssetReviewNotes.audioEntries.find(([k]) => k.endsWith('|' + noteUrl));
          if (match) openMpdReviewNotePopup(match[1]);
          return;
        }
      }
      const recordOpen =
        e.target && /** @type {Element} */ (e.target).closest?.("#mpd_audio_record_open");
      if (recordOpen && rootEl.contains(recordOpen)) {
        e.preventDefault();
        if (!getVal("mpd_audio_title").trim()) {
          setStatus("Add an audio title before recording.");
          document.getElementById("mpd_audio_title")?.focus();
          return;
        }
        clearPendingMpdAudio();
        openMpdAudioCaptureModal({
          artistId: currentArtistId,
          slug: profileSlug,
          onCaptured: ({ url, title }) => {
            const audioTitle =
              String(title || "").trim() || getVal("mpd_audio_title").trim();
            if (!audioTitle) {
              setStatus("Add an audio title before recording.");
              document.getElementById("mpd_audio_title")?.focus();
              return;
            }
            profileAudioUrl = url;
            mediaUploadRevision += 1;
            addMyArtistAudioEntry(url, audioTitle)
              .then(() => {
                setVal("mpd_audio_title", "");
                return loadMpdAudioCollection();
              })
              .catch((err) => console.error("Failed to add audio entry", err));
            setStatus("Recording uploaded and added to your collection.");
          },
        });
        return;
      }
      const programTab =
        e.target &&
        /** @type {Element} */ (e.target).closest?.("[data-mpd-program-tab]");
      if (programTab && rootEl.contains(programTab)) {
        e.preventDefault();
        if (!mpdProgramTabIsAvailable(programTab)) return;
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
          const ok = window.confirm(
            "Withdraw this application? Application credits are not refunded. You can then enter the Program Draw for this program if it is open.",
          );
          if (!ok || !programId) return;
          void (async () => {
            try {
              await withdrawMyProgramApplication(programId);
              const fresh = await getMyArtistRecord();
              if (fresh) {
                const locales = mpdObject(fresh.locales ?? fresh.localesJson);
                const active =
                  typeof window.getLocale === "function" && window.getLocale() === "ja"
                    ? "ja"
                    : "en";
                await hydrateProgramsPanel(fresh, locales, active);
              }
              window.alert("Application withdrawn. Application credits were not refunded.");
            } catch (err) {
              window.alert(
                err instanceof Error ? err.message : "Could not withdraw this application.",
              );
            }
          })();
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
      const storySuggestBtn =
        e.target &&
        /** @type {Element} */ (e.target).closest?.("[data-mpd-suggest-field]");
      if (storySuggestBtn && rootEl.contains(storySuggestBtn)) {
        e.preventDefault();
        void runMpdStorySuggest(storySuggestBtn.getAttribute("data-mpd-suggest-field") || "");
        return;
      }
      const storyColumn =
        e.target &&
        /** @type {Element} */ (e.target).closest?.("[data-mpd-story-column]");
      if (storyColumn && rootEl.contains(storyColumn)) {
        const storyRow = storyColumn.closest("[data-mpd-story-field]");
        const storyField = storyRow ? storyRow.getAttribute("data-mpd-story-field") || "" : "";
        if (storyField && MPD_WORLD_TEXT_FIELDS.includes(/** @type {any} */ (storyField))) {
          setMpdStoryPick(
            storyField,
            storyColumn.getAttribute("data-mpd-story-column") === "world" ? "world" : "newWorld",
          );
          syncMpdStoryPickUi();
        }
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
        (el) => mpdProgramTabIsAvailable(el),
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
        if (!mpdImageUploadReady(t)) return;
        const raw = t.files[0];
        let f = raw;
        try {
          f = await mpdPrepareImageFile(raw);
        } catch (err) {
          mpdNotifyStatus(err instanceof Error ? err.message : String(err));
          t.value = "";
          return;
        }
        showMpdLocalImagePreview("hero", f);
        if (
          !beginMpdOperation("hero-upload", {
            operation: "Main artwork",
            detail: "Uploading main artwork",
            message: "Uploading main artwork…",
            pendingMessage: "Still uploading main artwork...",
          })
        ) {
          mpdFailImagePreview("hero");
          mpdNotifyStatus("Another upload is in progress. Wait for it to finish, then try again.");
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
            timeoutMs: 60000,
          });
          setVal("mpd_hero_url", url);
          heroImageUrl = url;
          heroImageCleared = false;
          mediaUploadRevision += 1;
          mpdRevokeLocalPreview("hero");
          updateHeroPreview(true);
          updateHeroProfilePreview(true);
          finishMpdOperation(
            "hero-upload",
            "saved",
            "Main artwork uploaded. Save to apply this change.",
          );
        } catch (err) {
          mpdRevokeLocalPreview("hero");
          setHeroSpinnerVisible(false);
          updateHeroPreview(true);
          updateHeroProfilePreview(true);
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
        if (!mpdImageUploadReady(t)) return;
        const raw = t.files[0];
        let f = raw;
        try {
          f = await mpdPrepareImageFile(raw);
        } catch (err) {
          mpdNotifyStatus(err instanceof Error ? err.message : String(err));
          t.value = "";
          return;
        }
        showMpdLocalImagePreview("heroProfile", f);
        if (
          !beginMpdOperation("hero-profile-upload", {
            operation: "Profile card",
            detail: "Uploading profile card",
            message: "Uploading profile card…",
            pendingMessage: "Still uploading profile card...",
          })
        ) {
          mpdFailImagePreview("heroProfile");
          mpdNotifyStatus("Another upload is in progress. Wait for it to finish, then try again.");
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
            timeoutMs: 60000,
          });
          setVal("mpd_hero_profile_url", url);
          heroProfileImageUrl = url;
          heroProfileImageCleared = false;
          mediaUploadRevision += 1;
          mpdRevokeLocalPreview("heroProfile");
          updateHeroProfilePreview(true);
          finishMpdOperation(
            "hero-profile-upload",
            "saved",
            "Profile card uploaded. Save to apply this change.",
          );
        } catch (err) {
          mpdRevokeLocalPreview("heroProfile");
          setHeroProfileSpinnerVisible(false);
          updateHeroProfilePreview(true);
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
        const check = validateAudioFile(f);
        if (!check.ok) {
          mpdNotifyStatus(check.error);
          t.value = "";
          return;
        }
        showPendingMpdAudio(f);
        t.value = "";
        mpdNotifyStatus(
          mpdPendingReplaceUrl
            ? "Preview the new file, then save to replace this bite or delete this selection."
            : "Preview your audio, then save it to your collection or delete this selection.",
        );
        return;
      }
      const slot = t.getAttribute("data-intro-slot");
      if (slot != null && t.files?.[0]) {
        if (!mpdImageUploadReady(t)) return;
        const i = Number(slot);
        const raw = t.files[0];
        let f = raw;
        try {
          f = await mpdPrepareImageFile(raw);
        } catch (err) {
          mpdNotifyStatus(err instanceof Error ? err.message : String(err));
          t.value = "";
          return;
        }
        const introKey = `intro-${i}`;
        showMpdLocalImagePreview(introKey, f);
        const introOpKey = `intro-upload-${i}`;
        const introLabel = `Introductory work ${i + 1}`;
        if (
          !beginMpdOperation(introOpKey, {
            operation: introLabel,
            detail: `Uploading ${introLabel.toLowerCase()}`,
            message: `Uploading ${introLabel.toLowerCase()}…`,
            pendingMessage: `Still uploading ${introLabel.toLowerCase()}...`,
          })
        ) {
          mpdFailImagePreview(introKey);
          mpdNotifyStatus("Another upload is in progress. Wait for it to finish, then try again.");
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
            timeoutMs: 60000,
          });
          setVal(`mpd_intro_${i}_src`, url);
          mediaUploadRevision += 1;
          mpdFinishIntroRemotePreview(introKey, url);
          finishMpdOperation(
            introOpKey,
            "saved",
            `${introLabel} uploaded. Save to apply this change.`,
          );
        } catch (err) {
          mpdFailImagePreview(introKey);
          finishMpdOperation(
            introOpKey,
            "error",
            err instanceof Error ? err.message : String(err),
          );
        } finally {
          if (activeMpdOperations.has(introOpKey)) {
            finishMpdOperation(introOpKey, "idle");
          }
          hideMpdUploadOverlay();
        }
        t.value = "";
      }
    });
    rootEl.addEventListener("input", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) return;
      if (t.classList.contains("mpd-story-input")) {
        /* Keep the row note / summary in sync with what is actually typed. */
        syncMpdStoryPickUi();
      }
      if (
        t.id === "mpd_first_name" ||
        t.id === "mpd_last_name"
      ) {
        updateHeroProfileCardCopy();
      }
    });
    rootEl.addEventListener("change", (e) => {
      const t = e.target;
      if (t instanceof HTMLSelectElement && t.id === "mpd_discipline") {
        updateHeroProfileCardCopy();
      }
      if (
        t instanceof HTMLInputElement &&
        t.type === "radio" &&
        t.name.startsWith("mpd_pick_")
      ) {
        syncMpdStoryPickUi();
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
        const emailEl = document.getElementById("settingsProfileNavContactEmail");
        const statusEl = document.getElementById(
          "settingsProfileNavContactStatus",
        );
        const text = String(msgEl?.value || "").trim();
        if (!text) {
          if (statusEl) statusEl.textContent = "Enter a message.";
          return;
        }
        let emailLine = await resolveSettingsProfileContactEmail();
        if (!mpdLooksLikeEmail(emailLine) && emailEl instanceof HTMLInputElement) {
          emailLine = String(emailEl.value || "").trim();
        }
        if (!mpdLooksLikeEmail(emailLine)) {
          updateSettingsProfileContactEmailField("");
          if (statusEl) {
            statusEl.textContent =
              "Add your email address so we can reply, then send again.";
          }
          emailEl?.focus();
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
          if (snap.authenticated && mpdLooksLikeEmail(emailLine)) {
            let accountHasEmail = false;
            try {
              const existing = await getMyAccountContactForCaller();
              accountHasEmail = mpdLooksLikeEmail(existing?.email);
          } catch {
            /* ignore */
          }
            if (!accountHasEmail) {
              const saved = await setMyAccountContactForCaller({
                firstName: fn,
                lastName: ln,
                email: emailLine,
              });
              if (!saved) {
                throw new Error(
                  "Could not save your email to your profile. Try again or refresh the page.",
                );
              }
            }
            mpdKnownContactEmail = emailLine;
            updateSettingsProfileContactEmailField(emailLine);
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
    setMpdMediaUploadsEnabled(false);
    setAccountRecoveryVisible(false);
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
    if (headingEl) headingEl.textContent = dashTitle;

    const hint = document.getElementById("settingsProfileHint");
    updateSettingsProfileUserId(snap, snap.authenticated ? "sidebar" : "none");
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

    applicationOnlyDisplayPref = readApplicationOnlyDisplayPref();
    if (!isTest && snap.authenticated) {
      try {
        mpdMembershipGate = await getMembershipAccessForCaller();
      } catch {
        mpdMembershipGate = "";
      }
    } else if (isTest) {
      mpdMembershipGate = "exempt";
    }

    if (!isTest && snap.authenticated && !adminViewingMemberPerspective) {
      const ens = await ensureMyLinkedArtistProfile();
      if (ens === "noAccount" && !acc) {
        updateSettingsProfileUserId(snap, "main");
        renderNoAccountRecoveryHint(hint);
        setAccountRecoveryVisible(true);
        wireAccountRecoveryHandlers();
        applyApplicantStudioChrome({
          applicantMode: false,
          lightGate: false,
          showTesterToggle: false,
        });
        if (formWrap) formWrap.setAttribute("hidden", "");
        setInitialProfileLoading(false);
        applySettingsProfileDocumentSeo(dashTitle);
        return;
      }
      // needsSubscription without a linked artist: do not hard-stop — Applicant Studio / light gate below.
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

    const applicationCount = rec
      ? countApplicationsFromRecord(rec.applied_json ?? rec.appliedJson)
      : 0;
    let awardEntryCount = 0;
    try {
      const awardRows = await listMyProgramAwardEntries();
      awardEntryCount = (Array.isArray(awardRows) ? awardRows : []).filter(
        (e) => String(/** @type {Record<string, unknown>} */ (e)?.status || "") === "entered",
      ).length;
    } catch {
      awardEntryCount = 0;
    }
    const hasTesterApp = rec
      ? applicationsIncludeTester(rec.applied_json ?? rec.appliedJson)
      : false;
    let isRealAdmin = false;
    try {
      isRealAdmin = await isRealAdminCaller();
    } catch {
      isRealAdmin = false;
    }
    const showTesterToggle = canShowApplicationOnlyDisplayToggle({
      isRealAdmin,
      hasTesterApplication: hasTesterApp,
    });
    const applicantMode = shouldUseApplicantStudioMode({
      membershipGate: mpdMembershipGate,
      applicationCount,
      awardEntryCount,
      applicationOnlyDisplay: applicationOnlyDisplayPref,
      applicationOnlyToggleVisible: showTesterToggle,
    });
    const lightGate = shouldUseApplicantLightGate({
      membershipGate: mpdMembershipGate,
      applicationCount,
      awardEntryCount,
      applicationOnlyDisplay: applicationOnlyDisplayPref,
      applicationOnlyToggleVisible: showTesterToggle,
    });

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
      // Draw-only guests (no linked artist yet): Programs → My programs with draw status.
      if (applicantMode && awardEntryCount >= 1) {
        applyApplicantStudioChrome({
          applicantMode: true,
          lightGate: false,
          showTesterToggle,
        });
        setInitialProfileLoading(false);
        if (formWrap) formWrap.removeAttribute("hidden");
        if (hint) {
          hint.textContent =
            "Track your Program Draw under My programs. Become a FUSION member to unlock your full studio.";
        }
        localesState = { en: {}, ja: {} };
        void hydrateProgramsPanel(/** @type {Record<string, unknown>} */ ({}), localesState, "en");
        setMpdProgramsTab("my-programs");
        const hashKey = panelKeyFromHash();
        const pendingTrialCode = trialAccessCodeFromSearch();
        showMpdPanel(
          hashKey === "join-unlock" || pendingTrialCode ? "join-unlock" : "programs",
        );
        applySettingsProfileDocumentSeo(dashTitle);
        return;
      }
      // Light / applicant preview without linked artist: Join unlock only.
      // Testers/admins with the toggle unchecked opt out of this restricted shell.
      const forceRestrictedNoProfile =
        applicationOnlyDisplayPref ||
        (!showTesterToggle &&
          (lightGate || mpdMembershipGate === "needsSubscription"));
      if (forceRestrictedNoProfile) {
        applyApplicantStudioChrome({
          applicantMode: false,
          lightGate: true,
          showTesterToggle,
        });
        setInitialProfileLoading(false);
        if (formWrap) formWrap.removeAttribute("hidden");
        if (hint) {
          hint.textContent =
            "Become a FUSION member to unlock your full studio. You can track applications under Programs once you have applied.";
        }
        showMpdPanel("join-unlock");
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

    applyApplicantStudioChrome({
      applicantMode,
      lightGate: lightGate && !applicantMode,
      showTesterToggle,
    });

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
    heroImageCleared = false;
    heroProfileImageCleared = false;
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
    mpdCurrentArtistId = currentArtistId;
    mpdProfileSlug = profileSlug;
    setMpdMediaUploadsEnabled(
      Boolean(currentArtistId || profileSlug) || getDataSource() === "test",
    );
    profileAudioUrl = String(p.audioUrl ?? "");
    setVal("mpd_hero_url", heroImageUrl);
    setVal("mpd_hero_profile_url", heroProfileImageUrl);
    setVal("mpd_audio_url", profileAudioUrl);
    setVal("mpd_audio_title", String(p.audioTitle ?? ""));
    {
      const badge = document.getElementById("mpd_audio_approval_status");
      if (badge) {
        if (profileAudioUrl) {
          badge.hidden = false;
          const fullSite = isArtistAudioFullSiteApproved(p);
          const profileOk = isArtistAudioApproved(p) || fullSite;
          badge.textContent = fullSite
            ? "Approved for full site"
            : profileOk
              ? "Approved for public profile"
              : "Pending staff approval";
          badge.classList.toggle("is-approved", profileOk);
          badge.classList.toggle("is-pending", !profileOk);
        } else {
          badge.hidden = true;
          badge.textContent = "";
        }
      }
    }
    void loadMpdAudioInspirationText();
    void loadMpdAudioCollection();
    void loadMpdAssetReviewNotes();
    updateHeroPreview();
    updateHeroProfilePreview();

    mpdBackendRosterVisibility = normalizeArtistRosterVisibility(p.visibility);
    setMpdVisibilityToggle(mpdBackendRosterVisibility);

    const vu = document.getElementById("mpd_view_profile");
    const profileHref = `/profile/${encodeURIComponent(profileSlug)}`;
    if (vu && vu instanceof HTMLAnchorElement) vu.href = profileHref;
    const overviewCard = document.getElementById("mpd_overview_profile_card");
    if (overviewCard && overviewCard instanceof HTMLAnchorElement) overviewCard.href = profileHref;

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
    if (!getVal("mpd_w_quote").trim()) {
      setVal("mpd_w_quote", String(p.quote ?? ""));
    }

    refreshBaseline();

    void hydrateProgramsPanel(
      rec,
      /** @type {Record<string, unknown>} */ (localesState),
      activeLocale,
    );
    if (applicantStudioActive) {
      setMpdProgramsTab("my-programs");
    } else {
      setMpdProgramsTab("explore");
    void hydratePublicProgramDiscoveryCards();
    void syncResidencyApplyCta();
    }

    if (applicantLightGateActive) {
      showMpdPanel("join-unlock");
    } else if (applicantStudioActive) {
      const hashKey = panelKeyFromHash();
      const pendingTrialCode = trialAccessCodeFromSearch();
      showMpdPanel(
        hashKey === "join-unlock" || pendingTrialCode ? "join-unlock" : "programs",
      );
    } else {
    showMpdPanel(panelKeyFromHash());
    }
    if (!applicantStudioActive && !applicantLightGateActive) {
      syncStudioOverview();
    }
    syncMpdVisibilityUi(mpdBackendRosterVisibility);

    updateSettingsProfileUserId(snap, "sidebar");

    void resolveSettingsProfileContactEmail().then((email) => {
      updateSettingsProfileContactEmailField(email);
    });

    applySettingsProfileDocumentSeo(dashTitle);
  };

  window.addEventListener("hashchange", () => {
    showMpdPanel(panelKeyFromHash());
    const hash = window.location.hash.replace(/^#/, "").toLowerCase();
    if (hash === "travel" || hash === "programs-travel") {
      setMpdProgramsTab("travel");
    }
    if (mpdProgramsCalendarHash(hash)) {
      setMpdProgramsTab("calendar");
    }
  });

  document
    .getElementById("settingsProfileFinishMembership")
    ?.addEventListener("click", () => {
      const email = String(mpdKnownContactEmail || "").trim();
      window.dispatchEvent(
        new CustomEvent("fusion-open-join-network", {
          detail: {
            mode: "resubscribe",
            fromJoinNetworkPage: true,
            stage: "payment",
            subscriptionTier: "monthly",
            ...(email.includes("@") ? { email } : {}),
          },
        }),
      );
    });
  document.getElementById("mpd_become_member")?.addEventListener("click", () => {
    showMpdPanel("join-unlock");
  });
  document.getElementById("mpd_root")?.addEventListener("fusion-draw-status-redeem", () => {
    showMpdPanel("join-unlock");
  });
  document.getElementById("mpdApplicationOnlyToggle")?.addEventListener("change", (ev) => {
    const checked = ev.target instanceof HTMLInputElement && ev.target.checked;
    writeApplicationOnlyDisplayPref(checked);
    applicationOnlyDisplayPref = checked;
    void load({ force: true });
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
    if (action !== "save") {
      setMpdSaveChoiceBusy(false);
      return;
    }
    const translate = detail.translate !== false;
    setMpdSaveChoiceBusy(
      true,
      translate ? "Translating & saving your profile…" : "Saving your profile…",
      translate ? "translate" : "just-save",
    );
    void saveProfileFromDom(fromBtn, {
      translate,
      onCoreSaved: () => closeMpdSaveChoiceModal(),
    })
      .catch(() => {})
      .finally(() => {
        closeMpdSaveChoiceModal();
      });
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
        const integrationApi = await import("../utils/integrationApi.js");
        const acc = await getAccountForCaller();
        const paypalSubId = String(acc?.paypalSubscriptionId || "").trim();
        const paymentProvider = String(acc?.paymentProvider || "").toLowerCase();
        if (paypalSubId || paymentProvider === "paypal") {
          await integrationApi.syncPayPalSubscription({
            principal: snap.principal.toText(),
            subscriptionId: paypalSubId,
          });
        } else {
          await integrationApi.syncSubscriptionFromStripe(snap.principal.toText());
        }
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
  document.getElementById("mpd_membership_change_plan_btn")?.addEventListener("click", () => {
    const tier = mpdMembershipBillingContext?.tier || "monthly";
    renderMpdMembershipChangePlanOptions(tier);
    openMpdMembershipChangePlanModal();
  });
  document.getElementById("mpdMembershipChangePlanConfirm")?.addEventListener("click", async () => {
    const modalErr = document.getElementById("mpdMembershipChangePlanError");
    const targetTier = normalizeMembershipTier(mpdMembershipSelectedChangeTier);
    if (!targetTier || targetTier === "bimonthly") {
      if (modalErr) {
        modalErr.hidden = false;
        modalErr.textContent = "Choose Monthly, Quarterly, or Annual.";
      }
      return;
    }
    const ctx = mpdMembershipBillingContext;
    if (!ctx) {
      if (modalErr) {
        modalErr.hidden = false;
        modalErr.textContent = "Membership billing details are not loaded yet.";
      }
      return;
    }

    if (getDataSource() === "test") {
      const cycle = ["monthly", "quarterly", "annual"];
      const idx = cycle.indexOf(normalizeMembershipTier(ctx.tier) || "monthly");
      mpdMembershipTestTier = cycle[(idx + 1) % cycle.length] || "monthly";
      closeMpdMembershipChangePlanModal();
      await hydrateMembershipPanel();
      finishMpdOperation(
        "membership-change-plan",
        "saved",
        `Test mode: plan set to ${mpdMembershipPlanCopy(mpdMembershipTestTier).label}.`,
      );
      return;
    }

    const snap = await getAuthSnapshot();
    if (!snap.authenticated) return;
    if (
      !beginMpdOperation("membership-change-plan", {
        operation: "Membership",
        detail: "Starting plan change",
        message: "Starting plan change…",
        pendingMessage: "Still starting plan change...",
      })
    ) {
      return;
    }
    let redirecting = false;
    try {
      const result = await startPlanChange({
        provider: ctx.provider,
        principal: snap.principal.toText(),
        targetTier,
        subscriptionId: ctx.subscriptionId,
        returnUrl: mpdSettingsMembershipReturnUrl("membershipPlanUpdated"),
        cancelUrl: mpdSettingsMembershipReturnUrl("membershipPlanChangeCancelled"),
      });
      if (result.message) {
        if (modalErr) {
          modalErr.hidden = false;
          modalErr.textContent = result.message;
        }
        finishMpdOperation("membership-change-plan", "error", result.message);
        return;
      }
      if (result.approveUrl) {
        redirecting = true;
        closeMpdMembershipChangePlanModal();
        posthog.capture("membership_plan_change_started", {
          context: "settings_profile",
          target_tier: targetTier,
          provider: ctx.provider,
        });
        finishMpdOperation(
          "membership-change-plan",
          "saved",
          "Opening PayPal to approve your plan change…",
        );
        window.location.assign(result.approveUrl);
        return;
      }
      finishMpdOperation(
        "membership-change-plan",
        "saved",
        "Plan change request submitted.",
      );
      closeMpdMembershipChangePlanModal();
      await hydrateMembershipPanel();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (modalErr) {
        modalErr.hidden = false;
        modalErr.textContent = msg;
      }
      finishMpdOperation("membership-change-plan", "error", msg);
    } finally {
      if (!redirecting && activeMpdOperations.has("membership-change-plan")) {
        finishMpdOperation("membership-change-plan", "idle");
      }
    }
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
      const { cancelSubscriptionAtPeriodEnd, cancelPayPalSubscriptionAtPeriodEnd, syncSubscriptionFromStripe, syncPayPalSubscription } =
        await import("../utils/integrationApi.js");
      const acc = await getAccountForCaller();
      const paypalSubId = String(acc?.paypalSubscriptionId || "").trim();
      const paymentProvider = String(acc?.paymentProvider || "").toLowerCase();
      if (paypalSubId || paymentProvider === "paypal") {
        if (!paypalSubId) throw new Error("No PayPal subscription linked.");
        await cancelPayPalSubscriptionAtPeriodEnd(paypalSubId);
        await syncPayPalSubscription({
          principal: snap.principal.toText(),
          subscriptionId: paypalSubId,
        });
      } else {
      await cancelSubscriptionAtPeriodEnd(snap.principal.toText());
      await syncSubscriptionFromStripe(snap.principal.toText());
      }
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
