/**
 * Studio Schedule — calendar event modal (view / edit / activity / conflict / delete).
 */
import '../../styles/studioScheduleEventModal.css';
import {
    formatTimeRange,
    parseYmd,
    statusLabel,
    timeToMinutes,
} from '../../utils/scheduleModel.js';
import {
    SCHEDULE_STAFF,
    createEvent,
    deleteEvent,
    duplicateEvent,
    getActivity,
    getEvent,
    getScheduleLocations,
    getScheduleProgramOptions,
    listFusionScheduleStaff,
    listScheduleArtistsForProgram,
    resolvePreferredScheduleProgram,
    scheduleTodayYmd,
    sendEventReminder,
    setScheduleProgramPreference,
    updateEvent,
} from '../../utils/scheduleStore.js';
import { initialsFromName } from '../../utils/scheduleModel.js';
import { openStudioConfirmDialog, openStudioModal, openStudioNoticeDialog } from '../../utils/studioModal.js';
import {
    SCHEDULE_RELATION_KINDS,
    buildSingleEventIcs,
    downloadIcsFile,
    getScheduleTimezonePreference,
    normalizeScheduleRelationKind,
    openScheduleTimezonePicker,
    scheduleTimezoneButtonLabel,
} from '../../utils/scheduleTimezones.js';
import {
    enrichSchedulePeople,
    eventAttributionLabel,
    loadFusionStaffPrincipalSet,
    resolveEventAttribution,
    schedulePersonAvatarHtml,
} from '../../utils/schedulePeople.js';
import { prepareImageFileForUpload } from '../../utils/imageUploadPrep.js';
import { uploadBlobToS3 } from '../../utils/studioS3Upload.js';
import {
    removeScheduleEventFromPublicSite,
    syncPublicSiteForScheduleEvent,
} from '../../utils/schedulePublicSync.js';

/**
 * @param {string} s
 */
function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * @param {any} artist
 */
function rosterArtistName(artist) {
    return String(artist?.name || artist?.id || 'Artist').trim() || 'Artist';
}

/**
 * @param {any} artist
 */
function rosterArtistId(artist) {
    return String(artist?.id || '').trim();
}

const ICONS = {
    pencil: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
    more: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>`,
    close: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
    pin: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`,
    clock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
    chevron: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`,
    link: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l1.46-1.46a5 5 0 0 0-7.07-7.07L10.5 6"/><path d="M14 11a5 5 0 0 0-7.54-.54L5 12a5 5 0 0 0 7.07 7.07L13.5 18"/></svg>`,
    users: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    user: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    file: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>`,
    bell: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    calendarIcs: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
};

const MONTH_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/**
 * @param {string} ymd
 */
function formatViewLongDate(ymd) {
    const { y, m, d } = parseYmd(ymd);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    });
}

/**
 * @param {import('../../utils/scheduleModel.js').CalendarEvent} ev
 */
function durationPhrase(ev) {
    if (ev.allDay) return 'All day';
    const mins = Math.max(0, timeToMinutes(ev.endTime) - timeToMinutes(ev.startTime));
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'}`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (!m) return `${h} hour${h === 1 ? '' : 's'}`;
    return `${h}h ${m}m`;
}

/**
 * Normalize browser time input (HH:MM or HH:MM:SS) to HH:MM.
 * @param {string} raw
 */
