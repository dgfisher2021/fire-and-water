# Fire & Water — Dustin & Alex

**Live site:** [https://dgfisher2021.github.io/fire-and-water/](https://dgfisher2021.github.io/fire-and-water/)

A phone app for three original songs exploring the bond between a brother and sister — Dustin and Alex. Built on the [Dust UI](https://github.com/dgfisher2021/dust-ui) mobile kit; on a desktop it runs inside a phone mockup floating over the artwork.

## Tracks

- **Pencil and Pen** — A boy who only trusted pencil — erasable, safe, fixable — watches his sister fill journals in permanent ink.
- **Fire and Water** — She was fire — bold, roaring, untamed. He was water — patient, adaptive, persistent.
- **Water and Fire** — The same story through her eyes. Her fire was never theirs to tame.

## Screens

- **Album** — the three covers crossfade inside a tilting frame over a glow in the active song's colors; swipe, tap a dot, or let it play through. Below, the tracklist.
- **Now Playing** — the media card (artwork, draggable scrubber, times, previous / play / next) sits above the lyrics, which scroll with reading focus: the stanza in the middle brightens while the rest recede. Swipe left or right to change songs; the music keeps going.
- **Compare** — the two mirrored songs, Dustin's and Alex's voices, in synced-scroll columns with a transport bar.
- **More** — appearance (light or dark, theme presets, neutrals, corner radius, density), downloads, Google Drive links, sharing, credits.
- The bottom bar's center action plays and pauses from anywhere.

## Features

- Per-song accent on every theme: pencil, fire and water color the play controls, the glow and the titles
- Ambient backdrop: full-bleed artwork that crossfades and drifts behind everything
- Album play-through, lock-screen and hardware media controls (Media Session API)
- Keyboard: arrows switch songs, Space plays/pauses
- Shareable deep links — `/lyrics/water` opens straight to a song (old `#water` links still work); native share sheet on phones, copy-link elsewhere
- Print-friendly lyrics
- Installable PWA that works offline (app shell, artwork and fonts cached; audio streams)

## Stack

React 19 + TypeScript + Vite 8 + TanStack Router + Tailwind v4 on `@dust-ui/ui`, `@dust-ui/motion`, `@dust-ui/tokens`; zustand for player state; `vite-plugin-pwa` for the service worker; self-hosted Cormorant Garamond and Outfit.

```
index.html              App shell, meta, pre-paint theme, legacy #hash redirect
src/routes/             / album · /lyrics/$track now playing · /compare · /more
src/components/         Shell, screen, artwork stage, lyrics reader and split, play button
src/components/ui/      Dust UI components vendored via @dust-ui-source
src/store/              Player state (one <audio> element) and toasts
src/data/tracks.ts      Track data and lyrics (zod-validated)
src/styles/index.css    Token contract, presets, brand default, per-song accents
public/                 Audio (*.m4a) and artwork
claude/                 Specs and analysis
```

## Developing

One-time: `@dust-ui/*` packages come from GitHub Packages, so npm needs a read token (classic PAT with `read:packages`):

```sh
npm config set //npm.pkg.github.com/:_authToken=<token> --location=user
```

Then:

```sh
pnpm install
pnpm dev        # http://localhost:4600
pnpm build      # typecheck + production build
pnpm lint
```

### Dust UI agent tooling

`.mcp.json` ships the shadcn MCP server and `components.json` declares the `@dust-ui` (import) and `@dust-ui-source` (fork) registries, so an AI agent opened in this folder can browse and install Dust UI components. Approve the server once with `/mcp`.

## Deploying

GitHub Pages deploys from `main` via `.github/workflows/deploy.yml`. The workflow needs the repo secret `DUST_UI_READ_TOKEN` to install `@dust-ui/*`.
