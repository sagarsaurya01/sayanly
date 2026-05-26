'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Week } from '@/lib/local-store'

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
}

const PLATFORM_STYLES: Record<string, string> = {
  linkedin: 'bg-[#0077B5]/15 text-[#4db8ff] border border-[#0077B5]/25',
  facebook: 'bg-[#1877F2]/15 text-[#6ba3f5] border border-[#1877F2]/25',
}

const PLATFORM_DOT_COLORS: Record<string, string> = {
  linkedin: 'bg-[#0077B5]',
  facebook: 'bg-[#1877F2]',
}

const WEEK_GRADIENTS = [
  'from-violet-600/40 to-purple-900/30',
  'from-blue-600/40 to-indigo-900/30',
  'from-pink-600/40 to-rose-900/30',
  'from-emerald-600/40 to-teal-900/30',
  'from-amber-600/40 to-orange-900/30',
  'from-cyan-600/40 to-blue-900/30',
]

const WEEK_STRIP_GRADIENTS = [
  'from-violet-500 to-purple-700',
  'from-blue-500 to-indigo-700',
  'from-pink-500 to-rose-700',
  'from-emerald-500 to-teal-700',
  'from-amber-500 to-orange-700',
  'from-cyan-500 to-blue-700',
]

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function WeekCard({ week, index, onDelete }: { week: Week; index: number; onDelete: () => void }) {
  const router = useRouter()
  const gradient = WEEK_GRADIENTS[index % WEEK_GRADIENTS.length]
  const stripGradient = WEEK_STRIP_GRADIENTS[index % WEEK_STRIP_GRADIENTS.length]
  const platforms = ['linkedin', 'facebook']
  const postCount = week.posts.length
  const topicCount = week.topics.length
  const graphicCount = week.graphics?.length ?? 0
  const dateStr = new Date(week.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const firstThreeTopics = week.topics.slice(0, 3)

  return (
    <div
      className="relative glass rounded-2xl overflow-hidden cursor-pointer group card-hover animate-fade-in flex flex-col"
      style={{ minHeight: 240 }}
      onClick={() => router.push(`/week/${week.id}`)}
    >
      {/* Gradient header strip */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${stripGradient} shrink-0`} />

      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); if (confirm('Delete this week?')) onDelete() }}
        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 z-10"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      <div className="p-5 flex flex-col flex-1">
        {/* Status + date */}
        <div className="flex items-center justify-between mb-3">
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
            week.status === 'complete'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            {week.status === 'complete' ? '✓ Complete' : '● Draft'}
          </span>
          <span className="text-[11px] text-white/30">{dateStr}</span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-white text-sm leading-snug mb-3 group-hover:text-purple-200 transition-colors pr-6">
          {week.week_label}
        </h3>

        {/* Topic titles */}
        {firstThreeTopics.length > 0 && (
          <div className="mb-4 space-y-1.5">
            {firstThreeTopics.map((topic, i) => (
              <div key={topic.id ?? i} className="flex items-center gap-1.5 min-w-0">
                <div className={`w-1 h-1 rounded-full shrink-0 bg-gradient-to-r ${stripGradient} opacity-70`} />
                <p className="text-[11px] text-white/40 truncate leading-tight">{topic.title}</p>
              </div>
            ))}
            {week.topics.length > 3 && (
              <p className="text-[10px] text-white/20 pl-3">+{week.topics.length - 3} more</p>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-1.5 mb-4">
          {[
            { label: 'Topics', value: topicCount },
            { label: 'Posts', value: postCount },
            { label: 'Graphics', value: graphicCount },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/[0.03] rounded-lg px-2 py-2 text-center border border-white/[0.05]">
              <p className="text-base font-black text-white">{stat.value}</p>
              <p className="text-[9px] text-white/30 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Platforms */}
        <div className="flex gap-1.5 flex-wrap">
          {platforms.map((p) => (
            <span key={p} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PLATFORM_STYLES[p]}`}>
              {PLATFORM_LABELS[p]}
            </span>
          ))}
        </div>
      </div>

      {/* Arrow */}
      <div className="absolute bottom-5 right-5 w-6 h-6 rounded-md flex items-center justify-center text-white/20 group-hover:text-purple-400 group-hover:bg-purple-500/10 transition-all">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [weeks, setWeeks] = useState<Week[]>([])
  const [loading, setLoading] = useState(true)

  function loadWeeks() {
    fetch('/api/weeks')
      .then((r) => r.json())
      .then((data: Week[] | { weeks: Week[] }) => {
        const arr = Array.isArray(data) ? data : (data.weeks ?? [])
        setWeeks(arr)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadWeeks() }, [])

  async function handleDelete(id: string) {
    await fetch(`/api/weeks/${id}`, { method: 'DELETE' })
    loadWeeks()
  }

  const totalPosts = weeks.reduce((acc, w) => acc + w.posts.length, 0)
  const completedWeeks = weeks.filter(w => w.status === 'complete').length
  const latestWeek = weeks[0] ?? null

  // Platform content counts across all weeks
  const platformCounts = weeks.reduce(
    (acc, w) => {
      w.posts.forEach((post) => {
        if (post.linkedin) acc.linkedin += 1
        if (post.facebook) acc.facebook += 1
      })
      return acc
    },
    { linkedin: 0, facebook: 0 }
  )

  // Recent posts from most recent week (last 4)
  const recentPosts = latestWeek
    ? latestWeek.posts.slice(0, 4).map((post) => {
        const topic = latestWeek.topics.find((t) => t.id === post.topic_id)
        return { post, topic }
      })
    : []

  // Activity feed: last 4 weeks as activity rows
  const activityItems = weeks.slice(0, 4).map((w) => ({
    label: 'Week created',
    detail: w.week_label,
    sub: `${w.posts.length} posts generated`,
    time: relativeTime(w.created_at),
    color: w.status === 'complete' ? 'bg-emerald-400' : 'bg-amber-400',
  }))

  return (
    <div className="min-h-screen bg-black flex text-white">

      {/* ── Sidebar ── */}
      <aside className="fixed top-0 left-0 h-full w-[220px] border-r border-white/[0.06] flex flex-col bg-[#080808] z-10 overflow-y-auto">

        {/* Logo */}
        <div className="h-14 px-5 flex items-center border-b border-white/[0.05] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center text-xs font-black">S</div>
            <span className="font-black text-sm tracking-tight">SAYANLY</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-3 pt-4 space-y-0.5 shrink-0">
          {[
            { label: 'Dashboard', path: '/dashboard', active: true, icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
            { label: 'New Week', path: '/week/new', active: false, icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /> },
            { label: 'Profile', path: '/profile', active: false, icon: <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                item.active
                  ? 'bg-white/[0.06] border border-white/[0.08] text-white'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>{item.icon}</svg>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mx-4 my-4 border-t border-white/[0.05] shrink-0" />

        {/* Overview stats */}
        <div className="px-4 space-y-1 shrink-0">
          <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-[0.18em] mb-3 px-1">Overview</p>
          {[
            { label: 'Total Weeks', value: weeks.length, color: 'text-white' },
            { label: 'Completed', value: completedWeeks, color: 'text-emerald-400' },
            { label: 'Total Posts', value: totalPosts, color: 'text-purple-400' },
          ].map((s) => (
            <div key={s.label} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors">
              <span className="text-xs text-zinc-500">{s.label}</span>
              <span className={`text-xs font-black tabular-nums ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>

        <div className="mx-4 my-4 border-t border-white/[0.05] shrink-0" />

        {/* Content by Platform */}
        <div className="px-4 shrink-0">
          <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-[0.18em] mb-3 px-1">Content by Platform</p>
          {(['linkedin', 'facebook'] as const).map((p) => (
            <div key={p} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full shrink-0 ${PLATFORM_DOT_COLORS[p]}`} />
                <span className="text-xs text-zinc-400">{PLATFORM_LABELS[p]}</span>
              </div>
              <span className="text-xs font-black text-white/60 tabular-nums">{platformCounts[p]}</span>
            </div>
          ))}
        </div>

        <div className="mx-4 my-4 border-t border-white/[0.05] shrink-0" />

        {/* Recent Activity feed */}
        <div className="px-4 shrink-0">
          <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-[0.18em] mb-3 px-1">Recent Activity</p>
          {activityItems.length === 0 ? (
            <p className="text-[11px] text-zinc-700 px-3">No activity yet</p>
          ) : (
            <div className="space-y-1">
              {activityItems.map((item, i) => (
                <div key={i} className="px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${item.color}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-white/70 font-medium truncate">{item.label}</p>
                      <p className="text-[10px] text-zinc-600 truncate">{item.detail}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-[10px] text-zinc-700">{item.sub}</p>
                        <p className="text-[10px] text-zinc-700 shrink-0 ml-1">{item.time}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Beta */}
        <div className="px-5 py-4 border-t border-white/[0.05] shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold tracking-[0.18em] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full uppercase">Beta</span>
            <span className="text-[10px] text-zinc-700">v1.0</span>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="ml-[220px] flex-1 flex flex-col min-h-screen">

        {/* Glow */}
        <div className="fixed pointer-events-none" style={{ left: 220, right: 0, top: 0, bottom: 0, zIndex: 0 }}>
          <div className="absolute -top-48 left-1/3 w-[500px] h-[500px] bg-purple-700/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-violet-800/10 rounded-full blur-[100px]" />
        </div>

        {/* Top bar */}
        <div className="relative z-10 sticky top-0 border-b border-white/[0.06] px-8 h-14 flex items-center justify-between bg-black/70 backdrop-blur-xl">
          <div>
            <p className="text-sm font-bold text-white">Content Dashboard</p>
            <p className="text-[11px] text-zinc-600">
              {loading ? 'Loading...' : `${weeks.length} week${weeks.length !== 1 ? 's' : ''} · ${totalPosts} posts generated`}
            </p>
          </div>
          <button
            onClick={() => router.push('/week/new')}
            className="btn-primary inline-flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-xl"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Week
          </button>
        </div>

        {/* Quick Actions bar */}
        <div className="relative z-10 border-b border-white/[0.04] px-8 py-2.5 flex items-center gap-2 bg-black/40 backdrop-blur-sm">
          <button
            onClick={() => router.push('/week/new')}
            className="btn-primary text-xs font-semibold px-4 py-1.5 rounded-lg"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Week
          </button>
          {latestWeek && (
            <button
              onClick={() => router.push(`/week/${latestWeek.id}`)}
              className="btn-ghost text-xs font-medium px-4 py-1.5 rounded-lg"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Latest Week
            </button>
          )}
          <button
            onClick={() => router.push('/profile')}
            className="btn-ghost text-xs font-medium px-4 py-1.5 rounded-lg"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Edit Profile
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 px-8 py-8">

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="glass rounded-2xl shimmer" style={{ minHeight: 240 }} />
              ))}
            </div>
          ) : weeks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl glass border border-white/[0.08] flex items-center justify-center">
                <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No weeks yet</h2>
              <p className="text-sm text-zinc-500 mb-8 max-w-xs">Create your first AI-powered content week — 7 topics, 21 posts, ready to go.</p>
              <button onClick={() => router.push('/week/new')} className="btn-primary inline-flex items-center gap-2 px-7 py-3 rounded-2xl font-bold text-sm">
                Create First Week
              </button>
            </div>
          ) : (
            <>
              {/* All Weeks grid */}
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.16em] mb-6">All Weeks</p>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">

                {/* New week card */}
                <button
                  onClick={() => router.push('/week/new')}
                  className="glass rounded-2xl border border-dashed border-white/[0.07] hover:border-purple-500/40 hover:bg-purple-500/[0.03] transition-all duration-200 flex flex-col items-center justify-center gap-3 group"
                  style={{ minHeight: 240 }}
                >
                  <div className="w-10 h-10 rounded-xl glass border border-white/[0.09] group-hover:border-purple-500/30 flex items-center justify-center transition-all">
                    <svg className="w-4 h-4 text-zinc-600 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-zinc-500 group-hover:text-zinc-300 transition-colors">New Week</p>
                    <p className="text-[11px] text-zinc-700 mt-0.5">7 topics · 21 posts</p>
                  </div>
                </button>

                {weeks.map((week, i) => (
                  <WeekCard key={week.id} week={week} index={i} onDelete={() => handleDelete(week.id)} />
                ))}
              </div>

              {/* Recent Posts Preview */}
              {recentPosts.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.16em]">Recent Posts</p>
                      <p className="text-[11px] text-zinc-700 mt-0.5">From {latestWeek?.week_label}</p>
                    </div>
                    {latestWeek && (
                      <button
                        onClick={() => router.push(`/week/${latestWeek.id}`)}
                        className="text-[11px] text-purple-400 hover:text-purple-300 transition-colors font-medium"
                      >
                        View all →
                      </button>
                    )}
                  </div>

                  {/* Horizontal scroll on mobile, 2-col grid on desktop */}
                  <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible md:pb-0">
                    {recentPosts.map(({ post, topic }, i) => {
                      const linkedinContent = post.linkedin
                      const hook = linkedinContent?.hook ?? ''
                      const topicTitle = topic?.title ?? 'Untitled'

                      return (
                        <div
                          key={i}
                          className="glass rounded-2xl p-5 shrink-0 w-72 md:w-auto flex flex-col gap-3 hover:bg-white/[0.04] transition-colors"
                        >
                          {/* Topic title + platform badge */}
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-white/90 leading-snug line-clamp-2 flex-1">{topicTitle}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${PLATFORM_STYLES.linkedin}`}>
                              LinkedIn
                            </span>
                          </div>

                          {/* Hook text */}
                          {hook ? (
                            <p className="text-[12px] text-zinc-400 leading-relaxed line-clamp-3">{hook}</p>
                          ) : (
                            <p className="text-[12px] text-zinc-700 italic">No hook available</p>
                          )}

                          {/* View button */}
                          {latestWeek && (
                            <button
                              onClick={() => router.push(`/week/${latestWeek.id}`)}
                              className="self-start text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition-colors bg-purple-500/10 hover:bg-purple-500/15 border border-purple-500/20 px-3 py-1 rounded-lg mt-auto"
                            >
                              View →
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
