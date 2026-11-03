import catalog from './suno-catalog.json'
import type { TrackId } from './tracks'

/** The Suno style prompt each album song was made with, from the catalogue. */
const STYLE = new Map(
  catalog.songs
    .filter((s) => s.appId && s.style)
    .map((s) => [s.appId as TrackId, s.style as string])
)

export const sunoStyle = (id: TrackId): string | undefined => STYLE.get(id)
