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
- Custom call-to-action frame text with adjustable foreground/background colors.
- Extract a local color palette from the uploaded logo and apply colors to the QR design.
- Starter templates for restaurant menus, events, business cards, and Wi-Fi signs.
- Adjustable quiet zone and error-correction level.

**Export**

- PNG at 1×–8× scale (high-DPI), SVG vector with physical sizing, print-ready PDF (A4 sheet,
  business card, A4 poster, or paired A4 table-tent layout), and EPS vector.
- Frames are included in the preview, PNG, SVG, and PDF output. PDF print layouts preserve the
  selected physical QR size and place the table-tent design on both panels.
- Copy image straight to the clipboard.

**History & presets** — recent codes and saved styles persist in `localStorage` (browser-local only).
Restoring a history entry brings back the content type, the field values, and the style.

**Share** — “Copy link” creates a URL that recreates the exact code (type, fields, and style) in
the URL fragment, so nothing is sent to a server. The link warns you when it carries a password.

**Dynamic links (optional, hosted)** — when a site operator configures the separate Cloudflare
service, URL pages can create short redirect links whose destination can be edited later. This is
separate from static QR generation: the destination is sent to the selected service only when a
visitor explicitly creates a dynamic link. Dynamic QR scans use monthly caps, optional password
and expiry controls, aggregated country/device analytics, DNS-verified custom domains, abuse
reports, and URL checks through Google Web Risk. See
[Dynamic QR deployment and privacy](#dynamic-qr-deployment-and-privacy).

**Scan** — decode QR codes with your webcam or by uploading an image (uses `jsqr`).

**Batch** — paste rows or upload a CSV/JSON file and download a ZIP of PNG and/or SVG codes,
styled with your current settings (uses `jszip`). Quoted multiline CSV fields are supported.
To keep processing local and responsive, inputs are limited to 1 MiB, 100 codes per batch, and
2,048 UTF-8 bytes per QR value; rows that exceed QR capacity are listed after download.

**Pages** — every content type has its own landing page and URL, for example
`/wifi-qr-code-generator`, `/vcard-qr-code-generator` or `/event-qr-code-generator`. The URLs
are real links, so they can be shared, bookmarked and indexed. Each page is also built as a
static HTML file with its own title, description and structured data (see
[SEO and static pages](#seo-and-static-pages)).

**Installable app** — the site is a PWA: it can be installed on the home screen (Android, Chrome,
Edge) and works completely offline once installed (see
[Progressive web app](#progressive-web-app-pwa)).

**Developer API and widget** — the separate `qr-code-generator-browser` package provides a
browser-only TypeScript API for SVG/PNG generation and an accessible embeddable widget. It uses the
same QR engine as the app and does not send QR content to a server. See
[the package guide](./packages/qr-browser/README.md) for npm and script-tag examples. The package
can be built with `npm run build:browser-package`.

**Color theme** — light, dark or “follow the system”. The choice is remembered on the device; the
page never flashes in the wrong colors.

**Language & accessibility** — choose English, Urdu or Arabic. The selection is stored locally;
Urdu and Arabic enable right-to-left layout and update the document language and direction for
assistive technology. Core navigation, generator controls and field labels, templates, and the
scanner, batch and PWA notices are translated. Landing-page SEO copy and some detailed help and
error messages remain English.

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
- `src/theme.ts` — the color theme (auto / light / dark): the preference, the resolved theme and
  the `data-theme` attribute the CSS tokens react to. A tiny inline script in `index.html` sets the
  attribute before the first paint, so there is no flash of the wrong theme.
- `scripts/` — build-time only: the static HTML/sitemap/robots generator and the PNG writer for
  the icons and the Open Graph image.
- `src/qr/` — framework-free core: `options.ts` (types + presets), `templates.ts` (content and
  style starters), `palette.ts` (local logo color extraction), `print.ts` (physical PDF page
  layouts), `geometry.ts` (shared shape
  polygons/path data), `render.ts` (canvas + SVG rendering from the raw module matrix),
  `exporters.ts` (PNG/SVG/PDF/EPS/clipboard), `history.ts` (localStorage), `share.ts` (URL-fragment
  share links), `clipboard.ts`, `batch.ts` (CSV/JSON parsing + ZIP), `decode.ts` (image/webcam
  decoding), `images.ts`.
- The renderer uses `QRCode.create()` to obtain the raw module `BitMatrix`, so modules, eyes,
  gradients, and logos are drawn with shared geometry — the canvas preview and SVG/PDF/EPS
  exports always match.
- Static QR content and exports are processed locally. Optional dynamic links are a separate,
  explicitly hosted feature; the app makes no dynamic-service calls unless `VITE_DYNAMIC_API_URL`
  is configured and a visitor opens the URL generator panel.
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

### Dynamic QR deployment and privacy

Dynamic QR is **not required** for the app. Without `VITE_DYNAMIC_API_URL`, all existing static
codes continue to work locally. If enabled, dynamic destinations are stored in a Cloudflare Worker
and D1 database; they are not covered by the static generator's local-only guarantee.

The Worker uses accountless owner keys: a random 256-bit private key is kept in browser storage and
is required to list, edit, delete, and view analytics for that owner's links. Export and securely
back up the key. There is no account recovery; losing the key means the links cannot be managed.
The key is a bearer credential, so anyone who obtains it can manage the associated links.

Default free policy limits are **5 active links per owner key** and **1,000 scans per link per UTC
month**. An individual link may set a lower scan cap, expiry, or password. The limit is enforced
per key (not a verified identity), so it is a product quota, not a guarantee that prevents someone
from making another owner key. Creation and report submissions require Cloudflare Turnstile;
per-owner creation, per-link password attempts, and reports are rate-limited.

The redirect service stores only daily aggregate scan counts by country code and broad device
class. It does not store raw IP addresses, user-agent strings, referrers, cookies for analytics,
or individual scan records. Analytics aggregates are deleted after 90 days. A short-lived,
HTTP-only cookie is used only to remember a successful password unlock for 10 minutes. Abuse
reports retain their optional, length-limited text until resolved and are removed 180 days after
resolution. Do not include personal information in a report.

Service operators must review open reports via D1 and can temporarily disable a reported link
while investigating. Reports are not an automatic verdict; URL reputation checks can miss new or
changed threats, and false positives are possible. Do not describe this feature as guaranteed
malware protection.

Creating a dynamic link sends its destination to the service operator and to Google Web Risk for a
threat lookup; Turnstile challenge data is processed by Cloudflare. If URL checks are unavailable,
creation or destination edits fail closed. Passwords are salted and hashed server-side, but the
destination itself is not encrypted in D1. A password is a prompt before redirecting, not end-to-end
encryption or a secrecy guarantee. The implementation uses Web Risk rather than the Google Safe
Browsing API because Google's Safe Browsing API is restricted to non-commercial use, while this
project may be monetized.

The service is designed for Cloudflare Workers + D1. The Workers Paid plan currently starts at
**$5/month per account** and includes 10 million Worker requests/month; additional requests and CPU
are usage-billed. D1 has included monthly read/write/storage allowances on Paid. Google Web Risk
Lookup includes 100,000 monthly calls and then lists $0.50 per additional 1,000 calls. Cloudflare
for SaaS currently includes 100 customer hostnames on non-Enterprise plans and lists $0.10 per
additional hostname. Actual costs depend on traffic, region, plan, and provider changes. Recheck
the linked provider pricing before launch:

- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [Web Risk pricing](https://cloud.google.com/web-risk/pricing)
- [Safe Browsing API usage restrictions](https://developers.google.com/safe-browsing/v4/usage-limits)
- [Cloudflare for SaaS hostname plans](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/plans/)
- [Turnstile privacy and operation](https://developers.cloudflare.com/turnstile/)

#### Configure and deploy the Worker

The frontend continues to support Node.js 20.19+, but the current Wrangler release used for Worker
development/deployment requires Node.js 22+. Install Node 22 before running the Worker commands
below.

1. Create a D1 database and put its ID in `workers/dynamic/wrangler.toml`:

   ```bash
   npx wrangler d1 create qr-dynamic
   ```

2. Set `APP_ORIGIN` and `REDIRECT_HOST` in that file, then apply the migration and deploy:

   ```bash
   npx wrangler d1 migrations apply qr-dynamic --remote --config workers/dynamic/wrangler.toml
   npm run worker:deploy
   ```

3. Add Worker secrets (never use `VITE_*` for secrets):

   ```bash
   npx wrangler secret put TURNSTILE_SECRET --config workers/dynamic/wrangler.toml
   npx wrangler secret put WEB_RISK_API_KEY --config workers/dynamic/wrangler.toml
   npx wrangler secret put OWNER_TOKEN_PEPPER --config workers/dynamic/wrangler.toml
   npx wrangler secret put COOKIE_SIGNING_SECRET --config workers/dynamic/wrangler.toml
   ```

   Use distinct high-entropy values for the pepper and cookie-signing secret. Configure a Turnstile
   site key as the public `TURNSTILE_SITE_KEY` Worker variable. Enable the Web Risk Lookup API and
   use its secret key only in the Worker environment.

4. Attach the API hostname and redirect hostname to the Worker. For a visitor-owned custom domain,
   first request a verification token in the app, add the requested TXT record, verify it, and
   configure that hostname with Cloudflare for SaaS to route it to the Worker. Only verified
   hostnames owned by that owner key can be assigned to a dynamic link.

5. Set the **public** Worker API URL during the frontend build:

   ```bash
   VITE_DYNAMIC_API_URL=https://api.qr.example.com npm run build
   ```

The URL is public configuration, not a secret. The Turnstile secret, Web Risk key, owner-key pepper,
and cookie-signing secret must remain Worker secrets. Run `npm run worker:dev` to test the Worker
locally; local development still needs configured Turnstile/Web Risk credentials for successful
link creation.

Custom domains require the domain owner to complete DNS verification and the service operator to
provision and route the hostname in Cloudflare for SaaS; merely entering a hostname does not make it
live. The redirect route checks the request host against the verified domain mapping.

For moderation, review open reports:

```bash
npx wrangler d1 execute qr-dynamic --remote --config workers/dynamic/wrangler.toml --command "SELECT id, slug, reason, details, created_at FROM abuse_reports WHERE status = 'open' ORDER BY created_at"
```

After review, operators can set `codes.disabled_at` for the matching slug and mark the report
resolved. Keep report details private and follow a documented response process.

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

The “Support this project” link in the footer points to the first of `VITE_KOFI_URL`,
`VITE_BUY_ME_A_COFFEE_URL` or `VITE_GITHUB_SPONSORS_URL` that is set — and to the GitHub Sponsors
page of the repository owner when none of them is. Set them in the build environment to point the
button at your own page.

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
