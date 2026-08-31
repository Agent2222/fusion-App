/**
 * Member Settings → Programs → Calendar (slot-secured + schedule-live programs).
 */
import '../../styles/studioSchedule.css';
import '../../styles/studioScheduleEventModal.css';
import {
    buildMonthCells,
    formatAgendaHeading,
    formatMonthYear,
    formatTime12,
    parseYmd,
    scheduleChipCssVars,
} from '../../utils/scheduleModel.js';
import {
    buildMultiEventIcs,
    downloadIcsFile,
    formatNewestScheduleUpdated,
    getScheduleTimezonePreference,
    openScheduleTimezonePicker,
    scheduleTimezoneButtonLabel,
} from '../../utils/scheduleTimezones.js';
import { openStudioModal } from '../../utils/studioModal.js';
import {
    getPrograms,
    listMyScheduleEvents,
    listProgramScheduleLiveStudio,
    listScheduleLocationsMember,
    memberCreateProgramEvent,
} from '../../utils/database.js';
import { listFusionScheduleStaff } from '../../utils/fusionStaffDirectory.js';
import { openScheduleEventModal } from '../studio/scheduleEventModal.js';
import { schedulePersonAvatarHtml } from '../../utils/schedulePeople.js';
import { initialsFromName } from '../../utils/scheduleModel.js';

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
 * UI label for member event kinds (API still uses adventure).
 * @param {string} eventKind
 */
function memberEventKindLabel(eventKind) {
    const k = String(eventKind || '').trim();
    if (k === 'adventure') return 'experience';
    if (k === 'workshop') return 'workshop';
    return k || 'event';
}

/**
 * @param {'workshop' | 'adventure'} eventKind
 */
function memberCreateCopy(eventKind) {
    if (eventKind === 'adventure') {
        return {
            title: 'Create experience',
            subtitle:
                'Create an experience to experience with your cohort. Staff will review it before it appears on the program calendar.',
            placeholder: 'Experience title',
            submit: 'Submit experience',
        };
    }
    return {
        title: 'Create workshop',
        subtitle: 'Create a workshop to run with your cohort. Staff will review it before it appears on the program calendar.',
        placeholder: 'Workshop title',
        submit: 'Submit workshop',
    };
}

/**
 * @param {Set<string>} securedIds
 * @param {Record<string, boolean>} liveMap
 * @param {{ id: string, name: string }[]} programs
 */
export function mpdCalendarEligiblePrograms(securedIds, liveMap, programs) {
    const names = new Map(programs.map((p) => [p.id, p.name]));
    return [...securedIds]
        .filter((id) => liveMap[id] === true)
        .map((id) => ({ id, name: names.get(id) || id }));
}

/**
 * @param {object} payments
 * @param {(payments: object) => Set<string>} slotSecuredFn
 * @returns {Promise<{ showTab: boolean, eligible: { id: string, name: string }[] }>}
 */
export async function resolveMemberCalendarGate(payments, slotSecuredFn) {
    const secured = slotSecuredFn(payments);
    if (!secured.size) return { showTab: false, eligible: [] };
    let liveMap = {};
    try {
        liveMap = await listProgramScheduleLiveStudio();
    } catch {
        liveMap = {};
    }
    /** @type {{ id: string, name: string }[]} */
    let programs = [];
    try {
        const rows = await getPrograms();
        programs = (Array.isArray(rows) ? rows : []).map((p) => ({
            id: String(p?.id || p?.programId || '').trim(),
            name: String(p?.title || p?.name || p?.enCard?.focus || p?.id || '').trim(),
        })).filter((p) => p.id);
    } catch {
        programs = [];
    }
    const eligible = mpdCalendarEligiblePrograms(secured, liveMap, programs);
    return { showTab: eligible.length > 0, eligible };
}

/**
 * @param {HTMLElement} root
 * @param {{
 *   eligiblePrograms: { id: string, name: string }[],
 *   canCreate: boolean,
 *   autoDownloadIcs?: boolean,
 * }} opts
 */
