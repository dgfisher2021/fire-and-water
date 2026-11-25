import type { Pulse } from '@/lib/pulse'
import type { KineticLine, Timeline, Token } from './timeline'
import { kickAt, lineIndexAt } from './timeline'

/**
 * The typography of the kinetic film: a 1920x1080 stage of plain DOM text,
 * laid out once and drawn for any song time. Each line builds as a
 * flush-left stack in 3D space; a hero word assembles letter by letter in
 * its section's colour; the stack lifts away as the next line lands.
 */

export const STAGE_W = 1920
export const STAGE_H = 1080
const SAFE = 120
const X0 = 200
const CY = STAGE_H / 2
const ROW_MAX = STAGE_W - SAFE - X0
const STACK_MAX = 700
const STACK_MAX_CREDIT = 800
const HERO_MAX_W = 1480
const HERO_MAX_CAP = 270
const CONTENT = { size: 124, min: 96 }
const SMALL_SIZE = 78
const GAP = 38
const HERO_GAP = 50
const CREDIT_GAP = 70
const CREDIT_H = 96
const INNER = 20

const HERO_FONT = "900 1000px 'Cinzel Variable'"
const DISPLAY = "'Cinzel Variable', 'Cormorant Garamond', serif"
const ITALIC = "'Cormorant Garamond', ui-serif, Georgia, serif"
const TRACK_CONTENT = 0.05

/** Small words that close the phrase before them ("hush now"). */
const BACK = new Set(['me', 'now', 'is', 'am'])

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const easeOut = (v: number) => 1 - Math.pow(1 - clamp01(v), 4)
const easeInOut = (v: number) => {
  const x = clamp01(v)
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}
const easeIn = (v: number) => Math.pow(clamp01(v), 3)

type Placed = Token & {
  el: HTMLElement
  letters?: HTMLElement[]
  x: number
  size: number
  w: number
  base: number
  top: number
}
type Row = {
  hero: boolean
  credit: boolean
  cap: number
  h: number
  t: number
  top: number
  gapAbove: number
  width: number
  placed: { tok: Placed; x: number; size: number; w: number; at: string }[]
}
type Group = { lead: Placed[]; word: Placed; trail: Placed[] }
type Laid = {
  line: KineticLine
  el: HTMLElement
  tokens: Placed[]
  rows: Row[]
  H: number
  hero?: Placed
  credits?: { el: HTMLElement; top: number }[]
}

export type TextEngine = {
  render: (time: number) => void
  dispose: () => void
}

