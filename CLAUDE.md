# CLAUDE.md

Guidance for Claude Code in this repository.

## Commands

```bash
pnpm dev        # Vite on 4600 (check nothing already listens first)
pnpm build      # tsc -b && vite build - THE verification gate
pnpm lint       # eslint, 0 warnings expected
pnpm typecheck  # tsc -b --noEmit
pnpm format     # prettier on src/
```

## What this is

A phone app for three songs, built on the Dust UI mobile kit. Four screens
behind a `NavBottom` whose center action plays and pauses: Album (artwork
stage + `MobileListGroup` tracklist), Now Playing (`MobileMediaPlayer` card
above a reading-focus lyrics pane), Compare (the two mirrored songs in
synced columns with a transport bar) and More (`MobileListGroup` rows for
appearance, downloads, Drive links, sharing, credits). React 19 +
TypeScript strict + Vite 8 + TanStack Router + Tailwind v4 on
`@dust-ui/ui`, `@dust-ui/motion`, `@dust-ui/tokens` from GitHub Packages.

- `src/components/phone-shell.tsx` the chrome: on phones the screen fills
  the viewport with a fixed nav; from 768px up it sits in a `DeviceFrame`
  over a blurred copy of the artwork. `shell-context.ts` exposes the
  positioned root (for `SheetAction`/toast portals) and `useFramed`.
- `src/components/screen.tsx` one screen: `MobilePageHeader` on top
  (status-bar inset in the frame, safe-area on phones), scroll pane below.
- `src/routes/` `/` album, `/lyrics/$track` now playing, `/compare`,
  `/more`. The URL owns what is open; the store owns playback.
- `src/store/player.ts` zustand player state bound to the one `<audio>`
  element (`src/lib/audio.ts`) by `useAudioEngine`. Album play-through and
  lock-screen prev/next go through `requestTrack`, which the lyrics screen
  follows. Subscribe with selectors: `currentTime` updates every frame.
- `src/store/toasts.ts` in-frame toasts for `MobileToastStack`.
- `src/data/tracks.ts` zod-validated track data and lyrics;
  `src/data/timing.json` the sing-along start times (per stanza and line)
  that `LyricsReader` lights lines by (`lib/read-along.ts`,
  `hooks/use-follow-scroll.ts`). Generated from Whisper word timestamps
  aligned to the lyrics; missing songs read by scroll.
- `src/components/` app compositions built to Dust UI blocks rules;
  `src/components/ui/` holds Dust UI components vendored through the
  `@dust-ui-source` door as forks: `mobile-media-player`, `motion-carousel`,
  `motion-tilt` (deltas in the dust-ui spec). Everything else imports
  from the published packages (`@dust-ui/ui` 0.10, `tokens` 0.3).
- `src/styles/index.css` the token contract, the three presets, the brand
  default (light paper / dark navy, scoped `:root:not([data-theme])`),
  the voice tokens (`--pencil`, `--fire`, `--water`) and the per-track
  accent on `:root[data-track]`, which out-ranks every theme.

## Dust UI rules (house rules, non-negotiable)

- Semantic tokens only: `bg-primary`, `text-muted-foreground`,
  `var(--track-glow)`. No raw palette utilities, hex, or pixel radii.
- Import from `@dust-ui/*` first. New UI checks the library before it is
  written. The `@dust-ui-source/<name>` door only to fork or to take a
  component newer than the last publish; a fork records its delta in
  `../dust-ui/specs/`.
- No `asChild`: polymorphism is `render={<Link/>}`. Base UI state hooks
  are `data-active:` style, never `data-[state=...]`.
- `AppearanceProvider` owns dark mode and presets (`main.tsx`); never
  query `prefers-color-scheme` yourself. The accent and font sections of
  the drawer are hidden on purpose: the track owns the accent, the album
  owns the faces.
- `MotionProvider` mounts once at the root; under reduced motion show the
  end state, never leave content at `opacity: 0`.

## Verifying visually

Headless Chromium cannot launch in this WSL2 environment, but Windows
Chrome can be driven from WSL: `'/mnt/c/Program Files/Google/Chrome/
Application/chrome.exe' --headless=new --screenshot=... --window-size=...
http://localhost:4600/`. Desktop Chrome clamps the window to about 500px
wide, so the phone layout is verified through the 393px `DeviceFrame`
(open the app at 1440px), not through a 390px window.

## The dust-ui MCP

`.mcp.json` ships the shadcn MCP server and `components.json` declares the
`@dust-ui` and `@dust-ui-source` registries. Approve the server once with
`/mcp`. While dust-ui's GitHub Pages is disabled the registries point at a
local static server (`127.0.0.1:4180`) serving dust-ui's compiled registry;
swap the URLs back to `https://dgfisher2021.github.io/dust-ui/r/...` when
Pages is re-enabled.

## Deploy

GitHub Pages from `main` via `.github/workflows/deploy.yml`
(`VITE_BASE_PATH=/fire-and-water/`, `404.html` copy for SPA deep links).
Needs the repo secret `DUST_UI_READ_TOKEN` (classic PAT, `read:packages`).

## Docs

Specs, analysis and plans live in `claude/`. The README explains the
features; keep code comments short.
