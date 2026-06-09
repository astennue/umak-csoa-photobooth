'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  Plus,
  MoreHorizontal,
  Play,
  CheckCircle2,
  XCircle,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react'

// --- Types ---
interface SessionEvent {
  id: string
  name: string
  organizationId: string
}

interface Session {
  id: string
  eventId: string
  guestName: string
  guestEmail: string | null
  guestPhone: string | null
  status: string
  notes: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  event: SessionEvent
  _count: { queueEntries: number; gallery: number }
}

interface EventOption {
  id: string
  name: string
}

interface PaginatedResponse {
  success: boolean
  data: Session[]
  total: number
  page: number
  limit: number
}

// --- Status helpers ---
const STATUS_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
}

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'secondary' | 'default' | 'destructive' | 'outline'> = {
    SCHEDULED: 'secondary',
    IN_PROGRESS: 'outline',
    COMPLETED: 'default',
    CANCELLED: 'destructive',
  }

  const colorClasses: Record<string, string> = {
    SCHEDULED: 'bg-slate-100 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-600',
    IN_PROGRESS: 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-300 dark:border-amber-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700',
    CANCELLED: 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 border border-red-300 dark:border-red-700',
  }

  return (
    <Badge variant={variants[status] || 'secondary'} className={colorClasses[status] || ''}>
      {STATUS_LABELS[status] || status}
    </Badge>
  )
}

// --- Form state ---
interface SessionFormData {
  eventId: string
  guestName: string
  guestEmail: string
  guestPhone: string
  notes: string
  status: string
}

const emptyForm: SessionFormData = {
  eventId: '',
  guestName: '',
  guestEmail: '',
  guestPhone: '',
  notes: '',
  status: 'SCHEDULED',
}

