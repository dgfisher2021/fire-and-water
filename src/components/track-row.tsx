import type { ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { MobileMediaRow, MobilePlayingBars } from '@dust-ui/ui'
import { TRACKS, type TrackId } from '@/data/tracks'
import { formatTime } from '@/lib/format'
import { usePlayer } from '@/store/player'

export type TrackRowProps = {
  id: TrackId
  /** Marks the row as the chosen one (in a picker): a check replaces the play glyph. */
  selected?: boolean
  /** Right-aligned detail; the song's length by default. */
  value?: ReactNode
  /** Glyph on the trailing edge of a resting row (a download arrow, a link); the play glyph by default. */
  trailing?: ReactNode
  /** Replaces the default tap, which plays the song and opens Now Playing; the row becomes a listbox option. */
  onSelect?: (id: TrackId) => void
}

/** One song in a list: cover, title, dedication and voice, a detail, and the playing bars while it plays. */
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
  const navigate = useNavigate()
  const active = !selected && status !== 'idle'
  return (
    <MobileMediaRow
      role={onSelect ? 'option' : undefined}
      aria-selected={onSelect ? selected : undefined}
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
      // The row's own bars cannot know playing from paused; these can.
      trailing={
        active ? (
          <MobilePlayingBars
            active={status === 'playing' || status === 'loading'}
            color='var(--track-bright)'
          />
        ) : (
          trailing
        )
      }
      onClick={() => {
        if (onSelect) {
          onSelect(id)
          return
        }
        play(id)
        void navigate({ to: '/lyrics/$track', params: { track: id } })
      }}
    />
  )
}
