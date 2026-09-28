# QR Code Generator

A client-side QR code generator built with React 19, TypeScript, and Vite. Create QR codes for
URLs, Wi-Fi, contacts, events, and more — then style, export, scan, and batch-generate them,
all in your browser (nothing is uploaded anywhere).

## Features

**Content types** — Text, URL, Wi-Fi, Email, SMS, Phone, WhatsApp, vCard contact, and Calendar event.

**Styling**

- 8 one-click theme presets (Classic Black, Ocean Gradient, Sunset Dot, Neon Night, Mint Leaf,
  Minimal Gray, Berry Heart, Midnight Gold), plus save/restore your own named styles.
- Solid, linear-gradient, or radial-gradient fills with an angle control.
- Module shapes: square, rounded, dot, diamond, leaf, star, heart.
- Independent finder-eye shapes (eye frame + pupil).
- Backgrounds: solid color, fully transparent, or a custom image.
- Center logo overlay with shape (square/rounded/circle), size, and optional white plate.
- Adjustable quiet zone and error-correction level.

**Export**

- PNG at 1×–8× scale (high-DPI), SVG vector, print-ready PDF (physical mm sizing, sheet tiling,
  margins, captions), and EPS vector (gradient sampled per module).
- Copy image straight to the clipboard.

**History & presets** — recent codes and saved styles persist in `localStorage` (browser-local only).

**Scan** — decode QR codes with your webcam or by uploading an image (uses `jsqr`).

**Batch** — paste rows or upload a CSV/JSON file and download a ZIP of PNG and/or SVG codes,
styled with your current settings (uses `jszip`).

## Getting started

```bash
npm install
npm run dev      # start dev server
npm run build    # type-check + production build
npm run lint     # oxlint
```

## Architecture notes

- `src/qr/` — framework-free core: `options.ts` (types + presets), `geometry.ts` (shared shape
  polygons/path data), `render.ts` (canvas + SVG rendering from the raw module matrix),
  `exporters.ts` (PNG/SVG/PDF/EPS/clipboard), `history.ts` (localStorage),
  `batch.ts` (CSV/JSON parsing + ZIP), `decode.ts` (image/webcam decoding), `images.ts`.
- The renderer uses `QRCode.create()` to obtain the raw module `BitMatrix`, so modules, eyes,
  gradients, and logos are drawn with shared geometry — the canvas preview and SVG/PDF/EPS
  exports always match.
- All processing happens locally; no network calls after the app loads.
