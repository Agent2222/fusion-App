# Profile Update Journey — Assessment & Feature Recommendations

## Overview

The member profile update journey lives in `settingsProfile.js` (Member Studio dashboard at `/settings/profile`). Artists edit a single-locale form, optionally auto-translate on save, upload images to S3 via the Integration API, and persist text/metadata to the Motoko canister. The public profile at `/profile/:slug` is read-only.

This document covers: the current update flow, identified issues, and four feature recommendations to make the platform stickier for artists.

---

## Current Update Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Member Studio Dashboard (settingsProfile.js)               │
│                                                             │
│  Identity & Presence ──┐                                    │
│    Basics (name, discipline, bio, links, visibility)        │
│    Status (status, location)                                │
│    Story  (practice, perspective, vision, context, quote)   │
│                                                             │
│  Media Library ────────┐                                    │
│    Hero artwork (1 image)                                   │
│    Profile card headshot (1 image)                          │
│    Intro gallery (3 fixed slots)                            │
│    Audio bite upload / record                               │
│                                                             │
│  Work & Projects ──── "Coming soon" placeholder             │
│  Journal / Notes ──── "Coming soon" placeholder             │
│                                                             │
│  ┌─────────────┐     ┌───────────────────────────────┐      │
│  │  [SAVE]     │ ──▶ │  Save choice modal             │     │
│  └─────────────┘     │  ○ Translate and save (LLM)    │     │
│                      │  ○ Just save (copy to en + ja) │     │
│                      │  ○ Cancel                      │     │
│                      └────────────┬──────────────────┘      │
│                                   │                         │
│                                   ▼                         │
│                      Parallel canister writes:              │
│                      • updateMyArtistLocalesJson             │
│                      • updateMyArtistProfilePatch            │
│                      • updateMyArtistHeroProfileImagePatch   │
│                      • updateMyArtistQuoteAudioPatch         │
│                      • updateMyArtistVisibility              │
│                      • updateMyArtistPublicSlug              │
└─────────────────────────────────────────────────────────────┘
```

---

## Identified Issues

### 1. Upload ≠ Save (data loss risk)

**Problem:** Images upload to S3 immediately when the user picks a file, but the resulting URL is only stored in a hidden DOM field. The canister is not updated until the user explicitly clicks Save. If the user closes the tab, navigates away, or the session expires after uploading but before saving, the image is orphaned on S3 and the profile still shows the old image.

**Impact:** High — artists can believe their new hero image is live when it is not. The success message after upload says "Save to apply this change," but it is easy to miss.

**Location:** `settingsProfile.js` ~L7143; upload completes → hidden field set → no auto-save.

---

### 2. Single-language form with opaque translation

**Problem:** The dashboard shows one form regardless of artist language. Language is inferred on save by character analysis (CJK = Japanese, ASCII = English). Artists cannot:
- See both EN and JA versions side-by-side before saving.
- Preview what the translated version will look like.
- Correct a bad translation without re-saving the entire profile.

**Impact:** Medium — Japanese artists typing JA get correct source, but the EN translation quality is invisible until they check the public profile. English artists have no way to review or tweak their JA profile.

**Location:** `PROFILE_EDIT_LOCALE = "en"` (L229); `inferProfileDraftLanguage` (L1028–1038); `buildSmartProfileLocales` (L1209–1271).

---

### 3. Intro gallery is rigid (3 fixed slots, no reorder, no captions UI)

**Problem:** The intro gallery has exactly 3 positional slots. There is no drag-and-drop, no reorder, and no way to add more. Deleting an image clears the slot without shifting others, leaving gaps. Alt text and captions exist as hidden fields but have **no visible editor** — artists cannot set accessibility text or describe their work in the gallery.

**Impact:** Medium — limits artistic expression and accessibility. Artists accustomed to portfolio sites expect unlimited, reorderable image grids.

**Location:** `settingsProfile.js` L4882–4885 (3 slots); `introSlotsToGallery` in `memberProfileForm.js` L74–93 preserves nulls.

---

### 4. Work & Projects / Journal panels are placeholders

**Problem:** "Work & Projects" and "Journal / Notes" panels render "Coming soon" text. However, the completion tracker on the Overview panel marks "work" as complete when a hero URL exists — misleading when the panel is not functional.

**Impact:** Low–Medium — sets expectations that are not met; undermines trust in the completion tracker.

**Location:** `settingsProfile.js` L4688–4696 (Work placeholder), L4908–4916 (Journal placeholder), L6678–6679 (completion check uses hero URL).

---

### 5. Overview PUBLISH vs full Save inconsistency

**Problem:** The "PUBLISH PROFILE" button on the Overview panel calls `updateMyArtistVisibility` directly — without running the pending-review logic that the full Save path applies (first-time public → `pending`). An artist could bypass the review gate by using the Overview button instead of Save.

**Impact:** Medium — potential moderation gap; staff may miss new public profiles.

**Location:** `settingsProfile.js` L6802–6818 (overview publish, no pending conversion) vs L6385–6386 (full save applies `pending` for first-time public).

---

### 6. No auto-save or draft persistence

**Problem:** Edits live only in the DOM until Save is clicked. There is a `beforeunload` warning and dirty tracking, but no localStorage draft or periodic auto-save. A browser crash, accidental refresh, or session timeout loses all unsaved work.

**Impact:** Medium — frustrating for artists writing long story/bio content.

---

### 7. Translation requires active membership

**Problem:** "Translate and save" is gated behind active membership (`mpdMembershipGate === "needsSubscription"`). Free-tier or lapsed members can only "Just save" (copy same text to both locales). This silently produces profiles where the JA version is in English — confusing for Japanese visitors.

**Impact:** Low–Medium — affects edge cases but creates poor public-facing quality for non-paying artists.

**Location:** `settingsProfile.js` L3675–3684 (membership gate on translate).

---

### 8. 1 MB image limit with no resize feedback

**Problem:** Images are compressed client-side to 1 MB max (JPEG, 2400px longest edge). HEIC files over the limit are rejected outright. There is no visible resize/compression indicator — artists uploading a 5 MB JPEG see it silently compressed, or see an error with no guidance on how to fix it.

**Impact:** Low — compression usually works, but HEIC failures with no actionable message are frustrating.

**Location:** `imageUploadPrep.js` L115–123; `MPD_MAX_IMAGE_BYTES = 1 MB` in `settingsProfile.js` L224.

---

### 9. Story "edit" buttons are misleading

**Problem:** The pencil/assist icons next to story fields (practice, perspective, etc.) only focus the field — they do not invoke LLM assist or open an editor. The icon suggests AI editing capability that does not exist.

**Impact:** Low — confusing affordance.

**Location:** `settingsProfile.js` L7001–7012.

---

### 10. Audio upload has a dual persistence path

**Problem:** Audio uploads call `addMyArtistAudioEntry()` immediately (separate canister method), while other profile fields wait for the explicit Save button. This means audio is live before the user "saves," creating an inconsistent mental model.

**Impact:** Low — works correctly but breaks the "nothing saves until I click Save" expectation.

**Location:** `settingsProfile.js` L7268.

---

## Summary of Issues by Severity

| Severity | Issue |
|----------|-------|
| **High** | Upload ≠ Save — image data loss risk |
| **Medium** | Single-language form, no translation preview |
| **Medium** | 3 fixed gallery slots, no captions UI |
| **Medium** | PUBLISH button bypasses pending-review |
| **Medium** | No auto-save / draft persistence |
| **Low–Med** | Translation gated behind membership |
| **Low–Med** | Work/Journal placeholders + misleading completion |
| **Low** | 1 MB limit with no resize feedback |
| **Low** | Story edit buttons do not invoke AI |
| **Low** | Audio dual persistence path |

---

## 4 Key Feature Recommendations

### Feature 1: Portfolio Gallery — Unlimited, Reorderable Artwork Grid

**What:** Replace the 3 fixed intro gallery slots with a full portfolio gallery. Artists can upload unlimited images, drag-and-drop to reorder, add title/medium/year/caption per work, and optionally group by series or project.

**Why it makes Fusion stickier:**
- Artists invest time curating their portfolio — that investment creates switching cost.
- A proper portfolio makes Fusion a credible alternative to personal websites, not just a program application platform.
- Galleries, curators, and collectors viewing profiles get the depth they need to evaluate an artist.
- Current 3-slot limit is the #1 structural gap vs. platforms like Artsy, Foundation, or personal sites.

**Implementation notes:**
- Store gallery items in `localesJson` under a `portfolio[]` array (already partially modeled as `masterPortfolio` in testData).
- Reuse S3 upload infra with area `account/portfolio`.
- Build the Work & Projects panel as the portfolio manager (eliminates the "coming soon" placeholder).
- Public profile renders portfolio as a grid with lightbox; can later integrate with Gallery Access.

---

### Feature 2: Auto-Save with Draft Recovery

**What:** Periodically persist form state to `localStorage` (every 30 seconds while dirty). On next visit, detect an unsaved draft and offer to restore it. After upload, auto-trigger a save so images are never orphaned.

**Why it makes Fusion stickier:**
- Eliminates the data loss risk from the Upload ≠ Save gap — the most impactful bug identified.
- Reduces friction for long editing sessions (story writing, bio crafting).
- Artists trust the platform more when their work is never lost.
- Low-effort, high-impact — no backend changes required for localStorage drafts.

**Implementation notes:**
- `snapshotState()` and `isDirty()` already exist; persist the snapshot to localStorage keyed by artist ID.
- On init, compare stored draft timestamp vs canister `updatedAt`; offer restore if draft is newer.
- After image upload success, call `saveProfileFromDom` automatically (or queue it) instead of showing "Save to apply."
- Clear draft on successful canister save.

---

### Feature 3: Bilingual Preview & Translation Control

**What:** Add a locale toggle (EN | JA) to the profile editor so artists can preview both versions before publishing. Show the translated version inline (read-only) alongside the editable source. Allow one-click re-translate of individual fields.

**Why it makes Fusion stickier:**
- Fusion's bilingual identity (Japan + international) is its core differentiator — the profile should embody that.
- Artists who see their profile beautifully rendered in both languages feel the platform's value deeply.
- Reduces "publish and pray" anxiety around translation quality.
- Enables Japanese artists to verify their English presence and vice versa — critical for gallery/collector outreach.

**Implementation notes:**
- The translation infrastructure exists (`memberTranslateText`, `buildSmartProfileLocales`, language inference).
- Add a "Preview JA" / "Preview EN" toggle that renders the other locale's fields in read-only blocks below each form field.
- Add per-field "Re-translate" buttons that call `memberTranslateText` for just that field.
- Store the last-translated fingerprint per field (already tracked via `mpdFieldFingerprint`) to highlight stale translations.

---

### Feature 4: Artist Activity Timeline & Profile Insights

**What:** Show artists a timeline of their Fusion activity on their dashboard: profile views, program applications, events attended, works added, outreach received. Add simple analytics: profile view count (last 30 days), top referrer, gallery access requests.

**Why it makes Fusion stickier:**
- Gives artists a reason to return regularly — "Someone viewed my profile" is a powerful engagement loop.
- Surfaces the value of being on the platform beyond the initial application.
- Creates social proof pressure ("Your profile has been viewed 47 times this month — keep it updated").
- Data-driven engagement is the standard retention mechanism for creator platforms (Behance, LinkedIn, Artsy).

**Implementation notes:**
- Profile view tracking: increment a counter on `getArtistBySlug` or via PostHog server-side events (already integrated).
- Timeline: aggregate existing canister data (application dates, program confirmations, visibility changes) plus new lightweight events.
- Dashboard widget: new panel section on Overview, replacing or augmenting the current completion tracker.
- Future: Radar relationship matches ("A curator viewed your profile") as premium insights.

---

## File Reference

| Concern | Path |
|---------|------|
| Edit dashboard | `src/fusion-app-frontend/src/components/settingsProfile.js` |
| Public profile | `src/fusion-app-frontend/src/components/profile.js` |
| Form read/write | `src/fusion-app-frontend/src/utils/memberProfileForm.js` |
| Canister API | `src/fusion-app-frontend/src/utils/database.js` |
| S3 upload | `src/fusion-app-frontend/src/utils/studioS3Upload.js` |
| Image prep | `src/fusion-app-frontend/src/utils/imageUploadPrep.js` |
| Save status | `src/fusion-app-frontend/src/components/subComponents/profileSaveStatus.js` |
| Test data | `src/fusion-app-frontend/src/testData.js` |
| Motoko types | `src/fusion-app-backend/types.mo` |
| Motoko API | `src/fusion-app-backend/main.mo` |
| Styles | `src/fusion-app-frontend/src/styles/memberProfileDashboard.css` |
