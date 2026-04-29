# Studio backend (light workspace) styling

This document captures the **visual rules** used for the **Email Campaigns** section in Studio (`/.studio-ec` in [`src/fusion-app-frontend/src/styles/studioEmailCampaign.css`](src/fusion-app-frontend/src/styles/studioEmailCampaign.css)). Use it as a **reference** when building or restyling other light-workspace Studio surfaces so the admin UI stays coherent: warm off-white shell, white panels, thin warm gray borders, and monochrome black primaries.

## Design intent

- **Warm, not cool:** Avoid Tailwind-style slate borders (`#cbd5e1`, `#e2e8f0`) on white; they read bluish. Prefer **`#dedbd8`** and soft fills **`#ece8e5`**.
- **High-contrast type:** Primary text **`#111`**, secondary/muted **`#6f6f6f`**, placeholders a step lighter (e.g. **`#8a8a8a`**).
- **Panels on a canvas:** Main scroll area **`#fbf7f5`**; cards and columns **`#ffffff`**, with a **soft shadow** so the white block sits above the canvas.
- **Monochrome actions:** Primary black **`#050505`**; no blue for focus rings, selection, or “info” text in this system—use **black/neutral gray** instead.
- **Typography axis:** Keep the app font stack in Studio (e.g. `momochidori-variable`, `Inter`, `system-ui`) and use **`font-variation-settings`** from [`index.css`](src/fusion-app-frontend/src/index.css) (`--fv-title`, `--fv-label`, `--fv-body`, etc.). For dense UI copy, the Email module often uses **`--ec-fv-text`** mapped to **`--fv-label`** (500) so fields do not look “hairline” at 400.

## Core tokens (Email module)

These are implemented on **`.studio-ec`**. When adding a new Studio feature, either **reuse the same custom properties** on a root wrapper or **copy the hex values** into scoped rules.

| Token / role | Value | Notes |
|--------------|--------|--------|
| Canvas / studio background | `#fbf7f5` | Behind the main white card; also used for `.studio-main:has([data-studio-ec-root])` and breadcrumb rail when Email is open. |
| Panel / field surface | `#ffffff` | Columns, inputs, toolbars, AI bar, dock. |
| Border default | `#dedbd8` | 1px rules, input borders, dividers. |
| Border soft (bands) | `#ece8e5` | List header strip, very light fills. |
| Text main | `#111111` | Headings, labels, body. |
| Text secondary | `#3f3f3f` | Optional mid emphasis. |
| Text muted | `#6f6f6f` | Hints, inactive tabs, helper lines. |
| Text faint | `#8a8a8a` | Placeholders, counters. |
| Primary CTA | `#050505` | Filled black buttons; hover e.g. `#262626`. |
| Danger (destructive) | `#c93b3b` | Delete/danger only; keep light red background for affordance. |
| Shadow soft | `0 12px 30px rgba(0, 0, 0, 0.04)` | Card shell, AI bar, action dock. |
| Radius sm / md / lg | `6px` / `10px` / `14px` | Inputs/chips; AI bar and dock; outer layout card. |

## Layout rules

- **Outer card** (e.g. `.studio-ec__layout`): White background, **`1px solid #dedbd8`**, **large radius** (14px), **min-height** comfortable on desktop (~760px), **soft shadow** so it reads as one surface on `#fbf7f5`.
- **Columns:** All **white**; separation with **vertical** `1px` borders using the default border color—no heavy gray “prison bars.”
- **Grid:** Balance column `minmax` so the **center editor** is visually dominant; keep responsive breakpoints that stack without breaking border continuity.

## Shell (Studio chrome, Email route only)

When the module root **`[data-studio-ec-root]`** is present, the stylesheet scopes shell tweaks with **`:has()`** (no HTML changes):

- **`.studio-main:has([data-studio-ec-root])`:** Warm background **`#fbf7f5`**, generous **bottom padding** (~96px) so in-flow action bars are not flush to the viewport edge.
- **`.studio-workspace:has([data-studio-ec-root]) .studio-topbar`** and **`.studio-workspace-rail`:** Border color **`#dedbd8`**, rail background **`#fbf7f5`** to match the page.

Do **not** use these selectors to restyle **`.studio-sidebar`** (left nav remains the existing dark Studio chrome unless a separate spec says otherwise).

