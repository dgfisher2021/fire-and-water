import type { Track } from '@/data/tracks'
import { pulseAt, type Pulse } from '@/lib/pulse'
import type { CueSpec, KineticSong } from './songs'
import { CUES, type Cue, type KineticFrame } from './types'

export type TokenKind = 'small' | 'content' | 'hero'
export type Token = { text: string; kind: TokenKind; key: string; t: number }

export type KineticLine = {
  section: string
  /** The sheet line, absent for the title and its reprise. */
  text?: string
  tokens: Token[]
  credit?: { t: number; title: string; artist: string }
  cues: CueSpec[]
  accent: string
  energy: number
  start: number
  /** When the next line lands, and when this one starts to leave. */
  next: number
  exitAt: number
  exitDur: number
  hero?: Token
  /** The hero's place on screen (-1 to 1, y up), set by the text layer once laid out. */
  heroAt: [number, number]
}

export type Timeline = {
  lines: KineticLine[]
  heroTimes: number[]
  firstLyric: number
  outro: number
  end: number
  beat: number
}

const SMALL_WORDS = new Set(
  'a an the in of to and through me my we i am are is but yet oh for by like where these when while without now every next no with beneath above at on as still they let you'.split(
    ' '
  )
)
const EXIT = 0.32
const clean = (word: string) =>
  word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
const keyOf = (word: string) => clean(word).toLowerCase().replace(/’/g, "'")
const sameLine = (s: string) => s.toLowerCase().replace(/[^a-z’ ]/g, '')

function tokensOf(words: string[], times: number[], hero?: string): Token[] {
  let heroUsed = false
  return words.map((word, j) => {
    const key = keyOf(word)
    let kind: TokenKind = SMALL_WORDS.has(key) ? 'small' : 'content'
    if (!heroUsed && key === hero) {
      kind = 'hero'
      heroUsed = true
    }
    const bare = clean(word)
    const text =
      kind === 'small'
        ? bare === 'I'
          ? 'I'
          : bare.toLowerCase()
        : bare.toUpperCase()
    return { text, kind, key, t: times[j] }
  })
}

type SheetLine = {
  text: string
  words: string[]
  section: string
  stanza: number
  start: number
  next: number
  heard: number[] | null
  times: number[]
}

/**
 * The sheet's lines with a start per word: the aligner's where it heard the
 * line; else the phrasing of the same line where it was heard, scaled to
 * this stanza's pace; else spread through the line by length.
 */
export function sheetLines(track: Track): SheetLine[] {
  const timing = track.timing
  if (!timing) return []
  const lines: SheetLine[] = []
  let section = 'Intro'
  track.lyrics.forEach((stanza, s) => {
    stanza.forEach((text, i) => {
      const label = text.match(/^\[(.+)\]$/)
      if (label) {
        section = label[1]
        return
      }
      const words = text.split(/\s+/).filter(Boolean)
      const heard = timing.words?.[s]?.[i]
      lines.push({
        text,
        words,
        section,
        stanza: s,
        start: timing.lines[s][i],
        next: 0,
        heard: heard && heard.length === words.length ? heard : null,
        times: [],
      })
    })
  })
  lines.forEach((line, k) => {
    line.next = lines[k + 1]?.start ?? line.start + 8
  })
  const pace = new Map<number, number>()
  for (const s of new Set(lines.map((l) => l.stanza))) {
    const gaps = lines
      .filter((l) => l.stanza === s)
      .map((l) => l.next - l.start)
      .sort((a, b) => a - b)
    pace.set(s, gaps[Math.floor(gaps.length / 2)])
  }
  for (const line of lines) {
    let times = line.heard?.slice()
    if (!times) {
      const source = lines.find(
        (o) => o.heard && sameLine(o.text) === sameLine(line.text)
      )
      if (source?.heard) {
        const ratio = Math.min(
          1.8,
          Math.max(0.8, pace.get(line.stanza)! / pace.get(source.stanza)!)
        )
        const from = source.heard[0]
        times = source.heard.map((w) => line.start + (w - from) * ratio)
      } else {
        const room = line.next - line.start
        const span = Math.min(
          room * 0.7,
          Math.max(1.2, line.words.length * 0.75)
        )
        const weights = line.words.map((w) => clean(w).length + 2)
        const total = weights.slice(0, -1).reduce((a, b) => a + b, 0) || 1
        let acc = 0
        times = weights.map((weight) => {
          const t = line.start + (acc / total) * span
          acc += weight
          return t
        })
      }
    }
    const limit = line.next - 0.25
    times = times.map((t) => Math.min(t, limit))
    for (let j = 1; j < times.length; j++)
      times[j] = Math.max(times[j], times[j - 1] + 0.06)
    line.times = times
  }
  return lines
}

