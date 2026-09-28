# Fire & Water: HTML site to a phone app on the Dust UI mobile kit

> Status: BUILT 2026-09-28 on branch `feat/react-dust-ui` (PR #4). First
> pass (a drawer over the old home layout, no themes, almost no mobile
> kit) was rejected the same day; this is the second design, verified in
> Windows Chrome through Playwright at a real 390px iPhone viewport and
> in the 1440px desktop DeviceFrame shell.

## Goal

Rebuild the single-file HTML album site as a phone app on Dust UI,
deployed to the same GitHub Pages URL, keeping the art direction
(Cormorant Garamond + Outfit, deep navy, per-song accents, ambient
artwork) and every feature of the original, and showing off the mobile
kit and the appearance system.

## Screens

- **Album** `/`: `MobilePageHeader` (eyebrow, display title, subtitle,
  `AppearanceDrawer` trigger), the artwork stage (fade carousel + pointer
  tilt + glow in the song's voice, copy, Play / Read Lyrics), a
  `MobileListGroup` tracklist with cover thumbnails, durations and a
  "Playing" `Pill`. Swipe and arrow keys move the stage.
- **Now Playing** `/lyrics/$track`: header with voice, title,
  dedication, a `SegmentedControl` (Lyrics / Compare) and a "..." button
  opening a `SheetAction` (share, download, Google Drive); the
  `MobileMediaPlayer` card (artwork, scrubber, times, previous / play /
  next) pinned above the reading-focus `LyricsReader`. Swipe left/right
  switches songs and keeps playing; album play-through and lock-screen
  prev/next move the screen along.
- **Compare** `/compare`: `LyricsSplit` (synced columns with sticky tags)
  over a `MobileMediaPlayer variant='bar'`.
- **More** `/more`: `MobileListGroup` rows for appearance, downloads,
  Google Drive links, sharing, credits.
- **Shell**: `NavBottom` with a center action that plays and pauses in the
  song's gradient; `MobileToastStack` for feedback; on desktop the app
  sits in a `DeviceFrame` over a blurred copy of the artwork.

## Feature parity (all verified)

- [x] Artwork stage (3 slides, crossfade, per-track glow, dots, swipe,
      10s autoplay paused while playing, pointer tilt)
- [x] Ambient backdrop crossfade + drift + vignette, per track
- [x] Reading focus (centre stanza brightens), edge fade masks
- [x] Side by side (fire x water) with synced scroll and sticky tags
- [x] Play/pause with buffering ring + breathe glow, drag scrubber with
      thumb, tabular times, share, download
- [x] Swipe left/right switches song (keeps playing); previous / next
- [x] Album play-through; Media Session metadata + lock-screen controls
- [x] Keyboard: arrows switch songs / slides, Space toggles
- [x] Share: native sheet, clipboard fallback with "Link copied" toast
- [x] Print: lyrics as a clean sheet
- [x] PWA: installable, shell + artwork + fonts offline, audio network-only
- [x] Legacy `#fire` links redirect to `/lyrics/fire`
- [x] Theme-color and tab title follow the song / playback
- [x] Themes: light / dark / system, brand + clean-slate + cool-slate +
      dark-teal presets, neutrals, radius, density; the active song
      colors the accent on every theme

## Architecture

- Vite 8, React 19.2.5 (pinned), TS strict, TanStack Router (file routes
  are stubs; screens live in `src/screens/` so they code-split), Tailwind
  v4, zustand, vite-plugin-pwa, `@fontsource` fonts. Port 4600.
- `PhoneShell` (`src/components/phone-shell.tsx`): fluid on phones with a
  fixed nav; `DeviceFrame` from 768px up. `shell-context.ts` exposes the
  positioned root for in-frame overlays and `useFramed`.
- `Screen`: header (status-bar inset in the frame, safe-area on phones)
  plus an optional scroll pane that clears the nav.
- `usePlayer` (zustand): track, status, currentTime, duration,
  carouselIndex, `requested` (lock-screen / play-through hand-offs). One
  `<audio>` singleton bound by `useAudioEngine` (rAF playhead). `useToasts`
  feeds the in-frame stack.
- Theme: `AppearanceProvider` (`fire-and-water-appearance`, dark by
  default, radius 1rem). Brand default scoped `:root:not([data-theme])`
  with light and dark ladders; voices `--pencil/--fire/--water`; the
  song's accent on `:root[data-track]` (and `.dark`), which out-ranks
  every preset. Drawer hides the accent and font sections.

## Dust UI usage

Import door: `AppearanceProvider`, `AppearanceDrawer`, `DeviceFrame`,
`MobilePageHeader`, `MobileListGroup`, `MobileListRow`, `SheetAction`,
`MobileToastStack`, `SegmentedControl`, `Pill`, `Button`,
`LoaderSpinner`, `useIsMobile`, `MotionProvider`.

Source door, forked (deltas in `dust-ui/specs/20-...`):
`mobile-media-player` (`bar` variant, `loading`, breathe, `actions`,
CSS-variable restyling), `motion-carousel` (controlled `index`, `fade`,
`dotClassName` + `data-active`), `motion-tilt` (pointer events).

Source door, only because the published packages lag: `grain-overlay`
(unused now, kept for the spec), `nav-bottom` (href tabs). The `portal`
preset is skipped until `@dust-ui/tokens` ships it.

New here, to blocks rules: `AmbientImageBackdrop`, `LyricsReader` +
`useScrollFocus`, `LyricsSplit` + `useSyncedScroll`, `useSwipe`,
`share()`/`download()`, `useAudioEngine`, `useMediaSession`, `Screen`,
`PhoneShell`.

## Verification recipe

Headless Chromium cannot run in this WSL2 environment. Windows Chrome
can: static shots with `chrome.exe --headless=new --screenshot`, and
interactive runs by copying the Playwright package to a Windows folder
and running `node.exe shoot.cjs` with `chromium.launch({ channel:
'chrome' })` (scripts in the job's tmp dir). Desktop Chrome clamps windows
to about 500px, so phone layout is checked through Playwright's iPhone
emulation, not a 390px window.

## Follow-ups for Dustin

1. Add the repo secret `DUST_UI_READ_TOKEN` (classic PAT, read:packages)
   so the Pages build can install `@dust-ui/*`.
2. Re-enable GitHub Pages on `dgfisher2021/dust-ui`; then point
   `components.json` back at the public registry URLs.
3. Publish dust-ui so `nav-bottom`, `grain-overlay` and `portal.css`
   arrive by version bump, and review `dust-ui/specs/20-...` for the
   forks and new components.
