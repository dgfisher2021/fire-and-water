import { type RefObject, createContext, useContext } from 'react'
import * as THREE from 'three'
import { CUES, type Cue, type KineticFrame } from './types'

export const GROUND = '#030d12'
export const CAM_Z = 10
export const FOV = 50
/** Half the visible height on the z = 0 plane; layers are authored in these units. */
export const HALF_H = Math.tan((FOV * Math.PI) / 360) * CAM_Z
/** Half the visible width at 16:9, the aspect the layout is drawn for. */
export const REF_HALF_W = (HALF_H * 16) / 9
export const BEAT = 60 / 122

/** Uniform objects every material shares; the driver writes them once a frame. */
export type SharedUniforms = {
  uTime: { value: number }
  uSong: { value: number }
  uAccent: { value: THREE.Color }
  uHalfW: { value: number }
  uScale: { value: number }
  uBass: { value: number }
  uVocal: { value: number }
  uKick: { value: number }
  uEnergy: { value: number }
}

export type SceneState = {
  /** Rendered frames so far; the first few draw everything once to compile it. */
  frames: number
  cues: Record<Cue, number>
  /** Song seconds since each cue last came up, for the draw-ons. */
  age: Record<Cue, number>
  onset: Record<Cue, number>
  /** Cosmetic clock: slows when paused, stands still under reduced motion. */
  motion: number
  song: number
  dt: number
  playing: boolean
  calm: boolean
  bass: number
  vocal: number
  kick: number
  energy: number
  fade: number
  /** How far candle and star quiet everything else. */
  hush: number
  /** Distance flown upward by the rise cue. */
  rise: number
  halfW: number
  /** Horizontal squeeze against the 16:9 layout. */
  sx: number
  accent: THREE.Color
  accentTarget: THREE.Color
  accentHex: string
  heroCount: number
  heroAt: [number, number]
  heroPos: THREE.Vector3
  /** The hero flare's decaying envelope. */
  flare: number
  shared: SharedUniforms
}

export type SceneApi = {
  ref: RefObject<SceneState>
  shared: SharedUniforms
  /** The section accent as React state: it changes a few times a song. */
  accentHex: string
}

const record = (value: number) =>
  Object.fromEntries(CUES.map((cue) => [cue, value])) as Record<Cue, number>

export function createScene(): SceneState {
  const accent = new THREE.Color('#4fc0ae')
  return {
    frames: 0,
    cues: record(0),
    age: record(0),
    onset: record(0),
    motion: 0,
    song: 0,
    dt: 0,
    playing: false,
    calm: false,
    bass: 0,
    vocal: 0,
    kick: 0,
    energy: 0,
    fade: 1,
    hush: 0,
    rise: 0,
    halfW: REF_HALF_W,
    sx: 1,
    accent,
    accentTarget: accent.clone(),
    accentHex: '',
    heroCount: -1,
    heroAt: [0, 0],
    heroPos: new THREE.Vector3(),
    flare: 0,
    shared: {
      uTime: { value: 0 },
      uSong: { value: 0 },
      uAccent: { value: accent },
      uHalfW: { value: REF_HALF_W },
      uScale: { value: 1000 },
      uBass: { value: 0 },
      uVocal: { value: 0 },
      uKick: { value: 0 },
      uEnergy: { value: 0 },
    },
  }
}

const { damp, clamp } = THREE.MathUtils
const DRAWN = -1e3

/** Folds one timeline frame into the scene state and the shared uniforms. */
export function stepScene(
  s: SceneState,
  f: KineticFrame,
  delta: number,
  aspect: number,
  pixelHeight: number,
  calm: boolean
) {
  const dt = Math.min(delta, 0.05)
  s.dt = dt
  s.calm = calm
  s.playing = f.playing
  s.song = calm ? 0 : f.time
  if (!calm) s.motion += dt * (f.playing ? 1 : 0.3)

  for (const cue of CUES) {
    const level = clamp(f.cues[cue] ?? 0, 0, 1)
    if (level > 0.01) {
      if (s.cues[cue] <= 0.01) s.onset[cue] = s.frames === 0 ? DRAWN : f.time
      if (f.time < s.onset[cue]) s.onset[cue] = DRAWN
      s.age[cue] = calm ? -DRAWN : f.time - s.onset[cue]
    }
    s.cues[cue] = level
  }

  s.bass = damp(s.bass, calm ? 0.35 : f.bass, 14, dt)
  s.vocal = damp(s.vocal, calm ? 0.5 : f.vocal, 10, dt)
  s.kick = damp(s.kick, calm ? 0 : f.kick, 18, dt)
  s.energy = damp(s.energy, f.energy, 4, dt)
  s.fade = clamp(f.fade, 0, 1)
  s.hush = Math.max(s.cues.candle * 0.8, s.cues.star * 0.93)
  if (f.playing && !calm) s.rise += dt * s.cues.rise * (5 + 9 * s.energy)

  if (f.accent !== s.accentHex) s.accentTarget.set(f.accent)
  s.accent.lerp(s.accentTarget, s.frames === 0 ? 1 : 1 - Math.exp(-dt * 3))

  s.halfW = HALF_H * aspect
  s.sx = s.halfW / REF_HALF_W
  s.heroAt = f.heroAt
  s.heroCount = f.heroCount

  const u = s.shared
  u.uTime.value = s.motion
  u.uSong.value = s.song
  u.uHalfW.value = s.halfW
  u.uScale.value = pixelHeight / (2 * Math.tan((FOV * Math.PI) / 360))
  u.uBass.value = s.bass
  u.uVocal.value = s.vocal
  u.uKick.value = s.kick
  u.uEnergy.value = s.energy
}

/** True while a cue element should draw: it is up, or the shaders are warming. */
export const shown = (s: SceneState, level: number) =>
  s.frames < 3 || level > 0.004

export const SceneContext = createContext<SceneApi | null>(null)

export function useScene(): SceneApi {
  const api = useContext(SceneContext)
  if (!api) throw new Error('useScene outside KineticScene')
  return api
}
