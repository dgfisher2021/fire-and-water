import type { CSSProperties, ReactNode } from 'react'
import { ChevronDown, Pause, Play } from 'lucide-react'
import type { LyricsTiming } from '@/lib/read-along'
import { cn } from '@/lib/utils'
import { useSyncedScroll } from '@/hooks/use-synced-scroll'
import { LyricsReader } from '@/components/lyrics-reader'

export type LyricsColumn = {
  key: string
  tag: ReactNode
  voice: ReactNode
  stanzas: ReadonlyArray<ReadonlyArray<string>>
  /** CSS colors for the column tag on light and dark surfaces (the song's deep and bright tones). */
  color: string
  colorDark: string
  /** Sing-along position while a song of the pair plays. */
  time?: number
  timing?: LyricsTiming
  onSeekLine?: (seconds: number) => void
  /** Opens a picker for this column's song. */
  onPick?: () => void
  /** Plays or pauses this column's song. */
  onPlay?: () => void
  playing?: boolean
}

export type LyricsSplitProps = {
  left: LyricsColumn
  right: LyricsColumn
  className?: string
}

/** Two lyrics panes side by side, scroll-synced, each under a sticky tag. */
export function LyricsSplit({ left, right, className }: LyricsSplitProps) {
  const [leftPane, rightPane] = useSyncedScroll<HTMLDivElement>()
  const columns = [
    { column: left, pane: leftPane },
    { column: right, pane: rightPane },
  ]

  return (
    <div
      data-slot='lyrics-split'
      className={cn('flex h-full min-h-0 flex-row', className)}
    >
      {columns.map(({ column, pane }, i) => (
        <div key={column.key} className='contents'>
          {i > 0 && (
            <div aria-hidden className='w-px shrink-0 self-stretch bg-border' />
          )}
          <LyricsReader
            ref={pane}
            stanzas={column.stanzas}
            contentKey={column.key}
            time={column.time}
            timing={column.timing}
            onSeekLine={column.onSeekLine}
            size='compact'
            className='flex-1'
          >
            <div
              className='sticky top-0 z-10 mb-3 rounded-b-xl bg-background/70 py-2 text-center font-sans text-[10px] tracking-[3px] text-(--voice) uppercase backdrop-blur-md dark:text-(--voice-dark)'
              style={
                {
                  '--voice': column.color,
                  '--voice-dark': column.colorDark,
                } as CSSProperties
              }
            >
              <div className='flex items-center justify-center gap-1'>
                {column.onPlay && (
                  <button
                    type='button'
                    aria-label={column.playing ? 'Pause' : 'Play this song'}
                    onClick={column.onPlay}
                    className='flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full bg-card/70 text-current transition-colors hover:bg-card'
                  >
                    {column.playing ? (
                      <Pause className='size-3' aria-hidden />
                    ) : (
                      <Play className='size-3' aria-hidden />
                    )}
                  </button>
                )}
                {column.onPick ? (
                  <button
                    type='button'
                    onClick={column.onPick}
                    aria-label='Choose a song for this side'
                    className='inline-flex min-w-0 cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 tracking-[2px] transition-colors hover:bg-card/60'
                  >
                    <span className='truncate'>{column.tag}</span>
                    <ChevronDown
                      className='size-3 shrink-0 opacity-70'
                      aria-hidden
                    />
                  </button>
                ) : (
                  column.tag
                )}
              </div>
              <span className='mt-0.5 block text-[9px] tracking-[1.5px] opacity-60'>
                {column.voice}
              </span>
            </div>
            {column.stanzas.length === 0 && (
              <p className='mt-12 px-2 text-center font-display text-[15px] text-foreground/45'>
                Lyrics on their way
              </p>
            )}
          </LyricsReader>
        </div>
      ))}
    </div>
  )
}