export async function mountMemberProgramCalendar(root, opts) {
    const eligible = Array.isArray(opts.eligiblePrograms) ? opts.eligiblePrograms : [];
    const canCreate = Boolean(opts.canCreate) && eligible.length > 0;
    if (!eligible.length) {
        root.innerHTML = `<div class="mpd-program-placeholder"><h3>Calendar</h3><p class="studio-muted">Your program calendar appears when a slot-secured program has its schedule live.</p></div>`;
        return;
    }

    const today = (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();
    /** @type {{ year: number, month: number, selectedDate: string, query: string }} */
    let state = {
        year: parseYmd(today).y,
        month: parseYmd(today).m,
        selectedDate: today,
        query: '',
    };
    /** @type {any[]} */
    let events = [];
    let loadError = '';

    const paint = () => {
        const confirmed = events.filter((e) => e.status === 'confirmed');
        const pendingMine = events.filter((e) => e.status === 'awaiting_confirmation');
        const q = state.query.trim().toLowerCase();
        const filtered = confirmed.filter((e) => {
            if (!q) return true;
            return `${e.title} ${e.locationName} ${e.notes}`.toLowerCase().includes(q);
        });
        const dayEvents = filtered.filter((e) => e.date === state.selectedDate);
        const lastUpdated = formatNewestScheduleUpdated(filtered.length ? filtered : events);
        const tzLabel = scheduleTimezoneButtonLabel(getScheduleTimezonePreference());

        root.innerHTML = `
        <div class="studio-schedule-page mpd-member-calendar">
        <div class="schedule-page">
          <header class="schedule-hero">
            <div>
              <h3 class="schedule-hero__title" style="font-size:1.35rem;margin:0">Program calendar</h3>
              <p class="schedule-hero__subtitle">Confirmed events for your secured programs.</p>
            </div>
            <div class="schedule-hero__actions">
              <button type="button" class="button" data-mpc-action="timezone">${esc(tzLabel)}</button>
              <button type="button" class="button button--ics" data-mpc-action="download-ics">Download program calendar</button>
              ${
                  canCreate
                      ? `<button type="button" class="button button--primary" data-mpc-action="create-workshop">Create workshop</button>
                         <button type="button" class="button button--primary" data-mpc-action="create-experience">Create experience</button>`
                      : ''
              }
            </div>
          </header>
          <p class="schedule-last-updated" style="margin:0 0 12px">Last updated: ${esc(lastUpdated)}</p>
          ${loadError ? `<p class="studio-muted" style="color:#8c343c">${esc(loadError)}</p>` : ''}
          <section class="schedule-workspace">
            <div class="calendar-card">
              <div class="calendar-heading">
                <h2>${esc(formatMonthYear(state.year, state.month))}</h2>
                <div class="calendar-heading__arrows">
                  <button type="button" class="icon-button" data-mpc-action="prev" aria-label="Previous">‹</button>
                  <button type="button" class="icon-button" data-mpc-action="next" aria-label="Next">›</button>
                </div>
              </div>
              <div class="calendar-scroll">${monthHtml(state, filtered)}</div>
            </div>
            <aside class="schedule-rail">
              ${agendaHtml(state.selectedDate, dayEvents)}
              ${eventStatusHtml(pendingMine)}
            </aside>
          </section>
        </div>
        </div>`;
        bind();
    };

    const bind = () => {
        root.querySelector('[data-mpc-action="prev"]')?.addEventListener('click', () => {
            let { year, month } = state;
            month -= 1;
            if (month < 1) {
                month = 12;
                year -= 1;
            }
            state = { ...state, year, month };
            paint();
        });
        root.querySelector('[data-mpc-action="next"]')?.addEventListener('click', () => {
            let { year, month } = state;
            month += 1;
            if (month > 12) {
                month = 1;
                year += 1;
            }
            state = { ...state, year, month };
            paint();
        });
        root.querySelector('[data-mpc-action="timezone"]')?.addEventListener('click', async () => {
            const picked = await openScheduleTimezonePicker(openStudioModal, {
                currentId: getScheduleTimezonePreference(),
            });
            if (picked) paint();
        });
        root.querySelector('[data-mpc-action="download-ics"]')?.addEventListener('click', () => {
            const confirmed = events.filter((e) => e.status === 'confirmed');
            const ics = buildMultiEventIcs(
                confirmed,
                getScheduleTimezonePreference(),
                'Fusion Program Calendar',
            );
            downloadIcsFile(ics, 'fusion-program-calendar.ics');
        });
        root.querySelectorAll('[data-mpc-day]').forEach((el) => {
            el.addEventListener('click', () => {
                const date = el.getAttribute('data-mpc-day') || state.selectedDate;
                state = { ...state, selectedDate: date };
                paint();
            });
        });
        const openEventView = (id, returnFocus) => {
            const ev = events.find((e) => e.id === id);
            if (!ev) return;
            openScheduleEventModal({
                event: ev,
                mode: 'view',
                canEdit: false,
                allowMemberRsvp: true,
                returnFocus: returnFocus instanceof HTMLElement ? returnFocus : null,
                onChanged: () => {
                    void reload();
                },
            });
        };
        root.querySelectorAll('[data-mpc-open-event]').forEach((el) => {
            const open = (e) => {
                e.stopPropagation();
                e.preventDefault();
                const id = el.getAttribute('data-mpc-open-event');
                if (id) openEventView(id, el);
            };
            el.addEventListener('click', open);
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') open(e);
            });
        });
        root.querySelector('[data-mpc-action="create-workshop"]')?.addEventListener('click', () => {
            void openMemberCreateModal('workshop');
        });
        root.querySelector('[data-mpc-action="create-experience"]')?.addEventListener('click', () => {
            void openMemberCreateModal('adventure');
        });
    };

    /**
     * @param {'workshop' | 'adventure'} eventKind
     */
    const openMemberCreateModal = async (eventKind) => {
        const copy = memberCreateCopy(eventKind);
        const kindLabel = memberEventKindLabel(eventKind);
        const progOpts = eligible
            .map(
                (p) =>
                    `<option value="${esc(p.id)}" ${eligible.length === 1 ? 'selected' : ''}>${esc(p.name)}</option>`,
            )
            .join('');

        /** @type {{ id: string, name: string }[]} */
        let locations = [];
        try {
            locations = await listScheduleLocationsMember();
        } catch {
            locations = [];
        }
        /** @type {{ id: string, name: string, initials: string, avatarUrl?: string }[]} */
        let staffList = [];
        try {
            staffList = (await listFusionScheduleStaff()).map((s) => ({
                id: s.id,
                name: s.name,
                initials: s.initials || initialsFromName(s.name) || '?',
                avatarUrl: /** @type {any} */ (s).avatarUrl,
            }));
        } catch {
            staffList = [];
        }
        /** @type {Set<string>} */
        const selectedStaffIds = new Set();

        const locOpts = locations.length
            ? locations.map((l) => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join('')
            : `<option value="">No locations yet — use custom below</option>`;

        const renderStaffPicker = () => {
            const panel = backdrop.querySelector('[data-mpc-staff-panel]');
            if (!panel) return;
            panel.innerHTML = staffList.length
                ? `<ul class="event-participants-list" style="list-style:none;margin:0;padding:0;max-height:180px;overflow:auto;display:grid;gap:4px">
                    ${staffList
                        .map((s) => {
                            const on = selectedStaffIds.has(s.id);
                            return `<li>
                              <button type="button" data-mpc-toggle-staff="${esc(s.id)}" style="display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;padding:8px 10px;border:1px solid ${on ? 'var(--event-ink,#111827)' : 'transparent'};border-radius:6px;background:${on ? '#f3f1ef' : 'transparent'};color:var(--event-ink,#111827);text-align:left;font-size:12px;cursor:pointer">
                                <span style="display:inline-flex;align-items:center;gap:8px">
                                  ${schedulePersonAvatarHtml(s, 'event-person__avatar')}
                                  ${esc(s.name)}
                                </span>
                                <span style="font-size:10px;font-weight:650;color:var(--event-muted,#706d69)">${on ? 'Selected' : 'Add'}</span>
                              </button>
                            </li>`;
                        })
                        .join('')}
                  </ul>
                  <p class="event-field__hint" style="margin:8px 0 0">${selectedStaffIds.size} staff assigned</p>`
                : `<p class="event-field__hint">No Fusion staff available.</p>`;
            panel.querySelectorAll('[data-mpc-toggle-staff]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-mpc-toggle-staff');
                    if (!id) return;
                    if (selectedStaffIds.has(id)) selectedStaffIds.delete(id);
                    else selectedStaffIds.add(id);
                    renderStaffPicker();
                });
            });
        };

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const backdrop = document.createElement('div');
        backdrop.className = 'event-dialog-backdrop';
        backdrop.setAttribute('data-mpc-create-modal', '1');
        backdrop.innerHTML = `
          <div class="event-dialog" role="dialog" aria-modal="true" aria-labelledby="mpc-create-title" aria-describedby="mpc-create-desc">
            <header class="event-dialog__header">
              <div class="event-dialog__identity">
                <span class="event-dialog__color" aria-hidden="true"></span>
                <div>
                  <h2 class="event-dialog__title" id="mpc-create-title">${esc(copy.title)}</h2>
                  <p class="event-dialog__meta" id="mpc-create-desc">${esc(copy.subtitle)}</p>
                </div>
              </div>
              <div class="event-dialog__header-actions">
                <button type="button" class="event-dialog__icon-button" data-mpc-cancel aria-label="Close">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
                </button>
              </div>
            </header>
            <div class="event-dialog__scroll">
              <form id="mpc-create-form" class="event-form" onsubmit="return false">
                <div class="event-field event-field--wide">
                  <label class="event-field__label" for="mpc-programId">Program</label>
                  <select class="event-field__control" id="mpc-programId" name="programId" required ${eligible.length === 1 ? 'disabled' : ''}>${progOpts}</select>
                  ${eligible.length === 1 ? `<input type="hidden" name="programId" value="${esc(eligible[0].id)}" />` : ''}
                </div>
                <div class="event-field event-field--wide">
                  <label class="event-field__label" for="mpc-title">Title</label>
                  <input class="event-field__control" id="mpc-title" name="title" required maxlength="120" placeholder="${esc(copy.placeholder)}" data-autofocus />
                </div>
                <div class="event-field">
                  <label class="event-field__label" for="mpc-date">Date</label>
                  <input class="event-field__control" id="mpc-date" name="date" type="date" required value="${esc(state.selectedDate)}" />
                </div>
                <div class="event-field">
                  <label class="event-field__label" for="mpc-timezone">Timezone</label>
                  <div class="event-field__control" id="mpc-timezone" style="display:flex;align-items:center;background:#faf8f7">${esc(scheduleTimezoneButtonLabel(getScheduleTimezonePreference()))}</div>
                </div>
                <div class="event-field">
                  <label class="event-field__label" for="mpc-startTime">Start</label>
                  <input class="event-field__control" id="mpc-startTime" name="startTime" type="time" value="10:00" required />
                </div>
                <div class="event-field">
                  <label class="event-field__label" for="mpc-endTime">End</label>
                  <input class="event-field__control" id="mpc-endTime" name="endTime" type="time" value="12:00" required />
                </div>
                <div class="event-field event-field--wide">
                  <label class="event-field__label" for="mpc-locationId">Location</label>
                  <select class="event-field__control" id="mpc-locationId" name="locationId" ${locations.length ? '' : 'disabled'}>${locOpts}</select>
                </div>
                <div class="event-field event-field--wide">
                  <label class="event-field__label" for="mpc-locationCustom">Or custom location</label>
                  <input class="event-field__control" id="mpc-locationCustom" name="locationCustom" placeholder="${locations.length ? 'Optional free-text location' : 'Required when catalog is empty'}" ${locations.length ? '' : 'required'} />
                </div>
                <div class="event-field event-field--wide">
                  <span class="event-field__label">Assigned staff</span>
                  <div data-mpc-staff-panel style="margin-top:6px;border:1px solid var(--event-border-strong,#d9d4d2);border-radius:8px;background:#fff;padding:10px"></div>
                </div>
                <div class="event-field event-field--wide">
                  <label class="event-field__label" for="mpc-notes">Notes</label>
                  <textarea class="event-field__control" id="mpc-notes" name="notes" rows="3" maxlength="2000"></textarea>
                </div>
                <p class="event-field__hint event-field--wide" style="margin:0">
                  Submitted as a <strong>${esc(kindLabel)}</strong> for staff approval. Relation is locked to your program.
                </p>
                <p class="event-field__hint event-field--wide" data-mpc-msg style="margin:0;min-height:1.2em;color:var(--event-danger,#d92d31)"></p>
              </form>
            </div>
            <footer class="event-dialog__footer">
              <div class="event-dialog__footer-spacer"></div>
              <div class="event-dialog__footer-end">
                <button type="button" class="event-dialog__button" data-mpc-cancel>Cancel</button>
                <button type="submit" form="mpc-create-form" class="event-dialog__button event-dialog__button--primary" data-mpc-submit>${esc(copy.submit)}</button>
              </div>
            </footer>
          </div>`;
        document.body.appendChild(backdrop);
        renderStaffPicker();

        /** @type {((e: KeyboardEvent) => void) | null} */
        let onKey = null;
        const close = () => {
            if (onKey) document.removeEventListener('keydown', onKey);
            onKey = null;
            backdrop.remove();
            document.body.style.overflow = previousOverflow;
        };

        onKey = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                close();
            }
        };
        document.addEventListener('keydown', onKey);

        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) close();
        });
        backdrop.querySelectorAll('[data-mpc-cancel]').forEach((btn) => {
            btn.addEventListener('click', () => close());
        });

        queueMicrotask(() => {
            const focusEl = backdrop.querySelector('[data-autofocus]');
            if (focusEl instanceof HTMLElement) focusEl.focus();
        });

        backdrop.querySelector('#mpc-create-form')?.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const form = /** @type {HTMLFormElement} */ (ev.target);
            const fd = new FormData(form);
            const msg = backdrop.querySelector('[data-mpc-msg]');
            const submitBtn = backdrop.querySelector('[data-mpc-submit]');
            const programId = String(fd.get('programId') || eligible[0]?.id || '').trim();
            const locationCustom = String(fd.get('locationCustom') || '').trim();
            const catalogId = String(fd.get('locationId') || '').trim();
            const locationId = locationCustom ? 'loc-custom' : catalogId;
            const locationName =
                locationCustom ||
                locations.find((l) => l.id === locationId)?.name ||
                locationId;
            if (!locationId || !locationName) {
                if (msg) msg.textContent = 'Choose a location or enter a custom location.';
                return;
            }
            const assignedStaff = staffList
                .filter((s) => selectedStaffIds.has(s.id))
                .map((s) => ({
                    id: s.id,
                    name: s.name,
                    initials: s.initials || initialsFromName(s.name) || '?',
                }));
            try {
                if (msg) msg.textContent = 'Submitting…';
                if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
                await memberCreateProgramEvent({
                    programId,
                    eventKind,
                    title: String(fd.get('title') || ''),
                    date: String(fd.get('date') || ''),
                    startTime: String(fd.get('startTime') || '10:00'),
                    endTime: String(fd.get('endTime') || '12:00'),
                    allDay: false,
                    timezone: getScheduleTimezonePreference(),
                    locationId,
                    locationName,
                    notes: String(fd.get('notes') || ''),
                    programName: eligible.find((p) => p.id === programId)?.name || '',
                    assignedStaff,
                });
                close();
                await reload();
            } catch (err) {
                if (msg) msg.textContent = err instanceof Error ? err.message : String(err);
                if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
            }
        });
    };

    const reload = async () => {
        loadError = '';
        try {
            events = await listMyScheduleEvents();
        } catch (err) {
            events = [];
            loadError = err instanceof Error ? err.message : String(err);
        }
        paint();
    };

    await reload();
    const hash =
        typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '').toLowerCase() : '';
    const shouldDownload =
        Boolean(opts.autoDownloadIcs) ||
        hash === 'calendar-download' ||
        hash === 'programs-calendar-download';
    if (shouldDownload) {
        const confirmed = events.filter((e) => e.status === 'confirmed');
        if (confirmed.length) {
            const ics = buildMultiEventIcs(
                confirmed,
                getScheduleTimezonePreference(),
                'Fusion Program Calendar',
            );
            downloadIcsFile(ics, 'fusion-program-calendar.ics');
        }
        if (typeof history !== 'undefined' && history.replaceState && typeof window !== 'undefined') {
            try {
                history.replaceState(
                    null,
                    '',
                    `${window.location.pathname}${window.location.search}#calendar`,
                );
            } catch {
                /* ignore */
            }
        }
    }
}

