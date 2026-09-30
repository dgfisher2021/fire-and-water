import { createFileRoute, notFound } from '@tanstack/react-router'
import { trackIdSchema } from '@/data/tracks'
import { TimeScreen } from '@/screens/time'

// A tool, not a tab: tap each line as it starts and copy the timing out.
export const Route = createFileRoute('/time/$track')({
  params: {
    parse: (raw) => {
      const parsed = trackIdSchema.safeParse(raw.track)
      if (!parsed.success) throw notFound()
      return { track: parsed.data }
    },
    stringify: (params) => ({ track: params.track }),
  },
  component: TimeScreen,
})
