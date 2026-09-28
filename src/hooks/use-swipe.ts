import { useEffect, useRef } from 'react'

export type SwipeHandlers = {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  /** Minimum horizontal travel in px. Default 60. */
  threshold?: number
}

/**
 * Horizontal swipe on a touch surface. Passive listeners, so the pane keeps
 * native scrolling; a mostly-vertical gesture cancels the swipe so it never
 * fights a scroll or a drawer drag.
 */
export function useSwipe<T extends HTMLElement>(handlers: SwipeHandlers) {
  const ref = useRef<T>(null)
  const latest = useRef(handlers)
  useEffect(() => {
    latest.current = handlers
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let startX = 0
    let startY = 0
    let tracking = false

    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      tracking = true
    }
    const onMove = (e: TouchEvent) => {
      if (!tracking) return
      const dx = Math.abs(e.touches[0].clientX - startX)
      const dy = Math.abs(e.touches[0].clientY - startY)
      if (dy > dx + 10) tracking = false
    }
    const onEnd = (e: TouchEvent) => {
      if (!tracking) return
      tracking = false
      const dx = e.changedTouches[0].clientX - startX
      const { onSwipeLeft, onSwipeRight, threshold = 60 } = latest.current
      if (Math.abs(dx) < threshold) return
      if (dx < 0) onSwipeLeft?.()
      else onSwipeRight?.()
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: true })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
    }
  }, [])

  return ref
}
