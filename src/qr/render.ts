import QRCode from 'qrcode'
import type { BitMatrix } from 'qrcode'
import { pathD, polyBBoxCenter, shapePoly, type Poly } from './geometry'
import { loadImage, type RenderAssets } from './images'
import type { QrOptions } from './options'

export type { RenderAssets }

export interface QrModel {
  value: string
  matrix: BitMatrix
}

export type FillSpec =
  | { mode: 'solid'; color: string }
  | { mode: 'linear'; c1: string; c2: string; x1: number; y1: number; x2: number; y2: number }
  | { mode: 'radial'; c1: string; c2: string; cx: number; cy: number; r: number }

export interface EyeLayout {
  frameD: string
  pupilD: string
  center: [number, number]
}

interface Layout {
  modulePx: number
  offset: number
  modules: number
  pixelSize: number
}

/** Encode the value; throws if the data does not fit at the chosen EC level. */
export function createModel(
  value: string,
  errorCorrectionLevel: QrOptions['errorCorrectionLevel'],
): QrModel {
  const qr = QRCode.create(value, { errorCorrectionLevel })
  return { value, matrix: qr.modules }
}

function layout(model: QrModel, options: QrOptions, pixelSize: number): Layout {
  const modules = model.matrix.size
  const totalModules = modules + options.margin * 2
  const modulePx = pixelSize / totalModules
  return { modulePx, offset: options.margin * modulePx, modules, pixelSize }
}

function isFinderCell(r: number, c: number, size: number): boolean {
  return (
    (r < 7 && c < 7) ||
    (r < 7 && c >= size - 7) ||
    (r >= size - 7 && c < 7)
  )
}

/** Combined path data for every non-finder module. */
function modulesPathData(model: QrModel, options: QrOptions, L: Layout): string {
  const { matrix } = model
  const size = matrix.size
  // Square modules get a slight outward overlap so fractional module sizes
  // don't leave hairline seams between adjacent cells.
  const overlap =
    options.moduleShape === 'square'
      ? Math.max(0.4, L.modulePx * 0.02)
      : 0
  let d = ''
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!matrix.get(r, c)) continue
      if (isFinderCell(r, c, size)) continue
      const x = L.offset + c * L.modulePx
      const y = L.offset + r * L.modulePx
      d += pathD(
        shapePoly(options.moduleShape, x, y, L.modulePx + overlap, L.modulePx + overlap),
      )
    }
  }
  return d
}

function eyesLayout(options: QrOptions, L: Layout): EyeLayout[] {
  const m = L.modulePx
  const positions: [number, number][] = [
    [0, 0],
    [0, L.modules - 7],
    [L.modules - 7, 0],
  ]
  return positions.map(([fr, fc]) => {
    const x = L.offset + fc * m
    const y = L.offset + fr * m
    const frameOuter = pathD(shapePoly(options.eyeFrameShape, x, y, 7 * m, 7 * m))
    const frameInner = pathD(shapePoly(options.eyeFrameShape, x + m, y + m, 5 * m, 5 * m))
    const pupil = pathD(shapePoly(options.eyePupilShape, x + 2 * m, y + 2 * m, 3 * m, 3 * m))
    return {
      frameD: `${frameOuter} ${frameInner}`,
      pupilD: pupil,
      center: [x + 3.5 * m, y + 3.5 * m] as [number, number],
    }
  })
}

export interface QrPaths {
  /** One polygon per non-finder module, in pixel coordinates. */
  modules: Poly[]
  /** Three finder eyes: outer ring polygons (outer, inner) and pupil polygon. */
  eyes: { frame: [Poly, Poly]; pupil: Poly; center: [number, number] }[]
}

/** Polygon-level view of the layout — used by the EPS exporter. */
export function buildPaths(model: QrModel, options: QrOptions, pixelSize: number): QrPaths {
  const L = layout(model, options, pixelSize)
  const { matrix } = model
  const size = matrix.size
  const overlap =
    options.moduleShape === 'square' ? Math.max(0.4, L.modulePx * 0.02) : 0
  const modules: Poly[] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!matrix.get(r, c)) continue
      if (isFinderCell(r, c, size)) continue
      const x = L.offset + c * L.modulePx
      const y = L.offset + r * L.modulePx
      modules.push(shapePoly(options.moduleShape, x, y, L.modulePx + overlap, L.modulePx + overlap))
    }
  }
  const m = L.modulePx
  const positions: [number, number][] = [
    [0, 0],
    [0, L.modules - 7],
    [L.modules - 7, 0],
  ]
  const eyes = positions.map(([fr, fc]) => {
    const x = L.offset + fc * m
    const y = L.offset + fr * m
    return {
      frame: [
        shapePoly(options.eyeFrameShape, x, y, 7 * m, 7 * m),
        shapePoly(options.eyeFrameShape, x + m, y + m, 5 * m, 5 * m),
      ] as [Poly, Poly],
      pupil: shapePoly(options.eyePupilShape, x + 2 * m, y + 2 * m, 3 * m, 3 * m),
      center: [x + 3.5 * m, y + 3.5 * m] as [number, number],
    }
  })
  return { modules, eyes }
}

