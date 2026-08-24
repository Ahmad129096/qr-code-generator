import type { QrOptions } from './QrPreview'

interface Props {
  options: QrOptions
  onChange: (options: QrOptions) => void
}

export default function OptionsPanel({ options, onChange }: Props) {
  return (
    <div className="options-panel">
      <label className="field">
        <span className="field-label">Foreground color</span>
        <input
          type="color"
          value={options.fgColor}
          onChange={(e) => onChange({ ...options, fgColor: e.target.value })}
        />
      </label>
      <label className="field">
        <span className="field-label">Background color</span>
        <input
          type="color"
          value={options.bgColor}
          onChange={(e) => onChange({ ...options, bgColor: e.target.value })}
        />
      </label>
      <label className="field">
        <span className="field-label">Size: {options.size}px</span>
        <input
          type="range"
          min={128}
          max={512}
          step={16}
          value={options.size}
          onChange={(e) => onChange({ ...options, size: Number(e.target.value) })}
        />
      </label>
      <label className="field">
        <span className="field-label">Error correction</span>
        <select
          value={options.errorCorrectionLevel}
          onChange={(e) => onChange({ ...options, errorCorrectionLevel: e.target.value as QrOptions['errorCorrectionLevel'] })}
        >
          <option value="L">Low (7%)</option>
          <option value="M">Medium (15%)</option>
          <option value="Q">Quartile (25%)</option>
          <option value="H">High (30%)</option>
        </select>
      </label>
    </div>
  )
}
