import {
  inkOf,
  layoutLine,
  problemsOf,
  type Metrics,
  type Row,
  type Slot,
} from './layout'
import { MATERIALS, type Material } from './materials'
import type { Signals } from './signals'
import type { LineStyle } from './songs'
import type { Stage } from './stage'
import type { KineticLine, Timeline, Token } from './timeline'
import { flashAt, lineIndexAt, sandAt } from './timeline'

/**
 * The typography of the kinetic film: a stage of plain DOM text (`stage.ts`),
 * laid out once and drawn for any song time. Each line builds as a
 * flush-left stack in 3D space and arrives and leaves the way its section
 * does; a word with a material is painted as what it says (gold foil, flame,
 * ice) and keeps moving the way it means; the hero assembles letter by
 * letter, unless the scene casts it in solid letters or sand.
 */

const HERO_FONT = "900 1000px 'Cinzel Variable'"
const DISPLAY = "'Cinzel Variable', 'Cormorant Garamond', serif"
const ITALIC = "'Cormorant Garamond', ui-serif, Georgia, serif"
const TRACK_CONTENT = 0.05

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (v: number) => {
  const x = clamp01(v)
  return x * x * (3 - 2 * x)
}
const easeOut = (v: number) => 1 - Math.pow(1 - clamp01(v), 4)
const easeInOut = (v: number) => {
  const x = clamp01(v)
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}
const easeIn = (v: number) => Math.pow(clamp01(v), 3)
const backOut = (v: number) => {
  const x = clamp01(v) - 1
  return 1 + 2.4 * x * x * x + 1.4 * x * x
}
/** A CSS cubic-bezier curve, solved for x. */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const at = (a: number, b: number, s: number) =>
    3 * a * s * (1 - s) * (1 - s) + 3 * b * s * s * (1 - s) + s * s * s
  return (v: number) => {
    const x = clamp01(v)
    let s = x
    for (let i = 0; i < 6; i++) {
      const d =
        3 * x1 * (1 - s) * (1 - 3 * s) + 3 * x2 * s * (2 - 3 * s) + 3 * s * s
      if (Math.abs(d) < 1e-5) break
      s = clamp01(s - (at(x1, x2, s) - x) / d)
    }
    return at(y1, y2, s)
  }
}
/** The motion kit's wipe curve (MotionText preset='wipe'). */
const wipe = bezier(0.76, 0, 0.24, 1)
const frac = (v: number) => v - Math.floor(v)
const hash = (n: number) => frac(Math.sin(n * 127.1) * 43758.5453)
/** Smooth noise, 0 to 1. */
const noise = (x: number) => {
  const i = Math.floor(x)
  const f = x - i
  return hash(i) + (hash(i + 1) - hash(i)) * f * f * (3 - 2 * f)
}

type Letter = { el: HTMLElement; left: number; w: number }
type Placed = Token &
  Slot & {
    el: HTMLElement
    /** The letters' holder, the letters and the blurred copy behind them. */
    face?: HTMLElement
    letters?: Letter[]
    glow?: HTMLElement
    mat?: Material
    /** Words landed before this one in its line, 0 to 1. */
    rank: number
  }
type Laid = {
  line: KineticLine
  el: HTMLElement
  tokens: Placed[]
  rows: Row[]
  H: number
  hero?: Placed
  credits?: { el: HTMLElement; top: number }[]
}
/** What the film hears at the frame being drawn, and the storm's lightning. */
type Signal = {
  kick: number
  bass: number
  vocal: number
  mid: number
  flash: number
}

/** A line that does not fit its stage, and why. */
export type LineReport = { line: string; problems: string[] }

export type TextEngine = {
  render: (time: number, heard: Signals | null) => void
  /** Every line's built stack checked against the stage: overlaps and margins. */
  check: () => LineReport[]
  dispose: () => void
}

