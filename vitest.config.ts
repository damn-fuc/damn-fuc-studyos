import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const sourceRoot = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(sourceRoot),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    clearMocks: true,
  },
})
