import { useCallback, useEffect, useRef, useState } from 'react'
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

const centerOf = (t: EventTarget | null) =>
  t instanceof Element ? t.closest(CENTER_SELECTOR) : null

const buzz = () => {
  if ('vibrate' in navigator) navigator.vibrate(8)
}

/**
 * Press, hold, slide and release on the nav's play button, fed to
 * `reduceFan`. A tap's click goes through to the button untouched; any
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
      if (fx.type === 'close') o.onOpenChange?.(false)
      if (fx.type === 'fire') o.onFire(fx.id)
      if (fx.type === 'seek') o.onSeek(fx.fraction)
    }
    return r.effects
  }, [])

  useEffect(() => {
    let pointer: number | null = null
    let timer = 0
    let swallowUntil = 0

    const onDown = (e: PointerEvent) => {
      const button = centerOf(e.target)
      if (!button || e.button !== 0) return
      pointer = e.pointerId
      button.setPointerCapture(e.pointerId)
      dispatch({ type: 'down', y: e.clientY })
      window.clearTimeout(timer)
      timer = window.setTimeout(() => dispatch({ type: 'hold' }), HOLD_MS)
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
      if (type === 'up' && !fx.some((f) => f.type === 'toggle'))
        swallowUntil = performance.now() + 400
    }
    const onUp = end('up')
    const onCancel = end('cancel')
    const onClick = (e: MouseEvent) => {
      if (performance.now() > swallowUntil || !centerOf(e.target)) return
      swallowUntil = 0
      e.stopPropagation()
      e.preventDefault()
    }
    const onContextMenu = (e: MouseEvent) => {
      if (!centerOf(e.target)) return
      e.preventDefault()
      dispatch({ type: 'open' })
    }

    const opts = { capture: true }
    document.addEventListener('pointerdown', onDown, opts)
    document.addEventListener('pointermove', onMove, opts)
    document.addEventListener('pointerup', onUp, opts)
    document.addEventListener('pointercancel', onCancel, opts)
    document.addEventListener('click', onClick, opts)
    document.addEventListener('contextmenu', onContextMenu, opts)
    return () => {
      window.clearTimeout(timer)
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
        const inside = at?.closest(`[${CONTROL}], [role="slider"]`)
        dispatch({ type: 'close' })
        if (inside)
          document.querySelector<HTMLElement>(CENTER_SELECTOR)?.focus()
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

  const openFan = useCallback(() => {
    dispatch({ type: 'open' })
  }, [dispatch])
  const closeFan = useCallback(() => {
    dispatch({ type: 'close' })
  }, [dispatch])
  return { ...view, openFan, closeFan }
}
