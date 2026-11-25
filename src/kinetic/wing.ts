/**
 * The seeress's wing from the Lift Me Higher cover, as a fan of feathers
 * from one root: long pointed primaries sweeping up and out, a rounder
 * lower lobe under them. The constellation in the bridge and the great
 * wings behind the final chorus are both drawn from this one model.
 */
export type Feather = {
  /** Degrees from the horizontal, pointing outward; and the length, 1 being the longest primary. */
  angle: number
  length: number
  /** How far the tip curls back toward the horizontal, in degrees. */
  curl: number
  lower: boolean
}

export const FEATHERS: Feather[] = [
  { angle: 80, length: 0.86, curl: 6, lower: false },
  { angle: 68, length: 1.0, curl: 9, lower: false },
  { angle: 56, length: 1.04, curl: 11, lower: false },
  { angle: 44, length: 1.0, curl: 12, lower: false },
  { angle: 32, length: 0.92, curl: 12, lower: false },
  { angle: 20, length: 0.8, curl: 10, lower: false },
  { angle: 8, length: 0.64, curl: 6, lower: false },
  { angle: -10, length: 0.56, curl: -8, lower: true },
  { angle: -28, length: 0.52, curl: -12, lower: true },
  { angle: -46, length: 0.42, curl: -14, lower: true },
  { angle: -64, length: 0.3, curl: -12, lower: true },
]

const RAD = Math.PI / 180

/** The angle (degrees) and radius of the point `s` (0 root, 1 tip) along a feather. */
export function featherPolar(f: Feather, s: number): [number, number] {
  return [f.angle - f.curl * s * s, f.length * s]
}

/** The same point in x (outward) and y (up), the root at the origin. */
export function featherPoint(f: Feather, s: number): [number, number] {
  const [angle, radius] = featherPolar(f, s)
  return [radius * Math.cos(angle * RAD), radius * Math.sin(angle * RAD)]
}

/** A stroke of the wing: points as [angle, radius], and when (0 to 1) it is drawn. */
export type Stroke = { points: [number, number][]; from: number; to: number }

/**
 * Every line of one wing: each feather's shaft, the scalloped edge from tip
 * to tip, and two ribs across the fan (the lattice of the cover's wings).
 */
export function wingStrokes(): Stroke[] {
  const strokes: Stroke[] = []
  const n = FEATHERS.length
  FEATHERS.forEach((f, i) => {
    const from = (i / n) * 0.55
    strokes.push({
      points: Array.from({ length: 9 }, (_, k) => featherPolar(f, k / 8)),
      from,
      to: from + 0.3,
    })
    const next = FEATHERS[i + 1]
    if (!next) return
    // The edge dips between two tips, as a feather's vane does.
    const [a0, r0] = featherPolar(f, 1)
    const [a1, r1] = featherPolar(next, 1)
    const dip: [number, number] = [(a0 + a1) / 2, Math.min(r0, r1) * 0.8]
    strokes.push({
      points: [[a0, r0], dip, [a1, r1]],
      from: from + 0.28,
      to: from + 0.42,
    })
    for (const at of [0.38, 0.66])
      strokes.push({
        points: [featherPolar(f, at), featherPolar(next, at * 0.96)],
        from: from + 0.1 + at * 0.2,
        to: from + 0.2 + at * 0.2,
      })
  })
  return strokes
}
