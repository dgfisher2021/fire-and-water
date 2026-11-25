/**
 * The 1920x1080 stage the typography is laid out on, and the pose a line
 * holds on it. The DOM text layer and the 3D scene share these, so letters
 * drawn in the canvas land where the DOM would have put them.
 */
export const STAGE_W = 1920
export const STAGE_H = 1080
/** The left edge every line is flush to, and the hinge of its 3D pose. */
export const X0 = 200
export const PERSPECTIVE = 1700
export const VANISH_X = 0.38 * STAGE_W
export const VANISH_Y = STAGE_H / 2

/** A line's place on the stage: its top, its turn and tilt in degrees, its hinge height. */
export type Pose = { y: number; rotY: number; rotX: number; hinge: number }

const RAD = Math.PI / 180

/**
 * Where a point of a posed line lands on the stage, as CSS projects it
 * (`translate3d rotateY rotateX` about the hinge, under the stage's
 * perspective). Writes x, y and the perspective scale into `out`.
 */
export function project(
  pose: Pose,
  x: number,
  y: number,
  z: number,
  out: [number, number, number]
) {
  const a = pose.rotY * RAD
  const b = pose.rotX * RAD
  const qx = x - X0
  const qy = y - pose.hinge
  const y1 = qy * Math.cos(b) - z * Math.sin(b)
  const z1 = qy * Math.sin(b) + z * Math.cos(b)
  const x2 = qx * Math.cos(a) + z1 * Math.sin(a)
  const z2 = -qx * Math.sin(a) + z1 * Math.cos(a)
  const s = PERSPECTIVE / (PERSPECTIVE - z2)
  out[0] = VANISH_X + (x2 + X0 - VANISH_X) * s
  out[1] = VANISH_Y + (y1 + pose.hinge + pose.y - VANISH_Y) * s
  out[2] = s
  return out
}
