/**
 * The PWA parts that the build and the app share: the web app manifest (the
 * build writes it to `manifest.webmanifest`) and the rules that decide which
 * on-screen notices the app shows.
 *
 * The module is free of browser APIs so the Vite config can import it.
 */

export const APP_NAME = 'QR Code Generator'
export const APP_SHORT_NAME = 'QR Code'
export const APP_DESCRIPTION =
  'Free QR code generator — create high-resolution codes for links, Wi-Fi, contacts and more, right in your browser.'
export const THEME_COLOR = '#4c4fe0'
export const BACKGROUND_COLOR = '#f4f5f7'

export interface ManifestIcon {
  src: string
  sizes: string
  type: string
  purpose: 'any' | 'maskable'
}

export const MANIFEST_ICONS: ManifestIcon[] = [
  { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  {
    src: '/icons/icon-maskable-512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'maskable',
  },
]

export interface WebAppManifest {
  name: string
  short_name: string
  description: string
  lang: string
  dir: 'ltr' | 'rtl'
  start_url: string
  scope: string
  display: 'standalone'
  orientation: 'any'
  theme_color: string
  background_color: string
  categories: string[]
  icons: ManifestIcon[]
}

export const MANIFEST: WebAppManifest = {
  name: APP_NAME,
  short_name: APP_SHORT_NAME,
  description: APP_DESCRIPTION,
  lang: 'en',
  dir: 'ltr',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'any',
  theme_color: THEME_COLOR,
  background_color: BACKGROUND_COLOR,
  categories: ['utilities', 'productivity'],
  icons: MANIFEST_ICONS,
}

/** The notices the app can show under the content. */
export type PwaNotice = 'update' | 'offline' | 'offline-ready' | 'install'

export interface PwaNoticeState {
  /** A new service worker is waiting to take over. */
  needRefresh: boolean
  /** The app has been cached and now works offline. */
  offlineReady: boolean
  /** The browser offered to install the app. */
  installAvailable: boolean
  /** The app is already installed. */
  installed: boolean
  /** The device has a network connection. */
  online: boolean
}

/**
 * The notices to show, in the order they should appear. The update notice
 * comes first (it needs a decision), the offline notice is a warning, the
 * rest are information.
 */
export function pwaNotices(state: PwaNoticeState): PwaNotice[] {
  const notices: PwaNotice[] = []
  if (state.needRefresh) notices.push('update')
  if (!state.online) notices.push('offline')
  if (state.offlineReady) notices.push('offline-ready')
  if (state.installAvailable && !state.installed) {
    try {
      if (typeof window !== 'undefined') {
        const standalone =
          window.matchMedia('(display-mode: standalone)').matches ||
          (navigator as any).standalone === true
        if (standalone) return notices
      }
    } catch {}
    notices.push('install')
  }
  return notices
}