export function createTextEngine(
  root: HTMLElement,
  timeline: Timeline,
  reduced: boolean,
  stage: Stage
): TextEngine {
  root.textContent = ''
  const beat = timeline.beat
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

  /** A word set letter by letter: no kerning, the tracking after each letter. */
  const letterW = (ch: string, hero: boolean) =>
    hero
      ? widthPerPx(ch, HERO_FONT)
      : widthPerPx(ch, CONTENT_FONT, TRACK_CONTENT)
  const metrics: Metrics = {
    cap: CAP,
    ascSmall: ASC_S,
    baseDisplay: BASE_D,
    baseSmall: BASE_S,
    small: (text) => widthPerPx(text, SMALL_FONT),
    content: (text) => widthPerPx(text, CONTENT_FONT, TRACK_CONTENT),
    letter: letterW,
  }

  /* ---------- DOM ---------- */

  const board = document.createElement('div')
  board.style.cssText = `position:absolute;left:0;top:0;width:${stage.w}px;height:${stage.h}px;perspective:${stage.perspective}px;perspective-origin:${stage.vanishX}px ${stage.vanishY}px`
  root.append(board)
  const word = (text: string, css: string) => {
    const el = document.createElement('span')
    el.textContent = text
    el.style.cssText = `position:absolute;left:0;top:0;white-space:nowrap;will-change:transform,opacity;${css};line-height:1`
    return el
  }

  /** The letters' paint: the material's layers clipped to the glyphs. */
  function paint(tok: Placed, mat: Material, accent: string) {
    const colour = (c: string) =>
      c.replace(/ACCENT/g, accent).replace(/FG/g, 'var(--foreground)')
    const fill = mat.fill
    const layered = typeof fill !== 'string' || !!mat.over || !!mat.sheen
    const edge = mat.edge ? `-webkit-text-stroke:${colour(mat.edge)};` : ''
    if (!layered) return { css: `color:${colour(fill as string)};${edge}` }
    const capTop = BASE_D - CAP
    const base =
      typeof fill === 'string'
        ? `linear-gradient(${colour(fill)}, ${colour(fill)})`
        : `linear-gradient(180deg, ${fill
            .map(
              ([s, c]) =>
                `${colour(c)} ${((capTop + s * CAP) * 100).toFixed(1)}%`
            )
            .join(', ')})`
    const images: string[] = []
    const sizes: string[] = []
    const repeats: string[] = []
    const sheenW = tok.size * 1.15
    if (mat.sheen) {
      images.push(
        `linear-gradient(102deg, transparent 30%, ${mat.sheen[0]} 50%, transparent 70%)`
      )
      sizes.push(`${sheenW.toFixed(0)}px 100%`)
      repeats.push('no-repeat')
    }
    if (mat.over) {
      images.push(mat.over)
      sizes.push('auto')
      repeats.push('repeat')
    }
    images.push(base)
    sizes.push(mat.motion === 'flicker' ? '100% 140%' : '100% 100%')
    repeats.push('no-repeat')
    return {
      css: `background-image:${images.join(', ')};background-size:${sizes.join(', ')};background-repeat:${repeats.join(', ')};-webkit-background-clip:text;background-clip:text;color:transparent;${edge}`,
      /** The layers' positions for a letter: the sheen at `sx`, the fill slid by `fy`. */
      position: (left: number, sx: number, fy: number) =>
        [
          ...(mat.sheen ? [`${(sx - left).toFixed(1)}px 0`] : []),
          ...(mat.over ? [`${(-left).toFixed(1)}px 0`] : []),
          `0 ${fy.toFixed(1)}px`,
        ].join(', '),
      sheenW,
    }
  }
  const painters = new WeakMap<Placed, ReturnType<typeof paint>>()

  const laid: Laid[] = timeline.lines.map((line) => {
    const el = document.createElement('div')
    el.style.cssText =
      'position:absolute;left:0;top:0;width:100%;height:0;display:none;transform-style:preserve-3d;will-change:transform,opacity'
    const tokens = line.tokens.map(
      (tok, i) =>
        ({
          ...tok,
          rank: line.tokens.length > 1 ? i / (line.tokens.length - 1) : 0,
          mat: tok.material ? MATERIALS[tok.material] : undefined,
          lettered: !!tok.material,
        }) as Placed
    )
    const { rows, H } = layoutLine(
      stage,
      metrics,
      tokens,
      line.credit?.t,
      line.reserve
    )
    for (const tok of tokens) {
      const mat = tok.mat
      if (tok.kind === 'small') {
        tok.el = word(
          tok.text,
          `font:italic 500 ${tok.size}px ${ITALIC};color:color-mix(in oklab, var(--foreground) 84%, transparent)`
        )
      } else if (mat) {
        const hero = tok.kind === 'hero'
        tok.el = word(
          '',
          `font-family:${DISPLAY};font-weight:${hero ? 900 : 400};font-size:${tok.size}px;${hero ? '' : `letter-spacing:${TRACK_CONTENT}em;`}transform-style:preserve-3d`
        )
        if (mat.glow) {
          const blur = Math.min(26, Math.max(8, tok.size * 0.09))
          tok.glow = document.createElement('span')
          tok.glow.textContent = tok.text
          tok.glow.setAttribute('aria-hidden', 'true')
          tok.glow.style.cssText = `position:absolute;left:0;top:0;color:${mat.glow.replace(/ACCENT/g, line.accent)};filter:blur(${blur.toFixed(0)}px);opacity:0;will-change:opacity;pointer-events:none`
          tok.el.append(tok.glow)
        }
        const painter = paint(tok, mat, line.accent)
        painters.set(tok, painter)
        tok.face = document.createElement('span')
        tok.face.style.cssText = `position:relative;display:inline-block;transform-style:preserve-3d${mat.mask ? `;-webkit-mask-image:${mat.mask};mask-image:${mat.mask}` : ''}`
        let left = 0
        tok.letters = [...tok.text].map((ch) => {
          const letter = document.createElement('span')
          letter.textContent = ch
          letter.style.cssText = `display:inline-block;transform-origin:50% 80%;will-change:transform,opacity;${painter.css}`
          tok.face!.append(letter)
          const w = letterW(ch, hero) * tok.size
          const at = { el: letter, left, w }
          left += w
          return at
        })
        tok.el.append(tok.face)
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
      const restTop = stage.cy - H / 2
      line.heroAt = [
        ((hero.x + hero.w / 2) / stage.w) * 2 - 1,
        -(((restTop + hero.base - (hero.size * CAP) / 2) / stage.h) * 2 - 1),
      ]
      if (line.heroWord) {
        const cap = hero.size * CAP
        line.heroWord.box = [hero.x, hero.base - cap, hero.w, cap]
        line.heroWord.pose.hinge = H / 2
      }
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
        { el: artist, top: row.top + stage.creditH - BASE_D * 26 },
      ]
      el.append(head, artist)
    }
    board.append(el)
    return { line, el, tokens, rows, H, hero, credits }
  })
  probe.remove()

  /* ---------- draw ---------- */

  const PUSH = reduced ? 0.001 : 0.28
  const LETTER = 0.55
  const STAGGER = 0.038
  const SIXTEENTH = beat / 4

  function stackY(item: Laid, t: number) {
    let h = 0
    for (const row of item.rows) {
      if (t < row.t) continue
      h += (row.h + row.gapAbove) * easeInOut((t - row.t) / PUSH)
    }
    return stage.cy - h / 2
  }
  const swayOf = (t: number) => (reduced ? 0 : Math.sin(t * 0.21) * 2.2)
  const tiltOf = (t: number) => (reduced ? 0 : Math.sin(t * 0.17 + 1) * 1.1)

  /** A turn that arrives in three ticks of the sixteenth-note grid. */
  const ticked = (dt: number) => {
    const f = dt / SIXTEENTH
    const step = Math.floor(f)
    return clamp01((step + backOut((f - step) / 0.55)) / 3)
  }

  // One word's drawing state, reused for every word.
  const S = {
    opacity: 1,
    dx: 0,
    dy: 0,
    z: 0,
    scale: 1,
    scaleY: 1,
    blur: 0,
    clip: 0,
    track: 0,
    rotX: 0,
    rot: 0,
    skew: 0,
    glow: 0,
  }

  /** How a whole word arrives: by its material, else the way its section does. */
  function enter(kind: string, dt: number, size: number) {
    switch (kind) {
      case 'rise': {
        const e = easeOut(dt / 0.5)
        S.opacity = e
        S.dy = (1 - e) * 0.4 * size
        S.blur = (1 - e) * 8
        break
      }
      case 'unveil':
      case 'write': {
        const e = wipe(dt / (kind === 'write' ? 0.85 : 0.7))
        S.clip = 1 - e
        S.dx = (1 - e) * -16
        break
      }
      case 'title': {
        const e = easeOut(dt / 1.1)
        S.opacity = e
        S.z = (1 - e) * 420
        S.blur = (1 - e) * 12
        break
      }
      case 'clockwork': {
        const e = ticked(dt)
        S.rotX = (1 - e) * -86
        S.opacity = clamp01(e * 2.5)
        break
      }
      case 'dissolve': {
        const e = easeOut(dt / 0.9)
        S.opacity = smooth(dt / 0.9)
        S.blur = (1 - e) * 10
        S.scale = 1.05 - 0.05 * e
        S.track = (1 - e) * 0.06
        break
      }
      case 'soft': {
        S.opacity = smooth(dt / 1.1)
        S.blur = (1 - easeOut(dt / 1.1)) * 6
        break
      }
      case 'pull': {
        const e = easeInOut(dt / 1.1)
        S.opacity = clamp01(dt / 0.3)
        S.track = (1 - e) * 0.55
        break
      }
      case 'appear': {
        const e = smooth(dt / 1.6)
        S.opacity = e * e
        S.blur = (1 - e) * 3
        break
      }
      case 'climb': {
        const e = easeOut(dt / 0.75)
        S.opacity = clamp01(dt / 0.25)
        S.dy = (1 - e) * 1.1 * size
        S.blur = (1 - e) * 6
        break
      }
      case 'assemble':
      case 'tick':
      case 'fall':
        break
      default: {
        // lift: thrown forward out of depth
        const e = easeOut(dt / 0.42)
        S.opacity = clamp01(dt / 0.15)
        S.z = (1 - e) * 320
        S.blur = (1 - e) * 9
      }
    }
  }

  // One letter's state on top of its word's.
  const L = { opacity: 1, dy: 0, dx: 0, z: 0, rotX: 0, rot: 0, sy: 1, blur: 0 }

  function drawLetters(
    tok: Placed,
    mat: Material,
    kind: string,
    t: number,
    dt: number,
    sig: Signal,
    erode: number
  ) {
    const letters = tok.letters!
    const n = letters.length
    const size = tok.size
    const painter = painters.get(tok)!
    const motion = reduced ? undefined : mat.motion
    // Motions ease in once the word has landed.
    const m = smooth((dt - 0.35) / 0.6)
    let sheenX = -1e4
    if (mat.sheen && painter.sheenW && !reduced) {
      const ph = frac(dt / (mat.sheen[1] * beat))
      sheenX =
        -painter.sheenW + (tok.w + painter.sheenW * 2) * clamp01(ph / 0.55)
    }
    for (let i = 0; i < n; i++) {
      const letter = letters[i]
      L.opacity = 1
      L.dy = L.dx = L.z = L.rotX = L.rot = L.blur = 0
      L.sy = 1
      if (kind === 'assemble') {
        const e = easeOut((dt - i * STAGGER) / LETTER)
        L.opacity = e
        L.dy = (1 - e) * 0.42 * size
        L.z = (1 - e) * -160
        L.rotX = (1 - e) * -78
        L.blur = (1 - e) * 7
      } else if (kind === 'tick') {
        const e = ticked(dt - i * (SIXTEENTH / 2))
        L.opacity = clamp01(e * 3)
        L.rot = (1 - e) * -90
        L.dy = (1 - e) * -0.12 * size
      } else if (kind === 'fall') {
        const e = easeOut((dt - i * 0.055) / 0.5)
        L.opacity = clamp01((dt - i * 0.055) / 0.12)
        L.dy = (1 - e) * -1.5 * size
        L.sy = 1 + (1 - e) * 0.7
      }
      let fy = 0
      switch (motion) {
        case 'rise':
          L.dy -=
            m *
            size *
            ((0.012 + (0.05 * i) / n) * smooth(dt / 3) +
              0.012 * Math.sin(t * 1.3 + i * 0.8))
          break
        case 'wave':
          L.dy += m * size * 0.05 * Math.sin(t * 1.7 - i * 0.75)
          L.rot += m * 2.5 * Math.cos(t * 1.7 - i * 0.75)
          break
        case 'sway':
          L.rot += m * 7 * Math.sin((t * Math.PI) / (beat * 2) + i * 0.9)
          L.dy += m * size * 0.025 * Math.cos((t * Math.PI) / beat + i * 0.9)
          break
        case 'bend': {
          const k = i - (n - 1) / 2
          const e = m * smooth((dt - 0.3) / 1.2)
          L.rot += k * 4.2 * e
          L.dy += k * k * 0.014 * size * e
          break
        }
        case 'crack': {
          const e = easeOut((dt - 0.5) / 0.16)
          const side = i < n / 2 ? -1 : 1
          L.dx += side * e * 0.05 * size
          L.dy += (i % 2 ? 1 : -1) * e * 0.035 * size
          L.rot += (i % 2 ? 2.6 : -3.2) * e
          break
        }
        case 'tremble':
          L.dx += m * (noise(t * 19 + i * 7.3) - 0.5) * 0.022 * size
          L.dy += m * (noise(t * 23 + i * 3.1 + 40) - 0.5) * 0.026 * size
          L.rot += m * (noise(t * 13 + i * 5.7 + 80) - 0.5) * 2.2
          break
        case 'flicker': {
          const f = noise(t * 9 + i * 2.7)
          L.sy *= 1 + m * (0.035 + 0.05 * sig.bass) * f
          L.dy -= m * size * 0.012 * f
          L.rot += m * (noise(t * 5 + i * 9.1) - 0.5) * 2.4
          fy = -0.4 * size * m * (0.25 + 0.75 * noise(t * 3.3 + i * 1.9))
          break
        }
        case 'tick':
          L.rot +=
            (Math.floor(t / beat) % 2 ? 1 : -1) *
            3.2 *
            Math.exp(-frac(t / beat) * 7) *
            m *
            (i % 2 ? 1 : -1)
          break
        case 'jitter':
          L.dx +=
            (hash(Math.floor(t * 30) + i * 3.7) - 0.5) * 0.07 * size * sig.kick
          break
      }
      // Turning to sand: the letters thin from the far end first.
      if (erode > 0)
        L.opacity *= 1 - smooth(erode * 1.6 - (1 - (i + 0.5) / n) * 0.6)
      const el = letter.el
      put(el, 'opacity', L.opacity.toFixed(3))
      put(
        el,
        'transform',
        `translate3d(${L.dx.toFixed(2)}px, ${L.dy.toFixed(2)}px, ${L.z.toFixed(1)}px) rotateX(${L.rotX.toFixed(1)}deg) rotate(${L.rot.toFixed(2)}deg) scaleY(${L.sy.toFixed(3)})`
      )
      put(el, 'filter', L.blur > 0.05 ? `blur(${L.blur.toFixed(1)}px)` : 'none')
      if (painter.position)
        put(
          el,
          'background-position',
          painter.position(letter.left, sheenX, fy)
        )
    }
  }

  /** What a landed word keeps doing, as a whole. */
  function move(
    mat: Material,
    t: number,
    dt: number,
    sig: Signal,
    size: number
  ) {
    const m = smooth((dt - 0.35) / 0.6)
    switch (mat.motion) {
      case 'breathe':
        S.scale *= 1 + m * 0.04 * Math.sin((t * Math.PI) / (beat * 4))
        S.glow *= 1 + m * 0.4 * Math.sin((t * Math.PI) / (beat * 4))
        break
      case 'pulse':
        S.scale *= 1 + 0.08 * sig.kick
        S.glow *= 0.7 + 0.6 * sig.kick
        break
      case 'sub':
        S.scale *= 1 + m * 0.1 * sig.bass
        break
      case 'voice':
        S.scale *= 1 + m * 0.06 * sig.vocal
        S.glow *= 0.6 + 0.6 * sig.vocal
        break
      case 'lean':
        S.skew = -15 * easeInOut((dt - 0.25) / 1.1)
        break
      case 'sink':
        S.dy += 0.17 * size * easeInOut((dt - 0.2) / 1.4)
        break
      case 'fade':
        S.opacity *= 1 - 0.7 * smooth((dt - 0.5) / 2.6)
        break
      case 'brief':
        S.opacity *= 1 - 0.74 * smooth((dt - 0.5) / 0.5)
        break
      case 'float':
        S.dx += m * 7 * Math.sin(t * 0.6)
        S.dy += m * 5 * Math.sin(t * 0.9 + 1)
        break
      case 'air':
        S.track += 0.2 * easeInOut(dt / 3.2)
        S.opacity *= 1 - 0.25 * smooth(dt / 3.2)
        break
      case 'hum':
        S.dx += m * 1.3 * Math.sin(t * 96)
        S.dy += m * 0.9 * Math.sin(t * 121)
        break
      case 'jitter':
        S.glow *= 0.75 + 0.5 * sig.kick
        break
      case 'flash':
        S.glow = Math.min(1, S.glow + 1.6 * sig.flash)
        S.scale *= 1 + 0.02 * sig.flash
        break
      case 'flicker':
        S.glow *= 0.55 + 0.35 * noise(t * 8) + 0.4 * sig.bass
        break
      case 'tremble':
        S.glow *= 0.7 + 0.5 * noise(t * 6)
        break
    }
  }

  function drawToken(
    item: Laid,
    tok: Placed,
    t: number,
    live: boolean,
    sig: Signal,
    out: number
  ) {
    const el = tok.el
    if (t < tok.t) {
      put(el, 'visibility', 'hidden')
      return
    }
    put(el, 'visibility', 'visible')
    const line = item.line
    const dt = reduced ? 9 : t - tok.t
    const mat = tok.mat
    S.opacity = S.scale = S.scaleY = 1
    S.dx = S.dy = S.z = S.blur = S.clip = S.track = S.rotX = S.rot = S.skew = 0
    S.glow = mat?.glowLevel ?? 0.6
    const hero = tok.kind === 'hero'
    if (tok.kind === 'small') {
      const e = easeOut(dt / 0.34)
      S.opacity = e
      S.dy = (1 - e) * 14
      S.blur = (1 - e) * 5
    } else {
      const kind = mat?.enter ?? (hero ? 'assemble' : line.style)
      enter(kind, dt, tok.size)
      if (mat) {
        const word = hero ? line.heroWord : undefined
        const sand = reduced ? undefined : word?.sand
        // The scene draws this word itself: keep it for readers, not for eyes.
        const cast = !!word?.solid || sand?.mode === 'form'
        const settle = kind === 'assemble' ? easeOut(dt / (LETTER * 1.6)) : 1
        if (kind === 'assemble') S.track += (1 - settle) * 0.16
        if (!reduced) move(mat, t, dt, sig, tok.size)
        if (hero && live && dt > LETTER) S.scale *= 1 + 0.028 * sig.kick
        const erode =
          sand && sand.mode === 'scatter' ? clamp01((t - sand.out0) / 0.5) : 0
        if (cast) {
          put(tok.face!, 'opacity', '0')
        } else {
          put(tok.face!, 'opacity', (mat.alpha ?? 1).toFixed(2))
          drawLetters(tok, mat, kind, t, dt, sig, erode)
          if (mat.motion === 'echo') {
            const d =
              tok.size * 0.085 * easeOut(dt / 1.4) * (1 + 0.2 * sig.kick)
            put(
              tok.face!,
              'text-shadow',
              [1, 2, 3]
                .map(
                  (k) =>
                    `${(d * k).toFixed(1)}px ${(-d * k * 0.45).toFixed(1)}px 0 color-mix(in oklab, currentColor ${[30, 15, 7][k - 1]}%, transparent)`
                )
                .join(', ')
            )
          }
        }
        if (tok.glow) {
          const level =
            sand?.mode === 'form'
              ? 0.3
              : word?.solid
                ? 0
                : S.glow *
                  settle *
                  S.opacity *
                  (1 - erode) *
                  (hero && live
                    ? 0.75 + 0.5 * sig.kick
                    : live
                      ? 0.82 + 0.4 * sig.mid
                      : 1)
          put(tok.glow, 'opacity', clamp01(level).toFixed(3))
        }
      }
    }
    // Leaving word by word, the first sung first.
    if (out > 0 && (line.style === 'unveil' || line.style === 'dissolve')) {
      const o = smooth(out * 1.6 - tok.rank * 0.6)
      S.opacity *= 1 - o
      if (line.style === 'unveil') S.dx += o * 26
      else S.blur += o * 8
    }
    put(el, 'opacity', S.opacity.toFixed(3))
    put(el, 'filter', S.blur > 0.05 ? `blur(${S.blur.toFixed(1)}px)` : 'none')
    put(
      el,
      'clip-path',
      S.clip > 0.002
        ? `inset(-40% ${(S.clip * 100).toFixed(1)}% -40% -10%)`
        : 'none'
    )
    put(
      el,
      'letter-spacing',
      S.track > 0.0005 || tok.kind === 'content'
        ? `${(S.track + (tok.kind === 'content' ? TRACK_CONTENT : 0)).toFixed(4)}em`
        : 'normal'
    )
    put(
      el,
      'transform',
      `translate3d(${(tok.x + S.dx).toFixed(1)}px, ${(tok.top + S.dy).toFixed(1)}px, ${S.z.toFixed(1)}px) rotateX(${S.rotX.toFixed(1)}deg) skewX(${S.skew.toFixed(2)}deg) scale(${S.scale.toFixed(4)})`
    )
  }

  /** How a line leaves, by its section's style. Returns its opacity. */
  function leave(
    item: Laid,
    style: LineStyle,
    out: number,
    y: number,
    t: number
  ) {
    const sway = swayOf(t)
    const tilt = tiltOf(t)
    let dy = 0
    let dx = 0
    let z = 0
    let rotX = tilt
    let opacity = 1
    let blur = 0
    let scale = 1
    switch (style) {
      case 'lift': {
        const o = easeIn(out)
        dy = -260 * o
        z = -620 * o
        rotX += 14 * o
        opacity = 1 - o
        break
      }
      case 'clockwork': {
        const o = clamp01(Math.ceil(out * 3 - 0.001) / 3)
        const snap = out <= 0 ? 0 : o - (1 / 3) * (1 - backOut(frac(out * 3)))
        rotX += 84 * clamp01(snap)
        opacity = 1 - out * out
        break
      }
      case 'unveil':
        dx = 18 * easeInOut(out)
        break
      case 'dissolve': {
        const o = easeInOut(out)
        scale = 1 + 0.04 * o
        opacity = 1 - o
        blur = 6 * o
        break
      }
      default: {
        // title, rise: up into a blur
        const o = easeInOut(out)
        dy = -64 * o
        z = -140 * o
        opacity = 1 - o
        blur = 9 * o
      }
    }
    put(
      item.el,
      'transform',
      `translate3d(${dx.toFixed(1)}px, ${(y + dy).toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${(4 + sway).toFixed(2)}deg) rotateX(${rotX.toFixed(2)}deg) scale(${scale.toFixed(4)})`
    )
    put(item.el, 'filter', blur > 0.05 ? `blur(${blur.toFixed(1)}px)` : 'none')
    return opacity
  }

  /** Tells the scene where a line's hero stands. */
  function publish(item: Laid, t: number) {
    const word = item.line.heroWord
    if (!word) return
    const ts = Math.min(t, item.line.exitAt)
    word.pose.y = stackY(item, ts)
    word.pose.rotY = 4 + swayOf(ts)
    word.pose.rotX = tiltOf(ts)
  }

  function drawLine(item: Laid, t: number, sig: Signal) {
    const { line } = item
    const on = t >= line.start && t < line.exitAt + line.exitDur
    put(item.el, 'display', on ? 'block' : 'none')
    if (!on) return
    publish(item, t)
    const y = stackY(item, t)
    const out = reduced ? 0 : clamp01((t - line.exitAt) / line.exitDur)
    put(
      item.el,
      'transform-origin',
      `${stage.x0}px ${(item.H / 2).toFixed(0)}px`
    )
    put(item.el, 'opacity', leave(item, line.style, out, y, t).toFixed(3))
    const live = t < line.exitAt && t < timeline.outro
    for (const tok of item.tokens) drawToken(item, tok, t, live, sig, out)
    if (item.credits && line.credit) {
      const p = easeOut((t - line.credit.t) / (reduced ? 0.001 : 0.9))
      for (const c of item.credits) {
        put(c.el, 'opacity', (p * 0.92).toFixed(3))
        put(
          c.el,
          'transform',
          `translate3d(${stage.x0}px, ${(c.top + 18 * (1 - p)).toFixed(1)}px, 0)`
        )
      }
    }
  }

  const sig: Signal = { kick: 0, bass: 0, vocal: 0, mid: 0, flash: 0 }

  function render(time: number, heard: Signals | null) {
    const t = Math.min(Math.max(time, 0), timeline.end)
    sig.kick = heard?.kick ?? 0
    sig.bass = heard?.bass ?? 0
    sig.vocal = heard?.vocal ?? 0
    sig.mid = heard?.mid ?? 0
    sig.flash = flashAt(t)
    for (const item of laid) drawLine(item, t, sig)
    // The sand outlives its line: keep its word placed.
    const sand = sandAt(timeline, t)
    if (sand) {
      const at = lineIndexAt(timeline, sand.t)
      if (at >= 0 && laid[at].line.heroWord === sand) publish(laid[at], t)
    }
  }

  const check = () =>
    laid.flatMap((item): LineReport[] => {
      const problems = problemsOf(
        stage,
        inkOf(stage, metrics, item.tokens, item.H),
        item.H,
        item.line.reserve
      )
      const name = item.line.text ?? item.tokens.map((t) => t.text).join(' ')
      return problems.length ? [{ line: name, problems }] : []
    })

  return {
    render,
    check,
    dispose: () => {
      root.textContent = ''
    },
  }
}
