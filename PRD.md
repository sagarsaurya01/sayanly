# Sayanly — Product Requirements Document

> AI-powered weekly social media content factory for any business.  
> One company profile → 7 days of posts + graphics across LinkedIn, Facebook, and Instagram.

---

## Vision

Sayanly eliminates the weekly content grind for businesses and agencies. A company enters their profile once, and Sayanly researches trending topics, writes platform-optimized posts, and generates ready-to-post graphics — for a full week — in minutes.

---

## Target User

- Small business owners who manage their own social media
- Marketing managers at SMEs
- Social media agencies managing multiple client accounts
- Solo consultants and personal brands (like Sayan's clients)

---

## Platforms Supported

- LinkedIn
- Facebook
- Instagram

---

## Core Features

---

### 1. Company Profile

User sets up their profile once. Saved for all future weeks.

**Fields:**
- Company name
- What the company does (1-2 sentences)
- Target audience (who they sell to)
- Tone of voice (Professional / Casual / Inspirational / Educational / Bold)
- Brand colors (primary + secondary — hex codes or color picker)
- Logo upload (optional — for graphic generation)
- Platforms (LinkedIn / Facebook / Instagram — multi-select)
- Past posts (optional paste — helps Claude match existing style)
- Competitor posts (optional paste — helps Claude find content gaps)

---

### 2. Topic Research Engine (4-method hybrid)

When user starts a new week, system researches and suggests 7 topics.

**Method 1 — Claude's Industry Knowledge**
Claude uses its training knowledge about the company's industry to suggest evergreen and trending topics.

**Method 2 — Competitor Analysis**
If user pasted competitor posts in profile, Claude analyzes patterns, finds gaps, and suggests topics competitors haven't covered well.

**Method 3 — Web Search (Tavily API)**
Real-time search for trending topics in the company's niche on LinkedIn/Google this week. Pulls current conversations and pain points.

**Method 4 — User's Own Context**
Claude analyzes user's past posts (if provided) to avoid repetition and build on what's already working.

**Output per topic:**
- Topic title
- Why this will perform this week (1 sentence reasoning)
- Best platform for this topic (LinkedIn / FB / Instagram / All)
- Suggested post format (Story / List / Opinion / Stat / Question)

User can approve, swap, or type their own topics before proceeding.

---

### 3. Weekly Post Generator

For each of the 7 approved topics → generates 3 platform-specific versions.

**Per post output:**
- **LinkedIn version** — professional tone, longer form, insight-driven, ends with question
- **Facebook version** — conversational, community feel, shorter
- **Instagram version** — punchy caption, emoji-friendly, strong CTA

**Post structure (each version):**
- Hook (first line — scroll stopper)
- Body (2-4 sentences or bullet points)
- CTA (what to do next)
- Hashtags (15 relevant, platform-specific)
- First comment (10 niche hashtags for reach boost)

User can edit any post inline before generating graphics.

---

### 4. Graphic Generator

For each post → generates an actual graphic image using **Ideogram API**.

**Process:**
1. Claude writes a detailed image generation prompt based on:
   - Post topic and hook text
   - Company brand colors
   - Platform dimensions (LinkedIn 1200x627 / Instagram 1080x1080 / FB 1200x630)
   - Professional social media graphic style
2. Ideogram API generates the actual image
3. User can regenerate if not satisfied
4. User downloads ready-to-post image

**Output per post:**
- 1 generated graphic (platform-specific dimensions)
- The prompt used (so user can tweak in Ideogram/Midjourney manually)
- Download button

---

### 5. Poster Cloner

User uploads any graphic/poster they like → system recreates it with their brand.

**Process:**
1. User uploads reference image (JPG/PNG)
2. Claude Vision analyzes:
   - Layout and composition
   - Color usage and placement
   - Text hierarchy and placement
   - Visual style (minimal / bold / gradient / photography-based)
   - Font style (serif / sans-serif / display)
3. Claude writes a detailed recreation prompt using user's brand colors + company details
4. Ideogram generates the cloned graphic with user's branding
5. Both outputs delivered:
   - **Generated image** (Ideogram)
   - **Designer brief** (text — layout description, dimensions, colors, fonts, copy placement)

---

### 6. History & Saved Weeks

- Every generated week is saved with date, topics, posts, and graphics
- User can revisit any past week
- Can duplicate a past week and regenerate with fresh topics
- Export full week as PDF (all posts + prompts)

---

## User Flow

```
1. Setup company profile (one time)
         ↓
2. Start new week → system researches 7 topics
         ↓
3. User reviews + approves/edits topics
         ↓
4. System generates 3 platform versions per post (21 posts total)
         ↓
5. User reviews posts, edits inline if needed
         ↓
6. System generates graphics for each post (Ideogram)
         ↓
7. User downloads posts + graphics
         ↓
8. Week saved to history
```

**Poster Cloner is a separate tool — accessible from sidebar anytime.**

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 16, App Router, Turbopack |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + Geist font |
| AI (posts + prompts) | Anthropic `claude-sonnet-4-6` |
| AI (image analysis) | Claude Vision (same API, multimodal) |
| Web search | Tavily API |
| Image generation | Ideogram API |
| Storage | Local JSON (Phase 1) → Supabase (Phase 2) |
| PDF export | jsPDF |

---

## API Keys Required

| Service | Purpose | Cost |
|---|---|---|
| Anthropic | Post writing + image analysis | Pay per token |
| Tavily | Real-time topic research | Free tier: 1000 searches/month |
| Ideogram | Graphic generation | Free tier available |

---

## Pages / Screens

```
sayanly/
├── /                        # Landing / onboarding
├── /profile                 # Company profile setup + edit
├── /dashboard               # All saved weeks + stats sidebar
├── /week/new                # Start new week (topic research)
├── /week/[id]               # Week detail — posts + graphics tabs
│   ├── Tab: Posts           # 7 topics × 3 platforms
│   ├── Tab: Graphics        # Generated images per post
│   └── Tab: Export          # PDF download, copy all
└── /poster-cloner           # Upload poster → clone with brand
```

---

## Data Model

```typescript
type CompanyProfile = {
  id: string
  name: string
  description: string
  target_audience: string
  tone: 'professional' | 'casual' | 'inspirational' | 'educational' | 'bold'
  brand_colors: { primary: string; secondary: string }
  logo_url?: string
  platforms: ('linkedin' | 'facebook' | 'instagram')[]
  past_posts?: string
  competitor_posts?: string
  created_at: string
}

type Topic = {
  id: string
  title: string
  reasoning: string
  best_platform: string
  format: string
  approved: boolean
}

type Post = {
  topic_id: string
  linkedin: { hook: string; body: string; cta: string; hashtags: string[]; first_comment: string }
  facebook: { hook: string; body: string; cta: string; hashtags: string[]; first_comment: string }
  instagram: { hook: string; body: string; cta: string; hashtags: string[]; first_comment: string }
}

type Graphic = {
  topic_id: string
  platform: string
  image_url: string
  prompt: string
  designer_brief?: string
}

type Week = {
  id: string
  profile_id: string
  created_at: string
  topics: Topic[]
  posts: Post[]
  graphics: Graphic[]
  status: 'draft' | 'complete'
}

type PosterClone = {
  id: string
  reference_image_url: string
  generated_image_url: string
  prompt: string
  designer_brief: string
  created_at: string
}
```

---

## Phases

### Phase 1 — Local MVP
- [ ] Company profile setup
- [ ] Topic research (Claude + Tavily)
- [ ] 7-day post generator (3 platforms)
- [ ] Graphic generator (Ideogram)
- [ ] History saving (local JSON)
- [ ] PDF export

### Phase 2 — Poster Cloner
- [ ] Image upload
- [ ] Claude Vision analysis
- [ ] Ideogram recreation
- [ ] Designer brief output

### Phase 3 — Polish
- [ ] Inline post editing
- [ ] Regenerate individual posts
- [ ] Regenerate individual graphics
- [ ] Duplicate past week

### Phase 4 — Cloud
- [ ] Supabase storage
- [ ] Multi-company profiles
- [ ] User authentication

---

## Design Direction

Same premium dark aesthetic as Noor Studio:
- Black background (`#000`)
- Glass cards with subtle borders
- Purple accent (`#7c3aed`)
- Geist font
- Noise texture overlay
- Platform color coding: LinkedIn blue / Facebook blue / Instagram gradient

---

## Known Constraints

- Ideogram API free tier has generation limits — add usage counter
- Claude Vision requires image to be base64 encoded or URL accessible
- Tavily free tier: 1000 searches/month — cache topic results per session
- Local JSON storage means single machine only in Phase 1
