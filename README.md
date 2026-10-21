# QR Code Generator

A client-side QR code generator built with React 19, TypeScript, and Vite. Create QR codes for
URLs, Wi-Fi, contacts, events, and more — then style, export, scan, and batch-generate them,
all in your browser (nothing is uploaded anywhere).

## Features

**Content types** — Text, URL, Wi-Fi, Email, SMS, Phone, WhatsApp, vCard contact, Location
(`geo:`), App Store (iOS/Android auto-detect), Social profiles, and Calendar event.

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
Restoring a history entry brings back the content type, the field values, and the style.

**Share** — “Copy link” creates a URL that recreates the exact code (type, fields, and style) in
the URL fragment, so nothing is sent to a server. The link warns you when it carries a password.

**Scan** — decode QR codes with your webcam or by uploading an image (uses `jsqr`).

**Batch** — paste rows or upload a CSV/JSON file and download a ZIP of PNG and/or SVG codes,
styled with your current settings (uses `jszip`).

**Pages** — every content type has its own landing page and URL, for example
`/wifi-qr-code-generator`, `/vcard-qr-code-generator` or `/event-qr-code-generator`. The URLs
are real links, so they can be shared, bookmarked and indexed.

## Getting started

Requirements: **Node.js ≥ 20.19** (Vite 8).

```bash
npm install
npm run dev      # start dev server
npm test         # vitest — unit tests for the core (src/qr)
npm run lint     # oxlint
npm run build    # strict typecheck + production build
```

> **Windows + npm note:** npm can skip the optional native bindings that
> `oxlint`/`rolldown` need. If `npm run lint`/`npm run build` fail with
> *"Cannot find native binding"*, run
> `npm install --no-save "@oxlint/binding-win32-x64-msvc" "@rolldown/binding-win32-x64-msvc"`
> (no repo files change).

## Architecture notes

- `src/landing.ts` — the landing pages: one per content type, with its slug, SEO title,
  description and copy. The router and the build step both read from this table.
- `src/qr/` — framework-free core: `options.ts` (types + presets), `geometry.ts` (shared shape
  polygons/path data), `render.ts` (canvas + SVG rendering from the raw module matrix),
  `exporters.ts` (PNG/SVG/PDF/EPS/clipboard), `history.ts` (localStorage), `share.ts` (URL-fragment
  share links), `clipboard.ts`, `batch.ts` (CSV/JSON parsing + ZIP), `decode.ts` (image/webcam
  decoding), `images.ts`.
- The renderer uses `QRCode.create()` to obtain the raw module `BitMatrix`, so modules, eyes,
  gradients, and logos are drawn with shared geometry — the canvas preview and SVG/PDF/EPS
  exports always match.
- All processing happens locally; no network calls after the app loads.
- TypeScript runs in strict mode; the core in `src/qr/` is covered by vitest suites in
  `src/qr/__tests__/` (payload encoders, CSV/JSON parsing, geometry, history, share links).

## Deployment

The app is a single-page app with pretty URLs (`/wifi-qr-code-generator`). The host must rewrite
unknown paths to `index.html` so the router can take over:

- **Vercel** — `vercel.json` already contains the rewrite; just deploy the repository.
- **Netlify** — add `/* /index.html 200` to `_redirects`.
- **Nginx** — `try_files $uri $uri/ /index.html;`

`npm run build` writes a plain static bundle to `dist/`, so any static host works.

## Contributing & license

Contributions welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, standards,
and the PR process. CI (GitHub Actions) runs lint, tests, and the build on every PR.

Released under the [MIT License](./LICENSE).
