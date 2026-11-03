# Play fan: design

2026-11-02. Status: description approved by Dustin in chat ("yeah go ahead");
the three looks chosen from live prototypes ("all 3 are perfection ... can
you make them all variants?").

## Intent

The nav's center play button opens a fan of playback controls that springs
out over its top, the way the kit's `PhotoFan` spreads cards. Dustin's words:
"a perfect example of an intuitive floating action button but a playbar that
looks professional and futuristic". It is built in this app first and moves
to Dust UI later, so the gesture and layout core should not know about this
app's player.

Three looks ship, all kept as variants of one component, picked in Settings:

- **Orbit**: glass orbs spring out along an arc; title, time and progress on
  a glass pill at the top.
- **Dial**: a glass half-ring unfolds over the button; the controls sit in
  it and the song's progress runs along its rim, which scrubs. The fan is
  the playbar.
- **Deck**: the PhotoFan move; five glass cards fan out like a hand, the
  song's cover in the middle.

The reference is the live prototype `claude/2026-11-02-play-fan-prototype.html`
(written for the brainstorm companion: it expects the companion's frame CSS
and a cover at `/files/fire.jpg`; its geometry and timings are the spec
below).

## Goals

- A tap still plays or pauses, exactly as today. Nothing a listener already
  knows changes meaning.
- One continuous gesture reaches any control: press, slide, let go.
- It feels native: springs, a light haptic tick, an instant response to the
  finger, interruptible open and close.
- The three looks share one behaviour core; only the drawing differs.
- The core is kit-shaped (variant, actions, progress) for a later move into
  `@dust-ui/ui`.

## Non-goals

- Replacing the Now Playing card's transport, the folded bar or the mini
  player. They stay.
- Queue, volume, AirPlay or other controls beyond the four below.
- Changing `NavBottom` in dust-ui now (record the gaps as upstream asks).

## Anti-goals (a failure even if it works)

- A tap that no longer plays or pauses, or a hold that also toggles playback.
- A fan that leaves content at `opacity: 0` under reduced motion.
- Glass that does not frost: a mask, opacity below 1 or filter on any
  ancestor of a glass surface (CLAUDE.md "Glass").
- The hold fighting page scroll, the Lyrics screen's swipe, iOS's long-press
  callout or text selection.
- A fork of `NavBottom` or a second center button drawn over the kit's.
- Hex or raw palette colours (house rules: semantic tokens only).

## Behaviour (decided)

**Target.** The fan acts on the same song as the center button:
`openTrack ?? loaded ?? focus` (`useShellNav` in `phone-shell.tsx`). On Now
Playing that is the song on screen.

**Gesture on the center button:**

| Input                                           | Result                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| Tap (released before 260 ms, moved under 14 px) | `toggle(target)`, unchanged                                             |
| Hold 260 ms, or move up more than 14 px         | Fan opens, haptic `navigator.vibrate(8)` where supported                |
| While still pressed, finger over a control      | That control lights ("hot"), a haptic tick when the hot control changes |
| While still pressed, Dial: finger on the rim    | Scrubs (seeks)                                                          |
| Release on a control                            | It fires; the fan folds                                                 |
| Release on nothing, or after a scrub            | The fan stays open ("sticky")                                           |

**While open (sticky):** tapping a control fires it and keeps the fan open
(Next can be tapped repeatedly); tapping the center button plays or pauses
and keeps it open; tapping outside, Escape, or moving to another screen
folds it. "Another screen" means a different route (Songs, Albums, Lyrics,
More, Settings...). The Lyrics screen following the player to
`/lyrics/<next>` is the same screen and keeps the fan open (my call).

**Dial hit order:** a press that starts inside a control's 44 px circle is
that control. A scrub starts only on the rim outside the controls, and once
started it stays a scrub until release, even over a control (my call).

**Controls:**

- Shuffle: `playMode` `'shuffle'` and back to `'album'`. Repeat: `'repeat'`
  and back to `'album'`. They are one mode in the store, so turning one on
  turns the other off, exactly like the card's toggles. Shown "on" in the
  track colour.
- Back / Next: `requestTrack(adjacentTrack(target, -1 | 1))`, as the lock
  screen does, so an open Lyrics screen follows. They always play, even from
  pause, because they are transport controls (my call). The card's skip
  instead moves a paused Now Playing screen without playing. Matching that
  would need a load-without-play store action; this design does not add
  one. Back is the previous song, not a restart (matches the card and the
  lock screen).
- Feedback: changing Shuffle or Repeat pushes a short toast through
  `toaster` ("Shuffle on", "Repeat this song", "Album order"), since the
  mode shows nowhere else on most screens and a slide-and-release folds the
  fan at once. Back and Next push no toast: the new song shows in the mini
  player or on screen, and repeated Next would pile them up (my call).
- Deck's cover card: navigates to `/lyrics/$target` and folds.
- Dial's rim: seeks. If the target is not the loaded song, it plays the
  target from that point (the precedent is tapping a lyric line on a song
  that is not playing).

**What the fan shows:** the target's title, elapsed and length. If the target
is not the loaded song it shows 0:00.

## The three looks (decided, from the prototype)

Geometry is relative to the center of the center button (C), in px, for the
393 px phone. Angles run counter-clockwise from 3 o'clock, so 90° is straight
up.

**Orbit.** Four 52 px glass orbs on an arc of radius 112 at 155°, 120°, 60°,
25° (shuffle, back, next, repeat), each with a 9.5 px uppercase tracked label
under it. A hairline arc (radius 112, 160° to 20°) draws in behind them. A
glass info pill sits at the apex, its top 174 px above C: the title in the
display face, "1:42 / 4:53" in tabular figures, and a 2 px progress bar along
its bottom. Orbs fly out from C (scale 0.25 to 1) on an overshooting curve
(`cubic-bezier(.34, 1.56, .64, 1)`, 500 ms): the inner pair first, the outer
pair 60 ms later, the pill 100 ms later.

**Dial.** A glass half-ring: outer radius 152, inner 94, round caps,
spanning 172° to 8°. Its progress runs along radius 143: a 3 px line in the
track gradient with a glow, over a faint full-length track, with a white
thumb. Controls sit in the band at radius 123: shuffle 154°, back 122°,
next 58°, repeat 26°. Elapsed (16 px) over remaining (10 px) sit at the apex
inside the band; the title in the display face floats just above the band.
Opening: the band sweeps out from the apex in both directions (half-angle 0
to 82° on an ease-out-back, about 540 ms) while the whole dial scales from
0.62 about C; each control pops in as the sweep passes it; the title and
time fade in last. Closing reverses in about 200 ms. Scrub zone: radius 124
to 166, angle 2° to 178°, mapped linearly from 172° (0:00) to 8° (the end).
The thumb grows while scrubbing.

**Deck.** Five 58 x 80 glass cards (radius 16) pivoting about a point 120 px
below C, rotated −32°, −16°, 0°, 16°, 32°, the middle one on top. Order:
shuffle, back, cover, next, repeat. Side cards show an icon and an 8.5 px
uppercase label; the cover card shows the song's art with the elapsed time
and a 2 px progress bar over a dark fade. They fan out from a stack hidden
under C (rotate 0, down 84 px, scale 0.45) on `cubic-bezier(.3, 1.45, .5, 1)`
(580 ms): middle first, ±16° 45 ms later, ±32° 90 ms later. A hot card lifts
12 px along its own axis and scales to 1.06.

**Shared:**

- A scrim dims the screen while the fan is open (dark, heaviest at the
  bottom). The center button stays bright, live and above it, with a soft
  ring. The tabs and the mini player dim with the screen. How to layer
  that with the kit's nav (z 30) and the shell overlay (mini player, z 40)
  is the builder's call.
- Hot state: the control fills with the track gradient (`--track-bright` to
  `--track-deep`) and glows in `--media-glow`.
- Glass: the app's recipe (`bg-card/85 backdrop-blur-md`, or the kit's
  `glass`), with a light top edge.
