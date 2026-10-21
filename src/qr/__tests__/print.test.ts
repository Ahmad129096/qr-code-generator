import { describe, expect, it } from 'vitest'
import { pdfPageLayout } from '../print'

describe('PDF print layouts', () => {
  it('keeps the existing repeated-code A4 sheet as the default layout', () => {
    expect(pdfPageLayout('sheet')).toEqual({
      widthMm: 210,
      heightMm: 297,
      orientation: 'portrait',
      mode: 'sheet',
    })
  })

  it('uses finished card, poster, and paired table-tent pages', () => {
    expect(pdfPageLayout('business-card')).toMatchObject({
      widthMm: 85.6,
      heightMm: 54,
      mode: 'single',
    })
    expect(pdfPageLayout('a4-poster')).toMatchObject({
      widthMm: 210,
      heightMm: 297,
      mode: 'single',
    })
    expect(pdfPageLayout('table-tent')).toMatchObject({
      widthMm: 297,
      heightMm: 210,
      mode: 'paired',
    })
  })
})
