import { useEffect, useRef, type RefObject } from 'react'
import { debugLog } from '@/lib/debug'
import { createClickGate } from './play-fan/use-fan-gesture'

const LINE = '[data-slot="lyrics-line"]'
/** Longer than the play fan's hold: the pane scrolls, so the touch is not taken. */
export const LINE_HOLD_MS = 450
/** A finger that travels this far is scrolling, not holding. */
const SLOP = 10

/** The stanza and line a lyric line element stands for. */
export function lineAt(target: EventTarget | null) {
  const el =
    target instanceof Element ? target.closest<HTMLElement>(LINE) : null
  if (!el) return null
  const stanza = Number(el.dataset.stanza)
  const line = Number(el.dataset.line)
  return Number.isInteger(stanza) && Number.isInteger(line)
    ? { stanza, line }
    : null
}

/**
 * A held press (or a right click, or the context-menu key) on a lyric line
 * in `pane` calls `onHold`. The press is not taken from the browser, so the
 * pane still scrolls under a moving finger; the lines turn off selection and
 * the iOS callout in CSS instead. The click a held press leaves on release
 * is eaten wherever it lands: on the line it would seek, and on the scrim of
 * the sheet the hold just opened it would close it.
 */
export function useLineHold(
  pane: RefObject<HTMLElement | null>,
  onHold: ((stanza: number, line: number) => void) | undefined
) {
  const handler = useRef(onHold)
  useEffect(() => {
    handler.current = onHold
  })
  const enabled = onHold !== undefined

  useEffect(() => {
    const el = pane.current
    if (!el || !enabled) return
    let timer = 0
    let pointer: number | null = null
    let start = { x: 0, y: 0 }
    // The current press became a hold; cleared by the next press.
    let held = false
    const gate = createClickGate()

    const cancel = () => {
      window.clearTimeout(timer)
      pointer = null
    }
    const fire = (at: { stanza: number; line: number }, how: string) => {
      window.clearTimeout(timer)
      debugLog('line', `${how} ${at.stanza}.${at.line}`)
      handler.current?.(at.stanza, at.line)
    }

    const onAnyDown = () => {
      held = false
      gate.reset()
    }
    const onDown = (e: PointerEvent) => {
      cancel()
      const at = lineAt(e.target)
      if (!at || e.button !== 0) return
      pointer = e.pointerId
      start = { x: e.clientX, y: e.clientY }
      timer = window.setTimeout(() => {
        held = true
        if (e.pointerType === 'touch' && 'vibrate' in navigator)
          navigator.vibrate(8)
        fire(at, 'hold')
      }, LINE_HOLD_MS)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointer || held) return
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > SLOP) cancel()
    }
    const onEnd = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return
      cancel()
      if (held) gate.arm(performance.now())
    }
    const onClick = (e: MouseEvent) => {
      if (!gate.take(performance.now())) return
      e.stopPropagation()
      e.preventDefault()
    }
    // Right click, the context-menu key, and Android's own long press.
    const onContextMenu = (e: MouseEvent) => {
      const at = lineAt(e.target)
      if (!at) return
      e.preventDefault()
      if (!held) fire(at, 'menu')
    }

    const capture = { capture: true }
    document.addEventListener('pointerdown', onAnyDown, capture)
    document.addEventListener('pointerup', onEnd, capture)
    document.addEventListener('pointercancel', onEnd, capture)
    document.addEventListener('click', onClick, capture)
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('contextmenu', onContextMenu)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerdown', onAnyDown, capture)
      document.removeEventListener('pointerup', onEnd, capture)
      document.removeEventListener('pointercancel', onEnd, capture)
      document.removeEventListener('click', onClick, capture)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('contextmenu', onContextMenu)
    }
  }, [pane, enabled])
}