export function fillSpec(options: QrOptions, S: number): FillSpec {
  if (options.fillMode === 'solid') {
    return { mode: 'solid', color: options.fgColor }
  }
  const c1 = options.fgColor
  const c2 = options.gradColor
  if (options.fillMode === 'radial') {
    return { mode: 'radial', c1, c2, cx: S / 2, cy: S / 2, r: Math.hypot(S / 2, S / 2) }
  }
  const a = (options.gradientAngle * Math.PI) / 180
  const dx = Math.cos(a)
  const dy = Math.sin(a)
  const half = ((Math.abs(dx) + Math.abs(dy)) * S) / 2
  const cx = S / 2
  const cy = S / 2
  return {
    mode: 'linear',
    c1,
    c2,
    x1: cx - dx * half,
    y1: cy - dy * half,
    x2: cx + dx * half,
    y2: cy + dy * half,
  }
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  }
  const n = parseInt(h.slice(0, 6) || '0', 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Sample the fill at a pixel coordinate — used by the EPS exporter. */
export function colorAt(spec: FillSpec, x: number, y: number): [number, number, number] {
  if (spec.mode === 'solid') return hexToRgb(spec.color)
  const c1 = hexToRgb(spec.c1)
  const c2 = hexToRgb(spec.c2)
  let t: number
  if (spec.mode === 'linear') {
    const dx = spec.x2 - spec.x1
    const dy = spec.y2 - spec.y1
    const lenSq = dx * dx + dy * dy || 1
    t = ((x - spec.x1) * dx + (y - spec.y1) * dy) / lenSq
  } else {
    t = Math.hypot(x - spec.cx, y - spec.cy) / (spec.r || 1)
  }
  t = Math.min(1, Math.max(0, t))
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]
}

function logoGeometry(options: QrOptions, S: number): {
  box: number
  plateBox: number
  x: number
  y: number
  plateX: number
  plateY: number
} | null {
  if (!options.logo) return null
  const box = options.logoSize * S
  const pad = S * 0.03
  const plateBox = options.logoPlate ? box + pad * 2 : box
  return {
    box,
    plateBox,
    x: (S - box) / 2,
    y: (S - box) / 2,
    plateX: (S - plateBox) / 2,
    plateY: (S - plateBox) / 2,
  }
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  S: number,
): void {
  const scale = Math.max(S / img.naturalWidth, S / img.naturalHeight)
  const w = img.naturalWidth * scale
  const h = img.naturalHeight * scale
  ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h)
}

export function renderToCanvas(
  canvas: HTMLCanvasElement,
  model: QrModel,
  options: QrOptions,
  pixelSize: number,
  assets: RenderAssets = {},
): void {
  const S = pixelSize
  if (canvas.width !== S || canvas.height !== S) {
    canvas.width = S
    canvas.height = S
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, S, S)

  // Background
  if (options.bgMode === 'color') {
    ctx.fillStyle = options.bgColor
    ctx.fillRect(0, 0, S, S)
  } else if (options.bgMode === 'image') {
    ctx.fillStyle = options.bgColor
    ctx.fillRect(0, 0, S, S)
    if (assets.bg) drawCover(ctx, assets.bg, S)
  }

  const L = layout(model, options, S)
  const spec = fillSpec(options, S)
  let fill: string | CanvasGradient
  if (spec.mode === 'solid') {
    fill = spec.color
  } else if (spec.mode === 'linear') {
    const g = ctx.createLinearGradient(spec.x1, spec.y1, spec.x2, spec.y2)
    g.addColorStop(0, spec.c1)
    g.addColorStop(1, spec.c2)
    fill = g
  } else {
    const g = ctx.createRadialGradient(spec.cx, spec.cy, 0, spec.cx, spec.cy, spec.r)
    g.addColorStop(0, spec.c1)
    g.addColorStop(1, spec.c2)
    fill = g
  }

  // Modules
  const modulesD = modulesPathData(model, options, L)
  if (modulesD) {
    ctx.fillStyle = fill
    ctx.fill(new Path2D(modulesD))
  }

  // Eyes: frame ring (even-odd) + pupil
  ctx.fillStyle = fill
  for (const eye of eyesLayout(options, L)) {
    if (eye.frameD) ctx.fill(new Path2D(eye.frameD), 'evenodd')
    if (eye.pupilD) ctx.fill(new Path2D(eye.pupilD))
  }

  // Logo
  const logo = logoGeometry(options, S)
  if (logo && options.logo) {
    if (options.logoPlate) {
      ctx.fillStyle = '#ffffff'
      ctx.fill(
        new Path2D(
          pathD(shapePoly(options.logoShape, logo.plateX, logo.plateY, logo.plateBox, logo.plateBox)),
        ),
      )
    }
    if (assets.logo) {
      const img = assets.logo
      const scale = Math.min(logo.box / img.naturalWidth, logo.box / img.naturalHeight)
      const w = img.naturalWidth * scale
      const h = img.naturalHeight * scale
      const dx = logo.x + (logo.box - w) / 2
      const dy = logo.y + (logo.box - h) / 2
      ctx.save()
      ctx.clip(
        new Path2D(
          pathD(shapePoly(options.logoShape, logo.x, logo.y, logo.box, logo.box)),
        ),
      )
      ctx.drawImage(img, dx, dy, w, h)
      ctx.restore()
    }
  }
}

