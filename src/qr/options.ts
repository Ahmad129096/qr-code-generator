export type FillMode = 'solid' | 'linear' | 'radial'
export type ModuleShape = 'square' | 'rounded' | 'dot' | 'diamond' | 'leaf' | 'star' | 'heart'
export type EyeFrameShape = 'square' | 'rounded' | 'circle' | 'leaf' | 'heart'
export type EyePupilShape = 'square' | 'rounded' | 'circle' | 'diamond' | 'heart'
export type LogoShape = 'square' | 'rounded' | 'circle'
export type BackgroundMode = 'color' | 'transparent' | 'image'
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'

export interface QrOptions {
  size: number
  margin: number
  errorCorrectionLevel: ErrorCorrectionLevel
  fillMode: FillMode
  /** Primary color — solid fill, or start of a gradient. */
  fgColor: string
  /** End color for gradients. */
  gradColor: string
  /** Degrees, 0 = left to right, 90 = top to bottom. */
  gradientAngle: number
  bgMode: BackgroundMode
  bgColor: string
  /** dataURL for a custom background image. */
  bgImage: string | null
  moduleShape: ModuleShape
  eyeFrameShape: EyeFrameShape
  eyePupilShape: EyePupilShape
  /** dataURL for a logo rendered in the center. */
  logo: string | null
  /** Logo box as a fraction of the full code size (0.1 – 0.4). */
  logoSize: number
  logoShape: LogoShape
  /** Draw a plate behind the logo so it stays scannable. */
  logoPlate: boolean
  /** Physical size of the whole code (incl. quiet zone) in mm for PDF/EPS. */
  printSizeMm: number
  /** Gap between repeated codes on a printed sheet, in mm. */
  printMarginMm: number
}

export const defaultOptions = (): QrOptions => ({
  size: 256,
  margin: 2,
  errorCorrectionLevel: 'M',
  fillMode: 'solid',
  fgColor: '#000000',
  gradColor: '#4c4fe0',
  gradientAngle: 45,
  bgMode: 'color',
  bgColor: '#ffffff',
  bgImage: null,
  moduleShape: 'square',
  eyeFrameShape: 'square',
  eyePupilShape: 'square',
  logo: null,
  logoSize: 0.22,
  logoShape: 'rounded',
  logoPlate: true,
  printSizeMm: 40,
  printMarginMm: 8,
})

export interface StylePreset {
  id: string
  name: string
  /** CSS background used by the preset chip swatch. */
  swatch: string
  options: Partial<QrOptions>
}

export const PRESETS: StylePreset[] = [
  {
    id: 'classic',
    name: 'Classic Black',
    swatch: '#111111',
    options: {
      fillMode: 'solid',
      fgColor: '#111111',
      bgMode: 'color',
      bgColor: '#ffffff',
      moduleShape: 'square',
      eyeFrameShape: 'square',
      eyePupilShape: 'square',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean Gradient',
    swatch: 'linear-gradient(135deg, #2563eb, #06b6d4)',
    options: {
      fillMode: 'linear',
      fgColor: '#2563eb',
      gradColor: '#06b6d4',
      gradientAngle: 135,
      bgMode: 'color',
      bgColor: '#f0f9ff',
      moduleShape: 'rounded',
      eyeFrameShape: 'rounded',
      eyePupilShape: 'circle',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset Dot',
    swatch: 'linear-gradient(135deg, #f97316, #ec4899)',
    options: {
      fillMode: 'linear',
      fgColor: '#f97316',
      gradColor: '#ec4899',
      gradientAngle: 135,
      bgMode: 'color',
      bgColor: '#fff7ed',
      moduleShape: 'dot',
      eyeFrameShape: 'circle',
      eyePupilShape: 'circle',
    },
  },
  {
    id: 'neon',
    name: 'Neon Night',
    swatch: 'linear-gradient(135deg, #22d3ee, #a855f7)',
    options: {
      fillMode: 'linear',
      fgColor: '#22d3ee',
      gradColor: '#a855f7',
      gradientAngle: 45,
      bgMode: 'color',
      bgColor: '#0b1020',
      moduleShape: 'rounded',
      eyeFrameShape: 'rounded',
      eyePupilShape: 'circle',
    },
  },
  {
    id: 'mint',
    name: 'Mint Leaf',
    swatch: 'linear-gradient(135deg, #059669, #34d399)',
    options: {
      fillMode: 'linear',
      fgColor: '#059669',
      gradColor: '#34d399',
      gradientAngle: 90,
      bgMode: 'color',
      bgColor: '#f0fdf4',
      moduleShape: 'leaf',
      eyeFrameShape: 'leaf',
      eyePupilShape: 'circle',
    },
  },
  {
    id: 'gray',
    name: 'Minimal Gray',
    swatch: '#6b7280',
    options: {
      fillMode: 'solid',
      fgColor: '#6b7280',
      bgMode: 'color',
      bgColor: '#ffffff',
      moduleShape: 'rounded',
      eyeFrameShape: 'rounded',
      eyePupilShape: 'rounded',
    },
  },
  {
    id: 'heart',
    name: 'Berry Heart',
    swatch: 'linear-gradient(135deg, #e11d48, #f43f5e)',
    options: {
      fillMode: 'linear',
      fgColor: '#e11d48',
      gradColor: '#f43f5e',
      gradientAngle: 45,
      bgMode: 'color',
      bgColor: '#fff1f2',
      moduleShape: 'heart',
      eyeFrameShape: 'heart',
      eyePupilShape: 'heart',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight Gold',
    swatch: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
    options: {
      fillMode: 'linear',
      fgColor: '#fbbf24',
      gradColor: '#f59e0b',
      gradientAngle: 90,
      bgMode: 'color',
      bgColor: '#111827',
      moduleShape: 'square',
      eyeFrameShape: 'square',
      eyePupilShape: 'diamond',
    },
  },
]
