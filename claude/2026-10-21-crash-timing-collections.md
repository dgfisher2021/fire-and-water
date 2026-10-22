# 2026-10-21: the crash while playing, Emotional Telemetry's timing, and a pass over the collections

Branch `fix/crash-timing-collections`. Three asks from Dustin: "sometimes the
app crashes while playing a song", "Emotional Telemetry is off on the
timing", and "one more pass over the albums, really think about each song
and where they belong".

## The crash while playing

No crash reproduces on desktop Chrome or Playwright WebKit, where memory is
not capped; on iOS the WebContent process is killed for memory ("Can't open
this page"), so the hunt was for what grows or spikes per song over an album
play-through. A code audit of the playback path (subagent, read-only) plus
Chrome play-throughs on the live site and the fixed build, sampling heap,
DOM, listeners, img/video/canvas counts and canvas contexts after each
hand-off, with each background.

Ruled out with evidence: listeners, intervals and rAF loops per track (all
cleaned), per-song JSON imports (pulse files cached, 5 KB each), the backdrop
images (two at most), the single `<audio>`, Web Audio in the playback path
(none), WebKit-only API use without guards (none found).

Fixed (no visual change):

- `hook-video.tsx`: the hook `<video>` was unmounted on every pause and song
  end with nothing releasing its media. WebKit keeps a detached video's
  decoder and buffers until the source is dropped, so now the unmount
  pauses it, removes `src` and calls `load()`.
- `song-backdrop.tsx`: Nebula mist no longer remounts a whole three.js
  renderer per song (`key={theme}` removed). The kit's `MistBackdrop`
  watches the root's attributes and re-tints itself; verified in Chrome by
  the WebGL context count holding across three songs and the backdrop's
  bright pixels going amber, blue, violet with the songs.
- `stars-backdrop.tsx`: each song built three 512 px cloud textures and
  replaced the material's map without disposing the old ones (R3F does not
  dispose replaced props). An effect cleanup disposes each texture.
- `aurora-backdrop.tsx`: the program, shaders and quad buffer compiled per
  song are deleted on cleanup rather than left to the garbage collector.
- `main.tsx`: the `?debug` log line now carries the background, the route
  and the mounted video count, so the next on-device log says what was on
  screen.

Not changed, worth deciding: while a hook plays, its 30 fps video sits under
every `backdrop-filter` surface (nav, mini player, card, sung-line pill, the
Songs list's glass groups), and each of those re-blurs per frame at 3x DPR.
That is the heaviest sustained GPU load in the default settings; the cure is
fewer glass layers while a clip moves, which is a look decision. Row thumbs
are 512 px for a 44 px row (lazy-loaded, so only scrolled rows decode); a
160 px set would cut a scrolled list's decoded memory by about 85 percent.

Measured (Chrome, iPhone 14 frame, six hand-offs from Devil in My Head,
each background): the JS heap holds flat before and after (about 12 MB on
the live build, 67 MB in dev), DOM nodes and listeners rise and fall with
each song's sheet, and no video or image element outlives its song. Nebula's
WebGL context count went 1 to 7 on the live site and holds at 2 on the fixed
build. Aurora's count rises in both only because the probe tallies
`getContext` calls on the same canvas. What the fixes release (video
decoders, GPU textures, framebuffers) sits outside the JS heap, so Chrome
cannot show it; the phone can.

What would pin it down: open the app on the phone with `?debug` once, play
through until it dies, reopen and read `fw-debug-log` from Eruda or
`localStorage`. The last `beat` line says the song, background, route and
video count at the moment of death.

## Emotional Telemetry's timing

Checked end to end and found sound:

- The live app lights each line at the aligner's time (probe
  `fw-pw/telemetry-sync.cjs`: playhead against the lit line, every 1.5 s).
- 124 of 125 lines anchored, each to transcript text that matches it.
- A second Whisper pass (medium model, `asr-medium.py` in the job temp)
  agrees with the small model's word starts: median difference 0.16 s, 90th
  percentile 0.28 s. On the one line that looked stretched ("feeding static
  through my nerves until they failed", 28.2 to 34.9 s) both models agree:
  the verse ending is drawn out and "failed" is held into the break.
- The recording repeats "I am pulsing through the flames" at 89.5 s after
  the first chorus, a tag the Suno sheet does not have; the previous line
  stays lit through it, which is the designed behaviour for a repeat.

So the data is as good as the other songs'. The song is the fastest
delivery on the album (about 0.04 s per character), which makes the
0.35 s look-ahead and any Bluetooth output latency more visible than on a
ballad. Needs Dustin's description: early or late, by how much, which part.

## The collections

Read every song's description and the sheets that decide the close calls.

- New collection **Say it plain** (after You made me more): We Do This as a
  Team (Dustin to his partner: "she's your sister now, treat her like
  family"), When I Say No… (the partner's side of the same fight: "treat
  Dust and me as family"), Room to Breathe (him standing between them),
  then Forgot To Catch Me and What's bitter is sweet with its cut, which are
  about another person's betrayal, not the inner critic they sat under.
  `opening` puts the two sides and the one between first. Compare pairs
  We Do This as a Team with When I Say No…; Room to Breathe opens beside
  We Do This as a Team.
- Systems Thinker moves from Carbon and silicon to More than enough: it is
  the twin of Neurotypical ("you call me too much while I'm in overdrive"),
  not a machine song. The silicon blurb now describes the machine songs;
  the enough blurb adds "too fast and too loud".
- Considered and left: The Mustang and the Moose and Wild and Free read like
  the sibling story but their sheets say "true lovers" and "my wildest,
  realest, truest friend", so they stay with the people who shaped him.
  Then Don't stays with the devil in his head (every voice says fix it).
  String Bending stays in Hope and rising. This Is His Legend stays in
  Ashes to stardust, whose name it gave.
