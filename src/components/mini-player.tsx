import { useNavigate } from '@tanstack/react-router'
import { ChevronUp, Pause, Play } from 'lucide-react'
import { Button, LoaderSpinner } from '@dust-ui/ui'
import { TRACKS } from '@/data/tracks'
import { selectProgress, usePlayer } from '@/store/player'

/**
 * The strip above the nav: cover, title, a progress hairline, play/pause,
 * and a way back to Now Playing for the song in progress.
 */
export function MiniPlayer() {
  const navigate = useNavigate()
  const track = usePlayer((s) => s.track)
  const status = usePlayer((s) => s.status)
  const progress = usePlayer(selectProgress)
  const play = usePlayer((s) => s.play)
  const pause = usePlayer((s) => s.pause)
  if (!track) return null
  const t = TRACKS[track]
  const playing = status === 'playing'
  const open = () => void navigate({ to: '/lyrics/$track', params: { track } })

  return (
    <div
      data-slot='mini-player'
      className='flex animate-in items-center gap-3 rounded-2xl border border-border bg-card/85 p-2 shadow-[0_12px_32px_-14px_var(--track-glow)] backdrop-blur-md duration-300 fade-in-0 slide-in-from-bottom-2'
    >
      <button
        type='button'
        onClick={open}
        aria-label={`Open ${t.title}`}
        className='shrink-0 cursor-pointer'
      >
        <img
          src={t.art.thumb}
          alt=''
          className='size-10 rounded-[9px] object-cover shadow-[0_4px_12px_rgb(0_0_0/0.35)]'
        />
      </button>
      <button
        type='button'
        onClick={open}
        className='min-w-0 flex-1 cursor-pointer text-left'
      >
        <span className='block truncate font-display text-[15px] leading-tight text-foreground'>
          {t.title}
        </span>
        <span className='mt-0.5 block truncate text-[10px] tracking-[1px] text-muted-foreground uppercase'>
          {t.voice}
        </span>
        <span
          role='progressbar'
          aria-label='Progress'
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          className='mt-1.5 block h-[3px] overflow-hidden rounded-full bg-foreground/10'
        >
          <span
            className='block h-full rounded-full bg-linear-to-r from-track-bright to-track-deep transition-[width] duration-300 ease-linear'
            style={{ width: `${progress * 100}%` }}
          />
        </span>
      </button>
      <Button
        variant='ghost'
        size='icon'
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={() => (playing ? pause() : play(track))}
        className='size-10 shrink-0 rounded-full bg-linear-to-br from-track-bright to-track-deep text-track-foreground shadow-[0_6px_18px_-6px_var(--track-glow)] hover:opacity-90'
      >
        {status === 'loading' ? (
          <LoaderSpinner variant='ring' label='Buffering' />
        ) : playing ? (
          <Pause className='size-4 fill-current' aria-hidden />
        ) : (
          <Play className='ml-0.5 size-4 fill-current' aria-hidden />
        )}
      </Button>
      <Button
        variant='ghost'
        size='icon'
        aria-label='Open Now Playing'
        onClick={open}
        className='size-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground'
      >
        <ChevronUp aria-hidden />
      </Button>
    </div>
  )
}
