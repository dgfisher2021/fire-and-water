import { describe, expect, it } from 'vitest'
import { TRACKS, type TrackId } from '@/data/tracks'
import { MATERIALS } from './materials'
import { KINETIC_SONGS } from './songs'
import {
  buildTimeline,
  cardAt,
  frameAt,
  lineIndexAt,
  sheetLines,
  TAIL,
} from './timeline'
import { CUES } from './types'

const ids = Object.keys(KINETIC_SONGS) as TrackId[]

describe.each(ids)('kinetic film: %s', (id) => {
  const track = TRACKS[id]
  const song = KINETIC_SONGS[id]!
  const timeline = buildTimeline(track, song)

  it('directs every line of the sheet', () => {
    for (const line of sheetLines(track)) {
      const spec = song.lines[line.text]
      expect(spec, line.text).toBeDefined()
      const keys = line.words.map((w) =>
        w.toLowerCase().replace(/[^a-z’'-]/g, '')
      )
      expect(keys, line.text).toContain(spec.hero)
      expect(spec.cues.length, line.text).toBeGreaterThan(0)
      for (const cue of spec.cues)
        expect(CUES).toContain(typeof cue === 'string' ? cue : cue[0])
    }
    expect(Object.keys(song.lines).length).toBe(
      new Set(sheetLines(track).map((l) => l.text)).size
    )
  })

  it('times every word in order, inside the song and before the next line', () => {
    for (const line of timeline.lines) {
      const times = line.tokens.map((t) => t.t)
      expect(times.every(Number.isFinite), line.text).toBe(true)
      for (let j = 1; j < times.length; j++)
        expect(times[j], line.text).toBeGreaterThan(times[j - 1])
      expect(times[0]).toBeGreaterThanOrEqual(0)
      expect(times.at(-1)!).toBeLessThan(Math.min(line.next, timeline.end))
      expect(line.tokens.filter((t) => t.kind === 'hero').length).toBe(1)
    }
  })

  it('runs in order, each line leaving across the next one landing', () => {
    timeline.lines.forEach((line, k) => {
      const next = timeline.lines[k + 1]
      if (!next) return
      expect(next.start, next.text).toBeGreaterThan(line.start)
      // Still leaving as the next lands, for no longer than its style's tail.
      expect(line.exitAt + line.exitDur).toBeLessThanOrEqual(
        next.start + TAIL[line.style] + 1e-9
      )
      expect(line.exitAt).toBeLessThan(next.start)
    })
    expect(lineIndexAt(timeline, 0)).toBe(-1)
    expect(lineIndexAt(timeline, timeline.end)).toBe(timeline.lines.length - 1)
  })

  it('asks the scene for levels between 0 and 1 and counts the heroes', () => {
    for (let t = 0; t <= timeline.end; t += 0.5) {
      const frame = frameAt(timeline, null, t, true)
      for (const cue of CUES) {
        expect(frame.cues[cue]).toBeGreaterThanOrEqual(0)
        expect(frame.cues[cue]).toBeLessThanOrEqual(1)
      }
      expect(frame.fade).toBeGreaterThanOrEqual(0)
    }
    const end = frameAt(timeline, null, timeline.end, false)
    expect(end.heroCount).toBe(timeline.lines.length)
    expect(end.cues.star).toBeGreaterThan(0.9)
  })

  it('gives every line a word made of what it says', () => {
    for (const name of Object.values(song.words))
      expect(MATERIALS[name], name).toBeDefined()
    for (const line of timeline.lines) {
      const made = line.tokens.filter(
        (t) => t.material && t.material !== 'accent'
      )
      expect(made.length, line.text).toBeGreaterThan(0)
      expect(line.hero?.material, line.text).toBeDefined()
    }
  })

  it('casts heroes in solid letters and sand, one word of sand at a time', () => {
    const words = timeline.lines.flatMap((l) =>
      l.heroWord ? [l.heroWord] : []
    )
    expect(words.some((w) => w.solid)).toBe(true)
    const sands = words.flatMap((w) => (w.sand ? [w.sand] : []))
    expect(sands.length).toBeGreaterThan(2)
    sands.forEach((sand, k) => {
      expect(sand.in0).toBeLessThan(sand.in1)
      expect(sand.out0).toBeLessThan(sand.out1)
      const next = sands[k + 1]
      if (!next) return
      const begins = next.mode === 'scatter' ? next.out0 : next.in0
      expect(begins, `sand ${k}`).toBeGreaterThan(sand.out1)
    })
    for (const line of timeline.lines) {
      const word = line.heroWord
      if (!word) continue
      const mid = frameAt(timeline, null, word.t + 0.2, true)
      if (word.solid) expect(mid.solid).toBe(word)
      if (word.sand && word.sand.mode !== 'scatter') expect(mid.sand).toBe(word)
      expect(mid.sandIn).toBeLessThanOrEqual(1)
      expect(mid.sandOut).toBeGreaterThanOrEqual(0)
    }
  })

  it('shows a section card only in a gap, after the line before has left', () => {
    expect(timeline.cards.length).toBeGreaterThan(0)
    for (const card of timeline.cards) {
      expect(card.to).toBeGreaterThan(card.from + 1)
      const before = timeline.lines[lineIndexAt(timeline, card.from)]
      expect(before.exitAt + before.exitDur).toBeLessThanOrEqual(card.from)
      expect(card.to).toBeLessThan(before.next)
      expect(cardAt(timeline, (card.from + card.to) / 2)).toBe(card)
    }
    expect(cardAt(timeline, 0)).toBeNull()
  })

  it('holds its timed cues inside the song and brings each cue up on its word', () => {
    for (const m of timeline.moments) {
      expect(m.from).toBeGreaterThanOrEqual(0)
      expect(m.to).toBeGreaterThan(m.from)
      expect(m.to).toBeLessThan(timeline.end)
      const mid = frameAt(timeline, null, (m.from + m.to) / 2, true)
      expect(mid.cues[m.cue]).toBeGreaterThan(0.9 * (m.level ?? 1))
    }
    for (const line of timeline.lines)
      for (const c of line.cueAt) {
        expect(CUES).toContain(c.cue)
        expect(c.from).toBeGreaterThanOrEqual(line.start)
        expect(c.from).toBeLessThan(line.next)
        // A cue named for a word waits for it.
        if (c.from > line.start)
          expect(
            frameAt(timeline, null, c.from - 0.05, true).cues[c.cue]
          ).toBeLessThan(0.05)
      }
  })

  it('adds a section\u2019s cues to its lines only', () => {
    for (const [section, cues] of Object.entries(song.sectionCues ?? {})) {
      const names = cues.map((c) => (typeof c === 'string' ? c : c[0]))
      const inside = timeline.lines.filter(
        (l) => l.section.replace(/\s*\d+$/, '') === section
      )
      expect(inside.length, section).toBeGreaterThan(0)
      for (const line of inside)
        for (const name of names)
          expect(line.cueAt.map((c) => c.cue)).toContain(name)
    }
  })

  it('keeps lines that share the frame with the heart clear of it', () => {
    for (const line of timeline.lines)
      expect(line.reserve, line.text).toBe(
        line.cueAt.some((c) => c.cue === 'orb' || c.cue === 'star')
      )
    expect(timeline.lines.some((l) => l.reserve)).toBe(true)
  })

  it('credits the song to its writer', () => {
    expect(timeline.lines.at(-1)!.credit?.artist).toBe(song.artist)
  })
})
