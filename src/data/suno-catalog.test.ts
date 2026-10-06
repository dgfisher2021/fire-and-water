import { describe, expect, it } from 'vitest'
import catalog from './suno-catalog.json'
import { TRACKS, TRACK_ORDER, type TrackId } from './tracks'

const { songs } = catalog
// The log from the library screenshots, newest first; the rest are album
// songs the log never showed.
const library = songs.filter((s) => !('source' in s && s.source === 'app'))

describe('the Suno catalogue', () => {
  it('numbers the songs 1..n, the library newest first', () => {
    expect(songs.map((s) => s.id)).toEqual(songs.map((_, i) => i + 1))
    for (let i = 1; i < library.length; i++)
      expect(library[i - 1].date >= library[i].date).toBe(true)
  })

  it('gives every song an ISO date whose weekday matches', () => {
    for (const s of songs) {
      expect(s.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      const weekday = new Date(`${s.date}T12:00:00`).toLocaleString('en-US', {
        weekday: 'long',
      })
      expect(weekday, `${s.id} ${s.title}`).toBe(s.weekday)
    }
  })

  it('agrees with itself on each duration', () => {
    for (const s of songs) {
      const [m, sec] = s.duration.split(':').map(Number)
      expect(m * 60 + sec, `${s.id} ${s.title}`).toBe(s.durationSeconds)
    }
  })

  it('is all published, the library in batches that never go backwards', () => {
    for (let i = 1; i < library.length; i++)
      expect(library[i].batch).toBeGreaterThanOrEqual(library[i - 1].batch!)
    expect(new Set(songs.map((s) => s.status))).toEqual(new Set(['Published']))
  })

  it('names every album song exactly once, with its description and file', () => {
    const inApp = songs.filter((s) => s.addedToApp)
    expect(inApp.map((s) => s.appId).sort()).toEqual([...TRACK_ORDER].sort())
    for (const s of songs) {
      expect(s.addedToApp).toBe(s.appId !== null)
      if (s.appId === null) {
        expect(s.description).toBeNull()
        expect(s.files.app).toBeNull()
        continue
      }
      const t = TRACKS[s.appId as TrackId]
      expect(s.description).toBe(t.description)
      expect(s.files.app).toBe(`public/${t.audioFile}`)
      // The length agrees with the album's within a few seconds.
      expect(Math.abs(s.durationSeconds - t.duration), s.title).toBeLessThan(6)
    }
  })
})
