'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import {
  Calendar,
  Plus,
  Search,
  Pencil,
  Eye,
  MapPin,
  Users,
  ListOrdered,
  ImageIcon,
  Monitor,
  Palette,
  ArrowRight,
  Info,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarPicker } from '@/components/ui/calendar'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { useAppStore } from '@/lib/store'

// --- Types ---
interface OrganizationOption {
  id: string
  name: string
}

interface EventItem {
  id: string
  name: string
  description: string | null
  organizationId: string
  location: string | null
  startDate: string
  endDate: string | null
  status: string
  maxSessions: number
  createdAt: string
  updatedAt: string
  organization: { id: string; name: string }
  _count: {
    sessions: number
    queueEntries: number
    templates: number
    gallery: number
    devices: number
  }
}

interface EventsResponse {
  success: boolean
  data: EventItem[]
  total: number
  page: number
  limit: number
}

interface OrgsListResponse {
  success: boolean
  data: OrganizationOption[]
  total: number
}

interface EventFormData {
  name: string
  description: string
  organizationId: string
  location: string
  startDate: string
  endDate: string
  status: string
  maxSessions: number
}

const defaultFormData: EventFormData = {
  name: '',
  description: '',
  organizationId: '',
  location: '',
  startDate: '',
  endDate: '',
  status: 'DRAFT',
  maxSessions: 100,
}

const EVENT_STATUSES = ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'] as const

const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['PAUSED', 'COMPLETED', 'CANCELLED'],
  PAUSED: ['ACTIVE', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'ACTIVE':
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20">Active</Badge>
    case 'PAUSED':
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/20">Paused</Badge>
    case 'COMPLETED':
      return <Badge className="bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/25 hover:bg-cyan-500/20">Completed</Badge>
    case 'CANCELLED':
      return <Badge variant="destructive">Cancelled</Badge>
    case 'DRAFT':
    default:
      return <Badge variant="secondary">Draft</Badge>
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

function formatDateTimeLocal(dateStr: string) {
  if (!dateStr) return ''
  try {
    return format(parseISO(dateStr), "yyyy-MM-dd'T'HH:mm")
  } catch {
    return dateStr
  }
}

// --- API helpers ---
async function fetchEvents(params: {
  page: number
  limit: number
  search: string
  organizationId: string
  status: string
  userRole?: string
  userOrgId?: string
}): Promise<EventsResponse> {
  const sp = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  })
  if (params.search) sp.set('search', params.search)
  if (params.organizationId) sp.set('organizationId', params.organizationId)
  if (params.status) sp.set('status', params.status)
  if (params.userRole) sp.set('userRole', params.userRole)
  if (params.userOrgId) sp.set('userOrgId', params.userOrgId)
  const res = await fetch(`/api/events?${sp.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch events')
  return res.json()
}

async function fetchOrganizationsForFilter(userRole?: string, userOrgId?: string): Promise<OrganizationOption[]> {
  const params = new URLSearchParams({ limit: '100' })
  if (userRole) params.set('userRole', userRole)
  if (userOrgId) params.set('userOrgId', userOrgId)
  const res = await fetch(`/api/organizations?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch organizations')
  const json: OrgsListResponse = await res.json()
  return json.data
}

async function createEvent(data: EventFormData, userRole?: string, userOrgId?: string): Promise<EventItem> {
  const res = await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      startDate: data.startDate ? new Date(data.startDate).toISOString() : undefined,
      endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
      maxSessions: data.maxSessions > 0 ? data.maxSessions : 100,
      userRole,
      userOrgId,
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Failed to create event')
  return json.data
}

