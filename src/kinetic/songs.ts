import type { TrackId } from '@/data/tracks'
import type { MaterialName } from './materials'
import type { Cue, SandMode, Solid } from './types'

/**
 * A cue with its level (1 when given bare), and optionally the word of the
 * line it waits for ("orb" on "heart") instead of the line's first word.
 */
export type CueSpec = Cue | [Cue, number] | [Cue, number, string]

/** A cue held between two song times, whatever is being sung. */
export type Moment = { cue: Cue; from: number; to: number; level?: number }

/** A part of the cover: left, top, right, bottom, each 0 to 1. */
export type Crop = [number, number, number, number]

/**
 * How a section's lines arrive and leave: `title` slow and grand, `rise`
 * out of a blur from below, `unveil` wiped open, `lift` thrown forward and
 * pulled up, `clockwork` turned in on the beat grid, `dissolve` thinning out.
 */
export type LineStyle =
  'title' | 'rise' | 'unveil' | 'lift' | 'clockwork' | 'dissolve'

/** What the scene makes of a hero word: solid letters, sand (with seconds to blow away), or both. */
export type HeroSpec = { solid?: Solid; sand?: SandMode | [SandMode, number] }

export type KineticSong = {
  /** The credit under the title. */
  artist: string
  bpm: number
  /** When the title's three words and the credit land in the intro. */
  title: { words: [number, number, number]; credit: number } & HeroSpec
  /** An instrumental drop the title returns in, on the first bar after the words sung into it. */
  drop?: number
  dropHero?: HeroSpec
  /** When the closing credit rises. */
  outro: number
  /** Section accents by label (the trailing number dropped). */
  accents: Record<string, string>
  /** Section intensity, 0 to 1. */
  energy: Record<string, number>
  /** How each section's lines move. */
  styles: Record<string, LineStyle>
  /** What the title and the reprise call up. */
  titleCues: CueSpec[]
  dropCues: CueSpec[]
  /** Cues every line of a section adds to its own (by label, the number dropped). */
  sectionCues?: Record<string, CueSpec[]>
  /** Cues by the clock: the cover gathering in the intro. */
  moments?: Moment[]
  /** What to cut from the song's cover (`TRACKS[id].art`): the figure that perches. */
  art?: { perch?: Crop }
  /** What a word is made of, wherever it is sung. */
  words: Record<string, MaterialName>
  /** Per line: the word to sing loudest and what the scene shows. */
  lines: Record<string, { hero: string; cues: CueSpec[] } & HeroSpec>
}

const TEAL = '#4fc0ae'
const MOON = '#91bfd7'
const GOLD = '#e6bc63'
const COPPER = '#e0895a'

