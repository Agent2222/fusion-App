# FUSION Calendar Event Modal Build Specification

## Copy-ready prompt for a coding AI

```text
Build a production-ready calendar event modal for the existing FUSION staff Schedule page. Match the supplied modal rendering closely and preserve the current app shell and calendar page. This is a focused staff operations interface for viewing, editing, and auditing an event without navigating away from the schedule.

Use the project’s existing framework, form library, icon set, data-fetching pattern, and design tokens. If none exist, implement the modal in React with semantic HTML, controlled form state, a portal, and plain CSS. Use Lucide icons. Do not use emoji.

CORE UX
- Clicking a calendar event or agenda item opens the modal in view mode.
- The modal title, program, status, event color, and essential information are immediately readable.
- “Edit event” changes the modal to edit mode without closing it.
- In view mode, fields render as clean values. In edit mode, the same layout becomes inputs/selects without a large visual jump.
- Keep the Schedule dashboard visible behind a translucent charcoal backdrop.
- Close with the X button, Cancel, Escape, or a backdrop click. If the form is dirty, ask for confirmation before discarding changes.
- “Save changes” validates, persists, shows a loading state, then updates the calendar and agenda optimistically. On failure, restore the prior event and show an inline error.
- “Delete event” requires a compact destructive confirmation dialog. Do not delete immediately.
- Preserve scroll position and return keyboard focus to the event that opened the modal.

MODAL CONTENT
Header:
- Sage category dot
- Title: “Mentor sessions”
- Metadata: “Kaga Artist Residency · Confirmed”
- Outlined pencil action: “Edit event”
- Overflow menu with Duplicate event, Copy link, and Export .ics
- Close button

Tabs:
- “Details” active by default
- “Activity” showing a reverse chronological event audit trail: created, time changed, staff assigned, confirmation changed

Details fields:
- Event title: Mentor sessions
- Date: Wed, Aug 12, 2026
- Time: 9:00 AM – 9:45 AM
- Timezone: New York · EDT
- Program: Kaga Artist Residency
- Location: Mentor Room A
- Assigned staff: Akari and Zoia, each with avatar; include “+ Add”
- Artists: 12 participants; clicking opens a participant selector or nested panel
- Notes: One-to-one progress conversations with participating artists. Prepare studio notes before arrival.
- Reminder: 30 minutes before
- Status: Confirmed

Conflict notice:
- Show a slim pale-amber notice near the bottom of Details.
- Text: “Overlaps with Studio orientation by 15 minutes”
- Action: “Review conflict”
- Review conflict opens a compact comparison panel showing both time ranges and actions: Keep anyway, Move this event, Edit Studio orientation.

Footer:
- Left: quiet red “Delete event” action
- Right: outlined “Cancel” and black “Save changes”
- In view mode, hide Save changes and use “Done”; once editing begins show Cancel and Save changes.

VISUAL SPECIFICATION
- Modal width: 680px desktop; max-height: calc(100vh - 48px).
- White surface, 14px corners, 1px #e7e2e1 border, strong but soft shadow.
- Backdrop: rgba(10, 10, 10, .48); underlying page remains recognizable.
- Typography: Inter, Helvetica Neue, Arial, sans-serif.
- Main ink: #111827; muted: #6f6b67; canvas: #fbf6f7.
- Inputs: 40px high, 8px radius, #d9d4d2 border, 13px text.
- Two-column form with 20px gap; title and notes span both columns.
- No gradients, glassmorphism, oversized icons, or generic SaaS decoration.
- At 700px and below, modal becomes a nearly full-screen sheet, form becomes one column, header actions condense, and footer remains sticky.

ACCESSIBILITY
- Use role="dialog", aria-modal="true", aria-labelledby, and aria-describedby.
- Trap keyboard focus inside the modal while open.
- Lock background scrolling and mark the background inert.
- Ensure all icon buttons have accessible labels and 40px minimum hit areas.
- Tabs use the ARIA tabs pattern.
- Validation errors are linked to fields using aria-describedby.
- Announce save success, failures, and conflicts through an aria-live region.
- Honor prefers-reduced-motion.

VALIDATION
- Title, date, start time, end time, program, timezone, and location are required.
- End time must be later than start time.
- Surface conflicts as warnings, not blocking errors, unless the application’s policy says otherwise.
- Staff and participant IDs must be validated against active records.
- Sanitize notes on the server and enforce authorization there, not only in the client.

DATA AND API
Use an Event type with id, title, date, startTime, endTime, timezone, programId, programName, locationId, locationName, assignedStaff, participantIds, participantCount, notes, reminderMinutes, status, color, conflicts, createdAt, updatedAt, and version.

Use optimistic concurrency via the version or updatedAt value. If another staff member edits the event first, do not silently overwrite it. Show a conflict message with Reload latest and Review my changes.

Suggested endpoints:
- GET /api/events/:id
- PATCH /api/events/:id
- DELETE /api/events/:id
- GET /api/events/:id/activity
- POST /api/events/:id/duplicate
- GET /api/events/conflicts?start=&end=&exclude=

DELIVERY
Create reusable EventModal, EventDetails, EventForm, StaffPicker, ParticipantPicker, ConflictNotice, ConflictReview, ActivityTimeline, and DeleteEventDialog components. Keep API calls and validation separate from presentational components. Return complete implementation files, not pseudocode. Preserve unrelated project code and run the repository’s lint, typecheck, tests, and build commands.
```

