# Fire & Water — Dustin & Alex

**Live site:** [https://dgfisher2021.github.io/fire-and-water/](https://dgfisher2021.github.io/fire-and-water/)

A phone app for Dustin's songs — the Fire & Water trilogy about a brother and a sister, and the ten songs that came after. Each song has its artwork, its lyrics and a sing-along mode that lights the words as they are sung. Built with React on the [Dust UI](https://github.com/dgfisher2021/dust-ui) mobile kit and deployed to GitHub Pages on every push to `main`; on a desktop it runs inside a phone mockup floating over the artwork, on a phone it installs as an app.

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
- **Mercy I Owe Myself** — Relentless self-reflection, and the one mercy he never gives himself. Lyrics still on their way.
- **Magic of the Raven** — The shadow returns and the raven is here: a magician between worlds, prayers carried through the midnight air. Lyrics still on their way.
- **L’espoir est à moi (en français)** — Waves of Hope, sung in French. Lyrics still on their way.
- **I Make It Beautiful** — The songs came before the knowing; wound, rewrite, redirect, and the dark made beautiful.
- **Waves of Hope** — Hope is not blind, hope is mine: a choice made every morning and every night.

Each song has its own accent color that tints the whole app while it is showing.

## Screens

- **Album** — the covers crossfade inside a tilting frame over a glow in the song's colors; swipe, tap a dot, or let it play through. Below, the two tracklists.
- **Now Playing** — the media card (artwork, draggable scrubber, times, previous / play / next) sits above the lyrics, which scroll with reading focus: the stanza in the middle brightens while the rest recede. Section and voice tags render as small labels. Swipe left or right to change songs; the music keeps going.
- **Compare** — Fire and Water beside Water and Fire, Dustin's and Alex's voices, in synced-scroll columns with a transport bar.
- **More** — appearance (light or dark, theme presets, neutrals, corner radius, density), downloads, Google Drive links, sharing, credits.
- The bottom bar's center action plays and pauses from anywhere.

## Features

- Sing-along: while a song plays, the sung line lights up in the song's glow, earlier lines settle back, and the pane keeps the current stanza centred; scroll away and a "Back to the song" pill brings you back. Songs without timings read by scroll instead.
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
5. Generate the sing-along timings (below). A song missing from `src/data/timing.json` simply reads by scroll.

## Timing the lyrics

`src/data/timing.json` holds one start time per stanza and per line, `{ "<id>": { "stanzas": [seconds...], "lines": [[seconds...], ...] } }` (a label line takes the time of the line after it). `scripts/timing/` regenerates it: Whisper transcribes each song with word timestamps, then the known lyrics are aligned to the transcript and the unheard lines are spread between the heard ones.

```sh
python3 -m venv scripts/timing/.venv && scripts/timing/.venv/bin/pip install faster-whisper
scripts/timing/.venv/bin/python scripts/timing/transcribe.py            # all songs, or pass ids
scripts/timing/.venv/bin/python scripts/timing/transcribe.py --strict   # optional second pass
python3 scripts/timing/align.py                                         # writes timing.json
python3 scripts/timing/report.py dust                                   # per-line check
```

The default pass never drops a window, which matters for vocals buried under the mix; `--strict` uses Whisper's own thresholds and is cleaner where the voice is clear. The aligner keeps whichever pass anchors more lines per song and prints the share of lines it heard. Transcripts cache in `scripts/timing/asr*/` (ignored). Expect a few minutes per song on a CPU. Hand-edit a number in `timing.json` if a line lights up early or late; the report shows which lines were heard (A) and which were spread (~).

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

Every push to `main` runs `.github/workflows/deploy.yml`: lint, build with `VITE_BASE_PATH=/fire-and-water/`, copy `index.html` to `404.html` for deep links, then publish to GitHub Pages through the Actions deployment (the repo's Pages source is "GitHub Actions"). Pull requests run the build only. The same workflow can be started by hand from the Actions tab.

Installing `@dust-ui/*` from GitHub Packages needs the repo secret `DUST_UI_READ_TOKEN`, a classic personal access token with `read:packages`. The packages are owned by the `dust-ui` organization and this repository is not, so the workflow's own token cannot be granted access to them. Create the token at github.com/settings/tokens, then:

```sh
gh secret set DUST_UI_READ_TOKEN --repo dgfisher2021/fire-and-water
gh workflow run deploy.yml --repo dgfisher2021/fire-and-water
```
