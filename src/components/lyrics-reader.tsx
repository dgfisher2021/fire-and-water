import { useRef, type ReactNode, type RefObject } from 'react'
import { cn } from '@/lib/utils'
import { useScrollFocus } from '@/hooks/use-scroll-focus'

export type LyricsReaderProps = {
  stanzas: ReadonlyArray<ReadonlyArray<string>>
  /** Identifies the content; re-arms reading focus when it changes. */
  contentKey: string
  /** `default` is the single full-width reader; `compact` fits a split column. */
  size?: 'default' | 'compact'
  /** Rendered above the stanzas inside the scroll pane (sticky tags). */
  children?: ReactNode
  /** Pass to drive the pane from outside (scroll sync); owned otherwise. */
  ref?: RefObject<HTMLDivElement | null>
  className?: string
}

/**
 * A vertical lyrics pane: stanzas in the display face, fading at both edges,
 * with reading focus (the stanza crossing the middle brightens, the rest
 * recede). Pure CSS transitions on a `data-active` attribute.
 */
export function LyricsReader({
  stanzas,
  contentKey,
  size = 'default',
  children,
  ref,
  className,
}: LyricsReaderProps) {
  const own = useRef<HTMLDivElement>(null)
  const pane = ref ?? own
  useScrollFocus(pane, '[data-slot="lyrics-stanza"]', contentKey)

  return (
    <div
      ref={pane}
      data-slot='lyrics-reader'
      data-size={size}
      className={cn(
        'no-scrollbar h-full min-h-0 overflow-y-auto overscroll-contain mask-fade-y',
        size === 'default'
          ? 'px-8 pt-[26vh] pb-[45vh] md:px-[20%]'
          : 'px-3.5 pt-4 pb-16 md:px-6',
        className
      )}
    >
      {children}
      {stanzas.map((lines, i) => (
        <p
          key={`${contentKey}-${i}`}
          data-slot='lyrics-stanza'
          className={cn(
            'text-center font-display text-foreground/35 transition-colors duration-500 data-active:text-foreground',
            size === 'default'
              ? 'mb-8 text-[22px] leading-[1.7] md:text-[26px]'
              : 'mb-6 text-[17px] leading-[1.65] md:text-xl'
          )}
        >
          {lines.map((line, j) => (
            <span key={j} className='block'>
              {line}
            </span>
          ))}
        </p>
      ))}
    </div>
  )
}
