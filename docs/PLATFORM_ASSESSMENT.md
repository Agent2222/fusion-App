# Fusion Platform — Feature Assessment & Gaps

This document summarizes what exists in the **fusion-app** repo today (Motoko backend, Vite SPA, Fusion Studio, integration API) and what is **missing or incomplete** for a **membership-paid** platform connecting **artists, galleries, curators, and collectors**. It is based on code and config review, not on unreleased product specs.

---

## 1. Architecture (what you’re building on)

| Layer | Technology | Role |
|-------|------------|------|
| **Identity** | Internet Identity (`internet_identity` + `internet_identity_frontend` in `dfx.json`) | Single sign-on for all users |
| **App backend** | Motoko canister `fusion-app-backend` | Authoritative data: accounts, artists, programs, journal, editions, content pages, applicants, subscribers, site settings |
| **App frontend** | Vite SPA → asset canister `fusion-app-frontend` | Public marketing site, feeds, profiles, join flows, member profile settings, Studio shell |
| **Off-chain API** | `services/fusion-integration-api` (Express) | Stripe Payment Intents, Resend email, S3 presigned uploads — secrets stay off the client |
| **Data overlays (dev)** | `localStorage` + `database.js` | Test JSON vs live canister; Studio can overlay imports in test mode |

**Scalability / dynamics:** Content is largely **JSON blobs** (`localesJson`, program/journal/edition records) with stable IDs and slugs — easy to extend fields without Motoko schema churn. **Auth** is principal-based; **roles** are enumerated in `types.mo` (`UserRole`, `AccountStatus`).

---

## 2. Identity, accounts & roles (on-chain)

**Implemented**

- `UserAccount`: `role` (artist | gallery | curator | collector | staff | admin), `status` (pending | active | suspended), optional `linkedArtistId`, `linkedOrgId`, `updatedAt`.
- `registerOrUpdateAccount(role)` for self-serve registration (non-privileged roles only); defaults to **pending**.
- `getAccountForCaller()` for the signed-in user.
- Admin: `adminUpsertUserAccount`, `listAccounts`, `bootstrapAdminIfEmpty`, `addAdmin`, `isAdmin` / `isCallerAdmin`.
- Staff gates for Studio list/import operations (`assertStaffOrAdmin` pattern in `main.mo`).

**Gaps / notes**

- **Activation** of members is **admin-driven** (`#pending` → `#active`); there is no self-serve “pay then auto-activate” loop wired end-to-end in the canister.
- **`linkedOrgId`** exists on the type and Studio table columns but **org entities** are not modeled in Motoko (no `OrganizationRecord` table in this repo).
- **Collector / gallery / curator** “profiles” beyond join intent: **`CollectorProfileRecord`** is defined in `types.mo` but **not stored or served** by the actor.

---

## 3. Public site (routes & experiences)

**Routes** (from `router.js`): Home, Artists, Programs (+ program detail), Gallery Access, Editions (+ edition detail), Journal (+ entry detail), Community, Context, Sign-in / Register (nav pages), Contact, **Artist profile** (`/profile/:slug`), Events, **404**, **Fusion Studio** (`/studio`), **Profile settings** (`/settings/profile`).

**Content & discovery**

- Feeds, filters (`app-feed-filter`, `testData` + live `listArtists`), program heroes, journal rows, editions grid, events, audio, join CTAs, loadscreen / early access.
- **CMS-style** content: `ContentPageRecord` + Studio “Content” tab for many site blocks (terms, FAQ, join flows, etc. — see `CONTENT_PAGE_REGISTRY` in `database.js`).

**Gaps**

- **Role-specific home dashboards** for gallery / curator / collector are **not** separate products in routing — mostly one marketing shell + Studio for staff.
- **Cross-actor marketplace** (collector ↔ artist transactions on-chain) is **out of scope** in current backend APIs.

---

## 4. Member (“user”) dashboard

**Implemented (artist-centric)**

- **`/settings/profile`**: Studio-styled **member dashboard** for **linked artists** — hero image (`updateMyArtistProfilePatch`), locales (`updateMyArtistLocalesJson`): bio, world copy, intro gallery (max 3), links, SEO, location, status, programs read-only, dev JSON dump when `DEV_MODE`.
- **Header** CTAs: sign-in, profile, studio (admin/staff), register/join pipeline aligned with `icAuth.js` and `fusion-auth-change`.

**Gaps**

- **No unified `/dashboard` hub** that adapts by `UserRole` (artist vs collector vs gallery).
- **Private `account` bucket** from seed data (subscription, inbox, bookmarks) is **not** persisted in Motoko `ArtistRecord` (see `docs/profile-schema.md`).
- **Billing / subscription state** is not a first-class canister object tied to Stripe subscriptions — integration API creates **Payment Intents**; recurring membership enforcement is **not** described in Motoko.

---

## 5. Fusion Studio (admin & staff)

**Implemented**

- Full-page app (`/studio`, `studio.css`), sidebar: Subscribers, Applicants, Artists, Programs, Products, Gallery Access, Journal, Content, Email, **Ai**, **Galleries**, **Collectors**, **Curators**, **Users**, **Services**, **Settings**.
- **CRUD** (staff/admin): artists, programs, journal, editions, content pages, applicants; subscribers list/delete; bulk imports; site settings key/value.
- **Services** panel: Integration API base URL, bearer token, **Stripe** (test/live publishable keys, PaymentIntent test), **Resend**, **S3** (presign test upload).
- **Users** table: principals, roles, `linkedArtistId` / `linkedOrgId`.

