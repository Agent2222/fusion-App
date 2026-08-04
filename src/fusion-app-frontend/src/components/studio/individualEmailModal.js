/**
 * Studio — one-off email to a roster contact (Integration API + optional LLM quick draft).
 */
import { getDataSource, studioReinterpretWithPrompt } from '../../utils/database.js';
import { openStudioModal } from '../../utils/studioModal.js';
import { sendEmail } from '../../utils/integrationApi.js';
import { DEFAULT_SIGNATURE_HTML } from '../../utils/emailHtml.js';
import {
    buildStudioEmailCcList,
    populateStudioEmailCcSelect,
    readStudioEmailCcTeamEmail,
    recordStudioEmailOutbound,
    studioEmailCcSelectHtml,
} from '../../utils/studioEmailCc.js';

const LLM_COMBINED_MAX = 12000;

const DRAFT_KEY_PREFIX = 'fusion-studio-individual-email-draft:';

/**
 * @param {string} artistId
 * @returns {string}
 */
export function individualEmailDraftKey(artistId) {
    return DRAFT_KEY_PREFIX + String(artistId || '').trim();
}

/**
 * @param {unknown} row
 * @returns {string}
 */
function displayNameEn(row) {
    const en = row?.locales?.en;
    if (en && typeof en === 'object' && en.name != null && String(en.name).trim()) {
        return String(en.name).trim();
    }
    return String(row?.slug || row?.id || '').trim() || '—';
}

/**
 * @param {string} s
 */
