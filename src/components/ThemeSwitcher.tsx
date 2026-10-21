import { useEffect, useState } from 'react'
import {
  THEME_PREFERENCES,
  applyTheme,
  readThemePreference,
  writeThemePreference,
  type ThemePreference,
} from '../theme'
import { useLocale } from '../localeContext'

const THEME_ICONS: Record<ThemePreference, string> = {
  system: '🌗',
  light: '☀️',
  dark: '🌙',
}

/**
 * Lets the visitor pick the color theme: follow the system, always light or
 * always dark. The choice is remembered for the next visit.
 */
export default function ThemeSwitcher() {
  const { t } = useLocale()
  const [preference, setPreference] = useState<ThemePreference>(() => readThemePreference())

  // Keep the document in sync with the choice.
  useEffect(() => {
    applyTheme(preference)
  }, [preference])

  // While the choice is "auto", follow the system when it changes.
  useEffect(() => {
    if (preference !== 'system') return
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system', query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [preference])

  function choose(next: ThemePreference): void {
    setPreference(next)
    writeThemePreference(next)
    applyTheme(next)
  }

  return (
    <div className="theme-switcher">
      <span className="theme-switcher-label" id="theme-switcher-label">
        {t('theme')}
      </span>
      <div className="theme-options" role="radiogroup" aria-labelledby="theme-switcher-label">
        {THEME_PREFERENCES.map((option) => (
          <label
            key={option}
            className={`theme-option${option === preference ? ' active' : ''}`}
          >
            <input
              type="radio"
              name="theme"
              value={option}
              checked={option === preference}
              aria-label={`${t(
                option === 'system' ? 'autoTheme' : option === 'light' ? 'lightTheme' : 'darkTheme',
              )} ${t('theme')}`}
              onChange={() => choose(option)}
            />
            <span aria-hidden="true">{THEME_ICONS[option]}</span>
            <span className="theme-option-text">
              {t(
                option === 'system' ? 'autoTheme' : option === 'light' ? 'lightTheme' : 'darkTheme',
              )}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
