'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  Camera,
  CameraOff,
  ImageIcon,
  Palette,
  Sparkles,
  Aperture,
  Upload,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// ── Background option types ─────────────────────────────────────────
type BackgroundType = 'none' | 'blur' | 'color' | 'gradient' | 'image' | 'custom'

interface BackgroundOption {
  id: string
  type: BackgroundType
  label: string
  value: string
  preview: string
}

// ── Built-in backgrounds ───────────────────────────────────────────
const BUILT_IN_BACKGROUNDS: BackgroundOption[] = [
  { id: 'none', type: 'none', label: 'None', value: '', preview: 'bg-stone-700' },
  { id: 'blur', type: 'blur', label: 'Blur', value: '', preview: 'bg-stone-600 blur-[2px]' },
  // Solid colors
  { id: 'color-teal', type: 'color', label: 'Deep Teal', value: '#115e59', preview: 'bg-teal-800' },
  { id: 'color-amber', type: 'color', label: 'Warm Amber', value: '#92400e', preview: 'bg-amber-800' },
  { id: 'color-stone', type: 'color', label: 'Stone Gray', value: '#44403c', preview: 'bg-stone-700' },
  { id: 'color-emerald', type: 'color', label: 'Emerald', value: '#065f46', preview: 'bg-emerald-800' },
  // Gradients
  {
    id: 'grad-1',
    type: 'gradient',
    label: 'Sunset',
    value: 'linear-gradient(135deg, #92400e 0%, #b45309 50%, #dc2626 100%)',
    preview: 'bg-gradient-to-br from-amber-800 via-amber-700 to-red-700',
  },
  {
    id: 'grad-2',
    type: 'gradient',
    label: 'Ocean',
    value: 'linear-gradient(135deg, #115e59 0%, #0e7490 50%, #1e40af 100%)',
    preview: 'bg-gradient-to-br from-teal-800 via-cyan-800 to-blue-900',
  },
  {
    id: 'grad-3',
    type: 'gradient',
    label: 'Forest',
    value: 'linear-gradient(135deg, #065f46 0%, #166534 50%, #1a2e05 100%)',
    preview: 'bg-gradient-to-br from-emerald-800 via-green-800 to-lime-950',
  },
  {
    id: 'grad-4',
    type: 'gradient',
    label: 'Dusk',
    value: 'linear-gradient(135deg, #312e81 0%, #581c87 50%, #831843 100%)',
    preview: 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900',
  },
]

// ── Component props ─────────────────────────────────────────────────
interface VirtualBackgroundProps {
  onCapture?: (imageDataUrl: string) => void
}

// ── Default canvas dimensions (will be updated when video loads) ────
const DEFAULT_VIDEO_WIDTH = 1280
const DEFAULT_VIDEO_HEIGHT = 720

