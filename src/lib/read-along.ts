/** Start times in seconds: one per stanza, one per line within each stanza. */
export type LyricsTiming = { stanzas: number[]; lines: number[][] }

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
