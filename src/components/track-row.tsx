import { useNavigate } from '@tanstack/react-router'
import { Check, Play } from 'lucide-react'
import { MobileListRow } from '@dust-ui/ui'
import { TRACKS, type TrackId } from '@/data/tracks'
import { formatTime } from '@/lib/format'
import { usePlayer } from '@/store/player'
import { OverflowMarquee } from '@/components/overflow-marquee'
import { PlayingBars } from '@/components/playing-bars'

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
  // 'idle' when another song is loaded; this song's status otherwise.
  const status = usePlayer((s) => (s.track === id ? s.status : 'idle'))
  const play = usePlayer((s) => s.play)
  const navigate = useNavigate()
  const trailing = selected ? (
    <Check className='size-4 text-primary' aria-hidden />
  ) : status !== 'idle' ? (
    <PlayingBars active={status === 'playing' || status === 'loading'} />
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
            <OverflowMarquee className='font-display text-[17px] leading-tight text-foreground'>
              {t.title}
            </OverflowMarquee>
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
