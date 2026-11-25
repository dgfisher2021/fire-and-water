import type { Track } from '@/data/tracks'
import { MATERIALS, type Material, type MaterialName } from './materials'
import type { Signals } from './signals'
import type { CueSpec, HeroSpec, KineticSong, LineStyle, Moment } from './songs'
import {
  CUES,
  type Cue,
  type HeroWord,
  type KineticFrame,
  type Solid,
  type TextGuard,
} from './types'

export type TokenKind = 'small' | 'content' | 'hero'
export type Token = {
  text: string
  kind: TokenKind
  key: string
  t: number
  /** What the word is made of; heroes always have one. */
  material?: MaterialName
}

export type KineticLine = {
  section: string
  /** The sheet line, absent for the title and its reprise. */
  text?: string
  tokens: Token[]
  credit?: { t: number; title: string; artist: string }
  cues: CueSpec[]
  /** The cues resolved: each with its level and the song time it comes up at. */
  cueAt: { cue: Cue; level: number; from: number }[]
  /** Shares the frame with the clockwork heart (or the star in its place): keep clear. */
  reserve: boolean
  accent: string
  energy: number
  style: LineStyle
  start: number
  /** When the next line lands, and when this one starts to leave. */
  next: number
  exitAt: number
  exitDur: number
  hero?: Token
  /** The hero's place on screen (-1 to 1, y up), set by the text layer once laid out. */
  heroAt: [number, number]
  /** The hero as the scene draws it (solid letters, sand), when it does. */
  heroWord?: HeroWord
}

/** A section's name, shown in the quiet before its first line. */
export type SectionCard = {
  label: string
  accent: string
  from: number
  to: number
}

export type Timeline = {
  lines: KineticLine[]
  moments: Moment[]
  cards: SectionCard[]
  heroTimes: number[]
  firstLyric: number
  outro: number
  end: number
  beat: number
  /** Written by the text layer every frame, read by the scene. */
  guard: TextGuard
}

const SMALL_WORDS = new Set(
  'a an the in of to and through me my we i am are is but yet oh for by like where these when while without now every next no with beneath above at on as still they let you'.split(
    ' '
  )
)
/** How long each style takes to leave, at most. */
const EXIT: Record<LineStyle, number> = {
  title: 1.2,
  rise: 0.5,
  unveil: 0.55,
  lift: 0.32,
  clockwork: 0.37,
  dissolve: 0.9,
}
/** How long each style goes on leaving after the next line has landed. */
export const TAIL: Record<LineStyle, number> = {
  title: 0,
  rise: 0.3,
  unveil: 0.25,
  lift: 0.42,
  clockwork: 0.4,
  dissolve: 0.35,
}
/** A gap this long before a new section leaves room for its card. */
const CARD_ROOM = 4.2
const CARD_LEAD = 2.7
const SAND_OUT = 2.2
const SAND_COLOR: Record<Solid, string> = {
  gold: '#f3cf7c',
  silver: '#dbe7f0',
  brass: '#e9a868',
  steel: '#b8c6d0',
  ice: '#bfe6ff',
  light: '#fff4d6',
}

const clean = (word: string) =>
  word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
const keyOf = (word: string) => clean(word).toLowerCase().replace(/’/g, "'")
const sameLine = (s: string) => s.toLowerCase().replace(/[^a-z’ ]/g, '')

