import type { Track } from '@/data/tracks'

/**
 * A song's words as plain text for the clipboard: the title, a blank line,
 * then the stanzas separated by blank lines, labels kept in their brackets.
 */
export function lyricsToText(t: Pick<Track, 'title' | 'lyrics'>) {
  const body = t.lyrics.map((lines) => lines.join('\n')).join('\n\n')
  return `${t.title}\n\n${body}`
}
