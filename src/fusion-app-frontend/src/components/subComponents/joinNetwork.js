import { ERROR_USER_INTERRUPT } from "@dfinity/auth-client";
import posthog from "posthog-js";
import { metaTrack } from "../../utils/metaPixel.js";
import {
  identifyPosthogAfterInternetIdentityLogin,
  syncPosthogConversionPerson,
} from "../../utils/posthogConversionIdentity.js";

/**
 * Join FUSION — band + multi-stage modal (`data-modal-type`: membership | access | apply).
 * Copy: `testData.joinNetworkFlow`; legacy `context` maps to modal type. Value step: three subscription cards (`planMonthly` / `planQuarterly` / `planAnnual`); payment summary uses `payment.monthly` / `payment.quarterly` / `payment.annual` overrides. `planKey` / tier drives PostHog on completion.
 *
 * Vertical spacing (host margins), any CSS length (e.g. `48px`, `3rem`):
 * - `data-margin-top`, `data-margin-bottom` (preferred)
 * - Legacy: `topp` / `topP`, `bottomp` / `bottomP` (same values, fallback if data-* omitted)
 */
import { DEV_MODE, getHost } from "../../config.js";
import {
  getApplicationPaymentGlobal,
  getContentBundleForStudio,
  subscribeDataSource,
} from "../../utils/database.js";
import { mergeLocaleDeep } from "../../utils/localeFallback.js";
import { navigate } from "../../router.js";
import {
  normalizeEarlyAccessCategory,
  prefetchFusionBackendActor,
  submitEarlyAccessToCanister,
} from "../../utils/earlyAccessSubscribe.js";
import "./authBrowserHelp.js";
import {
  clearJoinPendingMembershipStorage,
  clearPendingMembershipPayload,
  clearPendingPaymentEmailLocal,
  createSubscription,
  FUSION_PENDING_MEMBERSHIP_LINK_KEY,
  getIntegrationBaseUrl,
  hasActiveJoinMembershipLinkSession,
  linkPayPalSubscriptionToPrincipal,
  linkSubscriptionToPrincipal,
  mapIntegrationUserMessage,
  markPendingMembershipPaymentCompleted,
  readPendingMembershipPayload,
  readPendingPaymentEmailLocal,
  savePendingMembershipPayload,
  sendEmail,
  setStoredBillingEmailForPrincipal,
  syncPayPalSubscription,
} from "../../utils/integrationApi.js";
import { mountPayPalSubscriptionButtons } from "../../utils/paymentCheckout.js";
import {
  fetchPaymentConfig,
  getActiveProvider,
  paymentModeMismatch,
} from "../../utils/paymentProvider.js";
import {
  getPayPalClientIdResolved,
  getStripePublishableKeyResolved,
} from "../../utils/studioServicesConfig.js";
import { saveProfileSetupDraft } from "../../utils/profileSetupDraft.js";
import { planIdForTier } from "../../utils/membershipPlanChange.js";

/** @typedef {'monthly' | 'quarterly' | 'annual'} JoinSubscriptionTier */

const JOIN_SUBSCRIPTION_TIERS = /** @type {const} */ ([
  "monthly",
  "quarterly",
  "annual",
]);

/** Persisted while the join dialog is on the exempt (access-code) path so refresh keeps the digits. */
const PENDING_JOIN_ACCESS_CODE_KEY = "fusion-pending-join-access-code";

/**
 * @param {string | undefined} raw
 * @returns {string} digits only (matches canister `normalizeJoinAccessCode`)
 */
function normalizeJoinAccessCodeInput(raw) {
  return String(raw || "").replace(/\D/g, "");
}

/**
 * Set by `fusion-open-join-network` with `detail.logoutIfDismissedWithoutAccount` (post–II login with no account).
 * Consumed on next `_openModal` so header “Register” does not trigger logout on dismiss.
 */
let _pendingLogoutIfDismissedWithoutAccount = false;

/**
 * @param {string | undefined} raw
 * @returns {number} amount in cents
 */
function parseMoneyToCents(raw) {
  const t = String(raw || "").replace(/[^\d.]/g, "");
  const n = parseFloat(t);
  if (!Number.isFinite(n) || n <= 0) return 5000;
  return Math.round(n * 100);
}

/**
 * @param {unknown} o
 * @returns {Record<string, unknown>}
 */
function asRecord(o) {
  return o && typeof o === "object" && !Array.isArray(o)
    ? /** @type {Record<string, unknown>} */ (o)
    : {};
}

/**
 * @param {unknown} raw
 * @param {string} key
 * @returns {string}
 */
function strField(raw, key) {
  const o = asRecord(raw);
  const v = o[key];
  return typeof v === "string" ? v.trim() : "";
}

/** @typedef {'membership'|'access'|'apply'} ModalType */
/** @typedef {'entry'|'value'|'payment'|'linkAccount'|'confirmation'} FlowStage */

const CONTEXT_TO_MODAL = /** @type {Record<string, ModalType>} */ ({
  home: "membership",
  register: "membership",
  artists: "access",
  profile: "access",
  editions: "access",
  "gallery-access": "access",
  journal: "membership",
  community: "membership",
  context: "membership",
  programs: "apply",
});

const STAGES = /** @type {FlowStage[]} */ ([
  "entry",
  "value",
  "payment",
  "linkAccount",
  "confirmation",
]);

/**
 * @param {Record<string, unknown> | null} flow
 * @param {ModalType} modalType
 * @param {FlowStage} stage
 * @param {'en'|'ja'} loc
 */
function getFlowSlice(flow, modalType, stage, loc) {
  if (!flow || typeof flow !== "object") return null;
  const f = /** @type {Record<string, unknown>} */ (flow)[modalType];
  if (!f || typeof f !== "object") return null;
  const block = /** @type {Record<string, unknown>} */ (f)[stage];
  if (!block || typeof block !== "object") return null;
  const en =
    block.en && typeof block.en === "object"
      ? /** @type {Record<string, unknown>} */ (block.en)
      : {};
  const ja =
    block.ja && typeof block.ja === "object"
      ? /** @type {Record<string, unknown>} */ (block.ja)
      : {};
  if (loc === "ja") {
    return /** @type {Record<string, unknown>} */ (mergeLocaleDeep(en, ja));
  }
  return Object.keys(en).length ? en : null;
}

/**
 * @param {HTMLElement} host
 * @returns {ModalType}
 */
function resolveModalType(host) {
  const raw =
    host.getAttribute("modal-type") ||
    host.getAttribute("data-modal-type") ||
    host.getAttribute("Modal-Type") ||
    "";
  const t = String(raw).trim().toLowerCase();
  if (t === "membership" || t === "access" || t === "apply") return t;
  const ctx = (host.getAttribute("context") || "home").trim();
  return CONTEXT_TO_MODAL[ctx] || "membership";
}

class JoinNetworkComponent extends HTMLElement {
    constructor() {
        super();
    this.shadow = this.attachShadow({ mode: "open" });
    this._onLocaleChange = () => {
      this._fillBandCopy();
      this._fillDialogCopy();
    };
    /** @type {(e: Event) => void} */
    this._onFusionAuthChange = () => {
      void this._syncBandOpenButtonAuth();
      void this._tryCompletePendingLink();
      void this._syncPageJoinVisibility();
    };
    this._joinNetworkSubmitting = false;
    /** Opened after sign-in with no account — close without completing join logs out of II. */
    this._logoutIfDismissedWithoutJoin = false;
    /** Set when signup reaches confirmation (saved to canister). */
    this._joinFlowCompleted = false;
    /** `full` join vs `resubscribe` (payment + confirm only). */
    this._joinMode = "full";
    /** When true, `afterJoinSaved` skips early-access + register (already done before Stripe). */
    this._preStripeCanisterSyncDone = false;
    /** Pay-first Stripe: pending link id + subscription id until II links. */
    this._fusionPendingId = /** @type {string | null} */ (null);
    this._fusionSubscriptionId = /** @type {string | null} */ (null);
    /** @type {FlowStage} */
    this._stage = "entry";
    /** @type {ModalType} */
    this._modalType = "membership";
    this._formFullName = "";
    this._formFirstName = "";
    this._formLastName = "";
    /** Skip value + payment; complete with II + `registerWithJoinAccessCode`. */
    this._joinExemptCodePath = false;
    /** Blocks re-entrant exempt redemption when `dispatchFusionAuthChange` runs mid-flow. */
    this._exemptAccessCodeJoinInFlight = false;
    /** Prevents concurrent pay-first Internet Identity link attempts. */
    this._pendingLinkInFlight = false;
    this._formEmail = "";
    /** @type {string} */
    this._lastFocused = null;
    /** @type {import('@stripe/stripe-js').Stripe | null} */
    this._stripe = null;
    /** @type {import('@stripe/stripe-js').StripeElements | null} */
    this._stripeElements = null;
    /** @type {import('@stripe/stripe-js').StripeElement | null} */
    this._stripePaymentElement = null;
    /** Set only after Payment Element fires `ready` — required before `confirmPayment`. */
    this._stripePaymentReady = false;
    /** Bumps when leaving payment or starting a new prepare; invalidates in-flight async work. */
    this._stripePrepareGen = 0;
    /** PaymentIntent amount (cents) from CMS copy — display/order card only. */
    this._paymentAmountCents = 3000;
    /** Fingerprint for reusing the same Stripe Elements session (subscription). */
    this._stripePrepareKey = "";
    /** Stable key from `joinNetworkFlow.*.payment.planKey` (CMS) for PostHog. */
    this._paymentPlanKey = /** @type {string | null} */ (null);
    /** Non-PII display label (e.g. `value.periodLabel`) for `payment_plan_label` on successful payment. */
    this._paymentPlanLabel = /** @type {string | null} */ (null);
    /** Selected subscription tier from value-step cards (`null` until user picks). Resubscribe flow leaves this unset. */
    this._joinSubscriptionTier = /** @type {null | JoinSubscriptionTier} */ (null);
    /** Parsed per-tier payment copy from CMS (`joinNetworkFlow.*.payment`). */
    this._joinPaymentTierSlices = /** @type {{ monthly: Record<string, string>, quarterly: Record<string, string>, annual: Record<string, string> } | null} */ (
      null
    );
    /** Last merged `value` slice — plan-specific what's included + hydration. */
    this._joinValueMergedCache = /** @type {Record<string, unknown> | null} */ (null);
    /** Global bullets from site `applicationPaymentGlobal` (same source as program application form). */
    this._joinWhatsIncludedGlobalBullets = /** @type {string[]} */ ([]);
    /** @type {Record<string, unknown> | null} */
    this._joinNetworkFlow = null;
    /** @type {Record<string, unknown> | null} */
    this._joinNetworkBlock = null;
    /** @type {(() => void) | null} */
    this._unsubData = null;
    /** Studio editor live preview — no canister fetch, Stripe, or II. */
    this._studioPreview = false;
    /** @type {{ modalType?: ModalType, stage?: string, locale?: 'en'|'ja', flowDraft?: Record<string, unknown>, globalBullets?: string[], selectedPlan?: string, previewMode?: 'band'|'modal', context?: string } | null} */
    this._studioPreviewState = null;
    /** @type {'en'|'ja'|null} */
    this._studioPreviewLocale = null;
    }

    get active() {
    return this.getAttribute("active") || false;
    }

    set active(val) {
    const next = val === true || val === "true" ? "true" : "false";
    if (this.getAttribute("active") === next) return;
    this.setAttribute("active", next);
    }

    static get observedAttributes() {
    return [
      "active",
      "context",
      "data-margin-top",
      "data-margin-bottom",
      "topp",
      "topP",
      "bottomp",
      "bottomP",
      "modal-type",
      "data-modal-type",
      "stage",
      "data-header-bridge",
    ];
  }

  _getTopMarginValue() {
        return (
      this.getAttribute("data-margin-top") ||
      this.getAttribute("topp") ||
      this.getAttribute("topP") ||
      ""
        ).trim();
    }

  _getBottomMarginValue() {
        return (
      this.getAttribute("data-margin-bottom") ||
      this.getAttribute("bottomp") ||
      this.getAttribute("bottomP") ||
      ""
        ).trim();
    }

  /** Apply vertical margin on the host (`<app-join-network>`) for spacing within the page. */
  _applyHostMargins() {
    const top = this._getTopMarginValue();
    const bottom = this._getBottomMarginValue();
    this.style.marginTop = top || "";
    this.style.marginBottom = bottom || "";
    }

    attributeChangedCallback(prop, oldVal, newVal) {
    if (
      prop === "data-margin-top" ||
      prop === "data-margin-bottom" ||
      prop === "topp" ||
      prop === "topP" ||
      prop === "bottomp" ||
      prop === "bottomP"
    ) {
            if (oldVal === newVal) return;
      this._applyHostMargins();
            return;
        }
    if (
      prop === "active" ||
      prop === "context" ||
      prop === "modal-type" ||
      prop === "data-modal-type"
    ) {
            if (oldVal === newVal) return;
      this._modalType = resolveModalType(this);
      this._fillBandCopy();
      this._fillDialogCopy();
        }
    }

  _isActivePendingMembershipLinkFlow() {
    return (
      this._stage === "linkAccount" ||
      hasActiveJoinMembershipLinkSession() ||
      Boolean(this._fusionPendingId)
    );
  }

  /**
   * After refresh, restore pay-first state so the user can still complete Internet Identity link.
   * @returns {boolean} true if pending link state was restored
   */
  _restorePendingMembershipFromStorage() {
    if (!hasActiveJoinMembershipLinkSession()) return false;
    const p = readPendingMembershipPayload();
    if (!p?.paymentCompleted || !p.fusionPendingId) return false;
    this._fusionPendingId = p.fusionPendingId;
    this._fusionSubscriptionId = p.subscriptionId;
    if (p.email) this._formEmail = p.email;
    this._stage = "linkAccount";
    this._joinMode = "full";
    this._preStripeCanisterSyncDone = true;
    try {
      sessionStorage.setItem(FUSION_PENDING_MEMBERSHIP_LINK_KEY, "1");
    } catch {
      /* ignore */
    }
    return true;
  }

    connectedCallback() {
    this._studioPreview = this.hasAttribute("data-studio-preview");
    window.addEventListener("fusion-localechange", this._onLocaleChange);
    window.addEventListener("fusion-auth-change", this._onFusionAuthChange);
    this._modalType = resolveModalType(this);
    const restoredPending = this._studioPreview ? false : this._restorePendingMembershipFromStorage();
    const dbg = (this.getAttribute("stage") || "").trim().toLowerCase();
    if (!restoredPending && STAGES.includes(/** @type {FlowStage} */ (dbg))) {
      this._stage = /** @type {FlowStage} */ (dbg);
    }
        this.render();
    if (this._studioPreview) {
      this.hidden = false;
      return;
    }
    if (this._unsubData) this._unsubData();
    this._unsubData = subscribeDataSource(() => void this._reloadJoinCopy());
    void this._reloadJoinCopy();
    void this._syncPageJoinVisibility();
    }

    disconnectedCallback() {
    window.removeEventListener("fusion-localechange", this._onLocaleChange);
    window.removeEventListener("fusion-auth-change", this._onFusionAuthChange);
    if (this._unsubData) {
      this._unsubData();
      this._unsubData = null;
    }
    this._teardownStripePayment();
    this.querySelector("[data-jn-stripe-mount]")?.remove();
    const dlg = this.shadowRoot?.querySelector(".jn-dialog");
    if (dlg && typeof dlg.close === "function" && dlg.open) dlg.close();
  }

  /**
   * Stripe.js Elements must mount in the **light DOM** — iframes cannot communicate across a
   * ShadowRoot boundary (see Stripe / stripe-js issues). The slot projects this node into the dialog.
   * @returns {HTMLDivElement}
   */
  _getStripeMountLightEl() {
    let el = this.querySelector("[data-jn-stripe-mount]");
    if (!el) {
      el = document.createElement("div");
      el.setAttribute("data-jn-stripe-mount", "");
      el.setAttribute("slot", "jn-stripe-mount");
      el.className = "jn-stripe-mount";
      this.appendChild(el);
    }
    return /** @type {HTMLDivElement} */ (el);
  }

  _isStudioPreview() {
    return this._studioPreview || this.hasAttribute("data-studio-preview");
  }

  _getLocale() {
    if (this._studioPreviewLocale === "ja" || this._studioPreviewLocale === "en") {
      return this._studioPreviewLocale;
    }
    return typeof window.getLocale === "function" && window.getLocale() === "ja"
      ? "ja"
      : "en";
  }

  /**
   * Studio editor live preview — inject draft copy without canister fetch.
   * @param {{ modalType?: ModalType, stage?: string, locale?: 'en'|'ja', flowDraft?: Record<string, unknown>, globalBullets?: string[], selectedPlan?: string, previewMode?: 'band'|'modal', context?: string }} state
   */
  setStudioPreviewState(state) {
    if (!this._isStudioPreview()) return;
    this._studioPreviewState = state || {};
    const st = this._studioPreviewState;
    if (st.context) this.setAttribute("context", st.context);
    if (st.modalType) {
      this._modalType = st.modalType;
      this.setAttribute("data-modal-type", st.modalType);
    }
    if (st.flowDraft && typeof st.flowDraft === "object") {
      this._joinNetworkFlow = /** @type {Record<string, unknown>} */ (st.flowDraft);
    }
    this._joinWhatsIncludedGlobalBullets = Array.isArray(st.globalBullets)
      ? st.globalBullets.map((x) => String(x ?? "").trim()).filter(Boolean)
      : [];
    this._studioPreviewLocale =
      st.locale === "ja" || st.locale === "en" ? st.locale : null;
    const plan =
      st.selectedPlan === "annual"
        ? "annual"
        : st.selectedPlan === "quarterly"
          ? "quarterly"
          : "monthly";
    this._joinSubscriptionTier = plan;

    const rawStage = String(st.stage || "entry");
    this._joinExemptCodePath = rawStage === "linkAccountExempt";
    if (rawStage === "band") {
      this._stage = "entry";
    } else if (rawStage === "linkAccountExempt") {
      this._stage = "linkAccount";
    } else if (STAGES.includes(/** @type {FlowStage} */ (rawStage))) {
      this._stage = /** @type {FlowStage} */ (rawStage);
    }

    this._fillBandCopy();
    this._fillDialogCopy();
    this._applyStudioPreviewLayout(st.previewMode || "modal", rawStage);
  }

