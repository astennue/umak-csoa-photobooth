'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useAppStore } from '@/lib/store'
import {
  Palette,
  Plus,
  Filter,
  X,
  Pencil,
  Frame,
  CheckCircle2,
  XCircle,
  Upload,
  ImageIcon,
  Trash2,
  Copy,
  GripVertical,
  Timer,
  Camera,
  Printer,
  Mail,
  Move,
  ZoomIn,
  LayoutGrid,
  ChevronRight,
  ChevronLeft,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ── Types ───────────────────────────────────────────────────────────────────

interface Placeholder {
  x: number       // percentage 0-100
  y: number       // percentage 0-100
  width: number   // percentage 0-100
  height: number  // percentage 0-100
  borderRadius: number // px
}

interface TemplateItem {
  id: string
  eventId: string
  name: string
  description: string | null
  stripImageUrl: string | null
  frameUrl: string | null
  overlayUrl: string | null
  placeholders: string | null
  layout: string | null
  captureMode: string | null
  captureDelay: number | null
  includeGif: boolean
  printAuto: boolean
  emailAuto: boolean
  active: boolean
  settings: string | null
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
  stripImageUrl: string
  placeholders: Placeholder[]
  layout: string
  captureMode: string
  captureDelay: number
  includeGif: boolean
  printAuto: boolean
  emailAuto: boolean
  active: boolean
}

const emptyForm: TemplateFormData = {
  eventId: '',
  name: '',
  description: '',
  stripImageUrl: '',
  placeholders: [],
  layout: '',
  captureMode: 'manual',
  captureDelay: 3,
  includeGif: false,
  printAuto: false,
  emailAuto: false,
  active: true,
}

// ── Layout Presets ──────────────────────────────────────────────────────────

const LAYOUT_PRESETS: Record<string, { label: string; cols: number; rows: number; icon: string }> = {
  '1x2': { label: '1×2', cols: 1, rows: 2, icon: '⬜⬜' },
  '2x2': { label: '2×2', cols: 2, rows: 2, icon: '⬜⬜\n⬜⬜' },
  '1x3': { label: '1×3', cols: 1, rows: 3, icon: '⬜\n⬜\n⬜' },
  '2x3': { label: '2×3', cols: 2, rows: 3, icon: '⬜⬜\n⬜⬜\n⬜⬜' },
  '1x4': { label: '1×4', cols: 1, rows: 4, icon: '⬜\n⬜\n⬜\n⬜' },
  '3x2': { label: '3×2', cols: 3, rows: 2, icon: '⬜⬜⬜\n⬜⬜⬜' },
}

function generatePlaceholdersFromLayout(layoutKey: string): Placeholder[] {
  const preset = LAYOUT_PRESETS[layoutKey]
  if (!preset) return []

  const margin = 5 // 5% margin
  const gap = 3    // 3% gap between placeholders
  const totalWidth = 100 - margin * 2
  const totalHeight = 100 - margin * 2

  const cellW = (totalWidth - gap * (preset.cols - 1)) / preset.cols
  const cellH = (totalHeight - gap * (preset.rows - 1)) / preset.rows

  const placeholders: Placeholder[] = []
  for (let r = 0; r < preset.rows; r++) {
    for (let c = 0; c < preset.cols; c++) {
      placeholders.push({
        x: margin + c * (cellW + gap),
        y: margin + r * (cellH + gap),
        width: cellW,
        height: cellH,
        borderRadius: 4,
      })
    }
  }
  return placeholders
}

// ── Visual Layout Icon Component ────────────────────────────────────────────

function LayoutPresetIcon({ cols, rows }: { cols: number; rows: number }) {
  return (
    <div className="grid gap-[2px] p-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: cols * rows }).map((_, i) => (
        <div
          key={i}
          className="w-3 h-3 rounded-[2px] border border-current"
        />
      ))}
    </div>
  )
}

// ── Draggable Placeholder Canvas ────────────────────────────────────────────

