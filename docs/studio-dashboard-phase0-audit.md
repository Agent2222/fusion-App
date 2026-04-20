# Studio dashboard Phase 0 — redundancy audit (implementation record)

This document satisfies **Phase 0** of the Studio reimagination plan: map Motoko surfaces to Studio tabs and flag Content CMS overlap. Stakeholder Q&A should still confirm **keep / merge / remove** where marked **TBD**.

## 1) Backend (`fusion-app-backend`) → primary mutation / query

| Persisted shape | Key actor APIs | Primary Studio tab |
|-----------------|----------------|---------------------|
| `Artist` / `ArtistRecord` | `listArtists`, `getArtistBySlug`, `listArtistRecordsPublic`, `getArtistRecordBySlug`, `getMyArtistRecord`, `listArtistRecordsForStudio`, `upsertArtist`, `bulkUpsertArtists`, `deleteArtistById`, `updateMyArtistLocalesJson`, … | **Artists** |
| `ProgramRecord` | `listPrograms`, `getProgram`, `upsertProgram`, `bulkUpsertPrograms`, `deleteProgram` | **Programs** |
| `JournalRecord` | `listJournalEntries`, `getJournalEntry`, `upsertJournalEntry`, `deleteJournalEntry` | **Journal** |
| `EditionRecord` | `listEditions`, `upsertEdition`, `deleteEdition` | **Products** |
| `ContentPageRecord` | `listContentPages`, `getContentPage`, `upsertContentPage`, `deleteContentPage` | **Content** (per `CONTENT_PAGE_REGISTRY` slug) |
| `Subscriber` / `ApplicantRecord` / accounts | various `upsert*` / `list*` | **Subscribers**, **Applicants**, **Users** |
| Site / integration | `getSiteSetting`, `setSiteSetting`, integration helpers | **Services**, **Settings** |

No parallel Motoko tables were found for the same resource; overlap is **frontend-only** (Content JSON vs entity tabs).

## 2) Studio nav (`STUDIO_NAV` in `panels.js`)

Subscribers, Applicants, Artists, Programs, Products, Gallery Access, Journal, **Content**, Email, Ai, Galleries, Collectors, Curators, Users, Services, Settings (+ dashboard).

## 3) Content CMS (`CONTENT_PAGE_REGISTRY` in `database.js`) vs entity tabs

| Registry slug / key | Label | Overlap with entity tab? | Same JSON as canister program/artist? | Suggested action |
|---------------------|-------|---------------------------|----------------------------------------|-------------------|
| `all-programs` | Programs block (order + cards) | **Programs** tab edits `ProgramRecord` + test `allPrograms` block | **Partial** — marketing grid vs canonical program rows | **TBD**: treat block as presentation layer; avoid duplicating per-program fields already in **Programs**. |
| `program-hero` | Home — program hero | **Programs** (copy/hero may mirror program) | **Partial** | **TBD**: single source for program titles vs home hero strings. |
| `journals-block` | Journal — home list | **Journal** tab | **Partial** (order + list vs entries) | **TBD**: keep for home layout; journal entries still canonical in **Journal**. |
| `editions-feed` | Editions grid | **Products** | **Partial** | **TBD**. |
| `site-info` | Site info blocks | None | `testData.info` — not same as artist/program records | **Keep** as CMS. |
| Remaining slugs (terms, privacy, context, join-network, etc.) | Copy / structured JSON | Mostly none | N/A | **Keep** unless product retires a page. |

## 4) Grep commands (repeat after large nav/registry changes)

```bash
rg -n "public (shared|query|func)" src/fusion-app-backend/main.mo
rg -n "STUDIO_NAV|STUDIO_INIT|renderStudioMain|initStudioMain" src/fusion-app-frontend/src/components/studio/
rg -n "CONTENT_PAGE_REGISTRY|fillStudioContentPlainFields" src/fusion-app-frontend/src/utils/database.js src/fusion-app-frontend/src/components/studio/
rg -n "program-hero|all-programs|allPrograms" src/fusion-app-frontend/src/utils/studioFieldRegistry.js
```

## 5) Phase 0 exit checklist

- [x] Matrix drafted (this file).
- [ ] Stakeholder sign-off on `all-programs` / `program-hero` vs **Programs** tab (plan gate).
- [ ] Explicit deferrals documented in issue tracker if not resolved.
