import { useRef, useState } from 'react'
import type {
  EyeFrameShape,
  EyePupilShape,
  ModuleShape,
  QrOptions,
  StylePreset,
} from '../qr/options'
import { PRESETS } from '../qr/options'
import { fileToDataUrl } from '../qr/images'
import { loadSaved, removeSaved, savePreset, type SavedPreset } from '../qr/history'

interface Props {
  options: QrOptions
  onChange: (options: QrOptions) => void
}

const MODULE_SHAPES: { value: ModuleShape; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'dot', label: 'Dot' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'leaf', label: 'Leaf' },
  { value: 'star', label: 'Star' },
  { value: 'heart', label: 'Heart' },
]

const EYE_FRAMES: { value: EyeFrameShape; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'circle', label: 'Circle' },
  { value: 'leaf', label: 'Leaf' },
  { value: 'heart', label: 'Heart' },
]

const EYE_PUPILS: { value: EyePupilShape; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'circle', label: 'Circle' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'heart', label: 'Heart' },
]

export default function OptionsPanel({ options, onChange }: Props) {
  const patch = (p: Partial<QrOptions>) => onChange({ ...options, ...p })
  const logoInput = useRef<HTMLInputElement>(null)
  const bgInput = useRef<HTMLInputElement>(null)
  const [saved, setSaved] = useState<SavedPreset[]>(() => loadSaved())
  const [presetName, setPresetName] = useState('')
  const [logoBusy, setLogoBusy] = useState(false)
  const [bgBusy, setBgBusy] = useState(false)

  function applyPreset(p: StylePreset) {
    patch(p.options)
  }

  async function pickLogo(file: File | undefined) {
    if (!file) return
    setLogoBusy(true)
    try {
      patch({ logo: await fileToDataUrl(file, 512, true) })
    } catch {
      /* invalid image — keep current logo */
    }
    setLogoBusy(false)
  }

  async function pickBg(file: File | undefined) {
    if (!file) return
    setBgBusy(true)
    try {
      patch({ bgMode: 'image', bgImage: await fileToDataUrl(file, 1600, true) })
    } catch {
      /* invalid image */
    }
    setBgBusy(false)
  }

  function handleSavePreset() {
    const name = presetName.trim()
    if (!name) return
    setSaved(savePreset(name, options))
    setPresetName('')
  }

  return (
    <div className="options-panel">
      <section className="opt-section">
        <h3>Theme presets</h3>
        <div className="preset-row">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="preset-chip"
              title={p.name}
              onClick={() => applyPreset(p)}
            >
              <span className="preset-swatch" style={{ background: p.swatch }} />
              {p.name}
            </button>
          ))}
        </div>
        {saved.length > 0 && (
          <div className="preset-row">
            {saved.map((p) => (
              <span key={p.id} className="preset-chip saved">
                <button
                  type="button"
                  className="preset-name"
                  title={`Apply "${p.name}"`}
                  onClick={() => onChange(p.options)}
                >
                  ★ {p.name}
                </button>
                <button
                  type="button"
                  className="preset-x"
                  aria-label={`Delete preset ${p.name}`}
                  onClick={() => setSaved(removeSaved(p.id))}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="preset-save">
          <input
            type="text"
            placeholder="Name this style…"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSavePreset()
            }}
          />
          <button type="button" onClick={handleSavePreset} disabled={!presetName.trim()}>
            Save style
          </button>
        </div>
      </section>

      <section className="opt-section">
        <h3>Colors</h3>
        <div className="opt-grid">
          <label className="field">
            <span className="field-label">Fill</span>
            <select
              value={options.fillMode}
              onChange={(e) => patch({ fillMode: e.target.value as QrOptions['fillMode'] })}
            >
              <option value="solid">Solid color</option>
              <option value="linear">Linear gradient</option>
              <option value="radial">Radial gradient</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">{options.fillMode === 'solid' ? 'Color' : 'Start color'}</span>
            <input
              type="color"
              value={options.fgColor}
              onChange={(e) => patch({ fgColor: e.target.value })}
            />
          </label>
          {options.fillMode !== 'solid' && (
            <>
              <label className="field">
                <span className="field-label">End color</span>
                <input
                  type="color"
                  value={options.gradColor}
                  onChange={(e) => patch({ gradColor: e.target.value })}
                />
              </label>
              {options.fillMode === 'linear' && (
                <label className="field">
                  <span className="field-label">Angle: {options.gradientAngle}°</span>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={5}
                    value={options.gradientAngle}
                    onChange={(e) => patch({ gradientAngle: Number(e.target.value) })}
                  />
                </label>
              )}
            </>
          )}
          <label className="field">
            <span className="field-label">Background</span>
            <select
              value={options.bgMode}
              onChange={(e) => patch({ bgMode: e.target.value as QrOptions['bgMode'] })}
            >
              <option value="color">Solid color</option>
              <option value="transparent">Transparent</option>
              <option value="image">Image</option>
            </select>
          </label>
          {options.bgMode === 'color' && (
            <label className="field">
              <span className="field-label">Background color</span>
              <input
                type="color"
                value={options.bgColor}
                onChange={(e) => patch({ bgColor: e.target.value })}
              />
            </label>
          )}
          {options.bgMode === 'image' && (
            <div className="field">
              <span className="field-label">Background image {bgBusy ? '…' : ''}</span>
              <div className="image-actions">
                <button type="button" onClick={() => bgInput.current?.click()}>
                  {options.bgImage ? 'Replace…' : 'Upload…'}
                </button>
                {options.bgImage && (
                  <button
                    type="button"
                    onClick={() => patch({ bgImage: null, bgMode: 'color' })}
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={bgInput}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  void pickBg(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </div>
          )}
        </div>
      </section>

      <section className="opt-section">
        <h3>Shapes</h3>
        <div className="opt-grid">
          <label className="field">
            <span className="field-label">Modules</span>
            <select
              value={options.moduleShape}
              onChange={(e) => patch({ moduleShape: e.target.value as ModuleShape })}
            >
              {MODULE_SHAPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Eye frame</span>
            <select
              value={options.eyeFrameShape}
              onChange={(e) => patch({ eyeFrameShape: e.target.value as EyeFrameShape })}
            >
              {EYE_FRAMES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Eye pupil</span>
            <select
              value={options.eyePupilShape}
              onChange={(e) => patch({ eyePupilShape: e.target.value as EyePupilShape })}
            >
              {EYE_PUPILS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Quiet zone: {options.margin} modules</span>
            <input
              type="range"
              min={0}
              max={6}
              step={1}
              value={options.margin}
              onChange={(e) => patch({ margin: Number(e.target.value) })}
            />
          </label>
        </div>
      </section>

      <section className="opt-section">
        <h3>Logo</h3>
        <div className="opt-grid">
          <div className="field">
            <span className="field-label">Center logo {logoBusy ? '…' : ''}</span>
            <div className="image-actions">
              <button type="button" onClick={() => logoInput.current?.click()}>
                {options.logo ? 'Replace…' : 'Upload…'}
              </button>
              {options.logo && (
                <button type="button" onClick={() => patch({ logo: null })}>
                  Remove
                </button>
              )}
            </div>
            <input
              ref={logoInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void pickLogo(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>
          {options.logo && (
            <>
              <label className="field">
                <span className="field-label">Logo shape</span>
                <select
                  value={options.logoShape}
                  onChange={(e) => patch({ logoShape: e.target.value as QrOptions['logoShape'] })}
                >
                  <option value="square">Square</option>
                  <option value="rounded">Rounded</option>
                  <option value="circle">Circle</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">Size: {Math.round(options.logoSize * 100)}%</span>
                <input
                  type="range"
                  min={0.1}
                  max={0.4}
                  step={0.01}
                  value={options.logoSize}
                  onChange={(e) => patch({ logoSize: Number(e.target.value) })}
                />
              </label>
              <label className="field field-checkbox">
                <input
                  type="checkbox"
                  checked={options.logoPlate}
                  onChange={(e) => patch({ logoPlate: e.target.checked })}
                />
                <span className="field-label">White plate behind logo</span>
              </label>
            </>
          )}
        </div>
        {options.logo && options.errorCorrectionLevel !== 'H' && (
          <p className="opt-hint">
            Tip: switch error correction to <strong>High (H)</strong> so the logo covers less
            recoverable data.
          </p>
        )}
      </section>

      <section className="opt-section">
        <h3>Output</h3>
        <div className="opt-grid">
          <label className="field">
            <span className="field-label">Preview size: {options.size}px</span>
            <input
              type="range"
              min={128}
              max={512}
              step={16}
              value={options.size}
              onChange={(e) => patch({ size: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span className="field-label">Error correction</span>
            <select
              value={options.errorCorrectionLevel}
              onChange={(e) =>
                patch({ errorCorrectionLevel: e.target.value as QrOptions['errorCorrectionLevel'] })
              }
            >
              <option value="L">Low (7%)</option>
              <option value="M">Medium (15%)</option>
              <option value="Q">Quartile (25%)</option>
              <option value="H">High (30%)</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Print size: {options.printSizeMm} mm</span>
            <input
              type="range"
              min={20}
              max={120}
              step={5}
              value={options.printSizeMm}
              onChange={(e) => patch({ printSizeMm: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span className="field-label">Sheet gap: {options.printMarginMm} mm</span>
            <input
              type="range"
              min={2}
              max={20}
              step={1}
              value={options.printMarginMm}
              onChange={(e) => patch({ printMarginMm: Number(e.target.value) })}
            />
          </label>
        </div>
      </section>
    </div>
  )
}
