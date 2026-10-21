import type { LandingPage } from './landing'

/**
 * The public site URL. Set VITE_SITE_URL in the build environment so the
 * canonical and Open Graph URLs match the static pages.
 */
const SITE_URL = (import.meta.env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '')

function setMeta(attr: 'name' | 'property', key: string, content: string): void {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

function setCanonical(href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  link.href = href
}

/**
 * Keep the document head in sync with the current page. The static build
 * already ships the right tags for a direct visit; this keeps them correct
 * after client-side navigation.
 */
export function applySeo(landing: LandingPage): void {
  document.title = landing.title
  setMeta('name', 'description', landing.description)
  setMeta('property', 'og:title', landing.title)
  setMeta('property', 'og:description', landing.description)
  if (SITE_URL) {
    const url = landing.slug ? `${SITE_URL}/${landing.slug}` : `${SITE_URL}/`
    setMeta('property', 'og:url', url)
    setCanonical(url)
  }
}

/** The head tags for a page that does not exist. */
export function applyNotFoundSeo(): void {
  document.title = 'Page not found — QR Code Generator'
  setMeta('name', 'robots', 'noindex, follow')
}
