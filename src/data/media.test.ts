import { describe, expect, it } from 'vitest'
import { HOOKS } from './hooks'
import versions from './media.json'
import { TRACKS, TRACK_ORDER } from './tracks'

const VERSIONS: Record<string, string> = versions
const inPublic = new Set(
  Object.keys(import.meta.glob('../../public/**/*.{m4a,mp3,mp4}')).map((p) =>
    p.replace('../../public/', '')
  )
)

describe('media.json', () => {
  it('versions every song and hook video, so each loads from the CDN', () => {
    for (const id of TRACK_ORDER)
      expect(VERSIONS[TRACKS[id].audioFile], TRACKS[id].audioFile).toMatch(
        /^[0-9a-f]{10}$/
      )
    for (const hook of Object.values(HOOKS))
      expect(VERSIONS[hook.src], hook.src).toMatch(/^[0-9a-f]{10}$/)
  })

  it('lists exactly the media files in public/', () => {
    expect(new Set(Object.keys(VERSIONS))).toEqual(inPublic)
  })
})
