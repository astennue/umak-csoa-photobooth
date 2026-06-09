'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import {
  Radio,
  Users,
  Clock,
  CheckCircle,
  Camera,
  User,
  Hash,
  ArrowRight,
} from 'lucide-react'
import Image from 'next/image'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ActiveSession {
  id: string
  guestName: string
  guestEmail?: string | null
  guestPhone?: string | null
  status: string
  notes?: string | null
  startedAt?: string | null
  event: {
    id: string
    name: string
    organizationId: string
  }
}

interface QueueEntry {
  id: string
  position: number
  name: string
  status: string
  event: {
    id: string
    name: string
  }
}

interface SessionsResponse {
  data: ActiveSession[]
  meta?: { total: number; page: number; limit: number }
}

interface QueueResponse {
  data: QueueEntry[]
  meta?: { total: number; page: number; limit: number }
}

/* ------------------------------------------------------------------ */
/*  Fetchers                                                           */
/* ------------------------------------------------------------------ */

async function fetchActiveSessions(): Promise<ActiveSession[]> {
  const res = await fetch('/api/sessions?status=IN_PROGRESS&limit=1')
  if (!res.ok) throw new Error('Failed to fetch sessions')
  const json: SessionsResponse = await res.json()
  return json.data ?? []
}

async function fetchQueue(): Promise<QueueEntry[]> {
  const res = await fetch('/api/queue?status=WAITING&limit=5')
  if (!res.ok) throw new Error('Failed to fetch queue')
  const json: QueueResponse = await res.json()
  return json.data ?? []
}

/* ------------------------------------------------------------------ */
/*  Live Timer Hook                                                    */
/* ------------------------------------------------------------------ */

