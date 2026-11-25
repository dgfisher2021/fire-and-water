import { z } from 'zod'
import { isLyricsLabel, lyricsLineStart, type LyricsTiming } from '@dust-ui/ui'

/** One lyric line: indexes into the sheet's stanzas, labels counted as the timing counts them. */
export type Moment = { stanza: number; line: number }

type Sheet = ReadonlyArray<ReadonlyArray<string>>

/**
 * The `?line=` value: `<stanza>-<line>`, counted from 1. A dash, not a dot:
 * the router reads `3.10` as the number 3.1.
 */
export const momentParam = z.string().regex(/^[1-9]\d{0,2}-[1-9]\d{0,2}$/)

export const formatMoment = ({ stanza, line }: Moment) =>
  `${stanza + 1}-${line + 1}`

/** The line a `?line=` value points at in this sheet; null when it names no sung line. */
export function parseMoment(
  value: string | undefined,
  stanzas: Sheet
): Moment | null {
  const parsed = momentParam.safeParse(value)
  if (!parsed.success) return null
  const [stanza, line] = parsed.data.split('-').map((n) => Number(n) - 1)
  return momentText(stanzas, { stanza, line }) === null
    ? null
    : { stanza, line }
}

/** The words of a line; null for a label or a line the sheet lacks. */
export function momentText(stanzas: Sheet, { stanza, line }: Moment) {
  const text = stanzas[stanza]?.[line]
  return text === undefined || isLyricsLabel(text) ? null : text
}

/** Where the line starts in the song, in seconds; null when the song has no timing for it. */
export function momentTime(
  timing: LyricsTiming | undefined,
  { stanza, line }: Moment
) {
  if (!timing || timing.stanzas[stanza] === undefined) return null
  return lyricsLineStart(timing, stanza, line)
}

/** The link that opens a song at one line. */
export const momentUrl = (track: string, moment: Moment, base: string) =>
  new URL(`lyrics/${track}?line=${formatMoment(moment)}`, base).href