/**
 * @param {{ year: number, month: number, selectedDate: string }} state
 * @param {any[]} events
 */
function monthHtml(state, events) {
    const cells = buildMonthCells(state.year, state.month);
    const byDate = new Map();
    for (const e of events) {
        if (!byDate.has(e.date)) byDate.set(e.date, []);
        byDate.get(e.date).push(e);
    }
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        .map((d) => `<div class="weekday">${d}</div>`)
        .join('');
    const days = cells
        .map((cell) => {
            const list = byDate.get(cell.date) || [];
            const chips = list
                .slice(0, 3)
                .map((e) => {
                    return `<span class="event-chip" role="button" tabindex="0" data-mpc-open-event="${esc(e.id)}" style="${esc(scheduleChipCssVars(e.color))}" title="${esc(e.title)}">${esc(e.title)}</span>`;
                })
                .join('');
            const selected = cell.date === state.selectedDate ? ' calendar-day--selected' : '';
            const outside = cell.inMonth ? '' : ' calendar-day--outside';
            return `<button type="button" class="calendar-day${selected}${outside}" data-mpc-day="${esc(cell.date)}">
        <span class="calendar-day__number">${cell.day}</span>
        ${chips}
      </button>`;
        })
        .join('');
    return `<div class="month-grid"><div class="month-grid__weekdays">${weekdays}</div><div class="month-grid__days">${days}</div></div>`;
}

