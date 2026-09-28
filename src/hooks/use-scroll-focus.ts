import { useEffect, type RefObject } from 'react'

/**
 * Reading focus for a scroll pane: the child crossing the middle band of the
 * viewport gets `data-active`, everything else loses it. Style the
 * brightening in CSS (`data-active:text-foreground`). `key` re-arms the
 * observer when the pane's content is replaced.
 */
export function useScrollFocus(
  root: RefObject<HTMLElement | null>,
  selector: string,
  key: string,
  band = 0.38
) {
  useEffect(() => {
    const el = root.current
    if (!el || !('IntersectionObserver' in window)) return
    const margin = `-${Math.round(band * 100)}% 0px`
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ;(entry.target as HTMLElement).toggleAttribute(
            'data-active',
            entry.isIntersecting
          )
        }
      },
      { root: el, rootMargin: margin, threshold: 0 }
    )
    el.querySelectorAll<HTMLElement>(selector).forEach((n) =>
      observer.observe(n)
    )
    return () => observer.disconnect()
  }, [root, selector, key, band])
}
