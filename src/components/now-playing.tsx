import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import {
  ChevronUp,
  Download,
  ListMusic,
  Pause,
  Play,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  type LucideIcon,
} from 'lucide-react'
import { Button, LoaderSpinner } from '@dust-ui/ui'
import envelopes from '@/data/audio-envelopes.json'
import sizes from '@/data/audio-sizes.json'
import catalog from '@/data/suno-catalog.json'
import { TRACKS, type Track, type TrackId } from '@/data/tracks'
import { audioLabel, formatTime } from '@/lib/format'
import { download } from '@/lib/share'
import { cn } from '@/lib/utils'
import { PLAY_MODES, usePlayer, type PlayMode } from '@/store/player'
import { useToasts } from '@/store/toasts'
import { Waveform } from '@/components/waveform'

/** The Now Playing glass: a light wash over a soft blur, so the artwork stays legible behind it. */
const GLASS = 'border border-border bg-card/60 backdrop-blur-[6px]'

const MODES: Record<PlayMode, { icon: LucideIcon; label: string }> = {
  album: { icon: ListMusic, label: 'Album order' },
  repeat: { icon: Repeat1, label: 'Repeat this song' },
  shuffle: { icon: Shuffle, label: 'Shuffle' },
}

const binsFor = (t: Track) => envelopes[t.audioFile as keyof typeof envelopes]

/** The Suno style prompt each album song was made with, from the catalogue. */
const STYLE = new Map(
  catalog.songs
    .filter((s) => s.appId && s.style)
    .map((s) => [s.appId as TrackId, s.style as string])
)

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

/** The filled play toggle in the song's gradient; it breathes while playing. */
function PlayToggle({
  playing,
  loading,
  onClick,
  size,
}: Pick<NowPlayingProps, 'playing' | 'loading'> & {
  onClick: () => void
  size: 'card' | 'bar'
}) {
  return (
    <Button
      variant='ghost'
      size='icon'
      aria-label={playing ? 'Pause' : 'Play'}
      data-playing={playing || undefined}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'shrink-0 rounded-full bg-linear-to-br from-track-bright to-track-deep text-track-foreground shadow-[0_6px_18px_-6px_var(--track-glow)] transition-transform duration-200 hover:scale-[1.06] hover:opacity-100 active:scale-95 data-playing:animate-breathe motion-reduce:animate-none',
        size === 'card' ? 'size-[46px]' : 'size-10'
      )}
    >
      {loading ? (
        <LoaderSpinner variant='ring' label='Buffering' />
      ) : playing ? (
        <Pause
          className='size-[18px] fill-current'
          strokeWidth={1.8}
          aria-hidden
        />
      ) : (
        <Play
          className='ml-0.5 size-[18px] fill-current'
          strokeWidth={1.8}
          aria-hidden
        />
      )}
    </Button>
  )
}

