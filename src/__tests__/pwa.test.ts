import { describe, expect, it } from 'vitest'
import {
  MANIFEST,
  MANIFEST_ICONS,
  pwaNotices,
  type PwaNoticeState,
} from '../pwa'

describe('the web app manifest', () => {
  it('has the fields a browser needs to offer the install', () => {
    expect(MANIFEST.name).toBeTruthy()
    expect(MANIFEST.short_name.length).toBeLessThanOrEqual(12)
    expect(MANIFEST.start_url).toBe('/')
    expect(MANIFEST.scope).toBe('/')
    expect(MANIFEST.display).toBe('standalone')
    expect(MANIFEST.theme_color).toMatch(/^#[0-9a-f]{6}$/i)
    expect(MANIFEST.background_color).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('ships an any-purpose icon in both common sizes', () => {
    const any = MANIFEST_ICONS.filter((icon) => icon.purpose === 'any')
    expect(any.map((icon) => icon.sizes)).toEqual(['192x192', '512x512'])
  })

  it('ships a maskable icon for Android', () => {
    const maskable = MANIFEST_ICONS.filter((icon) => icon.purpose === 'maskable')
    expect(maskable).toHaveLength(1)
    expect(maskable[0]?.sizes).toBe('512x512')
  })

  it('uses PNG icons with unique paths', () => {
    const paths = MANIFEST_ICONS.map((icon) => icon.src)
    expect(new Set(paths).size).toBe(paths.length)
    for (const icon of MANIFEST_ICONS) {
      expect(icon.src.startsWith('/')).toBe(true)
      expect(icon.type).toBe('image/png')
    }
  })
})

describe('pwaNotices', () => {
  const base: PwaNoticeState = {
    needRefresh: false,
    offlineReady: false,
    installAvailable: false,
    installed: false,
    online: true,
  }

  it('shows nothing when everything is fine', () => {
    expect(pwaNotices(base)).toEqual([])
  })

  it('puts the update notice first — it needs a decision', () => {
    const notices = pwaNotices({ ...base, needRefresh: true, offlineReady: true })
    expect(notices[0]).toBe('update')
  })

  it('warns when the device is offline', () => {
    expect(pwaNotices({ ...base, online: false })).toContain('offline')
  })

  it('offers the install only when the app is not installed yet', () => {
    expect(pwaNotices({ ...base, installAvailable: true })).toContain('install')
    expect(pwaNotices({ ...base, installAvailable: true, installed: true })).not.toContain('install')
  })

  it('lists every notice only once', () => {
    const notices = pwaNotices({
      needRefresh: true,
      offlineReady: true,
      installAvailable: true,
      installed: false,
      online: false,
    })
    expect(new Set(notices).size).toBe(notices.length)
    expect(notices).toEqual(['update', 'offline', 'offline-ready', 'install'])
  })
})
