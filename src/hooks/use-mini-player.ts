import { useRouterState } from '@tanstack/react-router'
import { usePlayer } from '@/store/player'

/** Gap between the mini player and the nav, matching its side margins. */
export const MINI_PLAYER_GAP = 12
/** Height the shell reserves above the nav while the mini player shows: the strip plus its gap. */
export const MINI_PLAYER_H = 64 + MINI_PLAYER_GAP

/** True on the screens without a transport of their own while a song is loaded. */
export function useMiniPlayerVisible() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const loaded = usePlayer((s) => s.track !== null)
  return (
    loaded &&
    !pathname.startsWith('/lyrics') &&
    !pathname.startsWith('/compare') &&
    !pathname.startsWith('/time')
  )
}
