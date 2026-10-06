import { useEffect, useState, type CSSProperties } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { MobilePageHeader } from '@dust-ui/ui'
import { TRACKS, sameLyricShape, shortTitle, type TrackId } from '@/data/tracks'
import { selectProgress, usePlayer } from '@/store/player'
import { LyricsSplit, type LyricsColumn } from '@/components/lyrics-split'
import { NowPlayingBar } from '@/components/now-playing'
import { Screen } from '@/components/screen'
import { useFramed } from '@/components/shell-context'
import { SongPicker } from '@/components/song-picker'

type Side = 'left' | 'right'

// A song's deep tone on light surfaces, its bright tone on dark ones.
const VOICE = 'text-(--voice) dark:text-(--voice-dark)'
const voiceVars = (id: TrackId) =>
  ({
    '--voice': `var(--${id}-deep)`,
    '--voice-dark': `var(--${id})`,
  }) as CSSProperties

export function CompareScreen() {
  const framed = useFramed()
  const navigate = useNavigate()
  const pair = useSearch({ from: '/compare' })
  const [picking, setPicking] = useState<Side | null>(null)
  const loaded = usePlayer((s) => s.track)
  const status = usePlayer((s) => s.status)
  // The transport drives whichever of the pair is loaded, else the left.
  const track: TrackId =
    loaded === pair.left || loaded === pair.right ? loaded : pair.left
  const t = TRACKS[track]
  const isCurrent = loaded === track
  const playing = isCurrent && status === 'playing'
  const loading = isCurrent && status === 'loading'
  const progress = usePlayer((s) => (isCurrent ? selectProgress(s) : 0))
  const duration = usePlayer((s) =>
    isCurrent && s.duration > 0 ? s.duration : t.duration
  )
  // Sing-along position while a song of the pair plays. When the two sheets
  // share a shape (the mirrored pair) both columns follow the one playing.
  const mirror = sameLyricShape(
    TRACKS[pair.left].lyrics,
    TRACKS[pair.right].lyrics
  )
  const singTime = usePlayer((s) =>
    s.track &&
    (s.track === pair.left || s.track === pair.right) &&
    s.status !== 'idle'
      ? Math.round(s.currentTime * 10) / 10
      : undefined
  )
  const play = usePlayer((s) => s.play)
  const pause = usePlayer((s) => s.pause)
  const seek = usePlayer((s) => s.seek)
  // The Compare tab reopens this pair.
  const setComparePair = usePlayer((s) => s.setComparePair)
  useEffect(() => setComparePair(pair), [pair, setComparePair])

  const setSide = (side: Side, id: TrackId) =>
    navigate({
      to: '/compare',
      search: { ...pair, [side]: id },
      replace: true,
    })

  const column = (side: Side): LyricsColumn => {
    const id = pair[side]
    const own = loaded === id
    return {
      key: id,
      tag: shortTitle(id),
      voice:
        TRACKS[id].lyricsSource === 'transcribed'
          ? `${TRACKS[id].voice} · transcribed`
          : TRACKS[id].voice,
      stanzas: TRACKS[id].lyrics,
      lang: TRACKS[id].lang,
      color: `var(--${id}-deep)`,
      colorDark: `var(--${id})`,
      time: own || mirror ? singTime : undefined,
      timing: own ? TRACKS[id].timing : mirror ? t.timing : undefined,
      onSeekLine: (seconds) => {
        if (!own) play(id)
        seek(seconds)
      },
      playing: own && status === 'playing',
      onPlay: () => (own && status === 'playing' ? pause() : play(id)),
      onPick: () => setPicking(side),
    }
  }

  return (
    <Screen
      scroll={false}
      header={
        <MobilePageHeader
          eyebrow='Side by side'
          title={
            <span className='block truncate font-display text-[17px] font-medium'>
              <span className={VOICE} style={voiceVars(pair.left)}>
                {shortTitle(pair.left)}
              </span>
              <span className='text-muted-foreground'> × </span>
              <span className={VOICE} style={voiceVars(pair.right)}>
                {shortTitle(pair.right)}
              </span>
            </span>
          }
          statusBarInset={framed}
        />
      }
    >
      <div className='min-h-0 flex-1'>
        <LyricsSplit left={column('left')} right={column('right')} />
      </div>
      <div className='shrink-0 px-4 pt-2 pb-[calc(88px+env(safe-area-inset-bottom))]'>
        <NowPlayingBar
          track={track}
          duration={duration}
          progress={progress}
          onSeek={(ratio) => {
            if (!isCurrent) play(track)
            seek(ratio * duration)
          }}
          playing={playing}
          loading={loading}
          onPlayPause={() => (playing ? pause() : play(track))}
        />
      </div>
      {picking && (
        <SongPicker
          title={picking === 'left' ? 'Left column' : 'Right column'}
          value={pair[picking]}
          onSelect={(id) => void setSide(picking, id)}
          onClose={() => setPicking(null)}
        />
      )}
    </Screen>
  )
}
