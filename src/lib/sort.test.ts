import { describe, expect, it } from 'vitest'
import { COLLECTIONS, COLLECTION_OF } from '@/data/collections'
import { TRACKS, TRACK_ORDER, type TrackId } from '@/data/tracks'
import {
  ALBUM_SORTS,
  compareTitles,
  groupTracks,
  groupTracksByMonth,
  sortTracks,
} from './sort'

const albumIndex = (id: TrackId) => TRACK_ORDER.indexOf(id)
const shuffled: TrackId[] = [...TRACK_ORDER].reverse()

describe('compareTitles', () => {
  it('ignores case and accents', () => {
    expect(compareTitles('éclair', 'Eclair')).toBe(0)
    expect(['Zed', 'éclair', 'apple'].sort(compareTitles)).toEqual([
      'apple',
      'éclair',
      'Zed',
    ])
  })
})

describe('sortTracks', () => {
  it('returns a permutation of the ids given, whatever the sort', () => {
    const some: TrackId[] = ['binary', 'baritone', 'node']
    for (const sort of ALBUM_SORTS)
      expect([...sortTracks(some, sort)].sort()).toEqual([...some].sort())
  })

  it('restores album order', () => {
    expect(sortTracks(shuffled, 'album')).toEqual([...TRACK_ORDER])
    expect(sortTracks(['binary', 'baritone', 'node'], 'album')).toEqual([
      'baritone',
      'node',
      'binary',
    ])
  })

  it('sorts A to Z by title', () => {
    const titles = sortTracks(shuffled, 'title').map((id) => TRACKS[id].title)
    for (let i = 1; i < titles.length; i++)
      expect(compareTitles(titles[i - 1], titles[i])).toBeLessThanOrEqual(0)
    // A version sorts right after its original, the title being a prefix.
    const ids = sortTracks(shuffled, 'title')
    expect(ids.indexOf('plotlight')).toBe(ids.indexOf('plot') + 1)
  })

  it('sorts by the day written, oldest first, album order on a tie', () => {
    const ids = sortTracks(shuffled, 'written')
    for (let i = 1; i < ids.length; i++) {
      const a = TRACKS[ids[i - 1]]
      const b = TRACKS[ids[i]]
      expect(a.written <= b.written).toBe(true)
      if (a.written === b.written)
        expect(albumIndex(a.id)).toBeLessThan(albumIndex(b.id))
    }
    expect(ids[0]).toBe('baritone')
  })

  it('groups by collection, album order within', () => {
    const ids = sortTracks(shuffled, 'collection')
    const rank = (id: TrackId) =>
      COLLECTIONS.findIndex((c) => c.key === COLLECTION_OF[id])
    for (let i = 1; i < ids.length; i++) {
      const a = ids[i - 1]
      const b = ids[i]
      expect(rank(a)).toBeLessThanOrEqual(rank(b))
      if (rank(a) === rank(b)) expect(albumIndex(a)).toBeLessThan(albumIndex(b))
    }
    expect(COLLECTION_OF[ids[0]]).toBe(COLLECTIONS[0].key)
  })
})

describe('groupTracks', () => {
  it('lists the collections in order, each with its songs in album order', () => {
    const groups = groupTracks(shuffled)
    expect(groups.map((g) => g.collection.key)).toEqual(
      COLLECTIONS.map((c) => c.key)
    )
    for (const g of groups) {
      expect(g.ids.length).toBeGreaterThan(0)
      for (const id of g.ids) expect(COLLECTION_OF[id]).toBe(g.collection.key)
      const opening: readonly string[] =
        'opening' in g.collection ? g.collection.opening : []
      const closing: readonly string[] =
        'closing' in g.collection ? g.collection.closing : []
      const has = (id: string) => g.ids.includes(id as (typeof g.ids)[number])
      const head = opening.filter(has)
      const tail = closing.filter(has)
      const middle = g.ids.slice(head.length, g.ids.length - tail.length)
      expect(g.ids.slice(0, head.length)).toEqual(head)
      expect(middle).toEqual(sortTracks(middle, 'album'))
      expect(g.ids.slice(g.ids.length - tail.length)).toEqual(tail)
    }
  })

  it('opens the brother-and-sister group with the baritone and closes it with the two originals', () => {
    const siblings = groupTracks(shuffled).find(
      (g) => g.collection.key === 'siblings'
    )
    expect(siblings?.ids[0]).toBe('baritone')
    expect(siblings?.ids.slice(-2)).toEqual(['fire', 'water'])
  })

  it('omits collections none of the given songs belong to', () => {
    const groups = groupTracks(['binary', 'baritone'])
    expect(groups.map((g) => g.collection.key)).toEqual([
      COLLECTION_OF.baritone,
      COLLECTION_OF.binary,
    ])
    expect(groupTracks([])).toEqual([])
  })
})

describe('groupTracksByMonth', () => {
  it('buckets the songs by the month written, oldest first, oldest first within', () => {
    const groups = groupTracksByMonth(shuffled)
    expect(groups.flatMap((g) => g.ids)).toEqual(
      sortTracks(shuffled, 'written')
    )
    const keys = groups.map((g) => g.key)
    expect(keys).toEqual([...keys].sort())
    expect(new Set(keys).size).toBe(keys.length)
    for (const g of groups) {
      expect(g.ids.length).toBeGreaterThan(0)
      for (const id of g.ids) expect(TRACKS[id].written.slice(0, 7)).toBe(g.key)
    }
  })

  it('labels a month in full with its year', () => {
    const [first] = groupTracksByMonth(['baritone'])
    expect(first.key).toBe(TRACKS.baritone.written.slice(0, 7))
    expect(first.label).toBe('March 2026')
  })

  it('is empty for no songs', () => {
    expect(groupTracksByMonth([])).toEqual([])
  })
})
