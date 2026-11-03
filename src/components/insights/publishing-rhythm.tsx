import { KpiTracker, MobileWeekBars } from '@dust-ui/charts'
import { INSIGHTS } from '@/data/creator-insights'
import { InsightPanel } from './insight-panel'

const { rhythm } = INSIGHTS
const BUSIEST_MONTH = Math.max(...rhythm.months.map((m) => m.songs))
const PEAK = rhythm.weeks.reduce((a, b) => (b.songs > a.songs ? b : a))

const day = (iso: string) => new Date(`${iso}T12:00:00`)
const short = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  day(iso).toLocaleDateString('en-US', opts)

/** A week's axis label: the month's name on its first week, blank otherwise. */
const weekLabel = (start: string, i: number) => {
  const prev = rhythm.weeks[i - 1]
  return !prev || day(prev.start).getMonth() !== day(start).getMonth()
    ? short(start, { month: 'short' })
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
 * Output by week and by month: streak figures, the kit's week bars for the
 * latest 16 weeks (its labels are 7px, so the month axis is drawn here on
 * the same grid) and a tracker strip for the last 12 months.
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
          <div key={label} className='border-l-2 border-primary/50 pl-3'>
            <dt className='sr-only'>{label}</dt>
            <dd className='font-mono text-[22px] leading-none font-semibold text-foreground tabular-nums'>
              {value}
            </dd>
            <dd className='mt-1 text-[11px] leading-tight tracking-wide text-muted-foreground uppercase'>
              {label}
            </dd>
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
        <MobileWeekBars
          data={rhythm.weeks.map((w) => ({ label: '', value: w.songs }))}
          barHeight={84}
          showValues={false}
          description={`Songs per week, the latest ${rhythm.weeks.length} weeks`}
        />
        <div
          aria-hidden
          className='-mt-1 grid gap-1.5 text-[11px] text-muted-foreground'
          style={{
            gridTemplateColumns: `repeat(${rhythm.weeks.length}, 1fr)`,
          }}
        >
          {rhythm.weeks.map((w, i) => (
            <span key={w.start} className='overflow-visible whitespace-nowrap'>
              {weekLabel(w.start, i)}
            </span>
          ))}
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
          blocks={rhythm.months.map((m) => {
            const name = short(`${m.month}-01`, {
              month: 'long',
              year: 'numeric',
            })
            return {
              tone: m.songs > 0 ? 'success' : 'idle',
              tooltip: `${name}: ${m.songs} ${m.songs === 1 ? 'song' : 'songs'}`,
              // Busier months in a deeper wash of the accent.
              color:
                m.songs > 0
                  ? `color-mix(in oklab, var(--primary) ${Math.round(30 + (m.songs / BUSIEST_MONTH) * 70)}%, transparent)`
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
