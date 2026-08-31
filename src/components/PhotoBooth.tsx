import { useState, useRef, useEffect, useCallback } from 'react'

type OverlayPreset = 'none' | 'frame' | 'story' | 'polaroid' | 'heart' | 'confetti' | 'text'

interface FilterParams {
  brightness: number // 0-200, default 100
  contrast: number // 0-200, default 100
  saturation: number // 0-200, default 100
  warmth: number // -100-100, 0 = neutral
  tint: number // -100-100, 0 = neutral
  vignette: number // 0-100, 0 = none
  grain: number // 0-50, 0 = none
}

const FILTER_PRESETS: { id: string; name: string; emoji: string; params: FilterParams }[] = [
  {
    id: 'clarendon',
    name: 'Clarendon',
    emoji: '💎',
    params: { brightness: 115, contrast: 140, saturation: 130, warmth: -10, tint: 0, vignette: 10, grain: 0 },
  },
  {
    id: 'gingham',
    name: 'Gingham',
    emoji: '📏',
    params: { brightness: 88, contrast: 75, saturation: 70, warmth: 15, tint: 5, vignette: 20, grain: 8 },
  },
  {
    id: 'moon',
    name: 'Moon',
    emoji: '🌙',
    params: { brightness: 90, contrast: 180, saturation: 0, warmth: -10, tint: -5, vignette: 25, grain: 3 },
  },
  {
    id: 'lark',
    name: 'Lark',
    emoji: '🐦',
    params: { brightness: 108, contrast: 88, saturation: 85, warmth: 8, tint: 0, vignette: 12, grain: 3 },
  },
  {
    id: 'reyes',
    name: 'Reyes',
    emoji: '🎞️',
    params: { brightness: 85, contrast: 70, saturation: 65, warmth: 18, tint: 8, vignette: 30, grain: 10 },
  },
  {
    id: 'juno',
    name: 'Juno',
    emoji: '☀️',
    params: { brightness: 118, contrast: 110, saturation: 145, warmth: 25, tint: 10, vignette: 8, grain: 0 },
  },
  {
    id: 'slumber',
    name: 'Slumber',
    emoji: '😴',
    params: { brightness: 82, contrast: 85, saturation: 55, warmth: -20, tint: -12, vignette: 35, grain: 12 },
  },
  {
    id: 'crema',
    name: 'Crema',
    emoji: '🧀',
    params: { brightness: 105, contrast: 88, saturation: 82, warmth: 30, tint: 15, vignette: 12, grain: 8 },
  },
  {
    id: 'none',
    name: 'Tanpa',
    emoji: '⛔',
    params: { brightness: 100, contrast: 100, saturation: 100, warmth: 0, tint: 0, vignette: 0, grain: 0 },
  },
]

const OVERLAYS: { id: OverlayPreset; label: string; icon: string }[] = [
  { id: 'none', label: 'Tanpa', icon: '⛔' },
  { id: 'frame', label: 'Frame', icon: '🖼️' },
  { id: 'story', label: 'Story', icon: '✨' },
  { id: 'polaroid', label: 'Polaroid', icon: '📷' },
  { id: 'heart', label: 'Love', icon: '❤️' },
  { id: 'confetti', label: 'Confetti', icon: '🎉' },
  { id: 'text', label: 'Badge', icon: '📸' },
]

