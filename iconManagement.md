# Studio Icon Management

This redesign uses semantic icon keys so UI components do not hardcode asset file paths.

## Asset location

- Folder: `src/fusion-app-frontend/src/assets/icons/`
- Naming pattern: `ic-<key>.svg`
- Example: `ic-nav-artists.svg`

## Auto-population behavior

- `src/fusion-app-frontend/src/utils/studioIconRegistry.js` resolves icons using:
  - `import.meta.glob('../assets/icons/ic-*.svg', { eager: true, import: 'default' })`
- If an icon file matching `ic-<key>.svg` exists, it is automatically used.
- If not found, the UI falls back to neutral text glyphs (non-blocking).

## Preselected semantic keys

### Sidebar group keys

- `group-overview`
- `group-content`
- `group-accounts`
- `group-operations`
- `group-admin`

### Sidebar item keys

- `nav-home`
- `nav-subscribers`
- `nav-applicants`
- `nav-programs`
- `nav-products`
- `nav-journal`
- `nav-sound`
- `nav-community`
- `nav-content`
- `nav-email`
- `nav-ai`
- `nav-assistance` (preferred; keep `nav-ai` as backwards-compatible alias)
- `nav-artists`
- `nav-status` (renamed from pending approval)
- `nav-curators`
- `nav-collectors`
- `nav-galleries`
- `nav-gallery-access`
- `nav-users`
- `nav-services`
- `nav-settings`
- `nav-team`
- `nav-permissions`

### Assistance workspace keys

- `assist-refine`
- `assist-generate`
- `assist-translate`
- `assist-copy`
- `assist-replace-input`
- `assist-save-draft`
- `assist-apply-field`
- `assist-profile`
- `assist-context`
- `assist-guide`

### Manage Artist context/action keys

- `artist-identity`
- `artist-visibility`
- `artist-profile-link`
- `artist-overview`
- `artist-quick-actions`
- `artist-system-info`
- `artist-delete`
- `artist-save`
- `artist-cancel`

### Email campaigns workspace keys (Studio → Email)

Planned for the **Email Campaigns** three-zone UI (see Cursor plan *Studio Email Campaigns — icon inventory*). Add files under `src/fusion-app-frontend/src/assets/icons/` as `ic-<key>.svg`, then add the same keys to `ICON_KEYS.email` in `studioIconRegistry.js` when you wire the UI.

**P0 — shell, left column, right column, sticky bar**

- `email-tab-compose` — Compose tab
- `email-tab-generate` — Generate tab (may reuse for *Generate draft* sparkle)
- `email-tab-templates` — Templates tab
- `email-field-tone` — Tone select row
- `email-field-length` — Length select row
- `email-field-audience` — Audience intent row
- `email-header-history` — *Campaign history* (clock / history)
- `email-info` — Left column info callout
- `email-refresh` — Recipients *Updated* / refresh
- `email-sticky-saved` — *All changes saved* check (optional if text-only)
- `email-send` — *Send campaign* (paper plane); pair with *Send test* if needed
- `email-error` — Save / send error (optional; text-only ok in v1)

**P1 — center rich toolbar + editor chrome**

- `email-toolbar-paragraph`, `email-toolbar-bold`, `email-toolbar-italic`, `email-toolbar-underline`
- `email-toolbar-link`, `email-toolbar-list-bullet`, `email-toolbar-list-ordered`
- `email-toolbar-align-left`, `email-toolbar-align-center`, `email-toolbar-align-right`
- `email-toolbar-image`, `email-toolbar-personalize`
- `email-toolbar-undo`, `email-toolbar-redo`, `email-toolbar-clear`

**Reuse (no new file):** `assist-copy` for canvas *Copy* where appropriate; `nav-email` already in sidebar. Bottom canvas AI strip is text-first (no new icons required).

**Registry:** `ICON_KEYS.email` in `src/fusion-app-frontend/src/utils/studioIconRegistry.js` lists the semantic keys above; add `ic-<key>.svg` under `src/fusion-app-frontend/src/assets/icons/` when you ship P0 art.

## Usage rule

- Use semantic keys (`studioIconHref('nav-artists')`) in UI code.
- Do not hardcode direct icon file paths inside components.

## Incoming icon prep checklist

- Add new files under `src/fusion-app-frontend/src/assets/icons/` using the exact key name:
  - Example: `ic-assist-refine.svg`, `ic-nav-status.svg`
- Keep each icon as a single-color SVG (current Studio theme inverts to light on dark sidebar).
- Build at `24x24` viewBox with `1.5` or `2` stroke for consistency at small sizes.
- Avoid embedding fill backgrounds inside SVG assets (let CSS handle surfaces/states).
- For renamed sections, ship both legacy and new files temporarily when needed:
  - `ic-nav-ai.svg` and `ic-nav-assistance.svg`
  - `ic-nav-pending-approval.svg` and `ic-nav-status.svg`

