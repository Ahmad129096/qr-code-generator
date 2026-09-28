import { useCallback, lazy, Suspense, useMemo, useState } from 'react'
import { QR_TYPES, defaultFormData } from './qrTypes'
import DynamicForm from './components/DynamicForm'
import QrPreview from './components/QrPreview'
import OptionsPanel from './components/OptionsPanel'
import HistoryPanel from './components/HistoryPanel'
import { defaultOptions, type QrOptions } from './qr/options'
import { loadHistory, pushHistory, type HistoryEntry } from './qr/history'
import './App.css'

// The scanner (jsqr) and batch (jszip) toolchains are only needed on their
// own views — keep them out of the initial bundle.
const ScannerPanel = lazy(() => import('./components/ScannerPanel'))
const BatchPanel = lazy(() => import('./components/BatchPanel'))

type View = 'create' | 'scan' | 'batch'

export default function App() {
  const [view, setView] = useState<View>('create')
  const [activeTypeId, setActiveTypeId] = useState(QR_TYPES[0].id)
  const [formDataByType, setFormDataByType] = useState<
    Record<string, Record<string, string | boolean>>
  >(() => {
    const initial: Record<string, Record<string, string | boolean>> = {}
    for (const type of QR_TYPES) initial[type.id] = defaultFormData(type)
    return initial
  })
  const [options, setOptions] = useState<QrOptions>(defaultOptions)
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory())

  const activeType = useMemo(
    () => QR_TYPES.find((t) => t.id === activeTypeId)!,
    [activeTypeId],
  )
  const activeData = formDataByType[activeTypeId]
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
    setView('create')
  }, [])

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
                onHistoryEntry={handleHistoryEntry}
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
