/**
 * App configuration.
 * - devMode: set true for development (enables console logs, etc.); false for production.
 * - siteActive: when true, full site is reachable (click-to-enter); when false, loadscreen shows
 *   the coming-soon / early-access column and hides the enter CTA.
 * - apiBaseUrl: base URL for API requests (e.g. '/api' or 'http://localhost:3000' in dev).
 * - testData: when true, prefer bundled fixtures when `fusion-data-source` is unset (see database.js).
 *   When false, prefer **live mainnet** canister data for **anonymous** queries even if `devMode` is true
 *   (local asset canister / Vite still talks to `icp-api.io` for public reads). Per-build override:
 *   `VITE_USE_TEST_DATA=true` in `.env` (same precedence as database.js).
 * - **Authenticated** calls while `devMode` is true still use the **local** replica + local backend id so
 *   Internet Identity principals from the replica match the canister (see `resolveFusionBackendCanisterId`).
 * - Mainnet backend id: `MAINNET_FUSION_APP_BACKEND_CANISTER_ID` and `resolveFusionBackendCanisterId`.
 */
export const config = {
  devMode: false,
  siteActive: true,
  apiBaseUrl: '/api',
  testData: false,
  pageStatus: {
    home: {
      status: {
        public: true,
        dev: true,
      },
      message: 'Discover artists emerging through Fusion’s programs.',
      comingSoonMessage: 'Evolving',
      comingSoonCopy: 'New features and artist releases are being added.',
    },
  
    programs: {
      status: {
        public: true,
        dev: true,
      },
      message: 'Residencies, exhibitions, and collaborations across Japan.',
      comingSoonMessage: 'Expanding',
      comingSoonCopy: 'Additional programs and opportunities are currently being prepared.',
    },
  
    galleryAccess: {
      status: {
        public: false,
        dev: false,
      },
      message: 'This is not for every gallery.<br><br>It is for those willing to step outside<br>familiar systems,<br>to engage with artists,<br>context,<br>and process in new ways.',
      comingSoonMessage: 'By invitation',
      comingSoonCopy: 'Access is being developed and extended selectively.',
    },
  
    editions: {
      status: {
        public: false,
        dev: false,
      },
      message: 'Objects, prints, and works released through Fusion artists.',
      comingSoonMessage: 'Developing',
      comingSoonCopy: 'Future releases and editions are being prepared.',
    },
  
    journal: {
      status: {
        public: true,
        dev: true,
      },
      message: 'Writing, documentation, and perspectives from within the network.',
      comingSoonMessage: 'In progress',
      comingSoonCopy: 'New entries and archives are currently being compiled.',
    },
  
    community: {
      status: {
        public: true,
        dev: true,
      },
      message: 'This is not for every artist.<br><br>It is for those willing to work<br>within unfamiliar environments,<br>alongside others,<br>in close proximity to place and process.',
      comingSoonMessage: 'Forming',
      comingSoonCopy: 'The network is actively taking shape.',
    },
  
    context: {
      status: {
        public: true,
        dev: true,
      },
      message: 'Where Fusion operates, and why.',
      comingSoonMessage: 'Building context',
      comingSoonCopy: 'Additional documentation and background are being developed.',
    },
  }
};

// ============================================
// IC / Network configuration
// ============================================
// `config.devMode` controls console noise, local II URLs, fetchRootKey for **local** agents, etc.
// **Public (anonymous) backend reads** use mainnet (`icp-api.io` + mainnet canister id) whenever the
// data source preference is **live** — same rules as `getDataSource()` in database.js — so local
// deploys can render community/home against production data unless test mode is explicitly selected.

export const DEV_MODE = config.devMode;

/** Keep in sync with `database.js` (`getDataSource` / `setDataSource`). */
export const FUSION_DATA_SOURCE_STORAGE_KEY = 'fusion-data-source';

/**
 * Mirrors `database.js` default + `localStorage` override (no import to avoid cycles).
 * @returns {'test' | 'live'}
 */
export function getPublicDataSourcePreference() {
    if (typeof window !== 'undefined') {
        try {
            const v = window.localStorage.getItem(FUSION_DATA_SOURCE_STORAGE_KEY);
            if (v === 'live' || v === 'test') return v;
        } catch {
            /* ignore */
        }
    }
    try {
        if (import.meta.env && import.meta.env.VITE_USE_TEST_DATA === 'true') {
            return 'test';
        }
    } catch {
        /* ignore */
    }
    return config.testData ? 'test' : 'live';
}