- A hint while closed: three small dots on an arc just above the button,
  shown until the fan has been opened once (a persisted `fanHintSeen` in
  prefs), and hidden while the mini player shows, because it would sit on
  the mini player (my call). The Settings footer teaches the gesture for
  good.
- Colours only from tokens: the prototype's hex values stand for
  `--track-bright`, `--track-deep`, `--media-glow`, `--card` and
  `--foreground`. Light mode has to read too.
- The Dial band's shape is a `mask-image` on the glass element itself. In
  the prototype a `clip-path: path()` alone frosted the band's whole bounding
  box in Chrome. Keep `clip-path` as well, because it shapes the hit area
  and masks do not.

## Settings (decided)

`playFan: 'orbit' | 'dial' | 'deck'` in `store/prefs.ts`, persisted
(`partialize`, alongside `fanHintSeen`), default `'dial'` (my call: it is
the "playbar" one). Settings
gets a "Play fan" row with a three-way `SegmentedControl` (Orbit, Dial,
Deck) in the Now Playing group, with a footer that teaches the gesture
("Hold the play button, or swipe up from it, for shuffle, back, next and
repeat").

## Accessibility and motion (decided)

- The center button keeps its Play/Pause name. It also gets
  `aria-haspopup` and `aria-expanded`. The kit's `NavBottomCenter` cannot
  pass these, so set them on the button element (upstream ask), along with
  a description that it holds more controls.
- Keyboard: ArrowUp on the focused center button opens the fan and focuses
  the first control. Arrow keys move along the fan, Enter or Space fires,
  and Escape closes and returns focus to the button. The fan is a
  `role="toolbar"` labelled "Playback controls". Shuffle and repeat use
  `aria-pressed`. The Dial's rim is a `role="slider"` (seconds; the arrows
  seek ±5 s).
