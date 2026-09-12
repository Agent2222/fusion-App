/**
 * Studio Permissions: Staff matrix (role defaults + per-principal overrides); other role tabs stubbed.
 */
import { Principal } from '@dfinity/principal';
import {
    STUDIO_PERMISSION_FEATURE_ROWS,
    STUDIO_PERMISSION_ROLE_TABS,
    isStaleCanisterPermissionKeyList,
    studioPermissionGroupLabel,
    mergeStudioPermissionMap,
    parseStudioPermissionMatrixTuples,
    studioPermissionMapsEqual,
} from '../../utils/studioPermissionFeatures.js';
import {
    adminAddSuperStaffStudio,
    adminClearStudioPermissionOverrideStudio,
    adminGetStudioPermissionDefaultsStudio,
    adminGetStudioPermissionOverrideStudio,
    adminListSuperStaffStudio,
    adminMergeDefaultStudioPermissionFeatureKeysStudio,
    adminRemoveSuperStaffStudio,
    adminSetStudioPermissionDefaultsStudio,
    adminSetStudioPermissionOverrideStudio,
    getAccountsForStudio,
    listStudioPermissionFeatureKeysStudio,
    refreshStudioShellAccessState,
} from '../../utils/database.js';
import { setStudioShellGate } from '../../utils/studioShellState.js';

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * @param {Map<string, { visible: boolean, canEdit: boolean }>} map
 * @param {Set<string> | null} [supportedKeys]
 */
