import { describe, expect, it } from 'vitest'
import worker from './index'

const unusedDb = {
  prepare(): never {
    throw new Error('Database should not be queried by this request')
  },
}

const env = {
  DB: unusedDb,
  CREATE_RATE_LIMITER: { limit: async () => ({ success: true }) },
  REPORT_RATE_LIMITER: { limit: async () => ({ success: true }) },
  UNLOCK_RATE_LIMITER: { limit: async () => ({ success: true }) },
  APP_ORIGIN: 'https://qr.example.test',
  REDIRECT_HOST: 'go.example.test',
  TURNSTILE_SITE_KEY: 'public-site-key',
  TURNSTILE_SECRET: 'server-secret',
  WEB_RISK_API_KEY: 'server-risk-key',
  OWNER_TOKEN_PEPPER: 'test-pepper',
  COOKIE_SIGNING_SECRET: 'test-cookie-secret',
}

describe('dynamic QR Worker HTTP surface', () => {
  it('serves health and public configuration with the allowed CORS origin', async () => {
    const health = await worker.fetch(
      new Request('https://api.example.test/v1/health', {
        headers: { Origin: 'https://qr.example.test' },
      }),
      env,
    )
    expect(health.status).toBe(200)
    expect(health.headers.get('Access-Control-Allow-Origin')).toBe('https://qr.example.test')

    const config = await worker.fetch(
      new Request('https://api.example.test/v1/config'),
      env,
    )
    await expect(config.json()).resolves.toEqual({
      turnstileSiteKey: 'public-site-key',
      redirectHost: 'go.example.test',
    })
  })

  it('rejects malformed owner credentials before touching storage or external services', async () => {
    const response = await worker.fetch(
      new Request('https://api.example.test/v1/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer invalid' },
        body: JSON.stringify({ destination: 'https://example.com', turnstileToken: 'token' }),
      }),
      env,
    )
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Invalid owner key' })
  })

  it('rejects invalid report identifiers before database or Turnstile work', async () => {
    const response = await worker.fetch(
      new Request('https://api.example.test/v1/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'not-a-slug',
          reason: 'phishing',
          turnstileToken: 'invalid-token',
        }),
      }),
      env,
    )
    expect(response.status).toBe(400)
  })

  it('renders an abuse-report page for a fixed-format link identifier', async () => {
    const response = await worker.fetch(
      new Request('https://go.example.test/report/0123456789abcdef01'),
      env,
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Security-Policy')).toContain('challenges.cloudflare.com')
    expect(await response.text()).toContain('public-site-key')
  })
})
