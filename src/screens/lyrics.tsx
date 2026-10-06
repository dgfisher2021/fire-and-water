import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { Ellipsis, ScrollText } from 'lucide-react'
import { createPortal } from 'react-dom'
import { MotionScrollProgress, MotionTextShimmer } from '@dust-ui/motion'
import {
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  MobileMediaPlayer,
  MobilePageHeader,
  SheetAction,
  type SheetActionAction,
  useSwipe,
} from '@dust-ui/ui'
import envelopes from '@/data/audio-envelopes.json'
import sizes from '@/data/audio-sizes.json'
import {
  ALBUM,
  TRACKS,
  TRACK_ORDER,
  adjacentTrack,
  comparePartner,
  dedicationLine,
  writtenDate,
  type TrackId,
} from '@/data/tracks'
import { audioLabel } from '@/lib/format'
import { toLrc } from '@/lib/lrc'
import { download, downloadText, share } from '@/lib/share'
import { cn } from '@/lib/utils'
import { selectProgress, usePlayer } from '@/store/player'
import { useMediaQuery } from '@/hooks/use-media-query'
import { LyricsReader } from '@/components/lyrics-reader'
import { Screen } from '@/components/screen'
import { useFramed, useShellRoot } from '@/components/shell-context'
import { TagPill } from '@/components/tag-pill'
import { Waveform } from '@/components/waveform'

// Landscape phones and the like: no room for the card at all.
const SHORT_QUERY = '(max-height: 560px)'
/** The media player in the open track's voice. */
export const MEDIA_VARS =
  '[--media-accent-deep:var(--track-deep)] [--media-accent-foreground:var(--track-foreground)] [--media-accent:var(--track-bright)] [--media-glow:var(--track-glow)]'

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

  // The card folds to a bar once the words have scrolled up (or the pane
  // follows the song there) and unfolds at the top; short viewports never
  // show the card. Keyed by track so a new song starts unfolded.
  const short = useMediaQuery(SHORT_QUERY)
  const pane = useRef<HTMLDivElement>(null)
  const [scrolledTrack, setScrolledTrack] = useState<TrackId | null>(null)
  const collapsed = short || scrolledTrack === track
  useEffect(() => {
    const el = pane.current
    if (!el) return
    const onScroll = () => setScrolledTrack(el.scrollTop > 48 ? track : null)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [track])

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

  const partner = comparePartner(track)
  const actions: SheetActionAction[] = [
    {
      label: `Compare with ${TRACKS[partner].title}`,
      onClick: () =>
        void navigate({
          to: '/compare',
          search: { left: track, right: partner },
        }),
    },
    { label: 'Share song', onClick: onShare },
    {
      label: `Download ${audioLabel(t.audioFile, sizes[t.audioFile as keyof typeof sizes])}`,
      onClick: () => download(t.audioFile),
    },
  ]
  const lrc = toLrc(t)
  if (lrc)
    actions.push({
      label: 'Download lyrics (.lrc)',
      onClick: () => downloadText(`${track}.lrc`, lrc),
    })
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
            <span
              lang={t.lang}
              className='line-clamp-2 font-display text-[22px] leading-tight font-medium text-primary transition-colors duration-700'
            >
              {t.title}
            </span>
          }
          subtitle={
            t.lyricsSource === 'transcribed' ? (
              <span className='inline-flex items-center gap-2'>
                Written {writtenDate(t)}
                <TagPill
                  color='var(--track-deep)'
                  colorDark='var(--track-bright)'
                >
                  Transcribed by ear
                </TagPill>
              </span>
            ) : (
              `Written ${writtenDate(t)}`
            )
          }
          trailing={
            <Button
              variant='ghost'
              size='icon'
              aria-label='More actions'
              onClick={() => setSheet(true)}
              className='rounded-full bg-card text-muted-foreground hover:text-foreground'
            >
              <Ellipsis aria-hidden />
            </Button>
          }
          statusBarInset={framed}
        />
      }
    >
      <div className='shrink-0 px-4 pb-1'>
        <div
          inert={collapsed}
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none',
            collapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr]'
          )}
        >
          <div className='min-h-0 overflow-clip [overflow-clip-margin:24px]'>
            <MobileMediaPlayer
              title={t.dedication}
              artist={ALBUM.title}
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
              className={MEDIA_VARS}
            />
            <Waveform
              bins={envelopes[t.audioFile as keyof typeof envelopes]}
              progress={progress}
              onSeek={(ratio) => {
                if (!isCurrent) play(track)
                seek(ratio * duration)
              }}
              className='mt-2 h-7 px-5'
            />
          </div>
        </div>
        <div
          inert={!collapsed}
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none',
            collapsed ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] opacity-0'
          )}
        >
          <div className='min-h-0 overflow-clip [overflow-clip-margin:24px]'>
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
              className={cn(
                'rounded-2xl border border-border bg-card/85 px-3 py-2 backdrop-blur-md',
                MEDIA_VARS
              )}
            />
          </div>
        </div>
      </div>

      <div ref={swipeRef} className='relative min-h-0 flex-1'>
        {t.lyrics.length > 0 && (
          // How far down the words you are while reading by scroll; the
          // song takes over the pane once it plays, so the line steps aside.
          <MotionScrollProgress
            containerRef={pane}
            className={cn(
              'absolute inset-x-6 top-0 z-10 h-px bg-track-bright transition-opacity duration-500',
              singTime !== undefined && 'opacity-0'
            )}
          />
        )}
        {t.lyrics.length > 0 ? (
          <LyricsReader
            key={track}
            ref={pane}
            stanzas={t.lyrics}
            lang={t.lang}
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
              <EmptyTitle className='font-display text-2xl font-medium'>
                <MotionTextShimmer as='span' duration={2.6}>
                  Lyrics on their way
                </MotionTextShimmer>
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
