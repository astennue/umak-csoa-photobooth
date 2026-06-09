'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  ListOrdered,
  Plus,
  LayoutGrid,
  TableIcon,
  Bell,
  Play,
  CheckCircle2,
  SkipForward,
  XCircle,
  Clock,
  User,
  Mail,
  Phone,
} from 'lucide-react'

// --- Types ---
interface QueueEvent {
  id: string
  name: string
}

interface QueueSession {
  id: string
  guestName: string
}

interface QueueEntry {
  id: string
  eventId: string
  sessionId: string | null
  position: number
  status: string
  name: string
  email: string | null
  phone: string | null
  notifiedAt: string | null
  activatedAt: string | null
  completedAt: string | null
  createdAt: string
  event: QueueEvent
  queueSession: QueueSession | null
}

interface EventOption {
  id: string
  name: string
}

interface PaginatedResponse {
  success: boolean
  data: QueueEntry[]
  total: number
  page: number
  limit: number
}

// --- Status helpers ---
const STATUS_TRANSITIONS: Record<string, string[]> = {
  WAITING: ['NOTIFIED', 'SKIPPED', 'CANCELLED'],
  NOTIFIED: ['ACTIVE', 'SKIPPED', 'CANCELLED'],
  ACTIVE: ['COMPLETED', 'SKIPPED', 'CANCELLED'],
  COMPLETED: [],
  SKIPPED: [],
  CANCELLED: [],
}

const STATUS_LABELS: Record<string, string> = {
  WAITING: 'Waiting',
  NOTIFIED: 'Notified',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  SKIPPED: 'Skipped',
  CANCELLED: 'Cancelled',
}

const BOARD_COLUMNS = [
  { key: 'WAITING', label: 'Waiting', statuses: ['WAITING', 'NOTIFIED'] },
  { key: 'ACTIVE', label: 'Active', statuses: ['ACTIVE'] },
  { key: 'COMPLETED', label: 'Completed', statuses: ['COMPLETED', 'SKIPPED', 'CANCELLED'] },
]

function QueueStatusBadge({ status }: { status: string }) {
  const colorClasses: Record<string, string> = {
    WAITING: 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-300 dark:border-amber-700',
    NOTIFIED: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-700',
    ACTIVE: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700',
    COMPLETED: 'bg-slate-100 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-600',
    SKIPPED: 'bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-300 dark:border-orange-700',
    CANCELLED: 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 border border-red-300 dark:border-red-700',
  }

  return (
    <Badge variant="secondary" className={colorClasses[status] || ''}>
      {STATUS_LABELS[status] || status}
    </Badge>
  )
}

// --- Time waiting helper ---
function getTimeWaiting(createdAt: string, completedAt: string | null, status: string): string {
  const end = completedAt
    ? new Date(completedAt)
    : new Date()
  const start = new Date(createdAt)
  const diffMs = end.getTime() - start.getTime()

  if (diffMs < 0) return '0m'
  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) return `${hours}h ${minutes % 60}m`
  return `${minutes}m`
}

// --- Form state ---
interface QueueFormData {
  eventId: string
  name: string
  email: string
  phone: string
}

const emptyForm: QueueFormData = {
  eventId: '',
  name: '',
  email: '',
  phone: '',
}

