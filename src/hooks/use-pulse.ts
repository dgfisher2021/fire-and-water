import { useEffect } from 'react'
import { TRACKS } from '@/data/tracks'
import { loadPulse, pulseAt, type Pulse } from '@/lib/pulse'
import { usePlayer, type PlayerState } from '@/store/player'
import { useMediaQuery } from '@/hooks/use-media-query'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

/**
 * Writes --pulse-bass and --pulse-vocal (0 to 1) on `root` while a song
 * plays, from its pulse file; 0 when paused, before it loads, or under
 * reduced motion. It follows the store outside React, so nothing re-renders
 * per frame; styles read the variables.
 */
export function usePulseVars(root: HTMLElement | null) {
  const reduced = useMediaQuery(REDUCED_MOTION)

  useEffect(() => {
    if (!root || reduced) return
    let alive = true
    let pulse: Pulse | null = null
    let loadedFor: string | null = null

    const write = (s: PlayerState) => {
      const audioFile = s.track ? TRACKS[s.track].audioFile : null
      if (audioFile !== loadedFor) {
        loadedFor = audioFile
        pulse = null
        if (audioFile)
          void loadPulse(audioFile).then((p) => {
            if (alive && loadedFor === audioFile) pulse = p
          })
      }
      const on = s.status === 'playing' && pulse
      root.style.setProperty(
        '--pulse-bass',
        on ? pulseAt(pulse!.bass, pulse!.fps, s.currentTime).toFixed(3) : '0'
      )
      root.style.setProperty(
        '--pulse-vocal',
        on ? pulseAt(pulse!.vocal, pulse!.fps, s.currentTime).toFixed(3) : '0'
      )
    }

    write(usePlayer.getState())
    const unsubscribe = usePlayer.subscribe(write)
    return () => {
      alive = false
      unsubscribe()
      root.style.removeProperty('--pulse-bass')
      root.style.removeProperty('--pulse-vocal')
    }
  }, [root, reduced])
}
