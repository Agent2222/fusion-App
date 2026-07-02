import '../../styles/studioJournalEntry.css';
import { openStudioModal } from '../../utils/studioModal.js';
import {
    getDataSource,
    studioReinterpretWithPrompt,
    studioTranslateEnToJa,
    upsertJournalStudio,
} from '../../utils/database.js';
import { uploadBlobToS3 } from '../../utils/studioS3Upload.js';
import { getFieldKind, getFieldKindBadgeLabel } from '../../utils/studioFieldRegistry.js';
import { journalLocalesToPlain, shortRefLabel } from '../../utils/studioPlainForms.js';
import {
    journalDescriptionToEditorHtml,
    journalPlainTextToEditorHtml,
    normalizeJournalBodyHtml,
} from '../../utils/journalBodyHtml.js';
import {
    buildJournalExpandPrompt,
    buildJournalQuickDraftPrompt,
    buildJournalRefinePrompt,
    buildJournalShortenPrompt,
    buildJournalEntryPublicLink,
    collectJournalLocalesPayload,
    journalAssistLocaleTag,
    journalEntryFormSnapshotJson,
    JOURNAL_ASSIST_TONE_OPTIONS,
    JOURNAL_LLM_COMBINED_MAX,
    resolveJournalEntryLink,
} from '../../utils/journalEntryModalHelpers.js';

/** @typedef {'en' | 'ja'} JournalLocale */

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * @param {HTMLElement} el
 */
function getEditorSelectionText(el) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    if (!el.contains(sel.getRangeAt(0).commonAncestorContainer)) return null;
    const text = sel.toString();
    if (!text.trim()) return null;
    return { text };
}

/**
 * @param {HTMLElement} el
 * @param {string} plainText
 */
