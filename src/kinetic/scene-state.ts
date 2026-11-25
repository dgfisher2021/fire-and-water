import { type RefObject, createContext, useContext } from 'react'
import * as THREE from 'three'
import { LANDSCAPE, type Stage, fitStage } from './stage'
import { CUES, type Cue, type HeroWord, type KineticFrame } from './types'

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
  uSnare: { value: number }
  uMid: { value: number }
  uHigh: { value: number }
  uEnergy: { value: number }
  /** 1 on the portrait stage, where layers stack above and below the words. */
  uTall: { value: number }
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
  /** The last frame's song time: a jump means a seek. */
  lastTime: number
  dt: number
  playing: boolean
  calm: boolean
  bass: number
  vocal: number
  kick: number
  /** The finer bands and the snare or hat, from the live analyser when it listens. */
  sub: number
  mid: number
  high: number
  snare: number
  loud: number
  energy: number
  fade: number
  /** How far candle and star quiet everything else. */
  hush: number
  /** Distance flown upward by the rise cue. */
  rise: number
  halfW: number
  /** Horizontal squeeze against the 16:9 layout. */
  sx: number
  /** The text stage, whether it is the portrait one, and how much of the window it fills. */
  stage: Stage
  tall: boolean
  fitX: number
  fitY: number
  accent: THREE.Color
  accentTarget: THREE.Color
  accentHex: string
  heroCount: number
  heroAt: [number, number]
  heroPos: THREE.Vector3
  /** Lightning in the storm cloud. */
  flash: number
  /** The hero the scene casts in solid letters, and the one the sand holds. */
  solid: HeroWord | null
  /** The shade behind the words: centre and half size on z = 0, and its strength. */
  guard: [number, number, number, number, number]
  sand: HeroWord | null
  sandIn: number
  sandOut: number
  sandLevel: number
  /** World units (on z = 0) and device pixels per pixel of the text stage. */
  stageUnit: number
  stagePx: number
  /** The clockwork heart's home on the z = 0 plane, and its radius there. */
  heart: [number, number, number]
  /** The heart's beat, 0 to 1: a lub on each kick and a softer dub after it. */
  heartbeat: number
  dubAt: number
  /** The hero flare's decaying envelope. */
  flare: number
  shared: SharedUniforms
}

