import { useState } from 'react'
import { ChartNetwork } from '@dust-ui/charts'
import { INSIGHTS, styleSongs, type StyleName } from '@/data/creator-insights'
import { InsightPanel } from './insight-panel'
import { styleVar } from './style-var'

const { relationships } = INSIGHTS
const MOST = relationships.pairs[0].songs

// The node order seeds the kit's layout. Replayed over every order of these
// eight at 330x250, this one keeps each label clear of the other nodes with
// Cinematic in the middle; a style the order lacks joins at the end. No hub
// flag: the kit seats a lone hub off-centre.
const LAYOUT: StyleName[] = [
  'Pop',
  'Trance',
  'Classical',
  'Electronic',
  'Acoustic',
  'Folk',
  'Orchestral',
  'Cinematic',
]
const NODES = [
  ...LAYOUT.filter((s) => relationships.styles.includes(s)),
  ...relationships.styles.filter((s) => !LAYOUT.includes(s)),
].map((style) => ({
  id: style,
  size: styleSongs(style),
  color: styleVar(style),
}))
const LINKS = [
  ...relationships.pairs.map((p) => ({
    source: p.a,
    target: p.b,
    value: p.songs,
  })),
  ...relationships.links.map((l) => ({ source: l.a, target: l.b })),
]

const touches = (style: StyleName | null, link: { a: string; b: string }) =>
  !style || link.a === style || link.b === style

/**
 * Styles that share songs, on the kit's network graph: a tap on a style
 * lights its links and narrows the pairs below to it.
 */
export function StyleRelationships() {
  const [selected, setSelected] = useState<StyleName | null>(null)
  const pairs = relationships.pairs.filter((p) => touches(selected, p))
  const quiet = relationships.links.filter((l) => touches(selected, l))

  return (
    <InsightPanel
      marker='06'
      tag='Pairings'
      title='Style relationships'
      description='Styles that turn up together in the same public song. Tap a style to light its links.'
    >
      <div className='-mx-1'>
        <ChartNetwork
          nodes={NODES}
          links={LINKS}
          labels='all'
          variant='gradient'
          width={330}
          height={250}
          selectedId={selected}
          onNodeClick={(node) =>
            setSelected((s) => (s === node.id ? null : (node.id as StyleName)))
          }
          valueFormatter={(n) => `${n} songs`}
          description='Network of styles that share songs, sized by each style’s song count'
          className='mx-auto'
        />
      </div>

      <div className='flex flex-col gap-2'>
        <div className='flex items-baseline justify-between text-[12px] text-muted-foreground'>
          <span>{selected ? `${selected}’s pairs` : 'Most shared pairs'}</span>
          {selected && (
            <button
              type='button'
              onClick={() => setSelected(null)}
              className='cursor-pointer font-medium text-primary'
            >
              Show all
            </button>
          )}
        </div>
        <ul className='flex flex-col divide-y divide-border'>
          {pairs.map((p) => (
            <li
              key={`${p.a}-${p.b}`}
              className='grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 py-2'
            >
              <span className='flex min-w-0 items-center gap-1.5 text-[14px] font-medium text-foreground'>
                <span
                  aria-hidden
                  className='size-2.5 shrink-0 rounded-full'
                  style={{ background: styleVar(p.a) }}
                />
                {p.a}
                <span className='text-muted-foreground'>+</span>
                <span
                  aria-hidden
                  className='size-2.5 shrink-0 rounded-full'
                  style={{ background: styleVar(p.b) }}
                />
                {p.b}
              </span>
              <span className='text-[12px] text-muted-foreground tabular-nums'>
                <span className='font-semibold text-foreground'>{p.songs}</span>{' '}
                songs
              </span>
              <span
                aria-hidden
                className='col-span-2 h-1 overflow-hidden rounded-full bg-muted'
              >
                <span
                  className='block h-full rounded-full'
                  style={{
                    width: `${(p.songs / MOST) * 100}%`,
                    background: `linear-gradient(90deg, ${styleVar(p.a)}, ${styleVar(p.b)})`,
                  }}
                />
              </span>
            </li>
          ))}
          {pairs.length === 0 && (
            <li className='py-2 text-[13px] text-muted-foreground'>
              None of {selected}’s pairs made the export’s top six.
            </li>
          )}
        </ul>
        {quiet.length > 0 && (
          <p className='text-[12px] leading-snug text-muted-foreground'>
            Also linked, fewer songs (the export draws these without a count):{' '}
            {quiet.map((l) => `${l.a} + ${l.b}`).join(', ')}.
          </p>
        )}
      </div>
    </InsightPanel>
  )
}
