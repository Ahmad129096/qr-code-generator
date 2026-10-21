import { describe, expect, it } from 'vitest'
import {
  buildShareUrl,
  decodeShareState,
  encodeShareState,
  type ShareState,
} from '../share'
import { defaultOptions } from '../options'

function state(overrides: Partial<ShareState> = {}): ShareState {
  return {
    typeId: 'wifi',
    formData: { ssid: 'MyNetwork', password: 'hunter2', hidden: false },
    options: defaultOptions(),
    ...overrides,
  }
}

describe('share state', () => {
  it('round-trips type, fields and style', () => {
    const original = state({
      options: {
        ...defaultOptions(),
        fgColor: '#ff00aa',
        errorCorrectionLevel: 'H',
        frameText: 'SCAN TO CONNECT',
        printPreset: 'business-card',
        printSizeMm: 32,
      },
    })
    const decoded = decodeShareState(encodeShareState(original))
    expect(decoded).not.toBeNull()
    expect(decoded?.typeId).toBe('wifi')
    expect(decoded?.formData).toEqual({ ssid: 'MyNetwork', password: 'hunter2' })
    expect(decoded?.options.fgColor).toBe('#ff00aa')
    expect(decoded?.options.errorCorrectionLevel).toBe('H')
    expect(decoded?.options.frameText).toBe('SCAN TO CONNECT')
    expect(decoded?.options.printPreset).toBe('business-card')
    expect(decoded?.options.printSizeMm).toBe(32)
  })

  it('handles non-ASCII field values', () => {
    const decoded = decodeShareState(
      encodeShareState(state({ formData: { ssid: 'Café Ñoño', note: 'مطعم' } })),
    )
    expect(decoded?.formData).toEqual({ ssid: 'Café Ñoño', note: 'مطعم' })
  })

  it('accepts a hash with or without the leading #', () => {
    const hash = encodeShareState(state())
    expect(decodeShareState(hash)).not.toBeNull()
    expect(decodeShareState(hash.slice(1))).not.toBeNull()
  })

  it('drops empty fields and default options', () => {
    const hash = encodeShareState(state({ formData: { ssid: 'Net', empty: '', off: false } }))
    const decoded = decodeShareState(hash)
    expect(decoded?.formData).toEqual({ ssid: 'Net' })
    // Every option was at its default, so nothing is stored.
    expect(hash.length).toBeLessThan(120)
  })

  it('never embeds image data (logo / background)', () => {
    const hash = encodeShareState(
      state({
        options: {
          ...defaultOptions(),
          logo: 'data:image/png;base64,AAAA',
          bgImage: 'data:image/png;base64,BBBB',
        },
      }),
    )
    const decoded = decodeShareState(hash)
    expect(decoded?.options.logo).toBeNull()
    expect(decoded?.options.bgImage).toBeNull()
    expect(hash).not.toContain('data:image')
  })

  it('returns null for junk input', () => {
    expect(decodeShareState('')).toBeNull()
    expect(decodeShareState('#')).toBeNull()
    expect(decodeShareState('#other=1')).toBeNull()
    expect(decodeShareState('#s=%%%not-base64%%%')).toBeNull()
    expect(decodeShareState('#s=eyJub3QiOiJhcHAifQ')).toBeNull()
  })

  it('fills missing options with defaults', () => {
    const decoded = decodeShareState(encodeShareState(state()))
    expect(decoded?.options).toEqual(defaultOptions())
  })

  it('sanitizes hostile option values in an incoming fragment', () => {
    const raw = JSON.stringify({
      t: 'wifi',
      d: { ssid: 'Guest' },
      o: {
        size: Number.MAX_VALUE,
        margin: -1,
        moduleShape: 'script',
        logo: 'data:image/png;base64,AAAA" onload="alert(1)',
      },
    })
    const hash = `#s=${btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`
    const decoded = decodeShareState(hash)

    expect(decoded?.options.size).toBe(defaultOptions().size)
    expect(decoded?.options.margin).toBe(defaultOptions().margin)
    expect(decoded?.options.moduleShape).toBe(defaultOptions().moduleShape)
    expect(decoded?.options.logo).toBeNull()
  })

  it('builds a URL that replaces an existing fragment', () => {
    const url = buildShareUrl('https://example.com/wifi-qr-code-generator#old=1', state())
    expect(url.startsWith('https://example.com/wifi-qr-code-generator#s=')).toBe(true)
    expect(url).not.toContain('old=1')
    expect(decodeShareState(url.slice(url.indexOf('#')))).not.toBeNull()
  })
})
