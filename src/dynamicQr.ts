const OWNER_KEY_STORAGE = 'qr-dynamic-owner-key-v1'

export interface DynamicConfig {
  turnstileSiteKey: string
  redirectHost: string
}

export interface DynamicCode {
  id: string
  slug: string
  destination: string
  expiresAt: number | null
  maxScans: number
  monthlyScans: number
  customDomain: string | null
  disabledAt: number | null
}

export interface DynamicScanAggregate {
  day: string
  country: string
  device: string
  scans: number
}

export interface CreatedDynamicCode {
  id: string
  slug: string
  shortUrl: string
  maxScans: number
  expiresAt: number | null
}

export function dynamicApiBase(value: string | undefined): string | null {
  const raw = value?.trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost')) return null
    if (url.username || url.password || url.search || url.hash) return null
    return url.toString().replace(/\/+$/, '')
  } catch {
    return null
  }
}

export function getOrCreateOwnerKey(storage: Storage = localStorage): string {
  const saved = storage.getItem(OWNER_KEY_STORAGE)
  if (saved && /^[a-f0-9]{64}$/.test(saved)) return saved
  const key = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
  storage.setItem(OWNER_KEY_STORAGE, key)
  return key
}

export function storeOwnerKey(value: string, storage: Storage = localStorage): void {
  const key = value.trim()
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error('Owner key must be a 64-character hexadecimal key')
  storage.setItem(OWNER_KEY_STORAGE, key)
}

export async function dynamicRequest<T>(
  apiBase: string,
  path: string,
  options: RequestInit = {},
  ownerKey?: string,
): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (ownerKey) headers.set('Authorization', `Bearer ${ownerKey}`)
  const response = await fetch(`${apiBase}${path}`, { ...options, headers })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `Dynamic QR request failed (${response.status})`
    throw new Error(message)
  }
  return body as T
}

export { OWNER_KEY_STORAGE }
