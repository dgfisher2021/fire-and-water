import { describe, expect, it } from 'vitest'
import { COLLECTIONS, COLLECTION_OF } from './collections'
import { TRACK_ORDER, type TrackId } from './tracks'

// A version, remix or mashup sits with its original.
const FAMILIES: TrackId[][] = [
  ['pencil', 'baritone'],
  ['fire', 'water'],
  ['waves', 'hope', 'espoir'],
  ['devil', 'guitar'],
  ['forging', 'county'],
  ['faith', 'rise', 'hypnotic'],
  ['beautiful', 'rewrite', 'wound'],
  ['plot', 'plotlight'],
  ['love', 'neofolk', 'ritual'],
  ['valkyrie', 'mashup', 'kindred'],
  ['seer', 'nightsong'],
  ['dust', 'resolve'],
  ['memories', 'edm', 'shanty'],
  ['raven', 'carry'],
  ['espoir', 'anglais'],
]

describe('the collections', () => {
  const keys = COLLECTIONS.map((c) => c.key)

  it('have distinct keys, a label and a blurb each', () => {
    expect(new Set(keys).size).toBe(COLLECTIONS.length)
    for (const c of COLLECTIONS) {
      expect(c.label.length).toBeGreaterThan(0)
      expect(c.blurb.length).toBeGreaterThan(0)
    }
  })

  it('place every song in a known collection', () => {
    for (const id of TRACK_ORDER) expect(keys, id).toContain(COLLECTION_OF[id])
  })

  it('each hold at least one song', () => {
    for (const key of keys)
      expect(
        TRACK_ORDER.some((id) => COLLECTION_OF[id] === key),
        key
      ).toBe(true)
  })

  it('keep a song and its versions together', () => {
    for (const family of FAMILIES)
      expect(new Set(family.map((id) => COLLECTION_OF[id])).size).toBe(1)
  })
})
