# xAI (Grok) Integration Plan — Fusion Platform

> How to integrate `https://x.ai/api` into the Fusion platform to provide more powerful, AI-driven tools for artists, staff, and the broader network.

---

## 1. Why xAI / Grok

xAI's API offers a multi-modal suite — text reasoning, image generation, image understanding, video generation, voice, web search, and structured outputs — all behind a single OpenAI-compatible endpoint (`https://api.x.ai/v1`). For Fusion, this means we can consolidate multiple AI capabilities under one provider instead of stitching together separate services.

**Key advantages for Fusion:**
- **OpenAI SDK compatible** — Drop-in replacement; the JS/TS `openai` package works by just changing `baseURL` and API key
- **Image generation + editing** — Grok Imagine can generate and edit images from text, with multi-image reference support (up to 3 source images)
- **Image understanding** — Analyze artwork, portfolio images, exhibition documentation
- **Video generation** — Animate still images or generate from text (up to 15s clips)
- **Web search built-in** — Server-side web and X (Twitter) search as native tools, with citations
- **Structured outputs** — JSON schema enforcement for predictable parsing (critical for Radar scoring, profile enrichment)
- **Function calling** — Model can invoke custom tools, enabling agentic workflows
- **Competitive pricing** — $2/M input tokens, $6/M output tokens (grok-4.6); images at $0.04–0.05 each

---

## 2. Current State: On-Chain AI via IC

Today, **all Fusion AI runs on-chain** through the Internet Computer's `mo:llm` package using **Llama 3.1 8B**. There are no external LLM API calls in the codebase.

| Current capability | Where it runs | Model |
|---|---|---|
| Radar lead scoring (6-dimension + rationale) | `fusion-radar` canister | Llama 3.1 8B |
| Radar lead enrichment from text | `fusion-radar` canister | Llama 3.1 8B |
| Radar outreach drafting | `fusion-radar` canister | Llama 3.1 8B |
| Artist "New World" copy generation | `fusion-app-backend` canister | Llama 3.1 8B |
| EN→JA translation (all content) | `fusion-app-backend` canister | Llama 3.1 8B |
| Journal/email writing assist (staff) | `fusion-app-backend` canister | Llama 3.1 8B |
| Text rewrite by prompt | `fusion-app-backend` canister | Llama 3.1 8B |

**What doesn't exist today:** Image generation, image/artwork analysis (vision), video generation, web search, external LLM calls, member-facing journal AI, application assistance, or program matching.

**Why upgrade:** Llama 3.1 8B is constrained — limited reasoning depth, no vision, no structured output enforcement, no web access, and latency/cycle costs are tied to the IC. Grok 4.6 is a dramatically more capable model with native multi-modal support, giving Fusion tools that simply aren't possible on-chain.

---

## 3. Architecture: Where xAI Fits

### Current architecture

```
Browser (SPA)  ──►  fusion-integration-api (Express proxy)  ──►  External APIs (Stripe, Resend, S3, Places)
                         │
                         ▼
                    fusion-app-backend (Motoko canister on IC)  ──►  mo:llm (Llama 3.1 8B)
                    fusion-radar (Motoko canister on IC)        ──►  mo:llm (Llama 3.1 8B)
```

The Integration API (`services/fusion-integration-api/`) already acts as a **server-side proxy** for external services (Stripe, Resend, S3/R2, Google Places). All secrets stay server-side. The frontend calls the Integration API, which forwards to external providers.

The **on-chain LLM path stays intact** — simpler tasks (translation, basic text rewrite) can continue running via `mo:llm` at zero API cost. xAI handles the **heavy lifting** that Llama 3.1 8B can't do well: vision, structured reasoning, image/video generation, and web research.

### Proposed hybrid: on-chain + xAI

```
Browser (SPA)
   │
   ├─► IC canister (mo:llm Llama 3.1 8B)          ← Translation, basic rewrites (free, on-chain)
   │
   ├─► fusion-integration-api/routes/xai.js        ──►  api.x.ai/v1  (scoring, enrichment, reasoning)
   ├─► fusion-integration-api/routes/imagine.js     ──►  api.x.ai/v1  (image gen/edit/understand)
   └─► fusion-integration-api/routes/video.js      ──►  api.x.ai/v1  (video generation)
```

