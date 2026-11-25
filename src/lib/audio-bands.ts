/**
 * The arithmetic of listening to a song live: band levels out of an
 * analyser's spectrum, an envelope with its own attack and release, and an
 * onset detector for the hits. Pure, so it is tested without a browser.
 */

/** The bands the film listens to, in Hz. */
export const BANDS = {
  sub: [28, 70],
  bass: [45, 160],
  lowMid: [160, 500],
  mid: [500, 3200],
  high: [5000, 13000],
  /** Where a kick and a snare or hat stand out from the rest. */
  thump: [40, 120],
  snap: [2500, 11000],
} as const
export type BandName = keyof typeof BANDS

/** The spectrum bins (first, one past last) that cover `lo` to `hi` Hz. */
export function binRange(
  lo: number,
  hi: number,
  sampleRate: number,
  fftSize: number
): [number, number] {
  const width = sampleRate / fftSize
  const bins = fftSize / 2
  const from = Math.min(bins - 1, Math.max(1, Math.round(lo / width)))
  const to = Math.min(bins, Math.max(from + 1, Math.round(hi / width)))
  return [from, to]
}

/** A band's level, 0 to 1: the mean of its bins (an analyser's bytes). */
export function bandLevel(bytes: ArrayLike<number>, from: number, to: number) {
  let sum = 0
  for (let i = from; i < to; i++) sum += bytes[i]
  return sum / ((to - from) * 255)
}

/**
 * One step of an envelope follower: toward `target` over `attack` seconds
 * when rising, `release` when falling.
 */
export function follow(
  value: number,
  target: number,
  dt: number,
  attack: number,
  release: number
) {
  const tau = target > value ? attack : release
  return tau <= 0
    ? target
    : value + (target - value) * (1 - Math.exp(-dt / tau))
}

export type Onset = {
  /** The band's slow average, its last reading, and the hit's envelope (0 to 1). */
  mean: number
  last: number
  hit: number
}
export const createOnset = (): Onset => ({ mean: -1, last: 0, hit: 0 })

/**
 * Feeds a band's level to its onset detector. A hit is a sharp rise that
 * stands clear of the band's last half second; it lands at once and rings
 * out over `release` seconds. Returns the envelope.
 */
export function stepOnset(
  o: Onset,
  level: number,
  dt: number,
  release = 0.14,
  sensitivity = 9
) {
  // The first reading only sets the scene.
  if (o.mean < 0) {
    o.mean = o.last = level
    return 0
  }
  const rise = level - o.last
  const above = level - o.mean
  const strength =
    rise > 0.012 && above > 0.03
      ? Math.min(1, (rise * 2 + above) * sensitivity)
      : 0
  o.hit = Math.max(strength, o.hit * Math.exp(-dt / release))
  o.mean += (level - o.mean) * (1 - Math.exp(-dt / 0.5))
  o.last = level
  return o.hit
}

/**
 * Stretches a band's level to its own recent range, so a quiet mix still
 * moves: `floor` and `peak` are trackers that drift toward the level.
 */
export type Range = { floor: number; peak: number }
export const createRange = (): Range => ({ floor: -1, peak: -1 })
export function stepRange(r: Range, level: number, dt: number) {
  if (r.peak < 0) {
    r.peak = level
    r.floor = level * 0.6
  }
  r.peak =
    level > r.peak ? level : r.peak + (level - r.peak) * (1 - Math.exp(-dt / 9))
  r.floor =
    level < r.floor
      ? r.floor + (level - r.floor) * (1 - Math.exp(-dt / 0.6))
      : r.floor + (level - r.floor) * (1 - Math.exp(-dt / 4))
  const span = Math.max(r.peak - r.floor, 0.12)
  const v = (level - r.floor) / span
  return v < 0 ? 0 : v > 1 ? 1 : v
}
