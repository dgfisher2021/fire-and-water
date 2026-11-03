import { formatTime } from '@dust-ui/ui'
import { cn } from '@/lib/utils'
import { arcPath, ORBIT, polar } from './geometry'
import { FAN_GLASS } from './glass'
import type { FanViewProps } from './types'

const SPRING = 'ease-[cubic-bezier(.34,1.56,.64,1)]'
const HOT =
  'data-hot:bg-linear-to-br data-hot:from-track-bright data-hot:to-track-deep data-hot:text-track-foreground data-hot:shadow-[0_0_26px_-2px_var(--media-glow)] data-hot:scale-[1.14]!'
const ARC_LENGTH = Math.round(
  (ORBIT.radius * (ORBIT.arc.from - ORBIT.arc.to) * Math.PI) / 180
)

/**
 * The Orbit: glass orbs spring out of the play button along an arc, a
 * hairline drawing in behind them, and a pill at the top with the title,
 * the time and a thin progress bar.
 */
export function FanOrbit({
  open,
  center: c,
  actions,
  hot,
  now,
  onAction,
}: FanViewProps) {
  const progress =
    now.duration > 0 ? Math.min(1, now.elapsed / now.duration) : 0
  return (
    <div data-slot='fan-orbit' className='pointer-events-none absolute inset-0'>
      <svg aria-hidden className='absolute inset-0 size-full overflow-visible'>
        <path
          d={arcPath(c, ORBIT.radius, ORBIT.arc.from, ORBIT.arc.to)}
          strokeWidth={1.5}
          className={cn(
            'fill-none stroke-foreground/20 transition-[stroke-dashoffset] motion-reduce:transition-none',
            open
              ? 'delay-50 duration-600 ease-[cubic-bezier(.2,.8,.2,1)]'
              : 'duration-200'
          )}
          style={{
            strokeDasharray: ARC_LENGTH,
            strokeDashoffset: open ? 0 : ARC_LENGTH,
          }}
        />
      </svg>

      <div
        className={cn(
          'absolute flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-baseline gap-2.5 rounded-full px-4 pt-2 pb-2.5 transition-[opacity,translate,scale] motion-reduce:transition-none',
          FAN_GLASS,
          open
            ? `translate-y-0 scale-100 opacity-100 delay-100 duration-500 ${SPRING}`
            : 'translate-y-7 scale-[.7] opacity-0 duration-200'
        )}
        style={{ left: c.x, top: c.y - ORBIT.pillTop }}
      >
        <span className='truncate font-display text-[16px] leading-none font-semibold text-foreground'>
          {now.title}
        </span>
        <span className='shrink-0 text-[11px] text-muted-foreground tabular-nums'>
          {formatTime(now.elapsed)} / {formatTime(now.duration)}
        </span>
        <span className='absolute inset-x-4 bottom-1 h-0.5 overflow-hidden rounded-full bg-foreground/15'>
          <span
            className='absolute inset-y-0 left-0 bg-linear-to-r from-track-bright to-track-deep shadow-[0_0_8px_var(--media-glow)]'
            style={{ width: `${progress * 100}%` }}
          />
        </span>
      </div>

      {actions.map((act) => {
        const angle = ORBIT.angles[act.id as keyof typeof ORBIT.angles]
        const p = polar(c, ORBIT.radius, angle)
        const delay = act.id === 'shuffle' || act.id === 'repeat' ? 60 : 0
        const Icon = act.icon
        return (
          <button
            key={act.id}
            type='button'
            data-fan-control={act.id}
            data-hot={hot === act.id || undefined}
            aria-label={act.label}
            aria-pressed={act.pressed}
            tabIndex={open ? 0 : -1}
            onClick={() => onAction(act.id)}
            className={cn(
              'absolute grid size-13 place-items-center rounded-full text-foreground transition-[translate,scale,opacity,background-color,box-shadow,color] hover:text-primary motion-reduce:transition-none',
              open
                ? `pointer-events-auto duration-500 ${SPRING}`
                : 'scale-25 opacity-0 duration-200 ease-in',
              FAN_GLASS,
              act.pressed && 'text-primary',
              HOT
            )}
            // Closed, each orb waits at the button's center.
            style={{
              left: p.x - ORBIT.size / 2,
              top: p.y - ORBIT.size / 2,
              translate: open ? '0 0' : `${c.x - p.x}px ${c.y - p.y}px`,
              transitionDelay: open
                ? `${delay}ms, 0ms, ${delay}ms, 0ms, 0ms, 0ms`
                : '0ms',
            }}
          >
            <Icon className='size-5.5' strokeWidth={2} aria-hidden />
            <span className='pointer-events-none absolute top-full left-1/2 mt-1.5 -translate-x-1/2 text-[9.5px] font-semibold tracking-[1.6px] whitespace-nowrap text-foreground/85 uppercase [text-shadow:0_1px_6px_var(--background)]'>
              {act.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
