# Studio ↔ testData ↔ persistence matrix

URL / field-kind rules for the Content editor: [`STUDIO_FIELD_REGISTRY.md`](STUDIO_FIELD_REGISTRY.md) (`getFieldKind` in `src/fusion-app-frontend/src/utils/studioFieldRegistry.js`).

| `testData` root | Studio surface | Persist (test / live) |
|-----------------|----------------|------------------------|
| `programHero` | Content → program-hero | `upsertContentPage` slug `program-hero` |
| `applicationProcess` | Content | slug `application-process` |
| `termsAndConditions` | Content | `terms` |
| `privacyPolicy` | Content | `privacy` |
| `contact` | Content | `contact` |
| `faq` | Content | `faq` |
| `context` | Content | `context` |
| `info` | Content | `site-info` |
| `allPrograms` | Content (`all-programs`) + Programs tab | Content page + `programs` / `LS_PROGRAMS_BLOCK` overlay |
| `editions` | Content (`editions-feed`) + Products (editions) | Content + `editions` canister |
| `journals` | Content (`journals-block`) + Journal tab | Content + `journals` canister |
| `eventRow` | Content | `event-row` |
| `objectsHighlight` | Content | `objects-highlight` |
| `galleryAccessCta` | Content | `gallery-access-cta` |
| `joinNetwork` | Content | `join-network` |
| `joinNetworkFlow` | Content | `join-network-flow` |
| `quoteRow` | Content | `quote-row` |
| `featureCards` | Content | `feature-cards` |
| `events` | Content | `events` |
| `audio` | Content | `audio` |
| `allArtists` | Artists tab | `artists` canister + `LS_ARTISTS_OVERLAY` |

Deep artist `locales.*` may move to user profile editing; Studio remains admin roster — see `STUDIO_COVERAGE_EXCEPTIONS.md`.
