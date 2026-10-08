import { useState } from 'react'
import { TRACKS, type TrackId } from '@/data/tracks'

/**
 * The artwork the backdrop holds: the song showing and the one fading out.
 * Never the whole album: 95 full covers decoded at once crash iOS tabs.
 */
export function useBackdropImages(theme: string) {
  const [ids, setIds] = useState([theme])
  if (ids[ids.length - 1] !== theme) setIds([ids[ids.length - 1], theme])
  return ids
    .filter((id) => id in TRACKS)
    .map((id) => ({ id, src: TRACKS[id as TrackId].art.full }))
}
