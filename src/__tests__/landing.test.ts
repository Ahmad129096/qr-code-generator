import { describe, expect, it } from 'vitest'
import {
  HOME_LANDING,
  LANDING_PAGES,
  landingForSlug,
  landingForType,
  pathForType,
} from '../landing'
import { QR_TYPES } from '../qrTypes'

describe('landing pages', () => {
  it('has one page per content type', () => {
    expect(LANDING_PAGES).toHaveLength(QR_TYPES.length)
    for (const type of QR_TYPES) {
      expect(landingForType(type.id)).toBeDefined()
    }
  })

  it('uses a unique slug, title and description per page', () => {
    const slugs = LANDING_PAGES.map((p) => p.slug)
    const titles = LANDING_PAGES.map((p) => p.title)
    const descriptions = LANDING_PAGES.map((p) => p.description)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(new Set(titles).size).toBe(titles.length)
    expect(new Set(descriptions).size).toBe(descriptions.length)
  })

  it('keeps SEO copy within sensible lengths', () => {
    for (const page of LANDING_PAGES) {
      expect(page.title.length).toBeLessThanOrEqual(75)
      expect(page.description.length).toBeLessThanOrEqual(200)
      expect(page.highlights.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('resolves slugs to pages and back', () => {
    for (const page of LANDING_PAGES) {
      expect(landingForSlug(page.slug)).toBe(page)
      expect(pathForType(page.typeId)).toBe(`/${page.slug}`)
    }
    expect(landingForSlug('nope')).toBeUndefined()
  })

  it('falls back to the home page for unknown types', () => {
    expect(pathForType('nope')).toBe('/')
    expect(HOME_LANDING.slug).toBe('')
  })
})