function normalizeTimeInputValue(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    const parts = s.split(':');
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return '';
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * @param {string} [relationKind]
 */
function isStaffRelationEvent(relationKind) {
    return normalizeScheduleRelationKind(relationKind) === 'staff';
}

/**
 * @param {HTMLElement} root
 * @param {import('../../utils/scheduleModel.js').CalendarEvent} draft
 */
function syncStaffPublicVisibility(root, draft) {
    const publicEl = root.querySelector('[name="publicOnSite"]');
    const hintEl = root.querySelector('[data-ev-staff-public-hint]');
    const publicHintEl = root.querySelector('[data-ev-public-hint]');
    const staffOnly = isStaffRelationEvent(draft.relationKind);
    if (publicEl instanceof HTMLInputElement) {
        if (staffOnly) {
            publicEl.checked = false;
            publicEl.disabled = true;
        } else {
            publicEl.disabled = false;
        }
    }
    if (hintEl instanceof HTMLElement) {
        hintEl.hidden = !staffOnly;
    }
    if (publicHintEl instanceof HTMLElement) {
        publicHintEl.hidden = staffOnly;
    }
}

/**
 * @param {HTMLElement} root
 * @param {boolean} allDay
 */
function syncAllDayTimeInputs(root, allDay) {
    root.querySelectorAll('[name="startTime"], [name="endTime"]').forEach((el) => {
        if (el instanceof HTMLInputElement) {
            el.disabled = allDay;
        }
    });
}

/**
 * @param {{
 *   eventId?: string | null,
 *   event?: import('../../utils/scheduleModel.js').CalendarEvent | null,
 *   mode?: 'view' | 'edit',
 *   canEdit?: boolean,
 *   createDefaults?: { date?: string, programId?: string },
 *   onChanged?: () => void,
 *   returnFocus?: HTMLElement | null,
 * }} opts
 */
export function openScheduleEventModal(opts) {
    const canEdit = opts.canEdit !== false;
    let mode = opts.mode || (opts.eventId || opts.event ? 'view' : 'edit');
    if (!canEdit) mode = 'view';
    let tab = /** @type {'details' | 'activity'} */ ('details');
    let dirty = false;
    let showConflictReview = false;
    let showParticipants = false;
    let showStaffPicker = false;
    let showOverflow = false;
    let liveMessage = '';
    let participantQuery = '';
    let staffQuery = '';
    let paintedOnce = false;
    /** @type {{ id: string, name: string, avatarUrl?: string }[]} */
    let rosterArtists = [];
    let rosterLoading = true;
    /** @type {{ id: string, name: string, initials: string, avatarUrl?: string }[]} */
    let fusionStaff = SCHEDULE_STAFF.map((s) => ({ ...s }));
    let staffLoading = true;
    /** @type {import('../../utils/schedulePeople.js').SchedulePersonView[]} */
    let viewStaff = [];
    /** @type {import('../../utils/schedulePeople.js').SchedulePersonView[]} */
    let viewParticipants = [];
    /** @type {'fusion' | 'artist'} */
    let attribution = 'fusion';

    /** @type {import('../../utils/scheduleModel.js').CalendarEvent | null} */
    let event =
        (opts.eventId ? getEvent(opts.eventId) : null) ||
        (opts.event && typeof opts.event === 'object' ? opts.event : null);

    /** Draft form state for create/edit */
    let draft = event
        ? {
              ...event,
              assignedStaff: [...(event.assignedStaff || [])],
              participantIds: [...(event.participantIds || [])],
              conflicts: [...(event.conflicts || [])],
              imageUrl: String(event.imageUrl || '').trim(),
              publicOnSite: Boolean(event.publicOnSite),
          }
        : blankEvent(opts.createDefaults?.date || scheduleTodayYmd(), opts.createDefaults?.programId);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const root = document.createElement('div');
    root.className = 'event-dialog-backdrop';
    root.setAttribute('data-schedule-event-modal', '1');
    document.body.appendChild(root);

    const close = async (force = false) => {
        if (!force && dirty && mode === 'edit') {
            const discard = await openStudioConfirmDialog({
                title: 'Discard changes?',
                message: 'You have unsaved edits on this event. Close without saving?',
                confirmLabel: 'Discard',
                cancelLabel: 'Keep editing',
                danger: true,
            });
            if (!discard) return;
        }
        document.removeEventListener('keydown', onKey);
        root.removeEventListener('click', onBackdropClick);
        root.remove();
        document.body.style.overflow = previousOverflow;
        opts.returnFocus?.focus?.();
    };

    const onBackdropClick = (e) => {
        if (e.target === root) void close();
    };
    root.addEventListener('click', onBackdropClick);

    const onKey = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            void close();
        }
        // basic focus trap
        if (e.key === 'Tab') {
            const focusables = root.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
            );
            const list = [...focusables].filter(
                (el) => el instanceof HTMLElement && !el.hasAttribute('disabled') && el.offsetParent !== null,
            );
            if (!list.length) return;
            const first = list[0];
            const last = list[list.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    };
    document.addEventListener('keydown', onKey);

    const syncParticipantChrome = () => {
        const n = (draft.participantIds || []).length;
        const btn = root.querySelector('[data-ev-artists] span');
        if (btn) btn.textContent = `${n} participant${n === 1 ? '' : 's'}`;
    };

    const syncStaffChrome = () => {
        const staff = draft.assignedStaff || [];
        const n = staff.length;
        const btn = root.querySelector('[data-ev-staff-picker] span');
        if (btn) {
            btn.textContent = `${n} staff assigned${n ? ` · ${staff.map((s) => s.name).join(', ')}` : ''}`;
        }
    };

    /**
     * @param {{ autofocus?: boolean }} [paintOpts]
     */
    const paint = (paintOpts = {}) => {
        const active = document.activeElement;
        /** @type {string} */
        let restoreName = '';
        if (active instanceof HTMLElement && root.contains(active)) {
            if (active.hasAttribute('data-ev-participant-query')) restoreName = 'participant-query';
            else if (active.hasAttribute('data-ev-staff-query')) restoreName = 'staff-query';
            else restoreName = active.getAttribute('name') || active.id || '';
        }
        const restoreSel =
            active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement
                ? [active.selectionStart, active.selectionEnd]
                : null;

        root.innerHTML = buildDialogHtml({
            draft,
            mode,
            tab,
            canEdit,
            isCreate: !opts.eventId && !opts.event && !event?.id,
            showConflictReview,
            showParticipants,
            showStaffPicker,
            showOverflow,
            liveMessage,
            activity: draft.id ? getActivity(draft.id) || draft.activity || [] : [],
            rosterArtists,
            rosterLoading,
            participantQuery,
            fusionStaff,
            staffLoading,
            staffQuery,
            viewStaff,
            viewParticipants,
            attribution,
        });
        bindDialog();

        const dialog = root.querySelector('.event-dialog');
        if (!(dialog instanceof HTMLElement)) {
            paintedOnce = true;
            return;
        }

        const wantAutofocus = paintOpts.autofocus === true || !paintedOnce;
        paintedOnce = true;

        queueMicrotask(() => {
            /** @type {HTMLElement | null} */
            let focusEl = null;
            if (restoreName === 'participant-query') {
                focusEl = root.querySelector('[data-ev-participant-query]');
            } else if (restoreName === 'staff-query') {
                focusEl = root.querySelector('[data-ev-staff-query]');
            } else if (restoreName) {
                focusEl =
                    root.querySelector(`[name="${CSS.escape(restoreName)}"]`) ||
                    root.querySelector(`#${CSS.escape(restoreName)}`);
            }
            if (!focusEl && wantAutofocus) {
                focusEl =
                    dialog.querySelector('[data-autofocus]') ||
                    dialog.querySelector('button, input, select, textarea');
            }
            if (focusEl instanceof HTMLElement) {
                focusEl.focus();
                if (
                    restoreSel &&
                    (focusEl instanceof HTMLInputElement || focusEl instanceof HTMLTextAreaElement)
                ) {
                    try {
                        focusEl.setSelectionRange(restoreSel[0] ?? 0, restoreSel[1] ?? 0);
                    } catch {
                        /* ignore */
                    }
                }
            }
        });
    };

    const refreshPeople = async () => {
        try {
            const principals = await loadFusionStaffPrincipalSet();
            attribution = resolveEventAttribution(draft, principals);
            const enriched = await enrichSchedulePeople(
                draft.assignedStaff || [],
                draft.participantIds || [],
                { preferStudioArtists: canEdit },
            );
            viewStaff = enriched.staff;
            viewParticipants = enriched.participants;
        } catch {
            attribution = resolveEventAttribution(draft, null);
            viewStaff = (draft.assignedStaff || []).map((s) => ({
                id: s.id,
                name: s.name,
                initials: s.initials || initialsFromName(s.name),
                avatarUrl: s.avatarUrl,
            }));
            viewParticipants = (draft.participantIds || []).map((id) => ({
                id,
                name: id,
                initials: initialsFromName(id) || '?',
            }));
        }
        paint();
    };

    /**
     * Load accepted applicants for the selected program.
     * Avoid full repaints unless the artists panel is open (prevents modal blink).
     * @param {string} programId
     * @param {{ prune?: boolean }} [rosterOpts]
     */
    const loadRosterForProgram = (programId, rosterOpts = {}) => {
        const prune = Boolean(rosterOpts.prune);
        const pid = String(programId || '').trim();
        rosterLoading = true;
        if (!pid) {
            rosterArtists = [];
            if (prune) {
                draft.participantIds = [];
                draft.participantCount = 0;
            }
            rosterLoading = false;
            if (showParticipants) paint();
            else syncParticipantChrome();
            return;
        }
        listScheduleArtistsForProgram(pid)
            .then((rows) => {
                const base = (Array.isArray(rows) ? rows : [])
                    .map((a) => ({ id: rosterArtistId(a), name: rosterArtistName(a) }))
                    .filter((a) => a.id);
                base.sort((a, b) => a.name.localeCompare(b.name));
                return enrichSchedulePeople([], base.map((a) => a.id), {
                    preferStudioArtists: canEdit,
                }).then((enriched) => {
                    const byId = new Map(enriched.participants.map((p) => [p.id, p]));
                    rosterArtists = base.map((a) => {
                        const hit = byId.get(a.id);
                        return {
                            id: a.id,
                            name: hit?.name || a.name,
                            initials: hit?.initials || initialsFromName(a.name) || '?',
                            avatarUrl: hit?.avatarUrl,
                        };
                    });
                    if (prune) {
                        const allowed = new Set(rosterArtists.map((a) => a.id));
                        draft.participantIds = (draft.participantIds || []).filter((id) =>
                            allowed.has(id),
                        );
                        draft.participantCount = draft.participantIds.length;
                    }
                    rosterLoading = false;
                    return refreshPeople().then(() => {
                        if (showParticipants) paint();
                        else syncParticipantChrome();
                    });
                });
            })
            .catch(() => {
                rosterArtists = [];
                if (prune) {
                    draft.participantIds = [];
                    draft.participantCount = 0;
                }
                rosterLoading = false;
                void refreshPeople().then(() => {
                    if (showParticipants) paint();
                    else syncParticipantChrome();
                });
            });
    };

    // Function declaration (hoisted) so paint() never hits TDZ if roster/staff reload early.
    function bindDialog() {
        root.querySelector('[data-ev-close]')?.addEventListener('click', () => {
            void close();
        });

        root.querySelector('[data-ev-edit]')?.addEventListener('click', () => {
            if (!canEdit) return;
            mode = 'edit';
            paint();
        });

        root.querySelector('[data-ev-done]')?.addEventListener('click', () => {
            void close(true);
        });
        root.querySelector('[data-ev-cancel]')?.addEventListener('click', () => {
            const isCreateFlow = !opts.eventId && !opts.event && !event?.id;
            const existingId = opts.eventId || event?.id || '';
            if (existingId && !isCreateFlow) {
                void (async () => {
                    if (dirty) {
                        const discard = await openStudioConfirmDialog({
                            title: 'Discard changes?',
                            message: 'Cancel editing and return to the saved event?',
                            confirmLabel: 'Discard',
                            cancelLabel: 'Keep editing',
                            danger: true,
                        });
                        if (!discard) return;
                    }
                    const fresh = getEvent(existingId);
                    if (fresh) {
                        draft = {
                            ...fresh,
                            assignedStaff: [...(fresh.assignedStaff || [])],
                            participantIds: [...(fresh.participantIds || [])],
                        };
                        event = fresh;
                    } else if (opts.event && opts.event.id === existingId) {
                        draft = {
                            ...opts.event,
                            assignedStaff: [...(opts.event.assignedStaff || [])],
                            participantIds: [...(opts.event.participantIds || [])],
                        };
                    }
                    dirty = false;
                    mode = 'view';
                    void refreshPeople();
                })();
            } else {
                void close();
            }
        });

        root.querySelectorAll('[data-ev-tab]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const t = btn.getAttribute('data-ev-tab');
                if (t === 'details' || t === 'activity') {
                    tab = t;
                    paint();
                }
            });
        });

        root.querySelector('[data-ev-overflow]')?.addEventListener('click', (e) => {
            e.stopPropagation();
            showOverflow = !showOverflow;
            paint();
        });

        root.querySelector('[data-ev-dup]')?.addEventListener('click', async () => {
            if (!draft.id || !canEdit) return;
            try {
                liveMessage = 'Duplicating…';
                paint();
                const copy = await duplicateEvent(draft.id);
                opts.onChanged?.();
                event = copy;
                draft = { ...copy, assignedStaff: [...(copy?.assignedStaff || [])] };
                mode = 'edit';
                dirty = false;
                showOverflow = false;
                liveMessage = 'Event duplicated';
                paint();
            } catch (e) {
                liveMessage = e instanceof Error ? e.message : String(e);
                paint();
            }
        });

        root.querySelector('[data-ev-copy-link]')?.addEventListener('click', async () => {
            const url = `${window.location.origin}${window.location.pathname}#schedule?event=${encodeURIComponent(draft.id || '')}`;
            try {
                await navigator.clipboard.writeText(url);
                liveMessage = 'Link copied';
            } catch {
                liveMessage = url;
            }
            showOverflow = false;
            paint();
        });

        root.querySelectorAll('[data-ev-ics]').forEach((btn) => {
            btn.addEventListener('click', () => {
                downloadIcs(draft);
                showOverflow = false;
                paint();
            });
        });

        root.querySelector('[data-ev-timezone]')?.addEventListener('click', async () => {
            const picked = await openScheduleTimezonePicker(openStudioModal, {
                currentId: draft.timezone || getScheduleTimezonePreference(),
            });
            if (!picked) return;
            draft.timezone = picked;
            dirty = true;
            paint();
        });

        const flierFile = root.querySelector('#ev-flier-file');
        root.querySelector('[data-ev-flier-pick]')?.addEventListener('click', () => {
            if (!(flierFile instanceof HTMLInputElement) || flierFile.disabled) return;
            flierFile.click();
        });
        flierFile?.addEventListener('change', async () => {
            const input = flierFile instanceof HTMLInputElement ? flierFile : null;
            const f = input?.files?.[0] || null;
            if (!f || !canEdit || mode !== 'edit') return;
            const liveEl = root.querySelector('.event-live');
            if (liveEl) liveEl.textContent = 'Uploading flier…';
            try {
                const { file, heicWarning } = await prepareImageFileForUpload(f);
                const url = await uploadBlobToS3(file, null, {
                    area: 'studio/schedule',
                    entityType: 'schedule-event',
                    entityId: String(draft.id || 'new'),
                    fieldKey: 'flier',
                });
                draft.imageUrl = String(url || '').trim();
                dirty = true;
                liveMessage = heicWarning
                    ? 'Flier uploaded (HEIC kept as-is; convert to JPEG/WebP if display issues)'
                    : 'Flier uploaded';
                paint();
            } catch (err) {
                liveMessage = err instanceof Error ? err.message : String(err);
                paint();
                await openStudioNoticeDialog({
                    title: 'Flier upload failed',
                    message: liveMessage,
                    okLabel: 'OK',
                });
            } finally {
                if (input) input.value = '';
            }
        });
        root.querySelector('[data-ev-flier-clear]')?.addEventListener('click', () => {
            if (!canEdit || mode !== 'edit') return;
            draft.imageUrl = '';
            dirty = true;
            liveMessage = 'Flier removed';
            paint();
        });

        root.querySelector('[data-ev-delete]')?.addEventListener('click', async () => {
            if (!canEdit || !draft.id) return;
            const ok = await openStudioConfirmDialog({
                title: 'Delete event?',
                message: `Delete “${draft.title || 'this event'}”? This cannot be undone.`,
                confirmLabel: 'Delete event',
                cancelLabel: 'Keep event',
                danger: true,
            });
            if (!ok) return;
            try {
                const deletedId = draft.id;
                liveMessage = 'Deleting…';
                paint();
                await deleteEvent(deletedId);
                try {
                    await removeScheduleEventFromPublicSite(deletedId);
                } catch (syncErr) {
                    const syncMsg = syncErr instanceof Error ? syncErr.message : String(syncErr);
                    await openStudioNoticeDialog({
                        title: 'Public site sync failed',
                        message: `Event deleted from the schedule, but public site cleanup failed: ${syncMsg}`,
                        okLabel: 'OK',
                    });
                }
                opts.onChanged?.();
                await openStudioNoticeDialog({
                    title: 'Event deleted',
                    message: 'The event was removed from the schedule.',
                    okLabel: 'Done',
                });
                void close(true);
            } catch (e) {
                liveMessage = e instanceof Error ? e.message : String(e);
                paint();
                await openStudioNoticeDialog({
                    title: 'Delete failed',
                    message: liveMessage,
                    okLabel: 'OK',
                });
            }
        });

        root.querySelector('[data-ev-review-conflict]')?.addEventListener('click', () => {
            showConflictReview = true;
            paint();
        });
        root.querySelector('[data-ev-conflict-close]')?.addEventListener('click', () => {
            showConflictReview = false;
            paint();
        });
        root.querySelector('[data-ev-conflict-keep]')?.addEventListener('click', () => {
            showConflictReview = false;
            liveMessage = 'Conflict acknowledged';
            paint();
        });
        root.querySelector('[data-ev-conflict-open-other]')?.addEventListener('click', () => {
            const otherId = draft.conflicts?.[0]?.eventId;
            if (!otherId) return;
            const other = getEvent(otherId);
            if (!other) return;
            event = other;
            draft = { ...other, assignedStaff: [...other.assignedStaff] };
            mode = 'view';
            showConflictReview = false;
            dirty = false;
            paint();
        });

        root.querySelector('[data-ev-staff-picker]')?.addEventListener('click', () => {
            showStaffPicker = !showStaffPicker;
            if (showStaffPicker) showParticipants = false;
            paint();
        });

        root.querySelector('[data-ev-staff-query]')?.addEventListener('input', (e) => {
            const t = /** @type {HTMLInputElement} */ (e.target);
            staffQuery = t.value;
            // Full paint only when filtering — preserve focus inside paint().
            paint();
        });

        root.querySelectorAll('[data-ev-toggle-staff]').forEach((btn) => {
            btn.addEventListener('click', () => {
                if (mode !== 'edit' || !canEdit) return;
                const id = btn.getAttribute('data-ev-toggle-staff') || '';
                if (!id) return;
                const person = fusionStaff.find((s) => s.id === id);
                if (!person) return;
                const exists = draft.assignedStaff.some((s) => s.id === id);
                if (exists) {
                    draft.assignedStaff = draft.assignedStaff.filter((s) => s.id !== id);
                } else {
                    draft.assignedStaff = [
                        ...draft.assignedStaff,
                        {
                            id: person.id,
                            name: person.name,
                            initials: person.initials || initialsFromName(person.name),
                        },
                    ];
                }
                dirty = true;
                const on = !exists;
                btn.style.border = on ? '1px solid var(--event-ink,#111827)' : '1px solid transparent';
                btn.style.background = on ? '#f3f1ef' : 'transparent';
                const tag = btn.querySelector('span:last-child');
                if (tag) tag.textContent = on ? 'Selected' : 'Add';
                syncStaffChrome();
            });
        });

        root.querySelector('[data-ev-clear-staff]')?.addEventListener('click', () => {
            if (mode !== 'edit' || !canEdit) return;
            draft.assignedStaff = [];
            dirty = true;
            paint();
        });

        root.querySelector('[data-ev-artists]')?.addEventListener('click', () => {
            showParticipants = !showParticipants;
            if (showParticipants) showStaffPicker = false;
            paint();
        });

        root.querySelector('[data-ev-participant-query]')?.addEventListener('input', (e) => {
            const t = /** @type {HTMLInputElement} */ (e.target);
            participantQuery = t.value;
            paint();
        });

        root.querySelectorAll('[data-ev-toggle-participant]').forEach((btn) => {
            btn.addEventListener('click', () => {
                if (mode !== 'edit' || !canEdit) return;
                const id = btn.getAttribute('data-ev-toggle-participant') || '';
                if (!id) return;
                const set = new Set(draft.participantIds || []);
                if (set.has(id)) set.delete(id);
                else set.add(id);
                draft.participantIds = [...set];
                draft.participantCount = draft.participantIds.length;
                dirty = true;
                const on = set.has(id);
                btn.style.border = on ? '1px solid var(--event-ink,#111827)' : '1px solid transparent';
                btn.style.background = on ? '#f3f1ef' : 'transparent';
                const tag = btn.querySelector('span:last-child');
                if (tag) tag.textContent = on ? 'Selected' : 'Add';
                syncParticipantChrome();
            });
        });

        root.querySelector('[data-ev-clear-participants]')?.addEventListener('click', () => {
            if (mode !== 'edit' || !canEdit) return;
            draft.participantIds = [];
            draft.participantCount = 0;
            dirty = true;
            paint();
        });

        root.querySelector('[data-ev-send-reminder]')?.addEventListener('click', async () => {
            if (!canEdit || !draft.id) {
                await openStudioNoticeDialog({
                    title: 'Save event first',
                    message: 'Save the event before sending a reminder email.',
                    okLabel: 'OK',
                });
                return;
            }
            if (dirty) {
                const proceed = await openStudioConfirmDialog({
                    title: 'Unsaved changes',
                    message: 'Send reminder using the last saved event details? Unsaved edits will not be included.',
                    confirmLabel: 'Send anyway',
                    cancelLabel: 'Cancel',
                });
                if (!proceed) return;
            }
            const already = Boolean(getEvent(draft.id)?.reminderSentAt || draft.reminderSentAt);
            if (already) {
                const again = await openStudioConfirmDialog({
                    title: 'Send reminder again?',
                    message: 'A reminder was already sent for this event. Send again to staff, artists, and info@fusionart.world?',
                    confirmLabel: 'Send again',
                    cancelLabel: 'Cancel',
                });
                if (!again) return;
            } else {
                const ok = await openStudioConfirmDialog({
                    title: 'Send reminder?',
                    paragraphs: [
                        'Email assigned staff, participating artists (with contact emails), and info@fusionart.world.',
                        `Event: ${draft.title || 'Untitled'}`,
                    ],
                    confirmLabel: 'Send reminder',
                    cancelLabel: 'Cancel',
                });
                if (!ok) return;
            }
            liveMessage = 'Sending reminder…';
            paint();
            try {
                const result = await sendEventReminder(draft.id, { force: true });
                const fresh = getEvent(draft.id);
                if (fresh) {
                    event = fresh;
                    draft = {
                        ...fresh,
                        assignedStaff: [...fresh.assignedStaff],
                        participantIds: [...(fresh.participantIds || [])],
                    };
                }
                const missing = [
                    ...(result.missingStaff || []).map((n) => `Staff without email: ${n}`),
                    ...(result.missingArtists || []).map((n) => `Artist without email: ${n}`),
                ];
                liveMessage = 'Reminder sent';
                paint();
                opts.onChanged?.();
                await openStudioNoticeDialog({
                    title: 'Reminder sent',
                    paragraphs: [
                        `Sent to ${result.sentTo.length} recipient${result.sentTo.length === 1 ? '' : 's'} (${result.recipientSummary}).`,
                        ...(missing.length ? ['Some people had no email on file:', ...missing.slice(0, 6)] : []),
                    ],
                    okLabel: 'OK',
                });
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                liveMessage = msg;
                paint();
                await openStudioNoticeDialog({
                    title: 'Reminder failed',
                    message: msg,
                    okLabel: 'OK',
                });
            }
        });

        const markDirty = () => {
            dirty = true;
        };

        const readFields = () => {
            const g = (sel) => {
                const el = root.querySelector(sel);
                return el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement
                    ? el.value
                    : '';
            };
            draft.title = g('[name="title"]') || draft.title;
            draft.date = g('[name="date"]') || draft.date;
            const allDayEl = root.querySelector('[name="allDay"]');
            draft.allDay = allDayEl instanceof HTMLInputElement ? allDayEl.checked : Boolean(draft.allDay);
            if (draft.allDay) {
                draft.startTime = '00:00';
                draft.endTime = '23:59';
            } else {
                draft.startTime = normalizeTimeInputValue(g('[name="startTime"]')) || draft.startTime;
                draft.endTime = normalizeTimeInputValue(g('[name="endTime"]')) || draft.endTime;
            }
            draft.timezone = g('[name="timezone"]') || draft.timezone || getScheduleTimezonePreference();
            draft.relationKind =
                normalizeScheduleRelationKind(g('[name="relationKind"]') || draft.relationKind) ||
                draft.relationKind;
            draft.eventKind = g('[name="eventKind"]') || draft.eventKind || 'standard';
            const programId = g('[name="programId"]');
            if (programId) {
                draft.programId = programId;
                draft.programName =
                    getScheduleProgramOptions().find((p) => p.id === programId)?.name || draft.programName;
                setScheduleProgramPreference(draft.programId, draft.programName);
            }
            if (draft.relationKind === 'program') {
                draft.relationProgramId = draft.programId;
            } else {
                draft.relationProgramId = '';
            }
            const locationId = g('[name="locationId"]');
            draft.locationId = locationId;
            draft.locationName =
                getScheduleLocations().find((l) => l.id === locationId)?.name || draft.locationName;
            draft.notes = g('[name="notes"]');
            const rem = g('[name="reminderMinutes"]');
            draft.reminderMinutes = rem === '' ? null : Number(rem);
            draft.status = /** @type {any} */ (g('[name="status"]') || draft.status);
            draft.color = /** @type {any} */ (g('[name="color"]') || draft.color);
            const publicEl = root.querySelector('[name="publicOnSite"]');
            draft.publicOnSite =
                publicEl instanceof HTMLInputElement ? publicEl.checked : Boolean(draft.publicOnSite);
            if (isStaffRelationEvent(draft.relationKind)) {
                draft.publicOnSite = false;
            }
            const imageEl = root.querySelector('[name="imageUrl"]');
            if (imageEl instanceof HTMLInputElement) {
                draft.imageUrl = imageEl.value.trim();
            }
        };

        root.querySelectorAll('.event-field__control').forEach((el) => {
            // Search boxes have their own handlers; skip to avoid fighting paint/focus.
            if (
                el instanceof HTMLElement &&
                (el.hasAttribute('data-ev-participant-query') || el.hasAttribute('data-ev-staff-query'))
            ) {
                return;
            }
            el.addEventListener('input', () => {
                markDirty();
                readFields();
            });
            el.addEventListener('change', () => {
                markDirty();
                readFields();
            });
        });

        root.querySelector('#ev-programId')?.addEventListener('change', () => {
            markDirty();
            readFields();
            loadRosterForProgram(draft.programId, { prune: true });
        });

        root.querySelector('[name="relationKind"]')?.addEventListener('change', () => {
            markDirty();
            readFields();
            syncStaffPublicVisibility(root, draft);
        });

        root.querySelector('[name="allDay"]')?.addEventListener('change', () => {
            markDirty();
            readFields();
            syncAllDayTimeInputs(root, draft.allDay);
        });

        root.querySelector('[name="publicOnSite"]')?.addEventListener('change', () => {
            markDirty();
            readFields();
        });

        syncStaffPublicVisibility(root, draft);
        syncAllDayTimeInputs(root, draft.allDay);

        root.querySelector('[data-ev-save]')?.addEventListener('click', async () => {
            readFields();
            const err = validateDraft(draft);
            if (err) {
                liveMessage = err;
                paint();
                return;
            }
            const saveBtn = root.querySelector('[data-ev-save]');
            if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = true;
            liveMessage = 'Saving…';
            paint();
            try {
                if (opts.eventId || event?.id) {
                    const id = opts.eventId || event.id;
                    await updateEvent(id, {
                        title: draft.title,
                        date: draft.date,
                        startTime: draft.startTime,
                        endTime: draft.endTime,
                        allDay: draft.allDay,
                        timezone: draft.timezone,
                        programId: draft.programId,
                        programName: draft.programName,
                        locationId: draft.locationId,
                        locationName: draft.locationName,
                        assignedStaff: draft.assignedStaff,
                        participantIds: draft.participantIds || [],
                        participantCount: (draft.participantIds || []).length,
                        notes: draft.notes,
                        reminderMinutes: draft.reminderMinutes,
                        status: draft.status,
                        color: draft.color,
                        team: draft.team,
                        relationKind: draft.relationKind || 'program',
                        relationProgramId:
                            draft.relationKind === 'program'
                                ? draft.programId
                                : draft.relationProgramId || '',
                        eventKind: draft.eventKind || 'standard',
                        imageUrl: String(draft.imageUrl || '').trim(),
                        publicOnSite: isStaffRelationEvent(draft.relationKind)
                            ? false
                            : Boolean(draft.publicOnSite),
                    });
                    event = getEvent(id);
                } else {
                    event = await createEvent({
                        title: draft.title,
                        date: draft.date,
                        startTime: draft.startTime,
                        endTime: draft.endTime,
                        allDay: draft.allDay,
                        timezone: draft.timezone,
                        programId: draft.programId,
                        programName: draft.programName,
                        locationId: draft.locationId,
                        locationName: draft.locationName,
                        assignedStaff: draft.assignedStaff,
                        participantIds: draft.participantIds || [],
                        participantCount: (draft.participantIds || []).length,
                        notes: draft.notes,
                        reminderMinutes: draft.reminderMinutes,
                        status: draft.status,
                        color: draft.color,
                        team: draft.team || 'Residency',
                        relationKind: draft.relationKind || 'program',
                        relationProgramId:
                            draft.relationKind === 'program'
                                ? draft.programId
                                : draft.relationProgramId || '',
                        eventKind: draft.eventKind || 'standard',
                        imageUrl: String(draft.imageUrl || '').trim(),
                        publicOnSite: isStaffRelationEvent(draft.relationKind)
                            ? false
                            : Boolean(draft.publicOnSite),
                    });
                }
                if (!event) throw new Error('Save failed');
                if (draft.programId) {
                    setScheduleProgramPreference(draft.programId, draft.programName);
                }
                draft = { ...event, assignedStaff: [...event.assignedStaff] };
                dirty = false;
                mode = 'view';
                liveMessage = 'Saved';
                opts.onChanged?.();
                paint();
                try {
                    await syncPublicSiteForScheduleEvent(event);
                } catch (syncErr) {
                    const syncMsg = syncErr instanceof Error ? syncErr.message : String(syncErr);
                    await openStudioNoticeDialog({
                        title: 'Public site sync failed',
                        message: `Event saved to the schedule, but public site / journal sync failed: ${syncMsg}. Save again to retry.`,
                        okLabel: 'OK',
                    });
                }
                await openStudioNoticeDialog({
                    title: 'Event saved',
                    message: 'Your changes were saved to the schedule.',
                    okLabel: 'OK',
                });
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                if (/version conflict/i.test(msg)) {
                    liveMessage =
                        'Another staff member saved this event first. Reload latest, or keep editing your draft.';
                    const reload = await openStudioConfirmDialog({
                        title: 'Version conflict',
                        paragraphs: [
                            'Someone else saved this event while you were editing.',
                            'Reload the latest version from the canister, or keep your draft to review.',
                        ],
                        confirmLabel: 'Reload latest',
                        cancelLabel: 'Keep my draft',
                    });
                    if (reload && (opts.eventId || event?.id)) {
                        const id = opts.eventId || event.id;
                        try {
                            const { loadScheduleEvents } = await import('../../utils/scheduleStore.js');
                            await loadScheduleEvents();
                        } catch {
                            /* ignore */
                        }
                        const fresh = getEvent(id);
                        if (fresh) {
                            event = fresh;
                            draft = { ...fresh, assignedStaff: [...fresh.assignedStaff] };
                            dirty = false;
                            mode = 'view';
                            liveMessage = 'Reloaded latest';
                        }
                        await openStudioNoticeDialog({
                            title: 'Reloaded',
                            message: 'Showing the latest saved version of this event.',
                            okLabel: 'OK',
                        });
                    }
                } else {
                    liveMessage = msg;
                    await openStudioNoticeDialog({
                        title: 'Save failed',
                        message: msg,
                        okLabel: 'OK',
                    });
                }
                paint();
            }
        });
    }

    loadRosterForProgram(draft.programId);
    void refreshPeople();

    listFusionScheduleStaff()
        .then((rows) => {
            fusionStaff = Array.isArray(rows) && rows.length ? rows : SCHEDULE_STAFF.map((s) => ({ ...s }));
            staffLoading = false;
            void refreshPeople();
        })
        .catch(() => {
            fusionStaff = SCHEDULE_STAFF.map((s) => ({ ...s }));
            staffLoading = false;
            void refreshPeople();
        });

    paint({ autofocus: true });
    return { close: () => close(true) };
}

