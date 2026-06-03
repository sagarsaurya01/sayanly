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

const STRIP_COLORS = ['#ff6b35','#ffd166','#06d6a0','#118ab2','#ef476f','#ffb703']

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
        const serverWeeks = Array.isArray(data) ? data : (data.weeks ?? [])
        // Merge with localStorage weeks (Netlify can't write server-side)
        try {
          const localWeeks = JSON.parse(localStorage.getItem('sayanly_weeks') ?? '[]') as Week[]
          const serverIds = new Set(serverWeeks.map((w: Week) => w.id))
          const onlyLocal = localWeeks.filter(w => !serverIds.has(w.id))
          setWeeks([...onlyLocal, ...serverWeeks])
        } catch {
          setWeeks(serverWeeks)
        }
      })
      .catch(() => {
        // All server failed — use localStorage only
        try {
          const localWeeks = JSON.parse(localStorage.getItem('sayanly_weeks') ?? '[]') as Week[]
          setWeeks(localWeeks)
        } catch { setWeeks([]) }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadWeeks() }, [])

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      await fetch(`/api/weeks/${id}`, { method: 'DELETE' })
      setWeeks(prev => prev.filter(w => w.id !== id))
      toast.success('Week deleted')
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
  const linkedinPosts = weeks.reduce((a, w) => a + w.posts.filter(p => p.linkedin).length, 0)
  const facebookPosts = weeks.reduce((a, w) => a + w.posts.filter(p => p.facebook).length, 0)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0d1117', color: '#e8e6e3' }}>

      {/* ── SIDEBAR ── */}
      <aside className="w-[240px] shrink-0 flex flex-col h-full"
        style={{ background: '#0a0f14', borderRight: '1px solid rgba(255,107,53,0.1)' }}>

        {/* Logo */}
        <div className="px-5 h-16 flex items-center" style={{ borderBottom: '1px solid rgba(255,107,53,0.08)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black"
              style={{ background: 'linear-gradient(135deg, #ff6b35, #d44010)', color: '#fff', boxShadow: '0 4px 16px rgba(255,107,53,0.3)' }}>
              S
            </div>
            <div>
              <p className="font-black text-sm tracking-tight" style={{ color: '#e8e6e3' }}>SAYANLY</p>
              <p className="text-[10px]" style={{ color: '#5a6370' }}>AI Content Factory</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-3 pt-5 space-y-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] px-3 mb-2" style={{ color: '#2a3340' }}>Menu</p>

          <button onClick={() => router.push('/dashboard')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.22)', color: '#ff6b35' }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
            Dashboard
          </button>

          {[
            { label: 'New Week', path: '/week/new', icon: <path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/> },
            { label: 'Company Profile', path: '/profile', icon: <><circle cx="7.5" cy="5" r="3" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 13.5c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></> },
          ].map(item => (
            <button key={item.label} onClick={() => router.push(item.path)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/[0.04]"
              style={{ color: '#5a6370' }}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">{item.icon}</svg>
              {item.label}
            </button>
          ))}
        </nav>

        <Separator className="mx-4 my-5 w-auto" style={{ background: 'rgba(255,107,53,0.08)' }} />

        {/* Platform breakdown */}
        <div className="px-3 space-y-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] px-3 mb-3" style={{ color: '#2a3340' }}>Platforms</p>
          {[
            { label: 'LinkedIn Posts', value: loading ? '—' : linkedinPosts, color: '#4db8ff' },
            { label: 'Facebook Posts', value: loading ? '—' : facebookPosts, color: '#6ba3f5' },
            { label: 'Graphics Made', value: loading ? '—' : totalGraphics, color: '#ff6b35' },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors hover:bg-white/[0.03]">
              <span className="text-xs" style={{ color: '#5a6370' }}>{s.label}</span>
              <span className="text-sm font-black tabular-nums" style={{ color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>

        <div className="flex-1" />

        <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(255,107,53,0.08)' }}>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.2)', color: '#ff6b35' }}>
            Beta v1.0
          </span>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">

        {/* Coral glow */}
        <div className="pointer-events-none fixed overflow-hidden" style={{ left: 240, right: 0, top: 0, bottom: 0, zIndex: 0 }}>
          <div className="absolute -top-48 left-1/4 w-[500px] h-[500px] rounded-full blur-[160px]"
            style={{ background: 'rgba(255,107,53,0.06)' }} />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[120px]"
            style={{ background: 'rgba(255,209,102,0.04)' }} />
        </div>

        {/* Top bar */}
        <div className="relative z-10 shrink-0 px-8 h-16 flex items-center justify-between backdrop-blur-xl"
          style={{ borderBottom: '1px solid rgba(255,107,53,0.1)', background: 'rgba(13,17,23,0.85)' }}>
          <div>
            <h1 className="text-base font-bold" style={{ color: '#e8e6e3' }}>Content Dashboard</h1>
            <p className="text-[11px] mt-0.5" style={{ color: '#5a6370' }}>
              {loading ? 'Loading...' : `${weeks.length} week${weeks.length !== 1 ? 's' : ''} · ${totalPosts} posts`}
            </p>
          </div>
          <button onClick={() => router.push('/week/new')}
            className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl btn-primary">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            New Week
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-y-auto px-8 py-8">

          {/* Stats */}
          {!loading && weeks.length > 0 && (
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Weeks', value: weeks.length, sub: 'content weeks', bg: 'rgba(255,107,53,0.08)', border: 'rgba(255,107,53,0.2)', val: '#ff6b35' },
                { label: 'Completed', value: completedWeeks, sub: 'fully done', bg: 'rgba(6,214,160,0.06)', border: 'rgba(6,214,160,0.15)', val: '#06d6a0' },
                { label: 'Total Posts', value: totalPosts, sub: 'all platforms', bg: 'rgba(17,138,178,0.08)', border: 'rgba(17,138,178,0.2)', val: '#4db8ff' },
                { label: 'Graphics', value: totalGraphics, sub: 'images made', bg: 'rgba(255,183,3,0.06)', border: 'rgba(255,183,3,0.15)', val: '#ffd166' },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-5"
                  style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                  <p className="text-3xl font-black" style={{ color: '#e8e6e3' }}>{s.value}</p>
                  <p className="text-sm font-semibold mt-1" style={{ color: s.val }}>{s.label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#3a4350' }}>{s.sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* Skeletons */}
          {loading && (
            <div>
              <div className="grid grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-2xl" style={{ background: 'rgba(255,107,53,0.05)' }} />
                ))}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,107,53,0.08)', background: '#131920' }}>
                    <Skeleton className="h-1.5 w-full" style={{ background: 'rgba(255,107,53,0.1)' }} />
                    <div className="p-5 space-y-3">
                      <div className="flex justify-between">
                        <Skeleton className="h-5 w-20 rounded-full" style={{ background: 'rgba(255,107,53,0.06)' }} />
                        <Skeleton className="h-4 w-14" style={{ background: 'rgba(255,107,53,0.04)' }} />
                      </div>
                      <Skeleton className="h-4 w-full" style={{ background: 'rgba(255,107,53,0.05)' }} />
                      <Skeleton className="h-3 w-3/4" style={{ background: 'rgba(255,107,53,0.04)' }} />
                      <div className="grid grid-cols-3 gap-1.5 pt-2">
                        {[...Array(3)].map((_, j) => <Skeleton key={j} className="h-12 rounded-xl" style={{ background: 'rgba(255,107,53,0.04)' }} />)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty */}
          {!loading && weeks.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
                style={{ background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.2)' }}>
                <span style={{ fontSize: 32 }}>✍️</span>
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#e8e6e3' }}>No weeks yet</h2>
              <p className="text-sm mb-8 max-w-xs leading-relaxed" style={{ color: '#5a6370' }}>
                Create your first AI-powered content week — 7 topics, 21 posts across LinkedIn and Facebook, ready to go.
              </p>
              <button onClick={() => router.push('/week/new')}
                className="inline-flex items-center gap-2 font-bold px-8 py-3.5 rounded-2xl text-sm btn-primary">
                Create First Week →
              </button>
            </div>
          )}

          {/* Weeks grid */}
          {!loading && weeks.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-5" style={{ color: '#2a3340' }}>All Weeks</p>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">

                {/* New week */}
                <button onClick={() => router.push('/week/new')}
                  className="group rounded-2xl flex flex-col items-center justify-center min-h-[280px] gap-4 transition-all duration-200"
                  style={{ border: '2px dashed rgba(255,107,53,0.15)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,107,53,0.4)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,107,53,0.03)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,107,53,0.15)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ border: '1px solid rgba(255,107,53,0.15)', background: 'rgba(255,107,53,0.05)' }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: '#3a4350' }}>
                      <path d="M10 2v16M2 10h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold" style={{ color: '#5a6370' }}>New Week</p>
                    <p className="text-[11px] mt-0.5" style={{ color: '#2a3340' }}>7 topics · 21 posts</p>
                  </div>
                </button>

                {/* Week cards */}
                {weeks.map((week, i) => {
                  const stripColor = STRIP_COLORS[i % STRIP_COLORS.length]
                  const isComplete = week.status === 'complete'
                  const postCount = week.posts.length
                  const topicCount = week.topics.length
                  const graphicCount = week.graphics?.length ?? 0
                  const firstThree = week.topics.slice(0, 3)

                  return (
                    <Card key={week.id}
                      className="group rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 relative card-hover p-0"
                      style={{ border: '1px solid rgba(255,107,53,0.1)', background: '#131920' }}
                      onClick={() => router.push(`/week/${week.id}`)}>

                      {/* Color strip */}
                      <div className="h-1" style={{ background: stripColor }} />

                      {/* Delete */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(week.id) }}
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg flex items-center justify-center z-10"
                        style={{ color: '#3a4350' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.1)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#3a4350'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                      <CardContent className="p-5">
                        {/* Status + time */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                            style={isComplete
                              ? { background: 'rgba(6,214,160,0.1)', color: '#06d6a0', border: '1px solid rgba(6,214,160,0.2)' }
                              : { background: 'rgba(255,183,3,0.1)', color: '#ffd166', border: '1px solid rgba(255,183,3,0.2)' }}>
                            {isComplete ? '✓ Complete' : '● Draft'}
                          </span>
                          <span className="text-[10px]" style={{ color: '#3a4350' }}>{relativeTime(week.created_at)}</span>
                        </div>

                        {/* Title */}
                        <h3 className="font-bold text-sm leading-snug mb-3 pr-6 transition-colors"
                          style={{ color: '#e8e6e3' }}>
                          {week.week_label}
                        </h3>

                        {/* Topics */}
                        {firstThree.length > 0 && (
                          <div className="mb-4 space-y-1.5">
                            {firstThree.map((topic, ti) => (
                              <div key={topic.id ?? ti} className="flex items-center gap-1.5 min-w-0">
                                <div className="w-1 h-1 rounded-full shrink-0" style={{ background: stripColor, opacity: 0.7 }} />
                                <p className="text-[11px] truncate" style={{ color: '#4a5560' }}>{topic.title}</p>
                              </div>
                            ))}
                            {week.topics.length > 3 && (
                              <p className="text-[10px] pl-2.5" style={{ color: '#2a3340' }}>+{week.topics.length - 3} more topics</p>
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
                            <div key={stat.label} className="rounded-xl px-2 py-2.5 text-center"
                              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <p className="text-base font-black" style={{ color: '#e8e6e3' }}>{stat.value}</p>
                              <p className="text-[9px] mt-0.5" style={{ color: '#3a4350' }}>{stat.label}</p>
                            </div>
                          ))}
                        </div>

                        {/* Platform badges */}
                        <div className="flex gap-1.5">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full platform-linkedin">LinkedIn</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full platform-facebook">Facebook</span>
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
        <DialogContent className="max-w-sm" style={{ background: '#131920', border: '1px solid rgba(255,107,53,0.15)', color: '#e8e6e3' }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#e8e6e3' }}>Delete Week?</DialogTitle>
            <DialogDescription style={{ color: '#5a6370' }}>
              This will permanently delete this week and all its posts. Cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-2">
            <button onClick={() => setConfirmDelete(null)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ color: '#5a6370', border: '1px solid rgba(255,107,53,0.15)' }}>
              Cancel
            </button>
            <button onClick={() => confirmDelete && handleDelete(confirmDelete)} disabled={deleting}
              className="px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ background: '#dc2626', color: '#fff' }}>
              {deleting ? 'Deleting...' : 'Delete Week'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
