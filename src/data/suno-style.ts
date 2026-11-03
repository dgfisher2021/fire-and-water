import catalog from './suno-catalog.json'
import { TRACK_ORDER, type TrackId } from './tracks'

/** The Suno style prompt each album song was made with, from the catalogue. */
const STYLE = new Map(
  catalog.songs
    .filter((s) => s.appId && s.style)
    .map((s) => [s.appId as TrackId, s.style as string])
)

export const sunoStyle = (id: TrackId): string | undefined => STYLE.get(id)

/**
 * The album songs whose Suno style prompt names a style ("Pop" as a whole
 * word, so "dream pop" counts and "popular" does not), in album order.
 */
export function songsInStyle(style: string): TrackId[] {
  const word = new RegExp(`\\b${style.replace(/\s+/g, '\\s+')}\\b`, 'i')
  return TRACK_ORDER.filter((id) => word.test(STYLE.get(id) ?? ''))
}

/** How many album songs have a style prompt on file. */
export const styledSongCount = (): number =>
  TRACK_ORDER.filter((id) => STYLE.has(id)).length
