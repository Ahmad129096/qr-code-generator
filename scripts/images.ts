import { deflateSync } from 'node:zlib'
import QRCode from 'qrcode'

/**
 * A tiny PNG writer and raster helper.
 *
 * The app has no image-processing dependency, and the PWA icons plus the
 * Open Graph image only need flat shapes, so a small encoder is enough
 * (and keeps the dependency list short).
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Uint8Array): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), Buffer.from(data)])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([length, body, crc])
}

/** Encode 8-bit RGBA pixels as a PNG. */
export function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', new Uint8Array(0)),
  ])
}

export interface Rgb {
  r: number
  g: number
  b: number
}

/** A simple RGBA raster with the few primitives the icons need. */
export class Raster {
  readonly width: number
  readonly height: number
  readonly pixels: Uint8Array

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.pixels = new Uint8Array(width * height * 4)
  }

  set(x: number, y: number, color: Rgb, alpha = 1): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return
    const i = (y * this.width + x) * 4
    const a = Math.max(0, Math.min(1, alpha))
    this.pixels[i] = Math.round(color.r * a + this.pixels[i]! * (1 - a))
    this.pixels[i + 1] = Math.round(color.g * a + this.pixels[i + 1]! * (1 - a))
    this.pixels[i + 2] = Math.round(color.b * a + this.pixels[i + 2]! * (1 - a))
    this.pixels[i + 3] = Math.round(255 * a + this.pixels[i + 3]! * (1 - a))
  }

  rect(x: number, y: number, w: number, h: number, color: Rgb, alpha = 1): void {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) this.set(x + dx, y + dy, color, alpha)
    }
  }

  /** A rectangle with rounded corners (no anti-aliasing). */
  roundedRect(
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
    color: Rgb,
    alpha = 1,
  ): void {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const cx = Math.min(Math.max(x + dx, x + radius), x + w - radius - 1)
        const cy = Math.min(Math.max(y + dy, y + radius), y + h - radius - 1)
        const dist = Math.hypot(x + dx - cx, y + dy - cy)
        if (dist <= radius) this.set(x + dx, y + dy, color, alpha)
      }
    }
  }

  /** A linear gradient across the whole raster. */
  gradient(from: Rgb, to: Rgb, diagonal = true): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const t = diagonal
          ? (x / Math.max(1, this.width - 1) + y / Math.max(1, this.height - 1)) / 2
          : x / Math.max(1, this.width - 1)
        this.set(x, y, {
          r: from.r + (to.r - from.r) * t,
          g: from.g + (to.g - from.g) * t,
          b: from.b + (to.b - from.b) * t,
        })
      }
    }
  }
}

export const ACCENT: Rgb = { r: 0x4c, g: 0x4f, b: 0xe0 }
export const CYAN: Rgb = { r: 0x22, g: 0xd3, b: 0xee }
export const INK: Rgb = { r: 0x11, g: 0x14, b: 0x1c }
export const WHITE: Rgb = { r: 0xff, g: 0xff, b: 0xff }

/**
 * Draw a QR code (real, from the `qrcode` package) into a raster.
 * Returns the drawn bounds so callers can centre it.
 */
export function drawQr(
  raster: Raster,
  text: string,
  originX: number,
  originY: number,
  boxSize: number,
  color: Rgb,
  quietModules = 2,
): { width: number; height: number } {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' })
  const count = qr.modules.size
  const data = qr.modules.data
  const total = (count + quietModules * 2) * boxSize
  for (let y = 0; y < count; y++) {
    for (let x = 0; x < count; x++) {
      if (!data[y * count + x]) continue
      const px = originX + (x + quietModules) * boxSize
      const py = originY + (y + quietModules) * boxSize
      raster.rect(px, py, boxSize, boxSize, color)
    }
  }
  return { width: total, height: total }
}

/** The app icon: a rounded square with the QR code inside. */
export function buildIcon(size: number, text: string, maskable = false): Buffer {
  const raster = new Raster(size, size)
  const radius = maskable ? 0 : Math.round(size * 0.22)
  if (maskable) {
    raster.gradient(ACCENT, CYAN)
  } else {
    raster.roundedRect(0, 0, size, size, radius, WHITE)
  }
  const quiet = maskable ? 5 : 2
  // Fit the QR (with its quiet zone) into the safe area.
  const probe = QRCode.create(text, { errorCorrectionLevel: 'M' })
  const modules = probe.modules.size + quiet * 2
  const boxSize = Math.floor((size * (maskable ? 0.62 : 0.86)) / modules)
  const drawn = (probe.modules.size + quiet * 2) * boxSize
  const origin = Math.floor((size - drawn) / 2)
  drawQr(raster, text, origin, origin, boxSize, maskable ? WHITE : INK, quiet)
  return encodePng(size, size, raster.pixels)
}

/** The Open Graph image: 1200x630 with the QR code on a branded card. */
export function buildOgImage(text: string): Buffer {
  const width = 1200
  const height = 630
  const raster = new Raster(width, height)
  raster.gradient(ACCENT, CYAN)
  const cardSize = 470
  const cardX = Math.round((width - cardSize) / 2)
  const cardY = Math.round((height - cardSize) / 2)
  raster.roundedRect(cardX, cardY, cardSize, cardSize, 28, WHITE)
  const probe = QRCode.create(text, { errorCorrectionLevel: 'M' })
  const quiet = 2
  const modules = probe.modules.size + quiet * 2
  const boxSize = Math.floor((cardSize * 0.86) / modules)
  const drawn = modules * boxSize
  const origin = cardX + Math.round((cardSize - drawn) / 2)
  drawQr(raster, text, origin, origin, boxSize, INK, quiet)
  return encodePng(width, height, raster.pixels)
}
