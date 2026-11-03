import { describe, expect, it } from 'vitest'
import { formatLength } from './format'

describe('formatLength', () => {
  it('reads minutes under an hour and hours with minutes above', () => {
    expect(formatLength(0)).toBe('0 min')
    expect(formatLength(29)).toBe('0 min')
    expect(formatLength(31)).toBe('1 min')
    expect(formatLength(48 * 60 + 10)).toBe('48 min')
    expect(formatLength(60 * 60)).toBe('1 hr')
    expect(formatLength(72 * 60 + 20)).toBe('1 hr 12 min')
    expect(formatLength(6 * 3600 + 59 * 60 + 40)).toBe('7 hr')
  })
})
