import { useCallback, useEffect, useRef, useState } from 'react'
import { debugLog } from '@/lib/debug'
import {
  FAN_IDLE,
  HOLD_MS,
  reduceFan,
  type FanEffect,
  type FanEvent,
  type FanState,
} from './gesture'

/** The kit's lifted nav button; the fan grows out of it. */
export const CENTER_SELECTOR = '[data-slot="nav-bottom-center"]'
const CONTROL = 'data-fan-control'
const RIM = 'data-fan-rim'

export type FanGestureOptions = {
  /** The dial's rim under a client point; looks without a rim leave it out. */
  rimHit?: (
    clientX: number,
    clientY: number
  ) => { inZone: boolean; fraction: number } | null
  onFire: (id: string) => void
  onSeek: (fraction: number) => void
  onOpenChange?: (open: boolean) => void
}

type View = Pick<FanState, 'open' | 'hot' | 'scrubbing'>

/**
 * Eats the one click a held press leaves behind. Armed on that press's
 * release, disarmed by the next press, so a real tap is never swallowed.
 */
export function createClickGate(windowMs = 400) {
  let until = 0
  return {
    arm: (now: number) => {
      until = now + windowMs
    },
    reset: () => {
      until = 0
    },
    take: (now: number) => {
      const eat = now <= until
      until = 0
      return eat
    },
  }
}

const centerOf = (t: EventTarget | null) =>
  t instanceof Element ? t.closest(CENTER_SELECTOR) : null

const buzz = () => {
  if ('vibrate' in navigator) navigator.vibrate(8)
}

/**
 * Press, hold, slide and release on the nav's play button, fed to
 * `reduceFan`. A mouse tap's click goes through to the button untouched; a
 * finger's press is taken at touchstart and its tap clicked on release. Any
 * press that became a hold, a slide or a scrub eats the click after it.
 */
