/** A press this long, or a swipe this far up, opens the fan instead of toggling. */
export const HOLD_MS = 260
export const SWIPE_PX = 14

export type FanState = {
  open: boolean
  /** The press on the play button; `held` once it stopped being a tap. */
  press: { startY: number; held: boolean } | null
  hot: string | null
  scrubbing: boolean
}

export type FanEvent =
  | { type: 'down'; y: number }
  | { type: 'hold' }
  | {
      type: 'move'
      y: number
      /** The control under the finger. */
      control: string | null
      /** On the dial's scrub zone, outside the controls. */
      rim: boolean
      /** The finger's place along the dial's rim, whatever the zone. */
      fraction: number | null
    }
  | { type: 'up' }
  | { type: 'cancel' }
  | { type: 'open' }
  | { type: 'close' }

export type FanEffect =
  | { type: 'toggle' }
  | { type: 'open' }
  | { type: 'close' }
  | { type: 'fire'; id: string }
  | { type: 'seek'; fraction: number }
  | { type: 'hot'; id: string }

export const FAN_IDLE: FanState = {
  open: false,
  press: null,
  hot: null,
  scrubbing: false,
}

type Step = { state: FanState; effects: FanEffect[] }
const same = (state: FanState): Step => ({ state, effects: [] })
const released = (s: FanState): FanState => ({
  ...s,
  press: null,
  hot: null,
  scrubbing: false,
})

/** The press stopped being a tap: open the fan if it was closed. */
function hold(s: FanState): Step {
  if (!s.press || s.press.held) return same(s)
  const state = { ...s, press: { ...s.press, held: true }, open: true }
  return { state, effects: s.open ? [] : [{ type: 'open' }] }
}

/** The play button's press, hold, slide and release as pure state. */
export function reduceFan(s: FanState, e: FanEvent): Step {
  switch (e.type) {
    case 'down':
      return same({ ...released(s), press: { startY: e.y, held: false } })
    case 'hold':
      return hold(s)
    case 'move': {
      if (!s.press) return same(s)
      if (!s.open) return s.press.startY - e.y > SWIPE_PX ? hold(s) : same(s)
      if (s.scrubbing)
        return e.fraction === null
          ? same(s)
          : { state: s, effects: [{ type: 'seek', fraction: e.fraction }] }
      if (e.rim && e.fraction !== null)
        return {
          state: { ...s, scrubbing: true, hot: null },
          effects: [{ type: 'seek', fraction: e.fraction }],
        }
      if (e.control === s.hot) return same(s)
      return {
        state: { ...s, hot: e.control },
        effects: e.control ? [{ type: 'hot', id: e.control }] : [],
      }
    }
    case 'up': {
      if (!s.press) return same(s)
      if (s.hot)
        return {
          state: { ...released(s), open: false },
          effects: [{ type: 'fire', id: s.hot }, { type: 'close' }],
        }
      if (s.scrubbing || s.press.held) return same(released(s))
      return { state: released(s), effects: [{ type: 'toggle' }] }
    }
    case 'cancel':
      return same(released(s))
    case 'open':
      return s.open
        ? same(s)
        : { state: { ...s, open: true }, effects: [{ type: 'open' }] }
    case 'close':
      return s.open
        ? { state: FAN_IDLE, effects: [{ type: 'close' }] }
        : same(released(s))
  }
}