**Gaps**

- Several nav sections are **placeholders or light** compared to Artists/Programs (verify `panels.js` per section — **Ai**, **Galleries**, **Collectors**, **Curators** are unlikely to be full CRUD on par with core content).
- **No in-Studio workflow designer** for membership tiers — Stripe is dev tooling, not productized tiers.

---

## 6. Monetization & “membership paid platform”

**Present**

- **Stripe** via `fusion-integration-api`: `POST /stripe/create-payment-intent`; Studio can health-check and run test PI flows.
- **Join network** (`app-join-network`): multi-step flows including **membership** modal context; Stripe.js loaded in app.
- **Subscriber** model on-chain: `upsertSubscriber`, categories, intent field (`membership` | `access` | `apply`).

**Missing for a complete paid membership product**

- **Subscription lifecycle**: Stripe **Customers**, **Subscriptions**, **invoices**, **webhooks** → updating `UserAccount` or a `MembershipRecord` in Motoko (not present).
- **Entitlement checks**: gating routes or API by “paid tier” or active subscription.
- **Dunning / failed payment / cancel** flows.

---

## 7. Comms, media & privacy

**Present**

- **Email**: Resend through integration API (`POST /email/send`).
- **Media**: S3 presign uploads; URLs stored in profile/locales (no raw binaries in Motoko).
- **Encrypted notes** on `ArtistRecord` (`notesEncrypted`, VetKD-oriented) — **type exists**; **VETKD.md** notes **vetkd_* not wired** in Motoko yet.

**Missing**

- End-to-end **encrypted notes** / key derivation in production.
- **In-app messaging** between roles (inbox/sent in seed data only — not on-chain).

---

## 8. Applicant / program pipeline

**Present**

- `ApplicantRecord` + CRUD for staff: program applications with `payloadJson`, status workflow (`pending` → … → `accepted` | `rejected`).

**Missing**

- Applicant-facing **portal** (track status, upload assets) if desired — current emphasis is Studio-side.

---

## Bullet TODO — what’s missing (prioritized themes)

Use this as a backlog sketch; reorder to match product priorities.

### Membership & payments

- [ ] Define **canonical membership model** (tier, price, interval) in Motoko or off-chain ledger with **IC principal** mapping.
- [ ] Implement **Stripe webhooks** (subscription created/updated/deleted, invoice paid) → update canister **entitlements**.
- [ ] Add **route/API guards** so paid features check **active subscription** (not only II login).
- [ ] Wire **join flow** completion to **payment success** → `UserAccount.status = #active` (or separate `billingStatus`).
- [ ] **Customer portal** link / cancel / update payment method (Stripe Billing).

### Roles: galleries, curators, collectors

- [ ] **Persist `CollectorProfileRecord` (or equivalent)** + public slug routes + `getMy*` / update APIs.
- [ ] **Gallery / org** model: `OrganizationRecord`, link users via `linkedOrgId`, Studio CRUD.
- [ ] **Curator** tools: curated lists, notes — partially overlapping `notes` in locales; needs ACL and UI.
- [ ] **Role-specific dashboards** (`/dashboard` or `/studio-lite`) — not only artist profile settings.

### User dashboard & account data

- [ ] **Owner-only account JSON** (`AccountPrivateJson` / bookmarks / inbox) with Motoko storage and **zero leakage** on public queries.
- [ ] **Unified member home** after login: next steps, membership status, links to profile & Studio (if staff).

### Artist profile completeness

- [ ] **Programs** field: product decision — user-editable vs admin-only; if user-editable, UI + validation against real `ProgramRecord` list.
- [ ] **Portfolio / events / words** editors in settings (data already in JSON in many seeds) — optional phased.

### Studio & operations

- [ ] Harden **Ai / Galleries / Collectors / Curators** sections or **hide** until implemented to avoid empty expectations.
- [ ] **Audit log** (`updatedBy`) for admin mutations (called for in profile plan).
- [ ] **Email campaigns** beyond transactional Resend (optional product scope).

### Platform & engineering

- [ ] **E2E tests** for auth + critical paths (join, pay, profile save).
- [ ] **Observability**: metrics/logging for integration API and canister traps in production.
- [ ] **Documentation**: replace template root `README.md` with Fusion-specific runbooks (deploy, II, integration API envs).

### Security & compliance

- [ ] **Rate limits** on public endpoints and integration API (abuse, presign spam).
- [ ] **Privacy policy / consent** flows tied to subscriber and applicant data (product + legal).

---

## Summary

Fusion today is a **strong IC-native content + CRM foundation**: Internet Identity, role accounts, rich artist/program/journal/edition/content data, a capable **Studio** for staff, **member-facing artist profile settings**, and an **integration layer** for Stripe, email, and S3. What’s **not yet a complete “paid membership platform” for four audiences** is: **subscription truth in the canister**, **entitlement gating**, **full non-artist member profiles and orgs**, **unified member dashboard**, and **deeper collaboration features** (messaging, marketplace) — plus **VetKD** and **private account** storage if those remain goals.

---

*Generated from repository review. Update as features ship.*