  /**
   * @param {'band'|'modal'} previewMode
   * @param {string} editorStage
   */
  _applyStudioPreviewLayout(previewMode, editorStage) {
    const root = this.shadowRoot;
    if (!root) return;
    const dlg = root.querySelector(".jn-dialog");
    const band = root.querySelector(".join-network-band");
    const hostInner = root.querySelector(".join-network-host");
    const bandMode = previewMode === "band" || editorStage === "band";

    this.hidden = false;
    if (hostInner instanceof HTMLElement) {
      hostInner.classList.toggle("join-network-host--band-only", bandMode);
      hostInner.classList.toggle("join-network-host--modal-only", !bandMode);
    }
    if (band instanceof HTMLElement) {
      band.hidden = false;
    }
    if (dlg instanceof HTMLDialogElement) {
      dlg.classList.add("jn-dialog--studio-preview");
      if (bandMode) {
        dlg.removeAttribute("open");
      } else {
        dlg.setAttribute("open", "");
        this._showStage(this._stage);
        const stripeMount = this.querySelector("[data-jn-stripe-mount]");
        if (stripeMount instanceof HTMLElement) {
          stripeMount.innerHTML =
            '<p class="jn-studio-stripe-placeholder">Stripe preview (disabled in Studio)</p>';
        }
        const payHint = root.querySelector("#jnPayStripeHint");
        if (payHint) payHint.textContent = "";
      }
    }
  }

  async _reloadJoinCopy() {
    if (this._isStudioPreview()) return;
    const [flow, block] = await Promise.all([
      getContentBundleForStudio("join-network-flow"),
      getContentBundleForStudio("join-network"),
    ]);
    this._joinNetworkFlow =
      flow && typeof flow === "object"
        ? /** @type {Record<string, unknown>} */ (flow)
        : null;
    this._joinNetworkBlock =
      block && typeof block === "object"
        ? /** @type {Record<string, unknown>} */ (block)
        : null;
    this._fillBandCopy();
    this._fillDialogCopy();
    void getApplicationPaymentGlobal()
      .then((g) => {
        const loc = this._getLocale();
        const pick =
          g && typeof g === "object"
            ? /** @type {Record<string, unknown>} */ (g)[loc] ||
              /** @type {Record<string, unknown>} */ (g).en
            : null;
        const bullets = pick && Array.isArray(pick.whatsIncludedBullets)
          ? pick.whatsIncludedBullets
          : [];
        this._joinWhatsIncludedGlobalBullets = bullets
          .map((x) => String(x ?? "").trim())
          .filter(Boolean);
        this._hydrateJoinWhatsIncluded();
      })
      .catch(() => {
        this._joinWhatsIncludedGlobalBullets = [];
        this._hydrateJoinWhatsIncluded();
      });
    void this._syncBandOpenButtonAuth();
  }

  _getBandFallbackCopy() {
    const key = this.getAttribute("context") || "home";
    const block = this._joinNetworkBlock;
        const slice = block && block[key] ? block[key] : block?.home;
    const loc = this._getLocale();
        const row = slice ? slice[loc] || slice.en : null;
        const en = slice ? slice.en : null;
        return {
      title: String(row?.title || en?.title || "").trim(),
      description: String(row?.description || en?.description || "").trim(),
    };
  }

  /**
   * Page gate: band title = `comingSoonMessage`, description = `comingSoonCopy` from `config.pageStatus` (may include HTML).
   */
  _applyGateBandFromHostAttrs() {
    const titleEnc = this.getAttribute("data-gate-title-enc");
    const descEnc = this.getAttribute("data-gate-desc-enc");
    const titleEl = this.shadowRoot?.querySelector("#bandTitle");
    const descEl = this.shadowRoot?.querySelector("#bandDescription");
    const openBtn = this.shadowRoot?.querySelector("#bandOpenBtn");
    try {
      if (titleEl && titleEnc != null && titleEnc !== "") {
        titleEl.textContent = decodeURIComponent(titleEnc);
      }
      if (descEl && descEnc != null && descEnc !== "") {
        descEl.innerHTML = decodeURIComponent(descEnc);
      }
    } catch {
      if (titleEl && titleEnc != null) titleEl.textContent = titleEnc;
      if (descEl && descEnc != null) descEl.textContent = descEnc;
    }
    if (openBtn) openBtn.textContent = "Join FUSION";
  }

  /** @returns {boolean} */
  _isGateBand() {
    return this.hasAttribute("data-gate-band");
  }

  /**
   * Hide inline / page-level join bands when the user has an Internet Identity session.
   * The header bridge (`data-header-bridge`) stays in the tree so Register / `fusion-open-join-network` still work.
   */
  _shouldHideHostWhenAuthenticated() {
    return !this.hasAttribute("data-header-bridge");
  }

  async _syncPageJoinVisibility() {
    if (this._isStudioPreview()) {
      this.hidden = false;
      return;
    }
    if (!this._shouldHideHostWhenAuthenticated()) {
      this.hidden = false;
      return;
    }
    try {
      const { getAuthSnapshot } = await import("../../utils/icAuth.js");
      const { authenticated } = await getAuthSnapshot();
      this.hidden = authenticated;
    } catch {
      this.hidden = false;
    }
  }

  async _syncBandOpenButtonAuth() {
    if (!this.hasAttribute("data-hide-band-open-when-authenticated")) return;
    const openBtn = this.shadowRoot?.querySelector("#bandOpenBtn");
    if (!openBtn) return;
    try {
      const { getAuthSnapshot } = await import("../../utils/icAuth.js");
      const { authenticated } = await getAuthSnapshot();
      openBtn.hidden = authenticated;
      openBtn.style.display = authenticated ? "none" : "";
    } catch {
      openBtn.hidden = false;
      openBtn.style.display = "";
    }
  }

  _fillBandCopy() {
    this._modalType = resolveModalType(this);
    const titleEl = this.shadowRoot?.querySelector("#bandTitle");
    const descEl = this.shadowRoot?.querySelector("#bandDescription");
    const openBtn = this.shadowRoot?.querySelector("#bandOpenBtn");

    if (this._isGateBand()) {
      this._applyGateBandFromHostAttrs();
      void this._syncBandOpenButtonAuth();
      return;
    }

    const loc = this._getLocale();
    const flowRoot = this._joinNetworkFlow?.[this._modalType];
    const band =
      flowRoot && typeof flowRoot === "object"
        ? /** @type {Record<string, unknown>} */ (flowRoot).band
        : null;
    const flowBand =
      band && typeof band === "object"
        ? /** @type {Record<string, unknown>} */ (band)[loc] || band.en
        : null;
    if (flowBand) {
      if (titleEl) titleEl.textContent = flowBand.title || "";
      if (descEl) descEl.textContent = flowBand.description || "";
      if (openBtn) openBtn.textContent = flowBand.openLabel || "Open";
    } else {
      const fb = this._getBandFallbackCopy();
      if (titleEl) titleEl.textContent = fb.title;
      if (descEl) descEl.textContent = fb.description;
      if (openBtn) openBtn.textContent = "Join FUSION";
    }
  }

  /**
   * @param {JoinSubscriptionTier} tier
   * @param {Record<string, unknown>} payment
   * @param {'en' | 'ja'} loc
   * @returns {{ finalPaymentPrice: string, finalPaymentStatement: string, amount: string, planKey: string, footerNote: string, footerNote2: string }}
   */
  _mergePaymentTierSlice(payment, tier, loc) {
    const pr = asRecord(payment);
    const nested = asRecord(pr[tier]);
    const flatAmount = String(pr.amount ?? "").trim();
    const flatFinal = String(pr.finalPaymentPrice ?? "").trim();
    const flatStmt = String(pr.finalPaymentStatement ?? "").trim();
    const flatPlanKey = String(pr.planKey ?? "").trim();
    const flatFoot1 = String(pr.footerNote ?? "").trim();
    const flatFoot2 = String(pr.footerNote2 ?? "").trim();
    const hasNested =
      nested &&
      Object.keys(nested).some((k) => {
        const v = nested[k];
        return v != null && String(v).trim() !== "";
      });

    /** @type {Record<JoinSubscriptionTier, { price: string, stmt: string, amount: string, planKey: string, foot2: string }>} */
    const tierDefaults = {
      monthly: {
        price: "$30",
        stmt: loc === "ja" ? "月額" : "per month",
        amount: "$30.00",
        planKey: "monthly",
        foot2:
          loc === "ja"
            ? "毎月更新 — プロフィールから解約できます"
            : "Renews monthly — cancel anytime from your profile",
      },
      quarterly: {
        price: "$75",
        stmt: loc === "ja" ? "3か月ごと" : "per quarter",
        amount: "$75.00",
        planKey: "quarterly",
        foot2:
          loc === "ja"
            ? "3か月ごとに更新 — プロフィールから解約できます"
            : "Renews quarterly — cancel anytime from your profile",
      },
      annual: {
        price: "$260",
        stmt: loc === "ja" ? "年間" : "per year",
        amount: "$260.00",
        planKey: "annual",
        foot2:
          loc === "ja"
            ? "年ごとに更新 — プロフィールから解約できます"
            : "Renews annually — cancel anytime from your profile",
      },
    };
    const def = tierDefaults[tier];

    if (!hasNested) {
      return {
        finalPaymentPrice: flatFinal || def.price,
        finalPaymentStatement: flatStmt || def.stmt,
        amount: flatAmount || def.amount,
        planKey: flatPlanKey || def.planKey,
        footerNote: flatFoot1 || (loc === "ja" ? "本日のお支払い" : "First payment today"),
        footerNote2: flatFoot2 || def.foot2,
      };
    }

    return {
      finalPaymentPrice: String(nested.finalPaymentPrice ?? flatFinal).trim(),
      finalPaymentStatement: String(
        nested.finalPaymentStatement ?? flatStmt,
      ).trim(),
      amount: String(nested.amount ?? flatAmount).trim(),
      planKey: String(nested.planKey ?? (flatPlanKey || def.planKey)).trim(),
      footerNote: String(nested.footerNote ?? flatFoot1).trim(),
      footerNote2: String(nested.footerNote2 ?? flatFoot2).trim(),
    };
  }

  /**
   * @param {'en' | 'ja'} loc
   * @returns {{ title: string, displayPrice: string, every: string, subtext: string, subtext2: string, discount: string }}
   */
  _defaultMonthlyPlanCard(loc) {
    return {
      title: loc === "ja" ? "月額メンバーシップ" : "Monthly membership",
      displayPrice: "$30",
      every: loc === "ja" ? "月額" : "per month",
      subtext: loc === "ja" ? "毎月請求" : "Billed monthly",
      subtext2:
        loc === "ja"
          ? "プロフィールからいつでも解約できます"
          : "Flexible — cancel anytime from your profile",
      discount: "",
    };
  }

  /**
   * @param {'en' | 'ja'} loc
   * @returns {{ title: string, displayPrice: string, every: string, subtext: string, subtext2: string, discount: string }}
   */
  _defaultQuarterlyPlanCard(loc) {
    return {
      title: loc === "ja" ? "四半期メンバーシップ" : "Quarterly membership",
      displayPrice: "$75",
      every: loc === "ja" ? "3か月ごと" : "per quarter",
      subtext:
        loc === "ja"
          ? "四半期ごとに1回の応募クレジット"
          : "One application credit per quarter",
      subtext2:
        loc === "ja" ? "未使用分は繰り越されます" : "Unused credits roll over",
      discount: "",
    };
  }

  /**
   * @param {'en' | 'ja'} loc
   * @returns {{ title: string, displayPrice: string, every: string, subtext: string, subtext2: string, discount: string }}
   */
  _defaultAnnualPlanCard(loc) {
    return {
      title: loc === "ja" ? "年間メンバーシップ" : "Annual membership",
      displayPrice: "$260",
      discount: loc === "ja" ? "（10%割引）" : "(10% discount)",
      subtext:
        loc === "ja" ? "お得な1年プラン" : "Best value — one year of full access",
      subtext2: loc === "ja" ? "年ごとに更新" : "Renews every year",
      every: "",
    };
  }

  /**
   * @param {Record<string, unknown>} valueMerged
   * @param {JoinSubscriptionTier} tier
   * @param {'en' | 'ja'} loc
   */
  _mergePlanCardCopy(valueMerged, tier, loc) {
    const vr = valueMerged;
    const renew = String(vr.renewLine ?? "").trim();
    if (tier === "monthly") {
      const pm = asRecord(vr.planMonthly);
      const def = this._defaultMonthlyPlanCard(loc);
      return {
        title: strField(pm, "title") || def.title,
        displayPrice: strField(pm, "displayPrice") || def.displayPrice,
        every: strField(pm, "every") || def.every,
        subtext: strField(pm, "subtext") || renew || def.subtext,
        subtext2: strField(pm, "subtext2") || def.subtext2,
        discount: strField(pm, "discount"),
      };
    }
    if (tier === "quarterly") {
      const pq = asRecord(vr.planQuarterly);
      const def = this._defaultQuarterlyPlanCard(loc);
      return {
        title: strField(pq, "title") || def.title,
        displayPrice: strField(pq, "displayPrice") || def.displayPrice,
        every: strField(pq, "every") || def.every,
        subtext: strField(pq, "subtext") || def.subtext,
        subtext2: strField(pq, "subtext2") || def.subtext2,
        discount: strField(pq, "discount"),
      };
    }
    const pa = asRecord(vr.planAnnual);
    const def = this._defaultAnnualPlanCard(loc);
    return {
      title: strField(pa, "title") || def.title,
      displayPrice: strField(pa, "displayPrice") || def.displayPrice,
      every: strField(pa, "every"),
      subtext: strField(pa, "subtext") || def.subtext,
      subtext2: strField(pa, "subtext2") || def.subtext2,
      discount: strField(pa, "discount") || def.discount,
    };
  }

  /**
   * @param {Record<string, unknown>} valueMerged
   * @param {'en' | 'ja'} loc
   */
  _fillJoinPlanCards(valueMerged, loc) {
    const root = this.shadowRoot;
    if (!root) return;
    const vr = valueMerged;
    const gl = this.shadowRoot?.querySelector("#jnPlanGroupLabel");
    if (gl) {
      const g = String(vr.planGroupLabel ?? "").trim();
      gl.textContent =
        g || (loc === "ja" ? "メンバーシップを選択" : "Choose your membership");
    }

    const mo = this._mergePlanCardCopy(vr, "monthly", loc);
    const qu = this._mergePlanCardCopy(vr, "quarterly", loc);
    const an = this._mergePlanCardCopy(vr, "annual", loc);

    const set = (sel, text) => {
      const n = root.querySelector(sel);
      if (n) n.textContent = text ?? "";
    };
    set("#jnPlanMonthlyTitle", mo.title);
    set("#jnPlanMonthlyPrice", mo.displayPrice);
    const moEvery = root.querySelector("#jnPlanMonthlyEvery");
    if (moEvery) moEvery.textContent = mo.every;
    set("#jnPlanMonthlySub1", mo.subtext);
    set("#jnPlanMonthlySub2", mo.subtext2);

    set("#jnPlanQuarterlyTitle", qu.title);
    set("#jnPlanQuarterlyPrice", qu.displayPrice);
    const quEvery = root.querySelector("#jnPlanQuarterlyEvery");
    if (quEvery) quEvery.textContent = qu.every;
    set("#jnPlanQuarterlySub1", qu.subtext);
    set("#jnPlanQuarterlySub2", qu.subtext2);

    set("#jnPlanAnnualTitle", an.title);
    set("#jnPlanAnnualPrice", an.displayPrice);
    const anDisc = root.querySelector("#jnPlanAnnualDiscount");
    if (anDisc instanceof HTMLElement) {
      const d = String(an.discount ?? "").trim();
      anDisc.textContent = d;
      anDisc.hidden = !d;
    }
    set("#jnPlanAnnualSub1", an.subtext);
    set("#jnPlanAnnualSub2", an.subtext2);

    const badge = root.querySelector("#jnPlanMonthlyBadge");
    if (badge instanceof HTMLElement) {
      badge.textContent =
        loc === "ja" ? "おすすめ" : "Popular";
    }

    this._syncJoinPlanSelectionUi();
  }

  /** Build tier slices from CMS if missing (e.g. race before `payment` block ran). */
  _ensureJoinPaymentTierSlices() {
    if (this._joinPaymentTierSlices) return;
    const flow = this._joinNetworkFlow;
    if (!flow || typeof flow !== "object") return;
    const payment = getFlowSlice(
      flow,
      this._modalType,
      "payment",
      this._getLocale(),
    );
    if (!payment || typeof payment !== "object") return;
    const pObj = /** @type {Record<string, unknown>} */ (payment);
    const loc = this._getLocale();
    this._joinPaymentTierSlices = {
      monthly: this._mergePaymentTierSlice(pObj, "monthly", loc),
      quarterly: this._mergePaymentTierSlice(pObj, "quarterly", loc),
      annual: this._mergePaymentTierSlice(pObj, "annual", loc),
    };
  }

  /** Apply tier-specific strings to the payment summary (before Stripe mounts). */
  _applyPaymentCopyForTier(tier) {
    const root = this.shadowRoot;
    if (!root) return;
    this._ensureJoinPaymentTierSlices();
    const slices = this._joinPaymentTierSlices;
    if (!slices) return;
    const sl = slices[tier];
    if (!sl) return;

    const set = (sel, text) => {
      const n = root.querySelector(sel);
      if (n) n.textContent = text ?? "";
    };
    const loc = this._getLocale();
    /** @type {Record<JoinSubscriptionTier, { price: string, stmt: string, amount: string }>} */
    const fallbacks = {
      monthly: {
        price: "$30",
        stmt: loc === "ja" ? "月額" : "per month",
        amount: "30",
      },
      quarterly: {
        price: "$75",
        stmt: loc === "ja" ? "3か月ごと" : "per quarter",
        amount: "75",
      },
      annual: {
        price: "$260",
        stmt: loc === "ja" ? "年間" : "per year",
        amount: "260",
      },
    };
    const fb = fallbacks[tier];
    const price = String(sl.finalPaymentPrice ?? "").trim() || fb.price;
    const stmt = String(sl.finalPaymentStatement ?? "").trim() || fb.stmt;
    set("#jnFinalPaymentPrice", price);
    set("#final-payment-statement", stmt);
    set("#jnPayFooter", sl.footerNote);
    const pf2 = root.querySelector("#jnPayFooter2");
    if (pf2) {
      pf2.textContent = sl.footerNote2;
      pf2.hidden = !String(sl.footerNote2 || "").trim();
    }
    this._paymentAmountCents = parseMoneyToCents(
      String(sl.amount ?? "").trim() || fb.amount,
    );
    if (sl.planKey) this._paymentPlanKey = sl.planKey;
    this._paymentPlanLabel = stmt || tier;
  }

