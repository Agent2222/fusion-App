# Page access control — roadmap

## Current implementation (hardcoded gate)

- **Source of truth**: [`config.pageStatus`](../src/fusion-app-frontend/src/config.js) per logical page (`home`, `programs`, `galleryAccess`, `editions`, `journal`, `community`, `context`).
- **Rule**: In production builds (`devMode` / `DEV_MODE` false), `status.public` must be `true` for the page to render its normal module. In dev, `status.dev` is used instead.
- **Behavior when gated**: The router skips loading the real route module and renders a `shoutHeadline` plus [`app-join-network`](../src/fusion-app-frontend/src/components/subComponents/joinNetwork.js) with band copy from config. The band **Open** control is hidden when the user has an Internet Identity session (`data-hide-band-open-when-authenticated`).
- **Limitations**: This is **client-side only** — it hides UI and avoids running page `init` logic. It does not replace authorization for APIs, canister calls, or sensitive data. Any protected resource must still be enforced on the backend.

## Future: fine-grained access control

### 1. Persisted flags (canister or CMS)

- Store per-route (or per-feature) flags in the **Fusion backend** or **Studio-managed content**, with:
  - Effective date / version
  - Optional environment dimension (local / staging / mainnet)
- Frontend reads flags at startup or on navigation and merges with the static `pageStatus` defaults (defaults as fallback when offline).

### 2. Identity and roles

- Map **Internet Identity** principals to roles: anonymous, signed-in, subscriber, artist, admin.
- Gate rules become: `allow: { anonymous: false, authenticated: true, subscriber: true, … }` per route or component.
- Reuse patterns from existing **early access** / **subscriber** flows where appropriate.

### 3. Admin UI (Studio)

- Surface route visibility and role rules in **Studio** so non-developers can change access without redeploying the asset canister.
- Require authentication for Studio already; add audit fields (who changed what, when).

### 4. Feature flags and rollout

- Support percentage rollout or cohorts (e.g. beta testers) using the same flag system.
- Log exposure events sparingly for debugging (privacy-conscious).

### 5. Maintenance and incident modes

- Global “maintenance” or “read-only” switches that override per-route rules.
- Clear messaging via the same gated shell (shout + join band or a dedicated component).

### 6. Security and compliance

- Treat all **client-side** checks as UX; **authorize** mutations and private data in **Motoko** (or off-chain services) using caller identity.
- Document which endpoints are public vs authenticated for audits.

### Suggested migration path

1. Keep `config.pageStatus` as **defaults** and **offline** behavior.
2. Add a small **query** (e.g. `getPublicSiteFlags`) returning overrides; merge in [`getGateStateForPath`](../src/fusion-app-frontend/src/utils/pageGate.js) or a thin wrapper.
3. Add Studio editors for the same payload.
4. Extend rules from boolean “page on/off” to **role matrices** when product requirements solidify.
