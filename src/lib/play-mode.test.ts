import { describe, expect, it } from 'vitest'
import { togglePlayMode } from './play-mode'

describe('togglePlayMode', () => {
  it('turns shuffle on from album order', () => {
    expect(togglePlayMode('album', 'shuffle')).toEqual({
      mode: 'shuffle',
      message: 'Shuffle on',
    })
  })

  it('turns shuffle off back to album order', () => {
    expect(togglePlayMode('shuffle', 'shuffle')).toEqual({
      mode: 'album',
      message: 'Shuffle off',
    })
  })

  it('switches from repeat straight to shuffle', () => {
    expect(togglePlayMode('repeat', 'shuffle')).toEqual({
      mode: 'shuffle',
      message: 'Shuffle on',
    })
  })

  it('switches from shuffle straight to repeat', () => {
    expect(togglePlayMode('shuffle', 'repeat')).toEqual({
      mode: 'repeat',
      message: 'Repeating this song',
    })
  })

  it('turns repeat off back to album order', () => {
    expect(togglePlayMode('repeat', 'repeat')).toEqual({
      mode: 'album',
      message: 'Repeat off',
    })
  })
})