function tokensOf(
  words: string[],
  times: number[],
  materials: Record<string, MaterialName>,
  hero?: string
): Token[] {
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
    const material =
      materials[key.replace(/'/g, '’')] ??
      materials[key] ??
      (kind === 'hero' ? 'accent' : undefined)
    return { text, kind, key, t: times[j], material }
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

/** The hero as the scene draws it, with the sand's schedule around the line. */
function heroWordOf(line: KineticLine, spec: HeroSpec): HeroWord | undefined {
  const hero = line.hero
  if (!hero || (!spec.solid && !spec.sand)) return undefined
  const material: Material = MATERIALS[hero.material ?? 'accent']
  const word: HeroWord = {
    text: hero.text,
    t: hero.t,
    exitAt: line.exitAt,
    exitDur: line.exitDur,
    box: [0, 0, 0, 0],
    pose: { y: 0, rotY: 0, rotX: 0, hinge: 0 },
    motion: material.motion,
    solid: spec.solid,
  }
  if (spec.sand) {
    const [mode, seconds] =
      typeof spec.sand === 'string' ? [spec.sand, SAND_OUT] : spec.sand
    const in0 = hero.t - (line.style === 'title' ? 2.8 : 1.5)
    const in1 = hero.t + 0.1
    const leave = Number.isFinite(line.exitAt) ? line.exitAt : hero.t + 6
    const out0 =
      mode === 'gather' ? in1 + 0.9 : Math.max(leave - 0.3, hero.t + 0.5)
    const fill = material.fill
    word.sand = {
      mode,
      in0,
      in1,
      out0,
      out1: out0 + seconds,
      color: spec.solid
        ? SAND_COLOR[spec.solid]
        : typeof fill === 'string' && fill.startsWith('#')
          ? fill
          : '#e9dcc0',
    }
  }
  return word
}

export function buildTimeline(track: Track, song: KineticSong): Timeline {
  const beat = 60 / song.bpm
  const sheet = sheetLines(track)
  const type = (section: string) => section.replace(/\s*\d+$/, '')
  const base = (section: string) => ({
    section,
    accent: song.accents[type(section)] ?? song.accents.Chorus,
    energy: song.energy[type(section)] ?? 0.5,
    style: song.styles[type(section)] ?? 'rise',
    heroAt: [-0.2, 0] as [number, number],
    cueAt: [] as KineticLine['cueAt'],
    reserve: false,
    start: 0,
    next: Infinity,
    exitAt: Infinity,
    exitDur: EXIT.rise,
  })
  // The title as a line of its own; its last word is the hero.
  const words = track.title.split(/\s+/)
  const titleTokens = (t: number[]) =>
    tokensOf(
      words,
      words.map((_, i) => t[Math.min(i, t.length - 1)]),
      song.words,
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
  const specs: HeroSpec[] = [song.title]
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
      specs.push(song.dropHero ?? {})
    }
    const spec = song.lines[line.text]
    lines.push({
      ...base(line.section),
      text: line.text,
      tokens: tokensOf(line.words, line.times, song.words, spec?.hero),
      cues: [
        ...(spec?.cues ?? []),
        ...(song.sectionCues?.[type(line.section)] ?? []),
      ],
    })
    specs.push(spec ?? {})
  }
  const last = lines.at(-1)!
  last.credit = { t: song.outro, title: track.title, artist: song.artist }

  for (const line of lines) {
    line.start = Math.min(...line.tokens.map((t) => t.t))
    line.hero = line.tokens.find((t) => t.kind === 'hero')
    line.cueAt = line.cues.map((spec) => {
      const [cue, level, word] = typeof spec === 'string' ? [spec, 1] : spec
      const at = word ? line.tokens.find((t) => t.key === word)?.t : undefined
      return { cue, level, from: at ?? line.start }
    })
    line.reserve = line.cueAt.some((c) => c.cue === 'orb' || c.cue === 'star')
  }
  const cards: SectionCard[] = []
  lines.forEach((line, k) => {
    const next = lines[k + 1]
    if (next) {
      line.next = next.start
      const lastWord = Math.max(
        ...line.tokens.map((t) => t.t),
        line.credit?.t ?? 0
      )
      // Before a new section with room to spare, leave early for its card.
      let end = line.next
      if (next.section !== line.section && line.next - lastWord >= CARD_ROOM) {
        end = Math.min(lastWord + 3.6, line.next - CARD_LEAD)
        // The title's reprise announces itself.
        if (next.text)
          cards.push({
            label: next.section,
            accent: next.accent,
            from: line.next - CARD_LEAD + 0.3,
            to: line.next - 0.35,
          })
      }
      // The exit starts before the next line lands and finishes just after
      // it, receding as it fades: a fast hand-off dissolves, it does not cut.
      const tail = end === line.next ? TAIL[line.style] : 0
      line.exitAt = Math.max(
        end - EXIT[line.style],
        Math.min(lastWord + 0.3, end - 0.14)
      )
      line.exitDur = end + tail - line.exitAt
    }
    line.heroWord = heroWordOf(line, specs[k])
  })
  return {
    lines,
    cards,
    moments: song.moments ?? [],
    heroTimes: lines
      .flatMap((l) => (l.hero ? [l.hero.t] : []))
      .sort((a, b) => a - b),
    firstLyric: lines.find((l) => l.section !== 'Intro')?.start ?? 0,
    outro: song.outro,
    end: track.duration,
    beat,
    guard: { x: 0, y: 0, w: 0, h: 0, level: 0 },
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

/** The section card showing at `t`, if any. */
export function cardAt(timeline: Timeline, t: number) {
  for (const card of timeline.cards)
    if (t >= card.from && t < card.to) return card
  return null
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (v: number) => v * v * (3 - 2 * v)

const FLASH_SPAN = 1.9
const hash = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453
  return x - Math.floor(x)
}

/** The storm's lightning at `t`: a strike and an afterflash in most 1.9 s slots. */
export function flashAt(t: number) {
  const slot = Math.floor(t / FLASH_SPAN)
  if (hash(slot + 2) < 0.3) return 0
  const ph = t - slot * FLASH_SPAN
  return (
    smooth(clamp01(ph / 0.07)) * Math.exp(-ph * 4.5) +
    (ph > 0.24
      ? 0.45 * smooth(clamp01((ph - 0.24) / 0.06)) * Math.exp(-(ph - 0.24) * 6)
      : 0)
  )
}

/** The hero word the sand holds at `t`: the last whose schedule has begun and not run out. */
export function sandAt(timeline: Timeline, t: number) {
  let found: HeroWord | null = null
  for (const line of timeline.lines) {
    const sand = line.heroWord?.sand
    if (!sand) continue
    const from = sand.mode === 'scatter' ? sand.out0 : sand.in0
    if (from > t) break
    if (t <= sand.out1) found = line.heroWord!
  }
  return found
}

const REST: [number, number] = [-0.2, 0]
const RISE = 0.9
const FALL = 1.6
const LEAD = 0.3

/** An empty frame, for `frameAt` to fill again and again. */
export const createFrame = (): KineticFrame => ({
  time: 0,
  playing: false,
  bass: 0,
  vocal: 0,
  sub: 0,
  lowMid: 0,
  mid: 0,
  high: 0,
  loud: 0,
  kick: 0,
  snare: 0,
  accent: '#ffffff',
  energy: 0,
  cues: Object.fromEntries(CUES.map((c) => [c, 0])) as Record<Cue, number>,
  flash: 0,
  heroCount: 0,
  heroAt: [-0.2, 0],
  solid: null,
  guard: { x: 0, y: 0, w: 0, h: 0, level: 0 },
  sand: null,
  sandIn: 0,
  sandOut: 0,
  sandLevel: 0,
  fade: 1,
})

/**
 * The frame the scene draws at `t`: cue levels eased in before a line and
 * out after it, and what the film hears (`sig`). Fills and returns `into`
 * when given, so a film draws every frame into the same object.
 */
export function frameAt(
  timeline: Timeline,
  sig: Signals | null,
  t: number,
  playing: boolean,
  into: KineticFrame = createFrame()
): KineticFrame {
  const cues = into.cues
  for (const cue of CUES) cues[cue] = 0
  const k = lineIndexAt(timeline, t + LEAD)
  for (let j = Math.max(0, k - 2); j <= k; j++) {
    const line = timeline.lines[j]
    const down = 1 - smooth(clamp01((t - line.next) / FALL))
    for (const c of line.cueAt) {
      // A cue waiting on a word comes up on it, not ahead of it.
      const lead = c.from > line.start ? 0 : LEAD
      const up = smooth(clamp01((t - (c.from - lead)) / RISE))
      cues[c.cue] = Math.max(cues[c.cue], c.level * up * down)
    }
  }
  for (const m of timeline.moments) {
    if (t < m.from || t > m.to + FALL) continue
    const up = smooth(clamp01((t - m.from) / RISE))
    const down = 1 - smooth(clamp01((t - m.to) / FALL))
    cues[m.cue] = Math.max(cues[m.cue], (m.level ?? 1) * up * down)
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
  const word = line?.heroWord
  const sand = sandAt(timeline, t)
  const plan = sand?.sand
  const f = into
  f.time = t
  f.playing = playing
  f.bass = sig?.bass ?? 0
  f.vocal = sig?.vocal ?? 0
  f.sub = sig?.sub ?? 0
  f.lowMid = sig?.lowMid ?? 0
  f.mid = sig?.mid ?? 0
  f.high = sig?.high ?? 0
  f.loud = sig?.loud ?? 0
  f.kick = sig?.kick ?? 0
  f.snare = sig?.snare ?? 0
  f.accent = line?.accent ?? timeline.lines[0].accent
  f.energy = line?.energy ?? 0.3
  f.flash = flashAt(t)
  f.heroCount = heroCount
  f.heroAt = heroLine?.heroAt ?? REST
  f.solid =
    word?.solid && t >= word.t && t < word.exitAt + word.exitDur ? word : null
  f.sand = sand
  f.guard = timeline.guard
  f.sandIn =
    plan && plan.mode !== 'scatter'
      ? 1 - clamp01((t - plan.in0) / (plan.in1 - plan.in0))
      : 0
  f.sandOut =
    plan && plan.mode !== 'gather'
      ? clamp01((t - plan.out0) / (plan.out1 - plan.out0))
      : 0
  f.sandLevel =
    plan?.mode === 'gather' ? 1 - clamp01((t - plan.in1 - 0.1) / 0.8) : 1
  f.fade = clamp01(t / 1.2) * (1 - 0.6 * clamp01((t - (timeline.end - 3)) / 3))
  return f
}
