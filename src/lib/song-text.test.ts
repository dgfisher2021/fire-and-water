import { describe, expect, it } from 'vitest'
import { sunoStyle } from '@/data/suno-style'
import { TRACKS, TRACK_ORDER, writtenDate } from '@/data/tracks'
import { songText } from './song-text'

describe('songText', () => {
  it('reads title, date, description, style, then the lyrics', () => {
    const t = TRACKS.fire
    const text = songText('fire')
    const style = sunoStyle('fire')
    expect(style).toBeTruthy()
    expect(text.startsWith(`${t.title}\nWritten ${writtenDate(t)}\n\n`)).toBe(
      true
    )
    const at = (part: string) => text.indexOf(part)
    expect(at(t.description)).toBeGreaterThan(0)
    expect(at(`Style: ${style}`)).toBeGreaterThan(at(t.description))
    expect(at(t.lyrics[0][0])).toBeGreaterThan(at(`Style: ${style}`))
    expect(text.endsWith(t.lyrics.at(-1)!.at(-1)!)).toBe(true)
  })

  it('leaves out what a song lacks, with no empty paragraphs', () => {
    for (const id of TRACK_ORDER) {
      const text = songText(id)
      expect(text).not.toMatch(/\n{3,}/)
      expect(text.includes('Style:')).toBe(Boolean(sunoStyle(id)))
    }
  })
})
