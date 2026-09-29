import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { LoaderSpinner } from '@dust-ui/ui'
import { cn } from '@/lib/utils'

// Forked from @dust-ui-source/mobile-media-player. Deltas (recorded in
// dust-ui/specs): `variant='bar'` single-row footer layout, `loading`
// buffering state, breathe glow while playing, an `actions` slot,
// `className`, Tailwind classes on the token contract, and restyling
// through --media-* CSS variables instead of color props.

export type MobileMediaPlayerProps = {
  title: string
  artist?: string
  /** Track length in seconds; drives the time labels. */
  duration: number
  /** Playhead position, 0 to 1 (controlled). */
  progress: number
  onSeek: (progress: number) => void
  playing: boolean
  /** Buffering: the play button shows a ring in place of its glyph. */
  loading?: boolean
  onPlayPause: () => void
  /** Skip button handlers; buttons hide when omitted (card only). */
  onSkipBack?: () => void
  onSkipForward?: () => void
  /** Artwork slot (image, IconBox, gradient div); card only. */
  artwork?: ReactNode
  /** Extra controls (share, download) after the transport. */
  actions?: ReactNode
  /** `card` is the now-playing card; `bar` a single-row transport for a footer. */
  variant?: 'card' | 'bar'
  /** Accent shorthand; sets --media-accent. Prefer the CSS variables. */
  color?: string
  className?: string
}

