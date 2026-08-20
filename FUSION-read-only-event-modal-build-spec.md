# FUSION Read-Only Event Modal Build Specification

## Copy-ready prompt for a coding AI

```text
Build the read-only state of the FUSION calendar Event Modal shown in the supplied rendering. Integrate it with the edit-mode modal described by the existing FUSION Calendar Event Modal specification. Preserve the current Schedule page, event model, API layer, activity tab, optimistic concurrency, conflict handling, delete confirmation, focus management, and accessibility behavior.

The read-only state must feel like a concise event briefing, not a disabled form. Do not render inputs, selects, textareas, field borders, or muted form controls in view mode. Use semantic text, compact metadata, restrained icons, and generous spacing. Clicking “Edit event” should switch the detail panel into the existing edit form without closing the modal.

READ-ONLY CONTENT

Header:
- Green status dot and uppercase label “CONFIRMED”
- H1: “Test”
- Program line: “Fusion Kaga – Fall 2026 Artist Residency”
- Outlined pencil action: “Edit event”
- Overflow menu: Duplicate event, Copy link, Export .ics
- Close icon button

Tabs:
- “Details” active by default
- “Activity” uses the activity timeline from the reference specification

Primary schedule panel:
- Calendar tile: “AUG” above “13”
- Date: “Thursday, August 13, 2026”
- Time: “9:00 AM – 9:45 AM”
- Supporting line: “45 minutes · Eastern Time (ET)”
- Reminder pill with bell icon: “30 min before”

Detail grid:
- Location: “Artist Lounge” with map-pin icon
- Relation: “Program” with link icon
- Assigned staff: Starr Oge, Zoia Amadi, Akari Koizumi, each with compact initial avatar
- Artists: three overlapping neutral avatar placeholders, “3 participating artists”, and a chevron. The entire row opens the participant panel.
- Notes: “testing” inside one subtle warm-gray note panel spanning both columns

Footer:
- Left: quiet red “Delete event”
- Next: outlined “Download .ics” with calendar icon
- Right: black “Done” button
- In edit mode replace Download/Done placement as needed with Cancel and Save changes, as specified by the edit-mode reference.

VISUAL DIRECTION
- Editorial art-institution interface, restrained and precise.
- Desktop modal width: 740px. Maximum height: calc(100dvh - 48px).
- The read-only content should fit without an internal scrollbar at normal desktop heights of 760px or greater.
- White surface, 14px corners, #e7e2e1 border, soft deep shadow.
- Backdrop: rgba(10,10,10,.48). Keep the Schedule page recognizable behind it.
- Typography: Inter, Helvetica Neue, Arial, sans-serif.
- Main ink #111827; muted #716d69; sage #67936a; pale sage panel #f3f7f1; warm note surface #fbf8f7.
- No gradients, glassmorphism, ornamental artwork, oversized icons, or generic colorful SaaS decoration.
- Maintain a strong information sequence: identity → date/time → operational details → notes → actions.

RESPONSIVE BEHAVIOR
- At 700px and below, present the modal as a nearly full-screen bottom sheet.
- Stack the schedule panel vertically but keep the calendar tile beside the date/time when space permits.
- Collapse the detail grid to one column.
- Allow staff chips to wrap.
- Keep the footer sticky and respect safe-area insets.
- On very narrow screens, hide the visible “Edit event” label but keep an accessible pencil button.

INTERACTIONS
- Event click opens view mode.
- Edit event changes mode in place and focuses the first editable field.
- Done, Escape, X, and backdrop click close the modal in clean view mode.
- If edit mode is dirty, closing asks for confirmation.
- The artists row is a button and opens the participant selector/detail panel.
- Download .ics exports the current event.
- Overflow uses an anchored menu with full keyboard navigation.
- Delete event opens the destructive confirmation dialog. It never deletes immediately.
- Preserve the page scroll position and restore focus to the event chip that opened the modal.

ACCESSIBILITY
- Use role="dialog", aria-modal="true", aria-labelledby, and aria-describedby.
- Trap focus, lock document scrolling, and mark the application shell inert while open.
- Tabs follow the ARIA tabs pattern.
- Icon-only controls have accessible names and at least 40×40px targets.
- Do not communicate confirmed state by color alone; retain the visible “CONFIRMED” label.
- The artists drill-down is a real button, not a clickable div.
- Announce export, delete, save, failures, and concurrency conflicts in an aria-live region.
- Honor prefers-reduced-motion.

IMPLEMENTATION
- Reuse the CalendarEvent and EventModalProps types from the attached reference specification.
- Create EventModal, EventView, EventScheduleHero, EventFact, EventPeople, ParticipantSummary, EventNotes, EventForm, ActivityTimeline, EventOverflowMenu, and DeleteEventDialog.
- Keep data-fetching and mutations outside presentational components.
- Use the project’s existing framework, focus-trap utility, icons, and design tokens. If absent, use React, a portal, controlled state, Lucide icons, and the CSS below.
- Return production implementation files, not pseudocode. Preserve unrelated code and run lint, typecheck, tests, and build.
```

