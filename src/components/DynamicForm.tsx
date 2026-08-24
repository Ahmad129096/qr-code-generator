import type { ChangeEvent } from 'react'
import type { FieldDef } from '../qrTypes'

interface Props {
  fields: FieldDef[]
  data: Record<string, string | boolean>
  onChange: (key: string, value: string | boolean) => void
}

export default function DynamicForm({ fields, data, onChange }: Props) {
  return (
    <div className="form-grid">
      {fields.map((field) => {
        const value = data[field.key]
        const id = `field-${field.key}`

        if (field.type === 'checkbox') {
          return (
            <label key={field.key} className="field field-checkbox">
              <input
                id={id}
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(field.key, e.target.checked)}
              />
              <span>{field.label}</span>
            </label>
          )
        }

        if (field.type === 'select') {
          return (
            <label key={field.key} className="field">
              <span className="field-label">{field.label}</span>
              <select
                id={id}
                value={String(value ?? '')}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(field.key, e.target.value)}
              >
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          )
        }

        if (field.type === 'textarea') {
          return (
            <label key={field.key} className="field field-wide">
              <span className="field-label">
                {field.label}
                {field.required && <span className="required">*</span>}
              </span>
              <textarea
                id={id}
                value={String(value ?? '')}
                placeholder={field.placeholder}
                rows={3}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(field.key, e.target.value)}
              />
            </label>
          )
        }

        return (
          <label key={field.key} className="field">
            <span className="field-label">
              {field.label}
              {field.required && <span className="required">*</span>}
            </span>
            <input
              id={id}
              type={field.type === 'password' ? 'password' : 'text'}
              value={String(value ?? '')}
              placeholder={field.placeholder}
              autoComplete="off"
              onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(field.key, e.target.value)}
            />
          </label>
        )
      })}
    </div>
  )
}
