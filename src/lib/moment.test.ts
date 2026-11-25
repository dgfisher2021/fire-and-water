import { describe, expect, it } from 'vitest'
import { TRACKS } from '@/data/tracks'
import {
  formatMoment,
  momentParam,
  momentText,
  momentTime,
  momentUrl,
  parseMoment,
} from './moment'

const SHEET = [
  ['[Verse 1]', 'First line', 'Second line'],
  ['Third line', 'Fourth line'],
]
const TIMING = {
  stanzas: [10, 30],
  lines: [[10, 10, 14], [30]],
}

describe('momentParam', () => {
  it('takes stanza-line counted from 1', () => {
    for (const ok of ['1-1', '3-10', '12-4', '999-999'])
      expect(momentParam.safeParse(ok).success).toBe(true)
  })

  it('refuses anything else', () => {
    for (const bad of ['', '0-1', '1-0', '1.2', '1-', '-2', '1-2-3', 'a-b'])
      expect(momentParam.safeParse(bad).success).toBe(false)
    expect(momentParam.safeParse(3.1).success).toBe(false)
  })
})

describe('parseMoment', () => {
  it('reads a line of the sheet', () => {
    expect(parseMoment('1-2', SHEET)).toEqual({ stanza: 0, line: 1 })
    expect(parseMoment('2-2', SHEET)).toEqual({ stanza: 1, line: 1 })
  })

  it('drops a label, a line past the sheet and a bad value', () => {
    expect(parseMoment('1-1', SHEET)).toBeNull()
    expect(parseMoment('1-4', SHEET)).toBeNull()
    expect(parseMoment('3-1', SHEET)).toBeNull()
    expect(parseMoment('first', SHEET)).toBeNull()
    expect(parseMoment(undefined, SHEET)).toBeNull()
  })

  it('round-trips through formatMoment', () => {
    const moment = { stanza: 1, line: 0 }
    expect(formatMoment(moment)).toBe('2-1')
    expect(parseMoment(formatMoment(moment), SHEET)).toEqual(moment)
  })
})

describe('momentText', () => {
  it('gives the words, never a label', () => {
    expect(momentText(SHEET, { stanza: 0, line: 2 })).toBe('Second line')
    expect(momentText(SHEET, { stanza: 0, line: 0 })).toBeNull()
    expect(momentText(SHEET, { stanza: 5, line: 0 })).toBeNull()
  })
})

describe('momentTime', () => {
  it('is the line start, or the stanza start for an untimed line', () => {
    expect(momentTime(TIMING, { stanza: 0, line: 2 })).toBe(14)
    expect(momentTime(TIMING, { stanza: 1, line: 1 })).toBe(30)
  })

  it('is null without timing', () => {
    expect(momentTime(undefined, { stanza: 0, line: 1 })).toBeNull()
    expect(momentTime(TIMING, { stanza: 4, line: 0 })).toBeNull()
  })

  it('finds a chorus line of a timed song inside the song', () => {
    const t = TRACKS.lift
    const moment = parseMoment('4-2', t.lyrics)
    expect(moment).not.toBeNull()
    const at = momentTime(t.timing, moment!)
    expect(at).toBeGreaterThan(0)
    expect(at).toBeLessThan(t.duration)
  })
})

describe('momentUrl', () => {
  it('keeps the base path and the song path a preview page is served at', () => {
    expect(
      momentUrl('lift', { stanza: 3, line: 1 }, 'https://example.test/')
    ).toBe('https://example.test/lyrics/lift?line=4-2')
    expect(
      momentUrl('fire', { stanza: 0, line: 1 }, 'https://example.test/app/')
    ).toBe('https://example.test/app/lyrics/fire?line=1-2')
  })
})
