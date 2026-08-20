/**
 * Studio → Schedule: calendar workspace + agenda rail (Motoko-backed).
 */
import '../../styles/studioSchedule.css';
import { studioFeatureAccess } from '../../utils/studioShellState.js';
import {
    SCHEDULE_DOT_HEX,
    buildMonthCells,
    eventDurationLabel,
    formatAgendaHeading,
    formatMonthYear,
    formatTime12,
    parseYmd,
    weekRangeContaining,
    addDaysYmd,
} from '../../utils/scheduleModel.js';
import {
    SCHEDULE_TEAMS,
    computeAttentionItems,
    computeStats,
    eventsForDate,
    getScheduleLoadState,
    getScheduleLocations,
    getScheduleProgramOptions,
    getScheduleProgramPreference,
    listEvents,
    loadScheduleEvents,
    scheduleTodayYmd,
    setScheduleProgramPreference,
    subscribeSchedule,
} from '../../utils/scheduleStore.js';
import {
    buildMultiEventIcs,
    downloadIcsFile,
    formatNewestScheduleUpdated,
    getScheduleTimezonePreference,
    openScheduleTimezonePicker,
    scheduleTimezoneButtonLabel,
} from '../../utils/scheduleTimezones.js';
import { openStudioModal } from '../../utils/studioModal.js';
import { openScheduleEventModal } from './scheduleEventModal.js';
import { openScheduleLocationsModal } from './scheduleLocationsModal.js';
import { openScheduleAttentionReview } from './scheduleAttentionModal.js';

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

