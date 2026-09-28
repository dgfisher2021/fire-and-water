import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Play } from 'lucide-react'
import {
  Button,
  MobileListGroup,
  MobileListRow,
  MobilePageHeader,
  Pill,
} from '@dust-ui/ui'
import { ALBUM, TRACKS, TRACK_ORDER, type TrackId } from '@/data/tracks'
import { formatTime } from '@/lib/format'
import { selectIsActive, usePlayer } from '@/store/player'
import { useSwipe } from '@/hooks/use-swipe'
import { AppearanceButton } from '@/components/appearance-button'
import { ArtworkStage } from '@/components/artwork-stage'
import { PlayButton } from '@/components/play-button'
import { Screen } from '@/components/screen'
import { useFramed } from '@/components/shell-context'

const AUTOPLAY_MS = 10_000

function TrackRow({ id }: { id: TrackId }) {
  const t = TRACKS[id]
  const active = usePlayer(selectIsActive(id))
  const play = usePlayer((s) => s.play)
  const navigate = useNavigate()
  return (
    <MobileListRow
      label={
        <span className='flex items-center gap-3 py-0.5'>
          <img
            src={t.art.thumb}
            alt=''
            className='size-11 shrink-0 rounded-[10px] object-cover shadow-[0_4px_14px_rgb(0_0_0/0.35)]'
          />
          <span className='flex min-w-0 flex-col'>
            <span className='truncate font-display text-[17px] leading-tight text-foreground'>
              {t.title}
            </span>
            <span className='truncate text-[11px] text-muted-foreground'>
              {t.dedication} · {t.voice}
            </span>
          </span>
        </span>
      }
      value={formatTime(t.duration)}
      trailing={
        active ? (
          <Pill>Playing</Pill>
        ) : (
          <Play className='size-3.5 text-muted-foreground' aria-hidden />
        )
      }
      onClick={() => {
        play(id)
        void navigate({ to: '/lyrics/$track', params: { track: id } })
      }}
    />
  )
}

export function AlbumScreen() {
  const framed = useFramed()
  const navigate = useNavigate()
  const index = usePlayer((s) => s.carouselIndex)
  const setIndex = usePlayer((s) => s.setCarouselIndex)
  const status = usePlayer((s) => s.status)
  const loaded = usePlayer((s) => s.track)
  const play = usePlayer((s) => s.play)
  const pause = usePlayer((s) => s.pause)
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
      if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
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
            <span className='font-display text-[26px] font-normal'>
              {ALBUM.title}
            </span>
          }
          subtitle='Three songs about a brother and a sister'
          trailing={<AppearanceButton />}
          statusBarInset={framed}
        />
      }
    >
      <div ref={swipeRef} className='px-4 pt-1 text-center'>
        <ArtworkStage
          index={index}
          onIndexChange={setIndex}
          autoplayMs={anyPlaying ? 0 : AUTOPLAY_MS}
          className='animate-fade-up'
        >
          <div
            key={track}
            className='min-h-[92px] animate-in duration-700 fade-in-0 slide-in-from-bottom-1'
          >
            <h2 className='font-display text-[26px] leading-[1.15] font-normal text-primary transition-colors duration-700'>
              {t.title}
            </h2>
            <p className='mt-0.5 font-display text-[13px] text-muted-foreground italic'>
              {t.dedication} · {formatTime(t.duration)}
            </p>
            <p className='mx-auto mt-2 max-w-[300px] text-[12.5px] leading-normal text-foreground/50'>
              {t.description}
            </p>
          </div>
          <div className='mt-4 flex w-full items-center justify-center gap-3'>
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
          <MobileListGroup label='Tracks' footer={ALBUM.tagline}>
            {TRACK_ORDER.map((id) => (
              <TrackRow key={id} id={id} />
            ))}
          </MobileListGroup>
        </div>
      </div>
    </Screen>
  )
}

export const Route = createFileRoute('/')({
  component: AlbumScreen,
})
