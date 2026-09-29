import { useNavigate } from '@tanstack/react-router'
import { Check, Play } from 'lucide-react'
import { MobileListRow, Pill } from '@dust-ui/ui'
import { TRACKS, type TrackId } from '@/data/tracks'
import { formatTime } from '@/lib/format'
import { selectIsActive, usePlayer } from '@/store/player'

export type TrackRowProps = {
  id: TrackId
  /** Marks the row as the chosen one (in a picker): a check replaces the play glyph. */
  selected?: boolean
  /** Replaces the default tap, which plays the song and opens Now Playing. */
  onSelect?: (id: TrackId) => void
}

/** One song in a list: thumbnail, title, dedication and voice, length. */
export function TrackRow({ id, selected, onSelect }: TrackRowProps) {
  const t = TRACKS[id]
  const active = usePlayer(selectIsActive(id))
  const play = usePlayer((s) => s.play)
  const navigate = useNavigate()
  const trailing = selected ? (
    <Check className='size-4 text-primary' aria-hidden />
  ) : active ? (
    <Pill>Playing</Pill>
  ) : (
    <Play className='size-3.5 text-muted-foreground' aria-hidden />
  )
  return (
    <MobileListRow
      label={
        <span className='flex items-center gap-3 py-0.5'>
          <img
            src={t.art.thumb}
            alt=''
            className='size-11 shrink-0 rounded-[10px] object-cover shadow-[0_4px_14px_rgb(0_0_0/0.35)]'
          />
          <span className='flex min-w-0 flex-col'>
            <span className='truncate font-display text-[17px] leading-tight text-foreground'>
              {t.title}
            </span>
            <span className='truncate text-[11px] text-muted-foreground'>
              {t.dedication} · {t.voice}
            </span>
          </span>
        </span>
      }
      value={formatTime(t.duration)}
      trailing={trailing}
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
