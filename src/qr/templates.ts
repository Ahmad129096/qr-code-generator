import type { QrOptions } from './options'

export interface QrTemplate {
  id: string
  name: string
  description: string
  typeId: string
  formData: Record<string, string | boolean>
  options: Partial<QrOptions>
}

/** Starter content and styling for common printed QR use cases. */
export const QR_TEMPLATES: QrTemplate[] = [
  {
    id: 'restaurant-menu',
    name: 'Restaurant menu',
    description: 'A clear menu-link QR with a scan prompt.',
    typeId: 'url',
    formData: { url: '' },
    options: {
      fillMode: 'solid',
      fgColor: '#111827',
      bgMode: 'color',
      bgColor: '#ffffff',
      moduleShape: 'square',
      frameText: 'SCAN FOR MENU',
      frameBgColor: '#166534',
      frameTextColor: '#ffffff',
      printPreset: 'table-tent',
      printSizeMm: 70,
    },
  },
  {
    id: 'event',
    name: 'Event',
    description: 'A calendar-event code with a print-friendly frame.',
    typeId: 'event',
    formData: { title: '', start: '', end: '', location: '', description: '' },
    options: {
      fillMode: 'solid',
      fgColor: '#1e3a8a',
      bgMode: 'color',
      bgColor: '#ffffff',
      frameText: 'EVENT DETAILS',
      frameBgColor: '#1e3a8a',
      frameTextColor: '#ffffff',
      printPreset: 'a4-poster',
      printSizeMm: 140,
    },
  },
  {
    id: 'business-card',
    name: 'Business card',
    description: 'A contact QR sized for a standard business card.',
    typeId: 'vcard',
    formData: {
      firstName: '',
      lastName: '',
      org: '',
      title: '',
      phone: '',
      email: '',
      website: '',
    },
    options: {
      fillMode: 'solid',
      fgColor: '#111827',
      bgMode: 'color',
      bgColor: '#ffffff',
      frameText: 'SAVE MY CONTACT',
      frameBgColor: '#111827',
      frameTextColor: '#ffffff',
      printPreset: 'business-card',
      printSizeMm: 32,
    },
  },
  {
    id: 'wifi-sign',
    name: 'Wi-Fi sign',
    description: 'A high-contrast Wi-Fi code for a printed sign.',
    typeId: 'wifi',
    formData: { ssid: '', password: '', encryption: 'WPA', hidden: false },
    options: {
      fillMode: 'solid',
      fgColor: '#000000',
      bgMode: 'color',
      bgColor: '#ffffff',
      moduleShape: 'square',
      frameText: 'SCAN TO CONNECT',
      frameBgColor: '#1d4ed8',
      frameTextColor: '#ffffff',
      printPreset: 'a4-poster',
      printSizeMm: 140,
      errorCorrectionLevel: 'Q',
    },
  },
]
