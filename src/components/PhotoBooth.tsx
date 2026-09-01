import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

type OverlayPreset = 'none' | 'frame' | 'heart' | 'confetti' | 'text'

interface FilterParams {
  brightness: number
  contrast: number
  saturation: number
  warmth: number
  tint: number
  vignette: number
  grain: number
}

const FILTER_PRESETS: { id: string; name: string; emoji: string; params: FilterParams }[] = [
  { id: 'clarendon', name: 'Clarendon', emoji: '💎', params: { brightness: 115, contrast: 140, saturation: 130, warmth: -10, tint: 0, vignette: 10, grain: 0 } },
  { id: 'gingham', name: 'Gingham', emoji: '📏', params: { brightness: 88, contrast: 75, saturation: 70, warmth: 15, tint: 5, vignette: 20, grain: 8 } },
  { id: 'moon', name: 'Moon', emoji: '🌙', params: { brightness: 90, contrast: 180, saturation: 0, warmth: -10, tint: -5, vignette: 25, grain: 3 } },
  { id: 'lark', name: 'Lark', emoji: '🐦', params: { brightness: 108, contrast: 88, saturation: 85, warmth: 8, tint: 0, vignette: 12, grain: 3 } },
  { id: 'reyes', name: 'Reyes', emoji: '🎞️', params: { brightness: 85, contrast: 70, saturation: 65, warmth: 18, tint: 8, vignette: 30, grain: 10 } },
  { id: 'juno', name: 'Juno', emoji: '☀️', params: { brightness: 118, contrast: 110, saturation: 145, warmth: 25, tint: 10, vignette: 8, grain: 0 } },
  { id: 'slumber', name: 'Slumber', emoji: '😴', params: { brightness: 82, contrast: 85, saturation: 55, warmth: -20, tint: -12, vignette: 35, grain: 12 } },
  { id: 'crema', name: 'Crema', emoji: '🧀', params: { brightness: 105, contrast: 88, saturation: 82, warmth: 30, tint: 15, vignette: 12, grain: 8 } },
  { id: 'none', name: 'Tanpa', emoji: '⛔', params: { brightness: 100, contrast: 100, saturation: 100, warmth: 0, tint: 0, vignette: 0, grain: 0 } },
]

const OVERLAYS: { id: OverlayPreset; label: string; icon: string }[] = [
  { id: 'none', label: 'Tanpa', icon: '⛔' },
  { id: 'frame', label: 'Frame', icon: '🖼️' },
  { id: 'heart', label: 'Heart', icon: '❤️' },
  { id: 'confetti', label: 'Confetti', icon: '✨' },
  { id: 'text', label: 'Text', icon: '📸' },
]

