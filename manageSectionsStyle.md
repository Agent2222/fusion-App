# Manage Sections Style Guide

This document defines the visual styling for the Studio `Manage Artist` in-page surface, based on the latest approved screenshot direction.

## Design Intent

- Editorial, quiet, premium admin UI.
- Very light background with subtle cards and dividers.
- High readability with restrained contrast and minimal accent color.
- Whitespace-led hierarchy over heavy borders.

## Target Styling (Reference Image)

This section defines the exact target look from the attached reference screenshot and should be treated as the visual acceptance criteria.

### Studio Shell Target

- **Left rail:** deep navy/ink panel with compact vertical rhythm and high legibility.
- **Brand block:** larger `FUSION` wordmark at top-left with clear separation from nav groups.
- **Nav groups:** uppercase micro-labels (`OVERVIEW`, `CONTENT`, `ACCOUNTS`, `OPERATIONS`, `ADMIN`) with low visual noise.
- **Nav items:** compact rows with subtle icons, small labels, and a restrained active highlight for `Artists`.
- **Top-right utility strip:** minimal `Admin`, `Account`, and settings icon treatment; no oversized controls.

### Manage Surface Target

- **Title hierarchy:** `Manage Artist` must be visually dominant and clearly separated from breadcrumb/meta rows.
- **Panel framing:** very light gray canvas, low-radius containers, thin neutral borders.
- **Identity row:** broad horizontal card with:
  - initials avatar token,
  - artist name as primary visual anchor,
  - slug chip as secondary identity marker,
  - compact metadata (role, joined date, status),
  - right-aligned `Profile` and `Visibility` key-value pair blocks.
- **Top actions:** `More actions` + close button in a quiet, outline style aligned to the top-right.

### Form + Tabs Target

- **Tabs:** slim, text-first tabs with active underline (not boxed pills).
- **Roster intro block:** explicit section heading (`Roster & Profile`) plus one-line helper text.
- **Form density:** moderate/compact; fields grouped into clean horizontal rows matching admin tooling conventions.
- **Input style:** light borders, square-to-soft corners, muted helper text under key fields.
- **Checkbox/toggle row:** `Featured` and `Featurable` remain inline and visually secondary to core inputs.

### Right Context Column Target

- Width should remain narrow and stable (roughly ~280px range) relative to the editor column.
- Three stacked cards:
  - `Artist Overview`
  - `Quick Links`
  - `System Info`
- Card treatment: white surface, thin borders, compact row spacing, no heavy shadows.
- Link styling: textual with subtle icon hints; keep the emphasis low and editorial.

### Footer Action Bar Target

- Left: quiet destructive button (`Delete artist`) with restrained red affordance.
- Right: `Cancel` (outline) and `Save changes` (solid black) with clear priority.
- Action row should feel anchored and aligned with the form width.

### Visual Restraint Rules

- Do not introduce bright accent colors outside semantic states.
- Avoid rounded-heavy cards, thick borders, or elevated shadow-heavy components.
- Favor spacing, typography, and thin dividers to create hierarchy.

## Overall Layout

- **Canvas:** full-width in-page manage surface over `.studio-category-page`.
- **Structure order:**
  1. Breadcrumb row (`Studio / Artists`) + top-right actions (`More actions`, close).
  2. Primary title (`Manage Artist`).
  3. Identity bar.
  4. Main content split:
     - Left: editable form/tabs.
     - Right: sticky context cards.
- **Main split ratio:** wide editor + narrow context column (approx `1fr / 280px`).

## Color System

- **Page background:** off-white neutral (`#f4f4f3` to `#f5f5f3` range).
- **Surface cards:** pure white (`#ffffff`).
- **Borders/dividers:** subtle neutral (`#ececeb`, `#e6e6e6`).
- **Primary text:** near-black (`#161616` to `#232323`).
- **Secondary/meta text:** muted grey (`#6b7280`, `#585858`).
- **Status badges:**
  - Public: soft green.
  - Pending: soft amber.
  - Private: soft indigo.
  - Inactive: neutral gray.

## Typography

- **Page title:** large editorial headline (`Manage Artist`), visually dominant.
- **Identity name:** nearly title-sized, one-line emphasis.
- **Section headings:** medium label-strong weight.
- **Field labels / metadata:** small, muted, consistent rhythm.
- **Tabs:** compact, low-contrast, active via underline (not pill style).

## Spacing and Sizing

- **Manage panel corner radius:** small (`~8px`), not rounded-heavy.
- **Outer panel padding:** compact (`~0.7rem` to `0.9rem`).
- **Identity bar padding:** moderate (`~0.75rem` to `0.9rem`).
- **Card spacing:** even vertical rhythm (`~0.75rem` gaps).
- **Field groups:** grouped with soft dividers and section headers.

## Identity Bar

- Left:
  - Circular initials/avatar token.
  - Artist name + slug chip.
  - Meta row: role/status text + visibility pill + joined date.
- Right:
  - Compact key-value blocks for Profile and Visibility.
  - Link style remains understated and clean.

## Tabs and Form Surface

- Keep tabs: `Roster`, `Identity`, `World`, `New World`, `Media`, `Links & SEO`, `Programs`, `Advanced`.
- Tabs are horizontal and compact, with:
  - low-contrast default text,
  - subtle hover background,
  - active bottom underline.
- Roster panel starts with:
  - `Roster & Profile` heading,
  - short explanatory subtext,
  - then grouped fields.

## Right Context Panel

- Three stacked cards:
  - `Artist Overview`
  - `Quick Links`
  - `System Info`
- Each card:
  - white background,
  - light border,
  - tight header + compact key-value rows.
- `Quick Links` should use plain textual links, no loud button styling.

## Footer Actions

- Left: restrained destructive action (`Delete artist`) with soft red outline.
- Right: `Cancel` + strong black `Save changes`.
- Keep action bar fixed to form bottom flow with top divider.

## Interaction Rules

- Hover/focus/active transitions: `150ms-200ms`.
- Focus state visible but not glowing/heavy.
- Avoid deep shadows; rely on spacing and thin borders.
- Preserve calmness: no saturated accents except semantic status indicators.

## Accessibility Notes

- Ensure text contrast for meta content remains readable.
- Keep focus rings visible for keyboard navigation.
- Maintain sticky context panel behavior on desktop; collapse gracefully on smaller widths.
- Do not rely on color alone for status meaning.

## Implementation Reference

- Primary file: `src/fusion-app-frontend/src/styles/studio.css`
- Supporting structure:
  - `src/fusion-app-frontend/src/components/studio/panels.js`
  - `src/fusion-app-frontend/src/utils/studioArtistForm.js`

