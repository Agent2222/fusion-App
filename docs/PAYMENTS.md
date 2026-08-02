# Payments — PayPal primary, Stripe legacy

## Overview

- **New checkouts** (membership, application fee, program deposit/full/manual) use **PayPal** via `POST /payments/*` when PayPal is the active provider in Studio.
- **One-time PayPal checkouts** use **embedded Card Fields** (no popup for card entry) plus a **Pay with PayPal** wallet button fallback. Implemented in `mountPayPalAdvancedOneTimeCheckout()` (`paymentCheckout.js`).
- **Subscription checkouts** (membership monthly / quarterly / annual, program application subscription plans) use **PayPal Buttons** with popup approval — Card Fields do not support `createSubscription`. Legacy bi-monthly subscribers remain supported for detection and Settings plan changes.
- **Program installment plans** are **disabled** for PayPal until variable-cycle plan creation ships. Members can use manual payments; legacy Stripe plans can still be cancelled.
- **Stripe** remains available as an **alternative provider** for new checkouts when selected in Studio (embedded Elements). Legacy Stripe subscriptions still use webhooks, sync, status-by-email, cancel-at-period-end, receipts, and Finance MRR.

**Studio → Services → Payments:** site-wide **Provider** toggle (PayPal / Stripe) plus **Environment** (Test / Live).

## PayPal Card Fields (ACDC)

Embedded card checkout requires **Advanced Card Processing (ACDC)** enabled on the PayPal business account. If `CardFields.isEligible()` returns false, the UI falls back to the PayPal wallet button only (popup).

| Flow | UI |
|------|-----|
| Program application one-time fee | Card Fields + Pay & submit (card) or PayPal button |
| Member dashboard deposit / full / manual | Card Fields + Pay now or PayPal button |
| Membership / application subscriptions | PayPal subscription buttons (popup) |

No backend changes are required for Card Fields — same `POST /payments/one-time` + `/confirm` Orders v2 flow.

## Integration API env (`services/fusion-integration-api/.env`)

| Variable | Purpose |
|----------|---------|
| `PAYPAL_CLIENT_ID` | REST + JS SDK |
| `PAYPAL_CLIENT_SECRET` | Server OAuth |
| `PAYPAL_MODE` | `sandbox` or `live` |
| `PAYPAL_WEBHOOK_ID` | Webhook signature verification (when implemented) |
| `PAYPAL_SUBSCRIPTION_MONTHLY_ID` | Membership monthly plan ($30) — new checkouts |
| `PAYPAL_SUBSCRIPTION_QUARTERLY_ID` | Membership quarterly plan ($75) — new checkouts |
| `PAYPAL_SUBSCRIPTION_ANNUAL_ID` | Membership annual plan ($260) — new checkouts |
| `PAYPAL_PLAN_ANNUAL_ID` | Fallback annual plan id if `PAYPAL_SUBSCRIPTION_ANNUAL_ID` unset |
| `PAYPAL_PLAN_BIMONTHLY_ID` | Legacy bi-monthly plan id (detection / Settings only — not offered for new checkout) |
| `PAYPAL_PLAN_INSTALLMENT_ID` | Program installment template plan |
| `STRIPE_SECRET_KEY` | Legacy Stripe (keep until last legacy sub ends) |
| `STRIPE_WEBHOOK_SECRET` | Legacy Stripe webhooks |

## Frontend env / Studio

| Key | Purpose |
|-----|---------|
| `VITE_PAYPAL_CLIENT_ID` | PayPal JS SDK (fallback) |
| Studio → Services → PayPal client ID (test/live) | localStorage override; built-in live default when unset |
| Studio → Services → Provider | `paypal` (default) or `stripe` |
| Studio → Services → Environment | `test` or `live` (defaults to live) |
| `VITE_INTEGRATION_API_URL` | Integration API base |

## Bootstrap billing plans (sandbox)

Use PayPal Developer Dashboard or the `user-paypal` MCP in Cursor:

1. `create_product` — e.g. "Fusion Platform Membership"
2. `create_subscription_plan` — monthly (`MONTH` ×1, $30), quarterly (`MONTH` ×3, $75), annual (`YEAR` ×1, $260)
3. Record `plan_id` values as `PAYPAL_SUBSCRIPTION_MONTHLY_ID`, `PAYPAL_SUBSCRIPTION_QUARTERLY_ID`, `PAYPAL_SUBSCRIPTION_ANNUAL_ID`
4. Keep `PAYPAL_PLAN_BIMONTHLY_ID` if legacy subscribers still exist (labeling / plan-change detection)

## Routes

| Route | Provider |
|-------|----------|
| `GET /payments/config` | PayPal |
| `POST /payments/one-time` | PayPal |
| `POST /payments/one-time/confirm` | PayPal |
| `POST /payments/subscription` | PayPal |
| `POST /payments/subscription/link` | PayPal |
| `POST /payments/subscription/sync` | PayPal |
| `POST /payments/subscription/cancel` | PayPal |
| `POST /payments/subscription/revise` | PayPal (plan change; buyer re-consent via approve URL; new rate at next cycle) |
| `POST /payments/member-billing-summary` | PayPal (tier / planLabel / planPriceLine for Settings) |
| `POST /payments/plan` | PayPal (disabled — returns 503) |
| `POST /payments/plan/cancel` | PayPal (legacy / existing plans) |
| `POST /payments/receipts` | PayPal |
| `POST /webhooks/paypal` | PayPal |
| `POST /webhooks/stripe` | Stripe legacy |
| `POST /stripe/sync-subscription*` | Stripe legacy |
| `POST /stripe/subscription-status-by-email` | Stripe legacy |
| `POST /stripe/cancel-subscription-at-period-end` | Stripe legacy |
| `POST /stripe/membership-revenue-summary` | Stripe legacy MRR |

Deprecated for **new** sessions: `POST /stripe/create-subscription`, `POST /stripe/create-payment-intent`, `POST /stripe/program-payment-intent`, `POST /stripe/program-payment-plan`.

## Canister

After Motoko changes, run `dfx generate` and redeploy `fusion-app-backend`. New fields:

- `MembershipFields`: `paypalSubscriptionId`, `paypalSubscriptionStatus`, `paymentProvider`
- `ProgramPaymentLedgerRow`: `paymentProvider`, `externalPaymentId`, `externalChargeId`, `externalReceiptUrl`
- `ProgramPaymentPlan`: `paymentProvider`, `paypalSubscriptionId`
- `integrationRecordPayPalSubscription` — integration service only
- `membershipTierByPrincipal` + quarterly application credit maps; `applicationFeeDueForCaller`; `integrationSetMembershipTier`

**Application fees:** guest one-time **$50**; active monthly / legacy bi-monthly **$35** per application; quarterly uses stackable application credits (+1 per calendar quarter while active); annual applications included while membership is active.

## Deploy checklist

1. Provision PayPal sandbox/live products and plans; set env vars.
2. Enable **Advanced Card Processing** on the live PayPal business account for embedded card fields.
3. Deploy integration API with PayPal + Stripe credentials.
4. Register `POST /webhooks/paypal` in PayPal Developer Dashboard.
5. `dfx deploy fusion-app-backend` (types + `integrationRecordPayPalSubscription`).
6. `npm run build` + deploy frontend (CSP already allows PayPal script/frame/connect domains).
7. Test: application one-time fee (card + wallet), MPD deposit/manual, join subscription (popup), legacy Stripe member still has access.
