import { createFileRoute, notFound } from '@tanstack/react-router'
import { trackIdSchema } from '@/data/tracks'
import { LyricsScreen } from '@/screens/lyrics'

export const Route = createFileRoute('/lyrics/$track')({
  params: {
    parse: (raw) => {
      const parsed = trackIdSchema.safeParse(raw.track)
      if (!parsed.success) throw notFound()
      return { track: parsed.data }
    },
    stringify: (params) => ({ track: params.track }),
  },
  component: LyricsScreen,
})
