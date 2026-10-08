import type { ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Play } from 'lucide-react'
import { Button, MobileMediaRow, MobilePlayingBars } from '@dust-ui/ui'
import { TRACKS, type TrackId } from '@/data/tracks'
import { formatTime } from '@/lib/format'
import { usePlayer } from '@/store/player'

export type TrackRowProps = {
  id: TrackId
  /** Marks the row as the chosen one (in a picker): a check replaces the play glyph. */
  selected?: boolean
  /** Right-aligned detail; the song's length by default. */
  value?: ReactNode
  /** Glyph on the trailing edge of a resting picker row (a download arrow, a link); the play glyph by default. */
  trailing?: ReactNode
  /** Picker mode: the tap selects the song and the row becomes a listbox option. */
  onSelect?: (id: TrackId) => void
}

/**
 * One song in a list: cover, title, dedication and voice, a detail, and the
 * playing bars while it plays. Without a mode the tap opens Now Playing with
 * the song's card unfolded; the control at the edge plays it there too and
 * pauses it in place.
 */
export function TrackRow({
  id,
  selected,
  value,
  trailing,
  onSelect,
}: TrackRowProps) {
  const t = TRACKS[id]
  // 'idle' when another song is loaded; this song's status otherwise.
  const status = usePlayer((s) => (s.track === id ? s.status : 'idle'))
  const play = usePlayer((s) => s.play)
  const pause = usePlayer((s) => s.pause)
  const navigate = useNavigate()
  const active = !selected && status !== 'idle'
  const playing = status === 'playing' || status === 'loading'

  return (
    <MobileMediaRow
      role={onSelect ? 'option' : undefined}
      aria-selected={onSelect ? selected : undefined}
      leading={
        <img
          src={t.art.thumb}
          alt=''
          loading='lazy'
          decoding='async'
          className='size-11 shrink-0 rounded-sm object-cover shadow-[0_4px_14px_rgb(0_0_0/0.35)]'
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
        onSelect ? (
          active ? (
            // The row's own bars cannot know playing from paused; these can.
            <MobilePlayingBars active={playing} color='var(--track-bright)' />
          ) : (
            trailing
          )
        ) : (
          // Starting a song opens Now Playing; pausing stays in the list.
          <Button
            variant='ghost'
            size='icon'
            aria-label={playing ? `Pause ${t.title}` : `Play ${t.title}`}
            onClick={(e) => {
              e.stopPropagation()
              if (playing) pause()
              else {
                play(id)
                void navigate({ to: '/lyrics/$track', params: { track: id } })
              }
            }}
            className='size-9 shrink-0 rounded-md text-muted-foreground hover:text-foreground'
          >
            {active ? (
              <MobilePlayingBars active={playing} color='var(--track-bright)' />
            ) : (
              <Play className='size-4' aria-hidden />
            )}
          </Button>
        )
      }
      onClick={() => {
        if (onSelect) onSelect(id)
        else void navigate({ to: '/lyrics/$track', params: { track: id } })
      }}
    />
  )
}