**All xAI calls are proxied through the Integration API.** The `XAI_API_KEY` lives in the Integration API's `.env` — never exposed to the browser. On-chain LLM continues to handle lightweight tasks where it performs well enough.

### Frontend utility layer

```
src/utils/xaiApi.js          ← thin wrappers calling Integration API endpoints
src/utils/radarScoring.js    ← updated to use xAI via xaiApi.js
src/utils/radarApi.js        ← enrichment calls routed through xAI
```

---

## 4. Integration API Setup

### Environment

```env
# services/fusion-integration-api/.env
XAI_API_KEY=xai-xxxxxxxxxxxxxxxxxxxx
XAI_MODEL_TEXT=grok-4.6
XAI_MODEL_IMAGE=grok-imagine-image-2.0
XAI_MODEL_VIDEO=grok-imagine-video-1.5
XAI_MAX_TOKENS=4096
```

### Server-side client (Node.js)

Because xAI is OpenAI SDK-compatible, the Integration API can use the `openai` npm package:

```js
import OpenAI from 'openai';

const xai = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: 'https://api.x.ai/v1',
});
```

### Route structure

| Route | Method | Purpose |
|-------|--------|---------|
| `POST /xai/chat` | POST | General text completion / chat |
| `POST /xai/score-lead` | POST | Radar lead scoring with structured output |
| `POST /xai/enrich` | POST | Enrich a lead from pasted text |
| `POST /xai/draft-outreach` | POST | Draft outreach email for a lead |
| `POST /xai/analyze-artwork` | POST | Analyze uploaded artwork image |
| `POST /xai/artist-statement` | POST | Help draft/refine artist statement |
| `POST /xai/generate-image` | POST | Generate image from text prompt |
| `POST /xai/edit-image` | POST | Edit image with text instruction |
| `POST /xai/generate-video` | POST | Generate short video from image + prompt |
| `POST /xai/web-research` | POST | Research a lead/artist via web search |

---

## 5. Feature Integrations

### 5.1 Radar — Lead Scoring & Enrichment (upgrade existing)

**Current state:** `radarScoring.js` and `radarApi.js` route through the `fusion-radar` canister, which runs `Llm.prompt(#Llama3_1_8B, ...)`. Results are functional but limited by the 8B model — scoring rationale is often generic, enrichment misses nuance, and there's no web lookup capability.

**With xAI:**

#### Lead scoring with structured output

Use Grok's structured output mode to return a consistent JSON schema every time:

```js
// Integration API: POST /xai/score-lead
const response = await xai.responses.create({
    model: 'grok-4.6',
    input: [
        {
            role: 'system',
            content: `You are a Fusion art network lead qualifier. Score this lead 0-100 on fit for a curated Japan artist residency network. Consider: artistic practice quality, Japan connection, career stage, network potential, and warm intro paths.`
        },
        { role: 'user', content: JSON.stringify(leadData) }
    ],
    text: {
        format: {
            type: 'json_schema',
            name: 'lead_score',
            schema: {
                type: 'object',
                properties: {
                    aiScore: { type: 'number', minimum: 0, maximum: 100 },
                    rationale: { type: 'string' },
                    fusionFit: { type: 'string' },
                    recommendedOpportunity: { type: 'string' },
                    bestOpeningTopic: { type: 'string' },
                    concern: { type: 'string' },
                    suggestedNextAction: { type: 'string' },
                },
                required: ['aiScore', 'rationale', 'fusionFit'],
            },
        },
    },
});
```

#### Lead enrichment from pasted text

When staff paste a bio, exhibition text, or gallery page content, Grok extracts structured lead fields:

