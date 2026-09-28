import { createFileRoute } from '@tanstack/react-router'
import { AlbumScreen } from '@/screens/album'

export const Route = createFileRoute('/')({
  component: AlbumScreen,
})
