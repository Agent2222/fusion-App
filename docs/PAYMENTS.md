# Payments — PayPal primary, Stripe legacy

## Overview

- **New checkouts** (membership, application fee, program deposit/full/manual) use **PayPal** via `POST /payments/*`.
- **Program installment plans** are **disabled** for PayPal until variable-cycle plan creation ships. Members can use manual payments; legacy Stripe plans can still be cancelled.
- **Stripe** remains for **legacy** subscriptions only: webhooks, sync, status-by-email, cancel-at-period-end, receipts, and Finance MRR for pre-existing Stripe subscribers.

There is **no global provider toggle**. The SPA always mounts PayPal checkout for new money movement.

## Integration API env (`services/fusion-integration-api/.env`)

| Variable | Purpose |
|----------|---------|
| `PAYPAL_CLIENT_ID` | REST + JS SDK |
| `PAYPAL_CLIENT_SECRET` | Server OAuth |
| `PAYPAL_MODE` | `sandbox` or `live` |
| `PAYPAL_WEBHOOK_ID` | Webhook signature verification (when implemented) |
| `PAYPAL_PLAN_BIMONTHLY_ID` | Membership bimonthly billing plan |
| `PAYPAL_PLAN_ANNUAL_ID` | Membership annual billing plan |
| `PAYPAL_PLAN_INSTALLMENT_ID` | Program installment template plan |
| `STRIPE_SECRET_KEY` | Legacy Stripe (keep until last legacy sub ends) |
| `STRIPE_WEBHOOK_SECRET` | Legacy Stripe webhooks |

## Frontend env / Studio

| Key | Purpose |
|-----|---------|
| `VITE_PAYPAL_CLIENT_ID` | PayPal JS SDK (fallback) |
| Studio → Services → PayPal client ID (test/live) | localStorage override |
| `VITE_INTEGRATION_API_URL` | Integration API base |

## Bootstrap billing plans (sandbox)

Use PayPal Developer Dashboard or the `user-paypal` MCP in Cursor:

1. `create_product` — e.g. "Fusion Platform Membership"
2. `create_subscription_plan` — bimonthly (`interval_unit=MONTH`, `interval_count=2`) and annual (`interval_unit=YEAR`)
3. Record `plan_id` values in env as `PAYPAL_PLAN_*_ID`

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

## Deploy checklist

1. Provision PayPal sandbox/live products and plans; set env vars.
2. Deploy integration API with PayPal + Stripe credentials.
3. Register `POST /webhooks/paypal` in PayPal Developer Dashboard.
4. `dfx deploy fusion-app-backend` (types + `integrationRecordPayPalSubscription`).
5. `npm run build` + deploy frontend with `VITE_PAYPAL_CLIENT_ID` or Studio client ID.
6. Test: join (PayPal), application fee (PayPal), legacy Stripe member still has access.