```js
// Integration API: POST /xai/enrich
const response = await xai.responses.create({
    model: 'grok-4.6',
    input: [
        {
            role: 'system',
            content: 'Extract artist/gallery lead data from the following text. Return structured JSON with fields: name, discipline, location, website, publicEmail, instagram, representation, careerStage, japanConnection, recentActivity, notes.'
        },
        { role: 'user', content: pastedText }
    ],
    text: { format: { type: 'json_schema', name: 'enriched_lead', schema: enrichSchema } },
});
```

#### Web-powered lead research

Use Grok's built-in web search to research a lead in real-time:

```js
const response = await xai.responses.create({
    model: 'grok-4.6',
    tools: [{ type: 'web_search' }],
    input: [
        {
            role: 'user',
            content: `Research the artist "${leadName}" — find their recent exhibitions, gallery representation, Japan connections, and any upcoming shows. Return a summary useful for outreach.`
        }
    ],
});
```

### 5.2 Radar — Outreach Drafting (upgrade existing)

**Current state:** `radarOutreachComposer.js` has a full AI draft flow through `staffDraftRadarOutreach` on the `fusion-radar` canister. Drafts work but lack the depth and nuance of a larger model — the 8B model tends to produce generic art-world language.

**With xAI:**

```js
// Integration API: POST /xai/draft-outreach
const response = await xai.responses.create({
    model: 'grok-4.6',
    input: [
        {
            role: 'system',
            content: `You are writing outreach for Fusion, a curated art network in Japan. Write warm, informed, personal messages — never generic templates. Reference specific work, exhibitions, or connections. The tone is professional but human, like a curator reaching out to a peer.`
        },
        {
            role: 'user',
            content: `Draft an outreach email for:
Name: ${lead.name}
Type: ${lead.leadType}
Fit: ${lead.fusionFit}
Japan connection: ${lead.japanConnection}
Recent activity: ${lead.recentActivity}
Warm connection: ${lead.warmConnection}
Trigger: ${triggerContext}
Opening topic: ${lead.aiBestOpeningTopic}`
        }
    ],
    text: {
        format: {
            type: 'json_schema',
            name: 'outreach_draft',
            schema: {
                type: 'object',
                properties: {
                    subject: { type: 'string' },
                    body: { type: 'string' },
                    recommendedSendTiming: { type: 'string' },
                    toneNotes: { type: 'string' },
                },
                required: ['subject', 'body'],
            },
        },
    },
});
```

### 5.3 Artist Tools — Portfolio & Practice (new features)

These are new artist-facing capabilities, accessible from the member profile dashboard or settings.

#### Artwork analysis (image understanding)

Artists upload artwork images and get AI-powered analysis — technique observations, contextual references, suggested keywords for SEO, and exhibition-ready descriptions:

```js
// Integration API: POST /xai/analyze-artwork
const response = await xai.responses.create({
    model: 'grok-4.6',
    input: [
        {
            role: 'system',
            content: 'You are an informed art critic and curator. Analyze this artwork image. Describe the technique, medium, compositional choices, and emotional register. Suggest exhibition-ready description text and relevant keywords for discovery. Be specific and reference art-historical context where appropriate.'
        },
        {
            role: 'user',
            content: [
                { type: 'input_image', image_url: imageDataUrl, detail: 'high' },
                { type: 'input_text', text: artistContext || 'Analyze this artwork.' }
            ]
        }
    ],
    text: {
        format: {
            type: 'json_schema',
            name: 'artwork_analysis',
            schema: {
                type: 'object',
                properties: {
                    description: { type: 'string' },
                    technique: { type: 'string' },
                    medium: { type: 'string' },
                    keywords: { type: 'array', items: { type: 'string' } },
                    artHistoricalContext: { type: 'string' },
                    exhibitionText: { type: 'string' },
                    suggestedTitle: { type: 'string' },
                },
                required: ['description', 'technique', 'keywords', 'exhibitionText'],
            },
        },
    },
});
```

**Frontend location:** New panel in `settingsProfile.js` under the artist's portfolio section, or a dedicated "AI Studio" tab.

#### Artist statement assistant

Help artists draft, refine, or translate their artist statements:

