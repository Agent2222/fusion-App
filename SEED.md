# Seeding the Fusion backend canister

After changing Motoko (`types.mo`, `main.mo`), run **`dfx generate fusion-app-backend`** from the project root so `src/declarations` (or your configured output) matches the new API.

## Owner workflow (local)

1. Start the local replica: `dfx start` (or your usual process).
2. Deploy: `dfx deploy fusion-app-backend` (and frontend assets as needed).
3. Generate JS bindings: `dfx generate fusion-app-backend`.
4. Populate data using one of:
   - **Studio** (Live data source): after `bootstrapAdminIfEmpty`, use future “Import from test JSON” or call `upsertProgram` / `upsertJournalEntry` / etc. from a small script once those UI actions exist.
   - **Ad-hoc `dfx canister call`**: encode candid arguments for `upsertProgram`, `upsertArtist`, etc. (verbose for large JSON — prefer a Node script using `@dfinity/agent`).

## JSON shape hints

- **ProgramRecord**: `localesJson` should contain `{ "en": { ...program card + programPage... }, "ja": { ... } }` aligned with `testData.allPrograms.programs`.
- **JournalRecord**: `localesJson` holds `{ "en": {...}, "ja": {...} }` plus image references; `imageKey` can be an asset URL or key.
- **EditionRecord**: `localesJson` includes `imageSrc`, `en`, `ja` matching `testData.editions.items[]`.
- **ContentPageRecord**: `localesJson` mirrors `termsAndConditions` / `privacyPolicy` style blocks per slug.

## Optional Node seed script (not committed)

You can add a dev-only script under `scripts/` that reads `src/fusion-app-frontend/src/testData.js` exports (or a trimmed JSON export) and calls `upsert*` methods with an identity that is already admin. Keep the script out of CI if it embeds local paths.
