import { createFileRoute } from '@tanstack/react-router'
import { CompareScreen } from '@/screens/compare'

export const Route = createFileRoute('/compare')({
  component: CompareScreen,
})
