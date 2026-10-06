import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { trackIdSchema, type TrackId } from '@/data/tracks'
import { LyricsScreen } from '@/screens/lyrics'

// Ids that left the album; old links land on the song that took their place.
const MOVED: Record<string, TrackId> = { pencil: 'baritone' }

export const Route = createFileRoute('/lyrics/$track')({
  params: {
    parse: (raw) => {
      const parsed = trackIdSchema.safeParse(MOVED[raw.track] ?? raw.track)
      if (!parsed.success) throw notFound()
      return { track: parsed.data }
    },
    stringify: (params) => ({ track: params.track }),
  },
  beforeLoad: ({ params, location }) => {
    if (!location.pathname.endsWith(`/lyrics/${params.track}`))
      throw redirect({
        to: '/lyrics/$track',
        params: { track: params.track },
        replace: true,
      })
  },
  component: LyricsScreen,
})
