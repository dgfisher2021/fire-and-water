import { describe, expect, it } from 'vitest'
import { createClickGate } from './use-fan-gesture'

describe('createClickGate', () => {
  it('eats the click that follows a held press', () => {
    const gate = createClickGate()
    gate.arm(1000)
    expect(gate.take(1100)).toBe(true)
    expect(gate.take(1150)).toBe(false)
  })

  it('a new press disarms it, so a real tap soon after a hold goes through', () => {
    const gate = createClickGate()
    gate.arm(1000)
    gate.reset()
    expect(gate.take(1100)).toBe(false)
  })

  it('expires on its own', () => {
    const gate = createClickGate()
    gate.arm(1000)
    expect(gate.take(1500)).toBe(false)
  })
})
