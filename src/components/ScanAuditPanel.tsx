import { useMemo, useState } from 'react'
import type { QrOptions } from '../qr/options'
import { auditCode, capacityFinding, type AuditFinding, type AuditSeverity } from '../qr/audit'
import { testScan, type TestScanResult } from '../qr/testScan'
import type { QrModel } from '../qr/render'

interface Props {
  /** Encoded model, or null when the value is empty / could not be encoded. */
  model: QrModel | null
  value: string
  options: QrOptions
  /** Reports an error-correction level the user should switch to. */
  onApplyErrorCorrection?: (level: QrOptions['errorCorrectionLevel']) => void
}

const ICONS: Record<AuditSeverity, string> = {
  ok: '✓',
  warn: '!',
  error: '×',
}

const LABELS: Record<AuditSeverity, string> = {
  ok: 'Pass',
  warn: 'Check',
  error: 'Problem',
}

/** Pull a suggested EC level out of a finding's suggestion text. */
function suggestedLevel(f: AuditFinding): QrOptions['errorCorrectionLevel'] | null {
  const m = /(?:switch to|error correction to)\s+([LMQH])\b/i.exec(f.suggestion ?? '')
  return m?.[1] ? (m[1].toUpperCase() as QrOptions['errorCorrectionLevel']) : null
}

export default function ScanAuditPanel({ model, value, options, onApplyErrorCorrection }: Props) {
  // A result is only valid for the exact design it was produced from; keep the
  // signature alongside it so a stale scan is dropped during render instead of
  // via an effect.
  const signature = `${value}|${JSON.stringify(options)}`
  const [scanState, setScanState] = useState<{ sig: string; result: TestScanResult } | null>(null)
  const [scanning, setScanning] = useState(false)
  const scan = scanState?.sig === signature ? scanState.result : null

  const findings = useMemo<AuditFinding[]>(() => {
    if (!model) {
      const capacity = value ? capacityFinding(value, options.errorCorrectionLevel) : null
      return capacity ? [capacity] : []
    }
    return auditCode({ options, modules: model.matrix.size })
  }, [model, value, options])

  const problems = findings.filter((f) => f.severity !== 'ok')
  const worst: AuditSeverity = findings.some((f) => f.severity === 'error')
    ? 'error'
    : problems.length > 0
      ? 'warn'
      : 'ok'

  // A stale "test scan" result must not outlive the code it describes —
  // handled by the signature check above.

  async function runTestScan(): Promise<void> {
    if (!model) return
    const sig = signature
    setScanning(true)
    // Let the button state paint before the synchronous decode work.
    await new Promise((r) => setTimeout(r, 0))
    try {
      setScanState({ sig, result: testScan(model, options) })
    } finally {
      setScanning(false)
    }
  }

  const summary = !value
    ? 'Add some content to see a scannability check.'
    : !model
      ? 'This content cannot be encoded yet — see the problem below.'
      : worst === 'ok'
        ? 'This code looks scannable.'
        : worst === 'warn'
          ? `${problems.length} thing${problems.length === 1 ? '' : 's'} worth checking.`
          : 'This code may not scan — fix the problems below.'

  return (
    <section className={`scan-audit audit-${worst}`} aria-labelledby="scan-audit-heading">
      <div className="audit-head">
        <h3 id="scan-audit-heading">
          <span className={`audit-badge audit-badge-${worst}`} aria-hidden="true">
            {ICONS[worst]}
          </span>
          Scan check
        </h3>
        {model && (
          <button
            type="button"
            className="audit-test-btn"
            onClick={() => void runTestScan()}
            disabled={scanning}
          >
            {scanning ? 'Testing…' : 'Test scan'}
          </button>
        )}
      </div>

      <p className="audit-summary">{summary}</p>

      {findings.length > 0 && (
        <ul className="audit-list">
          {findings.map((f) => {
            const level = suggestedLevel(f)
            return (
              <li key={f.id} className={`audit-item audit-item-${f.severity}`}>
                <span className="audit-icon" aria-hidden="true">
                  {ICONS[f.severity]}
                </span>
                <span className="audit-text">
                  <span className="sr-only">{LABELS[f.severity]}: </span>
                  {f.message}
                  {f.suggestion && <span className="audit-suggestion">{f.suggestion}</span>}
                  {level && onApplyErrorCorrection && level !== options.errorCorrectionLevel && (
                    <button
                      type="button"
                      className="audit-fix-btn"
                      onClick={() => onApplyErrorCorrection(level)}
                    >
                      Use {level}
                    </button>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      <div className="audit-live" role="status" aria-live="polite">
        {scanning && 'Testing this code…'}
        {!scanning && scan && (
          <>
            {scan.pass
              ? 'Test scan passed — this code decoded correctly.'
              : scan.decoded === null
                ? 'Test scan failed — no QR code could be read back from this design.'
                : 'Test scan failed — the decoded content did not match.'}
          </>
        )}
      </div>

      {!scanning && scan && (
        <p className={`audit-scan-result ${scan.pass ? 'ok' : 'bad'}`}>
          {scan.pass
            ? '✓ Decoded successfully in this browser.'
            : scan.decoded === null
              ? '× Could not decode this design. Increase contrast, raise error correction, shrink the logo, or add quiet zone.'
              : `× Read "${truncate(scan.decoded, 48)}" instead of the expected content.`}
        </p>
      )}

      {model && !scan && !scanning && (
        <p className="audit-note">
          Tip: run <strong>Test scan</strong> before printing — it decodes your design in this
          browser to catch problems a preview can hide.
        </p>
      )}
    </section>
  )
}

function truncate(s: string, n: number): string {
  const flat = s.replace(/\s+/g, ' ').trim()
  return flat.length > n ? `${flat.slice(0, n - 1)}…` : flat
}
