export type FillMode = 'solid' | 'linear' | 'radial'
export type ModuleShape = 'square' | 'rounded' | 'dot' | 'diamond' | 'leaf' | 'star' | 'heart'
export type EyeFrameShape = 'square' | 'rounded' | 'circle' | 'leaf' | 'heart'
export type EyePupilShape = 'square' | 'rounded' | 'circle' | 'diamond' | 'heart'
export type LogoShape = 'square' | 'rounded' | 'circle'
export type LogoFit = 'contain' | 'cover'
export type BackgroundMode = 'color' | 'transparent' | 'image'
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'
export type PdfPrintPreset = 'sheet' | 'business-card' | 'a4-poster' | 'table-tent'

export const PRINT_PRESET_DEFAULT_SIZES: Record<PdfPrintPreset, number> = {
  sheet: 40,
  'business-card': 32,
  'a4-poster': 140,
  'table-tent': 70,
}

export const PRINT_PRESET_MAX_SIZES: Record<PdfPrintPreset, number> = {
  sheet: 120,
  'business-card': 36,
  'a4-poster': 160,
  'table-tent': 100,
}

/** CTA frame height as a fraction of the QR's physical/pixel side length. */
export const FRAME_HEIGHT_RATIO = 0.22

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
  /** Preserve the full logo or center-crop it to fill the logo box. */
  logoFit: LogoFit
  logoShape: LogoShape
  /** Draw a plate behind the logo so it stays scannable. */
  logoPlate: boolean
  /** Optional short call-to-action printed below the QR code. */
  frameText: string
  frameTextColor: string
  frameBgColor: string
  /** Physical PDF layout; `sheet` retains the original tiled A4 export. */
  printPreset: PdfPrintPreset
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
  logoFit: 'contain',
  logoShape: 'rounded',
  logoPlate: true,
  frameText: '',
  frameTextColor: '#ffffff',
  frameBgColor: '#4c4fe0',
  printPreset: 'sheet',
  printSizeMm: 40,
  printMarginMm: 8,
})

const FILL_MODES = ['solid', 'linear', 'radial'] as const
const MODULE_SHAPES = ['square', 'rounded', 'dot', 'diamond', 'leaf', 'star', 'heart'] as const
const EYE_FRAME_SHAPES = ['square', 'rounded', 'circle', 'leaf', 'heart'] as const
const EYE_PUPIL_SHAPES = ['square', 'rounded', 'circle', 'diamond', 'heart'] as const
const LOGO_SHAPES = ['square', 'rounded', 'circle'] as const
const LOGO_FITS = ['contain', 'cover'] as const
const BACKGROUND_MODES = ['color', 'transparent', 'image'] as const
const ERROR_CORRECTION_LEVELS = ['L', 'M', 'Q', 'H'] as const
const PRINT_PRESETS = ['sheet', 'business-card', 'a4-poster', 'table-tent'] as const
const MAX_IMAGE_DATA_URL_LENGTH = 8 * 1024 * 1024

function isOneOf<const T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === 'string' && values.some((candidate) => candidate === value)
}

function boundedNumber(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
    ? value
    : fallback
}

function color(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
    ? value
    : fallback
}

/**
 * Keep image references local and bounded. User uploads are read as data URLs;
 * remote URLs and other schemes are never valid QR design assets.
 */
export function sanitizeImageDataUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > MAX_IMAGE_DATA_URL_LENGTH) return null
  return /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp|svg\+xml);base64,[a-z0-9+/]*={0,2}$/i.test(
    value,
  )
    ? value
    : null
}

/**
 * Merge a (possibly partial or untrusted) option bag over the defaults.
 * Unknown keys, invalid enum values, out-of-range numbers, and unsafe image
 * references are dropped in favour of the defaults.
 */
export function sanitizeOptions(raw: unknown): QrOptions {
  const defaults = defaultOptions()
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return defaults
  const source = raw as Record<string, unknown>
  const printPreset = isOneOf(source['printPreset'], PRINT_PRESETS)
    ? source['printPreset']
    : defaults.printPreset
  return {
    size: boundedNumber(source['size'], 128, 512, defaults.size),
    margin: boundedNumber(source['margin'], 0, 6, defaults.margin),
    errorCorrectionLevel: isOneOf(source['errorCorrectionLevel'], ERROR_CORRECTION_LEVELS)
      ? source['errorCorrectionLevel']
      : defaults.errorCorrectionLevel,
    fillMode: isOneOf(source['fillMode'], FILL_MODES) ? source['fillMode'] : defaults.fillMode,
    fgColor: color(source['fgColor'], defaults.fgColor),
    gradColor: color(source['gradColor'], defaults.gradColor),
    gradientAngle: boundedNumber(source['gradientAngle'], 0, 360, defaults.gradientAngle),
    bgMode: isOneOf(source['bgMode'], BACKGROUND_MODES) ? source['bgMode'] : defaults.bgMode,
    bgColor: color(source['bgColor'], defaults.bgColor),
    bgImage: source['bgImage'] === null ? null : sanitizeImageDataUrl(source['bgImage']),
    moduleShape: isOneOf(source['moduleShape'], MODULE_SHAPES)
      ? source['moduleShape']
      : defaults.moduleShape,
    eyeFrameShape: isOneOf(source['eyeFrameShape'], EYE_FRAME_SHAPES)
      ? source['eyeFrameShape']
      : defaults.eyeFrameShape,
    eyePupilShape: isOneOf(source['eyePupilShape'], EYE_PUPIL_SHAPES)
      ? source['eyePupilShape']
      : defaults.eyePupilShape,
    logo: source['logo'] === null ? null : sanitizeImageDataUrl(source['logo']),
    logoSize: boundedNumber(source['logoSize'], 0.1, 0.4, defaults.logoSize),
    logoFit: isOneOf(source['logoFit'], LOGO_FITS) ? source['logoFit'] : defaults.logoFit,
    logoShape: isOneOf(source['logoShape'], LOGO_SHAPES) ? source['logoShape'] : defaults.logoShape,
    logoPlate:
      typeof source['logoPlate'] === 'boolean' ? source['logoPlate'] : defaults.logoPlate,
    frameText: typeof source['frameText'] === 'string' ? source['frameText'].slice(0, 80) : '',
    frameTextColor: color(source['frameTextColor'], defaults.frameTextColor),
    frameBgColor: color(source['frameBgColor'], defaults.frameBgColor),
    printPreset,
    printSizeMm: boundedNumber(
      source['printSizeMm'],
      20,
      PRINT_PRESET_MAX_SIZES[printPreset],
      PRINT_PRESET_DEFAULT_SIZES[printPreset],
    ),
    printMarginMm: boundedNumber(source['printMarginMm'], 2, 20, defaults.printMarginMm),
  }
}

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
