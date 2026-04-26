<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Fusion platform frontend. PostHog was already initialised in `main.js` with the correct environment variables (`VITE_PUBLIC_POSTHOG_KEY` / `VITE_PUBLIC_POSTHOG_HOST`), and several core events were already in place. The wizard audited those, verified them, and supplemented them with six new targeted events covering locale switching, artist profile engagement, gallery access interactions, early-access sign-ups, program apply CTAs, and profile settings saves. User identification (`posthog.identify`) and session reset (`posthog.reset`) were already correctly wired in `icAuth.js` and remain unchanged. Environment variables were confirmed and updated in `src/fusion-app-frontend/.env`.

## Events instrumented (new)

| Event name | Description | File |
|---|---|---|
| `locale_changed` | User switches site language (EN ↔ JA) | `src/fusion-app-frontend/src/main.js` |
| `artist_profile_viewed` | An artist profile page loads with a matching artist record | `src/fusion-app-frontend/src/components/profile.js` |
| `gallery_access_modal_opened` | Authenticated user clicks Gallery Access on an artist profile | `src/fusion-app-frontend/src/components/profile.js` |
| `program_apply_cta_clicked` | User clicks the primary "Sign up & apply" CTA on a program page | `src/fusion-app-frontend/src/components/programView.js` |
| `early_access_submitted` | User completes the join-network flow and early access is saved to the canister | `src/fusion-app-frontend/src/components/subComponents/joinNetwork.js` |
| `profile_settings_saved` | Member successfully saves their profile from the settings dashboard | `src/fusion-app-frontend/src/components/settingsProfile.js` |

## Previously existing events (verified, unchanged)

| Event name | File |
|---|---|
| `sign_in_succeeded` + `posthog.identify` | `src/fusion-app-frontend/src/utils/icAuth.js` |
| `signed_out` + `posthog.reset` | `src/fusion-app-frontend/src/utils/icAuth.js` |
| `sign_in_failed` | `src/fusion-app-frontend/src/components/subComponents/signInModal.js` |
| `profile_setup_opened` | `src/fusion-app-frontend/src/utils/icAuth.js` |
| `program_application_started` | `src/fusion-app-frontend/src/components/subComponents/application-form.js` |
| `program_application_submitted` | `src/fusion-app-frontend/src/components/subComponents/application-form.js` |
| `program_application_failed` | `src/fusion-app-frontend/src/components/subComponents/application-form.js` |
| `join_network_modal_opened` | `src/fusion-app-frontend/src/components/subComponents/joinNetwork.js` |
| `membership_payment_completed` | `src/fusion-app-frontend/src/components/subComponents/joinNetwork.js` — also `amount_cents`, `amount`, `payment_plan` / optional `payment_plan_label`, `page_context`, `join_role`, optional `stripe_subscription_id` (see `docs/META_PIXEL.md`) |
| `gallery_access_cta_clicked` | `src/fusion-app-frontend/src/components/subComponents/gallery-access-cta.js` |
| `$pageview` | `src/fusion-app-frontend/src/main.js` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/384323/dashboard/1474124
- **Program application funnel** (Apply CTA → Form started → Submitted): https://us.posthog.com/project/384323/insights/zYm8wvOq
- **Membership signup funnel** (Modal opened → Early access → Payment): https://us.posthog.com/project/384323/insights/JU7SqsjH
- **Sign-in success vs failure** (daily trend): https://us.posthog.com/project/384323/insights/IjFVA447
- **Artist engagement** (profile views, gallery CTA clicks, modal opens): https://us.posthog.com/project/384323/insights/EFj9YCBR
- **Weekly active users** (90-day area chart): https://us.posthog.com/project/384323/insights/x5HB7GIJ

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
