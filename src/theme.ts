/**
 * The color theme.
 *
 * The visitor picks "auto" (follow the system), "light" or "dark". The choice
 * is stored in `localStorage` and the document gets a `data-theme` attribute
 * that the CSS design tokens react to.
 *
 * The module is deliberately free of side effects at import time, so it can be
 * unit-tested (and used by the small inline script in `index.html` logic).
 */

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'qr-theme'

/** The options in the order they are shown in the switcher. */
export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark']

export const THEME_LABELS: Record<ThemePreference, string> = {
  system: 'Auto',
  light: 'Light',
  dark: 'Dark',
}

/** Is this a preference the app understands? */
export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

/** The theme that is actually shown for a preference. */
export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light'
  return preference
}

/** The stored preference — "system" when nothing valid is stored. */
export function readThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(stored) ? stored : 'system'
  } catch {
    // Storage can be blocked (private mode, locked-down browser).
    return 'system'
  }
}

/** Remember the preference for the next visit. */
export function writeThemePreference(preference: ThemePreference): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Not being able to remember the choice is not worth an error.
  }
}

/** Does the system ask for a dark user interface? */
export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Write the resolved theme to the document so the CSS tokens follow it, and
 * return the theme that is now active.
 */
export function applyTheme(
  preference: ThemePreference,
  prefersDark: boolean = systemPrefersDark(),
): ResolvedTheme {
  const theme = resolveTheme(preference, prefersDark)
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme
  }
  return theme
}
