# FUSION Staff Schedule Dashboard

## Prompt for a coding AI

```text
Build a production-ready staff and administrator scheduling page for the FUSION art platform. Match the supplied reference image and schedule concept closely. The result should feel like a quiet, premium arts-institution operating system, not a generic SaaS template.

TECHNICAL REQUIREMENTS
- Use the framework and routing already present in the repository. Do not replace the existing app shell.
- If no framework exists, use React with semantic HTML and plain CSS.
- Use Lucide icons or the icon package already installed. Do not use emoji as icons.
- Preserve the existing black FUSION sidebar, its menu order, the active Schedule state, the top account area, and the warm pale-blush application background.
- Make every visible control functional in local state: previous/next month, Today, Month/Week/Timeline tabs, filters, day selection, agenda item selection, New event modal, event overflow, and dismissible attention items.
- Use accessible buttons, labels, focus states, keyboard navigation, aria-current for the active view, and aria-pressed where appropriate.
- Do not add gradients, glassmorphism, oversized illustrations, or excessive decoration.

PAGE STRUCTURE
1. Retain the existing application shell and sidebar.
2. Add a compact breadcrumb row: “Studio · Schedule”.
3. Create a page header card:
   - Title: “Schedule”
   - Subtitle: “Coordinate programs, people, and places.”
   - Search icon button
   - Outlined “Today” button
   - Black “+ New event” button
4. Add four equal summary cards:
   - Today / 6 / Events
   - This week / 18 / Events
   - Awaiting confirmation / 4 / Events
   - Conflicts / 2 / Events
   Use restrained green, blue, amber, and red icon tiles.
5. Create the main scheduling workspace with a large calendar on the left and a 360–380px right rail.
6. Calendar toolbar:
   - Dropdowns: “All programs”, “All teams”, “All locations”
   - Timezone: “New York · EDT”
   - Filter/settings icon button
7. Calendar heading:
   - “August 2026”
   - Previous and next arrows
   - Segmented tabs: “Month”, “Week”, “Timeline”
8. Month calendar:
   - Monday through Sunday columns
   - Six week rows with adjacent-month dates muted
   - Highlight Wednesday the 12th as the selected current day
   - Use refined event chips in blush, sage, powder blue, and warm sand
   - Include: Kaga arrival, Studio orientation, Mentor sessions, Gallery visit, Open studios, Tokyo transfer, Artist dinner, Exhibition install
   - Show “+2 more” where a day has overflow
   - Clicking a day updates the agenda rail
9. Today rail:
   - Heading: “Today · Wed 12”
   - Vertical agenda from 09:00 to 18:00
   - Events show time, duration, colored status dot, title, location, staff avatar or initials, and overflow menu
   - Include Mentor sessions, Studio orientation, Gallery visit, Open studios, Team sync, Artist dinner
10. Needs attention card:
   - Heading and “Review all” link
   - Scheduling conflict: Mentor sessions overlaps with Studio orientation
   - Unconfirmed event: Gallery visit, Sat, Aug 15 · 13:00
   - Unconfirmed event: Tokyo transfer, Fri, Aug 14 · All day
11. New event opens a polished modal or drawer with title, event type, program, date, start/end time, timezone, location, assignees, notes, confirmation status, Cancel, and Save event.

DESIGN DIRECTION
- Typography: Inter, Helvetica Neue, Arial, sans-serif.
- Main ink: #111827. Muted ink: #696764. Background: #fbf6f7. Cards: #ffffff.
- Use 1px #e9e5e4 borders, 10–12px radii, and very subtle shadows.
- Desktop content should remain comfortably visible around 1440px wide.
- The UI must be dense enough for staff operations, but retain generous spacing and editorial calm.
- Use CSS variables and the exact class system supplied below. If the existing markup differs, map these styles cleanly without changing their visual intent.
- On tablet, stack the agenda below the calendar. On mobile, turn the month grid into a horizontally scrollable region with a minimum width rather than crushing seven columns.

DATA MODEL
Represent events as objects with: id, title, date, startTime, endTime, allDay, program, team, location, assignees, color, status, and notes. Keep sample data separate from presentational components. Create reusable SummaryCard, FilterSelect, CalendarHeader, MonthGrid, EventChip, AgendaItem, AttentionItem, and EventForm components.

DELIVERY
Return complete implementation files, not pseudocode. Preserve existing unrelated code. Run the existing lint/build checks and fix errors introduced by this page.
```

## Recommended component class map

