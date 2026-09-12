/**
 * Admin-only Team directory: canister admins and staff / collaborator / account-admin roles.
 */
import { studioPageHeaderHtml } from '../../utils/studioCategoryLayout.js';
import { escapeHtml } from '../../utils/textPreview.js';
import { shortPrincipalDisplay } from '../../utils/studioPlainForms.js';
import { openStudioModal } from '../../utils/studioModal.js';
import { formatStudioDate } from '../../utils/studioDateFormat.js';
import {
    adminCreateJoinInviteCodeStudio,
    adminListAccountContactsForStudio,
    adminListJoinInvitesStudio,
    adminListSuperStaffStudio,
    adminUpsertUserAccountStudio,
    getAccountsForStudio,
    isCallerAdminStudio,
    listAdminsForStudio,
} from '../../utils/database.js';
import {
    collectStudioTeamDirectoryRows,
    isStudioTeamAccountRole,
    studioTeamRoleKey,
} from '../../utils/studioTeamDirectory.js';

/**
 * @param {string} roleKey
 * @returns {Record<string, null>}
 */
function roleRecordFromKey(roleKey) {
    const k = String(roleKey || '').toLowerCase();
    if (k === 'staff') return { staff: null };
    if (k === 'collaborator') return { collaborator: null };
    if (k === 'admin') return { admin: null };
    if (k === 'artist') return { artist: null };
    if (k === 'gallery') return { gallery: null };
    if (k === 'curator') return { curator: null };
    if (k === 'collector') return { collector: null };
    return { staff: null };
}

/**
 * @param {import('../../utils/database.js').StudioAccountRow} row
 * @param {string} newRoleKey
 * @returns {Record<string, unknown>}
 */
function patchAccountRole(row, newRoleKey) {
    const raw = row.rawAccount;
    if (!raw || typeof raw !== 'object') {
        throw new Error('No account record to update.');
    }
    return {
        .../** @type {Record<string, unknown>} */ (raw),
        role: roleRecordFromKey(newRoleKey),
        updatedAt: new Date().toISOString(),
    };
}

/**
 * @param {unknown} role — Motoko `UserRole` (Candid record)
 * @returns {string}
 */
function joinInviteRoleLabel(role) {
    const k = studioTeamRoleKey(role);
    return k || '—';
}

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            return true;
        } catch {
            return false;
        }
    }
}

