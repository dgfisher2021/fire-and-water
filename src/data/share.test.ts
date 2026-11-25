import { KINETIC_SONGS } from '@/kinetic/songs'
import { describe, expect, it } from 'vitest'
import share from './share.json'
import { TRACKS, TRACK_ORDER } from './tracks'

const images = Object.keys(import.meta.glob('../../public/assets/og/*.jpg'))

// scripts/share-data.py writes share.json and the preview images; a new
// song needs a re-run, or its link previews as the album.
describe('share previews', () => {
  it('lists every song in album order with its title and description', () => {
    expect(share.map((s) => s.id)).toEqual([...TRACK_ORDER])
    for (const song of share) {
      const track = TRACKS[song.id as keyof typeof TRACKS]
      expect(song.title).toBe(track.title)
      expect(song.description).toBe(track.description)
    }
  })

  it('has a preview image for every song', () => {
    for (const song of share)
      expect(images, song.id).toContain(`../../public/assets/og/${song.id}.jpg`)
  })

  it('marks the songs with a kinetic film', () => {
    expect(share.filter((s) => s.film).map((s) => s.id)).toEqual(
      Object.keys(KINETIC_SONGS)
    )
  })
})
