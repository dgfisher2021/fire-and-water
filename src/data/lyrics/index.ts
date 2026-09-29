import { z } from 'zod'

/**
 * Every lyric sheet in this folder, keyed by song id from the file name.
 * A sheet is either the stanzas alone (a sheet Suno exported or one typed
 * in) or `{ source, stanzas }` when the words were transcribed from the
 * recording. Dropping a `<id>.json` here is all it takes to give a song
 * its lyrics; `scripts/lyrics/` writes them from a Suno zip or a transcript.
 */
const stanzasSchema = z.array(z.array(z.string()).min(1))
const sheetSchema = z.union([
  stanzasSchema,
  z.object({
    source: z.enum(['sheet', 'transcribed']),
    stanzas: stanzasSchema,
  }),
])

export type LyricsSource = 'sheet' | 'transcribed'
export type Stanzas = string[][]

const files = import.meta.glob('./*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>

const SHEETS: Record<string, { lyrics: Stanzas; lyricsSource: LyricsSource }> =
  Object.fromEntries(
    Object.entries(files).map(([path, raw]) => {
      const id = path.replace(/^\.\//, '').replace(/\.json$/, '')
      const sheet = sheetSchema.parse(raw)
      return Array.isArray(sheet)
        ? [id, { lyrics: sheet, lyricsSource: 'sheet' as const }]
        : [id, { lyrics: sheet.stanzas, lyricsSource: sheet.source }]
    })
  )

/** The song's stanzas and where they came from; no file means no lyrics yet. */
export function lyricsFor(id: string) {
  return SHEETS[id] ?? { lyrics: [], lyricsSource: 'sheet' as const }
}
