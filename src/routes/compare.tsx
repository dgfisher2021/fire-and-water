import { z } from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { SPLIT_PAIR, trackIdSchema } from '@/data/tracks'

// Compare folded into Lyrics; old links open the same pair side by side there.
const searchSchema = z.object({
  left: trackIdSchema.catch(SPLIT_PAIR.left),
  right: trackIdSchema.catch(SPLIT_PAIR.right),
})

export const Route = createFileRoute('/compare')({
  validateSearch: (search) => searchSchema.parse(search),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/lyrics/$track',
      params: { track: search.left },
      search: { with: search.right },
      replace: true,
    })
  },
})
