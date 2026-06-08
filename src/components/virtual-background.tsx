'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, CameraOff, ImageIcon, Palette, Sparkles, Aperture } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// ── Background option types ─────────────────────────────────────────
type BackgroundType = 'none' | 'blur' | 'color' | 'gradient' | 'image'

interface BackgroundOption {
  id: string
  type: BackgroundType
  label: string
  /** CSS class or value for the background */
  value: string
  /** Thumbnail preview style — tailwind bg class or CSS gradient */
  preview: string
}

// ── Available backgrounds ───────────────────────────────────────────
const BACKGROUNDS: BackgroundOption[] = [
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
  // Image placeholders
  { id: 'img-1', type: 'image', label: 'Background 1', value: '/backgrounds/bg-1.jpg', preview: 'bg-stone-500' },
  { id: 'img-2', type: 'image', label: 'Background 2', value: '/backgrounds/bg-2.jpg', preview: 'bg-stone-400' },
  { id: 'img-3', type: 'image', label: 'Background 3', value: '/backgrounds/bg-3.jpg', preview: 'bg-stone-600' },
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

  // ── Refs ──────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const bgImageRef = useRef<HTMLImageElement | null>(null)
  const animFrameRef = useRef<number>(0)

  // ── Load background image when an image-type bg is selected ──────
  useEffect(() => {
    const bg = BACKGROUNDS.find((b) => b.id === selectedBg)
    if (bg?.type === 'image') {
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
  }, [selectedBg])

  // ── Canvas rendering loop ────────────────────────────────────────
  const renderLoop = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    const bg = BACKGROUNDS.find((b) => b.id === selectedBg)

    // Draw background layer
    if (bg?.type === 'blur') {
      // For blur, draw the video first (will be blurred via CSS on the video element)
      // but for canvas capture we apply a simple box-blur approximation
      ctx.filter = 'blur(12px)'
      ctx.drawImage(video, 0, 0, width, height)
      ctx.filter = 'none'
    } else if (bg?.type === 'color') {
      ctx.fillStyle = bg.value
      ctx.fillRect(0, 0, width, height)
    } else if (bg?.type === 'gradient') {
      // Create gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height)
      // Parse gradient stops from the CSS value
      const stops = bg.value.match(/(#[0-9a-fA-F]{6})\s+(\d+)%/g)
      if (stops) {
        stops.forEach((stop) => {
          const [color, percent] = stop.split(/\s+/)
          ctx.fillStyle = color
          gradient.addColorStop(parseInt(percent) / 100, color)
        })
      }
      // Fallback: use first and last colors
      const colors = bg.value.match(/#[0-9a-fA-F]{6}/g)
      if (colors && colors.length >= 2) {
        const g = ctx.createLinearGradient(0, 0, width, height)
        const step = 1 / (colors.length - 1)
        colors.forEach((c, i) => {
          g.addColorStop(Math.min(i * step, 1), c)
        })
        ctx.fillStyle = g
      } else {
        ctx.fillStyle = '#44403c'
      }
      ctx.fillRect(0, 0, width, height)
    } else if (bg?.type === 'image' && bgImageRef.current) {
      ctx.drawImage(bgImageRef.current, 0, 0, width, height)
    }
    // 'none' type: no background layer needed

    // Draw the video on top
    if (bg?.type === 'blur') {
      // For blur mode, the background is already the blurred video
      // We skip drawing the video again to avoid double-drawing
    } else {
      // For all other modes, draw the full video frame
      // Since we don't have ML segmentation, we draw the video as the main content
      ctx.drawImage(video, 0, 0, width, height)
    }

    animFrameRef.current = requestAnimationFrame(renderLoop)
  }, [selectedBg])

  // ── Start / stop render loop ─────────────────────────────────────
  useEffect(() => {
    if (cameraActive && videoRef.current && canvasRef.current) {
      animFrameRef.current = requestAnimationFrame(renderLoop)
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [cameraActive, renderLoop])

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

  // ── Take photo ───────────────────────────────────────────────────
  const takePhoto = useCallback(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    setCapturing(true)

    // If camera is not active, just capture nothing meaningful
    if (!cameraActive) {
      setCapturing(false)
      return
    }

    try {
      // Make sure canvas is the right size
      const w = video.videoWidth || 640
      const h = video.videoHeight || 480
      canvas.width = w
      canvas.height = h

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const bg = BACKGROUNDS.find((b) => b.id === selectedBg)

      // Draw background
      if (bg?.type === 'blur') {
        ctx.filter = 'blur(12px)'
        ctx.drawImage(video, 0, 0, w, h)
        ctx.filter = 'none'
      } else if (bg?.type === 'color') {
        ctx.fillStyle = bg.value
        ctx.fillRect(0, 0, w, h)
      } else if (bg?.type === 'gradient') {
        const colors = bg.value.match(/#[0-9a-fA-F]{6}/g)
        if (colors && colors.length >= 2) {
          const g = ctx.createLinearGradient(0, 0, w, h)
          const step = 1 / (colors.length - 1)
          colors.forEach((c, i) => {
            g.addColorStop(Math.min(i * step, 1), c)
          })
          ctx.fillStyle = g
        } else {
          ctx.fillStyle = '#44403c'
        }
        ctx.fillRect(0, 0, w, h)
      } else if (bg?.type === 'image' && bgImageRef.current) {
        ctx.drawImage(bgImageRef.current, 0, 0, w, h)
      }

      // Draw video on top (unless blur — blur already has the video)
      if (bg?.type !== 'blur') {
        ctx.drawImage(video, 0, 0, w, h)
      }

      // Capture the composite
      const dataUrl = canvas.toDataURL('image/png')
      onCapture?.(dataUrl)
    } catch {
      // Canvas tainted or other error — silently ignore
    } finally {
      setTimeout(() => setCapturing(false), 300)
    }
  }, [cameraActive, selectedBg, onCapture])

  // ── Current background for live preview styling ──────────────────
  const currentBg = BACKGROUNDS.find((b) => b.id === selectedBg)
  const isBlurMode = currentBg?.type === 'blur'

  // ── Render ───────────────────────────────────────────────────────
  return (
    <Card className="overflow-hidden border-stone-700 bg-stone-900 text-stone-100">
      <CardContent className="p-4 md:p-6 space-y-4">
        {/* ── Camera Preview Area ──────────────────────────────────── */}
        <div className="relative w-full aspect-video bg-stone-800 rounded-lg overflow-hidden border border-stone-700">
          {error ? (
            // ── Error State ────────────────────────────────────────
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
            // ── Inactive State ─────────────────────────────────────
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="size-16 rounded-full bg-stone-700/50 flex items-center justify-center mb-4">
                <Camera className="size-8 text-stone-400" />
              </div>
              <p className="text-sm text-stone-400 font-medium">Camera is off</p>
              <p className="text-xs text-stone-500 mt-1">Click the button below to start</p>
            </div>
          ) : (
            // ── Live Preview ───────────────────────────────────────
            <>
              {/* Background layer (visible behind video) */}
              {currentBg?.type === 'color' && (
                <div
                  className="absolute inset-0"
                  style={{ backgroundColor: currentBg.value }}
                />
              )}
              {currentBg?.type === 'gradient' && (
                <div
                  className="absolute inset-0"
                  style={{ background: currentBg.value }}
                />
              )}
              {currentBg?.type === 'image' && (
                <img
                  src={currentBg.value}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              )}

              {/* Video element — visible unless blur-only mode */}
              <video
                ref={videoRef}
                onLoadedMetadata={handleVideoLoaded}
                className={`absolute inset-0 w-full h-full object-cover ${
                  isBlurMode ? 'opacity-0' : ''
                }`}
                playsInline
                muted
              />

              {/* Canvas for blur mode rendering */}
              {isBlurMode && (
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {/* Capture flash effect */}
              {capturing && (
                <div className="absolute inset-0 bg-white/80 animate-pulse pointer-events-none" />
              )}
            </>
          )}

          {/* Hidden canvas for non-blur capture (always present) */}
          {!isBlurMode && (
            <canvas ref={canvasRef} className="hidden" />
          )}
        </div>

        {/* ── Background Selector ─────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-stone-400 uppercase tracking-wider">
            <Palette className="size-3.5" />
            <span>Virtual Background</span>
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-7 md:grid-cols-13 gap-1.5">
            {BACKGROUNDS.map((bg) => {
              const isActive = selectedBg === bg.id
              return (
                <button
                  key={bg.id}
                  onClick={() => setSelectedBg(bg.id)}
                  className={`
                    relative group flex flex-col items-center gap-1 rounded-md p-1.5
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
                      ${bg.type === 'blur' ? 'relative' : ''}
                    `}
                  >
                    {bg.type === 'none' && (
                      <CameraOff className="size-3.5 text-stone-300" />
                    )}
                    {bg.type === 'blur' && (
                      <Sparkles className="size-3.5 text-stone-200" />
                    )}
                    {bg.type === 'image' && (
                      <ImageIcon className="size-3.5 text-stone-200" />
                    )}
                  </div>
                  <span className="text-[9px] leading-tight text-stone-500 group-hover:text-stone-300 truncate w-full text-center">
                    {bg.label}
                  </span>
                </button>
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
            className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white disabled:opacity-40"
          >
            <Aperture className="size-4" />
            {capturing ? 'Capturing...' : 'Take Photo'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
