import { describe, expect, it } from 'vitest'
import { defaultOptions, sanitizeImageDataUrl, sanitizeOptions } from '../options'

describe('sanitizeOptions', () => {
  it('keeps supported values within the UI ranges', () => {
    const result = sanitizeOptions({
      size: 512,
      margin: 4,
      gradientAngle: 360,
      logoSize: 0.4,
      logoFit: 'cover',
      printSizeMm: 120,
      printMarginMm: 20,
      moduleShape: 'heart',
      errorCorrectionLevel: 'H',
    })
    expect(result.size).toBe(512)
    expect(result.margin).toBe(4)
    expect(result.gradientAngle).toBe(360)
    expect(result.logoSize).toBe(0.4)
    expect(result.logoFit).toBe('cover')
    expect(result.printSizeMm).toBe(120)
    expect(result.printMarginMm).toBe(20)
    expect(result.moduleShape).toBe('heart')
    expect(result.errorCorrectionLevel).toBe('H')
  })

  it('falls back for invalid enum values, colors, and out-of-range numbers', () => {
    const defaults = defaultOptions()
    const result = sanitizeOptions({
      size: Number.MAX_VALUE,
      margin: -1,
      fillMode: 'url',
      fgColor: 'url(javascript:alert(1))',
      moduleShape: 'script',
      errorCorrectionLevel: 'X',
      logoFit: 'crop',
    })
    expect(result.size).toBe(defaults.size)
    expect(result.margin).toBe(defaults.margin)
    expect(result.fillMode).toBe(defaults.fillMode)
    expect(result.fgColor).toBe(defaults.fgColor)
    expect(result.moduleShape).toBe(defaults.moduleShape)
    expect(result.errorCorrectionLevel).toBe(defaults.errorCorrectionLevel)
    expect(result.logoFit).toBe(defaults.logoFit)
  })

  it('only accepts bounded local image data URLs', () => {
    expect(sanitizeImageDataUrl('data:image/png;base64,AA==')).toBe(
      'data:image/png;base64,AA==',
    )
    expect(sanitizeImageDataUrl('https://example.com/logo.png')).toBeNull()
    expect(sanitizeImageDataUrl('data:image/png;base64,AAAA" onload="alert(1)')).toBeNull()

    const result = sanitizeOptions({
      logo: 'javascript:alert(1)',
      bgImage: 'https://example.com/background.png',
    })
    expect(result.logo).toBeNull()
    expect(result.bgImage).toBeNull()
  })
})
