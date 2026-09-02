import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

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

const LAYOUTS = [
  { id: 'single', label: 'Single', icon: '📷' },
  { id: 'strip-4', label: 'Strip 4', icon: '🖼️' },
  { id: 'strip-vertical', label: 'Strip 3 Vertikal', icon: '📏' },
  { id: 'strip-horizontal', label: 'Strip 3 Horizontal', icon: '📐' },
  { id: 'grid', label: 'Grid 2x2', icon: '🔲' },
  { id: 'polaroid', label: 'Polaroid', icon: '📸' },
]

export default function PhotoBooth() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number>(0)

  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [demoPreview, setDemoPreview] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<string>('none')
  const [mirrorMode, setMirrorMode] = useState<'mirror' | 'normal'>('mirror')
  const utLogoRef = useRef<HTMLImageElement | null>(null)
  const [customParams, setCustomParams] = useState<FilterParams>({
    brightness: 100, contrast: 100, saturation: 100, warmth: 0, tint: 0, vignette: 0, grain: 0,
  })
  const [step, setStep] = useState<'start' | 'layout' | 'capture' | 'review' | 'customize' | 'download'>('start')
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [capturedShots, setCapturedShots] = useState<string[]>([])
  const [finalPhoto, setFinalPhoto] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [selectedLayout, setSelectedLayout] = useState('single')
  const requiredShots = ['strip-4', 'strip-vertical', 'strip-horizontal', 'strip'].includes(selectedLayout) ? (selectedLayout === 'strip-4' ? 4 : 3) : selectedLayout === 'grid' ? 4 : 1

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
    const candidates = ['/ut-logo.png', '/ut-logo.svg']

    const loadLogo = (src: string) => {
      const image = new Image()
      image.onload = () => {
        utLogoRef.current = image
      }
      image.onerror = () => {
        const next = candidates[candidates.indexOf(src) + 1]
        if (next) loadLogo(next)
        else console.warn('[photo-booth] UT logo failed to load, continuing without it.')
      }
      image.src = src
    }

    loadLogo(candidates[0])

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

    const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
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

    const drawFooter = (title: string, subtitle: string) => {
      const logo = utLogoRef.current
      const logoSize = 74
      const footerHeight = 120
      const footerY = canvas.height - footerHeight

      ctx.fillStyle = '#f4dfe4'
      ctx.fillRect(0, footerY, canvas.width, footerHeight)

      if (logo) {
        ctx.save()
        ctx.globalAlpha = 0.98
        ctx.drawImage(logo, 36, footerY + 16, logoSize, logoSize)
        ctx.restore()
      }

      ctx.fillStyle = '#3a1d2a'
      ctx.textAlign = 'center'
      ctx.font = '700 28px "Trebuchet MS", sans-serif'
      ctx.fillText(title, canvas.width / 2 + 18, footerY + 34)

      ctx.font = '600 18px "Trebuchet MS", sans-serif'
      ctx.fillText('say cheese!', canvas.width / 2 + 18, footerY + 64)

      ctx.font = '700 16px "Trebuchet MS", sans-serif'
      ctx.fillText(subtitle, canvas.width / 2 + 18, footerY + 92)
    }

    const treatLayoutBlock = (count: number, mode: 'stack' | 'row') => {
      const safeCount = Math.min(count, images.length)
      const marginX = 34
      const marginTop = 126
      const gap = 18
      const footerHeight = 120
      const totalInnerHeight = canvas.height - marginTop - footerHeight - 30

      if (mode === 'stack') {
        const panelHeight = (totalInnerHeight - gap * (safeCount - 1)) / safeCount
        const panelWidth = canvas.width - marginX * 2
        const startX = marginX

        images.slice(0, safeCount).forEach((image, index) => {
          const x = startX
          const y = marginTop + index * (panelHeight + gap)
          ctx.fillStyle = '#f4f0ee'
          drawRoundedRect(x, y, panelWidth, panelHeight, 18)
          ctx.fill()

          ctx.strokeStyle = '#d8c2c9'
          ctx.lineWidth = 3
          drawRoundedRect(x + 12, y + 12, panelWidth - 24, panelHeight - 24, 14)
          ctx.stroke()

          drawCover(image, x + 22, y + 22, panelWidth - 44, panelHeight - 44)
        })
      } else {
        const panelWidth = (canvas.width - marginX * 2 - gap * (safeCount - 1)) / safeCount
        const panelHeight = totalInnerHeight * 0.8
        const startY = marginTop + (totalInnerHeight - panelHeight) / 2

        images.slice(0, safeCount).forEach((image, index) => {
          const x = marginX + index * (panelWidth + gap)
          const y = startY
          ctx.fillStyle = '#f4f0ee'
          drawRoundedRect(x, y, panelWidth, panelHeight, 18)
          ctx.fill()

          ctx.strokeStyle = '#d8c2c9'
          ctx.lineWidth = 3
          drawRoundedRect(x + 10, y + 10, panelWidth - 20, panelHeight - 20, 14)
          ctx.stroke()

          drawCover(image, x + 16, y + 16, panelWidth - 32, panelHeight - 32)
        })
      }
    }

    if (selectedLayout === 'strip-4' || selectedLayout === 'strip-vertical' || selectedLayout === 'strip' || selectedLayout === 'strip-horizontal') {
      const isFour = selectedLayout === 'strip-4'
      const isHorizontal = selectedLayout === 'strip-horizontal'

      canvas.width = 760
      canvas.height = 1280
      ctx.fillStyle = '#f4dfe4'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      if (isFour) {
        const margin = 14
        const gap = 8
        const footerGap = 14
        const footerHeight = 120
        const cardW = canvas.width - margin * 2
        const cardH = (canvas.height - margin * 2 - gap * 3 - footerHeight - footerGap) / 4
        let y = margin

        images.slice(0, 4).forEach((image) => {
          ctx.fillStyle = '#f7f0ee'
          drawRoundedRect(margin, y, cardW, cardH, 12)
          ctx.fill()

          ctx.strokeStyle = '#e8d4d9'
          ctx.lineWidth = 1
          drawRoundedRect(margin + 2, y + 2, cardW - 4, cardH - 4, 10)
          ctx.stroke()

          drawCover(image, margin + 8, y + 8, cardW - 16, cardH - 16)
          y += cardH + gap
        })
      } else if (isHorizontal) {
        canvas.width = 1400
        canvas.height = 900
        ctx.fillStyle = '#f4dfe4'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        const marginX = 20
        const marginY = 18
        const gap = 12
        const footerHeight = 120
        const footerGap = 18
        const cardW = (canvas.width - marginX * 2 - gap * 2) / 3
        const cardH = canvas.height - marginY * 2 - footerHeight - footerGap
        let x = marginX

        images.slice(0, 3).forEach((image) => {
          ctx.fillStyle = '#f7f0ee'
          drawRoundedRect(x, marginY, cardW, cardH, 14)
          ctx.fill()

          ctx.strokeStyle = '#e8d4d9'
          ctx.lineWidth = 1
          drawRoundedRect(x + 2, marginY + 2, cardW - 4, cardH - 4, 12)
          ctx.stroke()

          drawCover(image, x + 8, marginY + 8, cardW - 16, cardH - 16)
          x += cardW + gap
        })
      } else {
        const margin = 14
        const gap = 8
        const footerGap = 14
        const footerHeight = 120
        const cardW = canvas.width - margin * 2
        const cardH = (canvas.height - margin * 2 - gap * 2 - footerHeight - footerGap) / 3
        let y = margin

        images.slice(0, 3).forEach((image) => {
          ctx.fillStyle = '#f7f0ee'
          drawRoundedRect(margin, y, cardW, cardH, 12)
          ctx.fill()

          ctx.strokeStyle = '#e8d4d9'
          ctx.lineWidth = 1
          drawRoundedRect(margin + 2, y + 2, cardW - 4, cardH - 4, 10)
          ctx.stroke()

          drawCover(image, margin + 8, y + 8, cardW - 16, cardH - 16)
          y += cardH + gap
        })
      }

      drawFooter('UT English Studies', 'UT Sastra Inggris Study • 2026')
      return canvas.toDataURL('image/png')
    }

    if (selectedLayout === 'strip-horizontal') {
      canvas.width = 1400
      canvas.height = 900
      ctx.fillStyle = '#f8f3f0'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      treatLayoutBlock(3, 'row')
      drawFooter('UT English Studies', 'UT Sastra Inggris Study • 2026')
      return canvas.toDataURL('image/png')
    }

    if (selectedLayout === 'grid') {
      canvas.width = 1100
      canvas.height = 1100
      ctx.fillStyle = '#f4dfe4'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const columns = 2
      const rows = 2
      const margin = 24
      const gap = 18
      const footerHeight = 120
      const footerGap = 18
      const cellW = (canvas.width - margin * 2 - gap * (columns - 1)) / columns
      const cellH = (canvas.height - margin * 2 - gap * (rows - 1) - footerHeight - footerGap) / rows

      images.slice(0, 4).forEach((image, index) => {
        const col = index % columns
        const row = Math.floor(index / columns)
        const x = margin + col * (cellW + gap)
        const y = margin + row * (cellH + gap)

        ctx.fillStyle = '#f7f0ee'
        drawRoundedRect(x, y, cellW, cellH, 12)
        ctx.fill()

        ctx.strokeStyle = '#e8d4d9'
        ctx.lineWidth = 1
        drawRoundedRect(x + 2, y + 2, cellW - 4, cellH - 4, 10)
        ctx.stroke()

        drawCover(image, x + 8, y + 8, cellW - 16, cellH - 16)
      })

      drawFooter('UT English Studies', 'UT Sastra Inggris Study • 2026')
      return canvas.toDataURL('image/png')
    }

    // Polaroid layout
    canvas.width = 1000
    canvas.height = 1200
    ctx.fillStyle = '#f4dfe4'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const cardX = 88
    const cardY = 72
    const cardW = canvas.width - cardX * 2
    const cardH = 850
    ctx.fillStyle = '#ffffff'
    drawRoundedRect(cardX, cardY, cardW, cardH, 20)
    ctx.fill()

    ctx.strokeStyle = '#ead7db'
    ctx.lineWidth = 1.5
    drawRoundedRect(cardX + 6, cardY + 6, cardW - 12, cardH - 12, 16)
    ctx.stroke()

    drawCover(images[0], cardX + 18, cardY + 18, cardW - 36, cardH - 150)

    ctx.fillStyle = '#3a1d2a'
    ctx.textAlign = 'center'
    ctx.font = '700 32px "Trebuchet MS", sans-serif'
    ctx.fillText('say cheese!', canvas.width / 2, cardY + cardH - 42)

    drawFooter('UT English Studies', 'UT Sastra Inggris Study • 2026')
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

    srcCtx.save()
    if (mirrorMode === 'mirror') {
      srcCtx.translate(w, 0)
      srcCtx.scale(-1, 1)
    }
    srcCtx.drawImage(video, 0, 0, w, h)
    srcCtx.restore()
    console.log('[capture] frame drawn to source canvas', { mirrorMode })

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

        {step === 'start' && (
          <div className="booth-stage booth-start">
            {cameraError && (
              <p className="booth-warning">⚠ {cameraError}</p>
            )}
            <div className="booth-actions">
              <button className="booth-button booth-button-primary" onClick={() => setStep('layout')}>Mulai sesi <span>↗</span></button>
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
          <div className="booth-stage booth-stage-story">
            <div className="booth-step-heading"><span>02 / 03</span><h2>strike a <em>pose!</em></h2><p>Pilih nuansa, lalu ambil momenmu.</p></div>
            <div className="booth-controls"><p>pilih filter</p><div className="booth-chip-list">
              {FILTER_PRESETS.map((preset) => (
                <button key={preset.id} onClick={() => setSelectedFilter(preset.id)} className={`booth-chip ${selectedFilter === preset.id ? 'is-selected' : ''}`}>{preset.emoji} {preset.name}</button>
              ))}
            </div></div>
            <div className="booth-controls"><p>opsi tampilan</p><div className="booth-chip-list">
              <button type="button" onClick={() => setMirrorMode('mirror')} className={`booth-chip ${mirrorMode === 'mirror' ? 'is-selected' : ''}`}>Mirror</button>
              <button type="button" onClick={() => setMirrorMode('normal')} className={`booth-chip ${mirrorMode === 'normal' ? 'is-selected' : ''}`}>Tanpa mirror</button>
            </div></div>
            {requiredShots > 1 && <p className="booth-shot-counter">Jepretan {capturedShots.length + 1} dari {requiredShots}</p>}
            <div className="booth-camera booth-camera-story">
              <div className="booth-camera-status" aria-hidden="true">
                <span className="status-pill status-live">Live</span>
                <span className="status-pill">Front cam</span>
                <span className="status-time">09:41</span>
              </div>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ filter: getLivePreviewFilter(), transform: mirrorMode === 'mirror' ? 'scaleX(-1)' : 'none', WebkitTransform: mirrorMode === 'mirror' ? 'scaleX(-1)' : 'none' }}
              />
              <span className="booth-camera-label">ready when you are</span>
              <button className="booth-shutter booth-shutter-floating" onClick={capturePhoto} disabled={isCapturing} aria-label="Ambil foto">
                <i>●</i>
                {isCapturing ? 'Memproses...' : requiredShots > 1 ? `Ambil ${capturedShots.length + 1}/${requiredShots}` : 'Ambil foto'}
              </button>
            </div>
            <div className="booth-actions">
              <button className="booth-button booth-button-quiet" onClick={() => { setCapturedShots([]); setStep('layout') }}>← Ganti gaya</button>
              <button className="booth-shutter booth-shutter-inline" onClick={capturePhoto} disabled={isCapturing}><i>●</i>{isCapturing ? 'Memproses...' : requiredShots > 1 ? `Ambil ${capturedShots.length + 1}/${requiredShots}` : 'Ambil foto'}</button>
            </div>
          </div>
        )}

        {step === 'review' && capturedPhoto && (
          <div className="booth-stage booth-result">
            <div className="booth-step-heading"><span>03 / 03</span><h2>that’s a <em>wrap!</em></h2><p>Jadikan momen ini kenangan yang bisa kamu bawa pulang.</p></div>
            <div className="booth-photo-print"><img src={capturedPhoto} alt="Hasil foto" /></div>
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
