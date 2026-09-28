# Fire & Water: HTML site to React mobile app on Dust UI

> Status: APPROVED 2026-09-28 (Dustin: "can you do it"). Built on branch
> `worktree-react-dust-ui`. This file is the spec and the plan in one.

## Goal

Convert the single-file HTML album site into a high-end React mobile app
on Dust UI, deployed to the same GitHub Pages URL, keeping the art
direction (Cormorant Garamond + Outfit, deep navy, per-track accents,
ambient artwork, frosted lyrics drawer) and every feature of the original.

## Feature parity checklist

- [ ] Home: artwork stage (3 slides, crossfade, per-track glow, dots,
      swipe, 10s autoplay, pointer tilt), track thumbnails, title /
      dedication / duration / description, Play, Read Lyrics, Download
- [ ] Ambient backdrop crossfade + slow drift + vignette, per track
- [ ] Lyrics drawer: grab handle, blur, swipe down to close, focus trap,
      Escape, back button closes, deep link `/lyrics/<track>`
- [ ] Reading focus (centre stanza brightens), edge fade masks
- [ ] Side by side (fire x water) with synced scroll and sticky tags
- [ ] Audio bar: play/pause with buffering ring + breathe glow, drag
      scrubber with thumb, tabular times, share, download
- [ ] Swipe left/right in the drawer switches track (keeps playing)
- [ ] Album play-through: a finished track advances while lyrics are open
- [ ] Media Session metadata + lock-screen controls
- [ ] Keyboard: arrows switch track / seek, Space toggles, Escape closes
- [ ] Share: native sheet, clipboard fallback with "Link copied" toast
- [ ] Print: lyrics as a clean sheet
- [ ] PWA: installable, shell + artwork + fonts offline, audio network-only
- [ ] Legacy `#fire` links redirect to `/lyrics/fire`
- [ ] Theme-color and tab title follow the track / playback

## Architecture

- Vite 8, React 19.2.5 (pinned, single instance), TS strict, TanStack
  Router (file routes, zod search validation), Tailwind v4, zustand,
  sonner, vite-plugin-pwa, `@fontsource` self-hosted fonts. Port 4600.
- Routes: `/` home; `/lyrics/$track` (track in `pencil|fire|water`);
  `?view=split` side by side. URL owns what is open, the store owns
  playback. Pages SPA fallback via `404.html` + `<base href>` + basepath.
- State: `usePlayer` (track, status, currentTime, duration, carouselIndex,
  endedCount). One `<audio>` singleton bound by `useAudioEngine` (rAF
  playhead while playing). `useMediaSession` mirrors it to the OS.
- Theme: static `.dark`; brand tokens scoped `:root:not([data-theme])`;
  voices as `--pencil/--fire/--water` (+ `-deep`, `-glow`); active track
  overrides `--primary` and `--track-*` on `html[data-track]` (so vaul
  and sonner portals inherit it).

## Dust UI usage

Import door (as shipped): Button, LoaderSpinner, Drawer (vaul),
SegmentedControl, ToastStack (sonner), GrainOverlay, MotionProvider.

Source door (vendored to `src/components/ui/`, modified; deltas recorded
in `dust-ui/specs/`):
- `mobile-media-player`: `variant='bar'`, `loading`, breathe when playing,
  `actions` slot, `onSeekEnd`, `className`, Tailwind classes.
- `motion-carousel`: controlled `index` + `onIndexChange`, `variant='fade'`.
- `motion-tilt`: pointer events (touch), not mouse only.

New here, to blocks rules, proposed for dust-ui in the same spec:
`AmbientImageBackdrop`, `LyricsReader` + `useScrollFocus`,
`useSyncedScroll`, `useSwipe`, `share()`.

Kept local on purpose (too small to abstract): `TrackTabs`, `PlayButton`.

## Repo changes

- `public/`: audio stays at the root path; `assets/` unchanged.
- Removed: hand-written `index.html` app, `sw.js`, `404.html`,
  `site.webmanifest` (PWA plugin generates them), `ci.yml` (deploy.yml
  lints, builds, deploys).
- Added: the Vite app, `CLAUDE.md`, `.mcp.json` + `components.json`
  (dust-ui MCP), this spec, README rewrite.

## Follow-ups for Dustin

1. Add the repo secret `DUST_UI_READ_TOKEN` (classic PAT, read:packages)
   so the Pages build can install `@dust-ui/*`.
2. Re-enable GitHub Pages on `dgfisher2021/dust-ui`; then point
   `components.json` back at the public registry URLs.
3. Review `dust-ui/specs/` for the component deltas to migrate upstream
   with the `migrate-component` skill.
