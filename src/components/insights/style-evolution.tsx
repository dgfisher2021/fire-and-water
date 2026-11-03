import type { CSSProperties } from 'react'
import { KpiProgressBar } from '@dust-ui/charts'
import {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineItem,
  TimelineTime,
  TimelineTitle,
} from '@dust-ui/ui'
import { INSIGHTS } from '@/data/creator-insights'
import { InsightPanel } from './insight-panel'
import { styleVar } from './style-var'

const MONTHS = INSIGHTS.evolution
const BUSIEST = Math.max(...MONTHS.map((m) => m.songs))

/** "Jun 2026" from "2026-06". */
const monthLabel = (month: string) =>
  new Date(`${month}-01T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })

/**
 * The leading style per month on the kit's timeline rail, each month's
 * count in a glowing bead of its style.
 */
export function StyleEvolution() {
  return (
    <InsightPanel
      marker='03'
      tag='Over time'
      title='Style evolution'
      description={`The leading style in each of the ${MONTHS.length} latest active months; the dot holds that month’s public songs.`}
    >
      <Timeline>
        {MONTHS.map(({ month, style, songs }) => (
          <TimelineItem
            key={month}
            style={
              {
                '--orb': styleVar(style),
                '--meter': styleVar(style),
              } as CSSProperties
            }
            className='pb-3.5 meter-glow'
          >
            <TimelineDot className='border-0 bg-transparent text-[12px] font-semibold text-background tabular-nums glow-dot'>
              {songs}
            </TimelineDot>
            <TimelineConnector />
            <TimelineContent className='gap-1'>
              <div className='flex items-baseline justify-between gap-3'>
                <TimelineTitle className='font-display text-[19px] leading-tight font-medium'>
                  {style}
                </TimelineTitle>
                <TimelineTime
                  dateTime={month}
                  className='font-mono text-[11px]'
                >
                  {monthLabel(month)}
                </TimelineTime>
              </div>
              <KpiProgressBar
                value={songs / BUSIEST}
                ariaLabel={`${monthLabel(month)}: ${songs} ${songs === 1 ? 'song' : 'songs'}, led by ${style}`}
                color='var(--meter)'
                sizeClass='h-1.5'
              />
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </InsightPanel>
  )
}