```js
// Integration API: POST /xai/artist-statement
const response = await xai.responses.create({
    model: 'grok-4.6',
    input: [
        {
            role: 'system',
            content: `You help practicing artists refine their artist statements. The tone should be the artist's own voice — never generic art-speak. Keep it concise (150-300 words), grounded in their actual practice, and suitable for gallery submissions, residency applications, and exhibition contexts. If given a rough draft, improve clarity and flow while preserving their perspective.`
        },
        {
            role: 'user',
            content: `Artist: ${artistName}\nDiscipline: ${discipline}\nLocation: ${location}\nCurrent statement or notes:\n${draftOrNotes}\n\nTask: ${task}` // task = 'refine' | 'draft from scratch' | 'translate to Japanese'
        }
    ],
});
```

#### Application assistant

For Fusion's residency programs — help artists with their application responses:

```js
// Help structure a thoughtful program application
const response = await xai.responses.create({
    model: 'grok-4.6',
    input: [
        {
            role: 'system',
            content: 'You help artists prepare strong residency applications. Guide them to be specific about their practice, their connection to the program location, and what they hope to explore. Never write the application for them — instead, ask clarifying questions and suggest how to strengthen their own words.'
        },
        {
            role: 'user',
            content: `Program: ${programName}\nLocation: ${programLocation}\nArtist draft response:\n${draftText}\n\nGive feedback and suggestions.`
        }
    ],
});
```

### 5.4 Image Generation for Content (new)

Staff and potentially artists can generate images for programs, journal entries, and editorial content:

```js
// Integration API: POST /xai/generate-image
const response = await xai.images.generate({
    model: 'grok-imagine-image-2.0',
    prompt: imagePrompt,
    n: 1,
    size: '1024x1024',
    response_format: 'url',
});
```

**Use cases:**
- Program hero images and promotional graphics
- Journal entry illustrations
- Social media content for artist features
- Event promotional assets

#### Image editing with style transfer

Particularly powerful for Fusion — take an artist's work and generate variations, mockup exhibition installations, or create promotional materials that reference their style:

```js
// Integration API: POST /xai/edit-image
const response = await xai.images.edit({
    model: 'grok-imagine-image-2.0',
    prompt: 'Place this artwork in a minimal white-wall gallery space with natural lighting from the left',
    image: { url: artworkImageUrl, type: 'image_url' },
});
```

### 5.5 Video Generation for Programs (new)

Generate short promotional videos from program photos or artist work:

```js
// Integration API: POST /xai/generate-video
// Start async generation
const response = await fetch('https://api.x.ai/v1/videos/generations', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
    },
    body: JSON.stringify({
        model: 'grok-imagine-video-1.5',
        prompt: 'Slow pan across the ceramic studio, golden hour light filtering through windows',
        image: { url: studioPhotoUrl },
        duration: 8,
    }),
});

// Poll for completion (server-side)
const { request_id } = await response.json();
// ... poll GET /v1/videos/:request_id until status === 'done'
```

**Use cases:**
- Program teaser clips from still photos
- Artist feature videos for social
- Animated hero backgrounds for program pages
- Exhibition walkthrough previews

### 5.6 Content & SEO Tools (new)

#### Program description generation

Auto-draft multilingual program descriptions from structured data:

```js
const response = await xai.responses.create({
    model: 'grok-4.6',
    input: [
        {
            role: 'system',
            content: 'Write compelling program descriptions for a curated Japan artist residency network. Write in both English and Japanese. The English should be clear and evocative; the Japanese should be natural, not machine-translated.'
        },
        {
            role: 'user',
            content: `Program: ${programData.name}\nLocation: ${programData.location}\nSeason: ${programData.season}\nFocus: ${programData.focus}\nSlots: ${programData.totalSlots}`
        }
    ],
});
```

#### Journal entry drafting

Help staff draft journal entries from raw notes, photos, and exhibition documentation.

---

## 6. Frontend Utility — `xaiApi.js`

A thin wrapper in `src/utils/xaiApi.js` that mirrors the pattern of existing utils like `integrationApi.js`:

```js
const BASE = '/api/xai'; // proxied through Integration API

