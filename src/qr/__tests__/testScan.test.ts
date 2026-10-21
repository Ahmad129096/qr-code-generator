import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  loadAssets: vi.fn(),
  renderToCanvas: vi.fn(),
  decodeImageData: vi.fn(),
}))

vi.mock('../images', () => ({ loadAssets: mocks.loadAssets }))
vi.mock('../decode', () => ({ decodeImageData: mocks.decodeImageData }))
vi.mock('../render', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../render')>()
  return { ...actual, renderToCanvas: mocks.renderToCanvas }
})

import { defaultOptions } from '../options'
import { createModel } from '../render'
import { testScan } from '../testScan'

describe('testScan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads and renders the selected logo/background before decoding', async () => {
    const assets = { logo: {} as HTMLImageElement, bg: {} as HTMLImageElement }
    const context = {
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    }
    const rendered = {} as HTMLCanvasElement
    const composite = {
      getContext: vi.fn(() => context),
    } as unknown as HTMLCanvasElement
    const canvases = [rendered, composite]
    vi.stubGlobal('document', {
      createElement: vi.fn(() => canvases.shift()),
    })

    mocks.loadAssets.mockResolvedValue(assets)
    mocks.decodeImageData.mockReturnValue({ data: 'expected payload' })
    const options = {
      ...defaultOptions(),
      logo: 'data:image/png;base64,AA==',
      bgImage: 'data:image/png;base64,BB==',
    }
    const model = createModel('expected payload', options.errorCorrectionLevel)

    const result = await testScan(model, options)

    expect(mocks.loadAssets).toHaveBeenCalledWith({
      logo: options.logo,
      bgImage: options.bgImage,
    })
    expect(mocks.renderToCanvas).toHaveBeenCalledWith(rendered, model, options, 480, assets)
    expect(context.drawImage).toHaveBeenCalledWith(rendered, 0, 0)
    expect(result.pass).toBe(true)
  })
})
