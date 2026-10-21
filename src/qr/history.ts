import { sanitizeOptions, type QrOptions } from './options'

const HISTORY_KEY = 'qrg.history.v1'
const SAVED_KEY = 'qrg.saved.v1'
const MAX_HISTORY = 20

export interface HistoryEntry {
  id: string
  value: string
  /**
   * Content type id (e.g. 'wifi'). Older entries saved before this field
   * existed have no type — they can still be restored, but only with their
   * style, not their fields.
   */
  typeId?: string
  /** Field values for the content type, so a restore brings back the content. */
  formData?: Record<string, string | boolean>
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
  const list = read<unknown>(HISTORY_KEY)
  if (!Array.isArray(list)) return []
  return list.map(normalizeEntry).filter((e): e is HistoryEntry => e !== null)
}

/**
 * Coerce a stored entry into a valid shape. Entries saved by older versions
 * (no typeId/formData) are kept — they simply restore style only.
 */
function normalizeEntry(raw: unknown): HistoryEntry | null {
  if (typeof raw !== 'object' || raw === null) return null
  const e = raw as Partial<HistoryEntry>
  if (typeof e.value !== 'string') return null
  const formData = sanitizeFormData(e.formData)
  return {
    id: typeof e.id === 'string' && e.id ? e.id : uid(),
    value: e.value,
    typeId: typeof e.typeId === 'string' && e.typeId ? e.typeId : undefined,
    formData: formData && Object.keys(formData).length > 0 ? formData : undefined,
    options: sanitizeOptions(e.options),
    thumb: typeof e.thumb === 'string' ? e.thumb : '',
    at: typeof e.at === 'number' && Number.isFinite(e.at) ? e.at : Date.now(),
  }
}

function sanitizeFormData(raw: unknown): Record<string, string | boolean> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  const out: Record<string, string | boolean> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'boolean' || typeof value === 'string') out[key] = value
  }
  return out
}

/**
 * Push to the front of history, de-duplicating by value+type+style signature.
 */
export function pushHistory(entry: HistoryEntry): HistoryEntry[] {
  const list = loadHistory().filter(
    (e) =>
      !(
        e.value === entry.value &&
        e.typeId === entry.typeId &&
        sameStyle(e.options, entry.options)
      ),
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
