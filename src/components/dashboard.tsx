'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  RefreshCw,
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
  activeQueueEntries: number
  completedQueueEntries: number
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
        'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700',
    },
    IN_PROGRESS: {
      label: 'In Progress',
      className:
        'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
    },
    COMPLETED: {
      label: 'Completed',
      className:
        'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
    },
    CANCELLED: {
      label: 'Cancelled',
      className:
        'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
    },
    ACTIVE: {
      label: 'Active',
      className:
        'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
    },
    DRAFT: {
      label: 'Draft',
      className:
        'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    },
    WAITING: {
      label: 'Waiting',
      className:
        'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
    },
  }

  const c = config[status] ?? {
    label: status,
    className:
      'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
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
  gradient: string
}

function PrimaryStatCard({
  title,
  value,
  description,
  icon: Icon,
  gradient,
}: PrimaryStatCardProps) {
  return (
    <Card className={`bg-gradient-to-br ${gradient} text-white border-0 shadow-lg`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-white/80">{title}</CardTitle>
        <div className="flex size-9 items-center justify-center rounded-lg bg-white/20">
          <Icon className="size-5 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        <p className="text-xs text-white/70 mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}

// ─── Secondary Stat Card ─────────────────────────────────────────────────────

interface SecondaryStatCardProps {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  borderColor: string
  iconBg: string
  iconColor: string
}

function SecondaryStatCard({
  title,
  value,
  icon: Icon,
  borderColor,
  iconBg,
  iconColor,
}: SecondaryStatCardProps) {
  return (
    <Card className={`border-l-4 ${borderColor} shadow-sm`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`flex size-8 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`size-4 ${iconColor}`} />
        </div>
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
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Queue Overview</CardTitle>
        <CardDescription>
          Current status of all queue entries
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Visual gradient bar */}
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
          {completedPct > 0 && (
            <div
              className="bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
              style={{ width: `${completedPct}%` }}
            />
          )}
          {activePct > 0 && (
            <div
              className="bg-gradient-to-r from-amber-400 to-amber-600 transition-all"
              style={{ width: `${activePct}%` }}
            />
          )}
          {waitPct > 0 && (
            <div
              className="bg-gradient-to-r from-sky-400 to-sky-600 transition-all"
              style={{ width: `${waitPct}%` }}
            />
          )}
        </div>

        {/* Legend items */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 to-sky-100 p-3 dark:border-sky-800 dark:from-sky-950/50 dark:to-sky-900/30">
            <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-sky-600 shadow-sm">
              <Clock className="size-4 text-white" />
            </div>
            <span className="text-2xl font-bold text-sky-700 dark:text-sky-300">{waiting}</span>
            <span className="text-xs text-sky-600/70 dark:text-sky-400/70">Waiting</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 p-3 dark:border-amber-800 dark:from-amber-950/50 dark:to-amber-900/30">
            <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm">
              <Users className="size-4 text-white" />
            </div>
            <span className="text-2xl font-bold text-amber-700 dark:text-amber-300">{active}</span>
            <span className="text-xs text-amber-600/70 dark:text-amber-400/70">Active</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 p-3 dark:border-emerald-800 dark:from-emerald-950/50 dark:to-emerald-900/30">
            <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-sm">
              <CheckCircle className="size-4 text-white" />
            </div>
            <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{completed}</span>
            <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Completed</span>
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
    <Card className="shadow-sm">
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

// ─── Error Card ──────────────────────────────────────────────────────────────

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="border-destructive/50">
      <CardContent className="p-6 flex flex-col items-center gap-3">
        <p className="text-sm text-destructive">Failed to load analytics data.</p>
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCw className="size-3.5" />
          Retry
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Main Dashboard Page ─────────────────────────────────────────────────────

export default function DashboardPage() {
  const { setCurrentPage } = useAppStore()
  const { data: session } = useSession()
  const currentRole = (session?.user as any)?.role as string | undefined

  // Analytics API uses server-side getAuthContext() for auth scoping
  const { data, isLoading, isError, refetch } = useQuery<AnalyticsResponse>({
    queryKey: ['analytics'],
    queryFn: () => fetch('/api/analytics').then((r) => r.json()),
    retry: 2,
  })

  const analytics = data?.data

  // Determine which stats to show based on role
  const isSuperAdmin = currentRole === 'SUPER_ADMIN'
  const isOrgAdmin = currentRole === 'ORG_ADMIN'
  const isFacilitator = currentRole === 'FACILITATOR'
  const showOrgs = isSuperAdmin

  // Build primary stats based on role
  const primaryStats = []
  if (showOrgs) {
    primaryStats.push({
      title: 'Organizations',
      value: analytics?.totalOrganizations ?? 0,
      description: 'Total registered organizations',
      icon: Building2,
      gradient: 'from-violet-500 to-purple-700',
    })
  }
  primaryStats.push({
    title: 'Active Events',
    value: analytics?.activeEvents ?? 0,
    description: 'Events currently running',
    icon: Calendar,
    gradient: 'from-emerald-500 to-emerald-700',
  })
  primaryStats.push({
    title: 'Completed Sessions',
    value: analytics?.completedSessions ?? 0,
    description: 'Sessions finished successfully',
    icon: CheckCircle,
    gradient: 'from-teal-500 to-cyan-700',
  })
  primaryStats.push({
    title: 'Queue Waiting',
    value: analytics?.waitingInQueue ?? 0,
    description: 'Guests currently in queue',
    icon: Clock,
    gradient: 'from-amber-500 to-amber-700',
  })

  // Build secondary stats based on role
  const secondaryStats = []
  secondaryStats.push({
    title: 'Total Events',
    value: analytics?.totalEvents ?? 0,
    icon: Calendar,
    borderColor: 'border-l-violet-500',
    iconBg: 'bg-violet-100 dark:bg-violet-900/30',
    iconColor: 'text-violet-600 dark:text-violet-400',
  })
  secondaryStats.push({
    title: 'Total Sessions',
    value: analytics?.totalSessions ?? 0,
    icon: Users,
    borderColor: 'border-l-emerald-500',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  })
  if (!isFacilitator) {
    secondaryStats.push({
      title: 'Gallery Photos',
      value: analytics?.totalGallery ?? 0,
      icon: ImageIcon,
      borderColor: 'border-l-teal-500',
      iconBg: 'bg-teal-100 dark:bg-teal-900/30',
      iconColor: 'text-teal-600 dark:text-teal-400',
    })
    secondaryStats.push({
      title: 'Total Devices',
      value: analytics?.totalDevices ?? 0,
      icon: Monitor,
      borderColor: 'border-l-amber-500',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
    })
  }

  // Quick actions based on role
  const quickActions = []
  quickActions.push({
    label: 'Manage Events',
    desc: 'View and manage all events',
    icon: Calendar,
    page: 'events' as const,
    borderClass: 'border-l-emerald-500',
    hoverClass: 'hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20',
    gradientClass: 'from-emerald-400 to-emerald-600',
  })
  quickActions.push({
    label: 'View Sessions',
    desc: 'Browse all photobooth sessions',
    icon: Camera,
    page: 'sessions' as const,
    borderClass: 'border-l-sky-500',
    hoverClass: 'hover:bg-sky-50/50 dark:hover:bg-sky-950/20',
    gradientClass: 'from-sky-400 to-sky-600',
  })
  if (!isFacilitator) {
    quickActions.push({
      label: 'Manage Queue',
      desc: 'Handle guest queues',
      icon: Clock,
      page: 'queue' as const,
      borderClass: 'border-l-amber-500',
      hoverClass: 'hover:bg-amber-50/50 dark:hover:bg-amber-950/20',
      gradientClass: 'from-amber-400 to-amber-600',
    })
  }

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
        <ErrorCard onRetry={() => refetch()} />
      ) : (
        <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 ${primaryStats.length >= 4 ? 'lg:grid-cols-4' : primaryStats.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
          {primaryStats.map((stat) => (
            <PrimaryStatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              description={stat.description}
              icon={stat.icon}
              gradient={stat.gradient}
            />
          ))}
        </div>
      )}

      {/* ── Secondary Stats Row ──────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? null : (
        <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 ${secondaryStats.length >= 4 ? 'lg:grid-cols-4' : secondaryStats.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
          {secondaryStats.map((stat) => (
            <SecondaryStatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              borderColor={stat.borderColor}
              iconBg={stat.iconBg}
              iconColor={stat.iconColor}
            />
          ))}
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
      ) : isError ? null : (
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
              active={analytics?.activeQueueEntries ?? 0}
              completed={analytics?.completedQueueEntries ?? 0}
            />
          </div>
        </div>
      )}

      {/* ── Quick Actions ────────────────────────────────────────────────── */}
      {!isLoading && !isError && analytics && (
        <div className={`grid gap-4 grid-cols-1 ${quickActions.length >= 3 ? 'sm:grid-cols-3' : quickActions.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
          {quickActions.map((action) => (
            <Card
              key={action.label}
              className={`cursor-pointer border-l-4 ${action.borderClass} transition-all hover:shadow-md hover:-translate-y-0.5 ${action.hoverClass}`}
              onClick={() => setCurrentPage(action.page)}
            >
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                <div className={`flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${action.gradientClass} shadow-sm`}>
                  <action.icon className="size-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium">
                    {action.label}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {action.desc}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
