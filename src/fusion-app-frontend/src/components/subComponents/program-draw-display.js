/**
 * Program Draw status display — cycle progress, how-it-works, expandable past recipients + About.
 * Copy from CMS slug `program-draw` (Studio → Content).
 */

import {
    getArtists,
    getContentBundleForStudio,
    getProgramDrawConfigPublic,
    getProgramDrawProgressPublic,
    listArtistDrawRecipientsPublic,
} from '../../utils/database.js';
import { DRAW_SLOT_GOAL_DEFAULT } from '../../utils/applicantsDrawModel.js';
import {
    defaultProgramDrawLocaleEn,
    formatProgramDrawCopyTemplate,
    formatRemainingTemplate,
    programDrawBrandLabel,
    resolveProgramDrawLocale,
} from '../../utils/programDrawContent.js';
import {
    PH_LOADER_BASE_STYLES,
    PROGRAM_DRAW_PENDING_WRAPPER_STYLES,
    programHeroLoaderHtml,
} from '../../utils/programHeroLoader.js';
import { artistDisplayName, artistLocaleBlock } from '../../utils/artistSlug.js';
import { resolveArtistPublicCardImageUrl } from '../../utils/artistCardImageMode.js';
import { resolveArtistCardImageUrl } from '../../utils/artistCardPlaceholder.js';
import entryTicketIcon from '../../assets/icons/fusion_svg_icons_b2/entry-ticket.svg';
import memberUserIcon from '../../assets/icons/fusion_svg_icons_b2/member-user.svg';
import includedGiftIcon from '../../assets/icons/fusion_svg_icons_b2/included-gift.svg';
import calendarSlotsIcon from '../../assets/icons/fusion_svg_icons_b2/calendar-slots.svg';