export default function PhotoBooth() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number>(0)

  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [demoPreview, setDemoPreview] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [selectedOverlay, setSelectedOverlay] = useState<OverlayPreset>('none')
  const [selectedFilter, setSelectedFilter] = useState<string>('none')
  const [customParams, setCustomParams] = useState<FilterParams>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    warmth: 0,
    tint: 0,
    vignette: 0,
    grain: 0,
  })

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraReady(true)
        setCameraError(null)
      }
    } catch (err) {
      setCameraError('Gagal akses kamera. Cek izin browser atau pakai perangkat lain.')
      setCameraReady(false)
    }
  }, [])

  useEffect(() => {
    startCamera()
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      cancelAnimationFrame(animationRef.current)
    }
  }, [startCamera])

  const applyFilterToImageData = (
    imageData: ImageData,
    params: FilterParams,
  ): ImageData => {
    const { data } = imageData
    const len = data.length
    const brightness = params.brightness / 100
    const contrast = (params.contrast - 100) / 100 // -1 to 1
    const saturation = (params.saturation - 100) / 100 // -1 to 1
    const warmth = params.warmth / 100 // -1 to 1
    const tint = params.tint / 100 // -1 to 1

    for (let i = 0; i < len; i += 4) {
      let r = data[i]
      let g = data[i + 1]
      let b = data[i + 2]

      // Brightness
      r *= brightness
      g *= brightness
      b *= brightness

      // Contrast: apply around midpoint 128
      const mid = 128
      r = (r - mid) * (1 + contrast) + mid
      g = (g - mid) * (1 + contrast) + mid
      b = (b - mid) * (1 + contrast) + mid

      // Saturation: convert to HSL-like, adjust luminance
      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      r = gray + (r - gray) * (1 + saturation)
      g = gray + (g - gray) * (1 + saturation)
      b = gray + (b - gray) * (1 + saturation)

      // Warmth: add red, subtract blue
      r += warmth * 20
      b -= warmth * 15

      // Tint: green shift (magenta-green axis)
      g += tint * 15
      r -= tint * 5
      b -= tint * 5

      // Grain (applied after, per-pixel noise added later)
      // Clamp
      data[i] = Math.max(0, Math.min(255, Math.round(r)))
      data[i + 1] = Math.max(0, Math.min(255, Math.round(g)))
      data[i + 2] = Math.max(0, Math.min(255, Math.round(b)))
    }

    // Grain
    if (params.grain > 0) {
      const grainAmount = params.grain / 50
      for (let i = 4; i < len; i += 4) {
        const noise = (Math.random() - 0.5) * grainAmount * 40
        data[i] = Math.max(0, Math.min(255, data[i] + noise))
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise))
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise))
      }
    }

    return imageData
  }

  const applyVignette = (ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) => {
    if (amount === 0) return
    const gradient = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.8)
    gradient.addColorStop(0, 'rgba(0,0,0,0)')
    gradient.addColorStop(1, `rgba(0,0,0,${amount / 100 * 0.7})`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)
  }

  const processImage = (srcCanvas: HTMLCanvasElement, params: FilterParams): HTMLCanvasElement => {
    const w = srcCanvas.width
    const h = srcCanvas.height
    const resultCanvas = document.createElement('canvas')
    resultCanvas.width = w
    resultCanvas.height = h
    const ctx = resultCanvas.getContext('2d')
    if (!ctx) return srcCanvas

    ctx.drawImage(srcCanvas, 0, 0)
    const imageData = ctx.getImageData(0, 0, w, h)
    console.log('[processImage] input imageData length =', imageData?.data?.length || 'null')
    const filtered = applyFilterToImageData(imageData, params)
    console.log('[processImage] after filter, first pixel RGBA =', filtered.data[0], filtered.data[1], filtered.data[2], filtered.data[3])
    ctx.putImageData(filtered, 0, 0)

    if (params.vignette > 0) {
      applyVignette(ctx, w, h, params.vignette)
    }

    return resultCanvas
  }

  const drawOverlayOnCanvas = (canvas: HTMLCanvasElement, overlay: OverlayPreset, width: number, height: number) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (overlay === 'none') return

    const roundedRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + w - r, y)
      ctx.quadraticCurveTo(x + w, y, x + w, y + r)
      ctx.lineTo(x + w, y + h - r)
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
      ctx.lineTo(x + r, y + h)
      ctx.quadraticCurveTo(x, y + h, x, y + h - r)
      ctx.lineTo(x, y + r)
      ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.closePath()
    }

    if (overlay === 'frame') {
      const inset = Math.min(width, height) * 0.045
      const glow = ctx.createLinearGradient(0, 0, width, height)
      glow.addColorStop(0, 'rgba(255,255,255,0.16)')
      glow.addColorStop(0.5, 'rgba(255,255,255,0.04)')
      glow.addColorStop(1, 'rgba(255,255,255,0.12)')

      ctx.save()
      roundedRect(inset, inset, width - inset * 2, height - inset * 2, Math.min(width, height) * 0.06)
      ctx.fillStyle = glow
      ctx.fill()

      ctx.lineWidth = Math.min(width, height) * 0.012
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.stroke()

      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(255,121,153,0.9)'
      roundedRect(inset + 10, inset + 10, width - inset * 2 - 20, height - inset * 2 - 20, Math.min(width, height) * 0.05)
      ctx.stroke()

      const cornerSize = Math.min(width, height) * 0.08
      const corners = [
        [inset, inset, 1, 1],
        [width - inset, inset, -1, 1],
        [inset, height - inset, 1, -1],
        [width - inset, height - inset, -1, -1],
      ]

      ctx.lineWidth = 4
      ctx.strokeStyle = '#ffbf69'
      ctx.lineCap = 'round'
      for (const [cx, cy, dx, dy] of corners) {
        ctx.beginPath()
        ctx.moveTo(cx + dx * cornerSize, cy)
        ctx.lineTo(cx, cy)
        ctx.lineTo(cx, cy + dy * cornerSize)
        ctx.stroke()
      }
      ctx.restore()
    }

    if (overlay === 'heart') {
      const heartSize = Math.min(width, height) * 0.26
      const heartX = width / 2
      const heartY = height / 2 + heartSize * 0.05

      ctx.save()
      ctx.shadowColor = 'rgba(255, 88, 120, 0.8)'
      ctx.shadowBlur = heartSize * 0.5
      ctx.fillStyle = 'rgba(255, 88, 120, 0.72)'
      ctx.beginPath()
      ctx.moveTo(heartX, heartY + heartSize * 0.28)
      ctx.bezierCurveTo(
        heartX - heartSize * 0.62, heartY - heartSize * 0.1,
        heartX - heartSize * 0.95, heartY - heartSize * 0.55,
        heartX, heartY - heartSize * 0.75,
      )
      ctx.bezierCurveTo(
        heartX + heartSize * 0.95, heartY - heartSize * 0.55,
        heartX + heartSize * 0.62, heartY - heartSize * 0.1,
        heartX, heartY + heartSize * 0.28,
      )
      ctx.fill()
      ctx.restore()

      ctx.save()
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      ctx.beginPath()
      ctx.ellipse(heartX - heartSize * 0.18, heartY - heartSize * 0.25, heartSize * 0.1, heartSize * 0.08, -0.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    if (overlay === 'confetti') {
      const particles = 48
      const colors = ['#ff6b6b', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#01a3a4', '#feca57', '#ffeaa7']
      const now = Date.now() * 0.001
      for (let i = 0; i < particles; i++) {
        const seed = i * 137.508
        const x = (Math.sin(seed + now * 0.5) * 0.5 + 0.5) * width
        const y = (Math.cos(seed * 1.5 + now * 0.4) * 0.5 + 0.5) * height
        const size = (Math.sin(seed * 0.7 + now) * 0.5 + 0.5) * 10 + 5
        const color = colors[i % colors.length]
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(seed + now)
        ctx.fillStyle = color
        ctx.globalAlpha = 0.9
        ctx.fillRect(-size * 0.4, -size * 0.12, size * 0.8, size * 0.24)
        ctx.fillRect(-size * 0.12, -size * 0.4, size * 0.24, size * 0.8)
        ctx.restore()
      }
    }

    if (overlay === 'story') {
      ctx.save()
      const barH = Math.max(28, height * 0.06)
      const x = width * 0.06
      const y = height * 0.06
      const w = width * 0.88
      const h = height * 0.88

      ctx.fillStyle = 'rgba(15, 23, 42, 0.18)'
      roundedRect(x, y, w, h, 28)
      ctx.fill()

      ctx.fillStyle = 'rgba(255,255,255,0.22)'
      roundedRect(x + 18, y + 18, w - 36, barH, 18)
      ctx.fill()

      ctx.beginPath()
      ctx.arc(width * 0.8, height * 0.14, Math.min(width, height) * 0.04, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.fill()

      ctx.font = `700 ${Math.min(width, height) * 0.03}px sans-serif`
      ctx.textAlign = 'left'
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.fillText('story mode', x + 28, y + barH / 2 + 10)

      ctx.restore()
    }

    if (overlay === 'polaroid') {
      ctx.save()
      const frameX = width * 0.12
      const frameY = height * 0.12
      const frameW = width * 0.76
      const frameH = height * 0.66

      ctx.fillStyle = '#f6efe6'
      roundedRect(frameX, frameY, frameW, frameH, 24)
      ctx.fill()

      ctx.strokeStyle = '#f5d7a7'
      ctx.lineWidth = 8
      roundedRect(frameX + 12, frameY + 12, frameW - 24, frameH - 24, 20)
      ctx.stroke()

      ctx.fillStyle = 'rgba(15,23,42,0.72)'
      roundedRect(frameX + 20, frameY + frameH - 82, frameW - 40, 52, 14)
      ctx.fill()

      ctx.font = `700 ${Math.min(width, height) * 0.028}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillStyle = '#1f2937'
      ctx.fillText('moment', width / 2, frameY + frameH - 50)
      ctx.restore()
    }

    if (overlay === 'text') {
      ctx.save()
      const label = 'PHOTO BOOTH'
      const badgeY = height * 0.82
      ctx.fillStyle = 'rgba(17,24,39,0.5)'
      roundedRect(width * 0.16, badgeY - 28, width * 0.68, 52, 20)
      ctx.fill()

      ctx.font = `700 ${Math.min(width, height) * 0.04}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(label, width / 2, badgeY)

      ctx.font = `600 ${Math.min(width, height) * 0.025}px sans-serif`
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.fillText('magic moments', width / 2, badgeY + 22)

      ctx.restore()
    }
  }

  const getCurrentFilterParams = (): FilterParams => {
    if (selectedFilter === 'none') {
      return { ...customParams }
    }
    const preset = FILTER_PRESETS.find((p) => p.id === selectedFilter)
    if (preset) {
      return { ...preset.params }
    }
    return { ...customParams }
  }

  const getLivePreviewFilter = () => {
    const params = getCurrentFilterParams()
    const warmth = params.warmth / 100
    const tint = params.tint / 100
    const sepia = Math.min(0.9, Math.max(0, (warmth + 0.4) * 0.7 + Math.max(0, tint) * 0.5))
    const hueRotate = tint * 180
    const brightness = params.brightness
    const contrast = params.contrast
    const saturation = params.saturation
    return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) sepia(${sepia}) hue-rotate(${hueRotate}deg)`
  }

  // Draw overlay preview only; keep it visible even when the camera is unavailable.
  useEffect(() => {
    const overlayCanvas = overlayCanvasRef.current
    if (!overlayCanvas) return

    const drawFallbackOverlay = () => {
      const width = 1280
      const height = 960
      overlayCanvas.width = width
      overlayCanvas.height = height

      const ctx = overlayCanvas.getContext('2d')
      if (!ctx) return

      const gradient = ctx.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, '#0f172a')
      gradient.addColorStop(0.5, '#1f2937')
      gradient.addColorStop(1, '#111827')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
      ctx.font = '700 52px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Camera unavailable', width / 2, height / 2 - 18)
      ctx.font = '500 24px sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.fillText('Allow camera access to use live preview', width / 2, height / 2 + 26)

      drawOverlayOnCanvas(overlayCanvas, selectedOverlay, width, height)
    }

    const video = videoRef.current
    if (!video) {
      drawFallbackOverlay()
      return
    }

    const update = () => {
      if (!video.videoWidth || !video.videoHeight) {
        drawFallbackOverlay()
        animationRef.current = requestAnimationFrame(update)
        return
      }

      const w = video.videoWidth
      const h = video.videoHeight
      overlayCanvas.width = w
      overlayCanvas.height = h

      const ctx = overlayCanvas.getContext('2d')
      if (!ctx) {
        animationRef.current = requestAnimationFrame(update)
        return
      }

      ctx.clearRect(0, 0, w, h)
      drawOverlayOnCanvas(overlayCanvas, selectedOverlay, w, h)

      animationRef.current = requestAnimationFrame(update)
    }

    update()
    return () => cancelAnimationFrame(animationRef.current)
  }, [selectedOverlay, cameraReady])

  const capturePhoto = () => {
    if (!cameraReady || !videoRef.current || !canvasRef.current) {
      console.log('[capture] camera not ready')
      return
    }
    setIsCapturing(true)
    console.log('[capture] started')

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.log('[capture] no ctx')
      return
    }

    const w = video.videoWidth || canvas.width || 640
    const h = video.videoHeight || canvas.height || 480
    console.log('[capture] video size =', w, h, 'video.readyState =', video.readyState)
    canvas.width = w
    canvas.height = h

    ctx.drawImage(video, 0, 0, w, h)
    console.log('[capture] video drawn, canvas pixel data length =', ctx.getImageData(0, 0, w, h).data.length)

    // Buat canvas sementara untuk filter
    const params = getCurrentFilterParams()
    console.log('[capture] filter params =', params)
    const filtered = processImage(canvas, params)

    // Buat canvas akhir buat overlay
    const finalCanvas = document.createElement('canvas')
    finalCanvas.width = w
    finalCanvas.height = h
    const finalCtx = finalCanvas.getContext('2d')
    if (!finalCtx) {
      console.log('[capture] no final ctx')
      setIsCapturing(false)
      return
    }
    finalCtx.drawImage(filtered, 0, 0)
    console.log('[capture] filtered drawn to final canvas')

    drawOverlayOnCanvas(finalCanvas, selectedOverlay, w, h)

    canvas.width = 1 // hide original

    finalCanvas.toBlob(
      (blob) => {
        console.log('[capture] toBlob callback, blob size =', blob?.size || 'null')
        setIsCapturing(false)
      },
      'image/png',
      1.0,
    )
  }

  const selectPreset = (presetId: string) => {
    setSelectedFilter(presetId)
    if (presetId === 'none') {
      setCustomParams({
        brightness: 100,
        contrast: 100,
        saturation: 100,
        warmth: 0,
        tint: 0,
        vignette: 0,
        grain: 0,
      })
    } else {
      const preset = FILTER_PRESETS.find((p) => p.id === presetId)
      if (preset) {
        setCustomParams({ ...preset.params })
      }
    }
  }

  const updateCustomParam = (key: keyof FilterParams, value: number) => {
    setCustomParams((prev) => ({ ...prev, [key]: value }))
    setSelectedFilter('none') // switch ke custom mode
  }

  const showCustomControls = selectedFilter === 'none'

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.18),transparent_28%),linear-gradient(135deg,#0f172a_0%,#111827_24%,#1f2937_100%)] text-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.45)] backdrop-blur-sm sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div>
            <span className="inline-flex items-center rounded-full border border-pink-400/30 bg-pink-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-pink-200">
              Story cam
            </span>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Photo Booth</h1>
            <p className="mt-2 max-w-lg text-sm text-slate-300 sm:text-base">
              Punya gaya story, filter, dan frame yang siap buat momen lebih berkesan.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            {cameraReady ? 'Camera ready' : demoPreview ? 'Demo mode' : 'Waiting'}
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.35fr]">
          <aside className="space-y-5">
            <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-4 shadow-2xl shadow-slate-950/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-200">Filter</span>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedFilter !== 'none') {
                      setCustomParams({
                        brightness: 100,
                        contrast: 100,
                        saturation: 100,
                        warmth: 0,
                        tint: 0,
                        vignette: 0,
                        grain: 0,
                      })
                    }
                    setSelectedFilter('none')
                  }}
                  className="text-xs font-medium text-indigo-300 transition hover:text-indigo-200"
                >
                  Reset
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {FILTER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => selectPreset(preset.id)}
                    className={`rounded-2xl border p-2 text-left transition ${
                      selectedFilter === preset.id
                        ? 'border-pink-400 bg-pink-500/10 text-white shadow-lg shadow-pink-500/10'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <span className="block text-lg">{preset.emoji}</span>
                    <span className="mt-1 block text-[10px] font-medium leading-tight">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-4 shadow-2xl shadow-slate-950/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-200">Overlay</span>
                <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                  {selectedOverlay}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {OVERLAYS.map((overlay) => (
                  <button
                    key={overlay.id}
                    type="button"
                    onClick={() => setSelectedOverlay(overlay.id)}
                    className={`rounded-2xl border px-2 py-3 text-xs font-medium transition ${
                      selectedOverlay === overlay.id
                        ? 'border-pink-400 bg-pink-500/10 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <span className="mb-1 block text-base">{overlay.icon}</span>
                    {overlay.label}
                  </button>
                ))}
              </div>
            </div>

            {showCustomControls && (
              <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-4 shadow-2xl shadow-slate-950/30">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">Custom detail</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">live</span>
                </div>

                <div className="space-y-3">
                  {[
                    ['Brightness', 'brightness', customParams.brightness, 50, 150],
                    ['Contrast', 'contrast', customParams.contrast, 50, 200],
                    ['Saturation', 'saturation', customParams.saturation, 0, 200],
                    ['Warmth', 'warmth', customParams.warmth, -50, 50],
                    ['Tint', 'tint', customParams.tint, -50, 50],
                    ['Vignette', 'vignette', customParams.vignette, 0, 50],
                    ['Grain', 'grain', customParams.grain, 0, 30],
                  ].map(([label, key, value, min, max]) => (
                    <div key={String(key)} className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-400">
                        <span>{label}</span>
                        <span>{value}</span>
                      </div>
                      <input
                        type="range"
                        min={String(min)}
                        max={String(max)}
                        value={Number(value)}
                        onChange={(e) => updateCustomParam(key as keyof FilterParams, Number(e.target.value))}
                        className="h-2 w-full accent-pink-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <section className="space-y-4">
            <div className="rounded-[32px] border border-white/10 bg-slate-900/60 p-3 shadow-[0_28px_80px_rgba(15,23,42,0.55)] sm:p-4">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Preview</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-slate-200">
                  {selectedFilter !== 'none' ? FILTER_PRESETS.find((p) => p.id === selectedFilter)?.name || selectedFilter : 'Custom'}
                </span>
              </div>

              <div className="relative overflow-hidden rounded-[28px] bg-black shadow-2xl shadow-black/40 aspect-[4/3]">
                {cameraReady && (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                    aria-label="Preview kamera"
                    style={{ filter: getLivePreviewFilter() }}
                  />
                )}

                {!cameraReady && demoPreview && (
                  <div
                    className="h-full w-full"
                    style={{
                      background: 'linear-gradient(135deg, #111827 0%, #1f2937 35%, #111827 100%)',
                      filter: getLivePreviewFilter(),
                    }}
                  />
                )}

                {!cameraReady && !demoPreview && (
                  <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.25),transparent_30%),linear-gradient(135deg,#0f172a,#111827_55%,#1f2937)] px-6 text-center">
                    <div className="space-y-4">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-pink-300/30 bg-white/5">
                        <svg className="h-8 w-8 text-pink-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.16a15.53 15.53 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-white">Preview siap dipakai</p>
                        <p className="mt-2 text-sm text-slate-300">Izinkan kamera agar live preview aktif.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDemoPreview(true)}
                        className="rounded-full bg-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/30 transition hover:bg-pink-400"
                      >
                        Coba demo
                      </button>
                    </div>
                  </div>
                )}

                <canvas
                  ref={overlayCanvasRef}
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                  aria-hidden="true"
                />

                {cameraError && (
                  <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-left text-xs text-red-100 backdrop-blur-sm">
                    {cameraError}
                  </div>
                )}

                {isCapturing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/40 border-t-white animate-spin" />
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">Live filter</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">Story style</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">Polaroid vibe</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  if (!cameraReady) {
                    setDemoPreview(true)
                  }
                  capturePhoto()
                }}
                disabled={isCapturing}
                className="flex-1 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-pink-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCapturing ? 'Mengambil...' : demoPreview ? 'Ambil foto demo' : 'Ambil foto'}
              </button>

              {!cameraReady && (
                <button
                  type="button"
                  onClick={() => {
                    setDemoPreview(false)
                    startCamera()
                  }}
                  className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Gunakan kamera
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
