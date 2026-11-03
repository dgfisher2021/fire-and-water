import type { TrackId } from './tracks'

/**
 * The album by theme, in display order: the brother-and-sister story first.
 * Every song sits in exactly one collection; a version, remix or mashup
 * sits with its original. A collection's `opening` songs come first in its
 * group and its `closing` songs last, each in the given order; the rest
 * keep album order.
 */
export const COLLECTIONS = [
  {
    key: 'siblings',
    cover: 'baritone',
    label: 'Pencil and Pen',
    blurb:
      'The story at the heart of the album: a boy who trusted pencil, a sister who wrote in ink, the elements they taught each other, and the story he was scared to tell.',
    // The baritone Pencil and Pen opens the group and the three originals
    // close it; what grew out of them sits between.
    opening: ['baritone'],
    closing: ['fire', 'water'],
  },
  {
    key: 'kin',
    cover: 'constellations',
    label: 'You Made Me More',
    blurb:
      'For the people who shaped him: a best friend the world calls too much, the friends who became family, a mum’s tales from the shore, a pup still waiting on its name, and the old dog who stayed twelve years.',
  },
  {
    key: 'plain',
    cover: 'team',
    label: 'Say It Plain',
    blurb:
      'Love under strain: an apology made early, a no that has to stand the first time, a man translating between two people he loves, and the promises that left the room cold.',
    // The one fight from both sides, and the one standing between, first.
    opening: ['team', 'sayno', 'breathe'],
  },
  {
    key: 'rising',
    cover: 'hope',
    label: 'Hope and Rising',
    blurb:
      'Hope as a choice made every morning and every night, and the flame that answers the longest night.',
  },
  {
    key: 'critic',
    cover: 'devil',
    label: 'The Devil in My Head',
    blurb:
      'The inner voice that keeps score, moves the goalposts and calls him too much, named and turned into fuel.',
  },
  {
    key: 'enough',
    cover: 'toomuch',
    label: 'More Than Enough',
    blurb:
      'Called too much, too fast and too loud by people who saw the wave and missed the swimmer: the answer, from a shrug to a rise.',
  },
  {
    key: 'ashes',
    cover: 'stardust',
    label: 'Ashes to Stardust',
    blurb:
      'Myth and ritual: the raven between worlds, the elements, the golden child’s legend, and the dark made beautiful.',
  },
  {
    key: 'norse',
    cover: 'mashup',
    label: 'The Valkyrie and the Seer',
    blurb:
      'Norse ritual in neo-folk: a guardian in the dark, a seer who opens the eye with bone, breath and stone, and Hel answering from the cold.',
  },
  {
    key: 'silicon',
    cover: 'augmented',
    label: 'Augmented Intelligence',
    blurb:
      'The machine he taught to sing back: hymns from the training run, a cypher from both sides of the chat, a duet on working side by side, and the nights spent coding.',
  },
] as const satisfies readonly {
  key: string
  /** The song whose cover stands for the album on the Albums tab. */
  cover: TrackId
  label: string
  blurb: string
  opening?: readonly TrackId[]
  closing?: readonly TrackId[]
}[]

export type Collection = (typeof COLLECTIONS)[number]
export type CollectionKey = Collection['key']

/** Each song's one collection; a new track id fails to compile until it has one. */
export const COLLECTION_OF: Record<TrackId, CollectionKey> = {
  fire: 'siblings',
  water: 'siblings',
  memories: 'siblings',
  baritone: 'siblings',
  hearts: 'siblings',
  beginning: 'siblings',
  elements: 'siblings',
  edm: 'siblings',
  shanty: 'siblings',
  firemix: 'siblings',
  constellations: 'kin',
  heavy: 'kin',
  love: 'kin',
  neofolk: 'kin',
  ritual: 'kin',
  whales: 'kin',
  yours: 'kin',
  always: 'kin',
  breathe: 'plain',
  team: 'plain',
  mustang: 'kin',
  wild: 'kin',
  feelfree: 'kin',
  friction: 'kin',
  wolf: 'kin',
  wildfolk: 'kin',
  change: 'rising',
  espoir: 'rising',
  waves: 'rising',
  hope: 'rising',
  flame: 'rising',
  refuse: 'rising',
  anglais: 'rising',
  plot: 'rising',
  plotlight: 'rising',
  potential: 'rising',
  ocean: 'rising',
  choose: 'rising',
  femme: 'rising',
  dream: 'rising',
  bending: 'rising',
  mercy: 'critic',
  devil: 'critic',
  guitar: 'critic',
  forging: 'critic',
  county: 'critic',
  name: 'critic',
  dont: 'critic',
  forgot: 'plain',
  bitter: 'plain',
  bittercut: 'plain',
  toomuch: 'enough',
  better: 'enough',
  faith: 'enough',
  rise: 'enough',
  hypnotic: 'enough',
  unleash: 'enough',
  boss: 'enough',
  quiet: 'enough',
  untamed: 'enough',
  connects: 'enough',
  neuro: 'enough',
  office: 'enough',
  working: 'enough',
  people: 'enough',
  dopamine: 'enough',
  tidal: 'enough',
  dust: 'ashes',
  raven: 'ashes',
  beautiful: 'ashes',
  rewrite: 'ashes',
  legend: 'ashes',
  echoes: 'ashes',
  desert: 'ashes',
  operatic: 'ashes',
  prince: 'ashes',
  resolve: 'ashes',
  carry: 'ashes',
  wound: 'ashes',
  nightsong: 'norse',
  kindred: 'norse',
  seer: 'norse',
  valkyrie: 'norse',
  mashup: 'norse',
  systems: 'enough',
  node: 'silicon',
  binary: 'silicon',
  prompt: 'silicon',
  developer: 'silicon',
  augmented: 'silicon',
  sleepless: 'silicon',
  loop: 'silicon',
  lament: 'silicon',
  showup: 'silicon',
  downbeat: 'silicon',
  trance: 'rising',
  dreamtwo: 'rising',
  sayno: 'plain',
  telemetry: 'enough',
  stardust: 'ashes',
  lookagain: 'silicon',
  lift: 'ashes',
  crash: 'kin',
  signal: 'enough',
  storyofme: 'siblings',
}