function matrixTableHtml(map, supportedKeys = null) {
    let lastGroup = '';
    const rows = STUDIO_PERMISSION_FEATURE_ROWS.map((row) => {
        const acc = map.get(row.id) ?? { visible: true, canEdit: true };
        const unsupported = Boolean(supportedKeys?.size && !supportedKeys.has(row.id));
        const disabledAttr = unsupported ? ' disabled' : '';
        const rowClass = unsupported ? ' studio-perm-matrix__row--unsupported' : '';
        const group = row.group || '';
        let groupRow = '';
        if (group && group !== lastGroup) {
            lastGroup = group;
            groupRow = `<tr class="studio-perm-matrix__group"><td colspan="3">${escapeHtml(studioPermissionGroupLabel(group))}</td></tr>`;
        }
        return `${groupRow}
            <tr data-perm-row="${escapeHtml(row.id)}" class="${rowClass.trim()}">
                <td>${escapeHtml(row.label)}${unsupported ? ' <span class="studio-muted">(needs backend upgrade)</span>' : ''}</td>
                <td class="studio-perm-matrix__cell">
                    <label class="studio-checkbox-label">
                        <input type="checkbox" class="studio-perm-visible" data-feature="${escapeHtml(row.id)}" ${
                            acc.visible ? 'checked' : ''
                        }${disabledAttr} />
                        <span>Visible</span>
                    </label>
                </td>
                <td class="studio-perm-matrix__cell">
                    <label class="studio-checkbox-label">
                        <input type="checkbox" class="studio-perm-edit" data-feature="${escapeHtml(row.id)}" ${
                            acc.canEdit ? 'checked' : ''
                        }${disabledAttr} />
                        <span>Can change</span>
                    </label>
                </td>
            </tr>
        `;
        })
        .join('');
    return `
        <div class="studio-table-wrap">
            <table class="studio-table studio-perm-matrix">
                <thead>
                    <tr>
                        <th>Feature</th>
                        <th>Visible</th>
                        <th>Can change</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

/**
 * @param {HTMLElement} root
 * @returns {Map<string, { visible: boolean, canEdit: boolean }>}
 */
function readMatrixFromDom(root) {
    const map = new Map();
    for (const row of STUDIO_PERMISSION_FEATURE_ROWS) {
        const vis = root.querySelector(`.studio-perm-visible[data-feature="${row.id}"]`);
        if (!(vis instanceof HTMLInputElement)) continue;
        const ed = root.querySelector(`.studio-perm-edit[data-feature="${row.id}"]`);
        map.set(row.id, {
            visible: Boolean(vis.checked),
            canEdit: Boolean(ed instanceof HTMLInputElement && ed.checked),
        });
    }
    return map;
}

/**
 * @param {Map<string, { visible: boolean, canEdit: boolean }>} map
 * @param {Set<string> | null} [allowedKeys]
 * @returns {Array<[string, { visible: boolean, canEdit: boolean }]>}
 */
function matrixToCandidTuples(map, allowedKeys = null) {
    return STUDIO_PERMISSION_FEATURE_ROWS.filter((row) => !allowedKeys || allowedKeys.has(row.id)).map((row) => {
        const v = map.get(row.id) ?? { visible: true, canEdit: true };
        return [row.id, { visible: v.visible, canEdit: v.canEdit }];
    });
}

/**
 * @param {Array<[string, { visible: boolean, canEdit: boolean }]>} tuples
 * @returns {string | null}
 */
function parseUnknownStudioFeatureKeyError(err) {
    const msg = err instanceof Error ? err.message : String(err);
    const m = msg.match(/Unknown studio feature key:\s*([^'.\s]+)/i);
    return m ? String(m[1]).trim() : null;
}

/**
 * Save permission matrix; on older canisters that trap on newer keys, drop unknown keys and retry.
 *
 * @param {(tuples: Array<[string, { visible: boolean, canEdit: boolean }]>) => Promise<void>} saveFn
 * @param {Array<[string, { visible: boolean, canEdit: boolean }]>} tuples
 * @returns {Promise<{ saved: Array<[string, { visible: boolean, canEdit: boolean }]>, skipped: string[] }>}
 */
async function savePermissionMatrixWithFallback(saveFn, tuples) {
    let pending = tuples;
    const skipped = [];
    for (let attempt = 0; attempt < 32; attempt++) {
        try {
            await saveFn(pending);
            return { saved: pending, skipped };
        } catch (err) {
            const bad = parseUnknownStudioFeatureKeyError(err);
            if (!bad) throw err;
            if (!pending.some(([k]) => k === bad)) throw err;
            pending = pending.filter(([k]) => k !== bad);
            skipped.push(bad);
            if (!pending.length) throw err;
        }
    }
    throw new Error('Could not save permissions — too many unknown feature keys for this canister.');
}

export function renderPermissions() {
    const roleTabs = STUDIO_PERMISSION_ROLE_TABS.map(
        (t) => `<button type="button" class="studio-btn-ghost studio-perm-role-tab" data-role-tab="${escapeHtml(t.id)}">${escapeHtml(t.label)}</button>`
    ).join('');
    return `
        <div class="studio-section-stack studio-permissions-page">
            <div class="studio-section-title-row">
                <h2>Permissions</h2>
            </div>
            <p class="studio-banner studio-banner--info" id="studio-permissions-banner" hidden></p>
            <div class="studio-perm-role-tabs" role="tablist" aria-label="Role category">${roleTabs}</div>
            <div id="studio-perm-role-panel"></div>
            <div id="studio-perm-staff-panel">
                <div class="studio-perm-mode-row">
                    <label class="studio-field-label">Apply to</label>
                    <div class="studio-segment" id="studio-perm-mode">
                        <button type="button" class="studio-segment__btn is-active" data-mode="role">Role default</button>
                        <button type="button" class="studio-segment__btn" data-mode="principal">By principal</button>
                    </div>
                </div>
                <div id="studio-perm-principal-row" class="studio-perm-principal-row" hidden>
                    <label class="studio-field-label" for="studio-perm-principal-select">Studio user</label>
                    <select id="studio-perm-principal-select" class="studio-input studio-perm-principal-select"></select>
                    <p class="studio-help studio-perm-principal-help" id="studio-perm-principal-help" hidden>
                        Super staff: enter a principal in the field below and use Load — account list requires admin.
                    </p>
                    <label class="studio-field-label" for="studio-perm-principal-text">Principal (text)</label>
                    <div class="studio-perm-principal-manual">
                        <input type="text" id="studio-perm-principal-text" class="studio-input" placeholder="aaaaa-aa" autocomplete="off" />
                        <button type="button" class="studio-btn-ghost" id="studio-perm-principal-load">Load</button>
                    </div>
                </div>
                <div id="studio-perm-matrix-host"></div>
                <div class="studio-toolbar">
                    <button type="button" class="studio-btn-primary" id="studio-perm-save">Save</button>
                    <button type="button" class="studio-btn-ghost" id="studio-perm-register-keys" hidden>Register missing keys</button>
                    <button type="button" class="studio-btn-ghost" id="studio-perm-clear-override" hidden>Clear override</button>
                </div>
            </div>
            <div class="studio-perm-super-staff" id="studio-perm-super-staff" hidden>
                <h3>Super staff</h3>
                <p class="studio-help">Principals that may open this Permissions page (same as admins for navigation). Only canister admins may edit this list.</p>
                <ul class="studio-perm-super-list" id="studio-perm-super-list"></ul>
                <div class="studio-perm-super-add">
                    <input type="text" id="studio-perm-super-input" class="studio-input" placeholder="Principal to add" />
                    <button type="button" class="studio-btn-primary" id="studio-perm-super-add">Add</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * @param {HTMLElement} mainEl
 */
export async function initPermissions(mainEl) {
    const banner = mainEl.querySelector('#studio-permissions-banner');
    const rolePanel = mainEl.querySelector('#studio-perm-role-panel');
    const staffPanel = mainEl.querySelector('#studio-perm-staff-panel');
    const matrixHost = mainEl.querySelector('#studio-perm-matrix-host');
    const modeRoot = mainEl.querySelector('#studio-perm-mode');
    const principalRow = mainEl.querySelector('#studio-perm-principal-row');
    const principalSelect = mainEl.querySelector('#studio-perm-principal-select');
    const principalHelp = mainEl.querySelector('#studio-perm-principal-help');
    const principalText = /** @type {HTMLInputElement | null} */ (mainEl.querySelector('#studio-perm-principal-text'));
    const principalLoadBtn = mainEl.querySelector('#studio-perm-principal-load');
    const saveBtn = /** @type {HTMLButtonElement | null} */ (mainEl.querySelector('#studio-perm-save'));
    const registerKeysBtn = /** @type {HTMLButtonElement | null} */ (mainEl.querySelector('#studio-perm-register-keys'));
    const clearOverrideBtn = /** @type {HTMLButtonElement | null} */ (mainEl.querySelector('#studio-perm-clear-override'));
    const superBlock = mainEl.querySelector('#studio-perm-super-staff');
    const superList = mainEl.querySelector('#studio-perm-super-list');
    const superInput = /** @type {HTMLInputElement | null} */ (mainEl.querySelector('#studio-perm-super-input'));
    const superAddBtn = mainEl.querySelector('#studio-perm-super-add');

    const showBanner = (text, kind = 'info') => {
        if (!banner) return;
        if (!text) {
            banner.hidden = true;
            banner.textContent = '';
            return;
        }
        banner.hidden = false;
        banner.className = `studio-banner studio-banner--${kind}`;
        banner.textContent = text;
    };

    const shell = await refreshStudioShellAccessState();

    const canEditPage = shell.isAdmin || shell.isSuperStaff;
    if (!canEditPage) {
        showBanner('You do not have access to edit permissions.', 'warn');
        if (saveBtn) saveBtn.disabled = true;
        return;
    }

    let activeRoleTab = 'staff';
    let mode = /** @type {'role' | 'principal'} */ ('role');
    /** @type {Map<string, { visible: boolean, canEdit: boolean }>} */
    let working = new Map();
    /** @type {Set<string> | null} */
    let canisterFeatureKeys = null;
    /** @type {boolean} */
    let canisterPermissionKeysStale = false;

    const refreshCanisterFeatureKeys = async () => {
        try {
            const keys = await listStudioPermissionFeatureKeysStudio();
            if (!keys.length || isStaleCanisterPermissionKeyList(keys)) {
                canisterPermissionKeysStale = true;
                canisterFeatureKeys = null;
                return;
            }
            canisterPermissionKeysStale = false;
            canisterFeatureKeys = new Set(keys);
        } catch {
            canisterPermissionKeysStale = false;
            canisterFeatureKeys = null;
        }
    };

    const showUnsupportedKeysHint = () => {
        if (canisterPermissionKeysStale) {
            if (registerKeysBtn) registerKeysBtn.hidden = false;
            showBanner(
                'This backend is missing Finance / Schedule permission keys. Click “Register missing keys” to add them on the canister, or redeploy fusion-app-backend if that button is unavailable.',
                'warn',
            );
            return;
        }
        if (registerKeysBtn) registerKeysBtn.hidden = true;
        if (!canisterFeatureKeys?.size) return;
        const labels = STUDIO_PERMISSION_FEATURE_ROWS.filter((row) => !canisterFeatureKeys.has(row.id)).map(
            (row) => row.label,
        );
        if (!labels.length) return;
        if (registerKeysBtn) registerKeysBtn.hidden = false;
        showBanner(
            `This backend cannot store permissions for: ${labels.join(', ')}. Click “Register missing keys” or redeploy fusion-app-backend.`,
            'warn',
        );
    };

    const registerMissingPermissionKeys = async () => {
        if (registerKeysBtn) registerKeysBtn.disabled = true;
        try {
            const keys = await adminMergeDefaultStudioPermissionFeatureKeysStudio();
            await refreshCanisterFeatureKeys();
            showUnsupportedKeysHint();
            if (matrixHost) matrixHost.innerHTML = matrixTableHtml(working, canisterFeatureKeys);
            showBanner(
                keys.length
                    ? `Registered ${keys.length} permission keys on the canister. You can save Finance / Schedule rows now.`
                    : 'Permission keys updated on the canister.',
            );
        } catch (e) {
            showBanner(e instanceof Error ? e.message : String(e), 'warn');
        } finally {
            if (registerKeysBtn) registerKeysBtn.disabled = false;
        }
    };

    const setMode = (next) => {
        mode = next;
        modeRoot?.querySelectorAll('.studio-segment__btn').forEach((b) => {
            const m = b.getAttribute('data-mode');
            b.classList.toggle('is-active', m === mode);
        });
        if (principalRow) principalRow.hidden = mode !== 'principal';
        if (clearOverrideBtn) clearOverrideBtn.hidden = mode !== 'principal';
    };

    const loadMatrixIntoDom = (map) => {
        working = new Map(map);
        if (matrixHost) matrixHost.innerHTML = matrixTableHtml(working, canisterFeatureKeys);
        if (saveBtn) saveBtn.disabled = false;
    };

    const fetchDefaultsForRole = async (cat) => {
        const tuples = await adminGetStudioPermissionDefaultsStudio(cat);
        return mergeStudioPermissionMap(parseStudioPermissionMatrixTuples(tuples));
    };

    /**
     * Build save payload: patch stored canister values with DOM edits for keys this canister accepts.
     *
     * @param {Map<string, { visible: boolean, canEdit: boolean }>} stored
     * @param {Map<string, { visible: boolean, canEdit: boolean }>} domMap
     */
    const buildSaveTuplesFromStored = (stored, domMap) => {
        const outgoing = new Map(stored);
        for (const row of STUDIO_PERMISSION_FEATURE_ROWS) {
            if (canisterFeatureKeys && !canisterFeatureKeys.has(row.id)) continue;
            if (domMap.has(row.id)) outgoing.set(row.id, domMap.get(row.id));
        }
        return matrixToCandidTuples(outgoing, canisterFeatureKeys);
    };

    const buildSaveTuplesForRole = async (cat, domMap) => {
        const tuples = await adminGetStudioPermissionDefaultsStudio(cat);
        return buildSaveTuplesFromStored(parseStudioPermissionMatrixTuples(tuples), domMap);
    };

    const buildSaveTuplesForOverride = async (principalText, roleCat, domMap) => {
        const overrideTuples = await adminGetStudioPermissionOverrideStudio(principalText);
        const stored =
            overrideTuples && overrideTuples.length
                ? parseStudioPermissionMatrixTuples(overrideTuples)
                : parseStudioPermissionMatrixTuples(await adminGetStudioPermissionDefaultsStudio(roleCat));
        return buildSaveTuplesFromStored(stored, domMap);
    };

    const renderRoleTabPanel = () => {
        if (!rolePanel || !staffPanel) return;
        if (activeRoleTab !== 'staff' && activeRoleTab !== 'collaborator') {
            staffPanel.style.display = 'none';
            rolePanel.innerHTML =
                '<p class="studio-banner studio-banner--info">Coming soon — role defaults for this tab are reserved on the canister for a later release.</p>';
            return;
        }
        staffPanel.style.display = '';
        rolePanel.innerHTML = '';
    };

    const refreshSuperStaff = async () => {
        if (!shell.isAdmin || !superList) return;
        let list = [];
        try {
            list = await adminListSuperStaffStudio();
        } catch {
            list = [];
        }
        superList.innerHTML = list
            .map((p) => {
                const t = p && typeof p === 'object' && 'toText' in p && typeof p.toText === 'function' ? p.toText() : String(p);
                return `<li class="studio-perm-super-item"><code>${escapeHtml(t)}</code> <button type="button" class="studio-btn-ghost studio-perm-super-remove" data-principal="${escapeHtml(t)}">Remove</button></li>`;
            })
            .join('');
        superList.querySelectorAll('.studio-perm-super-remove').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const pr = btn.getAttribute('data-principal');
                if (!pr) return;
                try {
                    await adminRemoveSuperStaffStudio(pr);
                    showBanner('Removed super staff principal.');
                    await refreshSuperStaff();
                } catch (e) {
                    showBanner(e instanceof Error ? e.message : String(e), 'warn');
                }
            });
        });
    };

    if (superBlock) {
        superBlock.hidden = !shell.isAdmin;
        if (shell.isAdmin) void refreshSuperStaff();
    }

    superAddBtn?.addEventListener('click', async () => {
        const raw = String(superInput?.value || '').trim();
        if (!raw) return;
        try {
            Principal.fromText(raw);
        } catch {
            showBanner('Invalid principal text.', 'warn');
            return;
        }
        try {
            await adminAddSuperStaffStudio(raw);
            if (superInput) superInput.value = '';
            showBanner('Added super staff principal.');
            await refreshSuperStaff();
        } catch (e) {
            showBanner(e instanceof Error ? e.message : String(e), 'warn');
        }
    });

    /** @type {{ principal: string, role: string }[]>} */
    let accountRows = [];
    try {
        accountRows = shell.isAdmin ? await getAccountsForStudio() : [];
    } catch {
        accountRows = [];
    }
    if (principalSelect) {
        principalSelect.innerHTML = [
            '<option value="">— Select principal —</option>',
            ...accountRows.map((r) => {
                const label = `${r.principal.slice(0, 12)}… (${r.role || '?'})`;
                return `<option value="${escapeHtml(r.principal)}">${escapeHtml(label)}</option>`;
            }),
        ].join('');
    }
    if (principalHelp) principalHelp.hidden = shell.isAdmin;

    const loadRoleTabDefaults = async () => {
        if (activeRoleTab !== 'staff' && activeRoleTab !== 'collaborator') {
            return;
        }
        try {
            const m = await fetchDefaultsForRole(activeRoleTab);
            loadMatrixIntoDom(m);
            showBanner('');
        } catch (e) {
            showBanner(e instanceof Error ? e.message : String(e), 'warn');
        }
    };

    const loadOverrideForPrincipal = async (principalText) => {
        const p = String(principalText || '').trim();
        if (!p) return;
        try {
            const tuples = await adminGetStudioPermissionOverrideStudio(p);
            if (!tuples || !Array.isArray(tuples) || tuples.length === 0) {
                const base = await fetchDefaultsForRole(
                    activeRoleTab === 'staff' || activeRoleTab === 'collaborator' ? activeRoleTab : 'staff',
                );
                loadMatrixIntoDom(base);
                showBanner('No override — showing role default for the selected tab. Save to create an override.');
            } else {
                const m = parseStudioPermissionMatrixTuples(tuples);
                const roleBase = await fetchDefaultsForRole(
                    activeRoleTab === 'staff' || activeRoleTab === 'collaborator' ? activeRoleTab : 'staff',
                );
                loadMatrixIntoDom(mergeStudioPermissionMap(m, roleBase));
                showBanner('');
            }
        } catch (e) {
            showBanner(e instanceof Error ? e.message : String(e), 'warn');
        }
    };

    mainEl.querySelectorAll('.studio-perm-role-tab').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const tab = btn.getAttribute('data-role-tab');
            if (!tab) return;
            activeRoleTab = tab;
            mainEl.querySelectorAll('.studio-perm-role-tab').forEach((b) => {
                b.classList.toggle('is-active', b.getAttribute('data-role-tab') === tab);
            });
            renderRoleTabPanel();
            if (tab === 'staff' || tab === 'collaborator') {
                setMode('role');
                await loadRoleTabDefaults();
            }
        });
    });

    modeRoot?.querySelectorAll('.studio-segment__btn').forEach((b) => {
        b.addEventListener('click', () => {
            const m = b.getAttribute('data-mode');
            if (m !== 'role' && m !== 'principal') return;
            setMode(m);
            if (m === 'role') void loadRoleTabDefaults();
            else if (principalSelect?.value) void loadOverrideForPrincipal(principalSelect.value);
        });
    });

    principalSelect?.addEventListener('change', () => {
        if (mode === 'principal' && principalSelect.value) void loadOverrideForPrincipal(principalSelect.value);
    });

    principalLoadBtn?.addEventListener('click', () => {
        const t = principalText?.value.trim();
        if (t) void loadOverrideForPrincipal(t);
    });

    registerKeysBtn?.addEventListener('click', () => {
        void registerMissingPermissionKeys();
    });

    clearOverrideBtn?.addEventListener('click', async () => {
        const p =
            mode === 'principal'
                ? principalSelect?.value || principalText?.value.trim() || ''
                : '';
        if (!p) {
            showBanner('Select or enter a principal first.', 'warn');
            return;
        }
        try {
            await adminClearStudioPermissionOverrideStudio(p);
            showBanner('Override cleared.');
            await loadOverrideForPrincipal(p);
            window.dispatchEvent(new Event('fusion-studio-shell-refresh'));
        } catch (e) {
            showBanner(e instanceof Error ? e.message : String(e), 'warn');
        }
    });

    saveBtn?.addEventListener('click', async () => {
        if (!matrixHost) return;
        const domMap = readMatrixFromDom(matrixHost);
        try {
            if (activeRoleTab !== 'staff' && activeRoleTab !== 'collaborator') {
                showBanner('Only Staff and Collaborator role defaults are editable in this build.', 'warn');
                return;
            }
            let result;
            const intended = new Map(domMap);
            if (mode === 'role') {
                const tuples = await buildSaveTuplesForRole(activeRoleTab, domMap);
                result = await savePermissionMatrixWithFallback(
                    (rows) => adminSetStudioPermissionDefaultsStudio(activeRoleTab, rows),
                    tuples,
                );
            } else {
                const p = principalSelect?.value || principalText?.value.trim() || '';
                if (!p) {
                    showBanner('Select or enter a principal for override save.', 'warn');
                    return;
                }
                Principal.fromText(p);
                const roleCat =
                    activeRoleTab === 'staff' || activeRoleTab === 'collaborator' ? activeRoleTab : 'staff';
                const tuples = await buildSaveTuplesForOverride(p, roleCat, domMap);
                result = await savePermissionMatrixWithFallback(
                    (rows) => adminSetStudioPermissionOverrideStudio(p, rows),
                    tuples,
                );
            }
            const reloaded =
                mode === 'role'
                    ? await fetchDefaultsForRole(activeRoleTab)
                    : mergeStudioPermissionMap(
                          parseStudioPermissionMatrixTuples(
                              await adminGetStudioPermissionOverrideStudio(
                                  principalSelect?.value || principalText?.value.trim() || '',
                              ),
                          ),
                          await fetchDefaultsForRole(
                              activeRoleTab === 'staff' || activeRoleTab === 'collaborator'
                                  ? activeRoleTab
                                  : 'staff',
                          ),
                      );
            loadMatrixIntoDom(reloaded);
            const persisted = studioPermissionMapsEqual(intended, reloaded);
            if (result.skipped.length) {
                showBanner(
                    `Saved supported permissions. Skipped until backend upgrade: ${result.skipped.join(', ')}. Run dfx deploy fusion-app-backend --network ic`,
                    'info',
                );
            } else if (!persisted) {
                showBanner(
                    'Saved, but reloaded values differ — redeploy fusion-app-backend if Finance / Schedule rows were edited.',
                    'warn',
                );
            } else {
                showBanner(mode === 'role' ? 'Role defaults saved.' : 'Override saved for principal.');
            }
            const next = await refreshStudioShellAccessState();
            setStudioShellGate(next);
            window.dispatchEvent(new Event('fusion-studio-shell-refresh'));
        } catch (e) {
            showBanner(e instanceof Error ? e.message : String(e), 'warn');
        }
    });

    renderRoleTabPanel();
    mainEl.querySelector('.studio-perm-role-tab[data-role-tab="staff"]')?.classList.add('is-active');
    await refreshCanisterFeatureKeys();
    showUnsupportedKeysHint();
    await loadRoleTabDefaults();

    if (!shell.isAdmin && saveBtn) {
        // Super staff may edit matrices per assertAdminOrSuperStaffConfigure on canister.
    }
}
