'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CompanyProfile, Topic, Post, Week } from '@/lib/local-store'

type Step = 1 | 2 | 3

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function getWeekLabel(weekNumber: number) {
  const now = new Date()
  const month = now.toLocaleString('default', { month: 'long' })
  const day = now.getDate()
  return `Week ${weekNumber} — ${month} ${day}, ${now.getFullYear()}`
}

const PLATFORM_COLORS: Record<string, string> = {
  LinkedIn: 'platform-linkedin',
  Facebook: 'platform-facebook',
}

const GRAPHIC_TYPE_STYLES: Record<string, string> = {
  'Carousel':       'border-purple-500/30 text-purple-300 bg-purple-500/10',
  'Infographic':    'border-blue-500/30 text-blue-300 bg-blue-500/10',
  'Cheat Sheet':    'border-emerald-500/30 text-emerald-300 bg-emerald-500/10',
  'Static Graphic': 'border-amber-500/30 text-amber-300 bg-amber-500/10',
}

const GRAPHIC_TYPE_ICONS: Record<string, string> = {
  'Carousel':       '🎠',
  'Infographic':    '📊',
  'Cheat Sheet':    '📋',
  'Static Graphic': '🖼️',
}

export default function NewWeekPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [generating, setGenerating] = useState(false)
  const [generatingPosts, setGeneratingPosts] = useState(false)
  const [error, setError] = useState('')
  const [customTopic, setCustomTopic] = useState('')
  const [researchingCustom, setResearchingCustom] = useState(false)

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data: { profile: CompanyProfile | null }) => {
        setProfile(data.profile)
      })
  }, [])

  async function handleResearchTopics() {
    if (!profile) return
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          past_posts: profile.past_posts,
          competitor_posts: profile.competitor_posts,
        }),
      })
      const data = await res.json() as { topics?: Topic[]; error?: string }
      if (data.topics) {
        setTopics(data.topics)
        setStep(2)
      } else {
        setError(data.error ?? 'Failed to generate topics')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleGeneratePosts() {
    if (!profile) return
    setGeneratingPosts(true)
    setError('')
    try {
      const approvedTopics = topics.filter(t => t.approved)
      if (approvedTopics.length === 0) {
        setError('Please approve at least one topic')
        setGeneratingPosts(false)
        return
      }

      // Generate 1 topic at a time — safest for Netlify 10s function limit
      const allPosts: Post[] = []
      for (const topic of approvedTopics) {
        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile, topics: [{ ...topic, approved: true }] }),
        })
        if (!res.ok) {
          setError(`Server error (${res.status}) — try reducing topics selected`)
          setGeneratingPosts(false)
          return
        }
        const text = await res.text()
        let data: { posts?: Post[]; error?: string }
        try {
          data = JSON.parse(text)
        } catch {
          setError(`Server returned invalid response — please try again`)
          setGeneratingPosts(false)
          return
        }
        if (!data.posts) {
          setError(`Error: ${data.error ?? 'No posts returned'}`)
          setGeneratingPosts(false)
          return
        }
        allPosts.push(...data.posts)
      }

      // Get week count for label
      let weekNumber = 1
      try {
        const existing = JSON.parse(localStorage.getItem('sayanly_weeks') ?? '[]') as Week[]
        weekNumber = existing.length + 1
      } catch { weekNumber = 1 }

      const week: Week = {
        id: generateId(),
        profile_id: profile.id,
        week_label: getWeekLabel(weekNumber),
        created_at: new Date().toISOString(),
        topics,
        posts: allPosts,
        graphics: [],
        status: allPosts.length > 0 ? 'complete' : 'draft',
      }

      // Save to localStorage
      try {
        const existing = JSON.parse(localStorage.getItem('sayanly_weeks') ?? '[]') as Week[]
        existing.unshift(week)
        localStorage.setItem('sayanly_weeks', JSON.stringify(existing))
      } catch { /* ignore */ }

      // Also try server save (silent fail on Netlify)
      try {
        await fetch('/api/weeks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(week),
        })
      } catch { /* ignore */ }

      router.push(`/week/${week.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate posts'
      setError(msg)
      setGeneratingPosts(false)
    }
  }

  function toggleApprove(id: string) {
    setTopics((prev) =>
      prev.map((t) => (t.id === id ? { ...t, approved: !t.approved } : t))
    )
  }

  function updateTitle(id: string, title: string) {
    setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)))
  }

  const approvedCount = topics.filter((t) => t.approved).length

  async function handleResearchCustomTopic() {
    if (!profile || topics.length === 0) return
    setResearchingCustom(true)
    setError('')
    try {
      const res = await fetch('/api/research-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, topic_title: topics[0].title }),
      })
      const data = await res.json() as { topic?: Topic; error?: string }
      if (data.topic) {
        setTopics([{ ...data.topic, id: topics[0].id, approved: true }])
        setStep(2)
      } else {
        setError(data.error ?? 'Research failed')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setResearchingCustom(false)
    }
  }

  function addCustomTopic() {
    if (!customTopic.trim()) return
    const newTopic: Topic = {
      id: generateId(),
      title: customTopic.trim(),
      reasoning: 'Custom topic added by you — posts will be written to match your company profile.',
      best_platform: 'LinkedIn',
      format: 'Custom',
      graphic_type: 'Static Graphic',
      approved: true,
    }
    setTopics((prev) => [...prev, newTopic])
    setCustomTopic('')
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-8 py-5 flex items-center gap-4">
        <button
          onClick={() => router.push('/dashboard')}
          className="p-2 rounded-lg hover:bg-white/[0.04] text-white/40 hover:text-white/70 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-xs">S</div>
          <span className="font-semibold text-white">New Week</span>
        </div>

        {/* Step indicator */}
        <div className="ml-auto flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s ? 'bg-orange-600 text-white' : step > s ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.05] text-white/30'
              }`}>
                {step > s ? '✓' : s}
              </div>
              {s < 3 && <div className={`w-8 h-px ${step > s ? 'bg-emerald-500/40' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Step 1: Profile Summary */}
        {step === 1 && (
          <div className="animate-slide-up">
            <h1 className="text-2xl font-bold mb-2">Ready to create content?</h1>
            <p className="text-white/50 text-sm mb-8">Review your profile, then let Sayanly research trending topics for your brand.</p>

            {!profile ? (
              <div className="glass rounded-xl p-8 text-center">
                <p className="text-white/50 mb-4">No company profile found.</p>
                <button onClick={() => router.push('/profile')} className="btn-primary">
                  Set Up Profile
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="glass rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-white">{profile.name}</h2>
                      <p className="text-white/50 text-sm mt-1">{profile.description}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-orange-600/10 border border-orange-500/20 text-orange-400 text-xs font-medium capitalize">
                      {profile.tone}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Audience</p>
                      <p className="text-white/70">{profile.target_audience}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Platforms</p>
                      <div className="flex gap-2 flex-wrap">
                        {profile.platforms.map((p) => (
                          <span key={p} className={`px-2 py-0.5 rounded-full text-xs font-medium border platform-${p}`}>
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Brand Colors</p>
                      <div className="flex gap-2 items-center">
                        <div className="w-4 h-4 rounded-full border border-white/20" style={{ background: profile.brand_colors.primary }} />
                        <div className="w-4 h-4 rounded-full border border-white/20" style={{ background: profile.brand_colors.secondary }} />
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Own topic input — goes straight to post generation */}
                <div className="rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] p-5">
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Have a topic in mind? Add it directly</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addCustomTopic()
                        }
                      }}
                      placeholder="e.g. Why 95% of traders lose money in F&O"
                      className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-orange-500/40 transition-colors"
                    />
                    <button
                      onClick={addCustomTopic}
                      disabled={!customTopic.trim()}
                      className="px-4 py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white/60 text-sm font-semibold hover:bg-white/[0.1] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                    >
                      + Add
                    </button>
                  </div>

                  {/* Topics added so far */}
                  {topics.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {topics.map((t) => (
                        <div key={t.id} className="flex items-center justify-between gap-3 bg-orange-600/10 border border-orange-500/20 rounded-lg px-3 py-2">
                          <span className="text-sm text-white/80 flex-1">{t.title}</span>
                          <button
                            onClick={() => setTopics((prev) => prev.filter((x) => x.id !== t.id))}
                            className="text-white/30 hover:text-red-400 transition-colors text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={handleResearchCustomTopic}
                        disabled={researchingCustom}
                        className="btn-primary w-full py-2.5 text-sm mt-2 disabled:opacity-50"
                      >
                        {researchingCustom ? (
                          <>
                            <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            Researching topic…
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Research This Topic →
                          </>
                        )}
                      </button>
                      {researchingCustom && (
                        <p className="text-center text-xs text-white/40 animate-pulse">
                          Finding best angle + hook + format for your topic…
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-white/20 text-xs uppercase tracking-wider">or</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>

                <button
                  onClick={handleResearchTopics}
                  disabled={generating}
                  className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2 rounded-2xl"
                >
                  {generating ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Researching topics…
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Let AI Research Topics
                    </>
                  )}
                </button>

                {generating && (
                  <p className="text-center text-xs text-white/40 animate-pulse">
                    Searching trends + competitor analysis + AI strategy…
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Topics */}
        {step === 2 && (
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold mb-1">Your {topics.length} Topics</h1>
                <p className="text-white/50 text-sm">Approve topics you want posts generated for. Edit titles inline or add your own.</p>
              </div>
              <button
                onClick={handleGeneratePosts}
                disabled={approvedCount === 0 || generatingPosts}
                className="btn-primary px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"
              >
                {generatingPosts ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0" />
                    Generating…
                  </>
                ) : (
                  <>Generate Posts ({approvedCount})</>
                )}
              </button>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {generatingPosts && (
              <div className="mb-6 px-4 py-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-300 text-sm text-center animate-pulse">
                Writing {approvedCount * 3} posts across all platforms… This may take 30–60 seconds.
              </div>
            )}

            <div className="space-y-3">
              {topics.map((topic, i) => (
                <div
                  key={topic.id}
                  className={`glass rounded-xl p-5 transition-all ${
                    topic.approved ? 'border-orange-500/30 bg-orange-500/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-white/20 text-sm font-mono mt-1 shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <input
                        className="w-full bg-transparent text-white font-semibold text-base border-none outline-none focus:text-orange-300 transition-colors placeholder-white/30"
                        value={topic.title}
                        onChange={(e) => updateTitle(topic.id, e.target.value)}
                      />
                      <p className="text-white/50 text-sm mt-1 leading-relaxed">{topic.reasoning}</p>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${PLATFORM_COLORS[topic.best_platform] ?? 'border-white/10 text-white/40'}`}>
                          {topic.best_platform}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium border border-white/[0.07] text-white/40">
                          {topic.format}
                        </span>
                        {topic.graphic_type && (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${GRAPHIC_TYPE_STYLES[topic.graphic_type] ?? 'border-white/10 text-white/40'}`}>
                            {GRAPHIC_TYPE_ICONS[topic.graphic_type]} {topic.graphic_type}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleApprove(topic.id)}
                      className={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                        topic.approved
                          ? 'bg-orange-600 border-orange-500 text-white'
                          : 'border-white/[0.07] text-white/20 hover:border-white/20 hover:text-white/40'
                      }`}
                    >
                      {topic.approved ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom topic input */}
            <div className="mt-6 p-4 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02]">
              <p className="text-xs text-white/40 mb-3 uppercase tracking-wider">Add your own topic</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomTopic()}
                  placeholder="Type a topic idea and press Enter…"
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-orange-500/40 transition-colors"
                />
                <button
                  onClick={addCustomTopic}
                  disabled={!customTopic.trim()}
                  className="px-4 py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white/60 text-sm font-semibold hover:bg-white/[0.1] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  + Add
                </button>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleGeneratePosts}
                disabled={approvedCount === 0 || generatingPosts}
                className="btn-primary py-3 px-8 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
              >
                {generatingPosts ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0" />
                    Writing posts…
                  </>
                ) : (
                  `Generate Posts for ${approvedCount} Topic${approvedCount !== 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
