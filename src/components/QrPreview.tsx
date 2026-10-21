import { useEffect, useMemo, useRef, useState } from 'react'
import type { QrOptions } from '../qr/options'
import { createModel, renderThumb, renderToCanvas, type QrModel } from '../qr/render'
import { loadAssets, type RenderAssets } from '../qr/images'
import {
  canCopyImage,
  copyImageToClipboard,
  exportEps,
  exportPdf,
  exportPng,
  exportSvg,
} from '../qr/exporters'
import type { HistoryEntry } from '../qr/history'
import { copyText } from '../qr/clipboard'
import { readableTextColor } from '../qr/audit'
import ScanAuditPanel from './ScanAuditPanel'

interface Props {
  value: string
  options: QrOptions
  emptyHint: string
  /** Content type id, stored with the history entry so it can be restored. */
  typeId?: string
  /** Field values, stored with the history entry so they can be restored. */
  formData?: Record<string, string | boolean>
  /** Called (debounced) when a stable value+style has rendered, for history. */
  onHistoryEntry?: (entry: HistoryEntry) => void
  /** Called when the user accepts an error-correction suggestion. */
  onOptionsChange?: (options: QrOptions) => void
  /** Absolute link that recreates the current code. */
  shareUrl?: string
  /** Shown under the copy-link button when the link carries a secret. */
  shareWarning?: string
}

const PNG_SCALES = [1, 2, 4, 8]

