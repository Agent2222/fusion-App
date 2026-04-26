# Fusion — animation & motion language

This document extends the app’s existing **fade-first** vocabulary into a calm, consistent system. **Tone:** peaceful, subtle, never flashy. Motions should feel like light through paper, not like a sports broadcast.

---

## 1. What we already use (baseline)

| Mechanism | Where | Notes |
|-----------|--------|--------|
| **Full-viewport opacity veil** (`--bg`, 500ms `ease-in-out`) | `app-page-transition` → `page-transition.js` | Route changes: cover → swap `#mainContent` → reveal. This is the **primary** page transition; any new motion should **harmonize** with 500ms and `ease-in-out`, not fight it. |
| **Home shell fade + slight transform** | `#homeMainContent` in `index.css` | Starts `opacity: 0`, becomes `.active` with `opacity: 1`; `transition: transform 0.5s ease-in-out, opacity 0.5s ease-in-out`. Natural place to **soften** or add **staggered children** after loadscreen dismiss. |
| **Image cross-fade** | `app-program-fade-gallery` → `program-fade-gallery.js` | Configurable `FADE_MS` between stills; fits the same “breathing” family. |
| **Slow Ken Burns–style image scale** | `featured-artist.js`, `coming-up.js`, `staffFeed.js` | Long `scaleImage` / `staffScaleImage` keyframes (~15s) — **ambient** only; do not add competing fast loops. |
| **Card / row hovers** | `eventRow.js`, `program-block.js`, `journal-hero.js`, `quoteRow.js`, etc. | Mostly `0.3s ease` on borders, opacity, transform — keep **micro** and under **300ms** unless part of a GSAP sequence. |
| **GSAP** | Root `package.json` → `gsap` | Used today in **`header.js`** (logo / bar show-hide), **`footer.js`** (reveal with scroll), **`loadscreen.js`** (home grid / CTA choreography). **Use timelines** when enter/exit must be **ordered** or **reversible** (modals, menus, loadscreen steps). |
| **CSS-only feedback** | `index.css` (feeds, filters, program application CTA “blink”) | Prefer **opacity + transform** over box-shadow pulsing for new work. |

**Principle:** Treat **opacity** as the default “Fusion fade.” Add **short translateY (4–12px)** or **1–2% scale** only when it improves clarity—never as the main effect.

---

## 2. Suggested tokens (for new CSS / GSAP)

Use these as **guidelines** so new screens don’t feel faster or harsher than the route veil.

| Token idea | Suggested value | Use |
|------------|-----------------|-----|
| `--motion-fade-duration` | `500ms` | Match `page-transition` / home shell unless a child needs a faster micro-fade (see below). |
| `--motion-micro-duration` | `200–300ms` | Hovers, focus rings, small UI toggles. |
| `--motion-entrance-duration` | `400–600ms` | First paint of a section or modal content (often **shorter** than page veil if staggered). |
| Easing (fade / spatial) | `cubic-bezier(0.4, 0, 0.2, 1)` or `ease-in-out` | Calm in-out; avoid **linear** for large areas. |
| Easing (leave / dismiss) | Slightly same or a touch **faster** duration, not a snappier bezier, to avoid “popping” away. |

**Stagger** (if using GSAP `child stagger`): **30–60ms** between siblings for list-like content; more feels mechanical.

### Text translate movement defaults

Use translate on text as a **supporting cue**, not as a dramatic slide.

| Text type | Translate pattern | Notes |
|-----------|-------------------|-------|
| Hero headline / title | `translateY(8px -> 0)` | Pair with opacity fade. Keep under `600ms`. |
| Subhead / body intro | `translateY(6px -> 0)` | Slightly softer than headline; usually starts 40–80ms later. |
| Labels / metadata | `translateY(4px -> 0)` | Subtle only; can often be opacity-only if dense UI. |
| CTA text / button label | `translateY(4px -> 0)` or none | Avoid noticeable motion inside controls; prioritize readability. |
| Inline status text / banners | `translateX(-6px -> 0)` (LTR) | Use horizontal movement only for toast/banner-style context shifts. |

**Do not** move text farther than **12px** in normal UI flows. Large text travel reads as theatrical and breaks the peaceful tone.

---

## 3. “Animate in” (entrance) — good candidates

These are **one-shot** or **on mount** motions: user arrives; content **settles in**. Prefer **CSS** (`@keyframes` or `transition` with `animation-fill-mode: both`) for simple cases; use **GSAP** when you need **scroll triggers**, **stagger**, or **coordination with the route veil**.

