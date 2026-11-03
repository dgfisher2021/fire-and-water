import type { CSSProperties } from 'react'
import { ChartRadialBar } from '@dust-ui/charts'
import { MobileProgressRing } from '@dust-ui/ui'
import { INSIGHTS } from '@/data/creator-insights'
import { InsightPanel } from './insight-panel'
import { wash } from './style-var'

const { diversity, totals } = INSIGHTS
const BAND_SLICE = ['bg-left', 'bg-center', 'bg-right']
const BAND_ALIGN = ['text-left', 'text-center', 'text-right']

/**
 * The diversity index as one large gradient ring on the kit's radial bar,
 * its three bands on a soft scale from water (focused) to fire (roaming),
 * then the figures behind it in small rings along the ramp.
 */
export function StyleDiversity() {
  return (
    <InsightPanel
      marker='05'
      tag='Range'
      title='Style diversity'
      description='Whether the catalogue stays focused or roams, from how its style signals spread.'
    >
      <div className='relative mx-auto w-full max-w-60'>
        <ChartRadialBar
          data={[
            {
              label: 'Diversity index',
              value: diversity.index,
              color: 'var(--chart-2)',
            },
          ]}
          max={100}
          variant='gradient'
          innerRadius='84%'
          outerRadius='100%'
          cornerRadius={12}
          height={220}
          description={`Style diversity index ${diversity.index} of 100: ${diversity.band}`}
        />
        <div
          aria-hidden
          className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center'
        >
          <span className='font-mono text-[48px] leading-none font-semibold text-foreground tabular-nums'>
            {diversity.index}
          </span>
          <span className='mt-1.5 text-[11px] tracking-wide text-muted-foreground uppercase'>
            of 100
          </span>
        </div>
      </div>

      <div className='flex flex-col gap-2'>
        {/* One soft water-to-fire scale, cut into its bands. */}
        <div className='relative grid grid-cols-3 gap-1'>
          {diversity.bands.map((band, i) => (
            <span
              key={band}
              aria-hidden
              className={`h-1.5 rounded-full bg-linear-to-r from-chart-10/55 via-chart-6/60 to-chart-1/75 bg-[length:300%_100%] ${BAND_SLICE[i]}`}
            />
          ))}
          <span
            aria-hidden
            className='absolute top-1/2 size-3.5 -translate-1/2 rounded-full glow-dot'
            style={
              {
                left: `${diversity.index}%`,
                '--orb': 'var(--chart-2)',
              } as CSSProperties
            }
          />
        </div>
        <ol
          className='grid grid-cols-3 text-[12px]'
          aria-label='Diversity bands'
        >
          {diversity.bands.map((band, i) => {
            const here = band === diversity.band
            return (
              <li
                key={band}
                aria-current={here ? 'true' : undefined}
                className={`${BAND_ALIGN[i]} ${here ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
              >
                {band}
              </li>
            )
          })}
        </ol>
      </div>

      <div className='rounded-md bg-muted px-3 py-2.5'>
        <p className='font-display text-[19px] leading-tight font-medium text-chart-2'>
          {diversity.band}
        </p>
        <p className='mt-0.5 text-[13px] leading-snug text-foreground/80'>
          {diversity.note}
        </p>
      </div>

      <div className='grid grid-cols-3 gap-2 text-center'>
        <div className='flex flex-col items-center gap-1.5'>
          {/* A count, not a share: a full ring beside the two meters. */}
          <MobileProgressRing
            progress={1}
            size={64}
            strokeWidth={6}
            color={wash('var(--chart-3)', 70)}
            label={`${diversity.recognizedStyles} recognised styles`}
          >
            <span className='text-[17px] font-semibold tabular-nums'>
              {diversity.recognizedStyles}
            </span>
          </MobileProgressRing>
          <span className='text-[11px] leading-tight text-muted-foreground'>
            recognised styles
          </span>
        </div>
        <div className='flex flex-col items-center gap-1.5'>
          <MobileProgressRing
            progress={diversity.top3Share / 100}
            size={64}
            strokeWidth={6}
            color='var(--chart-5)'
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
            color='var(--chart-8)'
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
