import { describe, expect, it } from 'vitest'
import catalog from './suno-catalog.json'

const { songs } = catalog

describe('the Suno catalogue', () => {
  it('numbers the songs 1..n, newest first', () => {
    expect(songs.map((s) => s.id)).toEqual(songs.map((_, i) => i + 1))
    for (let i = 1; i < songs.length; i++)
      expect(songs[i - 1].date >= songs[i].date).toBe(true)
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

  it('is all published, in batches that never go backwards', () => {
    for (let i = 1; i < songs.length; i++)
      expect(songs[i].batch).toBeGreaterThanOrEqual(songs[i - 1].batch)
    expect(new Set(songs.map((s) => s.status))).toEqual(new Set(['Published']))
  })
})
