import { defaultOptions, sanitizeOptions, type QrOptions } from './options'

/**
 * Everything needed to recreate a QR code from a link: which content type is
 * selected, the field values, and the visual style.
 */
export interface ShareState {
  /** Content type id, e.g. 'wifi'. */
  typeId: string
  /** Field values for the content type. */
  formData: Record<string, string | boolean>
  /** Visual style. Logo/background images are never included in a link. */
  options: QrOptions
}

/** Hash parameter that carries the encoded state. */
const HASH_KEY = 's'

/** Option keys that hold image data — too big for a URL, so they are skipped. */
const IMAGE_OPTION_KEYS = ['logo', 'bgImage'] as const

/** Encode a state into a URL fragment, e.g. `#s=eyJ0…`. */
export function encodeShareState(state: ShareState): string {
  const payload = {
    t: state.typeId,
    d: compactFormData(state.formData),
    o: compactOptions(state.options),
  }
  return `#${HASH_KEY}=${toBase64Url(JSON.stringify(payload))}`
}

/**
 * Decode a URL fragment produced by {@link encodeShareState}.
 * Returns null for anything that is not a valid, complete share state.
 */
export function decodeShareState(hash: string): ShareState | null {
  const payload = extractPayload(hash)
  if (!payload) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(fromBase64Url(payload))
  } catch {
    return null
  }
  if (!isPlainObject(parsed)) return null
  const typeId = parsed['t']
  if (typeof typeId !== 'string' || !typeId) return null
  const rawData = parsed['d']
  const rawOptions = parsed['o']
  return {
    typeId,
    formData: sanitizeFormData(rawData),
    options: sanitizeOptions(rawOptions),
  }
}

/** Build an absolute share URL for a state, replacing any existing fragment. */
export function buildShareUrl(baseUrl: string, state: ShareState): string {
  const base = baseUrl.split('#')[0] ?? baseUrl
  return `${base}${encodeShareState(state)}`
}

function extractPayload(hash: string): string | null {
  const cleaned = hash.replace(/^#/, '')
  if (!cleaned) return null
  const value = new URLSearchParams(cleaned).get(HASH_KEY)
  return value ? value : null
}

/** Keep only the fields the user actually filled in. */
function compactFormData(data: Record<string, string | boolean>): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {}
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'boolean') {
      if (value) out[key] = true
    } else if (value) {
      out[key] = value
    }
  }
  return out
}

/** Keep only the options that differ from the defaults, minus image data. */
function compactOptions(options: QrOptions): Partial<QrOptions> {
  const defaults = defaultOptions()
  const out: Partial<QrOptions> = {}
  for (const [key, value] of Object.entries(options)) {
    if ((IMAGE_OPTION_KEYS as readonly string[]).includes(key)) continue
    const fallback = (defaults as unknown as Record<string, unknown>)[key]
    if (value !== fallback) {
      out[key as keyof QrOptions] = value as never
    }
  }
  return out
}

function sanitizeFormData(raw: unknown): Record<string, string | boolean> {
  if (!isPlainObject(raw)) return {}
  const out: Record<string, string | boolean> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'boolean' || typeof value === 'string') out[key] = value
  }
  return out
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i] ?? 0)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}
