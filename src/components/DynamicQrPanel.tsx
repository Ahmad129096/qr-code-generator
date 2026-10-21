import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  dynamicApiBase,
  dynamicRequest,
  getOrCreateOwnerKey,
  storeOwnerKey,
  type CreatedDynamicCode,
  type DynamicCode,
  type DynamicConfig,
  type DynamicScanAggregate,
} from '../dynamicQr'
import { createQrPng, createQrSvg } from '../qr/browser'
import type { QrOptions } from '../qr/options'
import { useLocale } from '../localeContext'

interface TurnstileOptions {
  sitekey: string
  callback: (token: string) => void
  'expired-callback': () => void
  'error-callback': () => void
}

interface TurnstileApi {
  render(element: HTMLElement, options: TurnstileOptions): string
  remove(widgetId: string): void
  reset(widgetId: string): void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

interface DomainChallenge {
  host: string
  txtName: string
  txtValue: string
}

function readSavedKey(): string {
  try {
    const saved = localStorage.getItem('qr-dynamic-owner-key-v1') ?? ''
    return /^[a-f0-9]{64}$/.test(saved) ? saved : ''
  } catch {
    return ''
  }
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export default function DynamicQrPanel({
  destination,
  options,
}: {
  destination: string
  options: QrOptions
}) {
  const { t } = useLocale()
  const apiBase = dynamicApiBase(import.meta.env.VITE_DYNAMIC_API_URL)
  const [config, setConfig] = useState<DynamicConfig | null>(null)
  const [ownerKey, setOwnerKey] = useState(readSavedKey)
  const [importedKey, setImportedKey] = useState('')
  const [destinationDraft, setDestinationDraft] = useState({ source: destination, value: destination })
  const destinationValue = destinationDraft.source === destination ? destinationDraft.value : destination
  const [password, setPassword] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [maxScans, setMaxScans] = useState('1000')
  const [customDomain, setCustomDomain] = useState('')
  const [verifiedDomain, setVerifiedDomain] = useState('')
  const [domainChallenge, setDomainChallenge] = useState<DomainChallenge | null>(null)
  const [codes, setCodes] = useState<DynamicCode[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [created, setCreated] = useState<CreatedDynamicCode | null>(null)
  const [analytics, setAnalytics] = useState<Record<string, DynamicScanAggregate[]>>({})
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileReady, setTurnstileReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const turnstileHost = useRef<HTMLDivElement>(null)
  const turnstileId = useRef<string | null>(null)

  useEffect(() => {
    if (!apiBase) return
    let cancelled = false
    void dynamicRequest<DynamicConfig>(apiBase, '/v1/config')
      .then((value) => { if (!cancelled) setConfig(value) })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Could not load dynamic QR configuration')
      })
    return () => { cancelled = true }
  }, [apiBase])

  useEffect(() => {
    if (!config?.turnstileSiteKey) return
    const scriptUrl = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    let script = document.querySelector<HTMLScriptElement>('script[data-qr-turnstile]')
    const owned = !script
    if (!script) {
      script = document.createElement('script')
      script.src = scriptUrl
      script.async = true
      script.defer = true
      script.dataset['qrTurnstile'] = 'true'
      document.head.append(script)
    }
    const onLoad = (): void => setTurnstileReady(Boolean(window.turnstile))
    script.addEventListener('load', onLoad)
    if (window.turnstile) onLoad()
    return () => {
      script?.removeEventListener('load', onLoad)
      if (owned) script?.remove()
    }
  }, [config?.turnstileSiteKey])

  useEffect(() => {
    if (!turnstileReady || !config?.turnstileSiteKey || !turnstileHost.current || !window.turnstile) return
    const widgetId = window.turnstile.render(turnstileHost.current, {
      sitekey: config.turnstileSiteKey,
      callback: (token) => { setTurnstileToken(token); setError('') },
      'expired-callback': () => setTurnstileToken(''),
      'error-callback': () => {
        setTurnstileToken('')
        setError('Human verification is temporarily unavailable. Please retry.')
      },
    })
    turnstileId.current = widgetId
    return () => {
      if (window.turnstile && turnstileId.current) window.turnstile.remove(turnstileId.current)
      turnstileId.current = null
    }
  }, [turnstileReady, config?.turnstileSiteKey])

  async function loadCodes(key = ownerKey): Promise<void> {
    if (!apiBase || !key) return
    setLoading(true)
    setError('')
    try {
      const result = await dynamicRequest<{ codes: DynamicCode[] }>(apiBase, '/v1/codes', {}, key)
      setCodes(result.codes)
      setDrafts(Object.fromEntries(result.codes.map((code) => [code.id, code.destination])))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load dynamic links')
    } finally {
      setLoading(false)
    }
  }

  async function createCode(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!apiBase || !config) return
    if (!turnstileToken) {
      setError(t('dynamicTurnstileLoading'))
      return
    }
    setLoading(true)
    setError('')
    setStatus('')
    try {
      const key = ownerKey || getOrCreateOwnerKey()
      storeOwnerKey(key)
      setOwnerKey(key)
      const result = await dynamicRequest<CreatedDynamicCode>(
        apiBase,
        '/v1/codes',
        {
          method: 'POST',
          body: JSON.stringify({
            destination: destinationValue,
            password: password || undefined,
            expiresAt: expiresAt ? new Date(expiresAt).getTime() : null,
            maxScans: Number(maxScans),
            customDomain: verifiedDomain || undefined,
            turnstileToken,
          }),
        },
        key,
      )
      setCreated(result)
      setPassword('')
      setStatus(t('codeCreated'))
      await loadCodes(key)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create dynamic QR')
    } finally {
      setLoading(false)
      setTurnstileToken('')
      if (turnstileId.current && window.turnstile) window.turnstile.reset(turnstileId.current)
    }
  }