## Mode and component contract

```ts
type EventModalMode = "view" | "edit";
type EventModalTab = "details" | "activity";

interface EventModalProps {
  eventId: string | null;
  open: boolean;
  onOpenChange(open: boolean): void;
  onUpdated(event: CalendarEvent): void;
  onDeleted(eventId: string): void;
}

interface EventViewProps {
  event: CalendarEvent;
  onEdit(): void;
  onOpenParticipants(): void;
  onDownloadIcs(): void;
}
```

Keep the `CalendarEvent`, `CalendarPerson`, `EventConflict`, validation, endpoints, and concurrency rules from the reference specification unchanged.

## Recommended semantic markup

```html
<div class="event-dialog-backdrop">
  <section
    class="event-dialog event-dialog--view"
    role="dialog"
    aria-modal="true"
    aria-labelledby="event-dialog-title"
    aria-describedby="event-dialog-program"
  >
    <header class="event-dialog__header">
      <div class="event-dialog__identity">
        <div class="event-dialog__status-row">
          <span class="event-dialog__status-dot" aria-hidden="true"></span>
          <span>Confirmed</span>
        </div>
        <h1 id="event-dialog-title" class="event-dialog__title">Test</h1>
        <p id="event-dialog-program" class="event-dialog__program">
          Fusion Kaga – Fall 2026 Artist Residency
        </p>
      </div>

      <div class="event-dialog__header-actions">
        <button class="event-button event-button--outline" type="button">
          <svg aria-hidden="true"><!-- Pencil --></svg>
          <span class="event-button__label">Edit event</span>
        </button>
        <button class="event-icon-button" aria-label="More event actions"></button>
        <button class="event-icon-button" aria-label="Close event"></button>
      </div>
    </header>

    <div class="event-dialog__tabs" role="tablist" aria-label="Event sections">
      <button role="tab" aria-selected="true" aria-controls="event-details">Details</button>
      <button role="tab" aria-selected="false" aria-controls="event-activity">Activity</button>
    </div>

    <div id="event-details" class="event-dialog__body" role="tabpanel">
      <section class="event-schedule" aria-label="Event schedule">
        <time class="event-date-tile" datetime="2026-08-13">
          <span class="event-date-tile__month">Aug</span>
          <span class="event-date-tile__day">13</span>
        </time>
        <div class="event-schedule__time">
          <p class="event-schedule__date">Thursday, August 13, 2026</p>
          <p class="event-schedule__range">9:00 AM – 9:45 AM</p>
          <p class="event-schedule__meta">45 minutes <span>·</span> Eastern Time (ET)</p>
        </div>
        <div class="event-reminder"><!-- Bell --> 30 min before</div>
      </section>

      <div class="event-facts">
        <section class="event-fact">
          <svg class="event-fact__icon" aria-hidden="true"><!-- MapPin --></svg>
          <div><p class="event-eyebrow">Location</p><p class="event-fact__value">Artist Lounge</p></div>
        </section>
        <section class="event-fact">
          <svg class="event-fact__icon" aria-hidden="true"><!-- Link --></svg>
          <div><p class="event-eyebrow">Relation</p><p class="event-fact__value">Program</p></div>
        </section>
        <section class="event-fact event-fact--people">
          <svg class="event-fact__icon" aria-hidden="true"><!-- Users --></svg>
          <div>
            <p class="event-eyebrow">Assigned staff</p>
            <ul class="event-people" aria-label="Assigned staff">...</ul>
          </div>
        </section>
        <button class="event-fact event-fact--participants" type="button">
          <!-- avatars, count, chevron -->
        </button>
      </div>

      <section class="event-notes">
        <svg aria-hidden="true"><!-- FileText --></svg>
        <div><p class="event-eyebrow">Notes</p><p class="event-notes__text">testing</p></div>
      </section>
    </div>

    <footer class="event-dialog__footer">
      <button class="event-button event-button--danger" type="button">Delete event</button>
      <button class="event-button event-button--outline" type="button">Download .ics</button>
      <span class="event-dialog__footer-spacer"></span>
      <button class="event-button event-button--primary" type="button">Done</button>
    </footer>
  </section>
</div>
```

