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
] as const
export type Cue = (typeof CUES)[number]

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
  /**
   * Counts hero-word landings so far. When it goes up the scene bursts
   * (embers, a flare) at `heroAt`, the hero's place in normalised screen
   * space (-1 to 1, y up).
   */
  heroCount: number
  heroAt: [number, number]
  /** 0 to 1 over the fade from black at the start and to black at the end. */
  fade: number
}

/** Reads the frame for right now; the scene calls it once per rendered frame. */
export type FrameSource = () => KineticFrame
