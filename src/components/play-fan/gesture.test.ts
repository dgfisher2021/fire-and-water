import { describe, expect, it } from 'vitest'
import {
  FAN_IDLE,
  reduceFan,
  type FanEffect,
  type FanEvent,
  type FanState,
} from './gesture'

const move = (
  y: number,
  over: { control?: string; rim?: boolean; fraction?: number } = {}
): FanEvent => ({
  type: 'move',
  y,
  control: over.control ?? null,
  rim: over.rim ?? false,
  fraction: over.fraction ?? null,
})

/** Feeds events in order; returns the last state and each event's effects. */
function run(events: FanEvent[], from: FanState = FAN_IDLE) {
  let state = from
  const effects: FanEffect[][] = []
  for (const e of events) {
    const r = reduceFan(state, e)
    state = r.state
    effects.push(r.effects)
  }
  return { state, effects }
}

const held = run([{ type: 'down', y: 100 }, { type: 'hold' }]).state
const sticky = run([
  { type: 'down', y: 100 },
  { type: 'hold' },
  { type: 'up' },
]).state

describe('reduceFan', () => {
  it('tap toggles and never opens', () => {
    const { state, effects } = run([{ type: 'down', y: 100 }, { type: 'up' }])
    expect(effects).toEqual([[], [{ type: 'toggle' }]])
    expect(state.open).toBe(false)
  })

  it('hold opens without toggling', () => {
    const { state, effects } = run([
      { type: 'down', y: 100 },
      { type: 'hold' },
      { type: 'up' },
    ])
    expect(effects).toEqual([[], [{ type: 'open' }], []])
    expect(state.open).toBe(true)
    expect(state.press).toBeNull()
  })

  it('swipe up 15px opens', () => {
    expect(run([{ type: 'down', y: 100 }, move(85)]).effects[1]).toEqual([
      { type: 'open' },
    ])
    expect(run([{ type: 'down', y: 100 }, move(87)]).effects[1]).toEqual([])
  })

  it('slide onto a control lights it; release fires and folds', () => {
    const { state, effects } = run(
      [move(60, { control: 'next' }), { type: 'up' }],
      held
    )
    expect(effects).toEqual([
      [{ type: 'hot', id: 'next' }],
      [{ type: 'fire', id: 'next' }, { type: 'close' }],
    ])
    expect(state.open).toBe(false)
    expect(state.hot).toBeNull()
  })

  it('release on nothing stays open', () => {
    const { state, effects } = run(
      [move(60, { control: 'next' }), move(90), { type: 'up' }],
      held
    )
    expect(effects[2]).toEqual([])
    expect(state.open).toBe(true)
  })

  it('tap while open toggles and stays open', () => {
    const { state, effects } = run(
      [{ type: 'down', y: 100 }, { type: 'up' }],
      sticky
    )
    expect(effects[1]).toEqual([{ type: 'toggle' }])
    expect(state.open).toBe(true)
  })

  it('rim scrub keeps scrubbing over a control', () => {
    const { state, effects } = run(
      [
        move(40, { rim: true, fraction: 0.3 }),
        move(50, { control: 'next', fraction: 0.6 }),
        { type: 'up' },
      ],
      held
    )
    expect(effects).toEqual([
      [{ type: 'seek', fraction: 0.3 }],
      [{ type: 'seek', fraction: 0.6 }],
      [],
    ])
    expect(state.open).toBe(true)
    expect(state.scrubbing).toBe(false)
    expect(state.hot).toBeNull()
  })

  it('cancel mid-press does nothing', () => {
    const { state, effects } = run([
      { type: 'down', y: 100 },
      { type: 'cancel' },
      { type: 'up' },
    ])
    expect(effects).toEqual([[], [], []])
    expect(state.open).toBe(false)
  })

  it('cancel while sliding keeps it open and clears hot', () => {
    const { state, effects } = run(
      [move(60, { control: 'next' }), { type: 'cancel' }, { type: 'up' }],
      held
    )
    expect(effects[1]).toEqual([])
    expect(effects[2]).toEqual([])
    expect(state.open).toBe(true)
    expect(state.hot).toBeNull()
  })

  it('close clears hot and the scrub, and a later release does nothing', () => {
    const scrubbing = run([move(40, { rim: true, fraction: 0.3 })], held).state
    const { state, effects } = run(
      [{ type: 'close' }, { type: 'up' }],
      scrubbing
    )
    expect(effects).toEqual([[{ type: 'close' }], []])
    expect(state).toEqual(FAN_IDLE)
  })

  it('close when closed emits nothing', () => {
    expect(reduceFan(FAN_IDLE, { type: 'close' }).effects).toEqual([])
  })

  it('open from outside (keyboard) is idempotent', () => {
    const once = reduceFan(FAN_IDLE, { type: 'open' })
    expect(once.effects).toEqual([{ type: 'open' }])
    expect(reduceFan(once.state, { type: 'open' }).effects).toEqual([])
  })
})
