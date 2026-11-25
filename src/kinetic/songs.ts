import type { TrackId } from '@/data/tracks'
import type { Cue } from './types'

/** A cue with its level (1 when given bare). */
export type CueSpec = Cue | [Cue, number]

export type KineticSong = {
  /** The credit under the title. */
  artist: string
  bpm: number
  /** When the title's three words and the credit land in the intro. */
  title: { words: [number, number, number]; credit: number }
  /** An instrumental drop the title returns in, on the first bar after the words sung into it. */
  drop?: number
  /** When the closing credit rises. */
  outro: number
  /** Section accents by label (the trailing number dropped). */
  accents: Record<string, string>
  /** Section intensity, 0 to 1. */
  energy: Record<string, number>
  /** What the title and the reprise call up. */
  titleCues: CueSpec[]
  dropCues: CueSpec[]
  /** Per line: the word to sing loudest and what the scene shows. */
  lines: Record<string, { hero: string; cues: CueSpec[] }>
}

const TEAL = '#4fc0ae'
const MOON = '#91bfd7'
const GOLD = '#e6bc63'
const COPPER = '#e0895a'

const lift: KineticSong = {
  artist: 'Dustin',
  bpm: 122,
  title: { words: [1.1, 7.0, 15.5], credit: 23.2 },
  drop: 115.3,
  outro: 298,
  accents: {
    Intro: GOLD,
    Verse: TEAL,
    'Pre-Chorus': MOON,
    Chorus: GOLD,
    Interlude: GOLD,
    Bridge: COPPER,
    'Final Chorus': GOLD,
    Outro: MOON,
  },
  energy: {
    Intro: 0.4,
    Verse: 0.35,
    'Pre-Chorus': 0.5,
    Chorus: 0.85,
    Interlude: 1,
    Bridge: 0.7,
    'Final Chorus': 1,
    Outro: 0.3,
  },
  titleCues: ['golddust', ['rise', 0.5]],
  dropCues: ['rise', 'fire', 'wire'],
  lines: {
    'In marble light, the midnight breathes': {
      hero: 'midnight',
      cues: ['shafts'],
    },
    'A silver thread through hallowed eaves': {
      hero: 'silver',
      cues: ['thread', ['shafts', 0.5]],
    },
    'The pillars hum, the shadows lean': { hero: 'pillars', cues: ['shafts'] },
    'Like dreams in gold, half-seen, unseen': {
      hero: 'gold',
      cues: ['golddust'],
    },
    'A clockwork heart beneath the stone': {
      hero: 'clockwork',
      cues: ['clockwork'],
    },
    'Keeps time in low electric tones': {
      hero: 'electric',
      cues: ['clockwork', ['wire', 0.6]],
    },
    'The moon writes sigils in the rain': {
      hero: 'sigils',
      cues: ['moon', 'sigils', 'rain'],
    },
    'And pulls the tide through every vein': {
      hero: 'tide',
      cues: ['moon', 'tide'],
    },
    'Hush now, the night is turning': { hero: 'hush', cues: ['candle'] },
    'Slow like a candle, burning': { hero: 'candle', cues: ['candle'] },
    'Hold me where the echoes rise': {
      hero: 'echoes',
      cues: [['choir', 0.6]],
    },
    'Beneath these vaulted, lucid skies': {
      hero: 'skies',
      cues: ['shafts', ['beam', 0.5]],
    },
    'Lift me higher, through the fire': {
      hero: 'higher',
      cues: ['rise', 'fire'],
    },
    'Through the choir, through the wire': {
      hero: 'wire',
      cues: ['rise', 'choir', 'wire'],
    },
    'Let the pulse become a prayer': {
      hero: 'prayer',
      cues: [['rise', 0.6], 'choir'],
    },
    'Let the air remember air': {
      hero: 'remember',
      cues: [['rise', 0.6], 'golddust'],
    },
    'In the thunder, in the glow': { hero: 'thunder', cues: ['storm'] },
    'We move like ghosts in row by row': { hero: 'ghosts', cues: ['ghosts'] },
    'Heart to heart and breath to breath': {
      hero: 'heart',
      cues: [['ghosts', 0.5], 'golddust'],
    },
    'Dancing softly next to death': {
      hero: 'death',
      cues: ['ghosts', ['candle', 0.4]],
    },
    'I hear the violins of night': {
      hero: 'violins',
      cues: ['thread', ['moon', 0.5]],
    },
    'A neoclassical silver light': {
      hero: 'light',
      cues: ['shafts', ['beam', 0.6]],
    },
    'They bow above the frozen sea': { hero: 'frozen', cues: ['frost'] },
    'And carve a path for memory': {
      hero: 'memory',
      cues: [['frost', 0.6], 'thread'],
    },
    'The beat descends like temple rain': {
      hero: 'temple',
      cues: ['rain', ['shafts', 0.5]],
    },
    'A measured, dark, mechanical refrain': {
      hero: 'mechanical',
      cues: ['clockwork'],
    },
    'Yet in the fracture, in the seam': {
      hero: 'fracture',
      cues: ['wire', ['sigils', 0.5]],
    },
    'A voice appears, a lucid beam': { hero: 'voice', cues: ['beam'] },
    'Hush now, the lantern’s bending': { hero: 'hush', cues: ['candle'] },
    'No beginning without ending': {
      hero: 'ending',
      cues: [['clockwork', 0.6]],
    },
    'Sing through the pillars, old and true': {
      hero: 'sing',
      cues: ['shafts', 'choir'],
    },
    'I am the room and I am you': {
      hero: 'you',
      cues: ['beam', ['choir', 0.5]],
    },
    'Oh, sacred machine, keep turning': {
      hero: 'machine',
      cues: ['clockwork'],
    },
    'While the constellations are burning': {
      hero: 'constellations',
      cues: ['constellations', ['fire', 0.4]],
    },
    'String and shadow, dust and light': {
      hero: 'dust',
      cues: ['thread', 'golddust'],
    },
    'We are brief but we are bright': {
      hero: 'bright',
      cues: ['bright', ['constellations', 0.6]],
    },
    'And when the last delay fades slow': {
      hero: 'delay',
      cues: [
        ['tide', 0.6],
        ['ghosts', 0.4],
      ],
    },
    'The marble sings, the sub still low': {
      hero: 'marble',
      cues: ['shafts'],
    },
    'I leave my name in haloed sound': {
      hero: 'haloed',
      cues: ['moon', 'sigils'],
    },
    'A trembling star beneath the ground': { hero: 'star', cues: ['star'] },
  },
}

/** The songs with a kinetic video. */
export const KINETIC_SONGS: Partial<Record<TrackId, KineticSong>> = { lift }
