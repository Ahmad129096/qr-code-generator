import type { PdfPrintPreset } from './options'

export interface PdfPageLayout {
  widthMm: number
  heightMm: number
  orientation: 'portrait' | 'landscape'
  mode: 'sheet' | 'single' | 'paired'
}

const PDF_PAGE_LAYOUTS: Record<PdfPrintPreset, PdfPageLayout> = {
  sheet: { widthMm: 210, heightMm: 297, orientation: 'portrait', mode: 'sheet' },
  'business-card': { widthMm: 85.6, heightMm: 54, orientation: 'landscape', mode: 'single' },
  'a4-poster': { widthMm: 210, heightMm: 297, orientation: 'portrait', mode: 'single' },
  'table-tent': { widthMm: 297, heightMm: 210, orientation: 'landscape', mode: 'paired' },
}

/** Physical PDF page dimensions and placement mode for a selected preset. */
export function pdfPageLayout(preset: PdfPrintPreset): PdfPageLayout {
  return PDF_PAGE_LAYOUTS[preset]
}