const lift: KineticSong = {
  artist: 'Dustin',
  bpm: 122,
  title: {
    words: [1.1, 7.0, 15.5],
    credit: 23.2,
    solid: 'gold',
    sand: 'gather',
  },
  drop: 115.3,
  dropHero: { solid: 'gold', sand: 'scatter' },
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
  styles: {
    Intro: 'title',
    Verse: 'rise',
    'Pre-Chorus': 'unveil',
    Chorus: 'lift',
    Interlude: 'lift',
    Bridge: 'clockwork',
    'Final Chorus': 'lift',
    Outro: 'dissolve',
  },
  titleCues: ['golddust', ['rise', 0.5], ['wash', 0.8]],
  // The seeress gathers out of gold dust and lifts away as HIGHER forms.
  moments: [{ cue: 'cover', from: 0.2, to: 11.4 }],
  sectionCues: {
    Bridge: [['wash', 0.7]],
    'Final Chorus': ['wings'],
  },
  // The raven on its stone, lower right of the cover.
  art: { perch: [0.665, 0.59, 0.95, 0.995] },
  dropCues: ['rise', 'fire', 'wire'],
  words: {
    marble: 'marble',
    light: 'light',
    midnight: 'midnight',
    breathes: 'breathe',
    silver: 'silver',
    thread: 'string',
    hallowed: 'halo',
    pillars: 'marble',
    hum: 'hum',
    shadows: 'shadow',
    shadow: 'shadow',
    lean: 'lean',
    dreams: 'dream',
    gold: 'gold',
    'half-seen': 'halfseen',
    unseen: 'unseen',
    clockwork: 'brass',
    heart: 'heart',
    stone: 'stone',
    time: 'turn',
    low: 'low',
    electric: 'neon',
    moon: 'moon',
    writes: 'write',
    sigils: 'sigil',
    rain: 'rain',
    pulls: 'pull',
    tide: 'water',
    hush: 'hush',
    night: 'midnight',
    turning: 'turn',
    slow: 'soft',
    candle: 'flame',
    burning: 'fire',
    echoes: 'echo',
    rise: 'climb',
    lucid: 'light',
    skies: 'sky',
    lift: 'climb',
    higher: 'lift',
    fire: 'fire',
    choir: 'halo',
    wire: 'neon',
    pulse: 'pulse',
    prayer: 'halo',
    air: 'air',
    remember: 'sand',
    thunder: 'storm',
    glow: 'light',
    ghosts: 'ghost',
    breath: 'breathe',
    dancing: 'dance',
    softly: 'soft',
    death: 'ash',
    violins: 'string',
    neoclassical: 'marble',
    bow: 'bend',
    frozen: 'ice',
    sea: 'water',
    carve: 'stone',
    memory: 'echo',
    beat: 'pulse',
    descends: 'fall',
    temple: 'marble',
    measured: 'turn',
    dark: 'dark',
    mechanical: 'steel',
    fracture: 'crack',
    seam: 'beam',
    voice: 'sing',
    appears: 'appear',
    beam: 'beam',
    'lantern’s': 'flame',
    bending: 'bend',
    ending: 'ash',
    sing: 'sing',
    old: 'stone',
    you: 'halo',
    sacred: 'halo',
    machine: 'brass',
    constellations: 'star',
    string: 'string',
    dust: 'sand',
    brief: 'brief',
    bright: 'bright',
    delay: 'echo',
    fades: 'fade',
    sings: 'sing',
    sub: 'sub',
    haloed: 'halo',
    trembling: 'star',
    star: 'star',
    ground: 'stone',
  },
  lines: {
    'In marble light, the midnight breathes': {
      hero: 'midnight',
      cues: ['shafts'],
    },
    'A silver thread through hallowed eaves': {
      hero: 'silver',
      cues: ['thread', ['shafts', 0.5]],
      solid: 'silver',
    },
    'The pillars hum, the shadows lean': { hero: 'pillars', cues: ['shafts'] },
    'Like dreams in gold, half-seen, unseen': {
      hero: 'gold',
      cues: ['golddust'],
      solid: 'gold',
    },
    'A clockwork heart beneath the stone': {
      hero: 'clockwork',
      // The heart lights inside the rings on its own word.
      cues: ['clockwork', ['orb', 0.8, 'heart']],
      solid: 'brass',
    },
    'Keeps time in low electric tones': {
      hero: 'electric',
      cues: ['clockwork', ['wire', 0.7], ['orb', 0.7]],
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
      solid: 'gold',
    },
    'Through the choir, through the wire': {
      hero: 'wire',
      cues: ['rise', 'choir', 'wire'],
    },
    'Let the pulse become a prayer': {
      hero: 'prayer',
      cues: [
        ['rise', 0.6],
        ['choir', 0.7],
        ['orb', 0.95, 'pulse'],
      ],
    },
    'Let the air remember air': {
      hero: 'remember',
      cues: [['rise', 0.6], 'golddust'],
      sand: 'form',
    },
    'In the thunder, in the glow': { hero: 'thunder', cues: ['storm'] },
    'We move like ghosts in row by row': {
      hero: 'ghosts',
      cues: ['ghosts', 'raven'],
    },
    'Heart to heart and breath to breath': {
      hero: 'heart',
      cues: [['ghosts', 0.5], 'golddust', ['orb', 0.95]],
    },
    'Dancing softly next to death': {
      hero: 'death',
      cues: ['ghosts', ['candle', 0.4], 'raven'],
      sand: 'scatter',
    },
    'I hear the violins of night': {
      hero: 'violins',
      cues: ['thread', ['moon', 0.5], ['wash', 0.7]],
    },
    'A neoclassical silver light': {
      hero: 'light',
      cues: ['shafts', ['beam', 0.6]],
    },
    'They bow above the frozen sea': {
      hero: 'frozen',
      cues: ['frost'],
      solid: 'ice',
    },
    'And carve a path for memory': {
      hero: 'memory',
      cues: [['frost', 0.6], 'thread', ['wash', 0.6]],
    },
    'The beat descends like temple rain': {
      hero: 'temple',
      cues: ['rain', ['shafts', 0.5]],
    },
    'A measured, dark, mechanical refrain': {
      hero: 'mechanical',
      cues: ['clockwork', ['orb', 0.75]],
    },
    'Yet in the fracture, in the seam': {
      hero: 'fracture',
      cues: [['wire', 0.7], 'sigils'],
    },
    'A voice appears, a lucid beam': { hero: 'voice', cues: ['beam'] },
    'Hush now, the lantern’s bending': { hero: 'hush', cues: ['candle'] },
    'No beginning without ending': {
      hero: 'ending',
      cues: [['clockwork', 0.6]],
      sand: 'scatter',
    },
    'Sing through the pillars, old and true': {
      hero: 'sing',
      cues: ['shafts', 'choir'],
    },
    'I am the room and I am you': {
      hero: 'you',
      cues: [
        ['beam', 0.6],
        ['choir', 0.5],
      ],
    },
    'Oh, sacred machine, keep turning': {
      hero: 'machine',
      cues: ['clockwork', 'orb'],
      solid: 'brass',
    },
    'While the constellations are burning': {
      hero: 'constellations',
      cues: ['constellations', ['fire', 0.4]],
    },
    'String and shadow, dust and light': {
      hero: 'dust',
      cues: ['thread', 'golddust'],
      sand: 'form',
    },
    'We are brief but we are bright': {
      hero: 'bright',
      cues: ['bright', ['constellations', 0.6]],
      solid: 'light',
      sand: 'scatter',
    },
    'And when the last delay fades slow': {
      hero: 'delay',
      cues: [['tide', 0.6], ['ghosts', 0.4], 'perch'],
      sand: ['scatter', 3.6],
    },
    'The marble sings, the sub still low': {
      hero: 'marble',
      cues: ['shafts', 'perch'],
    },
    'I leave my name in haloed sound': {
      hero: 'haloed',
      // The heart's last glow, low in its rings; the star takes its place.
      cues: ['sigils', 'perch', ['orb', 0.4]],
    },
    'A trembling star beneath the ground': {
      hero: 'star',
      cues: ['star', ['perch', 0.8]],
      solid: 'light',
    },
  },
}

/** The songs with a kinetic video. */
export const KINETIC_SONGS: Partial<Record<TrackId, KineticSong>> = { lift }