```html
<main class="schedule-page">
  <header class="schedule-hero">...</header>
  <section class="schedule-stats">...</section>
  <section class="schedule-workspace">
    <div class="calendar-card">...</div>
    <aside class="schedule-rail">...</aside>
  </section>
</main>
```

## Full CSS

```css
:root {
  --fusion-ink: #111827;
  --fusion-ink-soft: #3f3d3a;
  --fusion-muted: #706d69;
  --fusion-faint: #9c9894;
  --fusion-canvas: #fbf6f7;
  --fusion-surface: #ffffff;
  --fusion-border: #e9e5e4;
  --fusion-border-strong: #d9d4d2;
  --fusion-hover: #f8f5f4;
  --fusion-black: #080808;
  --fusion-sage: #dcebdc;
  --fusion-sage-ink: #285c38;
  --fusion-blue: #dceaf8;
  --fusion-blue-ink: #235f93;
  --fusion-sand: #f5e6c8;
  --fusion-sand-ink: #76500c;
  --fusion-blush: #f7d8da;
  --fusion-blush-ink: #8c343c;
  --fusion-danger: #dc4f57;
  --fusion-radius: 11px;
  --fusion-shadow: 0 1px 2px rgba(17, 24, 39, 0.035), 0 8px 30px rgba(17, 24, 39, 0.025);
  --sidebar-width: 274px;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  color: var(--fusion-ink);
  background: var(--fusion-canvas);
  font-family: Inter, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

button, input, select, textarea { font: inherit; }
button, select { color: inherit; }
button { cursor: pointer; }

.schedule-page {
  min-width: 0;
  padding: 20px 22px 28px;
  background: var(--fusion-canvas);
}

.schedule-breadcrumbs {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 28px;
  margin: -8px 0 12px;
  color: var(--fusion-muted);
  font-size: 13px;
}

.schedule-breadcrumbs a { color: inherit; text-underline-offset: 3px; }
.schedule-breadcrumbs strong { color: var(--fusion-ink); font-weight: 500; }

.schedule-hero,
.stat-card,
.calendar-card,
.agenda-card,
.attention-card {
  background: var(--fusion-surface);
  border: 1px solid var(--fusion-border);
  border-radius: var(--fusion-radius);
  box-shadow: var(--fusion-shadow);
}

.schedule-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 86px;
  padding: 17px 20px;
}

.schedule-hero__title { margin: 0; font-size: 23px; line-height: 1.15; letter-spacing: -0.035em; }
.schedule-hero__subtitle { margin: 6px 0 0; color: var(--fusion-muted); font-size: 13px; }
.schedule-hero__actions { display: flex; align-items: center; gap: 10px; }

.icon-button,
.button,
.filter-select,
.view-tab {
  border: 1px solid var(--fusion-border-strong);
  background: #fff;
  transition: border-color 160ms ease, background 160ms ease, color 160ms ease, transform 160ms ease;
}

.icon-button {
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 8px;
}

.icon-button--bare { border-color: transparent; }
.icon-button:hover, .button:hover, .filter-select:hover { border-color: #aaa4a0; background: var(--fusion-hover); }
.icon-button:active, .button:active { transform: translateY(1px); }

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
}

.button--primary { color: #fff; background: var(--fusion-ink); border-color: var(--fusion-ink); }
.button--primary:hover { color: #fff; background: #252b38; border-color: #252b38; }

:where(button, select, input, textarea, a):focus-visible {
  outline: 3px solid rgba(35, 95, 147, 0.2);
  outline-offset: 2px;
}

.schedule-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.stat-card {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 12px;
  align-items: center;
  min-height: 86px;
  padding: 14px 16px;
}

.stat-card__icon { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 8px; }
.stat-card__icon--green { color: #4d895c; background: #edf5ed; }
.stat-card__icon--blue { color: #4d91ca; background: #eef6fc; }
.stat-card__icon--amber { color: #bd7a08; background: #fbf5e8; }
.stat-card__icon--red { color: var(--fusion-danger); background: #fcedee; }
.stat-card__body { padding-left: 16px; }
.stat-card__label { margin: 0 0 5px; font-size: 12px; font-weight: 600; }
.stat-card__value { margin: 0; font-size: 23px; line-height: 1; font-weight: 650; letter-spacing: -0.03em; }
.stat-card__meta { margin: 5px 0 0; color: var(--fusion-muted); font-size: 11px; }
.stat-card__signal { width: 5px; height: 5px; justify-self: end; border-radius: 50%; background: currentColor; }

.schedule-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 10px;
  align-items: start;
  margin-top: 10px;
}

.calendar-card { min-width: 0; overflow: hidden; }

.calendar-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--fusion-border);
}

.filter-select {
  appearance: none;
  min-width: 136px;
  height: 34px;
  padding: 0 35px 0 12px;
  border-radius: 7px;
  font-size: 12px;
  background-image: linear-gradient(45deg, transparent 50%, #555 50%), linear-gradient(135deg, #555 50%, transparent 50%);
  background-position: calc(100% - 15px) 14px, calc(100% - 11px) 14px;
  background-size: 4px 4px, 4px 4px;
  background-repeat: no-repeat;
}

.calendar-toolbar__spacer { flex: 1; }
.timezone { color: var(--fusion-ink-soft); font-size: 12px; white-space: nowrap; }

.calendar-heading {
  display: flex;
  align-items: center;
  min-height: 58px;
  padding: 10px 16px;
}

.calendar-heading h2 { margin: 0 14px 0 0; font-size: 18px; letter-spacing: -0.025em; }
.calendar-heading__arrows { display: flex; gap: 2px; }
.view-tabs { display: flex; gap: 4px; margin-left: auto; padding: 3px; border-radius: 8px; background: #faf8f7; }
.view-tab { min-height: 32px; padding: 0 13px; border-color: transparent; border-radius: 6px; font-size: 12px; }
.view-tab[aria-pressed="true"] { background: #fff; border-color: var(--fusion-border); box-shadow: 0 1px 3px rgba(17,24,39,.06); }

.calendar-scroll { overflow-x: auto; }
.month-grid { min-width: 760px; padding: 0 14px 14px; }
.month-grid__weekdays, .month-grid__days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }

.weekday {
  display: grid;
  place-items: center;
  height: 28px;
  color: var(--fusion-ink-soft);
  font-size: 10px;
  font-weight: 650;
  letter-spacing: .045em;
}

.calendar-day {
  position: relative;
  min-width: 0;
  min-height: 76px;
  padding: 7px;
  background: #fff;
  border-right: 1px solid var(--fusion-border);
  border-bottom: 1px solid var(--fusion-border);
}

.calendar-day:nth-child(7n + 1) { border-left: 1px solid var(--fusion-border); }
.calendar-day:nth-child(-n + 7) { border-top: 1px solid var(--fusion-border); }
.calendar-day:hover { background: #fcfaf9; }
.calendar-day--outside { color: #aaa5a1; background: #fdfcfb; }
.calendar-day--selected { background: #fcf0f1; }
.calendar-day--selected:hover { background: #faecee; }
.calendar-day__number { display: grid; place-items: center; width: 20px; height: 20px; margin-bottom: 4px; font-size: 11px; font-weight: 600; border-radius: 50%; }
.calendar-day--today .calendar-day__number { color: #fff; background: var(--fusion-ink); }

.event-chip {
  display: block;
  width: 100%;
  margin-top: 3px;
  padding: 4px 7px;
  overflow: hidden;
  border: 0;
  border-radius: 5px;
  color: var(--fusion-ink);
  font-size: 10px;
  line-height: 1.2;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-chip--sage { background: var(--fusion-sage); color: var(--fusion-sage-ink); }
.event-chip--blue { background: var(--fusion-blue); color: var(--fusion-blue-ink); }
.event-chip--sand { background: var(--fusion-sand); color: var(--fusion-sand-ink); }
.event-chip--blush { background: var(--fusion-blush); color: var(--fusion-blush-ink); }
.event-chip:hover { filter: saturate(1.08) brightness(.985); }
.calendar-day__more { display: block; margin-top: 5px; padding: 0; border: 0; background: transparent; color: var(--fusion-ink-soft); font-size: 10px; }

.schedule-rail { display: grid; gap: 10px; }
.agenda-card, .attention-card { overflow: hidden; }
.rail-heading { display: flex; align-items: center; justify-content: space-between; min-height: 50px; padding: 0 16px; border-bottom: 1px solid var(--fusion-border); }
.rail-heading h2 { margin: 0; font-size: 16px; letter-spacing: -0.02em; }
.rail-heading a { color: var(--fusion-ink); font-size: 11px; font-weight: 600; text-decoration: none; }

.agenda-list, .attention-list { margin: 0; padding: 0; list-style: none; }
.agenda-item { display: grid; grid-template-columns: 52px 12px minmax(0,1fr) 34px 18px; min-height: 56px; padding: 9px 12px 9px 16px; }
.agenda-item + .agenda-item { border-top: 1px solid #f1eeed; }
.agenda-item__time strong { display: block; font-size: 11px; }
.agenda-item__time span { display: block; margin-top: 4px; color: var(--fusion-muted); font-size: 9px; }
.agenda-item__track { position: relative; }
.agenda-item__track::after { content: ""; position: absolute; top: 13px; bottom: -18px; left: 2px; width: 1px; background: var(--fusion-border); }
.agenda-item:last-child .agenda-item__track::after { display: none; }
.agenda-item__dot { position: relative; z-index: 1; display: block; width: 6px; height: 6px; margin-top: 4px; border-radius: 50%; background: var(--dot, #6da57a); }
.agenda-item__content strong { display: block; overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.agenda-item__content span { display: block; margin-top: 4px; color: var(--fusion-muted); font-size: 10px; }
.avatar { display: grid; place-items: center; width: 28px; height: 28px; overflow: hidden; border-radius: 50%; background: #eeeae7; color: var(--fusion-ink-soft); font-size: 9px; font-weight: 650; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.agenda-item__menu { align-self: start; padding: 3px; border: 0; background: transparent; color: var(--fusion-muted); }

.attention-item { display: grid; grid-template-columns: 34px minmax(0,1fr) 16px; gap: 8px; align-items: start; min-height: 58px; padding: 10px 12px; }
.attention-item + .attention-item { border-top: 1px solid var(--fusion-border); }
.attention-item__icon { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 7px; background: #fff0f1; color: var(--fusion-danger); }
.attention-item--warning .attention-item__icon { background: #fff7e9; color: #c68109; }
.attention-item__content strong { display: block; color: var(--fusion-danger); font-size: 11px; }
.attention-item--warning .attention-item__content strong { color: #aa6900; }
.attention-item__content span { display: block; margin-top: 2px; color: var(--fusion-ink-soft); font-size: 10px; line-height: 1.35; }
.attention-item__arrow { align-self: center; color: var(--fusion-muted); }

.modal-backdrop { position: fixed; inset: 0; z-index: 80; display: grid; place-items: center; padding: 24px; background: rgba(8,8,8,.42); }
.event-modal { width: min(620px, 100%); max-height: calc(100vh - 48px); overflow: auto; background: #fff; border-radius: 14px; box-shadow: 0 24px 80px rgba(0,0,0,.22); }
.event-modal__header, .event-modal__footer { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; }
.event-modal__header { border-bottom: 1px solid var(--fusion-border); }
.event-modal__header h2 { margin: 0; font-size: 19px; }
.event-modal__body { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 15px; padding: 20px; }
.event-modal__footer { justify-content: flex-end; gap: 10px; border-top: 1px solid var(--fusion-border); }
.field { display: grid; gap: 6px; }
.field--wide { grid-column: 1 / -1; }
.field label { font-size: 11px; font-weight: 650; }
.field input, .field select, .field textarea { width: 100%; min-height: 38px; padding: 9px 11px; border: 1px solid var(--fusion-border-strong); border-radius: 8px; background: #fff; color: var(--fusion-ink); }
.field textarea { min-height: 86px; resize: vertical; }

@media (max-width: 1180px) {
  .schedule-workspace { grid-template-columns: minmax(0, 1fr) 320px; }
  .schedule-stats { grid-template-columns: repeat(2, minmax(0,1fr)); }
}

@media (max-width: 920px) {
  .schedule-workspace { grid-template-columns: 1fr; }
  .schedule-rail { grid-template-columns: repeat(2, minmax(0,1fr)); }
}

@media (max-width: 700px) {
  .schedule-page { padding: 14px; }
  .schedule-hero { align-items: flex-start; flex-direction: column; }
  .schedule-hero__actions { width: 100%; }
  .schedule-hero__actions .button--primary { flex: 1; }
  .schedule-stats, .schedule-rail { grid-template-columns: 1fr; }
  .calendar-toolbar { align-items: stretch; flex-wrap: wrap; }
  .filter-select { flex: 1 1 140px; }
  .calendar-toolbar__spacer { display: none; }
  .timezone { display: flex; align-items: center; margin-left: auto; }
  .calendar-heading { align-items: flex-start; flex-wrap: wrap; gap: 8px; }
  .view-tabs { width: 100%; margin-left: 0; }
  .view-tab { flex: 1; }
  .event-modal__body { grid-template-columns: 1fr; }
  .field--wide { grid-column: auto; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
}
```

## Implementation note

The stylesheet assumes the existing application shell owns the sidebar width and main content offset. If it does not, apply `margin-left: var(--sidebar-width)` to the main application content on desktop and remove it at the same breakpoint where the sidebar becomes a drawer.
