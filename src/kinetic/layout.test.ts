import { describe, expect, it } from 'vitest'
import { TRACKS, type TrackId } from '@/data/tracks'
import typeface from './cinzel-black.typeface.json'
import {
  inkOf,
  layoutLine,
  problemsOf,
  type Metrics,
  type Slot,
} from './layout'
import { KINETIC_SONGS } from './songs'
import { LANDSCAPE, PORTRAIT, fitStage, stageFor, type Stage } from './stage'
import { buildTimeline, type KineticLine } from './timeline'

const { glyphs, resolution } = typeface as unknown as {
  glyphs: Record<string, { ha: number }>
  resolution: number
}

// Cinzel Black's own advances for the heroes; the lighter faces estimated
// from them, a little generously. The browser check (?check=1) measures the real ones.
const advance = (ch: string) =>
  (glyphs[ch]?.ha ?? resolution * 0.7) / resolution
const letter = (ch: string, hero: boolean) =>
  hero ? advance(ch) : advance(ch) * 0.9 + 0.05
const metrics: Metrics = {
  cap: 0.7,
  ascSmall: 0.66,
  baseDisplay: 0.88,
  baseSmall: 0.8,
  small: (text) => text.length * 0.42,
  content: (text) => [...text].reduce((sum, ch) => sum + letter(ch, false), 0),
  letter,
}

const slots = (line: KineticLine) =>
  line.tokens.map((tok): Slot => ({
    text: tok.text,
    kind: tok.kind,
    key: tok.key,
    t: tok.t,
    lettered: !!tok.material,
    x: 0,
    size: 0,
    w: 0,
    base: 0,
    top: 0,
  }))

const ids = Object.keys(KINETIC_SONGS) as TrackId[]
const stages: Stage[] = [LANDSCAPE, PORTRAIT]

describe.each(ids)('kinetic layout: %s', (id) => {
  const timeline = buildTimeline(TRACKS[id], KINETIC_SONGS[id]!)

  it.each(stages)('fits every line on the $name stage', (stage) => {
    for (const line of timeline.lines) {
      const tokens = slots(line)
      const { rows, H } = layoutLine(stage, metrics, tokens, line.credit?.t)
      expect(rows.length).toBeGreaterThan(0)
      const problems = problemsOf(stage, inkOf(stage, metrics, tokens, H), H)
      expect(problems, `${stage.name}: ${line.text ?? 'title'}`).toEqual([])
      for (const tok of tokens) expect(tok.size).toBeGreaterThan(0)
    }
  })

  it('keeps heroes inside the narrow column on a phone', () => {
    for (const line of timeline.lines) {
      const tokens = slots(line)
      layoutLine(PORTRAIT, metrics, tokens, line.credit?.t)
      const hero = tokens.find((t) => t.kind === 'hero')!
      expect(hero.w).toBeLessThanOrEqual(PORTRAIT.heroMaxW + 1)
      expect(hero.w).toBeLessThanOrEqual(940)
    }
  })

  it('reports a line that cannot fit', () => {
    const cramped: Stage = { ...PORTRAIT, w: 420, stackMax: 200 }
    const line = timeline.lines.find((l) => l.tokens.length > 5)!
    const tokens = slots(line)
    const { H } = layoutLine(cramped, metrics, tokens)
    expect(
      problemsOf(cramped, inkOf(cramped, metrics, tokens, H), H).length
    ).toBeGreaterThan(0)
  })
})

describe('kinetic stage', () => {
  it('picks the portrait stage for an upright window only', () => {
    expect(stageFor(1920, 1080)).toBe(LANDSCAPE)
    expect(stageFor(844, 390)).toBe(LANDSCAPE)
    expect(stageFor(1000, 1000)).toBe(LANDSCAPE)
    expect(stageFor(390, 844)).toBe(PORTRAIT)
    expect(stageFor(768, 1024)).toBe(PORTRAIT)
  })

  it('centres the stage in a window of another shape', () => {
    const wide = fitStage(LANDSCAPE, 2000, 1000)
    expect(wide.scale).toBeCloseTo(1000 / 1080)
    expect(wide.top).toBeCloseTo(0)
    expect(wide.left).toBeCloseTo((2000 - 1920 * wide.scale) / 2)
    const tall = fitStage(PORTRAIT, 390, 844)
    expect(tall.scale).toBeCloseTo(390 / 1080)
    expect(tall.left).toBeCloseTo(0)
    expect(tall.top).toBeGreaterThan(0)
  })

  it('reports overlapping ink', () => {
    const problems = problemsOf(
      LANDSCAPE,
      [
        { text: 'A', box: [200, 300, 400, 400] },
        { text: 'B', box: [390, 350, 600, 450] },
      ],
      400
    )
    expect(problems).toEqual(['A overlaps B'])
  })
})
