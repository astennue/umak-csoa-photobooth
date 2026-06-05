'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { Plus, MoreHorizontal, Pencil, Trash2, Users, Search } from 'lucide-react'
import { useState } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrgOption {
  id: string
  name: string
}

interface UserRecord {
  id: string
  email: string
  name: string
  role: string
  organizationId: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  organization: OrgOption | null
}

interface UsersResponse {
  success: boolean
  data: UserRecord[]
  total: number
}

interface OrgsResponse {
  success: boolean
  data: OrgOption[]
}

// ─── Role Badge Helper ─────────────────────────────────────────────────────

function getRoleBadge(role: string) {
  const config: Record<string, { label: string; className: string }> = {
    SUPER_ADMIN: {
      label: 'Super Admin',
      className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    },
    ORG_ADMIN: {
      label: 'Org Admin',
      className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    },
    FACILITATOR: {
      label: 'Facilitator',
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    },
  }
  const c = config[role] ?? {
    label: role,
    className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  }
  return (
    <Badge variant="outline" className={c.className}>
      {c.label}
    </Badge>
  )
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

// ─── Main Users Page ─────────────────────────────────────────────────────

export default function UsersPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const currentRole = (session?.user as any)?.role as string | undefined
  const currentOrgId = (session?.user as any)?.organizationId as string | undefined

  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState('FACILITATOR')
  const [formOrgId, setFormOrgId] = useState('')

  // Fetch users - scoped to org
  const { data: usersData, isLoading } = useQuery<UsersResponse>({
    queryKey: ['users', currentRole, currentOrgId],
    queryFn: () => {
      const params = new URLSearchParams()
      if (currentRole) params.set('userRole', currentRole)
      if (currentOrgId) params.set('userOrgId', currentOrgId)
      return fetch(`/api/users?${params.toString()}`).then((r) => r.json())
    },
  })

  // Fetch organizations for dropdown - scoped to org
  const { data: orgsData } = useQuery<OrgsResponse>({
    queryKey: ['org-options', currentRole, currentOrgId],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '100' })
      if (currentRole) params.set('userRole', currentRole)
      if (currentOrgId) params.set('userOrgId', currentOrgId)
      return fetch(`/api/organizations?${params.toString()}`).then((r) => r.json())
    },
  })

  const orgs = orgsData?.data ?? []
  const users = usersData?.data ?? []

  // Filter users by search
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  )

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; name: string; role: string; organizationId: string }) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userRole: currentRole, userOrgId: currentOrgId }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to create user')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User created successfully')
      closeCreateDialog()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; email: string; role: string; organizationId: string; active: boolean; password?: string }) => {
      const res = await fetch(`/api/users/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userRole: currentRole, userOrgId: currentOrgId }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to update user')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User updated successfully')
      closeEditDialog()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const params = new URLSearchParams()
      if (currentRole) params.set('userRole', currentRole)
      if (currentOrgId) params.set('userOrgId', currentOrgId)
      const res = await fetch(`/api/users/${id}?${params.toString()}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to delete user')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deleted successfully')
      setDeleteOpen(false)
      setSelectedUser(null)
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  function closeCreateDialog() {
    setCreateOpen(false)
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    setFormRole(currentRole === 'ORG_ADMIN' ? 'FACILITATOR' : 'FACILITATOR')
    setFormOrgId(currentRole === 'ORG_ADMIN' ? (currentOrgId || '') : '')
  }

  function openEditDialog(user: UserRecord) {
    setSelectedUser(user)
    setFormName(user.name)
    setFormEmail(user.email)
    setFormPassword('')
    setFormRole(user.role)
    setFormOrgId(user.organizationId || '')
    setEditOpen(true)
  }

  function closeEditDialog() {
    setEditOpen(false)
    setSelectedUser(null)
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    setFormRole('FACILITATOR')
    setFormOrgId('')
  }

  function openCreateDialog() {
    setFormRole(currentRole === 'ORG_ADMIN' ? 'FACILITATOR' : 'FACILITATOR')
    setFormOrgId(currentRole === 'ORG_ADMIN' ? (currentOrgId || '') : '')
    setCreateOpen(true)
  }

  function handleCreate() {
    if (!formName || !formEmail || !formPassword) {
      toast.error('Please fill in all required fields')
      return
    }
    createMutation.mutate({
      email: formEmail,
      password: formPassword,
      name: formName,
      role: formRole,
      organizationId: formOrgId,
    })
  }

  function handleUpdate() {
    if (!selectedUser || !formName || !formEmail) {
      toast.error('Please fill in all required fields')
      return
    }
    updateMutation.mutate({
      id: selectedUser.id,
      name: formName,
      email: formEmail,
      role: formRole,
      organizationId: formOrgId,
      active: selectedUser.active,
      ...(formPassword ? { password: formPassword } : {}),
    })
  }

  // Available roles based on current user's role
  const availableRoles = currentRole === 'SUPER_ADMIN'
    ? ['SUPER_ADMIN', 'ORG_ADMIN', 'FACILITATOR']
    : currentRole === 'ORG_ADMIN'
    ? ['FACILITATOR']
    : []

  // Available orgs based on current user's role
  const availableOrgs = currentRole === 'SUPER_ADMIN'
    ? orgs
    : currentRole === 'ORG_ADMIN'
    ? orgs.filter((o) => o.id === currentOrgId)
    : []

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage system users and their roles.
          </p>
        </div>
        {(currentRole === 'SUPER_ADMIN' || currentRole === 'ORG_ADMIN') && (
          <Button onClick={openCreateDialog} className="bg-emerald-700 hover:bg-emerald-800 text-white">
            <Plus className="size-4 mr-2" />
            Add User
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Users
          </CardTitle>
          <CardDescription>
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No users found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell className="text-sm">
                          {user.organization?.name || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              user.active
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                            }
                          >
                            {user.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(currentRole === 'SUPER_ADMIN' || (currentRole === 'ORG_ADMIN' && user.role === 'FACILITATOR')) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                  <Pencil className="size-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user)
                                    setDeleteOpen(true)
                                  }}
                                  className="text-red-600 dark:text-red-400"
                                >
                                  <Trash2 className="size-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) closeCreateDialog() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Name *</Label>
              <Input
                id="create-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email *</Label>
              <Input
                id="create-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@umak.edu.ph"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Password *</Label>
              <Input
                id="create-password"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="Min. 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role">Role *</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger id="create-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {currentRole === 'SUPER_ADMIN' && (
              <div className="space-y-2">
                <Label htmlFor="create-org">Organization</Label>
                <Select value={formOrgId} onValueChange={setFormOrgId}>
                  <SelectTrigger id="create-org">
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableOrgs.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {currentRole === 'ORG_ADMIN' && currentOrgId && (
              <div className="space-y-2">
                <Label>Organization</Label>
                <Input
                  value={orgs.find((o) => o.id === currentOrgId)?.name || 'Your Organization'}
                  disabled
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCreateDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              {createMutation.isPending ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { if (!open) closeEditDialog() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. Leave password blank to keep it unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@umak.edu.ph"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">New Password</Label>
              <Input
                id="edit-password"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="Leave blank to keep current"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role *</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger id="edit-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {currentRole === 'SUPER_ADMIN' && (
              <div className="space-y-2">
                <Label htmlFor="edit-org">Organization</Label>
                <Select value={formOrgId} onValueChange={setFormOrgId}>
                  <SelectTrigger id="edit-org">
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableOrgs.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              {updateMutation.isPending ? 'Updating...' : 'Update User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedUser(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUser && deleteMutation.mutate(selectedUser.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function getRoleLabel(role: string) {
  switch (role) {
    case 'SUPER_ADMIN': return 'Super Admin'
    case 'ORG_ADMIN': return 'Org Admin'
    case 'FACILITATOR': return 'Facilitator'
    default: return role
  }
}
