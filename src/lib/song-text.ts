import { lyricsToText } from '@dust-ui/ui'
import { sunoStyle } from '@/data/suno-style'
import { TRACKS, writtenDate, type TrackId } from '@/data/tracks'

/**
 * Everything about a song as plain text for the clipboard: the title, the
 * day written, what it is about, the Suno style it was made with, then the
 * lyrics. Parts a song lacks are left out.
 */
export function songText(id: TrackId) {
  const t = TRACKS[id]
  const style = sunoStyle(id)
  const lyrics =
    t.lyrics.length > 0 ? lyricsToText('', t.lyrics).trimStart() : ''
  return [
    `${t.title}\nWritten ${writtenDate(t)}`,
    t.description,
    style && `Style: ${style}`,
    lyrics,
  ]
    .filter(Boolean)
    .join('\n\n')
}
