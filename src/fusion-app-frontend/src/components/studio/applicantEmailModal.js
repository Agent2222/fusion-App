/**
 * Studio — email to a program applicant (Integration API + LLM + templates in localStorage).
 */
import { getDataSource, studioReinterpretWithPrompt } from '../../utils/database.js';
import { openStudioModal } from '../../utils/studioModal.js';
import { getIntegrationBaseUrl, sendEmail } from '../../utils/integrationApi.js';
import { DEFAULT_SIGNATURE_HTML } from '../../utils/emailHtml.js';

const LLM_COMBINED_MAX = 12000;

const LS_TEMPLATES = 'fusion-studio-applicant-email-templates';
const DRAFT_PREFIX = 'fusion-studio-applicant-email-draft:';

/**
 * @param {string} applicantId
 * @returns {string}
 */
export function applicantEmailDraftKey(applicantId) {
    return DRAFT_PREFIX + String(applicantId || '').trim();
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
 * @param {Record<string, string>} vars
 * @param {string} t
 */
function applyTemplateVars(t, vars) {
    let out = String(t ?? '');
    for (const [k, v] of Object.entries(vars)) {
        out = out.split(`{{${k}}}`).join(v);
    }
    return out;
}

function readTemplates() {
    if (typeof localStorage === 'undefined') return seedDefaultTemplates();
    try {
        const raw = localStorage.getItem(LS_TEMPLATES);
        if (!raw) {
            const seed = seedDefaultTemplates();
            try {
                localStorage.setItem(LS_TEMPLATES, JSON.stringify(seed));
            } catch {
                /* ignore */
            }
            return seed;
        }
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr) || !arr.length) {
            const seed = seedDefaultTemplates();
            try {
                localStorage.setItem(LS_TEMPLATES, JSON.stringify(seed));
            } catch {
                /* ignore */
            }
            return seed;
        }
        return arr
            .filter((x) => x && typeof x === 'object' && x.id && x.name)
            .map((x) => ({
                id: String(x.id),
                name: String(x.name),
                subject: String(x.subject ?? ''),
                body: String(x.body ?? ''),
            }));
    } catch {
        return seedDefaultTemplates();
    }
}

/**
 * @returns {{ id: string, name: string, subject: string, body: string }[]}
 */
function seedDefaultTemplates() {
    return [
        {
            id: 'tpl-default-schedule',
            name: 'Schedule meeting',
            subject: '[Fusion] Program application — {{programId}}',
            body: `Hello {{fullName}},

We would like to schedule a meeting to discuss your application for program {{programId}}.

Please reply with your availability.

— Fusion`,
        },
        {
            id: 'tpl-default-confirmation',
            name: 'Application received',
            subject: '[Fusion] Program application — {{programId}}',
            body: `Hello {{fullName}},

This confirms we have received your application for program {{programId}}.

We will be in touch with next steps.

— Fusion`,
        },
    ];
}

/**
 * @param {{ id: string, name: string, subject: string, body: string }[]} list
 */
function writeTemplates(list) {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(LS_TEMPLATES, JSON.stringify(list));
    } catch {
        /* ignore */
    }
}

/**
 * @param {object} row — applicant row
 * @param {{ onSent?: () => void | Promise<void> }} [opts]
 */
