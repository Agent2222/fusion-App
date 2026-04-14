# Profile data contract (artist records)

This document locks the **canonical shape** for artist roster rows (`testData.allArtists.artists[]` and canister `ArtistRecord`) and how the **public profile** and **feeds** consume them.

## Top-level (per artist, locale-agnostic)

| Field | Consumed by | Notes |
|------|-------------|--------|
| `id` | Studio, indexes | Stable internal id |
| `slug` | `/profile/:slug`, `getArtistBySlug` | Public URL key |
| `image` | `profile.js` hero, feeds | URL or dev asset path |
| `featuredOrder` | `listArtists`, homepage ordering | **Admin / policy** |
| `visibility` | feeds, listings | **Admin / policy** |
| `updatedAt` | audit | Mirror on write |
| `filter` | `app-feed-filter`, `deriveArtistFilterRow` | **Admin default** for discovery |
| `galleryFilter` | gallery access UI | **Admin default** |
| `locales` | All copy | In canister: JSON in `localesJson` |
| `account` | Private bucket | **Not** in Motoko `ArtistRecord` today; lives in seed `testData` only until `accountJson` (future) |

## Per-locale block (`locales.en` / `locales.ja`)

See inventory in the product plan. Fields include `name`, optional `firstName` / `lastName` (member settings UI derives `name` as `firstName` + `lastName` for compatibility), `discipline`, `status`, `location`, `bio`, **`world`**, `links`, `programs`, `masterPortfolio`, `events`, `wordsFromArtist`, `notes`, etc. Legacy data may still contain `seo`; the **member profile settings** UI does not edit SEO (Discovery) — use Studio or JSON import if you need to change `seo`.

## `world.*` polymorphism (string vs array)

Seed data is inconsistent: `perspective`, `vision`, `constructing`, and `context` may be a **string** or **string[]**.

**UI contract:** `profile.js` and shared helpers treat any value as **paragraphs**:

- `Array` → one `<p>` per non-empty string entry.
- Non-array → single paragraph from `String(raw)` if truthy.

**Storage / API contract:** Callers **should** normalize before PATCH using `normalizeWorldBlockForStorage()` in `src/utils/worldNormalize.js` so persisted JSON uses **arrays of strings** for those fields (string → one-element array). The canister stores opaque `localesJson` and does not re-encode today; normalization is enforced in the **settings UI** and any import scripts.

## Consumption matrix

| Area | Fields |
|------|--------|
| **Public profile (`profile.js`)** | `image`, locale `name`, `world.*` (practice, perspective, vision, constructing, context, quote, introGallery), `links`, `programs` (veteran banner) |
| **Feeds** | `image`, `filter`, locale labels as implemented in feed components |
| **Member profile settings (`settingsProfile.js`)** | Full `locales` JSON via `updateMyArtistLocalesJson`; hero image via `updateMyArtistProfilePatch`; no SEO fields in the form |

## Collector / non-artist profiles

Not represented in `testData` as a first-class row. See `CollectorProfileRecord` in `types.mo` and `docs/ADMIN_PROFILE_FIELDS.md` for the stub schema and future routing.

## Seed → canister migration

Use `buildArtistRecordsFromSeedArtists` in `src/fusion-app-frontend/src/utils/seedArtistRecordsFromTestData.js` to turn `allArtists.artists[]` into `ArtistRecord`-shaped rows (world text normalized, then `bulkUpsertArtists` in Studio). Parity checks: `npm test` in the frontend workspace (includes `seedArtistRecordsFromTestData.test.js`).
