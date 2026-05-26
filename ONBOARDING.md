# Sayanly — Session Starter

> AI-powered weekly social media content factory for any business.  
> Company profile → topic research → 7 posts × 3 platforms → generated graphics → export.

---

## Project Status

**Phase 1 — Not started yet.**  
PRD is finalized. Ready to build.

---

## What Sayanly Does

1. Company fills profile once (name, niche, colors, tone, competitors)
2. System researches 7 topics using 4 methods: Claude knowledge + competitor analysis + Tavily web search + user's past posts
3. Generates full posts for each topic × 3 platforms (LinkedIn, Facebook, Instagram)
4. Generates actual graphics using Ideogram API
5. Saves every week to history
6. Poster Cloner: upload any graphic → Claude analyzes it → Ideogram recreates with user's branding

---

## API Keys Needed

```
ANTHROPIC_API_KEY=        # Claude posts + Vision analysis
TAVILY_API_KEY=           # Real-time topic research
IDEOGRAM_API_KEY=         # Graphic generation
```

---

## Planned Structure

```
sayanly/
├── app/
│   ├── api/
│   │   ├── profile/route.ts          # Save/get company profile
│   │   ├── topics/route.ts           # Topic research (Claude + Tavily)
│   │   ├── posts/route.ts            # Generate 7 × 3 platform posts
│   │   ├── graphics/route.ts         # Ideogram image generation
│   │   ├── poster-clone/route.ts     # Claude Vision + Ideogram clone
│   │   └── weeks/route.ts            # Save/get week history
│   ├── profile/page.tsx              # Company profile setup
│   ├── dashboard/page.tsx            # Saved weeks + sidebar
│   ├── week/
│   │   ├── new/page.tsx              # Topic research + approval
│   │   └── [id]/page.tsx            # Posts + Graphics + Export tabs
│   ├── poster-cloner/page.tsx        # Poster upload + clone tool
│   ├── globals.css                   # Same design system as Noor Studio
│   └── layout.tsx
├── lib/
│   └── local-store.ts               # JSON storage
├── data/
│   └── sayanly.json                 # All data
├── public/
│   └── generated/[weekId]/          # Generated graphics
├── PRD.md                           # Full product spec
├── ONBOARDING.md                    # This file
└── start.bat                        # Start dev server with API keys
```

---

## What Needs to Be Built

### Phase 1 — MVP
- [ ] Next.js project setup
- [ ] Company profile page + local storage
- [ ] Topic research API (Claude + Tavily)
- [ ] Topic approval UI
- [ ] Post generator API (3 platforms × 7 topics)
- [ ] Post display + inline editing
- [ ] Graphic generator API (Ideogram)
- [ ] Graphics gallery + download
- [ ] Week history (local JSON)
- [ ] PDF export
- [ ] Dashboard

### Phase 2 — Poster Cloner
- [ ] Image upload UI
- [ ] Claude Vision analysis API
- [ ] Ideogram recreation
- [ ] Designer brief text output

### Phase 3 — Polish
- [ ] Regenerate individual posts
- [ ] Regenerate individual graphics
- [ ] Duplicate past week

### Phase 4 — Cloud
- [ ] Supabase DB
- [ ] Auth
- [ ] Multi-profile support

---

## Design System

Same as Noor Studio — copy globals.css and layout.tsx as starting point:
- Black background
- Glass cards
- Purple accent #7c3aed
- Geist font
- Noise texture

Platform color coding:
- LinkedIn: `#0077B5`
- Facebook: `#1877F2`
- Instagram: gradient `#E1306C → #F77737`

---

## Data Model

See PRD.md for full TypeScript types.

Key entities:
- `CompanyProfile` — saved once, used for all weeks
- `Week` — contains topics + posts + graphics
- `PosterClone` — separate tool, own history
