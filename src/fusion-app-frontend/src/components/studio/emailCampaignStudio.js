/**
 * Studio → Email — three-column campaign workspace (compose, preview, send).
 */
import '../../styles/studioEmailCampaign.css';
import { openStudioModal } from '../../utils/studioModal.js';
import { uploadBlobToS3 } from '../../utils/studioS3Upload.js';
import { getStudioShellGate, studioFeatureAccess } from '../../utils/studioShellState.js';
import {
    duplicateEmailCampaign,
    deleteEmailCampaign,
    getDataSource,
    getEmailCampaign,
    getSubscribersCsv,
    getSubscribersForEmailStudio,
    listEmailCampaigns,
    markEmailCampaignSent,
    studioReinterpretWithPrompt,
    studioTranslateEnToJa,
    unwrapOpt,
    upsertEmailCampaign,
} from '../../utils/database.js';
import {
    fetchResendMeta,
    resendCreateBroadcast,
    sendEmail,
    sendEmailBatch,
} from '../../utils/integrationApi.js';
import { EMAIL_CAMPAIGN_TEMPLATES, getEmailTemplateById, wrapEmailHtml } from '../../utils/emailCampaignTemplates.js';

const AUTOSAVE_MS = 1500;
const LLM_MAX = 12000;

/**
 * @param {unknown} st
 * @returns {string}
 */
function statusKey(st) {
    if (st && typeof st === 'object') {
        if ('draft' in st) return 'draft';
        if ('pendingSend' in st) return 'pendingSend';
        if ('sent' in st) return 'sent';
        if ('failed' in st) return 'failed';
    }
    return 'draft';
}

/**
 * @param {unknown} aud
 * @returns {string}
 */
function audienceToValue(aud) {
    if (aud && typeof aud === 'object' && 'category' in aud) {
        const c = /** @type {Record<string, unknown>} */ (aud).category;
        return `cat:${String(c ?? '')}`;
    }
    return 'all';
}

/**
 * @param {string} v
 * @returns {{ allBroadcast: null } | { category: string }}
 */
function valueToAudience(v) {
    if (v.startsWith('cat:')) {
        return { category: v.slice(4).trim() || 'general' };
    }
    return { allBroadcast: null };
}

/**
 * @param {string} t
 * @returns {[] | [string]}
 */
function optText(t) {
    const s = String(t ?? '').trim();
    return s ? [s] : [];
}

/**
 * @param {string} html
 * @returns {string}
 */
function fullEmailHtml(html) {
    const inner = String(html || '').trim() || '<p></p>';
    if (inner.includes('fusionart.world/email/') || inner.includes('font-family:system-ui')) {
        return inner;
    }
    return wrapEmailHtml(inner, { includeSignature: true });
}

/**
 * @param {unknown} rec
 * @param {{ id?: string, Principal?: import('@dfinity/principal').Principal }} [extra]
 * @returns {Promise<object>}
 */
async function toUpsertRecord(rec, extra) {
    const { Principal } = await import('@dfinity/principal');
    const id = extra?.id != null ? String(extra.id) : String(rec?.id ?? '');
    const titleForSave = Array.isArray(rec?.title)
        ? rec.title
        : optText(String(unwrapOpt(rec?.title) ?? ''));
    return {
        id,
        title: titleForSave,
        subject: String(rec?.subject ?? '').trim() || 'Untitled',
        previewText: String(rec?.previewText ?? '').trim(),
        htmlBody: String(rec?.htmlBody ?? '').trim() || '<p><br></p>',
        textBody: Array.isArray(rec?.textBody) ? rec.textBody : optText(unwrapOpt(rec?.textBody) ?? ''),
        templateId: Array.isArray(rec?.templateId) ? rec.templateId : optText(unwrapOpt(rec?.templateId) ?? ''),
        audience: rec?.audience ?? { allBroadcast: null },
        internalNotes: String(rec?.internalNotes ?? '').trim(),
        status: rec?.status ?? { draft: null },
        createdAt: String(rec?.createdAt ?? '').trim(),
        updatedAt: String(rec?.updatedAt ?? '').trim(),
        sentAt: Array.isArray(rec?.sentAt) ? rec.sentAt : [],
        resendBroadcastId: Array.isArray(rec?.resendBroadcastId) ? rec.resendBroadcastId : [],
        lastError: Array.isArray(rec?.lastError) ? rec.lastError : [],
        createdBy: rec?.createdBy ?? extra?.Principal ?? Principal.anonymous(),
    };
}

/**
 * @param {string} s
 * @returns {string}
 */
