import { liveAnalyser } from '@/lib/audio'
import {
  BANDS,
  type BandName,
  bandLevel,
  binRange,
  createOnset,
  createRange,
  follow,
  stepOnset,
  stepRange,
} from '@/lib/audio-bands'
import { pulseAt, type Pulse } from '@/lib/pulse'

/**
 * What the film hears, each 0 to 1. Read live from the playing song where
 * an analyser can listen; else from the song's precomputed pulse, which is
 * also what a held or paused frame shows.
 */
export type Signals = {
  /** Bass and voice energy: the two the precomputed pulse carries. */
  bass: number
  vocal: number
  sub: number
  lowMid: number
  mid: number
  high: number
  /** Overall loudness. */
  loud: number
  /** Hits: a kick, and a snare or hat. */
  kick: number
  snare: number
  /** True while the values come from the analyser. */
  live: boolean
}

export const createSignals = (): Signals => ({
  bass: 0,
  vocal: 0,
  sub: 0,
  lowMid: 0,
  mid: 0,
  high: 0,
  loud: 0,
  kick: 0,
  snare: 0,
  live: false,
})

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** How far a band stands above its last half second, squared: a hit. */
export function riseAt(band: string, fps: number, t: number) {
  const now = pulseAt(band, fps, t)
  let low = now
  for (let i = Math.ceil((t - 0.5) * fps); i <= Math.floor(t * fps); i++)
    if (i >= 0 && i < band.length)
      low = Math.min(low, parseInt(band[i], 36) / 35)
  const k = clamp01((now - low) / 0.15)
  return k * k
}

/** A kick, from the precomputed bass. */
export const kickAt = (pulse: Pulse, t: number) =>
  riseAt(pulse.bass, pulse.fps, t)

/** The signals at `t` from the precomputed pulse; the bands it lacks are estimated. */
export function pulseSignals(pulse: Pulse | null, t: number, out: Signals) {
  const bass = pulse ? pulseAt(pulse.bass, pulse.fps, t) : 0
  const vocal = pulse ? pulseAt(pulse.vocal, pulse.fps, t) : 0
  out.bass = bass
  out.vocal = vocal
  out.sub = bass
  out.lowMid = 0.6 * bass + 0.4 * vocal
  out.mid = vocal
  out.high = 0.6 * vocal
  out.loud = 0.5 * (bass + vocal)
  out.kick = pulse ? kickAt(pulse, t) : 0
  out.snare = pulse ? 0.7 * riseAt(pulse.vocal, pulse.fps, t) : 0
  out.live = false
  return out
}

/** Seconds to rise and to fall, per band: the lows punch, the highs glitter. */
const ENVELOPE: Record<
  Exclude<BandName, 'thump' | 'snap'>,
  [number, number]
> = {
  sub: [0.02, 0.22],
  bass: [0.015, 0.16],
  lowMid: [0.03, 0.2],
  mid: [0.04, 0.22],
  high: [0.01, 0.12],
}
const NAMES = Object.keys(BANDS) as BandName[]
const CURVE = 1.9
/** Silence this long while playing means the analyser hears nothing: stop trusting it. */
const DEAF_AFTER = 1.5

/**
 * The film's ear. `read` fills `out` for the frame at `t`: live while the
 * song plays and the analyser hears it, from the pulse otherwise.
 */
export function createListener() {
  let node: AnalyserNode | null = null
  let bytes = new Uint8Array(0)
  const bins = {} as Record<BandName, [number, number]>
  const ranges = Object.fromEntries(
    NAMES.map((n) => [n, createRange()])
  ) as Record<BandName, ReturnType<typeof createRange>>
  const kick = createOnset()
  const snare = createOnset()
  let last = 0
  let silent = 0

  return {
    read(pulse: Pulse | null, t: number, playing: boolean, out: Signals) {
      const analyser = playing ? liveAnalyser() : null
      if (!analyser) {
        last = 0
        return pulseSignals(pulse, t, out)
      }
      if (analyser !== node) {
        node = analyser
        bytes = new Uint8Array(analyser.frequencyBinCount)
        for (const name of NAMES)
          bins[name] = binRange(
            BANDS[name][0],
            BANDS[name][1],
            analyser.context.sampleRate,
            analyser.fftSize
          )
      }
      const now = performance.now() / 1000
      const dt = last ? Math.min(0.1, Math.max(0.001, now - last)) : 1 / 60
      last = now
      analyser.getByteFrequencyData(bytes)
      const raw = (name: BandName) =>
        bandLevel(bytes, bins[name][0], bins[name][1])
      const loud = raw('lowMid') * 0.4 + raw('mid') * 0.4 + raw('bass') * 0.2
      silent = loud > 0.004 ? 0 : silent + dt
      if (silent > DEAF_AFTER) return pulseSignals(pulse, t, out)
      // Stretched to the band's own range, then curved so it rests low and peaks high.
      const level = (name: keyof typeof ENVELOPE) =>
        follow(
          out[name],
          Math.pow(stepRange(ranges[name], raw(name), dt), CURVE),
          dt,
          ENVELOPE[name][0],
          ENVELOPE[name][1]
        )
      out.sub = level('sub')
      out.bass = level('bass')
      out.lowMid = level('lowMid')
      out.mid = level('mid')
      out.high = level('high')
      out.vocal = out.mid
      out.loud = follow(out.loud, clamp01(loud * 1.1), dt, 0.05, 0.3)
      out.kick = stepOnset(kick, raw('thump'), dt, 0.13, 9)
      out.snare = stepOnset(snare, raw('snap'), dt, 0.09, 12)
      out.live = true
      return out
    },
  }
}

export type Listener = ReturnType<typeof createListener>
