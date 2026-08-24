export type FieldType = 'text' | 'textarea' | 'password' | 'select' | 'checkbox'

export interface FieldOption {
  value: string
  label: string
}

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  required?: boolean
  options?: FieldOption[]
  defaultValue?: string | boolean
}

export interface QrTypeDef {
  id: string
  label: string
  icon: string
  fields: FieldDef[]
  build: (data: Record<string, string | boolean>) => string
  emptyHint: string
}

function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1')
}

function escapeVCard(value: string): string {
  return value.replace(/([\\;,])/g, '\\$1').replace(/\n/g, '\\n')
}

function get(data: Record<string, string | boolean>, key: string): string {
  const v = data[key]
  return typeof v === 'string' ? v.trim() : ''
}

export const QR_TYPES: QrTypeDef[] = [
  {
    id: 'text',
    label: 'Text',
    icon: '📝',
    emptyHint: 'Enter some text to encode',
    fields: [
      { key: 'text', label: 'Text', type: 'textarea', placeholder: 'Any text you want to encode…', required: true },
    ],
    build: (d) => get(d, 'text'),
  },
  {
    id: 'url',
    label: 'URL',
    icon: '🔗',
    emptyHint: 'Enter a website URL',
    fields: [
      { key: 'url', label: 'Website URL', type: 'text', placeholder: 'https://example.com', required: true },
    ],
    build: (d) => {
      const url = get(d, 'url')
      if (!url) return ''
      return /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(url) ? url : `https://${url}`
    },
  },
  {
    id: 'wifi',
    label: 'Wi-Fi',
    icon: '📶',
    emptyHint: 'Enter your Wi-Fi network details',
    fields: [
      { key: 'ssid', label: 'Network name (SSID)', type: 'text', placeholder: 'MyWiFiNetwork', required: true },
      { key: 'password', label: 'Password', type: 'password', placeholder: 'Wi-Fi password' },
      {
        key: 'encryption',
        label: 'Encryption',
        type: 'select',
        options: [
          { value: 'WPA', label: 'WPA / WPA2 / WPA3' },
          { value: 'WEP', label: 'WEP' },
          { value: 'nopass', label: 'None (open network)' },
        ],
        defaultValue: 'WPA',
      },
      { key: 'hidden', label: 'Hidden network', type: 'checkbox', defaultValue: false },
    ],
    build: (d) => {
      const ssid = get(d, 'ssid')
      if (!ssid) return ''
      const encryption = get(d, 'encryption') || 'WPA'
      const password = get(d, 'password')
      const hidden = Boolean(d.hidden)
      const passSegment = encryption === 'nopass' ? '' : `P:${escapeWifi(password)};`
      return `WIFI:T:${encryption};S:${escapeWifi(ssid)};${passSegment}${hidden ? 'H:true;' : ''};`
    },
  },
  {
    id: 'email',
    label: 'Email',
    icon: '✉️',
    emptyHint: 'Enter recipient details',
    fields: [
      { key: 'to', label: 'To', type: 'text', placeholder: 'someone@example.com', required: true },
      { key: 'subject', label: 'Subject', type: 'text', placeholder: 'Subject line' },
      { key: 'body', label: 'Message', type: 'textarea', placeholder: 'Email body' },
    ],
    build: (d) => {
      const to = get(d, 'to')
      if (!to) return ''
      const params = new URLSearchParams()
      const subject = get(d, 'subject')
      const body = get(d, 'body')
      if (subject) params.set('subject', subject)
      if (body) params.set('body', body)
      const query = params.toString()
      return `mailto:${to}${query ? `?${query}` : ''}`
    },
  },
  {
    id: 'sms',
    label: 'SMS',
    icon: '💬',
    emptyHint: 'Enter phone number and message',
    fields: [
      { key: 'phone', label: 'Phone number', type: 'text', placeholder: '+1 555 123 4567', required: true },
      { key: 'message', label: 'Message', type: 'textarea', placeholder: 'Text message' },
    ],
    build: (d) => {
      const phone = get(d, 'phone').replace(/[\s()-]/g, '')
      if (!phone) return ''
      const message = get(d, 'message')
      return `SMSTO:${phone}:${message}`
    },
  },
  {
    id: 'phone',
    label: 'Phone Call',
    icon: '📞',
    emptyHint: 'Enter a phone number',
    fields: [
      { key: 'phone', label: 'Phone number', type: 'text', placeholder: '+1 555 123 4567', required: true },
    ],
    build: (d) => {
      const phone = get(d, 'phone').replace(/[\s()-]/g, '')
      return phone ? `tel:${phone}` : ''
    },
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: '🟢',
    emptyHint: 'Enter a WhatsApp number and message',
    fields: [
      { key: 'phone', label: 'Phone number (with country code)', type: 'text', placeholder: '15551234567', required: true },
      { key: 'message', label: 'Message', type: 'textarea', placeholder: 'Hi there!' },
    ],
    build: (d) => {
      const phone = get(d, 'phone').replace(/[\s+()-]/g, '')
      if (!phone) return ''
      const message = get(d, 'message')
      return `https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ''}`
    },
  },
  {
    id: 'vcard',
    label: 'Contact (vCard)',
    icon: '👤',
    emptyHint: 'Enter contact details',
    fields: [
      { key: 'firstName', label: 'First name', type: 'text', placeholder: 'Jane', required: true },
      { key: 'lastName', label: 'Last name', type: 'text', placeholder: 'Doe' },
      { key: 'org', label: 'Organization', type: 'text', placeholder: 'Acme Inc.' },
      { key: 'title', label: 'Job title', type: 'text', placeholder: 'Product Manager' },
      { key: 'phone', label: 'Phone', type: 'text', placeholder: '+1 555 123 4567' },
      { key: 'email', label: 'Email', type: 'text', placeholder: 'jane@example.com' },
      { key: 'website', label: 'Website', type: 'text', placeholder: 'https://example.com' },
    ],
    build: (d) => {
      const firstName = get(d, 'firstName')
      const lastName = get(d, 'lastName')
      if (!firstName && !lastName) return ''
      const org = get(d, 'org')
      const title = get(d, 'title')
      const phone = get(d, 'phone')
      const email = get(d, 'email')
      const website = get(d, 'website')
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${escapeVCard(lastName)};${escapeVCard(firstName)};;;`,
        `FN:${escapeVCard(`${firstName} ${lastName}`.trim())}`,
      ]
      if (org) lines.push(`ORG:${escapeVCard(org)}`)
      if (title) lines.push(`TITLE:${escapeVCard(title)}`)
      if (phone) lines.push(`TEL;TYPE=CELL:${escapeVCard(phone)}`)
      if (email) lines.push(`EMAIL:${escapeVCard(email)}`)
      if (website) lines.push(`URL:${escapeVCard(website)}`)
      lines.push('END:VCARD')
      return lines.join('\n')
    },
  },
  {
    id: 'event',
    label: 'Event',
    icon: '📅',
    emptyHint: 'Enter event details',
    fields: [
      { key: 'title', label: 'Event title', type: 'text', placeholder: 'Team Offsite', required: true },
      { key: 'location', label: 'Location', type: 'text', placeholder: 'Conference Room A' },
      { key: 'start', label: 'Start', type: 'text', placeholder: 'YYYY-MM-DDTHH:MM', required: true },
      { key: 'end', label: 'End', type: 'text', placeholder: 'YYYY-MM-DDTHH:MM' },
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Details about the event' },
    ],
    build: (d) => {
      const title = get(d, 'title')
      const start = get(d, 'start')
      if (!title || !start) return ''
      const toIcsDate = (v: string) => v.replace(/[-:]/g, '').slice(0, 15) + (v.includes('T') ? '00' : '')
      const end = get(d, 'end') || start
      const lines = [
        'BEGIN:VEVENT',
        `SUMMARY:${title}`,
        `DTSTART:${toIcsDate(start)}`,
        `DTEND:${toIcsDate(end)}`,
      ]
      const location = get(d, 'location')
      const description = get(d, 'description')
      if (location) lines.push(`LOCATION:${location}`)
      if (description) lines.push(`DESCRIPTION:${description}`)
      lines.push('END:VEVENT')
      return lines.join('\n')
    },
  },
]

export function defaultFormData(def: QrTypeDef): Record<string, string | boolean> {
  const data: Record<string, string | boolean> = {}
  for (const field of def.fields) {
    data[field.key] = field.defaultValue ?? (field.type === 'checkbox' ? false : '')
  }
  return data
}
