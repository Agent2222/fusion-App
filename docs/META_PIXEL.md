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

PostHog captures at the same points include **`ads_conversion`** matching these names, plus **`value`** / **`currency`** on `membership_payment_completed`. The same event also includes (when available) **`amount_cents`**, **`amount`**, **`payment_plan`** (from CMS `joinNetworkFlow.*.payment.planKey`, e.g. `bi_monthly`), optional **`payment_plan_label`**, **`page_context`** (from `app-join-network` `context`), **`join_role`**, and optional **`stripe_subscription_id`**.

## PostHog → Meta Conversions API (CAPI)

Server-side conversions are forwarded by the **PostHog Meta Ads destination** (not a direct CAPI integration in this repo). Meta requires **matchable customer parameters** on each forwarded event. If only `fbc` is mapped and it is empty (organic traffic), Meta returns error `2804050` (“insufficient customer information”).

### Person properties the app sets (for destination mapping)

| PostHog person property | Source | Meta CAPI field |
|-------------------------|--------|-----------------|
| `email` | `syncPosthogConversionPerson()` before Lead / Purchase events | `em` (hashed by PostHog) |
| `first_name` | Join modal step 1, application form | `fn` |
| `last_name` | Join modal step 1, application form | `ln` |
| `fbp` | `_fbp` cookie via `registerFusionMetaCookies()` | `fbp` |
| `fbc` | `_fbc` cookie or built from `fbclid` on first landing | `fbc` (only when non-empty) |
| `fbclid` / `$initial_fbclid` | URL query on first touch | Used to build `fbc` if cookie missing |
| `distinct_id` | PostHog (principal after II login) | `external_id` |

**Code modules:**

- [`src/fusion-app-frontend/src/utils/attribution.js`](../src/fusion-app-frontend/src/utils/attribution.js) — UTM, `fbclid`, `$initial_fbclid`, `fbc`, `fbp`; runs after `posthog.init` and on each route change.
- [`src/fusion-app-frontend/src/utils/posthogConversionIdentity.js`](../src/fusion-app-frontend/src/utils/posthogConversionIdentity.js) — `syncPosthogConversionPerson()` (email/name on person **before** conversion captures); `identifyPosthogAfterInternetIdentityLogin()` (alias email distinct id → II principal).

PII is stored on the **person profile** only, not in `posthog.capture()` event properties.

### Pay-first membership identify sequence

1. User completes join **step 1** (email + name) → `syncPosthogConversionPerson({ email, firstName, lastName })` identifies by normalized email.
2. Stripe payment succeeds → sync again, then `membership_payment_completed` (person already has `email` for Meta).
3. User signs in with Internet Identity → `identifyPosthogAfterInternetIdentityLogin(principal, …)` aliases prior email distinct id to principal and enriches person properties.

Returning II sessions: `initIcAuth()` calls `identifyPosthogOnSessionRestore(principal)` and merges billing email from `localStorage` when available.

### PostHog destination configuration (dashboard)

In PostHog → **Data pipelines** → **Meta Ads**, map conversion events (e.g. `membership_payment_completed`, `early_access_submitted`, `program_application_payment_completed`) with at least:

| Meta field | PostHog expression / property |
|------------|-------------------------------|
| `em` | `person.properties.email` |
| `fn` | `person.properties.first_name` |
| `ln` | `person.properties.last_name` |
| `external_id` | `distinct_id` |
| `fbp` | `person.properties.fbp` |
| `fbc` | **Conditional** — `person.properties.fbc` only when truthy (do not send empty string) |

Do **not** rely on `fbc` alone. Organic users without `fbclid` must still match via `em` (+ optional `fn`/`ln`/`fbp`).

**Verify:** open a `membership_payment_completed` person in PostHog and confirm `email` is set **before** the event timestamp.

## Post-deploy checklist

1. **Events Manager:** Use **Test Events** (or Meta Pixel Helper) on the production domain; confirm event names and no double **PageView** on first load.
2. **Domain:** In Events Manager → pixel → **Domains**, verify the site domain (e.g. `fusionart.world`) for Aggregated Event Measurement if you need iOS/ATT reporting.
3. **Ads Manager:** Choose the campaign objective and **optimization** event (`Lead`, `Purchase`, `SubmitApplication`, or a custom conversion).
4. **PostHog → Meta:** Confirm forwarded `Purchase` / custom conversions include `em` and no `2804050` errors in the destination logs.
5. **Stripe:** If some cards use a full **redirect** (3DS), confirm `Purchase` and `membership_payment_completed` still fire after return; if not, add a dedicated return handler (follow-up).
6. **CSP:** `public/.ic-assets.json5` must allow Facebook **script** (`connect.facebook.net` + same-origin `meta-pixel.js`), **img**, **connect**, and **frame** (`www.facebook.com` / `*.facebook.com`) for the pixel; rebuild the asset canister after changes.
