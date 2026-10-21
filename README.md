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
are real links, so they can be shared, bookmarked and indexed. Each page is also built as a
static HTML file with its own title, description and structured data (see
[SEO and static pages](#seo-and-static-pages)).

**Installable app** — the site is a PWA: it can be installed on the home screen (Android, Chrome,
Edge) and works completely offline once installed (see
[Progressive web app](#progressive-web-app-pwa)).

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
- `src/seo.ts` — keeps `document.title`, the description and the Open Graph tags in sync with
  the page during client-side navigation (the static build ships the tags for direct visits).
- `src/pwa.ts` — the web app manifest and the rules for the PWA notices; `src/components/PwaNotices.tsx`
  renders them. The Vite config reads the same manifest, so the app and the build never drift apart.
- `scripts/` — build-time only: the static HTML/sitemap/robots generator and the PNG writer for
  the icons and the Open Graph image.
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
  `src/qr/__tests__/` (payload encoders, CSV/JSON parsing, geometry, history, share links), and
  the build scripts in `scripts/` have their own suites in `scripts/__tests__/`.

## Deployment

The app is a single-page app with pretty URLs (`/wifi-qr-code-generator`). The host must rewrite
unknown paths to `index.html` so the router can take over:

- **Vercel** — `vercel.json` already contains the rewrite; just deploy the repository.
- **Netlify** — add `/* /index.html 200` to `_redirects`.
- **Nginx** — `try_files $uri $uri/ /index.html;`

`npm run build` writes a plain static bundle to `dist/`, so any static host works.

### SEO and static pages

Every landing page also ships as a static HTML file (`dist/<slug>/index.html`) with its own title,
meta description, canonical URL, Open Graph / Twitter tags and JSON-LD (`WebApplication`,
free). Next to that the build writes `dist/sitemap.xml`, `dist/robots.txt`, an Open Graph image
(`dist/og-image.png`) and the PWA icons (`dist/icons/`).

The public URL of the site is **not** hard-coded — set `VITE_SITE_URL` in the build environment
(for example in the Vercel project settings):

```bash
VITE_SITE_URL=https://qr.example.com npm run build
```

Without it the build still succeeds, but it skips the sitemap, robots.txt and the per-page static
HTML (and prints a warning) rather than pointing canonical links at a wrong domain.

The copy lives in `src/landing.ts`; the generator is in `scripts/static-pages.ts` and the small
dependency-free PNG writer (icons + Open Graph image) is in `scripts/images.ts`.

> **Note:** unknown URLs are rewritten to `index.html` and answered with `200` while the app shows
> its own “page not found” view. On a host that can return a real `404`, prefer serving a
> `404.html` for unmatched paths.

## Progressive web app (PWA)

The build produces an installable, offline-capable app:

- `dist/manifest.webmanifest` — name, icons (192, 512 and a maskable one), theme colour and
  `display: standalone`. The data lives in `src/pwa.ts` so the build and the app share it.
- `dist/sw.js` — a Workbox service worker that precaches the whole app (HTML, JS, CSS, icons,
  sitemap), so every page also works without a network connection.
- The app shows small notices at the bottom of the screen: *a new version is ready* (with a
  **Reload** button), *you are offline*, *ready to work offline* and *install the app*.

How the update flow works: a new build installs its service worker in the background. The app
then asks the visitor to reload — nothing is swapped out mid-session. On iOS (which has no
install prompt) the app shows the manual steps instead: *Share → Add to Home Screen*.

For the host:

- serve `sw.js` with `Cache-Control: no-cache` and `Service-Worker-Allowed: /` so updates are
  picked up (`vercel.json` already sets both),
- serve the site over HTTPS (or `localhost`) — browsers only allow service workers in a secure
  context.

The service worker is only generated for production builds (`npm run build`); `npm run dev` runs
without it so the dev server stays free of caching surprises.

## Contributing & license

Contributions welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, standards,
and the PR process. CI (GitHub Actions) runs lint, tests, and the build on every PR.

Released under the [MIT License](./LICENSE).
