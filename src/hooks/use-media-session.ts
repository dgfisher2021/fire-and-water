import { useEffect } from 'react'
import { ALBUM, TRACKS, adjacentTrack } from '@/data/tracks'
import { usePlayer } from '@/store/player'

const ACTIONS: MediaSessionAction[] = [
  'play',
  'pause',
  'previoustrack',
  'nexttrack',
  'seekto',
]

/** Lock-screen / hardware-key controls via the Media Session API. */
export function useMediaSession() {
  const track = usePlayer((s) => s.track)

  useEffect(() => {
    if (!('mediaSession' in navigator) || !track) return
    const t = TRACKS[track]
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title,
      artist: ALBUM.artist,
      album: ALBUM.title,
      artwork: [
        {
          src: new URL(t.art.thumb, document.baseURI).href,
          sizes: '512x512',
          type: 'image/webp',
        },
      ],
    })
  }, [track])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const session = navigator.mediaSession
    const current = () => usePlayer.getState()

    session.setActionHandler('play', () => {
      const t = current().track
      if (t) current().play(t)
    })
    session.setActionHandler('pause', () => current().pause())
    // Requests (not plain plays) so an open lyrics view follows the change.
    session.setActionHandler('previoustrack', () => {
      const t = current().track
      if (t) current().requestTrack(adjacentTrack(t, -1))
    })
    session.setActionHandler('nexttrack', () => {
      const t = current().track
      if (t) current().requestTrack(adjacentTrack(t, 1))
    })
    session.setActionHandler('seekto', (details) => {
      if (details.seekTime != null) current().seek(details.seekTime)
    })
    return () => {
      for (const action of ACTIONS) session.setActionHandler(action, null)
    }
  }, [])
}
