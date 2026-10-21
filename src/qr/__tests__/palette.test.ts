import { describe, expect, it } from 'vitest'
import { extractColorsFromPixels } from '../palette'

function pixels(...colors: [number, number, number, number][]): Uint8ClampedArray {
  return new Uint8ClampedArray(colors.flat())
}

describe('extractColorsFromPixels', () => {
  it('returns frequent opaque brand colors and ignores a white background', () => {
    const data = pixels(
      [245, 30, 40, 255],
      [245, 30, 40, 255],
      [25, 90, 210, 255],
      [255, 255, 255, 255],
      [0, 0, 0, 0],
    )
    expect(extractColorsFromPixels(data)).toEqual(['#f51e28', '#195ad2'])
  })

  it('uses neutral colors when there are no colorful opaque pixels', () => {
    expect(extractColorsFromPixels(pixels([235, 235, 235, 255], [30, 30, 30, 255]))).toEqual([
      '#ebebeb',
      '#1e1e1e',
    ])
  })

  it('respects the requested result limit', () => {
    const data = pixels(
      [240, 20, 30, 255],
      [20, 200, 50, 255],
      [30, 60, 230, 255],
    )
    expect(extractColorsFromPixels(data, 2)).toHaveLength(2)
  })
})
