import jsQR from 'jsqr'

export interface DecodeResult {
  data: string
  /** Corner locations from jsQR, for drawing an overlay box. */
  location?: {
    topLeftCorner: { x: number; y: number }
    topRightCorner: { x: number; y: number }
    bottomLeftCorner: { x: number; y: number }
    bottomRightCorner: { x: number; y: number }
  }
}

/** Decode raw RGBA pixel data. Returns null when no code is found. */
export function decodeImageData(data: Uint8ClampedArray, width: number, height: number): DecodeResult | null {
  const res = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' })
  if (!res) return null
  return { data: res.data, location: res.location }
}

/** Decode a raster image (File, Blob, data URL or HTMLImageElement). */
export async function decodeImage(
  source: File | Blob | string | HTMLImageElement,
): Promise<DecodeResult | null> {
  const img = await toImage(source)
  const maxDim = 1600
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, w, h)
  const imageData = ctx.getImageData(0, 0, w, h)
  const result = decodeImageData(imageData.data, w, h)
  // Scale corner coordinates back to the original image space.
  if (result?.location && scale !== 1) {
    const inv = 1 / scale
    const loc = result.location
    for (const key of Object.keys(loc) as (keyof typeof loc)[]) {
      loc[key] = { x: loc[key].x * inv, y: loc[key].y * inv }
    }
  }
  return result
}

function toImage(source: File | Blob | string | HTMLImageElement): Promise<HTMLImageElement> {
  if (source instanceof HTMLImageElement) {
    if (source.complete && source.naturalWidth > 0) return Promise.resolve(source)
    return new Promise((resolve, reject) => {
      source.addEventListener('load', () => resolve(source), { once: true })
      source.addEventListener('error', () => reject(new Error('Image failed to load')), { once: true })
    })
  }
  const url =
    typeof source === 'string' ? source : URL.createObjectURL(source)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      if (typeof source !== 'string') setTimeout(() => URL.revokeObjectURL(url), 1000)
      resolve(img)
    }
    img.onerror = () => reject(new Error('Not a readable image'))
    img.src = url
  })
}

export interface ScannerHandle {
  stop: () => void
  /** Resolves once the camera has produced its first frame (or errored). */
  ready: Promise<void>
}

/**
 * Start scanning a <video> with the webcam. Calls onResult for every frame
 * that decodes (deduplicated by consecutive value). Returns a handle whose
 * stop() releases the camera.
 */
export function startScanner(
  video: HTMLVideoElement,
  onResult: (result: DecodeResult) => void,
  onError: (message: string) => void,
): ScannerHandle {
  let stream: MediaStream | null = null
  let stopped = false
  let raf = 0
  let frame = 0
  let last = ''
  let resolveReady: () => void
  let rejectReady: (e: Error) => void
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve
    rejectReady = reject
  })

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  const loop = () => {
    if (stopped) return
    raf = requestAnimationFrame(loop)
    frame++
    if (frame % 3 !== 0) return // ~20 checks/sec
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h || !ctx) return
    canvas.width = w
    canvas.height = h
    ctx.drawImage(video, 0, 0, w, h)
    const imageData = ctx.getImageData(0, 0, w, h)
    const res = decodeImageData(imageData.data, w, h)
    if (res && res.data !== last) {
      last = res.data
      onResult(res)
    }
  }

  navigator.mediaDevices
    ?.getUserMedia({ video: { facingMode: 'environment' } })
    .then((s) => {
      if (stopped) {
        s.getTracks().forEach((t) => t.stop())
        return
      }
      stream = s
      video.srcObject = s
      void video.play().catch(() => undefined)
      resolveReady()
      raf = requestAnimationFrame(loop)
    })
    .catch((err: unknown) => {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Camera permission was denied.'
          : 'Could not access the camera.'
      onError(msg)
      rejectReady(new Error(msg))
    })

  return {
    stop: () => {
      stopped = true
      cancelAnimationFrame(raf)
      if (stream) stream.getTracks().forEach((t) => t.stop())
      video.srcObject = null
      stream = null
    },
    ready,
  }
}