export default function QrPreview({
  value,
  options,
  emptyHint,
  typeId,
  formData,
  onHistoryEntry,
  onOptionsChange,
  shareUrl,
  shareWarning,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [assets, setAssets] = useState<RenderAssets>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [pngScale, setPngScale] = useState(4)

  // Encode during render — cheap, and keeps errors derived with the value.
  const [model, error] = useMemo<[QrModel | null, string]>(() => {
    if (!value) return [null, '']
    try {
      return [createModel(value, options.errorCorrectionLevel), '']
    } catch (err) {
      return [
        null,
        err instanceof Error ? err.message : 'Could not encode this value.',
      ]
    }
  }, [value, options.errorCorrectionLevel])

  // Load logo/background images referenced by the options.
  useEffect(() => {
    let alive = true
    void loadAssets({ logo: options.logo, bgImage: options.bgImage }).then((a) => {
      if (alive) setAssets(a)
    })
    return () => {
      alive = false
    }
  }, [options.logo, options.bgImage])

  // Draw.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!model) {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
      return
    }
    renderToCanvas(canvas, model, options, options.size, assets)
  }, [model, options, assets])

  // Record in history once things settle. The callback lives in a ref so an
  // inline handler from the parent can't retrigger this effect every render.
  const historyRef = useRef(onHistoryEntry)
  useEffect(() => {
    historyRef.current = onHistoryEntry
  }, [onHistoryEntry])
  const typeRef = useRef(typeId)
  const formDataRef = useRef(formData)
  useEffect(() => {
    typeRef.current = typeId
    formDataRef.current = formData
  }, [typeId, formData])
  useEffect(() => {
    if (!model || !historyRef.current) return
    const t = setTimeout(() => {
      const cb = historyRef.current
      if (!cb) return
      void renderThumb(value, options, 96).then((thumb) =>
        cb({
          id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          value,
          typeId: typeRef.current,
          formData: formDataRef.current,
          options,
          thumb,
          at: Date.now(),
        }),
      )
    }, 1500)
    return () => clearTimeout(t)
  }, [model, value, options])

  async function run(label: string, fn: () => void | Promise<void>): Promise<void> {
    setBusy(label)
    setNote('')
    try {
      await fn()
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Export failed.')
    }
    setBusy(null)
  }

  const disabled = !model || !!error

  // The empty hint sits on the background the user picked — keep it readable.
  const hintColor = useMemo(() => {
    if (options.bgMode === 'color') return readableTextColor(options.bgColor)
    // A checkerboard or an image background: dark text works on the
    // checkerboard, white text on a photo is the safer bet.
    return options.bgMode === 'transparent' ? '#4a4e57' : '#ffffff'
  }, [options.bgMode, options.bgColor])

  return (
    <div className="qr-preview">
      <div
        className="qr-canvas-wrap"
        style={{
          background:
            options.bgMode === 'transparent'
              ? 'repeating-conic-gradient(#e6e6e6 0% 25%, #ffffff 0% 50%) 50% / 16px 16px'
              : options.bgImage
                ? `#fff url(${options.bgImage}) center / cover`
                : options.bgColor,
        }}
      >
        {value && model ? (
          <canvas ref={canvasRef} />
        ) : (
          <p className="qr-empty-hint" style={{ color: hintColor }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm10-2h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2z" />
            </svg>
            {emptyHint}
          </p>
        )}
      </div>
      {value && model && (
        <p className="qr-value-caption" title={value}>
          {truncate(value, 64)}
        </p>
      )}
      {error && <p className="qr-error">{error}</p>}
      {note && <p className="qr-note">{note}</p>}

      <ScanAuditPanel
        model={model}
        value={value}
        options={options}
        onApplyErrorCorrection={
          onOptionsChange
            ? (level) => onOptionsChange({ ...options, errorCorrectionLevel: level })
            : undefined
        }
      />

      <div className="export-group">
        <div className="export-row">
          <button
            type="button"
            disabled={disabled || busy !== null}
            onClick={() => run('png', () => exportPng(model!, options, pngScale))}
          >
            {busy === 'png' ? 'Exporting…' : 'PNG'}
          </button>
          <label className="scale-pick">
            <select
              value={pngScale}
              onChange={(e) => setPngScale(Number(e.target.value))}
              disabled={disabled}
              aria-label="PNG scale"
            >
              {PNG_SCALES.map((s) => (
                <option key={s} value={s}>
                  {s}× ({options.size * s}px)
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="export-row">
          <button
            type="button"
            disabled={disabled || busy !== null}
            onClick={() => run('svg', () => exportSvg(model!, options))}
          >
            {busy === 'svg' ? 'Exporting…' : 'SVG'}
          </button>
        </div>
        <div className="export-row">
          <button
            type="button"
            disabled={disabled || busy !== null}
            onClick={() =>
              run('pdf', () =>
                exportPdf(model!, options, truncate(value, 40)),
              )
            }
          >
            {busy === 'pdf' ? 'Exporting…' : 'PDF (print)'}
          </button>
        </div>
        <div className="export-row">
          <button
            type="button"
            disabled={disabled || busy !== null}
            onClick={() => run('eps', () => exportEps(model!, options, truncate(value, 40)))}
          >
            {busy === 'eps' ? 'Exporting…' : 'EPS (vector)'}
          </button>
        </div>
        <div className="export-row">
          <button
            type="button"
            disabled={disabled || busy !== null || !canCopyImage()}
            title={canCopyImage() ? 'Copy PNG to clipboard' : 'Clipboard image copy not supported here'}
            onClick={() =>
              void run('copy', async () => {
                const ok = await copyImageToClipboard(model!, options)
                setNote(ok ? 'Image copied to clipboard.' : 'Clipboard image copy failed.')
              })
            }
          >
            {busy === 'copy' ? 'Copying…' : 'Copy image'}
          </button>
        </div>
        {shareUrl && (
          <div className="export-row">
            <button
              type="button"
              disabled={disabled || busy !== null}
              title="Copy a link that recreates this code (images are not included)"
              onClick={() =>
                void run('link', async () => {
                  const ok = await copyText(shareUrl)
                  if (ok) {
                    // Keep the address bar in sync so the link can be shared from there.
                    window.history.replaceState(null, '', shareUrl)
                    setNote('Link copied to clipboard.')
                  } else {
                    setNote('Could not copy the link. Copy it from the address bar.')
                  }
                })
              }
            >
              {busy === 'link' ? 'Copying…' : 'Copy link'}
            </button>
          </div>
        )}
        {shareUrl && shareWarning && <p className="qr-note">{shareWarning}</p>}
      </div>
    </div>
  )
}

function truncate(s: string, n: number): string {
  const flat = s.replace(/\s+/g, ' ').trim()
  return flat.length > n ? `${flat.slice(0, n - 1)}…` : flat
}