## Production CSS

```css
:root {
  --event-ink: #111827;
  --event-ink-soft: #45413e;
  --event-muted: #716d69;
  --event-border: #e7e2e1;
  --event-border-strong: #d7d1cf;
  --event-surface: #ffffff;
  --event-canvas: #fbf8f7;
  --event-sage: #67936a;
  --event-sage-ink: #4f7753;
  --event-sage-surface: #f3f7f1;
  --event-danger: #d92d31;
  --event-radius: 14px;
  --event-focus: 0 0 0 3px rgba(35, 95, 147, 0.16);
}

.event-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(10, 10, 10, 0.48);
  animation: event-backdrop-in 160ms ease-out both;
}

.event-dialog {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  width: min(740px, 100%);
  max-height: calc(100dvh - 48px);
  overflow: hidden;
  color: var(--event-ink);
  background: var(--event-surface);
  border: 1px solid var(--event-border);
  border-radius: var(--event-radius);
  box-shadow: 0 32px 100px rgba(0, 0, 0, 0.24), 0 4px 16px rgba(0, 0, 0, 0.08);
  font-family: Inter, "Helvetica Neue", Arial, sans-serif;
  animation: event-dialog-in 190ms cubic-bezier(.2, .8, .2, 1) both;
}

.event-dialog__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: start;
  padding: 26px 28px 18px;
}

.event-dialog__identity { min-width: 0; }

.event-dialog__status-row {
  display: flex;
  gap: 9px;
  align-items: center;
  margin-bottom: 9px;
  color: var(--event-sage-ink);
  font-size: 10px;
  font-weight: 720;
  line-height: 1;
  letter-spacing: .045em;
  text-transform: uppercase;
}

.event-dialog__status-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--event-sage);
}

.event-dialog__title {
  margin: 0;
  overflow: hidden;
  font-size: 25px;
  font-weight: 690;
  line-height: 1.12;
  letter-spacing: -.04em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-dialog__program {
  margin: 7px 0 0;
  overflow: hidden;
  color: var(--event-muted);
  font-size: 12px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-dialog__header-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.event-button,
.event-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--event-ink);
  background: #fff;
  font: inherit;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
}

.event-button {
  min-height: 40px;
  gap: 8px;
  padding: 0 15px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 650;
}

.event-button svg { width: 15px; height: 15px; }

.event-icon-button {
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid transparent;
}

.event-icon-button svg { width: 17px; height: 17px; }

.event-button--outline { border-color: var(--event-border-strong); }
.event-button--primary { color: #fff; background: var(--event-ink); border-color: var(--event-ink); }
.event-button--danger { padding-inline: 0; color: var(--event-danger); background: transparent; }

.event-button:hover,
.event-icon-button:hover { background: #f8f5f4; border-color: #bcb5b2; }
.event-button--primary:hover { color: #fff; background: #272d39; border-color: #272d39; }
.event-button--danger:hover { border-color: transparent; color: #b42327; background: transparent; }
.event-button:active,
.event-icon-button:active { transform: translateY(1px); }
.event-button:focus-visible,
.event-icon-button:focus-visible,
.event-dialog__tab:focus-visible,
.event-fact--participants:focus-visible { outline: none; box-shadow: var(--event-focus); }

.event-dialog__tabs {
  display: flex;
  gap: 30px;
  min-height: 44px;
  padding: 0 28px;
  border-bottom: 1px solid var(--event-border);
}

.event-dialog__tab,
.event-dialog__tabs > [role="tab"] {
  position: relative;
  padding: 0;
  border: 0;
  color: var(--event-muted);
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
}

.event-dialog__tab[aria-selected="true"],
.event-dialog__tabs > [role="tab"][aria-selected="true"] { color: var(--event-ink); }

.event-dialog__tab[aria-selected="true"]::after,
.event-dialog__tabs > [role="tab"][aria-selected="true"]::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: var(--event-ink);
}

.event-dialog__body {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 14px 12px 16px;
}

.event-schedule {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr) auto;
  gap: 24px;
  align-items: center;
  min-height: 148px;
  padding: 22px 28px;
  background: var(--event-sage-surface);
  border: 1px solid #dbe5d8;
  border-radius: 10px 10px 0 0;
}

.event-date-tile {
  display: grid;
  place-items: center;
  align-content: center;
  width: 96px;
  height: 96px;
  color: #173c27;
  background: #fff;
  border: 1px solid #e6ebe4;
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(17, 24, 39, .04);
  text-decoration: none;
}

.event-date-tile__month {
  font-size: 12px;
  font-weight: 720;
  line-height: 1;
  letter-spacing: .025em;
  text-transform: uppercase;
}

.event-date-tile__day {
  margin-top: 6px;
  font-size: 41px;
  font-weight: 690;
  line-height: .9;
  letter-spacing: -.055em;
}

.event-schedule__date,
.event-schedule__range,
.event-schedule__meta { margin: 0; }

.event-schedule__date {
  color: #24382b;
  font-size: 12px;
  font-weight: 650;
}

.event-schedule__range {
  margin-top: 13px;
  font-size: 26px;
  font-weight: 690;
  line-height: 1.1;
  letter-spacing: -.04em;
}

.event-schedule__meta {
  margin-top: 9px;
  color: var(--event-ink-soft);
  font-size: 11px;
}

.event-schedule__meta span { margin-inline: 5px; color: #9a9692; }

.event-reminder {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  min-height: 31px;
  padding: 0 13px;
  color: #33453a;
  border: 1px solid #cbd8c8;
  border-radius: 999px;
  background: rgba(255, 255, 255, .38);
  font-size: 10px;
  font-weight: 620;
  white-space: nowrap;
}

.event-reminder svg { width: 14px; height: 14px; }

.event-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0 16px;
}

.event-fact {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
  min-height: 102px;
  padding: 26px 16px 20px;
  border-bottom: 1px solid var(--event-border);
}

.event-fact:nth-child(odd) { border-right: 1px solid var(--event-border); }
.event-fact__icon { width: 17px; height: 17px; margin-top: 1px; color: var(--event-ink); }

.event-eyebrow {
  margin: 0;
  color: var(--event-ink-soft);
  font-size: 9px;
  font-weight: 720;
  line-height: 1.1;
  letter-spacing: .065em;
  text-transform: uppercase;
}

.event-fact__value {
  margin: 17px 0 0;
  color: var(--event-ink);
  font-size: 12px;
  line-height: 1.4;
}

.event-people {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  align-items: center;
  margin: 15px 0 0;
  padding: 0;
  list-style: none;
}

.event-person {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  color: var(--event-ink);
  font-size: 10px;
  white-space: nowrap;
}

.event-person__avatar {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  overflow: hidden;
  color: var(--event-ink-soft);
  background: #f1edeb;
  border: 1px solid #ddd7d4;
  border-radius: 50%;
  font-size: 8px;
  font-weight: 720;
}

.event-person__avatar img { width: 100%; height: 100%; object-fit: cover; }

.event-fact--participants {
  width: 100%;
  border-top: 0;
  border-left: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.event-fact--participants:hover { background: #fcfaf9; }

.event-participants__content {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 15px;
}

.event-avatar-stack { display: flex; padding-left: 9px; }
.event-avatar-stack__avatar {
  width: 29px;
  height: 29px;
  margin-left: -9px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #d9d6d4;
}
.event-avatar-stack__avatar:nth-child(2) { background: #c9c6c4; }
.event-avatar-stack__avatar:nth-child(3) { background: #e2dfdd; }
.event-participants__count { font-size: 11px; }
.event-participants__chevron { width: 16px; height: 16px; margin-left: auto; }

.event-notes {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 12px;
  min-height: 94px;
  margin: 14px 4px 0;
  padding: 22px 24px;
  background: var(--event-canvas);
  border: 1px solid var(--event-border);
  border-radius: 9px;
}

.event-notes > svg { width: 17px; height: 17px; }
.event-notes__text { margin: 15px 0 0; font-size: 12px; line-height: 1.55; }

.event-dialog__footer {
  display: flex;
  align-items: center;
  min-height: 68px;
  gap: 12px;
  padding: 13px 28px;
  border-top: 1px solid var(--event-border);
  background: rgba(255, 255, 255, .98);
}

.event-dialog__footer-spacer { flex: 1; }

@keyframes event-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes event-dialog-in {
  from { opacity: 0; transform: translateY(10px) scale(.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (max-width: 700px) {
  .event-dialog-backdrop { align-items: end; padding: 0; }
  .event-dialog {
    width: 100%;
    max-height: 96dvh;
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    border-radius: 16px 16px 0 0;
  }
  .event-dialog__header { padding: 18px 16px 14px; }
  .event-dialog__program { white-space: normal; }
  .event-button__label { display: none; }
  .event-dialog__tabs { padding-inline: 16px; }
  .event-dialog__body { padding: 10px 8px 14px; }
  .event-schedule {
    grid-template-columns: 74px minmax(0, 1fr);
    gap: 16px;
    padding: 18px;
  }
  .event-date-tile { width: 74px; height: 82px; }
  .event-date-tile__day { font-size: 34px; }
  .event-schedule__range { font-size: clamp(20px, 6vw, 25px); }
  .event-reminder { grid-column: 2; justify-self: start; }
  .event-facts { grid-template-columns: 1fr; margin-inline: 8px; }
  .event-fact:nth-child(odd) { border-right: 0; }
  .event-fact { min-height: 90px; padding-inline: 10px; }
  .event-dialog__footer {
    position: sticky;
    bottom: 0;
    padding: 11px 16px calc(11px + env(safe-area-inset-bottom));
  }
}

@media (max-width: 430px) {
  .event-dialog__header { gap: 8px; }
  .event-dialog__header-actions { gap: 0; }
  .event-dialog__title { font-size: 22px; }
  .event-button--danger { font-size: 11px; }
  .event-dialog__footer { gap: 7px; }
  .event-dialog__footer .event-button { padding-inline: 11px; }
}

@media (prefers-reduced-motion: reduce) {
  .event-dialog-backdrop,
  .event-dialog { animation: none; }
  .event-button,
  .event-icon-button { transition: none; }
}
```