export function buildSvg(model: QrModel, options: QrOptions, pixelSize: number): string {
  const S = pixelSize
  const L = layout(model, options, S)
  const spec = fillSpec(options, S)
  const parts: string[] = []

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">`,
  )

  if (spec.mode !== 'solid') {
    const stops = `<stop offset="0" stop-color="${spec.c1}"/><stop offset="1" stop-color="${spec.c2}"/>`
    if (spec.mode === 'linear') {
      parts.push(
        `<defs><linearGradient id="qrf" gradientUnits="userSpaceOnUse" x1="${spec.x1.toFixed(2)}" y1="${spec.y1.toFixed(2)}" x2="${spec.x2.toFixed(2)}" y2="${spec.y2.toFixed(2)}">${stops}</linearGradient></defs>`,
      )
    } else {
      parts.push(
        `<defs><radialGradient id="qrf" gradientUnits="userSpaceOnUse" cx="${spec.cx.toFixed(2)}" cy="${spec.cy.toFixed(2)}" r="${spec.r.toFixed(2)}">${stops}</radialGradient></defs>`,
      )
    }
  }
  const paint = spec.mode === 'solid' ? spec.color : 'url(#qrf)'

  if (options.bgMode === 'color') {
    parts.push(`<rect width="${S}" height="${S}" fill="${options.bgColor}"/>`)
  } else if (options.bgMode === 'image' && options.bgImage) {
    if (options.bgColor) {
      parts.push(`<rect width="${S}" height="${S}" fill="${options.bgColor}"/>`)
    }
    parts.push(
      `<image href="${options.bgImage}" width="${S}" height="${S}" preserveAspectRatio="xMidYMid slice"/>`,
    )
  }

  const modulesD = modulesPathData(model, options, L)
  if (modulesD) parts.push(`<path d="${modulesD}" fill="${paint}"/>`)

  for (const eye of eyesLayout(options, L)) {
    if (eye.frameD) {
      parts.push(`<path d="${eye.frameD}" fill="${paint}" fill-rule="evenodd"/>`)
    }
    if (eye.pupilD) parts.push(`<path d="${eye.pupilD}" fill="${paint}"/>`)
  }

  const logo = logoGeometry(options, S)
  if (logo && options.logo) {
    if (options.logoPlate) {
      parts.push(
        `<path d="${pathD(shapePoly(options.logoShape, logo.plateX, logo.plateY, logo.plateBox, logo.plateBox))}" fill="#ffffff"/>`,
      )
    }
    const clipShape = pathD(
      shapePoly(options.logoShape, logo.x, logo.y, logo.box, logo.box),
    )
    parts.push(`<clipPath id="lgc"><path d="${clipShape}"/></clipPath>`)
    parts.push(
      `<image href="${options.logo}" x="${logo.x.toFixed(2)}" y="${logo.y.toFixed(2)}" width="${logo.box.toFixed(2)}" height="${logo.box.toFixed(2)}" preserveAspectRatio="xMidYMid meet" clip-path="url(#lgc)"/>`,
    )
  }

  parts.push('</svg>')
  return parts.join('')
}

/** Render a small PNG thumbnail for history previews. */
export async function renderThumb(
  value: string,
  options: QrOptions,
  size = 96,
): Promise<string> {
  try {
    const model = createModel(value, options.errorCorrectionLevel)
    const assets: RenderAssets = {
      logo: options.logo ? await loadImage(options.logo) : null,
      bg: options.bgImage ? await loadImage(options.bgImage) : null,
    }
    const canvas = document.createElement('canvas')
    renderToCanvas(canvas, model, options, size, assets)
    return canvas.toDataURL('image/png')
  } catch {
    return ''
  }
}

export { polyBBoxCenter }
export type { Poly }
