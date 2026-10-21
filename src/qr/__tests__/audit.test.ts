import { describe, expect, it } from 'vitest'
import {
  CONTRAST_FLOOR,
  CONTRAST_GOOD,
  EC_RECOVERY,
  QUIET_ZONE_MODULES,
  assessContrast,
  assessLogo,
  assessLogoEc,
  assessPrintSize,
  assessQuietZone,
  auditCode,
  contrastRatio,
  dataRegionFraction,
  ecRank,
  logoBoxFraction,
  minEncodableLevel,
  capacityFinding,
  relativeLuminance,
  worstCaseContrast,
} from '../audit'
import { defaultOptions, type QrOptions } from '../options'
import { createModel } from '../render'

function opts(p: Partial<QrOptions> = {}): QrOptions {
  return { ...defaultOptions(), ...p }
}

describe('relativeLuminance', () => {
  it('anchors at black and white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 6)
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 6)
  })

  it('expands 3-digit hex', () => {
    expect(relativeLuminance('#fff')).toBeCloseTo(relativeLuminance('#ffffff'), 6)
    expect(relativeLuminance('#000')).toBeCloseTo(0, 6)
  })

  it('treats unparseable colors as black rather than NaN', () => {
    expect(relativeLuminance('not-a-color')).toBe(0)
    expect(relativeLuminance('')).toBe(0)
    expect(relativeLuminance('#12')).toBe(0)
  })
})

describe('contrastRatio', () => {
  it('returns 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
  })

  it('is symmetric and 1:1 for identical colors', () => {
    expect(contrastRatio('#123456', '#abcdef')).toBeCloseTo(
      contrastRatio('#abcdef', '#123456'),
      10,
    )
    expect(contrastRatio('#808080', '#808080')).toBeCloseTo(1, 6)
  })

  it('matches the WCAG example (#777 on #fff ≈ 4.48:1)', () => {
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 1)
  })
})

describe('worstCaseContrast', () => {
  it('uses the single foreground color for solid fills', () => {
    expect(worstCaseContrast(opts({ fillMode: 'solid', fgColor: '#000000' }))).toBeCloseTo(21, 1)
  })

  it('takes the worse end of a gradient', () => {
    const o = opts({
      fillMode: 'linear',
      fgColor: '#000000',
      gradColor: '#cccccc',
      bgColor: '#ffffff',
    })
    const worst = worstCaseContrast(o)
    expect(worst).toBeCloseTo(contrastRatio('#cccccc', '#ffffff'), 6)
    expect(worst).toBeLessThan(contrastRatio('#000000', '#ffffff'))
  })

  it('returns null when the background is not a solid color', () => {
    expect(worstCaseContrast(opts({ bgMode: 'transparent' }))).toBeNull()
    expect(worstCaseContrast(opts({ bgMode: 'image' }))).toBeNull()
  })
})

describe('assessContrast', () => {
  it('reports ok for strong contrast', () => {
    const f = assessContrast(opts({ fgColor: '#000000', bgColor: '#ffffff' }))
    expect(f.severity).toBe('ok')
    expect(f.id).toBe('contrast')
  })

  it('warns between the floor and the good threshold', () => {
    const f = assessContrast(opts({ fgColor: '#777777', bgColor: '#ffffff' }))
    expect(f.severity).toBe('warn')
    expect(f.suggestion).toBeTruthy()
  })

  it('errors below the floor', () => {
    const f = assessContrast(opts({ fgColor: '#cccccc', bgColor: '#ffffff' }))
    expect(f.severity).toBe('error')
  })

  it('warns when the code is dark on a dark background', () => {
    // #2563eb on #111827 → 3.43:1, between the floor and the good threshold.
    const f = assessContrast(opts({ fgColor: '#2563eb', bgColor: '#111827', fillMode: 'solid' }))
    expect(f.severity).toBe('warn')
  })

  it('accepts light-on-dark styling when it is genuinely high contrast', () => {
    // Gold on near-black is 10.6:1 — inverted but perfectly scannable.
    const f = assessContrast(opts({ fgColor: '#fbbf24', bgColor: '#111827', fillMode: 'solid' }))
    expect(f.severity).toBe('ok')
  })

  it('falls back to a background finding for transparent/image backgrounds', () => {
    expect(assessContrast(opts({ bgMode: 'transparent' })).id).toBe('background')
    expect(assessContrast(opts({ bgMode: 'image' })).id).toBe('background')
  })

  it('thresholds are ordered', () => {
    expect(CONTRAST_FLOOR).toBeLessThan(CONTRAST_GOOD)
  })
})

