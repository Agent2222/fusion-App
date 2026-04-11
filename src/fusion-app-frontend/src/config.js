/**
 * App configuration.
 * - devMode: set true for development (enables console logs, etc.); false for production.
 * - apiBaseUrl: base URL for API requests (e.g. '/api' or 'http://localhost:3000' in dev).
 */
export const config = {
  devMode: true,
  apiBaseUrl: '/api',
};

// ============================================
// IC / Network configuration
// ============================================
// Single switch: use `config.devMode` for both console noise and IC network.
// - devMode true  → local replica / Vite (fetch root key, same-origin or proxy)
// - devMode false → mainnet (no root key; host must match asset CSP connect-src)

export const DEV_MODE = config.devMode;

export const IC_CONFIG = {
  local: {
    // Make IC calls same-origin to satisfy CSP.
    // - Vite dev: origin is `http://127.0.0.1:3000` and Vite proxies `/api` -> `:4943`
    // - Local canister: origin is typically `http://<canisterId>.localhost:4943`
    host:
      typeof window !== 'undefined' && window.location && window.location.origin
        ? window.location.origin
        : 'http://127.0.0.1:4943',
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

// ============================================
// Anonymous IC actor helper
// ============================================

import { HttpAgent, Actor } from '@dfinity/agent';

/**
 * Create an anonymous (unauthenticated) IC actor.
 * Useful for query/update calls that don't require a signed identity.
 */
export async function createICActor(idlFactory, canisterId, options = {}) {
  const networkConfig = getNetworkConfig();

  const agent = options.agent || new HttpAgent({ host: networkConfig.host });

  if (networkConfig.fetchRootKey) {
    await agent.fetchRootKey().catch(() => {
      // Local development replica should be running; if not, we still let actor creation proceed.
    });
  }

  return Actor.createActor(idlFactory, {
    agent,
    canisterId,
    ...options.actorOptions,
  });
}