const SVG = {
    search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>`,
    plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
    chevronL: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>`,
    chevronR: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`,
    chevron: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`,
    settings: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
    calendar: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
    bars: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 20V10M12 20V4M20 20v-7"/></svg>`,
    clock: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
    alert: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3l10 18H2L12 3z"/><path d="M12 10v4M12 17h.01"/></svg>`,
    more: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>`,
};

/** @type {{
 *   year: number,
 *   month: number,
 *   selectedDate: string,
 *   view: 'month' | 'week' | 'timeline',
 *   programId: string,
 *   team: string,
 *   locationId: string,
 *   query: string,
 *   searchOpen: boolean,
 * } | null} */
let uiState = null;

/** @type {(() => void) | null} */
let unsub = null;

function defaultState() {
    const today = scheduleTodayYmd();
    const { y, m } = parseYmd(today);
    return {
        year: y,
        month: m,
        selectedDate: today,
        view: /** @type {'month'} */ ('month'),
        programId: '',
        team: '',
        locationId: '',
        query: '',
        searchOpen: false,
    };
}

/**
 * @returns {string}
 */
export function renderSchedule() {
    const access = studioFeatureAccess('schedule');
    if (!access.visible) {
        return `<div class="studio-section"><p class="studio-muted">You do not have access to Schedule.</p></div>`;
    }
    return `<div class="studio-schedule-page" id="studio-schedule-root" data-can-edit="${access.canEdit ? '1' : '0'}"></div>`;
}

/**
 * @param {HTMLElement} mainEl
 */
export async function initSchedule(mainEl) {
    const root = mainEl.querySelector('#studio-schedule-root');
    if (!(root instanceof HTMLElement)) return;
    if (unsub) {
        unsub();
        unsub = null;
    }
    uiState = defaultState();

    const paint = () => {
        if (!uiState || !(root instanceof HTMLElement)) return;
        const load = getScheduleLoadState();
        if (load.state === 'loading') {
            root.innerHTML = `<div class="schedule-page"><p class="studio-muted" style="padding:24px">Loading schedule…</p></div>`;
            return;
        }
        if (load.state === 'error') {
            root.innerHTML = `<div class="schedule-page">
              <p class="studio-muted" style="padding:24px">${esc(load.error || 'Failed to load schedule')}</p>
              <p style="padding:0 24px 24px"><button type="button" class="button button--primary" data-sch-retry>Retry</button></p>
            </div>`;
            root.querySelector('[data-sch-retry]')?.addEventListener('click', () => {
                loadScheduleEvents().catch(() => {});
            });
            return;
        }
        root.innerHTML = buildPageHtml(uiState, root.dataset.canEdit === '1');
        bindPage(root);
    };

    unsub = subscribeSchedule(paint);
    paint();
    try {
        await loadScheduleEvents();
    } catch {
        /* paint shows error via load state */
    }

    const openFromHash = () => {
        try {
            const hash = String(window.location.hash || '');
            const q = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
            const params = new URLSearchParams(q);
            const eventId = params.get('event');
            if (eventId) {
                openScheduleEventModal({
                    eventId,
                    mode: 'view',
                    canEdit: root.dataset.canEdit === '1',
                    onChanged: paint,
                });
            }
        } catch {
            /* ignore */
        }
    };
    queueMicrotask(openFromHash);
}

/**
 * @param {NonNullable<typeof uiState>} state
 * @param {boolean} canEdit
 */
function buildPageHtml(state, canEdit) {
    const filters = {
        programId: state.programId,
        team: state.team,
        locationId: state.locationId,
        query: state.query,
    };
    const events = listEvents(filters);
    const stats = computeStats(events);
    const attention = computeAttentionItems(events);
    const dayEvents = eventsForDate(state.selectedDate, events);

    return `
    <div class="schedule-page">
      <nav class="schedule-breadcrumbs" aria-label="Breadcrumb">
        <a href="#overview">Studio</a><span aria-hidden="true">·</span><strong>Schedule</strong>
      </nav>
      <header class="schedule-hero">
        <div>
          <h1 class="schedule-hero__title">Schedule</h1>
          <p class="schedule-hero__subtitle">Coordinate programs, people, and places.</p>
        </div>
        <div class="schedule-hero__actions">
          <button type="button" class="icon-button" data-sch-action="toggle-search" aria-label="Search events" aria-expanded="${state.searchOpen ? 'true' : 'false'}">${SVG.search}</button>
          <button type="button" class="button" data-sch-action="today">Today</button>
          ${
              canEdit
                  ? `<button type="button" class="button button--primary" data-sch-action="new-event">${SVG.plus} New event</button>`
                  : ''
          }
        </div>
      </header>
      <div class="schedule-search-panel ${state.searchOpen ? 'is-open' : ''}">
        <label class="studio-sr-only" for="sch-search-input">Search events</label>
        <input id="sch-search-input" type="search" placeholder="Search title, location, notes…" value="${esc(state.query)}" data-sch-search />
      </div>
      <section class="schedule-stats" aria-label="Schedule summary">
        ${statCardHtml('green', SVG.calendar, 'Today', stats.todayCount, 'Events', 'up')}
        ${statCardHtml('blue', SVG.bars, 'This week', stats.weekCount, 'Events', 'up')}
        ${statCardHtml('amber', SVG.clock, 'Awaiting confirmation', stats.awaitingCount, 'Events', 'dot')}
        ${statCardHtml('red', SVG.alert, 'Conflicts', stats.conflictCount, 'Events', 'dot')}
      </section>
      <section class="schedule-workspace">
        <div class="calendar-card">
          ${toolbarHtml(state)}
          ${headingHtml(state)}
          <div class="calendar-scroll">
            ${
                state.view === 'week'
                    ? weekHtml(state, events)
                    : state.view === 'timeline'
                      ? timelineHtml(state, events)
                      : monthHtml(state, events)
            }
          </div>
        </div>
        <aside class="schedule-rail">
          ${agendaHtml(state.selectedDate, dayEvents)}
          ${attentionHtml(attention)}
        </aside>
      </section>
    </div>`;
}

/**
 * @param {'green'|'blue'|'amber'|'red'} tone
 * @param {string} icon
 * @param {string} label
 * @param {number} value
 * @param {string} meta
 * @param {'up'|'dot'} signal
 */
function statCardHtml(tone, icon, label, value, meta, signal) {
    return `<article class="stat-card">
      <div class="stat-card__icon stat-card__icon--${tone}">${icon}</div>
      <div class="stat-card__body">
        <p class="stat-card__label">${esc(label)}</p>
        <p class="stat-card__value">${value}</p>
        <p class="stat-card__meta">${esc(meta)}</p>
      </div>
      <span class="stat-card__signal ${signal === 'up' ? 'stat-card__signal--up' : ''}" style="color: inherit" aria-hidden="true"></span>
    </article>`;
}

/**
 * @param {NonNullable<typeof uiState>} state
 */
function toolbarHtml(state) {
    const progOpts = [`<option value="">All programs</option>`]
        .concat(
            getScheduleProgramOptions().map(
                (p) =>
                    `<option value="${esc(p.id)}" ${state.programId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`,
            ),
        )
        .join('');
    const teamOpts = [`<option value="">All teams</option>`]
        .concat(
            SCHEDULE_TEAMS.map(
                (t) =>
                    `<option value="${esc(t)}" ${state.team === t ? 'selected' : ''}>${esc(t)}</option>`,
            ),
        )
        .join('');
    const locOpts = [`<option value="">All locations</option>`]
        .concat(
            getScheduleLocations().map(
                (l) =>
                    `<option value="${esc(l.id)}" ${state.locationId === l.id ? 'selected' : ''}>${esc(l.name)}</option>`,
            ),
        )
        .join('');
    const tzLabel = scheduleTimezoneButtonLabel(getScheduleTimezonePreference());
    const filters = {
        programId: state.programId,
        team: state.team,
        locationId: state.locationId,
        query: state.query,
    };
    const filtered = listEvents(filters);
    const lastUpdated = formatNewestScheduleUpdated(filtered);
    const programIcs =
        state.programId
            ? `<button type="button" class="button button--ics" data-sch-action="download-program-ics">Download program calendar</button>`
            : '';
    return `<div class="calendar-toolbar">
      <select class="filter-select" data-sch-filter="program" aria-label="Filter by program">${progOpts}</select>
      <select class="filter-select" data-sch-filter="team" aria-label="Filter by team">${teamOpts}</select>
      <select class="filter-select" data-sch-filter="location" aria-label="Filter by location">${locOpts}</select>
      <span class="calendar-toolbar__spacer"></span>
      <span class="schedule-last-updated" title="Newest event update in the current filter">Last updated: ${esc(lastUpdated)}</span>
      <button type="button" class="button button--timezone" data-sch-action="timezone" aria-label="Choose timezone">${esc(tzLabel)}</button>
      <button type="button" class="button button--ics" data-sch-action="download-month-ics">Download month</button>
      ${programIcs}
      <button type="button" class="button" data-sch-action="manage-locations">Locations</button>
      <button type="button" class="icon-button icon-button--bare" data-sch-action="settings" aria-label="Manage event locations">${SVG.settings}</button>
    </div>`;
}

/**
 * @param {NonNullable<typeof uiState>} state
 */
function headingHtml(state) {
    const title =
        state.view === 'month'
            ? formatMonthYear(state.year, state.month)
            : state.view === 'week'
              ? (() => {
                    const { start, end } = weekRangeContaining(state.selectedDate);
                    return `${start} – ${end}`;
                })()
              : formatMonthYear(state.year, state.month);
    const tab = (id, label) =>
        `<button type="button" class="view-tab" data-sch-view="${id}" aria-pressed="${state.view === id ? 'true' : 'false'}">${label}</button>`;
    return `<div class="calendar-heading">
      <h2>${esc(title)}</h2>
      <div class="calendar-heading__arrows">
        <button type="button" class="icon-button" data-sch-action="prev" aria-label="Previous">${SVG.chevronL}</button>
        <button type="button" class="icon-button" data-sch-action="next" aria-label="Next">${SVG.chevronR}</button>
      </div>
      <div class="view-tabs" role="group" aria-label="Calendar view">
        ${tab('month', 'Month')}
        ${tab('week', 'Week')}
        ${tab('timeline', 'Timeline')}
      </div>
    </div>`;
}

/**
 * @param {NonNullable<typeof uiState>} state
 * @param {import('../../utils/scheduleModel.js').CalendarEvent[]} events
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
            const maxChips = 3;
            const shown = list.slice(0, maxChips);
            const more = list.length - shown.length;
            const isToday = cell.date === scheduleTodayYmd();
            const isSelected = cell.date === state.selectedDate;
            const chips = shown
                .map(
                    (e) =>
                        `<button type="button" class="event-chip event-chip--${esc(e.color)}" data-sch-event="${esc(e.id)}" title="${esc(e.title)}">${esc(e.allDay ? e.title : `${formatTime12(e.startTime).replace(' ', '')} ${e.title}`)}</button>`,
                )
                .join('');
            return `<div class="calendar-day ${cell.inMonth ? '' : 'calendar-day--outside'} ${isToday ? 'calendar-day--today' : ''} ${isSelected ? 'calendar-day--selected' : ''}" data-sch-day="${esc(cell.date)}" role="button" tabindex="0" aria-label="${esc(cell.date)}">
        <span class="calendar-day__number">${cell.day}</span>
        ${chips}
        ${more > 0 ? `<button type="button" class="calendar-day__more" data-sch-day-more="${esc(cell.date)}">+${more} more</button>` : ''}
      </div>`;
        })
        .join('');
    return `<div class="month-grid">
      <div class="month-grid__weekdays">${weekdays}</div>
      <div class="month-grid__days">${days}</div>
    </div>`;
}

/**
 * @param {NonNullable<typeof uiState>} state
 * @param {import('../../utils/scheduleModel.js').CalendarEvent[]} events
 */
function weekHtml(state, events) {
    const { start } = weekRangeContaining(state.selectedDate);
    const days = [];
    for (let i = 0; i < 7; i += 1) {
        const date = addDaysYmd(start, i);
        const { d } = parseYmd(date);
        const list = eventsForDate(date, events);
        const chips = list
            .map(
                (e) =>
                    `<button type="button" class="event-chip event-chip--${esc(e.color)}" data-sch-event="${esc(e.id)}">${esc(e.title)}</button>`,
            )
            .join('');
        const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        days.push(`<div class="week-day ${date === state.selectedDate ? 'calendar-day--selected' : ''}" data-sch-day="${esc(date)}">
          <p class="week-day__label">${labels[i]} ${d}</p>
          ${chips || '<span class="studio-muted" style="font-size:11px">No events</span>'}
        </div>`);
    }
    return `<div class="week-grid"><div class="week-grid__days">${days.join('')}</div></div>`;
}

/**
 * @param {NonNullable<typeof uiState>} state
 * @param {import('../../utils/scheduleModel.js').CalendarEvent[]} events
 */
function timelineHtml(state, events) {
    const cells = buildMonthCells(state.year, state.month).filter((c) => c.inMonth);
    const rows = cells
        .map((cell) => {
            const list = eventsForDate(cell.date, events);
            if (!list.length) return '';
            const chips = list
                .map(
                    (e) =>
                        `<button type="button" class="event-chip event-chip--${esc(e.color)}" data-sch-event="${esc(e.id)}">${esc(e.allDay ? e.title : `${e.startTime} ${e.title}`)}</button>`,
                )
                .join('');
            return `<div class="timeline-day" data-sch-day="${esc(cell.date)}">
          <div class="timeline-day__date">${esc(cell.date)}</div>
          <div class="timeline-day__events">${chips}</div>
        </div>`;
        })
        .filter(Boolean)
        .join('');
    return `<div class="timeline-grid">${rows || '<p class="studio-muted" style="padding:16px">No events this month.</p>'}</div>`;
}

/**
 * @param {string} date
 * @param {import('../../utils/scheduleModel.js').CalendarEvent[]} dayEvents
 * @param {boolean} canEdit
 */
function agendaHtml(date, dayEvents) {
    const items = dayEvents
        .map((e) => {
            const staff = e.assignedStaff[0];
            const initials = staff?.initials || '—';
            const time = e.allDay ? 'All day' : e.startTime;
            const dur = eventDurationLabel(e);
            return `<li class="agenda-item" data-sch-event-row="${esc(e.id)}">
        <div class="agenda-item__time"><strong>${esc(time)}</strong><span>${esc(dur)}</span></div>
        <div class="agenda-item__track"><span class="agenda-item__dot" style="--dot:${SCHEDULE_DOT_HEX[e.color] || '#6da57a'}"></span></div>
        <button type="button" class="agenda-item__content" data-sch-event="${esc(e.id)}" style="border:0;background:transparent;padding:0;text-align:left;cursor:pointer">
          <strong>${esc(e.title)}</strong>
          <span>${esc(e.locationName)}</span>
        </button>
        <span class="avatar" title="${esc(staff?.name || '')}">${esc(initials)}</span>
        <div class="agenda-item__menu-wrap">
          <button type="button" class="agenda-item__menu" data-sch-agenda-menu="${esc(e.id)}" aria-label="Event actions">${SVG.more}</button>
        </div>
      </li>`;
        })
        .join('');
    return `<section class="agenda-card">
      <div class="rail-heading"><h2>${esc(formatAgendaHeading(date))}</h2></div>
      <ul class="agenda-list">${items || '<li class="agenda-item"><div class="agenda-item__content"><strong>No events</strong><span>Select another day</span></div></li>'}</ul>
    </section>`;
}

/**
 * @param {ReturnType<typeof computeAttentionItems>} attention
 */
function attentionHtml(attention) {
    const rows = attention
        .slice(0, 6)
        .map((a) => {
            const cls = a.kind === 'conflict' ? '' : 'attention-item--warning';
            const icon = a.kind === 'conflict' ? SVG.alert : SVG.clock;
            return `<button type="button" class="attention-item ${cls}" data-sch-attention="${esc(a.eventId)}" style="width:100%;border:0;background:transparent;text-align:left;cursor:pointer">
        <span class="attention-item__icon">${icon}</span>
        <span class="attention-item__content"><strong>${esc(a.title)}</strong><span>${esc(a.detail)}</span></span>
        <span class="attention-item__arrow">${SVG.chevron}</span>
      </button>`;
        })
        .join('');
    return `<section class="attention-card" id="sch-attention">
      <div class="rail-heading">
        <h2>Needs attention</h2>
        <a href="#sch-attention" data-sch-action="review-all">Review all</a>
      </div>
      <div class="attention-list">${rows || '<p class="studio-muted" style="padding:12px 16px;font-size:12px">All clear.</p>'}</div>
    </section>`;
}

/**
 * @param {HTMLElement} root
 */
function bindPage(root) {
    if (!uiState) return;
    const canEdit = root.dataset.canEdit === '1';
    const paint = () => {
        root.innerHTML = buildPageHtml(uiState, canEdit);
        bindPage(root);
    };

    root.querySelector('[data-sch-action="toggle-search"]')?.addEventListener('click', () => {
        uiState.searchOpen = !uiState.searchOpen;
        paint();
        if (uiState.searchOpen) {
            root.querySelector('#sch-search-input')?.focus();
        }
    });

    root.querySelector('[data-sch-search]')?.addEventListener('input', (e) => {
        const t = /** @type {HTMLInputElement} */ (e.target);
        uiState.query = t.value;
        // debounce-ish: re-paint on input
        paint();
        const again = root.querySelector('#sch-search-input');
        if (again instanceof HTMLInputElement) {
            again.focus();
            again.setSelectionRange(again.value.length, again.value.length);
        }
    });

    root.querySelector('[data-sch-action="today"]')?.addEventListener('click', () => {
        const today = scheduleTodayYmd();
        const { y, m } = parseYmd(today);
        uiState.selectedDate = today;
        uiState.year = y;
        uiState.month = m;
        paint();
    });

    root.querySelector('[data-sch-action="new-event"]')?.addEventListener('click', () => {
        openScheduleEventModal({
            eventId: null,
            mode: 'edit',
            createDefaults: {
                date: uiState.selectedDate,
                programId: uiState.programId || getScheduleProgramPreference(),
            },
            canEdit: true,
            onChanged: paint,
        });
    });

    root.querySelector('[data-sch-action="prev"]')?.addEventListener('click', () => {
        if (uiState.view === 'week') {
            uiState.selectedDate = addDaysYmd(uiState.selectedDate, -7);
            const { y, m } = parseYmd(uiState.selectedDate);
            uiState.year = y;
            uiState.month = m;
        } else {
            let { year, month } = uiState;
            month -= 1;
            if (month < 1) {
                month = 12;
                year -= 1;
            }
            uiState.year = year;
            uiState.month = month;
        }
        paint();
    });

    root.querySelector('[data-sch-action="next"]')?.addEventListener('click', () => {
        if (uiState.view === 'week') {
            uiState.selectedDate = addDaysYmd(uiState.selectedDate, 7);
            const { y, m } = parseYmd(uiState.selectedDate);
            uiState.year = y;
            uiState.month = m;
        } else {
            let { year, month } = uiState;
            month += 1;
            if (month > 12) {
                month = 1;
                year += 1;
            }
            uiState.year = year;
            uiState.month = month;
        }
        paint();
    });

    root.querySelectorAll('[data-sch-view]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const v = btn.getAttribute('data-sch-view');
            if (v === 'month' || v === 'week' || v === 'timeline') {
                uiState.view = v;
                paint();
            }
        });
    });

    root.querySelectorAll('[data-sch-filter]').forEach((sel) => {
        sel.addEventListener('change', () => {
            if (!(sel instanceof HTMLSelectElement)) return;
            const key = sel.getAttribute('data-sch-filter');
            if (key === 'program') {
                uiState.programId = sel.value;
                if (sel.value) {
                    const name =
                        getScheduleProgramOptions().find((p) => p.id === sel.value)?.name || '';
                    setScheduleProgramPreference(sel.value, name);
                }
            }
            if (key === 'team') uiState.team = sel.value;
            if (key === 'location') uiState.locationId = sel.value;
            paint();
        });
    });

    const selectDay = (date) => {
        uiState.selectedDate = date;
        const { y, m } = parseYmd(date);
        uiState.year = y;
        uiState.month = m;
        paint();
    };

    root.querySelectorAll('[data-sch-day]').forEach((el) => {
        const date = el.getAttribute('data-sch-day') || '';
        const activate = () => selectDay(date);
        el.addEventListener('click', (e) => {
            const t = /** @type {HTMLElement} */ (e.target);
            if (t.closest('[data-sch-event]') || t.closest('[data-sch-day-more]')) return;
            activate();
        });
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                activate();
            }
        });
    });

    root.querySelectorAll('[data-sch-day-more]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectDay(btn.getAttribute('data-sch-day-more') || '');
        });
    });

    root.querySelectorAll('[data-sch-event]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-sch-event');
            if (!id) return;
            openScheduleEventModal({
                eventId: id,
                mode: 'view',
                canEdit,
                onChanged: paint,
                returnFocus: /** @type {HTMLElement} */ (btn),
            });
        });
    });

    root.querySelectorAll('[data-sch-attention]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-sch-attention');
            if (!id) return;
            openScheduleEventModal({
                eventId: id,
                mode: 'view',
                canEdit,
                onChanged: paint,
            });
        });
    });

    root.querySelectorAll('[data-sch-agenda-menu]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-sch-agenda-menu');
            const wrap = btn.closest('.agenda-item__menu-wrap');
            if (!wrap || !id) return;
            wrap.querySelector('.agenda-menu')?.remove();
            const menu = document.createElement('div');
            menu.className = 'agenda-menu';
            menu.innerHTML = `
              <button type="button" data-act="open">Open</button>
              ${canEdit ? '<button type="button" data-act="edit">Edit</button>' : ''}
              ${canEdit ? '<button type="button" data-act="duplicate">Duplicate</button>' : ''}
            `;
            wrap.appendChild(menu);
            const closeMenu = () => menu.remove();
            menu.querySelector('[data-act="open"]')?.addEventListener('click', () => {
                closeMenu();
                openScheduleEventModal({ eventId: id, mode: 'view', canEdit, onChanged: paint });
            });
            menu.querySelector('[data-act="edit"]')?.addEventListener('click', () => {
                closeMenu();
                openScheduleEventModal({ eventId: id, mode: 'edit', canEdit, onChanged: paint });
            });
            menu.querySelector('[data-act="duplicate"]')?.addEventListener('click', async () => {
                closeMenu();
                try {
                    const { duplicateEvent } = await import('../../utils/scheduleStore.js');
                    const copy = await duplicateEvent(id);
                    if (copy) {
                        openScheduleEventModal({
                            eventId: copy.id,
                            mode: 'edit',
                            canEdit,
                            onChanged: paint,
                        });
                    }
                } catch (err) {
                    console.warn('[schedule] duplicate failed', err);
                }
            });
            setTimeout(() => {
                const onDoc = (ev) => {
                    if (!menu.contains(/** @type {Node} */ (ev.target))) {
                        closeMenu();
                        document.removeEventListener('click', onDoc);
                    }
                };
                document.addEventListener('click', onDoc);
            }, 0);
        });
    });

    root.querySelector('[data-sch-action="review-all"]')?.addEventListener('click', (e) => {
        e.preventDefault();
        const attention = computeAttentionItems(listEvents({
            programId: uiState.programId,
            team: uiState.team,
            locationId: uiState.locationId,
            query: uiState.query,
        }));
        openScheduleAttentionReview({
            items: attention,
            canEdit,
            onChanged: paint,
        });
    });

    const openLocations = () => {
        openScheduleLocationsModal({
            canEdit,
            onChanged: paint,
        });
    };
    root.querySelector('[data-sch-action="manage-locations"]')?.addEventListener('click', openLocations);
    root.querySelector('[data-sch-action="settings"]')?.addEventListener('click', openLocations);

    root.querySelector('[data-sch-action="timezone"]')?.addEventListener('click', async () => {
        const picked = await openScheduleTimezonePicker(openStudioModal, {
            currentId: getScheduleTimezonePreference(),
        });
        if (picked) paint();
    });

    const exportableEvents = (filters) =>
        listEvents(filters).filter(
            (e) =>
                e.status === 'confirmed' ||
                e.status === 'awaiting_confirmation' ||
                e.status === 'draft',
        );

    root.querySelector('[data-sch-action="download-month-ics"]')?.addEventListener('click', () => {
        const monthKey = `${uiState.year}-${String(uiState.month).padStart(2, '0')}`;
        const monthLabel = formatMonthYear(uiState.year, uiState.month);
        const events = exportableEvents({
            programId: uiState.programId,
            team: uiState.team,
            locationId: uiState.locationId,
            query: uiState.query,
            month: monthKey,
        });
        const ics = buildMultiEventIcs(events, getScheduleTimezonePreference(), monthLabel);
        const slug = monthLabel.replace(/\s+/g, '-').toLowerCase();
        downloadIcsFile(ics, `fusion-schedule-${slug}.ics`);
    });

    root.querySelector('[data-sch-action="download-program-ics"]')?.addEventListener('click', () => {
        const programId = uiState.programId;
        if (!programId) return;
        const events = exportableEvents({
            programId,
            team: uiState.team,
            locationId: uiState.locationId,
            query: uiState.query,
        });
        const name =
            getScheduleProgramOptions().find((p) => p.id === programId)?.name || 'Program calendar';
        const ics = buildMultiEventIcs(events, getScheduleTimezonePreference(), name);
        downloadIcsFile(ics, `${name.replace(/\s+/g, '-').toLowerCase() || 'program'}-calendar.ics`);
    });
}
