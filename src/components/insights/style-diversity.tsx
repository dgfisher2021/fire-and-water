import { ChartGauge } from '@dust-ui/charts'
import { MobileProgressRing } from '@dust-ui/ui'
import { INSIGHTS } from '@/data/creator-insights'
import { InsightPanel } from './insight-panel'

const { diversity, totals } = INSIGHTS
const THIRD = 100 / diversity.bands.length

/** Each band a deeper wash of the accent, low to high. */
const ZONES = diversity.bands.map((_, i) => ({
  upTo: THIRD * (i + 1),
  color: `color-mix(in oklab, var(--primary) ${18 + i * 22}%, transparent)`,
}))

/**
 * The diversity index on the kit's gauge, its three bands as the dial's
 * zones and as a scale beneath, then the figures behind it in progress rings.
 */
export function StyleDiversity() {
  return (
    <InsightPanel
      marker='05'
      tag='Range'
      title='Style diversity'
      description='Whether the catalogue stays focused or roams, from how its style signals spread.'
    >
      <div className='flex flex-col items-center'>
        {/* The figure sits under the hub: the gauge's own would meet the needle. */}
        <ChartGauge
          value={diversity.index}
          max={100}
          sweep={180}
          zones={ZONES}
          needle
          size={232}
          strokeWidth={18}
          minLabel='0'
          maxLabel='100'
          valueFormatter={() => ''}
          description={`Style diversity index ${diversity.index} of 100: ${diversity.band}`}
        />
        <p className='-mt-4 font-mono text-[40px] leading-none font-semibold text-foreground tabular-nums'>
          {diversity.index}
        </p>
        <p className='mt-1.5 text-[11px] tracking-wide text-muted-foreground uppercase'>
          Diversity index
        </p>
      </div>

      <ol className='grid grid-cols-3 gap-1.5' aria-label='Diversity bands'>
        {diversity.bands.map((band, i) => {
          const here = band === diversity.band
          return (
            <li
              key={band}
              aria-current={here ? 'true' : undefined}
              className={`flex flex-col gap-1.5 text-center text-[12px] ${here ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
            >
              <span
                aria-hidden
                className={`h-1.5 rounded-full ${here ? 'ring-2 ring-primary/40' : ''}`}
                style={{ background: ZONES[i].color }}
              />
              {band}
            </li>
          )
        })}
      </ol>

      <div className='rounded-md bg-muted px-3 py-2.5'>
        <p className='font-display text-[19px] leading-tight font-medium text-primary'>
          {diversity.band}
        </p>
        <p className='mt-0.5 text-[13px] leading-snug text-foreground/80'>
          {diversity.note}
        </p>
      </div>

      <div className='grid grid-cols-3 gap-2 text-center'>
        <div className='flex flex-col items-center gap-1.5'>
          {/* A count, not a share: a plain disc beside the two rings. */}
          <span className='flex size-16 items-center justify-center rounded-full border-[6px] border-muted text-[17px] font-semibold tabular-nums'>
            {diversity.recognizedStyles}
          </span>
          <span className='text-[11px] leading-tight text-muted-foreground'>
            recognised styles
          </span>
        </div>
        <div className='flex flex-col items-center gap-1.5'>
          <MobileProgressRing
            progress={diversity.top3Share / 100}
            size={64}
            strokeWidth={6}
            color='var(--primary)'
            label='Top three styles’ share of style signals'
          >
            <span className='text-[17px] font-semibold tabular-nums'>
              {diversity.top3Share}%
            </span>
          </MobileProgressRing>
          <span className='text-[11px] leading-tight text-muted-foreground'>
            top 3 share
          </span>
        </div>
        <div className='flex flex-col items-center gap-1.5'>
          <MobileProgressRing
            progress={diversity.styledSongs / totals.publicSongs}
            size={64}
            strokeWidth={6}
            color='var(--primary)'
            label={`${diversity.styledSongs} of ${totals.publicSongs} songs styled`}
          >
            <span className='text-[17px] font-semibold tabular-nums'>
              {diversity.styledSongs}
            </span>
          </MobileProgressRing>
          <span className='text-[11px] leading-tight text-muted-foreground'>
            styled of {totals.publicSongs}
          </span>
        </div>
      </div>
    </InsightPanel>
  )
}
