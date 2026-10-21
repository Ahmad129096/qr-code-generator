import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  applyLocaleToDocument,
  readLocale,
  saveLocale,
  translate,
  type Locale,
} from './locale'
import { LocaleContext, type LocaleContextValue } from './localeContext'

export default function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readLocale)

  const setLocale = (next: Locale) => {
    setLocaleState(next)
    saveLocale(next)
  }

  useEffect(() => {
    applyLocaleToDocument(locale, document.documentElement)
  }, [locale])

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: (key) => translate(locale, key) }),
    [locale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}
