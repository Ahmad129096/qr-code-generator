import { loadImage } from './images'
import { defaultOptions, sanitizeOptions, type QrOptions } from './options'
import { buildSvg, createModel, renderToCanvas } from './render'

export type { QrOptions, ErrorCorrectionLevel } from './options'

function prepare(value: string, options?: Partial<QrOptions>): {
  value: string
  options: QrOptions
  model: ReturnType<typeof createModel>
} {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError('QR content must be a non-empty string')
  }
  const safeOptions = sanitizeOptions({ ...defaultOptions(), ...options })
  return {
    value,
    options: safeOptions,
    model: createModel(value, safeOptions.errorCorrectionLevel),
  }
}

/** Generate a self-contained SVG string without sending content over the network. */
export function createQrSvg(value: string, options?: Partial<QrOptions>): string {
  const prepared = prepare(value, options)
  return buildSvg(prepared.model, prepared.options, prepared.options.size)
}

/** Generate a PNG Blob using the browser canvas APIs. */
export async function createQrPng(
  value: string,
  options?: Partial<QrOptions>,
  scale = 1,
): Promise<Blob> {
  if (!Number.isInteger(scale) || scale < 1 || scale > 8) {
    throw new RangeError('PNG scale must be an integer from 1 to 8')
  }
  if (typeof document === 'undefined') {
    throw new Error('PNG generation requires a browser canvas')
  }
  const prepared = prepare(value, options)
  const canvas = document.createElement('canvas')
  const imageSources = [prepared.options.logo, prepared.options.bgImage].filter(
    (source): source is string => source !== null,
  )
  const images = await Promise.all(imageSources.map((source) => loadImage(source)))
  const assets = {
    logo: prepared.options.logo ? images[imageSources.indexOf(prepared.options.logo)] : null,
    bg: prepared.options.bgImage ? images[imageSources.indexOf(prepared.options.bgImage)] : null,
  }
  const pixelSize = Math.min(8192, prepared.options.size * scale)
  if (!canvas.getContext('2d')) throw new Error('A 2D canvas context is not available')
  renderToCanvas(canvas, prepared.model, prepared.options, pixelSize, assets)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('The browser could not encode the QR code as PNG')
  return blob
}

export interface MountedQrWidget {
  destroy(): void
}

/** Append a small accessible QR generator to a selector or an existing element. */
export function mountQrWidget(
  target: string | HTMLElement,
  options?: Partial<QrOptions>,
): MountedQrWidget {
  if (typeof document === 'undefined') {
    throw new Error('The QR widget can only be mounted in a browser')
  }
  const host = typeof target === 'string' ? document.querySelector(target) : target
  if (!(host instanceof HTMLElement)) {
    throw new Error(`QR widget target was not found: ${String(target)}`)
  }

  const root = document.createElement('section')
  root.className = 'qr-code-generator-widget'

  const label = document.createElement('label')
  label.textContent = 'Content for your QR code'
  const input = document.createElement('textarea')
  input.required = true
  input.rows = 3
  input.setAttribute('aria-label', 'Content for your QR code')
  label.append(input)

  const generate = document.createElement('button')
  generate.type = 'button'
  generate.textContent = 'Generate QR code'
  const status = document.createElement('p')
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  const output = document.createElement('div')
  const image = document.createElement('img')
  image.alt = 'Generated QR code'
  image.hidden = true
  const download = document.createElement('a')
  download.textContent = 'Download SVG'
  download.download = 'qr-code.svg'
  download.hidden = true
  output.append(image, download)
  root.append(label, generate, status, output)
  host.append(root)

  let objectUrl: string | null = null
  const onGenerate = (): void => {
    try {
      const svg = createQrSvg(input.value, options)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      objectUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
      image.src = objectUrl
      image.hidden = false
      download.href = objectUrl
      download.hidden = false
      status.textContent = 'QR code generated in your browser. Nothing was uploaded.'
    } catch (error) {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      objectUrl = null
      image.hidden = true
      download.hidden = true
      status.textContent = error instanceof Error ? error.message : 'Could not generate QR code'
    }
  }
  generate.addEventListener('click', onGenerate)

  return {
    destroy(): void {
      generate.removeEventListener('click', onGenerate)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      root.remove()
    },
  }
}
