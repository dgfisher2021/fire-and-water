/** Fan geometry around the play button's center C, in px; angles run counter-clockwise from 3 o'clock. */
export type Point = { x: number; y: number }

/** The half-ring: band radii, the rim the progress runs on, its span and the scrub zone. */
export const DIAL = {
  outer: 152,
  inner: 94,
  mid: 123,
  rim: 143,
  from: 172,
  to: 8,
  zone: { min: 124, max: 166, from: 178, to: 2 },
  controls: { shuffle: 154, back: 122, next: 58, repeat: 26 },
} as const

export const ORBIT = {
  radius: 112,
  size: 52,
  angles: { shuffle: 155, back: 120, next: 60, repeat: 25 },
  arc: { from: 160, to: 20 },
  pillTop: 174,
} as const

export const DECK = {
  w: 58,
  h: 80,
  pivotBelow: 120,
  rotations: { shuffle: -32, back: -16, cover: 0, next: 16, repeat: 32 },
} as const

const rad = (deg: number) => (deg * Math.PI) / 180
const r1 = (n: number) => Math.round(n * 10) / 10
const pt = (p: Point) => `${r1(p.x)} ${r1(p.y)}`

/** The point at radius r and angle deg from c, in screen coordinates (y down). */
export function polar(c: Point, r: number, deg: number): Point {
  return { x: c.x + r * Math.cos(rad(deg)), y: c.y - r * Math.sin(rad(deg)) }
}

/** An SVG arc from angle `from` clockwise over the top to `to` (from > to). */
export function arcPath(c: Point, r: number, from: number, to: number) {
  const large = from - to > 180 ? 1 : 0
  return `M${pt(polar(c, r, from))} A${r} ${r} 0 ${large} 1 ${pt(polar(c, r, to))}`
}

/** A ring segment with round caps: outer arc, cap, inner arc back, cap. */
export function bandPath(
  c: Point,
  outer: number,
  inner: number,
  from: number,
  to: number
) {
  const cap = (outer - inner) / 2
  const large = from - to > 180 ? 1 : 0
  return [
    `M${pt(polar(c, outer, from))}`,
    `A${outer} ${outer} 0 ${large} 1 ${pt(polar(c, outer, to))}`,
    `A${cap} ${cap} 0 0 1 ${pt(polar(c, inner, to))}`,
    `A${inner} ${inner} 0 ${large} 0 ${pt(polar(c, inner, from))}`,
    `A${cap} ${cap} 0 0 1 ${pt(polar(c, outer, from))}`,
    'Z',
  ].join(' ')
}

/** Where along the dial's rim an angle falls: 0 at its start, 1 at its end. */
export function dialFraction(deg: number) {
  const f = (DIAL.from - deg) / (DIAL.from - DIAL.to)
  return Math.min(1, Math.max(0, f))
}

/** Whether a point is on the dial's scrub zone, and how far along it. */
export function dialHit(c: Point, p: Point) {
  const dx = p.x - c.x
  const dy = c.y - p.y
  const r = Math.hypot(dx, dy)
  const deg = (Math.atan2(dy, dx) * 180) / Math.PI
  const { zone } = DIAL
  return {
    inZone:
      r >= zone.min && r <= zone.max && deg >= zone.to && deg <= zone.from,
    fraction: dialFraction(deg),
  }
}
