import { QR_TEMPLATES, type QrTemplate } from '../qr/templates'
import { useLocale } from '../localeContext'

interface Props {
  onSelect: (template: QrTemplate) => void
}

export default function TemplatePicker({ onSelect }: Props) {
  const { t } = useLocale()
  const templateLabels: Record<string, [string, string]> = {
    'restaurant-menu': [t('restaurantMenu'), t('restaurantMenuDescription')],
    event: [t('eventTemplate'), t('eventTemplateDescription')],
    'business-card': [t('businessCard'), t('businessCardDescription')],
    'wifi-sign': [t('wifiSign'), t('wifiSignDescription')],
  }
  return (
    <section className="template-picker" aria-labelledby="template-picker-heading">
      <div className="template-picker-heading">
        <div>
          <h2 id="template-picker-heading">{t('templates')}</h2>
          <p>{t('templatesHelp')}</p>
        </div>
      </div>
      <div className="template-grid">
        {QR_TEMPLATES.map((template) => {
          const [name, description] = templateLabels[template.id] ?? [
            template.name,
            template.description,
          ]
          return (
            <button
              key={template.id}
              type="button"
              className="template-card"
              onClick={() => onSelect(template)}
            >
              <strong>{name}</strong>
              <span>{description}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
