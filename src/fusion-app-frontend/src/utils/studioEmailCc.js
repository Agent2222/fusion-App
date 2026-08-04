/**
 * Studio email CC helpers — always CC info@fusionart.world; optional team member.
 */
import {
    adminListAccountContactsForStudio,
    adminListSuperStaffStudio,
    appendEmailOutboundRecord,
    getAccountsForStudio,
    listAdminsForStudio,
} from './database.js';

export const STUDIO_EMAIL_ALWAYS_CC = 'info@fusionart.world';

/**
 * @param {string} [selectedTeamEmail]
 * @returns {string[]}
 */
export function buildStudioEmailCcList(selectedTeamEmail) {
    /** @type {string[]} */
    const out = [];
    const push = (v) => {
        const e = String(v || '')
            .trim()
            .toLowerCase();
        if (!e.includes('@')) return;
        if (out.includes(e)) return;
        out.push(e);
    };
    push(selectedTeamEmail);
    push(STUDIO_EMAIL_ALWAYS_CC);
    return out;
}

/**
 * @param {string[]} cc
 * @returns {string}
 */
export function formatCcEmailsForRecord(cc) {
    return (Array.isArray(cc) ? cc : [])
        .map((e) => String(e || '').trim().toLowerCase())
        .filter((e) => e.includes('@'))
        .join(', ');
}

/**
 * HTML for a CC team-member select (info@ always included server-side).
 * @param {string} [selectId]
 * @returns {string}
 */
export function studioEmailCcSelectHtml(selectId = 'studio-email-cc-team') {
    const id = String(selectId || 'studio-email-cc-team').replace(/"/g, '');
    return `<label class="studio-field studio-email-cc-field">
  <span class="studio-field-label">CC team member <em class="studio-muted">(optional)</em></span>
  <select class="studio-select" id="${id}" data-studio-email-cc>
    <option value="">None — info@fusionart.world only</option>
  </select>
  <span class="studio-hint">Always CC’d: <strong>info@fusionart.world</strong></span>
</label>`;
}

/**
 * @param {unknown} pr
 * @returns {string}
 */
function principalKey(pr) {
    if (pr == null) return '';
    if (typeof pr === 'string') return pr.trim();
    if (typeof pr === 'object' && pr && typeof /** @type {any} */ (pr).toText === 'function') {
        return String(/** @type {any} */ (pr).toText());
    }
    return String(pr).trim();
}

/**
 * @returns {Promise<Array<{ label: string, email: string }>>}
 */
export async function loadStudioTeamEmailOptions() {
    const INTERNAL_ROLES = new Set(['staff', 'admin', 'collaborator']);
    try {
        const [adminPrincipals, superList, accounts, contactPairs] = await Promise.all([
            listAdminsForStudio().catch(() => []),
            adminListSuperStaffStudio().catch(() => []),
            getAccountsForStudio().catch(() => []),
            adminListAccountContactsForStudio().catch(() => []),
        ]);

        /** @type {Map<string, { email: string, firstName: string, lastName: string, roleHint: string }>} */
        const byEmail = new Map();

        /** @type {Map<string, { email: string, firstName: string, lastName: string }>} */
        const contactByPrincipal = new Map();
        for (const pair of contactPairs || []) {
            if (!pair) continue;
            const pr = Array.isArray(pair) ? pair[0] : /** @type {any} */ (pair)[0];
            const c = Array.isArray(pair) ? pair[1] : /** @type {any} */ (pair)[1];
            if (!c || typeof c !== 'object') continue;
            const email = String(/** @type {any} */ (c).email || '')
                .trim()
                .toLowerCase();
            if (!email.includes('@')) continue;
            contactByPrincipal.set(principalKey(pr), {
                email,
                firstName: String(/** @type {any} */ (c).firstName || ''),
                lastName: String(/** @type {any} */ (c).lastName || ''),
            });
        }

        const ensureFromContact = (pk, roleHint) => {
            const c = contactByPrincipal.get(pk);
            if (!c) return;
            if (byEmail.has(c.email)) return;
            byEmail.set(c.email, { ...c, roleHint });
        };

        for (const p of adminPrincipals || []) {
            ensureFromContact(principalKey(p), 'Admin');
        }
        for (const p of superList || []) {
            ensureFromContact(principalKey(p), 'Super staff');
        }
        for (const row of accounts || []) {
            if (!INTERNAL_ROLES.has(String(row?.role || ''))) continue;
            const pk = String(row?.principal || '').trim();
            const c = contactByPrincipal.get(pk);
            if (c && !byEmail.has(c.email)) {
                byEmail.set(c.email, { ...c, roleHint: String(row.role || 'Staff') });
            }
        }
        // Any remaining contacts (directory) with email.
        for (const [pk, c] of contactByPrincipal) {
            if (byEmail.has(c.email)) continue;
            byEmail.set(c.email, { ...c, roleHint: 'Team' });
            void pk;
        }

        return [...byEmail.values()]
            .map((r) => {
                const name = [r.firstName, r.lastName].filter(Boolean).join(' ').trim();
                const label = name ? `${name} <${r.email}>` : r.email;
                return { label, email: r.email };
            })
            .sort((a, b) => a.label.localeCompare(b.label));
    } catch {
        return [];
    }
}

/**
 * Fill options into a CC select already in the DOM.
 * @param {HTMLSelectElement | null | undefined} selectEl
 * @param {Array<{ label: string, email: string }>} [preloaded]
 */
export async function populateStudioEmailCcSelect(selectEl, preloaded) {
    if (!(selectEl instanceof HTMLSelectElement)) return;
    const current = String(selectEl.value || '').trim();
    const options = Array.isArray(preloaded) ? preloaded : await loadStudioTeamEmailOptions();
    selectEl.innerHTML = `<option value="">None — info@fusionart.world only</option>`;
    for (const opt of options) {
        const o = document.createElement('option');
        o.value = opt.email;
        o.textContent = opt.label;
        selectEl.appendChild(o);
    }
    if (current && [...selectEl.options].some((o) => o.value === current)) {
        selectEl.value = current;
    }
}

/**
 * Read selected team email from a root (shadow or document).
 * @param {ParentNode | null | undefined} root
 * @param {string} [selectId]
 * @returns {string}
 */
export function readStudioEmailCcTeamEmail(root, selectId = 'studio-email-cc-team') {
    if (!root) return '';
    const safeId = String(selectId || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const el =
        (safeId && root.querySelector(`#${safeId}`)) ||
        root.querySelector('[data-studio-email-cc]');
    if (!(el instanceof HTMLSelectElement)) return '';
    return String(el.value || '').trim();
}

/**
 * @param {{
 *   kind: 'single' | 'batch' | 'category' | 'all',
 *   subject: string,
 *   htmlBody?: string,
 *   toSummary?: string,
 *   recipientCount?: number,
 *   cc?: string[],
 *   campaignId?: string | null,
 * }} opts
 * @returns {Promise<string | null>}
 */
export async function recordStudioEmailOutbound(opts) {
    try {
        const cc = Array.isArray(opts.cc) ? opts.cc : buildStudioEmailCcList();
        return await appendEmailOutboundRecord({
            kind: opts.kind,
            subject: opts.subject,
            htmlBody: opts.htmlBody || '',
            toSummary: opts.toSummary || '',
            recipientCount: opts.recipientCount ?? 0,
            ccEmails: formatCcEmailsForRecord(cc),
            campaignId: opts.campaignId || null,
        });
    } catch (e) {
        console.warn('[studio email] outbound record failed:', e);
        return null;
    }
}
