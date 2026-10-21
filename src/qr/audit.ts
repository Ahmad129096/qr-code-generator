import { createModel } from './render'
import type { ErrorCorrectionLevel, QrOptions } from './options'

/**
 * Scan-reliability engine: pure checks that turn a code's options (and a few
 * facts about its matrix) into human-readable findings. No DOM required —
 * used by the UI panel and unit-tested directly.
 */

export type AuditSeverity = 'ok' | 'warn' | 'error'

export type FindingId =
  | 'contrast'
  | 'background'
  | 'quiet-zone'
  | 'print-size'
  | 'logo-ec'
  | 'capacity'

export interface AuditFinding {
  id: FindingId
  severity: AuditSeverity
  /** Short human-readable message. */
  message: string
  /** Actionable fix, when there is one. */
  suggestion?: string
}

/* ---- Tunable thresholds (documented so contributors can adjust) ---- */

/** ISO/IEC 18004 requires a quiet zone of at least 4 modules. */
export const QUIET_ZONE_MODULES = 4
/** Practical print guidance: module pitch and overall size in millimetres. */
export const MIN_MODULE_MM = 0.4
export const MIN_PRINT_MM = 20
/** WCAG contrast ratios: ≥3:1 is the practical floor for reliable scanning. */
export const CONTRAST_GOOD = 4.5
export const CONTRAST_FLOOR = 3
/** A logo may consume at most this share of each level's recovery budget. */
export const LOGO_SAFETY = 0.6

/** Data-recovery budget per error-correction level (fraction of the code). */
export const EC_RECOVERY: Record<ErrorCorrectionLevel, number> = {
  L: 0.07,
  M: 0.15,
  Q: 0.25,
  H: 0.3,
}

const EC_ORDER: readonly ErrorCorrectionLevel[] = ['L', 'M', 'Q', 'H']

export function ecRank(level: ErrorCorrectionLevel): number {
  return EC_ORDER.indexOf(level)
}

/* ---- Color helpers ---- */

function parseHex(hex: string): [number, number, number] | null {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) {
    const [r = '0', g = '0', b = '0'] = h.split('')
    h = r + r + g + g + b + b
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** WCAG relative luminance (0 = black, 1 = white). Unparseable colors read as black. */
export function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex)
  if (!rgb) return 0
  const channel = (v: number): number => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2])
}

/** WCAG contrast ratio between two colors (1–21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** Foreground colors actually painted (both endpoints of a gradient). */
function foregroundColors(o: QrOptions): string[] {
  return o.fillMode === 'solid' ? [o.fgColor] : [o.fgColor, o.gradColor]
}

/**
 * Pick the most readable of the candidate text colors for a background. Used
 * where text sits on a background the user chose (the QR background color).
 */
export function readableTextColor(
  background: string,
  candidates: string[] = ['#4a4e57', '#f2f3f5', '#111318'],
): string {
  let best = candidates[0] ?? '#4a4e57'
  let bestRatio = -1
  for (const candidate of candidates) {
    const ratio = contrastRatio(background, candidate)
    if (ratio > bestRatio) {
      bestRatio = ratio
      best = candidate
    }
  }
  return best
}

/**
 * Worst-case foreground/background contrast. Returns null when the effective
 * background is not a known solid color (transparent or image).
 */
export function worstCaseContrast(o: QrOptions): number | null {
  if (o.bgMode !== 'color') return null
  return Math.min(
    ...foregroundColors(o).map((fg) => contrastRatio(fg, o.bgColor)),
  )
}

/* ---- Individual checks ---- */

export function assessContrast(o: QrOptions): AuditFinding {
  const worst = worstCaseContrast(o)
  if (worst === null) return backgroundFinding(o)
  if (worst >= CONTRAST_GOOD) {
    return {
      id: 'contrast',
      severity: 'ok',
      message: `Contrast is good (${worst.toFixed(1)}:1).`,
    }
  }
  if (worst >= CONTRAST_FLOOR) {
    return {
      id: 'contrast',
      severity: 'warn',
      message: `Contrast is low (${worst.toFixed(1)}:1) — some cameras may struggle.`,
      suggestion: 'Darken the foreground or lighten the background (4.5:1+ is safest).',
    }
  }
  return {
    id: 'contrast',
    severity: 'error',
    message: `Contrast is too low (${worst.toFixed(1)}:1) — the code may not scan.`,
    suggestion: 'Pick colors further apart, e.g. dark modules on a light background.',
  }
}

