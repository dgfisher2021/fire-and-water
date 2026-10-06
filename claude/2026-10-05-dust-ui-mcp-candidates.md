# Dust UI registry: candidates for Fire & Water, 2026-10-05

Main pulled to `ae00cf9` (PR #15, sing-along polish). The catalogue below
came through the dust-ui MCP (shadcn MCP over `components.json`): 315
items across 14 packages. The app installs `@dust-ui/ui` 0.13.0,
`@dust-ui/motion` 0.5.0 and `@dust-ui/tokens` 0.3.0, which are also the
latest published and the versions on dust-ui `main`, so everything named
here imports today with no version bump.

The app already uses 38 symbols from `@dust-ui/ui` and 6 from
`@dust-ui/motion` (page header, list group and rows, media player, media
row, playing bars, progress ring, list picker, timeline, toast stack, nav
bottom, device frame, progressive blur, sheet action, empty, button, loader
spinner, read-along text, appearance drawer and provider, the swipe, shell
inset, follow-scroll and scroll-focus hooks; motion provider, carousel,
tilt and marquee).

## 1. Already in the kit, still hand-rolled here

These are the highest-value moves: the kit shipped the app's own
compositions upstream (dust-ui `apps/mobile` is a demo that mirrors this
app), and the app still carries copies.

| Kit item                                          | App copy                                    | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ambient-image-backdrop` (`AmbientImageBackdrop`) | `src/components/ambient-image-backdrop.tsx` | **Adopt.** Props are identical (`images`, `activeId`, `drift`, `className`), doc comment identical. Delete the copy, import from `@dust-ui/ui`. CLAUDE.md's "no forks remain" is not true until this goes.                                                                                                                                                                                                                                                                                                                                |
| `mobile-now-playing-bar` (`MobileNowPlayingBar`)  | `src/components/mini-player.tsx`            | **Decide.** CLAUDE.md says `MiniPlayer` "adds a progress ring and a marquee over `MobileNowPlayingBar`", but it has never imported the kit bar (`git log -S` finds nothing); it is a hand-built strip. The kit bar takes `artwork`, `title` (ReactNode, so the marquee fits), `subtitle`, `progress`, `playing`, `loading`, `onToggle`, `onOpen`. It draws a progress hairline and has no slot around the toggle, so adopting it drops the ring-around-play. Either adopt and accept the hairline, or keep `MiniPlayer` and fix the note. |
| `mobile-lyrics-reader` (`MobileLyricsReader`)     | `src/components/lyrics-reader.tsx`          | **Keep app-level, upstream the delta.** The kit's `LyricsTiming` is stanza + line only; the app's adds `words` and lights them with `ReadAlongText`, and takes `lang`. Same props otherwise (`stanzas`, `contentKey`, `time`, `timing`, `onSeekLine`, `size`, `children`, `ref`). The word-level highlight and `lang` are a spec for dust-ui, after which the app copy can go.                                                                                                                                                            |
| `mobile-lyrics-split` (`MobileLyricsSplit`)       | `src/components/lyrics-split.tsx`           | **Same story.** The kit column has `tag`, `voice`, `stanzas`, one `color`, `time`, `timing`, `onSeekLine`, `onPick`, `onPlay`, `playing`, plus an `emptyLabel` on the split. The app's adds `lang` and a `colorDark` for the tag on dark surfaces, and renders the word-level reader. Upstream those two and the copy can go.                                                                                                                                                                                                             |

## 2. New adds that fit the app

Ranked by how much they do for a listener, with the screen they land on.

1. **`mobile-search-bar`** (`MobileSearchBar`: `value`, `onChange`,
   `placeholder`, `trailing`). Thirty songs now, and neither the Album
   tracklist nor `SongPicker` can be filtered. Under the Album header and
   at the top of the picker sheet. Controlled, so the filter is a few
   lines over `TRACK_ORDER`.
2. **`qr-code`** (`QRCode`, in 0.13, `qrcode.react` ships with the kit).
   More → Share: a QR of `document.baseURI` in a card next to "Share the
   album", for showing the app to someone across a table. Theme-aware,
   inherits `currentColor`.
3. **`mobile-confirm-dialog`** (`MobileConfirmDialog`: `title`, `message`,
   `tone: 'destructive'`, `onConfirm`, `onCancel`). The time page's "Clear
   all marks" throws away a session of tapping with no confirm. In-frame,
   so it stays inside the `DeviceFrame`.
4. **`swipe-row`** (`SwipeRow`: `actions`, `actionWidth`). Wrap `TrackRow`:
   swipe left for Compare with…, Download, Share. Moves three actions off
   the Now Playing action sheet and onto the list where the song is.
5. **`surface`** (`Surface variant='glass'`). The mini player, the time
   page's bottom bar and the split column tags each hand-roll
   `bg-card/85 border border-border backdrop-blur-md`. One material from
   the `--glass` tokens instead of three recipes.
6. **`grain-overlay`** (`GrainOverlay opacity≈0.05`). Film grain over the
   artwork backdrop; it fits the "light paper" brand default and reads on
   dark navy too. Decorative, aria-hidden, no pointer.
7. **`pill`** (`Pill`). A "Transcribed" tag on lyric sheets that come from
   Whisper (`source: 'transcribed'`), and the format on Download rows,
   each tinted by the track token.
8. **Motion polish**, all small and each honours reduced motion:
   - `motion-text-morph`: the album stage title when swiping artworks
     (today a keyed remount with a fade).
   - `motion-group`: stagger the tracklist rows in place of the CSS
     `animate-fade-up` on the whole group.
   - `motion-number`: the "N of M lines marked" count on the time page.
   - `motion-text-shimmer`: "Lyrics on their way" and the buffering label.
   - `motion-scroll-progress`: a hairline under the Now Playing header
     while reading by scroll (no timing).
   - `motion-transition-panel`: animate between the four tab screens by
     index. Worth it only with a router-level outlet; try last.

## 3. Agent tooling items (install to `~/.claude`, not the repo)

- `skill`: the dust-ui skill (setup, token contract, appearance, Field
  forms, typeset, package selection, page composition, motion, restyling,
  generated component reference) → `~/.claude/skills/dust-ui/`.
- `skill-motion` → `~/.claude/skills/ui-ux-motion/` (already present on
  this machine as `ui-ux-motion`).
- `skill-mockup` → `~/.claude/skills/ui-ux-mockup/`.
- `rules` → `~/.claude/rules/dust-ui-tokens.md`; overlaps the "Dust UI
  rules" section of CLAUDE.md.

## 4. Considered and set aside

- `segmented-control`: tried as the Lyrics / Compare toggle and removed in
  the 2026-09-29 audit (thumb invisible on the card track, duplicated the
  nav). Not again without a reason.
- `pull-to-refresh`, `mobile-skeleton-block`, `loader-skeleton`: the data
  is local and static.
- `mobile-notification-banner`: `MobileToastStack` already covers it.
- `text-truncate`: the audit chose wrapping over truncation for titles.
- `theme-mode-toggle`: the appearance drawer owns mode; a second control
  would fight it.
- `icon-box`, `card-accent`: list rows already tint their icons; nothing
  needs a tinted card.
- `photo-fan`, `photo-ring`, `card-fan`, `motion-scroll-morph`,
  `gallery-carousel`: a different album browser, not an add to this one.
  Showcase material if the stage is ever redesigned.
- `gradient-bg`, `image-themed`, `fit-to-width`, `pager`, `dock`, the
  `hero-*` set: marketing-page pieces.
- Whole families that do not apply: `@dust-ui/charts` (40), `data` (9),
  `ai` (10), `blocks` (42, portal and marketing), `uploads`, `maps`,
  `gantt`, `network-graph`, `3d`, `test-data`; the chat, voice, calendar,
  app-grid, sign-in, FAB and week-bars mobile pieces.

## 5. Registry housekeeping

- **GitHub Pages is back** (`has_pages: true`, `r/registry.json` answers
  200). `components.json` still points at the local mirror. CLAUDE.md asks
  for the swap once Pages is up:

  ```diff
  -    "@dust-ui": "http://127.0.0.1:4180/r/{name}.json",
  -    "@dust-ui-source": "http://127.0.0.1:4180/r/source/{name}.json",
  +    "@dust-ui": "https://dgfisher2021.github.io/dust-ui/r/{name}.json",
  +    "@dust-ui-source": "https://dgfisher2021.github.io/dust-ui/r/source/{name}.json",
  ```

  The MCP server caches `components.json` at start, so the swap takes
  effect on the next session.

- A local mirror was started for this session on `127.0.0.1:4180`
  serving dust-ui's `.claude/worktrees/upstream-fixes-2026-10-05/apps/docs/public`.
  Its registry equals Pages except one extra item (`dust-ui-wordmark`,
  ahead of main). Kill it with `pkill -f 'http.server 4180'`.
- The `@dust-ui` door's `list`/`search` descriptions are boilerplate and
  `view`/`examples` return the one-line re-export. The real descriptions
  are the `description` prop of dust-ui's docs routes
  (`apps/docs/src/routes/docs/mobile/*.tsx`), and the props are in the
  installed `node_modules/@dust-ui/ui/dist/<name>.d.ts`.

## Appendix: the catalogue by package

- **@dust-ui/ui (161)**: accordion, agent-plan, alert, ambient-backdrop,
  ambient-image-backdrop, appearance-drawer, appearance-provider,
  aspect-ratio, avatar, avatar-button, avatar-group, badge, breadcrumb,
  built-ins, button, button-group, button-tooltip, calendar,
  calendar-events, card, card-accent, card-fan, card-hover, carousel,
  checkbox, code-block, code-viewer, collapsible, command, credit-card,
  cursor, device-frame, dialog, dialog-alert, dialog-responsive, drawer,
  drill-crumb, dropzone, dust-ui-wordmark, editable, empty, field,
  fit-to-width, form, gallery-image, gradient-bg, grain-overlay, icon-box,
  image-themed, input, input-auto, input-color, input-date,
  input-datetime, input-group, input-number, input-otp, input-password,
  input-phone, input-pin, input-tag, input-wheel, item, kbd, label,
  loader-browser, loader-dots, loader-overlay, loader-pulse-grid,
  loader-ripple, loader-skeleton, loader-spinner, markdown-components,
  markdown-viewer, menu-context, menu-dropdown, menu-navigation, menubar,
  mobile-app-grid, mobile-chat-bubble, mobile-confirm-dialog,
  mobile-extracted-field, mobile-floating-action-button,
  mobile-list-group, mobile-list-picker, mobile-lyrics-reader,
  mobile-lyrics-split, mobile-media-player, mobile-media-row,
  mobile-message-actions, mobile-message-composer, mobile-month-calendar,
  mobile-notification-banner, mobile-now-playing-bar, mobile-page-header,
  mobile-playing-bars, mobile-progress-ring, mobile-search-bar,
  mobile-sign-in, mobile-skeleton-block, mobile-timeline,
  mobile-toast-stack, mobile-voice-button, nav-bottom, orbiting-circles,
  pager, pagination, password-strength, period-stepper, photo-fan,
  photo-ring, pill, popover, progress, progressive-blur, provenance,
  pull-to-refresh, qr-code, radio-group, rating, read-along-text,
  resizable, scroll-area, section-header, segmented-control, select,
  select-combobox, select-dropdown, select-multi, select-native,
  separator, sheet, sheet-action, sheet-bottom, showcase-stage, sidebar,
  slider, status-bar, status-indicator, steps, surface, swipe-row, switch,
  table, table-compare, tabs, terminal, terminal-block-view,
  terminal-prompt-line, text-gradient, text-truncate, textarea,
  theme-mode-dropdown, theme-mode-toggle, toast, toast-stack, toggle,
  toggle-group, tooltip, totals-row, tree.
- **@dust-ui/motion (32)**: dock, gallery-tabbed, hero-carousel,
  hero-device-reveal, hero-logo-mask, hero-video, motion-accordion,
  motion-background, motion-beam, motion-border-trail, motion-carousel,
  motion-dialog, motion-dialog-morph, motion-disclosure,
  motion-floating-paths, motion-glow, motion-group, motion-in-view,
  motion-marquee, motion-number, motion-number-slide,
  motion-popover-morph, motion-scroll-morph, motion-scroll-progress,
  motion-spotlight, motion-text, motion-text-loop, motion-text-morph,
  motion-text-shimmer, motion-tilt, motion-transition-panel, parallax-cta.
- **@dust-ui/blocks (42)**: aging-chip, app-switcher, artifacts-panel,
  back-to-top, card-article, card-grid, card-image-link, card-profile,
  card-property, card-sign-in, card-testimonial, citation-sources,
  codebase, collaborative-canvas, command-search-trigger, contact-section,
  cta-band, dialog-confirm, dialog-sign-out, error-page, filter-bar,
  filter-faceted, gallery-carousel, gallery-folder, hero-page,
  input-speech, listing-filter-bar, menu-profile, mobile-chat-playback,
  mortgage-calculator, nav-header, popover-notifications, rating-summary,
  roadmap, section, section-split, sidebar-nav-group, site-footer,
  site-header, stats-band, tool-confirmation, verify-flag.
- **Others**: charts (40), ai (10), data (9), uploads (5), 3d (2), maps,
  gantt, network-graph, test-data, tokens (1 each); five `theme-*` presets;
  agent items `rules`, `skill`, `skill-motion`, `skill-mockup`; `init`.
