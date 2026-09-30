import { describe, expect, it } from 'vitest'
import sizes from './audio-sizes.json'
import { TRACKS, TRACK_ORDER, comparePartner, isLyricLabel } from './tracks'

// File names only: the files are never imported, just found.
const audio = Object.keys(import.meta.glob('../../public/*.{m4a,mp3}'))
const art = Object.keys(import.meta.glob('../../public/assets/*.webp'))
const sheets = Object.keys(import.meta.glob('./lyrics/*.json'))
const exists = (files: string[], name: string) =>
  files.some((f) => f.endsWith(`/${name}`))

describe('the album', () => {
  it('lists every song once', () => {
    expect(new Set(TRACK_ORDER).size).toBe(TRACK_ORDER.length)
    expect([...TRACK_ORDER].sort()).toEqual(Object.keys(TRACKS).sort())
  })

  it('has a lyric sheet for every song and no stray sheets', () => {
    for (const sheet of sheets) {
      const id = sheet.replace(/^.*\//, '').replace(/\.json$/, '')
      expect(TRACK_ORDER, sheet).toContain(id)
    }
    for (const id of TRACK_ORDER)
      expect(TRACKS[id].lyrics.length, `${id} has no lyrics`).toBeGreaterThan(0)
  })

  it('pairs every song with another one', () => {
    for (const id of TRACK_ORDER) {
      const partner = comparePartner(id)
      expect(partner).not.toBe(id)
      expect(TRACKS[partner]).toBeDefined()
    }
  })
})

describe.each(TRACK_ORDER)('%s', (id) => {
  const t = TRACKS[id]

  it('points at audio and art that exist', () => {
    expect(exists(audio, t.audioFile), t.audioFile).toBe(true)
    expect(exists(art, t.art.full.replace('assets/', '')), t.art.full).toBe(
      true
    )
    expect(exists(art, t.art.thumb.replace('assets/', '')), t.art.thumb).toBe(
      true
    )
  })

  it('has a download size on record', () => {
    expect((sizes as Record<string, number>)[t.audioFile]).toBeGreaterThan(0)
  })

  it('times every line of its sheet, or none', () => {
    if (!t.timing) return
    expect(t.timing.stanzas).toHaveLength(t.lyrics.length)
    expect(t.timing.lines).toHaveLength(t.lyrics.length)
    t.lyrics.forEach((stanza, i) => {
      expect(t.timing?.lines[i], `stanza ${i}`).toHaveLength(stanza.length)
    })
  })

  it('has at least one sung line per stanza', () => {
    for (const stanza of t.lyrics)
      expect(stanza.some((line) => !isLyricLabel(line))).toBe(true)
  })
})
