import { describe, expect, it } from 'vitest'
import { fanElapsed } from './now'

describe('fanElapsed', () => {
  it('reads the loaded song in whole seconds, so the fan re-renders once a second', () => {
    expect(fanElapsed({ track: 'fire', currentTime: 12.7 }, 'fire')).toBe(12)
    expect(fanElapsed({ track: 'fire', currentTime: 12.2 }, 'fire')).toBe(12)
  })

  it('keeps reading while the fan folds (no flash to 0:00 on close)', () => {
    // No `open` argument: the value does not depend on the fan being open.
    expect(fanElapsed.length).toBe(2)
  })

  it('shows 0 for a song that is not the loaded one', () => {
    expect(fanElapsed({ track: 'water', currentTime: 40 }, 'fire')).toBe(0)
    expect(fanElapsed({ track: null, currentTime: 0 }, 'fire')).toBe(0)
  })
})
