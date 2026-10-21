import { describe, expect, it } from 'vitest'
import {
  THEME_PREFERENCES,
  isThemePreference,
  readThemePreference,
  resolveTheme,
  writeThemePreference,
} from '../theme'

describe('resolveTheme', () => {
  it('follows the system in "system" mode', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('ignores the system once a theme is picked', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})

describe('isThemePreference', () => {
  it('accepts the three known preferences', () => {
    for (const preference of THEME_PREFERENCES) {
      expect(isThemePreference(preference)).toBe(true)
    }
  })

  it('rejects anything else', () => {
    expect(isThemePreference('blue')).toBe(false)
    expect(isThemePreference('')).toBe(false)
    expect(isThemePreference(null)).toBe(false)
    expect(isThemePreference(undefined)).toBe(false)
  })
})

describe('the stored preference', () => {
  it('falls back to "system" when nothing is stored', () => {
    expect(readThemePreference()).toBe('system')
  })

  it('survives a browser that blocks storage', () => {
    // There is no window in the test environment, so this is the guarded path.
    expect(() => writeThemePreference('dark')).not.toThrow()
  })
})
