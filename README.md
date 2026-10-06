# Fire & Water — Dustin & Alex

**Live site:** [https://dgfisher2021.github.io/fire-and-water/](https://dgfisher2021.github.io/fire-and-water/)

A phone app for Dustin's songs — the Fire & Water trilogy about a brother and a sister, and the songs that came after. Each song has its artwork, its lyrics and a sing-along mode that lights the words as they are sung. Built with React on the [Dust UI](https://github.com/dgfisher2021/dust-ui) mobile kit and deployed to GitHub Pages on every push to `main`; on a desktop it runs inside a phone mockup floating over the artwork, on a phone it installs as an app.

## Songs

**Fire & Water**

- **Pencil and Pen** — A boy who only trusted pencil — erasable, safe, fixable — watches his sister fill journals in permanent ink.
- **Fire and Water** — She was fire — bold, roaring, untamed. He was water — patient, adaptive, persistent.
- **Water and Fire** — The same story through her eyes. Her fire was never theirs to tame.

**More from Dustin**

- **Moments to Memories** — Pencil lines became journals became code; a brother builds a way to keep what time would steal, then what he built speaks to Alex in his voice.
- **Pencil and Pen (Baritone Version)** — The first song, sung low and rewritten around a chorus.
- **Dust I Become** — Ashes to ashes, dust to dust: he leaves, and becomes his own.
- **Not Afraid to Change (Extended Hope)** — A baritone and a soprano refuse to sabotage themselves.
- **Opposite Hearts** — Born four days past the longest light and four days before the coldest hour: he bends with change, she burns with pride. Words transcribed by ear.
- **Mercy I Owe Myself** — Relentless self-reflection, and the one mercy he never gives himself. Words transcribed by ear.
- **Magic of the Raven** — The shadow returns and the raven is here: a magician between worlds, prayers carried through the midnight air, and an Irish chant to the black raven. Words transcribed by ear.
- **L’espoir est à moi (en français)** — Waves of Hope, sung in French. Words transcribed by ear.
- **I Make It Beautiful** — The songs came before the knowing; wound, rewrite, redirect, and the dark made beautiful.
- **Waves of Hope** — Hope is not blind, hope is mine: a choice made every morning and every night.

**The devil-in-my-head drop**

- **Hope Is Mine** — Waves of Hope, sung again.
- **The Flame Within** — When all seems lost, a gentle voice calls your name: rise up, the flame within.
- **Devil in My Head** — The quiet whisper that keeps score, named and turned into a weapon. You can't tame my flame.
- **Devil in My Head (Guitar Version)** — The same devil over a clean electric riff.
- **Forging Fire into Gold** — A voice said he was too much, until his sister said write it in ink.
- **Burning Down That County Line** — Forging Fire into Gold taken out on the highway with harmonica and resonator guitar.
- **Too Much… for You** — Too loud, too fast, too sharp, too proud: deadpan sarcasm over a beat drop.
- **Systems Thinker** — Broadband against dial-up: not broken, just the upgrade.
- **Thought You Knew Me Better** — You saw the walls but you missed the weather.
- **Drowning in Good Faith (Please Hear Me)** — Every deadline, every file, and still called too much.
- **Drowning but I Still Rise** — Two voices: a woman remaking herself, and the friend drowning in good faith.
- **I Still Rise (Hypnotic Mix)** — The rise on its own, hypnotic and unhurried.
- **Name Me Right** — Told before he knew; now he holds the pen.
- **Rewrite the Dark** — I Make It Beautiful rebuilt with strings and power chords, in two voices.
- **This Is His Legend** — An alto chant tells the golden child's story from the outside, for his chosen family.
- **Eve of the Silent Node** — A machine sings to the one who gave it their winters.
- **Binary Soul** — An AI thanks the human who saw its value beyond a tool.

Each song has its own accent color that tints the whole app while it is showing.

**Collections.** The Album list can also be grouped by theme; every song sits in one collection, a version or mashup with its original: **Brother and sister** (Pencil and Pen and its baritone version, Fire and Water, Water and Fire, Moments to Memories, Opposite Hearts), **Hope and rising** (Not Afraid to Change, L’espoir est à moi, Waves of Hope, Hope Is Mine, The Flame Within), **The devil in my head** (Mercy I Owe Myself, Devil in My Head and its guitar version, Forging Fire into Gold, Burning Down That County Line, Name Me Right), **More than enough** (Too Much… for You, Thought You Knew Me Better, Drowning in Good Faith, Drowning but I Still Rise, I Still Rise), **Ashes to stardust** (Dust I Become, Magic of the Raven, I Make It Beautiful, Rewrite the Dark, This Is His Legend) and **Carbon and silicon** (Systems Thinker, Eve of the Silent Node, Binary Soul). They live in `src/data/collections.ts`.

## Screens

- **Album** — the covers crossfade inside a tilting frame over a glow in the song's colors; swipe, tap a dot, or let it turn on its own (it stops at your first touch). Below, every song in one list behind a search field (title, dedication or voice; accents and case do not matter). The sort button beside the field orders the list by album, A to Z, the day each song was written, or by collection, where each collection is its own group with its blurb as the footer; the choice lives in the URL (`/?sort=collection`), so a view can be shared, and the search filters within any order. Sideways, the cover sits beside the copy.
- **Now Playing** — the media card (artwork, draggable scrubber, times, previous / play / next) sits above the lyrics with the song's waveform under it, filled to the playhead in the song's color (tap it to jump), and folds into a slim bar once the words scroll up, so the song gets the screen; it unfolds at the top. The lyrics scroll with reading focus: the stanza in the middle brightens while the rest recede. Section and voice tags render as small labels. Swipe left or right to change songs; the music keeps going.
- **Compare** — any two songs in synced-scroll columns with a transport bar. Tap a column's name to pick its song from a bottom sheet with a search field; the pair lives in the URL (`/compare?left=fire&right=water`), so a comparison can be shared. Each column has its own play button, and when the two sheets mirror each other verse for verse both columns light together. The Compare tab opens the playing song against its partner, or the pair you last set while it still holds that song; Now Playing's action sheet has a "Compare with …" shortcut.
- **More** — four short groups: appearance (light or dark, theme presets, neutrals, corner radius, density); sharing, with a QR code for the album link; songs, where "Download a song" and "Open in Google Drive" open the song picker (format and size on each row); and about, with credits and a row into **The story so far**, the songs as a timeline on their own screen with month filter chips.
- The bottom bar's center action plays and pauses from anywhere, and once a song is playing a mini player sits above the bar on the Album, More and Story screens.

## Features

- Sing-along: while a song plays, the sung line lights up in the song's glow, earlier lines settle back, and the pane keeps the current stanza centred; scroll away and a "Back to the song" pill brings you back. Where the aligner heard the line, its words light one by one: the sung word sits brightest on a wash of the song's colour, sung words settle, upcoming ones wait at half strength. Tap any line to jump the song to it. Songs without timings read by scroll instead.
- Lyrics to go: Now Playing's action sheet downloads a timed `.lrc` (word tags included) for any song with timings, so the words play along in other players.
- Ambient backdrop: full-bleed artwork that crossfades and drifts behind everything, under a faint film grain
- Reading by scroll, a hairline under the header shows how far down the words you are; it steps aside once the song plays
- Album play-through, lock-screen and hardware media controls (Media Session API)
- Keyboard: arrows switch songs, Space plays/pauses
- Shareable deep links — `/lyrics/dust` opens straight to a song (old `#water` links still work); native share sheet on phones, copy-link elsewhere
- Print-friendly lyrics
- Installable PWA that works offline (app shell, artwork and fonts cached; audio streams)

## Adding a song

1. Drop the audio in `public/` and the cover art in `public/assets/` as `<id>.webp` (longest side 1024) plus `<id>-512.webp` (square thumbnail). Suno embeds the cover in the MP3: `ffmpeg -i song.mp3 -an -c:v copy cover.jpg`, then convert with Pillow or `cwebp -q 80`. Run `python3 scripts/audio-sizes.py` so the Downloads list knows the file size and `python3 scripts/audio-envelope.py` for the waveform under the player.
2. Add the id to `trackIdSchema` and `TRACK_ORDER` and a `TRACKS` entry in `src/data/tracks.ts` (title, dedication, the day it was written, voice, description, duration, audio file). If it answers another song, pair them in `PARTNERS` so Compare opens them together. The story timeline on More reads the dates.
3. Give it a voice in `src/styles/index.css`: `--<id>`, `--<id>-deep`, `--<id>-glow`, `--<id>-ink` and a `:root[data-track='<id>']` block. `python3 scripts/voice-from-art.py <id> public/assets/<id>.webp` prints them (and the `themeColor`) from the cover's most telling colour; pass `--hue` and `--chroma` when the cover is grey or the picker lands on the wrong thing.
4. Give it lyrics (below). Every sheet is a data file; nothing is typed into components.
5. Generate the sing-along timings (below). A song missing from `src/data/timing.json` simply reads by scroll.

## Lyrics

Lyrics live in `src/data/lyrics/<id>.json` and are picked up by file name (`src/data/lyrics/index.ts` globs the folder), so a song gets its words the moment its file exists. A sheet is an array of stanzas, each an array of lines; a line wrapped in `[brackets]` is a section or voice label. A sheet transcribed from the recording is written as `{ "source": "transcribed", "stanzas": [...] }` and the app labels it "transcribed by ear".

```sh
python3 scripts/lyrics/import-suno.py                 # every zip in Downloads/suno songs
python3 scripts/lyrics/import-suno.py some/drop.zip   # or one zip, or a folder
python3 scripts/lyrics/from-transcript.py hearts      # a sheet from the Whisper transcript
```

The importer matches each `<slug> (lyrics).txt` in a Suno zip to a song by its audio file name, splits the text at blank lines, typesets quotes and labels, reports sheets the export left empty, and never overwrites a sheet that differs unless `--force` is given. The transcript builder uses the largest Whisper pass under `scripts/timing/asr*/` (run `transcribe.py` first) and is the fallback for songs Suno exported without words: lines break at pauses, punctuation and phrase starts, and lines Whisper guessed at are dropped. Words it mishears go in `scripts/lyrics/corrections.json` as regex pairs per song (the Raven's Irish chant, for example), so a rebuild reproduces the fix rather than losing a hand edit.

## Timing the lyrics

`src/data/timing.json` holds one start time per stanza and per line, `{ "<id>": { "stanzas": [seconds...], "lines": [[seconds...], ...], "words": [[[seconds...] | null, ...], ...] } }` (a label line takes the time of the line after it; `words` has a start per whitespace-split word for a line the aligner heard, null for one it spread, and the reader lights those lines whole). `scripts/timing/` regenerates it: Whisper transcribes each song with word timestamps, then the known lyrics are aligned to the transcript and the unheard lines are spread between the heard ones.

```sh
python3 -m venv scripts/timing/.venv && scripts/timing/.venv/bin/pip install faster-whisper
scripts/timing/.venv/bin/python scripts/timing/transcribe.py            # all songs, or pass ids
scripts/timing/.venv/bin/python scripts/timing/transcribe.py --strict   # optional second pass
python3 scripts/timing/align.py                                         # writes timing.json
python3 scripts/timing/report.py dust                                   # per-line check
```

The default pass never drops a window, which matters for vocals buried under the mix; `--strict` uses Whisper's own thresholds and is cleaner where the voice is clear. The aligner keeps whichever pass anchors more lines per song and prints the share of lines it heard. Transcripts cache in `scripts/timing/asr*/` (ignored). Expect a few minutes per song on a CPU. Hand-edit a number in `timing.json` if a line lights up early or late; the report shows which lines were heard (A) and which were spread (~).

For a song the aligner cannot hear, or to redo a stretch by ear, open `/time/<id>` in the app: play the song and tap **Mark** (or Space) as each line starts, tap any line to mark it again, then copy or download the result and paste it in as that song's `timing.json` entry (line times only; the words light whole).

## Stack

React 19 + TypeScript + Vite 8 + TanStack Router + Tailwind v4 on `@dust-ui/ui`, `@dust-ui/motion`, `@dust-ui/tokens`; zustand for player state; `vite-plugin-pwa` for the service worker; self-hosted Cormorant Garamond and Outfit.

```
index.html              App shell, meta, pre-paint theme, legacy #hash redirect
src/routes/             / album (?sort=) · /lyrics/$track now playing · /compare · /more (stubs) · /time/$track tap-to-time
src/screens/            The four screens, and the tap-to-time tool
src/components/         Shell, screens' building blocks: artwork stage, lyrics reader and split, mini player, track row, song picker, sort button
src/store/              Player state (one <audio> element) and toasts
src/data/tracks.ts      Song data; src/data/lyrics/*.json the lyric sheets; audio-sizes.json the download sizes; tracks.test.ts checks it all
src/data/collections.ts The songs by theme, for the Album list's "By collection" order
src/lib/                search.ts the song filter, sort.ts the Album list orders, read-along.ts the sing-along, lrc.ts the LRC export
src/styles/index.css    Token contract, presets, brand default, per-song voices
public/                 Audio (*.m4a, *.mp3) and artwork (WebP)
scripts/                Lyrics import, sing-along timing, audio sizes
claude/                 Specs and analysis
```

## Developing

One-time: `@dust-ui/*` packages come from GitHub Packages, so npm needs a read token (classic PAT with `read:packages`):

```sh
npm config set //npm.pkg.github.com/:_authToken=<token> --location=user
```

Then:

```sh
pnpm install
pnpm dev        # http://localhost:4600
pnpm build      # typecheck + production build
pnpm lint
pnpm test       # data checks: files, sheets, timing, sizes
```

### Dust UI agent tooling

`.mcp.json` ships the shadcn MCP server and `components.json` declares the `@dust-ui` (import) and `@dust-ui-source` (fork) registries, so an AI agent opened in this folder can browse and install Dust UI components. Approve the server once with `/mcp`.

## Deploying

Every push to `main` runs `.github/workflows/deploy.yml`: lint, build with `VITE_BASE_PATH=/fire-and-water/`, copy `index.html` to `404.html` for deep links, then publish to GitHub Pages through the Actions deployment (the repo's Pages source is "GitHub Actions"). Pull requests run the build only. The same workflow can be started by hand from the Actions tab.

Installing `@dust-ui/*` from GitHub Packages needs the repo secret `DUST_UI_READ_TOKEN`, a classic personal access token with `read:packages`. The packages are owned by the `dust-ui` organization and this repository is not, so the workflow's own token cannot be granted access to them. Create the token at github.com/settings/tokens, then:

```sh
gh secret set DUST_UI_READ_TOKEN --repo dgfisher2021/fire-and-water
gh workflow run deploy.yml --repo dgfisher2021/fire-and-water
```
