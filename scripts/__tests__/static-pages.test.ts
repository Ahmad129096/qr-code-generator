import { describe, expect, it } from 'vitest'
import { HOME_LANDING, LANDING_PAGES } from '../../src/landing.ts'
import {
  canonicalUrl,
  escapeHtml,
  renderJsonLd,
  renderMetaTags,
  renderPage,
  renderRobots,
  renderShell,
  renderSitemap,
  siteRoot,
  stripSeoTags,
} from '../static-pages.ts'

const SITE_URL = 'https://qr.example.com'

const TEMPLATE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>QR Code Generator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/index.js"></script>
  </body>
</html>
`

describe('escapeHtml', () => {
  it('escapes the characters that would break out of an attribute', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
    expect(escapeHtml('say "hi"')).toBe('say &quot;hi&quot;')
    expect(escapeHtml("it's")).toBe('it&#39;s')
  })

  it('leaves ordinary text untouched', () => {
    expect(escapeHtml('Wi-Fi QR code generator')).toBe('Wi-Fi QR code generator')
  })
})

describe('siteRoot', () => {
  it('joins the site URL and base path', () => {
    expect(siteRoot(SITE_URL, '/')).toBe(SITE_URL)
    expect(siteRoot(SITE_URL + '/', '/')).toBe(SITE_URL)
    expect(siteRoot(SITE_URL, '/app/')).toBe(`${SITE_URL}/app`)
  })
})

describe('canonicalUrl', () => {
  it('uses the slug for a landing page', () => {
    const page = LANDING_PAGES.find((p) => p.slug === 'wifi-qr-code-generator')!
    expect(canonicalUrl(page, SITE_URL)).toBe(`${SITE_URL}/wifi-qr-code-generator`)
  })

  it('uses the root for the home page', () => {
    expect(canonicalUrl(HOME_LANDING, SITE_URL)).toBe(`${SITE_URL}/`)
  })
})

describe('renderMetaTags', () => {
  const tags = renderMetaTags(HOME_LANDING, SITE_URL)

  it('includes the description and canonical link', () => {
    expect(tags).toContain(`<meta name="description" content="${escapeHtml(HOME_LANDING.description)}" />`)
    expect(tags).toContain(`<link rel="canonical" href="${SITE_URL}/" />`)
  })

  it('includes Open Graph and Twitter tags', () => {
    expect(tags).toContain(`<meta property="og:title" content="${escapeHtml(HOME_LANDING.title)}" />`)
    expect(tags).toContain('<meta property="og:type" content="website" />')
    expect(tags).toContain('<meta name="twitter:card" content="summary_large_image" />')
  })

  it('points og:image at the shared image in the site root', () => {
    expect(tags).toContain(`<meta property="og:image" content="${SITE_URL}/og-image.png" />`)
  })

  it('marks pages as indexable', () => {
    expect(tags).toContain('index, follow')
  })
})

describe('renderJsonLd', () => {
  const block = renderJsonLd(HOME_LANDING, SITE_URL)

  it('is a JSON-LD script block', () => {
    expect(block.startsWith('<script type="application/ld+json">')).toBe(true)
    expect(block.endsWith('</script>')).toBe(true)
  })

  it('describes a free web application', () => {
    const json = JSON.parse(block.replace(/^[\s\S]*?<script[^>]*>/, '').replace(/<\/script>$/, ''))
    expect(json['@type']).toBe('WebApplication')
    expect(json.isAccessibleForFree).toBe(true)
    expect(json.offers.price).toBe('0')
    expect(json.url).toBe(`${SITE_URL}/`)
  })

  it('cannot break out of the script tag', () => {
    const json = JSON.parse(
      renderJsonLd({ ...HOME_LANDING, description: 'evil </script> payload' }, SITE_URL).replace(
        /^[\s\S]*?<script[^>]*>/,
        '',
      ).replace(/<\/script>$/, ''),
    )
    expect(json.description).toBe('evil </script> payload')
  })
})

describe('renderShell', () => {
  const shell = renderShell(HOME_LANDING)

  it('contains the headline and the highlights', () => {
    expect(shell).toContain(`<h1>${escapeHtml(HOME_LANDING.headline)}</h1>`)
    expect(shell).toContain(`<li>${escapeHtml(HOME_LANDING.highlights[0]!)}</li>`)
  })

  it('escapes the content it renders', () => {
    const escaped = renderShell({ ...HOME_LANDING, headline: 'a < b & "c"' })
    expect(escaped).toContain('a &lt; b &amp; &quot;c&quot;')
  })
})

describe('renderPage', () => {
  const page = renderPage(TEMPLATE, HOME_LANDING, SITE_URL)

  it('replaces the title', () => {
    expect(page).toContain(`<title>${escapeHtml(HOME_LANDING.title)}</title>`)
    expect(page).not.toContain('<title>QR Code Generator</title>')
  })

  it('injects the meta tags into the head', () => {
    expect(page).toContain('<link rel="canonical"')
    expect(page.indexOf('<link rel="canonical"')).toBeLessThan(page.indexOf('</head>'))
  })

  it('puts the static shell inside the root element', () => {
    expect(page).toContain(`<div id="root"><div class="app">`)
    expect(page).not.toContain('<div id="root"></div>')
  })

  it('keeps the rest of the built template', () => {
    expect(page).toContain('<script type="module" src="/assets/index.js"></script>')
  })

  it('keeps exactly one description', () => {
    const withDescription = TEMPLATE.replace(
      '<title>QR Code Generator</title>',
      '<title>QR Code Generator</title>\n    <meta name="description" content="Old copy" />',
    )
    const rendered = renderPage(withDescription, HOME_LANDING, SITE_URL)
    expect(rendered.match(/<meta name="description"/g)).toHaveLength(1)
    expect(rendered).not.toContain('Old copy')
  })
})

describe('stripSeoTags', () => {
  it('removes the tags the build replaces', () => {
    const html = `<meta name="description" content="a" />
    <meta name="robots" content="index" />
    <link rel="canonical" href="https://old.example" />
    <meta property="og:title" content="old" />
    <meta name="twitter:card" content="summary" />
    <meta name="theme-color" content="#fff" />`
    const stripped = stripSeoTags(html)
    expect(stripped).not.toContain('description')
    expect(stripped).not.toContain('robots')
    expect(stripped).not.toContain('canonical')
    expect(stripped).not.toContain('og:title')
    expect(stripped).not.toContain('twitter:card')
    expect(stripped).toContain('theme-color')
  })
})

describe('renderSitemap', () => {
  const sitemap = renderSitemap([HOME_LANDING, ...LANDING_PAGES], SITE_URL)

  it('lists every page with an absolute URL', () => {
    expect(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(sitemap).toContain(`<loc>${SITE_URL}/</loc>`)
    for (const page of LANDING_PAGES) {
      expect(sitemap).toContain(`<loc>${SITE_URL}/${page.slug}</loc>`)
    }
  })

  it('gives the home page the highest priority', () => {
    expect(sitemap).toContain('<priority>1.0</priority>')
  })
})

describe('renderRobots', () => {
  it('allows everything and points at the sitemap', () => {
    const robots = renderRobots(SITE_URL)
    expect(robots).toContain('User-agent: *')
    expect(robots).toContain('Allow: /')
    expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`)
  })
})
