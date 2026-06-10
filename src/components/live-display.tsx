'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Camera,
  CameraOff,
  Upload,
  X,
  Sparkles,
  Download,
  Trash2,
  Timer,
  Maximize2,
  Minimize2,
  ImagePlus,
  RotateCcw,
  ArrowLeft,
  Radio,
  AlertCircle,
  LayoutTemplate,
  Play,
  Square,
  Mail,
  Printer,
  RefreshCw,
  Video,
  Send,
  Check,
  Ban,
} from 'lucide-react'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type BackgroundType = 'none' | 'blur' | 'color' | 'gradient' | 'custom'

interface BackgroundOption {
  id: string
  type: BackgroundType
  label: string
  value: string
  preview: string
}

interface CapturedPhoto {
  id: string
  dataUrl: string
  timestamp: number
}

interface PlaceholderDef {
  x: number
  y: number
  width: number
  height: number
  borderRadius?: number
}

interface TemplateData {
  id: string
  name: string
  description?: string | null
  stripImageUrl?: string | null
  frameUrl?: string | null
  overlayUrl?: string | null
  placeholders?: string | null
  layout?: string | null
  captureMode?: string | null
  captureDelay?: number | null
  includeGif?: boolean
  printAuto?: boolean
  emailAuto?: boolean
  active?: boolean
  event?: { id: string; name: string }
}

/* ------------------------------------------------------------------ */
/*  Built-in backgrounds                                               */
/* ------------------------------------------------------------------ */

const BUILT_IN_BACKGROUNDS: BackgroundOption[] = [
  { id: 'none', type: 'none', label: 'Original', value: '', preview: 'bg-stone-600' },
  { id: 'blur', type: 'blur', label: 'Blur', value: '', preview: 'bg-stone-500 blur-sm' },
  { id: 'color-emerald', type: 'color', label: 'Emerald', value: '#065f46', preview: 'bg-emerald-700' },
  { id: 'color-navy', type: 'color', label: 'Navy', value: '#1e3a5f', preview: 'bg-blue-900' },
  { id: 'color-burgundy', type: 'color', label: 'Burgundy', value: '#7f1d1d', preview: 'bg-red-900' },
  { id: 'color-charcoal', type: 'color', label: 'Charcoal', value: '#1c1917', preview: 'bg-stone-900' },
  { id: 'color-ivory', type: 'color', label: 'Ivory', value: '#fefce8', preview: 'bg-yellow-50' },
  { id: 'grad-sunset', type: 'gradient', label: 'Sunset', value: 'linear-gradient(135deg, #92400e 0%, #dc2626 100%)', preview: 'bg-gradient-to-br from-amber-800 to-red-700' },
  { id: 'grad-ocean', type: 'gradient', label: 'Ocean', value: 'linear-gradient(135deg, #0e7490 0%, #1e40af 100%)', preview: 'bg-gradient-to-br from-cyan-700 to-blue-900' },
  { id: 'grad-forest', type: 'gradient', label: 'Forest', value: 'linear-gradient(135deg, #065f46 0%, #1a2e05 100%)', preview: 'bg-gradient-to-br from-emerald-800 to-lime-950' },
  { id: 'grad-royal', type: 'gradient', label: 'Royal', value: 'linear-gradient(135deg, #581c87 0%, #831843 100%)', preview: 'bg-gradient-to-br from-purple-900 to-pink-900' },
  { id: 'grad-gold', type: 'gradient', label: 'Gold', value: 'linear-gradient(135deg, #92400e 0%, #ca8a04 100%)', preview: 'bg-gradient-to-br from-amber-800 to-yellow-600' },
]

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_VIDEO_WIDTH = 1280
const DEFAULT_VIDEO_HEIGHT = 720
const DEFAULT_STRIP_WIDTH = 600
const DEFAULT_STRIP_HEIGHT = 1800
const MAX_CANVAS_PIXELS = 16_000_000 // 16 megapixels max to avoid browser memory issues

/* ------------------------------------------------------------------ */
/*  Parse placeholders JSON safely                                     */
/* ------------------------------------------------------------------ */

