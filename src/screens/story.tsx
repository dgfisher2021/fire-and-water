import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Button,
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
  MobilePageHeader,
} from '@dust-ui/ui'
import { ALBUM, TRACKS, TRACK_ORDER, type TrackId } from '@/data/tracks'
import { sortTracks } from '@/lib/sort'
import { cn } from '@/lib/utils'
import { Screen } from '@/components/screen'
import { useFramed } from '@/components/shell-context'

// Oldest first, album order within a day.
const STORY = sortTracks(TRACK_ORDER, 'written')

const monthOf = (id: TrackId) =>
  new Date(`${TRACKS[id].written}T12:00:00`).toLocaleString('en-US', {
    month: 'short',
  })
const dayOf = (id: TrackId) =>
  new Date(`${TRACKS[id].written}T12:00:00`).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
  })

// Filter chips: every month a song was written in, in order.
const MONTHS = ['All', ...new Set(STORY.map(monthOf))]

/**
 * The album as a story: one card per song in the order they were written,
 * each with its cover, the day, who it is for, and the description in full.
 * A card opens the song.
 */
export function StoryScreen() {
  const framed = useFramed()
  const [month, setMonth] = useState('All')
  const shown =
    month === 'All' ? STORY : STORY.filter((id) => monthOf(id) === month)

  return (
    <Screen
      header={
        <MobilePageHeader
          eyebrow={ALBUM.artist}
          title={
            <span className='font-display text-[26px] font-medium'>
              The story so far
            </span>
          }
          subtitle={`${TRACK_ORDER.length} songs in the order they were written`}
          statusBarInset={framed}
        />
      }
    >
      <div className='flex flex-col gap-3 px-4 pt-1'>
        <div
          role='group'
          aria-label='Filter by month'
          className='no-scrollbar flex gap-2 overflow-x-auto py-1'
        >
          {MONTHS.map((m) => (
            <Button
              key={m}
              size='sm'
              variant={m === month ? 'default' : 'outline'}
              aria-pressed={m === month}
              onClick={() => setMonth(m)}
              className={cn(
                'shrink-0 rounded-full px-4',
                m !== month && 'border-border bg-card text-muted-foreground'
              )}
            >
              {m}
            </Button>
          ))}
          <span className='ml-auto shrink-0 self-center text-[11px] text-muted-foreground'>
            {shown.length} {shown.length === 1 ? 'song' : 'songs'}
          </span>
        </div>

        <ol className='flex flex-col gap-3'>
          {shown.map((id) => {
            const t = TRACKS[id]
            return (
              <li key={id}>
                <Item
                  variant='outline'
                  render={<Link to='/lyrics/$track' params={{ track: id }} />}
                  className='items-start gap-3 rounded-2xl border-border bg-card/85 p-3 backdrop-blur-md transition-colors hover:bg-card'
                >
                  <ItemMedia
                    variant='image'
                    className='size-16 shrink-0 rounded-[12px]'
                  >
                    <img
                      src={t.art.thumb}
                      alt=''
                      className='size-16 rounded-[12px] object-cover shadow-[0_4px_14px_rgb(0_0_0/0.35)]'
                    />
                  </ItemMedia>
                  <ItemContent className='min-w-0 gap-1'>
                    <span
                      className='text-[11px] font-semibold tracking-[1.5px] uppercase'
                      style={{ color: `var(--${id})` }}
                    >
                      {dayOf(id)}
                    </span>
                    <ItemTitle className='font-display text-[18px] leading-tight font-medium text-foreground'>
                      {t.title}
                    </ItemTitle>
                    <ItemDescription className='text-[12px] text-muted-foreground'>
                      {t.dedication} · {t.voice}
                    </ItemDescription>
                    <p className='mt-1 text-[12.5px] leading-normal text-foreground/75'>
                      {t.description}
                    </p>
                  </ItemContent>
                </Item>
              </li>
            )
          })}
        </ol>
        <p className='px-1 font-display text-[13px] text-muted-foreground italic'>
          {ALBUM.tagline}
        </p>
      </div>
    </Screen>
  )
}
