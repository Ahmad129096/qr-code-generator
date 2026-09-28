import JSZip from 'jszip'
import type { QrOptions } from './options'
import { createModel, renderToCanvas, buildSvg, type QrModel } from './render'
import { loadAssets } from './images'

export interface BatchItem {
  value: string
  /** Used for the file name and PDF caption; falls back to a generated id. */
  label: string
}

export type BatchFormat = 'png' | 'svg' | 'both'

export class BatchParseError extends Error {}

/** Split a CSV line honouring quotes. */
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

const VALUE_KEYS = ['value', 'data', 'content', 'text', 'url', 'link', 'payload']
const LABEL_KEYS = ['label', 'name', 'title', 'filename', 'caption', 'id']

function pickKey(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const found = Object.keys(obj).find((ik) => ik.toLowerCase() === k)
    if (found && obj[found] != null && String(obj[found]).trim() !== '') {
      return String(obj[found]).trim()
    }
  }
  return null
}

/**
 * Parse CSV text into batch items. A header row is detected; otherwise the
 * first column is the value and the second (if present) the label.
 */
export function parseCsv(text: string): BatchItem[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  if (lines.length === 0) throw new BatchParseError('The CSV file is empty.')

  const first = splitCsvLine(lines[0]).map((h) => h.toLowerCase())
  const headerIdx = first.findIndex((h) => VALUE_KEYS.includes(h))
  const hasHeader = headerIdx >= 0 && lines.length > 1

  const items: BatchItem[] = []
  if (hasHeader) {
    const valueIdx = headerIdx
    const labelIdx = first.findIndex((h) => LABEL_KEYS.includes(h))
    if (valueIdx < 0) {
      throw new BatchParseError('No value column found (expected e.g. "url" or "value").')
    }
    for (const line of lines.slice(1)) {
      const cells = splitCsvLine(line)
      const value = cells[valueIdx]?.trim()
      if (!value) continue
      const label = labelIdx >= 0 ? cells[labelIdx]?.trim() : ''
      items.push({ value, label: label || '' })
    }
  } else {
    for (const line of lines) {
      const cells = splitCsvLine(line)
      const value = cells[0]?.trim()
      if (!value) continue
      items.push({ value, label: cells[1]?.trim() || '' })
    }
  }
  if (items.length === 0) throw new BatchParseError('No rows found in the CSV file.')
  return items
}

/** Parse JSON: an array of strings, or of objects with a value/label field. */
export function parseJson(text: string): BatchItem[] {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new BatchParseError('The JSON file is not valid JSON.')
  }
  const arr = Array.isArray(data) ? data : (data as { items?: unknown }).items
  if (!Array.isArray(arr)) {
    throw new BatchParseError('Expected a JSON array (or { "items": [...] }).')
  }
  const items: BatchItem[] = []
  for (const entry of arr) {
    if (typeof entry === 'string') {
      const value = entry.trim()
      if (value) items.push({ value, label: '' })
      continue
    }
    if (entry && typeof entry === 'object') {
      const rec = entry as Record<string, unknown>
      const value = pickKey(rec, VALUE_KEYS)
      if (!value) continue
      items.push({ value, label: pickKey(rec, LABEL_KEYS) ?? '' })
    }
  }
  if (items.length === 0) {
    throw new BatchParseError('No usable entries found in the JSON file.')
  }
  return items
}

function safeName(s: string, fallback: string): string {
  const cleaned = s
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 60)
    .replace(/-+$/g, '')
  return cleaned || fallback
}

/**
 * Generate a ZIP with one PNG/SVG per item. Uses each item's label as the
 * file name; duplicates get a numeric suffix.
 */
export async function generateZip(
  items: BatchItem[],
  options: QrOptions,
  format: BatchFormat,
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const zip = new JSZip()
  const assets = await loadAssets({ logo: options.logo, bgImage: options.bgImage })
  const used = new Set<string>()
  const failures: string[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    let model: QrModel
    try {
      model = createModel(item.value, options.errorCorrectionLevel)
    } catch {
      failures.push(item.label || item.value.slice(0, 30))
      onProgress?.(i + 1, items.length)
      continue
    }

    let base = safeName(item.label, `qr-${i + 1}`)
    let n = 2
    while (used.has(base.toLowerCase())) base = `${base}-${n++}`
    used.add(base.toLowerCase())

    if (format === 'png' || format === 'both') {
      const canvas = document.createElement('canvas')
      renderToCanvas(canvas, model, options, Math.min(4096, options.size * 4), assets)
      const dataUrl = canvas.toDataURL('image/png')
      zip.file(`${base}.png`, dataUrl.slice(dataUrl.indexOf(',') + 1), { base64: true })
    }
    if (format === 'svg' || format === 'both') {
      zip.file(`${base}.svg`, buildSvg(model, options, options.size))
    }
    onProgress?.(i + 1, items.length)
    // Yield to the event loop so the progress UI can repaint.
    if (i % 10 === 9) await new Promise((r) => setTimeout(r, 0))
  }

  if (used.size === 0) {
    throw new BatchParseError(
      failures.length > 0
        ? 'None of the entries could be encoded.'
        : 'Nothing to generate.',
    )
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  if (failures.length > 0) {
    console.warn('Skipped items that could not be encoded:', failures)
  }
  return blob
}
