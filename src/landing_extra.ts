import type { LandingPage } from './landing.js'

export const EXTRA_LANDING_PAGES: LandingPage[] = [
  {
    slug: 'restaurant-menu-qr-code-generator',
    typeId: 'url',
    title: 'Free Restaurant Menu QR Code Generator | Digital Menu QR',
    description: 'Create a QR code for your restaurant menu. Let customers scan to view your menu instantly. Free, no sign-up, no watermark, works in browser.',
    headline: 'Restaurant menu QR code generator',
    sub: 'Turn your menu link into a scannable QR code — perfect for tables, takeout and delivery.',
    highlights: ['Works with any menu link or PDF link', 'Print-ready PNG, SVG, PDF exports', 'Private & generated in your browser'],
  },
  {
    slug: 'google-review-qr-code-generator',
    typeId: 'url',
    title: 'Free Google Review QR Code Generator | Get More Reviews',
    description: 'Create a Google Review QR code to get more customer reviews. Free, no sign-up, no watermark. Share on receipts, cards and tables.',
    headline: 'Google Review QR code generator',
    sub: 'Send customers straight to your Google review page with one scan.',
    highlights: ['Direct link to your Google Business Profile review page', 'High-resolution QR for print', 'Fast, private, and free'],
  },
  {
    slug: 'business-card-qr-code-generator',
    typeId: 'vcard',
    title: 'Free Business Card QR Code Generator | vCard QR',
    description: 'Create a vCard QR code for your business card. Share contact details instantly. Free, no sign-up, no watermark.',
    headline: 'Business card QR code generator',
    sub: 'Put your contact info on cards, flyers and badges — one scan to save.',
    highlights: ['Saves to phone contacts', 'Works with all QR scanners', 'Fully private in-browser generation'],
  },
]
