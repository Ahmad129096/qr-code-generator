import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  isLocale,
  LOCALE_STORAGE_KEY,
  applyLocaleToDocument,
  localeDirection,
  localizeTerm,
  readLocale,
  saveLocale,
  translate,
} from '../locale'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('locale helpers', () => {
  it('accepts only supported locales', () => {
    expect(isLocale('en')).toBe(true)
    expect(isLocale('ur')).toBe(true)
    expect(isLocale('ar')).toBe(true)
    expect(isLocale('fr')).toBe(false)
    expect(isLocale(null)).toBe(false)
  })

  it('sets RTL direction for Urdu and Arabic', () => {
    expect(localeDirection('en')).toBe('ltr')
    expect(localeDirection('ur')).toBe('rtl')
    expect(localeDirection('ar')).toBe('rtl')
  })

  it('sets the document language and direction', () => {
    const root = { lang: '', dir: '' }
    applyLocaleToDocument('ur', root)
    expect(root).toEqual({ lang: 'ur', dir: 'rtl' })
    applyLocaleToDocument('en', root)
    expect(root).toEqual({ lang: 'en', dir: 'ltr' })
  })

  it('loads a supported persisted locale and falls back for invalid values', () => {
    vi.stubGlobal('window', {
      localStorage: { getItem: vi.fn().mockReturnValue('ur') },
    })
    expect(readLocale()).toBe('ur')
    expect(window.localStorage.getItem).toHaveBeenCalledWith(LOCALE_STORAGE_KEY)

    vi.stubGlobal('window', {
      localStorage: { getItem: vi.fn().mockReturnValue('fr') },
    })
    expect(readLocale()).toBe('en')
  })

  it('provides translated messages and common form terms', () => {
    expect(translate('ur', 'privacyNote')).toContain('آپ کا ڈیٹا')
    expect(translate('ar', 'privacyNote')).toContain('بياناتك')
    expect(localizeTerm('ur', 'Password')).toBe('پاس ورڈ')
    expect(localizeTerm('ar', 'Password')).toBe('كلمة المرور')
    expect(localizeTerm('ur', 'Untranslated term')).toBe('Untranslated term')
  })

  it('persists a locale selection', () => {
    const setItem = vi.fn()
    vi.stubGlobal('window', { localStorage: { setItem } })
    saveLocale('ar')
    expect(setItem).toHaveBeenCalledWith(LOCALE_STORAGE_KEY, 'ar')
  })
})
