import { describe, expect, it } from 'vitest'
import { filterTracks, matchesTrack } from './search'

const songs = {
  espoir: { title: 'Vagues d’Espoir', dedication: 'Pour Alex', voice: 'Café' },
  fire: { title: 'Fire & Water', dedication: 'For Alex', voice: 'Baritone' },
  dust: { title: 'Dust I Become', dedication: 'For Dustin', voice: 'Grit' },
}

describe('matchesTrack', () => {
  it('matches everything on an empty or blank query', () => {
    expect(matchesTrack(songs.fire, '')).toBe(true)
    expect(matchesTrack(songs.fire, '   ')).toBe(true)
  })

  it('ignores case and accents', () => {
    expect(matchesTrack(songs.espoir, 'ESPOIR')).toBe(true)
    expect(matchesTrack(songs.espoir, 'cafe')).toBe(true)
  })

  it('searches the dedication and the voice too', () => {
    expect(matchesTrack(songs.dust, 'dustin')).toBe(true)
    expect(matchesTrack(songs.dust, 'grit')).toBe(true)
  })

  it('needs every word of the query somewhere', () => {
    expect(matchesTrack(songs.fire, 'fire alex')).toBe(true)
    expect(matchesTrack(songs.fire, 'fire dustin')).toBe(false)
  })
})

describe('filterTracks', () => {
  it('keeps the album order and only the matches', () => {
    const order = ['espoir', 'fire', 'dust'] as const
    const lookup = (id: (typeof order)[number]) => songs[id]
    expect(filterTracks(order, lookup, 'alex')).toEqual(['espoir', 'fire'])
    expect(filterTracks(order, lookup, '')).toEqual([...order])
  })
})