function useLiveTimer(startedAt: string | null | undefined) {
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Compute elapsed from startedAt and current time
  if (!startedAt) return { hours: 0, minutes: 0, seconds: 0, display: '--:--' }

  const start = new Date(startedAt).getTime()
  const diff = Math.max(0, now - start)

  const hours = Math.floor(diff / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  const seconds = Math.floor((diff % 60_000) / 1_000)

  if (hours > 0) {
    return {
      hours,
      minutes,
      seconds,
      display: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
    }
  }
  return {
    hours,
    minutes,
    seconds,
    display: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
  }
}

/* ------------------------------------------------------------------ */
/*  Animated Counter Digit                                             */
/* ------------------------------------------------------------------ */

function TimerDigit({ value }: { value: string }) {
  return (
    <span className="inline-block w-[1ch] text-center tabular-nums">{value}</span>
  )
}

function TimerDisplay({ display }: { display: string }) {
  const parts = display.split(':')
  return (
    <div className="flex items-baseline gap-0.5">
      {parts.map((part, partIdx) => (
        <span key={partIdx} className="flex items-baseline">
          {partIdx > 0 && (
            <span className="text-emerald-500/60 mx-1 font-light">:</span>
          )}
          {part.split('').map((char, charIdx) => (
            <TimerDigit key={charIdx} value={char} />
          ))}
        </span>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Queue Position Badge                                               */
/* ------------------------------------------------------------------ */

function QueuePositionBadge({ index }: { index: number }) {
  const isFirst = index === 0
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ring-1 ${
        isFirst
          ? 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/25'
          : 'bg-slate-700/50 text-slate-400 ring-slate-600/50'
      }`}
    >
      {index + 1}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LiveDisplay() {
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions', 'IN_PROGRESS'],
    queryFn: fetchActiveSessions,
    refetchInterval: 5000,
  })

  const { data: queue, isLoading: queueLoading } = useQuery({
    queryKey: ['queue', 'WAITING'],
    queryFn: fetchQueue,
    refetchInterval: 5000,
  })

  const activeSession = sessions?.[0] ?? null
  const isLoading = sessionsLoading && queueLoading
  const queueCount = queue?.length ?? 0

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-20 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <Radio className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white leading-tight">
                Live Display
              </h1>
              <p className="text-[11px] text-slate-600 leading-tight">
                UMak CSOA Photobooth
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Queue count pill */}
            {queueCount > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-slate-800/60 px-3 py-1.5 ring-1 ring-slate-700/40">
                <Users className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-xs font-medium text-slate-400">
                  {queueCount} in queue
                </span>
              </div>
            )}
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs px-3 py-1 font-semibold">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </Badge>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <AnimatePresence mode="wait">
          {!isLoading && !activeSession ? (
            /* ── Empty / Waiting State ── */
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="flex flex-col items-center justify-center py-20 lg:py-32"
            >
              {/* Animated camera icon */}
              <div className="relative mb-8">
                <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-slate-900 ring-1 ring-slate-800">
                  <Camera className="h-12 w-12 text-slate-600" />
                </div>
                {/* Pulsing ring */}
                <div className="absolute inset-0 rounded-3xl ring-2 ring-emerald-500/20 animate-[ping_3s_ease-in-out_infinite]" />
              </div>

              <h2 className="text-2xl lg:text-3xl font-bold text-slate-300 tracking-tight">
                Waiting for Session
              </h2>
              <p className="mt-3 text-base text-slate-600 max-w-md text-center leading-relaxed">
                The photobooth is set up and ready. A facilitator will start a session shortly.
              </p>

              {/* Live monitoring indicator */}
              <div className="mt-8 flex items-center gap-2.5 rounded-full bg-slate-900/80 px-4 py-2 ring-1 ring-slate-800/60">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-sm text-slate-500">Monitoring for sessions</span>
              </div>

              {/* Show queue info if available */}
              {queueCount > 0 && (
                <div className="mt-6 flex items-center gap-2 text-sm text-slate-600">
                  <Users className="h-4 w-4" />
                  <span>
                    <span className="text-emerald-400 font-semibold">{queueCount}</span>{' '}
                    {queueCount === 1 ? 'guest' : 'guests'} in queue
                  </span>
                </div>
              )}
            </motion.div>
          ) : (
            /* ── Active Session Display ── */
            <motion.div
              key={activeSession?.id ?? 'loading'}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="space-y-6"
            >
              {/* ── Event Header ── */}
              {activeSession && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest text-slate-600">
                      Event
                    </p>
                    <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight mt-0.5">
                      {activeSession.event.name}
                    </h2>
                  </div>
                  <Badge className="self-start bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs font-medium px-3 py-1">
                    <CheckCircle className="h-3 w-3 mr-1.5" />
                    In Progress
                  </Badge>
                </div>
              )}

              {/* ── Main Grid ── */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* ── Current Session Card ── */}
                <div className="lg:col-span-2 rounded-2xl bg-slate-900 ring-1 ring-slate-800 overflow-hidden">
                  {/* Card header */}
                  <div className="px-6 py-4 border-b border-slate-800/60 flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 ring-1 ring-emerald-500/20">
                      <User className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <span className="text-sm font-semibold text-slate-300">
                      Current Guest
                    </span>
                  </div>

                  {/* Card body */}
                  <div className="p-6">
                    {isLoading ? (
                      <div className="flex items-center gap-3 py-8">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
                        <span className="text-slate-500">Loading session...</span>
                      </div>
                    ) : activeSession ? (
                      <ActiveSessionContent session={activeSession} />
                    ) : null}
                  </div>
                </div>

                {/* ── Queue Card ── */}
                <div className="rounded-2xl bg-slate-900 ring-1 ring-slate-800 overflow-hidden">
                  {/* Card header */}
                  <div className="px-6 py-4 border-b border-slate-800/60 flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 ring-1 ring-amber-500/20">
                      <Hash className="h-3.5 w-3.5 text-amber-400" />
                    </div>
                    <span className="text-sm font-semibold text-slate-300">
                      Up Next
                    </span>
                    {queueCount > 0 && (
                      <Badge
                        variant="outline"
                        className="ml-auto text-[10px] border-slate-700 text-slate-500 h-5 px-1.5"
                      >
                        {queueCount}
                      </Badge>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="p-4">
                    {isLoading ? (
                      <div className="flex items-center gap-3 py-6">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-amber-400" />
                        <span className="text-sm text-slate-500">Loading queue...</span>
                      </div>
                    ) : queue && queue.length > 0 ? (
                      <ul className="space-y-2">
                        {queue.map((entry, index) => (
                          <motion.li
                            key={entry.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.06, duration: 0.3 }}
                            className="flex items-center gap-3 rounded-xl bg-slate-800/40 px-3 py-2.5 ring-1 ring-slate-800/60"
                          >
                            <QueuePositionBadge index={index} />
                            <span className="text-sm font-medium text-slate-300 truncate flex-1">
                              {entry.name}
                            </span>
                            {index === 0 && (
                              <ArrowRight className="h-3.5 w-3.5 text-emerald-500/60 shrink-0" />
                            )}
                          </motion.li>
                        ))}
                      </ul>
                    ) : (
                      <div className="py-8 text-center">
                        <Users className="mx-auto h-8 w-8 text-slate-800" />
                        <p className="mt-2 text-sm text-slate-600">Queue is empty</p>
                        <p className="text-xs text-slate-700 mt-1">
                          Guests will appear here when added
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Footer ── */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative h-5 w-5 rounded overflow-hidden opacity-40">
              <Image
                src="/umak-csoa-logo.png"
                alt=""
                fill
                sizes="20px"
                className="object-contain"
              />
            </div>
            <p className="text-[11px] text-slate-700">
              University of Makati &middot; Center for Student Organization &amp; Activities
            </p>
          </div>
          <p className="text-[11px] text-slate-800">
            UMak CSOA Photobooth
          </p>
        </div>
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Active Session Content Sub-component                               */
/* ------------------------------------------------------------------ */

function ActiveSessionContent({ session }: { session: ActiveSession }) {
  const elapsed = useLiveTimer(session.startedAt)

  return (
    <div className="space-y-6">
      {/* Guest name — large and prominent */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-slate-600">
          Guest Name
        </p>
        <p className="mt-1.5 text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
          {session.guestName}
        </p>
      </div>

      {/* Session info grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
        {/* Elapsed Timer */}
        <div className="col-span-2 sm:col-span-1">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-600 mb-2">
            <Clock className="inline h-3 w-3 mr-1 -mt-0.5" />
            Elapsed
          </p>
          <div className="text-2xl lg:text-3xl font-mono font-bold text-emerald-400 tracking-wider">
            <TimerDisplay display={elapsed.display} />
          </div>
        </div>

        {/* Contact info */}
        {session.guestEmail && (
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-slate-600 mb-2">
              Email
            </p>
            <p className="text-sm text-slate-400 break-all leading-relaxed">
              {session.guestEmail}
            </p>
          </div>
        )}

        {session.guestPhone && (
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-slate-600 mb-2">
              Phone
            </p>
            <p className="text-sm text-slate-400 leading-relaxed">
              {session.guestPhone}
            </p>
          </div>
        )}
      </div>

      {/* Notes */}
      {session.notes && (
        <div className="rounded-xl bg-slate-800/40 p-4 ring-1 ring-slate-800/60">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-600 mb-1.5">
            Notes
          </p>
          <p className="text-sm text-slate-400 leading-relaxed">{session.notes}</p>
        </div>
      )}
    </div>
  )
}
