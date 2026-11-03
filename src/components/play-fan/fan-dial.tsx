import { useEffect, useId, useRef, useState, type PointerEvent } from 'react'
import { animate } from 'motion'
import { formatTime } from '@dust-ui/ui'
import { cn } from '@/lib/utils'
import { arcPath, bandPath, DIAL, dialHit, polar } from './geometry'
import type { FanViewProps } from './types'

/** Half-angle of the open band: from the apex out to 172° and 8°. */
const REACH = DIAL.from - 90
const BOX = { w: DIAL.outer * 2, h: DIAL.outer + 40 }
const L = { x: DIAL.outer, y: DIAL.outer }
/** The rim's hit area reaches the scrub zone's outer edge, past the glass. */
const HIT = { w: DIAL.zone.max * 2, h: DIAL.zone.max + 48 }
const H = { x: DIAL.zone.max, y: DIAL.zone.max }

const HOT =
  'data-hot:scale-115! data-hot:bg-linear-to-br data-hot:from-track-bright data-hot:to-track-deep data-hot:text-track-foreground data-hot:shadow-[0_0_24px_-2px_var(--media-glow)]'

/** The band's place under a pointer, in its own (unscaled) px. */
function hitOf(el: HTMLElement, e: PointerEvent) {
  const r = el.getBoundingClientRect()
  const k = el.offsetWidth ? r.width / el.offsetWidth : 1
  return dialHit(H, { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k })
}

/**
 * The Dial: a glass half-ring over the play button. The controls sit in
 * it and the song's progress runs along its rim, which scrubs.
 */