function backgroundFinding(o: QrOptions): AuditFinding {
  if (o.bgMode === 'transparent') {
    return {
      id: 'background',
      severity: 'warn',
      message: 'Transparent background — contrast depends on the surface it is printed on.',
      suggestion: 'Print on a light surface, or use Test scan on a mockup before printing.',
    }
  }
  return {
    id: 'background',
    severity: 'warn',
    message: 'Image background — contrast varies across the code.',
    suggestion: 'Keep the image light and even behind the modules, and run Test scan.',
  }
}

export function assessQuietZone(margin: number): AuditFinding {
  if (margin >= QUIET_ZONE_MODULES) {
    return {
      id: 'quiet-zone',
      severity: 'ok',
      message: `Quiet zone is ${margin} modules (spec minimum is ${QUIET_ZONE_MODULES}).`,
    }
  }
  return {
    id: 'quiet-zone',
    severity: 'warn',
    message: `Quiet zone is ${margin} modules — the spec requires at least ${QUIET_ZONE_MODULES}.`,
    suggestion: `Raise the quiet zone to ${QUIET_ZONE_MODULES}+ modules for reliable scanning.`,
  }
}

/**
 * Print-size guidance: overall size and per-module pitch in millimetres,
 * for the PDF/EPS export path.
 */
export function assessPrintSize(
  printSizeMm: number,
  modules: number,
  margin: number,
): AuditFinding {
  const totalModules = modules + margin * 2
  const moduleMm = printSizeMm / totalModules
  if (moduleMm < MIN_MODULE_MM) {
    const needed = Math.ceil(MIN_MODULE_MM * totalModules)
    return {
      id: 'print-size',
      severity: 'warn',
      message: `At ${printSizeMm} mm each module is only ${moduleMm.toFixed(2)} mm — hard to scan in print.`,
      suggestion: `Print at ${needed} mm or larger (or encode less data).`,
    }
  }
  if (printSizeMm < MIN_PRINT_MM) {
    return {
      id: 'print-size',
      severity: 'warn',
      message: `${printSizeMm} mm is small for print; modules are ${moduleMm.toFixed(2)} mm.`,
      suggestion: `Aim for ${MIN_PRINT_MM} mm or more when scanning from a distance.`,
    }
  }
  return {
    id: 'print-size',
    severity: 'ok',
    message: `Print size is fine — modules are ${moduleMm.toFixed(2)} mm at ${printSizeMm} mm.`,
  }
}

/**
 * Approximate the share of the matrix occupied by data/ECC codeword modules
 * (i.e. everything except fixed function patterns). Fitted from the spec:
 * ≈47% at version 1 (21 modules) rising to ≈94% at version 40 (177).
 */
export function dataRegionFraction(modules: number): number {
  return Math.min(0.97, Math.max(0.4, 1 - 11 / modules))
}

export interface LogoAssessment {
  /** Share of the codeword region the logo plate obscures (0–1). */
  damagedShare: number
  /** Lowest EC level that can absorb the logo, or null if none can. */
  sufficient: ErrorCorrectionLevel | null
  /** Largest logo side (fraction of the code) the current budget allows. */
  maxLogoSize: number
}

/**
 * How much of the code's error-correction budget a center logo consumes.
 * `logoBoxFraction` is the logo plate's side as a fraction of the full image
 * (include the plate/padding — that is the area no modules survive in).
 */
export function assessLogo(input: {
  logoBoxFraction: number
  modules: number
  margin: number
}): LogoAssessment {
  const { logoBoxFraction, modules, margin } = input
  const totalModules = modules + margin * 2
  // Share of the image covered by the logo box, relative to the codeword region.
  const matrixFrac = (modules / totalModules) ** 2
  const damagedShare =
    (logoBoxFraction * logoBoxFraction) / (dataRegionFraction(modules) * matrixFrac)

  let sufficient: ErrorCorrectionLevel | null = null
  for (const level of EC_ORDER) {
    if (damagedShare <= EC_RECOVERY[level] * LOGO_SAFETY) {
      sufficient = level
      break
    }
  }
  const maxArea = EC_RECOVERY.H * LOGO_SAFETY * dataRegionFraction(modules) * matrixFrac
  return {
    damagedShare,
    sufficient,
    maxLogoSize: Math.sqrt(maxArea),
  }
}

