import { Music } from 'lucide-react'
import {
  MobilePageHeader,
  MobileTimeline,
  type MobileTimelineItem,
} from '@dust-ui/ui'
import { ALBUM, TRACKS, TRACK_ORDER } from '@/data/tracks'
import { Screen } from '@/components/screen'
import { useFramed } from '@/components/shell-context'

// The songs as a story, in the order they were written.
const STORY: MobileTimelineItem[] = TRACK_ORDER.map((id) => {
  const t = TRACKS[id]
  return {
    id,
    date: t.written,
    month: new Date(t.written).toLocaleString('en-US', { month: 'short' }),
    title: t.title,
    desc: `${t.dedication} · ${t.voice}`,
    detail: t.description,
    color: `var(--${id})`,
    icon: Music,
  }
})
// Filter chips: every month a song was written in, in order.
const MONTHS = ['All', ...new Set(STORY.map((item) => item.month))]

/** The album as a timeline, one card per song in the order they were written. */
export function StoryScreen() {
  const framed = useFramed()
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
        <MobileTimeline items={STORY} months={MONTHS} />
        <p className='px-1 font-display text-[13px] text-muted-foreground italic'>
          {ALBUM.tagline}
        </p>
      </div>
    </Screen>
  )
}
