'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Radio,
  Users,
  Clock,
  CheckCircle,
  Camera,
  CameraOff,
  User,
  Hash,
  ArrowRight,
  Palette,
  Sparkles,
  Aperture,
  Upload,
  X,
  AlertCircle,
  Loader2,
  ImageIcon,
} from 'lucide-react'
import { toast } from 'sonner'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ActiveSession {
  id: string
  guestName: string
  guestEmail?: string | null
  guestPhone?: string | null
  status: string
  notes?: string | null
  startedAt?: string | null
  event: {
    id: string
    name: string
    organizationId: string
  }
}

interface QueueEntry {
  id: string
  position: number
  name: string
  status: string
  event: {
    id: string
    name: string
  }
}

interface SessionsResponse {
  data: ActiveSession[]
  meta?: { total: number; page: number; limit: number }
}

interface QueueResponse {
  data: QueueEntry[]
  meta?: { total: number; page: number; limit: number }
}

type BackgroundType = 'none' | 'blur' | 'color' | 'gradient' | 'image' | 'custom'

interface BackgroundOption {
  id: string
  type: BackgroundType
  label: string
  value: string
  preview: string
}

/* ------------------------------------------------------------------ */
/*  Built-in backgrounds                                               */
/* ------------------------------------------------------------------ */

const BUILT_IN_BACKGROUNDS: BackgroundOption[] = [
  { id: 'none', type: 'none', label: 'None', value: '', preview: 'bg-stone-700' },
  { id: 'blur', type: 'blur', label: 'Blur', value: '', preview: 'bg-stone-600 blur-[2px]' },
  { id: 'color-teal', type: 'color', label: 'Deep Teal', value: '#115e59', preview: 'bg-teal-800' },
  { id: 'color-amber', type: 'color', label: 'Warm Amber', value: '#92400e', preview: 'bg-amber-800' },
  { id: 'color-stone', type: 'color', label: 'Stone Gray', value: '#44403c', preview: 'bg-stone-700' },
  { id: 'color-emerald', type: 'color', label: 'Emerald', value: '#065f46', preview: 'bg-emerald-800' },
  {
    id: 'grad-1', type: 'gradient', label: 'Sunset',
    value: 'linear-gradient(135deg, #92400e 0%, #b45309 50%, #dc2626 100%)',
    preview: 'bg-gradient-to-br from-amber-800 via-amber-700 to-red-700',
  },
  {
    id: 'grad-2', type: 'gradient', label: 'Ocean',
    value: 'linear-gradient(135deg, #115e59 0%, #0e7490 50%, #1e40af 100%)',
    preview: 'bg-gradient-to-br from-teal-800 via-cyan-800 to-blue-900',
  },
  {
    id: 'grad-3', type: 'gradient', label: 'Forest',
    value: 'linear-gradient(135deg, #065f46 0%, #166534 50%, #1a2e05 100%)',
    preview: 'bg-gradient-to-br from-emerald-800 via-green-800 to-lime-950',
  },
  {
    id: 'grad-4', type: 'gradient', label: 'Dusk',
    value: 'linear-gradient(135deg, #312e81 0%, #581c87 50%, #831843 100%)',
    preview: 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900',
  },
]

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_VIDEO_WIDTH = 1280
const DEFAULT_VIDEO_HEIGHT = 720

/* ------------------------------------------------------------------ */
/*  Fetchers                                                           */
/* ------------------------------------------------------------------ */

async function fetchActiveSessions(): Promise<ActiveSession[]> {
  const res = await fetch('/api/sessions?status=IN_PROGRESS&limit=1')
  if (!res.ok) throw new Error('Failed to fetch sessions')
  const json: SessionsResponse = await res.json()
  return json.data ?? []
}

async function fetchQueue(): Promise<QueueEntry[]> {
  const res = await fetch('/api/queue?status=WAITING&limit=5')
  if (!res.ok) throw new Error('Failed to fetch queue')
  const json: QueueResponse = await res.json()
  return json.data ?? []
}

