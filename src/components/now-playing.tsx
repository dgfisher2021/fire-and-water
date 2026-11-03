import {
  ChevronDown,
  ChevronUp,
  Play,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  type LucideIcon,
} from 'lucide-react'
import {
  Button,
  formatTime,
  MediaPlayButton,
  MediaScrubber,
  MediaWaveform,
} from '@dust-ui/ui'
import envelopes from '@/data/audio-envelopes.json'
import { hookFor } from '@/data/hooks'
import { sunoStyle } from '@/data/suno-style'
import { TRACKS, type Track, type TrackId } from '@/data/tracks'
import { toaster } from '@/lib/toaster'
import { cn } from '@/lib/utils'
import { usePlayer, type PlayMode } from '@/store/player'

/** The Now Playing glass: a light wash over a soft blur, so the artwork stays legible behind it. */
const GLASS = 'border border-border bg-card/60 backdrop-blur-[6px]'

/** The two play-mode toggles flanking the transport; off is album order. */
const TOGGLES: Record<
  Exclude<PlayMode, 'album'>,
  { icon: LucideIcon; label: string; on: string; off: string }
> = {
  shuffle: {
    icon: Shuffle,
    label: 'Shuffle',
    on: 'Shuffle on',
    off: 'Shuffle off',
  },
  repeat: {
    icon: Repeat1,
    label: 'Repeat this song',
    on: 'Repeating this song',
    off: 'Repeat off',
  },
}

const binsFor = (t: Track) => envelopes[t.audioFile as keyof typeof envelopes]

/** Every other bin at the louder of each pair: half as many, thicker bars for the slim strip. */
function halveBins(bins: number[]) {
  const out: number[] = []
  for (let i = 0; i < bins.length; i += 2)
    out.push(Math.max(bins[i], bins[i + 1] ?? 0))
  return out
}

export type NowPlayingProps = {
  track: TrackId
  /** Playhead, 0 to 1; 0 while another song is loaded. */
  progress: number
  /** Song length in seconds. */
  duration: number
  playing: boolean
  loading?: boolean
  onPlayPause: () => void
  onSeek: (ratio: number) => void
  className?: string
}

/** A quiet round control beside the transport. */
function Control({
  label,
  onClick,
  icon: Icon,
  on,
  fill = false,
  className,
}: {
  label: string
  onClick: () => void
  icon: LucideIcon
  /** A toggle: lit in the song's accent when on, and pressed for assistive tech. */
  on?: boolean
  fill?: boolean
  className?: string
}) {
  return (
    <Button
      variant='ghost'
      size='icon'
      aria-label={label}
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'size-10 shrink-0 rounded-full transition-opacity hover:opacity-70',
        on ? 'text-primary' : 'text-foreground',
        className
      )}
    >
      <Icon
        className={cn('size-5', fill && 'fill-current')}
        strokeWidth={1.8}
        aria-hidden
      />
    </Button>
  )
}

const DESCRIPTION =
  'min-w-0 flex-1 text-left text-[12.5px] leading-normal text-foreground/85 [text-shadow:0_1px_2px_var(--background)]'

export type NowPlayingCardProps = NowPlayingProps & {
  onSkipBack: () => void
  onSkipForward: () => void
  /** Folds the card into the bar; the chevron hides without it. */
  onCollapse?: () => void
  /** Opens the song's hook full screen; with a hook, the cover loops it. */
  onWatchHook?: () => void
}

/** Shuffle or repeat: on switches to that mode, off back to album order. */
function ModeToggle({ mode }: { mode: keyof typeof TOGGLES }) {
  const on = usePlayer((s) => s.playMode === mode)
  const setPlayMode = usePlayer((s) => s.setPlayMode)
  const toggle = TOGGLES[mode]
  return (
    <Control
      label={toggle.label}
      icon={toggle.icon}
      on={on}
      onClick={() => {
        setPlayMode(on ? 'album' : mode)
        toaster.push(on ? toggle.off : toggle.on)
      }}
    />
  )
}

/**
 * The unfolded Now Playing control, under the screen's title row: the
 * cover beside the song's meaning in full (a tap on it, or the chevron at
 * the corner, folds the card), the Suno style it was made with, a single-line
 * scrubber with the times, then shuffle · previous · play · next · repeat.
 */
