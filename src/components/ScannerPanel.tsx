import { useEffect, useRef, useState } from 'react'
import { decodeImage, startScanner, type DecodeResult, type ScannerHandle } from '../qr/decode'

export default function ScannerPanel() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const handleRef = useRef<ScannerHandle | null>(null)
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [result, setResult] = useState<DecodeResult | null>(null)
  const [imageError, setImageError] = useState('')
  const [imgDrag, setImgDrag] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    return () => handleRef.current?.stop()
  }, [])

  function drawOverlay(video: HTMLVideoElement, res: DecodeResult): void {
    const canvas = overlayRef.current
    if (!canvas || !res.location) return
    const { videoWidth: w, videoHeight: h } = video
    if (!w || !h) return
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { topLeftCorner, topRightCorner, bottomLeftCorner, bottomRightCorner } = res.location
    ctx.clearRect(0, 0, w, h)
    ctx.strokeStyle = '#22c55e'
    ctx.lineWidth = Math.max(3, Math.round(w / 160))
    ctx.beginPath()
    ctx.moveTo(topLeftCorner.x, topLeftCorner.y)
    ctx.lineTo(topRightCorner.x, topRightCorner.y)
    ctx.lineTo(bottomRightCorner.x, bottomRightCorner.y)
    ctx.lineTo(bottomLeftCorner.x, bottomLeftCorner.y)
    ctx.closePath()
    ctx.stroke()
  }

  function start(): void {
    const video = videoRef.current
    if (!video) return
    setCameraError('')
    setResult(null)
    const handle = startScanner(
      video,
      (res) => {
        setResult(res)
        drawOverlay(video, res)
      },
      (msg) => {
        setCameraError(msg)
        setScanning(false)
      },
    )
    handleRef.current = handle
    setScanning(true)
    void handle.ready.catch(() => undefined)
  }

  function stop(): void {
    handleRef.current?.stop()
    handleRef.current = null
    setScanning(false)
    const overlay = overlayRef.current
    overlay?.getContext('2d')?.clearRect(0, 0, overlay.width, overlay.height)
  }

  async function handleUpload(file: File | undefined): Promise<void> {
    if (!file) return
    setImageError('')
    setResult(null)
    try {
      const res = await decodeImage(file)
      if (res) setResult(res)
      else setImageError('No QR code found in that image.')
    } catch {
      setImageError('Could not read that image.')
    }
  }

  async function copyResult(): Promise<void> {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.data)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  const looksLikeUrl = /^https?:\/\//i.test(result?.data ?? '')

  return (
    <div className="scanner">
      <div className="scanner-grid">
        <div className="scanner-camera">
          <video ref={videoRef} playsInline muted />
          <canvas ref={overlayRef} className="scanner-overlay" />
          {!scanning && (
            <div className="scanner-idle">
              <svg width="46" height="46" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm10-2h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2z" />
              </svg>
              <p>Point your camera at a QR code.</p>
            </div>
          )}
          <div className="scanner-controls">
            {!scanning ? (
              <button type="button" onClick={start}>
                Start camera
              </button>
            ) : (
              <button type="button" className="secondary" onClick={stop}>
                Stop camera
              </button>
            )}
          </div>
          {cameraError && <p className="qr-error">{cameraError}</p>}
        </div>

        <div className="scanner-side">
          <h3>Result</h3>
          {result ? (
            <div className="scan-result">
              <p className="scan-data">{result.data}</p>
              <div className="scan-actions">
                {looksLikeUrl && (
                  <a
                    className="btn"
                    href={result.data}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Open link
                  </a>
                )}
                <button type="button" onClick={() => void copyResult()}>
                  {copied ? 'Copied!' : 'Copy text'}
                </button>
              </div>
            </div>
          ) : (
            <p className="history-empty">Nothing scanned yet.</p>
          )}

          <h3>Scan from an image</h3>
          <div
            className={`scanner-drop${imgDrag ? ' dragover' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setImgDrag(true)
            }}
            onDragLeave={() => setImgDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setImgDrag(false)
              void handleUpload(e.dataTransfer.files?.[0])
            }}
          >
            <p>Drop a screenshot or photo here</p>
            <label className="upload-btn">
              Choose image…
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  void handleUpload(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </label>
          </div>
          {imageError && <p className="qr-error">{imageError}</p>}
        </div>
      </div>
    </div>
  )
}
