'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { Building2, Plus, Search, Pencil, Trash2, MoreHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

// --- Types ---
interface Organization {
  id: string
  name: string
  description: string | null
  logoUrl: string | null
  email: string | null
  phone: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  _count: { events: number }
}

interface OrgsResponse {
  success: boolean
  data: Organization[]
  total: number
  page: number
  limit: number
}

interface OrgFormData {
  name: string
  description: string
  email: string
  phone: string
  active: boolean
}

const defaultFormData: OrgFormData = {
  name: '',
  description: '',
  email: '',
  phone: '',
  active: true,
}

// --- API helpers ---
async function fetchOrganizations(page: number, limit: number, search: string): Promise<OrgsResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (search) params.set('search', search)
  const res = await fetch(`/api/organizations?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch organizations')
  return res.json()
}

async function createOrganization(data: OrgFormData): Promise<Organization> {
  const res = await fetch('/api/organizations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Failed to create organization')
  return json.data
}

async function updateOrganization(id: string, data: Partial<OrgFormData>): Promise<Organization> {
  const res = await fetch(`/api/organizations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Failed to update organization')
  return json.data
}

async function deleteOrganization(id: string): Promise<void> {
  const res = await fetch(`/api/organizations/${id}`, { method: 'DELETE' })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Failed to delete organization')
}

// --- Component ---
export default function OrganizationsPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // State
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const limit = 10

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [formData, setFormData] = useState<OrgFormData>(defaultFormData)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Query
  const { data, isLoading } = useQuery({
    queryKey: ['organizations', page, limit, debouncedSearch],
    queryFn: () => fetchOrganizations(page, limit, debouncedSearch),
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      toast({ title: 'Organization created', description: 'The organization has been created successfully.' })
      setCreateOpen(false)
      resetForm()
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<OrgFormData> }) => updateOrganization(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      toast({ title: 'Organization updated', description: 'The organization has been updated successfully.' })
      setEditOpen(false)
      resetForm()
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      toast({ title: 'Organization deleted', description: 'The organization has been deleted successfully.' })
      setDeleteOpen(false)
      setSelectedOrg(null)
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    },
  })

  // Handlers
  const resetForm = useCallback(() => {
    setFormData(defaultFormData)
    setFormErrors({})
  }, [])

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
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreate = () => {
    if (!validateForm()) return
    createMutation.mutate(formData)
  }

  const handleEdit = (org: Organization) => {
    setSelectedOrg(org)
    setFormData({
      name: org.name,
      description: org.description || '',
      email: org.email || '',
      phone: org.phone || '',
      active: org.active,
    })
    setFormErrors({})
    setEditOpen(true)
  }

  const handleUpdate = () => {
    if (!selectedOrg || !validateForm()) return
    updateMutation.mutate({ id: selectedOrg.id, data: formData })
  }

  const handleDeleteClick = (org: Organization) => {
    setSelectedOrg(org)
    setDeleteOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (!selectedOrg) return
    deleteMutation.mutate(selectedOrg.id)
  }

  // Pagination
  const totalPages = data ? Math.ceil(data.total / limit) : 0
  const organizations = data?.data ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground">Manage your photobooth organizations and their settings.</p>
        </div>
        <Button onClick={() => { resetForm(); setCreateOpen(true) }}>
          <Plus className="size-4 mr-2" />
          Add Organization
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, description, or email..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden lg:table-cell">Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Events</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : organizations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {debouncedSearch ? 'No organizations found matching your search.' : 'No organizations yet. Create one to get started!'}
                </TableCell>
              </TableRow>
            ) : (
              organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                        <Building2 className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium">{org.name}</div>
                        {org.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1 max-w-48">{org.description}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {org.email ? (
                      <span className="text-sm">{org.email}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {org.phone ? (
                      <span className="text-sm">{org.phone}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={org.active ? 'default' : 'secondary'}>
                      {org.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-medium">{org._count.events}</span>
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
                        <DropdownMenuItem onClick={() => handleEdit(org)}>
                          <Pencil className="size-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(org)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="size-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, data.total)} of {data.total} organizations
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {totalPages > 1 && Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <PaginationItem key={p}>
                  <PaginationLink
                    isActive={p === page}
                    onClick={() => setPage(p)}
                    className="cursor-pointer"
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
            <DialogDescription>Add a new organization to the system.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-name">Name *</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                placeholder="Organization name"
              />
              {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={formData.description}
                onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                  placeholder="contact@org.com"
                />
                {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-phone">Phone</Label>
                <Input
                  id="create-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="create-active">Active</Label>
                <p className="text-xs text-muted-foreground">Enable this organization for use</p>
              </div>
              <Switch
                id="create-active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData((f) => ({ ...f, active: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm() }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>Update organization details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                placeholder="Organization name"
              />
              {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                  placeholder="contact@org.com"
                />
                {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="edit-active">Active</Label>
                <p className="text-xs text-muted-foreground">Enable this organization for use</p>
              </div>
              <Switch
                id="edit-active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData((f) => ({ ...f, active: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); resetForm() }}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedOrg?.name}</strong>? This action cannot be undone.
              All associated events and data will also be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
