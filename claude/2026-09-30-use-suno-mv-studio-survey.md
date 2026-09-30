# use-suno-mv-studio: what Fire & Water could take from it

Survey of `~/projects/use-suno-mv-studio` on 2026-09-30, asked as "components and features we could bring to Fire & Water".

## Read this first: the licence

The repo is **AGPL-3.0-only** (`LICENSE`, `THIRD_PARTY_NOTICES.md`). About 7.2 MB of it is vendored from Folia (`src/vendor/folia/`, AGPL) and it depends on `@applemusic-like-lyrics/ttml`, also AGPL. Copying any of that into Fire & Water would put this repo's distributed source under AGPL. The Studio-authored modules (`src/audio`, `src/import`, `src/timestamp`, `src/aurora`) are licensed AGPL in that repo too; if they are Dustin's own code they can be relicensed, otherwise treat everything there as a reference to rewrite from, not code to copy.

## What it is

"UseSuno MV Studio" (`verse-studio` 0.2.1): a browser-based, local-first lyric-video maker. Import audio, edit lyrics and word-level timing, pick one of 14 animated templates and 4 backgrounds, export MP4/WebM through WebCodecs or MediaRecorder. It never calls the Suno API; "UseSuno" is the brand. Multi-page Vite 6 app, no router: `index.html` is the editor, `folia.html` an iframe-isolated renderer, `timestamp.html` the tap-to-time page. React 19, Tailwind v4, zustand (inside Folia only), framer-motion, pixi.js 8, three/R3F, twgl, paper shaders, mediabunny, music-metadata, dexie, fflate, i18next. `public/` holds only a favicon and two legal pages; the shaders are inline TypeScript strings.

## Worth bringing over, ranked for a lyrics-forward player

Fire & Water's `src/data/timing.json` stores one start time per stanza and line. Everything below builds on that.

1. **Word-level karaoke fill** (medium). Store per-word times and sweep a gradient across each word. Model: `src/domain/model.ts` (`Word { text, start, end }`, `LyricLine.precision`), progress maths in `src/renderer/draw.ts` (`lineProgress`); per-grapheme timing in `vendor/.../graphemeTiming.ts` is AGPL. Needs word timings in the data; `scripts/timing/transcribe.py` already asks Whisper for word timestamps, so the data source exists.
2. **Tap-to-time authoring** (small to medium). `src/timestamp/timing.ts` is about 85 lines of pure functions (`tokenizeLine`, `tokensFromLines`, `applyTokenTimes`, `previewTimes`, `parseTimingInput`) behind `TimestampApp.tsx`. Would replace hand-editing `timing.json` when the aligner mis-hears a line.
3. **Audio-reactive ambience** (small). `src/audio/analysis.ts` (about 140 lines, no deps) band-passes the track offline into 30 fps Uint8 envelopes (power, bass, lowMid, mid, vocal, treble). Run it at build time, ship JSON, pulse the artwork backdrop or `--track-glow` on bass or vocal.
4. **Cover-art palette extraction** (small). `vendor/folia/utils/colorExtractor.ts` and `colorPalette.ts` (AGPL, easy to rewrite). This repo already picks each voice by hand from the cover; the drop-2 import used a throwaway OKLCH picker, which could become `scripts/voice-from-art.py`.
5. **LRC import and export with offset** (small). `src/import/lyrics.ts`: `parseLyrics` (LRC and enhanced LRC word tags, `[offset:]`), `estimateTiming`, `toLrc`. Lets the sheets interoperate with other players.
6. **Waveform scrubber** (small). `envelope()` in `src/audio/media.ts` (600 bins) and `Timeline.tsx`.
7. **Line A/B loop** (small). `Timeline.tsx` and `PlaybackClock.loop`, for practising a line.
8. **Song intro title card** (small to medium). `src/folia/SongIntro.tsx` and `intro.ts`.
9. **WebGL aurora and nebula backgrounds** (medium). `src/aurora/nebula.ts` and `curtainShader.ts`, the author's own code per the notices, but a battery cost on phones.

Poor fits: the 13 Folia visualizers (PIXI and three, huge, AGPL, iframe-coupled, built for landscape video), the video export pipeline (about 20 files), i18n, the Cappella chat bubbles, and the QRC/KRC/YRC lyric parsers.

## Quality caveats

- About 259 vendored files and `src/aurora/nebula.ts` start with `@ts-nocheck`.
- Studio code is dense (long one-line functions) and many user-facing strings are hard-coded in Chinese (`lyrics.ts`, `project.ts`, `model.ts`).
- Heavy dependencies: pixi, three, R3F, mediabunny, framer-motion, dexie, paper shaders.
- `LegacyCanvas` and the `article`, `flow`, `tilt` template ids are legacy.
- No API keys; the only network calls are Google Fonts and the GitHub font catalog.
