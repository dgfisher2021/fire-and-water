import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { ChevronsDown, ChevronsUp } from 'lucide-react'
import { MotionInView, MotionText } from '@dust-ui/motion'
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
  /** Pass to drive the scroll pane from outside (scroll sync); owned otherwise. */
  ref?: RefObject<HTMLDivElement | null>
  /** On the reader's box (its size in the layout). */
  className?: string
  /** On the scroll pane inside it (its padding). */
  paneClassName?: string
}

/**
 * A vertical lyrics pane: stanzas in the display face, each rising into view
 * as it is scrolled to. Without playback it reads by scroll (the stanza
 * crossing the middle brightens); with `time` and `timing` it reads along
 * with the song, line by line, and keeps the sung stanza centred until the
 * reader scrolls away. Bracketed lines render as small section or voice
 * labels. The edges are cut clean: a mask or a blur strip would make the
 * pane a backdrop root and the sung line's glass would have nothing behind
 * it to frost.
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
  paneClassName,
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
  // The pane resizes as the player folds or unfolds; keep the sung line
  // centred through it. Scrolls the pane only: scrollIntoView would also
  // scroll the screen behind it.
  useEffect(() => {
    const el = pane.current
    if (!el || !singing || detached) return
    let height = el.clientHeight
    const observer = new ResizeObserver(() => {
      if (el.clientHeight === height) return
      height = el.clientHeight
      const line = el.querySelector<HTMLElement>(
        '[data-slot="lyrics-line"][data-state="current"]'
      )
      if (!line) return
      const box = el.getBoundingClientRect()
      const at = line.getBoundingClientRect()
      el.scrollTop += at.top + at.height / 2 - (box.top + box.height / 2)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [pane, singing, detached])

  // Which side of the pane the sung stanza went past, for the way-back pill.
  const sungStanza = position?.stanza ?? null
  const [songAbove, setSongAbove] = useState(false)
  useEffect(() => {
    const el = pane.current
    if (!el || sungStanza === null) return
    const onScroll = () => {
      const stanza = el.querySelectorAll<HTMLElement>(STANZA)[sungStanza]
      if (!stanza) return
      setSongAbove(
        stanza.getBoundingClientRect().bottom < el.getBoundingClientRect().top
      )
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [pane, sungStanza])

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
      lang={lang}
      data-slot='lyrics-reader'
      data-size={size}
      data-singing={singing || undefined}
      className={cn('relative h-full min-h-0', className)}
    >
      <div
        ref={pane}
        data-slot='lyrics-pane'
        className={cn(
          'no-scrollbar h-full min-h-0 overflow-y-auto overscroll-contain',
          size === 'default'
            ? 'px-5 pt-[26vh] pb-[45vh] md:px-[14%]'
            : 'px-3.5 pt-4 pb-16 md:px-6',
          paneClassName
        )}
      >
        {children}
        {stanzas.map((lines, i) => (
          // Each stanza rises in once as it scrolls into view (the pane is
          // clipped, so the viewport observer sees only what shows).
          <MotionInView key={`${contentKey}-${i}`} amount={0.1}>
            <p
              data-slot='lyrics-stanza'
              data-active={
                singing ? position?.stanza === i || undefined : undefined
              }
              // Semibold with a halo in the background tone, so every line
              // reads over the artwork before it is sung.
              className={cn(
                'text-center font-display font-semibold text-foreground/65 transition-colors duration-500 [text-shadow:0_1px_2px_var(--background),0_2px_18px_var(--background)]',
                singing
                  ? 'data-active:text-foreground/85'
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
                    className='mb-1 block font-sans text-[11px] font-bold tracking-[3px] text-primary uppercase [text-shadow:0_1px_2px_var(--background),0_2px_12px_var(--background)]'
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
                    // Each line shrinks to its words and centres, so the
                    // sung line's glass (the list rows' card-at-85% over a
                    // backdrop blur) hugs the whole line, not the pane.
                    className={cn(
                      'mx-auto -my-1 block w-fit max-w-full rounded-lg px-3 py-1 transition-[color,text-shadow,background-color] duration-200 data-[state=current]:bg-card/85 data-[state=current]:text-foreground data-[state=current]:backdrop-blur-md data-[state=current]:[text-shadow:0_1px_2px_var(--background),0_2px_18px_var(--background),0_0_18px_var(--track-glow)] data-[state=spoken]:text-foreground/85 motion-reduce:transition-none',
                      seekTo &&
                        'cursor-pointer hover:text-foreground/80 focus-visible:text-foreground focus-visible:outline-none'
                    )}
                  >
                    {word !== null && lineState(i, j) === 'current' ? (
                      // Inside the washed line the sung word sits on a pill
                      // of the song's colour, its text a very dark shade of
                      // that colour with a faint light edge (on navy; paper
                      // keeps white on the deep pill), and pops in on the
                      // kit's scale preset (keyed per word, so each one
                      // animates); sung words settle, upcoming ones wait at
                      // four-fifths, readable on any artwork.
                      <ReadAlongText
                        text={line}
                        activeWord={word}
                        className='[&_[data-state=current]]:[text-shadow:none] [&_[data-state=upcoming]]:text-foreground/80'
                        renderToken={(token, state) =>
                          state === 'current' ? (
                            <>
                              <MotionText
                                key={token.index}
                                as='span'
                                per='word'
                                preset='scale'
                                duration={0.28}
                                className='inline-block rounded-md bg-primary px-1.5 text-primary-foreground [text-shadow:none] dark:text-[color-mix(in_oklab,var(--track-deep)_70%,black)] dark:[text-shadow:0_1px_0_color-mix(in_oklab,var(--track-bright)_55%,white)]'
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
          </MotionInView>
        ))}
      </div>
      {detached && (
        // Over the pane, on the edge the song went past; the narrow
        // Compare columns keep it at the bottom, clear of their tags.
        <div
          key={songAbove ? 'above' : 'below'}
          className={cn(
            'pointer-events-none absolute inset-x-0 z-10 flex animate-in justify-center duration-300 fade-in-0 motion-reduce:animate-none',
            songAbove && size === 'default'
              ? 'top-3 slide-in-from-top-2'
              : 'bottom-6 slide-in-from-bottom-2'
          )}
        >
          <Button
            size='sm'
            onClick={resume}
            className='pointer-events-auto rounded-lg bg-linear-to-br from-track-bright to-track-deep px-4 text-[12px] tracking-[1px] text-track-foreground shadow-[0_8px_24px_-8px_var(--track-glow)]'
          >
            {songAbove ? (
              <ChevronsUp className='size-3.5' aria-hidden />
            ) : (
              <ChevronsDown className='size-3.5' aria-hidden />
            )}
            Back to the song
          </Button>
        </div>
      )}
    </div>
  )
}
