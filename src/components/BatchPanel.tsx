import { useRef, useState } from 'react'
import type { QrOptions } from '../qr/options'
import { generateZip, parseCsv, parseJson, BatchParseError, type BatchFormat, type BatchItem } from '../qr/batch'
import { downloadBlob } from '../qr/exporters'

interface Props {
  options: QrOptions
}

export default function BatchPanel({ options }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<BatchItem[]>([])
  const [source, setSource] = useState('')
  const [format, setFormat] = useState<BatchFormat>('png')
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  function ingest(text: string, name: string): void {
    setError('')
    setItems([])
    try {
      const parsed = name.toLowerCase().endsWith('.json') || text.trimStart().startsWith('[')
        ? parseJson(text)
        : parseCsv(text)
      setItems(parsed)
      setSource(name)
    } catch (err) {
      setError(err instanceof BatchParseError ? err.message : 'Could not read that file.')
    }
  }

  function handleFile(file: File | undefined): void {
    if (!file) return
    const reader = new FileReader()
    reader.onerror = () => setError('Could not read that file.')
    reader.onload = () => ingest(String(reader.result || ''), file.name)
    reader.readAsText(file)
  }

  function handlePaste(text: string): void {
    if (!text.trim()) {
      setItems([])
      setSource('')
      return
    }
    ingest(text, 'pasted data')
  }

  async function generate(): Promise<void> {
    setError('')
    setProgress({ done: 0, total: items.length })
    try {
      const blob = await generateZip(items, options, format, (done, total) =>
        setProgress({ done, total }),
      )
      downloadBlob(blob, 'qr-codes.zip')
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
          Paste a list — or upload a CSV/JSON file — and get a ZIP of QR codes styled with your
          current settings.
        </p>
        <p className="batch-help">
          CSV: a <code>url</code>/<code>value</code> column plus an optional{' '}
          <code>label</code> column (labels become file names). JSON: an array of strings or of
          objects like <code>{'{ "value": "…", "label": "…" }'}</code>. You can also drop a
          file straight onto the box below.
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
            <span className="field-label">Paste rows (one per line)</span>
            <textarea
              rows={6}
              placeholder={'https://example.com\nhttps://example.org, Example org'}
              onChange={(e) => handlePaste(e.target.value)}
            />
          </label>
          <div className="upload-btn">
            Upload CSV / JSON…
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
      </div>

      {error && <p className="qr-error">{error}</p>}

      {items.length > 0 && (
        <div className="batch-summary">
          <p>
            <strong>{items.length}</strong> code{items.length === 1 ? '' : 's'} ready
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

      <div className="batch-controls">
        <label className="field">
          <span className="field-label">Format</span>
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
            ? `Generating ${progress.done}/${progress.total}…`
            : `Download ZIP (${items.length})`}
        </button>
      </div>
      {progress && (
        <div className="progress">
          <div
            className="progress-bar"
            style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}