async function xaiPost(endpoint, body) {
    const res = await fetch(`${BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`xAI ${endpoint}: ${res.status}`);
    return res.json();
}

export const scoreLead = (lead) => xaiPost('/score-lead', { lead });
export const enrichLead = (text) => xaiPost('/enrich', { text });
export const draftOutreach = (lead, context) => xaiPost('/draft-outreach', { lead, context });
export const analyzeArtwork = (imageDataUrl, context) => xaiPost('/analyze-artwork', { imageDataUrl, context });
export const assistStatement = (artist, draft, task) => xaiPost('/artist-statement', { artist, draft, task });
export const generateImage = (prompt, opts) => xaiPost('/generate-image', { prompt, ...opts });
export const editImage = (imageUrl, prompt) => xaiPost('/edit-image', { imageUrl, prompt });
export const generateVideo = (imageUrl, prompt, duration) => xaiPost('/generate-video', { imageUrl, prompt, duration });
export const webResearch = (query) => xaiPost('/web-research', { query });
```

---

## 7. Implementation Phases

### Phase 1 — Foundation (1–2 weeks)

| Task | Detail |
|------|--------|
| Add `XAI_API_KEY` to Integration API `.env` | Obtain key from [console.x.ai](https://console.x.ai) |
| Install `openai` package in Integration API | `npm i openai` (already OpenAI SDK-compatible) |
| Create `routes/xai.js` with chat, score, enrich, draft endpoints | Server-side proxy routes |
| Create `src/utils/xaiApi.js` frontend wrapper | Thin fetch wrappers |
| Update `radarScoring.js` to route through xAI | Replace existing scoring with structured Grok output |
| Update `radarApi.js` enrichment to use xAI | Structured extraction from pasted text |
| Update `radarOutreachComposer.js` draft to use xAI | Better AI drafts with web search context |

### Phase 2 — Artist Tools (2–3 weeks)

| Task | Detail |
|------|--------|
| Build artwork analysis endpoint + UI | Image upload → analysis panel in profile settings |
| Build artist statement assistant | Text input → refined statement, with translation option |
| Build application assistant | Per-program draft review and feedback |
| Add image generation routes | For staff content creation in Studio |
| Add "AI Studio" tab to member settings | Central place for artist AI tools |

### Phase 3 — Content & Media (2–3 weeks)

| Task | Detail |
|------|--------|
| Image editing/style transfer for exhibitions | Mockup installations, promotional materials |
| Video generation for programs | Short clips from still program photos |
| SEO content generation | Multilingual program/page descriptions |
| Journal entry drafting assistant | Staff-facing draft tool from notes |
| Web research integration for Radar | Auto-research leads with live web data |

### Phase 4 — Advanced (ongoing)

| Task | Detail |
|------|--------|
| Function calling for agentic workflows | Model can query canister data, search leads, draft emails in a single conversation |
| Batch API for bulk scoring | Score entire lead pipelines overnight at reduced cost |
| Voice features | Audio guides for exhibition content, podcast transcription |
| Caching & cost optimization | Cache repeated queries, use `grok-4.3` for simpler tasks |

---

## 8. Cost Estimates

| Feature | Model | Est. usage | Monthly cost |
|---------|-------|-----------|-------------|
| Lead scoring (Radar) | grok-4.6 | ~200 leads/mo × ~2K tokens each | ~$2–4 |
| Lead enrichment | grok-4.6 | ~100 enrichments/mo | ~$1–2 |
| Outreach drafts | grok-4.6 | ~50 drafts/mo | ~$1 |
| Web research | grok-4.6 + web_search | ~50 researches/mo | ~$2–3 |
| Artwork analysis | grok-4.6 (vision) | ~100 images/mo | ~$3–5 |
| Artist statements | grok-4.6 | ~30 assists/mo | ~$0.50 |
| Image generation | grok-imagine-image-2.0 | ~50 images/mo | ~$2 |
| Video generation | grok-imagine-video-1.5 | ~10 videos/mo × 8s avg | ~$4 |
| **Estimated total** | | | **~$15–22/mo** |

These are early-stage estimates. Costs scale linearly with usage — the pricing is very accessible for a platform of Fusion's size.

---

## 9. Security & Access Control

| Concern | Approach |
|---------|----------|
| API key exposure | Key lives only in Integration API `.env` — never sent to browser |
| Rate limiting | Integration API enforces per-user rate limits before forwarding to xAI |
| Staff vs. member access | Radar/Studio features require `staffOrAdmin` auth; artist tools require authenticated IC principal |
| Content policy | xAI applies content moderation; Fusion can add additional filters server-side |
| Data privacy | Artist artwork and text is sent to xAI for processing — Terms of Service should disclose this; xAI does not use API data for training |
| Cost control | Set `XAI_MAX_TOKENS` and monthly budget alerts in xAI console |

---

## 10. Model Selection Guide

| Task | Recommended model | Why |
|------|-------------------|-----|
| Lead scoring, enrichment, outreach | `grok-4.6` | Best reasoning, structured output support |
| Simple text tasks (descriptions, keywords) | `grok-4.3` | Cheaper, fast, sufficient for straightforward generation |
| Artwork analysis | `grok-4.6` with vision | Image understanding requires top-tier model |
| Image generation | `grok-imagine-image-2.0` | Latest quality, $0.04/image |
| Image editing / style transfer | `grok-imagine-image-2.0` | Multi-image reference support |
| Video generation | `grok-imagine-video-1.5` | Latest video model, up to 15s |
| Web research | `grok-4.6` + `web_search` tool | Built-in search with citations |
| Batch overnight scoring | `grok-4.3` via Batch API | 50% cost reduction on batch |

---

## 11. On-Chain vs. xAI: What Stays, What Moves

Not everything needs to move to xAI. The hybrid approach keeps costs down and preserves IC-native benefits:

| Task | Stays on-chain (Llama 3.1 8B) | Moves to xAI (Grok 4.6) |
|------|------|------|
| EN→JA translation | Yes — adequate quality, zero API cost | Fallback for complex/nuanced text |
| Basic text rewrite | Yes — simple prompt rewrites work fine | No |
| New World copy generation | Consider moving — 8B sometimes produces generic output | Yes — richer, more nuanced artist copy |
| Lead scoring | No | Yes — structured output, deeper reasoning |
| Lead enrichment | No | Yes — better field extraction from messy text |
| Outreach drafting | No | Yes — warm, specific messages vs. generic templates |
| Artwork analysis | N/A (doesn't exist) | Yes — vision model |
| Image generation | N/A (doesn't exist) | Yes — Grok Imagine |
| Video generation | N/A (doesn't exist) | Yes — Grok Imagine Video |
| Web research | N/A (doesn't exist) | Yes — built-in web search |
| Artist statement assist | Could stay for simple refines | Yes for drafting from scratch |
| Application assist | N/A (doesn't exist) | Yes |

---

## 12. Summary

Fusion currently runs all AI on-chain via IC's `mo:llm` (Llama 3.1 8B) — functional for translation and basic text tasks, but limited for the kind of deep reasoning, vision, and generation that would genuinely help artists. Integrating xAI creates a **hybrid model**: lightweight tasks stay on-chain (free, no API key), while complex reasoning, vision, image/video generation, and web research route through the Integration API to Grok. All behind one API key and one SDK (OpenAI-compatible). The phased approach upgrades Radar immediately (Phase 1), then rolls out artist-facing tools (Phase 2), content generation (Phase 3), and advanced agentic features (Phase 4).

The most impactful features for artists are:
1. **Artwork analysis** — AI-powered technique analysis, keywords, and exhibition-ready descriptions
2. **Artist statement assistant** — Refine, draft, or translate statements with AI that respects the artist's voice
3. **Application assistant** — Feedback on residency application drafts
4. **Portfolio image generation** — Mockup installations, generate promotional materials

For staff:
1. **Radar scoring + enrichment** — Structured, reliable AI scoring with web research
2. **Outreach drafting** — Warm, informed messages drafted from lead context
3. **Content generation** — Program descriptions, journal entries, social media assets
4. **Video generation** — Short promotional clips from program photography
