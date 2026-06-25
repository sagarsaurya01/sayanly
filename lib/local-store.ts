import fs from 'fs'
import path from 'path'

// ── Types ──────────────────────────────────────────────────────────────────

export type CompanyProfile = {
  id: string
  name: string
  description: string
  target_audience: string
  tone: 'professional' | 'casual' | 'inspirational' | 'educational' | 'bold'
  brand_colors: { primary: string; secondary: string; palette?: string[] }
  platforms: ('linkedin' | 'facebook')[]
  past_posts?: string
  competitor_posts?: string
  created_at: string
}

export type GraphicType = 'Carousel' | 'Infographic' | 'Cheat Sheet' | 'Static Graphic'

export type Topic = {
  id: string
  title: string
  reasoning: string
  best_platform: string
  format: string
  graphic_type: GraphicType
  approved: boolean
}

export type Post = {
  topic_id: string
  linkedin: { hook: string; body: string; cta: string; hashtags: string[]; first_comment: string }
  facebook: { hook: string; body: string; cta: string; hashtags: string[]; first_comment: string }
}

export type Graphic = {
  topic_id: string
  platform: string
  image_url: string
  prompt: string
  structural_prompt?: string
  slides?: string[]  // carousel slide image URLs (only when graphic_type === 'Carousel')
}

export type Week = {
  id: string
  profile_id: string
  week_label: string
  created_at: string
  topics: Topic[]
  posts: Post[]
  graphics: Graphic[]
  status: 'draft' | 'complete'
}

type Store = {
  profile?: CompanyProfile
  weeks: Week[]
}

// ── Storage helpers ────────────────────────────────────────────────────────

const DATA_FILE = path.join(process.cwd(), 'data', 'sayanly.json')

function readStore(): Store {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8').trim()
    if (!raw || raw === '[]') return { weeks: [] }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return { weeks: [] }
    return parsed as Store
  } catch {
    return { weeks: [] }
  }
}

function writeStore(store: Store): void {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8')
  } catch {
    // Silently fail on read-only filesystems (e.g. Netlify)
  }
}

// ── Profile ────────────────────────────────────────────────────────────────

export function getProfile(): CompanyProfile | null {
  const store = readStore()
  return store.profile ?? null
}

export function saveProfile(profile: CompanyProfile): void {
  const store = readStore()
  store.profile = profile
  writeStore(store)
}

// ── Weeks ──────────────────────────────────────────────────────────────────

export function getAllWeeks(): Week[] {
  const store = readStore()
  return store.weeks ?? []
}

export function getWeek(id: string): Week | null {
  const store = readStore()
  return store.weeks.find((w) => w.id === id) ?? null
}

export function saveWeek(week: Week): void {
  const store = readStore()
  store.weeks = store.weeks.filter((w) => w.id !== week.id)
  store.weeks.unshift(week)
  writeStore(store)
}

export function updateWeek(id: string, updates: Partial<Week>): Week | null {
  const store = readStore()
  const idx = store.weeks.findIndex((w) => w.id === id)
  if (idx === -1) return null
  store.weeks[idx] = { ...store.weeks[idx], ...updates }
  writeStore(store)
  return store.weeks[idx]
}

export function deleteWeek(id: string): void {
  const store = readStore()
  store.weeks = store.weeks.filter((w) => w.id !== id)
  writeStore(store)
}
