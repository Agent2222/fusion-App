# Studio admin refactor — refined plan (codebase audit)

This document **refines** the Cursor plan for refactoring Studio into a schema-aware CMS. It reflects **what already exists** in the repo vs **frontend refinement** vs **new modules**.

**Related:** [`STUDIO_TESTDATA_MATRIX.md`](STUDIO_TESTDATA_MATRIX.md), [`STUDIO_COVERAGE_EXCEPTIONS.md`](STUDIO_COVERAGE_EXCEPTIONS.md), [`testData.js`](../src/fusion-app-frontend/src/testData.js).

---

## 1. What already exists (do not rebuild)

| Capability | Where | Notes |
|------------|-------|--------|
| Studio shell, sidebar, hash sections, mobile drawer | [`studio.js`](../src/fusion-app-frontend/src/components/studio.js), [`panels.js`](../src/fusion-app-frontend/src/components/studio/panels.js) (`STUDIO_NAV`, `renderStudioMain`) | Stable |
| CMS registry + persistence | [`database.js`](../src/fusion-app-frontend/src/utils/database.js) `CONTENT_PAGE_REGISTRY`, `getContentBundleForStudio`, `upsertContentPageStudio` | Test mode: `localStorage`; live: canister |
| Flattened string editing + scalar patches | [`studioPlainForms.js`](../src/fusion-app-frontend/src/utils/studioPlainForms.js) `flattenStringFields`, `applyStringPatches`, `flattenScalarFields`, `applyScalarPatches` | Save pipeline stays until you intentionally change it |
| Content section UI | [`panels.js`](../src/fusion-app-frontend/src/components/studio/panels.js) `renderContent`, `initContent`, `fillStudioContentPlainFields` | Table of sections → editor panel |
| Search/filter content list | `initContent` — `#studio-content-filter`, count | Done |
| S3 presign + upload | [`studioS3Upload.js`](../src/fusion-app-frontend/src/utils/studioS3Upload.js), Services tab test upload in `initServices` | Integration API required |
| Asset upload beside **some** fields | [`panels.js`](../src/fusion-app-frontend/src/components/studio/panels.js) `isContentAssetFieldPath`, `isAudioishContentPath`, `change` on file input → `uploadBlobToS3` | **Heuristic** — needs replacement/refinement (see §3) |
| Programs entity UI | `openProgramModal`: **structured** inputs for `id`, `routeLink`, `featuredOrder`, `visibility`, `studioStatus` + EN/JA textareas | Route is already a normal input, not a blob |
| Locale JSON/plain for programs/editions/journal | [`studioLocaleEdit.js`](../src/fusion-app-frontend/src/utils/studioLocaleEdit.js) | JSON or plain text mapping |
| Artists roster + batch import | [`panels.js`](../src/fusion-app-frontend/src/components/studio/panels.js) `renderArtists` — banner states profile dashboard owns deep locales | Align widgets later; scope is **admin**, not full profile |
| Studio styling (toolbar, scroll, field rows) | [`studio.css`](../src/fusion-app-frontend/src/styles/studio.css) `.studio-content-*` | Extend for previews / new widgets |

---

## 2. Gaps vs the “four bucket” URL model

The **intended** model: **route** | **assetUrl** | **externalUrl** | **audioUrl**.

**Current behavior:** `isContentAssetFieldPath` marks upload for:

- Any path whose last segment is `link` (among others).

That is **over-broad**: in `testData`, many **`link` fields are in-app routes** (e.g. `journals[].link` → `/journal/entry/1`), not S3 assets. Those fields currently get an “Upload to storage” button, which is **misleading** and should be fixed by a **registry** (path + slug context), not more regex.

Similarly, **`href`** is not globally an asset: `editions.items[].href` is a **route**; some `href` under artist `events` are routes. Heuristic `href` + `image|asset|media` is partial.

**Conclusion:** The refactor is **not** “add S3 from scratch” — it is **(1)** introduce explicit `getFieldKind(slug, path)` and **(2)** replace upload affordances + controls per kind + **(3)** optional image/audio preview.

---

## 3. `editorMode: 'locales' | 'full'` vs actual UI

[`CONTENT_PAGE_REGISTRY`](../src/fusion-app-frontend/src/utils/database.js) sets `editorMode` for summaries and tooling, but **`initContent` always** runs `fillStudioContentPlainFields(bundle)` on the **full** document returned by `getContentBundleForStudio` — there is **no separate branch** for “locales-only” pages today.

**Refinement option (lower priority than URL kinds):** for `locales` entries, optionally render **EN/JA column split** for shallow `{ en: [], ja: [] }` legal pages — cosmetic; the **registry + URL widgets** matter more.

---

## 4. Refined implementation phases

### Phase A — Registry + fix wrong uploads (highest ROI)

