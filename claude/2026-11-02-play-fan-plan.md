# Play Fan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hold or swipe up on the nav's center play button and a fan of
shuffle, back, next and repeat springs out over it, in one of three looks
(Orbit, Dial, Deck) picked in Settings.

**Architecture:** The core is pure and tested:

- geometry (polar points, band and arc paths, the dial's angle to
  fraction);
- the gesture state machine (`reduceFan`: events in, state and effects out).

A DOM hook feeds the reducer from document-level pointer events on the
kit's `button[data-slot="nav-bottom-center"]` and runs its effects. An app
wrapper (`PlayFan`) wires the player, the prefs and the router, and portals
a scrim plus the chosen look into the shell root. The looks are plain
presentational components on `FanViewProps`.

**Tech Stack:** React 19, TypeScript strict, Tailwind v4 (tokens only),
zustand, TanStack Router, `motion` (already mounted under `MotionProvider`),
lucide-react, vitest (Node, `src/**/*.test.ts`), Playwright through Windows
Chrome for visuals.

**Spec:** `claude/2026-11-02-play-fan-design.md` (prototype:
`claude/2026-11-02-play-fan-prototype.html`)

## Global Constraints

- Hold threshold 260 ms; swipe-up threshold 14 px; haptic
  `navigator.vibrate(8)` where supported.
