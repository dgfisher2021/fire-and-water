import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Download,
  Ellipsis,
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
import { TRACKS, writtenDate, type Track, type TrackId } from '@/data/tracks'
import { audioLabel, formatTime } from '@/lib/format'
import { download } from '@/lib/share'
import { cn } from '@/lib/utils'
import { PLAY_MODES, usePlayer, type PlayMode } from '@/store/player'
import { useToasts } from '@/store/toasts'
import { OverflowMarquee } from '@/components/overflow-marquee'
import { TagPill } from '@/components/tag-pill'
import { Waveform } from '@/components/waveform'

/** The Now Playing glass: card at 75% over a 10px backdrop blur, a shade lighter than the list rows. */
const GLASS = 'border border-border bg-card/75 backdrop-blur-[10px]'

const MODES: Record<PlayMode, { icon: LucideIcon; label: string }> = {
  album: { icon: ListMusic, label: 'Album order' },
  repeat: { icon: Repeat1, label: 'Repeat this song' },
  shuffle: { icon: Shuffle, label: 'Shuffle' },
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
  /** Opens the song's action sheet; the "…" hides without it. */
  onMore?: () => void
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
      onClick={onClick}
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
 * The unfolded Now Playing control, and the screen's header too: cover,
 * title, the day it was written, dedication and voice, the "…" menu and
 * the fold chevron beside them, then the song's story, a single-line
 * scrubber, and Download · previous · play · next and the play mode
 * (album order, repeat, shuffle).
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
  onMore,
  className,
}: NowPlayingCardProps) {
  const t = TRACKS[track]
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
      className={cn(GLASS, 'flex flex-col gap-3 rounded-[18px] p-4', className)}
    >
      <div className='flex items-start gap-3'>
        <img
          src={t.art.thumb}
          alt=''
          className='size-[72px] shrink-0 rounded-[14px] object-cover shadow-[0_4px_14px_rgb(0_0_0/0.35)]'
        />
        <div className='min-w-0 flex-1 self-center'>
          <h1
            lang={t.lang}
            className='line-clamp-2 font-display text-[20px] leading-tight font-medium text-primary transition-colors duration-700'
          >
            {t.title}
          </h1>
          <div className='mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground'>
            <span>Written {writtenDate(t)}</span>
            {t.lyricsSource === 'transcribed' && (
              <TagPill
                color='var(--track-deep)'
                colorDark='var(--track-bright)'
              >
                Transcribed by ear
              </TagPill>
            )}
          </div>
          <div className='mt-0.5 truncate text-[12px] text-muted-foreground'>
            {t.dedication} · {t.voice}
          </div>
        </div>
        {(onMore || onCollapse) && (
          <div className='-mt-1 -mr-2 flex shrink-0 flex-col'>
            {onMore && (
              <Control
                label='More actions'
                icon={Ellipsis}
                onClick={onMore}
                className='size-9 text-muted-foreground'
              />
            )}
            {onCollapse && (
              <Control
                label='Collapse player'
                icon={ChevronUp}
                onClick={onCollapse}
                className='size-9 text-muted-foreground'
              />
            )}
          </div>
        )}
      </div>
      {/* The song's story, four lines at a time; a tap shows the rest. */}
      <button
        type='button'
        aria-expanded={storyOpen}
        onClick={() => setStoryOpen((open) => !open)}
        className={cn(
          'min-h-0 cursor-pointer text-left text-[12.5px] leading-normal text-foreground/75 transition-colors hover:text-foreground',
          !storyOpen && 'line-clamp-4'
        )}
      >
        {t.description}
      </button>
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
  /** Unfolds the card; the chevron hides without it. */
  onExpand?: () => void
}

/**
 * The folded Now Playing control: cover, title, the elapsed time, the
 * song's waveform as the scrubber, play, the "…" menu and a chevron that
 * unfolds the card. Takes the card's place once the words scroll.
 */
export function NowPlayingBar({
  track,
  progress,
  duration,
  playing,
  loading,
  onPlayPause,
  onSeek,
  onMore,
  onExpand,
  className,
}: NowPlayingBarProps) {
  const t = TRACKS[track]
  return (
    <div
      role='group'
      aria-label={`${t.title} player`}
      data-slot='now-playing-bar'
      className={cn(
        GLASS,
        'flex w-full max-w-full items-center gap-2.5 overflow-hidden rounded-2xl px-3 py-2',
        className
      )}
    >
      <img
        src={t.art.thumb}
        alt=''
        className='size-9 shrink-0 rounded-[8px] object-cover shadow-[0_4px_12px_rgb(0_0_0/0.35)]'
      />
      <div className='min-w-0 flex-1 overflow-hidden'>
        <div className='flex items-baseline gap-2'>
          <div className='min-w-0 flex-1 overflow-hidden'>
            <OverflowMarquee className='font-display text-[15px] leading-tight font-medium text-foreground'>
              {t.title}
            </OverflowMarquee>
          </div>
          <span className='shrink-0 text-[10.5px] text-muted-foreground tabular-nums'>
            {formatTime(progress * duration)} / {formatTime(duration)}
          </span>
        </div>
        <Waveform
          bins={halveBins(binsFor(t))}
          progress={progress}
          duration={duration}
          onSeek={onSeek}
          className='mt-1 h-4'
        />
      </div>
      <PlayToggle
        size='bar'
        playing={playing}
        loading={loading}
        onClick={onPlayPause}
      />
      {(onMore || onExpand) && (
        <div className='-mr-2 flex shrink-0 items-center'>
          {onMore && (
            <Control
              label='More actions'
              icon={Ellipsis}
              onClick={onMore}
              className='size-8 text-muted-foreground'
            />
          )}
          {onExpand && (
            <Control
              label='Expand player'
              icon={ChevronDown}
              onClick={onExpand}
              className='size-8 text-muted-foreground'
            />
          )}
        </div>
      )}
    </div>
  )
}
