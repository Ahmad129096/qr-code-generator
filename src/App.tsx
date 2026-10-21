import { useCallback, lazy, Suspense, useMemo, useState } from 'react'
import { QR_TYPES, FIRST_TYPE, defaultFormData } from './qrTypes'
import DynamicForm from './components/DynamicForm'
import QrPreview from './components/QrPreview'
import OptionsPanel from './components/OptionsPanel'
import HistoryPanel from './components/HistoryPanel'
import { defaultOptions, type QrOptions } from './qr/options'
import { loadHistory, pushHistory, type HistoryEntry } from './qr/history'
import { buildShareUrl, decodeShareState } from './qr/share'
import './App.css'

// The scanner (jsqr) and batch (jszip) toolchains are only needed on their
// own views — keep them out of the initial bundle.
const ScannerPanel = lazy(() => import('./components/ScannerPanel'))
const BatchPanel = lazy(() => import('./components/BatchPanel'))

type View = 'create' | 'scan' | 'batch'

/**
 * A link like /wifi-qr-code-generator#s=… carries the whole setup — read it
 * once, before the first render, so the app opens in the shared state.
 */
const sharedState = (() => {
  if (typeof window === 'undefined') return null
  const state = decodeShareState(window.location.hash)
  if (!state) return null
  return QR_TYPES.some((t) => t.id === state.typeId) ? state : null
})()

export default function App() {
  const [view, setView] = useState<View>('create')
  const [activeTypeId, setActiveTypeId] = useState(() => sharedState?.typeId ?? FIRST_TYPE.id)
  const [formDataByType, setFormDataByType] = useState<
    Record<string, Record<string, string | boolean>>
  >(() => {
    const initial: Record<string, Record<string, string | boolean>> = {}
    for (const type of QR_TYPES) initial[type.id] = defaultFormData(type)
    if (sharedState) {
      const type = QR_TYPES.find((t) => t.id === sharedState.typeId)
      if (type) initial[type.id] = { ...defaultFormData(type), ...sharedState.formData }
    }
    return initial
  })
  const [options, setOptions] = useState<QrOptions>(
    () => sharedState?.options ?? defaultOptions(),
  )
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory())

  const activeType = useMemo(
    () => QR_TYPES.find((t) => t.id === activeTypeId) ?? FIRST_TYPE,
    [activeTypeId],
  )
  // Fall back to defaults if the stored map ever lacks an entry.
  const activeData = useMemo(
    () => formDataByType[activeType.id] ?? defaultFormData(activeType),
    [formDataByType, activeType],
  )
  const qrValue = useMemo(
    () => activeType.build(activeData),
    [activeType, activeData],
  )

  const handleFieldChange = (key: string, value: string | boolean) => {
    setFormDataByType((prev) => ({
      ...prev,
      [activeTypeId]: { ...prev[activeTypeId], [key]: value },
    }))
  }

  // QrPreview calls this once a code has settled; dedupe + cap in storage.
  const handleHistoryEntry = useCallback((entry: HistoryEntry) => {
    setHistory(pushHistory(entry))
  }, [])

  const restoreEntry = useCallback((entry: HistoryEntry) => {
    setOptions(entry.options)
    // Newer entries carry the content type and its fields, so a restore brings
    // back the code itself — not just its style.
    const type = entry.typeId ? QR_TYPES.find((t) => t.id === entry.typeId) : undefined
    if (type) {
      setActiveTypeId(type.id)
      if (entry.formData) {
        setFormDataByType((prev) => ({
          ...prev,
          [type.id]: { ...defaultFormData(type), ...entry.formData },
        }))
      }
    }
    setView('create')
  }, [])

  // A link like /wifi-qr-code-generator#s=… carries the whole setup — it is
  // applied when the app boots (see `sharedState` above).

  const shareUrl = useMemo(() => {
    const base = window.location.href.split('#')[0] ?? window.location.href
    return buildShareUrl(base, {
      typeId: activeType.id,
      formData: activeData,
      options,
    })
  }, [activeType.id, activeData, options])

  // A link carries the field values, so warn when one of them is a secret.
  const shareWarning = useMemo(() => {
    const secret = activeType.fields.find((field) => {
      if (field.type !== 'password') return false
      const value = activeData[field.key]
      return typeof value === 'string' && value.trim() !== ''
    })
    if (!secret) return undefined
    return `This link includes the ${secret.label.toLowerCase()} — anyone with the link can read it.`
  }, [activeType, activeData])

  return (
    <div className="app">
      <header className="app-header">
        <h1>QR Code Generator</h1>
        <p>Create QR codes for URLs, Wi-Fi, contacts, events, and more.</p>
      </header>

      <nav className="view-tabs" aria-label="Tools">
        {(
          [
            ['create', 'Create', '✨'],
            ['scan', 'Scan', '📷'],
            ['batch', 'Batch', '📦'],
          ] as [View, string, string][]
        ).map(([id, label, icon]) => (
          <button
            key={id}
            type="button"
            className={`view-tab ${view === id ? 'active' : ''}`}
            onClick={() => setView(id)}
          >
            <span aria-hidden="true">{icon}</span> {label}
          </button>
        ))}
      </nav>

      {view === 'scan' && (
        <main className="app-main single">
          <section className="panel">
            <h2>Scan a QR code</h2>
            <Suspense fallback={<p className="history-empty">Loading scanner…</p>}>
              <ScannerPanel />
            </Suspense>
          </section>
        </main>
      )}

      {view === 'batch' && (
        <main className="app-main single">
          <section className="panel">
            <h2>Batch generation</h2>
            <Suspense fallback={<p className="history-empty">Loading batch tools…</p>}>
              <BatchPanel options={options} />
            </Suspense>
          </section>
        </main>
      )}

      {view === 'create' && (
        <>
          <div className="type-tabs">
            {QR_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                className={`type-tab ${type.id === activeTypeId ? 'active' : ''}`}
                onClick={() => setActiveTypeId(type.id)}
              >
                <span className="type-icon" aria-hidden="true">
                  {type.icon}
                </span>
                {type.label}
              </button>
            ))}
          </div>

          <main className="app-main">
            <section className="panel form-panel">
              <h2>{activeType.label} details</h2>
              <DynamicForm
                fields={activeType.fields}
                data={activeData}
                onChange={handleFieldChange}
              />

              <h2 className="options-heading">Style</h2>
              <OptionsPanel options={options} onChange={setOptions} />
            </section>

            <section className="panel preview-panel">
              <h2>Preview</h2>
              <QrPreview
                value={qrValue}
                options={options}
                emptyHint={activeType.emptyHint}
                typeId={activeType.id}
                formData={activeData}
                shareUrl={shareUrl}
                shareWarning={shareWarning}
                onHistoryEntry={handleHistoryEntry}
                onOptionsChange={setOptions}
              />
            </section>
          </main>

          <HistoryPanel
            entries={history}
            onChange={setHistory}
            onRestore={restoreEntry}
          />
        </>
      )}
    </div>
  )
}