function escapeHtmlText(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * @param {string} plain
 */
function plainBodyToEmailHtml(plain) {
    const esc = escapeHtmlText(plain);
    return `<div style="font-size:15px;line-height:1.55;color:#0f172a;white-space:pre-wrap;word-wrap:break-word">${esc}</div>`;
}

/**
 * @param {unknown} row
 * @returns {string}
 */
function rosterContactEmail(row) {
    return String(row?.contactEmail ?? '')
        .trim()
        .toLowerCase();
}

/**
 * @param {object} row
 * @param {{ onSent?: () => void | Promise<void> }} [opts]
 */
export function openIndividualEmailModal(row, opts = {}) {
    const { onSent } = opts;
    const artistId = String(row?.id ?? '').trim();
    const toEmail = String(row?.contactEmail ?? '')
        .trim();
    const toValid = toEmail.toLowerCase().includes('@');
    const name = displayNameEn(row);
    const slug = String(row?.slug ?? '').trim();

    const title = 'Email artist';

    const inner = `
<div class="studio-individual-email">
  <p class="studio-muted" style="margin:0 0 0.75rem">
    <strong>${escapeHtmlText(name)}</strong> · <span class="studio-td-ellipsis" style="display:inline-block;max-width:12rem;vertical-align:bottom" title="${escapeHtmlText(slug)}">${escapeHtmlText(slug || '—')}</span>
    <br />
    <span class="studio-individual-email__to">To: ${toValid ? escapeHtmlText(toEmail) : 'No contact email on file'}</span>
  </p>
  <p class="studio-banner studio-banner--info" style="margin:0 0 0.75rem">Staff are responsible for compliance. Sending uses the same Integration API as Send blast (Resend path).</p>
  <div class="studio-individual-email__drafts studio-modal-fields-row" style="flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;align-items:center">
    <button type="button" class="studio-btn-ghost" id="studio-ie-load-draft">Load draft</button>
    <button type="button" class="studio-btn-secondary" id="studio-ie-save-draft">Save draft</button>
    <button type="button" class="studio-btn-ghost" id="studio-ie-delete-draft" disabled>Delete draft</button>
  </div>
  <label class="studio-field" style="margin-top:0"><span>Subject</span>
    <input type="text" class="studio-input" id="studio-ie-subject" maxlength="998" placeholder="Email subject" /></label>
  <label class="studio-field"><span>Message (plain text — line breaks kept)</span>
    <textarea class="studio-textarea studio-individual-email__body" id="studio-ie-body" rows="7" spellcheck="true" placeholder="Write your message…"></textarea></label>
  <div class="studio-modal-fields-row" style="align-items:flex-end;flex-wrap:wrap;gap:0.5rem">
    <label class="studio-field"><span>Quick draft tone</span>
      <select class="studio-input" id="studio-ie-tone">
        <option value="Professional and warm">Professional and warm</option>
        <option value="Short and direct">Short and direct</option>
        <option value="Friendly and encouraging">Friendly and encouraging</option>
        <option value="Formal">Formal</option>
      </select>
    </label>
    <button type="button" class="studio-btn-secondary" id="studio-ie-llm">Quick draft</button>
  </div>
  <div class="studio-field studio-send-blast-sig-block">
    <div class="studio-send-blast-sig-row">
      <span>Signature</span>
      <button type="button" class="studio-btn-ghost" id="studio-ie-sig-toggle" aria-expanded="false">Edit signature</button>
    </div>
    <div id="studio-ie-sig-preview" class="studio-send-blast-sig-preview" aria-hidden="false"></div>
    <div id="studio-ie-sig-editor" class="studio-send-blast-sig-editor" hidden>
      <label class="studio-field" style="margin-bottom:0.5rem"><span class="studio-muted">HTML (appended after the message)</span>
        <textarea class="studio-textarea" id="studio-ie-sig" rows="6" spellcheck="false"></textarea>
      </label>
      <button type="button" class="studio-btn-secondary" id="studio-ie-sig-done">Done editing</button>
    </div>
  </div>
  <div class="studio-modal-fields-row" style="align-items:flex-end;flex-wrap:wrap;gap:0.5rem">
    <label class="studio-field studio-field--grow"><span>Send test to</span>
      <input type="email" class="studio-input" id="studio-ie-test-to" placeholder="you@org.com" autocomplete="email" /></label>
    <button type="button" class="studio-btn-secondary" id="studio-ie-test">Send test</button>
  </div>
  ${studioEmailCcSelectHtml('studio-ie-cc-team')}
  <div class="studio-send-blast-footer">
    <p id="studio-ie-status" class="studio-send-blast-foot-status" role="status" aria-live="polite"></p>
    <div class="studio-modal-actions studio-modal-actions--send-blast">
      <button type="button" class="studio-btn-primary" id="studio-ie-send" disabled>Send now</button>
      <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Close</button>
    </div>
  </div>
</div>`;

    const { root } = openStudioModal(inner, { title, wide: true });

    void populateStudioEmailCcSelect(root.querySelector('#studio-ie-cc-team'));

    const subjectEl = root.querySelector('#studio-ie-subject');
    const bodyEl = root.querySelector('#studio-ie-body');
    const testToEl = root.querySelector('#studio-ie-test-to');
    const statusEl = root.querySelector('#studio-ie-status');
    const sendBtn = root.querySelector('#studio-ie-send');
    const sigTextarea = root.querySelector('#studio-ie-sig');
    const sigPreview = root.querySelector('#studio-ie-sig-preview');
    const sigEditor = root.querySelector('#studio-ie-sig-editor');
    const sigToggle = root.querySelector('#studio-ie-sig-toggle');
    const sigDone = root.querySelector('#studio-ie-sig-done');
    const saveDraftBtn = root.querySelector('#studio-ie-save-draft');
    const loadDraftBtn = root.querySelector('#studio-ie-load-draft');
    const deleteDraftBtn = root.querySelector('#studio-ie-delete-draft');

    if (sigTextarea instanceof HTMLTextAreaElement) {
        sigTextarea.value = DEFAULT_SIGNATURE_HTML;
    }
    let signatureEditSnapshot = sigTextarea instanceof HTMLTextAreaElement ? sigTextarea.value : DEFAULT_SIGNATURE_HTML;

    const setStatus = (msg) => {
        if (statusEl) statusEl.textContent = msg || '';
    };

    const readDraftFromStorage = () => {
        if (typeof localStorage === 'undefined' || !artistId) return null;
        try {
            const raw = localStorage.getItem(individualEmailDraftKey(artistId));
            if (!raw) return null;
            const o = JSON.parse(raw);
            if (!o || typeof o !== 'object') return null;
            return o;
        } catch {
            return null;
        }
    };

    const fullHtml = () => {
        const bodyPlain = bodyEl instanceof HTMLTextAreaElement ? bodyEl.value : '';
        const bodyHtml = plainBodyToEmailHtml(bodyPlain);
        const sig = sigTextarea instanceof HTMLTextAreaElement ? sigTextarea.value : '';
        const sigTrim = sig.trim();
        if (!sigTrim) return bodyHtml;
        return `${bodyHtml}<div style="margin:36px 0 0;padding:40px 0 0;border-top:1px solid #e5e2df">${sigTrim}</div>`;
    };

    const renderSignaturePreview = () => {
        if (!(sigPreview instanceof HTMLElement)) return;
        const html = sigTextarea instanceof HTMLTextAreaElement ? sigTextarea.value : '';
        sigPreview.innerHTML = html.trim() || '<p class="studio-muted">(empty signature)</p>';
    };

    const setSignatureEditing = (editing) => {
        if (sigEditor instanceof HTMLElement) {
            sigEditor.hidden = !editing;
        }
        if (sigPreview instanceof HTMLElement) {
            sigPreview.hidden = editing;
        }
        if (sigToggle instanceof HTMLButtonElement) {
            sigToggle.setAttribute('aria-expanded', editing ? 'true' : 'false');
            sigToggle.textContent = editing ? 'Cancel' : 'Edit signature';
        }
        if (sigPreview instanceof HTMLElement) {
            sigPreview.setAttribute('aria-hidden', editing ? 'true' : 'false');
        }
        if (editing && sigTextarea instanceof HTMLTextAreaElement) {
            queueMicrotask(() => sigTextarea.focus());
        }
    };

    const syncDeleteDraftEnabled = () => {
        const inStorage = Boolean(readDraftFromStorage());
        if (deleteDraftBtn instanceof HTMLButtonElement) {
            deleteDraftBtn.disabled = !inStorage;
        }
    };

    const setButtonBusy = (btn, busy) => {
        if (!btn) return;
        if (busy) {
            btn.setAttribute('aria-busy', 'true');
            btn.disabled = true;
        } else {
            btn.setAttribute('aria-busy', 'false');
            btn.disabled = false;
        }
    };

    const flashButtonSuccess = (btn, label) => {
        if (!btn) return;
        btn.classList.add('studio-btn--async-ok');
        if (label) btn.textContent = label;
        window.setTimeout(() => {
            btn.classList.remove('studio-btn--async-ok');
        }, 1600);
    };

    const recomputeSendNow = () => {
        if (!(sendBtn instanceof HTMLButtonElement)) return;
        if (getDataSource() !== 'live') {
            sendBtn.disabled = true;
            sendBtn.title = 'Switch to live data to send to roster contact.';
            return;
        }
        if (!toValid) {
            sendBtn.disabled = true;
            sendBtn.title = 'Add a contact email in Manage first.';
            return;
        }
        sendBtn.disabled = false;
        sendBtn.title = '';
    };

    renderSignaturePreview();
    recomputeSendNow();
    syncDeleteDraftEnabled();

    sigToggle?.addEventListener('click', () => {
        const nowEditing = sigEditor instanceof HTMLElement && !sigEditor.hidden;
        if (nowEditing) {
            if (sigTextarea instanceof HTMLTextAreaElement) {
                sigTextarea.value = signatureEditSnapshot;
            }
            renderSignaturePreview();
            setSignatureEditing(false);
        } else {
            signatureEditSnapshot = sigTextarea instanceof HTMLTextAreaElement ? sigTextarea.value : signatureEditSnapshot;
            setSignatureEditing(true);
        }
    });

    sigDone?.addEventListener('click', () => {
        if (sigTextarea instanceof HTMLTextAreaElement) {
            signatureEditSnapshot = sigTextarea.value;
        }
        renderSignaturePreview();
        setSignatureEditing(false);
    });

    saveDraftBtn?.addEventListener('click', () => {
        if (typeof localStorage === 'undefined' || !artistId) return;
        const payload = {
            subject: subjectEl instanceof HTMLInputElement ? subjectEl.value : '',
            message: bodyEl instanceof HTMLTextAreaElement ? bodyEl.value : '',
            signatureHtml: sigTextarea instanceof HTMLTextAreaElement ? sigTextarea.value : '',
            savedAt: new Date().toISOString(),
        };
        try {
            localStorage.setItem(individualEmailDraftKey(artistId), JSON.stringify(payload));
            setStatus('Draft saved locally.');
            syncDeleteDraftEnabled();
        } catch (e) {
            setStatus(e instanceof Error ? e.message : String(e));
        }
    });

    loadDraftBtn?.addEventListener('click', () => {
        const o = readDraftFromStorage();
        if (!o) {
            setStatus('No saved draft for this artist.');
            return;
        }
        if (subjectEl instanceof HTMLInputElement) subjectEl.value = String(o.subject ?? '');
        if (bodyEl instanceof HTMLTextAreaElement) bodyEl.value = String(o.message ?? '');
        if (sigTextarea instanceof HTMLTextAreaElement) {
            const sig = String(o.signatureHtml ?? '');
            sigTextarea.value = sig || DEFAULT_SIGNATURE_HTML;
            signatureEditSnapshot = sigTextarea.value;
        }
        renderSignaturePreview();
        setStatus('Loaded draft from this browser.');
        syncDeleteDraftEnabled();
    });

    deleteDraftBtn?.addEventListener('click', () => {
        if (typeof localStorage === 'undefined' || !artistId) return;
        if (!readDraftFromStorage()) {
            return;
        }
        localStorage.removeItem(individualEmailDraftKey(artistId));
        if (subjectEl instanceof HTMLInputElement) subjectEl.value = '';
        if (bodyEl instanceof HTMLTextAreaElement) bodyEl.value = '';
        if (sigTextarea instanceof HTMLTextAreaElement) {
            sigTextarea.value = DEFAULT_SIGNATURE_HTML;
            signatureEditSnapshot = sigTextarea.value;
        }
        renderSignaturePreview();
        setStatus('Draft deleted.');
        syncDeleteDraftEnabled();
    });

    const llmDefault = 'Quick draft';
    root.querySelector('#studio-ie-llm')?.addEventListener('click', async () => {
        if (!(bodyEl instanceof HTMLTextAreaElement)) return;
        const btn = root.querySelector('#studio-ie-llm');
        const tone =
            (root.querySelector('#studio-ie-tone') instanceof HTMLSelectElement
                ? root.querySelector('#studio-ie-tone')?.value
                : '') || 'Professional and warm';
        const src = bodyEl.value;
        const prompt = `Quick draft for a single staff email to an artist. Tone: ${tone}. Output plain text only — no HTML, no markdown, no code fences. Use line breaks between paragraphs.`;
        if (prompt.length + src.length > LLM_COMBINED_MAX) {
            alert(`Prompt + body exceeds ${LLM_COMBINED_MAX} characters. Shorten the message.`);
            return;
        }
        if (btn instanceof HTMLButtonElement) setButtonBusy(btn, true);
        setStatus('Quick draft: working…');
        let ok = false;
        try {
            const out = await studioReinterpretWithPrompt(prompt, src, 'en');
            bodyEl.value = out.trim();
            ok = true;
            setStatus('Quick draft: message updated below.');
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
            setStatus('');
        } finally {
            if (btn instanceof HTMLButtonElement) {
                setButtonBusy(btn, false);
                if (ok) {
                    flashButtonSuccess(btn, 'Done');
                    window.setTimeout(() => {
                        if (btn.textContent === 'Done' && llmDefault) btn.textContent = llmDefault;
                    }, 1600);
                }
            }
        }
    });

    const testDefault = 'Send test';
    root.querySelector('#studio-ie-test')?.addEventListener('click', async () => {
        const btn = root.querySelector('#studio-ie-test');
        const to = testToEl instanceof HTMLInputElement ? testToEl.value.trim() : '';
        if (!to.includes('@')) {
            alert('Enter a valid test recipient email.');
            return;
        }
        const subj = subjectEl instanceof HTMLInputElement ? subjectEl.value.trim() : '';
        if (!subj) {
            alert('Subject is required.');
            return;
        }
        if (btn instanceof HTMLButtonElement) setButtonBusy(btn, true);
        setStatus('Test email: sending…');
        let ok = false;
        try {
            const cc = buildStudioEmailCcList(readStudioEmailCcTeamEmail(root, 'studio-ie-cc-team'));
            const html = fullHtml();
            await sendEmail({ to, subject: subj, html, cc });
            await recordStudioEmailOutbound({
                kind: 'single',
                subject: subj,
                htmlBody: html,
                toSummary: `Test → ${to}`,
                recipientCount: 1,
                cc,
            });
            ok = true;
            setStatus(`Test email: sent to ${to}.`);
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
            setStatus('');
        } finally {
            if (btn instanceof HTMLButtonElement) {
                setButtonBusy(btn, false);
                if (ok) {
                    flashButtonSuccess(btn, 'Sent');
                    window.setTimeout(() => {
                        if (btn.textContent === 'Sent' && testDefault) btn.textContent = testDefault;
                    }, 1600);
                }
            }
        }
    });

    sendBtn?.addEventListener('click', async () => {
        if (!(sendBtn instanceof HTMLButtonElement) || !subjectEl || !bodyEl) return;
        if (getDataSource() !== 'live') {
            alert('Use Live data to send.');
            return;
        }
        if (!toValid) {
            alert('This artist has no contact email. Add it in Manage first.');
            return;
        }
        const subj = subjectEl instanceof HTMLInputElement ? subjectEl.value.trim() : '';
        if (!subj) {
            alert('Subject is required.');
            return;
        }
        sendBtn.disabled = true;
        setStatus('Sending…');
        try {
            const cc = buildStudioEmailCcList(readStudioEmailCcTeamEmail(root, 'studio-ie-cc-team'));
            const html = fullHtml();
            await sendEmail({ to: toEmail, subject: subj, html, cc });
            await recordStudioEmailOutbound({
                kind: 'single',
                subject: subj,
                htmlBody: html,
                toSummary: toEmail,
                recipientCount: 1,
                cc,
            });
            setStatus(`Sent to ${toEmail}.`);
            if (onSent) await onSent();
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
            setStatus('');
        } finally {
            recomputeSendNow();
        }
    });
}
