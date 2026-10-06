import { z } from 'zod'
import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { ALBUM_SORTS } from '@/lib/sort'
import { AlbumScreen } from '@/screens/album'

// The list order lives in the URL so a sorted view is shareable; unknown
// values fall back to album order, which stays out of the URL.
const searchSchema = z.object({
  sort: z.enum(ALBUM_SORTS).catch('album'),
})

export type AlbumSearch = z.infer<typeof searchSchema>

export const Route = createFileRoute('/')({
  validateSearch: (search: Partial<AlbumSearch>): AlbumSearch =>
    searchSchema.parse(search),
  search: { middlewares: [stripSearchParams({ sort: 'album' })] },
  component: AlbumScreen,
})
