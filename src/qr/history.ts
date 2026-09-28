import type { QrOptions } from './options'

const HISTORY_KEY = 'qrg.history.v1'
const SAVED_KEY = 'qrg.saved.v1'
const MAX_HISTORY = 20

export interface HistoryEntry {
  id: string
  value: string
  options: QrOptions
  /** dataURL PNG thumbnail. */
  thumb: string
  at: number
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota exceeded — shed the heaviest fields and retry progressively.
    if (key !== HISTORY_KEY || !Array.isArray(value)) return
    const light = (value as HistoryEntry[]).map((e) => ({ ...e, thumb: '' }))
    try {
      localStorage.setItem(key, JSON.stringify(light))
      return
    } catch {
      /* fall through */
    }
    const lighter = light.map((e) => ({ ...e, options: { ...e.options, bgImage: null } }))
    try {
      localStorage.setItem(key, JSON.stringify(lighter))
    } catch {
      /* give up silently */
    }
  }
}

export function loadHistory(): HistoryEntry[] {
  const list = read<HistoryEntry[]>(HISTORY_KEY)
  return Array.isArray(list) ? list : []
}

/** Push to the front of history, de-duplicating by value+style signature. */
export function pushHistory(entry: HistoryEntry): HistoryEntry[] {
  const list = loadHistory().filter(
    (e) => !(e.value === entry.value && sameStyle(e.options, entry.options)),
  )
  list.unshift(entry)
  const trimmed = list.slice(0, MAX_HISTORY)
  write(HISTORY_KEY, trimmed)
  return trimmed
}

export function removeHistory(id: string): HistoryEntry[] {
  const list = loadHistory().filter((e) => e.id !== id)
  write(HISTORY_KEY, list)
  return list
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch {
    /* ignore */
  }
}

export interface SavedPreset {
  id: string
  name: string
  options: QrOptions
  at: number
}

export function loadSaved(): SavedPreset[] {
  const list = read<SavedPreset[]>(SAVED_KEY)
  return Array.isArray(list) ? list : []
}

export function savePreset(name: string, options: QrOptions): SavedPreset[] {
  const list = loadSaved().filter((p) => p.name !== name)
  list.unshift({ id: uid(), name, options, at: Date.now() })
  write(SAVED_KEY, list)
  return list
}

export function removeSaved(id: string): SavedPreset[] {
  const list = loadSaved().filter((p) => p.id !== id)
  write(SAVED_KEY, list)
  return list
}

/** A stable-ish signature of the visual style (ignores print/size fields). */
export function styleSignature(o: QrOptions): string {
  return [
    o.fillMode,
    o.fgColor,
    o.gradColor,
    o.gradientAngle,
    o.bgMode,
    o.bgColor,
    o.moduleShape,
    o.eyeFrameShape,
    o.eyePupilShape,
    o.logo ?? '',
    o.logoSize,
    o.logoShape,
    o.logoPlate ? 1 : 0,
    o.margin,
    o.errorCorrectionLevel,
  ].join('|')
}

function sameStyle(a: QrOptions, b: QrOptions): boolean {
  return styleSignature(a) === styleSignature(b)
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
