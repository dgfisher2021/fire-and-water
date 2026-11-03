import { useRef } from 'react'
import { CalendarDays, ListMusic, Music2, Timer } from 'lucide-react'
import { useInView, useReducedMotion } from 'motion/react'
import { KpiCard } from '@dust-ui/charts'
import { MotionNumber } from '@dust-ui/motion'
import { formatTime } from '@dust-ui/ui'
import { INSIGHTS } from '@/data/creator-insights'

/** Counts up from zero once the tile scrolls into view; the end state under reduced motion. */
function CountUp({
  value,
  format,
}: {
  value: number
  format?: (n: number) => string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  return (
    <span ref={ref}>
      <MotionNumber
        value={inView || reduce ? value : 0}
        formatter={format ?? ((n) => String(Math.round(n)))}
      />
    </span>
  )
}

const { totals, analyzed, topStyles } = INSIGHTS

const TILES = [
  {
    label: 'Public songs',
    value: totals.publicSongs,
    hint: `${analyzed} of ${totals.publicSongs} analysed`,
    icon: Music2,
    tint: 'text-chart-1',
  },
  {
    label: 'Playlists',
    value: totals.playlists,
    hint: 'returned by Suno',
    icon: ListMusic,
    tint: 'text-chart-4',
  },
  {
    label: 'Average',
    value: totals.averageSeconds,
    format: (n: number) => formatTime(Math.round(n)),
    hint: 'length per public song',
    icon: Timer,
    tint: 'text-chart-7',
  },
  {
    label: 'Last 30 days',
    value: totals.last30Days,
    hint: `${topStyles.last30Days.styled} with style signals`,
    icon: CalendarDays,
    tint: 'text-chart-10',
  },
]

/**
 * The four headline figures as kit KPI tiles on glass, counting up, their
 * icons along the ramp.
 */
export function KpiTiles() {
  return (
    <div className='grid grid-cols-2 gap-3'>
      {TILES.map(({ label, value, format, hint, icon: Icon, tint }) => (
        <KpiCard
          key={label}
          label={label}
          value={<CountUp value={value} format={format} />}
          hint={hint}
          icon={<Icon className={`size-4 ${tint}`} aria-hidden />}
          className='backdrop-blur-md'
        />
      ))}
    </div>
  )
}
