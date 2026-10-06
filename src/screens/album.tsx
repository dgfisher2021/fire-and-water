import { useEffect, useState, type CSSProperties } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { MotionTextMorph } from '@dust-ui/motion'
import {
  MobileListGroup,
  MobilePageHeader,
  MobileSearchBar,
  useSwipe,
} from '@dust-ui/ui'
import { ALBUM, TRACKS, TRACK_ORDER, type TrackId } from '@/data/tracks'
import { formatTime } from '@/lib/format'
import { filterTracks } from '@/lib/search'
import {
  groupTracks,
  groupTracksByMonth,
  sortTracks,
  type AlbumSort,
} from '@/lib/sort'
import { usePlayer } from '@/store/player'
import { AppearanceButton } from '@/components/appearance-button'
import { ArtworkStage } from '@/components/artwork-stage'
import { PlayButton } from '@/components/play-button'
import { Screen } from '@/components/screen'
import { useFramed } from '@/components/shell-context'
import { SortButton } from '@/components/sort-button'
import { TrackRow } from '@/components/track-row'

const AUTOPLAY_MS = 15_000

/** The one-list footer when the order is not the album's own (which shows the tagline). */
const SORT_FOOTER: Partial<Record<AlbumSort, string>> = {
  title: 'A to Z by title',
  written: 'Oldest first, by the day each song was written',
}

const count = (n: number) => `${n} ${n === 1 ? 'song' : 'songs'}`

/** A group's title in the display face with its description as a lead. */
function GroupHeader({
  title,
  blurb,
  songs,
}: {
  title: string
  blurb?: string
  songs: number
}) {
  return (
    <header className='px-1 dark:[text-shadow:0_1px_12px_rgb(0_0_0/0.5)]'>
      <div className='flex items-baseline justify-between gap-3'>
        <h3 className='font-display text-[22px] leading-tight font-medium text-foreground'>
          {title}
        </h3>
        <span className='shrink-0 text-[11px] tracking-[1px] text-muted-foreground uppercase'>
          {count(songs)}
        </span>
      </div>
      {blurb && (
        <p className='mt-1 text-[12.5px] leading-normal text-foreground/70'>
          {blurb}
        </p>
      )}
    </header>
  )
}

/** "Mar 2" in the song's voice: deep on paper, bright on navy. */
function DayStamp({ id }: { id: TrackId }) {
  const day = new Date(`${TRACKS[id].written}T12:00:00`).toLocaleString(
    'en-US',
    { month: 'short', day: 'numeric' }
  )
  return (
    <span
      className='text-[11px] font-semibold tracking-[1px] text-(--voice) uppercase dark:text-(--voice-dark)'
      style={
        {
          '--voice': `var(--${id}-deep)`,
          '--voice-dark': `var(--${id})`,
        } as CSSProperties
      }
    >
      {day}
    </span>
  )
}

/** The songs by the month they were written, on a rail, a dot per month. */
function Timeline({ songs }: { songs: readonly TrackId[] }) {
  return (
    <ol className='relative flex flex-col gap-6 pl-5'>
      <div
        aria-hidden
        className='absolute top-3 bottom-3 left-[5px] w-px bg-foreground/15'
      />
      {groupTracksByMonth(songs).map(({ key, label, ids }) => (
        <li key={key} className='relative flex flex-col gap-3'>
          <span
            aria-hidden
            className='absolute top-[7px] -left-5 size-[11px] rounded-full border-2 border-background bg-primary shadow-[0_0_12px_var(--track-glow)]'
          />
          <GroupHeader title={label} songs={ids.length} />
          <MobileListGroup aria-label={label}>
            {ids.map((id) => (
              <TrackRow key={id} id={id} value={<DayStamp id={id} />} />
            ))}
          </MobileListGroup>
        </li>
      ))}
    </ol>
  )
}

