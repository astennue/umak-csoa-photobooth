'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
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
} from 'lucide-react'
import { toast } from 'sonner'

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

/* ------------------------------------------------------------------ */
/*  Main Component — Photo Booth Kiosk                                 */
/*  Strategy: VIDEO is always the primary display.                     */
/*  Canvas overlays ONLY when virtual background is active.            */
/* ------------------------------------------------------------------ */

export default function LiveDisplay() {
  // ── Camera state ──
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [modelLoading, setModelLoading] = useState(false)
  const [segmentationReady, setSegmentationReady] = useState(false)

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

  const allBackgrounds = useMemo(
    () => [...BUILT_IN_BACKGROUNDS, ...customBackgrounds],
    [customBackgrounds]
  )

  // ── Derived: is a virtual background active? ──
  const currentBg = allBackgrounds.find((b) => b.id === selectedBg)
  const isVirtualBgActive = currentBg && currentBg.type !== 'none'

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

  // ── Keep refs in sync ──
  useEffect(() => { cameraActiveRef.current = cameraActive }, [cameraActive])
  useEffect(() => { selectedBgRef.current = selectedBg }, [selectedBg])
  useEffect(() => { allBackgroundsRef.current = allBackgrounds }, [allBackgrounds])
  useEffect(() => { mirrorVideoRef.current = mirrorVideo }, [mirrorVideo])
  useEffect(() => { isVirtualBgActiveRef.current = !!isVirtualBgActive }, [isVirtualBgActive])

  // ── Initialize MediaPipe segmentation ──
  useEffect(() => {
    let cancelled = false

    async function initSegmentation() {
      try {
        setModelLoading(true)

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
        setModelLoading(false)
      } catch (err) {
        console.warn('Segmentation init failed:', err)
        if (!cancelled) {
          setModelLoading(false)
          setSegmentationReady(false)
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

  // ── Load background image ──
  useEffect(() => {
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
      } catch {
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

    // If no segmentation available, just draw video on canvas (with background)
    if (!segmenterRef.current || !segmentationReady) {
      ctx.clearRect(0, 0, width, height)
      drawBackground(ctx, width, height)
      ctx.save()
      if (mirrorVideoRef.current) {
        ctx.translate(width, 0)
        ctx.scale(-1, 1)
      }
      ctx.globalAlpha = 0.8
      ctx.drawImage(video, 0, 0, width, height)
      ctx.globalAlpha = 1
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
        ctx.clearRect(0, 0, width, height)
        drawBackground(ctx, width, height)
        ctx.save()
        if (mirrorVideoRef.current) {
          ctx.translate(width, 0)
          ctx.scale(-1, 1)
        }
        ctx.drawImage(video, 0, 0, width, height)
        ctx.restore()
      }
    } else {
      ctx.clearRect(0, 0, width, height)
      drawBackground(ctx, width, height)
      ctx.save()
      if (mirrorVideoRef.current) {
        ctx.translate(width, 0)
        ctx.scale(-1, 1)
      }
      ctx.globalAlpha = 0.7
      ctx.drawImage(video, 0, 0, width, height)
      ctx.globalAlpha = 1
      ctx.restore()
    }

    animFrameRef.current = requestAnimationFrame(renderFrame)
  }, [segmentationReady, drawBackground, processMask, ensureOffscreenCanvas])

  // ── Start/stop render loop — only when virtual BG is active AND camera is on ──
  useEffect(() => {
    if (cameraActive && isVirtualBgActive) {
      // Set canvas dimensions when starting
      if (canvasRef.current && videoRef.current) {
        const vw = videoRef.current.videoWidth || DEFAULT_VIDEO_WIDTH
        const vh = videoRef.current.videoHeight || DEFAULT_VIDEO_HEIGHT
        canvasRef.current.width = vw
        canvasRef.current.height = vh
        canvasSizeRef.current = { w: vw, h: vh }
        maskCanvasRef.current = null
        personCanvasRef.current = null
      }
      animFrameRef.current = requestAnimationFrame(renderFrame)
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = 0
      }
    }
  }, [cameraActive, isVirtualBgActive, renderFrame])

  // ── Start camera ──
  // Step 1: Acquire the stream and set cameraActive=true (which mounts the <video>)
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

      // Setting cameraActive=true will mount the <video> element.
      // The useEffect below will then attach the stream and call play().
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

  // ── Step 2: When cameraActive becomes true and video element mounts, attach stream ──
  useEffect(() => {
    if (!cameraActive) return

    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return

    video.srcObject = stream
    video.play().catch(() => {
      // Some browsers require muted for autoplay
      video.muted = true
      video.play().catch(() => {
        // If play still fails, show error
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
    // Don't access videoRef.current here — the <video> element will be
    // unmounted on the next render when cameraActive becomes false.
    // Just clear the state and the cleanup useEffect will handle the rest.
    maskCanvasRef.current = null
    personCanvasRef.current = null
    setCameraActive(false)
    // Reset to no background when camera stops
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

  // ── Take photo ──
  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    if (!video || !cameraActive) return

    setCapturing(true)

    try {
      // If virtual BG is active, capture from canvas
      if (isVirtualBgActiveRef.current && canvasRef.current) {
        const dataUrl = canvasRef.current.toDataURL('image/png')
        const photo: CapturedPhoto = {
          id: `photo-${Date.now()}`,
          dataUrl,
          timestamp: Date.now(),
        }
        setCapturedPhotos((prev) => [photo, ...prev])
        toast.success('Photo captured!', { duration: 2000 })
      } else {
        // Capture from video directly
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
          const dataUrl = tempCanvas.toDataURL('image/png')
          const photo: CapturedPhoto = {
            id: `photo-${Date.now()}`,
            dataUrl,
            timestamp: Date.now(),
          }
          setCapturedPhotos((prev) => [photo, ...prev])
          toast.success('Photo captured!', { duration: 2000 })
        }
      }
    } catch {
      toast.error('Failed to capture photo')
    } finally {
      setTimeout(() => setCapturing(false), 400)
    }
  }, [cameraActive, mirrorVideo])

  // ── Countdown + capture ──
  const startCapture = useCallback(() => {
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
  }, [timerMode, capturePhoto])

  // ── Download photo ──
  const downloadPhoto = useCallback((photo: CapturedPhoto) => {
    const link = document.createElement('a')
    link.download = `photobooth-${new Date(photo.timestamp).toISOString().slice(0, 19).replace(/[T:]/g, '-')}.png`
    link.href = photo.dataUrl
    link.click()
    toast.success('Photo downloaded!')
  }, [])

  // ── Delete photo ──
  const deletePhoto = useCallback((photoId: string) => {
    setCapturedPhotos((prev) => prev.filter((p) => p.id !== photoId))
    if (selectedPhoto?.id === photoId) setSelectedPhoto(null)
    toast.success('Photo deleted')
  }, [selectedPhoto])

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
    <div ref={containerRef} className="flex flex-col h-full -m-4 md:-m-6 bg-black">
      {/* ── Main Camera View ── */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {/*
          ── VIDEO: Always mounted in the DOM so the ref is always available.
          Hidden with CSS when camera is off (opacity-0 + pointer-events-none).
          Uses CSS scaleX(-1) for mirror effect.
          When virtual BG is active, video hides behind canvas.
        */}
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

        {/*
          ── CANVAS: Only visible when virtual background is active ──
          Renders on top of the video with composited output.
        */}
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

            {/* Top bar overlay */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3 z-10 bg-gradient-to-b from-black/50 to-transparent">
              {/* Live indicator */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-white animate-pulse" />
                  <span className="text-xs font-bold text-white">LIVE</span>
                </div>
                {modelLoading && (
                  <div className="flex items-center gap-1.5 rounded-full bg-amber-500/80 px-3 py-1">
                    <Sparkles className="size-3 text-white animate-spin" />
                    <span className="text-xs font-medium text-white">Loading AI...</span>
                  </div>
                )}
                {segmentationReady && isVirtualBgActive && (
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/80 px-3 py-1">
                    <Sparkles className="size-3 text-white" />
                    <span className="text-xs font-medium text-white">AI Background</span>
                  </div>
                )}
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

            {/* Bottom strip — Background selector */}
            <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 via-black/40 to-transparent pt-16 pb-3 px-3">
              {/* Capture button area + timer */}
              <div className="flex items-center justify-center gap-4 mb-3">
                {/* Timer button */}
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

                {/* BIG CAPTURE BUTTON */}
                <button
                  onClick={startCapture}
                  disabled={countdown !== null || capturing}
                  className="relative size-20 rounded-full bg-white border-4 border-white/50 hover:border-white transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-white/20"
                  aria-label="Take Photo"
                >
                  <div className="absolute inset-1 rounded-full bg-white hover:bg-emerald-100 transition-colors" />
                </button>

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

              {/* Selected photo preview */}
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
    </div>
  )
}
