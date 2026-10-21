import { describe, expect, it } from 'vitest'
import {
  dynamicApiBase,
  getOrCreateOwnerKey,
  storeOwnerKey,
} from './dynamicQr'

function storageMock(): Storage {
  const entries = new Map<string, string>()
  return {
    get length() { return entries.size },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => [...entries.keys()][index] ?? null,
    removeItem: (key) => { entries.delete(key) },
    setItem: (key, value) => { entries.set(key, value) },
  }
}

describe('dynamic QR client helpers', () => {
  it('only accepts HTTPS API URLs (or localhost for development)', () => {
    expect(dynamicApiBase('https://qr-api.example/api/')).toBe('https://qr-api.example/api')
    expect(dynamicApiBase('http://localhost:8787')).toBe('http://localhost:8787')
    expect(dynamicApiBase('http://qr-api.example')).toBeNull()
    expect(dynamicApiBase('javascript:alert(1)')).toBeNull()
    expect(dynamicApiBase('https://user:pass@qr-api.example')).toBeNull()
    expect(dynamicApiBase(undefined)).toBeNull()
  })

  it('creates and reuses a private-format owner key in browser storage', () => {
    const storage = storageMock()
    const first = getOrCreateOwnerKey(storage)
    expect(first).toMatch(/^[a-f0-9]{64}$/)
    expect(getOrCreateOwnerKey(storage)).toBe(first)
  })

  it('rejects malformed imported owner keys', () => {
    expect(() => storeOwnerKey('not-a-key', storageMock())).toThrow('64-character hexadecimal key')
  })
})
