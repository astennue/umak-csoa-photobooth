'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow, format } from 'date-fns'
import {
  Monitor,
  Plus,
  Filter,
  X,
  Wifi,
  WifiOff,
  Loader2,
  AlertTriangle,
  Camera,
  Printer,
  Tablet,
  Activity,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
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
interface DeviceItem {
  id: string
  eventId: string
  name: string
  type: string
  status: string
  lastHeartbeat: string | null
  ipAddress: string | null
  firmware: string | null
  createdAt: string
  event: { id: string; name: string }
}

interface EventOption {
  id: string
  name: string
}

type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'BUSY' | 'ERROR'
type DeviceType = 'PHOTOBOOTH' | 'PRINTER' | 'KIOSK'

const STATUS_CONFIG: Record<DeviceStatus, { label: string; dotClass: string; icon: React.ComponentType<{ className?: string }> }> = {
  ONLINE: {
    label: 'Online',
    dotClass: 'bg-green-500 animate-pulse',
    icon: Wifi,
  },
  OFFLINE: {
    label: 'Offline',
    dotClass: 'bg-gray-400 dark:bg-gray-500',
    icon: WifiOff,
  },
  BUSY: {
    label: 'Busy',
    dotClass: 'bg-amber-500',
    icon: Loader2,
  },
  ERROR: {
    label: 'Error',
    dotClass: 'bg-red-500 animate-pulse',
    icon: AlertTriangle,
  },
}

const TYPE_CONFIG: Record<DeviceType, { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }> = {
  PHOTOBOOTH: {
    label: 'Photobooth',
    badgeClass: 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/20',
    icon: Camera,
  },
  PRINTER: {
    label: 'Printer',
    badgeClass: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
    icon: Printer,
  },
  KIOSK: {
    label: 'Kiosk',
    badgeClass: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20',
    icon: Tablet,
  },
}

export default function DevicesPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const currentRole = (session?.user as any)?.role as string | undefined
  const currentOrgId = (session?.user as any)?.organizationId as string | undefined

  // State
  const [page, setPage] = useState(1)
  const [filterEventId, setFilterEventId] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [registerOpen, setRegisterOpen] = useState(false)

  // Form state
  const [formEventId, setFormEventId] = useState('')
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<DeviceType>('PHOTOBOOTH')
  const [formStatus, setFormStatus] = useState<DeviceStatus>('OFFLINE')
  const [formIpAddress, setFormIpAddress] = useState('')
  const [formFirmware, setFormFirmware] = useState('')

  // Fetch devices - scoped to org
  const { data: devicesData, isLoading } = useQuery({
    queryKey: ['devices', page, filterEventId, filterStatus, filterType, currentRole, currentOrgId],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '10' })
      if (filterEventId && filterEventId !== 'all') params.set('eventId', filterEventId)
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus)
      if (filterType && filterType !== 'all') params.set('type', filterType)
      if (currentRole) params.set('userRole', currentRole)
      if (currentOrgId) params.set('userOrgId', currentOrgId)
      const res = await fetch(`/api/devices?${params}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to fetch devices')
      return json
    },
  })

  // Fetch events - scoped to org
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
  })

  const events: EventOption[] = eventsData?.data ?? []
  const devices: DeviceItem[] = devicesData?.data ?? []
  const totalPages = devicesData?.total ? Math.ceil(devicesData.total / 10) : 1

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: {
      eventId: string
      name: string
      type: string
      status: string
      ipAddress?: string
      firmware?: string
    }) => {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userRole: currentRole, userOrgId: currentOrgId }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to register device')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
      toast({ title: 'Device registered', description: 'The device has been registered successfully.' })
      resetForm()
      setRegisterOpen(false)
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    },
  })

  function resetForm() {
    setFormEventId('')
    setFormName('')
    setFormType('PHOTOBOOTH')
    setFormStatus('OFFLINE')
    setFormIpAddress('')
    setFormFirmware('')
  }

  function handleRegister() {
    if (!formEventId || !formName.trim()) {
      toast({ title: 'Validation Error', description: 'Event and Device Name are required.', variant: 'destructive' })
      return
    }
    registerMutation.mutate({
      eventId: formEventId,
      name: formName.trim(),
      type: formType,
      status: formStatus,
      ipAddress: formIpAddress.trim() || undefined,
      firmware: formFirmware.trim() || undefined,
    })
  }

  function hasActiveFilters() {
    return filterEventId !== 'all' || filterStatus !== 'all' || filterType !== 'all'
  }

  function clearFilters() {
    setFilterEventId('all')
    setFilterStatus('all')
    setFilterType('all')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Devices</h1>
          <p className="text-muted-foreground">Monitor and manage photobooth devices.</p>
        </div>
        <Button onClick={() => setRegisterOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Register Device
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filters:</span>
        </div>
        <Select value={filterEventId} onValueChange={(val) => { setFilterEventId(val); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Events" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {events.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={(val) => { setFilterStatus(val); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={(val) => { setFilterType(val); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters() && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="size-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Devices Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : devices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Monitor className="size-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No devices found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Register a device or adjust your filters to see results.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => {
            const statusConfig = STATUS_CONFIG[device.status as DeviceStatus] || STATUS_CONFIG.OFFLINE
            const typeConfig = TYPE_CONFIG[device.type as DeviceType] || TYPE_CONFIG.PHOTOBOOTH
            const StatusIcon = statusConfig.icon
            const TypeIcon = typeConfig.icon

            return (
              <Card key={device.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  {/* Device name and status */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`size-2.5 rounded-full shrink-0 ${statusConfig.dotClass}`} />
                      <h3 className="font-medium truncate">{device.name}</h3>
                    </div>
                    <Badge variant="outline" className={typeConfig.badgeClass + ' ml-2 shrink-0 gap-1'}>
                      <TypeIcon className="size-3" />
                      {typeConfig.label}
                    </Badge>
                  </div>

                  {/* Event name */}
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Activity className="size-3.5 shrink-0" />
                    <span className="truncate">{device.event.name}</span>
                  </div>

                  {/* Status badge */}
                  <div className="flex items-center gap-1.5">
                    <StatusIcon className={`size-3.5 ${
                      device.status === 'ONLINE' ? 'text-green-500' :
                      device.status === 'OFFLINE' ? 'text-gray-400' :
                      device.status === 'BUSY' ? 'text-amber-500' :
                      'text-red-500'
                    }`} />
                    <span className="text-sm">{statusConfig.label}</span>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2 border-t">
                    {device.ipAddress && (
                      <div>
                        <span className="block text-muted-foreground/70">IP Address</span>
                        <span className="font-mono">{device.ipAddress}</span>
                      </div>
                    )}
                    {device.firmware && (
                      <div>
                        <span className="block text-muted-foreground/70">Firmware</span>
                        <span className="font-mono">{device.firmware}</span>
                      </div>
                    )}
                    {device.lastHeartbeat && (
                      <div className={device.ipAddress || device.firmware ? 'col-span-2' : ''}>
                        <span className="block text-muted-foreground/70">Last Heartbeat</span>
                        <span>{formatDistanceToNow(new Date(device.lastHeartbeat), { addSuffix: true })}</span>
                      </div>
                    )}
                    {!device.ipAddress && !device.firmware && !device.lastHeartbeat && (
                      <div className="col-span-2 text-center italic">No details available</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
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

      {/* Register Device Dialog */}
      <Dialog open={registerOpen} onOpenChange={(open) => { if (!open) resetForm(); setRegisterOpen(open) }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Register Device</DialogTitle>
            <DialogDescription>Add a new device to the system.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="grid gap-4 py-4 px-1">
              <div className="grid gap-2">
                <Label>Event *</Label>
                <Select value={formEventId} onValueChange={setFormEventId}>
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
                <Label htmlFor="reg-name">Device Name *</Label>
                <Input
                  id="reg-name"
                  placeholder="e.g., Booth 1 Main"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={formType} onValueChange={(val) => setFormType(val as DeviceType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={(val) => setFormStatus(val as DeviceStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reg-ip">IP Address</Label>
                <Input
                  id="reg-ip"
                  placeholder="192.168.1.100"
                  value={formIpAddress}
                  onChange={(e) => setFormIpAddress(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reg-firmware">Firmware Version</Label>
                <Input
                  id="reg-firmware"
                  placeholder="v1.2.3"
                  value={formFirmware}
                  onChange={(e) => setFormFirmware(e.target.value)}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setRegisterOpen(false) }}>
              Cancel
            </Button>
            <Button onClick={handleRegister} disabled={registerMutation.isPending}>
              {registerMutation.isPending ? 'Registering...' : 'Register'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
