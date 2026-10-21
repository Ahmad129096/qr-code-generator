export const MAX_DESTINATION_LENGTH = 2048
export const MAX_MONTHLY_SCANS = 1000
export const MAX_CODES_PER_OWNER = 5

export type DeviceClass = 'mobile' | 'tablet' | 'desktop' | 'other'

export function validateDestination(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > MAX_DESTINATION_LENGTH) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    if (url.username || url.password) return null
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    const privateIpv6 =
      host.includes(':') &&
      (
        /^f[cd][0-9a-f]{2}:/i.test(host) ||
        /^fe[89ab][0-9a-f]:/i.test(host) ||
        host.startsWith('::ffff:')
      )
    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host === '::' ||
      privateIpv6 ||
      /^127(?:\.\d{1,3}){3}$/.test(host) ||
      /^10(?:\.\d{1,3}){3}$/.test(host) ||
      /^192\.168(?:\.\d{1,3}){2}$/.test(host) ||
      /^172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}$/.test(host) ||
      /^169\.254(?:\.\d{1,3}){2}$/.test(host) ||
      /^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])(?:\.\d{1,3}){2}$/.test(host)
    ) {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}

export function classifyDevice(userAgent: string): DeviceClass {
  if (/iPad|Tablet|PlayBook|Silk/i.test(userAgent)) return 'tablet'
  if (/Mobi|Android|iPhone|iPod|Windows Phone/i.test(userAgent)) return 'mobile'
  if (/Mozilla|Chrome|Safari|Firefox|Edge/i.test(userAgent)) return 'desktop'
  return 'other'
}

export function normalizedCountry(value: string | null): string {
  return value && /^[A-Z]{2}$/.test(value) && value !== 'XX' ? value : 'ZZ'
}

export function validCustomHost(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 253) return null
  const host = value.trim().toLowerCase().replace(/\.$/, '')
  if (
    host.length < 4 ||
    !host.includes('.') ||
    host.includes('/') ||
    host.includes(':') ||
    host === 'localhost' ||
    !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)
  ) {
    return null
  }
  return host
}

export function parseOptionalLimit(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return MAX_MONTHLY_SCANS
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_MONTHLY_SCANS
  ) return null
  return value
}

export function isValidExpiry(value: unknown, now: number): number | null | undefined {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= now) return undefined
  return value
}

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function dayKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

export function randomToken(bytes = 32): string {
  const data = crypto.getRandomValues(new Uint8Array(bytes))
  return Array.from(data, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function hashPassword(password: string): Promise<{ salt: string; hash: string }> {
  if (password.length < 8 || password.length > 128) {
    throw new RangeError('Password must be between 8 and 128 characters')
  }
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 210_000 },
    key,
    256,
  )
  return {
    salt: Array.from(salt, (byte) => byte.toString(16).padStart(2, '0')).join(''),
    hash: Array.from(new Uint8Array(derived), (byte) => byte.toString(16).padStart(2, '0')).join(''),
  }
}

export async function verifyPassword(password: string, saltHex: string, expected: string): Promise<boolean> {
  if (password.length > 128 || !/^[a-f0-9]{32}$/.test(saltHex) || !/^[a-f0-9]{64}$/.test(expected)) {
    return false
  }
  const salt = Uint8Array.from(saltHex.match(/.{2}/g) ?? [], (part) => parseInt(part, 16))
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 210_000 },
    key,
    256,
  )
  const actual = new Uint8Array(derived)
  const expectedBytes = Uint8Array.from(expected.match(/.{2}/g) ?? [], (part) => parseInt(part, 16))
  let difference = actual.length ^ expectedBytes.length
  for (let index = 0; index < actual.length; index++) {
    difference |= (actual[index] ?? 0) ^ (expectedBytes[index] ?? 0)
  }
  return difference === 0
}

export async function signValue(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function verifySignature(value: string, signature: string, secret: string): Promise<boolean> {
  if (!/^[a-f0-9]{64}$/.test(signature)) return false
  const expected = await signValue(value, secret)
  let difference = 0
  for (let index = 0; index < expected.length; index++) {
    difference |= (expected.charCodeAt(index) || 0) ^ (signature.charCodeAt(index) || 0)
  }
  return difference === 0
}