## Forms

- **Inputs / textarea / select:** `1px solid` border token, **6px** radius, **12px 14px** padding, **14px** font size, **white** background, text **`#111`**. Placeholders use the **faint** ink token.
- **Focus (mouse):** `outline: none` on the control; **`border-color: #111`**. Avoid default blue focus rings inside this system.
- **Focus (keyboard):** **`:focus-visible`:** thin **1px `#111` outline** with small offset—enough for a11y without a heavy box.
- **Selection:** `::selection` with a **light black** wash (e.g. `rgba(17,17,17,0.1)`), not system blue.
- **Accent / caret:** `accent-color` and `caret-color` set to **`#111`** on the module root where applicable.

## Tabs (text + underline)

- Inactive: **muted** text (`#6f6f6f`), **no** bottom border.
- Active: **main** text (`#111`), **2px** bottom border **`#111`**, stronger `font-variation` (e.g. title axis).
- Tab row can use a **fixed min-height** (e.g. 64px) for parity with marketing-style email tabs.
- Hover (inactive): slight **black tint** background (`rgba(0,0,0,0.04)`), do not introduce blue.

## Toolbar (rich text / format)

- Bar height ~**48px**, **white** background, **top** corners rounded (10px) to meet the editor card; **bottom** border of toolbar removed where it meets the canvas so the seam is a single line.
- Icon buttons: **transparent** default, **#f2efed** on hover; **no** bordered chip look unless the reference calls for it.

## Chips / pills

- **Pill** radius **999px**, **12px** font, border = default border token, **white** fill; hover **#f2efed** and **#111** border/text.

## Buttons (`.studio-btn-*` inside the module)

- **Primary:** Background and border **`#050505`**, white label; hover **`#262626`**.
- **Secondary / ghost (non-destructive):** White fill, **`#dedbd8`** border, **`#111`** text; hover **`#f8f6f4`** and border/text toward **`#111`** (soft pattern).
- **Destructive:** Keep clearly **red** (e.g. `#c93b3b`) with light red field background; do not reuse primary black.

## Status row (pill)

- **Inline pill:** `display: inline-flex`, **#f0f0f0** background, **999px** radius, **~13px** type, **~7px** status dot **#111**—matches a “Draft / status” chip without extra markup.

## AI assist bar

- **White** card, **10px** radius, **1px** default border, **`--ec-shadow-soft`**, **~14px** padding.
- Title line full width; actions in a **row** with **~38px** min-height controls and **8px** gap; flex so actions share space on small widths.

## Action dock (footer of the module)

- **Frosted** bar is optional: `rgba(255,255,255,0.92)` + `backdrop-filter: blur(12px)`; for **`prefers-reduced-transparency: reduce`**, use **solid white** and drop blur.
- Border + **soft shadow**; min button height ~**42px**; **6px** radius to match inputs.
- Prefer **main bottom padding** to clear the dock when scrolling, instead of `position: fixed` on the dock unless the product spec requires a viewport-stuck bar.

## What to avoid

- **Cool grays** for borders on white (they read as blue).
- **Blue** focus rings, info text, or hovers in this warm/monochrome system.
- **Rewriting** generated Candid/JS bindings; Studio UI changes live in **CSS** and, when needed, **Motoko**—regenerate declarations after API changes (see [`.cursor/rules/dfx-candid-agent.mdc`](.cursor/rules/dfx-candid-agent.mdc)).
- **Changing** `font-family` away from the Studio stack unless there is a global design decision—variation is controlled with **`--fv-*`** in `index.css`.

## File reference

| Area | File |
|------|------|
| Email Campaigns (implementation) | [`src/fusion-app-frontend/src/styles/studioEmailCampaign.css`](src/fusion-app-frontend/src/styles/studioEmailCampaign.css) |
| Global font-variation tokens | [`src/fusion-app-frontend/src/index.css`](src/fusion-app-frontend/src/index.css) (`:root` `--fv-*`) |
| Shared Studio shell (topbar, main, inputs) | [`src/fusion-app-frontend/src/styles/studio.css`](src/fusion-app-frontend/src/styles/studio.css) |

## Related

- [manageSectionsStyle.md](manageSectionsStyle.md) — Manage Artist section direction (separate from this warm Email reference; reconcile consciously if a screen uses both).
