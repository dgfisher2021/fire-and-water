import { ChevronDown } from 'lucide-react'
import { MobileAppScreen, useMobileShellFramed } from '@dust-ui/blocks'
import {
  MotionAccordion,
  MotionAccordionContent,
  MotionAccordionItem,
  MotionAccordionTrigger,
} from '@dust-ui/motion'
import { MobileListGroup, MobilePageHeader } from '@dust-ui/ui'
import { ALBUM, TRACKS, TRACK_ORDER, type TrackId } from '@/data/tracks'
import { formatLength } from '@/lib/format'
import { groupTracks } from '@/lib/sort'
import { TrackRow } from '@/components/track-row'

const count = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`
const lengthOf = (ids: readonly TrackId[]) =>
  formatLength(ids.reduce((sum, id) => sum + TRACKS[id].duration, 0))

/**
 * The albums (the song collections) as light glass cards: a song's cover,
 * the name, song count and running time. A tap opens one, closing any
 * other: its story and its songs follow below the card, on the artwork,
 * rather than inside it.
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
            className='flex flex-col'
          >
            <MotionAccordionTrigger className='group gap-3 rounded-lg border border-border bg-card/45 px-3 py-3 backdrop-blur-md hover:bg-card/60 aria-expanded:bg-card/60'>
              <img
                src={TRACKS[collection.cover].art.thumb}
                alt=''
                className='size-14 shrink-0 rounded-md object-cover shadow-[0_4px_14px_rgb(0_0_0/0.35)]'
              />
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
            <MotionAccordionContent className='flex flex-col gap-3 px-0 pt-3 pb-2'>
              <p className='px-1 text-[13px] leading-normal text-foreground/85 [text-shadow:0_1px_2px_var(--background)] dark:[text-shadow:0_1px_12px_rgb(0_0_0/0.5)]'>
                {collection.blurb}
              </p>
              <MobileListGroup glass aria-label={collection.label}>
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
