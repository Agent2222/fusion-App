<div align="center">

# FUSION

**A curated art network for artists, galleries, curators, and collectors — built end to end on the Internet Computer.**

Discovery · Residency programs · Member profiles · Staff operations · On-chain AI

</div>

---

> **Source availability — please read first.**
> Fusion is **proprietary software**. This repository is published for hackathon review and
> technical demonstration only. It is **not** open source, and no licence is granted to use,
> copy, modify, redistribute, or train models on any part of it.
> See [Licence & source availability](#licence--source-availability).

## What Fusion is

Fusion connects **artists, galleries, curators, and collectors** through residency programs rooted
in Japan — Kaga, Ishikawa, Tokyo, and beyond. The platform covers the whole arc of that
relationship, in one codebase:

- **Discovery** — a public editorial site: artists, programs, editions, journal, community, gallery access.
- **Applying** — multi-step program applications with fees, deposits, instalments, and an impartial
  draw when a program is oversubscribed.
- **Belonging** — a paid membership that unlocks an artist dashboard where the public profile is
  written, translated, and published.
- **Operating** — *Fusion Studio*, the staff back office that runs applicants, schedules, travel,
  finance, comms, moderation, and content.

Almost none of that lives in a conventional database. Identities, records, permissions, and even the
language-model calls are on-chain: the browser talks directly to Motoko actors, and a small
off-chain service exists only for the things a canister cannot do (card payments, email delivery,
object storage).

## The product in six surfaces

### 1. Public platform

A fast, indexable, bilingual (EN / 日本語) site rather than an app behind a login.

| Route family | What it is |
|---|---|
| `/` | Landing experience with a deliberate "click to enter" loadscreen, curated artist feed, program highlights |
| `/artists`, `/profile/:slug` | Artist directory with cohort/year filters, and full public profiles (hero image, intro gallery, story, audio, links, related programs) |
| `/programs`, `/program/:slug` | Residency programs with dates, offerings, schedule, alumni, fees, and application entry points |
| `/editions`, `/editions/:slug` | Prints and objects released by Fusion artists and partners |
| `/journal`, `/journal/entry/:slug` | Editorial writing and field notes with a Studio-managed layout and home carousel |
| `/community`, `/videos`, `/event/:slug` | Community sessions, network cards, featured videos, member-only full-length video, and event pages |
| `/gallery-access` | Access track for galleries and collectors — studio visits, previews, and introductions |
| `/join-network`, `/join-fusion` | Multi-step join flow for the public network, and an invite-code onboarding path for staff and collaborators |
| `/links` | Shareable link-in-bio surface |

Artists can toggle their feed card between **artwork** and **profile** imagery, and every page ships
route-level SEO metadata, internal linking, Open Graph images, and noindex rules for gated surfaces.

### 2. Programs, applications, and the draw

Programs are first-class records, not static pages:

- **Application pipeline** — long-form applications with eligibility rules, alumni and tier logic,
  application fees, and per-program submission windows.
- **Money** — deposit, full-fee, and instalment plans; receipts; waivers; manual payment handling.
- **Draw** — when a program is oversubscribed, applicants are selected by a transparent draw with a
  public progress feed, notify / paid / recipient states, and public award announcements.
- **Logistics** — per-program travel preparation (documentation, images, prep checklists) and a
  shared schedule of events and locations used by staff and members.

### 3. Artist members area — `/settings/profile`

A Studio-grade dashboard, not a form. Members manage their public presence across a sidebar of
panels: identity, work & projects, programs, journal, media library, preview, account settings, and a
dev/JSON inspector.

- **Two-column Story & World editor.** "Your words" beside an **AI version**, per section. Either
  column is editable; one click per section chooses which column the public profile reads, so a
  profile can be a mix of hand-written and generated copy (`locales.worldSourceByField`).
- **On-demand AI, never silent.** A ✦ button asks the platform's own LLM for that one section — using
  the member's saved profile *and* their unsaved edits as source material — then drops the result into
  the AI column for the member to accept, edit, or ignore. Nothing is generated behind their back on
  save.
- **Bilingual by design.** English and Japanese copy are stored separately per record, with
  translation available for AI output, so one language never overwrites the other.
- **Presence controls** — hero image and intro gallery (with approval), audio collections and
  highlights, links, location, availability status, SEO preview, and a publish-readiness score that
  explains what is still missing.
- **Media** — uploads go straight to object storage via presigned URLs, with review states for
  profile images and audio.

### 4. Membership, payments, and access

Membership is the gate between the public site and the members area, and it is enforced on-chain.

- **Plans** — monthly, quarterly, and annual membership, plus a monthly plan bundled with program
  application add-ons, and instalment plans for program fees.
- **Providers** — **PayPal is the primary checkout** (embedded card fields for one-time payments,
  wallet buttons for subscriptions), with **Stripe retained for legacy subscriptions** including
  webhooks, sync, billing portal, and cancellation. The provider is a Studio setting, not a code path.
- **Server-side secrets** — every provider call is proxied through the integration API; no secret key
  ever reaches the browser.
- **Access states** — active, exempt (staff-granted), trial window (access-code trials), and
  lapsed/cancelled, each with its own expiry and renewal handling. Member-facing screens show the real
  subscription state, renewal date, and "cancel at period end" flow.
- **Codes and credits** — invite codes, promo codes, artist roster access codes, and a credit balance
  with redemption requests (for example broadcast credits) that staff fulfil.
- **Account recovery** — email-based account reconnect for members who lose their principal.

### 5. Fusion Studio — `/studio`

The staff console for the entire network, grouped as *Overview · Management · Content · Moderation ·
Accounts · Operations*:

- **Management** — applicants, schedule, finance (MRR, receipts, promotions), travel, comms, radar.
- **Content** — programs, products, journal, sound environment, community, videos, content pages,
  user studio, email, and an AI **Assistance** panel (translate / reinterpret copy in place).
- **Moderation** — member status approval, profile-image and audio-file review queues with notes,
  broadcast requests.
- **Accounts** — artists, curators, collectors, galleries, join-network applications.
- **Operations** — gallery access, users and roles, service configuration, scheduled tasks, links,
  and site settings.

Studio is permissioned **per feature**: staff principals carry explicit feature grants, enforced in
Motoko (`listStudioPermissionFeatureKeys`, `assertStudioFeature*`), so a collaborator can edit the
journal without seeing finance.

### 6. Fusion Radar — relationship intelligence

A separate Motoko actor for CRM-style work behind the scenes: leads, relationships, outreach records,
and source configuration, with LLM-assisted drafting and a visual review surface. It is siloed from
the main backend on purpose — different data, different blast radius, same identity model.

## AI, on-chain

Model calls run through the **IC LLM canister** (`mo:llm`, Llama 3.1 8B) — no external AI API and no
key in the browser — invoked from Motoko and gated by caller identity:

| Capability | Who | Behaviour |
|---|---|---|
| `memberReinterpretWithPrompt` | members with active/exempt membership | Rewrite a section of copy using the member's own profile as source |
| `memberTranslateEnToJa` / `memberTranslateText` | members | Bilingual copy without leaving the platform |
| `studioTranslateEnToJa` / `studioReinterpretWithPrompt` | staff with the `ai` feature grant | Same tools for editorial work |
| Radar drafting | staff | Outreach and relationship summaries |

Guardrails are deliberate: input length caps to protect cycles, single-purpose prompts that must
return plain text, refusal/garbage output detected and discarded rather than saved, and a UI that
never lets generation overwrite the artist's own words without an explicit click.

## Identity, access, and privacy

- **Internet Identity** is the only sign-in (no passwords, no email verification loop). Principals
  are the user key everywhere.
- **Roles** — `artist`, `gallery`, `curator`, `collector`, `staff`, `admin`, with `pending` /
  `active` / `suspended` status and links to artist or organisation records.
- **Authorization lives in the canister**, not the client: every mutating method re-checks the caller's
  identity — and, where relevant, a feature grant — before writing. The client is treated as untrusted.
- **Page gating** — public, member, invited, and staff surfaces are separately gated at the router
  level (`pageGate`) so hidden pages cannot be reached by typing a URL.
- **Sensitive data** — the schema already carries ciphertext-shaped fields (`EncryptedBlob`) and a
  documented **VetKD / VetKeys** rollout path, so personal data (email beyond the waitlist, inbox
  bodies, notes, payment tokens) can move to client-side encryption with canister-stored ciphertext
  only. See [`VETKD.md`](VETKD.md).

## Architecture

```
                          ┌──────────────────────────────────────────┐
   Browser / PWA ────────▶│  fusion-app-frontend   (asset canister)  │
                          │  Vite + lit-html SPA + web components    │
                          │  public site · /settings · /studio       │
                          └───────┬──────────────────────┬───────────┘
                                  │ @dfinity/agent       │ HTTPS + Bearer
                                  │ (query / update)     │ (payments, mail, storage)
                                  ▼                      ▼
                ┌──────────────────────────┐   ┌────────────────────────────────┐
                │  fusion-app-backend      │   │  fusion-integration-api        │
                │  Motoko persistent actor │◀──│  Express: PayPal + Stripe,     │
                │  accounts · artists ·    │   │  Resend, LINE, S3/R2 presign,  │
                │  programs · journal ·    │   │  signed private video,         │
                │  editions · comms ·      │   │  account reconnect, cron       │
                │  payments state · LLM    │   └────────────────────────────────┘
                └────────────┬─────────────┘
                             │
                ┌────────────▼─────────────┐        ┌──────────────────────────┐
                │  fusion-radar            │        │  Internet Identity       │
                │  Motoko actor — leads,   │        │  (single sign-on,        │
                │  relationships, outreach │        │   principal-based auth)  │
                └──────────────────────────┘        └──────────────────────────┘
```

**Why this split.** Anything that must be trusted — who you are, what you may read, what you paid,
what the public profile says — is on-chain and cannot be edited by the client. Anything that legally
or technically must sit off-chain (card capture, transactional email, large binaries) is isolated
behind a keyed service whose only privileged action is calling a single canister method.

## Repository layout

```
src/fusion-app-backend/     Motoko actor — ~12.8k lines of main.mo + typed schema (types.mo)
src/fusion-radar/           Second Motoko actor — relationship intelligence
src/fusion-app-frontend/    Vite SPA: router, ~120 components, ~160 utils modules, styles
  └─ src/components/        public pages, member dashboard, Studio panels, shared shell
services/fusion-integration-api/  Express service: payments, email, LINE, object storage
tests/backend/              Canister integration tests (@dfinity/pic + vitest)
third_party/                Pinned Internet Identity wasm / candid for local & mainnet use
docs/                       Deep-dive specs: schema, payments, deployment, moderation, SEO, AI plan
```

## Engineering notes

- **Data model** — records are compact Motoko structs plus versioned JSON blobs (`localesJson`,
  content pages, layouts). Adding a profile field or a CMS block rarely needs a canister migration,
  which is why a platform this wide can ship incrementally.
- **Upgrade safety** — stable memory is versioned in place (`subscribersV0`/`V1`,
  `membershipByPrincipalStable`/`…V2`, …) with `postupgrade` merge hooks, so live data survives schema
  changes without a destructive migration window.
- **Frontend** — intentionally framework-free: `lit-html` templates inside custom elements
  (`app-loadscreen`, `app-page-transition`, `app-feed-filter`, `app-audio-row`, …), a hand-written
  history router, GSAP for motion, and per-page CSS. No virtual DOM, no hydration step.
- **Bilingual content** — every user-facing record carries `en` and `ja` blocks; the header toggle
  switches locale without a reload, and public profiles resolve copy field by field.
- **Progressive Web App** — installable, with a Workbox service worker and cached app shell.
- **Telemetry** — PostHog product analytics and a Meta pixel hook, both wired through project/site
  configuration rather than hard-coded keys.
- **Testing** — `vitest` across ~600 frontend unit tests (publishing rules, payment policy, access
  gating, profile schema, form parsing), canister-level tests with `@dfinity/pic`, and Playwright for
  Radar's visual review surface.
- **Type safety without a rewrite** — the JS frontend is checked with `tsc --noEmit` and JSDoc
  annotations, so refactors stay honest without migrating to TypeScript sources.

## Platform status

**Live and in use:** public site, member dashboard, program applications and fees, memberships and
billing states, Studio, moderation, comms, and the AI copy tools.

**In flight:** completing the PayPal-first checkout migration for the remaining Stripe paths, VetKD
phases B/C for client-side encryption of personal data, and a referral / invite growth layer built on
the existing code and credit system. The `docs/` folder is the working record of that plan.

## Documentation

The interesting detail lives in `docs/`:

| Document | Covers |
|---|---|
| [`docs/profile-schema.md`](docs/profile-schema.md) | Artist record, locales, publish-source resolution, AI column rules |
| [`docs/PAYMENTS.md`](docs/PAYMENTS.md) | PayPal + Stripe flows, plans, instalments, provider switching |
| [`docs/PROGRAM_DRAW_SELECTION_AND_DISPLAY.md`](docs/PROGRAM_DRAW_SELECTION_AND_DISPLAY.md) | Draw mechanics and public display |
| [`docs/page-access-control-roadmap.md`](docs/page-access-control-roadmap.md) | Gating model for public / member / invited / staff |
| [`docs/XAI_INTEGRATION_PLAN.md`](docs/XAI_INTEGRATION_PLAN.md) | On-chain AI roadmap |
| [`docs/MIGRATE_AWS_S3_TO_CLOUDFLARE_R2.md`](docs/MIGRATE_AWS_S3_TO_CLOUDFLARE_R2.md) | Object storage backends |
| [`docs/DEPLOY_RENDER_AND_ICP.md`](docs/DEPLOY_RENDER_AND_ICP.md) | Deployment topology |
| [`docs/PLATFORM_ASSESSMENT.md`](docs/PLATFORM_ASSESSMENT.md) | Honest inventory of what is built and what is not |
| [`VETKD.md`](VETKD.md) | Encryption rollout plan |

## Licence & source availability

**Copyright © Fusion. All rights reserved.**

This repository is public **for hackathon evaluation and technical review only**. It is not
open-source software. No licence — express or implied — is granted to use, reproduce, modify,
distribute, sublicense, deploy, or train models on this code, its data, or its content, in whole or in
part. Public visibility does not place any part of it in the public domain.

Deployment, hosting, or derivative use requires prior written permission. Licensing, partnership, or
press enquiries should go through the contact page of the live platform. The full notice is in
[`LICENSE`](LICENSE).
