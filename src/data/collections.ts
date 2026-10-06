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
    label: 'Brother and sister',
    blurb:
      'The story at the heart of the album: a boy who trusted pencil, a sister who wrote in ink, and the elements they taught each other.',
    // The baritone Pencil and Pen opens the group and the three originals
    // close it; what grew out of them sits between.
    opening: ['baritone'],
    closing: ['pencil', 'fire', 'water'],
  },
  {
    key: 'kin',
    label: 'You made me more',
    blurb:
      'For the people who shaped him: a best friend the world calls too much, the friends who became family, a mum’s tales from the shore, and a pup still waiting on its name.',
  },
  {
    key: 'rising',
    label: 'Hope and rising',
    blurb:
      'Hope as a choice made every morning and every night, and the flame that answers the longest night.',
  },
  {
    key: 'critic',
    label: 'The devil in my head',
    blurb:
      'The inner voice that keeps score, moves the goalposts and calls him too much, named and turned into fuel.',
  },
  {
    key: 'enough',
    label: 'More than enough',
    blurb:
      'Called too much by people who saw the wave and missed the swimmer: the answer, from a shrug to a rise.',
  },
  {
    key: 'ashes',
    label: 'Ashes to stardust',
    blurb:
      'Myth and ritual: the raven between worlds, the elements, the golden child’s legend, and the dark made beautiful.',
  },
  {
    key: 'norse',
    label: 'The Valkyrie and the Seer',
    blurb:
      'Norse ritual in neo-folk: a guardian in the dark, a seer who opens the eye with bone, breath and stone, and Hel answering from the cold.',
  },
  {
    key: 'silicon',
    label: 'Carbon and silicon',
    blurb:
      'A mind that thinks in networks, and the machine it taught to sing back.',
  },
] as const satisfies readonly {
  key: string
  label: string
  blurb: string
  opening?: readonly TrackId[]
  closing?: readonly TrackId[]
}[]

export type Collection = (typeof COLLECTIONS)[number]
export type CollectionKey = Collection['key']

/** Each song's one collection; a new track id fails to compile until it has one. */
export const COLLECTION_OF: Record<TrackId, CollectionKey> = {
  pencil: 'siblings',
  fire: 'siblings',
  water: 'siblings',
  memories: 'siblings',
  baritone: 'siblings',
  hearts: 'siblings',
  beginning: 'siblings',
  elements: 'siblings',
  edm: 'siblings',
  shanty: 'siblings',
  constellations: 'kin',
  heavy: 'kin',
  love: 'kin',
  neofolk: 'kin',
  ritual: 'kin',
  whales: 'kin',
  yours: 'kin',
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
  mercy: 'critic',
  devil: 'critic',
  guitar: 'critic',
  forging: 'critic',
  county: 'critic',
  name: 'critic',
  toomuch: 'enough',
  better: 'enough',
  faith: 'enough',
  rise: 'enough',
  hypnotic: 'enough',
  unleash: 'enough',
  boss: 'enough',
  quiet: 'enough',
  dust: 'ashes',
  raven: 'ashes',
  beautiful: 'ashes',
  rewrite: 'ashes',
  legend: 'ashes',
  resolve: 'ashes',
  carry: 'ashes',
  wound: 'ashes',
  nightsong: 'norse',
  kindred: 'norse',
  seer: 'norse',
  valkyrie: 'norse',
  mashup: 'norse',
  systems: 'silicon',
  node: 'silicon',
  binary: 'silicon',
  prompt: 'silicon',
  developer: 'silicon',
}
