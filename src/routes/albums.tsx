import { createFileRoute } from '@tanstack/react-router'
import { AlbumsScreen } from '@/screens/albums'

export const Route = createFileRoute('/albums')({
  component: AlbumsScreen,
})