/** Masked icon from `fusion_svg_icons_b2` — inherits `currentColor` like application-form fee icons. */
function pddIconHtml(iconUrl) {
    const url = String(iconUrl || '').replace(/"/g, '');
    return `<span class="pdd__col-icon" style="--pdd-icon-url: url(&quot;${url}&quot;)" aria-hidden="true"></span>`;
}

/**
 * @typedef {{ cycle: number, name: string, place: string, residencyDate: string, image: string }} DrawRecipient
 * @typedef {{
 *   key: string,
 *   cmsBundle: unknown,
 *   cycle: { claimed: number, total: number, cycle: number },
 *   recipients: DrawRecipient[],
 *   programLabel: string,
 *   drawActive: boolean,
 * }} ProgramDrawDisplayCache
 */

/** @type {ProgramDrawDisplayCache | null} */
let displayDataCache = null;
/** @type {string} */
let displayDataInflightKey = '';
/** @type {Promise<ProgramDrawDisplayCache> | null} */
let displayDataInflight = null;

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function currentLocale() {
    return typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
}

/**
 * @param {string} [programId]
 * @param {string} [locale]
 */
function displayCacheKey(programId = '', locale = currentLocale()) {
    return `${String(programId || '').trim()}|${locale === 'ja' ? 'ja' : 'en'}`;
}

/**
 * @param {object | null | undefined} artist
 * @param {string} locale
 */
function artistPlaceLine(artist, locale) {
    const loc = artistLocaleBlock(artist, locale);
    if (loc && typeof loc === 'object') {
        const o = /** @type {Record<string, unknown>} */ (loc);
        for (const key of ['basedIn', 'location', 'place', 'city']) {
            const v = o[key];
            if (v != null && String(v).trim()) return String(v).trim();
        }
    }
    const filter =
        artist && typeof artist === 'object'
            ? /** @type {Record<string, unknown>} */ (artist).filter
            : null;
    if (filter && typeof filter === 'object') {
        const lk = /** @type {Record<string, unknown>} */ (filter).locationKey;
        if (lk != null && String(lk).trim()) return String(lk).trim();
    }
    return '';
}

/**
 * Notify mounted displays that cache was enriched (progress / recipients).
 * @param {string} key
 */
function notifyDisplayDataEnriched(key) {
    try {
        window.dispatchEvent(
            new CustomEvent('fusion-program-draw-display-enriched', { detail: { key } }),
        );
    } catch {
        /* ignore */
    }
}

/**
 * Background: progress counts + past recipients (must not block first paint).
 * @param {string} pid
 * @param {string} key
 * @param {string} locale
 * @param {ProgramDrawDisplayCache} base
 */
function enrichProgramDrawDisplayData(pid, key, locale, base) {
    void (async () => {
        try {
            const [progress, rows, artists] = await Promise.all([
                pid ? getProgramDrawProgressPublic(pid).catch(() => null) : Promise.resolve(null),
                listArtistDrawRecipientsPublic().catch(() => []),
                getArtists().catch(() => []),
            ]);
            if (displayDataCache?.key !== key) return;

            let total = Number(base.cycle?.total) > 0 ? Number(base.cycle.total) : DRAW_SLOT_GOAL_DEFAULT;
            const tProgress = Number(progress?.totalSlots);
            if (Number.isFinite(tProgress) && tProgress > 0) total = Math.floor(tProgress);
            const claimedRaw = Number(progress?.enteredCount);
            const claimed =
                Number.isFinite(claimedRaw) && claimedRaw >= 0 ? Math.floor(claimedRaw) : 0;
            const cycleRaw = Number(progress?.cycle);
            const cycle = Number.isFinite(cycleRaw) && cycleRaw > 0 ? Math.floor(cycleRaw) : 1;

            const byId = new Map(
                (Array.isArray(artists) ? artists : []).map((a) => [String(a?.id || '').trim(), a]),
            );
            /** @type {DrawRecipient[]} */
            const recipients = [];
            for (const row of rows || []) {
                if (!row?.artistId) continue;
                if (pid && row.programId && row.programId !== pid) continue;
                const artist = byId.get(String(row.artistId).trim());
                const name = artist
                    ? artistDisplayName(artist, locale) || String(row.artistId)
                    : String(row.artistId);
                const image = artist
                    ? resolveArtistCardImageUrl(resolveArtistPublicCardImageUrl(artist))
                    : '';
                recipients.push({
                    cycle: Number(row.cycle) || 1,
                    name,
                    place: artist ? artistPlaceLine(artist, locale) : '',
                    residencyDate: String(row.awardLabel || '').trim(),
                    image,
                });
            }

            /** @type {ProgramDrawDisplayCache} */
            const packed = {
                ...base,
                key,
                cycle: { claimed, total, cycle },
                recipients,
                drawActive:
                    progress != null ? Boolean(progress.active) : base.drawActive !== false,
            };
            displayDataCache = packed;
            notifyDisplayDataEnriched(key);
        } catch {
            /* keep fast-path cache */
        }
    })();
}

/**
 * Prefetch CMS + draw config for first paint; progress/recipients enrich in background.
 * Safe to call from the Enter Program Draw CTA before the display mounts.
 *
 * @param {string} [programId]
 * @returns {Promise<ProgramDrawDisplayCache>}
 */
export function preloadProgramDrawDisplayData(programId = '') {
    const locale = currentLocale();
    const key = displayCacheKey(programId, locale);
    if (displayDataCache?.key === key) {
        return Promise.resolve(displayDataCache);
    }
    if (displayDataInflight && displayDataInflightKey === key) {
        return displayDataInflight;
    }

    const pid = String(programId || '').trim();
    displayDataInflightKey = key;
    displayDataInflight = (async () => {
        // Fast path only — never wait on getArtists / progress (those stalled the loader).
        const [cmsBundle, cfg] = await Promise.all([
            getContentBundleForStudio('program-draw', { forStudio: false }).catch(() => null),
            pid ? getProgramDrawConfigPublic(pid).catch(() => null) : Promise.resolve(null),
        ]);

        let total = DRAW_SLOT_GOAL_DEFAULT;
        const tCfg = Number(cfg?.totalSlots);
        if (Number.isFinite(tCfg) && tCfg > 0) total = Math.floor(tCfg);

        /** @type {ProgramDrawDisplayCache} */
        const packed = {
            key,
            cmsBundle,
            cycle: { claimed: 0, total, cycle: 1 },
            recipients: [],
            programLabel: programDrawBrandLabel(pid),
            drawActive: cfg == null ? true : Boolean(cfg.active),
        };
        displayDataCache = packed;
        enrichProgramDrawDisplayData(pid, key, locale, packed);
        return packed;
    })().finally(() => {
        if (displayDataInflightKey === key) {
            displayDataInflight = null;
            displayDataInflightKey = '';
        }
    });

    return displayDataInflight;
}

class ProgramDrawDisplayComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        /** @type {boolean} */
        this._recipientsOpen = false;
        /** @type {boolean} */
        this._aboutOpen = false;
        /** @type {{ claimed: number, total: number, cycle: number }} */
        this._cycle = { claimed: 0, total: DRAW_SLOT_GOAL_DEFAULT, cycle: 1 };
        /** @type {DrawRecipient[]} */
        this._recipients = [];
        /** @type {unknown} */
        this._cmsBundle = null;
        /** @type {string} */
        this._programLabel = 'FUSION';
        /** @type {boolean} */
        this._drawActiveFromConfig = true;
        /** @type {string} */
        this._loadedKey = '';
        /** @type {{ pastRecipientsLabel: string, pastRecipientsHideLabel: string, moreDetailsLabel: string, moreDetailsHideLabel: string, learnHowLabel: string, drawActive: boolean } | null} */
        this._toggleLabels = null;
        this._onLocale = () => {
            this._loadedKey = '';
            void this.render();
        };
        this._onEnriched = (ev) => {
            const key = ev?.detail?.key;
            if (!key || key !== displayCacheKey(this._programId(), currentLocale())) return;
            if (displayDataCache?.key === key) {
                this._applyPacked(displayDataCache);
                void this.render();
            }
        };
    }

    static get observedAttributes() {
        return ['data-program-id', 'data-draw-active', 'data-user-entered'];
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if (oldVal === newVal) return;
        if (prop === 'data-program-id') {
            this._loadedKey = '';
            void this.render();
        } else if (prop === 'data-draw-active' || prop === 'data-user-entered') {
            void this.render();
        }
    }

    _isUserEntered() {
        return this.getAttribute('data-user-entered') === 'true';
    }

    /** Prefer `data-draw-active` attribute; else cached config. */
    _isDrawActive() {
        const attr = this.getAttribute('data-draw-active');
        if (attr === 'true') return true;
        if (attr === 'false') return false;
        return this._drawActiveFromConfig !== false;
    }

    connectedCallback() {
        window.addEventListener('fusion-localechange', this._onLocale);
        window.addEventListener('fusion-program-draw-display-enriched', this._onEnriched);
        this._renderLoading();
        void this.render();
    }

    disconnectedCallback() {
        window.removeEventListener('fusion-localechange', this._onLocale);
        window.removeEventListener('fusion-program-draw-display-enriched', this._onEnriched);
    }

    _programId() {
        return String(this.getAttribute('data-program-id') || '').trim();
    }

    _loadingLabel() {
        return currentLocale() === 'ja' ? 'プログラム抽選を読み込み中' : 'Loading Program Draw';
    }

    _renderLoading() {
        if (!this.shadowRoot) return;
        const label = this._loadingLabel();
        this.shadowRoot.innerHTML = `
      <style>
        ${PH_LOADER_BASE_STYLES}
        ${PROGRAM_DRAW_PENDING_WRAPPER_STYLES}
      </style>
      ${programHeroLoaderHtml({
          wrapperClass: 'pdd-pending-loader',
          ariaLabel: label,
          label,
      })}
    `;
    }

    _hasFreshData() {
        return this._loadedKey === displayCacheKey(this._programId(), currentLocale());
    }

    /**
     * Apply cached/prefetched payload onto the element.
     * @param {ProgramDrawDisplayCache} packed
     */
    _applyPacked(packed) {
        this._cmsBundle = packed.cmsBundle;
        this._cycle = packed.cycle;
        this._recipients = packed.recipients;
        this._programLabel = packed.programLabel || programDrawBrandLabel(this._programId());
        this._drawActiveFromConfig = packed.drawActive !== false;
        this._loadedKey = packed.key;
    }

    async _ensureData() {
        const key = displayCacheKey(this._programId(), currentLocale());
        if (this._loadedKey === key) return;
        if (displayDataCache?.key === key) {
            this._applyPacked(displayDataCache);
            return;
        }
        const packed = await preloadProgramDrawDisplayData(this._programId());
        this._applyPacked(packed);
    }

    _syncExpandUi() {
        if (!this.shadowRoot || !this._toggleLabels) return;
        const L = this._toggleLabels;
        const recipients = this.shadowRoot.querySelector('#pdd-recipients');
        const about = this.shadowRoot.querySelector('#pdd-about');
        const pastBtn = this.shadowRoot.querySelector('[data-pdd-past-toggle]');
        const aboutBtn = this.shadowRoot.querySelector('[data-pdd-about-toggle]');
        if (recipients instanceof HTMLElement) {
            recipients.hidden = !this._recipientsOpen;
        }
        if (about instanceof HTMLElement) {
            about.hidden = !this._aboutOpen;
        }
        if (pastBtn instanceof HTMLButtonElement) {
            pastBtn.setAttribute('aria-expanded', this._recipientsOpen ? 'true' : 'false');
            pastBtn.textContent = this._recipientsOpen
                ? L.pastRecipientsHideLabel
                : L.pastRecipientsLabel;
        }
        if (aboutBtn instanceof HTMLButtonElement) {
            aboutBtn.setAttribute('aria-expanded', this._aboutOpen ? 'true' : 'false');
            if (L.drawActive === false) {
                aboutBtn.textContent = this._aboutOpen ? L.moreDetailsHideLabel : L.learnHowLabel;
            } else {
                aboutBtn.textContent = this._aboutOpen ? L.moreDetailsHideLabel : L.moreDetailsLabel;
            }
        }
    }

    async render() {
        if (!this.shadowRoot) return;
        // Apply warm cache before deciding to show the loader (avoids a one-frame flash).
        const warmKey = displayCacheKey(this._programId(), currentLocale());
        if (this._loadedKey !== warmKey && displayDataCache?.key === warmKey) {
            this._applyPacked(displayDataCache);
        }
        if (!this._hasFreshData()) {
            this._renderLoading();
        }
        await this._ensureData();
        const locale = currentLocale();
        const copy = resolveProgramDrawLocale(this._cmsBundle, locale);
        const L = copy.display;
        const about = copy.about;
        const drawActive = this._isDrawActive();
        this._toggleLabels = {
            pastRecipientsLabel: L.pastRecipientsLabel,
            pastRecipientsHideLabel: L.pastRecipientsHideLabel,
            moreDetailsLabel: L.moreDetailsLabel,
            moreDetailsHideLabel: L.moreDetailsHideLabel,
            learnHowLabel: L.learnHowLabel,
            drawActive,
        };
        const { claimed, total, cycle } = this._cycle;
        const remaining = Math.max(0, total - claimed);
        const pct = total > 0 ? Math.min(100, Math.round((claimed / total) * 100)) : 0;
        const recipientsOpen = this._recipientsOpen;
        const aboutOpen = this._aboutOpen;
        const copyVars = {
            program: this._programLabel || programDrawBrandLabel(this._programId()),
            total,
            n: cycle,
        };
        const cycleLabel = formatProgramDrawCopyTemplate(L.roundLabelTemplate, copyVars);
        const howBody = formatProgramDrawCopyTemplate(L.howBody, copyVars);
        const selectionBody = formatProgramDrawCopyTemplate(L.selectionBody, copyVars);
        const awardBody = formatProgramDrawCopyTemplate(L.awardDate, copyVars);
        const awardNote = formatProgramDrawCopyTemplate(L.awardNote || '', copyVars).trim();

        const badge = drawActive ? L.badge : L.badgeInactive || L.badge;
        const sub = drawActive ? L.sub : L.subInactive || L.sub;
        const userEntered = drawActive && this._isUserEntered();
        const primaryActiveCta = userEntered
            ? `<button type="button" class="pdd__submit pdd__submit--entered" data-pdd-entered disabled aria-disabled="true">${escapeHtml(L.enteredLabel || "You're entered")}</button>`
            : `<button type="button" class="pdd__submit" data-pdd-submit>${escapeHtml(L.submitLabel)}</button>`;
        const ctaActionsHtml = drawActive
            ? `<div class="pdd__cta-btn-row">
                ${primaryActiveCta}
                <button type="button" class="pdd__submit pdd__submit--ghost" data-pdd-apply>${escapeHtml(L.applyToProgramLabel)}</button>
              </div>
              <div class="pdd__link-row">
                <button type="button" class="pdd__text-link" data-pdd-past-toggle aria-expanded="${recipientsOpen ? 'true' : 'false'}" aria-controls="pdd-recipients">
                  ${escapeHtml(recipientsOpen ? L.pastRecipientsHideLabel : L.pastRecipientsLabel)}
                </button>
                <span class="pdd__link-sep" aria-hidden="true">·</span>
                <button type="button" class="pdd__text-link" data-pdd-about-toggle aria-expanded="${aboutOpen ? 'true' : 'false'}" aria-controls="pdd-about">
                  ${escapeHtml(aboutOpen ? L.moreDetailsHideLabel : L.moreDetailsLabel)}
                </button>
              </div>`
            : `<div class="pdd__cta-btn-row">
                <button type="button" class="pdd__submit" data-pdd-get-notified>${escapeHtml(L.getNotifiedLabel)}</button>
                <button type="button" class="pdd__submit pdd__submit--ghost" data-pdd-apply>${escapeHtml(L.applyToProgramLabel)}</button>
              </div>
              <div class="pdd__link-row">
                <button type="button" class="pdd__text-link" data-pdd-about-toggle aria-expanded="${aboutOpen ? 'true' : 'false'}" aria-controls="pdd-about">
                  ${escapeHtml(aboutOpen ? L.moreDetailsHideLabel : L.learnHowLabel)}
                </button>
              </div>`;
        const statusColumnHtml = drawActive
            ? `<div class="pdd__col">
            ${pddIconHtml(calendarSlotsIcon)}
            <p class="pdd__eyebrow">${escapeHtml(L.currentCycleLabel)}</p>
            <div class="pdd__col-body">
              <p class="pdd__cycle-title">${escapeHtml(cycleLabel)}</p>
              <p class="pdd__stat"><span class="pdd__stat-num">${claimed}</span><span class="pdd__stat-sep"> / </span><span class="pdd__stat-num">${total}</span></p>
              <p class="pdd__stat-label">${escapeHtml(L.membersSuffix)}</p>
              <div class="pdd__bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${escapeHtml(L.currentCycleLabel)}">
                <span class="pdd__bar-fill" style="width:${pct}%"></span>
              </div>
              <p class="pdd__remaining">${escapeHtml(formatRemainingTemplate(L.remainingTemplate, remaining))}</p>
            </div>
          </div>`
            : `<div class="pdd__col">
            ${pddIconHtml(calendarSlotsIcon)}
            <p class="pdd__eyebrow">${escapeHtml(L.currentStatusLabel)}</p>
            <div class="pdd__col-body">
              <p class="pdd__cycle-title">${escapeHtml(L.statusNotActive)}</p>
              <p class="pdd__col-copy">${escapeHtml(L.statusNotScheduledBody)}</p>
            </div>
          </div>`;

        const hasRecipients = this._recipients.length > 0;
        const recipientsHtml = hasRecipients
            ? this._recipients
                  .map(
                      (r) => `
      <article class="pdd__recipient">
        <img class="pdd__recipient-img" src="${escapeHtml(r.image)}" alt="" width="64" height="64" loading="lazy" />
        <div class="pdd__recipient-copy">
          <p class="pdd__recipient-cycle">${escapeHtml(formatProgramDrawCopyTemplate(L.roundLabelTemplate, { ...copyVars, n: r.cycle }))}</p>
          <p class="pdd__recipient-name">${escapeHtml(r.name)}</p>
          <p class="pdd__recipient-meta">${escapeHtml(r.place)}</p>
          <p class="pdd__recipient-meta">${escapeHtml(r.residencyDate)}</p>
        </div>
      </article>`,
                  )
                  .join('')
            : '';

        const emptyRecipientsHtml = `<div class="pdd__empty">
            <p>${escapeHtml(formatProgramDrawCopyTemplate(L.emptyRecipientsLead, copyVars))}</p>
            <p>${escapeHtml(formatProgramDrawCopyTemplate(L.emptyRecipientsBody, copyVars))}</p>
            <p class="pdd__empty-soft">${escapeHtml(formatProgramDrawCopyTemplate(L.emptyRecipientsSoft, copyVars))}</p>
          </div>`;

        const aboutParagraphs = (about.paragraphs || [])
            .map((p) => `<p class="pdd__about-p">${escapeHtml(formatProgramDrawCopyTemplate(p, copyVars))}</p>`)
            .join('');
        const aboutBullets = (about.bullets || [])
            .map((b) => `<li>${escapeHtml(formatProgramDrawCopyTemplate(b, copyVars))}</li>`)
            .join('');

        /**
         * @param {{ title?: string, lead?: string, bullets?: string[] }} section
         * @param {string} fallbackTitle
         */
        const policySectionHtml = (section, fallbackTitle) => {
            const title = formatProgramDrawCopyTemplate(section?.title || fallbackTitle, copyVars);
            const lead = formatProgramDrawCopyTemplate(section?.lead || '', copyVars).trim();
            const items = (section?.bullets || [])
                .map((b) => String(b || '').trim())
                .filter(Boolean)
                .map((b) => `<li>${escapeHtml(formatProgramDrawCopyTemplate(b, copyVars))}</li>`)
                .join('');
            if (!title && !lead && !items) return '';
            return `<details class="pdd__policy">
            <summary class="pdd__policy-summary">
              <span class="pdd__policy-title">${escapeHtml(title)}</span>
              <span class="pdd__policy-toggle" aria-hidden="true"></span>
            </summary>
            <div class="pdd__policy-body">
              ${lead ? `<p class="pdd__policy-lead">${escapeHtml(lead)}</p>` : ''}
              ${items ? `<ul class="pdd__policy-bullets">${items}</ul>` : ''}
            </div>
          </details>`;
        };
        const eligibility = copy.eligibility || {};
        const terms = copy.terms || {};
        const eligibilityHtml = policySectionHtml(eligibility, 'Eligibility');
        const termsHtml = policySectionHtml(terms, 'Additional terms');

        this.shadowRoot.innerHTML = `
      <style>${this._styles()}</style>
      <section class="pdd" aria-label="${escapeHtml(badge || 'Program Draw')}">
        <div class="pdd__top">
          <div class="pdd__cta">
            <span class="pdd__badge">${escapeHtml(badge)}</span>
            <h3 class="pdd__headline">${escapeHtml(L.headline)}</h3>
            <p class="pdd__sub">${escapeHtml(sub)}</p>
            <div class="pdd__cta-actions">
              ${ctaActionsHtml}
            </div>
          </div>
          ${statusColumnHtml}
          <div class="pdd__col">
            ${pddIconHtml(entryTicketIcon)}
            <p class="pdd__eyebrow">${escapeHtml(L.howTitle)}</p>
            <div class="pdd__col-body">
              <p class="pdd__col-copy">${escapeHtml(howBody)}</p>
            </div>
          </div>
          <div class="pdd__col">
            ${pddIconHtml(memberUserIcon)}
            <p class="pdd__eyebrow">${escapeHtml(L.selectionTitle)}</p>
            <div class="pdd__col-body">
              <p class="pdd__col-copy">${escapeHtml(selectionBody)}</p>
            </div>
          </div>
          <div class="pdd__col">
            ${pddIconHtml(includedGiftIcon)}
            <p class="pdd__eyebrow">${escapeHtml(L.awardTitle)}</p>
            <div class="pdd__col-body">
              <p class="pdd__col-copy">${escapeHtml(awardBody)}</p>
              ${awardNote ? `<p class="pdd__col-note">${escapeHtml(awardNote)}</p>` : ''}
            </div>
          </div>
        </div>
        <div class="pdd__recipients" id="pdd-recipients" ${recipientsOpen ? '' : 'hidden'}>
          <div class="pdd__recipients-head">
            <h4 class="pdd__recipients-title">${escapeHtml(L.pastTitle)}</h4>
            ${
                hasRecipients
                    ? `<button type="button" class="pdd__view-all" data-pdd-view-all>${escapeHtml(L.viewAllLabel)}</button>`
                    : ''
            }
          </div>
          ${
              hasRecipients
                  ? `<div class="pdd__recipients-row">
            <div class="pdd__recipients-grid">${recipientsHtml}</div>
            <aside class="pdd__support">
              <p class="pdd__support-lead">${escapeHtml(L.supportLead)}</p>
              <p class="pdd__support-cta">${escapeHtml(L.supportCta)}</p>
            </aside>
          </div>`
                  : emptyRecipientsHtml
          }
        </div>
        <div class="pdd__about" id="pdd-about" ${aboutOpen ? '' : 'hidden'}>
          <h4 class="pdd__about-title">${escapeHtml(formatProgramDrawCopyTemplate(about.title || defaultProgramDrawLocaleEn().about.title, copyVars))}</h4>
          ${about.lead ? `<p class="pdd__about-lead">${escapeHtml(formatProgramDrawCopyTemplate(about.lead, copyVars))}</p>` : ''}
          <div class="pdd__about-body">${aboutParagraphs}</div>
          ${aboutBullets ? `<ul class="pdd__about-bullets">${aboutBullets}</ul>` : ''}
          ${eligibilityHtml}
          ${termsHtml}
        </div>
      </section>
    `;

        this.shadowRoot.querySelector('[data-pdd-submit]')?.addEventListener('click', () => {
            this.dispatchEvent(
                new CustomEvent('fusion-draw-display-submit', {
                    bubbles: true,
                    composed: true,
                }),
            );
        });
        this.shadowRoot.querySelector('[data-pdd-get-notified]')?.addEventListener('click', () => {
            this.dispatchEvent(
                new CustomEvent('fusion-draw-display-get-notified', {
                    bubbles: true,
                    composed: true,
                }),
            );
        });
        this.shadowRoot.querySelector('[data-pdd-apply]')?.addEventListener('click', () => {
            this.dispatchEvent(
                new CustomEvent('fusion-draw-display-apply', {
                    bubbles: true,
                    composed: true,
                }),
            );
        });
        this.shadowRoot.querySelector('[data-pdd-past-toggle]')?.addEventListener('click', () => {
            this._recipientsOpen = !this._recipientsOpen;
            this._syncExpandUi();
        });
        this.shadowRoot.querySelector('[data-pdd-about-toggle]')?.addEventListener('click', () => {
            this._aboutOpen = !this._aboutOpen;
            this._syncExpandUi();
        });
        this.shadowRoot.querySelector('[data-pdd-view-all]')?.addEventListener('click', () => {
            this.dispatchEvent(
                new CustomEvent('fusion-draw-display-view-all', {
                    bubbles: true,
                    composed: true,
                }),
            );
        });
    }

    _styles() {
        return `
      :host {
        display: block;
        width: 100%;
        box-sizing: border-box;
        margin: 0 0 clamp(1.75rem, 4vw, 2.5rem);
        font-family: inherit;
        color: var(--c2, #111);
        -webkit-font-smoothing: antialiased;
      }

      .pdd {
        width: 100%;
        border: 1px solid var(--c2, #111);
        border-radius: 5px;
        background: var(--bg, #f8f4f0);
        overflow: hidden;
      }

      .pdd__top {
        display: grid;
        grid-template-columns: 1.8fr 1.1fr 1.1fr 1.1fr 1fr;
        /* Equal fr spacers + shared content rows → centered block, aligned icons/titles */
        grid-template-rows: minmax(0, 1fr) auto auto auto minmax(0, 1fr);
        align-items: stretch;
        background: var(--bg, #f8f4f0);
      }

      .pdd__cta,
      .pdd__col {
        position: relative;
        padding: 1.5rem 1.35rem;
        box-sizing: border-box;
        min-width: 0;
        grid-row: 1 / -1;
      }

      .pdd__cta {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }

      /*
       * Info columns share parent row tracks via subgrid so icons and titles
       * stay on one baseline while the whole block is vertically centered.
       */
      .pdd__col {
        display: grid;
        grid-template-rows: subgrid;
        grid-template-columns: minmax(0, 1fr);
        justify-items: center;
        row-gap: 0.65rem;
        text-align: center;
      }

      .pdd__col-icon {
        grid-row: 2;
      }

      .pdd__eyebrow {
        grid-row: 3;
      }

      .pdd__col-body {
        grid-row: 4;
      }

      @supports not (grid-template-rows: subgrid) {
        .pdd__top {
          grid-template-rows: none;
        }
        .pdd__cta,
        .pdd__col {
          grid-row: auto;
        }
        .pdd__col {
          grid-template-rows: auto auto auto;
          align-content: center;
        }
        .pdd__col-icon,
        .pdd__eyebrow,
        .pdd__col-body {
          grid-row: auto;
        }
      }

      /* Inset column rules — stop short of top/bottom padding (reference) */
      .pdd__col::before {
        content: "";
        position: absolute;
        left: 0;
        top: 1.15rem;
        bottom: 1.15rem;
        width: 1px;
        background: color-mix(in srgb, var(--c2, #111) 22%, transparent);
        pointer-events: none;
      }

      .pdd__badge {
        display: inline-flex;
        align-items: center;
        margin: 0 0 0.75rem;
        padding: 0.3rem 0.5rem;
        border-radius: 2px;
        background: var(--c2, #111);
        color: var(--bg, #fff);
        font-size: 0.62rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        font-variation-settings: var(--fv-body-wide);
        font-weight: 600;
        line-height: 1;
      }

      .pdd__headline {
        margin: 0 0 0.45rem;
        max-width: 18rem;
        font-size: 1.15rem;
        line-height: 1.28;
        letter-spacing: -0.01em;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body-wide);
        font-weight: 600;
      }

      .pdd__sub {
        margin: 0 0 1rem;
        max-width: 18rem;
        font-size: 0.84rem;
        line-height: 1.45;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body);
      }

      .pdd__cta-actions {
        margin-top: auto;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.65rem;
        width: 100%;
      }

      .pdd__cta-btn-row {
        display: flex;
        flex-wrap: wrap;
        align-items: stretch;
        gap: 0.55rem;
        width: 100%;
      }

      .pdd__submit {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 10.5rem;
        min-height: 2.2rem;
        padding: 0.45rem 1rem;
        border: 1px solid var(--c2, #111);
        border-radius: 2px;
        background: var(--c2, #111);
        color: var(--bg, #fff);
        font: inherit;
        font-size: 0.68rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        font-variation-settings: var(--fv-cta);
        font-weight: 600;
        cursor: pointer;
        transition: background 0.16s ease, color 0.16s ease;
      }

      .pdd__cta-btn-row .pdd__submit {
        min-width: 0;
        flex: 1 1 auto;
      }

      .pdd__submit:hover {
        background: transparent;
        color: var(--c2, #111);
      }

      .pdd__submit--ghost {
        background: transparent;
        color: var(--c2, #111);
      }

      .pdd__submit--ghost:hover {
        background: var(--c2, #111);
        color: var(--bg, #fff);
      }

      .pdd__submit--entered,
      .pdd__submit--entered:hover {
        background: #e8f5e9;
        border-color: #a5d6a7;
        color: #2e7d32;
        cursor: default;
      }

      .pdd__link-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.35rem 0.45rem;
      }

      .pdd__text-link {
        display: inline;
        margin: 0;
        padding: 0;
        border: 0;
        background: none;
        color: var(--c2, #111);
        font: inherit;
        font-size: 0.8rem;
        letter-spacing: 0.01em;
        text-decoration: underline;
        text-underline-offset: 0.18em;
        cursor: pointer;
        font-variation-settings: var(--fv-body-wide);
        font-weight: 600;
      }

      .pdd__text-link:hover {
        opacity: 0.7;
      }

      .pdd__link-sep {
        color: color-mix(in srgb, var(--c2, #111) 45%, transparent);
        font-size: 0.8rem;
        user-select: none;
      }

      .pdd__col-icon {
        display: block;
        width: 2.25rem;
        height: 2.25rem;
        margin: 0;
        background: currentColor;
        color: var(--c2, #111);
        mask: var(--pdd-icon-url) center / contain no-repeat;
        -webkit-mask: var(--pdd-icon-url) center / contain no-repeat;
        place-self: center;
      }

      .pdd__eyebrow {
        margin: 0;
        font-size: 0.62rem;
        line-height: 1.2;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body-wide);
        font-weight: 600;
        place-self: center;
        min-height: 1.2em;
      }

      .pdd__col-body {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        max-width: 12rem;
        min-width: 0;
        align-self: start;
        justify-self: center;
      }

      .pdd__cycle-title {
        margin: 0 0 0.55rem;
        font-size: 1rem;
        line-height: 1.15;
        letter-spacing: -0.01em;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body-wide);
        font-weight: 600;
      }

      .pdd__stat {
        margin: 0;
        font-size: 1.5rem;
        line-height: 1;
        letter-spacing: -0.02em;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body-wide);
        font-weight: 600;
      }

      .pdd__stat-sep {
        font-weight: 600;
        opacity: 0.45;
      }

      .pdd__stat-label {
        margin: 0.28rem 0 0.65rem;
        font-size: 0.78rem;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body);
      }

      .pdd__bar {
        width: 100%;
        max-width: 9.5rem;
        height: 10px;
        background: color-mix(in srgb, var(--c2, #111) 14%, transparent);
        border-radius: 999px;
        overflow: hidden;
        margin: 0 auto 0.45rem;
      }

      .pdd__bar-fill {
        display: block;
        height: 100%;
        background: var(--c2, #111);
        border-radius: 999px;
      }

      .pdd__remaining {
        margin: 0;
        font-size: 0.78rem;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body);
      }

      .pdd__col-copy,
      .pdd__col-note {
        margin: 0;
        max-width: 11.5rem;
        font-size: 0.84rem;
        line-height: 1.45;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body);
        text-align: center;
      }

      .pdd__col-note {
        margin-top: 0.25rem;
        font-size: 0.78rem;
      }

      .pdd__recipients,
      .pdd__about {
        border-top: 1px solid color-mix(in srgb, var(--c2, #111) 28%, transparent);
        padding: 1.1rem 1.35rem 1.2rem;
        background: var(--bg, #f8f4f0);
        animation: pdd-expand 0.2s ease;
      }

      .pdd__about {
        padding: 1rem 1.35rem 1.15rem;
      }

      .pdd__recipients[hidden],
      .pdd__about[hidden] {
        display: none !important;
      }

      @keyframes pdd-expand {
        from { opacity: 0; transform: translateY(-0.2rem); }
        to { opacity: 1; transform: translateY(0); }
      }

      .pdd__recipients-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 0.75rem;
      }

      .pdd__recipients-title,
      .pdd__about-title {
        margin: 0;
        font-size: 0.62rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body-wide);
        font-weight: 600;
      }

      .pdd__about-title {
        margin-bottom: 0.55rem;
      }

      .pdd__empty {
        max-width: 28rem;
      }

      .pdd__empty p {
        margin: 0 0 0.35rem;
        font-size: 0.86rem;
        line-height: 1.45;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body);
      }

      .pdd__empty p:last-child {
        margin-bottom: 0;
      }

      .pdd__empty-soft {
        margin-top: 0.15rem !important;
        font-size: 0.8rem !important;
      }

      .pdd__view-all {
        margin: 0;
        padding: 0;
        border: 0;
        background: none;
        font: inherit;
        font-size: 0.62rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--c2, #111);
        cursor: pointer;
        font-variation-settings: var(--fv-body-wide);
        font-weight: 600;
        white-space: nowrap;
      }

      .pdd__view-all:hover {
        opacity: 0.7;
      }

      .pdd__recipients-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(160px, 0.36fr);
        gap: 0;
        align-items: stretch;
      }

      .pdd__recipients-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1rem 1.25rem;
        padding-right: 1.25rem;
      }

      .pdd__recipient {
        display: grid;
        grid-template-columns: 64px minmax(0, 1fr);
        gap: 0.7rem;
        align-items: start;
      }

      .pdd__recipient-img {
        width: 64px;
        height: 64px;
        object-fit: cover;
        display: block;
        background: color-mix(in srgb, var(--c2, #111) 12%, transparent);
      }

      .pdd__recipient-copy {
        min-width: 0;
      }

      .pdd__recipient-cycle {
        margin: 0;
        font-size: 0.7rem;
        line-height: 1.3;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body);
      }

      .pdd__recipient-name {
        margin: 0.12rem 0 0.2rem;
        font-size: 0.88rem;
        line-height: 1.2;
        letter-spacing: -0.01em;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body-wide);
        font-weight: 600;
      }

      .pdd__recipient-meta {
        margin: 0;
        font-size: 0.72rem;
        line-height: 1.35;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body);
      }

      .pdd__support {
        border-left: 1px solid color-mix(in srgb, var(--c2, #111) 28%, transparent);
        padding: 0.15rem 0 0.15rem 1.25rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 0.45rem;
      }

      .pdd__support-lead {
        margin: 0;
        font-size: 0.8rem;
        line-height: 1.45;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body);
      }

      .pdd__support-cta {
        margin: 0;
        font-size: 0.88rem;
        line-height: 1.3;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body-wide);
        font-weight: 600;
      }

      .pdd__about-lead {
        margin: 0 0 0.55rem;
        font-size: 0.88rem;
        line-height: 1.5;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body-wide);
        font-weight: 600;
        max-width: 42rem;
      }

      .pdd__about-body {
        max-width: 42rem;
      }

      .pdd__about-p {
        margin: 0 0 0.5rem;
        font-size: 0.84rem;
        line-height: 1.5;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body);
      }

      .pdd__about-p:last-child {
        margin-bottom: 0;
      }

      .pdd__about-bullets,
      .pdd__policy-bullets {
        margin: 0.65rem 0 0;
        padding: 0 0 0 1.1rem;
        max-width: 36rem;
      }

      .pdd__about-bullets li,
      .pdd__policy-bullets li {
        margin: 0 0 0.3rem;
        font-size: 0.82rem;
        line-height: 1.45;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body);
      }

      .pdd__policy {
        margin-top: 0.85rem;
        padding-top: 0.85rem;
        border-top: 1px solid color-mix(in srgb, var(--c2, #111) 18%, transparent);
        max-width: 42rem;
      }

      .pdd__policy-summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        list-style: none;
        cursor: pointer;
        user-select: none;
      }

      .pdd__policy-summary::-webkit-details-marker {
        display: none;
      }

      .pdd__policy-summary::marker {
        content: "";
      }

      .pdd__policy-title {
        margin: 0;
        font-size: 0.62rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body-wide);
        font-weight: 600;
      }

      .pdd__policy-toggle {
        flex: 0 0 auto;
        width: 0.7rem;
        height: 0.7rem;
        border-right: 1.5px solid var(--c2, #111);
        border-bottom: 1.5px solid var(--c2, #111);
        transform: rotate(45deg) translateY(-0.1rem);
        transition: transform 0.15s ease;
        opacity: 0.75;
      }

      .pdd__policy[open] .pdd__policy-toggle {
        transform: rotate(225deg) translateY(-0.05rem);
      }

      .pdd__policy-summary:hover .pdd__policy-title,
      .pdd__policy-summary:hover .pdd__policy-toggle {
        opacity: 0.7;
      }

      .pdd__policy-body {
        padding-top: 0.55rem;
      }

      .pdd__policy-lead {
        margin: 0;
        font-size: 0.84rem;
        line-height: 1.5;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body);
        max-width: 42rem;
      }

      @media (max-width: 1100px) {
        .pdd__top {
          grid-template-columns: 1.5fr 1fr 1fr 1fr 0.95fr;
        }
        .pdd__cta,
        .pdd__col {
          padding: 1.25rem 1.1rem;
        }
      }

      @media (max-width: 960px) {
        .pdd__top {
          grid-template-columns: 1.2fr 1fr;
          grid-template-rows: none;
        }
        .pdd__cta,
        .pdd__col {
          grid-row: auto;
        }
        .pdd__col {
          grid-template-rows: auto auto auto;
          align-content: center;
        }
        .pdd__col-icon,
        .pdd__eyebrow,
        .pdd__col-body {
          grid-row: auto;
        }
        .pdd__cta {
          grid-column: 1 / -1;
          border-bottom: 1px solid color-mix(in srgb, var(--c2, #111) 22%, transparent);
        }
        .pdd__col:nth-child(2) {
          border-bottom: 1px solid color-mix(in srgb, var(--c2, #111) 22%, transparent);
        }
        .pdd__col:nth-child(2)::before,
        .pdd__col:nth-child(3)::before {
          display: none;
        }
        .pdd__col:nth-child(3),
        .pdd__col:nth-child(4) {
          border-bottom: 1px solid color-mix(in srgb, var(--c2, #111) 22%, transparent);
        }
        .pdd__recipients-row {
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        .pdd__recipients-grid {
          padding-right: 0;
          grid-template-columns: 1fr;
        }
        .pdd__support {
          border-left: 0;
          border-top: 1px solid color-mix(in srgb, var(--c2, #111) 22%, transparent);
          padding: 1rem 0 0;
        }
      }

      @media (max-width: 640px) {
        .pdd__top {
          grid-template-columns: 1fr;
        }
        .pdd__col::before {
          display: none;
        }
        .pdd__col {
          border-bottom: 1px solid color-mix(in srgb, var(--c2, #111) 22%, transparent);
        }
        .pdd__col:last-child {
          border-bottom: 0;
        }
        .pdd__cta,
        .pdd__col {
          padding: 1.15rem 1.1rem;
        }
      }
    `;
    }
}

customElements.define('app-program-draw-display', ProgramDrawDisplayComponent);

export { ProgramDrawDisplayComponent };
