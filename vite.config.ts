import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // GitHub Pages serves from /fire-and-water/; CI sets VITE_BASE_PATH.
  base: process.env.VITE_BASE_PATH ?? '/',
  // 4600 extends the dust-ui 4xxx port block (docs 4100 ... real-estate 4500).
  server: { port: 4600 },
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/*.webp', 'assets/*.png', 'robots.txt'],
      manifest: {
        name: 'Fire & Water — Dustin & Alex',
        short_name: 'Fire & Water',
        description:
          'Three original songs exploring the bond between a brother and sister.',
        start_url: '.',
        display: 'standalone',
        background_color: '#0a0e1a',
        theme_color: '#0a0e1a',
        icons: [
          { src: 'assets/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'assets/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // App shell, artwork and latin fonts precache; audio never does:
        // cached full bodies break range requests (seeking) in some browsers.
        globPatterns: ['**/*.{js,css,html,woff2,webp,png,svg,webmanifest}'],
        globIgnores: [
          '**/*.m4a',
          '**/*.mp3',
          '**/*-cyrillic*',
          '**/*-vietnamese*',
          '**/*-latin-ext*',
        ],
        navigateFallback: 'index.html',
        runtimeCaching: [
          { urlPattern: /\.(m4a|mp3)$/, handler: 'NetworkOnly' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
    // One React instance alongside the @dust-ui/* peer ranges.
    dedupe: ['react', 'react-dom', 'motion'],
  },
})
