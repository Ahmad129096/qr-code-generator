import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { HOME_LANDING, LANDING_PAGES, type LandingPage } from '../src/landing.ts'

/**
 * Build-time SEO: one static HTML file per landing page, plus sitemap.xml and
 * robots.txt. The HTML carries the page's title, description, canonical URL,
 * Open Graph / Twitter tags and JSON-LD, and a small static shell with the
 * headline so crawlers and slow connections see something useful.
 */

export const SITE_NAME = 'QR Code Generator'

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** The public root URL of the site, without a trailing slash. */
export function siteRoot(siteUrl: string, base = '/'): string {
  const cleanedBase = base.replace(/^\/+|\/+$/g, '')
  return `${siteUrl.replace(/\/+$/, '')}${cleanedBase ? `/${cleanedBase}` : ''}`
}

/** The public URL of a landing page. */
export function canonicalUrl(
  landing: LandingPage,
  siteUrl: string,
  base = '/',
): string {
  const root = siteRoot(siteUrl, base)
  return landing.slug ? `${root}/${landing.slug}` : `${root}/`
}

/** The meta block injected into every page head. */
export function renderMetaTags(
  landing: LandingPage,
  siteUrl: string,
  base = '/',
): string {
  const url = canonicalUrl(landing, siteUrl, base)
  const tags = [
    `<meta name="description" content="${escapeHtml(landing.description)}" />`,
    `<meta name="robots" content="index, follow" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:title" content="${escapeHtml(landing.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(landing.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${escapeHtml(`${siteRoot(siteUrl, base)}/og-image.png`)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(landing.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(landing.description)}" />`,
  ]
  return tags.join('\n    ')
}

/** JSON-LD describing the free web application. */
export function renderJsonLd(
  landing: LandingPage,
  siteUrl: string,
  base = '/',
): string {
  const url = canonicalUrl(landing, siteUrl, base)
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: landing.headline,
    alternateName: SITE_NAME,
    description: landing.description,
    url,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: SITE_NAME },
  }
  // JSON.stringify output is safe inside a <script> block as long as it has no
  // "</script>" sequence — escape the only character that could break out.
  const json = JSON.stringify(data, null, 2).replace(/<\//g, '<\\/')
  return `<script type="application/ld+json">\n    ${json}\n    </script>`
}

/**
 * The static shell that ships inside #root. It matches the markup the app
 * renders for the header and the hero, so the page looks the same before and
 * after React takes over.
 */
export function renderShell(landing: LandingPage): string {
  const points = landing.highlights
    .map((point) => `<li>${escapeHtml(point)}</li>`)
    .join('')
  return `<div class="app">
      <header class="app-header">
        <p class="brand"><a href="/">${escapeHtml(SITE_NAME)}</a></p>
        <p>Create QR codes for URLs, Wi-Fi, contacts, events, and more.</p>
      </header>
      <nav class="view-tabs" aria-label="Tools">
        <button type="button" class="view-tab active"><span aria-hidden="true">✨</span> Create</button>
        <button type="button" class="view-tab"><span aria-hidden="true">📷</span> Scan</button>
        <button type="button" class="view-tab"><span aria-hidden="true">📦</span> Batch</button>
      </nav>
      <section class="landing-hero">
        <h1>${escapeHtml(landing.headline)}</h1>
        <p class="landing-sub">${escapeHtml(landing.sub)}</p>
        <ul class="landing-points">${points}</ul>
      </section>
    </div>`
}

/**
 * Remove the SEO tags of the built template, so each page gets exactly one
 * description, one canonical link and one set of Open Graph tags.
 */
export function stripSeoTags(html: string): string {
  return html
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']robots["'][^>]*>/gi, '')
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:[^"']*["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']twitter:[^"']*["'][^>]*>/gi, '')
}

/** Build the final HTML of a landing page from the built index.html. */
export function renderPage(
  template: string,
  landing: LandingPage,
  siteUrl: string,
  base = '/',
): string {
  const title = escapeHtml(landing.title)
  const clean = stripSeoTags(template)
  const withTitle = clean.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${title}</title>`,
  )
  const head = `${renderMetaTags(landing, siteUrl, base)}\n    ${renderJsonLd(
    landing,
    siteUrl,
    base,
  )}`
  const withHead = withTitle.includes('</head>')
    ? withTitle.replace('</head>', `    ${head}\n  </head>`)
    : withTitle
  return withHead.replace(
    '<div id="root"></div>',
    `<div id="root">${renderShell(landing)}</div>`,
  )
}

/** The sitemap listing every landing page. */
export function renderSitemap(
  pages: LandingPage[],
  siteUrl: string,
  base = '/',
): string {
  const urls = pages
    .map(
      (page) =>
        `  <url>\n    <loc>${escapeHtml(canonicalUrl(page, siteUrl, base))}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${page.slug ? '0.8' : '1.0'}</priority>\n  </url>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

/** The robots.txt file. */
export function renderRobots(siteUrl: string, base = '/'): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteRoot(siteUrl, base)}/sitemap.xml\n`
}

export interface WriteOptions {
  /** The built output directory (dist). */
  outDir: string
  /** The public site URL, e.g. https://example.com */
  siteUrl: string
  /** Public base path, e.g. '/' */
  base?: string
}

/** Write every static page, the sitemap and robots.txt. Returns the paths. */
export function writeStaticPages(options: WriteOptions): string[] {
  const { outDir, siteUrl, base = '/' } = options
  const template = readFileSync(join(outDir, 'index.html'), 'utf8')
  const written: string[] = []

  // The home page keeps the root index.html.
  const home = renderPage(template, HOME_LANDING, siteUrl, base)
  writeFileSync(join(outDir, 'index.html'), home)
  written.push(join(outDir, 'index.html'))

  for (const page of LANDING_PAGES) {
    const dir = join(outDir, page.slug)
    mkdirSync(dir, { recursive: true })
    const file = join(dir, 'index.html')
    writeFileSync(file, renderPage(template, page, siteUrl, base))
    written.push(file)
  }

  const sitemap = join(outDir, 'sitemap.xml')
  writeFileSync(sitemap, renderSitemap([HOME_LANDING, ...LANDING_PAGES], siteUrl, base))
  written.push(sitemap)

  const robots = join(outDir, 'robots.txt')
  writeFileSync(robots, renderRobots(siteUrl, base))
  written.push(robots)

  return written
}
