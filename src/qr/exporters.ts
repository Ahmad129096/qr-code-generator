import type { QrOptions } from './options'
import {
  buildPaths,
  colorAt,
  createModel,
  fillSpec,
  buildSvg,
  renderToCanvas,
  type QrModel,
} from './render'
import { loadAssets, type RenderAssets } from './images'
import { epsPath, polyBBoxCenter } from './geometry'

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

async function assetsFor(opts: QrOptions): Promise<RenderAssets> {
  return loadAssets({ logo: opts.logo, bgImage: opts.bgImage })
}

/** High-DPI PNG: renders directly at the requested pixel size. */
export async function exportPng(
  model: QrModel,
  opts: QrOptions,
  scale = 8,
): Promise<void> {
  const px = Math.min(8192, Math.round(opts.size * scale))
  const assets = await assetsFor(opts)
  const canvas = document.createElement('canvas')
  renderToCanvas(canvas, model, opts, px, assets)
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  )
  if (blob) downloadBlob(blob, `qr-code-${scale}x.png`)
}

export function exportSvg(model: QrModel, opts: QrOptions): void {
  const svg = buildSvg(model, opts, opts.size)
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  downloadBlob(blob, 'qr-code.svg')
}

const PT_PER_MM = 72 / 25.4

/**
 * Encapsulated PostScript. PostScript has no gradients, so the gradient is
 * sampled per module. Coordinates are converted in JS (y is flipped there
 * rather than via a transform) so the file stays plain EPS.
 */
export function exportEps(model: QrModel, opts: QrOptions, caption?: string): void {
  const k = (opts.printSizeMm ?? 40) * PT_PER_MM / (model.matrix.size + opts.margin * 2)
  const total = model.matrix.size + opts.margin * 2
  const box = total * k
  const mapX = (x: number) => x * k
  const mapY = (y: number) => (total - y) * k

  const spec = fillSpec(opts, box)
  const rgb = (x: number, y: number): string => {
    const [r, g, b] = colorAt(spec, x * k, y * k)
    return `${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)} setrgbcolor`
  }

  const paths = buildPaths(model, opts, box)
  const lines: string[] = []
  lines.push('%!PS-Adobe-3.0 EPSF-3.0')
  lines.push(`%%BoundingBox: 0 0 ${Math.ceil(box)} ${Math.ceil(box)}`)
  lines.push('%%Title: QR Code')
  lines.push('%%Creator: QR Code Generator')
  lines.push('%%EndComments')
  lines.push('gsave')

  // Background (skipped for transparency — EPS itself has no alpha here)
  if (opts.bgMode === 'color' || opts.bgMode === 'image') {
    lines.push(`${hexToPs(opts.bgColor)}`)
    lines.push(`0 0 moveto ${box.toFixed(2)} 0 lineto ${box.toFixed(2)} ${box.toFixed(2)} lineto 0 ${box.toFixed(2)} lineto closepath fill`)
  }

  for (const poly of paths.modules) {
    const [cx, cy] = polyBBoxCenter(poly)
    lines.push(rgb(cx, cy))
    lines.push(epsPath(poly, mapX, mapY))
    lines.push('fill')
  }
  for (const eye of paths.eyes) {
    const [cx, cy] = polyBBoxCenter(eye.frame[0])
    lines.push(rgb(cx, cy))
    lines.push(epsPath(eye.frame[0], mapX, mapY))
    lines.push(epsPath(eye.frame[1], mapX, mapY))
    lines.push('eofill')
    const [px, py] = polyBBoxCenter(eye.pupil)
    lines.push(rgb(px, py))
    lines.push(epsPath(eye.pupil, mapX, mapY))
    lines.push('fill')
  }
  lines.push('grestore')

  if (caption) {
    lines.push('/Helvetica findfont 9 scalefont setfont')
    lines.push(`${(box / 2).toFixed(2)} ${(-14).toFixed(2)} moveto`)
    lines.push(`(${psEscape(caption)}) show`)
  }
  lines.push('showpage')
  lines.push('%%EOF')
  const blob = new Blob([lines.join('\n')], { type: 'application/postscript' })
  downloadBlob(blob, 'qr-code.eps')
}

/**
 * Print-ready PDF: fixed physical size, margin between codes, optional caption,
 * tiled across an A4 page.
 */
export async function exportPdf(
  model: QrModel,
  opts: QrOptions,
  caption?: string,
): Promise<void> {
  // jsPDF is heavy — load it only when a PDF is actually requested.
  const { jsPDF } = await import('jspdf')
  const sizeMm = opts.printSizeMm ?? 40
  const gap = opts.printMarginMm ?? 8
  const assets = await assetsFor(opts)

  const px = Math.min(4096, Math.round(sizeMm * 12))
  const canvas = document.createElement('canvas')
  renderToCanvas(canvas, model, opts, px, assets)
  const png = canvas.toDataURL('image/png')

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const captionH = caption ? 6 : 0
  const cellW = sizeMm + gap
  const cellH = sizeMm + captionH + gap

  const cols = Math.max(1, Math.floor((pageW - gap) / cellW))
  const rows = Math.max(1, Math.floor((pageH - gap) / cellH))
  let printed = 0

  const sheet = () => {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = gap / 2 + c * cellW + gap / 2
        const y = gap / 2 + r * cellH + gap / 2
        doc.addImage(png, 'PNG', x, y, sizeMm, sizeMm, undefined, 'FAST')
        if (caption) {
          doc.setFontSize(8)
          doc.text(caption, x + sizeMm / 2, y + sizeMm + 4, { align: 'center' })
        }
        printed++
      }
    }
  }

  sheet()
  void printed
  doc.save('qr-code.pdf')
}

/** Copy a rendered PNG into the clipboard. Returns false where unsupported. */
export async function copyImageToClipboard(
  model: QrModel,
  opts: QrOptions,
): Promise<boolean> {
  try {
    const assets = await assetsFor(opts)
    const canvas = document.createElement('canvas')
    renderToCanvas(canvas, model, opts, 1024, assets)
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/png')
    })
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    return true
  } catch {
    return false
  }
}

function hexToPs(hex: string): string {
  const n = parseInt(hex.replace('#', '').slice(0, 6) || '0', 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  return `${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)} setrgbcolor`
}

function psEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

export function canCopyImage(): boolean {
  return typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write
}

export { createModel }
