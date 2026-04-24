# Meta Pixel (fusion-app-frontend)

Pixel ID **1281327974121956** is bootstrapped in **`src/fusion-app-frontend/src/utils/metaPixelBootstrap.js`**, imported as the **first** import in `main.js` so it is included in the main Vite bundle. That avoids: (1) **inline** scripts, which **CSP** in `public/.ic-assets.json5` disallows without `'unsafe-inline'`, and (2) a separate `/meta-pixel.js` asset, which can **404** on deploy if `dist` is out of date. The bootstrap uses **`window.fbq`** for `init` (a bare `fbq()` call is invalid in ES modules and can silently fail at runtime). There is no extra `PageView` in the bootstrap; SPA **`PageView`** is sent from `main.js` on each `routeChange` (listener at module scope so the first route is not missed).

## Standard events (browser)

| Meta event | When |
|------------|------|
| `PageView` | Every client-side route change |
| `Lead` | Early access saved (`joinNetwork` modal + loadscreen) |
| `CompleteRegistration` | Access-code exempt path in join modal, or successful `/join-fusion` registration |
| `AddPaymentInfo` | Sign-up modal: Stripe Payment Element **ready** (`membership_payment_elements_ready` in PostHog). Program application: card form **ready** (`program_application_payment_elements_ready`). |
| `InitiateCheckout` | Program application: user selects a **fee payment plan** (with `program_application_payment_plan_selected` in PostHog). |
| `Purchase` | Membership: Stripe confirm in join modal (`content_name: membership_signup`). Program application: Stripe confirm for fee (`content_name: program_application_fee`; `value` when one-time fee cents known). |
| `SubmitApplication` | Application saved to canister after successful flow (`content_ids`: program id) |

PostHog captures at the same points include **`ads_conversion`** matching these names, plus **`value`** / **`currency`** on `membership_payment_completed`. First-touch **UTM** and **`fbclid`** are registered via `src/fusion-app-frontend/src/utils/attribution.js` when PostHog is configured.

## Post-deploy checklist

1. **Events Manager:** Use **Test Events** (or Meta Pixel Helper) on the production domain; confirm event names and no double **PageView** on first load.
2. **Domain:** In Events Manager → pixel → **Domains**, verify the site domain (e.g. `fusionart.world`) for Aggregated Event Measurement if you need iOS/ATT reporting.
3. **Ads Manager:** Choose the campaign objective and **optimization** event (`Lead`, `Purchase`, `SubmitApplication`, or a custom conversion).
4. **Stripe:** If some cards use a full **redirect** (3DS), confirm `Purchase` and `membership_payment_completed` still fire after return; if not, add a dedicated return handler (follow-up).
5. **CSP:** `public/.ic-assets.json5` must allow Facebook **script** (`connect.facebook.net` + same-origin `meta-pixel.js`), **img**, **connect**, and **frame** (`www.facebook.com` / `*.facebook.com`) for the pixel; rebuild the asset canister after changes.

Conversions API (CAPI) is optional and not implemented in this repo.
