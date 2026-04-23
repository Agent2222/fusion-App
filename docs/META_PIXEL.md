# Meta Pixel (fusion-app-frontend)

Pixel ID **1281327974121956** is initialized in `src/fusion-app-frontend/index.html` (no inline `PageView` there; avoids double-counting with the SPA). SPA **`PageView`** events are sent from `src/fusion-app-frontend/src/main.js` on each `routeChange`. The `routeChange` listener is registered at **module** scope (not only on `DOMContentLoaded`) so the first route’s `PageView` is not missed if `handleRoute` finishes before `DOMContentLoaded`.

## Standard events (browser)

| Meta event | When |
|------------|------|
| `PageView` | Every client-side route change |
| `Lead` | Early access saved (`joinNetwork` modal + loadscreen) |
| `CompleteRegistration` | Access-code exempt path in join modal, or successful `/join-fusion` registration |
| `Purchase` | Successful Stripe membership payment in join modal (`value` / `USD` from `_paymentAmountCents`) |
| `SubmitApplication` | Successful program application submit (`content_ids`: program id) |

PostHog captures at the same points include **`ads_conversion`** matching these names, plus **`value`** / **`currency`** on `membership_payment_completed`. First-touch **UTM** and **`fbclid`** are registered via `src/fusion-app-frontend/src/utils/attribution.js` when PostHog is configured.

## Post-deploy checklist

1. **Events Manager:** Use **Test Events** (or Meta Pixel Helper) on the production domain; confirm event names and no double **PageView** on first load.
2. **Domain:** In Events Manager → pixel → **Domains**, verify the site domain (e.g. `fusionart.world`) for Aggregated Event Measurement if you need iOS/ATT reporting.
3. **Ads Manager:** Choose the campaign objective and **optimization** event (`Lead`, `Purchase`, `SubmitApplication`, or a custom conversion).
4. **Stripe:** If some cards use a full **redirect** (3DS), confirm `Purchase` and `membership_payment_completed` still fire after return; if not, add a dedicated return handler (follow-up).
5. **CSP:** `public/.ic-assets.json5` must allow Facebook script/image/connect hosts; rebuild the asset canister after changes.

Conversions API (CAPI) is optional and not implemented in this repo.
