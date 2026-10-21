import { describe, expect, it } from 'vitest'
import {
  classifyDevice,
  dayKey,
  hashPassword,
  isValidExpiry,
  MAX_CODES_PER_OWNER,
  MAX_MONTHLY_SCANS,
  monthKey,
  normalizedCountry,
  parseOptionalLimit,
  validCustomHost,
  validateDestination,
  verifyPassword,
} from './security'

describe('dynamic redirect input validation', () => {
  it('allows public HTTP(S) destinations and normalizes the URL', () => {
    expect(validateDestination('https://example.com/path')).toBe('https://example.com/path')
    expect(validateDestination('http://example.com')).toBe('http://example.com/')
  })

  it('rejects non-web schemes, credentials, local/private destinations, and oversized URLs', () => {
    expect(validateDestination('javascript:alert(1)')).toBeNull()
    expect(validateDestination('data:text/html,hello')).toBeNull()
    expect(validateDestination('https://user:pass@example.com')).toBeNull()
    expect(validateDestination('http://localhost')).toBeNull()
    expect(validateDestination('http://192.168.1.10')).toBeNull()
    expect(validateDestination('http://[::1]')).toBeNull()
    expect(validateDestination('http://[fe90::1]')).toBeNull()
    expect(validateDestination(`https://example.com/${'x'.repeat(2100)}`)).toBeNull()
  })

  it('normalizes custom host names and rejects malformed values', () => {
    expect(validCustomHost('Go.Example.COM.')).toBe('go.example.com')
    expect(validCustomHost('localhost')).toBeNull()
    expect(validCustomHost('https://go.example.com')).toBeNull()
    expect(validCustomHost('go.example.com:443')).toBeNull()
  })

  it('enforces owner and scan limits without silently expanding requests', () => {
    expect(MAX_CODES_PER_OWNER).toBe(5)
    expect(MAX_MONTHLY_SCANS).toBe(1000)
    expect(parseOptionalLimit(undefined)).toBe(1000)
    expect(parseOptionalLimit(50)).toBe(50)
    expect(parseOptionalLimit(1001)).toBeNull()
    expect(parseOptionalLimit(0)).toBeNull()
  })

  it('requires future integer expiries', () => {
    expect(isValidExpiry(undefined, 1000)).toBeNull()
    expect(isValidExpiry(2000, 1000)).toBe(2000)
    expect(isValidExpiry(1000, 1000)).toBeUndefined()
    expect(isValidExpiry('tomorrow', 1000)).toBeUndefined()
  })
})

describe('privacy-limited scan analytics helpers', () => {
  it('classifies broad device groups without storing user-agent strings', () => {
    expect(classifyDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile')).toBe('mobile')
    expect(classifyDevice('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) Safari')).toBe('tablet')
    expect(classifyDevice('Mozilla/5.0 Chrome/120.0 Safari/537.36')).toBe('desktop')
    expect(classifyDevice('Unknown client')).toBe('other')
  })

  it('keeps only valid country codes and UTC date buckets', () => {
    expect(normalizedCountry('PK')).toBe('PK')
    expect(normalizedCountry('unknown')).toBe('ZZ')
    expect(normalizedCountry('XX')).toBe('ZZ')
    const date = new Date('2026-10-21T00:30:00Z')
    expect(monthKey(date)).toBe('2026-10')
    expect(dayKey(date)).toBe('2026-10-21')
  })
})

describe('dynamic link password protection', () => {
  it('hashes passwords with salt and verifies without storing plaintext', async () => {
    const result = await hashPassword('a secure password')
    expect(result.salt).toMatch(/^[a-f0-9]{32}$/)
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/)
    expect(result.hash).not.toContain('a secure password')
    await expect(verifyPassword('a secure password', result.salt, result.hash)).resolves.toBe(true)
    await expect(verifyPassword('wrong password', result.salt, result.hash)).resolves.toBe(false)
  }, 20_000)
})