/**
 * @param {string} date
 * @param {any[]} dayEvents
 */
function agendaHtml(date, dayEvents) {
    const items = dayEvents
        .map((e) => {
            const time = e.allDay ? 'All day' : `${formatTime12(e.startTime)} – ${formatTime12(e.endTime)}`;
            return `<li class="agenda-item">
        <button type="button" class="agenda-item__content" data-mpc-open-event="${esc(e.id)}" title="${esc(e.title)}">
          <strong class="agenda-item__title">${esc(e.title || 'Untitled event')}</strong>
          <span>${esc(time)} · ${esc(e.locationName || '')}</span>
        </button>
      </li>`;
        })
        .join('');
    return `<section class="agenda-card">
      <div class="rail-heading"><h2>${esc(formatAgendaHeading(date))}</h2></div>
      <ul class="agenda-list">${items || '<li class="agenda-item"><div class="agenda-item__content"><strong>No events</strong><span>Select another day</span></div></li>'}</ul>
    </section>`;
}

/**
 * @param {any[]} pending
 */
function eventStatusHtml(pending) {
    const rows = pending
        .map(
            (e) => `<button type="button" class="attention-item attention-item--warning" data-mpc-open-event="${esc(e.id)}" style="padding:12px 16px;width:100%;text-align:left;cursor:pointer;border:0;font:inherit;color:inherit">
        <span class="attention-item__content">
          <strong>${esc(e.title)}</strong>
          <span>${esc(memberEventKindLabel(e.eventKind))} · ${esc(e.date)} · awaiting confirmation</span>
        </span>
      </button>`,
        )
        .join('');
    return `<section class="attention-card">
      <div class="rail-heading"><h2>Event Status</h2></div>
      <div class="attention-list">${rows || '<p class="studio-muted" style="padding:12px 16px;font-size:12px">No pending workshop or experience submissions.</p>'}</div>
    </section>`;
}