const LAYOUTS = [
  { id: 'single', label: 'Single', icon: '📷' },
  { id: 'strip', label: 'Strip 3', icon: '🎞️' },
  { id: 'grid', label: 'Grid 2x2', icon: '🔲' },
  { id: 'polaroid', label: 'Polaroid', icon: '📸' },
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
    brightness: 100, contrast: 100, saturation: 100, warmth: 0, tint: 0, vignette: 0, grain: 0,
  })
  const [step, setStep] = useState<'start' | 'layout' | 'capture' | 'review' | 'customize' | 'download'>('start')
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [capturedShots, setCapturedShots] = useState<string[]>([])
  const [finalPhoto, setFinalPhoto] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [selectedLayout, setSelectedLayout] = useState('single')
  const requiredShots = selectedLayout === 'strip' ? 3 : selectedLayout === 'grid' ? 4 : 1

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraReady(false)
  }, [])

  const resetAll = () => {
    setStep('start')
    setCapturedPhoto(null)
    setCapturedShots([])
    setFinalPhoto(null)
    setSaveStatus('idle')
    setSelectedLayout('single')
    setDemoPreview(false)
    setCameraReady(false)
    setCameraError(null)
    setCustomParams({ brightness: 100, contrast: 100, saturation: 100, warmth: 0, tint: 0, vignette: 0, grain: 0 })
    setSelectedFilter('none')
    setSelectedOverlay('none')
    stopCamera()
  }

  const startCamera = useCallback(async () => {
    if (cameraReady || demoPreview) return
    try {
      console.log('[startCamera] requesting camera access...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: false,
      })
      console.log('[startCamera] got stream')
      streamRef.current = stream
      if (!videoRef.current) return
      videoRef.current.srcObject = stream

      return new Promise<void>((resolve) => {
        let resolved = false
        const onLoadedMetadata = () => {
          if (resolved) return
          resolved = true
          console.log('[startCamera] loadedmetadata event fired')
          if (videoRef.current) {
            videoRef.current.removeEventListener('loadedmetadata', onLoadedMetadata)
            videoRef.current.removeEventListener('error', onError)
          }
          setCameraReady(true)
          setCameraError(null)
          resolve()
        }
        const onError = (e: Event) => {
          if (resolved) return
          resolved = true
          console.error('[startCamera] video error event:', e)
          if (videoRef.current) {
            videoRef.current.removeEventListener('loadedmetadata', onLoadedMetadata)
            videoRef.current.removeEventListener('error', onError)
          }
          setCameraError('Gagal memuat video dari kamera.')
          setCameraReady(false)
          resolve()
        }
        if (videoRef.current) {
          videoRef.current.addEventListener('loadedmetadata', onLoadedMetadata)
          videoRef.current.addEventListener('error', onError)

          const timeoutId = setTimeout(() => {
            if (resolved) return
            resolved = true
            console.warn('[startCamera] timeout waiting for loadedmetadata')

            if (videoRef.current && videoRef.current.readyState >= 1) {
              console.log('[startCamera] video has started loading (readyState >= 1), waiting more')
              setTimeout(() => {
                if (resolved) return
                resolved = true
                console.warn('[startCamera] extended timeout, setting ready anyway')
                if (videoRef.current && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
                  console.log(`[startCamera] video ready after extended wait: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`)
                } else {
                  console.warn('[startCamera] video still has no dimensions after extended wait')
                }
                if (videoRef.current) {
                  videoRef.current.removeEventListener('loadedmetadata', onLoadedMetadata)
                  videoRef.current.removeEventListener('error', onError)
                }
                clearTimeout(timeoutId)
                setCameraReady(true)
                setCameraError(null)
                resolve()
              }, 3000)
              return
            }

            console.warn('[startCamera] timeout, setting ready anyway (video may not have data)')
            if (videoRef.current) {
              videoRef.current.removeEventListener('loadedmetadata', onLoadedMetadata)
              videoRef.current.removeEventListener('error', onError)
            }
            clearTimeout(timeoutId)
            setCameraReady(true)
            setCameraError(null)
            resolve()
          }, 3000)

          const playPromise = videoRef.current.play()
          if (playPromise !== undefined) {
            playPromise.then(() => console.log('[startCamera] video playing')).catch((err: Error) => console.warn('[startCamera] play() rejected:', err.message))
          }
        }
      })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error('[startCamera] error:', errMsg)
      setCameraError('Gagal akses kamera. Cek izin browser atau pakai perangkat lain.')
      setCameraReady(false)
    }
  }, [cameraReady, demoPreview])

  useEffect(() => {
    const animationId = animationRef.current
    return () => {
      stopCamera()
      cancelAnimationFrame(animationId)
    }
  }, [stopCamera])

  // Camera access is requested only after the user reaches the pose screen.
  // This prevents the camera indicator from staying on while browsing the page.
  useEffect(() => {
    if (step === 'capture' && !demoPreview && !streamRef.current) {
      void startCamera()
    }
  }, [step, demoPreview, startCamera])

  // Each booth screen conditionally renders its own <video>. Reconnect the
  // existing camera stream after React mounts the video for the new screen.
  useEffect(() => {
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return

    if (video.srcObject !== stream) video.srcObject = stream
    const markReady = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setCameraReady(true)
        setCameraError(null)
      }
    }

    video.addEventListener('loadeddata', markReady)
    video.addEventListener('canplay', markReady)
    void video.play().then(markReady).catch((error: Error) => {
      console.warn('[camera] unable to resume preview:', error.message)
    })
    markReady()

    return () => {
      video.removeEventListener('loadeddata', markReady)
      video.removeEventListener('canplay', markReady)
    }
  }, [step])

  const applyFilterToImageData = (imageData: ImageData, params: FilterParams): ImageData => {
    const { data } = imageData
    const len = data.length
    const brightness = params.brightness / 100
    const contrast = (params.contrast - 100) / 100
    const saturation = (params.saturation - 100) / 100
    const warmth = params.warmth / 100
    const tint = params.tint / 100

    for (let i = 0; i < len; i += 4) {
      let r = data[i]
      let g = data[i + 1]
      let b = data[i + 2]

      r *= brightness
      g *= brightness
      b *= brightness

      const mid = 128
      r = (r - mid) * (1 + contrast) + mid
      g = (g - mid) * (1 + contrast) + mid
      b = (b - mid) * (1 + contrast) + mid

      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      r = gray + (r - gray) * (1 + saturation)
      g = gray + (g - gray) * (1 + saturation)
      b = gray + (b - gray) * (1 + saturation)

      r += warmth * 20
      b -= warmth * 15
      g += tint * 15
      r -= tint * 5
      b -= tint * 5

      data[i] = Math.max(0, Math.min(255, Math.round(r)))
      data[i + 1] = Math.max(0, Math.min(255, Math.round(g)))
      data[i + 2] = Math.max(0, Math.min(255, Math.round(b)))
    }

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

    // The canvas already contains the filtered camera frame. Overlays must be
    // painted on top of it; clearing here made the "Tanpa" result transparent.
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

    if (overlay === 'text') {
      ctx.save()
      ctx.font = `700 ${Math.min(width, height) * 0.1}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.shadowColor = 'rgba(0,0,0,0.55)'
      ctx.shadowBlur = 12
      ctx.shadowOffsetY = 4
      ctx.fillStyle = '#ffffff'
      ctx.fillText('📸 story', width / 2, height - Math.min(width, height) * 0.1)
      ctx.restore()
    }
  }

  const getLivePreviewFilter = () => {
    if (selectedFilter === 'none') return `brightness(${customParams.brightness}%) contrast(${customParams.contrast}%) saturate(${customParams.saturation}%) sepia(${customParams.warmth > 0 ? customParams.warmth * 0.4 : 0}%) hue-rotate(${customParams.tint * 0.8}deg) invert(${customParams.warmth < 0 ? Math.abs(customParams.warmth) * 0.1 : 0}%)`
    const preset = FILTER_PRESETS.find((p) => p.id === selectedFilter)
    if (!preset) return 'none'
    const base = `brightness(${preset.params.brightness}%) contrast(${preset.params.contrast}%) saturate(${preset.params.saturation}%) sepia(${Math.min(Math.abs(preset.params.warmth) * 0.5, 100)}%) hue-rotate(${preset.params.tint}deg)`
    const blend = `brightness(${customParams.brightness}%) contrast(${customParams.contrast}%) saturate(${customParams.saturation}%)`
    return `${base} ${blend}`
  }

  // FIX: added missing getCurrentFilterParams
  const getCurrentFilterParams = useCallback((): FilterParams => {
    if (selectedFilter === 'none') return customParams
    const preset = FILTER_PRESETS.find((p) => p.id === selectedFilter)
    if (!preset) return customParams
    return {
      brightness: Math.round(preset.params.brightness * customParams.brightness / 100),
      contrast: Math.round(preset.params.contrast * customParams.contrast / 100),
      saturation: Math.round(preset.params.saturation * customParams.saturation / 100),
      warmth: preset.params.warmth + customParams.warmth,
      tint: preset.params.tint + customParams.tint,
      vignette: Math.max(preset.params.vignette, customParams.vignette),
      grain: Math.max(preset.params.grain, customParams.grain),
    }
  }, [selectedFilter, customParams])

  const loadPhoto = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Gagal menyusun foto.'))
    image.src = src
  })

  const composeLayout = async (shots: string[]) => {
    if (selectedLayout === 'single') return shots[0]

    const images = await Promise.all(shots.map(loadPhoto))
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return shots[0]
    const drawCover = (image: HTMLImageElement, x: number, y: number, width: number, height: number) => {
      const scale = Math.max(width / image.width, height / image.height)
      const sourceWidth = width / scale
      const sourceHeight = height / scale
      ctx.drawImage(image, (image.width - sourceWidth) / 2, (image.height - sourceHeight) / 2, sourceWidth, sourceHeight, x, y, width, height)
    }

    if (selectedLayout === 'strip') {
      canvas.width = 720
      canvas.height = 1740
      ctx.fillStyle = '#fffafc'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#d95583'
      ctx.font = '700 27px Trebuchet MS, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('UT ENGLISH STUDIES · 2026', canvas.width / 2, 58)
      images.forEach((image, index) => drawCover(image, 48, 92 + index * 526, 624, 470))
      ctx.fillStyle = '#8c6075'
      ctx.font = 'italic 28px Georgia, serif'
      ctx.fillText('say cheese!', canvas.width / 2, 1685)
    } else if (selectedLayout === 'grid') {
      canvas.width = 1080
      canvas.height = 1080
      ctx.fillStyle = '#fffafc'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      images.forEach((image, index) => {
        const column = index % 2
        const row = Math.floor(index / 2)
        drawCover(image, 38 + column * 510, 38 + row * 510, 494, 494)
      })
      ctx.fillStyle = '#d95583'
      ctx.font = '700 20px Trebuchet MS, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('UT ENGLISH STUDIES · 2026', canvas.width / 2, 1055)
    } else {
      // Layout Polaroid is a real single-photo layout, separate from decorations.
      canvas.width = images[0].width
      canvas.height = Math.round(images[0].height * 1.25)
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const margin = Math.round(canvas.width * .07)
      drawCover(images[0], margin, margin, canvas.width - margin * 2, Math.round(images[0].height * .92))
      ctx.fillStyle = '#8c6075'
      ctx.font = `italic ${Math.max(22, canvas.width * .035)}px Georgia, serif`
      ctx.textAlign = 'center'
      ctx.fillText('UT English Studies · 2026', canvas.width / 2, canvas.height - margin * .7)
    }
    return canvas.toDataURL('image/png')
  }

  const handleCapturedShot = async (photo: string) => {
    const shots = [...capturedShots, photo]
    if (shots.length < requiredShots) {
      setCapturedShots(shots)
      setIsCapturing(false)
      return
    }
    try {
      const layoutPhoto = await composeLayout(shots)
      setCapturedShots(shots)
      setCapturedPhoto(layoutPhoto)
      setFinalPhoto(layoutPhoto)
      setStep('review')
      stopCamera()
    } catch (error) {
      console.error('[capture] layout composition failed:', error)
      setCameraError('Gagal menyusun layout foto. Silakan coba lagi.')
    } finally {
      setIsCapturing(false)
    }
  }

  // FIX: added missing processCapture — blob correctly used inside toBlob callback
  const processCapture = (srcCanvas: HTMLCanvasElement, w: number, h: number) => {
    const params = getCurrentFilterParams()
    const filtered = processImage(srcCanvas, params)

    const finalCanvas = document.createElement('canvas')
    finalCanvas.width = w
    finalCanvas.height = h
    const finalCtx = finalCanvas.getContext('2d')
    if (!finalCtx) {
      setIsCapturing(false)
      return
    }
    finalCtx.drawImage(filtered, 0, 0)
    drawOverlayOnCanvas(finalCanvas, selectedOverlay, w, h)

    finalCanvas.toBlob((blob) => {
      if (!blob) {
        setIsCapturing(false)
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        const dataUrl = reader.result as string
        void handleCapturedShot(dataUrl)
      }
      reader.readAsDataURL(blob)
    }, 'image/png', 1.0)
  }


  const capturePhoto = () => {
    setIsCapturing(true)
    console.log('[capture] capturePhoto called')

    const video = videoRef.current
    if (!video) {
      console.warn('[capture] video element is not mounted')
      setCameraError('Preview kamera belum tersedia. Coba kembali ke layar foto.')
      setIsCapturing(false)
      return
    }

    if (!demoPreview && video.readyState < 2) {
      console.warn('[capture] video not ready, readyState =', video?.readyState, 'demoPreview =', demoPreview)
      const stream = streamRef.current
      if (stream && video.srcObject !== stream) video.srcObject = stream
      void video.play().catch(() => undefined)
      setCameraError('Kamera sedang menyiapkan preview. Tunggu sebentar lalu ambil foto lagi.')
      setIsCapturing(false)
      return
    }

    if (demoPreview && video.readyState < 2) {
      // Demo mode intentionally creates a sample image when no camera exists.
      setTimeout(() => {
        const w = 1280
        const h = 720
        const demoCanvas = document.createElement('canvas')
        demoCanvas.width = w
        demoCanvas.height = h
        const demoCtx = demoCanvas.getContext('2d')
        if (!demoCtx) {
          setIsCapturing(false)
          return
        }
        const fallbackImg = document.createElement('img')
        fallbackImg.crossOrigin = 'anonymous'
        fallbackImg.src = 'https://picsum.photos/1280/720?random=' + Date.now()
        fallbackImg.onload = () => {
          demoCtx.drawImage(fallbackImg, 0, 0, w, h)
          processCapture(demoCanvas, w, h)
        }
        fallbackImg.onerror = () => {
          demoCtx.fillStyle = '#1a1a2e'
          demoCtx.fillRect(0, 0, w, h)
          demoCtx.fillStyle = '#ffffff'
          demoCtx.font = 'bold 42px sans-serif'
          demoCtx.textAlign = 'center'
          demoCtx.textBaseline = 'middle'
          demoCtx.fillText('Demo Mode', w / 2, h / 2 - 20)
          demoCtx.font = '20px sans-serif'
          demoCtx.fillStyle = '#aaaaaa'
          demoCtx.fillText('Kamera tidak tersedia', w / 2, h / 2 + 20)
          processCapture(demoCanvas, w, h)
        }
      }, 100)
      return
    }

    console.log('[capture] proceeding with video capture', { readyState: video.readyState, videoWidth: video.videoWidth, videoHeight: video.videoHeight })

    if (!canvasRef.current) {
      console.error('[capture] no canvas ref')
      setIsCapturing(false)
      return
    }

    const srcCanvas = canvasRef.current
    const w = video.videoWidth || srcCanvas.width
    const h = video.videoHeight || srcCanvas.height
    srcCanvas.width = w
    srcCanvas.height = h

    const srcCtx = srcCanvas.getContext('2d')
    if (!srcCtx) {
      console.log('[capture] no source ctx')
      setIsCapturing(false)
      return
    }

    srcCtx.drawImage(video, 0, 0, w, h)
    console.log('[capture] frame drawn to source canvas')

    // Delegate to processCapture which handles filter + overlay + toBlob correctly
    processCapture(srcCanvas, w, h)
  }

  const handleDownload = () => {
    if (!finalPhoto) return
    const a = document.createElement('a')
    a.href = finalPhoto
    a.download = `photobooth-sasing-${Date.now()}.png`
    a.click()
  }

  const handleShare = async () => {
    if (!finalPhoto) return

    try {
      const response = await fetch(finalPhoto)
      const blob = await response.blob()
      const file = new File([blob], `photobooth-sasing-${Date.now()}.png`, { type: 'image/png' })

      if (navigator.share) {
        await navigator.share({
          title: 'Photo Booth',
          text: 'Lihat foto saya dari Photo Booth ✨',
          files: [file],
        })
        return
      }

      if (navigator.clipboard) {
        await navigator.clipboard.writeText('Lihat foto saya dari Photo Booth ✨')
      }

      handleDownload()
    } catch (error) {
      console.error('[share] share failed:', error)
      handleDownload()
    }
  }

  const saveToMemoryLane = async () => {
    if (!finalPhoto || saveStatus === 'saving' || saveStatus === 'saved') return
    setSaveStatus('saving')

    try {
      const response = await fetch(finalPhoto)
      const photoBlob = await response.blob()
      const uniqueId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).slice(2)
      const storagePath = `memory-lane/${Date.now()}-${uniqueId}.png`
      const { error: uploadError } = await supabase.storage
        .from('photo-booth')
        .upload(storagePath, photoBlob, { contentType: 'image/png', upsert: false })
      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('photo-booth').getPublicUrl(storagePath)
      const publicUrl = publicUrlData.publicUrl
      const { error: metadataError } = await supabase
        .from('photos')
        .insert({ storage_path: storagePath, public_url: publicUrl, event_id: 'sasing-ganjil-26' })

      if (metadataError) {
        await supabase.storage.from('photo-booth').remove([storagePath])
        throw metadataError
      }

      setSaveStatus('saved')
      window.dispatchEvent(new Event('photo-booth-uploaded'))
    } catch (error) {
      console.error('[memory-lane] upload failed:', error)
      setSaveStatus('error')
    }
  }

  return (
    <section className="booth-page">
      <div className="booth-stars booth-stars-left" aria-hidden="true">✦</div>
      <div className="booth-stars booth-stars-right" aria-hidden="true">✿</div>
      <div className="booth-wrap">
        <header className="booth-intro">
          <p className="booth-kicker">UT Sastra Inggris · 2026</p>
          <h1>say <em>cheese!</em></h1>
          <p>Ruang kecil untuk menyimpan momen besar bersama teman belajar.</p>
        </header>

        <div className="booth-progress" aria-label="Tahap photo booth">
          {['layout', 'capture', 'review'].map((item, index) => (
            <span className={(step === item || (item === 'review' && (step === 'customize' || step === 'download'))) ? 'is-active' : ''} key={item}>
              <b>{index + 1}</b>{item === 'layout' ? 'Pilih gaya' : item === 'capture' ? 'Berpose' : 'Simpan'}
            </span>
          ))}
        </div>

        <canvas ref={canvasRef} className="booth-hidden" />
        <canvas ref={overlayCanvasRef} className="booth-hidden" />

        {step === 'start' && (
          <div className="booth-stage booth-start">
            {cameraError && (
              <p className="booth-warning">⚠ {cameraError}</p>
            )}
            <div className="booth-actions">
              <button className="booth-button booth-button-primary" onClick={() => setStep('layout')}>Mulai sesi <span>↗</span></button>
              {!cameraReady && (
                <button className="booth-button booth-button-quiet" onClick={() => { setDemoPreview(true); setStep('layout') }}>Coba demo</button>
              )}
            </div>
          </div>
        )}

        {step === 'layout' && (
          <div className="booth-stage">
            <div className="booth-step-heading"><span>01 / 03</span><h2>pilih gaya<br /><em>favoritmu</em></h2><p>Setiap momen punya bingkai yang tepat.</p></div>
            <div className="layout-picker">
              {LAYOUTS.map((layout) => (
                <button key={layout.id} onClick={() => { setSelectedLayout(layout.id); setCapturedShots([]) }} className={`layout-card ${selectedLayout === layout.id ? 'is-selected' : ''}`}>
                  <span className={`layout-icon layout-${layout.id}`}>{layout.icon}</span>
                  <strong>{layout.label}</strong>
                </button>
              ))}
            </div>
            <div className="booth-actions">
              <button className="booth-button booth-button-quiet" onClick={() => setStep('start')}>← Kembali</button>
              <button className="booth-button booth-button-primary" onClick={() => { setCapturedShots([]); setStep('capture') }}>Lanjut <span>→</span></button>
            </div>
          </div>
        )}

        {step === 'capture' && (
          <div className="booth-stage">
            <div className="booth-step-heading"><span>02 / 03</span><h2>strike a <em>pose!</em></h2><p>Pilih nuansa, lalu ambil momenmu.</p></div>
            <div className="booth-controls"><p>pilih filter</p><div className="booth-chip-list">
              {FILTER_PRESETS.map((preset) => (
                <button key={preset.id} onClick={() => setSelectedFilter(preset.id)} className={`booth-chip ${selectedFilter === preset.id ? 'is-selected' : ''}`}>{preset.emoji} {preset.name}</button>
              ))}
            </div></div>
            <div className="booth-controls"><p>tambahkan dekorasi</p><div className="booth-chip-list">
              {OVERLAYS.map((ov) => (
                <button key={ov.id} onClick={() => setSelectedOverlay(ov.id)} className={`booth-chip booth-chip-decoration ${selectedOverlay === ov.id ? 'is-selected' : ''}`}>{ov.icon} {ov.label}</button>
              ))}
            </div></div>
            {requiredShots > 1 && <p className="booth-shot-counter">Jepretan {capturedShots.length + 1} dari {requiredShots}</p>}
            <div className="booth-camera">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ filter: getLivePreviewFilter() }}
              />
              <span className="booth-camera-label">ready when you are</span>
            </div>
            <div className="booth-actions">
              <button className="booth-button booth-button-quiet" onClick={() => { setCapturedShots([]); setStep('layout') }}>← Ganti gaya</button>
              <button className="booth-shutter" onClick={capturePhoto} disabled={isCapturing}><i>●</i>{isCapturing ? 'Memproses...' : requiredShots > 1 ? `Ambil ${capturedShots.length + 1}/${requiredShots}` : 'Ambil foto'}</button>
            </div>
          </div>
        )}

        {step === 'review' && capturedPhoto && (
          <div className="booth-stage booth-result">
            <div className="booth-step-heading"><span>03 / 03</span><h2>that’s a <em>wrap!</em></h2><p>Jadikan momen ini kenangan yang bisa kamu bawa pulang.</p></div>
            <div className="booth-photo-print"><img src={capturedPhoto} alt="Hasil foto" /><p>UT English Studies · 2026</p></div>
            <div className="booth-actions">
              <button className="booth-button booth-button-quiet" onClick={() => { setCapturedShots([]); setStep('capture') }}>↻ Foto ulang</button>
              <button className="booth-button booth-button-lilac" onClick={() => setStep('customize')}>✦ Atur foto</button>
              <button className="booth-button booth-button-memory" onClick={saveToMemoryLane} disabled={saveStatus === 'saving' || saveStatus === 'saved'}>
                {saveStatus === 'saving' ? 'Menyimpan...' : saveStatus === 'saved' ? '✓ Tersimpan di Memory Lane' : '♡ Simpan ke Memory Lane'}
              </button>
              <button className="booth-button booth-button-primary" onClick={handleShare}>↗ Share ke Story</button>
              <button className="booth-button booth-button-primary" onClick={handleDownload}>Unduh foto <span>↓</span></button>
              <button className="booth-button booth-button-quiet" onClick={resetAll}>Mulai lagi</button>
            </div>
            {saveStatus === 'error' && <p className="booth-save-error">Foto belum tersimpan. Periksa koneksi atau konfigurasi Supabase, lalu coba lagi.</p>}
          </div>
        )}

        {step === 'customize' && (
          <div className="booth-stage booth-edit">
            <div className="booth-step-heading"><span>fine tune</span><h2>make it <em>yours</em></h2><p>Atur detail kecil sampai rasanya pas.</p></div>
            {capturedPhoto && (
              <div className="booth-photo-print booth-photo-edit"><img src={capturedPhoto} alt="Preview" style={{ filter: getLivePreviewFilter() }} /><p>custom edit</p></div>
            )}
            <div className="booth-sliders">
              {(Object.keys(customParams) as (keyof FilterParams)[]).map((key) => (
                <label key={key}>
                  <span>{key} <b>{customParams[key]}</b></span>
                  <input
                    type="range"
                    min={key === 'brightness' || key === 'contrast' || key === 'saturation' ? 0 : -100}
                    max={key === 'brightness' || key === 'contrast' || key === 'saturation' ? 200 : 100}
                    value={customParams[key]}
                    onChange={(e) => setCustomParams((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                  />
                </label>
              ))}
            </div>
            <div className="booth-actions">
              <button className="booth-button booth-button-quiet" onClick={() => setStep('review')}>← Kembali</button>
              <button className="booth-button booth-button-primary" onClick={handleShare}>↗ Share ke Story</button>
              <button className="booth-button booth-button-primary" onClick={handleDownload}>Unduh foto <span>↓</span></button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
