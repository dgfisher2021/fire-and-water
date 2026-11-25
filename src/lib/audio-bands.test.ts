import { describe, expect, it } from 'vitest'
import {
  BANDS,
  bandLevel,
  binRange,
  createOnset,
  createRange,
  follow,
  stepOnset,
  stepRange,
} from './audio-bands'

describe('audio bands', () => {
  it('maps a band to the bins that cover it', () => {
    // 44.1 kHz over 2048 points: 21.5 Hz a bin.
    expect(binRange(45, 160, 44100, 2048)).toEqual([2, 7])
    expect(binRange(5000, 13000, 44100, 2048)).toEqual([232, 604])
    // Never empty, never the DC bin, never past the spectrum.
    expect(binRange(1, 5, 44100, 2048)).toEqual([1, 2])
    const [from, to] = binRange(20000, 40000, 44100, 2048)
    expect(to).toBeLessThanOrEqual(1024)
    expect(to).toBeGreaterThan(from)
  })

  it('keeps every band in order and inside hearing', () => {
    for (const [lo, hi] of Object.values(BANDS)) {
      expect(lo).toBeGreaterThan(20)
      expect(hi).toBeGreaterThan(lo)
      expect(hi).toBeLessThan(20000)
    }
  })

  it('reads a band as the mean of its bins', () => {
    const bytes = new Uint8Array([0, 255, 255, 0, 0])
    expect(bandLevel(bytes, 1, 3)).toBe(1)
    expect(bandLevel(bytes, 1, 5)).toBe(0.5)
    expect(bandLevel(bytes, 3, 5)).toBe(0)
  })

  it('rises fast and falls slowly', () => {
    const up = follow(0, 1, 1 / 60, 0.015, 0.2)
    const down = follow(1, 0, 1 / 60, 0.015, 0.2)
    expect(up).toBeGreaterThan(0.6)
    expect(down).toBeGreaterThan(0.9)
    expect(follow(0.3, 0.3, 1 / 60, 0.015, 0.2)).toBeCloseTo(0.3)
    expect(follow(0, 1, 1 / 60, 0, 0.2)).toBe(1)
  })

  it('hears a hit on a sharp rise, not in a steady tone', () => {
    const o = createOnset()
    const dt = 1 / 60
    for (let i = 0; i < 120; i++) stepOnset(o, 0.4, dt)
    expect(o.hit).toBeLessThan(0.01)
    expect(stepOnset(o, 0.75, dt)).toBeGreaterThan(0.9)
    // It rings out within a quarter second while the level holds.
    for (let i = 0; i < 15; i++) stepOnset(o, 0.75, dt)
    expect(o.hit).toBeLessThan(0.25)
    // A slow swell is not a hit.
    const slow = createOnset()
    let peak = 0
    for (let i = 0; i < 240; i++)
      peak = Math.max(peak, stepOnset(slow, 0.2 + (i / 240) * 0.5, dt))
    expect(peak).toBeLessThan(0.3)
  })

  it('hears each kick of a four-on-the-floor bar', () => {
    const o = createOnset()
    const dt = 1 / 60
    let hits = 0
    let was = 0
    for (let i = 0; i < 240; i++) {
      const phase = ((i + 15) % 30) / 30
      const hit = stepOnset(o, 0.3 + 0.5 * Math.exp(-phase * 6), dt)
      if (hit > 0.6 && was <= 0.6) hits++
      was = hit
    }
    expect(hits).toBe(8)
  })

  it('stretches a band to its own range', () => {
    const r = createRange()
    const dt = 1 / 60
    let v = 0
    for (let i = 0; i < 600; i++) v = stepRange(r, i % 30 < 4 ? 0.62 : 0.5, dt)
    expect(r.peak).toBeGreaterThan(0.58)
    expect(v).toBeLessThan(0.2)
    expect(stepRange(r, 0.62, dt)).toBeGreaterThan(0.8)
    expect(stepRange(r, 2, dt)).toBe(1)
    expect(stepRange(r, -1, dt)).toBe(0)
  })
})
