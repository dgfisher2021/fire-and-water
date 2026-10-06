import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useRouterState } from '@tanstack/react-router'
import { Ellipsis, ScrollText } from 'lucide-react'
import { createPortal } from 'react-dom'
import { MotionTextMorph, MotionTextShimmer } from '@dust-ui/motion'
import {
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  SheetAction,
  type SheetActionAction,
  useSwipe,
} from '@dust-ui/ui'
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
import { lyricsToText } from '@/lib/lyrics-text'
import { copyText, download, downloadText, share } from '@/lib/share'
import { cn } from '@/lib/utils'
import { selectProgress, usePlayer } from '@/store/player'
import { useMediaQuery } from '@/hooks/use-media-query'
import { LyricsReader } from '@/components/lyrics-reader'
import { NowPlayingBar, NowPlayingCard } from '@/components/now-playing'
import { Screen } from '@/components/screen'
import { useFramed, useShellRoot } from '@/components/shell-context'
import { TagPill } from '@/components/tag-pill'

// Landscape phones and the like: no room for the card at all.
const SHORT_QUERY = '(max-height: 560px)'

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
  // follows the song there) and unfolds at the top, unless the reader has
  // folded or unfolded it by hand for this song, or arrived from the mini
  // player asking for it folded; short viewports never show the card.
  const short = useMediaQuery(SHORT_QUERY)
  const pane = useRef<HTMLDivElement>(null)
  const [scrolledTrack, setScrolledTrack] = useState<TrackId | null>(null)
  const [manual, setManual] = useState<{
    track: TrackId
    collapsed: boolean
  } | null>(null)
  const arrivedFolded = useRouterState({
    select: (s) => s.location.state.collapsed === true,
  })
  const collapsed =
    short ||
    (manual?.track === track
      ? manual.collapsed
      : arrivedFolded || scrolledTrack === track)
  const fold = (next: boolean) => setManual({ track, collapsed: next })
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
  if (t.lyrics.length > 0)
    actions.push({
      label: 'Copy lyrics',
      onClick: () => void copyText(lyricsToText(t), 'Lyrics copied'),
    })
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
    // No page header: one title row sits above the control in either state,
    // so the words get the height a header would take.
    <Screen scroll={false}>
      <div className={cn('shrink-0 px-4 pb-1', framed ? 'pt-[52px]' : 'pt-2')}>
        <div lang={t.lang} className='mb-2 flex items-start gap-3 px-1'>
          <div className='min-w-0 flex-1'>
            {/* Morphs as a swipe changes the song, like the stage's title. */}
            <MotionTextMorph
              as='h1'
              className='font-display text-[24px] leading-tight font-semibold text-primary transition-colors duration-700 [text-shadow:0_1px_2px_var(--background),0_2px_14px_var(--background)]'
            >
              {t.title}
            </MotionTextMorph>
            <p className='mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground [text-shadow:0_1px_2px_var(--background)]'>
              <span>Written {writtenDate(t)}</span>
              {t.lyricsSource === 'transcribed' && (
                <TagPill
                  color='var(--track-deep)'
                  colorDark='var(--track-bright)'
                >
                  Transcribed by ear
                </TagPill>
              )}
            </p>
          </div>
          <Button
            variant='ghost'
            size='icon'
            aria-label='More actions'
            onClick={() => setSheet(true)}
            className='-mr-1 shrink-0 rounded-full bg-card/60 text-muted-foreground backdrop-blur-[6px] hover:text-foreground'
          >
            <Ellipsis aria-hidden />
          </Button>
        </div>
        <div
          inert={collapsed}
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none',
            collapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr]'
          )}
        >
          <div className='min-h-0 min-w-0 overflow-clip [overflow-clip-margin:24px]'>
            <NowPlayingCard
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
              onSkipBack={() => goTo(adjacentTrack(track, -1))}
              onSkipForward={() => goTo(adjacentTrack(track, 1))}
              onCollapse={() => fold(true)}
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
          <div className='min-h-0 min-w-0 overflow-clip [overflow-clip-margin:24px]'>
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
              onExpand={short ? undefined : () => fold(false)}
            />
          </div>
        </div>
      </div>

      {/* The pane ends above the nav, so the sung line is never under it. */}
      <div
        ref={swipeRef}
        className='relative min-h-0 flex-1'
        style={{ marginBottom: 'var(--shell-bottom)' }}
      >
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
            paneClassName='px-4 pt-6 pb-[40vh]'
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
