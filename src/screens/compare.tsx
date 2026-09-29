import { useNavigate } from '@tanstack/react-router'
import { MobilePageHeader, SegmentedControl } from '@dust-ui/ui'
import { ALBUM, SPLIT_PAIR, TRACKS, type TrackId } from '@/data/tracks'
import { selectProgress, usePlayer } from '@/store/player'
import { LyricsSplit } from '@/components/lyrics-split'
import { Screen } from '@/components/screen'
import { useFramed } from '@/components/shell-context'
import { MobileMediaPlayer } from '@/components/ui/mobile-media-player'

const VIEW_OPTIONS = [
  { value: 'single', label: 'Lyrics' },
  { value: 'split', label: 'Compare' },
]

const PAIR: TrackId[] = [SPLIT_PAIR.left, SPLIT_PAIR.right]

export function CompareScreen() {
  const framed = useFramed()
  const navigate = useNavigate()
  const loaded = usePlayer((s) => s.track)
  const status = usePlayer((s) => s.status)
  // The transport drives whichever of the pair is loaded, else the first.
  const track = loaded && PAIR.includes(loaded) ? loaded : SPLIT_PAIR.left
  const t = TRACKS[track]
  const isCurrent = loaded === track
  const playing = isCurrent && status === 'playing'
  const loading = isCurrent && status === 'loading'
  const progress = usePlayer((s) => (isCurrent ? selectProgress(s) : 0))
  const duration = usePlayer((s) =>
    isCurrent && s.duration > 0 ? s.duration : t.duration
  )
  // Sing-along position for the column whose song is loaded.
  const singTime = usePlayer((s) =>
    s.track && PAIR.includes(s.track) && s.status !== 'idle'
      ? Math.round(s.currentTime * 10) / 10
      : undefined
  )
  const play = usePlayer((s) => s.play)
  const pause = usePlayer((s) => s.pause)
  const seek = usePlayer((s) => s.seek)

  const column = (id: TrackId, tone: string) => ({
    key: id,
    tag: TRACKS[id].title.replace(' and ', ' & '),
    voice: TRACKS[id].voice,
    stanzas: TRACKS[id].lyrics,
    tone,
    time: loaded === id ? singTime : undefined,
    timing: TRACKS[id].timing,
  })

  return (
    <Screen
      scroll={false}
      header={
        <MobilePageHeader
          eyebrow='Side by side'
          title={
            <span className='font-display text-[19px] font-normal whitespace-nowrap'>
              <span className='text-fire'>Fire & Water</span>
              <span className='text-muted-foreground'> × </span>
              <span className='text-water'>Water & Fire</span>
            </span>
          }
          subtitle={`Both by Dustin · ${ALBUM.artist}`}
          trailing={
            <div className='w-[124px]'>
              <SegmentedControl
                options={VIEW_OPTIONS}
                value='split'
                onChange={(v) => {
                  if (v === 'single')
                    void navigate({
                      to: '/lyrics/$track',
                      params: { track },
                    })
                }}
                height={30}
                trackColor='var(--card)'
                thumbColor='var(--accent)'
                activeColor='var(--primary)'
              />
            </div>
          }
          statusBarInset={framed}
        />
      }
    >
      <div className='min-h-0 flex-1'>
        <LyricsSplit
          left={column(SPLIT_PAIR.left, 'text-fire')}
          right={column(SPLIT_PAIR.right, 'text-water')}
        />
      </div>
      <div className='shrink-0 px-4 pt-2 pb-[calc(88px+env(safe-area-inset-bottom))]'>
        <MobileMediaPlayer
          variant='bar'
          title={t.title}
          duration={duration}
          progress={progress}
          onSeek={(ratio) => {
            if (!isCurrent) play(track)
            seek(ratio * duration)
          }}
          playing={playing}
          loading={loading}
          onPlayPause={() => (playing ? pause() : play(track))}
          className='rounded-2xl border border-border bg-card px-3 py-2 [--media-accent-deep:var(--track-deep)] [--media-accent-foreground:var(--track-foreground)] [--media-accent:var(--track-bright)] [--media-glow:var(--track-glow)]'
        />
      </div>
    </Screen>
  )
}