export function buildTimeline(track: Track, song: KineticSong): Timeline {
  const beat = 60 / song.bpm
  const sheet = sheetLines(track)
  const type = (section: string) => section.replace(/\s*\d+$/, '')
  const base = (section: string) => ({
    section,
    accent: song.accents[type(section)] ?? song.accents.Chorus,
    energy: song.energy[type(section)] ?? 0.5,
    heroAt: [-0.2, 0] as [number, number],
    start: 0,
    next: Infinity,
    exitAt: Infinity,
    exitDur: EXIT,
  })
  // The title as a line of its own; its last word is the hero.
  const words = track.title.split(/\s+/)
  const titleTokens = (t: number[]) =>
    tokensOf(
      words,
      words.map((_, i) => t[Math.min(i, t.length - 1)]),
      keyOf(words.at(-1)!)
    )

  const lines: KineticLine[] = [
    {
      ...base('Intro'),
      tokens: titleTokens(song.title.words),
      credit: {
        t: song.title.credit,
        title: 'A kinetic lyric film',
        artist: song.artist,
      },
      cues: song.titleCues,
    },
  ]
  // The reprise takes the first bar of the drop after the last words sung into it.
  let reprise = Infinity
  if (song.drop !== undefined) {
    const into = sheet.filter((l) => l.start < song.drop!).at(-1)
    reprise = song.drop + 8 * beat
    const last = into ? Math.max(...into.times) : 0
    while (reprise < last + 0.5) reprise += 4 * beat
  }
  let reprised = false
  for (const line of sheet) {
    if (!reprised && line.start > reprise) {
      reprised = true
      lines.push({
        ...base('Interlude'),
        tokens: titleTokens([reprise, reprise + beat / 2, reprise + 2 * beat]),
        cues: song.dropCues,
      })
    }
    const spec = song.lines[line.text]
    lines.push({
      ...base(line.section),
      text: line.text,
      tokens: tokensOf(line.words, line.times, spec?.hero),
      cues: spec?.cues ?? [],
    })
  }
  const last = lines.at(-1)!
  last.credit = { t: song.outro, title: track.title, artist: song.artist }

  for (const line of lines) {
    line.start = Math.min(...line.tokens.map((t) => t.t))
    line.hero = line.tokens.find((t) => t.kind === 'hero')
  }
  lines.forEach((line, k) => {
    line.next = lines[k + 1]?.start ?? Infinity
    if (!Number.isFinite(line.next)) return
    // The exit ends as the next line's first word lands.
    const lastWord = Math.max(...line.tokens.map((t) => t.t))
    line.exitAt = Math.max(line.next - EXIT, lastWord + 0.06)
    line.exitDur = Math.min(EXIT, Math.max(0.14, line.next - line.exitAt))
  })
  return {
    lines,
    heroTimes: lines
      .flatMap((l) => (l.hero ? [l.hero.t] : []))
      .sort((a, b) => a - b),
    firstLyric: lines.find((l) => l.section !== 'Intro')?.start ?? 0,
    outro: song.outro,
    end: track.duration,
    beat,
  }
}

/** The line on screen at `t` (the last to have started), or -1. */
export function lineIndexAt(timeline: Timeline, t: number) {
  let found = -1
  for (let k = 0; k < timeline.lines.length; k++) {
    if (timeline.lines[k].start <= t) found = k
    else break
  }
  return found
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (v: number) => v * v * (3 - 2 * v)

/** How far the bass stands above its last half second, squared: a kick. */
export function kickAt(pulse: Pulse, t: number) {
  const now = pulseAt(pulse.bass, pulse.fps, t)
  let low = now
  for (
    let i = Math.ceil((t - 0.5) * pulse.fps);
    i <= Math.floor(t * pulse.fps);
    i++
  )
    if (i >= 0 && i < pulse.bass.length)
      low = Math.min(low, parseInt(pulse.bass[i], 36) / 35)
  const k = clamp01((now - low) / 0.15)
  return k * k
}

const RISE = 0.9
const FALL = 1.6
const LEAD = 0.3

/** The frame the scene draws at `t`: cue levels eased in before a line and out after it. */
export function frameAt(
  timeline: Timeline,
  pulse: Pulse | null,
  t: number,
  playing: boolean
): KineticFrame {
  const cues = Object.fromEntries(CUES.map((c) => [c, 0])) as Record<
    Cue,
    number
  >
  const k = lineIndexAt(timeline, t + LEAD)
  for (let j = Math.max(0, k - 2); j <= k; j++) {
    const line = timeline.lines[j]
    const up = smooth(clamp01((t - (line.start - LEAD)) / RISE))
    const down = 1 - smooth(clamp01((t - line.next) / FALL))
    for (const spec of line.cues) {
      const [cue, level] = typeof spec === 'string' ? [spec, 1] : spec
      cues[cue] = Math.max(cues[cue], level * up * down)
    }
  }
  const at = lineIndexAt(timeline, t)
  const line = at >= 0 ? timeline.lines[at] : undefined
  let heroCount = 0
  while (
    heroCount < timeline.heroTimes.length &&
    timeline.heroTimes[heroCount] <= t
  )
    heroCount++
  let heroLine = line
  for (let j = at; j >= 0; j--) {
    const hero = timeline.lines[j].hero
    if (hero && hero.t <= t) {
      heroLine = timeline.lines[j]
      break
    }
  }
  return {
    time: t,
    playing,
    bass: pulse ? pulseAt(pulse.bass, pulse.fps, t) : 0,
    vocal: pulse ? pulseAt(pulse.vocal, pulse.fps, t) : 0,
    kick: pulse ? kickAt(pulse, t) : 0,
    accent: line?.accent ?? timeline.lines[0].accent,
    energy: line?.energy ?? 0.3,
    cues,
    heroCount,
    heroAt: heroLine?.heroAt ?? [-0.2, 0],
    fade: clamp01(t / 1.2) * (1 - 0.6 * clamp01((t - (timeline.end - 3)) / 3)),
  }
}