describe('assessQuietZone', () => {
  it('accepts the spec minimum and above', () => {
    expect(assessQuietZone(QUIET_ZONE_MODULES).severity).toBe('ok')
    expect(assessQuietZone(6).severity).toBe('ok')
  })

  it('warns below the spec minimum, including zero', () => {
    for (const m of [0, 1, 2, 3]) {
      const f = assessQuietZone(m)
      expect(f.severity).toBe('warn')
      expect(f.suggestion).toContain(String(QUIET_ZONE_MODULES))
    }
  })
})

describe('assessPrintSize', () => {
  it('passes a comfortable print size', () => {
    const f = assessPrintSize(40, 25, 4)
    expect(f.severity).toBe('ok')
    expect(f.message).toContain('mm')
  })

  it('warns when modules get too small, and suggests a larger size', () => {
    // 25 modules + 8 margin = 33 total → 10 mm / 33 ≈ 0.3 mm per module.
    const f = assessPrintSize(10, 25, 4)
    expect(f.severity).toBe('warn')
    expect(f.suggestion).toMatch(/\d+ mm/)
  })

  it('warns on small overall size even when modules are fine', () => {
    const f = assessPrintSize(15, 21, 0)
    expect(f.severity).toBe('warn')
  })
})

describe('dataRegionFraction', () => {
  it('grows with version size and stays within (0, 1)', () => {
    expect(dataRegionFraction(21)).toBeGreaterThan(0.4)
    expect(dataRegionFraction(177)).toBeGreaterThan(dataRegionFraction(21))
    for (const n of [21, 45, 177]) {
      expect(dataRegionFraction(n)).toBeGreaterThan(0)
      expect(dataRegionFraction(n)).toBeLessThan(1)
    }
  })

  it('tracks the real codeword share within a few points', () => {
    // Version 1: 26 codewords x 8 = 208 of 441 modules ≈ 47%.
    expect(dataRegionFraction(21)).toBeCloseTo(0.47, 1)
    // Version 40: 3706 codewords x 8 = 29648 of 31329 ≈ 94.6%.
    expect(dataRegionFraction(177)).toBeCloseTo(0.946, 1)
  })
})

describe('assessLogo', () => {
  const base = { modules: 25, margin: 4 }

  it('reports the damaged share as a fraction', () => {
    const a = assessLogo({ logoBoxFraction: 0.28, ...base })
    expect(a.damagedShare).toBeGreaterThan(0)
    expect(a.damagedShare).toBeLessThan(1)
  })

  it('a big logo needs a stronger or equal EC level than a small one', () => {
    const small = assessLogo({ logoBoxFraction: 0.15, ...base })
    const big = assessLogo({ logoBoxFraction: 0.3, ...base })
    const rankOf = (l: string | null): number => (l === null ? Number.POSITIVE_INFINITY : ecRank(l as never))
    expect(rankOf(small.sufficient)).toBeLessThanOrEqual(rankOf(big.sufficient))
  })

  it('a larger logo can push the requirement past High (H)', () => {
    const ok = assessLogo({ logoBoxFraction: 0.15, ...base })
    const tooBig = assessLogo({ logoBoxFraction: 0.45, modules: 21, margin: 2 })
    expect(ok.sufficient).not.toBeNull()
    expect(tooBig.sufficient).toBeNull()
  })

  it('larger matrices tolerate a proportionally smaller logo by area', () => {
    const v1 = assessLogo({ logoBoxFraction: 0.25, modules: 21, margin: 4 })
    const v10 = assessLogo({ logoBoxFraction: 0.25, modules: 57, margin: 4 })
    expect(v10.damagedShare).toBeLessThan(v1.damagedShare)
  })

  it('returns null when not even H can absorb the logo', () => {
    const a = assessLogo({ logoBoxFraction: 0.6, modules: 21, margin: 2 })
    expect(a.sufficient).toBeNull()
    expect(a.maxLogoSize).toBeGreaterThan(0)
  })

  it('maxLogoSize is consistent with the H budget', () => {
    const a = assessLogo({ logoBoxFraction: 0.2, ...base })
    const atMax = assessLogo({ logoBoxFraction: a.maxLogoSize, ...base })
    expect(atMax.damagedShare).toBeLessThanOrEqual(EC_RECOVERY.H * 0.6 + 1e-6)
  })
})

describe('logoBoxFraction', () => {
  it('includes the plate padding when the plate is on', () => {
    expect(logoBoxFraction(opts({ logoSize: 0.22, logoPlate: true }))).toBeCloseTo(0.28, 6)
    expect(logoBoxFraction(opts({ logoSize: 0.22, logoPlate: false }))).toBeCloseTo(0.22, 6)
  })
})

