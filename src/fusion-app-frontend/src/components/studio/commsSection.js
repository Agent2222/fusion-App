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
    listTravelPrepLinks,
    staffGetProgramCommsConfig,
    staffGetProgramCommsLineBinding,
    staffListSeenLineGroups,
    staffRecordProgramCommsInvites,
    staffSetProgramCommsLineRoom,
    staffUpsertProgramCommsConfig,
} from '../../utils/database.js';
import { getApplicantSlotSecuredStudio } from '../../utils/database.js';
import { getApplicantManualDepositSubmitted } from '../../utils/studioPlainForms.js';
import { firstNonEmptyString } from '../../utils/localeFallback.js';
import { uploadBlobToS3 } from '../../utils/studioS3Upload.js';
import { prepareImageFileForUpload } from '../../utils/imageUploadPrep.js';
import { sendEmail, sendEmailBatch, sendLineGroupMessage } from '../../utils/integrationApi.js';
import { buildStudioEmailCcList } from '../../utils/studioEmailCc.js';
import {
    applicantPublicEmail,
    collectProgramCommsInviteMessages,
    confirmedApplicantsForComms,
    emptyProgramCommsConfig,
    formatCommsInviteSentAt,
    inviteSentAtMap,
    isProgramCommsInviteReady,
    isProgramCommsMemberReady,
    LINE_ANDROID_STORE_URL,
    LINE_GETTING_STARTED_URL,
    LINE_IOS_STORE_URL,
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
        ${studioPageHeaderHtml({ title: 'Comms', subtitle: 'LINE app downloads and two official chat rooms for confirmed applicants.', countId: 'studio-comms-header-count', countLabel: 'Invites sent' })}
        <div class="studio-comms-program-cards-rail" id="studio-comms-program-cards" role="list" aria-label="Program comms cards"></div>
        <div id="studio-comms-setup-host"></div>
        <div id="studio-comms-line-rooms"></div>
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
        <p class="studio-muted" id="studio-comms-empty-msg" hidden>Select a program above to set up chat rooms and send invites.</p>
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
    let lineBusy = false;
    /** @type {{ groupId: string, groupName: string, lastSeenAt: string }[]} */
    let lineSeen = [];
    /** @type {{ programId: string, groupGeneralId: string, groupAnnounceId: string }} */
    let lineBinding = { programId: '', groupGeneralId: '', groupAnnounceId: '' };

    const cardsRail = mainEl.querySelector('#studio-comms-program-cards');
    const setupHost = mainEl.querySelector('#studio-comms-setup-host');
    const lineRoomsHost = mainEl.querySelector('#studio-comms-line-rooms');
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
        await loadLineRooms();
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
        const readonly = canEdit ? '' : 'disabled';
        const memberReady = isProgramCommsMemberReady(cfg);
        const thumbUrl = resolveProviderThumbUrl(cfg);
        const hasCustomThumb = Boolean(cfg.providerThumbUrl);
        const storeThumb = (url, alt) =>
            url
                ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" />`
                : '<span class="studio-comms-setup__thumb-empty">No image</span>';
        const qrCell = (url, label) =>
            url
                ? `<div class="studio-comms-setup__qr"><img src="${escapeHtml(url)}" alt="${escapeHtml(label)}" /><span>${escapeHtml(label)}</span></div>`
                : '';
        setupHost.innerHTML = `
        <div class="studio-comms-setup">
            <h3 class="studio-comms-setup__heading">LINE setup</h3>
            <p class="studio-comms-setup__help">
                Create a LINE Official Account, then add General and Announcements group chats in the LINE app and paste
                their invite URLs. Basic ID and channel IDs are optional console notes — they are not used for invite QRs.
                <a href="${escapeHtml(LINE_GETTING_STARTED_URL)}" target="_blank" rel="noopener noreferrer">LINE getting started</a>
            </p>
            <div class="studio-comms-setup__publish">
                <label class="studio-field studio-field--inline-check">
                    <input type="checkbox" class="studio-checkbox" id="studio-comms-member-active" ${cfg.memberActive ? 'checked' : ''} ${canEdit && memberReady ? '' : 'disabled'} />
                    <span>Show in member Settings → Communications</span>
                </label>
                <p class="studio-comms-setup__note">${memberReady ? 'Confirmed applicants see both rooms and store downloads when this is on.' : 'Save both room invite URLs and both store QRs before activating the member tab.'}</p>
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
                    <input type="text" class="studio-input" id="studio-comms-basic-id" value="${escapeHtml(cfg.basicId)}" placeholder="@fusion (optional note)" ${readonly} />
                </label>
                <label class="studio-field"><span>Channel ID</span>
                    <input type="text" class="studio-input" id="studio-comms-channel-id" value="${escapeHtml(cfg.channelId)}" placeholder="Optional console note" ${readonly} />
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
            <h4 class="studio-comms-setup__subhead">App download</h4>
            <p class="studio-comms-setup__note">Store URLs default to the official LINE listings. Upload a thumbnail for each store if you want a branded tile.</p>
            <div class="studio-comms-setup__stores">
                <div class="studio-comms-setup__store">
                    <div class="studio-comms-setup__store-thumb">${storeThumb(cfg.iosThumbUrl, 'iOS')}</div>
                    <div>
                        <p class="studio-comms-setup__thumb-label">iOS</p>
                        ${
                            canEdit
                                ? `<div class="studio-comms-setup__thumb-actions">
                            <input type="file" class="studio-sr-only" accept="image/*" id="studio-comms-ios-thumb-file" />
                            <button type="button" class="studio-btn-ghost" id="studio-comms-ios-thumb-upload">Upload</button>
                            ${cfg.iosThumbUrl ? '<button type="button" class="studio-btn-ghost" id="studio-comms-ios-thumb-clear">Clear</button>' : ''}
                        </div>`
                                : ''
                        }
                        <label class="studio-field"><span>App Store URL</span>
                            <input type="url" class="studio-input" id="studio-comms-ios-url" value="${escapeHtml(cfg.iosStoreUrl)}" placeholder="${escapeHtml(LINE_IOS_STORE_URL)}" ${readonly} />
                        </label>
                    </div>
                </div>
                <div class="studio-comms-setup__store">
                    <div class="studio-comms-setup__store-thumb">${storeThumb(cfg.androidThumbUrl, 'Android')}</div>
                    <div>
                        <p class="studio-comms-setup__thumb-label">Android</p>
                        ${
                            canEdit
                                ? `<div class="studio-comms-setup__thumb-actions">
                            <input type="file" class="studio-sr-only" accept="image/*" id="studio-comms-android-thumb-file" />
                            <button type="button" class="studio-btn-ghost" id="studio-comms-android-thumb-upload">Upload</button>
                            ${cfg.androidThumbUrl ? '<button type="button" class="studio-btn-ghost" id="studio-comms-android-thumb-clear">Clear</button>' : ''}
                        </div>`
                                : ''
                        }
                        <label class="studio-field"><span>Google Play URL</span>
                            <input type="url" class="studio-input" id="studio-comms-android-url" value="${escapeHtml(cfg.androidStoreUrl)}" placeholder="${escapeHtml(LINE_ANDROID_STORE_URL)}" ${readonly} />
                        </label>
                    </div>
                </div>
            </div>
            <h4 class="studio-comms-setup__subhead">Chat rooms</h4>
            <div class="studio-comms-setup__grid">
                <label class="studio-field"><span>General name</span>
                    <input type="text" class="studio-input" id="studio-comms-group-general-name" value="${escapeHtml(cfg.groupGeneralName)}" placeholder="General" ${readonly} />
                </label>
                <label class="studio-field"><span>Announcements name</span>
                    <input type="text" class="studio-input" id="studio-comms-group-announce-name" value="${escapeHtml(cfg.groupAnnounceName)}" placeholder="Announcements" ${readonly} />
                </label>
                <label class="studio-field studio-field--wide"><span>General invite URL</span>
                    <input type="url" class="studio-input" id="studio-comms-group-general-url" value="${escapeHtml(cfg.groupGeneralInviteUrl)}" placeholder="https://line.me/R/ti/g/…" ${readonly} />
                </label>
                <label class="studio-field studio-field--wide"><span>Announcements invite URL</span>
                    <input type="url" class="studio-input" id="studio-comms-group-announce-url" value="${escapeHtml(cfg.groupAnnounceInviteUrl)}" placeholder="https://line.me/R/ti/g/…" ${readonly} />
                </label>
            </div>
            <div class="studio-comms-setup__qrs">
                ${qrCell(cfg.iosQrUrl, 'iOS store')}
                ${qrCell(cfg.androidQrUrl, 'Android store')}
                ${qrCell(cfg.groupGeneralQrUrl, 'General')}
                ${qrCell(cfg.groupAnnounceQrUrl, 'Announcements')}
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

    function lineGroupLabel(groupId) {
        const id = String(groupId || '').trim();
        if (!id) return 'Not linked';
        const row = lineSeen.find((g) => g.groupId === id);
        return row?.groupName ? `${row.groupName}` : id;
    }

    async function loadLineRooms() {
        if (!selectedProgramId) {
            lineSeen = [];
            lineBinding = { programId: '', groupGeneralId: '', groupAnnounceId: '' };
            renderLineRooms();
            return;
        }
        try {
            const [seen, binding] = await Promise.all([
                staffListSeenLineGroups().catch(() => []),
                staffGetProgramCommsLineBinding(selectedProgramId).catch(() => ({
                    programId: selectedProgramId,
                    groupGeneralId: '',
                    groupAnnounceId: '',
                })),
            ]);
            lineSeen = Array.isArray(seen) ? seen : [];
            lineBinding = binding || { programId: selectedProgramId, groupGeneralId: '', groupAnnounceId: '' };
        } catch {
            lineSeen = [];
            lineBinding = { programId: selectedProgramId, groupGeneralId: '', groupAnnounceId: '' };
        }
        renderLineRooms();
    }

    function renderLineRooms() {
        if (!lineRoomsHost) return;
        if (!selectedProgramId) {
            lineRoomsHost.innerHTML = '';
            return;
        }
        const live = getDataSource() === 'live';
        const generalId = String(lineBinding.groupGeneralId || '').trim();
        const announceId = String(lineBinding.groupAnnounceId || '').trim();
        const bound = new Set([generalId, announceId].filter(Boolean));
        const inbox = lineSeen.filter((g) => g.groupId && !bound.has(g.groupId));
        const roomRow = (room, label, groupId) => `
            <div class="studio-comms-line-rooms__linked">
                <div>
                    <p class="studio-comms-setup__thumb-label">${escapeHtml(label)}</p>
                    <p class="studio-comms-setup__note">${groupId ? escapeHtml(lineGroupLabel(groupId)) : 'Not linked'}</p>
                    ${groupId ? `<p class="studio-comms-line-rooms__id">${escapeHtml(groupId)}</p>` : ''}
                </div>
                ${
                    canEdit && groupId
                        ? `<button type="button" class="studio-btn-ghost" data-comms-line-unassign="${escapeHtml(room)}">Unassign</button>`
                        : ''
                }
            </div>`;
        const inboxHtml = inbox.length
            ? inbox
                  .map(
                      (g) => `<li class="studio-comms-line-rooms__inbox-item">
                <div>
                    <strong>${escapeHtml(g.groupName || g.groupId)}</strong>
                    <p class="studio-comms-line-rooms__id">${escapeHtml(g.groupId)}</p>
                </div>
                ${
                    canEdit
                        ? `<div class="studio-comms-line-rooms__assign">
                    <button type="button" class="studio-btn-ghost" data-comms-line-assign="general" data-comms-line-group="${escapeHtml(g.groupId)}">General</button>
                    <button type="button" class="studio-btn-ghost" data-comms-line-assign="announce" data-comms-line-group="${escapeHtml(g.groupId)}">Announcements</button>
                </div>`
                        : ''
                }
            </li>`,
                  )
                  .join('')
            : '<li class="studio-comms-setup__note">No unassigned LINE groups yet. Add the bot to a group (or send a message there), then refresh.</li>';
        const sendDisabled = !canEdit || !live;
        lineRoomsHost.innerHTML = `
        <div class="studio-comms-setup studio-comms-line-rooms">
            <h3 class="studio-comms-setup__heading">LINE rooms</h3>
            <p class="studio-comms-setup__help">Webhook groups appear here. Assign one to General and one to Announcements, then send text from Studio.</p>
            ${roomRow('general', 'General', generalId)}
            ${roomRow('announce', 'Announcements', announceId)}
            <h4 class="studio-comms-setup__subhead">Unassigned groups</h4>
            <ul class="studio-comms-line-rooms__inbox">${inboxHtml}</ul>
            ${
                canEdit
                    ? `<label class="studio-field studio-field--wide"><span>Message</span>
                <textarea class="studio-input" id="studio-comms-line-message" rows="3" placeholder="Text to send into a linked room" ${sendDisabled ? 'disabled' : ''}></textarea>
            </label>
            <div class="studio-comms-setup__actions">
                <button type="button" class="studio-btn-primary" id="studio-comms-line-send-general" ${sendDisabled || !generalId ? 'disabled' : ''}>Send to General</button>
                <button type="button" class="studio-btn-primary" id="studio-comms-line-send-announce" ${sendDisabled || !announceId ? 'disabled' : ''}>Send to Announcements</button>
                <span class="studio-muted" id="studio-comms-line-status">${live ? '' : 'Switch to live data source to send.'}</span>
            </div>`
                    : ''
            }
        </div>`;
    }

    function setLineStatus(text, kind = '') {
        const el = mainEl.querySelector('#studio-comms-line-status');
        if (!el) return;
        el.textContent = text;
        el.className = `studio-muted${kind ? ` studio-comms-status--${kind}` : ''}`;
    }

    async function assignLineRoom(room, groupId) {
        if (!canEdit || !selectedProgramId || lineBusy) return;
        lineBusy = true;
        setLineStatus('Assigning…');
        try {
            await staffSetProgramCommsLineRoom(selectedProgramId, room, groupId);
            await loadLineRooms();
            setLineStatus('Assigned.', 'ok');
        } catch (err) {
            setLineStatus(err instanceof Error ? err.message : String(err), 'err');
        } finally {
            lineBusy = false;
        }
    }

    async function sendLineRoom(room) {
        if (!canEdit || !selectedProgramId || lineBusy) return;
        if (getDataSource() !== 'live') {
            setLineStatus('Switch to live data source to send.', 'warn');
            return;
        }
        const text = String(mainEl.querySelector('#studio-comms-line-message')?.value || '').trim();
        if (!text) {
            setLineStatus('Enter a message.', 'warn');
            return;
        }
        lineBusy = true;
        setLineStatus('Sending…');
        try {
            await sendLineGroupMessage({ programId: selectedProgramId, room, text });
            setLineStatus('Sent.', 'ok');
        } catch (err) {
            setLineStatus(err instanceof Error ? err.message : String(err), 'err');
        } finally {
            lineBusy = false;
        }
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
        else if (!ready) hint = 'Save both rooms and both store QRs before sending.';
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
                emptyMsg.textContent = 'Select a program above to set up chat rooms and send invites.';
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
        return normalizeProgramCommsConfig(
            {
                ...prior,
                programId: selectedProgramId || '',
                provider: 'line',
                oaName: String(mainEl.querySelector('#studio-comms-oa-name')?.value || '').trim(),
                basicId: String(mainEl.querySelector('#studio-comms-basic-id')?.value || '').trim(),
                channelId: String(mainEl.querySelector('#studio-comms-channel-id')?.value || '').trim(),
                iosStoreUrl: String(mainEl.querySelector('#studio-comms-ios-url')?.value || '').trim() || LINE_IOS_STORE_URL,
                androidStoreUrl:
                    String(mainEl.querySelector('#studio-comms-android-url')?.value || '').trim() || LINE_ANDROID_STORE_URL,
                iosThumbUrl: prior.iosThumbUrl,
                androidThumbUrl: prior.androidThumbUrl,
                groupGeneralName: String(mainEl.querySelector('#studio-comms-group-general-name')?.value || '').trim(),
                groupGeneralInviteUrl: String(mainEl.querySelector('#studio-comms-group-general-url')?.value || '').trim(),
                groupAnnounceName: String(mainEl.querySelector('#studio-comms-group-announce-name')?.value || '').trim(),
                groupAnnounceInviteUrl: String(mainEl.querySelector('#studio-comms-group-announce-url')?.value || '').trim(),
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

    async function uploadStoreThumb(file, fieldKey, patchKey) {
        if (!file || !selectedProgramId) return;
        const prepared = await prepareImageFileForUpload(file);
        const url = await uploadBlobToS3(prepared.file || file, null, {
            area: 'studio/programs',
            entityType: 'comms',
            entityId: selectedProgramId,
            fieldKey,
        });
        await persistCurrentConfig({ [patchKey]: url });
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
        if (!draft.groupGeneralInviteUrl) {
            setSaveStatus('General invite URL is required.', 'err');
            return;
        }
        if (!draft.groupAnnounceInviteUrl) {
            setSaveStatus('Announcements invite URL is required.', 'err');
            return;
        }
        saveBusy = true;
        setSaveStatus('Generating QRs…');
        try {
            const [iosFile, androidFile, generalFile, announceFile] = await Promise.all([
                qrPngFileFromUrl(draft.iosStoreUrl, 'line-ios-qr.png'),
                qrPngFileFromUrl(draft.androidStoreUrl, 'line-android-qr.png'),
                qrPngFileFromUrl(draft.groupGeneralInviteUrl, 'line-group-general-qr.png'),
                qrPngFileFromUrl(draft.groupAnnounceInviteUrl, 'line-group-announce-qr.png'),
            ]);
            setSaveStatus('Uploading QRs…');
            const [iosQrUrl, androidQrUrl, groupGeneralQrUrl, groupAnnounceQrUrl] = await Promise.all([
                uploadCommsQr(iosFile, 'line-ios-qr'),
                uploadCommsQr(androidFile, 'line-android-qr'),
                uploadCommsQr(generalFile, 'line-group-general-qr'),
                uploadCommsQr(announceFile, 'line-group-announce-qr'),
            ]);
            setSaveStatus('Saving…');
            const rec = {
                ...draft,
                groupGeneralName: draft.groupGeneralName || 'General',
                groupAnnounceName: draft.groupAnnounceName || 'Announcements',
                iosQrUrl,
                androidQrUrl,
                groupGeneralQrUrl,
                groupAnnounceQrUrl,
                memberActive:
                    draft.memberActive &&
                    isProgramCommsMemberReady({
                        ...draft,
                        iosQrUrl,
                        androidQrUrl,
                        groupGeneralQrUrl,
                        groupAnnounceQrUrl,
                    }),
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

    async function travelPrepLinksForCurrent() {
        if (!selectedProgramId) return [];
        return listTravelPrepLinks(selectedProgramId).catch(() => []);
    }

    function inviteHtmlFor(row, cfg, travelPrepLinks = []) {
        const program = currentProgram();
        return renderProgramCommsInviteHtml({
            programName: getProgramDisplayNameFromRow(program),
            heroImageUrl: programHero(program),
            provider: cfg.provider,
            iosStoreUrl: cfg.iosStoreUrl,
            androidStoreUrl: cfg.androidStoreUrl,
            iosQrUrl: cfg.iosQrUrl,
            androidQrUrl: cfg.androidQrUrl,
            groupGeneralName: cfg.groupGeneralName,
            groupGeneralInviteUrl: cfg.groupGeneralInviteUrl,
            groupGeneralQrUrl: cfg.groupGeneralQrUrl,
            groupAnnounceName: cfg.groupAnnounceName,
            groupAnnounceInviteUrl: cfg.groupAnnounceInviteUrl,
            groupAnnounceQrUrl: cfg.groupAnnounceQrUrl,
            applicantName: String(row.fullName || '').trim(),
            oaName: cfg.oaName,
            travelPrepLinks,
        });
    }

    async function sendOne(applicantId) {
        if (!canEdit || sendBusy || !selectedProgramId) return;
        const cfg = currentConfig();
        if (!isProgramCommsInviteReady(cfg)) {
            setSendStatus('Save both rooms and both store QRs before sending.', 'warn');
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
            const travelPrepLinks = await travelPrepLinksForCurrent();
            await sendEmail({
                to: email,
                subject: buildProgramCommsInviteSubject(getProgramDisplayNameFromRow(program)),
                html: inviteHtmlFor(row, cfg, travelPrepLinks),
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
            setSendStatus('Save both rooms and both store QRs before sending.', 'warn');
            return;
        }
        sendBusy = true;
        setSendStatus('Sending batch…');
        try {
            assertLiveSend();
            const program = currentProgram();
            const travelPrepLinks = await travelPrepLinksForCurrent();
            const { messages, skipped } = collectProgramCommsInviteMessages({
                applicants: confirmedForProgram(selectedProgramId),
                cfg,
                programName: getProgramDisplayNameFromRow(program),
                heroImageUrl: programHero(program),
                travelPrepLinks,
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
        loadLineRooms();
        renderInvitesBar();
        renderTable();
    });

    lineRoomsHost?.addEventListener('click', async (e) => {
        const t = e.target instanceof Element ? e.target : null;
        if (!t) return;
        const assign = t.closest('[data-comms-line-assign]');
        if (assign && lineRoomsHost.contains(assign)) {
            await assignLineRoom(
                assign.getAttribute('data-comms-line-assign') || '',
                assign.getAttribute('data-comms-line-group') || '',
            );
            return;
        }
        const unassign = t.closest('[data-comms-line-unassign]');
        if (unassign && lineRoomsHost.contains(unassign)) {
            await assignLineRoom(unassign.getAttribute('data-comms-line-unassign') || '', '');
            return;
        }
        if (t.id === 'studio-comms-line-send-general') {
            await sendLineRoom('general');
            return;
        }
        if (t.id === 'studio-comms-line-send-announce') {
            await sendLineRoom('announce');
        }
    });

    setupHost?.addEventListener('click', async (e) => {
        const t = e.target instanceof Element ? e.target : null;
        if (!t) return;
        if (t.id === 'studio-comms-save') {
            await saveSetup();
            return;
        }
        const fileTriggers = {
            'studio-comms-thumb-upload': 'studio-comms-thumb-file',
            'studio-comms-ios-thumb-upload': 'studio-comms-ios-thumb-file',
            'studio-comms-android-thumb-upload': 'studio-comms-android-thumb-file',
        };
        const fileId = fileTriggers[t.id];
        if (fileId) {
            const input = mainEl.querySelector(`#${fileId}`);
            if (input instanceof HTMLInputElement) input.click();
            return;
        }
        const clearPatches = {
            'studio-comms-thumb-clear': { providerThumbUrl: '' },
            'studio-comms-ios-thumb-clear': { iosThumbUrl: '' },
            'studio-comms-android-thumb-clear': { androidThumbUrl: '' },
        };
        const clearPatch = clearPatches[t.id];
        if (clearPatch) {
            try {
                await persistCurrentConfig(clearPatch);
                setSaveStatus('Thumbnail cleared.', 'ok');
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
        const thumbUploads = {
            'studio-comms-thumb-file': async (file) => uploadProviderThumb(file),
            'studio-comms-ios-thumb-file': async (file) => uploadStoreThumb(file, 'line-ios-thumb', 'iosThumbUrl'),
            'studio-comms-android-thumb-file': async (file) =>
                uploadStoreThumb(file, 'line-android-thumb', 'androidThumbUrl'),
        };
        const upload = thumbUploads[t.id];
        if (!upload) return;
        const file = t.files?.[0];
        t.value = '';
        if (!file) return;
        try {
            setSaveStatus('Uploading thumbnail…');
            await upload(file);
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
