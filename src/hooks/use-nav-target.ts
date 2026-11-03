import { useMatch } from '@tanstack/react-router'
import type { TrackId } from '@/data/tracks'
import { selectFocusTrack, usePlayer } from '@/store/player'

/**
 * The song the nav's play button acts on. On Now Playing it belongs to the
 * song on screen; elsewhere it drives whatever is loaded, else the song on
 * the stage.
 */
export function useNavTarget(): { target: TrackId; playing: boolean } {
  const focus = usePlayer(selectFocusTrack)
  const loaded = usePlayer((s) => s.track)
  const status = usePlayer((s) => s.status)
  const openTrack = useMatch({
    from: '/lyrics/$track',
    shouldThrow: false,
    select: (m) => m.params.track,
  })
  const target = openTrack ?? loaded ?? focus
  const playing =
    loaded === target && (status === 'playing' || status === 'loading')
  return { target, playing }
}
