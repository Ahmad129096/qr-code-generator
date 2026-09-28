export interface RenderAssets {
  logo?: HTMLImageElement | null
  bg?: HTMLImageElement | null
}

const cache = new Map<string, Promise<HTMLImageElement>>()

export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = cache.get(src)
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Could not load image'))
      img.src = src
    })
    cache.set(src, p)
    // Drop rejected entries so a retry can succeed.
    p.catch(() => cache.delete(src))
  }
  return p
}

/** Load assets referenced by the current options. */
export async function loadAssets(options: {
  logo?: string | null
  bgImage?: string | null
}): Promise<RenderAssets> {
  const [logo, bg] = await Promise.all([
    options.logo ? loadImage(options.logo).catch(() => null) : null,
    options.bgImage ? loadImage(options.bgImage).catch(() => null) : null,
  ])
  return { logo, bg }
}

/** Read a file as a data URL, downscaling to maxDim (keeps transparency for PNG/WebP). */
export function fileToDataUrl(file: File, maxDim: number, keepAlpha = true): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.onload = () => {
      const src = String(reader.result || '')
      const img = new Image()
      img.onload = () => {
        const { naturalWidth: w, naturalHeight: h } = img
        if (w <= maxDim && h <= maxDim) {
          resolve(src)
          return
        }
        const scale = maxDim / Math.max(w, h)
        const tw = Math.max(1, Math.round(w * scale))
        const th = Math.max(1, Math.round(h * scale))
        const canvas = document.createElement('canvas')
        canvas.width = tw
        canvas.height = th
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(src)
          return
        }
        ctx.drawImage(img, 0, 0, tw, th)
        resolve(
          keepAlpha
            ? canvas.toDataURL('image/png')
            : canvas.toDataURL('image/jpeg', 0.85),
        )
      }
      img.onerror = () => reject(new Error('Not a valid image file'))
      img.src = src
    }
    reader.readAsDataURL(file)
  })
}