- A right-click (`contextmenu`) on the button opens the fan too, which
  covers desktop and assistive tech that maps long-press to it.
- Reduced motion: no springs, sweep or stagger. The fan appears in its end
  state (a short fade is fine) and never sits at opacity 0.
- On the button: `touch-action: none`, `-webkit-touch-callout: none`,
  `user-select: none`, and the default context menu is prevented.

## Constraints from the code

- The kit's `NavBottom` renders the center as
  `button[data-slot="nav-bottom-center"]` and takes only `onClick`. Listen
  for pointer events high enough to see that button. In the desktop
  `DeviceFrame` the nav renders beside the shell root, not inside it, so
  listen on the document (or the frame's screen) and match the button.
  Swallow the `click` that follows a hold (the kit still calls `onClick` on
  pointer up).
- The fan renders in-frame, portalled into the shell root and positioned
  from the button's rect relative to that root. It must work in the
  `DeviceFrame` (desktop at 768 by 700 and above), on a fluid phone, and in
  the `short:` landscape layout (`max-height: 560px`), where it may need to
  shrink or hug the button. That last case is the builder's call; it must
  not run off-screen.
- Player selectors must return stable values. `currentTime` updates every
  frame, so only the parts that show time subscribe to it (the Dial's rim,
  the pill, the cover card), and only while the fan is open.
- `motion` and `@dust-ui/motion`'s `MotionProvider` are already mounted.
  Its reduced-motion default applies to `motion` components; CSS
  transitions need `motion-reduce:` handling of their own.

## Suggested structure (builder's call)

- `src/components/play-fan/`:
  - a gesture hook (press, hold, swipe, slide, release, sticky: the part
    that moves to Dust UI);
  - geometry helpers (polar points, the band path, angle to seconds);
  - one file per look;
  - the app wrapper that wires the player and the prefs;
  - a barrel.
- `phone-shell.tsx` mounts the fan inside the shell, next to `PulseGlow`
  (where `useMobileShellRoot` has the root).
- A kit-shaped API for the core: `variant`, the anchor element, `actions`
  (`id`, icon, label, `pressed`, `onSelect`) and a progress slot or values.
  Player knowledge stays in the app wrapper.
- README: a short "Play fan" section. CLAUDE.md: the component in the
  components paragraph and the kit gaps in the "still app-level" list.

## Verification

- Unit (vitest):
  - the geometry (band path, angle to seconds);
  - the gesture state machine: tap vs hold vs swipe; release on a control
    vs on nothing vs after a scrub;
  - the playMode toggles.
- Visual (Playwright through Windows Chrome, see the memory recipe):
  - each look open in the 393 px frame and on iPhone 14 emulation, dark and
    light;
  - hold, slide to Next and release changes the song, and Lyrics follows;
  - a Dial scrub seeks;
  - a tap still toggles, and a hold does not;
  - the reduced-motion end state;
  - glass frosts with no rectangle leak on the Dial;
  - the short landscape layout;
  - no page errors.
- `pnpm lint`, `pnpm test` and `pnpm build` green.

## Left to the builder

File split, animation mechanics (CSS transitions, `motion` or rAF) within
the timings above, exact light-mode values, the layering of the scrim with
the nav and the mini player, the `short:` adaptation, and lucide icon picks
(`Shuffle`, `SkipBack`, `SkipForward`, `Repeat`).
