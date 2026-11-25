import type { Pose } from './stage'

/**
 * The contract between the kinetic timeline (which reads the lyrics and the
 * song's pulse) and the 3D scene (which only draws what a frame asks for).
 */

/** What the lyrics can call up in the scene. Each is a level, 0 to 1. */
export const CUES = [
  'shafts', // marble light: pale light shafts between tall pillars
  'thread', // a silver thread drawing itself through the dark
  'golddust', // slow gold motes, half seen
  'clockwork', // great concentric rings turning like a mechanism
  'moon', // the moon, low and large
  'rain', // fine rain falling
  'sigils', // glowing glyph strokes drawing themselves
  'tide', // a dark sea surface swelling
  'candle', // one warm flame, the scene hushed around it
  'rise', // rushing upward through the stars
  'fire', // embers streaming up
  'choir', // tall soft columns of light, a cathedral of voices
  'wire', // taut electric lines humming
  'storm', // thunder: cloud lit from within
  'ghosts', // pale mist figures drifting in rows
  'frost', // frozen sea: cold blue, ice glints
  'beam', // one lucid beam from above
  'constellations', // stars joined by lines
  'bright', // a white bloom: brief but bright
  'star', // one trembling star, the rest gone quiet
  'orb', // the liquid heart: a glass orb beating with the bass
] as const
export type Cue = (typeof CUES)[number]

/** A hero word cast as extruded letters in the scene, by what it is made of. */
export type Solid = 'gold' | 'silver' | 'brass' | 'steel' | 'ice' | 'light'

/**
 * A hero word as sand: `form` gathers into the word and blows away with its
 * line, `gather` flies in ahead of the letters, `scatter` is the letters
 * turning to dust as the line leaves.
 */
export type SandMode = 'form' | 'gather' | 'scatter'
export type SandPlan = {
  mode: SandMode
  /** Song times: the gathering (in0 to in1) and the blowing away (out0 to out1). */
  in0: number
  in1: number
  out0: number
  out1: number
  color: string
}

/** A hero word the scene can draw itself, placed by the text layer. */
export type HeroWord = {
  text: string
  /** When it lands, and when its line leaves. */
  t: number
  exitAt: number
  exitDur: number
  /** Its capitals on the line, in stage px: left, top, width, height. */
  box: [number, number, number, number]
  /** The line's pose, written by the text layer every frame. */
  pose: Pose
  /** How its letters move once landed (the text layer's motion names). */
  motion?: string
  solid?: Solid
  sand?: SandPlan
}

export type KineticFrame = {
  /** Song time in seconds. */
  time: number
  /** False before the song starts or when paused: hold, do not animate hard. */
  playing: boolean
  /** Bass and voice energy, 0 to 1 (ten readings a second, eased). */
  bass: number
  vocal: number
  /** A kick: how far the bass stands above its last half second, 0 to 1. */
  kick: number
  /** The section's accent as a CSS hex colour, and the one before it with a 0 to 1 blend. */
  accent: string
  /** Overall intensity of the section, 0 (hushed verse) to 1 (final chorus). */
  energy: number
  /** Each cue's level, already eased in and out by the timeline. */
  cues: Record<Cue, number>
  /** Lightning inside the storm cloud, 0 to 1; the word THUNDER flashes with it. */
  flash: number
  /**
   * Counts hero-word landings so far. When it goes up the scene bursts
   * (embers, a flare) at `heroAt`, the hero's place in normalised screen
   * space (-1 to 1, y up).
   */
  heroCount: number
  heroAt: [number, number]
  /** The hero word the scene draws as solid letters right now, if any. */
  solid: HeroWord | null
  /** The hero word the sand holds, how scattered it is and how far blown (0 to 1). */
  sand: HeroWord | null
  sandIn: number
  sandOut: number
  sandLevel: number
  /** 0 to 1 over the fade from black at the start and to black at the end. */
  fade: number
}

/** Reads the frame for right now; the scene calls it once per rendered frame. */
export type FrameSource = () => KineticFrame
