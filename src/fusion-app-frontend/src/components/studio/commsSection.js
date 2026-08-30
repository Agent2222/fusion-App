/**
 * Studio Comms — LINE Official Account + group invite setup, QR upload, email invites.
 */
import '../../styles/studioComms.css';
import { studioFeatureAccess } from '../../utils/studioShellState.js';
import { studioPageHeaderHtml, studioFilterBarHtml } from '../../utils/studioCategoryLayout.js';
import { escapeHtml } from '../../utils/textPreview.js';
import {
    getApplicants,
    getDataSource,
    getProgramDisplayNameFromRow,
    getPrograms,
    staffGetProgramCommsConfig,
    staffRecordProgramCommsInvites,
    staffUpsertProgramCommsConfig,
} from '../../utils/database.js';
import { getApplicantSlotSecuredStudio } from '../../utils/database.js';
import { getApplicantManualDepositSubmitted } from '../../utils/studioPlainForms.js';
import { firstNonEmptyString } from '../../utils/localeFallback.js';
import { uploadBlobToS3 } from '../../utils/studioS3Upload.js';
import { prepareImageFileForUpload } from '../../utils/imageUploadPrep.js';
import { sendEmail, sendEmailBatch } from '../../utils/integrationApi.js';
import { buildStudioEmailCcList } from '../../utils/studioEmailCc.js';
import {
    addFriendUrlFromBasicId,
    applicantPublicEmail,
    collectProgramCommsInviteMessages,
    confirmedApplicantsForComms,
    emptyProgramCommsConfig,
    formatCommsInviteSentAt,
    inviteSentAtMap,
    isProgramCommsInviteReady,
    isProgramCommsMemberReady,
    LINE_GETTING_STARTED_URL,
    normalizeProgramCommsConfig,
    resolveInviteMessage,
    resolveProviderThumbUrl,
    qrPngFileFromUrl,
    renderProgramCommsInviteHtml,
    buildProgramCommsInviteSubject,
} from '../../utils/programCommsInvite.js';
import { sortApplicantProgramRows } from './applicantsProgramCards.js';
import {
    buildCommsProgramCardModel,
    commsProgramCardsRailHtml,
    COMMS_PROGRAM_SELECT_STORAGE_KEY,
} from './commsProgramCards.js';

export function renderComms() {
    return `
    <div class="studio-section-stack studio-category-page studio-comms-page">
        ${studioPageHeaderHtml({ title: 'Comms', subtitle: 'LINE Official Account and group invites for confirmed applicants.', countId: 'studio-comms-header-count', countLabel: 'Invites sent' })}
        <div class="studio-comms-program-cards-rail" id="studio-comms-program-cards" role="list" aria-label="Program comms cards"></div>
        <div id="studio-comms-setup-host"></div>
        <div class="studio-comms-invites" id="studio-comms-invites-host"></div>
        ${studioFilterBarHtml({ searchId: 'studio-comms-search', searchPlaceholder: 'Search by name or email…' })}
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Last invite</th>
                    <th>Send</th>
                </tr>
            </thead>
            <tbody id="studio-comms-tbody"></tbody>
        </table>
        <p class="studio-muted" id="studio-comms-empty-msg" hidden>Select a program above to set up LINE and send invites.</p>
    </div>`;
}