/**
 * @param {string} date
 * @param {string} [programIdHint]
 */
function blankEvent(date, programIdHint = '') {
    const locs = getScheduleLocations();
    const loc = locs[0] || { id: 'loc-studio', name: 'Main Studio' };
    const prog = resolvePreferredScheduleProgram(programIdHint);
    return {
        id: '',
        title: '',
        date,
        startTime: '09:00',
        endTime: '10:00',
        allDay: false,
        timezone: getScheduleTimezonePreference(),
        programId: prog.id,
        programName: prog.name,
        team: 'Residency',
        locationId: loc.id,
        locationName: loc.name,
        assignedStaff: [],
        participantIds: [],
        participantCount: 0,
        notes: '',
        reminderMinutes: 30,
        reminderSentAt: '',
        status: /** @type {const} */ ('confirmed'),
        color: /** @type {const} */ ('sage'),
        relationKind: 'program',
        relationProgramId: prog.id,
        eventKind: /** @type {const} */ ('standard'),
        imageUrl: '',
        publicOnSite: false,
        conflicts: [],
        createdAt: '',
        updatedAt: '',
        version: 0,
    };
}

/**
 * @param {import('../../utils/scheduleModel.js').CalendarEvent} draft
 */
function validateDraft(draft) {
    if (!String(draft.title || '').trim()) return 'Title is required';
    if (!draft.date) return 'Date is required';
    const relationKind = normalizeScheduleRelationKind(draft.relationKind);
    if (!relationKind) return 'Relation is required';
    if (!draft.programId) return 'Program is required';
    if (relationKind === 'program' && !String(draft.relationProgramId || draft.programId || '').trim()) {
        return 'Program relation requires a program';
    }
    if (!draft.locationId) return 'Location is required';
    if (!draft.timezone) return 'Timezone is required';
    if (!draft.allDay) {
        if (!draft.startTime || !draft.endTime) return 'Start and end time are required';
        if (timeToMinutes(draft.endTime) <= timeToMinutes(draft.startTime)) {
            return 'End time must be later than start time';
        }
    }
    return '';
}

