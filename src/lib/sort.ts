import {
  COLLECTIONS,
  COLLECTION_OF,
  type Collection,
  type CollectionKey,
} from '@/data/collections'
import { TRACKS, TRACK_ORDER, type TrackId } from '@/data/tracks'

/** How the Album list can be ordered; `album` is the default and stays out of the URL. */
export const ALBUM_SORTS = ['album', 'title', 'written', 'collection'] as const
export type AlbumSort = (typeof ALBUM_SORTS)[number]

type Compare = (a: TrackId, b: TrackId) => number

const COLLECTION_RANK = Object.fromEntries(
  COLLECTIONS.map((c, i) => [c.key, i])
) as Record<CollectionKey, number>

/** Case and accents aside: "éclair" and "Eclair" are the same word. */
export const compareTitles = (a: string, b: string) =>
  a.localeCompare(b, 'en', { sensitivity: 'base' })

const byAlbum: Compare = (a, b) =>
  TRACK_ORDER.indexOf(a) - TRACK_ORDER.indexOf(b)
const byTitle: Compare = (a, b) =>
  compareTitles(TRACKS[a].title, TRACKS[b].title) || byAlbum(a, b)
// ISO dates compare as strings; same day falls back to album order.
const byWritten: Compare = (a, b) =>
  TRACKS[a].written.localeCompare(TRACKS[b].written) || byAlbum(a, b)
const byCollection: Compare = (a, b) =>
  COLLECTION_RANK[COLLECTION_OF[a]] - COLLECTION_RANK[COLLECTION_OF[b]] ||
  byAlbum(a, b)

const COMPARE: Record<AlbumSort, Compare> = {
  album: byAlbum,
  title: byTitle,
  written: byWritten,
  collection: byCollection,
}

/** The same ids in the given order; the input is left alone. */
export function sortTracks(
  ids: readonly TrackId[],
  sort: AlbumSort
): TrackId[] {
  return [...ids].sort(COMPARE[sort])
}

export type MonthGroup = {
  /** "2026-03" */
  key: string
  /** "March 2026" */
  label: string
  ids: TrackId[]
}

const monthLabel = (key: string) =>
  new Date(`${key}-01T12:00:00`).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  })

/** The ids by the month they were written, oldest first, oldest first within. */
export function groupTracksByMonth(ids: readonly TrackId[]): MonthGroup[] {
  const months = new Map<string, TrackId[]>()
  for (const id of sortTracks(ids, 'written')) {
    const key = TRACKS[id].written.slice(0, 7)
    const mine = months.get(key)
    if (mine) mine.push(id)
    else months.set(key, [id])
  }
  return [...months].map(([key, ids]) => ({ key, label: monthLabel(key), ids }))
}

/**
 * The ids by collection, in COLLECTIONS order; album order within, except a
 * collection's `opening` songs, which come first, and its `closing` songs,
 * which come last, each in their given order. Collections with no song
 * given are left out.
 */
export function groupTracks(
  ids: readonly TrackId[]
): { collection: Collection; ids: TrackId[] }[] {
  return COLLECTIONS.map((collection) => {
    const mine = ids.filter((id) => COLLECTION_OF[id] === collection.key)
    const opening: readonly TrackId[] =
      'opening' in collection ? collection.opening : []
    const closing: readonly TrackId[] =
      'closing' in collection ? collection.closing : []
    const pinned = [...opening, ...closing]
    return {
      collection,
      ids: [
        ...opening.filter((id) => mine.includes(id)),
        ...sortTracks(
          mine.filter((id) => !pinned.includes(id)),
          'album'
        ),
        ...closing.filter((id) => mine.includes(id)),
      ],
    }
  }).filter((group) => group.ids.length > 0)
}
