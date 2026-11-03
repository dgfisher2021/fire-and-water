import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import {
  Columns2,
  Copy,
  Download,
  Ellipsis,
  ScrollText,
  Share2,
  X,
} from 'lucide-react'
import {
  MobileAppScreen,
  useMobileShellFramed,
  useMobileShellRoot,
} from '@dust-ui/blocks'
import { MotionTextMorph, MotionTextShimmer } from '@dust-ui/motion'
import {
  downloadText,
  downloadUrl,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  MobileMessageActions,
  type MobileMessageAction,
  SheetAction,
  type SheetActionAction,
  toLrc,
  useHotkeys,
  useMediaQuery,
  useSwipe,
} from '@dust-ui/ui'
import sizes from '@/data/audio-sizes.json'
import { hookFor } from '@/data/hooks'
import {
  ALBUM,
  TRACKS,
  TRACK_ORDER,
  adjacentTrack,
  comparePartner,
  dedicationLine,
  shortTitle,
  writtenDate,
  type TrackId,
} from '@/data/tracks'
import { audioLabel } from '@/lib/format'
import { mediaUrl } from '@/lib/media'
import { copyText, share } from '@/lib/share'
import { songText } from '@/lib/song-text'
import { toaster } from '@/lib/toaster'
import { cn } from '@/lib/utils'
import { selectProgress, usePlayer } from '@/store/player'
import { usePrefs } from '@/store/prefs'
import { HookViewer } from '@/components/hook-video'
import { LyricVideoSheet } from '@/components/lyric-video-sheet'
import { LyricsCompare, type CompareSide } from '@/components/lyrics-compare'
import { LyricsReader } from '@/components/lyrics-reader'
import { MiniPlayer } from '@/components/mini-player'
import { NowPlayingBar, NowPlayingCard } from '@/components/now-playing'
import { SongPicker } from '@/components/song-picker'
import { TagPill } from '@/components/tag-pill'

// Landscape phones and the like: no room for the card at all.
const SHORT_QUERY = '(max-height: 560px)'

/** The second song when a side-by-side opens with `next` on the left: kept unless it is now the same song. */
const partnerFor = (next: TrackId, current?: TrackId) =>
  current && current !== next ? current : comparePartner(next)

