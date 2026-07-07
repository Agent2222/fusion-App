/**
 * Program editor modal — shell markup and chrome bindings.
 */

import { progIconExternal, progIconEye, progIconNav } from './studioProgramModalIcons.js';
import {
    PROGRAM_EDITOR_TABS,
    bindProgramLangToggle,
    bindProgramModalTabs,
} from './studioProgramLocaleForm.js';

/**
 * @param {(s: string) => string} escapeHtml
 * @param {string} s
 */
function esc(escapeHtml, s) {
    return escapeHtml(String(s ?? ''));
}

/**
 * @param {(s: string) => string} escapeHtml
 * @param {string} tabId
 * @param {string} label
 * @param {boolean} active
 * @param {'sidebar' | 'horizontal'} variant
 */
function navButtonHtml(escapeHtml, tabId, label, active, variant) {
    const tab = PROGRAM_EDITOR_TABS.find((t) => t.id === tabId);
    const icon = progIconNav(tabId);
    const cls =
        variant === 'sidebar'
            ? `studio-prog-editor-nav-card${active ? ' is-active' : ''}`
            : `studio-prog-editor-h-tab${active ? ' is-active' : ''}`;
    const subtitle =
        variant === 'sidebar' && tab?.subtitle
            ? `<span class="studio-prog-editor-nav-card__sub">${esc(escapeHtml, tab.subtitle)}</span>`
            : '';
    const inner =
        variant === 'sidebar'
            ? `<span class="studio-prog-editor-nav-card__icon">${icon}</span>
         <span class="studio-prog-editor-nav-card__text">
           <span class="studio-prog-editor-nav-card__title">${esc(escapeHtml, label)}</span>
           ${subtitle}
         </span>`
            : `<span class="studio-prog-editor-h-tab__icon">${icon}</span>
         <span class="studio-prog-editor-h-tab__label">${esc(escapeHtml, label)}</span>`;
    return `<button type="button" class="${cls}" role="tab" data-prog-tab="${esc(escapeHtml, tabId)}" aria-selected="${active ? 'true' : 'false'}" tabindex="${active ? '0' : '-1'}">${inner}</button>`;
}

/**
 * @param {{
 *   escapeHtml: (s: string) => string,
 *   existing: boolean,
 *   p: Record<string, unknown>,
 *   visOptions: string,
 *   studioStatusOptions: string,
 *   routeLinkKind: string,
 *   routeLinkKindLabel: string,
 *   cardImgKind: string,
 *   cardImgKindLabel: string,
 *   panelsHtml: string,
 * }} opts
 * @returns {string}
 */
