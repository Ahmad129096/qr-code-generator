import { useMemo, useState } from 'react'
import { QR_TYPES, defaultFormData } from './qrTypes'
import DynamicForm from './components/DynamicForm'
import QrPreview from './components/QrPreview'
import OptionsPanel from './components/OptionsPanel'
import type { QrOptions } from './components/QrPreview'
import './App.css'

export default function App() {
  const [activeTypeId, setActiveTypeId] = useState(QR_TYPES[0].id)
  const [formDataByType, setFormDataByType] = useState<Record<string, Record<string, string | boolean>>>(() => {
    const initial: Record<string, Record<string, string | boolean>> = {}
    for (const type of QR_TYPES) initial[type.id] = defaultFormData(type)
    return initial
  })
  const [options, setOptions] = useState<QrOptions>({
    size: 256,
    fgColor: '#000000',
    bgColor: '#ffffff',
    errorCorrectionLevel: 'M',
    margin: 2,
  })

  const activeType = useMemo(() => QR_TYPES.find((t) => t.id === activeTypeId)!, [activeTypeId])
  const activeData = formDataByType[activeTypeId]
  const qrValue = useMemo(() => activeType.build(activeData), [activeType, activeData])

  function handleFieldChange(key: string, value: string | boolean) {
    setFormDataByType((prev) => ({
      ...prev,
      [activeTypeId]: { ...prev[activeTypeId], [key]: value },
    }))
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>QR Code Generator</h1>
        <p>Create QR codes for URLs, Wi-Fi, contacts, events, and more.</p>
      </header>

      <div className="type-tabs">
        {QR_TYPES.map((type) => (
          <button
            key={type.id}
            type="button"
            className={`type-tab ${type.id === activeTypeId ? 'active' : ''}`}
            onClick={() => setActiveTypeId(type.id)}
          >
            <span className="type-icon" aria-hidden="true">{type.icon}</span>
            {type.label}
          </button>
        ))}
      </div>

      <main className="app-main">
        <section className="panel form-panel">
          <h2>{activeType.label} details</h2>
          <DynamicForm fields={activeType.fields} data={activeData} onChange={handleFieldChange} />

          <h2 className="options-heading">Style</h2>
          <OptionsPanel options={options} onChange={setOptions} />
        </section>

        <section className="panel preview-panel">
          <h2>Preview</h2>
          <QrPreview value={qrValue} options={options} emptyHint={activeType.emptyHint} />
        </section>
      </main>
    </div>
  )
}
