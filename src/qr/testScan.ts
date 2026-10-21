import { decodeImageData } from './decode'
import type { QrOptions } from './options'
import { renderToCanvas, type QrModel } from './render'

export interface TestScanResult {
  /** True when the rendered code decodes back to exactly the expected value. */
  pass: boolean
  /** What the decoder actually read, or null when nothing was found. */
  decoded: string | null
  /** The value the code should contain. */
  expected: string
}

/** Decoded-render size in pixels — comfortably above phone-camera resolution. */
const SCAN_SIZE = 480

/**
 * In-browser "test scan": render the code exactly as it would be exported,
 * then decode it again with jsQR. Catches styling choices that break
 * scanning (contrast, oversized logos, decorative shapes, missing quiet zone).
 *
 * Transparent backgrounds are composited over white, as if printed on paper.
 * This is a best-case check — a crisp render is easier to read than a
 * camera photo — so a pass is reassuring, not a guarantee.
 */
export function testScan(model: QrModel, options: QrOptions): TestScanResult {
  const expected = model.value
  const rendered = document.createElement('canvas')
  renderToCanvas(rendered, model, options, SCAN_SIZE)

  // Flatten onto white paper so transparent pixels don't read as black.
  const canvas = document.createElement('canvas')
  canvas.width = SCAN_SIZE
  canvas.height = SCAN_SIZE
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { pass: false, decoded: null, expected }
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, SCAN_SIZE, SCAN_SIZE)
  ctx.drawImage(rendered, 0, 0)

  const imageData = ctx.getImageData(0, 0, SCAN_SIZE, SCAN_SIZE)
  const result = decodeImageData(imageData.data, SCAN_SIZE, SCAN_SIZE)
  return {
    pass: result !== null && result.data === expected,
    decoded: result?.data ?? null,
    expected,
  }
}
