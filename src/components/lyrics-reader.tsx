import { useRef, type ReactNode, type RefObject } from 'react'
import { ChevronsDown } from 'lucide-react'
import { MotionText } from '@dust-ui/motion'
import {
  Button,
  ReadAlongText,
  useFollowScroll,
  useScrollFocus,
} from '@dust-ui/ui'
import { isLyricLabel } from '@/data/tracks'
import { activePosition, activeWord, type LyricsTiming } from '@/lib/read-along'
import { cn } from '@/lib/utils'

const STANZA = '[data-slot="lyrics-stanza"]'

export type LyricsReaderProps = {
  stanzas: ReadonlyArray<ReadonlyArray<string>>
  /** Language of the words (BCP 47), for screen readers and hyphenation. */
  lang?: string
  /** Identifies the content; re-arms reading focus when it changes. */
  contentKey: string
  /**
   * Playback position in seconds. With `timing` this switches the pane to
   * sing-along mode: the sung line lights up, the pane follows the song.
   */
  time?: number
  timing?: LyricsTiming
  /** With `timing`, tapping a sung line jumps the song to it. */
  onSeekLine?: (seconds: number) => void
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
  lang,
  contentKey,
  time,
  timing,
  onSeekLine,
  size = 'default',
  children,
  ref,
  className,
}: LyricsReaderProps) {
  const own = useRef<HTMLDivElement>(null)
  const pane = ref ?? own
  const singing = time !== undefined && timing !== undefined
  const position = singing ? activePosition(timing, time) : null
  // Word by word inside the sung line when the timing has word starts.
  const word = singing && position ? activeWord(timing, position, time) : null
  const seekTo =
    onSeekLine && timing
      ? (stanza: number, line: number) =>
          onSeekLine(timing.lines[stanza]?.[line] ?? timing.stanzas[stanza])
      : undefined

  useScrollFocus(pane, STANZA, contentKey, { enabled: !singing })
  const { detached, resume } = useFollowScroll(
    position?.stanza ?? null,
    (i) => pane.current?.querySelectorAll<HTMLElement>(STANZA)[i],
    { root: pane, enabled: singing }
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
      lang={lang}
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
            'text-center font-display font-medium text-foreground/50 transition-colors duration-500 dark:[text-shadow:0_1px_14px_rgb(0_0_0/0.55)]',
            singing
              ? 'data-active:text-foreground/70'
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
                className='mb-1 block font-sans text-[11px] font-medium tracking-[3px] text-primary uppercase opacity-90'
              >
                {line.slice(1, -1)}
              </span>
            ) : (
              <span
                key={j}
                data-slot='lyrics-line'
                data-state={lineState(i, j)}
                role={seekTo ? 'button' : undefined}
                tabIndex={seekTo ? 0 : undefined}
                onClick={seekTo ? () => seekTo(i, j) : undefined}
                onKeyDown={
                  seekTo
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          seekTo(i, j)
                        }
                      }
                    : undefined
                }
                // Each line shrinks to its words and centres, so the sung
                // line's wash (the song's colour: deep on paper, bright on
                // navy) hugs the whole line, not the pane.
                className={cn(
                  'mx-auto -my-0.5 block w-fit max-w-full rounded-xl px-3 py-0.5 transition-[color,text-shadow,background-color] duration-200 data-[state=current]:bg-card/85 data-[state=current]:text-foreground data-[state=current]:backdrop-blur-md data-[state=current]:[text-shadow:0_0_18px_var(--track-glow)] data-[state=spoken]:text-foreground/80 motion-reduce:transition-none',
                  seekTo &&
                    'cursor-pointer hover:text-foreground/70 focus-visible:text-foreground focus-visible:outline-none'
                )}
              >
                {word !== null && lineState(i, j) === 'current' ? (
                  // Inside the washed line the sung word turns the song's
                  // colour and pops in on the kit's scale preset (keyed per
                  // word, so each one animates); sung words settle, upcoming
                  // ones wait at half strength.
                  <ReadAlongText
                    text={line}
                    activeWord={word}
                    className='[&_[data-state=current]]:[text-shadow:none] [&_[data-state=upcoming]]:text-foreground/45'
                    renderToken={(token, state) =>
                      state === 'current' ? (
                        <>
                          <MotionText
                            key={token.index}
                            as='span'
                            per='word'
                            preset='scale'
                            duration={0.28}
                            className='inline-block text-primary [text-shadow:0_0_14px_var(--track-glow)]'
                          >
                            {token.word}
                          </MotionText>
                          {token.raw.slice(token.word.length)}
                        </>
                      ) : (
                        token.raw
                      )
                    }
                  />
                ) : (
                  line
                )}
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
