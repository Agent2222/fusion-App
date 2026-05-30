# Delete later (temporary Studio / legacy profile tooling)

Items tracked here are **short-lived** migration or ops helpers. Remove them once legacy S3 profile assets are fully migrated or the workflow is replaced.

## Legacy profile hero sync

- **Function:** `syncStudioArtistsLegacyHeroImages` in [`src/fusion-app-frontend/src/utils/database.js`](../src/fusion-app-frontend/src/utils/database.js)  
  - Clears **all** roster artists’ profile hero `image` field, then sets each to:
  - `https://fusionart-bucket.s3.us-east-2.amazonaws.com/uploads/legacyProfiles/<stem>-hero.jpg`  
  - `<stem>` is computed by `legacyProfileFileStem` in [`src/fusion-app-frontend/src/utils/studioLegacyProfileUrls.js`](../src/fusion-app-frontend/src/utils/studioLegacyProfileUrls.js) (`LEGACY_PROFILE_BASE` + stem + `-hero.jpg`).

- **UI:** Studio → Artists toolbar → **Sync Profile Images** (`#studio-artists-sync-hero`), wired in [`src/fusion-app-frontend/src/components/studio/panels.js`](../src/fusion-app-frontend/src/components/studio/panels.js) (`openLegacySyncConfirm('hero')`, `runLegacySync`).

- **Related helpers:** `legacyHeroUrl`, `legacyIntroUrl`, intro-gallery sync `syncStudioArtistsLegacyIntroGalleries` (separate button) — review together when deleting this flow.

## Firebase intro gallery migration (one-off)

- **Function:** `migrateStudioArtistsFirebaseIntroGalleries` in [`src/fusion-app-frontend/src/utils/database.js`](../src/fusion-app-frontend/src/utils/database.js)  
  - For each roster artist whose **English** intro gallery has **any** `firebasestorage.googleapis.com` URL in slots 0–2, replaces the full EN+JA `world.introGallery` with three legacy CDN URLs (`<stem>-intro-{0,1,2}.jpg`).

- **Detection:** `hasFirebaseIntroGalleryUrl` in [`src/fusion-app-frontend/src/utils/studioLegacyProfileUrls.js`](../src/fusion-app-frontend/src/utils/studioLegacyProfileUrls.js).

- **UI:** Studio → Artists → Admin tools → **Migrate Firebase Gallery** (`#studio-artists-migrate-firebase-gallery`).

When removing: delete the button, `migrateStudioArtistsFirebaseIntroGalleries`, and `hasFirebaseIntroGalleryUrl` if unused elsewhere.

When removing: drop the button and modal branch, delete or narrow the sync functions, and strip `LEGACY_PROFILE_BASE` usage if nothing else needs it.
