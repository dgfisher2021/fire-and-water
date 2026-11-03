import { ChartArea, KpiTracker } from '@dust-ui/charts'
import { INSIGHTS } from '@/data/creator-insights'
import { InsightPanel } from './insight-panel'
import { wash } from './style-var'

const { rhythm } = INSIGHTS
const BUSIEST_MONTH = Math.max(...rhythm.months.map((m) => m.songs))
const PEAK = rhythm.weeks.reduce((a, b) => (b.songs > a.songs ? b : a))

const day = (iso: string) => new Date(`${iso}T12:00:00`)
const short = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  day(iso).toLocaleDateString('en-US', opts)

/** A week's axis label: the month's name on its first week, blank otherwise. */
const weekTick = (start: string | number) => {
  const i = rhythm.weeks.findIndex((w) => w.start === start)
  const prev = rhythm.weeks[i - 1]
  return !prev || day(prev.start).getMonth() !== day(String(start)).getMonth()
    ? short(String(start), { month: 'short' })
    : ''
}

const STATS = [
  {
    value: `${rhythm.activeWeeks.active}/${rhythm.activeWeeks.of}`,
    label: 'active recent weeks',
  },
  {
    value: `${rhythm.activeMonths.active}/${rhythm.activeMonths.of}`,
    label: 'active recent months',
  },
  { value: rhythm.longestWeeklyStreak, label: 'longest weekly streak' },
  { value: rhythm.longestMonthlyStreak, label: 'longest monthly streak' },
]

/**
 * Output by week and by month: streak figures, the kit's gradient area for
 * the latest 16 weeks in the ramp's fire, and a tracker strip for the last
 * 12 months, busier months in a deeper wash of the same ember.
 */
export function PublishingRhythm() {
  return (
    <InsightPanel
      marker='04'
      tag='Rhythm'
      title='Publishing rhythm'
      description='Weekly and monthly output by public creation date, counting the quiet stretches too.'
    >
      <dl className='grid grid-cols-2 gap-x-4 gap-y-3'>
        {STATS.map(({ value, label }) => (
          <div key={label} className='flex gap-3'>
            <span
              aria-hidden
              className='w-0.5 shrink-0 rounded-full bg-linear-to-b from-chart-1 to-chart-1/0'
            />
            <div>
              <dt className='sr-only'>{label}</dt>
              <dd className='font-mono text-[22px] leading-none font-semibold text-foreground tabular-nums'>
                {value}
              </dd>
              <dd className='mt-1 text-[11px] leading-tight tracking-wide text-muted-foreground uppercase'>
                {label}
              </dd>
            </div>
          </div>
        ))}
      </dl>

      <div className='flex flex-col gap-2'>
        <div className='flex items-baseline justify-between text-[12px] text-muted-foreground'>
          <span>Latest {rhythm.weeks.length} weeks</span>
          <span>
            <span className='font-semibold text-foreground tabular-nums'>
              {rhythm.latestWeeksSongs}
            </span>{' '}
            songs
          </span>
        </div>
        {/* Pulled left over the kit's fixed y-axis gutter. */}
        <div className='-ml-9 w-[calc(100%+2.25rem)]'>
          <ChartArea
            data={rhythm.weeks}
            xKey='start'
            xLabel='Week of'
            series={[{ key: 'songs', label: 'Songs', color: 'var(--chart-1)' }]}
            variant='gradient'
            height={150}
            legend={false}
            yDomain={[0, 8]}
            yTickFormatter={(n) => String(Math.round(n))}
            xTickFormatter={weekTick}
            tooltipLabelFormatter={(start) =>
              `Week of ${short(String(start), { month: 'short', day: 'numeric' })}`
            }
            description={`Songs per week, the latest ${rhythm.weeks.length} weeks`}
          />
        </div>
        <p className='text-[12px] text-muted-foreground'>
          Busiest: {PEAK.songs} songs in the week of{' '}
          {short(PEAK.start, { month: 'short', day: 'numeric' })}.
        </p>
      </div>

      <div className='flex flex-col gap-2'>
        <div className='flex items-baseline justify-between text-[12px] text-muted-foreground'>
          <span>Last {rhythm.months.length} months</span>
          <span>
            <span className='font-semibold text-foreground tabular-nums'>
              {rhythm.activeMonths.active}
            </span>{' '}
            active
          </span>
        </div>
        <KpiTracker
          aria-label={`Songs per month: ${rhythm.months.map((m) => `${short(`${m.month}-01`, { month: 'short', year: 'numeric' })} ${m.songs}`).join(', ')}`}
          blockHeight='h-7'
          gap={4}
          className='tracker-sheen'
          blocks={rhythm.months.map((m) => {
            const name = short(`${m.month}-01`, {
              month: 'long',
              year: 'numeric',
            })
            return {
              tone: m.songs > 0 ? 'success' : 'idle',
              tooltip: `${name}: ${m.songs} ${m.songs === 1 ? 'song' : 'songs'}`,
              // Busier months in a deeper wash of the ramp's fire.
              color:
                m.songs > 0
                  ? wash(
                      'var(--chart-1)',
                      Math.round(28 + (m.songs / BUSIEST_MONTH) * 62)
                    )
                  : undefined,
            }
          })}
        />
        <div
          aria-hidden
          className='grid gap-1 text-center text-[11px] text-muted-foreground'
          style={{
            gridTemplateColumns: `repeat(${rhythm.months.length}, 1fr)`,
          }}
        >
          {rhythm.months.map((m) => (
            <span key={m.month}>
              {short(`${m.month}-01`, { month: 'narrow' })}
            </span>
          ))}
        </div>
      </div>
    </InsightPanel>
  )
}
