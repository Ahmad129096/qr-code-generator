import { inflateSync } from 'node:zlib'
import QRCode from 'qrcode'
import { describe, expect, it } from 'vitest'
import { buildIcon, buildOgImage, encodePng } from '../images.ts'

interface DecodedPng {
  width: number
  height: number
  pixels: Uint8Array
}

/** A minimal PNG reader for the files this module writes (8-bit RGBA, filter 0). */
function decodePng(buffer: Buffer): DecodedPng {
  expect(buffer.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  const width = buffer.readUInt32BE(16)
  const height = buffer.readUInt32BE(20)
  expect(buffer[24]).toBe(8) // bit depth
  expect(buffer[25]).toBe(6) // colour type: RGBA

  const idat: Buffer[] = []
  let offset = 8
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii')
    if (type === 'IDAT') idat.push(buffer.subarray(offset + 8, offset + 8 + length))
    offset += 12 + length
  }

  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * 4
  const pixels = new Uint8Array(stride * height)
  for (let y = 0; y < height; y++) {
    expect(raw[y * (stride + 1)]).toBe(0) // filter: none
    pixels.set(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), y * stride)
  }
  return { width, height, pixels }
}

function pixelAt(png: DecodedPng, x: number, y: number): [number, number, number, number] {
  const i = (y * png.width + x) * 4
  return [png.pixels[i]!, png.pixels[i + 1]!, png.pixels[i + 2]!, png.pixels[i + 3]!]
}

const CONTENT = 'https://qr.example.com/wifi-qr-code-generator'

describe('encodePng', () => {
  it('writes a valid PNG with the given size', () => {
    const png = decodePng(encodePng(2, 2, new Uint8Array(16).fill(120)))
    expect(png.width).toBe(2)
    expect(png.height).toBe(2)
  })
})

describe('buildIcon', () => {
  const qr = QRCode.create(CONTENT, { errorCorrectionLevel: 'M' })
  const modules = qr.modules.size
  const quiet = 2
  const boxSize = Math.floor((192 * 0.86) / (modules + quiet * 2))
  const origin = Math.floor((192 - (modules + quiet * 2) * boxSize) / 2)

  const png = decodePng(buildIcon(192, CONTENT))

  it('has the requested size', () => {
    expect(png.width).toBe(192)
    expect(png.height).toBe(192)
  })

  it('draws the QR modules at the right place', () => {
    // A dark module of the QR must be dark on the icon...
    expect(pixelAt(png, origin + quiet * boxSize + 2, origin + quiet * boxSize + 2)[0]).toBeLessThan(
      120,
    )
    // ...and the quiet zone around it must stay light.
    expect(pixelAt(png, origin + 1, origin + 1)[0]).toBeGreaterThan(200)
  })

  it('matches the module matrix of the QR code', () => {
    // Walk the finder pattern in the top-left corner: its third row is
    // 1,0,1,1,1,0,1 from the outside in.
    const pattern = [1, 0, 1, 1, 1, 0, 1]
    for (let i = 0; i < pattern.length; i++) {
      const x = origin + (quiet + i) * boxSize + Math.floor(boxSize / 2)
      const y = origin + (quiet + 3) * boxSize + Math.floor(boxSize / 2)
      const isDark = pixelAt(png, x, y)[0] < 128
      expect(isDark).toBe(pattern[i] === 1)
    }
  })
})

describe('buildOgImage', () => {
  it('is 1200x630 with an opaque background', () => {
    const png = decodePng(buildOgImage(CONTENT))
    expect(png.width).toBe(1200)
    expect(png.height).toBe(630)
    expect(pixelAt(png, 0, 0)[3]).toBe(255)
  })
})
