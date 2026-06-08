'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Radio, Users, Clock, CheckCircle } from 'lucide-react'

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
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatElapsedTime(startedAt: string | null | undefined): string {
  if (!startedAt) return '--:--'
  const start = new Date(startedAt).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - start)

  const hours = Math.floor(diff / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  const seconds = Math.floor((diff % 60_000) / 1_000)

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LiveDisplay() {
  const {
    data: sessions,
    isLoading: sessionsLoading,
  } = useQuery({
    queryKey: ['sessions', 'IN_PROGRESS'],
    queryFn: fetchActiveSessions,
    refetchInterval: 5000,
  })

  const {
    data: queue,
    isLoading: queueLoading,
  } = useQuery({
    queryKey: ['queue', 'WAITING'],
    queryFn: fetchQueue,
    refetchInterval: 5000,
  })

  const activeSession = sessions?.[0] ?? null
  const isLoading = sessionsLoading && queueLoading

  /* ── No Active Session State ── */
  if (!isLoading && !activeSession) {
    return (
      <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-lg">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-stone-800 ring-1 ring-stone-700">
            <Radio className="h-10 w-10 text-stone-500" />
          </div>
          <h1 className="text-3xl font-bold text-stone-300">No Active Session</h1>
          <p className="mt-3 text-lg text-stone-500">
            Waiting for a facilitator to start a session...
          </p>
          <div className="mt-8 flex items-center justify-center gap-2 text-stone-600">
            <Clock className="h-4 w-4 animate-pulse" />
            <span className="text-sm">Monitoring for new sessions</span>
          </div>
        </div>
      </div>
    )
  }

  /* ── Active Session Display ── */
  return (
    <div className="min-h-screen bg-stone-900 p-6 lg:p-10">
      {/* Top bar */}
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-900/50 ring-1 ring-teal-800/50">
            <Radio className="h-5 w-5 text-teal-400" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-white">Live Display</h1>
            <p className="text-xs text-stone-500">UMak CSOA Photobooth</p>
          </div>
        </div>
        <Badge className="bg-teal-800 text-teal-100 border-teal-700 text-xs px-3 py-1">
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
          LIVE
        </Badge>
      </header>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Current Session Card (spans 2 cols) ── */}
        <Card className="lg:col-span-2 bg-stone-800 border-stone-700 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-teal-400" />
              <CardTitle className="text-stone-200 text-base lg:text-lg">
                Current Session
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-3 py-6">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-600 border-t-teal-400" />
                <span className="text-stone-400">Loading session...</span>
              </div>
            ) : activeSession ? (
              <div className="space-y-5">
                {/* Guest name — big and readable */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
                    Guest
                  </p>
                  <p className="mt-1 text-3xl lg:text-4xl font-bold text-white">
                    {activeSession.guestName}
                  </p>
                </div>

                {/* Session details row */}
                <div className="flex flex-wrap gap-x-8 gap-y-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
                      Event
                    </p>
                    <p className="mt-0.5 text-base lg:text-lg font-medium text-stone-200">
                      {activeSession.event.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
                      Status
                    </p>
                    <Badge className="mt-1 bg-amber-900/50 text-amber-300 border-amber-800/50 text-xs">
                      In Progress
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
                      Elapsed
                    </p>
                    <p className="mt-0.5 text-base lg:text-lg font-mono font-medium text-teal-400">
                      {formatElapsedTime(activeSession.startedAt)}
                    </p>
                  </div>
                </div>

                {/* Notes if present */}
                {activeSession.notes && (
                  <div className="rounded-lg bg-stone-900/50 p-3 ring-1 ring-stone-700/50">
                    <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
                      Notes
                    </p>
                    <p className="mt-1 text-sm text-stone-300">{activeSession.notes}</p>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* ── Queue Card (1 col) ── */}
        <Card className="bg-stone-800 border-stone-700 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-stone-200 text-base lg:text-lg">
                Up Next
              </CardTitle>
              {queue && queue.length > 0 && (
                <Badge variant="outline" className="ml-auto text-xs border-stone-600 text-stone-400">
                  {queue.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-3 py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-600 border-t-amber-400" />
                <span className="text-sm text-stone-400">Loading queue...</span>
              </div>
            ) : queue && queue.length > 0 ? (
              <ul className="space-y-3">
                {queue.map((entry, index) => (
                  <li
                    key={entry.id}
                    className="flex items-center gap-3 rounded-lg bg-stone-900/50 px-3 py-2.5 ring-1 ring-stone-700/50"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-900/40 text-sm font-bold text-amber-400 ring-1 ring-amber-800/40">
                      {index + 1}
                    </span>
                    <span className="text-sm lg:text-base font-medium text-stone-200 truncate">
                      {entry.name}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-6 text-center">
                <Users className="mx-auto h-8 w-8 text-stone-600" />
                <p className="mt-2 text-sm text-stone-500">Queue is empty</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="mt-8 border-t border-stone-800 pt-4 text-center">
        <p className="text-xs text-stone-600">
          University of Makati &middot; Center for Student Organization &amp; Activities
        </p>
      </footer>
    </div>
  )
}
