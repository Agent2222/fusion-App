# Studio ↔ testData ↔ persistence matrix

URL / field-kind rules for the Content editor: [`STUDIO_FIELD_REGISTRY.md`](STUDIO_FIELD_REGISTRY.md) (`getFieldKind` in `src/fusion-app-frontend/src/utils/studioFieldRegistry.js`).

Registry metadata (`primaryStudioSurface`, `studioSurfaces`) lives on each entry in `CONTENT_PAGE_REGISTRY` in [`database.js`](../src/fusion-app-frontend/src/utils/database.js). The **Content** tab lists only `primaryStudioSurface === 'content'`. **Home**, **Programs**, **Products**, and **Journal** tabs embed editors for the same canister slugs where noted.

| `testData` root | Primary Studio surface | Persist (test / live) |
|-----------------|------------------------|------------------------|
| `programHero` | Home | `upsertContentPage` slug `program-hero` |
| `applicationProcess` | Content | slug `application-process` |
| `termsAndConditions` | Content | `terms` |
| `privacyPolicy` | Content | `privacy` |
| `contact` | Content | `contact` |
| `faq` | Content | `faq` |
| `context` | Content | `context` |
| `info` | Home (blob; chapters also edited under Programs / Products / Journal) | `site-info` |
| `allPrograms` | Programs | Content page `all-programs` + `programs` canister / `LS_PROGRAMS_BLOCK` overlay |
| `editions` | Products | `editions-feed` + `editions` canister |
| `journals` | Journal | `journals-block` + `journals` canister |
| `eventRow` | Home | `event-row` |
| `objectsHighlight` | Home | `objects-highlight` |
| `galleryAccessCta` | Home | `gallery-access-cta` |
| `joinNetwork` | Home | `join-network` |
| `joinNetworkFlow` | Home | `join-network-flow` |
| `quoteRow` | Home | `quote-row` |
| `featureCards` | Home | `feature-cards` |
| `events` | Home | `events` |
| `audio` | Home | `audio` |
| `artistsPage` | Content | `artists-page` |
| `allArtists` | Artists tab | `artists` canister + `LS_ARTISTS_OVERLAY` |

Deep artist `locales.*` may move to user profile editing; Studio remains admin roster — see `STUDIO_COVERAGE_EXCEPTIONS.md`.
