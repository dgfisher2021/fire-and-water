import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router'
import { fallback, zodValidator } from '@tanstack/zod-adapter'
import { Download, Share2, X } from 'lucide-react'
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  SegmentedControl,
} from '@dust-ui/ui'
import {
  ALBUM,
  SPLIT_PAIR,
  TRACKS,
  TRACK_ORDER,
  adjacentTrack,
  isLastTrack,
  trackIdSchema,
  type TrackId,
} from '@/data/tracks'
import { canShare } from '@/lib/audio'
import { share } from '@/lib/share'
import { cn } from '@/lib/utils'
import { selectProgress, usePlayer } from '@/store/player'
import { useSwipe } from '@/hooks/use-swipe'
import { LyricsReader } from '@/components/lyrics-reader'
import { LyricsSplit } from '@/components/lyrics-split'
import { MobileMediaPlayer } from '@/components/ui/mobile-media-player'

const searchSchema = z.object({
  view: fallback(z.enum(['single', 'split']), 'single').default('single'),
})

const canSplit = (track: TrackId) =>
  track === SPLIT_PAIR.left || track === SPLIT_PAIR.right

const VIEW_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'split', label: 'Side by side' },
]

export function LyricsRoute() {
  const { track } = Route.useParams()
  const { view } = Route.useSearch()
  const navigate = useNavigate()
  const t = TRACKS[track]
  const split = view === 'split' && canSplit(track)

  const [open, setOpen] = useState(true)
  const loadedTrack = usePlayer((s) => s.track)
  const status = usePlayer((s) => s.status)
  const isCurrent = loadedTrack === track
  const playing = isCurrent && status === 'playing'
  const loading = isCurrent && status === 'loading'
  const progress = usePlayer((s) => (isCurrent ? selectProgress(s) : 0))
  const duration = usePlayer((s) =>
    isCurrent && s.duration > 0 ? s.duration : t.duration
  )
  const play = usePlayer((s) => s.play)
  const pause = usePlayer((s) => s.pause)
  const seek = usePlayer((s) => s.seek)
  const stop = usePlayer((s) => s.stop)
  const setCarouselIndex = usePlayer((s) => s.setCarouselIndex)

  // The home slide (and so the theme) follows the open track.
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
      search: { view: 'single' },
      replace: true,
    })
  }

  // Album play-through: a finished track advances to the next while open.
  const endedCount = usePlayer((s) => s.endedCount)
  const seenEnded = useRef(endedCount)
  useEffect(() => {
    if (endedCount === seenEnded.current) return
    seenEnded.current = endedCount
    if (isLastTrack(track)) return
    const next = adjacentTrack(track, 1)
    play(next)
    void navigate({
      to: '/lyrics/$track',
      params: { track: next },
      search: { view: 'single' },
      replace: true,
    })
  }, [endedCount, track, play, navigate])

  // Lock-screen prev/next asked for another track: follow it.
  const requested = usePlayer((s) => s.requested)
  const seenRequest = useRef(requested?.seq ?? 0)
  useEffect(() => {
    if (!requested || requested.seq === seenRequest.current) return
    seenRequest.current = requested.seq
    if (requested.track !== track)
      void navigate({
        to: '/lyrics/$track',
        params: { track: requested.track },
        search: { view: 'single' },
        replace: true,
      })
  }, [requested, track, navigate])

  const swipeRef = useSwipe<HTMLDivElement>({
    threshold: 80,
    onSwipeLeft: () => goTo(adjacentTrack(track, 1)),
    onSwipeRight: () => goTo(adjacentTrack(track, -1)),
  })

  // Keyboard: Space toggles, arrows switch track (Escape is the drawer's).
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

  const setView = (next: string) =>
    void navigate({
      to: '/lyrics/$track',
      params: { track },
      search: { view: next === 'split' ? 'split' : 'single' },
      replace: true,
    })

  const onShare = () =>
    void share({
      title: `${t.title} — ${ALBUM.artist}`,
      text: `Listen to "${t.title}"`,
      url: new URL(`lyrics/${track}`, document.baseURI).href,
    })

  const title = split ? 'Fire & Water × Water & Fire' : t.title
  const dedication = split ? 'Both by Dustin' : t.dedicationDated
  const voice = split ? 'Dustin’s voice × Alex’s voice' : t.voice

  return (
    <Drawer
      open={open}
      onOpenChange={setOpen}
      onAnimationEnd={(isOpen) => {
        if (isOpen) return
        stop()
        void navigate({ to: '/' })
      }}
    >
      <DrawerContent
        aria-label='Lyrics'
        className={cn(
          'h-dvh border-0 bg-transparent text-foreground glass-drawer',
          'data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-dvh data-[vaul-drawer-direction=bottom]:rounded-none data-[vaul-drawer-direction=bottom]:border-t-0',
          // The library grabber, slimmed to the original's 36x4 pill.
          '[&>div:first-child]:mt-2.5 [&>div:first-child]:h-1 [&>div:first-child]:w-9 [&>div:first-child]:bg-foreground/20'
        )}
      >
        <header
          data-print='hide'
          className='flex shrink-0 items-center gap-3 border-b border-border/40 px-5 pt-3 pb-4'
        >
          <Button
            variant='ghost'
            size='icon'
            onClick={() => setOpen(false)}
            aria-label='Close lyrics'
            className='rounded-full bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
          >
            <X aria-hidden />
          </Button>
          <div className='min-w-0 flex-1 text-center'>
            <DrawerTitle
              className={cn(
                'truncate font-display text-lg font-normal',
                split ? 'text-fire' : 'text-primary'
              )}
            >
              {title}
            </DrawerTitle>
            <DrawerDescription className='font-display text-[11px] text-foreground/40 italic'>
              {dedication}
            </DrawerDescription>
            <p
              className={cn(
                'mt-0.5 text-[10px] tracking-[2px] uppercase',
                split ? 'text-muted-foreground' : 'text-primary'
              )}
            >
              {voice}
            </p>
          </div>
          {canSplit(track) ? (
            <div className='w-[128px] shrink-0 text-[11px]'>
              <SegmentedControl
                options={VIEW_OPTIONS}
                value={split ? 'split' : 'single'}
                onChange={setView}
                height={30}
                trackColor='var(--card)'
                thumbColor='var(--accent)'
                activeColor='var(--primary)'
              />
            </div>
          ) : (
            <div aria-hidden className='size-9 shrink-0' />
          )}
        </header>

        <div ref={swipeRef} className='min-h-0 flex-1'>
          {split ? (
            <LyricsSplit
              left={{
                key: SPLIT_PAIR.left,
                tag: TRACKS[SPLIT_PAIR.left].title.replace(' and ', ' & '),
                voice: TRACKS[SPLIT_PAIR.left].voice,
                stanzas: TRACKS[SPLIT_PAIR.left].lyrics,
                tone: 'text-fire',
              }}
              right={{
                key: SPLIT_PAIR.right,
                tag: TRACKS[SPLIT_PAIR.right].title.replace(' and ', ' & '),
                voice: TRACKS[SPLIT_PAIR.right].voice,
                stanzas: TRACKS[SPLIT_PAIR.right].lyrics,
                tone: 'text-water',
              }}
            />
          ) : (
            <LyricsReader stanzas={t.lyrics} contentKey={track} />
          )}
        </div>

        <footer
          data-print='hide'
          className='shrink-0 border-t border-border/40 bg-background/30 pb-safe'
        >
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
            className='px-5 py-2.5 [--media-accent-deep:var(--track-deep)] [--media-accent:var(--track-bright)] [--media-glow:var(--track-glow)]'
            actions={
              <>
                {canShare() && (
                  <Button
                    variant='outline'
                    size='icon-sm'
                    onClick={onShare}
                    aria-label='Share track'
                    className='rounded-full border-border/60 bg-card text-foreground/40 shadow-none hover:text-muted-foreground'
                  >
                    <Share2 aria-hidden className='size-3.5' />
                  </Button>
                )}
                <Button
                  variant='outline'
                  size='icon-sm'
                  nativeButton={false}
                  render={
                    <a
                      href={t.audioFile}
                      download
                      aria-label='Download track'
                    />
                  }
                  className='rounded-full border-border/60 bg-card text-foreground/40 shadow-none hover:text-muted-foreground'
                >
                  <Download aria-hidden className='size-3.5' />
                </Button>
              </>
            }
          />
        </footer>
      </DrawerContent>
    </Drawer>
  )
}

export const Route = createFileRoute('/_player/lyrics/$track')({
  params: {
    parse: (raw) => {
      const parsed = trackIdSchema.safeParse(raw.track)
      if (!parsed.success) throw notFound()
      return { track: parsed.data }
    },
    stringify: (params) => ({ track: params.track }),
  },
  validateSearch: zodValidator(searchSchema),
  component: LyricsRoute,
})