/* ------------------------------------------------------------------ */
/*  Live Timer Hook                                                    */
/* ------------------------------------------------------------------ */

function useLiveTimer(startedAt: string | null | undefined) {
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (!startedAt) return { hours: 0, minutes: 0, seconds: 0, display: '--:--' }

  const start = new Date(startedAt).getTime()
  const diff = Math.max(0, now - start)

  const hours = Math.floor(diff / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  const seconds = Math.floor((diff % 60_000) / 1_000)

  if (hours > 0) {
    return {
      hours, minutes, seconds,
      display: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
    }
  }
  return {
    hours, minutes, seconds,
    display: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
  }
}

/* ------------------------------------------------------------------ */
/*  Timer Display                                                      */
/* ------------------------------------------------------------------ */

function TimerDigit({ value }: { value: string }) {
  return (
    <span className="inline-block w-[1ch] text-center tabular-nums">{value}</span>
  )
}

function TimerDisplay({ display }: { display: string }) {
  const parts = display.split(':')
  return (
    <div className="flex items-baseline gap-0.5">
      {parts.map((part, partIdx) => (
        <span key={partIdx} className="flex items-baseline">
          {partIdx > 0 && (
            <span className="text-emerald-500/60 mx-1 font-light">:</span>
          )}
          {part.split('').map((char, charIdx) => (
            <TimerDigit key={charIdx} value={char} />
          ))}
        </span>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Queue Position Badge                                               */
/* ------------------------------------------------------------------ */

function QueuePositionBadge({ index }: { index: number }) {
  const isFirst = index === 0
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold ring-1 ${
        isFirst
          ? 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/25'
          : 'bg-slate-800/50 text-slate-500 ring-slate-700/50'
      }`}
    >
      {index + 1}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function LiveDisplay() {
  // ── Session/Queue queries ──
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions', 'IN_PROGRESS'],
    queryFn: fetchActiveSessions,
    refetchInterval: 5000,
  })

  const { data: queue, isLoading: queueLoading } = useQuery({
    queryKey: ['queue', 'WAITING'],
    queryFn: fetchQueue,
    refetchInterval: 5000,
  })

  const activeSession = sessions?.[0] ?? null
  const queueCount = queue?.length ?? 0

  // ── Camera state ──
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [modelLoading, setModelLoading] = useState(false)
  const [segmentationReady, setSegmentationReady] = useState(false)
  const [segmentationError, setSegmentationError] = useState<string | null>(null)

  // ── Background state ──
  const [selectedBg, setSelectedBg] = useState<string>('none')
  const [customBackgrounds, setCustomBackgrounds] = useState<BackgroundOption[]>([])

  const allBackgrounds = [...BUILT_IN_BACKGROUNDS, ...customBackgrounds]

  // ── Refs ──
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const personCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const bgImageRef = useRef<HTMLImageElement | null>(null)
  const animFrameRef = useRef<number>(0)
  const segmenterRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastSegmentTimeRef = useRef<number>(0)
  const cameraActiveRef = useRef<boolean>(false)
  const canvasSizeRef = useRef<{ w: number; h: number }>({
    w: DEFAULT_VIDEO_WIDTH,
    h: DEFAULT_VIDEO_HEIGHT,
  })

  // ── Keep cameraActiveRef in sync ──
  useEffect(() => {
    cameraActiveRef.current = cameraActive
  }, [cameraActive])

  // ── Initialize MediaPipe segmentation ──
  useEffect(() => {
    let cancelled = false

    async function initSegmentation() {
      try {
        setModelLoading(true)
        setSegmentationError(null)

        const visionModule = await import('@mediapipe/tasks-vision')
        const { FilesetResolver, ImageSegmenter } = visionModule

        if (cancelled) return

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
        )

        if (cancelled) return

        const segmenter = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          outputCategoryMask: true,
          outputConfidenceMasks: false,
        })

        if (cancelled) {
          segmenter.close()
          return
        }

        segmenterRef.current = segmenter
        setSegmentationReady(true)
        setModelLoading(false)
      } catch (err) {
        console.warn('Failed to initialize selfie segmentation:', err)
        if (!cancelled) {
          setModelLoading(false)
          setSegmentationReady(false)
          setSegmentationError('AI background removal unavailable. Camera still works without virtual backgrounds.')
        }
      }
    }

    initSegmentation()

    return () => {
      cancelled = true
      if (segmenterRef.current) {
        try { segmenterRef.current.close() } catch { /* ignore */ }
        segmenterRef.current = null
      }
    }
  }, [])

  // ── Load background image when selected ──
  useEffect(() => {
    const bg = allBackgrounds.find((b) => b.id === selectedBg)
    if (bg?.type === 'image' || bg?.type === 'custom') {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = bg.value
      img.onload = () => { bgImageRef.current = img }
      img.onerror = () => { bgImageRef.current = null }
    } else {
      bgImageRef.current = null
    }
  }, [selectedBg, customBackgrounds])

  // ── Ensure offscreen canvases ──
  const ensureOffscreenCanvas = useCallback(
    (ref: React.MutableRefObject<HTMLCanvasElement | null>) => {
      const { w, h } = canvasSizeRef.current
      if (!ref.current || ref.current.width !== w || ref.current.height !== h) {
        const c = document.createElement('canvas')
        c.width = w
        c.height = h
        ref.current = c
      }
      return ref.current
    },
    []
  )

  // ── Draw background on context ──
  const drawBackground = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const bg = allBackgrounds.find((b) => b.id === selectedBg)
      if (!bg || bg.type === 'none') {
        ctx.fillStyle = '#0c0a09'
        ctx.fillRect(0, 0, width, height)
        return
      }

      if (bg.type === 'blur') {
        ctx.save()
        ctx.filter = 'blur(16px) brightness(0.7)'
        if (videoRef.current && videoRef.current.readyState >= 2) {
          ctx.translate(width, 0)
          ctx.scale(-1, 1)
          ctx.drawImage(videoRef.current, 0, 0, width, height)
        }
        ctx.filter = 'none'
        ctx.restore()
      } else if (bg.type === 'color') {
        ctx.fillStyle = bg.value
        ctx.fillRect(0, 0, width, height)
      } else if (bg.type === 'gradient') {
        const colors = bg.value.match(/#[0-9a-fA-F]{6}/g)
        if (colors && colors.length >= 2) {
          const g = ctx.createLinearGradient(0, 0, width, height)
          const step = 1 / (colors.length - 1)
          colors.forEach((c: string, i: number) => {
            g.addColorStop(Math.min(i * step, 1), c)
          })
          ctx.fillStyle = g
        } else {
          ctx.fillStyle = '#44403c'
        }
        ctx.fillRect(0, 0, width, height)
      } else if ((bg.type === 'image' || bg.type === 'custom') && bgImageRef.current) {
        const img = bgImageRef.current
        const imgAspect = img.width / img.height
        const canvasAspect = width / height
        let drawW: number, drawH: number, drawX: number, drawY: number
        if (imgAspect > canvasAspect) {
          drawH = height
          drawW = height * imgAspect
          drawX = (width - drawW) / 2
          drawY = 0
        } else {
          drawW = width
          drawH = width / imgAspect
          drawX = 0
          drawY = (height - drawH) / 2
        }
        ctx.drawImage(img, drawX, drawY, drawW, drawH)
      } else {
        ctx.fillStyle = '#0c0a09'
        ctx.fillRect(0, 0, width, height)
      }
    },
    [selectedBg, allBackgrounds]
  )

  // ── Process segmentation mask ──
  const processMask = useCallback(
    (categoryMask: any, width: number, height: number): HTMLCanvasElement | null => {
      const maskCanvas = ensureOffscreenCanvas(maskCanvasRef)
      const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true })
      if (!maskCtx) return null

      maskCtx.clearRect(0, 0, width, height)

      try {
        if (typeof categoryMask === 'object' && categoryMask !== null) {
          const drawable = categoryMask.canvas || categoryMask
          maskCtx.drawImage(drawable as CanvasImageSource, 0, 0, width, height)
        }
      } catch (e) {
        console.warn('Failed to draw categoryMask:', e)
        return null
      }

      const maskData = maskCtx.getImageData(0, 0, width, height)
      const pixels = maskData.data

      let maxVal = 0
      for (let i = 0; i < Math.min(pixels.length, 400); i += 4) {
        if (pixels[i] > maxVal) maxVal = pixels[i]
      }
      const needsScaling = maxVal <= 1

      for (let i = 0; i < pixels.length; i += 4) {
        const category = needsScaling ? pixels[i] * 255 : pixels[i]
        const isPerson = category > 128
        pixels[i] = 255
        pixels[i + 1] = 255
        pixels[i + 2] = 255
        pixels[i + 3] = isPerson ? 255 : 0
      }

      maskCtx.putImageData(maskData, 0, 0)
      return maskCanvas
    },
    [ensureOffscreenCanvas]
  )

  // ── Main render loop ──
  const renderFrame = useCallback(() => {
    if (!cameraActiveRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) {
      animFrameRef.current = requestAnimationFrame(renderFrame)
      return
    }

    if (video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(renderFrame)
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const bg = allBackgrounds.find((b) => b.id === selectedBg)
    const hasVirtualBg = bg && bg.type !== 'none'

    // No virtual bg or no segmentation → just draw mirrored video
    if (!hasVirtualBg || !segmenterRef.current || !segmentationReady) {
      ctx.clearRect(0, 0, width, height)
      ctx.save()
      ctx.translate(width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0, width, height)
      ctx.restore()

      animFrameRef.current = requestAnimationFrame(renderFrame)
      return
    }

    // Run segmentation (~15fps)
    const now = performance.now()
    let maskCanvas: HTMLCanvasElement | null = maskCanvasRef.current

    if (now - lastSegmentTimeRef.current > 66) {
      try {
        const result = segmenterRef.current.segmentForVideo(video, now)
        lastSegmentTimeRef.current = now
        if (result && result.categoryMask) {
          maskCanvas = processMask(result.categoryMask, width, height)
        }
      } catch {
        // Use last good mask
      }
    }

    // Composite with mask
    if (maskCanvas) {
      const personCanvas = ensureOffscreenCanvas(personCanvasRef)
      const personCtx = personCanvas.getContext('2d')
      if (personCtx) {
        personCtx.clearRect(0, 0, width, height)
        personCtx.drawImage(maskCanvas, 0, 0, width, height)

        personCtx.globalCompositeOperation = 'source-in'
        personCtx.save()
        personCtx.translate(width, 0)
        personCtx.scale(-1, 1)
        personCtx.drawImage(video, 0, 0, width, height)
        personCtx.restore()
        personCtx.globalCompositeOperation = 'source-over'

        ctx.clearRect(0, 0, width, height)
        drawBackground(ctx, width, height)
        ctx.drawImage(personCanvas, 0, 0, width, height)
      } else {
        ctx.clearRect(0, 0, width, height)
        drawBackground(ctx, width, height)
        ctx.save()
        ctx.translate(width, 0)
        ctx.scale(-1, 1)
        ctx.drawImage(video, 0, 0, width, height)
        ctx.restore()
      }
    } else {
      ctx.clearRect(0, 0, width, height)
      drawBackground(ctx, width, height)
      ctx.save()
      ctx.translate(width, 0)
      ctx.scale(-1, 1)
      ctx.globalAlpha = 0.7
      ctx.drawImage(video, 0, 0, width, height)
      ctx.globalAlpha = 1
      ctx.restore()
    }

    animFrameRef.current = requestAnimationFrame(renderFrame)
  }, [selectedBg, segmentationReady, allBackgrounds, drawBackground, processMask, ensureOffscreenCanvas])

  // ── Start/stop render loop ──
  useEffect(() => {
    if (cameraActive && videoReady) {
      animFrameRef.current = requestAnimationFrame(renderFrame)
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = 0
      }
    }
  }, [cameraActive, videoReady, renderFrame])

  // ── Handle video metadata loaded ──
  const handleVideoLoaded = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (video && canvas) {
      const vw = video.videoWidth || DEFAULT_VIDEO_WIDTH
      const vh = video.videoHeight || DEFAULT_VIDEO_HEIGHT
      canvas.width = vw
      canvas.height = vh
      canvasSizeRef.current = { w: vw, h: vh }
      maskCanvasRef.current = null
      personCanvasRef.current = null
      setVideoReady(true)
    }
  }, [])

  // ── Start camera ──
  const startCamera = useCallback(async () => {
    setCameraError(null)
    setVideoReady(false)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream

        if (canvasRef.current) {
          canvasRef.current.width = DEFAULT_VIDEO_WIDTH
          canvasRef.current.height = DEFAULT_VIDEO_HEIGHT
          canvasSizeRef.current = { w: DEFAULT_VIDEO_WIDTH, h: DEFAULT_VIDEO_HEIGHT }
        }

        try {
          await videoRef.current.play()
        } catch {
          if (videoRef.current) {
            videoRef.current.muted = true
            await videoRef.current.play()
          }
        }

        setCameraActive(true)
      } else {
        setCameraActive(true)
      }
    } catch (err) {
      let message = 'An unexpected error occurred while accessing the camera.'
      if (err instanceof DOMException) {
        switch (err.name) {
          case 'NotAllowedError':
            message = 'Camera access denied. Please allow camera permissions and try again.'
            break
          case 'NotFoundError':
            message = 'No camera found. Please connect a camera and try again.'
            break
          case 'NotReadableError':
            message = 'Camera is already in use by another application.'
            break
          case 'OverconstrainedError':
            message = 'Camera does not support the requested resolution.'
            break
          default:
            message = `Camera error: ${err.message}`
        }
      }
      setCameraError(message)
      setCameraActive(false)
    }
  }, [])

  // ── Stop camera ──
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = 0
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    maskCanvasRef.current = null
    personCanvasRef.current = null
    setCameraActive(false)
    setVideoReady(false)
  }, [])

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      cameraActiveRef.current = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [])

  // ── Toggle camera ──
  const toggleCamera = useCallback(() => {
    if (cameraActive) {
      stopCamera()
    } else {
      startCamera()
    }
  }, [cameraActive, startCamera, stopCamera])

  // ── Handle custom background upload ──
  const handleCustomBgUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, etc.)')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      const newBg: BackgroundOption = {
        id: `custom-${Date.now()}`,
        type: 'custom',
        label: file.name.replace(/\.[^/.]+$/, '').slice(0, 12),
        value: dataUrl,
        preview: 'bg-stone-500',
      }
      setCustomBackgrounds((prev) => [...prev, newBg])
      setSelectedBg(newBg.id)
      toast.success(`Background "${newBg.label}" added`)
    }
    reader.readAsDataURL(file)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // ── Remove custom background ──
  const removeCustomBg = useCallback(
    (bgId: string) => {
      setCustomBackgrounds((prev) => prev.filter((b) => b.id !== bgId))
      if (selectedBg === bgId) {
        setSelectedBg('none')
      }
    },
    [selectedBg]
  )

  // ── Take photo ──
  const takePhoto = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !cameraActive) return

    setCapturing(true)

    try {
      const dataUrl = canvas.toDataURL('image/png')
      // Download the captured photo
      const link = document.createElement('a')
      link.download = `photobooth-${Date.now()}.png`
      link.href = dataUrl
      link.click()
      toast.success('Photo captured and downloaded!')
    } catch {
      try {
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = canvas.width
        tempCanvas.height = canvas.height
        const tempCtx = tempCanvas.getContext('2d')
        if (tempCtx && videoRef.current) {
          tempCtx.translate(tempCanvas.width, 0)
          tempCtx.scale(-1, 1)
          tempCtx.drawImage(videoRef.current, 0, 0, tempCanvas.width, tempCanvas.height)
          const dataUrl = tempCanvas.toDataURL('image/png')
          const link = document.createElement('a')
          link.download = `photobooth-${Date.now()}.png`
          link.href = dataUrl
          link.click()
          toast.success('Photo captured and downloaded!')
        }
      } catch {
        toast.error('Failed to capture photo')
      }
    } finally {
      setTimeout(() => setCapturing(false), 300)
    }
  }, [cameraActive])

  // ── Derived state ──
  const currentBg = allBackgrounds.find((b) => b.id === selectedBg)
  const showCanvas = cameraActive && videoReady

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* ── Top Header Bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
            <Radio className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground leading-tight">
              Live Display
            </h1>
            <p className="text-xs text-muted-foreground leading-tight">
              Camera feed with virtual backgrounds
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {queueCount > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 ring-1 ring-border">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {queueCount} in queue
              </span>
            </div>
          )}
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs px-3 py-1 font-semibold">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </Badge>
        </div>
      </div>

      {/* ── Main Grid: Camera + Sidebar ── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px] flex-1 min-h-0">
        {/* ── Camera Feed Area ── */}
        <div className="flex flex-col gap-3 min-h-0">
          {/* Camera Preview */}
          <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden ring-1 ring-border shadow-2xl shadow-black/20">
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950">
                <div className="size-14 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
                  <CameraOff className="size-7 text-red-400" />
                </div>
                <p className="text-sm font-medium text-red-300">{cameraError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setCameraError(null)
                    startCamera()
                  }}
                >
                  Try Again
                </Button>
              </div>
            ) : !cameraActive ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950">
                <div className="size-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                  <Camera className="size-10 text-slate-500" />
                </div>
                <p className="text-base text-slate-300 font-medium">Camera is off</p>
                <p className="text-sm text-slate-500 mt-1 mb-4">Click &quot;Start Camera&quot; to begin</p>
                <Button
                  size="sm"
                  onClick={startCamera}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Camera className="size-4" />
                  Start Camera
                </Button>
              </div>
            ) : (
              <>
                {/* Video element - hidden once canvas takes over */}
                <video
                  ref={videoRef}
                  onLoadedMetadata={handleVideoLoaded}
                  className={`absolute inset-0 w-full h-full object-cover ${showCanvas ? 'hidden' : ''}`}
                  playsInline
                  muted
                  style={{ transform: 'scaleX(-1)' }}
                />
                {/* Canvas for composited output */}
                <canvas
                  ref={canvasRef}
                  className={`absolute inset-0 w-full h-full object-cover ${showCanvas ? '' : 'hidden'}`}
                />

                {/* Status indicators */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                  {modelLoading && (
                    <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5">
                      <Loader2 className="size-3 text-amber-400 animate-spin" />
                      <span className="text-xs text-amber-300">Loading AI model...</span>
                    </div>
                  )}
                  {segmentationReady && !modelLoading && currentBg && currentBg.type !== 'none' && (
                    <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5">
                      <div className="size-2 rounded-full bg-emerald-400" />
                      <span className="text-xs text-emerald-300">AI bg active</span>
                    </div>
                  )}
                  {segmentationError && !modelLoading && currentBg && currentBg.type !== 'none' && (
                    <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5">
                      <AlertCircle className="size-3 text-stone-400" />
                      <span className="text-xs text-stone-400">No AI bg removal</span>
                    </div>
                  )}
                </div>

                {/* Current background label */}
                {currentBg && currentBg.type !== 'none' && (
                  <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5 z-10">
                    <Sparkles className="size-3 text-emerald-400" />
                    <span className="text-xs text-emerald-300">{currentBg.label}</span>
                  </div>
                )}

                {/* Capture flash */}
                {capturing && (
                  <div className="absolute inset-0 bg-white/80 animate-pulse pointer-events-none z-20" />
                )}

                {/* No session overlay */}
                {!activeSession && (
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-center pb-4 z-10 pointer-events-none">
                    <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                      </span>
                      <span className="text-xs text-amber-300">Waiting for session</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Background Selector ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Palette className="size-3.5" />
                <span>Virtual Background</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-3" />
                Upload
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCustomBgUpload}
              />
            </div>

            {/* Background grid */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {allBackgrounds.map((bg) => {
                const isActive = selectedBg === bg.id
                const isCustom = bg.type === 'custom'
                return (
                  <div key={bg.id} className="relative group shrink-0">
                    <button
                      onClick={() => setSelectedBg(bg.id)}
                      className={`
                        relative flex flex-col items-center gap-1 rounded-lg p-1.5 w-14
                        transition-all duration-150 cursor-pointer
                        ${
                          isActive
                            ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-background bg-emerald-500/10'
                            : 'hover:bg-muted/50 bg-transparent'
                        }
                      `}
                      title={bg.label}
                      aria-label={`Select ${bg.label} background`}
                      aria-pressed={isActive}
                    >
                      <div
                        className={`
                          size-9 rounded-md overflow-hidden flex items-center justify-center
                          border border-border/50 relative
                          ${bg.preview}
                        `}
                      >
                        {bg.type === 'none' && <CameraOff className="size-3.5 text-stone-300" />}
                        {bg.type === 'blur' && <Sparkles className="size-3.5 text-stone-200" />}
                        {(bg.type === 'image' || bg.type === 'custom') && !isCustom && (
                          <ImageIcon className="size-3.5 text-stone-200" />
                        )}
                        {isCustom && bg.value && (
                          <img
                            src={bg.value}
                            alt=""
                            className="absolute inset-0.5 size-8 object-cover rounded"
                          />
                        )}
                      </div>
                      <span className="text-[9px] leading-tight text-muted-foreground group-hover:text-foreground truncate w-full text-center">
                        {bg.label}
                      </span>
                    </button>
                    {isCustom && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeCustomBg(bg.id)
                        }}
                        className="absolute -top-1 -right-1 size-4 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        aria-label={`Remove ${bg.label}`}
                      >
                        <X className="size-2.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Camera Controls ── */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <Button
              variant={cameraActive ? 'destructive' : 'default'}
              size="sm"
              onClick={toggleCamera}
              className={`gap-2 ${
                cameraActive
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {cameraActive ? (
                <>
                  <CameraOff className="size-4" />
                  Stop Camera
                </>
              ) : (
                <>
                  <Camera className="size-4" />
                  Start Camera
                </>
              )}
            </Button>

            <Button
              size="sm"
              onClick={takePhoto}
              disabled={!cameraActive || capturing}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-40"
            >
              <Aperture className="size-4" />
              {capturing ? 'Capturing...' : 'Take Photo'}
            </Button>
          </div>
        </div>

        {/* ── Sidebar: Session Info + Queue ── */}
        <div className="flex flex-col gap-4 min-h-0 lg:max-h-[calc(100vh-12rem)]">
          {/* ── Active Session Card ── */}
          <div className="rounded-xl bg-card ring-1 ring-border overflow-hidden shrink-0">
            <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 ring-1 ring-emerald-500/20">
                <User className="h-3 w-3 text-emerald-500" />
              </div>
              <span className="text-xs font-semibold text-foreground">
                Current Guest
              </span>
              {activeSession && (
                <Badge className="ml-auto bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-medium px-2 py-0.5">
                  <CheckCircle className="h-2.5 w-2.5 mr-1" />
                  Active
                </Badge>
              )}
            </div>

            <div className="p-4">
              {sessionsLoading ? (
                <div className="flex items-center gap-3 py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-emerald-500" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : activeSession ? (
                <ActiveSessionContent session={activeSession} />
              ) : (
                <div className="py-6 text-center">
                  <div className="size-10 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-2">
                    <User className="size-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">No active session</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Start a session to see guest info</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Queue Card ── */}
          <div className="rounded-xl bg-card ring-1 ring-border overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2 shrink-0">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 ring-1 ring-amber-500/20">
                <Hash className="h-3 w-3 text-amber-500" />
              </div>
              <span className="text-xs font-semibold text-foreground">
                Up Next
              </span>
              {queueCount > 0 && (
                <Badge
                  variant="outline"
                  className="ml-auto text-[10px] border-border text-muted-foreground h-5 px-1.5"
                >
                  {queueCount}
                </Badge>
              )}
            </div>

            <div className="p-3 flex-1 min-h-0">
              {queueLoading ? (
                <div className="flex items-center gap-3 py-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-amber-500" />
                  <span className="text-xs text-muted-foreground">Loading queue...</span>
                </div>
              ) : queue && queue.length > 0 ? (
                <ScrollArea className="h-full max-h-64">
                  <ul className="space-y-1.5">
                    <AnimatePresence>
                      {queue.map((entry, index) => (
                        <motion.li
                          key={entry.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.06, duration: 0.3 }}
                          className="flex items-center gap-2.5 rounded-lg bg-muted/30 px-3 py-2 ring-1 ring-border/40"
                        >
                          <QueuePositionBadge index={index} />
                          <span className="text-sm font-medium text-foreground truncate flex-1">
                            {entry.name}
                          </span>
                          {index === 0 && (
                            <ArrowRight className="h-3.5 w-3.5 text-emerald-500/60 shrink-0" />
                          )}
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </ScrollArea>
              ) : (
                <div className="py-6 text-center">
                  <Users className="mx-auto h-7 w-7 text-muted-foreground/30" />
                  <p className="mt-2 text-xs text-muted-foreground">Queue is empty</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                    Guests will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Active Session Content Sub-component                               */
/* ------------------------------------------------------------------ */

function ActiveSessionContent({ session }: { session: ActiveSession }) {
  const elapsed = useLiveTimer(session.startedAt)

  return (
    <div className="space-y-4">
      {/* Guest name */}
      <div>
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Guest Name
        </p>
        <p className="mt-1 text-xl font-bold text-foreground tracking-tight leading-tight">
          {session.guestName}
        </p>
      </div>

      {/* Session info */}
      <div className="space-y-3">
        {/* Timer */}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
            <Clock className="inline h-2.5 w-2.5 mr-1 -mt-0.5" />
            Elapsed
          </p>
          <div className="text-xl font-mono font-bold text-emerald-500 tracking-wider">
            <TimerDisplay display={elapsed.display} />
          </div>
        </div>

        {/* Contact info */}
        {session.guestEmail && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-0.5">
              Email
            </p>
            <p className="text-xs text-muted-foreground break-all leading-relaxed">
              {session.guestEmail}
            </p>
          </div>
        )}

        {session.guestPhone && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-0.5">
              Phone
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {session.guestPhone}
            </p>
          </div>
        )}
      </div>

      {/* Notes */}
      {session.notes && (
        <div className="rounded-lg bg-muted/40 p-3 ring-1 ring-border/40">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
            Notes
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">{session.notes}</p>
        </div>
      )}
    </div>
  )
}