function parsePlaceholders(raw: string | null | undefined): PlaceholderDef[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

/* ------------------------------------------------------------------ */
/*  Main Component — Photo Booth Kiosk                                 */
/*  Strategy: VIDEO is always the primary display.                     */
/*  Canvas overlays ONLY when virtual background is active.            */
/* ------------------------------------------------------------------ */

export default function LiveDisplay() {
  const { setCurrentPage, activeSession } = useAppStore()

  // ── Camera state ──
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [modelLoading, setModelLoading] = useState(false)
  const [segmentationReady, setSegmentationReady] = useState(false)
  const [segmentationError, setSegmentationError] = useState(false)
  const [segmentationMaskFailed, setSegmentationMaskFailed] = useState(false)

  // ── Background state ──
  const [selectedBg, setSelectedBg] = useState<string>('none')
  const [customBackgrounds, setCustomBackgrounds] = useState<BackgroundOption[]>([])

  // ── Photo booth state ──
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([])
  const [showGallery, setShowGallery] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [mirrorVideo, setMirrorVideo] = useState(true)
  const [timerMode, setTimerMode] = useState<0 | 3 | 5 | 10>(0)

  // ── Template state ──
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateData | null>(null)
  const [templatePhotos, setTemplatePhotos] = useState<string[]>([]) // dataUrls for template placeholder slots
  const [autoCapturing, setAutoCapturing] = useState(false)
  const [autoCaptureCancelled, setAutoCaptureCancelled] = useState(false)
  const [compositeImage, setCompositeImage] = useState<string | null>(null)
  const [showComposite, setShowComposite] = useState(false)
  const [boomerangBlob, setBoomerangBlob] = useState<Blob | null>(null)
  const [boomerangUrl, setBoomerangUrl] = useState<string | null>(null)
  const [recordingBoomerang, setRecordingBoomerang] = useState(false)
  const [guestEmail, setGuestEmail] = useState('')
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [printingPhoto, setPrintingPhoto] = useState(false)
  const [autoCaptureStep, setAutoCaptureStep] = useState(0)
  const [autoCaptureTotal, setAutoCaptureTotal] = useState(0)
  const [showTemplateModal, setShowTemplateModal] = useState(false)

  const allBackgrounds = useMemo(
    () => [...BUILT_IN_BACKGROUNDS, ...customBackgrounds],
    [customBackgrounds]
  )

  // ── Derived: is a virtual background active? ──
  const currentBg = allBackgrounds.find((b) => b.id === selectedBg)
  const isVirtualBgActive = currentBg && currentBg.type !== 'none'

  // ── Template derived values ──
  const templatePlaceholders = useMemo(
    () => parsePlaceholders(selectedTemplate?.placeholders ?? null),
    [selectedTemplate?.placeholders]
  )
  const isAutoCapture = selectedTemplate?.captureMode === 'auto'
  const captureDelay = selectedTemplate?.captureDelay ?? 3
  const allSlotsFilled = selectedTemplate
    ? templatePlaceholders.length > 0 && templatePhotos.length >= templatePlaceholders.length
    : false

  // ── Fetch templates ──
  const { data: templatesData } = useQuery({
    queryKey: ['templates-live'],
    queryFn: async () => {
      const res = await fetch('/api/templates?limit=100')
      if (!res.ok) throw new Error('Failed to fetch templates')
      const json = await res.json()
      return json.data ?? json
    },
    staleTime: 30000,
  })

  const templates: TemplateData[] = useMemo(() => {
    if (!templatesData) return []
    if (Array.isArray(templatesData)) return templatesData.filter((t: TemplateData) => t.active !== false)
    return []
  }, [templatesData])

  // ── Auto-select template from store (set by Templates page "Use Template" button) ──
  const selectedTemplateIdFromStore = useAppStore((s) => s.selectedTemplateId)
  const setSelectedTemplateIdInStore = useAppStore((s) => s.setSelectedTemplateId)
  useEffect(() => {
    if (selectedTemplateIdFromStore && templates.length > 0 && !selectedTemplate) {
      const found = templates.find((t) => t.id === selectedTemplateIdFromStore)
      if (found) {
        setSelectedTemplate(found)
        setTemplatePhotos([])
        setShowComposite(false)
        setCompositeImage(null)
        toast.success('Template loaded', { description: `Using "${found.name}"` })
      }
      // Clear the store so it doesn't re-apply on every re-render
      setSelectedTemplateIdInStore(null)
    }
  }, [selectedTemplateIdFromStore, templates, selectedTemplate])

  // ── Auto-populate guest email from active session ──
  useEffect(() => {
    if (activeSession?.guestEmail && !guestEmail) {
      setGuestEmail(activeSession.guestEmail)
    }
  }, [activeSession?.guestEmail])

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
  const selectedBgRef = useRef<string>(selectedBg)
  const allBackgroundsRef = useRef<BackgroundOption[]>(allBackgrounds)
  const mirrorVideoRef = useRef<boolean>(mirrorVideo)
  const isVirtualBgActiveRef = useRef<boolean>(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const maskFailCountRef = useRef(0)
  const segmentationMaskFailedRef = useRef(false)
  const autoCaptureCancelledRef = useRef(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // ── Keep refs in sync ──
  useEffect(() => { cameraActiveRef.current = cameraActive }, [cameraActive])
  useEffect(() => { selectedBgRef.current = selectedBg }, [selectedBg])
  useEffect(() => { allBackgroundsRef.current = allBackgrounds }, [allBackgrounds])
  useEffect(() => { mirrorVideoRef.current = mirrorVideo }, [mirrorVideo])
  useEffect(() => { isVirtualBgActiveRef.current = !!isVirtualBgActive }, [isVirtualBgActive])
  useEffect(() => { autoCaptureCancelledRef.current = autoCaptureCancelled }, [autoCaptureCancelled])

  // ── Initialize MediaPipe segmentation ──
  useEffect(() => {
    let cancelled = false

    async function initSegmentation() {
      try {
        setModelLoading(true)
        setSegmentationError(false)

        const visionModule = await import('@mediapipe/tasks-vision')
        const { FilesetResolver, ImageSegmenter } = visionModule

        if (cancelled) return

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
        )

        if (cancelled) return

        let segmenter
        try {
          segmenter = await ImageSegmenter.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            outputCategoryMask: true,
            outputConfidenceMasks: false,
          })
        } catch {
          if (cancelled) return
          segmenter = await ImageSegmenter.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            outputCategoryMask: true,
            outputConfidenceMasks: false,
          })
        }

        if (cancelled) {
          segmenter.close()
          return
        }

        segmenterRef.current = segmenter
        setSegmentationReady(true)
        setSegmentationError(false)
        setModelLoading(false)
      } catch (err) {
        console.warn('Segmentation init failed:', err)
        if (!cancelled) {
          setModelLoading(false)
          setSegmentationReady(false)
          setSegmentationError(true)
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

  // ── Load background image + reset mask state when BG changes ──
  useEffect(() => {
    maskFailCountRef.current = 0
    segmentationMaskFailedRef.current = false
    setSegmentationMaskFailed(false)
    maskCanvasRef.current = null

    const bg = allBackgrounds.find((b) => b.id === selectedBg)
    if (bg?.type === 'custom') {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = bg.value
      img.onload = () => { bgImageRef.current = img }
      img.onerror = () => { bgImageRef.current = null }
    } else {
      bgImageRef.current = null
    }
  }, [selectedBg, allBackgrounds])

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

  // ── Draw background ──
  const drawBackground = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const bg = allBackgroundsRef.current.find((b) => b.id === selectedBgRef.current)
      if (!bg || bg.type === 'none') {
        ctx.fillStyle = '#0c0a09'
        ctx.fillRect(0, 0, width, height)
        return
      }

      if (bg.type === 'blur') {
        ctx.save()
        ctx.filter = 'blur(16px) brightness(0.7)'
        if (videoRef.current && videoRef.current.readyState >= 2) {
          if (mirrorVideoRef.current) {
            ctx.translate(width, 0)
            ctx.scale(-1, 1)
          }
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
          ctx.fillStyle = '#1c1917'
        }
        ctx.fillRect(0, 0, width, height)
      } else if (bg.type === 'custom' && bgImageRef.current) {
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
    []
  )

  // ── Process segmentation mask ──
  // CRITICAL: We try SYNCHRONOUS strategies first because the WebGL framebuffer
  // can be recycled by the next segmentForVideo() call before async strategies resolve.
  // Only fall back to async createImageBitmap if sync methods fail.
  const processMaskAsync = useCallback(
    async (categoryMask: any, width: number, height: number): Promise<HTMLCanvasElement | null> => {
      try {
        const maskCanvas = ensureOffscreenCanvas(maskCanvasRef)
        const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true })
        if (!maskCtx) {
          maskCanvasRef.current = null
          return null
        }

        maskCtx.clearRect(0, 0, width, height)

        let drawSucceeded = false

        // === SYNCHRONOUS STRATEGIES (tried first — no await, no WebGL recycling risk) ===

        // Strategy 1: Synchronous drawImage from categoryMask directly (MPImage is a valid ImageBitmapSource)
        if (!drawSucceeded) {
          try {
            maskCtx.drawImage(categoryMask, 0, 0, width, height)
            // Verify pixels were actually drawn
            const testPixel = maskCtx.getImageData(0, 0, 1, 1).data
            if (testPixel[3] > 0 || testPixel[0] > 0 || testPixel[1] > 0 || testPixel[2] > 0) {
              drawSucceeded = true
            }
          } catch { /* fallthrough */ }
        }

        // Strategy 2: Synchronous drawImage from categoryMask.canvas
        if (!drawSucceeded && categoryMask?.canvas) {
          try {
            maskCtx.drawImage(categoryMask.canvas, 0, 0, width, height)
            const testPixel = maskCtx.getImageData(0, 0, 1, 1).data
            if (testPixel[3] > 0 || testPixel[0] > 0 || testPixel[1] > 0 || testPixel[2] > 0) {
              drawSucceeded = true
            }
          } catch { /* fallthrough */ }
        }

        // Strategy 3: Try MPImage's getImageData() method (synchronous)
        if (!drawSucceeded) {
          try {
            if (typeof categoryMask?.getImageData === 'function') {
              const imgData = categoryMask.getImageData()
              maskCtx.putImageData(imgData, 0, 0)
              drawSucceeded = true
            }
          } catch { /* fallthrough */ }
        }

        // Strategy 4: Try using categoryMask as raw typed array with width/height (synchronous)
        if (!drawSucceeded) {
          try {
            const maskWidth = categoryMask?.width ?? width
            const maskHeight = categoryMask?.height ?? height
            const rawData = categoryMask?.data ?? categoryMask
            if (
              (rawData instanceof Uint8Array ||
                rawData instanceof Uint8ClampedArray ||
                rawData instanceof Float32Array) &&
              rawData.length >= maskWidth * maskHeight
            ) {
              const imgData = maskCtx.createImageData(maskWidth, maskHeight)
              for (let i = 0; i < maskWidth * maskHeight; i++) {
                const val = rawData instanceof Float32Array
                  ? Math.round(rawData[i] * 255)
                  : rawData[i]
                imgData.data[i * 4] = val
                imgData.data[i * 4 + 1] = val
                imgData.data[i * 4 + 2] = val
                imgData.data[i * 4 + 3] = 255
              }
              maskCtx.putImageData(imgData, 0, 0)
              drawSucceeded = true
            }
          } catch { /* fallthrough */ }
        }

        // === ASYNC STRATEGIES (fallback — may fail if WebGL framebuffer is recycled) ===

        // Strategy 5: Use createImageBitmap on categoryMask.canvas
        if (!drawSucceeded && categoryMask?.canvas) {
          try {
            const bitmap = await createImageBitmap(categoryMask.canvas)
            maskCtx.drawImage(bitmap, 0, 0, width, height)
            bitmap.close()
            const testPixel = maskCtx.getImageData(0, 0, 1, 1).data
            if (testPixel[3] > 0 || testPixel[0] > 0 || testPixel[1] > 0 || testPixel[2] > 0) {
              drawSucceeded = true
            }
          } catch { /* fallthrough */ }
        }

        // Strategy 6: Use createImageBitmap on categoryMask directly
        if (!drawSucceeded) {
          try {
            const bitmap = await createImageBitmap(categoryMask)
            maskCtx.drawImage(bitmap, 0, 0, width, height)
            bitmap.close()
            const testPixel = maskCtx.getImageData(0, 0, 1, 1).data
            if (testPixel[3] > 0 || testPixel[0] > 0 || testPixel[1] > 0 || testPixel[2] > 0) {
              drawSucceeded = true
            }
          } catch { /* fallthrough */ }
        }

        if (!drawSucceeded) {
          console.warn('processMaskAsync: Could not extract data from categoryMask — all strategies failed')
          maskCanvasRef.current = null
          return null
        }

        const maskData = maskCtx.getImageData(0, 0, width, height)
        const pixels = maskData.data

        let maxVal = 0
        for (let i = 0; i < Math.min(pixels.length, 1600); i += 4) {
          if (pixels[i] > maxVal) maxVal = pixels[i]
        }

        const needsScaling = maxVal <= 1

        let personPixelCount = 0
        for (let i = 0; i < pixels.length; i += 4) {
          const category = needsScaling ? pixels[i] * 255 : pixels[i]
          const isPerson = category > 0
          if (isPerson) personPixelCount++
          pixels[i] = 255
          pixels[i + 1] = 255
          pixels[i + 2] = 255
          pixels[i + 3] = isPerson ? 255 : 0
        }

        if (personPixelCount === 0) {
          console.warn('processMaskAsync: No person pixels detected in mask — mask is invalid')
          maskCanvasRef.current = null
          return null
        }

        maskCtx.putImageData(maskData, 0, 0)
        return maskCanvas
      } catch (err) {
        console.warn('processMaskAsync: Unexpected error:', err)
        maskCanvasRef.current = null
        return null
      }
    },
    [ensureOffscreenCanvas]
  )

  // ── Draw background + full video (no masking) ──
  const drawBgPlusVideo = useCallback(
    (ctx: CanvasRenderingContext2D, video: HTMLVideoElement, width: number, height: number) => {
      ctx.clearRect(0, 0, width, height)
      drawBackground(ctx, width, height)
      ctx.save()
      ctx.globalAlpha = 1
      if (mirrorVideoRef.current) {
        ctx.translate(width, 0)
        ctx.scale(-1, 1)
      }
      ctx.drawImage(video, 0, 0, width, height)
      ctx.restore()
    },
    [drawBackground]
  )

  // ── Main render loop — ONLY runs when virtual BG is active ──
  const renderFrame = useCallback(() => {
    if (!cameraActiveRef.current || !isVirtualBgActiveRef.current) return

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

    if (!segmenterRef.current || !segmentationReady) {
      drawBgPlusVideo(ctx, video, width, height)
      animFrameRef.current = requestAnimationFrame(renderFrame)
      return
    }

    const now = performance.now()
    const maskCanvas: HTMLCanvasElement | null = maskCanvasRef.current

    if (now - lastSegmentTimeRef.current > 66) {
      try {
        const result = segmenterRef.current.segmentForVideo(video, now)
        lastSegmentTimeRef.current = now
        if (result && result.categoryMask) {
          // Fire-and-forget async processing — double-buffer pattern:
          // render loop reads from maskCanvasRef.current while async updates it
          processMaskAsync(result.categoryMask, width, height).then(mask => {
            if (mask) {
              maskCanvasRef.current = mask
              maskFailCountRef.current = 0
              if (segmentationMaskFailedRef.current) {
                segmentationMaskFailedRef.current = false
                setSegmentationMaskFailed(false)
              }
            } else {
              maskFailCountRef.current++
              if (maskFailCountRef.current > 10 && !segmentationMaskFailedRef.current) {
                segmentationMaskFailedRef.current = true
                setSegmentationMaskFailed(true)
              }
            }
          }).catch(() => {
            maskFailCountRef.current++
            if (maskFailCountRef.current > 10 && !segmentationMaskFailedRef.current) {
              segmentationMaskFailedRef.current = true
              setSegmentationMaskFailed(true)
            }
          })
        }
      } catch {
        maskFailCountRef.current++
        if (maskFailCountRef.current > 10 && !segmentationMaskFailedRef.current) {
          segmentationMaskFailedRef.current = true
          setSegmentationMaskFailed(true)
        }
      }
    }

    if (maskCanvas) {
      const personCanvas = ensureOffscreenCanvas(personCanvasRef)
      const personCtx = personCanvas.getContext('2d')
      if (personCtx) {
        personCtx.clearRect(0, 0, width, height)
        personCtx.drawImage(maskCanvas, 0, 0, width, height)

        personCtx.globalCompositeOperation = 'source-in'
        personCtx.save()
        if (mirrorVideoRef.current) {
          personCtx.translate(width, 0)
          personCtx.scale(-1, 1)
        }
        personCtx.drawImage(video, 0, 0, width, height)
        personCtx.restore()
        personCtx.globalCompositeOperation = 'source-over'

        ctx.clearRect(0, 0, width, height)
        drawBackground(ctx, width, height)
        ctx.drawImage(personCanvas, 0, 0, width, height)
      } else {
        drawBgPlusVideo(ctx, video, width, height)
      }
    } else {
      drawBgPlusVideo(ctx, video, width, height)
    }

    animFrameRef.current = requestAnimationFrame(renderFrame)
  }, [segmentationReady, drawBackground, drawBgPlusVideo, processMaskAsync, ensureOffscreenCanvas])

  // ── Start/stop render loop ──
  useEffect(() => {
    if (cameraActive && isVirtualBgActive) {
      let retryTimer: ReturnType<typeof setTimeout> | null = null

      const setCanvasSize = () => {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas) return false

        if (video.readyState >= 2 && video.videoWidth > 0) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          canvasSizeRef.current = { w: video.videoWidth, h: video.videoHeight }
          maskCanvasRef.current = null
          personCanvasRef.current = null
          return true
        }

        canvas.width = DEFAULT_VIDEO_WIDTH
        canvas.height = DEFAULT_VIDEO_HEIGHT
        canvasSizeRef.current = { w: DEFAULT_VIDEO_WIDTH, h: DEFAULT_VIDEO_HEIGHT }
        maskCanvasRef.current = null
        personCanvasRef.current = null
        return true
      }

      const sizeSet = setCanvasSize()

      if (!sizeSet || (videoRef.current && videoRef.current.readyState < 2)) {
        retryTimer = setTimeout(() => {
          setCanvasSize()
          const video = videoRef.current
          if (video && video.readyState >= 2 && video.videoWidth > 0) {
            const canvas = canvasRef.current
            if (canvas) {
              canvas.width = video.videoWidth
              canvas.height = video.videoHeight
              canvasSizeRef.current = { w: video.videoWidth, h: video.videoHeight }
              maskCanvasRef.current = null
              personCanvasRef.current = null
            }
          }
        }, 500)
      }

      animFrameRef.current = requestAnimationFrame(renderFrame)

      return () => {
        if (retryTimer) clearTimeout(retryTimer)
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current)
          animFrameRef.current = 0
        }
      }
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = 0
      }
    }
  }, [cameraActive, isVirtualBgActive, renderFrame])

  // ── Start camera ──
  const startCamera = useCallback(async () => {
    setCameraError(null)

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not supported in this environment.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      setCameraActive(true)
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

  // ── Attach stream to video when cameraActive ──
  useEffect(() => {
    if (!cameraActive) return

    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return

    video.srcObject = stream
    video.play().catch(() => {
      video.muted = true
      video.play().catch(() => {
        setCameraError('Failed to start video playback. Please try again.')
        setCameraActive(false)
      })
    })
  }, [cameraActive])

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
    maskCanvasRef.current = null
    personCanvasRef.current = null
    maskFailCountRef.current = 0
    segmentationMaskFailedRef.current = false
    setSegmentationMaskFailed(false)
    setCameraActive(false)
    setSelectedBg('none')
  }, [])

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      cameraActiveRef.current = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [])

  // ── Capture a single photo from video/canvas and return dataUrl ──
  const captureSinglePhoto = useCallback((): string | null => {
    const video = videoRef.current
    if (!video || !cameraActive) return null

    try {
      if (isVirtualBgActiveRef.current && canvasRef.current) {
        return canvasRef.current.toDataURL('image/png')
      } else {
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = video.videoWidth || DEFAULT_VIDEO_WIDTH
        tempCanvas.height = video.videoHeight || DEFAULT_VIDEO_HEIGHT
        const tempCtx = tempCanvas.getContext('2d')
        if (tempCtx) {
          if (mirrorVideo) {
            tempCtx.translate(tempCanvas.width, 0)
            tempCtx.scale(-1, 1)
          }
          tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height)
          return tempCanvas.toDataURL('image/png')
        }
      }
    } catch {
      toast.error('Failed to capture photo')
    }
    return null
  }, [cameraActive, mirrorVideo])

  // ── Take photo (non-template mode) ──
  const capturePhoto = useCallback(() => {
    const dataUrl = captureSinglePhoto()
    if (!dataUrl) return

    setCapturing(true)
    const photo: CapturedPhoto = {
      id: `photo-${Date.now()}`,
      dataUrl,
      timestamp: Date.now(),
    }
    setCapturedPhotos((prev) => [photo, ...prev])
    toast.success('Photo captured!', { duration: 2000 })
    setTimeout(() => setCapturing(false), 400)
  }, [captureSinglePhoto])

  // ── Take photo for template mode (fills a slot) ──
  const captureTemplatePhoto = useCallback((): string | null => {
    const dataUrl = captureSinglePhoto()
    if (!dataUrl) return null

    setCapturing(true)
    setTemplatePhotos((prev) => [...prev, dataUrl])
    toast.success(`Photo ${templatePhotos.length + 1}/${templatePlaceholders.length} captured!`, { duration: 1500 })
    setTimeout(() => setCapturing(false), 400)
    return dataUrl
  }, [captureSinglePhoto, templatePhotos.length, templatePlaceholders.length])

  // ── Countdown + capture (manual mode) ──
  const startCapture = useCallback(() => {
    // Template mode
    if (selectedTemplate) {
      if (isAutoCapture) {
        startAutoCapture()
        return
      }
      // Manual template capture
      if (allSlotsFilled) {
        toast.info('All slots filled! Generating composite...')
        generateComposite()
        return
      }
      if (timerMode === 0) {
        captureTemplatePhoto()
        return
      }
      setCountdown(timerMode)
      let remaining = timerMode
      const interval = setInterval(() => {
        remaining -= 1
        if (remaining <= 0) {
          clearInterval(interval)
          setCountdown(null)
          captureTemplatePhoto()
        } else {
          setCountdown(remaining)
        }
      }, 1000)
      return
    }

    // Non-template mode
    if (timerMode === 0) {
      capturePhoto()
      return
    }

    setCountdown(timerMode)
    let remaining = timerMode
    const interval = setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        clearInterval(interval)
        setCountdown(null)
        capturePhoto()
      } else {
        setCountdown(remaining)
      }
    }, 1000)
  }, [timerMode, capturePhoto, captureTemplatePhoto, selectedTemplate, isAutoCapture, allSlotsFilled])

  // ── Auto-capture mode ──
  const startAutoCapture = useCallback(() => {
    if (!selectedTemplate || !isAutoCapture) return
    const placeholders = parsePlaceholders(selectedTemplate.placeholders)
    if (placeholders.length === 0) return

    // Reset template photos for fresh auto capture
    setTemplatePhotos([])
    setAutoCapturing(true)
    setAutoCaptureCancelled(false)
    setAutoCaptureStep(0)
    setAutoCaptureTotal(placeholders.length)

    const delay = selectedTemplate.captureDelay ?? 3

    const captureSequence = async () => {
      for (let i = 0; i < placeholders.length; i++) {
        if (autoCaptureCancelledRef.current) break

        setAutoCaptureStep(i + 1)

        // Show countdown (3 seconds)
        for (let c = 3; c > 0; c--) {
          if (autoCaptureCancelledRef.current) break
          setCountdown(c)
          await new Promise((r) => setTimeout(r, 1000))
        }
        setCountdown(null)

        if (autoCaptureCancelledRef.current) break

        // Capture
        const dataUrl = captureSinglePhoto()
        if (dataUrl) {
          setTemplatePhotos((prev) => [...prev, dataUrl])
          setCapturing(true)
          setTimeout(() => setCapturing(false), 400)
        }

        // Wait between captures (if not last)
        if (i < placeholders.length - 1 && !autoCaptureCancelledRef.current) {
          await new Promise((r) => setTimeout(r, delay * 1000))
        }
      }

      setAutoCapturing(false)
      if (!autoCaptureCancelledRef.current) {
        toast.success('Shoot Complete!', { duration: 3000 })
      }
    }

    captureSequence()
  }, [selectedTemplate, isAutoCapture, captureSinglePhoto])

  // ── Cancel auto-capture ──
  const cancelAutoCapture = useCallback(() => {
    setAutoCaptureCancelled(true)
    autoCaptureCancelledRef.current = true
    setAutoCapturing(false)
    setCountdown(null)
    toast.info('Auto-capture cancelled')
  }, [])

  // ── Generate composite image ──
  const generateComposite = useCallback(() => {
    if (!selectedTemplate) return
    const placeholders = parsePlaceholders(selectedTemplate.placeholders)
    if (placeholders.length === 0 || templatePhotos.length < placeholders.length) {
      toast.error('Not all photo slots are filled yet')
      return
    }

    const canvas = compositeCanvasRef.current ?? document.createElement('canvas')
    compositeCanvasRef.current = canvas

    const stripUrl = selectedTemplate.stripImageUrl || selectedTemplate.frameUrl

    // Helper: load an image and return a Promise (handles both dataUrl and HTTP URLs)
    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        // Only set crossOrigin for HTTP/HTTPS URLs (not dataUrls)
        // dataUrls are same-origin by definition and don't need CORS
        if (src.startsWith('http://') || src.startsWith('https://')) {
          img.crossOrigin = 'anonymous'
        }
        img.onload = () => {
          console.log(`[Composite] Image loaded: ${img.width}×${img.height}`)
          resolve(img)
        }
        img.onerror = (e) => {
          console.error(`[Composite] Image load failed:`, e, src.substring(0, 100))
          reject(new Error(`Failed to load image: ${src.substring(0, 80)}`))
        }
        img.src = src
      })
    }

    // Draw a captured photo into its placeholder slot (cover-fit, center-crop)
    const drawPhotoIntoPlaceholder = (
      ctx: CanvasRenderingContext2D,
      img: HTMLImageElement,
      ph: PlaceholderDef,
      stripW: number,
      stripH: number
    ) => {
      const px = (ph.x / 100) * stripW
      const py = (ph.y / 100) * stripH
      const pw = (ph.width / 100) * stripW
      const phh = (ph.height / 100) * stripH
      const br = ph.borderRadius ?? 0

      console.log(`[Composite] Drawing photo at: px=${px}, py=${py}, pw=${pw}, phh=${phh}, br=${br}`)

      ctx.save()
      if (br > 0) {
        ctx.beginPath()
        ctx.roundRect(px, py, pw, phh, br)
        ctx.clip()
      }

      // Cover-fit: center crop the image to fill the placeholder
      const imgW = img.naturalWidth || img.width
      const imgH = img.naturalHeight || img.height
      const imgAspect = imgW / imgH
      const slotAspect = pw / phh
      let sx = 0, sy = 0, sw = imgW, sh = imgH
      if (imgAspect > slotAspect) {
        sw = imgH * slotAspect
        sx = (imgW - sw) / 2
      } else {
        sh = imgW / slotAspect
        sy = (imgH - sh) / 2
      }

      console.log(`[Composite] Photo crop: sx=${sx}, sy=${sy}, sw=${sw}, sh=${sh}`)
      ctx.drawImage(img, sx, sy, sw, sh, px, py, pw, phh)
      ctx.restore()
    }

    // Main async composite generation
    const runComposite = async () => {
      let stripW = DEFAULT_STRIP_WIDTH
      let stripH = DEFAULT_STRIP_HEIGHT

      // If template has strip image, load it first to get dimensions
      if (stripUrl) {
        try {
          const stripImg = await loadImage(stripUrl)
          stripW = stripImg.naturalWidth || DEFAULT_STRIP_WIDTH
          stripH = stripImg.naturalHeight || DEFAULT_STRIP_HEIGHT
          console.log(`[Composite] Strip image natural size: ${stripW}×${stripH}`)
        } catch (err) {
          console.warn('[Composite] Failed to load strip image, using defaults:', err)
        }
      }

      // Clamp canvas size to avoid browser memory issues
      const totalPixels = stripW * stripH
      if (totalPixels > MAX_CANVAS_PIXELS) {
        const scale = Math.sqrt(MAX_CANVAS_PIXELS / totalPixels)
        stripW = Math.round(stripW * scale)
        stripH = Math.round(stripH * scale)
        console.log(`[Composite] Canvas scaled down to: ${stripW}×${stripH}`)
      }

      canvas.width = stripW
      canvas.height = stripH
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        console.error('[Composite] Failed to get canvas context')
        return
      }

      // Draw white background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, stripW, stripH)

      // Draw strip template image as background
      if (stripUrl) {
        try {
          const stripImg = await loadImage(stripUrl)
          ctx.drawImage(stripImg, 0, 0, stripW, stripH)
          console.log('[Composite] Strip background drawn')
        } catch (err) {
          console.warn('[Composite] Failed to draw strip background:', err)
        }
      }

      // Load ALL captured photos first, then draw them
      console.log(`[Composite] Loading ${templatePhotos.length} photos...`)
      const photoResults: (HTMLImageElement | null)[] = []
      for (let i = 0; i < placeholders.length; i++) {
        const photoSrc = templatePhotos[i]
        if (!photoSrc) {
          console.warn(`[Composite] No photo for slot ${i}`)
          photoResults.push(null)
          continue
        }
        try {
          const img = await loadImage(photoSrc)
          photoResults.push(img)
          console.log(`[Composite] Photo ${i} loaded: ${img.width}×${img.height}`)
        } catch (err) {
          console.error(`[Composite] Photo ${i} failed to load:`, err)
          photoResults.push(null)
        }
      }

      // Draw each photo into its placeholder
      for (let i = 0; i < photoResults.length; i++) {
        const img = photoResults[i]
        if (!img) continue
        drawPhotoIntoPlaceholder(ctx, img, placeholders[i], stripW, stripH)
      }
      console.log('[Composite] All photos drawn')

      // Draw overlay if exists
      if (selectedTemplate.overlayUrl) {
        try {
          const overlayImg = await loadImage(selectedTemplate.overlayUrl)
          ctx.drawImage(overlayImg, 0, 0, stripW, stripH)
        } catch {
          // Skip overlay if it fails
        }
      }

      // Finalize — export canvas to dataUrl
      try {
        const dataUrl = canvas.toDataURL('image/png')
        console.log(`[Composite] Final image size: ${dataUrl.length} chars`)
        setCompositeImage(dataUrl)
        setShowComposite(true)
        onCompositeReady(dataUrl)
      } catch (err) {
        console.error('[Composite] toDataURL failed (canvas tainted?):', err)
        // Canvas might be tainted due to CORS — try to generate without the strip background
        toast.error('Failed to export composite image. This may be a CORS issue with the template image.')
      }
    }

    runComposite().catch((err) => {
      console.error('[generateComposite] Error:', err)
      toast.error('Failed to generate composite image')
    })
  }, [selectedTemplate, templatePhotos])

  // ── Called when composite is ready — auto-print/email ──
  const onCompositeReady = useCallback((dataUrl: string) => {
    if (!selectedTemplate) return

    // Auto-print
    if (selectedTemplate.printAuto) {
      handlePrint(dataUrl)
    }

    // Auto-email
    if (selectedTemplate.emailAuto) {
      if (guestEmail.trim()) {
        handleEmail(guestEmail.trim(), dataUrl)
      } else {
        setShowEmailInput(true)
      }
    }
  }, [selectedTemplate, guestEmail])

  // ── Check if all slots filled (auto-generate composite) ──
  useEffect(() => {
    if (!selectedTemplate || !allSlotsFilled || autoCapturing) return
    // Small delay to let state settle
    const timer = setTimeout(() => {
      generateComposite()
    }, 600)
    return () => clearTimeout(timer)
  }, [templatePhotos.length, allSlotsFilled, selectedTemplate, autoCapturing, generateComposite])

  // ── Boomerang recording ──
  const startBoomerangRecording = useCallback(() => {
    if (!streamRef.current) return

    setRecordingBoomerang(true)
    recordedChunksRef.current = []

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp8',
      })

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
        setBoomerangBlob(blob)
        const url = URL.createObjectURL(blob)
        setBoomerangUrl(url)
        setRecordingBoomerang(false)
        toast.success('Boomerang recorded!', { duration: 2000 })
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()

      // Stop after 3 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop()
        }
      }, 3000)
    } catch {
      toast.error('Failed to start boomerang recording')
      setRecordingBoomerang(false)
    }
  }, [])

  // ── Download photo ──
  const downloadPhoto = useCallback((photo: CapturedPhoto) => {
    const link = document.createElement('a')
    link.download = `photobooth-${new Date(photo.timestamp).toISOString().slice(0, 19).replace(/[T:]/g, '-')}.png`
    link.href = photo.dataUrl
    link.click()
    toast.success('Photo downloaded!')
  }, [])

  // ── Download composite ──
  const downloadComposite = useCallback(() => {
    if (!compositeImage) return
    const link = document.createElement('a')
    link.download = `photobooth-strip-${Date.now()}.png`
    link.href = compositeImage
    link.click()
    toast.success('Photo strip downloaded!')
  }, [compositeImage])

  // ── Delete photo ──
  const deletePhoto = useCallback((photoId: string) => {
    setCapturedPhotos((prev) => prev.filter((p) => p.id !== photoId))
    if (selectedPhoto?.id === photoId) setSelectedPhoto(null)
    toast.success('Photo deleted')
  }, [selectedPhoto])

  // ── Handle print ──
  const handlePrint = useCallback(async (dataUrl?: string) => {
    const photoData = dataUrl ?? compositeImage
    if (!photoData) return

    setPrintingPhoto(true)
    try {
      const res = await fetch('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoDataUrl: photoData,
          templateName: selectedTemplate?.name,
          copies: 1,
          sessionId: activeSession?.id,
        }),
      })
      const json = await res.json()
      if (json.success || json.data?.success) {
        toast.success('Print job sent!', { duration: 2000 })
        // Trigger browser print dialog
        const printWindow = window.open('', '_blank')
        if (printWindow) {
          printWindow.document.write(`
            <html><head><title>Print Photo</title></head>
            <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000">
              <img src="${photoData}" style="max-width:100%;max-height:100vh;object-contain" onload="window.print();window.close()" />
            </body></html>
          `)
          printWindow.document.close()
        }
      } else {
        const errMsg = typeof json.error === 'string'
          ? json.error
          : (json.error?.message || json.error?.error || JSON.stringify(json.error) || 'Unknown error')
        toast.error('Print failed: ' + errMsg)
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to send print job'
      toast.error('Print failed: ' + errMsg)
    } finally {
      setPrintingPhoto(false)
    }
  }, [compositeImage, selectedTemplate?.name, activeSession?.id])

  // ── Handle email ──
  const handleEmail = useCallback(async (email: string, dataUrl?: string) => {
    const photoData = dataUrl ?? compositeImage
    if (!photoData || !email) return

    setSendingEmail(true)
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: `Your UMak CSOA Photobooth Photo${selectedTemplate ? ` - ${selectedTemplate.name}` : ''}${activeSession?.guestName ? ` (${activeSession.guestName})` : ''}`,
          message: activeSession?.guestName
            ? `Hi ${activeSession.guestName}! Here is your photo from the UMak CSOA Photobooth. Enjoy your memory!`
            : 'Here is your photo from the UMak CSOA Photobooth! Enjoy your memory!',
          photoDataUrl: photoData,
          templateName: selectedTemplate?.name,
          sessionId: activeSession?.id,
        }),
      })
      const json = await res.json()
      if (json.success || json.data?.success) {
        toast.success('Photo sent to email!', { duration: 3000 })
        setShowEmailInput(false)
      } else {
        const errMsg = typeof json.error === 'string'
          ? json.error
          : (json.error?.message || json.error?.error || JSON.stringify(json.error) || 'Unknown error')
        toast.error('Email failed: ' + errMsg)
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to send email'
      toast.error('Email failed: ' + errMsg)
    } finally {
      setSendingEmail(false)
    }
  }, [compositeImage, selectedTemplate, activeSession?.id])

  // ── Retake ──
  const retakePhotos = useCallback(() => {
    setTemplatePhotos([])
    setCompositeImage(null)
    setShowComposite(false)
    setBoomerangBlob(null)
    if (boomerangUrl) {
      URL.revokeObjectURL(boomerangUrl)
      setBoomerangUrl(null)
    }
    setAutoCapturing(false)
    setAutoCaptureCancelled(false)
    autoCaptureCancelledRef.current = false
  }, [boomerangUrl])

  // ── Select template ──
  const selectTemplate = useCallback((template: TemplateData | null) => {
    setSelectedTemplate(template)
    setTemplatePhotos([])
    setCompositeImage(null)
    setShowComposite(false)
    setBoomerangBlob(null)
    if (boomerangUrl) {
      URL.revokeObjectURL(boomerangUrl)
      setBoomerangUrl(null)
    }
  }, [boomerangUrl])

  // ── Custom background upload ──
  const handleCustomBgUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
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
      if (selectedBg === bgId) setSelectedBg('none')
    },
    [selectedBg]
  )

  // ── Fullscreen toggle ──
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }, [])

  // ── Timer mode cycle ──
  const cycleTimer = useCallback(() => {
    const modes: (0 | 3 | 5 | 10)[] = [0, 3, 5, 10]
    const currentIdx = modes.indexOf(timerMode)
    setTimerMode(modes[(currentIdx + 1) % modes.length])
  }, [timerMode])

  return (
    <div ref={containerRef} className="absolute inset-0 flex flex-col bg-black">
      {/* ── Main Camera View ── */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            transform: mirrorVideo ? 'scaleX(-1)' : 'none',
            zIndex: !cameraActive ? -1 : isVirtualBgActive ? 0 : 1,
            opacity: cameraActive ? 1 : 0,
            pointerEvents: cameraActive ? 'auto' : 'none',
          }}
          playsInline
          muted
        />

        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            zIndex: isVirtualBgActive && cameraActive ? 1 : -1,
            display: isVirtualBgActive && cameraActive ? 'block' : 'none',
          }}
        />

        {cameraError ? (
          /* Camera error state */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-stone-950 z-[2]">
            <div className="size-20 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <CameraOff className="size-10 text-red-400" />
            </div>
            <p className="text-base font-medium text-red-300 mb-2">{cameraError}</p>
            <Button
              variant="outline"
              className="mt-2 text-white border-white/20 hover:bg-white/10"
              onClick={() => { setCameraError(null); startCamera() }}
            >
              Try Again
            </Button>
          </div>
        ) : !cameraActive ? (
          /* Camera off — big start button */
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-950 z-[2]">
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3 bg-gradient-to-b from-black/70 to-transparent z-10">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/80 hover:text-white hover:bg-white/20 gap-2"
                onClick={() => setCurrentPage('dashboard')}
              >
                <ArrowLeft className="size-4" />
                <span className="text-sm">Back</span>
              </Button>
              <div className="flex items-center gap-2">
                <Radio className="size-4 text-emerald-400" />
                <span className="text-sm font-semibold text-white">Live Display</span>
              </div>
              <div className="w-16" />
            </div>
            <div className="size-32 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 border-2 border-emerald-500/30">
              <Camera className="size-16 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Ready to Shoot?</h2>
            <p className="text-stone-400 mb-8 text-center max-w-sm">
              Start your camera to begin taking photos with virtual backgrounds
            </p>
            <Button
              size="lg"
              onClick={startCamera}
              className="gap-3 bg-emerald-600 hover:bg-emerald-700 text-white text-lg px-8 h-14 rounded-full shadow-lg shadow-emerald-900/50"
            >
              <Camera className="size-5" />
              Start Camera
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowTemplateModal(true)}
              className="gap-2 border-white/20 text-white hover:bg-white/10 hover:text-white text-sm px-6 h-12 rounded-full"
            >
              <LayoutTemplate className="size-4" />
              Choose Template
              {selectedTemplate && (
                <span className="text-emerald-400 text-xs font-medium">({selectedTemplate.name})</span>
              )}
            </Button>
          </div>
        ) : (
          <>
            {/* Countdown overlay */}
            <AnimatePresence>
              {countdown !== null && countdown > 0 && (
                <motion.div
                  key="countdown"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.5 }}
                  className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
                >
                  <div className="size-40 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border-4 border-white/30">
                    <span className="text-8xl font-black text-white tabular-nums">{countdown}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Capture flash */}
            {capturing && (
              <div className="absolute inset-0 bg-white/90 animate-pulse pointer-events-none z-20" />
            )}

            {/* Template placeholder overlay on camera */}
            {selectedTemplate && templatePlaceholders.length > 0 && !showComposite && (
              <div className="absolute inset-0 z-[3] pointer-events-none">
                {templatePlaceholders.map((ph: PlaceholderDef, i: number) => {
                  const filled = i < templatePhotos.length
                  return (
                    <div
                      key={i}
                      className="absolute border-2 border-dashed flex items-center justify-center"
                      style={{
                        left: `${ph.x}%`,
                        top: `${ph.y}%`,
                        width: `${ph.width}%`,
                        height: `${ph.height}%`,
                        borderColor: filled ? 'rgba(52, 211, 153, 0.7)' : 'rgba(255, 255, 255, 0.5)',
                        borderRadius: `${ph.borderRadius ?? 0}px`,
                        backgroundColor: filled ? 'rgba(52, 211, 153, 0.15)' : 'rgba(0, 0, 0, 0.25)',
                      }}
                    >
                      <span className="text-white/70 text-lg font-bold">
                        {filled ? <Check className="size-6 text-emerald-300" /> : i + 1}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Auto-capture progress indicator */}
            {autoCapturing && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[5] pointer-events-none">
                <div className="rounded-full bg-black/70 backdrop-blur-sm px-5 py-2 flex items-center gap-2">
                  <span className="text-sm font-medium text-white">
                    Auto Capture {autoCaptureStep}/{autoCaptureTotal}
                  </span>
                </div>
              </div>
            )}

            {/* Top bar overlay */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3 z-10 bg-gradient-to-b from-black/50 to-transparent">
              {/* Left: Back + Live indicator */}
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/80 hover:text-white hover:bg-white/20 h-9 w-9 rounded-full"
                  onClick={stopCamera}
                  title="Back to Dashboard"
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <div className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-white animate-pulse" />
                  <span className="text-xs font-bold text-white">LIVE</span>
                </div>
                {modelLoading && (
                  <div className="flex items-center gap-1.5 rounded-full bg-amber-500/80 px-3 py-1">
                    <Sparkles className="size-3 text-white animate-spin" />
                    <span className="text-xs font-medium text-white">AI Loading...</span>
                  </div>
                )}
                {!modelLoading && segmentationReady && !isVirtualBgActive && !segmentationError && (
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-600/60 px-3 py-1">
                    <Sparkles className="size-3 text-white" />
                    <span className="text-xs font-medium text-white">AI Ready</span>
                  </div>
                )}
                {segmentationReady && isVirtualBgActive && !segmentationMaskFailed && (
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/80 px-3 py-1">
                    <Sparkles className="size-3 text-white" />
                    <span className="text-xs font-medium text-white">AI Background</span>
                  </div>
                )}
                {!modelLoading && segmentationError && (
                  <div className="flex items-center gap-1.5 rounded-full bg-red-600/80 px-3 py-1" title="Person will not be separated from background">
                    <AlertCircle className="size-3 text-red-200" />
                    <span className="text-xs font-medium text-red-200">AI Failed</span>
                  </div>
                )}
                {segmentationMaskFailed && !segmentationError && (
                  <div className="flex items-center gap-1.5 rounded-full bg-red-500/80 px-3 py-1">
                    <AlertCircle className="size-3 text-red-200" />
                    <span className="text-xs font-medium text-red-200">AI Separation Failed</span>
                  </div>
                )}
                {/* Template indicator & info bar */}
                {selectedTemplate && (
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-700/80 px-3 py-1">
                    <LayoutTemplate className="size-3 text-white" />
                    <span className="text-xs font-medium text-white">{selectedTemplate.name}</span>
                    {selectedTemplate.layout && (
                      <span className="text-[10px] font-semibold text-emerald-200 bg-emerald-900/60 rounded px-1">
                        {selectedTemplate.layout}
                      </span>
                    )}
                    <span className="text-[10px] font-medium text-emerald-200">
                      {selectedTemplate.captureMode === 'auto' ? 'Auto' : 'Manual'}
                    </span>
                    <span className="text-xs text-emerald-200">
                      {templatePhotos.length}/{templatePlaceholders.length}
                    </span>
                  </div>
                )}
                {/* Active session indicator */}
                {activeSession && (
                  <div className="flex items-center gap-1.5 rounded-full bg-teal-700/80 px-3 py-1">
                    <span className="text-xs font-medium text-white">{activeSession.guestName}</span>
                    {activeSession.guestEmail && (
                      <span className="text-[10px] text-teal-200 truncate max-w-[120px]">{activeSession.guestEmail}</span>
                    )}
                  </div>
                )}
                {/* Choose Template button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/80 hover:text-white hover:bg-white/20 h-9 w-9 rounded-full"
                  onClick={() => setShowTemplateModal(true)}
                  title="Choose Template"
                >
                  <LayoutTemplate className="size-4" />
                </Button>
              </div>

              {/* Top-right controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/80 hover:text-white hover:bg-white/20 h-9 w-9 rounded-full"
                  onClick={() => setMirrorVideo(!mirrorVideo)}
                  title={mirrorVideo ? 'Unmirror' : 'Mirror'}
                >
                  <RotateCcw className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/80 hover:text-white hover:bg-white/20 h-9 w-9 rounded-full"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/80 hover:text-red-400 hover:bg-white/20 h-9 w-9 rounded-full"
                  onClick={stopCamera}
                >
                  <CameraOff className="size-4" />
                </Button>
              </div>
            </div>

            {/* Bottom strip — Background + Template selector + Controls */}
            <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 via-black/40 to-transparent pt-16 pb-3 px-3">
              {/* Capture button area + timer */}
              <div className="flex items-center justify-center gap-4 mb-3">
                {/* Timer button */}
                {!autoCapturing && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white/80 hover:text-white hover:bg-white/20 h-10 w-10 rounded-full"
                    onClick={cycleTimer}
                    title={`Timer: ${timerMode === 0 ? 'Off' : `${timerMode}s`}`}
                  >
                    {timerMode === 0 ? <Timer className="size-5" /> : (
                      <span className="text-sm font-bold">{timerMode}s</span>
                    )}
                  </Button>
                )}

                {/* Capture / Auto-capture button */}
                {autoCapturing ? (
                  <button
                    onClick={cancelAutoCapture}
                    className="relative size-20 rounded-full bg-red-600 border-4 border-red-400 hover:border-red-300 transition-all duration-150 active:scale-95 shadow-xl shadow-red-900/40 flex items-center justify-center"
                    aria-label="Cancel Auto-Capture"
                  >
                    <Ban className="size-8 text-white" />
                  </button>
                ) : isAutoCapture && selectedTemplate && !allSlotsFilled ? (
                  <button
                    onClick={startCapture}
                    disabled={countdown !== null || capturing}
                    className="relative size-20 rounded-full bg-emerald-600 border-4 border-emerald-400 hover:border-emerald-300 transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-emerald-900/40 flex items-center justify-center gap-1"
                    aria-label="Start Shoot"
                  >
                    <Play className="size-8 text-white" />
                  </button>
                ) : selectedTemplate && allSlotsFilled ? (
                  <button
                    onClick={generateComposite}
                    disabled={countdown !== null || capturing}
                    className="relative size-20 rounded-full bg-emerald-600 border-4 border-emerald-400 hover:border-emerald-300 transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-emerald-900/40 flex items-center justify-center"
                    aria-label="Generate Composite"
                  >
                    <LayoutTemplate className="size-8 text-white" />
                  </button>
                ) : (
                  <button
                    onClick={startCapture}
                    disabled={countdown !== null || capturing}
                    className="relative size-20 rounded-full bg-white border-4 border-white/50 hover:border-white transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-white/20"
                    aria-label="Take Photo"
                  >
                    <div className="absolute inset-1 rounded-full bg-white hover:bg-emerald-100 transition-colors" />
                  </button>
                )}

                {/* Gallery button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/80 hover:text-white hover:bg-white/20 h-10 w-10 rounded-full relative"
                  onClick={() => setShowGallery(!showGallery)}
                >
                  <ImagePlus className="size-5" />
                  {capturedPhotos.length > 0 && (
                    <span className="absolute -top-1 -right-1 size-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {capturedPhotos.length}
                    </span>
                  )}
                </Button>
              </div>

              {/* Guest email input + boomerang button (when template selected) */}
              {selectedTemplate && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="flex-1 relative">
                    <Mail className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-white/40" />
                    <Input
                      type="email"
                      placeholder={activeSession?.guestEmail || "Guest email (optional)"}
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="h-8 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/40 pl-7 pr-2 rounded-lg"
                    />
                  </div>
                  {selectedTemplate.includeGif && allSlotsFilled && !boomerangBlob && (
                    <Button
                      size="sm"
                      onClick={startBoomerangRecording}
                      disabled={recordingBoomerang}
                      className="h-8 text-xs gap-1 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {recordingBoomerang ? (
                        <>
                          <Square className="size-3 animate-pulse" />
                          <span>Rec...</span>
                        </>
                      ) : (
                        <>
                          <Video className="size-3" />
                          <span>Boomerang</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

              {/* Template selector strip */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-2 scrollbar-thin">
                <div className="flex items-center gap-1 mr-1">
                  <LayoutTemplate className="size-3 text-white/40" />
                  <span className="text-[10px] text-white/40 whitespace-nowrap">Templates</span>
                </div>
                {/* No Template option */}
                <button
                  onClick={() => selectTemplate(null)}
                  className={`shrink-0 flex flex-col items-center gap-1 rounded-xl p-1.5 w-14 transition-all duration-150 cursor-pointer ${
                    !selectedTemplate
                      ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-black bg-white/20'
                      : 'hover:bg-white/10 bg-transparent'
                  }`}
                >
                  <div className="size-8 rounded-lg overflow-hidden flex items-center justify-center border border-white/20 bg-stone-700">
                    <X className="size-3 text-white/60" />
                  </div>
                  <span className="text-[9px] leading-tight text-white/60 truncate w-full text-center">
                    None
                  </span>
                </button>
                {/* Template thumbnails */}
                {templates.map((tpl) => {
                  const isActive = selectedTemplate?.id === tpl.id
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => selectTemplate(tpl)}
                      className={`shrink-0 flex flex-col items-center gap-1 rounded-xl p-1.5 w-14 transition-all duration-150 cursor-pointer ${
                        isActive
                          ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-black bg-white/20'
                          : 'hover:bg-white/10 bg-transparent'
                      }`}
                      title={`${tpl.name}${tpl.captureMode === 'auto' ? ' (Auto)' : ''}`}
                    >
                      <div className="size-8 rounded-lg overflow-hidden flex items-center justify-center border border-white/20 bg-stone-700 relative">
                        {tpl.stripImageUrl ? (
                          <img
                            src={tpl.stripImageUrl}
                            alt={tpl.name}
                            className="absolute inset-0.5 size-7 object-cover rounded"
                          />
                        ) : (
                          <LayoutTemplate className="size-4 text-white/60" />
                        )}
                        {tpl.captureMode === 'auto' && (
                          <div className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-amber-400 border border-black" />
                        )}
                      </div>
                      <span className="text-[9px] leading-tight text-white/60 truncate w-full text-center">
                        {tpl.name}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Background strip */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {allBackgrounds.map((bg) => {
                  const isActive = selectedBg === bg.id
                  const isCustom = bg.type === 'custom'
                  return (
                    <div key={bg.id} className="relative group shrink-0">
                      <button
                        onClick={() => setSelectedBg(bg.id)}
                        className={`
                          relative flex flex-col items-center gap-1 rounded-xl p-1.5 w-16
                          transition-all duration-150 cursor-pointer
                          ${isActive
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-black bg-white/20'
                            : 'hover:bg-white/10 bg-transparent'
                          }
                        `}
                        title={bg.label}
                      >
                        <div
                          className={`
                            size-10 rounded-lg overflow-hidden flex items-center justify-center
                            border border-white/20 relative
                            ${bg.preview}
                          `}
                        >
                          {bg.type === 'none' && <Camera className="size-4 text-white/60" />}
                          {bg.type === 'blur' && <Sparkles className="size-4 text-white/80" />}
                          {isCustom && bg.value && (
                            <img
                              src={bg.value}
                              alt=""
                              className="absolute inset-0.5 size-9 object-cover rounded"
                            />
                          )}
                        </div>
                        <span className="text-[10px] leading-tight text-white/60 group-hover:text-white/90 truncate w-full text-center">
                          {bg.label}
                        </span>
                      </button>
                      {isCustom && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeCustomBg(bg.id) }}
                          className="absolute -top-1 -right-1 size-4 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                          <X className="size-2.5" />
                        </button>
                      )}
                    </div>
                  )
                })}
                {/* Upload button in strip */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 flex flex-col items-center gap-1 rounded-xl p-1.5 w-16 transition-all duration-150 cursor-pointer hover:bg-white/10"
                >
                  <div className="size-10 rounded-lg overflow-hidden flex items-center justify-center border-2 border-dashed border-white/30">
                    <Upload className="size-4 text-white/50" />
                  </div>
                  <span className="text-[10px] leading-tight text-white/40 truncate w-full text-center">
                    Upload
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCustomBgUpload}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Photo Gallery Panel ── */}
      <AnimatePresence>
        {showGallery && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden bg-stone-950 border-t border-white/10"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">
                  Captured Photos ({capturedPhotos.length})
                </h3>
                <div className="flex items-center gap-2">
                  {capturedPhotos.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs h-7"
                      onClick={() => { setCapturedPhotos([]); setSelectedPhoto(null) }}
                    >
                      Clear All
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white hover:bg-white/10 text-xs h-7"
                    onClick={() => setShowGallery(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>

              {capturedPhotos.length === 0 ? (
                <p className="text-center text-stone-500 text-sm py-6">
                  No photos yet. Capture some!
                </p>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {capturedPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className={`shrink-0 relative group rounded-lg overflow-hidden cursor-pointer transition-all ${
                        selectedPhoto?.id === photo.id
                          ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-stone-950'
                          : 'ring-1 ring-white/10 hover:ring-white/30'
                      }`}
                      onClick={() => setSelectedPhoto(selectedPhoto?.id === photo.id ? null : photo)}
                    >
                      <img
                        src={photo.dataUrl}
                        alt={`Photo ${new Date(photo.timestamp).toLocaleTimeString()}`}
                        className="size-24 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); downloadPhoto(photo) }}
                          className="size-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30"
                        >
                          <Download className="size-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deletePhoto(photo.id) }}
                          className="size-7 rounded-full bg-red-500/50 flex items-center justify-center text-white hover:bg-red-500/70"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedPhoto && (
                <div className="mt-3 flex items-center gap-3 p-3 rounded-lg bg-white/5">
                  <img
                    src={selectedPhoto.dataUrl}
                    alt="Selected"
                    className="size-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <p className="text-xs text-stone-400">
                      {new Date(selectedPhoto.timestamp).toLocaleString()}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white/60 hover:text-white hover:bg-white/10 text-xs h-7 gap-1"
                        onClick={() => downloadPhoto(selectedPhoto)}
                      >
                        <Download className="size-3" />
                        Download
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs h-7 gap-1"
                        onClick={() => deletePhoto(selectedPhoto.id)}
                      >
                        <Trash2 className="size-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Composite Result Modal ── */}
      <Dialog open={showComposite} onOpenChange={setShowComposite}>
        <DialogContent className="bg-stone-950 border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Photo Strip Ready!</DialogTitle>
            <DialogDescription className="text-stone-400">
              Your photo strip has been generated. Download, print, or email it.
            </DialogDescription>
          </DialogHeader>

          {/* Composite image preview */}
          {compositeImage && (
            <div className="rounded-lg overflow-hidden border border-white/10 bg-stone-900 flex items-center justify-center p-2">
              <img
                src={compositeImage}
                alt="Photo strip composite"
                className="max-w-full max-h-[50vh] w-auto h-auto"
              />
            </div>
          )}

          {/* Boomerang preview */}
          {boomerangUrl && (
            <div className="rounded-lg overflow-hidden border border-white/10 bg-stone-900 mt-2">
              <video
                src={boomerangUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-auto max-h-[30vh] object-contain"
              />
              <p className="text-center text-xs text-stone-400 py-1">Boomerang</p>
            </div>
          )}

          {/* Email input (shown if auto-email needs it) */}
          {showEmailInput && (
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="h-9 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/40"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && guestEmail.trim() && compositeImage) {
                    handleEmail(guestEmail.trim(), compositeImage)
                  }
                }}
              />
              <Button
                size="sm"
                onClick={() => {
                  if (guestEmail.trim() && compositeImage) {
                    handleEmail(guestEmail.trim(), compositeImage)
                  }
                }}
                disabled={!guestEmail.trim() || sendingEmail}
                className="h-9 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
              >
                <Send className="size-3" />
                {sendingEmail ? 'Sending...' : 'Send'}
              </Button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mt-2">
            <Button
              size="sm"
              onClick={downloadComposite}
              className="gap-1.5 bg-white text-black hover:bg-stone-200"
            >
              <Download className="size-4" />
              Download
            </Button>
            <Button
              size="sm"
              onClick={() => handlePrint()}
              disabled={printingPhoto}
              className="gap-1.5 bg-stone-700 hover:bg-stone-600 text-white"
            >
              <Printer className="size-4" />
              {printingPhoto ? 'Printing...' : 'Print'}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (guestEmail.trim() && compositeImage) {
                  handleEmail(guestEmail.trim(), compositeImage)
                } else {
                  setShowEmailInput(true)
                }
              }}
              disabled={sendingEmail}
              className="gap-1.5 bg-stone-700 hover:bg-stone-600 text-white"
            >
              <Mail className="size-4" />
              {sendingEmail ? 'Sending...' : 'Email'}
            </Button>
            <Button
              size="sm"
              onClick={retakePhotos}
              variant="outline"
              className="gap-1.5 border-white/20 text-white hover:bg-white/10"
            >
              <RefreshCw className="size-4" />
              Retake
            </Button>
          </div>

          {/* Template info badges */}
          {selectedTemplate && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {selectedTemplate.captureMode === 'auto' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Auto-Capture
                </span>
              )}
              {selectedTemplate.includeGif && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Boomerang
                </span>
              )}
              {selectedTemplate.printAuto && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Auto-Print
                </span>
              )}
              {selectedTemplate.emailAuto && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Auto-Email
                </span>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Template Selection Modal ── */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="bg-stone-950 border-white/10 text-white max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <LayoutTemplate className="size-5" />
              Choose Template
            </DialogTitle>
            <DialogDescription className="text-stone-400">
              Select a photo strip template for your session. Each template defines the layout and capture mode.
            </DialogDescription>
          </DialogHeader>

          {/* Template grid */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-2">
              {/* No Template option */}
              <button
                onClick={() => {
                  selectTemplate(null)
                  setShowTemplateModal(false)
                  toast.info('Template removed')
                }}
                className={`flex flex-col rounded-xl border-2 p-3 transition-all duration-150 cursor-pointer text-left ${
                  !selectedTemplate
                    ? 'border-emerald-400 bg-emerald-400/10 shadow-lg shadow-emerald-400/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <div className="aspect-[2/3] w-full rounded-lg overflow-hidden flex items-center justify-center border border-white/10 bg-stone-800 mb-2 relative">
                  <X className="size-8 text-white/30" />
                  {!selectedTemplate && (
                    <div className="absolute top-1.5 right-1.5 size-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="size-3 text-white" />
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-white truncate">No Template</span>
                <span className="text-[11px] text-stone-400 mt-0.5">Free capture mode</span>
              </button>

              {/* Template cards */}
              {templates.map((tpl) => {
                const isActive = selectedTemplate?.id === tpl.id
                const phCount = parsePlaceholders(tpl.placeholders).length
                return (
                  <button
                    key={tpl.id}
                    onClick={() => {
                      selectTemplate(tpl)
                      setShowTemplateModal(false)
                      toast.success(`Template "${tpl.name}" selected`)
                    }}
                    className={`flex flex-col rounded-xl border-2 p-3 transition-all duration-150 cursor-pointer text-left ${
                      isActive
                        ? 'border-emerald-400 bg-emerald-400/10 shadow-lg shadow-emerald-400/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Preview thumbnail */}
                    <div className="w-full rounded-lg overflow-hidden border border-white/10 bg-stone-800 mb-2 relative flex items-center justify-center" style={{ aspectRatio: '2/3' }}>
                      {tpl.stripImageUrl ? (
                        <img
                          src={tpl.stripImageUrl}
                          alt={tpl.name}
                          className="max-w-full max-h-full w-auto h-auto object-contain"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <LayoutTemplate className="size-8 text-white/20" />
                        </div>
                      )}
                      {/* Active indicator */}
                      {isActive && (
                        <div className="absolute top-1.5 right-1.5 size-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
                          <Check className="size-3 text-white" />
                        </div>
                      )}
                      {/* Auto badge */}
                      {tpl.captureMode === 'auto' && (
                        <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 rounded-full bg-amber-500/90 px-1.5 py-0.5">
                          <Play className="size-2.5 text-white" />
                          <span className="text-[9px] font-bold text-white">AUTO</span>
                        </div>
                      )}
                      {/* Inactive badge */}
                      {tpl.active === false && (
                        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 rounded-full bg-red-600/90 px-1.5 py-0.5">
                          <Ban className="size-2.5 text-white" />
                          <span className="text-[9px] font-bold text-white">OFF</span>
                        </div>
                      )}
                    </div>
                    {/* Template info */}
                    <span className="text-sm font-medium text-white truncate">{tpl.name}</span>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {tpl.layout && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-stone-300">
                          {tpl.layout}
                        </span>
                      )}
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        tpl.captureMode === 'auto'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-white/10 text-stone-400'
                      }`}>
                        {tpl.captureMode === 'auto' ? 'Auto' : 'Manual'}
                      </span>
                      {phCount > 0 && (
                        <span className="text-[10px] text-stone-500">
                          {phCount} photo{phCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {/* Description */}
                    {tpl.description && (
                      <p className="text-[11px] text-stone-500 mt-1 line-clamp-2">{tpl.description}</p>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Empty state */}
            {templates.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <LayoutTemplate className="size-12 text-stone-600 mb-3" />
                <p className="text-sm text-stone-400">No templates available</p>
                <p className="text-xs text-stone-500 mt-1">Create templates from the Templates page first.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
