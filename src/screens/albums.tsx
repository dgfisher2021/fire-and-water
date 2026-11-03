import type { CSSProperties } from 'react'
import { ChevronDown } from 'lucide-react'
import { MobileAppScreen, useMobileShellFramed } from '@dust-ui/blocks'
import {
  MotionAccordion,
  MotionAccordionContent,
  MotionAccordionItem,
  MotionAccordionTrigger,
} from '@dust-ui/motion'
import {
  IllustrationIcon,
  MobileListGroup,
  MobilePageHeader,
} from '@dust-ui/ui'
import { ALBUM, TRACKS, TRACK_ORDER, type TrackId } from '@/data/tracks'
import { formatLength } from '@/lib/format'
import { groupTracks } from '@/lib/sort'
import { TrackRow } from '@/components/track-row'

const count = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`
const lengthOf = (ids: readonly TrackId[]) =>
  formatLength(ids.reduce((sum, id) => sum + TRACKS[id].duration, 0))

/**
 * The album's art in its lead song's voice: deep on paper, bright on navy.
 * The art mixes its tones with --card, which is glass here; the tile gives
 * it the solid background so the two tones stay full strength.
 */
const voiceOf = (id: TrackId) =>
  ({
    '--voice': `var(--${id}-deep)`,
    '--voice-dark': `var(--${id})`,
    '--card': 'var(--background)',
  }) as CSSProperties

/**
 * The albums (the song collections) as glass cards: spot art, name, song
 * count and running time. A tap opens one, closing any other, to its
 * story and its songs.
 */
export function AlbumsScreen() {
  const framed = useMobileShellFramed()
  const albums = groupTracks(TRACK_ORDER)

  return (
    <MobileAppScreen
      header={
        <MobilePageHeader
          eyebrow={ALBUM.artist}
          title={
            <span className='font-display text-[26px] font-medium'>Albums</span>
          }
          subtitle={`${count(albums.length, 'album')} · ${count(TRACK_ORDER.length, 'song')} · ${lengthOf(TRACK_ORDER)}`}
          statusBarInset={framed}
        />
      }
    >
      <MotionAccordion
        type='single'
        className='flex flex-col gap-3 divide-y-0 border-y-0 px-4 pt-1 pb-6'
      >
        {albums.map(({ collection, ids }) => (
          <MotionAccordionItem
            key={collection.key}
            id={collection.key}
            className='overflow-hidden rounded-lg border border-border bg-card/85 backdrop-blur-md'
          >
            <MotionAccordionTrigger className='group gap-3 px-3 py-3 hover:bg-accent/20'>
              <span
                style={voiceOf(ids[0])}
                className='flex size-14 shrink-0 items-center justify-center rounded-md border border-border bg-background'
              >
                <IllustrationIcon
                  name={collection.illustration}
                  size={44}
                  className='text-(--voice) dark:text-(--voice-dark)'
                />
              </span>
              <span className='min-w-0 flex-1'>
                <span className='block font-display text-[19px] leading-tight font-medium text-foreground'>
                  {collection.label}
                </span>
                <span className='mt-1 block text-[12px] font-normal text-muted-foreground tabular-nums'>
                  {count(ids.length, 'song')} · {lengthOf(ids)}
                </span>
              </span>
              <ChevronDown
                aria-hidden
                className='size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-aria-expanded:rotate-180'
              />
            </MotionAccordionTrigger>
            <MotionAccordionContent className='flex flex-col gap-3 px-3 pt-0 pb-3'>
              <p className='px-1 text-[13px] leading-normal text-foreground/80'>
                {collection.blurb}
              </p>
              <MobileListGroup aria-label={collection.label}>
                {ids.map((id) => (
                  <TrackRow key={id} id={id} />
                ))}
              </MobileListGroup>
            </MotionAccordionContent>
          </MotionAccordionItem>
        ))}
      </MotionAccordion>
    </MobileAppScreen>
  )
}