  /** What's included (global + plan) — mirrors program application `details` pattern. */
  _hydrateJoinWhatsIncluded() {
    const root = this.shadowRoot;
    if (!root) return;
    const loc = this._getLocale();
    const vr = this._joinValueMergedCache;
    const L =
      loc === "ja"
        ? {
            summary: "メンバーシップに含まれるもの",
            globalHead: "すべてのプランに共通",
            planHead: "このプランに含まれるもの",
            pickPlan:
              "プラン固有の内容を表示するには、上で支払いプランを選んでください。",
            globalEmpty:
              "（グローバル項目は Studio → Services → Subscription で設定できます。）",
          }
        : {
            summary: "What's included in your membership",
            globalHead: "Included with every plan",
            planHead: "Included with this plan",
            pickPlan: "Select a payment plan above to see plan-specific items.",
            globalEmpty:
              "(No global items yet — configure under Studio → Services → Subscription.)",
          };

    const sum = root.querySelector("#jnWhatsIncludedSummary");
    if (sum) sum.textContent = L.summary;
    const gh = root.querySelector("#jnWhatsIncludedGlobalHead");
    if (gh) gh.textContent = L.globalHead;
    const ph = root.querySelector("#jnWhatsIncludedPlanHead");
    if (ph) ph.textContent = L.planHead;

    const gUl = root.querySelector("#jnWhatsIncludedGlobalUl");
    const pUl = root.querySelector("#jnWhatsIncludedPlanUl");
    const planBlock = root.querySelector("#jnWhatsIncludedPlanBlock");

    const globalBullets = this._joinWhatsIncludedGlobalBullets || [];
    if (gUl) {
      gUl.innerHTML = "";
      if (globalBullets.length === 0) {
        const li = document.createElement("li");
        li.className = "jn-whats-included-empty";
        li.textContent = L.globalEmpty;
        gUl.appendChild(li);
      } else {
        for (const t of globalBullets) {
          const li = document.createElement("li");
          li.textContent = t;
          gUl.appendChild(li);
        }
      }
    }

    const tier = this._joinSubscriptionTier;
    /** @type {string[]} */
    let planBullets = [];
    if (tier && vr) {
      const pk =
        tier === "annual"
          ? "planAnnual"
          : tier === "quarterly"
            ? "planQuarterly"
            : "planMonthly";
      const po = asRecord(vr[pk]);
      const ib = po.includedBullets;
      if (Array.isArray(ib) && ib.length > 0) {
        planBullets = ib.map((x) => String(x ?? "").trim()).filter(Boolean);
      } else if (Array.isArray(vr.includes)) {
        planBullets = vr.includes.map((x) => String(x ?? "").trim()).filter(Boolean);
      }
    }

    if (pUl && planBlock) {
      pUl.innerHTML = "";
      if (!tier) {
        planBlock.hidden = false;
        const li = document.createElement("li");
        li.className = "jn-whats-included-empty";
        li.textContent = L.pickPlan;
        pUl.appendChild(li);
      } else if (planBullets.length === 0) {
        planBlock.hidden = true;
      } else {
        planBlock.hidden = false;
        for (const t of planBullets) {
          const li = document.createElement("li");
          li.textContent = t;
          pUl.appendChild(li);
        }
      }
    }
  }

