import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { Ellipsis, ScrollText } from 'lucide-react'
import { createPortal } from 'react-dom'
import {
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  MobilePageHeader,
  SegmentedControl,
  SheetAction,
  type SheetActionAction,
} from '@dust-ui/ui'
import {
  ALBUM,
  TRACKS,
  TRACK_ORDER,
  adjacentTrack,
  comparePartner,
  dedicationLine,
  type TrackId,
} from '@/data/tracks'
import { download, share } from '@/lib/share'
import { selectProgress, usePlayer } from '@/store/player'
import { useSwipe } from '@/hooks/use-swipe'
import { LyricsReader } from '@/components/lyrics-reader'
import { Screen } from '@/components/screen'
import { useFramed, useShellRoot } from '@/components/shell-context'
import { MobileMediaPlayer } from '@/components/ui/mobile-media-player'

const VIEW_OPTIONS = [
  { value: 'single', label: 'Lyrics' },
  { value: 'split', label: 'Compare' },
]

export function LyricsScreen() {
  const { track } = useParams({ from: '/lyrics/$track' })
  const navigate = useNavigate()
  const framed = useFramed()
  const shellRoot = useShellRoot()
  const t = TRACKS[track]

  const loadedTrack = usePlayer((s) => s.track)
  const status = usePlayer((s) => s.status)
  const isCurrent = loadedTrack === track
  const playing = isCurrent && status === 'playing'
  const loading = isCurrent && status === 'loading'
  const progress = usePlayer((s) => (isCurrent ? selectProgress(s) : 0))
  const duration = usePlayer((s) =>
    isCurrent && s.duration > 0 ? s.duration : t.duration
  )
  // Sing-along position, a tenth of a second at a time so the lyrics pane
  // re-renders ten times a second rather than every frame.
  const singTime = usePlayer((s) =>
    s.track === track && s.status !== 'idle'
      ? Math.round(s.currentTime * 10) / 10
      : undefined
  )
  const play = usePlayer((s) => s.play)
  const pause = usePlayer((s) => s.pause)
  const seek = usePlayer((s) => s.seek)
  const setCarouselIndex = usePlayer((s) => s.setCarouselIndex)
  const [sheet, setSheet] = useState(false)

  // The album slide (and so the theme) follows the open track.
  useEffect(() => {
    setCarouselIndex(TRACK_ORDER.indexOf(track))
  }, [track, setCarouselIndex])

  const goTo = (next: TrackId) => {
    // Keep the music going across a swipe, like flipping a record over.
    const s = usePlayer.getState()
    if (s.track && (s.status === 'playing' || s.status === 'loading'))
      s.play(next)
    void navigate({
      to: '/lyrics/$track',
      params: { track: next },
      replace: true,
    })
  }

  // Lock-screen prev/next or album play-through moved on: follow it.
  const requested = usePlayer((s) => s.requested)
  const seenRequest = useRef(requested?.seq ?? 0)
  useEffect(() => {
    if (!requested || requested.seq === seenRequest.current) return
    seenRequest.current = requested.seq
    if (requested.track !== track)
      void navigate({
        to: '/lyrics/$track',
        params: { track: requested.track },
        replace: true,
      })
  }, [requested, track, navigate])

  const swipeRef = useSwipe<HTMLDivElement>({
    threshold: 80,
    onSwipeLeft: () => goTo(adjacentTrack(track, 1)),
    onSwipeRight: () => goTo(adjacentTrack(track, -1)),
  })

  // Keyboard: Space toggles, arrows switch track.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === ' ' && tag !== 'BUTTON' && tag !== 'A') {
        e.preventDefault()
        if (playing) pause()
        else play(track)
      } else if (e.key === 'ArrowRight' && e.target === document.body) {
        goTo(adjacentTrack(track, 1))
      } else if (e.key === 'ArrowLeft' && e.target === document.body) {
        goTo(adjacentTrack(track, -1))
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const onShare = () =>
    void share({
      title: `${t.title} — ${ALBUM.artist}`,
      text: `Listen to "${t.title}"`,
      url: new URL(`lyrics/${track}`, document.baseURI).href,
    })

  const actions: SheetActionAction[] = [
    { label: 'Share song', onClick: onShare },
    { label: 'Download audio', onClick: () => download(t.audioFile) },
  ]
  if (t.driveLink) {
    const link = t.driveLink
    actions.push({
      label: 'Open in Google Drive',
      onClick: () => window.open(link, '_blank', 'noopener'),
    })
  }

  // The action sheet pins inside the shell root (over the nav), so it
  // portals out of the screen's own stacking context.
  const actionSheet =
    sheet && shellRoot
      ? createPortal(
          <SheetAction
            title={`${t.title} · ${dedicationLine(t)}`}
            actions={actions}
            onClose={() => setSheet(false)}
          />,
          shellRoot
        )
      : null

  return (
    <Screen
      scroll={false}
      header={
        <MobilePageHeader
          eyebrow={t.voice}
          title={
            <span className='font-display text-[22px] leading-tight font-normal text-primary transition-colors duration-700'>
              {t.title}
            </span>
          }
          subtitle={
            t.lyricsSource === 'transcribed'
              ? `${dedicationLine(t)} · words transcribed by ear`
              : dedicationLine(t)
          }
          trailing={
            <>
              <div className='w-[124px]'>
                <SegmentedControl
                  options={VIEW_OPTIONS}
                  value='single'
                  onChange={(v) => {
                    if (v === 'split')
                      void navigate({
                        to: '/compare',
                        search: { left: track, right: comparePartner(track) },
                      })
                  }}
                  height={30}
                  trackColor='var(--card)'
                  thumbColor='var(--accent)'
                  activeColor='var(--primary)'
                />
              </div>
              <Button
                variant='ghost'
                size='icon'
                aria-label='More actions'
                onClick={() => setSheet(true)}
                className='rounded-full bg-card text-muted-foreground hover:text-foreground'
              >
                <Ellipsis aria-hidden />
              </Button>
            </>
          }
          statusBarInset={framed}
        />
      }
    >
      <div className='shrink-0 px-4 pb-1'>
        <MobileMediaPlayer
          title={t.title}
          artist={`${ALBUM.artist} · ${ALBUM.title}`}
          artwork={
            <img
              src={t.art.thumb}
              alt=''
              className='size-12 shrink-0 rounded-[10px] object-cover shadow-[0_4px_14px_rgb(0_0_0/0.35)]'
            />
          }
          duration={duration}
          progress={progress}
          onSeek={(ratio) => {
            if (!isCurrent) play(track)
            seek(ratio * duration)
          }}
          playing={playing}
          loading={loading}
          onPlayPause={() => (playing ? pause() : play(track))}
          onSkipBack={() => goTo(adjacentTrack(track, -1))}
          onSkipForward={() => goTo(adjacentTrack(track, 1))}
          className='[--media-accent-deep:var(--track-deep)] [--media-accent-foreground:var(--track-foreground)] [--media-accent:var(--track-bright)] [--media-glow:var(--track-glow)]'
        />
      </div>

      <div ref={swipeRef} className='min-h-0 flex-1'>
        {t.lyrics.length > 0 ? (
          <LyricsReader
            key={track}
            stanzas={t.lyrics}
            contentKey={track}
            time={singTime}
            timing={t.timing}
            onSeekLine={(seconds) => {
              if (!isCurrent) play(track)
              seek(seconds)
            }}
            className='px-6 pt-8 pb-[calc(140px+env(safe-area-inset-bottom))]'
          />
        ) : (
          <Empty className='h-full pb-24'>
            <EmptyHeader>
              <EmptyMedia
                variant='icon'
                className='bg-card text-muted-foreground'
              >
                <ScrollText aria-hidden />
              </EmptyMedia>
              <EmptyTitle className='font-display text-2xl font-normal text-foreground/70'>
                Lyrics on their way
              </EmptyTitle>
              <EmptyDescription className='text-[13px]'>
                Listen along for now. Swipe to the next song, or come back once
                the words are in.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>

      {actionSheet}
    </Screen>
  )
}
