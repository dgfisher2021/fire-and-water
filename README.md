# Fire & Water — Dustin & Alex

**Live site:** [https://dgfisher2021.github.io/fire-and-water/](https://dgfisher2021.github.io/fire-and-water/)

A phone app for Dustin's songs — the Fire & Water trilogy about a brother and a sister, and the songs that came after. Built on the [Dust UI](https://github.com/dgfisher2021/dust-ui) mobile kit; on a desktop it runs inside a phone mockup floating over the artwork.

## Songs

**Fire & Water**

- **Pencil and Pen** — A boy who only trusted pencil — erasable, safe, fixable — watches his sister fill journals in permanent ink.
- **Fire and Water** — She was fire — bold, roaring, untamed. He was water — patient, adaptive, persistent.
- **Water and Fire** — The same story through her eyes. Her fire was never theirs to tame.

**More from Dustin**

- **Moments to Memories** — Pencil lines became journals became code; a brother builds a way to keep what time would steal, then what he built speaks to Alex in his voice.
- **Pencil and Pen (Baritone Version)** — The first song, sung low and rewritten around a chorus.
- **Dust I Become** — Ashes to ashes, dust to dust: he leaves, and becomes his own.
- **Not Afraid to Change (Extended Hope)** — A baritone and a soprano refuse to sabotage themselves.
- **Opposite Hearts** — Lyrics still on their way.

Each song has its own accent color that tints the whole app while it is showing.

## Screens

- **Album** — the covers crossfade inside a tilting frame over a glow in the song's colors; swipe, tap a dot, or let it play through. Below, the two tracklists.
- **Now Playing** — the media card (artwork, draggable scrubber, times, previous / play / next) sits above the lyrics, which scroll with reading focus: the stanza in the middle brightens while the rest recede. Section and voice tags render as small labels. Swipe left or right to change songs; the music keeps going.
- **Compare** — Fire and Water beside Water and Fire, Dustin's and Alex's voices, in synced-scroll columns with a transport bar.
- **More** — appearance (light or dark, theme presets, neutrals, corner radius, density), downloads, Google Drive links, sharing, credits.
- The bottom bar's center action plays and pauses from anywhere.

## Features

- Ambient backdrop: full-bleed artwork that crossfades and drifts behind everything
- Album play-through, lock-screen and hardware media controls (Media Session API)
- Keyboard: arrows switch songs, Space plays/pauses
- Shareable deep links — `/lyrics/dust` opens straight to a song (old `#water` links still work); native share sheet on phones, copy-link elsewhere
- Print-friendly lyrics
- Installable PWA that works offline (app shell, artwork and fonts cached; audio streams)

## Adding a song

1. Drop the audio in `public/` and the cover art in `public/assets/` as `<id>.jpg` (longest side about 1024) plus `<id>-512.jpg` (square thumbnail).
2. Put the lyrics in `src/data/lyrics/<id>.json` as an array of stanzas, each an array of lines. A line wrapped in `[brackets]` is a section or voice label.
3. Add the id to `trackIdSchema` and `TRACK_ORDER` and a `TRACKS` entry in `src/data/tracks.ts` (title, dedication, voice, description, duration, `collection`).
4. Give it a voice in `src/styles/index.css`: `--<id>`, `--<id>-deep`, `--<id>-glow`, `--<id>-ink` and a `:root[data-track='<id>']` block.

## Stack

React 19 + TypeScript + Vite 8 + TanStack Router + Tailwind v4 on `@dust-ui/ui`, `@dust-ui/motion`, `@dust-ui/tokens`; zustand for player state; `vite-plugin-pwa` for the service worker; self-hosted Cormorant Garamond and Outfit.

```
index.html              App shell, meta, pre-paint theme, legacy #hash redirect
src/routes/             / album · /lyrics/$track now playing · /compare · /more (stubs)
src/screens/            The four screens
src/components/         Shell, screen, artwork stage, lyrics reader and split, play button
src/components/ui/      Dust UI components vendored via @dust-ui-source
src/store/              Player state (one <audio> element) and toasts
src/data/tracks.ts      Song data; src/data/lyrics/*.json the longer lyrics
src/styles/index.css    Token contract, presets, brand default, per-song voices
public/                 Audio (*.m4a, *.mp3) and artwork
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