## Suggested TypeScript model

```ts
export type CalendarEventStatus =
  | "draft"
  | "awaiting_confirmation"
  | "confirmed"
  | "cancelled";

export interface CalendarPerson {
  id: string;
  name: string;
  avatarUrl?: string;
  initials?: string;
}

export interface EventConflict {
  eventId: string;
  eventTitle: string;
  overlapMinutes: number;
  startTime: string;
  endTime: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  programId: string;
  programName: string;
  locationId: string;
  locationName: string;
  assignedStaff: CalendarPerson[];
  participantIds: string[];
  participantCount: number;
  notes: string;
  reminderMinutes: number | null;
  status: CalendarEventStatus;
  color: "sage" | "blue" | "sand" | "blush";
  conflicts: EventConflict[];
  createdAt: string;
  updatedAt: string;
  version: number;
}
```

## Component state contract

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
```

## Recommended markup hierarchy

```html
<div class="event-dialog-backdrop">
  <section class="event-dialog" role="dialog" aria-modal="true">
    <header class="event-dialog__header">...</header>
    <div class="event-dialog__tabs" role="tablist">...</div>
    <div class="event-dialog__scroll">
      <form class="event-form">...</form>
    </div>
    <footer class="event-dialog__footer">...</footer>
  </section>
</div>
```

## Full modal CSS

```css
:root {
  --event-ink: #111827;
  --event-ink-soft: #45413e;
  --event-muted: #716d69;
  --event-border: #e7e2e1;
  --event-border-strong: #d7d1cf;
  --event-surface: #ffffff;
  --event-canvas: #fbf6f7;
  --event-sage: #67936a;
  --event-amber: #bd7606;
  --event-amber-bg: #fff7e8;
  --event-danger: #d92d31;
  --event-radius: 14px;
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
  width: min(680px, 100%);
  max-height: calc(100dvh - 48px);
  overflow: hidden;
  color: var(--event-ink);
  background: var(--event-surface);
  border: 1px solid var(--event-border);
  border-radius: var(--event-radius);
  box-shadow: 0 32px 100px rgba(0, 0, 0, 0.24), 0 4px 16px rgba(0, 0, 0, 0.08);
  font-family: Inter, "Helvetica Neue", Arial, sans-serif;
  animation: event-dialog-in 190ms cubic-bezier(.2,.8,.2,1) both;
}

.event-dialog__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: start;
  padding: 22px 24px 16px;
}

.event-dialog__identity {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.event-dialog__color {
  width: 9px;
  height: 9px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--event-sage);
}

.event-dialog__title {
  margin: 0;
  font-size: 21px;
  font-weight: 680;
  line-height: 1.2;
  letter-spacing: -0.035em;
}

.event-dialog__meta {
  margin: 8px 0 0;
  color: var(--event-muted);
  font-size: 12px;
}

.event-dialog__header-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.event-dialog__button,
.event-dialog__icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--event-border-strong);
  border-radius: 8px;
  color: var(--event-ink);
  background: #fff;
  transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
}

