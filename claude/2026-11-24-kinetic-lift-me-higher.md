# Kinetic lyrics: Lift Me Higher

> Superseded the same day by the film at `/kinetic/lift` (`src/kinetic/`, README "Kinetic lyrics"): this page was the first pass, a standalone DOM-only page. The bridge and final chorus were re-timed from the isolated vocal (bridge 205.9 s, final chorus 236.4 s; "next to death" after the first chorus was a delay echo), so the Open notes below are closed.

The generic 10-second kinetic lyric prompt (a 120 BPM grid, four lines, Anybody and Fraunces) adapted to Lift Me Higher and stretched to the whole song, following the app's sung timing instead of a beat grid. Built as `public/kinetic/lift-me-higher/index.html`; the README's "Kinetic lyrics" section says how to run, render and check it.

## The brief, adapted

Make a full-length kinetic lyric video for "Lift Me Higher" (Dustin & Alex, from Ashes to Stardust), every word landing on the moment it is sung.

**Inputs.** Song id `lift`, 308.2 s, Suno style "minimal melodic EDM ... hypnotic 122 BPM pulse ... neoclassical string figures, cathedral reverb". Lyrics: the 14-stanza sheet `src/data/lyrics/lift.json` (labels Verse 1, Pre-Chorus, Chorus, Verse 2, Pre-Chorus, Chorus, Bridge, Final Chorus, Outro). Timing: `src/data/timing.json` `lift` (line starts for all 56 lines; word starts for the lines Whisper heard). Pulse: `src/data/pulse/lift-me-higher.json` (bass and voice, ten readings a second). Audio: `https://media.dgfisher.com/lift-me-higher.mp3?v=<hash>`.

**Timing.** A word lands at its sung start. Lines without word times borrow the phrasing of the same line where it was heard, scaled by the ratio of the two stanzas' line spacing (0.8 to 1.8); lines with no heard twin (the bridge) spread their words by length over up to 70% of the line. Every word stays at least 0.2 s before the next line.

**Hero words** (one per line, the word to sing loudest): MIDNIGHT, SILVER, PILLARS, GOLD · CLOCKWORK, ELECTRIC, SIGILS, TIDE · HUSH, CANDLE, ECHOES, SKIES · HIGHER, WIRE, PRAYER, REMEMBER · THUNDER, GHOSTS, HEART, DEATH · VIOLINS, LIGHT, FROZEN, MEMORY · TEMPLE, MECHANICAL, FRACTURE, VOICE · HUSH, ENDING, SING, YOU · MACHINE, CONSTELLATIONS, DUST, BRIGHT · DELAY, MARBLE, HALOED, STAR. Repeated chorus lines keep their heroes.

**Palette** (from the cover: a gold-winged seeress on ink-navy and teal watercolour). Ground `#030d12` (the song's theme colour); type `#eeeae0` marble, small words at 82%; one accent per section, only on hero words and their ghosts: verse teal `#4fc0ae`, pre-chorus moon blue `#91bfd7` (the song's voice colour), chorus and final chorus wing gold `#e6bc63`, bridge copper `#e0895a`, outro moon blue. The ground mixes in 7% of the accent, switching as each line lands.

**Type.** Two families in hard contrast, the sacred machine: content words in Anybody uppercase at weight 300, width 100, 140 px (down to 112 px when a stack runs tall); heroes at weight 900, width 150 (narrowed to 80 for long words so they stay at least 190 px tall), at most 1500 px wide and 300 px tall; small words (a, the, in, through, me, we, I, like, let, ...) in Cormorant Garamond italic 500 at 80 px, the album's own serif, lowercase except I. A small word hangs from the next content word's cap line, or sits on the previous one's baseline when it closes the phrase ("HUSH now", "LIFT me", "the NIGHT is").

**Layout.** Each line builds as a flush-left stack from x 200, kept vertically centred, at most 690 px tall (adjacent short rows merge, then the hero and content sizes shrink); nothing inside 120 px of an edge. A quiet running header at the top left: the title in italic and the section in tracked caps at 55%.

**Motion.** Content words land by scaling 1.35 to 1 in 0.18 s on cubic-bezier(0.2, 0.9, 0.1, 1); small words rise 12 px and fade in over 0.24 s; heroes land the same way while sweeping width 50 to 150 and weight 500 to 900 over 0.3 s. Each new row pushes the stack up over 0.2 s on cubic-bezier(0.65, 0, 0.35, 1). The current hero kicks to 1.03 with the song's bass (how far the bass stands above its last half second, squared), so it breathes harder in the choruses and the drop than in the verses. The stack slides up and off on cubic-bezier(0.7, 0, 0.84, 0) so that it leaves the frame as the next line's first word lands (0.25 s, shortened to as little as 0.12 s where the singer runs lines together); no crossfades. Behind each hero a 3x copy at 6% in its accent, cropped by the frame, follows it at half speed, drifts left 14 px a second and leaves at half the stack's speed.

**Structure.**

- 0 to 1 s: the ground fades up from black.
- Intro: the title builds on the intro's layers: LIFT on the first sound (1.1 s), "me" on the first bass (7.0 s), HIGHER in gold on the bass entry (15.5 s), then "Ashes to Stardust" and DUSTIN & ALEX rise 16 px beneath on the first big hit (23.2 s).
- 29.96 s on: the lyrics, line by line.
- The drop after the first chorus (from 115.3 s): the aligner heard "next to death" inside it, so the line holds until 122.4 s; the title returns on the drop's next bar (123.2 s: LIFT, "me" half a beat later, HIGHER two beats later) until Verse 2 lands at 130.4 s.
- 298 s: the last stack rises as the song title (Cormorant italic 44 px) and DUSTIN & ALEX (Anybody 700, width 100, 28 px, tracked 0.12em) rise beneath it; the kick stops; the frame holds to the end (308.2 s).

**Banned** (unchanged): centred stacks, equalisers, waveforms, particles, glow, gradient text, typewriter reveals, elastic or bounce easing, emoji, flashing more than three times a second.

**Build.** One self-contained HTML page, CSS and JS inline, a 1920x1080 stage scaled to fit. `window.seek(t)` computes every visual from `t` alone (clamped to the end, no CSS transitions or timers, no randomness), defined after `document.fonts.load()` resolves for both faces. Without `?render` the page plays the song and follows the audio clock, looping after a one-second end hold; with `?render` it does not start.

## Checked

`?check` over all 58 stacks and 345 words: no overlapping words, nothing inside the margin, heroes within 1500 x 300 px and matching their measured width, every small word on its row's cap line or baseline, every word hidden one frame before its time and visible on it, no accent off a hero, no stack still on screen when the next lands, and `seek(308.2)` identical to `seek(309.2)`. Every stack at rest, the hand-offs, the reprise, the landings and the outro were looked at frame by frame in Windows Chrome; playback was checked with the CDN audio (click to play, arrows, Space).

## Open

- The bridge and final chorus have no heard words, and their line times are the aligner's spread, so they are the least exact part. Marking those eight lines on `/time/lift` and re-running `scripts/kinetic-data.py` fixes both the app and the video.
- The aligner puts "next to death" (chorus one) 11 s after "softly", inside the drop. The other two choruses sing it about 4 s after; worth a listen.
