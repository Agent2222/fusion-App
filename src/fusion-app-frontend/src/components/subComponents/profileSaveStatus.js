class ProfileSaveStatus extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hideTimer = null;
    this._onStatus = (event) => {
      const detail =
        event instanceof CustomEvent && detailIsObject(event.detail)
          ? event.detail
          : {};
      this.setState(
        String(detail.state || "idle"),
        String(detail.message || ""),
        String(detail.operation || ""),
        String(detail.detail || ""),
      );
    };
  }

  connectedCallback() {
    if (
      this.id === "settingsProfileFloatingSaveStatus" &&
      typeof document !== "undefined" &&
      this.parentElement !== document.body
    ) {
      const existing = document.body.querySelector("#settingsProfileFloatingSaveStatus");
      if (existing && existing !== this) existing.remove();
      document.body.appendChild(this);
      return;
    }
    this.render();
    window.addEventListener("fusion-profile-save-status", this._onStatus);
    this.addEventListener("click", () => this.hide());
  }

  disconnectedCallback() {
    window.removeEventListener("fusion-profile-save-status", this._onStatus);
    this.clearHideTimer();
  }

  clearHideTimer() {
    if (this._hideTimer) {
      window.clearTimeout(this._hideTimer);
      this._hideTimer = null;
    }
  }

  hide() {
    this.clearHideTimer();
    this.setAttribute("hidden", "");
    this.setAttribute("aria-hidden", "true");
  }

  /**
   * @param {string} state
   * @param {string} message
   * @param {string} operation
   * @param {string} detail
   */
  setState(state, message, operation = "", detail = "") {
    this.clearHideTimer();
    const normalized = ["saving", "saved", "error"].includes(state)
      ? state
      : "idle";
    if (normalized === "idle") {
      this.hide();
      return;
    }
    const label =
      message ||
      (normalized === "saving"
        ? "Saving"
        : normalized === "saved"
          ? "Profile saved"
          : "Save failed");
    const operationLabel = operation.trim();
    const detailLabel = detail.trim();
    this.removeAttribute("hidden");
    this.setAttribute("aria-hidden", "false");
    this.dataset.state = normalized;
    const text = this.shadowRoot?.querySelector(".pss-text");
    if (text) text.textContent = label;
    const op = this.shadowRoot?.querySelector(".pss-operation");
    if (op) {
      op.textContent = operationLabel;
      op.toggleAttribute("hidden", !operationLabel);
    }
    const sub = this.shadowRoot?.querySelector(".pss-detail");
    if (sub) {
      sub.textContent = detailLabel;
      sub.toggleAttribute("hidden", !detailLabel);
    }
    const icon = this.shadowRoot?.querySelector(".pss-icon");
    if (icon) icon.textContent = normalized === "saved" ? "✓" : normalized === "error" ? "!" : "";
    if (normalized === "saved") {
      this._hideTimer = window.setTimeout(() => this.hide(), 2600);
    }
  }

  render() {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: fixed !important;
          left: 50% !important;
          right: auto;
          bottom: calc(2rem + env(safe-area-inset-bottom, 0px)) !important;
          z-index: 1300;
          width: min(calc(100vw - 2rem), 22rem);
          font-family: 'momochidori-variable', 'Helvetica Neue', sans-serif;
          font-variation-settings: 'wght' 500;
          color: var(--c2, #000);
          pointer-events: auto;
          transform: translateX(-50%) !important;
        }
        :host([hidden]) {
          display: none !important;
        }
        .pss-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.62rem;
          box-sizing: border-box;
          width: 100%;
          min-height: 3.15rem;
          padding: 0.75rem 1.05rem 0.82rem;
          border: 1px solid var(--c2, #000);
          border-radius: 999px;
          background: var(--c5, var(--bg, #faf3f4));
          color: var(--c2, #000);
          cursor: pointer;
          user-select: none;
          box-shadow: 0 18px 52px rgba(15, 23, 42, 0.18);
        }
        .pss-spinner {
          display: none;
          width: 1rem;
          height: 1rem;
          border: 1.5px solid color-mix(in srgb, var(--c2) 24%, var(--c5, var(--bg)) 76%);
          border-top-color: var(--c2, #000);
          border-radius: 50%;
          box-sizing: border-box;
          animation: pssSpin 0.72s linear infinite;
        }
        :host([data-state="saving"]) .pss-spinner {
          display: block;
        }
        .pss-icon {
          display: none;
          min-width: 1rem;
          font-size: 0.95rem;
          line-height: 1;
          font-variation-settings: 'wght' 700;
        }
        :host([data-state="saved"]) .pss-icon,
        :host([data-state="error"]) .pss-icon {
          display: inline-flex;
        }
        .pss-text {
          min-width: 0;
          font-size: clamp(0.82rem, 0.92vw, 0.98rem);
          line-height: 1.25;
          letter-spacing: 0.02em;
          text-align: center;
        }
        .pss-copy {
          display: flex;
          min-width: 0;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.1rem;
        }
        .pss-operation {
          max-width: 100%;
          font-size: 0.68rem;
          line-height: 1.05;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          opacity: 0.72;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pss-operation[hidden],
        .pss-detail[hidden] {
          display: none;
        }
        .pss-detail {
          max-width: 100%;
          font-size: 0.72rem;
          line-height: 1.15;
          letter-spacing: 0.01em;
          opacity: 0.72;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: center;
        }
        @keyframes pssSpin {
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pss-spinner { animation: none; }
        }
      </style>
      <div class="pss-wrap" role="status" aria-live="polite" title="Dismiss save status">
        <span class="pss-spinner" aria-hidden="true"></span>
        <span class="pss-icon" aria-hidden="true"></span>
        <span class="pss-copy">
          <span class="pss-operation" hidden></span>
          <span class="pss-text">Saving</span>
          <span class="pss-detail" hidden></span>
        </span>
      </div>
    `;
    this.hide();
  }
}

/** @param {unknown} value */
function detailIsObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

customElements.define("app-profile-save-status", ProfileSaveStatus);

export { ProfileSaveStatus };
