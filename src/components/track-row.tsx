import type { ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Play } from 'lucide-react'
import { Button, MobileMediaRow, MobilePlayingBars } from '@dust-ui/ui'
import { TRACKS, comparePartner, type TrackId } from '@/data/tracks'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { usePlayer } from '@/store/player'

export type TrackRowProps = {
  id: TrackId
  /** Marks the row as the chosen one (in a picker): a check replaces the play glyph. */
  selected?: boolean
  /** Right-aligned detail; the song's length by default. */
  value?: ReactNode
  /** Glyph on the trailing edge of a resting row (a download arrow, a link); the play glyph by default. */
  trailing?: ReactNode
  /** Picker mode: the tap selects the song and the row becomes a listbox option. */
  onSelect?: (id: TrackId) => void
  /**
   * Story mode: the tap opens the song's story under the row (its
   * description, Read lyrics, Compare) and the trailing control plays it.
   */
  expanded?: boolean
  onToggle?: () => void
}

/**
 * One song in a list: cover, title, dedication and voice, a detail, and the
 * playing bars while it plays. Without a mode the tap plays the song and
 * opens Now Playing.
 */
export function TrackRow({
  id,
  selected,
  value,
  trailing,
  onSelect,
  expanded = false,
  onToggle,
}: TrackRowProps) {
  const t = TRACKS[id]
  // 'idle' when another song is loaded; this song's status otherwise.
  const status = usePlayer((s) => (s.track === id ? s.status : 'idle'))
  const play = usePlayer((s) => s.play)
  const pause = usePlayer((s) => s.pause)
  const navigate = useNavigate()
  const active = !selected && status !== 'idle'
  const playing = status === 'playing' || status === 'loading'
  const openLyrics = () =>
    void navigate({ to: '/lyrics/$track', params: { track: id } })

  const row = (
    <MobileMediaRow
      role={onSelect ? 'option' : undefined}
      aria-selected={onSelect ? selected : undefined}
      aria-expanded={onToggle ? expanded : undefined}
      leading={
        <img
          src={t.art.thumb}
          alt=''
          className='size-11 shrink-0 rounded-[10px] object-cover shadow-[0_4px_14px_rgb(0_0_0/0.35)]'
        />
      }
      title={
        <span className='block truncate font-display text-[18px] leading-tight font-medium text-foreground'>
          {t.title}
        </span>
      }
      subtitle={`${t.dedication} · ${t.voice}`}
      value={value ?? formatTime(t.duration)}
      state={selected ? 'selected' : active ? 'active' : 'idle'}
      trailing={
        onToggle ? (
          // A real control: playing from the list without opening the story.
          <Button
            variant='ghost'
            size='icon'
            aria-label={playing ? `Pause ${t.title}` : `Play ${t.title}`}
            onClick={(e) => {
              e.stopPropagation()
              if (playing) pause()
              else play(id)
            }}
            className='size-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground'
          >
            {active ? (
              <MobilePlayingBars active={playing} color='var(--track-bright)' />
            ) : (
              <Play className='size-4' aria-hidden />
            )}
          </Button>
        ) : active ? (
          // The row's own bars cannot know playing from paused; these can.
          <MobilePlayingBars active={playing} color='var(--track-bright)' />
        ) : (
          trailing
        )
      }
      onClick={() => {
        if (onSelect) {
          onSelect(id)
          return
        }
        if (onToggle) {
          onToggle()
          return
        }
        play(id)
        openLyrics()
      }}
    />
  )
  if (!onToggle) return row

  const partner = comparePartner(id)
  return (
    <div data-slot='track-row'>
      {row}
      <div
        inert={!expanded}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className='min-h-0 overflow-hidden'>
          <div className='flex flex-col gap-3 px-4 pt-1 pb-4'>
            <p className='text-[12.5px] leading-normal text-foreground/75'>
              {t.description}
            </p>
            <div className='flex flex-wrap gap-2'>
              <Button
                size='sm'
                variant='outline'
                onClick={openLyrics}
                className='rounded-full border-border bg-card px-4 text-[12px] tracking-[1px] text-muted-foreground shadow-none hover:bg-accent hover:text-foreground'
              >
                Read lyrics
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() =>
                  void navigate({
                    to: '/compare',
                    search: { left: id, right: partner },
                  })
                }
                className='rounded-full border-border bg-card px-4 text-[12px] tracking-[1px] text-muted-foreground shadow-none hover:bg-accent hover:text-foreground'
              >
                Compare with {TRACKS[partner].title}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
