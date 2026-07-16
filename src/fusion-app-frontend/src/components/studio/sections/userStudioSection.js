/**
 * Studio **User Studio** section — manage quotes, default blindspots, and sidebar guidance
 * for the member "Your Studio" dashboard. Uses the `user-studio` content bundle key.
 */
import {
    getContentBundleForStudio,
    upsertContentPageStudio,
} from '../../../utils/database.js';

function esc(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function renderUserStudio() {
    return `
        <div class="studio-section-stack">
            <p class="studio-muted">Configure the member <strong>Your Studio</strong> dashboard: rotating quotes, default blindspot suggestions, and sidebar guidance. Changes apply to all members.</p>

            <section class="studio-settings-card" id="studio-user-studio-quotes">
                <h3 class="studio-subheading">Rotating Quotes</h3>
                <p class="studio-muted">One quote is shown at a time in the member Overview right column. Each quote has EN and optional JA text.</p>
                <div id="studio-us-quotes-list" class="studio-us-list"></div>
                <button type="button" class="studio-btn-ghost" id="studio-us-quote-add">+ Add quote</button>
            </section>

            <section class="studio-settings-card" id="studio-user-studio-blindspots">
                <h3 class="studio-subheading">Default Blindspots</h3>
                <p class="studio-muted">Shown to members who have no artist-specific blindspots configured. Each item links to a panel/tab in Your Studio.</p>
                <div id="studio-us-blindspots-list" class="studio-us-list"></div>
                <button type="button" class="studio-btn-ghost" id="studio-us-blindspot-add">+ Add blindspot</button>
            </section>

            <section class="studio-settings-card" id="studio-user-studio-audio-inspiration">
                <h3 class="studio-subheading">Audio Inspiration Text</h3>
                <p class="studio-muted">Displayed in the member Media Library to encourage artists to add audio bites.</p>
                <div class="studio-prog-locale-form">
                    <div class="studio-prog-col-headers" aria-hidden="true">
                        <span>EN</span><span>JA</span>
                    </div>
                    <div class="studio-prog-locale-row">
                        <textarea id="studio-us-audio-inspiration-en" class="studio-input studio-input--textarea" rows="3" placeholder="EN inspiration text"></textarea>
                        <textarea id="studio-us-audio-inspiration-ja" class="studio-input studio-input--textarea" rows="3" placeholder="JA inspiration text"></textarea>
                    </div>
                </div>
            </section>

            <section class="studio-settings-card" id="studio-user-studio-guidance">
                <h3 class="studio-subheading">Sidebar Guidance</h3>
                <p class="studio-muted">Short message shown in the Your Studio sidebar below navigation.</p>
                <div class="studio-prog-locale-form">
                    <div class="studio-prog-col-headers" aria-hidden="true">
                        <span>EN</span><span>JA</span>
                    </div>
                    <div class="studio-prog-locale-row">
                        <textarea id="studio-us-guidance-en" class="studio-input studio-input--textarea" rows="2" placeholder="EN guidance"></textarea>
                        <textarea id="studio-us-guidance-ja" class="studio-input studio-input--textarea" rows="2" placeholder="JA guidance"></textarea>
                    </div>
                </div>
            </section>

            <div class="studio-toolbar-actions" style="margin-top:1rem">
                <button type="button" class="studio-btn-primary" id="studio-us-save">Save</button>
                <span id="studio-us-msg" class="studio-muted" style="display:none"></span>
            </div>
        </div>
    `;
}

function renderQuoteRow(q, idx) {
    return `<div class="studio-us-row" data-us-quote-idx="${idx}">
        <div class="studio-prog-locale-row">
            <input class="studio-input" data-us-field="quote-en" value="${esc(q.en || '')}" placeholder="EN quote" />
            <input class="studio-input" data-us-field="quote-ja" value="${esc(q.ja || '')}" placeholder="JA quote" />
            <button type="button" class="studio-btn-ghost studio-btn-icon" data-us-remove="quote" title="Remove">&times;</button>
        </div>
    </div>`;
}

function renderBlindspotRow(b, idx) {
    const panels = ['identity', 'work', 'programs', 'media', 'journal', 'preview', 'settings'];
    const tabs = ['basics', 'status', 'story'];
    return `<div class="studio-us-row" data-us-bs-idx="${idx}">
        <div class="studio-us-bs-grid">
            <label class="studio-field studio-field--stack studio-field--compact">
                <span>ID</span>
                <input class="studio-input" data-us-field="bs-id" value="${esc(b.id || '')}" placeholder="unique-id" />
            </label>
            <label class="studio-field studio-field--stack studio-field--compact">
                <span>Title EN</span>
                <input class="studio-input" data-us-field="bs-title-en" value="${esc(b.title?.en || '')}" placeholder="EN title" />
            </label>
            <label class="studio-field studio-field--stack studio-field--compact">
                <span>Title JA</span>
                <input class="studio-input" data-us-field="bs-title-ja" value="${esc(b.title?.ja || '')}" placeholder="JA title" />
            </label>
            <label class="studio-field studio-field--stack studio-field--compact">
                <span>Body EN</span>
                <input class="studio-input" data-us-field="bs-body-en" value="${esc(b.body?.en || '')}" placeholder="EN body" />
            </label>
            <label class="studio-field studio-field--stack studio-field--compact">
                <span>Body JA</span>
                <input class="studio-input" data-us-field="bs-body-ja" value="${esc(b.body?.ja || '')}" placeholder="JA body" />
            </label>
            <label class="studio-field studio-field--stack studio-field--compact">
                <span>Target Panel</span>
                <select class="studio-input" data-us-field="bs-panel">
                    <option value="">—</option>
                    ${panels.map((p) => `<option value="${p}"${b.targetPanel === p ? ' selected' : ''}>${p}</option>`).join('')}
                </select>
            </label>
            <label class="studio-field studio-field--stack studio-field--compact">
                <span>Target Tab</span>
                <select class="studio-input" data-us-field="bs-tab">
                    <option value="">—</option>
                    ${tabs.map((t) => `<option value="${t}"${b.targetTab === t ? ' selected' : ''}>${t}</option>`).join('')}
                </select>
            </label>
            <label class="studio-field studio-field--stack studio-field--compact">
                <span>Priority</span>
                <input type="number" class="studio-input" data-us-field="bs-priority" value="${b.priority ?? ''}" min="0" />
            </label>
            <button type="button" class="studio-btn-ghost studio-btn-icon" data-us-remove="blindspot" title="Remove">&times;</button>
        </div>
    </div>`;
}

/**
 * @param {HTMLElement} mainEl
 */
export async function initUserStudio(mainEl) {
    /** @type {{ quotes?: { en: string, ja?: string }[], defaultBlindspots?: object[], sidebarGuidance?: { en?: string, ja?: string } }} */
    let data = {};
    try {
        const raw = await getContentBundleForStudio('user-studio', { forStudio: true });
        if (raw && typeof raw === 'object') data = /** @type {any} */ (raw);
    } catch { /* use empty defaults */ }

    const quotesEl = mainEl.querySelector('#studio-us-quotes-list');
    const bsEl = mainEl.querySelector('#studio-us-blindspots-list');
    const guidanceEn = /** @type {HTMLTextAreaElement | null} */ (mainEl.querySelector('#studio-us-guidance-en'));
    const guidanceJa = /** @type {HTMLTextAreaElement | null} */ (mainEl.querySelector('#studio-us-guidance-ja'));
    const audioInspEn = /** @type {HTMLTextAreaElement | null} */ (mainEl.querySelector('#studio-us-audio-inspiration-en'));
    const audioInspJa = /** @type {HTMLTextAreaElement | null} */ (mainEl.querySelector('#studio-us-audio-inspiration-ja'));

    const quotes = Array.isArray(data.quotes) ? [...data.quotes] : [];
    const blindspots = Array.isArray(data.defaultBlindspots) ? [...data.defaultBlindspots] : [];

    const renderQuotes = () => {
        if (quotesEl) quotesEl.innerHTML = quotes.map(renderQuoteRow).join('') || '<p class="studio-muted">No quotes yet.</p>';
    };
    const renderBlindspots = () => {
        if (bsEl) bsEl.innerHTML = blindspots.map(renderBlindspotRow).join('') || '<p class="studio-muted">No default blindspots.</p>';
    };

    renderQuotes();
    renderBlindspots();

    if (guidanceEn) guidanceEn.value = data.sidebarGuidance?.en || '';
    if (guidanceJa) guidanceJa.value = data.sidebarGuidance?.ja || '';
    if (audioInspEn) audioInspEn.value = data.audioInspirationText?.en || '';
    if (audioInspJa) audioInspJa.value = data.audioInspirationText?.ja || '';

    const collectQuotes = () => {
        const rows = mainEl.querySelectorAll('[data-us-quote-idx]');
        return [...rows].map((row) => ({
            en: /** @type {HTMLInputElement} */ (row.querySelector('[data-us-field="quote-en"]'))?.value || '',
            ja: /** @type {HTMLInputElement} */ (row.querySelector('[data-us-field="quote-ja"]'))?.value || '',
        })).filter((q) => q.en.trim());
    };

    const collectBlindspots = () => {
        const rows = mainEl.querySelectorAll('[data-us-bs-idx]');
        return [...rows].map((row) => {
            const f = (sel) => /** @type {HTMLInputElement} */ (row.querySelector(`[data-us-field="${sel}"]`))?.value || '';
            return {
                id: f('bs-id'),
                title: { en: f('bs-title-en'), ja: f('bs-title-ja') },
                body: { en: f('bs-body-en'), ja: f('bs-body-ja') },
                targetPanel: f('bs-panel'),
                targetTab: f('bs-tab'),
                priority: parseInt(f('bs-priority'), 10) || 0,
            };
        }).filter((b) => b.id.trim());
    };

    mainEl.addEventListener('click', (e) => {
        const t = /** @type {Element} */ (e.target);
        if (t.closest('#studio-us-quote-add')) {
            quotes.push({ en: '', ja: '' });
            renderQuotes();
            return;
        }
        if (t.closest('#studio-us-blindspot-add')) {
            blindspots.push({ id: '', title: { en: '', ja: '' }, body: { en: '', ja: '' }, targetPanel: '', targetTab: '', priority: 0 });
            renderBlindspots();
            return;
        }
        const removeQ = t.closest('[data-us-remove="quote"]');
        if (removeQ) {
            const row = removeQ.closest('[data-us-quote-idx]');
            const idx = parseInt(row?.getAttribute('data-us-quote-idx') || '-1', 10);
            if (idx >= 0) { quotes.splice(idx, 1); renderQuotes(); }
            return;
        }
        const removeB = t.closest('[data-us-remove="blindspot"]');
        if (removeB) {
            const row = removeB.closest('[data-us-bs-idx]');
            const idx = parseInt(row?.getAttribute('data-us-bs-idx') || '-1', 10);
            if (idx >= 0) { blindspots.splice(idx, 1); renderBlindspots(); }
            return;
        }
    });

    const msgEl = mainEl.querySelector('#studio-us-msg');
    const showMsg = (txt, ok = true) => {
        if (!msgEl) return;
        msgEl.textContent = txt;
        msgEl.style.display = '';
        msgEl.style.color = ok ? '' : 'var(--studio-err, #c00)';
        setTimeout(() => { msgEl.style.display = 'none'; }, 4000);
    };

    mainEl.querySelector('#studio-us-save')?.addEventListener('click', async () => {
        const payload = {
            quotes: collectQuotes(),
            defaultBlindspots: collectBlindspots(),
            sidebarGuidance: {
                en: guidanceEn?.value || '',
                ja: guidanceJa?.value || '',
            },
            audioInspirationText: {
                en: audioInspEn?.value || '',
                ja: audioInspJa?.value || '',
            },
        };
        try {
            await upsertContentPageStudio('user-studio', payload);
            showMsg('Saved.');
        } catch (err) {
            showMsg(`Save failed: ${err}`, false);
        }
    });
}
