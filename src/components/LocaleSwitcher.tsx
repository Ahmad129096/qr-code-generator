import { LOCALES, LOCALE_NAMES, type Locale } from '../locale'
import { useLocale } from '../localeContext'

export default function LocaleSwitcher() {
  const { locale, setLocale, t } = useLocale()
  return (
    <label className="locale-switcher">
      <span>{t('language')}</span>
      <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
        {LOCALES.map((option) => (
          <option key={option} value={option}>
            {LOCALE_NAMES[option]}
          </option>
        ))}
      </select>
    </label>
  )
}
