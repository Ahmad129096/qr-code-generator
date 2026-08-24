import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

export interface QrOptions {
  size: number
  fgColor: string
  bgColor: string
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H'
  margin: number
}

interface Props {
  value: string
  options: QrOptions
  emptyHint: string
}

export default function QrPreview({ value, options, emptyHint }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [svgMarkup, setSvgMarkup] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (!value) {
      setSvgMarkup('')
      setError('')
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
      }
      return
    }

    const qrOptions = {
      width: options.size,
      margin: options.margin,
      errorCorrectionLevel: options.errorCorrectionLevel,
      color: {
        dark: options.fgColor,
        light: options.bgColor,
      },
    }

    setError('')

    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, value, qrOptions).catch((err: Error) => {
        setError(err.message)
      })
    }

    QRCode.toString(value, { ...qrOptions, type: 'svg' })
      .then(setSvgMarkup)
      .catch((err: Error) => setError(err.message))
  }, [value, options])

  function downloadPng() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'qrcode.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  function downloadSvg() {
    if (!svgMarkup) return
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = 'qrcode.svg'
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="qr-preview">
      <div className="qr-canvas-wrap" style={{ background: options.bgColor }}>
        {value ? (
          <canvas ref={canvasRef} />
        ) : (
          <p className="qr-empty-hint">{emptyHint}</p>
        )}
      </div>
      {error && <p className="qr-error">{error}</p>}
      <div className="qr-actions">
        <button type="button" onClick={downloadPng} disabled={!value || !!error}>
          Download PNG
        </button>
        <button type="button" onClick={downloadSvg} disabled={!value || !!error}>
          Download SVG
        </button>
      </div>
    </div>
  )
}