  async function saveDestination(code: DynamicCode): Promise<void> {
    if (!apiBase || !ownerKey) return
    setLoading(true)
    setError('')
    try {
      await dynamicRequest(apiBase, `/v1/codes/${code.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ destination: drafts[code.id] }),
      }, ownerKey)
      setStatus(t('codeSaved'))
      await loadCodes()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update the destination')
    } finally {
      setLoading(false)
    }
  }

  async function removeCode(code: DynamicCode): Promise<void> {
    if (!apiBase || !ownerKey) return
    setLoading(true)
    setError('')
    try {
      await dynamicRequest(apiBase, `/v1/codes/${code.id}`, { method: 'DELETE' }, ownerKey)
      setCodes((items) => items.filter((item) => item.id !== code.id))
      setStatus(t('removeCode'))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not delete dynamic link')
    } finally {
      setLoading(false)
    }
  }

  async function showAnalytics(code: DynamicCode): Promise<void> {
    if (!apiBase || !ownerKey) return
    setError('')
    try {
      const result = await dynamicRequest<{ aggregates: DynamicScanAggregate[] }>(
        apiBase,
        `/v1/codes/${code.id}/analytics`,
        {},
        ownerKey,
      )
      setAnalytics((previous) => ({ ...previous, [code.id]: result.aggregates }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load scan totals')
    }
  }

  async function requestDomainVerification(): Promise<void> {
    if (!apiBase || !ownerKey) return
    setError('')
    try {
      const challenge = await dynamicRequest<DomainChallenge>(apiBase, '/v1/domains', {
        method: 'POST',
        body: JSON.stringify({ host: customDomain }),
      }, ownerKey)
      setDomainChallenge(challenge)
      setVerifiedDomain('')
      setStatus(t('customDomainInstructions'))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not verify custom domain')
    }
  }

  async function verifyDomain(): Promise<void> {
    if (!apiBase || !ownerKey || !domainChallenge) return
    setError('')
    try {
      const result = await dynamicRequest<{ verified: boolean; host: string }>(
        apiBase,
        `/v1/domains/${encodeURIComponent(domainChallenge.host)}/verify`,
        { method: 'POST' },
        ownerKey,
      )
      setVerifiedDomain(result.host)
      setStatus(`${result.host} verified`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not verify custom domain')
    }
  }

  async function downloadPng(): Promise<void> {
    if (!created) return
    try {
      download(await createQrPng(created.shortUrl, options), 'dynamic-qr-code.png')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not export the QR code')
    }
  }

  async function copyText(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value)
      setStatus(t('copied'))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not copy to clipboard')
    }
  }

  if (!apiBase) return <p className="dynamic-qr-unavailable">{t('dynamicConfigMissing')}</p>

  return (
    <section className="dynamic-qr-panel" aria-labelledby="dynamic-qr-heading">
      <h3 id="dynamic-qr-heading">{t('dynamicCodes')}</h3>
      <p>{t('dynamicIntro')}</p>
      <p className="dynamic-privacy-note">{t('dynamicPrivacy')}</p>

      <label className="dynamic-field">
        {t('dynamicKey')}
        <input
          type="password"
          autoComplete="off"
          value={importedKey || ownerKey}
          placeholder={t('importOwnerKey')}
          onChange={(event) => setImportedKey(event.currentTarget.value)}
        />
      </label>
      <p className="dynamic-key-warning">{t('dynamicKeyWarning')}</p>
      <div className="dynamic-actions">
        <button
          type="button"
          onClick={() => {
            try {
              storeOwnerKey(importedKey || ownerKey)
              setOwnerKey(importedKey || ownerKey)
              setImportedKey('')
              void loadCodes(importedKey || ownerKey)
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : 'Invalid owner key')
            }
          }}
        >
          {t('saveOwnerKey')}
        </button>
        <button type="button" disabled={!ownerKey} onClick={() => void copyText(ownerKey)}>
          {t('copyText')}
        </button>
        <button
          type="button"
          disabled={!ownerKey}
          onClick={() => download(new Blob([ownerKey], { type: 'text/plain;charset=utf-8' }), 'qr-dynamic-owner-key.txt')}
        >
          {t('exportOwnerKey')}
        </button>
        <button type="button" disabled={!ownerKey} onClick={() => void loadCodes()}>
          {t('loadDynamicCodes')}
        </button>
      </div>

      <form onSubmit={(event) => void createCode(event)}>
        <label className="dynamic-field">
          {t('dynamicDestination')}
          <input
            type="url"
            required
            maxLength={2048}
            value={destinationValue}
            onChange={(event) => setDestinationDraft({ source: destination, value: event.currentTarget.value })}
          />
        </label>
        <label className="dynamic-field">
          {t('dynamicPassword')}
          <input
            type="password"
            autoComplete="new-password"
            minLength={password ? 8 : undefined}
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
          />
        </label>
        <p>{t('optionalPasswordHint')}</p>
        <label className="dynamic-field">
          {t('dynamicExpiry')}
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.currentTarget.value)}
          />
        </label>
        <label className="dynamic-field">
          {t('dynamicScanLimit')}
          <input
            type="number"
            min="1"
            max="1000"
            step="1"
            value={maxScans}
            onChange={(event) => setMaxScans(event.currentTarget.value)}
          />
        </label>
        <label className="dynamic-field">
          {t('customDomain')}
          <input
            type="text"
            autoComplete="url"
            value={customDomain}
            onChange={(event) => setCustomDomain(event.currentTarget.value)}
          />
        </label>
        <div className="dynamic-actions">
          <button type="button" disabled={!ownerKey || !customDomain || loading} onClick={() => void requestDomainVerification()}>
            {t('verifyDomain')}
          </button>
          {domainChallenge && (
            <button type="button" disabled={loading} onClick={() => void verifyDomain()}>
              Verify DNS TXT
            </button>
          )}
        </div>
        {domainChallenge && (
          <dl className="dynamic-domain-record">
            <dt>TXT name</dt><dd><code>{domainChallenge.txtName}</code></dd>
            <dt>TXT value</dt><dd><code>{domainChallenge.txtValue}</code></dd>
          </dl>
        )}
        <div ref={turnstileHost} className="dynamic-turnstile" />
        {config?.turnstileSiteKey && !turnstileReady && <p>{t('dynamicTurnstileLoading')}</p>}
        <button type="submit" disabled={loading || !turnstileToken}>
          {loading ? t('generating') : t('createDynamic')}
        </button>
      </form>

      {created && (
        <div className="dynamic-created">
          <p role="status">{status || t('codeCreated')}</p>
          <div className="dynamic-qr-result">
            <img
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(createQrSvg(created.shortUrl, options))}`}
              alt="Generated dynamic QR code"
            />
          </div>
          <p><a href={created.shortUrl} target="_blank" rel="noreferrer">{created.shortUrl}</a></p>
          <div className="dynamic-actions">
            <button type="button" onClick={() => void copyText(created.shortUrl)}>{t('copyLink')}</button>
            <button type="button" onClick={() => download(new Blob([createQrSvg(created.shortUrl, options)], { type: 'image/svg+xml' }), 'dynamic-qr-code.svg')}>{t('svg')}</button>
            <button type="button" onClick={() => void downloadPng()}>{t('png')}</button>
          </div>
        </div>
      )}

