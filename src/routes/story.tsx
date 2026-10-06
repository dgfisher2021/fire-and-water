import { createFileRoute, redirect } from '@tanstack/react-router'

// The story screen folded into the Album's date-written timeline; old
// links land there.
export const Route = createFileRoute('/story')({
  beforeLoad: () => {
    throw redirect({ to: '/', search: { sort: 'written' }, replace: true })
  },
})