export function renderProgramEditorShell(opts) {
    const {
        escapeHtml,
        existing,
        p,
        visOptions,
        studioStatusOptions,
        routeLinkKind,
        routeLinkKindLabel,
        cardImgKind,
        cardImgKindLabel,
        panelsHtml,
    } = opts;

    const sidebarNav = PROGRAM_EDITOR_TABS.map((t, i) =>
        navButtonHtml(escapeHtml, t.id, t.label, i === 0, 'sidebar'),
    ).join('');

    const horizontalTabs = PROGRAM_EDITOR_TABS.map((t, i) =>
        navButtonHtml(escapeHtml, t.id, t.label, i === 0, 'horizontal'),
    ).join('');

    return `<form id="studio-prog-form" class="studio-modal-form studio-modal-form--program studio-prog-editor">
  <div class="studio-prog-editor-body">
    <aside class="studio-prog-editor-sidebar" aria-label="Program sections">
      <nav class="studio-prog-editor-nav" role="tablist">${sidebarNav}</nav>
      <div class="studio-prog-editor-sidebar-foot">
        <div class="studio-prog-editor-status-card">
          <div class="studio-prog-editor-status-row">
            <span class="studio-prog-editor-status-label">Studio Status</span>
            <span class="studio-prog-editor-status-value" id="studio-prog-sidebar-status">
              <span class="studio-prog-editor-status-dot" aria-hidden="true"></span>
              <span data-prog-status-display>Open</span>
            </span>
          </div>
          <div class="studio-prog-editor-status-row">
            <span class="studio-prog-editor-status-label">Visibility</span>
            <span class="studio-prog-editor-status-value" id="studio-prog-sidebar-visibility">
              ${progIconEye()}
              <span data-prog-visibility-display>Public</span>
            </span>
          </div>
        </div>
        <a class="studio-prog-editor-preview-btn" id="studio-prog-preview-link" href="#" target="_blank" rel="noopener noreferrer">
          ${progIconExternal()}
          Preview Program
        </a>
      </div>
    </aside>
    <div class="studio-prog-editor-main">
      <section class="studio-prog-editor-info">
        <div class="studio-prog-editor-info__head">
          <div>
            <h3 class="studio-prog-editor-info__title">Program Information</h3>
            <p class="studio-prog-editor-info__helper">Update the basic information and media for this program.</p>
          </div>
          <a class="studio-prog-editor-view-live" id="studio-prog-view-live" href="#" target="_blank" rel="noopener noreferrer">
            ${progIconExternal()}
            View Live Page
          </a>
        </div>
        <div class="studio-prog-editor-info__grid">
          <label class="studio-prog-editor-field">
            <span class="studio-prog-editor-field__label">ID</span>
            <input name="id" required class="studio-prog-editor-input" value="${esc(escapeHtml, String(p.id))}" ${existing ? 'readonly' : ''} />
          </label>
          <label class="studio-prog-editor-field">
            <span class="studio-prog-editor-field__label">routeLink (record) <span class="studio-field-kind-badge studio-field-kind-badge--${routeLinkKind}">${esc(escapeHtml, routeLinkKindLabel)}</span></span>
            <input name="routeLink" class="studio-prog-editor-input" value="${esc(escapeHtml, String(p.routeLink || ''))}" />
          </label>
          <label class="studio-prog-editor-field">
            <span class="studio-prog-editor-field__label">Deposit (on-chain)</span>
            <input name="depositAmountDisplay" class="studio-prog-editor-input" value="${esc(escapeHtml, String(p.depositAmountDisplay ?? ''))}" placeholder="e.g. $1,000" autocomplete="off" />
          </label>
          <label class="studio-prog-editor-field">
            <span class="studio-prog-editor-field__label">featuredOrder</span>
            <input name="featuredOrder" type="number" class="studio-prog-editor-input" value="${esc(escapeHtml, String(p.featuredOrder ?? 0))}" />
          </label>
          <label class="studio-prog-editor-field studio-prog-editor-field--select">
            <span class="studio-prog-editor-field__label">visibility</span>
            <div class="studio-prog-editor-select-wrap">
              <span class="studio-prog-editor-select-icon" aria-hidden="true">${progIconEye()}</span>
              <select name="visibility" class="studio-prog-editor-input studio-prog-editor-select">${visOptions}</select>
            </div>
          </label>
          <label class="studio-prog-editor-field studio-prog-editor-field--select">
            <span class="studio-prog-editor-field__label">studioStatus</span>
            <div class="studio-prog-editor-select-wrap">
              <span class="studio-prog-editor-status-dot studio-prog-editor-select-dot" aria-hidden="true"></span>
              <select name="studioStatus" class="studio-prog-editor-input studio-prog-editor-select">${studioStatusOptions}</select>
            </div>
          </label>
        </div>
      </section>
      <div class="studio-prog-editor-toolbar">
        <div class="studio-prog-editor-toolbar__actions">
          <button type="button" class="studio-prog-editor-btn" id="studio-prog-translate-tab">Translate this tab → 日本語</button>
          <button type="button" class="studio-prog-editor-btn" id="studio-prog-translate-all">Translate all text → 日本語</button>
          <label class="studio-prog-editor-btn studio-prog-editor-btn--file">
            <input type="file" id="studio-prog-cover-file-en" accept="image/*,video/*,.pdf" class="studio-file-input studio-prog-cover-file" data-upload-target-locale="en" />
            Upload → imageSrc (EN)
          </label>
          <label class="studio-prog-editor-btn studio-prog-editor-btn--file">
            <input type="file" id="studio-prog-cover-file-ja" accept="image/*,video/*,.pdf" class="studio-file-input studio-prog-cover-file" data-upload-target-locale="ja" />
            Upload → imageSrc (JA)
          </label>
        </div>
        <p class="studio-prog-editor-media-hint">
          <span class="studio-field-kind-badge studio-field-kind-badge--${cardImgKind}">${esc(escapeHtml, cardImgKindLabel)}</span>
          Fills card <code>imageSrc</code> on the Basics tab.
        </p>
        <p id="studio-prog-modal-status" class="studio-prog-modal-status studio-sr-only" role="status" aria-live="polite"></p>
      </div>
      <div class="studio-prog-editor-h-tabs" role="tablist" aria-label="Program content sections">${horizontalTabs}</div>
      <div class="studio-prog-locale-form">
        <div class="studio-prog-editor-scroll">
          <div class="studio-prog-tab-panels">${panelsHtml}</div>
        </div>
      </div>
    </div>
  </div>
</form>`;
}

/**
 * @param {boolean} isEdit
 * @returns {string}
 */
export function renderProgramEditorFooter(isEdit) {
    return `<footer class="studio-prog-editor-footer">
  <div class="studio-prog-editor-footer__status" id="studio-prog-save-status" data-state="clean">
    <span class="studio-prog-editor-footer__status-text">No changes yet</span>
  </div>
  <div class="studio-prog-editor-footer__actions">
    <button type="button" class="studio-prog-editor-btn studio-prog-editor-btn--cancel" id="studio-prog-cancel">Cancel</button>
    <button type="submit" class="studio-prog-editor-btn studio-prog-editor-btn--save" form="studio-prog-form">${isEdit ? 'Save Program' : 'Add Program'}</button>
  </div>
</footer>`;
}

/**
 * @param {string} value
 */
function capitalizeDisplay(value) {
    const v = String(value || '').trim();
    if (!v || v === 'none') return v || '—';
    return v.charAt(0).toUpperCase() + v.slice(1);
}

/**
 * @param {HTMLElement} root
 * @param {{ onCancel: () => void, routeLinkSeed?: string }} opts
 */