async function updateEvent(id: string, data: Partial<EventFormData>, userRole?: string, userOrgId?: string): Promise<EventItem> {
  const body: Record<string, unknown> = { ...data, userRole, userOrgId }
  if (data.startDate) body.startDate = new Date(data.startDate).toISOString()
  if (data.endDate) body.endDate = new Date(data.endDate).toISOString()
  else if (data.endDate === '') body.endDate = null

  const res = await fetch(`/api/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Failed to update event')
  return json.data
}

// --- Component ---
export default function EventsPage() {
  const queryClient = useQueryClient()
  const { setCurrentPage } = useAppStore()
  const { data: session } = useSession()
  const currentRole = (session?.user as any)?.role as string | undefined
  const currentOrgId = (session?.user as any)?.organizationId as string | undefined

  const isOrgScoped = currentRole === 'ORG_ADMIN' || currentRole === 'FACILITATOR'

  // State
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const [filterOrgId, setFilterOrgId] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const limit = 9

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null)
  const [formData, setFormData] = useState<EventFormData>(defaultFormData)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Date picker open states
  const [startPickerOpen, setStartPickerOpen] = useState(false)
  const [endPickerOpen, setEndPickerOpen] = useState(false)

  // Queries
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['events', page, limit, debouncedSearch, filterOrgId, filterStatus, currentRole, currentOrgId],
    queryFn: () => fetchEvents({
      page,
      limit,
      search: debouncedSearch,
      organizationId: filterOrgId,
      status: filterStatus,
      userRole: currentRole,
      userOrgId: currentOrgId,
    }),
    retry: 2,
  })

  const { data: orgsData } = useQuery({
    queryKey: ['organizations-list', currentRole, currentOrgId],
    queryFn: () => fetchOrganizationsForFilter(currentRole, currentOrgId),
    retry: 2,
  })

  const organizations = orgsData ?? []

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: EventFormData) => createEvent(data, currentRole, currentOrgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Event created', { description: 'The event has been created successfully.' })
      setCreateOpen(false)
      resetForm()
    },
    onError: (err: Error) => {
      toast.error('Error', { description: err.message })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EventFormData> }) => updateEvent(id, data, currentRole, currentOrgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Event updated', { description: 'The event has been updated successfully.' })
      setEditOpen(false)
      resetForm()
    },
    onError: (err: Error) => {
      toast.error('Error', { description: err.message })
    },
  })

  // Handlers
  const resetForm = useCallback(() => {
    setFormData({
      ...defaultFormData,
      organizationId: isOrgScoped && currentOrgId ? currentOrgId : '',
    })
    setFormErrors({})
    setSelectedEvent(null)
  }, [isOrgScoped, currentOrgId])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (searchTimeout) clearTimeout(searchTimeout)
    const timeout = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 300)
    setSearchTimeout(timeout)
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    if (!formData.name.trim()) errors.name = 'Name is required'
    if (!formData.organizationId) errors.organizationId = 'Organization is required'
    if (!formData.startDate) errors.startDate = 'Start date is required'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreate = () => {
    if (!validateForm()) return
    createMutation.mutate(formData)
  }

  const handleEdit = (event: EventItem) => {
    setSelectedEvent(event)
    setFormData({
      name: event.name,
      description: event.description || '',
      organizationId: event.organizationId,
      location: event.location || '',
      startDate: event.startDate ? formatDateTimeLocal(event.startDate) : '',
      endDate: event.endDate ? formatDateTimeLocal(event.endDate) : '',
      status: event.status,
      maxSessions: event.maxSessions,
    })
    setFormErrors({})
    setEditOpen(true)
  }

  const handleUpdate = () => {
    if (!selectedEvent || !validateForm()) return
    updateMutation.mutate({ id: selectedEvent.id, data: formData })
  }

  // Get allowed transitions for the current event status
  const getAllowedTransitions = (currentStatus: string): string[] => {
    return STATUS_TRANSITIONS[currentStatus] ?? []
  }

  // Pagination
  const totalPages = data ? Math.ceil(data.total / limit) : 0
  const events = data?.data ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground">Manage photobooth events across your organizations.</p>
        </div>
        <Button onClick={() => { resetForm(); setCreateOpen(true) }} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
          <Plus className="size-4 mr-2" />
          Add Event
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 focus-visible:ring-emerald-500"
          />
        </div>
        {/* Only show org filter for SUPER_ADMIN */}
        {!isOrgScoped && (
          <Select value={filterOrgId} onValueChange={(v) => { setFilterOrgId(v === '__all__' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="All Organizations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Organizations</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={filterStatus || '__all__'} onValueChange={(v) => { setFilterStatus(v === '__all__' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Statuses</SelectItem>
            {EVENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="border-destructive/50">
          <CardContent className="p-6 flex flex-col items-center gap-3">
            <p className="text-sm text-destructive">Failed to load events.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
            <Calendar className="size-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-lg font-medium">No events found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {debouncedSearch || filterOrgId || filterStatus
              ? 'Try adjusting your filters.'
              : 'Create your first event to get started!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden flex flex-col border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-base leading-snug line-clamp-1">{event.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{event.organization.name}</p>
                  </div>
                  {getStatusBadge(event.status)}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                {/* Location & Date */}
                <div className="space-y-1.5">
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0" />
                      <span className="line-clamp-1">{event.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="size-3.5 shrink-0" />
                    <span>{formatDate(event.startDate)}{event.endDate ? ` — ${formatDate(event.endDate)}` : ''}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <Users className="size-3" />
                    </div>
                    <p className="text-sm font-semibold mt-0.5">{event._count.sessions}</p>
                    <p className="text-[10px] text-muted-foreground">Sessions</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <ListOrdered className="size-3" />
                    </div>
                    <p className="text-sm font-semibold mt-0.5">{event._count.queueEntries}</p>
                    <p className="text-[10px] text-muted-foreground">Queue</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <ImageIcon className="size-3" />
                    </div>
                    <p className="text-sm font-semibold mt-0.5">{event._count.gallery}</p>
                    <p className="text-[10px] text-muted-foreground">Gallery</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <Monitor className="size-3" />
                    </div>
                    <p className="text-sm font-semibold mt-0.5">{event._count.devices}</p>
                    <p className="text-[10px] text-muted-foreground">Devices</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                    onClick={() => handleEdit(event)}
                  >
                    <Pencil className="size-3.5 mr-1.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950"
                    onClick={() => {
                      setCurrentPage('sessions')
                    }}
                  >
                    <Eye className="size-3.5 mr-1.5" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, data.total)} of {data.total} events
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {totalPages > 1 && Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      isActive={pageNum === page}
                      onClick={() => setPage(pageNum)}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                )
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>Add a new photobooth event.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-event-name">Name *</Label>
              <Input
                id="create-event-name"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                placeholder="Event name"
              />
              {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-event-org">Organization *</Label>
              {isOrgScoped && currentOrgId ? (
                <Input
                  value={organizations.find((o) => o.id === currentOrgId)?.name || 'Your Organization'}
                  disabled
                  className="bg-muted"
                />
              ) : (
                <Select
                  value={formData.organizationId}
                  onValueChange={(v) => setFormData((f) => ({ ...f, organizationId: v }))}
                >
                  <SelectTrigger id="create-event-org" className="w-full">
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {formErrors.organizationId && <p className="text-xs text-destructive">{formErrors.organizationId}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-event-desc">Description</Label>
              <Textarea
                id="create-event-desc"
                value={formData.description}
                onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                placeholder="Event description"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-event-location">Location</Label>
              <Input
                id="create-event-location"
                value={formData.location}
                onChange={(e) => setFormData((f) => ({ ...f, location: e.target.value }))}
                placeholder="Event venue or address"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date *</Label>
                <Popover open={startPickerOpen} onOpenChange={setStartPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="size-4 mr-2" />
                      {formData.startDate ? format(parseISO(formData.startDate), 'MMM d, yyyy') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={formData.startDate ? parseISO(formData.startDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setFormData((f) => ({ ...f, startDate: date.toISOString() }))
                        }
                        setStartPickerOpen(false)
                      }}
                    />
                  </PopoverContent>
                </Popover>
                {formErrors.startDate && <p className="text-xs text-destructive">{formErrors.startDate}</p>}
              </div>
              <div className="grid gap-2">
                <Label>End Date</Label>
                <Popover open={endPickerOpen} onOpenChange={setEndPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="size-4 mr-2" />
                      {formData.endDate ? format(parseISO(formData.endDate), 'MMM d, yyyy') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={formData.endDate ? parseISO(formData.endDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setFormData((f) => ({ ...f, endDate: date.toISOString() }))
                        } else {
                          setFormData((f) => ({ ...f, endDate: '' }))
                        }
                        setEndPickerOpen(false)
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="create-event-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger id="create-event-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-event-max-sessions">Max Sessions</Label>
                <Input
                  id="create-event-max-sessions"
                  type="number"
                  min={1}
                  value={formData.maxSessions}
                  onChange={(e) => setFormData((f) => ({ ...f, maxSessions: parseInt(e.target.value) || 100 }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm() }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
              {createMutation.isPending ? 'Creating...' : 'Create Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>Update event details and status.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Status Transition Info */}
            {selectedEvent && (
              <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Info className="size-4 text-muted-foreground" />
                  Status Transitions
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Current:</span>
                  {getStatusBadge(selectedEvent.status)}
                  {getAllowedTransitions(selectedEvent.status).length > 0 && (
                    <>
                      <ArrowRight className="size-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Allowed:</span>
                      <div className="flex gap-1.5 flex-wrap">
                        {getAllowedTransitions(selectedEvent.status).map((s) => (
                          <Badge key={s} variant="outline" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                  {getAllowedTransitions(selectedEvent.status).length === 0 && (
                    <span className="text-xs text-muted-foreground italic">No transitions available</span>
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="edit-event-name">Name *</Label>
              <Input
                id="edit-event-name"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                placeholder="Event name"
              />
              {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-event-org">Organization</Label>
              {isOrgScoped && currentOrgId ? (
                <Input
                  value={organizations.find((o) => o.id === currentOrgId)?.name || 'Your Organization'}
                  disabled
                  className="bg-muted"
                />
              ) : (
                <Select
                  value={formData.organizationId}
                  onValueChange={(v) => setFormData((f) => ({ ...f, organizationId: v }))}
                >
                  <SelectTrigger id="edit-event-org" className="w-full">
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {formErrors.organizationId && <p className="text-xs text-destructive">{formErrors.organizationId}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-event-desc">Description</Label>
              <Textarea
                id="edit-event-desc"
                value={formData.description}
                onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                placeholder="Event description"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-event-location">Location</Label>
              <Input
                id="edit-event-location"
                value={formData.location}
                onChange={(e) => setFormData((f) => ({ ...f, location: e.target.value }))}
                placeholder="Event venue or address"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date *</Label>
                <Popover open={startPickerOpen} onOpenChange={setStartPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="size-4 mr-2" />
                      {formData.startDate ? format(parseISO(formData.startDate), 'MMM d, yyyy') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={formData.startDate ? parseISO(formData.startDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setFormData((f) => ({ ...f, startDate: date.toISOString() }))
                        }
                        setStartPickerOpen(false)
                      }}
                    />
                  </PopoverContent>
                </Popover>
                {formErrors.startDate && <p className="text-xs text-destructive">{formErrors.startDate}</p>}
              </div>
              <div className="grid gap-2">
                <Label>End Date</Label>
                <Popover open={endPickerOpen} onOpenChange={setEndPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="size-4 mr-2" />
                      {formData.endDate ? format(parseISO(formData.endDate), 'MMM d, yyyy') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={formData.endDate ? parseISO(formData.endDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setFormData((f) => ({ ...f, endDate: date.toISOString() }))
                        } else {
                          setFormData((f) => ({ ...f, endDate: '' }))
                        }
                        setEndPickerOpen(false)
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-event-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger id="edit-event-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_STATUSES.map((s) => {
                      const isAllowed = selectedEvent
                        ? s === selectedEvent.status || getAllowedTransitions(selectedEvent.status).includes(s)
                        : true
                      return (
                        <SelectItem key={s} value={s} disabled={!isAllowed}>
                          {s}{!isAllowed ? ' (not allowed)' : ''}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-event-max-sessions">Max Sessions</Label>
                <Input
                  id="edit-event-max-sessions"
                  type="number"
                  min={1}
                  value={formData.maxSessions}
                  onChange={(e) => setFormData((f) => ({ ...f, maxSessions: parseInt(e.target.value) || 100 }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); resetForm() }}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
