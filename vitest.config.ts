import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Data tests only: the app's Vite plugins (router codegen, PWA) stay out.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
