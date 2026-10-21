import { loadImage } from './images'

interface ColorBucket {
  count: number
  red: number
  green: number
  blue: number
}

/**
 * Select a compact set of representative colors from RGBA pixels. Near-white,
 * near-black and low-saturation pixels are ignored when colorful pixels exist.
 */
export function extractColorsFromPixels(
  pixels: Uint8ClampedArray,
  limit = 5,
): string[] {
  const all = new Map<number, ColorBucket>()
  const colorful = new Map<number, ColorBucket>()

  for (let i = 0; i + 3 < pixels.length; i += 4) {
    const alpha = pixels[i + 3] ?? 0
    if (alpha < 128) continue
    const red = pixels[i] ?? 0
    const green = pixels[i + 1] ?? 0
    const blue = pixels[i + 2] ?? 0
    const key = ((red >> 3) << 10) | ((green >> 3) << 5) | (blue >> 3)
    addPixel(all, key, red, green, blue)

    const max = Math.max(red, green, blue)
    const min = Math.min(red, green, blue)
    const neutral = max - min < 24 || min > 242 || max < 12
    if (!neutral) addPixel(colorful, key, red, green, blue)
  }

  const buckets = colorful.size > 0 ? colorful : all
  return [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, Math.max(0, Math.floor(limit)))
    .map(({ count, red, green, blue }) =>
      `#${toHex(red / count)}${toHex(green / count)}${toHex(blue / count)}`,
    )
}

/** Extract representative local colors from an uploaded image data URL. */
export async function extractPaletteFromImage(source: string, limit = 5): Promise<string[]> {
  const image = await loadImage(source)
  const canvas = document.createElement('canvas')
  const size = 128
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Could not read colors from this image.')
  context.drawImage(image, 0, 0, size, size)
  const pixels = context.getImageData(0, 0, size, size).data
  return extractColorsFromPixels(pixels, limit)
}

function addPixel(
  buckets: Map<number, ColorBucket>,
  key: number,
  red: number,
  green: number,
  blue: number,
): void {
  const bucket = buckets.get(key)
  if (bucket) {
    bucket.count++
    bucket.red += red
    bucket.green += green
    bucket.blue += blue
  } else {
    buckets.set(key, { count: 1, red, green, blue })
  }
}

function toHex(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0')
}