export function bindProgramEditorChrome(root, opts) {
    const form = root.querySelector('#studio-prog-form');
    if (!(form instanceof HTMLFormElement)) return;

    bindProgramModalTabs(root);
    bindProgramLangToggle(root);

    const statusSelect = form.querySelector('select[name="studioStatus"]');
    const visSelect = form.querySelector('select[name="visibility"]');
    const routeInput = form.querySelector('input[name="routeLink"]');
    const statusDisplay = root.querySelector('[data-prog-status-display]');
    const visDisplay = root.querySelector('[data-prog-visibility-display]');
    const viewLive = root.querySelector('#studio-prog-view-live');
    const previewLink = root.querySelector('#studio-prog-preview-link');
    const saveStatus = root.querySelector('#studio-prog-save-status');
    const cancelBtn = root.querySelector('#studio-prog-cancel');

    /** @type {string | null} */
    let savedSnapshot = null;
    let lastSavedAt = /** @type {number | null} */ (null);

    const snapshotForm = () => {
        const fd = new FormData(form);
        const localeRoot = form.querySelector('.studio-prog-locale-form');
        const localeBits = [];
        localeRoot?.querySelectorAll('[data-prog-locale][data-prog-path]').forEach((el) => {
            if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
            const loc = el.getAttribute('data-prog-locale') || '';
            const path = el.getAttribute('data-prog-path') || '';
            const val = el.type === 'checkbox' ? String(el.checked) : el.value;
            localeBits.push(`${loc}:${path}=${val}`);
        });
        return JSON.stringify({
            meta: Object.fromEntries(fd.entries()),
            locale: localeBits.join('|'),
        });
    };

    const syncRouteLinks = () => {
        const raw = routeInput instanceof HTMLInputElement ? routeInput.value.trim() : opts.routeLinkSeed || '';
        const href = raw && raw.startsWith('/') ? raw : raw ? `/${raw.replace(/^\//, '')}` : '';
        [viewLive, previewLink].forEach((el) => {
            if (!(el instanceof HTMLAnchorElement)) return;
            if (href) {
                el.href = href;
                el.removeAttribute('aria-disabled');
                el.classList.remove('is-disabled');
            } else {
                el.href = '#';
                el.setAttribute('aria-disabled', 'true');
                el.classList.add('is-disabled');
            }
        });
    };

    const syncSidebarStatus = () => {
        if (statusDisplay && statusSelect instanceof HTMLSelectElement) {
            statusDisplay.textContent = capitalizeDisplay(statusSelect.value);
        }
        if (visDisplay && visSelect instanceof HTMLSelectElement) {
            visDisplay.textContent = capitalizeDisplay(visSelect.value);
        }
    };

    const relativeTime = (ts) => {
        const sec = Math.floor((Date.now() - ts) / 1000);
        if (sec < 10) return 'just now';
        if (sec < 60) return `${sec} seconds ago`;
        const min = Math.floor(sec / 60);
        if (min === 1) return '1 minute ago';
        if (min < 60) return `${min} minutes ago`;
        const hr = Math.floor(min / 60);
        return hr === 1 ? '1 hour ago' : `${hr} hours ago`;
    };

    const setSaveStatus = (state) => {
        if (!(saveStatus instanceof HTMLElement)) return;
        saveStatus.dataset.state = state;
        const textEl = saveStatus.querySelector('.studio-prog-editor-footer__status-text');
        if (!(textEl instanceof HTMLElement)) return;
        if (state === 'dirty') {
            textEl.textContent = 'Unsaved changes';
        } else if (state === 'saved' && lastSavedAt) {
            textEl.innerHTML = `<span class="studio-prog-editor-footer__check" aria-hidden="true"></span> All changes saved · ${relativeTime(lastSavedAt)}`;
        } else {
            textEl.textContent = 'No changes yet';
        }
    };

    const markDirty = () => {
        if (snapshotForm() !== savedSnapshot) setSaveStatus('dirty');
        else setSaveStatus(savedSnapshot ? 'saved' : 'clean');
    };

    savedSnapshot = snapshotForm();
    syncRouteLinks();
    syncSidebarStatus();

    form.addEventListener('input', () => {
        syncRouteLinks();
        markDirty();
    });
    form.addEventListener('change', () => {
        syncSidebarStatus();
        syncRouteLinks();
        markDirty();
    });

    cancelBtn?.addEventListener('click', () => {
        if (snapshotForm() !== savedSnapshot) {
            if (!window.confirm('Discard unsaved changes?')) return;
        }
        opts.onCancel();
    });

    root.querySelectorAll('[data-studio-modal-close]').forEach((el) => {
        el.addEventListener(
            'click',
            (ev) => {
                if (snapshotForm() !== savedSnapshot) {
                    if (!window.confirm('Discard unsaved changes?')) {
                        ev.preventDefault();
                        ev.stopImmediatePropagation();
                    }
                }
            },
            true,
        );
    });

    return {
        markSaved() {
            savedSnapshot = snapshotForm();
            lastSavedAt = Date.now();
            setSaveStatus('saved');
        },
        markDirty,
    };
}
