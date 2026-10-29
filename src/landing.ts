/**
 * Landing pages: one per content type, each with its own URL, SEO copy and
 * short feature list. The copy lives here (and not in the components) so the
 * build step can generate static HTML for search engines from the same source.
 */

export interface LandingPage {
  /** URL slug without slashes, e.g. 'wifi-qr-code-generator'. */
  slug: string
  /** Content type id this page is about. */
  typeId: string
  /** <title> tag. */
  title: string
  /** Meta description. */
  description: string
  /** H1 on the page. */
  headline: string
  /** One-line explanation under the H1. */
  sub: string
  /** Three short bullets describing what the type does. */
  highlights: string[]
}

/** The home page — the generator with the first content type. */
export const HOME_LANDING: LandingPage = {
  slug: '',
  typeId: 'text',
  title: 'Free QR Code Generator Online | No Sign-Up, No Watermark',
  description:
    'Create free, high-resolution QR codes for links, Wi-Fi, vCard, WhatsApp, Email, SMS and more. No sign-up, no watermark, private & works in your browser.',
  headline: 'QR code generator',
  sub: 'Free, private and unlimited — every code is made in your browser, never uploaded.',
  highlights: [
    'No sign-up, no watermark, no limits',
    'PNG, SVG, PDF and EPS export',
    'Live checks for contrast, quiet zone and print size',
  ],
}