const formatTime = (seconds: number) => {
  const whole = Math.max(0, Math.floor(seconds || 0))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

/**
 * Media transport: a scrubber you can tap or drag to seek (pointer events,
 * live onSeek while dragging, thumb grows under the pointer), time labels
 * in tabular figures, and a filled play/pause toggle that breathes while
 * playing and shows a ring while buffering. Restyle through CSS variables:
 * --media-accent, --media-accent-deep, --media-accent-foreground,
 * --media-glow, --media-track, --media-bg.
 */
export function MobileMediaPlayer({
  title,
  artist,
  duration,
  progress,
  onSeek,
  playing,
  loading = false,
  onPlayPause,
  onSkipBack,
  onSkipForward,
  artwork,
  actions,
  variant = 'card',
  color,
  className,
}: MobileMediaPlayerProps) {
  const clamped = Math.min(1, Math.max(0, progress))
  const [scrubbing, setScrubbing] = useState(false)
  const track = useRef<HTMLDivElement>(null)
  const bar = variant === 'bar'

  const seekTo = (clientX: number) => {
    const rect = track.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    onSeek(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)))
  }

  const playToggle = (
    <button
      type='button'
      onClick={onPlayPause}
      aria-label={playing ? 'Pause' : 'Play'}
      data-playing={playing || undefined}
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-(--media-accent) to-(--media-accent-deep) text-(--media-accent-foreground) shadow-[0_6px_18px_-6px_var(--media-glow)] transition-transform duration-200 outline-none hover:scale-[1.08] focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-95 data-playing:animate-breathe motion-reduce:animate-none',
        bar ? 'size-10' : 'size-[46px]'
      )}
    >
      {loading ? (
        <LoaderSpinner variant='ring' label='Buffering' />
      ) : playing ? (
        <Pause className='size-[18px] fill-current' strokeWidth={1.8} />
      ) : (
        <Play className='ml-0.5 size-[18px] fill-current' strokeWidth={1.8} />
      )}
    </button>
  )

  const skipButton = (
    label: string,
    onClick: () => void,
    Icon: typeof SkipBack
  ) => (
    <button
      type='button'
      onClick={onClick}
      aria-label={label}
      className='flex items-center justify-center p-1.5 text-foreground transition-opacity hover:opacity-70'
    >
      <Icon size={20} strokeWidth={1.8} fill='currentColor' />
    </button>
  )

  const scrubber = (
    <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
      <div
        ref={track}
        role='slider'
        aria-label='Seek'
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(clamped * duration)}
        aria-valuetext={formatTime(clamped * duration)}
        tabIndex={0}
        data-scrubbing={scrubbing || undefined}
        onKeyDown={(e) => {
          const step = 5 / duration
          if (e.key === 'ArrowRight') {
            e.preventDefault()
            onSeek(Math.min(1, clamped + step))
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            onSeek(Math.max(0, clamped - step))
          }
        }}
        onPointerDown={(e) => {
          setScrubbing(true)
          e.currentTarget.setPointerCapture(e.pointerId)
          seekTo(e.clientX)
        }}
        onPointerMove={(e) => {
          if (scrubbing) seekTo(e.clientX)
        }}
        onPointerUp={() => setScrubbing(false)}
        onPointerCancel={() => setScrubbing(false)}
        className={cn(
          'group/scrub relative flex w-full cursor-pointer touch-none items-center outline-none focus-visible:[&>div:first-child]:ring-2 focus-visible:[&>div:first-child]:ring-ring/50',
          bar ? 'h-[18px]' : 'h-5'
        )}
      >
        <div
          className={cn(
            'w-full overflow-hidden rounded-full bg-(--media-track)',
            bar ? 'h-[3px]' : 'h-[5px]'
          )}
        >
          <div
            className={cn(
              'h-full rounded-full bg-linear-to-r from-(--media-accent-deep) to-(--media-accent)',
              !scrubbing && 'transition-[width] duration-150 ease-linear'
            )}
            style={{ width: `${clamped * 100}%` }}
          />
        </div>
        <div
          aria-hidden
          className={cn(
            'absolute size-2.5 -translate-x-1/2 rounded-full bg-foreground shadow-[0_1px_6px_rgb(0_0_0/0.5)] transition-transform duration-150',
            bar
              ? 'scale-0 group-hover/scrub:scale-100 group-data-scrubbing/scrub:scale-100'
              : 'size-3 group-data-scrubbing/scrub:scale-125'
          )}
          style={{ left: `${clamped * 100}%` }}
        />
      </div>
      <div
        className={cn(
          'flex justify-between text-muted-foreground tabular-nums',
          bar ? 'text-[10px]' : 'text-[0.56rem]'
        )}
      >
        <span>{formatTime(clamped * duration)}</span>
        <span>
          {bar
            ? formatTime(duration)
            : `-${formatTime(duration - clamped * duration)}`}
        </span>
      </div>
    </div>
  )

  return (
    <div
      role='group'
      aria-label={title}
      data-slot='mobile-media-player'
      data-variant={variant}
      style={{ '--media-accent': color } as CSSProperties}
      className={cn(
        '[--media-accent-deep:color-mix(in_oklab,var(--media-accent)_55%,var(--background))] [--media-accent-foreground:var(--primary-foreground)] [--media-accent:var(--primary)] [--media-bg:var(--card)] [--media-glow:color-mix(in_oklab,var(--media-accent)_45%,transparent)] [--media-track:color-mix(in_oklab,var(--media-accent)_18%,transparent)]',
        bar
          ? 'flex items-center gap-2.5'
          : 'flex flex-col gap-3 rounded-[18px] border border-border bg-(--media-bg) p-4',
        className
      )}
    >
      {bar ? (
        <>
          {playToggle}
          {scrubber}
          {actions && (
            <div className='flex shrink-0 items-center gap-2'>{actions}</div>
          )}
        </>
      ) : (
        <>
          <div className='flex items-center gap-3'>
            {artwork}
            <div className='min-w-0 flex-1'>
              <div className='truncate text-[0.76rem] font-bold text-card-foreground'>
                {title}
              </div>
              {artist && (
                <div className='mt-0.5 text-[0.64rem] text-muted-foreground'>
                  {artist}
                </div>
              )}
            </div>
          </div>
          {scrubber}
          <div className='flex items-center justify-center gap-6'>
            {onSkipBack && skipButton('Previous', onSkipBack, SkipBack)}
            {playToggle}
            {onSkipForward && skipButton('Next', onSkipForward, SkipForward)}
            {actions}
          </div>
        </>
      )}
    </div>
  )
}