export default function VirtualBackground({ onCapture }: VirtualBackgroundProps) {
  // ── State ─────────────────────────────────────────────────────────
  const [cameraActive, setCameraActive] = useState(false)
  const [selectedBg, setSelectedBg] = useState<string>('none')
  const [error, setError] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [customBackgrounds, setCustomBackgrounds] = useState<BackgroundOption[]>([])
  const [modelLoading, setModelLoading] = useState(false)
  const [segmentationReady, setSegmentationReady] = useState(false)
  const [segmentationError, setSegmentationError] = useState<string | null>(null)
  const [videoReady, setVideoReady] = useState(false)

  // ── Refs ──────────────────────────────────────────────────────────
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
  const canvasSizeRef = useRef<{ w: number; h: number }>({ w: DEFAULT_VIDEO_WIDTH, h: DEFAULT_VIDEO_HEIGHT })

  // ── Refs for stable render loop ──
  const selectedBgRef = useRef<string>(selectedBg)
  const allBackgroundsRef = useRef<BackgroundOption[]>(allBackgrounds)

  // ── Keep refs in sync ──
  useEffect(() => {
    cameraActiveRef.current = cameraActive
  }, [cameraActive])
  useEffect(() => {
    selectedBgRef.current = selectedBg
  }, [selectedBg])
  useEffect(() => {
    allBackgroundsRef.current = allBackgrounds
  }, [allBackgrounds])

  // ── Initialize MediaPipe Tasks Vision (ImageSegmenter) ─────────
  useEffect(() => {
    let cancelled = false

    async function initSegmentation() {
      try {
        setModelLoading(true)
        setSegmentationError(null)

        // Dynamic import of the MediaPipe Tasks Vision API
        const visionModule = await import('@mediapipe/tasks-vision')
        const { FilesetResolver, ImageSegmenter } = visionModule

        if (cancelled) return

        // Resolve the WASM files from CDN
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
        )

        if (cancelled) return

        let segmenter
        try {
          segmenter = await ImageSegmenter.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            outputCategoryMask: true,
            outputConfidenceMasks: false,
          })
        } catch {
          // GPU delegate failed, fall back to CPU
          if (cancelled) return
          segmenter = await ImageSegmenter.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
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
        console.warn('Failed to initialize selfie segmentation:', err)
        if (!cancelled) {
          setModelLoading(false)
          setSegmentationReady(false)
          setSegmentationError(
            'AI background removal unavailable. You can still use the camera without virtual backgrounds.'
          )
        }
      }
    }

    initSegmentation()

    return () => {
      cancelled = true
      if (segmenterRef.current) {
        try {
          segmenterRef.current.close()
        } catch {
          // Ignore cleanup errors
        }
        segmenterRef.current = null
      }
    }
  }, [])

  // ── Load background image when an image-type bg is selected ──────
  useEffect(() => {
    const bg = allBackgrounds.find((b) => b.id === selectedBg)
    if (bg?.type === 'image' || bg?.type === 'custom') {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = bg.value
      img.onload = () => {
        bgImageRef.current = img
      }
      img.onerror = () => {
        bgImageRef.current = null
      }
    } else {
      bgImageRef.current = null
    }
  }, [selectedBg, allBackgrounds])

  // ── Ensure offscreen canvases exist at the right size ────────────
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

  // ── Draw background on a given context (uses refs for stable identity) ──
  const drawBackground = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const bg = allBackgroundsRef.current.find((b) => b.id === selectedBgRef.current)
      if (!bg || bg.type === 'none') {
        // Draw black background
        ctx.fillStyle = '#1c1917'
        ctx.fillRect(0, 0, width, height)
        return
      }

      if (bg.type === 'blur') {
        // Draw blurred video as background
        ctx.save()
        ctx.filter = 'blur(16px) brightness(0.7)'
        if (videoRef.current && videoRef.current.readyState >= 2) {
          // Mirror for selfie view
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
        // Draw custom background image with "cover" scaling
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
        // Fallback - dark background
        ctx.fillStyle = '#1c1917'
        ctx.fillRect(0, 0, width, height)
      }
    },
    []
  )

  // ── Process segmentation mask into a proper alpha mask ───────────
  const processMask = useCallback(
    (categoryMask: any, width: number, height: number): HTMLCanvasElement | null => {
      const maskCanvas = ensureOffscreenCanvas(maskCanvasRef)

      const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true })
      if (!maskCtx) return null

      // Draw the category mask to our temp canvas
      maskCtx.clearRect(0, 0, width, height)

      try {
        if (typeof categoryMask === 'object' && categoryMask !== null) {
          // MPMask from ImageSegmenter: try canvas property first, then as image source
          const drawable = categoryMask.canvas || categoryMask
          maskCtx.drawImage(drawable as CanvasImageSource, 0, 0, width, height)
        }
      } catch (e) {
        console.warn('Failed to draw categoryMask:', e)
        return null
      }

      // Get the pixel data and convert to a proper alpha mask
      const maskData = maskCtx.getImageData(0, 0, width, height)
      const pixels = maskData.data

      // Check the max value to determine if we need scaling
      // Some versions output 0/1, others 0/255
      let maxVal = 0
      for (let i = 0; i < Math.min(pixels.length, 400); i += 4) {
        if (pixels[i] > maxVal) maxVal = pixels[i]
      }

      const needsScaling = maxVal <= 1

      // Convert to alpha mask: person = white+opaque, background = transparent
      for (let i = 0; i < pixels.length; i += 4) {
        const category = needsScaling ? pixels[i] * 255 : pixels[i]
        // Any non-zero category is "person" in selfie segmentation
        const isPerson = category > 128
        pixels[i] = 255 // R
        pixels[i + 1] = 255 // G
        pixels[i + 2] = 255 // B
        pixels[i + 3] = isPerson ? 255 : 0 // A
      }

      maskCtx.putImageData(maskData, 0, 0)
      return maskCanvas
    },
    [ensureOffscreenCanvas]
  )

  // ── Main render loop ─────────────────────────────────────────────
  const renderFrame = useCallback(() => {
    if (!cameraActiveRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) {
      animFrameRef.current = requestAnimationFrame(renderFrame)
      return
    }

    // Don't render if video isn't ready
    if (video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(renderFrame)
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const bg = allBackgroundsRef.current.find((b) => b.id === selectedBgRef.current)
    const hasVirtualBg = bg && bg.type !== 'none'

    // ── If no virtual background or no segmentation, just draw mirrored video ──
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

    // ── Run segmentation (~15fps to conserve CPU/GPU) ────────────
    const now = performance.now()
    let maskCanvas: HTMLCanvasElement | null = maskCanvasRef.current

    if (now - lastSegmentTimeRef.current > 66) {
      try {
        const result = segmenterRef.current.segmentForVideo(video, now)
        lastSegmentTimeRef.current = now

        if (result && result.categoryMask) {
          maskCanvas = processMask(result.categoryMask, width, height)
        }
      } catch (err) {
        // Segmentation might fail on some frames, use last good mask
      }
    }

    // ── Composite using GPU-accelerated canvas operations ────────
    if (maskCanvas) {
      // Use a person canvas to hold the person cutout
      const personCanvas = ensureOffscreenCanvas(personCanvasRef)
      const personCtx = personCanvas.getContext('2d')
      if (personCtx) {
        // Step 1: Draw the alpha mask on the person canvas
        personCtx.clearRect(0, 0, width, height)
        personCtx.drawImage(maskCanvas, 0, 0, width, height)

        // Step 2: Use 'source-in' to draw video only where mask is opaque (person area)
        personCtx.globalCompositeOperation = 'source-in'
        personCtx.save()
        personCtx.translate(width, 0)
        personCtx.scale(-1, 1)
        personCtx.drawImage(video, 0, 0, width, height)
        personCtx.restore()
        personCtx.globalCompositeOperation = 'source-over'

        // Step 3: On main canvas, draw background first
        ctx.clearRect(0, 0, width, height)
        drawBackground(ctx, width, height)

        // Step 4: Draw the person on top of the background
        ctx.drawImage(personCanvas, 0, 0, width, height)
      } else {
        // Fallback: just draw video
        ctx.clearRect(0, 0, width, height)
        drawBackground(ctx, width, height)
        ctx.save()
        ctx.translate(width, 0)
        ctx.scale(-1, 1)
        ctx.drawImage(video, 0, 0, width, height)
        ctx.restore()
      }
    } else {
      // No mask available yet - just draw video mirrored
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
  }, [segmentationReady, drawBackground, processMask, ensureOffscreenCanvas])

  // ── Start / stop render loop ─────────────────────────────────────
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

  // ── Handle video metadata loaded ─────────────────────────────────
  const handleVideoLoaded = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (video && canvas) {
      const vw = video.videoWidth || DEFAULT_VIDEO_WIDTH
      const vh = video.videoHeight || DEFAULT_VIDEO_HEIGHT
      canvas.width = vw
      canvas.height = vh
      canvasSizeRef.current = { w: vw, h: vh }
      // Reset offscreen canvases so they'll be recreated at the new size
      maskCanvasRef.current = null
      personCanvasRef.current = null
      setVideoReady(true)
    }
  }, [])

  // ── Start camera ─────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setError(null)
    setVideoReady(false)

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Camera is not supported in this environment.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream

        // Set canvas to default size immediately so we can start rendering
        if (canvasRef.current) {
          canvasRef.current.width = DEFAULT_VIDEO_WIDTH
          canvasRef.current.height = DEFAULT_VIDEO_HEIGHT
          canvasSizeRef.current = { w: DEFAULT_VIDEO_WIDTH, h: DEFAULT_VIDEO_HEIGHT }
        }

        try {
          await videoRef.current.play()
        } catch {
          // Some browsers need muted - try again
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
            message = 'Camera does not support the requested resolution. Try a different camera.'
            break
          default:
            message = `Camera error: ${err.message}`
        }
      }

      setError(message)
      setCameraActive(false)
    }
  }, [])

  // ── Stop camera ──────────────────────────────────────────────────
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

  // ── Cleanup on unmount ───────────────────────────────────────────
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

  // ── Toggle camera ────────────────────────────────────────────────
  const toggleCamera = useCallback(() => {
    if (cameraActive) {
      stopCamera()
    } else {
      startCamera()
    }
  }, [cameraActive, startCamera, stopCamera])

  // ── Handle custom background upload ──────────────────────────────
  const handleCustomBgUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, etc.)')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB')
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
    }
    reader.readAsDataURL(file)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // ── Remove custom background ─────────────────────────────────────
  const removeCustomBg = useCallback(
    (bgId: string) => {
      setCustomBackgrounds((prev) => prev.filter((b) => b.id !== bgId))
      if (selectedBg === bgId) {
        setSelectedBg('none')
      }
    },
    [selectedBg]
  )

  // ── Take photo ───────────────────────────────────────────────────
  const takePhoto = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !cameraActive) return

    setCapturing(true)

    try {
      const dataUrl = canvas.toDataURL('image/png')
      onCapture?.(dataUrl)
    } catch {
      // Canvas tainted or other error - try to capture from video directly
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
          onCapture?.(dataUrl)
        }
      } catch {
        // Final fallback - ignore
      }
    } finally {
      setTimeout(() => setCapturing(false), 300)
    }
  }, [cameraActive, onCapture])

  // ── Current background for UI ────────────────────────────────────
  const currentBg = allBackgrounds.find((b) => b.id === selectedBg)

  // ── Should we show canvas or raw video? ──────────────────────────
  // Show canvas when: camera is active AND (video is ready AND we have a canvas to render to)
  // Show raw video as fallback when canvas isn't rendering yet
  const showCanvas = cameraActive && videoReady

  // ── Render ───────────────────────────────────────────────────────
  return (
    <Card className="overflow-hidden border-stone-700 bg-stone-900 text-stone-100">
      <CardContent className="p-4 md:p-6 space-y-4">
        {/* ── Camera Preview Area ──────────────────────────────────── */}
        <div className="relative w-full aspect-video bg-stone-800 rounded-lg overflow-hidden border border-stone-700">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="size-14 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
                <CameraOff className="size-7 text-red-400" />
              </div>
              <p className="text-sm font-medium text-red-300">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 border-stone-600 text-stone-300 hover:bg-stone-700 hover:text-stone-100"
                onClick={() => {
                  setError(null)
                  startCamera()
                }}
              >
                Try Again
              </Button>
            </div>
          ) : !cameraActive ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="size-16 rounded-full bg-stone-700/50 flex items-center justify-center mb-4">
                <Camera className="size-8 text-stone-400" />
              </div>
              <p className="text-sm text-stone-400 font-medium">Camera is off</p>
              <p className="text-xs text-stone-500 mt-1">Click the button below to start</p>
            </div>
          ) : (
            <>
              {/* Video element - visible as primary display until canvas takes over */}
              <video
                ref={videoRef}
                onLoadedMetadata={handleVideoLoaded}
                className={`absolute inset-0 w-full h-full object-cover ${showCanvas ? 'hidden' : ''}`}
                playsInline
                muted
                style={{ transform: 'scaleX(-1)' }}
              />
              {/* Canvas for rendering the composited output */}
              <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full object-cover ${showCanvas ? '' : 'hidden'}`}
              />

              {/* Status indicators */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                {/* Model loading indicator */}
                {modelLoading && (
                  <div className="flex items-center gap-2 bg-stone-900/80 backdrop-blur-sm rounded-lg px-3 py-1.5">
                    <Loader2 className="size-3 text-amber-400 animate-spin" />
                    <span className="text-xs text-amber-300">Loading AI model...</span>
                  </div>
                )}
                {/* Segmentation ready indicator */}
                {segmentationReady && !modelLoading && (
                  <div className="flex items-center gap-2 bg-stone-900/80 backdrop-blur-sm rounded-lg px-3 py-1.5">
                    <div className="size-2.5 rounded-full bg-emerald-400" />
                    <span className="text-xs text-emerald-300">AI background removal active</span>
                  </div>
                )}
                {/* Segmentation failed indicator */}
                {segmentationError && !modelLoading && (
                  <div className="flex items-center gap-2 bg-stone-900/80 backdrop-blur-sm rounded-lg px-3 py-1.5">
                    <AlertCircle className="size-3 text-stone-400" />
                    <span className="text-xs text-stone-400">No AI bg removal</span>
                  </div>
                )}
              </div>

              {/* Current background indicator */}
              {currentBg && currentBg.type !== 'none' && (
                <div className="absolute top-3 right-3 flex items-center gap-2 bg-stone-900/80 backdrop-blur-sm rounded-lg px-3 py-1.5 z-10">
                  <Sparkles className="size-3 text-teal-400" />
                  <span className="text-xs text-teal-300">{currentBg.label}</span>
                </div>
              )}

              {/* Capture flash effect */}
              {capturing && (
                <div className="absolute inset-0 bg-white/80 animate-pulse pointer-events-none z-20" />
              )}
            </>
          )}
        </div>

        {/* ── Background Selector ─────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-stone-400 uppercase tracking-wider">
              <Palette className="size-3.5" />
              <span>Virtual Background</span>
            </div>
            {/* Upload button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800"
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

          {/* Built-in backgrounds grid */}
          <div className="grid grid-cols-6 sm:grid-cols-7 md:grid-cols-10 gap-1.5">
            {allBackgrounds.map((bg) => {
              const isActive = selectedBg === bg.id
              const isCustom = bg.type === 'custom'
              return (
                <div key={bg.id} className="relative group">
                  <button
                    onClick={() => setSelectedBg(bg.id)}
                    className={`
                      relative flex flex-col items-center gap-1 rounded-md p-1.5 w-full
                      transition-all duration-150 cursor-pointer
                      ${
                        isActive
                          ? 'ring-2 ring-teal-500 ring-offset-1 ring-offset-stone-900 bg-stone-800'
                          : 'hover:bg-stone-800/60 bg-transparent'
                      }
                    `}
                    title={bg.label}
                    aria-label={`Select ${bg.label} background`}
                    aria-pressed={isActive}
                  >
                    <div
                      className={`
                        size-8 rounded-md overflow-hidden flex items-center justify-center
                        border border-stone-600/50 relative
                        ${bg.preview}
                      `}
                    >
                      {bg.type === 'none' && <CameraOff className="size-3.5 text-stone-300" />}
                      {bg.type === 'blur' && <Sparkles className="size-3.5 text-stone-200" />}
                      {(bg.type === 'image' || bg.type === 'custom') && !isCustom && (
                        <ImageIcon className="size-3.5 text-stone-200" />
                      )}
                      {/* Show thumbnail for custom backgrounds */}
                      {isCustom && bg.value && (
                        <img
                          src={bg.value}
                          alt=""
                          className="absolute inset-0.5 size-7 object-cover rounded"
                        />
                      )}
                    </div>
                    <span className="text-[9px] leading-tight text-stone-500 group-hover:text-stone-300 truncate w-full text-center">
                      {bg.label}
                    </span>
                  </button>
                  {/* Remove button for custom backgrounds */}
                  {isCustom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeCustomBg(bg.id)
                      }}
                      className="absolute -top-1 -right-1 size-4 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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

        {/* ── Controls ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-700/50">
          <div className="flex items-center gap-2">
            <Button
              variant={cameraActive ? 'destructive' : 'default'}
              size="sm"
              onClick={toggleCamera}
              className={`gap-2 ${
                cameraActive
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-teal-700 hover:bg-teal-800 text-white'
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
          </div>

          <Button
            size="sm"
            onClick={takePhoto}
            disabled={!cameraActive || capturing}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40"
          >
            <Aperture className="size-4" />
            {capturing ? 'Capturing...' : 'Take Photo'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
