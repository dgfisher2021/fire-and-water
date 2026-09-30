import { describe, expect, it } from 'vitest'
import { activePosition, activeWord, type LyricsTiming } from './read-along'

// One stanza, two lines; the second line has word starts a sung word apart.
const timing: LyricsTiming = {
  stanzas: [10],
  lines: [[10, 12]],
  words: [[null, [12, 12.35, 12.7, 13.05]]],
}

describe('activePosition', () => {
  it('cues a line a beat before it is sung', () => {
    expect(activePosition(timing, 11.7)).toEqual({ stanza: 0, line: 1 })
  })
})

describe('activeWord', () => {
  it('is null for a line without word starts', () => {
    expect(activeWord(timing, { stanza: 0, line: 0 }, 10.5)).toBeNull()
  })

  it('stays on the word being sung, not the next one', () => {
    const at = (t: number) => activeWord(timing, { stanza: 0, line: 1 }, t)
    expect(at(11.8)).toBe(-1)
    expect(at(12.1)).toBe(0)
    expect(at(12.3)).toBe(1)
    expect(at(12.75)).toBe(2)
    expect(at(14)).toBe(3)
  })
})
