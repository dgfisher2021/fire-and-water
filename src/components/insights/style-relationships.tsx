import type { CSSProperties } from 'react'
import { ChartSankey } from '@dust-ui/charts'
import { INSIGHTS, type StyleName } from '@/data/creator-insights'
import { InsightPanel } from './insight-panel'
import { lift, styleVar, wash } from './style-var'

const { relationships } = INSIGHTS
const MOST = relationships.pairs[0].songs
const HUB: StyleName = 'Cinematic'

// Every counted pair includes the hub: it flows left, its partners right.
const PARTNERS = relationships.pairs.map((p) => ({
  style: p.a === HUB ? p.b : p.a,
  songs: p.songs,
}))
const NODES = [HUB, ...PARTNERS.map((p) => p.style)].map((style) => ({
  name: style,
  // Lifted on navy so the kit's 40% ribbons stay clear of brown.
  color: lift(styleVar(style)),
}))
const LINKS = PARTNERS.map((p, i) => ({
  source: 0,
  target: i + 1,
  value: p.songs,
}))

/**
 * Styles that share songs: the kit's gradient Sankey fans Cinematic out to
 * the styles it shares most with, each ribbon blending from fire toward its
 * partner's colour and as wide as their songs. The pairs follow as bars;
 * the links the export draws without a count close the panel.
 */
export function StyleRelationships() {
  return (
    <InsightPanel
      marker='06'
      tag='Pairings'
      title='Style relationships'
      description={`Styles that turn up together in the same public song: ${HUB} fans out to the six it shares most with, each flow as wide as their songs.`}
    >
      <ChartSankey
        nodes={NODES}
        links={LINKS}
        variant='gradient'
        nodeWidth={10}
        height={236}
        valueFormatter={(n) => `${n} songs`}
        description={`${HUB} and the styles it shares songs with, each flow as wide as their shared songs`}
      />

      <div className='flex flex-col gap-2'>
        <span className='text-[12px] text-muted-foreground'>
          Most shared pairs
        </span>
        <ul className='flex flex-col divide-y divide-border'>
          {relationships.pairs.map((p) => (
            <li
              key={`${p.a}-${p.b}`}
              className='grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 py-2'
            >
              <span className='flex min-w-0 items-center gap-1.5 text-[14px] font-medium text-foreground'>
                <span
                  aria-hidden
                  className='size-2.5 shrink-0 rounded-full glow-dot'
                  style={{ '--orb': styleVar(p.a) } as CSSProperties}
                />
                {p.a}
                <span className='text-muted-foreground'>+</span>
                <span
                  aria-hidden
                  className='size-2.5 shrink-0 rounded-full glow-dot'
                  style={{ '--orb': styleVar(p.b) } as CSSProperties}
                />
                {p.b}
              </span>
              <span className='text-[12px] text-muted-foreground tabular-nums'>
                <span className='font-semibold text-foreground'>{p.songs}</span>{' '}
                songs
              </span>
              <span
                aria-hidden
                className='col-span-2 h-1.5 rounded-full bg-muted'
              >
                <span
                  className='block h-full rounded-full'
                  style={{
                    width: `${(p.songs / MOST) * 100}%`,
                    background: `linear-gradient(90deg, color-mix(in oklab, ${styleVar(p.a)}, var(--glass-light) 35%), ${styleVar(p.b)})`,
                    boxShadow: `0 0 10px -2px ${wash(styleVar(p.b), 60)}`,
                  }}
                />
              </span>
            </li>
          ))}
        </ul>
        <p className='text-[12px] leading-snug text-muted-foreground'>
          Also linked, fewer songs (the export draws these without a count):{' '}
          {relationships.links.map((l) => `${l.a} + ${l.b}`).join(', ')}.
        </p>
      </div>
    </InsightPanel>
  )
}