/** Size of the logo's plate in use (side as a fraction of the full code). */
export function logoBoxFraction(o: QrOptions): number {
  return o.logoPlate ? o.logoSize + 0.06 : o.logoSize
}

export function assessLogoEc(o: QrOptions, modules: number): AuditFinding | null {
  if (!o.logo) return null
  const { damagedShare, sufficient, maxLogoSize } = assessLogo({
    logoBoxFraction: logoBoxFraction(o),
    modules,
    margin: o.margin,
  })
  const pct = (damagedShare * 100).toFixed(1)
  if (sufficient === null) {
    return {
      id: 'logo-ec',
      severity: 'error',
      message: `Your logo covers ~${pct}% of the recoverable area — too much even for High (H) correction.`,
      suggestion: `Shrink the logo to about ${Math.round(maxLogoSize * 100)}% or less, or drop the plate.`,
    }
  }
  const current = o.errorCorrectionLevel
  if (ecRank(sufficient) > ecRank(current)) {
    return {
      id: 'logo-ec',
      severity: 'warn',
      message: `Your logo covers ~${pct}% of the recoverable area; ${current} (${EC_RECOVERY[current] * 100}%) is not enough.`,
      suggestion: `Switch error correction to ${sufficient} (${EC_RECOVERY[sufficient] * 100}%) — or shrink the logo.`,
    }
  }
  if (ecRank(sufficient) < ecRank(current)) {
    return {
      id: 'logo-ec',
      severity: 'ok',
      message: `Logo is safe; ${current} correction is more than you need (${sufficient} would do).`,
    }
  }
  return {
    id: 'logo-ec',
    severity: 'ok',
    message: `Logo is safe at ${current} correction (~${pct}% of the recoverable area).`,
  }
}

/* ---- Capacity ---- */

/** Lowest EC level that can encode this value, or null if nothing fits. */
export function minEncodableLevel(value: string): ErrorCorrectionLevel | null {
  for (const level of EC_ORDER) {
    if (canEncode(value, level)) return level
  }
  return null
}

function canEncode(value: string, level: ErrorCorrectionLevel): boolean {
  try {
    createModel(value, level)
    return true
  } catch {
    return false
  }
}

/** Finding for values that cannot be encoded at the current level. */
export function capacityFinding(value: string, current: ErrorCorrectionLevel): AuditFinding | null {
  if (canEncode(value, current)) return null
  const min = minEncodableLevel(value)
  if (min) {
    return {
      id: 'capacity',
      severity: 'error',
      message: `This content does not fit at ${current} (${EC_RECOVERY[current] * 100}%) correction.`,
      suggestion: `Shorten the content, or switch to ${min} (${EC_RECOVERY[min] * 100}%) correction.`,
    }
  }
  return {
    id: 'capacity',
    severity: 'error',
    message: 'This content is too long for a QR code, even at the lowest correction level.',
    suggestion: 'Use a shorter URL or less text.',
  }
}

/* ---- Top-level audit ---- */

export interface AuditInput {
  options: QrOptions
  /** Matrix size (modules per side) of the encoded code. */
  modules: number
}

/**
 * Run every check and return findings in display order. Severity `ok` entries
 * are included so the UI can show positive confirmation; filter on
 * `severity !== 'ok'` for a problems-only view.
 *
 * Capacity (does the value encode at all?) is checked separately via
 * {@link capacityFinding}, since auditCode assumes a successful encode.
 */
export function auditCode({ options, modules }: AuditInput): AuditFinding[] {
  return [
    assessContrast(options),
    assessQuietZone(options.margin),
    assessPrintSize(options.printSizeMm, modules, options.margin),
    assessLogoEc(options, modules),
  ].filter((f): f is AuditFinding => f !== null)
}
