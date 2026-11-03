import { describe, expect, it } from 'vitest'
import { arcPath, bandPath, dialFraction, dialHit, polar } from './geometry'

const c = { x: 170, y: 388 }
const r1 = (n: number) => Math.round(n * 10) / 10

describe('polar', () => {
  it('puts 90 degrees straight up (screen y grows down)', () => {
    const p = polar({ x: 0, y: 0 }, 100, 90)
    expect(p.x).toBeCloseTo(0)
    expect(p.y).toBeCloseTo(-100)
  })

  it('puts 0 degrees at 3 o’clock', () => {
    const p = polar(c, 100, 0)
    expect(p.x).toBeCloseTo(270)
    expect(p.y).toBeCloseTo(388)
  })
})

describe('dialFraction', () => {
  it('runs from 0 at 172 degrees to 1 at 8 degrees', () => {
    expect(dialFraction(172)).toBe(0)
    expect(dialFraction(8)).toBe(1)
    expect(dialFraction(90)).toBe(0.5)
  })

  it('clamps past either end', () => {
    expect(dialFraction(180)).toBe(0)
    expect(dialFraction(0)).toBe(1)
  })
})

describe('dialHit', () => {
  it('reads the rim at the apex as halfway through', () => {
    expect(dialHit(c, polar(c, 143, 90))).toEqual({
      inZone: true,
      fraction: 0.5,
    })
  })

  it('ignores points inside the controls’ ring, beyond the rim, or past its ends', () => {
    expect(dialHit(c, polar(c, 110, 90)).inZone).toBe(false)
    expect(dialHit(c, polar(c, 170, 90)).inZone).toBe(false)
    expect(dialHit(c, polar(c, 143, 179)).inZone).toBe(false)
  })
})

describe('bandPath', () => {
  it('traces the outer arc, a cap, the inner arc back and a cap', () => {
    const d = bandPath(c, 152, 94, 172, 8)
    const start = polar(c, 152, 172)
    expect(d.startsWith(`M${r1(start.x)} ${r1(start.y)} `)).toBe(true)
    expect(d).toContain('A152 152 0 0 1')
    expect(d).toContain('A94 94 0 0 0')
    expect(d).toContain('A29 29 0 0 1')
    expect(d.endsWith('Z')).toBe(true)
  })
})

describe('arcPath', () => {
  it('draws clockwise over the top', () => {
    expect(arcPath(c, 143, 172, 90)).toMatch(
      /^M[\d.-]+ [\d.-]+ A143 143 0 0 1 [\d.-]+ [\d.-]+$/
    )
  })
})
