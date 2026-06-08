'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, CameraOff, ImageIcon, Palette, Sparkles, Aperture, Upload, X } from 'lucide-react'
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

export default function VirtualBackground({ onCapture }: VirtualBackgroundProps) {
  // ── State ─────────────────────────────────────────────────────────
  const [cameraActive, setCameraActive] = useState(false)
  const [selectedBg, setSelectedBg] = useState<string>('none')
  const [error, setError] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [customBackgrounds, setCustomBackgrounds] = useState<BackgroundOption[]>([])
  const [modelLoading, setModelLoading] = useState(false)
  const [segmentationReady, setSegmentationReady] = useState(false)

  // ── Refs ──────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const bgImageRef = useRef<HTMLImageElement | null>(null)
  const animFrameRef = useRef<number>(0)
  const segmentationRef = useRef<any>(null)
  const latestResultsRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // All backgrounds (built-in + custom)
  const allBackgrounds = [...BUILT_IN_BACKGROUNDS, ...customBackgrounds]

  // ── Initialize MediaPipe Selfie Segmentation ──────────────────────
  useEffect(() => {
    let mounted = true

    async function initSegmentation() {
      try {
        setModelLoading(true)
        // Dynamic import to avoid SSR issues
        const { SelfieSegmentation } = await import('@mediapipe/selfie_segmentation')

        if (!mounted) return

        const segmentation = new SelfieSegmentation({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
          },
        })

        segmentation.setOptions({
          modelSelection: 1, // 1 = general model (better quality), 0 = landscape model
          selfieMode: true,
        })

        segmentation.onResults((results: any) => {
          latestResultsRef.current = results
        })

        segmentationRef.current = segmentation

        // Initialize the model by sending a blank frame
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = 1
        tempCanvas.height = 1
        await segmentation.send({ image: tempCanvas })

        if (mounted) {
          setSegmentationReady(true)
          setModelLoading(false)
        }
      } catch (err) {
        console.error('Failed to initialize selfie segmentation:', err)
        if (mounted) {
          setModelLoading(false)
          // Fall back to non-segmented mode
          setSegmentationReady(false)
        }
      }
    }

    initSegmentation()

    return () => {
      mounted = false
      if (segmentationRef.current) {
        segmentationRef.current.close()
        segmentationRef.current = null
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
  }, [selectedBg, customBackgrounds])

  // ── Canvas rendering with segmentation ────────────────────────────
  const renderFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const bg = allBackgrounds.find((b) => b.id === selectedBg)

    // If we have segmentation results, use them for proper virtual background
    const results = latestResultsRef.current
    if (results && segmentationReady && bg && bg.type !== 'none') {
      // Clear canvas
      ctx.clearRect(0, 0, width, height)

      // Save context state
      ctx.save()

      // Step 1: Draw the segmentation mask (person mask)
      // The mask is a grayscale image where white = person, black = background
      ctx.drawImage(results.segmentationMask, 0, 0, width, height)

      // Step 2: Use 'source-in' to draw ONLY the person from the original image
      // This keeps only pixels where the mask is white (person area)
      ctx.globalCompositeOperation = 'source-in'
      ctx.drawImage(results.image, 0, 0, width, height)

      // Step 3: Draw the background BEHIND the person
      ctx.globalCompositeOperation = 'destination-over'

      if (bg.type === 'blur') {
        // Draw blurred video as background
        ctx.filter = 'blur(12px)'
        ctx.drawImage(results.image, 0, 0, width, height)
        ctx.filter = 'none'
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
        ctx.drawImage(bgImageRef.current, 0, 0, width, height)
      }

      // Restore context
      ctx.restore()
    } else {
      // No segmentation or no background selected - just draw the video
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(video, 0, 0, width, height)
    }

    animFrameRef.current = requestAnimationFrame(renderFrame)
  }, [selectedBg, segmentationReady, allBackgrounds])

  // ── Process video frames through segmentation ────────────────────
  useEffect(() => {
    if (!cameraActive || !videoRef.current || !segmentationRef.current) return

    let processing = false
    let cancelled = false

    async function processFrame() {
      if (cancelled) return
      const video = videoRef.current
      const segmentation = segmentationRef.current

      if (video && segmentation && video.readyState >= 2 && !processing) {
        processing = true
        try {
          await segmentation.send({ image: video })
        } catch {
          // Ignore segmentation errors (can happen during camera stop)
        }
        processing = false
      }

      if (!cancelled && cameraActive) {
        requestAnimationFrame(processFrame)
      }
    }

    processFrame()

    return () => {
      cancelled = true
    }
  }, [cameraActive, segmentationReady])

  // ── Start / stop render loop ─────────────────────────────────────
  useEffect(() => {
    if (cameraActive && videoRef.current && canvasRef.current) {
      animFrameRef.current = requestAnimationFrame(renderFrame)
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [cameraActive, renderFrame])

  // ── Set canvas dimensions when video metadata loads ──────────────
  const handleVideoLoaded = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (video && canvas) {
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
    }
  }, [])

  // ── Start camera ─────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraActive(true)
    } catch (err) {
      const message = err instanceof DOMException
        ? err.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera permissions and try again.'
          : err.name === 'NotFoundError'
            ? 'No camera found. Please connect a camera and try again.'
            : err.name === 'NotReadableError'
              ? 'Camera is already in use by another application.'
              : `Camera error: ${err.message}`
        : 'An unexpected error occurred while accessing the camera.'
      setError(message)
      setCameraActive(false)
    }
  }, [])

  // ── Stop camera ──────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    latestResultsRef.current = null
    setCameraActive(false)
  }, [])

  // ── Cleanup on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, etc.)')
      return
    }

    // Validate file size (max 10MB)
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
  const removeCustomBg = useCallback((bgId: string) => {
    setCustomBackgrounds((prev) => prev.filter((b) => b.id !== bgId))
    if (selectedBg === bgId) {
      setSelectedBg('none')
    }
  }, [selectedBg])

  // ── Take photo ───────────────────────────────────────────────────
  const takePhoto = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !cameraActive) return

    setCapturing(true)

    try {
      // The canvas already has the composited image (person + background)
      // Just capture it directly
      const dataUrl = canvas.toDataURL('image/png')
      onCapture?.(dataUrl)
    } catch {
      // Canvas tainted or other error
    } finally {
      setTimeout(() => setCapturing(false), 300)
    }
  }, [cameraActive, onCapture])

  // ── Current background for UI ────────────────────────────────────
  const currentBg = allBackgrounds.find((b) => b.id === selectedBg)

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
                onClick={() => { setError(null); startCamera() }}
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
              {/* Hidden video element - we render via canvas */}
              <video
                ref={videoRef}
                onLoadedMetadata={handleVideoLoaded}
                className="hidden"
                playsInline
                muted
              />
              {/* Canvas for rendering the composited output */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Model loading indicator */}
              {modelLoading && (
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-stone-900/80 rounded-lg px-3 py-1.5">
                  <div className="size-3 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs text-amber-300">Loading AI model...</span>
                </div>
              )}
              {/* Segmentation status */}
              {cameraActive && !segmentationReady && !modelLoading && (
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-stone-900/80 rounded-lg px-3 py-1.5">
                  <div className="size-3 rounded-full bg-stone-500" />
                  <span className="text-xs text-stone-400">No AI segmentation</span>
                </div>
              )}
              {/* Capture flash effect */}
              {capturing && (
                <div className="absolute inset-0 bg-white/80 animate-pulse pointer-events-none" />
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
                      ${isActive
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
                        border border-stone-600/50
                        ${bg.preview}
                      `}
                    >
                      {bg.type === 'none' && (
                        <CameraOff className="size-3.5 text-stone-300" />
                      )}
                      {bg.type === 'blur' && (
                        <Sparkles className="size-3.5 text-stone-200" />
                      )}
                      {(bg.type === 'image' || bg.type === 'custom') && !isCustom && (
                        <ImageIcon className="size-3.5 text-stone-200" />
                      )}
                      {/* Show thumbnail for custom backgrounds */}
                      {isCustom && bg.value && (
                        <img src={bg.value} alt="" className="absolute inset-0.5 size-7 object-cover rounded" />
                      )}
                    </div>
                    <span className="text-[9px] leading-tight text-stone-500 group-hover:text-stone-300 truncate w-full text-center">
                      {bg.label}
                    </span>
                  </button>
                  {/* Remove button for custom backgrounds */}
                  {isCustom && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeCustomBg(bg.id) }}
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
