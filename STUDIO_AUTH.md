# Studio authentication (Internet Identity)

Today `src/fusion-app-frontend/src/utils/studioAuth.js` reuses **`getFusionBackendActor()`** (anonymous agent). Local **`bootstrapAdminIfEmpty`** sets the anonymous principal as admin so `getSubscribers` / `listApplicants` work without signing in.

## Production direction

1. Add **`@dfinity/auth-client`** (and optionally `@dfinity/identity`) to `fusion-app-frontend`.
2. In `studioAuth.js`, create an `AuthClient`, use the Internet Identity URL from `config.js` / `IC_CONFIG` (see plan: local `http://{ii}.localhost:4943` vs mainnet II URL).
3. Build `HttpAgent` with `identity` from `authClient.getIdentity()` and pass it into `Actor.createActor` for `declarations/fusion-app-backend`.
4. Studio shell: add “Sign in” / “Sign out” in the sidebar; only call admin methods when `isCallerAdmin` / `listAccounts` succeeds with the signed-in principal.

**VetKD**: keep using the same agent identity for key derivation paths tied to the user’s principal (see `VETKD.md`).