// --- Main Component ---
export default function SessionsPage() {
  const queryClient = useQueryClient()
  const { selectedEventId } = useAppStore()
  const { data: session } = useSession()
  const currentRole = (session?.user as any)?.role as string | undefined
  const currentOrgId = (session?.user as any)?.organizationId as string | undefined

  // Filters
  const [eventFilter, setEventFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const limit = 10

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [form, setForm] = useState<SessionFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  // Build query params
  const queryParams = new URLSearchParams()
  queryParams.set('page', String(page))
  queryParams.set('limit', String(limit))
  const activeEventId = eventFilter === 'all' ? (selectedEventId || '') : (eventFilter === 'none' ? '' : eventFilter)
  if (activeEventId) queryParams.set('eventId', activeEventId)
  if (statusFilter !== 'all') queryParams.set('status', statusFilter)
  if (currentRole) queryParams.set('userRole', currentRole)
  if (currentOrgId) queryParams.set('userOrgId', currentOrgId)

  // Fetch sessions
  const { data: sessionsData, isLoading: sessionsLoading, isError: sessionsError, refetch: refetchSessions } = useQuery<PaginatedResponse>({
    queryKey: ['sessions', page, activeEventId, statusFilter, currentRole, currentOrgId],
    queryFn: () => fetch(`/api/sessions?${queryParams.toString()}`).then(r => r.json()),
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
  const sessions = sessionsData?.data || []
  const totalPages = Math.ceil((sessionsData?.total || 0) / limit)

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: SessionFormData) =>
      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userRole: currentRole, userOrgId: currentOrgId }),
      }).then(r => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Session created', { description: 'New session has been created successfully.' })
        queryClient.invalidateQueries({ queryKey: ['sessions'] })
        setCreateOpen(false)
        setForm(emptyForm)
      } else {
        toast.error('Error', { description: res.error || 'Failed to create session' })
      }
      setSubmitting(false)
    },
    onError: () => {
      toast.error('Error', { description: 'Failed to create session' })
      setSubmitting(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SessionFormData> }) =>
      fetch(`/api/sessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Session updated', { description: 'Session has been updated successfully.' })
        queryClient.invalidateQueries({ queryKey: ['sessions'] })
        setEditOpen(false)
        setEditingSession(null)
        setForm(emptyForm)
      } else {
        toast.error('Error', { description: res.error || 'Failed to update session' })
      }
      setSubmitting(false)
    },
    onError: () => {
      toast.error('Error', { description: 'Failed to update session' })
      setSubmitting(false)
    },
  })

  const patchStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).then(r => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Status updated', { description: `Session status changed to ${STATUS_LABELS[res.data.status] || res.data.status}.` })
        queryClient.invalidateQueries({ queryKey: ['sessions'] })
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
    if (!form.eventId || !form.guestName.trim()) {
      toast.error('Validation Error', { description: 'Event and Guest Name are required.' })
      return
    }
    setSubmitting(true)
    createMutation.mutate(form)
  }

  function handleEdit() {
    if (!editingSession || !form.guestName.trim()) {
      toast.error('Validation Error', { description: 'Guest Name is required.' })
      return
    }
    setSubmitting(true)
    updateMutation.mutate({
      id: editingSession.id,
      data: {
        guestName: form.guestName,
        guestEmail: form.guestEmail,
        guestPhone: form.guestPhone,
        notes: form.notes,
        status: form.status,
      },
    })
  }

  function openEdit(session: Session) {
    setEditingSession(session)
    setForm({
      eventId: session.eventId,
      guestName: session.guestName,
      guestEmail: session.guestEmail || '',
      guestPhone: session.guestPhone || '',
      notes: session.notes || '',
      status: session.status,
    })
    setEditOpen(true)
  }

  function handleStatusAction(id: string, newStatus: string) {
    patchStatusMutation.mutate({ id, status: newStatus })
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

  const allowedTransitions = (status: string) => STATUS_TRANSITIONS[status] || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
          <p className="text-muted-foreground">Track and manage photobooth sessions.</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setCreateOpen(true) }} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
          <Plus className="size-4 mr-2" />
          Add Session
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-l-4 border-l-emerald-500">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Event</Label>
              <Select value={eventFilter} onValueChange={(v) => { setEventFilter(v); setPage(1) }}>
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
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Status</Label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" />
            Sessions
            {sessionsData && (
              <span className="text-muted-foreground font-normal text-sm">
                ({sessionsData.total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sessionsLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sessionsError ? (
            <div className="p-6 flex flex-col items-center gap-3">
              <p className="text-sm text-destructive">Failed to load sessions.</p>
              <Button variant="outline" size="sm" onClick={() => refetchSessions()}>
                Retry
              </Button>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-6 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mx-auto mb-2">
                <Users className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-muted-foreground">No sessions found.</p>
              <p className="text-sm text-muted-foreground">Create a new session to get started.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guest Name</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="hidden lg:table-cell">Phone</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Started At</TableHead>
                      <TableHead className="hidden lg:table-cell">Completed At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id} className="hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                        <TableCell className="font-medium">{session.guestName}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                          {session.guestEmail || '—'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                          {session.guestPhone || '—'}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{session.event?.name || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={session.status} />
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                          {formatDate(session.startedAt)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                          {formatDate(session.completedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(session)}>
                                <Pencil className="size-4 mr-2" />
                                Edit Session
                              </DropdownMenuItem>
                              {allowedTransitions(session.status).includes('IN_PROGRESS') && (
                                <DropdownMenuItem onClick={() => handleStatusAction(session.id, 'IN_PROGRESS')}>
                                  <Play className="size-4 mr-2" />
                                  Start Session
                                </DropdownMenuItem>
                              )}
                              {allowedTransitions(session.status).includes('COMPLETED') && (
                                <DropdownMenuItem onClick={() => handleStatusAction(session.id, 'COMPLETED')}>
                                  <CheckCircle2 className="size-4 mr-2" />
                                  Complete Session
                                </DropdownMenuItem>
                              )}
                              {allowedTransitions(session.status).includes('CANCELLED') && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleStatusAction(session.id, 'CANCELLED')}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <XCircle className="size-4 mr-2" />
                                    Cancel Session
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Session Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Session</DialogTitle>
            <DialogDescription>Add a new photobooth session for an event.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-event">Event *</Label>
              <Select value={form.eventId} onValueChange={(v) => setForm(f => ({ ...f, eventId: v }))}>
                <SelectTrigger id="create-event">
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
              <Label htmlFor="create-name">Guest Name *</Label>
              <Input
                id="create-name"
                value={form.guestName}
                onChange={(e) => setForm(f => ({ ...f, guestName: e.target.value }))}
                placeholder="Enter guest name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-email">Guest Email</Label>
              <Input
                id="create-email"
                type="email"
                value={form.guestEmail}
                onChange={(e) => setForm(f => ({ ...f, guestEmail: e.target.value }))}
                placeholder="guest@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-phone">Guest Phone</Label>
              <Input
                id="create-phone"
                value={form.guestPhone}
                onChange={(e) => setForm(f => ({ ...f, guestPhone: e.target.value }))}
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-notes">Notes</Label>
              <Textarea
                id="create-notes"
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting || !form.eventId || !form.guestName.trim()} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
              {submitting ? 'Creating...' : 'Create Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Session Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
            <DialogDescription>Update session details and status.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Event</Label>
              <Input value={editingSession?.event?.name || ''} disabled className="bg-muted" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Guest Name *</Label>
              <Input
                id="edit-name"
                value={form.guestName}
                onChange={(e) => setForm(f => ({ ...f, guestName: e.target.value }))}
                placeholder="Enter guest name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Guest Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={form.guestEmail}
                onChange={(e) => setForm(f => ({ ...f, guestEmail: e.target.value }))}
                placeholder="guest@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Guest Phone</Label>
              <Input
                id="edit-phone"
                value={form.guestPhone}
                onChange={(e) => setForm(f => ({ ...f, guestPhone: e.target.value }))}
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={submitting || !form.guestName.trim()} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
