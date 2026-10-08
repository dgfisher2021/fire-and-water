import { useNavigate } from '@tanstack/react-router'
import { ChevronDown, ChevronUp, Pause, Play } from 'lucide-react'
import { MotionMarquee } from '@dust-ui/motion'
import { Button, LoaderSpinner, MobileProgressRing } from '@dust-ui/ui'
import { TRACKS, type TrackId } from '@/data/tracks'
import { cn } from '@/lib/utils'
import { selectProgress, usePlayer } from '@/store/player'

declare module '@tanstack/react-router' {
  interface HistoryState {
    /** Now Playing opens with its control already folded to the bar. */
    collapsed?: boolean
  }
}

export type MiniPlayerProps = {
  /** The song shown; the one loaded by default. */
  track?: TrackId
  /**
   * What a tap on the cover, title or caret does; opens Now Playing
   * (folded) by default. Now Playing passes its own unfold here.
   */
  onOpen?: () => void
  /** Up opens Now Playing from another screen; down unfolds it in place. */
  caret?: 'up' | 'down'
  className?: string
}

/**
 * The strip above the nav: cover, title, a progress ring around play, and
 * a caret. Above the nav it opens Now Playing folded, with the words
 * showing; on Now Playing it is the folded control when the listener
 * picks it over the waveform bar, and the same taps unfold the card.
 */
export function MiniPlayer({
  track: shown,
  onOpen,
  caret = 'up',
  className,
}: MiniPlayerProps) {
  const navigate = useNavigate()
  const loaded = usePlayer((s) => s.track)
  const track = shown ?? loaded
  // Status and progress belong to the loaded song; another one rests.
  const status = usePlayer((s) => (s.track === track ? s.status : 'idle'))
  const progress = usePlayer((s) => (s.track === track ? selectProgress(s) : 0))
  const play = usePlayer((s) => s.play)
  const pause = usePlayer((s) => s.pause)
  if (!track) return null
  const t = TRACKS[track]
  const playing = status === 'playing'
  const open =
    onOpen ??
    (() =>
      void navigate({
        to: '/lyrics/$track',
        params: { track },
        state: { collapsed: true },
      }))
  const Caret = caret === 'up' ? ChevronUp : ChevronDown

  return (
    <div
      data-slot='mini-player'
      className={cn(
        'flex animate-in items-center gap-3 rounded-lg border border-border bg-card/85 p-2 shadow-[0_12px_32px_-14px_var(--track-glow)] backdrop-blur-md duration-300 fade-in-0 slide-in-from-bottom-2',
        className
      )}
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
        <MotionMarquee
          overflowOnly
          speed={24}
          gap={48}
          edgeFade={8}
          className='font-display text-[16px] leading-tight font-medium text-foreground'
        >
          {t.title}
        </MotionMarquee>
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
        aria-label={caret === 'up' ? 'Open Now Playing' : 'Expand player'}
        onClick={open}
        className='size-8 shrink-0 rounded-md text-muted-foreground hover:text-foreground'
      >
        <Caret aria-hidden />
      </Button>
    </div>
  )
}
