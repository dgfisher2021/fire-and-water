import { useEffect } from 'react'
import {
  Outlet,
  createFileRoute,
  useMatch,
  useNavigate,
} from '@tanstack/react-router'
import { Download } from 'lucide-react'
import { Button } from '@dust-ui/ui'
import { ALBUM, TRACKS, TRACK_ORDER, type TrackId } from '@/data/tracks'
import { formatTime } from '@/lib/format'
import { usePlayer } from '@/store/player'
import { useSwipe } from '@/hooks/use-swipe'
import { ArtworkStage } from '@/components/artwork-stage'
import { PlayButton } from '@/components/play-button'
import { TrackTabs } from '@/components/track-tabs'

const AUTOPLAY_MS = 10_000

export function PlayerLayout() {
  const lyricsOpen = !!useMatch({
    from: '/_player/lyrics/$track',
    shouldThrow: false,
  })
  const navigate = useNavigate()
  const index = usePlayer((s) => s.carouselIndex)
  const setIndex = usePlayer((s) => s.setCarouselIndex)
  const play = usePlayer((s) => s.play)
  const track = TRACK_ORDER[index]
  const t = TRACKS[track]

  const step = (direction: 1 | -1) =>
    setIndex((index + direction + TRACK_ORDER.length) % TRACK_ORDER.length)
  const select = (id: TrackId) => setIndex(TRACK_ORDER.indexOf(id))

  const openLyrics = () =>
    navigate({
      to: '/lyrics/$track',
      params: { track },
      search: { view: 'single' },
    })
  const playAndOpen = () => {
    play(track)
    void openLyrics()
  }

  const swipeRef = useSwipe<HTMLElement>({
    onSwipeLeft: () => step(1),
    onSwipeRight: () => step(-1),
  })

  // Arrow keys move between tracks while the home is the active view.
  useEffect(() => {
    if (lyricsOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  return (
    <>
      <main
        ref={swipeRef}
        className='relative z-[1] flex min-h-0 flex-1 flex-col'
      >
        <header className='shrink-0 px-5 pt-safe'>
          <TrackTabs
            value={track}
            onChange={select}
            className='animate-fade-up pt-5 pb-3'
          />
        </header>

        <section className='flex min-h-0 flex-1 flex-col items-center justify-center px-5 text-center'>
          <ArtworkStage
            index={index}
            onIndexChange={setIndex}
            autoplayMs={lyricsOpen ? 0 : AUTOPLAY_MS}
            className='animate-fade-up [animation-delay:150ms]'
          >
            <div
              key={track}
              className='min-h-[100px] animate-in duration-700 fade-in-0 slide-in-from-bottom-1'
            >
              <h1 className='font-display text-[28px] leading-[1.15] font-normal text-primary transition-colors duration-700'>
                {t.title}
              </h1>
              <p className='mt-1 font-display text-[13px] text-muted-foreground italic'>
                {t.dedication} · {formatTime(t.duration)}
              </p>
              <p className='mx-auto mt-2.5 max-w-[300px] text-[13px] leading-normal text-foreground/40'>
                {t.description}
              </p>
            </div>

            <div className='mt-[18px] flex w-full items-center justify-center gap-3'>
              <PlayButton playing={false} onClick={playAndOpen} />
              <Button
                variant='outline'
                onClick={openLyrics}
                className='h-11 rounded-xl border-border bg-card px-6 text-[13px] tracking-[1px] text-muted-foreground shadow-none hover:bg-accent hover:text-foreground'
              >
                Read Lyrics
              </Button>
              <Button
                variant='outline'
                size='icon-lg'
                nativeButton={false}
                render={
                  <a href={t.audioFile} download aria-label='Download track' />
                }
                className='rounded-full border-border bg-card text-foreground/40 shadow-none hover:bg-accent hover:text-muted-foreground'
              >
                <Download aria-hidden />
              </Button>
            </div>
          </ArtworkStage>
        </section>

        <footer className='shrink-0 animate-fade-up pb-2 pb-safe text-center [animation-delay:600ms]'>
          <p className='font-display text-xs text-foreground/30 italic'>
            {ALBUM.tagline}
          </p>
        </footer>
      </main>
      <Outlet />
    </>
  )
}

export const Route = createFileRoute('/_player')({
  component: PlayerLayout,
})