export function AlbumScreen() {
  const framed = useFramed()
  const navigate = useNavigate()
  // The list order is in the URL (/?sort=title); the collection view keeps it clean.
  const { sort } = useSearch({ from: '/' })
  const setSort = (next: AlbumSort) =>
    void navigate({ to: '/', search: { sort: next }, replace: true })
  const index = usePlayer((s) => s.carouselIndex)
  const setIndex = usePlayer((s) => s.setCarouselIndex)
  const status = usePlayer((s) => s.status)
  const loaded = usePlayer((s) => s.track)
  const play = usePlayer((s) => s.play)
  const pause = usePlayer((s) => s.pause)
  // The covers turn on their own until the first touch or key; after that
  // the reader is in charge.
  const [interacted, setInteracted] = useState(false)
  const [query, setQuery] = useState('')
  const songs = filterTracks(TRACK_ORDER, (id) => TRACKS[id], query)
  const noMatch = songs.length === 0 ? `No song matches “${query}”` : undefined
  // The stage above keeps album order; only the list re-sorts.
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

  // Arrows turn the covers, unless the caret is in the search field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      setInteracted(true)
      step(e.key === 'ArrowRight' ? 1 : -1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const list = noMatch ? (
    <MobileListGroup label='Songs' footer={noMatch}>
      {[]}
    </MobileListGroup>
  ) : sort === 'collection' ? (
    <div className='flex flex-col gap-6'>
      {groupTracks(songs).map(({ collection, ids }) => (
        <section key={collection.key} className='flex flex-col gap-3'>
          <GroupHeader
            title={collection.label}
            blurb={collection.blurb}
            songs={ids.length}
          />
          <MobileListGroup aria-label={collection.label}>
            {ids.map((id) => (
              <TrackRow key={id} id={id} />
            ))}
          </MobileListGroup>
        </section>
      ))}
    </div>
  ) : sort === 'written' ? (
    <>
      <Timeline songs={songs} />
      <p className='px-1 font-display text-[13px] text-muted-foreground italic'>
        {SORT_FOOTER.written}
      </p>
    </>
  ) : (
    <MobileListGroup label='Songs' footer={SORT_FOOTER[sort] ?? ALBUM.tagline}>
      {sortTracks(songs, sort).map((id) => (
        <TrackRow key={id} id={id} />
      ))}
    </MobileListGroup>
  )

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
          autoplayMs={anyPlaying || interacted || query ? 0 : AUTOPLAY_MS}
          className='animate-fade-up'
        >
          <div className='min-h-[92px]'>
            <MotionTextMorph
              as='h2'
              className='font-display text-[26px] leading-[1.15] font-medium text-primary transition-colors duration-700 short:text-[22px]'
            >
              {t.title}
            </MotionTextMorph>
            <div
              key={track}
              className='animate-in duration-700 fade-in-0 slide-in-from-bottom-1'
            >
              <p className='mt-0.5 font-display text-[13px] text-muted-foreground italic'>
                {t.dedication} · {formatTime(t.duration)}
              </p>
              <p className='mx-auto mt-2 line-clamp-3 max-w-[300px] text-[12.5px] leading-normal text-foreground/60 short:mx-0 short:max-w-[440px]'>
                {t.description}
              </p>
            </div>
          </div>
          <div className='mt-4 flex w-full items-center justify-center short:justify-start'>
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
          </div>
        </ArtworkStage>

        {/* No entrance animation here: a filled opacity animation makes this
            wrapper a backdrop root and the capsule's and rows' glass stops
            frosting the artwork behind them. */}
        <div className='mt-6 flex flex-col gap-3 text-left'>
          {/* The kit's capsule has no glass variant: it takes the bar's
              card-at-85% fill through its background prop and the backdrop
              blur rides on the capsule element inside it. */}
          <div className='[&>div>div:first-child]:backdrop-blur-md'>
            <MobileSearchBar
              value={query}
              onChange={setQuery}
              placeholder='Search songs, voices, dedications'
              background='color-mix(in oklab, var(--card) 85%, transparent)'
              trailing={<SortButton value={sort} onChange={setSort} />}
            />
          </div>
          {list}
        </div>
      </div>
    </Screen>
  )
}
