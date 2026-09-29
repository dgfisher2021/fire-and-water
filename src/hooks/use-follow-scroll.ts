import { useEffect, useRef, useState, type RefObject } from 'react'

const SETTLE_MS = 900

function centreOn(
  root: HTMLElement | null,
  selector: string,
  activeIndex: number | null,
  ownScrollUntil: RefObject<number>
) {
  if (!root || activeIndex === null) return
  const el = root.querySelectorAll<HTMLElement>(selector)[activeIndex]
  if (!el) return
  const top = el.offsetTop - root.clientHeight / 2 + el.offsetHeight / 2
  ownScrollUntil.current = performance.now() + SETTLE_MS
  root.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
}

/**
 * Keeps the active item centred in a scroll pane while a song plays, but
 * steps back the moment the reader scrolls away on their own: `detached`
 * turns true (show a "back to the song" affordance) and `resume()` re-centres.
 * Scrolling the active item back into the middle re-attaches by itself.
 */
export function useFollowScroll(
  pane: RefObject<HTMLElement | null>,
  selector: string,
  activeIndex: number | null,
  enabled: boolean
) {
  const [detached, setDetached] = useState(false)
  // Scroll events before this timestamp are ours, not the reader's.
  const ownScrollUntil = useRef(0)

  useEffect(() => {
    if (!enabled || detached) return
    centreOn(pane.current, selector, activeIndex, ownScrollUntil)
  }, [pane, selector, activeIndex, enabled, detached])

  useEffect(() => {
    const root = pane.current
    if (!root || !enabled) return
    const onScroll = () => {
      if (performance.now() < ownScrollUntil.current) return
      if (activeIndex === null) return
      const el = root.querySelectorAll<HTMLElement>(selector)[activeIndex]
      if (!el) return
      const mid = root.scrollTop + root.clientHeight / 2
      const near =
        el.offsetTop - root.clientHeight * 0.4 <= mid &&
        el.offsetTop + el.offsetHeight + root.clientHeight * 0.4 >= mid
      setDetached(!near)
    }
    root.addEventListener('scroll', onScroll, { passive: true })
    return () => root.removeEventListener('scroll', onScroll)
  }, [pane, selector, activeIndex, enabled])

  const resume = () => {
    setDetached(false)
    centreOn(pane.current, selector, activeIndex, ownScrollUntil)
  }

  return { detached: enabled && detached, resume }
}
