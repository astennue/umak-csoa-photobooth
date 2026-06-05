'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { format, formatDistanceToNow } from 'date-fns'
import {
  ImageIcon,
  Heart,
  Upload,
  Globe,
  Lock,
  Filter,
  X,
  Eye,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Types
interface GalleryItem {
  id: string
  eventId: string
  sessionId: string | null
  photoUrl: string
  thumbnailUrl: string | null
  caption: string | null
  isPublic: boolean
  isFavorite: boolean
  createdAt: string
  event: { id: string; name: string }
  gallerySession: { id: string; guestName: string } | null
}

interface EventOption {
  id: string
  name: string
}

interface SessionOption {
  id: string
  guestName: string
  eventId: string
}

export default function GalleryPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // State
  const [page, setPage] = useState(1)
  const [eventId, setEventId] = useState<string>('all')
  const [sessionId, setSessionId] = useState<string>('all')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryItem | null>(null)

  // Upload form state
  const [formEventId, setFormEventId] = useState('')
  const [formSessionId, setFormSessionId] = useState('')
  const [formPhotoUrl, setFormPhotoUrl] = useState('')
  const [formCaption, setFormCaption] = useState('')
  const [formIsPublic, setFormIsPublic] = useState(true)
  const [formIsFavorite, setFormIsFavorite] = useState(false)

  // Fetch gallery
  const { data: galleryData, isLoading } = useQuery({
    queryKey: ['gallery', page, eventId, sessionId],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (eventId && eventId !== 'all') params.set('eventId', eventId)
      if (sessionId && sessionId !== 'all') params.set('sessionId', sessionId)
      const res = await fetch(`/api/gallery?${params}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to fetch gallery')
      return json
    },
  })

  // Fetch events for filters
  const { data: eventsData } = useQuery({
    queryKey: ['events-list'],
    queryFn: async () => {
      const res = await fetch('/api/events?limit=100')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json
    },
  })

  // Fetch sessions for filters (filtered by event)
  const { data: sessionsData } = useQuery({
    queryKey: ['sessions-list', eventId],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' })
      if (eventId && eventId !== 'all') params.set('eventId', eventId)
      const res = await fetch(`/api/sessions?${params}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json
    },
  })

  // Fetch sessions for form (filtered by selected form event)
  const { data: formSessionsData } = useQuery({
    queryKey: ['form-sessions', formEventId],
    queryFn: async () => {
      if (!formEventId) return { data: [] }
      const res = await fetch(`/api/sessions?eventId=${formEventId}&limit=100`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json
    },
    enabled: !!formEventId,
  })

  const events: EventOption[] = eventsData?.data ?? []
  const sessions: SessionOption[] = sessionsData?.data ?? []
  const formSessions: SessionOption[] = formSessionsData?.data ?? []
  const photos: GalleryItem[] = galleryData?.data ?? []
  const totalPages = galleryData?.total
    ? Math.ceil(galleryData.total / 20)
    : 1

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: {
      eventId: string
      sessionId?: string
      photoUrl: string
      thumbnailUrl?: string
      caption?: string
      isPublic: boolean
      isFavorite: boolean
    }) => {
      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to upload photo')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] })
      toast({ title: 'Photo uploaded', description: 'The photo has been added to the gallery.' })
      resetForm()
      setUploadOpen(false)
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    },
  })

  // Toggle favorite mutation
  const favoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const res = await fetch(`/api/gallery/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to update')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] })
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    },
  })

  function resetForm() {
    setFormEventId('')
    setFormSessionId('')
    setFormPhotoUrl('')
    setFormCaption('')
    setFormIsPublic(true)
    setFormIsFavorite(false)
  }

  function handleUpload() {
    if (!formEventId || !formPhotoUrl.trim()) {
      toast({ title: 'Validation Error', description: 'Event and Photo URL are required.', variant: 'destructive' })
      return
    }
    uploadMutation.mutate({
      eventId: formEventId,
      sessionId: formSessionId || undefined,
      photoUrl: formPhotoUrl.trim(),
      thumbnailUrl: formPhotoUrl.trim(),
      caption: formCaption.trim() || undefined,
      isPublic: formIsPublic,
      isFavorite: formIsFavorite,
    })
  }

  function openDetail(photo: GalleryItem) {
    setSelectedPhoto(photo)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Photo Gallery</h1>
          <p className="text-muted-foreground">Browse and manage photos from all events and sessions.</p>
        </div>
        <Button onClick={() => setUploadOpen(true)} className="gap-2">
          <Upload className="size-4" />
          Upload Photo
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filters:</span>
        </div>
        <Select value={eventId} onValueChange={(val) => { setEventId(val); setSessionId('all'); setPage(1) }}>
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

        <Select value={sessionId} onValueChange={(val) => { setSessionId(val); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Sessions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sessions</SelectItem>
            {sessions.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.guestName}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(eventId !== 'all' || sessionId !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setEventId('all'); setSessionId('all'); setPage(1) }}
            className="gap-1"
          >
            <X className="size-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Photo Grid */}
      {isLoading ? (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="break-inside-avoid overflow-hidden">
              <Skeleton className="aspect-[4/3] w-full" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      ) : photos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="size-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No photos found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Upload a photo or adjust your filters to see results.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {photos.map((photo) => (
            <Card
              key={photo.id}
              className="break-inside-avoid overflow-hidden group cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openDetail(photo)}
            >
              <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                <img
                  src={photo.thumbnailUrl || photo.photoUrl}
                  alt={photo.caption || 'Gallery photo'}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = ''
                    ;(e.target as HTMLImageElement).alt = 'Image unavailable'
                  }}
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                {/* Favorite button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`absolute top-2 right-2 size-8 rounded-full bg-black/40 hover:bg-black/60 ${
                          photo.isFavorite ? 'text-red-400' : 'text-white/70'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          favoriteMutation.mutate({ id: photo.id, isFavorite: !photo.isFavorite })
                        }}
                      >
                        <Heart className={`size-4 ${photo.isFavorite ? 'fill-current' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{photo.isFavorite ? 'Remove from favorites' : 'Add to favorites'}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {/* Public/Private badge */}
                <Badge
                  variant="secondary"
                  className={`absolute top-2 left-2 text-xs gap-1 ${
                    photo.isPublic ? 'bg-green-500/80 text-white' : 'bg-gray-500/80 text-white'
                  }`}
                >
                  {photo.isPublic ? <Globe className="size-3" /> : <Lock className="size-3" />}
                  {photo.isPublic ? 'Public' : 'Private'}
                </Badge>
              </div>
              <CardContent className="p-3">
                {photo.caption && (
                  <p className="text-sm font-medium truncate">{photo.caption}</p>
                )}
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground truncate">{photo.event.name}</p>
                  {photo.gallerySession && (
                    <p className="text-xs text-muted-foreground truncate ml-2">{photo.gallerySession.guestName}</p>
                  )}
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

      {/* Upload Photo Dialog */}
      <Dialog open={uploadOpen} onOpenChange={(open) => { if (!open) resetForm(); setUploadOpen(open) }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Photo</DialogTitle>
            <DialogDescription>Add a new photo to the gallery.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="grid gap-4 py-4 px-1">
              <div className="grid gap-2">
                <Label htmlFor="upload-event">Event *</Label>
                <Select value={formEventId} onValueChange={(val) => { setFormEventId(val); setFormSessionId('') }}>
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
                <Label htmlFor="upload-session">Session</Label>
                <Select value={formSessionId} onValueChange={setFormSessionId} disabled={!formEventId}>
                  <SelectTrigger>
                    <SelectValue placeholder={formEventId ? 'Select a session' : 'Select an event first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {formSessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.guestName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="upload-url">Photo URL *</Label>
                <Input
                  id="upload-url"
                  placeholder="https://example.com/photo.jpg"
                  value={formPhotoUrl}
                  onChange={(e) => setFormPhotoUrl(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="upload-caption">Caption</Label>
                <Input
                  id="upload-caption"
                  placeholder="A caption for the photo"
                  value={formCaption}
                  onChange={(e) => setFormCaption(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="upload-public">Public</Label>
                <Switch
                  id="upload-public"
                  checked={formIsPublic}
                  onCheckedChange={setFormIsPublic}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="upload-favorite">Favorite</Label>
                <Switch
                  id="upload-favorite"
                  checked={formIsFavorite}
                  onCheckedChange={setFormIsFavorite}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setUploadOpen(false) }}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedPhoto && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="size-5" />
                  Photo Details
                </DialogTitle>
                <DialogDescription>
                  {selectedPhoto.caption || 'No caption provided'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
                  <img
                    src={selectedPhoto.photoUrl}
                    alt={selectedPhoto.caption || 'Gallery photo'}
                    className="object-contain w-full h-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = ''
                      ;(e.target as HTMLImageElement).alt = 'Image unavailable'
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Event</span>
                    <p className="font-medium">{selectedPhoto.event.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Session</span>
                    <p className="font-medium">{selectedPhoto.gallerySession?.guestName ?? 'None'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Visibility</span>
                    <div className="mt-1">
                      <Badge variant={selectedPhoto.isPublic ? 'default' : 'secondary'} className="gap-1">
                        {selectedPhoto.isPublic ? <Globe className="size-3" /> : <Lock className="size-3" />}
                        {selectedPhoto.isPublic ? 'Public' : 'Private'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Favorite</span>
                    <div className="mt-1">
                      <Badge variant={selectedPhoto.isFavorite ? 'default' : 'secondary'} className="gap-1">
                        <Heart className={`size-3 ${selectedPhoto.isFavorite ? 'fill-current' : ''}`} />
                        {selectedPhoto.isFavorite ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created</span>
                    <p className="font-medium">{format(new Date(selectedPhoto.createdAt), 'PPpp')}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Relative</span>
                    <p className="font-medium">{formatDistanceToNow(new Date(selectedPhoto.createdAt), { addSuffix: true })}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