export async function initComms(mainEl) {
    const perm = studioFeatureAccess('comms');
    if (!perm || !perm.visible) {
        const el = mainEl.querySelector('.studio-comms-page');
        if (el) el.innerHTML = '<p class="studio-muted" style="padding:1.5rem">Comms section is not available for your role.</p>';
        return;
    }
    const canEdit = Boolean(perm.canEdit);

    let allPrograms = [];
    let allApplicants = [];
    /** @type {Map<string, ReturnType<typeof emptyProgramCommsConfig>>} */
    const configByProgram = new Map();
    let selectedProgramId = restoreSelectedProgramId();
    let searchTerm = '';
    let saveBusy = false;
    let sendBusy = false;

    const cardsRail = mainEl.querySelector('#studio-comms-program-cards');
    const setupHost = mainEl.querySelector('#studio-comms-setup-host');
    const invitesHost = mainEl.querySelector('#studio-comms-invites-host');
    const tbody = mainEl.querySelector('#studio-comms-tbody');
    const countEl = mainEl.querySelector('#studio-comms-header-count');
    const emptyMsg = mainEl.querySelector('#studio-comms-empty-msg');
    const searchInput = mainEl.querySelector('#studio-comms-search');

    function currentProgram() {
        return allPrograms.find((p) => String(p.id || '') === selectedProgramId) || null;
    }

    function currentConfig() {
        if (!selectedProgramId) return emptyProgramCommsConfig('');
        return configByProgram.get(selectedProgramId) || emptyProgramCommsConfig(selectedProgramId);
    }

    function confirmedForProgram(programId) {
        return confirmedApplicantsForComms(allApplicants, programId);
    }

    function programHero(programRow) {
        return firstNonEmptyString(programRow?.jaCard?.imageSrc, programRow?.enCard?.imageSrc);
    }

    async function reload() {
        const [applicants, programs] = await Promise.all([
            getApplicants().catch(() => []),
            getPrograms().catch(() => []),
        ]);
        allPrograms = Array.isArray(programs) ? programs : [];
        const rawApplicants = Array.isArray(applicants) ? applicants : [];
        allApplicants = await Promise.all(
            rawApplicants.map(async (row) => ({
                ...row,
                slotSecured:
                    (await getApplicantSlotSecuredStudio(row.id, row.programId, row.payloadJson).catch(() => false)) ||
                    getApplicantManualDepositSubmitted(row.payloadJson),
            })),
        );
        await Promise.all(
            allPrograms.map(async (pr) => {
                const pid = String(pr.id || '');
                if (!pid) return;
                const rec = await staffGetProgramCommsConfig(pid).catch(() => null);
                configByProgram.set(pid, rec ? normalizeProgramCommsConfig(rec, pid) : emptyProgramCommsConfig(pid));
            }),
        );
        paintProgramCards();
        renderSetup();
        renderInvitesBar();
        renderTable();
    }

    function paintProgramCards() {
        if (!cardsRail) return;
        const cardModels = allPrograms.sort(sortApplicantProgramRows).map((pr) => {
            const pid = String(pr.id || '');
            const cfg = configByProgram.get(pid);
            return buildCommsProgramCardModel(pr, {
                confirmedApplicants: confirmedForProgram(pid),
                sentApplicantIds: inviteSentAtMap(cfg).keys(),
                commsConfig: cfg,
            });
        });
        cardsRail.innerHTML = commsProgramCardsRailHtml(cardModels, selectedProgramId);
        let totalSent = 0;
        for (const m of cardModels) totalSent += m.invitesSent;
        if (countEl) countEl.textContent = String(totalSent);
    }

    function renderSetup() {
        if (!setupHost) return;
        if (!selectedProgramId) {
            setupHost.innerHTML = '';
            return;
        }
        const cfg = currentConfig();
        const addFriendUrl = cfg.addFriendUrl || addFriendUrlFromBasicId(cfg.basicId);
        const readonly = canEdit ? '' : 'disabled';
        const memberReady = isProgramCommsMemberReady(cfg);
        const thumbUrl = resolveProviderThumbUrl(cfg);
        const hasCustomThumb = Boolean(cfg.providerThumbUrl);
        setupHost.innerHTML = `
        <div class="studio-comms-setup">
            <h3 class="studio-comms-setup__heading">LINE setup</h3>
            <p class="studio-comms-setup__help">
                Create a LINE Official Account, enable Messaging API, then copy the Basic ID and channel IDs from the
                Developers Console. Staff create the program group in the LINE app and paste the shareable invite URL.
                LINE cannot create group rooms via API.
                <a href="${escapeHtml(LINE_GETTING_STARTED_URL)}" target="_blank" rel="noopener noreferrer">LINE getting started</a>
            </p>
            <div class="studio-comms-setup__publish">
                <label class="studio-field studio-field--inline-check">
                    <input type="checkbox" class="studio-checkbox" id="studio-comms-member-active" ${cfg.memberActive ? 'checked' : ''} ${canEdit && memberReady ? '' : 'disabled'} />
                    <span>Show in member Settings → Communications</span>
                </label>
                <p class="studio-comms-setup__note">${memberReady ? 'Confirmed applicants see the group QR when this is on.' : 'Save the group invite URL (and QR) before activating the member tab.'}</p>
            </div>
            <div class="studio-comms-setup__thumb">
                <div class="studio-comms-setup__thumb-preview">
                    <img src="${escapeHtml(thumbUrl)}" alt="LINE" />
                </div>
                <div>
                    <p class="studio-comms-setup__thumb-label">Provider thumbnail</p>
                    <p class="studio-comms-setup__note">Official LINE brand icon by default. Upload a replacement or clear to restore it.</p>
                    ${
                        canEdit
                            ? `<div class="studio-comms-setup__thumb-actions">
                        <input type="file" class="studio-sr-only" accept="image/*" id="studio-comms-thumb-file" />
                        <button type="button" class="studio-btn-ghost" id="studio-comms-thumb-upload">Upload</button>
                        ${hasCustomThumb ? '<button type="button" class="studio-btn-ghost" id="studio-comms-thumb-clear">Use LINE default</button>' : ''}
                    </div>`
                            : ''
                    }
                </div>
            </div>
            <div class="studio-comms-setup__grid">
                <label class="studio-field"><span>Provider</span>
                    <select class="studio-input" id="studio-comms-provider" ${readonly}>
                        <option value="line" selected>LINE</option>
                        <option value="whatsapp" disabled>WhatsApp (coming later)</option>
                        <option value="slack" disabled>Slack (coming later)</option>
                    </select>
                </label>
                <label class="studio-field"><span>Official Account name</span>
                    <input type="text" class="studio-input" id="studio-comms-oa-name" value="${escapeHtml(cfg.oaName)}" placeholder="Fusion" ${readonly} />
                </label>
                <label class="studio-field"><span>Basic ID</span>
                    <input type="text" class="studio-input" id="studio-comms-basic-id" value="${escapeHtml(cfg.basicId)}" placeholder="@fusion" ${readonly} />
                </label>
                <label class="studio-field"><span>Add-friend URL</span>
                    <input type="url" class="studio-input" id="studio-comms-add-friend-url" value="${escapeHtml(addFriendUrl)}" readonly />
                </label>
                <label class="studio-field"><span>Channel ID</span>
                    <input type="text" class="studio-input" id="studio-comms-channel-id" value="${escapeHtml(cfg.channelId)}" placeholder="Public channel ID" ${readonly} />
                </label>
                <label class="studio-field"><span>Group name</span>
                    <input type="text" class="studio-input" id="studio-comms-group-name" value="${escapeHtml(cfg.groupName)}" placeholder="Kaga Fall 2026" ${readonly} />
                </label>
                <label class="studio-field studio-field--wide"><span>Group invite URL</span>
                    <input type="url" class="studio-input" id="studio-comms-group-url" value="${escapeHtml(cfg.groupInviteUrl)}" placeholder="https://line.me/R/ti/g/…" ${readonly} />
                </label>
                <label class="studio-field studio-field--wide"><span>Invitation text (optional)</span>
                    <textarea class="studio-input" id="studio-comms-invite-message" rows="3" placeholder="${escapeHtml(resolveInviteMessage({}))}" ${readonly}>${escapeHtml(cfg.inviteMessage)}</textarea>
                    <p class="studio-comms-setup__note">Leave empty to use Fusion default copy on the member Communications card.</p>
                </label>
                <label class="studio-field"><span>Channel secret</span>
                    <input type="password" class="studio-input" id="studio-comms-channel-secret" autocomplete="off" placeholder="Not saved" ${readonly} />
                    <p class="studio-comms-setup__note">Keep this in LINE Developers Console until the bot cut. Fusion does not store secrets.</p>
                </label>
                <label class="studio-field"><span>Channel access token</span>
                    <input type="password" class="studio-input" id="studio-comms-channel-token" autocomplete="off" placeholder="Not saved" ${readonly} />
                    <p class="studio-comms-setup__note">Paste only when we add webhook / push. Not persisted this cut.</p>
                </label>
            </div>
            <div class="studio-comms-setup__qrs">
                ${
                    cfg.addFriendQrUrl
                        ? `<div class="studio-comms-setup__qr"><img src="${escapeHtml(cfg.addFriendQrUrl)}" alt="Add-friend QR" /><span>Add friend</span></div>`
                        : ''
                }
                ${
                    cfg.groupQrUrl
                        ? `<div class="studio-comms-setup__qr"><img src="${escapeHtml(cfg.groupQrUrl)}" alt="Group invite QR" /><span>Group join</span></div>`
                        : ''
                }
            </div>
            ${
                canEdit
                    ? `<div class="studio-comms-setup__actions">
                    <button type="button" class="studio-btn-primary" id="studio-comms-save">Save LINE setup</button>
                    <span class="studio-muted" id="studio-comms-save-status"></span>
                </div>`
                    : ''
            }
        </div>`;
    }

    function renderInvitesBar() {
        if (!invitesHost) return;
        if (!selectedProgramId) {
            invitesHost.innerHTML = '';
            return;
        }
        const cfg = currentConfig();
        const confirmed = confirmedForProgram(selectedProgramId);
        const withEmail = confirmed.filter((row) => applicantPublicEmail(row)).length;
        const ready = isProgramCommsInviteReady(cfg);
        const live = getDataSource() === 'live';
        const sendDisabled = !canEdit || !ready || !live || !withEmail;
        let hint = '';
        if (!live) hint = 'Switch to live data source to send email.';
        else if (!ready) hint = 'Save LINE setup with both QRs before sending.';
        else if (!withEmail) hint = 'No confirmed applicants with a public email.';
        invitesHost.innerHTML = `
        <div class="studio-comms-invites__head">
            <h3 class="studio-comms-invites__heading">Invites</h3>
            <div class="studio-comms-invites__actions">
                <button type="button" class="studio-btn-primary" id="studio-comms-send-all" ${sendDisabled ? 'disabled' : ''}>
                    Send to all confirmed (${withEmail})
                </button>
            </div>
        </div>
        <p class="studio-comms-status${hint ? ' studio-comms-status--warn' : ''}" id="studio-comms-send-status">${escapeHtml(hint)}</p>`;
    }

    function renderTable() {
        if (!tbody) return;
        if (!selectedProgramId) {
            tbody.innerHTML = '';
            if (emptyMsg) {
                emptyMsg.hidden = false;
                emptyMsg.textContent = 'Select a program above to set up LINE and send invites.';
            }
            return;
        }
        if (emptyMsg) emptyMsg.hidden = true;
        const confirmed = confirmedForProgram(selectedProgramId);
        const sentMap = inviteSentAtMap(currentConfig());
        const term = searchTerm.toLowerCase();
        const filtered = confirmed.filter((r) => {
            if (!term) return true;
            const name = String(r.fullName || '').toLowerCase();
            const email = String(r.email || '').toLowerCase();
            return name.includes(term) || email.includes(term);
        });
        if (!filtered.length) {
            tbody.innerHTML = `<tr><td colspan="4" class="studio-comms-no-data">No confirmed applicants for this program.</td></tr>`;
            return;
        }
        const live = getDataSource() === 'live';
        const ready = isProgramCommsInviteReady(currentConfig());
        tbody.innerHTML = filtered
            .map((r) => {
                const email = applicantPublicEmail(r);
                const sent = formatCommsInviteSentAt(sentMap.get(String(r.id || '')) || '');
                const canSend = canEdit && live && ready && Boolean(email);
                const sendCell = email
                    ? `<button type="button" class="studio-btn-ghost" data-comms-send-one="${escapeHtml(r.id)}" ${canSend ? '' : 'disabled'}>Send</button>`
                    : '<span class="studio-comms-no-data">No email</span>';
                return `<tr data-applicant-id="${escapeHtml(r.id)}">
                    <td>${escapeHtml(r.fullName || '')}</td>
                    <td>${email ? escapeHtml(email) : '<span class="studio-comms-no-data">—</span>'}</td>
                    <td>${sent ? escapeHtml(sent) : '<span class="studio-comms-no-data">—</span>'}</td>
                    <td>${sendCell}</td>
                </tr>`;
            })
            .join('');
    }

    function readSetupFromDom() {
        const prior = currentConfig();
        const basicId = String(mainEl.querySelector('#studio-comms-basic-id')?.value || '').trim();
        return normalizeProgramCommsConfig(
            {
                ...prior,
                programId: selectedProgramId || '',
                provider: 'line',
                oaName: String(mainEl.querySelector('#studio-comms-oa-name')?.value || '').trim(),
                basicId,
                channelId: String(mainEl.querySelector('#studio-comms-channel-id')?.value || '').trim(),
                addFriendUrl: addFriendUrlFromBasicId(basicId),
                groupName: String(mainEl.querySelector('#studio-comms-group-name')?.value || '').trim(),
                groupInviteUrl: String(mainEl.querySelector('#studio-comms-group-url')?.value || '').trim(),
                inviteMessage: String(mainEl.querySelector('#studio-comms-invite-message')?.value || '').trim(),
                memberActive: Boolean(mainEl.querySelector('#studio-comms-member-active')?.checked),
                providerThumbUrl: prior.providerThumbUrl,
                inviteSentAtByApplicant: [],
            },
            selectedProgramId,
        );
    }

    function setSaveStatus(text, kind = '') {
        const el = mainEl.querySelector('#studio-comms-save-status');
        if (!el) return;
        el.textContent = text;
        el.className = `studio-muted${kind ? ` studio-comms-status--${kind}` : ''}`;
    }

    function setSendStatus(text, kind = '') {
        const el = mainEl.querySelector('#studio-comms-send-status');
        if (!el) return;
        el.textContent = text;
        el.className = `studio-comms-status${kind ? ` studio-comms-status--${kind}` : ''}`;
    }

    async function persistCurrentConfig(patch = {}) {
        if (!selectedProgramId) return;
        const draft = readSetupFromDom();
        const rec = { ...draft, ...patch, inviteSentAtByApplicant: [] };
        rec.memberActive = rec.memberActive && isProgramCommsMemberReady(rec);
        await staffUpsertProgramCommsConfig(rec);
        const saved = await staffGetProgramCommsConfig(selectedProgramId);
        configByProgram.set(
            selectedProgramId,
            saved ? normalizeProgramCommsConfig(saved, selectedProgramId) : normalizeProgramCommsConfig(rec, selectedProgramId),
        );
        paintProgramCards();
        renderSetup();
        renderInvitesBar();
        renderTable();
    }

    async function uploadProviderThumb(file) {
        if (!file || !selectedProgramId) return;
        const prepared = await prepareImageFileForUpload(file);
        const provider = currentConfig().provider || 'line';
        const url = await uploadBlobToS3(prepared.file || file, null, {
            area: 'studio/programs',
            entityType: 'comms',
            entityId: selectedProgramId,
            fieldKey: `${provider}-provider-thumb`,
        });
        await persistCurrentConfig({ providerThumbUrl: url });
    }

    async function uploadCommsQr(file, fieldKey) {
        const prepared = await prepareImageFileForUpload(file);
        return uploadBlobToS3(prepared.file || file, null, {
            area: 'studio/programs',
            entityType: 'comms',
            entityId: selectedProgramId,
            fieldKey,
        });
    }

    async function saveSetup() {
        if (!canEdit || !selectedProgramId || saveBusy) return;
        const draft = readSetupFromDom();
        if (!draft.basicId) {
            setSaveStatus('Basic ID is required.', 'err');
            return;
        }
        if (!draft.groupInviteUrl) {
            setSaveStatus('Group invite URL is required.', 'err');
            return;
        }
        saveBusy = true;
        setSaveStatus('Generating QRs…');
        try {
            const [friendFile, groupFile] = await Promise.all([
                qrPngFileFromUrl(draft.addFriendUrl, 'line-friend-qr.png'),
                qrPngFileFromUrl(draft.groupInviteUrl, 'line-group-qr.png'),
            ]);
            setSaveStatus('Uploading QRs…');
            const [addFriendQrUrl, groupQrUrl] = await Promise.all([
                uploadCommsQr(friendFile, 'line-friend-qr'),
                uploadCommsQr(groupFile, 'line-group-qr'),
            ]);
            setSaveStatus('Saving…');
            const rec = {
                ...draft,
                addFriendQrUrl,
                groupQrUrl,
                memberActive: draft.memberActive && isProgramCommsMemberReady({ ...draft, addFriendQrUrl, groupQrUrl }),
                inviteSentAtByApplicant: [],
            };
            await staffUpsertProgramCommsConfig(rec);
            const saved = await staffGetProgramCommsConfig(selectedProgramId);
            configByProgram.set(
                selectedProgramId,
                saved ? normalizeProgramCommsConfig(saved, selectedProgramId) : normalizeProgramCommsConfig(rec, selectedProgramId),
            );
            setSaveStatus('Saved.', 'ok');
            paintProgramCards();
            renderSetup();
            renderInvitesBar();
            renderTable();
        } catch (err) {
            const raw = err instanceof Error ? err.message : String(err);
            const msg = /failed to fetch/i.test(raw)
                ? 'Could not reach the backend. Confirm live mode, then retry after the canister deploy finishes.'
                : raw;
            setSaveStatus(msg, 'err');
        } finally {
            saveBusy = false;
        }
    }

    function assertLiveSend() {
        if (getDataSource() !== 'live') {
            throw new Error('Switch to live data source to send email.');
        }
    }

    function inviteHtmlFor(row, cfg) {
        const program = currentProgram();
        return renderProgramCommsInviteHtml({
            programName: getProgramDisplayNameFromRow(program),
            heroImageUrl: programHero(program),
            addFriendUrl: cfg.addFriendUrl,
            groupInviteUrl: cfg.groupInviteUrl,
            addFriendQrUrl: cfg.addFriendQrUrl,
            groupQrUrl: cfg.groupQrUrl,
            applicantName: String(row.fullName || '').trim(),
            groupName: cfg.groupName,
            oaName: cfg.oaName,
        });
    }

    async function sendOne(applicantId) {
        if (!canEdit || sendBusy || !selectedProgramId) return;
        const cfg = currentConfig();
        if (!isProgramCommsInviteReady(cfg)) {
            setSendStatus('Save LINE setup with both QRs before sending.', 'warn');
            return;
        }
        const row = confirmedForProgram(selectedProgramId).find((r) => String(r.id) === String(applicantId));
        const email = applicantPublicEmail(row);
        if (!row || !email) {
            setSendStatus('That applicant has no public email.', 'warn');
            return;
        }
        sendBusy = true;
        setSendStatus(`Sending to ${email}…`);
        try {
            assertLiveSend();
            const program = currentProgram();
            await sendEmail({
                to: email,
                subject: buildProgramCommsInviteSubject(getProgramDisplayNameFromRow(program)),
                html: inviteHtmlFor(row, cfg),
                cc: buildStudioEmailCcList(''),
            });
            await staffRecordProgramCommsInvites(selectedProgramId, [String(row.id)]);
            const saved = await staffGetProgramCommsConfig(selectedProgramId);
            if (saved) configByProgram.set(selectedProgramId, normalizeProgramCommsConfig(saved, selectedProgramId));
            setSendStatus(`Sent to ${email}.`, 'ok');
            paintProgramCards();
            renderTable();
        } catch (err) {
            setSendStatus(err instanceof Error ? err.message : String(err), 'err');
        } finally {
            sendBusy = false;
        }
    }

    async function sendAll() {
        if (!canEdit || sendBusy || !selectedProgramId) return;
        const cfg = currentConfig();
        if (!isProgramCommsInviteReady(cfg)) {
            setSendStatus('Save LINE setup with both QRs before sending.', 'warn');
            return;
        }
        sendBusy = true;
        setSendStatus('Sending batch…');
        try {
            assertLiveSend();
            const program = currentProgram();
            const { messages, skipped } = collectProgramCommsInviteMessages({
                applicants: confirmedForProgram(selectedProgramId),
                cfg,
                programName: getProgramDisplayNameFromRow(program),
                heroImageUrl: programHero(program),
            });
            if (!messages.length) {
                setSendStatus(
                    skipped.length
                        ? `Skipped ${skipped.length} without a public email.`
                        : 'No confirmed applicants with email.',
                    'warn',
                );
                return;
            }
            const batch = await sendEmailBatch(
                messages.map(({ to, subject, html }) => ({ to, subject, html })),
                { cc: buildStudioEmailCcList('') },
            );
            const results = Array.isArray(batch?.results) ? batch.results : [];
            const sentIds = [];
            const failed = [];
            for (let i = 0; i < messages.length; i++) {
                const res = results[i];
                const ok =
                    res == null
                        ? Number(batch?.failCount || 0) === 0
                        : res.ok !== false && !res.error;
                if (!ok) {
                    failed.push(messages[i].to);
                    continue;
                }
                sentIds.push(messages[i].applicantId);
            }
            if (sentIds.length) {
                await staffRecordProgramCommsInvites(selectedProgramId, sentIds);
                const saved = await staffGetProgramCommsConfig(selectedProgramId);
                if (saved) configByProgram.set(selectedProgramId, normalizeProgramCommsConfig(saved, selectedProgramId));
            }
            const parts = [`Sent ${sentIds.length} of ${messages.length}.`];
            if (skipped.length) parts.push(`Skipped ${skipped.length} without email.`);
            if (failed.length) parts.push(`Failed: ${failed.join(', ')}.`);
            setSendStatus(parts.join(' '), failed.length ? 'err' : 'ok');
            paintProgramCards();
            renderTable();
        } catch (err) {
            setSendStatus(err instanceof Error ? err.message : String(err), 'err');
        } finally {
            sendBusy = false;
        }
    }

    cardsRail?.addEventListener('click', (e) => {
        const btn = e.target instanceof Element ? e.target.closest('[data-comms-program-select]') : null;
        if (!btn || !cardsRail.contains(btn)) return;
        const id = btn.getAttribute('data-comms-program-select');
        if (selectedProgramId === id) {
            selectedProgramId = null;
            saveSelectedProgramId(null);
        } else {
            selectedProgramId = id;
            saveSelectedProgramId(id);
        }
        paintProgramCards();
        renderSetup();
        renderInvitesBar();
        renderTable();
    });

    setupHost?.addEventListener('input', (e) => {
        const t = e.target instanceof HTMLInputElement ? e.target : null;
        if (!t || t.id !== 'studio-comms-basic-id') return;
        const derived = mainEl.querySelector('#studio-comms-add-friend-url');
        if (derived instanceof HTMLInputElement) {
            derived.value = addFriendUrlFromBasicId(t.value);
        }
    });

    setupHost?.addEventListener('click', async (e) => {
        const t = e.target instanceof Element ? e.target : null;
        if (!t) return;
        if (t.id === 'studio-comms-save') {
            await saveSetup();
            return;
        }
        if (t.id === 'studio-comms-thumb-upload') {
            const input = mainEl.querySelector('#studio-comms-thumb-file');
            if (input instanceof HTMLInputElement) input.click();
            return;
        }
        if (t.id === 'studio-comms-thumb-clear') {
            try {
                await persistCurrentConfig({ providerThumbUrl: '' });
                setSaveStatus('Using LINE default thumbnail.', 'ok');
            } catch (err) {
                setSaveStatus(err instanceof Error ? err.message : String(err), 'err');
            }
        }
    });

    setupHost?.addEventListener('change', async (e) => {
        const t = e.target instanceof HTMLInputElement ? e.target : null;
        if (!t) return;
        if (t.id === 'studio-comms-member-active') {
            try {
                await persistCurrentConfig({ memberActive: t.checked });
                setSaveStatus(t.checked ? 'Member tab on.' : 'Member tab off.', 'ok');
            } catch (err) {
                setSaveStatus(err instanceof Error ? err.message : String(err), 'err');
            }
            return;
        }
        if (t.id !== 'studio-comms-thumb-file') return;
        const file = t.files?.[0];
        t.value = '';
        if (!file) return;
        try {
            setSaveStatus('Uploading thumbnail…');
            await uploadProviderThumb(file);
            setSaveStatus('Thumbnail saved.', 'ok');
        } catch (err) {
            setSaveStatus(err instanceof Error ? err.message : String(err), 'err');
        }
    });

    invitesHost?.addEventListener('click', async (e) => {
        const t = e.target instanceof Element ? e.target : null;
        if (!t) return;
        if (t.id === 'studio-comms-send-all') {
            await sendAll();
        }
    });

    tbody?.addEventListener('click', async (e) => {
        const t = e.target instanceof Element ? e.target : null;
        const btn = t?.closest('[data-comms-send-one]');
        if (!btn) return;
        await sendOne(btn.getAttribute('data-comms-send-one'));
    });

    searchInput?.addEventListener('input', () => {
        searchTerm = searchInput.value || '';
        renderTable();
    });

    function restoreSelectedProgramId() {
        try {
            return sessionStorage.getItem(COMMS_PROGRAM_SELECT_STORAGE_KEY) || null;
        } catch {
            return null;
        }
    }

    function saveSelectedProgramId(id) {
        try {
            if (id) sessionStorage.setItem(COMMS_PROGRAM_SELECT_STORAGE_KEY, id);
            else sessionStorage.removeItem(COMMS_PROGRAM_SELECT_STORAGE_KEY);
        } catch {
            /* noop */
        }
    }

    await reload();
}
