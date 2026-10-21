# QR Code Generator Browser API

This package exposes the QR generator's browser-only API and a small embeddable widget. QR content
is encoded and rendered in the visitor's browser; the package does not upload data or call a
generation service.

## Install

```bash
npm install qr-code-generator-browser
```

## Generate SVG

```ts
import { createQrSvg } from 'qr-code-generator-browser'

const svg = createQrSvg('https://example.com', {
  fgColor: '#123456',
  bgColor: '#ffffff',
  errorCorrectionLevel: 'Q',
})

document.querySelector('#preview')!.innerHTML = svg
```

If rendering into the DOM, only insert SVG returned by this package; do not concatenate
untrusted markup into it. The content encoded into the QR is preserved exactly.

## Generate a PNG

```ts
import { createQrPng } from 'qr-code-generator-browser'

const png = await createQrPng('https://example.com', { size: 512 }, 2)
const imageUrl = URL.createObjectURL(png)
const image = document.querySelector('img')!
image.src = imageUrl
image.onload = () => URL.revokeObjectURL(imageUrl)
```

PNG rendering requires a browser canvas. The scale argument must be an integer from 1 to 8.

## Embed the widget without a bundler

Host `dist/index.iife.js` on your site (or use the published package's `unpkg` entry), then add:

```html
<div id="qr-widget"></div>
<script src="/vendor/qr-code-generator/index.iife.js"></script>
<script>
  const widget = QrCodeGenerator.mountQrWidget('#qr-widget', {
    fgColor: '#123456',
    errorCorrectionLevel: 'Q',
    frameText: 'Scan to visit',
  })

  // Call widget.destroy() when removing the widget.
</script>
```

`mountQrWidget` returns a `destroy()` handle, throws if its target cannot be found, and reports
encoding errors to an accessible status area. It appends its own markup to the target and removes
only that markup when destroyed.

## Options

The optional style object is `Partial<QrOptions>`. Omitted or invalid values use the same safe
defaults as the main app. Images must be local image data URLs; remote image URLs are not accepted.
`QrOptions` and the `ErrorCorrectionLevel` type are exported for TypeScript consumers.

## Build from this repository

```bash
npm install
npm run build:browser-package
```

The build writes an ES module, an IIFE script bundle, and TypeScript declarations to `dist/`.