export function FanDial({
  open,
  reduced,
  center: c,
  actions,
  hot,
  scrubbing,
  now,
  onAction,
  onSeek,
}: FanViewProps) {
  const [sweep, setSweep] = useState(0)
  const sweepRef = useRef(0)
  const [dragging, setDragging] = useState(false)
  const gradient = `dial-${useId().replace(/[^\w-]/g, '')}`

  // The band sweeps out from the apex on an overshoot, and folds back fast.
  useEffect(() => {
    const to = open ? 1 : 0
    const a = animate(sweepRef.current, to, {
      duration: reduced ? 0 : open ? 0.54 : 0.2,
      ease: open ? [0.34, 1.45, 0.64, 1] : [0.4, 0, 1, 1],
      onUpdate: (v) => {
        sweepRef.current = v
        setSweep(v)
      },
    })
    return () => a.stop()
  }, [open, reduced])

  const h = Math.max(0.5, Math.min(1.04, sweep) * REACH)
  const a = 90 + h
  const b = 90 - h
  const band = bandPath(L, DIAL.outer, DIAL.inner, a, b)
  const mask = `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${BOX.w}' height='${BOX.h}'><path d='${band}'/></svg>`
  )}")`
  const shown = sweep > 0.01
  const settled = sweep > 0.97
  const progress =
    now.duration > 0 ? Math.min(1, now.elapsed / now.duration) : 0
  const at = DIAL.from - progress * (DIAL.from - DIAL.to)
  const thumb = polar(L, DIAL.rim, at)
  const apex = polar(c, DIAL.mid, 90)

  return (
    <div
      data-slot='fan-dial'
      className={cn(
        'pointer-events-none absolute inset-0 transition-transform motion-reduce:transition-none',
        open
          ? 'duration-500 ease-[cubic-bezier(.34,1.4,.64,1)]'
          : 'scale-[.62] duration-200 ease-in'
      )}
      style={{ transformOrigin: `${c.x}px ${c.y}px` }}
    >
      <div
        className='absolute'
        style={{
          left: c.x - DIAL.outer,
          top: c.y - DIAL.outer,
          width: BOX.w,
          height: BOX.h,
        }}
      >
        <div
          data-slot='fan-dial-band'
          aria-hidden
          className={cn(
            'absolute inset-0 bg-card/85 backdrop-blur-md',
            shown ? 'visible' : 'invisible'
          )}
          // The mask shapes the frost; clip-path alone frosts the whole box
          // in Chrome.
          style={{
            maskImage: mask,
            WebkitMaskImage: mask,
            maskSize: '100% 100%',
            WebkitMaskSize: '100% 100%',
          }}
        />
        <svg
          aria-hidden
          className='pointer-events-none absolute inset-0 overflow-visible'
          width={BOX.w}
          height={BOX.h}
        >
          <defs>
            <linearGradient id={gradient}>
              <stop offset='0' style={{ stopColor: 'var(--track-bright)' }} />
              <stop offset='1' style={{ stopColor: 'var(--track-deep)' }} />
            </linearGradient>
          </defs>
          {shown && (
            <path d={band} className='fill-none stroke-foreground/15' />
          )}
          {sweep > 0.05 && (
            <path
              d={arcPath(L, DIAL.rim, a, b)}
              className='fill-none stroke-foreground/15'
              strokeWidth={3}
              strokeLinecap='round'
            />
          )}
          {sweep > 0.05 && at < a && (
            <path
              d={arcPath(L, DIAL.rim, a, Math.max(at, b))}
              fill='none'
              stroke={`url(#${gradient})`}
              strokeWidth={3}
              strokeLinecap='round'
              className='drop-shadow-[0_0_4px_var(--media-glow)]'
            />
          )}
          <circle
            cx={thumb.x}
            cy={thumb.y}
            r={scrubbing || dragging ? 8 : 5.5}
            className={cn(
              'fill-foreground drop-shadow-[0_0_6px_var(--media-glow)] transition-opacity motion-reduce:transition-none',
              settled ? 'opacity-100' : 'opacity-0'
            )}
          />
        </svg>
      </div>

      <div
        role='slider'
        data-fan-rim=''
        aria-label='Seek'
        aria-valuemin={0}
        aria-valuemax={Math.round(now.duration)}
        aria-valuenow={Math.round(now.elapsed)}
        aria-valuetext={formatTime(now.elapsed)}
        tabIndex={open ? 0 : -1}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
          e.preventDefault()
          const to = now.elapsed + (e.key === 'ArrowRight' ? 5 : -5)
          onSeek(Math.min(1, Math.max(0, to / now.duration)))
        }}
        className={cn(
          'absolute touch-none',
          shown ? 'visible' : 'invisible',
          open && 'pointer-events-auto'
        )}
        style={{
          left: c.x - DIAL.zone.max,
          top: c.y - DIAL.zone.max,
          width: HIT.w,
          height: HIT.h,
          clipPath: `path('${bandPath(H, DIAL.zone.max, DIAL.inner, a, b)}')`,
        }}
        onPointerDown={(e) => {
          const hit = hitOf(e.currentTarget, e)
          if (!hit.inZone) return
          e.currentTarget.setPointerCapture(e.pointerId)
          setDragging(true)
          onSeek(hit.fraction)
        }}
        onPointerMove={(e) => {
          if (dragging) onSeek(hitOf(e.currentTarget, e).fraction)
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      />

      <p
        className={cn(
          'absolute inset-x-0 truncate px-6 text-center font-display text-[19px] font-semibold text-foreground transition-opacity [text-shadow:0_1px_2px_var(--background),0_2px_14px_var(--background)] motion-reduce:transition-none',
          settled ? 'opacity-100 delay-150' : 'opacity-0'
        )}
        style={{ top: c.y - DIAL.outer - 34 }}
      >
        {now.title}
      </p>
      <p
        className={cn(
          'absolute w-20 -translate-x-1/2 -translate-y-1/2 text-center tabular-nums transition-opacity motion-reduce:transition-none',
          settled ? 'opacity-100 delay-150' : 'opacity-0'
        )}
        style={{ left: apex.x, top: apex.y }}
      >
        <span className='block text-[16px] font-semibold tracking-[0.5px] text-foreground'>
          {formatTime(now.elapsed)}
        </span>
        <span className='block text-[10px] text-muted-foreground'>
          -{formatTime(Math.max(0, now.duration - now.elapsed))}
        </span>
      </p>

      {actions.map((act) => {
        const angle = DIAL.controls[act.id as keyof typeof DIAL.controls]
        const p = polar(c, DIAL.mid, angle)
        const Icon = act.icon
        return (
          <button
            key={act.id}
            type='button'
            data-fan-control={act.id}
            data-shown={h >= Math.abs(90 - angle) + 6 || undefined}
            data-hot={hot === act.id || undefined}
            aria-label={act.label}
            aria-pressed={act.pressed}
            tabIndex={open ? 0 : -1}
            onClick={() => onAction(act.id)}
            className={cn(
              'absolute grid size-11 -translate-x-1/2 -translate-y-1/2 scale-50 place-items-center rounded-full text-foreground opacity-0 transition-[opacity,scale,background-color,color] duration-300 ease-[cubic-bezier(.34,1.56,.64,1)] hover:bg-foreground/10 data-shown:scale-100 data-shown:opacity-100 motion-reduce:transition-none',
              act.pressed && 'text-primary',
              HOT,
              open && 'pointer-events-auto'
            )}
            style={{ left: p.x, top: p.y }}
          >
            <Icon className='size-5' strokeWidth={2} aria-hidden />
          </button>
        )
      })}
    </div>
  )
}
