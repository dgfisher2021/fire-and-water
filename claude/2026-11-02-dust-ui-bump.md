# 2026-11-02: Dust UI to the latest publish

Branch `chore/dust-ui-latest`. Dustin: "update all the dust-ui deps".

| Package | Was | Now |
| --- | --- | --- |
| `@dust-ui/ui` | 0.18.0 | 0.31.0 |
| `@dust-ui/blocks` | 0.13.0 | 0.21.0 |
| `@dust-ui/motion` | 0.8.0 | 0.13.0 |
| `@dust-ui/tokens` | 0.5.0 | 0.11.0 |
| `@dust-ui/3d` | 0.3.0 (exact) | ^0.8.3 |

`lucide-react` went to ^1.66.0 and `zod` to ^4.6.7, the versions the kit
depends on, so the lockfile holds one copy of each. `@dust-ui/media` (new,
media-chrome players) is not needed: MediaPlayer and the rest stay in ui.

## What changed for the app

Nothing it imports was renamed or removed; typecheck passed untouched.

- `AppearanceProvider` (ui 0.25) stores only what differs from `defaults`,
  as `{ v: 4, ... }`, and its font defaults to `'theme'`, which removes
  `data-font` from `<html>`. Stored state from before is migrated once,
  dropping the old defaults (font `inter`, theme `cool-slate`, radius
  0.625). The `html[data-font]` override in `index.css` was dead and is
  gone; the pre-paint script in `index.html` still reads `themeMode` (absent
  means dark). Checked: a pre-upgrade `font: 'inter'` migrates to
  `{"v":4}`, html and body compute Outfit, the display face Cormorant.
- `MobileConfirmDialog` (ui 0.25) takes `container`, which replaces the
  hand-written `createPortal` on `/time`.
- `MobileListGroup` (ui 0.25) renders rows directly with inset-shadow
  hairlines: each row is 1px shorter. More, Settings, the song picker and the
  timeline differ by that and nothing else.
- `MistBackdrop` (3d 0.4) gained `speed`, `intensity`, `particles` (all 1 by
  default); `speed` 2 to 3 makes it drift on phones with no pointer. Not
  adopted.

## Kit regression: MotionTextMorph only fades

motion 0.12 put an `sr-only` copy of the text first inside
`MotionTextMorph`, but `wrapsLines()` still measures `el.firstElementChild`
(now that 1px span), so every title counts as wrapping and takes the plain
fade. The Songs stage title and the Now Playing title no longer morph
letter by letter (probe: 14 per-character spans on 0.18, plain text on
0.31). Still on dust-ui `origin/main`. The fix is one line in
`packages/motion/src/components/motion-text-morph.tsx`: measure the first
`[aria-hidden]` child (or skip the `sr-only` one).

## Kit gaps still open

None of the app-level reasons in CLAUDE.md were closed: the lyrics reader
and split are unchanged (mask fade, glow only, stanza follow),
`MediaPlayer` has no description or waveform slot, no progress ring on
`MediaNowPlayingBar`, `MobileListPicker` unchanged, `SwipeRow` still mounts
its strip behind the row (0.25 only insets it 1px).

## Verified

`pnpm build`, `pnpm lint` (0 warnings), `pnpm test` (628). Playwright
through Windows Chrome against this branch on 4600 and unchanged main on
4601 (`fw-pw/dep-behave.cjs`, `dep-shots.cjs`, `dep-morph.cjs`,
`dep-confirm.cjs`): the 13 behaviour checks pass on both (sort sheet, URL
sort, search, hotkeys, Space plays, scrubber, copy toast, download picker,
one WebGL scene per background including Nebula mist); 43 screenshots per
build, Compare and Time pixel-identical, the list screens off by the 1px
rows. The two nested-button console warnings predate the bump (`TrackRow`
passes `onClick` to `MediaRow` and a `Button` in `trailing`).