export type SceneApi = {
  ref: RefObject<SceneState>
  /** The song's cover (a path under public/) and the figure to cut from it. */
  art?: { src: string; perch?: [number, number, number, number] }
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
    lastTime: 0,
    dt: 0,
    playing: false,
    calm: false,
    bass: 0,
    vocal: 0,
    kick: 0,
    sub: 0,
    mid: 0,
    high: 0,
    snare: 0,
    loud: 0,
    energy: 0,
    fade: 1,
    hush: 0,
    rise: 0,
    halfW: REF_HALF_W,
    sx: 1,
    stage: LANDSCAPE,
    tall: false,
    fitX: 1,
    fitY: 1,
    accent,
    accentTarget: accent.clone(),
    accentHex: '',
    heroCount: -1,
    heroAt: [0, 0],
    heroPos: new THREE.Vector3(),
    flash: 0,
    solid: null,
    guard: [0, 0, 1, 1, 0],
    sand: null,
    sandIn: 0,
    sandOut: 0,
    sandLevel: 0,
    stageUnit: HALF_H / 540,
    heart: [4.6, 0, 1],
    heartbeat: 0,
    dubAt: -1,
    stagePx: 1,
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
      uSnare: { value: 0 },
      uMid: { value: 0 },
      uHigh: { value: 0 },
      uEnergy: { value: 0 },
      uTall: { value: 0 },
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
  width: number,
  height: number,
  dpr: number,
  calm: boolean,
  stage: Stage
) {
  const aspect = width / Math.max(height, 1)
  const pixelHeight = height * dpr
  const dt = Math.min(delta, 0.05)
  s.dt = dt
  s.calm = calm
  s.playing = f.playing
  s.song = calm ? 0 : f.time
  if (!calm) s.motion += dt * (f.playing ? 1 : 0.3)

  const jumped = s.frames === 0 || Math.abs(f.time - s.lastTime) > 0.5
  s.lastTime = f.time
  for (const cue of CUES) {
    const level = clamp(f.cues[cue] ?? 0, 0, 1)
    if (level > 0.01) {
      // First seen on the first frame or after a seek: already drawn.
      if (s.cues[cue] <= 0.01) s.onset[cue] = jumped ? DRAWN : f.time
      if (f.time < s.onset[cue]) s.onset[cue] = DRAWN
      s.age[cue] = calm ? -DRAWN : f.time - s.onset[cue]
    }
    s.cues[cue] = level
  }

  s.bass = damp(s.bass, calm ? 0.35 : f.bass, 14, dt)
  s.vocal = damp(s.vocal, calm ? 0.5 : f.vocal, 10, dt)
  const before = s.kick
  // A hit lands at once and rings out; the bands are already enveloped.
  s.kick = calm ? 0 : Math.max(f.kick, damp(s.kick, f.kick, 18, dt))
  s.snare = calm ? 0 : Math.max(f.snare, damp(s.snare, f.snare, 22, dt))
  // Lub on the kick; dub a sixth of a second later, softer.
  if (f.kick > 0.55 && before <= 0.55 && f.playing) s.dubAt = f.time + 0.17
  const since = f.time - s.dubAt
  const dub =
    s.dubAt >= 0 && since >= 0 && since < 0.6 ? Math.exp(-since * 13) : 0
  s.heartbeat = calm ? 0 : Math.min(1, Math.max(s.kick, 0.6 * dub))
  s.sub = damp(s.sub, calm ? 0.35 : f.sub, 14, dt)
  s.mid = damp(s.mid, calm ? 0.4 : f.mid, 12, dt)
  s.high = damp(s.high, calm ? 0.2 : f.high, 20, dt)
  s.loud = damp(s.loud, calm ? 0.4 : f.loud, 8, dt)
  s.energy = damp(s.energy, f.energy, 4, dt)
  s.fade = clamp(f.fade, 0, 1)
  s.hush = Math.max(s.cues.candle * 0.8, s.cues.star * 0.93)
  if (f.playing && !calm) s.rise += dt * s.cues.rise * (5 + 9 * s.energy)

  if (f.accent !== s.accentHex) s.accentTarget.set(f.accent)
  s.accent.lerp(s.accentTarget, s.frames === 0 ? 1 : 1 - Math.exp(-dt * 3))

  s.halfW = HALF_H * aspect
  s.sx = s.halfW / REF_HALF_W
  const fit = fitStage(stage, width, height)
  s.stage = stage
  s.tall = stage.name === 'portrait'
  s.fitX = (stage.w * fit.scale) / Math.max(width, 1)
  s.fitY = (stage.h * fit.scale) / Math.max(height, 1)
  s.stageUnit = ((2 * HALF_H) / Math.max(height, 1)) * fit.scale
  s.stagePx = fit.scale * dpr
  s.heart[0] = (stage.heart.x - stage.w / 2) * s.stageUnit
  s.heart[1] = -(stage.heart.y - stage.h / 2) * s.stageUnit
  s.heart[2] = stage.heart.r * s.stageUnit
  s.flash = calm ? 0 : f.flash
  // The shade follows the words, easing between one line's box and the next.
  const g = f.guard
  const k = s.frames === 0 || jumped ? 1 : 1 - Math.exp(-dt * 7)
  if (g.level > 0.01 && g.w > 0) {
    const gx = (g.x - stage.w / 2) * s.stageUnit
    const gy = -(g.y - stage.h / 2) * s.stageUnit
    const still = s.guard[4] < 0.02 ? 1 : k
    s.guard[0] += (gx - s.guard[0]) * still
    s.guard[1] += (gy - s.guard[1]) * still
    s.guard[2] += ((g.w / 2) * s.stageUnit - s.guard[2]) * still
    s.guard[3] += ((g.h / 2) * s.stageUnit - s.guard[3]) * still
  }
  s.guard[4] += (g.level - s.guard[4]) * k
  s.solid = f.solid
  s.sand = calm ? null : f.sand
  s.sandIn = f.sandIn
  s.sandOut = f.sandOut
  s.sandLevel = f.sandLevel
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
  u.uSnare.value = s.snare
  u.uMid.value = s.mid
  u.uHigh.value = s.high
  u.uEnergy.value = s.energy
  u.uTall.value = s.tall ? 1 : 0
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