// --- Queue Card for Board View ---
function QueueCard({
  entry,
  onStatusChange,
}: {
  entry: QueueEntry
  onStatusChange: (id: string, status: string) => void
}) {
  const transitions = STATUS_TRANSITIONS[entry.status] || []
  const isTerminal = transitions.length === 0

  return (
    <Card className="mb-3 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{entry.name}</p>
            <p className="text-xs text-muted-foreground">#{entry.position}</p>
          </div>
          <QueueStatusBadge status={entry.status} />
        </div>

        {entry.email && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Mail className="size-3 shrink-0" />
            <span className="truncate">{entry.email}</span>
          </div>
        )}
        {entry.phone && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Phone className="size-3 shrink-0" />
            <span>{entry.phone}</span>
          </div>
        )}
        {entry.queueSession && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <User className="size-3 shrink-0" />
            <span className="truncate">Session: {entry.queueSession.guestName}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <Clock className="size-3 shrink-0" />
          <span>Waiting: {getTimeWaiting(entry.createdAt, entry.completedAt, entry.status)}</span>
        </div>

        {/* Action Buttons */}
        {!isTerminal && (
          <div className="flex flex-wrap gap-1.5">
            {transitions.includes('NOTIFIED') && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 border-cyan-300 text-cyan-700 hover:bg-cyan-50 dark:border-cyan-700 dark:text-cyan-400 dark:hover:bg-cyan-950"
                onClick={() => onStatusChange(entry.id, 'NOTIFIED')}
              >
                <Bell className="size-3" />
                Notify
              </Button>
            )}
            {transitions.includes('ACTIVE') && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950"
                onClick={() => onStatusChange(entry.id, 'ACTIVE')}
              >
                <Play className="size-3" />
                Activate
              </Button>
            )}
            {transitions.includes('COMPLETED') && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
                onClick={() => onStatusChange(entry.id, 'COMPLETED')}
              >
                <CheckCircle2 className="size-3" />
                Complete
              </Button>
            )}
            {transitions.includes('SKIPPED') && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950"
                onClick={() => onStatusChange(entry.id, 'SKIPPED')}
              >
                <SkipForward className="size-3" />
                Skip
              </Button>
            )}
            {transitions.includes('CANCELLED') && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
                onClick={() => onStatusChange(entry.id, 'CANCELLED')}
              >
                <XCircle className="size-3" />
                Cancel
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Main Component ---
export default function QueuePage() {
  const queryClient = useQueryClient()
  const { selectedEventId } = useAppStore()
  const { data: session } = useSession()
  const currentRole = (session?.user as any)?.role as string | undefined
  const currentOrgId = (session?.user as any)?.organizationId as string | undefined

  // Filters & View
  const [eventFilter, setEventFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<QueueFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  // Build query params — fetch more for board view
  const queryParams = new URLSearchParams()
  queryParams.set('page', '1')
  queryParams.set('limit', '50')
  const activeEventId = eventFilter === 'all' ? (selectedEventId || '') : eventFilter
  if (activeEventId) queryParams.set('eventId', activeEventId)
  if (currentRole) queryParams.set('userRole', currentRole)
  if (currentOrgId) queryParams.set('userOrgId', currentOrgId)

  // Fetch queue entries
  const { data: queueData, isLoading: queueLoading, isError: queueError, refetch: refetchQueue } = useQuery<PaginatedResponse>({
    queryKey: ['queue', activeEventId, currentRole, currentOrgId],
    queryFn: () => fetch(`/api/queue?${queryParams.toString()}`).then(r => r.json()),
    retry: 2,
  })

  // Fetch events for dropdowns - scoped to org
  const eventsParams = new URLSearchParams({ limit: '100' })
  if (currentRole) eventsParams.set('userRole', currentRole)
  if (currentOrgId) eventsParams.set('userOrgId', currentOrgId)

  const { data: eventsData } = useQuery<{ success: boolean; data: EventOption[] }>({
    queryKey: ['events-list', currentRole, currentOrgId],
    queryFn: () => fetch(`/api/events?${eventsParams.toString()}`).then(r => r.json()),
    retry: 2,
  })

  const events = eventsData?.data || []
  const entries = queueData?.data || []

  // Group entries for board view
  const boardGroups = useMemo(() => {
    const groups: Record<string, QueueEntry[]> = {
      WAITING: [],
      ACTIVE: [],
      COMPLETED: [],
    }
    entries.forEach((entry) => {
      if (entry.status === 'WAITING' || entry.status === 'NOTIFIED') {
        groups.WAITING.push(entry)
      } else if (entry.status === 'ACTIVE') {
        groups.ACTIVE.push(entry)
      } else {
        groups.COMPLETED.push(entry)
      }
    })
    return groups
  }, [entries])

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: QueueFormData) =>
      fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userRole: currentRole, userOrgId: currentOrgId }),
      }).then(r => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Added to queue', { description: `${res.data.name} has been added to the queue at position #${res.data.position}.` })
        queryClient.invalidateQueries({ queryKey: ['queue'] })
        setCreateOpen(false)
        setForm(emptyForm)
      } else {
        toast.error('Error', { description: res.error || 'Failed to add to queue' })
      }
      setSubmitting(false)
    },
    onError: () => {
      toast.error('Error', { description: 'Failed to add to queue' })
      setSubmitting(false)
    },
  })

  const patchStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/queue/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).then(r => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Status updated', { description: `Queue entry updated to ${STATUS_LABELS[res.data.status] || res.data.status}.` })
        queryClient.invalidateQueries({ queryKey: ['queue'] })
      } else {
        toast.error('Error', { description: res.error || 'Failed to update status' })
      }
    },
    onError: () => {
      toast.error('Error', { description: 'Failed to update status' })
    },
  })

  // Handlers
  function handleCreate() {
    if (!form.eventId || !form.name.trim()) {
      toast.error('Validation Error', { description: 'Event and Name are required.' })
      return
    }
    setSubmitting(true)
    createMutation.mutate(form)
  }

  function handleStatusChange(id: string, status: string) {
    patchStatusMutation.mutate({ id, status })
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Column header color helper
  const columnHeaderColors: Record<string, string> = {
    WAITING: 'border-amber-300 dark:border-amber-700',
    ACTIVE: 'border-emerald-300 dark:border-emerald-700',
    COMPLETED: 'border-slate-300 dark:border-slate-600',
  }

  const columnCountBg: Record<string, string> = {
    WAITING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    COMPLETED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Queue</h1>
          <p className="text-muted-foreground">Manage the photo session queue for your events.</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setCreateOpen(true) }} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
          <Plus className="size-4 mr-2" />
          Add to Queue
        </Button>
      </div>

      {/* Filters & View Toggle */}
      <Card className="border-l-4 border-l-emerald-500">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Event</Label>
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'board' | 'table')} className="shrink-0">
              <TabsList className="h-9">
                <TabsTrigger value="board" className="gap-1.5 px-3">
                  <LayoutGrid className="size-3.5" />
                  Board
                </TabsTrigger>
                <TabsTrigger value="table" className="gap-1.5 px-3">
                  <TableIcon className="size-3.5" />
                  Table
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Board View */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BOARD_COLUMNS.map((col) => {
            const colEntries = boardGroups[col.key] || []
            return (
              <div key={col.key} className="flex flex-col">
                <div className={`flex items-center justify-between mb-3 pb-2 border-b-2 ${columnHeaderColors[col.key]}`}>
                  <h3 className="font-semibold text-sm">{col.label}</h3>
                  <Badge variant="secondary" className={columnCountBg[col.key]}>
                    {colEntries.length}
                  </Badge>
                </div>
                <div className="flex-1 min-h-0">
                  {queueLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : queueError ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <p className="text-sm text-destructive">Failed to load queue.</p>
                      <Button variant="outline" size="sm" onClick={() => refetchQueue()}>
                        Retry
                      </Button>
                    </div>
                  ) : colEntries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-2">
                        <ListOrdered className="size-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <p className="text-sm text-muted-foreground">No entries</p>
                    </div>
                  ) : (
                    <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-0 scrollbar-thin">
                      {colEntries.map((entry) => (
                        <QueueCard
                          key={entry.id}
                          entry={entry}
                          onStatusChange={handleStatusChange}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListOrdered className="size-4" />
              Queue Entries
              {queueData && (
                <span className="text-muted-foreground font-normal text-sm">
                  ({queueData.total} total)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {queueLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : queueError ? (
              <div className="p-6 flex flex-col items-center gap-3">
                <p className="text-sm text-destructive">Failed to load queue entries.</p>
                <Button variant="outline" size="sm" onClick={() => refetchQueue()}>
                  Retry
                </Button>
              </div>
            ) : entries.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-2 mx-auto">
                  <ListOrdered className="size-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-muted-foreground">No queue entries found.</p>
                <p className="text-sm">Add someone to the queue to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="hidden lg:table-cell">Phone</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Wait Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => {
                      const transitions = STATUS_TRANSITIONS[entry.status] || []
                      const isTerminal = transitions.length === 0
                      return (
                        <TableRow key={entry.id} className="hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                          <TableCell className="font-mono text-muted-foreground">
                            {entry.position}
                          </TableCell>
                          <TableCell className="font-medium">{entry.name}</TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                            {entry.email || '—'}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                            {entry.phone || '—'}
                          </TableCell>
                          <TableCell className="text-sm">{entry.event?.name || '—'}</TableCell>
                          <TableCell>
                            <QueueStatusBadge status={entry.status} />
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                            {getTimeWaiting(entry.createdAt, entry.completedAt, entry.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            {!isTerminal && (
                              <div className="flex items-center justify-end gap-1">
                                {transitions.includes('NOTIFIED') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1 border-cyan-300 text-cyan-700 hover:bg-cyan-50 dark:border-cyan-700 dark:text-cyan-400 dark:hover:bg-cyan-950"
                                    onClick={() => handleStatusChange(entry.id, 'NOTIFIED')}
                                  >
                                    <Bell className="size-3" />
                                    <span className="hidden xl:inline">Notify</span>
                                  </Button>
                                )}
                                {transitions.includes('ACTIVE') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950"
                                    onClick={() => handleStatusChange(entry.id, 'ACTIVE')}
                                  >
                                    <Play className="size-3" />
                                    <span className="hidden xl:inline">Activate</span>
                                  </Button>
                                )}
                                {transitions.includes('COMPLETED') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1 border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
                                    onClick={() => handleStatusChange(entry.id, 'COMPLETED')}
                                  >
                                    <CheckCircle2 className="size-3" />
                                    <span className="hidden xl:inline">Complete</span>
                                  </Button>
                                )}
                                {transitions.includes('SKIPPED') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1 border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950"
                                    onClick={() => handleStatusChange(entry.id, 'SKIPPED')}
                                  >
                                    <SkipForward className="size-3" />
                                    <span className="hidden xl:inline">Skip</span>
                                  </Button>
                                )}
                                {transitions.includes('CANCELLED') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
                                    onClick={() => handleStatusChange(entry.id, 'CANCELLED')}
                                  >
                                    <XCircle className="size-3" />
                                    <span className="hidden xl:inline">Cancel</span>
                                  </Button>
                                )}
                              </div>
                            )}
                            {isTerminal && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add to Queue Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Queue</DialogTitle>
            <DialogDescription>Add a new person to the event queue.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="queue-event">Event *</Label>
              <Select value={form.eventId} onValueChange={(v) => setForm(f => ({ ...f, eventId: v }))}>
                <SelectTrigger id="queue-event">
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="queue-name">Name *</Label>
              <Input
                id="queue-name"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Enter name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="queue-email">Email</Label>
              <Input
                id="queue-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="person@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="queue-phone">Phone</Label>
              <Input
                id="queue-phone"
                value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting || !form.eventId || !form.name.trim()} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
              {submitting ? 'Adding...' : 'Add to Queue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
