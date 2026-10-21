import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const entry = fileURLToPath(new URL('../../src/qr/browser.ts', import.meta.url))

export default defineConfig({
  publicDir: false,
  build: {
    emptyOutDir: true,
    lib: {
      entry,
      name: 'QrCodeGenerator',
      formats: ['es', 'iife'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.iife.js'),
    },
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
  },
})
