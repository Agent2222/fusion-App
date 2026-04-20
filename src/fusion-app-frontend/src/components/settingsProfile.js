import "../styles/studio.css";
import "../styles/memberProfileDashboard.css";
import posthog from "posthog-js";
import {
  getMyArtistRecord,
  updateMyArtistLocalesJson,
  updateMyArtistProfilePatch,
  getProfileSettingsDevArtistId,
  setProfileSettingsDevArtistId,
  getArtists,
  getDataSource,
  ensureMyLinkedArtistProfile,
  getAccountForCaller,
  updateMyArtistPublicSlug,
  getPrograms,
} from "../utils/database.js";
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
                                    <img id="mpd_intro_${i}_thumb" class="member-profile-dashboard__intro-thumb" alt="" style="display:none" />
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
                                </div>

                                <h3 class="studio-subheading mpd-media-subhead">Hero image</h3>
                                <div class="member-profile-dashboard__hero-preview-wrap">
                                    <div class="mpd-media-spinner" id="mpd_hero_spinner" hidden aria-hidden="true"></div>
                                    <img id="mpd_hero_preview" class="member-profile-dashboard__hero-preview" alt="" />
                                </div>
                                <input type="hidden" id="mpd_hero_url" value="" />
                                <input type="file" id="mpd_hero_file" class="mpd-file-input-hidden" accept="image/*" />
                                <label for="mpd_hero_file" class="mpd-upload-btn">Upload hero image</label>

                                <h3 class="studio-subheading mpd-media-subhead">Intro artwork (max 3)</h3>
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
            </main>
        </div>
    `;
}

/**
 * @param {Record<string, unknown>} locales
 * @param {'en'|'ja'} active
 * @param {string} heroUrl
 */
function snapshotState(locales, active, heroUrl) {
  return JSON.stringify({ locales, active, hero: heroUrl });
}

/** @type {((e: BeforeUnloadEvent) => void) | null} */
let _mpdBeforeUnloadHandler = null;

export default function initSettingsProfile() {
  document.querySelectorAll("#mpdResidencyComingSoonModal").forEach((m) => {
    const sm = document.getElementById("settingsMain");
    if (sm && !sm.contains(m)) m.remove();
  });
  wireMpdResidencyComingSoonModal();

  /** @type {'en'|'ja'} */
  let activeLocale = "en";
  /** @type {Record<string, unknown> | null} */
  let localesState = null;
  let heroImageUrl = "";
  /** @type {string} */
  let baselineSnapshot = "";
  /** @type {string} */
  let profileSlug = "";

  const statusEl = document.getElementById("settingsProfileStatus");
  const formWrap = document.getElementById("settingsProfileFormWrap");

  const setStatus = (t) => {
    if (statusEl) statusEl.textContent = t || "";
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

  const validMpdPanels = () => {
    /** @type {string[]} */
    const keys = ["overview", "location", "story", "links", "programs"];
    if (DEV_MODE) keys.push("dev");
    return keys;
  };

  /**
   * @param {string} key
   */
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
    closeSettingsProfileMobileNav();
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
    );
    return cur !== baselineSnapshot;
  };

  const refreshBaseline = () => {
    if (!localesState) return;
    const merged = readLocalesFromDom(localesState, activeLocale, getVal);
    heroImageUrl = getVal("mpd_hero_url").trim();
    baselineSnapshot = snapshotState(merged, activeLocale, heroImageUrl);
  };

  const saveProfileFromDom = async () => {
    if (!localesState) return;
    setStatus("Saving…");
    try {
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
      await updateMyArtistLocalesJson(JSON.stringify(merged), ts);
      await updateMyArtistProfilePatch(heroUrl, ts);
      heroImageUrl = heroUrl;
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
        setStatus("Saved.");
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
        setHeroSpinnerVisible(true);
        try {
          setStatus("Uploading hero…");
          const url = await uploadBlobToS3(f, null, {
            area: "account/profile",
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
      const slot = t.getAttribute("data-intro-slot");
      if (slot != null && t.files?.[0]) {
        const i = Number(slot);
        const f = t.files[0];
        setIntroSpinnerVisible(i, true);
        try {
          setStatus("Uploading…");
          const url = await uploadBlobToS3(f, null, {
            area: "account/profile",
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
          await sendEmail({
            to: DEFAULT_APPLICATION_STAFF_EMAIL,
            subject: "[Fusion Profile settings] Message",
            text: text,
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
    const dashTitle = dashboardTitleFromAccount(acc);
    const headingEl = document.getElementById("settingsProfileHeading");
    const sideRoleEl = document.getElementById("settingsProfileSidebarRole");
    const avatarEl = document.getElementById("settingsProfileAvatar");
    if (headingEl) headingEl.textContent = dashTitle;
    if (sideRoleEl) sideRoleEl.textContent = sidebarRoleLabel(acc);
    if (avatarEl) {
      const lab = sidebarRoleLabel(acc);
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

    if (!isTest && snap.authenticated) {
      const ens = await ensureMyLinkedArtistProfile();
      if (ens === "noAccount" && !acc) {
        if (hint) {
          hint.textContent =
            "No member account found. Complete Join to register, then return to this page.";
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
              "An active membership is required to create your public profile. Use Join in the header to subscribe, then come back here to finish your profile.";
          }
          if (formWrap) formWrap.setAttribute("hidden", "");
          applySettingsProfileDocumentSeo(dashTitle);
          return;
        }
      }
    }

    const rec = await getMyArtistRecord();
    if (!rec) {
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

    heroImageUrl = String(p.image ?? "");
    setVal("mpd_hero_url", heroImageUrl);
    updateHeroPreview();

    const vu = document.getElementById("mpd_view_profile");
    if (vu && vu instanceof HTMLAnchorElement)
      vu.href = `/profile/${encodeURIComponent(profileSlug)}`;

    const side = document.getElementById("mpd_sidebar_slug");
    if (side) side.textContent = profileSlug ? `/${profileSlug}` : "—";

    if (hint) {
      hint.textContent =
        "Shape how you appear on the public site. Save each section as you go.";
    }
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
        await syncResidencyApplyCta();
      })();
      setStatus("Intro images copied from English to Japanese.");
    });

  window.addEventListener("hashchange", () => {
    showMpdPanel(panelKeyFromHash());
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
  window.addEventListener("fusion-data-source-change", () => void load());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void load();
  });
}