| Area | What to strengthen | Suggestion |
|------|-------------------|------------|
| **Routed main column** | `#mainContent` inner routes swap **instantly** behind the veil. | After `reveal()`, optional **10–20px `translateY` + opacity** on a wrapper (or `opacity` only) so the *new* page **soft-lands**—keep total time ≤ veil or slightly under so it still feels one gesture. |
| **Home feed rows** | `.feed-item` blocks are tall; they appear as user scrolls. | **IntersectionObserver** + single **fade-in** (and optional tiny `translateY`) for each row; **stagger** only for first 2–3 above the fold, then static to save CPU. |
| **Hero lines** (program, journal, edition) | Titles/CTAs often paint together. | **Staggered opacity** (title → subtitle → `.programCTA` / `.ctaButton`); use **only opacity** in shadow roots if `transform` risks layout. |
| **Card grids** (artists, editions, programs) | Grid cells appear en masse. | Light **fade + 4px rise** on first show; **debounce** so fast scroll doesn’t fire hundreds of tweens. |
| **Detail pages** (edition, journal entry, event) | Back link + title + body. | Short **sequence**: nav → headline → body (CSS delay or small GSAP timeline, **under 800ms** total). |
| **Modals & sheets** (join network, profile setup, studio modal) | Open/close is often binary. | **Enter:** fade overlay + **slide 8px** or scale **0.98→1** on the panel. **Exit:** same in reverse; prefer **one timeline** so backdrop and panel don’t desync. |
| **Header / account menu** | Dropdowns and account UI in `header.js`. | **Height/opacity** or **max-height** with `overflow: hidden` for disclosure; or GSAP if matching existing `gsap.to` patterns on the same element. |
| **Footer** | `footer.js` already animates on scroll. | **Align durations** with header if both visible in same view; no extra bounce. |
| **Toasts & inline banners** | Studio banners, success lines. | **Slide from edge + fade** 250–400ms; **no** infinite attention unless it’s a real error. |
| **Form focus & steps** (join, checkout, studio forms) | Step changes can feel abrupt. | **Crossfade** between steps (opacity on outgoing/incoming panes) rather than hard replace. |
| **Program application CTA** | `program-application-cta-review-blink` in `index.css` | Already a **soft** opacity pulse; if replacing, keep **amplitude under 0.12** and **period ≥ 1.2s** so it stays “quiet.” |
| **Member profile dashboard** | `memberProfileDashboard.css` transitions. | Extend existing **0.2–0.3s** language for tab/panel changes; add **enter** only if it doesn’t block interaction. |
| **Audio / media rows** | `audioRow.js` and similar. | **Playing state:** gentle opacity/background change only—no strobe. |

---

## 4. GSAP timeline (in & out) — when to use

Use a **`gsap.timeline({ defaults: { ease: 'power2.inOut' } })`** (or `sine`/`sine.inOut` for even softer) when:

| Flow | Why timeline |
|------|----------------|
| **Loadscreen** → home | Already complex in `loadscreen.js`; new steps should **chain** to the same pattern (clear labels, `tl.add()`). |
| **Header** logo + bar | Already multi-step in `header.js`; any new hide/show should **extend** the same timeline, not duplicate with CSS. |
| **Footer** paired with main | `footer.js` + header: keep **one direction** of motion (e.g. both fade) so the frame doesn’t “wobble.” |
| **Modals** | **Enter:** `overlay 0→1` then `panel` move/scale, or parallel with slight offset. **Exit:** **panel first**, then overlay, so focus isn’t trapped on a fading backdrop. |
| **Studio** panel / shell transitions | `panels.js` + `studio.css`: if adding motion, use **one timeline per open/close** to match z-index and `pointer-events` toggles. |
| **Join flow** (`joinNetwork.js` steps) | Step advance / back: **outgoing** step fades/slides, **incoming** follows; **under 500ms** per step or use the same 500ms as the brand veil. |

**Avoid** running a heavy GSAP tick on every scroll frame for **large** lists—prefer **CSS** + one-shot **ScrollTrigger** sections or **ION**-style thresholds.

---

## 5. Tone checklist (peaceful & subtle)

- [ ] **Amplitude:** opacity delta at most **0.15** for “always on” or looping hints; one-shot entrances can go **0 → 1** on small elements only.  
- [ ] **Duration:** default **400–600ms** for page-level; **≤ 300ms** for hovers.  
- [ ] **Motion path:** prefer **4–12px** vertical nudge; horizontal **2–8px** for LTR slides; **scale 0.98–1** max for panels.  
- [ ] **Text motion:** pair text translate with opacity, keep translate to **4–8px** in most cases (max **12px**), and avoid rotating/skewing text.  
- [ ] **No** elastic/bounce for primary UI (optional **tiny** overshoot only in marketing loadscreen if already established).  
- [ ] **Parity:** in/out **mirrored** duration for the same component.  
- [ ] **`prefers-reduced-motion: reduce`:** set animations to **instant** or **opacity-only**; respect in `page-transition` (veil 0/1 is ok if reduced to instant opacity swap) and in GSAP (`.duration(0)` or skip timeline).

---

## 6. Implementation order (suggested)

1. **Document in CSS variables** the durations above (next to `:root` in `index.css` or a small `motion.css` import).  
2. **Route content nudge** after `app-page-transition` `reveal()` (router callback or a tiny shared helper) — **highest** visual win vs effort.  
3. **Modals** (join + studio): shared **open/close** helper with GSAP or CSS **once**; reuse everywhere.  
4. **Feed rows** with IntersectionObserver + one-time class.  
5. **Polish** heroes and detail pages with staggered opacity.

---

## 7. File map (reference)

| File | Role |
|------|------|
| `src/components/subComponents/page-transition.js` | Global route fade veil. |
| `src/router.js` | Orchestrates cover/swap/reveal. |
| `src/index.css` | `#homeMainContent`, feeds, many transitions. |
| `src/components/shared/header.js` | GSAP header / logo. |
| `src/components/shared/footer.js` | GSAP footer. |
| `src/components/shared/loadscreen.js` | GSAP home / CTA. |
| `src/components/subComponents/program-fade-gallery.js` | Program image cross-fade. |
| `src/components/subComponents/*-hero.js`, `eventRow.js`, `program-block.js` | Component-scoped CSS transitions. |
| `src/styles/memberProfileDashboard.css` | MPD micro-transitions. |
| `src/styles/studio.css` | Studio stacking vs page veil. |

This doc is the **style contract** for new animation work; when in doubt, **match the 500ms veil** and add **one** gentle layer, not three.
