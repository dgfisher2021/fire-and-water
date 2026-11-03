import { z } from 'zod'
import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { trackIdSchema, type TrackId } from '@/data/tracks'
import { LyricsScreen } from '@/screens/lyrics'

// Ids that left the album; old links land on the song that took their place.
const MOVED: Record<string, TrackId> = { pencil: 'baritone' }

// `with` opens the words side by side with a second song; the pair is in
// the URL so a comparison is shareable. Unknown ids drop back to one column.
const searchSchema = z.object({
  with: trackIdSchema.optional().catch(undefined),
})

export type LyricsSearch = z.infer<typeof searchSchema>

export const Route = createFileRoute('/lyrics/$track')({
  params: {
    parse: (raw) => {
      const parsed = trackIdSchema.safeParse(MOVED[raw.track] ?? raw.track)
      if (!parsed.success) throw notFound()
      return { track: parsed.data }
    },
    stringify: (params) => ({ track: params.track }),
  },
  validateSearch: (search: Partial<LyricsSearch>): LyricsSearch =>
    searchSchema.parse(search),
  beforeLoad: ({ params, location }) => {
    if (!location.pathname.endsWith(`/lyrics/${params.track}`))
      throw redirect({
        to: '/lyrics/$track',
        params: { track: params.track },
        search: true,
        replace: true,
      })
  },
  component: LyricsScreen,
})
