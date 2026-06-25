'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { Week, Post, Graphic, Topic, CompanyProfile } from '@/lib/local-store'
import { toast } from 'sonner'

// ── Platform icons ──────────────────────────────────────────────────────────

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const PLATFORM_META = {
  linkedin: {
    label: 'LinkedIn',
    icon: LinkedInIcon,
    colorClass: 'platform-linkedin',
    headerBg: 'bg-[#0077B5]/10 border-[#0077B5]/30',
    textColor: 'text-[#0ea5e9]',
  },
  facebook: {
    label: 'Facebook',
    icon: FacebookIcon,
    colorClass: 'platform-facebook',
    headerBg: 'bg-[#1877F2]/10 border-[#1877F2]/30',
    textColor: 'text-[#60a5fa]',
  },
}

type PlatformKey = 'linkedin' | 'facebook'
type TabKey = 'posts' | 'graphics' | 'export'

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="btn-ghost text-xs px-3 py-1.5">
      {copied ? '✓ Copied' : label ?? 'Copy'}
    </button>
  )
}

// ── Post Card ────────────────────────────────────────────────────────────────

function PlatformPostCard({ platform, post }: { platform: PlatformKey; post: Post }) {
  const meta = PLATFORM_META[platform]
  const Icon = meta.icon
  const pData = post[platform]

  const fullText = `${pData.hook}\n\n${pData.body}\n\n${pData.cta}\n\n${pData.hashtags.map((h) => `#${h}`).join(' ')}`

  return (
    <div className={`glass rounded-xl overflow-hidden border ${meta.headerBg}`}>
      {/* Platform header */}
      <div className={`flex items-center gap-2.5 px-5 py-3 border-b ${meta.headerBg}`}>
        <Icon className={`w-4 h-4 ${meta.textColor}`} />
        <span className={`text-sm font-semibold ${meta.textColor}`}>{meta.label}</span>
        <div className="ml-auto">
          <CopyButton text={fullText} />
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        <div>
          <p className="text-xs text-white/30 uppercase tracking-widest mb-1.5">Hook</p>
          <p className="text-white/90 text-sm font-medium leading-relaxed">{pData.hook}</p>
        </div>
        <div>
          <p className="text-xs text-white/30 uppercase tracking-widest mb-1.5">Body</p>
          <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">{pData.body}</p>
        </div>
        <div>
          <p className="text-xs text-white/30 uppercase tracking-widest mb-1.5">CTA</p>
          <p className="text-white/80 text-sm italic">{pData.cta}</p>
        </div>
        <div>
          <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Hashtags</p>
          <div className="flex flex-wrap gap-1.5">
            {pData.hashtags.map((tag, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-white/[0.04] border border-white/[0.07] text-white/50">
                #{tag}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-white/30 uppercase tracking-widest mb-1.5">First Comment</p>
          <p className="text-white/60 text-sm border-l-2 border-white/10 pl-3">{pData.first_comment}</p>
        </div>
      </div>
    </div>
  )
}

// ── Posts Tab ────────────────────────────────────────────────────────────────

function PostsTab({ week }: { week: Week }) {
  const [filter, setFilter] = useState<'all' | PlatformKey>('all')

  const platforms: PlatformKey[] = ['linkedin', 'facebook']

  return (
    <div>
      {/* Platform filter */}
      <div className="flex gap-2 mb-8">
        {(['all', ...platforms] as const).map((p) => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              filter === p
                ? 'bg-orange-600 border-orange-500 text-white'
                : 'border-white/[0.07] text-white/50 hover:border-white/20 hover:text-white/70'
            }`}
          >
            {p === 'all' ? 'All Platforms' : PLATFORM_META[p].label}
          </button>
        ))}
      </div>

      <div className="space-y-10">
        {week.topics.map((topic) => {
          const post = week.posts.find((p) => p.topic_id === topic.id)
          if (!post) return null
          const visiblePlatforms = filter === 'all' ? platforms : [filter]

          return (
            <div key={topic.id}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 rounded-full bg-orange-600/20 border border-orange-500/20 flex items-center justify-center text-xs text-orange-400 font-bold">
                  {topic.id}
                </div>
                <h3 className="font-semibold text-white">{topic.title}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs border ${
                  PLATFORM_META[topic.best_platform.toLowerCase() as PlatformKey]?.colorClass ?? 'border-white/10 text-white/40'
                }`}>
                  {topic.best_platform}
                </span>
              </div>
              <div className={`grid gap-4 ${visiblePlatforms.length > 1 ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 max-w-xl'}`}>
                {visiblePlatforms.map((platform) => (
                  <PlatformPostCard key={platform} platform={platform} post={post} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Carousel Viewer ───────────────────────────────────────────────────────────

function CarouselViewer({ slides, title, onDownload }: { slides: string[]; title: string; onDownload: (url: string, name: string) => void }) {
  const [current, setCurrent] = useState(0)
  const labels = ['Cover', 'Slide 2', 'Slide 3', 'CTA']
  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={slides[current]} alt={`${title} — ${labels[current]}`} className="w-full h-full object-cover" />
      {/* Slide nav */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 py-2 bg-black/60 backdrop-blur-sm">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition-all"
        >
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} className={`transition-all rounded-full ${i === current ? 'w-4 h-1.5 bg-orange-400' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'}`} />
          ))}
        </div>
        <button
          onClick={() => setCurrent((c) => Math.min(slides.length - 1, c + 1))}
          disabled={current === slides.length - 1}
          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition-all"
        >
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      {/* Slide label */}
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-[10px] text-white/70 font-medium">
        {labels[current] ?? `Slide ${current + 1}`} · {current + 1}/{slides.length}
      </div>
      {/* Download current slide */}
      <button
        onClick={() => onDownload(slides[current], `${title.slice(0, 25)}-${labels[current] ?? current + 1}.jpg`)}
        className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-[10px] text-white/70 hover:text-white font-medium transition-colors"
      >
        ↓ Save slide
      </button>
    </div>
  )
}

// ── Graphics Tab ─────────────────────────────────────────────────────────────

type PromptResult = { isCarousel: boolean; slide_prompts?: string[]; image_prompt?: string; structural_prompt?: string }

function GraphicsTab({ week, onGraphicsUpdate }: { week: Week; onGraphicsUpdate: (g: Graphic[]) => void }) {
  const [graphics, setGraphics] = useState<Graphic[]>(week.graphics ?? [])
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [promptsModal, setPromptsModal] = useState<{ topic: Topic; result: PromptResult } | null>(null)
  const [promptLoadingIds, setPromptLoadingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data: { profile: CompanyProfile | null }) => setProfile(data.profile))
  }, [])

  async function downloadImage(url: string, filename: string) {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank')
    }
  }

  async function generateGraphic(topic: Topic) {
    const post = week.posts.find((p) => p.topic_id === topic.id)
    if (!post) return

    setErrors((prev) => { const next = { ...prev }; delete next[topic.id]; return next })
    setLoadingIds((prev) => new Set([...prev, topic.id]))
    try {
      const res = await fetch('/api/graphics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: profile ?? { name: week.profile_id, description: topic.title, brand_colors: { primary: '#ff6b35', secondary: '#e8551f' } },
          topic,
          post,
        }),
      })
      const data = await res.json() as { image_url?: string; prompt?: string; structural_prompt?: string; slides?: string[]; error?: string }
      if (!res.ok || !data.image_url) {
        setErrors((prev) => ({ ...prev, [topic.id]: data.error ?? 'Image generation failed' }))
        return
      }
      const newGraphic: Graphic = {
        topic_id: topic.id,
        platform: topic.best_platform,
        image_url: data.image_url,
        prompt: data.prompt ?? '',
        structural_prompt: data.structural_prompt ?? '',
        slides: data.slides,
      }
      const updated = [...graphics.filter((g) => g.topic_id !== topic.id), newGraphic]
      setGraphics(updated)
      onGraphicsUpdate(updated)

      await fetch(`/api/weeks/${week.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graphics: updated }),
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error'
      setErrors((prev) => ({ ...prev, [topic.id]: msg }))
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(topic.id)
        return next
      })
    }
  }

  async function generateAll() {
    for (const topic of week.topics) {
      await generateGraphic(topic)
    }
  }

  async function generatePrompts(topic: Topic) {
    const post = week.posts.find((p) => p.topic_id === topic.id)
    if (!post || !profile) return
    setPromptLoadingIds((prev) => new Set([...prev, topic.id]))
    try {
      const res = await fetch('/api/graphics-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, topic, post }),
      })
      const data = await res.json() as PromptResult & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setPromptsModal({ topic, result: data })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Prompt generation failed')
    } finally {
      setPromptLoadingIds((prev) => { const next = new Set(prev); next.delete(topic.id); return next })
    }
  }

  function togglePrompt(id: string) {
    setExpandedPrompts((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <p className="text-white/50 text-sm">{graphics.length}/{week.topics.length} graphics generated</p>
        <button
          onClick={generateAll}
          disabled={loadingIds.size > 0}
          className="btn-primary whitespace-nowrap"
        >
          {loadingIds.size > 0 ? (
            <>
              <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0" />
              Generating ({loadingIds.size} remaining)…
            </>
          ) : (
            'Generate All Graphics'
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {week.topics.map((topic) => {
          const graphic = graphics.find((g) => g.topic_id === topic.id)
          const isLoading = loadingIds.has(topic.id)
          const promptExpanded = expandedPrompts.has(topic.id)

          return (
            <div key={topic.id} className="glass rounded-xl overflow-hidden">
              {/* Image area */}
              <div className="aspect-[1200/630] bg-white/[0.02] relative">
                {isLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 shimmer">
                    <div className="h-8 w-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                    <p className="text-xs text-white/40">Generating with DALL·E 3… (~20s)</p>
                  </div>
                )}
                {graphic && !isLoading && (
                  topic.graphic_type === 'Carousel' && graphic.slides && graphic.slides.length > 1
                    ? <CarouselViewer slides={graphic.slides} title={topic.title} onDownload={downloadImage} />
                    : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={graphic.image_url}
                        alt={topic.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    )
                )}
                {errors[topic.id] && !isLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
                    <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
                    <p className="text-xs text-red-400 text-center">{errors[topic.id]}</p>
                  </div>
                )}
                {!graphic && !isLoading && !errors[topic.id] && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center">
                      <svg className="w-6 h-6 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    </div>
                    <p className="text-xs text-white/30">No graphic yet</p>
                  </div>
                )}
              </div>

              {/* Card footer */}
              <div className="p-4 space-y-3">
                {/* Graphic type badge — always visible */}
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border border-purple-500/30 text-purple-300 bg-purple-500/10">
                  {topic.graphic_type ?? 'Static Graphic'}
                </span>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-white leading-snug">{topic.title}</p>
                  {graphic && (
                    topic.graphic_type === 'Carousel' && graphic.slides && graphic.slides.length > 1
                      ? <button
                          onClick={() => graphic.slides!.forEach((url, i) => downloadImage(url, `${topic.title.slice(0, 25)}-slide${i + 1}.jpg`))}
                          className="btn-ghost text-xs px-3 py-1.5 shrink-0"
                        >
                          ↓ All slides
                        </button>
                      : <button
                          onClick={() => downloadImage(graphic.image_url, `${topic.title.slice(0, 30)}.jpg`)}
                          className="btn-ghost text-xs px-3 py-1.5 shrink-0"
                        >
                          Download
                        </button>
                  )}
                </div>

                {graphic && (
                  <div className="space-y-2">
                    {/* Graphic type badge */}
                    {topic.graphic_type && (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border border-purple-500/30 text-purple-300 bg-purple-500/10">
                        {topic.graphic_type}
                      </span>
                    )}

                    {/* Visual prompt */}
                    <button
                      onClick={() => togglePrompt(topic.id)}
                      className="text-xs text-white/30 hover:text-white/50 transition-colors flex items-center gap-1"
                    >
                      <svg className={`w-3 h-3 transition-transform ${promptExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                      View AI image prompt
                    </button>
                    {promptExpanded && (
                      <p className="mt-1 text-xs text-white/40 leading-relaxed border-l border-white/10 pl-3">
                        {graphic.prompt}
                      </p>
                    )}

                    {/* Structural prompt */}
                    {graphic.structural_prompt && (
                      <>
                        <button
                          onClick={() => setExpandedPrompts((prev) => {
                            const next = new Set(prev)
                            const key = `struct-${topic.id}`
                            if (next.has(key)) next.delete(key)
                            else next.add(key)
                            return next
                          })}
                          className="text-xs text-amber-400/50 hover:text-amber-400/80 transition-colors flex items-center gap-1"
                        >
                          <svg className={`w-3 h-3 transition-transform ${expandedPrompts.has(`struct-${topic.id}`) ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                          View designer brief
                        </button>
                        {expandedPrompts.has(`struct-${topic.id}`) && (
                          <div className="mt-1 text-xs text-amber-300/60 leading-relaxed border-l-2 border-amber-500/20 pl-3 whitespace-pre-line">
                            {graphic.structural_prompt}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {(!graphic || errors[topic.id]) && !isLoading && (
                  <button
                    onClick={() => generateGraphic(topic)}
                    className="btn-ghost w-full text-xs"
                  >
                    {errors[topic.id] ? 'Retry Generation' : 'Generate This Graphic'}
                  </button>
                )}
                <button
                  onClick={() => generatePrompts(topic)}
                  disabled={promptLoadingIds.has(topic.id)}
                  className="btn-ghost w-full text-xs text-purple-400 hover:text-purple-300 border-purple-500/20 hover:border-purple-500/40 disabled:opacity-50"
                >
                  {promptLoadingIds.has(topic.id) ? '⏳ Generating prompts…' : '📋 Get Prompts Only'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Prompts Modal */}
      {promptsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setPromptsModal(null)}>
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white text-lg">📋 Graphic Prompts</h3>
              <button onClick={() => setPromptsModal(null)} className="text-white/40 hover:text-white text-xl">✕</button>
            </div>
            <p className="text-xs text-white/40 mb-4">{promptsModal.topic.title}</p>

            {promptsModal.result.isCarousel && promptsModal.result.slide_prompts ? (
              <div className="space-y-3 mb-5">
                {(['Cover Slide', 'Slide 2', 'Slide 3', 'CTA Slide'] as const).map((label, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
                    <p className="text-xs font-bold text-purple-400 mb-2">{label}</p>
                    <p className="text-sm text-white/80 leading-relaxed">{promptsModal.result.slide_prompts![i]}</p>
                    <button onClick={() => navigator.clipboard.writeText(promptsModal.result.slide_prompts![i]).then(() => toast.success('Copied!'))}
                      className="text-xs text-white/30 hover:text-white mt-2">Copy ↗</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 mb-5">
                <p className="text-xs font-bold text-purple-400 mb-2">Image Prompt</p>
                <p className="text-sm text-white/80 leading-relaxed">{promptsModal.result.image_prompt}</p>
                <button onClick={() => navigator.clipboard.writeText(promptsModal.result.image_prompt ?? '').then(() => toast.success('Copied!'))}
                  className="text-xs text-white/30 hover:text-white mt-2">Copy ↗</button>
              </div>
            )}

            {promptsModal.result.structural_prompt && (
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
                <p className="text-xs font-bold text-amber-400 mb-2">Structural Designer Brief</p>
                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{promptsModal.result.structural_prompt}</p>
                <button onClick={() => navigator.clipboard.writeText(promptsModal.result.structural_prompt ?? '').then(() => toast.success('Copied!'))}
                  className="text-xs text-white/30 hover:text-white mt-2">Copy ↗</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Export Tab ────────────────────────────────────────────────────────────────

function ExportTab({ week }: { week: Week }) {
  const [copied, setCopied] = useState<string | null>(null)

  function copyAll(platform: PlatformKey) {
    const texts = week.posts.map((post) => {
      const p = post[platform]
      const topic = week.topics.find((t) => t.id === post.topic_id)
      return `=== ${topic?.title ?? 'Post'} ===\n${p.hook}\n\n${p.body}\n\n${p.cta}\n\n${p.hashtags.map((h) => `#${h}`).join(' ')}`
    }).join('\n\n---\n\n')
    navigator.clipboard.writeText(texts)
    setCopied(platform)
    toast.success(`All ${platform} posts copied!`)
    setTimeout(() => setCopied(null), 2000)
  }

  async function exportPDF() {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const maxWidth = pageWidth - margin * 2
    let y = 20

    doc.setFontSize(22)
    doc.setTextColor(40, 40, 40)
    doc.text(week.week_label, margin, y)
    y += 10

    doc.setFontSize(10)
    doc.setTextColor(120, 120, 120)
    doc.text(`Generated by Sayanly — ${new Date(week.created_at).toLocaleDateString()}`, margin, y)
    y += 15

    for (const topic of week.topics) {
      const post = week.posts.find((p) => p.topic_id === topic.id)
      if (!post) continue

      if (y > 240) { doc.addPage(); y = 20 }

      doc.setFontSize(14)
      doc.setTextColor(60, 60, 60)
      doc.text(topic.title, margin, y)
      y += 8

      const platforms: PlatformKey[] = ['linkedin', 'facebook']
      for (const platform of platforms) {
        if (y > 250) { doc.addPage(); y = 20 }
        const pData = post[platform]

        doc.setFontSize(11)
        doc.setTextColor(80, 80, 200)
        doc.text(PLATFORM_META[platform].label, margin + 4, y)
        y += 6

        doc.setFontSize(9)
        doc.setTextColor(40, 40, 40)

        const hookLines = doc.splitTextToSize(`Hook: ${pData.hook}`, maxWidth - 8)
        if (y + hookLines.length * 5 > 270) { doc.addPage(); y = 20 }
        doc.text(hookLines, margin + 8, y)
        y += hookLines.length * 5 + 3

        const bodyLines = doc.splitTextToSize(pData.body, maxWidth - 8)
        if (y + bodyLines.length * 5 > 270) { doc.addPage(); y = 20 }
        doc.text(bodyLines, margin + 8, y)
        y += bodyLines.length * 5 + 3

        doc.setTextColor(100, 100, 100)
        const ctaLines = doc.splitTextToSize(`CTA: ${pData.cta}`, maxWidth - 8)
        doc.text(ctaLines, margin + 8, y)
        y += ctaLines.length * 5 + 8
      }
      y += 5
    }

    doc.save(`${week.week_label.replace(/[^a-z0-9]/gi, '-')}.pdf`)
  }

  const totalPosts = week.posts.length * 3

  return (
    <div className="max-w-lg">
      {/* Stats */}
      <div className="glass rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-white mb-4">Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{week.topics.length}</p>
            <p className="text-xs text-white/40 mt-0.5">Topics</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-400">{totalPosts}</p>
            <p className="text-xs text-white/40 mt-0.5">Total Posts</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-400">3</p>
            <p className="text-xs text-white/40 mt-0.5">Platforms</p>
          </div>
        </div>
      </div>

      {/* Export actions */}
      <div className="glass rounded-xl p-6 space-y-3">
        <h3 className="font-semibold text-white mb-4">Export Options</h3>

        <button onClick={exportPDF} className="btn-primary w-full justify-start gap-3 py-3">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download Full PDF
        </button>

        {(['linkedin', 'facebook'] as PlatformKey[]).map((platform) => {
          const meta = PLATFORM_META[platform]
          const Icon = meta.icon
          return (
            <button
              key={platform}
              onClick={() => copyAll(platform)}
              className="btn-ghost w-full justify-start gap-3 py-3"
            >
              <Icon className="w-4 h-4" />
              {copied === platform ? '✓ Copied!' : `Copy All ${meta.label} Posts`}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function WeekPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [week, setWeek] = useState<Week | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('posts')

  const loadWeek = useCallback(async () => {
    // Try server first
    try {
      const res = await fetch(`/api/weeks/${params.id}`)
      if (res.ok) {
        const data = await res.json() as { week?: Week }
        if (data.week) {
          setWeek(data.week)
          setLoading(false)
          return
        }
      }
    } catch { /* fall through */ }

    // Fallback: read from localStorage (works on Netlify where filesystem is read-only)
    try {
      const stored = JSON.parse(localStorage.getItem('sayanly_weeks') ?? '[]') as Week[]
      const found = stored.find(w => w.id === params.id)
      if (found) {
        setWeek(found)
        setLoading(false)
        return
      }
    } catch { /* ignore */ }

    setLoading(false)
  }, [params.id])

  useEffect(() => {
    loadWeek()
  }, [loadWeek])

  function handleGraphicsUpdate(graphics: Graphic[]) {
    setWeek((prev) => prev ? { ...prev, graphics } : prev)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!week) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-white/50 mb-4">Week not found</p>
          <button onClick={() => router.push('/dashboard')} className="btn-primary">Back to Dashboard</button>
        </div>
      </div>
    )
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'posts', label: 'Posts' },
    { key: 'graphics', label: 'Graphics' },
    { key: 'export', label: 'Export' },
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Sticky nav */}
      <div className="sticky top-0 z-10 border-b border-white/[0.06] px-8 py-4 flex items-center gap-4 bg-black/90 backdrop-blur-xl">
        <button
          onClick={() => router.push('/dashboard')}
          className="p-2 rounded-lg hover:bg-white/[0.04] text-white/40 hover:text-white/70 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-xs shrink-0">S</div>
          <div>
            <p className="text-sm font-semibold text-white leading-none">{week.week_label}</p>
            <p className="text-xs text-white/40 mt-0.5">{week.topics.length} topics · {week.posts.length} posts generated</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="ml-auto flex items-center gap-1 glass rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-orange-600 text-white'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-8 max-w-7xl mx-auto">
        {activeTab === 'posts' && <PostsTab week={week} />}
        {activeTab === 'graphics' && (
          <GraphicsTab week={week} onGraphicsUpdate={handleGraphicsUpdate} />
        )}
        {activeTab === 'export' && <ExportTab week={week} />}
      </div>
    </div>
  )
}
