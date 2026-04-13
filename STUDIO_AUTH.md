# Studio authentication (Internet Identity)

## Current behavior

- **`@dfinity/auth-client`** is a dependency of `fusion-app-frontend`. Session state lives in **`src/fusion-app-frontend/src/utils/icAuth.js`** (`AuthClient`, `loginInternetIdentity`, `logoutInternetIdentity`, `fusion-auth-change` events). **`loginInternetIdentity()`** wraps `client.login()` in a `Promise` resolved from **`onSuccess`** — `login()` alone returns before the II popup finishes; without that, the UI would stay on “Sign in” until a second click.
- **`getStudioAuthenticatedActor()`** in [`src/fusion-app-frontend/src/utils/studioAuth.js`](src/fusion-app-frontend/src/utils/studioAuth.js) prefers **`getAuthenticatedFusionBackendActor()`** (II identity) and falls back to **`getFusionBackendActor()`** (anonymous agent) so local **`bootstrapAdminIfEmpty`** still works when no one is signed in.
- **Anonymous actor** remains the default for public marketing queries (`listArtists`, early-access subscribe, etc.) via [`earlyAccessSubscribe.js`](src/fusion-app-frontend/src/utils/earlyAccessSubscribe.js).

## Internet Identity URLs

Configured in [`config.js`](src/fusion-app-frontend/src/config.js) as **`getInternetIdentityUrl()`**.

### dfx 0.30+ split (this repo)

[`dfx.json`](dfx.json) defines two canisters:

- **`internet_identity`** — backend (WASM / logic).
- **`internet_identity_frontend`** — **UI** served to the browser. **`AuthClient`’s `identityProvider` must use this canister’s id**, not the backend id.

`init_arg` on the frontend includes `fetch_root_key` for local replica use. Deploy order: backend, then frontend (see `dependencies` in `dfx.json`).

### Working local setup (verified)

- **`VITE_II_CANISTER_ID`** = **local** `internet_identity_frontend` principal from **`.dfx/local/canister_ids.json`** (same value `vite.config.js` picks from `internet_identity_frontend.local` when env is unset).
- **Default URL style:** **`subdomain`** — `http://<internet_identity_frontend-id>.localhost:4943/`  
  **Do not use Legacy `query` as the default:** `http://127.0.0.1:4943/?canisterId=…` only tags the first HTML request; Internet Identity’s UI loads chunks from `/_app/immutable/chunks/*.js` **without** `canisterId`, which the local gateway answers with **400** and breaks dynamic imports. Subdomain routing fixes that.
- Optional: **`VITE_II_LOCAL_URL_STYLE=query`** only if you accept broken chunk loads or are debugging; **`=subdomain`** to force subdomain if you ever change the default.
- **Never** use the mainnet II principal (`rdmx6-…`) as the local `identityProvider` canister id — use only ids from your replica.
- **`HttpAgent`** for Fusion canisters uses **`http://localhost:4943`** with **`await agent.fetchRootKey()`** before actor calls in local dev (`config.js`).

**Mainnet:** `https://identity.internetcomputer.org` by default (override with `VITE_INTERNET_IDENTITY_URL` or `VITE_II_MAINNET_URL` if needed).

**Resolving the local II *frontend* id for the bundle (first match wins in [`vite.config.js`](src/fusion-app-frontend/vite.config.js)):**

1. **`VITE_II_CANISTER_ID`** in repo-root `.env` / `.env.local`.
2. **`CANISTER_ID_INTERNET_IDENTITY_FRONTEND`** / **`CANISTER_ID_internet_identity_frontend`** (from `dfx` / `output_env_file`).
3. Legacy: **`CANISTER_ID_INTERNET_IDENTITY`** / **`CANISTER_ID_internet_identity`**.
4. **`.dfx/local/canister_ids.json`** — **`internet_identity_frontend.local`**, then **`internet_identity.local`** as fallback.

If **`VITE_II_CANISTER_ID`** is missing in the built bundle, local sign-in errors (no silent mainnet-id fallback).

**Replica host:** set **`VITE_IC_REPLICA_ORIGIN`** (no trailing slash) if needed; Vite’s `/api` proxy uses the same value when set.

**Full URL override:** **`VITE_INTERNET_IDENTITY_URL`** skips the above and uses that string as the identity provider.

Deploy **`internet_identity`**, **`internet_identity_frontend`**, and your app to the **same** local replica (`dfx start`).

**Vite (`:3000`) vs local asset canister (`dfx deploy`):** Env vars such as `VITE_IC_REPLICA_ORIGIN` and `VITE_II_CANISTER_ID` are fixed at **`vite build`** — set them in `.env` before building the asset canister. For II, `getLocalReplicaOrigin()` also adjusts at **runtime** when you open the app on port **4943** (`*.localhost` or `127.0.0.1`) so the gateway base matches how you loaded the site. Restart Vite after `.env` changes; redeploy the frontend after changing vars for canister tests.

## CSP / asset canister

[`src/fusion-app-frontend/public/.ic-assets.json5`](src/fusion-app-frontend/public/.ic-assets.json5) includes **`connect-src`** / **`frame-src`** entries for Internet Identity hosts and `http://127.0.0.1:*` for local replica calls. Adjust if your II URL differs.

## Header and Studio UX

- **Header:** sign-in opens a modal (`app-sign-in-modal`); post-login, `isCallerAdmin` → **Studio**; `#staff` / account **admin** role → **Studio**; members → **Profile** (artist slug when `linkedArtistId` resolves); no account → **Register** (join modal) after II login.
- **Studio:** use the same signed-in principal for admin/staff methods; if a call fails with “not authorized,” sign in with an admin principal or run **`bootstrapAdminIfEmpty`** in local dev for anonymous-only workflows.

**VetKD:** use the same agent identity for key derivation paths tied to the user’s principal (see `VETKD.md` when present).
