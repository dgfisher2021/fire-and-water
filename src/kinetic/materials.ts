/**
 * What a word is made of: the looks the kinetic typography can give a word
 * so it reads as what it says. A song names one per word (`songs.ts`); the
 * text layer paints it (`text-engine.ts`).
 */

/** Gradient stops down the capitals: 0 is their top, 1 the baseline. */
export type Stops = [number, string][]

/** How a word arrives. Unset, it arrives the way its section does. */
export type Entrance =
  | 'tick' // letters turn into place on the sixteenth-note grid
  | 'fall' // letters drop in from above, one after another
  | 'write' // drawn left to right, as if by a pen
  | 'soft' // a long, still fade
  | 'pull' // stretched wide, drawn together
  | 'appear' // out of nothing, slowly
  | 'climb' // from well below, upward

/** What a word keeps doing once it has landed. */
export type Motion =
  | 'breathe' // slow swell and release
  | 'flicker' // a flame: restless, brighter with the bass
  | 'tremble' // a small nervous shake
  | 'jitter' // snaps sideways on a kick
  | 'rise' // letters keep lifting, the later ones higher
  | 'wave' // letters ride a slow swell
  | 'tick' // a small turn on every beat
  | 'flash' // lit by the storm's lightning
  | 'pulse' // beats with the kick
  | 'hum' // a fast fine vibration
  | 'lean' // tips over to one side
  | 'bend' // letters bow along an arc
  | 'crack' // letters break apart along a seam
  | 'sink' // settles low
  | 'fade' // thins slowly once sung
  | 'brief' // bright for a moment, then nearly gone
  | 'sway' // letters dance from side to side
  | 'float' // drifts like mist
  | 'air' // spreads apart and thins
  | 'echo' // repeats itself behind, fading
  | 'sub' // swells with the bass
  | 'voice' // swells with the singing

export type Material = {
  /** One CSS colour, or a gradient down the capitals. `ACCENT` is the section's colour, `FG` the text colour. */
  fill: Stops | string
  /** A second background painted over the fill (veins, grain). */
  over?: string
  /** The colour of the blurred copy behind the word, and its strength at rest. */
  glow?: string
  glowLevel?: number
  /** A specular band crossing the word: its colour and how many beats a pass takes. */
  sheen?: [string, number]
  /** An outline, as `-webkit-text-stroke`. */
  edge?: string
  /** A CSS mask over the word. */
  mask?: string
  alpha?: number
  enter?: Entrance
  motion?: Motion
}

const GOLD: Stops = [
  [0, '#fff6cf'],
  [0.2, '#f6d680'],
  [0.45, '#c08a2b'],
  [0.52, '#84560f'],
  [0.58, '#e6bc63'],
  [0.8, '#fff0b8'],
  [1, '#b58126'],
]
const SILVER: Stops = [
  [0, '#ffffff'],
  [0.24, '#d3dde6'],
  [0.46, '#8492a0'],
  [0.53, '#586673'],
  [0.6, '#c6d1db'],
  [0.82, '#f6fafc'],
  [1, '#8b98a5'],
]
const BRASS: Stops = [
  [0, '#ffe6b3'],
  [0.3, '#e0a25a'],
  [0.5, '#8a5320'],
  [0.56, '#c98a3c'],
  [0.85, '#ffd9a0'],
  [1, '#9a5f27'],
]
const FLAME: Stops = [
  [0, '#e2531b'],
  [0.32, '#f58a2a'],
  [0.66, '#ffd166'],
  [1, '#fff8dc'],
]
const MARBLE: Stops = [
  [0, '#fbfaf6'],
  [0.4, '#e2dfd8'],
  [0.52, '#c2c7ca'],
  [0.64, '#efeee9'],
  [1, '#b1b6b9'],
]
const VEINS =
  'repeating-linear-gradient(118deg, transparent 0 0.34em, rgb(84 98 110 / 0.5) 0.36em, transparent 0.4em 0.9em), repeating-linear-gradient(64deg, transparent 0 0.6em, rgb(84 98 110 / 0.28) 0.62em, transparent 0.65em 1.5em)'
const LIGHT: Stops = [
  [0, '#ffffff'],
  [1, '#fff1cc'],
]

const plain = (extra: Omit<Material, 'fill'>): Material => ({
  fill: 'FG',
  ...extra,
})

