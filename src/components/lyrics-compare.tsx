import { TRACKS, sameLyricShape, shortTitle, type TrackId } from '@/data/tracks'
import { usePlayer } from '@/store/player'
import { LyricsSplit, type LyricsColumn } from '@/components/lyrics-split'

export type CompareSide = 'left' | 'right'

export type LyricsCompareProps = {
  left: TrackId
  right: TrackId
  /** Opens a picker for one column's song. */
  onPick: (side: CompareSide) => void
}

/**
 * Two songs' words side by side, scroll-synced. A column follows its song
 * while it plays; when the two sheets share a shape (the mirrored pair) both
 * follow whichever of the two is playing.
 */
export function LyricsCompare({ left, right, onPick }: LyricsCompareProps) {
  const loaded = usePlayer((s) => s.track)
  const status = usePlayer((s) => s.status)
  const play = usePlayer((s) => s.play)
  const pause = usePlayer((s) => s.pause)
  const seek = usePlayer((s) => s.seek)
  const mirror = sameLyricShape(TRACKS[left].lyrics, TRACKS[right].lyrics)
  const singTime = usePlayer((s) =>
    (s.track === left || s.track === right) && s.status !== 'idle'
      ? Math.round(s.currentTime * 10) / 10
      : undefined
  )
  const sung = loaded === left || loaded === right ? loaded : null

  const column = (side: CompareSide): LyricsColumn => {
    const id = side === 'left' ? left : right
    const t = TRACKS[id]
    const own = loaded === id
    return {
      key: `${side}-${id}`,
      tag: shortTitle(id),
      voice:
        t.lyricsSource === 'transcribed' ? `${t.voice} · transcribed` : t.voice,
      stanzas: t.lyrics,
      lang: t.lang,
      color: `var(--${id}-deep)`,
      colorDark: `var(--${id})`,
      time: own || (mirror && sung) ? singTime : undefined,
      timing: own ? t.timing : mirror && sung ? TRACKS[sung].timing : undefined,
      onSeekLine: (seconds) => {
        if (!own) play(id)
        seek(seconds)
      },
      playing: own && status === 'playing',
      onPlay: () => (own && status === 'playing' ? pause() : play(id)),
      onPick: () => onPick(side),
    }
  }

  return <LyricsSplit left={column('left')} right={column('right')} />
}
