/**
 * Where the "Support this project" link points to.
 *
 * The URLs come from the build environment, so anyone who forks the project
 * can point the button at their own page. Without any of them the link falls
 * back to the GitHub Sponsors page of the repository owner.
 */

export interface SupportTarget {
  url: string
  /** The name of the service, used for the tooltip and the screen reader. */
  provider: string
}

export interface SupportEnv {
  VITE_KOFI_URL?: string
  VITE_BUY_ME_A_COFFEE_URL?: string
  VITE_GITHUB_SPONSORS_URL?: string
}

export const REPOSITORY_URL = 'https://github.com/Ahmad129096/qr-code-generator'

export const DEFAULT_SPONSORS_URL = 'https://github.com/sponsors/Ahmad129096'

/** The first configured service wins; Ko-fi first, then Buy Me a Coffee. */
export function supportTarget(env: SupportEnv): SupportTarget {
  const koFi = env.VITE_KOFI_URL?.trim()
  if (koFi) return { url: koFi, provider: 'Ko-fi' }

  const coffee = env.VITE_BUY_ME_A_COFFEE_URL?.trim()
  if (coffee) return { url: coffee, provider: 'Buy Me a Coffee' }

  const sponsors = env.VITE_GITHUB_SPONSORS_URL?.trim()
  if (sponsors) return { url: sponsors, provider: 'GitHub Sponsors' }

  return { url: DEFAULT_SPONSORS_URL, provider: 'GitHub Sponsors' }
}