- A tap toggles `toggle(target)` exactly as today; a hold never toggles.
- Target = `openTrack ?? loaded ?? focus` (today's `useShellNav` rule).
- Colours from tokens only (`--track-bright`, `--track-deep`,
  `--media-glow`, `--card`, `--foreground`, `text-primary`...): no hex,
  palette utilities or pixel radii in classes.
- No `asChild`; state styling via `data-*` attributes; no fork of
  `NavBottom`; no second center button.
- No mask, filter or opacity below 1 on any ancestor of a glass surface.
  The Dial's band is shaped by `mask-image` on the glass element itself
  plus `clip-path` for the hit area.
- Reduced motion: end state, no springs, sweep or stagger, never left at
  opacity 0.
- Player selectors return stable primitives; `currentTime` is read only
  while the fan is open.
- Comments short; eslint (0 warnings) and prettier on every edited file;
  `pnpm build` is the gate.

## Review Focus

1. A hold that opens the fan, then lets go: the kit's `onClick` fires on
   pointer up and must not toggle playback (Task 5 Playwright: play state
   unchanged after hold-release).
2. A pointer cancel mid-gesture (iOS edge swipe, scroll takeover) must not
   toggle playback or fire a control (Task 3 tests `cancel*`).
3. A first visit with nothing loaded (target = the stage's `focus`): Next
   plays `adjacentTrack(focus, 1)`, and the fan shows that song at 0:00
   (Task 5 Playwright, fresh context).
4. A landscape phone (844x390, the `short:` layout): no part of the open
   fan runs off-screen (Task 8 Playwright bounding boxes).
5. Interrupting the opening (tap outside mid-spring, or a hold then a
   quick release): the fan settles cleanly open or closed, with no stuck
   hot state or half-swept Dial (Task 3 `close*` tests; Task 5 Playwright
   tap-outside 100 ms after open).

---

### Task 1: Shared play-mode toggle

**Files:**

- Create: `src/lib/play-mode.ts`
- Modify: `src/components/now-playing.tsx` (move `TOGGLES` out, use
  `togglePlayMode`)
- Test: `src/lib/play-mode.test.ts`

**Interfaces:**

- Produces:
  - `PLAY_MODE_TOGGLES: Record<'shuffle' | 'repeat', { icon: LucideIcon; label: string; on: string; off: string }>`,
    moved verbatim from `now-playing.tsx` (Shuffle / Repeat1 icons; copy
    "Shuffle on", "Shuffle off", "Repeating this song", "Repeat off").
  - `togglePlayMode(current: PlayMode, mode: 'shuffle' | 'repeat'): { mode: PlayMode; message: string }`.
    It is pure, imports only `type PlayMode`, and uses the card's copy
    instead of the doc's example copy.

- [ ] **Step 1: Write the failing tests** `togglePlayMode`:
  - `('album', 'shuffle')` gives `{ mode: 'shuffle', message: 'Shuffle on' }`.
  - `('shuffle', 'shuffle')` gives `{ mode: 'album', message: 'Shuffle off' }`.
  - `('repeat', 'shuffle')` gives `{ mode: 'shuffle', message: 'Shuffle on' }`.
  - `('shuffle', 'repeat')` gives `{ mode: 'repeat', message: 'Repeating this song' }`.
  - `('repeat', 'repeat')` gives `{ mode: 'album', message: 'Repeat off' }`.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/play-mode.test.ts`.
      Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `src/lib/play-mode.ts`. In `ModeToggle`, call
      `const r = togglePlayMode(playMode, mode); setPlayMode(r.mode); toaster.push(r.message)`.
- [ ] **Step 4: Run** the test, then `pnpm lint` and `pnpm typecheck`.
      Expected: PASS, no warnings.
- [ ] **Step 5: Commit** `refactor: share the shuffle and repeat toggle`.

### Task 2: Fan geometry

**Files:**

- Create: `src/components/play-fan/geometry.ts`
- Test: `src/components/play-fan/geometry.test.ts`

**Interfaces:**

- Produces:
  - `type Point = { x: number; y: number }`
  - `polar(c: Point, r: number, deg: number): Point`. Screen coordinates
    (y down); 0° is 3 o'clock, 90° is straight up.
  - `arcPath(c: Point, r: number, from: number, to: number): string`, an
    SVG `M … A r r 0 0 1 …`, from > to, clockwise over the top.
  - `bandPath(c: Point, outer: number, inner: number, from: number, to: number): string`:
    the outer arc (sweep 1), a round cap at `to`, the inner arc back
    (sweep 0), a round cap at `from`, then `Z`. Caps have radius
    `(outer - inner) / 2` and sweep 1. Numbers are rounded to 0.1.
  - `DIAL = { outer: 152, inner: 94, mid: 123, rim: 143, from: 172, to: 8, zone: { min: 124, max: 166, from: 178, to: 2 }, controls: { shuffle: 154, back: 122, next: 58, repeat: 26 } } as const`
  - `ORBIT = { radius: 112, size: 52, angles: { shuffle: 155, back: 120, next: 60, repeat: 25 }, arc: { from: 160, to: 20 }, pillTop: 174 } as const`
  - `DECK = { w: 58, h: 80, pivotBelow: 120, rotations: { shuffle: -32, back: -16, cover: 0, next: 16, repeat: 32 } } as const`
  - `dialFraction(deg: number): number`: `(172 - deg) / 164`, clamped to
    0..1.
  - `dialHit(c: Point, p: Point): { inZone: boolean; fraction: number }`:
    `inZone` when the radius is in 124..166 and the angle in 2..178.

- [ ] **Step 1: Write the failing tests:**
  - `polar({x:0,y:0},100,90)` ≈ `{x:0,y:-100}`.
  - `polar(c,100,0)` ≈ `{x:100,y:0}`.
  - `dialFraction(172)=0`, `dialFraction(8)=1`, `dialFraction(90)=0.5`,
    `dialFraction(180)=0`, `dialFraction(0)=1`.
  - `dialHit(c, polar(c,143,90))` gives
    `{ inZone: true, fraction: 0.5 }`.
  - `dialHit(c, polar(c,110,90)).inZone` is false, and so are radius 170
    and angle 179.
  - `bandPath(c,152,94,172,8)` starts with
    `M${polar(c,152,172)…}`, contains `A152 152 0 0 1` and
    `A94 94 0 0 0`, and ends in `Z`.
  - `arcPath(c,143,172,90)` matches `/^M[\d.-]+ [\d.-]+ A143 143 0 0 1 /`.
- [ ] **Step 2: Run** `pnpm vitest run src/components/play-fan/geometry.test.ts`.
      Expected: FAIL.
- [ ] **Step 3: Implement** `geometry.ts`.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat(play-fan): geometry for the three looks`.

### Task 3: Gesture state machine

**Files:**

- Create: `src/components/play-fan/gesture.ts`
- Test: `src/components/play-fan/gesture.test.ts`

**Interfaces:**

- Produces:
  - `HOLD_MS = 260`, `SWIPE_PX = 14`
  - `type FanState = { open: boolean; press: { startY: number; held: boolean } | null; hot: string | null; scrubbing: boolean }`
  - `FAN_IDLE: FanState` (closed, no press).
  - `type FanEvent`:
    - `{ type: 'down'; y: number }`
    - `{ type: 'hold' }`
    - `{ type: 'move'; y: number; control: string | null; rim: boolean; fraction: number | null }`
    - `{ type: 'up' }`
    - `{ type: 'cancel' }`
    - `{ type: 'open' }`
    - `{ type: 'close' }`
  - `type FanEffect`:
    - `{ type: 'toggle' }`
    - `{ type: 'open' }`
    - `{ type: 'close' }`
    - `{ type: 'fire'; id: string }`
    - `{ type: 'seek'; fraction: number }`
    - `{ type: 'hot'; id: string }` (only when hot becomes a new non-null
      id, for the haptic tick)
  - `reduceFan(s: FanState, e: FanEvent): { state: FanState; effects: FanEffect[] }`

Rules (the tests pin them):

- `hold`, or a `move` more than 14 px above `startY` before held, marks the
  press `held` and opens if closed.
- While open with a press, a `move`:
  - scrubbing with a fraction: seeks;
  - otherwise `rim` with a fraction: starts scrubbing, clears hot, seeks;
  - otherwise: sets `hot = control`.
- `up`:
  - hot: fire it, then close;
  - scrubbing: end the scrub and stay open;
  - not held: toggle (even while open);
  - then clear the press and hot.
- `cancel`: clears the press, hot and the scrub, with no effects.
- `open` and `close` are external and idempotent.

- [ ] **Step 1: Write the failing tests:**
  - `tap toggles and never opens`: down y100, up gives `[toggle]`, closed.
  - `hold opens without toggling`: down, hold gives `[open]`; up gives
    `[]`, still open, press null.
  - `swipe up 15px opens`: down y100, move y85 gives `[open]`. A move to
    y87 gives `[]`.
  - `slide onto a control lights it; release fires and folds`: after the
    hold, move control 'next' gives `[hot next]`; up gives
    `[fire next, close]`, closed.
  - `release on nothing stays open`.
  - `tap while open toggles and stays open`.
  - `rim scrub keeps scrubbing over a control`:
    - open, move rim .3 gives `[seek .3]`;
    - move control 'next', rim false, fraction .6 gives `[seek .6]`, hot
      null;
    - up gives `[]`, open, scrubbing false.
  - `cancel mid-press does nothing`: down, cancel gives `[]`, closed, and
    a later up gives `[]`.
  - `cancel while sliding keeps it open and clears hot`.
  - `close clears hot and the scrub`.
  - `close when closed emits nothing`.
- [ ] **Step 2: Run** `pnpm vitest run src/components/play-fan/gesture.test.ts`.
      Expected: FAIL.
- [ ] **Step 3: Implement** `reduceFan` as a pure switch on `e.type`.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat(play-fan): press, hold, slide and release as a pure state machine`.

### Task 4: Prefs and the Settings row

**Files:**

- Modify: `src/store/prefs.ts`, `src/screens/settings.tsx`

**Interfaces:**

- Produces (prefs):
  - `type PlayFanStyle = 'orbit' | 'dial' | 'deck'`
  - `playFan: PlayFanStyle` (default `'dial'`)
  - `setPlayFan(v)`
  - `fanHintSeen: boolean` (default false)
  - `setFanHintSeen()`
  - Both are added to `partialize`.

- [ ] **Step 1: Add the prefs.**
- [ ] **Step 2: Add the Settings group** after "Now Playing":
  - `MobileListGroup glass`, label `Play button`.
  - Footer: `Hold the play button, or swipe up from it, for shuffle, back, next and repeat. Slide onto one and let go.`
  - One `MobileListRow` labelled `Fan`, holding a `SegmentedControl`
    (Orbit, Dial, Deck; `height={44}`; a wrapper wide enough for three
    labels).
- [ ] **Step 3: Run** `pnpm lint && pnpm typecheck`. Expected: clean.
- [ ] **Step 4: Commit** `feat(settings): choose the play fan's look`.

### Task 5: The gesture hook, the wrapper and the Dial (end to end)

**Files:**

- Create:
  - `src/hooks/use-nav-target.ts`
  - `src/components/play-fan/types.ts`
  - `src/components/play-fan/use-fan-gesture.ts`
  - `src/components/play-fan/fan-dial.tsx`
  - `src/components/play-fan/play-fan.tsx`
  - `src/components/play-fan/index.ts`
- Modify: `src/components/phone-shell.tsx` (`useShellNav` uses
  `useNavTarget`; mount `<PlayFan />` beside `<PulseGlow />`)

**Interfaces:**

- Consumes:
  - Tasks 1 to 4.
  - `usePlayer` (`toggle`, `play`, `seek`, `requestTrack`, `setPlayMode`,
    `playMode`, `track`, `currentTime`, `duration`).
  - `adjacentTrack`, `TRACKS`.
  - `toaster`.
  - `useMobileShellRoot`, `useMiniPlayerVisible`.
- Produces:
  - `useNavTarget(): { target: TrackId; playing: boolean }`, moved out of
    `useShellNav` unchanged.
  - `types.ts`:
    - `FanActionId = 'shuffle' | 'back' | 'next' | 'repeat' | 'cover'`
    - `FanAction = { id: FanActionId; label: string; icon: LucideIcon; pressed?: boolean }`
    - `FanNow = { title: string; elapsed: number; duration: number; cover: string }`
    - `FanViewProps`:
      - `open: boolean`
      - `reduced: boolean`
      - `center: Point` (in the layer's px)
      - `actions: FanAction[]` (shuffle, back, next, repeat)
      - `hot: string | null`
      - `scrubbing: boolean`
      - `now: FanNow`
      - `onAction(id: FanActionId): void`
      - `onSeek(fraction: number): void`
    - Every control element carries `data-fan-control={id}`, which is how
      the hook hit-tests.
  - `useFanGesture(opts): { open; hot; scrubbing; openFan(): void; closeFan(): void }`
    - `opts`:
      - `rimHit?(clientX: number, clientY: number): { inZone: boolean; fraction: number } | null`
      - `onToggle()`
      - `onFire(id: string)`
      - `onSeek(fraction: number)`
      - `onOpenChange?(open: boolean)`
    - Pointer listeners are on `document` (capture). They match
      `closest('[data-slot="nav-bottom-center"]')`, `setPointerCapture`,
      run a `HOLD_MS` timer, and map each move with
      `elementFromPoint(...).closest('[data-fan-control]')` plus
      `rimHit`.
    - After a held press it swallows the next `click` on the button
      (capture, `stopPropagation` + `preventDefault`).
    - It sets `aria-haspopup="true"`, `aria-expanded` and
      `aria-description="Hold for more controls"` on the button.
    - It runs `vibrate(8)` on `open` and `hot` effects.
  - `FanDial(props: FanViewProps)`: the spec's Dial. The sweep's
    half-angle animates with `motion`'s `animate()` (ease-out-back, about
    540 ms open, about 200 ms close; snaps under `reduced`). The band
    `div` gets the glass recipe, with `mask-image` and `clip-path` built
    from `bandPath`. An SVG draws the outline, the track, the progress
    (`arcPath` at radius 143, stroke the track gradient) and the thumb.
    A pointerdown on the band's rim in sticky mode scrubs through
    `dialHit`.
  - `PlayFan(): JSX.Element | null`:
    - It portals into `useMobileShellRoot()` a layer holding the scrim, the
      chosen look (Task 6 and 7 add the other two) and the hint dots.
    - C comes from the button's rect minus the root's rect, re-measured on
      open and on resize.
    - Fire mapping:
      - shuffle and repeat: `togglePlayMode` plus a toast;
      - back and next: `requestTrack(adjacentTrack(target, ∓1))`;
      - cover: navigate to `/lyrics/$track`, then close.
    - `onSeek`: if the target is not loaded, `play(target)` first, then
      `seek(fraction * duration)`.
    - It closes on a route-id change, read from
      `useRouterState({ select: s => s.matches.at(-1)?.routeId })`. A
      `/lyrics/$track` param change is the same route id, so the fan
      stays open.
    - It closes on Escape and on a scrim tap.
    - It sets `fanHintSeen` on the first open.
    - The hint shows when `!fanHintSeen && !miniVisible && !open`.
    - While open it sets `data-fan-open` on the shell root. CSS under
      that attribute dims the tabs and the mini player, so the scrim
      never becomes their ancestor.

- [ ] **Step 1: Extract `useNavTarget`.** `useShellNav` must behave
      identically (`pnpm typecheck`).
- [ ] **Step 2: Write `types.ts`, `use-fan-gesture.ts` and
      `fan-dial.tsx`**, then `play-fan.tsx` rendering only the Dial for now.
      Mount it in the shell.
- [ ] **Step 3: Run** `pnpm lint && pnpm typecheck && pnpm test`.
      Expected: clean, all pass.
- [ ] **Step 4: Playwright** `fw-pw/fan-app.cjs <base> dial`, at iPhone 14
      and at 1440x900 framed. Expected PASS lines:
  - **tap:** a tap toggles Play to Pause;
  - **hold:** a hold-release leaves the state unchanged and the fan open;
  - **slide to Next:** hold, slide to Next and release changes the song,
    folds the fan, and on `/lyrics/fire` moves the URL to the next song;
  - **scrub:** a rim scrub moves the time;
  - **frost:** the band's computed `backdrop-filter` is `blur(...)` and no
    rectangle shows (screenshot);
  - **interruptions:** a fresh context with nothing loaded plays
    `adjacentTrack(focus)` on Next; a tap outside 100 ms after opening
    folds it with no hot state;
  - **errors:** no page errors.
- [ ] **Step 5: Commit** `feat(play-fan): hold the play button for a dial of controls`.

### Task 6: Orbit

**Files:**

- Create: `src/components/play-fan/fan-orbit.tsx`
- Modify: `play-fan.tsx` (variant switch)

**Interfaces:**

- Consumes: `FanViewProps`, `ORBIT`, `polar`, `arcPath`.
- Produces: `FanOrbit(props: FanViewProps)`, per the spec.
  - **Orbs:** 52 px glass orbs at `ORBIT.angles` on radius 112, with
    labels underneath.
  - **Arc:** a hairline arc from 160° to 20° that draws in.
  - **Pill:** an apex pill 174 px above C, with the title, `elapsed /
duration` and a 2 px bar.
  - **Motion:** CSS transitions with `--d` delays (inner 0, outer 60 ms,
    pill 100 ms) on `cubic-bezier(.34,1.56,.64,1)` over 500 ms, and
    `motion-reduce:` end states.
  - **Hot / pressed:** hot gets the track gradient and a `--media-glow`
    glow; pressed gets `text-primary`.

- [ ] **Step 1: Implement** and add it to the switch.
- [ ] **Step 2: Run** `pnpm lint && pnpm typecheck`, then
      `fw-pw/fan-app.cjs <base> orbit` (after setting the pref through
      Settings). Expected:
  - the slide to Next passes;
  - all four orbs and the pill sit inside the screen;
  - no page errors.
- [ ] **Step 3: Commit** `feat(play-fan): the orbit look`.

### Task 7: Deck

**Files:**

- Create: `src/components/play-fan/fan-deck.tsx`
- Modify: `play-fan.tsx`

**Interfaces:**

- Consumes: `FanViewProps`, `DECK`.
- Produces: `FanDeck(props: FanViewProps)`, per the spec.
  - **Cards:** five 58x80 glass cards, `transform-origin` at the pivot
    120 px below C, rotations from `DECK.rotations`, the middle one on top.
  - **Cover card:** `TRACKS[target].cover`-style art (the same source
    `MiniPlayer` uses), elapsed time and a 2 px bar. It fires `cover`.
  - **Motion:** from the stack `rotate(0) translateY(84px) scale(.45)` on
    `cubic-bezier(.3,1.45,.5,1)` over 580 ms, delays 0/45/90 ms.
  - **Hot:** lifts 12 px along the card's axis and scales to 1.06.

- [ ] **Step 1: Implement** and add it to the switch.
- [ ] **Step 2: Run** `pnpm lint && pnpm typecheck` and
      `fw-pw/fan-app.cjs <base> deck`. Expected:
  - the slide to Next passes;
  - the cover tap navigates to `/lyrics/<target>` and folds;
  - all cards sit inside the screen;
  - no page errors.
- [ ] **Step 3: Commit** `feat(play-fan): the deck look`.

### Task 8: Keyboard, reduced motion, the short layout, docs

**Files:**

- Modify: `use-fan-gesture.ts`, `play-fan.tsx`, the three looks,
  `README.md`, `CLAUDE.md`

**Interfaces:**

- Consumes: everything above.
- Produces:
  - **Keyboard:**
    - ArrowUp on the focused button opens the fan and focuses the first
      `[data-fan-control]`.
    - ArrowLeft and ArrowRight move between the controls, which form
      `role="toolbar"` with `aria-label="Playback controls"`.
    - Shuffle and Repeat carry `aria-pressed`.
    - The Dial's rim is `role="slider"`: `aria-valuemin` 0,
      `aria-valuemax` the duration, `aria-valuenow` the elapsed time, and
      ArrowLeft/ArrowRight seek ±5 s.
    - Escape closes and refocuses the button.
  - **Context menu:** a right-click on the button opens the fan.
  - **Short layout:** under `max-height: 560px` the layer scales about C
    so the open fan fits the space above the nav (scale =
    min(1, available height / fan height)).
  - **README:** a "Play fan" section.
  - **CLAUDE.md:**
    - the components paragraph names `play-fan/`;
    - the "still app-level" list records the kit gaps: `NavBottomCenter`
      has no pointer or hold props and no aria pass-through, and the kit
      has no fan or speed-dial-on-arc component.

- [ ] **Step 1: Implement** the keyboard, context menu and short layout.
- [ ] **Step 2: Playwright**, `fw-pw/fan-app.cjs <base> all`:
  - **keyboard:** ArrowUp opens, ArrowRight then Enter fires Next,
    Escape closes;
  - **reduced motion:** `reducedMotion: 'reduce'` opens straight to the
    end state, with the opacity of every control at 1 within 50 ms;
  - **landscape:** at 844x390 every control's box is inside the
    viewport;
  - **light mode:** a screenshot of each look;
  - **errors:** no page errors.
- [ ] **Step 3: Run** `pnpm lint && pnpm test && pnpm build`. Expected:
      green.
- [ ] **Step 4: Commit** `feat(play-fan): keyboard, reduced motion and landscape; docs`.