export function LyricsScreen() {
  const { track } = useParams({ from: '/lyrics/$track' })
  const { with: other } = useSearch({ from: '/lyrics/$track' })
  const navigate = useNavigate()
  const framed = useMobileShellFramed()
  const shellRoot = useMobileShellRoot()
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
  const [watching, setWatching] = useState(false)
  const [filming, setFilming] = useState(false)
  const [picking, setPicking] = useState<CompareSide | null>(null)

  // The control opens folded to the bar so the words get the screen; the
  // reader unfolds it by hand for this song. Short viewports never show the card.
  const short = useMediaQuery(SHORT_QUERY)
  const foldedPlayer = usePrefs((s) => s.foldedPlayer)
  const [unfolded, setUnfolded] = useState<TrackId | null>(null)
  const collapsed = short || unfolded !== track
  const fold = (next: boolean) => setUnfolded(next ? null : track)

  // The album slide (and so the theme) follows the open track.
  useEffect(() => {
    setCarouselIndex(TRACK_ORDER.indexOf(track))
  }, [track, setCarouselIndex])

  // Changing the song keeps a side-by-side open, with the same second song
  // unless that is the one now on the left.
  const open = (next: TrackId, replace = true) =>
    void navigate({
      to: '/lyrics/$track',
      params: { track: next },
      search: (s) => (s.with ? { with: partnerFor(next, s.with) } : {}),
      replace,
    })

  const goTo = (next: TrackId) => {
    // Keep the music going across a swipe, like flipping a record over.
    const s = usePlayer.getState()
    if (s.track && (s.status === 'playing' || s.status === 'loading'))
      s.play(next)
    open(next)
  }

  const setOther = (next: TrackId | undefined) =>
    void navigate({
      to: '/lyrics/$track',
      params: { track },
      search: next ? { with: next } : {},
      replace: true,
    })

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
        search: (s) =>
          s.with ? { with: partnerFor(requested.track, s.with) } : {},
        replace: true,
      })
  }, [requested, track, navigate])

  const swipeRef = useSwipe<HTMLDivElement>({
    threshold: 80,
    onSwipeLeft: () => goTo(adjacentTrack(track, 1)),
    onSwipeRight: () => goTo(adjacentTrack(track, -1)),
  })

  // Keyboard: Space toggles, arrows switch track.
  useHotkeys({
    ' ': (e) => {
      e.preventDefault()
      if (playing) pause()
      else play(track)
    },
    ArrowRight: () => goTo(adjacentTrack(track, 1)),
    ArrowLeft: () => goTo(adjacentTrack(track, -1)),
  })

  const download = audioLabel(
    t.audioFile,
    sizes[t.audioFile as keyof typeof sizes]
  )
  const partner = partnerFor(track, other)

  // The everyday actions as icons beside the date; the rest under "…".
  const quick: MobileMessageAction[] = [
    {
      icon: Copy,
      label: 'Copy the song: title, date, story, style and lyrics',
      onClick: () => void copyText(songText(track), 'Song copied'),
    },
    {
      icon: Download,
      label: `Download ${download}`,
      onClick: () => {
        downloadUrl(mediaUrl(t.audioFile), t.audioFile)
        toaster.push(`Downloading ${t.title}`)
      },
    },
    other
      ? {
          icon: X,
          label: 'Close side by side',
          onClick: () => setOther(undefined),
        }
      : {
          icon: Columns2,
          label: `Side by side with ${TRACKS[partner].title}`,
          onClick: () => setOther(partner),
        },
    {
      icon: Share2,
      label: 'Share song',
      onClick: () =>
        void share({
          title: `${t.title} - ${ALBUM.artist}`,
          text: `Listen to "${t.title}"`,
          url: new URL(`lyrics/${track}`, document.baseURI).href,
        }),
    },
  ]

  const hook = hookFor(track)
  const lrc = t.timing
    ? toLrc({
        title: t.title,
        artist: ALBUM.artist,
        album: ALBUM.title,
        duration: t.duration,
        stanzas: t.lyrics,
        timing: t.timing,
      })
    : null
  const driveLink = t.driveLink
  const more: SheetActionAction[] = [
    ...(hook
      ? [{ label: 'Watch the hook', onClick: () => setWatching(true) }]
      : []),
    ...(t.lyrics.length > 0 && t.timing
      ? [{ label: 'Make a lyric video', onClick: () => setFilming(true) }]
      : []),
    ...(lrc
      ? [
          {
            label: 'Download lyrics (.lrc)',
            onClick: () => downloadText(`${track}.lrc`, lrc),
          },
        ]
      : []),
    ...(driveLink
      ? [
          {
            label: 'Open in Google Drive',
            onClick: () => window.open(driveLink, '_blank', 'noopener'),
          },
        ]
      : []),
  ]
  if (more.length > 0)
    quick.push({
      icon: Ellipsis,
      label: 'More actions',
      onClick: () => setSheet(true),
    })

  return (
    // No page header: one title row sits above the control in either state,
    // so the words get the height a header would take.
    <MobileAppScreen scroll={false}>
      <div className={cn('shrink-0 px-4 pb-1', framed ? 'pt-[52px]' : 'pt-2')}>
        <div lang={t.lang} className='mb-2 px-1'>
          {/* Morphs as a swipe changes the song, like the stage's title. */}
          <MotionTextMorph
            as='h1'
            maxChars={22}
            className='font-display text-[24px] leading-tight font-semibold text-primary transition-colors duration-700 [text-shadow:0_1px_2px_var(--background),0_2px_14px_var(--background)]'
          >
            {t.title}
          </MotionTextMorph>
          <div className='mt-1 flex items-center gap-2'>
            <p className='flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground [text-shadow:0_1px_2px_var(--background)]'>
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
            {/* The kit's icon toolbar, sized up from its chat scale to thumb targets on glass. */}
            <MobileMessageActions
              label={`${t.title} actions`}
              actions={quick}
              className='-mr-1 shrink-0 gap-0 rounded-md bg-card/60 p-0.5 backdrop-blur-[6px] [&>button]:size-9 [&>button>svg]:size-[17px]'
            />
          </div>
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
              onWatchHook={hook ? () => setWatching(true) : undefined}
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
            {foldedPlayer === 'mini' ? (
              <MiniPlayer
                track={track}
                caret='down'
                onOpen={short ? undefined : () => fold(false)}
                className='animate-none'
              />
            ) : (
              <NowPlayingBar
                track={track}
                duration={duration}
                progress={progress}
                onSeek={(ratio) => {
                  if (!isCurrent) play(track)
                  seek(ratio * duration)
                }}
                onExpand={short ? undefined : () => fold(false)}
                playing={playing}
                loading={loading}
                onPlayPause={() => (playing ? pause() : play(track))}
              />
            )}
          </div>
        </div>
      </div>

      {/* The pane ends above the nav, so the sung line is never under it. */}
      <div
        ref={swipeRef}
        className='relative min-h-0 flex-1'
        style={{ marginBottom: 'var(--shell-bottom)' }}
      >
        {other ? (
          <LyricsCompare left={track} right={other} onPick={setPicking} />
        ) : t.lyrics.length > 0 ? (
          <LyricsReader
            key={track}
            stanzas={t.lyrics}
            lang={t.lang}
            contentKey={track}
            time={singTime}
            timing={t.timing}
            onSeekLine={(seconds) => {
              if (!isCurrent) play(track)
              seek(seconds)
            }}
            paneClassName='pt-6 pb-[40vh]'
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

      {sheet && (
        <SheetAction
          title={`${shortTitle(track)} · ${dedicationLine(t)}`}
          actions={more}
          onClose={() => setSheet(false)}
          container={shellRoot}
        />
      )}
      {picking && other && (
        <SongPicker
          title={picking === 'left' ? 'Left column' : 'Right column'}
          value={picking === 'left' ? track : other}
          onSelect={(id) =>
            picking === 'left'
              ? open(id)
              : setOther(id === track ? comparePartner(track) : id)
          }
          onClose={() => setPicking(null)}
        />
      )}
      {hook && watching && (
        <HookViewer
          hook={hook}
          title={t.title}
          poster={t.art.full}
          onClose={() => setWatching(false)}
        />
      )}
      {filming && (
        <LyricVideoSheet track={t} onClose={() => setFilming(false)} />
      )}
    </MobileAppScreen>
  )
}
