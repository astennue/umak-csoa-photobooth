'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import {
  ScrollText,
  Filter,
  X,
  Eye,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  FileJson,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
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
interface AuditItem {
  id: string
  organizationId: string | null
  eventId: string | null
  sessionId: string | null
  action: string
  entityType: string
  entityId: string | null
  details: string | null
  performedBy: string | null
  createdAt: string
}

interface OrgOption {
  id: string
  name: string
}

interface EventOption {
  id: string
  name: string
}

// Action config
const ACTION_CONFIG: Record<string, { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }> = {
  CREATE: {
    label: 'Create',
    badgeClass: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20',
    icon: Plus,
  },
  UPDATE: {
    label: 'Update',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
    icon: Pencil,
  },
  DELETE: {
    label: 'Delete',
    badgeClass: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20',
    icon: Trash2,
  },
  QUEUE_ADD: {
    label: 'Queue Add',
    badgeClass: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
    icon: UserPlus,
  },
}

export default function AuditLogPage() {
  // State
  const [page, setPage] = useState(1)
  const [filterOrgId, setFilterOrgId] = useState<string>('all')
  const [filterEventId, setFilterEventId] = useState<string>('all')
  const [filterAction, setFilterAction] = useState<string>('all')
  const [filterEntityType, setFilterEntityType] = useState<string>('all')
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditItem | null>(null)

  // Fetch audit logs
  const { data: auditData, isLoading } = useQuery({
    queryKey: ['audit', page, filterOrgId, filterEventId, filterAction, filterEntityType],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (filterOrgId && filterOrgId !== 'all') params.set('organizationId', filterOrgId)
      if (filterEventId && filterEventId !== 'all') params.set('eventId', filterEventId)
      if (filterAction && filterAction !== 'all') params.set('action', filterAction)
      if (filterEntityType && filterEntityType !== 'all') params.set('entityType', filterEntityType)
      const res = await fetch(`/api/audit?${params}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to fetch audit logs')
      return json
    },
  })

  // Fetch organizations for filter
  const { data: orgsData } = useQuery({
    queryKey: ['orgs-list'],
    queryFn: async () => {
      const res = await fetch('/api/organizations?limit=100')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json
    },
  })

  // Fetch events for filter
  const { data: eventsData } = useQuery({
    queryKey: ['events-list'],
    queryFn: async () => {
      const res = await fetch('/api/events?limit=100')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json
    },
  })

  const orgs: OrgOption[] = orgsData?.data ?? []
  const events: EventOption[] = eventsData?.data ?? []
  const logs: AuditItem[] = auditData?.data ?? []
  const totalPages = auditData?.total ? Math.ceil(auditData.total / 20) : 1

  // Extract unique entity types from data for filter
  const entityTypes = [...new Set(logs.map((l) => l.entityType).filter(Boolean))].sort()

  // Known action types for filter
  const actionTypes = Object.keys(ACTION_CONFIG)

  function hasActiveFilters() {
    return filterOrgId !== 'all' || filterEventId !== 'all' || filterAction !== 'all' || filterEntityType !== 'all'
  }

  function clearFilters() {
    setFilterOrgId('all')
    setFilterEventId('all')
    setFilterAction('all')
    setFilterEntityType('all')
    setPage(1)
  }

  function tryParseJson(str: string | null): string {
    if (!str) return ''
    try {
      return JSON.stringify(JSON.parse(str), null, 2)
    } catch {
      return str
    }
  }

  function openDetail(log: AuditItem) {
    setSelectedLog(log)
    setDetailOpen(true)
  }

  function getActionConfig(action: string) {
    return ACTION_CONFIG[action] || {
      label: action,
      badgeClass: 'bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/20',
      icon: FileJson,
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">Review system activity and audit trails.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filters:</span>
        </div>

        <Select value={filterOrgId} onValueChange={(val) => { setFilterOrgId(val); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Orgs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Organizations</SelectItem>
            {orgs.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

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

        <Select value={filterAction} onValueChange={(val) => { setFilterAction(val); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actionTypes.map((a) => (
              <SelectItem key={a} value={a}>{ACTION_CONFIG[a].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterEntityType} onValueChange={(val) => { setFilterEntityType(val); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All Entity Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entity Types</SelectItem>
            {entityTypes.map((et) => (
              <SelectItem key={et} value={et}>{et}</SelectItem>
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

      {/* Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ScrollText className="size-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No audit logs found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Adjust your filters to see audit log entries.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* Desktop table view */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead className="w-[120px]">Action</TableHead>
                    <TableHead className="w-[180px]">Entity</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="w-[140px]">Performed By</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const actionCfg = getActionConfig(log.action)
                    const ActionIcon = actionCfg.icon
                    const parsedDetails = tryParseJson(log.details)

                    return (
                      <TableRow
                        key={log.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openDetail(log)}
                      >
                        <TableCell className="text-sm">
                          <div>
                            <div className="font-medium">{format(new Date(log.createdAt), 'MMM d, yyyy')}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(log.createdAt), 'HH:mm:ss')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 ${actionCfg.badgeClass}`}>
                            <ActionIcon className="size-3" />
                            {actionCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm font-medium">{log.entityType}</div>
                            {log.entityId && (
                              <div className="text-xs text-muted-foreground font-mono truncate max-w-[150px]">
                                {log.entityId}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          {parsedDetails ? (
                            <p className="text-xs text-muted-foreground font-mono truncate">
                              {parsedDetails.substring(0, 100)}{parsedDetails.length > 100 ? '...' : ''}
                            </p>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No details</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.performedBy || <span className="text-muted-foreground italic">System</span>}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="size-7" onClick={(e) => { e.stopPropagation(); openDetail(log) }}>
                            <Eye className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile timeline view */}
            <div className="md:hidden divide-y">
              {logs.map((log) => {
                const actionCfg = getActionConfig(log.action)
                const ActionIcon = actionCfg.icon

                return (
                  <div
                    key={log.id}
                    className="p-4 hover:bg-muted/50 cursor-pointer"
                    onClick={() => openDetail(log)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className={`gap-1 text-xs ${actionCfg.badgeClass}`}>
                        <ActionIcon className="size-3" />
                        {actionCfg.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{log.entityType}</span>
                      {log.entityId && (
                        <span className="text-xs text-muted-foreground font-mono truncate">
                          {log.entityId.substring(0, 12)}...
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.createdAt), 'PPpp')}
                      </span>
                      {log.performedBy && (
                        <span className="text-xs text-muted-foreground">by {log.performedBy}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
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

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="size-5" />
                  Audit Log Detail
                </DialogTitle>
                <DialogDescription>
                  Full details for this audit log entry.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Timestamp</span>
                    <p className="font-medium">{format(new Date(selectedLog.createdAt), 'PPpp')}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(selectedLog.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Action</span>
                    <div className="mt-1">
                      {(() => {
                        const cfg = getActionConfig(selectedLog.action)
                        const Icon = cfg.icon
                        return (
                          <Badge variant="outline" className={`gap-1 ${cfg.badgeClass}`}>
                            <Icon className="size-3" />
                            {cfg.label}
                          </Badge>
                        )
                      })()}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Entity Type</span>
                    <p className="font-medium">{selectedLog.entityType}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Entity ID</span>
                    <p className="font-medium font-mono text-xs break-all">{selectedLog.entityId || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Performed By</span>
                    <p className="font-medium">{selectedLog.performedBy || 'System'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Organization ID</span>
                    <p className="font-medium font-mono text-xs break-all">{selectedLog.organizationId || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Event ID</span>
                    <p className="font-medium font-mono text-xs break-all">{selectedLog.eventId || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Session ID</span>
                    <p className="font-medium font-mono text-xs break-all">{selectedLog.sessionId || 'N/A'}</p>
                  </div>
                </div>

                {/* Details JSON */}
                {selectedLog.details && (
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Details</span>
                    <ScrollArea className="max-h-64">
                      <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                        {tryParseJson(selectedLog.details)}
                      </pre>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