1. Add **`studioFieldRegistry.js`** (or equivalent): `getFieldKind(slug, path)` returning `route | assetUrl | externalUrl | audioUrl | plainText | …` with **per-slug** rules first, **fallback** to current behavior for unmigrated paths.
2. **Narrow** `isContentAssetFieldPath` to **fallback-only** once rules cover migrated paths; or delegate entirely to `getFieldKind === 'assetUrl' | 'audioUrl'`.
3. **Immediate fix:** paths classified as **`route`** or **`plainText`** → **no** upload button; `audioUrl` → audio accept + player; `assetUrl` → image/video accept + preview thumbnail.

### Phase B — Shared widgets (frontend refinement)

4. Extract **`StudioAssetUrlInput`**, **`StudioRouteInput`**, **`StudioExternalUrlInput`**, **`StudioAudioUrlInput`** from the imperative DOM in `fillStudioContentPlainFields` (small modules under `components/studio/fields/`).
5. Add **preview** (`<img>` / `<audio>`) for URL fields when value looks like HTTP(S) — optional loading state.
6. **CSS:** extend [`studio.css`](../src/fusion-app-frontend/src/styles/studio.css) for previews and compact rows; `#studioMainContent` already scrolls inside `.studio-main`.

### Phase C — Section-by-section migration (content slug)

Order tuned to **fix wrong buttons first** and **high media** second:

| Priority | Slug(s) | Why |
|----------|---------|-----|
| P0 | `journals-block`, `editions-feed`, `gallery-access-cta`, `quote-row` | route-like `link` / `href` / `ctaLink` / `attributionHref` must **not** show asset upload |
| P1 | `program-hero`, `events`, `audio` | Clear asset vs route |
| P2 | `all-programs`, `objects-highlight`, `context` | Many nested images |
| P3 | `join-network-flow` | Large tree — use **accordions** (layout refinement), same URL rules |

**Locales pages** (`terms`, `privacy`, etc.): mostly `plainText`; ensure no `link` false positives.

### Phase D — Entity tabs (refinement, not greenfield)

| Tab | Current | Refinement |
|-----|---------|------------|
| Programs | `routeLink` input + JSON locale textareas | Keep structured top row; add asset/upload widgets **inside** locale JSON editing only when parsing known shapes — **or** keep JSON for `programPage` until a structured `programPage` editor exists |
| Products | Similar pattern | Same |
| Artists | Roster + batch JSON | Optional: single-field image URL row with upload; **do not** scope full `locales` forms here — profile dashboard |

### Phase E — Tests

7. Extend coverage tests ([`testdataCoverage.test.js`](../src/fusion-app-frontend/src/utils/testdataCoverage.test.js) / walk): for each **registered** path kind, assert **upload capability** matches `assetUrl` | `audioUrl` only.

---

## 5. Boundary: Studio vs user/artist profile dashboard

Already documented in UI copy and [`STUDIO_COVERAGE_EXCEPTIONS.md`](STUDIO_COVERAGE_EXCEPTIONS.md):

- **Studio:** moderation, CMS blobs, programs, journal, editions, integrations.
- **Future profile dashboard:** deep `locales` bio/gallery editing.

The **same URL widgets** (`StudioAssetUrlInput`, etc.) can be reused in the profile app later; keep them **presentational + uploadBlobToS3** in a shared module.

---

## 6. Out of scope for this refactor (unless explicitly added)

- New Motoko record types or changing `upsertContentPage` payload shape.
- Full replacement of program `programPage` JSON with a multi-page wizard (can be a **later** project).
- Virtualized spreadsheet for every `testData` key in one view.

---

## 7. Todo checklist (refined)

- [ ] **A1** — Add `studioFieldRegistry.js` with `getFieldKind(slug, path)` + tests for known false positives (`journals.*.link`, `editions.*.href`).
- [ ] **A2** — Wire `fillStudioContentPlainFields` to use registry for upload + input type (hide upload for `route`).
- [ ] **B1** — Extract reusable field components + previews.
- [ ] **C1** — Migrate P0–P3 slugs per table above.
- [ ] **D1** — Programs/Products: optional upload for `imageSrc` in JSON paths only if registry lists them (avoid big-bang rewrite).
- [ ] **E1** — Extend vitest assertions for field kinds vs upload.

---

*Last updated from codebase audit (Studio + testData + database registry).*

---

## 8. UX / UI (layout and flow)

Detailed **layout, flow, field affordances, deep-tree patterns, and feedback** are specified in the Cursor plan **`studio_admin_refactor_a7941ebb.plan.md`** (section **UX and UI — layout, flow, and polish**). Implement registry fixes (P0) together with **sticky save**, **kind-based visual grammar** (Route vs Media vs External vs Audio), and **preview/upload states** so the admin UI stays trustworthy—not only technically correct.