/**
 * When true, anonymous `createICActor` calls should use mainnet host + mainnet fusion-app-backend id.
 * @returns {boolean}
 */
export function shouldQueryMainnetBackend() {
    return getPublicDataSourcePreference() === 'live';
}

export const IC_CONFIG = {
  local: {
    // Match SCOGE `src/config/ic-config.js`: fixed replica API host — NOT `window.location.origin`.
    // The app may load from `http://<asset-id>.localhost:4943`, but `HttpAgent` should talk to the
    // replica at `http://localhost:4943` so certificate / agent behavior matches that project.
    // (Using the asset-canister origin as host can contribute to local II / cert oddities.)
    host: 'http://localhost:4943',
    // Local replica needs root key for certificate validation.
    fetchRootKey: true,
  },
  live: {
    // NOT https://ic0.app — dfx "standard" CSP allows icp-api.io / icp0.io, not ic0.app,
    // so agents using ic0.app get blocked when devMode is false after deploy.
    host: 'https://icp-api.io',
    fetchRootKey: false,
  },
};

export function getNetworkConfig() {
  return DEV_MODE ? IC_CONFIG.local : IC_CONFIG.live;
}

export function isDevMode() {
  return DEV_MODE;
}

export function getHost() {
  return getNetworkConfig().host;
}

/**
 * Mainnet II id (reference only). For local replica use `VITE_II_CANISTER_ID` from `.dfx/local` — never this id.
 */
export const MAINNET_INTERNET_IDENTITY_CANISTER_ID = 'rdmx6-jaaaa-aaaaa-aaadq-cai';

/**
 * Mainnet `fusion-app-backend` principal — keep in sync with repo-root `canister_ids.json` (`fusion-app-backend.ic`).
 * When {@link DEV_MODE} is false, {@link resolveFusionBackendCanisterId} uses this so anonymous queries use mainnet
 * even if generated `declarations/` still contain a local id from `dfx generate` (common when running Vite on `:3000`).
 * Override with `VITE_FUSION_BACKEND_CANISTER_ID` (e.g. staging).
 */
export const MAINNET_FUSION_APP_BACKEND_CANISTER_ID = 'e7x5d-vaaaa-aaaab-af7bq-cai';

/**
 * This frontend asset canister on mainnet (see repo-root `canister_ids.json` → `fusion-app-frontend.ic`).
 * Used as Internet Identity **derivation origin** when the app is opened on a custom domain: II issues the same
 * principals as on `https://<this-id>.icp0.io` if `/.well-known/ii-alternative-origins` on this host lists the custom domain.
 * @see https://internetcomputer.org/docs/building-apps/authentication/alternative-origins
 */
export const MAINNET_FUSION_ASSET_CANISTER_DERIVATION_ORIGIN = 'https://ekqmo-uiaaa-aaaab-af7ca-cai.icp0.io';
const MAINNET_FUSION_ALTERNATIVE_ORIGINS = new Set([
    'fusionart.world',
    'www.fusionart.world',
]);

let _warnedMissingLocalIi;
let _loggedLocalInternetIdentityUrlOnce;

function trimEnv(v) {
    if (typeof v !== 'string') return '';
    const t = v.trim();
    return t || '';
}

/**
 * Local replica HTTP origin (no trailing slash) — used for `?canisterId=` Internet Identity URLs.
 *
 * - **Browser on the replica (`:4943`):** `http://localhost:4943` vs `http://127.0.0.1:4943` is chosen from
 *   `window.location` so it matches the hostname you used to open the app. Mixing `*.localhost` with `127.0.0.1`
 *   breaks IC HTTP gateway **response verification** (Internet Identity shows “Response Verification Error”).
 * - **`VITE_IC_REPLICA_ORIGIN`:** used when not on `:4943` in the browser (e.g. Vite dev on `:3000` proxying to 4943).
 * - **Fallback:** `http://127.0.0.1:4943`.
 */
