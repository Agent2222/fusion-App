# Who may change which profile fields

Matrix for **artist roster** rows (`ArtistRecord` + JSON `localesJson`). Studio dashboard and future settings UI should follow this split.

| Field / area | Public read | Signed-in artist (linked) | Staff / admin | Notes |
|--------------|-------------|---------------------------|---------------|--------|
| `profile.slug`, `profile.id` | Yes | Read-only | Yes | Slug changes risk broken URLs — prefer admin-only. |
| `profile.image` | Yes | **Editable** (media URL) | Yes | |
| `profile.updatedAt` | Yes | Set on save | Yes | |
| `localesJson` (copy, world, links, bio, SEO, …) | Yes (public projection) | **Editable** | Yes | Normalize `world.*` via `worldNormalize.js` before save. |
| `profile.visibility` | Yes | Read-only | **Admin** | Listing / policy. |
| `profile.featuredOrder` | Yes | Read-only | **Admin** | Homepage ordering. |
| `profile.filter` | Yes | Read-only | **Admin** | Feed defaults. |
| `profile.galleryFilter` | Yes | Read-only | **Admin** | Gallery UI defaults. |
| `locales.*.notes` | If exposed | Read-only | **Admin / curator** | Curator copy. |
| `imported`, `accessCode` | No (stripped on public query) | Owner sees via `getMyArtistRecord` | Studio | Onboarding. |
| `notesEncrypted` | No | N/A | Staff | VetKD / studio notes. |

## Collector / member profiles (`CollectorProfileRecord`)

Not persisted in the canister yet. Intended split: **owner** edits display name, locale bios, links; **admin** may set visibility or verification flags when the table exists.

## Studio (`studio_admin_dashboard`)

Use the same entity: user routes call `updateMyArtistLocalesJson` for JSON locales; admin tools continue to use `upsertArtist` / `bulkUpsertArtists` for overlays and roster fields.
