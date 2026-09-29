import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { SPLIT_PAIR, trackIdSchema } from '@/data/tracks'
import { CompareScreen } from '@/screens/compare'

// The pair lives in the URL so a comparison is shareable; unknown or
// missing ids fall back to the original mirrored pair.
const searchSchema = z.object({
  left: trackIdSchema.catch(SPLIT_PAIR.left),
  right: trackIdSchema.catch(SPLIT_PAIR.right),
})

export type CompareSearch = z.infer<typeof searchSchema>

export const Route = createFileRoute('/compare')({
  validateSearch: (search: Partial<CompareSearch>): CompareSearch =>
    searchSchema.parse(search),
  component: CompareScreen,
})
