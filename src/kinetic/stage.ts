/**
 * The stage the typography is laid out on, and the pose a line holds on it.
 * There are two: 1920x1080 for a wide window and 1080x1920 for a phone held
 * upright. The DOM text layer and the 3D scene share them, so letters drawn
 * in the canvas land where the DOM would have put them.
 */
export type Stage = {
  name: 'landscape' | 'portrait'
  w: number
  h: number
  /** The left edge every line is flush to, and the hinge of its 3D pose. */
  x0: number
  /** The margin kept clear on the right, and above and below the stack. */
  safe: number
  safeY: number
  perspective: number
  vanishX: number
  vanishY: number
  /** The stack's centre line. */
  cy: number
  stackMax: number
  stackMaxCredit: number
  heroMaxW: number
  heroMaxCap: number
  heroMinCap: number
  content: { size: number; min: number }
  small: number
  gap: number
  heroGap: number
  creditGap: number
  creditH: number
  inner: number
  /** The running header's top, and the type sizes of the header and the cards. */
  headerTop: number
  cardSize: number
}

export const LANDSCAPE: Stage = {
  name: 'landscape',
  w: 1920,
  h: 1080,
  x0: 200,
  safe: 120,
  safeY: 130,
  perspective: 1700,
  vanishX: 0.38 * 1920,
  vanishY: 540,
  cy: 540,
  stackMax: 700,
  stackMaxCredit: 800,
  heroMaxW: 1480,
  heroMaxCap: 270,
  heroMinCap: 200,
  content: { size: 124, min: 96 },
  small: 78,
  gap: 38,
  heroGap: 50,
  creditGap: 70,
  creditH: 96,
  inner: 20,
  headerTop: 88,
  cardSize: 58,
}

export const PORTRAIT: Stage = {
  name: 'portrait',
  w: 1080,
  h: 1920,
  x0: 84,
  safe: 64,
  safeY: 300,
  perspective: 1700,
  vanishX: 0.42 * 1080,
  vanishY: 960,
  cy: 960,
  stackMax: 1240,
  stackMaxCredit: 1300,
  heroMaxW: 932,
  heroMaxCap: 250,
  heroMinCap: 150,
  content: { size: 108, min: 68 },
  small: 66,
  gap: 34,
  heroGap: 46,
  creditGap: 64,
  creditH: 96,
  inner: 18,
  headerTop: 150,
  cardSize: 50,
}

/** A window narrower than this (width over height) gets the portrait stage. */
export const PORTRAIT_BELOW = 0.8

export const stageFor = (width: number, height: number): Stage =>
  width / Math.max(height, 1) < PORTRAIT_BELOW ? PORTRAIT : LANDSCAPE

/** How a stage sits in a window: its scale, and its top-left corner in CSS px. */
export function fitStage(stage: Stage, width: number, height: number) {
  const scale = Math.min(width / stage.w, height / stage.h)
  return {
    scale,
    left: (width - stage.w * scale) / 2,
    top: (height - stage.h * scale) / 2,
  }
}

/** A line's place on the stage: its top, its turn and tilt in degrees, its hinge height. */
export type Pose = { y: number; rotY: number; rotX: number; hinge: number }

const RAD = Math.PI / 180

/**
 * Where a point of a posed line lands on the stage, as CSS projects it
 * (`translate3d rotateY rotateX` about the hinge, under the stage's
 * perspective). Writes x, y and the perspective scale into `out`.
 */
export function project(
  stage: Stage,
  pose: Pose,
  x: number,
  y: number,
  z: number,
  out: [number, number, number]
) {
  const a = pose.rotY * RAD
  const b = pose.rotX * RAD
  const qx = x - stage.x0
  const qy = y - pose.hinge
  const y1 = qy * Math.cos(b) - z * Math.sin(b)
  const z1 = qy * Math.sin(b) + z * Math.cos(b)
  const x2 = qx * Math.cos(a) + z1 * Math.sin(a)
  const z2 = -qx * Math.sin(a) + z1 * Math.cos(a)
  const s = stage.perspective / (stage.perspective - z2)
  out[0] = stage.vanishX + (x2 + stage.x0 - stage.vanishX) * s
  out[1] = stage.vanishY + (y1 + pose.hinge + pose.y - stage.vanishY) * s
  out[2] = s
  return out
}
