import { useCallback, lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { QR_TYPES, FIRST_TYPE, defaultFormData } from './qrTypes'
import DynamicForm from './components/DynamicForm'
import QrPreview from './components/QrPreview'
import OptionsPanel from './components/OptionsPanel'
import HistoryPanel from './components/HistoryPanel'
import LandingHero from './components/LandingHero'
import NotFoundPage from './components/NotFoundPage'
import { defaultOptions, type QrOptions } from './qr/options'
import { loadHistory, pushHistory, type HistoryEntry } from './qr/history'
import { buildShareUrl, decodeShareState } from './qr/share'
import { HOME_LANDING, landingForSlug, pathForType, type LandingPage } from './landing'
import { applyNotFoundSeo, applySeo } from './seo'
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

/** The content type the app starts on, based on the path (and the shared link). */
function initialTypeId(): string {
  const slug = window.location.pathname.replace(/^\/+/, '').replace(/\/+$/, '')
  if (!slug) return sharedState?.typeId ?? HOME_LANDING.typeId
  return landingForSlug(slug)?.typeId ?? HOME_LANDING.typeId
}

function initialFormData(): Record<string, Record<string, string | boolean>> {
  const initial: Record<string, Record<string, string | boolean>> = {}
  for (const type of QR_TYPES) initial[type.id] = defaultFormData(type)
  const type = QR_TYPES.find((t) => t.id === initialTypeId())
  if (type && sharedState && sharedState.typeId === type.id) {
    initial[type.id] = { ...defaultFormData(type), ...sharedState.formData }
  }
  return initial
}

export default function App() {
  const navigate = useNavigate()
  const [view, setView] = useState<View>('create')
  const [formDataByType, setFormDataByType] = useState(initialFormData)
  const [options, setOptions] = useState<QrOptions>(
    () => sharedState?.options ?? defaultOptions(),
  )
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory())

  const handleFieldChange = useCallback(
    (typeId: string, key: string, value: string | boolean) => {
      setFormDataByType((prev) => ({
        ...prev,
        [typeId]: { ...prev[typeId], [key]: value },
      }))
    },
    [],
  )

  // QrPreview calls this once a code has settled; dedupe + cap in storage.
  const handleHistoryEntry = useCallback((entry: HistoryEntry) => {
    setHistory(pushHistory(entry))
  }, [])

  const restoreEntry = useCallback(
    (entry: HistoryEntry) => {
      setOptions(entry.options)
      // Newer entries carry the content type and its fields, so a restore
      // brings back the code itself — not just its style.
      const type = entry.typeId ? QR_TYPES.find((t) => t.id === entry.typeId) : undefined
      if (type) {
        if (entry.formData) {
          setFormDataByType((prev) => ({
            ...prev,
            [type.id]: { ...defaultFormData(type), ...entry.formData },
          }))
        }
        // Show the restored type on screen.
        navigate(pathForType(type.id))
      }
      setView('create')
    },
    [navigate],
  )

  const generatorProps = {
    view,
    formDataByType,
    options,
    onOptionsChange: setOptions,
    onFieldChange: handleFieldChange,
    onHistoryEntry: handleHistoryEntry,
    history,
    onHistoryChange: setHistory,
    onRestore: restoreEntry,
  }

  return (
    <div className="app">
      <header className="app-header">
        <p className="brand">
          <Link to="/">QR Code Generator</Link>
        </p>
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

      <Routes>
        <Route path="/" element={<GeneratorRoute {...generatorProps} />} />
        <Route path="/:slug" element={<GeneratorRoute {...generatorProps} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}

interface GeneratorRouteProps {
  view: View
  formDataByType: Record<string, Record<string, string | boolean>>
  options: QrOptions
  onOptionsChange: (options: QrOptions) => void
  onFieldChange: (typeId: string, key: string, value: string | boolean) => void
  onHistoryEntry: (entry: HistoryEntry) => void
  history: HistoryEntry[]
  onHistoryChange: (entries: HistoryEntry[]) => void
  onRestore: (entry: HistoryEntry) => void
}

/** Resolves the URL slug to a content type, then renders the generator. */
function GeneratorRoute(props: GeneratorRouteProps) {
  const { slug } = useParams()
  return <GeneratorPage {...props} slug={slug ?? ''} />
}

function GeneratorPage({
  slug,
  view,
  formDataByType,
  options,
  onOptionsChange,
  onFieldChange,
  onHistoryEntry,
  history,
  onHistoryChange,
  onRestore,
}: GeneratorRouteProps & { slug: string }) {
  const landing = useMemo<LandingPage | undefined>(() => {
    if (slug) return landingForSlug(slug)
    // The home page follows the shared link when there is one.
    if (sharedState) {
      return { ...HOME_LANDING, typeId: sharedState.typeId }
    }
    return HOME_LANDING
  }, [slug])

  // Keep the document head in sync with the page (the static build ships the
  // right tags for a direct visit; this covers client-side navigation).
  useEffect(() => {
    if (landing) applySeo(landing)
    else applyNotFoundSeo()
  }, [landing])

  const activeType = useMemo(
    () => QR_TYPES.find((t) => t.id === landing?.typeId) ?? FIRST_TYPE,
    [landing?.typeId],
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
  const shareUrl = useMemo(
    () =>
      buildShareUrl(`${window.location.origin}${pathForType(activeType.id)}`, {
        typeId: activeType.id,
        formData: activeData,
        options,
      }),
    [activeType.id, activeData, options],
  )
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

  if (!landing) {
    return <NotFoundPage />
  }

  return (
    <>
      <LandingHero landing={landing} />

      {view === 'create' ? (
        <>
          <div className="type-tabs">
            {QR_TYPES.map((type) => (
              <Link
                key={type.id}
                to={pathForType(type.id)}
                className={`type-tab ${type.id === activeType.id ? 'active' : ''}`}
                aria-current={type.id === activeType.id ? 'page' : undefined}
              >
                <span className="type-icon" aria-hidden="true">
                  {type.icon}
                </span>
                {type.label}
              </Link>
            ))}
          </div>

          <main className="app-main">
            <section className="panel form-panel">
              <h2>{activeType.label} details</h2>
              <DynamicForm
                fields={activeType.fields}
                data={activeData}
                onChange={(key, value) => onFieldChange(activeType.id, key, value)}
              />

              <h2 className="options-heading">Style</h2>
              <OptionsPanel options={options} onChange={onOptionsChange} />
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
                onHistoryEntry={onHistoryEntry}
                onOptionsChange={onOptionsChange}
              />
            </section>
          </main>

          <HistoryPanel
            entries={history}
            onChange={onHistoryChange}
            onRestore={onRestore}
          />
        </>
      ) : view === 'scan' ? (
        <main className="app-main single">
          <section className="panel">
            <h2>Scan a QR code</h2>
            <Suspense fallback={<p className="history-empty">Loading scanner…</p>}>
              <ScannerPanel />
            </Suspense>
          </section>
        </main>
      ) : (
        <main className="app-main single">
          <section className="panel">
            <h2>Batch generation</h2>
            <Suspense fallback={<p className="history-empty">Loading batch tools…</p>}>
              <BatchPanel options={options} />
            </Suspense>
          </section>
        </main>
      )}
    </>
  )
}