  _syncJoinPlanSelectionUi() {
    const root = this.shadowRoot;
    if (!root) return;
    const tier = this._joinSubscriptionTier;
    root.querySelectorAll("[data-jn-subscription-tier]").forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      const t = el.getAttribute("data-jn-subscription-tier");
      const on = tier != null && t === tier;
      el.classList.toggle("jn-plan-card--selected", on);
      el.setAttribute("aria-checked", on ? "true" : "false");
    });
    const vc = root.querySelector("#jnValueContinue");
    if (vc instanceof HTMLButtonElement) {
      vc.disabled = tier == null;
    }
    this._hydrateJoinWhatsIncluded();
  }

  _fillDialogCopy() {
    this._modalType = resolveModalType(this);
    this._paymentPlanKey = null;
    this._paymentPlanLabel = null;
    const loc = this._getLocale();
    const mt = this._modalType;

    const flow = this._joinNetworkFlow;
    const entry = getFlowSlice(flow, mt, "entry", loc);
    const value = getFlowSlice(flow, mt, "value", loc);
    const payment = getFlowSlice(flow, mt, "payment", loc);
    const linkAccount = getFlowSlice(flow, mt, "linkAccount", loc);
    const conf = getFlowSlice(flow, mt, "confirmation", loc);

    const set = (sel, text) => {
      const n = this.shadowRoot?.querySelector(sel);
      if (n) n.textContent = text ?? "";
    };

    if (entry) {
      set("#jnEntryTitle", entry.dialogTitle);
      set("#jnEntrySubtitle", entry.subtitle);
      set("#jnRenewHint", entry.renewHint);
      const entryFoot = this.shadowRoot?.querySelector("#jnEntryFooter");
      if (entryFoot) {
        const fd = entry.footerDisclaimer ?? "";
        entryFoot.textContent = fd;
        entryFoot.style.whiteSpace = fd.includes("\n") ? "pre-line" : "";
      }
      const inpFn = this.shadowRoot?.querySelector("#jnFirstName");
      const inpLn = this.shadowRoot?.querySelector("#jnLastName");
      const inpEmail = this.shadowRoot?.querySelector("#jnEmail");
      const acLab = this.shadowRoot?.querySelector("#jnAccessCodeLabel");
      const inpAc = this.shadowRoot?.querySelector("#jnAccessCode");
      const labFn = this.shadowRoot?.querySelector("#jnFirstNameLabel");
      const labLn = this.shadowRoot?.querySelector("#jnLastNameLabel");
      const labEm = this.shadowRoot?.querySelector("#jnEmailLabel");
      if (labFn) {
        labFn.textContent =
          String(entry.firstNameLabel ?? "").trim() ||
          (loc === "ja" ? "名" : "First name");
      }
      if (labLn) {
        labLn.textContent =
          String(entry.lastNameLabel ?? "").trim() ||
          (loc === "ja" ? "姓" : "Last name");
      }
      if (labEm) {
        labEm.textContent =
          String(entry.emailLabel ?? "").trim() ||
          (loc === "ja" ? "メール" : "Email");
      }
      if (inpFn) inpFn.placeholder = entry.firstNamePlaceholder || "";
      if (inpLn) inpLn.placeholder = entry.lastNamePlaceholder || "";
      if (inpEmail) inpEmail.placeholder = entry.emailPlaceholder || "";
      const accessLabelText =
        String(entry.accessCodeLabel ?? "").trim() ||
        (loc === "ja" ? "アクセスコード（任意）" : "Access code (optional)");
      if (acLab instanceof HTMLElement) {
        acLab.textContent = accessLabelText;
        acLab.hidden = false;
      }
      if (inpAc instanceof HTMLInputElement) {
        inpAc.placeholder = entry.accessCodePlaceholder || "";
        inpAc.setAttribute("aria-label", accessLabelText);
      }
      set("#jnRoleLabel", entry.roleLabel);
      const ec = this.shadowRoot?.querySelector("#jnEntryContinue");
      if (ec) ec.textContent = entry.continueLabel || "Continue";
    }

    if (value) {
      const vo = /** @type {Record<string, unknown>} */ (value);
      this._joinValueMergedCache = vo;
      set("#jnValueTitle", vo.title);
      set("#jnValueLead", vo.lead);
      const ev = this.shadowRoot?.querySelector("#jnValueEvolving");
      const evo =
        typeof vo.evolvingLine === "string" ? vo.evolvingLine.trim() : "";
      if (ev) {
        ev.textContent = evo;
        ev.hidden = !evo;
      }
      let d1 = vo.disclaimer ?? "";
      let d2 = vo.disclaimerFee ?? "";
      if (!String(d2).trim() && String(d1).includes("Program fee")) {
        const idx = d1.indexOf("Program fee");
        if (idx > 0) {
          d2 = d1.slice(idx).trim();
          d1 = d1
            .slice(0, idx)
            .replace(/\.\s*$/, "")
            .trim();
        }
      }
      set("#jnValueDisclaimer", d1);
      set("#jnValueDisclaimerFee", d2);
      const feeEl = this.shadowRoot?.querySelector("#jnValueDisclaimerFee");
      if (feeEl) feeEl.hidden = !String(d2 || "").trim();
      const vc = this.shadowRoot?.querySelector("#jnValueContinue");
      if (vc) vc.textContent = vo.continueLabel || "Continue";
      const vb = this.shadowRoot?.querySelector("#jnValueBack");
      if (vb) vb.textContent = vo.backLabel || "← Back";
      this._fillJoinPlanCards(vo, loc);
      {
        const pl = String(vo.periodLabel ?? "").trim();
        if (pl) this._paymentPlanLabel = pl;
      }
    } else {
      this._joinValueMergedCache = null;
    }

    if (payment) {
      const pObj = /** @type {Record<string, unknown>} */ (payment);
      this._joinPaymentTierSlices = {
        monthly: this._mergePaymentTierSlice(pObj, "monthly", loc),
        quarterly: this._mergePaymentTierSlice(pObj, "quarterly", loc),
        annual: this._mergePaymentTierSlice(pObj, "annual", loc),
      };
      {
        const pk =
          payment && "planKey" in payment
            ? /** @type {Record<string, unknown>} */ (payment).planKey
            : "";
        if (typeof pk === "string" && pk.trim()) {
          this._paymentPlanKey = pk.trim();
        }
      }
      this._paymentCompleteLabel = payment.completeLabel || "Secure Access";
      this._paymentProcessingLabel =
        typeof payment.processingLabel === "string"
          ? payment.processingLabel
          : "Processing…";
      set("#jnPayTitle", payment.title);
      set("#jnPaySubtitle", payment.subtitle);
      set("#jnOrderBrand", payment.orderLabel);
      const brandEl = this.shadowRoot?.querySelector("#jnOrderBrand");
      if (brandEl) brandEl.hidden = !String(payment.orderLabel ?? "").trim();
      set("#jnPayComplete", payment.completeLabel);
      const devSkip = this.shadowRoot?.querySelector("#jnPayDevSkip");
      if (devSkip && payment.devCompleteLabel) {
        devSkip.textContent = payment.devCompleteLabel;
      }
      const pb = this.shadowRoot?.querySelector("#jnPayBack");
      if (pb) pb.textContent = payment.backLabel || "← Back";

      if (this._joinMode === "resubscribe") {
        this._paymentAmountCents = parseMoneyToCents(payment.amount);
        const priceStr =
          typeof payment.finalPaymentPrice === "string" &&
          payment.finalPaymentPrice.trim()
            ? payment.finalPaymentPrice.trim()
            : typeof payment.amount === "string"
              ? payment.amount.replace(/\.00(?=\s*$)/, "").trim()
              : "";
        const stmtStr =
          typeof payment.finalPaymentStatement === "string" &&
          payment.finalPaymentStatement.trim()
            ? payment.finalPaymentStatement.trim()
            : String(payment.lineRenew || payment.line3Months || "").trim();
        set("#jnFinalPaymentPrice", priceStr);
        set("#final-payment-statement", stmtStr);
        set("#jnPayFooter", payment.footerNote ?? "");
        const pf2 = this.shadowRoot?.querySelector("#jnPayFooter2");
        if (pf2) {
          const t2 = payment.footerNote2 ?? "";
          pf2.textContent = t2;
          pf2.hidden = !String(t2).trim();
        }
      } else if (this._joinSubscriptionTier) {
        this._applyPaymentCopyForTier(this._joinSubscriptionTier);
      } else {
        set("#jnFinalPaymentPrice", "—");
        set("#final-payment-statement", "");
        set("#jnPayFooter", "");
        const pf2e = this.shadowRoot?.querySelector("#jnPayFooter2");
        if (pf2e) {
          pf2e.textContent = "";
          pf2e.hidden = true;
        }
      }
    } else {
      this._joinPaymentTierSlices = null;
    }

    {
      /** @type {Record<string, string>} */
      let la =
        linkAccount ||
        (loc === "ja"
          ? {
              paymentSuccessLine: "お支払いが完了しました。",
              iiExplainer:
                "Internet Identity はパスワードを使わず、このアクセスをあなたのログインに安全に紐づけます。",
              linkKicker: "",
              title: "アカウントをリンク",
              lead: "Internet Identity でサインインし、アクセスをログインに紐づけてください。",
              help: "",
              signInLabel: "Internet Identity で続行",
            }
          : {
              paymentSuccessLine: "Payment successful.",
              iiExplainer:
                "Internet Identity ties this access to a secure login—no separate Fusion password.",
              linkKicker: "",
              title: "Activate your access",
              lead: "Sign in with Internet Identity to link your access to your login.",
              help: "",
              signInLabel: "Continue with Internet Identity",
            });
      if (this._joinExemptCodePath) {
        const ex = getFlowSlice(flow, mt, "linkAccountExempt", loc);
        if (ex && typeof ex === "object") {
          for (const k of [
            "paymentSuccessLine",
            "iiExplainer",
            "linkKicker",
            "title",
            "lead",
            "help",
            "signInLabel",
          ]) {
            const v = /** @type {Record<string, unknown>} */ (ex)[k];
            if (v != null && String(v).trim() !== "") {
              la[/** @type {keyof typeof la} */ (k)] = String(v);
            }
          }
        } else {
          la =
            loc === "ja"
              ? {
                  paymentSuccessLine: "",
                  iiExplainer:
                    "Internet Identity はパスワードを使わず、あなたのログインに安全に紐づけます。",
                  linkKicker: "",
                  title: "登録を完了",
                  lead: "Internet Identity でサインインすると、アクセスコードでアカウントが有効になります。すでにサインイン済みの場合は自動で完了します。",
                  help: "",
                  signInLabel: "Internet Identity で続行",
                }
              : {
                  paymentSuccessLine: "",
                  iiExplainer:
                    "Internet Identity ties your membership to a secure login—no separate Fusion password.",
                  linkKicker: "",
                  title: "Sign in to complete registration",
                  lead: "Sign in with Internet Identity to activate your membership with this access code. If you are already signed in, we will finish automatically.",
                  help: "",
                  signInLabel: "Continue with Internet Identity",
                };
        }
      }
      set("#jnLinkPaymentOk", la.paymentSuccessLine ?? "");
      const payOk = this.shadowRoot?.querySelector("#jnLinkPaymentOk");
      if (payOk) payOk.hidden = !String(la.paymentSuccessLine ?? "").trim();
      set("#jnLinkIiWhy", la.iiExplainer ?? "");
      const iiWhy = this.shadowRoot?.querySelector("#jnLinkIiWhy");
      if (iiWhy) iiWhy.hidden = !String(la.iiExplainer ?? "").trim();
      set("#jnLinkKicker", la.linkKicker ?? "");
      const kick = this.shadowRoot?.querySelector("#jnLinkKicker");
      if (kick) kick.hidden = !String(la.linkKicker ?? "").trim();
      set("#jnLinkTitle", la.title);
      set("#jnLinkLead", la.lead);
      set("#jnLinkHelp", la.help ?? "");
      const helpEl = this.shadowRoot?.querySelector("#jnLinkHelp");
      if (helpEl) helpEl.hidden = !String(la.help ?? "").trim();
      const linkStat = this.shadowRoot?.querySelector("#jnLinkLinking");
      if (linkStat) {
        linkStat.textContent = "";
        linkStat.hidden = true;
      }
      const si = this.shadowRoot?.querySelector("#jnLinkSignIn");
      if (si) {
        si.textContent = la.signInLabel || "Continue with Internet Identity";
        si.hidden = false;
      }
    }

    if (conf) {
      set("#jnConfTitle", conf.title);
      set("#jnWelcomeTitle", conf.welcomeTitle);
      set("#jnWelcomeBody", conf.welcomeBody);
      const pc = this.shadowRoot?.querySelector("#jnPrimaryCta");
      if (pc) pc.textContent = conf.primaryCta || "";
      const ar = this.shadowRoot?.querySelector("#jnApplyResidency");
      const arLabel = conf.applyResidencyLabel;
      if (ar) {
        ar.textContent =
          typeof arLabel === "string" ? arLabel : "Apply to Residency";
        ar.hidden = !String(arLabel || "").trim();
      }
      set("#jnSecondaryLine", conf.secondaryLine);
      const wrap = this.shadowRoot?.querySelector("#jnConfLinks");
      if (wrap && Array.isArray(conf.links)) {
        wrap.innerHTML = conf.links
          .map(
            (l) =>
              `<a href="${l.href}" class="jn-link" data-href="${l.href}">${l.label}</a>`,
          )
          .join("");
      }
    }

    this._showStage(this._stage);
  }

  /**
   * @param {FlowStage} stage
   */
  _showStage(stage) {
    const prev = this._stage;
    this._stage = stage;
    const root = this.shadowRoot;
    if (!root) return;
    if (prev === "payment" && stage !== "payment") {
      this._stripePrepareGen += 1;
      this._teardownStripePayment();
    }
    STAGES.forEach((s) => {
      const panel = root.querySelector(`[data-jn-panel="${s}"]`);
      if (panel) panel.hidden = s !== stage;
    });
    if (stage === "value") {
      this._syncJoinPlanSelectionUi();
    }
    if (stage === "payment") {
      if (
        this._joinMode !== "resubscribe" &&
        this._joinSubscriptionTier &&
        JOIN_SUBSCRIPTION_TIERS.includes(this._joinSubscriptionTier)
      ) {
        this._applyPaymentCopyForTier(this._joinSubscriptionTier);
      }
      const payEmailWrap = root.querySelector("#jnPayEmailWrap");
      if (payEmailWrap) {
        payEmailWrap.hidden = this._joinMode !== "resubscribe";
      }
      const payBack = root.querySelector("#jnPayBack");
      if (payBack) {
        payBack.hidden = this._joinMode === "resubscribe";
      }
      if (this._isStudioPreview()) {
        const stripeMount = this.querySelector("[data-jn-stripe-mount]");
        if (stripeMount instanceof HTMLElement) {
          stripeMount.innerHTML =
            '<p class="jn-studio-stripe-placeholder">Stripe preview (disabled in Studio)</p>';
        }
        return;
      }
      // `_fillDialogCopy` ends with `_showStage(this._stage)` (e.g. on locale change). Re-running
      // prepare would tear down and create a second Subscription clientSecret — only init when needed.
      const stillOnPayment = prev === "payment";
      const nextKey = this._computeStripePrepareKeySync();
      const canReuseStripe =
        stillOnPayment &&
        this._stripePaymentReady &&
        this._stripePrepareKey === nextKey;
      if (!canReuseStripe) {
        void this._prepareStripePayment();
      }
    }
    if (stage === "linkAccount") {
      void this._tryCompletePendingLink();
    }
  }

  _computeStripePrepareKeySync() {
    const email = this._getEmailForSubscription();
    const tierPart =
      this._joinMode === "resubscribe"
        ? "resubscribe"
        : this._joinSubscriptionTier || "";
    return `${this._joinMode}|${this._modalType}|${email}|${tierPart}`;
  }

  /** Email for Stripe customer + metadata (entry field or resubscribe-only `#jnPayEmail`). */
  _getEmailForSubscription() {
    const root = this.shadowRoot;
    return (
      root?.querySelector("#jnPayEmail")?.value ||
      root?.querySelector("#jnEmail")?.value ||
      this._formEmail ||
      ""
    ).trim();
  }

  /** First + last from inputs or saved step-1 state (for early access + profile draft). */
  _concatProfileFullName() {
    const r = this.shadowRoot;
    const fn = (
      r?.querySelector("#jnFirstName")?.value ||
      this._formFirstName ||
      ""
    ).trim();
    const ln = (
      r?.querySelector("#jnLastName")?.value ||
      this._formLastName ||
      ""
    ).trim();
    return `${fn} ${ln}`.trim();
  }

  /**
   * Resubscribe: requires II only (existing member).
   * Full join: anonymous early-access only — payment first, then II + `registerOrUpdateAccount` after link step.
   */
  async _ensureAccountBeforeStripe() {
    const { getIdentityIfAuthenticated } =
      await import("../../utils/icAuth.js");
    if (this._joinMode === "resubscribe") {
      const identity = await getIdentityIfAuthenticated();
      if (!identity) {
        throw new Error("Sign in with Internet Identity to continue.");
      }
      this._preStripeCanisterSyncDone = true;
      return;
    }
    const email = this._getEmailForSubscription();
    const cat = this._getSelectedCategoryNormalized();
    const fullName = this._concatProfileFullName();
    if (!email.includes("@") || !cat) {
      throw new Error(
        "Complete first name, last name, email, and role on step 1 first.",
      );
    }
    await submitEarlyAccessToCanister(email, cat, fullName, this._modalType);
    this._preStripeCanisterSyncDone = false;
  }

  /**
   * Header bridge keeps the dialog hidden until link step needs user attention.
   */
  _ensureJoinDialogVisible() {
    const root = this.shadowRoot;
    const dlg = root?.querySelector(".jn-dialog");
    if (dlg && typeof dlg.showModal === "function" && !dlg.open) {
      dlg.showModal();
    }
  }

  /**
   * After pay-first checkout + II sign-in: link Stripe subscription to principal, register account, finish confirmation.
   */
  async _tryCompletePendingLink() {
    if (!this._isActivePendingMembershipLinkFlow()) {
      try {
        const { getIdentityIfAuthenticated } =
          await import("../../utils/icAuth.js");
        const identity = await getIdentityIfAuthenticated();
        if (identity) {
          const { getAccountForCaller } =
            await import("../../utils/database.js");
          const acc = await getAccountForCaller();
          if (acc) {
            clearJoinPendingMembershipStorage();
          }
        }
      } catch {
        /* ignore */
      }
      return;
    }

    if (!this._fusionPendingId) {
      this._restorePendingMembershipFromStorage();
    }
    if (this._stage !== "linkAccount") {
      this._stage = "linkAccount";
      const stageRoot = this.shadowRoot;
      if (stageRoot) {
        STAGES.forEach((s) => {
          const panel = stageRoot.querySelector(`[data-jn-panel="${s}"]`);
          if (panel) panel.hidden = s !== "linkAccount";
        });
      }
    }
    if (this._joinExemptCodePath) {
      await this._tryCompleteExemptAccessCodeJoin();
      return;
    }
    if (!this._fusionPendingId) return;
    if (this._pendingLinkInFlight) return;
    this._pendingLinkInFlight = true;
    const root = this.shadowRoot;
    const errEl = root?.querySelector("#jnLinkErr");
    const linkingEl = root?.querySelector("#jnLinkLinking");
    const signInBtn = root?.querySelector("#jnLinkSignIn");
    if (errEl) errEl.textContent = "";
    try {
      const { getIdentityIfAuthenticated } =
        await import("../../utils/icAuth.js");
      const identity = await getIdentityIfAuthenticated();
      if (!identity) return;
      if (linkingEl) {
        linkingEl.textContent = "Linking your access…";
        linkingEl.hidden = false;
      }
      if (signInBtn) signInBtn.hidden = true;
      const principal = identity.getPrincipal().toText();
      const email = this._getEmailForSubscription();
      identifyPosthogAfterInternetIdentityLogin(principal, {
        email,
        firstName: this._formFirstName,
        lastName: this._formLastName,
      });
      // Must create UserAccount before PayPal/Stripe link — canister
      // integrationRecord*Subscription traps with "No account for member principal".
      const cat = this._getSelectedCategoryNormalized();
      const { getAuthenticatedFusionBackendActor } =
        await import("../../utils/earlyAccessSubscribe.js");
      const { categoryToUserRole } = await import("../../utils/authHeader.js");
      const actor = await getAuthenticatedFusionBackendActor();
      if (actor && typeof actor.registerOrUpdateAccount === "function") {
        await actor.registerOrUpdateAccount(categoryToUserRole(cat));
      }
      await (getActiveProvider() === "paypal"
        ? linkPayPalSubscriptionToPrincipal({
            fusionPendingId: this._fusionPendingId,
            email,
            principal,
            subscriptionId: this._fusionSubscriptionId || undefined,
          })
        : linkSubscriptionToPrincipal({
            fusionPendingId: this._fusionPendingId,
            email,
            principal,
            subscriptionId: this._fusionSubscriptionId || undefined,
          }));
      setStoredBillingEmailForPrincipal(principal, email);
      clearPendingPaymentEmailLocal("join");
      try {
        const { setMyAccountContactForCaller } =
          await import("../../utils/database.js");
        await setMyAccountContactForCaller({
          firstName: this._formFirstName,
          lastName: this._formLastName,
          email,
        });
      } catch (contactErr) {
        if (DEV_MODE)
          console.warn("[JoinNetwork] setMyAccountContact", contactErr);
      }
      try {
        const { ensureMyLinkedArtistProfile } =
          await import("../../utils/database.js");
        await ensureMyLinkedArtistProfile();
        const { maybeSeedLocalesFromProfileSetupDraftIfEmpty } = await import(
          "../../utils/profileSetupSeedLocales.js"
        );
        await maybeSeedLocalesFromProfileSetupDraftIfEmpty();
      } catch (ensErr) {
        if (DEV_MODE)
          console.warn("[JoinNetwork] ensureMyLinkedArtistProfile", ensErr);
      }
      this._fusionPendingId = null;
      this._fusionSubscriptionId = null;
      this._preStripeCanisterSyncDone = true;
      try {
        sessionStorage.removeItem(FUSION_PENDING_MEMBERSHIP_LINK_KEY);
      } catch {
        /* ignore */
      }
      clearPendingMembershipPayload();
      await this._afterJoinSaved();
      if (
        this.hasAttribute("data-header-bridge") &&
        hasActiveJoinMembershipLinkSession()
      ) {
        this._ensureJoinDialogVisible();
      }
    } catch (e) {
      if (DEV_MODE) console.error("[JoinNetwork] link pending", e);
      if (
        this.hasAttribute("data-header-bridge") &&
        hasActiveJoinMembershipLinkSession()
      ) {
        this._ensureJoinDialogVisible();
      }
      if (linkingEl) {
        linkingEl.textContent = "";
        linkingEl.hidden = true;
      }
      if (signInBtn) signInBtn.hidden = false;
      if (errEl) {
        errEl.textContent =
          e instanceof Error
            ? e.message
            : "Could not link your account. Try again.";
      }
    } finally {
      this._pendingLinkInFlight = false;
    }
  }

  /**
   * Access-code exempt path: after II, redeem code on the canister (no Stripe / pending id).
   */
  async _tryCompleteExemptAccessCodeJoin() {
    const root = this.shadowRoot;
    const errEl = root?.querySelector("#jnLinkErr");
    const linkingEl = root?.querySelector("#jnLinkLinking");
    const signInBtn = root?.querySelector("#jnLinkSignIn");
    if (errEl) errEl.textContent = "";
    let code = "";
    try {
      code = normalizeJoinAccessCodeInput(
        sessionStorage.getItem(PENDING_JOIN_ACCESS_CODE_KEY) || "",
      );
    } catch {
      code = "";
    }
    if (code.length !== 8) {
      if (errEl)
        errEl.textContent =
          "Missing or invalid access code. Close and start again from step 1.";
      return;
    }
    if (this._exemptAccessCodeJoinInFlight) return;
    this._exemptAccessCodeJoinInFlight = true;
    try {
      const { getIdentityIfAuthenticated } =
        await import("../../utils/icAuth.js");
      const identity = await getIdentityIfAuthenticated();
      if (!identity) return;
      if (linkingEl) {
        linkingEl.textContent = "Completing registration…";
        linkingEl.hidden = false;
      }
      if (signInBtn) signInBtn.hidden = true;
      const cat = this._getSelectedCategoryNormalized();
      const { categoryToUserRole } = await import("../../utils/authHeader.js");
      const { registerWithJoinAccessCodeForCaller } =
        await import("../../utils/database.js");
      const email = this._getEmailForSubscription() || this._formEmail.trim();
      const outcome = await registerWithJoinAccessCodeForCaller(
        categoryToUserRole(cat),
        code,
        this._formFirstName,
        this._formLastName,
        email,
      );
      if (outcome !== "ok") {
        const map = {
          invalidCode: "This access code is not valid.",
          wrongRole:
            "This code does not match the role you selected. Choose the role your invite was issued for (Artist, Gallery, Curator, or Collector). Team invites use the dedicated join page.",
          artistAlreadyLinked: "This artist profile is already linked to another account.",
          accountExists: "This Internet Identity already has a Fusion account.",
          inviteInactive: "This invite code has already been used or is inactive.",
          unknown: "Registration could not be completed. Try again.",
        };
        if (linkingEl) {
          linkingEl.textContent = "";
          linkingEl.hidden = true;
        }
        if (signInBtn) signInBtn.hidden = false;
        if (errEl) errEl.textContent = map[outcome] || map.unknown;
        return;
      }
      try {
        const { clearAuthenticatedFusionBackendActorCache } = await import(
          "../../utils/earlyAccessSubscribe.js"
        );
        const { dispatchFusionAuthChange } = await import("../../utils/icAuth.js");
        clearAuthenticatedFusionBackendActorCache();
        await dispatchFusionAuthChange();
      } catch (authErr) {
        if (DEV_MODE) console.warn("[JoinNetwork] post-register auth refresh", authErr);
      }
      try {
        sessionStorage.removeItem(PENDING_JOIN_ACCESS_CODE_KEY);
      } catch {
        /* ignore */
      }
      this._joinExemptCodePath = false;
      try {
        const { ensureMyLinkedArtistProfile } =
          await import("../../utils/database.js");
        await ensureMyLinkedArtistProfile();
        const { maybeSeedLocalesFromProfileSetupDraftIfEmpty } = await import(
          "../../utils/profileSetupSeedLocales.js"
        );
        await maybeSeedLocalesFromProfileSetupDraftIfEmpty();
      } catch (ensErr) {
        if (DEV_MODE)
          console.warn("[JoinNetwork] ensureMyLinkedArtistProfile", ensErr);
      }
      await this._afterExemptJoinSaved();
    } catch (e) {
      if (DEV_MODE) console.error("[JoinNetwork] exempt join", e);
      if (linkingEl) {
        linkingEl.textContent = "";
        linkingEl.hidden = true;
      }
      if (signInBtn) signInBtn.hidden = false;
      if (errEl) {
        errEl.textContent =
          e instanceof Error
            ? e.message
            : "Could not complete registration. Try again.";
      }
    } finally {
      this._exemptAccessCodeJoinInFlight = false;
    }
  }

  /** Tail for exempt access-code registration (early access already saved at step 1). */
  async _afterExemptJoinSaved() {
    const root = this.shadowRoot;
    const email = this._getEmailForSubscription() || this._formEmail.trim();
    const fullName = this._concatProfileFullName();
    saveProfileSetupDraft({
      firstName: this._formFirstName,
      lastName: this._formLastName,
      fullName,
      email,
    });
    this._preStripeCanisterSyncDone = false;
    if (email.includes("@")) {
      try {
        await sendEmail({
          to: email,
          subject: "You're in — Fusion membership active",
          text: [
            "Your Fusion account is active with the access code you used.",
            "",
            "You signed in with Internet Identity — use the same login to return.",
            "",
            "Questions? Reply to this email or use Contact on the site.",
          ].join("\n"),
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(
          "[JoinNetwork] confirmation email failed (signup still saved):",
          msg,
        );
      }
    }
    posthog.capture("join_access_code_redeemed", {
      modal_type:
        this._modalType || this.getAttribute("data-modal-type") || "membership",
      ads_conversion: "CompleteRegistration",
    });
    metaTrack("CompleteRegistration", { content_name: "access_code_exempt" });
    this._joinFlowCompleted = true;
    this._showStage("confirmation");
  }

  /**
   * Sent immediately after Stripe payment, before Internet Identity link completes.
   * @param {string} email
   */
  async _sendPostPaymentLinkInternetIdentityEmail(email) {
    const em = String(email || "").trim();
    if (!em.includes("@")) return;
    try {
      await sendEmail({
        to: em,
        subject: "You're in — next: link Internet Identity",
        text: [
          "Thanks — your Fusion membership payment is recorded.",
          "",
          "One more step: open fusionart.world and choose Register (or Sign in), then continue with Internet Identity using the same browser.",
          "That links your payment to a login you can reuse.",
          "",
          "If Internet Identity doesn't open, try again in the same browser or use Register with this email.",
          "",
          "Questions? Reply to this email or use Contact on the site.",
        ].join("\n"),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[JoinNetwork] post-payment email failed:", msg);
    }
  }

  /**
   * Shared tail: optional early-access + register (when `_preStripeCanisterSyncDone` is false), welcome email, confirmation stage.
   */
  async _afterJoinSaved() {
    const root = this.shadowRoot;
    const email = this._getEmailForSubscription() || this._formEmail.trim();
    const cat = this._getSelectedCategoryNormalized();
    const fullName = this._concatProfileFullName();
    saveProfileSetupDraft({
      firstName: this._formFirstName,
      lastName: this._formLastName,
      fullName,
      email,
    });
    if (!this._preStripeCanisterSyncDone) {
      try {
        await submitEarlyAccessToCanister(
          email,
          cat,
          fullName,
          this._modalType,
        );
        syncPosthogConversionPerson({
          email,
          firstName: this._formFirstName,
          lastName: this._formLastName,
        });
        posthog.capture("early_access_submitted", {
          category: cat,
          modal_type: this._modalType,
          ads_conversion: "Lead",
        });
        metaTrack("Lead", {
          content_name: "early_access",
          source: "join_network",
        });
      } catch (err) {
        if (DEV_MODE) {
          console.error("[JoinNetwork] Early access save failed", err);
          console.error("[JoinNetwork] IC host:", getHost());
        }
        const errEl = root?.querySelector("#jnPayErr");
        if (errEl)
          errEl.textContent = "Could not save your signup. Please try again.";
        throw err;
      }
      try {
        const { getIdentityIfAuthenticated } =
          await import("../../utils/icAuth.js");
        const identity = await getIdentityIfAuthenticated();
        if (identity) {
          const { getAuthenticatedFusionBackendActor } =
            await import("../../utils/earlyAccessSubscribe.js");
          const { categoryToUserRole } =
            await import("../../utils/authHeader.js");
          const actor = await getAuthenticatedFusionBackendActor();
          if (actor && typeof actor.registerOrUpdateAccount === "function") {
            await actor.registerOrUpdateAccount(categoryToUserRole(cat));
          }
          try {
            const { setMyAccountContactForCaller } =
              await import("../../utils/database.js");
            await setMyAccountContactForCaller({
              firstName: this._formFirstName,
              lastName: this._formLastName,
              email,
            });
          } catch (contactErr) {
            if (DEV_MODE)
              console.warn("[JoinNetwork] setMyAccountContact", contactErr);
          }
        }
      } catch (regErr) {
        if (DEV_MODE)
          console.warn("[JoinNetwork] registerOrUpdateAccount", regErr);
      }
    }
    this._preStripeCanisterSyncDone = false;
    if (email.includes("@")) {
      try {
        await sendEmail({
          to: email,
          subject: "You're in — Fusion membership active",
          text: [
            "Thanks — your Fusion membership is linked to your Internet Identity login.",
            "",
            "Next: open Profile setup on the site to finish your artist profile and apply for programs.",
            "",
            "Use the same Internet Identity login each time you return.",
            "",
            "Questions? Reply to this email or use Contact on the site.",
          ].join("\n"),
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(
          "[JoinNetwork] confirmation email failed (signup still saved):",
          msg,
        );
      }
    }
    this._joinFlowCompleted = true;
    this._showStage("confirmation");
  }

  _teardownStripePayment() {
    this._stripePaymentReady = false;
    this._stripePrepareKey = "";
    try {
      this._stripePaymentElement?.unmount();
    } catch {
      /* ignore */
    }
    this._stripePaymentElement = null;
    this._stripeElements = null;
    this._stripe = null;
    const mount = this.querySelector("[data-jn-stripe-mount]");
    if (mount) mount.innerHTML = "";
  }

  /**
   * Registers `ready` / `loaderror` listeners and returns a Promise.
   * Call `paymentElement.mount(...)` **after** this (same tick), so listeners exist before mount —
   * otherwise `ready` can fire before handlers attach and the UI hangs on “Loading payment form…”.
   * @param {import('@stripe/stripe-js').StripeElement} paymentElement
   */
  _whenPaymentElementReady(paymentElement) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const ms = 90000;
      const t = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(
          new Error(
            "Payment form timed out. Check your connection and try again.",
          ),
        );
      }, ms);
      const finish = (fn) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(t);
        fn();
      };
      paymentElement.on("ready", () => finish(() => resolve()));
      paymentElement.on("loaderror", (event) => {
        const msg =
          event?.error?.message ||
          event?.message ||
          "Payment form failed to load. Check the browser console and Stripe Dashboard.";
        finish(() => reject(new Error(msg)));
      });
    });
  }

  async _prepareStripePayment() {
    if (this._isStudioPreview()) return;
    const provider = getActiveProvider();
    if (provider === "stripe" && this._canUseStripeForJoinTier()) {
      await this._prepareStripeElementsPayment();
    } else {
      await this._preparePayPalEmbeddedPayment();
    }
  }

  /**
   * Stripe checkout only when a dedicated Price id exists for the selected tier.
   * Monthly and quarterly join tiers are PayPal-only until STRIPE_* price env vars exist.
   * @returns {boolean}
   */
  _canUseStripeForJoinTier() {
    if (this._joinMode === "resubscribe") return true;
    const tier = this._joinSubscriptionTier || "monthly";
    return tier === "annual";
  }

  async _preparePayPalEmbeddedPayment() {
    if (this._isStudioPreview()) return;
    const myGen = ++this._stripePrepareGen;
    const root = this.shadowRoot;
    if (!root) return;
    this._teardownStripePayment();
    const hint = root.querySelector("#jnPayStripeHint");
    const devSkip = root.querySelector("#jnPayDevSkip");
    const payBtn = root.querySelector("#jnPayComplete");
    const setHintBusy = (busy) => {
      if (hint) hint.classList.toggle("jn-pay-stripe-hint--busy", !!busy);
    };
    if (payBtn) payBtn.disabled = true;
    if (hint) {
      hint.textContent = "Preparing payment…";
      setHintBusy(true);
    }
    if (devSkip) devSkip.style.display = "none";

    const clientId = getPayPalClientIdResolved();
    const base = getIntegrationBaseUrl();
    if (!clientId || !base) {
      setHintBusy(false);
      if (hint) {
        hint.textContent = !base
          ? "Configure Integration API URL in Studio → Services (or VITE_INTEGRATION_API_URL)."
          : "Configure PayPal client ID in Studio → Services (or VITE_PAYPAL_CLIENT_ID).";
      }
      if (devSkip) devSkip.style.display = DEV_MODE ? "block" : "none";
      if (payBtn) payBtn.disabled = !DEV_MODE;
      return;
    }

    try {
      const cat = this._getSelectedCategoryNormalized();
      if (hint) {
        hint.textContent =
          this._joinMode === "resubscribe"
            ? "Verifying your account…"
            : "Saving your signup…";
        setHintBusy(true);
      }

      await this._ensureAccountBeforeStripe();
      if (hint) {
        hint.textContent = "Connecting to payment service…";
        setHintBusy(true);
      }
      const { getIdentityIfAuthenticated } =
        await import("../../utils/icAuth.js");
      const emailForSub = this._getEmailForSubscription();
      if (!emailForSub.includes("@")) {
        throw new Error(
          this._joinMode === "resubscribe"
            ? "Enter the email for your membership billing."
            : "Enter a valid email on step 1.",
        );
      }

      /** @type {string | undefined} */
      let principalOpt;
      if (this._joinMode === "resubscribe") {
        const identity = await getIdentityIfAuthenticated();
        if (!identity) throw new Error("Sign in with Internet Identity first.");
        principalOpt = identity.getPrincipal().toText();
      } else {
        this._fusionPendingId = null;
        this._fusionSubscriptionId = null;
        clearPendingMembershipPayload();
      }

      if (myGen !== this._stripePrepareGen || this._stage !== "payment") return;

      /** @type {JoinSubscriptionTier | undefined} */
      let subscriptionTier;
      if (this._joinMode === "resubscribe") {
        subscriptionTier = undefined;
      } else {
        subscriptionTier = this._joinSubscriptionTier || "monthly";
      }

      const payConfig = await fetchPaymentConfig();
      if (myGen !== this._stripePrepareGen || this._stage !== "payment") return;

      const planId = subscriptionTier
        ? planIdForTier(subscriptionTier, payConfig)
        : "";
      if (!planId) {
        const envHint =
          subscriptionTier === "annual"
            ? "PAYPAL_SUBSCRIPTION_ANNUAL_ID or PAYPAL_PLAN_ANNUAL_ID"
            : subscriptionTier === "quarterly"
              ? "PAYPAL_SUBSCRIPTION_QUARTERLY_ID"
              : "PAYPAL_SUBSCRIPTION_MONTHLY_ID";
        throw new Error(
          `PayPal ${subscriptionTier} plan not configured on integration server (${envHint}).`,
        );
      }

      if (paymentModeMismatch(payConfig) && hint) {
        hint.textContent =
          "Warning: Studio environment (Test/Live) does not match the integration server PayPal mode. Approval may fail.";
      }

      const payFirst = this._joinMode !== "resubscribe";
      const fusionPendingId = payFirst ? crypto.randomUUID() : "";
      if (payFirst) {
        this._fusionPendingId = fusionPendingId;
        savePendingMembershipPayload({
          fusionPendingId,
          email: emailForSub,
          subscriptionId: null,
          paymentCompleted: false,
        });
      }

      /** @type {Record<string, string>} */
      const customData = { pending_email: emailForSub };
      if (payFirst) {
        customData.fusion_pending_id = fusionPendingId;
      } else if (principalOpt) {
        customData.principal = principalOpt;
      }
      customData.category = cat || "";
      customData.intent = this._modalType || "";
      customData.first_name = this._formFirstName || "";
      customData.last_name = this._formLastName || "";
      customData.full_name = this._concatProfileFullName();

      if (hint) {
        hint.textContent = "Loading PayPal checkout…";
        setHintBusy(true);
      }
      const mountEl = this._getStripeMountLightEl();
      await new Promise((r) => requestAnimationFrame(r));
      if (myGen !== this._stripePrepareGen || this._stage !== "payment") return;

      const sdkMode = payConfig.mode === "live" ? "live" : "sandbox";
      await mountPayPalSubscriptionButtons(mountEl, {
        clientId,
        mode: sdkMode,
        planId,
        email: emailForSub,
        customData,
        onApprove: async (subscriptionId) => {
          if (myGen !== this._stripePrepareGen || this._stage !== "payment") return;
          this._fusionSubscriptionId = subscriptionId;
          if (payFirst && this._fusionPendingId) {
            savePendingMembershipPayload({
              fusionPendingId: this._fusionPendingId,
              email: emailForSub,
              subscriptionId,
              paymentCompleted: false,
            });
          }
          setHintBusy(false);
          if (hint) {
            hint.textContent =
              "Subscription approved. Click Secure Access to continue.";
          }
          if (payBtn) payBtn.disabled = false;
        },
        onError: (err) => {
          if (DEV_MODE) console.error("[JoinNetwork] PayPal subscription", err);
          setHintBusy(false);
          if (hint) {
            hint.textContent =
              err instanceof Error
                ? err.message
                : "PayPal checkout failed. Try again.";
          }
        },
        onCancel: () => {
          setHintBusy(false);
          if (hint) hint.textContent = "PayPal checkout cancelled.";
        },
      });

      if (myGen !== this._stripePrepareGen || this._stage !== "payment") return;

      this._stripePaymentReady = true;
      this._stripePrepareKey = this._computeStripePrepareKeySync();
      setHintBusy(false);
      if (hint && !this._fusionSubscriptionId) {
        hint.textContent =
          "Approve your subscription with PayPal below, then click Secure Access.";
      }
      try {
        posthog.capture("membership_payment_elements_ready", {
          modal_type:
            this._modalType ||
            this.getAttribute("data-modal-type") ||
            "membership",
          join_mode: this._joinMode || "full",
          payment_provider: "paypal",
          ads_conversion: "AddPaymentInfo",
        });
        metaTrack("AddPaymentInfo", {
          content_name: "signup_payment_modal",
          source: "join_network",
        });
      } catch {
        /* ignore */
      }
    } catch (e) {
      if (myGen !== this._stripePrepareGen) return;
      this._teardownStripePayment();
      if (DEV_MODE) console.error("[JoinNetwork] PayPal init", e);
      setHintBusy(false);
      if (hint) {
        const raw = e instanceof Error ? e.message : "";
        hint.textContent = mapIntegrationUserMessage(
          raw || "Could not start payment. Try Studio → Services.",
          0,
        );
      }
      if (devSkip) devSkip.style.display = DEV_MODE ? "block" : "none";
      if (payBtn) payBtn.disabled = !DEV_MODE;
    }
  }

  async _prepareStripeElementsPayment() {
    if (this._isStudioPreview()) return;
    const myGen = ++this._stripePrepareGen;
    const root = this.shadowRoot;
    if (!root) return;
    this._teardownStripePayment();
    const hint = root.querySelector("#jnPayStripeHint");
    const devSkip = root.querySelector("#jnPayDevSkip");
    const payBtn = root.querySelector("#jnPayComplete");
    const setHintBusy = (busy) => {
      if (hint) hint.classList.toggle("jn-pay-stripe-hint--busy", !!busy);
    };
    if (payBtn) payBtn.disabled = true;
    if (hint) {
      hint.textContent = "Preparing payment…";
      setHintBusy(true);
    }
    if (devSkip) devSkip.style.display = "none";

    const pk = getStripePublishableKeyResolved();
    const base = getIntegrationBaseUrl();
    if (!pk || !base) {
      setHintBusy(false);
      if (hint) {
        hint.textContent = !base
          ? "Configure Integration API URL in Studio → Services (or VITE_INTEGRATION_API_URL)."
          : "Configure Stripe publishable key in Studio → Services (or VITE_STRIPE_PUBLISHABLE_KEY).";
      }
      if (devSkip) devSkip.style.display = DEV_MODE ? "block" : "none";
      if (payBtn) payBtn.disabled = !DEV_MODE;
      return;
    }

    try {
      const cat = this._getSelectedCategoryNormalized();
      if (hint) {
        hint.textContent =
          this._joinMode === "resubscribe"
            ? "Verifying your account…"
            : "Saving your signup…";
        setHintBusy(true);
      }

      await this._ensureAccountBeforeStripe();
      if (hint) {
        hint.textContent = "Connecting to payment service…";
        setHintBusy(true);
      }
      const { getIdentityIfAuthenticated } =
        await import("../../utils/icAuth.js");
      const emailForSub = this._getEmailForSubscription();
      if (!emailForSub.includes("@")) {
        throw new Error(
          this._joinMode === "resubscribe"
            ? "Enter the email for your membership billing."
            : "Enter a valid email on step 1.",
        );
      }

      /** @type {string | undefined} */
      let principalOpt;
      if (this._joinMode === "resubscribe") {
        const identity = await getIdentityIfAuthenticated();
        if (!identity) throw new Error("Sign in with Internet Identity first.");
        principalOpt = identity.getPrincipal().toText();
      } else {
        this._fusionPendingId = null;
        this._fusionSubscriptionId = null;
        clearPendingMembershipPayload();
      }

      if (myGen !== this._stripePrepareGen || this._stage !== "payment") return;

      /** @type {'annual' | undefined} */
      let subscriptionTier;
      if (this._joinMode === "resubscribe") {
        subscriptionTier = undefined;
      } else if (this._joinSubscriptionTier === "annual") {
        subscriptionTier = "annual";
      } else {
        subscriptionTier = undefined;
      }

      const [{ loadStripe }, subRes] = await Promise.all([
        import("@stripe/stripe-js"),
        createSubscription({
          email: emailForSub,
          payFirst: this._joinMode !== "resubscribe",
          ...(this._joinMode === "resubscribe" && principalOpt
            ? { principal: principalOpt }
            : {}),
          ...(subscriptionTier ? { subscriptionTier } : {}),
          metadata: {
            category: cat || "",
            intent: this._modalType,
            first_name: this._formFirstName || "",
            last_name: this._formLastName || "",
            full_name: this._concatProfileFullName(),
          },
        }),
      ]);
      const clientSecret = subRes.clientSecret;
      if (subRes.fusionPendingId) {
        this._fusionPendingId = subRes.fusionPendingId;
        this._fusionSubscriptionId = subRes.subscriptionId || null;
        savePendingMembershipPayload({
          fusionPendingId: subRes.fusionPendingId,
          email: emailForSub,
          subscriptionId: subRes.subscriptionId || null,
          paymentCompleted: false,
        });
      }
      if (myGen !== this._stripePrepareGen || this._stage !== "payment") return;

      if (hint) {
        hint.textContent = "Loading secure card form…";
        setHintBusy(true);
      }
      const stripe = await loadStripe(pk);
      if (!stripe) throw new Error("Stripe failed to load");
      if (myGen !== this._stripePrepareGen || this._stage !== "payment") return;

      const elements = stripe.elements({
        clientSecret,
        appearance: { theme: "stripe" },
      });
      const paymentElement = elements.create("payment");
      const mountEl = this._getStripeMountLightEl();

      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));
      if (myGen !== this._stripePrepareGen || this._stage !== "payment") return;

      const readyPromise = this._whenPaymentElementReady(paymentElement);
      paymentElement.mount(mountEl);
      this._stripe = stripe;
      this._stripeElements = elements;
      this._stripePaymentElement = paymentElement;

      await readyPromise;
      if (myGen !== this._stripePrepareGen || this._stage !== "payment") {
        this._teardownStripePayment();
        return;
      }

      this._stripePaymentReady = true;
      this._stripePrepareKey = this._computeStripePrepareKeySync();
      setHintBusy(false);
      if (hint) hint.textContent = "";
      if (payBtn) payBtn.disabled = false;
      try {
        posthog.capture("membership_payment_elements_ready", {
          modal_type:
            this._modalType ||
            this.getAttribute("data-modal-type") ||
            "membership",
          join_mode: this._joinMode || "full",
          payment_provider: "stripe",
          ads_conversion: "AddPaymentInfo",
        });
        metaTrack("AddPaymentInfo", {
          content_name: "signup_payment_modal",
          source: "join_network",
        });
      } catch {
        /* ignore */
      }
    } catch (e) {
      if (myGen !== this._stripePrepareGen) return;
      this._teardownStripePayment();
      if (DEV_MODE) console.error("[JoinNetwork] Stripe init", e);
      setHintBusy(false);
      if (hint) {
        const raw = e instanceof Error ? e.message : "";
        hint.textContent = mapIntegrationUserMessage(
          raw || "Could not start payment. Try Studio → Services.",
          0,
        );
      }
      if (devSkip) devSkip.style.display = DEV_MODE ? "block" : "none";
      if (payBtn) payBtn.disabled = !DEV_MODE;
    }
  }

  _getSelectedCategoryNormalized() {
    const active = this.shadowRoot?.querySelector(
      "#jnRoleGroups .categoryButton.active",
    );
    const raw = (active?.textContent || "").trim();
    return normalizeEarlyAccessCategory(raw);
    }

    render() {
        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    /* Inherit theme tokens from light DOM */
                    --jn-c2: var(--c2, #000000);
                    --jn-c3: var(--c3, #ffffff);
                    --jn-c5: var(--c5, #d9ceb8);
                    --jn-bg: var(--bg, #faf3f4);
                    --jn-c1: var(--c1, #c12525);
                    --jn-c4: var(--c4, #a2b792);
                }
                .join-network-host {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding-bottom: 4rem;
                    box-sizing: border-box;
                }
                .join-network-band {
                    width: 100%;
                    max-width: 42rem;
                    text-align: center;
                    padding: 1.5rem 1rem 0;
                }
                #bandTitle {
                    font-size: clamp(1.75rem, 2.5vw, 2.75rem);
                    font-variation-settings: var(--fv-headline-wide);
                    color: var(--jn-c2);
                    margin: 0;
                    letter-spacing: 0.02em;
                }
                #bandDescription {
                    font-size: clamp(1rem, 1.4vw, 1.25rem);
                    font-variation-settings: var(--fv-body);
                    margin: 1rem 0 1.5rem;
                    line-height: 1.5;
                    color: var(--jn-c2);
                    opacity: 0.9;
                }
                /* Primary CTA: align with header register rect — sharp corners, c5 fill, opacity hover */
                #bandOpenBtn,
                .jn-btn-primary {
                    box-sizing: border-box;
                    min-height: 2.75rem;
                    padding: 0.5rem 1.5rem;
                    width: 100%;
                    max-width: 100%;
                    font-family: inherit;
                    font-size: clamp(0.88rem, 1.05vw, 1rem);
                    font-variation-settings: var(--fv-nav-active);
                    letter-spacing: 0.06em;
                    text-transform: none;
                    cursor: pointer;
                    -webkit-appearance: none;
                    appearance: none;
                    border: 1.5px solid var(--jn-c2);
                    border-radius: 0;
                    background-color: var(--jn-c5);
                    color: var(--jn-c2);
                    transition: opacity 0.2s ease;
                }
                #bandOpenBtn { width: auto; max-width: 22rem; }
                :host-context(html[data-theme="dark"]) #bandOpenBtn {
                    color: #000000;
                }
                #bandOpenBtn:hover,
                .jn-btn-primary:hover:not(:disabled) {
                    opacity: 0.88;
                }
                #bandOpenBtn:focus-visible,
                .jn-btn-primary:focus-visible,
                .categoryButton:focus-visible,
                .jn-close:focus-visible,
                .jn-btn-back:focus-visible,
                .jn-link:focus-visible {
                    outline: 2px solid var(--jn-c2);
                    outline-offset: 2px;
                }
                .jn-btn-primary { margin-top: 0.75rem; }
                .jn-btn-primary:disabled {
                    opacity: 0.45;
                    cursor: not-allowed;
                }
                .jn-dialog {
                    --jn-pad: 1.35rem;
                    max-width: min(520px, 96vw);
                    width: 100%;
                    border: 1px solid color-mix(in srgb, var(--jn-c2) 18%, transparent);
                    border-radius: 0;
                    padding: 0;
                    background: var(--jn-bg);
                    color: var(--jn-c2);
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12);
                }
                .jn-dialog::backdrop {
                    /* Neutral scrim + blur so the modal reads clearly in light and dark themes */
                    background: rgba(248, 248, 248, 0.4);
                    -webkit-backdrop-filter: blur(20px) saturate(1.15);
                    backdrop-filter: blur(10px) saturate(1.15);
                }
                .jn-dialog-inner {
                    position: relative;
                    padding: var(--jn-pad);
                    max-height: min(90vh, 880px);
                    overflow-y: auto;
                    box-sizing: border-box;
                }
                .jn-texture {
                    position: absolute;
                    inset: 0;
                    border-radius: 0;
                    pointer-events: none;
                    opacity: 0.35;
                    background:
                        radial-gradient(ellipse 80% 60% at 15% 10%, color-mix(in srgb, var(--jn-c5) 50%, transparent), transparent 55%),
                        radial-gradient(ellipse 70% 50% at 90% 0%, color-mix(in srgb, var(--jn-c4) 35%, transparent), transparent 50%),
                        radial-gradient(ellipse 60% 45% at 50% 100%, color-mix(in srgb, var(--jn-c5) 40%, transparent), transparent 50%);
                }
                .jn-close {
                    position: absolute;
                    top: 0.65rem;
                    right: 0.65rem;
                    z-index: 2;
                    width: 2.5rem;
                    height: 2.5rem;
                    border: 1px solid transparent;
                    background: transparent;
                    font-size: 1.5rem;
                    line-height: 1;
                    cursor: pointer;
                    color: var(--jn-c2);
                    border-radius: 0;
                    font-variation-settings: var(--fv-body);
                }
                .jn-close:hover {
                    background: color-mix(in srgb, var(--jn-c2) 6%, transparent);
                }
                .jn-panel { position: relative; z-index: 1; }
                .jn-panel[hidden] { display: none !important; }
                .jn-panel-head {
                    text-align: center;
                    margin-bottom: 1rem;
                }
                .jn-panel-head h2 {
                    margin: 0;
                    font-size: clamp(1.2rem, 2.4vw, 1.55rem);
                    font-variation-settings: var(--fv-title);
                    color: var(--jn-c2);
                }
                .jn-panel-head p {
                    margin: 0.35rem 0 0;
                    font-size: clamp(0.88rem, 1.15vw, 1rem);
                    font-variation-settings: var(--fv-body);
                    color: color-mix(in srgb, var(--jn-c2) 92%, var(--jn-bg));
                    line-height: 1.45;
                }
                .jn-field { width: 100%; margin-bottom: 0.75rem; }
                .jn-name-row-outer { margin-bottom: 0.75rem; }
                .jn-name-row {
                    display: flex;
                    flex-direction: row;
                    flex-wrap: nowrap;
                    gap: 0.75rem;
                    width: 100%;
                    align-items: stretch;
                }
                @media (max-width: 380px) {
                    .jn-name-row { flex-wrap: wrap; }
                    .jn-name-row .jn-field-col { flex-basis: 100%; }
                }
                .jn-field-col {
                    flex: 1 1 0;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                }
                .jn-field-label {
                    display: block;
                    font-size: 0.88rem;
                    margin: 0 0 0.35rem;
                    font-variation-settings: var(--fv-label-strong);
                    color: var(--jn-c2);
                }
                /* Name row uses .jn-field-col, not .jn-field — must share the same input rules */
                .jn-field input,
                .jn-field-col input,
                .jn-pay-fields input {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 0.65rem 0.75rem;
                    border: 1px solid color-mix(in srgb, var(--jn-c2) 28%, transparent);
                    border-radius: 0;
                    font-family: inherit;
                    font-size: 1rem;
                    font-variation-settings: var(--fv-label);
                    background: var(--jn-c3);
                    color: var(--jn-c2);
                }
                .jn-field input::placeholder,
                .jn-field-col input::placeholder,
                .jn-pay-fields input::placeholder {
                    color: color-mix(in srgb, var(--jn-c2) 45%, transparent);
                }
                .jn-role-label {
                    font-size: 0.88rem;
                    margin: 0.75rem 0 0.35rem;
                    font-variation-settings: var(--fv-label-strong);
                    color: var(--jn-c2);
                }
                #jnRoleGroups {
                    width: 100%;
                }
                #jnRoleRow {
                    display: flex;
                    flex-wrap: wrap;
                    column-gap: 0.8rem;
                    row-gap: 0.4rem;
                    justify-content: center;
                    margin-bottom: 0.5rem;
                }
                /* Match app-feed-filter filterButton: outline chip, sharp corners, opacity hover */
                .categoryButton {
                    width: 20%;
                    box-sizing: border-box;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    min-height: 40px;
                    padding: 0.4em 0.55em;
                    font-size: clamp(0.72rem, 0.9vw, 0.9rem);
                    font-variation-settings: var(--fv-subtitle);
                    line-height: 1.2;
                    cursor: pointer;
                    border: 1px solid var(--jn-c2);
                    border-radius: 0;
                    background: transparent;
                    color: var(--jn-c2);
                    transition: opacity 0.2s ease, background-color 0.2s ease, color 0.2s ease;
                }
                .categoryButton:hover:not(.active) {
                    opacity: 0.88;
                }
                .categoryButton.active {
                    background-color: var(--jn-c2);
                    color: var(--jn-c3);
                    opacity: 1;
                }
                #jnRenewHint,
                #jnEntryFooter {
                    font-size: clamp(0.82rem, 1vw, 0.9rem);
                    font-variation-settings: var(--fv-caption);
                    text-align: center;
                    margin: 0.5rem 0 0;
                    color: color-mix(in srgb, var(--jn-c2) 88%, var(--jn-bg));
                    line-height: 1.45;
                }
                .jn-btn-back {
                    display: block;
                    width: 100%;
                    margin-top: 0.65rem;
                    background: none;
                    border: none;
                    text-decoration: underline;
                    text-underline-offset: 0.15em;
                    cursor: pointer;
                    font-size: 0.88rem;
                    font-variation-settings: var(--fv-label);
                    color: var(--jn-c2);
                    font-family: inherit;
                }
                .jn-plan-group-label {
                    font-size: 0.88rem;
                    font-variation-settings: var(--fv-label-strong);
                    margin: 0.75rem 0 0.5rem;
                    color: var(--jn-c2);
                }
                .jn-plan-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 0.75rem;
                    margin: 0.35rem 0 0.85rem;
                    width: 100%;
                }
                @media (min-width: 520px) {
                    .jn-plan-grid {
                        grid-template-columns: repeat(3, 1fr);
                        align-items: stretch;
                    }
                }
                .jn-plan-wrap {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    min-height: 100%;
                    min-width: 0;
                }
                .jn-plan-wrap--suggested {
                    padding-top: 0.65rem;
                }
                .jn-plan-suggested-badge {
                    position: absolute;
                    top: 0;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 1;
                    padding: 0.2rem 0.55rem;
                    border-radius: 999px;
                    font-size: clamp(0.65rem, 0.75vw, 0.72rem);
                    font-variation-settings: var(--fv-caption);
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    background: #2e7d4a;
                    color: var(--jn-c3);
                    white-space: nowrap;
                }
                .jn-whats-included-details {
                    margin: 0 0 1rem;
                    border: 1px solid rgba(0, 0, 0, 0.12);
                    padding: 0.5rem 0.75rem;
                    background: var(--jn-c3);
                }
                .jn-whats-included-details summary {
                    cursor: pointer;
                    font-size: clamp(0.88rem, 1.05vw, 0.98rem);
                    font-variation-settings: var(--fv-body-wide);
                    color: var(--jn-c2);
                    letter-spacing: 0.02em;
                }
                .jn-whats-included-body {
                    margin: 0.5rem 0 0;
                    font-size: clamp(0.86rem, 1vw, 0.95rem);
                    font-variation-settings: var(--fv-body-wide);
                    line-height: 1.55;
                    color: var(--jn-c2);
                }
                .jn-whats-included-subhead {
                    margin: 0.65rem 0 0.2rem;
                    font-size: clamp(0.8rem, 0.95vw, 0.9rem);
                    font-variation-settings: var(--fv-label);
                    letter-spacing: 0.02em;
                    opacity: 0.88;
                }
                .jn-whats-included-subhead:first-child {
                    margin-top: 0;
                }
                .jn-whats-included-body ul {
                    margin: 0.25rem 0 0.5rem;
                    padding-left: 1.25rem;
                }
                .jn-whats-included-empty {
                    list-style: none;
                    margin-left: 0;
                    padding-left: 0;
                    opacity: 0.82;
                }
                .jn-plan-card {
                    width: 100%;
                    box-sizing: border-box;
                    display: flex;
                    align-items: flex-start;
                    gap: 0.5rem;
                    text-align: left;
                    min-height: 3.25rem;
                    padding: 0.65rem 0.75rem;
                    font-family: inherit;
                    font-size: clamp(0.78rem, 1vw, 0.88rem);
                    font-variation-settings: var(--fv-body);
                    line-height: 1.35;
                    cursor: pointer;
                    border: 1px solid var(--jn-c2);
                    border-radius: 0;
                    background: transparent;
                    color: var(--jn-c2);
                    transition: opacity 0.15s ease, background-color 0.15s ease;
                }
                .jn-plan-card:hover:not(.jn-plan-card--selected) {
                    opacity: 0.92;
                    background: color-mix(in srgb, var(--jn-c2) 6%, transparent);
                }
                .jn-plan-card:focus-visible {
                    outline: 2px solid var(--jn-c2);
                    outline-offset: 2px;
                }
                .jn-plan-card--selected {
                    background-color: var(--jn-c2);
                    color: var(--jn-c3);
                    opacity: 1;
                }
                .jn-plan-card--selected .jn-plan-discount {
                    color: color-mix(in srgb, var(--jn-c3) 88%, var(--jn-c2));
                }
                .jn-plan-radio {
                    flex-shrink: 0;
                    width: 1rem;
                    height: 1rem;
                    margin-top: 0.15rem;
                    border-radius: 50%;
                    border: 2px solid currentColor;
                    box-sizing: border-box;
                    position: relative;
                }
                .jn-plan-card--selected .jn-plan-radio::after {
                    content: "";
                    position: absolute;
                    inset: 3px;
                    border-radius: 50%;
                    background: currentColor;
                }
                .jn-plan-card-body {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                    flex: 1;
                    min-width: 0;
                }
                .jn-plan-title {
                    font-variation-settings: var(--fv-subtitle);
                    font-size: 0.92rem;
                }
                .jn-plan-price-row {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: baseline;
                    gap: 0.35rem 0.5rem;
                }
                .jn-plan-price {
                    font-variation-settings: var(--fv-headline);
                    font-size: clamp(1.2rem, 2.5vw, 1.5rem);
                    letter-spacing: 0.02em;
                }
                .jn-plan-every,
                .jn-plan-discount {
                    font-size: 0.78rem;
                    font-variation-settings: var(--fv-caption);
                    opacity: 0.95;
                }
                .jn-plan-sub {
                    font-size: 0.78rem;
                    font-variation-settings: var(--fv-caption);
                    line-height: 1.4;
                    opacity: 0.95;
                }
                #jnValueDisclaimer {
                    font-size: clamp(0.82rem, 1vw, 0.9rem);
                    font-variation-settings: var(--fv-caption);
                    text-align: center;
                    color: color-mix(in srgb, var(--jn-c2) 88%, var(--jn-bg));
                    line-height: 1.5;
                }
                .jn-order-brand {
                    font-weight: 700;
                    font-size: 1.05rem;
                    font-variation-settings: var(--fv-title);
                    margin-bottom: 0.35rem;
                    letter-spacing: 0.04em;
                    text-transform: none;
                    color: var(--jn-c2);
                }
                .jn-order-card {
                    background: var(--jn-c3);
                    border-radius: 0;
                    padding: 1rem;
                    margin: 0.75rem 0;
                    border: 1px solid color-mix(in srgb, var(--jn-c2) 12%, transparent);
                }
                .jn-order-final-line {
                    display: flex;
                    flex-wrap: wrap;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 0.65em;
                    margin: 0;
                    font-size: 0.95rem;
                    font-variation-settings: var(--fv-body);
                    line-height: 1.45;
                    color: var(--jn-c2);
                }
                .jn-final-payment-price {
                    font-weight: 700;
                    font-variation-settings: var(--fv-label-strong);
                    flex-shrink: 0;
                }
                #final-payment-statement.jn-final-payment-statement {
                    white-space: pre-line;
                    flex: 1 1 auto;
                    min-width: 0;
                }
                /* Default if ever used in shadow (we mount in light DOM via slot). */
                .jn-stripe-mount {
                    min-height: 88px;
                    margin: 0.65rem 0;
                }
                ::slotted(.jn-stripe-mount) {
                    min-height: 88px;
                    margin: 0.65rem 0;
                    display: block;
                    box-sizing: border-box;
                }
                #jnPayFooter {
                    font-size: clamp(0.8rem, 1vw, 0.88rem);
                    font-variation-settings: var(--fv-caption);
                    text-align: center;
                    margin-top: 0.75rem;
                    color: color-mix(in srgb, var(--jn-c2) 88%, var(--jn-bg));
                    line-height: 1.5;
                }
                .jn-conf-check {
                    width: 4rem;
                    height: 4rem;
                    margin: 0.5rem auto 1rem;
                    border-radius: 50%;
                    background: color-mix(in srgb, var(--jn-c4) 35%, transparent);
                    border: 1px solid color-mix(in srgb, var(--jn-c4) 55%, transparent);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.75rem;
                    color: var(--jn-c2);
                }
                #jnConfLinks {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.65rem 1rem;
                    justify-content: center;
                    margin-top: 1rem;
                    padding-top: 1rem;
                    border-top: 1px solid color-mix(in srgb, var(--jn-c2) 12%, transparent);
                }
                .jn-link {
                    font-size: 0.82rem;
                    font-variation-settings: var(--fv-label);
                    color: var(--jn-c2);
                    text-decoration: underline;
                    text-underline-offset: 0.2em;
                    cursor: pointer;
                }
                .jn-link:hover {
                    opacity: 0.8;
                }
                #jnSecondaryLine {
                    text-align: center;
                    font-size: clamp(0.82rem, 1vw, 0.9rem);
                    margin-top: 0.75rem;
                    color: color-mix(in srgb, var(--jn-c2) 88%, var(--jn-bg));
                    font-variation-settings: var(--fv-caption);
                    line-height: 1.45;
                }
                /* Stripe status line — neutral (not error red like .jn-live) */
                #jnPayStripeHint {
                    font-size: clamp(0.82rem, 1vw, 0.9rem);
                    text-align: center;
                    margin: 0.25rem 0 0.5rem;
                    color: color-mix(in srgb, var(--jn-c2) 88%, var(--jn-bg));
                    font-variation-settings: var(--fv-caption);
                    line-height: 1.45;
                    min-height: 1.25em;
                }
                #jnPayStripeHint.jn-pay-stripe-hint--busy {
                    animation: jnStripeHintPulse 1.1s ease-in-out infinite;
                }
                @keyframes jnStripeHintPulse {
                    0%, 100% { opacity: 0.42; }
                    50% { opacity: 1; }
                }
                .jn-link-payment-ok {
                    font-size: clamp(0.9rem, 1.05vw, 1rem);
                    font-variation-settings: var(--fv-emphasis);
                    margin: 0 0 0.5rem;
                    color: var(--jn-c4);
                }
                .jn-link-ii-why {
                    font-size: clamp(0.8rem, 1vw, 0.9rem);
                    margin: 0 0 0.75rem;
                    line-height: 1.45;
                    color: color-mix(in srgb, var(--jn-c2) 88%, var(--jn-bg));
                    font-variation-settings: var(--fv-caption);
                }
                .jn-link-linking {
                    font-size: clamp(0.85rem, 1vw, 0.95rem);
                    text-align: center;
                    margin: 0 0 0.5rem;
                    font-variation-settings: var(--fv-label);
                    color: var(--jn-c2);
                }
                .jn-btn-ghost.jn-apply-residency {
                    width: 100%;
                    max-width: 100%;
                    margin-top: 0.65rem;
                    padding: 0.45rem 1rem;
                    border: 1.5px solid var(--jn-c2);
                    background: transparent;
                    color: var(--jn-c2);
                    cursor: pointer;
                    font-family: inherit;
                    font-variation-settings: var(--fv-nav);
                }
                .jn-btn-ghost.jn-apply-residency:hover {
                    opacity: 0.85;
                }
                .jn-link-kicker {
                    font-size: clamp(1rem, 1.2vw, 1.15rem);
                    font-variation-settings: var(--fv-emphasis);
                    margin: 0 0 0.35rem;
                    color: var(--jn-c2);
                }
                .jn-link-help {
                    font-size: clamp(0.8rem, 1vw, 0.88rem);
                    margin-top: 0.75rem;
                    line-height: 1.45;
                    color: color-mix(in srgb, var(--jn-c2) 85%, var(--jn-bg));
                    font-variation-settings: var(--fv-caption);
                }
                .jn-value-evolving {
                    font-size: clamp(0.82rem, 1vw, 0.9rem);
                    margin: 0.5rem 0 0.25rem;
                    font-variation-settings: var(--fv-caption);
                    color: color-mix(in srgb, var(--jn-c2) 82%, var(--jn-bg));
                    line-height: 1.45;
                }
                #jnEntryFooter {
                    white-space: pre-line;
                }
                #jnPayFooter2 {
                    font-size: clamp(0.82rem, 1vw, 0.9rem);
                    text-align: center;
                    margin: 0.15rem 0 0;
                    color: color-mix(in srgb, var(--jn-c2) 88%, var(--jn-bg));
                    font-variation-settings: var(--fv-caption);
                }
                .jn-live {
                    font-size: 0.8rem;
                    text-align: center;
                    color: var(--jn-c1);
                    margin-top: 0.5rem;
                    min-height: 1.25em;
                    font-variation-settings: var(--fv-label);
                }
                @media (max-width: 768px) {
                    .join-network-host {
                    width: 100%;
                        padding-left: 10%;
                        padding-right: 10%;
                        box-sizing: border-box;
                        margin-left: auto;
                        margin-right: auto;
                    }

                    #bandTitle {
                        font-size: clamp(2rem, 3vw, 4rem);
                    }

                    #bandDescription {
                        font-variation-settings: var(--fv-label-strong);
                    }

                    #bandOpenBtn {
                        width: 80%;
                        max-width: 22rem;
                        margin-left: auto;
                        margin-right: auto;
                        min-height: 3.5rem;
                        padding-top: 0.65em;
                        padding-bottom: 0.65em;
                        font-size: clamp(1.2rem, 2vw, 3rem);
                    }

                    .jn-final-payment-price {
                        font-size: 1.6rem;
                    }
                }

                @media (max-width: 520px) {
                    #bandOpenBtn {
                        width: 80%;
                        max-width: none;
                        margin-left: auto;
                        margin-right: auto;
                    }
                    #jnConfLinks {
                        flex-direction: column;
                        align-items: stretch;
                    }
                }
            </style>
            <div class="join-network-host">
                <div class="join-network-band">
                    <h2 id="bandTitle"></h2>
                    <p id="bandDescription"></p>
                    <button type="button" id="bandOpenBtn">Join FUSION</button>
                    </div>
                <dialog class="jn-dialog" aria-labelledby="jnDialogTitle">
                    <div class="jn-texture" aria-hidden="true"></div>
                    <div class="jn-dialog-inner">
                        <button type="button" class="jn-close" aria-label="Close">×</button>
                        <p id="jnDialogTitle" class="jn-visually-hidden">Join FUSION</p>

                        <div class="jn-panel" data-jn-panel="entry">
                            <div class="jn-panel-head">
                                <h2 id="jnEntryTitle"></h2>
                                <p id="jnEntrySubtitle"></p>
                        </div>
                            <div class="jn-name-row-outer">
                                <div class="jn-name-row">
                                    <div class="jn-field-col">
                                        <label id="jnFirstNameLabel" class="jn-field-label" for="jnFirstName">First name</label>
                                        <input type="text" id="jnFirstName" name="jn-first-name" autocomplete="given-name" placeholder="First name" />
                                    </div>
                                    <div class="jn-field-col">
                                        <label id="jnLastNameLabel" class="jn-field-label" for="jnLastName">Last name</label>
                                        <input type="text" id="jnLastName" name="jn-last-name" autocomplete="family-name" placeholder="Last name" />
                                    </div>
                                </div>
                            </div>
                            <div class="jn-field">
                                <label id="jnEmailLabel" class="jn-field-label" for="jnEmail">Email</label>
                                <input type="email" id="jnEmail" name="jn-email" autocomplete="email" placeholder="Email" />
                            </div>
                            <div class="jn-field">
                                <label id="jnAccessCodeLabel" class="jn-field-label" for="jnAccessCode">Access code (optional)</label>
                                <input type="text" id="jnAccessCode" name="jn-access-code" inputmode="numeric" autocomplete="one-time-code" placeholder="" />
                            </div>
                            <p class="jn-role-label" id="jnRoleLabel">I'm joining as:</p>
                            <div id="jnRoleGroups">
                            <div id="jnRoleRow">
                                <button type="button" class="categoryButton active" data-role="Artist">Artist</button>
                                <button type="button" class="categoryButton" data-role="Gallery">Gallery</button>
                                <button type="button" class="categoryButton" data-role="Curator">Curator</button>
                                <button type="button" class="categoryButton" data-role="Collector">Collector</button>
                </div>
                </div>
                            <p id="jnRenewHint"></p>
                            <button type="button" class="jn-btn-primary" id="jnEntryContinue">Continue</button>
                            <p id="jnEntryFooter"></p>
                            <app-auth-browser-help></app-auth-browser-help>
                            <p id="jnEntryErr" class="jn-live" aria-live="polite"></p>
                        </div>

                        <div class="jn-panel" data-jn-panel="value" hidden>
                            <div class="jn-panel-head">
                                <h2 id="jnValueTitle"></h2>
                                <p id="jnValueLead"></p>
                            </div>
                            <p class="jn-plan-group-label" id="jnPlanGroupLabel"></p>
                            <div class="jn-plan-grid" id="jnPlanGrid" role="radiogroup" aria-labelledby="jnPlanGroupLabel">
                                <div class="jn-plan-wrap jn-plan-wrap--suggested">
                                    <span class="jn-plan-suggested-badge" id="jnPlanMonthlyBadge" aria-hidden="true">Popular</span>
                                    <button type="button" class="jn-plan-card" id="jnPlanMonthly" data-jn-subscription-tier="monthly" role="radio" aria-checked="false">
                                        <span class="jn-plan-radio" aria-hidden="true"></span>
                                        <span class="jn-plan-card-body">
                                            <span class="jn-plan-title" id="jnPlanMonthlyTitle"></span>
                                            <span class="jn-plan-price-row">
                                                <span class="jn-plan-price" id="jnPlanMonthlyPrice"></span>
                                                <span class="jn-plan-every" id="jnPlanMonthlyEvery"></span>
                                            </span>
                                            <span class="jn-plan-sub" id="jnPlanMonthlySub1"></span>
                                            <span class="jn-plan-sub" id="jnPlanMonthlySub2"></span>
                                        </span>
                                    </button>
                                </div>
                                <button type="button" class="jn-plan-card" id="jnPlanQuarterly" data-jn-subscription-tier="quarterly" role="radio" aria-checked="false">
                                    <span class="jn-plan-radio" aria-hidden="true"></span>
                                    <span class="jn-plan-card-body">
                                        <span class="jn-plan-title" id="jnPlanQuarterlyTitle"></span>
                                        <span class="jn-plan-price-row">
                                            <span class="jn-plan-price" id="jnPlanQuarterlyPrice"></span>
                                            <span class="jn-plan-every" id="jnPlanQuarterlyEvery"></span>
                                        </span>
                                        <span class="jn-plan-sub" id="jnPlanQuarterlySub1"></span>
                                        <span class="jn-plan-sub" id="jnPlanQuarterlySub2"></span>
                                    </span>
                                </button>
                                <button type="button" class="jn-plan-card" id="jnPlanAnnual" data-jn-subscription-tier="annual" role="radio" aria-checked="false">
                                    <span class="jn-plan-radio" aria-hidden="true"></span>
                                    <span class="jn-plan-card-body">
                                        <span class="jn-plan-title" id="jnPlanAnnualTitle"></span>
                                        <span class="jn-plan-price-row">
                                            <span class="jn-plan-price" id="jnPlanAnnualPrice"></span>
                                            <span class="jn-plan-discount" id="jnPlanAnnualDiscount"></span>
                                        </span>
                                        <span class="jn-plan-sub" id="jnPlanAnnualSub1"></span>
                                        <span class="jn-plan-sub" id="jnPlanAnnualSub2"></span>
                                    </span>
                                </button>
                            </div>
                            <details id="jnWhatsIncludedDetails" class="jn-whats-included-details" open>
                                <summary id="jnWhatsIncludedSummary"></summary>
                                <div class="jn-whats-included-body">
                                    <p class="jn-whats-included-subhead" id="jnWhatsIncludedGlobalHead"></p>
                                    <ul id="jnWhatsIncludedGlobalUl"></ul>
                                    <div id="jnWhatsIncludedPlanBlock">
                                        <p class="jn-whats-included-subhead" id="jnWhatsIncludedPlanHead"></p>
                                        <ul id="jnWhatsIncludedPlanUl"></ul>
                                    </div>
                                </div>
                            </details>
                            <p id="jnValueEvolving" class="jn-value-evolving"></p>
                            <p id="jnValueDisclaimer"></p>
                            <p id="jnValueDisclaimerFee"></p>
                            <button type="button" class="jn-btn-primary" id="jnValueContinue" disabled>Continue</button>
                            <button type="button" class="jn-btn-back" id="jnValueBack">← Back</button>
                        </div>

                        <div class="jn-panel" data-jn-panel="payment" hidden>
                            <div class="jn-panel-head">
                                <h2 id="jnPayTitle"></h2>
                                <p id="jnPaySubtitle"></p>
                            </div>
                            <div class="jn-field" id="jnPayEmailWrap" hidden>
                                <label for="jnPayEmail">Email for billing</label>
                                <input type="email" id="jnPayEmail" name="jn-pay-email" autocomplete="email" placeholder="you@example.com" />
                            </div>
                            <div class="jn-order-card">
                                <div class="jn-order-brand" id="jnOrderBrand"></div>
                                <div class="jn-order-final-line">
                                    <strong class="jn-final-payment-price" id="jnFinalPaymentPrice"></strong>
                                    <div id="final-payment-statement" class="jn-final-payment-statement"></div>
                                </div>
                    </div>
                            <!-- Stripe Payment Element must live in light DOM; projected here via slot -->
                            <slot name="jn-stripe-mount"></slot>
                            <p id="jnPayStripeHint"></p>
                            <button type="button" class="jn-btn-primary" id="jnPayComplete"></button>
                            <button type="button" class="jn-btn-back" id="jnPayDevSkip" style="display:none;margin-top:0.5rem">Skip payment (dev)</button>
                            <p id="jnPayFooter"></p>
                            <p id="jnPayFooter2"></p>
                            <p id="jnPayErr" class="jn-live" aria-live="polite"></p>
                            <button type="button" class="jn-btn-back" id="jnPayBack">← Back</button>
                        </div>

                        <div class="jn-panel" data-jn-panel="linkAccount" hidden>
                            <div class="jn-panel-head">
                                <p id="jnLinkPaymentOk" class="jn-link-payment-ok"></p>
                                <p id="jnLinkIiWhy" class="jn-link-ii-why"></p>
                                <p id="jnLinkKicker" class="jn-link-kicker"></p>
                                <h2 id="jnLinkTitle"></h2>
                                <p id="jnLinkLead"></p>
                                <p id="jnLinkHelp" class="jn-link-help"></p>
                            </div>
                            <p id="jnLinkLinking" class="jn-link-linking" hidden></p>
                            <button type="button" class="jn-btn-primary" id="jnLinkSignIn">Continue with Internet Identity</button>
                            <p id="jnLinkErr" class="jn-live" aria-live="polite"></p>
                        </div>

                        <div class="jn-panel" data-jn-panel="confirmation" hidden>
                            <div class="jn-panel-head">
                                <h2 id="jnConfTitle"></h2>
                            </div>
                            <div class="jn-conf-check" aria-hidden="true">✓</div>
                            <div class="jn-panel-head">
                                <h2 id="jnWelcomeTitle"></h2>
                                <p id="jnWelcomeBody"></p>
                            </div>
                            <button type="button" class="jn-btn-primary" id="jnPrimaryCta"></button>
                            <button type="button" class="jn-btn-ghost jn-apply-residency" id="jnApplyResidency"></button>
                            <p id="jnSecondaryLine"></p>
                            <div id="jnConfLinks"></div>
                    </div>
                    </div>
                </dialog>
            </div>
        `;

    const styleEl = this.shadow.querySelector("style");
    if (styleEl) {
      let extra = `
                .jn-visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
            `;
      if (this.hasAttribute("data-header-bridge")) {
        extra += `
                :host([data-header-bridge]) .join-network-band { display: none !important; }
                :host([data-header-bridge]) .join-network-host { padding: 0; margin: 0; min-height: 0; }
                `;
      }
      if (this.hasAttribute("data-studio-preview")) {
        extra += `
                :host([data-studio-preview]) { display: block !important; visibility: visible !important; }
                :host([data-studio-preview]) .join-network-host { padding: 0; margin: 0; min-height: 0; }
                :host([data-studio-preview]) .jn-dialog.jn-dialog--studio-preview {
                    position: relative;
                    display: block;
                    width: 100%;
                    max-width: 100%;
                    margin: 0;
                    padding: 0;
                    border: 0;
                    background: transparent;
                    color: inherit;
                }
                :host([data-studio-preview]) .jn-dialog.jn-dialog--studio-preview::backdrop { display: none; }
                :host([data-studio-preview]) .join-network-host--band-only .jn-dialog { display: none !important; }
                :host([data-studio-preview]) .join-network-host--modal-only .join-network-band {
                    opacity: 0.45;
                    pointer-events: none;
                }
                :host([data-studio-preview]) .jn-studio-stripe-placeholder {
                    margin: 0.75rem 0;
                    padding: 0.65rem 0.75rem;
                    font-size: 0.82rem;
                    border: 1px dashed rgba(255,255,255,0.25);
                    color: rgba(255,255,255,0.75);
                }
                `;
      }
      styleEl.textContent += extra;
    }

    this._fillBandCopy();
    this._fillDialogCopy();
    this._applyHostMargins();
    this._wire();
  }

  /**
   * Open the join flow dialog. Used for `/join-network` checkout handoff,
   * pending-link resume, and resubscribe — not for the band “Join FUSION” CTA
   * (that navigates to `/join-network`).
   * @param {{
   *   mode?: 'resubscribe',
   *   firstName?: string,
   *   lastName?: string,
   *   email?: string,
   *   accessCode?: string,
   *   category?: string,
   *   subscriptionTier?: JoinSubscriptionTier,
   *   stage?: string,
   *   fromJoinNetworkPage?: boolean,
   *   resumePendingLink?: boolean,
   * } | undefined} [detail]
   */
  openModal(detail) {
    this._openModal(detail);
  }

  /**
   * @param {string} category
   */
  _selectJoinRole(category) {
    const root = this.shadowRoot;
    if (!root) return;
    const want = String(category || "").trim();
    if (!want) return;
    root.querySelectorAll("#jnRoleGroups .categoryButton").forEach((btn) => {
      if (!(btn instanceof HTMLButtonElement)) return;
      const role = btn.getAttribute("data-role") || btn.textContent || "";
      const on = role.toLowerCase() === want.toLowerCase();
      btn.classList.toggle("active", on);
    });
  }

  /** @param {Parameters<JoinNetworkComponent['openModal']>[0]} [detail] */
  _openModal(detail) {
    const root = this.shadowRoot;
    if (!root) return;
    const dlg = root.querySelector(".jn-dialog");
    const openBtn = root.querySelector("#bandOpenBtn");
    this._modalType = resolveModalType(this);
    posthog.capture("join_network_modal_opened", {
      modal_type:
        this._modalType || this.getAttribute("data-modal-type") || "membership",
      mode: (detail && detail.mode) || "full",
      page_context: String(this.getAttribute("context") || "home").trim() || "home",
      from_join_network_page: Boolean(detail?.fromJoinNetworkPage),
    });
    const pendingRestore =
      (!detail || detail.mode !== "resubscribe") &&
      readPendingMembershipPayload();
    const resumeLink =
      (!detail || detail.mode !== "resubscribe") &&
      pendingRestore?.paymentCompleted &&
      pendingRestore?.fusionPendingId &&
      (Boolean(detail?.resumePendingLink) ||
        hasActiveJoinMembershipLinkSession());

    const pagePrefill = Boolean(detail?.fromJoinNetworkPage) || Boolean(detail?.firstName || detail?.email);

    if (resumeLink) {
      this._joinExemptCodePath = false;
      this._fusionPendingId = pendingRestore.fusionPendingId;
      this._fusionSubscriptionId = pendingRestore.subscriptionId;
      if (pendingRestore.email) {
        this._formEmail = pendingRestore.email;
      } else {
        const lsJoin = readPendingPaymentEmailLocal("join");
        if (lsJoin?.email) this._formEmail = lsJoin.email;
      }
      this._joinMode = "full";
      this._stage = "linkAccount";
      this._preStripeCanisterSyncDone = true;
      this._logoutIfDismissedWithoutJoin = false;
      try {
        sessionStorage.setItem(FUSION_PENDING_MEMBERSHIP_LINK_KEY, "1");
      } catch {
        /* ignore */
      }
    } else {
      this._preStripeCanisterSyncDone = false;
      this._fusionPendingId = null;
      this._fusionSubscriptionId = null;
      if (detail && detail.mode === "resubscribe") {
        this._joinExemptCodePath = false;
        this._joinMode = "resubscribe";
        this._stage = "payment";
        this._logoutIfDismissedWithoutJoin = false;
        void import("@stripe/stripe-js");
      } else {
        this._joinExemptCodePath = false;
        this._joinMode = "full";
        this._joinSubscriptionTier = null;
        this._stage = "entry";
        const dbg = (this.getAttribute("stage") || "").trim().toLowerCase();
        if (STAGES.includes(/** @type {FlowStage} */ (dbg))) {
          this._stage = /** @type {FlowStage} */ (dbg);
        }
        if (pagePrefill && detail) {
          const fn = String(detail.firstName ?? "").trim();
          const ln = String(detail.lastName ?? "").trim();
          const em = String(detail.email ?? "").trim();
          const code = normalizeJoinAccessCodeInput(detail.accessCode || "");
          if (fn) this._formFirstName = fn;
          if (ln) this._formLastName = ln;
          if (fn || ln) this._formFullName = `${fn} ${ln}`.trim();
          if (em) this._formEmail = em;
          if (
            detail.subscriptionTier === "annual" ||
            detail.subscriptionTier === "quarterly" ||
            detail.subscriptionTier === "monthly"
          ) {
            this._joinSubscriptionTier = detail.subscriptionTier;
          } else {
            this._joinSubscriptionTier = "monthly";
          }
          const wantStage = String(detail.stage || "").trim();
          if (code.length === 8) {
            try {
              sessionStorage.setItem(PENDING_JOIN_ACCESS_CODE_KEY, code);
            } catch {
              /* ignore */
            }
            this._joinExemptCodePath = true;
            this._stage = "linkAccount";
          } else if (STAGES.includes(/** @type {FlowStage} */ (wantStage))) {
            this._stage = /** @type {FlowStage} */ (wantStage);
            if (this._stage === "payment") {
              void import("@stripe/stripe-js");
            }
          }
        }
        this._logoutIfDismissedWithoutJoin =
          _pendingLogoutIfDismissedWithoutAccount;
        _pendingLogoutIfDismissedWithoutAccount = false;
      }
    }
    this._fillDialogCopy();
    this._joinFlowCompleted = false;
    const fnEl = root.querySelector("#jnFirstName");
    const lnEl = root.querySelector("#jnLastName");
    const email = root.querySelector("#jnEmail");
    const acEl = root.querySelector("#jnAccessCode");
    if (fnEl instanceof HTMLInputElement) fnEl.value = this._formFirstName;
    if (lnEl instanceof HTMLInputElement) lnEl.value = this._formLastName;
    if (email instanceof HTMLInputElement) email.value = this._formEmail;
    if (acEl instanceof HTMLInputElement) {
      let persisted = "";
      try {
        persisted = sessionStorage.getItem(PENDING_JOIN_ACCESS_CODE_KEY) || "";
      } catch {
        persisted = "";
      }
      const fromDetail = pagePrefill
        ? normalizeJoinAccessCodeInput(detail?.accessCode || "")
        : "";
      acEl.value = fromDetail || normalizeJoinAccessCodeInput(persisted);
    }
    if (pagePrefill && detail?.category) {
      this._selectJoinRole(detail.category);
    }
    if (this._joinSubscriptionTier) {
      this._syncJoinPlanSelectionUi();
    }
    this._lastFocused = document.activeElement;
    if (dlg && typeof dlg.showModal === "function") {
      dlg.showModal();
      // Same backend actor as loadscreen `#csCTAForm` — warm connection early (before payment).
      prefetchFusionBackendActor();
      if (pagePrefill && this._joinExemptCodePath && this._formEmail) {
        const cat = this._getSelectedCategoryNormalized();
        const fullName =
          this._formFullName ||
          `${this._formFirstName} ${this._formLastName}`.trim();
        void submitEarlyAccessToCanister(
          this._formEmail,
          cat,
          fullName,
          this._modalType,
        ).catch((err) => {
          if (DEV_MODE) console.error("[JoinNetwork] page prefill early access", err);
        });
      }
      requestAnimationFrame(() => {
        const focusEl =
          this._stage === "payment"
            ? root.querySelector("#jnPayComplete") || root.querySelector("#jnFirstName")
            : root.querySelector("#jnFirstName") || openBtn;
        focusEl?.focus?.();
      });
    }
  }

  _wire() {
    const root = this.shadowRoot;
    if (!root) return;
    if (this._isStudioPreview()) {
      root.querySelector("#jnPlanGrid")?.addEventListener("click", (e) => {
        const btn = e.target?.closest?.("[data-jn-subscription-tier]");
        if (!(btn instanceof HTMLButtonElement)) return;
        const t = btn.getAttribute("data-jn-subscription-tier");
        if (!JOIN_SUBSCRIPTION_TIERS.includes(/** @type {JoinSubscriptionTier} */ (t))) return;
        this._joinSubscriptionTier = t;
        this._syncJoinPlanSelectionUi();
      });
      return;
    }
    const dlg = root.querySelector(".jn-dialog");
    const openBtn = root.querySelector("#bandOpenBtn");
    const closeBtn = root.querySelector(".jn-close");

    openBtn?.addEventListener("click", () => {
      // Prefer the dedicated membership page; hold off on opening the band modal.
      navigate("/join-network");
    });

    closeBtn?.addEventListener("click", () => {
      if (dlg && typeof dlg.close === "function") dlg.close();
    });

    dlg?.addEventListener("close", () => {
      this._teardownStripePayment();
      this._joinExemptCodePath = false;
      try {
        sessionStorage.removeItem(PENDING_JOIN_ACCESS_CODE_KEY);
      } catch {
        /* ignore */
      }
      try {
        if (this._stage === "linkAccount") {
          sessionStorage.removeItem(FUSION_PENDING_MEMBERSHIP_LINK_KEY);
        }
      } catch {
        /* ignore */
      }
      const shouldLogoutIi =
        this._logoutIfDismissedWithoutJoin && !this._joinFlowCompleted;
      this._logoutIfDismissedWithoutJoin = false;
      this._joinFlowCompleted = false;
      if (shouldLogoutIi) {
        void import("../../utils/icAuth.js").then((m) =>
          m.logoutInternetIdentity(),
        );
      }
      if (this._lastFocused && typeof this._lastFocused.focus === "function") {
        try {
          this._lastFocused.focus();
        } catch (_) {
          /* ignore */
        }
      }
    });

    const roleGroups = root.querySelector("#jnRoleGroups");
    roleGroups?.addEventListener("click", (e) => {
      const btn = e.target.closest(".categoryButton");
      if (!btn || !roleGroups.contains(btn)) return;
      roleGroups
        .querySelectorAll(".categoryButton")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });

    root.querySelector("#jnEntryContinue")?.addEventListener("click", () => {
      const err = root.querySelector("#jnEntryErr");
      if (err) err.textContent = "";
      const fn = (root.querySelector("#jnFirstName")?.value || "").trim();
      const ln = (root.querySelector("#jnLastName")?.value || "").trim();
      const email = (root.querySelector("#jnEmail")?.value || "").trim();
      const codeNorm = normalizeJoinAccessCodeInput(
        root.querySelector("#jnAccessCode")?.value || "",
      );
      const cat = this._getSelectedCategoryNormalized();
      if (!cat) {
        if (err) err.textContent = "Please select a role first.";
        return;
      }
      if (!fn || !ln) {
        if (err) err.textContent = "Please enter your first and last name.";
        return;
      }
      if (!email || !email.includes("@")) {
        if (err) err.textContent = "Please enter a valid email.";
        return;
      }
      const fullName = `${fn} ${ln}`.trim();
      this._formFirstName = fn;
      this._formLastName = ln;
      this._formFullName = fullName;
      this._formEmail = email;
      saveProfileSetupDraft({
        firstName: fn,
        lastName: ln,
        fullName,
        email,
      });
      syncPosthogConversionPerson({
        email,
        firstName: fn,
        lastName: ln,
      });
      prefetchFusionBackendActor();
      if (codeNorm.length === 8) {
        try {
          sessionStorage.setItem(PENDING_JOIN_ACCESS_CODE_KEY, codeNorm);
        } catch {
          /* ignore */
        }
        void (async () => {
          try {
            await submitEarlyAccessToCanister(
              email,
              cat,
              fullName,
              this._modalType,
            );
            this._joinExemptCodePath = true;
            this._stage = "linkAccount";
            this._fillDialogCopy();
          } catch (subErr) {
            try {
              sessionStorage.removeItem(PENDING_JOIN_ACCESS_CODE_KEY);
            } catch {
              /* ignore */
            }
            if (DEV_MODE) console.error("[JoinNetwork] early access (exempt)", subErr);
            if (err) {
              err.textContent =
                subErr instanceof Error
                  ? subErr.message
                  : "Could not save your signup. Please try again.";
            }
          }
        })();
        return;
      }
      this._joinExemptCodePath = false;
      try {
        sessionStorage.removeItem(PENDING_JOIN_ACCESS_CODE_KEY);
      } catch {
        /* ignore */
      }
      this._showStage("value");
    });

    root.querySelector("#jnPlanGrid")?.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("[data-jn-subscription-tier]");
      if (!(btn instanceof HTMLButtonElement)) return;
      const t = btn.getAttribute("data-jn-subscription-tier");
      if (!JOIN_SUBSCRIPTION_TIERS.includes(/** @type {JoinSubscriptionTier} */ (t))) return;
      this._joinSubscriptionTier = t;
      this._syncJoinPlanSelectionUi();
    });

    root.querySelector("#jnValueContinue")?.addEventListener("click", () => {
      if (!this._joinSubscriptionTier) return;
      prefetchFusionBackendActor();
      // Warm Stripe.js module while the user reads the payment step (overlaps with paint).
      void import("@stripe/stripe-js");
      this._showStage("payment");
    });
    root.querySelector("#jnValueBack")?.addEventListener("click", () => {
      this._showStage("entry");
    });

    root.querySelector("#jnPayBack")?.addEventListener("click", () => {
      this._showStage("value");
    });

    root.querySelector("#jnLinkSignIn")?.addEventListener("click", async () => {
      const errEl = root.querySelector("#jnLinkErr");
      const linkingEl = root.querySelector("#jnLinkLinking");
      const signInBtn = root.querySelector("#jnLinkSignIn");
      if (errEl) errEl.textContent = "";
      try {
        const { getAuthSnapshot, loginInternetIdentity } =
          await import("../../utils/icAuth.js");
        await loginInternetIdentity({ source: "join-link" });
        const snap = await getAuthSnapshot();
        if (snap.authenticated) {
          identifyPosthogAfterInternetIdentityLogin(
            snap.principal.toText(),
            {
              email: this._formEmail,
              firstName: this._formFirstName,
              lastName: this._formLastName,
            },
          );
          if (linkingEl) {
            linkingEl.textContent = "Linking your access…";
            linkingEl.hidden = false;
          }
          if (signInBtn instanceof HTMLElement) signInBtn.hidden = true;
          await this._tryCompletePendingLink();
        }
      } catch (e) {
        if (e === ERROR_USER_INTERRUPT) return;
        if (linkingEl) {
          linkingEl.textContent = "";
          linkingEl.hidden = true;
        }
        if (signInBtn instanceof HTMLElement) signInBtn.hidden = false;
        if (errEl) {
          errEl.textContent =
            e instanceof Error
              ? e.message
              : "Sign-in could not complete. Try again.";
        }
      }
    });

    const afterJoinSaved = async () => {
      await this._afterJoinSaved();
    };

    const completePayment = async () => {
      const errEl = root.querySelector("#jnPayErr");
      if (errEl) errEl.textContent = "";
      const email = this._formEmail.trim();
      const cat = this._getSelectedCategoryNormalized();
      if (!email || !cat) {
        if (errEl)
          errEl.textContent = "Missing email or role. Go back to step 1.";
        return;
      }
      if (this._joinNetworkSubmitting) return;

      if (this._stripe && this._stripeElements) {
        if (!this._stripePaymentReady) {
          if (errEl) {
            errEl.textContent =
              "Payment form is still loading. Wait until the card fields appear, then try again.";
          }
          return;
        }
        const payBtn = root.querySelector("#jnPayComplete");
        const doneLabel =
          this._paymentCompleteLabel ||
          payBtn?.textContent?.trim() ||
          "Secure Access";
        const procLabel = this._paymentProcessingLabel || "Processing…";
        this._joinNetworkSubmitting = true;
        if (payBtn) {
          payBtn.disabled = true;
          payBtn.textContent = procLabel;
        }
        try {
          const { error } = await this._stripe.confirmPayment({
            elements: this._stripeElements,
            confirmParams: {
              return_url: window.location.href,
            },
            redirect: "if_required",
          });
          if (error) {
            posthog.capture("membership_payment_failed", {
              modal_type:
                this._modalType ||
                this.getAttribute("data-modal-type") ||
                "membership",
              join_mode: this._joinMode || "full",
              stripe_error_type: error.type || undefined,
              stripe_error_code: error.code || undefined,
            });
            if (errEl) errEl.textContent = error.message || "Payment failed.";
            return;
          }
          const purchaseValue = this._paymentAmountCents / 100;
          const pageContext = String(
            this.getAttribute("context") || "home",
          ).trim() || "home";
          syncPosthogConversionPerson({
            email,
            firstName: this._formFirstName,
            lastName: this._formLastName,
          });
          posthog.capture("membership_payment_completed", {
            modal_type:
              this._modalType ||
              this.getAttribute("data-modal-type") ||
              "membership",
            join_mode: this._joinMode || "full",
            join_role: cat,
            page_context: pageContext,
            amount_cents: this._paymentAmountCents,
            amount: purchaseValue,
            value: purchaseValue,
            currency: "USD",
            payment_plan: this._paymentPlanKey ?? "unknown",
            payment_provider: "stripe",
            ...(this._paymentPlanLabel
              ? { payment_plan_label: this._paymentPlanLabel }
              : {}),
            ...(this._fusionSubscriptionId
              ? { stripe_subscription_id: this._fusionSubscriptionId }
              : {}),
            ads_conversion: "Purchase",
          });
          metaTrack("Purchase", {
            value: purchaseValue,
            currency: "USD",
            content_name: "membership_signup",
          });
          if (this._joinMode === "full" && this._fusionPendingId) {
            try {
              sessionStorage.setItem(FUSION_PENDING_MEMBERSHIP_LINK_KEY, "1");
            } catch {
              /* ignore */
            }
            markPendingMembershipPaymentCompleted();
            void this._sendPostPaymentLinkInternetIdentityEmail(
              this._getEmailForSubscription(),
            );
            this._showStage("linkAccount");
            return;
          }
          try {
            const { getIdentityIfAuthenticated } =
              await import("../../utils/icAuth.js");
            const id = await getIdentityIfAuthenticated();
            const em = this._getEmailForSubscription();
            if (id && em.includes("@")) {
              setStoredBillingEmailForPrincipal(
                id.getPrincipal().toText(),
                em,
              );
            }
          } catch {
            /* ignore */
          }
          await afterJoinSaved();
        } catch (e) {
          if (DEV_MODE) console.error("[JoinNetwork] confirmPayment", e);
          const stripeLike =
            e &&
            typeof e === "object" &&
            "type" in e &&
            typeof e.type === "string";
          posthog.capture("membership_payment_failed", {
            modal_type:
              this._modalType ||
              this.getAttribute("data-modal-type") ||
              "membership",
            join_mode: this._joinMode || "full",
            failure_kind: "exception",
            ...(stripeLike
              ? {
                  stripe_error_type: e.type,
                  stripe_error_code:
                    "code" in e && typeof e.code === "string"
                      ? e.code
                      : undefined,
                }
              : {}),
          });
          if (errEl) {
            errEl.textContent =
              e instanceof Error
                ? e.message
                : "Payment could not be completed.";
          }
        } finally {
          this._joinNetworkSubmitting = false;
          if (payBtn) {
            payBtn.disabled = false;
            payBtn.textContent = doneLabel;
          }
        }
        return;
      }

      if (this._stripePaymentReady && getActiveProvider() === "paypal") {
        if (!this._fusionSubscriptionId) {
          if (errEl) {
            errEl.textContent =
              "Approve your subscription with PayPal below, then try again.";
          }
          return;
        }
        const payBtn = root.querySelector("#jnPayComplete");
        const doneLabel =
          this._paymentCompleteLabel ||
          payBtn?.textContent?.trim() ||
          "Secure Access";
        const procLabel = this._paymentProcessingLabel || "Processing…";
        this._joinNetworkSubmitting = true;
        if (payBtn) {
          payBtn.disabled = true;
          payBtn.textContent = procLabel;
        }
        try {
          const emailForSub = this._getEmailForSubscription();
          const { getIdentityIfAuthenticated } =
            await import("../../utils/icAuth.js");
          const identity = await getIdentityIfAuthenticated();
          const principalText = identity?.getPrincipal().toText();
          if (this._joinMode === "resubscribe" && principalText) {
            await syncPayPalSubscription({
              principal: principalText,
              subscriptionId: this._fusionSubscriptionId,
            });
          }
          const purchaseValue = this._paymentAmountCents / 100;
          const pageContext = String(
            this.getAttribute("context") || "home",
          ).trim() || "home";
          syncPosthogConversionPerson({
            email,
            firstName: this._formFirstName,
            lastName: this._formLastName,
          });
          posthog.capture("membership_payment_completed", {
            modal_type:
              this._modalType ||
              this.getAttribute("data-modal-type") ||
              "membership",
            join_mode: this._joinMode || "full",
            join_role: cat,
            page_context: pageContext,
            amount_cents: this._paymentAmountCents,
            amount: purchaseValue,
            value: purchaseValue,
            currency: "USD",
            payment_plan: this._paymentPlanKey ?? "unknown",
            payment_provider: "paypal",
            ...(this._paymentPlanLabel
              ? { payment_plan_label: this._paymentPlanLabel }
              : {}),
            ...(this._fusionSubscriptionId
              ? { paypal_subscription_id: this._fusionSubscriptionId }
              : {}),
            ads_conversion: "Purchase",
          });
          metaTrack("Purchase", {
            value: purchaseValue,
            currency: "USD",
            content_name: "membership_signup",
          });
          if (this._joinMode === "full" && this._fusionPendingId) {
            try {
              sessionStorage.setItem(FUSION_PENDING_MEMBERSHIP_LINK_KEY, "1");
            } catch {
              /* ignore */
            }
            markPendingMembershipPaymentCompleted();
            void this._sendPostPaymentLinkInternetIdentityEmail(
              this._getEmailForSubscription(),
            );
            this._showStage("linkAccount");
            return;
          }
          try {
            const { getIdentityIfAuthenticated } =
              await import("../../utils/icAuth.js");
            const id = await getIdentityIfAuthenticated();
            const em = this._getEmailForSubscription();
            if (id && em.includes("@")) {
              setStoredBillingEmailForPrincipal(
                id.getPrincipal().toText(),
                em,
              );
            }
          } catch {
            /* ignore */
          }
          await afterJoinSaved();
        } catch (e) {
          if (DEV_MODE) console.error("[JoinNetwork] confirmPayment", e);
          const stripeLike =
            e &&
            typeof e === "object" &&
            "type" in e &&
            typeof e.type === "string";
          posthog.capture("membership_payment_failed", {
            modal_type:
              this._modalType ||
              this.getAttribute("data-modal-type") ||
              "membership",
            join_mode: this._joinMode || "full",
            failure_kind: "exception",
            ...(stripeLike
              ? {
                  stripe_error_type: e.type,
                  stripe_error_code:
                    "code" in e && typeof e.code === "string"
                      ? e.code
                      : undefined,
                }
              : {}),
          });
          if (errEl) {
            errEl.textContent =
              e instanceof Error
                ? e.message
                : "Payment could not be completed.";
          }
        } finally {
          this._joinNetworkSubmitting = false;
          if (payBtn) {
            payBtn.disabled = false;
            payBtn.textContent = doneLabel;
          }
        }
        return;
      }

      if (errEl) {
        errEl.textContent =
          "Payment form is not ready. Configure Services or use dev skip if available.";
      }
    };

    root
      .querySelector("#jnPayComplete")
      ?.addEventListener("click", completePayment);

    root.querySelector("#jnPayDevSkip")?.addEventListener("click", async () => {
      if (!DEV_MODE) return;
      const errEl = root.querySelector("#jnPayErr");
      if (errEl) errEl.textContent = "";
      const email = this._formEmail.trim();
      const cat = this._getSelectedCategoryNormalized();
      if (this._joinMode !== "resubscribe" && (!email || !cat)) {
        if (errEl)
          errEl.textContent = "Missing email or role. Go back to step 1.";
        return;
      }
      if (this._joinNetworkSubmitting) return;
      this._joinNetworkSubmitting = true;
      try {
        if (this._joinMode === "resubscribe") {
          this._preStripeCanisterSyncDone = true;
        }
        await afterJoinSaved();
      } catch (e) {
        if (DEV_MODE) console.error("[JoinNetwork]", e);
        if (errEl) errEl.textContent = "Could not save. Please try again.";
      } finally {
        this._joinNetworkSubmitting = false;
      }
    });

    root.querySelector("#jnPrimaryCta")?.addEventListener("click", () => {
      this._joinFlowCompleted = true;
      navigate("/settings/profile");
      if (dlg && typeof dlg.close === "function") dlg.close();
    });

    root.querySelector("#jnApplyResidency")?.addEventListener("click", () => {
      this._joinFlowCompleted = true;
      navigate("/program/kaga-ishikawa");
      if (dlg && typeof dlg.close === "function") dlg.close();
    });

    root.querySelector("#jnConfLinks")?.addEventListener("click", (e) => {
      const a = e.target.closest("a[data-href]");
      if (!a) return;
      e.preventDefault();
      const href = a.getAttribute("data-href") || a.getAttribute("href");
      if (href) {
        this._joinFlowCompleted = true;
        navigate(href);
      }
      if (dlg && typeof dlg.close === "function") dlg.close();
    });
  }
}

