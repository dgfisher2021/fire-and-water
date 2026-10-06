import { createFileRoute } from '@tanstack/react-router'
import { StoryScreen } from '@/screens/story'

// Reached from More; the More tab stays lit.
export const Route = createFileRoute('/story')({
  component: StoryScreen,
})
