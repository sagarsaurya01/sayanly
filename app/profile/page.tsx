'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CompanyProfile } from '@/lib/local-store'

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'inspirational', label: 'Inspirational' },
  { value: 'educational', label: 'Educational' },
  { value: 'bold', label: 'Bold' },
] as const

const PLATFORMS = [
  { value: 'linkedin', label: 'LinkedIn', icon: 'in' },
  { value: 'facebook', label: 'Facebook', icon: 'f' },
] as const

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export default function ProfilePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState<Omit<CompanyProfile, 'id' | 'created_at'>>({
    name: '',
    description: '',
    target_audience: '',
    tone: 'professional',
    brand_colors: { primary: '#7c3aed', secondary: '#6d28d9' },
    platforms: ['linkedin'],
    past_posts: '',
    competitor_posts: '',
  })

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data: { profile: CompanyProfile | null }) => {
        if (data.profile) {
          const { id: _id, created_at: _ca, ...rest } = data.profile
          setForm(rest)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  function togglePlatform(p: 'linkedin' | 'facebook') {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter((x) => x !== p)
        : [...prev.platforms, p],
    }))
  }

  async function handleSave() {
    setSaving(true)
    const profile: CompanyProfile = {
      id: generateId(),
      ...form,
      created_at: new Date().toISOString(),
    }
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    setSaving(false)
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center font-bold text-sm">S</div>
          <span className="font-semibold text-white">Sayanly</span>
        </div>
        <button onClick={handleSave} disabled={saving || !form.name} className="btn-primary">
          {saving ? 'Saving…' : 'Save & Continue'}
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12 animate-slide-up">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">Company Profile</h1>
          <p className="text-white/50 text-sm">Tell Sayanly about your brand so it can generate perfectly tailored content.</p>
        </div>

        <div className="space-y-6">
          {/* Company Name */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-white/80 text-sm uppercase tracking-widest">Brand Identity</h2>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Company Name *</label>
              <input
                className="input-glass"
                placeholder="Acme Corp"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Description *</label>
              <textarea
                className="input-glass resize-none"
                rows={3}
                placeholder="What does your company do? What problems do you solve?"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Target Audience *</label>
              <input
                className="input-glass"
                placeholder="e.g. SaaS founders, HR managers, fitness enthusiasts"
                value={form.target_audience}
                onChange={(e) => setForm((p) => ({ ...p, target_audience: e.target.value }))}
              />
            </div>
          </div>

          {/* Tone */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-white/80 text-sm uppercase tracking-widest">Brand Voice</h2>
            <div>
              <label className="block text-xs text-white/50 mb-3">Content Tone</label>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, tone: t.value }))}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      form.tone === t.value
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'border-white/[0.07] text-white/50 hover:border-white/20 hover:text-white/80'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Brand Colors */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-white/80 text-sm uppercase tracking-widest">Brand Colors</h2>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs text-white/50 mb-1.5">Primary Color</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={form.brand_colors.primary}
                    onChange={(e) => setForm((p) => ({ ...p, brand_colors: { ...p.brand_colors, primary: e.target.value } }))}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-white/10 bg-transparent"
                  />
                  <input
                    className="input-glass"
                    value={form.brand_colors.primary}
                    onChange={(e) => setForm((p) => ({ ...p, brand_colors: { ...p.brand_colors, primary: e.target.value } }))}
                    placeholder="#7c3aed"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-white/50 mb-1.5">Secondary Color</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={form.brand_colors.secondary}
                    onChange={(e) => setForm((p) => ({ ...p, brand_colors: { ...p.brand_colors, secondary: e.target.value } }))}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-white/10 bg-transparent"
                  />
                  <input
                    className="input-glass"
                    value={form.brand_colors.secondary}
                    onChange={(e) => setForm((p) => ({ ...p, brand_colors: { ...p.brand_colors, secondary: e.target.value } }))}
                    placeholder="#6d28d9"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Platforms */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-white/80 text-sm uppercase tracking-widest">Platforms</h2>
            <div className="flex gap-3">
              {PLATFORMS.map((p) => {
                const active = form.platforms.includes(p.value)
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => togglePlatform(p.value)}
                    className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border transition-all ${
                      active
                        ? 'border-purple-500 bg-purple-600/10 text-white'
                        : 'border-white/[0.07] text-white/40 hover:border-white/20 hover:text-white/60'
                    }`}
                  >
                    <span className="text-xl font-bold">{p.icon}</span>
                    <span className="text-xs font-medium">{p.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Optional content */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-white/80 text-sm uppercase tracking-widest">Context (Optional)</h2>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Past Posts</label>
              <textarea
                className="input-glass resize-none"
                rows={4}
                placeholder="Paste some of your best-performing past posts for style reference…"
                value={form.past_posts ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, past_posts: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Competitor Posts</label>
              <textarea
                className="input-glass resize-none"
                rows={4}
                placeholder="Paste competitor posts to analyze and differentiate from…"
                value={form.competitor_posts ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, competitor_posts: e.target.value }))}
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !form.name}
            className="btn-primary w-full py-3 text-base"
          >
            {saving ? 'Saving…' : 'Save Profile & Go to Dashboard'}
          </button>
        </div>
      </div>
    </div>
  )
}
