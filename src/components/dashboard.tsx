'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAppStore } from '@/lib/store'
import {
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Users,
  Camera,
  ImageIcon,
  Monitor,
  ArrowRight,
} from 'lucide-react'
import { format } from 'date-fns'

// ─── Types ───────────────────────────────────────────────────────────────────

interface RecentSession {
  id: string
  eventId: string
  guestName: string
  guestEmail: string
  status: string
  createdAt: string
  event: { id: string; name: string }
}

interface AnalyticsData {
  totalOrganizations: number
  totalEvents: number
  totalSessions: number
  totalQueueEntries: number
  activeEvents: number
  completedSessions: number
  waitingInQueue: number
  totalGallery: number
  totalDevices: number
  recentSessions: RecentSession[]
}

interface AnalyticsResponse {
  success: boolean
  data: AnalyticsData
}

// ─── Status Badge Helper ─────────────────────────────────────────────────────

function getStatusBadge(status: string) {
  const config: Record<string, { label: string; className: string }> = {
    SCHEDULED: {
      label: 'Scheduled',
      className:
        'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
    },
    IN_PROGRESS: {
      label: 'In Progress',
      className:
        'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    },
    COMPLETED: {
      label: 'Completed',
      className:
        'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    },
    CANCELLED: {
      label: 'Cancelled',
      className:
        'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    },
    ACTIVE: {
      label: 'Active',
      className:
        'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    },
    DRAFT: {
      label: 'Draft',
      className:
        'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
    },
    WAITING: {
      label: 'Waiting',
      className:
        'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    },
  }

  const c = config[status] ?? {
    label: status,
    className:
      'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  }

  return (
    <Badge variant="outline" className={c.className}>
      {c.label}
    </Badge>
  )
}

// ─── Skeleton Loaders ────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-5 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  )
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Primary Stat Card ───────────────────────────────────────────────────────

interface PrimaryStatCardProps {
  title: string
  value: number
  description: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
}

function PrimaryStatCard({
  title,
  value,
  description,
  icon: Icon,
  iconBg,
  iconColor,
}: PrimaryStatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div
        className={`absolute inset-0 ${iconBg} opacity-40 dark:opacity-20 pointer-events-none`}
      />
      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div
          className={`flex size-9 items-center justify-center rounded-lg ${iconBg}`}
        >
          <Icon className={`size-5 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}

// ─── Secondary Stat Card ─────────────────────────────────────────────────────

interface SecondaryStatCardProps {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
}

function SecondaryStatCard({
  title,
  value,
  icon: Icon,
}: SecondaryStatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

// ─── Queue Overview ──────────────────────────────────────────────────────────

interface QueueOverviewProps {
  waiting: number
  active: number
  completed: number
}

function QueueOverview({ waiting, active, completed }: QueueOverviewProps) {
  const total = waiting + active + completed
  const waitPct = total > 0 ? (waiting / total) * 100 : 0
  const activePct = total > 0 ? (active / total) * 100 : 0
  const completedPct = total > 0 ? (completed / total) * 100 : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Queue Overview</CardTitle>
        <CardDescription>
          Current status of all queue entries
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Visual bar */}
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
          {completedPct > 0 && (
            <div
              className="bg-emerald-500 transition-all"
              style={{ width: `${completedPct}%` }}
            />
          )}
          {activePct > 0 && (
            <div
              className="bg-amber-500 transition-all"
              style={{ width: `${activePct}%` }}
            />
          )}
          {waitPct > 0 && (
            <div
              className="bg-sky-500 transition-all"
              style={{ width: `${waitPct}%` }}
            />
          )}
        </div>

        {/* Legend items */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center gap-1.5 rounded-lg border p-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/30">
              <Clock className="size-4 text-sky-600 dark:text-sky-400" />
            </div>
            <span className="text-2xl font-bold">{waiting}</span>
            <span className="text-xs text-muted-foreground">Waiting</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 rounded-lg border p-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Users className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-2xl font-bold">{active}</span>
            <span className="text-xs text-muted-foreground">Active</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 rounded-lg border p-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-2xl font-bold">{completed}</span>
            <span className="text-xs text-muted-foreground">Completed</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Recent Sessions Table ───────────────────────────────────────────────────

interface RecentSessionsTableProps {
  sessions: RecentSession[]
}

function RecentSessionsTable({ sessions }: RecentSessionsTableProps) {
  const { setCurrentPage, setSelectedEventId } = useAppStore()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Recent Sessions</CardTitle>
            <CardDescription>
              Latest 5 sessions across all events
            </CardDescription>
          </div>
          <button
            onClick={() => setCurrentPage('sessions')}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all <ArrowRight className="size-3" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guest</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  No sessions found.
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((session) => (
                <TableRow
                  key={session.id}
                  className="cursor-pointer"
                  onClick={() => setCurrentPage('sessions')}
                >
                  <TableCell>
                    <div>
                      <div className="font-medium">{session.guestName}</div>
                      <div className="text-xs text-muted-foreground">
                        {session.guestEmail}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <button
                      className="text-sm hover:underline underline-offset-4 text-left"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedEventId(session.event.id)
                        setCurrentPage('events')
                      }}
                    >
                      {session.event.name}
                    </button>
                  </TableCell>
                  <TableCell>{getStatusBadge(session.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(session.createdAt), 'MMM d, yyyy h:mm a')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ─── Main Dashboard Page ─────────────────────────────────────────────────────

export default function DashboardPage() {
  const { setCurrentPage } = useAppStore()

  const { data, isLoading, isError } = useQuery<AnalyticsResponse>({
    queryKey: ['analytics'],
    queryFn: () => fetch('/api/analytics').then((r) => r.json()),
  })

  const analytics = data?.data

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your photobooth management system.
        </p>
      </div>

      {/* ── Primary Stats Row ────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <Card className="border-destructive/50">
          <CardContent className="p-6">
            <p className="text-sm text-destructive">
              Failed to load analytics data. Please try again later.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <PrimaryStatCard
            title="Organizations"
            value={analytics?.totalOrganizations ?? 0}
            description="Total registered organizations"
            icon={Building2}
            iconBg="bg-violet-100 dark:bg-violet-900/30"
            iconColor="text-violet-600 dark:text-violet-400"
          />
          <PrimaryStatCard
            title="Active Events"
            value={analytics?.activeEvents ?? 0}
            description="Events currently running"
            icon={Calendar}
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
            iconColor="text-emerald-600 dark:text-emerald-400"
          />
          <PrimaryStatCard
            title="Completed Sessions"
            value={analytics?.completedSessions ?? 0}
            description="Sessions finished successfully"
            icon={CheckCircle}
            iconBg="bg-sky-100 dark:bg-sky-900/30"
            iconColor="text-sky-600 dark:text-sky-400"
          />
          <PrimaryStatCard
            title="Queue Waiting"
            value={analytics?.waitingInQueue ?? 0}
            description="Guests currently in queue"
            icon={Clock}
            iconBg="bg-amber-100 dark:bg-amber-900/30"
            iconColor="text-amber-600 dark:text-amber-400"
          />
        </div>
      )}

      {/* ── Secondary Stats Row ──────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <SecondaryStatCard
            title="Total Events"
            value={analytics?.totalEvents ?? 0}
            icon={Calendar}
          />
          <SecondaryStatCard
            title="Total Sessions"
            value={analytics?.totalSessions ?? 0}
            icon={Users}
          />
          <SecondaryStatCard
            title="Gallery Photos"
            value={analytics?.totalGallery ?? 0}
            icon={ImageIcon}
          />
          <SecondaryStatCard
            title="Total Devices"
            value={analytics?.totalDevices ?? 0}
            icon={Monitor}
          />
        </div>
      )}

      {/* ── Bottom Section: Table + Queue Overview ───────────────────────── */}
      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TableSkeleton />
          </div>
          <div>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-3 w-full rounded-full" />
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex flex-col items-center gap-2 rounded-lg border p-3"
                    >
                      <Skeleton className="size-8 rounded-full" />
                      <Skeleton className="h-6 w-8" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Sessions — takes 2/3 width on large screens */}
          <div className="lg:col-span-2">
            <RecentSessionsTable
              sessions={analytics?.recentSessions ?? []}
            />
          </div>

          {/* Queue Overview — takes 1/3 width on large screens */}
          <div>
            <QueueOverview
              waiting={analytics?.waitingInQueue ?? 0}
              active={analytics?.activeEvents ?? 0}
              completed={analytics?.completedSessions ?? 0}
            />
          </div>
        </div>
      )}

      {/* ── Quick Actions ────────────────────────────────────────────────── */}
      {!isLoading && analytics && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => setCurrentPage('events')}
          >
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Calendar className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">
                  Manage Events
                </CardTitle>
                <CardDescription className="text-xs">
                  View and manage all events
                </CardDescription>
              </div>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => setCurrentPage('sessions')}
          >
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
              <div className="flex size-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
                <Camera className="size-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">
                  View Sessions
                </CardTitle>
                <CardDescription className="text-xs">
                  Browse all photobooth sessions
                </CardDescription>
              </div>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => setCurrentPage('queue')}
          >
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">
                  Manage Queue
                </CardTitle>
                <CardDescription className="text-xs">
                  Handle guest queues
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </div>
      )}
    </div>
  )
}
