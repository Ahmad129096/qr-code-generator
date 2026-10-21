import { useRef, useState } from 'react'
import type { QrOptions } from '../qr/options'
import {
  BatchParseError,
  generateZip,
  MAX_BATCH_FILE_BYTES,
  parseCsv,
  parseJson,
  type BatchFormat,
  type BatchItem,
} from '../qr/batch'
import { downloadBlob } from '../qr/exporters'
import { useLocale } from '../localeContext'

interface Props {
  options: QrOptions
}

export default function BatchPanel({ options }: Props) {
  const { t } = useLocale()
  const fileInput = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<BatchItem[]>([])
  const [source, setSource] = useState('')
  const [format, setFormat] = useState<BatchFormat>('png')
  const [error, setError] = useState('')
  const [skipped, setSkipped] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  function ingest(text: string, name: string): void {
    setError('')
    setSkipped([])
    setItems([])
    try {
      const parsed = name.toLowerCase().endsWith('.json') || text.trimStart().startsWith('[')
        ? parseJson(text)
        : parseCsv(text)
      setItems(parsed)
      setSource(name)
    } catch (err) {
      setSource('')
      setError(err instanceof BatchParseError ? err.message : 'Could not read that file.')
    }
  }

  function handleFile(file: File | undefined): void {
    if (!file) return
    setError('')
    setSkipped([])
    setItems([])
    setSource('')
    if (file.size > MAX_BATCH_FILE_BYTES) {
      setError('That file is over the 1 MiB limit. Split it into smaller files and try again.')
      return
    }
    const reader = new FileReader()
    reader.onerror = () => setError('Could not read that file.')
    reader.onload = () => ingest(String(reader.result || ''), file.name)
    reader.readAsText(file)
  }

  function handlePaste(text: string): void {
    if (!text.trim()) {
      setItems([])
      setSource('')
      setError('')
      setSkipped([])
      return
    }
    ingest(text, 'pasted data')
  }

  async function generate(): Promise<void> {
    setError('')
    setSkipped([])
    setProgress({ done: 0, total: items.length })
    try {
      const result = await generateZip(items, options, format, (done, total) =>
        setProgress({ done, total }),
      )
      downloadBlob(result.blob, 'qr-codes.zip')
      setSkipped(result.skipped)
      setProgress(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch generation failed.')
      setProgress(null)
    }
  }

  return (
    <div className="batch">
      <div className="batch-intro">
        <p>
          {t('batchIntro')}
        </p>
        <p className="batch-help">
          CSV: a <code>url</code>/<code>value</code> column plus an optional{' '}
          <code>label</code> column (labels become file names). JSON: an array of strings or of
          objects like <code>{'{ "value": "…", "label": "…" }'}</code>. You can also drop a
          file straight onto the box below. Maximum input file: 1 MiB; maximum batch: 100 codes;
          maximum QR value: 2,048 UTF-8 bytes.
        </p>
      </div>

      <div
        className={`drop-zone${dragOver ? ' dragover' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFile(e.dataTransfer.files?.[0])
        }}
      >
        <div className="batch-inputs">
          <label className="field">
            <span className="field-label">{t('batchPaste')}</span>
            <textarea
              rows={6}
              placeholder={'https://example.com\nhttps://example.org, Example org'}
              onChange={(e) => handlePaste(e.target.value)}
            />
          </label>
          <button type="button" className="upload-btn" onClick={() => fileInput.current?.click()}>
            {t('uploadCsvJson')}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.json,text/csv,application/json"
            hidden
            onChange={(e) => {
              handleFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
      </div>

      {error && (
        <p className="qr-error" role="alert">
          {error}
        </p>
      )}

      {items.length > 0 && (
        <div className="batch-summary" role="status" aria-live="polite">
          <p>
            <strong>{items.length}</strong> {t('batchReady')}
            {source ? ` from ${source}` : ''}.
          </p>
          <ul className="batch-preview">
            {items.slice(0, 5).map((item, i) => (
              <li key={`${item.value}-${i}`}>
                <code>{item.label || item.value}</code>
              </li>
            ))}
            {items.length > 5 && <li className="more">…and {items.length - 5} more</li>}
          </ul>
        </div>
      )}

      {skipped.length > 0 && (
        <p className="batch-warning" role="status" aria-live="polite">
          ZIP downloaded with {skipped.length} skipped row{skipped.length === 1 ? '' : 's'} that
          could not be encoded: {skipped.slice(0, 5).join(', ')}
          {skipped.length > 5 ? ` and ${skipped.length - 5} more` : ''}.
        </p>
      )}

      <div className="batch-controls">
        <label className="field">
          <span className="field-label">{t('formatLabel')}</span>
          <select value={format} onChange={(e) => setFormat(e.target.value as BatchFormat)}>
            <option value="png">PNG (4×)</option>
            <option value="svg">SVG (vector)</option>
            <option value="both">PNG + SVG</option>
          </select>
        </label>
        <button
          type="button"
          className="primary"
          disabled={items.length === 0 || progress !== null}
          onClick={() => void generate()}
        >
          {progress
            ? `${t('generating')} ${progress.done}/${progress.total}…`
            : `${t('downloadZipCount')} (${items.length})`}
        </button>
      </div>
      {progress && (
        <div
          className="progress"
          role="progressbar"
          aria-label={t('generating')}
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.done}
        >
          <div
            className="progress-bar"
            style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }}
          />
          <span className="sr-only">
            {t('progressCount')} {progress.done} / {progress.total}
          </span>
        </div>
      )}
    </div>
  )
}
