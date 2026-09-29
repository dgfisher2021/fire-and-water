import { useRef, type ReactNode, type RefObject } from 'react'
import { ChevronsDown } from 'lucide-react'
import { Button } from '@dust-ui/ui'
import { isLyricLabel } from '@/data/tracks'
import { activePosition, type LyricsTiming } from '@/lib/read-along'
import { cn } from '@/lib/utils'
import { useFollowScroll } from '@/hooks/use-follow-scroll'
import { useScrollFocus } from '@/hooks/use-scroll-focus'

const STANZA = '[data-slot="lyrics-stanza"]'

export type LyricsReaderProps = {
  stanzas: ReadonlyArray<ReadonlyArray<string>>
  /** Identifies the content; re-arms reading focus when it changes. */
  contentKey: string
  /**
   * Playback position in seconds. With `timing` this switches the pane to
   * sing-along mode: the sung line lights up, the pane follows the song.
   */
  time?: number
  timing?: LyricsTiming
  /** `default` is the single full-width reader; `compact` fits a split column. */
  size?: 'default' | 'compact'
  /** Rendered above the stanzas inside the scroll pane (sticky tags). */
  children?: ReactNode
  /** Pass to drive the pane from outside (scroll sync); owned otherwise. */
  ref?: RefObject<HTMLDivElement | null>
  className?: string
}

/**
 * A vertical lyrics pane: stanzas in the display face, fading at both edges.
 * Without playback it reads by scroll (the stanza crossing the middle
 * brightens); with `time` and `timing` it reads along with the song, line by
 * line, and keeps the sung stanza centred until the reader scrolls away.
 * Bracketed lines render as small section or voice labels.
 */
export function LyricsReader({
  stanzas,
  contentKey,
  time,
  timing,
  size = 'default',
  children,
  ref,
  className,
}: LyricsReaderProps) {
  const own = useRef<HTMLDivElement>(null)
  const pane = ref ?? own
  const singing = time !== undefined && timing !== undefined
  const position = singing ? activePosition(timing, time) : null

  useScrollFocus(pane, STANZA, contentKey, !singing)
  const { detached, resume } = useFollowScroll(
    pane,
    STANZA,
    position?.stanza ?? null,
    singing
  )

  const lineState = (stanza: number, line: number) => {
    if (!position) return undefined
    if (stanza < position.stanza) return 'spoken'
    if (stanza > position.stanza) return undefined
    if (line < position.line) return 'spoken'
    if (line === position.line) return 'current'
    return undefined
  }

  return (
    <div
      ref={pane}
      data-slot='lyrics-reader'
      data-size={size}
      data-singing={singing || undefined}
      className={cn(
        'relative no-scrollbar h-full min-h-0 overflow-y-auto overscroll-contain mask-fade-y',
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
          data-active={
            singing ? position?.stanza === i || undefined : undefined
          }
          className={cn(
            'text-center font-display text-foreground/35 transition-colors duration-500',
            singing
              ? 'data-active:text-foreground/55'
              : 'data-active:text-foreground',
            size === 'default'
              ? 'mb-8 text-[22px] leading-[1.7] md:text-[26px]'
              : 'mb-6 text-[17px] leading-[1.65] md:text-xl'
          )}
        >
          {lines.map((line, j) =>
            isLyricLabel(line) ? (
              <span
                key={j}
                data-slot='lyrics-label'
                className='mb-1 block font-sans text-[10px] font-medium tracking-[3px] text-primary uppercase opacity-80'
              >
                {line.slice(1, -1)}
              </span>
            ) : (
              <span
                key={j}
                data-slot='lyrics-line'
                data-state={lineState(i, j)}
                className='block transition-[color,text-shadow] duration-200 data-[state=current]:text-foreground data-[state=current]:[text-shadow:0_0_18px_var(--track-glow)] data-[state=spoken]:text-foreground/80 motion-reduce:transition-none'
              >
                {line}
              </span>
            )
          )}
        </p>
      ))}
      {detached && (
        <div className='pointer-events-none sticky bottom-6 z-10 flex justify-center'>
          <Button
            size='sm'
            onClick={resume}
            className='pointer-events-auto rounded-full bg-linear-to-br from-track-bright to-track-deep px-4 text-[12px] tracking-[1px] text-track-foreground shadow-[0_8px_24px_-8px_var(--track-glow)]'
          >
            <ChevronsDown className='size-3.5' aria-hidden />
            Back to the song
          </Button>
        </div>
      )}
    </div>
  )
}
