'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Week } from '@/lib/local-store'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

const STRIP_GRADIENTS = [
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

export default function DashboardPage() {
  const router = useRouter()
  const [weeks, setWeeks] = useState<Week[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  function loadWeeks() {
    fetch('/api/weeks')
      .then(r => r.json())
      .then((data: Week[] | { weeks: Week[] }) => {
        const arr = Array.isArray(data) ? data : (data.weeks ?? [])
        setWeeks(arr)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadWeeks() }, [])

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      await fetch(`/api/weeks/${id}`, { method: 'DELETE' })
      setWeeks(prev => prev.filter(w => w.id !== id))
      toast.success('Week deleted successfully')
    } catch {
      toast.error('Failed to delete week')
    } finally {
      setDeleting(false)
      setConfirmDelete(null)
    }
  }

  const totalPosts = weeks.reduce((acc, w) => acc + w.posts.length, 0)
  const totalGraphics = weeks.reduce((acc, w) => acc + (w.graphics?.length ?? 0), 0)
  const completedWeeks = weeks.filter(w => w.status === 'complete').length

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">

      {/* ── SIDEBAR ── */}
      <aside className="w-[240px] shrink-0 border-r border-white/[0.06] bg-[#080808] flex flex-col h-full">

        {/* Logo */}
        <div className="px-5 h-16 flex items-center border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center text-sm font-black shadow-lg shadow-purple-700/30">S</div>
            <div>
              <p className="font-black text-sm tracking-tight text-white">SAYANLY</p>
              <p className="text-[10px] text-zinc-600">AI Content Factory</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-3 pt-5 space-y-1">
          <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-[0.18em] px-3 mb-2">Menu</p>

          <button onClick={() => router.push('/dashboard')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-purple-600/15 border border-purple-500/20 text-sm font-semibold text-purple-300">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
            Dashboard
          </button>

          <button onClick={() => router.push('/week/new')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] transition-all">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            New Week
          </button>

          <button onClick={() => router.push('/profile')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] transition-all">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="7.5" cy="5" r="3" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M1.5 13.5c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Company Profile
          </button>
        </nav>

        <Separator className="mx-4 my-5 bg-white/[0.05] w-auto" />

        {/* Platform stats */}
        <div className="px-3 space-y-1">
          <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-[0.18em] px-3 mb-3">Platforms</p>
          {[
            { label: 'LinkedIn Posts', value: loading ? '—' : weeks.reduce((a, w) => a + w.posts.filter(p => p.linkedin).length, 0), color: 'text-[#4db8ff]', dot: 'bg-[#0077B5]' },
            { label: 'Facebook Posts', value: loading ? '—' : weeks.reduce((a, w) => a + w.posts.filter(p => p.facebook).length, 0), color: 'text-[#6ba3f5]', dot: 'bg-[#1877F2]' },
            { label: 'Graphics Made', value: loading ? '—' : totalGraphics, color: 'text-purple-400', dot: 'bg-purple-500' },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                <span className="text-xs text-zinc-500">{s.label}</span>
              </div>
              <span className={`text-sm font-black tabular-nums ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>

        <div className="flex-1" />

        <div className="px-5 py-4 border-t border-white/[0.05]">
          <Badge variant="outline" className="border-purple-500/30 text-purple-400 bg-purple-500/10 text-[10px]">
            Beta v1.0
          </Badge>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">

        {/* Glow */}
        <div className="pointer-events-none fixed overflow-hidden" style={{ left: 240, right: 0, top: 0, bottom: 0, zIndex: 0 }}>
          <div className="absolute -top-48 left-1/3 w-[600px] h-[600px] bg-purple-700/15 rounded-full blur-[140px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-800/10 rounded-full blur-[110px]" />
        </div>

        {/* Top bar */}
        <div className="relative z-10 shrink-0 border-b border-white/[0.06] backdrop-blur-xl bg-black/70 px-8 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-white">Content Dashboard</h1>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {loading ? 'Loading...' : `${weeks.length} week${weeks.length !== 1 ? 's' : ''} · ${totalPosts} posts generated`}
            </p>
          </div>
          <button onClick={() => router.push('/week/new')}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-700/20">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            New Week
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-y-auto px-8 py-8">

          {/* Stats row */}
          {!loading && weeks.length > 0 && (
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Weeks', value: weeks.length, sub: 'content weeks', color: 'from-purple-600/20 to-violet-600/10', border: 'border-purple-500/20', text: 'text-purple-300' },
                { label: 'Completed', value: completedWeeks, sub: 'fully done', color: 'from-emerald-600/20 to-teal-600/10', border: 'border-emerald-500/20', text: 'text-emerald-300' },
                { label: 'Total Posts', value: totalPosts, sub: 'across all weeks', color: 'from-blue-600/20 to-indigo-600/10', border: 'border-blue-500/20', text: 'text-blue-300' },
                { label: 'Graphics', value: totalGraphics, sub: 'images generated', color: 'from-orange-600/20 to-amber-600/10', border: 'border-orange-500/20', text: 'text-orange-300' },
              ].map(s => (
                <Card key={s.label} className={`bg-gradient-to-br ${s.color} border ${s.border} rounded-2xl`}>
                  <CardContent className="p-5">
                    <p className="text-3xl font-black text-white">{s.value}</p>
                    <p className={`text-sm font-semibold mt-1 ${s.text}`}>{s.label}</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">{s.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div>
              <div className="grid grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-2xl bg-white/[0.05]" />
                ))}
              </div>
              <Skeleton className="h-5 w-32 bg-white/[0.05] mb-6" />
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-2xl border border-white/[0.07] overflow-hidden bg-white/[0.02]">
                    <Skeleton className="h-1.5 w-full bg-white/[0.06]" />
                    <div className="p-5 space-y-3">
                      <div className="flex justify-between">
                        <Skeleton className="h-5 w-20 rounded-full bg-white/[0.05]" />
                        <Skeleton className="h-4 w-16 bg-white/[0.04]" />
                      </div>
                      <Skeleton className="h-4 w-full bg-white/[0.05]" />
                      <Skeleton className="h-3 w-3/4 bg-white/[0.04]" />
                      <Skeleton className="h-3 w-2/3 bg-white/[0.04]" />
                      <div className="grid grid-cols-3 gap-1.5 pt-2">
                        {[...Array(3)].map((_, j) => (
                          <Skeleton key={j} className="h-12 rounded-lg bg-white/[0.04]" />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && weeks.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <div className="w-20 h-20 rounded-3xl bg-purple-600/15 border border-purple-500/20 flex items-center justify-center mb-6">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M16 4C9.37 4 4 9.37 4 16s5.37 12 12 12 12-5.37 12-12S22.63 4 16 4z" stroke="#a855f7" strokeWidth="1.5"/>
                  <path d="M11 16l3.5 3.5L21 11" stroke="#a855f7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">No weeks yet</h2>
              <p className="text-zinc-500 text-sm mb-8 max-w-xs leading-relaxed">
                Create your first AI-powered content week — 7 topics, 21 posts across LinkedIn and Facebook, ready to go.
              </p>
              <button onClick={() => router.push('/week/new')}
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-3.5 rounded-2xl text-sm transition-all shadow-lg shadow-purple-700/20">
                Create First Week
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M7.5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}

          {/* Weeks grid */}
          {!loading && weeks.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.16em] mb-5">All Weeks</p>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">

                {/* New week card */}
                <button onClick={() => router.push('/week/new')}
                  className="group rounded-2xl border-2 border-dashed border-white/[0.08] hover:border-purple-500/40 hover:bg-purple-500/[0.03] transition-all duration-200 flex flex-col items-center justify-center min-h-[260px] gap-4">
                  <div className="w-12 h-12 rounded-xl border border-white/[0.10] group-hover:border-purple-500/30 bg-white/[0.03] flex items-center justify-center transition-all">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 2v16M2 10h16" stroke="#52525b" strokeWidth="1.6" strokeLinecap="round"
                        className="group-hover:stroke-purple-400 transition-colors"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-zinc-500 group-hover:text-zinc-300 transition-colors">New Week</p>
                    <p className="text-[11px] text-zinc-700 mt-0.5">7 topics · 21 posts</p>
                  </div>
                </button>

                {/* Week cards */}
                {weeks.map((week, i) => {
                  const stripGradient = STRIP_GRADIENTS[i % STRIP_GRADIENTS.length]
                  const postCount = week.posts.length
                  const topicCount = week.topics.length
                  const graphicCount = week.graphics?.length ?? 0
                  const isComplete = week.status === 'complete'
                  const firstThree = week.topics.slice(0, 3)

                  return (
                    <Card key={week.id}
                      className="group rounded-2xl border border-white/[0.08] hover:border-white/[0.16] bg-[#0a0a0a] transition-all duration-200 overflow-hidden cursor-pointer p-0 relative"
                      onClick={() => router.push(`/week/${week.id}`)}>

                      {/* Color strip */}
                      <div className={`h-1.5 w-full bg-gradient-to-r ${stripGradient}`} />

                      {/* Delete button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(week.id) }}
                        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 flex items-center justify-center z-10">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                      <CardContent className="p-5">
                        {/* Status + date */}
                        <div className="flex items-center justify-between mb-3">
                          <Badge className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 ${
                            isComplete
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                          }`}>
                            {isComplete ? '✓ Complete' : '● Draft'}
                          </Badge>
                          <span className="text-[10px] text-zinc-600">{relativeTime(week.created_at)}</span>
                        </div>

                        {/* Title */}
                        <h3 className="font-bold text-white text-sm leading-snug mb-3 group-hover:text-purple-200 transition-colors pr-6">
                          {week.week_label}
                        </h3>

                        {/* Topics preview */}
                        {firstThree.length > 0 && (
                          <div className="mb-4 space-y-1.5">
                            {firstThree.map((topic, ti) => (
                              <div key={topic.id ?? ti} className="flex items-center gap-1.5 min-w-0">
                                <div className={`w-1 h-1 rounded-full shrink-0 bg-gradient-to-r ${stripGradient} opacity-70`} />
                                <p className="text-[11px] text-zinc-500 truncate">{topic.title}</p>
                              </div>
                            ))}
                            {week.topics.length > 3 && (
                              <p className="text-[10px] text-zinc-700 pl-2.5">+{week.topics.length - 3} more topics</p>
                            )}
                          </div>
                        )}

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-1.5 mb-4">
                          {[
                            { label: 'Topics', value: topicCount },
                            { label: 'Posts', value: postCount },
                            { label: 'Graphics', value: graphicCount },
                          ].map(stat => (
                            <div key={stat.label} className="bg-white/[0.03] rounded-xl px-2 py-2.5 text-center border border-white/[0.05]">
                              <p className="text-base font-black text-white">{stat.value}</p>
                              <p className="text-[9px] text-zinc-600 mt-0.5">{stat.label}</p>
                            </div>
                          ))}
                        </div>

                        {/* Platform badges */}
                        <div className="flex gap-1.5 flex-wrap">
                          <Badge className="text-[10px] font-semibold px-2 py-0.5 bg-[#0077B5]/15 text-[#4db8ff] border border-[#0077B5]/25">
                            LinkedIn
                          </Badge>
                          <Badge className="text-[10px] font-semibold px-2 py-0.5 bg-[#1877F2]/15 text-[#6ba3f5] border border-[#1877F2]/25">
                            Facebook
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Delete Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Week?</DialogTitle>
            <DialogDescription className="text-zinc-400">
              This will permanently delete this week and all its posts and graphics. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-2">
            <button onClick={() => setConfirmDelete(null)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 transition-all">
              Cancel
            </button>
            <button
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              disabled={deleting}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-500 transition-all disabled:opacity-50">
              {deleting ? 'Deleting...' : 'Delete Week'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
