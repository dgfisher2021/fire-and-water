import { useEffect, useRef } from 'react'

/**
 * Keeps two scroll panes at the same scroll ratio. Ratio (not scrollTop)
 * so columns of unequal height stay aligned end to end; a one-frame lock
 * stops the panes from feeding each other's scroll events back.
 */
export function useSyncedScroll<T extends HTMLElement>() {
  const first = useRef<T>(null)
  const second = useRef<T>(null)

  useEffect(() => {
    const a = first.current
    const b = second.current
    if (!a || !b) return
    let lock: HTMLElement | null = null

    const follow = (from: HTMLElement, to: HTMLElement) => () => {
      if (lock && lock !== from) return
      lock = from
      const range = from.scrollHeight - from.clientHeight
      const ratio = range > 0 ? from.scrollTop / range : 0
      to.scrollTop = ratio * (to.scrollHeight - to.clientHeight)
      requestAnimationFrame(() => {
        lock = null
      })
    }
    const onA = follow(a, b)
    const onB = follow(b, a)
    a.addEventListener('scroll', onA, { passive: true })
    b.addEventListener('scroll', onB, { passive: true })
    return () => {
      a.removeEventListener('scroll', onA)
      b.removeEventListener('scroll', onB)
    }
  }, [])

  return [first, second] as const
}