/**
 * @param {object} ctx
 */
function buildDialogHtml(ctx) {
    const {
        draft,
        mode,
        tab,
        canEdit,
        isCreate,
        showConflictReview,
        showParticipants,
        showStaffPicker,
        showOverflow,
        liveMessage,
        activity,
        rosterArtists = [],
        rosterLoading = false,
        participantQuery = '',
        fusionStaff = [],
        staffLoading = false,
        staffQuery = '',
        viewStaff = [],
        viewParticipants = [],
        attribution = 'fusion',
    } = ctx;
    const editing = mode === 'edit';
    const conflict = draft.conflicts?.[0];
    const titleId = 'event-dialog-title';
    const descId = 'event-dialog-desc';
    const selectedIds = new Set(draft.participantIds || []);
    const selectedStaffIds = new Set((draft.assignedStaff || []).map((s) => s.id));
    const q = String(participantQuery || '')
        .trim()
        .toLowerCase();
    const filteredRoster = (rosterArtists || []).filter((a) => {
        if (!q) return true;
        return String(a.name).toLowerCase().includes(q) || String(a.id).toLowerCase().includes(q);
    });
    const sq = String(staffQuery || '')
        .trim()
        .toLowerCase();
    const filteredStaff = (fusionStaff || []).filter((s) => {
        if (!sq) return true;
        return String(s.name).toLowerCase().includes(sq) || String(s.id).toLowerCase().includes(sq);
    });
    const staffPeople = viewStaff.length
        ? viewStaff
        : (draft.assignedStaff || []).map((s) => ({
              id: s.id,
              name: s.name,
              initials: s.initials || initialsFromName(s.name),
              avatarUrl: s.avatarUrl,
          }));
    const participantPeople = viewParticipants.length
        ? viewParticipants
        : (draft.participantIds || []).map((id) => ({
              id,
              name: id,
              initials: initialsFromName(id) || '?',
          }));

    const field = (label, name, controlHtml, wide = false) =>
        `<div class="event-field ${wide ? 'event-field--wide' : ''}">
          <label class="event-field__label" for="ev-${esc(name)}">${esc(label)}</label>
          ${controlHtml}
        </div>`;

    const input = (name, value, type = 'text') =>
        `<input class="event-field__control" id="ev-${esc(name)}" name="${esc(name)}" type="${type}" value="${esc(value)}" ${name === 'title' ? 'data-autofocus' : ''} />`;

    const programs = (() => {
        const publicOnly = getScheduleProgramOptions({ publicOnly: true });
        if (isCreate) return publicOnly;
        if (
            draft.programId &&
            !publicOnly.some((p) => p.id === draft.programId)
        ) {
            const cur =
                getScheduleProgramOptions().find((p) => p.id === draft.programId) ||
                (draft.programName
                    ? { id: draft.programId, name: draft.programName }
                    : null);
            return cur ? [...publicOnly, cur] : publicOnly;
        }
        return publicOnly;
    })();
    const programOpts = programs.length
        ? programs
              .map(
                  (p) =>
                      `<option value="${esc(p.id)}" ${draft.programId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`,
              )
              .join('')
        : `<option value="">No public programs available</option>`;
    const locOpts = getScheduleLocations().map(
        (l) => `<option value="${esc(l.id)}" ${draft.locationId === l.id ? 'selected' : ''}>${esc(l.name)}</option>`,
    ).join('');
    const staffRelation = isStaffRelationEvent(draft.relationKind);
    const startTimeValue = esc(normalizeTimeInputValue(draft.startTime) || '09:00');
    const endTimeValue = esc(normalizeTimeInputValue(draft.endTime) || '10:00');
    const timeDisabled = draft.allDay ? 'disabled' : '';

    const staffHtml = `
      <button type="button" class="event-participants" data-ev-staff-picker aria-expanded="${showStaffPicker ? 'true' : 'false'}">
        <span>${selectedStaffIds.size} staff assigned${selectedStaffIds.size ? ` · ${esc((draft.assignedStaff || []).map((s) => s.name).join(', '))}` : ''}</span>
        ${ICONS.chevron}
      </button>
      ${
          showStaffPicker
              ? `<div class="event-participants-panel" style="margin-top:10px;border:1px solid var(--event-border-strong,#d9d4d2);border-radius:8px;background:#fff;padding:10px">
                ${
                    editing && canEdit
                        ? `<input type="search" class="event-field__control" data-ev-staff-query placeholder="Search Starr, Zoia, Akari…" value="${esc(staffQuery)}" style="margin-bottom:8px;min-height:36px" />`
                        : ''
                }
                ${
                    staffLoading
                        ? `<p class="event-field__hint">Loading Fusion staff…</p>`
                        : filteredStaff.length
                          ? `<ul class="event-participants-list" style="list-style:none;margin:0;padding:0;max-height:200px;overflow:auto;display:grid;gap:4px">
                              ${filteredStaff
                                  .map((s) => {
                                      const on = selectedStaffIds.has(s.id);
                                      return `<li>
                                        <button type="button" data-ev-toggle-staff="${esc(s.id)}" ${editing && canEdit ? '' : 'disabled'} style="display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;padding:8px 10px;border:1px solid ${on ? 'var(--event-ink,#111827)' : 'transparent'};border-radius:6px;background:${on ? '#f3f1ef' : 'transparent'};color:var(--event-ink,#111827);text-align:left;font-size:12px;cursor:${editing && canEdit ? 'pointer' : 'default'}">
                                          <span style="display:inline-flex;align-items:center;gap:8px">
                                            ${schedulePersonAvatarHtml({ id: s.id, name: s.name, initials: s.initials || '?', avatarUrl: s.avatarUrl }, 'event-person__avatar')}
                                            ${esc(s.name)}
                                          </span>
                                          <span style="font-size:10px;font-weight:650;color:var(--event-muted,#706d69)">${on ? 'Selected' : 'Add'}</span>
                                        </button>
                                      </li>`;
                                  })
                                  .join('')}
                            </ul>`
                          : `<p class="event-field__hint">${(fusionStaff || []).length ? 'No staff match this search.' : 'No Fusion staff available.'}</p>`
                }
                ${
                    editing && canEdit && selectedStaffIds.size
                        ? `<button type="button" class="event-dialog__button" data-ev-clear-staff style="margin-top:8px">Clear all</button>`
                        : ''
                }
              </div>`
              : ''
      }
      ${
          selectedStaffIds.size && !showStaffPicker
              ? `<div class="event-staff" style="margin-top:8px">
                  ${staffPeople
                      .map(
                          (s) => `<span class="event-staff__chip">
                      ${schedulePersonAvatarHtml(s, 'event-staff__avatar')}
                      ${esc(s.name)}
                    </span>`,
                      )
                      .join('')}
                </div>`
              : ''
      }`;

    const relationLabel =
        SCHEDULE_RELATION_KINDS.find((k) => k.id === (draft.relationKind || 'program'))?.label ||
        draft.relationKind ||
        '—';
    const tzLabel = scheduleTimezoneButtonLabel(draft.timezone || getScheduleTimezonePreference());
    const dateParts = (() => {
        try {
            const { y, m, d } = parseYmd(draft.date);
            return { y, m, d, month: MONTH_SHORT[m - 1] || '', day: String(d) };
        } catch {
            return { y: '', m: 0, d: 0, month: '—', day: '—' };
        }
    })();
    const reminderText =
        draft.reminderMinutes == null || draft.reminderMinutes === ''
            ? ''
            : Number(draft.reminderMinutes) >= 60
              ? `${Number(draft.reminderMinutes) / 60} hr before`
              : `${draft.reminderMinutes} min before`;
    const attrLabel = eventAttributionLabel(attribution);
    const staffPeopleList = staffPeople.length
        ? `<ul class="event-people" aria-label="Assigned staff">
            ${staffPeople
                .map(
                    (s) => `<li class="event-person">
                ${schedulePersonAvatarHtml(s)}
                <span>${esc(s.name)}</span>
              </li>`,
                )
                .join('')}
          </ul>`
        : `<p class="event-fact__value">None assigned</p>`;
    const stackAvatars = participantPeople
        .slice(0, 3)
        .map((p) => schedulePersonAvatarHtml(p, 'event-avatar-stack__avatar'))
        .join('');
    const participantsPanel =
        showParticipants
            ? `<div class="event-participants-panel" style="margin:12px 16px 0;border:1px solid var(--event-border-strong,#d9d4d2);border-radius:8px;background:#fff;padding:10px">
                ${
                    editing && canEdit
                        ? `<input type="search" class="event-field__control" data-ev-participant-query data-autofocus placeholder="Search roster…" value="${esc(participantQuery)}" style="margin-bottom:8px;min-height:36px" />`
                        : ''
                }
                ${
                    rosterLoading
                        ? `<p class="event-field__hint">Loading roster…</p>`
                        : filteredRoster.length
                          ? `<ul class="event-participants-list" style="list-style:none;margin:0;padding:0;max-height:200px;overflow:auto;display:grid;gap:4px">
                              ${filteredRoster
                                  .map((a) => {
                                      const on = selectedIds.has(a.id);
                                      return `<li>
                                        <button type="button" data-ev-toggle-participant="${esc(a.id)}" ${editing && canEdit ? '' : 'disabled'} style="display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;padding:8px 10px;border:1px solid ${on ? 'var(--event-ink,#111827)' : 'transparent'};border-radius:6px;background:${on ? '#f3f1ef' : 'transparent'};color:var(--event-ink,#111827);text-align:left;font-size:12px;cursor:${editing && canEdit ? 'pointer' : 'default'}">
                                          <span style="display:inline-flex;align-items:center;gap:8px">
                                            ${schedulePersonAvatarHtml(
                                                {
                                                    id: a.id,
                                                    name: a.name,
                                                    initials: a.initials || initialsFromName(a.name) || '?',
                                                    avatarUrl: a.avatarUrl,
                                                },
                                                'event-person__avatar',
                                            )}
                                            ${esc(a.name)}
                                          </span>
                                          <span style="font-size:10px;font-weight:650;color:var(--event-muted,#706d69)">${on ? 'Selected' : 'Add'}</span>
                                        </button>
                                      </li>`;
                                  })
                                  .join('')}
                            </ul>`
                          : `<p class="event-field__hint">${
                                !String(draft.programId || '').trim()
                                    ? 'Select a program to see accepted artists.'
                                    : rosterArtists.length
                                      ? 'No artists match this search.'
                                      : 'No accepted artists for this program yet.'
                            }</p>`
                }
                ${
                    editing && canEdit && selectedIds.size
                        ? `<button type="button" class="event-dialog__button" data-ev-clear-participants style="margin-top:8px">Clear all</button>`
                        : ''
                }
              </div>`
            : '';

    const viewDetails = `
      <div class="event-dialog__body" role="tabpanel">
        <section class="event-schedule" aria-label="Event schedule">
          <time class="event-date-tile" datetime="${esc(draft.date)}">
            <span class="event-date-tile__month">${esc(dateParts.month)}</span>
            <span class="event-date-tile__day">${esc(dateParts.day)}</span>
          </time>
          <div class="event-schedule__time">
            <p class="event-schedule__date">${esc(formatViewLongDate(draft.date))}</p>
            <p class="event-schedule__range">${esc(formatTimeRange(draft))}</p>
            <p class="event-schedule__meta">${esc(durationPhrase(draft))} <span>·</span> ${esc(tzLabel)}</p>
          </div>
          ${
              reminderText
                  ? `<div class="event-reminder">${ICONS.bell} ${esc(reminderText)}</div>`
                  : `<div class="event-reminder event-reminder--empty" aria-hidden="true"></div>`
          }
        </section>
        <div class="event-facts">
          <section class="event-fact">
            ${ICONS.pin.replace('<svg', '<svg class="event-fact__icon"')}
            <div>
              <p class="event-eyebrow">Location</p>
              <p class="event-fact__value">${esc(draft.locationName || '—')}</p>
            </div>
          </section>
          <section class="event-fact">
            ${ICONS.link.replace('<svg', '<svg class="event-fact__icon"')}
            <div>
              <p class="event-eyebrow">Relation</p>
              <p class="event-fact__value">${esc(relationLabel)}</p>
            </div>
          </section>
          <section class="event-fact event-fact--people">
            ${ICONS.users.replace('<svg', '<svg class="event-fact__icon"')}
            <div>
              <p class="event-eyebrow">Assigned staff</p>
              ${staffPeopleList}
            </div>
          </section>
          <button type="button" class="event-fact event-fact--participants" data-ev-artists aria-expanded="${showParticipants ? 'true' : 'false'}">
            ${ICONS.user.replace('<svg', '<svg class="event-fact__icon"')}
            <div>
              <p class="event-eyebrow">Artists</p>
              <div class="event-participants__content">
                <div class="event-avatar-stack" aria-hidden="true">${stackAvatars || '<span class="event-avatar-stack__avatar"></span>'}</div>
                <span class="event-participants__count">${selectedIds.size} participating artist${selectedIds.size === 1 ? '' : 's'}</span>
                <span class="event-participants__chevron">${ICONS.chevron}</span>
              </div>
            </div>
          </button>
        </div>
        ${participantsPanel}
        <section class="event-flier-view" aria-label="Event flier">
          <p class="event-eyebrow">Flier</p>
          ${
              String(draft.imageUrl || '').trim()
                  ? `<img class="event-flier-view__img" src="${esc(draft.imageUrl)}" alt="Event flier" />`
                  : `<p class="event-fact__value">No flier</p>`
          }
          <p class="event-flier-view__public ${draft.publicOnSite ? 'is-on' : ''}">
            ${draft.publicOnSite ? 'Shown on public site / journal' : 'Not on public site'}
          </p>
        </section>
        <section class="event-notes">
          ${ICONS.file}
          <div>
            <p class="event-eyebrow">Notes</p>
            <p class="event-notes__text">${esc(draft.notes) || '—'}</p>
          </div>
        </section>
      </div>`;

    const detailsForm = `
      <form class="event-form" onsubmit="return false">
        ${field('Event title', 'title', input('title', draft.title), true)}
        <div class="event-schedule-fields event-field--wide">
          ${field('Date', 'date', `<input class="event-field__control" id="ev-date" name="date" type="date" value="${esc(draft.date)}" />`)}
          ${field('Start time', 'startTime', `<input class="event-field__control" id="ev-startTime" name="startTime" type="time" step="60" value="${startTimeValue}" ${timeDisabled} />`)}
          ${field('End time', 'endTime', `<input class="event-field__control" id="ev-endTime" name="endTime" type="time" step="60" value="${endTimeValue}" ${timeDisabled} />`)}
        </div>
        <div class="event-field event-field--wide">
          <label class="event-public-toggle">
            <input type="checkbox" name="allDay" id="ev-allDay" ${draft.allDay ? 'checked' : ''} />
            <span>All day</span>
          </label>
        </div>
        ${field('Relation', 'relationKind', `<select class="event-field__control" id="ev-relationKind" name="relationKind" required>${SCHEDULE_RELATION_KINDS.map((k) => `<option value="${esc(k.id)}" ${(draft.relationKind || 'program') === k.id ? 'selected' : ''}>${esc(k.label)}</option>`).join('')}</select>`)}
        ${field('Program', 'programId', `<select class="event-field__control" id="ev-programId" name="programId">${programOpts}</select>`)}
        ${field('Timezone', 'timezone', `<div style="display:flex;gap:8px;align-items:center"><input type="hidden" name="timezone" id="ev-timezone" value="${esc(draft.timezone || getScheduleTimezonePreference())}" /><button type="button" class="event-dialog__button" data-ev-timezone style="flex:1;justify-content:flex-start">${esc(tzLabel)}</button></div>`)}
        ${field('Location', 'locationId', `<select class="event-field__control" id="ev-locationId" name="locationId">${locOpts}</select>`)}
        <div class="event-field event-field--wide">
          <span class="event-field__label">Assigned staff</span>
          ${staffHtml}
        </div>
        <div class="event-field event-field--wide">
          <span class="event-field__label">Artists</span>
          <button type="button" class="event-participants" data-ev-artists aria-expanded="${showParticipants ? 'true' : 'false'}">
            <span>${selectedIds.size} participant${selectedIds.size === 1 ? '' : 's'}</span>
            ${ICONS.chevron}
          </button>
          ${participantsPanel}
        </div>
        ${field('Notes', 'notes', `<textarea class="event-field__control" id="ev-notes" name="notes">${esc(draft.notes)}</textarea>`, true)}
        <div class="event-field event-field--wide event-flier-field">
          <span class="event-field__label">Flier image</span>
          <input type="hidden" name="imageUrl" id="ev-imageUrl" value="${esc(draft.imageUrl || '')}" />
          <div class="event-flier-field__row">
            <input type="file" id="ev-flier-file" class="event-flier-field__file" accept="image/*" ${editing && canEdit ? '' : 'disabled'} />
            <button type="button" class="event-dialog__button" data-ev-flier-pick ${editing && canEdit ? '' : 'disabled'}>Upload flier</button>
            ${
                String(draft.imageUrl || '').trim()
                    ? `<button type="button" class="event-dialog__button" data-ev-flier-clear ${editing && canEdit ? '' : 'disabled'}>Remove</button>`
                    : ''
            }
          </div>
          <p class="event-field__hint">Optional. Use a flyer / poster for the public event page.</p>
          ${
              String(draft.imageUrl || '').trim()
                  ? `<img class="event-flier-field__preview" src="${esc(draft.imageUrl)}" alt="Flier preview" />`
                  : ''
          }
        </div>
        <div class="event-field event-field--wide">
          <label class="event-public-toggle">
            <input type="checkbox" name="publicOnSite" id="ev-publicOnSite" ${draft.publicOnSite && !staffRelation ? 'checked' : ''} ${editing && canEdit && !staffRelation ? '' : 'disabled'} />
            <span>Show on public site / journal</span>
          </label>
          <p class="event-field__hint" data-ev-staff-public-hint ${staffRelation ? '' : 'hidden'}>
            Staff-relation events are Studio-only for staff and admin — they are not published to the public site.
          </p>
          <p class="event-field__hint" data-ev-public-hint ${staffRelation ? 'hidden' : ''}>When enabled, this event appears on the journal with RSVP (uses title, time, location, notes, and flier).</p>
        </div>
        ${field(
            'Reminder',
            'reminderMinutes',
            `<select class="event-field__control" id="ev-reminderMinutes" name="reminderMinutes">
                    <option value="" ${draft.reminderMinutes == null ? 'selected' : ''}>None</option>
                    <option value="15" ${draft.reminderMinutes === 15 ? 'selected' : ''}>15 minutes before</option>
                    <option value="30" ${draft.reminderMinutes === 30 ? 'selected' : ''}>30 minutes before</option>
                    <option value="60" ${draft.reminderMinutes === 60 ? 'selected' : ''}>1 hour before</option>
                  </select>`,
        )}
        <div class="event-field event-field--wide" style="grid-column:1/-1">
          <span class="event-field__label">Reminder email</span>
          <p class="event-field__hint" style="margin:0 0 8px">
            Sends to assigned staff (Team emails), participating artists with a contact email, and <strong>info@fusionart.world</strong>.
            ${
                draft.reminderSentAt
                    ? ` Last sent: ${esc(draft.reminderSentAt)}.`
                    : draft.reminderMinutes
                      ? ' Auto-sends once when Schedule is open in the reminder window.'
                      : ' Set a reminder time above for auto-send, or send manually anytime.'
            }
          </p>
          ${
              canEdit && draft.id
                  ? `<button type="button" class="event-dialog__button event-dialog__button--primary" data-ev-send-reminder>
                      ${draft.reminderSentAt ? 'Send reminder again' : 'Send reminder'}
                    </button>`
                  : canEdit
                    ? `<p class="event-field__hint">Save the event to enable Send reminder.</p>`
                    : ''
          }
        </div>
        ${field(
            'Status',
            'status',
            `<select class="event-field__control" id="ev-status" name="status">
                        <option value="confirmed" ${draft.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="awaiting_confirmation" ${draft.status === 'awaiting_confirmation' ? 'selected' : ''}>Awaiting confirmation</option>
                        <option value="draft" ${draft.status === 'draft' ? 'selected' : ''}>Draft</option>
                        <option value="cancelled" ${draft.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                      </select>`,
        )}
        ${field(
            'Color',
            'color',
            `<select class="event-field__control" id="ev-color" name="color">
                        <option value="sage" ${draft.color === 'sage' ? 'selected' : ''}>Sage</option>
                        <option value="blue" ${draft.color === 'blue' ? 'selected' : ''}>Blue</option>
                        <option value="sand" ${draft.color === 'sand' ? 'selected' : ''}>Sand</option>
                        <option value="blush" ${draft.color === 'blush' ? 'selected' : ''}>Blush</option>
                      </select>`,
        )}
        ${
            conflict
                ? `<div class="event-conflict event-field--wide" style="grid-column:1/-1">
                    <div class="event-conflict__copy">${ICONS.clock}<span>Overlaps with ${esc(conflict.eventTitle)} by ${conflict.overlapMinutes} minutes</span></div>
                    <button type="button" class="event-conflict__action" data-ev-review-conflict>Review conflict</button>
                  </div>`
                : ''
        }
      </form>
      ${
          showConflictReview && conflict
              ? `<div style="margin:0 24px 16px;padding:14px;border:1px solid var(--event-border);border-radius:10px;background:#fff">
                  <strong style="font-size:13px">Conflict review</strong>
                  <p style="margin:8px 0;font-size:12px;color:var(--event-muted)">${esc(draft.title)} (${esc(formatTimeRange(draft))}) overlaps ${esc(conflict.eventTitle)} (${esc(conflict.startTime)}–${esc(conflict.endTime)}).</p>
                  <div style="display:flex;flex-wrap:wrap;gap:8px">
                    <button type="button" class="event-dialog__button" data-ev-conflict-keep>Keep anyway</button>
                    <button type="button" class="event-dialog__button" data-ev-conflict-open-other>Open ${esc(conflict.eventTitle)}</button>
                    <button type="button" class="event-dialog__button" data-ev-conflict-close>Close</button>
                  </div>
                </div>`
              : ''
      }
    `;

    const activityHtml = `
      <div style="padding:20px 24px">
        <ol style="margin:0;padding:0;list-style:none">
          ${(activity || [])
              .map(
                  (a) => `<li style="padding:10px 0;border-bottom:1px solid var(--event-border)">
              <strong style="display:block;font-size:12px">${esc(a.text)}</strong>
              <span style="font-size:11px;color:var(--event-muted)">${esc(a.at)}</span>
            </li>`,
              )
              .join('') || '<li style="color:var(--event-muted);font-size:12px">No activity yet.</li>'}
        </ol>
      </div>`;

    const overflowMenu = showOverflow
        ? `<div style="position:absolute;right:0;top:100%;z-index:2;min-width:160px;padding:6px;background:#fff;border:1px solid var(--event-border);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.12)">
            ${canEdit && draft.id ? `<button type="button" class="event-dialog__button" style="width:100%;justify-content:flex-start;border:0" data-ev-dup>Duplicate event</button>` : ''}
            ${draft.id ? `<button type="button" class="event-dialog__button" style="width:100%;justify-content:flex-start;border:0" data-ev-copy-link>Copy link</button>` : ''}
            <button type="button" class="event-dialog__button" style="width:100%;justify-content:flex-start;border:0" data-ev-ics>Export .ics</button>
          </div>`
        : '';

    const detailsBody = editing
        ? detailsForm
        : tab === 'details'
          ? viewDetails
          : '';

    if (!editing) {
        return `
    <section class="event-dialog event-dialog--view" role="dialog" aria-modal="true" aria-labelledby="${titleId}" aria-describedby="${descId}">
      <header class="event-dialog__header">
        <div class="event-dialog__identity">
          <div class="event-dialog__status-row">
            <span class="event-dialog__status-dot" aria-hidden="true"></span>
            <span>${esc(statusLabel(draft.status))}</span>
            <span class="event-dialog__attribution">${esc(attrLabel)}</span>
          </div>
          <h1 class="event-dialog__title" id="${titleId}">${esc(draft.title || 'Event')}</h1>
          <p class="event-dialog__program" id="${descId}">${esc(draft.programName || '—')}</p>
        </div>
        <div class="event-dialog__header-actions">
          ${
              canEdit
                  ? `<button type="button" class="event-dialog__button" data-ev-edit>${ICONS.pencil} <span class="event-button__label">Edit event</span></button>`
                  : ''
          }
          <div style="position:relative">
            <button type="button" class="event-dialog__icon-button" data-ev-overflow aria-label="More actions">${ICONS.more}</button>
            ${overflowMenu}
          </div>
          <button type="button" class="event-dialog__icon-button" data-ev-close aria-label="Close">${ICONS.close}</button>
        </div>
      </header>
      <div class="event-dialog__tabs" role="tablist" aria-label="Event sections">
        <button type="button" class="event-dialog__tab" role="tab" data-ev-tab="details" aria-selected="${tab === 'details' ? 'true' : 'false'}">Details</button>
        <button type="button" class="event-dialog__tab" role="tab" data-ev-tab="activity" aria-selected="${tab === 'activity' ? 'true' : 'false'}">Activity</button>
      </div>
      <div class="event-dialog__scroll">
        ${tab === 'details' ? detailsBody : activityHtml}
      </div>
      <footer class="event-dialog__footer">
        ${canEdit && draft.id ? `<button type="button" class="event-dialog__danger" data-ev-delete>Delete event</button>` : ''}
        <button type="button" class="event-dialog__button" data-ev-ics>${ICONS.calendarIcs} Download .ics</button>
        <span class="event-dialog__footer-spacer"></span>
        <button type="button" class="event-dialog__button event-dialog__button--primary" data-ev-done>Done</button>
      </footer>
      <div class="event-live" aria-live="polite">${esc(liveMessage)}</div>
    </section>`;
    }

    return `
    <section class="event-dialog" role="dialog" aria-modal="true" aria-labelledby="${titleId}" aria-describedby="${descId}">
      <header class="event-dialog__header">
        <div class="event-dialog__identity">
          <span class="event-dialog__color" aria-hidden="true"></span>
          <div>
            <h2 class="event-dialog__title" id="${titleId}">${esc(draft.title || (isCreate ? 'New event' : 'Event'))}</h2>
            <p class="event-dialog__meta" id="${descId}">${esc(draft.programName)} · ${esc(statusLabel(draft.status))}</p>
          </div>
        </div>
        <div class="event-dialog__header-actions">
          <div style="position:relative">
            <button type="button" class="event-dialog__icon-button" data-ev-overflow aria-label="More actions">${ICONS.more}</button>
            ${overflowMenu}
          </div>
          <button type="button" class="event-dialog__icon-button" data-ev-close aria-label="Close">${ICONS.close}</button>
        </div>
      </header>
      <div class="event-dialog__tabs" role="tablist">
        <button type="button" class="event-dialog__tab" role="tab" data-ev-tab="details" aria-selected="${tab === 'details' ? 'true' : 'false'}">Details</button>
        <button type="button" class="event-dialog__tab" role="tab" data-ev-tab="activity" aria-selected="${tab === 'activity' ? 'true' : 'false'}">Activity</button>
      </div>
      <div class="event-dialog__scroll">
        ${tab === 'details' ? detailsForm : activityHtml}
      </div>
      <footer class="event-dialog__footer">
        <div class="event-dialog__footer-start">
          ${canEdit && draft.id ? `<button type="button" class="event-dialog__danger" data-ev-delete>Delete event</button>` : ''}
        </div>
        <div class="event-dialog__footer-end">
          <button type="button" class="event-dialog__button" data-ev-cancel>Cancel</button>
          <button type="button" class="event-dialog__button event-dialog__button--primary" data-ev-save>${isCreate ? 'Save event' : 'Save changes'}</button>
        </div>
      </footer>
      <div class="event-live" aria-live="polite">${esc(liveMessage)}</div>
    </section>`;
}

/**
 * @param {import('../../utils/scheduleModel.js').CalendarEvent} draft
 */
function downloadIcs(draft) {
    const ics = buildSingleEventIcs(draft, getScheduleTimezonePreference());
    downloadIcsFile(ics, `${(draft.title || 'event').replace(/\s+/g, '-').toLowerCase()}.ics`);
}
