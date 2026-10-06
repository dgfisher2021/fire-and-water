import { describe, expect, it } from 'vitest'
import { TRACK_ORDER } from '@/data/tracks'
import { PLAY_MODES, nextAfterEnd } from './player'

const first = TRACK_ORDER[0]
const last = TRACK_ORDER[TRACK_ORDER.length - 1]

describe('nextAfterEnd', () => {
  it('plays the album through and stops after the last song', () => {
    expect(nextAfterEnd(first, 'album')).toBe(TRACK_ORDER[1])
    expect(nextAfterEnd(last, 'album')).toBeNull()
  })

  it('repeats the same song', () => {
    expect(nextAfterEnd(first, 'repeat')).toBe(first)
    expect(nextAfterEnd(last, 'repeat')).toBe(last)
  })

  it('shuffles to another song, never the one that just ended', () => {
    expect(nextAfterEnd(first, 'shuffle', () => 0)).toBe(TRACK_ORDER[1])
    expect(nextAfterEnd(first, 'shuffle', () => 0.999999)).toBe(last)
    expect(nextAfterEnd(last, 'shuffle', () => 0.999999)).toBe(
      TRACK_ORDER[TRACK_ORDER.length - 2]
    )
    for (let i = 0; i < 50; i++)
      expect(nextAfterEnd(first, 'shuffle')).not.toBe(first)
  })

  it('offers album, repeat and shuffle, in that order', () => {
    expect(PLAY_MODES).toEqual(['album', 'repeat', 'shuffle'])
  })
})
