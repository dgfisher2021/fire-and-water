import { useState, type CSSProperties } from 'react'
import { ChevronRight } from 'lucide-react'
import { KpiProgressBar } from '@dust-ui/charts'
import { SegmentedControl } from '@dust-ui/ui'
import { INSIGHTS, type StyleName } from '@/data/creator-insights'
import { InsightPanel } from './insight-panel'
import { styleVar } from './style-var'

type Range = keyof typeof INSIGHTS.topStyles

const RANGES: { value: Range; label: string }[] = [
  { value: 'allTime', label: 'All time' },
  { value: 'last30Days', label: 'Last 30 days' },
]

/** The ranked styles, all time or the last 30 days; a row opens the album's songs in it. */
export function TopStyles({
  onStyle,
}: {
  onStyle: (style: StyleName) => void
}) {
  const [range, setRange] = useState<Range>('allTime')
  const { songs, styled, styles } = INSIGHTS.topStyles[range]

  return (
    <InsightPanel
      marker='01'
      tag='Styles'
      title='Top styles'
      description={`${styled} of ${songs} songs ${range === 'allTime' ? 'in the catalogue' : 'from the last 30 days'} carry a recognised style; each share is of those ${styled}.`}
    >
      <SegmentedControl
        options={RANGES}
        value={range}
        onChange={(v) => setRange(v as Range)}
        height={44}
      />
      <ol className='-mx-2 flex flex-col'>
        {styles.map(({ style, songs: n, percent }, i) => (
          <li key={style}>
            <button
              type='button'
              onClick={() => onStyle(style)}
              aria-label={`${style}: ${n} songs, ${percent} percent. Show this album’s ${style} songs`}
              style={{ '--meter': styleVar(style) } as CSSProperties}
              className='flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-left meter-glow transition-colors hover:bg-accent/40'
            >
              <span className='w-6 shrink-0 font-mono text-[12px] text-muted-foreground tabular-nums'>
                {String(i + 1).padStart(2, '0')}
              </span>
              <KpiProgressBar
                value={percent}
                percent
                label={
                  <span className='text-[15px] font-medium text-foreground'>
                    {style}
                  </span>
                }
                showValue={
                  <span className='text-[12px] font-medium text-muted-foreground'>
                    <span className='text-foreground'>{n}</span> songs ·{' '}
                    {percent}%
                  </span>
                }
                color='var(--meter)'
                sizeClass='h-2'
                className='min-w-0 flex-1'
              />
              <ChevronRight
                className='size-4 shrink-0 text-muted-foreground'
                aria-hidden
              />
            </button>
          </li>
        ))}
      </ol>
    </InsightPanel>
  )
}