export function getLocalReplicaOrigin() {
    if (typeof window !== 'undefined' && window.location && DEV_MODE) {
        const { hostname, port, protocol } = window.location;
        const p = port || (protocol === 'https:' ? '443' : '80');
        if (p === '4943' && (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1')) {
            if (hostname === '127.0.0.1') {
                return `http://127.0.0.1:${p}`;
            }
            return `http://localhost:${p}`;
        }
    }
    try {
        const v = import.meta.env && import.meta.env.VITE_IC_REPLICA_ORIGIN;
        const t = trimEnv(v);
        if (t) return t.replace(/\/$/, '');
    } catch (_) {
        /* ignore */
    }
    return 'http://127.0.0.1:4943';
}

/**
 * Port for the local replica (from `getLocalReplicaOrigin()`), default `4943`.
 * @returns {string}
 */
export function getLocalReplicaPort() {
    try {
        const u = new URL(getLocalReplicaOrigin());
        if (u.port) return u.port;
        return u.protocol === 'https:' ? '443' : '80';
    } catch (_) {
        return '4943';
    }
}

/**
 * Local Internet Identity provider URL — **subdomain** form (`http://{ii}.localhost:{port}`).
 * Some setups (e.g. SCOGE-style) use this; others need {@link getLocalInternetIdentityQueryUrl}.
 *
 * @param {string} [canisterId] — Local Internet Identity canister principal (required).
 */
export function getLocalInternetIdentityProviderUrl(canisterId) {
    const id = trimEnv(canisterId);
    if (!id) return '';
    const port = getLocalReplicaPort();
    return `http://${id}.localhost:${port}`;
}

/**
 * Local II URL — dfx **Legacy / “raw domain”** (`?canisterId=` on loopback).
 * This is what Internet Identity suggests when subdomain certification fails locally.
 * Use **127.0.0.1** (not `localhost`) so it matches the gateway cert path II verifies against.
 *
 * @param {string} [canisterId]
 */
export function getLocalInternetIdentityQueryUrl(canisterId) {
    const id = trimEnv(canisterId);
    if (!id) return '';
    const port = getLocalReplicaPort();
    return `http://127.0.0.1:${port}/?canisterId=${encodeURIComponent(id)}`;
}

/**
 * How to reach Internet Identity on the local replica.
 * - Explicit **`VITE_II_LOCAL_URL_STYLE`**: `query` | `subdomain`.
 * - **Default:** **`subdomain`** — `http://{ii-frontend-id}.localhost:{port}/`
 *
 * **Why not `query` by default:** the Legacy URL only puts `?canisterId=` on the first document.
 * Internet Identity’s UI loads extra JS from paths like `/_app/immutable/chunks/*.js`. Those requests
 * go to `http://127.0.0.1:4943/_app/...` **without** `canisterId`, so the gateway returns **400** and
 * you see `Failed to fetch dynamically imported module`. Subdomain routing sends every path to the
 * same canister. Use **`query`** only if you accept that limitation (e.g. debugging), via env.
 *
 * @returns {'query' | 'subdomain'}
 */
function getLocalInternetIdentityUrlStyle() {
    const s = trimEnv(import.meta.env && import.meta.env.VITE_II_LOCAL_URL_STYLE);
    if (s === 'subdomain' || s === 'query') {
        return s;
    }
    return 'subdomain';
}

/**
 * URL passed to AuthClient `login({ identityProvider })` / `AuthClient.create({ identityProvider })`.
 * - Mainnet: Internet Identity service (env override or default host).
 * - Local (dfx 0.30+ split): **`VITE_II_CANISTER_ID` is the `internet_identity_frontend` canister** (not the backend `internet_identity`).
 *   Merged from env / `.dfx/local` (see `vite.config.js`); **query vs subdomain** from {@link getLocalInternetIdentityUrlStyle}.
 */
export function getInternetIdentityUrl() {
    try {
        const v = import.meta.env && import.meta.env.VITE_INTERNET_IDENTITY_URL;
        if (typeof v === 'string' && v.trim()) return v.trim();
    } catch (_) {
        /* ignore */
    }
    if (!DEV_MODE) {
        try {
            const v = import.meta.env && import.meta.env.VITE_II_MAINNET_URL;
            if (typeof v === 'string' && v.trim()) return v.trim();
        } catch (_) {
            /* ignore */
        }
        return 'https://identity.ic0.app';
    }
    // Never fall back to mainnet II id (rdmx6-…) for local — that breaks verification on the replica.
    const ii = trimEnv(import.meta.env && import.meta.env.VITE_II_CANISTER_ID);
    if (DEV_MODE && !ii) {
        if (!_warnedMissingLocalIi) {
            _warnedMissingLocalIi = true;
            console.error(
                '[Fusion] Local Internet Identity: set VITE_II_CANISTER_ID to your **local `internet_identity_frontend`** id from `.dfx/local/canister_ids.json` (AuthClient talks to the frontend canister; not the backend `internet_identity` id), then rebuild the frontend.'
            );
        }
        return '';
    }
    const built =
        getLocalInternetIdentityUrlStyle() === 'subdomain'
            ? getLocalInternetIdentityProviderUrl(ii)
            : getLocalInternetIdentityQueryUrl(ii);
    if (DEV_MODE && built && !_loggedLocalInternetIdentityUrlOnce && typeof console !== 'undefined' && console.info) {
        _loggedLocalInternetIdentityUrlOnce = true;
        console.info(
            '[Fusion IC] Local Internet Identity URL (`internet_identity_frontend`; AuthClient adds #authorize):',
            built
        );
    }
    return built;
}

/**
 * When the app runs on a **custom domain** (e.g. `https://fusionart.world`), `AuthClient.login` must set
 * `derivationOrigin` to the canister’s default `https://…icp0.io` origin, and that origin must host
 * `/.well-known/ii-alternative-origins` listing the custom host(s). Omit when already on the `.icp0.io` URL
 * or in local dev.
 * Override with `VITE_INTERNET_IDENTITY_DERIVATION_ORIGIN` if the asset canister id changes.
 * @returns {string | undefined}
 */
export function getInternetIdentityDerivationOrigin() {
    if (DEV_MODE) return undefined;
    try {
        const v = import.meta.env && import.meta.env.VITE_INTERNET_IDENTITY_DERIVATION_ORIGIN;
        if (typeof v === 'string' && v.trim()) return v.trim().replace(/\/$/, '');
    } catch (_) {
        /* ignore */
    }
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
        const h = String(window.location.hostname).toLowerCase();
        try {
            const canonical = new URL(MAINNET_FUSION_ASSET_CANISTER_DERIVATION_ORIGIN);
            if (h === canonical.hostname.toLowerCase()) return undefined;
        } catch (_) {
            /* ignore */
        }
        if (
            h.endsWith('.icp0.io') ||
            h.endsWith('.raw.icp0.io') ||
            h.endsWith('.ic0.app') ||
            h.endsWith('.raw.ic0.app')
        ) {
            return undefined;
        }
        return MAINNET_FUSION_ALTERNATIVE_ORIGINS.has(h)
            ? MAINNET_FUSION_ASSET_CANISTER_DERIVATION_ORIGIN
            : undefined;
    }
    return undefined;
}