export function openApplicantEmailModal(row, opts = {}) {
    const { onSent } = opts;
    const applicantId = String(row?.id ?? '').trim();
    const toEmail = String(row?.email ?? '').trim();
    const toValid = toEmail.toLowerCase().includes('@');
    const fullName = String(row?.fullName || 'there').trim() || 'there';
    const programId = String(row?.programId || '').trim();
    const vars = {
        fullName,
        programId,
        email: toEmail,
    };

    const title = 'Email applicant';

    const inner = `
<div class="studio-individual-email">
  <p class="studio-muted" style="margin:0 0 0.75rem">
    <strong>${escapeHtmlText(fullName)}</strong> · <span>Program: ${escapeHtmlText(programId || '—')}</span>
    <br />
    <span class="studio-individual-email__to">To: ${toValid ? escapeHtmlText(toEmail) : 'No email on file'}</span>
  </p>
  <p class="studio-banner studio-banner--info" style="margin:0 0 0.75rem">Templates are saved in this browser. Sending uses the Integration API (Resend path).</p>
  <div class="studio-applicant-email__templates studio-modal-fields-row" style="flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;align-items:center">
    <label class="studio-field" style="margin:0;min-width:12rem"><span>Template</span>
      <select class="studio-select" id="studio-ae-template"></select>
    </label>
    <button type="button" class="studio-btn-secondary" id="studio-ae-tpl-apply">Apply</button>
    <button type="button" class="studio-btn-ghost" id="studio-ae-tpl-new">New template</button>
    <button type="button" class="studio-btn-ghost" id="studio-ae-tpl-update">Update template</button>
    <button type="button" class="studio-btn-ghost" id="studio-ae-tpl-delete">Delete template</button>
  </div>
  <div class="studio-individual-email__drafts studio-modal-fields-row" style="flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;align-items:center">
    <button type="button" class="studio-btn-ghost" id="studio-ae-load-draft">Load draft</button>
    <button type="button" class="studio-btn-secondary" id="studio-ae-save-draft">Save draft</button>
    <button type="button" class="studio-btn-ghost" id="studio-ae-delete-draft" disabled>Delete draft</button>
  </div>
  <label class="studio-field" style="margin-top:0"><span>Subject</span>
    <input type="text" class="studio-input" id="studio-ae-subject" maxlength="998" placeholder="Email subject" /></label>
  <label class="studio-field"><span>Message (plain text — line breaks kept)</span>
    <textarea class="studio-textarea studio-individual-email__body" id="studio-ae-body" rows="7" spellcheck="true" placeholder="Write your message…"></textarea></label>
  <div class="studio-modal-fields-row" style="align-items:flex-end;flex-wrap:wrap;gap:0.5rem">
    <label class="studio-field"><span>Quick draft tone</span>
      <select class="studio-input" id="studio-ae-tone">
        <option value="Professional and warm">Professional and warm</option>
        <option value="Short and direct">Short and direct</option>
        <option value="Friendly and encouraging">Friendly and encouraging</option>
        <option value="Formal">Formal</option>
      </select>
    </label>
    <button type="button" class="studio-btn-secondary" id="studio-ae-llm">Quick draft</button>
  </div>
  <div class="studio-field studio-send-blast-sig-block">
    <div class="studio-send-blast-sig-row">
      <span>Signature</span>
      <button type="button" class="studio-btn-ghost" id="studio-ae-sig-toggle" aria-expanded="false">Edit signature</button>
    </div>
    <div id="studio-ae-sig-preview" class="studio-send-blast-sig-preview" aria-hidden="false"></div>
    <div id="studio-ae-sig-editor" class="studio-send-blast-sig-editor" hidden>
      <label class="studio-field" style="margin-bottom:0.5rem"><span class="studio-muted">HTML (appended after the message)</span>
        <textarea class="studio-textarea" id="studio-ae-sig" rows="6" spellcheck="false"></textarea>
      </label>
      <button type="button" class="studio-btn-secondary" id="studio-ae-sig-done">Done editing</button>
    </div>
  </div>
  <div class="studio-modal-fields-row" style="align-items:flex-end;flex-wrap:wrap;gap:0.5rem">
    <label class="studio-field studio-field--grow"><span>Send test to</span>
      <input type="email" class="studio-input" id="studio-ae-test-to" placeholder="you@org.com" autocomplete="email" /></label>
    <button type="button" class="studio-btn-secondary" id="studio-ae-test">Send test</button>
  </div>
  <div class="studio-send-blast-footer">
    <p id="studio-ae-status" class="studio-send-blast-foot-status" role="status" aria-live="polite"></p>
    <div class="studio-modal-actions studio-modal-actions--send-blast">
      <button type="button" class="studio-btn-primary" id="studio-ae-send" disabled>Send now</button>
      <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Close</button>
    </div>
  </div>
</div>`;

    const { root } = openStudioModal(inner, { title, wide: true });

    const subjectEl = root.querySelector('#studio-ae-subject');
    const bodyEl = root.querySelector('#studio-ae-body');
    const testToEl = root.querySelector('#studio-ae-test-to');
    const statusEl = root.querySelector('#studio-ae-status');
    const sendBtn = root.querySelector('#studio-ae-send');
    const sigTextarea = root.querySelector('#studio-ae-sig');
    const sigPreview = root.querySelector('#studio-ae-sig-preview');
    const sigEditor = root.querySelector('#studio-ae-sig-editor');
    const sigToggle = root.querySelector('#studio-ae-sig-toggle');
    const sigDone = root.querySelector('#studio-ae-sig-done');
    const saveDraftBtn = root.querySelector('#studio-ae-save-draft');
    const loadDraftBtn = root.querySelector('#studio-ae-load-draft');
    const deleteDraftBtn = root.querySelector('#studio-ae-delete-draft');
    const tplSelect = root.querySelector('#studio-ae-template');

    if (sigTextarea instanceof HTMLTextAreaElement) {
        sigTextarea.value = DEFAULT_SIGNATURE_HTML;
    }
    let signatureEditSnapshot = sigTextarea instanceof HTMLTextAreaElement ? sigTextarea.value : DEFAULT_SIGNATURE_HTML;

    const setStatus = (msg) => {
        if (statusEl) statusEl.textContent = msg || '';
    };

    const fillTemplateSelect = (list, selectedId) => {
        if (!(tplSelect instanceof HTMLSelectElement)) return;
        const fr = document.createDocumentFragment();
        const o0 = document.createElement('option');
        o0.value = '';
        o0.textContent = '— Select template —';
        fr.appendChild(o0);
        for (const t of list) {
            const o = document.createElement('option');
            o.value = t.id;
            o.textContent = t.name;
            fr.appendChild(o);
        }
        tplSelect.replaceChildren(fr);
        if (selectedId && list.some((x) => x.id === selectedId)) {
            tplSelect.value = selectedId;
        }
    };

    let templates = readTemplates();
    fillTemplateSelect(templates, '');

    const getSelectedTemplate = () => {
        if (!(tplSelect instanceof HTMLSelectElement)) return null;
        const id = tplSelect.value;
        if (!id) return null;
        return templates.find((t) => t.id === id) || null;
    };

    const readDraftFromStorage = () => {
        if (typeof localStorage === 'undefined' || !applicantId) return null;
        try {
            const raw = localStorage.getItem(applicantEmailDraftKey(applicantId));
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
            sendBtn.title = 'Switch to live data to send.';
            return;
        }
        if (!getIntegrationBaseUrl()) {
            sendBtn.disabled = true;
            sendBtn.title = 'Set Integration API URL under Services.';
            return;
        }
        if (!toValid) {
            sendBtn.disabled = true;
            sendBtn.title = 'Applicant has no valid email.';
            return;
        }
        sendBtn.disabled = false;
        sendBtn.title = '';
    };

    if (subjectEl instanceof HTMLInputElement) {
        subjectEl.value = applyTemplateVars('[Fusion] Program application — {{programId}}', vars);
    }
    const firstTpl = templates[0];
    if (firstTpl && bodyEl instanceof HTMLTextAreaElement) {
        bodyEl.value = applyTemplateVars(firstTpl.body, vars);
    }
    if (firstTpl && subjectEl instanceof HTMLInputElement && firstTpl.subject) {
        subjectEl.value = applyTemplateVars(firstTpl.subject, vars);
    }
    if (tplSelect instanceof HTMLSelectElement && firstTpl) {
        tplSelect.value = firstTpl.id;
    }

    renderSignaturePreview();
    recomputeSendNow();
    syncDeleteDraftEnabled();

    root.querySelector('#studio-ae-tpl-apply')?.addEventListener('click', () => {
        const t = getSelectedTemplate();
        if (!t) {
            setStatus('Select a template first.');
            return;
        }
        if (subjectEl instanceof HTMLInputElement) {
            subjectEl.value = applyTemplateVars(t.subject, vars);
        }
        if (bodyEl instanceof HTMLTextAreaElement) {
            bodyEl.value = applyTemplateVars(t.body, vars);
        }
        setStatus('Template applied.');
    });

    root.querySelector('#studio-ae-tpl-new')?.addEventListener('click', () => {
        const name = window.prompt('Template name?');
        if (!name || !String(name).trim()) return;
        const subj = subjectEl instanceof HTMLInputElement ? subjectEl.value : '';
        const bod = bodyEl instanceof HTMLTextAreaElement ? bodyEl.value : '';
        const id = `tpl-${Date.now()}`;
        templates = [...templates, { id, name: String(name).trim(), subject: subj, body: bod }];
        writeTemplates(templates);
        fillTemplateSelect(templates, id);
        setStatus('Template created.');
    });

    root.querySelector('#studio-ae-tpl-update')?.addEventListener('click', () => {
        const t = getSelectedTemplate();
        if (!t) {
            setStatus('Select a template to update.');
            return;
        }
        const subj = subjectEl instanceof HTMLInputElement ? subjectEl.value : '';
        const bod = bodyEl instanceof HTMLTextAreaElement ? bodyEl.value : '';
        templates = templates.map((x) =>
            x.id === t.id ? { ...x, subject: subj, body: bod } : x,
        );
        writeTemplates(templates);
        setStatus('Template updated.');
    });

    root.querySelector('#studio-ae-tpl-delete')?.addEventListener('click', () => {
        const t = getSelectedTemplate();
        if (!t) {
            setStatus('Select a template to delete.');
            return;
        }
        if (!window.confirm(`Delete template “${t.name}”?`)) return;
        const cur = t.id;
        templates = templates.filter((x) => x.id !== cur);
        if (!templates.length) {
            templates = seedDefaultTemplates();
        }
        writeTemplates(templates);
        fillTemplateSelect(templates, '');
        setStatus('Template deleted.');
    });

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
        if (typeof localStorage === 'undefined' || !applicantId) return;
        const payload = {
            subject: subjectEl instanceof HTMLInputElement ? subjectEl.value : '',
            message: bodyEl instanceof HTMLTextAreaElement ? bodyEl.value : '',
            signatureHtml: sigTextarea instanceof HTMLTextAreaElement ? sigTextarea.value : '',
            savedAt: new Date().toISOString(),
        };
        try {
            localStorage.setItem(applicantEmailDraftKey(applicantId), JSON.stringify(payload));
            setStatus('Draft saved locally.');
            syncDeleteDraftEnabled();
        } catch (e) {
            setStatus(e instanceof Error ? e.message : String(e));
        }
    });

    loadDraftBtn?.addEventListener('click', () => {
        const o = readDraftFromStorage();
        if (!o) {
            setStatus('No saved draft for this applicant.');
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
        if (typeof localStorage === 'undefined' || !applicantId) return;
        if (!readDraftFromStorage()) {
            return;
        }
        localStorage.removeItem(applicantEmailDraftKey(applicantId));
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
    root.querySelector('#studio-ae-llm')?.addEventListener('click', async () => {
        if (!(bodyEl instanceof HTMLTextAreaElement)) return;
        const btn = root.querySelector('#studio-ae-llm');
        const tone =
            (root.querySelector('#studio-ae-tone') instanceof HTMLSelectElement
                ? root.querySelector('#studio-ae-tone')?.value
                : '') || 'Professional and warm';
        const src = bodyEl.value;
        const prompt = `Quick draft for a single staff email to a program applicant. Tone: ${tone}. Output plain text only — no HTML, no markdown, no code fences. Use line breaks between paragraphs.`;
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
    root.querySelector('#studio-ae-test')?.addEventListener('click', async () => {
        const btn = root.querySelector('#studio-ae-test');
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
            await sendEmail({ to, subject: subj, html: fullHtml() });
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
        if (!getIntegrationBaseUrl()) {
            alert('Integration API URL is not configured (Studio → Services).');
            return;
        }
        if (!toValid) {
            alert('This applicant has no valid email.');
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
            await sendEmail({ to: toEmail, subject: subj, html: fullHtml() });
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
