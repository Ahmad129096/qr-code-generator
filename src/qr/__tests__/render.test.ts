import { describe, expect, it } from 'vitest'
import { defaultOptions } from '../options'
import { buildSvg, createModel } from '../render'

describe('buildSvg', () => {
  it('does not emit untrusted image references or markup', () => {
    const options = {
      ...defaultOptions(),
      bgMode: 'image' as const,
      bgImage: 'data:image/png;base64,AAAA" onload="alert(1)',
      logo: 'javascript:alert(1)',
    }
    const svg = buildSvg(createModel('safe payload', 'M'), options, 256)

    expect(svg).not.toContain('onload=')
    expect(svg).not.toContain('javascript:')
    expect(svg).not.toContain('<script')
  })

  it('preserves a valid uploaded data image', () => {
    const options = {
      ...defaultOptions(),
      logo: 'data:image/png;base64,AA==',
    }
    const svg = buildSvg(createModel('safe payload', 'M'), options, 256)

    expect(svg).toContain('href="data:image/png;base64,AA=="')
  })

  it('renders and escapes the call-to-action frame in SVG output', () => {
    const options = {
      ...defaultOptions(),
      frameText: '<Scan & connect>',
      frameBgColor: '#123456',
      frameTextColor: '#ffffff',
    }
    const svg = buildSvg(createModel('safe payload', 'M'), options, 256)

    expect(svg).toContain('height="48.80mm"')
    expect(svg).toContain('viewBox="0 0 256 312"')
    expect(svg).toContain('fill="#123456"')
    expect(svg).toContain('&lt;Scan &amp; connect&gt;')
    expect(svg).not.toContain('<Scan')
  })
})
