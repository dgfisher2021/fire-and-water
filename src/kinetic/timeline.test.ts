import { describe, expect, it } from 'vitest'
import { TRACKS, type TrackId } from '@/data/tracks'
import { KINETIC_SONGS } from './songs'
import { buildTimeline, frameAt, lineIndexAt, sheetLines } from './timeline'
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

  it('runs in order and clears each line as the next lands', () => {
    timeline.lines.forEach((line, k) => {
      const next = timeline.lines[k + 1]
      if (!next) return
      expect(next.start, next.text).toBeGreaterThan(line.start)
      expect(line.exitAt + line.exitDur).toBeLessThanOrEqual(next.start + 1e-9)
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

  it('credits the song to its writer', () => {
    expect(timeline.lines.at(-1)!.credit?.artist).toBe(song.artist)
  })
})
