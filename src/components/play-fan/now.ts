import type { TrackId } from '@/data/tracks'
import type { PlayerState } from '@/store/player'

/**
 * The fan's song's elapsed time in whole seconds: the fan re-renders once a
 * second rather than every frame, and keeps its time while it folds.
 */
export function fanElapsed(
  s: Pick<PlayerState, 'track' | 'currentTime'>,
  target: TrackId
) {
  return s.track === target ? Math.floor(s.currentTime) : 0
}
