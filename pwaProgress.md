# PWA Progress Checklist

Tracks what is already implemented for PWA support and what to improve next.

## Current Status

- Date: 2026-04-28
- Scope: Vite + manifest + service worker installability baseline
- Owner: Studio/frontend

## Completed

- [x] Added `vite-plugin-pwa` to frontend workspace.
- [x] Registered `VitePWA` in `src/fusion-app-frontend/vite.config.js`.
- [x] Configured `generateSW` strategy with auto-update registration.
- [x] Added manifest metadata (`name`, `short_name`, `id`, `start_url`, `scope`, `display`, colors).
- [x] Added PWA icons in `src/fusion-app-frontend/public/`:
  - [x] `pwa-192.png`
  - [x] `pwa-512.png`
  - [x] `pwa-512-maskable.png`
  - [x] `apple-touch-icon.png`
- [x] Added Apple touch icon link in `src/fusion-app-frontend/index.html`.
- [x] Verified build output includes:
  - [x] `manifest.webmanifest`
  - [x] `registerSW.js`
  - [x] `sw.js`
  - [x] `workbox-*.js`
- [x] Confirmed existing CSP in `public/.ic-assets.json5` does not require changes for same-origin SW.
- [x] Added README documentation for build/preview/deploy checks.

## Validation Notes

- [x] `vite build` with `--outDir dist_check` succeeds and generates PWA artifacts.
- [ ] Root workspace `npm run build` validation (blocked by existing environment/build setup nuances).
- [ ] Local Lighthouse PWA score captured (headless run not available in current environment).
- [ ] Production/staging DevTools verification (Manifest + Service Worker active).

## Improvement Backlog

### Build and config hardening

- [ ] Make Workbox mode environment-driven (production in CI/deploy, local fallback only where needed).
- [ ] Add CI check that fails if manifest/SW files are missing from build output.
- [ ] Verify deploy pipeline always publishes the exact frontend output directory referenced by `dfx.json`.

### UX improvements

- [ ] Add offline fallback UI/state for failed network-dependent routes.
- [ ] Add “new version available” prompt flow (`workbox-window` + refresh CTA).
- [ ] Add route-aware caching strategy for read-heavy pages (carefully, no stale auth-sensitive data).

### Quality and observability

- [ ] Capture Lighthouse baseline (preview + staging) and store reports in `docs/`.
- [ ] Add release checklist step: confirm SW update behavior after deploy (old shell -> new shell refresh flow).
- [ ] Add a short troubleshooting doc for cache reset/service worker unregister steps.

## Quick Commands

```bash
# Build frontend with PWA assets
cd src/fusion-app-frontend
npx vite build --outDir dist_check

# Preview locally
npx vite preview --outDir dist_check --port 4173
```

## Notes

- Initial scope is installability and shell precache only.
- Full offline IC-backed behavior, push notifications, and background sync are follow-up phases.
