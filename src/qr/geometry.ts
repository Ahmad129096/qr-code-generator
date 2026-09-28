import type {
  EyeFrameShape,
  EyePupilShape,
  ModuleShape,
} from './options'

/** Flat polygon: [x0, y0, x1, y1, ...]. Closed implicitly. */
export type Poly = number[]

const TAU = Math.PI * 2

function arcPoints(
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
  seg: number,
): number[] {
  if (r <= 0) return [cx, cy]
  const pts: number[] = []
  for (let i = 0; i <= seg; i++) {
    const a = a0 + (a1 - a0) * (i / seg)
    pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a))
  }
  return pts
}

export function roundedRectPoly(
  x: number,
  y: number,
  w: number,
  h: number,
  radii: [number, number, number, number],
  seg = 8,
): Poly {
  const maxR = Math.min(w, h) / 2
  const clamped = radii.map((v) => Math.min(Math.max(v, 0), maxR))
  const [tl, tr, br, bl] = clamped
  const pts: number[] = []
  pts.push(...arcPoints(x + tl, y + tl, tl, Math.PI, Math.PI * 1.5, seg))
  pts.push(...arcPoints(x + w - tr, y + tr, tr, Math.PI * 1.5, TAU, seg))
  pts.push(...arcPoints(x + w - br, y + h - br, br, 0, Math.PI * 0.5, seg))
  pts.push(...arcPoints(x + bl, y + h - bl, bl, Math.PI * 0.5, Math.PI, seg))
  return pts
}

export function circlePoly(cx: number, cy: number, r: number, seg = 36): Poly {
  const pts: number[] = []
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * TAU
    pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a))
  }
  return pts
}

function diamondPoly(x: number, y: number, w: number, h: number): Poly {
  return [x + w / 2, y, x + w, y + h / 2, x + w / 2, y + h, x, y + h / 2]
}

function starPoly(cx: number, cy: number, outer: number, inner: number, points = 5): Poly {
  const pts: number[] = []
  const step = Math.PI / points
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = -Math.PI / 2 + i * step
    pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a))
  }
  return pts
}

function heartPoly(x: number, y: number, w: number, h: number, samples = 48): Poly {
  const raw: number[] = []
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * TAU
    const hx = 16 * Math.pow(Math.sin(t), 3)
    const hy =
      13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
    raw.push(hx, hy)
    minX = Math.min(minX, hx)
    maxX = Math.max(maxX, hx)
    minY = Math.min(minY, hy)
    maxY = Math.max(maxY, hy)
  }
  const sx = w / (maxX - minX || 1)
  const sy = h / (maxY - minY || 1)
  const pts: number[] = []
  for (let i = 0; i < raw.length; i += 2) {
    pts.push(x + (raw[i] - minX) * sx, y + (maxY - raw[i + 1]) * sy)
  }
  return pts
}

/** Build the polygon for a shape filling the given box. */
export function shapePoly(shape: ModuleShape | EyeFrameShape | EyePupilShape | 'square', x: number, y: number, w: number, h: number): Poly {
  switch (shape) {
    case 'square':
      return [x, y, x + w, y, x + w, y + h, x, y + h]
    case 'rounded': {
      const r = Math.min(w, h) * 0.32
      return roundedRectPoly(x, y, w, h, [r, r, r, r])
    }
    case 'dot':
    case 'circle':
      return circlePoly(x + w / 2, y + h / 2, Math.min(w, h) / 2)
    case 'diamond':
      return diamondPoly(x, y, w, h)
    case 'leaf': {
      const r = Math.min(w, h) / 2
      return roundedRectPoly(x, y, w, h, [r, 0, r, 0])
    }
    case 'star':
      return starPoly(x + w / 2, y + h / 2, Math.min(w, h) / 2, Math.min(w, h) * 0.24)
    case 'heart':
      return heartPoly(x, y, w, h)
    default:
      return [x, y, x + w, y, x + w, y + h, x, y + h]
  }
}

function num(v: number): string {
  return String(Math.round(v * 100) / 100)
}

/** SVG path data for a polygon (M/L/Z only). */
export function pathD(poly: Poly): string {
  if (poly.length < 4) return ''
  let d = `M${num(poly[0])} ${num(poly[1])}`
  for (let i = 2; i < poly.length; i += 2) {
    d += `L${num(poly[i])} ${num(poly[i + 1])}`
  }
  return d + 'Z'
}

/** PostScript path operators for a polygon (absolute coords, y already flipped by caller). */
export function epsPath(poly: Poly, mapX: (x: number) => number, mapY: (y: number) => number): string {
  if (poly.length < 4) return ''
  const parts: string[] = [`${mapX(poly[0]).toFixed(2)} ${mapY(poly[1]).toFixed(2)} moveto`]
  for (let i = 2; i < poly.length; i += 2) {
    parts.push(`${mapX(poly[i]).toFixed(2)} ${mapY(poly[i + 1]).toFixed(2)} lineto`)
  }
  parts.push('closepath')
  return parts.join('\n')
}

export function polyBBoxCenter(poly: Poly): [number, number] {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i < poly.length; i += 2) {
    minX = Math.min(minX, poly[i])
    maxX = Math.max(maxX, poly[i])
    minY = Math.min(minY, poly[i + 1])
    maxY = Math.max(maxY, poly[i + 1])
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2]
}