.event-dialog__button {
  min-height: 38px;
  gap: 8px;
  padding: 0 14px;
  font-size: 12px;
  font-weight: 620;
}

.event-dialog__icon-button {
  width: 40px;
  height: 40px;
  padding: 0;
  border-color: transparent;
}

.event-dialog__button:hover,
.event-dialog__icon-button:hover { background: #f8f5f4; border-color: #bcb5b2; }
.event-dialog__button:active,
.event-dialog__icon-button:active { transform: translateY(1px); }

.event-dialog__tabs {
  display: flex;
  gap: 30px;
  min-height: 43px;
  padding: 0 24px;
  border-bottom: 1px solid var(--event-border);
}

.event-dialog__tab {
  position: relative;
  padding: 0;
  border: 0;
  color: var(--event-muted);
  background: transparent;
  font-size: 12px;
  font-weight: 620;
}

.event-dialog__tab[aria-selected="true"] { color: var(--event-ink); }
.event-dialog__tab[aria-selected="true"]::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: var(--event-ink);
}

.event-dialog__scroll {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.event-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 17px 20px;
  padding: 21px 24px 18px;
}

.event-field {
  display: grid;
  min-width: 0;
  gap: 7px;
}

.event-field--wide { grid-column: 1 / -1; }
.event-field__label { color: var(--event-ink); font-size: 11px; font-weight: 650; }
.event-field__hint { color: var(--event-muted); font-size: 10px; }

.event-field__control {
  width: 100%;
  min-width: 0;
  min-height: 40px;
  padding: 9px 12px;
  border: 1px solid var(--event-border-strong);
  border-radius: 8px;
  outline: none;
  color: var(--event-ink);
  background: #fff;
  font: inherit;
  font-size: 12px;
  line-height: 1.4;
}

.event-field textarea.event-field__control {
  min-height: 72px;
  resize: vertical;
}

