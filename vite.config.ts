import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { VitePWA } from 'vite-plugin-pwa'
import share from './src/data/share.json' with { type: 'json' }

const SITE = 'https://music.dgfisher.com'
const SHARE_TAGS =
  /\s*<title>[\s\S]*?<\/title>|\s*<link rel="canonical"[^>]*>|\s*<meta\s+(?:name="description"|(?:property|name)="(?:og|twitter):[^"]*")[^>]*>/g
const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/**
 * A page per song link, so a shared link previews that song: the app's own
 * index.html with the song's title, description and cover in its head. The
 * app boots from it as from any route (a crawler runs no JavaScript).
 */
function sharePages(): Plugin {
  let outDir = 'dist'
  return {
    name: 'share-pages',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const shell = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8')
      const bare = shell.replace(SHARE_TAGS, '')
      const page = (route: string, title: string, song: (typeof share)[0]) => {
        const text = escapeHtml(song.description)
        const image = `${SITE}/assets/og/${song.id}.jpg`
        const head = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${text}" />
    <link rel="canonical" href="${SITE}${route}" />
    <meta property="og:type" content="music.song" />
    <meta property="og:site_name" content="Fire &amp; Water" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${text}" />
    <meta property="og:url" content="${SITE}${route}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${text}" />
    <meta name="twitter:image" content="${image}" />
  </head>`
        const dir = path.join(outDir, route)
        fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(
          path.join(dir, 'index.html'),
          bare.replace(/\s*<\/head>/, head)
        )
      }
      for (const song of share) {
        page(`/lyrics/${song.id}`, `${song.title} · Fire & Water`, song)
        if (song.film)
          page(`/kinetic/${song.id}`, `${song.title} · the kinetic film`, song)
      }
    },
  }
}

export default defineConfig({
  // music.dgfisher.com serves from the root; VITE_BASE_PATH builds for a subpath.
  base: process.env.VITE_BASE_PATH ?? '/',
  // 4600 extends the dust-ui 4xxx port block (docs 4100 ... real-estate 4500).
  server: { port: 4600 },
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    sharePages(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/*.webp', 'assets/*.png', 'robots.txt'],
      manifest: {
        name: 'Fire & Water - Dustin & Alex',
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
          '**/*.mp4',
          '**/*-cyrillic*',
          '**/*-vietnamese*',
          '**/*-latin-ext*',
          // The per-song share pages are for crawlers; the app shell serves people.
          'lyrics/**',
          'kinetic/**',
          'assets/og/**',
        ],
        navigateFallback: 'index.html',
        runtimeCaching: [
          { urlPattern: /\.(m4a|mp3|mp4)(\?|$)/, handler: 'NetworkOnly' },
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
