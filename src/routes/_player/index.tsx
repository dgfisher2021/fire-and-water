import { createFileRoute } from '@tanstack/react-router'

// Home is the `_player` layout itself; the index renders nothing extra.
export const Route = createFileRoute('/_player/')({
  component: () => null,
})
