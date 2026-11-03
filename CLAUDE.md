# CLAUDE.md

Guidance for Claude Code in this repository.

## Commands

```bash
pnpm dev        # Vite on 4600 (check nothing already listens first)
pnpm build      # tsc -b && vite build - THE verification gate
pnpm lint       # eslint, 0 warnings expected
pnpm typecheck  # tsc -b --noEmit
pnpm test       # vitest: track data, files, sheets, timing, sizes
pnpm format     # prettier on src/
```

## What this is

A phone app for Dustin's songs, built on the Dust UI mobile kit. Four
tabs behind a `NavBottom` (Songs, Albums, the center play/pause action,
Lyrics, More), with a `MiniPlayer` above the bar once a song plays: Songs
(artwork stage + a newest-first timeline of `MobileListGroup` rows, or
album order, A to Z, by album), Albums (`MotionAccordion type='single'` of
glass cards, `IllustrationIcon` per album in its lead song's voice),
Lyrics, i.e. Now Playing (the player folded to `NowPlayingBar` by default
above a sing-along pane, a `MobileMessageActions` icon row for copy,
download, side by side, share and "…"; side by side is two songs in synced
columns, pair in the URL as `?with=`) and More (`MobileListGroup` rows for
appearance, downloads, Drive links, sharing, and the About note from
`ALBUM.about` with the Suno link). React 19 +
TypeScript strict + Vite 8 + TanStack Router + Tailwind v4 on
`@dust-ui/ui` 0.31, `@dust-ui/blocks` 0.21, `@dust-ui/motion` 0.13,
`@dust-ui/tokens` 0.11 and `@dust-ui/3d` 0.8 from GitHub Packages (blocks
and 3d pin an exact ui, blocks an exact motion: bump them together or two
copies install). Each package's compiled
`dist` is an `@source` in `index.css`; a package missing there renders its
classes unstyled (the shell's backdrop went to zero height without blocks).

- `src/components/phone-shell.tsx` the chrome on `@dust-ui/blocks`'
  `MobileAppShell`: on phones the screen fills the viewport with a fixed
  nav; from 768px wide and 700px tall it sits in a `DeviceFrame` over a
  blurred copy of the backdrop (a landscape phone is wide but short and
  stays fluid). Framed, the shell renders the backdrop twice, so
  `SongBackdrop` draws the artwork in the window copy and the chosen
  background only inside the phone (one WebGL scene, never two). The nav,
  mini player (`overlay`, `strip`) and toasts are shell props; the pulse
  glow and its variables mount inside, where `useMobileShellRoot` has the
  root. Screens are `MobileAppScreen`; `useMobileShellRoot` (for
  `SheetAction`/toast portals) and `useMobileShellFramed` come from blocks.
  The `short:` variant (max-height 560px) lays the album stage sideways and
  hides the Now Playing card.
- `src/screens/lyrics.tsx` keeps the Now Playing card and bar both mounted
  and starts folded to the bar; a tap unfolds the card for that song
  (grid-rows transition, `inert` on the hidden one). The screen has no
  `MobilePageHeader`: a title row (`MotionTextMorph` title, then the
  written date beside the kit's `MobileMessageActions` toolbar, sized up
  from 22px to 36px targets) sits above the control in both states. Copy
  writes `songText` (`lib/song-text.ts`: title, date, description, Suno
  style, lyrics); "…" is a `SheetAction` with `container` for the rarer
  actions. `?with=<id>` swaps the reader for `LyricsCompare` (two
  `LyricsReader`s in `LyricsSplit`); `/compare?left&right` redirects there.
  The card holds the description and the Suno style (`data/suno-style.ts`)
  beside the cover, then shuffle · prev · play · next · repeat (the frame's
  status-bar inset is padding on the wrapper). Neither the Songs screen has
  a header: its stage title does the announcing and the theme button sits
  alone at the top.
- Glass (the `glass` prop on `MobileListGroup`, `MobileSearchBar` and
  `MediaPlayer`, or `bg-card/85 backdrop-blur-md` on the app panels) needs
  no backdrop root between it and the artwork: a `mask-image`, an `opacity`
  below 1, a filter, or a filled opacity animation on any ancestor leaves
  it nothing to frost.
- `src/routes/` `/` songs (`?sort=album|title|collection`, zod-validated;
  the default `written` timeline is stripped so the URL stays clean; More's
  "The story so far" and the old `/story` land there), `/albums`,
  `/lyrics/$track` now playing (`?with=` side by side), `/compare` (a
  redirect), `/more`, `/settings` and `/time/$track`, the tap-to-time tool
  (no tab). The URL owns what is open; the store owns playback.
- `src/store/player.ts` zustand player state bound to the one `<audio>`
  element (`src/lib/audio.ts`) by `useAudioEngine`. A finished song hands
  off by `playMode` (`nextAfterEnd`: album order, repeat, shuffle; the
  card's shuffle and repeat toggles set it, off is album order); that and
  lock-screen prev/next go through `requestTrack`, which the lyrics screen
  follows. Subscribe with selectors: `currentTime` updates every frame.
  Selectors must return stable values, never a fresh object.
- `src/lib/toaster.ts` one `createMobileToaster` for the in-frame
  `MobileToastStack` (`toaster.push` from anywhere). `src/store/prefs.ts`
  stays zustand: the kit's `useLocalStorage` does not sync two hooks in one
  tab, so a Settings change would not reach the shell.
- `src/data/tracks.ts` zod-validated track data; `src/data/lyrics/<id>.json`
  the lyric sheets, globbed by `src/data/lyrics/index.ts` (plain stanzas or
  `{ source: 'transcribed', stanzas }`), written by `scripts/lyrics/`
  (import-suno.py from a Suno zip, from-transcript.py from Whisper), never
  typed into components; `src/data/audio-sizes.json` (from
  `scripts/audio-sizes.py`) the download sizes; `src/data/audio-envelopes.json`
  (from `scripts/audio-envelope.py`) the loudness strip the waveform draws;
  `src/data/timing.json` the sing-along start times (per stanza and line,
  and per word for the lines the aligner heard, null otherwise) that
  `LyricsReader` lights by (the kit's `activeLyricsPosition` and
  `activeLyricsWord`). Generated by
  `scripts/timing/` (Whisper word timestamps aligned to the lyrics, README
  "Timing the lyrics"), or by hand on the `/time/$track` page; missing songs
  read by scroll. The kit's `toLrc` writes the same data out as an LRC
  file and `lyricsToText` as plain text for the clipboard (`copyText` in
  `lib/share.ts`). Both JSON files are laid out by their scripts and
  excluded from Prettier. `src/data/suno-catalog.json` is the Suno library
  as logged on 2026-10-06 (title, creation date, model, duration, style
  prompt per song), enriched by `scripts/suno-catalog.py` with `appId`,
  `addedToApp`, the album description and file locations, plus `source:
"app"` entries for album songs the log missed; `suno-catalog.test.ts`
  checks it against `TRACK_ORDER`. Re-run the script (with `--dates` for
  `written`) after adding a song. The download zips live in the ignored
  `downloads/` folder:
  `scripts/lyrics/import-suno.py` reads sheets from them (`--only=id,id`
  with `--force` replaces a few; re-run `scripts/timing/align.py` for those
  ids after, the timing follows the sheet) and `scripts/audio-convert.py`
  turns their M4A into MP3 or WAV with ffmpeg.
  `src/data/collections.ts` groups the songs by theme into the albums
  (`COLLECTIONS` in display order, each with its `IllustrationName`;
  `COLLECTION_OF` typed over every `TrackId` so a new song must be placed);
  `src/lib/sort.ts` orders the Songs list (`sortTracks`, `groupTracks` for
  the albums, `groupTracksByMonth` for the timeline, newest first) and the
  `SortButton` offers the orders in a `SheetAction`.
- `src/components/` app compositions on the published packages: no forks.
  The kit supplies the shell, `MediaRow`, `MediaPlayer` (the `/time` bar),
  `MediaPlayButton`, `MediaScrubber`, `MediaWaveform`, `MotionMarquee
overflowOnly`, `MotionTextMorph maxChars` (in motion 0.12 to 0.13 it never
  morphs, only fades: its wrap check measures the new `sr-only` copy; an
  upstream fix), `SheetAction` `checked`,
  `useHotkeys`, `useMediaSession`, `filterByText`, `shareLink`,
  `downloadUrl`/`downloadText` and `formatTime`. What is still app-level and
  why: `LyricsReader` and `LyricsSplit` (the kit's `MediaLyricsReader` and
  `MediaLyricsSplit` style the sung line with a glow only, no glass pill or
  halo, fade the pane with a mask, which stops the glass frosting, have no
  per-stanza fade-up, and do not re-centre the sung line when the pane
  resizes as the player folds, and follow the sung stanza rather than the
  line, so a verse taller than the pane runs past its edges; those are the
  upstream asks),
  `NowPlayingCard` and `NowPlayingBar` (the kit's `MediaPlayer` has no slot
  for a description or the waveform, so the unfolded control is composed
  here: `MediaScrubber` in the card, `MediaWaveform` as the bar's slider,
  shuffle and repeat flanking the transport, and a chevron on each that
  folds or unfolds by hand; `lyrics.tsx` keeps that choice per song),
  `MiniPlayer` (kept instead of
  `MediaNowPlayingBar` for the progress ring around play),
  `TrackRow` (song data on `MediaRow`, with a play control that opens Now
  Playing), `SongPicker` (`MobileListPicker` items have no trailing glyph
  and need a `value`, and More's download and Drive pickers show a download
  or link glyph per row with no chosen song), `TagPill` (`Pill` at the
  kit's smallest readable step), `ArtworkStage` (the art is
  `min(216px, 28dvh)` so the stage's actions stay above the mini player on
  short phones). `SwipeRow` keeps its action strip mounted behind a closed
  row, which shows through this app's translucent `--card`, so the
  tracklist has no swipe actions.
- `src/styles/index.css` the token contract, the three presets, the brand
  default (light paper / dark navy, scoped `:root:not([data-theme])`),
  the voice tokens (`--fire`, `--water`, one set per song, named by the
  id) and the accent on `:root[data-track]`, which out-ranks every theme.
  `usePageMeta` sets the open song's `--track-*` (from its voice) and the
  kit's `--media-*` accent (`mediaAccentVars`, deep and glow from the
  voice) inline on `<html>`, so there is no CSS block per song.

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
`/mcp`. The registries point at dust-ui's GitHub Pages
(`https://dgfisher2021.github.io/dust-ui/r/...`). Should Pages go down
again, serve dust-ui's compiled registry locally (`python3 -m http.server
4180 --bind 127.0.0.1 --directory <dust-ui>/apps/docs/public`) and point
both URLs at `http://127.0.0.1:4180/r/...`; the server reads
`components.json` once at start, so restart the session after a swap. The
`@dust-ui` door's descriptions are boilerplate: the real ones are the
`description` prop of dust-ui's docs routes and the props are in the
installed `node_modules/@dust-ui/ui/dist/<name>.d.ts`.

## Deploy

`main` deploys to Railway behind Cloudflare at https://music.dgfisher.com,
the way dust-ui ships ui.dgfisher.com. `.github/workflows/ci.yml`
classifies the diff (drafts and prose-only diffs run nothing more), then
lints, tests and builds at base `/`; on `main`, while the repo variable
`DEPLOY_ENABLED` is `true`, it copies `dist/` to `deploy/railway/site/` and
`railway up`s that folder (Caddy: SPA fallback, hashed `/assets/`
immutable, everything else `no-cache`, text-only compression, byte ranges
for the songs) to the service `web` with the secret `RAILWAY_TOKEN`, a
project token. The service has no repo connected. The songs and hook
videos are not in that upload: they live in the R2 bucket
`fire-and-water-media` at https://media.dgfisher.com, versioned by content
hash in `src/data/media.json` (`pnpm media:sync` uploads what changed;
`mediaUrl()` in `src/lib/media.ts` adds `?v=` when `VITE_MEDIA_BASE` is
set, else serves `public/`). CI checks the manifest, and on `main` with the
`MEDIA_BASE` variable verifies every file answers there, then drops the
media from `dist/`. A new or replaced song needs `pnpm media:sync` before
merge. The README has the one-time setup. Installing `@dust-ui/*`
needs the repo secret `DUST_UI_READ_TOKEN` (classic PAT, `read:packages`):
the packages belong to the `dust-ui` org and this repo does not, so the
workflow token cannot be granted access to them.

## Docs

Specs, analysis and plans live in `claude/`. The README explains the
features; keep code comments short.
