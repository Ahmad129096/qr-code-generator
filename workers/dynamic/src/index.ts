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
  randomToken,
  sha256,
  signValue,
  validCustomHost,
  validateDestination,
  verifyPassword,
  verifySignature,
} from './security'

interface D1Result {
  success: boolean
  meta?: { changes?: number }
  results?: Record<string, unknown>[]
}

interface D1Statement {
  bind(...values: unknown[]): D1Statement
  first<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<T | null>
  all<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<D1Result & { results: T[] }>
  run(): Promise<D1Result>
}

interface D1Database {
  prepare(query: string): D1Statement
}

interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

interface Env {
  DB: D1Database
  CREATE_RATE_LIMITER: RateLimitBinding
  REPORT_RATE_LIMITER: RateLimitBinding
  UNLOCK_RATE_LIMITER: RateLimitBinding
  APP_ORIGIN: string
  REDIRECT_HOST: string
  TURNSTILE_SITE_KEY: string
  TURNSTILE_SECRET: string
  WEB_RISK_API_KEY: string
  OWNER_TOKEN_PEPPER: string
  COOKIE_SIGNING_SECRET: string
}

interface CodeRow extends Record<string, unknown> {
  id: string
  owner_id: string
  slug: string
  destination: string
  password_salt: string | null
  password_hash: string | null
  expires_at: number | null
  max_scans: number
  month_key: string
  monthly_scans: number
  custom_domain: string | null
  disabled_at: number | null
}

interface OwnerRow extends Record<string, unknown> {
  id: string
}

const REPORT_REASONS = new Set(['phishing', 'malware', 'spam', 'other'])
const TOKEN_PATTERN = /^[a-f0-9]{64}$/

function requireSecret(value: string, name: string, minimumLength = 1): string {
  if (value.length < minimumLength) throw new Error(`${name} is not configured`)
  return value
}

function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  })
}

function text(body: string, status: number, headers?: HeadersInit): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  })
}

function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get('Origin')
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
  if (origin && origin === env.APP_ORIGIN) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

function withCors(response: Response, request: Request, env: Env): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(corsHeaders(request, env))) headers.set(key, value)
  return new Response(response.body, { status: response.status, headers })
}

function errorPage(message: string, status: number): Response {
  const safe = message.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character)
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>QR link unavailable</title><main><h1>QR link unavailable</h1><p>${safe}</p><p>This notice does not confirm whether a destination is safe.</p></main></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } },
  )
}

async function bodyObject(request: Request): Promise<Record<string, unknown> | null> {
  const contentLength = Number(request.headers.get('Content-Length') ?? 0)
  if (contentLength > 8192) return null
  const raw = await request.text()
  if (raw.length > 8192) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

async function authenticateOwner(request: Request, env: Env): Promise<OwnerRow | null> {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token || !TOKEN_PATTERN.test(token)) return null
  const pepper = requireSecret(env.OWNER_TOKEN_PEPPER, 'Owner key pepper', 32)
  const tokenHash = await sha256(`${pepper}:${token}`)
  return env.DB.prepare('SELECT id FROM owners WHERE token_hash = ?')
    .bind(tokenHash)
    .first<OwnerRow>()
}

async function verifyTurnstile(token: unknown, env: Env): Promise<boolean> {
  if (typeof token !== 'string' || token.length < 10 || token.length > 2048) return false
  const secret = requireSecret(env.TURNSTILE_SECRET, 'Turnstile secret')
  const form = new URLSearchParams({ secret, response: token })
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) throw new Error('Turnstile verification service is unavailable')
  const result: unknown = await response.json()
  return typeof result === 'object' && result !== null && 'success' in result && result.success === true
}

