/**
 * Each song's pulse (scripts/audio-pulse.py): bass and vocal energy, ten
 * readings a second, one base-36 digit each. The files load lazily, one
 * song at a time, so the bundle carries none of them.
 */
export type Pulse = { fps: number; bass: string; vocal: string }

const files = import.meta.glob<Pulse>('../data/pulse/*.json', {
  import: 'default',
})

const cache = new Map<string, Promise<Pulse | null>>()

/** The pulse for an audio file in public/, or null if it has none. */
export function loadPulse(audioFile: string): Promise<Pulse | null> {
  const stem = audioFile.replace(/\.[^.]+$/, '')
  let hit = cache.get(stem)
  if (!hit) {
    const load = files[`../data/pulse/${stem}.json`]
    hit = load ? load().catch(() => null) : Promise.resolve(null)
    cache.set(stem, hit)
  }
  return hit
}

/** A band's level, 0 to 1, at `seconds`, eased between readings. */
export function pulseAt(band: string, fps: number, seconds: number) {
  const x = Math.max(0, seconds * fps)
  const i = Math.floor(x)
  if (i >= band.length - 1)
    return band.length ? digit(band[band.length - 1]) : 0
  const f = x - i
  return digit(band[i]) * (1 - f) + digit(band[i + 1]) * f
}

const digit = (c: string) => parseInt(c, 36) / 35
