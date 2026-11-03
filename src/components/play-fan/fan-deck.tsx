import { formatTime } from '@dust-ui/ui'
import { cn } from '@/lib/utils'
import { DECK } from './geometry'
import type { FanAction, FanViewProps } from './types'

/** A control card, or the cover card, which shows art instead of an icon. */
type Card = Omit<FanAction, 'icon'> & Partial<Pick<FanAction, 'icon'>>

/** Cards rest this far above the button's center, before they fan. */
const RISE = 60
const ORIGIN = `${DECK.w / 2}px ${DECK.h + RISE + DECK.pivotBelow}px`
const LIFT = 12
const DELAY: Record<number, number> = { 0: 0, 16: 45, 32: 90 }

const HOT =
  'data-hot:bg-linear-to-br data-hot:from-track-bright data-hot:to-track-deep data-hot:text-track-foreground data-hot:shadow-[0_0_26px_-4px_var(--media-glow)]'

/**
 * The Deck: five glass cards fan out of the play button like a hand, the
 * song's cover in the middle. Rotate staggers the spread; translate and
 * scale carry the rise and the hot lift, so a lit card answers at once.
 */
export function FanDeck({
  open,
  center: c,
  actions,
  hot,
  now,
  onAction,
}: FanViewProps) {
  const cover: Card = { id: 'cover', label: `Open ${now.title}` }
  const cards: Card[] = [actions[0], actions[1], cover, actions[2], actions[3]]
  const progress =
    now.duration > 0 ? Math.min(1, now.elapsed / now.duration) : 0

  return (
    <div data-slot='fan-deck' className='pointer-events-none absolute inset-0'>
      {cards.map((act) => {
        const r = DECK.rotations[act.id]
        const delay = DELAY[Math.abs(r)]
        const lit = hot === act.id
        const rad = (r * Math.PI) / 180
        const lift = `${(LIFT * Math.sin(rad)).toFixed(1)}px ${(-LIFT * Math.cos(rad)).toFixed(1)}px`
        const isCover = act.id === 'cover'
        const Icon = act.icon
        return (
          <button
            key={act.id}
            type='button'
            data-fan-control={act.id}
            data-hot={lit || undefined}
            aria-label={act.label}
            aria-pressed={act.pressed}
            tabIndex={open ? 0 : -1}
            onClick={() => onAction(act.id)}
            className={cn(
              'absolute flex flex-col items-center justify-center gap-2 overflow-hidden rounded-lg text-foreground shadow-lg transition-[rotate,translate,scale,opacity,background-color,box-shadow] motion-reduce:transition-none',
              isCover
                ? 'justify-end bg-cover bg-center pb-2'
                : 'bg-card/85 backdrop-blur-md hover:text-primary',
              open
                ? 'pointer-events-auto duration-[580ms] ease-[cubic-bezier(.3,1.45,.5,1)]'
                : 'opacity-0 duration-200 ease-in',
              act.pressed && 'text-primary',
              isCover
                ? 'data-hot:shadow-[0_0_26px_-4px_var(--media-glow)] data-hot:ring-2 data-hot:ring-primary'
                : HOT
            )}
            style={{
              left: c.x - DECK.w / 2,
              top: c.y - RISE - DECK.h,
              width: DECK.w,
              height: DECK.h,
              zIndex: 3 - Math.abs(r) / 16,
              transformOrigin: ORIGIN,
              rotate: open ? `${r}deg` : '0deg',
              translate: open ? (lit ? lift : '0 0') : '0 84px',
              scale: open ? (lit ? 1.06 : 1) : 0.45,
              transitionDelay: open
                ? `${delay}ms, 0ms, 0ms, ${delay}ms, 0ms, 0ms`
                : '0ms',
              backgroundImage: isCover ? `url(${now.cover})` : undefined,
            }}
          >
            {isCover || !Icon ? (
              <>
                <span
                  aria-hidden
                  className='absolute inset-0 bg-linear-to-b from-transparent from-40% to-background/85'
                />
                <span className='relative text-[10px] font-semibold tabular-nums'>
                  {formatTime(now.elapsed)}
                </span>
                <span className='relative h-0.5 w-10 overflow-hidden rounded-full bg-foreground/25'>
                  <span
                    className='absolute inset-y-0 left-0 bg-primary'
                    style={{ width: `${progress * 100}%` }}
                  />
                </span>
              </>
            ) : (
              <>
                <Icon className='size-5.5' strokeWidth={2} aria-hidden />
                <span className='text-[8.5px] font-semibold tracking-[1.3px] uppercase opacity-85'>
                  {act.label}
                </span>
              </>
            )}
          </button>
        )
      })}
    </div>
  )
}