function PlaceholderCanvas({
  stripImageUrl,
  placeholders,
  selectedPlaceholder,
  onSelectPlaceholder,
  onUpdatePlaceholders,
}: {
  stripImageUrl: string
  placeholders: Placeholder[]
  selectedPlaceholder: number | null
  onSelectPlaceholder: (index: number | null) => void
  onUpdatePlaceholders: (placeholders: Placeholder[]) => void
}) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [imageAspect, setImageAspect] = useState<string>('2/3')
  const dragState = useRef<{
    type: 'move' | 'resize'
    index: number
    startX: number
    startY: number
    origPlaceholder: Placeholder
    corner?: string
  } | null>(null)

  const getPercentage = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
    }
  }, [])

  const handleMouseDown = useCallback((
    e: React.MouseEvent,
    index: number,
    type: 'move' | 'resize',
    corner?: string
  ) => {
    e.preventDefault()
    e.stopPropagation()
    onSelectPlaceholder(index)
    dragState.current = {
      type,
      index,
      startX: e.clientX,
      startY: e.clientY,
      origPlaceholder: { ...placeholders[index] },
      corner,
    }
  }, [placeholders, onSelectPlaceholder])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.current) return
      const { type, index, origPlaceholder, corner } = dragState.current
      const delta = getPercentage(e.clientX, e.clientY)
      const startDelta = getPercentage(dragState.current.startX, dragState.current.startY)
      const dx = delta.x - startDelta.x
      const dy = delta.y - startDelta.y

      const updated = [...placeholders]

      if (type === 'move') {
        updated[index] = {
          ...origPlaceholder,
          x: Math.max(0, Math.min(100 - origPlaceholder.width, origPlaceholder.x + dx)),
          y: Math.max(0, Math.min(100 - origPlaceholder.height, origPlaceholder.y + dy)),
        }
      } else if (type === 'resize' && corner) {
        let newX = origPlaceholder.x
        let newY = origPlaceholder.y
        let newW = origPlaceholder.width
        let newH = origPlaceholder.height

        if (corner.includes('e')) {
          newW = Math.max(5, Math.min(100 - origPlaceholder.x, origPlaceholder.width + dx))
        }
        if (corner.includes('w')) {
          newX = Math.max(0, origPlaceholder.x + dx)
          newW = Math.max(5, origPlaceholder.width - dx)
          if (newX + newW > 100) newW = 100 - newX
        }
        if (corner.includes('s')) {
          newH = Math.max(5, Math.min(100 - origPlaceholder.y, origPlaceholder.height + dy))
        }
        if (corner.includes('n')) {
          newY = Math.max(0, origPlaceholder.y + dy)
          newH = Math.max(5, origPlaceholder.height - dy)
          if (newY + newH > 100) newH = 100 - newY
        }

        updated[index] = { ...origPlaceholder, x: newX, y: newY, width: newW, height: newH }
      }

      onUpdatePlaceholders(updated)
    }

    const handleMouseUp = () => {
      dragState.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [placeholders, getPercentage, onUpdatePlaceholders])

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      onSelectPlaceholder(null)
    }
  }, [onSelectPlaceholder])

  // Touch support
  const handleTouchStart = useCallback((
    e: React.TouchEvent,
    index: number,
    type: 'move' | 'resize',
    corner?: string
  ) => {
    e.stopPropagation()
    const touch = e.touches[0]
    onSelectPlaceholder(index)
    dragState.current = {
      type,
      index,
      startX: touch.clientX,
      startY: touch.clientY,
      origPlaceholder: { ...placeholders[index] },
      corner,
    }
  }, [placeholders, onSelectPlaceholder])

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!dragState.current) return
      const touch = e.touches[0]
      const { type, index, origPlaceholder, corner } = dragState.current
      const delta = getPercentage(touch.clientX, touch.clientY)
      const startDelta = getPercentage(dragState.current.startX, dragState.current.startY)
      const dx = delta.x - startDelta.x
      const dy = delta.y - startDelta.y

      const updated = [...placeholders]

      if (type === 'move') {
        updated[index] = {
          ...origPlaceholder,
          x: Math.max(0, Math.min(100 - origPlaceholder.width, origPlaceholder.x + dx)),
          y: Math.max(0, Math.min(100 - origPlaceholder.height, origPlaceholder.y + dy)),
        }
      } else if (type === 'resize' && corner) {
        let newX = origPlaceholder.x
        let newY = origPlaceholder.y
        let newW = origPlaceholder.width
        let newH = origPlaceholder.height

        if (corner.includes('e')) {
          newW = Math.max(5, Math.min(100 - origPlaceholder.x, origPlaceholder.width + dx))
        }
        if (corner.includes('w')) {
          newX = Math.max(0, origPlaceholder.x + dx)
          newW = Math.max(5, origPlaceholder.width - dx)
          if (newX + newW > 100) newW = 100 - newX
        }
        if (corner.includes('s')) {
          newH = Math.max(5, Math.min(100 - origPlaceholder.y, origPlaceholder.height + dy))
        }
        if (corner.includes('n')) {
          newY = Math.max(0, origPlaceholder.y + dy)
          newH = Math.max(5, origPlaceholder.height - dy)
          if (newY + newH > 100) newH = 100 - newY
        }

        updated[index] = { ...origPlaceholder, x: newX, y: newY, width: newW, height: newH }
      }

      onUpdatePlaceholders(updated)
    }

    const handleTouchEnd = () => {
      dragState.current = null
    }

    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
    return () => {
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [placeholders, getPercentage, onUpdatePlaceholders])

  return (
    <div
      ref={canvasRef}
      className="relative w-full border-2 border-dashed border-muted-foreground/30 rounded-lg overflow-hidden bg-muted/50 cursor-crosshair"
      style={{ aspectRatio: imageAspect }}
      onClick={handleCanvasClick}
    >
      {/* Strip Image Background */}
      {stripImageUrl ? (
        <img
          src={stripImageUrl}
          alt="Strip design"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget
            if (img.naturalWidth && img.naturalHeight) {
              setImageAspect(`${img.naturalWidth}/${img.naturalHeight}`)
            }
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-muted-foreground/50">
            <ImageIcon className="size-12 mx-auto mb-2" />
            <p className="text-sm">Upload a strip design</p>
          </div>
        </div>
      )}

      {/* Placeholders */}
      {placeholders.map((p, i) => (
        <div
          key={i}
          className={`absolute group ${
            selectedPlaceholder === i
              ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-transparent'
              : 'hover:ring-2 hover:ring-emerald-500/50'
          }`}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.width}%`,
            height: `${p.height}%`,
          }}
          onMouseDown={(e) => handleMouseDown(e, i, 'move')}
          onTouchStart={(e) => handleTouchStart(e, i, 'move')}
        >
          {/* Placeholder body */}
          <div
            className="w-full h-full border-2 border-dashed border-emerald-500/70 bg-emerald-500/10 rounded-md flex items-center justify-center cursor-move select-none"
            style={{ borderRadius: `${p.borderRadius}px` }}
          >
            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-lg drop-shadow-sm">
              {i + 1}
            </span>
          </div>

          {/* Resize handles - only show when selected */}
          {selectedPlaceholder === i && (
            <>
              {/* NW */}
              <div
                className="absolute -top-1 -left-1 w-3 h-3 bg-emerald-500 rounded-full cursor-nw-resize z-10"
                onMouseDown={(e) => handleMouseDown(e, i, 'resize', 'nw')}
                onTouchStart={(e) => handleTouchStart(e, i, 'resize', 'nw')}
              />
              {/* NE */}
              <div
                className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full cursor-ne-resize z-10"
                onMouseDown={(e) => handleMouseDown(e, i, 'resize', 'ne')}
                onTouchStart={(e) => handleTouchStart(e, i, 'resize', 'ne')}
              />
              {/* SW */}
              <div
                className="absolute -bottom-1 -left-1 w-3 h-3 bg-emerald-500 rounded-full cursor-sw-resize z-10"
                onMouseDown={(e) => handleMouseDown(e, i, 'resize', 'sw')}
                onTouchStart={(e) => handleTouchStart(e, i, 'resize', 'sw')}
              />
              {/* SE */}
              <div
                className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full cursor-se-resize z-10"
                onMouseDown={(e) => handleMouseDown(e, i, 'resize', 'se')}
                onTouchStart={(e) => handleTouchStart(e, i, 'resize', 'se')}
              />
            </>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Mini Template Preview ───────────────────────────────────────────────────

function MiniTemplatePreview({ template }: { template: TemplateItem }) {
  const placeholders: Placeholder[] = template.placeholders
    ? (() => {
        try { return JSON.parse(template.placeholders) } catch { return [] }
      })()
    : []
  const imageUrl = template.stripImageUrl || template.frameUrl
  const [imageAspect, setImageAspect] = useState<string>('2/3')

  return (
    <div
      className="relative w-full bg-muted/50 rounded-md overflow-hidden"
      style={{ aspectRatio: imageAspect }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={template.name}
          className="absolute inset-0 w-full h-full object-contain"
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget
            if (img.naturalWidth && img.naturalHeight) {
              setImageAspect(`${img.naturalWidth}/${img.naturalHeight}`)
            }
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Frame className="size-8 text-muted-foreground/40" />
        </div>
      )}
      {placeholders.map((p, i) => (
        <div
          key={i}
          className="absolute border border-emerald-500/50 bg-emerald-500/10 rounded-[2px]"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.width}%`,
            height: `${p.height}%`,
          }}
        />
      ))}
    </div>
  )
}

