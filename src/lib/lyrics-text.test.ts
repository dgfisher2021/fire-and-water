import { describe, expect, it } from 'vitest'
import { lyricsToText } from './lyrics-text'

describe('lyricsToText', () => {
  it('writes the title, then the stanzas separated by blank lines', () => {
    expect(
      lyricsToText({
        title: 'Fire and Water',
        lyrics: [
          ['[Verse 1]', 'You lit the fire', 'inside of me..'],
          ['My words now flow,', 'I’m finally free.'],
        ],
      })
    ).toBe(
      'Fire and Water\n\n[Verse 1]\nYou lit the fire\ninside of me..\n\nMy words now flow,\nI’m finally free.'
    )
  })

  it('leaves no trailing blank line after the last stanza', () => {
    expect(lyricsToText({ title: 'T', lyrics: [['a']] })).toBe('T\n\na')
  })
})