export function NowPlayingCard({
  track,
  progress,
  duration,
  playing,
  loading,
  onPlayPause,
  onSeek,
  onSkipBack,
  onSkipForward,
  onCollapse,
  onWatchHook,
  className,
}: NowPlayingCardProps) {
  const t = TRACKS[track]
  const hook = hookFor(track)
  const style = sunoStyle(track)

  return (
    <section
      aria-label={`${t.title} player`}
      data-slot='now-playing-card'
      className={cn(GLASS, 'flex flex-col gap-3 rounded-lg p-4', className)}
    >
      <div className='flex items-start gap-3'>
        {hook && onWatchHook ? (
          <button
            type='button'
            aria-label={`Watch the ${t.title} hook`}
            onClick={onWatchHook}
            className='relative size-[72px] shrink-0 cursor-pointer overflow-hidden rounded-md shadow-[0_4px_14px_rgb(0_0_0/0.35)]'
          >
            <img src={t.art.thumb} alt='' className='size-full object-cover' />
            <span
              aria-hidden
              className='absolute right-1 bottom-1 flex size-5 items-center justify-center rounded-sm bg-card/75 text-foreground backdrop-blur-sm'
            >
              <Play className='ml-px size-3 fill-current' />
            </span>
          </button>
        ) : (
          <img
            src={t.art.thumb}
            alt=''
            className='size-[72px] shrink-0 rounded-md object-cover shadow-[0_4px_14px_rgb(0_0_0/0.35)]'
          />
        )}
        {/* The song's meaning in full; a tap folds the card away. */}
        {onCollapse ? (
          <button
            type='button'
            onClick={onCollapse}
            className={cn(
              DESCRIPTION,
              'cursor-pointer transition-colors hover:text-foreground'
            )}
          >
            {t.description}
            <span className='sr-only'> Fold the player.</span>
          </button>
        ) : (
          <p className={DESCRIPTION}>{t.description}</p>
        )}
        {onCollapse && (
          <Control
            label='Collapse player'
            icon={ChevronUp}
            onClick={onCollapse}
            className='-mt-2 -mr-2 size-9 text-muted-foreground'
          />
        )}
      </div>
      {style && (
        <p className='line-clamp-2 text-[11px] leading-snug text-muted-foreground [text-shadow:0_1px_2px_var(--background)]'>
          {style}
        </p>
      )}
      <MediaScrubber
        progress={progress}
        duration={duration}
        onSeek={onSeek}
        timeLabels='remaining'
      />
      <div className='flex items-center justify-center gap-3'>
        <ModeToggle mode='shuffle' />
        <Control label='Previous' icon={SkipBack} fill onClick={onSkipBack} />
        <MediaPlayButton
          size='lg'
          playing={playing}
          loading={loading}
          onClick={(e) => {
            e.stopPropagation()
            onPlayPause()
          }}
        />
        <Control label='Next' icon={SkipForward} fill onClick={onSkipForward} />
        <ModeToggle mode='repeat' />
      </div>
    </section>
  )
}

export type NowPlayingBarProps = Omit<
  NowPlayingProps,
  'playing' | 'onPlayPause'
> & {
  /** Unfolds the card: a tap anywhere on the bar but the waveform. */
  onExpand?: () => void
  /** Play for a bar with no card to unfold (Compare, short screens). */
  playing?: boolean
  onPlayPause?: () => void
}

/**
 * The folded Now Playing control, under the same title row: cover, the
 * song's waveform as the scrubber with the time, and a caret. The nav's
 * center button plays, so where the bar can unfold the card it carries a
 * caret instead of play: a tap on the cover, the caret or the bar unfolds
 * it, and the waveform seeks. With nothing to unfold it keeps play.
 */
export function NowPlayingBar({
  track,
  progress,
  duration,
  onSeek,
  onExpand,
  playing = false,
  loading,
  onPlayPause,
  className,
}: NowPlayingBarProps) {
  const t = TRACKS[track]
  return (
    <div
      role='group'
      aria-label={`${t.title} player`}
      data-slot='now-playing-bar'
      onClick={onExpand}
      className={cn(
        GLASS,
        'flex w-full max-w-full items-center gap-3 overflow-hidden rounded-lg px-3 py-2',
        onExpand && 'cursor-pointer',
        className
      )}
    >
      <img
        src={t.art.thumb}
        alt=''
        className='size-10 shrink-0 rounded-sm object-cover shadow-[0_4px_12px_rgb(0_0_0/0.35)]'
      />
      <div
        className='min-w-0 flex-1 overflow-hidden'
        onClick={(e) => e.stopPropagation()}
      >
        <MediaWaveform
          bins={halveBins(binsFor(t))}
          progress={progress}
          duration={duration}
          onSeek={onSeek}
          className='h-5'
        />
        <div className='mt-0.5 flex justify-between text-[10.5px] text-muted-foreground tabular-nums'>
          <span>{formatTime(progress * duration)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      {onExpand ? (
        <Button
          variant='ghost'
          size='icon'
          aria-label='Expand player'
          onClick={(e) => {
            e.stopPropagation()
            onExpand()
          }}
          className='-mr-2 size-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground'
        >
          <ChevronDown aria-hidden />
        </Button>
      ) : (
        onPlayPause && (
          <MediaPlayButton
            playing={playing}
            loading={loading}
            onClick={(e) => {
              e.stopPropagation()
              onPlayPause()
            }}
          />
        )
      )}
    </div>
  )
}
