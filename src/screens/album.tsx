import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Button,
  MobileListGroup,
  MobilePageHeader,
  useSwipe,
} from '@dust-ui/ui'
import { ALBUM, TRACKS, TRACK_ORDER } from '@/data/tracks'
import { formatTime } from '@/lib/format'
import { usePlayer } from '@/store/player'
import { AppearanceButton } from '@/components/appearance-button'
import { ArtworkStage } from '@/components/artwork-stage'
import { PlayButton } from '@/components/play-button'
import { Screen } from '@/components/screen'
import { useFramed } from '@/components/shell-context'
import { TrackRow } from '@/components/track-row'

const AUTOPLAY_MS = 15_000

export function AlbumScreen() {
  const framed = useFramed()
  const navigate = useNavigate()
  const index = usePlayer((s) => s.carouselIndex)
  const setIndex = usePlayer((s) => s.setCarouselIndex)
  const status = usePlayer((s) => s.status)
  const loaded = usePlayer((s) => s.track)
  const play = usePlayer((s) => s.play)
  const pause = usePlayer((s) => s.pause)
  // The covers turn on their own until the first touch or key; after that
  // the reader is in charge.
  const [interacted, setInteracted] = useState(false)
  const track = TRACK_ORDER[index]
  const t = TRACKS[track]
  const isActive = loaded === track && status !== 'paused' && status !== 'idle'
  const anyPlaying = status === 'playing' || status === 'loading'

  const step = (direction: 1 | -1) =>
    setIndex((index + direction + TRACK_ORDER.length) % TRACK_ORDER.length)
  const openLyrics = () => navigate({ to: '/lyrics/$track', params: { track } })

  const swipeRef = useSwipe<HTMLDivElement>({
    onSwipeLeft: () => step(1),
    onSwipeRight: () => step(-1),
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
      setInteracted(true)
      step(e.key === 'ArrowRight' ? 1 : -1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  return (
    <Screen
      header={
        <MobilePageHeader
          eyebrow={ALBUM.artist}
          title={
            <span className='font-display text-[26px] font-medium'>
              {ALBUM.title}
            </span>
          }
          subtitle={`${TRACK_ORDER.length} songs about a brother, a sister, and becoming`}
          trailing={<AppearanceButton />}
          statusBarInset={framed}
        />
      }
    >
      <div
        ref={swipeRef}
        onPointerDownCapture={() => setInteracted(true)}
        className='px-4 pt-1 text-center short:text-left'
      >
        <ArtworkStage
          index={index}
          onIndexChange={setIndex}
          autoplayMs={anyPlaying || interacted ? 0 : AUTOPLAY_MS}
          className='animate-fade-up'
        >
          <div
            key={track}
            className='min-h-[92px] animate-in duration-700 fade-in-0 slide-in-from-bottom-1'
          >
            <h2 className='font-display text-[26px] leading-[1.15] font-medium text-primary transition-colors duration-700 short:text-[22px]'>
              {t.title}
            </h2>
            <p className='mt-0.5 font-display text-[13px] text-muted-foreground italic'>
              {t.dedication} · {formatTime(t.duration)}
            </p>
            <p className='mx-auto mt-2 max-w-[300px] text-[12.5px] leading-normal text-foreground/60 short:mx-0 short:max-w-[440px]'>
              {t.description}
            </p>
          </div>
          <div className='mt-4 flex w-full items-center justify-center gap-3 short:justify-start'>
            <PlayButton
              playing={isActive && status === 'playing'}
              loading={isActive && status === 'loading'}
              onClick={() => {
                if (isActive && status === 'playing') pause()
                else {
                  play(track)
                  void openLyrics()
                }
              }}
            />
            <Button
              variant='outline'
              onClick={openLyrics}
              className='h-11 rounded-xl border-border bg-card px-5 text-[13px] tracking-[1px] text-muted-foreground shadow-none hover:bg-accent hover:text-foreground'
            >
              Read Lyrics
            </Button>
          </div>
        </ArtworkStage>

        <div className='mt-6 animate-fade-up text-left [animation-delay:200ms]'>
          <MobileListGroup label='Songs' footer={ALBUM.tagline}>
            {TRACK_ORDER.map((id) => (
              <TrackRow key={id} id={id} />
            ))}
          </MobileListGroup>
        </div>
      </div>
    </Screen>
  )
}
