import type { Stage } from './stage'
import type { TokenKind } from './timeline'

/**
 * The stack a line builds into: which words share a row, how large each is
 * and where it stands. Pure arithmetic over the faces' metrics, so the same
 * code lays a line out in the browser and checks it in a test.
 */

/** The faces' measurements, per pixel of font size. */
export type Metrics = {
  /** Capital height, small-word ascender, and each face's baseline from its box top. */
  cap: number
  ascSmall: number
  baseDisplay: number
  baseSmall: number
  /** A small (italic) word's width, a content word's width set whole, one letter's advance. */
  small: (text: string) => number
  content: (text: string) => number
  letter: (ch: string, hero: boolean) => number
}

/** A word to place; the layout fills in where it stands. */
export type Slot = {
  text: string
  kind: TokenKind
  key: string
  t: number
  /** Set letter by letter (a word with a material) rather than whole. */
  lettered: boolean
  x: number
  size: number
  w: number
  base: number
  top: number
}

export type Row = {
  hero: boolean
  credit: boolean
  cap: number
  h: number
  t: number
  top: number
  gapAbove: number
  width: number
}

type Group<T> = { lead: T[]; word: T; trail: T[] }
type Placed<T> = { tok: T; x: number; size: number; w: number; at: string }

/** Small words that close the phrase before them ("hush now"). */
const BACK = new Set(['me', 'now', 'is', 'am'])
/** How far a small word's tail hangs below its baseline, per pixel. */
const DESCENT = 0.24

function groupsOf<T extends Slot>(tokens: T[]): Group<T>[] {
  const groups: Group<T>[] = []
  let pending: T[] = []
  for (const tok of tokens) {
    if (tok.kind === 'small') {
      pending.push(tok)
      continue
    }
    if (groups.length) {
      let i = 0
      while (i < pending.length && BACK.has(pending[i].key)) i++
      groups.at(-1)!.trail.push(...pending.slice(0, i))
      pending = pending.slice(i)
    }
    groups.push({ lead: pending, word: tok, trail: [] })
    pending = []
  }
  if (pending.length && groups.length) groups.at(-1)!.trail.push(...pending)
  return groups
}

function stackHeight(stage: Stage, rows: Row[]) {
  let y = 0
  rows.forEach((row, k) => {
    const prev = rows[k - 1]
    row.gapAbove = !prev
      ? 0
      : row.credit
        ? stage.creditGap
        : row.hero || prev.hero
          ? stage.heroGap
          : stage.gap
    y += row.gapAbove
    row.top = y
    y += row.h
  })
  return y
}

/**
 * Lays `tokens` out as a flush-left stack: one phrase a row, rows merged
 * and sizes stepped down until the stack fits the stage. Writes each
 * token's place and returns the rows and the stack's height.
 */
