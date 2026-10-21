import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { LANDING_PAGES } from './src/landing.ts'
import { MANIFEST } from './src/pwa.ts'
import { buildIcon, buildOgImage } from './scripts/images.ts'
import { writeStaticPages } from './scripts/static-pages.ts'

/**
 * After the bundle is written, generate the per-page static HTML, the sitemap,
 * robots.txt and the PWA icons / Open Graph image.
 *
 * The public site URL comes from VITE_SITE_URL — it is needed for canonical
 * links, Open Graph URLs and the sitemap. Without it the SEO files are skipped
 * (with a warning) rather than pointing at a wrong domain.
 */
function staticSite(env: Record<string, string>): Plugin {
  let outDir = 'dist'
  let base = '/'
  return {
    name: 'qr-static-site',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
      base = config.base
    },
    closeBundle() {
      const siteUrl = (env['VITE_SITE_URL'] ?? '').trim()
      const link = siteUrl || 'https://github.com/Ahmad129096/qr-code-generator'

      const iconsDir = join(outDir, 'icons')
      mkdirSync(iconsDir, { recursive: true })
      writeFileSync(join(iconsDir, 'icon-192.png'), buildIcon(192, link))
      writeFileSync(join(iconsDir, 'icon-512.png'), buildIcon(512, link))
      writeFileSync(join(iconsDir, 'icon-maskable-512.png'), buildIcon(512, link, true))
      writeFileSync(join(outDir, 'og-image.png'), buildOgImage(link))

      if (!siteUrl) {
        console.warn(
          '[static-site] VITE_SITE_URL is not set — skipping sitemap.xml, robots.txt ' +
            'and the static per-page HTML. Set it to your public URL before deploying.',
        )
        return
      }

      const written = writeStaticPages({ outDir, siteUrl, base })
      console.log(
        `[static-site] wrote ${written.length} file(s) for ${siteUrl} (${LANDING_PAGES.length} pages)`,
      )
    },
  }
}

/**
 * The installable app: a web app manifest, a service worker that precaches
 * the whole app (so it works offline) and a prompt for new versions.
 *
 * The plugin runs in the "post" phase, so the static pages and the icons
 * written by the plugin above already exist when Workbox builds the
 * precache list.
 */
const pwa = VitePWA({
  registerType: 'prompt',
  injectRegister: 'auto',
  manifest: MANIFEST,
  workbox: {
    // Everything the app needs to run offline.
    globPatterns: [
      '**/*.{js,css,html,png,svg,ico,webp,woff,woff2,txt,xml,json}',
    ],
    // Any URL falls back to the app shell; the router picks the right page.
    navigateFallback: '/index.html',
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
  },
  devOptions: {
    enabled: false,
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    plugins: [react(), staticSite(env), pwa],
  }
})
