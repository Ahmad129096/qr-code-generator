import { describe, expect, it } from 'vitest'
import { createQrPng, createQrSvg, mountQrWidget } from '../browser'

describe('browser developer API', () => {
  it('creates SVG using the shared QR renderer', () => {
    const svg = createQrSvg('https://example.com', {
      fgColor: '#123456',
      errorCorrectionLevel: 'Q',
    })

    expect(svg).toContain('<svg ')
    expect(svg).toContain('fill="#123456"')
  })

  it('rejects empty content and invalid PNG scales explicitly', async () => {
    expect(() => createQrSvg('')).toThrow('QR content must be a non-empty string')
    await expect(createQrPng('example', undefined, 0)).rejects.toThrow(
      'PNG scale must be an integer from 1 to 8',
    )
  })

  it('does not mount a widget outside a browser', () => {
    expect(() => mountQrWidget('#widget')).toThrow('The QR widget can only be mounted in a browser')
  })
})
