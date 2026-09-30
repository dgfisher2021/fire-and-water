import { ALBUM, isLyricLabel, type Track } from '@/data/tracks'

/** `[mm:ss.xx]` for line tags, `<mm:ss.xx>` for word tags. */
const stamp = (seconds: number, open = '[', close = ']') => {
  const m = Math.floor(seconds / 60)
  const s = (seconds - m * 60).toFixed(2).padStart(5, '0')
  return `${open}${String(m).padStart(2, '0')}:${s}${close}`
}

/**
 * The song's words as an LRC file: one tagged line per sung line, with
 * enhanced word tags where the timing has them, so the sheet plays along in
 * other players. Null for a song that reads by scroll.
 */
export function toLrc(t: Track): string | null {
  if (!t.timing) return null
  const out = [
    `[ti:${t.title}]`,
    `[ar:${ALBUM.artist}]`,
    `[al:${ALBUM.title}]`,
    `[length:${stamp(t.duration, '', '').slice(0, 5)}]`,
    '',
  ]
  t.lyrics.forEach((stanza, i) => {
    stanza.forEach((line, j) => {
      if (isLyricLabel(line)) return
      const starts = t.timing?.words?.[i]?.[j]
      const text = starts
        ? line
            .split(/\s+/)
            .map((word, k) => `${stamp(starts[k], '<', '>')}${word}`)
            .join(' ')
        : line
      out.push(`${stamp(t.timing!.lines[i][j])}${text}`)
    })
    out.push('')
  })
  return out.join('\n')
}
