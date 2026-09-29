import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { MotionMarquee } from '@dust-ui/motion'
import { cn } from '@/lib/utils'

export type OverflowMarqueeProps = {
  children: ReactNode
  className?: string
  /** Pixels per second once it scrolls. */
  speed?: number
}

/**
 * A single line that stays put while it fits and scrolls like a car stereo
 * once it overflows, so a long song title is never cut to an ellipsis.
 */
export function OverflowMarquee({
  children,
  className,
  speed = 24,
}: OverflowMarqueeProps) {
  const box = useRef<HTMLSpanElement>(null)
  // The measurement is remembered with the content it was taken for, so new
  // content starts plain and measures again.
  const [measured, setMeasured] = useState<{
    content: ReactNode
    overflows: boolean
  } | null>(null)
  const overflows =
    measured !== null && measured.content === children && measured.overflows

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    let live = true
    const measure = () => {
      // Once the marquee takes over, this span is gone; its last resize
      // notification reads as zero width and must not undo the switch.
      if (!live || !el.isConnected) return
      setMeasured({
        content: children,
        overflows: el.scrollWidth > el.clientWidth + 1,
      })
    }
    // On the next frame, again once web fonts have loaded (the fallback face
    // is narrower), and on every resize of the box after that.
    const frame = requestAnimationFrame(measure)
    void document.fonts?.ready.then(measure)
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => {
      live = false
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [children])

  if (!overflows)
    return (
      <span ref={box} className={cn('block truncate', className)}>
        {children}
      </span>
    )
  return (
    <MotionMarquee speed={speed} gap={48} edgeFade={8} className={className}>
      <span className='whitespace-nowrap'>{children}</span>
    </MotionMarquee>
  )
}