## Build behavior checklist

- Render `EventView` only when `mode === "view"` and `tab === "details"`.
- Never reuse edit inputs with `disabled` or `readOnly` attributes to simulate the view.
- Format the display date, time range, duration, and timezone from canonical event values rather than storing display strings.
- Use `<time datetime>` for the date and machine-readable activity timestamps.
- Set status text and dot color from the event status map; retain text for every state.
- Show participant avatars when present and neutral placeholders only when avatar data is absent.
- Participant summary opens by mouse, Enter, and Space.
- Overflow menu positions within the viewport and closes on Escape or outside click.
- View mode closes immediately; dirty edit mode uses discard confirmation.
- Edit event swaps the body and footer in place, preserving the active tab and modal dimensions where practical.
- Download success and errors are announced without a blocking alert.
- Delete confirmation includes the event title and explains that deletion cannot be undone.
- Activity data loads only when the Activity tab is first selected, then caches for the modal session.
- Calendar and daily agenda update after edit/delete without a full page reload.
- Restore focus to the originating event chip after close.

## Formatting helpers

```ts
const formatEventDate = (event: CalendarEvent) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: event.timezone,
  }).format(new Date(`${event.date}T${event.startTime}:00`));

const formatEventTime = (value: string, date: string, timeZone: string) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(`${date}T${value}:00`));

const durationMinutes = (startTime: string, endTime: string) => {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
};
```

For timezone-safe production code, construct instants with the project’s existing date library or Temporal polyfill. Native `Date` parsing of local date-time strings does not apply an arbitrary IANA timezone.

## Acceptance criteria

1. A user can identify what, when, where, program relation, staff, artist count, notes, reminder, and confirmation state within five seconds.
2. No read-only value looks like a disabled input.
3. The desktop modal fits at 760px viewport height without scrolling for the supplied fixture.
4. All controls are reachable and operable by keyboard.
5. The view/edit transition preserves event identity and does not refetch unnecessarily.
6. Closing restores focus and page scroll position.
7. Status, export, activity, concurrency, validation, and destructive-action behavior remain consistent with the reference specification.
8. Layout passes at 320px, 390px, 700px, 1024px, and 1440px widths.
9. The implementation passes lint, typecheck, tests, and production build.