export function layoutLine<T extends Slot>(
  stage: Stage,
  m: Metrics,
  tokens: T[],
  creditAt?: number
) {
  const rowMax = stage.w - stage.safe - stage.x0
  const smallW = (tok: T) => m.small(tok.text) * stage.small
  const sideW = (list: T[]) =>
    list.reduce((sum, tok) => sum + smallW(tok) + stage.inner, 0)
  const letteredPer = (tok: T) =>
    [...tok.text].reduce(
      (sum, ch) => sum + m.letter(ch, tok.kind === 'hero'),
      0
    )
  const groups = groupsOf(tokens)

  const arrange = (cs: number, heroCap: number, spec: number[][]) =>
    spec.map((ids) => {
      const members = ids.map((i) => groups[i])
      const hero = members.some((g) => g.word.kind === 'hero')
      let cap = cs * m.cap
      let x = stage.x0
      const placed: Placed<T>[] = []
      for (const g of members) {
        if (x > stage.x0) x += 0.34 * cs
        for (const tok of g.lead) {
          placed.push({ tok, x, size: stage.small, w: smallW(tok), at: 'cap' })
          x += smallW(tok) + stage.inner
        }
        if (g.word.kind === 'hero') {
          const budget = Math.min(
            stage.heroMaxW,
            rowMax - sideW(g.lead) - sideW(g.trail) - stage.inner
          )
          const per = letteredPer(g.word)
          const size = Math.min(budget / per, heroCap / m.cap)
          placed.push({ tok: g.word, x, size, w: per * size, at: 'word' })
          cap = size * m.cap
          x += per * size + stage.inner * 1.3
        } else {
          const w =
            (g.word.lettered ? letteredPer(g.word) : m.content(g.word.text)) *
            cs
          placed.push({ tok: g.word, x, size: cs, w, at: 'word' })
          x += w + stage.inner * 0.6
        }
        for (const tok of g.trail) {
          placed.push({ tok, x, size: stage.small, w: smallW(tok), at: 'base' })
          x += smallW(tok) + stage.inner
        }
      }
      const row: Row & { placed: Placed<T>[] } = {
        hero,
        credit: false,
        cap,
        h: cap,
        placed,
        top: 0,
        gapAbove: 0,
        width: Math.max(...placed.map((p) => p.x + p.w)) - stage.x0,
        t: Math.min(...placed.map((p) => p.tok.t)),
      }
      return row
    })

  let spec = groups.map((_, i) => [i])
  let cs = stage.content.size
  let heroCap = stage.heroMaxCap
  const limit = creditAt === undefined ? stage.stackMax : stage.stackMaxCredit
  let rows: (Row & { placed: Placed<T>[] })[] = []
  for (let pass = 0; pass < 80; pass++) {
    rows = arrange(cs, heroCap, spec)
    if (creditAt !== undefined)
      rows.push({
        hero: false,
        credit: true,
        cap: 0,
        h: stage.creditH,
        placed: [],
        top: 0,
        gapAbove: 0,
        width: 0,
        t: creditAt,
      })
    const total = stackHeight(stage, rows)
    const tooWide = rows.some((r) => r.width > rowMax + 1)
    if (total <= limit && !tooWide) break
    let best = -1
    let bestW = Infinity
    for (let k = 0; k + 1 < spec.length; k++) {
      if (rows[k].hero || rows[k + 1].hero) continue
      const merged = rows[k].width + 0.34 * cs + rows[k + 1].width
      if (merged <= rowMax && merged < bestW) {
        best = k
        bestW = merged
      }
    }
    if (!tooWide && best >= 0)
      spec = [
        ...spec.slice(0, best),
        [...spec[best], ...spec[best + 1]],
        ...spec.slice(best + 2),
      ]
    else if (!tooWide && heroCap > stage.heroMinCap) heroCap -= 20
    else if (cs > stage.content.min) cs -= 4
    else break
  }
  const H = stackHeight(stage, rows)
  for (const row of rows)
    for (const p of row.placed) {
      const tok = p.tok
      tok.x = p.x
      tok.size = p.size
      tok.w = p.w
      tok.base =
        p.at === 'cap' ? row.top + m.ascSmall * p.size : row.top + row.cap
      tok.top =
        tok.base - (tok.kind === 'small' ? m.baseSmall : m.baseDisplay) * p.size
    }
  return { rows: rows as Row[], H }
}

/** A word's ink at rest on the stage: left, top, right, bottom. */
export type Ink = { text: string; box: [number, number, number, number] }

/** Where each word's ink stands once its line has built (the stack centred on the stage). */
export function inkOf(stage: Stage, m: Metrics, tokens: Slot[], H: number) {
  const y0 = stage.cy - H / 2
  return tokens.map((tok): Ink => {
    const small = tok.kind === 'small'
    return {
      text: tok.text,
      box: [
        tok.x,
        y0 + tok.base - (small ? m.ascSmall : m.cap) * tok.size,
        tok.x + tok.w,
        y0 + tok.base + (small ? DESCENT * tok.size : 0),
      ],
    }
  })
}

/**
 * What is wrong with a built line: words whose ink overlaps, or ink outside
 * the stage's safe margins. Empty when the line fits.
 */
export function problemsOf(stage: Stage, inks: Ink[], H: number) {
  const problems: string[] = []
  const y0 = stage.cy - H / 2
  if (y0 < stage.safeY - 0.5)
    problems.push(`stack starts ${Math.round(y0)} above ${stage.safeY}`)
  if (y0 + H > stage.h - stage.safeY + 0.5)
    problems.push(
      `stack ends ${Math.round(y0 + H)} below ${stage.h - stage.safeY}`
    )
  inks.forEach((a, i) => {
    if (a.box[0] < stage.x0 - 0.5)
      problems.push(`${a.text} starts left of the edge`)
    if (a.box[2] > stage.w - stage.safe + 1)
      problems.push(
        `${a.text} ends ${Math.round(a.box[2])} past ${stage.w - stage.safe}`
      )
    for (const b of inks.slice(i + 1)) {
      const dx = Math.min(a.box[2], b.box[2]) - Math.max(a.box[0], b.box[0])
      const dy = Math.min(a.box[3], b.box[3]) - Math.max(a.box[1], b.box[1])
      if (dx > 1 && dy > 1) problems.push(`${a.text} overlaps ${b.text}`)
    }
  })
  return problems
}
