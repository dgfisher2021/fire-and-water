# Fire & Water — Dustin & Alex

**Live site:** [https://dgfisher2021.github.io/fire-and-water/](https://dgfisher2021.github.io/fire-and-water/)

A mobile-first music experience for three original songs exploring the bond between a brother and sister — Dustin and Alex.

## Tracks

- **Pencil and Pen** — A boy who only trusted pencil — erasable, safe, fixable — watches his sister fill journals in permanent ink.
- **Fire and Water** — She was fire — bold, roaring, untamed. He was water — patient, adaptive, persistent.
- **Water and Fire** — The same story through her eyes. Her fire was never theirs to tame.

## Features

- Artwork stage: the three covers crossfade inside a tilting frame over a glow in the active track's colors; swipe, tap a thumbnail, or let it play through
- Ambient backdrop: full-bleed artwork that crossfades and drifts behind everything, vignetted so type stays legible
- Lyrics drawer: a frosted full-screen sheet with a grab handle — swipe down or press Escape to close, swipe left and right to change songs
- Reading focus: the stanza in the middle of the screen brightens while the rest recede
- Side by side: the two mirrored songs, Dustin's and Alex's voices, in synced-scroll columns
- Audio bar: play/pause with a buffering ring, a draggable scrubber, tabular times, share and download
- Album play-through: when a track ends the next one starts with its lyrics
- Lock-screen and hardware media controls (Media Session API)
- Keyboard: arrows switch tracks, Space plays/pauses, Escape closes
- Shareable deep links — `/lyrics/water` opens straight to a song (old `#water` links still work); native share sheet on phones, copy-link elsewhere
- Print-friendly lyrics
- Installable PWA that works offline (app shell, artwork and fonts cached; audio streams)

## Stack

React 19 + TypeScript + Vite 8 + TanStack Router + Tailwind v4 on [Dust UI](https://github.com/dgfisher2021/dust-ui) (`@dust-ui/ui`, `@dust-ui/motion`, `@dust-ui/tokens`), zustand for player state, sonner for toasts, `vite-plugin-pwa` for the service worker.

```
index.html              App shell, meta, legacy #hash redirect
src/routes/             / (home) · /lyrics/$track (drawer) · ?view=split
src/components/         App compositions built to Dust UI blocks rules
src/components/ui/      Dust UI components vendored via @dust-ui-source and modified
src/store/player.ts     Player state bound to the single <audio> element
src/data/tracks.ts      Track data and lyrics (zod-validated)
src/styles/index.css    Token contract, brand values, per-track accents
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
