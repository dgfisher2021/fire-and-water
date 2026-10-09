import { useEffect } from 'react'
import { useMediaQuery } from '@dust-ui/ui'
import { TRACKS } from '@/data/tracks'
import { loadPulse, pulseAt, type Pulse } from '@/lib/pulse'
import { usePlayer, type PlayerState } from '@/store/player'

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

    // The store ticks every frame; the pulse has ten readings a second.
    // Writing the root's variables restyles the page and re-blurs every
    // glass layer over the glow, so write at that rate and only on change
    // (every frame froze iPhones).
    let lastWrite = 0
    let bass = ''
    let vocal = ''
    const set = (b: string, v: string) => {
      if (b === bass && v === vocal) return
      bass = b
      vocal = v
      root.style.setProperty('--pulse-bass', b)
      root.style.setProperty('--pulse-vocal', v)
    }

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
      if (s.status !== 'playing' || !pulse) return set('0', '0')
      const now = performance.now()
      if (now - lastWrite < 1000 / pulse.fps) return
      lastWrite = now
      set(
        pulseAt(pulse.bass, pulse.fps, s.currentTime).toFixed(2),
        pulseAt(pulse.vocal, pulse.fps, s.currentTime).toFixed(2)
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