/** The looks, by name. */
export const MATERIALS = {
  /** The default hero: the section's colour, lit from above. */
  accent: {
    fill: [
      [0, 'color-mix(in oklab, ACCENT 52%, white)'],
      [0.5, 'ACCENT'],
      [1, 'color-mix(in oklab, ACCENT 74%, black)'],
    ],
    glow: 'ACCENT',
    glowLevel: 0.5,
    sheen: ['rgb(255 255 255 / 0.55)', 8],
  },
  gold: {
    fill: GOLD,
    glow: '#e6a93a',
    glowLevel: 0.55,
    sheen: ['rgb(255 252 232 / 0.95)', 4],
    edge: '1px rgb(96 60 8 / 0.55)',
  },
  /** Gold that keeps climbing. */
  lift: {
    fill: GOLD,
    glow: '#e6a93a',
    glowLevel: 0.6,
    sheen: ['rgb(255 252 232 / 0.95)', 4],
    edge: '1px rgb(96 60 8 / 0.55)',
    motion: 'rise',
  },
  silver: {
    fill: SILVER,
    glow: '#b9d6ea',
    glowLevel: 0.4,
    sheen: ['rgb(255 255 255 / 0.95)', 6],
    edge: '1px rgb(40 52 64 / 0.5)',
  },
  /** Silver strung tight: it hums. */
  string: {
    fill: SILVER,
    glow: '#b9d6ea',
    glowLevel: 0.35,
    sheen: ['rgb(255 255 255 / 0.9)', 2],
    motion: 'hum',
    enter: 'write',
  },
  brass: {
    fill: BRASS,
    glow: '#e0895a',
    glowLevel: 0.45,
    sheen: ['rgb(255 240 210 / 0.8)', 4],
    edge: '1px rgb(70 38 10 / 0.6)',
    enter: 'tick',
    motion: 'tick',
  },
  steel: {
    fill: [
      [0, '#e9eef2'],
      [0.45, '#7c8892'],
      [0.55, '#3d4850'],
      [1, '#aab4bc'],
    ],
    glow: '#7f97a8',
    glowLevel: 0.3,
    edge: '1px rgb(20 28 34 / 0.7)',
    enter: 'tick',
    motion: 'tick',
  },
  fire: {
    fill: FLAME,
    glow: '#ff6a1f',
    glowLevel: 0.7,
    motion: 'flicker',
  },
  /** One small flame: warmer, quieter. */
  flame: {
    fill: FLAME,
    glow: '#ff8a3a',
    glowLevel: 0.55,
    motion: 'flicker',
    enter: 'soft',
  },
  ice: {
    fill: [
      [0, '#ffffff'],
      [0.3, '#dcf3ff'],
      [0.62, '#93cff0'],
      [1, '#4d93c8'],
    ],
    over: 'repeating-linear-gradient(72deg, transparent 0 0.22em, rgb(255 255 255 / 0.55) 0.235em, transparent 0.25em 0.61em)',
    glow: '#7fc8ff',
    glowLevel: 0.45,
    sheen: ['rgb(255 255 255 / 0.9)', 16],
    edge: '1px rgb(255 255 255 / 0.75)',
  },
  midnight: {
    fill: [
      [0, '#a9bcff'],
      [0.5, '#4a5fd0'],
      [1, '#1b2270'],
    ],
    glow: '#4c5cff',
    glowLevel: 0.6,
    edge: '1px rgb(170 190 255 / 0.5)',
  },
  ghost: {
    fill: '#e3edf4',
    glow: '#cfe4f2',
    glowLevel: 0.7,
    mask: 'linear-gradient(180deg, #000 35%, rgb(0 0 0 / 0.15) 100%)',
    alpha: 0.6,
    motion: 'float',
    enter: 'soft',
  },
  shadow: {
    fill: '#14242e',
    edge: '1px rgb(145 191 215 / 0.45)',
    glow: '#000000',
    glowLevel: 0.6,
    motion: 'lean',
  },
  dark: {
    fill: '#081620',
    edge: '1.5px rgb(120 160 185 / 0.6)',
    glow: '#000000',
    glowLevel: 0.7,
  },
  ash: {
    fill: [
      [0, '#d9d5cc'],
      [1, '#6a665f'],
    ],
    glow: '#8a7a66',
    glowLevel: 0.25,
    enter: 'soft',
  },
  neon: {
    fill: '#ffffff',
    glow: 'ACCENT',
    glowLevel: 1,
    edge: '1px color-mix(in oklab, ACCENT 70%, white)',
    motion: 'jitter',
  },
  light: { fill: LIGHT, glow: '#fff1c4', glowLevel: 0.75 },
  /** Light that appears out of nothing. */
  beam: { fill: LIGHT, glow: '#ffffff', glowLevel: 0.9, enter: 'appear' },
  bright: { fill: '#ffffff', glow: '#fff3c4', glowLevel: 1 },
  star: {
    fill: '#ffffff',
    glow: '#cfe6ff',
    glowLevel: 0.9,
    motion: 'tremble',
  },
  halo: {
    fill: LIGHT,
    glow: '#ffe7a3',
    glowLevel: 1,
    edge: '1px rgb(255 240 200 / 0.8)',
    motion: 'breathe',
  },
  moon: {
    fill: [
      [0, '#ffffff'],
      [1, '#91bfd7'],
    ],
    glow: '#91bfd7',
    glowLevel: 0.7,
  },
  sky: {
    fill: [
      [0, '#ffffff'],
      [0.6, '#bfe0f2'],
      [1, '#6fa6c6'],
    ],
    glow: '#91bfd7',
    glowLevel: 0.6,
    motion: 'air',
  },
  marble: {
    fill: MARBLE,
    over: VEINS,
    glow: '#dfe7ec',
    glowLevel: 0.3,
    edge: '1px rgb(60 70 78 / 0.4)',
  },
  stone: {
    fill: [
      [0, '#b3bbbf'],
      [0.55, '#7b858a'],
      [1, '#4f585d'],
    ],
    over: VEINS,
    edge: '1px rgb(20 26 30 / 0.6)',
    motion: 'sink',
  },
  water: {
    fill: [
      [0, '#e2fbff'],
      [0.4, '#63cbbd'],
      [1, '#1c6f93'],
    ],
    glow: '#4fc0ae',
    glowLevel: 0.5,
    sheen: ['rgb(255 255 255 / 0.7)', 8],
    motion: 'wave',
  },
  rain: {
    fill: [
      [0, '#f1f9ff'],
      [1, '#91bfd7'],
    ],
    glow: '#91bfd7',
    glowLevel: 0.35,
    enter: 'fall',
  },
  storm: {
    fill: [
      [0, '#f5f9ff'],
      [0.5, '#a3b7ca'],
      [1, '#516476'],
    ],
    glow: '#cfe2ff',
    glowLevel: 0.35,
    edge: '1px rgb(20 30 40 / 0.6)',
    motion: 'flash',
  },
  heart: {
    fill: [
      [0, '#ffe0cc'],
      [0.5, '#e8855c'],
      [1, '#a8402c'],
    ],
    glow: '#ff6f4d',
    glowLevel: 0.6,
    motion: 'pulse',
  },
  sigil: {
    fill: GOLD,
    glow: '#e6bc63',
    glowLevel: 0.8,
    enter: 'write',
  },
  echo: {
    fill: 'color-mix(in oklab, ACCENT 45%, white)',
    glow: 'ACCENT',
    glowLevel: 0.4,
    motion: 'echo',
  },
  /** The colour of the sand a word is made of. */
  sand: { fill: '#f0cf85', glow: '#e6a93a', glowLevel: 0.35 },
  halfseen: plain({
    mask: 'linear-gradient(90deg, #000 30%, transparent 78%)',
  }),
  unseen: {
    fill: 'transparent',
    edge: '1px rgb(255 255 255 / 0.3)',
    enter: 'appear',
  },
  dream: plain({ alpha: 0.75, enter: 'soft', motion: 'float' }),
  air: plain({ alpha: 0.7, motion: 'air', enter: 'soft' }),
  breathe: plain({ motion: 'breathe' }),
  hum: plain({ motion: 'hum' }),
  lean: plain({ motion: 'lean' }),
  hush: {
    fill: 'color-mix(in oklab, ACCENT 40%, white)',
    glow: 'ACCENT',
    glowLevel: 0.35,
    enter: 'soft',
    motion: 'breathe',
  },
  soft: plain({ enter: 'soft' }),
  turn: plain({ enter: 'tick', motion: 'tick' }),
  write: plain({ enter: 'write' }),
  pull: plain({ enter: 'pull' }),
  climb: plain({ enter: 'climb', motion: 'rise' }),
  fall: plain({ enter: 'fall' }),
  appear: plain({ enter: 'appear' }),
  pulse: plain({ motion: 'pulse' }),
  dance: plain({ motion: 'sway' }),
  bend: plain({ motion: 'bend' }),
  crack: {
    fill: 'FG',
    glow: 'ACCENT',
    glowLevel: 0.7,
    motion: 'crack',
  },
  low: plain({ motion: 'sink', alpha: 0.8 }),
  fade: plain({ motion: 'fade' }),
  brief: plain({ motion: 'brief' }),
  sub: plain({ motion: 'sub' }),
  sing: { fill: LIGHT, glow: '#fff1c4', glowLevel: 0.7, motion: 'voice' },
} satisfies Record<string, Material>

export type MaterialName = keyof typeof MATERIALS