// ── Main Templates Page ─────────────────────────────────────────────────────

export default function TemplatesPage() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const currentRole = (session?.user as any)?.role as string | undefined
  const currentOrgId = (session?.user as any)?.organizationId as string | undefined
  const isFacilitatorRole = currentRole === 'FACILITATOR'

  // State
  const [page, setPage] = useState(1)
  const [filterEventId, setFilterEventId] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [form, setForm] = useState<TemplateFormData>(emptyForm)
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<number | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch templates
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

  // Fetch events
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
          stripImageUrl: data.stripImageUrl || null,
          placeholders: data.placeholders,
          layout: data.layout || null,
          captureMode: data.captureMode,
          captureDelay: data.captureDelay,
          includeGif: data.includeGif,
          printAuto: data.printAuto,
          emailAuto: data.emailAuto,
          active: data.active,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to create template')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Template created', { description: 'The template has been created successfully.' })
      closeDialog()
    },
    onError: (err: Error) => {
      toast.error('Error', { description: err.message })
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TemplateFormData }) => {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description || null,
          stripImageUrl: data.stripImageUrl || null,
          placeholders: data.placeholders,
          layout: data.layout || null,
          captureMode: data.captureMode,
          captureDelay: data.captureDelay,
          includeGif: data.includeGif,
          printAuto: data.printAuto,
          emailAuto: data.emailAuto,
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
      closeDialog()
    },
    onError: (err: Error) => {
      toast.error('Error', { description: err.message })
    },
  })

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to update template')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Status updated')
    },
    onError: (err: Error) => {
      toast.error('Error', { description: err.message })
    },
  })

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (template: TemplateItem) => {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: template.eventId,
          name: `${template.name} (Copy)`,
          description: template.description,
          stripImageUrl: template.stripImageUrl,
          placeholders: template.placeholders,
          layout: template.layout,
          captureMode: template.captureMode || 'manual',
          captureDelay: template.captureDelay || 3,
          includeGif: template.includeGif,
          printAuto: template.printAuto,
          emailAuto: template.emailAuto,
          active: true,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to duplicate template')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Template duplicated')
    },
    onError: (err: Error) => {
      toast.error('Error', { description: err.message })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to delete template')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Template deleted')
      setDeleteDialogOpen(false)
      setDeletingTemplateId(null)
    },
    onError: (err: Error) => {
      toast.error('Error', { description: err.message })
    },
  })

  // ── Handlers ────────────────────────────────────────────────────────────

  function closeDialog() {
    setDialogOpen(false)
    setIsEditing(false)
    setEditingTemplateId(null)
    setForm(emptyForm)
    setCurrentStep(1)
    setSelectedPlaceholder(null)
  }

  function openCreate() {
    setForm(emptyForm)
    setIsEditing(false)
    setEditingTemplateId(null)
    setCurrentStep(1)
    setSelectedPlaceholder(null)
    setDialogOpen(true)
  }

  function openEdit(template: TemplateItem) {
    const parsedPlaceholders: Placeholder[] = template.placeholders
      ? (() => { try { return JSON.parse(template.placeholders) } catch { return [] } })()
      : []

    setForm({
      eventId: template.eventId,
      name: template.name,
      description: template.description || '',
      stripImageUrl: template.stripImageUrl || template.frameUrl || '',
      placeholders: parsedPlaceholders,
      layout: template.layout || '',
      captureMode: template.captureMode || 'manual',
      captureDelay: template.captureDelay || 3,
      includeGif: template.includeGif,
      printAuto: template.printAuto,
      emailAuto: template.emailAuto,
      active: template.active,
    })
    setIsEditing(true)
    setEditingTemplateId(template.id)
    setCurrentStep(1)
    setSelectedPlaceholder(null)
    setDialogOpen(true)
  }

  async function handleFileUpload(file: File) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      // Guard against HTML responses (e.g. redirects, 404 pages)
      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        // Server returned non-JSON (likely HTML error page or redirect)
        if (res.status === 401) {
          throw new Error('Please sign in to upload files.')
        }
        throw new Error(`Server returned ${res.status} — please try again.`)
      }

      const json = await res.json()
      const errMsg = typeof json.error === 'string'
        ? json.error
        : (json.error?.message || JSON.stringify(json.error) || 'Upload failed')
      if (!json.success) throw new Error(errMsg)

      setForm((f) => ({ ...f, stripImageUrl: json.data.url }))
      toast.success('Image uploaded')
    } catch (err: any) {
      console.error('Upload error:', err)
      const errMsg = typeof err === 'string' ? err : (err?.message || 'Upload failed')
      toast.error('Upload failed', { description: errMsg })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file)
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  function handleLayoutPreset(layoutKey: string) {
    const newPlaceholders = generatePlaceholdersFromLayout(layoutKey)
    setForm((f) => ({
      ...f,
      layout: layoutKey,
      placeholders: newPlaceholders,
    }))
    setSelectedPlaceholder(null)
  }

  function handleAddPlaceholder() {
    const newPh: Placeholder = {
      x: 10,
      y: 10 + form.placeholders.length * 5,
      width: 35,
      height: 25,
      borderRadius: 4,
    }
    setForm((f) => ({
      ...f,
      layout: 'custom',
      placeholders: [...f.placeholders, newPh],
    }))
    setSelectedPlaceholder(form.placeholders.length)
  }

  function handleRemovePlaceholder(index: number) {
    setForm((f) => ({
      ...f,
      layout: 'custom',
      placeholders: f.placeholders.filter((_, i) => i !== index),
    }))
    setSelectedPlaceholder(null)
  }

  function handleNextStep() {
    if (currentStep === 1) {
      if (!form.eventId || !form.name.trim()) {
        toast.error('Validation Error', { description: 'Event and Name are required before proceeding.' })
        return
      }
    }
    if (currentStep === 2) {
      if (uploading) {
        toast.error('Please wait', { description: 'An upload is in progress. Please wait for it to complete.' })
        return
      }
    }
    setCurrentStep((s) => s + 1)
  }

  function handleSaveDraft() {
    if (!form.eventId || !form.name.trim()) {
      toast.error('Validation Error', { description: 'Event and Name are required to save.' })
      if (currentStep !== 1) setCurrentStep(1)
      return
    }
    if (isEditing && editingTemplateId) {
      updateMutation.mutate({ id: editingTemplateId, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  function handleSubmit() {
    if (!form.eventId || !form.name.trim()) {
      toast.error('Validation Error', { description: 'Event and Name are required.' })
      setCurrentStep(1)
      return
    }
    if (isEditing && editingTemplateId) {
      updateMutation.mutate({ id: editingTemplateId, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  // FACILITATOR: show read-only template browser with selection
  if (isFacilitatorRole) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">Browse and select photo templates for your events.</p>
        </div>

        {/* Info banner */}
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 flex items-start gap-3">
          <Palette className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">View-Only Access</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              You can browse and use templates created by your organization admin. To create or edit templates, contact your admin.
            </p>
          </div>
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
            <Button variant="ghost" size="sm" onClick={() => { setFilterEventId('all'); setPage(1) }} className="gap-1">
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
                No templates have been created yet. Ask your organization admin to create one.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className={`hover:shadow-md transition-shadow border-l-4 ${template.active ? 'border-l-emerald-500' : 'border-l-gray-400'} overflow-hidden`}>
                {/* Preview */}
                <div className="px-4 pt-4">
                  <MiniTemplatePreview template={template} />
                </div>

                <CardHeader className="pb-2 pt-3">
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
                  <div className="flex flex-wrap gap-1.5">
                    {template.layout && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <LayoutGrid className="size-3" />
                        {template.layout}
                      </Badge>
                    )}
                    {template.captureMode === 'auto' && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Timer className="size-3" />
                        Auto {template.captureDelay}s
                      </Badge>
                    )}
                    {template.includeGif && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Camera className="size-3" />
                        GIF
                      </Badge>
                    )}
                    {template.printAuto && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Printer className="size-3" />
                        Auto Print
                      </Badge>
                    )}
                    {template.emailAuto && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Mail className="size-3" />
                        Auto Email
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(template.createdAt), 'MMM d, yyyy')}
                    </span>
                    <Button
                      size="sm"
                      className="gap-1.5 h-8 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                      onClick={() => {
                        const store = useAppStore.getState()
                        store.setSelectedTemplateId(template.id)
                        store.setCurrentPage('live-display')
                        toast.success('Template selected', { description: `Using "${template.name}" — opening Live Display.` })
                      }}
                    >
                      <Camera className="size-3.5" />
                      Use Template
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
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
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
        <Button onClick={openCreate} className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
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
          <Button variant="ghost" size="sm" onClick={() => { setFilterEventId('all'); setPage(1) }} className="gap-1">
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
            <Card key={template.id} className="hover:shadow-md transition-shadow border-l-4 border-l-emerald-500 overflow-hidden">
              {/* Preview */}
              <div className="px-4 pt-4">
                <MiniTemplatePreview template={template} />
              </div>

              <CardHeader className="pb-2 pt-3">
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
                <div className="flex flex-wrap gap-1.5">
                  {template.layout && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <LayoutGrid className="size-3" />
                      {template.layout}
                    </Badge>
                  )}
                  {template.captureMode === 'auto' && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Timer className="size-3" />
                      Auto {template.captureDelay}s
                    </Badge>
                  )}
                  {template.includeGif && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Camera className="size-3" />
                      GIF
                    </Badge>
                  )}
                  {template.printAuto && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Printer className="size-3" />
                      Auto Print
                    </Badge>
                  )}
                  {template.emailAuto && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Mail className="size-3" />
                      Auto Email
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(template.createdAt), 'MMM d, yyyy')}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      className="gap-1 h-7 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                      onClick={() => {
                        const store = useAppStore.getState()
                        store.setSelectedTemplateId(template.id)
                        store.setCurrentPage('live-display')
                        toast.success('Template selected', { description: `Using "${template.name}" — opening Live Display.` })
                      }}
                    >
                      <Camera className="size-3" />
                      Use
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 h-7 text-xs"
                      onClick={() => openEdit(template)}
                    >
                      <Pencil className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 h-7 text-xs"
                      onClick={() => duplicateMutation.mutate(template)}
                      disabled={duplicateMutation.isPending}
                    >
                      <Copy className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 h-7 text-xs"
                      onClick={() => toggleActiveMutation.mutate({ id: template.id, active: !template.active })}
                      disabled={toggleActiveMutation.isPending}
                    >
                      {template.active ? <XCircle className="size-3" /> : <CheckCircle2 className="size-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => { setDeletingTemplateId(template.id); setDeleteDialogOpen(true) }}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTemplateId && deleteMutation.mutate(deletingTemplateId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create/Edit Template Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) {
          const hasUnsavedData = form.name.trim() !== '' || form.stripImageUrl !== ''
          if (hasUnsavedData) {
            if (!window.confirm('You have unsaved changes. Are you sure you want to close?')) return
          }
          closeDialog()
        } else {
          setDialogOpen(true)
        }
      }}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>{isEditing ? 'Edit Template' : 'Create Template'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update your photo template design and settings.' : 'Design a new photo template with visual editor.'}
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="px-6 pt-4">
            <div className="flex items-center gap-2">
              {[
                { step: 1, label: 'Basic Info' },
                { step: 2, label: 'Strip Design' },
                { step: 3, label: 'Layout' },
                { step: 4, label: 'Capture' },
              ].map((s, i) => (
                <div key={s.step} className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentStep(s.step)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                      currentStep === s.step
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        : currentStep > s.step
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {currentStep > s.step ? (
                      <CheckCircle2 className="size-3.5" />
                    ) : (
                      <span className="size-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                        {s.step}
                      </span>
                    )}
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {i < 3 && <ChevronRight className="size-3 text-muted-foreground/50" />}
                </div>
              ))}
            </div>
          </div>

          <ScrollArea className="max-h-[60vh] px-6">
            <div className="py-4 space-y-5">
              {/* Step 1: Basic Info */}
              {currentStep === 1 && (
                <div className="space-y-4">
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
                    <Label htmlFor="tpl-name">Template Name *</Label>
                    <Input
                      id="tpl-name"
                      placeholder="e.g. Graduation 2025 Strip"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tpl-desc">Description</Label>
                    <Textarea
                      id="tpl-desc"
                      placeholder="Brief description of this template..."
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tpl-active">Active</Label>
                    <Switch
                      id="tpl-active"
                      checked={form.active}
                      onCheckedChange={(val) => setForm((f) => ({ ...f, active: val }))}
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Strip Design */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">Strip Design Image</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload the background/frame image for your photo strip. This is the decorative border that photos will be placed on.
                    </p>
                  </div>

                  {form.stripImageUrl ? (
                    <div className="space-y-3">
                      <div className="relative rounded-lg overflow-hidden border bg-muted/30 flex items-center justify-center">
                        <img
                          src={form.stripImageUrl}
                          alt="Strip design"
                          className="max-w-full object-contain"
                          style={{ maxHeight: '300px' }}
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 gap-1"
                          onClick={() => setForm((f) => ({ ...f, stripImageUrl: '' }))}
                        >
                          <X className="size-3" />
                          Remove
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <Upload className="size-3" />
                        {uploading ? 'Uploading...' : 'Replace Image'}
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      <Upload className="size-10 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-sm font-medium">Click or drag & drop to upload</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP up to 10MB</p>
                      {uploading && (
                        <div className="mt-3">
                          <div className="w-32 h-1.5 bg-muted rounded-full mx-auto overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Uploading...</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-center mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="size-3.5" />
                      {uploading ? 'Uploading...' : 'Upload Image'}
                    </Button>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                    <p className="font-medium flex items-center gap-1.5">
                      <ImageIcon className="size-4 text-emerald-600" />
                      Tips for strip designs
                    </p>
                    <ul className="text-muted-foreground text-xs space-y-1 ml-5 list-disc">
                      <li>Use a 2:3 aspect ratio for standard photo strips</li>
                      <li>Leave space for photo placeholders in your design</li>
                      <li>Use transparent PNG if you want overlays</li>
                      <li>Common strip size: 600×900px or 1200×1800px</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Step 3: Layout & Placeholders */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <div>
                    <Label className="text-base font-semibold">Photo Layout</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Choose a quick layout preset or create a custom arrangement.
                    </p>
                  </div>

                  {/* Layout Presets */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Quick Presets</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {Object.entries(LAYOUT_PRESETS).map(([key, preset]) => (
                        <button
                          key={key}
                          onClick={() => handleLayoutPreset(key)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                            form.layout === key
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'border-muted hover:border-emerald-500/50 hover:bg-emerald-500/5'
                          }`}
                        >
                          <LayoutPresetIcon cols={preset.cols} rows={preset.rows} />
                          <span className="text-xs font-medium">{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom placeholder controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1" onClick={handleAddPlaceholder}>
                      <Plus className="size-3.5" />
                      Add Placeholder
                    </Button>
                    {selectedPlaceholder !== null && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-destructive hover:text-destructive"
                        onClick={() => handleRemovePlaceholder(selectedPlaceholder)}
                      >
                        <Trash2 className="size-3.5" />
                        Remove #{selectedPlaceholder + 1}
                      </Button>
                    )}
                    {form.placeholders.length > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        {form.placeholders.length} photo slot{form.placeholders.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {form.layout && (
                      <Badge variant="outline" className="gap-1">
                        <LayoutGrid className="size-3" />
                        {form.layout}
                      </Badge>
                    )}
                  </div>

                  {/* Visual Canvas */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Move className="size-4" />
                      Visual Editor
                      <span className="text-xs font-normal text-muted-foreground">— drag to move, corners to resize</span>
                    </Label>
                    <PlaceholderCanvas
                      stripImageUrl={form.stripImageUrl}
                      placeholders={form.placeholders}
                      selectedPlaceholder={selectedPlaceholder}
                      onSelectPlaceholder={setSelectedPlaceholder}
                      onUpdatePlaceholders={(newPlaceholders) => setForm((f) => ({ ...f, placeholders: newPlaceholders }))}
                    />
                  </div>

                  {/* Selected placeholder properties */}
                  {selectedPlaceholder !== null && form.placeholders[selectedPlaceholder] && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <Label className="text-sm font-medium">Placeholder #{selectedPlaceholder + 1} Properties</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">X Position (%)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={Math.round(form.placeholders[selectedPlaceholder].x)}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0
                              const updated = [...form.placeholders]
                              updated[selectedPlaceholder] = { ...updated[selectedPlaceholder], x: Math.max(0, Math.min(100, val)) }
                              setForm((f) => ({ ...f, placeholders: updated }))
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Y Position (%)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={Math.round(form.placeholders[selectedPlaceholder].y)}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0
                              const updated = [...form.placeholders]
                              updated[selectedPlaceholder] = { ...updated[selectedPlaceholder], y: Math.max(0, Math.min(100, val)) }
                              setForm((f) => ({ ...f, placeholders: updated }))
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Width (%)</Label>
                          <Input
                            type="number"
                            min={5}
                            max={100}
                            value={Math.round(form.placeholders[selectedPlaceholder].width)}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 5
                              const updated = [...form.placeholders]
                              updated[selectedPlaceholder] = { ...updated[selectedPlaceholder], width: Math.max(5, Math.min(100, val)) }
                              setForm((f) => ({ ...f, placeholders: updated }))
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Height (%)</Label>
                          <Input
                            type="number"
                            min={5}
                            max={100}
                            value={Math.round(form.placeholders[selectedPlaceholder].height)}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 5
                              const updated = [...form.placeholders]
                              updated[selectedPlaceholder] = { ...updated[selectedPlaceholder], height: Math.max(5, Math.min(100, val)) }
                              setForm((f) => ({ ...f, placeholders: updated }))
                            }}
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs text-muted-foreground">Border Radius (px)</Label>
                          <Slider
                            min={0}
                            max={32}
                            step={1}
                            value={[form.placeholders[selectedPlaceholder].borderRadius]}
                            onValueChange={([val]) => {
                              const updated = [...form.placeholders]
                              updated[selectedPlaceholder] = { ...updated[selectedPlaceholder], borderRadius: val }
                              setForm((f) => ({ ...f, placeholders: updated }))
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Capture Settings */}
              {currentStep === 4 && (
                <div className="space-y-5">
                  <div>
                    <Label className="text-base font-semibold">Capture Settings</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure how photos are captured and processed.
                    </p>
                  </div>

                  {/* Capture Mode */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Capture Mode</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setForm((f) => ({ ...f, captureMode: 'manual' }))}
                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                          form.captureMode === 'manual'
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-muted hover:border-emerald-500/50'
                        }`}
                      >
                        <Camera className="size-6" />
                        <span className="text-sm font-medium">Manual</span>
                        <span className="text-xs text-muted-foreground">Tap to capture each photo</span>
                      </button>
                      <button
                        onClick={() => setForm((f) => ({ ...f, captureMode: 'auto' }))}
                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                          form.captureMode === 'auto'
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-muted hover:border-emerald-500/50'
                        }`}
                      >
                        <Timer className="size-6" />
                        <span className="text-sm font-medium">Auto-Sequential</span>
                        <span className="text-xs text-muted-foreground">Captures photos automatically</span>
                      </button>
                    </div>
                  </div>

                  {/* Auto Capture Delay */}
                  {form.captureMode === 'auto' && (
                    <div className="space-y-2 bg-muted/50 rounded-lg p-4">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <Timer className="size-4" />
                        Delay Between Shots
                      </Label>
                      <div className="flex items-center gap-4">
                        <Slider
                          min={2}
                          max={15}
                          step={1}
                          value={[form.captureDelay]}
                          onValueChange={([val]) => setForm((f) => ({ ...f, captureDelay: val }))}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium tabular-nums w-12 text-right">
                          {form.captureDelay}s
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Countdown between each photo capture
                      </p>
                    </div>
                  )}

                  {/* Toggle Options */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-2">
                          <Camera className="size-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Include Boomerang GIF</Label>
                          <p className="text-xs text-muted-foreground">Capture a short boomerang clip along with photos</p>
                        </div>
                      </div>
                      <Switch
                        checked={form.includeGif}
                        onCheckedChange={(val) => setForm((f) => ({ ...f, includeGif: val }))}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-2">
                          <Printer className="size-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Auto-Print</Label>
                          <p className="text-xs text-muted-foreground">Automatically print after all photos are captured</p>
                        </div>
                      </div>
                      <Switch
                        checked={form.printAuto}
                        onCheckedChange={(val) => setForm((f) => ({ ...f, printAuto: val }))}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-2">
                          <Mail className="size-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Auto-Email</Label>
                          <p className="text-xs text-muted-foreground">Automatically email the final strip to the guest</p>
                        </div>
                      </div>
                      <Switch
                        checked={form.emailAuto}
                        onCheckedChange={(val) => setForm((f) => ({ ...f, emailAuto: val }))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="px-6 py-4 border-t">
            <div className="flex items-center justify-between w-full">
              <div>
                {currentStep > 1 && (
                  <Button variant="outline" onClick={() => setCurrentStep((s) => s - 1)} className="gap-1">
                    <ChevronLeft className="size-4" />
                    Back
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleSaveDraft}
                  disabled={isPending}
                  className="gap-1"
                >
                  {isPending ? 'Saving...' : 'Save'}
                </Button>
                {currentStep < 4 ? (
                  <Button onClick={handleNextStep} className="gap-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={isPending} className="gap-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
                    {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Template'}
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
          className="hidden"
          onChange={handleFileInput}
        />
      </DialogContent>
    </Dialog>
    </div>
  )
}
