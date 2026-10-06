import { useState } from 'react'
import {
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
import { ALBUM, TRACKS, type Track, type TrackId } from '@/data/tracks'
import { audioLabel, formatTime } from '@/lib/format'
import { download } from '@/lib/share'
import { cn } from '@/lib/utils'
import { PLAY_MODES, usePlayer, type PlayMode } from '@/store/player'
import { useToasts } from '@/store/toasts'
import { OverflowMarquee } from '@/components/overflow-marquee'
import { Waveform } from '@/components/waveform'

/** The Now Playing bar's glass: card at 85% over a backdrop blur. */
const GLASS = 'border border-border bg-card/85 backdrop-blur-md'

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
}: {
  label: string
  onClick: () => void
  icon: LucideIcon
  /** Lit in the song's accent (a play mode that is on). */
  on?: boolean
  fill?: boolean
}) {
  return (
    <Button
      variant='ghost'
      size='icon'
      aria-label={label}
      onClick={onClick}
      className={cn(
        'size-10 shrink-0 rounded-full transition-opacity hover:opacity-70',
        on ? 'text-primary' : 'text-foreground'
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

export type NowPlayingCardProps = NowPlayingProps & {
  onSkipBack: () => void
  onSkipForward: () => void
}

/**
 * The unfolded Now Playing control: cover, dedication, the song's story,
 * its waveform as the scrubber, then Download · previous · play · next and
 * the play mode (album order, repeat, shuffle).
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
      <div className='flex items-center gap-3'>
        <img
          src={t.art.thumb}
          alt=''
          className='size-14 shrink-0 rounded-[12px] object-cover shadow-[0_4px_14px_rgb(0_0_0/0.35)]'
        />
        <div className='min-w-0 flex-1'>
          <div className='truncate font-display text-[18px] leading-tight font-medium text-foreground'>
            {t.dedication}
          </div>
          <div className='mt-0.5 truncate text-[12px] text-muted-foreground'>
            {ALBUM.title} · {t.voice}
          </div>
        </div>
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
        <Waveform
          bins={binsFor(t)}
          progress={progress}
          duration={duration}
          onSeek={onSeek}
          className='h-9'
        />
        <div className='mt-1 flex justify-between text-[11px] text-muted-foreground tabular-nums'>
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

/**
 * The folded Now Playing control: cover, title, the elapsed time, a slim
 * waveform scrubber and play. Takes the card's place once the words scroll.
 */
export function NowPlayingBar({
  track,
  progress,
  duration,
  playing,
  loading,
  onPlayPause,
  onSeek,
  className,
}: NowPlayingProps) {
  const t = TRACKS[track]
  return (
    <div
      role='group'
      aria-label={`${t.title} player`}
      data-slot='now-playing-bar'
      className={cn(
        GLASS,
        'flex items-center gap-3 rounded-2xl px-3 py-2',
        className
      )}
    >
      <img
        src={t.art.thumb}
        alt=''
        className='size-9 shrink-0 rounded-[8px] object-cover shadow-[0_4px_12px_rgb(0_0_0/0.35)]'
      />
      <div className='min-w-0 flex-1'>
        <div className='flex items-baseline justify-between gap-2'>
          <OverflowMarquee className='min-w-0 flex-1 font-display text-[15px] leading-tight font-medium text-foreground'>
            {t.title}
          </OverflowMarquee>
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
    </div>
  )
}
