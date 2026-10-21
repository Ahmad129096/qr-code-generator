/// <reference types="vite/client" />

/**
 * The build environment. Every value is optional — the app works without
 * them (see `.env.example`).
 */
interface ImportMetaEnv {
  /** The public URL of the site, e.g. https://qr.example.com (needed for SEO). */
  readonly VITE_SITE_URL?: string
  /** Where the "Support this project" link points to (Ko-fi). */
  readonly VITE_KOFI_URL?: string
  /** Where the "Support this project" link points to (Buy Me a Coffee). */
  readonly VITE_BUY_ME_A_COFFEE_URL?: string
  /** Where the "Support this project" link points to (GitHub Sponsors). */
  readonly VITE_GITHUB_SPONSORS_URL?: string
}