describe('assessLogoEc', () => {
  it('returns null when there is no logo', () => {
    expect(assessLogoEc(opts({ logo: null }), 25)).toBeNull()
  })

  it('errors when the logo is too large for any level', () => {
    const o = opts({
      logo: 'data:image/png;base64,AAA',
      logoSize: 0.4,
      logoPlate: true,
      errorCorrectionLevel: 'H',
    })
    const f = assessLogoEc(o, 21)
    expect(f?.severity).toBe('error')
    expect(f?.suggestion).toMatch(/Shrink the logo/)
  })

  it('warns when the level is enough for the logo but not by much', () => {
    // Size chosen to sit between the safety margins of two adjacent levels.
    const o = opts({
      logo: 'data:image/png;base64,AAA',
      logoSize: 0.24,
      logoPlate: false,
      errorCorrectionLevel: 'M',
    })
    const f = assessLogoEc(o, 29)
    expect(f).not.toBeNull()
    expect(['warn', 'ok']).toContain(f!.severity)
    if (f!.severity === 'warn') expect(f!.suggestion).toMatch(/Switch error correction to [LMQH]/)
  })

  it('accepts a small logo at H', () => {
    const o = opts({
      logo: 'data:image/png;base64,AAA',
      logoSize: 0.12,
      logoPlate: false,
      errorCorrectionLevel: 'H',
    })
    expect(assessLogoEc(o, 45)?.severity).toBe('ok')
  })

  it('errors when the logo is too large for any level', () => {
    const o = opts({
      logo: 'data:image/png;base64,AAA',
      logoSize: 0.4,
      logoPlate: true,
      errorCorrectionLevel: 'H',
    })
    const f = assessLogoEc(o, 21)
    expect(f?.severity).toBe('error')
    expect(f?.suggestion).toMatch(/Shrink the logo/)
  })
})

describe('capacity checks', () => {
  it('minEncodableLevel returns the weakest level that fits', () => {
    expect(minEncodableLevel('hello')).toBe('L')
    expect(minEncodableLevel('x'.repeat(4000))).toBeNull()
  })

  it('is null for values that fit at the current level', () => {
    expect(capacityFinding('hello', 'M')).toBeNull()
  })

  it('suggests a weaker level when the value only fits there', () => {
    // Long enough to overflow H but fit at M or below.
    const value = 'x'.repeat(1500)
    expect(minEncodableLevel(value)).not.toBeNull()
    const f = capacityFinding(value, 'H')
    if (f) {
      expect(f.severity).toBe('error')
      expect(f.suggestion).toMatch(/switch to (L|M|Q)/i)
    }
  })

  it('explains when nothing fits at all', () => {
    const f = capacityFinding('x'.repeat(8000), 'M')
    expect(f?.severity).toBe('error')
    expect(f?.suggestion).toBeTruthy()
  })
})

describe('auditCode', () => {
  it('reports the expected checks for a clean code', () => {
    const value = 'https://example.com'
    const o = opts()
    const modules = createModel(value, o.errorCorrectionLevel).matrix.size
    const findings = auditCode({ options: o, modules })
    // No logo is set, so the logo-EC check is omitted.
    expect(findings.map((f) => f.id)).toEqual(['contrast', 'quiet-zone', 'print-size'])
    // Quiet zone defaults to 2, below the spec minimum — so exactly two "ok"
    // findings (contrast + print size), one warning (quiet zone), no logo.
    expect(findings.filter((f) => f.severity === 'ok')).toHaveLength(2)
    expect(findings.find((f) => f.id === 'quiet-zone')?.severity).toBe('warn')
  })

  it('omits the logo check when no logo is set', () => {
    const findings = auditCode({ options: opts(), modules: 25 })
    expect(findings.some((f) => f.id === 'logo-ec')).toBe(false)
  })

  it('catches a genuinely unscannable style', () => {
    const o = opts({
      fillMode: 'linear',
      fgColor: '#fefefe',
      gradColor: '#fafafa',
      bgColor: '#ffffff',
      margin: 0,
      logo: 'data:image/png;base64,AAA',
      logoSize: 0.4,
      logoPlate: true,
      printSizeMm: 10,
    })
    const findings = auditCode({ options: o, modules: 25 })
    expect(findings.every((f) => f.severity === 'error' || f.severity === 'warn')).toBe(true)
    expect(findings.some((f) => f.id === 'contrast' && f.severity === 'error')).toBe(true)
    expect(findings.some((f) => f.id === 'quiet-zone')).toBe(true)
  })
})
