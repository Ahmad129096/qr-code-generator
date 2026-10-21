import { describe, expect, it } from 'vitest'
import { QR_TYPES } from '../../qrTypes'
import { QR_TEMPLATES } from '../templates'

describe('QR templates', () => {
  it('has unique template ids and references known content types', () => {
    expect(new Set(QR_TEMPLATES.map((template) => template.id)).size).toBe(QR_TEMPLATES.length)
    for (const template of QR_TEMPLATES) {
      expect(QR_TYPES.some((type) => type.id === template.typeId)).toBe(true)
      expect(template.name.trim()).not.toBe('')
      expect(template.description.trim()).not.toBe('')
    }
  })

  it('provides the requested common starter use cases', () => {
    expect(QR_TEMPLATES.map((template) => template.id)).toEqual([
      'restaurant-menu',
      'event',
      'business-card',
      'wifi-sign',
    ])
  })
})
