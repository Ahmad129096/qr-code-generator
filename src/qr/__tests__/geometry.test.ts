import { describe, expect, it } from 'vitest'
import {
  circlePoly,
  epsPath,
  pathD,
  polyBBoxCenter,
  roundedRectPoly,
  shapePoly,
} from '../geometry'

describe('pathD', () => {
  it('renders M/L/Z path data rounded to 2 decimals', () => {
    expect(pathD([0, 0, 10, 0, 10.333, 10])).toBe('M0 0L10 0L10.33 10Z')
  })

  it('returns empty data for degenerate polygons', () => {
    expect(pathD([])).toBe('')
    expect(pathD([1, 2])).toBe('')
  })

  it('ignores an odd trailing coordinate instead of emitting NaN', () => {
    expect(pathD([0, 0, 5, 5, 9])).toBe('M0 0L5 5Z')
  })
})

describe('shapePoly', () => {
  it('square fills the box exactly', () => {
    expect(shapePoly('square', 2, 3, 10, 8)).toEqual([2, 3, 12, 3, 12, 11, 2, 11])
  })

  it('dot/circle is centered and inscribed', () => {
    const pts = circlePoly(5, 5, 5, 8)
    expect(pts).toHaveLength(16)
    for (let i = 0; i + 1 < pts.length; i += 2) {
      const r = Math.hypot((pts[i] ?? 0) - 5, (pts[i + 1] ?? 0) - 5)
      expect(r).toBeCloseTo(5, 6)
    }
  })

  it('rounded corners stay within the box', () => {
    const pts = shapePoly('rounded', 0, 0, 10, 10)
    for (let i = 0; i < pts.length; i += 2) {
      expect(pts[i]).toBeGreaterThanOrEqual(0)
      expect(pts[i]).toBeLessThanOrEqual(10)
      expect(pts[i + 1]).toBeGreaterThanOrEqual(0)
      expect(pts[i + 1]).toBeLessThanOrEqual(10)
    }
  })

  it('every known shape produces finite coordinates', () => {
    const shapes = ['square', 'rounded', 'dot', 'diamond', 'leaf', 'star', 'heart'] as const
    for (const shape of shapes) {
      const pts = shapePoly(shape, 0, 0, 10, 10)
      expect(pts.length).toBeGreaterThanOrEqual(4)
      expect(pts.length % 2).toBe(0)
      for (const v of pts) expect(Number.isFinite(v)).toBe(true)
    }
  })

  it('renders a plain square', () => {
    expect(shapePoly('square', 0, 0, 4, 4)).toEqual([0, 0, 4, 0, 4, 4, 0, 4])
  })
})

describe('roundedRectPoly', () => {
  it('emits (seg+1) points per corner', () => {
    expect(roundedRectPoly(0, 0, 10, 10, [1, 1, 1, 1], 8)).toHaveLength(4 * 9 * 2)
  })

  it('clamps radii to half the smaller side', () => {
    const pts = roundedRectPoly(0, 0, 10, 2, [50, 50, 50, 50], 4)
    for (const v of pts) expect(Number.isFinite(v)).toBe(true)
  })
})

describe('polyBBoxCenter', () => {
  it('returns the bounding-box center', () => {
    expect(polyBBoxCenter([0, 0, 10, 0, 10, 6, 0, 6])).toEqual([5, 3])
  })
})

describe('epsPath', () => {
  it('emits mapped moveto/lineto/closepath lines', () => {
    const out = epsPath([0, 0, 10, 5], (x) => x * 2, (y) => 100 - y)
    expect(out.split('\n')).toEqual([
      '0.00 100.00 moveto',
      '20.00 95.00 lineto',
      'closepath',
    ])
  })

  it('returns empty for degenerate polygons', () => {
    expect(epsPath([1], (x) => x, (y) => y)).toBe('')
  })
})