export function createTextEngine(
  root: HTMLElement,
  timeline: Timeline,
  pulse: Pulse | null,
  title: string,
  reduced: boolean
): TextEngine {
  root.textContent = ''
  const written = new WeakMap<HTMLElement, Record<string, string>>()
  // Writes a style only when it changes.
  const put = (el: HTMLElement, prop: string, value: string) => {
    let seen = written.get(el)
    if (!seen) written.set(el, (seen = {}))
    if (seen[prop] !== value) {
      seen[prop] = value
      el.style.setProperty(prop, value)
    }
  }

  /* ---------- metrics ---------- */

  const probe = document.createElement('span')
  probe.style.cssText =
    'position:absolute;left:0;top:0;white-space:nowrap;line-height:1;visibility:hidden;font-size:1000px'
  root.append(probe)
  const widths = new Map<string, number>()
  const widthPerPx = (text: string, font: string, tracking = 0) => {
    const key = `${font}|${tracking}|${text}`
    let w = widths.get(key)
    if (w === undefined) {
      probe.style.font = font
      probe.style.lineHeight = '1'
      probe.style.letterSpacing = `${tracking}em`
      probe.textContent = text
      w = probe.offsetWidth / 1000
      widths.set(key, w)
    }
    return w
  }
  const baselineRatio = (font: string) => {
    probe.style.font = font
    probe.style.lineHeight = '1'
    probe.textContent = 'H'
    const mark = document.createElement('span')
    mark.style.cssText =
      'display:inline-block;width:0;height:0;vertical-align:baseline'
    probe.append(mark)
    const ratio = mark.offsetTop / 1000
    probe.textContent = ''
    return ratio
  }
  const CONTENT_FONT = "400 1000px 'Cinzel Variable'"
  const SMALL_FONT = `italic 500 1000px ${ITALIC}`
  const ctx = document.createElement('canvas').getContext('2d')!
  ctx.font = HERO_FONT
  const CAP = ctx.measureText('H').actualBoundingBoxAscent / 1000 || 0.7
  ctx.font = SMALL_FONT
  const ASC_S = ctx.measureText('dhklbf').actualBoundingBoxAscent / 1000 || 0.7
  const BASE_D = baselineRatio(HERO_FONT)
  const BASE_S = baselineRatio(SMALL_FONT)

  const smallW = (tok: Token) => widthPerPx(tok.text, SMALL_FONT) * SMALL_SIZE
  const sideW = (list: Token[]) =>
    list.reduce((sum, tok) => sum + smallW(tok) + INNER, 0)
  const heroPer = (tok: Token) =>
    [...tok.text].reduce((sum, ch) => sum + widthPerPx(ch, HERO_FONT), 0)

  /* ---------- layout ---------- */

  function groupsOf(tokens: Placed[]): Group[] {
    const groups: Group[] = []
    let pending: Placed[] = []
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

  function arrange(
    groups: Group[],
    cs: number,
    heroCap: number,
    spec: number[][]
  ) {
    return spec.map((ids): Row => {
      const row = ids.map((i) => groups[i])
      const hero = row.some((g) => g.word.kind === 'hero')
      let cap = cs * CAP
      let x = X0
      const placed: Row['placed'] = []
      for (const g of row) {
        if (x > X0) x += 0.34 * cs
        for (const tok of g.lead) {
          placed.push({ tok, x, size: SMALL_SIZE, w: smallW(tok), at: 'cap' })
          x += smallW(tok) + INNER
        }
        if (g.word.kind === 'hero') {
          const budget = Math.min(
            HERO_MAX_W,
            ROW_MAX - sideW(g.lead) - sideW(g.trail) - INNER
          )
          const per = heroPer(g.word)
          const size = Math.min(budget / per, heroCap / CAP)
          placed.push({ tok: g.word, x, size, w: per * size, at: 'word' })
          cap = size * CAP
          x += per * size + INNER * 1.3
        } else {
          const w = widthPerPx(g.word.text, CONTENT_FONT, TRACK_CONTENT) * cs
          placed.push({ tok: g.word, x, size: cs, w, at: 'word' })
          x += w + INNER * 0.6
        }
        for (const tok of g.trail) {
          placed.push({ tok, x, size: SMALL_SIZE, w: smallW(tok), at: 'base' })
          x += smallW(tok) + INNER
        }
      }
      return {
        hero,
        credit: false,
        cap,
        h: cap,
        placed,
        top: 0,
        gapAbove: 0,
        width: Math.max(...placed.map((p) => p.x + p.w)) - X0,
        t: Math.min(...placed.map((p) => p.tok.t)),
      }
    })
  }

  function stackHeight(rows: Row[]) {
    let y = 0
    rows.forEach((row, k) => {
      const prev = rows[k - 1]
      row.gapAbove = !prev
        ? 0
        : row.credit
          ? CREDIT_GAP
          : row.hero || prev.hero
            ? HERO_GAP
            : GAP
      y += row.gapAbove
      row.top = y
      y += row.h
    })
    return y
  }

  function layout(line: KineticLine, tokens: Placed[]) {
    const groups = groupsOf(tokens)
    let spec = groups.map((_, i) => [i])
    let cs = CONTENT.size
    let heroCap = HERO_MAX_CAP
    const limit = line.credit ? STACK_MAX_CREDIT : STACK_MAX
    let rows: Row[] = []
    for (let pass = 0; pass < 60; pass++) {
      rows = arrange(groups, cs, heroCap, spec)
      if (line.credit)
        rows.push({
          hero: false,
          credit: true,
          cap: 0,
          h: CREDIT_H,
          placed: [],
          top: 0,
          gapAbove: 0,
          width: 0,
          t: line.credit.t,
        })
      const total = stackHeight(rows)
      const tooWide = rows.some((r) => r.width > ROW_MAX + 1)
      if (total <= limit && !tooWide) break
      let best = -1
      let bestW = Infinity
      for (let k = 0; k + 1 < spec.length; k++) {
        if (rows[k].hero || rows[k + 1].hero) continue
        const merged = rows[k].width + 0.34 * cs + rows[k + 1].width
        if (merged <= ROW_MAX && merged < bestW) {
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
      else if (!tooWide && heroCap > 200) heroCap -= 20
      else if (cs > CONTENT.min) cs -= 4
      else break
    }
    const H = stackHeight(rows)
    for (const row of rows)
      for (const p of row.placed) {
        const tok = p.tok
        tok.x = p.x
        tok.size = p.size
        tok.w = p.w
        tok.base = p.at === 'cap' ? row.top + ASC_S * p.size : row.top + row.cap
        tok.top = tok.base - (tok.kind === 'small' ? BASE_S : BASE_D) * p.size
      }
    return { rows, H }
  }

  /* ---------- DOM ---------- */

  const stage = document.createElement('div')
  stage.style.cssText = `position:absolute;left:0;top:0;width:${STAGE_W}px;height:${STAGE_H}px;perspective:1700px;perspective-origin:38% 50%`
  root.append(stage)
  const word = (text: string, css: string) => {
    const el = document.createElement('span')
    el.textContent = text
    el.style.cssText = `position:absolute;left:0;top:0;white-space:nowrap;will-change:transform,opacity;${css};line-height:1`
    return el
  }

  const laid: Laid[] = timeline.lines.map((line) => {
    const el = document.createElement('div')
    el.style.cssText =
      'position:absolute;left:0;top:0;width:100%;height:0;display:none;transform-style:preserve-3d;will-change:transform,opacity'
    const tokens = line.tokens.map((tok) => ({ ...tok }) as Placed)
    const { rows, H } = layout(line, tokens)
    for (const tok of tokens) {
      if (tok.kind === 'small') {
        tok.el = word(
          tok.text,
          `font:italic 500 ${tok.size}px ${ITALIC};color:color-mix(in oklab, var(--foreground) 84%, transparent)`
        )
      } else if (tok.kind === 'hero') {
        tok.el = word(
          '',
          `font-family:${DISPLAY};font-weight:900;font-size:${tok.size}px;color:${line.accent};transform-style:preserve-3d`
        )
        tok.letters = [...tok.text].map((ch) => {
          const letter = document.createElement('span')
          letter.textContent = ch
          letter.style.cssText =
            'display:inline-block;transform-origin:50% 80%;will-change:transform,opacity'
          tok.el.append(letter)
          return letter
        })
        tok.el.setAttribute('aria-label', tok.text)
      } else {
        tok.el = word(
          tok.text,
          `font-family:${DISPLAY};font-weight:400;font-size:${tok.size}px;letter-spacing:${TRACK_CONTENT}em;color:var(--foreground)`
        )
      }
      tok.el.style.transformOrigin = `0px ${((tok.kind === 'small' ? BASE_S : BASE_D) * tok.size).toFixed(1)}px`
      tok.el.style.visibility = 'hidden'
      el.append(tok.el)
    }
    const hero = tokens.find((t) => t.kind === 'hero')
    if (hero) {
      const restTop = CY - H / 2
      line.heroAt = [
        ((hero.x + hero.w / 2) / STAGE_W) * 2 - 1,
        -(((restTop + hero.base - (hero.size * CAP) / 2) / STAGE_H) * 2 - 1),
      ]
    }
    let credits: Laid['credits']
    if (line.credit) {
      const row = rows.find((r) => r.credit)!
      const head = word(
        line.credit.title,
        `font:italic 500 46px ${ITALIC};color:var(--foreground);opacity:0`
      )
      const artist = word(
        line.credit.artist.toUpperCase(),
        `font-family:${DISPLAY};font-weight:700;font-size:26px;letter-spacing:0.32em;color:var(--foreground);opacity:0`
      )
      credits = [
        { el: head, top: row.top + 38 - BASE_S * 46 },
        { el: artist, top: row.top + CREDIT_H - BASE_D * 26 },
      ]
      el.append(head, artist)
    }
    stage.append(el)
    return { line, el, tokens, rows, H, hero, credits }
  })

  const header = document.createElement('div')
  header.style.cssText = 'position:absolute;left:0;top:0;opacity:0'
  const headTitle = word(
    title,
    `font:italic 500 30px ${ITALIC};color:var(--foreground)`
  )
  const headSection = word(
    '',
    `font-family:${DISPLAY};font-weight:600;font-size:14px;letter-spacing:0.34em;text-transform:uppercase;color:var(--foreground)`
  )
  const headW = widthPerPx(title, SMALL_FONT) * 30
  headTitle.style.transform = `translate(${X0}px, ${118 - BASE_S * 30}px)`
  headSection.style.transform = `translate(${X0 + headW + 28}px, ${118 - BASE_D * 14}px)`
  header.append(headTitle, headSection)
  stage.append(header)
  probe.remove()

  /* ---------- draw ---------- */

  const LAND = reduced ? 0.001 : 0.42
  const LETTER = reduced ? 0.001 : 0.55
  const STAGGER = reduced ? 0 : 0.038
  const PUSH = reduced ? 0.001 : 0.28

  function stackY(item: Laid, t: number) {
    let h = 0
    for (const row of item.rows) {
      if (t < row.t) continue
      h += (row.h + row.gapAbove) * easeInOut((t - row.t) / PUSH)
    }
    return CY - h / 2
  }

  function drawToken(tok: Placed, t: number, live: boolean, kick: number) {
    const el = tok.el
    if (t < tok.t) {
      put(el, 'visibility', 'hidden')
      return
    }
    put(el, 'visibility', 'visible')
    const dt = t - tok.t
    let z = 0
    let dy = 0
    let scale = 1
    let opacity = 1
    let blur = 0
    if (tok.kind === 'small') {
      const e = easeOut(dt / (LAND * 0.8))
      opacity = e
      dy = (1 - e) * 14
      blur = (1 - e) * 5
    } else if (tok.kind === 'content') {
      const e = easeOut(dt / LAND)
      opacity = clamp01(dt / (LAND * 0.35))
      z = (1 - e) * 320
      blur = (1 - e) * 9
    } else {
      // Letters assemble, tracking settles, then the word breathes with the bass.
      const settle = easeOut(dt / (LETTER * 1.6))
      put(el, 'letter-spacing', `${((1 - settle) * 0.16).toFixed(4)}em`)
      tok.letters!.forEach((letter, i) => {
        const e = easeOut((dt - i * STAGGER) / LETTER)
        put(letter, 'opacity', e.toFixed(3))
        put(
          letter,
          'transform',
          `translate3d(0, ${((1 - e) * 0.42).toFixed(3)}em, ${((1 - e) * -160).toFixed(1)}px) rotateX(${((1 - e) * -78).toFixed(1)}deg)`
        )
        put(
          letter,
          'filter',
          e < 0.999 ? `blur(${((1 - e) * 7).toFixed(1)}px)` : 'none'
        )
      })
      const glow = live ? kick : 0
      if (live && dt > LETTER) scale = 1 + 0.028 * glow
      put(
        el,
        'text-shadow',
        `0 0 ${(26 + glow * 46).toFixed(0)}px color-mix(in oklab, currentColor ${(34 + glow * 30).toFixed(0)}%, transparent), 0 2px 0 color-mix(in oklab, currentColor 60%, black)`
      )
    }
    put(el, 'opacity', opacity.toFixed(3))
    put(el, 'filter', blur > 0.05 ? `blur(${blur.toFixed(1)}px)` : 'none')
    put(
      el,
      'transform',
      `translate3d(${tok.x.toFixed(1)}px, ${(tok.top + dy).toFixed(1)}px, ${z.toFixed(1)}px) scale(${scale.toFixed(4)})`
    )
  }

  function drawLine(item: Laid, t: number, kick: number) {
    const { line } = item
    const on = t >= line.start && t < line.exitAt + line.exitDur
    put(item.el, 'display', on ? 'block' : 'none')
    if (!on) return
    const y = stackY(item, t)
    const out = reduced ? 0 : easeIn((t - line.exitAt) / line.exitDur)
    // A slow drift in depth; the exit lifts the stack up and away.
    const sway = reduced ? 0 : Math.sin(t * 0.21) * 2.2
    const tilt = reduced ? 0 : Math.sin(t * 0.17 + 1) * 1.1
    put(
      item.el,
      'transform',
      `translate3d(0, ${(y - out * 260).toFixed(1)}px, ${(-out * 620).toFixed(1)}px) rotateY(${(4 + sway).toFixed(2)}deg) rotateX(${(tilt + out * 14).toFixed(2)}deg)`
    )
    put(item.el, 'transform-origin', `${X0}px ${(item.H / 2).toFixed(0)}px`)
    put(item.el, 'opacity', (1 - out).toFixed(3))
    const live = t < line.exitAt && t < timeline.outro
    for (const tok of item.tokens) drawToken(tok, t, live, kick)
    if (item.credits && line.credit) {
      const p = easeOut((t - line.credit.t) / (reduced ? 0.001 : 0.9))
      for (const c of item.credits) {
        put(c.el, 'opacity', (p * 0.92).toFixed(3))
        put(
          c.el,
          'transform',
          `translate3d(${X0}px, ${(c.top + 18 * (1 - p)).toFixed(1)}px, 0)`
        )
      }
    }
  }

  function render(time: number) {
    const t = Math.min(Math.max(time, 0), timeline.end)
    const kick = pulse ? kickAt(pulse, t) : 0
    const at = lineIndexAt(timeline, t)
    const current = at >= 0 ? timeline.lines[at] : undefined
    const lyric = current && t >= timeline.firstLyric
    const head = lyric
      ? clamp01((t - timeline.firstLyric) / 0.8) *
        (1 - clamp01((t - timeline.outro) / 0.6))
      : 0
    put(header, 'opacity', (0.6 * head).toFixed(3))
    if (lyric && headSection.textContent !== current.section)
      headSection.textContent = current.section
    for (const item of laid) drawLine(item, t, kick)
  }

  return {
    render,
    dispose: () => {
      root.textContent = ''
    },
  }
}