export function useFanGesture(opts: FanGestureOptions) {
  const optsRef = useRef(opts)
  useEffect(() => {
    optsRef.current = opts
  })
  const state = useRef<FanState>(FAN_IDLE)
  const [view, setView] = useState<View>({
    open: false,
    hot: null,
    scrubbing: false,
  })

  const dispatch = useCallback((e: FanEvent): FanEffect[] => {
    const r = reduceFan(state.current, e)
    state.current = r.state
    const { open, hot, scrubbing } = r.state
    setView((v) =>
      v.open === open && v.hot === hot && v.scrubbing === scrubbing
        ? v
        : { open, hot, scrubbing }
    )
    const o = optsRef.current
    for (const fx of r.effects) {
      if (fx.type === 'open' || fx.type === 'hot') buzz()
      if (fx.type === 'open') o.onOpenChange?.(true)
      if (fx.type === 'close') {
        o.onOpenChange?.(false)
        // However it folds, focus on a control goes back to the button.
        if (document.activeElement?.closest(`[${CONTROL}], [${RIM}]`))
          document.querySelector<HTMLElement>(CENTER_SELECTOR)?.focus()
      }
      if (fx.type === 'fire') o.onFire(fx.id)
      if (fx.type === 'seek') o.onSeek(fx.fraction)
    }
    return r.effects
  }, [])

  useEffect(() => {
    let pointer: number | null = null
    let timer = 0
    // A finger's press is taken from the browser, so its tap is ours to click.
    let owned = false
    let tap: HTMLElement | null = null
    const gate = createClickGate()

    // Taking the touch keeps iOS from starting its own long press (text
    // selection, callout, tap highlight), which cancels the press mid-hold.
    const onTouchStart = (e: TouchEvent) => {
      if (!centerOf(e.target)) return
      if (e.cancelable) e.preventDefault()
      owned = true
      debugLog('fan', 'touchstart taken')
    }
    // The click a taken touch no longer gets, inside the touch's own gesture.
    const onTouchEnd = () => {
      const button = tap
      tap = null
      owned = false
      if (!button) return
      button.click()
      // Should the browser click as well, that one is eaten.
      gate.arm(performance.now())
    }

    const onDown = (e: PointerEvent) => {
      const button = centerOf(e.target)
      if (!button || e.button !== 0) return
      gate.reset()
      tap = null
      if (e.pointerType !== 'touch') owned = false
      pointer = e.pointerId
      dispatch({ type: 'down', y: e.clientY })
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        debugLog('fan', 'hold')
        dispatch({ type: 'hold' })
      }, HOLD_MS)
      debugLog('fan', `down ${e.pointerType}`)
      // Document listeners follow the press either way; capture only keeps
      // a mouse that leaves the window.
      try {
        button.setPointerCapture(e.pointerId)
      } catch {
        // No capture for this pointer: the press still runs.
      }
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return
      const under = document.elementFromPoint(e.clientX, e.clientY)
      const control =
        under?.closest(`[${CONTROL}]`)?.getAttribute(CONTROL) ?? null
      const rim = optsRef.current.rimHit?.(e.clientX, e.clientY) ?? null
      const fx = dispatch({
        type: 'move',
        y: e.clientY,
        control,
        rim: Boolean(rim?.inZone) && !control,
        fraction: rim ? rim.fraction : null,
      })
      if (fx.some((f) => f.type === 'open')) window.clearTimeout(timer)
    }
    const end = (type: 'up' | 'cancel') => (e: PointerEvent) => {
      if (e.pointerId !== pointer) return
      pointer = null
      window.clearTimeout(timer)
      const fx = dispatch({ type })
      const toggled = fx.some((f) => f.type === 'toggle')
      debugLog('fan', `${type}${toggled ? ' tap' : ''}`)
      if (type !== 'up') return
      if (!toggled) gate.arm(performance.now())
      else if (owned) tap = document.querySelector<HTMLElement>(CENTER_SELECTOR)
    }
    const onUp = end('up')
    const onCancel = end('cancel')
    const onClick = (e: MouseEvent) => {
      if (!centerOf(e.target) || !gate.take(performance.now())) return
      e.stopPropagation()
      e.preventDefault()
    }
    const onContextMenu = (e: MouseEvent) => {
      if (!centerOf(e.target)) return
      e.preventDefault()
      dispatch({ type: 'open' })
    }

    const opts = { capture: true }
    const active = { capture: true, passive: false }
    document.addEventListener('touchstart', onTouchStart, active)
    document.addEventListener('touchend', onTouchEnd, opts)
    document.addEventListener('touchcancel', onTouchEnd, opts)
    document.addEventListener('pointerdown', onDown, opts)
    document.addEventListener('pointermove', onMove, opts)
    document.addEventListener('pointerup', onUp, opts)
    document.addEventListener('pointercancel', onCancel, opts)
    document.addEventListener('click', onClick, opts)
    document.addEventListener('contextmenu', onContextMenu, opts)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('touchstart', onTouchStart, active)
      document.removeEventListener('touchend', onTouchEnd, opts)
      document.removeEventListener('touchcancel', onTouchEnd, opts)
      document.removeEventListener('pointerdown', onDown, opts)
      document.removeEventListener('pointermove', onMove, opts)
      document.removeEventListener('pointerup', onUp, opts)
      document.removeEventListener('pointercancel', onCancel, opts)
      document.removeEventListener('click', onClick, opts)
      document.removeEventListener('contextmenu', onContextMenu, opts)
    }
  }, [dispatch])

  // The kit's button can't take these as props; set them on the element.
  useEffect(() => {
    for (const b of document.querySelectorAll(CENTER_SELECTOR)) {
      b.setAttribute('aria-haspopup', 'true')
      b.setAttribute('aria-expanded', String(view.open))
      b.setAttribute('aria-description', 'Hold for more controls')
    }
  }, [view.open])

  // Keyboard: ArrowUp on the button opens and focuses the first control;
  // the arrows walk the controls; Escape folds and hands focus back.
  const focusOnOpen = useRef(false)
  useEffect(() => {
    const controls = () => [
      ...document.querySelectorAll<HTMLElement>(`[${CONTROL}]`),
    ]
    const onKey = (e: KeyboardEvent) => {
      const at = e.target instanceof Element ? e.target : null
      if (e.key === 'ArrowUp' && centerOf(at)) {
        e.preventDefault()
        focusOnOpen.current = true
        if (state.current.open) controls()[0]?.focus()
        else dispatch({ type: 'open' })
        return
      }
      if (!state.current.open) return
      if (e.key === 'Escape') {
        dispatch({ type: 'close' })
        return
      }
      const control = at?.closest<HTMLElement>(`[${CONTROL}]`)
      if (!control || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
      e.preventDefault()
      const all = controls()
      const step = e.key === 'ArrowRight' ? 1 : -1
      all[(all.indexOf(control) + step + all.length) % all.length]?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [dispatch])

  useEffect(() => {
    if (!view.open || !focusOnOpen.current) return
    focusOnOpen.current = false
    const frame = requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[${CONTROL}]`)?.focus()
    )
    return () => cancelAnimationFrame(frame)
  }, [view.open])

  const closeFan = useCallback(() => {
    dispatch({ type: 'close' })
  }, [dispatch])
  return { ...view, closeFan }
}