export const LANDING_PAGES: LandingPage[] = [
  {
    slug: 'text-qr-code-generator',
    typeId: 'text',
    title: 'Free Text QR Code Generator — Turn any message into a QR code',
    description:
      'Create a QR code that encodes any text message. Free, no sign-up and no watermark — the code is generated entirely inside your browser.',
    headline: 'Text QR code generator',
    sub: 'Turn any message into a scannable code — no account, no watermark, no upload.',
    highlights: [
      'Encode any plain text you like',
      'Download PNG, SVG, PDF or EPS',
      'Nothing is ever sent to a server',
    ],
  },
  {
    slug: 'url-qr-code-generator',
    typeId: 'url',
    title: 'Free URL QR Code Generator — Link QR codes with your logo',
    description:
      'Make a QR code for any website link. Style it with your colors, logo and shapes, then download a high-resolution PNG, SVG or print-ready PDF.',
    headline: 'URL QR code generator',
    sub: 'Point people to any link — with your colors, your logo, and a quiet zone that actually scans.',
    highlights: [
      'Works with any http(s) link',
      'Add your logo and brand colors',
      'Live contrast and print-size checks',
    ],
  },
  {
    slug: 'wifi-qr-code-generator',
    typeId: 'wifi',
    title: 'Free Wi-Fi QR Code Generator — Guests connect with one scan',
    description:
      'Create a Wi-Fi QR code with your network name, password and encryption type. Guests scan and connect — free, no app needed, nothing uploaded.',
    headline: 'Wi-Fi QR code generator',
    sub: 'Let guests join your network with a single scan — no typing a long password.',
    highlights: [
      'Supports WPA, WEP and open networks',
      'Optional hidden-network flag',
      'Print it for your table, reception or lobby',
    ],
  },
  {
    slug: 'email-qr-code-generator',
    typeId: 'email',
    title: 'Free Email QR Code Generator — Pre-filled mailto codes',
    description:
      'Create a QR code that opens a new email with the address, subject and message already filled in. Free to use, nothing is uploaded.',
    headline: 'Email QR code generator',
    sub: 'Scan to start an email that is already addressed and written.',
    highlights: [
      'Pre-fills recipient, subject and body',
      'Works with any mail client',
      'High-resolution export included',
    ],
  },
  {
    slug: 'sms-qr-code-generator',
    typeId: 'sms',
    title: 'Free SMS QR Code Generator — Pre-filled text messages',
    description:
      'Create a QR code that opens the phone dialler with a pre-filled number and message. Free, no sign-up, and nothing leaves your device.',
    headline: 'SMS QR code generator',
    sub: 'Send a pre-written message with one scan — great for offers, replies or feedback.',
    highlights: [
      'Number and message pre-filled',
      'Works on iOS and Android',
      'Style it to match your brand',
    ],
  },
  {
    slug: 'phone-qr-code-generator',
    typeId: 'phone',
    title: 'Free Phone Call QR Code Generator — Tap to call',
    description:
      'Create a QR code that starts a phone call to your number. Free to use, no app required, and the code is generated in your browser.',
    headline: 'Phone call QR code generator',
    sub: 'Put a tap-to-call button on your poster, menu or business card.',
    highlights: [
      'Starts a call with one scan',
      'Works with any phone number',
      'Add it to menus, posters or cards',
    ],
  },
  {
    slug: 'whatsapp-qr-code-generator',
    typeId: 'whatsapp',
    title: 'Free WhatsApp QR Code Generator — Open a chat instantly',
    description:
      'Create a QR code that opens a WhatsApp chat with a number and an optional message. Free, no sign-up, and nothing is uploaded.',
    headline: 'WhatsApp QR code generator',
    sub: 'Send people straight into a WhatsApp conversation — with your message ready.',
    highlights: [
      'Number and message pre-filled',
      'Opens straight in the WhatsApp app',
      'Perfect for menus, receipts and packaging',
    ],
  },
  {
    slug: 'vcard-qr-code-generator',
    typeId: 'vcard',
    title: 'Free vCard QR Code Generator — Share contact details',
    description:
      'Create a QR code that saves a contact card to a phone. Add a name, organisation, phone, email and website — free and completely private.',
    headline: 'Contact (vCard) QR code generator',
    sub: 'Let people save your details with one scan — no typing, no app required.',
    highlights: [
      'Name, company, phone, email and website',
      'Saves as a contact on the phone',
      'Works with the native camera app',
    ],
  },
  {
    slug: 'location-qr-code-generator',
    typeId: 'geo',
    title: 'Free Location QR Code Generator — Map pin QR codes',
    description:
      'Create a QR code that opens a map at exact coordinates, with an optional place label. Free, private, and generated in your browser.',
    headline: 'Location QR code generator',
    sub: 'Send people to an exact spot on the map with a single scan.',
    highlights: [
      'Latitude and longitude support',
      'Optional place label',
      'Opens in the default maps app',
    ],
  },
  {
    slug: 'app-store-qr-code-generator',
    typeId: 'appstore',
    title: 'Free App Store QR Code Generator — iOS and Android links',
    description:
      'Create a QR code that sends people to your app — Apple App Store or Google Play — with automatic detection of their device. Free to use.',
    headline: 'App Store QR code generator',
    sub: 'One code for both stores — every phone opens the right download page.',
    highlights: [
      'App Store and Google Play IDs',
      'Auto-detects iOS versus Android',
      'Perfect for print, packaging and ads',
    ],
  },
  {
    slug: 'social-qr-code-generator',
    typeId: 'social',
    title: 'Free Social QR Code Generator — Link to your profiles',
    description:
      'Create a QR code for Instagram, X, LinkedIn, GitHub, Facebook, YouTube, TikTok or Threads. Free, no watermark and no sign-up.',
    headline: 'Social profile QR code generator',
    sub: 'One code for the profile that matters — followers, customers or your open source work.',
    highlights: [
      'Eight platforms supported',
      'Handles the @ prefix for you',
      'Brand it with your own colors',
    ],
  },
  {
    slug: 'event-qr-code-generator',
    typeId: 'event',
    title: 'Free Event QR Code Generator — Calendar QR codes',
    description:
      'Create a QR code that adds an event to a calendar with the date, time, location and description. Free, private, and made in your browser.',
    headline: 'Event QR code generator',
    sub: 'Scan to save the date — the event lands in the calendar with every detail filled in.',
    highlights: [
      'Date, time, venue and description',
      'All-day or timed events',
      'Adds straight to Google, Apple or Outlook',
    ],
  },
]

const BY_SLUG = new Map(LANDING_PAGES.map((page) => [page.slug, page]))
const BY_TYPE = new Map(LANDING_PAGES.map((page) => [page.typeId, page]))

/** The landing page for a content type id, if there is one. */
export function landingForType(typeId: string): LandingPage | undefined {
  return BY_TYPE.get(typeId)
}

/** The landing page for a URL slug. */
export function landingForSlug(slug: string): LandingPage | undefined {
  return BY_SLUG.get(slug)
}

/** The path of a content type, e.g. '/wifi-qr-code-generator'. */
export function pathForType(typeId: string): string {
  const page = BY_TYPE.get(typeId)
  return page ? `/${page.slug}` : '/'
}
