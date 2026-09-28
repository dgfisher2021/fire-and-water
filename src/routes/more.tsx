import { createFileRoute } from '@tanstack/react-router'
import { MoreScreen } from '@/screens/more'

export const Route = createFileRoute('/more')({
  component: MoreScreen,
})