      <div className="dynamic-code-list">
        <h4>{t('loadDynamicCodes')}</h4>
        {codes.length === 0 ? <p>{t('noDynamicCodes')}</p> : codes.map((code) => (
          <article className="dynamic-code-item" key={code.id}>
            <label className="dynamic-field">
              {t('dynamicDestination')}
              <input
                type="url"
                value={drafts[code.id] ?? code.destination}
                onChange={(event) => setDrafts((previous) => ({ ...previous, [code.id]: event.currentTarget.value }))}
              />
            </label>
            <p>
              <a href={code.customDomain ? `https://${code.customDomain}/${code.slug}` : `https://${config?.redirectHost}/r/${code.slug}`}>
                {code.customDomain ? `https://${code.customDomain}/${code.slug}` : `https://${config?.redirectHost}/r/${code.slug}`}
              </a>
            </p>
            <p>
              <a href={`https://${code.customDomain ?? config?.redirectHost}/report/${code.slug}`} target="_blank" rel="noreferrer">
                Report a problem with this link
              </a>
            </p>
            <p>{t('dynamicUsage')}: {code.monthlyScans} / {code.maxScans}</p>
            <div className="dynamic-actions">
              <button type="button" disabled={loading} onClick={() => void saveDestination(code)}>{t('saveDestination')}</button>
              <button type="button" disabled={loading} onClick={() => void removeCode(code)}>{t('removeCode')}</button>
              <button type="button" onClick={() => void showAnalytics(code)}>{t('analytics')}</button>
            </div>
            {analytics[code.id] && (
              <div className="dynamic-analytics" aria-live="polite">
                {analytics[code.id]?.length
                  ? analytics[code.id]?.map((item) => (
                    <p key={`${item.day}-${item.country}-${item.device}`}>
                      {item.day}: {item.scans} — {item.country} — {item.device}
                    </p>
                  ))
                  : <p>{t('noDynamicCodes')}</p>}
              </div>
            )}
          </article>
        ))}
      </div>

      {(error || status) && <p className="dynamic-status" role={error ? 'alert' : 'status'}>{error || status}</p>}
    </section>
  )
}