/**
 * When `true`, log canister errors from `isCallerAdmin` / `getAccountForCaller` in the header and
 * post-login pipeline so a **failed IC call** is distinguishable from “wrong / unknown principal.”
 * - Local dev: always on (`DEV_MODE`).
 * - Production: set **`VITE_FUSION_LOG_IC_AUTH=true`** at build time, or add **`?fusionLogIc=1`** to the page URL.
 * @returns {boolean}
 */
export function shouldLogFusionIcAuthErrors() {
    if (DEV_MODE) return true;
    try {
        if (import.meta.env && import.meta.env.VITE_FUSION_LOG_IC_AUTH === 'true') return true;
    } catch (_) {
        /* ignore */
    }
    if (typeof window === 'undefined' || !window.location) return false;
    try {
        return new URLSearchParams(window.location.search).get('fusionLogIc') === '1';
    } catch (_) {
        return false;
    }
}

// ============================================
// Anonymous IC actor helper
// ============================================

import { HttpAgent, Actor } from '@dfinity/agent';

/**
 * Backend canister id for {@link createICActor} / {@link createAuthenticatedICActor}.
 * - Optional **`VITE_FUSION_BACKEND_CANISTER_ID`** wins (staging / custom mainnet).
 * - **Anonymous + live data preference:** {@link MAINNET_FUSION_APP_BACKEND_CANISTER_ID} even when `DEV_MODE` is true.
 * - **Authenticated + `DEV_MODE`:** local declarations id (replica II principals match local canister).
 * - **Test data preference** (`testData` / `VITE_USE_TEST_DATA` / `localStorage` test): local id when `DEV_MODE`.
 * - **`DEV_MODE` false:** mainnet id.
 *
 * @param {string} [declaredCanisterId] — from `declarations/fusion-app-backend`
 * @param {{ authenticated?: boolean }} [options]
 * @returns {string}
 */
