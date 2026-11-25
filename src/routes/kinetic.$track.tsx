import { z } from 'zod'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { trackIdSchema } from '@/data/tracks'
import { KineticScreen } from '@/screens/kinetic'

// `t` starts the film at a moment; with `hold` it stays on that frame.
const searchSchema = z.object({
  t: z.coerce.number().min(0).optional().catch(undefined),
  hold: z.coerce.boolean().optional().catch(undefined),
  // Dev only: lists the lines that do not fit the stage.
  check: z.coerce.boolean().optional().catch(undefined),
})

export type KineticSearch = z.infer<typeof searchSchema>

export const Route = createFileRoute('/kinetic/$track')({
  params: {
    parse: (raw) => {
      const parsed = trackIdSchema.safeParse(raw.track)
      if (!parsed.success) throw notFound()
      return { track: parsed.data }
    },
    stringify: (params) => ({ track: params.track }),
  },
  validateSearch: (search: Partial<KineticSearch>): KineticSearch =>
    searchSchema.parse(search),
  component: KineticScreen,
})