/** A quiet round control beside the transport. */
function Control({
  label,
  onClick,
  icon: Icon,
  on = false,
  fill = false,
  className,
}: {
  label: string
  onClick: () => void
  icon: LucideIcon
  /** Lit in the song's accent (a play mode that is on). */
  on?: boolean
  fill?: boolean
  className?: string
}) {
  return (
    <Button
      variant='ghost'
      size='icon'
      aria-label={label}
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

/**
 * A single-line scrubber: tap or drag along the track, arrow keys step
 * five seconds, the thumb grows while dragging.
 */
function Scrubber({
  progress,
  duration,
  onSeek,
}: Pick<NowPlayingProps, 'progress' | 'duration' | 'onSeek'>) {
  const track = useRef<HTMLDivElement>(null)
  const [scrubbing, setScrubbing] = useState(false)
  const seekAt = (x: number) => {
    const r = track.current?.getBoundingClientRect()
    if (!r || r.width === 0) return
    onSeek(Math.min(1, Math.max(0, (x - r.left) / r.width)))
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (duration <= 0) return
    const step = 5 / duration
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      onSeek(Math.min(1, progress + step))
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      onSeek(Math.max(0, progress - step))
    }
  }
  const down = (e: PointerEvent<HTMLDivElement>) => {
    setScrubbing(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    seekAt(e.clientX)
  }
  return (
    <div
      ref={track}
      role='slider'
      aria-label='Seek'
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(progress * duration)}
      aria-valuetext={formatTime(progress * duration)}
      tabIndex={0}
      data-scrubbing={scrubbing || undefined}
      onKeyDown={onKeyDown}
      onPointerDown={down}
      onPointerMove={(e) => scrubbing && seekAt(e.clientX)}
      onPointerUp={() => setScrubbing(false)}
      onPointerCancel={() => setScrubbing(false)}
      className='relative flex h-6 w-full cursor-pointer touch-none items-center outline-none focus-visible:[&>div:first-child]:ring-2 focus-visible:[&>div:first-child]:ring-ring/50'
    >
      <div className='h-[5px] w-full overflow-hidden rounded-full bg-foreground/15'>
        <div
          className={cn(
            'h-full rounded-full bg-linear-to-r from-track-deep to-track-bright',
            !scrubbing && 'transition-[width] duration-150 ease-linear'
          )}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div
        aria-hidden
        className={cn(
          'absolute size-3 -translate-x-1/2 rounded-full bg-foreground shadow-[0_1px_6px_rgb(0_0_0/0.5)] transition-transform duration-150',
          scrubbing && 'scale-125'
        )}
        style={{ left: `${progress * 100}%` }}
      />
    </div>
  )
}

export type NowPlayingCardProps = NowPlayingProps & {
  onSkipBack: () => void
  onSkipForward: () => void
  /** Folds the card into the bar; the chevron hides without it. */
  onCollapse?: () => void
}

/**
 * The unfolded Now Playing control, under the screen's title row: the
 * cover beside the song's meaning (a tap shows all of it) with the fold
 * chevron at the corner, the Suno style it was made with, a single-line
 * scrubber with the times, then Download · previous · play · next and the
 * play mode (album order, repeat, shuffle).
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
  className,
}: NowPlayingCardProps) {
  const t = TRACKS[track]
  const style = STYLE.get(track)
  const playMode = usePlayer((s) => s.playMode)
  const cyclePlayMode = usePlayer((s) => s.cyclePlayMode)
  const [storyOpen, setStoryOpen] = useState(false)
  const mode = MODES[playMode]
  const nextMode =
    MODES[PLAY_MODES[(PLAY_MODES.indexOf(playMode) + 1) % PLAY_MODES.length]]
  const label = audioLabel(
    t.audioFile,
    sizes[t.audioFile as keyof typeof sizes]
  )

  return (
    <section
      aria-label={`${t.title} player`}
      data-slot='now-playing-card'
      className={cn(GLASS, 'flex flex-col gap-3 rounded-lg p-4', className)}
    >
      <div className='flex items-start gap-3'>
        <img
          src={t.art.thumb}
          alt=''
          className='size-[72px] shrink-0 rounded-md object-cover shadow-[0_4px_14px_rgb(0_0_0/0.35)]'
        />
        {/* The song's meaning, three lines at a time; a tap shows the rest. */}
        <button
          type='button'
          aria-expanded={storyOpen}
          onClick={() => setStoryOpen((open) => !open)}
          className={cn(
            'min-h-0 min-w-0 flex-1 cursor-pointer text-left text-[12.5px] leading-normal text-foreground/85 transition-colors [text-shadow:0_1px_2px_var(--background)] hover:text-foreground',
            !storyOpen && 'line-clamp-3'
          )}
        >
          {t.description}
        </button>
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
      <div>
        <Scrubber progress={progress} duration={duration} onSeek={onSeek} />
        <div className='flex justify-between text-[11px] text-muted-foreground tabular-nums'>
          <span>{formatTime(progress * duration)}</span>
          <span>-{formatTime(duration - progress * duration)}</span>
        </div>
      </div>
      <div className='flex items-center justify-center gap-3'>
        <Control
          label={`Download ${label}`}
          icon={Download}
          onClick={() => {
            download(t.audioFile)
            useToasts.getState().push(`Downloading ${t.title}`)
          }}
        />
        <Control label='Previous' icon={SkipBack} fill onClick={onSkipBack} />
        <PlayToggle
          size='card'
          playing={playing}
          loading={loading}
          onClick={onPlayPause}
        />
        <Control label='Next' icon={SkipForward} fill onClick={onSkipForward} />
        <Control
          label={`Play mode: ${mode.label}. Switch to ${nextMode.label.toLowerCase()}`}
          icon={mode.icon}
          on={playMode !== 'album'}
          onClick={() => {
            cyclePlayMode()
            useToasts.getState().push(nextMode.label)
          }}
        />
      </div>
    </section>
  )
}

export type NowPlayingBarProps = NowPlayingProps & {
  /** Unfolds the card: a tap anywhere on the bar but its controls. */
  onExpand?: () => void
}

/**
 * The folded Now Playing control, under the same title row: cover, the
 * song's waveform as the scrubber with the time, and play. A tap on the
 * bar (the cover is the keyboard target) unfolds the card.
 */
export function NowPlayingBar({
  track,
  progress,
  duration,
  playing,
  loading,
  onPlayPause,
  onSeek,
  onExpand,
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
      <button
        type='button'
        aria-label='Expand player'
        disabled={!onExpand}
        onClick={(e) => {
          e.stopPropagation()
          onExpand?.()
        }}
        className='shrink-0 cursor-pointer disabled:cursor-default'
      >
        <img
          src={t.art.thumb}
          alt=''
          className='size-10 rounded-sm object-cover shadow-[0_4px_12px_rgb(0_0_0/0.35)]'
        />
      </button>
      <div
        className='min-w-0 flex-1 overflow-hidden'
        onClick={(e) => e.stopPropagation()}
      >
        <Waveform
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
      <PlayToggle
        size='bar'
        playing={playing}
        loading={loading}
        onClick={onPlayPause}
      />
    </div>
  )
}