export function renderTeamSection() {
    return `
        <div class="studio-section-stack studio-category-page" id="studioTeamRoot">
            ${studioPageHeaderHtml({
                title: 'Team',
                subtitle: 'Admins, staff, and collaborators',
                countId: 'studio-team-count',
                countLabel: 'people',
            })}
            <p class="studio-muted" id="studioTeamIntro">
                <strong>Team</strong> lists canister admins and accounts with a <strong>staff</strong>, <strong>collaborator</strong>, or
                <strong>admin</strong> role. Artists, galleries, curators, and collectors live in their own sections. Use join invites to onboard
                staff and collaborators via
                <a class="studio-inline-link" href="/join-fusion" target="_blank" rel="noopener">/join-fusion</a>.
                Studio access for those roles is set in
                <a class="studio-inline-link" href="#permissions">Permissions</a>.
            </p>
            <div class="studio-toolbar-actions" id="studioTeamToolbar" style="display:none">
                <button type="button" class="studio-btn-primary" id="studioTeamGenInvite" aria-haspopup="dialog">Generate team join invite</button>
            </div>
            <p class="studio-banner studio-banner--warn" id="studioTeamGate" role="status">Loading…</p>
            <div class="studio-table-wrap studio-table-wrap--sticky-head" id="studioTeamTableWrap" hidden>
                <table class="studio-table studio-table--dense" aria-label="Team directory">
                    <thead>
                        <tr>
                            <th>Identity</th>
                            <th>Team member</th>
                            <th>Contact</th>
                            <th>Account role</th>
                            <th>Status</th>
                            <th>Access</th>
                        </tr>
                    </thead>
                    <tbody id="studioTeamTbody"></tbody>
                </table>
            </div>
            <div id="studioTeamPendingInvitesWrap" class="studio-team-pending-invites" hidden>
                <p class="studio-muted" style="margin-top:1.5rem">
                    <strong>Pending join invites</strong> — unused staff and collaborator codes. Redeem on
                    <a class="studio-inline-link" href="/join-fusion" target="_blank" rel="noopener">/join-fusion</a>
                    with the matching role.
                </p>
                <div class="studio-table-wrap studio-table-wrap--sticky-head">
                    <table class="studio-table studio-table--dense" aria-label="Pending join invites">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Role</th>
                                <th>Created</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody id="studioTeamInvitesTbody"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

/**
 * @param {HTMLElement} mainEl
 */
async function renderPendingJoinInvitesTable(mainEl) {
    const wrap = mainEl.querySelector('#studioTeamPendingInvitesWrap');
    const tbody = mainEl.querySelector('#studioTeamInvitesTbody');
    if (!wrap || !tbody) return;
    let rows;
    try {
        rows = await adminListJoinInvitesStudio();
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        tbody.innerHTML = `<tr><td colspan="4" class="studio-muted">Could not load invites. ${escapeHtml(
            msg
        )}</td></tr>`;
        wrap.hidden = false;
        return;
    }
    const list = Array.isArray(rows) ? rows : [];
    const pending = list
        .map((entry) => {
            const ex = /** @type {any} */ (entry);
            const code = Array.isArray(ex) ? ex[0] : ex?.[0] ?? ex?.['0'];
            const rec = Array.isArray(ex) ? ex[1] : ex?.[1] ?? ex?.['1'];
            return { code: String(code ?? ''), rec };
        })
        .filter((x) => {
            if (!x.rec || typeof x.rec !== 'object') return false;
            const rec = /** @type {Record<string, unknown>} */ (x.rec);
            if (rec.active !== true) return false;
            return isStudioTeamAccountRole(studioTeamRoleKey(rec.role));
        });
    if (pending.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="4" class="studio-muted">No active staff or collaborator invites.</td></tr>';
    } else {
        pending.sort((a, b) => a.code.localeCompare(b.code));
        tbody.innerHTML = pending
            .map(({ code, rec }) => {
                const r = /** @type {Record<string, unknown>} */ (rec);
                const role = joinInviteRoleLabel(r.role);
                const created = escapeHtml(formatStudioDate(r.createdAt));
                return `<tr>
        <td><code style="user-select:all">${escapeHtml(code)}</code></td>
        <td>${escapeHtml(role)}</td>
        <td>${created}</td>
        <td><button type="button" class="studio-btn-ghost studio-btn-tiny" data-copy-invite="${escapeHtml(
            code
        )}">Copy</button></td>
      </tr>`;
            })
            .join('');
    }
    wrap.hidden = false;
}

/**
 * @param {HTMLElement} mainEl
 */
export async function initTeamSection(mainEl) {
    const gate = mainEl.querySelector('#studioTeamGate');
    const tableWrap = mainEl.querySelector('#studioTeamTableWrap');
    const tbody = mainEl.querySelector('#studioTeamTbody');
    const toolbar = mainEl.querySelector('#studioTeamToolbar');
    const countEl = mainEl.querySelector('#studio-team-count');
    const intro = mainEl.querySelector('#studioTeamIntro');
    if (!gate || !tbody) return;

    if (!(await isCallerAdminStudio())) {
        if (intro) intro.hidden = true;
        if (tableWrap) tableWrap.hidden = true;
        if (toolbar) toolbar.style.display = 'none';
        const pendingWrap = mainEl.querySelector('#studioTeamPendingInvitesWrap');
        if (pendingWrap) pendingWrap.hidden = true;
        gate.className = 'studio-banner studio-banner--warn';
        gate.textContent = "You need canister admin access to view the Team section.";
        if (countEl) countEl.textContent = '—';
        return;
    }

    if (!mainEl.dataset.studioTeamInviteCopyBound) {
        mainEl.dataset.studioTeamInviteCopyBound = '1';
        mainEl.addEventListener('click', (e) => {
            const t = e.target;
            if (!(t instanceof Element)) return;
            const btn = t.closest('button[data-copy-invite]');
            if (!btn || !mainEl.contains(btn)) return;
            const c = btn.getAttribute('data-copy-invite') || '';
            void copyText(c);
        });
    }

    gate.className = 'studio-banner studio-banner--info';
    gate.textContent = 'Loading team directory…';
    if (toolbar) toolbar.style.display = 'flex';

    try {
        const [adminPrincipals, superList, accInitial, contactPairs] = await Promise.all([
            listAdminsForStudio().catch(() => []),
            adminListSuperStaffStudio().catch(() => []),
            getAccountsForStudio(),
            adminListAccountContactsForStudio().catch(() => []),
        ]);
        let allAccounts = accInitial;

        const directory = collectStudioTeamDirectoryRows({
            adminPrincipals,
            superStaffPrincipals: superList,
            accounts: allAccounts,
            contactPairs,
        });

        gate.className = 'studio-banner studio-banner--ok';
        gate.textContent = 'Directory is read from the canister. Save role changes after editing a row.';
        if (countEl) countEl.textContent = String(directory.length);
        if (tableWrap) tableWrap.hidden = false;

        tbody.innerHTML = directory.length
            ? directory
            .map((row) => {
                const k = row.principal;
                const c = row.contact;
                const memberNameRaw = [c?.firstName || '', c?.lastName || '']
                    .map((x) => String(x || '').trim())
                    .filter(Boolean)
                    .join(' ');
                const memberName = memberNameRaw || '—';
                const contactLine =
                    c && (c.firstName || c.lastName || c.email)
                        ? `${[c.firstName, c.lastName].filter(Boolean).join(' ')}${
                              c.email ? (c.firstName || c.lastName ? ' · ' : '') + c.email : ''
                          }`
                        : '—';
                const acc = /** @type {{ role?: string, status?: string } | null} */ (row.acc);
                const role = acc ? acc.role : '—';
                const st = acc ? acc.status || '—' : '—';
                const canisterBadge = row.isAdmin
                    ? '<span class="studio-pill studio-pill--active">Canister admin</span>'
                    : '';
                const superBadge = row.isSuperStaff
                    ? '<span class="studio-pill studio-pill--dev">Super staff</span>'
                    : '';
                const idSuffix = k.replace(/[^a-z0-9]/gi, '');

                const roleSelect = acc
                    ? `<div class="studio-team-role-actions">
                <label class="studio-sr-only" for="team-role-${idSuffix}">Change role for ${escapeHtml(
                          k
                      )}</label><select class="studio-select" id="team-role-${idSuffix}" data-principal="${escapeHtml(
                          k
                      )}" data-kind="account-role" aria-label="Change account role">
                    <option value="staff" ${role === 'staff' ? 'selected' : ''}>staff</option>
                    <option value="collaborator" ${role === 'collaborator' ? 'selected' : ''}>collaborator</option>
                    <option value="admin" ${role === 'admin' ? 'selected' : ''}>admin (account)</option>
                </select>
                <button type="button" class="studio-btn-primary studio-btn-tiny" data-principal="${escapeHtml(
                    k
                )}" data-kind="save-role">Save</button></div>`
                    : '—';

                return `<tr>
        <td><span class="studio-identity-short" title="${escapeHtml(k)}">${escapeHtml(shortPrincipalDisplay(k))}</span>
          <div class="studio-team-badges">${canisterBadge}${superBadge}</div></td>
        <td>${escapeHtml(memberName)}</td>
        <td class="studio-td-clip">${escapeHtml(contactLine)}</td>
        <td>${acc ? escapeHtml(String(role || '')) : '—'}</td>
        <td>${acc ? escapeHtml(String(st || '')) : '—'}</td>
        <td class="studio-td-wrap">${roleSelect}</td>
      </tr>`;
            })
            .join('')
            : '<tr><td colspan="6" class="studio-muted">No admins, staff, or collaborators yet.</td></tr>';

        const doSave = async (/** @type {string} */ p, /** @type {HTMLSelectElement} */ sel) => {
            const accRow = allAccounts.find((x) => x.principal === p);
            if (!accRow || !accRow.rawAccount) return;
            const v = sel.value;
            const patched = patchAccountRole(accRow, v);
            try {
                await adminUpsertUserAccountStudio(p, patched);
                allAccounts = await getAccountsForStudio();
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                window.alert(`Could not save: ${msg}`);
            }
        };

        tbody.addEventListener('click', (e) => {
            const t = e.target;
            if (!(t instanceof Element)) return;
            const save = t.closest('button[data-kind="save-role"]');
            if (!save || !tbody.contains(save)) return;
            const p = save.getAttribute('data-principal') || '';
            if (!p) return;
            const tr = save.closest('tr');
            const sel = tr && tr.querySelector('select[data-kind="account-role"]');
            if (sel instanceof HTMLSelectElement) void doSave(p, sel);
        });

        await renderPendingJoinInvitesTable(mainEl);

        const genBtn = mainEl.querySelector('#studioTeamGenInvite');
        if (genBtn) {
            genBtn.addEventListener('click', () => {
                const body = `<div class="studio-section-stack" style="gap:1rem">
          <p class="studio-muted">Creates a <strong>single-use</strong> 8-digit code. The new member must pick the <strong>same</strong> role on <a href="/join-fusion" target="_blank" rel="noopener">/join-fusion</a>.</p>
          <label class="studio-field"><span>Role</span>
            <select id="studioTeamInviteRole" class="studio-select">
              <option value="staff" selected>Staff</option>
              <option value="collaborator">Collaborator</option>
            </select>
          </label>
          <p id="studioTeamInviteResult" class="studio-muted" hidden></p>
          <div class="studio-modal-actions">
            <button type="button" class="studio-btn-primary" id="studioTeamInviteGen">Generate</button>
            <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Close</button>
          </div>
        </div>`;
                const { root } = openStudioModal(body, { title: 'Team join invite', compact: true });
                root.querySelector('#studioTeamInviteGen')?.addEventListener('click', async () => {
                    const s = root.querySelector('#studioTeamInviteRole');
                    const v = s instanceof HTMLSelectElement ? s.value : 'staff';
                    const rec = v === 'collaborator' ? { collaborator: null } : { staff: null };
                    const out = root.querySelector('#studioTeamInviteResult');
                    try {
                        const code = await adminCreateJoinInviteCodeStudio(rec);
                        if (out) {
                            out.innerHTML = `Code: <code style="user-select:all;font-size:1.1em">${escapeHtml(
                                code
                            )}</code> <button type="button" class="studio-btn-ghost" id="studioTeamCopyCode">Copy</button>`;
                            out.hidden = false;
                            out.querySelector('#studioTeamCopyCode')?.addEventListener('click', () => {
                                void copyText(code);
                            });
                        }
                        await renderPendingJoinInvitesTable(mainEl);
                    } catch (err) {
                        if (out) {
                            out.textContent = err instanceof Error ? err.message : String(err);
                            out.hidden = false;
                        }
                    }
                });
            });
        }
    } catch (e) {
        gate.className = 'studio-banner studio-banner--error';
        gate.textContent = e instanceof Error ? e.message : String(e);
        if (countEl) countEl.textContent = '—';
    }
}
