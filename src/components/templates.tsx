'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Palette,
  Plus,
  Filter,
  X,
  Pencil,
  Frame,
  Layers,
  Settings2,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
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

// Types
interface TemplateItem {
  id: string
  eventId: string
  name: string
  description: string | null
  frameUrl: string | null
  overlayUrl: string | null
  settings: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  event: { id: string; name: string }
}

interface EventOption {
  id: string
  name: string
}

interface TemplateFormData {
  eventId: string
  name: string
  description: string
  frameUrl: string
  overlayUrl: string
  settings: string
  active: boolean
}

const emptyForm: TemplateFormData = {
  eventId: '',
  name: '',
  description: '',
  frameUrl: '',
  overlayUrl: '',
  settings: '',
  active: true,
}

export default function TemplatesPage() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const currentRole = (session?.user as any)?.role as string | undefined
  const currentOrgId = (session?.user as any)?.organizationId as string | undefined
  const isFacilitatorRole = currentRole === 'FACILITATOR'

  // State
  const [page, setPage] = useState(1)
  const [filterEventId, setFilterEventId] = useState<string>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TemplateItem | null>(null)
  const [form, setForm] = useState<TemplateFormData>(emptyForm)

  // Fetch templates - scoped to org
  const { data: templatesData, isLoading, isError, refetch: refetchTemplates } = useQuery({
    queryKey: ['templates', page, filterEventId, currentRole, currentOrgId],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '10' })
      if (filterEventId && filterEventId !== 'all') params.set('eventId', filterEventId)
      if (currentRole) params.set('userRole', currentRole)
      if (currentOrgId) params.set('userOrgId', currentOrgId)
      const res = await fetch(`/api/templates?${params}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to fetch templates')
      return json
    },
    retry: 2,
  })

  // Fetch events for filters and forms - scoped to org
  const { data: eventsData } = useQuery({
    queryKey: ['events-list', currentRole, currentOrgId],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' })
      if (currentRole) params.set('userRole', currentRole)
      if (currentOrgId) params.set('userOrgId', currentOrgId)
      const res = await fetch(`/api/events?${params.toString()}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json
    },
    retry: 2,
  })

  const events: EventOption[] = eventsData?.data ?? []
  const templates: TemplateItem[] = templatesData?.data ?? []
  const totalPages = templatesData?.total ? Math.ceil(templatesData.total / 10) : 1

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: data.eventId,
          name: data.name,
          description: data.description || null,
          frameUrl: data.frameUrl || null,
          overlayUrl: data.overlayUrl || null,
          settings: data.settings ? (isValidJson(data.settings) ? JSON.parse(data.settings) : data.settings) : null,
          active: data.active,
          userRole: currentRole,
          userOrgId: currentOrgId,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to create template')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Template created', { description: 'The template has been created successfully.' })
      setForm(emptyForm)
      setCreateOpen(false)
    },
    onError: (err: Error) => {
      toast.error('Error', { description: err.message })
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TemplateFormData> }) => {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description || null,
          frameUrl: data.frameUrl || null,
          overlayUrl: data.overlayUrl || null,
          settings: data.settings ? (isValidJson(data.settings) ? JSON.parse(data.settings) : data.settings) : null,
          active: data.active,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to update template')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Template updated', { description: 'The template has been updated successfully.' })
      setForm(emptyForm)
      setEditOpen(false)
      setEditingTemplate(null)
    },
    onError: (err: Error) => {
      toast.error('Error', { description: err.message })
    },
  })

  function isValidJson(str: string): boolean {
    try {
      JSON.parse(str)
      return true
    } catch {
      return false
    }
  }

  function openEdit(template: TemplateItem) {
    setEditingTemplate(template)
    setForm({
      eventId: template.eventId,
      name: template.name,
      description: template.description || '',
      frameUrl: template.frameUrl || '',
      overlayUrl: template.overlayUrl || '',
      settings: template.settings || '',
      active: template.active,
    })
    setEditOpen(true)
  }

  function handleSubmit(isEdit: boolean) {
    if (!form.eventId || !form.name.trim()) {
      toast.error('Validation Error', { description: 'Event and Name are required.' })
      return
    }
    if (isEdit && editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  function tryParseSettings(settings: string | null): string {
    if (!settings) return ''
    try {
      return JSON.stringify(JSON.parse(settings), null, 2)
    } catch {
      return settings
    }
  }

  // FACILITATOR: show restricted message
  if (isFacilitatorRole) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-4">
          <Palette className="size-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-xl font-semibold">Access Restricted</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          Facilitators do not have access to template management. Contact your organization admin for assistance.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">Design and manage photo templates for your events.</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setCreateOpen(true) }} className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
          <Plus className="size-4" />
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filter:</span>
        </div>
        <Select value={filterEventId} onValueChange={(val) => { setFilterEventId(val); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Events" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {events.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filterEventId !== 'all' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFilterEventId('all'); setPage(1) }}
            className="gap-1"
          >
            <X className="size-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="border-destructive/50">
          <CardContent className="p-6 flex flex-col items-center gap-3">
            <p className="text-sm text-destructive">Failed to load templates.</p>
            <Button variant="outline" size="sm" onClick={() => refetchTemplates()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Palette className="size-12 text-emerald-400/60 mb-4" />
            <h3 className="text-lg font-medium">No templates found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Create a template or adjust your filters to see results.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow border-l-4 border-l-emerald-500">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{template.name}</CardTitle>
                    <CardDescription className="truncate">{template.event.name}</CardDescription>
                  </div>
                  <Badge
                    variant={template.active ? 'default' : 'secondary'}
                    className={`ml-2 shrink-0 gap-1 ${
                      template.active
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20'
                        : 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/20'
                    }`}
                  >
                    {template.active ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                    {template.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {template.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {template.frameUrl && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Frame className="size-3 shrink-0" />
                      <span className="truncate">Frame</span>
                    </div>
                  )}
                  {template.overlayUrl && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Layers className="size-3 shrink-0" />
                      <span className="truncate">Overlay</span>
                    </div>
                  )}
                  {template.settings && (
                    <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                      <Settings2 className="size-3 shrink-0" />
                      <span className="truncate">{isValidJson(template.settings) ? 'JSON Settings' : template.settings}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(template.createdAt), 'MMM d, yyyy')}
                  </span>
                  <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs" onClick={() => openEdit(template)}>
                    <Pencil className="size-3" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Create Template Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) setForm(emptyForm); setCreateOpen(open) }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Template</DialogTitle>
            <DialogDescription>Add a new photo template for an event.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="grid gap-4 py-4 px-1">
              <div className="grid gap-2">
                <Label>Event *</Label>
                <Select value={form.eventId} onValueChange={(val) => setForm((f) => ({ ...f, eventId: val }))}>
                  <SelectTrigger>
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
                <Label htmlFor="create-name">Name *</Label>
                <Input
                  id="create-name"
                  placeholder="Template name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-desc">Description</Label>
                <Textarea
                  id="create-desc"
                  placeholder="Template description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-frame">Frame URL</Label>
                <Input
                  id="create-frame"
                  placeholder="https://example.com/frame.png"
                  value={form.frameUrl}
                  onChange={(e) => setForm((f) => ({ ...f, frameUrl: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-overlay">Overlay URL</Label>
                <Input
                  id="create-overlay"
                  placeholder="https://example.com/overlay.png"
                  value={form.overlayUrl}
                  onChange={(e) => setForm((f) => ({ ...f, overlayUrl: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-settings">Settings (JSON or text)</Label>
                <Textarea
                  id="create-settings"
                  placeholder='{"layout": "2x2", "borderColor": "#fff"}'
                  value={form.settings}
                  onChange={(e) => setForm((f) => ({ ...f, settings: e.target.value }))}
                  rows={3}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="create-active">Active</Label>
                <Switch
                  id="create-active"
                  checked={form.active}
                  onCheckedChange={(val) => setForm((f) => ({ ...f, active: val }))}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setForm(emptyForm); setCreateOpen(false) }}>
              Cancel
            </Button>
            <Button onClick={() => handleSubmit(false)} disabled={createMutation.isPending} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { if (!open) { setForm(emptyForm); setEditingTemplate(null) }; setEditOpen(open) }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>Update the template details.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="grid gap-4 py-4 px-1">
              <div className="grid gap-2">
                <Label>Event</Label>
                <Input value={editingTemplate?.event.name || ''} disabled />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  placeholder="Template name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-desc">Description</Label>
                <Textarea
                  id="edit-desc"
                  placeholder="Template description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-frame">Frame URL</Label>
                <Input
                  id="edit-frame"
                  placeholder="https://example.com/frame.png"
                  value={form.frameUrl}
                  onChange={(e) => setForm((f) => ({ ...f, frameUrl: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-overlay">Overlay URL</Label>
                <Input
                  id="edit-overlay"
                  placeholder="https://example.com/overlay.png"
                  value={form.overlayUrl}
                  onChange={(e) => setForm((f) => ({ ...f, overlayUrl: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-settings">Settings (JSON or text)</Label>
                <Textarea
                  id="edit-settings"
                  placeholder='{"layout": "2x2", "borderColor": "#fff"}'
                  value={form.settings}
                  onChange={(e) => setForm((f) => ({ ...f, settings: e.target.value }))}
                  rows={3}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-active">Active</Label>
                <Switch
                  id="edit-active"
                  checked={form.active}
                  onCheckedChange={(val) => setForm((f) => ({ ...f, active: val }))}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setForm(emptyForm); setEditOpen(false); setEditingTemplate(null) }}>
              Cancel
            </Button>
            <Button onClick={() => handleSubmit(true)} disabled={updateMutation.isPending} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