function esc(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function renderEmailCampaignStudio() {
    return `
<div class="studio-ec" data-studio-ec-root>
  <div class="studio-ec__layout" role="group" aria-label="Email campaign layout">
    <aside class="studio-ec__col studio-ec__col--list" aria-label="Campaigns">
      <div class="studio-ec__list-head">
        <h2 class="studio-ec__h">Campaigns</h2>
        <button type="button" class="studio-btn-secondary studio-ec__btn-new" id="studio-ec-new">New</button>
      </div>
      <div class="studio-ec__list-scroll">
        <ul class="studio-ec__campaign-list" id="studio-ec-campaign-list"></ul>
      </div>
      <p class="studio-ec__hint" id="studio-ec-list-hint"></p>
    </aside>
    <aside class="studio-ec__col studio-ec__col--assist" aria-label="Start from prompt or template">
      <div class="studio-ec__subtabs" role="tablist" aria-label="Assistance">
        <button type="button" class="studio-ec__subtab is-active" id="studio-ec-ltab-a" data-ec-ltab="compose" role="tab" aria-selected="true">Compose</button>
        <button type="button" class="studio-ec__subtab" id="studio-ec-ltab-b" data-ec-ltab="gen" role="tab" aria-selected="false">Generate</button>
        <button type="button" class="studio-ec__subtab" id="studio-ec-ltab-c" data-ec-ltab="tpl" role="tab" aria-selected="false">Templates</button>
      </div>
      <div id="studio-ec-panel-l-compose" class="studio-ec__assist-panels" role="region" aria-label="Assisted compose">
        <p class="studio-ec__assist-title">Compose with assistance</p>
        <p class="studio-ec__assist-hint">What do you want to send?</p>
        <label class="studio-field studio-ec__field-tight">
          <textarea id="studio-ec-assist-prompt" class="studio-textarea" rows="5" placeholder="Describe your announcement, who it is for, and a link or CTA."></textarea>
        </label>
        <p class="studio-ec__kicker">Examples</p>
        <div class="studio-ec__pills" id="studio-ec-pills" role="group" aria-label="Example prompts">
          <button type="button" class="studio-ec__pill" data-prompt="Residency open call: dates, who should apply, one clear apply link.">Residency open call</button>
          <button type="button" class="studio-ec__pill" data-prompt="Program reminder: deadline soon, one paragraph of context, CTA.">Last-chance reminder</button>
          <button type="button" class="studio-ec__pill" data-prompt="Newsletter: artist spotlight, one quote, link to their profile.">Artist spotlight</button>
        </div>
        <div class="studio-ec__cols2">
          <label class="studio-field">
            <span class="studio-ec__flabel">Tone</span>
            <select id="studio-ec-tone" class="studio-select">
              <option value="Neutral">Neutral</option>
              <option value="Elevated" selected>Elevated</option>
              <option value="Warm and direct">Warm and direct</option>
              <option value="Formal">Formal</option>
            </select>
          </label>
          <label class="studio-field">
            <span class="studio-ec__flabel">Length</span>
            <select id="studio-ec-length" class="studio-select">
              <option value="Short">Short</option>
              <option value="Standard" selected>Standard</option>
              <option value="Long">Long</option>
            </select>
          </label>
        </div>
        <button type="button" class="studio-btn-primary studio-ec__gen-main" id="studio-ec-generate" aria-label="Generate draft with AI">✦ Generate draft</button>
        <p class="studio-ec__ai-disclaimer">AI is a starting point. Review the subject, preview, and body before sending.</p>
        <p class="studio-ec__or">or</p>
        <div class="studio-ec__manual">
          <button type="button" class="studio-btn-ghost" id="studio-ec-focus-body">Write in editor</button>
          <button type="button" class="studio-btn-ghost" id="studio-ec-goto-templates">Browse templates</button>
        </div>
      </div>
      <div id="studio-ec-panel-l-tpl" class="studio-ec__tpl-panel" hidden>
        <p class="studio-ec__assist-hint">Apply a built-in layout (you can still edit the HTML in the center).</p>
        <label class="studio-field">
          <span>Template</span>
          <select class="studio-select" id="studio-ec-template">
            <option value="">— None —</option>
            ${Object.keys(EMAIL_CAMPAIGN_TEMPLATES)
                .map(
                    (k) =>
                        `<option value="${esc(k)}">${esc(EMAIL_CAMPAIGN_TEMPLATES[k].name)}</option>`,
                )
                .join('')}
          </select>
        </label>
      </div>
    </aside>
    <section class="studio-ec__col studio-ec__col--editor" aria-label="Message">
      <div class="studio-ec__eyebrow">Email</div>
      <h1 class="studio-ec__title">Message</h1>
      <p class="studio-ec__lede" id="studio-ec-save-state" aria-live="polite"></p>
      <div class="studio-ec__row-fields">
        <label class="studio-field studio-field--row">
          <span class="studio-ec__lhead">Subject <em class="studio-ec__n" id="studio-ec-subject-n">0 / 998</em></span>
          <input type="text" class="studio-input" id="studio-ec-subject" maxlength="998" required placeholder="FUSION — …" />
        </label>
        <label class="studio-field studio-field--row">
          <span class="studio-ec__lhead">Preview text <em class="studio-ec__n" id="studio-ec-preview-n">0 / 200</em></span>
          <input type="text" class="studio-input" id="studio-ec-preview" maxlength="200" placeholder="Shown in inbox preheader" />
        </label>
      </div>
      <div class="studio-ec__edtabs" role="tablist" aria-label="Body view">
        <button type="button" class="studio-ec__edtab is-active" id="studio-ec-tab-compose" role="tab" aria-selected="true">Body</button>
        <button type="button" class="studio-ec__edtab" id="studio-ec-tab-preview" role="tab" aria-selected="false">Preview</button>
      </div>
      <div class="studio-ec__editor-wrap" id="studio-ec-editor-surface">
        <div class="studio-ec__toolbar" id="studio-ec-toolbar" role="toolbar" aria-label="Message formatting">
          <button type="button" class="studio-ec__tbt" data-cmd="bold" title="Bold"><span class="studio-sr-only">Bold</span><b>B</b></button>
          <button type="button" class="studio-ec__tbt" data-cmd="italic" title="Italic"><i>I</i></button>
          <span class="studio-ec__tsep" aria-hidden="true"></span>
          <button type="button" class="studio-ec__tbt" data-cmd="link" title="Link">Link</button>
          <button type="button" class="studio-ec__tbt" data-cmd="ul" title="List">List</button>
          <span class="studio-ec__tsep" aria-hidden="true"></span>
          <button type="button" class="studio-ec__tbt" id="studio-ec-image" title="Image">Image</button>
          <input type="file" id="studio-ec-image-file" accept="image/*" class="studio-sr-only" aria-hidden="true" />
        </div>
        <div class="studio-ec__card">
          <div id="studio-ec-body" class="studio-ec__body" contenteditable="true" spellcheck="true" data-placeholder="Type your message, or use Generate in the first column."></div>
        </div>
        <div class="studio-ec__aibar" id="studio-ec-selbar" role="toolbar" aria-label="Text assistance">
          <span class="studio-ec__aibar-label" id="studio-ec-selbar-label">Content assist</span>
          <button type="button" class="studio-ec__aib" id="studio-ec-sel-refine">Refine</button>
          <button type="button" class="studio-ec__aib" id="studio-ec-ai-expand">Expand</button>
          <button type="button" class="studio-ec__aib" id="studio-ec-ai-shorten">Shorten</button>
          <button type="button" class="studio-ec__aib" id="studio-ec-sel-ja">To Japanese</button>
        </div>
      </div>
      <div id="studio-ec-preview-pane" class="studio-ec__previewwrap" hidden>
        <iframe class="studio-ec__preview-frame" id="studio-ec-preview-frame" title="HTML preview" sandbox="allow-same-origin"></iframe>
      </div>
    </section>
    <aside class="studio-ec__col studio-ec__col--settings" aria-label="Audience and delivery">
      <div class="studio-ec__settings-section">
        <h3 class="studio-ec__sh">Campaign</h3>
        <label class="studio-field">
          <span>Internal title</span>
          <input type="text" class="studio-input" id="studio-ec-title" maxlength="200" placeholder="Optional" />
        </label>
        <p class="studio-ec__st"><span>Status</span> <span class="studio-ec__st-dot" aria-hidden="true"></span> <strong id="studio-ec-status-val">draft</strong></p>
        <div class="studio-ec__delete-wrap">
          <button type="button" class="studio-btn-ghost studio-ec__delete" id="studio-ec-delete" disabled>Delete campaign</button>
          <p class="studio-ec__delete-hint" id="studio-ec-delete-hint" hidden></p>
        </div>
      </div>
      <div class="studio-ec__settings-section">
        <h3 class="studio-ec__sh">Audience</h3>
        <label class="studio-field">
          <span>Recipients <em class="studio-ec__est" id="studio-ec-recipient-est">—</em></span>
          <select class="studio-select" id="studio-ec-audience"></select>
        </label>
        <label class="studio-field">
          <span>Broadcast segment id (Resend)</span>
          <input type="text" class="studio-input" id="studio-ec-segment" placeholder="From Resend or integration env" />
        </label>
      </div>
      <div class="studio-ec__settings-section">
        <h3 class="studio-ec__sh">Delivery</h3>
        <p class="studio-ec__read">Send is immediate when you use <em>Send campaign</em> (no scheduler in v1).</p>
      </div>
      <div class="studio-ec__settings-section">
        <h3 class="studio-ec__sh">Sender (integration server)</h3>
        <p class="studio-ec__from" id="studio-ec-from-display" title="Resend from-address">—</p>
      </div>
      <div class="studio-ec__settings-section">
        <h3 class="studio-ec__sh">Test email</h3>
        <label class="studio-field">
          <span>Address</span>
          <input type="email" class="studio-input" id="studio-ec-test-to" placeholder="you@example.com" autocomplete="email" />
        </label>
      </div>
      <div class="studio-ec__settings-section">
        <h3 class="studio-ec__sh">Internal notes</h3>
        <textarea class="studio-textarea" id="studio-ec-notes" rows="3" placeholder="Not sent to subscribers"></textarea>
      </div>
      <div class="studio-ec__settings-links">
        <button type="button" class="studio-btn-ghost" id="studio-ec-history">Campaign history</button>
        <button type="button" class="studio-btn-ghost" id="studio-ec-csv">Download subscriber CSV</button>
      </div>
    </aside>
  </div>
  <div class="studio-ec__dock" id="studio-ec-dock" role="region" aria-label="Email actions">
    <p class="studio-ec__msg" id="studio-ec-msg" style="display:none" role="status" aria-live="polite"></p>
    <div class="studio-ec__dock-in">
      <button type="button" class="studio-btn-secondary" data-ec-dock="save" id="studio-ec-dock-save">Save draft</button>
      <button type="button" class="studio-btn-secondary" data-ec-dock="test" id="studio-ec-dock-test">Send test</button>
      <button type="button" class="studio-btn-primary" data-ec-dock="send" id="studio-ec-dock-send">Send campaign</button>
    </div>
  </div>
</div>`;
}

/**
 * @param {HTMLElement} mainEl
 */
export async function initEmailCampaignStudio(mainEl) {
    const root = mainEl.querySelector('[data-studio-ec-root]');
    if (!root) return;

    const perm = studioFeatureAccess('email');
    if (!perm.canEdit) {
        root.innerHTML =
            '<p class="studio-muted">You do not have permission to edit Email campaigns.</p>';
        return;
    }

    const listEl = root.querySelector('#studio-ec-campaign-list');
    const listHint = root.querySelector('#studio-ec-list-hint');
    const bodyEl = root.querySelector('#studio-ec-body');
    const tabCompose = root.querySelector('#studio-ec-tab-compose');
    const tabPreview = root.querySelector('#studio-ec-tab-preview');
    const previewPane = root.querySelector('#studio-ec-preview-pane');
    const previewFrame = root.querySelector('#studio-ec-preview-frame');
    const editorWrap = root.querySelector('.studio-ec__editor-wrap');
    const aibarEl = root.querySelector('#studio-ec-selbar');
    const savedEl = root.querySelector('#studio-ec-save-state');
    const msgEl = root.querySelector('#studio-ec-msg');
    const statusVal = root.querySelector('#studio-ec-status-val');
    const subjN = root.querySelector('#studio-ec-subject-n');
    const prevN = root.querySelector('#studio-ec-preview-n');
    const recipientEst = root.querySelector('#studio-ec-recipient-est');
    const fromDisplay = root.querySelector('#studio-ec-from-display');
    const assistPrompt = root.querySelector('#studio-ec-assist-prompt');
    const toneEl = root.querySelector('#studio-ec-tone');
    const lengthEl = root.querySelector('#studio-ec-length');
    const panelComposeL = root.querySelector('#studio-ec-panel-l-compose');
    const panelTplL = root.querySelector('#studio-ec-panel-l-tpl');

    const titleInp = root.querySelector('#studio-ec-title');
    const subjInp = root.querySelector('#studio-ec-subject');
    const prevInp = root.querySelector('#studio-ec-preview');
    const templateSel = root.querySelector('#studio-ec-template');
    const audSel = root.querySelector('#studio-ec-audience');
    const segmentInp = root.querySelector('#studio-ec-segment');
    const notesTa = root.querySelector('#studio-ec-notes');
    const testTo = root.querySelector('#studio-ec-test-to');

    /** @type {object | null} */
    let current = null;
    /** @type {string | null} */
    let currentId = null;
    let saveTimer = 0;
    /** @type {object[]} */
    let subscribers = [];
    let resendMeta = { from: null, segmentId: null };

    const setMsg = (kind, text) => {
        if (!(msgEl instanceof HTMLElement)) return;
        if (!text) {
            msgEl.style.display = 'none';
            msgEl.textContent = '';
            msgEl.className = 'studio-ec__msg';
            return;
        }
        msgEl.style.display = 'block';
        const err = kind === 'error';
        const info = kind === 'info';
        msgEl.className = `studio-ec__msg${
            err ? ' studio-ec__msg--err' : info ? ' studio-ec__msg--info' : ' studio-ec__msg--ok'
        }`;
        msgEl.textContent = text;
    };

    const setSaved = (t) => {
        if (savedEl) savedEl.textContent = t || '';
    };

    const updateCharCounts = () => {
        const s = subjInp instanceof HTMLInputElement ? subjInp.value.length : 0;
        const p = prevInp instanceof HTMLInputElement ? prevInp.value.length : 0;
        if (subjN) subjN.textContent = `${s} / 998`;
        if (prevN) prevN.textContent = `${p} / 200`;
    };

    const syncDeleteButtonState = () => {
        const btn = root.querySelector('#studio-ec-delete');
        const hint = root.querySelector('#studio-ec-delete-hint');
        if (!(btn instanceof HTMLButtonElement)) return;
        const { teamNavAllowed } = getStudioShellGate();
        const live = getDataSource() === 'live';
        const hasId = Boolean(currentId);
        const canDelete = hasId && (!live || teamNavAllowed);
        btn.disabled = !canDelete;
        if (hint) {
            if (!hasId) {
                hint.textContent =
                    'Save a draft at least once to delete. To clear the editor without saving, use “New” in the list.';
                hint.hidden = false;
            } else if (live && !teamNavAllowed) {
                hint.textContent = 'On-chain, only a canister admin can delete campaigns. Use Campaign history to review IDs.';
                hint.hidden = false;
            } else {
                hint.textContent = '';
                hint.hidden = true;
            }
        }
    };

    const updateRecipientEst = () => {
        if (!(audSel instanceof HTMLSelectElement) || !recipientEst) return;
        const v = audSel.value;
        if (v === 'all') {
            recipientEst.textContent = '(Resend segment — not counted here)';
        } else {
            const cat = v.slice(4);
            const n = subscribers.filter((s) => {
                if (String(s?.category || '').trim() !== cat) return false;
                const em = String(s?.email || '').trim();
                return em.includes('@');
            }).length;
            recipientEst.textContent = n ? `~${n} in category` : '0 in category';
        }
    };

    const showPreview = (on) => {
        if (previewPane instanceof HTMLElement) previewPane.hidden = !on;
        if (editorWrap instanceof HTMLElement) editorWrap.hidden = on;
        if (aibarEl instanceof HTMLElement) aibarEl.hidden = on;
        if (tabCompose instanceof HTMLButtonElement) {
            tabCompose.classList.toggle('is-active', !on);
            tabCompose.setAttribute('aria-selected', on ? 'false' : 'true');
        }
        if (tabPreview instanceof HTMLButtonElement) {
            tabPreview.classList.toggle('is-active', on);
            tabPreview.setAttribute('aria-selected', on ? 'true' : 'false');
        }
        if (on && previewFrame instanceof HTMLIFrameElement && bodyEl instanceof HTMLElement) {
            const doc = previewFrame.contentDocument;
            if (doc) {
                doc.open();
                doc.write(
                    `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><base target="_blank" rel="noopener"></head><body style="margin:0;padding:0">${fullEmailHtml(bodyEl.innerHTML)}</body></html>`,
                );
                doc.close();
            }
        }
    };

    tabCompose?.addEventListener('click', () => showPreview(false));
    tabPreview?.addEventListener('click', () => showPreview(true));

    const setLeftSubtab = (k) => {
        const isTpl = k === 'tpl';
        if (panelComposeL) panelComposeL.toggleAttribute('hidden', isTpl);
        if (panelTplL) panelTplL.toggleAttribute('hidden', !isTpl);
        root.querySelectorAll('[data-ec-ltab]').forEach((b) => {
            if (b instanceof HTMLButtonElement) {
                const on = b.getAttribute('data-ec-ltab') === k;
                b.classList.toggle('is-active', on);
                b.setAttribute('aria-selected', on ? 'true' : 'false');
            }
        });
    };
    root.querySelectorAll('[data-ec-ltab]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const k = btn.getAttribute('data-ec-ltab') || 'compose';
            if (k === 'tpl') setLeftSubtab('tpl');
            else {
                setLeftSubtab(k);
                if (k === 'gen' && assistPrompt instanceof HTMLTextAreaElement) assistPrompt.focus();
            }
        });
    });

    root.querySelector('#studio-ec-goto-templates')?.addEventListener('click', () => setLeftSubtab('tpl'));
    root.querySelector('#studio-ec-focus-body')?.addEventListener('click', () => {
        bodyEl?.focus();
    });

    root.querySelectorAll('.studio-ec__pill[data-prompt]').forEach((b) => {
        b.addEventListener('click', () => {
            const t = b.getAttribute('data-prompt');
            if (t && assistPrompt instanceof HTMLTextAreaElement) assistPrompt.value = t;
        });
    });

    const loadMeta = async () => {
        try {
            resendMeta = await fetchResendMeta();
            if (segmentInp instanceof HTMLInputElement && !segmentInp.value.trim() && resendMeta.segmentId) {
                segmentInp.value = resendMeta.segmentId;
            }
            if (fromDisplay) {
                fromDisplay.textContent = resendMeta.from
                    ? String(resendMeta.from)
                    : 'Set RESEND_FROM in integration API';
            }
        } catch {
            resendMeta = { from: null, segmentId: null };
            if (fromDisplay) {
                fromDisplay.textContent = 'Integration API unavailable';
            }
        }
    };

    const loadSubscribers = async () => {
        try {
            subscribers = await getSubscribersForEmailStudio();
        } catch (e) {
            subscribers = [];
            if (listHint) {
                listHint.textContent = e instanceof Error ? e.message : String(e);
            }
        }
        repopulateAudienceSelect();
    };

    const repopulateAudienceSelect = () => {
        if (!(audSel instanceof HTMLSelectElement)) return;
        const cats = new Set();
        for (const r of subscribers) {
            const c = String(r?.category ?? '').trim();
            if (c) cats.add(c);
        }
        const sorted = [...cats].sort((a, b) => a.localeCompare(b));
        const cur = audSel.value;
        audSel.innerHTML =
            `<option value="all">All subscribers (Resend broadcast)</option>` +
            sorted.map((c) => `<option value="cat:${esc(c)}">Category: ${esc(c)} (batch)</option>`).join('');
        if (cur && [...audSel.options].some((o) => o.value === cur)) audSel.value = cur;
        updateRecipientEst();
    };

    const applyTemplate = (tplId) => {
        const t = getEmailTemplateById(tplId);
        if (!t) return;
        if (subjInp instanceof HTMLInputElement) subjInp.value = t.defaultSubject;
        if (prevInp instanceof HTMLInputElement) prevInp.value = t.defaultPreview;
        if (bodyEl instanceof HTMLElement) bodyEl.innerHTML = t.bodyHtml;
    };

    const readFormToRecord = async () => {
        const base = current && typeof current === 'object' ? current : { id: currentId || '' };
        const aud = audSel instanceof HTMLSelectElement ? valueToAudience(audSel.value) : { allBroadcast: null };
        const htmlBody = bodyEl instanceof HTMLElement ? bodyEl.innerHTML : String(/** @type {any} */(base).htmlBody || '');
        const titleStr = (titleInp instanceof HTMLInputElement ? titleInp.value : '').trim();
        const titleArr = titleStr ? [titleStr] : [];
        const tid = templateSel instanceof HTMLSelectElement && templateSel.value
            ? templateSel.value
            : unwrapOpt(/** @type {any} */(base).templateId) || '';
        return toUpsertRecord(
            {
                ...base,
                id: String(currentId || (/** @type {any} */(base).id) || '').trim(),
                title: titleArr,
                subject: (subjInp instanceof HTMLInputElement ? subjInp.value : (/** @type {any} */(base).subject) || '') || 'Untitled',
                previewText: (prevInp instanceof HTMLInputElement ? prevInp.value : (/** @type {any} */(base).previewText)) || '',
                htmlBody,
                templateId: tid ? [tid] : [],
                audience: aud,
                internalNotes: (notesTa instanceof HTMLTextAreaElement ? notesTa.value : (/** @type {any} */(base).internalNotes)) || '',
            },
            { id: currentId || String((/** @type {any} */(base).id) || '') },
        );
    };

    const applyRecordToForm = (rec) => {
        current = rec;
        currentId = String(rec?.id || '') || null;
        if (titleInp instanceof HTMLInputElement) titleInp.value = unwrapOpt(rec.title) || '';
        if (subjInp instanceof HTMLInputElement) subjInp.value = String(rec.subject || '');
        if (prevInp instanceof HTMLInputElement) prevInp.value = String(rec.previewText || '');
        if (notesTa instanceof HTMLTextAreaElement) notesTa.value = String(rec.internalNotes || '');
        if (bodyEl instanceof HTMLElement) {
            const hb = String(rec.htmlBody || '').trim();
            bodyEl.innerHTML = hb || '<p><br></p>';
        }
        if (templateSel instanceof HTMLSelectElement) {
            const tid = unwrapOpt(rec.templateId) || '';
            templateSel.value = EMAIL_CAMPAIGN_TEMPLATES[tid] ? tid : '';
        }
        if (audSel instanceof HTMLSelectElement) {
            audSel.value = audienceToValue(rec.audience);
        }
        if (statusVal) {
            statusVal.textContent = statusKey(rec.status);
        }
        updateCharCounts();
        updateRecipientEst();
        syncDeleteButtonState();
    };

    const saveNow = async () => {
        setSaved('Saving…');
        try {
            const rec = await readFormToRecord();
            const id = await upsertEmailCampaign(rec);
            currentId = id;
            const fresh = await getEmailCampaign(id);
            if (fresh) applyRecordToForm(fresh);
            setSaved('All changes saved');
            setTimeout(() => setSaved(''), 2500);
            await refreshList();
        } catch (e) {
            setSaved('');
            setMsg('error', e instanceof Error ? e.message : String(e));
        }
    };

    const scheduleSave = () => {
        if (saveTimer) window.clearTimeout(saveTimer);
        setSaved('Unsaved changes…');
        saveTimer = window.setTimeout(() => {
            saveTimer = 0;
            void saveNow();
        }, AUTOSAVE_MS);
    };

    const refreshList = async () => {
        if (!listEl) return;
        let rows = [];
        try {
            rows = await listEmailCampaigns();
        } catch (e) {
            if (listHint) listHint.textContent = e instanceof Error ? e.message : String(e);
        }
        if (listHint && !listHint.textContent) {
            listHint.textContent =
                getDataSource() === 'test'
                    ? 'Test mode: campaigns in localStorage only.'
                    : 'Live: stored on-chain.';
        }
        listEl.innerHTML = rows
            .map((r) => {
                const id = String(r.id || '');
                const sk = statusKey(r.status);
                const sub = String(r.subject || 'Untitled').slice(0, 64);
                const active = id === currentId ? ' is-active' : '';
                return `<li><button type="button" class="studio-ec__camp${active}" data-id="${esc(id)}"><span class="studio-ec__camp-sub">${esc(sub)}</span><span class="studio-ec__camp-meta">${esc(sk)}</span></button></li>`;
            })
            .join('');

        listEl.querySelectorAll('button[data-id]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if (!id) return;
                const rec = await getEmailCampaign(id);
                if (rec) applyRecordToForm(rec);
            });
        });
        syncDeleteButtonState();
    };

    bodyEl?.addEventListener('input', () => scheduleSave());
    [titleInp, subjInp, prevInp, notesTa, audSel, templateSel].forEach((el) => {
        el?.addEventListener('input', () => {
            updateCharCounts();
            scheduleSave();
        });
        el?.addEventListener('change', () => {
            updateCharCounts();
            if (el === audSel) updateRecipientEst();
            scheduleSave();
        });
    });

    templateSel?.addEventListener('change', () => {
        if (templateSel instanceof HTMLSelectElement && templateSel.value) {
            applyTemplate(templateSel.value);
            scheduleSave();
        }
    });

    root.querySelector('#studio-ec-new')?.addEventListener('click', async () => {
        const { Principal } = await import('@dfinity/principal');
        const empty = await toUpsertRecord(
            {
                id: '',
                title: /** @type {any} */ ([]),
                subject: 'Untitled campaign',
                previewText: '',
                htmlBody: '<p><br></p>',
                textBody: [],
                templateId: [],
                audience: { allBroadcast: null },
                internalNotes: '',
                status: { draft: null },
                createdAt: '',
                updatedAt: '',
                sentAt: [],
                resendBroadcastId: [],
                lastError: [],
                createdBy: Principal.anonymous(),
            },
            { id: '' },
        );
        current = empty;
        currentId = null;
        applyRecordToForm(empty);
        if (listEl) {
            listEl.querySelectorAll('.studio-ec__camp').forEach((b) => b.classList.remove('is-active'));
        }
        syncDeleteButtonState();
    });

    root.querySelector('#studio-ec-dock-save')?.addEventListener('click', () => void saveNow());

    const getSelectionInEditor = () => {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return null;
        const r = sel.getRangeAt(0);
        if (!bodyEl || !bodyEl.contains(r.commonAncestorContainer)) return null;
        return r;
    };

    const runLlmOnSelection = async (instruction) => {
        const r = getSelectionInEditor();
        if (r && !r.collapsed && r.toString().trim().length >= 2) {
            const txt = r.toString();
            const out = await studioReinterpretWithPrompt(instruction, txt, 'en');
            r.deleteContents();
            r.insertNode(document.createTextNode(out.trim()));
            return true;
        }
        return false;
    };

    root.querySelector('#studio-ec-generate')?.addEventListener('click', async () => {
        let idea = (assistPrompt instanceof HTMLTextAreaElement ? assistPrompt.value : '').trim();
        if (!idea) {
            const fb = window.prompt('Describe the email (goals, audience, and main CTA):', '') || '';
            if (!fb.trim()) return;
            if (assistPrompt instanceof HTMLTextAreaElement) assistPrompt.value = fb.trim();
            idea = fb.trim();
        }
        const tone = toneEl instanceof HTMLSelectElement ? toneEl.value : 'Elevated';
        const len = lengthEl instanceof HTMLSelectElement ? lengthEl.value : 'Standard';
        const subj0 = subjInp instanceof HTMLInputElement ? subjInp.value : '';
        const body0 = bodyEl instanceof HTMLElement ? bodyEl.innerText : '';
        const request = { goal: idea, tone, length: len, currentSubject: subj0, currentBodyText: body0 };
        const prompt = `You help staff write marketing email HTML for FUSION. ${tone} tone. ${len} length. Reply with a single JSON object only (no markdown, no backticks) with keys: "subject" (string), "previewText" (string, max 160 chars), "htmlBody" (string, inner HTML only — use semantic tags, inline styles for email; no full document wrapper; may include a single h1, paragraphs, a CTA link to https://www.fusionart.world). JSON object:`;
        const src = JSON.stringify(request);
        if (prompt.length + src.length > LLM_MAX) {
            alert('Prompt is too long for the canister. Shorten the description.');
            return;
        }
        setMsg('info', 'Generating…');
        try {
            const raw = await studioReinterpretWithPrompt(prompt, src, 'en');
            const t = raw.trim();
            let json;
            try {
                json = JSON.parse(t);
            } catch {
                const m = t.match(/\{[\s\S]*\}/);
                if (m) json = JSON.parse(m[0]);
                else throw new Error('Could not parse JSON from the model. Try a shorter prompt.');
            }
            if (subjInp instanceof HTMLInputElement && json.subject) subjInp.value = String(json.subject);
            if (prevInp instanceof HTMLInputElement && json.previewText) {
                prevInp.value = String(json.previewText).slice(0, 200);
            }
            if (json.htmlBody && bodyEl instanceof HTMLElement) {
                bodyEl.innerHTML = String(json.htmlBody);
            }
            setMsg('ok', 'Draft inserted. Review before sending.');
            void saveNow();
        } catch (e) {
            setMsg('error', e instanceof Error ? e.message : String(e));
        }
    });

    const selLabel = root.querySelector('#studio-ec-selbar-label');
    document.addEventListener(
        'selectionchange',
        () => {
            if (!(bodyEl instanceof HTMLElement) || !selLabel) return;
            const s = getSelectionInEditor();
            const hasSel = s && !s.collapsed;
            selLabel.textContent = hasSel ? 'Selection' : 'Content assist';
        },
        { passive: true },
    );

    root.querySelector('#studio-ec-sel-refine')?.addEventListener('click', async () => {
        const r = getSelectionInEditor();
        if (!r || r.collapsed) {
            setMsg('error', 'Select text in the message first.');
            return;
        }
        const txt = r.toString();
        if (txt.length < 2) return;
        const prompt = 'Rewrite the following for clarity and a warm, professional art-community tone. Output the improved text only — no HTML, no JSON.';
        setMsg('info', 'Refining…');
        try {
            const out = await studioReinterpretWithPrompt(prompt, txt, 'en');
            r.deleteContents();
            r.insertNode(document.createTextNode(out.trim()));
            setMsg('ok', 'Replaced selection.');
            scheduleSave();
        } catch (e) {
            setMsg('error', e instanceof Error ? e.message : String(e));
        }
    });

    root.querySelector('#studio-ec-sel-ja')?.addEventListener('click', async () => {
        const r = getSelectionInEditor();
        if (!r || r.collapsed) {
            setMsg('error', 'Select text in the message first.');
            return;
        }
        const txt = r.toString();
        if (txt.length < 2) return;
        setMsg('info', 'Translating…');
        try {
            const out = await studioTranslateEnToJa(txt);
            r.deleteContents();
            r.insertNode(document.createTextNode(String(out).trim()));
            setMsg('ok', 'Replaced with Japanese.');
            scheduleSave();
        } catch (e) {
            setMsg('error', e instanceof Error ? e.message : String(e));
        }
    });

    const expandOrShorten = (mode) => {
        const p =
            mode === 'expand'
                ? 'Expand the following: add a sentence of useful detail, keep a warm, professional art-community voice. Return only the expanded text, no JSON.'
                : 'Make the following shorter: remove filler, keep meaning. Return only the shortened text, no JSON.';
        return async () => {
            if (!(bodyEl instanceof HTMLElement)) return;
            if (!(await runLlmOnSelection(p))) {
                setMsg('error', 'Select a phrase or sentence to expand or shorten.');
            } else {
                setMsg('ok', mode === 'expand' ? 'Selection expanded.' : 'Selection shortened.');
                scheduleSave();
            }
        };
    };
    root.querySelector('#studio-ec-ai-expand')?.addEventListener('click', () => void expandOrShorten('expand')());
    root.querySelector('#studio-ec-ai-shorten')?.addEventListener('click', () => void expandOrShorten('shorten')());

    root.querySelectorAll('#studio-ec-toolbar [data-cmd]').forEach((btn) => {
        btn.addEventListener('mousedown', (e) => e.preventDefault());
        btn.addEventListener('click', () => {
            if (!(bodyEl instanceof HTMLElement)) return;
            const cmd = btn.getAttribute('data-cmd');
            bodyEl.focus();
            if (cmd === 'link') {
                const url = window.prompt('URL:', 'https://');
                if (url) {
                    try {
                        document.execCommand('createLink', false, url);
                    } catch {
                        /* no-op */
                    }
                }
            } else if (cmd === 'ul') {
                try {
                    document.execCommand('insertUnorderedList', false);
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
            scheduleSave();
        });
    });

    const fileInp = root.querySelector('#studio-ec-image-file');
    root.querySelector('#studio-ec-image')?.addEventListener('click', () => {
        if (fileInp instanceof HTMLInputElement) fileInp.click();
    });
    fileInp?.addEventListener('change', async () => {
        const f = fileInp instanceof HTMLInputElement && fileInp.files ? fileInp.files[0] : null;
        if (!(f && bodyEl)) return;
        if (getDataSource() !== 'live') {
            setMsg('error', 'Image upload requires Live data and Integration API (S3).');
            return;
        }
        setMsg('info', 'Uploading image…');
        try {
            const url = await uploadBlobToS3(f, null, { area: 'studio/email' });
            const img = document.createElement('img');
            img.src = url;
            img.alt = '';
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            const sel = window.getSelection();
            if (sel && sel.rangeCount && bodyEl.contains(sel.getRangeAt(0).commonAncestorContainer)) {
                sel.getRangeAt(0).insertNode(img);
            } else {
                bodyEl.appendChild(img);
            }
            setMsg('ok', 'Image inserted.');
            scheduleSave();
        } catch (e) {
            setMsg('error', e instanceof Error ? e.message : String(e));
        } finally {
            if (fileInp instanceof HTMLInputElement) fileInp.value = '';
        }
    });

    const patchStatus = async (rec, st) => {
        const u = await toUpsertRecord({ ...rec, status: st, updatedAt: rec.updatedAt });
        return upsertEmailCampaign(u);
    };

    const sendTest = async () => {
        const to = testTo instanceof HTMLInputElement ? testTo.value.trim() : '';
        if (!to.includes('@')) {
            setMsg('error', 'Enter a test recipient email.');
            return;
        }
        if (getDataSource() !== 'live') {
            setMsg('error', 'Send test requires Live + Integration API.');
            return;
        }
        setMsg('info', 'Sending test…');
        try {
            const rec = await readFormToRecord();
            const html = fullEmailHtml(rec.htmlBody);
            const subj = subjInp instanceof HTMLInputElement ? subjInp.value.trim() : '';
            await sendEmail({ to, subject: subj || 'Fusion — test', html });
            setMsg('ok', 'Test email sent.');
        } catch (e) {
            setMsg('error', e instanceof Error ? e.message : String(e));
        }
    };

    root.querySelector('#studio-ec-dock-test')?.addEventListener('click', () => void sendTest());

    const sendCampaign = async () => {
        if (getDataSource() !== 'live') {
            setMsg('error', 'Sending requires Live data, Integration API, and Resend.');
            return;
        }
        if (!currentId) {
            await saveNow();
        }
        if (!currentId) {
            setMsg('error', 'Save the campaign first.');
            return;
        }
        const rec = (await getEmailCampaign(currentId)) || (await readFormToRecord());
        if (!rec) {
            setMsg('error', 'Could not load campaign.');
            return;
        }
        const subj = subjInp instanceof HTMLInputElement ? subjInp.value.trim() : String(rec.subject || '');
        if (!subj) {
            setMsg('error', 'Subject is required.');
            return;
        }
        const audVal = audSel instanceof HTMLSelectElement ? audSel.value : 'all';
        const html = fullEmailHtml(bodyEl instanceof HTMLElement ? bodyEl.innerHTML : rec.htmlBody);

        setMsg('info', 'Sending…');
        try {
            let catEmails = /** @type {string[]} */ ([]);
            const seg =
                audVal === 'all' && segmentInp instanceof HTMLInputElement
                    ? segmentInp.value.trim()
                    : '';
            if (audVal === 'all') {
                if (!seg) {
                    setMsg('error', 'Set a Resend segment id (Broadcast audience).');
                    return;
                }
            } else {
                const cat = audVal.slice(4);
                const seen = new Set();
                for (const s of subscribers) {
                    if (String(s?.category || '').trim() !== cat) continue;
                    const em = String(s?.email || '')
                        .trim()
                        .toLowerCase();
                    if (!em.includes('@') || seen.has(em)) continue;
                    seen.add(em);
                    catEmails.push(em);
                }
                if (!catEmails.length) {
                    setMsg('error', 'No subscribers with a valid email in this category.');
                    return;
                }
            }
            await patchStatus(rec, { pendingSend: null });
            if (audVal === 'all') {
                const out = await resendCreateBroadcast({
                    segmentId: seg,
                    subject: subj,
                    html,
                    name: unwrapOpt(rec.title) || `Campaign ${currentId}`,
                    send: true,
                });
                const bid = out && typeof out === 'object' ? (out.id ?? out.data?.id) : null;
                const btxt = String(bid || '').trim();
                await markEmailCampaignSent(String(currentId), btxt || 'broadcast', null);
            } else {
                const messages = catEmails.map((to) => ({ to, subject: subj, html }));
                await sendEmailBatch(messages, {});
                await markEmailCampaignSent(String(currentId), 'batch', null);
            }
            setMsg('ok', 'Send completed.');
            const fresh = await getEmailCampaign(String(currentId));
            if (fresh) applyRecordToForm(fresh);
        } catch (e) {
            const err = e instanceof Error ? e.message : String(e);
            setMsg('error', err);
            try {
                const r = await getEmailCampaign(String(currentId));
                if (r) {
                    const u = await toUpsertRecord({ ...r, status: { failed: null }, lastError: [err] });
                    await upsertEmailCampaign(u);
                }
            } catch {
                /* no-op */
            }
        } finally {
            void refreshList();
        }
    };

    root.querySelector('#studio-ec-dock-send')?.addEventListener('click', () => void sendCampaign());

    root.querySelector('#studio-ec-csv')?.addEventListener('click', async () => {
        try {
            const csv = await getSubscribersCsv();
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'fusion-subscribers.csv';
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
        }
    });

    const openHistory = async () => {
        const { teamNavAllowed } = getStudioShellGate();
        let rows = [];
        try {
            rows = await listEmailCampaigns();
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
        }
        const table = rows.length
            ? rows
                  .map((r) => {
                      const id = String(r.id);
                      return `<tr data-hist-id="${esc(id)}">
  <td>${esc(String(r.subject || '').slice(0, 40))}</td>
  <td>${esc(statusKey(r.status))}</td>
  <td>${esc(String(r.updatedAt || '').slice(0, 19))}</td>
  <td class="studio-td-actions">
    <button type="button" class="studio-btn-ghost studio-hist-open" data-id="${esc(id)}">Open</button>
    <button type="button" class="studio-btn-ghost studio-hist-dup" data-id="${esc(id)}">Duplicate</button>
    ${
        teamNavAllowed
            ? `<button type="button" class="studio-btn-ghost studio-hist-del" data-id="${esc(id)}">Delete</button>`
            : ''
    }
  </td>
</tr>`;
                  })
                  .join('')
            : '<tr><td colspan="4">No campaigns yet.</td></tr>';

        const { close, root: modalRoot } = openStudioModal(
            `<p class="studio-muted">Newest first. Duplicate creates an editable copy.</p>
      <div class="studio-table-wrap" style="max-height:50vh;overflow:auto">
        <table class="studio-table"><thead><tr><th>Subject</th><th>Status</th><th>Updated</th><th></th></tr></thead>
        <tbody>${table}</tbody></table></div>`,
            { title: 'Campaign history', wide: true },
        );
        modalRoot.querySelectorAll('.studio-hist-open').forEach((b) => {
            b.addEventListener('click', async () => {
                const id = b.getAttribute('data-id');
                if (!id) return;
                const r = await getEmailCampaign(id);
                if (r) applyRecordToForm(r);
                close();
            });
        });
        modalRoot.querySelectorAll('.studio-hist-dup').forEach((b) => {
            b.addEventListener('click', async () => {
                const id = b.getAttribute('data-id');
                if (!id) return;
                const nid = await duplicateEmailCampaign(id);
                const r = await getEmailCampaign(nid);
                if (r) applyRecordToForm(r);
                close();
                void refreshList();
            });
        });
        modalRoot.querySelectorAll('.studio-hist-del').forEach((b) => {
            b.addEventListener('click', async () => {
                const id = b.getAttribute('data-id');
                if (!id || !teamNavAllowed) return;
                if (!confirm('Delete this campaign? Admin only.')) return;
                const ok = await deleteEmailCampaign(id);
                if (ok && id === currentId) {
                    root.querySelector('#studio-ec-new')?.dispatchEvent(new Event('click'));
                }
                if (ok) {
                    void refreshList();
                    close();
                } else {
                    alert('Delete failed. Admin only on-chain.');
                }
            });
        });
    };

    root.querySelector('#studio-ec-history')?.addEventListener('click', () => void openHistory());

    root.querySelector('#studio-ec-delete')?.addEventListener('click', async () => {
        const id = String(currentId || '').trim();
        if (!id) {
            setMsg('error', 'Save the campaign at least once before you can delete it (or use “New” to discard the editor).');
            return;
        }
        const { teamNavAllowed } = getStudioShellGate();
        if (getDataSource() === 'live' && !teamNavAllowed) {
            setMsg('error', 'Only a canister admin can delete a campaign on-chain.');
            return;
        }
        const subj = subjInp instanceof HTMLInputElement ? subjInp.value.trim() : 'Untitled';
        if (!confirm(`Delete this campaign forever?\n\n“${subj}”\n\nThis cannot be undone.`)) return;
        setMsg('info', 'Deleting…');
        try {
            const ok = await deleteEmailCampaign(id);
            if (!ok) {
                setMsg('error', 'Delete failed (not found or not permitted).');
                return;
            }
            setMsg('ok', 'Campaign deleted.');
            const was = id;
            if (String(currentId) === was) {
                current = null;
                currentId = null;
            }
            await refreshList();
            const buttons = listEl ? listEl.querySelectorAll('button[data-id]') : null;
            let opened = false;
            if (buttons) {
                for (let i = 0; i < buttons.length; i++) {
                    const b = buttons[i];
                    if (b.getAttribute('data-id') === was) continue;
                    if (b instanceof HTMLButtonElement) b.click();
                    opened = true;
                    break;
                }
            }
            if (!opened) {
                root.querySelector('#studio-ec-new')?.dispatchEvent(new Event('click'));
            }
        } catch (e) {
            setMsg('error', e instanceof Error ? e.message : String(e));
        } finally {
            syncDeleteButtonState();
        }
    });

    setLeftSubtab('compose');
    updateCharCounts();
    syncDeleteButtonState();

    await loadMeta();
    await loadSubscribers();
    await refreshList();

    if (!listEl?.querySelector('button[data-id]')) {
        root.querySelector('#studio-ec-new')?.dispatchEvent(new Event('click'));
    } else {
        const first = listEl.querySelector('button[data-id]');
        const id = first ? first.getAttribute('data-id') : null;
        if (id) {
            const r = await getEmailCampaign(id);
            if (r) applyRecordToForm(r);
        }
    }
}
