import { useRef, useState } from 'react'
import type {
  EyeFrameShape,
  EyePupilShape,
  ModuleShape,
  PdfPrintPreset,
  QrOptions,
  StylePreset,
} from '../qr/options'
import { PRESETS, PRINT_PRESET_DEFAULT_SIZES, PRINT_PRESET_MAX_SIZES } from '../qr/options'
import { fileToDataUrl } from '../qr/images'
import { loadSaved, removeSaved, savePreset, type SavedPreset } from '../qr/history'
import { extractPaletteFromImage } from '../qr/palette'
import { localizeTerm } from '../locale'
import { useLocale } from '../localeContext'

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
  const { locale } = useLocale()
  const patch = (p: Partial<QrOptions>) => onChange({ ...options, ...p })
  const logoInput = useRef<HTMLInputElement>(null)
  const bgInput = useRef<HTMLInputElement>(null)
  const [saved, setSaved] = useState<SavedPreset[]>(() => loadSaved())
  const [presetName, setPresetName] = useState('')
  const [logoBusy, setLogoBusy] = useState(false)
  const [bgBusy, setBgBusy] = useState(false)
  const [paletteBusy, setPaletteBusy] = useState(false)
  const [palette, setPalette] = useState<string[]>([])
  const [assetError, setAssetError] = useState('')

  function applyPreset(p: StylePreset) {
    patch(p.options)
  }

  async function pickLogo(file: File | undefined) {
    if (!file) return
    setLogoBusy(true)
    setAssetError('')
    setPalette([])
    try {
      patch({ logo: await fileToDataUrl(file, 512, true) })
    } catch (err) {
      setAssetError(err instanceof Error ? err.message : 'Could not read that logo image.')
    } finally {
      setLogoBusy(false)
    }
  }

  async function pickBg(file: File | undefined) {
    if (!file) return
    setBgBusy(true)
    setAssetError('')
    try {
      patch({ bgMode: 'image', bgImage: await fileToDataUrl(file, 1600, true) })
    } catch (err) {
      setAssetError(err instanceof Error ? err.message : 'Could not read that background image.')
    } finally {
      setBgBusy(false)
    }
  }

  async function extractLogoPalette(): Promise<void> {
    if (!options.logo) return
    setPaletteBusy(true)
    setAssetError('')
    try {
      setPalette(await extractPaletteFromImage(options.logo))
    } catch (err) {
      setAssetError(err instanceof Error ? err.message : 'Could not extract colors from the logo.')
    } finally {
      setPaletteBusy(false)
    }
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
        <h3>{localizeTerm(locale, 'Theme presets')}</h3>
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
        <h3>{localizeTerm(locale, 'Colors')}</h3>
        <div className="opt-grid">
          <label className="field">
            <span className="field-label">{localizeTerm(locale, 'Fill')}</span>
            <select
              value={options.fillMode}
              onChange={(e) => patch({ fillMode: e.target.value as QrOptions['fillMode'] })}
            >
              <option value="solid">{localizeTerm(locale, 'Solid color')}</option>
              <option value="linear">{localizeTerm(locale, 'Linear gradient')}</option>
              <option value="radial">{localizeTerm(locale, 'Radial gradient')}</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">{localizeTerm(locale, options.fillMode === 'solid' ? 'Color' : 'Start color')}</span>
            <input
              type="color"
              value={options.fgColor}
              onChange={(e) => patch({ fgColor: e.target.value })}
            />
          </label>
          {options.fillMode !== 'solid' && (
            <>
              <label className="field">
                <span className="field-label">{localizeTerm(locale, 'End color')}</span>
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
            <span className="field-label">{localizeTerm(locale, 'Background')}</span>
            <select
              value={options.bgMode}
              onChange={(e) => patch({ bgMode: e.target.value as QrOptions['bgMode'] })}
            >
              <option value="color">{localizeTerm(locale, 'Solid color')}</option>
              <option value="transparent">{localizeTerm(locale, 'Transparent')}</option>
              <option value="image">{localizeTerm(locale, 'Image')}</option>
            </select>
          </label>
          {options.bgMode === 'color' && (
            <label className="field">
              <span className="field-label">{localizeTerm(locale, 'Background color')}</span>
              <input
                type="color"
                value={options.bgColor}
                onChange={(e) => patch({ bgColor: e.target.value })}
              />
            </label>
          )}
          {options.bgMode === 'image' && (
            <div className="field">
              <span className="field-label">{localizeTerm(locale, 'Background image')} {bgBusy ? '…' : ''}</span>
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
        <h3>{localizeTerm(locale, 'Shapes')}</h3>
        <div className="opt-grid">
          <label className="field">
            <span className="field-label">{localizeTerm(locale, 'Modules')}</span>
            <select
              value={options.moduleShape}
              onChange={(e) => patch({ moduleShape: e.target.value as ModuleShape })}
            >
              {MODULE_SHAPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {localizeTerm(locale, s.label)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{localizeTerm(locale, 'Eye frame')}</span>
            <select
              value={options.eyeFrameShape}
              onChange={(e) => patch({ eyeFrameShape: e.target.value as EyeFrameShape })}
            >
              {EYE_FRAMES.map((s) => (
                <option key={s.value} value={s.value}>
                  {localizeTerm(locale, s.label)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{localizeTerm(locale, 'Eye pupil')}</span>
            <select
              value={options.eyePupilShape}
              onChange={(e) => patch({ eyePupilShape: e.target.value as EyePupilShape })}
            >
              {EYE_PUPILS.map((s) => (
                <option key={s.value} value={s.value}>
                  {localizeTerm(locale, s.label)}
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
        <h3>{localizeTerm(locale, 'Logo')}</h3>
        <div className="opt-grid">
          <div className="field">
            <span className="field-label">{localizeTerm(locale, 'Center logo')} {logoBusy ? '…' : ''}</span>
            <div className="image-actions">
              <button type="button" onClick={() => logoInput.current?.click()}>
                {options.logo ? 'Replace…' : 'Upload…'}
              </button>
              {options.logo && (
                <button
                  type="button"
                  onClick={() => {
                    patch({ logo: null })
                    setPalette([])
                  }}
                >
                  Remove
                </button>
              )}
              {options.logo && (
                <button
                  type="button"
                  disabled={paletteBusy}
                  onClick={() => void extractLogoPalette()}
                >
                  {paletteBusy ? 'Extracting colors…' : 'Extract brand colors'}
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
              <div className="logo-size-control">
                <div className="logo-size-preview" aria-hidden="true">
                  <img
                    src={options.logo}
                    alt=""
                    style={{
                      width: `${Math.round(options.logoSize * 100)}%`,
                      height: `${Math.round(options.logoSize * 100)}%`,
                      objectFit: options.logoFit,
                    }}
                  />
                </div>
                <div className="logo-size-content">
                  <div className="logo-size-heading">
                    <label className="field-label" htmlFor="logo-size">
                      {localizeTerm(locale, 'Logo size')}
                    </label>
                    <output htmlFor="logo-size">{Math.round(options.logoSize * 100)}%</output>
                  </div>
                  <input
                    id="logo-size"
                    className="logo-size-range"
                    type="range"
                    min={0.1}
                    max={0.4}
                    step={0.01}
                    value={options.logoSize}
                    aria-valuetext={`${Math.round(options.logoSize * 100)}%`}
                    onChange={(e) => patch({ logoSize: Number(e.target.value) })}
                  />
                  <div className="logo-size-scale" aria-hidden="true">
                    <span>10%</span>
                    <span>40%</span>
                  </div>
                </div>
              </div>
              <label className="field">
                <span className="field-label">{localizeTerm(locale, 'Logo image fit')}</span>
                <select
                  value={options.logoFit}
                  onChange={(e) =>
                    patch({ logoFit: e.target.value as QrOptions['logoFit'] })
                  }
                >
                  <option value="contain">{localizeTerm(locale, 'Fit whole image')}</option>
                  <option value="cover">{localizeTerm(locale, 'Crop to fill')}</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">{localizeTerm(locale, 'Logo shape')}</span>
                <select
                  value={options.logoShape}
                  onChange={(e) => patch({ logoShape: e.target.value as QrOptions['logoShape'] })}
                >
                  <option value="square">{localizeTerm(locale, 'Square')}</option>
                  <option value="rounded">{localizeTerm(locale, 'Rounded')}</option>
                  <option value="circle">{localizeTerm(locale, 'Circle')}</option>
                </select>
              </label>
              <label className="field field-checkbox">
                <input
                  type="checkbox"
                  checked={options.logoPlate}
                  onChange={(e) => patch({ logoPlate: e.target.checked })}
                />
                <span className="field-label">{localizeTerm(locale, 'White plate behind logo')}</span>
              </label>
            </>
          )}
        </div>
        {palette.length > 0 && (
          <div className="brand-palette" aria-label={localizeTerm(locale, 'Colors extracted from logo')}>
            {palette.map((swatch) => (
              <button
                key={swatch}
                type="button"
                className="brand-color"
                style={{ backgroundColor: swatch }}
                aria-label={`Use ${swatch} as foreground color`}
                title={`Use ${swatch} as foreground`}
                onClick={() => patch({ fgColor: swatch, fillMode: 'solid' })}
              />
            ))}
          </div>
        )}
        {assetError && (
          <p className="qr-error" role="alert">
            {assetError}
          </p>
        )}
        {options.logo && (
          <p className="opt-hint">
            Scan check below the preview verifies your logo size against the current error
            correction level and suggests a safer one.
          </p>
        )}
      </section>

      <section className="opt-section">
        <h3>{localizeTerm(locale, 'Frame')}</h3>
        <div className="opt-grid">
          <label className="field field-wide">
            <span className="field-label">{localizeTerm(locale, 'Call-to-action text')}</span>
            <input
              type="text"
              maxLength={80}
              value={options.frameText}
              placeholder="e.g. Scan to connect"
              onChange={(e) => patch({ frameText: e.target.value })}
            />
          </label>
          {options.frameText.trim() && (
            <>
              <label className="field">
                <span className="field-label">{localizeTerm(locale, 'Frame background')}</span>
                <input
                  type="color"
                  value={options.frameBgColor}
                  onChange={(e) => patch({ frameBgColor: e.target.value })}
                />
              </label>
              <label className="field">
                <span className="field-label">{localizeTerm(locale, 'Frame text color')}</span>
                <input
                  type="color"
                  value={options.frameTextColor}
                  onChange={(e) => patch({ frameTextColor: e.target.value })}
                />
              </label>
            </>
          )}
        </div>
        <p className="opt-hint">The frame appears in PNG, SVG, PDF and the preview.</p>
      </section>

      <section className="opt-section">
        <h3>{localizeTerm(locale, 'Output')}</h3>
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
            <span className="field-label">{localizeTerm(locale, 'Error correction')}</span>
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
              max={PRINT_PRESET_MAX_SIZES[options.printPreset]}
              step={1}
              value={options.printSizeMm}
              onChange={(e) => patch({ printSizeMm: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span className="field-label">{localizeTerm(locale, 'PDF print layout')}</span>
            <select
              value={options.printPreset}
              onChange={(e) => {
                const preset = e.target.value as PdfPrintPreset
                patch({
                  printPreset: preset,
                  printSizeMm: PRINT_PRESET_DEFAULT_SIZES[preset],
                })
              }}
            >
              <option value="sheet">{localizeTerm(locale, 'A4 sheet of repeated codes')}</option>
              <option value="business-card">{localizeTerm(locale, 'Business card (85.6 × 54 mm)')}</option>
              <option value="a4-poster">{localizeTerm(locale, 'A4 poster')}</option>
              <option value="table-tent">{localizeTerm(locale, 'A4 folded table tent')}</option>
            </select>
          </label>
          {options.printPreset === 'sheet' && (
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
          )}
        </div>
      </section>
    </div>
  )
}
