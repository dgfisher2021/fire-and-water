import { useNavigate } from '@tanstack/react-router'
import { ChevronUp, Pause, Play } from 'lucide-react'
import { Button, LoaderSpinner, MobileProgressRing } from '@dust-ui/ui'
import { TRACKS } from '@/data/tracks'
import { selectProgress, usePlayer } from '@/store/player'
import { OverflowMarquee } from '@/components/overflow-marquee'

declare module '@tanstack/react-router' {
  interface HistoryState {
    /** Now Playing opens with its control already folded to the bar. */
    collapsed?: boolean
  }
}

/**
 * The strip above the nav: cover, title, a progress ring around play, and
 * a way back to Now Playing for the song in progress. It is the folded
 * control, so it opens Now Playing folded too, with the words showing.
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
  const open = () =>
    void navigate({
      to: '/lyrics/$track',
      params: { track },
      state: { collapsed: true },
    })

  return (
    <div
      data-slot='mini-player'
      className='flex animate-in items-center gap-3 rounded-lg border border-border bg-card/85 p-2 shadow-[0_12px_32px_-14px_var(--track-glow)] backdrop-blur-md duration-300 fade-in-0 slide-in-from-bottom-2'
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
          className='size-10 rounded-sm object-cover shadow-[0_4px_12px_rgb(0_0_0/0.35)]'
        />
      </button>
      <button
        type='button'
        onClick={open}
        className='min-w-0 flex-1 cursor-pointer overflow-hidden text-left'
      >
        <OverflowMarquee className='font-display text-[16px] leading-tight font-medium text-foreground'>
          {t.title}
        </OverflowMarquee>
        <span className='mt-0.5 block truncate text-[11px] tracking-[1px] text-muted-foreground uppercase'>
          {t.voice}
        </span>
      </button>
      <MobileProgressRing
        progress={progress}
        size={46}
        strokeWidth={2.5}
        color='var(--track-bright)'
        trackColor='color-mix(in oklab, var(--foreground) 12%, transparent)'
        label='Song progress'
      >
        <Button
          variant='ghost'
          size='icon'
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={() => (playing ? pause() : play(track))}
          className='size-9 shrink-0 rounded-full bg-linear-to-br from-track-bright to-track-deep text-track-foreground shadow-[0_6px_18px_-6px_var(--track-glow)] hover:opacity-90'
        >
          {status === 'loading' ? (
            <LoaderSpinner variant='ring' label='Buffering' />
          ) : playing ? (
            <Pause className='size-4 fill-current' aria-hidden />
          ) : (
            <Play className='ml-0.5 size-4 fill-current' aria-hidden />
          )}
        </Button>
      </MobileProgressRing>
      <Button
        variant='ghost'
        size='icon'
        aria-label='Open Now Playing'
        onClick={open}
        className='size-8 shrink-0 rounded-md text-muted-foreground hover:text-foreground'
      >
        <ChevronUp aria-hidden />
      </Button>
    </div>
  )
}
