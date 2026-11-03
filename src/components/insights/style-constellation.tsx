import type { CSSProperties } from 'react'
import { INSIGHTS, type StyleName } from '@/data/creator-insights'
import { InsightPanel } from './insight-panel'
import { styleVar } from './style-var'

const STARS = INSIGHTS.constellation
const MAX = Math.sqrt(STARS[0].songs)
const MIN = Math.sqrt(STARS[STARS.length - 1].songs)
const UNDRAWN = INSIGHTS.diversity.recognizedStyles - STARS.length

/** Diameter in px: area follows the song count, from 74 to 116. */
const diameter = (songs: number) =>
  Math.round(74 + ((Math.sqrt(songs) - MIN) / (MAX - MIN)) * 42)

/**
 * Every drawn style as a glass orb sized by its songs, in its place on the
 * ramp, each drifting a few pixels out of step (still under reduced
 * motion). Hand-made: the kit's ChartBubble plots x/y data, and this is a
 * packed field.
 */
export function StyleConstellation({
  onStyle,
}: {
  onStyle: (style: StyleName) => void
}) {
  return (
    <InsightPanel
      marker='02'
      tag='Styles'
      title='Style constellation'
      description={`The ${STARS.length} most used of ${INSIGHTS.diversity.recognizedStyles} recognised styles, each sized by its songs. Tap one for this album’s songs in it.`}
    >
      <ul className='flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2 py-1'>
        {STARS.map(({ style, songs }, i) => {
          const size = diameter(songs)
          return (
            <li
              key={style}
              // Alternate rows of the field sit a little high or low.
              className={i % 3 === 1 ? 'mt-3' : i % 3 === 2 ? '-mt-2' : ''}
            >
              <button
                type='button'
                onClick={() => onStyle(style)}
                aria-label={`${style}, ${songs} songs`}
                style={
                  {
                    width: size,
                    height: size,
                    '--orb': styleVar(style),
                    animationDelay: `${-(i * 0.9)}s`,
                  } as CSSProperties
                }
                className='flex cursor-pointer flex-col items-center justify-center rounded-full px-1.5 text-center glass-orb motion-safe:animate-drift'
              >
                <span
                  className={`leading-tight font-semibold text-balance text-foreground ${size > 84 ? 'text-[14px]' : 'text-[10.5px] tracking-tight'}`}
                >
                  {style}
                </span>
                <span className='mt-0.5 text-[11px] text-foreground/75 tabular-nums'>
                  {songs}
                </span>
              </button>
            </li>
          )
        })}
        <li className='mt-3'>
          <span className='flex size-18 flex-col items-center justify-center rounded-full bg-muted text-center text-[11px] leading-tight text-muted-foreground'>
            <span className='text-[13px] font-semibold text-foreground'>
              +{UNDRAWN}
            </span>
            more
          </span>
        </li>
      </ul>
    </InsightPanel>
  )
}
