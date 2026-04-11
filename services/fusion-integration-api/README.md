# fusion-integration-api

Small Express server for Stripe Payment Intents, Resend email, and S3 presigned PUT uploads. Used by the Fusion frontend / Studio; secrets never ship to the browser.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | no | Default `8787` |
| `CORS_ORIGINS` | no | Comma-separated **extra** origins (empty = allow all origins). If set, the server also always allows `https://fusionart.world`, `https://www.fusionart.world`, and `http://localhost:3000` / `127.0.0.1:3000` plus your list here (e.g. `https://….icp0.io`). |
| `INTEGRATION_API_KEY` | no | If set, require `Authorization: Bearer <token>` on POST routes |
| `STRIPE_SECRET_KEY` | for Stripe | `sk_test_…` or `sk_live_…` |
| `RESEND_API_KEY` | for email | Resend API key |
| `RESEND_FROM` | for email | Verified sender, e.g. `Fusion <onboarding@resend.dev>` |
| `AWS_REGION` or `S3_REGION` | for S3 | Region |
| `S3_BUCKET` | for S3 | Bucket name |
| `S3_PUBLIC_BASE_URL` | no | Public base for object URLs (default: virtual-hosted–style S3 URL) |
| `S3_KEY_PREFIX` | no | Prefix for keys (default `studio/`) |

## Scripts

- `npm run dev` — run with `--watch`
- `npm start` — production

## Routes

- `GET /health` — status flags (no secrets)
- `POST /stripe/create-payment-intent` — body `{ amount, currency?, metadata? }`
- `POST /email/send` — body `{ to, subject, html | text, replyTo?, from? }` — optional `from` overrides `RESEND_FROM` when set (must be a verified sender in Resend)
- `POST /storage/presign` — body `{ key, contentType }`
