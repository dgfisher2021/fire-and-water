import { ChevronRight } from 'lucide-react'
import { formatTime } from '@dust-ui/ui'
import { INSIGHTS, type StyleName } from '@/data/creator-insights'
import { InsightPanel } from './insight-panel'
import { styleVar, styleWash } from './style-var'

// The axis starts at 2:30: no style's range dips below 3:00.
const FROM = 150
const TO = 420
const TICKS = [180, 240, 300, 360, 420]
const at = (seconds: number) => `${((seconds - FROM) / (TO - FROM)) * 100}%`
const OVERALL = INSIGHTS.totals.averageSeconds

/**
 * Range, middle half and average length per style. Hand-made: the kit's
 * ChartBoxplot stands vertical and marks a median, and the export gives an
 * average, so these are horizontal range bars with the average dotted.
 */
export function StyleDurations({
  onStyle,
}: {
  onStyle: (style: StyleName) => void
}) {
  return (
    <InsightPanel
      marker='07'
      tag='Length'
      title='Style and duration'
      description={`Shortest to longest (the thin line), the middle half (the bar) and the average (the dot) per style; the dashed line is the catalogue’s ${formatTime(OVERALL)}.`}
    >
      <div className='flex flex-col'>
        {/* Axis */}
        <div className='grid grid-cols-[88px_1fr_40px] items-end gap-x-2 pb-1 text-[10.5px] text-muted-foreground tabular-nums'>
          <span>Style</span>
          <span className='relative h-4'>
            {TICKS.map((t) => (
              <span
                key={t}
                className={`absolute bottom-0 font-mono ${t === TO ? '-translate-x-full' : '-translate-x-1/2'}`}
                style={{ left: at(t) }}
              >
                {t === TO ? '7:00+' : formatTime(t)}
              </span>
            ))}
          </span>
          <span className='text-right'>Avg</span>
        </div>

        <div className='relative'>
          {/* The catalogue's average, across every row. */}
          <span
            aria-hidden
            className='pointer-events-none absolute inset-y-0 grid w-full grid-cols-[88px_1fr_40px] gap-x-2'
          >
            <span />
            <span className='relative'>
              <span
                className='absolute inset-y-0 border-l border-dashed border-muted-foreground/60'
                style={{ left: at(OVERALL) }}
              />
            </span>
          </span>

          {INSIGHTS.durations.map((d) => (
            <button
              key={d.style}
              type='button'
              onClick={() => onStyle(d.style)}
              aria-label={`${d.style}, ${d.songs} songs: ${formatTime(d.range[0])} to ${d.pastEdge ? 'over 7:00' : formatTime(d.range[1])}, middle half ${formatTime(d.middle[0])} to ${formatTime(d.middle[1])}, average ${formatTime(d.average)}`}
              className='group relative grid w-full cursor-pointer grid-cols-[88px_1fr_40px] items-center gap-x-2 rounded-md py-1.5 text-left'
            >
              <span className='min-w-0'>
                <span className='block truncate text-[14px] leading-tight font-medium text-foreground group-hover:text-primary'>
                  {d.style}
                </span>
                <span className='block text-[11px] text-muted-foreground tabular-nums'>
                  {d.songs} songs
                </span>
              </span>
              <span className='relative h-5'>
                {/* Gridlines */}
                {TICKS.map((t) => (
                  <span
                    key={t}
                    className='absolute inset-y-0 border-l border-border'
                    style={{ left: at(t) }}
                  />
                ))}
                {/* Range */}
                <span
                  className='absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full'
                  style={{
                    left: at(d.range[0]),
                    width: `calc(${at(d.range[1])} - ${at(d.range[0])})`,
                    background: styleWash(d.style, 55),
                  }}
                />
                {/* Middle half */}
                <span
                  className='absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full'
                  style={{
                    left: at(d.middle[0]),
                    width: `calc(${at(d.middle[1])} - ${at(d.middle[0])})`,
                    background: styleVar(d.style),
                  }}
                />
                {/* Average */}
                <span
                  className='absolute top-1/2 size-3 -translate-1/2 rounded-full border-2 border-background bg-foreground'
                  style={{ left: at(d.average) }}
                />
              </span>
              <span className='flex items-center justify-end font-mono text-[12.5px] font-semibold text-foreground tabular-nums'>
                {formatTime(d.average)}
                <ChevronRight
                  className='-mr-1 size-3 text-muted-foreground'
                  aria-hidden
                />
              </span>
            </button>
          ))}
        </div>
      </div>
    </InsightPanel>
  )
}
