/**
 * Start times in seconds: one per stanza, one per line within each stanza,
 * and, for a line the aligner heard, one per whitespace-split word (null
 * where a line lights as a whole).
 */
export type LyricsTiming = {
  stanzas: number[]
  lines: number[][]
  words?: (number[] | null)[][]
}

export type LyricsPosition = { stanza: number; line: number }

/**
 * Highlighting runs slightly ahead of the audio so the cue lands as the
 * line is sung rather than after it; faster playback narrows the lead.
 */
const LOOK_AHEAD = 0.35

/** The stanza and line being sung at `time`, or null before the first one. */
export function activePosition(
  timing: LyricsTiming,
  time: number,
  rate = 1
): LyricsPosition | null {
  const t = time + LOOK_AHEAD / Math.pow(rate, 0.6)
  if (timing.stanzas.length === 0 || t < timing.stanzas[0]) return null
  let stanza = 0
  for (let i = 0; i < timing.stanzas.length; i++) {
    if (timing.stanzas[i] <= t) stanza = i
  }
  const lines = timing.lines[stanza] ?? []
  let line = 0
  for (let j = 0; j < lines.length; j++) {
    if (lines[j] <= t) line = j
  }
  return { stanza, line }
}

/**
 * The word being sung in the line at `position`: -1 before its first word,
 * else the index of the last word started. Null when the line has no word
 * times, so the reader lights it whole.
 */
export function activeWord(
  timing: LyricsTiming,
  position: LyricsPosition,
  time: number,
  rate = 1
): number | null {
  const starts = timing.words?.[position.stanza]?.[position.line]
  if (!starts) return null
  const t = time + LOOK_AHEAD / Math.pow(rate, 0.6)
  let word = -1
  for (let k = 0; k < starts.length; k++) {
    if (starts[k] <= t) word = k
  }
  return word
}
