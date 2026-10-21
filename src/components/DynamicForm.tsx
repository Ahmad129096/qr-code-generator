import type { ChangeEvent } from 'react'
import type { FieldDef } from '../qrTypes'
import { localizeTerm } from '../locale'
import { useLocale } from '../localeContext'

interface Props {
  fields: FieldDef[]
  data: Record<string, string | boolean>
  onChange: (key: string, value: string | boolean) => void
}

export default function DynamicForm({ fields, data, onChange }: Props) {
  const { locale } = useLocale()
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
              <span>{localizeTerm(locale, field.label)}</span>
            </label>
          )
        }

        if (field.type === 'select') {
          return (
            <label key={field.key} className="field">
              <span className="field-label">{localizeTerm(locale, field.label)}</span>
              <select
                id={id}
                value={String(value ?? '')}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(field.key, e.target.value)}
              >
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {localizeTerm(locale, opt.label)}
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
                {localizeTerm(locale, field.label)}
                {field.required && <span className="required" aria-hidden="true">*</span>}
              </span>
              <textarea
                id={id}
                value={String(value ?? '')}
                placeholder={field.placeholder}
                required={field.required}
                rows={3}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(field.key, e.target.value)}
              />
            </label>
          )
        }

        return (
          <label key={field.key} className="field">
            <span className="field-label">
              {localizeTerm(locale, field.label)}
              {field.required && <span className="required" aria-hidden="true">*</span>}
            </span>
            <input
              id={id}
              type={field.type === 'password' ? 'password' : 'text'}
              value={String(value ?? '')}
              placeholder={field.placeholder}
              required={field.required}
              autoComplete="off"
              onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(field.key, e.target.value)}
            />
          </label>
        )
      })}
    </div>
  )
}