customElements.define("app-join-network", JoinNetworkComponent);

/**
 * Join entry points: route to `/join-network` by default.
 * Keep the modal only for checkout handoff, pending-link resume, and resubscribe.
 */
window.addEventListener("fusion-open-join-network", (ev) => {
  const d =
    ev && typeof ev === "object" && "detail" in ev
      ? /** @type {CustomEvent} */ (ev).detail
      : null;
  const detail =
    d && typeof d === "object"
      ? /** @type {Record<string, unknown>} */ (d)
      : null;
  const needsModal = Boolean(
    detail &&
      (detail.fromJoinNetworkPage ||
        detail.resumePendingLink ||
        detail.mode === "resubscribe"),
  );
  if (!needsModal) {
    _pendingLogoutIfDismissedWithoutAccount = false;
    navigate("/join-network");
    return;
  }
  _pendingLogoutIfDismissedWithoutAccount = Boolean(
    detail &&
      detail.logoutIfDismissedWithoutAccount &&
      detail.mode !== "resubscribe",
  );
  /** Prefer page/header bridge instance; pass full detail for /join-network prefills. */
  const openOpts = detail || undefined;
  const pageBridge = document.querySelector(
    'app-join-network[context="join-network"]',
  );
  if (
    detail?.fromJoinNetworkPage &&
    pageBridge &&
    typeof pageBridge.openModal === "function"
  ) {
    pageBridge.openModal(openOpts);
    return;
  }
  const bridge = document.getElementById("joinNetworkHeaderBridge");
  if (bridge && typeof bridge.openModal === "function") {
    bridge.openModal(openOpts);
    return;
  }
  if (pageBridge && typeof pageBridge.openModal === "function") {
    pageBridge.openModal(openOpts);
    return;
  }
  const fallback = document.querySelector("app-join-network");
  if (fallback && typeof fallback.openModal === "function") {
    fallback.openModal(openOpts);
    return;
  }
  _pendingLogoutIfDismissedWithoutAccount = false;
});

export { JoinNetworkComponent };