function replaceEditorSelection(el, plainText) {
    const html = journalPlainTextToEditorHtml(plainText);
    el.focus();
    try {
        document.execCommand('insertHTML', false, html);
    } catch {
        const tpl = document.createElement('template');
        tpl.innerHTML = html;
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(tpl.content);
        }
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * @param {HTMLElement} el
 * @param {string} plainOrHtml
 */
function setEditorBody(el, plainOrHtml) {
    el.innerHTML = journalPlainTextToEditorHtml(plainOrHtml);
    el.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * @param {HTMLElement} el
 */
function readEditorBodyHtml(el) {
    return normalizeJournalBodyHtml(el.innerHTML);
}

/**
 * @param {HTMLElement} el
 */
function readEditorPlainText(el) {
    return (el.innerText || el.textContent || '').trim();
}

/**
 * @param {HTMLElement} bodyEl
 * @param {Node} node
 */
function insertNodeInBody(bodyEl, node) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && bodyEl.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        sel.getRangeAt(0).insertNode(node);
    } else {
        bodyEl.appendChild(node);
    }
    bodyEl.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * @param {HTMLButtonElement | null | undefined} btn
 * @param {boolean} on
 */
function setButtonBusy(btn, on) {
    if (!(btn instanceof HTMLButtonElement)) return;
    if (!btn.dataset.label) btn.dataset.label = btn.textContent || '';
    btn.disabled = on;
    btn.textContent = on ? 'Working…' : btn.dataset.label;
}

/**
 * @param {unknown} existing
 * @param {() => void} onDone
 * @param {{ afterJournalSave?: (id: string) => void }} [opts]
 */
export function openJournalEntryModal(existing, onDone, opts = {}) {
    const j = existing || {
        id: `j_${Date.now()}`,
        link: '',
        imageSrc: '',
        entryStatus: 'draft',
        en: {},
        ja: {},
    };
    /** @type {Record<string, unknown>} */
    let prevEn = {};
    /** @type {Record<string, unknown>} */
    let prevJa = {};
    try {
        const o = j.localesJson
            ? JSON.parse(String(j.localesJson))
            : { en: j.en || {}, ja: j.ja || {} };
        prevEn = o.en && typeof o.en === 'object' && !Array.isArray(o.en) ? o.en : {};
        prevJa = o.ja && typeof o.ja === 'object' && !Array.isArray(o.ja) ? o.ja : {};
    } catch {
        /* keep */
    }
    const plain = journalLocalesToPlain(prevEn, prevJa);
    const isNewEntry = !existing;
    const initialLink =
        String(j.link || '').trim() || buildJournalEntryPublicLink(plain.titleEn, String(j.id || ''));
    const bodyEnHtml = journalDescriptionToEditorHtml(plain.bodyEn);
    const bodyJaHtml = journalDescriptionToEditorHtml(plain.bodyJa);
    const jeSlug = 'journals-block';
    const linkKind = getFieldKind(jeSlug, 'link');
    const imgKind = getFieldKind(jeSlug, 'imageSrc');
    const toneOpts = JOURNAL_ASSIST_TONE_OPTIONS.map(
        (t) => `<option value="${escapeHtml(t)}" ${t === 'Elevated' ? 'selected' : ''}>${escapeHtml(t)}</option>`
    ).join('');
    const statusOpts = ['draft', 'published', 'archived']
        .map(
            (s) =>
                `<option value="${s}" ${String(j.entryStatus) === s ? 'selected' : ''}>${escapeHtml(s)}</option>`
        )
        .join('');

    const body = `
<form id="studio-je-form" class="studio-journal-composer">
  <div class="studio-journal-composer__scroll">
    <div class="studio-journal-composer__editor-head">
      <div class="studio-journal-composer__editor-head-row">
        <p class="studio-journal-composer__eyebrow">Journal</p>
        <p id="studio-je-save-state" class="studio-journal-composer__lede">Write your entry, then save.</p>
      </div>
      <div class="studio-journal-composer__locale-tabs" role="tablist" aria-label="Writing language">
        <button type="button" class="studio-journal-composer__locale-tab is-active" role="tab" aria-selected="true" data-je-locale="en" id="studio-je-tab-en">English</button>
        <button type="button" class="studio-journal-composer__locale-tab" role="tab" aria-selected="false" data-je-locale="ja" id="studio-je-tab-ja">日本語</button>
      </div>
    </div>
    <div class="studio-journal-composer__writing">
      <div class="studio-journal-composer__toolbar" role="toolbar" aria-label="Formatting">
        <button type="button" class="studio-journal-composer__tbt" data-je-cmd="bold" title="Bold"><b>B</b></button>
        <button type="button" class="studio-journal-composer__tbt" data-je-cmd="italic" title="Italic"><i>I</i></button>
        <button type="button" class="studio-journal-composer__tbt" data-je-cmd="underline" title="Underline"><u>U</u></button>
        <span class="studio-journal-composer__tsep" aria-hidden="true"></span>
        <button type="button" class="studio-journal-composer__tbt" data-je-cmd="link" title="Insert link">Link</button>
        <span class="studio-journal-composer__tsep" aria-hidden="true"></span>
        <button type="button" class="studio-journal-composer__tbt" id="studio-je-body-image-upload" title="Upload image">Image</button>
        <input type="file" id="studio-je-body-image-file" accept="image/*" class="studio-sr-only" aria-hidden="true" tabindex="-1" />
      </div>
      <div id="studio-je-panel-en" class="studio-journal-composer__locale-panel is-active" role="tabpanel" aria-labelledby="studio-je-tab-en">
        <input type="text" id="studio-je-title-en" class="studio-journal-composer__title-input" value="${escapeHtml(plain.titleEn)}" placeholder="Title" spellcheck="true" autocomplete="off" />
        <div id="studio-je-body-en" class="studio-journal-composer__body-input" contenteditable="true" spellcheck="true" data-placeholder="Write your entry…">${bodyEnHtml}</div>
      </div>
      <div id="studio-je-panel-ja" class="studio-journal-composer__locale-panel" role="tabpanel" aria-labelledby="studio-je-tab-ja" hidden>
        <input type="text" id="studio-je-title-ja" class="studio-journal-composer__title-input" value="${escapeHtml(plain.titleJa)}" placeholder="タイトル" spellcheck="true" autocomplete="off" />
        <div id="studio-je-body-ja" class="studio-journal-composer__body-input" contenteditable="true" spellcheck="true" data-placeholder="本文を書く…">${bodyJaHtml}</div>
      </div>
    </div>
    <div class="studio-journal-composer__assist" role="toolbar" aria-label="Writing assistance">
      <span class="studio-journal-composer__assist-label">Assist</span>
      <select id="studio-je-tone" class="studio-select studio-journal-composer__tone" aria-label="Draft tone">
        ${toneOpts}
      </select>
      <button type="button" class="studio-btn-secondary" id="studio-je-quick-draft">Quick draft</button>
      <button type="button" class="studio-btn-ghost" id="studio-je-refine">Refine</button>
      <button type="button" class="studio-btn-ghost" id="studio-je-expand">Expand</button>
      <button type="button" class="studio-btn-ghost" id="studio-je-shorten">Shorten</button>
      <button type="button" class="studio-btn-ghost" id="studio-je-to-ja">To Japanese</button>
    </div>
    <details class="studio-journal-composer__settings" ${existing ? 'open' : ''}>
      <summary class="studio-journal-composer__settings-summary">Entry settings</summary>
      <div class="studio-journal-composer__settings-grid">
        <label class="studio-journal-composer__field studio-journal-composer__field--wide">
          <span>Page link <span class="studio-field-kind-badge studio-field-kind-badge--${linkKind}">${escapeHtml(getFieldKindBadgeLabel(linkKind))}</span></span>
          <input name="link" id="studio-je-link" class="studio-input" value="${escapeHtml(initialLink)}" placeholder="/journal/entry/your-slug" />
          <span class="studio-journal-composer__field-hint">Public URL visitors open. Auto-filled from the English title when empty.</span>
        </label>
        <label class="studio-journal-composer__field">
          <span>Status</span>
          <select name="entryStatus" class="studio-select">${statusOpts}</select>
        </label>
        <label class="studio-journal-composer__field">
          <span>Entry ID${isNewEntry ? '' : ' (internal)'}</span>
          <input name="id" required class="studio-input" value="${escapeHtml(String(j.id))}" ${isNewEntry ? '' : 'readonly'} />
          ${isNewEntry ? '<span class="studio-journal-composer__field-hint">Optional custom id before first save.</span>' : '<span class="studio-journal-composer__field-hint">Fixed after save — use Page link for the public URL.</span>'}
        </label>
        <label class="studio-journal-composer__field studio-journal-composer__field--wide">
          <span>Cover image <span class="studio-field-kind-badge studio-field-kind-badge--${imgKind}">${escapeHtml(getFieldKindBadgeLabel(imgKind))}</span></span>
          <div class="studio-journal-composer__cover-row">
            <input name="imageSrc" id="studio-je-img" class="studio-input" value="${escapeHtml(String(j.imageSrc || ''))}" placeholder="Asset path or URL" />
            <label class="studio-file-label studio-btn-ghost studio-journal-composer__upload">
              <input type="file" id="studio-je-img-file" accept="image/*,video/*" class="studio-file-input" />
              Upload
            </label>
          </div>
        </label>
      </div>
      <img id="studio-je-cover-preview" class="studio-journal-composer__cover-preview" alt="" hidden />
      <p class="studio-journal-composer__hint">Ref <code class="studio-code-inline">${escapeHtml(shortRefLabel(String(j.id)))}</code> · URL path visitors open, e.g. <code class="studio-code-inline">/journal/entry/slug</code></p>
    </details>
  </div>
  <div class="studio-journal-composer__dock">
    <p id="studio-je-status" class="studio-journal-composer__dock-status" role="status" aria-live="polite"></p>
    <div class="studio-journal-composer__dock-actions">
      <button type="submit" class="studio-btn-primary" id="studio-je-save">Save entry</button>
      <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Close</button>
    </div>
  </div>
</form>`;

    const { close, root } = openStudioModal(body, {
        title: existing ? 'Edit journal entry' : 'Add journal entry',
        wide: true,
    });

    const form = root.querySelector('#studio-je-form');
    const saveStateEl = root.querySelector('#studio-je-save-state');
    const statusEl = root.querySelector('#studio-je-status');
    const titleEnEl = root.querySelector('#studio-je-title-en');
    const titleJaEl = root.querySelector('#studio-je-title-ja');
    const bodyEnEl = root.querySelector('#studio-je-body-en');
    const bodyJaEl = root.querySelector('#studio-je-body-ja');
    const coverPreview = root.querySelector('#studio-je-cover-preview');
    const imgInput = root.querySelector('#studio-je-img');
    const linkInput = root.querySelector('#studio-je-link');
    /** @type {JournalLocale} */
    let activeLocale = 'en';
    let savedSnapshot = '';
    let llmBusy = false;

    const setStatus = (kind, text) => {
        if (!(statusEl instanceof HTMLElement)) return;
        statusEl.textContent = text || '';
        statusEl.classList.toggle('is-ok', kind === 'ok');
        statusEl.classList.toggle('is-err', kind === 'error');
    };

    const readFormState = () => {
        const fd = form instanceof HTMLFormElement ? new FormData(form) : new FormData();
        return {
            id: String(fd.get('id') || ''),
            link: String(fd.get('link') || ''),
            imageSrc: String(fd.get('imageSrc') || ''),
            entryStatus: String(fd.get('entryStatus') || 'draft'),
            titleEn: titleEnEl instanceof HTMLInputElement ? titleEnEl.value : '',
            titleJa: titleJaEl instanceof HTMLInputElement ? titleJaEl.value : '',
            bodyEn: bodyEnEl instanceof HTMLElement ? readEditorBodyHtml(bodyEnEl) : '',
            bodyJa: bodyJaEl instanceof HTMLElement ? readEditorBodyHtml(bodyJaEl) : '',
        };
    };

    const syncDirty = () => {
        const dirty = journalEntryFormSnapshotJson(readFormState()) !== savedSnapshot;
        if (saveStateEl instanceof HTMLElement) {
            saveStateEl.textContent = dirty ? 'Unsaved changes' : 'Saved';
            saveStateEl.classList.toggle('is-dirty', dirty);
            saveStateEl.classList.toggle('is-saved', !dirty);
        }
    };

    const markSavedSnapshot = () => {
        savedSnapshot = journalEntryFormSnapshotJson(readFormState());
        syncDirty();
    };

    const syncCoverPreview = () => {
        if (!(coverPreview instanceof HTMLImageElement) || !(imgInput instanceof HTMLInputElement)) return;
        const src = imgInput.value.trim();
        if (!src || /\.(mp4|webm|mov)(\?|$)/i.test(src)) {
            coverPreview.hidden = true;
            coverPreview.removeAttribute('src');
            return;
        }
        coverPreview.src = src;
        coverPreview.hidden = false;
    };

    /**
     * @param {JournalLocale} locale
     */
    const setActiveLocale = (locale) => {
        activeLocale = locale;
        root.querySelectorAll('[data-je-locale]').forEach((tab) => {
            const on = tab.getAttribute('data-je-locale') === locale;
            tab.classList.toggle('is-active', on);
            tab.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        const enPanel = root.querySelector('#studio-je-panel-en');
        const jaPanel = root.querySelector('#studio-je-panel-ja');
        if (enPanel instanceof HTMLElement) {
            enPanel.classList.toggle('is-active', locale === 'en');
            enPanel.hidden = locale !== 'en';
        }
        if (jaPanel instanceof HTMLElement) {
            jaPanel.classList.toggle('is-active', locale === 'ja');
            jaPanel.hidden = locale !== 'ja';
        }
        const focusEl = locale === 'ja' ? titleJaEl : titleEnEl;
        if (focusEl instanceof HTMLElement) focusEl.focus();
    };

    const activeBodyEl = () =>
        activeLocale === 'ja'
            ? bodyJaEl instanceof HTMLElement
                ? bodyJaEl
                : null
            : bodyEnEl instanceof HTMLElement
              ? bodyEnEl
              : null;

    const guardLlm = () => {
        if (getDataSource() === 'test') {
            setStatus('error', 'Writing assist requires live mode and admin LLM access.');
            return false;
        }
        if (llmBusy) return false;
        return true;
    };

    /**
     * @param {string} prompt
     * @param {string} source
     * @param {JournalLocale} locale
     */
    const runLlm = async (prompt, source, locale) => {
        if (prompt.length + source.length > JOURNAL_LLM_COMBINED_MAX) {
            throw new Error(`Prompt + text exceeds ${JOURNAL_LLM_COMBINED_MAX} characters. Shorten the entry.`);
        }
        return studioReinterpretWithPrompt(prompt, source, journalAssistLocaleTag(locale));
    };

    const runOnBody = async (instruction, { fullBodyFallback = false } = {}) => {
        const editor = activeBodyEl();
        if (!editor || !guardLlm()) return false;
        const sel = getEditorSelectionText(editor);
        const target = sel?.text?.trim() || (fullBodyFallback ? readEditorPlainText(editor) : '');
        if (target.length < 2) return false;
        llmBusy = true;
        try {
            const out = await runLlm(instruction, target, activeLocale);
            const trimmed = String(out).trim();
            if (sel) replaceEditorSelection(editor, trimmed);
            else setEditorBody(editor, trimmed);
            return true;
        } finally {
            llmBusy = false;
        }
    };

    root.querySelectorAll('[data-je-locale]').forEach((tab) => {
        tab.addEventListener('click', () => {
            const loc = tab.getAttribute('data-je-locale');
            if (loc === 'en' || loc === 'ja') setActiveLocale(loc);
        });
    });

    root.querySelectorAll('.studio-journal-composer__toolbar [data-je-cmd]').forEach((btn) => {
        btn.addEventListener('mousedown', (e) => e.preventDefault());
        btn.addEventListener('click', () => {
            const editor = activeBodyEl();
            if (!editor) return;
            const cmd = btn.getAttribute('data-je-cmd');
            editor.focus();
            if (cmd === 'link') {
                const url = window.prompt('URL:', 'https://');
                if (url) {
                    try {
                        document.execCommand('createLink', false, url);
                    } catch {
                        /* no-op */
                    }
                }
            } else if (cmd === 'underline') {
                try {
                    document.execCommand('underline', false);
                } catch {
                    /* no-op */
                }
            } else {
                try {
                    document.execCommand(cmd === 'bold' ? 'bold' : 'italic', false);
                } catch {
                    /* no-op */
                }
            }
            syncDirty();
        });
    });

    const bodyImageFile = root.querySelector('#studio-je-body-image-file');
    root.querySelector('#studio-je-body-image-upload')?.addEventListener('click', () => {
        if (bodyImageFile instanceof HTMLInputElement) bodyImageFile.click();
    });
    bodyImageFile?.addEventListener('change', async () => {
        const f = bodyImageFile instanceof HTMLInputElement && bodyImageFile.files ? bodyImageFile.files[0] : null;
        const editor = activeBodyEl();
        if (!f || !editor) return;
        setStatus('info', 'Uploading image…');
        try {
            const url = await uploadBlobToS3(f, null, {
                area: 'studio/journal',
                entityType: 'journal',
                entityId: String(j.id || ''),
                fieldKey: 'bodyImage',
            });
            const safeUrl = String(url).replace(/"/g, '&quot;');
            const html = `<p><img src="${safeUrl}" alt="" loading="lazy" style="max-width:100%;height:auto;display:block;margin:0.75rem 0;"></p>`;
            editor.focus();
            try {
                document.execCommand('insertHTML', false, html);
            } catch {
                editor.insertAdjacentHTML('beforeend', html);
            }
            editor.dispatchEvent(new Event('input', { bubbles: true }));
            setStatus('ok', 'Image inserted.');
            syncDirty();
        } catch (err) {
            setStatus('error', err instanceof Error ? err.message : String(err));
        } finally {
            if (bodyImageFile instanceof HTMLInputElement) bodyImageFile.value = '';
        }
    });

    const syncSuggestedLink = () => {
        if (!(linkInput instanceof HTMLInputElement) || !(titleEnEl instanceof HTMLInputElement)) return;
        if (linkInput.value.trim()) return;
        const suggested = buildJournalEntryPublicLink(titleEnEl.value, readFormState().id);
        if (suggested) linkInput.value = suggested;
    };

    form?.querySelectorAll('input, select').forEach((el) => {
        el.addEventListener('input', () => {
            syncDirty();
            if (el === imgInput) syncCoverPreview();
        });
        el.addEventListener('change', () => {
            syncDirty();
            if (el === imgInput) syncCoverPreview();
        });
    });

    [bodyEnEl, bodyJaEl].forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        el.addEventListener('input', syncDirty);
        el.addEventListener('blur', syncDirty);
    });

    titleEnEl?.addEventListener('blur', () => {
        syncSuggestedLink();
        syncDirty();
    });

    root.querySelector('#studio-je-img-file')?.addEventListener('change', async (ev) => {
        const t = ev.target;
        const f = t && 'files' in t ? t.files?.[0] : null;
        if (!f) return;
        try {
            await uploadBlobToS3(f, imgInput, {
                area: 'studio/journal',
                entityType: 'journal',
                entityId: String(j.id || ''),
                fieldKey: 'image',
            });
            syncCoverPreview();
            syncDirty();
            setStatus('ok', 'Cover uploaded.');
        } catch (err) {
            setStatus('error', err instanceof Error ? err.message : String(err));
        }
        if (t && 'value' in t) t.value = '';
    });

    root.querySelector('#studio-je-quick-draft')?.addEventListener('click', async () => {
        const btn = root.querySelector('#studio-je-quick-draft');
        const toneEl = root.querySelector('#studio-je-tone');
        const editor = activeBodyEl();
        if (!editor || !guardLlm()) return;
        const tone = toneEl instanceof HTMLSelectElement ? toneEl.value : 'Elevated';
        const seed = readEditorPlainText(editor);
        const prompt = buildJournalQuickDraftPrompt(tone, seed);
        setButtonBusy(btn, true);
        setStatus('info', 'Quick draft: working…');
        try {
            const out = await runLlm(prompt, seed, activeLocale);
            setEditorBody(editor, String(out).trim());
            setStatus('ok', 'Quick draft applied.');
        } catch (e) {
            setStatus('error', e instanceof Error ? e.message : String(e));
        } finally {
            setButtonBusy(btn, false);
        }
    });

    root.querySelector('#studio-je-refine')?.addEventListener('click', async () => {
        const btn = root.querySelector('#studio-je-refine');
        if (!guardLlm()) return;
        setButtonBusy(btn, true);
        setStatus('info', 'Refining…');
        try {
            const ok = await runOnBody(buildJournalRefinePrompt(), { fullBodyFallback: true });
            setStatus(ok ? 'ok' : 'error', ok ? 'Entry refined.' : 'Select text or add body content first.');
        } catch (e) {
            setStatus('error', e instanceof Error ? e.message : String(e));
        } finally {
            setButtonBusy(btn, false);
        }
    });

    root.querySelector('#studio-je-expand')?.addEventListener('click', async () => {
        const btn = root.querySelector('#studio-je-expand');
        if (!guardLlm()) return;
        setButtonBusy(btn, true);
        setStatus('info', 'Expanding…');
        try {
            const ok = await runOnBody(buildJournalExpandPrompt());
            setStatus(ok ? 'ok' : 'error', ok ? 'Selection expanded.' : 'Select a phrase or sentence to expand.');
        } catch (e) {
            setStatus('error', e instanceof Error ? e.message : String(e));
        } finally {
            setButtonBusy(btn, false);
        }
    });

    root.querySelector('#studio-je-shorten')?.addEventListener('click', async () => {
        const btn = root.querySelector('#studio-je-shorten');
        if (!guardLlm()) return;
        setButtonBusy(btn, true);
        setStatus('info', 'Shortening…');
        try {
            const ok = await runOnBody(buildJournalShortenPrompt());
            setStatus(ok ? 'ok' : 'error', ok ? 'Selection shortened.' : 'Select a phrase or sentence to shorten.');
        } catch (e) {
            setStatus('error', e instanceof Error ? e.message : String(e));
        } finally {
            setButtonBusy(btn, false);
        }
    });

    root.querySelector('#studio-je-to-ja')?.addEventListener('click', async () => {
        const btn = root.querySelector('#studio-je-to-ja');
        if (!guardLlm()) return;
        setButtonBusy(btn, true);
        setStatus('info', 'Translating…');
        try {
            if (activeLocale === 'en') {
                const enTitle = titleEnEl instanceof HTMLInputElement ? titleEnEl.value.trim() : '';
                const enBody = bodyEnEl instanceof HTMLElement ? readEditorPlainText(bodyEnEl) : '';
                if (!enBody && !enTitle) {
                    setStatus('error', 'Add English title or body first.');
                    return;
                }
                if (enTitle) {
                    const jaTitle = await studioTranslateEnToJa(enTitle);
                    if (titleJaEl instanceof HTMLInputElement) titleJaEl.value = String(jaTitle).trim();
                }
                if (enBody) {
                    const jaBody = await studioTranslateEnToJa(enBody);
                    if (bodyJaEl instanceof HTMLElement) setEditorBody(bodyJaEl, String(jaBody).trim());
                }
                setActiveLocale('ja');
                setStatus('ok', 'English copied to 日本語 tab.');
            } else {
                const editor = bodyJaEl instanceof HTMLElement ? bodyJaEl : null;
                if (!editor || readEditorPlainText(editor).length < 2) {
                    setStatus('error', 'Add Japanese body text first.');
                    return;
                }
                const out = await runLlm(buildJournalRefinePrompt(), readEditorPlainText(editor), 'ja');
                setEditorBody(editor, String(out).trim());
                setStatus('ok', 'Japanese text refined.');
            }
            syncDirty();
        } catch (e) {
            setStatus('error', e instanceof Error ? e.message : String(e));
        } finally {
            setButtonBusy(btn, false);
        }
    });

    form?.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const state = readFormState();
        const link = resolveJournalEntryLink(state.link, state.titleEn, state.id);
        const { en, ja } = collectJournalLocalesPayload(prevEn, prevJa, {
            titleEn: state.titleEn,
            titleJa: state.titleJa,
            bodyEn: state.bodyEn,
            bodyJa: state.bodyJa,
        });
        const saveBtn = root.querySelector('#studio-je-save');
        if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = true;
        setStatus('info', 'Saving…');
        try {
            await upsertJournalStudio({
                id: state.id,
                link,
                imageSrc: state.imageSrc,
                entryStatus: state.entryStatus,
                localesJson: JSON.stringify({ en, ja }),
            });
            markSavedSnapshot();
            close();
            if (typeof opts.afterJournalSave === 'function') {
                opts.afterJournalSave(state.id);
            }
            onDone();
        } catch (err) {
            setStatus('error', err instanceof Error ? err.message : String(err));
            if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = false;
        }
    });

    markSavedSnapshot();
    syncCoverPreview();
    queueMicrotask(() => {
        if (titleEnEl instanceof HTMLInputElement) {
            titleEnEl.focus();
            if (!titleEnEl.value.trim()) titleEnEl.select();
        }
    });
}
