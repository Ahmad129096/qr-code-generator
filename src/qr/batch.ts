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

export const MAX_BATCH_FILE_BYTES = 1024 * 1024
export const MAX_BATCH_INPUT_CHARACTERS = 1_000_000
export const MAX_BATCH_ITEMS = 100
export const MAX_BATCH_VALUE_BYTES = 2048

export class BatchParseError extends Error {}

export interface BatchGenerationResult {
  blob: Blob
  skipped: string[]
}

function assertInputSize(text: string): void {
  if (text.length > MAX_BATCH_INPUT_CHARACTERS) {
    throw new BatchParseError(
      `Input is too large. Keep pasted or uploaded data under ${MAX_BATCH_INPUT_CHARACTERS.toLocaleString()} characters.`,
    )
  }
}

/** Parse CSV records, including quoted commas, escaped quotes and newlines. */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let afterQuote = false

  const finishField = () => {
    row.push(field.trim())
    field = ''
    afterQuote = false
  }
  const finishRow = () => {
    finishField()
    if (row.some((cell) => cell.length > 0)) rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i] ?? ''
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
          afterQuote = true
        }
      } else {
        field += ch
      }
      continue
    }

    if (afterQuote) {
      if (ch === ',') {
        finishField()
      } else if (ch === '\r' || ch === '\n') {
        finishRow()
        if (ch === '\r' && text[i + 1] === '\n') i++
      } else if (!/\s/.test(ch)) {
        throw new BatchParseError('Unexpected content after a quoted CSV field.')
      }
      continue
    }

    if (ch === '"') {
      if (field.trim() !== '') {
        throw new BatchParseError('A quote can only start at the beginning of a CSV field.')
      }
      field = ''
      inQuotes = true
    } else if (ch === ',') {
      finishField()
    } else if (ch === '\r' || ch === '\n') {
      finishRow()
      if (ch === '\r' && text[i + 1] === '\n') i++
    } else {
      field += ch
    }
  }

  if (inQuotes) throw new BatchParseError('A quoted CSV field was not closed.')
  if (field.length > 0 || row.length > 0 || afterQuote) finishRow()
  return rows
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
  assertInputSize(text)
  const rows = parseCsvRows(text)
  if (rows.length === 0) throw new BatchParseError('The CSV file is empty.')

  const first = (rows[0] ?? []).map((h) => h.toLowerCase())
  const headerIdx = first.findIndex((h) => VALUE_KEYS.includes(h))
  const hasHeader = headerIdx >= 0

  const items: BatchItem[] = []
  if (hasHeader) {
    if (rows.length === 1) throw new BatchParseError('The CSV header has no data rows.')
    const valueIdx = headerIdx
    const labelIdx = first.findIndex((h) => LABEL_KEYS.includes(h))
    for (const cells of rows.slice(1)) {
      const value = cells[valueIdx]?.trim()
      if (!value) continue
      const label = labelIdx >= 0 ? cells[labelIdx]?.trim() : ''
      items.push({ value, label: label || '' })
    }
  } else {
    for (const cells of rows) {
      const value = cells[0]?.trim()
      if (!value) continue
      items.push({ value, label: cells[1]?.trim() || '' })
    }
  }
  if (items.length === 0) throw new BatchParseError('No rows found in the CSV file.')
  return validateBatchItems(items)
}

/** Parse JSON: an array of strings, or of objects with a value/label field. */
export function parseJson(text: string): BatchItem[] {
  assertInputSize(text)
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new BatchParseError('The JSON file is not valid JSON.')
  }
  const arr = Array.isArray(data) ? data : isRecord(data) ? data['items'] : null
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
  return validateBatchItems(items)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateBatchItems(items: BatchItem[]): BatchItem[] {
  if (items.length > MAX_BATCH_ITEMS) {
    throw new BatchParseError(`A batch can contain at most ${MAX_BATCH_ITEMS} codes.`)
  }
  const encoder = new TextEncoder()
  for (const [index, item] of items.entries()) {
    if (encoder.encode(item.value).byteLength > MAX_BATCH_VALUE_BYTES) {
      throw new BatchParseError(
        `Row ${index + 1} is too long. Each QR value must be at most ${MAX_BATCH_VALUE_BYTES.toLocaleString()} UTF-8 bytes.`,
      )
    }
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

function skippedLabel(item: BatchItem, index: number): string {
  const label = (item.label || item.value).replace(/\s+/g, ' ').trim()
  if (!label) return `Row ${index + 1}`
  return label.length > 60 ? `${label.slice(0, 57)}...` : label
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
): Promise<BatchGenerationResult> {
  validateBatchItems(items)
  if (items.length === 0) throw new BatchParseError('Nothing to generate.')
  const zip = new JSZip()
  const assets = await loadAssets({ logo: options.logo, bgImage: options.bgImage })
  const used = new Set<string>()
  const skipped: string[] = []

  for (const [i, item] of items.entries()) {
    let model: QrModel
    try {
      model = createModel(item.value, options.errorCorrectionLevel)
    } catch {
      skipped.push(skippedLabel(item, i))
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
      skipped.length > 0
        ? `None of the entries could be encoded. Skipped: ${skipped.slice(0, 5).join(', ')}${skipped.length > 5 ? ` and ${skipped.length - 5} more` : ''}.`
        : 'Nothing to generate.',
    )
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  return { blob, skipped }
}
