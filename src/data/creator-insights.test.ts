import { describe, expect, it } from 'vitest'
import { INSIGHTS, styleSongs } from './creator-insights'
import { songsInStyle, sunoStyle } from './suno-style'

const sum = (xs: readonly { songs: number }[]) =>
  xs.reduce((n, x) => n + x.songs, 0)

describe('the creator insights', () => {
  const { topStyles, constellation, rhythm, diversity } = INSIGHTS

  it('print each share as its count over the styled songs', () => {
    for (const { styled, styles } of Object.values(topStyles)) {
      for (const s of styles) {
        expect(Math.round((s.songs / styled) * 100), s.style).toBe(s.percent)
      }
    }
  })

  it('rank the styles from most to fewest songs', () => {
    for (const list of [
      topStyles.allTime.styles,
      topStyles.last30Days.styles,
      constellation,
    ]) {
      const counts = list.map((s) => s.songs)
      expect(counts).toEqual([...counts].sort((a, b) => b - a))
    }
  })

  it('agree on each style’s count across sections', () => {
    for (const s of topStyles.allTime.styles) {
      expect(styleSongs(s.style)).toBe(s.songs)
    }
    for (const s of INSIGHTS.durations) {
      expect(styleSongs(s.style), s.style).toBe(s.songs)
    }
    for (const style of INSIGHTS.relationships.styles) {
      expect(styleSongs(style), style).toBeDefined()
    }
    // The recent window is a slice of the whole catalogue.
    for (const s of topStyles.last30Days.styles) {
      expect(s.songs).toBeLessThanOrEqual(styleSongs(s.style) ?? s.songs)
    }
    expect(topStyles.last30Days.songs).toBe(INSIGHTS.totals.last30Days)
    expect(topStyles.allTime.styled).toBe(diversity.styledSongs)
  })

  it('put a top-three share inside what the unlisted styles allow', () => {
    // 37 styles, 14 drawn; each unlisted one has 1 to 5 songs (the smallest
    // drawn), so the share of all style signals has bounds.
    const top3 = sum(constellation.slice(0, 3))
    const drawn = sum(constellation)
    const unlisted = diversity.recognizedStyles - constellation.length
    const smallest = constellation[constellation.length - 1].songs
    const most = top3 / (drawn + unlisted)
    const least = top3 / (drawn + unlisted * smallest)
    const share = diversity.top3Share / 100
    expect(share).toBeLessThanOrEqual(most + 0.005)
    expect(share).toBeGreaterThanOrEqual(least - 0.005)
  })

  it('add the week bars to the latest-16-weeks total, every week active', () => {
    expect(rhythm.weeks).toHaveLength(rhythm.activeWeeks.of)
    expect(sum(rhythm.weeks)).toBe(rhythm.latestWeeksSongs)
    expect(rhythm.weeks.filter((w) => w.songs > 0)).toHaveLength(
      rhythm.activeWeeks.active
    )
    // Consecutive Mondays, the last one the export's own week.
    const days = rhythm.weeks.map((w) => Date.parse(w.start) / 86_400_000)
    days.slice(1).forEach((d, i) => expect(d - days[i]).toBe(7))
    expect(new Date(rhythm.weeks[0].start).getUTCDay()).toBe(1)
    expect(rhythm.weeks[rhythm.weeks.length - 1].start).toBe(INSIGHTS.asOf)
  })

  it('count the active months, and the months add to the public songs', () => {
    expect(rhythm.months).toHaveLength(rhythm.activeMonths.of)
    const active = rhythm.months.filter((m) => m.songs > 0)
    expect(active).toHaveLength(rhythm.activeMonths.active)
    expect(active).toHaveLength(rhythm.longestMonthlyStreak)
    expect(sum(rhythm.months)).toBe(INSIGHTS.totals.publicSongs)
    for (const e of INSIGHTS.evolution) {
      const month = rhythm.months.find((m) => m.month === e.month)
      expect(month?.songs, e.month).toBe(e.songs)
    }
  })

  it('place the diversity index in its band', () => {
    const third = 100 / diversity.bands.length
    const band =
      diversity.bands[Math.min(2, Math.floor(diversity.index / third))]
    expect(band).toBe(diversity.band)
  })

  it('keep each pair within both styles’ counts', () => {
    for (const p of INSIGHTS.relationships.pairs) {
      const smaller = Math.min(styleSongs(p.a) ?? 0, styleSongs(p.b) ?? 0)
      expect(p.songs).toBeLessThanOrEqual(smaller)
    }
    const counts = INSIGHTS.relationships.pairs.map((p) => p.songs)
    expect(counts).toEqual([...counts].sort((a, b) => b - a))
  })

  it('order each duration as range, middle half and average', () => {
    for (const d of INSIGHTS.durations) {
      const [lo, hi] = d.range
      const [q1, q3] = d.middle
      expect(lo).toBeLessThanOrEqual(q1)
      expect(q1).toBeLessThanOrEqual(d.average)
      expect(d.average).toBeLessThanOrEqual(q3)
      expect(q3).toBeLessThanOrEqual(hi)
      expect(hi).toBeLessThanOrEqual(420)
    }
  })
})

describe('songsInStyle', () => {
  it('finds album songs whose Suno style names the style', () => {
    const cinematic = songsInStyle('Cinematic')
    expect(cinematic.length).toBeGreaterThan(0)
    for (const id of cinematic) expect(sunoStyle(id)).toMatch(/cinematic/i)
  })

  it('matches whole words only', () => {
    for (const id of songsInStyle('Pop')) {
      expect(sunoStyle(id)).toMatch(/\bpop\b/i)
    }
    expect(songsInStyle('Alternative Pop').length).toBeLessThanOrEqual(
      songsInStyle('Pop').length
    )
  })
})
