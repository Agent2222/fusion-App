# Studio field registry (URL kinds)

This document complements [`STUDIO_ADMIN_REFACTOR_PLAN.md`](STUDIO_ADMIN_REFACTOR_PLAN.md) and [`STUDIO_TESTDATA_MATRIX.md`](STUDIO_TESTDATA_MATRIX.md).

## Four buckets

| Kind | Meaning | Upload in Studio |
|------|---------|------------------|
| `route` | In-app path (`/program/...`, `/journal/entry/...`) | No |
| `assetUrl` | Owned media (images, video, gallery slots) | Yes (S3 presign) |
| `externalUrl` | Third-party URL (partner site, social) | Optional “Host on CDN” |
| `audioUrl` | Audio file URL | Yes |
| `plainText` | Copy, HTML snippets, long text | No |

## Implementation

- Logic: [`src/fusion-app-frontend/src/utils/studioFieldRegistry.js`](../src/fusion-app-frontend/src/utils/studioFieldRegistry.js) — `getFieldKind(slug, path)`.
- S3 requires **Services** tab: integration API URL + bearer, bucket/region (see app help).

## Studio vs artist profile

Deep `locales.*` profile editing is deferred to the future **user profile** dashboard per [`STUDIO_COVERAGE_EXCEPTIONS.md`](STUDIO_COVERAGE_EXCEPTIONS.md). Studio remains admin roster + CMS blobs.

## Slug notes (abbrev.)

| Slug | Route-like paths | Asset paths |
|------|------------------|-------------|
| `journals-block` | `journals.*.link` | `journals.*.imageSrc` |
| `editions-feed` | `items.*.href` | `items.*.imageSrc` |
| `gallery-access-cta` | `ctaLink` | — |
| `quote-row` | `*.attributionHref` | — |
| `audio` | — | `*.link` as `audioUrl` |
| `program-hero` | `routeLink`, `en.routeLink`, … | `imageSrc` |
| `join-network-flow` | `*.href` in confirmation links | copy-driven |
| `objects-highlight` | top-level / locale `link` | `objects.*.image` |

Fallback for unmigrated paths uses a **legacy heuristic** (narrower than the old `link` = asset rule).

## Programs & Products (Studio tabs)

- **Programs** modal: `routeLink` uses the same **Route** kind as `program-hero`. **Card imageSrc (EN/JA)** rows use the **Media** kind aligned with `all-programs` paths (`programs.en.0.imageSrc` / `programs.ja.0.imageSrc`); values merge into locale JSON on save; upload uses Services → S3 presign.
- **Products** (editions) modal: `href` and `imageSrc` badges match **editions-feed** (`items.*.href` / `items.*.imageSrc`). Deep `programPage` trees remain easier to edit under **Content → all-programs** than in the program JSON textarea alone.
