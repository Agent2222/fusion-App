# Radar change brief

Scored from Playwright captures in `e2e/radar-visual.spec.js-snapshots/` (1440 / 768, fixture preview, 2026-08-26). This is an **IA + restyle** cut, not visual-only.

## Rubric (1–5)

| Criterion | Score | Evidence |
|-----------|------:|----------|
| Job-to-be-done | 2 | Finding a name and starting outreach takes reading an access banner, a 3-step tutorial, six tabs, and a 17-field modal. Cards do not change stage on the board. |
| Information architecture | 2 | Discover and Leads are one roster. Canister allowlist + “add staff principal” lead the product. Replied / connected / rejected / archived exist in List and vanish on the Board. |
| Hierarchy | 2 | “Radar” repeats (topbar, breadcrumb, H2, panel H2). Access box is the first read. Numbered steps compete with the kanban. |
| Density vs editorial Fusion | 2 | Nine-column CRM table; Fit / Japan / Next as equal cells. Grey instructional slabs on every tab. Cards are the only editorial moment (name, score, one-line why). |
| Motion and trust | 2 | Full `innerHTML` paint on search keystroke (caret loss). Empty Discover is four identical “No cards” columns plus the tutorial. Score is a number, not a reason, in the table. |
| Modal | 2 | The why-block is the product. Everything after is a form with a hint under every label. Five full-width footer actions stack over the fields. |

## Decision

**Keep / merge / cut / restyle** — do not ship a prettier six-tab CRM.

### Keep

- Score as a colored mark on cards.
- One-line *why* on board cards.
- Human-approval outreach (draft queue, no silent send).
- Finance-style underline tabs.
- Fixture preview (`?radarPreview=1`) for visual capture.

### Merge

- Discover + Leads → **Pipeline** with **Board | List**. Default **Board**.
- `?tab=leads` still opens List. `?tab=discover` opens Board.
- Replied / connected / rejected / archived → **Later** column on the board (not a second hidden roster).

### Cut from the first read

- Access banner + add-staff principal from the top of every tab → collapsed **Access** at the bottom.
- Numbered 3-step intro on Discover.
- Duplicate panel title/blurb under Pipeline.
- “API health” as a primary toolbar button → Access.
- Fit + Japan columns on List (they belong in the dossier).
- Per-field hint under every modal identity field.

### Restyle / behavior

- Pipeline toolbar: Board | List, Add lead, Run discovery.
- Board cards: stage `<select>` is the primary verb (click-to-set-status; drag later).
- List columns: Name, Type, Place, Score, Status, Next.
- Region filter matches `location` or `regionKey`.
- Empty Pipeline: one composed empty, not five hollow columns.
- Lead modal = **dossier**: score + identity + why + next; remaining fields in **More**. Footer: **Save** + **Draft outreach**; Enrich / AI score as secondary.
- Stop full-page `paint()` on filter `input`; patch the table body only.
- Muted labels: `color: var(--c2); opacity: 0.72–0.88` + `--fv-*` (settings-profile contrast). No `#64748b` CRM greys.

## Out of this cut

- Outreach composer rewrite.
- Drag-and-drop kanban.
- `fusion-radar` Motoko API.
- Moving Access into Studio Settings (collapse is enough).
