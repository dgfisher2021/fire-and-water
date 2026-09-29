import type { ReactNode } from 'react'
import type { LyricsTiming } from '@/lib/read-along'
import { cn } from '@/lib/utils'
import { useSyncedScroll } from '@/hooks/use-synced-scroll'
import { LyricsReader } from '@/components/lyrics-reader'

export type LyricsColumn = {
  key: string
  tag: ReactNode
  voice: ReactNode
  stanzas: ReadonlyArray<ReadonlyArray<string>>
  /** Utility class for the column tag color (text-fire, text-water). */
  tone: string
  /** Sing-along position for the column whose song is playing. */
  time?: number
  timing?: LyricsTiming
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
            size='compact'
            className='flex-1'
          >
            <div
              className={cn(
                'sticky top-0 z-10 mb-3 bg-linear-to-b from-background/60 from-60% to-transparent py-2 text-center font-sans text-[10px] tracking-[3px] uppercase',
                column.tone
              )}
            >
              {column.tag}
              <span className='mt-0.5 block text-[9px] tracking-[1.5px] opacity-60'>
                {column.voice}
              </span>
            </div>
          </LyricsReader>
        </div>
      ))}
    </div>
  )
}