.event-field__control:hover { border-color: #b8b1ae; }
.event-field__control:focus {
  border-color: #727b8c;
  box-shadow: 0 0 0 3px rgba(35, 95, 147, 0.12);
}
.event-field__control[aria-invalid="true"] { border-color: var(--event-danger); }
.event-field__control:disabled { color: #807b77; background: #faf8f7; }

.event-field__select-wrap,
.event-field__icon-wrap { position: relative; }
.event-field__select-wrap select { appearance: none; padding-right: 36px; }
.event-field__select-icon,
.event-field__trailing-icon {
  position: absolute;
  top: 50%;
  right: 12px;
  width: 15px;
  height: 15px;
  pointer-events: none;
  transform: translateY(-50%);
}
.event-field__icon-wrap .event-field__control { padding-left: 38px; }
.event-field__leading-icon {
  position: absolute;
  top: 50%;
  left: 12px;
  width: 16px;
  height: 16px;
  pointer-events: none;
  transform: translateY(-50%);
}

.event-people {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.event-person {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 3px 11px 3px 4px;
  border: 1px solid var(--event-border-strong);
  border-radius: 999px;
  background: #fff;
  font-size: 11px;
}

.event-person__avatar {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  overflow: hidden;
  border-radius: 50%;
  color: var(--event-ink-soft);
  background: #eee9e6;
  font-size: 9px;
  font-weight: 700;
}
.event-person__avatar img { width: 100%; height: 100%; object-fit: cover; }

.event-conflict {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 46px;
  padding: 8px 12px;
  color: var(--event-ink-soft);
  background: var(--event-amber-bg);
  border: 1px solid #f0d399;
  border-radius: 8px;
  font-size: 11px;
}
.event-conflict__icon { color: var(--event-amber); }
.event-conflict__action { padding: 4px 0; border: 0; color: #a66300; background: transparent; font-size: 10px; font-weight: 650; text-decoration: underline; text-underline-offset: 2px; }

.event-dialog__footer {
  display: flex;
  align-items: center;
  min-height: 68px;
  padding: 13px 24px;
  border-top: 1px solid var(--event-border);
  background: rgba(255, 255, 255, 0.97);
}
.event-dialog__footer-spacer { flex: 1; }
.event-dialog__footer-actions { display: flex; gap: 9px; }
.event-dialog__button--primary { color: #fff; background: var(--event-ink); border-color: var(--event-ink); }
.event-dialog__button--primary:hover { color: #fff; background: #272d39; border-color: #272d39; }
.event-dialog__button--danger { padding: 0; border-color: transparent; color: var(--event-danger); background: transparent; }

.event-activity { margin: 0; padding: 22px 24px 26px; list-style: none; }
.event-activity__item { position: relative; display: grid; grid-template-columns: 28px minmax(0,1fr); gap: 12px; padding-bottom: 22px; }
.event-activity__item::after { content: ""; position: absolute; top: 28px; bottom: 0; left: 13px; width: 1px; background: var(--event-border); }
.event-activity__item:last-child::after { display: none; }
.event-activity__icon { position: relative; z-index: 1; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: #f5f2f1; }
.event-activity__content strong { display: block; font-size: 12px; }
.event-activity__content p { margin: 4px 0; color: var(--event-ink-soft); font-size: 11px; line-height: 1.45; }
.event-activity__content time { color: var(--event-muted); font-size: 10px; }

.event-dialog__error { grid-column: 1 / -1; padding: 10px 12px; color: #9f1d24; background: #fff0f1; border: 1px solid #f4c3c6; border-radius: 8px; font-size: 11px; }
.event-dialog__saving { opacity: .65; pointer-events: none; }

@keyframes event-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes event-dialog-in { from { opacity: 0; transform: translateY(10px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }

@media (max-width: 700px) {
  .event-dialog-backdrop { align-items: end; padding: 0; }
  .event-dialog { width: 100%; max-height: 96dvh; border-right: 0; border-bottom: 0; border-left: 0; border-radius: 16px 16px 0 0; }
  .event-dialog__header { padding: 18px 16px 14px; }
  .event-dialog__button-label { display: none; }
  .event-dialog__tabs { padding: 0 16px; }
  .event-form { grid-template-columns: 1fr; padding: 18px 16px; }
  .event-field--wide, .event-conflict { grid-column: auto; }
  .event-conflict { grid-template-columns: 22px minmax(0,1fr); }
  .event-conflict__action { grid-column: 2; justify-self: start; }
  .event-dialog__footer { position: sticky; bottom: 0; padding: 11px 16px calc(11px + env(safe-area-inset-bottom)); }
}

@media (prefers-reduced-motion: reduce) {
  .event-dialog-backdrop,
  .event-dialog { animation: none; }
  .event-dialog__button,
  .event-dialog__icon-button { transition: none; }
}
```

## Recommended behavior checklist

- Event click opens view mode and loads the latest server version.
- Edit event changes only the form region and footer actions.
- Escape and backdrop close are disabled while a save request is pending.
- Dirty-state confirmation appears before closing edited content.
- Conflict checks are debounced while date or time changes.
- Save updates the underlying month grid and daily agenda immediately.
- Delete confirmation names the event and explains that the action cannot be undone.
- Activity entries contain actor, action, changed fields, and timestamp.
- Server authorization distinguishes staff edit rights from administrator delete rights.
- Focus is restored to the triggering calendar chip after close.

## Example event fixture

```ts
export const mentorSessionEvent: CalendarEvent = {
  id: "evt_mentor_2026_08_12",
  title: "Mentor sessions",
  date: "2026-08-12",
  startTime: "09:00",
  endTime: "09:45",
  timezone: "America/New_York",
  programId: "program_kaga_2026",
  programName: "Kaga Artist Residency",
  locationId: "location_mentor_room_a",
  locationName: "Mentor Room A",
  assignedStaff: [
    { id: "staff_akari", name: "Akari", initials: "A" },
    { id: "staff_zoia", name: "Zoia", initials: "Z" }
  ],
  participantIds: [],
  participantCount: 12,
  notes: "One-to-one progress conversations with participating artists. Prepare studio notes before arrival.",
  reminderMinutes: 30,
  status: "confirmed",
  color: "sage",
  conflicts: [{
    eventId: "evt_orientation_2026_08_12",
    eventTitle: "Studio orientation",
    overlapMinutes: 15,
    startTime: "09:30",
    endTime: "10:30"
  }],
  createdAt: "2026-07-18T14:22:00Z",
  updatedAt: "2026-08-10T17:45:00Z",
  version: 4
};
```