async function checkWebRisk(destination: string, env: Env): Promise<boolean> {
  if (!env.WEB_RISK_API_KEY) throw new Error('Destination safety checks are not configured')
  const url = new URL('https://webrisk.googleapis.com/v1/uris:search')
  url.searchParams.set('uri', destination)
  url.searchParams.set('key', env.WEB_RISK_API_KEY)
  for (const threatType of ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE']) {
    url.searchParams.append('threatTypes', threatType)
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
  if (!response.ok) throw new Error('Destination safety checks are temporarily unavailable')
  const result: unknown = await response.json()
  return typeof result === 'object' && result !== null && 'threat' in result
}

async function setPassword(input: unknown): Promise<{ salt: string | null; hash: string | null } | null> {
  if (input === undefined || input === null || input === '') return { salt: null, hash: null }
  if (typeof input !== 'string') return null
  try {
    return await hashPassword(input)
  } catch {
    return null
  }
}

function cookieValue(request: Request, name: string): string | null {
  const raw = request.headers.get('Cookie')
  if (!raw) return null
  const pair = raw.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null
}

async function hasAccessCookie(request: Request, code: CodeRow, env: Env): Promise<boolean> {
  const value = cookieValue(request, 'qr_access')
  if (!value) return false
  const [slug, expiryText, signature] = value.split('.')
  const expiry = Number(expiryText)
  if (slug !== code.slug || !Number.isSafeInteger(expiry) || expiry <= Date.now() || !signature) return false
  const secret = requireSecret(env.COOKIE_SIGNING_SECRET, 'Cookie signing secret', 32)
  return verifySignature(`${slug}.${expiry}`, signature, secret)
}

async function unlockCode(request: Request, code: CodeRow, env: Env): Promise<Response> {
  if (Number(request.headers.get('Content-Length') ?? 0) > 2048) {
    return errorPage('Invalid password request.', 413)
  }
  const rate = await env.UNLOCK_RATE_LIMITER.limit({ key: `password:${code.slug}` })
  if (!rate.success) return errorPage('Too many password attempts. Try again shortly.', 429)
  const body = await request.text()
  if (body.length > 2048) return errorPage('Invalid password request.', 413)
  const form = new URLSearchParams(body)
  const password = form.get('password')
  if (typeof password !== 'string' || !code.password_salt || !code.password_hash) {
    return errorPage('Invalid password', 401)
  }
  const correct = await verifyPassword(password, code.password_salt, code.password_hash)
  if (!correct) return errorPage('Invalid password', 401)
  const signingSecret = requireSecret(env.COOKIE_SIGNING_SECRET, 'Cookie signing secret', 32)
  const expiry = Date.now() + 10 * 60 * 1000
  const payload = `${code.slug}.${expiry}`
  const signature = await signValue(payload, signingSecret)
  const location = new URL(request.url)
  location.pathname = code.custom_domain ? `/${code.slug}` : `/r/${code.slug}`
  return new Response(null, {
    status: 303,
    headers: {
      Location: location.toString(),
      'Set-Cookie': `qr_access=${encodeURIComponent(`${payload}.${signature}`)}; Max-Age=600; Path=/; Secure; HttpOnly; SameSite=Lax`,
      'Cache-Control': 'no-store',
    },
  })
}

async function resolveRedirect(request: Request, slug: string, env: Env): Promise<Response> {
  if (!env.REDIRECT_HOST) throw new Error('Redirect host is not configured')
  const host = new URL(request.url).hostname.toLowerCase()
  const isDefaultHost = host === env.REDIRECT_HOST.toLowerCase()
  const code = isDefaultHost
    ? await env.DB.prepare('SELECT * FROM codes WHERE slug = ?')
      .bind(slug).first<CodeRow>()
    : await env.DB.prepare(
      'SELECT c.* FROM codes c JOIN custom_domains d ON d.host = c.custom_domain WHERE c.slug = ? AND d.host = ? AND d.verified_at IS NOT NULL',
    ).bind(slug, host).first<CodeRow>()
  if (!code) return errorPage('This QR link does not exist.', 404)
  if (code.disabled_at !== null) {
    return errorPage('This QR link has been disabled while it is reviewed.', 410)
  }
  const now = Date.now()
  if (code.expires_at !== null && code.expires_at <= now) {
    return errorPage('This QR link has expired.', 410)
  }
  if (code.password_hash && !(await hasAccessCookie(request, code, env))) {
    if (request.method === 'POST') return unlockCode(request, code, env)
    return new Response(
      '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Password protected QR</title><main><h1>Password protected QR</h1><form method="post"><label>Password <input type="password" name="password" required autocomplete="current-password"></label><button type="submit">Continue</button></form></main></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } },
    )
  }

  const nowDate = new Date(now)
  const currentMonth = monthKey(nowDate)
  const changed = await env.DB.prepare(
    `UPDATE codes
     SET monthly_scans = CASE WHEN month_key = ? THEN monthly_scans + 1 ELSE 1 END,
         month_key = ?
     WHERE id = ? AND (expires_at IS NULL OR expires_at > ?)
       AND (month_key != ? OR monthly_scans < MIN(max_scans, ?))`,
  ).bind(currentMonth, currentMonth, code.id, now, currentMonth, MAX_MONTHLY_SCANS).run()
  if ((changed.meta?.changes ?? 0) !== 1) {
    return errorPage('This QR link has reached its monthly scan limit.', 429)
  }

  const country = normalizedCountry(request.headers.get('CF-IPCountry'))
  const device = classifyDevice(request.headers.get('User-Agent') ?? '')
  await env.DB.prepare(
    `INSERT INTO scan_aggregates (code_id, day_key, country, device, scans)
     VALUES (?, ?, ?, ?, 1)
     ON CONFLICT(code_id, day_key, country, device) DO UPDATE SET scans = scans + 1`,
  ).bind(code.id, dayKey(nowDate), country, device).run()

  return new Response(null, {
    status: 302,
    headers: {
      Location: code.destination,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function abuseReportPage(slug: string, siteKey: string): Response {
  const safeSiteKey = siteKey.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character)
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Report a QR link</title><main><h1>Report a QR link</h1><p>Reports are reviewed by the service operator. Do not include personal information.</p><form id="report"><label>Reason <select name="reason" required><option value="phishing">Possible phishing</option><option value="malware">Possible malware</option><option value="spam">Spam or abuse</option><option value="other">Other</option></select></label><label>Details (optional) <textarea name="details" maxlength="1000"></textarea></label><div class="cf-turnstile" data-sitekey="${safeSiteKey}" data-callback="verified"></div><button id="submit" disabled>Submit report</button></form><p id="status" role="status"></p></main><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script><script>let challenge='';window.verified=function(token){challenge=token;document.getElementById('submit').disabled=false};document.getElementById('report').addEventListener('submit',async function(event){event.preventDefault();const form=new FormData(event.currentTarget);const status=document.getElementById('status');try{const response=await fetch('/v1/reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:'${slug}',reason:form.get('reason'),details:form.get('details'),turnstileToken:challenge})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Could not submit report');status.textContent='Thank you. Your report was received.';event.currentTarget.reset();document.getElementById('submit').disabled=true;challenge=''}catch(error){status.textContent=error instanceof Error?error.message:'Could not submit report'}});</script></html>`,
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'",
        'Referrer-Policy': 'no-referrer',
      },
    },
  )
}

function publicCode(code: CodeRow): Record<string, unknown> {
  return {
    id: code.id,
    slug: code.slug,
    destination: code.destination,
    expiresAt: code.expires_at,
    maxScans: code.max_scans,
    monthlyScans: code.monthly_scans,
    customDomain: code.custom_domain,
    disabledAt: code.disabled_at,
  }
}

async function api(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request, env) })
  }
  if (url.pathname === '/v1/health' && request.method === 'GET') return json({ status: 'ok' })
  if (url.pathname === '/v1/config' && request.method === 'GET') {
    if (!env.TURNSTILE_SITE_KEY || !env.APP_ORIGIN.startsWith('https://') || !env.REDIRECT_HOST) {
      return json({ error: 'Dynamic QR service configuration is incomplete' }, 503)
    }
    return json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY, redirectHost: env.REDIRECT_HOST })
  }
  if (url.pathname === '/v1/codes' && request.method === 'POST') {
    const body = await bodyObject(request)
    if (!body) return json({ error: 'Invalid request body' }, 400)
    const ownerToken = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
    if (!ownerToken || !TOKEN_PATTERN.test(ownerToken)) return json({ error: 'Invalid owner key' }, 401)
    const pepper = requireSecret(env.OWNER_TOKEN_PEPPER, 'Owner key pepper', 32)
    const tokenHash = await sha256(`${pepper}:${ownerToken}`)
    const createRate = await env.CREATE_RATE_LIMITER.limit({ key: tokenHash })
    if (!createRate.success) return json({ error: 'Too many link creations; try again shortly' }, 429)
    if (!(await verifyTurnstile(body['turnstileToken'], env))) return json({ error: 'Human verification failed' }, 403)

    const destination = validateDestination(body['destination'])
    if (!destination) return json({ error: 'Enter a valid public HTTP or HTTPS destination URL' }, 400)
    if (await checkWebRisk(destination, env)) {
      return json({ error: 'This destination may be unsafe and cannot be used for a dynamic QR code' }, 422)
    }
    const expiry = isValidExpiry(body['expiresAt'], Date.now())
    const maxScans = parseOptionalLimit(body['maxScans'])
    const password = await setPassword(body['password'])
    if (expiry === undefined) return json({ error: 'Expiry must be a future timestamp' }, 400)
    if (maxScans === null) return json({ error: 'Monthly scan limit must be a positive integer' }, 400)
    if (!password) return json({ error: 'Password must be between 8 and 128 characters' }, 400)

    const existingOwner = await env.DB.prepare('SELECT id FROM owners WHERE token_hash = ?')
      .bind(tokenHash).first<OwnerRow>()
    const ownerId = existingOwner?.id ?? randomToken(16)
    if (!existingOwner) {
      await env.DB.prepare('INSERT INTO owners (id, token_hash, created_at) VALUES (?, ?, ?)')
        .bind(ownerId, tokenHash, Date.now()).run()
    }
    const active = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM codes WHERE owner_id = ? AND disabled_at IS NULL AND (expires_at IS NULL OR expires_at > ?)',
    ).bind(ownerId, Date.now()).first<{ count: number }>()
    if ((active?.count ?? 0) >= MAX_CODES_PER_OWNER) {
      return json({ error: `Free owner keys can have up to ${MAX_CODES_PER_OWNER} active codes` }, 429)
    }

    let customDomain: string | null = null
    if (body['customDomain'] !== undefined && body['customDomain'] !== null && body['customDomain'] !== '') {
      customDomain = validCustomHost(body['customDomain'])
      if (!customDomain) return json({ error: 'Invalid custom domain hostname' }, 400)
      const domain = await env.DB.prepare(
        'SELECT host FROM custom_domains WHERE host = ? AND owner_id = ? AND verified_at IS NOT NULL',
      ).bind(customDomain, ownerId).first()
      if (!domain) return json({ error: 'Verify this custom domain before assigning it' }, 400)
    }

    const id = randomToken(16)
    const slug = randomToken(9)
    await env.DB.prepare(
      `INSERT INTO codes
       (id, owner_id, slug, destination, password_salt, password_hash, expires_at, max_scans, custom_domain, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, ownerId, slug, destination, password.salt, password.hash, expiry, maxScans, customDomain, Date.now()).run()
    const shortUrl = customDomain
      ? `https://${customDomain}/${slug}`
      : `https://${env.REDIRECT_HOST}/r/${slug}`
    return json({ id, slug, shortUrl, maxScans, expiresAt: expiry }, 201)
  }

  if (url.pathname === '/v1/reports' && request.method === 'POST') {
    const body = await bodyObject(request)
    if (!body) return json({ error: 'Invalid request body' }, 400)
    const slug = typeof body['slug'] === 'string' && /^[a-f0-9]{18}$/.test(body['slug']) ? body['slug'] : null
    const reason = typeof body['reason'] === 'string' && REPORT_REASONS.has(body['reason']) ? body['reason'] : null
    const details = typeof body['details'] === 'string' ? body['details'].trim().slice(0, 1000) : ''
    if (!slug || !reason) return json({ error: 'A valid link identifier and report reason are required' }, 400)
    const reportRate = await env.REPORT_RATE_LIMITER.limit({ key: slug })
    if (!reportRate.success) return json({ error: 'Too many reports for this link; try again shortly' }, 429)
    if (!(await verifyTurnstile(body['turnstileToken'], env))) return json({ error: 'Human verification failed' }, 403)
    const reportable = await env.DB.prepare('SELECT id FROM codes WHERE slug = ?')
      .bind(slug).first()
    if (!reportable) return json({ error: 'This dynamic link was not found' }, 404)
    const id = randomToken(16)
    await env.DB.prepare(
      'INSERT INTO abuse_reports (id, slug, reason, details, created_at) VALUES (?, ?, ?, ?, ?)',
    ).bind(id, slug, reason, details, Date.now()).run()
    return json({ received: true }, 202)
  }

  const domainMatch = url.pathname.match(/^\/v1\/domains\/([^/]+)\/(verify)$/)
  if (domainMatch && request.method === 'POST') {
    const owner = await authenticateOwner(request, env)
    if (!owner) return json({ error: 'Owner key was not found' }, 401)
    const host = validCustomHost(decodeURIComponent(domainMatch[1] ?? ''))
    if (!host) return json({ error: 'Invalid custom domain hostname' }, 400)
    const domain = await env.DB.prepare(
      'SELECT verification_token FROM custom_domains WHERE host = ? AND owner_id = ?',
    ).bind(host, owner.id).first<{ verification_token: string }>()
    if (!domain) return json({ error: 'Request DNS verification before verifying the domain' }, 404)
    const dnsUrl = new URL('https://cloudflare-dns.com/dns-query')
    dnsUrl.searchParams.set('name', `_qr-generator-verification.${host}`)
    dnsUrl.searchParams.set('type', 'TXT')
    const response = await fetch(dnsUrl, { headers: { Accept: 'application/dns-json' }, signal: AbortSignal.timeout(5000) })
    if (!response.ok) throw new Error('DNS verification service is unavailable')
    const dns: unknown = await response.json()
    const answers = typeof dns === 'object' && dns !== null && 'Answer' in dns && Array.isArray(dns.Answer)
      ? dns.Answer as { data?: unknown }[]
      : []
    const expected = `"qr-generator-verification=${domain.verification_token}"`
    if (!answers.some((answer) => answer.data === expected)) {
      return json({ error: `Add a TXT record named _qr-generator-verification.${host} with the requested verification value` }, 422)
    }
    await env.DB.prepare('UPDATE custom_domains SET verified_at = ? WHERE host = ? AND owner_id = ?')
      .bind(Date.now(), host, owner.id).run()
    return json({ verified: true, host })
  }

  if (url.pathname === '/v1/domains' && request.method === 'POST') {
    const owner = await authenticateOwner(request, env)
    if (!owner) return json({ error: 'Owner key was not found' }, 401)
    const body = await bodyObject(request)
    const host = validCustomHost(body?.['host'])
    if (!host) return json({ error: 'Enter a valid custom domain hostname' }, 400)
    const token = randomToken(16)
    await env.DB.prepare(
      `INSERT INTO custom_domains (host, owner_id, verification_token, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(host) DO UPDATE SET verification_token = excluded.verification_token, verified_at = NULL
       WHERE custom_domains.owner_id = excluded.owner_id`,
    ).bind(host, owner.id, token, Date.now()).run()
    const ownership = await env.DB.prepare('SELECT owner_id FROM custom_domains WHERE host = ?')
      .bind(host).first<{ owner_id: string }>()
    if (ownership?.owner_id !== owner.id) {
      return json({ error: 'This custom domain is already associated with another owner key' }, 409)
    }
    return json({
      host,
      txtName: `_qr-generator-verification.${host}`,
      txtValue: `qr-generator-verification=${token}`,
    }, 201)
  }

  const codesMatch = url.pathname.match(/^\/v1\/codes(?:\/([a-f0-9]{32}))?$/)
  if (codesMatch && request.method !== 'POST') {
    const owner = await authenticateOwner(request, env)
    if (!owner) return json({ error: 'Owner key was not found' }, 401)
    const codeId = codesMatch[1]
    if (request.method === 'GET' && !codeId) {
      const result = await env.DB.prepare(
        'SELECT * FROM codes WHERE owner_id = ? ORDER BY created_at DESC LIMIT ?',
      ).bind(owner.id, MAX_CODES_PER_OWNER).all<CodeRow>()
      return json({ codes: result.results.map(publicCode) })
    }
    if (request.method === 'PATCH' && codeId) {
      const body = await bodyObject(request)
      if (!body) return json({ error: 'Invalid request body' }, 400)
      const existing = await env.DB.prepare('SELECT * FROM codes WHERE id = ? AND owner_id = ?')
        .bind(codeId, owner.id).first<CodeRow>()
      if (!existing) return json({ error: 'Dynamic code not found' }, 404)
      const destination = body['destination'] === undefined
        ? existing.destination
        : validateDestination(body['destination'])
      if (!destination) return json({ error: 'Enter a valid public HTTP or HTTPS destination URL' }, 400)
      if (body['destination'] !== undefined && await checkWebRisk(destination, env)) {
        return json({ error: 'This destination may be unsafe and cannot be used for a dynamic QR code' }, 422)
      }
      const expiry = body['expiresAt'] === undefined
        ? existing.expires_at
        : isValidExpiry(body['expiresAt'], Date.now())
      const maxScans = body['maxScans'] === undefined
        ? existing.max_scans
        : parseOptionalLimit(body['maxScans'])
      const password = body['password'] === undefined
        ? { salt: existing.password_salt, hash: existing.password_hash }
        : await setPassword(body['password'])
      if (expiry === undefined) return json({ error: 'Expiry must be a future timestamp' }, 400)
      if (maxScans === null) return json({ error: 'Monthly scan limit must be a positive integer' }, 400)
      if (!password) return json({ error: 'Password must be between 8 and 128 characters' }, 400)
      await env.DB.prepare(
        `UPDATE codes SET destination = ?, password_salt = ?, password_hash = ?, expires_at = ?, max_scans = ?
         WHERE id = ? AND owner_id = ?`,
      ).bind(destination, password.salt, password.hash, expiry, maxScans, codeId, owner.id).run()
      return json({ ...publicCode({ ...existing, destination, password_salt: password.salt, password_hash: password.hash, expires_at: expiry, max_scans: maxScans }), updated: true })
    }
    if (request.method === 'DELETE' && codeId) {
      const result = await env.DB.prepare('DELETE FROM codes WHERE id = ? AND owner_id = ?')
        .bind(codeId, owner.id).run()
      return (result.meta?.changes ?? 0) === 1 ? json({ deleted: true }) : json({ error: 'Dynamic code not found' }, 404)
    }
    return json({ error: 'Method not allowed' }, 405)
  }

  const analyticsMatch = url.pathname.match(/^\/v1\/codes\/([a-f0-9]{32})\/analytics$/)
  if (analyticsMatch && request.method === 'GET') {
    const owner = await authenticateOwner(request, env)
    if (!owner) return json({ error: 'Owner key was not found' }, 401)
    const result = await env.DB.prepare(
      `SELECT a.day_key AS day, a.country, a.device, a.scans
       FROM scan_aggregates a JOIN codes c ON c.id = a.code_id
       WHERE c.id = ? AND c.owner_id = ? ORDER BY a.day_key DESC LIMIT 366`,
    ).bind(analyticsMatch[1], owner.id).all()
    return json({ aggregates: result.results ?? [] })
  }
  return json({ error: 'Not found' }, 404)
}

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  if (url.pathname.startsWith('/v1/')) return withCors(await api(request, env, url), request, env)
  const reportMatch = url.pathname.match(/^\/report\/([a-f0-9]{18})$/)
  if (request.method === 'GET' && reportMatch) {
    return abuseReportPage(reportMatch[1] ?? '', env.TURNSTILE_SITE_KEY)
  }
  if (url.pathname.startsWith('/r/')) {
    const slug = url.pathname.slice(3)
    if (!/^[a-f0-9]{18}$/.test(slug)) return errorPage('This QR link does not exist.', 404)
    if (request.method !== 'GET' && request.method !== 'POST') return text('Method not allowed', 405)
    return resolveRedirect(request, slug, env)
  }
  if (request.method === 'GET' && url.pathname.match(/^\/[a-f0-9]{18}$/)) {
    return resolveRedirect(request, url.pathname.slice(1), env)
  }
  return text('Not found', 404)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handle(request, env)
    } catch (error) {
      console.error('Dynamic QR request failed', error)
      if (new URL(request.url).pathname.startsWith('/v1/')) {
        return withCors(json({ error: 'The dynamic QR service is temporarily unavailable' }, 503), request, env)
      }
      return errorPage('This QR service is temporarily unavailable.', 503)
    }
  },
  async scheduled(_controller: { scheduledTime: number }, env: Env): Promise<void> {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    await env.DB.prepare('DELETE FROM scan_aggregates WHERE day_key < ?')
      .bind(dayKey(cutoff)).run()
    await env.DB.prepare('DELETE FROM abuse_reports WHERE status != ? AND created_at < ?')
      .bind('open', Date.now() - 180 * 24 * 60 * 60 * 1000).run()
  },
}