export function resolveFusionBackendCanisterId(declaredCanisterId, options = {}) {
    try {
        const v = trimEnv(import.meta.env?.VITE_FUSION_BACKEND_CANISTER_ID);
        if (v) return v;
    } catch {
        /* ignore */
    }
    const declared = typeof declaredCanisterId === 'string' ? declaredCanisterId.trim() : '';
    const authenticated = options.authenticated === true;

    if (authenticated && DEV_MODE) {
        return declared;
    }

    if (shouldQueryMainnetBackend()) {
        return MAINNET_FUSION_APP_BACKEND_CANISTER_ID || declared;
    }

    if (DEV_MODE) {
        return declared;
    }

    return MAINNET_FUSION_APP_BACKEND_CANISTER_ID || declared;
}

/**
 * Create an anonymous (unauthenticated) IC actor.
 * Uses **mainnet** (`icp-api.io`) when the data source preference is **live** so local / Vite builds
 * still read production canister data; uses the **local** replica only in explicit **test** data mode.
 */
export async function createICActor(idlFactory, canisterId, options = {}) {
  const resolvedCanisterId = resolveFusionBackendCanisterId(canisterId, {
    authenticated: false,
  });
  const networkConfig = shouldQueryMainnetBackend()
    ? IC_CONFIG.live
    : getNetworkConfig();

  const agent =
    options.agent ||
    new HttpAgent({
      host: networkConfig.host,
    });

  if (networkConfig.fetchRootKey) {
    await agent.fetchRootKey().catch(() => {
      /* local replica */
    });
  }

  return Actor.createActor(idlFactory, {
    agent,
    canisterId: resolvedCanisterId,
    ...options.actorOptions,
  });
}

/**
 * Actor that sends the Internet Identity–derived caller principal (queries/updates).
 * Always uses {@link getNetworkConfig} (replica when `DEV_MODE`) so local II sessions match the target replica.
 * @param {import('@dfinity/agent').Identity} identity
 */
export async function createAuthenticatedICActor(idlFactory, canisterId, identity, options = {}) {
  const networkConfig = getNetworkConfig();
  const resolvedCanisterId = resolveFusionBackendCanisterId(canisterId, {
    authenticated: true,
  });

  const agent =
    options.agent ||
    new HttpAgent({
      host: networkConfig.host,
      identity,
    });

  if (networkConfig.fetchRootKey) {
    await agent.fetchRootKey().catch(() => {});
  }

  return Actor.createActor(idlFactory, {
    agent,
    canisterId: resolvedCanisterId,
    ...options.actorOptions,
  });
}

/**
 * Canonical origin for OG URLs and `link[rel=canonical]` (no trailing slash).
 * Public pages should canonicalize to the apex domain even when reached via www,
 * canister URLs, or preview hosts. Local replica/dev hosts keep their own origin.
 * Override with `VITE_PUBLIC_SITE_ORIGIN` when deploying a separate staging domain.
 * Production custom domain: https://fusionart.world
 */
export function getPublicSiteOrigin() {
  try {
    const v = import.meta.env && import.meta.env.VITE_PUBLIC_SITE_ORIGIN;
    if (typeof v === "string" && v.trim()) {
      return v.trim().replace(/\/$/, "");
    }
  } catch (_) {
    /* ignore */
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    const { hostname, origin } = window.location;
    const h = String(hostname || "").toLowerCase();
    if (
      h === "localhost" ||
      h === "127.0.0.1" ||
      h.endsWith(".localhost") ||
      h.endsWith(".local")
    ) {
      return String(origin).replace(/\/$/, "");
    }
  }
  return "https://fusionart.world";
}

