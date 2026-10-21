import { defineConfig } from 'vitest/config'

// Unit tests for the framework-free core in src/qr/, src/qrTypes.ts,
// src/landing.ts and the build scripts in scripts/. They run in plain Node —
// no DOM needed (browser APIs are stubbed per-suite).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
})
