/**
 * Studio “Send blast” — filters, transactional Resend batch, LLM quick draft (plain text).
 */
import { getDataSource, studioReinterpretWithPrompt } from '../../utils/database.js';
import { openStudioModal } from '../../utils/studioModal.js';
import { sendEmail, sendEmailBatch } from '../../utils/integrationApi.js';
import { DEFAULT_SIGNATURE_HTML } from '../../utils/emailHtml.js';

const LLM_COMBINED_MAX = 12000;

/**
 * @param {unknown} row
 * @returns {string[]}
 */
function cohortYearsForArtist(row) {
    const f = row?.filter;
    if (!f || typeof f !== 'object') return [];
    const o = /** @type {Record<string, unknown>} */ (f);
    const raw = o.cohortYears ?? o.cohort_years;
    if (Array.isArray(raw) && raw.length) {
        return raw
            .map((x) => Math.floor(Number(x)))
            .filter((n) => Number.isFinite(n) && n > 1900 && n < 2100);
    }
    const leg = Math.max(0, Math.floor(Number(o.cohortYear ?? o.cohort_year ?? 0)));
    return leg > 0 ? [leg] : [];
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
 * Roster has at least a plausible contact email (blast is skipped without @).
 * @param {object} row
 * @returns {boolean}
 */
function hasContactEmail(row) {
    const em = String(row?.contactEmail ?? '')
        .trim()
        .toLowerCase();
    return em.includes('@');
}

/**
 * @param {string} s
 */
function escapeAttr(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;');
}

/**
 * Escape plain text for safe HTML text content.
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
 * Turn user-typed body (line breaks preserved) into a single HTML block for email.
 * @param {string} plain
 */
function plainBodyToEmailHtml(plain) {
    const esc = escapeHtmlText(plain);
    return `<div style="font-size:15px;line-height:1.55;color:#0f172a;white-space:pre-wrap;word-wrap:break-word">${esc}</div>`;
}

/**
 * @param {{ getArtistsRows: () => Promise<object[]>, onRefresh?: () => void | Promise<void> }} opts
 */
export function openSendBlastModal(opts) {
    const { getArtistsRows, onRefresh } = opts;

    const inner = `
<p class="studio-muted" style="margin:0 0 0.75rem">Only send to artists who have agreed to be contacted. Staff are responsible for compliance with applicable law.</p>
<div class="studio-send-blast-toolbar">
  <label class="studio-field studio-field--grow"><span>Search</span>
    <input type="search" class="studio-input" id="studio-send-blast-search" placeholder="Slug, id, name…" autocomplete="off" /></label>
  <div class="studio-field" id="studio-send-blast-cohort-wrap"><span>Cohort years</span>
    <div class="studio-send-blast-cohort" id="studio-send-blast-cohorts"></div>
  </div>
  <div class="studio-send-blast-actions">
    <button type="button" class="studio-btn-ghost" id="studio-send-blast-select-visible">Select all (visible)</button>
    <button type="button" class="studio-btn-ghost" id="studio-send-blast-clear">Clear selection</button>
  </div>
</div>
<div class="studio-send-blast-pills" id="studio-send-blast-pills" role="group" aria-label="Artists"></div>
<p class="studio-muted" id="studio-send-blast-overview" style="margin:0.5rem 0">Loading…</p>
<label class="studio-field" style="margin-top:0.5rem"><span>Subject</span>
  <input type="text" class="studio-input" id="studio-send-blast-subject" maxlength="998" placeholder="Email subject" /></label>
<label class="studio-field"><span>Message (plain text — line breaks kept)</span>
  <textarea class="studio-textarea studio-send-blast-body" id="studio-send-blast-body" rows="8" spellcheck="true" placeholder="Write your message…"></textarea></label>
<div class="studio-modal-fields-row" style="align-items:flex-end;flex-wrap:wrap;gap:0.5rem">
  <label class="studio-field"><span>Quick draft tone</span>
    <select class="studio-input" id="studio-send-blast-tone">
      <option value="Professional and warm">Professional and warm</option>
      <option value="Short and direct">Short and direct</option>
      <option value="Friendly and encouraging">Friendly and encouraging</option>
      <option value="Formal">Formal</option>
    </select>
  </label>
  <button type="button" class="studio-btn-secondary" id="studio-send-blast-llm">Quick draft</button>
</div>
<div class="studio-field studio-send-blast-sig-block">
  <div class="studio-send-blast-sig-row">
    <span>Signature</span>
    <button type="button" class="studio-btn-ghost" id="studio-send-blast-sig-toggle" aria-expanded="false">Edit signature</button>
  </div>
  <div id="studio-send-blast-sig-preview" class="studio-send-blast-sig-preview" aria-hidden="false"></div>
  <div id="studio-send-blast-sig-editor" class="studio-send-blast-sig-editor" hidden>
    <label class="studio-field" style="margin-bottom:0.5rem"><span class="studio-muted">HTML (appended after the message)</span>
      <textarea class="studio-textarea" id="studio-send-blast-sig" rows="8" spellcheck="false"></textarea>
    </label>
    <button type="button" class="studio-btn-secondary" id="studio-send-blast-sig-done">Done editing</button>
  </div>
</div>
<div class="studio-modal-fields-row" style="align-items:flex-end;flex-wrap:wrap;gap:0.5rem">
  <label class="studio-field studio-field--grow"><span>Send test to</span>
    <input type="email" class="studio-input" id="studio-send-blast-test-to" placeholder="you@org.com" autocomplete="email" /></label>
  <button type="button" class="studio-btn-secondary" id="studio-send-blast-test">Send test</button>
</div>
<div class="studio-send-blast-footer">
  <p id="studio-send-blast-status" class="studio-send-blast-foot-status" role="status" aria-live="polite"></p>
  <div class="studio-modal-actions studio-modal-actions--send-blast">
    <button type="button" class="studio-btn-primary" id="studio-send-blast-send" disabled>Send now (batch)</button>
    <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Close</button>
  </div>
</div>`;

    const { close, root } = openStudioModal(inner, { title: 'Send blast', wide: true });

    const sigTextarea = root.querySelector('#studio-send-blast-sig');
    const sigPreview = root.querySelector('#studio-send-blast-sig-preview');
    const sigEditor = root.querySelector('#studio-send-blast-sig-editor');
    const sigToggle = root.querySelector('#studio-send-blast-sig-toggle');
    const sigDone = root.querySelector('#studio-send-blast-sig-done');

    if (sigTextarea instanceof HTMLTextAreaElement) {
        sigTextarea.value = DEFAULT_SIGNATURE_HTML;
    }

    /** Textarea value when "Edit signature" was last opened (for Cancel). */
    let signatureEditSnapshot = DEFAULT_SIGNATURE_HTML;

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

    renderSignaturePreview();

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

    const pillsEl = root.querySelector('#studio-send-blast-pills');
    const overviewEl = root.querySelector('#studio-send-blast-overview');
    const searchEl = root.querySelector('#studio-send-blast-search');
    const cohortsEl = root.querySelector('#studio-send-blast-cohorts');
    const subjectEl = root.querySelector('#studio-send-blast-subject');
    const bodyEl = root.querySelector('#studio-send-blast-body');
    const testToEl = root.querySelector('#studio-send-blast-test-to');
    const statusEl = root.querySelector('#studio-send-blast-status');
    const sendBtn = root.querySelector('#studio-send-blast-send');

    /** @type {object[]} */
    let allRows = [];
    /** @type {Set<string>} */
    const selected = new Set();
    /** @type {Set<number>} */
    const cohortFilter = new Set();

    const setStatus = (msg) => {
        if (statusEl) statusEl.textContent = msg || '';
    };

    /**
     * @param {HTMLButtonElement | null} btn
     * @param {boolean} busy
     */
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

    /**
     * @param {HTMLButtonElement} btn
     * @param {string} [label]
     */
    const flashButtonSuccess = (btn, label) => {
        btn.classList.add('studio-btn--async-ok');
        if (label) btn.textContent = label;
        window.setTimeout(() => {
            btn.classList.remove('studio-btn--async-ok');
        }, 1600);
    };

    const fullHtml = () => {
        const bodyPlain = bodyEl instanceof HTMLTextAreaElement ? bodyEl.value : '';
        const bodyHtml = plainBodyToEmailHtml(bodyPlain);
        const sig = sigTextarea instanceof HTMLTextAreaElement ? sigTextarea.value : '';
        const sigTrim = sig.trim();
        if (!sigTrim) return bodyHtml;
        return `${bodyHtml}<div style="margin:36px 0 0;padding:40px 0 0;border-top:1px solid #e5e2df">${sigTrim}</div>`;
    };

    const recomputeSendEnabled = () => {
        if (!(sendBtn instanceof HTMLButtonElement)) return;
        if (getDataSource() !== 'live') {
            sendBtn.disabled = true;
            sendBtn.title = 'Switch to live data to send email.';
            return;
        }
        sendBtn.disabled = false;
        sendBtn.title = '';
    };

    const uniqueCohortYears = (rows) => {
        const s = new Set();
        for (const r of rows) {
            for (const y of cohortYearsForArtist(r)) {
                s.add(y);
            }
        }
        return Array.from(s).sort((a, b) => a - b);
    };

    const rowMatchesCohort = (row) => {
        if (cohortFilter.size === 0) return true;
        const ys = cohortYearsForArtist(row);
        if (ys.length === 0) return false;
        return ys.some((y) => cohortFilter.has(y));
    };

    const filteredRows = () => {
        const q = (searchEl instanceof HTMLInputElement ? searchEl.value : '').trim().toLowerCase();
        return allRows.filter((a) => {
            if (!rowMatchesCohort(a)) return false;
            if (!q) return true;
            const name = displayNameEn(a).toLowerCase();
            const hay = `${a.slug} ${a.id} ${a.visibility} ${a.mostRecentProgram ?? ''} ${a.contactEmail ?? ''} ${name}`.toLowerCase();
            return hay.includes(q);
        });
    };

    const updateOverview = () => {
        if (!overviewEl) return;
        const vis = filteredRows();
        const nSelected = vis.filter((a) => selected.has(String(a.id))).length;
        const cDesc =
            cohortFilter.size === 0
                ? 'all cohorts'
                : `cohort ${[...cohortFilter].sort((a, b) => a - b).join(', ')}`;
        const q = (searchEl instanceof HTMLInputElement ? searchEl.value : '').trim();
        const searchDesc = q ? `search “${q}”` : 'no search';
        if (allRows.length === 0) {
            overviewEl.textContent = 'No artists with a contact email in their roster profile match this list.';
        } else {
            overviewEl.textContent = `${nSelected} of ${vis.length} visible selected (${cDesc}, ${searchDesc}).`;
        }
    };

    const renderPills = () => {
        if (!pillsEl) return;
        const list = filteredRows();
        pillsEl.innerHTML = list
            .map((row) => {
                const id = String(row.id ?? '').trim();
                const label = escapeAttr(displayNameEn(row));
                const on = selected.has(id);
                return `<button type="button" class="studio-send-blast-pill${on ? ' studio-send-blast-pill--selected' : ''}" data-artist-id="${escapeAttr(id)}" aria-pressed="${on ? 'true' : 'false'}">${label}</button>`;
            })
            .join('');

        pillsEl.querySelectorAll('button[data-artist-id]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-artist-id');
                if (!id) return;
                if (selected.has(id)) selected.delete(id);
                else selected.add(id);
                btn.classList.toggle('studio-send-blast-pill--selected', selected.has(id));
                btn.setAttribute('aria-pressed', selected.has(id) ? 'true' : 'false');
                updateOverview();
            });
        });
        updateOverview();
    };

    const buildCohortUi = () => {
        if (!cohortsEl) return;
        const years = uniqueCohortYears(allRows);
        if (!years.length) {
            cohortsEl.innerHTML = '<span class="studio-muted">—</span>';
            return;
        }
        cohortsEl.innerHTML = years
            .map(
                (y) =>
                    `<label class="studio-send-blast-cohort-label"><input type="checkbox" class="studio-send-blast-cohort-cb" value="${y}" /> ${y}</label>`,
            )
            .join('');

        cohortsEl.querySelectorAll('.studio-send-blast-cohort-cb').forEach((cb) => {
            cb.addEventListener('change', () => {
                cohortFilter.clear();
                cohortsEl.querySelectorAll('.studio-send-blast-cohort-cb').forEach((x) => {
                    if (x instanceof HTMLInputElement && x.checked) {
                        cohortFilter.add(Math.floor(Number(x.value)));
                    }
                });
                renderPills();
                recomputeSendEnabled();
            });
        });
    };

    void (async () => {
        if (getDataSource() !== 'live') {
            if (overviewEl) {
                overviewEl.textContent =
                    'Send blast requires Live data and Integration API (Resend). Switch data source in Studio or use test emails only in a local integration stack.';
            }
            if (sendBtn instanceof HTMLButtonElement) sendBtn.disabled = true;
            return;
        }
        try {
            const raw = await getArtistsRows();
            allRows = (Array.isArray(raw) ? raw : []).filter(hasContactEmail);
        } catch (e) {
            if (overviewEl) overviewEl.textContent = e instanceof Error ? e.message : String(e);
            return;
        }
        buildCohortUi();
        renderPills();
        recomputeSendEnabled();
    })();

    searchEl?.addEventListener('input', () => {
        renderPills();
    });

    root.querySelector('#studio-send-blast-select-visible')?.addEventListener('click', () => {
        for (const r of filteredRows()) {
            selected.add(String(r.id));
        }
        renderPills();
    });

    root.querySelector('#studio-send-blast-clear')?.addEventListener('click', () => {
        selected.clear();
        renderPills();
    });

    const llmBtn = root.querySelector('#studio-send-blast-llm');
    const llmDefaultLabel =
        llmBtn instanceof HTMLButtonElement && llmBtn.textContent?.trim() ? llmBtn.textContent.trim() : 'Quick draft';

    root.querySelector('#studio-send-blast-llm')?.addEventListener('click', async () => {
        if (!(bodyEl instanceof HTMLTextAreaElement)) return;
        const btn = root.querySelector('#studio-send-blast-llm');
        const tone =
            (root.querySelector('#studio-send-blast-tone') instanceof HTMLSelectElement
                ? root.querySelector('#studio-send-blast-tone')?.value
                : '') || 'Professional and warm';
        const src = bodyEl.value;
        const prompt = `Quick draft for a staff email to artists. Tone: ${tone}. Output plain text only — no HTML, no markdown, no code fences. Use line breaks between paragraphs. Keep a single clear call to action.`;
        const combined = prompt.length + src.length;
        if (combined > LLM_COMBINED_MAX) {
            alert(`Prompt + body exceeds ${LLM_COMBINED_MAX} characters (canister limit). Shorten the body.`);
            return;
        }
        if (btn instanceof HTMLButtonElement) {
            setButtonBusy(btn, true);
        }
        setStatus('Quick draft: working…');
        let ok = false;
        try {
            const out = await studioReinterpretWithPrompt(prompt, src, 'en');
            bodyEl.value = out.trim();
            ok = true;
            setStatus('Quick draft: done. Message was updated below.');
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
            setStatus('');
        } finally {
            if (btn instanceof HTMLButtonElement) {
                setButtonBusy(btn, false);
                if (ok) {
                    flashButtonSuccess(btn, 'Done');
                    window.setTimeout(() => {
                        if (btn.textContent === 'Done') btn.textContent = llmDefaultLabel;
                    }, 1600);
                }
            }
        }
    });

    const testBtn = root.querySelector('#studio-send-blast-test');
    const testDefaultLabel =
        testBtn instanceof HTMLButtonElement && testBtn.textContent?.trim()
            ? testBtn.textContent.trim()
            : 'Send test';

    root.querySelector('#studio-send-blast-test')?.addEventListener('click', async () => {
        const btn = root.querySelector('#studio-send-blast-test');
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
        if (btn instanceof HTMLButtonElement) {
            setButtonBusy(btn, true);
        }
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
                        if (btn.textContent === 'Sent') btn.textContent = testDefaultLabel;
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
        const subj = subjectEl instanceof HTMLInputElement ? subjectEl.value.trim() : '';
        if (!subj) {
            alert('Subject is required.');
            return;
        }
        const html = fullHtml();
        const recipients = [];
        const seen = new Set();
        for (const r of allRows) {
            if (!selected.has(String(r.id))) continue;
            const em = String(r.contactEmail ?? '')
                .trim()
                .toLowerCase();
            if (!em.includes('@')) continue;
            if (seen.has(em)) continue;
            seen.add(em);
            recipients.push({ row: r, to: em });
        }
        if (!recipients.length) {
            alert('No selected artists with a valid contact email.');
            return;
        }
        sendBtn.disabled = true;
        setStatus(`Sending ${recipients.length} message(s)…`);
        try {
            const result = await sendEmailBatch(
                recipients.map((x) => ({
                    to: x.to,
                    subject: subj,
                    html,
                })),
            );
            const ok = result?.okCount ?? result?.ok ?? 0;
            const fail = result?.failCount ?? result?.failed ?? 0;
            setStatus(`Done. Ok: ${ok}, failed: ${fail}.`);
            if (onRefresh) await onRefresh();
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
            setStatus('');
        } finally {
            sendBtn.disabled = false;
            recomputeSendEnabled();
        }
    });
}
